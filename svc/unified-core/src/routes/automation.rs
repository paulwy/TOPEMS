//! Automation 编排模块路由（V66.1：planned 阶段占位，501 Not Implemented）
//!
//! 注册路径：`/api/core/automation/*`（Group1 虚拟服务，由 unified-core 承载）
//! Status: planned — 真实路由待后端自动化引擎立项后实现。
//! 所有 handler 当前均返回 501 Not Implemented + JSON 状态说明。

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{delete, get, post, put},
    Router,
};
use serde_json::json;

use crate::AppState;

/// 501 Not Implemented 通用响应
fn not_implemented(feature: &'static str) -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "code": 501,
            "status": "planned",
            "message": format!("{feature} not implemented — automation engine is planned"),
        })),
    )
}

/// Designer 设计器页面元数据
async fn get_designer_schema() -> impl IntoResponse {
    not_implemented("Designer schema API")
}

/// 规则列表
async fn list_rules() -> impl IntoResponse {
    not_implemented("Rules list")
}

/// 规则详情
async fn get_rule() -> impl IntoResponse {
    not_implemented("Rule detail")
}

/// 创建规则
async fn create_rule() -> impl IntoResponse {
    not_implemented("Create rule")
}

/// 更新规则
async fn update_rule() -> impl IntoResponse {
    not_implemented("Update rule")
}

/// 删除规则
async fn delete_rule() -> impl IntoResponse {
    not_implemented("Delete rule")
}

/// 运行历史
async fn list_runs() -> impl IntoResponse {
    not_implemented("Runs history")
}

/// 变量列表
async fn list_variables() -> impl IntoResponse {
    not_implemented("Variables list")
}

/// Automation dashboard 概览
async fn get_dashboard() -> impl IntoResponse {
    not_implemented("Automation dashboard")
}

/// 构建 automation 路由（Group1：注册在 /api/core/automation/*）
///
/// 注：auth 中间件由 routes/mod.rs 调用方统一包裹（参考 monitor/master/plugin 模式）
pub fn automation_routes(_state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/automation/dashboard", get(get_dashboard))
        .route("/automation/designer/schema", get(get_designer_schema))
        .route("/automation/rules", get(list_rules))
        .route("/automation/rules", post(create_rule))
        .route("/automation/rules/:id", get(get_rule))
        .route("/automation/rules/:id", put(update_rule))
        .route("/automation/rules/:id", delete(delete_rule))
        .route("/automation/runs", get(list_runs))
        .route("/automation/variables", get(list_variables))
}
