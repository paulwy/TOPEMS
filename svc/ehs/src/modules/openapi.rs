//! TOPEMS-ehs OpenAPI 文档聚合
//!
//! 汇总所有 HTTP handler 的路径信息，生成统一的 OpenAPI 规范。
//!
//! 注意：`home` / `health` / `detailed_health` 三个 handler 定义在 `main.rs`
//! 中（bin-only），lib 无法直接引用，因此使用占位函数承载 `#[utoipa::path]`
//! 注解（仅用于生成 OpenAPI spec，运行期不会被调用）。其余自由函数 handler
//! 的注解保留在各自模块中。

use crate::modules::{
    accident, data_sync, ehs_plugin, emergency_drill, emergency_plan, environment,
    environmental_compliance, hazard, hazardous_material, health, occupational_disease,
    occupational_health, risk, safety, training,
};
use utoipa::OpenApi;

// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
// =============================================================================

#[utoipa::path(
    get,
    path = "/",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
fn _home() {}

#[utoipa::path(
    get,
    path = "/health",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
fn _health() {}

#[utoipa::path(
    get,
    path = "/api/health/detailed",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
fn _detailed_health() {}

// =============================================================================
// ApiDoc: OpenApi 派生结构体
// =============================================================================

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS-ehs API",
        version = "1.0.0",
        description = "TOPEMS 环境健康安全服务 - 安全检查、隐患管理、事故报告、应急预案",
    ),
    servers(
        (url = "http://localhost:8052", description = "本地开发环境"),
    ),
    tags(
        (name = "ehs", description = "环境健康安全"),
    ),
    paths(
        // === main.rs 中的 bin-only handler（占位函数） ===
        _home,
        _health,
        _detailed_health,
        // === ehs_plugin（公共路由） ===
        ehs_plugin::get_plugin_info,
        ehs_plugin::plugin_health_check,
        // === risk ===
        risk::list_risks,
        risk::create_risk,
        risk::get_risk,
        risk::update_risk,
        risk::delete_risk,
        risk::assess_risk,
        risk::list_control_measures,
        risk::create_control_measure,
        risk::update_control_measure,
        risk::delete_control_measure,
        // === safety ===
        safety::list_plans,
        safety::create_plan,
        safety::get_plan,
        safety::update_plan,
        safety::delete_plan,
        safety::list_plan_items,
        safety::create_plan_item,
        safety::delete_plan_item,
        safety::list_records,
        safety::create_record,
        safety::get_record,
        safety::update_record,
        safety::delete_record,
        // === accident ===
        accident::list_accidents,
        accident::report_accident,
        accident::get_accident,
        accident::update_accident,
        accident::delete_accident,
        accident::start_investigation,
        accident::update_investigation,
        accident::complete_investigation,
        accident::create_treatment,
        accident::update_treatment_action,
        accident::complete_treatment,
        accident::create_review,
        accident::close_accident,
        // === environment ===
        environment::list_records,
        environment::create_record,
        // === training ===
        training::list_trainings,
        training::create_training,
        training::get_training,
        training::update_training,
        training::delete_training,
        training::list_training_plans,
        training::create_training_plan,
        training::get_training_plan,
        training::update_training_plan,
        training::delete_training_plan,
        training::list_training_records,
        training::create_training_record,
        training::get_training_record,
        training::update_training_record,
        training::delete_training_record,
        training::list_certificates,
        training::create_certificate,
        training::get_certificate,
        training::update_certificate,
        training::delete_certificate,
        // === health ===
        health::list_records,
        health::create_record,
        // === hazard ===
        hazard::list_hazards,
        hazard::create_hazard,
        hazard::get_hazard,
        hazard::update_hazard,
        hazard::delete_hazard,
        hazard::start_rectification,
        hazard::update_rectification,
        hazard::submit_rectification,
        hazard::verify_hazard,
        hazard::close_hazard,
        hazard::start_hazard_approval,
        hazard::approve_hazard,
        hazard::reject_hazard,
        // === data_sync ===
        data_sync::list_sync_records,
        data_sync::get_sync_record,
        data_sync::delete_sync_record,
        data_sync::retry_sync,
        data_sync::sync_hazard_to_qms,
        data_sync::sync_accident_to_lims,
        data_sync::list_sync_configs,
        data_sync::update_sync_configs,
        data_sync::batch_retry_sync,
        // === emergency_plan ===
        emergency_plan::list_plans,
        emergency_plan::create_plan,
        emergency_plan::list_plan_categories,
        emergency_plan::get_plan,
        emergency_plan::update_plan,
        emergency_plan::delete_plan,
        emergency_plan::list_plan_supplies,
        emergency_plan::add_plan_supply,
        emergency_plan::delete_plan_supply,
        emergency_plan::list_plan_versions,
        emergency_plan::create_new_version,
        emergency_plan::submit_plan_approval,
        emergency_plan::approve_plan,
        // === emergency_drill ===
        emergency_drill::list_drill_plans,
        emergency_drill::create_drill_plan,
        emergency_drill::get_drill_plan,
        emergency_drill::update_drill_plan,
        emergency_drill::delete_drill_plan,
        emergency_drill::list_drill_records,
        emergency_drill::create_drill_record,
        emergency_drill::get_drill_record,
        emergency_drill::update_drill_record,
        emergency_drill::delete_drill_record,
        emergency_drill::create_drill_evaluation,
        emergency_drill::list_drill_problems,
        emergency_drill::create_drill_problem,
        emergency_drill::update_drill_problem,
        emergency_drill::list_drill_types,
        emergency_drill::get_drill_statistics,
        // === occupational_health ===
        occupational_health::list_exam_plans,
        occupational_health::create_exam_plan,
        occupational_health::get_exam_plan,
        occupational_health::update_exam_plan,
        occupational_health::delete_exam_plan,
        occupational_health::list_exam_records,
        occupational_health::create_exam_record,
        occupational_health::get_exam_record,
        occupational_health::update_exam_record,
        occupational_health::delete_exam_record,
        occupational_health::get_health_archive,
        occupational_health::list_contraindications,
        occupational_health::create_contraindication,
        occupational_health::get_contraindication,
        occupational_health::update_contraindication,
        occupational_health::delete_contraindication,
        occupational_health::list_abnormalities,
        occupational_health::update_abnormality,
        occupational_health::list_exam_types,
        occupational_health::get_health_statistics,
        // === occupational_disease ===
        occupational_disease::list_hazard_factors,
        occupational_disease::create_hazard_factor,
        occupational_disease::get_hazard_factor,
        occupational_disease::update_hazard_factor,
        occupational_disease::delete_hazard_factor,
        occupational_disease::list_detection_records,
        occupational_disease::create_detection_record,
        occupational_disease::get_detection_record,
        occupational_disease::delete_detection_record,
        occupational_disease::list_disease_cases,
        occupational_disease::create_disease_case,
        occupational_disease::get_disease_case,
        occupational_disease::update_disease_case,
        occupational_disease::delete_disease_case,
        occupational_disease::list_protection_measures,
        occupational_disease::create_protection_measure,
        occupational_disease::get_protection_measure,
        occupational_disease::update_protection_measure,
        occupational_disease::delete_protection_measure,
        occupational_disease::list_health_trainings,
        occupational_disease::create_health_training,
        occupational_disease::get_health_training,
        occupational_disease::delete_health_training,
        occupational_disease::list_factor_types,
        occupational_disease::get_disease_statistics,
        // === hazardous_material ===
        hazardous_material::list_materials,
        hazardous_material::create_material,
        hazardous_material::list_material_categories,
        hazardous_material::create_material_category,
        hazardous_material::get_material_statistics,
        hazardous_material::get_material,
        hazardous_material::update_material,
        hazardous_material::delete_material,
        hazardous_material::list_material_stocks,
        hazardous_material::get_material_msds,
        hazardous_material::update_material_msds,
        hazardous_material::list_stock_records,
        hazardous_material::create_stock_in,
        hazardous_material::create_stock_out,
        hazardous_material::get_stock_record,
        // === environmental_compliance ===
        environmental_compliance::list_regulations,
        environmental_compliance::create_regulation,
        environmental_compliance::list_regulation_categories,
        environmental_compliance::get_regulation,
        environmental_compliance::update_regulation,
        environmental_compliance::delete_regulation,
        environmental_compliance::list_evaluations,
        environmental_compliance::create_evaluation,
        environmental_compliance::get_evaluation,
        environmental_compliance::update_evaluation,
        environmental_compliance::delete_evaluation,
        environmental_compliance::list_monitor_records,
        environmental_compliance::create_monitor_record,
        environmental_compliance::list_monitor_types,
        environmental_compliance::get_monitor_record,
        environmental_compliance::delete_monitor_record,
        environmental_compliance::list_permits,
        environmental_compliance::create_permit,
        environmental_compliance::get_permit,
        environmental_compliance::update_permit,
        environmental_compliance::delete_permit,
        environmental_compliance::list_incidents,
        environmental_compliance::create_incident,
        environmental_compliance::get_incident,
        environmental_compliance::update_incident,
        environmental_compliance::delete_incident,
        environmental_compliance::get_compliance_statistics,
    ),
)]
pub struct ApiDoc;
