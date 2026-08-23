use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct TrainingPlan {
    pub id: Uuid,
    #[sqlx(default)]
    pub tenant_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub status: String,
    pub budget: Option<Decimal>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateTrainingPlanRequest {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub budget: Option<Decimal>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateTrainingPlanRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub budget: Option<Decimal>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct TrainingCourse {
    pub id: Uuid,
    #[sqlx(default)]
    pub tenant_id: Option<Uuid>,
    pub plan_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub duration_hours: Option<Decimal>,
    pub instructor_id: Option<Uuid>,
    pub instructor_name: Option<String>,
    pub location: Option<String>,
    pub max_participants: Option<i32>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateTrainingCourseRequest {
    pub plan_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub duration_hours: Option<Decimal>,
    pub instructor_id: Option<Uuid>,
    pub instructor_name: Option<String>,
    pub location: Option<String>,
    pub max_participants: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateTrainingCourseRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub description: Option<String>,
    pub duration_hours: Option<Decimal>,
    pub instructor_id: Option<Uuid>,
    pub instructor_name: Option<String>,
    pub location: Option<String>,
    pub max_participants: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct TrainingRecord {
    pub id: Uuid,
    #[sqlx(default)]
    pub tenant_id: Option<Uuid>,
    pub course_id: Uuid,
    pub employee_id: Uuid,
    pub enrollment_date: DateTime<Utc>,
    pub attendance_status: String,
    pub completion_status: String,
    pub score: Option<Decimal>,
    pub certificate_no: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub feedback: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateTrainingRecordRequest {
    pub course_id: Uuid,
    pub employee_id: Uuid,
    pub enrollment_date: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateTrainingRecordRequest {
    pub attendance_status: Option<String>,
    pub completion_status: Option<String>,
    pub score: Option<Decimal>,
    pub certificate_no: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub feedback: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct TrainingPaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "pagesize")]
    pub page_size: Option<i64>,
    pub plan_id: Option<Uuid>,
    pub course_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + serde::de::DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_training_plan_roundtrip_full() {
        roundtrip(&TrainingPlan {
            id: Uuid::new_v4(),
            tenant_id: Some(Uuid::new_v4()),
            name: "2024 Q1 Training".to_string(),
            code: Some("TP-2024-Q1".to_string()),
            description: Some("Quarterly training plan".to_string()),
            start_date: now(),
            end_date: now(),
            status: "active".to_string(),
            budget: Some(Decimal::from(50000)),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_training_plan_roundtrip_minimal() {
        roundtrip(&TrainingPlan {
            id: Uuid::new_v4(),
            tenant_id: Some(Uuid::new_v4()),
            name: "Basic Training".to_string(),
            code: None,
            description: None,
            start_date: now(),
            end_date: now(),
            status: "completed".to_string(),
            budget: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_training_course_roundtrip_full() {
        roundtrip(&TrainingCourse {
            id: Uuid::new_v4(),
            tenant_id: Some(Uuid::new_v4()),
            plan_id: Uuid::new_v4(),
            name: "Rust Fundamentals".to_string(),
            code: Some("TC-RUST-001".to_string()),
            category: "Technical".to_string(),
            level: "Beginner".to_string(),
            description: Some("Introduction to Rust".to_string()),
            duration_hours: Some(Decimal::from(8)),
            instructor_id: Some(Uuid::new_v4()),
            instructor_name: Some("John Doe".to_string()),
            location: Some("Room A".to_string()),
            max_participants: Some(30),
            status: "active".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_training_course_roundtrip_minimal() {
        roundtrip(&TrainingCourse {
            id: Uuid::new_v4(),
            tenant_id: Some(Uuid::new_v4()),
            plan_id: Uuid::new_v4(),
            name: "Safety Training".to_string(),
            code: None,
            category: "Compliance".to_string(),
            level: "All".to_string(),
            description: None,
            duration_hours: None,
            instructor_id: None,
            instructor_name: None,
            location: None,
            max_participants: None,
            status: "active".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_training_record_roundtrip_full() {
        roundtrip(&TrainingRecord {
            id: Uuid::new_v4(),
            tenant_id: Some(Uuid::new_v4()),
            course_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            enrollment_date: now(),
            attendance_status: "attended".to_string(),
            completion_status: "completed".to_string(),
            score: Some(Decimal::from(95)),
            certificate_no: Some("CERT-001".to_string()),
            completed_at: Some(now()),
            feedback: Some("Great course".to_string()),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_training_record_roundtrip_minimal() {
        roundtrip(&TrainingRecord {
            id: Uuid::new_v4(),
            tenant_id: Some(Uuid::new_v4()),
            course_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            enrollment_date: now(),
            attendance_status: "registered".to_string(),
            completion_status: "in_progress".to_string(),
            score: None,
            certificate_no: None,
            completed_at: None,
            feedback: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_training_pagination_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: TrainingPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.plan_id.is_none());
        assert!(params.course_id.is_none());
        assert!(params.employee_id.is_none());
        assert!(params.status.is_none());
    }

    #[test]
    fn test_training_pagination_params_deserialize_all_some() {
        let plan = Uuid::new_v4();
        let course = Uuid::new_v4();
        let emp = Uuid::new_v4();
        let json = format!(
            r#"{{"page":1,"page_size":10,"plan_id":"{}","course_id":"{}","employee_id":"{}","status":"active"}}"#,
            plan, course, emp
        );
        let params: TrainingPaginationParams = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(10));
        assert_eq!(params.plan_id, Some(plan));
        assert_eq!(params.course_id, Some(course));
        assert_eq!(params.employee_id, Some(emp));
        assert_eq!(params.status.as_deref(), Some("active"));
    }
}
