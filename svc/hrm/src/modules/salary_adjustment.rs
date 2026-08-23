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
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct SalaryAdjustmentPaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "pagesize")]
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/salary-adjustments",
            get(list_salary_adjustments).post(create_salary_adjustment),
        )
        .route(
            "/salary-adjustments/{id}",
            get(get_salary_adjustment).put(update_salary_adjustment),
        )
        .route(
            "/salary-adjustments/{id}/approve",
            put(approve_salary_adjustment),
        )
        .route(
            "/salary-adjustments/{id}/reject",
            put(reject_salary_adjustment),
        )
}

#[utoipa::path(
    get,
    path = "/salary-adjustments",
    tag = "salary_adjustment",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("pagesize" = Option<i64>, Query, description = "每页大小"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取薪资调整列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
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
            sa.tenant_id,
            sa.employee_id,
            e.name as employee_name,
            d.name as department,
            sa.adjustment_type,
            sa.previous_salary AS old_salary,
            sa.new_salary,
            sa.adjustment_amount,
            sa.reason,
            sa.effective_date::timestamptz AS effective_date,
            sa.status,
            sa.approver_id,
            sa.approval_date::timestamptz AS approved_at,
            sa.rejection_reason,
            sa.created_at,
            sa.updated_at
        FROM hrm.salary_adjustments sa
        LEFT JOIN hrm.employees e ON sa.employee_id = e.id
        LEFT JOIN hrm.departments d ON e.department_id = d.id
        WHERE sa.deleted_at IS NULL
          AND ($1::uuid IS NULL OR sa.employee_id = $1)
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
                SELECT COUNT(*) FROM hrm.salary_adjustments sa
                WHERE sa.deleted_at IS NULL
                  AND ($1::uuid IS NULL OR sa.employee_id = $1)
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

#[utoipa::path(
    get,
    path = "/salary-adjustments/{id}",
    tag = "salary_adjustment",
    params(
        ("id" = Uuid, Path, description = "薪资调整ID")
    ),
    responses(
        (status = 200, description = "获取薪资调整成功", body = SalaryAdjustment),
        (status = 404, description = "薪资调整不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
async fn get_salary_adjustment(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Option<SalaryAdjustment>>> {
    let result = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        SELECT
            sa.id,
            sa.tenant_id,
            sa.employee_id,
            e.name as employee_name,
            d.name as department,
            sa.adjustment_type,
            sa.previous_salary AS old_salary,
            sa.new_salary,
            sa.adjustment_amount,
            sa.reason,
            sa.effective_date::timestamptz AS effective_date,
            sa.status,
            sa.approver_id,
            sa.approval_date::timestamptz AS approved_at,
            sa.rejection_reason,
            sa.created_at,
            sa.updated_at
        FROM hrm.salary_adjustments sa
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

#[utoipa::path(
    post,
    path = "/salary-adjustments",
    tag = "salary_adjustment",
    request_body = CreateSalaryAdjustmentRequest,
    responses(
        (status = 200, description = "薪资调整创建成功", body = SalaryAdjustment),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
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
        INSERT INTO hrm.salary_adjustments (
            id, organization_id, tenant_id, employee_id, adjustment_type,
            previous_salary, new_salary, adjustment_amount, reason, effective_date, status
        ) VALUES (
            $1,
            (SELECT organization_id FROM hrm.employees WHERE id = $2),
            (SELECT tenant_id FROM hrm.employees WHERE id = $2),
            $2, $3, $4, $5, $6, $7, $8, 'pending'
        )
        RETURNING id, tenant_id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, previous_salary AS old_salary, new_salary, adjustment_amount,
                  reason, effective_date::timestamptz AS effective_date, status,
                  NULL as approver_id, NULL as approved_at,
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

#[utoipa::path(
    put,
    path = "/salary-adjustments/{id}",
    tag = "salary_adjustment",
    params(
        ("id" = Uuid, Path, description = "薪资调整ID")
    ),
    request_body = UpdateSalaryAdjustmentRequest,
    responses(
        (status = 200, description = "薪资调整更新成功", body = SalaryAdjustment),
        (status = 400, description = "请求参数错误"),
        (status = 404, description = "薪资调整不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
async fn update_salary_adjustment(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSalaryAdjustmentRequest>,
) -> Json<ApiResponse<Option<SalaryAdjustment>>> {
    let existing = sqlx::query_as::<_, SalaryAdjustment>(
        r#"
        SELECT
            sa.id,
            sa.tenant_id,
            sa.employee_id,
            NULL as employee_name,
            NULL as department,
            sa.adjustment_type,
            sa.previous_salary AS old_salary,
            sa.new_salary,
            sa.adjustment_amount,
            sa.reason,
            sa.effective_date::timestamptz AS effective_date,
            sa.status,
            sa.approver_id,
            sa.approval_date::timestamptz AS approved_at,
            sa.rejection_reason,
            sa.created_at,
            sa.updated_at
        FROM hrm.salary_adjustments sa WHERE sa.id = $1
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
        UPDATE hrm.salary_adjustments
        SET
            adjustment_type = COALESCE($1, adjustment_type),
            previous_salary = COALESCE($2, previous_salary),
            new_salary = COALESCE($3, new_salary),
            adjustment_amount = COALESCE($4, adjustment_amount),
            reason = COALESCE($5, reason),
            effective_date = COALESCE($6, effective_date),
            status = COALESCE($7, status),
            updated_at = NOW()
        WHERE id = $8
        RETURNING id, tenant_id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, previous_salary AS old_salary, new_salary, adjustment_amount,
                  reason, effective_date::timestamptz AS effective_date, status,
                  approver_id, approval_date::timestamptz AS approved_at,
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
        UPDATE hrm.salary_adjustments
        SET
            status = 'approved',
            approver_id = $1,
            approval_date = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, tenant_id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, previous_salary AS old_salary, new_salary, adjustment_amount,
                  reason, effective_date::timestamptz AS effective_date, status,
                  approver_id, approval_date::timestamptz AS approved_at,
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
        UPDATE hrm.salary_adjustments
        SET
            status = 'rejected',
            approver_id = $1,
            rejection_reason = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, tenant_id, employee_id, NULL as employee_name, NULL as department,
                  adjustment_type, previous_salary AS old_salary, new_salary, adjustment_amount,
                  reason, effective_date::timestamptz AS effective_date, status,
                  approver_id, approval_date::timestamptz AS approved_at,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }

    #[test]
    fn test_salary_adjustment_pagination_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: SalaryAdjustmentPaginationParams =
            serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.employee_id.is_none());
        assert!(params.status.is_none());
    }

    #[test]
    fn test_salary_adjustment_pagination_params_deserialize_all_some() {
        let emp = Uuid::new_v4();
        let json = format!(
            r#"{{"page":3,"page_size":25,"employee_id":"{}","status":"approved"}}"#,
            emp
        );
        let params: SalaryAdjustmentPaginationParams =
            serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.page, Some(3));
        assert_eq!(params.page_size, Some(25));
        assert_eq!(params.employee_id, Some(emp));
        assert_eq!(params.status.as_deref(), Some("approved"));
    }

    #[test]
    fn test_salary_adjustment_pagination_params_deserialize_partial() {
        let emp = Uuid::new_v4();
        let json = format!(r#"{{"employee_id":"{}"}}"#, emp);
        let params: SalaryAdjustmentPaginationParams =
            serde_json::from_str(&json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert_eq!(params.employee_id, Some(emp));
        assert!(params.status.is_none());
    }

    #[test]
    fn test_salary_adjustment_pagination_params_deserialize_status_only() {
        let json = r#"{"status":"pending"}"#;
        let params: SalaryAdjustmentPaginationParams =
            serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.employee_id.is_none());
        assert_eq!(params.status.as_deref(), Some("pending"));
    }
}
