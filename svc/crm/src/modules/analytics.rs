use crate::modules::ApiState;
use axum::{
    extract::{Extension, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use topems_shared_auth::auth::Claims;

#[derive(Debug, Deserialize)]
pub struct PeriodParam {
    #[serde(default = "default_mtd")]
    pub period: String,
}

fn default_mtd() -> String {
    "MTD".to_string()
}

#[derive(Debug, Serialize)]
pub struct AnalyticsMeta {
    pub mock_enabled: bool,
    pub use_frontend_fallback: bool,
    pub note: String,
}

#[derive(Debug, Serialize)]
pub struct AnalyticsEnvelope<T: Serialize> {
    pub success: bool,
    pub data: T,
    pub meta: AnalyticsMeta,
}

/// 解析当前请求的租户过滤值：超级管理员返回 None（看全量），普通用户绑定 claims.tenant_id。
/// 与 customer.rs / billing.rs 既有口径一致：SQL 中以 `($1::uuid IS NULL OR tenant_id = $1)` 实现。
fn resolve_tenant(claims: &Claims) -> Option<uuid::Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    }
}

/// 真实聚合响应信封：mock_enabled/use_frontend_fallback 一律为 false，
/// 绝不再以 200+空数组 诱导前端走 useCrmMock seed=42 假数据。
fn envelope<T: Serialize>(data: T, note: &str) -> (StatusCode, Json<serde_json::Value>) {
    let body = AnalyticsEnvelope {
        success: true,
        data,
        meta: AnalyticsMeta {
            mock_enabled: false,
            use_frontend_fallback: false,
            note: note.to_string(),
        },
    };
    (StatusCode::OK, Json(json!(body)))
}

/// 把 sqlx 行集映射成 `[{name, value}]` 数组（聚合图表通用形状）。
fn rows_to_name_value(rows: &[sqlx::postgres::PgRow]) -> Vec<serde_json::Value> {
    rows.iter()
        .map(|r| {
            json!({
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "value": r.try_get::<i64, _>("value").unwrap_or_default(),
            })
        })
        .collect()
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/dashboard", get(dashboard_aggregate))
        .route("/dashboard/overview", get(dashboard_overview))
        .route("/analytics/funnel", get(analytics_funnel))
        .route("/analytics/scoring", get(analytics_scoring))
        .route("/analytics/forecast", get(analytics_forecast))
        .route("/analytics/segmentation", get(analytics_segmentation))
        .route("/analytics/billing", get(analytics_billing))
        .route("/analytics/recommendation", get(analytics_recommendation))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/dashboard/overview",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn dashboard_overview(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    let total_customers: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.customers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL",
    )
    .bind(tenant)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let active_customers: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.customers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL AND status = 'active'",
    )
    .bind(tenant)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let total_opportunities: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL",
    )
    .bind(tenant)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let open_opportunities: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL AND stage NOT IN ('closed_won','closed_lost')",
    )
    .bind(tenant)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let won_opportunities: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL AND stage = 'closed_won'",
    )
    .bind(tenant)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let stage_rows = sqlx::query(
        "SELECT stage AS name, COUNT(*)::bigint AS value FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL GROUP BY stage ORDER BY value DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let opportunity_stages = rows_to_name_value(&stage_rows);

    envelope(
        json!({
            "total_customers": total_customers,
            "active_customers": active_customers,
            "total_opportunities": total_opportunities,
            "open_opportunities": open_opportunities,
            "won_opportunities": won_opportunities,
            "opportunity_stages": opportunity_stages,
        }),
        "Overview 真实聚合：客户/商机关键指标与阶段分布（按租户过滤）",
    )
}

// ============ #30: /dashboard 真实聚合端点 ============

#[derive(Debug, Serialize)]
pub struct CrmDashboardStats {
    pub total_opportunities: i64,
    // B3: 赢单金额（SUM(crm.opportunities.value)）f64 -> Decimal；转化率/平均周期为比率/天数保留 f64
    pub won_amount: rust_decimal::Decimal,
    pub conversion_rate: f64,
    pub average_cycle: f64,
    pub opportunity_stages: Vec<NameValue>,
    pub monthly_performance: Vec<NameValue>,
    pub industries: Vec<NameValue>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct NameValue {
    pub name: String,
    pub value: i64,
}

/// GET /dashboard — CRM 仪表盘聚合统计（真实数据）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/dashboard",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn dashboard_aggregate(State(state): State<ApiState>) -> impl IntoResponse {
    let db = &state.db;

    let total_opportunities: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))")
            .fetch_one(db)
            .await
            .unwrap_or(0);

    let won_amount: rust_decimal::Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE stage = 'closed_won' AND deleted_at IS NULL AND value IS NOT NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
    )
    .fetch_one(db)
    .await
    .unwrap_or(rust_decimal::Decimal::ZERO);

    let won_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE stage = 'closed_won' AND deleted_at IS NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
    )
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let conversion_rate = if total_opportunities > 0 {
        (won_count as f64 / total_opportunities as f64) * 100.0
    } else {
        0.0
    };

    let average_cycle: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(close_date, updated_at) - created_at)) / 86400.0), 0) FROM crm.opportunities WHERE stage = 'closed_won' AND deleted_at IS NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
    )
    .fetch_one(db)
    .await
    .unwrap_or(0.0);

    let opportunity_stages: Vec<NameValue> = sqlx::query_as(
        "SELECT stage AS name, COUNT(*) AS value FROM crm.opportunities WHERE deleted_at IS NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000')) GROUP BY stage ORDER BY value DESC",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let monthly_performance: Vec<NameValue> = sqlx::query_as(
        "SELECT TO_CHAR(created_at, 'YYYY-MM') AS name, COUNT(*) AS value FROM crm.opportunities WHERE deleted_at IS NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000')) AND created_at >= NOW() - INTERVAL '6 months' GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY name ASC",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let industries: Vec<NameValue> = sqlx::query_as(
        "SELECT COALESCE(industry, 'unknown') AS name, COUNT(*) AS value FROM crm.customers WHERE deleted_at IS NULL AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000')) GROUP BY COALESCE(industry, 'unknown') ORDER BY value DESC LIMIT 10",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let stats = CrmDashboardStats {
        total_opportunities,
        won_amount,
        conversion_rate,
        average_cycle,
        opportunity_stages,
        monthly_performance,
        industries,
    };

    (StatusCode::OK, Json(json!(stats))).into_response()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/analytics/funnel",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn analytics_funnel(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    // 按阶段统计商机数量/金额/加权金额（加权 = value × probability%）。
    let rows = sqlx::query(
        "SELECT stage AS name, COUNT(*)::bigint AS count, \
                COALESCE(SUM(value),0)::float8 AS total_value, \
                COALESCE(SUM(value * COALESCE(probability,0) / 100.0),0)::float8 AS weighted_value \
         FROM crm.opportunities \
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL \
         GROUP BY stage ORDER BY count DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let stages: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "stage": r.try_get::<String, _>("name").unwrap_or_default(),
                "count": r.try_get::<i64, _>("count").unwrap_or_default(),
                "total_value": r.try_get::<f64, _>("total_value").unwrap_or_default(),
                "weighted_value": r.try_get::<f64, _>("weighted_value").unwrap_or_default(),
            })
        })
        .collect();

    envelope(
        json!({ "stages": stages }),
        "Funnel 真实聚合：按商机阶段统计数量/金额/加权金额（按租户过滤）",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/analytics/scoring",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn analytics_scoring(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    // A/B/C/D 评分等级分布（取每个客户最新一次评分由 customer_scoring 模块写入）。
    let score_rows = sqlx::query(
        "SELECT COALESCE(score_level,'unknown') AS name, COUNT(*)::bigint AS value \
         FROM crm.customer_scores WHERE ($1::uuid IS NULL OR tenant_id = $1) \
         GROUP BY COALESCE(score_level,'unknown') ORDER BY value DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let distribution = rows_to_name_value(&score_rows);

    // RFM 三桶分群分布（rfm.rs 写入）。
    let rfm_rows = sqlx::query(
        "SELECT COALESCE(segment,'unknown') AS name, COUNT(*)::bigint AS value \
         FROM crm.rfm_results WHERE ($1::uuid IS NULL OR tenant_id = $1) \
         GROUP BY COALESCE(segment,'unknown') ORDER BY value DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let rfm = rows_to_name_value(&rfm_rows);

    envelope(
        json!({ "distribution": distribution, "rfm": rfm }),
        "Scoring 真实聚合：客户评分等级分布 + RFM 分群分布（按租户过滤）",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/analytics/forecast",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn analytics_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    // 各期间预测/实际/置信度（sales_forecast.rs 写入；该表无 deleted_at 列）。
    let rows = sqlx::query(
        "SELECT period AS name, period_type, \
                predicted_amount::float8 AS predicted_amount, \
                actual_amount::float8 AS actual_amount, \
                confidence_level::float8 AS confidence_level, \
                trend \
         FROM crm.sales_forecasts WHERE ($1::uuid IS NULL OR tenant_id = $1) \
         ORDER BY period DESC LIMIT 24",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let series: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "period": r.try_get::<String, _>("name").unwrap_or_default(),
                "period_type": r.try_get::<String, _>("period_type").unwrap_or_default(),
                "predicted_amount": r.try_get::<f64, _>("predicted_amount").unwrap_or_default(),
                "actual_amount": r.try_get::<Option<f64>, _>("actual_amount").unwrap_or(None).unwrap_or(0.0),
                "confidence_level": r.try_get::<f64, _>("confidence_level").unwrap_or_default(),
                "trend": r.try_get::<String, _>("trend").unwrap_or_default(),
            })
        })
        .collect();

    envelope(
        json!({ "series": series }),
        "Forecast 真实聚合：销售预测各期间预测/实际/置信度（按租户过滤）",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/analytics/segmentation",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn analytics_segmentation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    // 价值(客户 revenue) × 活动(近 90 天互动数) 四象限客户分布。
    // 注：crm.customer_segments 表无 tenant_id 列（租户隔离口径待产品确认），
    // 本端点不读该表，改为直接基于 crm.customers（有 tenant_id）计算，保证租户隔离。
    let rows = sqlx::query(
        "WITH scored AS ( \
            SELECT c.id, c.revenue, \
              (SELECT COUNT(*) FROM crm.interactions i \
                WHERE i.customer_id = c.id AND i.deleted_at IS NULL \
                  AND i.created_at >= NOW() - INTERVAL '90 days') AS activity \
            FROM crm.customers c \
            WHERE ($1::uuid IS NULL OR c.tenant_id = $1) AND c.deleted_at IS NULL \
         ) \
         SELECT \
           CASE WHEN revenue IS NULL THEN 'unknown_value' \
                WHEN revenue >= (SELECT AVG(revenue) FROM scored WHERE revenue IS NOT NULL) THEN 'high_value' \
                ELSE 'low_value' END AS value_band, \
           CASE WHEN activity >= (SELECT AVG(activity) FROM scored) THEN 'high_activity' \
                ELSE 'low_activity' END AS activity_band, \
           COUNT(*)::bigint AS customer_count \
         FROM scored GROUP BY 1,2",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let quadrants: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "value_band": r.try_get::<String, _>("value_band").unwrap_or_default(),
                "activity_band": r.try_get::<String, _>("activity_band").unwrap_or_default(),
                "customer_count": r.try_get::<i64, _>("customer_count").unwrap_or_default(),
            })
        })
        .collect();

    envelope(
        json!({ "quadrants": quadrants }),
        "Segmentation 真实聚合：价值×活动 四象限客户分布（按租户过滤；crm.customer_segments 表无 tenant_id，租户隔离口径待产品确认，本端点改由 crm.customers 直算）",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/analytics/billing",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn analytics_billing(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    // 状态饼（paid/pending/overdue…）：按 status 聚合计数与金额。
    let status_rows = sqlx::query(
        "SELECT COALESCE(status,'unknown') AS name, COUNT(*)::bigint AS value, \
                COALESCE(SUM(amount),0)::float8 AS amount \
         FROM crm.billing_records WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL \
         GROUP BY COALESCE(status,'unknown') ORDER BY value DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let status_pie: Vec<serde_json::Value> = status_rows
        .iter()
        .map(|r| {
            json!({
                "status": r.try_get::<String, _>("name").unwrap_or_default(),
                "count": r.try_get::<i64, _>("value").unwrap_or_default(),
                "amount": r.try_get::<f64, _>("amount").unwrap_or_default(),
            })
        })
        .collect();

    // Top10 客户应收。
    let top_rows = sqlx::query(
        "SELECT COALESCE(customer_name,'unknown') AS name, \
                COALESCE(SUM(amount),0)::float8 AS value \
         FROM crm.billing_records WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL \
         GROUP BY COALESCE(customer_name,'unknown') ORDER BY value DESC LIMIT 10",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let top_customers = rows_to_name_value_f64(&top_rows);

    // 账龄四桶：paid / overdue(已逾期) / due_soon(30 天内到期) / current。
    let aging_rows = sqlx::query(
        "SELECT CASE WHEN paid_at IS NOT NULL THEN 'paid' \
                     WHEN due_date < NOW() THEN 'overdue' \
                     WHEN due_date < NOW() + INTERVAL '30 days' THEN 'due_soon' \
                     ELSE 'current' END AS name, \
                COUNT(*)::bigint AS value \
         FROM crm.billing_records WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL \
         GROUP BY 1 ORDER BY value DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let aging = rows_to_name_value(&aging_rows);

    envelope(
        json!({
            "status_pie": status_pie,
            "top_customers": top_customers,
            "aging": aging,
        }),
        "Billing 真实聚合：账单状态饼 + Top10 客户应收 + 账龄四桶（按租户过滤；billing_records 写入方待 finance/erp 接通，当前以已落库账单为准）",
    )
}

/// 同 rows_to_name_value，但 value 为 f64（金额类聚合）。
fn rows_to_name_value_f64(rows: &[sqlx::postgres::PgRow]) -> Vec<serde_json::Value> {
    rows.iter()
        .map(|r| {
            json!({
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "value": r.try_get::<f64, _>("value").unwrap_or_default(),
            })
        })
        .collect()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:analytics:read"])),
    path = "/analytics/recommendation",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn analytics_recommendation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = &state.db;
    let tenant = resolve_tenant(&claims);

    // customer_recommendations 表无 tenant_id 列，经 LEFT JOIN crm.customers 按租户过滤。
    let by_type_rows = sqlx::query(
        "SELECT COALESCE(r.recommendation_type,'unknown') AS name, COUNT(*)::bigint AS value, \
                COALESCE(AVG(r.confidence),0)::float8 AS avg_confidence \
         FROM crm.customer_recommendations r \
         LEFT JOIN crm.customers c ON r.customer_id = c.id \
         WHERE ($1::uuid IS NULL OR c.tenant_id = $1) \
         GROUP BY COALESCE(r.recommendation_type,'unknown') ORDER BY value DESC",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let by_type: Vec<serde_json::Value> = by_type_rows
        .iter()
        .map(|r| {
            json!({
                "type": r.try_get::<String, _>("name").unwrap_or_default(),
                "count": r.try_get::<i64, _>("value").unwrap_or_default(),
                "avg_confidence": r.try_get::<f64, _>("avg_confidence").unwrap_or_default(),
            })
        })
        .collect();

    let recent_rows = sqlx::query(
        "SELECT r.customer_name, r.recommendation_type, r.confidence::float8 AS confidence \
         FROM crm.customer_recommendations r \
         LEFT JOIN crm.customers c ON r.customer_id = c.id \
         WHERE ($1::uuid IS NULL OR c.tenant_id = $1) \
         ORDER BY r.created_at DESC LIMIT 20",
    )
    .bind(tenant)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let recent: Vec<serde_json::Value> = recent_rows
        .iter()
        .map(|r| {
            json!({
                "customer_name": r.try_get::<String, _>("customer_name").unwrap_or_default(),
                "type": r.try_get::<String, _>("recommendation_type").unwrap_or_default(),
                "confidence": r.try_get::<Option<f64>, _>("confidence").unwrap_or(None).unwrap_or(0.0),
            })
        })
        .collect();

    envelope(
        json!({ "by_type": by_type, "recent": recent }),
        "Recommendation 真实聚合：按推荐类型分布 + 最近推荐（经 customers 关联按租户过滤；customer_recommendations 表无 tenant_id 列）",
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;

    fn serialize_to_value<T: Serialize>(item: &T) -> serde_json::Value {
        let json = serde_json::to_string(item).unwrap();
        serde_json::from_str(&json).unwrap()
    }

    #[test]
    fn period_param_default() {
        let json = r#"{}"#;
        let p: PeriodParam = serde_json::from_str(json).unwrap();
        assert_eq!(p.period, "MTD");
    }

    #[test]
    fn period_param_custom() {
        let json = r#"{"period":"YTD"}"#;
        let p: PeriodParam = serde_json::from_str(json).unwrap();
        assert_eq!(p.period, "YTD");
    }

    #[test]
    fn period_param_debug_format() {
        let p = PeriodParam {
            period: "QTD".into(),
        };
        let debug_str = format!("{:?}", p);
        assert!(debug_str.contains("QTD"));
    }

    #[test]
    fn analytics_meta_serializes() {
        let meta = AnalyticsMeta {
            mock_enabled: true,
            use_frontend_fallback: false,
            note: "test note".to_string(),
        };
        let v = serialize_to_value(&meta);
        assert_eq!(v["mock_enabled"], true);
        assert_eq!(v["use_frontend_fallback"], false);
        assert_eq!(v["note"], "test note");
    }

    #[test]
    fn analytics_meta_debug() {
        let meta = AnalyticsMeta {
            mock_enabled: false,
            use_frontend_fallback: true,
            note: String::new(),
        };
        assert!(!format!("{:?}", meta).is_empty());
    }

    #[test]
    fn analytics_envelope_with_data_serializes() {
        let envelope = AnalyticsEnvelope {
            success: true,
            data: vec![serde_json::json!({"id":1}), serde_json::json!({"id":2})],
            meta: AnalyticsMeta {
                mock_enabled: true,
                use_frontend_fallback: true,
                note: "note".to_string(),
            },
        };
        let v = serialize_to_value(&envelope);
        assert_eq!(v["success"], true);
        assert!(v["data"].is_array());
        assert_eq!(v["data"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn analytics_envelope_empty_data_serializes() {
        let envelope = AnalyticsEnvelope {
            success: false,
            data: Vec::<serde_json::Value>::new(),
            meta: AnalyticsMeta {
                mock_enabled: false,
                use_frontend_fallback: false,
                note: String::new(),
            },
        };
        let v = serialize_to_value(&envelope);
        assert_eq!(v["success"], false);
        assert_eq!(v["data"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn default_mtd_returns_mtd() {
        assert_eq!(default_mtd(), "MTD");
    }

    #[test]
    fn envelope_produces_ok_status_and_honest_meta() {
        let (_status, Json(json_val)) = envelope(json!([1, 2]), "real aggregation note");
        let v: &serde_json::Value = &json_val;
        assert_eq!(v["success"], true);
        assert_eq!(v["meta"]["mock_enabled"], false);
        assert_eq!(v["meta"]["use_frontend_fallback"], false);
        assert_eq!(v["meta"]["note"], "real aggregation note");
        assert_eq!(v["data"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}
