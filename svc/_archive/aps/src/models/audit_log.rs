use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditLog {
    pub id: Uuid,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub user_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn struct_audit_log() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            action: "schedule_generated".into(),
            entity_type: "production_plan".into(),
            entity_id: Some(Uuid::new_v4()),
            user_id: Some("planner01".into()),
            created_at: Utc::now(),
        });
    }

    #[test]
    fn struct_audit_log_system_action() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            action: "auto_reschedule".into(),
            entity_type: "capacity".into(),
            entity_id: None,
            user_id: None,
            created_at: Utc::now(),
        });
    }

    #[test]
    fn audit_log_clone_preserves_fields() {
        let id = Uuid::new_v4();
        let entity_id = Uuid::new_v4();
        let now = Utc::now();
        let log = AuditLog {
            id,
            action: "plan_approved".into(),
            entity_type: "production_plan".into(),
            entity_id: Some(entity_id),
            user_id: Some("manager01".into()),
            created_at: now,
        };
        let cloned = log.clone();
        assert_eq!(cloned.id, id);
        assert_eq!(cloned.action, "plan_approved");
        assert_eq!(cloned.entity_type, "production_plan");
        assert_eq!(cloned.entity_id, Some(entity_id));
        assert_eq!(cloned.user_id, Some("manager01".to_string()));
        assert_eq!(cloned.created_at, now);
    }

    #[test]
    fn audit_log_debug_format() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "test_action".into(),
            entity_type: "test_entity".into(),
            entity_id: None,
            user_id: None,
            created_at: Utc::now(),
        };
        let debug = format!("{:?}", log);
        assert!(debug.contains("test_action"));
        assert!(debug.contains("test_entity"));
    }

    #[test]
    fn audit_log_long_action_name() {
        let long_action = "a".repeat(1000);
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            action: long_action.clone(),
            entity_type: "schedule".into(),
            entity_id: None,
            user_id: Some("system".into()),
            created_at: Utc::now(),
        });
    }

    #[test]
    fn audit_log_entity_type_variants() {
        let types = vec![
            "production_plan",
            "schedule",
            "capacity",
            "material_plan",
            "demand_forecast",
        ];
        for t in types {
            roundtrip(&AuditLog {
                id: Uuid::new_v4(),
                action: "created".into(),
                entity_type: t.into(),
                entity_id: Some(Uuid::new_v4()),
                user_id: Some("user".into()),
                created_at: Utc::now(),
            });
        }
    }
}
