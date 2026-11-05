//! 连接治理 A 的集成验证：真实 PG + 并发请求 + `pg_stat_activity` 采样。
//!
//! 运行方式（默认跳过，避免 CI 无库失败）：
//!
//! ```bash
//! TOPEMS_IT_DATABASE_URL='postgresql://xingzhai@127.0.0.1:15432/topems_test' \
//!   cargo test -p topems-shared-db --test connection_budget_it -- --nocapture
//! ```
//!
//! 覆盖：
//! 1. 3 个池、单池申请 100（远大于预算）→ 预算 6 仍把总额卡在 6；
//! 2. 60 个并发查询下的实际连接峰值 ≤ 预算；
//! 3. 建池失败（提前返回）两轮后，预算占用不递减/不增长（RAII 归还）。
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::as_conversions
)]

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;

use topems_shared_core::config::enhanced::DatabaseConfig;
use topems_shared_db::database::{budget, create_database_pool};

const BUDGET: u32 = 6;
const POOLS: u32 = 3;
const CONCURRENCY: usize = 60;
const APP: &str = "topems-budget-it";

fn it_url() -> Option<String> {
    std::env::var("TOPEMS_IT_DATABASE_URL")
        .ok()
        .filter(|u| !u.trim().is_empty())
}

fn db_config(url: &str, max: u32) -> DatabaseConfig {
    DatabaseConfig {
        url: url.to_string(),
        max_connections: max,
        min_connections: Some(0),
        connect_timeout: Some(10),
        idle_timeout: Some(60),
        max_lifetime: Some(300),
        test_interval: None,
        enable_connection_reuse: None,
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 8)]
async fn budget_caps_concurrent_connections() {
    let Some(url) = it_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };

    // 预算在进程首次建池时读取，必须在任何 create_database_pool 之前设置。
    std::env::set_var("DB_TOTAL_CONNECTION_BUDGET", BUDGET.to_string());
    std::env::set_var("DB_EXPECTED_POOLS", POOLS.to_string());
    std::env::set_var("DB_APPLICATION_NAME", APP);
    std::env::set_var("SEARCH_PATH", "public");

    // 负向：单池申请 100（模拟把 DB_MODULE_MAX_CONNECTIONS 调得很大），总额仍应被预算卡住。
    let mut pools = Vec::new();
    for i in 0..POOLS {
        let pool = create_database_pool(&db_config(&url, 100))
            .await
            .unwrap_or_else(|e| panic!("第 {i} 个池创建失败: {e}"));
        pools.push(pool);
    }

    let snap = budget::snapshot();
    println!(
        "[budget] total={} allocated={} pools={} peak={}",
        snap.total, snap.allocated, snap.pools, snap.peak_allocated
    );
    assert!(snap.allocated <= BUDGET, "Σ max_connections 超预算: {snap:?}");
    assert_eq!(snap.pools, POOLS);

    // 独立监控连接（不计入预算）：只负责采样，不参与业务负载。
    let monitor = sqlx::PgPool::connect(&url).await.expect("监控连接失败");

    let peak = Arc::new(AtomicU32::new(0));
    let stop = Arc::new(AtomicBool::new(false));
    let sampler = {
        let monitor = monitor.clone();
        let peak = peak.clone();
        let stop = stop.clone();
        tokio::spawn(async move {
            while !stop.load(Ordering::Relaxed) {
                let count: i64 = sqlx::query_scalar(
                    "SELECT count(*) FROM pg_stat_activity \
                     WHERE datname = current_database() AND application_name = $1",
                )
                .bind(APP)
                .fetch_one(&monitor)
                .await
                .unwrap_or(0);
                let count = u32::try_from(count).unwrap_or(u32::MAX);
                peak.fetch_max(count, Ordering::Relaxed);
                tokio::time::sleep(Duration::from_millis(20)).await;
            }
        })
    };

    // 并发 60 个查询，每个占住一条连接 150ms，期望实际并发被池上限（合计 6）卡住。
    let mut tasks = tokio::task::JoinSet::new();
    for i in 0..CONCURRENCY {
        let pool = pools[i % pools.len()].clone();
        tasks.spawn(async move {
            sqlx::query("SELECT pg_sleep(0.15)")
                .execute(&pool)
                .await
                .map(|_| ())
                .map_err(|e| e.to_string())
        });
    }
    let mut ok = 0usize;
    let mut err = 0usize;
    while let Some(res) = tasks.join_next().await {
        match res {
            Ok(Ok(())) => ok += 1,
            _ => err += 1,
        }
    }
    stop.store(true, Ordering::Relaxed);
    let _ = sampler.await;

    let peak = peak.load(Ordering::Relaxed);
    println!("[load] ok={ok} err={err} observed_peak_connections={peak} budget={BUDGET}");
    assert_eq!(err, 0, "并发查询出现连接获取失败：{err}");
    assert!(
        peak <= BUDGET,
        "实测连接峰值 {peak} 超过预算 {BUDGET}"
    );
    assert!(peak >= 1, "未采样到任何连接，采样器可能未生效");

    // 提前返回 / 建池失败路径：无效 DSN 连续两次，额度必须归还，计数不递减也不增长。
    for round in 0..2 {
        let bad = db_config("postgresql://nobody@127.0.0.1:1/topems_test", 100);
        let res = create_database_pool(&bad).await;
        assert!(res.is_err(), "无效 DSN 不应建池成功（round {round}）");
        let after = budget::snapshot();
        println!("[early-return round {round}] allocated={}", after.allocated);
        assert_eq!(
            after.allocated, snap.allocated,
            "失败建池后额度未归还（round {round}）"
        );
        assert_eq!(after.pools, snap.pools);
    }

    let final_snap = budget::snapshot();
    println!("[budget-final] {:?}", final_snap);
    assert!(final_snap.allocated <= BUDGET);
}
