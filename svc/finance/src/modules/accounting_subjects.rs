//! V321: accounting_subjects 会计科目 CRUD 模块
//!
//! 从 ERP plugin_erp schema 物理迁移到 Finance plugin_finance schema。
//! 提供完整的 CRUD 操作：list/get/create/update/delete。

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::shared::AppState;

// ============================================================================
// 数据模型
// ============================================================================

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, sqlx::FromRow)]
pub struct AccountingSubject {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub level: i32,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: bool,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateAccountingSubjectRequest {
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub level: Option<i32>,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: Option<bool>,
    pub status: Option<String>,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateAccountingSubjectRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<i32>,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct AccountingSubjectQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PaginatedAccountingSubjects {
    pub items: Vec<AccountingSubject>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

// ============================================================================
// 通用响应包装
// ============================================================================

#[derive(Debug, Serialize, ToSchema)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: "操作成功".to_string(),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            message: message.to_string(),
        }
    }
}

// ============================================================================
// CRUD Handlers
// ============================================================================

const TABLE: &str = "accounting_subjects";

/// 列表查询（支持分页、搜索、筛选）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/api/finance/accounting-subjects",
    params(AccountingSubjectQuery),
    responses(
        (status = 200, description = "查询成功", body = PaginatedAccountingSubjects),
    ),
    tag = "Accounting"
)]
pub async fn list_accounting_subjects(
    State(state): State<AppState>,
    Query(query): Query<AccountingSubjectQuery>,
) -> Json<ApiResponse<PaginatedAccountingSubjects>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let mut conditions = vec!["deleted_at IS NULL".to_string()];
    let mut params: Vec<String> = vec![];

    if let Some(search) = &query.search {
        conditions.push(format!(
            "(code ILIKE ${} OR name ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        params.push(format!("%{}%", search));
        params.push(format!("%{}%", search));
    }
    if let Some(category) = &query.category {
        conditions.push(format!("category = ${}", params.len() + 1));
        params.push(category.clone());
    }
    if let Some(status) = &query.status {
        conditions.push(format!("status = ${}", params.len() + 1));
        params.push(status.clone());
    }

    let where_clause = conditions.join(" AND ");

    // 总数查询
    let count_sql = format!("SELECT COUNT(*) FROM {} WHERE {}", TABLE, where_clause);
    let total: i64 = match sqlx::query_scalar(&count_sql).fetch_all(&state.pool).await {
        Ok(rows) => rows.first().copied().unwrap_or(0),
        Err(e) => {
            tracing::error!("查询会计科目总数失败: {}", e);
            return Json(ApiResponse::error("查询失败"));
        }
    };

    // 分页查询
    let data_sql = format!(
        "SELECT * FROM {} WHERE {} ORDER BY code ASC LIMIT ${} OFFSET ${}",
        TABLE,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut query_builder = sqlx::query_as::<_, AccountingSubject>(&data_sql);
    for p in &params {
        query_builder = query_builder.bind(p);
    }
    query_builder = query_builder.bind(page_size).bind(offset);

    match query_builder.fetch_all(&state.pool).await {
        Ok(items) => Json(ApiResponse::success(PaginatedAccountingSubjects {
            items,
            total,
            page,
            page_size,
        })),
        Err(e) => {
            tracing::error!("查询会计科目列表失败: {}", e);
            Json(ApiResponse::error("查询失败"))
        }
    }
}

/// 根据 ID 获取单个会计科目
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/api/finance/accounting-subjects/{id}",
    params(("id" = Uuid, Path, description = "会计科目 ID")),
    responses(
        (status = 200, description = "查询成功", body = AccountingSubject),
        (status = 404, description = "未找到"),
    ),
    tag = "Accounting"
)]
pub async fn get_accounting_subject(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AccountingSubject>> {
    let sql = format!(
        "SELECT * FROM {} WHERE id = $1 AND deleted_at IS NULL",
        TABLE
    );

    match sqlx::query_as::<_, AccountingSubject>(&sql)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(subject)) => Json(ApiResponse::success(subject)),
        Ok(None) => Json(ApiResponse::error("会计科目不存在")),
        Err(e) => {
            tracing::error!("查询会计科目失败: {}", e);
            Json(ApiResponse::error("查询失败"))
        }
    }
}

/// 创建会计科目
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/api/finance/accounting-subjects",
    request_body = CreateAccountingSubjectRequest,
    responses(
        (status = 200, description = "创建成功", body = AccountingSubject),
    ),
    tag = "Accounting"
)]
pub async fn create_accounting_subject(
    State(state): State<AppState>,
    Json(req): Json<CreateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    let org_id = Uuid::new_v4();
    let level = req.level.unwrap_or(1);
    let is_cash_flow = req.is_cash_flow.unwrap_or(false);
    let status = req.status.unwrap_or_else(|| "active".to_string());

    let sql = format!(
        r#"INSERT INTO {} (organization_id, code, name, category, level, parent_code, description, is_cash_flow, status, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *"#,
        TABLE
    );

    match sqlx::query_as::<_, AccountingSubject>(&sql)
        .bind(org_id)
        .bind(&req.code)
        .bind(&req.name)
        .bind(&req.category)
        .bind(level)
        .bind(&req.parent_code)
        .bind(&req.description)
        .bind(is_cash_flow)
        .bind(&status)
        .bind(req.tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(subject) => Json(ApiResponse::success(subject)),
        Err(e) => {
            tracing::error!("创建会计科目失败: {}", e);
            Json(ApiResponse::error("创建失败"))
        }
    }
}

/// 更新会计科目
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:write"])),
    path = "/api/finance/accounting-subjects/{id}",
    params(("id" = Uuid, Path, description = "会计科目 ID")),
    request_body = UpdateAccountingSubjectRequest,
    responses(
        (status = 200, description = "更新成功", body = AccountingSubject),
    ),
    tag = "Accounting"
)]
pub async fn update_accounting_subject(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    // 先查询现有记录
    let existing_sql = format!(
        "SELECT * FROM {} WHERE id = $1 AND deleted_at IS NULL",
        TABLE
    );
    let existing: Option<AccountingSubject> =
        match sqlx::query_as::<_, AccountingSubject>(&existing_sql)
            .bind(id)
            .fetch_optional(&state.pool)
            .await
        {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("查询会计科目失败: {}", e);
                return Json(ApiResponse::error("查询失败"));
            }
        };

    let Some(existing) = existing else {
        return Json(ApiResponse::error("会计科目不存在"));
    };

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.or(existing.category);
    let level = req.level.unwrap_or(existing.level);
    let parent_code = req.parent_code.or(existing.parent_code);
    let description = req.description.or(existing.description);
    let is_cash_flow = req.is_cash_flow.unwrap_or(existing.is_cash_flow);
    let status = req.status.unwrap_or(existing.status);

    let sql = format!(
        r#"UPDATE {} SET name = $1, category = $2, level = $3, parent_code = $4,
           description = $5, is_cash_flow = $6, status = $7, updated_at = NOW()
           WHERE id = $8 AND deleted_at IS NULL RETURNING *"#,
        TABLE
    );

    match sqlx::query_as::<_, AccountingSubject>(&sql)
        .bind(&name)
        .bind(&category)
        .bind(level)
        .bind(&parent_code)
        .bind(&description)
        .bind(is_cash_flow)
        .bind(&status)
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(subject) => Json(ApiResponse::success(subject)),
        Err(e) => {
            tracing::error!("更新会计科目失败: {}", e);
            Json(ApiResponse::error("更新失败"))
        }
    }
}

/// 删除会计科目（软删除）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/api/finance/accounting-subjects/{id}",
    params(("id" = Uuid, Path, description = "会计科目 ID")),
    responses(
        (status = 200, description = "删除成功"),
    ),
    tag = "Accounting"
)]
pub async fn delete_accounting_subject(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let sql = format!(
        "UPDATE {} SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
        TABLE
    );

    match sqlx::query(&sql).bind(id).execute(&state.pool).await {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(
                    serde_json::json!({"id": id.to_string()}),
                ))
            } else {
                Json(ApiResponse::error("会计科目不存在"))
            }
        }
        Err(e) => {
            tracing::error!("删除会计科目失败: {}", e);
            Json(ApiResponse::error("删除失败"))
        }
    }
}

// ============================================================================
// 路由注册
// ============================================================================

pub fn create_routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route(
            "/accounting-subjects",
            get(list_accounting_subjects).post(create_accounting_subject),
        )
        .route(
            "/accounting-subjects/{id}",
            get(get_accounting_subject)
                .put(update_accounting_subject)
                .delete(delete_accounting_subject),
        )
}

// ============================================================================
// 工具函数：根据 code 查询科目名称（供 ERP opening_balance 等跨服务调用）
// ============================================================================

pub async fn get_subject_name_by_code(pool: &PgPool, code: &str) -> Option<String> {
    let sql = format!(
        "SELECT name FROM {} WHERE code = $1 AND deleted_at IS NULL LIMIT 1",
        TABLE
    );

    sqlx::query_scalar(&sql)
        .bind(code)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_accounting_subject_serialization() {
        let subject = AccountingSubject {
            id: Uuid::new_v4(),
            organization_id: Uuid::new_v4(),
            code: "1001".to_string(),
            name: "库存现金".to_string(),
            category: Some("asset".to_string()),
            level: 1,
            parent_code: None,
            description: Some("现金科目".to_string()),
            is_cash_flow: true,
            status: "active".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            deleted_at: None,
            tenant_id: None,
        };
        let json = serde_json::to_value(&subject).unwrap();
        assert_eq!(json["code"], "1001");
        assert_eq!(json["name"], "库存现金");
        assert_eq!(json["category"], "asset");
        assert_eq!(json["level"], 1);
        assert_eq!(json["is_cash_flow"], true);
        assert_eq!(json["status"], "active");
    }

    #[test]
    fn test_create_accounting_subject_request_deserialize() {
        let json = r#"{
            "code": "1002",
            "name": "银行存款",
            "category": "asset",
            "level": 1,
            "description": "银行存款科目",
            "is_cash_flow": true,
            "status": "active"
        }"#;
        let request: CreateAccountingSubjectRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.code, "1002");
        assert_eq!(request.name, "银行存款");
        assert_eq!(request.category.as_deref(), Some("asset"));
        assert_eq!(request.level, Some(1));
        assert_eq!(request.is_cash_flow, Some(true));
        assert_eq!(request.status.as_deref(), Some("active"));
    }

    #[test]
    fn test_create_accounting_subject_request_minimal() {
        let json = r#"{"code": "1003", "name": "其他货币资金"}"#;
        let request: CreateAccountingSubjectRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.code, "1003");
        assert_eq!(request.name, "其他货币资金");
        assert!(request.category.is_none());
        assert!(request.level.is_none());
        assert!(request.is_cash_flow.is_none());
        assert!(request.status.is_none());
    }

    #[test]
    fn test_update_accounting_subject_request_deserialize() {
        let json = r#"{"name": "更新名称", "status": "inactive"}"#;
        let request: UpdateAccountingSubjectRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.name.as_deref(), Some("更新名称"));
        assert_eq!(request.status.as_deref(), Some("inactive"));
        assert!(request.category.is_none());
    }

    #[test]
    fn test_accounting_subject_query_deserialize() {
        let json = r#"{"page": 1, "page_size": 20, "search": "现金", "category": "asset", "status": "active"}"#;
        let query: AccountingSubjectQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
        assert_eq!(query.search.as_deref(), Some("现金"));
        assert_eq!(query.category.as_deref(), Some("asset"));
        assert_eq!(query.status.as_deref(), Some("active"));
    }

    #[test]
    fn test_paginated_accounting_subjects_serialization() {
        let paginated = PaginatedAccountingSubjects {
            items: vec![],
            total: 0,
            page: 1,
            page_size: 20,
        };
        let json = serde_json::to_value(&paginated).unwrap();
        assert_eq!(json["total"], 0);
        assert_eq!(json["page"], 1);
        assert_eq!(json["page_size"], 20);
        assert!(json["items"].as_array().unwrap().is_empty());
    }
}
