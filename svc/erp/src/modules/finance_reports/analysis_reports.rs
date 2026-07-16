use axum::{
    extract::{Extension, Query, State},
    Json,
};
use chrono::{Datelike, Utc};
use sqlx::Row;

use super::models::{
    BusinessOverview, CashFlowAnalysis, CategoryExpense, CategorySummary,
    DepartmentExpense, ExpenseAnalysis, FinancialOverview, KeyRatios,
    MonthlyTrendItem, ProfitAnalysis, ReportParams,
};
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub async fn category_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<CategorySummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT s.category, 
               COALESCE(SUM(CASE WHEN vi.debit_amount > 0 THEN vi.debit_amount ELSE -vi.credit_amount END), 0.0) as amount
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
          AND s.status = 'active'
        GROUP BY s.category
        ORDER BY s.category
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(CategorySummary {
                    category: row.try_get("category").unwrap_or_default(),
                    amount: row.try_get("amount").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取科目汇总报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取科目汇总报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取科目汇总报表成功"))
}

pub async fn monthly_trend(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<MonthlyTrendItem>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let limit = params
        .project_id
        .as_ref()
        .and_then(|p| p.parse::<i64>().ok())
        .unwrap_or(12);

    let result = sqlx::query(
        r#"
        SELECT 
            v.period as month,
            COALESCE(SUM(CASE WHEN s.code LIKE '5%' AND vi.credit_amount > 0 THEN vi.credit_amount ELSE 0 END), 0.0) as revenue,
            COALESCE(SUM(CASE WHEN s.code LIKE '5%' AND vi.debit_amount > 0 THEN vi.debit_amount ELSE 0 END), 0.0) as expense,
            COALESCE(SUM(CASE WHEN s.code LIKE '5%' AND vi.credit_amount > 0 THEN vi.credit_amount ELSE 0 END) - SUM(CASE WHEN s.code LIKE '5%' AND vi.debit_amount > 0 THEN vi.debit_amount ELSE 0 END), 0.0) as profit,
            COUNT(DISTINCT v.id) as voucher_count
        FROM plugin_erp.financial_vouchers v
        LEFT JOIN plugin_erp.voucher_items vi ON vi.voucher_id = v.id
        LEFT JOIN plugin_erp.accounting_subjects s ON vi.subject_code = s.code
        WHERE v.status = 'posted'
          AND s.code LIKE '5%'
        GROUP BY v.period
        ORDER BY v.period DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(&state.db)
    .await;

    let trend = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(MonthlyTrendItem {
                    month: row.try_get("month").unwrap_or_default(),
                    revenue: row.try_get("revenue").unwrap_or(0.0),
                    expense: row.try_get("expense").unwrap_or(0.0),
                    profit: row.try_get("profit").unwrap_or(0.0),
                    voucher_count: row.try_get("voucher_count").unwrap_or(0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取月度趋势报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取月度趋势报表失败"));
        }
    };

    Json(ApiResponse::success(trend, "获取月度趋势报表成功"))
}

pub async fn business_overview(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<BusinessOverview>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT 
            SUM(CASE WHEN s.code LIKE '1%' THEN COALESCE(SUM(vi.debit_amount - vi.credit_amount), 0.0) ELSE 0.0 END) as total_assets,
            SUM(CASE WHEN s.code LIKE '2%' THEN COALESCE(SUM(vi.debit_amount - vi.credit_amount), 0.0) ELSE 0.0 END) as total_liabilities,
            SUM(CASE WHEN s.code LIKE '3%' THEN COALESCE(SUM(vi.debit_amount - vi.credit_amount), 0.0) ELSE 0.0 END) as total_equity,
            SUM(CASE WHEN s.code LIKE '4%' THEN COALESCE(vi.credit_amount, 0.0) ELSE 0.0 END) as total_revenue,
            SUM(CASE WHEN s.code LIKE '5%' THEN COALESCE(vi.debit_amount, 0.0) ELSE 0.0 END) as total_expenses
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
        GROUP BY s.code
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let (total_assets, total_liabilities, total_equity, total_revenue, total_expenses) =
        match result {
            Ok(rows) => {
                let mut assets = 0.0;
                let mut liabilities = 0.0;
                let mut equity = 0.0;
                let mut revenue = 0.0;
                let mut expenses = 0.0;
                for row in rows {
                    assets += row.try_get("total_assets").unwrap_or(0.0);
                    liabilities += row.try_get("total_liabilities").unwrap_or(0.0);
                    equity += row.try_get("total_equity").unwrap_or(0.0);
                    revenue += row.try_get("total_revenue").unwrap_or(0.0);
                    expenses += row.try_get("total_expenses").unwrap_or(0.0);
                }
                (assets, liabilities, equity, revenue, expenses)
            }
            Err(e) => {
                tracing::error!("获取经营概览数据失败: {}", e);
                (0.0, 0.0, 0.0, 0.0, 0.0)
            }
        };

    let net_profit = total_revenue - total_expenses;
    let cash_flow = 0.0;

    let key_ratios = KeyRatios {
        current_ratio: if total_liabilities > 0.0 {
            total_assets / total_liabilities
        } else {
            0.0
        },
        debt_ratio: if total_assets > 0.0 {
            total_liabilities / total_assets
        } else {
            0.0
        },
        return_on_equity: if total_equity > 0.0 {
            net_profit / total_equity
        } else {
            0.0
        },
        profit_margin: if total_revenue > 0.0 {
            net_profit / total_revenue
        } else {
            0.0
        },
        return_on_assets: if total_assets > 0.0 {
            net_profit / total_assets
        } else {
            0.0
        },
        earnings_per_share: 0.0,
    };

    let overview = BusinessOverview {
        total_assets,
        total_liabilities,
        total_equity,
        total_revenue,
        total_expenses,
        net_profit,
        cash_flow,
        period,
        key_ratios,
        receivable_turnover: 0.0,
        inventory_turnover: 0.0,
        asset_turnover: if total_assets > 0.0 {
            total_revenue / total_assets
        } else {
            0.0
        },
    };

    Json(ApiResponse::success(overview, "获取经营概览成功"))
}

pub async fn cash_flow_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<CashFlowAnalysis>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT 
            SUM(CASE WHEN s.code LIKE '1001%' OR s.code LIKE '1002%' THEN (vi.debit_amount - vi.credit_amount) ELSE 0 END) as operating_cash_flow,
            SUM(CASE WHEN s.code LIKE '15%' THEN (vi.debit_amount - vi.credit_amount) ELSE 0 END) as investing_cash_flow,
            SUM(CASE WHEN s.code LIKE '2%' OR s.code LIKE '3%' THEN (vi.debit_amount - vi.credit_amount) ELSE 0 END) as financing_cash_flow
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
        "#,
    )
    .bind(&period)
    .fetch_one(&state.db)
    .await;

    let (operating_cash_flow, investing_cash_flow, financing_cash_flow) = match result {
        Ok(row) => (
            row.try_get("operating_cash_flow").unwrap_or(0.0),
            row.try_get("investing_cash_flow").unwrap_or(0.0),
            row.try_get("financing_cash_flow").unwrap_or(0.0),
        ),
        Err(e) => {
            tracing::error!("获取现金流分析数据失败: {}", e);
            (0.0, 0.0, 0.0)
        }
    };

    let net_cash_flow = operating_cash_flow + investing_cash_flow + financing_cash_flow;
    let total_revenue = 0.0;

    let analysis = CashFlowAnalysis {
        period,
        operating_cash_flow,
        investing_cash_flow,
        financing_cash_flow,
        net_cash_flow,
        cash_flow_ratio: 0.0,
        operating_cash_flow_to_revenue: if total_revenue > 0.0 {
            operating_cash_flow / total_revenue
        } else {
            0.0
        },
    };

    Json(ApiResponse::success(analysis, "获取现金流分析成功"))
}

pub async fn expense_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<ExpenseAnalysis>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let total_result = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(vi.debit_amount), 0.0) 
        FROM plugin_erp.voucher_items vi
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        LEFT JOIN plugin_erp.accounting_subjects s ON vi.subject_code = s.code
        WHERE v.period = $1 AND s.code LIKE '5%'
        "#,
    )
    .bind(&period)
    .fetch_one(&state.db)
    .await;

    let total_expenses = total_result.unwrap_or(0.0);

    let department_result = sqlx::query(
        r#"
        SELECT 
            d.id as department_id,
            d.name as department_name,
            COALESCE(SUM(vi.debit_amount), 0.0) as amount
        FROM public.departments d
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code IN (SELECT code FROM plugin_erp.accounting_subjects WHERE code LIKE '5%')
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
        GROUP BY d.id, d.name
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let department_expenses = match department_result {
        Ok(rows) => rows
            .into_iter()
            .map(|row| DepartmentExpense {
                department_id: row.try_get("department_id").ok(),
                department_name: row.try_get("department_name").unwrap_or_default(),
                amount: row.try_get("amount").unwrap_or(0.0),
                percentage: if total_expenses > 0.0 {
                    (row.try_get("amount").unwrap_or(0.0) / total_expenses) * 100.0
                } else {
                    0.0
                },
            })
            .collect(),
        Err(e) => {
            tracing::error!("获取部门费用分析失败: {}", e);
            Vec::new()
        }
    };

    let category_result = sqlx::query(
        r#"
        SELECT 
            s.category,
            COALESCE(SUM(vi.debit_amount), 0.0) as amount
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1 AND s.code LIKE '5%'
        GROUP BY s.category
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let category_expenses = match category_result {
        Ok(rows) => rows
            .into_iter()
            .map(|row| CategoryExpense {
                category: row.try_get("category").unwrap_or_default(),
                amount: row.try_get("amount").unwrap_or(0.0),
                percentage: if total_expenses > 0.0 {
                    (row.try_get("amount").unwrap_or(0.0) / total_expenses) * 100.0
                } else {
                    0.0
                },
            })
            .collect(),
        Err(e) => {
            tracing::error!("获取类别费用分析失败: {}", e);
            Vec::new()
        }
    };

    let monthly_trend = Vec::new();

    let analysis = ExpenseAnalysis {
        period,
        total_expenses,
        department_expenses,
        category_expenses,
        monthly_trend,
    };

    Json(ApiResponse::success(analysis, "获取费用分析成功"))
}

pub async fn profit_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<ProfitAnalysis>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT 
            SUM(CASE WHEN s.code LIKE '4%' THEN COALESCE(vi.credit_amount, 0.0) ELSE 0.0 END) as revenue,
            SUM(CASE WHEN s.code LIKE '5%' THEN COALESCE(vi.debit_amount, 0.0) ELSE 0.0 END) as expense
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
        "#,
    )
    .bind(&period)
    .fetch_one(&state.db)
    .await;

    let (revenue, expense) = match result {
        Ok(row) => (
            row.try_get("revenue").unwrap_or(0.0),
            row.try_get("expense").unwrap_or(0.0),
        ),
        Err(e) => {
            tracing::error!("获取利润分析数据失败: {}", e);
            (0.0, 0.0)
        }
    };

    let gross_profit = revenue;
    let operating_profit = gross_profit - expense;
    let net_profit = operating_profit;

    let analysis = ProfitAnalysis {
        period,
        gross_profit,
        operating_profit,
        net_profit,
        gross_margin: if revenue > 0.0 {
            (gross_profit / revenue) * 100.0
        } else {
            0.0
        },
        operating_margin: if revenue > 0.0 {
            (operating_profit / revenue) * 100.0
        } else {
            0.0
        },
        net_margin: if revenue > 0.0 {
            (net_profit / revenue) * 100.0
        } else {
            0.0
        },
        profit_trend: Vec::new(),
    };

    Json(ApiResponse::success(analysis, "获取利润分析成功"))
}

pub async fn financial_overview(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<FinancialOverview>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT 
            SUM(CASE WHEN s.code LIKE '1%' THEN COALESCE(vi.debit_amount - vi.credit_amount, 0.0) ELSE 0.0 END) as total_assets,
            SUM(CASE WHEN s.code LIKE '2%' THEN COALESCE(vi.debit_amount - vi.credit_amount, 0.0) ELSE 0.0 END) as total_liabilities,
            SUM(CASE WHEN s.code LIKE '3%' THEN COALESCE(vi.debit_amount - vi.credit_amount, 0.0) ELSE 0.0 END) as total_equity,
            SUM(CASE WHEN s.code LIKE '4%' THEN COALESCE(vi.credit_amount, 0.0) ELSE 0.0 END) as total_revenue,
            SUM(CASE WHEN s.code LIKE '5%' THEN COALESCE(vi.debit_amount, 0.0) ELSE 0.0 END) as total_expenses
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
        "#,
    )
    .bind(&period)
    .fetch_one(&state.db)
    .await;

    let (total_assets, total_liabilities, total_equity, total_revenue, total_expenses) =
        match result {
            Ok(row) => (
                row.try_get("total_assets").unwrap_or(0.0),
                row.try_get("total_liabilities").unwrap_or(0.0),
                row.try_get("total_equity").unwrap_or(0.0),
                row.try_get("total_revenue").unwrap_or(0.0),
                row.try_get("total_expenses").unwrap_or(0.0),
            ),
            Err(e) => {
                tracing::error!("获取财务概览数据失败: {}", e);
                (0.0, 0.0, 0.0, 0.0, 0.0)
            }
        };

    let net_profit = total_revenue - total_expenses;
    let operating_cash_flow = 0.0;

    let current_ratio = if total_liabilities > 0.0 {
        total_assets / total_liabilities
    } else {
        0.0
    };
    let debt_ratio = if total_assets > 0.0 {
        total_liabilities / total_assets
    } else {
        0.0
    };
    let return_on_equity = if total_equity > 0.0 {
        net_profit / total_equity
    } else {
        0.0
    };
    let profit_margin = if total_revenue > 0.0 {
        net_profit / total_revenue
    } else {
        0.0
    };
    let return_on_assets = if total_assets > 0.0 {
        net_profit / total_assets
    } else {
        0.0
    };

    let overview = FinancialOverview {
        total_assets,
        total_liabilities,
        total_equity,
        total_revenue,
        total_expenses,
        net_profit,
        operating_cash_flow,
        key_ratios: KeyRatios {
            current_ratio,
            debt_ratio,
            return_on_equity,
            profit_margin,
            return_on_assets,
            earnings_per_share: 0.0,
        },
        profit_margin,
        return_on_assets,
        return_on_equity,
        debt_ratio,
        current_ratio,
    };

    Json(ApiResponse::success(overview, "获取财务概览成功"))
}
