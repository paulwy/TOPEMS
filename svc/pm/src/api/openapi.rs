use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
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
