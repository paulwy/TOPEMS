use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use super::audit_log::{AuditAction, AuditLogEntry, AuditLogService};
use super::event_store::EventStore;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ComplianceSeverity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

impl ComplianceSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            ComplianceSeverity::Critical => "Critical",
            ComplianceSeverity::High => "High",
            ComplianceSeverity::Medium => "Medium",
            ComplianceSeverity::Low => "Low",
            ComplianceSeverity::Info => "Info",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceIssue {
    pub severity: ComplianceSeverity,
    pub category: String,
    pub description: String,
    pub evidence: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceReport {
    pub report_id: String,
    pub generated_at: DateTime<Utc>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub issues: Vec<ComplianceIssue>,
    pub summary: ComplianceSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceSummary {
    pub critical_count: usize,
    pub high_count: usize,
    pub medium_count: usize,
    pub low_count: usize,
    pub info_count: usize,
    pub total_issues: usize,
    pub overall_compliant: bool,
}

pub struct ComplianceChecker<T: EventStore> {
    audit_log: Arc<AuditLogService>,
    event_store: Option<Arc<T>>,
    data_retention_days: i64,
}

impl<T: EventStore + Send + Sync + 'static> ComplianceChecker<T> {
    pub fn new(audit_log: Arc<AuditLogService>) -> Self {
        Self {
            audit_log,
            event_store: None,
            data_retention_days: 365,
        }
    }

    pub fn with_event_store(mut self, event_store: Arc<T>) -> Self {
        self.event_store = Some(event_store);
        self
    }

    pub fn with_retention_days(mut self, days: i64) -> Self {
        self.data_retention_days = days;
        self
    }

    pub fn check_segregation_of_duties(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
    ) -> Vec<ComplianceIssue> {
        let mut issues = Vec::new();

        use super::audit_log::AuditLogQuery;
        let query = AuditLogQuery {
            target_type: Some("Voucher".to_string()),
            start_time: Some(period_start),
            end_time: Some(period_end),
            ..Default::default()
        };

        let logs = self.audit_log.query_logs(query);

        let mut create_actors: HashSet<String> = HashSet::new();
        let mut post_actors: HashSet<String> = HashSet::new();

        for log in &logs {
            match log.action {
                AuditAction::Create => {
                    create_actors.insert(log.actor.clone());
                }
                AuditAction::Post | AuditAction::Approve => {
                    post_actors.insert(log.actor.clone());
                }
                _ => {}
            }
        }

        let violations: Vec<&String> = create_actors.intersection(&post_actors).collect();

        for actor in violations {
            let voucher_ids: Vec<String> = logs
                .iter()
                .filter(|l| l.actor == *actor)
                .map(|l| l.target_id.clone())
                .collect();

            issues.push(ComplianceIssue {
                severity: ComplianceSeverity::High,
                category: "SegregationOfDuties".to_string(),
                description: format!(
                    "User '{}' both created and posted/approved vouchers, violating segregation of duties",
                    actor
                ),
                evidence: serde_json::json!({
                    "actor": actor,
                    "violating_voucher_ids": voucher_ids
                }),
            });
        }

        issues
    }

    pub fn check_audit_trail_completeness(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
    ) -> Vec<ComplianceIssue> {
        let mut issues = Vec::new();

        use super::audit_log::AuditLogQuery;
        let query = AuditLogQuery {
            start_time: Some(period_start),
            end_time: Some(period_end),
            ..Default::default()
        };

        let logs = self.audit_log.query_logs(query);

        let mut gaps: Vec<String> = Vec::new();
        for log in &logs {
            let has_critical_field = !log.actor.is_empty()
                && !log.target_id.is_empty()
                && !log.target_type.is_empty();

            if !has_critical_field {
                gaps.push(log.id.clone());
            }
        }

        if !gaps.is_empty() {
            issues.push(ComplianceIssue {
                severity: ComplianceSeverity::Medium,
                category: "AuditTrailCompleteness".to_string(),
                description: format!(
                    "Found {} audit log entries with missing critical fields",
                    gaps.len()
                ),
                evidence: serde_json::json!({
                    "incomplete_log_count": gaps.len(),
                    "incomplete_log_ids": gaps
                }),
            });
        }

        let mut sorted_logs = logs.clone();
        sorted_logs.sort_by_key(|l| l.timestamp);

        issues
    }

    pub fn check_data_retention(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
    ) -> Vec<ComplianceIssue> {
        let mut issues = Vec::new();

        use super::audit_log::AuditLogQuery;
        let retention_cutoff = Utc::now() - Duration::days(self.data_retention_days);

        let query = AuditLogQuery {
            end_time: Some(retention_cutoff),
            ..Default::default()
        };

        let expired_logs = self.audit_log.query_logs(query);

        if !expired_logs.is_empty() {
            issues.push(ComplianceIssue {
                severity: ComplianceSeverity::Low,
                category: "DataRetention".to_string(),
                description: format!(
                    "Found {} audit log entries older than retention period ({} days)",
                    expired_logs.len(),
                    self.data_retention_days
                ),
                evidence: serde_json::json!({
                    "expired_log_count": expired_logs.len(),
                    "retention_days": self.data_retention_days,
                    "retention_cutoff": retention_cutoff.to_rfc3339()
                }),
            });
        }

        let _ = period_start;
        let _ = period_end;

        issues
    }

    pub fn generate_compliance_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
    ) -> ComplianceReport {
        let mut all_issues = Vec::new();

        all_issues.extend(self.check_segregation_of_duties(period_start, period_end));
        all_issues.extend(self.check_audit_trail_completeness(period_start, period_end));
        all_issues.extend(self.check_data_retention(period_start, period_end));

        let summary = Self::build_summary(&all_issues);

        ComplianceReport {
            report_id: uuid::Uuid::new_v4().to_string(),
            generated_at: Utc::now(),
            period_start,
            period_end,
            issues: all_issues,
            summary,
        }
    }

    pub fn export_audit_trail(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
    ) -> Vec<AuditLogEntry> {
        use super::audit_log::AuditLogQuery;
        let query = AuditLogQuery {
            start_time: Some(period_start),
            end_time: Some(period_end),
            ..Default::default()
        };

        let mut logs = self.audit_log.query_logs(query);
        logs.sort_by_key(|l| l.timestamp);
        logs
    }

    fn build_summary(issues: &[ComplianceIssue]) -> ComplianceSummary {
        let mut critical_count = 0;
        let mut high_count = 0;
        let mut medium_count = 0;
        let mut low_count = 0;
        let mut info_count = 0;

        for issue in issues {
            match issue.severity {
                ComplianceSeverity::Critical => critical_count += 1,
                ComplianceSeverity::High => high_count += 1,
                ComplianceSeverity::Medium => medium_count += 1,
                ComplianceSeverity::Low => low_count += 1,
                ComplianceSeverity::Info => info_count += 1,
            }
        }

        let total_issues = issues.len();
        let overall_compliant = critical_count == 0 && high_count == 0;

        ComplianceSummary {
            critical_count,
            high_count,
            medium_count,
            low_count,
            info_count,
            total_issues,
            overall_compliant,
        }
    }
}
