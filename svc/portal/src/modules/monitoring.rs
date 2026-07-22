//! Monitoring module - BFF proxy to monitor service
//!
//! Portal 不存储监控数据，所有监控请求代理到 monitor 服务。
//! 这里做数据格式适配，保持 Portal API 向后兼容。

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use topems_shared::ApiResponse;

use crate::{
    models::{Alert, LogEntry, MonitoringMetrics, MonitoringService as MonitoringServiceModel},
    shared::AppState,
    utils::user_context::extract_bearer_token,
};

fn build_client(
    base: &topems_shared::service_client::MonitorServiceClient,
    headers: &HeaderMap,
) -> topems_shared::service_client::MonitorServiceClient {
    let client = base.clone();
    if let Some(token) = extract_bearer_token(headers) {
        client.with_auth_token(token)
    } else {
        client
    }
}

pub async fn get_monitoring_services(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<MonitoringServiceModel>>> {
    let client = build_client(&state.monitor_client, &headers);
    match client.get_service_status().await {
        Ok(resp) => {
            let services = parse_service_status(resp.data);
            Json(ApiResponse::success(services, "监控服务状态获取成功"))
        }
        Err(e) => {
            tracing::warn!("Monitor service unavailable, returning empty list: {}", e);
            Json(ApiResponse::success(vec![], "监控服务暂不可用，已降级"))
        }
    }
}

fn parse_service_status(data: Option<serde_json::Value>) -> Vec<MonitoringServiceModel> {
    let arr = match data {
        Some(serde_json::Value::Array(a)) => a,
        _ => return vec![],
    };

    arr.iter()
        .filter_map(|s| {
            Some(MonitoringServiceModel {
                service_name: s.get("name")?.as_str()?.to_string(),
                status: s.get("status")?.as_str()?.to_string(),
                response_time_ms: s
                    .get("response_time_ms")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0),
                last_check: s
                    .get("last_check")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                message: s
                    .get("message")
                    .and_then(|v| v.as_str().map(|m| m.to_string())),
            })
        })
        .collect()
}

pub async fn get_monitoring_metrics(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<MonitoringMetrics>> {
    let client = build_client(&state.monitor_client, &headers);
    match client.list_metrics().await {
        Ok(resp) => {
            let metrics = parse_metrics(resp.data);
            Json(ApiResponse::success(metrics, "监控指标获取成功"))
        }
        Err(e) => {
            tracing::warn!(
                "Monitor service unavailable, returning default metrics: {}",
                e
            );
            Json(ApiResponse::success(
                MonitoringMetrics::default(),
                "监控服务暂不可用，已降级",
            ))
        }
    }
}

fn parse_metrics(data: Option<Vec<serde_json::Value>>) -> MonitoringMetrics {
    let arr = data.unwrap_or_default();
    let d = if arr.is_empty() {
        serde_json::Value::Null
    } else {
        arr[0].clone()
    };
    MonitoringMetrics {
        requests_total: d
            .get("requests_total")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
        requests_success: d
            .get("requests_success")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
        requests_failed: d
            .get("requests_failed")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
        avg_response_time_ms: d
            .get("avg_response_time_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
        active_connections: d
            .get("active_connections")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
        memory_usage_mb: d
            .get("memory_usage_mb")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
        cpu_usage_percent: d
            .get("cpu_usage_percent")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
    }
}

pub async fn get_monitoring_alerts(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Alert>>> {
    let client = build_client(&state.monitor_client, &headers);
    match client.list_alerts(1, 50).await {
        Ok(resp) => {
            let alerts = parse_alerts(resp.data);
            Json(ApiResponse::success(alerts, "告警列表获取成功"))
        }
        Err(e) => {
            tracing::warn!("Monitor service unavailable, returning empty alerts: {}", e);
            Json(ApiResponse::success(vec![], "监控服务暂不可用，已降级"))
        }
    }
}

fn parse_alerts(data: Option<Vec<serde_json::Value>>) -> Vec<Alert> {
    let arr = match data {
        Some(a) => a,
        None => return vec![],
    };

    arr.iter()
        .filter_map(|a| {
            Some(Alert {
                id: a.get("id")?.as_str()?.to_string(),
                rule_name: a.get("rule_name")?.as_str()?.to_string(),
                severity: a.get("severity")?.as_str()?.to_string(),
                message: a.get("message")?.as_str()?.to_string(),
                triggered_at: a
                    .get("triggered_at")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .unwrap_or_else(chrono::Utc::now),
                acknowledged: a
                    .get("acknowledged")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false),
            })
        })
        .collect()
}

pub async fn acknowledge_alert(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let client = build_client(&state.monitor_client, &headers);
    match client.acknowledge_alert(&id, &serde_json::json!({})).await {
        Ok(resp) => Json(ApiResponse::success(
            resp.data
                .unwrap_or(serde_json::json!({ "id": id, "acknowledged": true })),
            "告警已确认",
        )),
        Err(e) => {
            tracing::warn!("Failed to acknowledge alert via monitor service: {}", e);
            Json(ApiResponse::error(502, "监控服务暂不可用，告警确认失败"))
        }
    }
}

pub async fn get_monitoring_logs(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<LogEntry>>> {
    let client = build_client(&state.monitor_client, &headers);
    match client.list_logs(1, 50).await {
        Ok(resp) => {
            let logs = parse_logs(resp.data);
            Json(ApiResponse::success(logs, "日志列表获取成功"))
        }
        Err(e) => {
            tracing::warn!("Monitor service unavailable, returning empty logs: {}", e);
            Json(ApiResponse::success(vec![], "监控服务暂不可用，已降级"))
        }
    }
}

fn parse_logs(data: Option<Vec<serde_json::Value>>) -> Vec<LogEntry> {
    let arr = match data {
        Some(a) => a,
        None => return vec![],
    };

    arr.iter()
        .filter_map(|l| {
            Some(LogEntry {
                timestamp: l
                    .get("timestamp")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .unwrap_or_else(chrono::Utc::now),
                level: l.get("level")?.as_str()?.to_string(),
                service: l.get("service")?.as_str()?.to_string(),
                message: l.get("message")?.as_str()?.to_string(),
            })
        })
        .collect()
}
