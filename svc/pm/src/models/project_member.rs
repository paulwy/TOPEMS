use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMember {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: String,
    pub role: String,
    pub responsibilities: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMemberRequest {
    pub user_id: String,
    pub role: String,
    pub responsibilities: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMemberRequest {
    pub role: Option<String>,
    pub responsibilities: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
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

    // ---- ProjectMember ----

    fn sample_member() -> ProjectMember {
        ProjectMember {
            id: uid(),
            project_id: uid(),
            user_id: "user-001".to_string(),
            role: "manager".to_string(),
            responsibilities: Some("负责整体进度".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_member_serde_roundtrip() {
        let m = sample_member();
        let s = serde_json::to_string(&m).unwrap();
        let back: ProjectMember = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, m.id);
        assert_eq!(back.user_id, m.user_id);
        assert_eq!(back.role, m.role);
        assert_eq!(back.responsibilities, m.responsibilities);
    }

    #[test]
    fn test_project_member_clone_preserves_fields() {
        let m = sample_member();
        let c = m.clone();
        assert_eq!(c.id, m.id);
        assert_eq!(c.user_id, m.user_id);
        assert_eq!(c.role, m.role);
    }

    #[test]
    fn test_project_member_with_none_optional() {
        let m = ProjectMember {
            id: uid(),
            project_id: uid(),
            user_id: "u".to_string(),
            role: "member".to_string(),
            responsibilities: None,
            start_date: None,
            end_date: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&m).unwrap();
        let back: ProjectMember = serde_json::from_str(&s).unwrap();
        assert!(back.responsibilities.is_none());
        assert!(back.start_date.is_none());
    }

    #[test]
    fn test_project_member_role_roundtrip() {
        let mut m = sample_member();
        m.role = "developer".to_string();
        let s = serde_json::to_string(&m).unwrap();
        let back: ProjectMember = serde_json::from_str(&s).unwrap();
        assert_eq!(back.role, "developer");
    }

    // ---- CreateMemberRequest ----

    #[test]
    fn test_create_member_request_roundtrip() {
        let r = CreateMemberRequest {
            user_id: "u-1".to_string(),
            role: "tester".to_string(),
            responsibilities: Some("r".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateMemberRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.user_id, r.user_id);
        assert_eq!(back.role, r.role);
    }

    #[test]
    fn test_create_member_request_minimal() {
        let r = CreateMemberRequest {
            user_id: "u".to_string(),
            role: "viewer".to_string(),
            responsibilities: None,
            start_date: None,
            end_date: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateMemberRequest = serde_json::from_str(&s).unwrap();
        assert!(back.responsibilities.is_none());
    }

    #[test]
    fn test_create_member_request_clone_eq() {
        let r = CreateMemberRequest {
            user_id: "x".to_string(),
            role: "y".to_string(),
            responsibilities: None,
            start_date: None,
            end_date: None,
        };
        let c = r.clone();
        assert_eq!(c.user_id, r.user_id);
    }

    // ---- UpdateMemberRequest ----

    #[test]
    fn test_update_member_request_all_none() {
        let r = UpdateMemberRequest {
            role: None,
            responsibilities: None,
            start_date: None,
            end_date: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateMemberRequest = serde_json::from_str(&s).unwrap();
        assert!(back.role.is_none());
        assert!(back.responsibilities.is_none());
    }

    #[test]
    fn test_update_member_request_with_values() {
        let r = UpdateMemberRequest {
            role: Some("lead".to_string()),
            responsibilities: Some("new r".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateMemberRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.role, r.role);
        assert_eq!(back.responsibilities, r.responsibilities);
    }
}
