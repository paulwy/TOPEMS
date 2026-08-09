use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "ERP", description = "企业资源计划系统 API"),
        (name = "Health", description = "健康检查接口"),
    ),
    info(
        title = "TOPEMS ERP API",
        version = "1.0.0",
        description = "TOPEMS 企业资源计划服务 - 资产、物料、客户、供应商、库存、财务、会议室等管理"
    ),
    servers(
        (url = "http://localhost:8054", description = "本地开发环境"),
    )
)]
pub struct ErpApiDoc;
