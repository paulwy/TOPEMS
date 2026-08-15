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
            action: "shipment_created".into(),
            entity_type: "shipment".into(),
            entity_id: Some(Uuid::new_v4()),
            user_id: Some("dispatcher01".into()),
            created_at: Utc::now(),
        });
    }

    #[test]
    fn struct_audit_log_no_user() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            action: "system_sync".into(),
            entity_type: "route".into(),
            entity_id: None,
            user_id: None,
            created_at: Utc::now(),
        });
    }
}
