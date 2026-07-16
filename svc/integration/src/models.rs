use axum::extract::FromRef;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::AuthState;

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

pub fn get_tenant_id(claims: &topems_shared::auth::Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}
