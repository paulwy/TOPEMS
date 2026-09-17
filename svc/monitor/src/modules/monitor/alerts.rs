use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

// Alert Rule Types
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
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

#[derive(Debug, Serialize, Deserialize)]
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
    pub tenant_id: Uuid,
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

// ==================== 纯函数（无副作用，便于单元测试） ====================

/// 生成告警去重键：metric_name + 排序后的 labels。
pub fn alert_dedup_key(
    metric_name: &str,
    labels: &std::collections::HashMap<String, String>,
) -> String {
    let mut pairs: Vec<String> = labels.iter().map(|(k, v)| format!("{}={}", k, v)).collect();
    pairs.sort();
    format!("{}|{}", metric_name, pairs.join(","))
}

/// 判断告警是否处于冷却期。
/// - last_fired_at: 上次触发时间（unix 秒），0 表示从未触发
/// - cooldown_seconds: 冷却时长（秒）
/// - now: 当前时间（unix 秒）
/// 返回 true 表示仍在冷却中（不应重复触发）。
pub fn is_alert_in_cooldown(last_fired_at: i64, cooldown_seconds: i64, now: i64) -> bool {
    if last_fired_at == 0 || cooldown_seconds <= 0 {
        return false;
    }
    now - last_fired_at < cooldown_seconds
}

/// 返回告警严重级别的数值排序（数值越大越严重）。
/// critical=4, error=3, warning=2, info=1, 未知=0
pub fn severity_rank(severity: &str) -> i32 {
    match severity {
        "critical" => 4,
        "error" => 3,
        "warning" => 2,
        "info" => 1,
        _ => 0,
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/alerts", get(list_alerts))
        .route("/alerts/{id}", get(get_alert).post(update_alert))
        .route("/alerts/statistics", get(get_alert_statistics))
        .route("/alerts/acknowledge", post(acknowledge_alerts))
        .route("/alerts/resolve", post(resolve_alerts))
        .route("/alerts/{id}/acknowledge", post(acknowledge_alert))
        .route("/alerts/{id}/resolve", post(resolve_alert))
        .route("/alerts/{id}/history", get(get_alert_history))
        .route("/alerts/{id}/timeline", get(get_alert_timeline))
        // Alert Rules API
        .route("/rules", get(list_rules).post(create_rule))
        .route(
            "/rules/{id}",
            get(get_rule).put(update_rule).delete(delete_rule),
        )
        .route("/rules/{id}/enable", post(enable_rule))
        .route("/rules/{id}/disable", post(disable_rule))
        .route(
            "/rules/{id}/advanced",
            get(get_advanced_rule).put(update_advanced_rule),
        )
        // Advanced Alert Configuration
        .route(
            "/rules/{id}/scheduled-trigger",
            get(get_scheduled_trigger).put(update_scheduled_trigger),
        )
        .route(
            "/rules/{id}/escalation",
            get(get_escalation).put(update_escalation),
        )
        .route("/rules/{id}/routing", get(get_routing).put(update_routing))
        .route("/templates", get(list_templates).post(create_template))
        .route(
            "/templates/{id}",
            get(get_template)
                .put(update_template)
                .delete(delete_template),
        )
        .route(
            "/suppression",
            get(list_suppression_rules).post(create_suppression_rule),
        )
        .route(
            "/suppression/{id}",
            get(get_suppression_rule)
                .put(update_suppression_rule)
                .delete(delete_suppression_rule),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:alert:read"])),
    path = "/api/monitor/alerts",
    tag = "alerts",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_alerts(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let alerts = vec![
        Alert {
            id: Uuid::new_v4(),
            tenant_id,
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
            tenant_id,
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
            tenant_id,
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
            tenant_id,
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
            tenant_id,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:alert:read"])),
    path = "/api/monitor/alerts/{id}",
    tag = "alerts",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_alert(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Alert>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let alert = Alert {
        id,
        tenant_id,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:alert:write"])),
    path = "/api/monitor/alerts/{id}",
    request_body = serde_json::Value,
    tag = "alerts",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_alert(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Alert>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("active");

    let alert = Alert {
        id,
        tenant_id,
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:alert:read"])),
    path = "/api/monitor/alerts/statistics",
    tag = "alerts",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_alert_statistics(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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
            ServiceAlertCount {
                service_name: "topems-erp".to_string(),
                alert_count: 45,
            },
            ServiceAlertCount {
                service_name: "topems-crm".to_string(),
                alert_count: 38,
            },
            ServiceAlertCount {
                service_name: "topems-pm".to_string(),
                alert_count: 29,
            },
            ServiceAlertCount {
                service_name: "topems-ai".to_string(),
                alert_count: 22,
            },
            ServiceAlertCount {
                service_name: "topems-wms".to_string(),
                alert_count: 22,
            },
        ],
    };

    Json(ApiResponse::success(stats, "获取告警统计成功"))
}

// Batch acknowledge alerts
#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:alert:write"])),
    path = "/api/monitor/alerts/acknowledge",
    request_body = serde_json::Value,
    tag = "alerts",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn acknowledge_alerts(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let alert_ids: Vec<String> = req
        .get("alert_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:alert:write"])),
    path = "/api/monitor/alerts/resolve",
    request_body = serde_json::Value,
    tag = "alerts",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn resolve_alerts(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let alert_ids: Vec<String> = req
        .get("alert_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    Json(ApiResponse::success(
        serde_json::json!({
            "resolved_count": alert_ids.len(),
            "alert_ids": alert_ids
        }),
        "告警已解决",
    ))
}

// Single alert acknowledge（前端 acknowledgeAlert(id) → POST /alerts/{id}/acknowledge）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:alert:write"])),
    path = "/api/monitor/alerts/{id}/acknowledge",
    request_body = serde_json::Value,
    tag = "alerts",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn acknowledge_alert(
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let note = req.get("note").and_then(|v| v.as_str()).unwrap_or("");
    Json(ApiResponse::success(
        serde_json::json!({
            "alert_id": id,
            "status": "acknowledged",
            "acknowledged_at": chrono::Utc::now().to_rfc3339(),
            "note": note
        }),
        "告警已确认",
    ))
}

// Single alert resolve（前端 resolveAlert(id) → POST /alerts/{id}/resolve）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:alert:write"])),
    path = "/api/monitor/alerts/{id}/resolve",
    request_body = serde_json::Value,
    tag = "alerts",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn resolve_alert(
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let reason = req.get("reason").and_then(|v| v.as_str()).unwrap_or("");
    Json(ApiResponse::success(
        serde_json::json!({
            "alert_id": id,
            "status": "resolved",
            "resolved_at": chrono::Utc::now().to_rfc3339(),
            "reason": reason
        }),
        "告警已解决",
    ))
}

// Alert Rules API
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/rules",
    tag = "alert_rules",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_rules(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AlertRule>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rules = vec![
        AlertRule {
            id: Uuid::new_v4(),
            tenant_id,
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
            tenant_id,
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
            actions: vec![RuleAction {
                action_type: "notification".to_string(),
                target: Some("dba-team".to_string()),
                config: serde_json::json!({ "channel": "slack" }),
            }],
            enabled: true,
            created_at: chrono::Utc::now() - chrono::Duration::days(14),
            updated_at: chrono::Utc::now(),
        },
        AlertRule {
            id: Uuid::new_v4(),
            tenant_id,
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
            actions: vec![RuleAction {
                action_type: "notification".to_string(),
                target: Some("warehouse-manager".to_string()),
                config: serde_json::json!({ "channel": "sms" }),
            }],
            enabled: false,
            created_at: chrono::Utc::now() - chrono::Duration::days(30),
            updated_at: chrono::Utc::now() - chrono::Duration::days(10),
        },
    ];

    Json(ApiResponse::success(rules, "获取规则列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:write"])),
    path = "/api/monitor/rules",
    request_body = AlertRuleRequest,
    tag = "alert_rules",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_rule(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rule = AlertRule {
        id: Uuid::new_v4(),
        tenant_id,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/rules/{id}",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_rule(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRule>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rule = AlertRule {
        id,
        tenant_id,
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
        actions: vec![RuleAction {
            action_type: "notification".to_string(),
            target: Some("admin".to_string()),
            config: serde_json::json!({ "channel": "email" }),
        }],
        enabled: true,
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success(rule, "获取规则详情成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/rules/{id}",
    request_body = AlertRuleRequest,
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_rule(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rule = AlertRule {
        id,
        tenant_id,
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:delete"])),
    path = "/api/monitor/rules/{id}",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "id": id.to_string() }),
        "规则删除成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:write"])),
    path = "/api/monitor/rules/{id}/enable",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn enable_rule(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRule>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rule = AlertRule {
        id,
        tenant_id,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:write"])),
    path = "/api/monitor/rules/{id}/disable",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn disable_rule(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertRule>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let rule = AlertRule {
        id,
        tenant_id,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:alert:read"])),
    path = "/api/monitor/alerts/{id}/history",
    tag = "alerts",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_alert_history(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:alert:read"])),
    path = "/api/monitor/alerts/{id}/timeline",
    tag = "alerts",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_alert_timeline(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/rules/{id}/scheduled-trigger",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_scheduled_trigger(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/rules/{id}/scheduled-trigger",
    request_body = ScheduledTrigger,
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_scheduled_trigger(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
    Json(req): Json<ScheduledTrigger>,
) -> Json<ApiResponse<ScheduledTrigger>> {
    Json(ApiResponse::success(req, "定时触发配置已更新"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/rules/{id}/escalation",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_escalation(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/rules/{id}/escalation",
    request_body = AlertEscalation,
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_escalation(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
    Json(req): Json<AlertEscalation>,
) -> Json<ApiResponse<AlertEscalation>> {
    Json(ApiResponse::success(req, "告警升级配置已更新"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/rules/{id}/routing",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_routing(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/rules/{id}/routing",
    request_body = AlertRouting,
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_routing(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
    Json(req): Json<AlertRouting>,
) -> Json<ApiResponse<AlertRouting>> {
    Json(ApiResponse::success(req, "告警路由配置已更新"))
}

// Template Management
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/templates",
    tag = "alert_templates",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_templates(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:write"])),
    path = "/api/monitor/templates",
    request_body = AlertTemplate,
    tag = "alert_templates",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_template(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<AlertTemplate>,
) -> Json<ApiResponse<AlertTemplate>> {
    Json(ApiResponse::success(req, "告警模板创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/templates/{id}",
    tag = "alert_templates",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_template(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/templates/{id}",
    request_body = AlertTemplate,
    tag = "alert_templates",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_template(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<String>,
    Json(req): Json<AlertTemplate>,
) -> Json<ApiResponse<AlertTemplate>> {
    Json(ApiResponse::success(req, "告警模板更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:delete"])),
    path = "/api/monitor/templates/{id}",
    tag = "alert_templates",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_template(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id}),
        "告警模板删除成功",
    ))
}

// Suppression Rules
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/suppression",
    tag = "alert_suppression",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_suppression_rules(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SuppressionRule>>> {
    let rules = vec![SuppressionRule {
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
    }];

    Json(ApiResponse::success(rules, "获取抑制规则列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:write"])),
    path = "/api/monitor/suppression",
    request_body = SuppressionRule,
    tag = "alert_suppression",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_suppression_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<SuppressionRule>,
) -> Json<ApiResponse<SuppressionRule>> {
    Json(ApiResponse::success(req, "抑制规则创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/suppression/{id}",
    tag = "alert_suppression",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_suppression_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/suppression/{id}",
    request_body = SuppressionRule,
    tag = "alert_suppression",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_suppression_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<String>,
    Json(req): Json<SuppressionRule>,
) -> Json<ApiResponse<SuppressionRule>> {
    Json(ApiResponse::success(req, "抑制规则更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:delete"])),
    path = "/api/monitor/suppression/{id}",
    tag = "alert_suppression",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_suppression_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id}),
        "抑制规则删除成功",
    ))
}

// Advanced Rule Handler
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/rules/{id}/advanced",
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_advanced_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:update"])),
    path = "/api/monitor/rules/{id}/advanced",
    request_body = serde_json::Value,
    tag = "alert_rules",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_advanced_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(req, "高级规则配置已更新"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // ---- alert_dedup_key ----

    #[test]
    fn test_alert_dedup_key_empty_labels() {
        let labels = HashMap::new();
        assert_eq!(alert_dedup_key("cpu_usage", &labels), "cpu_usage|");
    }

    #[test]
    fn test_alert_dedup_key_single_label() {
        let mut labels = HashMap::new();
        labels.insert("host".to_string(), "server1".to_string());
        assert_eq!(
            alert_dedup_key("cpu_usage", &labels),
            "cpu_usage|host=server1"
        );
    }

    #[test]
    fn test_alert_dedup_key_multiple_labels_sorted() {
        let mut labels = HashMap::new();
        labels.insert("host".to_string(), "server1".to_string());
        labels.insert("env".to_string(), "prod".to_string());
        // sorted: env, host
        assert_eq!(
            alert_dedup_key("cpu_usage", &labels),
            "cpu_usage|env=prod,host=server1"
        );
    }

    #[test]
    fn test_alert_dedup_key_same_labels_same_key() {
        let mut labels1 = HashMap::new();
        labels1.insert("a".to_string(), "1".to_string());
        labels1.insert("b".to_string(), "2".to_string());
        let mut labels2 = HashMap::new();
        labels2.insert("b".to_string(), "2".to_string());
        labels2.insert("a".to_string(), "1".to_string());
        assert_eq!(
            alert_dedup_key("metric", &labels1),
            alert_dedup_key("metric", &labels2)
        );
    }

    #[test]
    fn test_alert_dedup_key_different_metric_different_key() {
        let labels = HashMap::new();
        assert_ne!(
            alert_dedup_key("cpu", &labels),
            alert_dedup_key("memory", &labels)
        );
    }

    #[test]
    fn test_alert_dedup_key_empty_metric_name() {
        let labels = HashMap::new();
        assert_eq!(alert_dedup_key("", &labels), "|");
    }

    // ---- is_alert_in_cooldown ----

    #[test]
    fn test_is_alert_in_cooldown_within_cooldown() {
        // fired 30s ago, cooldown 60s, now => still in cooldown
        assert!(is_alert_in_cooldown(1000, 60, 1030));
    }

    #[test]
    fn test_is_alert_in_cooldown_expired() {
        // fired 60s ago, cooldown 60s, now => not in cooldown
        assert!(!is_alert_in_cooldown(1000, 60, 1060));
    }

    #[test]
    fn test_is_alert_in_cooldown_never_fired() {
        assert!(!is_alert_in_cooldown(0, 60, 1000));
    }

    #[test]
    fn test_is_alert_in_cooldown_zero_cooldown() {
        assert!(!is_alert_in_cooldown(1000, 0, 1001));
    }

    #[test]
    fn test_is_alert_in_cooldown_negative_cooldown() {
        assert!(!is_alert_in_cooldown(1000, -10, 1001));
    }

    #[test]
    fn test_is_alert_in_cooldown_just_expired() {
        // fired 59s ago, cooldown 60s => still in cooldown (59 < 60)
        assert!(is_alert_in_cooldown(1000, 60, 1059));
    }

    #[test]
    fn test_is_alert_in_cooldown_boundary() {
        // fired exactly cooldown_seconds ago => not in cooldown
        assert!(!is_alert_in_cooldown(1000, 60, 1060));
    }

    // ---- severity_rank ----

    #[test]
    fn test_severity_rank_critical() {
        assert_eq!(severity_rank("critical"), 4);
    }

    #[test]
    fn test_severity_rank_error() {
        assert_eq!(severity_rank("error"), 3);
    }

    #[test]
    fn test_severity_rank_warning() {
        assert_eq!(severity_rank("warning"), 2);
    }

    #[test]
    fn test_severity_rank_info() {
        assert_eq!(severity_rank("info"), 1);
    }

    #[test]
    fn test_severity_rank_unknown() {
        assert_eq!(severity_rank("unknown"), 0);
        assert_eq!(severity_rank(""), 0);
    }

    #[test]
    fn test_severity_rank_ordering() {
        assert!(severity_rank("critical") > severity_rank("error"));
        assert!(severity_rank("error") > severity_rank("warning"));
        assert!(severity_rank("warning") > severity_rank("info"));
        assert!(severity_rank("info") > severity_rank("unknown"));
    }
}
