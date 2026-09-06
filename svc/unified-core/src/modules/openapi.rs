// unified-core 模块 OpenAPI 文档提取
//
// 独立于 main.rs 中的 ApiDoc（覆盖全平台），
// 此处注册 IAM / Doc / File 核心 schema 与路径，
// 供 scripts/openapi/generate.sh --extract 模式通过 cargo test 提取。
//
// 与 WMS openapi.rs 同样的模式：自定义 schema 结构 + components(schemas(...))。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

use crate::modules::flow::approval::{ApprovalTask, ApprovalTaskListResponse};
use crate::modules::flow::models::{
    CreateInstanceRequest, CreateWorkflowRequest, MonthlyData, StatisticsResponse,
    TaskActionRequest, TaskBatchRequest, TaskBatchResult, TaskFailure, TaskStats,
    UpdateWorkflowRequest, Workflow, WorkflowInstance, WorkflowStat, WorkflowTask,
};

// ============ IAM 核心 Schema ============

/// IAM 用户实体
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub is_active: bool,
    pub is_superuser: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// IAM 角色实体
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Role {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// IAM 权限实体
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Permission {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub module: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// unified-core OpenAPI 文档（IAM + Flow + Doc + File 模块）
#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            User,
            Role,
            Permission,
            // ===== Flow module schemas =====
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
        crate::modules::iam::user::crud::list_users,
        crate::modules::iam::user::crud::create_user,
        crate::modules::iam::auth::login,
        crate::modules::iam::auth::register,
        // ===== IAM 权限管理 =====
        crate::modules::iam::role::list_roles,
        crate::modules::iam::role::get_role,
        crate::modules::iam::permission::list_permissions,
        crate::modules::iam::position::list_positions,
        crate::modules::iam::permission_verify::verify_permission,
        crate::modules::iam::permission_verify::verify_multiple_permissions,
        crate::modules::iam::user::profile_ext::get_my_permissions,
        crate::modules::iam::user::roles::get_user_permissions,
        // ===== Flow module - task =====
        crate::modules::flow::task::list_tasks,
        crate::modules::flow::task::get_task,
        crate::modules::flow::task::claim_task,
        crate::modules::flow::task::unclaim_task,
        crate::modules::flow::task::approve_task,
        crate::modules::flow::task::reject_task,
        crate::modules::flow::task::complete_task,
        crate::modules::flow::task::delegate_task,
        crate::modules::flow::task::batch_approve,
        crate::modules::flow::task::batch_complete,
        crate::modules::flow::task::batch_delegate,
        crate::modules::flow::task::my_tasks,
        crate::modules::flow::task::my_pending_tasks,
        crate::modules::flow::task::my_completed_tasks,
        crate::modules::flow::task::candidate_tasks,
        crate::modules::flow::task::get_task_count,
        crate::modules::flow::task::get_task_stats,
        crate::modules::flow::task::high_priority_tasks,
        crate::modules::flow::task::overdue_tasks,
        // ===== Flow module - workflow =====
        crate::modules::flow::workflow::list_workflows,
        crate::modules::flow::workflow::get_workflow,
        crate::modules::flow::workflow::create_workflow,
        crate::modules::flow::workflow::update_workflow,
        crate::modules::flow::workflow::delete_workflow,
        crate::modules::flow::workflow::publish_workflow,
        crate::modules::flow::workflow::unpublish_workflow,
        crate::modules::flow::workflow::activate_workflow,
        crate::modules::flow::workflow::deactivate_workflow,
        crate::modules::flow::workflow::deploy_workflow,
        crate::modules::flow::workflow::rollback_workflow,
        // ===== Flow module - instance =====
        crate::modules::flow::instance::list_instances,
        crate::modules::flow::instance::get_instance,
        crate::modules::flow::instance::create_instance,
        crate::modules::flow::instance::start_instance,
        crate::modules::flow::instance::approve_instance,
        crate::modules::flow::instance::reject_instance,
        crate::modules::flow::instance::cancel_instance,
        crate::modules::flow::instance::resume_instance,
        crate::modules::flow::instance::suspend_instance,
        crate::modules::flow::instance::get_instance_details,
        // ===== Flow module - approval =====
        crate::modules::flow::approval::list_approval_tasks,
        crate::modules::flow::approval::get_approval_task,
        crate::modules::flow::approval::list_pending_approvals,
        crate::modules::flow::approval::approve_task,
        crate::modules::flow::approval::reject_task,
        crate::modules::flow::approval::claim_task,
        crate::modules::flow::approval::unclaim_task,
        crate::modules::flow::approval::delegate_task,
        crate::modules::flow::approval::reassign_task,
        crate::modules::flow::approval::list_approvals,
        crate::modules::flow::approval::get_approval,
        crate::modules::flow::approval::create_approval,
        crate::modules::flow::approval::process_approval,
        // ===== Flow module - template =====
        crate::modules::flow::template::list_templates,
        crate::modules::flow::template::create_template,
        crate::modules::flow::template::get_template,
        crate::modules::flow::template::update_template,
        crate::modules::flow::template::delete_template,
        crate::modules::flow::template::copy_template,
        crate::modules::flow::template::import_template,
        crate::modules::flow::template::export_template,
        // ===== Flow module - history =====
        crate::modules::flow::history::list_history,
        crate::modules::flow::history::get_history,
        crate::modules::flow::history::get_instance_history,
        crate::modules::flow::history::get_workflow_history,
        // ===== Flow module - record =====
        crate::modules::flow::record::list_records,
        crate::modules::flow::record::get_record,
        // ===== Flow module - setting/statistics =====
        crate::modules::flow::setting::list_settings,
        crate::modules::flow::setting::get_setting,
        crate::modules::flow::setting::get_setting_by_key,
        crate::modules::flow::setting::update_setting,
        crate::modules::flow::setting::reset_setting,
        crate::modules::flow::setting::batch_update_settings,
        crate::modules::flow::statistics::get_statistics,
        // ===== Doc module =====
        crate::modules::doc::handlers::list_documents,
        crate::modules::doc::handlers::get_document,
        crate::modules::doc::handlers::create_document,
        crate::modules::doc::handlers::update_document,
        crate::modules::doc::handlers::delete_document,
        crate::modules::doc::handlers::list_templates,
        crate::modules::doc::handlers::list_template_categories,
        crate::modules::doc::handlers::get_template,
        crate::modules::doc::handlers::create_template,
        crate::modules::doc::handlers::update_template,
        crate::modules::doc::handlers::delete_template,
        crate::modules::doc::handlers::list_folders,
        crate::modules::doc::handlers::get_folder,
        crate::modules::doc::handlers::create_folder,
        crate::modules::doc::handlers::update_folder,
        crate::modules::doc::handlers::delete_folder,
        crate::modules::doc::handlers::get_dashboard_handler,
        // ===== File module - download =====
        crate::modules::file::download::download_file,
        crate::modules::file::download::preview_file,
        crate::modules::file::download::get_thumbnail,
        // ===== File module - manage =====
        crate::modules::file::manage::list_files,
        crate::modules::file::manage::get_file,
        crate::modules::file::manage::update_file,
        crate::modules::file::manage::delete_file,
        crate::modules::file::manage::move_file,
        crate::modules::file::manage::copy_file,
        crate::modules::file::manage::set_file_permission,
        crate::modules::file::manage::share_file,
        crate::modules::file::manage::get_file_shares,
        crate::modules::file::manage::delete_share,
        crate::modules::file::manage::set_file_permissions,
        crate::modules::file::manage::get_file_permissions,
        crate::modules::file::manage::get_shared_files,
        crate::modules::file::manage::get_received_files,
        crate::modules::file::manage::get_file_stats,
        crate::modules::file::manage::star_file,
        crate::modules::file::manage::unstar_file,
        crate::modules::file::manage::list_starred_files,
        crate::modules::file::manage::export_files,
        crate::modules::file::manage::search_files,
        // ===== File module - upload =====
        crate::modules::file::upload::upload_file,
        crate::modules::file::upload::upload_multiple,
    ),
    tags(
        (name = "IAM", description = "身份与访问管理 - 用户、角色、权限管理"),
        (name = "IAM-Auth", description = "认证接口 - 登录、注册、Token刷新"),
        (name = "IAM-Role", description = "角色管理 - 角色CRUD"),
        (name = "IAM-Permission", description = "权限管理 - 权限验证、权限查询"),
        (name = "Flow", description = "工作流 - 流程定义、实例、任务管理"),
        (name = "Flow-Task", description = "任务管理 - 任务查询、认领、审批"),
        (name = "Flow-Workflow", description = "流程管理 - 流程定义CRUD"),
        (name = "Flow-Instance", description = "实例管理 - 流程实例CRUD"),
        (name = "Flow-Approval", description = "审批管理 - 审批任务处理"),
        (name = "Flow-Template", description = "模板管理 - 流程模板CRUD"),
        (name = "Flow-History", description = "历史记录 - 流程历史查询"),
        (name = "Flow-Monitor", description = "流程监控 - 运行监控、统计分析"),
        (name = "Doc", description = "文档管理 - 文档、模板、文件夹CRUD"),
        (name = "File", description = "文件管理 - 文件上传、下载、共享"),
        (name = "Doc-Compat", description = "Doc 前端兼容 OpenAPI 注解"),
        (name = "IM-Compat", description = "IM 前端兼容 OpenAPI 注解"),
        (name = "Notification-Compat", description = "Notification 前端兼容 OpenAPI 注解"),
        (name = "Mail-Compat", description = "Mail 前端兼容 OpenAPI 注解"),
    ),
    info(
        title = "TOPEMS unified-core API",
        version = "1.0.0",
        description = "TOPEMS 统一核心服务 API - 包含 IAM、Flow、Doc、File 模块"
    )
)]
pub struct IamApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = IamApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-unified-core-openapi.json", json)
            .expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-unified-core-openapi.json");
    }
}
