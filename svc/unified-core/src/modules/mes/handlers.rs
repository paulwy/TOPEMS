//! MES API 处理器

use axum::extract::{Query};
use axum::Json;
use serde::Deserialize;


use super::models::*;
use super::service::MesService;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_page_size")]
    pub page_size: i32,
}

fn default_page() -> i32 {
    1
}

fn default_page_size() -> i32 {
    10
}

/// 仪表盘统计
pub async fn dashboard_stats() -> Json<ApiResponse<serde_json::Value>> {
    let service = MesService::instance().lock().unwrap();
    let stats = service.get_dashboard_stats();
    Json(ApiResponse {
        success: true,
        data: Some(stats),
        message: None,
    })
}

/// 设备列表
pub async fn list_equipment(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<Equipment>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_equipment(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 工单列表
pub async fn list_work_orders(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<WorkOrder>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_work_orders(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// WIP 统计
pub async fn wip_statistics() -> Json<ApiResponse<WipStatistics>> {
    let service = MesService::instance().lock().unwrap();
    let stats = service.get_wip_statistics();
    Json(ApiResponse {
        success: true,
        data: Some(stats),
        message: None,
    })
}

/// 质量检测记录
pub async fn list_quality_inspections(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<QualityInspection>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_quality_inspections(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 生产订单列表
pub async fn list_production_orders(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_production_orders(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 工作站列表
pub async fn list_workstations(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<WorkStation>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_workstations(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 生产记录列表
pub async fn list_production_records(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<ProductionRecord>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_production_records(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 生产排程列表
pub async fn list_production_schedules(Query(params): Query<ListParams>) -> Json<ApiResponse<PaginatedResponse<ProductionSchedule>>> {
    let service = MesService::instance().lock().unwrap();
    let result = service.list_production_schedules(params.page, params.page_size);
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 设备统计
pub async fn equipment_statistics() -> Json<ApiResponse<serde_json::Value>> {
    let service = MesService::instance().lock().unwrap();
    let stats = service.get_equipment_statistics();
    Json(ApiResponse {
        success: true,
        data: Some(stats),
        message: None,
    })
}
