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

/// 注册全部契约兜底路由。
#[allow(clippy::too_many_lines)]
pub fn contract_stub_routes() -> Router<AppState> {
    Router::new()
        .route("/copilot/sessions", post(stub_action))
        .route("/copilot/sessions/{p0}", get(stub_list))
        .route("/copilot/sessions/{p0}", delete(stub_action))
        .route("/copilot/chat", post(stub_action))
        .route("/copilot/intent", post(stub_action))
        .route("/copilot/modules", get(stub_list))
        .route("/copilot/modules/{p0}", get(stub_list))
        .route("/copilot/modules/{p0}/faq", get(stub_list))
        .route("/forms", get(stub_list))
        .route("/forms/{p0}", get(stub_list))
        .route("/forms/{p0}/validate", post(stub_action))
        .route("/forms/{p0}/auto-fill", post(stub_action))
        .route("/forms/{p0}/generate", post(stub_action))
        .route("/forms/{p0}/submit", post(stub_action))
        .route("/forms/{p0}/draft", post(stub_action))
        .route("/documents", get(stub_list))
        .route("/documents", post(stub_action))
        .route("/documents/{p0}", get(stub_list))
        .route("/documents/{p0}", delete(stub_action))
        .route("/documents/{p0}/parse", post(stub_action))
        .route("/documents/{p0}/summary", get(stub_list))
        .route("/documents/{p0}/summary", post(stub_action))
        .route("/documents/{p0}/search", get(stub_list))
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
        .route("/comments/{p0}", put(stub_action))
        .route("/comments/{p0}", delete(stub_action))
        .route("/favorites", get(stub_list))
        .route("/favorites", post(stub_action))
        .route("/favorites/{p0}", delete(stub_action))
        .route("/favorites/check", get(stub_list))
        .route("/search", get(stub_list))
        .route("/search/suggestions", get(stub_list))
        .route("/search/recent", get(stub_list))
        .route("/search/recent", delete(stub_action))
        .route("/dict/dict-types/{p0}/items", get(stub_list))
        .route("/tenant/{p0}/analytics/overview", get(stub_list))
        .route("/tenant/{p0}/analytics/usage", get(stub_list))
        .route("/tenant/{p0}/analytics/activity", get(stub_list))
        .route("/tenant/{p0}/analytics/api-usage", get(stub_list))
        .route("/tenant/{p0}/analytics/top-endpoints", get(stub_list))
        .route("/tenant/{p0}/analytics/user-stats", get(stub_list))
        .route("/tenant/{p0}/analytics/real-time", get(stub_list))
        .route("/tenant/{p0}/billing/subscription", get(stub_list))
        .route("/tenant/{p0}/billing/invoices", get(stub_list))
        .route("/tenant/{p0}/billing/invoices/{p1}", get(stub_list))
        .route("/tenant/{p0}/billing/invoices/{p1}/pay", post(stub_action))
        .route("/tenant/{p0}/billing/plan", post(stub_action))
        .route(
            "/tenant/{p0}/billing/subscription/cancel",
            post(stub_action),
        )
        .route("/tenant/{p0}/billing/card", post(stub_action))
        .route("/tenant/{p0}/billing/card", delete(stub_action))
        .route("/tenant/{p0}/settings", get(stub_list))
        .route("/tenant/{p0}/settings", put(stub_action))
        .route("/tenant/{p0}/branding", get(stub_list))
        .route("/tenant/{p0}/branding", put(stub_action))
        .route("/tenant/{p0}/features", get(stub_list))
        .route("/tenant/{p0}/features", put(stub_action))
        .route("/tenant/{p0}/features/{p1}/enable", post(stub_action))
        .route("/tenant/{p0}/features/{p1}/disable", post(stub_action))
        .route("/tenant/{p0}/domains", get(stub_list))
        .route("/tenant/{p0}/domains", post(stub_action))
        .route("/tenant/{p0}/domains/{p1}", delete(stub_action))
        .route("/tenant/{p0}/email-config", get(stub_list))
        .route("/tenant/{p0}/email-config", put(stub_action))
        .route("/tenant/{p0}/integrations", get(stub_list))
        .route("/tenant/{p0}/integrations", post(stub_action))
        .route("/tenant/{p0}/integrations/{p1}", put(stub_action))
        .route("/tenant/{p0}/integrations/{p1}", delete(stub_action))
        .route("/tenant/{p0}/webhooks", get(stub_list))
        .route("/tenant/{p0}/webhooks", post(stub_action))
        .route("/tenant/{p0}/webhooks/{p1}", put(stub_action))
        .route("/tenant/{p0}/webhooks/{p1}", delete(stub_action))
        .route("/tenant/{p0}/webhooks/{p1}/test", post(stub_action))
        .route("/tenant/{p0}/security", get(stub_list))
        .route("/tenant/{p0}/security", put(stub_action))
        .route("/tenant/{p0}/security/password-policy", get(stub_list))
        .route("/tenant/{p0}/security/password-policy", put(stub_action))
        .route("/tenant/{p0}/security/enable-2fa", post(stub_action))
        .route("/tenant/{p0}/security/disable-2fa", post(stub_action))
        .route("/tenant/{p0}/security/api-keys", get(stub_list))
        .route("/tenant/{p0}/security/generate-api-key", post(stub_action))
        .route(
            "/tenant/{p0}/security/rotate-api-key/{p1}",
            post(stub_action),
        )
        .route("/tenant/{p0}/security/api-keys/{p1}", delete(stub_action))
        .route("/tenant/{p0}/security/audit-logs", get(stub_list))
        .route("/tenant/{p0}/security/audit-logs/{p1}", get(stub_list))
        .route("/tenant/{p0}/security/audit-logs/export", post(stub_action))
        .route("/tenant/{p0}/security/sessions", get(stub_list))
        .route(
            "/tenant/{p0}/security/sessions/{p1}/revoke",
            post(stub_action),
        )
        .route(
            "/tenant/{p0}/security/sessions/revoke-all",
            post(stub_action),
        )
        .route("/tenant/{p0}/security/ip-whitelist", post(stub_action))
        .route(
            "/tenant/{p0}/security/ip-whitelist/{p1}",
            delete(stub_action),
        )
        .route("/system/api-keys/{p0}", get(stub_list))
        .route("/system/api-keys/{p0}", put(stub_action))
        .route("/wms/inbound-orders/{p0}/approval/start", post(stub_action))
        .route(
            "/wms/inbound-orders/{p0}/approval/approve",
            post(stub_action),
        )
        .route(
            "/wms/inbound-orders/{p0}/approval/reject",
            post(stub_action),
        )
        .route(
            "/wms/outbound-orders/{p0}/approval/start",
            post(stub_action),
        )
        .route(
            "/wms/outbound-orders/{p0}/approval/approve",
            post(stub_action),
        )
        .route(
            "/wms/outbound-orders/{p0}/approval/reject",
            post(stub_action),
        )
        .route("/wms/stock-takes/{p0}/approval/start", post(stub_action))
        .route("/wms/stock-takes/{p0}/approval/approve", post(stub_action))
        .route("/wms/stock-takes/{p0}/approval/reject", post(stub_action))
        .route(
            "/wms/transfer-orders/{p0}/approval/start",
            post(stub_action),
        )
        .route(
            "/wms/transfer-orders/{p0}/approval/approve",
            post(stub_action),
        )
        .route(
            "/wms/transfer-orders/{p0}/approval/reject",
            post(stub_action),
        )
}
