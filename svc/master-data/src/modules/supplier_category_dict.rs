//! 供应商类别字典（master_data.mdm_supplier_categories）—— 只读列表，供前端下拉/级联选用。
//!
//! 本表由 MDM 维护（种子 + 后续批次写入口），本模块**只提供只读 list**，
//! 不提供 create/update/delete；与 master_data.mdm_suppliers.category_code 形成弱引用。
//!
//! 租户隔离与同服务其它主数据域一致：读 x-tenant-id 头；nil/全零视为超管放行，
//! 其余按 tenant_id 过滤；RLS 在连接层兜底。

use axum::extract::{Extension, State};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::types::Json as SqlJson;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::BindTenantScope;
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_core::TopemsError;

use crate::shared::{tenant_read_scope, AppState};

/// 供应商类别字典行（只读）。
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SupplierCategory {
    pub id: String,
    pub code: String,
    pub name_zh: String,
    pub name_en: Option<String>,
    /// 上游系统原值映射，形如 `{"scm":"raw_material","srm":"原材料"}`。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_values: Option<SqlJson<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// GET /api/master-data/supplier-categories —— 只读列表（未软删、按 sort_order/code 排序）。
pub async fn list_supplier_categories(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<SupplierCategory>> {
    // B 类读路径：普通用户必须有租户；服务令牌/超管走显式系统通道（落日志 + 计数）。
    let scope = match tenant_read_scope(
        &claims,
        "master-data.supplier_categories.list",
        "master_data.mdm_supplier_categories",
    ) {
        Ok(scope) => scope,
        Err(e) => return ApiResponse::from(e),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let rows: Result<Vec<SupplierCategory>, sqlx::Error> =
        sqlx::query_as(sqlx::AssertSqlSafe(format!(
            r#"SELECT id::text, code, name_zh, name_en, source_values, description,
                  sort_order, status, created_at, updated_at
           FROM master_data.mdm_supplier_categories
           WHERE deleted_at IS NULL
             AND {}
           ORDER BY sort_order NULLS LAST, code"#,
            scope.sql_predicate("tenant_id", "$1")
        )))
        .bind_tenant_scope(&scope)
        .fetch_all(&mut db_scope)
        .await;
    match rows {
        Ok(v) => api_success(v),
        Err(e) => {
            tracing::error!("查询供应商类别字典失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询供应商类别字典失败".to_string()))
        }
    }
}
