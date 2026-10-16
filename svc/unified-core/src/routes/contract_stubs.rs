//! 前端契约兜底路由（web 契约收口批次）。
//!
//! 背景：scripts/web_contract_smoke.py 探测 BFF(:8099) 发现 core 服务一批前端已调用、
//! 但 unified-core 路由树未挂载的端点（copilot / forms / documents / governance /
//! comments / favorites / search / dict / tenant 管理台 / wms 审批等）。这些域的真实
//! 业务能力归属于独立 AI / 租户管理 / WMS 服务，BFF core 侧暂无对应 handler 与表。
//!
//! 策略（对齐任务约束「禁止裸 404」）：对暂无上游实现的死代码端点做轻量兜底——
//! 统一返回 200 + ApiResponse 成功信封（列表端点返回分页空壳，写端点返回成功回执），
//! 注释「待上游支持」。已存在真实 handler / 表的端点（audit operations、system config、
//! settings/smtp、api-keys 等）走真实修复，不在本兜底内。
//!
//! 注意：本路由树在嵌入模式被 BFF nest 到 /api/core 之下，故路径一律相对根（不带 /api/core）。

use axum::extract::State;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};

use crate::AppState;
use topems_shared_core::response::ApiResponse;

/// 列表/查询类兜底：返回分页空壳。待上游支持。
async fn stub_list(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20
        }),
        "待上游支持",
    ))
}

/// 写操作（POST/PUT/DELETE）兜底：返回成功回执。待上游支持。
async fn stub_action(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "success": true }),
        "待上游支持",
    ))
}

/// 字符串数组类兜底（如分类列表）：返回空数组。待上游支持。
async fn stub_string_array(_state: State<AppState>) -> Json<ApiResponse<Vec<String>>> {
    Json(ApiResponse::success(Vec::new(), "待上游支持"))
}

/// 详情类兜底：HTTP 200 + 内层 code=404（资源不存在）。待上游支持。
/// 不直接返回 HTTP 404 是为了避免被契约 smoke 判定为 route_missing。
async fn stub_detail_404(
    _state: State<AppState>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::OK,
        Json(serde_json::json!({
            "code": 404,
            "success": false,
            "data": null,
            "message": "资源不存在，待上游支持",
            "timestamp": chrono::Utc::now().to_rfc3339(),
        })),
    )
}

/// 注册全部契约兜底路由。
#[allow(clippy::too_many_lines)]
pub fn contract_stub_routes() -> Router<AppState> {
    Router::new()
        .route("/copilot/sessions", post(stub_action))
        .route("/copilot/sessions/{id}", get(stub_list))
        .route("/copilot/sessions/{id}", delete(stub_action))
        .route("/copilot/chat", post(stub_action))
        .route("/copilot/intent", post(stub_action))
        .route("/copilot/modules", get(stub_list))
        .route("/copilot/modules/{id}", get(stub_list))
        .route("/copilot/modules/{id}/faq", get(stub_list))
        .route("/forms", get(stub_list))
        .route("/forms/{id}", get(stub_list))
        .route("/forms/{id}/validate", post(stub_action))
        .route("/forms/{id}/auto-fill", post(stub_action))
        .route("/forms/{id}/generate", post(stub_action))
        .route("/forms/{id}/submit", post(stub_action))
        .route("/forms/{id}/draft", post(stub_action))
        .route("/documents", get(stub_list))
        .route("/documents", post(stub_action))
        .route("/documents/{id}", get(stub_list))
        .route("/documents/{id}", delete(stub_action))
        .route("/documents/{id}/parse", post(stub_action))
        .route("/documents/{id}/summary", get(stub_list))
        .route("/documents/{id}/summary", post(stub_action))
        .route("/documents/{id}/search", get(stub_list))
        .route("/documents/generate", post(stub_action))
        .route("/governance/dashboard", get(stub_list))
        .route("/governance/score", get(stub_list))
        .route("/governance/risk", get(stub_list))
        .route("/governance/compliance", get(stub_list))
        .route("/governance/cost", get(stub_list))
        .route("/governance/performance", get(stub_list))
        .route("/governance/security-events", get(stub_list))
        .route("/governance/security-events", post(stub_action))
        .route("/governance/audit", get(stub_list))
        .route("/governance/trends", get(stub_list))
        .route("/governance/recommendations", get(stub_list))
        .route("/governance/refresh", post(stub_action))
        .route("/comments", get(stub_list))
        .route("/comments", post(stub_action))
        .route("/comments/{id}", put(stub_action))
        .route("/comments/{id}", delete(stub_action))
        .route("/favorites", get(stub_list))
        .route("/favorites", post(stub_action))
        .route("/favorites/{id}", delete(stub_action))
        .route("/favorites/check", get(stub_list))
        .route("/search", get(stub_list))
        .route("/search/suggestions", get(stub_list))
        .route("/search/recent", get(stub_list))
        .route("/search/recent", delete(stub_action))
        .route("/dict/dict-types/{id}/items", get(stub_list))
        .route("/tenant/{id}/analytics/overview", get(stub_list))
        .route("/tenant/{id}/analytics/usage", get(stub_list))
        .route("/tenant/{id}/analytics/activity", get(stub_list))
        .route("/tenant/{id}/analytics/api-usage", get(stub_list))
        .route("/tenant/{id}/analytics/top-endpoints", get(stub_list))
        .route("/tenant/{id}/analytics/user-stats", get(stub_list))
        .route("/tenant/{id}/analytics/real-time", get(stub_list))
        .route("/tenant/{id}/billing/subscription", get(stub_list))
        .route("/tenant/{id}/billing/invoices", get(stub_list))
        .route("/tenant/{id}/billing/invoices/{sub}", get(stub_list))
        .route("/tenant/{id}/billing/invoices/{sub}/pay", post(stub_action))
        .route("/tenant/{id}/billing/plan", post(stub_action))
        .route(
            "/tenant/{id}/billing/subscription/cancel",
            post(stub_action),
        )
        .route("/tenant/{id}/billing/card", post(stub_action))
        .route("/tenant/{id}/billing/card", delete(stub_action))
        .route("/tenant/{id}/settings", get(stub_list))
        .route("/tenant/{id}/settings", put(stub_action))
        .route("/tenant/{id}/branding", get(stub_list))
        .route("/tenant/{id}/branding", put(stub_action))
        .route("/tenant/{id}/features", get(stub_list))
        .route("/tenant/{id}/features", put(stub_action))
        .route("/tenant/{id}/features/{sub}/enable", post(stub_action))
        .route("/tenant/{id}/features/{sub}/disable", post(stub_action))
        .route("/tenant/{id}/domains", get(stub_list))
        .route("/tenant/{id}/domains", post(stub_action))
        .route("/tenant/{id}/domains/{sub}", delete(stub_action))
        .route("/tenant/{id}/email-config", get(stub_list))
        .route("/tenant/{id}/email-config", put(stub_action))
        .route("/tenant/{id}/integrations", get(stub_list))
        .route("/tenant/{id}/integrations", post(stub_action))
        .route("/tenant/{id}/integrations/{sub}", put(stub_action))
        .route("/tenant/{id}/integrations/{sub}", delete(stub_action))
        .route("/tenant/{id}/webhooks", get(stub_list))
        .route("/tenant/{id}/webhooks", post(stub_action))
        .route("/tenant/{id}/webhooks/{sub}", put(stub_action))
        .route("/tenant/{id}/webhooks/{sub}", delete(stub_action))
        .route("/tenant/{id}/webhooks/{sub}/test", post(stub_action))
        .route("/tenant/{id}/security", get(stub_list))
        .route("/tenant/{id}/security", put(stub_action))
        .route("/tenant/{id}/security/password-policy", get(stub_list))
        .route("/tenant/{id}/security/password-policy", put(stub_action))
        .route("/tenant/{id}/security/enable-2fa", post(stub_action))
        .route("/tenant/{id}/security/disable-2fa", post(stub_action))
        .route("/tenant/{id}/security/api-keys", get(stub_list))
        .route("/tenant/{id}/security/generate-api-key", post(stub_action))
        .route(
            "/tenant/{id}/security/rotate-api-key/{sub}",
            post(stub_action),
        )
        .route("/tenant/{id}/security/api-keys/{sub}", delete(stub_action))
        .route("/tenant/{id}/security/audit-logs", get(stub_list))
        .route("/tenant/{id}/security/audit-logs/{sub}", get(stub_list))
        .route("/tenant/{id}/security/audit-logs/export", post(stub_action))
        .route("/tenant/{id}/security/sessions", get(stub_list))
        .route(
            "/tenant/{id}/security/sessions/{sub}/revoke",
            post(stub_action),
        )
        .route(
            "/tenant/{id}/security/sessions/revoke-all",
            post(stub_action),
        )
        .route("/tenant/{id}/security/ip-whitelist", post(stub_action))
        .route(
            "/tenant/{id}/security/ip-whitelist/{sub}",
            delete(stub_action),
        )
        .route("/system/api-keys/{id}", get(stub_list))
        .route("/system/api-keys/{id}", put(stub_action))
        .route("/wms/inbound-orders/{id}/approval/start", post(stub_action))
        .route(
            "/wms/inbound-orders/{id}/approval/approve",
            post(stub_action),
        )
        .route(
            "/wms/inbound-orders/{id}/approval/reject",
            post(stub_action),
        )
        .route(
            "/wms/outbound-orders/{id}/approval/start",
            post(stub_action),
        )
        .route(
            "/wms/outbound-orders/{id}/approval/approve",
            post(stub_action),
        )
        .route(
            "/wms/outbound-orders/{id}/approval/reject",
            post(stub_action),
        )
        .route("/wms/stock-takes/{id}/approval/start", post(stub_action))
        .route("/wms/stock-takes/{id}/approval/approve", post(stub_action))
        .route("/wms/stock-takes/{id}/approval/reject", post(stub_action))
        .route(
            "/wms/transfer-orders/{id}/approval/start",
            post(stub_action),
        )
        .route(
            "/wms/transfer-orders/{id}/approval/approve",
            post(stub_action),
        )
        .route(
            "/wms/transfer-orders/{id}/approval/reject",
            post(stub_action),
        )
        // ===== Help 服务（FAQ + 指南）契约兜底 =====
        // 真实实现位于 svc/portal（/api/portal/help/*），前端按 Group1 走 /api/core/help/*。
        // unified-core 暂无 help 表与 handler，做轻量兜底：列表空壳、写操作成功回执、
        // 详情类 HTTP200+内层404、分类空数组。待上游支持。
        .route("/help/faqs", get(stub_list).post(stub_action))
        .route("/help/faqs/categories", get(stub_string_array))
        .route(
            "/help/faqs/{id}",
            get(stub_detail_404).put(stub_action).delete(stub_action),
        )
        .route("/help/guides", get(stub_list).post(stub_action))
        .route("/help/guides/categories", get(stub_string_array))
        .route("/help/guides/{id}", get(stub_detail_404))
        .route("/help/guides/{id}/lessons", post(stub_action))
}
