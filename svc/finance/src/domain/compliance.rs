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
            let has_critical_field =
                !log.actor.is_empty() && !log.target_id.is_empty() && !log.target_type.is_empty();

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

        let mut sorted_logs = logs;
        sorted_logs.sort_by_key(|l| l.timestamp);

        issues
    }

    pub fn check_data_retention(
        &self,
        _period_start: DateTime<Utc>,
        _period_end: DateTime<Utc>,
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

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    #[test]
    fn rt_compliance_severity_variants() {
        roundtrip(&ComplianceSeverity::Critical);
        roundtrip(&ComplianceSeverity::High);
        roundtrip(&ComplianceSeverity::Medium);
        roundtrip(&ComplianceSeverity::Low);
        roundtrip(&ComplianceSeverity::Info);
    }

    #[test]
    fn rt_compliance_issue() {
        roundtrip(&ComplianceIssue {
            severity: ComplianceSeverity::High,
            category: "SegregationOfDuties".into(),
            description: "User both created and posted vouchers".into(),
            evidence: serde_json::json!({ "actor": "alice", "voucher_count": 3 }),
        });
    }

    #[test]
    fn rt_compliance_summary() {
        roundtrip(&ComplianceSummary {
            critical_count: 0,
            high_count: 2,
            medium_count: 1,
            low_count: 3,
            info_count: 5,
            total_issues: 11,
            overall_compliant: false,
        });
    }

    #[test]
    fn rt_compliance_summary_clean() {
        roundtrip(&ComplianceSummary {
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            info_count: 0,
            total_issues: 0,
            overall_compliant: true,
        });
    }

    #[test]
    fn rt_compliance_report_minimal() {
        roundtrip(&ComplianceReport {
            report_id: uid(),
            generated_at: now(),
            period_start: now() - Duration::days(30),
            period_end: now(),
            issues: vec![],
            summary: ComplianceSummary {
                critical_count: 0,
                high_count: 0,
                medium_count: 0,
                low_count: 0,
                info_count: 0,
                total_issues: 0,
                overall_compliant: true,
            },
        });
    }

    #[test]
    fn rt_compliance_report_with_issues() {
        let summary = ComplianceSummary {
            critical_count: 1,
            high_count: 1,
            medium_count: 0,
            low_count: 0,
            info_count: 0,
            total_issues: 2,
            overall_compliant: false,
        };
        let issue1 = ComplianceIssue {
            severity: ComplianceSeverity::Critical,
            category: "DataRetention".into(),
            description: "Data older than 7 years found".into(),
            evidence: serde_json::json!({ "count": 5000 }),
        };
        let issue2 = ComplianceIssue {
            severity: ComplianceSeverity::High,
            category: "SegregationOfDuties".into(),
            description: "Single actor has conflicting roles".into(),
            evidence: serde_json::json!({ "actor": "bob", "roles": ["create", "approve"] }),
        };
        roundtrip(&ComplianceReport {
            report_id: uid(),
            generated_at: now(),
            period_start: now() - Duration::days(90),
            period_end: now(),
            issues: vec![issue1, issue2],
            summary,
        });
    }

    // ─── P0 补测：ComplianceChecker 合规检查逻辑（2026-10-07，盲区 compliance.rs 0/115）───
    // 用内存 AuditLogService 注入，覆盖职责分离/审计完整性/数据保留/汇总报告。

    use crate::domain::audit_log::{AuditAction, AuditLogService};
    use crate::domain::event_store::InMemoryEventStore;
    use std::sync::Arc;

    fn checker(audit_log: Arc<AuditLogService>) -> ComplianceChecker<InMemoryEventStore> {
        ComplianceChecker::new(audit_log)
    }

    fn log_voucher(
        audit_log: &AuditLogService,
        action: AuditAction,
        actor: &str,
        voucher_id: &str,
    ) {
        audit_log.log_action(action, actor, "Voucher", voucher_id, None);
    }

    #[test]
    fn severity_as_str_maps_variants() {
        assert_eq!(ComplianceSeverity::Critical.as_str(), "Critical");
        assert_eq!(ComplianceSeverity::High.as_str(), "High");
        assert_eq!(ComplianceSeverity::Medium.as_str(), "Medium");
        assert_eq!(ComplianceSeverity::Low.as_str(), "Low");
        assert_eq!(ComplianceSeverity::Info.as_str(), "Info");
    }

    #[test]
    fn segregation_of_duties_no_violation_when_actors_differ() {
        let audit_log = Arc::new(AuditLogService::new());
        log_voucher(&audit_log, AuditAction::Create, "alice", "v-1");
        log_voucher(&audit_log, AuditAction::Post, "bob", "v-1");
        let checker = checker(audit_log);

        let issues = checker.check_segregation_of_duties(
            chrono::Utc::now() - chrono::Duration::days(1),
            chrono::Utc::now() + chrono::Duration::days(1),
        );
        assert!(issues.is_empty());
    }

    #[test]
    fn segregation_of_duties_detects_same_actor_create_and_post() {
        let audit_log = Arc::new(AuditLogService::new());
        log_voucher(&audit_log, AuditAction::Create, "alice", "v-1");
        log_voucher(&audit_log, AuditAction::Post, "alice", "v-1");
        let checker = checker(audit_log);

        let issues = checker.check_segregation_of_duties(
            chrono::Utc::now() - chrono::Duration::days(1),
            chrono::Utc::now() + chrono::Duration::days(1),
        );
        assert_eq!(issues.len(), 1);
        assert!(matches!(issues[0].severity, ComplianceSeverity::High));
        assert_eq!(issues[0].category, "SegregationOfDuties");
        let evidence = issues[0].evidence.clone();
        assert_eq!(evidence["actor"], "alice");
        assert!(evidence["violating_voucher_ids"].as_array().is_some());
    }

    #[test]
    fn audit_trail_completeness_reports_missing_critical_fields() {
        let audit_log = Arc::new(AuditLogService::new());
        audit_log.log_action(AuditAction::Create, "", "Voucher", "v-1", None);
        let checker = checker(audit_log);

        let issues = checker.check_audit_trail_completeness(
            chrono::Utc::now() - chrono::Duration::days(1),
            chrono::Utc::now() + chrono::Duration::days(1),
        );
        assert_eq!(issues.len(), 1);
        assert!(matches!(issues[0].severity, ComplianceSeverity::Medium));
        assert_eq!(issues[0].category, "AuditTrailCompleteness");
        assert_eq!(issues[0].evidence["incomplete_log_count"], 1);
    }

    #[test]
    fn audit_trail_completeness_ok_when_fields_present() {
        let audit_log = Arc::new(AuditLogService::new());
        log_voucher(&audit_log, AuditAction::Create, "alice", "v-1");
        let checker = checker(audit_log);

        let issues = checker.check_audit_trail_completeness(
            chrono::Utc::now() - chrono::Duration::days(1),
            chrono::Utc::now() + chrono::Duration::days(1),
        );
        assert!(issues.is_empty());
    }

    #[test]
    fn data_retention_reports_expired_logs() {
        let audit_log = Arc::new(AuditLogService::new());
        log_voucher(&audit_log, AuditAction::Create, "alice", "v-1");
        let checker =
            ComplianceChecker::<InMemoryEventStore>::new(audit_log).with_retention_days(0);

        let issues = checker.check_data_retention(
            chrono::Utc::now() - chrono::Duration::days(1),
            chrono::Utc::now() + chrono::Duration::days(1),
        );
        assert_eq!(issues.len(), 1);
        assert!(matches!(issues[0].severity, ComplianceSeverity::Low));
        assert_eq!(issues[0].category, "DataRetention");
        assert_eq!(issues[0].evidence["expired_log_count"], 1);
    }

    #[test]
    fn generate_report_aggregates_issues_and_summary() {
        let audit_log = Arc::new(AuditLogService::new());
        log_voucher(&audit_log, AuditAction::Create, "alice", "v-1");
        log_voucher(&audit_log, AuditAction::Post, "alice", "v-1");
        let checker = checker(audit_log);

        let report = checker.generate_compliance_report(
            chrono::Utc::now() - chrono::Duration::days(1),
            chrono::Utc::now() + chrono::Duration::days(1),
        );
        // segregation 1 条（create+post 同人）；completeness 0（字段完整）；
        // retention 0（默认 365 天 cutoff 在一年前，日志不过期）
        assert_eq!(report.issues.len(), 1);
        assert_eq!(report.summary.total_issues, 1);
        assert_eq!(report.summary.high_count, 1);
        assert!(!report.summary.overall_compliant);
    }
}
