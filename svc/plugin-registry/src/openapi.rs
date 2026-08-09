//! TOPEMS Plugin Registry（插件注册、发布、版本、元数据）最小 OpenAPI 文档骨架
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::plugin::handlers::marketplace::get_marketplace_summary,
        crate::modules::plugin::handlers::marketplace::list_categories,
        crate::modules::plugin::handlers::marketplace::list_plugins,
        crate::modules::plugin::handlers::marketplace::get_plugin,
        crate::modules::plugin::handlers::tenant_plugins::list_tenant_plugins,
        crate::modules::plugin::handlers::tenant_plugins::install_plugin,
    ),
    tags(
        (name = "plugin",      description = "插件注册/发布 API"),
        (name = "plugin_meta", description = "插件元数据与评级 API"),
        (name = "release",     description = "插件版本发布与回滚 API")
    ),
    info(
        title       = "TOPEMS Plugin Registry API",
        version     = "1.0.0",
        description = "插件市场注册中心服务 API - 包含插件注册、版本、元数据、发布"
    )
)]
pub struct PluginRegistryApiDoc;
