use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Encode, FromRow, Postgres, Type};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProjectType {
    #[default]
    RD,
    Production,
    Design,
    Construction,
    Service,
}

impl std::fmt::Display for ProjectType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectType::RD => write!(f, "R&D"),
            ProjectType::Production => write!(f, "PRODUCTION"),
            ProjectType::Design => write!(f, "DESIGN"),
            ProjectType::Construction => write!(f, "CONSTRUCTION"),
            ProjectType::Service => write!(f, "SERVICE"),
        }
    }
}

impl Type<Postgres> for ProjectType {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <&str as Type<Postgres>>::type_info()
    }
}

impl<'q> Encode<'q, Postgres> for ProjectType {
    fn encode_by_ref(
        &self,
        buf: &mut <Postgres as sqlx::Database>::ArgumentBuffer<'q>,
    ) -> Result<sqlx::encode::IsNull, Box<dyn std::error::Error + Send + Sync + 'static>> {
        <&str as Encode<'q, Postgres>>::encode_by_ref(&self.to_string().as_str(), buf)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProjectStatus {
    #[default]
    Draft,
    PendingApproval,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(dead_code)]
pub enum RiskLevel {
    Low,
    #[default]
    Medium,
    High,
    Critical,
}

impl std::fmt::Display for RiskLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RiskLevel::Low => write!(f, "LOW"),
            RiskLevel::Medium => write!(f, "MEDIUM"),
            RiskLevel::High => write!(f, "HIGH"),
            RiskLevel::Critical => write!(f, "CRITICAL"),
        }
    }
}

impl std::fmt::Display for ProjectStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectStatus::Draft => write!(f, "DRAFT"),
            ProjectStatus::PendingApproval => write!(f, "PENDING_APPROVAL"),
            ProjectStatus::Active => write!(f, "ACTIVE"),
            ProjectStatus::Paused => write!(f, "PAUSED"),
            ProjectStatus::Completed => write!(f, "COMPLETED"),
            ProjectStatus::Cancelled => write!(f, "CANCELLED"),
        }
    }
}

impl Type<Postgres> for ProjectStatus {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <&str as Type<Postgres>>::type_info()
    }
}

impl<'q> Encode<'q, Postgres> for ProjectStatus {
    fn encode_by_ref(
        &self,
        buf: &mut <Postgres as sqlx::Database>::ArgumentBuffer<'q>,
    ) -> Result<sqlx::encode::IsNull, Box<dyn std::error::Error + Send + Sync + 'static>> {
        <&str as Encode<'q, Postgres>>::encode_by_ref(&self.to_string().as_str(), buf)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub status: String,
    pub leader: String,
    pub team_members: Option<serde_json::Value>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    pub progress: i32,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // 新增字段
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<serde_json::Value>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProjectRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: ProjectType,
    pub leader: String,
    pub team_members: Option<serde_json::Value>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,

    // 新增字段
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<serde_json::Value>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<ProjectStatus>,
    pub leader: Option<String>,
    pub team_members: Option<serde_json::Value>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    pub progress: Option<i32>,

    // 新增字段
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<serde_json::Value>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub project_type: String,
    pub status: String,
    pub leader: String,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    pub actual_cost: Option<f64>,
    pub progress: i32,
    pub contract_count: i64,
    pub receivable_total: f64,
    pub payable_total: f64,
    pub expense_total: f64,
    pub member_count: i64,
    pub phase_count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    // ===== ProjectType enum =====

    #[test]
    fn test_project_type_serde_roundtrip() {
        let variants = vec![
            ProjectType::RD,
            ProjectType::Production,
            ProjectType::Design,
            ProjectType::Construction,
            ProjectType::Service,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: ProjectType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_project_type_serde_screaming_snake_case() {
        // SCREAMING_SNAKE_CASE splits consecutive capitals, so RD -> R_D
        assert_eq!(serde_json::to_string(&ProjectType::RD).unwrap(), "\"R_D\"");
        assert_eq!(
            serde_json::to_string(&ProjectType::Production).unwrap(),
            "\"PRODUCTION\""
        );
    }

    #[test]
    fn test_project_type_default_is_rd() {
        assert_eq!(ProjectType::default(), ProjectType::RD);
    }

    #[test]
    fn test_project_type_display() {
        assert_eq!(format!("{}", ProjectType::RD), "R&D");
        assert_eq!(format!("{}", ProjectType::Production), "PRODUCTION");
        assert_eq!(format!("{}", ProjectType::Design), "DESIGN");
        assert_eq!(format!("{}", ProjectType::Construction), "CONSTRUCTION");
        assert_eq!(format!("{}", ProjectType::Service), "SERVICE");
    }

    #[test]
    fn test_project_type_clone_copy_eq() {
        let a = ProjectType::Design;
        let b = a;
        assert_eq!(a, b);
        assert_ne!(a, ProjectType::RD);
    }

    // ===== ProjectStatus enum =====

    #[test]
    fn test_project_status_serde_roundtrip() {
        let variants = vec![
            ProjectStatus::Draft,
            ProjectStatus::PendingApproval,
            ProjectStatus::Active,
            ProjectStatus::Paused,
            ProjectStatus::Completed,
            ProjectStatus::Cancelled,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: ProjectStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_project_status_default_is_draft() {
        assert_eq!(ProjectStatus::default(), ProjectStatus::Draft);
    }

    #[test]
    fn test_project_status_display() {
        assert_eq!(format!("{}", ProjectStatus::Draft), "DRAFT");
        assert_eq!(
            format!("{}", ProjectStatus::PendingApproval),
            "PENDING_APPROVAL"
        );
        assert_eq!(format!("{}", ProjectStatus::Active), "ACTIVE");
        assert_eq!(format!("{}", ProjectStatus::Completed), "COMPLETED");
        assert_eq!(format!("{}", ProjectStatus::Cancelled), "CANCELLED");
    }

    // ===== RiskLevel enum =====

    #[test]
    fn test_risk_level_serde_roundtrip() {
        let variants = vec![
            RiskLevel::Low,
            RiskLevel::Medium,
            RiskLevel::High,
            RiskLevel::Critical,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: RiskLevel = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_risk_level_default_is_medium() {
        assert_eq!(RiskLevel::default(), RiskLevel::Medium);
    }

    #[test]
    fn test_risk_level_display() {
        assert_eq!(format!("{}", RiskLevel::Low), "LOW");
        assert_eq!(format!("{}", RiskLevel::Medium), "MEDIUM");
        assert_eq!(format!("{}", RiskLevel::High), "HIGH");
        assert_eq!(format!("{}", RiskLevel::Critical), "CRITICAL");
    }

    // ===== Project struct =====

    fn sample_project() -> Project {
        Project {
            id: Uuid::nil(),
            name: "项目A".to_string(),
            code: "PRJ-001".to_string(),
            description: Some("描述".to_string()),
            project_type: "R&D".to_string(),
            status: "active".to_string(),
            leader: "张三".to_string(),
            team_members: Some(serde_json::json!(["张三", "李四"])),
            start_date: now(),
            end_date: None,
            budget: Some(100000.0),
            progress: 50,
            created_by: "admin".to_string(),
            created_at: now(),
            updated_at: now(),
            project_config: None,
            benefit_target: None,
            risk_level: Some("medium".to_string()),
            priority: Some(5),
            tags: Some(serde_json::json!(["关键", "研发"])),
            parent_id: None,
            workspace_id: None,
        }
    }

    #[test]
    fn test_project_serde_roundtrip() {
        let p = sample_project();
        let json = serde_json::to_string(&p).unwrap();
        let back: Project = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.code, "PRJ-001");
        assert_eq!(back.progress, 50);
    }

    #[test]
    fn test_project_clone_preserves_serialization() {
        let p = sample_project();
        let cloned = p.clone();
        assert_eq!(
            serde_json::to_string(&p).unwrap(),
            serde_json::to_string(&cloned).unwrap()
        );
    }

    #[test]
    fn test_create_project_request_roundtrip() {
        let req = CreateProjectRequest {
            name: "项目B".to_string(),
            code: "PRJ-002".to_string(),
            description: None,
            project_type: ProjectType::Design,
            leader: "李四".to_string(),
            team_members: None,
            start_date: now(),
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
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateProjectRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.project_type, ProjectType::Design);
        assert_eq!(back.name, "项目B");
    }

    #[test]
    fn test_update_project_request_all_none_roundtrip() {
        let req = UpdateProjectRequest {
            name: None,
            description: None,
            status: None,
            leader: None,
            team_members: None,
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
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateProjectRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }

    #[test]
    fn test_project_summary_roundtrip() {
        let s = ProjectSummary {
            id: Uuid::nil(),
            name: "项目A".to_string(),
            code: "PRJ-001".to_string(),
            project_type: "R&D".to_string(),
            status: "active".to_string(),
            leader: "张三".to_string(),
            start_date: now(),
            end_date: Some(now()),
            budget: Some(1000.0),
            actual_cost: Some(500.0),
            progress: 50,
            contract_count: 3,
            receivable_total: 10000.0,
            payable_total: 5000.0,
            expense_total: 2000.0,
            member_count: 5,
            phase_count: 2,
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: ProjectSummary = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.contract_count, 3);
    }
}
