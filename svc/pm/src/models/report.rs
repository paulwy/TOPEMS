use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectReport {
    pub id: Uuid,
    pub project_id: Uuid,
    pub report_code: Option<String>,
    pub report_name: String,
    pub report_type: String,
    pub report_period: Option<String>,
    pub status: String,
    pub generated_at: Option<DateTime<Utc>>,
    pub data: Option<serde_json::Value>,
    pub summary: Option<String>,
    pub generated_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReportRequest {
    pub report_code: Option<String>,
    pub report_name: String,
    pub report_type: String,
    pub report_period: Option<String>,
    pub generated_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub template_code: String,
    pub template_name: String,
    pub report_type: String,
    pub content: serde_json::Value,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReportTemplateRequest {
    pub template_code: String,
    pub template_name: String,
    pub report_type: String,
    pub content: serde_json::Value,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportData {
    pub project_info: Option<serde_json::Value>,
    pub progress: Option<serde_json::Value>,
    pub budget: Option<serde_json::Value>,
    pub risks: Option<serde_json::Value>,
    pub quality: Option<serde_json::Value>,
    pub resources: Option<serde_json::Value>,
    pub milestones: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressReportData {
    pub overall_progress: f64,
    pub phase_progress: Vec<serde_json::Value>,
    pub milestone_status: Vec<serde_json::Value>,
    pub tasks_completed: i64,
    pub tasks_total: i64,
    pub schedule_variance: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CostReportData {
    pub budget_total: f64,
    pub spent_total: f64,
    pub remaining_total: f64,
    pub budget_variance: f64,
    pub category_breakdown: Vec<serde_json::Value>,
    pub contract_payments: Vec<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    // ---- ProjectReport ----

    fn sample_report() -> ProjectReport {
        ProjectReport {
            id: uid(),
            project_id: uid(),
            report_code: Some("RPT-001".to_string()),
            report_name: "月度报告".to_string(),
            report_type: "monthly".to_string(),
            report_period: Some("2026-08".to_string()),
            status: "draft".to_string(),
            generated_at: Some(now()),
            data: Some(serde_json::json!({"progress": 50})),
            summary: Some("项目进展顺利".to_string()),
            generated_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_report_serde_roundtrip() {
        let r = sample_report();
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectReport = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, r.id);
        assert_eq!(back.report_name, r.report_name);
        assert_eq!(back.report_type, r.report_type);
        assert_eq!(back.status, r.status);
        assert_eq!(back.data, r.data);
        assert_eq!(back.summary, r.summary);
    }

    #[test]
    fn test_project_report_with_none_optional() {
        let r = ProjectReport {
            id: uid(),
            project_id: uid(),
            report_code: None,
            report_name: "n".to_string(),
            report_type: "weekly".to_string(),
            report_period: None,
            status: "draft".to_string(),
            generated_at: None,
            data: None,
            summary: None,
            generated_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectReport = serde_json::from_str(&s).unwrap();
        assert!(back.report_code.is_none());
        assert!(back.data.is_none());
    }

    #[test]
    fn test_project_report_completed_status_roundtrip() {
        let mut r = sample_report();
        r.status = "completed".to_string();
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectReport = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "completed");
    }

    #[test]
    fn test_project_report_complex_data() {
        let mut r = sample_report();
        r.data = Some(serde_json::json!({
            "phases": [{"name": "p1", "progress": 80}, {"name": "p2", "progress": 30}],
            "budget": {"spent": 50000, "total": 100000},
            "risks": [{"id": "r1", "level": "high"}]
        }));
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectReport = serde_json::from_str(&s).unwrap();
        assert_eq!(back.data, r.data);
    }

    // ---- CreateReportRequest ----

    #[test]
    fn test_create_report_request_roundtrip() {
        let r = CreateReportRequest {
            report_code: Some("RPT-002".to_string()),
            report_name: "新报告".to_string(),
            report_type: "weekly".to_string(),
            report_period: Some("2026-W33".to_string()),
            generated_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateReportRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.report_name, r.report_name);
        assert_eq!(back.report_type, r.report_type);
        assert_eq!(back.report_period, r.report_period);
    }

    #[test]
    fn test_create_report_request_minimal() {
        let r = CreateReportRequest {
            report_code: None,
            report_name: "n".to_string(),
            report_type: "custom".to_string(),
            report_period: None,
            generated_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateReportRequest = serde_json::from_str(&s).unwrap();
        assert!(back.report_code.is_none());
        assert!(back.report_period.is_none());
    }

    // ---- ReportTemplate ----

    #[test]
    fn test_report_template_serde_roundtrip() {
        let t = ReportTemplate {
            id: uid(),
            template_code: "TPL-001".to_string(),
            template_name: "月报模板".to_string(),
            report_type: "monthly".to_string(),
            content: serde_json::json!({"sections": ["overview", "budget"]}),
            is_active: true,
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&t).unwrap();
        let back: ReportTemplate = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, t.id);
        assert_eq!(back.template_code, t.template_code);
        assert_eq!(back.content, t.content);
        assert_eq!(back.is_active, t.is_active);
    }

    #[test]
    fn test_report_template_inactive() {
        let t = ReportTemplate {
            id: uid(),
            template_code: "TPL-002".to_string(),
            template_name: "旧模板".to_string(),
            report_type: "weekly".to_string(),
            content: serde_json::json!({}),
            is_active: false,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&t).unwrap();
        let back: ReportTemplate = serde_json::from_str(&s).unwrap();
        assert!(!back.is_active);
        assert!(back.created_by.is_none());
    }

    // ---- CreateReportTemplateRequest ----

    #[test]
    fn test_create_report_template_request_roundtrip() {
        let r = CreateReportTemplateRequest {
            template_code: "TPL-003".to_string(),
            template_name: "新模板".to_string(),
            report_type: "monthly".to_string(),
            content: serde_json::json!({"key": "value"}),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateReportTemplateRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.template_code, r.template_code);
        assert_eq!(back.content, r.content);
    }

    #[test]
    fn test_create_report_template_request_no_creator() {
        let r = CreateReportTemplateRequest {
            template_code: "TPL-004".to_string(),
            template_name: "n".to_string(),
            report_type: "custom".to_string(),
            content: serde_json::json!({"a": 1}),
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateReportTemplateRequest = serde_json::from_str(&s).unwrap();
        assert!(back.created_by.is_none());
    }

    // ---- ReportData ----

    #[test]
    fn test_report_data_serde_roundtrip() {
        let r = ReportData {
            project_info: Some(serde_json::json!({"name": "项目A"})),
            progress: Some(serde_json::json!({"overall": 65})),
            budget: Some(serde_json::json!({"spent": 50000})),
            risks: Some(serde_json::json!([{"id": "r1"}])),
            quality: Some(serde_json::json!({"defects": 3})),
            resources: Some(serde_json::json!({"count": 10})),
            milestones: Some(serde_json::json!([{"name": "m1"}])),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ReportData = serde_json::from_str(&s).unwrap();
        assert_eq!(back.project_info, r.project_info);
        assert_eq!(back.progress, r.progress);
        assert_eq!(back.budget, r.budget);
    }

    #[test]
    fn test_report_data_all_none() {
        let r = ReportData {
            project_info: None,
            progress: None,
            budget: None,
            risks: None,
            quality: None,
            resources: None,
            milestones: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ReportData = serde_json::from_str(&s).unwrap();
        assert!(back.project_info.is_none());
        assert!(back.budget.is_none());
    }

    // ---- ProgressReportData ----

    #[test]
    fn test_progress_report_data_serde_roundtrip() {
        let r = ProgressReportData {
            overall_progress: 65.5,
            phase_progress: vec![serde_json::json!({"name": "p1", "pct": 80})],
            milestone_status: vec![serde_json::json!({"name": "m1", "status": "done"})],
            tasks_completed: 10,
            tasks_total: 15,
            schedule_variance: Some(-2.5),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ProgressReportData = serde_json::from_str(&s).unwrap();
        assert_eq!(back.overall_progress, r.overall_progress);
        assert_eq!(back.tasks_completed, r.tasks_completed);
        assert_eq!(back.tasks_total, r.tasks_total);
        assert_eq!(back.schedule_variance, r.schedule_variance);
    }

    #[test]
    fn test_progress_report_data_no_variance() {
        let r = ProgressReportData {
            overall_progress: 0.0,
            phase_progress: vec![],
            milestone_status: vec![],
            tasks_completed: 0,
            tasks_total: 0,
            schedule_variance: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ProgressReportData = serde_json::from_str(&s).unwrap();
        assert_eq!(back.overall_progress, 0.0);
        assert!(back.schedule_variance.is_none());
    }

    // ---- CostReportData ----

    #[test]
    fn test_cost_report_data_serde_roundtrip() {
        let r = CostReportData {
            budget_total: 100_000.0,
            spent_total: 50_000.0,
            remaining_total: 50_000.0,
            budget_variance: -5_000.0,
            category_breakdown: vec![serde_json::json!({"category": "人力", "amount": 30000})],
            contract_payments: vec![serde_json::json!({"contract": "c1", "paid": 20000})],
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CostReportData = serde_json::from_str(&s).unwrap();
        assert_eq!(back.budget_total, r.budget_total);
        assert_eq!(back.spent_total, r.spent_total);
        assert_eq!(back.budget_variance, r.budget_variance);
    }

    #[test]
    fn test_cost_report_data_zero_values() {
        let r = CostReportData {
            budget_total: 0.0,
            spent_total: 0.0,
            remaining_total: 0.0,
            budget_variance: 0.0,
            category_breakdown: vec![],
            contract_payments: vec![],
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CostReportData = serde_json::from_str(&s).unwrap();
        assert_eq!(back.budget_total, 0.0);
        assert_eq!(back.category_breakdown.len(), 0);
    }
}
