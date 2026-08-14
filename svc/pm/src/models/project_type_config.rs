use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectTypeConfig {
    pub id: Uuid,
    pub project_type: String,
    pub service_name: Option<String>,
    pub default_status: Option<String>,
    pub default_phases: Option<serde_json::Value>,
    pub required_fields: Option<Vec<String>>,
    pub custom_fields: Option<serde_json::Value>,
    pub workflow_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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

    fn sample_config() -> ProjectTypeConfig {
        ProjectTypeConfig {
            id: uid(),
            project_type: "internal".to_string(),
            service_name: Some("pm".to_string()),
            default_status: Some("draft".to_string()),
            default_phases: Some(serde_json::json!(["设计", "开发", "测试"])),
            required_fields: Some(vec!["name".to_string(), "code".to_string()]),
            custom_fields: Some(serde_json::json!({"priority": true})),
            workflow_id: Some(uid()),
            is_active: Some(true),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_type_config_serde_roundtrip() {
        let c = sample_config();
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, c.id);
        assert_eq!(back.project_type, c.project_type);
        assert_eq!(back.default_phases, c.default_phases);
        assert_eq!(back.required_fields, c.required_fields);
        assert_eq!(back.custom_fields, c.custom_fields);
        assert_eq!(back.is_active, c.is_active);
    }

    #[test]
    fn test_project_type_config_clone_preserves_fields() {
        let c = sample_config();
        let cl = c.clone();
        assert_eq!(cl.id, c.id);
        assert_eq!(cl.project_type, c.project_type);
        assert_eq!(cl.required_fields, c.required_fields);
    }

    #[test]
    fn test_project_type_config_with_none_optional() {
        let c = ProjectTypeConfig {
            id: uid(),
            project_type: "external".to_string(),
            service_name: None,
            default_status: None,
            default_phases: None,
            required_fields: None,
            custom_fields: None,
            workflow_id: None,
            is_active: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert!(back.service_name.is_none());
        assert!(back.required_fields.is_none());
        assert!(back.is_active.is_none());
    }

    #[test]
    fn test_project_type_config_inactive_roundtrip() {
        let mut c = sample_config();
        c.is_active = Some(false);
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.is_active, Some(false));
    }

    #[test]
    fn test_project_type_config_empty_required_fields() {
        let mut c = sample_config();
        c.required_fields = Some(vec![]);
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.required_fields.as_ref().unwrap().len(), 0);
    }

    #[test]
    fn test_project_type_config_complex_default_phases() {
        let mut c = sample_config();
        c.default_phases = Some(serde_json::json!({
            "phases": [
                {"name": "phase1", "order": 1},
                {"name": "phase2", "order": 2}
            ]
        }));
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.default_phases, c.default_phases);
    }

    #[test]
    fn test_project_type_config_null_custom_fields() {
        // serde_json deserializes JSON null as None for Option<Value>,
        // so Some(Value::Null) does not survive a roundtrip (becomes None).
        let mut c = sample_config();
        c.custom_fields = Some(serde_json::Value::Null);
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert!(back.custom_fields.is_none());
    }

    #[test]
    fn test_project_type_config_workflow_id_roundtrip() {
        let mut c = sample_config();
        c.workflow_id = None;
        let s = serde_json::to_string(&c).unwrap();
        let back: ProjectTypeConfig = serde_json::from_str(&s).unwrap();
        assert!(back.workflow_id.is_none());
    }
}
