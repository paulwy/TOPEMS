//! Flow 模块 OpenAPI 文档聚合
//!
//! 汇总 Flow 模块所有 HTTP handler 的路径信息，生成统一的 OpenAPI 规范。
//! 参考 svc/ehs/src/modules/openapi.rs 的 ApiDoc 定义模式。
//
// 路径前缀：/api/core/flow/
// 认证方式：Bearer Token (JWT)
// 权限控制：workflow:read / workflow:write

use utoipa::OpenApi;

use super::models::{
    CreateInstanceRequest, CreateWorkflowRequest, MonthlyData, StatisticsResponse, TaskActionRequest,
    TaskBatchRequest, TaskBatchResult, TaskFailure, TaskStats, UpdateWorkflowRequest, Workflow,
    WorkflowInstance, WorkflowStat, WorkflowTask,
};
use super::approval::{ApprovalTask, ApprovalTaskListResponse};

/// Flow OpenAPI 文档（仅 Flow 模块）
#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS Flow API",
        version = "1.0.0",
        description = "TOPEMS 工作流服务 API - 流程定义、实例、任务、审批管理\n\n所有接口路径前缀: `/api/core/flow`\n认证方式: Bearer Token (JWT)",
    ),
    servers(
        (url = "http://localhost:8000", description = "本地开发环境"),
    ),
    tags(
        (name = "Flow", description = "工作流 - 流程定义、实例、任务管理"),
        (name = "Flow-Task", description = "任务管理 - 任务查询、认领、审批"),
        (name = "Flow-Workflow", description = "流程管理 - 流程定义CRUD"),
        (name = "Flow-Instance", description = "实例管理 - 流程实例CRUD"),
        (name = "Flow-Approval", description = "审批管理 - 审批任务处理"),
        (name = "Flow-Template", description = "模板管理 - 流程模板CRUD"),
        (name = "Flow-History", description = "历史记录 - 流程历史查询"),
        (name = "Flow-Monitor", description = "流程监控 - 运行监控、统计分析"),
    ),
    components(
        schemas(
            Workflow,
            CreateWorkflowRequest,
            UpdateWorkflowRequest,
            WorkflowInstance,
            CreateInstanceRequest,
            WorkflowTask,
            TaskActionRequest,
            TaskBatchRequest,
            TaskBatchResult,
            TaskFailure,
            TaskStats,
            StatisticsResponse,
            WorkflowStat,
            MonthlyData,
            ApprovalTask,
            ApprovalTaskListResponse,
        ),
    ),
    paths(
        // === Flow-Task ===
        super::task::list_tasks,
        super::task::get_task,
        super::task::claim_task,
        super::task::unclaim_task,
        super::task::approve_task,
        super::task::reject_task,
        super::task::complete_task,
        super::task::delegate_task,
        super::task::batch_approve,
        super::task::batch_complete,
        super::task::batch_delegate,
        super::task::my_tasks,
        super::task::my_pending_tasks,
        super::task::my_completed_tasks,
        super::task::candidate_tasks,
        super::task::get_task_count,
        super::task::get_task_stats,
        super::task::high_priority_tasks,
        super::task::overdue_tasks,
        // === Flow-Workflow ===
        super::workflow::list_workflows,
        super::workflow::get_workflow,
        super::workflow::create_workflow,
        super::workflow::update_workflow,
        super::workflow::delete_workflow,
        super::workflow::publish_workflow,
        super::workflow::unpublish_workflow,
        super::workflow::activate_workflow,
        super::workflow::deactivate_workflow,
        super::workflow::deploy_workflow,
        super::workflow::rollback_workflow,
        // === Flow-Instance ===
        super::instance::list_instances,
        super::instance::get_instance,
        super::instance::create_instance,
        super::instance::start_instance,
        super::instance::approve_instance,
        super::instance::reject_instance,
        super::instance::cancel_instance,
        super::instance::resume_instance,
        super::instance::suspend_instance,
        super::instance::get_instance_details,
        // === Flow-Approval ===
        super::approval::list_approval_tasks,
        super::approval::get_approval_task,
        super::approval::list_pending_approvals,
        super::approval::approve_task,
        super::approval::reject_task,
        super::approval::claim_task,
        super::approval::unclaim_task,
        super::approval::delegate_task,
        super::approval::reassign_task,
        super::approval::list_approvals,
        super::approval::get_approval,
        super::approval::create_approval,
        super::approval::process_approval,
        // === Flow-Template ===
        super::template::list_templates,
        super::template::create_template,
        super::template::get_template,
        super::template::update_template,
        super::template::delete_template,
        super::template::copy_template,
        super::template::import_template,
        super::template::export_template,
        // === Flow-History ===
        super::history::list_history,
        super::history::get_history,
        super::history::get_instance_history,
        super::history::get_workflow_history,
        // === Flow-Record ===
        super::record::list_records,
        super::record::get_record,
        // === Flow-Setting ===
        super::setting::list_settings,
        super::setting::get_setting,
        super::setting::get_setting_by_key,
        super::setting::update_setting,
        super::setting::reset_setting,
        super::setting::batch_update_settings,
        // === Flow-Statistics ===
        super::statistics::get_statistics,
    ),
)]
pub struct FlowApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = FlowApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-flow-openapi.json", json)
            .expect("Failed to write spec");
        tracing::info!("Flow OpenAPI spec written to /tmp/topems-flow-openapi.json");
    }
}
