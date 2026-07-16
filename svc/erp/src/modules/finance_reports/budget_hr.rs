use axum::{
    extract::{Extension, Query, State},
    Json,
};
use chrono::{Datelike, Utc};
use sqlx::Row;

use super::models::{BudgetSummary, EmployeeSummary, ReportParams};
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub async fn budget_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<BudgetSummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let fiscal_year = params
        .period
        .unwrap_or_else(|| Utc::now().year().to_string());

    let result = sqlx::query(
        r#"
        SELECT d.name as department_name, 
               COALESCE(SUM(b.total_budget), 0.0) as total_budget, 
               COALESCE(SUM(b.used_amount), 0.0) as used_amount
        FROM public.departments d
        LEFT JOIN plugin_erp.budgets b ON d.id = b.department_id
        WHERE b.fiscal_year = $1 OR b.fiscal_year IS NULL
        GROUP BY d.id, d.name
        ORDER BY d.name
        "#,
    )
    .bind(&fiscal_year)
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(BudgetSummary {
                    department_name: row.try_get("department_name").ok(),
                    total_budget: row.try_get("total_budget").unwrap_or(0.0),
                    used_amount: row.try_get("used_amount").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取预算汇总报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取预算汇总报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取预算汇总报表成功"))
}

pub async fn employee_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<EmployeeSummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT e.department_id, d.name as department_name, 
               COUNT(*) as employee_count, 
               AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date))) as avg_tenure
        FROM public.employees e
        LEFT JOIN public.departments d ON e.department_id = d.id
        WHERE e.status = 'active'
        GROUP BY e.department_id, d.name
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(EmployeeSummary {
                    department_name: row.try_get("department_name").ok(),
                    employee_count: row.try_get("employee_count").unwrap_or(0),
                    avg_tenure: row.try_get("avg_tenure").ok(),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取员工汇总报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取员工汇总报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取员工汇总报表成功"))
}
