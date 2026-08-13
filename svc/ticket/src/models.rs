#![allow(dead_code)] // serde/utoipa 序列化需要，运行期未直接引用

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

// ==================== Pure Functions ====================

/// 根据 impact 和 urgency 推导工单优先级
pub fn derive_priority(impact: u8, urgency: u8) -> &'static str {
    let score = impact as u16 + urgency as u16;
    match score {
        0..=1 => "low",
        2..=3 => "medium",
        4..=5 => "high",
        _ => "critical",
    }
}

/// 校验工单状态转换是否合法
pub fn is_valid_ticket_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match (from, to) {
        ("open", "in_progress")
        | ("open", "pending")
        | ("open", "resolved")
        | ("open", "cancelled") => true,
        ("in_progress", "pending")
        | ("in_progress", "resolved")
        | ("in_progress", "open")
        | ("in_progress", "cancelled") => true,
        ("pending", "in_progress")
        | ("pending", "open")
        | ("pending", "resolved")
        | ("pending", "cancelled") => true,
        ("resolved", "closed") | ("resolved", "in_progress") | ("resolved", "open") => true,
        ("closed", "open") | ("closed", "in_progress") => true,
        ("cancelled", "open") | ("cancelled", "in_progress") => true,
        _ => false,
    }
}

/// 判断工单是否需要升级
pub fn should_escalate(priority: &str, sla_breached: bool, reopen_count: u32) -> bool {
    if sla_breached {
        return match priority {
            "critical" | "high" => true,
            _ => reopen_count >= 1,
        };
    }
    reopen_count >= 2
}

/// 生成工单编号
pub fn generate_ticket_number(prefix: &str, seq: u64) -> String {
    format!("{}{:06}", prefix, seq % 1_000_000)
}

/// 根据关键词分类工单
pub fn classify_ticket_category<'a>(subject: &str, keywords: &'a [&'a str]) -> Option<&'a str> {
    let lower = subject.to_lowercase();
    for kw in keywords {
        if lower.contains(kw) {
            return Some(*kw);
        }
    }
    None
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TicketStatus {
    Open,
    InProgress,
    Pending,
    Resolved,
    Closed,
    Cancelled,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TicketSeverity {
    Low,
    Medium,
    High,
    Critical,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TicketType {
    ReconciliationDiff,
    ApprovalTimeout,
    SystemAlert,
    DataIssue,
    IntegrationError,
    UserRequest,
    Other,
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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Ticket {
    pub id: Uuid,
    pub ticket_no: String,
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub ticket_type: String,
    pub severity: String,
    pub status: String,
    pub source_service: String,
    pub source_business_id: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub reporter_id: Option<Uuid>,
    pub sla_due_at: Option<DateTime<Utc>>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub closed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct TicketComment {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub user_name: Option<String>,
    pub content: String,
    pub is_internal: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct TicketActivity {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub from_value: Option<String>,
    pub to_value: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct TicketSlaPolicy {
    pub id: Uuid,
    pub tenant_id: Uuid,
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
    pub working_hours_only: bool,
    pub business_hours_start: Option<String>,
    pub business_hours_end: Option<String>,
    pub weekend_excluded: bool,
    pub is_default: bool,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SlaSeverityStat {
    pub severity: String,
    pub total: i64,
    pub breached: i64,
    pub breach_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SlaTypeStat {
    pub ticket_type: String,
    pub total: i64,
    pub breached: i64,
    pub breach_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SlaBreachTrendItem {
    pub date: String,
    pub total: i64,
    pub breached: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTicketRequest {
    pub title: String,
    pub description: Option<String>,
    pub ticket_type: String,
    pub severity: Option<String>,
    pub source_service: String,
    pub source_business_id: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub sla_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateTicketRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TicketQuery {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub ticket_type: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub reporter_id: Option<Uuid>,
    pub source_service: Option<String>,
    pub source_business_id: Option<String>,
    pub sla_breached: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TicketListResponse {
    pub items: Vec<Ticket>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AddCommentRequest {
    pub content: String,
    pub is_internal: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SeverityCount {
    pub severity: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TypeCount {
    pub ticket_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SourceCount {
    pub source_service: String,
    pub count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== derive_priority ==========

    #[test]
    fn test_derive_priority_low() {
        assert_eq!(derive_priority(0, 0), "low");
        assert_eq!(derive_priority(0, 1), "low");
        assert_eq!(derive_priority(1, 0), "low");
    }

    #[test]
    fn test_derive_priority_medium() {
        assert_eq!(derive_priority(1, 1), "medium");
        assert_eq!(derive_priority(1, 2), "medium");
        assert_eq!(derive_priority(2, 1), "medium");
    }

    #[test]
    fn test_derive_priority_high() {
        assert_eq!(derive_priority(2, 2), "high");
        assert_eq!(derive_priority(2, 3), "high");
        assert_eq!(derive_priority(3, 2), "high");
    }

    #[test]
    fn test_derive_priority_critical() {
        assert_eq!(derive_priority(3, 3), "critical");
        assert_eq!(derive_priority(5, 5), "critical");
    }

    #[test]
    fn test_derive_priority_boundary() {
        // score 1 -> low
        assert_eq!(derive_priority(0, 1), "low");
        // score 2 -> medium
        assert_eq!(derive_priority(1, 1), "medium");
        // score 4 -> high
        assert_eq!(derive_priority(2, 2), "high");
        // score 6 -> critical
        assert_eq!(derive_priority(3, 3), "critical");
    }

    // ========== is_valid_ticket_transition ==========

    #[test]
    fn test_transition_same_status() {
        assert!(is_valid_ticket_transition("open", "open"));
        assert!(is_valid_ticket_transition("closed", "closed"));
    }

    #[test]
    fn test_transition_open_to_in_progress() {
        assert!(is_valid_ticket_transition("open", "in_progress"));
    }

    #[test]
    fn test_transition_open_to_resolved() {
        assert!(is_valid_ticket_transition("open", "resolved"));
    }

    #[test]
    fn test_transition_resolved_to_closed() {
        assert!(is_valid_ticket_transition("resolved", "closed"));
    }

    #[test]
    fn test_transition_invalid_closed_to_cancelled() {
        assert!(!is_valid_ticket_transition("closed", "cancelled"));
    }

    #[test]
    fn test_transition_invalid_unknown_status() {
        assert!(!is_valid_ticket_transition("open", "unknown"));
        assert!(!is_valid_ticket_transition("unknown", "open"));
    }

    #[test]
    fn test_transition_reopen() {
        assert!(is_valid_ticket_transition("resolved", "in_progress"));
        assert!(is_valid_ticket_transition("closed", "open"));
    }

    #[test]
    fn test_transition_open_to_cancelled() {
        assert!(is_valid_ticket_transition("open", "cancelled"));
    }

    #[test]
    fn test_transition_in_progress_to_pending() {
        assert!(is_valid_ticket_transition("in_progress", "pending"));
    }

    // ========== should_escalate ==========

    #[test]
    fn test_escalate_critical_breached() {
        assert!(should_escalate("critical", true, 0));
    }

    #[test]
    fn test_escalate_high_breached() {
        assert!(should_escalate("high", true, 0));
    }

    #[test]
    fn test_escalate_medium_breached_no_reopen() {
        assert!(!should_escalate("medium", true, 0));
    }

    #[test]
    fn test_escalate_medium_breached_with_reopen() {
        assert!(should_escalate("medium", true, 1));
    }

    #[test]
    fn test_escalate_not_breached_two_reopens() {
        assert!(should_escalate("low", false, 2));
    }

    #[test]
    fn test_escalate_not_breached_one_reopen() {
        assert!(!should_escalate("low", false, 1));
    }

    #[test]
    fn test_escalate_no_condition_met() {
        assert!(!should_escalate("critical", false, 0));
    }

    // ========== generate_ticket_number ==========

    #[test]
    fn test_generate_ticket_number_basic() {
        assert_eq!(generate_ticket_number("TK", 1), "TK000001");
    }

    #[test]
    fn test_generate_ticket_number_zero() {
        assert_eq!(generate_ticket_number("TK", 0), "TK000000");
    }

    #[test]
    fn test_generate_ticket_number_max() {
        assert_eq!(generate_ticket_number("TK", 999999), "TK999999");
    }

    #[test]
    fn test_generate_ticket_number_overflow() {
        assert_eq!(generate_ticket_number("TK", 1_000_000), "TK000000");
    }

    #[test]
    fn test_generate_ticket_number_large() {
        assert_eq!(generate_ticket_number("TK", 1_000_001), "TK000001");
    }

    #[test]
    fn test_generate_ticket_number_different_prefix() {
        assert_eq!(generate_ticket_number("TICKET-", 42), "TICKET-000042");
    }

    // ========== classify_ticket_category ==========

    #[test]
    fn test_classify_match() {
        let kws = ["bug", "feature", "urgent"];
        assert_eq!(
            classify_ticket_category("This is a bug report", &kws),
            Some("bug")
        );
    }

    #[test]
    fn test_classify_case_insensitive() {
        let kws = ["bug"];
        assert_eq!(classify_ticket_category("BUG report", &kws), Some("bug"));
    }

    #[test]
    fn test_classify_no_match() {
        let kws = ["bug", "feature"];
        assert_eq!(classify_ticket_category("Hello world", &kws), None);
    }

    #[test]
    fn test_classify_empty_subject() {
        let kws = ["bug"];
        assert_eq!(classify_ticket_category("", &kws), None);
    }

    #[test]
    fn test_classify_empty_keywords() {
        assert_eq!(classify_ticket_category("Hello world", &[]), None);
    }

    #[test]
    fn test_classify_first_match_wins() {
        let kws = ["bug", "ug"];
        assert_eq!(classify_ticket_category("bug", &kws), Some("bug"));
    }
}
