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

// ==================== Feedback 兼容纯函数（从 feedback 服务迁移） ====================

use std::collections::HashSet;

/// 标准化反馈标签：去除首尾空格、转小写、空格替换为下划线
pub fn normalize_feedback_tag(tag: &str) -> String {
    tag.trim().to_lowercase().replace(' ', "_")
}

/// 反馈去重：基于标准化后的主题去重，保留原始顺序和大小写
pub fn deduplicate_feedback(subjects: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for s in subjects {
        let key = s.trim().to_lowercase();
        if seen.insert(key) {
            result.push(s.clone());
        }
    }
    result
}

/// 根据受影响用户数和严重程度确定反馈优先级
pub fn feedback_priority(affected_users: u32, severity: &str) -> &'static str {
    let sev = severity.to_lowercase();
    match (affected_users, sev.as_str()) {
        (n, "critical") if n >= 100 => "P0",
        (n, "critical") if n >= 10 => "P1",
        (_, "critical") => "P2",
        (n, "high") if n >= 100 => "P1",
        (n, "high") if n >= 10 => "P2",
        (_, "high") => "P3",
        (n, "medium") if n >= 100 => "P2",
        (n, "medium") if n >= 10 => "P3",
        (_, "medium") => "P4",
        (n, "low") if n >= 100 => "P3",
        (n, "low") if n >= 10 => "P4",
        (_, "low") => "P4",
        _ => "P4",
    }
}

/// 计算响应时间（小时），若响应早于或等于创建时间则返回 0
pub fn calculate_response_time_hours(created_at: i64, responded_at: i64) -> f64 {
    if responded_at <= created_at {
        return 0.0;
    }
    (responded_at - created_at) as f64 / 3600.0
}

/// 判断反馈是否违反 SLA（超出规定响应时间）
pub fn is_feedback_sla_breached(created_at: i64, sla_hours: i64, now: i64) -> bool {
    if now <= created_at {
        return false;
    }
    let elapsed_hours = (now - created_at) as f64 / 3600.0;
    elapsed_hours > sla_hours as f64
}

/// 校验反馈评分（1-5 星）
pub fn validate_rating(rating: i32) -> Result<(), String> {
    if (1..=5).contains(&rating) {
        Ok(())
    } else {
        Err(format!("rating must be between 1 and 5, got {}", rating))
    }
}

/// 根据主题和正文分类反馈类别
pub fn classify_feedback_category(subject: &str, body: &str) -> &'static str {
    let combined = format!("{} {}", subject.to_lowercase(), body.to_lowercase());
    if combined.contains("bug")
        || combined.contains("error")
        || combined.contains("crash")
        || combined.contains("broken")
        || combined.contains("fail")
    {
        return "bug";
    }
    if combined.contains("feature")
        || combined.contains("request")
        || combined.contains("suggest")
        || combined.contains("enhancement")
        || combined.contains("wish")
    {
        return "feature";
    }
    if combined.contains("great")
        || combined.contains("awesome")
        || combined.contains("love")
        || combined.contains("good")
        || combined.contains("excellent")
        || combined.contains("nice")
    {
        return "praise";
    }
    if combined.contains("slow")
        || combined.contains("bad")
        || combined.contains("terrible")
        || combined.contains("hate")
        || combined.contains("worst")
        || combined.contains("angry")
    {
        return "complaint";
    }
    "other"
}

/// 根据评分推断情感倾向
pub fn sentiment_from_rating(rating: i32) -> &'static str {
    if rating >= 4 {
        "positive"
    } else if rating == 3 {
        "neutral"
    } else {
        "negative"
    }
}

/// 校验反馈状态转换是否合法
pub fn is_valid_feedback_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "pending" => matches!(to, "open" | "in_progress" | "resolved" | "closed"),
        "open" | "in_progress" => matches!(to, "resolved" | "closed" | "pending"),
        "resolved" => matches!(to, "closed" | "open" | "in_progress"),
        "closed" => false,
        _ => false,
    }
}

/// 计算反馈评分统计（平均分、最低分、最高分、数量）
pub fn feedback_rating_stats(ratings: &[i32]) -> (f64, i32, i32, usize) {
    if ratings.is_empty() {
        return (0.0, 0, 0, 0);
    }
    let count = ratings.len();
    let sum: i64 = ratings.iter().map(|&r| r as i64).sum();
    let avg = sum as f64 / count as f64;
    let (min, max) = match (ratings.iter().min(), ratings.iter().max()) {
        (Some(&mn), Some(&mx)) => (mn, mx),
        _ => (0, 0),
    };
    (avg, min, max, count)
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

    // ========== Feedback 兼容纯函数测试（从 feedback 服务迁移） ==========

    // ---- normalize_feedback_tag ----

    #[test]
    fn test_normalize_tag_basic() {
        assert_eq!(normalize_feedback_tag("  Bug Report  "), "bug_report");
    }

    #[test]
    fn test_normalize_tag_lowercase() {
        assert_eq!(normalize_feedback_tag("FeatureRequest"), "featurerequest");
    }

    #[test]
    fn test_normalize_tag_spaces() {
        assert_eq!(
            normalize_feedback_tag("very important bug"),
            "very_important_bug"
        );
    }

    #[test]
    fn test_normalize_tag_empty() {
        assert_eq!(normalize_feedback_tag(""), "");
        assert_eq!(normalize_feedback_tag("   "), "");
    }

    #[test]
    fn test_normalize_tag_no_change() {
        assert_eq!(normalize_feedback_tag("bug"), "bug");
    }

    #[test]
    fn test_normalize_tag_multiple_spaces() {
        assert_eq!(normalize_feedback_tag("a  b"), "a__b");
    }

    // ---- deduplicate_feedback ----

    #[test]
    fn test_dedup_empty() {
        assert!(deduplicate_feedback(&[]).is_empty());
    }

    #[test]
    fn test_dedup_no_duplicates() {
        let input: Vec<String> = vec!["a".into(), "b".into(), "c".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_dedup_exact_duplicates() {
        let input: Vec<String> = vec!["bug".into(), "bug".into(), "bug".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, vec!["bug".to_string()]);
    }

    #[test]
    fn test_dedup_case_insensitive() {
        let input: Vec<String> = vec!["Bug".into(), "BUG".into(), "bug".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, vec!["Bug".to_string()]);
    }

    #[test]
    fn test_dedup_preserves_first() {
        let input: Vec<String> = vec!["  Bug  ".into(), "bug".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(result, vec!["  Bug  ".to_string()]);
    }

    #[test]
    fn test_dedup_preserves_order() {
        let input: Vec<String> = vec!["c".into(), "a".into(), "b".into(), "a".into(), "c".into()];
        let result = deduplicate_feedback(&input);
        assert_eq!(
            result,
            vec!["c".to_string(), "a".to_string(), "b".to_string()]
        );
    }

    // ---- feedback_priority ----

    #[test]
    fn test_priority_critical_high_users() {
        assert_eq!(feedback_priority(100, "critical"), "P0");
        assert_eq!(feedback_priority(500, "critical"), "P0");
    }

    #[test]
    fn test_priority_critical_medium_users() {
        assert_eq!(feedback_priority(10, "critical"), "P1");
        assert_eq!(feedback_priority(50, "critical"), "P1");
    }

    #[test]
    fn test_priority_critical_low_users() {
        assert_eq!(feedback_priority(1, "critical"), "P2");
        assert_eq!(feedback_priority(9, "critical"), "P2");
    }

    #[test]
    fn test_priority_high() {
        assert_eq!(feedback_priority(100, "high"), "P1");
        assert_eq!(feedback_priority(10, "high"), "P2");
        assert_eq!(feedback_priority(1, "high"), "P3");
    }

    #[test]
    fn test_priority_medium() {
        assert_eq!(feedback_priority(100, "medium"), "P2");
        assert_eq!(feedback_priority(10, "medium"), "P3");
        assert_eq!(feedback_priority(1, "medium"), "P4");
    }

    #[test]
    fn test_priority_low() {
        assert_eq!(feedback_priority(100, "low"), "P3");
        assert_eq!(feedback_priority(10, "low"), "P4");
        assert_eq!(feedback_priority(1, "low"), "P4");
    }

    #[test]
    fn test_priority_case_insensitive() {
        assert_eq!(feedback_priority(100, "CRITICAL"), "P0");
        assert_eq!(feedback_priority(100, "High"), "P1");
    }

    #[test]
    fn test_priority_unknown_severity() {
        assert_eq!(feedback_priority(1000, "unknown"), "P4");
        assert_eq!(feedback_priority(0, "xyz"), "P4");
    }

    #[test]
    fn test_priority_zero_users() {
        assert_eq!(feedback_priority(0, "critical"), "P2");
        assert_eq!(feedback_priority(0, "high"), "P3");
        assert_eq!(feedback_priority(0, "low"), "P4");
    }

    // ---- calculate_response_time_hours ----

    #[test]
    fn test_response_time_normal() {
        // 1小时 = 3600秒
        assert!((calculate_response_time_hours(0, 3600) - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_response_time_zero() {
        assert_eq!(calculate_response_time_hours(1000, 1000), 0.0);
    }

    #[test]
    fn test_response_time_negative() {
        // 响应早于创建时间
        assert_eq!(calculate_response_time_hours(5000, 1000), 0.0);
    }

    #[test]
    fn test_response_time_partial_hour() {
        // 30分钟 = 0.5小时
        assert!((calculate_response_time_hours(0, 1800) - 0.5).abs() < 0.01);
    }

    // ---- is_feedback_sla_breached ----

    #[test]
    fn test_sla_not_breached_within_time() {
        // 创建后1小时，SLA 24小时，未超时
        assert!(!is_feedback_sla_breached(0, 24, 3600));
    }

    #[test]
    fn test_sla_breached_exceeded() {
        // 创建后25小时，SLA 24小时，超时
        assert!(is_feedback_sla_breached(0, 24, 25 * 3600));
    }

    #[test]
    fn test_sla_boundary_not_breached() {
        // 恰好24小时，未超时（严格大于）
        assert!(!is_feedback_sla_breached(0, 24, 24 * 3600));
    }

    #[test]
    fn test_sla_now_before_created() {
        // now 早于 created_at
        assert!(!is_feedback_sla_breached(10000, 24, 5000));
    }

    #[test]
    fn test_sla_zero_hours_immediately_breached() {
        // SLA 0小时，创建后立即超时
        assert!(is_feedback_sla_breached(0, 0, 1));
    }

    // ========== validate_rating ==========

    #[test]
    fn test_validate_rating_valid() {
        for r in 1..=5 {
            assert!(validate_rating(r).is_ok());
        }
    }

    #[test]
    fn test_validate_rating_invalid_low() {
        assert!(validate_rating(0).is_err());
        assert!(validate_rating(-1).is_err());
        assert!(validate_rating(-100).is_err());
    }

    #[test]
    fn test_validate_rating_invalid_high() {
        assert!(validate_rating(6).is_err());
        assert!(validate_rating(10).is_err());
        assert!(validate_rating(100).is_err());
    }

    #[test]
    fn test_validate_rating_boundary() {
        assert!(validate_rating(1).is_ok());
        assert!(validate_rating(5).is_ok());
        assert!(validate_rating(0).is_err());
        assert!(validate_rating(6).is_err());
    }

    #[test]
    fn test_validate_rating_error_message() {
        let err = validate_rating(0).unwrap_err();
        assert!(err.contains("0"));
        assert!(err.contains("1"));
        assert!(err.contains("5"));
    }

    // ========== classify_feedback_category ==========

    #[test]
    fn test_classify_category_bug() {
        assert_eq!(classify_feedback_category("Bug report", ""), "bug");
        assert_eq!(classify_feedback_category("", "app crashes"), "bug");
        assert_eq!(classify_feedback_category("ERROR", ""), "bug");
        assert_eq!(classify_feedback_category("broken link", ""), "bug");
        assert_eq!(classify_feedback_category("login fails", ""), "bug");
    }

    #[test]
    fn test_classify_category_feature() {
        assert_eq!(classify_feedback_category("Feature request", ""), "feature");
        assert_eq!(
            classify_feedback_category("", "suggest improvement"),
            "feature"
        );
        assert_eq!(classify_feedback_category("enhancement", ""), "feature");
        assert_eq!(classify_feedback_category("wish list", ""), "feature");
    }

    #[test]
    fn test_classify_category_praise() {
        assert_eq!(classify_feedback_category("Great app", ""), "praise");
        assert_eq!(classify_feedback_category("", "love it"), "praise");
        assert_eq!(classify_feedback_category("excellent work", ""), "praise");
        assert_eq!(classify_feedback_category("nice design", ""), "praise");
    }

    #[test]
    fn test_classify_category_complaint() {
        assert_eq!(classify_feedback_category("slow loading", ""), "complaint");
        assert_eq!(classify_feedback_category("bad service", ""), "complaint");
        assert_eq!(
            classify_feedback_category("terrible experience", ""),
            "complaint"
        );
        assert_eq!(classify_feedback_category("worst app", ""), "complaint");
    }

    #[test]
    fn test_classify_category_other() {
        assert_eq!(classify_feedback_category("hello", ""), "other");
        assert_eq!(classify_feedback_category("", "general inquiry"), "other");
        assert_eq!(classify_feedback_category("question", ""), "other");
    }

    #[test]
    fn test_classify_category_case_insensitive() {
        assert_eq!(classify_feedback_category("BUG", ""), "bug");
        assert_eq!(classify_feedback_category("FEATURE", ""), "feature");
        assert_eq!(classify_feedback_category("GREAT", ""), "praise");
    }

    // ========== sentiment_from_rating ==========

    #[test]
    fn test_sentiment_positive() {
        assert_eq!(sentiment_from_rating(4), "positive");
        assert_eq!(sentiment_from_rating(5), "positive");
        assert_eq!(sentiment_from_rating(6), "positive");
        assert_eq!(sentiment_from_rating(100), "positive");
    }

    #[test]
    fn test_sentiment_neutral() {
        assert_eq!(sentiment_from_rating(3), "neutral");
    }

    #[test]
    fn test_sentiment_negative() {
        assert_eq!(sentiment_from_rating(1), "negative");
        assert_eq!(sentiment_from_rating(2), "negative");
        assert_eq!(sentiment_from_rating(0), "negative");
        assert_eq!(sentiment_from_rating(-1), "negative");
    }

    #[test]
    fn test_sentiment_boundary() {
        assert_eq!(sentiment_from_rating(3), "neutral");
        assert_eq!(sentiment_from_rating(4), "positive");
        assert_eq!(sentiment_from_rating(2), "negative");
    }

    // ========== is_valid_feedback_transition ==========

    #[test]
    fn test_valid_transition_same_state() {
        assert!(is_valid_feedback_transition("pending", "pending"));
        assert!(is_valid_feedback_transition("resolved", "resolved"));
        assert!(is_valid_feedback_transition("closed", "closed"));
    }

    #[test]
    fn test_valid_transition_pending() {
        assert!(is_valid_feedback_transition("pending", "open"));
        assert!(is_valid_feedback_transition("pending", "in_progress"));
        assert!(is_valid_feedback_transition("pending", "resolved"));
        assert!(is_valid_feedback_transition("pending", "closed"));
    }

    #[test]
    fn test_valid_transition_open_in_progress() {
        assert!(is_valid_feedback_transition("open", "resolved"));
        assert!(is_valid_feedback_transition("open", "closed"));
        assert!(is_valid_feedback_transition("in_progress", "resolved"));
        assert!(is_valid_feedback_transition("in_progress", "closed"));
    }

    #[test]
    fn test_invalid_transition_closed() {
        assert!(!is_valid_feedback_transition("closed", "pending"));
        assert!(!is_valid_feedback_transition("closed", "open"));
        assert!(!is_valid_feedback_transition("closed", "resolved"));
    }

    #[test]
    fn test_invalid_transition_unknown() {
        assert!(!is_valid_feedback_transition("unknown", "pending"));
        assert!(!is_valid_feedback_transition("pending", "unknown"));
    }

    // ========== feedback_rating_stats ==========

    #[test]
    fn test_rating_stats_empty() {
        let (avg, min, max, count) = feedback_rating_stats(&[]);
        assert_eq!(avg, 0.0);
        assert_eq!(min, 0);
        assert_eq!(max, 0);
        assert_eq!(count, 0);
    }

    #[test]
    fn test_rating_stats_single() {
        let (avg, min, max, count) = feedback_rating_stats(&[3]);
        assert_eq!(avg, 3.0);
        assert_eq!(min, 3);
        assert_eq!(max, 3);
        assert_eq!(count, 1);
    }

    #[test]
    fn test_rating_stats_multiple() {
        let (avg, min, max, count) = feedback_rating_stats(&[1, 2, 3, 4, 5]);
        assert_eq!(avg, 3.0);
        assert_eq!(min, 1);
        assert_eq!(max, 5);
        assert_eq!(count, 5);
    }

    #[test]
    fn test_rating_stats_all_same() {
        let (avg, min, max, count) = feedback_rating_stats(&[5, 5, 5]);
        assert_eq!(avg, 5.0);
        assert_eq!(min, 5);
        assert_eq!(max, 5);
        assert_eq!(count, 3);
    }

    #[test]
    fn test_rating_stats_avg_precision() {
        let (avg, min, max, count) = feedback_rating_stats(&[1, 2]);
        assert!((avg - 1.5).abs() < 0.0001);
        assert_eq!(min, 1);
        assert_eq!(max, 2);
        assert_eq!(count, 2);
    }
}
