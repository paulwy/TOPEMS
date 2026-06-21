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
    extract::FromRef,
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use uuid::Uuid;

use topems_shared::{
    auth_middleware, build_health_response, create_cors_layer,
    init_logging, ApiResponse, AuthState, ServiceHealth,
};

mod plugin;

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

    init_logging("topems-integration");

    tracing::info!("🚀 TOPEMS Integration Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://xingzhai@localhost/topems_integration".to_string());

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

    let lims_url =
        std::env::var("QUALITY_ASSURANCE_URL").unwrap_or_else(|_| "http://localhost:8052".to_string());
    let qms_url = std::env::var("QUALITY_ASSURANCE_URL").unwrap_or_else(|_| "http://localhost:8052".to_string());
    let mes_url = std::env::var("MES_URL").unwrap_or_else(|_| "http://localhost:8030".to_string());
    let erp_url = std::env::var("ERP_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());
    let wms_url = std::env::var("WMS_URL").unwrap_or_else(|_| "http://localhost:8042".to_string());
    let scm_url = std::env::var("SCM_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let app_state = AppState {
        pool,
        lims_url,
        qms_url,
        mes_url,
        erp_url,
        wms_url,
        scm_url,
        auth_state: AuthState::from_env(),
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
        .route(
            "/api/integration/lims-qms/{id}/sync",
            post(sync_lims_qms),
        )
        .route("/api/integration/mes-erp", get(list_mes_erp_sync))
        .route("/api/integration/mes-erp", post(create_mes_erp_sync))
        .route("/api/integration/mes-erp/{id}", get(get_mes_erp_sync))
        .route("/api/integration/mes-erp/{id}/sync", post(sync_mes_erp))
        .route("/api/integration/wms-scm", get(list_wms_scm_sync))
        .route("/api/integration/wms-scm", post(create_wms_scm_sync))
        .route("/api/integration/wms-scm/{id}", get(get_wms_scm_sync))
        .route("/api/integration/wms-scm/{id}/sync", post(sync_wms_scm))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state);

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors);

    let port = std::env::var("SERVER_PORT")
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
    "TOPEMS Integration Service API\n\nSystems: LIMS↔QMS, MES↔ERP, WMS↔SCM\n\nCheck /health for service status"
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

async fn init_database(_pool: &PgPool) -> Result<(), sqlx::Error> {
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
