use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectBenefit {
    pub id: Uuid,
    pub project_id: Uuid,
    pub period_type: String,
    pub period_date: NaiveDate,
    pub planned_cost: f64,
    pub actual_cost: f64,
    pub planned_progress: i32,
    pub actual_progress: i32,
    pub planned_value: f64,
    pub earned_value: f64,
    pub actual_cost_eva: f64,
    pub cpi: f64,
    pub spi: f64,
    pub cv: f64,
    pub sv: f64,
    pub eac: f64,
    pub etc: f64,
    pub roi: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateBenefitRequest {
    pub period_type: String,
    pub period_date: NaiveDate,
    pub planned_cost: f64,
    pub actual_cost: f64,
    pub planned_progress: i32,
    pub actual_progress: i32,
    pub planned_value: f64,
    pub earned_value: f64,
    pub actual_cost_eva: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
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

    fn sample_date() -> NaiveDate {
        NaiveDate::from_ymd_opt(2024, 6, 15).unwrap()
    }

    // ---- ProjectBenefit ----

    fn sample_benefit() -> ProjectBenefit {
        ProjectBenefit {
            id: uid(),
            project_id: uid(),
            period_type: "monthly".to_string(),
            period_date: sample_date(),
            planned_cost: 100_000.0,
            actual_cost: 95_000.0,
            planned_progress: 50,
            actual_progress: 48,
            planned_value: 50_000.0,
            earned_value: 48_000.0,
            actual_cost_eva: 47_500.0,
            cpi: 1.011,
            spi: 0.96,
            cv: -2_000.0,
            sv: -2_000.0,
            eac: 99_000.0,
            etc: 4_000.0,
            roi: 0.15,
            notes: Some("按计划执行".to_string()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_benefit_serde_roundtrip() {
        let b = sample_benefit();
        let s = serde_json::to_string(&b).unwrap();
        let back: ProjectBenefit = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, b.id);
        assert_eq!(back.period_type, b.period_type);
        assert_eq!(back.period_date, b.period_date);
        assert_eq!(back.planned_cost, b.planned_cost);
        assert_eq!(back.cpi, b.cpi);
        assert_eq!(back.roi, b.roi);
    }

    #[test]
    fn test_project_benefit_clone_preserves_fields() {
        let b = sample_benefit();
        let c = b.clone();
        assert_eq!(c.id, b.id);
        assert_eq!(c.period_date, b.period_date);
        assert_eq!(c.cpi, b.cpi);
    }

    #[test]
    fn test_project_benefit_with_none_optional() {
        let b = ProjectBenefit {
            id: uid(),
            project_id: uid(),
            period_type: "weekly".to_string(),
            period_date: sample_date(),
            planned_cost: 0.0,
            actual_cost: 0.0,
            planned_progress: 0,
            actual_progress: 0,
            planned_value: 0.0,
            earned_value: 0.0,
            actual_cost_eva: 0.0,
            cpi: 0.0,
            spi: 0.0,
            cv: 0.0,
            sv: 0.0,
            eac: 0.0,
            etc: 0.0,
            roi: 0.0,
            notes: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&b).unwrap();
        let back: ProjectBenefit = serde_json::from_str(&s).unwrap();
        assert!(back.notes.is_none());
        assert!(back.created_by.is_none());
    }

    #[test]
    fn test_project_benefit_negative_variance_roundtrip() {
        let mut b = sample_benefit();
        b.cv = -5000.5;
        b.sv = -3000.25;
        let s = serde_json::to_string(&b).unwrap();
        let back: ProjectBenefit = serde_json::from_str(&s).unwrap();
        assert_eq!(back.cv, -5000.5);
        assert_eq!(back.sv, -3000.25);
    }

    #[test]
    fn test_project_benefit_zero_progress_roundtrip() {
        let mut b = sample_benefit();
        b.planned_progress = 0;
        b.actual_progress = 0;
        let s = serde_json::to_string(&b).unwrap();
        let back: ProjectBenefit = serde_json::from_str(&s).unwrap();
        assert_eq!(back.planned_progress, 0);
        assert_eq!(back.actual_progress, 0);
    }

    #[test]
    fn test_project_benefit_full_progress_roundtrip() {
        let mut b = sample_benefit();
        b.planned_progress = 100;
        b.actual_progress = 100;
        let s = serde_json::to_string(&b).unwrap();
        let back: ProjectBenefit = serde_json::from_str(&s).unwrap();
        assert_eq!(back.planned_progress, 100);
        assert_eq!(back.actual_progress, 100);
    }

    // ---- CreateBenefitRequest ----

    #[test]
    fn test_create_benefit_request_roundtrip() {
        let r = CreateBenefitRequest {
            period_type: "monthly".to_string(),
            period_date: sample_date(),
            planned_cost: 200_000.0,
            actual_cost: 180_000.0,
            planned_progress: 60,
            actual_progress: 55,
            planned_value: 120_000.0,
            earned_value: 110_000.0,
            actual_cost_eva: 108_000.0,
            notes: Some("note".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateBenefitRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.period_type, r.period_type);
        assert_eq!(back.period_date, r.period_date);
        assert_eq!(back.planned_cost, r.planned_cost);
        assert_eq!(back.actual_progress, r.actual_progress);
    }

    #[test]
    fn test_create_benefit_request_minimal() {
        let r = CreateBenefitRequest {
            period_type: "daily".to_string(),
            period_date: sample_date(),
            planned_cost: 0.0,
            actual_cost: 0.0,
            planned_progress: 0,
            actual_progress: 0,
            planned_value: 0.0,
            earned_value: 0.0,
            actual_cost_eva: 0.0,
            notes: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateBenefitRequest = serde_json::from_str(&s).unwrap();
        assert!(back.notes.is_none());
        assert!(back.created_by.is_none());
    }

    #[test]
    fn test_create_benefit_request_clone_eq() {
        let r = CreateBenefitRequest {
            period_type: "yearly".to_string(),
            period_date: sample_date(),
            planned_cost: 1.0,
            actual_cost: 2.0,
            planned_progress: 1,
            actual_progress: 2,
            planned_value: 3.0,
            earned_value: 4.0,
            actual_cost_eva: 5.0,
            notes: None,
            created_by: None,
        };
        let c = r.clone();
        assert_eq!(c.period_type, r.period_type);
        assert_eq!(c.planned_cost, r.planned_cost);
    }

    #[test]
    fn test_project_benefit_naive_date_roundtrip() {
        // Verify NaiveDate survives serialization in ProjectBenefit
        let mut b = sample_benefit();
        b.period_date = NaiveDate::from_ymd_opt(2020, 1, 31).unwrap();
        let s = serde_json::to_string(&b).unwrap();
        let back: ProjectBenefit = serde_json::from_str(&s).unwrap();
        assert_eq!(back.period_date, b.period_date);
    }
}
