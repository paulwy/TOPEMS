use axum::{extract::{Extension, Path, Query, State}, Json, Router, routing::{get, post, put, delete}};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

// Notification integration client
struct NotificationClient {
    base_url: String,
}

impl NotificationClient {
    fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
        }
    }

    async fn send_alert_notification(&self, alert: &Alert) -> Result<(), reqwest::Error> {
        let payload = serde_json::json!({
            "type": "alert",
            "title": alert.title.clone(),
            "message": alert.message.clone(),
            "severity": alert.severity.clone(),
            "service_name": alert.service_name.clone(),
            "timestamp": alert.timestamp.to_rfc3339(),
        });

        reqwest::Client::new()
            .post(format!("{}/api/core/communication/notification/send", self.base_url))
            .json(&payload)
            .send()
            .await?;

        Ok(())
    }

    async fn send_realtime_push(&self, alert: &Alert) -> Result<(), reqwest::Error> {
        let payload = serde_json::json!({
            "channel": "alerts",
            "event": "alert_new",
            "data": {
                "id": alert.id.to_string(),
                "service_name": alert.service_name.clone(),
                "severity": alert.severity.clone(),
                "title": alert.title.clone(),
                "message": alert.message.clone(),
                "timestamp": alert.timestamp.to_rfc3339(),
            }
        });

        reqwest::Client::new()
            .post(format!("{}/api/core/communication/push/send", self.base_url))
            .json(&payload)
            .send()
            .await?;

        Ok(())
    }
}

// Alert Rule Types
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub service_name: Option<String>,
    pub severity: String,
    pub condition: RuleCondition,
    pub actions: Vec<RuleAction>,
    pub enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RuleCondition {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
    pub comparison_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RuleAction {
    pub action_type: String,
    pub target: Option<String>,
    pub config: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct AlertRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub service_name: Option<String>,
    pub severity: String,
    pub condition: RuleCondition,
    pub actions: Vec<RuleAction>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlertStatistics {
    pub total_alerts: i64,
    pub active_alerts: i64,
    pub resolved_alerts: i64,
    pub critical_count: i64,
    pub error_count: i64,
    pub warning_count: i64,
    pub info_count: i64,
    pub top_services: Vec<ServiceAlertCount>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceAlertCount {
    pub service_name: String,
    pub alert_count: i64,
}

// Advanced Alert Rule Types

/// Scheduled trigger configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduledTrigger {
    pub enabled: bool,
    pub cron_expression: Option<String>,
    pub timezone: Option<String>,
    pub window_start: Option<String>,
    pub window_end: Option<String>,
}

/// Multi-level alert escalation
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertEscalation {
    pub enabled: bool,
    pub levels: Vec<EscalationLevel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EscalationLevel {
    pub level: i32,
    pub name: String,
    pub delay_minutes: i32,
    pub actions: Vec<RuleAction>,
    pub notify_users: Option<Vec<String>>,
    pub auto_resolve: Option<bool>,
}

/// Alert routing configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertRouting {
    pub rules: Vec<RoutingRule>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RoutingRule {
    pub id: String,
    pub name: String,
    pub conditions: Vec<RouteCondition>,
    pub action: String,
    pub target: String,
    pub priority: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteCondition {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

/// Alert template for notifications
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertTemplate {
    pub id: String,
    pub name: String,
    pub channels: Vec<String>,
    pub subject_template: String,
    pub body_template: String,
    pub variables: Vec<String>,
}

/// Alert suppression rule
#[derive(Debug, Serialize, Deserialize)]
pub struct SuppressionRule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub conditions: Vec<SuppressionCondition>,
    pub duration_minutes: i32,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SuppressionCondition {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

/// Advanced rule request
#[derive(Debug, Serialize, Deserialize)]
pub struct AdvancedRuleRequest {
    pub basic: AlertRuleRequest,
    pub scheduled_trigger: Option<ScheduledTrigger>,
    pub escalation: Option<AlertEscalation>,
    pub routing: Option<AlertRouting>,
    pub template: Option<AlertTemplate>,
    pub suppression: Option<SuppressionRule>,
}

/// Alert history entry
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertHistory {
    pub id: String,
    pub alert_id: String,
    pub action: String,
    pub performed_by: Option<String>,
    pub performed_at: String,
    pub details: Option<serde_json::Value>,
}

/// Alert timeline
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertTimeline {
    pub alert_id: String,
    pub events: Vec<TimelineEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub timestamp: String,
    pub event_type: String,
    pub description: String,
    pub actor: Option<String>,
}

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
        .route("/api/v1/monitor/alerts/statistics", get(get_alert_statistics))
        .route("/api/v1/monitor/alerts/acknowledge", post(acknowledge_alerts))
        .route("/api/v1/monitor/alerts/resolve", post(resolve_alerts))
        .route("/api/v1/monitor/alerts/:id/history", get(get_alert_history))
        .route("/api/v1/monitor/alerts/:id/timeline", get(get_alert_timeline))
        // Alert Rules API
        .route("/api/v1/monitor/rules", get(list_rules).post(create_rule))
        .route("/api/v1/monitor/rules/:id", get(get_rule).put(update_rule).delete(delete_rule))
        .route("/api/v1/monitor/rules/:id/enable", post(enable_rule))
        .route("/api/v1/monitor/rules/:id/disable", post(disable_rule))
        .route("/api/v1/monitor/rules/:id/advanced", get(get_advanced_rule).put(update_advanced_rule))
        // Advanced Alert Configuration
        .route("/api/v1/monitor/rules/:id/scheduled-trigger", get(get_scheduled_trigger).put(update_scheduled_trigger))
        .route("/api/v1/monitor/rules/:id/escalation", get(get_escalation).put(update_escalation))
        .route("/api/v1/monitor/rules/:id/routing", get(get_routing).put(update_routing))
        .route("/api/v1/monitor/templates", get(list_templates).post(create_template))
        .route("/api/v1/monitor/templates/:id", get(get_template).put(update_template).delete(delete_template))
        .route("/api/v1/monitor/suppression", get(list_suppression_rules).post(create_suppression_rule))
        .route("/api/v1/monitor/suppression/:id", get(get_suppression_rule).put(update_suppression_rule).delete(delete_suppression_rule))
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

// Alert Statistics
async fn get_alert_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<AlertStatistics>> {
    let stats = AlertStatistics {
        total_alerts: 156,
        active_alerts: 23,
        resolved_alerts: 133,
        critical_count: 5,
        error_count: 8,
        warning_count: 15,
        info_count: 128,
        top_services: vec![
            ServiceAlertCount { service_name: "topems-erp".to_string(), alert_count: 45 },
            ServiceAlertCount { service_name: "topems-crm".to_string(), alert_count: 38 },
            ServiceAlertCount { service_name: "topems-pm".to_string(), alert_count: 29 },
            ServiceAlertCount { service_name: "topems-ai".to_string(), alert_count: 22 },
            ServiceAlertCount { service_name: "topems-wms".to_string(), alert_count: 22 },
        ],
    };

    Json(ApiResponse::success(stats, "获取告警统计成功"))
}

// Batch acknowledge alerts
async fn acknowledge_alerts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let alert_ids: Vec<String> = req.get("alert_ids")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    Json(ApiResponse::success(
        serde_json::json!({
            "acknowledged_count": alert_ids.len(),
            "alert_ids": alert_ids
        }),
        "告警确认成功",
    ))
}

// Batch resolve alerts
async fn resolve_alerts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let alert_ids: Vec<String> = req.get("alert_ids")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    Json(ApiResponse::success(
        serde_json::json!({
            "resolved_count": alert_ids.len(),
            "alert_ids": alert_ids
        }),
        "告警已解决",
    ))
}

// Alert Rules API
async fn list_rules(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AlertRule>>> {
    let rules = vec![
        AlertRule {
            id: Uuid::new_v4(),
            name: "响应时间告警规则".to_string(),
            description: Some("当服务响应时间超过阈值时触发告警".to_string()),
            service_name: Some("topems-pm".to_string()),
            severity: "warning".to_string(),
            condition: RuleCondition {
                field: "response_time".to_string(),
                operator: "gt".to_string(),
                value: serde_json::json!(150),
                comparison_type: Some("milliseconds".to_string()),
            },
            actions: vec![
                RuleAction {
                    action_type: "notification".to_string(),
                    target: Some("admin".to_string()),
                    config: serde_json::json!({ "channel": "email" }),
                },
                RuleAction {
                    action_type: "webhook".to_string(),
                    target: None,
                    config: serde_json::json!({ "url": "https://example.com/webhook" }),
                },
            ],
            enabled: true,
            created_at: chrono::Utc::now() - chrono::Duration::days(7),
            updated_at: chrono::Utc::now() - chrono::Duration::days(1),
        },
        AlertRule {
            id: Uuid::new_v4(),
            name: "数据库连接池告警".to_string(),
            description: Some("当数据库连接池使用率超过80%时触发告警".to_string()),
            service_name: None,
            severity: "error".to_string(),
            condition: RuleCondition {
                field: "connection_pool_usage".to_string(),
                operator: "gt".to_string(),
                value: serde_json::json!(80),
                comparison_type: Some("percentage".to_string()),
            },
            actions: vec![
                RuleAction {
                    action_type: "notification".to_string(),
                    target: Some("dba-team".to_string()),
                    config: serde_json::json!({ "channel": "slack" }),
                },
            ],
            enabled: true,
            created_at: chrono::Utc::now() - chrono::Duration::days(14),
            updated_at: chrono::Utc::now(),
        },
        AlertRule {
            id: Uuid::new_v4(),
            name: "库存预警规则".to_string(),
            description: Some("当物料库存低于安全库存时触发告警".to_string()),
            service_name: Some("topems-wms".to_string()),
            severity: "info".to_string(),
            condition: RuleCondition {
                field: "stock_level".to_string(),
                operator: "lt".to_string(),
                value: serde_json::json!(500),
                comparison_type: None,
            },
            actions: vec![
                RuleAction {
                    action_type: "notification".to_string(),
                    target: Some("warehouse-manager".to_string()),
                    config: serde_json::json!({ "channel": "sms" }),
                },
            ],
            enabled: false,
            created_at: chrono::Utc::now() - chrono::Duration::days(30),
            updated_at: chrono::Utc::now() - chrono::Duration::days(10),
        },
    ];

    Json(ApiResponse::success(rules, "获取规则列表成功"))
}

async fn create_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let rule = AlertRule {
        id: Uuid::new_v4(),
        name: req.name,
        description: req.description,
        service_name: req.service_name,
        severity: req.severity,
        condition: req.condition,
        actions: req.actions,
        enabled: req.enabled.unwrap_or(true),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success(rule, "规则创建成功"))
}

async fn get_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRule>> {
    let rule = AlertRule {
        id,
        name: "响应时间告警规则".to_string(),
        description: Some("当服务响应时间超过阈值时触发告警".to_string()),
        service_name: Some("topems-pm".to_string()),
        severity: "warning".to_string(),
        condition: RuleCondition {
            field: "response_time".to_string(),
            operator: "gt".to_string(),
            value: serde_json::json!(150),
            comparison_type: Some("milliseconds".to_string()),
        },
        actions: vec![
            RuleAction {
                action_type: "notification".to_string(),
                target: Some("admin".to_string()),
                config: serde_json::json!({ "channel": "email" }),
            },
        ],
        enabled: true,
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success(rule, "获取规则详情成功"))
}

async fn update_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let rule = AlertRule {
        id,
        name: req.name,
        description: req.description,
        service_name: req.service_name,
        severity: req.severity,
        condition: req.condition,
        actions: req.actions,
        enabled: req.enabled.unwrap_or(true),
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success(rule, "规则更新成功"))
}

async fn delete_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "id": id.to_string() }),
        "规则删除成功",
    ))
}

async fn enable_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRule>> {
    let rule = AlertRule {
        id,
        name: "响应时间告警规则".to_string(),
        description: Some("当服务响应时间超过阈值时触发告警".to_string()),
        service_name: Some("topems-pm".to_string()),
        severity: "warning".to_string(),
        condition: RuleCondition {
            field: "response_time".to_string(),
            operator: "gt".to_string(),
            value: serde_json::json!(150),
            comparison_type: Some("milliseconds".to_string()),
        },
        actions: vec![],
        enabled: true,
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success(rule, "规则已启用"))
}

async fn disable_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRule>> {
    let rule = AlertRule {
        id,
        name: "响应时间告警规则".to_string(),
        description: Some("当服务响应时间超过阈值时触发告警".to_string()),
        service_name: Some("topems-pm".to_string()),
        severity: "warning".to_string(),
        condition: RuleCondition {
            field: "response_time".to_string(),
            operator: "gt".to_string(),
            value: serde_json::json!(150),
            comparison_type: Some("milliseconds".to_string()),
        },
        actions: vec![],
        enabled: false,
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success(rule, "规则已禁用"))
}

// Advanced Alert Rule Handlers

async fn get_alert_history(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<AlertHistory>>> {
    let history = vec![
        AlertHistory {
            id: "1".to_string(),
            alert_id: id.to_string(),
            action: "created".to_string(),
            performed_by: Some("system".to_string()),
            performed_at: (chrono::Utc::now() - chrono::Duration::hours(2)).to_rfc3339(),
            details: Some(serde_json::json!({"source": "monitoring"})),
        },
        AlertHistory {
            id: "2".to_string(),
            alert_id: id.to_string(),
            action: "acknowledged".to_string(),
            performed_by: Some("admin".to_string()),
            performed_at: (chrono::Utc::now() - chrono::Duration::hours(1)).to_rfc3339(),
            details: Some(serde_json::json!({"note": "开始调查"})),
        },
    ];

    Json(ApiResponse::success(history, "获取告警历史成功"))
}

async fn get_alert_timeline(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertTimeline>> {
    let timeline = AlertTimeline {
        alert_id: id.to_string(),
        events: vec![
            TimelineEvent {
                timestamp: (chrono::Utc::now() - chrono::Duration::hours(2)).to_rfc3339(),
                event_type: "alert_created".to_string(),
                description: "告警被创建".to_string(),
                actor: Some("system".to_string()),
            },
            TimelineEvent {
                timestamp: (chrono::Utc::now() - chrono::Duration::hours(1)).to_rfc3339(),
                event_type: "alert_acknowledged".to_string(),
                description: "告警已被确认".to_string(),
                actor: Some("admin".to_string()),
            },
            TimelineEvent {
                timestamp: chrono::Utc::now().to_rfc3339(),
                event_type: "escalation_triggered".to_string(),
                description: "触发升级通知".to_string(),
                actor: Some("system".to_string()),
            },
        ],
    };

    Json(ApiResponse::success(timeline, "获取告警时间线成功"))
}

async fn get_scheduled_trigger(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScheduledTrigger>> {
    let trigger = ScheduledTrigger {
        enabled: true,
        cron_expression: Some("0 */5 * * * *".to_string()),
        timezone: Some("Asia/Shanghai".to_string()),
        window_start: Some("09:00".to_string()),
        window_end: Some("18:00".to_string()),
    };

    Json(ApiResponse::success(trigger, "获取定时触发配置成功"))
}

async fn update_scheduled_trigger(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduledTrigger>,
) -> Json<ApiResponse<ScheduledTrigger>> {
    Json(ApiResponse::success(req, "定时触发配置已更新"))
}

async fn get_escalation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertEscalation>> {
    let escalation = AlertEscalation {
        enabled: true,
        levels: vec![
            EscalationLevel {
                level: 1,
                name: "Level 1 - 通知".to_string(),
                delay_minutes: 15,
                actions: vec![RuleAction {
                    action_type: "notification".to_string(),
                    target: Some("on_call".to_string()),
                    config: serde_json::json!({"channel": "email"}),
                }],
                notify_users: Some(vec!["on_call@company.com".to_string()]),
                auto_resolve: Some(false),
            },
            EscalationLevel {
                level: 2,
                name: "Level 2 - 升级".to_string(),
                delay_minutes: 30,
                actions: vec![RuleAction {
                    action_type: "notification".to_string(),
                    target: Some("manager".to_string()),
                    config: serde_json::json!({"channel": "sms"}),
                }],
                notify_users: Some(vec!["manager@company.com".to_string()]),
                auto_resolve: Some(false),
            },
            EscalationLevel {
                level: 3,
                name: "Level 3 - 紧急".to_string(),
                delay_minutes: 60,
                actions: vec![RuleAction {
                    action_type: "webhook".to_string(),
                    target: None,
                    config: serde_json::json!({"url": "https://emergency.company.com/webhook"}),
                }],
                notify_users: Some(vec!["cto@company.com".to_string()]),
                auto_resolve: Some(false),
            },
        ],
    };

    Json(ApiResponse::success(escalation, "获取告警升级配置成功"))
}

async fn update_escalation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AlertEscalation>,
) -> Json<ApiResponse<AlertEscalation>> {
    Json(ApiResponse::success(req, "告警升级配置已更新"))
}

async fn get_routing(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRouting>> {
    let routing = AlertRouting {
        rules: vec![
            RoutingRule {
                id: "1".to_string(),
                name: "严重告警路由".to_string(),
                conditions: vec![RouteCondition {
                    field: "severity".to_string(),
                    operator: "eq".to_string(),
                    value: serde_json::json!("critical"),
                }],
                action: "route".to_string(),
                target: "emergency-channel".to_string(),
                priority: 1,
            },
            RoutingRule {
                id: "2".to_string(),
                name: "性能告警路由".to_string(),
                conditions: vec![RouteCondition {
                    field: "service_type".to_string(),
                    operator: "eq".to_string(),
                    value: serde_json::json!("performance"),
                }],
                action: "route".to_string(),
                target: "performance-team".to_string(),
                priority: 2,
            },
        ],
    };

    Json(ApiResponse::success(routing, "获取告警路由配置成功"))
}

async fn update_routing(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AlertRouting>,
) -> Json<ApiResponse<AlertRouting>> {
    Json(ApiResponse::success(req, "告警路由配置已更新"))
}

// Template Management
async fn list_templates(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AlertTemplate>>> {
    let templates = vec![
        AlertTemplate {
            id: "1".to_string(),
            name: "邮件告警模板".to_string(),
            channels: vec!["email".to_string()],
            subject_template: "[{{severity}}] {{service_name}} - {{title}}".to_string(),
            body_template: "告警详情:\n服务: {{service_name}}\n严重程度: {{severity}}\n描述: {{message}}\n时间: {{timestamp}}".to_string(),
            variables: vec!["severity".to_string(), "service_name".to_string(), "title".to_string(), "message".to_string(), "timestamp".to_string()],
        },
        AlertTemplate {
            id: "2".to_string(),
            name: "Slack告警模板".to_string(),
            channels: vec!["slack".to_string()],
            subject_template: "".to_string(),
            body_template: ":warning: *{{severity}} Alert*\n*Service:* {{service_name}}\n{{message}}".to_string(),
            variables: vec!["severity".to_string(), "service_name".to_string(), "message".to_string()],
        },
    ];

    Json(ApiResponse::success(templates, "获取告警模板列表成功"))
}

async fn create_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AlertTemplate>,
) -> Json<ApiResponse<AlertTemplate>> {
    Json(ApiResponse::success(req, "告警模板创建成功"))
}

async fn get_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<AlertTemplate>> {
    let template = AlertTemplate {
        id: id.clone(),
        name: "邮件告警模板".to_string(),
        channels: vec!["email".to_string()],
        subject_template: "[{{severity}}] {{service_name}} - {{title}}".to_string(),
        body_template: "告警详情:\n服务: {{service_name}}\n严重程度: {{severity}}\n描述: {{message}}\n时间: {{timestamp}}".to_string(),
        variables: vec!["severity".to_string(), "service_name".to_string(), "title".to_string(), "message".to_string(), "timestamp".to_string()],
    };

    Json(ApiResponse::success(template, "获取告警模板成功"))
}

async fn update_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<AlertTemplate>,
) -> Json<ApiResponse<AlertTemplate>> {
    Json(ApiResponse::success(req, "告警模板更新成功"))
}

async fn delete_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({"id": id}), "告警模板删除成功"))
}

// Suppression Rules
async fn list_suppression_rules(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SuppressionRule>>> {
    let rules = vec![
        SuppressionRule {
            id: "1".to_string(),
            name: "计划内维护窗口".to_string(),
            description: Some("在计划维护期间抑制相关告警".to_string()),
            conditions: vec![SuppressionCondition {
                field: "maintenance_window".to_string(),
                operator: "eq".to_string(),
                value: serde_json::json!(true),
            }],
            duration_minutes: 120,
            enabled: true,
        },
    ];

    Json(ApiResponse::success(rules, "获取抑制规则列表成功"))
}

async fn create_suppression_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SuppressionRule>,
) -> Json<ApiResponse<SuppressionRule>> {
    Json(ApiResponse::success(req, "抑制规则创建成功"))
}

async fn get_suppression_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SuppressionRule>> {
    let rule = SuppressionRule {
        id: id.clone(),
        name: "计划内维护窗口".to_string(),
        description: Some("在计划维护期间抑制相关告警".to_string()),
        conditions: vec![SuppressionCondition {
            field: "maintenance_window".to_string(),
            operator: "eq".to_string(),
            value: serde_json::json!(true),
        }],
        duration_minutes: 120,
        enabled: true,
    };

    Json(ApiResponse::success(rule, "获取抑制规则成功"))
}

async fn update_suppression_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<SuppressionRule>,
) -> Json<ApiResponse<SuppressionRule>> {
    Json(ApiResponse::success(req, "抑制规则更新成功"))
}

async fn delete_suppression_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({"id": id}), "抑制规则删除成功"))
}

// Advanced Rule Handler
async fn get_advanced_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let advanced = serde_json::json!({
        "basic": {
            "id": id.to_string(),
            "name": "响应时间告警规则",
            "description": "当服务响应时间超过阈值时触发告警",
            "severity": "warning",
            "enabled": true
        },
        "scheduled_trigger": {
            "enabled": true,
            "cron_expression": "0 */5 * * * *",
            "timezone": "Asia/Shanghai",
            "window_start": "09:00",
            "window_end": "18:00"
        },
        "escalation": {
            "enabled": true,
            "levels": [
                {
                    "level": 1,
                    "name": "通知",
                    "delay_minutes": 15,
                    "actions": [{"action_type": "notification", "target": "on_call"}]
                },
                {
                    "level": 2,
                    "name": "升级",
                    "delay_minutes": 30,
                    "actions": [{"action_type": "notification", "target": "manager"}]
                }
            ]
        }
    });

    Json(ApiResponse::success(advanced, "获取高级规则配置成功"))
}

async fn update_advanced_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(req, "高级规则配置已更新"))
}