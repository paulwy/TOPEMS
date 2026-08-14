use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ServiceIntegration {
    pub id: Uuid,
    pub service_name: String,
    pub api_base_url: Option<String>,
    pub api_key: Option<String>,
    pub sync_enabled: Option<bool>,
    pub sync_config: Option<serde_json::Value>,
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

    fn sample_integration() -> ServiceIntegration {
        ServiceIntegration {
            id: uid(),
            service_name: "erp".to_string(),
            api_base_url: Some("https://erp.example.com/api".to_string()),
            api_key: Some("sk-xxx".to_string()),
            sync_enabled: Some(true),
            sync_config: Some(serde_json::json!({"interval": 300, "direction": "bidirectional"})),
            is_active: Some(true),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_service_integration_serde_roundtrip() {
        let s = sample_integration();
        let ser = serde_json::to_string(&s).unwrap();
        let back: ServiceIntegration = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.id, s.id);
        assert_eq!(back.service_name, s.service_name);
        assert_eq!(back.api_base_url, s.api_base_url);
        assert_eq!(back.sync_enabled, s.sync_enabled);
        assert_eq!(back.sync_config, s.sync_config);
        assert_eq!(back.is_active, s.is_active);
    }

    #[test]
    fn test_service_integration_clone_preserves_fields() {
        let s = sample_integration();
        let c = s.clone();
        assert_eq!(c.id, s.id);
        assert_eq!(c.service_name, s.service_name);
        assert_eq!(c.sync_config, s.sync_config);
    }

    #[test]
    fn test_service_integration_with_none_optional() {
        let s = ServiceIntegration {
            id: uid(),
            service_name: "new-svc".to_string(),
            api_base_url: None,
            api_key: None,
            sync_enabled: None,
            sync_config: None,
            is_active: None,
            created_at: now(),
            updated_at: now(),
        };
        let ser = serde_json::to_string(&s).unwrap();
        let back: ServiceIntegration = serde_json::from_str(&ser).unwrap();
        assert!(back.api_base_url.is_none());
        assert!(back.sync_enabled.is_none());
        assert!(back.is_active.is_none());
    }

    #[test]
    fn test_service_integration_inactive_roundtrip() {
        let mut s = sample_integration();
        s.is_active = Some(false);
        s.sync_enabled = Some(false);
        let ser = serde_json::to_string(&s).unwrap();
        let back: ServiceIntegration = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.is_active, Some(false));
        assert_eq!(back.sync_enabled, Some(false));
    }

    #[test]
    fn test_service_integration_complex_sync_config() {
        let mut s = sample_integration();
        s.sync_config = Some(serde_json::json!({
            "mappings": [
                {"source": "field_a", "target": "field_b"},
                {"source": "field_c", "target": "field_d"}
            ],
            "schedule": {"type": "cron", "expression": "0 */6 * * *"},
            "retry": {"max_attempts": 3, "backoff_seconds": 30}
        }));
        let ser = serde_json::to_string(&s).unwrap();
        let back: ServiceIntegration = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.sync_config, s.sync_config);
    }

    #[test]
    fn test_service_integration_null_sync_config() {
        // serde_json deserializes JSON null as None for Option<Value>,
        // so Some(Value::Null) does not survive a roundtrip (becomes None).
        let mut s = sample_integration();
        s.sync_config = Some(serde_json::Value::Null);
        let ser = serde_json::to_string(&s).unwrap();
        let back: ServiceIntegration = serde_json::from_str(&ser).unwrap();
        assert!(back.sync_config.is_none());
    }

    #[test]
    fn test_service_integration_minimal_service_name() {
        let s = ServiceIntegration {
            id: uid(),
            service_name: "x".to_string(),
            api_base_url: None,
            api_key: None,
            sync_enabled: None,
            sync_config: None,
            is_active: Some(true),
            created_at: now(),
            updated_at: now(),
        };
        let ser = serde_json::to_string(&s).unwrap();
        let back: ServiceIntegration = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.service_name, "x");
        assert_eq!(back.is_active, Some(true));
    }
}
