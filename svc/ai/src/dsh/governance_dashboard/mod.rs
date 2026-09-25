//! DSH AI 治理仪表盘模块
//!
//! 提供治理指标聚合、风险评估、合规报告、仪表盘数据生成等能力。

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::info;

// ============================================================================
// 类型定义
// ============================================================================

/// 治理仪表盘数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceDashboard {
    /// 仪表盘生成时间
    pub generated_at: String,
    /// 时间范围
    pub time_range: TimeRange,
    /// 总体治理评分（0-100）
    pub overall_score: f64,
    /// 治理等级
    pub governance_level: GovernanceLevel,
    /// 关键指标
    pub key_metrics: KeyMetrics,
    /// 风险评估
    pub risk_assessment: RiskAssessment,
    /// 合规状态
    pub compliance_status: ComplianceStatus,
    /// 成本分析
    pub cost_analysis: CostAnalysis,
    /// 性能指标
    pub performance_metrics: PerformanceMetrics,
    /// 安全事件
    pub security_events: Vec<SecurityEventSummary>,
    /// 审计日志摘要
    pub audit_summary: AuditSummary,
    /// 趋势数据
    pub trends: Vec<TrendDataPoint>,
    /// 建议和改进项
    pub recommendations: Vec<Recommendation>,
}

/// 时间范围
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TimeRange {
    /// 最近 1 小时
    Last1Hour,
    /// 最近 24 小时
    Last24Hours,
    /// 最近 7 天
    Last7Days,
    /// 最近 30 天
    Last30Days,
    /// 自定义
    Custom,
}

impl TimeRange {
    pub fn as_str(&self) -> &str {
        match self {
            TimeRange::Last1Hour => "1h",
            TimeRange::Last24Hours => "24h",
            TimeRange::Last7Days => "7d",
            TimeRange::Last30Days => "30d",
            TimeRange::Custom => "custom",
        }
    }

    pub fn duration(&self) -> Duration {
        match self {
            TimeRange::Last1Hour => Duration::from_secs(3600),
            TimeRange::Last24Hours => Duration::from_secs(86400),
            TimeRange::Last7Days => Duration::from_secs(604800),
            TimeRange::Last30Days => Duration::from_secs(2592000),
            TimeRange::Custom => Duration::from_secs(86400),
        }
    }
}

/// 治理等级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum GovernanceLevel {
    /// 优秀（90-100）
    Excellent,
    /// 良好（75-89）
    Good,
    /// 一般（60-74）
    Fair,
    /// 需改进（40-59）
    NeedsImprovement,
    /// 较差（0-39）
    Poor,
}

impl GovernanceLevel {
    pub fn from_score(score: f64) -> Self {
        match score as u32 {
            90..=100 => GovernanceLevel::Excellent,
            75..=89 => GovernanceLevel::Good,
            60..=74 => GovernanceLevel::Fair,
            40..=59 => GovernanceLevel::NeedsImprovement,
            _ => GovernanceLevel::Poor,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            GovernanceLevel::Excellent => "excellent",
            GovernanceLevel::Good => "good",
            GovernanceLevel::Fair => "fair",
            GovernanceLevel::NeedsImprovement => "needs_improvement",
            GovernanceLevel::Poor => "poor",
        }
    }
}

/// 关键指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyMetrics {
    /// 总请求数
    pub total_requests: u64,
    /// 成功请求数
    pub successful_requests: u64,
    /// 失败请求数
    pub failed_requests: u64,
    /// 成功率（百分比）
    pub success_rate: f64,
    /// 总 Token 使用量
    pub total_tokens: u64,
    /// 平均响应时间（毫秒）
    pub average_response_ms: f64,
    /// P95 响应时间（毫秒）
    pub p95_response_ms: f64,
    /// 活跃用户数
    pub active_users: u64,
    /// 活跃 Agent 数
    pub active_agents: u64,
    /// 工具调用总数
    pub total_tool_calls: u64,
    /// 缓存命中率（百分比）
    pub cache_hit_rate: f64,
}

/// 风险评估
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    /// 总体风险等级
    pub overall_risk_level: RiskLevel,
    /// 风险评分（0-100，越高风险越大）
    pub risk_score: f64,
    /// 安全风险
    pub security_risk: RiskDimension,
    /// 合规风险
    pub compliance_risk: RiskDimension,
    /// 成本风险
    pub cost_risk: RiskDimension,
    /// 性能风险
    pub performance_risk: RiskDimension,
    /// 数据风险
    pub data_risk: RiskDimension,
    /// 高风险项列表
    pub high_risk_items: Vec<RiskItem>,
}

/// 风险等级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum RiskLevel {
    /// 低风险
    Low,
    /// 中风险
    Medium,
    /// 高风险
    High,
    /// 严重风险
    Critical,
}

impl RiskLevel {
    pub fn as_str(&self) -> &str {
        match self {
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium",
            RiskLevel::High => "high",
            RiskLevel::Critical => "critical",
        }
    }

    pub fn from_score(score: f64) -> Self {
        match score as u32 {
            0..=25 => RiskLevel::Low,
            26..=50 => RiskLevel::Medium,
            51..=75 => RiskLevel::High,
            _ => RiskLevel::Critical,
        }
    }
}

/// 风险维度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskDimension {
    /// 风险等级
    pub level: RiskLevel,
    /// 风险评分（0-100）
    pub score: f64,
    /// 风险描述
    pub description: String,
    /// 风险因素
    pub factors: Vec<String>,
}

/// 风险项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskItem {
    /// 风险 ID
    pub risk_id: String,
    /// 风险类别
    pub category: String,
    /// 风险描述
    pub description: String,
    /// 风险等级
    pub level: RiskLevel,
    /// 影响范围
    pub impact: String,
    /// 建议措施
    pub recommendation: String,
    /// 发现时间
    pub detected_at: String,
}

/// 合规状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceStatus {
    /// 总体合规率（百分比）
    pub overall_compliance_rate: f64,
    /// 合规检查项总数
    pub total_checks: u32,
    /// 通过检查项数
    pub passed_checks: u32,
    /// 失败检查项数
    pub failed_checks: u32,
    /// 待处理检查项数
    pub pending_checks: u32,
    /// 合规框架
    pub frameworks: Vec<ComplianceFramework>,
    /// 不合规项
    pub non_compliant_items: Vec<NonCompliantItem>,
}

/// 合规框架
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceFramework {
    /// 框架名称
    pub name: String,
    /// 框架描述
    pub description: String,
    /// 合规率（百分比）
    pub compliance_rate: f64,
    /// 状态
    pub status: ComplianceFrameworkStatus,
}

/// 合规框架状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComplianceFrameworkStatus {
    /// 完全合规
    Compliant,
    /// 部分合规
    PartiallyCompliant,
    /// 不合规
    NonCompliant,
    /// 评估中
    UnderAssessment,
}

impl ComplianceFrameworkStatus {
    pub fn as_str(&self) -> &str {
        match self {
            ComplianceFrameworkStatus::Compliant => "compliant",
            ComplianceFrameworkStatus::PartiallyCompliant => "partially_compliant",
            ComplianceFrameworkStatus::NonCompliant => "non_compliant",
            ComplianceFrameworkStatus::UnderAssessment => "under_assessment",
        }
    }
}

/// 不合规项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NonCompliantItem {
    /// 项目 ID
    pub item_id: String,
    /// 合规框架
    pub framework: String,
    /// 控制项
    pub control: String,
    /// 描述
    pub description: String,
    /// 严重程度
    pub severity: RiskLevel,
    /// 整改建议
    pub remediation: String,
    /// 截止日期
    pub due_date: Option<String>,
    /// 状态
    pub status: String,
}

/// 成本分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostAnalysis {
    /// 总成本
    pub total_cost: f64,
    /// 货币单位
    pub currency: String,
    /// LLM 调用成本
    pub llm_cost: f64,
    /// 工具调用成本
    pub tool_cost: f64,
    /// 存储成本
    pub storage_cost: f64,
    /// 网络成本
    pub network_cost: f64,
    /// 其他成本
    pub other_cost: f64,
    /// 平均每次请求成本
    pub average_cost_per_request: f64,
    /// 成本趋势（与上一周期相比，百分比）
    pub cost_trend_percent: f64,
    /// 预算使用情况
    pub budget_usage: BudgetUsage,
    /// 成本最高的 Top 5 资源
    pub top_cost_resources: Vec<CostResource>,
}

/// 预算使用情况
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetUsage {
    /// 预算总额
    pub total_budget: f64,
    /// 已使用金额
    pub used_amount: f64,
    /// 使用率（百分比）
    pub usage_percent: f64,
    /// 预算周期
    pub budget_period: String,
    /// 是否超预算
    pub is_over_budget: bool,
    /// 预计超预算金额
    pub projected_overage: f64,
}

/// 成本资源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostResource {
    /// 资源 ID
    pub resource_id: String,
    /// 资源名称
    pub name: String,
    /// 资源类型
    pub resource_type: String,
    /// 成本
    pub cost: f64,
    /// 调用次数
    pub call_count: u64,
    /// 占总成本百分比
    pub cost_percent: f64,
}

/// 性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    /// 平均响应时间（毫秒）
    pub average_response_ms: f64,
    /// P50 响应时间（毫秒）
    pub p50_response_ms: f64,
    /// P90 响应时间（毫秒）
    pub p90_response_ms: f64,
    /// P95 响应时间（毫秒）
    pub p95_response_ms: f64,
    /// P99 响应时间（毫秒）
    pub p99_response_ms: f64,
    /// 吞吐量（请求/秒）
    pub throughput: f64,
    /// 并发数
    pub concurrency: u32,
    /// 错误率（百分比）
    pub error_rate: f64,
    /// 超时率（百分比）
    pub timeout_rate: f64,
    /// 重试率（百分比）
    pub retry_rate: f64,
    /// 性能等级
    pub performance_level: PerformanceLevel,
}

/// 性能等级
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PerformanceLevel {
    /// 优秀
    Excellent,
    /// 良好
    Good,
    /// 一般
    Fair,
    /// 较差
    Poor,
}

impl PerformanceLevel {
    pub fn as_str(&self) -> &str {
        match self {
            PerformanceLevel::Excellent => "excellent",
            PerformanceLevel::Good => "good",
            PerformanceLevel::Fair => "fair",
            PerformanceLevel::Poor => "poor",
        }
    }
}

/// 安全事件摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEventSummary {
    /// 事件 ID
    pub event_id: String,
    /// 事件类型
    pub event_type: String,
    /// 事件严重程度
    pub severity: RiskLevel,
    /// 事件描述
    pub description: String,
    /// 发生时间
    pub occurred_at: String,
    /// 受影响资源
    pub affected_resource: String,
    /// 处理状态
    pub status: String,
}

/// 审计日志摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditSummary {
    /// 总审计日志数
    pub total_audit_logs: u64,
    /// 按操作类型统计
    pub by_operation: HashMap<String, u64>,
    /// 按用户统计 Top 10
    pub by_user_top10: Vec<(String, u64)>,
    /// 按资源类型统计
    pub by_resource_type: HashMap<String, u64>,
    /// 异常操作数
    pub anomalous_operations: u64,
    /// 未授权访问尝试数
    pub unauthorized_attempts: u64,
}

/// 趋势数据点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendDataPoint {
    /// 时间点
    pub timestamp: String,
    /// 请求数
    pub requests: u64,
    /// 错误数
    pub errors: u64,
    /// 平均响应时间（毫秒）
    pub avg_response_ms: f64,
    /// Token 使用量
    pub tokens: u64,
    /// 成本
    pub cost: f64,
}

/// 建议和改进项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    /// 建议 ID
    pub recommendation_id: String,
    /// 建议类别
    pub category: String,
    /// 优先级
    pub priority: RecommendationPriority,
    /// 建议标题
    pub title: String,
    /// 建议描述
    pub description: String,
    /// 预期收益
    pub expected_benefit: String,
    /// 实施难度
    pub implementation_effort: String,
    /// 相关指标
    pub related_metrics: Vec<String>,
}

/// 建议优先级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum RecommendationPriority {
    /// 紧急
    Critical,
    /// 高
    High,
    /// 中
    Medium,
    /// 低
    Low,
}

impl RecommendationPriority {
    pub fn as_str(&self) -> &str {
        match self {
            RecommendationPriority::Critical => "critical",
            RecommendationPriority::High => "high",
            RecommendationPriority::Medium => "medium",
            RecommendationPriority::Low => "low",
        }
    }
}

/// 治理仪表盘配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceDashboardConfig {
    /// 是否启用
    pub enabled: bool,
    /// 默认时间范围
    pub default_time_range: TimeRange,
    /// 数据刷新间隔（秒）
    pub refresh_interval_seconds: u64,
    /// 趋势数据点数量
    pub trend_data_points: u32,
    /// 高风险项最大数量
    pub max_high_risk_items: u32,
    /// 建议最大数量
    pub max_recommendations: u32,
    /// 安全事件最大数量
    pub max_security_events: u32,
    /// 是否启用自动建议生成
    pub enable_auto_recommendations: bool,
    /// 治理评分权重
    pub scoring_weights: ScoringWeights,
}

impl Default for GovernanceDashboardConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_time_range: TimeRange::Last24Hours,
            refresh_interval_seconds: 300,
            trend_data_points: 24,
            max_high_risk_items: 10,
            max_recommendations: 10,
            max_security_events: 20,
            enable_auto_recommendations: true,
            scoring_weights: ScoringWeights::default(),
        }
    }
}

/// 治理评分权重
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringWeights {
    /// 安全性权重
    pub security: f64,
    /// 合规性权重
    pub compliance: f64,
    /// 成本权重
    pub cost: f64,
    /// 性能权重
    pub performance: f64,
    /// 可靠性权重
    pub reliability: f64,
}

impl Default for ScoringWeights {
    fn default() -> Self {
        Self {
            security: 0.30,
            compliance: 0.25,
            cost: 0.15,
            performance: 0.15,
            reliability: 0.15,
        }
    }
}

// ============================================================================
// 治理仪表盘生成器
// ============================================================================

/// 治理仪表盘生成器
#[derive(Clone)]
pub struct GovernanceDashboardGenerator {
    /// 配置
    config: GovernanceDashboardConfig,
    /// 仪表盘缓存（时间范围 -> 仪表盘）
    cache: Arc<Mutex<HashMap<String, (GovernanceDashboard, Instant)>>>,
    /// 安全事件历史
    security_events: Arc<Mutex<VecDeque<SecurityEventSummary>>>,
    /// 审计日志历史
    audit_logs: Arc<Mutex<VecDeque<AuditLogEntry>>>,
    /// AI 调用日志数据源（3.2c：真实统计；未注入时降级模拟）
    cost_meter: Option<Arc<crate::dsh::governance::CostMeter>>,
}

/// 审计日志条目（简化版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    /// 日志 ID
    log_id: String,
    /// 用户 ID
    user_id: String,
    /// 操作类型
    operation: String,
    /// 资源类型
    resource_type: String,
    /// 时间戳
    timestamp: String,
}

impl GovernanceDashboardGenerator {
    /// 创建新的仪表盘生成器
    pub fn new(config: GovernanceDashboardConfig) -> Self {
        Self {
            config,
            cache: Arc::new(Mutex::new(HashMap::new())),
            security_events: Arc::new(Mutex::new(VecDeque::new())),
            audit_logs: Arc::new(Mutex::new(VecDeque::new())),
            cost_meter: None,
        }
    }

    /// 注入 AI 调用日志数据源（3.2c：真实统计）
    pub fn with_cost_meter(mut self, cost_meter: Arc<crate::dsh::governance::CostMeter>) -> Self {
        self.cost_meter = Some(cost_meter);
        self
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(GovernanceDashboardConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &GovernanceDashboardConfig {
        &self.config
    }

    /// 生成治理仪表盘
    pub fn generate_dashboard(&self, time_range: Option<TimeRange>) -> GovernanceDashboard {
        let range = time_range.unwrap_or(self.config.default_time_range);
        let cache_key = range.as_str().to_string();

        // 检查缓存
        if let Some((dashboard, cached_at)) = self.cache.lock().get(&cache_key) {
            if cached_at.elapsed() < Duration::from_secs(self.config.refresh_interval_seconds) {
                return dashboard.clone();
            }
        }

        // 生成仪表盘数据
        let dashboard = self.build_dashboard(range);

        // 更新缓存
        self.cache
            .lock()
            .insert(cache_key, (dashboard.clone(), Instant::now()));

        dashboard
    }

    /// 构建仪表盘数据
    fn build_dashboard(&self, time_range: TimeRange) -> GovernanceDashboard {
        let now = chrono::Utc::now().to_rfc3339();

        // 生成模拟数据（实际实现中会从各个模块收集真实数据）
        let key_metrics = self.generate_key_metrics();
        let risk_assessment = self.generate_risk_assessment();
        let compliance_status = self.generate_compliance_status();
        let cost_analysis = self.generate_cost_analysis();
        let performance_metrics = self.generate_performance_metrics();
        let security_events = self.get_security_events();
        let audit_summary = self.generate_audit_summary();
        let trends = self.generate_trends(time_range);
        let recommendations = self.generate_recommendations(
            &risk_assessment,
            &compliance_status,
            &cost_analysis,
            &performance_metrics,
        );

        // 计算总体治理评分
        let overall_score = self.calculate_overall_score(
            &risk_assessment,
            &compliance_status,
            &cost_analysis,
            &performance_metrics,
            &key_metrics,
        );

        let governance_level = GovernanceLevel::from_score(overall_score);

        GovernanceDashboard {
            generated_at: now,
            time_range,
            overall_score,
            governance_level,
            key_metrics,
            risk_assessment,
            compliance_status,
            cost_analysis,
            performance_metrics,
            security_events,
            audit_summary,
            trends,
            recommendations,
        }
    }

    /// 生成关键指标
    fn generate_key_metrics(&self) -> KeyMetrics {
        // 3.2c：优先从真实 AI 调用日志（CostMeter）统计；未注入/锁占用时降级模拟
        if let Some(stats) = self
            .cost_meter
            .as_ref()
            .and_then(|m| m.get_global_statistics_blocking())
        {
            if stats.total_calls > 0 {
                let success_rate = if stats.total_calls > 0 {
                    (stats.successful_calls as f64 / stats.total_calls as f64) * 100.0
                } else {
                    0.0
                };
                return KeyMetrics {
                    total_requests: stats.total_calls,
                    successful_requests: stats.successful_calls,
                    failed_requests: stats.failed_calls,
                    success_rate: round2(success_rate),
                    total_tokens: stats.total_input_tokens + stats.total_output_tokens,
                    average_response_ms: round2(stats.average_duration_ms),
                    p95_response_ms: stats.average_duration_ms,
                    active_users: 0, // 真实统计不含活跃用户，由调用方补充
                    active_agents: 0,
                    total_tool_calls: stats.total_calls,
                    cache_hit_rate: 0.0,
                };
            }
        }

        // 模拟数据（实际实现中会从真实数据源收集）
        KeyMetrics {
            total_requests: 125000,
            successful_requests: 123500,
            failed_requests: 1500,
            success_rate: 98.8,
            total_tokens: 45000000,
            average_response_ms: 245.5,
            p95_response_ms: 580.0,
            active_users: 1250,
            active_agents: 45,
            total_tool_calls: 89000,
            cache_hit_rate: 67.5,
        }
    }

    /// 生成风险评估
    fn generate_risk_assessment(&self) -> RiskAssessment {
        // 优先从真实数据计算风险评估；无真实数据时降级模拟
        let security_events = self.security_events.lock();
        let security_risk_score = if !security_events.is_empty() {
            // 基于安全事件数量和严重程度计算风险分数
            let critical_count = security_events
                .iter()
                .filter(|e| e.severity == RiskLevel::Critical)
                .count();
            let high_count = security_events
                .iter()
                .filter(|e| e.severity == RiskLevel::High)
                .count();
            let medium_count = security_events
                .iter()
                .filter(|e| e.severity == RiskLevel::Medium)
                .count();
            let score = (critical_count * 30 + high_count * 15 + medium_count * 5) as f64;
            score.min(100.0)
        } else {
            15.0 // 模拟数据
        };

        let security_risk = RiskDimension {
            level: RiskLevel::from_score(security_risk_score),
            score: round2(security_risk_score),
            description: if !security_events.is_empty() {
                format!("检测到 {} 个安全事件", security_events.len())
            } else {
                "安全状况良好，无重大安全事件".to_string()
            },
            factors: vec![
                format!("安全事件总数：{}", security_events.len()),
                "输入校验覆盖率 95%".to_string(),
                "输出脱敏启用".to_string(),
            ],
        };

        let compliance_risk = RiskDimension {
            level: RiskLevel::Medium,
            score: 35.0,
            description: "部分合规项待整改".to_string(),
            factors: vec![
                "数据保留策略待完善".to_string(),
                "审计日志覆盖率 85%".to_string(),
            ],
        };

        // 成本风险：从 CostMeter 获取真实成本数据
        let cost_risk_score = if let Some(stats) = self
            .cost_meter
            .as_ref()
            .and_then(|m| m.get_global_statistics_blocking())
        {
            if stats.total_calls > 0 {
                // 基于总成本计算风险分数（示例：成本越高风险越高）
                let total_cost = stats.total_input_tokens as f64 * 0.000002
                    + stats.total_output_tokens as f64 * 0.000006;
                (total_cost / 1000.0).min(100.0)
            } else {
                20.0
            }
        } else {
            20.0 // 模拟数据
        };

        let cost_risk = RiskDimension {
            level: RiskLevel::from_score(cost_risk_score),
            score: round2(cost_risk_score),
            description: if cost_risk_score < 30.0 {
                "成本在预算范围内".to_string()
            } else {
                "成本超出预算，请检查".to_string()
            },
            factors: vec!["预算使用率 65%".to_string(), "成本趋势稳定".to_string()],
        };

        // 性能风险：从 CostMeter 获取真实性能数据
        let performance_risk_score = if let Some(stats) = self
            .cost_meter
            .as_ref()
            .and_then(|m| m.get_global_statistics_blocking())
        {
            if stats.total_calls > 0 {
                // 基于成功率计算风险分数（成功率越低风险越高）
                let success_rate = stats.successful_calls as f64 / stats.total_calls as f64 * 100.0;
                (100.0 - success_rate) * 2.0
            } else {
                18.0
            }
        } else {
            18.0 // 模拟数据
        };

        let performance_risk = RiskDimension {
            level: RiskLevel::from_score(performance_risk_score),
            score: round2(performance_risk_score),
            description: if performance_risk_score < 20.0 {
                "性能表现良好".to_string()
            } else {
                "性能表现待优化".to_string()
            },
            factors: vec![
                format!("平均响应时间 {:.0}ms", stats_average_duration(&self)),
                format!("成功率 {:.1}%", stats_success_rate(&self)),
            ],
        };

        let data_risk = RiskDimension {
            level: RiskLevel::Medium,
            score: 40.0,
            description: "数据治理需加强".to_string(),
            factors: vec![
                "敏感数据分类待完善".to_string(),
                "数据质量监控待启用".to_string(),
            ],
        };

        let overall_score = (security_risk.score
            + compliance_risk.score
            + cost_risk.score
            + performance_risk.score
            + data_risk.score)
            / 5.0;
        let overall_risk_level = RiskLevel::from_score(overall_score);

        // 高风险项：从真实安全事件生成
        let high_risk_items: Vec<RiskItem> = if !security_events.is_empty() {
            security_events
                .iter()
                .filter(|e| e.severity == RiskLevel::Critical || e.severity == RiskLevel::High)
                .take(5)
                .map(|e| RiskItem {
                    risk_id: e.event_id.clone(),
                    category: "安全事件".to_string(),
                    description: e.description.clone(),
                    level: e.severity.clone(),
                    impact: "可能导致安全事故".to_string(),
                    recommendation: "立即调查并处理安全事件".to_string(),
                    detected_at: e.occurred_at.clone(),
                })
                .collect()
        } else {
            vec![
                RiskItem {
                    risk_id: "risk_001".to_string(),
                    category: "数据治理".to_string(),
                    description: "敏感数据分类不完整，约 15% 的数据未正确分类".to_string(),
                    level: RiskLevel::High,
                    impact: "可能导致数据泄露和合规风险".to_string(),
                    recommendation: "启用自动数据分类工具，定期审计数据分类".to_string(),
                    detected_at: chrono::Utc::now().to_rfc3339(),
                },
                RiskItem {
                    risk_id: "risk_002".to_string(),
                    category: "合规".to_string(),
                    description: "数据保留策略未完全符合 GDPR 要求".to_string(),
                    level: RiskLevel::Medium,
                    impact: "可能面临合规处罚".to_string(),
                    recommendation: "更新数据保留策略，设置自动过期机制".to_string(),
                    detected_at: chrono::Utc::now().to_rfc3339(),
                },
            ]
        };

        RiskAssessment {
            overall_risk_level,
            risk_score: overall_score,
            security_risk,
            compliance_risk,
            cost_risk,
            performance_risk,
            data_risk,
            high_risk_items,
        }
    }

    /// 生成合规状态
    fn generate_compliance_status(&self) -> ComplianceStatus {
        // 优先从真实数据计算合规状态；无真实数据时降级模拟
        let security_events = self.security_events.lock();
        let audit_logs = self.audit_logs.lock();

        let total_checks = audit_logs.len() as u64;
        let failed_checks = security_events.len() as u64;
        let passed_checks = total_checks.saturating_sub(failed_checks);
        let pending_checks = 0;

        let overall_compliance_rate = if total_checks > 0 {
            (passed_checks as f64 / total_checks as f64) * 100.0
        } else {
            87.0 // 模拟数据
        };

        let frameworks = vec![
            ComplianceFramework {
                name: "GDPR".to_string(),
                description: "通用数据保护条例".to_string(),
                compliance_rate: overall_compliance_rate,
                status: if overall_compliance_rate >= 90.0 {
                    ComplianceFrameworkStatus::Compliant
                } else if overall_compliance_rate >= 70.0 {
                    ComplianceFrameworkStatus::PartiallyCompliant
                } else {
                    ComplianceFrameworkStatus::NonCompliant
                },
            },
            ComplianceFramework {
                name: "SOC2".to_string(),
                description: "服务组织控制 2 类".to_string(),
                compliance_rate: overall_compliance_rate,
                status: if overall_compliance_rate >= 90.0 {
                    ComplianceFrameworkStatus::Compliant
                } else if overall_compliance_rate >= 70.0 {
                    ComplianceFrameworkStatus::PartiallyCompliant
                } else {
                    ComplianceFrameworkStatus::NonCompliant
                },
            },
            ComplianceFramework {
                name: "ISO27001".to_string(),
                description: "信息安全管理体系".to_string(),
                compliance_rate: overall_compliance_rate,
                status: if overall_compliance_rate >= 90.0 {
                    ComplianceFrameworkStatus::Compliant
                } else if overall_compliance_rate >= 70.0 {
                    ComplianceFrameworkStatus::PartiallyCompliant
                } else {
                    ComplianceFrameworkStatus::NonCompliant
                },
            },
        ];

        // 不合规项：从真实安全事件生成
        let non_compliant_items: Vec<NonCompliantItem> = if !security_events.is_empty() {
            security_events
                .iter()
                .filter(|e| e.severity == RiskLevel::Critical || e.severity == RiskLevel::High)
                .take(5)
                .map(|e| NonCompliantItem {
                    item_id: e.event_id.clone(),
                    framework: "安全合规".to_string(),
                    control: "安全事件".to_string(),
                    description: e.description.clone(),
                    severity: e.severity.clone(),
                    remediation: "立即调查并处理安全事件".to_string(),
                    due_date: Some(e.occurred_at.clone()),
                    status: "待整改".to_string(),
                })
                .collect()
        } else {
            vec![NonCompliantItem {
                item_id: "nc_001".to_string(),
                framework: "GDPR".to_string(),
                control: "数据保留".to_string(),
                description: "用户数据保留时间超过规定期限".to_string(),
                severity: RiskLevel::High,
                remediation: "实施自动数据清理策略，设置保留期限".to_string(),
                due_date: Some(chrono::Utc::now().to_rfc3339()),
                status: "待整改".to_string(),
            }]
        };

        ComplianceStatus {
            overall_compliance_rate: round2(overall_compliance_rate),
            total_checks: total_checks as u32,
            passed_checks: passed_checks as u32,
            failed_checks: failed_checks as u32,
            pending_checks: pending_checks as u32,
            frameworks,
            non_compliant_items,
        }
    }

    /// 生成成本分析
    fn generate_cost_analysis(&self) -> CostAnalysis {
        let budget_usage = BudgetUsage {
            total_budget: 50000.0,
            used_amount: 32500.0,
            usage_percent: 65.0,
            budget_period: "月度".to_string(),
            is_over_budget: false,
            projected_overage: 0.0,
        };

        let top_cost_resources = vec![
            CostResource {
                resource_id: "llm_gpt4".to_string(),
                name: "GPT-4 调用".to_string(),
                resource_type: "llm".to_string(),
                cost: 18500.0,
                call_count: 45000,
                cost_percent: 56.9,
            },
            CostResource {
                resource_id: "llm_gpt35".to_string(),
                name: "GPT-3.5 调用".to_string(),
                resource_type: "llm".to_string(),
                cost: 8200.0,
                call_count: 80000,
                cost_percent: 25.2,
            },
        ];

        CostAnalysis {
            total_cost: 32500.0,
            currency: "CNY".to_string(),
            llm_cost: 26700.0,
            tool_cost: 3200.0,
            storage_cost: 1500.0,
            network_cost: 800.0,
            other_cost: 300.0,
            average_cost_per_request: 0.26,
            cost_trend_percent: 5.2,
            budget_usage,
            top_cost_resources,
        }
    }

    /// 生成性能指标
    fn generate_performance_metrics(&self) -> PerformanceMetrics {
        PerformanceMetrics {
            average_response_ms: 245.5,
            p50_response_ms: 180.0,
            p90_response_ms: 420.0,
            p95_response_ms: 580.0,
            p99_response_ms: 1200.0,
            throughput: 14.5,
            concurrency: 25,
            error_rate: 1.2,
            timeout_rate: 0.3,
            retry_rate: 2.1,
            performance_level: PerformanceLevel::Good,
        }
    }

    /// 获取安全事件
    fn get_security_events(&self) -> Vec<SecurityEventSummary> {
        self.security_events
            .lock()
            .iter()
            .take(self.config.max_security_events as usize)
            .cloned()
            .collect()
    }

    /// 生成审计摘要
    fn generate_audit_summary(&self) -> AuditSummary {
        // 优先从真实审计日志数据统计；未注入/锁占用时降级模拟
        let logs = self.audit_logs.lock();
        if !logs.is_empty() {
            let total_audit_logs = logs.len() as u64;

            // 按操作类型统计
            let mut by_operation = HashMap::new();
            // 按用户统计
            let mut by_user: HashMap<String, u64> = HashMap::new();
            // 按资源类型统计
            let mut by_resource_type = HashMap::new();

            for log in logs.iter() {
                *by_operation.entry(log.operation.clone()).or_insert(0) += 1;
                *by_user.entry(log.user_id.clone()).or_insert(0) += 1;
                *by_resource_type
                    .entry(log.resource_type.clone())
                    .or_insert(0) += 1;
            }

            // 按用户统计 Top 10
            let mut by_user_vec: Vec<(String, u64)> = by_user.into_iter().collect();
            by_user_vec.sort_by(|a, b| b.1.cmp(&a.1));
            let by_user_top10: Vec<(String, u64)> = by_user_vec.into_iter().take(10).collect();

            return AuditSummary {
                total_audit_logs,
                by_operation,
                by_user_top10,
                by_resource_type,
                anomalous_operations: 0, // 真实统计不含异常操作，由调用方补充
                unauthorized_attempts: 0, // 真实统计不含未授权尝试，由调用方补充
            };
        }

        // 模拟数据（实际实现中会从真实数据源收集）
        let mut by_operation = HashMap::new();
        by_operation.insert("create".to_string(), 15000u64);
        by_operation.insert("read".to_string(), 85000u64);
        by_operation.insert("update".to_string(), 12000u64);
        by_operation.insert("delete".to_string(), 3000u64);

        let by_user_top10 = vec![
            ("user_001".to_string(), 12500u64),
            ("user_002".to_string(), 8900u64),
            ("user_003".to_string(), 6200u64),
        ];

        let mut by_resource_type = HashMap::new();
        by_resource_type.insert("agent".to_string(), 45000u64);
        by_resource_type.insert("tool".to_string(), 35000u64);
        by_resource_type.insert("config".to_string(), 8000u64);
        by_resource_type.insert("knowledge".to_string(), 27000u64);

        AuditSummary {
            total_audit_logs: 115000,
            by_operation,
            by_user_top10,
            by_resource_type,
            anomalous_operations: 23,
            unauthorized_attempts: 5,
        }
    }

    /// 生成趋势数据
    fn generate_trends(&self, time_range: TimeRange) -> Vec<TrendDataPoint> {
        let points = self.config.trend_data_points as usize;
        let duration = time_range.duration();
        let duration_hours = duration.as_secs() / 3600;
        let interval_hours = (duration_hours / points as u64).max(1);

        // 优先从审计日志提取趋势数据
        let audit_logs = self.audit_logs.lock();
        if !audit_logs.is_empty() {
            let mut trends = Vec::with_capacity(points);

            // 按时间间隔分桶统计
            for i in 0..points {
                let bucket_start = chrono::Utc::now()
                    .checked_sub_signed(chrono::Duration::hours(
                        (points - i) as i64 * interval_hours as i64,
                    ))
                    .unwrap_or_else(chrono::Utc::now);
                let bucket_end = chrono::Utc::now()
                    .checked_sub_signed(chrono::Duration::hours(
                        (points - i - 1) as i64 * interval_hours as i64,
                    ))
                    .unwrap_or_else(chrono::Utc::now);

                let bucket_logs: Vec<_> = audit_logs
                    .iter()
                    .filter(|log| {
                        if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&log.timestamp) {
                            let ts_utc = ts.with_timezone(&chrono::Utc);
                            ts_utc >= bucket_start && ts_utc < bucket_end
                        } else {
                            false
                        }
                    })
                    .collect();

                let requests = bucket_logs.len() as u64;
                let errors = 0; // 真实统计不含错误数，由调用方补充
                let avg_response_ms = stats_average_duration(self);
                let tokens = 0; // 真实统计不含 token 数，由调用方补充
                let cost = 0.0; // 真实统计不含成本，由调用方补充

                trends.push(TrendDataPoint {
                    timestamp: bucket_start.to_rfc3339(),
                    requests,
                    errors,
                    avg_response_ms,
                    tokens,
                    cost,
                });
            }

            return trends;
        }

        // 模拟数据（实际实现中会从真实数据源收集）
        let mut trends = Vec::with_capacity(points);

        for i in 0..points {
            let timestamp = chrono::Utc::now()
                .checked_sub_signed(chrono::Duration::hours((points - i) as i64))
                .map(|t| t.to_rfc3339())
                .unwrap_or_default();

            trends.push(TrendDataPoint {
                timestamp,
                requests: 5000 + (i as u64 * 100),
                errors: 50 + (i as u64 * 2),
                avg_response_ms: 200.0 + (i as f64 * 5.0),
                tokens: 1500000 + (i as u64 * 50000),
                cost: 1000.0 + (i as f64 * 20.0),
            });
        }

        trends
    }

    /// 生成建议
    fn generate_recommendations(
        &self,
        risk: &RiskAssessment,
        compliance: &ComplianceStatus,
        cost: &CostAnalysis,
        performance: &PerformanceMetrics,
    ) -> Vec<Recommendation> {
        let mut recommendations = Vec::new();

        // 基于风险生成建议
        if risk.data_risk.level >= RiskLevel::High {
            recommendations.push(Recommendation {
                recommendation_id: "rec_001".to_string(),
                category: "数据治理".to_string(),
                priority: RecommendationPriority::High,
                title: "完善敏感数据分类".to_string(),
                description: "启用自动数据分类工具，对所有数据进行敏感级别标记".to_string(),
                expected_benefit: "降低数据泄露风险，提升合规性".to_string(),
                implementation_effort: "中等".to_string(),
                related_metrics: vec!["data_risk_score".to_string(), "compliance_rate".to_string()],
            });
        }

        // 基于合规生成建议
        if compliance.overall_compliance_rate < 90.0 {
            recommendations.push(Recommendation {
                recommendation_id: "rec_002".to_string(),
                category: "合规".to_string(),
                priority: RecommendationPriority::High,
                title: "整改不合规项".to_string(),
                description: "优先整改高严重程度的不合规项，确保达到合规要求".to_string(),
                expected_benefit: "提升合规率，降低合规风险".to_string(),
                implementation_effort: "高".to_string(),
                related_metrics: vec![
                    "compliance_rate".to_string(),
                    "non_compliant_items".to_string(),
                ],
            });
        }

        // 基于成本生成建议
        if cost.cost_trend_percent > 5.0 {
            recommendations.push(Recommendation {
                recommendation_id: "rec_003".to_string(),
                category: "成本优化".to_string(),
                priority: RecommendationPriority::Medium,
                title: "优化 LLM 调用成本".to_string(),
                description: "增加缓存使用率，优化提示词长度，考虑使用更经济的模型".to_string(),
                expected_benefit: "降低 15-20% 的 LLM 调用成本".to_string(),
                implementation_effort: "中等".to_string(),
                related_metrics: vec!["llm_cost".to_string(), "cache_hit_rate".to_string()],
            });
        }

        // 基于性能生成建议
        if performance.p95_response_ms > 500.0 {
            recommendations.push(Recommendation {
                recommendation_id: "rec_004".to_string(),
                category: "性能优化".to_string(),
                priority: RecommendationPriority::Medium,
                title: "优化 P95 响应时间".to_string(),
                description: "分析慢请求原因，优化数据库查询，增加缓存层".to_string(),
                expected_benefit: "将 P95 响应时间降低到 400ms 以下".to_string(),
                implementation_effort: "中等".to_string(),
                related_metrics: vec![
                    "p95_response_ms".to_string(),
                    "average_response_ms".to_string(),
                ],
            });
        }

        // 通用建议
        recommendations.push(Recommendation {
            recommendation_id: "rec_005".to_string(),
            category: "安全".to_string(),
            priority: RecommendationPriority::Low,
            title: "定期安全审计".to_string(),
            description: "建立定期安全审计机制，每月进行一次全面安全检查".to_string(),
            expected_benefit: "持续提升安全水位，及时发现潜在风险".to_string(),
            implementation_effort: "低".to_string(),
            related_metrics: vec!["security_risk_score".to_string()],
        });

        recommendations.truncate(self.config.max_recommendations as usize);
        recommendations
    }

    /// 计算总体治理评分
    fn calculate_overall_score(
        &self,
        risk: &RiskAssessment,
        compliance: &ComplianceStatus,
        cost: &CostAnalysis,
        performance: &PerformanceMetrics,
        metrics: &KeyMetrics,
    ) -> f64 {
        let weights = &self.config.scoring_weights;

        // 安全性评分（风险越低分越高）
        let security_score = (100.0 - risk.security_risk.score).max(0.0);

        // 合规性评分
        let compliance_score = compliance.overall_compliance_rate;

        // 成本评分（预算使用率在 50-80% 为最佳）
        let cost_score = if cost.budget_usage.usage_percent <= 80.0 {
            90.0
        } else if cost.budget_usage.usage_percent <= 100.0 {
            70.0
        } else {
            40.0
        };

        // 性能评分
        let performance_score = if performance.p95_response_ms <= 300.0 {
            95.0
        } else if performance.p95_response_ms <= 500.0 {
            85.0
        } else if performance.p95_response_ms <= 1000.0 {
            70.0
        } else {
            50.0
        };

        // 可靠性评分（成功率）
        let reliability_score = metrics.success_rate;

        let overall = security_score * weights.security
            + compliance_score * weights.compliance
            + cost_score * weights.cost
            + performance_score * weights.performance
            + reliability_score * weights.reliability;

        overall.min(100.0).max(0.0)
    }

    /// 记录安全事件
    pub fn record_security_event(&self, event: SecurityEventSummary) {
        let mut events = self.security_events.lock();
        events.push_front(event);
        if events.len() > 1000 {
            events.pop_back();
        }
    }

    /// 记录审计日志
    pub fn record_audit_log(&self, log: AuditLogEntry) {
        let mut logs = self.audit_logs.lock();
        logs.push_back(log);
        if logs.len() > 10000 {
            logs.pop_front();
        }
    }

    /// 清除缓存
    pub fn clear_cache(&self) {
        self.cache.lock().clear();
        info!("Governance dashboard cache cleared");
    }
}

/// 四舍五入到两位小数
fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

/// 获取平均响应时间（从 CostMeter）
fn stats_average_duration(generator: &GovernanceDashboardGenerator) -> f64 {
    generator
        .cost_meter
        .as_ref()
        .and_then(|m| m.get_global_statistics_blocking())
        .map(|s| s.average_duration_ms)
        .unwrap_or(245.5)
}

/// 获取成功率（从 CostMeter）
fn stats_success_rate(generator: &GovernanceDashboardGenerator) -> f64 {
    generator
        .cost_meter
        .as_ref()
        .and_then(|m| m.get_global_statistics_blocking())
        .map(|s| {
            if s.total_calls > 0 {
                (s.successful_calls as f64 / s.total_calls as f64) * 100.0
            } else {
                98.8
            }
        })
        .unwrap_or(98.8)
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_generator() -> GovernanceDashboardGenerator {
        GovernanceDashboardGenerator::with_defaults()
    }

    #[test]
    fn test_time_range_as_str() {
        assert_eq!(TimeRange::Last1Hour.as_str(), "1h");
        assert_eq!(TimeRange::Last24Hours.as_str(), "24h");
        assert_eq!(TimeRange::Last7Days.as_str(), "7d");
    }

    #[test]
    fn test_time_range_duration() {
        assert_eq!(TimeRange::Last1Hour.duration(), Duration::from_secs(3600));
        assert_eq!(
            TimeRange::Last24Hours.duration(),
            Duration::from_secs(86400)
        );
    }

    #[test]
    fn test_governance_level_from_score() {
        assert_eq!(
            GovernanceLevel::from_score(95.0),
            GovernanceLevel::Excellent
        );
        assert_eq!(GovernanceLevel::from_score(80.0), GovernanceLevel::Good);
        assert_eq!(GovernanceLevel::from_score(65.0), GovernanceLevel::Fair);
        assert_eq!(
            GovernanceLevel::from_score(50.0),
            GovernanceLevel::NeedsImprovement
        );
        assert_eq!(GovernanceLevel::from_score(20.0), GovernanceLevel::Poor);
    }

    #[test]
    fn test_risk_level_from_score() {
        assert_eq!(RiskLevel::from_score(10.0), RiskLevel::Low);
        assert_eq!(RiskLevel::from_score(40.0), RiskLevel::Medium);
        assert_eq!(RiskLevel::from_score(60.0), RiskLevel::High);
        assert_eq!(RiskLevel::from_score(90.0), RiskLevel::Critical);
    }

    #[test]
    fn test_performance_level_as_str() {
        assert_eq!(PerformanceLevel::Excellent.as_str(), "excellent");
        assert_eq!(PerformanceLevel::Good.as_str(), "good");
        assert_eq!(PerformanceLevel::Fair.as_str(), "fair");
        assert_eq!(PerformanceLevel::Poor.as_str(), "poor");
    }

    #[test]
    fn test_recommendation_priority_as_str() {
        assert_eq!(RecommendationPriority::Critical.as_str(), "critical");
        assert_eq!(RecommendationPriority::High.as_str(), "high");
        assert_eq!(RecommendationPriority::Medium.as_str(), "medium");
        assert_eq!(RecommendationPriority::Low.as_str(), "low");
    }

    #[test]
    fn test_compliance_framework_status_as_str() {
        assert_eq!(ComplianceFrameworkStatus::Compliant.as_str(), "compliant");
        assert_eq!(
            ComplianceFrameworkStatus::PartiallyCompliant.as_str(),
            "partially_compliant"
        );
        assert_eq!(
            ComplianceFrameworkStatus::NonCompliant.as_str(),
            "non_compliant"
        );
    }

    #[test]
    fn test_governance_dashboard_config_default() {
        let config = GovernanceDashboardConfig::default();
        assert!(config.enabled);
        assert_eq!(config.default_time_range, TimeRange::Last24Hours);
        assert_eq!(config.refresh_interval_seconds, 300);
    }

    #[test]
    fn test_scoring_weights_default() {
        let weights = ScoringWeights::default();
        assert!(
            (weights.security
                + weights.compliance
                + weights.cost
                + weights.performance
                + weights.reliability
                - 1.0)
                .abs()
                < 0.001
        );
    }

    #[test]
    fn test_generator_creation() {
        let generator = create_test_generator();
        assert!(generator.config().enabled);
    }

    #[test]
    fn test_generate_dashboard() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(dashboard.overall_score >= 0.0);
        assert!(dashboard.overall_score <= 100.0);
        assert!(dashboard.key_metrics.total_requests != 0);
        assert!(!dashboard.recommendations.is_empty());
        assert!(!dashboard.trends.is_empty());
    }

    #[test]
    fn test_generate_dashboard_with_time_range() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(Some(TimeRange::Last7Days));

        assert_eq!(dashboard.time_range, TimeRange::Last7Days);
    }

    #[test]
    fn test_dashboard_caching() {
        let generator = create_test_generator();

        // 第一次生成
        let dashboard1 = generator.generate_dashboard(None);

        // 第二次生成（应该使用缓存）
        let dashboard2 = generator.generate_dashboard(None);

        assert_eq!(dashboard1.generated_at, dashboard2.generated_at);
    }

    #[test]
    fn test_clear_cache() {
        let generator = create_test_generator();
        generator.generate_dashboard(None);
        generator.clear_cache();

        // 清除缓存后应该重新生成
        let dashboard = generator.generate_dashboard(None);
        assert!(dashboard.overall_score >= 0.0);
    }

    #[test]
    fn test_record_security_event() {
        let generator = create_test_generator();

        let event = SecurityEventSummary {
            event_id: "evt_001".to_string(),
            event_type: "suspicious_login".to_string(),
            severity: RiskLevel::High,
            description: "检测到可疑登录尝试".to_string(),
            occurred_at: chrono::Utc::now().to_rfc3339(),
            affected_resource: "user_account".to_string(),
            status: "investigating".to_string(),
        };

        generator.record_security_event(event);

        let dashboard = generator.generate_dashboard(None);
        assert!(!dashboard.security_events.is_empty());
    }

    #[test]
    fn test_key_metrics_values() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(dashboard.key_metrics.success_rate >= 0.0);
        assert!(dashboard.key_metrics.success_rate <= 100.0);
        assert!(dashboard.key_metrics.cache_hit_rate >= 0.0);
        assert!(dashboard.key_metrics.cache_hit_rate <= 100.0);
    }

    #[test]
    fn test_risk_assessment_structure() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(dashboard.risk_assessment.risk_score >= 0.0);
        assert!(dashboard.risk_assessment.risk_score <= 100.0);
        assert!(!dashboard.risk_assessment.high_risk_items.is_empty());
    }

    #[test]
    fn test_compliance_status_structure() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(dashboard.compliance_status.overall_compliance_rate >= 0.0);
        assert!(dashboard.compliance_status.overall_compliance_rate <= 100.0);
        assert!(!dashboard.compliance_status.frameworks.is_empty());
    }

    #[test]
    fn test_cost_analysis_structure() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(dashboard.cost_analysis.total_cost >= 0.0);
        assert!(dashboard.cost_analysis.budget_usage.usage_percent >= 0.0);
        assert!(!dashboard.cost_analysis.top_cost_resources.is_empty());
    }

    #[test]
    fn test_performance_metrics_structure() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(dashboard.performance_metrics.average_response_ms >= 0.0);
        assert!(
            dashboard.performance_metrics.p95_response_ms
                >= dashboard.performance_metrics.p50_response_ms
        );
        assert!(dashboard.performance_metrics.error_rate >= 0.0);
    }

    #[test]
    fn test_trends_structure() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(!dashboard.trends.is_empty());
        assert_eq!(
            dashboard.trends.len(),
            generator.config().trend_data_points as usize
        );
    }

    #[test]
    fn test_recommendations_structure() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        assert!(!dashboard.recommendations.is_empty());
        assert!(dashboard.recommendations.len() <= generator.config().max_recommendations as usize);
    }

    #[test]
    fn test_governance_level_consistency() {
        let generator = create_test_generator();
        let dashboard = generator.generate_dashboard(None);

        let expected_level = GovernanceLevel::from_score(dashboard.overall_score);
        assert_eq!(dashboard.governance_level, expected_level);
    }

    #[tokio::test]
    async fn test_key_metrics_from_real_cost_meter() {
        // 3.2c：注入真实 AI 调用日志（CostMeter）后，关键指标来自真实统计
        use crate::dsh::governance::cost_metering::{AiCallRecord, CostMeter};

        let meter = Arc::new(CostMeter::new());
        // 记录 3 次成功 + 1 次失败
        meter
            .record_call(AiCallRecord::new(
                "u1",
                "t1",
                "mock-model",
                100,
                50,
                0.001,
                10,
            ))
            .await;
        meter
            .record_call(AiCallRecord::new(
                "u1",
                "t1",
                "mock-model",
                200,
                100,
                0.002,
                20,
            ))
            .await;
        meter
            .record_call(AiCallRecord::new(
                "u1",
                "t1",
                "mock-model",
                300,
                150,
                0.003,
                30,
            ))
            .await;
        meter
            .record_call(
                AiCallRecord::new("u1", "t1", "mock-model", 0, 0, 0.0, 5).with_error("boom"),
            )
            .await;

        let generator = GovernanceDashboardGenerator::with_defaults().with_cost_meter(meter);
        let metrics = generator.generate_key_metrics();

        assert_eq!(metrics.total_requests, 4, "真实调用次数应为 4");
        assert_eq!(metrics.successful_requests, 3);
        assert_eq!(metrics.failed_requests, 1);
        assert!((metrics.success_rate - 75.0).abs() < 0.01, "成功率应为 75%");
        assert_eq!(
            metrics.total_tokens,
            100 + 50 + 200 + 100 + 300 + 150,
            "token 应为真实累计"
        );
        // 平均耗时 (10+20+30+5)/4 = 16.25
        assert!((metrics.average_response_ms - 16.25).abs() < 0.01);
    }

    #[test]
    fn test_key_metrics_falls_back_to_simulated_when_empty() {
        // 空 CostMeter（无调用记录）→ 降级模拟数据（保持旧行为）
        use crate::dsh::governance::cost_metering::CostMeter;

        let meter = Arc::new(CostMeter::new());
        let generator = GovernanceDashboardGenerator::with_defaults().with_cost_meter(meter);
        let metrics = generator.generate_key_metrics();
        // 空数据源 → 走模拟分支
        assert_eq!(metrics.total_requests, 125000);
        assert_eq!(metrics.success_rate, 98.8);
    }

    #[test]
    fn test_key_metrics_without_cost_meter_simulated() {
        // 未注入 CostMeter → 模拟数据
        let generator = GovernanceDashboardGenerator::with_defaults();
        let metrics = generator.generate_key_metrics();
        assert_eq!(metrics.total_requests, 125000);
    }
}
