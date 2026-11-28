pub mod apqp;
pub mod apqp_approval_status;
pub mod apqp_item_status;
pub mod audit;
pub mod audit_finding_status;
pub mod audit_plan_status;
pub mod audit_task_status;
pub mod corrective_action;
pub mod dashboard;
pub mod data_sync;
pub mod eight_d;
pub mod fmea;
pub mod inspection_standard;
pub mod qms_plugin;
pub mod qms_status;
pub mod quality_cost;
pub mod quality_dashboard;
pub mod quality_inspection;
pub mod quality_issue;
pub mod quality_standard;
pub mod quality_task;
pub mod spc;

use crate::AppState;
use axum::Router;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .merge(quality_standard::create_routes())
        .merge(inspection_standard::create_routes())
        .merge(quality_inspection::create_routes())
        .merge(quality_issue::create_routes())
        .merge(dashboard::create_routes())
        .merge(corrective_action::create_routes())
        .merge(audit::create_routes())
        .merge(data_sync::create_routes())
        .merge(spc::create_routes())
        .merge(quality_cost::create_routes())
        .merge(eight_d::create_routes())
        .merge(fmea::create_routes())
        .merge(quality_dashboard::create_routes())
        .merge(apqp::create_routes())
        .merge(qms_plugin::create_routes())
        .route(
            "/health",
            axum::routing::get(qms_plugin::qms_health),
        )
        .merge(quality_task::create_routes())
        // integration 编排侧 internal 接收端点（/api/internal/ 已在 auth 白名单）
        .merge(integration::integration_routes())
}

pub mod integration;
