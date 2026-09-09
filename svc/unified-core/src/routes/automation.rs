//! Automation 编排模块路由
//!
//! 注册路径：`/api/core/automation/*`（Group1 虚拟服务，由 unified-core 承载）
//! 覆盖：规则 CRUD、运行历史、变量管理、设计器画布、仪表盘统计

use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::AppState;

pub fn automation_routes(_state: &AppState) -> Router<AppState> {
    Router::new()
        // Dashboard
        .route("/automation/dashboard/stats", get(crate::modules::automation::get_dashboard_stats))
        .route("/automation/dashboard", get(crate::modules::automation::get_dashboard_stats))
        .route("/automation/health", get(crate::modules::automation::health_check))
        // Designer
        .route("/automation/designer/resources", get(crate::modules::automation::get_designer_resources))
        .route("/automation/designer/schema", get(crate::modules::automation::get_designer_resources))
        .route("/automation/designer/canvas/{rule_id}", get(crate::modules::automation::get_designer_canvas))
        .route("/automation/designer/canvas/{rule_id}", put(crate::modules::automation::save_designer_canvas))
        .route("/automation/designer/canvas/{rule_id}/validate", post(crate::modules::automation::validate_canvas))
        .route("/automation/designer/canvas/{rule_id}/sync-to-rule", post(crate::modules::automation::sync_to_rule))
        .route("/automation/designer/canvas/{rule_id}/sync-from-rule", post(crate::modules::automation::sync_from_rule))
        // Rules CRUD
        .route("/automation/rules", get(crate::modules::automation::list_rules))
        .route("/automation/rules", post(crate::modules::automation::create_rule))
        .route("/automation/rules/by-code/{code}", get(crate::modules::automation::get_rule_by_code))
        .route("/automation/rules/{id}", get(crate::modules::automation::get_rule))
        .route("/automation/rules/{id}", put(crate::modules::automation::update_rule))
        .route("/automation/rules/{id}", delete(crate::modules::automation::delete_rule))
        .route("/automation/rules/{id}/enable", post(crate::modules::automation::enable_rule))
        .route("/automation/rules/{id}/disable", post(crate::modules::automation::disable_rule))
        .route("/automation/rules/{id}/duplicate", post(crate::modules::automation::duplicate_rule))
        .route("/automation/rules/{id}/trigger", post(crate::modules::automation::trigger_rule))
        // Runs
        .route("/automation/runs", get(crate::modules::automation::list_runs))
        .route("/automation/runs/purge", post(crate::modules::automation::purge_runs))
        .route("/automation/runs/{id}", get(crate::modules::automation::get_run))
        .route("/automation/runs/{id}/retry", post(crate::modules::automation::retry_run))
        .route("/automation/runs/{id}/cancel", post(crate::modules::automation::cancel_run))
        .route("/automation/runs/{id}/steps", get(crate::modules::automation::get_run_steps))
        .route("/automation/runs/{id}/logs", get(crate::modules::automation::get_run_logs))
        // Variables
        .route("/automation/variables", get(crate::modules::automation::list_variables))
        .route("/automation/variables", post(crate::modules::automation::create_variable))
        .route("/automation/variables/bulk-import", post(crate::modules::automation::bulk_import_variables))
        .route("/automation/variables/{key}", get(crate::modules::automation::get_variable))
        .route("/automation/variables/{key}", put(crate::modules::automation::update_variable))
        .route("/automation/variables/{key}", delete(crate::modules::automation::delete_variable))
        .route("/automation/variables/{key}/reveal", get(crate::modules::automation::reveal_variable))
}
