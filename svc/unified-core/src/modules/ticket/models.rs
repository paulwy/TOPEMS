//! 工单数据模型

use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 工单状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TicketStatus {
    Open,       // 待处理
    InProgress, // 处理中
    Pending,    // 等待反馈/外部依赖
    Resolved,   // 已解决
    Closed,     // 已关闭
    Cancelled,  // 已取消
}

impl TicketStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TicketStatus::Open => "open",
            TicketStatus::InProgress => "in_progress",
            TicketStatus::Pending => "pending",
            TicketStatus::Resolved => "resolved",
            TicketStatus::Closed => "closed",
            TicketStatus::Cancelled => "cancelled",
        }
    }
}

impl std::fmt::Display for TicketStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for TicketStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "open" => Ok(TicketStatus::Open),
            "in_progress" => Ok(TicketStatus::InProgress),
            "pending" => Ok(TicketStatus::Pending),
            "resolved" => Ok(TicketStatus::Resolved),
            "closed" => Ok(TicketStatus::Closed),
            "cancelled" => Ok(TicketStatus::Cancelled),
            other => Err(format!("Invalid ticket status: {}", other)),
        }
    }
}

/// 工单严重级别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TicketSeverity {
    Low,      // 低
    Medium,   // 中
    High,     // 高
    Critical, // 严重
}

impl TicketSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            TicketSeverity::Low => "low",
            TicketSeverity::Medium => "medium",
            TicketSeverity::High => "high",
            TicketSeverity::Critical => "critical",
        }
    }
}

impl std::fmt::Display for TicketSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for TicketSeverity {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "low" => Ok(TicketSeverity::Low),
            "medium" => Ok(TicketSeverity::Medium),
            "high" => Ok(TicketSeverity::High),
            "critical" => Ok(TicketSeverity::Critical),
            other => Err(format!("Invalid ticket severity: {}", other)),
        }
    }
}

/// 工单类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TicketType {
    ReconciliationDiff, // 对账差异
    ApprovalTimeout,    // 审批超时
    SystemAlert,        // 系统告警
    DataIssue,          // 数据问题
    IntegrationError,   // 集成异常
    UserRequest,        // 用户请求
    Other,              // 其他
}

impl TicketType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TicketType::ReconciliationDiff => "reconciliation_diff",
            TicketType::ApprovalTimeout => "approval_timeout",
            TicketType::SystemAlert => "system_alert",
            TicketType::DataIssue => "data_issue",
            TicketType::IntegrationError => "integration_error",
            TicketType::UserRequest => "user_request",
            TicketType::Other => "other",
        }
    }
}

impl std::fmt::Display for TicketType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for TicketType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "reconciliation_diff" => Ok(TicketType::ReconciliationDiff),
            "approval_timeout" => Ok(TicketType::ApprovalTimeout),
            "system_alert" => Ok(TicketType::SystemAlert),
            "data_issue" => Ok(TicketType::DataIssue),
            "integration_error" => Ok(TicketType::IntegrationError),
            "user_request" => Ok(TicketType::UserRequest),
            _ => Ok(TicketType::Other),
        }
    }
}

/// 工单主表
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Ticket {
    pub id: Uuid,
    pub ticket_no: String, // 工单号（业务可读）
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub ticket_type: String,                // TicketType as string
    pub severity: String,                   // TicketSeverity as string
    pub status: String,                     // TicketStatus as string
    pub source_service: String,             // 来源服务（如 finance/erp）
    pub source_business_id: Option<String>, // 关联业务单据 ID（如对账 session id）
    pub assignee_id: Option<Uuid>,          // 负责人
    pub reporter_id: Option<Uuid>,          // 报告人
    pub sla_due_at: Option<DateTime<Utc>>,  // SLA 截止时间
    pub resolved_at: Option<DateTime<Utc>>,
    pub closed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

/// 工单评论
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TicketComment {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub user_name: Option<String>,
    pub content: String,
    pub is_internal: bool, // 是否内部备注（对报告人不可见）
    pub created_at: DateTime<Utc>,
}

/// 工单操作日志
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TicketActivity {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Option<Uuid>,
    pub action: String, // created/assigned/updated/commented/resolved/closed/sla_escalated
    pub from_value: Option<String>,
    pub to_value: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// SLA 策略
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TicketSlaPolicy {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub ticket_type: Option<String>,
    pub severity: Option<String>,
    pub response_hours: f64,                  // 响应时限（首次响应）
    pub resolution_hours: f64,                // 解决时限
    pub escalation_levels: i32,               // 升级级别数
    pub escalation_hours_1: Option<f64>,      // 一级升级时限
    pub escalation_hours_2: Option<f64>,      // 二级升级时限
    pub escalation_hours_3: Option<f64>,      // 三级升级时限
    pub working_hours_only: bool,             // 是否只计算工作时间
    pub business_hours_start: Option<String>, // 工作开始时间 "09:00"
    pub business_hours_end: Option<String>,   // 工作结束时间 "18:00"
    pub weekend_excluded: bool,               // 是否排除周末
    pub is_default: bool,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// SLA 计算结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketSlaInfo {
    pub sla_due_at: Option<DateTime<Utc>>,
    pub response_due_at: Option<DateTime<Utc>>,
    pub is_breached: bool,
    pub response_breached: bool,
    pub time_remaining_minutes: Option<i64>,
    pub response_time_remaining_minutes: Option<i64>,
    pub current_escalation_level: i32,
    pub escalation_history: Vec<SlaEscalationEvent>,
    pub policy_name: Option<String>,
    pub resolution_hours: Option<f64>,
    pub response_hours: Option<f64>,
}

/// SLA 升级事件
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SlaEscalationEvent {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub tenant_id: Uuid,
    pub level: i32,
    pub escalation_time: DateTime<Utc>,
    pub escalated_to: Option<Uuid>,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// SLA 统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketSlaStats {
    pub total: i64,
    pub on_time: i64,
    pub breached: i64,
    pub breach_rate: f64,
    pub avg_resolution_minutes: Option<f64>,
    pub avg_response_minutes: Option<f64>,
    pub by_severity: Vec<SlaSeverityStat>,
    pub by_type: Vec<SlaTypeStat>,
    pub breach_trend: Vec<SlaBreachTrendItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlaSeverityStat {
    pub severity: String,
    pub total: i64,
    pub breached: i64,
    pub breach_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlaTypeStat {
    pub ticket_type: String,
    pub total: i64,
    pub breached: i64,
    pub breach_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlaBreachTrendItem {
    pub date: String,
    pub total: i64,
    pub breached: i64,
}

/// SLA 策略请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSlaPolicyRequest {
    pub name: String,
    pub description: Option<String>,
    pub ticket_type: Option<String>,
    pub severity: Option<String>,
    pub response_hours: f64,
    pub resolution_hours: f64,
    pub escalation_levels: i32,
    pub escalation_hours_1: Option<f64>,
    pub escalation_hours_2: Option<f64>,
    pub escalation_hours_3: Option<f64>,
    pub working_hours_only: Option<bool>,
    pub business_hours_start: Option<String>,
    pub business_hours_end: Option<String>,
    pub weekend_excluded: Option<bool>,
    pub is_default: Option<bool>,
}

/// 更新 SLA 策略请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSlaPolicyRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub response_hours: Option<f64>,
    pub resolution_hours: Option<f64>,
    pub escalation_levels: Option<i32>,
    pub escalation_hours_1: Option<f64>,
    pub escalation_hours_2: Option<f64>,
    pub escalation_hours_3: Option<f64>,
    pub working_hours_only: Option<bool>,
    pub weekend_excluded: Option<bool>,
    pub is_default: Option<bool>,
    pub is_active: Option<bool>,
}

// ==================== 请求/响应模型 ====================

/// 创建工单请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTicketRequest {
    pub title: String,
    pub description: Option<String>,
    pub ticket_type: String,      // TicketType
    pub severity: Option<String>, // 缺省 medium
    pub source_service: String,
    pub source_business_id: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub sla_hours: Option<i32>, // SLA 时长（小时），用于计算 sla_due_at
    pub tags: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

/// 更新工单请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTicketRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

/// 工单查询参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketQuery {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub ticket_type: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub reporter_id: Option<Uuid>,
    pub source_service: Option<String>,
    pub source_business_id: Option<String>,
    pub sla_breached: Option<bool>, // SLA 是否已超时
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 工单列表响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketListResponse {
    pub items: Vec<Ticket>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// 添加评论请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddCommentRequest {
    pub content: String,
    pub is_internal: Option<bool>,
}

/// 工单统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketStats {
    pub total: i64,
    pub open: i64,
    pub in_progress: i64,
    pub pending: i64,
    pub resolved: i64,
    pub closed: i64,
    pub sla_breached: i64,
    pub by_severity: Vec<SeverityCount>,
    pub by_type: Vec<TypeCount>,
    pub by_source: Vec<SourceCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeverityCount {
    pub severity: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeCount {
    pub ticket_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceCount {
    pub source_service: String,
    pub count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ticket_status_roundtrip() {
        let statuses = vec![
            TicketStatus::Open,
            TicketStatus::InProgress,
            TicketStatus::Pending,
            TicketStatus::Resolved,
            TicketStatus::Closed,
            TicketStatus::Cancelled,
        ];
        for s in statuses {
            let str_val = s.as_str();
            let parsed: TicketStatus = str_val.parse().unwrap();
            assert_eq!(parsed, s);
        }
    }

    #[test]
    fn test_ticket_severity_roundtrip() {
        let severities = vec![
            TicketSeverity::Low,
            TicketSeverity::Medium,
            TicketSeverity::High,
            TicketSeverity::Critical,
        ];
        for s in severities {
            let str_val = s.as_str();
            let parsed: TicketSeverity = str_val.parse().unwrap();
            assert_eq!(parsed, s);
        }
    }

    #[test]
    fn test_ticket_type_roundtrip() {
        let types = vec![
            TicketType::ReconciliationDiff,
            TicketType::ApprovalTimeout,
            TicketType::SystemAlert,
            TicketType::DataIssue,
            TicketType::IntegrationError,
            TicketType::UserRequest,
            TicketType::Other,
        ];
        for t in types {
            let str_val = t.as_str();
            let parsed: TicketType = str_val.parse().unwrap();
            assert_eq!(parsed, t);
        }
    }

    #[test]
    fn test_ticket_status_serialization() {
        let status = TicketStatus::InProgress;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"in_progress\"");
    }

    #[test]
    fn test_ticket_severity_serialization() {
        let sev = TicketSeverity::Critical;
        let json = serde_json::to_string(&sev).unwrap();
        assert_eq!(json, "\"critical\"");
    }

    #[test]
    fn test_ticket_type_serialization() {
        let ty = TicketType::ReconciliationDiff;
        let json = serde_json::to_string(&ty).unwrap();
        assert_eq!(json, "\"reconciliation_diff\"");
    }

    #[test]
    fn test_invalid_status_returns_error() {
        let result: Result<TicketStatus, _> = "invalid".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_unknown_type_fallback_to_other() {
        let result: TicketType = "unknown_future_type".parse().unwrap();
        assert_eq!(result, TicketType::Other);
    }
}
