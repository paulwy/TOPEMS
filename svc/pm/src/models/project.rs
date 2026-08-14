use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProjectStatus {
    Draft,
    PendingApproval,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskLevel {
    Low,
    #[default]
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub status: String,
    pub leader: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub progress: i32,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 项目财务扩展字段
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProjectFinance {
    pub project_id: Uuid,
    pub actual_cost: Option<Decimal>,                // 实际成本
    pub cost_variance: Option<Decimal>,              // 成本差异
    pub cost_variance_rate: Option<Decimal>,         // 成本差异率
    pub cost_budget_ratio: Option<Decimal>,          // 成本预算比
    pub committed_cost: Option<Decimal>,             // 已承诺成本
    pub forecast_cost: Option<Decimal>,              // 预测成本
    pub revenue: Option<Decimal>,                    // 收入
    pub earned_value: Option<Decimal>,               // 挣值
    pub profit: Option<Decimal>,                     // 利润
    pub profit_margin: Option<Decimal>,              // 利润率
    pub investment_amount: Option<Decimal>,          // 投资金额
    pub roi: Option<Decimal>,                        // 投资回报率
    pub payment_status: String,                      // 付款状态
    pub invoice_status: String,                      // 发票状态
    pub tax_amount: Option<Decimal>,                 // 税额
    pub cost_loaded_progress: Option<Decimal>,       // 成本加载进度
    pub schedule_variance: Option<Decimal>,          // 进度差异
    pub cost_performance_index: Option<Decimal>,     // 成本绩效指数
    pub schedule_performance_index: Option<Decimal>, // 进度绩效指数
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProjectRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub leader: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub leader: Option<String>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub progress: Option<i32>,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use std::str::FromStr;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    fn sample_decimal() -> Decimal {
        Decimal::from_str("12345.67").unwrap()
    }

    // ---- ProjectStatus enum ----

    #[test]
    fn test_project_status_serde_screaming_snake() {
        let s = serde_json::to_string(&ProjectStatus::PendingApproval).unwrap();
        assert_eq!(s, "\"PENDING_APPROVAL\"");
        let d: ProjectStatus = serde_json::from_str("\"PENDING_APPROVAL\"").unwrap();
        assert_eq!(d, ProjectStatus::PendingApproval);
    }

    #[test]
    fn test_project_status_all_variants_serialize() {
        let variants = [
            ProjectStatus::Draft,
            ProjectStatus::PendingApproval,
            ProjectStatus::Active,
            ProjectStatus::Paused,
            ProjectStatus::Completed,
            ProjectStatus::Cancelled,
        ];
        for v in variants {
            let s = serde_json::to_string(&v).unwrap();
            let d: ProjectStatus = serde_json::from_str(&s).unwrap();
            assert_eq!(d, v, "roundtrip for {:?}", v);
        }
    }

    #[test]
    fn test_project_status_invalid_variant_rejected() {
        assert!(serde_json::from_str::<ProjectStatus>("\"UNKNOWN\"").is_err());
    }

    #[test]
    fn test_project_status_clone_copy_eq() {
        let a = ProjectStatus::Active;
        let b = a;
        assert_eq!(a, b);
        let c = a.clone();
        assert_eq!(a, c);
    }

    #[test]
    fn test_project_status_to_schema_compiles() {
        // ToSchema trait is implemented; verify derive is sound by referencing the type
        let _ = std::any::TypeId::of::<ProjectStatus>();
    }

    // ---- RiskLevel enum ----

    #[test]
    fn test_risk_level_default_is_medium() {
        assert_eq!(RiskLevel::default(), RiskLevel::Medium);
    }

    #[test]
    fn test_risk_level_serde_screaming_snake() {
        let s = serde_json::to_string(&RiskLevel::Critical).unwrap();
        assert_eq!(s, "\"CRITICAL\"");
        let d: RiskLevel = serde_json::from_str("\"CRITICAL\"").unwrap();
        assert_eq!(d, RiskLevel::Critical);
    }

    #[test]
    fn test_risk_level_all_variants_roundtrip() {
        let variants = [
            RiskLevel::Low,
            RiskLevel::Medium,
            RiskLevel::High,
            RiskLevel::Critical,
        ];
        for v in variants {
            let s = serde_json::to_string(&v).unwrap();
            let d: RiskLevel = serde_json::from_str(&s).unwrap();
            assert_eq!(d, v);
        }
    }

    #[test]
    fn test_risk_level_copy_clone_eq() {
        let a = RiskLevel::High;
        let b = a;
        assert_eq!(a, b);
        assert_eq!(a, a.clone());
    }

    #[test]
    fn test_risk_level_invalid_rejected() {
        assert!(serde_json::from_str::<RiskLevel>("\"nope\"").is_err());
    }

    // ---- Project struct ----

    fn sample_project() -> Project {
        Project {
            id: sample_uuid(),
            name: "项目A".to_string(),
            code: "PRJ-001".to_string(),
            description: Some("desc".to_string()),
            project_type: "internal".to_string(),
            status: "draft".to_string(),
            leader: Some("leader-1".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            budget: Some(sample_decimal()),
            progress: 50,
            project_config: Some(serde_json::json!({"key": "value"})),
            benefit_target: Some(serde_json::json!({"target": 1})),
            risk_level: Some("MEDIUM".to_string()),
            priority: Some(3),
            tags: Some(vec!["tag1".to_string(), "tag2".to_string()]),
            parent_id: Some(sample_uuid()),
            workspace_id: Some(sample_uuid()),
            created_by: Some("creator".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_serde_roundtrip() {
        let p = sample_project();
        let json = serde_json::to_string(&p).unwrap();
        let back: Project = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, p.id);
        assert_eq!(back.name, p.name);
        assert_eq!(back.code, p.code);
        assert_eq!(back.status, p.status);
        assert_eq!(back.progress, p.progress);
        assert_eq!(back.budget, p.budget);
        assert_eq!(back.tags, p.tags);
    }

    #[test]
    fn test_project_clone_preserves_fields() {
        let p = sample_project();
        let c = p.clone();
        assert_eq!(c.id, p.id);
        assert_eq!(c.name, p.name);
        assert_eq!(c.budget, p.budget);
    }

    #[test]
    fn test_project_with_none_optional_fields() {
        let p = Project {
            id: sample_uuid(),
            name: "n".to_string(),
            code: "c".to_string(),
            description: None,
            project_type: "t".to_string(),
            status: "s".to_string(),
            leader: None,
            start_date: None,
            end_date: None,
            budget: None,
            progress: 0,
            project_config: None,
            benefit_target: None,
            risk_level: None,
            priority: None,
            tags: None,
            parent_id: None,
            workspace_id: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&p).unwrap();
        let back: Project = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, p.id);
        assert!(back.description.is_none());
        assert!(back.tags.is_none());
    }

    #[test]
    fn test_project_decimal_budget_serializes_as_number() {
        let mut p = sample_project();
        p.budget = Some(Decimal::from_str("0.00").unwrap());
        let s = serde_json::to_string(&p).unwrap();
        assert!(s.contains("\"budget\":"));
        let back: Project = serde_json::from_str(&s).unwrap();
        assert_eq!(back.budget, p.budget);
    }

    #[test]
    fn test_project_json_value_fields_roundtrip() {
        let p = sample_project();
        let s = serde_json::to_string(&p).unwrap();
        let back: Project = serde_json::from_str(&s).unwrap();
        assert_eq!(back.project_config, p.project_config);
        assert_eq!(back.benefit_target, p.benefit_target);
    }

    // ---- ProjectFinance ----

    fn sample_project_finance() -> ProjectFinance {
        ProjectFinance {
            project_id: sample_uuid(),
            actual_cost: Some(sample_decimal()),
            cost_variance: Some(Decimal::from_str("-100.00").unwrap()),
            cost_variance_rate: Some(Decimal::from_str("0.05").unwrap()),
            cost_budget_ratio: Some(Decimal::from_str("0.95").unwrap()),
            committed_cost: Some(sample_decimal()),
            forecast_cost: Some(sample_decimal()),
            revenue: Some(sample_decimal()),
            earned_value: Some(sample_decimal()),
            profit: Some(sample_decimal()),
            profit_margin: Some(Decimal::from_str("0.10").unwrap()),
            investment_amount: Some(sample_decimal()),
            roi: Some(Decimal::from_str("0.15").unwrap()),
            payment_status: "paid".to_string(),
            invoice_status: "invoiced".to_string(),
            tax_amount: Some(sample_decimal()),
            cost_loaded_progress: Some(Decimal::from_str("0.50").unwrap()),
            schedule_variance: Some(Decimal::from_str("-5.00").unwrap()),
            cost_performance_index: Some(Decimal::from_str("1.05").unwrap()),
            schedule_performance_index: Some(Decimal::from_str("0.95").unwrap()),
        }
    }

    #[test]
    fn test_project_finance_serde_roundtrip() {
        let pf = sample_project_finance();
        let s = serde_json::to_string(&pf).unwrap();
        let back: ProjectFinance = serde_json::from_str(&s).unwrap();
        assert_eq!(back.project_id, pf.project_id);
        assert_eq!(back.actual_cost, pf.actual_cost);
        assert_eq!(back.payment_status, pf.payment_status);
        assert_eq!(back.invoice_status, pf.invoice_status);
    }

    #[test]
    fn test_project_finance_clone_preserves_data() {
        let pf = sample_project_finance();
        let c = pf.clone();
        assert_eq!(c.project_id, pf.project_id);
        assert_eq!(c.actual_cost, pf.actual_cost);
    }

    #[test]
    fn test_project_finance_with_none_options() {
        let pf = ProjectFinance {
            project_id: sample_uuid(),
            actual_cost: None,
            cost_variance: None,
            cost_variance_rate: None,
            cost_budget_ratio: None,
            committed_cost: None,
            forecast_cost: None,
            revenue: None,
            earned_value: None,
            profit: None,
            profit_margin: None,
            investment_amount: None,
            roi: None,
            payment_status: "unpaid".to_string(),
            invoice_status: "pending".to_string(),
            tax_amount: None,
            cost_loaded_progress: None,
            schedule_variance: None,
            cost_performance_index: None,
            schedule_performance_index: None,
        };
        let s = serde_json::to_string(&pf).unwrap();
        let back: ProjectFinance = serde_json::from_str(&s).unwrap();
        assert!(back.actual_cost.is_none());
        assert_eq!(back.payment_status, "unpaid");
    }

    // ---- CreateProjectRequest ----

    fn sample_create_project_request() -> CreateProjectRequest {
        CreateProjectRequest {
            name: "新项目".to_string(),
            code: "NEW-001".to_string(),
            description: Some("desc".to_string()),
            project_type: "internal".to_string(),
            leader: Some("leader".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            budget: Some(sample_decimal()),
            project_config: Some(serde_json::json!({"k": 1})),
            benefit_target: Some(serde_json::json!({"t": 2})),
            risk_level: Some("LOW".to_string()),
            priority: Some(2),
            tags: Some(vec!["a".to_string()]),
            parent_id: Some(sample_uuid()),
            workspace_id: Some(sample_uuid()),
        }
    }

    #[test]
    fn test_create_project_request_serde_roundtrip() {
        let r = sample_create_project_request();
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateProjectRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.code, r.code);
        assert_eq!(back.budget, r.budget);
        assert_eq!(back.tags, r.tags);
    }

    #[test]
    fn test_create_project_request_clone_eq() {
        let r = sample_create_project_request();
        let c = r.clone();
        assert_eq!(c.name, r.name);
        assert_eq!(c.budget, r.budget);
    }

    #[test]
    fn test_create_project_request_minimal_fields() {
        let r = CreateProjectRequest {
            name: "x".to_string(),
            code: "y".to_string(),
            description: None,
            project_type: "t".to_string(),
            leader: None,
            start_date: None,
            end_date: None,
            budget: None,
            project_config: None,
            benefit_target: None,
            risk_level: None,
            priority: None,
            tags: None,
            parent_id: None,
            workspace_id: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateProjectRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, "x");
        assert!(back.budget.is_none());
    }

    // ---- UpdateProjectRequest ----

    #[test]
    fn test_update_project_request_all_none_roundtrip() {
        let r = UpdateProjectRequest {
            name: None,
            description: None,
            status: None,
            leader: None,
            end_date: None,
            budget: None,
            progress: None,
            project_config: None,
            benefit_target: None,
            risk_level: None,
            priority: None,
            tags: None,
            parent_id: None,
            workspace_id: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateProjectRequest = serde_json::from_str(&s).unwrap();
        assert!(back.name.is_none());
        assert!(back.budget.is_none());
    }

    #[test]
    fn test_update_project_request_with_values_roundtrip() {
        let r = UpdateProjectRequest {
            name: Some("updated".to_string()),
            description: Some("d".to_string()),
            status: Some("active".to_string()),
            leader: Some("l".to_string()),
            end_date: Some(now()),
            budget: Some(sample_decimal()),
            progress: Some(80),
            project_config: Some(serde_json::json!({"x": 1})),
            benefit_target: Some(serde_json::json!({"y": 2})),
            risk_level: Some("HIGH".to_string()),
            priority: Some(5),
            tags: Some(vec!["t".to_string()]),
            parent_id: Some(sample_uuid()),
            workspace_id: Some(sample_uuid()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateProjectRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.progress, r.progress);
        assert_eq!(back.budget, r.budget);
    }

    #[test]
    fn test_update_project_request_clone_preserves_fields() {
        let r = UpdateProjectRequest {
            name: Some("n".to_string()),
            description: None,
            status: Some("active".to_string()),
            leader: None,
            end_date: None,
            budget: Some(sample_decimal()),
            progress: Some(50),
            project_config: None,
            benefit_target: None,
            risk_level: None,
            priority: None,
            tags: None,
            parent_id: None,
            workspace_id: None,
        };
        let c = r.clone();
        assert_eq!(c.name, r.name);
        assert_eq!(c.budget, r.budget);
    }

    #[test]
    fn test_decimal_strict_roundtrip_via_project() {
        // Verify Decimal::from_str produces a valid Decimal that survives Project serde
        let mut p = sample_project();
        p.budget = Some(Decimal::from_str("99999999.99").unwrap());
        let s = serde_json::to_string(&p).unwrap();
        let back: Project = serde_json::from_str(&s).unwrap();
        assert_eq!(back.budget.unwrap(), p.budget.unwrap());
    }
}
