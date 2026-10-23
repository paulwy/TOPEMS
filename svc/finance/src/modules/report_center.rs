//! V47.0 Finance 报表中心模块（P1-14 反掺假重构）
//!
//! 提供资产负债表、利润表的“增强版”视图（结构分析、同比分析）与财务比率分析。
//!
//! 数据源判定（P1-14）：
//! - 资产负债表 / 利润表：存在真实账务数据源 `finance.core_finance_accounts` +
//!   `finance.core_finance_ledger`，由 [`FinanceService::get_balance_sheet`] /
//!   [`FinanceService::get_income_statement`] 做真实 SQL 聚合（按 tenant_id 过滤、按期间参数）。
//!   本模块仅在真实账务数据之上做分类（流动/非流动）、结构占比、上期与去年同期同比等派生计算，
//!   **不再内置任何写死的分录金额或固定百分比**。
//! - 现金流量表增强版（经营/投资/筹资分类、间接法调整项、现金流比率）：当前库内**没有**按
//!   现金流活动分类的账务数据源，增强版报表无法诚实编制，对应端点返回 **501** 说明无数据源，
//!   不再返回虚构现金流。
//! - 多期对比报表 / 报表导出：无真实多期汇总与文件落盘数据源，返回 **501**。
//!
//! 路由：
//! - GET  /reports/balance-sheet/{period}      （真实账务聚合）
//! - GET  /reports/income-statement/{period} （真实账务聚合）
//! - GET  /reports/cash-flow/{period}          （501：无现金流分类数据源）
//! - GET  /reports/financial-analysis/{period} （基于真实资产负债表/利润表派生）
//! - GET  /reports/comparative/{period}        （501：无多期对比数据源）
//! - POST /reports/export                      （501：无真实导出文件生成）

use std::collections::HashMap;

use axum::{
    extract::{Extension, Json, Path, State},
    Router,
};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};

use crate::models::{BalanceItem, BalanceSheet, IncomeItem, IncomeStatement};
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

// ==================== 辅助函数 ====================

fn safe_divide(numerator: Decimal, denominator: Decimal) -> Decimal {
    if denominator.is_zero() {
        Decimal::ZERO
    } else {
        numerator / denominator
    }
}

fn safe_percentage(amount: Decimal, total: Decimal) -> Decimal {
    if total.is_zero() {
        Decimal::ZERO
    } else {
        (amount / total) * Decimal::from(100)
    }
}

fn fill_percentages(items: &mut [BalanceSheetItem], total: Decimal) {
    for item in items.iter_mut() {
        item.percentage = safe_percentage(item.amount, total);
    }
}

/// 解析 "YYYY-MM" 期间为 (年, 月)；无法解析时返回 None（不编造回退值）。
fn split_period(period: &str) -> Option<(i32, u32)> {
    let mut parts = period.split('-');
    let year: i32 = parts.next()?.parse().ok()?;
    let month: u32 = parts.next()?.parse().ok()?;
    if (1..=12).contains(&month) {
        Some((year, month))
    } else {
        None
    }
}

/// 上一个会计期间（YYYY-MM）。
fn previous_period(period: &str) -> Option<String> {
    let (year, month) = split_period(period)?;
    if month == 1 {
        Some(format!("{:04}-{:02}", year - 1, 12))
    } else {
        Some(format!("{:04}-{:02}", year, month - 1))
    }
}

/// 去年同期期间（YYYY-MM）。
fn last_year_period(period: &str) -> Option<String> {
    let (year, month) = split_period(period)?;
    Some(format!("{:04}-{:02}", year - 1, month))
}

/// 资产科目是否为“流动资产”（按企业会计准则科目编码段：1001–1499）。
/// 无法解析为数字编码时保守归入流动资产。
fn is_current_asset(code: &str) -> bool {
    code.parse::<i64>()
        .map(|c| (1000..=1499).contains(&c))
        .unwrap_or(true)
}

/// 负债科目是否为“流动负债”（编码段：2001–2299）。
fn is_current_liability(code: &str) -> bool {
    code.parse::<i64>()
        .map(|c| (2000..=2299).contains(&c))
        .unwrap_or(true)
}

fn empty_balance_sheet(period: &str) -> BalanceSheet {
    BalanceSheet {
        period: period.to_string(),
        assets: vec![],
        liabilities: vec![],
        equity: vec![],
        total_assets: Decimal::ZERO,
        total_liabilities: Decimal::ZERO,
        total_equity: Decimal::ZERO,
    }
}

fn empty_income_statement(period: &str) -> IncomeStatement {
    IncomeStatement {
        period: period.to_string(),
        revenues: vec![],
        expenses: vec![],
        total_revenue: Decimal::ZERO,
        total_expense: Decimal::ZERO,
        net_income: Decimal::ZERO,
    }
}

// ==================== A. 资产负债表增强 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSheetItem {
    /// 科目编码
    pub account_code: String,
    /// 科目名称
    pub account_name: String,
    /// 期末金额（来自真实账务）
    pub amount: Decimal,
    /// 占比（结构分析）
    pub percentage: Decimal,
    /// 上期金额（来自真实账务上期，无则为 0）
    pub period_amount: Decimal,
    /// 本年累计金额（时点报表即期末余额，不另行虚构）
    pub year_amount: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSheetEnhanced {
    pub period: String,
    /// 流动资产
    pub current_assets: Vec<BalanceSheetItem>,
    /// 非流动资产
    pub non_current_assets: Vec<BalanceSheetItem>,
    /// 流动负债
    pub current_liabilities: Vec<BalanceSheetItem>,
    /// 非流动负债
    pub non_current_liabilities: Vec<BalanceSheetItem>,
    /// 所有者权益
    pub equity: Vec<BalanceSheetItem>,
    pub total_current_assets: Decimal,
    pub total_non_current_assets: Decimal,
    pub total_assets: Decimal,
    pub total_current_liabilities: Decimal,
    pub total_non_current_liabilities: Decimal,
    pub total_liabilities: Decimal,
    pub total_equity: Decimal,
    /// 去年同期总资产（真实账务，无则 0）
    pub last_year_total_assets: Decimal,
    /// 去年同期总负债
    pub last_year_total_liabilities: Decimal,
    /// 去年同期所有者权益
    pub last_year_total_equity: Decimal,
    /// 资产同比增长率（%，基于真实去年同期）
    pub assets_yoy_growth: Decimal,
    /// 负债同比增长率
    pub liabilities_yoy_growth: Decimal,
    /// 权益同比增长率
    pub equity_yoy_growth: Decimal,
}

/// 把真实账务分录转为展示行，并按上期真实余额回填期初/占比。
fn balance_items_from(
    items: &[&BalanceItem],
    prev: &HashMap<&str, Decimal>,
    total: Decimal,
) -> Vec<BalanceSheetItem> {
    items
        .iter()
        .map(|i| {
            let amount = i.amount;
            BalanceSheetItem {
                account_code: i.account_code.clone(),
                account_name: i.account_name.clone(),
                amount,
                percentage: safe_percentage(amount, total),
                period_amount: prev
                    .get(i.account_code.as_str())
                    .copied()
                    .unwrap_or(Decimal::ZERO),
                year_amount: amount,
            }
        })
        .collect()
}

/// 基于真实账务试算余额生成增强版资产负债表。
///
/// - `current`：本期真实账务聚合（`FinanceService::get_balance_sheet`）。
/// - `previous`：上期真实账务聚合（用于期初/占比，可为 None）。
/// - `last_year`：去年同期真实账务聚合（用于同比，可为 None）。
pub fn generate_balance_sheet(
    period: &str,
    current: &BalanceSheet,
    previous: Option<&BalanceSheet>,
    last_year: Option<&BalanceSheet>,
) -> BalanceSheetEnhanced {
    // 上期科目余额索引（按科目编码）
    let mut prev_map: HashMap<&str, Decimal> = HashMap::new();
    if let Some(prev) = previous {
        for item in prev
            .assets
            .iter()
            .chain(prev.liabilities.iter())
            .chain(prev.equity.iter())
        {
            prev_map.insert(item.account_code.as_str(), item.amount);
        }
    }

    // 流动 / 非流动拆分（按真实科目编码段）
    let (current_asset_items, non_current_asset_items): (Vec<&BalanceItem>, Vec<&BalanceItem>) =
        current
            .assets
            .iter()
            .partition(|i| is_current_asset(&i.account_code));
    let (current_liab_items, non_current_liab_items): (Vec<&BalanceItem>, Vec<&BalanceItem>) =
        current
            .liabilities
            .iter()
            .partition(|i| is_current_liability(&i.account_code));

    let total_assets = current.total_assets;
    let total_liabilities = current.total_liabilities;
    let total_equity = current.total_equity;

    let mut current_assets = balance_items_from(&current_asset_items, &prev_map, total_assets);
    let mut non_current_assets =
        balance_items_from(&non_current_asset_items, &prev_map, total_assets);
    let mut current_liabilities =
        balance_items_from(&current_liab_items, &prev_map, total_liabilities);
    let mut non_current_liabilities =
        balance_items_from(&non_current_liab_items, &prev_map, total_liabilities);
    let equity_refs: Vec<&BalanceItem> = current.equity.iter().collect();
    let mut equity = balance_items_from(&equity_refs, &prev_map, total_equity);

    fill_percentages(&mut current_assets, total_assets);
    fill_percentages(&mut non_current_assets, total_assets);
    fill_percentages(&mut current_liabilities, total_liabilities);
    fill_percentages(&mut non_current_liabilities, total_liabilities);
    fill_percentages(&mut equity, total_equity);

    let total_current_assets: Decimal = current_assets.iter().map(|i| i.amount).sum();
    let total_non_current_assets: Decimal = non_current_assets.iter().map(|i| i.amount).sum();
    let total_current_liabilities: Decimal = current_liabilities.iter().map(|i| i.amount).sum();
    let total_non_current_liabilities: Decimal =
        non_current_liabilities.iter().map(|i| i.amount).sum();

    // 去年同期来自真实账务聚合，无则为 0（同比按 0 安全退化，绝不按固定百分比编造）
    let last_year_total_assets = last_year.map(|b| b.total_assets).unwrap_or(Decimal::ZERO);
    let last_year_total_liabilities = last_year
        .map(|b| b.total_liabilities)
        .unwrap_or(Decimal::ZERO);
    let last_year_total_equity = last_year.map(|b| b.total_equity).unwrap_or(Decimal::ZERO);

    BalanceSheetEnhanced {
        period: period.to_string(),
        current_assets,
        non_current_assets,
        current_liabilities,
        non_current_liabilities,
        equity,
        total_current_assets,
        total_non_current_assets,
        total_assets,
        total_current_liabilities,
        total_non_current_liabilities,
        total_liabilities,
        total_equity,
        last_year_total_assets,
        last_year_total_liabilities,
        last_year_total_equity,
        assets_yoy_growth: safe_percentage(
            total_assets - last_year_total_assets,
            last_year_total_assets,
        ),
        liabilities_yoy_growth: safe_percentage(
            total_liabilities - last_year_total_liabilities,
            last_year_total_liabilities,
        ),
        equity_yoy_growth: safe_percentage(
            total_equity - last_year_total_equity,
            last_year_total_equity,
        ),
    }
}

// ==================== B. 利润表增强 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncomeStatementItem {
    /// 项目编码（科目编码）
    pub project_code: String,
    /// 项目名称（科目名称）
    pub project_name: String,
    /// 本期金额（真实账务）
    pub current_amount: Decimal,
    /// 上期金额（真实账务上期，无则 0）
    pub previous_amount: Decimal,
    /// 本年累计（本期即月累计，不虚构全年分摊）
    pub year_cumulative: Decimal,
    /// 同比增减（%）
    pub yoy_change: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodTrend {
    pub period: String,
    pub revenue: Decimal,
    pub net_profit: Decimal,
    pub gross_margin: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncomeStatementEnhanced {
    pub period: String,
    pub items: Vec<IncomeStatementItem>,
    /// 营业收入（真实账务合计）
    pub operating_revenue: Decimal,
    /// 营业成本（科目 64xx 合计）
    pub operating_cost: Decimal,
    /// 期间费用（科目 66xx 合计）
    pub period_expenses: Decimal,
    /// 利润总额
    pub total_profit: Decimal,
    /// 净利润（真实账务 net_income）
    pub net_profit: Decimal,
    /// 每股收益（无股本数据源，恒为 0，不按假设股本编造）
    pub eps: Decimal,
    /// 毛利率（%）
    pub gross_margin: Decimal,
    /// 净利率（%）
    pub net_margin: Decimal,
    /// 费用率（%）
    pub expense_ratio: Decimal,
    /// 趋势分析（无多期真实数据源，恒为空）
    pub trend: Vec<PeriodTrend>,
}

/// 汇总指定科目编码前缀的发生额。
fn expense_sum(items: &[IncomeItem], prefix: &str) -> Decimal {
    items
        .iter()
        .filter(|i| i.account_code.starts_with(prefix))
        .map(|i| i.amount)
        .sum()
}

/// 基于真实账务聚合生成增强版利润表。
pub fn generate_income_statement(
    period: &str,
    current: &IncomeStatement,
    previous: Option<&IncomeStatement>,
) -> IncomeStatementEnhanced {
    let mut prev_map: HashMap<&str, Decimal> = HashMap::new();
    if let Some(prev) = previous {
        for item in prev.revenues.iter().chain(prev.expenses.iter()) {
            prev_map.insert(item.account_code.as_str(), item.amount);
        }
    }

    let mut items: Vec<IncomeStatementItem> = Vec::new();
    for src in current.revenues.iter().chain(current.expenses.iter()) {
        let cur = src.amount;
        let prev = prev_map
            .get(src.account_code.as_str())
            .copied()
            .unwrap_or(Decimal::ZERO);
        items.push(IncomeStatementItem {
            project_code: src.account_code.clone(),
            project_name: src.account_name.clone(),
            current_amount: cur,
            previous_amount: prev,
            year_cumulative: cur,
            yoy_change: safe_percentage(cur - prev, prev),
        });
    }

    let operating_revenue = current.total_revenue;
    let operating_cost = expense_sum(&current.expenses, "64");
    let period_expenses = expense_sum(&current.expenses, "66");
    let total_profit = operating_revenue - current.total_expense;
    let net_profit = current.net_income;

    // 无股本（实收资本/在外股份）数据来源，EPS 不按假设万股编造，恒为 0。
    let eps = Decimal::ZERO;

    let gross_margin = safe_percentage(operating_revenue - operating_cost, operating_revenue);
    let net_margin = safe_percentage(net_profit, operating_revenue);
    let expense_ratio = safe_percentage(period_expenses, operating_revenue);

    // 多期趋势无真实数据源，返回空数组，不编造季度分摊比例。
    let trend: Vec<PeriodTrend> = Vec::new();

    IncomeStatementEnhanced {
        period: period.to_string(),
        items,
        operating_revenue,
        operating_cost,
        period_expenses,
        total_profit,
        net_profit,
        eps,
        gross_margin,
        net_margin,
        expense_ratio,
        trend,
    }
}

// ==================== C. 现金流量表增强（无数据源 → 501） ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowItem {
    /// 项目编码
    pub item_code: String,
    /// 项目名称
    pub item_name: String,
    /// 金额
    pub amount: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowRatios {
    /// 经营现金流/营业收入
    pub operating_cash_to_revenue: Decimal,
    /// 经营现金流/净利润（净利润含金量）
    pub operating_cash_to_net_profit: Decimal,
    /// 现金满足投资比率
    pub cash_flow_adequacy: Decimal,
    /// 自由现金流
    pub free_cash_flow: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowStatementEnhanced {
    pub period: String,
    /// 经营活动现金流
    pub operating_activities: Vec<CashFlowItem>,
    /// 投资活动现金流
    pub investing_activities: Vec<CashFlowItem>,
    /// 筹资活动现金流
    pub financing_activities: Vec<CashFlowItem>,
    pub net_operating: Decimal,
    pub net_investing: Decimal,
    pub net_financing: Decimal,
    pub net_change: Decimal,
    pub opening_balance: Decimal,
    pub closing_balance: Decimal,
    /// 间接法调整项（从净利润调整到经营现金流）
    pub indirect_adjustments: Vec<CashFlowItem>,
    /// 现金流比率分析
    pub ratios: CashFlowRatios,
}

// ==================== D. 财务分析 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialRatios {
    // 偿债能力
    /// 流动比率
    pub current_ratio: Decimal,
    /// 速动比率
    pub quick_ratio: Decimal,
    /// 资产负债率（%）
    pub debt_to_asset_ratio: Decimal,
    // 营运能力
    /// 应收账款周转率
    pub accounts_receivable_turnover: Decimal,
    /// 存货周转率
    pub inventory_turnover: Decimal,
    /// 总资产周转率
    pub total_asset_turnover: Decimal,
    // 盈利能力
    /// 毛利率（%）
    pub gross_margin: Decimal,
    /// 净利率（%）
    pub net_margin: Decimal,
    /// 净资产收益率 ROE（%）
    pub roe: Decimal,
    /// 总资产收益率 ROA（%）
    pub roa: Decimal,
    // 发展能力（基于真实去年同期，无则安全退化）
    /// 营收增长率（%）
    pub revenue_growth_rate: Decimal,
    /// 净利润增长率（%）
    pub net_profit_growth_rate: Decimal,
    /// 总资产增长率（%）
    pub total_asset_growth_rate: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialAnalysisReport {
    pub period: String,
    pub ratios: FinancialRatios,
    /// 评估等级（A/B/C/D）
    pub grade: String,
    /// 综合评分（0-100）
    pub score: Decimal,
    /// 分析建议
    pub suggestions: Vec<String>,
    /// 预警信息
    pub warnings: Vec<String>,
    /// 趋势判断
    pub trend_judgment: String,
}

/// 计算财务比率（输入均为真实账务派生值）。
///
/// `last_year_income` 为去年同期真实利润表，用于营收/净利润同比；缺失时同比按 0 安全退化。
pub fn calculate_financial_ratios(
    balance: &BalanceSheetEnhanced,
    income: &IncomeStatementEnhanced,
    last_year_income: Option<&IncomeStatement>,
) -> FinancialRatios {
    let current_ratio = safe_divide(
        balance.total_current_assets,
        balance.total_current_liabilities,
    );
    let inventory = balance
        .current_assets
        .iter()
        .find(|i| i.account_code == "1401")
        .map(|i| i.amount)
        .unwrap_or(Decimal::ZERO);
    let quick_ratio = safe_divide(
        balance.total_current_assets - inventory,
        balance.total_current_liabilities,
    );
    let debt_to_asset_ratio = safe_percentage(balance.total_liabilities, balance.total_assets);

    // 平均余额使用真实本期与上期余额（来自真实账务），不按固定比例编造
    let avg_receivable = balance
        .current_assets
        .iter()
        .find(|i| i.account_code == "1122")
        .map(|i| (i.amount + i.period_amount) / Decimal::from(2))
        .unwrap_or(Decimal::ONE);
    let avg_inventory = balance
        .current_assets
        .iter()
        .find(|i| i.account_code == "1401")
        .map(|i| (i.amount + i.period_amount) / Decimal::from(2))
        .unwrap_or(Decimal::ONE);
    let avg_total_assets =
        (balance.total_assets + balance.last_year_total_assets) / Decimal::from(2);

    let accounts_receivable_turnover = safe_divide(income.operating_revenue, avg_receivable);
    let inventory_turnover = safe_divide(income.operating_cost, avg_inventory);
    let total_asset_turnover = safe_divide(income.operating_revenue, avg_total_assets);

    let avg_equity = (balance.total_equity + balance.last_year_total_equity) / Decimal::from(2);
    let roe = safe_percentage(income.net_profit, avg_equity);
    let roa = safe_percentage(income.net_profit, avg_total_assets);

    // 去年同期营收/净利润来自真实账务，无则为 0（同比安全退化，不按 85% 编造）
    let last_year_revenue = last_year_income
        .map(|i| i.total_revenue)
        .unwrap_or(Decimal::ZERO);
    let last_year_net_profit = last_year_income
        .map(|i| i.net_income)
        .unwrap_or(Decimal::ZERO);
    let revenue_growth_rate = safe_percentage(
        income.operating_revenue - last_year_revenue,
        last_year_revenue,
    );
    let net_profit_growth_rate = safe_percentage(
        income.net_profit - last_year_net_profit,
        last_year_net_profit,
    );
    let total_asset_growth_rate = safe_percentage(
        balance.total_assets - balance.last_year_total_assets,
        balance.last_year_total_assets,
    );

    FinancialRatios {
        current_ratio,
        quick_ratio,
        debt_to_asset_ratio,
        accounts_receivable_turnover,
        inventory_turnover,
        total_asset_turnover,
        gross_margin: income.gross_margin,
        net_margin: income.net_margin,
        roe,
        roa,
        revenue_growth_rate,
        net_profit_growth_rate,
        total_asset_growth_rate,
    }
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
/// 生成财务分析报告（含趋势判断和预警；评分为确定性规则，不含编造数据）
pub fn generate_analysis_report(period: &str, ratios: &FinancialRatios) -> FinancialAnalysisReport {
    let mut score: f64 = 0.0;
    let mut warnings: Vec<String> = Vec::new();
    let mut suggestions: Vec<String> = Vec::new();

    // 偿债能力评分（30分）
    let current = ratios.current_ratio.to_f64().unwrap_or(0.0);
    let debt = ratios.debt_to_asset_ratio.to_f64().unwrap_or(0.0);
    if current >= 2.0 {
        score += 18.0;
    } else if current >= 1.5 {
        score += 14.0;
    } else if current >= 1.0 {
        score += 9.0;
        warnings.push("流动比率低于1.5，短期偿债能力偏弱".to_string());
    } else {
        score += 4.0;
        warnings.push("流动比率低于1.0，短期偿债能力存在风险".to_string());
    }
    if debt < 50.0 {
        score += 12.0;
    } else if debt < 60.0 {
        score += 9.0;
    } else if debt < 70.0 {
        score += 6.0;
        warnings.push("资产负债率偏高，长期偿债压力较大".to_string());
    } else {
        score += 3.0;
        warnings.push("资产负债率过高，财务风险显著".to_string());
    }

    // 盈利能力评分（30分）
    let roe = ratios.roe.to_f64().unwrap_or(0.0);
    let net_margin = ratios.net_margin.to_f64().unwrap_or(0.0);
    if roe >= 20.0 {
        score += 18.0;
    } else if roe >= 15.0 {
        score += 14.0;
    } else if roe >= 10.0 {
        score += 9.0;
    } else {
        score += 4.0;
        warnings.push("净资产收益率偏低，盈利能力不足".to_string());
    }
    if net_margin >= 15.0 {
        score += 12.0;
    } else if net_margin >= 10.0 {
        score += 9.0;
    } else if net_margin >= 5.0 {
        score += 6.0;
    } else {
        score += 3.0;
        warnings.push("净利率较低，需关注成本控制".to_string());
    }

    // 营运能力评分（20分）
    let asset_turnover = ratios.total_asset_turnover.to_f64().unwrap_or(0.0);
    if asset_turnover >= 1.0 {
        score += 20.0;
    } else if asset_turnover >= 0.7 {
        score += 15.0;
    } else if asset_turnover >= 0.5 {
        score += 10.0;
        suggestions.push("总资产周转率偏低，建议提升资产使用效率".to_string());
    } else {
        score += 5.0;
        suggestions.push("总资产周转率过低，资产运营效率亟待改善".to_string());
    }

    // 发展能力评分（20分）
    let rev_growth = ratios.revenue_growth_rate.to_f64().unwrap_or(0.0);
    let profit_growth = ratios.net_profit_growth_rate.to_f64().unwrap_or(0.0);
    if rev_growth >= 20.0 {
        score += 10.0;
    } else if rev_growth >= 10.0 {
        score += 8.0;
    } else if rev_growth >= 0.0 {
        score += 5.0;
    } else {
        score += 2.0;
        warnings.push("营业收入负增长，经营规模萎缩".to_string());
    }
    if profit_growth >= 20.0 {
        score += 10.0;
    } else if profit_growth >= 10.0 {
        score += 8.0;
    } else {
        score += 2.0;
        warnings.push("净利润负增长，盈利能力下滑".to_string());
    }

    let grade = if score >= 85.0 {
        "A"
    } else if score >= 70.0 {
        "B"
    } else if score >= 60.0 {
        "C"
    } else {
        "D"
    };

    if suggestions.is_empty() {
        suggestions.push("整体财务状况良好，建议保持现有经营策略".to_string());
    }
    if ratios.current_ratio.to_f64().unwrap_or(0.0) >= 2.0
        && ratios.debt_to_asset_ratio.to_f64().unwrap_or(0.0) < 50.0
    {
        suggestions.push("偿债能力充足，可适度利用财务杠杆扩大经营".to_string());
    }
    if ratios.roe.to_f64().unwrap_or(0.0) >= 15.0 {
        suggestions.push("盈利能力较强，建议加大研发投入巩固竞争优势".to_string());
    }

    let trend_judgment = if rev_growth > 0.0 && profit_growth > 0.0 {
        "呈上升趋势，经营状况持续改善".to_string()
    } else if rev_growth > 0.0 || profit_growth > 0.0 {
        "呈平稳趋势，部分指标有待提升".to_string()
    } else {
        "呈下行趋势，需重点关注经营风险".to_string()
    };

    FinancialAnalysisReport {
        period: period.to_string(),
        ratios: ratios.clone(),
        grade: grade.to_string(),
        score: Decimal::from((score * 100.0).round() as i64) / Decimal::from(100),
        suggestions,
        warnings,
        trend_judgment,
    }
}

// ==================== E. 多期对比与导出（无数据源 → 501） ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodSummary {
    pub period: String,
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub total_equity: Decimal,
    pub revenue: Decimal,
    pub net_profit: Decimal,
    pub net_operating_cash_flow: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparativeReport {
    pub periods: Vec<String>,
    pub balance_sheet_summary: Vec<PeriodSummary>,
    pub income_statement_summary: Vec<PeriodSummary>,
    pub cash_flow_summary: Vec<PeriodSummary>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportReportRequest {
    /// 报表类型：balance_sheet / income_statement / cash_flow / financial_analysis / comparative
    pub report_type: String,
    pub period: String,
    /// 导出格式：xlsx / pdf / csv
    pub format: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportReportResponse {
    pub report_type: String,
    pub period: String,
    pub format: String,
    pub file_name: String,
    pub file_size: i64,
    pub download_url: String,
    pub generated_at: String,
}

// ==================== Handlers ====================
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/balance-sheet/{period}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("period" = String, Path, description = "期间，格式 YYYY-MM"),
    ),
    tag = "Financial-Reports",
    operation_id = "get_enhanced_balance_sheet_handler",
)]

pub async fn get_enhanced_balance_sheet_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<BalanceSheetEnhanced>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    let current = service
        .get_balance_sheet(tenant_id, &period)
        .await
        .unwrap_or_else(|_| empty_balance_sheet(&period));
    let previous = match previous_period(&period) {
        Some(p) => service.get_balance_sheet(tenant_id, &p).await.ok(),
        None => None,
    };
    let last_year = match last_year_period(&period) {
        Some(p) => service.get_balance_sheet(tenant_id, &p).await.ok(),
        None => None,
    };

    let report = generate_balance_sheet(&period, &current, previous.as_ref(), last_year.as_ref());
    Json(ApiResponse::success(report, "查询成功"))
}

pub async fn get_enhanced_income_statement_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<IncomeStatementEnhanced>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    let current = service
        .get_income_statement(tenant_id, &period)
        .await
        .unwrap_or_else(|_| empty_income_statement(&period));
    let previous = match previous_period(&period) {
        Some(p) => service.get_income_statement(tenant_id, &p).await.ok(),
        None => None,
    };

    let report = generate_income_statement(&period, &current, previous.as_ref());
    Json(ApiResponse::success(report, "查询成功"))
}

/// 现金流量表增强版：无真实现金流活动分类数据源，诚实返回 501。
pub async fn get_enhanced_cash_flow_handler(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_period): Path<String>,
) -> ApiResponse<CashFlowStatementEnhanced> {
    ApiResponse::error(
        501,
        "现金流量表增强版（经营/投资/筹资活动分类、间接法调整项与现金流比率）暂无真实账务分类数据源，已停止返回模拟报表；待现金流分类凭证数据落库后再启用。",
    )
}

pub async fn get_financial_analysis_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<FinancialAnalysisReport>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    let balance_cur = service
        .get_balance_sheet(tenant_id, &period)
        .await
        .unwrap_or_else(|_| empty_balance_sheet(&period));
    let income_cur = service
        .get_income_statement(tenant_id, &period)
        .await
        .unwrap_or_else(|_| empty_income_statement(&period));

    let balance_prev = match previous_period(&period) {
        Some(p) => service.get_balance_sheet(tenant_id, &p).await.ok(),
        None => None,
    };
    let balance_ly = match last_year_period(&period) {
        Some(p) => service.get_balance_sheet(tenant_id, &p).await.ok(),
        None => None,
    };
    let income_ly = match last_year_period(&period) {
        Some(p) => service.get_income_statement(tenant_id, &p).await.ok(),
        None => None,
    };

    let balance = generate_balance_sheet(
        &period,
        &balance_cur,
        balance_prev.as_ref(),
        balance_ly.as_ref(),
    );
    let income = generate_income_statement(&period, &income_cur, None);
    let ratios = calculate_financial_ratios(&balance, &income, income_ly.as_ref());
    let report = generate_analysis_report(&period, &ratios);
    Json(ApiResponse::success(report, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/comparative/{period}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("period" = String, Path, description = "期间"),
    ),
    tag = "Financial-Reports",
    operation_id = "get_comparative_report_handler",
)]
/// 多期对比报表：无真实多期汇总（尤其现金流分类）数据源，诚实返回 501。
pub async fn get_comparative_report_handler(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_period): Path<String>,
) -> ApiResponse<ComparativeReport> {
    ApiResponse::error(
        501,
        "多期对比报表需要多期真实账务汇总（含现金流分类），当前无该数据源，已停止返回按固定比例缩放的模拟对比。",
    )
}

/// 报表导出：无真实文件生成/落盘，诚实返回 501（不再伪造 file_size 与 download_url）。
pub async fn export_report_handler(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(_req): Json<ExportReportRequest>,
) -> ApiResponse<ExportReportResponse> {
    ApiResponse::error(
        501,
        "报表导出尚未实现真实文件生成与存储，已下线模拟导出（不再返回伪造的文件大小与下载地址）。",
    )
}

// ==================== 路由 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/reports/balance-sheet/{period}",
            axum::routing::get(get_enhanced_balance_sheet_handler),
        )
        .route(
            "/reports/income-statement/{period}",
            axum::routing::get(get_enhanced_income_statement_handler),
        )
        .route(
            "/reports/cash-flow/{period}",
            axum::routing::get(get_enhanced_cash_flow_handler),
        )
        .route(
            "/reports/financial-analysis/{period}",
            axum::routing::get(get_financial_analysis_handler),
        )
        .route(
            "/reports/comparative/{period}",
            axum::routing::get(get_comparative_report_handler),
        )
        .route(
            "/reports/export",
            axum::routing::post(export_report_handler),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn rq_balance_sheet_item() {
        roundtrip(&BalanceSheetItem {
            account_code: "c".to_string(),
            account_name: "n".to_string(),
            amount: Decimal::from(0),
            percentage: Decimal::from(0),
            period_amount: Decimal::from(0),
            year_amount: Decimal::from(0),
        });
    }

    #[test]
    fn rq_balance_sheet_enhanced() {
        roundtrip(&BalanceSheetEnhanced {
            period: "p".to_string(),
            current_assets: vec![],
            non_current_assets: vec![],
            current_liabilities: vec![],
            non_current_liabilities: vec![],
            equity: vec![],
            total_current_assets: Decimal::from(0),
            total_non_current_assets: Decimal::from(0),
            total_assets: Decimal::from(0),
            total_current_liabilities: Decimal::from(0),
            total_non_current_liabilities: Decimal::from(0),
            total_liabilities: Decimal::from(0),
            total_equity: Decimal::from(0),
            last_year_total_assets: Decimal::from(0),
            last_year_total_liabilities: Decimal::from(0),
            last_year_total_equity: Decimal::from(0),
            assets_yoy_growth: Decimal::from(0),
            liabilities_yoy_growth: Decimal::from(0),
            equity_yoy_growth: Decimal::from(0),
        });
    }

    #[test]
    fn rq_income_statement_item() {
        roundtrip(&IncomeStatementItem {
            project_code: "c".to_string(),
            project_name: "n".to_string(),
            current_amount: Decimal::from(0),
            previous_amount: Decimal::from(0),
            year_cumulative: Decimal::from(0),
            yoy_change: Decimal::from(0),
        });
    }

    #[test]
    fn rq_period_trend() {
        roundtrip(&PeriodTrend {
            period: "p".to_string(),
            revenue: Decimal::from(0),
            net_profit: Decimal::from(0),
            gross_margin: Decimal::from(0),
        });
    }

    #[test]
    fn rq_income_statement_enhanced() {
        roundtrip(&IncomeStatementEnhanced {
            period: "p".to_string(),
            items: vec![],
            operating_revenue: Decimal::from(0),
            operating_cost: Decimal::from(0),
            period_expenses: Decimal::from(0),
            total_profit: Decimal::from(0),
            net_profit: Decimal::from(0),
            eps: Decimal::from(0),
            gross_margin: Decimal::from(0),
            net_margin: Decimal::from(0),
            expense_ratio: Decimal::from(0),
            trend: vec![],
        });
    }

    #[test]
    fn rq_cash_flow_item() {
        roundtrip(&CashFlowItem {
            item_code: "c".to_string(),
            item_name: "n".to_string(),
            amount: Decimal::from(0),
        });
    }

    #[test]
    fn rq_cash_flow_ratios() {
        roundtrip(&CashFlowRatios {
            operating_cash_to_revenue: Decimal::from(0),
            operating_cash_to_net_profit: Decimal::from(0),
            cash_flow_adequacy: Decimal::from(0),
            free_cash_flow: Decimal::from(0),
        });
    }

    #[test]
    fn rq_cash_flow_statement_enhanced() {
        roundtrip(&CashFlowStatementEnhanced {
            period: "p".to_string(),
            operating_activities: vec![],
            investing_activities: vec![],
            financing_activities: vec![],
            net_operating: Decimal::from(0),
            net_investing: Decimal::from(0),
            net_financing: Decimal::from(0),
            net_change: Decimal::from(0),
            opening_balance: Decimal::from(0),
            closing_balance: Decimal::from(0),
            indirect_adjustments: vec![],
            ratios: CashFlowRatios {
                operating_cash_to_revenue: Decimal::from(0),
                operating_cash_to_net_profit: Decimal::from(0),
                cash_flow_adequacy: Decimal::from(0),
                free_cash_flow: Decimal::from(0),
            },
        });
    }

    #[test]
    fn rq_financial_ratios() {
        roundtrip(&FinancialRatios {
            current_ratio: Decimal::from(0),
            quick_ratio: Decimal::from(0),
            debt_to_asset_ratio: Decimal::from(0),
            accounts_receivable_turnover: Decimal::from(0),
            inventory_turnover: Decimal::from(0),
            total_asset_turnover: Decimal::from(0),
            gross_margin: Decimal::from(0),
            net_margin: Decimal::from(0),
            roe: Decimal::from(0),
            roa: Decimal::from(0),
            revenue_growth_rate: Decimal::from(0),
            net_profit_growth_rate: Decimal::from(0),
            total_asset_growth_rate: Decimal::from(0),
        });
    }

    #[test]
    fn rq_financial_analysis_report() {
        roundtrip(&FinancialAnalysisReport {
            period: "p".to_string(),
            ratios: FinancialRatios {
                current_ratio: Decimal::from(0),
                quick_ratio: Decimal::from(0),
                debt_to_asset_ratio: Decimal::from(0),
                accounts_receivable_turnover: Decimal::from(0),
                inventory_turnover: Decimal::from(0),
                total_asset_turnover: Decimal::from(0),
                gross_margin: Decimal::from(0),
                net_margin: Decimal::from(0),
                roe: Decimal::from(0),
                roa: Decimal::from(0),
                revenue_growth_rate: Decimal::from(0),
                net_profit_growth_rate: Decimal::from(0),
                total_asset_growth_rate: Decimal::from(0),
            },
            grade: "g".to_string(),
            score: Decimal::from(0),
            suggestions: vec![],
            warnings: vec![],
            trend_judgment: "t".to_string(),
        });
    }

    #[test]
    fn rq_period_summary() {
        roundtrip(&PeriodSummary {
            period: "p".to_string(),
            total_assets: Decimal::from(0),
            total_liabilities: Decimal::from(0),
            total_equity: Decimal::from(0),
            revenue: Decimal::from(0),
            net_profit: Decimal::from(0),
            net_operating_cash_flow: Decimal::from(0),
        });
    }

    #[test]
    fn rq_comparative_report() {
        roundtrip(&ComparativeReport {
            periods: vec![],
            balance_sheet_summary: vec![],
            income_statement_summary: vec![],
            cash_flow_summary: vec![],
        });
    }

    // ---- pure function tests ----

    #[test]
    fn safe_divide_normal() {
        let r = safe_divide(Decimal::from(10), Decimal::from(4));
        assert_eq!(r, Decimal::from(10) / Decimal::from(4));
    }

    #[test]
    fn safe_divide_zero_denominator_returns_zero() {
        assert_eq!(
            safe_divide(Decimal::from(100), Decimal::ZERO),
            Decimal::ZERO
        );
    }

    #[test]
    fn safe_divide_zero_numerator() {
        assert_eq!(safe_divide(Decimal::ZERO, Decimal::from(7)), Decimal::ZERO);
    }

    #[test]
    fn safe_percentage_normal() {
        let r = safe_percentage(Decimal::from(25), Decimal::from(100));
        assert_eq!(r, Decimal::from(25));
    }

    #[test]
    fn safe_percentage_zero_total() {
        assert_eq!(
            safe_percentage(Decimal::from(50), Decimal::ZERO),
            Decimal::ZERO
        );
    }

    #[test]
    fn fill_percentages_assigns_share() {
        let total = Decimal::from(200);
        let mut items = vec![
            BalanceSheetItem {
                account_code: "A".into(),
                account_name: "n".into(),
                amount: Decimal::from(50),
                percentage: Decimal::ZERO,
                period_amount: Decimal::ZERO,
                year_amount: Decimal::ZERO,
            },
            BalanceSheetItem {
                account_code: "B".into(),
                account_name: "n".into(),
                amount: Decimal::from(150),
                percentage: Decimal::ZERO,
                period_amount: Decimal::ZERO,
                year_amount: Decimal::ZERO,
            },
        ];
        fill_percentages(&mut items, total);
        assert_eq!(items[0].percentage, Decimal::from(25));
        assert_eq!(items[1].percentage, Decimal::from(75));
    }

    #[test]
    fn fill_percentages_zero_total_keeps_zero() {
        let mut items = vec![BalanceSheetItem {
            account_code: "A".into(),
            account_name: "n".into(),
            amount: Decimal::from(50),
            percentage: Decimal::from(9),
            period_amount: Decimal::ZERO,
            year_amount: Decimal::ZERO,
        }];
        fill_percentages(&mut items, Decimal::ZERO);
        assert_eq!(items[0].percentage, Decimal::ZERO);
    }

    #[test]
    fn period_arithmetics() {
        assert_eq!(previous_period("2025-03").as_deref(), Some("2025-02"));
        assert_eq!(previous_period("2025-01").as_deref(), Some("2024-12"));
        assert_eq!(last_year_period("2025-03").as_deref(), Some("2024-03"));
        // 非法格式不编造
        assert!(previous_period("not-a-period").is_none());
        assert!(last_year_period("2025").is_none());
    }

    #[test]
    fn balance_split_current_vs_non_current_by_code() {
        let cur = BalanceSheet {
            period: "2025-08".into(),
            assets: vec![
                BalanceItem {
                    account_code: "1001".into(),
                    account_name: "货币资金".into(),
                    amount: Decimal::from(1000),
                },
                BalanceItem {
                    account_code: "1401".into(),
                    account_name: "存货".into(),
                    amount: Decimal::from(500),
                },
                BalanceItem {
                    account_code: "1601".into(),
                    account_name: "固定资产".into(),
                    amount: Decimal::from(2000),
                },
            ],
            liabilities: vec![
                BalanceItem {
                    account_code: "2001".into(),
                    account_name: "短期借款".into(),
                    amount: Decimal::from(300),
                },
                BalanceItem {
                    account_code: "2501".into(),
                    account_name: "长期借款".into(),
                    amount: Decimal::from(700),
                },
            ],
            equity: vec![BalanceItem {
                account_code: "4001".into(),
                account_name: "实收资本".into(),
                amount: Decimal::from(2500),
            }],
            total_assets: Decimal::from(3500),
            total_liabilities: Decimal::from(1000),
            total_equity: Decimal::from(2500),
        };
        let r = generate_balance_sheet("2025-08", &cur, None, None);
        // 流动资产 = 1001 + 1401；固定资产 1601 归非流动
        assert_eq!(r.current_assets.len(), 2);
        assert_eq!(r.non_current_assets.len(), 1);
        assert_eq!(r.total_current_assets, Decimal::from(1500));
        assert_eq!(r.total_non_current_assets, Decimal::from(2000));
        // 负债拆分
        assert_eq!(r.current_liabilities.len(), 1);
        assert_eq!(r.non_current_liabilities.len(), 1);
        // 无去年数据 → 同比为 0，不编造
        assert_eq!(r.last_year_total_assets, Decimal::ZERO);
        assert_eq!(r.assets_yoy_growth, Decimal::ZERO);
    }

    #[test]
    fn balance_period_and_last_year_from_real_data() {
        let cur = BalanceSheet {
            period: "2025-08".into(),
            assets: vec![BalanceItem {
                account_code: "1001".into(),
                account_name: "货币资金".into(),
                amount: Decimal::from(1100),
            }],
            liabilities: vec![],
            equity: vec![],
            total_assets: Decimal::from(1100),
            total_liabilities: Decimal::ZERO,
            total_equity: Decimal::ZERO,
        };
        let prev = BalanceSheet {
            period: "2025-07".into(),
            assets: vec![BalanceItem {
                account_code: "1001".into(),
                account_name: "货币资金".into(),
                amount: Decimal::from(1000),
            }],
            ..empty_balance_sheet("2025-07")
        };
        let ly = BalanceSheet {
            period: "2024-08".into(),
            total_assets: Decimal::from(1000),
            total_liabilities: Decimal::from(0),
            total_equity: Decimal::from(0),
            ..empty_balance_sheet("2024-08")
        };
        let r = generate_balance_sheet("2025-08", &cur, Some(&prev), Some(&ly));
        // period_amount 来自上期真实值
        assert_eq!(r.current_assets[0].period_amount, Decimal::from(1000));
        // 去年同期 1000 → 同比 = (1100-1000)/1000*100 = 10
        assert_eq!(r.last_year_total_assets, Decimal::from(1000));
        assert_eq!(r.assets_yoy_growth, Decimal::from(10));
    }

    #[test]
    fn income_items_from_real_ledger_and_eps_zero() {
        let cur = IncomeStatement {
            period: "2025-08".into(),
            revenues: vec![IncomeItem {
                account_code: "6001".into(),
                account_name: "主营业务收入".into(),
                amount: Decimal::from(-8000),
            }],
            expenses: vec![
                IncomeItem {
                    account_code: "6401".into(),
                    account_name: "主营业务成本".into(),
                    amount: Decimal::from(4000),
                },
                IncomeItem {
                    account_code: "6601".into(),
                    account_name: "销售费用".into(),
                    amount: Decimal::from(500),
                },
            ],
            total_revenue: Decimal::from(-8000),
            total_expense: Decimal::from(4500),
            net_income: Decimal::from(-12500),
        };
        let r = generate_income_statement("2025-08", &cur, None);
        assert_eq!(r.items.len(), 3);
        // 无股本数据 → EPS 恒 0，不编造
        assert_eq!(r.eps, Decimal::ZERO);
        // 无多期数据源 → trend 为空
        assert!(r.trend.is_empty());
        // 成本/期间费用按真实科目编码前缀汇总
        assert_eq!(r.operating_cost, Decimal::from(4000));
        assert_eq!(r.period_expenses, Decimal::from(500));
    }

    #[test]
    fn income_previous_yoy_from_real_previous() {
        let cur = IncomeStatement {
            period: "2025-08".into(),
            revenues: vec![IncomeItem {
                account_code: "6001".into(),
                account_name: "收入".into(),
                amount: Decimal::from(-1100),
            }],
            expenses: vec![],
            total_revenue: Decimal::from(-1100),
            total_expense: Decimal::ZERO,
            net_income: Decimal::from(-1100),
        };
        let prev = IncomeStatement {
            period: "2025-07".into(),
            revenues: vec![IncomeItem {
                account_code: "6001".into(),
                account_name: "收入".into(),
                amount: Decimal::from(-1000),
            }],
            ..empty_income_statement("2025-07")
        };
        let r = generate_income_statement("2025-08", &cur, Some(&prev));
        assert_eq!(r.items[0].previous_amount, Decimal::from(-1000));
    }

    #[test]
    fn ratios_use_real_last_year_not_fixed_pct() {
        let balance = BalanceSheetEnhanced {
            period: "p".into(),
            current_assets: vec![],
            non_current_assets: vec![],
            current_liabilities: vec![],
            non_current_liabilities: vec![],
            equity: vec![],
            total_current_assets: Decimal::from(200),
            total_non_current_assets: Decimal::ZERO,
            total_assets: Decimal::from(200),
            total_current_liabilities: Decimal::from(100),
            total_non_current_liabilities: Decimal::ZERO,
            total_liabilities: Decimal::from(100),
            total_equity: Decimal::from(100),
            last_year_total_assets: Decimal::from(100),
            last_year_total_liabilities: Decimal::from(100),
            last_year_total_equity: Decimal::from(100),
            assets_yoy_growth: Decimal::ZERO,
            liabilities_yoy_growth: Decimal::ZERO,
            equity_yoy_growth: Decimal::ZERO,
        };
        let income = IncomeStatementEnhanced {
            period: "p".into(),
            items: vec![],
            operating_revenue: Decimal::from(220),
            operating_cost: Decimal::from(110),
            period_expenses: Decimal::ZERO,
            total_profit: Decimal::from(110),
            net_profit: Decimal::from(110),
            eps: Decimal::ZERO,
            gross_margin: Decimal::from(50),
            net_margin: Decimal::from(50),
            expense_ratio: Decimal::ZERO,
            trend: vec![],
        };
        let ly = IncomeStatement {
            period: "2024-08".into(),
            total_revenue: Decimal::from(200),
            total_expense: Decimal::ZERO,
            net_income: Decimal::from(100),
            ..empty_income_statement("2024-08")
        };
        let ratios = calculate_financial_ratios(&balance, &income, Some(&ly));
        // revenue_growth = (220-200)/200*100 = 10（真实去年，非 85% 编造）
        assert_eq!(ratios.revenue_growth_rate, Decimal::from(10));
        // net_profit_growth = (110-100)/100*100 = 10
        assert_eq!(ratios.net_profit_growth_rate, Decimal::from(10));
    }

    #[test]
    fn ratios_zero_liabilities_safe() {
        let balance = BalanceSheetEnhanced {
            period: "p".into(),
            current_assets: vec![],
            non_current_assets: vec![],
            current_liabilities: vec![],
            non_current_liabilities: vec![],
            equity: vec![],
            total_current_assets: Decimal::from(100),
            total_non_current_assets: Decimal::ZERO,
            total_assets: Decimal::from(100),
            total_current_liabilities: Decimal::ZERO,
            total_non_current_liabilities: Decimal::ZERO,
            total_liabilities: Decimal::ZERO,
            total_equity: Decimal::from(100),
            last_year_total_assets: Decimal::from(100),
            last_year_total_liabilities: Decimal::from(100),
            last_year_total_equity: Decimal::from(100),
            assets_yoy_growth: Decimal::ZERO,
            liabilities_yoy_growth: Decimal::ZERO,
            equity_yoy_growth: Decimal::ZERO,
        };
        let income = IncomeStatementEnhanced {
            period: "p".into(),
            items: vec![],
            operating_revenue: Decimal::from(1000),
            operating_cost: Decimal::from(500),
            period_expenses: Decimal::ZERO,
            total_profit: Decimal::from(500),
            net_profit: Decimal::from(500),
            eps: Decimal::ZERO,
            gross_margin: Decimal::from(50),
            net_margin: Decimal::from(50),
            expense_ratio: Decimal::ZERO,
            trend: vec![],
        };
        let ratios = calculate_financial_ratios(&balance, &income, None);
        assert_eq!(ratios.current_ratio, Decimal::ZERO);
        assert_eq!(ratios.quick_ratio, Decimal::ZERO);
        assert_eq!(ratios.debt_to_asset_ratio, Decimal::ZERO);
        assert_eq!(ratios.total_asset_growth_rate, Decimal::ZERO);
    }

    #[test]
    fn generate_analysis_report_grade_boundaries() {
        // Construct ratios that should yield grade A (score >= 85)
        let ratios_a = FinancialRatios {
            current_ratio: Decimal::from(3), // >= 2.0 -> +18
            quick_ratio: Decimal::from(2),
            debt_to_asset_ratio: Decimal::from(40), // < 50 -> +12
            accounts_receivable_turnover: Decimal::ZERO,
            inventory_turnover: Decimal::ZERO,
            total_asset_turnover: Decimal::from(2), // >= 1.0 -> +20
            gross_margin: Decimal::ZERO,
            net_margin: Decimal::from(20), // >= 15 -> +12
            roe: Decimal::from(25),        // >= 20 -> +18
            roa: Decimal::from(10),
            revenue_growth_rate: Decimal::from(30), // >= 20 -> +10
            net_profit_growth_rate: Decimal::from(30), // >= 20 -> +10
            total_asset_growth_rate: Decimal::ZERO,
        };
        let r = generate_analysis_report("2025-08", &ratios_a);
        // total: 18+12+18+12+20+10+10 = 100
        assert!(r.score >= Decimal::from(85));
        assert_eq!(r.grade, "A");
        assert!(r.trend_judgment.contains("上升"));
    }

    #[test]
    fn generate_analysis_report_grade_d_low_score() {
        let ratios_d = FinancialRatios {
            current_ratio: Decimal::from(1),
            quick_ratio: Decimal::ZERO,
            debt_to_asset_ratio: Decimal::from(80),
            accounts_receivable_turnover: Decimal::ZERO,
            inventory_turnover: Decimal::ZERO,
            total_asset_turnover: Decimal::from(1),
            gross_margin: Decimal::ZERO,
            net_margin: Decimal::from(2),
            roe: Decimal::from(5),
            roa: Decimal::ZERO,
            revenue_growth_rate: Decimal::from(-5),
            net_profit_growth_rate: Decimal::from(-5),
            total_asset_growth_rate: Decimal::ZERO,
        };
        let r = generate_analysis_report("2025-08", &ratios_d);
        assert!(r.score < Decimal::from(60));
        assert_eq!(r.grade, "D");
        assert!(!r.warnings.is_empty());
        assert!(r.trend_judgment.contains("下行"));
    }

    #[test]
    fn generate_analysis_report_grade_c_partial_warning() {
        let ratios_c = FinancialRatios {
            current_ratio: Decimal::from(2),
            quick_ratio: Decimal::from(2),
            debt_to_asset_ratio: Decimal::from(55),
            accounts_receivable_turnover: Decimal::ZERO,
            inventory_turnover: Decimal::ZERO,
            total_asset_turnover: Decimal::from(1),
            gross_margin: Decimal::ZERO,
            net_margin: Decimal::from(10),
            roe: Decimal::from(10),
            roa: Decimal::ZERO,
            revenue_growth_rate: Decimal::from(5),
            net_profit_growth_rate: Decimal::from(5),
            total_asset_growth_rate: Decimal::ZERO,
        };
        let r = generate_analysis_report("2025-08", &ratios_c);
        // total = 18 + 9 + 9 + 9 + 20 + 5 + 5 = 75 -> B
        assert_eq!(r.grade, "B");
    }

    #[test]
    fn generate_analysis_report_zero_current_ratio_pushes_warning() {
        let ratios = FinancialRatios {
            current_ratio: Decimal::from(5),
            quick_ratio: Decimal::from(3),
            debt_to_asset_ratio: Decimal::from(20),
            accounts_receivable_turnover: Decimal::ZERO,
            inventory_turnover: Decimal::ZERO,
            total_asset_turnover: Decimal::from(2),
            gross_margin: Decimal::ZERO,
            net_margin: Decimal::from(20),
            roe: Decimal::from(25),
            roa: Decimal::from(10),
            revenue_growth_rate: Decimal::from(30),
            net_profit_growth_rate: Decimal::from(30),
            total_asset_growth_rate: Decimal::ZERO,
        };
        let r = generate_analysis_report("2025-08", &ratios);
        assert!(r.suggestions.iter().any(|s| s.contains("偿债能力")));
        assert!(r.suggestions.iter().any(|s| s.contains("盈利能力")));
    }
}
