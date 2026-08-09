pub mod middleware;
pub mod models;
pub mod modules;
pub mod services;
pub mod shared;

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "EHS", description = "环境健康安全"),
        (name = "Safety", description = "安全管理"),
        (name = "Inspection", description = "安全检查"),
        (name = "Hazard", description = "隐患管理"),
        (name = "Accident", description = "事故报告"),
        (name = "Emergency", description = "应急预案"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-ehs API",
        version = "1.0.0",
        description = "TOPEMS 环境健康安全服务 - 安全检查、隐患管理、事故报告、应急预案",
    ),
    servers(
        (url = "http://localhost:8052", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;
