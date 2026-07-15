use axum::{
    extract::{Path, Query, State},
    routing::{get, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    ApproveSalaryAdjustmentRequest, CreateSalaryAdjustmentRequest, RejectSalaryAdjustmentRequest,
    SalaryAdjustment, UpdateSalaryAdjustmentRequest,
};
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct SalaryAdjustmentPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/core/hrm/salary-adjustments",
            get(list_salary_adjustments).post(create_salary_adjustment),
        )
        .route(
            "/api/core/hrm/salary-adjustments/{id}",
            get(get_salary_adjustment).put(update_salary_adjustment),
        )
        .route(
            "/api/core/hrm/salary-adjustments/{id}/approve",
            put(approve_salary_adjustment),
        )
        .route(
            "/api/core/hrm/salary-adjustments/{id}/reject",
            put(reject_salary_adjustment),
        )
}

async fn list_salary_adjustments(
    State(state): State<ApiState>,
    Query(params): Query<SalaryAdjustmentPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        SELECT 
            sa.id, 
            sa.employee_id, 
            e.name as employee_name, 
            d.name as department,
            sa.adjustment_type, 
            sa.old_salary, 
            sa.new_salary, 
            sa.adjustment_amount,
            sa.reason, 
            sa.effective_date, 
            sa.status, 
            sa.approver_id, 
            sa.approved_at, 
            sa.rejection_reason,
            sa.created_at, 
            sa.updated_at
        FROM plugin_hrm.salary_adjustments sa
        LEFT JOIN hrm.employees e ON sa.employee_id = e.id
        LEFT JOIN hrm.departments d ON e.department_id = d.id
        WHERE ($1::uuid IS NULL OR sa.employee_id = $1)
          AND ($2::text IS NULL OR sa.status = $2)
        ORDER BY sa.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(params.employee_id)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.salary_adjustments sa
                WHERE ($1::uuid IS NULL OR sa.employee_id = $1)
                  AND ($2::text IS NULL OR sa.status = $2)
                "#,
            )
            .bind(params.employee_id)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取薪资调整列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取薪资调整列表失败: {}", e);
            Json(api_error(500, "获取薪资调整列表失败"))
        }
    }
}

async fn get_salary_adjustment(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Option<SalaryAdjustment>>> {
    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        SELECT 
            sa.id, 
            sa.employee_id, 
            e.name as employee_name, 
            d.name as department,
            sa.adjustment_type, 
            sa.old_salary, 
            sa.new_salary, 
            sa.adjustment_amount,
            sa.reason, 
            sa.effective_date, 
            sa.status, 
            sa.approver_id, 
            sa.approved_at, 
            sa.rejection_reason,
            sa.created_at, 
            sa.updated_at
        FROM plugin_hrm.salary_adjustments sa
        LEFT JOIN hrm.employees e ON sa.employee_id = e.id
        LEFT JOIN hrm.departments d ON e.department_id = d.id
        WHERE sa.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(sa) => Json(ApiResponse::success(sa, "获取薪资调整成功")),
        Err(e) => {
            tracing::error!("获取薪资调整失败: {}", e);
            Json(api_error(500, "获取薪资调整失败"))
        }
    }
}

async fn create_salary_adjustment(
    State(state): State<ApiState>,
    Json(req): Json<CreateSalaryAdjustmentRequest>,
) -> Json<ApiResponse<SalaryAdjustment>> {
    let adjustment_amount = match (&req.old_salary, &req.new_salary) {
        (Some(old), Some(new)) => Some(new.clone() - old.clone()),
        _ => None,
    };

    let id = Uuid::new_v4();

    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        INSERT INTO plugin_hrm.salary_adjustments (
            id, employee_id, adjustment_type, old_salary, new_salary, adjustment_amount, reason, effective_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, old_salary, new_salary, adjustment_amount,
                  reason, effective_date, status, NULL as approver_id, NULL as approved_at,
                  NULL as rejection_reason, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.employee_id)
    .bind(req.adjustment_type)
    .bind(req.old_salary)
    .bind(req.new_salary)
    .bind(adjustment_amount)
    .bind(req.reason)
    .bind(req.effective_date)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(sa) => Json(ApiResponse::success(sa, "创建薪资调整成功")),
        Err(e) => {
            tracing::error!("创建薪资调整失败: {}", e);
            Json(api_error(500, "创建薪资调整失败"))
        }
    }
}

async fn update_salary_adjustment(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSalaryAdjustmentRequest>,
) -> Json<ApiResponse<Option<SalaryAdjustment>>> {
    let existing = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        SELECT 
            sa.id, 
            sa.employee_id, 
            NULL as employee_name, 
            NULL as department,
            sa.adjustment_type, 
            sa.old_salary, 
            sa.new_salary, 
            sa.adjustment_amount,
            sa.reason, 
            sa.effective_date, 
            sa.status, 
            sa.approver_id, 
            sa.approved_at, 
            sa.rejection_reason,
            sa.created_at, 
            sa.updated_at
        FROM plugin_hrm.salary_adjustments sa WHERE sa.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(sa)) => sa,
        Ok(None) => return Json(ApiResponse::success(None, "薪资调整不存在")),
        Err(e) => {
            tracing::error!("获取薪资调整失败: {}", e);
            return Json(api_error(500, "获取薪资调整失败"));
        }
    };

    let old_salary = req.old_salary.or(existing.old_salary);
    let new_salary = req.new_salary.or(existing.new_salary);
    let adjustment_amount = match (&old_salary, &new_salary) {
        (Some(old), Some(new)) => Some(new.clone() - old.clone()),
        _ => None,
    };

    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        UPDATE plugin_hrm.salary_adjustments
        SET 
            adjustment_type = COALESCE($1, adjustment_type),
            old_salary = COALESCE($2, old_salary),
            new_salary = COALESCE($3, new_salary),
            adjustment_amount = COALESCE($4, adjustment_amount),
            reason = COALESCE($5, reason),
            effective_date = COALESCE($6, effective_date),
            status = COALESCE($7, status),
            updated_at = NOW()
        WHERE id = $8
        RETURNING id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, old_salary, new_salary, adjustment_amount,
                  reason, effective_date, status, approver_id, approved_at,
                  rejection_reason, created_at, updated_at
        "#,
    )
    .bind(req.adjustment_type)
    .bind(old_salary)
    .bind(new_salary)
    .bind(adjustment_amount)
    .bind(req.reason)
    .bind(req.effective_date)
    .bind(req.status)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(sa) => Json(ApiResponse::success(sa, "更新薪资调整成功")),
        Err(e) => {
            tracing::error!("更新薪资调整失败: {}", e);
            Json(api_error(500, "更新薪资调整失败"))
        }
    }
}

async fn approve_salary_adjustment(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveSalaryAdjustmentRequest>,
) -> Json<ApiResponse<Option<SalaryAdjustment>>> {
    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        UPDATE plugin_hrm.salary_adjustments
        SET 
            status = 'approved',
            approver_id = $1,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, old_salary, new_salary, adjustment_amount,
                  reason, effective_date, status, approver_id, approved_at,
                  rejection_reason, created_at, updated_at
        "#,
    )
    .bind(req.approver_id)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(sa) => Json(ApiResponse::success(sa, "批准薪资调整成功")),
        Err(e) => {
            tracing::error!("批准薪资调整失败: {}", e);
            Json(api_error(500, "批准薪资调整失败"))
        }
    }
}

async fn reject_salary_adjustment(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<RejectSalaryAdjustmentRequest>,
) -> Json<ApiResponse<Option<SalaryAdjustment>>> {
    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        UPDATE plugin_hrm.salary_adjustments
        SET 
            status = 'rejected',
            approver_id = $1,
            rejection_reason = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, old_salary, new_salary, adjustment_amount,
                  reason, effective_date, status, approver_id, approved_at,
                  rejection_reason, created_at, updated_at
        "#,
    )
    .bind(req.approver_id)
    .bind(req.reason)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(sa) => Json(ApiResponse::success(sa, "拒绝薪资调整成功")),
        Err(e) => {
            tracing::error!("拒绝薪资调整失败: {}", e);
            Json(api_error(500, "拒绝薪资调整失败"))
        }
    }
}
