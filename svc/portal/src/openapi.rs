use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "Portal", description = "门户"),
        (name = "Dashboard", description = "仪表盘"),
        (name = "Search", description = "全局搜索"),
        (name = "Todo", description = "待办聚合"),
        (name = "Navigation", description = "导航"),
        (name = "QuickActions", description = "快捷操作"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-portal API",
        version = "1.0.0",
        description = "TOPEMS 门户服务 - BFF 聚合层、仪表盘、全局搜索、待办聚合",
    ),
    servers(
        (url = "http://localhost:8063", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;
