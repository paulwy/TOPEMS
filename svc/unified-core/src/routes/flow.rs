use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn flow_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("/tasks", get(modules::flow::task::list_tasks))
        .route("/tasks/my", get(modules::flow::task::my_tasks))
        .route(
            "/tasks/my/pending",
            get(modules::flow::task::my_pending_tasks),
        )
        .route(
            "/tasks/my/completed",
            get(modules::flow::task::my_completed_tasks),
        )
        .route("/tasks/my/involved", get(modules::flow::task::my_tasks))
        .route("/tasks/my/created", get(modules::flow::task::my_tasks))
        .route("/tasks/my/count", get(modules::flow::task::get_task_count))
        .route("/tasks/my/stats", get(modules::flow::task::get_task_stats))
        .route("/tasks/my/cc", get(modules::flow::task::my_tasks))
        .route(
            "/tasks/candidate",
            get(modules::flow::task::candidate_tasks),
        )
        .route("/tasks/count", get(modules::flow::task::get_task_count))
        .route(
            "/tasks/high-priority",
            get(modules::flow::task::high_priority_tasks),
        )
        .route("/tasks/overdue", get(modules::flow::task::overdue_tasks))
        .route("/tasks/{id}", get(modules::flow::task::get_task))
        .route("/workflows", get(modules::flow::workflow::list_workflows))
        .route(
            "/workflows/{id}",
            get(modules::flow::workflow::get_workflow),
        )
        .route(
            "/workflows/{workflow_id}/versions",
            get(modules::flow::workflow::list_workflow_versions),
        )
        .route(
            "/workflows/{workflow_id}/versions/{version_id}",
            get(modules::flow::workflow::get_workflow_version),
        )
        .route("/instances", get(modules::flow::instance::list_instances))
        .route(
            "/instances/{id}",
            get(modules::flow::instance::get_instance),
        )
        .route(
            "/instances/{id}/details",
            get(modules::flow::instance::get_instance_details),
        )
        .route(
            "/monitor/instances/error",
            get(modules::flow::instance::error_instances),
        )
        .route(
            "/monitor/instances/overdue",
            get(modules::flow::instance::overdue_instances),
        )
        .route(
            "/monitor/instances",
            get(modules::flow::monitor::list_monitor_instances),
        )
        .route(
            "/monitor/instances/running",
            get(modules::flow::monitor::running_instances),
        )
        .route(
            "/monitor/instances/completed",
            get(modules::flow::monitor::completed_instances),
        )
        .route(
            "/monitor/instances/rejected",
            get(modules::flow::monitor::rejected_instances),
        )
        .route(
            "/monitor/instances/suspended",
            get(modules::flow::monitor::suspended_instances),
        )
        .route(
            "/monitor/statistics",
            get(modules::flow::monitor::get_monitor_statistics),
        )
        .route(
            "/monitor/analysis",
            get(modules::flow::monitor::get_workflow_analysis),
        )
        .route(
            "/monitor/analysis/nodes",
            get(modules::flow::monitor::get_node_statistics),
        )
        .route(
            "/monitor/analysis/bottleneck",
            get(modules::flow::monitor::get_bottleneck_analysis),
        )
        .route(
            "/monitor/analysis/efficiency",
            get(modules::flow::monitor::get_efficiency_analysis),
        )
        .route(
            "/monitor/trends",
            get(modules::flow::monitor::get_trend_data),
        )
        .route(
            "/monitor/users",
            get(modules::flow::monitor::get_user_stats),
        )
        .route(
            "/monitor/departments",
            get(modules::flow::monitor::get_department_stats),
        )
        .route("/monitor/logs", get(modules::flow::monitor::list_logs))
        .route("/monitor/logs/{id}", get(modules::flow::monitor::get_log))
        .route(
            "/monitor/logs/instance/{id}",
            get(modules::flow::monitor::get_logs_by_instance),
        )
        .route(
            "/monitor/logs/workflow/{id}",
            get(modules::flow::monitor::get_logs_by_workflow),
        )
        .route(
            "/monitor/logs/node/{id}",
            get(modules::flow::monitor::get_logs_by_node),
        )
        .route(
            "/monitor/logs/user/{id}",
            get(modules::flow::monitor::get_logs_by_user),
        )
        .route(
            "/monitor/realtime",
            get(modules::flow::monitor::get_realtime_stats),
        )
        .route(
            "/monitor/dashboard",
            get(modules::flow::monitor::get_dashboard_data),
        )
        .route(
            "/monitor/performance",
            get(modules::flow::monitor::get_performance_metrics),
        )
        .route(
            "/monitor/sla",
            get(modules::flow::monitor::get_sla_compliance),
        )
        .route(
            "/approvals/pending",
            get(modules::flow::approval::list_pending_approvals),
        )
        .route("/approvals", get(modules::flow::approval::list_approvals))
        .route(
            "/approvals/{id}",
            get(modules::flow::approval::get_approval),
        )
        .route(
            "/approval-tasks",
            get(modules::flow::approval::list_approval_tasks),
        )
        .route(
            "/approval-tasks/{id}",
            get(modules::flow::approval::get_approval_task),
        )
        .route("/templates", get(modules::flow::template::list_templates))
        .route(
            "/templates/{id}",
            get(modules::flow::template::get_template),
        )
        .route(
            "/templates/{id}/export",
            get(modules::flow::template::export_template),
        )
        .route("/history", get(modules::flow::history::list_history))
        .route("/history/{id}", get(modules::flow::history::get_history))
        .route(
            "/history/instance/{instance_id}",
            get(modules::flow::history::get_instance_history),
        )
        .route(
            "/history/workflow/{workflow_id}",
            get(modules::flow::history::get_workflow_history),
        )
        .route("/records", get(modules::flow::record::list_records))
        .route(
            "/records/{approval_id}",
            get(modules::flow::record::get_record),
        )
        .route(
            "/statistics",
            get(modules::flow::statistics::get_statistics),
        )
        .route("/settings", get(modules::flow::setting::list_settings))
        .route("/settings/{id}", get(modules::flow::setting::get_setting))
        .route(
            "/settings/key/{key}",
            get(modules::flow::setting::get_setting_by_key),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:read"),
        ));

    let write = Router::new()
        .route("/tasks/{id}/claim", post(modules::flow::task::claim_task))
        .route(
            "/tasks/{id}/unclaim",
            post(modules::flow::task::unclaim_task),
        )
        .route(
            "/tasks/{id}/complete",
            post(modules::flow::task::complete_task),
        )
        .route(
            "/tasks/{id}/approve",
            post(modules::flow::task::approve_task),
        )
        .route("/tasks/{id}/reject", post(modules::flow::task::reject_task))
        .route(
            "/tasks/{id}/delegate",
            post(modules::flow::task::delegate_task),
        )
        .route(
            "/tasks/batch/approve",
            post(modules::flow::task::batch_approve),
        )
        .route(
            "/tasks/batch/complete",
            post(modules::flow::task::batch_complete),
        )
        .route(
            "/tasks/batch/delegate",
            post(modules::flow::task::batch_delegate),
        )
        .route("/workflows", post(modules::flow::workflow::create_workflow))
        .route(
            "/workflows/{id}",
            put(modules::flow::workflow::update_workflow)
                .delete(modules::flow::workflow::delete_workflow),
        )
        .route(
            "/workflows/{id}/publish",
            post(modules::flow::workflow::publish_workflow),
        )
        .route(
            "/workflows/{id}/unpublish",
            post(modules::flow::workflow::unpublish_workflow),
        )
        .route(
            "/workflows/{id}/activate",
            post(modules::flow::workflow::activate_workflow),
        )
        .route(
            "/workflows/{id}/deactivate",
            post(modules::flow::workflow::deactivate_workflow),
        )
        .route(
            "/workflows/{id}/deploy",
            post(modules::flow::workflow::deploy_workflow),
        )
        .route(
            "/workflows/{workflow_id}/rollback",
            post(modules::flow::workflow::rollback_workflow),
        )
        .route("/instances", post(modules::flow::instance::create_instance))
        .route(
            "/instances/{id}/start",
            post(modules::flow::instance::start_instance),
        )
        .route(
            "/instances/{id}/approve",
            post(modules::flow::instance::approve_instance),
        )
        .route(
            "/instances/{id}/reject",
            post(modules::flow::instance::reject_instance),
        )
        .route(
            "/instances/{id}/cancel",
            post(modules::flow::instance::cancel_instance),
        )
        .route(
            "/instances/{id}/resume",
            post(modules::flow::instance::resume_instance),
        )
        .route(
            "/instances/{id}/suspend",
            post(modules::flow::instance::suspend_instance),
        )
        .route(
            "/approvals/{id}/approve",
            post(modules::flow::approval::approve_task),
        )
        .route(
            "/approvals/{id}/reject",
            post(modules::flow::approval::reject_task),
        )
        .route("/approvals", post(modules::flow::approval::create_approval))
        .route(
            "/approvals/{id}/process",
            post(modules::flow::approval::process_approval),
        )
        .route(
            "/approval-tasks/{id}/approve",
            post(modules::flow::approval::approve_task),
        )
        .route(
            "/approval-tasks/{id}/reject",
            post(modules::flow::approval::reject_task),
        )
        .route(
            "/approval-tasks/{id}/claim",
            post(modules::flow::approval::claim_task),
        )
        .route(
            "/approval-tasks/{id}/unclaim",
            post(modules::flow::approval::unclaim_task),
        )
        .route(
            "/approval-tasks/{id}/delegate",
            post(modules::flow::approval::delegate_task),
        )
        .route(
            "/approval-tasks/{id}/reassign",
            post(modules::flow::approval::reassign_task),
        )
        .route("/templates", post(modules::flow::template::create_template))
        .route(
            "/templates/{id}",
            put(modules::flow::template::update_template),
        )
        .route(
            "/templates/{id}/copy",
            post(modules::flow::template::copy_template),
        )
        .route(
            "/templates/import",
            post(modules::flow::template::import_template),
        )
        .route(
            "/settings/{id}",
            put(modules::flow::setting::update_setting),
        )
        .route(
            "/settings/{id}/reset",
            post(modules::flow::setting::reset_setting),
        )
        .route(
            "/settings/batch",
            post(modules::flow::setting::batch_update_settings),
        )
        .route(
            "/workflows/{workflow_id}/versions",
            post(modules::flow::workflow::create_workflow_version),
        )
        .route(
            "/workflows/{workflow_id}/versions/{version_id}/activate",
            post(modules::flow::workflow::activate_workflow_version),
        )
        .route(
            "/workflows/{workflow_id}/versions/{version_id}",
            delete(modules::flow::workflow::delete_workflow_version),
        )
        .route(
            "/monitor/instances/{id}/retry",
            post(modules::flow::instance::retry_instance),
        )
        .route(
            "/monitor/instances/{id}/skip",
            post(modules::flow::monitor::skip_node),
        )
        .route(
            "/monitor/instances/{id}/complete",
            post(modules::flow::monitor::force_complete),
        )
        .route(
            "/monitor/instances/{id}/terminate",
            post(modules::flow::monitor::force_terminate),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:write"),
        ));

    read.merge(write)
}
