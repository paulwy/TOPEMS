//! HRM 角色（Role）前端契约兜底模块
//!
//! 【DEPRECATED 2026-10-21 批6/P2-10】本模块为「契约兜底」空桩（前端 roleApi 由
//! createCrudApi 合成 5 端点、adminApi 契约引用但无页面 UI 消费）。HRM 无独立角色
//! 资源表，角色/权限统一由 IAM 承载；本模块按"死代码端点轻量兜底"策略保留挂载，
//! 避免 BFF catch-all 裸 404。后续角色资源落地（IAM 侧）时应由真实实现替换，
//! 或确认前端角色管理页上线后再行迁移，勿删除挂载（契约在则需响应）。
//!
//! 前端 `roleApi = createCrudApi<Role>('/roles')` 合成了 5 个标准 CRUD 端点，
//! 但 HRM 侧暂无独立的角色资源表（权限/角色统一由 IAM 承载）。本模块按
//! "死代码端点轻量兜底" 策略补挂路由，避免 BFF catch-all 裸 404：
//!   - 列表类：返回空分页集合；
//!   - 详情类：HTTP 200 + 内层 code=404（数据不存在的正常业务语义）；
//!   - 写操作（创建/更新/删除）：不落地，返回成功回执并标注"待上游支持"。
//!
//! 注释中标注 TODO 的端点待上游（角色资源落地后）替换为真实实现。

use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use super::ApiState;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/roles", get(list_roles).post(create_role))
        .route(
            "/roles/{id}",
            get(get_role).put(update_role).delete(delete_role),
        )
}

/// GET /roles — 角色列表（集合类空列表兜底，待上游支持）
pub async fn list_roles(State(_state): State<ApiState>) -> ApiResponse<serde_json::Value> {
    // 待上游支持：角色资源落地后改为真实分页查询
    ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20
        }),
        "查询成功",
    )
}

/// GET /roles/{id} — 角色详情（详情类：HTTP 200 + 内层 404）
pub async fn get_role(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    // 待上游支持：角色资源落地后改为按 id 查询
    api_error(404, &format!("角色不存在: {id}"))
}

/// POST /roles — 创建角色（轻量兜底，不落地，待上游支持）
pub async fn create_role(
    State(_state): State<ApiState>,
    Json(_body): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // 待上游支持：角色资源落地后改为真实创建
    ApiResponse::success_no_data("角色创建已记录（待上游支持）")
}

/// PUT /roles/{id} — 更新角色（轻量兜底，不落地，待上游支持）
pub async fn update_role(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(_body): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // 待上游支持：角色资源落地后改为真实更新
    ApiResponse::success_no_data(&format!("角色更新已记录（待上游支持）: {id}"))
}

/// DELETE /roles/{id} — 删除角色（轻量兜底，不落地，待上游支持）
pub async fn delete_role(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    // 待上游支持：角色资源落地后改为真实删除
    ApiResponse::success_no_data(&format!("角色删除已记录（待上游支持）: {id}"))
}
