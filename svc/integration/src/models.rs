#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

use axum::extract::FromRef;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared_auth::auth::AuthState;

use crate::mes_erp_sync::MesErpSyncService;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct IntegrationEvent {
    pub id: Uuid,
    pub source_system: String,
    pub target_system: String,
    pub event_type: String,
    pub source_record_id: Option<Uuid>,
    pub target_record_id: Option<Uuid>,
    pub payload: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIntegrationEventRequest {
    pub source_system: String,
    pub target_system: String,
    pub event_type: String,
    pub source_record_id: Option<String>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LimsQmsSync {
    pub id: Uuid,
    pub lims_sample_id: Uuid,
    pub qms_inspection_id: Option<Uuid>,
    pub sample_name: String,
    pub inspection_result: Option<String>,
    pub inspection_notes: Option<String>,
    pub synced: bool,
    pub sync_status: String,
    pub sync_error: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLimsQmsSyncRequest {
    pub lims_sample_id: String,
    pub sample_name: String,
    pub inspection_result: Option<String>,
    pub inspection_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MesErpSync {
    pub id: Uuid,
    pub mes_order_id: Uuid,
    pub erp_order_id: Option<Uuid>,
    pub order_number: String,
    pub product_name: Option<String>,
    pub quantity: Option<f64>,
    pub synced: bool,
    pub sync_status: String,
    pub sync_error: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMesErpSyncRequest {
    pub mes_order_id: String,
    pub order_number: String,
    pub product_name: Option<String>,
    pub quantity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WmsScmSync {
    pub id: Uuid,
    pub wms_inventory_id: Uuid,
    pub scm_supply_id: Option<Uuid>,
    pub item_name: String,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub synced: bool,
    pub sync_status: String,
    pub sync_error: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWmsScmSyncRequest {
    pub wms_inventory_id: String,
    pub item_name: String,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStats {
    pub lims_qms_total: i64,
    pub lims_qms_synced: i64,
    pub lims_qms_failed: i64,
    pub mes_erp_total: i64,
    pub mes_erp_synced: i64,
    pub mes_erp_failed: i64,
    pub wms_scm_total: i64,
    pub wms_scm_synced: i64,
    pub wms_scm_failed: i64,
    pub last_sync: Option<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub lims_url: String,
    pub qms_url: String,
    pub mes_url: String,
    pub erp_url: String,
    pub wms_url: String,
    pub scm_url: String,
    pub auth_state: AuthState,
    pub mes_erp_sync_service: std::sync::Arc<MesErpSyncService>,
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

// ===== ERP 连接模型（缺口#11） =====

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ErpConnection {
    pub id: Uuid,
    pub tenant_id: String,
    pub name: String,
    pub r#type: String,
    pub api_url: String,
    pub api_version: Option<String>,
    pub app_key: Option<String>,
    pub app_secret: Option<String>,
    pub sync_direction: String,
    pub sync_mode: String,
    pub sync_interval: Option<i32>,
    pub status: String,
    pub isactive: bool,
    pub last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateErpConnectionRequest {
    pub name: String,
    pub r#type: Option<String>,
    pub api_url: String,
    pub api_version: Option<String>,
    pub app_key: Option<String>,
    pub app_secret: Option<String>,
    pub sync_direction: Option<String>,
    pub sync_mode: Option<String>,
    pub sync_interval: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateErpConnectionRequest {
    pub name: Option<String>,
    pub api_url: Option<String>,
    pub api_version: Option<String>,
    pub app_key: Option<String>,
    pub app_secret: Option<String>,
    pub sync_direction: Option<String>,
    pub sync_mode: Option<String>,
    pub sync_interval: Option<i32>,
    pub isactive: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TestConnectionRequest {
    pub api_url: String,
    pub app_key: Option<String>,
    pub app_secret: Option<String>,
    pub timeout: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub response_time_ms: u64,
    pub error_message: Option<String>,
}

// ===== ERP 字段映射模型（缺口#12） =====

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ErpMapping {
    pub id: Uuid,
    pub tenant_id: String,
    pub connection_id: Option<Uuid>,
    pub mapping_type: String,
    pub local_id: Option<String>,
    pub local_code: Option<String>,
    pub local_name: Option<String>,
    pub external_code: Option<String>,
    pub external_name: Option<String>,
    pub direction: String,
    pub isactive: bool,
    pub priority: i32,
    pub condition: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateErpMappingRequest {
    pub connection_id: Option<Uuid>,
    pub mapping_type: String,
    pub local_id: Option<String>,
    pub local_code: Option<String>,
    pub local_name: Option<String>,
    pub external_code: Option<String>,
    pub external_name: Option<String>,
    pub direction: Option<String>,
    pub priority: Option<i32>,
    pub condition: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateErpMappingRequest {
    pub connection_id: Option<Uuid>,
    pub local_id: Option<String>,
    pub local_code: Option<String>,
    pub local_name: Option<String>,
    pub external_code: Option<String>,
    pub external_name: Option<String>,
    pub direction: Option<String>,
    pub isactive: Option<bool>,
    pub priority: Option<i32>,
    pub condition: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- IntegrationEvent serde roundtrip (2 tests) ----

    #[test]
    fn test_integration_event_serde_roundtrip_full() {
        let event = IntegrationEvent {
            id: Uuid::new_v4(),
            source_system: "erp".to_string(),
            target_system: "mes".to_string(),
            event_type: "sales_order_created".to_string(),
            source_record_id: Some(Uuid::new_v4()),
            target_record_id: Some(Uuid::new_v4()),
            payload: Some(serde_json::json!({"amount": 100})),
            status: "pending".to_string(),
            error_message: None,
            synced_at: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&event).expect("serialize IntegrationEvent");
        let back: IntegrationEvent =
            serde_json::from_str(&json).expect("deserialize IntegrationEvent");
        assert_eq!(back.id, event.id);
        assert_eq!(back.source_system, "erp");
        assert_eq!(back.target_system, "mes");
        assert_eq!(back.event_type, "sales_order_created");
        assert_eq!(back.status, "pending");
        assert!(back.error_message.is_none());
    }

    #[test]
    fn test_integration_event_serde_roundtrip_with_error() {
        let event = IntegrationEvent {
            id: Uuid::new_v4(),
            source_system: "wms".to_string(),
            target_system: "scm".to_string(),
            event_type: "inventory_adjusted".to_string(),
            source_record_id: None,
            target_record_id: None,
            payload: None,
            status: "failed".to_string(),
            error_message: Some("connection timeout".to_string()),
            synced_at: Some(Utc::now()),
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&event).expect("serialize IntegrationEvent");
        let back: IntegrationEvent =
            serde_json::from_str(&json).expect("deserialize IntegrationEvent");
        assert_eq!(back.status, "failed");
        assert_eq!(back.error_message, Some("connection timeout".to_string()));
        assert!(back.payload.is_none());
        assert!(back.synced_at.is_some());
    }

    // ---- LimsQmsSync serde roundtrip (1 test) ----

    #[test]
    fn test_lims_qms_sync_serde_roundtrip() {
        let record = LimsQmsSync {
            id: Uuid::new_v4(),
            lims_sample_id: Uuid::new_v4(),
            qms_inspection_id: Some(Uuid::new_v4()),
            sample_name: "Sample A".to_string(),
            inspection_result: Some("PASS".to_string()),
            inspection_notes: Some("All good".to_string()),
            synced: true,
            sync_status: "completed".to_string(),
            sync_error: None,
            last_synced_at: Some(Utc::now()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&record).expect("serialize LimsQmsSync");
        let back: LimsQmsSync = serde_json::from_str(&json).expect("deserialize LimsQmsSync");
        assert_eq!(back.id, record.id);
        assert_eq!(back.sample_name, "Sample A");
        assert_eq!(back.inspection_result, Some("PASS".to_string()));
        assert!(back.synced);
        assert_eq!(back.sync_status, "completed");
    }

    // ---- MesErpSync serde roundtrip (2 tests) ----

    #[test]
    fn test_mes_erp_sync_serde_roundtrip_with_quantity() {
        let record = MesErpSync {
            id: Uuid::new_v4(),
            mes_order_id: Uuid::new_v4(),
            erp_order_id: Some(Uuid::new_v4()),
            order_number: "WO-001".to_string(),
            product_name: Some("Widget".to_string()),
            quantity: Some(100.5),
            synced: false,
            sync_status: "pending".to_string(),
            sync_error: None,
            last_synced_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&record).expect("serialize MesErpSync");
        let back: MesErpSync = serde_json::from_str(&json).expect("deserialize MesErpSync");
        assert_eq!(back.order_number, "WO-001");
        assert_eq!(back.product_name, Some("Widget".to_string()));
        assert_eq!(back.quantity, Some(100.5));
        assert!(!back.synced);
        assert_eq!(back.sync_status, "pending");
    }

    #[test]
    fn test_mes_erp_sync_serde_roundtrip_failed_with_error() {
        let record = MesErpSync {
            id: Uuid::new_v4(),
            mes_order_id: Uuid::new_v4(),
            erp_order_id: None,
            order_number: "WO-002".to_string(),
            product_name: None,
            quantity: None,
            synced: false,
            sync_status: "failed".to_string(),
            sync_error: Some("erp unreachable".to_string()),
            last_synced_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&record).expect("serialize MesErpSync");
        let back: MesErpSync = serde_json::from_str(&json).expect("deserialize MesErpSync");
        assert_eq!(back.order_number, "WO-002");
        assert_eq!(back.sync_status, "failed");
        assert_eq!(back.sync_error, Some("erp unreachable".to_string()));
        assert!(back.erp_order_id.is_none());
        assert!(back.quantity.is_none());
    }

    // ---- WmsScmSync serde roundtrip (1 test) ----

    #[test]
    fn test_wms_scm_sync_serde_roundtrip() {
        let record = WmsScmSync {
            id: Uuid::new_v4(),
            wms_inventory_id: Uuid::new_v4(),
            scm_supply_id: Some(Uuid::new_v4()),
            item_name: "Bolt".to_string(),
            quantity: Some(500.0),
            unit: Some("pcs".to_string()),
            synced: true,
            sync_status: "completed".to_string(),
            sync_error: None,
            last_synced_at: Some(Utc::now()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&record).expect("serialize WmsScmSync");
        let back: WmsScmSync = serde_json::from_str(&json).expect("deserialize WmsScmSync");
        assert_eq!(back.item_name, "Bolt");
        assert_eq!(back.quantity, Some(500.0));
        assert_eq!(back.unit, Some("pcs".to_string()));
        assert!(back.synced);
        assert_eq!(back.sync_status, "completed");
    }

    // ---- SyncStats serde roundtrip (2 tests) ----

    #[test]
    fn test_sync_stats_serde_roundtrip_with_last_sync() {
        let stats = SyncStats {
            lims_qms_total: 10,
            lims_qms_synced: 9,
            lims_qms_failed: 1,
            mes_erp_total: 20,
            mes_erp_synced: 18,
            mes_erp_failed: 2,
            wms_scm_total: 5,
            wms_scm_synced: 5,
            wms_scm_failed: 0,
            last_sync: Some(Utc::now()),
        };
        let json = serde_json::to_string(&stats).expect("serialize SyncStats");
        let back: SyncStats = serde_json::from_str(&json).expect("deserialize SyncStats");
        assert_eq!(back.lims_qms_total, 10);
        assert_eq!(back.mes_erp_synced, 18);
        assert_eq!(back.wms_scm_failed, 0);
        assert!(back.last_sync.is_some());
    }

    #[test]
    fn test_sync_stats_serde_roundtrip_no_last_sync() {
        let stats = SyncStats {
            lims_qms_total: 0,
            lims_qms_synced: 0,
            lims_qms_failed: 0,
            mes_erp_total: 0,
            mes_erp_synced: 0,
            mes_erp_failed: 0,
            wms_scm_total: 0,
            wms_scm_synced: 0,
            wms_scm_failed: 0,
            last_sync: None,
        };
        let json = serde_json::to_string(&stats).expect("serialize SyncStats");
        let back: SyncStats = serde_json::from_str(&json).expect("deserialize SyncStats");
        assert_eq!(back.lims_qms_total, 0);
        assert_eq!(back.mes_erp_total, 0);
        assert_eq!(back.wms_scm_total, 0);
        assert!(back.last_sync.is_none());
    }

    // ---- Create request structs serde roundtrip (2 tests) ----

    #[test]
    fn test_create_lims_qms_sync_request_serde_roundtrip() {
        let req = CreateLimsQmsSyncRequest {
            lims_sample_id: "sample-123".to_string(),
            sample_name: "Sample X".to_string(),
            inspection_result: Some("PASS".to_string()),
            inspection_notes: None,
        };
        let json = serde_json::to_string(&req).expect("serialize CreateLimsQmsSyncRequest");
        let back: CreateLimsQmsSyncRequest =
            serde_json::from_str(&json).expect("deserialize CreateLimsQmsSyncRequest");
        assert_eq!(back.lims_sample_id, "sample-123");
        assert_eq!(back.sample_name, "Sample X");
        assert_eq!(back.inspection_result, Some("PASS".to_string()));
        assert!(back.inspection_notes.is_none());
    }

    #[test]
    fn test_create_mes_erp_sync_request_serde_roundtrip() {
        let req = CreateMesErpSyncRequest {
            mes_order_id: "order-456".to_string(),
            order_number: "WO-999".to_string(),
            product_name: Some("Gear".to_string()),
            quantity: Some(42.0),
        };
        let json = serde_json::to_string(&req).expect("serialize CreateMesErpSyncRequest");
        let back: CreateMesErpSyncRequest =
            serde_json::from_str(&json).expect("deserialize CreateMesErpSyncRequest");
        assert_eq!(back.mes_order_id, "order-456");
        assert_eq!(back.order_number, "WO-999");
        assert_eq!(back.product_name, Some("Gear".to_string()));
        assert_eq!(back.quantity, Some(42.0));
    }
}
