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

/// 对单表启用 `ENABLE` + `FORCE ROW LEVEL SECURITY` 并确保租户策略存在。
///
/// 供启动期自愈（`schema::run_schema_defense`）与 [`RlsMiddleware`] 共用，
/// 保证「策略形态」只有这一份实现：
///   nil UUID（超管/服务身份）→ 全量
///   精确租户匹配 → 本租户
///   GUC 未设置 / 被 RESET 成空串 → 两侧为 NULL → 全拒（fail-closed）
///
/// ⚠️ 禁止退回 `tenant_id IS NULL` / `current_setting(...) = ''` 的"未设即豁免"分支
/// （会把未设租户的查询放大成全量，等于关闭隔离）；CI 门禁见
/// `scripts/ci/check-rls-policy-shape.sh`。
///
/// 调用方必须是表 owner 或超管；传入的 `schema` / `table` 均来自代码内静态定义或
/// `information_schema`，不接受外部输入。
// tenant-system: 启动期/管理面 DDL，没有请求租户上下文；这是显式系统通道，不参与租户隔离。
pub async fn enable_tenant_rls(
    pool: &PgPool,
    schema: &str,
    table: &str,
) -> Result<(), sqlx::Error> {
    let enable_rls = format!(
        "ALTER TABLE IF EXISTS {}.{} ENABLE ROW LEVEL SECURITY",
        schema, table
    );
    sqlx::query(sqlx::AssertSqlSafe(enable_rls))
        .execute(pool)
        .await?;

    // P0：与 owner 身份解耦。未 FORCE 时表 owner（应用角色）会完全绕过 RLS，
    // 策略是否 fail-closed 都形同不存在；FORCE 后才能保证受限身份也受策略约束。
    let force_rls = format!(
        "ALTER TABLE IF EXISTS {}.{} FORCE ROW LEVEL SECURITY",
        schema, table
    );
    sqlx::query(sqlx::AssertSqlSafe(force_rls))
        .execute(pool)
        .await?;

    let policy_name = format!("tenant_isolation_{}", table);
    // PostgreSQL 18 不支持 CREATE POLICY IF NOT EXISTS（语法错误），
    // 需先判断策略是否存在：存在则 ALTER POLICY 更新，否则 CREATE POLICY。
    let policy_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = $1 AND tablename = $2 AND policyname = $3
        )",
    )
    .bind(schema)
    .bind(table)
    .bind(&policy_name)
    .fetch_one(pool)
    .await?;

    let nil_uuid = "00000000-0000-0000-0000-000000000000";
    let pred = format!(
        "(NULLIF(current_setting('app.tenant_id', true), ''))::uuid = '{nil_uuid}'::uuid
         OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid"
    );
    let policy_sql = if policy_exists {
        format!(
            "ALTER POLICY {} ON {}.{} USING ({pred}) WITH CHECK ({pred})",
            policy_name, schema, table
        )
    } else {
        format!(
            "CREATE POLICY {} ON {}.{} FOR ALL TO PUBLIC USING ({pred}) WITH CHECK ({pred})",
            policy_name, schema, table
        )
    };
    sqlx::query(sqlx::AssertSqlSafe(policy_sql))
        .execute(pool)
        .await?;

    Ok(())
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

    // tenant-system: 启动期/管理面按 schema 批量收紧，无请求租户上下文，属显式系统通道。
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
            enable_tenant_rls(pool, schema, &table_name).await?;
            debug!("Enabled FORCE RLS for table: {}", table_name);
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

/// 请求级 RLS 预处理（**不申请连接**）。
///
/// # 为什么不在这里持有连接
///
/// B6 版本为“保证 GUC 与业务查询落在同一连接”，acquire 了本请求独占连接、会话级
/// `set_config('app.tenant_id', $1, false)` 后一直持有到响应结束。但这条连接
/// **从未交给下游**（既不进 extensions，也不作为 Executor 传下去），下游所有租户
/// 数据访问都走 `Db::scope*` / `scope_with`，在各自事务里用事务级
/// `set_config(..., true)` 设置 `app.tenant_id` / `app.rls_system`。因此：
///
/// - 该连接对隔离**零贡献**（它的 GUC 没有任何语句能读到）；
/// - 但它每请求白占一条连接，且在紧池（嵌入模式 `max=2`）下与本请求的事务连接
///   形成 hold-and-wait：`rls(1) + 请求事务(1) + 作用域事务(1) = 3 > 2`，
///   单请求即 acquire 超时（W7-B4-EHS-FOLLOWUP-1 根因）。
///
/// 现在租户上下文只有一条真相源：`auth_middleware` 写入 task-local 的
/// [`RlsRequestTenant`]，由 `Db::scope*` 在事务级落库；服务身份的系统通道
/// （nil + `app.rls_system='on'`）同样由 `Db::scope_system` / 请求事务设置。
///
/// 保留本函数是为了兼容既有装配与文档引用；`build_application` 已不再把它挂到
/// 受保护路由上（挂一层空操作层只会让人误以为这里还负责隔离）。
pub async fn rls_middleware(
    State(_pool): State<PgPool>,
    req: Request<Body>,
    next: Next,
) -> Response {
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
