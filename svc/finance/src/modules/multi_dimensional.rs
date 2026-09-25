#![allow(dead_code)] // Reserved: 多维度分析模块，待业务接入后启用

//! V49.0 Finance 多维度分析模块
//!
//! 提供成本中心分析、利润中心分析、项目核算分析能力。
//! 支持多维度数据聚合、结构分析、趋势分析与绩效评估。
//!
//! 路由：
//! - GET  /multi-dimensional/cost-centers/{period}
//! - GET  /multi-dimensional/cost-centers/{period}/trend
//! - GET  /multi-dimensional/cost-centers/{period}/efficiency
//! - GET  /multi-dimensional/profit-centers/{period}
//! - GET  /multi-dimensional/profit-centers/{period}/trend
//! - GET  /multi-dimensional/profit-centers/{period}/ranking
//! - GET  /multi-dimensional/projects/{period}
//! - GET  /multi-dimensional/projects/{period}/progress
//! - GET  /multi-dimensional/projects/{period}/profit
//! - GET  /multi-dimensional/projects/summary

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Duration, Utc};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

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

// ==================== 查询参数 ====================

#[derive(Debug, Clone, Deserialize, utoipa::IntoParams)]
pub struct MultiDimQueryParams {
    pub period: Option<String>,
    pub cost_center_id: Option<Uuid>,
    pub profit_center_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub department_id: Option<String>,
    pub category: Option<String>,
    pub top_n: Option<i64>,
}

// ==================== A. 成本中心分析（CostCenterAnalyzer）====================

/// 成本中心类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CostCenterType {
    Department,
    Project,
    Product,
    Region,
    Custom,
}

/// 成本中心类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CostBehavior {
    Fixed,
    Variable,
    Mixed,
}

/// 成本中心维度明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostCenterItem {
    pub cost_center_id: Uuid,
    pub cost_center_code: String,
    pub cost_center_name: String,
    pub center_type: CostCenterType,
    pub department: Option<String>,
    pub total_cost: Decimal,
    pub budget_cost: Decimal,
    pub variance: Decimal,
    pub variance_percentage: Decimal,
    pub cost_behavior: CostBehavior,
    pub headcount: i64,
    pub cost_per_head: Decimal,
}

/// 成本中心分类汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostCategorySummary {
    pub category: String,
    pub total_amount: Decimal,
    pub proportion: Decimal,
    pub center_count: i64,
}

/// 成本中心趋势点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostTrendPoint {
    pub period: String,
    pub total_cost: Decimal,
    pub budget_cost: Decimal,
    pub variance: Decimal,
    pub change_percentage: Decimal,
}

/// 成本中心效率指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostEfficiency {
    pub cost_center_id: Uuid,
    pub cost_center_name: String,
    pub output_value: Decimal,
    pub total_cost: Decimal,
    pub efficiency_ratio: Decimal,
    pub cost_per_unit: Decimal,
    pub benchmark: Decimal,
    pub ranking: i64,
}

/// 成本中心分析报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostCenterReport {
    pub report_id: Uuid,
    pub period: String,
    pub total_cost: Decimal,
    pub total_budget: Decimal,
    pub total_variance: Decimal,
    pub variance_percentage: Decimal,
    pub center_count: i64,
    pub items: Vec<CostCenterItem>,
    pub category_summary: Vec<CostCategorySummary>,
}

/// 成本中心分析器
pub struct CostCenterAnalyzer;

impl CostCenterAnalyzer {
    fn build_item(
        id: Uuid,
        code: &str,
        name: &str,
        center_type: CostCenterType,
        dept: Option<&str>,
        total: i64,
        budget: i64,
        behavior: CostBehavior,
        headcount: i64,
    ) -> CostCenterItem {
        let total_d = Decimal::from(total);
        let budget_d = Decimal::from(budget);
        let variance = total_d - budget_d;
        let variance_percentage = safe_percentage(variance, budget_d);
        let cost_per_head = if headcount > 0 {
            total_d / Decimal::from(headcount)
        } else {
            Decimal::ZERO
        };
        CostCenterItem {
            cost_center_id: id,
            cost_center_code: code.to_string(),
            cost_center_name: name.to_string(),
            center_type,
            department: dept.map(|s| s.to_string()),
            total_cost: total_d,
            budget_cost: budget_d,
            variance,
            variance_percentage,
            cost_behavior: behavior,
            headcount,
            cost_per_head,
        }
    }

    pub fn analyze(period: &str) -> CostCenterReport {
        let items = vec![
            Self::build_item(
                Uuid::new_v4(),
                "CC-0101",
                "研发中心",
                CostCenterType::Department,
                Some("技术部"),
                1_280_000,
                1_200_000,
                CostBehavior::Mixed,
                28,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "CC-0102",
                "市场中心",
                CostCenterType::Department,
                Some("市场部"),
                680_000,
                720_000,
                CostBehavior::Variable,
                12,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "CC-0103",
                "销售中心",
                CostCenterType::Department,
                Some("销售部"),
                820_000,
                800_000,
                CostBehavior::Variable,
                18,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "CC-0104",
                "行政中心",
                CostCenterType::Department,
                Some("行政部"),
                320_000,
                325_000,
                CostBehavior::Fixed,
                8,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "CC-0201",
                "华东大区",
                CostCenterType::Region,
                None,
                540_000,
                500_000,
                CostBehavior::Mixed,
                15,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "CC-0202",
                "华南大区",
                CostCenterType::Region,
                None,
                460_000,
                480_000,
                CostBehavior::Mixed,
                12,
            ),
        ];

        let total_cost: Decimal = items.iter().map(|i| i.total_cost).sum();
        let total_budget: Decimal = items.iter().map(|i| i.budget_cost).sum();
        let total_variance = total_cost - total_budget;
        let variance_percentage = safe_percentage(total_variance, total_budget);

        let mut category_map: HashMap<String, (Decimal, i64)> = HashMap::new();
        for item in &items {
            let key = format!("{:?}", item.center_type);
            let entry = category_map.entry(key).or_insert((Decimal::ZERO, 0));
            entry.0 += item.total_cost;
            entry.1 += 1;
        }

        let category_summary = category_map
            .into_iter()
            .map(|(k, v)| CostCategorySummary {
                category: k,
                total_amount: v.0,
                proportion: safe_percentage(v.0, total_cost),
                center_count: v.1,
            })
            .collect();

        CostCenterReport {
            report_id: Uuid::new_v4(),
            period: period.to_string(),
            total_cost,
            total_budget,
            total_variance,
            variance_percentage,
            center_count: items.len() as i64,
            items,
            category_summary,
        }
    }

    pub fn get_trend(_period: &str) -> Vec<CostTrendPoint> {
        let base = Utc::now();
        let labels = [
            "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
        ];
        let mut prev = Decimal::from(3_850_000);
        labels
            .iter()
            .enumerate()
            .map(|(i, p)| {
                let delta = Decimal::from(12_000 * (i as i64 - 2));
                let total = prev + delta;
                let budget = Decimal::from(3_900_000);
                let variance = total - budget;
                let change = safe_percentage(total - prev, prev);
                prev = total;
                let _ = base + Duration::days(i as i64 * 30);
                CostTrendPoint {
                    period: p.to_string(),
                    total_cost: total,
                    budget_cost: budget,
                    variance,
                    change_percentage: change,
                }
            })
            .collect()
    }

    pub fn get_efficiency(period: &str) -> Vec<CostEfficiency> {
        let report = Self::analyze(period);
        let mut list: Vec<CostEfficiency> = report
            .items
            .into_iter()
            .map(|i| {
                let output = i.total_cost * Decimal::from(120) / Decimal::from(100);
                let ratio = safe_divide(output, i.total_cost);
                let per_unit = safe_divide(i.total_cost, Decimal::from(i.headcount.max(1)));
                CostEfficiency {
                    cost_center_id: i.cost_center_id,
                    cost_center_name: i.cost_center_name,
                    output_value: output,
                    total_cost: i.total_cost,
                    efficiency_ratio: ratio,
                    cost_per_unit: per_unit,
                    benchmark: Decimal::from(110),
                    ranking: 0,
                }
            })
            .collect();

        list.sort_by(|a, b| b.efficiency_ratio.cmp(&a.efficiency_ratio));
        list.iter_mut()
            .enumerate()
            .for_each(|(i, e)| e.ranking = (i + 1) as i64);
        list
    }
}

// ==================== B. 利润中心分析（ProfitCenterAnalyzer）====================

/// 利润中心类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProfitCenterType {
    ProductLine,
    BusinessUnit,
    Region,
    CustomerSegment,
    Project,
}

/// 利润中心明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitCenterItem {
    pub profit_center_id: Uuid,
    pub profit_center_code: String,
    pub profit_center_name: String,
    pub center_type: ProfitCenterType,
    pub revenue: Decimal,
    pub cost: Decimal,
    pub gross_profit: Decimal,
    pub gross_margin: Decimal,
    pub operating_profit: Decimal,
    pub net_profit: Decimal,
    pub roi: Decimal,
    pub revenue_growth: Decimal,
    pub profit_growth: Decimal,
}

/// 利润中心排名项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitCenterRanking {
    pub rank: i64,
    pub profit_center_id: Uuid,
    pub profit_center_name: String,
    pub total_score: Decimal,
    pub revenue_score: Decimal,
    pub margin_score: Decimal,
    pub growth_score: Decimal,
    pub roi_score: Decimal,
}

/// 利润中心趋势点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitTrendPoint {
    pub period: String,
    pub revenue: Decimal,
    pub cost: Decimal,
    pub gross_profit: Decimal,
    pub gross_margin: Decimal,
}

/// 利润中心分析报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitCenterReport {
    pub report_id: Uuid,
    pub period: String,
    pub total_revenue: Decimal,
    pub total_cost: Decimal,
    pub total_gross_profit: Decimal,
    pub overall_gross_margin: Decimal,
    pub total_operating_profit: Decimal,
    pub total_net_profit: Decimal,
    pub center_count: i64,
    pub items: Vec<ProfitCenterItem>,
}

/// 利润中心分析器
pub struct ProfitCenterAnalyzer;

impl ProfitCenterAnalyzer {
    fn build_item(
        id: Uuid,
        code: &str,
        name: &str,
        center_type: ProfitCenterType,
        revenue: i64,
        cost: i64,
        growth: i64,
    ) -> ProfitCenterItem {
        let rev = Decimal::from(revenue);
        let cst = Decimal::from(cost);
        let gp = rev - cst;
        let gm = safe_percentage(gp, rev);
        let op = gp - (cst * Decimal::from(15) / Decimal::from(100));
        let np_raw = op - (op * Decimal::from(25) / Decimal::from(100));
        let np = if np_raw < Decimal::ZERO {
            Decimal::ZERO
        } else {
            np_raw
        };
        let invested = cst * Decimal::from(12) / Decimal::from(100);
        let roi = safe_percentage(np, invested);
        let rev_growth = Decimal::from(growth);
        let profit_growth = Decimal::from(growth + 5);

        ProfitCenterItem {
            profit_center_id: id,
            profit_center_code: code.to_string(),
            profit_center_name: name.to_string(),
            center_type,
            revenue: rev,
            cost: cst,
            gross_profit: gp,
            gross_margin: gm,
            operating_profit: op,
            net_profit: np,
            roi,
            revenue_growth: rev_growth,
            profit_growth,
        }
    }

    pub fn analyze(period: &str) -> ProfitCenterReport {
        let items = vec![
            Self::build_item(
                Uuid::new_v4(),
                "PC-P01",
                "云服务产品线",
                ProfitCenterType::ProductLine,
                2_450_000,
                1_480_000,
                18,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PC-P02",
                "企业软件产品线",
                ProfitCenterType::ProductLine,
                1_820_000,
                1_020_000,
                12,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PC-B01",
                "金融业务单元",
                ProfitCenterType::BusinessUnit,
                3_260_000,
                1_920_000,
                9,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PC-B02",
                "制造业务单元",
                ProfitCenterType::BusinessUnit,
                2_180_000,
                1_540_000,
                -3,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PC-R01",
                "华东区域",
                ProfitCenterType::Region,
                1_450_000,
                980_000,
                14,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PC-R02",
                "华南区域",
                ProfitCenterType::Region,
                1_120_000,
                780_000,
                7,
            ),
        ];

        let total_revenue: Decimal = items.iter().map(|i| i.revenue).sum();
        let total_cost: Decimal = items.iter().map(|i| i.cost).sum();
        let total_gp = total_revenue - total_cost;
        let overall_gm = safe_percentage(total_gp, total_revenue);
        let total_op: Decimal = items.iter().map(|i| i.operating_profit).sum();
        let total_np: Decimal = items.iter().map(|i| i.net_profit).sum();

        ProfitCenterReport {
            report_id: Uuid::new_v4(),
            period: period.to_string(),
            total_revenue,
            total_cost,
            total_gross_profit: total_gp,
            overall_gross_margin: overall_gm,
            total_operating_profit: total_op,
            total_net_profit: total_np,
            center_count: items.len() as i64,
            items,
        }
    }

    pub fn get_trend(_period: &str) -> Vec<ProfitTrendPoint> {
        let labels = [
            "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
        ];
        let mut rev = Decimal::from(10_800_000);
        labels
            .iter()
            .enumerate()
            .map(|(i, p)| {
                rev += Decimal::from(80_000 * (i as i64 + 1));
                let cost = rev * Decimal::from(58) / Decimal::from(100);
                let gp = rev - cost;
                let gm = safe_percentage(gp, rev);
                ProfitTrendPoint {
                    period: p.to_string(),
                    revenue: rev,
                    cost,
                    gross_profit: gp,
                    gross_margin: gm,
                }
            })
            .collect()
    }

    pub fn get_ranking(period: &str, top_n: Option<i64>) -> Vec<ProfitCenterRanking> {
        let report = Self::analyze(period);
        let limit = top_n.unwrap_or(report.items.len() as i64);

        let mut rankings: Vec<ProfitCenterRanking> = report
            .items
            .into_iter()
            .map(|i| {
                let revenue_score = (i.revenue / Decimal::from(50_000)).min(Decimal::from(100));
                let margin_score = i.gross_margin.min(Decimal::from(100));
                let growth_score = i.profit_growth.max(Decimal::ZERO).min(Decimal::from(100));
                let roi_score = i.roi.min(Decimal::from(100));
                let total =
                    (revenue_score + margin_score + growth_score + roi_score) / Decimal::from(4);
                ProfitCenterRanking {
                    rank: 0,
                    profit_center_id: i.profit_center_id,
                    profit_center_name: i.profit_center_name,
                    total_score: total,
                    revenue_score,
                    margin_score,
                    growth_score,
                    roi_score,
                }
            })
            .collect();

        rankings.sort_by(|a, b| b.total_score.cmp(&a.total_score));
        rankings
            .iter_mut()
            .enumerate()
            .for_each(|(i, r)| r.rank = (i + 1) as i64);
        rankings.truncate(limit as usize);
        rankings
    }
}

// ==================== C. 项目核算分析（ProjectAccountingAnalyzer）====================

/// 项目状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProjectStatus {
    Planning,
    InProgress,
    OnHold,
    Completed,
    Cancelled,
}

/// 项目核算明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectAccountItem {
    pub project_id: Uuid,
    pub project_code: String,
    pub project_name: String,
    pub status: ProjectStatus,
    pub budget_amount: Decimal,
    pub actual_cost: Decimal,
    pub committed_cost: Decimal,
    pub remaining_budget: Decimal,
    pub completion_percentage: Decimal,
    pub cost_variance: Decimal,
    pub cost_variance_percentage: Decimal,
    pub schedule_variance: Decimal,
    pub earned_value: Decimal,
}

/// 项目进度指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectProgress {
    pub project_id: Uuid,
    pub project_name: String,
    pub planned_value: Decimal,
    pub earned_value: Decimal,
    pub actual_cost: Decimal,
    pub cv: Decimal,
    pub sv: Decimal,
    pub cpi: Decimal,
    pub spi: Decimal,
    pub status: String,
}

/// 项目盈利能力指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectProfitability {
    pub project_id: Uuid,
    pub project_name: String,
    pub contract_amount: Decimal,
    pub total_cost: Decimal,
    pub gross_profit: Decimal,
    pub gross_margin: Decimal,
    pub roi: Decimal,
    pub payback_months: Decimal,
    pub profit_per_month: Decimal,
}

/// 项目核算分析报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectAccountReport {
    pub report_id: Uuid,
    pub period: String,
    pub project_count: i64,
    pub active_count: i64,
    pub total_budget: Decimal,
    pub total_actual_cost: Decimal,
    pub total_committed_cost: Decimal,
    pub total_remaining: Decimal,
    pub total_variance: Decimal,
    pub items: Vec<ProjectAccountItem>,
}

/// 项目核算汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub total_projects: i64,
    pub by_status: HashMap<String, i64>,
    pub total_budget: Decimal,
    pub total_actual: Decimal,
    pub total_committed: Decimal,
    pub avg_completion: Decimal,
    pub on_schedule_count: i64,
    pub over_budget_count: i64,
}

/// 项目核算分析器
pub struct ProjectAccountingAnalyzer;

impl ProjectAccountingAnalyzer {
    fn build_item(
        id: Uuid,
        code: &str,
        name: &str,
        status: ProjectStatus,
        budget: i64,
        actual: i64,
        committed: i64,
        completion: i64,
    ) -> ProjectAccountItem {
        let budget_d = Decimal::from(budget);
        let actual_d = Decimal::from(actual);
        let committed_d = Decimal::from(committed);
        let remaining = budget_d - committed_d;
        let variance = actual_d - budget_d;
        let variance_pct = safe_percentage(variance, budget_d);
        let earned = budget_d * Decimal::from(completion) / Decimal::from(100);

        let sv = Decimal::from(match status {
            ProjectStatus::Completed => 0,
            ProjectStatus::InProgress => 5,
            ProjectStatus::OnHold => 15,
            _ => 0,
        });

        ProjectAccountItem {
            project_id: id,
            project_code: code.to_string(),
            project_name: name.to_string(),
            status,
            budget_amount: budget_d,
            actual_cost: actual_d,
            committed_cost: committed_d,
            remaining_budget: remaining,
            completion_percentage: Decimal::from(completion),
            cost_variance: variance,
            cost_variance_percentage: variance_pct,
            schedule_variance: sv,
            earned_value: earned,
        }
    }

    pub fn analyze(period: &str) -> ProjectAccountReport {
        let items = vec![
            Self::build_item(
                Uuid::new_v4(),
                "PRJ-2026-001",
                "ERP 系统升级",
                ProjectStatus::InProgress,
                5_200_000,
                2_480_000,
                2_600_000,
                48,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PRJ-2026-002",
                "电商平台建设",
                ProjectStatus::InProgress,
                3_800_000,
                1_920_000,
                1_950_000,
                52,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PRJ-2026-003",
                "数据中台项目",
                ProjectStatus::InProgress,
                4_500_000,
                2_850_000,
                3_100_000,
                65,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PRJ-2026-004",
                "移动端 APP 开发",
                ProjectStatus::Completed,
                2_200_000,
                2_150_000,
                2_150_000,
                100,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PRJ-2026-005",
                "海外市场拓展",
                ProjectStatus::OnHold,
                3_000_000,
                680_000,
                900_000,
                22,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "PRJ-2026-006",
                "智能客服系统",
                ProjectStatus::Planning,
                1_800_000,
                0,
                0,
                0,
            ),
        ];

        let total_budget: Decimal = items.iter().map(|i| i.budget_amount).sum();
        let total_actual: Decimal = items.iter().map(|i| i.actual_cost).sum();
        let total_committed: Decimal = items.iter().map(|i| i.committed_cost).sum();
        let total_remaining: Decimal = items.iter().map(|i| i.remaining_budget).sum();
        let total_variance = total_actual - total_budget;
        let active_count = items
            .iter()
            .filter(|i| matches!(i.status, ProjectStatus::InProgress))
            .count() as i64;

        ProjectAccountReport {
            report_id: Uuid::new_v4(),
            period: period.to_string(),
            project_count: items.len() as i64,
            active_count,
            total_budget,
            total_actual_cost: total_actual,
            total_committed_cost: total_committed,
            total_remaining,
            total_variance,
            items,
        }
    }

    pub fn get_progress(period: &str) -> Vec<ProjectProgress> {
        let report = Self::analyze(period);
        report
            .items
            .into_iter()
            .map(|i| {
                let planned = i.budget_amount * i.completion_percentage / Decimal::from(100);
                let earned = i.earned_value;
                let cv = earned - i.actual_cost;
                let sv = earned - planned;
                let cpi = safe_divide(earned, i.actual_cost);
                let spi = safe_divide(earned, planned);
                let status = if cpi >= Decimal::from(1) && spi >= Decimal::from(1) {
                    "正常"
                } else if cpi < Decimal::from(1) && spi < Decimal::from(1) {
                    "延期超支"
                } else if cpi < Decimal::from(1) {
                    "成本超支"
                } else {
                    "进度落后"
                };
                ProjectProgress {
                    project_id: i.project_id,
                    project_name: i.project_name,
                    planned_value: planned,
                    earned_value: earned,
                    actual_cost: i.actual_cost,
                    cv,
                    sv,
                    cpi,
                    spi,
                    status: status.to_string(),
                }
            })
            .collect()
    }

    pub fn get_profitability(period: &str) -> Vec<ProjectProfitability> {
        let report = Self::analyze(period);
        report
            .items
            .into_iter()
            .filter(|i| i.actual_cost > Decimal::ZERO)
            .map(|i| {
                let contract = i.budget_amount * Decimal::from(120) / Decimal::from(100);
                let cost = i.actual_cost;
                let gp = contract - cost;
                let gm = safe_percentage(gp, contract);
                let roi = safe_percentage(gp, cost);
                let months =
                    Decimal::from((i.completion_percentage.to_f64().unwrap_or(1.0) * 12.0) as i64);
                let payback = safe_divide(cost, gp.max(Decimal::from(1))).max(Decimal::ZERO);
                let profit_per_month = safe_divide(gp, months.max(Decimal::from(1)));
                ProjectProfitability {
                    project_id: i.project_id,
                    project_name: i.project_name,
                    contract_amount: contract,
                    total_cost: cost,
                    gross_profit: gp,
                    gross_margin: gm,
                    roi,
                    payback_months: payback,
                    profit_per_month,
                }
            })
            .collect()
    }

    pub fn get_summary() -> ProjectSummary {
        let report = Self::analyze("current");
        let mut by_status: HashMap<String, i64> = HashMap::new();
        for item in &report.items {
            let key = match item.status {
                ProjectStatus::Planning => "规划中",
                ProjectStatus::InProgress => "进行中",
                ProjectStatus::OnHold => "已暂停",
                ProjectStatus::Completed => "已完成",
                ProjectStatus::Cancelled => "已取消",
            };
            *by_status.entry(key.to_string()).or_insert(0) += 1;
        }

        let total_budget: Decimal = report.items.iter().map(|i| i.budget_amount).sum();
        let total_actual: Decimal = report.items.iter().map(|i| i.actual_cost).sum();
        let total_committed: Decimal = report.items.iter().map(|i| i.committed_cost).sum();
        let completion_sum: Decimal = report.items.iter().map(|i| i.completion_percentage).sum();
        let avg_completion = safe_divide(completion_sum, Decimal::from(report.items.len() as i64));

        let on_schedule_count = report
            .items
            .iter()
            .filter(|i| i.schedule_variance <= Decimal::ZERO)
            .count() as i64;
        let over_budget_count = report
            .items
            .iter()
            .filter(|i| i.cost_variance > Decimal::ZERO)
            .count() as i64;

        ProjectSummary {
            total_projects: report.project_count,
            by_status,
            total_budget,
            total_actual,
            total_committed,
            avg_completion,
            on_schedule_count,
            over_budget_count,
        }
    }
}

// ==================== Handlers ====================
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/multi-dimensional/cost-centers/{period}",
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
    tag = "Finance Multi-Dimensional",
    operation_id = "get_cost_center_report_handler",
)]

pub async fn get_cost_center_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<CostCenterReport>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let report = CostCenterAnalyzer::analyze(&period);
    Json(ApiResponse::success(report, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/cost_center_trend",
    tag = "MultiDim",
    operation_id = "get_cost_center_trend_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_cost_center_trend_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<CostTrendPoint>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let trend = CostCenterAnalyzer::get_trend(&period);
    Json(ApiResponse::success(trend, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/cost_center_efficiency/{id}",
    tag = "MultiDim",
    operation_id = "get_cost_center_efficiency_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_cost_center_efficiency_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<CostEfficiency>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let efficiency = CostCenterAnalyzer::get_efficiency(&period);
    Json(ApiResponse::success(efficiency, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/profit_center_report/{id}",
    tag = "MultiDim",
    operation_id = "get_profit_center_report_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_profit_center_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<ProfitCenterReport>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let report = ProfitCenterAnalyzer::analyze(&period);
    Json(ApiResponse::success(report, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/profit_center_trend",
    tag = "MultiDim",
    operation_id = "get_profit_center_trend_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_profit_center_trend_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<ProfitTrendPoint>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let trend = ProfitCenterAnalyzer::get_trend(&period);
    Json(ApiResponse::success(trend, "查询成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/multi-dimensional/profit-centers/{period}/ranking",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("period" = String, Path, description = "期间"),
        ("query" = MultiDimQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance Multi-Dimensional",
    operation_id = "get_profit_center_ranking_handler",
)]

pub async fn get_profit_center_ranking_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
    Query(params): Query<MultiDimQueryParams>,
) -> Json<ApiResponse<Vec<ProfitCenterRanking>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let ranking = ProfitCenterAnalyzer::get_ranking(&period, params.top_n);
    Json(ApiResponse::success(ranking, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/project_account_report/{id}",
    tag = "MultiDim",
    operation_id = "get_project_account_report_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_project_account_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<ProjectAccountReport>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let report = ProjectAccountingAnalyzer::analyze(&period);
    Json(ApiResponse::success(report, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/project_progress",
    tag = "MultiDim",
    operation_id = "get_project_progress_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_project_progress_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<ProjectProgress>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let progress = ProjectAccountingAnalyzer::get_progress(&period);
    Json(ApiResponse::success(progress, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/project_profitability/{id}",
    tag = "MultiDim",
    operation_id = "get_project_profitability_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_project_profitability_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<ProjectProfitability>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let profitability = ProjectAccountingAnalyzer::get_profitability(&period);
    Json(ApiResponse::success(profitability, "查询成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/project_summary",
    tag = "MultiDim",
    operation_id = "get_project_summary_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_project_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ProjectSummary>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let summary = ProjectAccountingAnalyzer::get_summary();
    Json(ApiResponse::success(summary, "查询成功"))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/multi-dimensional/cost-centers/{period}",
            axum::routing::get(get_cost_center_report_handler),
        )
        .route(
            "/multi-dimensional/cost-centers/{period}/trend",
            axum::routing::get(get_cost_center_trend_handler),
        )
        .route(
            "/multi-dimensional/cost-centers/{period}/efficiency",
            axum::routing::get(get_cost_center_efficiency_handler),
        )
        .route(
            "/multi-dimensional/profit-centers/{period}",
            axum::routing::get(get_profit_center_report_handler),
        )
        .route(
            "/multi-dimensional/profit-centers/{period}/trend",
            axum::routing::get(get_profit_center_trend_handler),
        )
        .route(
            "/multi-dimensional/profit-centers/{period}/ranking",
            axum::routing::get(get_profit_center_ranking_handler),
        )
        .route(
            "/multi-dimensional/projects/{period}",
            axum::routing::get(get_project_account_report_handler),
        )
        .route(
            "/multi-dimensional/projects/{period}/progress",
            axum::routing::get(get_project_progress_handler),
        )
        .route(
            "/multi-dimensional/projects/{period}/profit",
            axum::routing::get(get_project_profitability_handler),
        )
        .route(
            "/multi-dimensional/projects/summary",
            axum::routing::get(get_project_summary_handler),
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
    fn rq_cost_center_type() {
        roundtrip(&CostCenterType::Department);
        roundtrip(&CostCenterType::Project);
        roundtrip(&CostCenterType::Product);
        roundtrip(&CostCenterType::Region);
        roundtrip(&CostCenterType::Custom);
    }

    #[test]
    fn rq_cost_behavior() {
        roundtrip(&CostBehavior::Fixed);
        roundtrip(&CostBehavior::Variable);
        roundtrip(&CostBehavior::Mixed);
    }

    #[test]
    fn rq_cost_center_item() {
        roundtrip(&CostCenterItem {
            cost_center_id: Uuid::new_v4(),
            cost_center_code: "c".to_string(),
            cost_center_name: "n".to_string(),
            center_type: CostCenterType::Department,
            department: None,
            total_cost: Decimal::from(0),
            budget_cost: Decimal::from(0),
            variance: Decimal::from(0),
            variance_percentage: Decimal::from(0),
            cost_behavior: CostBehavior::Fixed,
            headcount: 0,
            cost_per_head: Decimal::from(0),
        });
    }

    #[test]
    fn rq_cost_category_summary() {
        roundtrip(&CostCategorySummary {
            category: "c".to_string(),
            total_amount: Decimal::from(0),
            proportion: Decimal::from(0),
            center_count: 0,
        });
    }

    #[test]
    fn rq_cost_trend_point() {
        roundtrip(&CostTrendPoint {
            period: "p".to_string(),
            total_cost: Decimal::from(0),
            budget_cost: Decimal::from(0),
            variance: Decimal::from(0),
            change_percentage: Decimal::from(0),
        });
    }

    #[test]
    fn rq_cost_efficiency() {
        roundtrip(&CostEfficiency {
            cost_center_id: Uuid::new_v4(),
            cost_center_name: "n".to_string(),
            output_value: Decimal::from(0),
            total_cost: Decimal::from(0),
            efficiency_ratio: Decimal::from(0),
            cost_per_unit: Decimal::from(0),
            benchmark: Decimal::from(0),
            ranking: 0,
        });
    }

    #[test]
    fn rq_cost_center_report() {
        roundtrip(&CostCenterReport {
            report_id: Uuid::new_v4(),
            period: "p".to_string(),
            total_cost: Decimal::from(0),
            total_budget: Decimal::from(0),
            total_variance: Decimal::from(0),
            variance_percentage: Decimal::from(0),
            center_count: 0,
            items: vec![],
            category_summary: vec![],
        });
    }

    #[test]
    fn rq_profit_center_type() {
        roundtrip(&ProfitCenterType::ProductLine);
        roundtrip(&ProfitCenterType::BusinessUnit);
        roundtrip(&ProfitCenterType::Region);
        roundtrip(&ProfitCenterType::CustomerSegment);
        roundtrip(&ProfitCenterType::Project);
    }

    #[test]
    fn rq_profit_center_item() {
        roundtrip(&ProfitCenterItem {
            profit_center_id: Uuid::new_v4(),
            profit_center_code: "c".to_string(),
            profit_center_name: "n".to_string(),
            center_type: ProfitCenterType::ProductLine,
            revenue: Decimal::from(0),
            cost: Decimal::from(0),
            gross_profit: Decimal::from(0),
            gross_margin: Decimal::from(0),
            operating_profit: Decimal::from(0),
            net_profit: Decimal::from(0),
            roi: Decimal::from(0),
            revenue_growth: Decimal::from(0),
            profit_growth: Decimal::from(0),
        });
    }

    #[test]
    fn rq_profit_center_ranking() {
        roundtrip(&ProfitCenterRanking {
            rank: 0,
            profit_center_id: Uuid::new_v4(),
            profit_center_name: "n".to_string(),
            total_score: Decimal::from(0),
            revenue_score: Decimal::from(0),
            margin_score: Decimal::from(0),
            growth_score: Decimal::from(0),
            roi_score: Decimal::from(0),
        });
    }

    #[test]
    fn rq_profit_trend_point() {
        roundtrip(&ProfitTrendPoint {
            period: "p".to_string(),
            revenue: Decimal::from(0),
            cost: Decimal::from(0),
            gross_profit: Decimal::from(0),
            gross_margin: Decimal::from(0),
        });
    }

    #[test]
    fn rq_profit_center_report() {
        roundtrip(&ProfitCenterReport {
            report_id: Uuid::new_v4(),
            period: "p".to_string(),
            total_revenue: Decimal::from(0),
            total_cost: Decimal::from(0),
            total_gross_profit: Decimal::from(0),
            overall_gross_margin: Decimal::from(0),
            total_operating_profit: Decimal::from(0),
            total_net_profit: Decimal::from(0),
            center_count: 0,
            items: vec![],
        });
    }

    #[test]
    fn rq_project_status() {
        roundtrip(&ProjectStatus::Planning);
        roundtrip(&ProjectStatus::InProgress);
        roundtrip(&ProjectStatus::OnHold);
        roundtrip(&ProjectStatus::Completed);
        roundtrip(&ProjectStatus::Cancelled);
    }

    #[test]
    fn rq_project_account_item() {
        roundtrip(&ProjectAccountItem {
            project_id: Uuid::new_v4(),
            project_code: "c".to_string(),
            project_name: "n".to_string(),
            status: ProjectStatus::Planning,
            budget_amount: Decimal::from(0),
            actual_cost: Decimal::from(0),
            committed_cost: Decimal::from(0),
            remaining_budget: Decimal::from(0),
            completion_percentage: Decimal::from(0),
            cost_variance: Decimal::from(0),
            cost_variance_percentage: Decimal::from(0),
            schedule_variance: Decimal::from(0),
            earned_value: Decimal::from(0),
        });
    }

    #[test]
    fn rq_project_progress() {
        roundtrip(&ProjectProgress {
            project_id: Uuid::new_v4(),
            project_name: "n".to_string(),
            planned_value: Decimal::from(0),
            earned_value: Decimal::from(0),
            actual_cost: Decimal::from(0),
            cv: Decimal::from(0),
            sv: Decimal::from(0),
            cpi: Decimal::from(0),
            spi: Decimal::from(0),
            status: "s".to_string(),
        });
    }

    #[test]
    fn rq_project_profitability() {
        roundtrip(&ProjectProfitability {
            project_id: Uuid::new_v4(),
            project_name: "n".to_string(),
            contract_amount: Decimal::from(0),
            total_cost: Decimal::from(0),
            gross_profit: Decimal::from(0),
            gross_margin: Decimal::from(0),
            roi: Decimal::from(0),
            payback_months: Decimal::from(0),
            profit_per_month: Decimal::from(0),
        });
    }

    #[test]
    fn rq_project_account_report() {
        roundtrip(&ProjectAccountReport {
            report_id: Uuid::new_v4(),
            period: "p".to_string(),
            project_count: 0,
            active_count: 0,
            total_budget: Decimal::from(0),
            total_actual_cost: Decimal::from(0),
            total_committed_cost: Decimal::from(0),
            total_remaining: Decimal::from(0),
            total_variance: Decimal::from(0),
            items: vec![],
        });
    }

    #[test]
    fn rq_project_summary() {
        roundtrip(&ProjectSummary {
            total_projects: 0,
            by_status: std::collections::HashMap::new(),
            total_budget: Decimal::from(0),
            total_actual: Decimal::from(0),
            total_committed: Decimal::from(0),
            avg_completion: Decimal::from(0),
            on_schedule_count: 0,
            over_budget_count: 0,
        });
    }
}
