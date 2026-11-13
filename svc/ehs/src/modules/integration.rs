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
//!
//! 租户来源（W7-B4 EHS RLS fail-closed 收口）：
//! 本类 `/api/internal/` 端点为免 JWT 的内网服务间调用——`is_public_path` 对
//! `/api/internal/` 放行，auth_middleware 不注入 Claims，tenant_middleware 亦跳过。
//! 因此要求调用方在请求体显式传 `tenant_id`：缺失、空串、nil-uuid、解析失败一律
//! 400 拒收 + 计数告警，绝不落 NULL 业务行；校验通过后仍返回 503，写入恢复留待
//! 下一窗口（届时接 `scope_for_tenant` 落库，不开系统通道）。

use crate::shared::AppState;
use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use sqlx::types::Uuid;
use std::sync::atomic::{AtomicU64, Ordering};
use topems_shared_core::response::ApiResponse;

/// 缺少/非法 tenant_id 的集成请求累计拒绝数（用于告警与审计）。
static INTEGRATION_TENANT_REJECTS: AtomicU64 = AtomicU64::new(0);

/// 集成端点租户守卫：缺失、空串、nil-uuid、解析失败一律拒收，绝不落 NULL 业务行。
fn require_integration_tenant(
    raw: Option<&str>,
    endpoint: &str,
) -> Result<Uuid, ApiResponse<serde_json::Value>> {
    let parsed = raw.and_then(|v| Uuid::parse_str(v.trim()).ok());
    match parsed {
        Some(t) if !t.is_nil() => Ok(t),
        _ => {
            let total = INTEGRATION_TENANT_REJECTS.fetch_add(1, Ordering::Relaxed) + 1;
            tracing::error!(
                "[tenant_ctx] /api/internal/ehs/{} 缺少合法 tenant_id（raw={:?}），拒收；累计拒绝={}",
                endpoint,
                raw,
                total
            );
            Err(ApiResponse::error(
                400,
                "缺少合法租户标识 tenant_id，拒绝集成写入",
            ))
        }
    }
}

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
    /// 服务间调用方必须显式传递；缺失/空串/nil/非法一律拒收（不信任请求上下文回退）。
    pub tenant_id: Option<String>,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/internal/ehs/hazards/integration",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "缺少合法 tenant_id"),
        (status = 503, description = "集成写入恢复中"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Integration"
)]
pub async fn create_integration_hazard(
    State(_state): State<AppState>,
    Json(req): Json<CreateIntegrationHazardRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(resp) =
        require_integration_tenant(req.tenant_id.as_deref(), "hazards/integration")
    {
        return resp;
    }
    tracing::warn!(
        "[tenant_ctx] /api/internal/ehs/hazards/integration 租户校验通过，但集成写恢复留待下一窗口，继续 fail-closed"
    );
    ApiResponse::error(
        503,
        "集成隐患写入暂不可用：租户校验已就绪，写入恢复待下一窗口",
    )
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationAlertRequest {
    /// 服务间调用方必须显式传递；缺失/空串/nil/非法一律拒收（不信任请求上下文回退）。
    pub tenant_id: Option<String>,
    pub alert_no: String,
    pub title: String,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub source_system: Option<String>,
    pub source_id: Option<Uuid>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/internal/ehs/alerts/integration",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "缺少合法 tenant_id"),
        (status = 503, description = "集成写入恢复中"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Integration"
)]
pub async fn create_integration_alert(
    State(_state): State<AppState>,
    Json(req): Json<CreateIntegrationAlertRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(resp) =
        require_integration_tenant(req.tenant_id.as_deref(), "alerts/integration")
    {
        return resp;
    }
    tracing::warn!(
        "[tenant_ctx] /api/internal/ehs/alerts/integration 租户校验通过，但集成写恢复留待下一窗口，继续 fail-closed"
    );
    ApiResponse::error(
        503,
        "集成告警写入暂不可用：租户校验已就绪，写入恢复待下一窗口",
    )
}
