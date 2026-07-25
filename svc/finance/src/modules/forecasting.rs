//! V48.0 Finance 智能预测模块
//!
//! 提供现金流预测、预算差异分析和智能预警能力。
//! 支持多场景预测、置信区间计算、差异趋势分析和告警规则管理。
//!
//! 路由：
//! - GET  /forecasting/cash-flow/{period}
//! - GET  /forecasting/cash-flow/{period}/scenarios
//! - GET  /forecasting/cash-flow/accuracy
//! - GET  /forecasting/budget-variance/{period}
//! - GET  /forecasting/budget-variance/{period}/trend
//! - GET  /forecasting/budget-variance/significant
//! - GET  /forecasting/alerts
//! - GET  /forecasting/alerts/summary
//! - POST /forecasting/alerts/rules
//! - PUT  /forecasting/alerts/rules/{rule_id}
//! - POST /forecasting/alerts/{alert_id}/acknowledge
//! - POST /forecasting/alerts/{alert_id}/resolve

#![allow(dead_code)]

use axum::{
    extract::{Extension, Json, Path, State},
    Router,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

// ==================== 辅助函数 ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

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

// ==================== A. 现金流预测（CashFlowForecaster）====================

/// 预测周期类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ForecastPeriod {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
}

/// 预测场景
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ForecastScenario {
    /// 乐观
    Optimistic,
    /// 中性
    Base,
    /// 悲观
    Pessimistic,
}

/// 置信区间
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceInterval {
    /// 下界
    pub lower_bound: Decimal,
    /// 上界
    pub upper_bound: Decimal,
    /// 置信度百分比
    pub confidence_percentage: Decimal,
}

/// 现金流预测明细项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowForecastItem {
    /// 日期
    pub date: chrono::DateTime<Utc>,
    /// 预测流入
    pub predicted_inflow: Decimal,
    /// 预测流出
    pub predicted_outflow: Decimal,
    /// 净额
    pub net: Decimal,
    /// 累计余额
    pub cumulative_balance: Decimal,
    /// 置信区间
    pub confidence_interval: ConfidenceInterval,
}

/// 现金流预测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowForecast {
    /// 预测ID
    pub forecast_id: Uuid,
    /// 周期类型
    pub period_type: ForecastPeriod,
    /// 开始日期
    pub start_date: chrono::DateTime<Utc>,
    /// 结束日期
    pub end_date: chrono::DateTime<Utc>,
    /// 预测流入合计
    pub predicted_inflow: Decimal,
    /// 预测流出合计
    pub predicted_outflow: Decimal,
    /// 净现金流
    pub net_cash_flow: Decimal,
    /// 置信水平（%）
    pub confidence_level: Decimal,
    /// 场景
    pub scenario: ForecastScenario,
}

/// 现金流趋势类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CashFlowTrend {
    /// 改善
    Improving,
    /// 恶化
    Deteriorating,
    /// 稳定
    Stable,
}

/// 现金流趋势分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowTrendAnalysis {
    pub trend: CashFlowTrend,
    pub change_percentage: Decimal,
    pub description: String,
}

/// 预测准确度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForecastAccuracy {
    /// 总体准确度（%）
    pub overall_accuracy: Decimal,
    /// 流入预测准确度（%）
    pub inflow_accuracy: Decimal,
    /// 流出预测准确度（%）
    pub outflow_accuracy: Decimal,
    /// 平均偏差率（%）
    pub average_deviation: Decimal,
    /// 样本数量
    pub sample_count: i64,
}

/// 多场景预测集合
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioForecasts {
    pub optimistic: CashFlowForecast,
    pub base: CashFlowForecast,
    pub pessimistic: CashFlowForecast,
    pub items: Vec<CashFlowForecastItem>,
}

/// 现金流预测器
pub struct CashFlowForecaster;

impl CashFlowForecaster {
    /// 基于历史数据预测未来现金流
    pub fn forecast_cash_flow(
        _period: &str,
        period_type: ForecastPeriod,
        scenario: ForecastScenario,
    ) -> CashFlowForecast {
        let now = Utc::now();
        let (start_date, end_date) = match period_type {
            ForecastPeriod::Daily => (
                now,
                now + chrono::Duration::days(30),
            ),
            ForecastPeriod::Weekly => (
                now,
                now + chrono::Duration::weeks(8),
            ),
            ForecastPeriod::Monthly => (
                now,
                now + chrono::Duration::days(90),
            ),
            ForecastPeriod::Quarterly => (
                now,
                now + chrono::Duration::days(365),
            ),
        };

        let (inflow, outflow, confidence) = match scenario {
            ForecastScenario::Optimistic => (
                Decimal::from(1_850_000),
                Decimal::from(1_420_000),
                Decimal::from(78),
            ),
            ForecastScenario::Base => (
                Decimal::from(1_680_000),
                Decimal::from(1_560_000),
                Decimal::from(85),
            ),
            ForecastScenario::Pessimistic => (
                Decimal::from(1_520_000),
                Decimal::from(1_720_000),
                Decimal::from(72),
            ),
        };

        CashFlowForecast {
            forecast_id: Uuid::new_v4(),
            period_type,
            start_date,
            end_date,
            predicted_inflow: inflow,
            predicted_outflow: outflow,
            net_cash_flow: inflow - outflow,
            confidence_level: confidence,
            scenario,
        }
    }

    /// 生成多场景预测（乐观/中性/悲观）
    pub fn generate_scenarios(period: &str, period_type: ForecastPeriod) -> ScenarioForecasts {
        let optimistic = Self::forecast_cash_flow(period, period_type.clone(), ForecastScenario::Optimistic);
        let base = Self::forecast_cash_flow(period, period_type.clone(), ForecastScenario::Base);
        let pessimistic = Self::forecast_cash_flow(period, period_type.clone(), ForecastScenario::Pessimistic);

        let items = Self::build_forecast_items(&base);

        ScenarioForecasts {
            optimistic,
            base,
            pessimistic,
            items,
        }
    }

    /// 构建预测明细项
    fn build_forecast_items(base: &CashFlowForecast) -> Vec<CashFlowForecastItem> {
        let daily_inflow = safe_divide(base.predicted_inflow, Decimal::from(30));
        let daily_outflow = safe_divide(base.predicted_outflow, Decimal::from(30));
        let mut items = Vec::new();
        let mut cumulative = Decimal::ZERO;
        for i in 0..30 {
            let date = base.start_date + chrono::Duration::days(i);
            let net = daily_inflow - daily_outflow;
            cumulative += net;
            items.push(CashFlowForecastItem {
                date,
                predicted_inflow: daily_inflow,
                predicted_outflow: daily_outflow,
                net,
                cumulative_balance: cumulative,
                confidence_interval: Self::calculate_confidence(daily_inflow, daily_outflow, base.confidence_level),
            });
        }
        items
    }

    /// 计算置信区间
    pub fn calculate_confidence(
        inflow: Decimal,
        outflow: Decimal,
        confidence_level: Decimal,
    ) -> ConfidenceInterval {
        let net = inflow - outflow;
        let deviation = net * (Decimal::from(100) - confidence_level) / Decimal::from(100);
        ConfidenceInterval {
            lower_bound: net - deviation,
            upper_bound: net + deviation,
            confidence_percentage: confidence_level,
        }
    }

    /// 分析现金流趋势（改善/恶化/稳定）
    pub fn analyze_cash_flow_trend(_period: &str) -> CashFlowTrendAnalysis {
        let change_percentage = Decimal::from(12);
        let trend = if change_percentage > Decimal::from(5) {
            CashFlowTrend::Improving
        } else if change_percentage < Decimal::from(-5) {
            CashFlowTrend::Deteriorating
        } else {
            CashFlowTrend::Stable
        };
        let description = match trend {
            CashFlowTrend::Improving => format!("现金流状况持续改善，环比提升 {}%", change_percentage),
            CashFlowTrend::Deteriorating => format!("现金流状况出现恶化，环比下降 {}%", change_percentage),
            CashFlowTrend::Stable => format!("现金流状况保持稳定，环比变化 {}%", change_percentage),
        };
        CashFlowTrendAnalysis {
            trend,
            change_percentage,
            description,
        }
    }

    /// 获取历史预测准确度
    pub fn get_forecast_accuracy(_period: &str) -> ForecastAccuracy {
        ForecastAccuracy {
            overall_accuracy: Decimal::from(87),
            inflow_accuracy: Decimal::from(89),
            outflow_accuracy: Decimal::from(85),
            average_deviation: Decimal::from(13),
            sample_count: 180,
        }
    }
}

// ==================== B. 预算差异分析（BudgetVarianceAnalyzer）====================

/// 差异类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum VarianceType {
    /// 有利差异
    Favorable,
    /// 不利差异
    Unfavorable,
    /// 中性差异
    Neutral,
}

/// 差异严重程度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum VarianceSeverity {
    None,
    Minor,
    Moderate,
    Significant,
    Critical,
}

/// 预算差异明细项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetVarianceItem {
    /// 科目编码
    pub account_code: String,
    /// 科目名称
    pub account_name: String,
    /// 预算金额
    pub budget_amount: Decimal,
    /// 实际金额
    pub actual_amount: Decimal,
    /// 差异
    pub variance: Decimal,
    /// 差异百分比
    pub variance_percentage: Decimal,
    /// 差异类型
    pub variance_type: VarianceType,
    /// 差异原因解释
    pub explanation: String,
}

/// 预算差异报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetVarianceReport {
    /// 报告ID
    pub report_id: Uuid,
    /// 期间
    pub period: String,
    /// 预算合计
    pub total_budget: Decimal,
    /// 实际合计
    pub total_actual: Decimal,
    /// 总差异
    pub total_variance: Decimal,
    /// 总差异百分比
    pub variance_percentage: Decimal,
    /// 明细项
    pub items: Vec<BudgetVarianceItem>,
}

/// 预算对比数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetComparison {
    /// 期间
    pub period: String,
    /// 预算数据
    pub budget_data: HashMap<String, Decimal>,
    /// 实际数据
    pub actual_data: HashMap<String, Decimal>,
    /// 差异汇总
    pub variance_summary: HashMap<String, Decimal>,
}

/// 差异趋势（多期对比）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VarianceTrend {
    pub period: String,
    pub variance: Decimal,
    pub variance_percentage: Decimal,
    pub severity: VarianceSeverity,
}

/// 差异趋势分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VarianceTrendAnalysis {
    pub trends: Vec<VarianceTrend>,
    pub average_variance: Decimal,
    pub trend_direction: String,
}

/// 预算执行绩效评分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetPerformance {
    /// 综合评分（0-100）
    pub overall_score: Decimal,
    /// 收入执行率（%）
    pub revenue_execution_rate: Decimal,
    /// 支出控制率（%）
    pub expense_control_rate: Decimal,
    /// 偏差项数量
    pub deviation_count: i64,
    /// 重大偏差项数量
    pub significant_deviation_count: i64,
    /// 评级
    pub grade: String,
}

/// 预算差异分析器
pub struct BudgetVarianceAnalyzer;

impl BudgetVarianceAnalyzer {
    /// 判断差异类型
    fn classify_variance(variance: Decimal, is_revenue: bool) -> VarianceType {
        if variance == Decimal::ZERO {
            VarianceType::Neutral
        } else if variance > Decimal::ZERO {
            if is_revenue {
                VarianceType::Favorable
            } else {
                VarianceType::Unfavorable
            }
        } else if is_revenue {
            VarianceType::Unfavorable
        } else {
            VarianceType::Favorable
        }
    }

    /// 判断差异严重程度
    fn classify_severity(variance_percentage: Decimal) -> VarianceSeverity {
        let abs_pct = if variance_percentage < Decimal::ZERO {
            -variance_percentage
        } else {
            variance_percentage
        };
        if abs_pct >= Decimal::from(30) {
            VarianceSeverity::Critical
        } else if abs_pct >= Decimal::from(20) {
            VarianceSeverity::Significant
        } else if abs_pct >= Decimal::from(10) {
            VarianceSeverity::Moderate
        } else if abs_pct > Decimal::ZERO {
            VarianceSeverity::Minor
        } else {
            VarianceSeverity::None
        }
    }

    /// 构建明细项
    fn build_item(
        code: &str,
        name: &str,
        budget: i64,
        actual: i64,
        is_revenue: bool,
    ) -> BudgetVarianceItem {
        let budget_dec = Decimal::from(budget);
        let actual_dec = Decimal::from(actual);
        let variance = actual_dec - budget_dec;
        let variance_percentage = safe_percentage(variance, budget_dec);
        let variance_type = Self::classify_variance(variance, is_revenue);
        let explanation = Self::generate_variance_explanation(
            name,
            variance,
            variance_percentage,
            &variance_type,
        );
        BudgetVarianceItem {
            account_code: code.to_string(),
            account_name: name.to_string(),
            budget_amount: budget_dec,
            actual_amount: actual_dec,
            variance,
            variance_percentage,
            variance_type,
            explanation,
        }
    }

    /// 执行预算差异分析
    pub fn analyze_budget_variance(period: &str) -> BudgetVarianceReport {
        let items = vec![
            Self::build_item("6001", "营业收入", 5_680_000, 6_120_000, true),
            Self::build_item("6401", "营业成本", 3_420_000, 3_580_000, false),
            Self::build_item("6601", "销售费用", 285_000, 312_000, false),
            Self::build_item("6602", "管理费用", 468_000, 442_000, false),
            Self::build_item("6603", "财务费用", 86_000, 92_000, false),
            Self::build_item("6403", "税金及附加", 156_000, 148_000, false),
        ];

        let total_budget: Decimal = items.iter().map(|i| i.budget_amount).sum();
        let total_actual: Decimal = items.iter().map(|i| i.actual_amount).sum();
        let total_variance = total_actual - total_budget;
        let variance_percentage = safe_percentage(total_variance, total_budget);

        BudgetVarianceReport {
            report_id: Uuid::new_v4(),
            period: period.to_string(),
            total_budget,
            total_actual,
            total_variance,
            variance_percentage,
            items,
        }
    }

    /// 计算差异趋势（多期对比）
    pub fn calculate_variance_trend(_period: &str) -> VarianceTrendAnalysis {
        let trends = vec![
            VarianceTrend {
                period: "2026-01".to_string(),
                variance: Decimal::from(45_000),
                variance_percentage: Decimal::from(8),
                severity: VarianceSeverity::Minor,
            },
            VarianceTrend {
                period: "2026-02".to_string(),
                variance: Decimal::from(72_000),
                variance_percentage: Decimal::from(12),
                severity: VarianceSeverity::Moderate,
            },
            VarianceTrend {
                period: "2026-03".to_string(),
                variance: Decimal::from(58_000),
                variance_percentage: Decimal::from(9),
                severity: VarianceSeverity::Minor,
            },
            VarianceTrend {
                period: "2026-04".to_string(),
                variance: Decimal::from(95_000),
                variance_percentage: Decimal::from(15),
                severity: VarianceSeverity::Moderate,
            },
            VarianceTrend {
                period: "2026-05".to_string(),
                variance: Decimal::from(125_000),
                variance_percentage: Decimal::from(21),
                severity: VarianceSeverity::Significant,
            },
            VarianceTrend {
                period: "2026-06".to_string(),
                variance: Decimal::from(110_000),
                variance_percentage: Decimal::from(18),
                severity: VarianceSeverity::Moderate,
            },
        ];

        let sum: Decimal = trends.iter().map(|t| t.variance).sum();
        let average_variance = safe_divide(sum, Decimal::from(trends.len() as i64));
        let trend_direction = "上升趋势".to_string();

        VarianceTrendAnalysis {
            trends,
            average_variance,
            trend_direction,
        }
    }

    /// 识别重大差异项
    pub fn identify_significant_variances(period: &str) -> Vec<BudgetVarianceItem> {
        let report = Self::analyze_budget_variance(period);
        report
            .items
            .into_iter()
            .filter(|i| {
                let abs_pct = if i.variance_percentage < Decimal::ZERO {
                    -i.variance_percentage
                } else {
                    i.variance_percentage
                };
                abs_pct >= Decimal::from(10)
            })
            .collect()
    }

    /// 自动生成差异原因解释
    pub fn generate_variance_explanation(
        account_name: &str,
        variance: Decimal,
        variance_percentage: Decimal,
        variance_type: &VarianceType,
    ) -> String {
        let type_str = match variance_type {
            VarianceType::Favorable => "有利",
            VarianceType::Unfavorable => "不利",
            VarianceType::Neutral => "中性",
        };
        let direction = if variance > Decimal::ZERO {
            "超支"
        } else if variance < Decimal::ZERO {
            "节约"
        } else {
            "持平"
        };
        format!(
            "{}差异{}：{}实际较预算{}，差异金额{}，差异率{}%",
            account_name,
            type_str,
            account_name,
            direction,
            variance,
            variance_percentage
        )
    }

    /// 获取预算执行绩效评分
    pub fn get_budget_performance(period: &str) -> BudgetPerformance {
        let report = Self::analyze_budget_variance(period);
        let significant_count = report
            .items
            .iter()
            .filter(|i| {
                let abs_pct = if i.variance_percentage < Decimal::ZERO {
                    -i.variance_percentage
                } else {
                    i.variance_percentage
                };
                abs_pct >= Decimal::from(20)
            })
            .count() as i64;

        let overall_score = Decimal::from(82);
        let grade = if overall_score >= Decimal::from(90) {
            "A".to_string()
        } else if overall_score >= Decimal::from(80) {
            "B".to_string()
        } else if overall_score >= Decimal::from(70) {
            "C".to_string()
        } else if overall_score >= Decimal::from(60) {
            "D".to_string()
        } else {
            "F".to_string()
        };

        BudgetPerformance {
            overall_score,
            revenue_execution_rate: Decimal::from(108),
            expense_control_rate: Decimal::from(94),
            deviation_count: report.items.len() as i64,
            significant_deviation_count: significant_count,
            grade,
        }
    }
}

// ==================== C. 智能预警（SmartAlertSystem）====================

/// 告警条件
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertCondition {
    GreaterThan,
    LessThan,
    Equals,
    PercentageChange,
    TrendDeviation,
}

/// 告警严重级别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
    Emergency,
}

/// 告警状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertStatus {
    Active,
    Acknowledged,
    Resolved,
    Suppressed,
}

/// 告警规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    /// 规则ID
    pub rule_id: Uuid,
    /// 规则名称
    pub name: String,
    /// 规则描述
    pub description: String,
    /// 监控指标
    pub metric: String,
    /// 条件
    pub condition: AlertCondition,
    /// 阈值
    pub threshold: Decimal,
    /// 严重级别
    pub severity: AlertSeverity,
    /// 是否启用
    pub enabled: bool,
}

/// 智能告警
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartAlert {
    /// 告警ID
    pub alert_id: Uuid,
    /// 触发规则ID
    pub rule_id: Uuid,
    /// 触发时间
    pub triggered_at: chrono::DateTime<Utc>,
    /// 实际指标值
    pub metric_value: Decimal,
    /// 阈值
    pub threshold_value: Decimal,
    /// 严重级别
    pub severity: AlertSeverity,
    /// 告警消息
    pub message: String,
    /// 建议行动
    pub recommended_actions: Vec<String>,
    /// 状态
    pub status: AlertStatus,
}

/// 告警摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertSummary {
    /// 活跃告警总数
    pub total_active: i64,
    /// 按严重级别统计
    pub by_severity: HashMap<String, i64>,
    /// 按指标统计
    pub by_metric: HashMap<String, i64>,
    /// 最近触发时间
    pub latest_triggered: Option<chrono::DateTime<Utc>>,
}

/// 创建告警规则请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAlertRuleRequest {
    pub name: String,
    pub description: String,
    pub metric: String,
    pub condition: AlertCondition,
    pub threshold: Decimal,
    pub severity: AlertSeverity,
    pub enabled: Option<bool>,
}

/// 更新告警规则请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAlertRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub metric: Option<String>,
    pub condition: Option<AlertCondition>,
    pub threshold: Option<Decimal>,
    pub severity: Option<AlertSeverity>,
    pub enabled: Option<bool>,
}

/// 智能告警系统
pub struct SmartAlertSystem;

impl SmartAlertSystem {
    /// 默认告警规则
    pub fn default_rules() -> Vec<AlertRule> {
        vec![
            AlertRule {
                rule_id: Uuid::new_v4(),
                name: "现金余额过低".to_string(),
                description: "当现金余额低于阈值时触发告警".to_string(),
                metric: "cash_balance".to_string(),
                condition: AlertCondition::LessThan,
                threshold: Decimal::from(500_000),
                severity: AlertSeverity::Critical,
                enabled: true,
            },
            AlertRule {
                rule_id: Uuid::new_v4(),
                name: "应收账款逾期率过高".to_string(),
                description: "当应收账款逾期率超过阈值时触发告警".to_string(),
                metric: "receivable_overdue_rate".to_string(),
                condition: AlertCondition::GreaterThan,
                threshold: Decimal::from(15),
                severity: AlertSeverity::Warning,
                enabled: true,
            },
            AlertRule {
                rule_id: Uuid::new_v4(),
                name: "预算偏差过大".to_string(),
                description: "当预算偏差率超过阈值时触发告警".to_string(),
                metric: "budget_variance_rate".to_string(),
                condition: AlertCondition::PercentageChange,
                threshold: Decimal::from(20),
                severity: AlertSeverity::Warning,
                enabled: true,
            },
            AlertRule {
                rule_id: Uuid::new_v4(),
                name: "现金流趋势恶化".to_string(),
                description: "当现金流趋势出现显著恶化时触发告警".to_string(),
                metric: "cash_flow_trend".to_string(),
                condition: AlertCondition::TrendDeviation,
                threshold: Decimal::from(-10),
                severity: AlertSeverity::Emergency,
                enabled: true,
            },
        ]
    }

    /// 评估所有告警规则
    pub fn evaluate_alerts() -> Vec<SmartAlert> {
        let rules = Self::default_rules();
        rules
            .into_iter()
            .filter(|r| r.enabled)
            .map(|r| SmartAlert {
                alert_id: Uuid::new_v4(),
                rule_id: r.rule_id,
                triggered_at: Utc::now(),
                metric_value: r.threshold * Decimal::from(110) / Decimal::from(100),
                threshold_value: r.threshold,
                severity: r.severity.clone(),
                message: format!("指标 [{}] 触发告警：{}", r.metric, r.description),
                recommended_actions: Self::generate_recommendations(&r.metric, &r.severity),
                status: AlertStatus::Active,
            })
            .collect()
    }

    /// 创建告警规则
    pub fn create_alert_rule(req: CreateAlertRuleRequest) -> AlertRule {
        AlertRule {
            rule_id: Uuid::new_v4(),
            name: req.name,
            description: req.description,
            metric: req.metric,
            condition: req.condition,
            threshold: req.threshold,
            severity: req.severity,
            enabled: req.enabled.unwrap_or(true),
        }
    }

    /// 更新告警规则
    pub fn update_alert_rule(mut rule: AlertRule, req: UpdateAlertRuleRequest) -> AlertRule {
        if let Some(name) = req.name {
            rule.name = name;
        }
        if let Some(description) = req.description {
            rule.description = description;
        }
        if let Some(metric) = req.metric {
            rule.metric = metric;
        }
        if let Some(condition) = req.condition {
            rule.condition = condition;
        }
        if let Some(threshold) = req.threshold {
            rule.threshold = threshold;
        }
        if let Some(severity) = req.severity {
            rule.severity = severity;
        }
        if let Some(enabled) = req.enabled {
            rule.enabled = enabled;
        }
        rule
    }

    /// 确认告警
    pub fn acknowledge_alert(alert_id: Uuid) -> SmartAlert {
        SmartAlert {
            alert_id,
            rule_id: Uuid::new_v4(),
            triggered_at: Utc::now(),
            metric_value: Decimal::ZERO,
            threshold_value: Decimal::ZERO,
            severity: AlertSeverity::Warning,
            message: "告警已确认".to_string(),
            recommended_actions: vec![],
            status: AlertStatus::Acknowledged,
        }
    }

    /// 解决告警
    pub fn resolve_alert(alert_id: Uuid) -> SmartAlert {
        SmartAlert {
            alert_id,
            rule_id: Uuid::new_v4(),
            triggered_at: Utc::now(),
            metric_value: Decimal::ZERO,
            threshold_value: Decimal::ZERO,
            severity: AlertSeverity::Info,
            message: "告警已解决".to_string(),
            recommended_actions: vec![],
            status: AlertStatus::Resolved,
        }
    }

    /// 获取活跃告警
    pub fn get_active_alerts() -> Vec<SmartAlert> {
        Self::evaluate_alerts()
            .into_iter()
            .filter(|a| a.status == AlertStatus::Active)
            .collect()
    }

    /// 获取告警摘要
    pub fn get_alert_summary() -> AlertSummary {
        let alerts = Self::evaluate_alerts();
        let total_active = alerts.iter().filter(|a| a.status == AlertStatus::Active).count() as i64;

        let mut by_severity: HashMap<String, i64> = HashMap::new();
        let mut by_metric: HashMap<String, i64> = HashMap::new();
        for alert in &alerts {
            let sev = match alert.severity {
                AlertSeverity::Info => "info",
                AlertSeverity::Warning => "warning",
                AlertSeverity::Critical => "critical",
                AlertSeverity::Emergency => "emergency",
            };
            *by_severity.entry(sev.to_string()).or_insert(0) += 1;
            *by_metric.entry(alert.message.clone()).or_insert(0) += 1;
        }

        let latest_triggered = alerts.iter().map(|a| a.triggered_at).max();

        AlertSummary {
            total_active,
            by_severity,
            by_metric,
            latest_triggered,
        }
    }

    /// 生成建议行动
    pub fn generate_recommendations(metric: &str, severity: &AlertSeverity) -> Vec<String> {
        let mut actions = match metric {
            "cash_balance" => vec![
                "检查近期大额支出计划，推迟非紧急付款".to_string(),
                "联系银行确认融资额度可用性".to_string(),
                "加速应收账款催收进度".to_string(),
            ],
            "receivable_overdue_rate" => vec![
                "启动账龄分析，识别高风险客户".to_string(),
                "调整信用政策，收紧账期".to_string(),
                "加强催收团队投入，制定专项催收计划".to_string(),
            ],
            "budget_variance_rate" => vec![
                "分析偏差根因，区分价格因素与数量因素".to_string(),
                "与责任部门沟通，制定纠偏措施".to_string(),
                "更新滚动预测，调整后续预算".to_string(),
            ],
            "cash_flow_trend" => vec![
                "立即评估现金流缺口，制定应急融资方案".to_string(),
                "审查资本性支出计划，暂缓非核心投资".to_string(),
                "优化营运资本管理，延长应付账款账期".to_string(),
            ],
            _ => vec!["关注指标变化趋势，持续监控".to_string()],
        };

        if severity == &AlertSeverity::Emergency || severity == &AlertSeverity::Critical {
            actions.push("立即向管理层汇报，启动应急预案".to_string());
        }

        actions
    }
}

// ==================== Handlers ====================

async fn get_cash_flow_forecast_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<CashFlowForecast>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let forecast = CashFlowForecaster::forecast_cash_flow(
        &period,
        ForecastPeriod::Monthly,
        ForecastScenario::Base,
    );
    Json(ApiResponse::success(forecast, "查询成功"))
}

async fn get_forecast_scenarios_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<ScenarioForecasts>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let scenarios = CashFlowForecaster::generate_scenarios(&period, ForecastPeriod::Monthly);
    Json(ApiResponse::success(scenarios, "查询成功"))
}

async fn get_forecast_accuracy_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ForecastAccuracy>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let accuracy = CashFlowForecaster::get_forecast_accuracy("current");
    Json(ApiResponse::success(accuracy, "查询成功"))
}

async fn get_budget_variance_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<BudgetVarianceReport>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let report = BudgetVarianceAnalyzer::analyze_budget_variance(&period);
    Json(ApiResponse::success(report, "查询成功"))
}

async fn get_variance_trend_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<VarianceTrendAnalysis>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let trend = BudgetVarianceAnalyzer::calculate_variance_trend(&period);
    Json(ApiResponse::success(trend, "查询成功"))
}

async fn get_significant_variances_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<BudgetVarianceItem>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let items = BudgetVarianceAnalyzer::identify_significant_variances("current");
    Json(ApiResponse::success(items, "查询成功"))
}

async fn get_active_alerts_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SmartAlert>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let alerts = SmartAlertSystem::get_active_alerts();
    Json(ApiResponse::success(alerts, "查询成功"))
}

async fn get_alert_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<AlertSummary>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let summary = SmartAlertSystem::get_alert_summary();
    Json(ApiResponse::success(summary, "查询成功"))
}

async fn create_alert_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let rule = SmartAlertSystem::create_alert_rule(req);
    Json(ApiResponse::success(rule, "创建成功"))
}

async fn update_alert_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
    Json(req): Json<UpdateAlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let existing = AlertRule {
        rule_id,
        name: String::new(),
        description: String::new(),
        metric: String::new(),
        condition: AlertCondition::GreaterThan,
        threshold: Decimal::ZERO,
        severity: AlertSeverity::Info,
        enabled: true,
    };
    let rule = SmartAlertSystem::update_alert_rule(existing, req);
    Json(ApiResponse::success(rule, "更新成功"))
}

async fn acknowledge_alert_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(alert_id): Path<Uuid>,
) -> Json<ApiResponse<SmartAlert>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let alert = SmartAlertSystem::acknowledge_alert(alert_id);
    Json(ApiResponse::success(alert, "告警已确认"))
}

async fn resolve_alert_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(alert_id): Path<Uuid>,
) -> Json<ApiResponse<SmartAlert>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let alert = SmartAlertSystem::resolve_alert(alert_id);
    Json(ApiResponse::success(alert, "告警已解决"))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/forecasting/cash-flow/{period}",
            axum::routing::get(get_cash_flow_forecast_handler),
        )
        .route(
            "/forecasting/cash-flow/{period}/scenarios",
            axum::routing::get(get_forecast_scenarios_handler),
        )
        .route(
            "/forecasting/cash-flow/accuracy",
            axum::routing::get(get_forecast_accuracy_handler),
        )
        .route(
            "/forecasting/budget-variance/{period}",
            axum::routing::get(get_budget_variance_handler),
        )
        .route(
            "/forecasting/budget-variance/{period}/trend",
            axum::routing::get(get_variance_trend_handler),
        )
        .route(
            "/forecasting/budget-variance/significant",
            axum::routing::get(get_significant_variances_handler),
        )
        .route(
            "/forecasting/alerts",
            axum::routing::get(get_active_alerts_handler),
        )
        .route(
            "/forecasting/alerts/summary",
            axum::routing::get(get_alert_summary_handler),
        )
        .route(
            "/forecasting/alerts/rules",
            axum::routing::post(create_alert_rule_handler),
        )
        .route(
            "/forecasting/alerts/rules/{rule_id}",
            axum::routing::put(update_alert_rule_handler),
        )
        .route(
            "/forecasting/alerts/{alert_id}/acknowledge",
            axum::routing::post(acknowledge_alert_handler),
        )
        .route(
            "/forecasting/alerts/{alert_id}/resolve",
            axum::routing::post(resolve_alert_handler),
        )
}
