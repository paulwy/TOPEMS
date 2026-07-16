use axum::{
    extract::{Extension, Query, State},
    Json,
};
use chrono::{Datelike, Utc};
use sqlx::Row;

use super::models::{
    BalanceItem, BalanceSheet, CashFlowItem, CashFlowStatement, IncomeItem, IncomeStatement,
    ReportParams,
};
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub async fn balance_sheet(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<BalanceSheet>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
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

pub async fn income_statement(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<IncomeStatement>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
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

pub async fn cash_flow(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<CashFlowStatement>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
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
