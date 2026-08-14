use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProjectRisk {
    pub id: Uuid,
    pub project_id: Uuid,
    pub risk_code: Option<String>,
    pub risk_name: String,
    pub risk_description: Option<String>,
    pub risk_category: Option<String>,
    pub risk_subcategory: Option<String>,
    pub likelihood: String,
    pub impact: String,
    pub risk_score: i32,
    pub status: String,
    pub mitigation_strategy: Option<String>,
    pub contingency_plan: Option<String>,
    pub trigger_condition: Option<String>,
    pub warning_threshold: i32,
    pub owner: Option<String>,
    pub response_due_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRiskRequest {
    pub risk_code: Option<String>,
    pub risk_name: String,
    pub risk_description: Option<String>,
    pub risk_category: Option<String>,
    pub risk_subcategory: Option<String>,
    pub likelihood: String,
    pub impact: String,
    pub risk_score: i32,
    pub mitigation_strategy: Option<String>,
    pub contingency_plan: Option<String>,
    pub trigger_condition: Option<String>,
    pub warning_threshold: Option<i32>,
    pub owner: Option<String>,
    pub response_due_date: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRiskRequest {
    pub risk_name: Option<String>,
    pub risk_description: Option<String>,
    pub risk_category: Option<String>,
    pub risk_subcategory: Option<String>,
    pub likelihood: Option<String>,
    pub impact: Option<String>,
    pub risk_score: Option<i32>,
    pub status: Option<String>,
    pub mitigation_strategy: Option<String>,
    pub contingency_plan: Option<String>,
    pub trigger_condition: Option<String>,
    pub warning_threshold: Option<i32>,
    pub owner: Option<String>,
    pub response_due_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RiskEvent {
    pub id: Uuid,
    pub risk_id: Uuid,
    pub event_type: String,
    pub event_description: Option<String>,
    pub occurred_at: DateTime<Utc>,
    pub reported_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRiskEventRequest {
    pub event_type: String,
    pub event_description: Option<String>,
    pub reported_by: Option<String>,
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

    // ---- ProjectRisk ----

    fn sample_risk() -> ProjectRisk {
        ProjectRisk {
            id: uid(),
            project_id: uid(),
            risk_code: Some("R-001".to_string()),
            risk_name: "进度风险".to_string(),
            risk_description: Some("可能延期".to_string()),
            risk_category: Some("schedule".to_string()),
            risk_subcategory: Some("delay".to_string()),
            likelihood: "high".to_string(),
            impact: "medium".to_string(),
            risk_score: 12,
            status: "open".to_string(),
            mitigation_strategy: Some("增加资源".to_string()),
            contingency_plan: Some("延期申请".to_string()),
            trigger_condition: Some("工期滞后".to_string()),
            warning_threshold: 80,
            owner: Some("manager".to_string()),
            response_due_date: Some(now()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_risk_serde_roundtrip() {
        let r = sample_risk();
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectRisk = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, r.id);
        assert_eq!(back.risk_name, r.risk_name);
        assert_eq!(back.risk_score, r.risk_score);
        assert_eq!(back.likelihood, r.likelihood);
        assert_eq!(back.warning_threshold, r.warning_threshold);
    }

    #[test]
    fn test_project_risk_clone_preserves_fields() {
        let r = sample_risk();
        let c = r.clone();
        assert_eq!(c.id, r.id);
        assert_eq!(c.risk_name, r.risk_name);
        assert_eq!(c.risk_score, r.risk_score);
    }

    #[test]
    fn test_project_risk_with_none_optional() {
        let r = ProjectRisk {
            id: uid(),
            project_id: uid(),
            risk_code: None,
            risk_name: "n".to_string(),
            risk_description: None,
            risk_category: None,
            risk_subcategory: None,
            likelihood: "low".to_string(),
            impact: "low".to_string(),
            risk_score: 1,
            status: "open".to_string(),
            mitigation_strategy: None,
            contingency_plan: None,
            trigger_condition: None,
            warning_threshold: 0,
            owner: None,
            response_due_date: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectRisk = serde_json::from_str(&s).unwrap();
        assert!(back.risk_code.is_none());
        assert!(back.response_due_date.is_none());
    }

    #[test]
    fn test_project_risk_high_score_roundtrip() {
        let mut r = sample_risk();
        r.risk_score = 25;
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectRisk = serde_json::from_str(&s).unwrap();
        assert_eq!(back.risk_score, 25);
    }

    #[test]
    fn test_project_risk_zero_score_roundtrip() {
        let mut r = sample_risk();
        r.risk_score = 0;
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectRisk = serde_json::from_str(&s).unwrap();
        assert_eq!(back.risk_score, 0);
    }

    // ---- CreateRiskRequest ----

    #[test]
    fn test_create_risk_request_roundtrip() {
        let r = CreateRiskRequest {
            risk_code: Some("NEW-R-1".to_string()),
            risk_name: "新风险".to_string(),
            risk_description: Some("d".to_string()),
            risk_category: Some("c".to_string()),
            risk_subcategory: Some("sc".to_string()),
            likelihood: "medium".to_string(),
            impact: "high".to_string(),
            risk_score: 15,
            mitigation_strategy: Some("m".to_string()),
            contingency_plan: Some("cp".to_string()),
            trigger_condition: Some("tc".to_string()),
            warning_threshold: Some(50),
            owner: Some("o".to_string()),
            response_due_date: Some("2024-12-31T00:00:00Z".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateRiskRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.risk_name, r.risk_name);
        assert_eq!(back.risk_score, r.risk_score);
        assert_eq!(back.warning_threshold, r.warning_threshold);
    }

    #[test]
    fn test_create_risk_request_minimal() {
        let r = CreateRiskRequest {
            risk_code: None,
            risk_name: "n".to_string(),
            risk_description: None,
            risk_category: None,
            risk_subcategory: None,
            likelihood: "low".to_string(),
            impact: "low".to_string(),
            risk_score: 1,
            mitigation_strategy: None,
            contingency_plan: None,
            trigger_condition: None,
            warning_threshold: None,
            owner: None,
            response_due_date: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateRiskRequest = serde_json::from_str(&s).unwrap();
        assert!(back.risk_code.is_none());
        assert!(back.warning_threshold.is_none());
    }

    // ---- UpdateRiskRequest ----

    #[test]
    fn test_update_risk_request_all_none() {
        let r = UpdateRiskRequest {
            risk_name: None,
            risk_description: None,
            risk_category: None,
            risk_subcategory: None,
            likelihood: None,
            impact: None,
            risk_score: None,
            status: None,
            mitigation_strategy: None,
            contingency_plan: None,
            trigger_condition: None,
            warning_threshold: None,
            owner: None,
            response_due_date: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateRiskRequest = serde_json::from_str(&s).unwrap();
        assert!(back.risk_name.is_none());
        assert!(back.risk_score.is_none());
    }

    #[test]
    fn test_update_risk_request_with_values() {
        let r = UpdateRiskRequest {
            risk_name: Some("updated".to_string()),
            risk_description: Some("d".to_string()),
            risk_category: Some("c".to_string()),
            risk_subcategory: Some("sc".to_string()),
            likelihood: Some("high".to_string()),
            impact: Some("high".to_string()),
            risk_score: Some(20),
            status: Some("closed".to_string()),
            mitigation_strategy: Some("m".to_string()),
            contingency_plan: Some("cp".to_string()),
            trigger_condition: Some("tc".to_string()),
            warning_threshold: Some(99),
            owner: Some("o".to_string()),
            response_due_date: Some("2024-12-31T00:00:00Z".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateRiskRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.risk_name, r.risk_name);
        assert_eq!(back.risk_score, r.risk_score);
        assert_eq!(back.warning_threshold, r.warning_threshold);
    }

    // ---- RiskEvent ----

    #[test]
    fn test_risk_event_serde_roundtrip() {
        let e = RiskEvent {
            id: uid(),
            risk_id: uid(),
            event_type: "triggered".to_string(),
            event_description: Some("风险触发".to_string()),
            occurred_at: now(),
            reported_by: Some("u".to_string()),
            created_at: now(),
        };
        let s = serde_json::to_string(&e).unwrap();
        let back: RiskEvent = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, e.id);
        assert_eq!(back.event_type, e.event_type);
        assert_eq!(back.event_description, e.event_description);
    }

    #[test]
    fn test_risk_event_with_none_optional() {
        let e = RiskEvent {
            id: uid(),
            risk_id: uid(),
            event_type: "resolved".to_string(),
            event_description: None,
            occurred_at: now(),
            reported_by: None,
            created_at: now(),
        };
        let s = serde_json::to_string(&e).unwrap();
        let back: RiskEvent = serde_json::from_str(&s).unwrap();
        assert!(back.event_description.is_none());
        assert!(back.reported_by.is_none());
    }

    // ---- CreateRiskEventRequest ----

    #[test]
    fn test_create_risk_event_request_roundtrip() {
        let r = CreateRiskEventRequest {
            event_type: "triggered".to_string(),
            event_description: Some("d".to_string()),
            reported_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateRiskEventRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.event_type, r.event_type);
        assert_eq!(back.event_description, r.event_description);
    }

    #[test]
    fn test_create_risk_event_request_minimal() {
        let r = CreateRiskEventRequest {
            event_type: "x".to_string(),
            event_description: None,
            reported_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateRiskEventRequest = serde_json::from_str(&s).unwrap();
        assert!(back.event_description.is_none());
    }
}
