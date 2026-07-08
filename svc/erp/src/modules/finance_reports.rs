use axum::{
    extract::{Extension, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Datelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ReportParams {
    pub period: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub project_id: Option<String>,
    pub department_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceSheet {
    pub assets: Vec<BalanceItem>,
    pub liabilities: Vec<BalanceItem>,
    pub equity: Vec<BalanceItem>,
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceItem {
    pub code: String,
    pub name: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomeStatement {
    pub revenues: Vec<IncomeItem>,
    pub expenses: Vec<IncomeItem>,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub net_profit: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomeItem {
    pub code: String,
    pub name: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowStatement {
    pub operating: Vec<CashFlowItem>,
    pub investing: Vec<CashFlowItem>,
    pub financing: Vec<CashFlowItem>,
    pub net_cash_flow: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowItem {
    pub description: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoucherSummary {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub summary: Option<String>,
    pub status: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub maker_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoucherDetail {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub summary: Option<String>,
    pub subject_code: String,
    pub subject_name: Option<String>,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub maker_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceivableSummary {
    pub status: String,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PayableSummary {
    pub status: String,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetSummary {
    pub department_name: Option<String>,
    pub total_budget: f64,
    pub used_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeSummary {
    pub department_name: Option<String>,
    pub employee_count: i64,
    pub avg_tenure: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoucherTrend {
    pub period: String,
    pub voucher_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategorySummary {
    pub category: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgingAnalysisItem {
    pub period: String,
    pub receivables: f64,
    pub payables: f64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyTrendItem {
    pub month: String,
    pub revenue: f64,
    pub expense: f64,
    pub profit: f64,
    pub voucher_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyRatios {
    pub current_ratio: f64,
    pub debt_ratio: f64,
    pub return_on_equity: f64,
    pub profit_margin: f64,
    pub return_on_assets: f64,
    pub earnings_per_share: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BusinessOverview {
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub cash_flow: f64,
    pub period: String,
    pub key_ratios: KeyRatios,
    pub receivable_turnover: f64,
    pub inventory_turnover: f64,
    pub asset_turnover: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFinancialSummary {
    pub project_id: String,
    pub project_name: String,
    pub contract_amount: f64,
    pub received_amount: f64,
    pub payable_amount: f64,
    pub paid_amount: f64,
    pub profit: f64,
    pub margin: f64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentFinancialSummary {
    pub department_id: Option<String>,
    pub department_name: String,
    pub total_expenses: f64,
    pub budget_amount: f64,
    pub budget_usage: f64,
    pub expense_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowAnalysis {
    pub period: String,
    pub operating_cash_flow: f64,
    pub investing_cash_flow: f64,
    pub financing_cash_flow: f64,
    pub net_cash_flow: f64,
    pub cash_flow_ratio: f64,
    pub operating_cash_flow_to_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryExpense {
    pub category: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentExpense {
    pub department_id: Option<String>,
    pub department_name: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyExpense {
    pub month: String,
    pub amount: f64,
    pub growth_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseAnalysis {
    pub period: String,
    pub total_expenses: f64,
    pub department_expenses: Vec<DepartmentExpense>,
    pub category_expenses: Vec<CategoryExpense>,
    pub monthly_trend: Vec<MonthlyExpense>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyProfit {
    pub month: String,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub net_profit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitAnalysis {
    pub period: String,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub net_profit: f64,
    pub gross_margin: f64,
    pub operating_margin: f64,
    pub net_margin: f64,
    pub profit_trend: Vec<MonthlyProfit>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialOverview {
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub operating_cash_flow: f64,
    pub key_ratios: KeyRatios,
    pub profit_margin: f64,
    pub return_on_assets: f64,
    pub return_on_equity: f64,
    pub debt_ratio: f64,
    pub current_ratio: f64,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/erp/reports/balance-sheet", get(balance_sheet))
        .route("/api/erp/reports/income-statement", get(income_statement))
        .route("/api/erp/reports/cash-flow", get(cash_flow))
        .route("/api/erp/reports/voucher-summary", get(voucher_summary))
        .route("/api/erp/reports/voucher-details", get(voucher_details))
        .route("/api/erp/reports/receivables", get(receivables_report))
        .route("/api/erp/reports/payables", get(payables_report))
        .route("/api/erp/reports/budget-summary", get(budget_summary))
        .route("/api/erp/reports/employee-summary", get(employee_summary))
        .route("/api/erp/reports/voucher-trend", get(voucher_trend))
        .route("/api/erp/reports/category-summary", get(category_summary))
        .route("/api/erp/reports/aging-analysis", get(aging_analysis))
        .route("/api/erp/reports/monthly-trend", get(monthly_trend))
        .route("/api/erp/reports/business-overview", get(business_overview))
        .route("/api/erp/reports/project-summary", get(project_summary))
        .route(
            "/api/erp/reports/department-summary",
            get(department_summary),
        )
        .route(
            "/api/erp/reports/cash-flow-analysis",
            get(cash_flow_analysis),
        )
        .route("/api/erp/reports/expense-analysis", get(expense_analysis))
        .route("/api/erp/reports/profit-analysis", get(profit_analysis))
        .route(
            "/api/erp/reports/financial-overview",
            get(financial_overview),
        )
}

async fn balance_sheet(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<BalanceSheet>> {
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
            CASE 
                WHEN s.code LIKE '1%' THEN 'assets'
                WHEN s.code LIKE '2%' THEN 'liabilities'
                WHEN s.code LIKE '3%' THEN 'equity'
                ELSE 'other'
            END as category,
            s.code,
            s.name,
            COALESCE(SUM(CASE WHEN vi.debit_amount > 0 THEN vi.debit_amount ELSE -vi.credit_amount END), 0.0) as amount
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE (v.period = $1 OR v.period IS NULL)
          AND s.status = 'active'
        GROUP BY category, s.code, s.name
        ORDER BY s.code
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let (asset_items, liability_items, equity_items, total_assets, total_liabilities, total_equity) =
        match result {
            Ok(rows) => {
                let mut assets = Vec::new();
                let mut liabilities = Vec::new();
                let mut equity = Vec::new();
                let mut assets_total = 0.0;
                let mut liabilities_total = 0.0;
                let mut equity_total = 0.0;

                for row in rows {
                    let category: String = row.try_get("category").unwrap_or_default();
                    let code: String = row.try_get("code").unwrap_or_default();
                    let name: String = row.try_get("name").unwrap_or_default();
                    let amount: f64 = row.try_get("amount").unwrap_or(0.0);

                    match category.as_str() {
                        "assets" => {
                            assets.push(BalanceItem {
                                code,
                                name,
                                amount,
                                percentage: 0.0,
                            });
                            assets_total += amount;
                        }
                        "liabilities" => {
                            liabilities.push(BalanceItem {
                                code,
                                name,
                                amount,
                                percentage: 0.0,
                            });
                            liabilities_total += amount;
                        }
                        "equity" => {
                            equity.push(BalanceItem {
                                code,
                                name,
                                amount,
                                percentage: 0.0,
                            });
                            equity_total += amount;
                        }
                        _ => {}
                    }
                }

                (
                    assets,
                    liabilities,
                    equity,
                    assets_total,
                    liabilities_total,
                    equity_total,
                )
            }
            Err(e) => {
                tracing::error!("获取资产负债表数据失败: {}", e);
                return Json(ApiResponse::error(500, "获取资产负债表数据失败"));
            }
        };

    let asset_items: Vec<BalanceItem> = asset_items
        .into_iter()
        .map(|mut item| {
            item.percentage = if total_assets > 0.0 {
                (item.amount / total_assets) * 100.0
            } else {
                0.0
            };
            item
        })
        .collect();

    let liability_items: Vec<BalanceItem> = liability_items
        .into_iter()
        .map(|mut item| {
            item.percentage = if total_liabilities > 0.0 {
                (item.amount / total_liabilities) * 100.0
            } else {
                0.0
            };
            item
        })
        .collect();

    let equity_items: Vec<BalanceItem> = equity_items
        .into_iter()
        .map(|mut item| {
            item.percentage = if total_equity > 0.0 {
                (item.amount / total_equity) * 100.0
            } else {
                0.0
            };
            item
        })
        .collect();

    let balance_sheet = BalanceSheet {
        assets: asset_items,
        liabilities: liability_items,
        equity: equity_items,
        total_assets,
        total_liabilities,
        total_equity,
        period,
    };

    Json(ApiResponse::success(balance_sheet, "获取资产负债表成功"))
}

async fn income_statement(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<IncomeStatement>> {
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
            CASE 
                WHEN s.code LIKE '4%' THEN 'revenue'
                WHEN s.code LIKE '5%' THEN 'expense'
                ELSE 'other'
            END as category,
            s.code,
            s.name,
            COALESCE(SUM(CASE WHEN vi.debit_amount > 0 THEN vi.debit_amount ELSE -vi.credit_amount END), 0.0) as amount
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
        GROUP BY category, s.code, s.name
        ORDER BY s.code
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let (revenues, expenses, total_revenue, total_expense) = match result {
        Ok(rows) => {
            let mut rev = Vec::new();
            let mut exp = Vec::new();
            let mut rev_total = 0.0;
            let mut exp_total = 0.0;

            for row in rows {
                let category: String = row.try_get("category").unwrap_or_default();
                let code: String = row.try_get("code").unwrap_or_default();
                let name: String = row.try_get("name").unwrap_or_default();
                let amount: f64 = row.try_get("amount").unwrap_or(0.0);

                match category.as_str() {
                    "revenue" => {
                        rev.push(IncomeItem { code, name, amount });
                        rev_total += amount;
                    }
                    "expense" => {
                        exp.push(IncomeItem { code, name, amount });
                        exp_total += amount;
                    }
                    _ => {}
                }
            }

            (rev, exp, rev_total, exp_total)
        }
        Err(e) => {
            tracing::error!("获取利润表数据失败: {}", e);
            return Json(ApiResponse::error(500, "获取利润表数据失败"));
        }
    };

    let gross_profit = total_revenue;
    let operating_profit = gross_profit - total_expense;
    let net_profit = operating_profit;

    let income_statement = IncomeStatement {
        revenues,
        expenses,
        gross_profit,
        operating_profit,
        net_profit,
        period,
    };

    Json(ApiResponse::success(income_statement, "获取利润表成功"))
}

async fn cash_flow(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<CashFlowStatement>> {
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
            CASE 
                WHEN s.code LIKE '1001%' OR s.code LIKE '1002%' THEN 'operating'
                WHEN s.code LIKE '15%' THEN 'investing'
                WHEN s.code LIKE '2%' OR s.code LIKE '3%' THEN 'financing'
                ELSE 'operating'
            END as category,
            s.name,
            COALESCE(SUM(vi.debit_amount - vi.credit_amount), 0.0) as amount
        FROM plugin_erp.accounting_subjects s
        LEFT JOIN plugin_erp.voucher_items vi ON vi.subject_code = s.code
        LEFT JOIN plugin_erp.financial_vouchers v ON vi.voucher_id = v.id
        WHERE v.period = $1
          AND s.status = 'active'
        GROUP BY category, s.name
        ORDER BY category, s.name
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let (operating, investing, financing, net_cash_flow) = match result {
        Ok(rows) => {
            let mut op = Vec::new();
            let mut inv = Vec::new();
            let mut fin = Vec::new();
            let mut net = 0.0;

            for row in rows {
                let category: String = row.try_get("category").unwrap_or_default();
                let name: String = row.try_get("name").unwrap_or_default();
                let amount: f64 = row.try_get("amount").unwrap_or(0.0);
                net += amount;

                match category.as_str() {
                    "operating" => op.push(CashFlowItem {
                        description: name,
                        amount,
                    }),
                    "investing" => inv.push(CashFlowItem {
                        description: name,
                        amount,
                    }),
                    "financing" => fin.push(CashFlowItem {
                        description: name,
                        amount,
                    }),
                    _ => op.push(CashFlowItem {
                        description: name,
                        amount,
                    }),
                }
            }

            (op, inv, fin, net)
        }
        Err(e) => {
            tracing::error!("获取现金流量表数据失败: {}", e);
            return Json(ApiResponse::error(500, "获取现金流量表数据失败"));
        }
    };

    let cash_flow = CashFlowStatement {
        operating,
        investing,
        financing,
        net_cash_flow,
        period,
    };

    Json(ApiResponse::success(cash_flow, "获取现金流量表成功"))
}

async fn voucher_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let page = params
        .project_id
        .as_ref()
        .and_then(|p| p.parse::<i64>().ok())
        .unwrap_or(1)
        .max(1);
    let page_size = params
        .department_id
        .as_ref()
        .and_then(|d| d.parse::<i64>().ok())
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT v.voucher_number, v.voucher_date, v.summary, v.status, 
               v.total_debit, v.total_credit, v.maker_name, v.created_at
        FROM plugin_erp.financial_vouchers v
        WHERE v.period = $1
        ORDER BY v.voucher_date DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&period)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    let vouchers = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(VoucherSummary {
                    voucher_number: row.try_get("voucher_number").unwrap_or_default(),
                    voucher_date: row.try_get("voucher_date").unwrap_or_else(|_| Utc::now()),
                    summary: row.try_get("summary").ok(),
                    status: row.try_get("status").unwrap_or_default(),
                    total_debit: row.try_get("total_debit").unwrap_or(0.0),
                    total_credit: row.try_get("total_credit").unwrap_or(0.0),
                    maker_name: row.try_get("maker_name").ok(),
                    created_at: row.try_get("created_at").unwrap_or_else(|_| Utc::now()),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取凭证汇总数据失败: {}", e);
            return Json(ApiResponse::error(500, "获取凭证汇总数据失败"));
        }
    };

    let count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_erp.financial_vouchers WHERE period = $1",
    )
    .bind(&period)
    .fetch_one(&state.db)
    .await;

    let total = count_result.unwrap_or(0);

    Json(ApiResponse::success(
        serde_json::json!({
            "vouchers": vouchers,
            "total": total,
            "page": page,
            "page_size": page_size
        }),
        "获取凭证汇总成功",
    ))
}

async fn voucher_details(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<VoucherDetail>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT v.voucher_number, v.voucher_date, v.summary, 
               vi.subject_code, vi.subject_name, vi.debit_amount, vi.credit_amount, v.maker_name
        FROM plugin_erp.financial_vouchers v
        JOIN plugin_erp.voucher_items vi ON v.id = vi.voucher_id
        WHERE v.period = $1
        ORDER BY v.voucher_date, v.voucher_number
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let details = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(VoucherDetail {
                    voucher_number: row.try_get("voucher_number").unwrap_or_default(),
                    voucher_date: row.try_get("voucher_date").unwrap_or_else(|_| Utc::now()),
                    summary: row.try_get("summary").ok(),
                    subject_code: row.try_get("subject_code").unwrap_or_default(),
                    subject_name: row.try_get("subject_name").ok(),
                    debit_amount: row.try_get("debit_amount").unwrap_or(0.0),
                    credit_amount: row.try_get("credit_amount").unwrap_or(0.0),
                    maker_name: row.try_get("maker_name").ok(),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取凭证明细失败: {}", e);
            return Json(ApiResponse::error(500, "获取凭证明细失败"));
        }
    };

    Json(ApiResponse::success(details, "获取凭证明细成功"))
}

async fn receivables_report(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<ReceivableSummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let start_date = params.start_date.clone().unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-01-01", now.year())
    });
    let end_date = params
        .end_date
        .clone()
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    let result = sqlx::query(
        "SELECT SUM(amount) as total, status FROM plugin_erp.receivables WHERE due_date BETWEEN $1 AND $2 GROUP BY status",
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(ReceivableSummary {
                    status: row.try_get("status").unwrap_or_default(),
                    total: row.try_get("total").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取应收账款报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取应收账款报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取应收账款报表成功"))
}

async fn payables_report(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<PayableSummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let start_date = params.start_date.clone().unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-01-01", now.year())
    });
    let end_date = params
        .end_date
        .clone()
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    let result = sqlx::query(
        "SELECT SUM(amount) as total, status FROM plugin_erp.payables WHERE due_date BETWEEN $1 AND $2 GROUP BY status",
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(PayableSummary {
                    status: row.try_get("status").unwrap_or_default(),
                    total: row.try_get("total").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取应付账款报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取应付账款报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取应付账款报表成功"))
}

async fn budget_summary(
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

async fn employee_summary(
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

async fn voucher_trend(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<VoucherTrend>>> {
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
        SELECT v.period, COUNT(*) as voucher_count, SUM(v.total_debit) as total_amount
        FROM plugin_erp.financial_vouchers v
        WHERE v.status = 'posted'
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
                items.push(VoucherTrend {
                    period: row.try_get("period").unwrap_or_default(),
                    voucher_count: row.try_get("voucher_count").unwrap_or(0),
                    total_amount: row.try_get("total_amount").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取凭证趋势报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取凭证趋势报表失败"));
        }
    };

    Json(ApiResponse::success(trend, "获取凭证趋势报表成功"))
}

async fn category_summary(
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

async fn aging_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<AgingAnalysisItem>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let _period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT 
            'current' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '30天以内' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date >= NOW() - INTERVAL '30 days'
          AND p.due_date >= NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 
            '30_60' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '30-60天' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date < NOW() - INTERVAL '30 days' AND r.due_date >= NOW() - INTERVAL '60 days'
          AND p.due_date < NOW() - INTERVAL '30 days' AND p.due_date >= NOW() - INTERVAL '60 days'
        UNION ALL
        SELECT 
            '60_90' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '60-90天' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date < NOW() - INTERVAL '60 days' AND r.due_date >= NOW() - INTERVAL '90 days'
          AND p.due_date < NOW() - INTERVAL '60 days' AND p.due_date >= NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT 
            'over_90' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '90天以上' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date < NOW() - INTERVAL '90 days'
          AND p.due_date < NOW() - INTERVAL '90 days'
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let analysis = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(AgingAnalysisItem {
                    period: row.try_get("period").unwrap_or_default(),
                    receivables: row.try_get("receivables").unwrap_or(0.0),
                    payables: row.try_get("payables").unwrap_or(0.0),
                    description: row.try_get("description").unwrap_or_default(),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取账龄分析报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取账龄分析报表失败"));
        }
    };

    Json(ApiResponse::success(analysis, "获取账龄分析报表成功"))
}

async fn monthly_trend(
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

async fn business_overview(
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

async fn project_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<ProjectFinancialSummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
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

async fn department_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<DepartmentFinancialSummary>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::ReportRead).await {
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

async fn cash_flow_analysis(
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

async fn expense_analysis(
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

async fn profit_analysis(
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

async fn financial_overview(
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
