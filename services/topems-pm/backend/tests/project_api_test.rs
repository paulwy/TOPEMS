use chrono::{DateTime, Utc, Duration};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum ProjectStatus {
    Draft,
    PendingApproval,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for RiskLevel {
    fn default() -> Self {
        RiskLevel::Medium
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Project {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub status: String,
    pub progress: i32,
    pub budget: Option<Decimal>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateProjectRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub budget: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct UpdateProjectRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub progress: Option<i32>,
    pub budget: Option<Decimal>,
}

#[test]
fn test_project_status_enum() {
    let status = ProjectStatus::Active;
    assert_eq!(serde_json::to_string(&status).unwrap(), "\"ACTIVE\"");
    
    let status: ProjectStatus = serde_json::from_str("\"DRAFT\"").unwrap();
    assert_eq!(status, ProjectStatus::Draft);
}

#[test]
fn test_risk_level_enum() {
    let risk = RiskLevel::High;
    assert_eq!(serde_json::to_string(&risk).unwrap(), "\"HIGH\"");
    
    let risk: RiskLevel = serde_json::from_str("\"LOW\"").unwrap();
    assert_eq!(risk, RiskLevel::Low);
    
    let default_risk = RiskLevel::default();
    assert_eq!(default_risk, RiskLevel::Medium);
}

#[test]
fn test_create_project_request_validation() {
    let req = CreateProjectRequest {
        name: "测试项目".to_string(),
        code: "TEST-001".to_string(),
        description: Some("项目描述".to_string()),
        project_type: "engineering".to_string(),
        budget: Some(Decimal::from(100000)),
    };
    
    assert_eq!(req.name, "测试项目");
    assert_eq!(req.code, "TEST-001");
    assert!(req.description.is_some());
    assert!(req.budget.is_some());
}

#[test]
fn test_update_project_request_partial_update() {
    let req = UpdateProjectRequest {
        name: Some("更新名称".to_string()),
        status: Some("active".to_string()),
        progress: Some(50),
        budget: Some(Decimal::from(150000)),
    };
    
    assert!(req.name.is_some());
    assert!(req.status.is_some());
    assert_eq!(req.progress.unwrap(), 50);
}

#[test]
fn test_project_struct_creation() {
    let now = Utc::now();
    let project = Project {
        id: Uuid::new_v4(),
        name: "示例项目".to_string(),
        code: "SAMPLE-001".to_string(),
        description: Some("示例描述".to_string()),
        project_type: "engineering".to_string(),
        status: "active".to_string(),
        progress: 30,
        budget: Some(Decimal::from(200000)),
        created_at: now,
        updated_at: now,
    };
    
    assert_eq!(project.name, "示例项目");
    assert_eq!(project.status, "active");
    assert_eq!(project.progress, 30);
    assert!(project.budget.is_some());
}

#[test]
fn test_project_serialization() {
    let now = Utc::now();
    let project = Project {
        id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
        name: "测试项目".to_string(),
        code: "TEST-001".to_string(),
        description: None,
        project_type: "engineering".to_string(),
        status: "draft".to_string(),
        progress: 0,
        budget: None,
        created_at: now,
        updated_at: now,
    };
    
    let json_str = serde_json::to_string(&project).unwrap();
    let deserialized: Project = serde_json::from_str(&json_str).unwrap();
    
    assert_eq!(deserialized.id, project.id);
    assert_eq!(deserialized.name, project.name);
    assert_eq!(deserialized.status, project.status);
}

#[test]
fn test_project_status_transitions() {
    let mut project = Project {
        id: Uuid::new_v4(),
        name: "状态测试".to_string(),
        code: "STATUS-TEST".to_string(),
        description: None,
        project_type: "engineering".to_string(),
        status: "draft".to_string(),
        progress: 0,
        budget: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    project.status = "pending_approval".to_string();
    assert_eq!(project.status, "pending_approval");
    
    project.status = "active".to_string();
    assert_eq!(project.status, "active");
    
    project.status = "completed".to_string();
    assert_eq!(project.status, "completed");
}

#[test]
fn test_project_budget_calculations() {
    let project = Project {
        id: Uuid::new_v4(),
        name: "预算测试".to_string(),
        code: "BUDGET-TEST".to_string(),
        description: None,
        project_type: "engineering".to_string(),
        status: "active".to_string(),
        progress: 50,
        budget: Some(Decimal::from(1000000)),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    let budget = project.budget.unwrap();
    assert_eq!(budget, Decimal::from(1000000));
    
    let spent = budget * Decimal::from_str_exact("0.5").unwrap();
    assert_eq!(spent, Decimal::from(500000));
}

#[test]
fn test_uuid_generation() {
    let id1 = Uuid::new_v4();
    let id2 = Uuid::new_v4();
    
    assert_ne!(id1, id2);
    assert!(id1.to_string().len() > 0);
}

#[test]
fn test_date_time_operations() {
    let now = Utc::now();
    let tomorrow = now + Duration::days(1);
    
    assert!(tomorrow > now);
    assert_eq!(tomorrow - now, Duration::days(1));
}

#[test]
fn test_decimal_precision() {
    let val1 = Decimal::from(100);
    let val2 = Decimal::from_str_exact("0.5").unwrap();
    
    assert_eq!(val1 * val2, Decimal::from(50));
    assert_eq!(val1 + val2, Decimal::from_str_exact("100.5").unwrap());
}