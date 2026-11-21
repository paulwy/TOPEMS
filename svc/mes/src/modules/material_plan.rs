// MES · 材料计划管理模块
//
// 第一批-② 前后端对应性修复：前端 materialPlanApi（apps/web/src/api/aps/materialPlan.ts）
// 契约 8 方法（list/get/create/update/delete/submit/requisition/cancel），
// 经 /api/aps/material-plans（aps_compat 兜底重定向）→ /api/mes/material-plans。
// 表：mes.material_plans（迁移 20260908000003）
//
// 状态机（前端 types.ts MaterialPlanStatus 对齐）：
//   pending → requisitioned → sourced → satisfied / shortage，cancelled 为终态

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::{get_tenant_id_from_claims, resolve_create_tenant};
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::modules::material_plan_status::MaterialPlanStatus;
use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/material-plans",
            get(list_material_plans).post(create_material_plan),
        )
        .route(
            "/material-plans/{id}",
            get(get_material_plan)
                .put(update_material_plan)
                .delete(delete_material_plan),
        )
        .route("/material-plans/{id}/submit", post(submit_material_plan))
        .route(
            "/material-plans/{id}/requisition",
            post(requisition_material_plan),
        )
        .route("/material-plans/{id}/cancel", post(cancel_material_plan))
}

#[derive(Debug, Deserialize)]
pub struct ListMaterialPlansQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub plan_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaterialPlanRequest {
    pub plan_no: String,
    pub plan_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<String>,
    pub supply_type: Option<String>,
    pub status: Option<String>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterialPlanRequest {
    pub plan_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<String>,
    pub supply_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitMaterialPlanRequest {
    pub comment: Option<String>,
}

fn internal_error(msg: &str) -> (StatusCode, ApiResponse<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        ApiResponse::server_error(msg),
    )
}

fn row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "plan_no": row.get::<String, _>("plan_no"),
        "plan_id": row.get::<Option<Uuid>, _>("plan_id").map(|v| v.to_string()),
        "material_id": row.get::<Option<Uuid>, _>("material_id").map(|v| v.to_string()),
        "material_code": row.get::<Option<String>, _>("material_code"),
        "material_name": row.get::<Option<String>, _>("material_name"),
        "required_quantity": row.get::<Option<f64>, _>("required_quantity"),
        "available_quantity": row.get::<Option<f64>, _>("available_quantity"),
        "shortfall_quantity": row.get::<Option<f64>, _>("shortfall_quantity"),
        "required_date": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("required_date"),
        "supply_type": row.get::<String, _>("supply_type"),
        "status": row.get::<String, _>("status"),
        "tenant_id": row.get::<Option<String>, _>("tenant_id"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
        "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn list_material_plans(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListMaterialPlansQuery>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id_from_claims(&claims);

    let status = match params.status.as_deref() {
        None => None,
        Some(raw) => match MaterialPlanStatus::from_db_str(raw) {
            Some(v) => Some(v.as_db_str().to_string()),
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的材料计划状态"),
                ))
            }
        },
    };
    let search = params.search.clone();
    let plan_id = params.plan_id;

    // 租户作用域读：material_plans 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Err(internal_error("数据库事务上下文缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return Err(internal_error("查询材料计划失败"));
        }
    };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM mes.material_plans \
         WHERE status IN ('pending','requisitioned','sourced','satisfied','shortage','cancelled') \
           AND ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR plan_no ILIKE '%' || $2 || '%' \
             OR material_code ILIKE '%' || $2 || '%' \
             OR material_name ILIKE '%' || $2 || '%') \
           AND ($3::uuid IS NULL OR plan_id = $3) \
           AND tenant_id = $4::uuid",
    )
    .bind(&status)
    .bind(&search)
    .bind(plan_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    .unwrap_or(0);

    let rows = sqlx::query(
        "SELECT id, plan_no, plan_id, material_id, material_code, material_name, \
                required_quantity, available_quantity, shortfall_quantity, required_date, \
                supply_type, status, tenant_id::text, created_at, updated_at \
         FROM mes.material_plans \
         WHERE status IN ('pending','requisitioned','sourced','satisfied','shortage','cancelled') \
           AND ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR plan_no ILIKE '%' || $2 || '%' \
             OR material_code ILIKE '%' || $2 || '%' \
             OR material_name ILIKE '%' || $2 || '%') \
           AND ($3::uuid IS NULL OR plan_id = $3) \
           AND tenant_id = $4::uuid \
         ORDER BY created_at DESC LIMIT $5 OFFSET $6",
    )
    .bind(&status)
    .bind(&search)
    .bind(plan_id)
    .bind(tenant_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows.iter().map(row_to_json).collect();
            Ok(ApiResponse::success(
                serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
                "获取材料计划列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询材料计划失败: {}", e);
            Err(internal_error("查询材料计划失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-plans/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn get_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Err(internal_error("数据库事务上下文缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return Err(internal_error("查询材料计划失败"));
        }
    };

    let row = sqlx::query(
        "SELECT id, plan_no, plan_id, material_id, material_code, material_name, \
                required_quantity, available_quantity, shortfall_quantity, required_date, \
                supply_type, status, tenant_id::text, created_at, updated_at \
         FROM mes.material_plans WHERE id = $1 \
           AND status IN ('pending','requisitioned','sourced','satisfied','shortage','cancelled') \
           AND tenant_id = $2::uuid",
    )
    .bind(id)
    .bind(get_tenant_id_from_claims(&claims))
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(row)) => Ok(ApiResponse::success(row_to_json(&row), "获取材料计划成功")),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            ApiResponse::not_found("材料计划不存在"),
        )),
        Err(e) => {
            tracing::error!("查询材料计划失败: {}", e);
            Err(internal_error("查询材料计划失败"))
        }
    }
}

pub async fn create_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialPlanRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    // 租户来源统一为 Claims（超管/服务身份落公共行 NULL），不再接受请求体指定租户
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => {
            let status = StatusCode::from_u16(code).unwrap_or(StatusCode::BAD_REQUEST);
            return Err((status, ApiResponse::bad_request(&msg)));
        }
    };

    let required_qty = req.required_quantity.unwrap_or(0.0);
    let available_qty = req.available_quantity.unwrap_or(0.0);
    let shortfall = (required_qty - available_qty).max(0.0);
    let supply_type = req.supply_type.unwrap_or_else(|| "purchase".to_string());
    let status = match req.status.as_deref() {
        None => MaterialPlanStatus::DEFAULT.as_db_str().to_string(),
        Some(raw) => match MaterialPlanStatus::from_db_str(raw) {
            Some(v) => v.as_db_str().to_string(),
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的材料计划状态"),
                ))
            }
        },
    };
    let required_date = parse_datetime(&req.required_date);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Err(internal_error("数据库事务上下文缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立租户写作用域失败: {}", e);
            return Err(internal_error("创建材料计划失败"));
        }
    };

    let row = sqlx::query(
        "INSERT INTO mes.material_plans \
         (plan_no, plan_id, material_id, material_code, material_name, required_quantity, \
          available_quantity, shortfall_quantity, required_date, supply_type, status, tenant_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) \
         RETURNING id, plan_no, plan_id, material_id, material_code, material_name, \
                   required_quantity, available_quantity, shortfall_quantity, required_date, \
                   supply_type, status, tenant_id::text, created_at, updated_at",
    )
    .bind(&req.plan_no)
    .bind(req.plan_id)
    .bind(req.material_id)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(required_qty)
    .bind(available_qty)
    .bind(shortfall)
    .bind(required_date)
    .bind(&supply_type)
    .bind(&status)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(row) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交材料计划事务失败: {}", e);
                return Err(internal_error("创建材料计划失败"));
            }
            Ok(ApiResponse::success(row_to_json(&row), "创建材料计划成功"))
        }
        Err(e) => {
            tracing::error!("创建材料计划失败: {}", e);
            Err(internal_error("创建材料计划失败"))
        }
    }
}

pub async fn update_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialPlanRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    // 写操作必须携带有效租户：缺失/零租户返回 400。
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return Err((StatusCode::BAD_REQUEST, resp)),
    };
    let status = match req.status.as_deref() {
        None => None,
        Some(raw) => match MaterialPlanStatus::from_db_str(raw) {
            Some(v) => Some(v.as_db_str().to_string()),
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的材料计划状态"),
                ))
            }
        },
    };
    let required_date = parse_datetime(&req.required_date);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Err(internal_error("数据库事务上下文缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return Err(internal_error("更新材料计划失败"));
        }
    };

    let row = sqlx::query(
        "UPDATE mes.material_plans SET \
         plan_id = COALESCE($2, plan_id), \
         material_id = COALESCE($3, material_id), \
         material_code = COALESCE($4, material_code), \
         material_name = COALESCE($5, material_name), \
         required_quantity = COALESCE($6, required_quantity), \
         available_quantity = COALESCE($7, available_quantity), \
         shortfall_quantity = GREATEST(COALESCE($6, required_quantity) - COALESCE($7, available_quantity), 0), \
         required_date = COALESCE($8, required_date), \
         supply_type = COALESCE($9, supply_type), \
         status = COALESCE($10, status), \
         updated_at = NOW() \
         WHERE id = $1 \
           AND status IN ('pending','requisitioned','sourced','satisfied','shortage','cancelled') \
           AND tenant_id = $11::uuid \
         RETURNING id, plan_no, plan_id, material_id, material_code, material_name, \
                   required_quantity, available_quantity, shortfall_quantity, required_date, \
                   supply_type, status, tenant_id::text, created_at, updated_at",
    )
    .bind(id)
    .bind(req.plan_id)
    .bind(req.material_id)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(req.required_quantity)
    .bind(req.available_quantity)
    .bind(required_date)
    .bind(&req.supply_type)
    .bind(&status)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(row)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交材料计划事务失败: {}", e);
                return Err(internal_error("更新材料计划失败"));
            }
            Ok(ApiResponse::success(row_to_json(&row), "更新材料计划成功"))
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            ApiResponse::not_found("材料计划不存在"),
        )),
        Err(e) => {
            tracing::error!("更新材料计划失败: {}", e);
            Err(internal_error("更新材料计划失败"))
        }
    }
}

pub async fn delete_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    // 写操作必须携带有效租户：缺失/零租户返回 400。
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return Err((StatusCode::BAD_REQUEST, resp)),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Err(internal_error("数据库事务上下文缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return Err(internal_error("删除材料计划失败"));
        }
    };

    let result = sqlx::query(
        "DELETE FROM mes.material_plans WHERE id = $1 \
           AND tenant_id = $2::uuid",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Err((
                    StatusCode::NOT_FOUND,
                    ApiResponse::not_found("材料计划不存在"),
                ));
            }
            if let Err(e) = scope.commit().await {
                tracing::error!("提交材料计划事务失败: {}", e);
                return Err(internal_error("删除材料计划失败"));
            }
            Ok(ApiResponse::success(
                serde_json::json!({ "deleted": true, "id": id.to_string() }),
                "删除材料计划成功",
            ))
        }
        Err(e) => {
            tracing::error!("删除材料计划失败: {}", e);
            Err(internal_error("删除材料计划失败"))
        }
    }
}

enum TransitionOutcome {
    Updated(sqlx::postgres::PgRow),
    NotFound,
    InvalidState,
}

async fn transition_status(
    state: &AppState,
    id: Uuid,
    new_status: &str,
    allowed_from: &[&str],
    tenant_id: Uuid,
    txn_arc: &RlsTxnCell,
) -> Result<TransitionOutcome, sqlx::Error> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Err(sqlx::Error::Protocol("RLS 事务上下文缺失".into()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = state.db.scope_with(txn).await?;
    let row = sqlx::query(
        "UPDATE mes.material_plans SET status = $2, updated_at = NOW() \
         WHERE id = $1 \
           AND status = ANY($4::text[]) \
           AND tenant_id = $3::uuid \
         RETURNING id, plan_no, plan_id, material_id, material_code, material_name, \
                   required_quantity, available_quantity, shortfall_quantity, required_date, \
                   supply_type, status, tenant_id::text, created_at, updated_at",
    )
    .bind(id)
    .bind(new_status)
    .bind(allowed_from)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await?;
    let outcome = match row {
        Some(row) => TransitionOutcome::Updated(row),
        None => {
            let exists: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM mes.material_plans WHERE id = $1 AND tenant_id = $2::uuid)",
            )
            .bind(id)
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await?;
            if exists {
                TransitionOutcome::InvalidState
            } else {
                TransitionOutcome::NotFound
            }
        }
    };
    scope.commit().await?;
    Ok(outcome)
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:material:write"])),
    path = "/material-plans/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn submit_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let row = transition_status(
        &state,
        id,
        "requisitioned",
        MaterialPlanStatus::submit_from(),
        get_tenant_id_from_claims(&claims),
        &txn_arc,
    )
    .await;
    match row {
        Ok(TransitionOutcome::Updated(row)) => {
            Ok(ApiResponse::success(row_to_json(&row), "材料计划已提交"))
        }
        Ok(TransitionOutcome::NotFound) => Err((
            StatusCode::NOT_FOUND,
            ApiResponse::not_found("材料计划不存在"),
        )),
        Ok(TransitionOutcome::InvalidState) => Err((
            StatusCode::CONFLICT,
            ApiResponse::conflict("材料计划当前状态不允许提交"),
        )),
        Err(e) => {
            tracing::error!("提交材料计划失败: {}", e);
            Err(internal_error("提交材料计划失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:material:write"])),
    path = "/material-plans/{id}/requisition",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn requisition_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let row = transition_status(
        &state,
        id,
        "sourced",
        MaterialPlanStatus::requisition_from(),
        get_tenant_id_from_claims(&claims),
        &txn_arc,
    )
    .await;
    match row {
        Ok(TransitionOutcome::Updated(row)) => {
            Ok(ApiResponse::success(row_to_json(&row), "材料计划已请购"))
        }
        Ok(TransitionOutcome::NotFound) => Err((
            StatusCode::NOT_FOUND,
            ApiResponse::not_found("材料计划不存在"),
        )),
        Ok(TransitionOutcome::InvalidState) => Err((
            StatusCode::CONFLICT,
            ApiResponse::conflict("材料计划当前状态不允许请购"),
        )),
        Err(e) => {
            tracing::error!("请购材料计划失败: {}", e);
            Err(internal_error("请购材料计划失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:material:write"])),
    path = "/material-plans/{id}/cancel",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn cancel_material_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let row = transition_status(
        &state,
        id,
        "cancelled",
        MaterialPlanStatus::cancel_from(),
        get_tenant_id_from_claims(&claims),
        &txn_arc,
    )
    .await;
    match row {
        Ok(TransitionOutcome::Updated(row)) => {
            Ok(ApiResponse::success(row_to_json(&row), "材料计划已取消"))
        }
        Ok(TransitionOutcome::NotFound) => Err((
            StatusCode::NOT_FOUND,
            ApiResponse::not_found("材料计划不存在"),
        )),
        Ok(TransitionOutcome::InvalidState) => Err((
            StatusCode::CONFLICT,
            ApiResponse::conflict("材料计划当前状态不允许取消"),
        )),
        Err(e) => {
            tracing::error!("取消材料计划失败: {}", e);
            Err(internal_error("取消材料计划失败"))
        }
    }
}

/// 解析 ISO8601 字符串为 TIMESTAMPTZ 绑定值
fn parse_datetime(s: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    s.as_deref().and_then(|v| {
        chrono::DateTime::parse_from_rfc3339(v)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    })
}
