//! TOPEMS-pdm OpenAPI 文档聚合
//!
//! 汇总所有 HTTP handler 的路径信息，生成统一的 OpenAPI 规范。
//!
//! 注意：`home` / `health` / `detailed_health` 三个 handler 定义在 `main.rs`
//! 中（bin-only），lib 无法直接引用，因此使用占位函数承载 `#[utoipa::path]`
//! 注解（仅用于生成 OpenAPI spec，运行期不会被调用）。其余自由函数 handler
//! 的注解保留在各自模块中。

use crate::modules::{
    change_notice, configuration, document, material, pdm_plugin, product, production_batch,
    production_formula, production_process, production_statistics, production_step, version,
    workflow,
};
use utoipa::OpenApi;

// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
// =============================================================================

#[utoipa::path(
    get,
    path = "/",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
fn _home() {}

#[utoipa::path(
    get,
    path = "/health",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
fn _health() {}

#[utoipa::path(
    get,
    path = "/api/health/detailed",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
fn _detailed_health() {}

// =============================================================================
// ApiDoc: OpenApi 派生结构体
// =============================================================================

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS-pdm API",
        version = "1.0.0",
        description = "TOPEMS 产品数据管理服务 - BOM管理、工程变更、文档管理",
    ),
    servers(
        (url = "http://localhost:8031", description = "本地开发环境"),
    ),
    tags(
        (name = "pdm", description = "产品数据管理"),
    ),
    paths(
        // === main.rs 中的 bin-only handler（占位函数） ===
        _home,
        _health,
        _detailed_health,
        // === pdm_plugin（公共路由） ===
        pdm_plugin::get_plugin_info,
        pdm_plugin::plugin_health_check,
        // === product ===
        product::list_products,
        product::create_product,
        product::get_product,
        product::update_product,
        product::delete_product,
        // === material ===
        material::list_materials,
        material::create_material,
        material::get_material,
        material::update_material,
        material::delete_material,
        // === configuration ===
        configuration::list_configurations,
        configuration::create_configuration,
        configuration::get_configuration,
        configuration::update_configuration,
        configuration::delete_configuration,
        // === document ===
        document::list_documents,
        document::create_document,
        document::get_document,
        document::update_document,
        document::delete_document,
        document::start_document_approval,
        document::get_document_approval_history,
        document::list_pending_documents,
        // === version ===
        version::list_versions,
        version::create_version,
        version::get_version,
        version::update_version,
        version::delete_version,
        // === production_process ===
        production_process::list_processes,
        production_process::create_process,
        production_process::get_process,
        production_process::update_process,
        production_process::delete_process,
        // === production_step ===
        production_step::list_steps,
        production_step::create_step,
        production_step::get_step,
        production_step::update_step,
        production_step::delete_step,
        // === production_formula ===
        production_formula::list_formulas,
        production_formula::create_formula,
        production_formula::get_formula,
        production_formula::update_formula,
        production_formula::delete_formula,
        // === production_batch ===
        production_batch::list_batches,
        production_batch::create_batch,
        production_batch::get_batch,
        production_batch::update_batch,
        production_batch::delete_batch,
        // === production_statistics ===
        production_statistics::list_statistics,
        production_statistics::get_statistics,
        // === change_notice ===
        change_notice::list_change_notices,
        change_notice::create_change_notice,
        change_notice::get_change_notice,
        change_notice::update_change_notice,
        change_notice::delete_change_notice,
        change_notice::submit_change_notice,
        change_notice::approve_change_notice,
        change_notice::reject_change_notice,
        // === workflow ===
        workflow::list_workflows,
        workflow::create_workflow,
        workflow::get_workflow,
        workflow::update_workflow,
        workflow::delete_workflow,
        workflow::start_workflow,
        workflow::list_workflow_instances,
        workflow::get_workflow_instance,
        workflow::advance_workflow
    ),
)]
pub struct ApiDoc;
