//! Integration 服务间内部集成端点（供 integration 服务编排调用）
//!
//! 路径前缀 `/api/internal/` 由 auth_middleware 的 is_public_path 放行（免 JWT），
//! 且此路由在 main.rs 中挂载于 require_permission layer 之外（public 路由），不受权限检查影响。
//! 设计约束：仅内网可达，须与网关/反向代理配合限制公网暴露。
//!
//! 承接原 integration `qms_lims_ehs.rs` 的 public 僵尸直写（integration→ehs 跨域）：
//! - 隐患集成创建：ehs.qa_ehs_hazards（原直写引用不存在的 public.qa_ehs_hazards
//!   且含不存在的 tenant_id/related_inspection_id 列 → 修正为实际列，hazard_no UNIQUE 幂等）
//! - 告警集成创建：ehs.qa_ehs_alerts（原直写表不存在 → 20260831191100 已建表，alert_no UNIQUE 幂等）

use crate::shared::AppState;
use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared_core::response::ApiResponse;

pub fn integration_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/internal/ehs/hazards/integration",
            post(create_integration_hazard),
        )
        .route(
            "/api/internal/ehs/alerts/integration",
            post(create_integration_alert),
        )
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationHazardRequest {
    pub hazard_no: String,
    pub title: String,
    pub category: Option<String>,
    pub level: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub reported_by: Option<String>,
    /// 修正：表列 inspection_id 有 FK→ehs.qa_ehs_inspection_records(id)，外部系统 id 不可靠时传 null
    pub inspection_id: Option<Uuid>,
    pub source: Option<String>,
}

pub async fn create_integration_hazard(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationHazardRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let category = req.category.unwrap_or_else(|| "通用".to_string());
    let level = req.level.unwrap_or_else(|| "medium".to_string());
    let status = req.status.unwrap_or_else(|| "reported".to_string());
    let reported_by = req.reported_by.unwrap_or_else(|| "system".to_string());
    let source = req.source.unwrap_or_else(|| "系统集成".to_string());

    let result = sqlx::query(
        "INSERT INTO ehs.qa_ehs_hazards (hazard_no, title, category, level, location, description, status, reported_by, inspection_id, source, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (hazard_no) DO UPDATE SET updated_at = NOW()
         RETURNING id, hazard_no, title, status",
    )
    .bind(&req.hazard_no)
    .bind(&req.title)
    .bind(&category)
    .bind(&level)
    .bind(&req.location)
    .bind(&req.description)
    .bind(&status)
    .bind(&reported_by)
    .bind(req.inspection_id)
    .bind(&source)
    .bind(Uuid::nil())
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "hazard_no": row.try_get::<String, _>("hazard_no").ok(),
                "title": row.try_get::<String, _>("title").ok(),
                "status": row.try_get::<String, _>("status").ok(),
            }),
            "集成隐患创建成功",
        )),
        Err(e) => {
            tracing::error!("[integration] 创建隐患失败: {}", e);
            Json(ApiResponse::error(500, "集成隐患创建失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationAlertRequest {
    pub alert_no: String,
    pub title: String,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub source_system: Option<String>,
    pub source_id: Option<Uuid>,
}

pub async fn create_integration_alert(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationAlertRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let alert_type = req.alert_type.unwrap_or_else(|| "其他告警".to_string());
    let severity = req.severity.unwrap_or_else(|| "medium".to_string());
    let status = req.status.unwrap_or_else(|| "active".to_string());
    let source_system = req.source_system.unwrap_or_else(|| "系统".to_string());

    let result = sqlx::query(
        "INSERT INTO ehs.qa_ehs_alerts (alert_no, title, alert_type, severity, description, status, source_system, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (alert_no) DO UPDATE SET updated_at = NOW()
         RETURNING id, alert_no, title, status",
    )
    .bind(&req.alert_no)
    .bind(&req.title)
    .bind(&alert_type)
    .bind(&severity)
    .bind(&req.description)
    .bind(&status)
    .bind(&source_system)
    .bind(req.source_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "alert_no": row.try_get::<String, _>("alert_no").ok(),
                "title": row.try_get::<String, _>("title").ok(),
                "status": row.try_get::<String, _>("status").ok(),
            }),
            "集成告警创建成功",
        )),
        Err(e) => {
            tracing::error!("[integration] 创建告警失败: {}", e);
            Json(ApiResponse::error(500, "集成告警创建失败"))
        }
    }
}
