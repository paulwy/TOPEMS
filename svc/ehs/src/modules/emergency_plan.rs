//! Emergency plan management - Plan CRUD, categories, versions, supplies, and approval workflow

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::permission::{dual_scope, open_read_scope, open_write_scope};
use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/emergency-plans", get(list_plans).post(create_plan))
        .route("/emergency-plans/categories", get(list_plan_categories))
        .route(
            "/emergency-plans/{id}/versions",
            get(list_plan_versions).post(create_new_version),
        )
        .route("/plans", get(list_plans).post(create_plan))
        .route(
            "/plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
}

#[derive(Debug, Deserialize)]
pub struct PlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EmergencyPlan {
    pub id: String,
    pub plan_no: String,
    #[serde(rename = "name")]
    pub title: String,
    pub description: Option<String>,
    #[serde(rename = "plan_type")]
    pub category: String,
    pub version: String,
    pub status: String,
    pub scope: Option<String>,
    pub emergency_level: Option<String>,
    #[serde(skip_serializing)]
    pub responsible_dept: Option<String>,
    #[serde(rename = "responsible_persons")]
    pub responsible_persons: Vec<String>,
    #[serde(rename = "contact_info")]
    pub contact_phone: Option<String>,
    #[serde(rename = "response_procedures")]
    pub content: Option<String>,
    pub created_by: Option<String>,
    #[serde(skip_serializing)]
    pub approved_by: Option<String>,
    #[serde(skip_serializing)]
    pub approved_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing)]
    pub effective_date: Option<String>,
    #[serde(skip_serializing)]
    pub expiry_date: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanSupply {
    pub id: String,
    pub plan_id: String,
    pub name: String,
    pub specification: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub storage_location: Option<String>,
    pub responsible_person: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanVersion {
    pub id: String,
    pub plan_id: String,
    pub version: String,
    pub change_description: Option<String>,
    pub changed_by: Option<String>,
    pub changed_at: Option<DateTime<Utc>>,
    pub content: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanApproval {
    pub id: String,
    pub plan_id: String,
    pub approver: Option<String>,
    pub approver_role: Option<String>,
    pub status: String,
    pub opinion: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub order_num: i32,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanDetail {
    pub plan: EmergencyPlan,
    pub supplies: Vec<PlanSupply>,
    pub versions: Vec<PlanVersion>,
    pub approvals: Vec<PlanApproval>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreatePlanRequest {
    #[serde(alias = "name")]
    pub title: String,
    pub description: Option<String>,
    #[serde(alias = "plan_type")]
    pub category: String,
    pub scope: Option<String>,
    pub emergency_level: Option<String>,
    pub responsible_dept: Option<String>,
    pub responsible_person: Option<String>,
    #[serde(default)]
    pub responsible_persons: Option<Vec<String>>,
    #[serde(alias = "contact_info")]
    pub contact_phone: Option<String>,
    #[serde(alias = "response_procedures")]
    pub content: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub plan_no: Option<String>,
    pub status: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdatePlanRequest {
    #[serde(alias = "name")]
    pub title: Option<String>,
    pub description: Option<String>,
    #[serde(alias = "plan_type")]
    pub category: Option<String>,
    pub scope: Option<String>,
    pub emergency_level: Option<String>,
    pub responsible_dept: Option<String>,
    pub responsible_person: Option<String>,
    #[serde(default)]
    pub responsible_persons: Option<Vec<String>>,
    #[serde(alias = "contact_info")]
    pub contact_phone: Option<String>,
    #[serde(alias = "response_procedures")]
    pub content: Option<String>,
    pub status: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSupplyRequest {
    pub name: String,
    pub specification: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub storage_location: Option<String>,
    pub responsible_person: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitApprovalRequest {
    pub approvers: Option<Vec<String>>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub opinion: Option<String>,
    pub result: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_plans(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<PlanQuery>,
) -> ApiResponse<Vec<EmergencyPlan>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.emergency_plan.list_plans",
        "ehs.qa_ehs_emergency_plans",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open plan scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(status) = &q.status {
        if !status.is_empty() {
            where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
            params.push(status.clone());
        }
    }
    if let Some(category) = &q.category {
        if !category.is_empty() {
            where_clause.push_str(&format!(" AND category = ${}", params.len() + filter_base));
            params.push(category.clone());
        }
    }
    let sql = format!(
        "SELECT id::text, plan_no, title, description, category, version, status, scope, emergency_level, responsible_dept, responsible_person, contact_phone, content, created_by, approved_by, approved_at, effective_date::text, expiry_date::text, created_at, updated_at, tenant_id::text FROM ehs.qa_ehs_emergency_plans{} ORDER BY created_at DESC LIMIT {} OFFSET {}",
        where_clause, page_size, offset
    );
    let mut qb = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        qb = qb.bind(tenant);
    }
    for p in &params {
        qb = qb.bind(p);
    }
    match qb.fetch_all(&mut scope).await {
        Ok(rows) => {
            let items: Vec<EmergencyPlan> = rows.iter().map(plan_from_row).collect();
            ApiResponse::success(items, "获取应急预案列表成功")
        }
        Err(e) => {
            tracing::error!("list_plans error: {}", e);
            ApiResponse::from(TopemsError::internal("查询应急预案列表失败", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/plans",
    request_body = CreatePlanRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreatePlanRequest>,
) -> ApiResponse<EmergencyPlan> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        // scope-exempt: no-request-txn
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
    let responsible_person = req
        .responsible_persons
        .clone()
        .and_then(|v| v.into_iter().next())
        .or_else(|| req.responsible_person.clone());
    let plan_no = req.plan_no.clone().unwrap_or_else(|| {
        let now = chrono::Utc::now().format("%Y%m%d");
        format!(
            "EP-{}-{}",
            now,
            uuid::Uuid::new_v4().simple().to_string()[..6].to_uppercase()
        )
    });
    let status = req.status.clone().unwrap_or_else(|| "planned".to_string());
    let version = req.version.clone().unwrap_or_else(|| "v1".to_string());
    let sql = "INSERT INTO ehs.qa_ehs_emergency_plans (plan_no, title, description, category, version, status, scope, emergency_level, responsible_dept, responsible_person, contact_phone, content, created_by, effective_date, expiry_date, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::date, $15::date, $16::uuid) RETURNING id::text, plan_no, title, description, category, version, status, scope, emergency_level, responsible_dept, responsible_person, contact_phone, content, created_by, approved_by, approved_at, effective_date::text, expiry_date::text, created_at, updated_at, tenant_id::text";
    match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&plan_no)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.category)
        .bind(&version)
        .bind(&status)
        .bind(&req.scope)
        .bind(&req.emergency_level)
        .bind(&req.responsible_dept)
        .bind(&responsible_person)
        .bind(&req.contact_phone)
        .bind(&req.content)
        .bind(claims.username.clone())
        .bind(&req.effective_date)
        .bind(&req.expiry_date)
        .bind(tenant_id.to_string())
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success(plan_from_row(&r), "创建应急预案成功")
        }
        Err(e) => {
            tracing::error!("create_plan error: {}", e);
            ApiResponse::from(TopemsError::internal("创建应急预案失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/plans/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<PlanDetail> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.emergency_plan.get_plan",
        "ehs.qa_ehs_emergency_plans",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open plan scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        " AND tenant_id = $2::uuid"
    } else {
        ""
    };
    let plan_sql = format!("SELECT id::text, plan_no, title, description, category, version, status, scope, emergency_level, responsible_dept, responsible_person, contact_phone, content, created_by, approved_by, approved_at, effective_date::text, expiry_date::text, created_at, updated_at, tenant_id::text FROM ehs.qa_ehs_emergency_plans WHERE id = $1::uuid{tenant_filter} AND deleted_at IS NULL");
    let mut plan_query = sqlx::query(sqlx::AssertSqlSafe(plan_sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        plan_query = plan_query.bind(tenant);
    }
    let plan_row = match plan_query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::not_found("应急预案不存在");
        }
        Err(e) => {
            tracing::error!("get_plan error: {}", e);
            return ApiResponse::from(TopemsError::internal("查询应急预案失败", e));
        }
    };
    let plan = plan_from_row(&plan_row);

    let supplies_sql = format!(
        "SELECT id::text, plan_id::text, name, specification, quantity, unit, storage_location, responsible_person, remarks, created_at, tenant_id::text FROM ehs.qa_ehs_emergency_plan_supplies WHERE plan_id = $1::uuid{tenant_filter} AND deleted_at IS NULL ORDER BY created_at DESC"
    );
    let mut supplies_query = sqlx::query(sqlx::AssertSqlSafe(supplies_sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        supplies_query = supplies_query.bind(tenant);
    }
    let supplies: Vec<PlanSupply> = match supplies_query.fetch_all(&mut scope).await {
        Ok(rows) => rows.iter().map(plan_supply_from_row).collect(),
        Err(e) => {
            tracing::error!("get_plan supplies error: {}", e);
            Vec::new()
        }
    };

    let versions_sql = format!(
        "SELECT id::text, plan_id::text, version, change_description, changed_by, changed_at, content, tenant_id::text FROM ehs.qa_ehs_emergency_plan_versions WHERE plan_id = $1::uuid{tenant_filter} AND deleted_at IS NULL ORDER BY changed_at DESC"
    );
    let mut versions_query = sqlx::query(sqlx::AssertSqlSafe(versions_sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        versions_query = versions_query.bind(tenant);
    }
    let versions: Vec<PlanVersion> = match versions_query.fetch_all(&mut scope).await {
        Ok(rows) => rows.iter().map(plan_version_from_row).collect(),
        Err(e) => {
            tracing::error!("get_plan versions error: {}", e);
            Vec::new()
        }
    };

    let approvals_sql = format!(
        "SELECT id::text, plan_id::text, approver, approver_role, status, opinion, approved_at, order_num, tenant_id::text FROM ehs.qa_ehs_emergency_plan_approvals WHERE plan_id = $1::uuid{tenant_filter} AND deleted_at IS NULL ORDER BY order_num ASC"
    );
    let mut approvals_query = sqlx::query(sqlx::AssertSqlSafe(approvals_sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        approvals_query = approvals_query.bind(tenant);
    }
    let approvals: Vec<PlanApproval> = match approvals_query.fetch_all(&mut scope).await {
        Ok(rows) => rows.iter().map(plan_approval_from_row).collect(),
        Err(e) => {
            tracing::error!("get_plan approvals error: {}", e);
            Vec::new()
        }
    };

    let detail = PlanDetail {
        plan,
        supplies,
        versions,
        approvals,
        tenant_id: uuid::Uuid::nil(),
    };
    ApiResponse::success(detail, "获取应急预案详情成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/plans/{id}",
    request_body = UpdatePlanRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn update_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdatePlanRequest>,
) -> ApiResponse<EmergencyPlan> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.emergency_plan.update_plan",
        "ehs.qa_ehs_emergency_plans",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open plan scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let mut set_clauses: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    let mut push = |val: String, col: &str| {
        params.push(val);
        set_clauses.push(format!("{} = ${}", col, params.len()));
    };
    if let Some(v) = req.title {
        push(v, "title");
    }
    if let Some(v) = req.description {
        push(v, "description");
    }
    if let Some(v) = req.category {
        push(v, "category");
    }
    if let Some(v) = req.scope {
        push(v, "scope");
    }
    if let Some(v) = req.emergency_level {
        push(v, "emergency_level");
    }
    if let Some(v) = req.responsible_dept {
        push(v, "responsible_dept");
    }
    let responsible_person = req
        .responsible_persons
        .clone()
        .and_then(|v| v.into_iter().next())
        .or_else(|| req.responsible_person.clone());
    if let Some(v) = responsible_person {
        push(v, "responsible_person");
    }
    if let Some(v) = req.contact_phone {
        push(v, "contact_phone");
    }
    if let Some(v) = req.content {
        push(v, "content");
    }
    if let Some(v) = req.status {
        push(v, "status");
    }
    if let Some(v) = req.effective_date {
        push(v, "effective_date");
    }
    if let Some(v) = req.expiry_date {
        push(v, "expiry_date");
    }
    if set_clauses.is_empty() {
        return ApiResponse::bad_request("无更新字段");
    }
    set_clauses.push("updated_at = NOW()".to_string());
    let id_param = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_param + 1)
    } else {
        String::new()
    };
    let sql = format!(
        "UPDATE ehs.qa_ehs_emergency_plans SET {} WHERE id = ${}::uuid{} AND deleted_at IS NULL RETURNING id::text, plan_no, title, description, category, version, status, scope, emergency_level, responsible_dept, responsible_person, contact_phone, content, created_by, approved_by, approved_at, effective_date::text, expiry_date::text, created_at, updated_at, tenant_id::text",
        set_clauses.join(", "), id_param, tenant_filter
    );
    params.push(id.clone());
    let mut qb = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        qb = qb.bind(p);
    }
    if let Some(tenant) = tenant_scope.tenant_id() {
        qb = qb.bind(tenant);
    }
    match qb.fetch_optional(&mut scope).await {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success(plan_from_row(&r), "更新应急预案成功")
        }
        Ok(None) => ApiResponse::not_found("应急预案不存在"),
        Err(e) => {
            tracing::error!("update_plan error: {}", e);
            ApiResponse::from(TopemsError::internal("更新应急预案失败", e))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/plans/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.emergency_plan.delete_plan",
        "ehs.qa_ehs_emergency_plans",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open plan scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        "UPDATE ehs.qa_ehs_emergency_plans SET deleted_at = NOW() WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL"
    } else {
        "UPDATE ehs.qa_ehs_emergency_plans SET deleted_at = NOW() WHERE id = $1::uuid AND deleted_at IS NULL"
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    match query.execute(&mut scope).await {
        Ok(res) if res.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success((), "删除应急预案成功")
        }
        Ok(_) => ApiResponse::not_found("应急预案不存在"),
        Err(e) => {
            tracing::error!("delete_plan error: {}", e);
            ApiResponse::from(TopemsError::internal("删除应急预案失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/emergency-plans/{id}/versions",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_plan_versions(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Vec<PlanVersion>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.emergency_plan.list_plan_versions",
        "ehs.qa_ehs_emergency_plan_versions",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open plan version scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        "SELECT id::text, plan_id::text, version, change_description, changed_by, changed_at, content, tenant_id::text FROM ehs.qa_ehs_emergency_plan_versions WHERE plan_id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL ORDER BY changed_at DESC"
    } else {
        "SELECT id::text, plan_id::text, version, change_description, changed_by, changed_at, content, tenant_id::text FROM ehs.qa_ehs_emergency_plan_versions WHERE plan_id = $1::uuid AND deleted_at IS NULL ORDER BY changed_at DESC"
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    match query.fetch_all(&mut scope).await {
        Ok(rows) => {
            let items: Vec<PlanVersion> = rows.iter().map(plan_version_from_row).collect();
            ApiResponse::success(items, "获取预案版本列表成功")
        }
        Err(e) => {
            tracing::error!("list_plan_versions error: {}", e);
            ApiResponse::from(TopemsError::internal("获取预案版本列表失败", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/emergency-plans/{id}/versions",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_new_version(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<PlanVersion> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        // scope-exempt: no-request-txn
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
    let change_description = req
        .get("change_description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let content = req
        .get("content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sql = "INSERT INTO ehs.qa_ehs_emergency_plan_versions (plan_id, version, change_description, changed_by, content, tenant_id) VALUES ($1::uuid, 'v' || (SELECT COUNT(*) + 1 FROM ehs.qa_ehs_emergency_plan_versions WHERE plan_id = $1::uuid AND deleted_at IS NULL), $2, $3, $4, $5::uuid) RETURNING id::text, plan_id::text, version, change_description, changed_by, changed_at, content, tenant_id::text";
    match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&id)
        .bind(&change_description)
        .bind(claims.username.clone())
        .bind(&content)
        .bind(tenant_id.to_string())
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success(plan_version_from_row(&r), "创建预案版本成功")
        }
        Err(e) => {
            tracing::error!("create_new_version error: {}", e);
            ApiResponse::from(TopemsError::internal("创建预案版本失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/emergency-plans/categories",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_plan_categories(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<serde_json::Value>> {
    // 预案分类无持久化字典表，声明式 501。
    tracing::warn!("Emergency plan categories data source not yet enabled");
    ApiResponse::not_implemented("预案分类数据源尚未启用")
}

/// qa_ehs_emergency_plans 行 → EmergencyPlan（serde rename 输出前端契约键）
fn plan_from_row(r: &sqlx::postgres::PgRow) -> EmergencyPlan {
    let id: String = r.try_get("id").unwrap_or_default();
    let plan_no: String = r.try_get("plan_no").unwrap_or_default();
    let title: String = r.try_get("title").unwrap_or_default();
    let description: Option<String> = r.try_get("description").ok().flatten();
    let category: String = r.try_get("category").unwrap_or_default();
    let version: String = r.try_get("version").unwrap_or_default();
    let status: String = r.try_get("status").unwrap_or_default();
    let scope: Option<String> = r.try_get("scope").ok().flatten();
    let emergency_level: Option<String> = r.try_get("emergency_level").ok().flatten();
    let responsible_dept: Option<String> = r.try_get("responsible_dept").ok().flatten();
    let responsible_person: Option<String> = r.try_get("responsible_person").ok().flatten();
    let contact_phone: Option<String> = r.try_get("contact_phone").ok().flatten();
    let content: Option<String> = r.try_get("content").ok().flatten();
    let created_by: Option<String> = r.try_get("created_by").ok().flatten();
    let approved_by: Option<String> = r.try_get("approved_by").ok().flatten();
    let approved_at: Option<DateTime<Utc>> = r.try_get("approved_at").ok().flatten();
    let effective_date: Option<String> = r.try_get("effective_date").ok().flatten();
    let expiry_date: Option<String> = r.try_get("expiry_date").ok().flatten();
    let created_at: Option<DateTime<Utc>> = r.try_get("created_at").ok().flatten();
    let updated_at: Option<DateTime<Utc>> = r.try_get("updated_at").ok().flatten();
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    EmergencyPlan {
        id,
        plan_no,
        title,
        description,
        category,
        version,
        status,
        scope,
        emergency_level,
        responsible_dept,
        responsible_persons: responsible_person.map(|v| vec![v]).unwrap_or_default(),
        contact_phone,
        content,
        created_by,
        approved_by,
        approved_at,
        effective_date,
        expiry_date,
        created_at,
        updated_at,
        tenant_id: uuid::Uuid::parse_str(&tenant_id).unwrap_or_else(|_| uuid::Uuid::nil()),
    }
}

/// qa_ehs_emergency_plan_supplies 行 → PlanSupply
fn plan_supply_from_row(r: &sqlx::postgres::PgRow) -> PlanSupply {
    let id: String = r.try_get("id").unwrap_or_default();
    let plan_id: String = r.try_get("plan_id").unwrap_or_default();
    let name: String = r.try_get("name").unwrap_or_default();
    let specification: Option<String> = r.try_get("specification").ok().flatten();
    let quantity: i32 = r.try_get("quantity").unwrap_or(0);
    let unit: Option<String> = r.try_get("unit").ok().flatten();
    let storage_location: Option<String> = r.try_get("storage_location").ok().flatten();
    let responsible_person: Option<String> = r.try_get("responsible_person").ok().flatten();
    let remarks: Option<String> = r.try_get("remarks").ok().flatten();
    let created_at: Option<DateTime<Utc>> = r.try_get("created_at").ok().flatten();
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    PlanSupply {
        id,
        plan_id,
        name,
        specification,
        quantity,
        unit,
        storage_location,
        responsible_person,
        remarks,
        created_at,
        tenant_id: uuid::Uuid::parse_str(&tenant_id).unwrap_or_else(|_| uuid::Uuid::nil()),
    }
}

/// qa_ehs_emergency_plan_versions 行 → PlanVersion
fn plan_version_from_row(r: &sqlx::postgres::PgRow) -> PlanVersion {
    let id: String = r.try_get("id").unwrap_or_default();
    let plan_id: String = r.try_get("plan_id").unwrap_or_default();
    let version: String = r.try_get("version").unwrap_or_default();
    let change_description: Option<String> = r.try_get("change_description").ok().flatten();
    let changed_by: Option<String> = r.try_get("changed_by").ok().flatten();
    let changed_at: Option<DateTime<Utc>> = r.try_get("changed_at").ok().flatten();
    let content: Option<String> = r.try_get("content").ok().flatten();
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    PlanVersion {
        id,
        plan_id,
        version,
        change_description,
        changed_by,
        changed_at,
        content,
        tenant_id: uuid::Uuid::parse_str(&tenant_id).unwrap_or_else(|_| uuid::Uuid::nil()),
    }
}

/// qa_ehs_emergency_plan_approvals 行 → PlanApproval
fn plan_approval_from_row(r: &sqlx::postgres::PgRow) -> PlanApproval {
    let id: String = r.try_get("id").unwrap_or_default();
    let plan_id: String = r.try_get("plan_id").unwrap_or_default();
    let approver: Option<String> = r.try_get("approver").ok().flatten();
    let approver_role: Option<String> = r.try_get("approver_role").ok().flatten();
    let status: String = r.try_get("status").unwrap_or_default();
    let opinion: Option<String> = r.try_get("opinion").ok().flatten();
    let approved_at: Option<DateTime<Utc>> = r.try_get("approved_at").ok().flatten();
    let order_num: i32 = r.try_get("order_num").unwrap_or(0);
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    PlanApproval {
        id,
        plan_id,
        approver,
        approver_role,
        status,
        opinion,
        approved_at,
        order_num,
        tenant_id: uuid::Uuid::parse_str(&tenant_id).unwrap_or_else(|_| uuid::Uuid::nil()),
    }
}
use utoipa::ToSchema;
