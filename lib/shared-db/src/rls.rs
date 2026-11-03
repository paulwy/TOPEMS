use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use tracing::{debug, error};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RlsConfig {
    pub enabled: bool,
    pub default_tenant_id: Option<String>,
    pub schema_name: String,
}

impl Default for RlsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_tenant_id: None,
            schema_name: "public".to_string(),
        }
    }
}

#[derive(Debug)]
pub struct RlsMiddleware {
    pool: PgPool,
    #[allow(dead_code)]
    config: RlsConfig,
}

impl RlsMiddleware {
    pub async fn new(database_url: &str, config: RlsConfig) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;

        if config.enabled {
            Self::enable_rls_on_tables(&pool, &config.schema_name).await?;
        }

        Ok(Self { pool, config })
    }

    async fn enable_rls_on_tables(pool: &PgPool, schema: &str) -> Result<(), sqlx::Error> {
        // 仅选择含 tenant_id 列的表，避免对无租户列的表创建策略时报错
        let tables = sqlx::query(
            r#"
            SELECT t.table_name
            FROM information_schema.tables t
            JOIN information_schema.columns c
              ON c.table_schema = t.table_schema AND c.table_name = t.table_name
            WHERE t.table_schema = $1
              AND t.table_type = 'BASE TABLE'
              AND t.table_name NOT LIKE 'pg_%'
              AND t.table_name NOT LIKE 'sqlx_%'
              AND c.column_name = 'tenant_id'
            GROUP BY t.table_name
            "#,
        )
        .bind(schema)
        .fetch_all(pool)
        .await?;

        for table in tables {
            let table_name: String = table.try_get("table_name")?;
            let enable_rls = format!(
                "ALTER TABLE IF EXISTS {}.{} ENABLE ROW LEVEL SECURITY",
                schema, table_name
            );
            sqlx::query(sqlx::AssertSqlSafe(enable_rls)).execute(pool).await?;

            let policy_name = format!("tenant_isolation_{}", table_name);
            // PostgreSQL 18 不支持 CREATE POLICY IF NOT EXISTS（语法错误），
            // 需先判断策略是否存在：存在则 ALTER POLICY 更新，否则 CREATE POLICY。
            let policy_exists: bool = sqlx::query_scalar(
                "SELECT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = $1 AND tablename = $2 AND policyname = $3
                )",
            )
            .bind(schema)
            .bind(&table_name)
            .bind(&policy_name)
            .fetch_one(pool)
            .await?;

            // 空安全：current_setting('app.tenant_id') 未设置时返回空串，''::UUID 会报错；
            // 使用 NULLIF(...,'')::UUID 使未设置租户时仅放行 tenant_id IS NULL 的行。
            // nil 上下文（超管/服务令牌由 tenant_middleware 固定为 nil UUID）全量放行，
            // 与 tenant.rs 注释「超管/服务调用在受限 DB 用户下仍可全量访问」保持一致。
            let nil_uuid = "00000000-0000-0000-0000-000000000000";
            let policy_sql = if policy_exists {
                format!(
                    "ALTER POLICY {} ON {}.{} USING (
                        tenant_id = NULLIF(current_setting('app.tenant_id'), '')::UUID
                        OR tenant_id IS NULL
                        OR NULLIF(current_setting('app.tenant_id'), '') = '{nil}'
                    )",
                    policy_name,
                    schema,
                    table_name,
                    nil = nil_uuid
                )
            } else {
                format!(
                    "CREATE POLICY {} ON {}.{} FOR ALL USING (
                        tenant_id = NULLIF(current_setting('app.tenant_id'), '')::UUID
                        OR tenant_id IS NULL
                        OR NULLIF(current_setting('app.tenant_id'), '') = '{nil}'
                    )",
                    policy_name,
                    schema,
                    table_name,
                    nil = nil_uuid
                )
            };
            sqlx::query(sqlx::AssertSqlSafe(policy_sql)).execute(pool).await?;

            debug!("Enabled RLS for table: {}", table_name);
        }

        Ok(())
    }

    /// ⚠️ 已废弃（B6 同源修复后不再推荐）：在 `&PgPool` 上设置会话级 GUC 存在随机借连接 +
    /// 归还残留污染问题（CORE-06 同类）。当前仓库无调用方；需要请求级租户上下文请使用
    /// [`rls_middleware`]（独占连接 + 归还前 RESET）。
    pub async fn set_tenant_context(&self, tenant_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
            .bind(tenant_id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// ⚠️ 已废弃（B6 同源修复后不再推荐）：与 [`Self::set_tenant_context`] 成对，直接在 `&PgPool`
    /// 上随机借一条池连接 RESET——只清这一条随机连接，无法保证其它归还连接干净（CORE-06 同类）。
    /// 当前仓库无调用方；需要请求级租户上下文请使用 [`rls_middleware`]（独占连接 + 归还前 RESET）。
    pub async fn clear_tenant_context(&self) -> Result<(), sqlx::Error> {
        sqlx::query("RESET app.tenant_id")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Option<Uuid>,
    pub role: Option<String>,
}

impl TenantContext {
    pub fn from_request<B>(req: &Request<B>) -> Result<Self, TenantContextRejection> {
        let tenant_id_str = req
            .headers()
            .get("x-tenant-id")
            .and_then(|h| h.to_str().ok());

        let tenant_id = match tenant_id_str {
            Some(id) => Uuid::parse_str(id).map_err(|_| TenantContextRejection::InvalidTenantId)?,
            None => {
                return Err(TenantContextRejection::MissingTenantId);
            }
        };

        let user_id_str = req.headers().get("x-user-id").and_then(|h| h.to_str().ok());
        let user_id = user_id_str.and_then(|id| Uuid::parse_str(id).ok());

        let role = req
            .headers()
            .get("x-role")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        Ok(Self {
            tenant_id,
            user_id,
            role,
        })
    }
}

#[derive(Debug)]
pub enum TenantContextRejection {
    MissingTenantId,
    InvalidTenantId,
}

impl IntoResponse for TenantContextRejection {
    fn into_response(self) -> axum::response::Response {
        let (status, message, error_code) = match self {
            TenantContextRejection::MissingTenantId => (
                StatusCode::BAD_REQUEST,
                "Missing x-tenant-id header",
                "MISSING_TENANT_ID",
            ),
            TenantContextRejection::InvalidTenantId => (
                StatusCode::BAD_REQUEST,
                "Invalid x-tenant-id format",
                "INVALID_TENANT_ID",
            ),
        };

        let payload = topems_shared_core::ErrorPayload::new(status.as_u16(), message)
            .with_error_code(error_code);
        (status, Json(payload)).into_response()
    }
}

/// 在请求进入前预设置租户 GUC 的辅助函数（历史遗留，当前仓库无调用方）。
///
/// ⚠️ 已废弃（B6 同源修复后不再推荐）：本函数直接在 `&PgPool` 上设置会话级 GUC——
/// (a) 不保证业务查询借到同一连接；(b) 归还后 GUC 残留污染连接池；(c) 无对称 RESET 时机。
/// 需要请求级租户上下文请使用 [`rls_middleware`]（独占连接 + 归还前 RESET）。
pub async fn apply_rls_middleware<B>(
    req: Request<B>,
    pool: &PgPool,
) -> Result<Request<B>, axum::response::Response> {
    let headers = req.headers();
    let tenant_id_str = headers.get("x-tenant-id").and_then(|h| h.to_str().ok());

    if let Some(tenant_id_str) = tenant_id_str {
        if let Ok(tenant_id) = Uuid::parse_str(tenant_id_str) {
            match sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                .bind(tenant_id.to_string())
                .execute(pool)
                .await
            {
                Ok(_) => {
                    debug!("Applied RLS context for tenant: {}", tenant_id);
                }
                Err(e) => {
                    error!("Failed to set RLS context: {}", e);
                }
            }
        }
    }

    Ok(req)
}

pub async fn rls_middleware(
    State(pool): State<PgPool>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let tenant_id_str = req
        .headers()
        .get("x-tenant-id")
        .and_then(|h| h.to_str().ok());

    if let Some(tenant_id_str) = tenant_id_str {
        if let Ok(tenant_id) = Uuid::parse_str(tenant_id_str) {
            // B6（CORE-06 同源修复，对齐 unified-core tenant_rls）：旧实现直接在 &PgPool 上
            // set_config 会话级 GUC——(a) sqlx 随机借取一条池连接，业务 handler 后续查询可能
            // 借到另一条连接，GUC 不生效；(b) 会话级 GUC 在该连接归还后残留，污染后续请求。
            // 修复：acquire 独占本请求连接，在其上 set；请求结束后在【同一连接】显式 RESET
            // 再归还连接池 → 归还连接不残留会话租户状态。
            match pool.acquire().await {
                Ok(mut conn) => {
                    match sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                        .bind(tenant_id.to_string())
                        .execute(&mut *conn)
                        .await
                    {
                        Ok(_) => {
                            let resp = next.run(req).await;

                            // 归还前显式清空：保证连接归还连接池时 app.tenant_id 干净，不残留上一位租户
                            if let Err(e) =
                                sqlx::query("RESET app.tenant_id").execute(&mut *conn).await
                            {
                                error!("Failed to reset RLS context on connection return: {}", e);
                            }
                            drop(conn); // 归还连接池（此时已清空会话租户状态）

                            return resp;
                        }
                        Err(e) => {
                            error!("Failed to set RLS context: {}", e);
                            drop(conn);
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to acquire DB connection for RLS: {}", e);
                }
            }
        }
    }

    // 兜底分支（无租户头 / 非法 UUID / acquire 失败 / set 失败）：不触碰连接池。
    // 带租户请求已在其独占连接上 set→run→RESET→归还，归还连接均为干净状态；
    // 此处再对 &PgPool 随机借连接 RESET 只清一条随机连接、既无效又重新引入池化借连接反模式，
    // 与 unified-core tenant_rls 无租户分支语义对齐（不随机借连接"清场"）。
    next.run(req).await
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    #[test]
    fn rls_config_default() {
        let c = RlsConfig::default();
        assert!(c.enabled);
        assert!(c.default_tenant_id.is_none());
        assert_eq!(c.schema_name, "public");
    }

    #[test]
    fn rls_config_roundtrip() {
        let c = RlsConfig {
            enabled: false,
            default_tenant_id: Some("tenant-001".into()),
            schema_name: "app_schema".into(),
        };
        let back = rt(&c);
        assert!(!back.enabled);
        assert_eq!(back.default_tenant_id.as_deref(), Some("tenant-001"));
        assert_eq!(back.schema_name, "app_schema");
    }

    #[test]
    fn rls_config_json_roundtrip_default() {
        let c = RlsConfig::default();
        let json = serde_json::to_string(&c).unwrap();
        let back: RlsConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(back.enabled, c.enabled);
        assert_eq!(back.schema_name, c.schema_name);
    }
}
