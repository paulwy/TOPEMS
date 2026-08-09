pub mod middleware;
pub mod models;
pub mod modules;
pub mod services;
pub mod shared;

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "PDM", description = "产品数据管理"),
        (name = "BOM", description = "BOM管理"),
        (name = "Engineering", description = "工程管理"),
        (name = "Change", description = "工程变更"),
        (name = "Document", description = "文档管理"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-pdm API",
        version = "1.0.0",
        description = "TOPEMS 产品数据管理服务 - BOM管理、工程变更、文档管理",
    ),
    servers(
        (url = "http://localhost:8031", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;
