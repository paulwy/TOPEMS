use axum::extract::State;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;
use topems_shared_core::response::{api_error, ApiResponse};

// ===== 前端契约兜底（workflow 批次）=====
// 这些端点前端已调用，但 unified-core 暂无对应 handler/表（真实能力归属后续上游）。
// 按契约策略：集合类返回分页空壳、写操作返回成功回执、详情类返回内层 404，禁止裸 404。

/// 集合/查询类兜底：分页空壳。待上游支持。
async fn stub_list(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"items": [], "total": 0, "page": 1, "page_size": 20}),
        "待上游支持",
    ))
}

/// 写操作（POST/PUT/DELETE）兜底：成功回执。待上游支持。
async fn stub_action(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"success": true}),
        "待上游支持",
    ))
}

/// 详情类兜底：HTTP200 + 内层 404。待上游支持。
async fn stub_detail(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(api_error(404, "数据不存在"))
}

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
        // ===== Flow category（分类管理，契约 workflow/category.ts）=====
        .route("/categories", get(modules::flow::category::list_categories))
        .route(
            "/categories/active",
            get(modules::flow::category::list_active_categories),
        )
        .route(
            "/categories/tree",
            get(modules::flow::category::get_category_tree),
        )
        .route(
            "/categories/{id}",
            get(modules::flow::category::get_category),
        )
        .route(
            "/categories/{id}/workflows",
            get(modules::flow::category::get_category_workflows),
        )
        // ===== Flow variable（变量管理，契约 workflow/variable.ts）=====
        .route(
            "/variables/instance/{instance_id}",
            get(modules::flow::variable::list_instance_variables),
        )
        .route(
            "/variables/instance/{instance_id}/{key}",
            get(modules::flow::variable::get_instance_variable),
        )
        .route(
            "/variables/instance/{instance_id}/scope/{scope}",
            get(modules::flow::variable::get_variables_by_scope),
        )
        .route(
            "/variables/instance/{instance_id}/{key}/history",
            get(modules::flow::variable::get_variable_history),
        )
        .route(
            "/variables/task/{task_id}",
            get(modules::flow::variable::list_task_variables),
        )
        .route(
            "/variables/global/{workflow_id}",
            get(modules::flow::variable::get_global_variables),
        )
        // ===== Flow delegate（审批委托，契约 workflow/delegate.ts）=====
        .route("/delegates", get(modules::flow::delegate::list_delegates))
        .route(
            "/delegates/my",
            get(modules::flow::delegate::get_my_delegates),
        )
        .route(
            "/delegates/my/attorneys",
            get(modules::flow::delegate::get_my_attorneys),
        )
        .route(
            "/delegates/active",
            get(modules::flow::delegate::get_active_delegate),
        )
        .route(
            "/delegates/check/{workflowId}",
            get(modules::flow::delegate::check_delegation),
        )
        .route(
            "/delegates/{id}",
            get(modules::flow::delegate::get_delegate),
        )
        .route(
            "/delegates/{id}/workflows",
            get(modules::flow::delegate::get_delegate_workflows),
        )
        // ===== Flow rule（条件规则，契约 workflow/rule.ts）=====
        .route("/rules", get(modules::flow::rule::list_rules))
        .route(
            "/rules/workflow/{workflowId}",
            get(modules::flow::rule::get_rules_by_workflow),
        )
        .route(
            "/rules/node/{workflowId}/{nodeId}",
            get(modules::flow::rule::get_rules_by_node),
        )
        .route("/rules/type", get(modules::flow::rule::get_rules_by_type))
        .route("/rules/{id}", get(modules::flow::rule::get_rule))
        // ===== 前端契约 GET 兜底（workflow 批次，待上游支持）=====
        // 定义/版本对比、导出
        .route(
            "/workflows/{id}/compare/{sub}/{extra}",
            get(stub_list),
        )
        .route("/workflows/{id}/export", get(stub_list))
        // 表单定义 + 表单实例（CRUD 查询侧）
        .route("/form-definitions", get(stub_list))
        .route("/form-definitions/{id}", get(stub_detail))
        .route("/form-definitions/workflow/{id}", get(stub_list))
        .route("/form-definitions/categories", get(stub_list))
        .route("/form-definitions/{id}/versions", get(stub_list))
        .route("/form-definitions/{id}/versions/{sub}", get(stub_detail))
        .route("/form-definitions/{id}/export", get(stub_list))
        .route("/form-instances", get(stub_list))
        .route("/form-instances/{id}", get(stub_detail))
        .route("/form-instances/workflow-instance/{id}", get(stub_list))
        .route("/form-instances/form-definition/{id}", get(stub_list))
        .route("/form-instances/{id}/data", get(stub_detail))
        .route("/form-instances/{id}/history", get(stub_list))
        .route("/form-instances/my", get(stub_list))
        .route("/form-instances/my/drafts", get(stub_list))
        .route("/form-instances/{id}/export", get(stub_list))
        // 性能 / 健康
        .route("/performance", get(stub_list))
        .route("/health", get(stub_list))
        // 实例详情扩展（变量/任务/历史/日志/流程图）
        .route("/instances/{id}/variables", get(stub_list))
        .route("/instances/{id}/tasks", get(stub_list))
        .route("/instances/{id}/history", get(stub_list))
        .route("/instances/{id}/logs", get(stub_list))
        .route("/instances/{id}/diagram", get(stub_list))
        // 监控实例详情 + 分析（复用真实 handler）
        .route(
            "/monitor/instances/{id}",
            get(modules::flow::instance::get_instance),
        )
        .route("/monitor/instances/{id}/history", get(stub_list))
        .route("/monitor/instances/{id}/tasks", get(stub_list))
        .route("/monitor/instances/{id}/variables", get(stub_list))
        .route("/monitor/instances/{id}/diagram", get(stub_list))
        .route(
            "/monitor/analysis/{id}",
            get(modules::flow::monitor::get_workflow_analysis),
        )
        .route(
            "/monitor/analysis/{id}/nodes",
            get(modules::flow::monitor::get_node_statistics),
        )
        .route(
            "/monitor/analysis/{id}/bottlenecks",
            get(modules::flow::monitor::get_bottleneck_analysis),
        )
        .route(
            "/monitor/analysis/trend",
            get(modules::flow::monitor::get_trend_data),
        )
        .route(
            "/monitor/analysis/users",
            get(modules::flow::monitor::get_user_stats),
        )
        .route(
            "/monitor/analysis/departments",
            get(modules::flow::monitor::get_department_stats),
        )
        .route("/monitor/logs/node/{id}/{sub}", get(stub_list))
        .route(
            "/monitor/sla-compliance",
            get(modules::flow::monitor::get_sla_compliance),
        )
        // 任务详情扩展（评论/附件/表单/变量/时间线/历史）
        .route("/tasks/{id}/comments", get(stub_list))
        .route("/tasks/{id}/attachments", get(stub_list))
        .route("/tasks/{id}/form", get(stub_detail))
        .route("/tasks/{id}/variables", get(stub_list))
        .route("/tasks/{id}/timeline", get(stub_list))
        .route("/tasks/{id}/history", get(stub_list))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:read"),
        ));

    let write = Router::new()
        // ===== Flow category 写操作 =====
        .route(
            "/categories",
            post(modules::flow::category::create_category),
        )
        .route(
            "/categories/sort",
            post(modules::flow::category::sort_categories),
        )
        .route(
            "/categories/{id}",
            put(modules::flow::category::update_category)
                .delete(modules::flow::category::delete_category),
        )
        // ===== Flow variable 写操作 =====
        .route(
            "/variables/instance/{instance_id}",
            post(modules::flow::variable::set_instance_variables_batch),
        )
        .route(
            "/variables/instance/{instance_id}/{key}",
            post(modules::flow::variable::set_instance_variable)
                .delete(modules::flow::variable::delete_instance_variable),
        )
        .route(
            "/variables/task/{task_id}/{key}",
            post(modules::flow::variable::set_task_variable),
        )
        .route(
            "/variables/global/{workflow_id}/{key}",
            post(modules::flow::variable::set_global_variable),
        )
        // ===== Flow delegate 写操作 =====
        .route("/delegates", post(modules::flow::delegate::create_delegate))
        .route(
            "/delegates/{id}/activate",
            post(modules::flow::delegate::activate_delegate),
        )
        .route(
            "/delegates/{id}/deactivate",
            post(modules::flow::delegate::deactivate_delegate),
        )
        .route(
            "/delegates/{id}",
            put(modules::flow::delegate::update_delegate)
                .delete(modules::flow::delegate::delete_delegate),
        )
        // ===== Flow rule 写操作 =====
        .route("/rules", post(modules::flow::rule::create_rule))
        .route(
            "/rules/batch-update",
            post(modules::flow::rule::batch_update_rules),
        )
        .route(
            "/rules/{id}/activate",
            post(modules::flow::rule::activate_rule),
        )
        .route(
            "/rules/{id}/deactivate",
            post(modules::flow::rule::deactivate_rule),
        )
        .route(
            "/rules/{id}",
            put(modules::flow::rule::update_rule).delete(modules::flow::rule::delete_rule),
        )
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
        // ===== 前端契约写操作兜底（workflow 批次，待上游支持）=====
        .route("/workflows/{id}/copy", post(stub_action))
        // 表单定义 + 表单实例（写侧）
        .route("/form-definitions", post(stub_action))
        .route("/form-definitions/{id}", put(stub_action))
        .route("/form-definitions/{id}", delete(stub_action))
        .route("/form-definitions/{id}/activate", post(stub_action))
        .route("/form-definitions/{id}/deactivate", post(stub_action))
        .route("/form-definitions/{id}/publish", post(stub_action))
        .route("/form-definitions/{id}/copy", post(stub_action))
        .route("/form-definitions/{id}/validate", post(stub_action))
        .route("/form-definitions/{id}/preview", post(stub_action))
        .route(
            "/form-definitions/{id}/versions/{sub}/rollback",
            post(stub_action),
        )
        .route("/form-definitions/import", post(stub_action))
        .route("/form-instances", post(stub_action))
        .route("/form-instances/{id}", put(stub_action))
        .route("/form-instances/{id}", delete(stub_action))
        .route("/form-instances/{id}/submit", post(stub_action))
        .route("/form-instances/{id}/draft", post(stub_action))
        .route("/form-instances/{id}/data", put(stub_action))
        // 性能重置
        .route("/performance/reset", post(stub_action))
        // 实例动作
        .route("/instances/{id}/activate", post(stub_action))
        .route("/instances/{id}/terminate", post(stub_action))
        .route("/instances/{id}/variables", post(stub_action))
        // 监控强制完成/终止（复用真实 handler）
        .route(
            "/monitor/instances/{id}/force-complete",
            post(modules::flow::monitor::force_complete),
        )
        .route(
            "/monitor/instances/{id}/force-terminate",
            post(modules::flow::monitor::force_terminate),
        )
        // 规则测试
        .route("/rules/{id}/test", post(stub_action))
        // 任务动作扩展
        .route("/tasks/{id}/transfer", post(stub_action))
        .route("/tasks/{id}/reassign", post(stub_action))
        .route("/tasks/{id}/add-sign", post(stub_action))
        .route("/tasks/{id}/counter-sign", post(stub_action))
        .route("/tasks/{id}/withdraw", post(stub_action))
        .route("/tasks/{id}/return", post(stub_action))
        .route("/tasks/{id}/jump", post(stub_action))
        .route("/tasks/{id}/urge", post(stub_action))
        .route("/tasks/{id}/comments", post(stub_action))
        .route("/tasks/{id}/attachments", post(stub_action))
        .route("/tasks/{id}/attachments/{sub}", delete(stub_action))
        .route("/tasks/{id}/form", post(stub_action))
        .route("/tasks/{id}/variables", post(stub_action))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:write"),
        ));

    read.merge(write)
}
