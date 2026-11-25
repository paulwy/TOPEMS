pub mod budget;
pub mod read_write;

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::str::FromStr;
use std::time::Duration;
use topems_shared_core::config::enhanced::DatabaseConfig;
use topems_shared_core::error::Result;
use topems_shared_core::error::TopemsError;
use tracing::{debug, error, info};

// 导出读写分离模块
pub use read_write::{ReadWriteConfig, ReadWritePool};

/// 未显式指定 schema 作用域时的中性基线。
///
/// 模块的真实作用域必须经 [`create_database_pool_with_search_path`] 或
/// [`crate::scope::Db::new`] 显式传入，不再读取进程级 `SEARCH_PATH`。
pub const DEFAULT_SEARCH_PATH: &str = "public";

pub async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool> {
    create_database_pool_with_search_path(config, DEFAULT_SEARCH_PATH).await
}

/// 与 [`create_database_pool`] 相同，但显式指定**会话基线** `search_path`。
///
/// 仅供连接治理 B 的「进程共享运行时池」使用：共享池的基线固定为 `public`（中性值），
/// 各模块的真实作用域由 [`crate::scope::Db`] 在事务内 `SET LOCAL` 提供，不再依赖建池时的
/// 全局 `SEARCH_PATH`。
pub async fn create_database_pool_with_search_path(
    config: &DatabaseConfig,
    search_path: &str,
) -> Result<PgPool> {
    // 连接治理 A：建池前先向进程级预算申请额度（Total ≤ DB_TOTAL_CONNECTION_BUDGET）。
    // 预算只压「总额天花板」，单池申请值仍作为上限参与 min 计算。
    let reservation = budget::reserve_pool("business", config.max_connections)?;
    create_database_pool_from_reservation(config, search_path, reservation).await
}

/// 创建「进程共享运行时池」（连接治理 B）。
///
/// 与普通模块池的唯一区别是预算权重：该池合并了 `weight` 个已迁移模块，
/// 公平分摊时按 `weight` 个预算单位参与，避免共享池被压到单模块额度。
pub async fn create_shared_database_pool(
    config: &DatabaseConfig,
    search_path: &str,
    weight: u32,
) -> Result<PgPool> {
    let weight = weight.max(1);
    // 共享池承载 weight 个模块，申请上限按模块上限 × weight（仍被公平份额与余额夹住）。
    let requested = config.max_connections.saturating_mul(weight);
    let reservation = budget::reserve_pool_weighted("shared-runtime", requested, weight)?;
    create_database_pool_from_reservation(config, search_path, reservation).await
}

async fn create_database_pool_from_reservation(
    config: &DatabaseConfig,
    search_path: &str,
    reservation: budget::PoolReservation,
) -> Result<PgPool> {
    let search_path = search_path.to_string();
    debug!("create_database_pool: search_path = {}", search_path);

    let max_connections = reservation.granted();
    let min_connections = config.min_connections.unwrap_or(5).min(max_connections);
    let connect_timeout = config.connect_timeout.unwrap_or(30);
    let idle_timeout = config.idle_timeout.unwrap_or(120);
    // max_lifetime 兜底默认 10 分钟（原 30 分钟）。注意：走 quick_bootstrap_with_db 的服务显式传入
    // 1800，此兜底不生效——真正消除 DDL 后陈旧 prepared statement 的是下方 statement_cache_capacity(0)，
    // 本项仅作次要兜底（加速连接轮换，缩短任何残余会话状态的最长存活时间）。
    let max_lifetime = config.max_lifetime.unwrap_or(600);

    // 连接级 application_name：默认空值会让 pg_stat_activity 无法按模块归因，
    // 由 bootstrap_service 逐模块设置 DB_APPLICATION_NAME（如 finance-module）。
    let application_name = std::env::var("DB_APPLICATION_NAME")
        .or_else(|_| std::env::var("TOPEMS_SERVICE_NAME"))
        .unwrap_or_else(|_| "topems-service".to_string());
    let connect_options = PgConnectOptions::from_str(&config.url)
        .map_err(|e| TopemsError::Database(format!("数据库 DSN 解析失败: {e}")))?
        .application_name(&application_name)
        // prepared statement 缓存容量（H1 与 26000 的平衡点）。
        // 过去设为 0 以规避 H1：DDL（如 ALTER COLUMN TYPE）后旧连接缓存的语句引用旧元数据，
        // 执行时报类型不匹配。但容量 0 意味着所有语句共用会话内唯一的 unnamed 语句槽，
        // 而 sqlx 在遇到未知的自定义类型（枚举参数/枚举列）时会额外发一条 pg_type 自省查询
        // （简单协议同样占用 unnamed 槽），把刚 Parse 好、尚未 Execute 的语句顶掉，触发
        // SQLSTATE 26000「unnamed prepared statement does not exist」——且只在该连接首次
        // 执行这类查询时发生（之后类型信息被连接级缓存记住），表现为「重启/新连接后首个请求 500」。
        // 改为小容量命名缓存后：语句走命名槽，自省不再覆盖业务语句，26000 消失。
        // H1 残余风险与对策：仅影响「缓存该语句的连接 + 语句涉及的对象在运行期被 DDL」这一窗口，
        // 以 (a) 运行期 DDL 收敛计划（docs/database/runtime-ddl-plan.md）、(b) 部署即重启连接池、
        // (c) max_lifetime 600s 轮换 作为兜底。
        .statement_cache_capacity(8);

    let options = PgPoolOptions::new()
        .max_connections(max_connections)
        .min_connections(min_connections)
        .acquire_timeout(Duration::from_secs(connect_timeout))
        .idle_timeout(Duration::from_secs(idle_timeout))
        .max_lifetime(Duration::from_secs(max_lifetime))
        // 借连接前做 SELECT 1 存活探测，剔除已断连/坏连接（H3）。
        // 代价：每次借连接多一次极轻量查询（~0.3ms），换取坏连接零命中。
        .test_before_acquire(true);

    // 单租户部署（MULTI_TENANT_ENABLED != true）且配置 DEFAULT_TENANT_ID 时，
    // 连接建立即固定租户上下文：FORCE RLS 下 service 层业务查询（不经 tenant_middleware txn）
    // 仍能按默认租户读到数据；多租户部署保持逐请求隔离，请求级 txn（set_config(..., true)）可覆盖。
    let default_tenant = std::env::var("DEFAULT_TENANT_ID")
        .ok()
        .filter(|_| {
            !std::env::var("MULTI_TENANT_ENABLED")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false)
        })
        .and_then(|t| t.parse::<uuid::Uuid>().ok())
        .map(|u| u.to_string());

    let options = options.after_connect(move |conn, _meta| {
        let search_path = search_path.clone();
        let default_tenant = default_tenant.clone();
        Box::pin(async move {
            debug!("after_connect: setting search_path to {}", search_path);
            let result = sqlx::query("SELECT set_config('search_path', $1, false)")
                .bind(&search_path)
                .execute(&mut *conn)
                .await;
            result.map_err(|e| {
                error!("Failed to set search path: {}", e);
                e
            })?;
            if let Ok(sp) = sqlx::query_scalar::<_, String>("SHOW search_path")
                .fetch_one(&mut *conn)
                .await
            {
                debug!("after_connect: verified search_path = {}", sp);
            }
            if let Some(t) = default_tenant {
                debug!("after_connect: setting default tenant context to {}", t);
                if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                    .bind(&t)
                    .execute(&mut *conn)
                    .await
                {
                    error!("Failed to set default tenant context: {}", e);
                }
            } else {
                debug!("after_connect: no default tenant context (DEFAULT_TENANT_ID missing or multi-tenant)");
            }
            Ok(())
        })
    });

    // AR-07: 启动期 DB 连接「有限重试 + 指数退避」。
    // 场景：编排（docker-compose / k8s）同时拉起应用与 Postgres，应用先到会一次性失败 crash；
    // 重试 3 次（500ms → 1s → 2s，累计约 3.5s）覆盖 Postgres 就绪窗口；三次仍失败则照旧
    // fail-fast 向上返回错误（语义与改动前一致，只是日志多了重试信息）。
    const DB_CONNECT_MAX_ATTEMPTS: u32 = 3;
    const DB_CONNECT_BACKOFF_MS: [u64; 3] = [500, 1_000, 2_000];

    let mut last_err: Option<sqlx::Error> = None;
    let pool = {
        let mut ready: Option<PgPool> = None;
        for attempt in 1..=DB_CONNECT_MAX_ATTEMPTS {
            match options.clone().connect_with(connect_options.clone()).await {
                Ok(p) => {
                    if attempt > 1 {
                        info!(
                            "数据库连接池在第 {}/{} 次尝试后创建成功",
                            attempt, DB_CONNECT_MAX_ATTEMPTS
                        );
                    }
                    ready = Some(p);
                    break;
                }
                Err(e) => {
                    let backoff_idx = usize::try_from(attempt)
                        .unwrap_or(usize::MAX)
                        .saturating_sub(1)
                        .min(DB_CONNECT_BACKOFF_MS.len() - 1);
                    let backoff_ms = DB_CONNECT_BACKOFF_MS
                        .get(backoff_idx)
                        .copied()
                        .unwrap_or_else(|| *DB_CONNECT_BACKOFF_MS.last().unwrap_or(&0));
                    if attempt < DB_CONNECT_MAX_ATTEMPTS {
                        tracing::warn!(
                            "数据库连接池第 {}/{} 次尝试失败: {e} — {}ms 后重试",
                            attempt,
                            DB_CONNECT_MAX_ATTEMPTS,
                            backoff_ms
                        );
                        tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                    } else {
                        tracing::error!(
                            "数据库连接池第 {}/{} 次尝试仍失败（已用尽 {} 次尝试，fail-fast）: {e}",
                            attempt,
                            DB_CONNECT_MAX_ATTEMPTS,
                            DB_CONNECT_MAX_ATTEMPTS
                        );
                    }
                    last_err = Some(e);
                }
            }
        }
        match ready {
            Some(p) => p,
            None => {
                let last = match last_err {
                    Some(e) => e,
                    None => {
                        return Err(TopemsError::Database(format!(
                            "Failed to create database pool after {DB_CONNECT_MAX_ATTEMPTS} attempts (no underlying error recorded)"
                        ))
                        .into());
                    }
                };
                return Err(TopemsError::Database(format!(
                    "Failed to create database pool after {DB_CONNECT_MAX_ATTEMPTS} attempts: {last}"
                ))
                .into());
            }
        }
    };

    // 池创建成功：额度永久归该池（失败/panic 路径由 PoolReservation::Drop 自动归还）。
    reservation.commit();

    info!(
        "✅ 数据库连接池创建成功 (max: {}, min: {}, timeout: {}s, lifetime: {}s)",
        max_connections, min_connections, connect_timeout, max_lifetime
    );
    Ok(pool)
}

pub async fn test_database_connection(pool: &PgPool) -> Result<()> {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .map_err(|e| TopemsError::Database(format!("Database connection test failed: {}", e)))?;

    info!("✅ 数据库连接测试通过");
    Ok(())
}

/// 启动期连通性探测：执行一次 `SELECT 1`，连接随查询结束立即归还。
///
/// 用于各模块 `build()`，替代历史上的 `let _conn = pool.acquire().await?;`——后者把
/// 连接绑定到变量并持有到 `build()` 结束（跨 schema 迁移等多个 await），白占预算额度；
/// 且它注释所称"固化 search_path"并不成立：`SEARCH_PATH` 在建池时已捕获进
/// `after_connect`，池内每条连接都会自动设置。
///
/// 失败返回 `Err` 由调用方 `?` 传播，保持「依赖不可用 → 模块启动失败」的语义，
/// 不静默降级为"服务起来了但数据库不可用"。
pub async fn probe_connection(pool: &PgPool) -> Result<()> {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .map_err(|e| TopemsError::Database(format!("Database connectivity probe failed: {}", e)))?;
    Ok(())
}

#[derive(Debug, Clone)]
pub struct HealthCheckResult {
    pub healthy: bool,
    pub latency: Option<Duration>,
    pub error: Option<String>,
}

pub async fn check_pool_health(pool: &PgPool) -> HealthCheckResult {
    let start = std::time::Instant::now();

    let result = match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => HealthCheckResult {
            healthy: true,
            latency: Some(start.elapsed()),
            error: None,
        },
        Err(e) => HealthCheckResult {
            healthy: false,
            latency: None,
            error: Some(e.to_string()),
        },
    };

    result
}

/// P2-M1: 确保消费端 master_data_refs 表存在（统一 schema，消除 4 服务重复 SQL）
///
/// 各业务服务（scm/erp/pdm/crm）在 init_db 中调用此函数，表名按服务前缀生成：
///   `{schema}.{service_prefix}_master_data_refs`
///
/// `schema` 必填且由调用方显式给出：不依赖连接 `search_path` 解析。
/// 历史上这里写裸表名，生产已因此产生 `public.pm_master_data_refs` 与
/// `flow/master_data/public` 三份 `core_master_data_refs` 等重复表。
///
/// Schema 与 V32.0 AC-5 本地主数据引用契约一致。
pub async fn ensure_master_data_refs_table(
    pool: &PgPool,
    schema: &str,
    service_prefix: &str,
) -> Result<()> {
    let table_name = format!("{}_master_data_refs", service_prefix);
    let qualified = format!("{schema}.{table_name}");
    let sql = format!(
        r#"
        CREATE TABLE IF NOT EXISTS {qualified} (
            master_data_id    VARCHAR(128) PRIMARY KEY,
            tenant_id         UUID NOT NULL,
            domain            VARCHAR(32) NOT NULL,
            code              VARCHAR(128) NOT NULL,
            name              VARCHAR(256),
            status            VARCHAR(32) DEFAULT 'active',
            source_service    VARCHAR(64) NOT NULL,
            local_entity_type VARCHAR(64),
            local_entity_id   UUID,
            payload_snapshot  JSONB,
            last_synced_at    TIMESTAMPTZ DEFAULT NOW(),
            created_at        TIMESTAMPTZ DEFAULT NOW(),
            updated_at        TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    );
    sqlx::query(sqlx::AssertSqlSafe(sql))
        .execute(pool)
        .await
        .map_err(|e| TopemsError::Database(format!("Failed to create {qualified}: {e}")))?;
    info!(
        "[{}] {} 表已就绪（AC-5 本地主数据引用）",
        service_prefix, qualified
    );
    Ok(())
}

/// 进程级迁移池缓存：同一进程内所有模块共享一个 owner 池。
///
/// 连接治理 A 的配套收敛：此前每个 real_module 都建一个 migrate 池（max=3，无 idle
/// 超时），27 个模块最多可额外占用 81 条连接。迁移/DDL 只在启动期串行使用，进程内
/// 共享一个池即可，同时把「池数量」从 54 降到 28，便于预算公平分摊。
///
/// 缓存包含失败结果：MIGRATE_URL 配错时只尝试一次并记录错误，避免每个模块重复等待
/// 连接超时；调用方语义不变（`Err` → 各自 warn 后回退运行时池）。
static MIGRATE_POOL: tokio::sync::OnceCell<std::result::Result<Option<PgPool>, String>> =
    tokio::sync::OnceCell::const_new();

/// 创建迁移专用连接池（DDL 走 owner，运行时查询走受限用户）。
/// 读取 `MIGRATE_URL` 环境变量（owner 连接串），未设置则返回 None（回退运行时池）。
/// 仅用于服务启动时的建表/补列/迁移等 DDL，不得用于运行时业务查询。
///
/// 进程内单例：重复调用返回同一个池的 clone（见 [`MIGRATE_POOL`]）。
/// 该池为进程共享，使用中性 search_path 基线；DDL 必须显式 schema 限定。
pub async fn create_migrate_pool() -> Result<Option<PgPool>> {
    create_migrate_pool_with_search_path(DEFAULT_SEARCH_PATH).await
}

/// 同 [`create_migrate_pool`]，但允许调用方显式传入迁移池的会话基线 `search_path`。
///
/// 仅适用于独立部署（进程内只有一个业务服务）；嵌入模式下多个模块共享同一单例，
/// 应使用中性基线并依赖 DDL 的显式 schema 限定，避免首个模块的作用域污染其他模块。
pub async fn create_migrate_pool_with_search_path(search_path: &str) -> Result<Option<PgPool>> {
    let Ok(url) = std::env::var("MIGRATE_URL") else {
        return Ok(None);
    };
    if url.trim().is_empty() {
        return Ok(None);
    }
    let search_path = search_path.to_string();
    let cached = MIGRATE_POOL
        .get_or_init(|| {
            let url = url.clone();
            async move {
                build_migrate_pool(&url, &search_path)
                    .await
                    .map_err(|e| e.to_string())
            }
        })
        .await;
    match cached {
        Ok(pool) => Ok(pool.clone()),
        Err(msg) => Err(TopemsError::Database(msg.clone())),
    }
}

/// 实际构建迁移池（仅执行一次，额度同样受进程级预算约束）。
async fn build_migrate_pool(url: &str, search_path: &str) -> Result<Option<PgPool>> {
    // 与业务池一致：迁移池也计入总预算（总额天花板对「所有池」生效）。
    let reservation = budget::reserve_pool("migrate", 3)?;
    let max_connections = reservation.granted();
    // 作用域由调用方显式传入（独立部署为本服务 schema，嵌入模式为中性基线），
    // 不再读取进程级 SEARCH_PATH；DDL 仍应优先显式 schema 限定（如 `"erp"."table"`）。
    let search_path = search_path.to_string();
    let options = PgPoolOptions::new()
        .max_connections(max_connections)
        .min_connections(0)
        .acquire_timeout(Duration::from_secs(15))
        .after_connect(move |conn, _meta| {
            let search_path = search_path.clone();
            Box::pin(async move {
                sqlx::query("SELECT set_config('search_path', $1, false)")
                    .bind(&search_path)
                    .execute(&mut *conn)
                    .await
                    .map_err(|e| {
                        error!("Failed to set migrate pool search path: {}", e);
                        e
                    })?;
                Ok(())
            })
        });
    let pool = options
        .connect(url)
        .await
        .map_err(|e| TopemsError::Database(format!("MIGRATE_URL 连接失败: {e}")))?;
    reservation.commit();
    info!(
        "✅ MIGRATE_URL 迁移连接池已创建（进程内共享，DDL 走 owner，max={}）",
        max_connections
    );
    Ok(Some(pool))
}
