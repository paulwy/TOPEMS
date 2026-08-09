//! TOPEMS Search（跨模块全文/语义检索/ES 网关）最小 OpenAPI 文档骨架
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::search_handler,
        crate::handlers::health_handler,
    ),
    tags(
        (name = "fulltext",  description = "全文检索 API"),
        (name = "semantic",  description = "语义检索 API（向量）"),
        (name = "index",     description = "索引管理/重建 API"),
        (name = "health",    description = "健康检查 API")
    ),
    info(
        title       = "TOPEMS Search API",
        version     = "1.0.0",
        description = "搜索网关服务 API - 跨模块全文检索、语义检索、索引管理"
    )
)]
pub struct SearchApiDoc;
