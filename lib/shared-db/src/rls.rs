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
            sqlx::query(&enable_rls).execute(pool).await?;

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
            let policy_sql = if policy_exists {
                format!(
                    "ALTER POLICY {} ON {}.{} USING (
                        tenant_id = NULLIF(current_setting('app.tenant_id'), '')::UUID OR tenant_id IS NULL
                    )",
                    policy_name, schema, table_name
                )
            } else {
                format!(
                    "CREATE POLICY {} ON {}.{} FOR ALL USING (
                        tenant_id = NULLIF(current_setting('app.tenant_id'), '')::UUID OR tenant_id IS NULL
                    )",
                    policy_name, schema, table_name
                )
            };
            sqlx::query(&policy_sql).execute(pool).await?;

            debug!("Enabled RLS for table: {}", table_name);
        }

        Ok(())
    }

    pub async fn set_tenant_context(&self, tenant_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
            .bind(tenant_id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

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
            match sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                .bind(tenant_id.to_string())
                .execute(&pool)
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

    next.run(req).await
}

#[cfg(test)]
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
