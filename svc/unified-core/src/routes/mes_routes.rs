//! MES 路由注册

use axum::routing::get;
use axum::Router;

use crate::modules::mes::handlers::*;
use crate::modules::mes::ws::mes_dashboard_initial;
use crate::AppState;

/// 创建 MES 业务路由
pub fn mes_routes() -> Router<AppState> {
    Router::new()
        // 仪表盘统计
        .route("/api/mes/dashboard/stats", get(dashboard_stats))
        // 仪表盘初始数据（HTTP）
        .route("/api/mes/dashboard/initial", get(mes_dashboard_initial))
        // 设备管理
        .route("/api/mes/equipment", get(list_equipment))
        .route("/api/mes/equipment/statistics", get(equipment_statistics))
        // 工单管理
        .route("/api/mes/work-orders", get(list_work_orders))
        // 生产订单
        .route("/api/mes/orders", get(list_production_orders))
        // 工作站
        .route("/api/mes/workstations", get(list_workstations))
        // 生产记录
        .route("/api/mes/records", get(list_production_records))
        // 生产排程
        .route("/api/mes/schedules", get(list_production_schedules))
        // WIP 统计
        .route("/api/mes/wip/statistics", get(wip_statistics))
        // 质量检测
        .route("/api/mes/quality-inspections", get(list_quality_inspections))
}
