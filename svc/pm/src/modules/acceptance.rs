use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::acceptance::{
    AcceptanceItem, AcceptancePlan, AcceptanceRecord, CreateAcceptanceItemRequest,
    CreateAcceptancePlanRequest, CreateAcceptanceRecordRequest, UpdateAcceptanceItemRequest,
    UpdateAcceptancePlanRequest, UpdateAcceptanceRecordRequest,
};
use crate::modules::acceptance_plan_status::AcceptancePlanStatus;
use crate::modules::acceptance_record_status::AcceptanceRecordStatus;
use crate::modules::effective_tenant_id;
use crate::services::audit::PmAuditService;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/acceptance-plans",
            get(get_project_plans).post(create_plan),
        )
        .route("/acceptance-plans/{id}", get(get_plan).put(update_plan))
        .route(
            "/acceptance-plans/{plan_id}/items",
            get(get_plan_items).post(create_plan_item),
        )
        .route(
            "/acceptance-items/{id}",
            put(update_plan_item).delete(delete_plan_item),
        )
        .route(
            "/projects/{project_id}/acceptance-records",
            get(get_project_records),
        )
        .route(
            "/acceptance-records/{id}",
            get(get_record).put(update_record),
        )
        .route("/acceptance-plans/{plan_id}/records", post(create_record))
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/acceptance-plans",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn get_project_plans(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<AcceptancePlan>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let plans = sqlx::query_as::<_, AcceptancePlan>(
        only_own_schema_query!("pm", "SELECT id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_at, updated_at FROM pm.acceptance_plans WHERE project_id = $1 ORDER BY expected_date"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match plans {
        Ok(p) => ApiResponse::success(p, "获取验收计划列表成功"),
        Err(e) => {
            tracing::error!("获取验收计划失败: {}", e);
            ApiResponse::server_error("获取验收计划失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/acceptance-plans/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn get_plan(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AcceptancePlan> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let plan = sqlx::query_as::<_, AcceptancePlan>(
        only_own_schema_query!("pm", "SELECT id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_at, updated_at FROM pm.acceptance_plans WHERE id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(p) => ApiResponse::success(p, "获取验收计划详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("验收计划不存在"),
        Err(e) => {
            tracing::error!("获取验收计划失败: {}", e);
            ApiResponse::server_error("获取验收计划失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/projects/{project_id}/acceptance-plans",
    tag = "acceptance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_plan(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAcceptancePlanRequest>,
) -> ApiResponse<AcceptancePlan> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(
        serde_json::json!({"project_id": project_id, "plan_code": req.plan_code, "plan_name": req.plan_name}),
    );

    let plan = sqlx::query_as::<_, AcceptancePlan>(
        only_own_schema_query!("pm", "INSERT INTO pm.acceptance_plans (id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.plan_code)
    .bind(&req.plan_name)
    .bind(&req.acceptance_type)
    .bind(req.milestone_id)
    .bind(req.phase_id)
    .bind(req.acceptance_criteria)
    .bind(parse_date_opt(&req.expected_date))
    .bind(AcceptancePlanStatus::DEFAULT.as_db_str())
    .bind(req.participants)
    .bind(req.documents_required)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(p) => {
            if let Err(e) = audit
                .log_project_operation(
                    "create_acceptance_plan",
                    Some(project_id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(p, "创建验收计划成功")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_project_operation(
                    "create_acceptance_plan",
                    Some(project_id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("创建验收计划失败: {}", e);
            ApiResponse::server_error("创建验收计划失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    put,
    path = "/api/pm/acceptance-plans/{id}",
    tag = "acceptance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_plan(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateAcceptancePlanRequest>,
) -> ApiResponse<AcceptancePlan> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(serde_json::json!({"status": req.status}));
    let current = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "pm",
        "SELECT status FROM pm.acceptance_plans WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(status)) => status,
        Ok(None) => return ApiResponse::not_found("验收计划不存在"),
        Err(e) => {
            tracing::error!("查询验收计划状态失败: {}", e);
            return ApiResponse::server_error("更新验收计划失败");
        }
    };
    let current_status = match AcceptancePlanStatus::from_db_str(&current) {
        Some(status) => status,
        None => return ApiResponse::bad_request("存量的验收计划状态非法，请先修正数据"),
    };
    if current_status.is_terminal() {
        return ApiResponse::conflict("已结束的验收计划不允许修改");
    }
    let status = match req.status.as_deref() {
        None => None,
        Some(raw) => match AcceptancePlanStatus::from_db_str(raw) {
            Some(next) if next.can_transition_from(&current) => Some(next.as_db_str().to_string()),
            Some(_) => return ApiResponse::bad_request("当前验收计划状态不允许该流转"),
            None => return ApiResponse::bad_request("无效的验收计划状态"),
        },
    };
    let plan = sqlx::query_as::<_, AcceptancePlan>(only_own_schema_query!(
        "pm",
        "UPDATE pm.acceptance_plans SET
            plan_name = COALESCE($1, plan_name),
            acceptance_type = COALESCE($2, acceptance_type),
            acceptance_criteria = COALESCE($3, acceptance_criteria),
            expected_date = COALESCE($4, expected_date),
            status = COALESCE($5, status),
            participants = COALESCE($6, participants),
            documents_required = COALESCE($7, documents_required),
            updated_at = $8
        WHERE id = $9  RETURNING *"
    ))
    .bind(req.plan_name)
    .bind(req.acceptance_type)
    .bind(req.acceptance_criteria)
    .bind(parse_date_opt(&req.expected_date))
    .bind(status)
    .bind(req.participants)
    .bind(req.documents_required)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(p) => {
            if let Err(e) = audit
                .log_project_operation(
                    "update_acceptance_plan",
                    Some(p.project_id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(p, "更新验收计划成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_project_operation(
                    "update_acceptance_plan",
                    None,
                    user_id,
                    details.clone(),
                    "failed",
                    Some("验收计划不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("验收计划不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_project_operation(
                    "update_acceptance_plan",
                    None,
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("更新验收计划失败: {}", e);
            ApiResponse::server_error("更新验收计划失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/acceptance-plans/{plan_id}/items",
    params(
("plan_id" = String, Path, description = "plan_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn get_plan_items(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(plan_id): Path<Uuid>,
) -> ApiResponse<Vec<AcceptanceItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let items = sqlx::query_as::<_, AcceptanceItem>(
        only_own_schema_query!("pm", "SELECT id, plan_id, item_code, item_name, item_description, required_standard, actual_result, is_passed, created_at FROM pm.acceptance_items WHERE plan_id = $1 ORDER BY created_at"),
    )
    .bind(plan_id)
    .fetch_all(&mut scope)
    .await;

    match items {
        Ok(i) => ApiResponse::success(i, "获取验收项列表成功"),
        Err(e) => {
            tracing::error!("获取验收项失败: {}", e);
            ApiResponse::server_error("获取验收项失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/acceptance-plans/{plan_id}/items",
    tag = "acceptance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_plan_item(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(plan_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAcceptanceItemRequest>,
) -> ApiResponse<AcceptanceItem> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let item = sqlx::query_as::<_, AcceptanceItem>(
        only_own_schema_query!("pm", "INSERT INTO pm.acceptance_items (id, plan_id, item_code, item_name, item_description, required_standard, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *")
    )
    .bind(id)
    .bind(plan_id)
    .bind(req.item_code)
    .bind(&req.item_name)
    .bind(req.item_description)
    .bind(req.required_standard)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(i) => ApiResponse::success(i, "创建验收项成功"),
        Err(e) => {
            tracing::error!("创建验收项失败: {}", e);
            ApiResponse::server_error("创建验收项失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:write"])),
    path = "/acceptance-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn update_plan_item(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAcceptanceItemRequest>,
) -> ApiResponse<AcceptanceItem> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let item = sqlx::query_as::<_, AcceptanceItem>(only_own_schema_query!(
        "pm",
        "UPDATE pm.acceptance_items SET
            actual_result = COALESCE($1, actual_result),
            is_passed = COALESCE($2, is_passed),
            comments = COALESCE($3, comments),
            updated_at = $4
        WHERE id = $5  RETURNING *"
    ))
    .bind(req.actual_result)
    .bind(req.is_passed)
    .bind(req.comments)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(i) => ApiResponse::success(i, "更新验收项成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("验收项不存在"),
        Err(e) => {
            tracing::error!("更新验收项失败: {}", e);
            ApiResponse::server_error("更新验收项失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    delete,
    path = "/api/pm/acceptance-items/{id}",
    tag = "acceptance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_plan_item(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.acceptance_items WHERE id = $1 "
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除验收项成功"),
        Ok(_) => ApiResponse::not_found("验收项不存在"),
        Err(e) => {
            tracing::error!("删除验收项失败: {}", e);
            ApiResponse::server_error("删除验收项失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/acceptance-records",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn get_project_records(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<AcceptanceRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let records = sqlx::query_as::<_, AcceptanceRecord>(
        only_own_schema_query!("pm", "SELECT id, project_id, plan_id, acceptance_date, status, conclusion, score, accepted_by, attendees, findings, recommendations, created_by, created_at, updated_at FROM pm.acceptance_records WHERE project_id = $1 ORDER BY acceptance_date DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match records {
        Ok(r) => ApiResponse::success(r, "获取验收记录列表成功"),
        Err(e) => {
            tracing::error!("获取验收记录失败: {}", e);
            ApiResponse::server_error("获取验收记录失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/acceptance-records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn get_record(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AcceptanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let record = sqlx::query_as::<_, AcceptanceRecord>(
        only_own_schema_query!("pm", "SELECT id, project_id, plan_id, acceptance_date, status, conclusion, score, accepted_by, attendees, findings, recommendations, created_by, created_at, updated_at FROM pm.acceptance_records WHERE id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match record {
        Ok(r) => ApiResponse::success(r, "获取验收记录详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("验收记录不存在"),
        Err(e) => {
            tracing::error!("获取验收记录失败: {}", e);
            ApiResponse::server_error("获取验收记录失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/acceptance-plans/{plan_id}/records",
    params(
("plan_id" = String, Path, description = "plan_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "acceptance"
)]
async fn create_record(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(plan_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAcceptanceRecordRequest>,
) -> ApiResponse<AcceptanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let plan = sqlx::query_as::<_, AcceptancePlan>(
        only_own_schema_query!("pm", "SELECT id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_at, updated_at FROM pm.acceptance_plans WHERE id = $1"),
    )
    .bind(plan_id)
    .fetch_one(&mut scope)
    .await;

    let plan = match plan {
        Ok(p) => p,
        Err(sqlx::Error::RowNotFound) => {
            return ApiResponse::not_found("验收计划不存在");
        }
        Err(e) => {
            tracing::error!("获取验收计划失败: {}", e);
            return ApiResponse::server_error("获取验收计划失败");
        }
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let acceptance_date = parse_date_opt(&Some(req.acceptance_date.clone())).unwrap_or(now);
    let status = match AcceptanceRecordStatus::from_db_str(&req.status) {
        Some(status) => status,
        None => return ApiResponse::bad_request("无效的验收记录状态"),
    };

    let record = sqlx::query_as::<_, AcceptanceRecord>(
        only_own_schema_query!("pm", "INSERT INTO pm.acceptance_records (id, project_id, plan_id, acceptance_date, status, conclusion, score, accepted_by, attendees, findings, recommendations, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *")
    )
    .bind(id)
    .bind(plan.project_id)
    .bind(plan_id)
    .bind(acceptance_date)
    .bind(status.as_db_str())
    .bind(req.conclusion)
    .bind(req.score)
    .bind(req.accepted_by)
    .bind(req.attendees)
    .bind(req.findings)
    .bind(req.recommendations)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match record {
        Ok(r) => ApiResponse::success(r, "创建验收记录成功"),
        Err(e) => {
            tracing::error!("创建验收记录失败: {}", e);
            ApiResponse::server_error("创建验收记录失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    put,
    path = "/api/pm/acceptance-records/{id}",
    tag = "acceptance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_record(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAcceptanceRecordRequest>,
) -> ApiResponse<AcceptanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let current = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "pm",
        "SELECT status FROM pm.acceptance_records WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(status)) => status,
        Ok(None) => return ApiResponse::not_found("验收记录不存在"),
        Err(e) => {
            tracing::error!("查询验收记录状态失败: {}", e);
            return ApiResponse::server_error("更新验收记录失败");
        }
    };
    let current_status = match AcceptanceRecordStatus::from_db_str(&current) {
        Some(status) => status,
        None => return ApiResponse::bad_request("存量的验收记录状态非法，请先修正数据"),
    };
    if current_status.is_terminal() {
        return ApiResponse::conflict("已通过的验收记录不允许修改");
    }
    let status = match req.status.as_deref() {
        None => None,
        Some(raw) => match AcceptanceRecordStatus::from_db_str(raw) {
            Some(next) if next.can_transition_from(&current) => Some(next.as_db_str().to_string()),
            Some(_) => return ApiResponse::bad_request("当前验收记录状态不允许该流转"),
            None => return ApiResponse::bad_request("无效的验收记录状态"),
        },
    };

    let record = sqlx::query_as::<_, AcceptanceRecord>(only_own_schema_query!(
        "pm",
        "UPDATE pm.acceptance_records SET
            status = COALESCE($1, status),
            conclusion = COALESCE($2, conclusion),
            score = COALESCE($3, score),
            attendees = COALESCE($4::jsonb, attendees),
            findings = COALESCE($5::jsonb, findings),
            recommendations = COALESCE($6::jsonb, recommendations),
            updated_at = $7
        WHERE id = $8  RETURNING *"
    ))
    .bind(status)
    .bind(req.conclusion)
    .bind(req.score)
    .bind(req.attendees)
    .bind(req.findings)
    .bind(req.recommendations)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match record {
        Ok(r) => ApiResponse::success(r, "更新验收记录成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("验收记录不存在"),
        Err(e) => {
            tracing::error!("更新验收记录失败: {}", e);
            ApiResponse::server_error("更新验收记录失败")
        }
    }
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&chrono::Utc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"));
        let _ = router;
    }

    #[test]
    fn test_parse_date_opt_none() {
        assert!(parse_date_opt(&None).is_none());
    }

    #[test]
    fn test_parse_date_opt_some_valid() {
        let s = Some("2024-05-01T12:00:00Z".to_string());
        let r = parse_date_opt(&s);
        assert!(r.is_some());
        assert_eq!(r.unwrap().year(), 2024);
        assert_eq!(r.unwrap().month(), 5);
    }

    #[test]
    fn test_parse_date_opt_some_invalid_returns_none() {
        let s = Some("bad-date".to_string());
        assert!(parse_date_opt(&s).is_none());
    }

    #[test]
    fn test_parse_date_opt_some_empty_string_returns_none() {
        let s = Some("".to_string());
        assert!(parse_date_opt(&s).is_none());
    }
}
