//! 前端契约兜底路由（web 契约收口批次）。
//!
//! 背景：scripts/web_contract_smoke.py 探测 BFF(:8099) 发现 core 服务一批前端已调用、
//! 但 unified-core 路由树未挂载的端点（copilot / forms / documents / governance /
//! comments / favorites / search / dict / tenant 管理台 / wms 审批等）。这些域的真实
//! 业务能力归属于独立 AI / 租户管理 / WMS 服务，BFF core 侧暂无对应 handler 与表。
//!
//! 策略（对齐任务约束「禁止裸 404」）：对暂无上游实现的死代码端点做轻量兜底。
//! P2-7 诚实性收口：仅存的 2 条 copilot 契约端点（前端 hook 活调、svc/ai 未实现子路径）
//! 不再返回 success:true 假成功回执，改为 success:false + code:501（Not Implemented），
//! 路由保持挂载避免 route_missing；其余域的兜底端点已全部由真实服务承接并删除。
//! 已存在真实 handler / 表的端点（audit operations、system config、
//! settings/smtp、api-keys 等）走真实修复，不在本兜底内。
//!
//! 注意：本路由树在嵌入模式被 BFF nest 到 /api/core 之下，故路径一律相对根（不带 /api/core）。

use axum::extract::State;
use axum::routing::{delete, get};
use axum::{Json, Router};

use crate::AppState;
use topems_shared_core::response::ApiResponse;

/// P2-7 诚实 501：DELETE /copilot/sessions/{id}。
/// 删除会话能力归属 svc/ai（DELETE /dsh/copilot/sessions/{id}），core 不承载会话存储，
/// 不再返回 success:true 假成功回执；前端 businessCopilot.deleteSession（api/ai/businessCopilot.ts:214）
/// 待 svc/ai 实现该子路径后改指 apiClient.ai。
async fn not_implemented_copilot_session_delete(
    _state: State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::error(
        501,
        "删除 Copilot 会话未实现：能力归属 svc/ai（DELETE /dsh/copilot/sessions/{id}），core 无会话存储（Not Implemented）",
    ))
}

/// P2-7 诚实 501：GET /copilot/modules/{id}/faq。
/// FAQ 查询能力归属 svc/ai（GET /dsh/copilot/modules/{id}/faq），core 无 FAQ 数据源，
/// 不再返回空分页假成功；前端 businessCopilot.searchFAQ（api/ai/businessCopilot.ts:260）
/// 待 svc/ai 实现该子路径后改指 apiClient.ai。
async fn not_implemented_copilot_faq(
    _state: State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::error(
        501,
        "查询 Copilot FAQ 未实现：能力归属 svc/ai（GET /dsh/copilot/modules/{id}/faq），core 无 FAQ 数据源（Not Implemented）",
    ))
}

/// 注册全部契约兜底路由。
#[allow(clippy::too_many_lines)]
pub fn contract_stub_routes() -> Router<AppState> {
    Router::new()
        // S2：copilot/forms/documents 前端死封装清理——实证 hook 层活调保留 2 条路由挂载
        // （deleteSession :useBusinessCopilot.ts:282 / searchFAQ :258，svc/ai 未实现子路径）。
        // P2-7 诚实性收口：两条均不再返回 success:true 假成功回执，改 success:false +
        // code:501 Not Implemented；其余 6 条（getSession + getFormDefinition + documents
        // parse/summary×2/search）页面+hook 零调用，core 兜底同步删除（防 gate 缺口）。
        // B4 第一批：dashboard/score/risk/compliance/cost/performance/security-events/audit/
        // recommendations 前端已改走 svc/ai `/dsh/governance/*`，core 兜底删除；
        // 仅 trends(GET)、refresh(POST) 仍由 core 承载，保留。
        .route(
            "/copilot/sessions/{id}",
            delete(not_implemented_copilot_session_delete),
        )
        .route(
            "/copilot/modules/{id}/faq",
            get(not_implemented_copilot_faq),
        )
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
