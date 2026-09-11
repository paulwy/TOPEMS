//! Shared module for quality-assurance service
//! Contains unified types and utilities

pub mod fsm;
pub mod permission;

#[cfg(test)]
mod fsm_test;

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_quality_standard_default() {
        let s = QualityStandard::default();
        assert_eq!(s.category, "quality");
        assert_eq!(s.level, "national");
        assert_eq!(s.code, "");
        assert_eq!(s.name, "");
        assert!(s.description.is_none());
    }

    #[test]
    fn test_quality_standard_clone_and_debug() {
        let s = QualityStandard::default();
        let s2 = s.clone();
        let d1 = format!("{:?}", s);
        let d2 = format!("{:?}", s2);
        assert_eq!(d1, d2);
        assert!(!d1.is_empty());
    }

    #[test]
    fn test_quality_standard_serde_roundtrip() {
        roundtrip(&QualityStandard::default());
    }

    #[test]
    fn test_quality_standard_with_description() {
        let mut s = QualityStandard::default();
        s.description = Some("test desc".to_string());
        roundtrip(&s);
        assert_eq!(s.description.unwrap(), "test desc");
    }

    #[test]
    fn test_quality_standard_clone_preserves_data() {
        let mut s1 = QualityStandard::default();
        s1.id = "id1".to_string();
        s1.tenant_id = "t1".to_string();
        s1.code = "CODE1".to_string();
        s1.name = "Standard 1".to_string();
        s1.category = "iso".to_string();
        s1.level = "industry".to_string();
        s1.description = Some("descr".to_string());
        let s2 = s1.clone();
        assert_eq!(s1.id, s2.id);
        assert_eq!(s1.tenant_id, s2.tenant_id);
        assert_eq!(s1.code, s2.code);
        assert_eq!(s1.name, s2.name);
        assert_eq!(s1.category, s2.category);
        assert_eq!(s1.level, s2.level);
        assert_eq!(s1.description, s2.description);
    }
}

use axum::extract::FromRef;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}

/// Shared quality standards
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityStandard {
    pub id: String,
    pub tenant_id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
}

impl Default for QualityStandard {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: uuid::Uuid::new_v4().to_string(),
            code: String::new(),
            name: String::new(),
            category: "quality".to_string(),
            level: "national".to_string(),
            description: None,
        }
    }
}
