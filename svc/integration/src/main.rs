#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(dead_code)]

use axum::{
    extract::{Extension, FromRef, Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use std::env;
use uuid::Uuid;

use topems_shared::{
    auth_middleware, build_health_response, create_cors_layer, init_telemetry, rls_middleware,
    telemetry_middleware, ApiResponse, AuthState, ServiceHealth,
};

mod conversion_rules;
mod event_bus;
mod mes_erp_sync;
mod mes_qms_integration;
mod plugin;
mod qms_lims_ehs;
mod retry_handler;
mod rule_engine;
mod sync_retry;

fn get_tenant_id(claims: &topems_shared::auth::Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}

use conversion_rules::{
    get_rule_executions, init_conversion_rules_table, insert_conversion_rule,
    list_conversion_rules, ConversionExecution, ConversionRule, CreateConversionRuleRequest,
    ExecuteConversionRequest, ExecuteConversionResponse, RuleStatus, TriggerType,
    UpdateConversionRuleRequest,
};

use mes_erp_sync::MesErpSyncService;

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
struct AppState {
    pool: PgPool,
    lims_url: String,
    qms_url: String,
    mes_url: String,
    erp_url: String,
    wms_url: String,
    scm_url: String,
    auth_state: AuthState,
    mes_erp_sync_service: std::sync::Arc<MesErpSyncService>,
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

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-integration");

    tracing::info!("🚀 TOPEMS Integration Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        env::var("DATABASE_URL")
            .expect("DATABASE_URL environment variable is required")
            .to_string()
    });

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ Connected to PostgreSQL database");
            if let Err(e) = init_database(&pool).await {
                tracing::warn!("⚠️ Database initialization warning: {}", e);
            }
            pool
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to PostgreSQL: {}", e);
            panic!("Failed to connect to database");
        }
    };

    let lims_url = std::env::var("QUALITY_ASSURANCE_URL")
        .unwrap_or_else(|_| "http://localhost:8052".to_string());
    let qms_url = std::env::var("QUALITY_ASSURANCE_URL")
        .unwrap_or_else(|_| "http://localhost:8052".to_string());
    let mes_url = std::env::var("MES_URL").unwrap_or_else(|_| "http://localhost:8030".to_string());
    let erp_url = std::env::var("ERP_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());
    let wms_url = std::env::var("WMS_URL").unwrap_or_else(|_| "http://localhost:8042".to_string());
    let scm_url = std::env::var("SCM_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let app_state = AppState {
        pool: pool.clone(),
        lims_url,
        qms_url,
        mes_url: mes_url.clone(),
        erp_url: erp_url.clone(),
        wms_url,
        scm_url,
        auth_state: AuthState::from_env(),
        mes_erp_sync_service: std::sync::Arc::new(MesErpSyncService::new(pool, mes_url, erp_url)),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/api/integration/stats", get(get_sync_stats))
        .route("/api/integration/events", get(list_events))
        .route("/api/integration/events", post(create_event))
        .route("/api/integration/lims-qms", get(list_lims_qms_sync))
        .route("/api/integration/lims-qms", post(create_lims_qms_sync))
        .route("/api/integration/lims-qms/{id}", get(get_lims_qms_sync))
        .route("/api/integration/lims-qms/{id}/sync", post(sync_lims_qms))
        .route("/api/integration/mes-erp", get(list_mes_erp_sync))
        .route("/api/integration/mes-erp", post(create_mes_erp_sync))
        .route("/api/integration/mes-erp/{id}", get(get_mes_erp_sync))
        .route("/api/integration/mes-erp/{id}/sync", post(sync_mes_erp))
        .route(
            "/api/integration/mes-erp/sync/erp-to-mes",
            post(sync_erp_order_to_mes),
        )
        .route(
            "/api/integration/mes-erp/sync/mes-to-erp",
            post(sync_mes_progress_to_erp),
        )
        .route(
            "/api/integration/mes-erp/{id}/retry",
            post(retry_mes_erp_sync),
        )
        .route(
            "/api/integration/mes-erp/{id}/logs",
            get(get_mes_erp_sync_logs),
        )
        .route(
            "/api/integration/mes-erp/records",
            get(list_mes_erp_sync_records),
        )
        .route("/api/integration/wms-scm", get(list_wms_scm_sync))
        .route("/api/integration/wms-scm", post(create_wms_scm_sync))
        .route("/api/integration/wms-scm/{id}", get(get_wms_scm_sync))
        .route("/api/integration/wms-scm/{id}/sync", post(sync_wms_scm))
        // MES↔QMS 质检数据集成 API
        .route("/api/integration/mes-qms", get(list_mes_qms_sync_api))
        .route("/api/integration/mes-qms/{id}", get(get_mes_qms_sync_api))
        .route("/api/integration/mes-qms/stats", get(get_mes_qms_stats_api))
        .route(
            "/api/integration/mes-qms/trigger-inspection",
            post(trigger_qms_inspection_api),
        )
        .route(
            "/api/integration/mes-qms/sync-result",
            post(sync_quality_result_api),
        )
        .route(
            "/api/integration/mes-qms/sync-trace",
            post(sync_trace_chain_api),
        )
        .route(
            "/api/integration/mes-qms/defect-handling",
            post(defect_handling_api),
        )
        .route(
            "/api/integration/mes-qms/{id}/retry",
            post(retry_mes_qms_sync_api),
        )
        // 转换规则 API
        .route("/api/integration/rules", get(list_conversion_rules_api))
        .route("/api/integration/rules", post(create_conversion_rule_api))
        .route("/api/integration/rules/{id}", get(get_conversion_rule_api))
        .route(
            "/api/integration/rules/{id}",
            put(update_conversion_rule_api),
        )
        .route(
            "/api/integration/rules/{id}",
            delete(delete_conversion_rule_api),
        )
        .route(
            "/api/integration/rules/{id}/executions",
            get(get_rule_executions_api),
        )
        .route(
            "/api/integration/rules/{id}/execute",
            post(execute_conversion_rule_api),
        )
        .route(
            "/api/integration/rules/{id}/enable",
            post(enable_conversion_rule_api),
        )
        .route(
            "/api/integration/rules/{id}/disable",
            post(disable_conversion_rule_api),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ))
        .with_state(app_state);

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors);

    let port = std::env::var("INTEGRATION_PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8072".to_string())
        .parse()
        .unwrap_or(8072);
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!(
        "✅ TOPEMS Integration Service is running at http://{}",
        addr
    );
    tracing::info!("🔒 Authentication protection enabled");

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS Integration Service API\n\nSystems: LIMS↔QMS, MES↔ERP, WMS↔SCM, MES↔QMS\n\nCheck /health for service status"
}

async fn health() -> ServiceHealth {
    build_health_response("topems-integration", true)
}

async fn check_service_health(url: &str) -> bool {
    let client = reqwest::Client::new();
    match client
        .get(format!("{}/health", url))
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    }
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    init_conversion_rules_table(pool).await?;
    mes_qms_integration::init_mes_qms_tables(pool).await?;
    Ok(())
}

async fn get_sync_stats(State(state): State<AppState>) -> Json<ApiResponse<SyncStats>> {
    let lims_qms_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM lims_qms_sync",
    )
    .fetch_one(&state.pool)
    .await;

    let (lims_qms_total, lims_qms_synced, lims_qms_failed) = match lims_qms_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let mes_erp_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM mes_erp_sync",
    )
    .fetch_one(&state.pool)
    .await;

    let (mes_erp_total, mes_erp_synced, mes_erp_failed) = match mes_erp_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let wms_scm_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM wms_scm_sync",
    )
    .fetch_one(&state.pool)
    .await;

    let (wms_scm_total, wms_scm_synced, wms_scm_failed) = match wms_scm_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let last_sync_result = sqlx::query(
        "SELECT MAX(last_synced_at) as last_sync FROM (
            SELECT MAX(last_synced_at) as last_synced_at FROM lims_qms_sync
            UNION ALL
            SELECT MAX(last_synced_at) as last_synced_at FROM mes_erp_sync
            UNION ALL
            SELECT MAX(last_synced_at) as last_synced_at FROM wms_scm_sync
        ) t",
    )
    .fetch_one(&state.pool)
    .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    let stats = SyncStats {
        lims_qms_total,
        lims_qms_synced,
        lims_qms_failed,
        mes_erp_total,
        mes_erp_synced,
        mes_erp_failed,
        wms_scm_total,
        wms_scm_synced,
        wms_scm_failed,
        last_sync,
    };

    Json(ApiResponse::success(
        stats,
        "Sync stats retrieved successfully",
    ))
}

async fn list_events(State(state): State<AppState>) -> Json<ApiResponse<Vec<IntegrationEvent>>> {
    match sqlx::query_as::<_, IntegrationEvent>(
        "SELECT id, source_system, target_system, event_type, source_record_id, 
                target_record_id, payload, status, error_message, synced_at, created_at
           FROM integration_events ORDER BY created_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(events) => Json(ApiResponse::success(
            events,
            "Events retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch events: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch events: {}", e),
            ))
        }
    }
}

async fn create_event(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationEventRequest>,
) -> Json<ApiResponse<IntegrationEvent>> {
    let id = Uuid::new_v4();
    let source_uuid = req.source_record_id.and_then(|s| Uuid::parse_str(&s).ok());

    match sqlx::query_as::<_, IntegrationEvent>(
        "INSERT INTO integration_events (
            id, source_system, target_system, event_type, source_record_id, payload
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, source_system, target_system, event_type, source_record_id, 
                  target_record_id, payload, status, error_message, synced_at, created_at",
    )
    .bind(id)
    .bind(req.source_system)
    .bind(req.target_system)
    .bind(req.event_type)
    .bind(source_uuid)
    .bind(req.payload)
    .fetch_one(&state.pool)
    .await
    {
        Ok(event) => Json(ApiResponse::success(event, "Event created successfully")),
        Err(e) => {
            tracing::error!("Failed to create event: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create event: {}", e),
            ))
        }
    }
}

async fn list_lims_qms_sync(State(state): State<AppState>) -> Json<ApiResponse<Vec<LimsQmsSync>>> {
    match sqlx::query_as::<_, LimsQmsSync>(
        "SELECT id, lims_sample_id, qms_inspection_id, sample_name, inspection_result, 
                inspection_notes, synced, sync_status, sync_error, last_synced_at, 
                created_at, updated_at
           FROM lims_qms_sync ORDER BY updated_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "LIMS↔QMS syncs retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch LIMS↔QMS syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch LIMS↔QMS syncs: {}", e),
            ))
        }
    }
}

async fn create_lims_qms_sync(
    State(state): State<AppState>,
    Json(req): Json<CreateLimsQmsSyncRequest>,
) -> Json<ApiResponse<LimsQmsSync>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let lims_uuid = match Uuid::parse_str(&req.lims_sample_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid LIMS sample ID: {}", e),
            ))
        }
    };

    match sqlx::query_as::<_, LimsQmsSync>(
        "INSERT INTO lims_qms_sync (
            id, lims_sample_id, sample_name, inspection_result, inspection_notes, 
            synced, sync_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, lims_sample_id, qms_inspection_id, sample_name, inspection_result, 
                  inspection_notes, synced, sync_status, sync_error, last_synced_at, 
                  created_at, updated_at",
    )
    .bind(id)
    .bind(lims_uuid)
    .bind(req.sample_name)
    .bind(req.inspection_result)
    .bind(req.inspection_notes)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "LIMS↔QMS sync created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create LIMS↔QMS sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create LIMS↔QMS sync: {}", e),
            ))
        }
    }
}

async fn get_lims_qms_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LimsQmsSync>> {
    match sqlx::query_as::<_, LimsQmsSync>(
        "SELECT id, lims_sample_id, qms_inspection_id, sample_name, inspection_result, 
                inspection_notes, synced, sync_status, sync_error, last_synced_at, 
                created_at, updated_at
           FROM lims_qms_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(sync, "LIMS↔QMS sync found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch sync: {}", e),
            ))
        }
    }
}

async fn sync_lims_qms(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LimsQmsSync>> {
    let now = Utc::now();

    // Check if sync exists
    let _exists = match sqlx::query_as::<_, LimsQmsSync>(
        "SELECT id, lims_sample_id, qms_inspection_id, sample_name, inspection_result, 
                inspection_notes, synced, sync_status, sync_error, last_synced_at, 
                created_at, updated_at
           FROM lims_qms_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(sqlx::Error::RowNotFound) => return Json(ApiResponse::error(404, "Sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            return Json(ApiResponse::error(
                500,
                &format!("Failed to fetch sync: {}", e),
            ));
        }
    };

    let qms_inspection_id = Uuid::new_v4();
    let updated_sync = match sqlx::query_as::<_, LimsQmsSync>(
        "UPDATE lims_qms_sync SET 
            qms_inspection_id = $2, synced = $3, sync_status = $4, 
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1
         RETURNING id, lims_sample_id, qms_inspection_id, sample_name, inspection_result, 
                  inspection_notes, synced, sync_status, sync_error, last_synced_at, 
                  created_at, updated_at",
    )
    .bind(id)
    .bind(Some(qms_inspection_id))
    .bind(true)
    .bind("synced")
    .bind(Some(now))
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to update sync: {}", e);
            return Json(ApiResponse::error(
                500,
                &format!("Failed to update sync: {}", e),
            ));
        }
    };

    Json(ApiResponse::success(
        updated_sync,
        "LIMS↔QMS sync completed successfully",
    ))
}

async fn list_mes_erp_sync(State(state): State<AppState>) -> Json<ApiResponse<Vec<MesErpSync>>> {
    match sqlx::query_as::<_, MesErpSync>(
        "SELECT id, mes_order_id, erp_order_id, order_number, product_name, quantity, 
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM mes_erp_sync ORDER BY updated_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "MES↔ERP syncs retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔ERP syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔ERP syncs: {}", e),
            ))
        }
    }
}

async fn create_mes_erp_sync(
    State(state): State<AppState>,
    Json(req): Json<CreateMesErpSyncRequest>,
) -> Json<ApiResponse<MesErpSync>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let mes_uuid = match Uuid::parse_str(&req.mes_order_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid MES order ID: {}", e),
            ))
        }
    };

    match sqlx::query_as::<_, MesErpSync>(
        "INSERT INTO mes_erp_sync (
            id, mes_order_id, order_number, product_name, quantity, 
            synced, sync_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, mes_order_id, erp_order_id, order_number, product_name, quantity, 
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(mes_uuid)
    .bind(req.order_number)
    .bind(req.product_name)
    .bind(req.quantity)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "MES↔ERP sync created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create MES↔ERP sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create MES↔ERP sync: {}", e),
            ))
        }
    }
}

async fn get_mes_erp_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MesErpSync>> {
    match sqlx::query_as::<_, MesErpSync>(
        "SELECT id, mes_order_id, erp_order_id, order_number, product_name, quantity, 
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM mes_erp_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(sync, "MES↔ERP sync found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch sync: {}", e),
            ))
        }
    }
}

async fn sync_mes_erp(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MesErpSync>> {
    let now = Utc::now();
    let erp_order_id = Uuid::new_v4();

    let updated_sync = match sqlx::query_as::<_, MesErpSync>(
        "UPDATE mes_erp_sync SET 
            erp_order_id = $2, synced = $3, sync_status = $4, 
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1
         RETURNING id, mes_order_id, erp_order_id, order_number, product_name, quantity, 
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(Some(erp_order_id))
    .bind(true)
    .bind("synced")
    .bind(Some(now))
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to update sync: {}", e);
            return Json(ApiResponse::error(
                500,
                &format!("Failed to update sync: {}", e),
            ));
        }
    };

    Json(ApiResponse::success(
        updated_sync,
        "MES↔ERP sync completed successfully",
    ))
}

async fn list_wms_scm_sync(State(state): State<AppState>) -> Json<ApiResponse<Vec<WmsScmSync>>> {
    match sqlx::query_as::<_, WmsScmSync>(
        "SELECT id, wms_inventory_id, scm_supply_id, item_name, quantity, unit, 
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM wms_scm_sync ORDER BY updated_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "WMS↔SCM syncs retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch WMS↔SCM syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch WMS↔SCM syncs: {}", e),
            ))
        }
    }
}

async fn create_wms_scm_sync(
    State(state): State<AppState>,
    Json(req): Json<CreateWmsScmSyncRequest>,
) -> Json<ApiResponse<WmsScmSync>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let wms_uuid = match Uuid::parse_str(&req.wms_inventory_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid WMS inventory ID: {}", e),
            ))
        }
    };

    match sqlx::query_as::<_, WmsScmSync>(
        "INSERT INTO wms_scm_sync (
            id, wms_inventory_id, item_name, quantity, unit, 
            synced, sync_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, wms_inventory_id, scm_supply_id, item_name, quantity, unit, 
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(wms_uuid)
    .bind(req.item_name)
    .bind(req.quantity)
    .bind(req.unit)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "WMS↔SCM sync created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create WMS↔SCM sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create WMS↔SCM sync: {}", e),
            ))
        }
    }
}

async fn get_wms_scm_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WmsScmSync>> {
    match sqlx::query_as::<_, WmsScmSync>(
        "SELECT id, wms_inventory_id, scm_supply_id, item_name, quantity, unit, 
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM wms_scm_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(sync, "WMS↔SCM sync found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch sync: {}", e),
            ))
        }
    }
}

async fn sync_wms_scm(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WmsScmSync>> {
    let now = Utc::now();
    let scm_supply_id = Uuid::new_v4();

    let updated_sync = match sqlx::query_as::<_, WmsScmSync>(
        "UPDATE wms_scm_sync SET 
            scm_supply_id = $2, synced = $3, sync_status = $4, 
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1
         RETURNING id, wms_inventory_id, scm_supply_id, item_name, quantity, unit, 
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(Some(scm_supply_id))
    .bind(true)
    .bind("synced")
    .bind(Some(now))
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to update sync: {}", e);
            return Json(ApiResponse::error(
                500,
                &format!("Failed to update sync: {}", e),
            ));
        }
    };

    Json(ApiResponse::success(
        updated_sync,
        "WMS↔SCM sync completed successfully",
    ))
}

// ==================== Conversion Rules API ====================

async fn list_conversion_rules_api(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ConversionRule>>> {
    match list_conversion_rules(&state.pool).await {
        Ok(rules) => Json(ApiResponse::success(
            rules,
            "Conversion rules retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch conversion rules: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch conversion rules: {}", e),
            ))
        }
    }
}

async fn get_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ConversionRule>> {
    match sqlx::query_as::<_, ConversionRule>("SELECT * FROM conversion_rules WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "Conversion rule found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to fetch conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch conversion rule: {}", e),
            ))
        }
    }
}

async fn create_conversion_rule_api(
    State(state): State<AppState>,
    Json(req): Json<CreateConversionRuleRequest>,
) -> Json<ApiResponse<ConversionRule>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let rule = ConversionRule {
        id,
        tenant_id: req.tenant_id,
        code: req.code,
        name: req.name,
        description: req.description,
        source_system: req.source_system,
        source_entity: req.source_entity,
        target_system: req.target_system,
        target_entity: req.target_entity,
        trigger_type: req.trigger_type,
        trigger_condition: req.trigger_condition,
        field_mappings: serde_json::to_value(&req.field_mappings)
            .unwrap_or(serde_json::Value::Array(vec![])),
        transform_script: req.transform_script,
        status: RuleStatus::Draft,
        priority: req.priority.unwrap_or(100),
        is_enabled: false,
        max_retries: req.max_retries.unwrap_or(3),
        retry_interval_secs: req.retry_interval_secs.unwrap_or(60),
        stop_on_failure: req.stop_on_failure.unwrap_or(false),
        created_at: now,
        updated_at: now,
    };

    match insert_conversion_rule(&state.pool, &rule).await {
        Ok(_) => Json(ApiResponse::success(
            rule,
            "Conversion rule created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create conversion rule: {}", e),
            ))
        }
    }
}

async fn update_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateConversionRuleRequest>,
) -> Json<ApiResponse<ConversionRule>> {
    let now = Utc::now();

    let row = sqlx::query(
        "UPDATE conversion_rules SET name = COALESCE($1, name), description = COALESCE($2, description), trigger_type = COALESCE($3, trigger_type), trigger_condition = COALESCE($4, trigger_condition), field_mappings = COALESCE($5, field_mappings), transform_script = COALESCE($6, transform_script), status = COALESCE($7, status), priority = COALESCE($8, priority), is_enabled = COALESCE($9, is_enabled), max_retries = COALESCE($10, max_retries), retry_interval_secs = COALESCE($11, retry_interval_secs), stop_on_failure = COALESCE($12, stop_on_failure), updated_at = $13 WHERE id = $14 RETURNING id, code, name, description, source_system, source_entity, target_system, target_entity, trigger_type, trigger_condition, field_mappings, transform_script, status, priority, is_enabled, max_retries, retry_interval_secs, stop_on_failure, created_at::TEXT, updated_at::TEXT"
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.trigger_type.as_ref().map(|v| v.as_str().to_string()))
    .bind(&req.trigger_condition)
    .bind(req.field_mappings.as_ref().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Array(vec![]))))
    .bind(&req.transform_script)
    .bind(req.status.as_ref().map(|v| v.as_str().to_string()))
    .bind(req.priority)
    .bind(req.is_enabled)
    .bind(req.max_retries)
    .bind(req.retry_interval_secs)
    .bind(req.stop_on_failure)
    .bind(now)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ConversionRule {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                code: r.get("code"),
                name: r.get("name"),
                description: r.get("description"),
                source_system: r.get("source_system"),
                source_entity: r.get("source_entity"),
                target_system: r.get("target_system"),
                target_entity: r.get("target_entity"),
                trigger_type: TriggerType::from_str(r.get::<String, _>("trigger_type").as_str()),
                trigger_condition: r.get("trigger_condition"),
                field_mappings: r.get("field_mappings"),
                transform_script: r.get("transform_script"),
                status: RuleStatus::from_str(r.get::<String, _>("status").as_str()),
                priority: r.get("priority"),
                is_enabled: r.get("is_enabled"),
                max_retries: r.get("max_retries"),
                retry_interval_secs: r.get("retry_interval_secs"),
                stop_on_failure: r.get("stop_on_failure"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "Conversion rule updated successfully",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to update conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to update conversion rule: {}", e),
            ))
        }
    }
}

async fn delete_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM conversion_rules WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "Conversion rule not found"))
            } else {
                Json(ApiResponse::success(
                    (),
                    "Conversion rule deleted successfully",
                ))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to delete conversion rule: {}", e),
            ))
        }
    }
}

async fn get_rule_executions_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ConversionExecution>>> {
    match get_rule_executions(&state.pool, id, 100).await {
        Ok(executions) => Json(ApiResponse::success(
            executions,
            "Rule executions retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch rule executions: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch rule executions: {}", e),
            ))
        }
    }
}

async fn execute_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ExecuteConversionRequest>,
) -> Json<ApiResponse<ExecuteConversionResponse>> {
    let rule =
        match sqlx::query_as::<_, ConversionRule>("SELECT * FROM conversion_rules WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(r) => r,
            Err(sqlx::Error::RowNotFound) => {
                return Json(ApiResponse::error(404, "Conversion rule not found"))
            }
            Err(e) => {
                tracing::error!("Failed to fetch rule: {}", e);
                return Json(ApiResponse::error(
                    500,
                    &format!("Failed to fetch rule: {}", e),
                ));
            }
        };

    if !rule.is_enabled {
        return Json(ApiResponse::error(400, "Conversion rule is not enabled"));
    }

    let execution_id = Uuid::new_v4();
    let now = Utc::now();

    let _ = sqlx::query(
        "INSERT INTO conversion_executions (id, rule_id, rule_code, source_record_id, source_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(execution_id)
    .bind(rule.id)
    .bind(&rule.code)
    .bind(&req.source_record_id)
    .bind(&req.source_data)
    .bind("running")
    .bind(now)
    .execute(&state.pool)
    .await;

    let response = ExecuteConversionResponse {
        execution_id,
        success: true,
        target_record_id: Some(Uuid::new_v4().to_string()),
        target_data: Some(req.source_data),
        message: "Conversion executed successfully".to_string(),
        error_message: None,
    };

    let _ = sqlx::query(
        "UPDATE conversion_executions SET status = $1, completed_at = $2, target_record_id = $3, target_data = $4
         WHERE id = $5",
    )
    .bind("completed")
    .bind(now)
    .bind(&response.target_record_id)
    .bind(&response.target_data)
    .bind(execution_id)
    .execute(&state.pool)
    .await;

    Json(ApiResponse::success(
        response,
        "Conversion executed successfully",
    ))
}

async fn enable_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ConversionRule>> {
    match sqlx::query_as::<_, ConversionRule>(
        "UPDATE conversion_rules SET is_enabled = true, status = 'active', updated_at = $2 WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .bind(Utc::now())
    .fetch_one(&state.pool)
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "Conversion rule enabled successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to enable conversion rule: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to enable conversion rule: {}", e)))
        }
    }
}

async fn disable_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ConversionRule>> {
    match sqlx::query_as::<_, ConversionRule>(
        "UPDATE conversion_rules SET is_enabled = false, status = 'inactive', updated_at = $2 WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .bind(Utc::now())
    .fetch_one(&state.pool)
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "Conversion rule disabled successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to disable conversion rule: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to disable conversion rule: {}", e)))
        }
    }
}

// ==================== MES↔QMS Integration API ====================

async fn list_mes_qms_sync_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<Vec<mes_qms_integration::MesQmsSync>>> {
    let tenant_id = get_tenant_id(&claims);
    let sync_type = query.get("sync_type").map(|s| s.as_str());
    let direction = query.get("direction").map(|s| s.as_str());
    let status = query.get("status").map(|s| s.as_str());
    let limit = query
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(100);

    match mes_qms_integration::list_mes_qms_sync(
        &state.pool,
        tenant_id,
        sync_type,
        direction,
        status,
        limit,
    )
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "MES↔QMS sync records retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔QMS syncs: {}", e),
            ))
        }
    }
}

async fn get_mes_qms_sync_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    match mes_qms_integration::get_mes_qms_sync(&state.pool, id).await {
        Ok(Some(sync)) => Json(ApiResponse::success(sync, "MES↔QMS sync found")),
        Ok(None) => Json(ApiResponse::error(404, "MES↔QMS sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔QMS sync: {}", e),
            ))
        }
    }
}

async fn get_mes_qms_stats_api(
    State(state): State<AppState>,
) -> Json<ApiResponse<mes_qms_integration::SyncStats>> {
    match mes_qms_integration::get_mes_qms_sync_stats(&state.pool).await {
        Ok(stats) => Json(ApiResponse::success(
            stats,
            "MES↔QMS sync stats retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS stats: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔QMS stats: {}", e),
            ))
        }
    }
}

async fn trigger_qms_inspection_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    Json(req): Json<mes_qms_integration::TriggerInspectionRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::trigger_qms_inspection(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "QMS inspection triggered successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to trigger QMS inspection: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to trigger QMS inspection: {}", e),
            ))
        }
    }
}

async fn sync_quality_result_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    Json(req): Json<mes_qms_integration::SyncQualityResultRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::sync_quality_result_to_mes(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "Quality result synced to MES successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to sync quality result to MES: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to sync quality result to MES: {}", e),
            ))
        }
    }
}

async fn sync_trace_chain_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    Json(req): Json<mes_qms_integration::TraceChainSyncRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::sync_trace_chain_data(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "Trace chain data synced successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to sync trace chain data: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to sync trace chain data: {}", e),
            ))
        }
    }
}

async fn defect_handling_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    Json(req): Json<mes_qms_integration::DefectHandlingRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::handle_defect_handling(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "Defect handling processed successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to process defect handling: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to process defect handling: {}", e),
            ))
        }
    }
}

async fn retry_mes_qms_sync_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    match mes_qms_integration::retry_failed_sync(&state.pool, &state.mes_url, &state.qms_url, id)
        .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "MES↔QMS sync retried successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to retry MES↔QMS sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to retry MES↔QMS sync: {}", e),
            ))
        }
    }
}

// ==================== MES↔ERP Production Order Sync API ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SyncErpToMesRequest {
    pub erp_order_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SyncMesToErpRequest {
    pub mes_order_id: String,
}

async fn sync_erp_order_to_mes(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    Json(req): Json<SyncErpToMesRequest>,
) -> Json<ApiResponse<mes_erp_sync::SyncResult>> {
    let tenant_id = get_tenant_id(&claims);
    let erp_order_id = match Uuid::parse_str(&req.erp_order_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid ERP order ID: {}", e),
            ));
        }
    };

    match state
        .mes_erp_sync_service
        .sync_erp_to_mes(tenant_id, erp_order_id)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "ERP→MES 同步成功")),
        Err(e) => {
            tracing::error!("ERP→MES sync failed: {}", e);
            Json(ApiResponse::error(500, &format!("ERP→MES 同步失败: {}", e)))
        }
    }
}

async fn sync_mes_progress_to_erp(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared::auth::Claims>,
    Json(req): Json<SyncMesToErpRequest>,
) -> Json<ApiResponse<mes_erp_sync::SyncResult>> {
    let tenant_id = get_tenant_id(&claims);
    let mes_order_id = match Uuid::parse_str(&req.mes_order_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid MES order ID: {}", e),
            ));
        }
    };

    match state
        .mes_erp_sync_service
        .sync_mes_progress_to_erp(tenant_id, mes_order_id)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "MES→ERP 进度同步成功")),
        Err(e) => {
            tracing::error!("MES→ERP progress sync failed: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("MES→ERP 进度同步失败: {}", e),
            ))
        }
    }
}

async fn retry_mes_erp_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<mes_erp_sync::SyncResult>> {
    match state.mes_erp_sync_service.retry_failed_sync(id).await {
        Ok(result) => Json(ApiResponse::success(result, "MES↔ERP 同步重试成功")),
        Err(e) => {
            tracing::error!("MES↔ERP sync retry failed: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("MES↔ERP 同步重试失败: {}", e),
            ))
        }
    }
}

async fn get_mes_erp_sync_logs(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<mes_erp_sync::SyncLog>>> {
    match state.mes_erp_sync_service.get_sync_logs(id).await {
        Ok(logs) => Json(ApiResponse::success(logs, "同步日志获取成功")),
        Err(e) => {
            tracing::error!("Failed to fetch sync logs: {}", e);
            Json(ApiResponse::error(500, &format!("获取同步日志失败: {}", e)))
        }
    }
}

async fn list_mes_erp_sync_records(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<Vec<mes_erp_sync::MesErpSyncRecord>>> {
    let direction = query.get("direction").map(|s| s.as_str());
    let status = query.get("status").map(|s| s.as_str());
    let limit = query
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(100);
    let offset = query
        .get("offset")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    match state
        .mes_erp_sync_service
        .list_sync_records(direction, status, limit, offset)
        .await
    {
        Ok(records) => Json(ApiResponse::success(records, "同步记录获取成功")),
        Err(e) => {
            tracing::error!("Failed to fetch sync records: {}", e);
            Json(ApiResponse::error(500, &format!("获取同步记录失败: {}", e)))
        }
    }
}
