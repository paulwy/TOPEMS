//! Workflow compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/core/flow/*` calls that are not represented by concrete
//! utoipa handlers yet. They do not alter runtime routing behavior.

#[utoipa::path(
    get,
    path = "/api/core/flow/records/{approvalId}",
    tag = "Flow-Compat",
    params(("approvalId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_records_approval_id() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/approval-tasks/{id}/approve",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_approval_tasks_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/approval-tasks/{id}/reject",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_approval_tasks_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/categories/active",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_categories_active() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/categories/{categoryId}/workflows",
    tag = "Flow-Compat",
    params(("categoryId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_categories_category_id_workflows() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/categories/tree",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_categories_tree() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/categories/sort",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_categories_sort() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/workflows/{workflowId}/versions",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_workflows_workflow_id_versions() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/workflows/{workflowId}/versions",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_workflows_workflow_id_versions() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/workflows/{workflowId}/versions/{versionId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("versionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_workflows_workflow_id_versions_version_id() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/workflows/{workflowId}/versions/{versionId}/activate",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("versionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_workflows_workflow_id_versions_version_id_activate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/workflows/{workflowId}/rollback",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_workflows_workflow_id_rollback() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/workflows/{workflowId}/compare/{version1}/{version2}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("version1" = String, Path, description = "路径参数"), ("version2" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_workflows_workflow_id_compare_version1_version2() {}

#[utoipa::path(
    delete,
    path = "/api/core/flow/workflows/{workflowId}/versions/{versionId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("versionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_delete_workflows_workflow_id_versions_version_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/workflows/{id}/export",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_workflows_id_export() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/workflows/import",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_workflows_import() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/workflows/{id}/copy",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_workflows_id_copy() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/delegates/{id}/activate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_delegates_id_activate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/delegates/{id}/deactivate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_delegates_id_deactivate() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/delegates/my",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_delegates_my() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/delegates/my/attorneys",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_delegates_my_attorneys() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/delegates/active",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_delegates_active() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/delegates/{id}/workflows",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_delegates_id_workflows() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/delegates/check/{workflowId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_delegates_check_workflow_id() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{id}/activate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_id_activate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{id}/deactivate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_id_deactivate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{id}/publish",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_id_publish() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{id}/copy",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_id_copy() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-definitions/workflow/{workflowId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_definitions_workflow_workflow_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-definitions/categories",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_definitions_categories() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-definitions/{formId}/versions/{versionId}",
    tag = "Flow-Compat",
    params(("formId" = String, Path, description = "路径参数"), ("versionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_definitions_form_id_versions_version_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-definitions/{formId}/versions",
    tag = "Flow-Compat",
    params(("formId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_definitions_form_id_versions() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{formId}/versions/{versionId}/rollback",
    tag = "Flow-Compat",
    params(("formId" = String, Path, description = "路径参数"), ("versionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_form_id_versions_version_id_rollback() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{id}/preview",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_id_preview() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/{id}/validate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_id_validate() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-definitions/{id}/export",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_definitions_id_export() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-definitions/import",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_definitions_import() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/workflow-instance/{workflowInstanceId}",
    tag = "Flow-Compat",
    params(("workflowInstanceId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_workflow_instance_workflow_instance_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/form-definition/{formDefinitionId}",
    tag = "Flow-Compat",
    params(("formDefinitionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_form_definition_form_definition_id() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-instances/{id}/submit",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_instances_id_submit() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/form-instances/{id}/draft",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_form_instances_id_draft() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/{id}/data",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_id_data() {}

#[utoipa::path(
    put,
    path = "/api/core/flow/form-instances/{id}/data",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_put_form_instances_id_data() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/{id}/history",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_id_history() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/my",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_my() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/my/drafts",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_my_drafts() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/form-instances/{id}/export",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_form_instances_id_export() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/history/instance/{instanceId}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_history_instance_instance_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/history/workflow/{workflowId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_history_workflow_workflow_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/performance",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_performance() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/performance/reset",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_performance_reset() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/health",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_health() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/instances/{id}/activate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_instances_id_activate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/instances/{id}/terminate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_instances_id_terminate() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/instances/{id}/variables",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_instances_id_variables() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/instances/{id}/variables",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_instances_id_variables() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/instances/{id}/tasks",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_instances_id_tasks() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/instances/{id}/history",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_instances_id_history() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/instances/{id}/logs",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_instances_id_logs() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/instances/{id}/diagram",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_instances_id_diagram() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/{id}",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/{id}/history",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_id_history() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/{id}/tasks",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_id_tasks() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/{id}/variables",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_id_variables() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/{id}/diagram",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_id_diagram() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/running",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_running() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/completed",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_completed() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/rejected",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_rejected() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/suspended",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_suspended() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/overdue",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_overdue() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/statistics",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_statistics() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/{workflowId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_workflow_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/{workflowId}/nodes",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_workflow_id_nodes() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/{workflowId}/bottlenecks",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_workflow_id_bottlenecks() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/efficiency",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_efficiency() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/trend",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_trend() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/users",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_users() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/analysis/departments",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_analysis_departments() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/logs",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_logs() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/logs/{id}",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_logs_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/logs/instance/{instanceId}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_logs_instance_instance_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/logs/workflow/{workflowId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_logs_workflow_workflow_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/logs/node/{workflowId}/{nodeId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("nodeId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_logs_node_workflow_id_node_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/logs/user/{userId}",
    tag = "Flow-Compat",
    params(("userId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_logs_user_user_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/realtime",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_realtime() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/dashboard",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_dashboard() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/performance",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_performance() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/sla-compliance",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_sla_compliance() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/monitor/instances/error",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_monitor_instances_error() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/monitor/instances/{id}/retry",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_monitor_instances_id_retry() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/monitor/instances/{id}/skip",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_monitor_instances_id_skip() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/monitor/instances/{id}/force-complete",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_monitor_instances_id_force_complete() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/monitor/instances/{id}/force-terminate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_monitor_instances_id_force_terminate() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/rules/workflow/{workflowId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_rules_workflow_workflow_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/rules/node/{workflowId}/{nodeId}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("nodeId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_rules_node_workflow_id_node_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/rules/type",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_rules_type() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/rules/{id}/activate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_rules_id_activate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/rules/{id}/deactivate",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_rules_id_deactivate() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/rules/batch",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_rules_batch() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/transfer",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_transfer() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/reassign",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_reassign() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/add-sign",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_add_sign() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/counter-sign",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_counter_sign() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/withdraw",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_withdraw() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/return",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_return() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/jump",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_jump() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{id}/urge",
    tag = "Flow-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_id_urge() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/my/involved",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_my_involved() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/my/created",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_my_created() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/{taskId}/comments",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_task_id_comments() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{taskId}/comments",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_task_id_comments() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/{taskId}/attachments",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_task_id_attachments() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{taskId}/attachments",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_task_id_attachments() {}

#[utoipa::path(
    delete,
    path = "/api/core/flow/tasks/{taskId}/attachments/{attachmentId}",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数"), ("attachmentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_delete_tasks_task_id_attachments_attachment_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/{taskId}/form",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_task_id_form() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{taskId}/form",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_task_id_form() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/{taskId}/variables",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_task_id_variables() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/tasks/{taskId}/variables",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_tasks_task_id_variables() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/my/count",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_my_count() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/due-soon",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_due_soon() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/{taskId}/timeline",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_task_id_timeline() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/{taskId}/history",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_task_id_history() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/my/created",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_my_created_2() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/tasks/my/cc",
    tag = "Flow-Compat",
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_tasks_my_cc() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/{endpoint}/{id}",
    tag = "Flow-Compat",
    params(("endpoint" = String, Path, description = "路径参数"), ("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_endpoint_id() {}

#[utoipa::path(
    put,
    path = "/api/core/flow/{endpoint}/{id}",
    tag = "Flow-Compat",
    params(("endpoint" = String, Path, description = "路径参数"), ("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_put_endpoint_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/flow/{endpoint}/{id}",
    tag = "Flow-Compat",
    params(("endpoint" = String, Path, description = "路径参数"), ("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_delete_endpoint_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/instance/{instanceId}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_instance_instance_id() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_instance_instance_id_key() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_variables_instance_instance_id_key() {}

#[utoipa::path(
    delete,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_delete_variables_instance_instance_id_key() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/instance/{instanceId}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_instance_instance_id_2() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_instance_instance_id_key_2() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_variables_instance_instance_id_key_2() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/variables/instance/{instanceId}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_variables_instance_instance_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_delete_variables_instance_instance_id_key_2() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/task/{taskId}",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_task_task_id() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/variables/task/{taskId}/{key}",
    tag = "Flow-Compat",
    params(("taskId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_variables_task_task_id_key() {}

#[utoipa::path(
    post,
    path = "/api/core/flow/variables/global/{workflowId}/{key}",
    tag = "Flow-Compat",
    params(("workflowId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_post_variables_global_workflow_id_key() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/instance/{instanceId}/scope/{scope}",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("scope" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_instance_instance_id_scope_scope() {}

#[utoipa::path(
    get,
    path = "/api/core/flow/variables/instance/{instanceId}/{key}/history",
    tag = "Flow-Compat",
    params(("instanceId" = String, Path, description = "路径参数"), ("key" = String, Path, description = "路径参数")),
    responses((status = 200, description = "Workflow compatibility endpoint"))
)]
pub async fn compat_get_variables_instance_instance_id_key_history() {}
