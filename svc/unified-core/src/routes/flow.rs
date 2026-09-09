use axum::routing::{get, post, put};
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
            put(modules::flow::workflow::update_workflow),
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
            "/monitor/instances/{id}/retry",
            post(modules::flow::instance::retry_instance),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:write"),
        ));

    read.merge(write)
}
