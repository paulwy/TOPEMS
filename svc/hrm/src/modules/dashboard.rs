//! HRM 工作台概览（/dashboard）前端契约兜底模块
//!
//! 前端 `hrmDashboardApi.getOverview()` 调用 `GET /api/hrm/dashboard`，
//! 但 HRM 侧原无该路由（前端注释标注"@deprecated 无页面消费，后端无 /dashboard 路由"）。
//! 按"死代码端点轻量兜底"策略补挂，返回零值统计结构（与前端 HrmDashboardStats 对齐），
//! 待上游支持后替换为真实聚合。

use axum::{extract::State, routing::get, Router};

use super::ApiState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/dashboard", get(get_dashboard))
}

/// GET /dashboard — HRM 工作台概览（零值兜底，待上游支持）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:dashboard:read"])),
    path = "/dashboard",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "dashboard"
)]
pub async fn get_dashboard(State(_state): State<ApiState>) -> ApiResponse<serde_json::Value> {
    // 待上游支持：替换为员工/在职/请假/薪资等真实聚合统计
    ApiResponse::success(
        serde_json::json!({
            "total_employees": 0,
            "new_hires": 0,
            "on_leave": 0,
            "avg_salary": 0,
            "department_distribution": [],
            "hire_trend": [],
            "education_distribution": []
        }),
        "获取工作台概览成功",
    )
}
