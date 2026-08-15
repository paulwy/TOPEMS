use axum::{
    extract::FromRef,
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::middleware::tenant::get_tenant_id;
use crate::modules::ApiState;
use crate::shared::fsm::{production_plan_can_transition, production_plan_requires_approval};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use utoipa::ToSchema;

/// 审批请求体
#[derive(Debug, Deserialize)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProductionPlan {
    pub id: Uuid,
    pub plan_no: String,
    pub plan_name: String,
    pub plan_type: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub status: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub target_quantity: Option<sqlx::types::BigDecimal>,
    pub notes: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreatePlanRequest {
    pub plan_no: String,
    pub plan_name: String,
    #[serde(default = "default_plan_type")]
    pub plan_type: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub target_quantity: Option<f64>,
    pub notes: Option<String>,
}

fn default_plan_type() -> String {
    "monthly".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdatePlanRequest {
    pub plan_name: Option<String>,
    pub plan_type: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub target_quantity: Option<f64>,
    pub notes: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/production-plans", get(list_plans).post(create_plan))
        .route(
            "/production-plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .route("/production-plans/{id}/submit", post(submit_plan))
        .route("/production-plans/{id}/approve", post(approve_plan))
        .route("/production-plans/{id}/reject", post(reject_plan))
}

#[utoipa::path(
    get,
    path = "/api/aps/production-plans",
    responses(
        (status = 200, description = "list_plans OK")
    ),
    tag = "APS - Production Plan"
)]
pub async fn list_plans(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        SELECT id, plan_no, plan_name, plan_type, start_date, end_date, status,
               product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_production_plans
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR plan_no ILIKE $2 OR plan_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(plans) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_aps.aps_production_plans
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR plan_no ILIKE $2 OR plan_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "plans": plans,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取生产计划列表成功"))
        }
        Err(e) => {
            tracing::error!("获取生产计划列表失败: {}", e);
            Json(api_error(500, "获取生产计划列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/aps/production-plans/{id}",
    params(
        ("id" = Uuid, Path, description = "生产计划 ID")
    ),
    responses(
        (status = 200, description = "get_plan OK")
    ),
    tag = "APS - Production Plan"
)]
pub async fn get_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        SELECT id, plan_no, plan_name, plan_type, start_date, end_date, status,
               product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_production_plans
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(plan)) => Json(ApiResponse::success(plan, "获取生产计划成功")),
        Ok(None) => Json(api_error(404, "生产计划不存在")),
        Err(e) => {
            tracing::error!("获取生产计划失败: {}", e);
            Json(api_error(500, "获取生产计划失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/production-plans",
    request_body = CreatePlanRequest,
    responses(
        (status = 200, description = "create_plan OK")
    ),
    tag = "APS - Production Plan"
)]
pub async fn create_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<CreatePlanRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_quantity: Option<sqlx::types::BigDecimal> = req
        .target_quantity
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        INSERT INTO plugin_aps.aps_production_plans
            (id, plan_no, plan_name, plan_type, start_date, end_date, status,
             product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, plan_no, plan_name, plan_type, start_date, end_date, status,
                  product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.plan_no)
    .bind(&req.plan_name)
    .bind(&req.plan_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&target_quantity)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划创建成功")),
        Err(e) => {
            tracing::error!("创建生产计划失败: {}", e);
            Json(api_error(500, "创建生产计划失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/aps/production-plans/{id}",
    request_body = UpdatePlanRequest,
    params(
        ("id" = Uuid, Path, description = "生产计划 ID")
    ),
    responses(
        (status = 200, description = "update_plan OK")
    ),
    tag = "APS - Production Plan"
)]
pub async fn update_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<UpdatePlanRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, ProductionPlan>(
        r#"
        SELECT id, plan_no, plan_name, plan_type, start_date, end_date, status,
               product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_production_plans
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(api_error(404, "生产计划不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产计划失败: {}", e))),
    };

    let plan_name = req.plan_name.unwrap_or(existing.plan_name);
    let plan_type = req.plan_type.unwrap_or(existing.plan_type);
    let start_date = req.start_date.or(existing.start_date);
    let end_date = req.end_date.or(existing.end_date);
    let status = req.status.unwrap_or(existing.status);
    let product_id = req.product_id.or(existing.product_id);
    let product_name = req.product_name.or(existing.product_name);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let target_quantity: Option<sqlx::types::BigDecimal> = match req.target_quantity {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.target_quantity,
    };

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        UPDATE plugin_aps.aps_production_plans SET
            plan_name = $2, plan_type = $3, start_date = $4, end_date = $5, status = $6,
            product_id = $7, product_name = $8, target_quantity = $9, notes = $10, updated_at = $11
        WHERE id = $1 AND tenant_id = $12
        RETURNING id, plan_no, plan_name, plan_type, start_date, end_date, status,
                  product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&plan_name)
    .bind(&plan_type)
    .bind(start_date)
    .bind(end_date)
    .bind(&status)
    .bind(product_id)
    .bind(&product_name)
    .bind(&target_quantity)
    .bind(&notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划更新成功")),
        Err(e) => {
            tracing::error!("更新生产计划失败: {}", e);
            Json(api_error(500, "更新生产计划失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/aps/production-plans/{id}",
    params(
        ("id" = Uuid, Path, description = "生产计划 ID")
    ),
    responses(
        (status = 200, description = "delete_plan OK")
    ),
    tag = "APS - Production Plan"
)]
pub async fn delete_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("DELETE FROM plugin_aps.aps_production_plans WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "生产计划删除成功"))
        }
        Ok(_) => Json(api_error(404, "生产计划不存在")),
        Err(e) => {
            tracing::error!("删除生产计划失败: {}", e);
            Json(api_error(500, "删除生产计划失败"))
        }
    }
}

/// APV-1: 提交审批 (draft → pending_approval)
pub async fn submit_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "pending_approval";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_production_plans WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "生产计划不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产计划失败: {}", e))),
    };

    if production_plan_requires_approval(&current_status, target_status) {
        return Json(api_error(400, "当前状态需要审批流程，请使用审批接口"));
    }
    if let Err(e) = production_plan_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许提交审批: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        UPDATE plugin_aps.aps_production_plans SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, plan_no, plan_name, plan_type, start_date, end_date, status,
                  product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => {
            tracing::info!(
                "生产计划 {} 提交审批: {} -> {} (操作人: {})",
                id,
                current_status,
                target_status,
                req.operator
            );
            Json(ApiResponse::success(plan, "生产计划已提交审批"))
        }
        Err(e) => {
            tracing::error!("提交生产计划审批失败: {}", e);
            Json(api_error(500, "提交生产计划审批失败"))
        }
    }
}

/// APV-1: 审批通过 (pending_approval → approved)
pub async fn approve_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "approved";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_production_plans WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "生产计划不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产计划失败: {}", e))),
    };

    if !production_plan_requires_approval(&current_status, target_status) {
        return Json(api_error(400, "当前状态不需要审批"));
    }
    if let Err(e) = production_plan_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许审批通过: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        UPDATE plugin_aps.aps_production_plans SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, plan_no, plan_name, plan_type, start_date, end_date, status,
                  product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => {
            tracing::info!(
                "生产计划 {} 审批通过: {} -> {} (操作人: {}, 备注: {:?})",
                id,
                current_status,
                target_status,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(plan, "生产计划审批通过"))
        }
        Err(e) => {
            tracing::error!("审批生产计划失败: {}", e);
            Json(api_error(500, "审批生产计划失败"))
        }
    }
}

/// APV-1: 审批驳回 (pending_approval → draft)
pub async fn reject_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "draft";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_production_plans WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "生产计划不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产计划失败: {}", e))),
    };

    if let Err(e) = production_plan_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许驳回: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        UPDATE plugin_aps.aps_production_plans SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, plan_no, plan_name, plan_type, start_date, end_date, status,
                  product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => {
            tracing::info!(
                "生产计划 {} 审批驳回: {} -> {} (操作人: {}, 备注: {:?})",
                id,
                current_status,
                target_status,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(plan, "生产计划已驳回"))
        }
        Err(e) => {
            tracing::error!("驳回生产计划失败: {}", e);
            Json(api_error(500, "驳回生产计划失败"))
        }
    }
}

#[cfg(test)]
mod serde_tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn create_plan_request_roundtrip_full() {
        roundtrip(&CreatePlanRequest {
            plan_no: "PLAN-2024-001".into(),
            plan_name: "Monthly Plan".into(),
            plan_type: "monthly".into(),
            start_date: Some(NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            end_date: Some(NaiveDate::from_ymd_opt(2024, 1, 31).unwrap()),
            product_id: Some(Uuid::new_v4()),
            product_name: Some("Widget A".into()),
            target_quantity: Some(1000.0),
            notes: Some("Test note".into()),
        });
    }

    #[test]
    fn create_plan_request_roundtrip_minimal() {
        roundtrip(&CreatePlanRequest {
            plan_no: "P1".into(),
            plan_name: "N".into(),
            plan_type: "weekly".into(),
            start_date: None,
            end_date: None,
            product_id: None,
            product_name: None,
            target_quantity: None,
            notes: None,
        });
    }
}
