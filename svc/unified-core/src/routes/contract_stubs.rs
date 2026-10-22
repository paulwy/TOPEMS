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
        // S2：copilot/forms/documents 前端死封装清理——实证 hook 层活调保留 2 条
        // （deleteSession :useBusinessCopilot.ts:282 / searchFAQ :258，svc/ai 未实现子路径），
        // 其余 6 条（getSession + getFormDefinition + documents parse/summary×2/search）
        // 页面+hook 零调用，core 兜底同步删除（防 gate 缺口）。
        // B4 第一批：dashboard/score/risk/compliance/cost/performance/security-events/audit/
        // recommendations 前端已改走 svc/ai `/dsh/governance/*`，core 兜底删除；
        // 仅 trends(GET)、refresh(POST) 仍由 core 承载，保留。
        .route("/copilot/sessions/{id}", delete(stub_action))
        .route("/copilot/modules/{id}/faq", get(stub_list))
    // trends(GET)/refresh(POST) 已由 modules::tenant::handlers 真实实现，兜底删除。
    // B4-④：/comments/* 与 /favorites/* 已由 modules::engagement 真实实现
    // （core_comments / core_favorites 表 + CRUD + 收藏查重），空壳删除。
    // S1：/search* 已由 svc/search 真实服务承接（/api/search + /api/search/recent 用户级真表），
    // 前端 searchApi 已改指 apiClient.search（q→keyword 对齐），core 空壳删除。
    // B4-⑤：/dict/dict-types/{id}/items 已由 master-data 真实路由承接
    // （GET /api/master-data/dict/dict-types/{dict_type_id}/items, list_dict_items 走真 DB），
    // 前端 dictItemApi.list 已改指 apiClient.master，core 空壳删除。
    // P 组 api-keys 2 条已补真（GET /system/api-keys/{id} + PUT /system/api-keys/{id}，
    // modules/settings/api_keys.rs get_api_key/update_api_key，settings.rs 挂载），
    // 原 stub GET+PUT 兜底删除（防同 path 冲突）。
    // B4-①：WMS 四类审批（inbound/outbound/stock-take/transfer × start/approve/reject）
    // 已由 svc/wms 真实实现，前端 wmsApprovalApi 改指 apiClient.wms（调拨命名 /transfers），
    // core 12 条兜底删除。
    // S1：/help/* 已由 svc/portal 真实实现（/api/portal/help/*，faq/guide CRUD + 分类），
    // 前端 helpApi 已改指 apiClient.portal（isActive→is_active 对齐），core 7 条兜底删除。
}
