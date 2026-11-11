//! 全局行（`tenant_id IS NULL`）监控。
//!
//! 产品语义：`core_tenants` 是全局租户目录、`core_roles` 含全局角色，租户读路径
//! 可见这些「无租户归属」行——这是有意设计，不是策略遗漏；它们只允许系统通道写入。
//!
//! 本模块定期统计两类全局行数量并暴露增量计数，供告警规则识别异常增长：
//! - `iam_global_rows{entity="core_roles"|"core_tenants"}`：当前行数；
//! - `iam_global_rows_added_total{entity=...}`：相邻两次采样的正向增量之和。

use prometheus::{register_int_counter_vec, register_int_gauge_vec, IntCounterVec, IntGaugeVec};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::OnceLock;
use std::time::Duration;
use topems_shared_db::scope::Db;

/// 采样实体与对应 SQL（只统计全局行）。
const ENTITIES: [(&str, &str); 2] = [
    (
        "core_roles",
        "SELECT COUNT(*) FROM public.core_roles WHERE tenant_id IS NULL",
    ),
    (
        "core_tenants",
        "SELECT COUNT(*) FROM public.core_tenants WHERE tenant_id IS NULL",
    ),
];

static GLOBAL_ROWS: OnceLock<IntGaugeVec> = OnceLock::new();
static GLOBAL_ROWS_ADDED: OnceLock<IntCounterVec> = OnceLock::new();
/// 上一次采样值；-1 表示尚未建立基线（进程启动后首次采样不产生增量）。
static LAST: [AtomicI64; 2] = [AtomicI64::new(-1), AtomicI64::new(-1)];

#[allow(clippy::expect_used)]
fn rows_gauge() -> &'static IntGaugeVec {
    GLOBAL_ROWS.get_or_init(|| {
        register_int_gauge_vec!(
            "iam_global_rows",
            "Rows with tenant_id IS NULL in global IAM tables (core_roles/core_tenants)",
            &["entity"]
        )
        .expect("failed to register iam_global_rows")
    })
}

#[allow(clippy::expect_used)]
fn added_counter() -> &'static IntCounterVec {
    GLOBAL_ROWS_ADDED.get_or_init(|| {
        register_int_counter_vec!(
            "iam_global_rows_added_total",
            "Positive growth of tenant_id IS NULL rows in global IAM tables",
            &["entity"]
        )
        .expect("failed to register iam_global_rows_added_total")
    })
}

/// 启动后台采样任务（60s 一次）。失败只记 WARN，不影响服务。
pub fn spawn_global_row_monitor(db: Db) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(60));
        loop {
            ticker.tick().await;
            collect_once(&db).await;
        }
    });
}

async fn collect_once(db: &Db) {
    for (idx, (entity, sql)) in ENTITIES.iter().enumerate() {
        let mut scope = match db.scope_read_system().await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::warn!("[global-rows] 打开系统读作用域失败: {}", e);
                continue;
            }
        };
        let count = match sqlx::query_scalar::<_, i64>(*sql)
            .fetch_one(&mut scope)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::warn!("[global-rows] 统计 {} 失败: {}", entity, e);
                let _ = scope.rollback().await;
                continue;
            }
        };
        let _ = scope.commit().await;

        rows_gauge().with_label_values(&[entity]).set(count);
        let prev = LAST
            .get(idx)
            .map_or(-1, |cell| cell.swap(count, Ordering::Relaxed));
        if prev >= 0 && count > prev {
            added_counter()
                .with_label_values(&[entity])
                .inc_by((count - prev).cast_unsigned());
            tracing::warn!(
                "[global-rows] {} 全局行异常增长: {} -> {}",
                entity,
                prev,
                count
            );
        }
    }
}
