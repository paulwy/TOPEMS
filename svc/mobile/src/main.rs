mod event_handlers;

mod db;
mod models;
mod modules;
mod schema_defense;
mod services;
mod shared;

use anyhow::Result;
use axum::{extract::State, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;
use utoipa::OpenApi;
use uuid::Uuid;

use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, register_routes_with_legacy_alias,
    ApiResponse,
};
use topems_shared_auth::middleware::require_permission;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::logging::request_context_middleware;
use topems_shared_db::rls::rls_middleware;
use topems_shared_observability::telemetry::telemetry_middleware;
use topems_shared_service_client::service_client::{
    api::hrm_api::HrmApi, api::mes_api::MesApi, api::notification_api::NotificationApi,
    api::qms_api::QmsApi, api::wms_api::WmsApi, TypedServiceClient, WorkflowApi,
};

use db::repository::*;
use models::*;
use modules::attendance::{
    apply_leave, check_in, check_out, get_attendance_overview, get_attendance_stats,
    list_attendance_records, list_leave_applications,
};
use modules::barcode_scanner::{
    delete_scan_record, get_scan_by_id, get_scan_history, get_supported_barcode_types, scan_barcode,
};
use modules::device::{register_device, update_push_token};
use modules::inventory::{
    create_stocktake_record, get_inventory_item, list_inbound_orders, list_inventory_items,
    list_outbound_orders, list_stocktake_tasks,
};
use modules::media::{delete_media, get_audio, get_photos, get_video, upload_media};
use modules::offline::{get_offline_status, sync_offline_data};
use modules::offline_records::{
    clear_synced as clear_offline_synced, get_pending_records as get_offline_pending_records,
    mark_synced as mark_offline_record_synced, sync_records as sync_offline_records,
};
use modules::offline_sync::{
    get_offline_status as get_offline_sync_status, get_sync_history, get_sync_policy,
    retry_failed_sync, sync_data, update_sync_policy,
};
use modules::patrol::{
    create_patrol_record, delete_patrol_record, get_all_patrol_records, get_patrol_record,
    update_patrol_record,
};
use modules::photo_upload::{
    batch_upload_photos, delete_photo, get_photo_by_id, get_photo_list, get_upload_progress,
    upload_photo,
};
use modules::production::{
    get_production_order, list_equipment, list_production_orders, list_work_reports,
    submit_work_report,
};
use modules::push_notification::{
    create_template, get_devices, get_notification_by_id, get_notification_list,
    get_notification_stats, get_templates, register_device as register_push_device, send_broadcast,
    send_notification,
};
use modules::quality::{
    get_quality_task, list_defect_records, list_quality_tasks, report_defect,
    update_quality_task_status,
};
use modules::scan::{image_ocr, scan_qrcode};
use modules::shortcut::{create_shortcut, get_shortcuts};
use modules::stats::{get_dashboard_stats, get_patrol_stats, get_task_stats};
use modules::task::{
    create_task, delete_task, get_all_tasks, get_task, update_task, update_task_status,
};
use modules::user::{get_profile, update_profile, upload_avatar};
use modules::workbench::get_workbench_data;

use modules::mobile_plugin::create_routes;
use shared::AppState;

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    let sql_statements = include_str!("../init.sql");
    for stmt in sql_statements.split(';').filter(|s| !s.trim().is_empty()) {
        sqlx::query(stmt.trim()).execute(pool).await?;
    }

    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[mobile] Schema 防御检查失败: {:?}", e);
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    std::env::set_var("SEARCH_PATH", "mobile, public");

    let config = ServiceConfig {
        name: "topems-mobile",
        port: 8070,
        port_env_var: Some("MOBILE_PORT"),
        max_db_connections: 20,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/mobile",
        legacy_prefixes: &["/api/v1/mobile", "/api/core/mobile/v1"],
        init_telemetry: true,
    };
    let ctx = bootstrap_service(&config).await?;

    // Mobile 专属初始化：建表 + 离线记录表
    if let Err(e) = init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("数据库初始化警告: {}", e);
    } else {
        tracing::info!("✅ 数据库表初始化完成");
    }
    if let Err(e) = modules::offline_records::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("离线记录表初始化警告: {}", e);
    }

    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ MOBILE 事件订阅者启动失败: {}", e);
    }

    // 6 个服务客户端初始化（统一服务间认证：service token，最小权限 + 短时效）
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let wms_client = match TypedServiceClient::<WmsApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["wms:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ WMS服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ WMS服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(WmsApi, "http://localhost:8041")
                .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["wms:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let mes_api_client = match TypedServiceClient::<MesApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["mes:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ MES API服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ MES API服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(MesApi, "http://localhost:8030")
                .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["mes:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let qms_api_client = match TypedServiceClient::<QmsApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["qms:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ QMS API服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ QMS API服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(QmsApi, "http://localhost:8050")
                .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["qms:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let hrm_client = match TypedServiceClient::<HrmApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["hrm:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ HRM服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ HRM服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(HrmApi, "http://localhost:8020")
                .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["hrm:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["workflow:read"]))
    {
        Ok(client) => {
            tracing::info!("✅ Workflow服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ Workflow服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(WorkflowApi, "http://localhost:8000")
                .and_then(|c| {
                    c.with_service_token(&jwt_secret, "mobile-service", &["workflow:read"])
                })
                .expect("hardcoded fallback URL is valid")
        }
    };

    let notification_client = match TypedServiceClient::<NotificationApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "mobile-service", &["notification:read"]))
    {
        Ok(client) => {
            tracing::info!("✅ Notification服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ Notification服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(NotificationApi, "http://localhost:8000")
                .and_then(|c| {
                    c.with_service_token(&jwt_secret, "mobile-service", &["notification:read"])
                })
                .expect("hardcoded fallback URL is valid")
        }
    };

    let app_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        event_publisher: ctx.event_publisher.clone(),
        wms_client,
        hrm_client,
        workflow_client,
        notification_client,
        mes_api_client,
        qms_api_client,
    };

    // Public routes (no auth)
    let public_routes = Router::new()
        .route("/health", axum::routing::get(health_check))
        .merge(create_routes());

    // Protected routes
    let protected_routes = Router::new()
        // Workbench Routes
        .route("/workbench", axum::routing::get(get_workbench_data))
        // Stats Routes
        .route("/stats/dashboard", axum::routing::get(get_dashboard_stats))
        .route("/stats/patrol", axum::routing::get(get_patrol_stats))
        .route("/stats/task", axum::routing::get(get_task_stats))
        // User Routes
        .route(
            "/user/profile",
            axum::routing::get(get_profile).put(update_profile),
        )
        .route("/user/avatar", axum::routing::post(upload_avatar))
        // Scan Routes
        .route("/scan/barcode", axum::routing::post(scan_barcode))
        .route("/scan/qrcode", axum::routing::post(scan_qrcode))
        .route("/scan/image-ocr", axum::routing::post(image_ocr))
        // Offline Routes
        .route("/offline/sync", axum::routing::post(sync_offline_data))
        .route("/offline/status", axum::routing::get(get_offline_status))
        // Device Routes
        .route("/devices/register", axum::routing::post(register_device))
        .route("/devices/token", axum::routing::put(update_push_token))
        // Shortcut Routes
        .route(
            "/shortcuts",
            axum::routing::get(get_shortcuts).post(create_shortcut),
        )
        // Patrol Routes
        .route(
            "/patrol-records",
            axum::routing::get(get_all_patrol_records).post(create_patrol_record),
        )
        .route(
            "/patrol-records/{id}",
            axum::routing::get(get_patrol_record)
                .put(update_patrol_record)
                .delete(delete_patrol_record),
        )
        // Task Routes
        .route(
            "/mobile-tasks",
            axum::routing::get(get_all_tasks).post(create_task),
        )
        .route(
            "/mobile-tasks/{id}",
            axum::routing::get(get_task)
                .put(update_task)
                .delete(delete_task),
        )
        .route(
            "/mobile-tasks/{id}/status",
            axum::routing::post(update_task_status),
        )
        // Attendance Routes
        .route("/attendance", axum::routing::get(get_attendance_overview))
        .route(
            "/attendance/stats",
            axum::routing::get(get_attendance_stats),
        )
        .route(
            "/attendance/records",
            axum::routing::get(list_attendance_records),
        )
        .route("/attendance/check-in", axum::routing::post(check_in))
        .route("/attendance/check-out", axum::routing::post(check_out))
        .route(
            "/attendance/leaves",
            axum::routing::get(list_leave_applications).post(apply_leave),
        )
        // Media Routes
        .route("/media/photos", axum::routing::get(get_photos))
        .route("/media/audio", axum::routing::get(get_audio))
        .route("/media/video", axum::routing::get(get_video))
        .route(
            "/media/upload/{file_type}",
            axum::routing::post(upload_media),
        )
        .route(
            "/media/{file_type}/{id}",
            axum::routing::delete(delete_media),
        )
        // Legacy Routes
        .route("/dashboard/stats", axum::routing::get(get_dashboard_stats))
        .route(
            "/scan-records",
            axum::routing::get(list_scan_records).post(create_scan_record),
        )
        .route(
            "/photo-evidences",
            axum::routing::get(list_photo_evidences).post(create_photo_evidence),
        )
        .route(
            "/audio-recordings",
            axum::routing::get(list_audio_recordings).post(create_audio_recording),
        )
        .route(
            "/video-recordings",
            axum::routing::get(list_video_recordings).post(create_video_recording),
        )
        // Enhanced Offline Sync Routes
        .route("/offline/sync-data", axum::routing::post(sync_data))
        .route(
            "/offline/sync-status",
            axum::routing::get(get_offline_sync_status),
        )
        .route(
            "/offline/sync-history",
            axum::routing::get(get_sync_history),
        )
        .route(
            "/offline/sync-policy",
            axum::routing::get(get_sync_policy).put(update_sync_policy),
        )
        .route(
            "/offline/retry-failed",
            axum::routing::post(retry_failed_sync),
        )
        // 离线操作记录 CRUD
        .route(
            "/offline/records",
            axum::routing::post(sync_offline_records),
        )
        .route(
            "/offline/records/pending",
            axum::routing::get(get_offline_pending_records),
        )
        .route(
            "/offline/records/{record_id}/synced",
            axum::routing::post(mark_offline_record_synced),
        )
        .route(
            "/offline/records/synced/clear",
            axum::routing::delete(clear_offline_synced),
        )
        // Push Notification Routes
        .route("/push/devices", axum::routing::get(get_devices))
        .route(
            "/push/devices/register",
            axum::routing::post(register_push_device),
        )
        .route(
            "/push/notifications",
            axum::routing::post(send_notification).get(get_notification_list),
        )
        .route(
            "/push/notifications/broadcast",
            axum::routing::post(send_broadcast),
        )
        .route(
            "/push/notifications/stats",
            axum::routing::get(get_notification_stats),
        )
        .route(
            "/push/notifications/{id}",
            axum::routing::get(get_notification_by_id),
        )
        .route(
            "/push/templates",
            axum::routing::get(get_templates).post(create_template),
        )
        // Barcode Scanner Routes
        .route("/barcode/scan", axum::routing::post(scan_barcode))
        .route("/barcode/history", axum::routing::get(get_scan_history))
        .route(
            "/barcode/history/{id}",
            axum::routing::get(get_scan_by_id).delete(delete_scan_record),
        )
        .route(
            "/barcode/types",
            axum::routing::get(get_supported_barcode_types),
        )
        // Photo Upload Routes
        .route("/photos/upload", axum::routing::post(upload_photo))
        .route(
            "/photos/batch-upload",
            axum::routing::post(batch_upload_photos),
        )
        .route("/photos", axum::routing::get(get_photo_list))
        .route(
            "/photos/{id}",
            axum::routing::get(get_photo_by_id).delete(delete_photo),
        )
        .route(
            "/photos/{id}/progress",
            axum::routing::get(get_upload_progress),
        )
        // Inventory Routes
        .route("/inventory/items", axum::routing::get(list_inventory_items))
        .route(
            "/inventory/items/{id}",
            axum::routing::get(get_inventory_item),
        )
        .route(
            "/inventory/stocktake",
            axum::routing::get(list_stocktake_tasks),
        )
        .route(
            "/inventory/stocktake/{task_id}/records",
            axum::routing::post(create_stocktake_record),
        )
        .route(
            "/inventory/inbound",
            axum::routing::get(list_inbound_orders),
        )
        .route(
            "/inventory/outbound",
            axum::routing::get(list_outbound_orders),
        )
        // Quality Routes
        .route("/quality/tasks", axum::routing::get(list_quality_tasks))
        .route("/quality/tasks/{id}", axum::routing::get(get_quality_task))
        .route(
            "/quality/tasks/{id}/status",
            axum::routing::put(update_quality_task_status),
        )
        .route(
            "/quality/defects",
            axum::routing::get(list_defect_records).post(report_defect),
        )
        // Production Routes
        .route(
            "/production/orders",
            axum::routing::get(list_production_orders),
        )
        .route(
            "/production/orders/{id}",
            axum::routing::get(get_production_order),
        )
        .route(
            "/production/work-reports",
            axum::routing::get(list_work_reports).post(submit_work_report),
        )
        .route("/production/equipment", axum::routing::get(list_equipment));

    let openapi_json = serde_json::to_string_pretty(&services::openapi::MobileApiDoc::openapi())
        .unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        });
    let openapi_json_for_route = openapi_json.clone();
    let openapi_routes = Router::new()
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(move || async move { openapi_json_for_route.clone() }),
        )
        .with_state(app_state.clone());

    // Protected 中间件链：tenant → auth → rls → request_context → rate_limit → state
    let protected_routes = protected_routes
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(require_permission(
            "mobile:admin",
        )))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ))
        .layer(axum::middleware::from_fn(request_context_middleware));

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_routes = protected_routes
        .layer(axum::middleware::from_fn({
            let mw = rate_limiter.clone();
            move |req, next| {
                let mw = mw.clone();
                async move { rate_limit_middleware(mw, req, next).await }
            }
        }))
        .with_state(app_state.clone());

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_route = Router::new()
        .route(
            "/metrics",
            axum::routing::get(move || async move { metric_handle.render() }),
        )
        .with_state(app_state.clone());

    let cors = create_cors_layer();

    let app = register_routes_with_legacy_alias(
        Router::new()
            .merge(public_routes)
            .merge(openapi_routes)
            .merge(metrics_route),
        config.api_prefix,
        config.legacy_prefixes,
        protected_routes,
    )
    .merge(create_api_info_router("topems-mobile"))
    .with_state(app_state.clone())
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(prometheus_layer)
    .layer(cors);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mobile_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let app = Application {
        router: app,
        port: resolve_port(&config),
        name: config.name,
    };
    run(app).await?;
    Ok(())
}

use topems_shared_core::health::{build_health_response, ServiceHealth};

async fn health_check() -> ServiceHealth {
    build_health_response("topems-mobile", true)
}

async fn list_patrol_records(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_patrol_records(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取巡逻记录失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取巡逻记录成功",
    ))
}

async fn list_scan_records(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_scan_records(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取扫码记录失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取扫码记录成功",
    ))
}

async fn create_scan_record(
    State(state): State<AppState>,
    Json(payload): Json<CreateScanRecord>,
) -> Json<ApiResponse<ScanRecord>> {
    let tenant_id = Uuid::new_v4();
    match db_create_scan_record(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建扫码记录成功")),
        Err(e) => {
            tracing::error!("创建扫码记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建扫码记录失败: {}", e)))
        }
    }
}

async fn list_photo_evidences(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_photo_evidence(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取照片记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取照片记录成功",
    ))
}

async fn create_photo_evidence(
    State(state): State<AppState>,
    Json(payload): Json<CreatePhotoEvidence>,
) -> Json<ApiResponse<PhotoEvidence>> {
    let tenant_id = Uuid::new_v4();
    match db_create_photo_evidence(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建照片记录成功")),
        Err(e) => {
            tracing::error!("创建照片记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建照片记录失败: {}", e)))
        }
    }
}

async fn list_audio_recordings(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_audio_recordings(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取音频记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取音频记录成功",
    ))
}

async fn create_audio_recording(
    State(state): State<AppState>,
    Json(payload): Json<CreateAudioRecording>,
) -> Json<ApiResponse<AudioRecording>> {
    let tenant_id = Uuid::new_v4();
    match db_create_audio_recording(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建音频记录成功")),
        Err(e) => {
            tracing::error!("创建音频记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建音频记录失败: {}", e)))
        }
    }
}

async fn list_video_recordings(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_video_recordings(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取视频记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取视频记录成功",
    ))
}

async fn create_video_recording(
    State(state): State<AppState>,
    Json(payload): Json<CreateVideoRecording>,
) -> Json<ApiResponse<VideoRecording>> {
    let tenant_id = Uuid::new_v4();
    match db_create_video_recording(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建视频记录成功")),
        Err(e) => {
            tracing::error!("创建视频记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建视频记录失败: {}", e)))
        }
    }
}

async fn list_mobile_tasks(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_mobile_tasks(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取移动任务失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取移动任务成功",
    ))
}
