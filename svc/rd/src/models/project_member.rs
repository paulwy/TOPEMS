use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MemberRole {
    ProjectManager,
    TechLead,
    Developer,
    Designer,
    Tester,
    Analyst,
    Consultant,
    Client,
    #[default]
    Other,
}

impl std::fmt::Display for MemberRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemberRole::ProjectManager => write!(f, "PROJECT_MANAGER"),
            MemberRole::TechLead => write!(f, "TECH_LEAD"),
            MemberRole::Developer => write!(f, "DEVELOPER"),
            MemberRole::Designer => write!(f, "DESIGNER"),
            MemberRole::Tester => write!(f, "TESTER"),
            MemberRole::Analyst => write!(f, "ANALYST"),
            MemberRole::Consultant => write!(f, "CONSULTANT"),
            MemberRole::Client => write!(f, "CLIENT"),
            MemberRole::Other => write!(f, "OTHER"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MemberStatus {
    #[default]
    Active,
    Inactive,
}

impl std::fmt::Display for MemberStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemberStatus::Active => write!(f, "ACTIVE"),
            MemberStatus::Inactive => write!(f, "INACTIVE"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMember {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Uuid,
    pub employee_id: Uuid,
    pub role: String,
    pub responsibility: Option<String>,
    pub allocation: f32,
    pub join_date: DateTime<Utc>,
    pub leave_date: Option<DateTime<Utc>>,
    pub status: String,
    pub hourly_rate: Option<f64>,
    pub cost_rate: Option<f64>,
    pub budgeted_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMemberRequest {
    pub project_id: Uuid,
    pub employee_id: Uuid,
    pub role: MemberRole,
    pub responsibility: Option<String>,
    pub allocation: Option<f32>,
    pub join_date: DateTime<Utc>,
    pub hourly_rate: Option<f64>,
    pub cost_rate: Option<f64>,
    pub budgeted_hours: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMemberRequest {
    pub role: Option<MemberRole>,
    pub responsibility: Option<String>,
    pub allocation: Option<f32>,
    pub leave_date: Option<DateTime<Utc>>,
    pub status: Option<MemberStatus>,
    pub hourly_rate: Option<f64>,
    pub cost_rate: Option<f64>,
    pub budgeted_hours: Option<f64>,
    pub actual_hours: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn test_member_role_serde_roundtrip() {
        let variants = vec![
            MemberRole::ProjectManager,
            MemberRole::TechLead,
            MemberRole::Developer,
            MemberRole::Designer,
            MemberRole::Tester,
            MemberRole::Analyst,
            MemberRole::Consultant,
            MemberRole::Client,
            MemberRole::Other,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: MemberRole = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_member_role_default_is_other() {
        assert_eq!(MemberRole::default(), MemberRole::Other);
    }

    #[test]
    fn test_member_role_display() {
        assert_eq!(format!("{}", MemberRole::ProjectManager), "PROJECT_MANAGER");
        assert_eq!(format!("{}", MemberRole::TechLead), "TECH_LEAD");
        assert_eq!(format!("{}", MemberRole::Developer), "DEVELOPER");
        assert_eq!(format!("{}", MemberRole::Other), "OTHER");
    }

    #[test]
    fn test_member_status_serde_roundtrip() {
        let json = serde_json::to_string(&MemberStatus::Active).unwrap();
        let back: MemberStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(MemberStatus::Active, back);
        let json2 = serde_json::to_string(&MemberStatus::Inactive).unwrap();
        let back2: MemberStatus = serde_json::from_str(&json2).unwrap();
        assert_eq!(MemberStatus::Inactive, back2);
    }

    #[test]
    fn test_member_status_default_is_active() {
        assert_eq!(MemberStatus::default(), MemberStatus::Active);
    }

    #[test]
    fn test_member_status_display() {
        assert_eq!(format!("{}", MemberStatus::Active), "ACTIVE");
        assert_eq!(format!("{}", MemberStatus::Inactive), "INACTIVE");
    }

    #[test]
    fn test_project_member_serde_roundtrip() {
        let m = ProjectMember {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            project_id: Uuid::nil(),
            employee_id: Uuid::nil(),
            role: "Developer".to_string(),
            responsibility: Some("后端开发".to_string()),
            allocation: 0.8,
            join_date: now(),
            leave_date: None,
            status: "active".to_string(),
            hourly_rate: Some(120.0),
            cost_rate: Some(80.0),
            budgeted_hours: Some(160.0),
            actual_hours: Some(40.0),
            created_at: now(),
            updated_at: now(),
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: ProjectMember = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.role, "Developer");
    }

    #[test]
    fn test_create_member_request_roundtrip() {
        let req = CreateMemberRequest {
            project_id: Uuid::nil(),
            employee_id: Uuid::nil(),
            role: MemberRole::TechLead,
            responsibility: None,
            allocation: Some(1.0),
            join_date: now(),
            hourly_rate: Some(200.0),
            cost_rate: None,
            budgeted_hours: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateMemberRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.role, MemberRole::TechLead);
    }
}
