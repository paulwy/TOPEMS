use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub table_name: String,
    pub record_id: Uuid,
    pub action: String,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub changed_by: Option<Uuid>,
    pub changed_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuditLogRequest {
    pub table_name: String,
    pub record_id: String,
    pub action: String,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub tenant_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_audit_log() -> AuditLog {
        AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            table_name: "suppliers".to_string(),
            record_id: Uuid::new_v4(),
            action: "UPDATE".to_string(),
            old_values: Some(serde_json::json!({"name": "Old Name"})),
            new_values: Some(serde_json::json!({"name": "New Name"})),
            changed_by: Some(Uuid::new_v4()),
            changed_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
        }
    }

    #[test]
    fn test_audit_log_serde_roundtrip_full() {
        let a = sample_audit_log();
        let json = serde_json::to_string(&a).unwrap();
        let de: AuditLog = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, a.id);
        assert_eq!(de.table_name, a.table_name);
        assert_eq!(de.action, a.action);
        assert_eq!(de.old_values, a.old_values);
        assert_eq!(de.new_values, a.new_values);
    }

    #[test]
    fn test_audit_log_serde_roundtrip_none_options() {
        let mut a = sample_audit_log();
        a.old_values = None;
        a.new_values = None;
        a.changed_by = None;
        a.ip_address = None;
        a.user_agent = None;
        let json = serde_json::to_string(&a).unwrap();
        let de: AuditLog = serde_json::from_str(&json).unwrap();
        assert_eq!(de.old_values, None);
        assert_eq!(de.new_values, None);
        assert_eq!(de.changed_by, None);
        assert_eq!(de.ip_address, None);
    }

    #[test]
    fn test_audit_log_clone_equal() {
        let a = sample_audit_log();
        let cloned = a.clone();
        assert_eq!(cloned.id, a.id);
        assert_eq!(cloned.table_name, a.table_name);
        assert_eq!(cloned.action, a.action);
    }

    #[test]
    fn test_audit_log_json_field_names() {
        let a = sample_audit_log();
        let json = serde_json::to_value(&a).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("table_name"));
        assert!(obj.contains_key("record_id"));
        assert!(obj.contains_key("action"));
        assert!(obj.contains_key("old_values"));
        assert!(obj.contains_key("new_values"));
        assert!(obj.contains_key("changed_by"));
        assert!(obj.contains_key("changed_at"));
        assert!(obj.contains_key("ip_address"));
        assert!(obj.contains_key("user_agent"));
    }

    #[test]
    fn test_audit_log_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "table_name": "supplier_contracts",
            "record_id": "00000000-0000-0000-0000-000000000003",
            "action": "DELETE",
            "old_values": null,
            "new_values": null,
            "changed_by": null,
            "changed_at": "2025-03-01T00:00:00Z",
            "ip_address": null,
            "user_agent": null
        }"#;
        let a: AuditLog = serde_json::from_str(json).unwrap();
        assert_eq!(a.table_name, "supplier_contracts");
        assert_eq!(a.action, "DELETE");
        assert!(a.old_values.is_none());
    }

    #[test]
    fn test_audit_log_ignores_unknown_fields() {
        let a = sample_audit_log();
        let mut json = serde_json::to_value(&a).unwrap();
        json["unknown"] = serde_json::json!(1);
        let de: AuditLog = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, a.id);
    }

    #[test]
    fn test_create_audit_log_request_serde_roundtrip() {
        let req = CreateAuditLogRequest {
            table_name: "suppliers".to_string(),
            record_id: "00000000-0000-0000-0000-000000000001".to_string(),
            action: "CREATE".to_string(),
            old_values: None,
            new_values: Some(serde_json::json!({"name": "Created"})),
            ip_address: Some("10.0.0.1".to_string()),
            user_agent: Some("curl/8.0".to_string()),
            tenant_id: Some("00000000-0000-0000-0000-000000000002".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateAuditLogRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.table_name, req.table_name);
        assert_eq!(de.action, req.action);
        assert_eq!(de.new_values, req.new_values);
        assert!(de.old_values.is_none());
    }

    #[test]
    fn test_create_audit_log_request_clone() {
        let req = CreateAuditLogRequest {
            table_name: "t".to_string(),
            record_id: "r".to_string(),
            action: "a".to_string(),
            old_values: None,
            new_values: None,
            ip_address: None,
            user_agent: None,
            tenant_id: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.table_name, req.table_name);
        assert_eq!(cloned.action, req.action);
    }

    #[test]
    fn test_create_audit_log_request_minimal() {
        let json = r#"{
            "table_name": "orders",
            "record_id": "00000000-0000-0000-0000-000000000003",
            "action": "UPDATE"
        }"#;
        let req: CreateAuditLogRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.table_name, "orders");
        assert!(req.new_values.is_none());
        assert!(req.tenant_id.is_none());
    }

    #[test]
    fn test_audit_log_action_variants() {
        let mut a = sample_audit_log();
        for action in ["CREATE", "UPDATE", "DELETE", "READ", "RESTORE"] {
            a.action = action.to_string();
            let json = serde_json::to_string(&a).unwrap();
            let de: AuditLog = serde_json::from_str(&json).unwrap();
            assert_eq!(de.action, action);
        }
    }

    #[test]
    fn test_audit_log_complex_json_values() {
        let mut a = sample_audit_log();
        let old = serde_json::json!({
            "fields": ["name", "status"],
            "before": {"name": "A", "status": "pending"},
            "meta": {"version": 1}
        });
        let new = serde_json::json!({
            "fields": ["name", "status"],
            "after": {"name": "B", "status": "active"},
            "meta": {"version": 2, "user": "admin"}
        });
        a.old_values = Some(old.clone());
        a.new_values = Some(new.clone());
        let json = serde_json::to_string(&a).unwrap();
        let de: AuditLog = serde_json::from_str(&json).unwrap();
        assert_eq!(de.old_values, Some(old));
        assert_eq!(de.new_values, Some(new));
    }

    #[test]
    fn test_audit_log_table_name_variants() {
        let mut a = sample_audit_log();
        for table in [
            "suppliers",
            "supplier_contracts",
            "purchase_orders",
            "audit_logs",
        ] {
            a.table_name = table.to_string();
            let json = serde_json::to_string(&a).unwrap();
            let de: AuditLog = serde_json::from_str(&json).unwrap();
            assert_eq!(de.table_name, table);
        }
    }
}
