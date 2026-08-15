use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared::{ApiResponse, AuthState};
use topems_shared_service_client::service_client::{
    api::hrm_api::HrmApi, api::mes_api::MesApi, api::notification_api::NotificationApi,
    api::qms_api::QmsApi, TypedServiceClient, WorkflowServiceClient,
};

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileWorkbenchData {
    pub pending_tasks: i64,
    pub pending_approvals: i64,
    pub unread_notifications: i64,
    pub today_attendance_status: String,
    pub today_production_output: i64,
    pub today_quality_pass_rate: f64,
    pub shortcuts: Vec<Shortcut>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shortcut {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub path: String,
    pub color: String,
}

pub async fn get_workbench_data(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    State(workflow_client): State<WorkflowServiceClient>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    State(hrm_client): State<TypedServiceClient<HrmApi>>,
    State(mes_client): State<TypedServiceClient<MesApi>>,
    State(qms_client): State<TypedServiceClient<QmsApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let bearer_token = extract_bearer_token(&headers);

    let pending_tasks = match &bearer_token {
        Some(token) => {
            let mut client = workflow_client.clone();
            client.set_auth_token(token);
            match client.get_my_task_count().await {
                Ok(count) => count,
                Err(e) => {
                    tracing::warn!("调用Workflow服务获取待办任务数失败: {}", e);
                    0
                }
            }
        }
        None => 0,
    };

    let pending_approvals: i64 = 0;

    let unread_notifications = match &bearer_token {
        Some(token) => {
            let mut client = notification_client.clone();
            client.set_auth_token(token);
            match client.get_unread_count().await {
                Ok(count) => count as i64,
                Err(e) => {
                    tracing::warn!("调用Notification服务获取未读通知数失败: {}", e);
                    0
                }
            }
        }
        None => 0,
    };

    let today_attendance_status =
        check_attendance_status(&hrm_client, &bearer_token, &user_id).await;

    let today_production_output =
        get_today_production_output(&mes_client, &bearer_token, &user_id).await;

    let today_quality_pass_rate = get_today_quality_pass_rate(&qms_client, &bearer_token).await;

    let shortcuts = get_shortcuts(&pool, &user_id).await;

    let workbench_data = MobileWorkbenchData {
        pending_tasks,
        pending_approvals,
        unread_notifications,
        today_attendance_status,
        today_production_output,
        today_quality_pass_rate,
        shortcuts,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(workbench_data, "获取工作台数据成功")),
    )
}

async fn check_attendance_status(
    hrm_client: &TypedServiceClient<HrmApi>,
    bearer_token: &Option<String>,
    user_id: &str,
) -> String {
    match bearer_token {
        Some(token) => {
            let mut client = hrm_client.clone();
            client.set_auth_token(token);
            match client.get_today_attendance_status(user_id).await {
                Ok(status) => status,
                Err(e) => {
                    tracing::warn!("调用HRM服务获取今日考勤状态失败: {}", e);
                    "not_checked_in".to_string()
                }
            }
        }
        None => "not_checked_in".to_string(),
    }
}

async fn get_today_production_output(
    mes_client: &TypedServiceClient<MesApi>,
    bearer_token: &Option<String>,
    user_id: &str,
) -> i64 {
    match bearer_token {
        Some(token) => {
            let mut client = mes_client.clone();
            client.set_auth_token(token);
            match client.get_today_production_output(user_id).await {
                Ok(output) => output,
                Err(e) => {
                    tracing::warn!("调用MES服务获取今日产量失败: {}", e);
                    0
                }
            }
        }
        None => 0,
    }
}

async fn get_today_quality_pass_rate(
    qms_client: &TypedServiceClient<QmsApi>,
    bearer_token: &Option<String>,
) -> f64 {
    match bearer_token {
        Some(token) => {
            let mut client = qms_client.clone();
            client.set_auth_token(token);
            match client.get_today_quality_pass_rate().await {
                Ok(rate) => rate,
                Err(e) => {
                    tracing::warn!("调用QMS服务获取今日质量合格率失败: {}", e);
                    0.0
                }
            }
        }
        None => 0.0,
    }
}

async fn get_shortcuts(pool: &PgPool, user_id: &str) -> Vec<Shortcut> {
    let rows = sqlx::query(
        "SELECT id, name, icon, path, color FROM plugin_mobile.shortcuts WHERE user_id = $1 OR user_id IS NULL ORDER BY sort_order",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => rows
            .into_iter()
            .map(|r| Shortcut {
                id: r.get::<String, _>("id"),
                name: r.get::<String, _>("name"),
                icon: r.get::<String, _>("icon"),
                path: r.get::<String, _>("path"),
                color: r.get::<String, _>("color"),
            })
            .collect(),
        Err(_) => vec![
            Shortcut {
                id: "patrol".to_string(),
                name: "巡检".to_string(),
                icon: "patrol".to_string(),
                path: "/mobile/patrol".to_string(),
                color: "#1890ff".to_string(),
            },
            Shortcut {
                id: "scan".to_string(),
                name: "扫码".to_string(),
                icon: "scan".to_string(),
                path: "/mobile/scan".to_string(),
                color: "#52c41a".to_string(),
            },
            Shortcut {
                id: "approval".to_string(),
                name: "审批".to_string(),
                icon: "approval".to_string(),
                path: "/mobile/approval".to_string(),
                color: "#faad14".to_string(),
            },
            Shortcut {
                id: "task".to_string(),
                name: "任务".to_string(),
                icon: "task".to_string(),
                path: "/mobile/task".to_string(),
                color: "#722ed1".to_string(),
            },
            Shortcut {
                id: "attendance".to_string(),
                name: "考勤".to_string(),
                icon: "attendance".to_string(),
                path: "/mobile/attendance".to_string(),
                color: "#13c2c2".to_string(),
            },
            Shortcut {
                id: "inventory".to_string(),
                name: "库存".to_string(),
                icon: "inventory".to_string(),
                path: "/mobile/inventory".to_string(),
                color: "#eb2f96".to_string(),
            },
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn workbench_shortcut_roundtrip() {
        roundtrip(&Shortcut {
            id: "1".into(),
            name: "scan".into(),
            icon: "Scan".into(),
            path: "/mobile/scan".into(),
            color: "#1890ff".into(),
        });
    }

    #[test]
    fn mobile_workbench_data_roundtrip() {
        roundtrip(&MobileWorkbenchData {
            pending_tasks: 3,
            pending_approvals: 0,
            unread_notifications: 5,
            today_attendance_status: "checked_in".into(),
            today_production_output: 100,
            today_quality_pass_rate: 98.5,
            shortcuts: vec![Shortcut {
                id: "1".into(),
                name: "scan".into(),
                icon: "Scan".into(),
                path: "/mobile/scan".into(),
                color: "#1890ff".into(),
            }],
        });
    }
}
