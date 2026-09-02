//! 预测分析模块
//!
//! 提供 AI 驱动的预测分析功能：
//! - 销售预测（基于历史数据的销售趋势预测）
//! - 库存预警（库存不足/过剩智能预警）
//! - 风险识别（业务风险自动识别和评估）
//! - 需求预测（物料需求、人力需求预测）

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn default_true() -> bool {
    true
}

/// 预测类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PredictionType {
    /// 销售预测
    SalesForecast,
    /// 库存预警
    InventoryAlert,
    /// 风险识别
    RiskIdentification,
    /// 需求预测
    DemandForecast,
    /// 财务预测
    FinancialForecast,
    /// 人力资源预测
    HrForecast,
}

/// 预测请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionRequest {
    /// 预测类型
    pub prediction_type: PredictionType,
    /// 预测对象
    pub target: String,
    /// 历史数据
    pub historical_data: Vec<DataPoint>,
    /// 预测周期
    pub forecast_period: ForecastPeriod,
    /// 预测步数
    #[serde(default = "default_forecast_steps")]
    pub forecast_steps: u32,
    /// 置信水平
    #[serde(default = "default_confidence_level")]
    pub confidence_level: f32,
    /// 外部因素
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub external_factors: HashMap<String, serde_json::Value>,
    /// 预测算法
    #[serde(skip_serializing_if = "Option::is_none")]
    pub algorithm: Option<PredictionAlgorithm>,
}

fn default_forecast_steps() -> u32 {
    12
}
fn default_confidence_level() -> f32 {
    0.95
}

/// 预测周期
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ForecastPeriod {
    /// 小时
    Hourly,
    /// 天
    Daily,
    /// 周
    Weekly,
    /// 月
    Monthly,
    /// 季度
    Quarterly,
    /// 年
    Yearly,
}

/// 预测算法
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PredictionAlgorithm {
    /// 线性回归
    LinearRegression,
    /// 移动平均
    MovingAverage,
    /// 指数平滑
    ExponentialSmoothing,
    /// ARIMA
    Arima,
    /// Prophet
    Prophet,
    /// LSTM 神经网络
    Lstm,
    /// XGBoost
    Xgboost,
    /// 集成方法
    Ensemble,
}

/// 数据点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    /// 时间戳
    pub timestamp: String,
    /// 值
    pub value: f64,
    /// 维度
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub dimensions: HashMap<String, String>,
    /// 额外属性
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub attributes: HashMap<String, serde_json::Value>,
}

/// 预测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionResult {
    /// 预测类型
    pub prediction_type: PredictionType,
    /// 预测对象
    pub target: String,
    /// 使用的算法
    pub algorithm_used: PredictionAlgorithm,
    /// 预测数据点
    pub predictions: Vec<PredictedDataPoint>,
    /// 置信区间
    pub confidence_intervals: Vec<ConfidenceInterval>,
    /// 模型评估指标
    pub model_metrics: ModelMetrics,
    /// 趋势分析
    pub trend_analysis: TrendAnalysis,
    /// 季节性分析
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seasonality_analysis: Option<SeasonalityAnalysis>,
    /// 异常值检测
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub anomalies: Vec<Anomaly>,
    /// 影响因素分析
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub factor_analysis: Vec<FactorImpact>,
}

/// 预测数据点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictedDataPoint {
    /// 时间戳
    pub timestamp: String,
    /// 预测值
    pub predicted_value: f64,
    /// 预测值下限
    pub lower_bound: f64,
    /// 预测值上限
    pub upper_bound: f64,
    /// 置信度
    pub confidence: f32,
}

/// 置信区间
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceInterval {
    /// 置信水平
    pub level: f32,
    /// 下限
    pub lower: f64,
    /// 上限
    pub upper: f64,
}

/// 模型评估指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMetrics {
    /// 平均绝对误差 (MAE)
    pub mae: f64,
    /// 均方根误差 (RMSE)
    pub rmse: f64,
    /// 平均绝对百分比误差 (MAPE)
    pub mape: f64,
    /// 决定系数 (R²)
    pub r_squared: f64,
    /// 训练数据点数
    pub training_points: u32,
    /// 测试数据点数
    pub test_points: u32,
}

/// 趋势分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendAnalysis {
    /// 趋势方向
    pub direction: TrendDirection,
    /// 趋势强度（0-1）
    pub strength: f32,
    /// 增长率
    pub growth_rate: f64,
    /// 趋势描述
    pub description: String,
}

/// 趋势方向
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TrendDirection {
    /// 上升
    Upward,
    /// 下降
    Downward,
    /// 平稳
    Stable,
    /// 波动
    Volatile,
}

/// 季节性分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeasonalityAnalysis {
    /// 是否存在季节性
    pub has_seasonality: bool,
    /// 季节性周期
    pub period: String,
    /// 季节性强度（0-1）
    pub strength: f32,
    /// 季节性因子
    pub seasonal_factors: Vec<SeasonalFactor>,
}

/// 季节性因子
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeasonalFactor {
    /// 周期位置
    pub period_position: String,
    /// 因子值
    pub factor: f64,
    /// 影响描述
    pub impact: String,
}

/// 异常值
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anomaly {
    /// 时间戳
    pub timestamp: String,
    /// 实际值
    pub actual_value: f64,
    /// 预期值
    pub expected_value: f64,
    /// 偏差百分比
    pub deviation_percent: f64,
    /// 异常类型
    pub anomaly_type: AnomalyType,
    /// 严重程度
    pub severity: AnomalySeverity,
    /// 可能原因
    #[serde(skip_serializing_if = "Option::is_none")]
    pub possible_cause: Option<String>,
}

/// 异常类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AnomalyType {
    /// 突增
    Spike,
    /// 突降
    Drop,
    /// 离群点
    Outlier,
    /// 趋势变化
    TrendChange,
    /// 水平变化
    LevelShift,
}

/// 异常严重程度
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AnomalySeverity {
    /// 低
    Low,
    /// 中
    Medium,
    /// 高
    High,
    /// 严重
    Critical,
}

/// 因素影响
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactorImpact {
    /// 因素名称
    pub factor_name: String,
    /// 影响程度（0-1）
    pub impact: f32,
    /// 影响方向
    pub direction: ImpactDirection,
    /// 相关性系数
    pub correlation: f64,
    /// 描述
    pub description: String,
}

/// 影响方向
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImpactDirection {
    /// 正向
    Positive,
    /// 负向
    Negative,
    /// 中性
    Neutral,
}

/// 库存预警请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAlertRequest {
    /// 仓库 ID
    pub warehouse_id: String,
    /// 商品列表
    pub items: Vec<InventoryItem>,
    /// 预警配置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alert_config: Option<AlertConfig>,
}

/// 库存商品
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryItem {
    /// 商品 ID
    pub item_id: String,
    /// 商品名称
    pub item_name: String,
    /// SKU
    pub sku: String,
    /// 当前库存
    pub current_stock: f64,
    /// 安全库存
    pub safety_stock: f64,
    /// 最大库存
    pub max_stock: f64,
    /// 日均销量
    pub daily_sales: f64,
    /// 采购提前期（天）
    pub lead_time: u32,
    /// 在途库存
    #[serde(default)]
    pub in_transit_stock: f64,
    /// 历史库存数据
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub historical_stock: Vec<DataPoint>,
}

/// 预警配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    /// 库存不足阈值（百分比）
    #[serde(default = "default_low_stock_threshold")]
    pub low_stock_threshold: f32,
    /// 库存过剩阈值（百分比）
    #[serde(default = "default_overstock_threshold")]
    pub overstock_threshold: f32,
    /// 缺货预警提前天数
    #[serde(default = "default_stockout_warning_days")]
    pub stockout_warning_days: u32,
    /// 是否启用 AI 预测
    #[serde(default = "default_true")]
    pub ai_prediction_enabled: bool,
}

fn default_low_stock_threshold() -> f32 {
    20.0
}
fn default_overstock_threshold() -> f32 {
    150.0
}
fn default_stockout_warning_days() -> u32 {
    7
}

/// 库存预警结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAlertResult {
    /// 仓库 ID
    pub warehouse_id: String,
    /// 预警列表
    pub alerts: Vec<InventoryAlert>,
    /// 统计摘要
    pub summary: InventoryAlertSummary,
    /// 采购建议
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub purchase_suggestions: Vec<PurchaseSuggestion>,
}

/// 库存预警
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAlert {
    /// 商品 ID
    pub item_id: String,
    /// 商品名称
    pub item_name: String,
    /// 预警类型
    pub alert_type: InventoryAlertType,
    /// 预警级别
    pub alert_level: AlertLevel,
    /// 当前库存
    pub current_stock: f64,
    /// 安全库存
    pub safety_stock: f64,
    /// 库存百分比（相对于安全库存）
    pub stock_percent: f32,
    /// 预计缺货天数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_stockout_days: Option<f64>,
    /// 预警消息
    pub message: String,
    /// 建议措施
    pub suggested_action: String,
}

/// 库存预警类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InventoryAlertType {
    /// 库存不足
    LowStock,
    /// 即将缺货
    StockoutWarning,
    /// 已经缺货
    OutOfStock,
    /// 库存过剩
    Overstock,
    /// 库存积压
    SlowMoving,
    /// 库存正常
    Normal,
}

/// 预警级别
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AlertLevel {
    /// 信息
    Info,
    /// 警告
    Warning,
    /// 严重
    Critical,
    /// 紧急
    Urgent,
}

/// 库存预警统计摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAlertSummary {
    /// 总商品数
    pub total_items: u32,
    /// 正常商品数
    pub normal_count: u32,
    /// 库存不足数
    pub low_stock_count: u32,
    /// 即将缺货数
    pub stockout_warning_count: u32,
    /// 已经缺货数
    pub out_of_stock_count: u32,
    /// 库存过剩数
    pub overstock_count: u32,
    /// 库存总价值
    pub total_inventory_value: f64,
    /// 库存周转率
    pub inventory_turnover: f64,
}

/// 采购建议
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseSuggestion {
    /// 商品 ID
    pub item_id: String,
    /// 商品名称
    pub item_name: String,
    /// 建议采购数量
    pub suggested_quantity: f64,
    /// 建议采购时间
    pub suggested_purchase_date: String,
    /// 预计到货时间
    pub estimated_arrival_date: String,
    /// 建议原因
    pub reason: String,
    /// 置信度
    pub confidence: f32,
}

/// 风险识别请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskIdentificationRequest {
    /// 业务领域
    pub business_domain: String,
    /// 业务数据
    pub business_data: HashMap<String, serde_json::Value>,
    /// 历史风险数据
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub historical_risks: Vec<HistoricalRisk>,
    /// 风险类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub risk_types: Vec<String>,
}

/// 历史风险
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalRisk {
    /// 风险 ID
    pub risk_id: String,
    /// 风险类型
    pub risk_type: String,
    /// 风险描述
    pub description: String,
    /// 发生时间
    pub occurred_at: String,
    /// 影响程度
    pub impact: f64,
    /// 处理结果
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,
}

/// 风险识别结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskIdentificationResult {
    /// 识别的风险列表
    pub risks: Vec<IdentifiedRisk>,
    /// 总体风险评分
    pub overall_risk_score: f64,
    /// 风险等级
    pub overall_risk_level: super::document_intelligence::RiskLevel,
    /// 风险趋势
    pub risk_trend: TrendDirection,
    /// 风险摘要
    pub risk_summary: String,
    /// 建议措施
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub mitigation_suggestions: Vec<MitigationSuggestion>,
}

/// 识别的风险
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentifiedRisk {
    /// 风险 ID
    pub risk_id: String,
    /// 风险类型
    pub risk_type: String,
    /// 风险名称
    pub risk_name: String,
    /// 风险描述
    pub description: String,
    /// 风险类别
    pub category: String,
    /// 发生概率（0-1）
    pub probability: f64,
    /// 影响程度（0-10）
    pub impact: f64,
    /// 风险评分（概率 × 影响）
    pub risk_score: f64,
    /// 风险等级
    pub risk_level: super::document_intelligence::RiskLevel,
    /// 置信度
    pub confidence: f32,
    /// 相关指标
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub related_metrics: HashMap<String, serde_json::Value>,
    /// 早期预警信号
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub warning_signals: Vec<String>,
}

/// 缓解建议
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MitigationSuggestion {
    /// 建议 ID
    pub suggestion_id: String,
    /// 相关风险 ID
    pub related_risk_id: String,
    /// 建议类型
    pub suggestion_type: String,
    /// 建议内容
    pub content: String,
    /// 优先级
    pub priority: u8,
    /// 预计效果
    pub expected_effect: String,
    /// 实施难度
    pub implementation_difficulty: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prediction_type_serialization() {
        let sales = PredictionType::SalesForecast;
        let json = serde_json::to_string(&sales).unwrap();
        assert_eq!(json, "\"sales_forecast\"");
    }

    #[test]
    fn test_forecast_period_serialization() {
        let monthly = ForecastPeriod::Monthly;
        let json = serde_json::to_string(&monthly).unwrap();
        assert_eq!(json, "\"monthly\"");
    }

    #[test]
    fn test_trend_direction() {
        let upward = TrendDirection::Upward;
        let downward = TrendDirection::Downward;
        let stable = TrendDirection::Stable;
        let volatile = TrendDirection::Volatile;

        assert_ne!(upward, downward);
        assert_ne!(downward, stable);
        assert_ne!(stable, volatile);
    }

    #[test]
    fn test_inventory_alert_types() {
        let low = InventoryAlertType::LowStock;
        let overstock = InventoryAlertType::Overstock;
        let normal = InventoryAlertType::Normal;

        assert_ne!(low, overstock);
        assert_ne!(overstock, normal);
    }

    #[test]
    fn test_alert_levels() {
        let info = AlertLevel::Info;
        let warning = AlertLevel::Warning;
        let critical = AlertLevel::Critical;
        let urgent = AlertLevel::Urgent;

        assert_ne!(info, warning);
        assert_ne!(warning, critical);
        assert_ne!(critical, urgent);
    }

    #[test]
    fn test_model_metrics() {
        let metrics = ModelMetrics {
            mae: 10.5,
            rmse: 15.2,
            mape: 5.3,
            r_squared: 0.85,
            training_points: 100,
            test_points: 20,
        };

        assert_eq!(metrics.r_squared, 0.85);
        assert_eq!(metrics.training_points, 100);
    }
}
