pub mod read_write;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;
use topems_shared_core::config::enhanced::DatabaseConfig;
use topems_shared_core::error::Result;
use topems_shared_core::error::TopemsError;
use tracing::{debug, error, info};

// 导出读写分离模块
pub use read_write::{ReadWriteConfig, ReadWritePool};

pub async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool> {
    let search_path =
        std::env::var("SEARCH_PATH").unwrap_or_else(|_| "rs, erp, public".to_string());
    debug!("create_database_pool: search_path = {}", search_path);

    let min_connections = config.min_connections.unwrap_or(5);
    let connect_timeout = config.connect_timeout.unwrap_or(30);
    let idle_timeout = config.idle_timeout.unwrap_or(300);
    let max_lifetime = config.max_lifetime.unwrap_or(1800);

    let options = PgPoolOptions::new()
        .max_connections(config.max_connections)
        .min_connections(min_connections)
        .acquire_timeout(Duration::from_secs(connect_timeout))
        .idle_timeout(Duration::from_secs(idle_timeout))
        .max_lifetime(Duration::from_secs(max_lifetime));

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

    let pool = options
        .connect(&config.url)
        .await
        .map_err(|e| TopemsError::Database(format!("Failed to create database pool: {}", e)))?;

    info!(
        "✅ 数据库连接池创建成功 (max: {}, min: {}, timeout: {}s, lifetime: {}s)",
        config.max_connections, min_connections, connect_timeout, max_lifetime
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
///   `{service_prefix}_master_data_refs`
///
/// Schema 与 V32.0 AC-5 本地主数据引用契约一致。
pub async fn ensure_master_data_refs_table(pool: &PgPool, service_prefix: &str) -> Result<()> {
    let table_name = format!("{}_master_data_refs", service_prefix);
    let sql = format!(
        r#"
        CREATE TABLE IF NOT EXISTS {table_name} (
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
    sqlx::query(&sql)
        .execute(pool)
        .await
        .map_err(|e| TopemsError::Database(format!("Failed to create {table_name}: {e}")))?;
    info!(
        "[{}] {} 表已就绪（AC-5 本地主数据引用）",
        service_prefix, table_name
    );
    Ok(())
}

/// 创建迁移专用连接池（DDL 走 owner，运行时查询走受限用户）。
/// 读取 `MIGRATE_URL` 环境变量（owner 连接串），未设置则返回 None（回退运行时池）。
/// 仅用于服务启动时的建表/补列/迁移等 DDL，不得用于运行时业务查询。
pub async fn create_migrate_pool() -> Result<Option<PgPool>> {
    let Ok(url) = std::env::var("MIGRATE_URL") else {
        return Ok(None);
    };
    if url.trim().is_empty() {
        return Ok(None);
    }
    // 与业务池保持一致：按 SEARCH_PATH 解析未限定表名，避免 DDL 落到 public schema
    // 遗留同名表（如 public.core_tickets，owner 为受限用户）导致 "must be owner" 42501。
    let search_path =
        std::env::var("SEARCH_PATH").unwrap_or_else(|_| "rs, erp, public".to_string());
    let options = PgPoolOptions::new()
        .max_connections(3)
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
        .connect(&url)
        .await
        .map_err(|e| TopemsError::Database(format!("MIGRATE_URL 连接失败: {e}")))?;
    info!("✅ MIGRATE_URL 迁移连接池已创建（DDL 走 owner，max=3）");
    Ok(Some(pool))
}
