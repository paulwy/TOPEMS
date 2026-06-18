use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Datelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use super::ApiState;
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
}

async fn balance_sheet(
    State(state): State<ApiState>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<BalanceSheet>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<IncomeStatement>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<CashFlowStatement>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let count_result =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_erp.financial_vouchers WHERE period = $1")
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<VoucherDetail>>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<ReceivableSummary>>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<PayableSummary>>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<BudgetSummary>>> {
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
    Query(_params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<EmployeeSummary>>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<VoucherTrend>>> {
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
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<CategorySummary>>> {
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
