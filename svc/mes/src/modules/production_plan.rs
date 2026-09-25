//! Production Plan handlers (migrated from APS)
//! 生产计划管理：创建、查询、更新、删除、提交审批、审批通过/拒绝

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::shared::aps_fsm::production_plan_can_transition;
use crate::AppState;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
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

// ==================== Data Types ====================

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
    pub target_quantity: Option<f64>,
    pub notes: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListPlansQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

// ==================== Database Init ====================

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL,
            plan_name VARCHAR(256) NOT NULL,
            plan_type VARCHAR(32) DEFAULT 'monthly',
            start_date DATE,
            end_date DATE,
            status VARCHAR(32) DEFAULT 'draft',
            product_id UUID,
            product_name VARCHAR(256),
            target_quantity DECIMAL(14,2),
            notes TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, plan_no)
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

// ==================== Helpers ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

fn can_transition(from: &str, to: &str) -> bool {
    production_plan_can_transition(from, to).is_ok()
}

// ==================== Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production-plan:read"])),
    path = "/production-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionPlan"
)]
pub async fn list_plans(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListPlansQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims);

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        SELECT id, plan_no, plan_name, plan_type, start_date, end_date, status,
               product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        FROM production_plans
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
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(plans) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM production_plans
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR plan_no ILIKE $2 OR plan_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "plans": plans,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取生产计划列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产计划列表失败: {}", e);
            Json(ApiResponse::error(500, "获取生产计划列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production-plan:read"])),
    path = "/production-plans/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionPlan"
)]
pub async fn get_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        SELECT id, plan_no, plan_name, plan_type, start_date, end_date, status,
               product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        FROM production_plans
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(plan)) => Json(ApiResponse::success(plan, "获取生产计划成功")),
        Ok(None) => Json(ApiResponse::error(404, "生产计划不存在")),
        Err(e) => {
            tracing::error!("获取生产计划失败: {}", e);
            Json(ApiResponse::error(500, "获取生产计划失败"))
        }
    }
}

pub async fn create_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePlanRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        INSERT INTO production_plans
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
    .bind(req.target_quantity)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划创建成功")),
        Err(e) => {
            tracing::error!("创建生产计划失败: {}", e);
            Json(ApiResponse::error(500, "创建生产计划失败"))
        }
    }
}

pub async fn update_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePlanRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = sqlx::query_as::<_, ProductionPlan>(
        r#"
        SELECT id, plan_no, plan_name, plan_type, start_date, end_date, status,
               product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        FROM production_plans
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "生产计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询生产计划失败: {}", e))),
    };

    let plan_name = req.plan_name.unwrap_or(existing.plan_name);
    let plan_type = req.plan_type.unwrap_or(existing.plan_type);
    let start_date = req.start_date.or(existing.start_date);
    let end_date = req.end_date.or(existing.end_date);
    let status = req.status.unwrap_or(existing.status);
    let product_id = req.product_id.or(existing.product_id);
    let product_name = req.product_name.or(existing.product_name);
    let notes = req.notes.or(existing.notes);
    let target_quantity = req.target_quantity.or(existing.target_quantity);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionPlan>(
        r#"
        UPDATE production_plans SET
            plan_name = $1, plan_type = $2, start_date = $3, end_date = $4,
            status = $5, product_id = $6, product_name = $7, target_quantity = $8,
            notes = $9, updated_at = $10
        WHERE id = $11 AND tenant_id = $12
        RETURNING id, plan_no, plan_name, plan_type, start_date, end_date, status,
                  product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(&plan_name)
    .bind(&plan_type)
    .bind(start_date)
    .bind(end_date)
    .bind(&status)
    .bind(product_id)
    .bind(&product_name)
    .bind(target_quantity)
    .bind(&notes)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划更新成功")),
        Err(e) => {
            tracing::error!("更新生产计划失败: {}", e);
            Json(ApiResponse::error(500, "更新生产计划失败"))
        }
    }
}

pub async fn delete_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query("DELETE FROM production_plans WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "生产计划删除成功",
        )),
        Ok(_) => Json(ApiResponse::error(404, "生产计划不存在")),
        Err(e) => {
            tracing::error!("删除生产计划失败: {}", e);
            Json(ApiResponse::error(500, "删除生产计划失败"))
        }
    }
}

// ==================== State Machine Handlers ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production-plan:write"])),
    path = "/production-plans/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionPlan"
)]
pub async fn submit_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, ProductionPlan>(
        "SELECT * FROM production_plans WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "生产计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "pending_approval") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许提交审批", existing.status),
        ));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, ProductionPlan>(
        "UPDATE production_plans SET status = 'pending_approval', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(now)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划提交成功")),
        Err(e) => {
            tracing::error!("提交生产计划失败: {}", e);
            Json(ApiResponse::error(500, "提交生产计划失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production-plan:write"])),
    path = "/production-plans/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionPlan"
)]
pub async fn approve_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(_req): Json<ApprovalRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, ProductionPlan>(
        "SELECT * FROM production_plans WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "生产计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "approved") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许审批通过", existing.status),
        ));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, ProductionPlan>(
        "UPDATE production_plans SET status = 'approved', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(now)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划审批通过")),
        Err(e) => {
            tracing::error!("审批生产计划失败: {}", e);
            Json(ApiResponse::error(500, "审批生产计划失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production-plan:write"])),
    path = "/production-plans/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionPlan"
)]
pub async fn reject_plan(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(_req): Json<ApprovalRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, ProductionPlan>(
        "SELECT * FROM production_plans WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "生产计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "draft") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许驳回", existing.status),
        ));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, ProductionPlan>(
        "UPDATE production_plans SET status = 'draft', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(now)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "生产计划已驳回")),
        Err(e) => {
            tracing::error!("驳回生产计划失败: {}", e);
            Json(ApiResponse::error(500, "驳回生产计划失败"))
        }
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_plan_type() {
        assert_eq!(default_plan_type(), "monthly");
    }

    #[test]
    fn test_can_transition_valid() {
        assert!(can_transition("draft", "pending_approval"));
        assert!(can_transition("pending_approval", "approved"));
        assert!(can_transition("pending_approval", "draft"));
        assert!(can_transition("approved", "in_progress"));
        assert!(can_transition("in_progress", "completed"));
        assert!(can_transition("draft", "cancelled"));
    }

    #[test]
    fn test_can_transition_invalid() {
        assert!(!can_transition("draft", "approved"));
        assert!(!can_transition("approved", "pending_approval"));
        assert!(!can_transition("completed", "draft"));
        assert!(!can_transition("cancelled", "draft"));
    }

    #[test]
    fn test_requires_approval() {
        assert!(crate::shared::aps_fsm::production_plan_requires_approval(
            "pending_approval",
            "approved"
        ));
        assert!(!crate::shared::aps_fsm::production_plan_requires_approval(
            "draft",
            "pending_approval"
        ));
        assert!(!crate::shared::aps_fsm::production_plan_requires_approval(
            "approved",
            "in_progress"
        ));
    }
}
