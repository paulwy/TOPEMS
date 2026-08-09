use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::project::list_projects,
        crate::modules::project::create_project,
        crate::modules::project::get_project,
        crate::modules::project::update_project,
        crate::modules::project::delete_project,
        crate::modules::project::get_project_dashboard,
        crate::modules::project::get_project_gantt,
        crate::modules::project_approval::get_approval,
        crate::modules::project_approval::submit_approval,
        crate::modules::project_approval::handle_approval_action,
        crate::modules::project_benefit::get_benefits,
        crate::modules::project_benefit::get_analysis,
        crate::modules::project_benefit::calculate_benefits,
        crate::modules::project_expense::list_expenses,
        crate::modules::project_expense::add_expense,
        crate::modules::project_expense::get_expense,
        crate::modules::project_expense::update_expense,
        crate::modules::project_expense::remove_expense,
        crate::modules::project_member::list_members,
        crate::modules::project_member::create_member,
        crate::modules::project_member::get_member,
        crate::modules::project_member::update_member,
        crate::modules::project_member::delete_member,
        crate::modules::project_milestone::list_milestones,
        crate::modules::project_milestone::create_milestone,
        crate::modules::project_milestone::get_milestone,
        crate::modules::project_milestone::update_milestone,
        crate::modules::project_milestone::delete_milestone,
        crate::modules::project_phase::list_phases,
        crate::modules::project_phase::create_phase,
        crate::modules::project_phase::get_phase,
        crate::modules::project_phase::update_phase,
        crate::modules::project_phase::delete_phase,
        crate::modules::project_resource::list_resources,
        crate::modules::project_resource::add_resource,
        crate::modules::project_resource::get_resource,
        crate::modules::project_resource::update_resource,
        crate::modules::project_resource::remove_resource,
    ),
    tags(
        (name = "projects", description = "项目管理接口"),
        (name = "project_phases", description = "项目阶段管理接口"),
        (name = "project_milestones", description = "项目里程碑管理接口"),
        (name = "project_members", description = "项目成员管理接口"),
        (name = "project_resources", description = "项目资源管理接口"),
        (name = "project_expenses", description = "项目费用管理接口"),
        (name = "project_benefits", description = "项目效益分析接口"),
        (name = "project_type_configs", description = "项目类型配置接口"),
        (name = "service_integrations", description = "服务集成配置接口"),
    ),
    info(
        title = "TOPEMS-PM API",
        version = "1.0.0",
        description = "统一项目管理服务 API",
        contact(
            name = "TOPEMS Team"
        )
    )
)]
pub struct ApiDoc;
