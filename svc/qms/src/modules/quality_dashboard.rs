//! Quality Dashboard and Alert handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use bigdecimal::{BigDecimal, ToPrimitive};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, Row};
use topems_shared::ApiResponse;

#[derive(Debug, Serialize)]
pub struct QualityOverview {
    pub total_inspections: i64,
    pub qualified_inspections: i64,
    pub unqualified_inspections: i64,
    pub qualification_rate: f64,
    pub defect_rate: f64,
    pub total_issues: i64,
    pub open_issues: i64,
    pub complaint_count: i64,
    pub complaint_rate: f64,
    pub in_progress_eightd: i64,
    pub pending_actions: i64,
}

#[derive(Debug, Serialize)]
pub struct QualityTrendItem {
    pub period: String,
    pub total_count: i64,
    pub qualified_count: i64,
    pub qualification_rate: f64,
    pub issue_count: i64,
}

#[derive(Debug, Serialize)]
pub struct QualityDefectDistribution {
    pub category: String,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Deserialize)]
pub struct TrendQuery {
    pub period: Option<String>,
    pub days: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AlertRuleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub alert_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AlertRule {
    pub id: String,
    pub tenant_id: String,
    pub rule_name: String,
    pub alert_type: String,
    pub metric: String,
    pub condition: String,
    pub threshold: BigDecimal,
    pub duration: Option<i32>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub notification_type: Option<String>,
    pub recipients: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAlertRuleRequest {
    pub rule_name: String,
    pub alert_type: String,
    pub metric: String,
    pub condition: String,
    pub threshold: BigDecimal,
    pub duration: Option<i32>,
    pub severity: Option<String>,
    pub notification_type: Option<String>,
    pub recipients: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAlertRuleRequest {
    pub rule_name: Option<String>,
    pub alert_type: Option<String>,
    pub metric: Option<String>,
    pub condition: Option<String>,
    pub threshold: Option<BigDecimal>,
    pub duration: Option<i32>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub notification_type: Option<String>,
    pub recipients: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AlertMessageQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub rule_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AlertMessage {
    pub id: String,
    pub tenant_id: String,
    pub rule_id: Option<String>,
    pub rule_name: Option<String>,
    pub alert_type: String,
    pub severity: Option<String>,
    pub title: String,
    pub message: Option<String>,
    pub metric_value: Option<BigDecimal>,
    pub threshold: Option<BigDecimal>,
    pub status: Option<String>,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAlertMessageRequest {
    pub rule_id: Option<String>,
    pub rule_name: Option<String>,
    pub alert_type: String,
    pub severity: Option<String>,
    pub title: String,
    pub message: Option<String>,
    pub metric_value: Option<BigDecimal>,
    pub threshold: Option<BigDecimal>,
}

pub async fn get_quality_overview(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<QualityOverview>> {
    let total_insp: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'completed'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let total_inspections = total_insp.unwrap_or(0);

    let qualified_insp: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'completed' AND result = 'qualified'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let qualified_inspections = qualified_insp.unwrap_or(0);

    let unqualified_insp: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'completed' AND result = 'unqualified'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let unqualified_inspections = unqualified_insp.unwrap_or(0);

    let avg_rate: Option<BigDecimal> = sqlx::query_scalar::<_, _>(r#"SELECT COALESCE(AVG(qualification_rate), 0) FROM qa_quality_inspections WHERE status = 'completed'"#)
    .fetch_one(&state.pool)
    .await
    .ok();
    let qualification_rate: f64 = avg_rate.map(|v| v.to_f64().unwrap_or(0.0)).unwrap_or(0.0);
    let defect_rate = 100.0 - qualification_rate;

    let total_issues_count: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_issues")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_issues = total_issues_count.unwrap_or(0);

    let open_issues_count: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_issues WHERE status = 'open' OR status = 'in_progress'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let open_issues = open_issues_count.unwrap_or(0);

    let complaint_count_val: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_issues WHERE source = 'customer_complaint'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let complaint_count = complaint_count_val.unwrap_or(0);
    let complaint_rate = if total_inspections > 0 {
        (complaint_count as f64 / total_inspections as f64) * 100.0
    } else {
        0.0
    };

    let in_progress_8d: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_eightd_reports WHERE status = 'in_progress'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let in_progress_eightd = in_progress_8d.unwrap_or(0);

    let pending_act: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_corrective_actions WHERE status = 'pending' OR status = 'in_progress'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let pending_actions = pending_act.unwrap_or(0);

    let overview = QualityOverview {
        total_inspections,
        qualified_inspections,
        unqualified_inspections,
        qualification_rate: (qualification_rate * 100.0).round() / 100.0,
        defect_rate: (defect_rate * 100.0).round() / 100.0,
        total_issues,
        open_issues,
        complaint_count,
        complaint_rate: (complaint_rate * 100.0).round() / 100.0,
        in_progress_eightd,
        pending_actions,
    };

    Json(ApiResponse::success(overview, "获取质量概览成功"))
}

pub async fn get_quality_trend(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<TrendQuery>,
) -> Json<ApiResponse<Vec<QualityTrendItem>>> {
    let days = query.days.unwrap_or(30);
    let days_str = days.to_string();

    let rows = sqlx::query(r#"
        SELECT 
            TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as period,
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN result = 'qualified' THEN 1 ELSE 0 END), 0) as qualified_count,
            COALESCE(AVG(CASE WHEN result = 'qualified' THEN 100.0 ELSE 0 END), 0) as qualification_rate
        FROM qa_quality_inspections
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY period ASC
        "#).bind(days_str)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => {
            let trend: Vec<QualityTrendItem> = data
                .iter()
                .map(|r| {
                    let rate: f64 = r
                        .get::<BigDecimal, _>("qualification_rate")
                        .to_f64()
                        .unwrap_or(0.0);
                    QualityTrendItem {
                        period: r.get::<Option<String>, _>("period").unwrap_or_default(),
                        total_count: r.get::<Option<i64>, _>("total_count").unwrap_or(0),
                        qualified_count: r.get::<Option<i64>, _>("qualified_count").unwrap_or(0),
                        qualification_rate: (rate * 100.0).round() / 100.0,
                        issue_count: 0,
                    }
                })
                .collect();
            Json(ApiResponse::success(trend, "获取质量趋势成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch quality trend: {}", e);
            Json(ApiResponse::error(500, "获取质量趋势失败"))
        }
    }
}

pub async fn get_defect_distribution(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<QualityDefectDistribution>>> {
    let total: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_inspection_results WHERE is_qualified = false",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let total_count = total.unwrap_or(0);

    let rows = sqlx::query(
        r#"
        SELECT 
            item_name as category,
            COUNT(*) as count
        FROM qa_inspection_results
        WHERE is_qualified = false
        GROUP BY item_name
        ORDER BY count DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => {
            let distribution: Vec<QualityDefectDistribution> = data
                .iter()
                .map(|r| {
                    let cnt = r.get::<Option<i64>, _>("count").unwrap_or(0);
                    let percentage = if total_count > 0 {
                        (cnt as f64 / total_count as f64) * 100.0
                    } else {
                        0.0
                    };
                    QualityDefectDistribution {
                        category: r.get::<String, _>("category"),
                        count: cnt,
                        percentage: (percentage * 100.0).round() / 100.0,
                    }
                })
                .collect();
            Json(ApiResponse::success(distribution, "获取不良分布成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch defect distribution: {}", e);
            Json(ApiResponse::error(500, "获取不良分布失败"))
        }
    }
}

pub async fn list_alert_rules(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<AlertRuleQuery>,
) -> Json<ApiResponse<Vec<AlertRule>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let rules = match (query.alert_type.as_ref(), query.status.as_ref()) {
        (Some(at), Some(st)) => sqlx::query_as::<_, AlertRule>(r#"SELECT id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_alert_rules WHERE alert_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(at).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(at), None) => sqlx::query_as::<_, AlertRule>(r#"SELECT id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_alert_rules WHERE alert_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(at).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AlertRule>(r#"SELECT id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_alert_rules WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, AlertRule>(r#"SELECT id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_alert_rules ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match rules {
        Ok(data) => Json(ApiResponse::success(data, "获取预警规则列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch alert rules: {}", e);
            Json(ApiResponse::error(500, "获取预警规则列表失败"))
        }
    }
}

pub async fn create_alert_rule(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateAlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let rule = sqlx::query_as::<_, AlertRule>(r#"INSERT INTO qa_alert_rules (rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $11) RETURNING id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT"#).bind(req.rule_name).bind(req.alert_type).bind(req.metric).bind(req.condition).bind(req.threshold).bind(req.duration).bind(req.severity).bind(req.notification_type).bind(req.recipients).bind(req.description).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(data) => Json(ApiResponse::success(data, "预警规则创建成功")),
        Err(e) => {
            tracing::error!("Failed to create alert rule: {}", e);
            Json(ApiResponse::error(500, "预警规则创建失败"))
        }
    }
}

pub async fn get_alert_rule(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AlertRule>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的预警规则ID")),
    };

    let rule = sqlx::query_as::<_, AlertRule>(r#"SELECT id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_alert_rules WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(data) => Json(ApiResponse::success(data, "获取预警规则成功")),
        Err(e) => {
            tracing::error!("Failed to fetch alert rule: {}", e);
            Json(ApiResponse::error(500, "获取预警规则失败"))
        }
    }
}

pub async fn update_alert_rule(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateAlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的预警规则ID")),
    };

    let rule = sqlx::query_as::<_, AlertRule>(r#"UPDATE qa_alert_rules SET rule_name = COALESCE($2, rule_name), alert_type = COALESCE($3, alert_type), metric = COALESCE($4, metric), condition = COALESCE($5, condition), threshold = COALESCE($6, threshold), duration = COALESCE($7, duration), severity = COALESCE($8, severity), status = COALESCE($9, status), notification_type = COALESCE($10, notification_type), recipients = COALESCE($11, recipients), description = COALESCE($12, description), updated_at = NOW() WHERE id = $1 RETURNING id, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.rule_name).bind(req.alert_type).bind(req.metric).bind(req.condition).bind(req.threshold).bind(req.duration).bind(req.severity).bind(req.status).bind(req.notification_type).bind(req.recipients).bind(req.description)
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(data) => Json(ApiResponse::success(data, "预警规则更新成功")),
        Err(e) => {
            tracing::error!("Failed to update alert rule: {}", e);
            Json(ApiResponse::error(500, "预警规则更新失败"))
        }
    }
}

pub async fn delete_alert_rule(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的预警规则ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_alert_rules WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "预警规则删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete alert rule: {}", e);
            Json(ApiResponse::error(500, "预警规则删除失败"))
        }
    }
}

pub async fn list_alert_messages(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<AlertMessageQuery>,
) -> Json<ApiResponse<Vec<AlertMessage>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let messages = match (query.severity.as_ref(), query.status.as_ref()) {
        (Some(sv), Some(st)) => sqlx::query_as::<_, AlertMessage>(r#"SELECT id, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at::TEXT, created_at::TEXT FROM qa_alert_messages WHERE severity = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(sv), None) => sqlx::query_as::<_, AlertMessage>(r#"SELECT id, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at::TEXT, created_at::TEXT FROM qa_alert_messages WHERE severity = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AlertMessage>(r#"SELECT id, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at::TEXT, created_at::TEXT FROM qa_alert_messages WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, AlertMessage>(r#"SELECT id, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at::TEXT, created_at::TEXT FROM qa_alert_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match messages {
        Ok(data) => Json(ApiResponse::success(data, "获取预警消息列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch alert messages: {}", e);
            Json(ApiResponse::error(500, "获取预警消息列表失败"))
        }
    }
}

pub async fn create_alert_message(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateAlertMessageRequest>,
) -> Json<ApiResponse<AlertMessage>> {
    let rule_id = req.rule_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let message = sqlx::query_as::<_, AlertMessage>(r#"INSERT INTO qa_alert_messages (rule_id, rule_name, alert_type, severity, title, message, metric_value, threshold, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING id, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at::TEXT, created_at::TEXT"#).bind(rule_id).bind(req.rule_name).bind(req.alert_type).bind(req.severity).bind(req.title).bind(req.message).bind(req.metric_value).bind(req.threshold)
    .fetch_one(&state.pool)
    .await;

    match message {
        Ok(data) => Json(ApiResponse::success(data, "预警消息创建成功")),
        Err(e) => {
            tracing::error!("Failed to create alert message: {}", e);
            Json(ApiResponse::error(500, "预警消息创建失败"))
        }
    }
}

pub async fn acknowledge_alert(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<AlertMessage>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的预警消息ID")),
    };

    let message = sqlx::query_as::<_, AlertMessage>(r#"UPDATE qa_alert_messages SET status = 'acknowledged', acknowledged_at = NOW() WHERE id = $1 RETURNING id, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at::TEXT, created_at::TEXT"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match message {
        Ok(data) => Json(ApiResponse::success(data, "预警已确认")),
        Err(e) => {
            tracing::error!("Failed to acknowledge alert: {}", e);
            Json(ApiResponse::error(500, "预警确认失败"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route(
            "/api/qms/quality-dashboard/overview",
            get(get_quality_overview),
        )
        .route("/api/qms/quality-dashboard/trend", get(get_quality_trend))
        .route(
            "/api/qms/quality-dashboard/defect-distribution",
            get(get_defect_distribution),
        )
        .route("/api/qms/alert-rules", get(list_alert_rules))
        .route("/api/qms/alert-rules", post(create_alert_rule))
        .route("/api/qms/alert-rules/{id}", get(get_alert_rule))
        .route("/api/qms/alert-rules/{id}", put(update_alert_rule))
        .route("/api/qms/alert-rules/{id}", delete(delete_alert_rule))
        .route("/api/qms/alert-messages", get(list_alert_messages))
        .route("/api/qms/alert-messages", post(create_alert_message))
        .route(
            "/api/qms/alert-messages/{id}/acknowledge",
            post(acknowledge_alert),
        )
}
