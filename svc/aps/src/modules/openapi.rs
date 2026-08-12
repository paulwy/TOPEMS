// APS 服务 OpenAPI 文档
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::production_plan::list_plans,
        crate::modules::production_plan::get_plan,
        crate::modules::production_plan::create_plan,
        crate::modules::production_plan::update_plan,
        crate::modules::production_plan::delete_plan,
        crate::modules::schedule::list_schedules,
        crate::modules::schedule::get_schedule,
        crate::modules::schedule::create_schedule,
        crate::modules::schedule::update_schedule,
        crate::modules::schedule::delete_schedule,
        crate::modules::schedule::start_schedule,
        crate::modules::schedule::complete_schedule,
        crate::modules::schedule::cancel_schedule,
        crate::modules::capacity::list_capacities,
        crate::modules::capacity::get_capacity,
        crate::modules::capacity::create_capacity,
        crate::modules::capacity::update_capacity,
        crate::modules::capacity::delete_capacity,
        crate::modules::material_plan::list_material_plans,
        crate::modules::material_plan::get_material_plan,
        crate::modules::material_plan::create_material_plan,
        crate::modules::material_plan::update_material_plan,
        crate::modules::material_plan::delete_material_plan,
        crate::modules::forecast::list_forecasts,
        crate::modules::forecast::get_forecast,
        crate::modules::forecast::create_forecast,
        crate::modules::forecast::update_forecast,
        crate::modules::forecast::delete_forecast,
        crate::modules::forecast::calculate_forecast,
        crate::modules::forecast::validate_forecast,
    ),
    components(
        schemas(
            crate::modules::production_plan::ProductionPlan,
            crate::modules::production_plan::CreatePlanRequest,
            crate::modules::production_plan::UpdatePlanRequest,
            crate::modules::schedule::Schedule,
            crate::modules::schedule::CreateScheduleRequest,
            crate::modules::schedule::UpdateScheduleRequest,
            crate::modules::capacity::Capacity,
            crate::modules::capacity::CreateCapacityRequest,
            crate::modules::capacity::UpdateCapacityRequest,
            crate::modules::material_plan::MaterialPlan,
            crate::modules::material_plan::CreateMaterialPlanRequest,
            crate::modules::material_plan::UpdateMaterialPlanRequest,
            crate::modules::forecast::DemandForecast,
            crate::modules::forecast::CreateForecastRequest,
            crate::modules::forecast::UpdateForecastRequest,
        ),
    ),
    tags(
        (name = "APS - Production Plan", description = "生产计划 API"),
        (name = "APS - Schedule", description = "排程管理 API"),
        (name = "APS - Capacity", description = "产能管理 API"),
        (name = "APS - Material Plan", description = "物料计划 API"),
        (name = "APS - Forecast", description = "需求预测 API"),
    ),
    info(
        title = "TOPEMS APS API",
        version = "1.0.0",
        description = "高级计划与排程 API - 包含生产计划、排程管理、产能管理、物料计划、需求预测等功能"
    )
)]
pub struct ApsApiDoc;
