//! TOPEMS Monitor（审计、健康、运维观测）最小 OpenAPI 文档骨架
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "health",  description = "健康检查 API"),
        (name = "audit",   description = "审计日志查询 API"),
        (name = "metrics", description = "Prometheus 指标导出 API")
    ),
    info(
        title       = "TOPEMS Monitor API",
        version     = "1.0.0",
        description = "监控与审计服务 API - 包含健康检查、审计查询、Prometheus 指标导出"
    )
)]
pub struct MonitorApiDoc;
