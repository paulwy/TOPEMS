use axum::{
    extract::{Extension, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::{Db, ScopedTxn};
use uuid::Uuid;

use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_service_client::service_client::{
    api::hrm_api::HrmApi, api::mes_api::MesApi, api::notification_api::NotificationApi,
    api::qms_api::QmsApi, TypedServiceClient, WorkflowApi,
};

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:workbench:read"])),
    path = "/workbench",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "workbench"
)]
#[allow(clippy::as_conversions)]
pub async fn get_workbench_data(
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    State(hrm_client): State<TypedServiceClient<HrmApi>>,
    State(mes_client): State<TypedServiceClient<MesApi>>,
    State(qms_client): State<TypedServiceClient<QmsApi>>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter = tenant_filter(&claims);

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

    // 待审批数：与 /mobile/approvals 同源（Workflow 我的待办任务 total），不再写 0。
    let pending_approvals: i64 = match &bearer_token {
        Some(token) => {
            let mut client = workflow_client.clone();
            client.set_auth_token(token);
            match client.get_my_pending_tasks(1, 1).await {
                Ok(result) => result.total,
                Err(e) => {
                    tracing::warn!("调用Workflow服务获取待审批数失败: {}", e);
                    0
                }
            }
        }
        None => 0,
    };

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

    let shortcuts = get_shortcuts(&mut scope, &user_id, tenant_filter).await;

    let __mobile_response = {
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
            ApiResponse::success(workbench_data, "获取工作台数据成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
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

async fn get_shortcuts(
    scope: &mut ScopedTxn<'_>,
    user_id: &str,
    _tenant_filter: Option<Uuid>,
) -> Vec<Shortcut> {
    let rows = sqlx::query(
        only_own_schema_query!("mobile", "SELECT id::text AS id, name, icon, COALESCE(action_type, '') as path, '#1890ff' as color FROM mobile.shortcuts WHERE (user_id = $1 OR user_id IS NULL) ORDER BY sort_order"),
    )
    .bind(user_id)
    .fetch_all(&mut *scope)
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
