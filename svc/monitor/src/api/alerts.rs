use axum::{extract::{Extension, Path, Query, State}, Json, Router, routing::{get, post}};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Serialize, Deserialize)]
pub struct Alert {
    pub id: Uuid,
    pub service_name: String,
    pub severity: String,
    pub status: String,
    pub title: String,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub acknowledged_at: Option<chrono::DateTime<chrono::Utc>>,
    pub acknowledged_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AlertQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub service_name: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/monitor/alerts", get(list_alerts))
        .route("/api/v1/monitor/alerts/:id", get(get_alert).post(update_alert))
}

async fn list_alerts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let alerts = vec![
        Alert {
            id: Uuid::new_v4(),
            service_name: "topems-pm".to_string(),
            severity: "warning".to_string(),
            status: "active".to_string(),
            title: "服务响应缓慢".to_string(),
            message: "topems-pm 服务平均响应时间超过 150ms，请检查".to_string(),
            timestamp: chrono::Utc::now() - chrono::Duration::minutes(30),
            acknowledged_at: None,
            acknowledged_by: None,
        },
        Alert {
            id: Uuid::new_v4(),
            service_name: "topems-crm".to_string(),
            severity: "error".to_string(),
            status: "resolved".to_string(),
            title: "数据库连接异常".to_string(),
            message: "CRM 服务数据库连接池达到上限，已自动扩容".to_string(),
            timestamp: chrono::Utc::now() - chrono::Duration::hours(2),
            acknowledged_at: Some(chrono::Utc::now() - chrono::Duration::hours(1)),
            acknowledged_by: Some("admin".to_string()),
        },
        Alert {
            id: Uuid::new_v4(),
            service_name: "topems-ai".to_string(),
            severity: "info".to_string(),
            status: "active".to_string(),
            title: "模型加载完成".to_string(),
            message: "AI 模型 v2.0 已成功加载并部署".to_string(),
            timestamp: chrono::Utc::now() - chrono::Duration::minutes(5),
            acknowledged_at: None,
            acknowledged_by: None,
        },
        Alert {
            id: Uuid::new_v4(),
            service_name: "topems-erp".to_string(),
            severity: "critical".to_string(),
            status: "active".to_string(),
            title: "定时任务失败".to_string(),
            message: "ERP 月末结账定时任务执行失败，请手动处理".to_string(),
            timestamp: chrono::Utc::now() - chrono::Duration::hours(1),
            acknowledged_at: None,
            acknowledged_by: None,
        },
        Alert {
            id: Uuid::new_v4(),
            service_name: "topems-wms".to_string(),
            severity: "warning".to_string(),
            status: "active".to_string(),
            title: "库存预警".to_string(),
            message: "物料 A001 库存低于安全库存，当前库存: 100，安全库存: 500".to_string(),
            timestamp: chrono::Utc::now() - chrono::Duration::hours(4),
            acknowledged_at: None,
            acknowledged_by: None,
        },
    ];

    let filtered_alerts: Vec<Alert> = alerts
        .into_iter()
        .filter(|a| {
            if let Some(s) = &params.severity {
                if a.severity != *s {
                    return false;
                }
            }
            if let Some(st) = &params.status {
                if a.status != *st {
                    return false;
                }
            }
            if let Some(sn) = &params.service_name {
                if a.service_name != *sn {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered_alerts.len() as i64;
    let paginated: Vec<Alert> = filtered_alerts
        .into_iter()
        .skip(offset as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "items": paginated,
            "total": total,
            "page": page,
            "page_size": page_size
        }),
        "获取告警列表成功",
    ))
}

async fn get_alert(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Alert>> {
    let alert = Alert {
        id,
        service_name: "topems-pm".to_string(),
        severity: "warning".to_string(),
        status: "active".to_string(),
        title: "服务响应缓慢".to_string(),
        message: "topems-pm 服务平均响应时间超过 150ms，请检查".to_string(),
        timestamp: chrono::Utc::now() - chrono::Duration::minutes(30),
        acknowledged_at: None,
        acknowledged_by: None,
    };

    Json(ApiResponse::success(alert, "获取告警详情成功"))
}

async fn update_alert(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Alert>> {
    let status = req.get("status").and_then(|v| v.as_str()).unwrap_or("active");

    let alert = Alert {
        id,
        service_name: "topems-pm".to_string(),
        severity: "warning".to_string(),
        status: status.to_string(),
        title: "服务响应缓慢".to_string(),
        message: "topems-pm 服务平均响应时间超过 150ms，请检查".to_string(),
        timestamp: chrono::Utc::now() - chrono::Duration::minutes(30),
        acknowledged_at: if status == "resolved" {
            Some(chrono::Utc::now())
        } else {
            None
        },
        acknowledged_by: if status == "resolved" {
            Some(claims.username.clone())
        } else {
            None
        },
    };

    Json(ApiResponse::success(alert, "告警状态更新成功"))
}