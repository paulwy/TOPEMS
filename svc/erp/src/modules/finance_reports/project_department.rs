use axum::{
    extract::{Extension, Query, State},
    Json,
};
use sqlx::Row;

use super::models::{DepartmentFinancialSummary, ProjectFinancialSummary, ReportParams};
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub async fn project_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<ProjectFinancialSummary>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT 
            v.project_id,
            v.project_id as project_name,
            COALESCE(SUM(CASE WHEN s.code LIKE '4%' THEN vi.credit_amount ELSE 0 END), 0.0) as contract_amount,
            COALESCE(SUM(CASE WHEN s.code LIKE '10%' THEN vi.debit_amount ELSE 0 END), 0.0) as received_amount,
            COALESCE(SUM(CASE WHEN s.code LIKE '2%' THEN vi.credit_amount ELSE 0 END), 0.0) as payable_amount,
            COALESCE(SUM(CASE WHEN s.code LIKE '2%' THEN vi.debit_amount ELSE 0 END), 0.0) as paid_amount,
            COALESCE(SUM(vi.credit_amount - vi.debit_amount), 0.0) as profit
        FROM plugin_erp.financial_vouchers v
        LEFT JOIN plugin_erp.voucher_items vi ON vi.voucher_id = v.id
        LEFT JOIN plugin_erp.accounting_subjects s ON vi.subject_code = s.code
        WHERE v.project_id IS NOT NULL
        GROUP BY v.project_id
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let summaries = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                let contract_amount: f64 = row.try_get("contract_amount").unwrap_or(0.0);
                let profit: f64 = row.try_get("profit").unwrap_or(0.0);
                items.push(ProjectFinancialSummary {
                    project_id: row.try_get("project_id").unwrap_or_default(),
                    project_name: row.try_get("project_name").unwrap_or_default(),
                    contract_amount,
                    received_amount: row.try_get("received_amount").unwrap_or(0.0),
                    payable_amount: row.try_get("payable_amount").unwrap_or(0.0),
                    paid_amount: row.try_get("paid_amount").unwrap_or(0.0),
                    profit,
                    margin: if contract_amount > 0.0 {
                        (profit / contract_amount) * 100.0
                    } else {
                        0.0
                    },
                    status: "active".to_string(),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取项目财务汇总失败: {}", e);
            Vec::new()
        }
    };

    Json(ApiResponse::success(summaries, "获取项目财务汇总成功"))
}

pub async fn department_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<DepartmentFinancialSummary>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT 
            d.id as department_id,
            d.name as department_name,
            COALESCE(SUM(b.used_amount), 0.0) as total_expenses,
            COALESCE(SUM(b.total_budget), 0.0) as budget_amount,
            COALESCE(COUNT(e.id), 0) as expense_count
        FROM public.departments d
        LEFT JOIN plugin_erp.budgets b ON d.id = b.department_id
        LEFT JOIN plugin_erp.financial_vouchers e ON d.id = e.maker_id
        GROUP BY d.id, d.name
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let summaries = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                let budget_amount: f64 = row.try_get("budget_amount").unwrap_or(0.0);
                let total_expenses: f64 = row.try_get("total_expenses").unwrap_or(0.0);
                items.push(DepartmentFinancialSummary {
                    department_id: row.try_get("department_id").ok(),
                    department_name: row.try_get("department_name").unwrap_or_default(),
                    total_expenses,
                    budget_amount,
                    budget_usage: if budget_amount > 0.0 {
                        (total_expenses / budget_amount) * 100.0
                    } else {
                        0.0
                    },
                    expense_count: row.try_get("expense_count").unwrap_or(0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取部门财务汇总失败: {}", e);
            Vec::new()
        }
    };

    Json(ApiResponse::success(summaries, "获取部门财务汇总成功"))
}
