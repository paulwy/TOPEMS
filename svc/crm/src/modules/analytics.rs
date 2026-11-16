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
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::error::TopemsError;
use topems_shared_db::scope::Db;

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

/// 查询失败统一返回 500：不再用 `unwrap_or_default()` 把失败伪装成空结果
/// （空结果会让前端误判为「真的没数据」，也会掩盖租户作用域缺失）。
fn fail(message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "success": false,
            "message": message,
            "code": 500,
        })),
    )
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失");
    };

    match load_dashboard_overview(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Overview 真实聚合：客户/商机关键指标与阶段分布（按租户过滤）",
        ),
        Err(e) => {
            tracing::error!("[crm] dashboard overview 聚合失败: {}", e);
            fail("Overview 数据查询失败")
        }
    }
}

/// 仪表盘概览聚合（只读租户作用域）。
///
/// M-1：请求链路复用 `tenant_middleware` 注入的请求事务，禁止裸池读取——
/// 裸池连接没有租户 GUC，严格 RLS 下对任何租户都会静默返回 0 行。
async fn load_dashboard_overview(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 仪表盘概览读作用域打开失败: {}", e))
    })?;

    let total_customers: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.customers WHERE deleted_at IS NULL")
            .fetch_one(&mut scope)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 客户总数查询失败: {}", e)))?;

    let active_customers: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.customers WHERE deleted_at IS NULL AND status = 'active'",
    )
    .fetch_one(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 活跃客户数查询失败: {}", e)))?;

    let total_opportunities: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL")
            .fetch_one(&mut scope)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 商机总数查询失败: {}", e)))?;

    let open_opportunities: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND stage NOT IN ('closed_won','closed_lost')",
    )
    .fetch_one(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 在途商机数查询失败: {}", e)))?;

    let won_opportunities: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND stage = 'closed_won'",
    )
    .fetch_one(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 赢单商机数查询失败: {}", e)))?;

    let stage_rows = sqlx::query(
        "SELECT stage AS name, COUNT(*)::bigint AS value FROM crm.opportunities WHERE deleted_at IS NULL GROUP BY stage ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 商机阶段分布查询失败: {}", e)))?;
    let opportunity_stages = rows_to_name_value(&stage_rows);

    Ok(json!({
        "total_customers": total_customers,
        "active_customers": active_customers,
        "total_opportunities": total_opportunities,
        "open_opportunities": open_opportunities,
        "won_opportunities": won_opportunities,
        "opportunity_stages": opportunity_stages,
    }))
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
pub async fn dashboard_aggregate(
    State(state): State<ApiState>,

    Extension(txn_arc): Extension<RlsTxnCell>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失").into_response();
    };

    match load_dashboard_aggregate(&db, txn).await {
        Ok(stats) => (StatusCode::OK, Json(json!(stats))).into_response(),
        Err(e) => {
            tracing::error!("[crm] dashboard 聚合失败: {}", e);
            fail("仪表盘数据查询失败").into_response()
        }
    }
}

/// `/dashboard` 聚合（只读租户作用域）。
async fn load_dashboard_aggregate(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<CrmDashboardStats, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 仪表盘读作用域打开失败: {}", e))
    })?;

    let total_opportunities: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL")
            .fetch_one(&mut scope)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 商机总数查询失败: {}", e)))?;

    let won_amount: rust_decimal::Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE stage = 'closed_won' AND deleted_at IS NULL AND value IS NOT NULL",
    )
    .fetch_one(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 赢单金额查询失败: {}", e)))?;

    let won_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE stage = 'closed_won' AND deleted_at IS NULL",
    )
    .fetch_one(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 赢单数查询失败: {}", e)))?;

    let conversion_rate = if total_opportunities > 0 {
        (won_count as f64 / total_opportunities as f64) * 100.0
    } else {
        0.0
    };

    let average_cycle: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(close_date, updated_at) - created_at)) / 86400.0), 0) FROM crm.opportunities WHERE stage = 'closed_won' AND deleted_at IS NULL",
    )
    .fetch_one(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 平均成交周期查询失败: {}", e)))?;

    let opportunity_stages: Vec<NameValue> = sqlx::query_as(
        "SELECT stage AS name, COUNT(*) AS value FROM crm.opportunities WHERE deleted_at IS NULL GROUP BY stage ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 商机阶段分布查询失败: {}", e)))?;

    let monthly_performance: Vec<NameValue> = sqlx::query_as(
        "SELECT TO_CHAR(created_at, 'YYYY-MM') AS name, COUNT(*) AS value FROM crm.opportunities WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '6 months' GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY name ASC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 月度业绩查询失败: {}", e)))?;

    let industries: Vec<NameValue> = sqlx::query_as(
        "SELECT COALESCE(industry, 'unknown') AS name, COUNT(*) AS value FROM crm.customers WHERE deleted_at IS NULL GROUP BY COALESCE(industry, 'unknown') ORDER BY value DESC LIMIT 10",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 行业分布查询失败: {}", e)))?;

    Ok(CrmDashboardStats {
        total_opportunities,
        won_amount,
        conversion_rate,
        average_cycle,
        opportunity_stages,
        monthly_performance,
        industries,
    })
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失");
    };

    match load_funnel(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Funnel 真实聚合：按商机阶段统计数量/金额/加权金额（按租户过滤）",
        ),
        Err(e) => {
            tracing::error!("[crm] funnel 聚合失败: {}", e);
            fail("Funnel 数据查询失败")
        }
    }
}

/// 销售漏斗聚合（只读租户作用域）。
async fn load_funnel(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 漏斗读作用域打开失败: {}", e))
    })?;

    // 按阶段统计商机数量/金额/加权金额（加权 = value × probability%）。
    let rows = sqlx::query(
        "SELECT stage AS name, COUNT(*)::bigint AS count, \
                COALESCE(SUM(value),0)::float8 AS total_value, \
                COALESCE(SUM(value * COALESCE(probability,0) / 100.0),0)::float8 AS weighted_value \
         FROM crm.opportunities \
         WHERE deleted_at IS NULL \
         GROUP BY stage ORDER BY count DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 漏斗阶段聚合失败: {}", e)))?;

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

    Ok(json!({ "stages": stages }))
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失");
    };

    match load_scoring(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Scoring 真实聚合：客户评分等级分布 + RFM 分群分布（按租户过滤）",
        ),
        Err(e) => {
            tracing::error!("[crm] scoring 聚合失败: {}", e);
            fail("Scoring 数据查询失败")
        }
    }
}

/// 客户评分/RFM 分布聚合（只读租户作用域）。
async fn load_scoring(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 评分读作用域打开失败: {}", e))
    })?;

    // A/B/C/D 评分等级分布（取每个客户最新一次评分由 customer_scoring 模块写入）。
    let score_rows = sqlx::query(
        "SELECT COALESCE(score_level,'unknown') AS name, COUNT(*)::bigint AS value \
         FROM crm.customer_scores \
         GROUP BY COALESCE(score_level,'unknown') ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 客户评分分布查询失败: {}", e)))?;
    let distribution = rows_to_name_value(&score_rows);

    // RFM 三桶分群分布（rfm.rs 写入）。
    let rfm_rows = sqlx::query(
        "SELECT COALESCE(segment,'unknown') AS name, COUNT(*)::bigint AS value \
         FROM crm.rfm_results \
         GROUP BY COALESCE(segment,'unknown') ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM RFM 分群分布查询失败: {}", e)))?;
    let rfm = rows_to_name_value(&rfm_rows);

    Ok(json!({ "distribution": distribution, "rfm": rfm }))
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失");
    };

    match load_forecast(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Forecast 真实聚合：销售预测各期间预测/实际/置信度（按租户过滤）",
        ),
        Err(e) => {
            tracing::error!("[crm] forecast 聚合失败: {}", e);
            fail("Forecast 数据查询失败")
        }
    }
}

/// 销售预测序列聚合（只读租户作用域）。
async fn load_forecast(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 预测读作用域打开失败: {}", e))
    })?;

    // 各期间预测/实际/置信度（sales_forecast.rs 写入；该表无 deleted_at 列）。
    let rows = sqlx::query(
        "SELECT period AS name, period_type, \
                predicted_amount::float8 AS predicted_amount, \
                actual_amount::float8 AS actual_amount, \
                confidence_level::float8 AS confidence_level, \
                trend \
         FROM crm.sales_forecasts \
         ORDER BY period DESC LIMIT 24",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 销售预测查询失败: {}", e)))?;

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

    Ok(json!({ "series": series }))
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失");
    };

    match load_segmentation(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Segmentation 真实聚合：价值×活动 四象限客户分布（按租户过滤；本端点由 crm.customers 直算）",
        ),
        Err(e) => {
            tracing::error!("[crm] segmentation 聚合失败: {}", e);
            fail("Segmentation 数据查询失败")
        }
    }
}

/// 价值×活动四象限聚合（只读租户作用域）。
async fn load_segmentation(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 分群读作用域打开失败: {}", e))
    })?;

    // 价值(客户 revenue) × 活动(近 90 天互动数) 四象限客户分布。
    let rows = sqlx::query(
        "WITH scored AS ( \
            SELECT c.id, c.revenue, \
              (SELECT COUNT(*) FROM crm.interactions i \
                WHERE i.customer_id = c.id AND i.deleted_at IS NULL \
                  AND i.created_at >= NOW() - INTERVAL '90 days') AS activity \
            FROM crm.customers c \
            WHERE c.deleted_at IS NULL \
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
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 客户四象限聚合失败: {}", e)))?;

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

    Ok(json!({ "quadrants": quadrants }))
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    // M-1：请求链路禁止自开事务，复用 tenant_middleware 注入的请求事务。
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": "请求事务缺失",
                "code": 500,
            })),
        );
    };

    match load_billing_analytics(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Billing 真实聚合：账单状态饼 + Top10 客户应收 + 账龄四桶（按租户过滤；billing_records 写入方待 finance/erp 接通，当前以已落库账单为准）",
        ),
        Err(e) => {
            tracing::error!("[crm] 账单分析聚合失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "message": "账单分析数据查询失败",
                    "code": 500,
                })),
            )
        }
    }
}

/// 账单分析聚合（只读租户作用域）。
///
/// K8：`crm.billing_records` 收紧为 fail-closed 后，裸连接池读取会静默返回 0 行。
/// 这里复用请求事务并叠加租户 GUC（`scope_with`）；无请求上下文直接报错
/// （不再用 `unwrap_or_default()` 把失败伪装成空结果）。
async fn load_billing_analytics(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 账单分析读作用域打开失败: {}", e))
    })?;

    // 状态饼（paid/pending/overdue…）：按 status 聚合计数与金额。
    let status_rows = sqlx::query(
        "SELECT COALESCE(status,'unknown') AS name, COUNT(*)::bigint AS value, \
                COALESCE(SUM(amount),0)::float8 AS amount \
         FROM crm.billing_records WHERE deleted_at IS NULL \
         GROUP BY COALESCE(status,'unknown') ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 账单状态聚合失败: {}", e)))?;
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
         FROM crm.billing_records WHERE deleted_at IS NULL \
         GROUP BY COALESCE(customer_name,'unknown') ORDER BY value DESC LIMIT 10",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 账单 TopN 聚合失败: {}", e)))?;
    let top_customers = rows_to_name_value_f64(&top_rows);

    // 账龄四桶：paid / overdue(已逾期) / due_soon(30 天内到期) / current。
    let aging_rows = sqlx::query(
        "SELECT CASE WHEN paid_at IS NOT NULL THEN 'paid' \
                     WHEN due_date < NOW() THEN 'overdue' \
                     WHEN due_date < NOW() + INTERVAL '30 days' THEN 'due_soon' \
                     ELSE 'current' END AS name, \
                COUNT(*)::bigint AS value \
         FROM crm.billing_records WHERE deleted_at IS NULL \
         GROUP BY 1 ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 账单账龄聚合失败: {}", e)))?;
    let aging = rows_to_name_value(&aging_rows);

    scope.commit().await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 账单分析读作用域提交失败: {}", e))
    })?;

    Ok(json!({
        "status_pie": status_pie,
        "top_customers": top_customers,
        "aging": aging,
    }))
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

    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_p): Query<PeriodParam>,
) -> impl IntoResponse {
    let db = Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return fail("请求事务缺失");
    };

    match load_recommendation(&db, txn).await {
        Ok(data) => envelope(
            data,
            "Recommendation 真实聚合：按推荐类型分布 + 最近推荐（按租户过滤）",
        ),
        Err(e) => {
            tracing::error!("[crm] recommendation 聚合失败: {}", e);
            fail("Recommendation 数据查询失败")
        }
    }
}

/// 推荐分布聚合（只读租户作用域）。
async fn load_recommendation(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<serde_json::Value, TopemsError> {
    let mut scope = db.scope_with(txn).await.map_err(|e| {
        TopemsError::DatabaseTransaction(format!("CRM 推荐读作用域打开失败: {}", e))
    })?;

    // customer_recommendations 表无 tenant_id 列，经 LEFT JOIN crm.customers 按租户过滤。
    let by_type_rows = sqlx::query(
        "SELECT COALESCE(r.recommendation_type,'unknown') AS name, COUNT(*)::bigint AS value, \
                COALESCE(AVG(r.confidence),0)::float8 AS avg_confidence \
         FROM crm.customer_recommendations r \
         LEFT JOIN crm.customers c ON r.customer_id = c.id \
         GROUP BY COALESCE(r.recommendation_type,'unknown') ORDER BY value DESC",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 推荐类型分布查询失败: {}", e)))?;
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
         ORDER BY r.created_at DESC LIMIT 20",
    )
    .fetch_all(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("CRM 最近推荐查询失败: {}", e)))?;
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

    Ok(json!({ "by_type": by_type, "recent": recent }))
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

#[cfg(test)]
mod billing_scope_tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

    use super::*;
    use sqlx::PgPool;
    use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant};

    /// 建 crm.billing_records 并安装 K8 目标策略（fail-closed）：
    /// 只有带 app.tenant_id 命中本租户、或显式 app.rls_system='on' 才能读写。
    async fn setup(pool: &PgPool) {
        sqlx::raw_sql(
            r#"
            CREATE SCHEMA IF NOT EXISTS crm;
            CREATE TABLE crm.billing_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                customer_id UUID,
                customer_name TEXT,
                invoice_no TEXT NOT NULL,
                amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
                currency TEXT NOT NULL DEFAULT 'CNY',
                status TEXT,
                due_date TIMESTAMPTZ,
                paid_at TIMESTAMPTZ,
                items JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
            ALTER TABLE crm.billing_records ENABLE ROW LEVEL SECURITY;
            ALTER TABLE crm.billing_records FORCE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS rls_tenant_isolation ON crm.billing_records;
            CREATE POLICY rls_tenant_isolation ON crm.billing_records
                USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                       OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
                WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                       OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);
            "#,
        )
        .execute(pool)
        .await
        .unwrap();
    }

    async fn insert_bill(
        pool: &PgPool,
        tenant: uuid::Uuid,
        invoice_no: &str,
        status: &str,
        amount: i64,
    ) {
        let mut tx = pool.begin().await.unwrap();
        sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut *tx)
            .await
            .unwrap();
        sqlx::query(
            r#"INSERT INTO crm.billing_records
               (tenant_id, customer_name, invoice_no, amount, status, due_date, paid_at)
               VALUES ($1, 'Acme', $2, $3, $4, NOW() - INTERVAL '1 day',
                       CASE WHEN $4 = 'paid' THEN NOW() ELSE NULL END)"#,
        )
        .bind(invoice_no)
        .bind(rust_decimal::Decimal::from(amount))
        .bind(status)
        .execute(&mut *tx)
        .await
        .unwrap();
        tx.commit().await.unwrap();
    }

    fn sum_count(v: &serde_json::Value) -> i64 {
        v.as_array()
            .unwrap()
            .iter()
            .map(|x| x["count"].as_i64().unwrap())
            .sum()
    }

    fn sum_amount(v: &serde_json::Value) -> f64 {
        v.as_array()
            .unwrap()
            .iter()
            .map(|x| x["amount"].as_f64().unwrap())
            .sum()
    }

    #[sqlx::test(migrations = false)]
    async fn billing_analytics_is_tenant_scoped_and_fail_closed(pool: PgPool) {
        setup(&pool).await;

        let (is_super, bypass): (bool, bool) = sqlx::query_as(
            "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(
            !is_super && !bypass,
            "测试连接必须是受 RLS 约束的非超户角色，否则隔离断言无意义"
        );

        let tenant_a = uuid::Uuid::new_v4();
        let tenant_b = uuid::Uuid::new_v4();
        insert_bill(&pool, tenant_a, "INV-A1", "paid", 100).await;
        insert_bill(&pool, tenant_a, "INV-A2", "pending", 50).await;
        insert_bill(&pool, tenant_b, "INV-B1", "paid", 999).await;

        let db = Db::new(pool.clone(), "crm, public, shared");

        // 有租户上下文：只能读到本租户
        let mut tx_a = pool.begin().await.unwrap();
        let data_a = scope_request_tenant(
            RlsRequestTenant {
                tenant: tenant_a,
                system: false,
            },
            async { load_billing_analytics(&db, &mut tx_a).await },
        )
        .await
        .expect("有租户上下文时应能读到本租户账单");
        assert_eq!(sum_count(&data_a["status_pie"]), 2);
        assert!((sum_amount(&data_a["status_pie"]) - 150.0).abs() < f64::EPSILON);

        let mut tx_b = pool.begin().await.unwrap();
        let data_b = scope_request_tenant(
            RlsRequestTenant {
                tenant: tenant_b,
                system: false,
            },
            async { load_billing_analytics(&db, &mut tx_b).await },
        )
        .await
        .expect("租户 B 应能读到自己的账单");
        assert_eq!(sum_count(&data_b["status_pie"]), 1);
        assert!((sum_amount(&data_b["status_pie"]) - 999.0).abs() < f64::EPSILON);

        // 无租户上下文：拒绝（不是返回空聚合）
        let mut tx_none = pool.begin().await.unwrap();
        let err = load_billing_analytics(&db, &mut tx_none)
            .await
            .expect_err("无租户上下文必须拒绝");
        assert!(
            format!("{err}").contains("RLS context missing"),
            "错误应来自作用域守卫: {err}"
        );

        // 裸连接（无 GUC）在 fail-closed 策略下读不到任何行，证明测试未被超户/mock 绕过
        let bare: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM crm.billing_records")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(bare, 0, "无租户上下文时 RLS 必须 fail-closed");
    }
}
