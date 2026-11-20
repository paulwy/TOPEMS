//! Quality Dashboard and Alert handlers

use axum::{
    extract::{Extension, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::decimal::{big_decimal_to_f64, big_decimal_to_f64_non_opt};

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
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
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
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:dashboard:read"])),
    path = "/quality-dashboard/overview",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_dashboard"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_quality_overview(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<QualityOverview> {
    // 看板聚合全部落到租户谓词上，超管保持全量口径。
    let tenant = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id(&claims, &headers))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 质量概览读取作用域创建失败: {}", e);
            return ApiResponse::server_error("获取质量概览失败");
        }
    };
    macro_rules! overview_count {
        ($sql:literal, $label:literal) => {{
            match sqlx::query_scalar::<_, i64>(only_own_schema_query!("qms", $sql))
                .bind(tenant)
                .fetch_one(&mut scope)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("[qms] 质量概览{}统计失败: {}", $label, e);
                    return ApiResponse::server_error("获取质量概览失败");
                }
            }
        }};
    }

    let total_inspections = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_quality_inspections WHERE ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "总检验数"
    );
    let qualified_inspections = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_quality_inspections WHERE status = 'completed' AND result = 'qualified' AND ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "合格检验数"
    );
    let unqualified_inspections = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_quality_inspections WHERE status = 'completed' AND result = 'unqualified' AND ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "不合格检验数"
    );

    let avg_rate: BigDecimal = match sqlx::query_scalar::<_, BigDecimal>(only_own_schema_query!(
        "qms",
        r#"SELECT COALESCE(AVG(qualification_rate), 0) FROM qms.qa_quality_inspections WHERE status = 'completed' AND ($1::uuid IS NULL OR tenant_id = $1::uuid)"#
    ))
    .bind(tenant)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[qms] 质量概览合格率统计失败: {}", e);
            return ApiResponse::server_error("获取质量概览失败");
        }
    };
    let qualification_rate: f64 = big_decimal_to_f64(Some(avg_rate));
    let defect_rate = 100.0 - qualification_rate;

    let total_issues = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_quality_issues WHERE ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "问题总数"
    );
    let open_issues = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_quality_issues WHERE (status = 'open' OR status = 'in_progress') AND ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "未关闭问题数"
    );
    let complaint_count = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_quality_issues WHERE source = 'customer_complaint' AND ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "客诉数"
    );
    let complaint_rate = if total_inspections > 0 {
        (complaint_count as f64 / total_inspections as f64) * 100.0
    } else {
        0.0
    };

    let in_progress_eightd = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_eightd_reports WHERE status = 'in_progress' AND ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "8D 进行中数"
    );
    let pending_actions = overview_count!(
        "SELECT COUNT(*) FROM qms.qa_corrective_actions WHERE (status = 'pending' OR status = 'in_progress') AND ($1::uuid IS NULL OR tenant_id = $1::uuid)",
        "待处理措施数"
    );

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

    ApiResponse::success(overview, "获取质量概览成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:dashboard:read"])),
    path = "/quality-dashboard/trend",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_dashboard"
)]
pub async fn get_quality_trend(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<TrendQuery>,
) -> ApiResponse<Vec<QualityTrendItem>> {
    let days = query.days.unwrap_or(30);
    let days_str = days.to_string();
    let tenant = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id(&claims, &headers))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 质量趋势读取作用域创建失败: {}", e);
            return ApiResponse::server_error("获取质量趋势失败");
        }
    };

    let rows = sqlx::query(only_own_schema_query!("qms", r#"
        SELECT 
            TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as period,
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN result = 'qualified' THEN 1 ELSE 0 END), 0) as qualified_count,
            COALESCE(AVG(CASE WHEN result = 'qualified' THEN 100.0 ELSE 0 END), 0) as qualification_rate
        FROM qms.qa_quality_inspections
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
          AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY period ASC
        "#)).bind(days_str).bind(tenant)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(data) => {
            let trend: Vec<QualityTrendItem> = data
                .iter()
                .map(|r| {
                    let rate: f64 =
                        big_decimal_to_f64_non_opt(r.get::<BigDecimal, _>("qualification_rate"));
                    QualityTrendItem {
                        period: r.get::<Option<String>, _>("period").unwrap_or_default(),
                        total_count: r.get::<Option<i64>, _>("total_count").unwrap_or(0),
                        qualified_count: r.get::<Option<i64>, _>("qualified_count").unwrap_or(0),
                        qualification_rate: (rate * 100.0).round() / 100.0,
                        issue_count: 0,
                    }
                })
                .collect();
            ApiResponse::success(trend, "获取质量趋势成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch quality trend: {}", e);
            ApiResponse::server_error("获取质量趋势失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:dashboard:read"])),
    path = "/quality-dashboard/defect-distribution",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_dashboard"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_defect_distribution(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<Vec<QualityDefectDistribution>> {
    let tenant = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id(&claims, &headers))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 缺陷分布读取作用域创建失败: {}", e);
            return ApiResponse::server_error("获取缺陷分布失败");
        }
    };
    let total_count: i64 = match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_inspection_results WHERE is_qualified = false AND ($1::uuid IS NULL OR tenant_id = $1::uuid)"
    ))
    .bind(tenant)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[qms] 不良总数统计失败: {}", e);
            return ApiResponse::server_error("获取不良分布失败");
        }
    };

    let rows = sqlx::query(only_own_schema_query!(
        "qms",
        r#"
        SELECT 
            item_name as category,
            COUNT(*) as count
        FROM qms.qa_inspection_results
        WHERE is_qualified = false
          AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
        GROUP BY item_name
        ORDER BY count DESC
        LIMIT 10
        "#
    ))
    .bind(tenant)
    .fetch_all(&mut scope)
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
            ApiResponse::success(distribution, "获取不良分布成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch defect distribution: {}", e);
            ApiResponse::server_error("获取不良分布失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:alert:read"])),
    path = "/alert-rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn list_alert_rules(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<AlertRuleQuery>,
) -> ApiResponse<Vec<AlertRule>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取预警规则列表失败");
        }
    };
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let rules = match (query.alert_type.as_ref(), query.status.as_ref()) {
        (Some(at), Some(st)) => sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at FROM qms.qa_alert_rules WHERE deleted_at IS NULL AND alert_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(at).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(at), None) => sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at FROM qms.qa_alert_rules WHERE deleted_at IS NULL AND alert_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(at).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at FROM qms.qa_alert_rules WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None) => sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at FROM qms.qa_alert_rules ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match rules {
        Ok(data) => ApiResponse::success(data, "获取预警规则列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch alert rules: {}", e);
            ApiResponse::server_error("获取预警规则列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:alert:write"])),
    path = "/alert-rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn create_alert_rule(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateAlertRuleRequest>,
) -> ApiResponse<AlertRule> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启预警规则创建事务失败: {}", e);
            return ApiResponse::server_error("预警规则创建失败");
        }
    };

    let rule = sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_alert_rules (rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $11, $12) RETURNING id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at"#)).bind(req.rule_name).bind(req.alert_type).bind(req.metric).bind(req.condition).bind(req.threshold).bind(req.duration).bind(req.severity).bind(req.notification_type).bind(req.recipients).bind(req.description).bind(req.created_by).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match rule {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交预警规则创建事务失败: {}", e);
                return ApiResponse::server_error("预警规则创建失败");
            }
            ApiResponse::success(data, "预警规则创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create alert rule: {}", e);
            ApiResponse::server_error("预警规则创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:alert:read"])),
    path = "/alert-rules/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn get_alert_rule(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AlertRule> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取预警规则失败");
        }
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的预警规则ID"),
    };

    let rule = sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at FROM qms.qa_alert_rules WHERE deleted_at IS NULL AND id = $1"#)).bind(id)
    .fetch_one(&mut scope)
    .await;

    match rule {
        Ok(data) => ApiResponse::success(data, "获取预警规则成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch alert rule: {}", e);
            ApiResponse::server_error("获取预警规则失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:alert:write"])),
    path = "/alert-rules/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn update_alert_rule(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateAlertRuleRequest>,
) -> ApiResponse<AlertRule> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的预警规则ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启预警规则更新事务失败: {}", e);
            return ApiResponse::server_error("预警规则更新失败");
        }
    };

    let rule = sqlx::query_as::<_, AlertRule>(only_own_schema_query!("qms", r#"UPDATE qms.qa_alert_rules SET rule_name = COALESCE($2, rule_name), alert_type = COALESCE($3, alert_type), metric = COALESCE($4, metric), condition = COALESCE($5, condition), threshold = COALESCE($6, threshold), duration = COALESCE($7, duration), severity = COALESCE($8, severity), status = COALESCE($9, status), notification_type = COALESCE($10, notification_type), recipients = COALESCE($11, recipients), description = COALESCE($12, description), updated_at = NOW() WHERE id = $1 AND tenant_id = $13 AND deleted_at IS NULL RETURNING id::TEXT, tenant_id::TEXT, rule_name, alert_type, metric, condition, threshold, duration, severity, status, notification_type, recipients, description, created_by, created_at, updated_at"#)).bind(id).bind(req.rule_name).bind(req.alert_type).bind(req.metric).bind(req.condition).bind(req.threshold).bind(req.duration).bind(req.severity).bind(req.status).bind(req.notification_type).bind(req.recipients).bind(req.description).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match rule {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交预警规则更新事务失败: {}", e);
                return ApiResponse::server_error("预警规则更新失败");
            }
            ApiResponse::success(data, "预警规则更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("预警规则不存在或已删除"),
        Err(e) => {
            tracing::error!("Failed to update alert rule: {}", e);
            ApiResponse::server_error("预警规则更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:alert:write"])),
    path = "/alert-rules/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn delete_alert_rule(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的预警规则ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启预警规则删除事务失败: {}", e);
            return ApiResponse::server_error("预警规则删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_alert_rules SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("预警规则不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交预警规则删除事务失败: {}", e);
                return ApiResponse::server_error("预警规则删除失败");
            }
            ApiResponse::success(true, "预警规则删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete alert rule: {}", e);
            ApiResponse::server_error("预警规则删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:alert:read"])),
    path = "/alert-messages",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn list_alert_messages(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<AlertMessageQuery>,
) -> ApiResponse<Vec<AlertMessage>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取预警消息列表失败");
        }
    };
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let messages = match (query.severity.as_ref(), query.status.as_ref()) {
        (Some(sv), Some(st)) => sqlx::query_as::<_, AlertMessage>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at, created_at FROM qms.qa_alert_messages WHERE severity = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(sv), None) => sqlx::query_as::<_, AlertMessage>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at, created_at FROM qms.qa_alert_messages WHERE severity = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AlertMessage>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at, created_at FROM qms.qa_alert_messages WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None) => sqlx::query_as::<_, AlertMessage>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at, created_at FROM qms.qa_alert_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match messages {
        Ok(data) => ApiResponse::success(data, "获取预警消息列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch alert messages: {}", e);
            ApiResponse::server_error("获取预警消息列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:alert:write"])),
    path = "/alert-messages",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn create_alert_message(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateAlertMessageRequest>,
) -> ApiResponse<AlertMessage> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let rule_id = req.rule_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启预警消息创建事务失败: {}", e);
            return ApiResponse::server_error("预警消息创建失败");
        }
    };

    // 同域引用校验：规则若给出，必须存在且同租户。
    if let Some(rid) = rule_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_alert_rules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(rid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("预警规则不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate alert rule: {}", e);
                return ApiResponse::server_error("预警消息创建失败");
            }
        }
    }

    let message = sqlx::query_as::<_, AlertMessage>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_alert_messages (rule_id, rule_name, alert_type, severity, title, message, metric_value, threshold, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9) RETURNING id::TEXT, tenant_id::TEXT, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at, created_at"#)).bind(rule_id).bind(req.rule_name).bind(req.alert_type).bind(req.severity).bind(req.title).bind(req.message).bind(req.metric_value).bind(req.threshold).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match message {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交预警消息创建事务失败: {}", e);
                return ApiResponse::server_error("预警消息创建失败");
            }
            ApiResponse::success(data, "预警消息创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create alert message: {}", e);
            ApiResponse::server_error("预警消息创建失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:alert:write"])),
    path = "/alert-messages/{id}/acknowledge",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_alert"
)]
pub async fn acknowledge_alert(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<AlertMessage> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的预警消息ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启预警确认事务失败: {}", e);
            return ApiResponse::server_error("预警确认失败");
        }
    };

    let message = sqlx::query_as::<_, AlertMessage>(only_own_schema_query!("qms", r#"UPDATE qms.qa_alert_messages SET status = 'acknowledged', acknowledged_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'active' RETURNING id::TEXT, tenant_id::TEXT, rule_id::TEXT, rule_name, alert_type, severity, title, message, metric_value, threshold, status, acknowledged_by, acknowledged_at, created_at"#)).bind(id).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match message {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交预警确认事务失败: {}", e);
                return ApiResponse::server_error("预警确认失败");
            }
            ApiResponse::success(data, "预警已确认")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("预警消息不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to acknowledge alert: {}", e);
            ApiResponse::server_error("预警确认失败")
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/quality-dashboard/overview", get(get_quality_overview))
        .route("/quality-dashboard/trend", get(get_quality_trend))
        .route(
            "/quality-dashboard/defect-distribution",
            get(get_defect_distribution),
        )
        .route("/alert-rules", get(list_alert_rules))
        .route("/alert-rules", post(create_alert_rule))
        .route("/alert-rules/{id}", get(get_alert_rule))
        .route("/alert-rules/{id}", put(update_alert_rule))
        .route("/alert-rules/{id}", delete(delete_alert_rule))
        .route("/alert-messages", get(list_alert_messages))
        .route("/alert-messages", post(create_alert_message))
        .route("/alert-messages/{id}/acknowledge", post(acknowledge_alert))
}
