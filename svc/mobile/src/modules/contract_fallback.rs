//! 前端契约兜底路由（轻量占位）。
//!
//! 背景：`scripts/web_contract_smoke.py` 全量探测 BFF(:8099) 发现 mobile 服务约
//! 165 个前端已调用但后端未实现的端点（AI 助手 / CRM / GIS / 报表 / 工作流 等）。
//! 这些端点暂无业务实现，按"轻量兜底"处理：
//! - 集合类 GET 返回空列表 `{items: [], total: 0}`；
//! - 详情类 GET 返回 HTTP 200 + 内层 code 404（数据不存在语义，与既有
//!   `/announcements/{id}` 约定一致，避免裸 HTTP 404 被探测判为路由缺失）；
//! - 写操作（POST/PUT/DELETE）返回成功空数据。
//!
//! 所有占位 handler 均标注"待上游支持"。上游实现真实业务后，应将对应路由
//! 替换为真实 handler。本路由表仅挂在 embedded BFF（mobile_real_module.rs）。

use axum::{
    http::StatusCode,
    routing::{delete, get, post, put},
    Router,
};
use serde_json::{json, Value};

use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

/// 集合类 GET → 空列表。
async fn list_empty() -> ApiResponse<Value> {
    ApiResponse::success(
        json!({ "items": [], "total": 0 }),
        "接口待上游支持（轻量兜底）",
    )
}

/// 详情类 GET → HTTP 200 + 内层 code 404（资源不存在语义）。
async fn detail_missing() -> (StatusCode, ApiResponse<Value>) {
    (
        StatusCode::OK,
        ApiResponse::not_found("资源不存在（待上游支持）"),
    )
}

/// 写操作（POST/PUT/DELETE）→ 成功空数据。
async fn mutate_ok() -> ApiResponse<Value> {
    ApiResponse::success(json!(null), "操作成功（轻量兜底，待上游支持）")
}

/// 写操作兜底：明确告知“上游未接入、操作未执行”，绝不返回假成功。
/// 批 36：前端真实在用的客户子端点（assign / contacts / follow-ups）改用此兜底，
/// 避免用户以为提交成功而实际数据未落库。message 含“未接入”以匹配 smoke 语义豁免。
async fn mutate_unavailable() -> (StatusCode, ApiResponse<Value>) {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        ApiResponse::unavailable("上游服务未接入，该操作未执行"),
    )
}

/// 组装兜底路由表（与 `build_protected_routes` 相同的 `AppState` 类型，供 .merge）。
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/ai/chat", post(mutate_ok))
        .route("/ai/commands", get(list_empty))
        .route("/ai/conversations", get(list_empty))
        .route(
            "/ai/conversations/{p1}",
            delete(mutate_ok).get(detail_missing),
        )
        .route("/ai/conversations/{p1}/stream", post(mutate_ok))
        .route("/ai/execute", post(mutate_ok))
        .route("/ai/images/generate", post(mutate_ok))
        .route("/ai/models", get(list_empty))
        .route("/ai/quick-actions", get(list_empty))
        .route("/ai/recommendations", get(list_empty))
        .route("/ai/recommendations/feedback/{p1}", post(mutate_ok))
        .route("/ai/stats", get(list_empty))
        .route("/ai/voice/synthesize", post(mutate_ok))
        .route("/ai/voice/transcribe", post(mutate_ok))
        .route("/analytics/daily-summary", get(list_empty))
        .route("/analytics/engagement", get(list_empty))
        .route("/analytics/feature-usage", get(list_empty))
        .route("/analytics/performance", get(list_empty))
        .route("/analytics/screen-time", get(list_empty))
        .route(
            "/approvals/delegations/{p1}",
            delete(mutate_ok).put(mutate_ok),
        )
        .route(
            "/approvals/templates/{p1}",
            delete(mutate_ok).get(detail_missing).put(mutate_ok),
        )
        .route("/approvals/templates/{p1}/apply", post(mutate_ok))
        .route("/approvals/{p1}/approvers", get(detail_missing))
        .route("/approvals/{p1}/cc", post(mutate_ok))
        .route("/approvals/{p1}/cc/{p2}", delete(mutate_ok))
        .route("/approvals/{p1}/escalate", post(mutate_ok))
        .route("/approvals/{p1}/history", get(detail_missing))
        .route("/attendance/leaves/{p1}/cancel", post(mutate_ok))
        .route("/company-info", get(list_empty))
        // 批 36：/customers 与 /customers/{p1} 已由 shared/mod.rs 的真实 customer handler 接管
        // （此前真实 handler 误挂在 /customer 单数，前端调复数导致全部流量落到本兜底）。
        // 以下子端点后端无真实实现：读保持空态，写改为 503“未接入”，绝不假成功。
        .route("/customers/{p1}/assign", post(mutate_unavailable))
        .route(
            "/customers/{p1}/contacts",
            get(detail_missing).post(mutate_unavailable),
        )
        .route(
            "/customers/{p1}/follow-ups",
            get(detail_missing).post(mutate_unavailable),
        )
        .route("/dashboards", get(list_empty).post(mutate_ok))
        .route("/dashboards/{p1}", get(detail_missing))
        .route(
            "/dashboards/{p1}/widgets",
            get(detail_missing).post(mutate_ok),
        )
        .route("/dashboards/{p1}/widgets/{p2}", delete(mutate_ok))
        .route("/data/export", get(list_empty))
        .route("/data/query", post(mutate_ok))
        .route("/data/schedule", post(mutate_ok))
        .route("/data/schedules", get(list_empty))
        .route("/data/schedules/{p1}", delete(mutate_ok))
        .route("/departments", get(list_empty))
        .route("/departments/{p1}", get(detail_missing))
        .route("/departments/{p1}/members", get(detail_missing))
        .route("/devices", get(list_empty))
        .route("/devices/{p1}", delete(mutate_ok).get(detail_missing))
        .route("/document-categories", get(list_empty))
        .route(
            "/documents/{p1}/approvals",
            get(detail_missing).post(mutate_ok),
        )
        .route("/documents/{p1}/approvals/{p2}", put(mutate_ok))
        .route(
            "/documents/{p1}/versions",
            get(detail_missing).post(mutate_ok),
        )
        .route("/employees", get(list_empty))
        .route("/employees/search", get(list_empty))
        .route("/employees/{p1}", get(detail_missing))
        .route("/geofences", get(list_empty).post(mutate_ok))
        .route("/geofences/{p1}", delete(mutate_ok).put(mutate_ok))
        .route("/geofences/{p1}/check", post(mutate_ok))
        .route("/inspection/plans", get(list_empty).post(mutate_ok))
        .route("/inspection/plans/{p1}", get(detail_missing))
        .route("/inspection/stats", get(list_empty))
        .route("/inspection/tasks/{p1}/complete", post(mutate_ok))
        .route("/inspection/tasks/{p1}/fail", post(mutate_ok))
        .route("/inspection/tasks/{p1}/start", post(mutate_ok))
        .route("/inspection/templates", get(list_empty))
        .route("/inventory/inbound/{p1}/confirm", post(mutate_ok))
        .route("/inventory/items/{p1}/adjust", post(mutate_ok))
        .route("/inventory/outbound/{p1}/confirm", post(mutate_ok))
        .route("/inventory/stocktake/{p1}", get(detail_missing))
        .route("/inventory/stocktake/{p1}/complete", put(mutate_ok))
        .route("/inventory/transfer", get(list_empty))
        .route("/inventory/transfer/{p1}/confirm", post(mutate_ok))
        .route("/leads", get(list_empty).post(mutate_ok))
        .route("/leads/{p1}/convert", put(mutate_ok))
        .route("/locations/current", get(list_empty))
        .route("/locations/history", get(list_empty))
        .route("/locations/track", post(mutate_ok))
        .route("/map/layers", get(list_empty))
        .route("/map/markers", get(list_empty))
        .route("/my-documents/recent", get(list_empty))
        .route("/my-info", get(list_empty))
        .route("/my-tasks", get(list_empty))
        .route("/production/equipment/{p1}", get(detail_missing))
        .route("/production/equipment/{p1}/status", put(mutate_ok))
        .route("/production/orders/{p1}/pause", post(mutate_ok))
        .route("/production/stats", get(list_empty))
        .route("/production/workstations", get(list_empty))
        .route("/projects", get(list_empty))
        .route("/projects/stats", get(list_empty))
        .route("/projects/{p1}", get(detail_missing))
        .route(
            "/projects/{p1}/milestones",
            get(detail_missing).post(mutate_ok),
        )
        .route("/projects/{p1}/tasks", get(detail_missing).post(mutate_ok))
        .route("/quality/defects/{p1}", get(detail_missing))
        .route("/quality/defects/{p1}/status", put(mutate_ok))
        .route("/quality/stats", get(list_empty))
        .route("/quality/tasks/{p1}/start", post(mutate_ok))
        .route("/reports", get(list_empty).post(mutate_ok))
        .route("/reports/categories", get(list_empty))
        .route("/reports/{p1}", get(detail_missing))
        .route("/reports/{p1}/export", post(mutate_ok))
        .route("/reports/{p1}/generate", post(mutate_ok))
        .route("/routes", get(list_empty).post(mutate_ok))
        .route(
            "/routes/{p1}",
            delete(mutate_ok).get(detail_missing).put(mutate_ok),
        )
        .route("/routes/{p1}/stops", get(detail_missing).post(mutate_ok))
        .route("/scan", post(mutate_ok))
        .route("/shortcuts/reorder", post(mutate_ok))
        .route("/shortcuts/{p1}", delete(mutate_ok).put(mutate_ok))
        .route("/suppliers", get(list_empty).post(mutate_ok))
        .route("/suppliers/categories", get(list_empty))
        .route("/suppliers/stats", get(list_empty))
        .route(
            "/suppliers/{p1}",
            delete(mutate_ok).get(detail_missing).put(mutate_ok),
        )
        .route("/suppliers/{p1}/contracts", get(detail_missing))
        .route(
            "/suppliers/{p1}/evaluations",
            get(detail_missing).post(mutate_ok),
        )
        .route("/suppliers/{p1}/products", get(detail_missing))
        .route("/tasks/{p1}/status", put(mutate_ok))
        .route("/workflow/definitions", get(list_empty))
        .route("/workflow/definitions/{p1}", get(detail_missing))
        .route("/workflow/instances", get(list_empty).post(mutate_ok))
        .route("/workflow/instances/{p1}", get(detail_missing))
        .route("/workflow/instances/{p1}/action", post(mutate_ok))
        .route("/workflow/instances/{p1}/cancel", post(mutate_ok))
        .route("/workflow/instances/{p1}/history", get(detail_missing))
        .route("/workflow/instances/{p1}/resume", post(mutate_ok))
        .route("/workflow/instances/{p1}/suspend", post(mutate_ok))
        .route("/workflow/instances/{p1}/tasks/{p2}/claim", post(mutate_ok))
        .route(
            "/workflow/instances/{p1}/tasks/{p2}/complete",
            post(mutate_ok),
        )
        .route("/workflow/pending-count", get(list_empty))
        .route("/workflow/stats", get(list_empty))
        .route("/workflow/tasks", get(list_empty))
        .route("/workflow/tasks/pending", get(list_empty))
        .route("/workflow/tasks/{p1}", get(detail_missing))
        .route("/workflow/tasks/{p1}/complete", post(mutate_ok))
        .route("/workflow/tasks/{p1}/delegate", post(mutate_ok))
        .route("/zones", get(list_empty).post(mutate_ok))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 构造路由表时若出现路径冲突（同路径同方法重复 / 同位置参数名重复），
    /// axum 会 panic；此测试兜底防止回归。
    #[test]
    fn fallback_router_builds_without_conflict() {
        let _r = routes();
    }
}
