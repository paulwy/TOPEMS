use axum::{extract::Path, Json};
use topems_shared::ApiResponse;

use crate::{
    models::{Alert, LogEntry, MonitoringMetrics, MonitoringService as MonitoringServiceModel},
    services::monitoring::MonitoringService,
};

pub async fn get_monitoring_services() -> Json<ApiResponse<Vec<MonitoringServiceModel>>> {
    let service = MonitoringService::new();
    let services = service.get_services();
    Json(ApiResponse::success(services, "监控服务状态获取成功"))
}

pub async fn get_monitoring_metrics() -> Json<ApiResponse<MonitoringMetrics>> {
    let service = MonitoringService::new();
    let metrics = service.get_metrics();
    Json(ApiResponse::success(metrics, "监控指标获取成功"))
}

pub async fn get_monitoring_alerts() -> Json<ApiResponse<Vec<Alert>>> {
    let service = MonitoringService::new();
    let alerts = service.get_alerts();
    Json(ApiResponse::success(alerts, "告警列表获取成功"))
}

pub async fn acknowledge_alert(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    let service = MonitoringService::new();
    let result = service.acknowledge_alert(id);
    Json(ApiResponse::success(result, "告警已确认"))
}

pub async fn get_monitoring_logs() -> Json<ApiResponse<Vec<LogEntry>>> {
    let service = MonitoringService::new();
    let logs = service.get_logs();
    Json(ApiResponse::success(logs, "日志列表获取成功"))
}
