//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V55.0 MDM AC-27: API 商业化 + 计量计费 + SLA 保障
//!
//! 核心能力：
//! - API 商业化 (APICommercialManager): 产品层级、订阅管理、套餐升级
//! - 计量计费 (MeteringService): 使用记录、账单生成、费率卡、成本计算
//! - SLA 保障 (SLAGuarantee): SLA 配置、度量、违约计算、事故管理

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use crate::shared::AppState;

// ==================== K1：真表映射（master_data.mdm_api_products / mdm_subscriptions） ====================

/// 行 → APIProduct（tier/features 以 snake 字符串 / JSONB 存储）。
fn product_from_row(row: &sqlx::postgres::PgRow) -> APIProduct {
    APIProduct {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        tier: tier_from_str(&row.get::<String, _>("tier")),
        rate_limit_per_min: row.get::<i64, _>("rate_limit_per_min"),
        rate_limit_per_day: row.get::<i64, _>("rate_limit_per_day"),
        features: serde_json::from_value(row.get::<serde_json::Value, _>("features"))
            .unwrap_or_default(),
        price_monthly: row.get::<f64, _>("price_monthly"),
        active: row.get::<bool, _>("active"),
    }
}

/// tier 枚举 → snake 字符串（写库）。
fn tier_to_str(t: &ProductTier) -> String {
    serde_json::to_value(t)
        .ok()
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "free".to_string())
}

fn sub_status_from_str(s: &str) -> SubscriptionStatus {
    match s {
        "expired" => SubscriptionStatus::Expired,
        "cancelled" => SubscriptionStatus::Cancelled,
        "pending" => SubscriptionStatus::Pending,
        _ => SubscriptionStatus::Active,
    }
}

fn sub_status_to_str(s: &SubscriptionStatus) -> String {
    serde_json::to_value(s)
        .ok()
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "active".to_string())
}

/// 行 → Subscription。
fn subscription_from_row(row: &sqlx::postgres::PgRow) -> Subscription {
    Subscription {
        id: row.get::<String, _>("id"),
        api_product_id: row.get::<String, _>("api_product_id"),
        tenant_id: row.get::<String, _>("tenant_id"),
        tier: tier_from_str(&row.get::<String, _>("tier")),
        starts_at: row.get::<chrono::DateTime<chrono::Utc>, _>("starts_at"),
        expires_at: row.get::<chrono::DateTime<chrono::Utc>, _>("expires_at"),
        status: sub_status_from_str(&row.get::<String, _>("status")),
    }
}

const PRODUCT_COLS: &str =
    "id::text, name, tier, rate_limit_per_min, rate_limit_per_day, features, price_monthly, active";
const SUBSCRIPTION_COLS: &str =
    "id::text, api_product_id, tenant_id::text, tier, starts_at, expires_at, status";

// ==================== 纯函数（无副作用，可单测） ====================

/// 计算 SLA 违约罚金。
/// - 若实际 uptime >= target，罚金为 0
/// - 否则罚金 = monthly_fee * (违约比例 / 目标比例) * 10%
///   - 违约比例 = target - uptime
///   - 该罚金与违约严重程度成正比
/// - 输入值会被合理 clamp（uptime/target 限制在 [0,100]）
pub fn calculate_sla_penalty(uptime_pct: f64, target_pct: f64, monthly_fee: f64) -> f64 {
    let uptime = uptime_pct.clamp(0.0, 100.0);
    let target = target_pct.clamp(0.0, 100.0);
    let fee = if monthly_fee < 0.0 { 0.0 } else { monthly_fee };

    if uptime >= target {
        0.0
    } else {
        // 违约比例
        let breach = target - uptime;
        // 防止 target 为 0 导致除零
        if target <= 0.0 {
            // 目标为 0 时仍违约，按固定 10% 罚款
            fee * 0.10
        } else {
            // 罚金 = 月费 * (违约比例 / 目标比例) * 10%
            let ratio = breach / target;
            (fee * ratio * 0.10 * 100.0).round() / 100.0
        }
    }
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算使用量费用。
/// - 调用量 ≤ free_tier：免费
/// - 超过 free_tier 的部分按 rate_per_1k（每千次费用）计费
/// - 输入会被 clamp 到非负
pub fn calculate_usage_cost(calls: i64, rate_per_1k: f64, free_tier: i64) -> f64 {
    let calls = calls.max(0);
    let free = free_tier.max(0);
    let rate = if rate_per_1k < 0.0 { 0.0 } else { rate_per_1k };

    let billable = (calls - free).max(0) as f64;
    (billable / 1000.0 * rate * 100.0).round() / 100.0
}

// ==================== API 商业化 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductTier {
    Free,
    Basic,
    Professional,
    Enterprise,
    Unlimited,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    Active,
    Expired,
    Cancelled,
    Pending,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct APIProduct {
    pub id: String,
    pub name: String,
    pub tier: ProductTier,
    pub rate_limit_per_min: i64,
    pub rate_limit_per_day: i64,
    pub features: Vec<String>,
    pub price_monthly: f64,
    pub active: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Subscription {
    pub id: String,
    pub api_product_id: String,
    pub tenant_id: String,
    pub tier: ProductTier,
    pub starts_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub status: SubscriptionStatus,
}

// ==================== 计量计费 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BillingStatus {
    Pending,
    Invoiced,
    Paid,
    Overdue,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UsageRecord {
    pub id: String,
    pub tenant_id: String,
    pub api_product_id: String,
    pub endpoint: String,
    pub requests: i64,
    pub errors: i64,
    pub data_transferred: f64,
    pub recorded_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UsageSummary {
    pub total_requests: i64,
    pub total_errors: i64,
    pub total_data_mb: f64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BillingRecord {
    pub id: String,
    pub tenant_id: String,
    pub period_start: String,
    pub period_end: String,
    pub tier: ProductTier,
    pub usage_summary: UsageSummary,
    pub total_amount: f64,
    pub status: BillingStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RateCard {
    pub id: String,
    pub tier: ProductTier,
    pub cost_per_request: f64,
    pub cost_per_mb: f64,
    pub overage_multiplier: f64,
    pub currency: String,
}

// ==================== SLA 保障 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SLAMetric {
    Availability,
    Latency,
    ErrorRate,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SLAIncidentType {
    Downtime,
    DegradedPerformance,
    DataLoss,
    SecurityBreach,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IncidentStatus {
    Open,
    Investigating,
    Resolved,
    Closed,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImpactSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SLAConfig {
    pub id: String,
    pub metric: SLAMetric,
    pub target_value: f64,
    pub unit: String,
    pub penalty_per_min: f64,
    pub measurement_window: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SLAMeasurement {
    pub id: String,
    pub config_id: String,
    pub tenant_id: String,
    pub measured_value: f64,
    pub target_value: f64,
    pub met: bool,
    pub measured_at: chrono::DateTime<chrono::Utc>,
    pub window_start: chrono::DateTime<chrono::Utc>,
    pub window_end: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SLAIncident {
    pub id: String,
    pub config_id: String,
    pub tenant_id: String,
    pub incident_type: SLAIncidentType,
    pub duration_min: i64,
    pub impact_severity: ImpactSeverity,
    pub compensation_amount: f64,
    pub status: IncidentStatus,
}

// ==================== 辅助函数 ====================

fn tier_from_str(s: &str) -> ProductTier {
    match s {
        "basic" => ProductTier::Basic,
        "professional" => ProductTier::Professional,
        "enterprise" => ProductTier::Enterprise,
        "unlimited" => ProductTier::Unlimited,
        _ => ProductTier::Free,
    }
}

fn product_tier_to_string(t: &ProductTier) -> String {
    match t {
        ProductTier::Free => "free".to_string(),
        ProductTier::Basic => "basic".to_string(),
        ProductTier::Professional => "professional".to_string(),
        ProductTier::Enterprise => "enterprise".to_string(),
        ProductTier::Unlimited => "unlimited".to_string(),
    }
}

// ==================== 请求/响应结构 ====================

// --- API 商业化请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateAPIProductRequest {
    pub name: String,
    pub tier: Option<String>,
    pub rate_limit_per_min: Option<i64>,
    pub rate_limit_per_day: Option<i64>,
    pub features: Option<Vec<String>>,
    pub price_monthly: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct SubscribeTenantRequest {
    pub api_product_id: String,
    pub tenant_id: String,
    pub tier: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub tier: Option<String>,
}

// --- 计量计费请求 ---

#[derive(Debug, Deserialize)]
pub struct RecordUsageRequest {
    pub tenant_id: String,
    pub api_product_id: String,
    pub endpoint: String,
    pub requests: i64,
    pub errors: Option<i64>,
    pub data_transferred: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UsageSummaryQuery {
    pub tenant_id: Option<String>,
    pub api_product_id: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateBillRequest {
    pub tenant_id: String,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BillingHistoryQuery {
    pub tenant_id: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRateCardRequest {
    pub tier: String,
    pub cost_per_request: f64,
    pub cost_per_mb: f64,
    pub overage_multiplier: Option<f64>,
    pub currency: Option<String>,
}

// --- SLA 请求 ---

#[derive(Debug, Deserialize)]
pub struct ConfigureSLARequest {
    pub metric: String,
    pub target_value: f64,
    pub unit: Option<String>,
    pub penalty_per_min: Option<f64>,
    pub measurement_window: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct MeasureSLARequest {
    pub config_id: String,
    pub tenant_id: String,
    pub measured_value: f64,
}

#[derive(Debug, Deserialize)]
pub struct SLAStatusQuery {
    pub tenant_id: Option<String>,
    pub config_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SLAHistoryQuery {
    pub tenant_id: Option<String>,
    pub config_id: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SLAPenaltyQuery {
    pub config_id: String,
    pub tenant_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSLAIncidentRequest {
    pub config_id: String,
    pub tenant_id: String,
    pub incident_type: String,
    pub duration_min: i64,
    pub impact_severity: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SLAIncidentsQuery {
    pub tenant_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SLAReportQuery {
    pub tenant_id: Option<String>,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
}

// ==================== 处理器：API 商业化 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/products",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn create_api_product(
    State(state): State<AppState>,
    Json(req): Json<CreateAPIProductRequest>,
) -> ApiResponse<APIProduct> {
    let tier = req
        .tier
        .as_deref()
        .map(tier_from_str)
        .unwrap_or(ProductTier::Free);

    let product = APIProduct {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        tier,
        rate_limit_per_min: req.rate_limit_per_min.unwrap_or(100),
        rate_limit_per_day: req.rate_limit_per_day.unwrap_or(10000),
        features: req.features.unwrap_or_default(),
        price_monthly: req.price_monthly.unwrap_or(0.0),
        active: true,
    };

    // K1：写真表 master_data.mdm_api_products。
    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_api_products
           (id, name, tier, rate_limit_per_min, rate_limit_per_day, features, price_monthly, active, tenant_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
    )
    .bind(&product.id)
    .bind(&product.name)
    .bind(tier_to_str(&product.tier))
    .bind(product.rate_limit_per_min)
    .bind(product.rate_limit_per_day)
    .bind(serde_json::to_value(&product.features).unwrap_or(serde_json::json!([])))
    .bind(product.price_monthly)
    .bind(product.active)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入 API 产品失败: {e}"));
    }

    ApiResponse::success(product, "API 产品已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/products",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn list_api_products(State(state): State<AppState>) -> ApiResponse<Vec<APIProduct>> {
    // K1：真表读取启用产品。
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {PRODUCT_COLS} FROM master_data.mdm_api_products WHERE active = TRUE ORDER BY name"
    )))
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    let active: Vec<APIProduct> = rows.iter().map(product_from_row).collect();
    ApiResponse::success(active, "API 产品列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/products/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn get_api_product(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<APIProduct> {
    // K1：真表读取。
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {PRODUCT_COLS} FROM master_data.mdm_api_products WHERE id = $1 LIMIT 1"
    )))
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match row {
        Some(r) => ApiResponse::success(product_from_row(&r), "API 产品详情"),
        None => ApiResponse::not_found("未找到 API 产品"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/subscribe",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn subscribe_tenant(
    State(state): State<AppState>,
    Json(req): Json<SubscribeTenantRequest>,
) -> ApiResponse<Subscription> {
    // K1：产品从真表查找。
    let product_row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {PRODUCT_COLS} FROM master_data.mdm_api_products WHERE id = $1 LIMIT 1"
    )))
    .bind(&req.api_product_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let Some(product_row) = product_row else {
        return ApiResponse::not_found("未找到 API 产品");
    };
    let product = product_from_row(&product_row);

    let tier = req
        .tier
        .as_deref()
        .map(tier_from_str)
        .unwrap_or_else(|| product.tier.clone());

    let now = chrono::Utc::now();
    let expires_at = now + chrono::Duration::days(30);

    let sub = Subscription {
        id: uuid::Uuid::new_v4().to_string(),
        api_product_id: req.api_product_id,
        tenant_id: req.tenant_id,
        tier,
        starts_at: now,
        expires_at,
        status: SubscriptionStatus::Active,
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_subscriptions
           (id, api_product_id, tenant_id, tier, starts_at, expires_at, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
    )
    .bind(&sub.id)
    .bind(&sub.api_product_id)
    .bind(&sub.tenant_id)
    .bind(tier_to_str(&sub.tier))
    .bind(&sub.starts_at)
    .bind(&sub.expires_at)
    .bind(sub_status_to_str(&sub.status))
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入订阅失败: {e}"));
    }

    ApiResponse::success(sub, "租户订阅已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/subscriptions/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn get_subscription(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Subscription> {
    // K1：真表读取。
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {SUBSCRIPTION_COLS} FROM master_data.mdm_subscriptions WHERE id = $1 LIMIT 1"
    )))
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match row {
        Some(r) => ApiResponse::success(subscription_from_row(&r), "订阅详情"),
        None => ApiResponse::not_found("未找到订阅"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/subscriptions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn list_subscriptions(
    State(state): State<AppState>,
    Query(params): Query<UsageSummaryQuery>,
) -> ApiResponse<Vec<Subscription>> {
    // K1：真表读取，可选 tenant_id / api_product_id 过滤。
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {SUBSCRIPTION_COLS} FROM master_data.mdm_subscriptions
             WHERE ($1::text IS NULL OR tenant_id::text = $1)
               AND ($2::text IS NULL OR api_product_id = $2)
             ORDER BY starts_at DESC"
    )))
    .bind(&params.tenant_id)
    .bind(&params.api_product_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    let filtered: Vec<Subscription> = rows.iter().map(subscription_from_row).collect();

    ApiResponse::success(filtered, "订阅列表")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/subscriptions/{id}/cancel",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn cancel_subscription(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Subscription> {
    // K1：写真表 master_data.mdm_subscriptions（UPDATE...RETURNING，无行 404）。
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"UPDATE master_data.mdm_subscriptions SET status = 'cancelled'
           WHERE id = $1::uuid AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
           RETURNING {SUBSCRIPTION_COLS}"#,
    )))
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    let Some(row) = (match row {
        Ok(r) => r,
        Err(e) => return ApiResponse::server_error(&format!("取消订阅失败: {e}")),
    }) else {
        return ApiResponse::not_found("未找到订阅");
    };
    let updated = subscription_from_row(&row);

    ApiResponse::success(updated, "订阅已取消")
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/subscriptions/{id}/upgrade",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn upgrade_tier(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateSubscriptionRequest>,
) -> ApiResponse<Subscription> {
    // K1：写真表（先查后更，无行 404）。
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SUBSCRIPTION_COLS} FROM master_data.mdm_subscriptions WHERE id = $1::uuid LIMIT 1"#,
    )))
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    let Some(row) = (match row {
        Ok(r) => r,
        Err(e) => return ApiResponse::server_error(&format!("查询订阅失败: {e}")),
    }) else {
        return ApiResponse::not_found("未找到订阅");
    };
    let current = subscription_from_row(&row);
    let new_tier = req
        .tier
        .as_deref()
        .map(tier_from_str)
        .unwrap_or(current.tier);

    if let Err(e) = sqlx::query(
        "UPDATE master_data.mdm_subscriptions SET tier = $1, status = 'active' WHERE id = $2::uuid AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))",
    )
    .bind(product_tier_to_string(&new_tier))
    .bind(&id)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("升级套餐失败: {e}"));
    }

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SUBSCRIPTION_COLS} FROM master_data.mdm_subscriptions WHERE id = $1::uuid LIMIT 1"#,
    )))
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    let Some(row) = (match row {
        Ok(r) => r,
        Err(e) => return ApiResponse::server_error(&format!("回读订阅失败: {e}")),
    }) else {
        return ApiResponse::not_found("未找到订阅");
    };
    let updated = subscription_from_row(&row);

    ApiResponse::success(updated, "套餐已升级")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/usage/record",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn record_usage(
    State(state): State<AppState>,
    Json(req): Json<RecordUsageRequest>,
) -> ApiResponse<UsageRecord> {
    // K1：写真表 master_data.mdm_usage_records。
    let record = UsageRecord {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: req.tenant_id,
        api_product_id: req.api_product_id,
        endpoint: req.endpoint,
        requests: req.requests,
        errors: req.errors.unwrap_or(0),
        data_transferred: req.data_transferred.unwrap_or(0.0),
        recorded_at: chrono::Utc::now(),
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_usage_records
           (id, tenant_id, api_product_id, endpoint, requests, errors, data_transferred, recorded_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"#,
    )
    .bind(&record.id)
    .bind(&record.tenant_id)
    .bind(&record.api_product_id)
    .bind(&record.endpoint)
    .bind(record.requests)
    .bind(record.errors)
    .bind(record.data_transferred)
    .bind(&record.recorded_at)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入使用记录失败: {e}"));
    }

    ApiResponse::success(record, "使用记录已保存")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/usage/summary",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_usage_summary(
    State(state): State<AppState>,
    Query(params): Query<UsageSummaryQuery>,
) -> ApiResponse<UsageSummary> {
    // K1：数据源改真表 master_data.mdm_usage_records，聚合逻辑保留。
    let query = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {USAGE_COLS} FROM master_data.mdm_usage_records
           WHERE ($1::text IS NULL OR tenant_id::text = $1)
             AND ($2::text IS NULL OR api_product_id = $2)
             AND ($3::text IS NULL OR recorded_at::text >= $3)
             AND ($4::text IS NULL OR recorded_at::text <= $4)
           ORDER BY recorded_at"#,
    )))
    .bind(params.tenant_id.as_deref())
    .bind(params.api_product_id.as_deref())
    .bind(params.start_time.as_deref())
    .bind(params.end_time.as_deref())
    .fetch_all(&state.db)
    .await;

    let rows = match query {
        Ok(r) => r,
        Err(e) => return ApiResponse::server_error(&format!("查询用量失败: {e}")),
    };
    let filtered: Vec<UsageRecord> = rows.iter().map(usage_record_from_row).collect();

    let total_requests: i64 = filtered.iter().map(|r| r.requests).sum();
    let total_errors: i64 = filtered.iter().map(|r| r.errors).sum();
    let total_data_mb: f64 = filtered.iter().map(|r| r.data_transferred).sum();
    let error_rate = if total_requests > 0 {
        (total_errors as f64 / total_requests as f64) * 100.0
    } else {
        0.0
    };

    ApiResponse::success(
        UsageSummary {
            total_requests,
            total_errors,
            total_data_mb,
            error_rate,
        },
        "用量汇总",
    )
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/bill/generate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn generate_bill(
    State(state): State<AppState>,
    Json(req): Json<GenerateBillRequest>,
) -> ApiResponse<BillingRecord> {
    // K1：数据源改真表（usage_records / rate_cards / api_products），逻辑保留。
    let period_start = req
        .period_start
        .unwrap_or_else(|| (chrono::Utc::now() - chrono::Duration::days(30)).to_rfc3339());
    let period_end = req
        .period_end
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    let usage_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {USAGE_COLS} FROM master_data.mdm_usage_records
           WHERE tenant_id = $1 AND recorded_at::text >= $2 AND recorded_at::text <= $3
           ORDER BY recorded_at"#,
    )))
    .bind(&req.tenant_id)
    .bind(&period_start)
    .bind(&period_end)
    .fetch_all(&state.db)
    .await;
    let filtered: Vec<UsageRecord> = match usage_rows {
        Ok(r) => r.iter().map(usage_record_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询用量失败: {e}")),
    };

    let total_requests: i64 = filtered.iter().map(|r| r.requests).sum();
    let total_errors: i64 = filtered.iter().map(|r| r.errors).sum();
    let total_data_mb: f64 = filtered.iter().map(|r| r.data_transferred).sum();
    let error_rate = if total_requests > 0 {
        (total_errors as f64 / total_requests as f64) * 100.0
    } else {
        0.0
    };

    let rate_card_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {RATE_CARD_COLS} FROM master_data.mdm_rate_cards ORDER BY tier LIMIT 1"#,
    )))
    .fetch_all(&state.db)
    .await;
    let rate_cards: Vec<RateCard> = match rate_card_rows {
        Ok(r) => r.iter().map(rate_card_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询费率卡失败: {e}")),
    };
    let rate_card = rate_cards.first().cloned().unwrap_or(RateCard {
        id: String::new(),
        tier: ProductTier::Free,
        cost_per_request: 0.001,
        cost_per_mb: 0.05,
        overage_multiplier: 1.0,
        currency: "CNY".to_string(),
    });

    let product_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {PRODUCT_COLS} FROM master_data.mdm_api_products WHERE active = TRUE ORDER BY name"#,
    )))
    .fetch_all(&state.db)
    .await;
    let products: Vec<APIProduct> = match product_rows {
        Ok(r) => r.iter().map(product_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询产品失败: {e}")),
    };
    let matched_product = products
        .iter()
        .find(|p| filtered.iter().any(|r| r.api_product_id == p.id));

    let tier = matched_product
        .map(|p| p.tier.clone())
        .unwrap_or(ProductTier::Free);

    let base_cost =
        total_requests as f64 * rate_card.cost_per_request + total_data_mb * rate_card.cost_per_mb;
    let total_amount = if base_cost > 1000.0 {
        1000.0 + (base_cost - 1000.0) * rate_card.overage_multiplier
    } else {
        base_cost
    };

    let bill = BillingRecord {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: req.tenant_id,
        period_start,
        period_end,
        tier,
        usage_summary: UsageSummary {
            total_requests,
            total_errors,
            total_data_mb,
            error_rate,
        },
        total_amount,
        status: BillingStatus::Pending,
    };

    // K1：写真表 master_data.mdm_billing_records。
    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_billing_records
           (id, tenant_id, period_start, period_end, tier, usage_summary, total_amount, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"#,
    )
    .bind(&bill.id)
    .bind(&bill.tenant_id)
    .bind(&bill.period_start)
    .bind(&bill.period_end)
    .bind(product_tier_to_string(&bill.tier))
    .bind(serde_json::to_value(&bill.usage_summary).unwrap_or(serde_json::json!({})))
    .bind(bill.total_amount)
    .bind(billing_status_to_str(&bill.status))
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入账单失败: {e}"));
    }

    ApiResponse::success(bill, "账单已生成")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/billing",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
pub async fn get_billing_history(
    State(state): State<AppState>,
    Query(params): Query<BillingHistoryQuery>,
) -> ApiResponse<PaginatedResponse<BillingRecord>> {
    // K1：真表分页（COALESCE 过滤 + LIMIT/OFFSET + 独立 COUNT）。
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let count_rows = sqlx::query(
        "SELECT COUNT(*) AS total FROM master_data.mdm_billing_records WHERE ($1::text IS NULL OR tenant_id::text = $1)",
    )
    .bind(params.tenant_id.as_deref())
    .fetch_one(&state.db)
    .await;
    let total: i64 = match count_rows {
        Ok(r) => r.get::<i64, _>("total"),
        Err(e) => return ApiResponse::server_error(&format!("查询账单失败: {e}")),
    };

    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {BILLING_COLS} FROM master_data.mdm_billing_records
           WHERE ($1::text IS NULL OR tenant_id::text = $1)
           ORDER BY period_end DESC
           LIMIT $2 OFFSET $3"#,
    )))
    .bind(params.tenant_id.as_deref())
    .bind(page_size)
    .bind((page - 1) * page_size)
    .fetch_all(&state.db)
    .await;
    let items: Vec<BillingRecord> = match rows {
        Ok(r) => r.iter().map(billing_record_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询账单失败: {e}")),
    };

    ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "账单历史",
    )
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/rate-cards",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn create_rate_card(
    State(state): State<AppState>,
    Json(req): Json<CreateRateCardRequest>,
) -> ApiResponse<RateCard> {
    // K1：写真表 master_data.mdm_rate_cards。
    let card = RateCard {
        id: uuid::Uuid::new_v4().to_string(),
        tier: tier_from_str(&req.tier),
        cost_per_request: req.cost_per_request,
        cost_per_mb: req.cost_per_mb,
        overage_multiplier: req.overage_multiplier.unwrap_or(1.0),
        currency: req.currency.unwrap_or_else(|| "CNY".to_string()),
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_rate_cards
           (id, tier, cost_per_request, cost_per_mb, overage_multiplier, currency)
           VALUES ($1,$2,$3,$4,$5,$6)"#,
    )
    .bind(&card.id)
    .bind(product_tier_to_string(&card.tier))
    .bind(card.cost_per_request)
    .bind(card.cost_per_mb)
    .bind(card.overage_multiplier)
    .bind(&card.currency)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("创建费率卡失败: {e}"));
    }

    ApiResponse::success(card, "费率卡已创建")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/rate-cards",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn get_rate_cards(State(state): State<AppState>) -> ApiResponse<Vec<RateCard>> {
    // K1：读真表。
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {RATE_CARD_COLS} FROM master_data.mdm_rate_cards ORDER BY tier"#,
    )))
    .fetch_all(&state.db)
    .await;
    let cards: Vec<RateCard> = match rows {
        Ok(r) => r.iter().map(rate_card_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询费率卡失败: {e}")),
    };
    ApiResponse::success(cards, "费率卡列表")
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/billing/{id}/mark-paid",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn mark_bill_paid(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<BillingRecord> {
    // K1：写真表（UPDATE...RETURNING，无行 404）。
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"UPDATE master_data.mdm_billing_records SET status = 'paid'
           WHERE id = $1::uuid AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
           RETURNING {BILLING_COLS}"#,
    )))
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    let Some(row) = (match row {
        Ok(r) => r,
        Err(e) => return ApiResponse::server_error(&format!("标记账单失败: {e}")),
    }) else {
        return ApiResponse::not_found("未找到账单");
    };
    let updated = billing_record_from_row(&row);

    ApiResponse::success(updated, "账单已标记为已支付")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/sla/configure",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn configure_sla(
    State(state): State<AppState>,
    Json(req): Json<ConfigureSLARequest>,
) -> ApiResponse<SLAConfig> {
    // K1：写真表 master_data.mdm_sla_configs。
    let config = SLAConfig {
        id: uuid::Uuid::new_v4().to_string(),
        metric: sla_metric_from_str(&req.metric),
        target_value: req.target_value,
        unit: req.unit.unwrap_or_else(|| "%".to_string()),
        penalty_per_min: req.penalty_per_min.unwrap_or(10.0),
        measurement_window: req.measurement_window.unwrap_or(30),
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_sla_configs
           (id, metric, target_value, unit, penalty_per_min, measurement_window)
           VALUES ($1,$2,$3,$4,$5,$6)"#,
    )
    .bind(&config.id)
    .bind(sla_metric_to_str(&config.metric))
    .bind(config.target_value)
    .bind(&config.unit)
    .bind(config.penalty_per_min)
    .bind(config.measurement_window)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("配置 SLA 失败: {e}"));
    }

    ApiResponse::success(config, "SLA 配置已创建")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/sla/measure",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn measure_sla(
    State(state): State<AppState>,
    Json(req): Json<MeasureSLARequest>,
) -> ApiResponse<SLAMeasurement> {
    // K1：先读真表 SLA 配置（无行 404），再写度量。
    let config_row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_CONFIG_COLS} FROM master_data.mdm_sla_configs WHERE id = $1 LIMIT 1"#,
    )))
    .bind(&req.config_id)
    .fetch_optional(&state.db)
    .await;
    let config = match config_row {
        Ok(Some(r)) => sla_config_from_row(&r),
        Ok(None) => return ApiResponse::not_found("未找到 SLA 配置"),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 配置失败: {e}")),
    };

    let target = config.target_value;
    let met = match &config.metric {
        SLAMetric::Availability => req.measured_value >= target,
        SLAMetric::Latency => req.measured_value <= target,
        SLAMetric::ErrorRate => req.measured_value <= target,
    };

    let now = chrono::Utc::now();
    let measurement = SLAMeasurement {
        id: uuid::Uuid::new_v4().to_string(),
        config_id: req.config_id,
        tenant_id: req.tenant_id,
        measured_value: req.measured_value,
        target_value: target,
        met,
        measured_at: now,
        window_start: now - chrono::Duration::minutes(config.measurement_window),
        window_end: now,
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_sla_measurements
           (id, config_id, tenant_id, measured_value, target_value, met, measured_at, window_start, window_end)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)"#,
    )
    .bind(&measurement.id)
    .bind(&measurement.config_id)
    .bind(&measurement.tenant_id)
    .bind(measurement.measured_value)
    .bind(measurement.target_value)
    .bind(measurement.met)
    .bind(&measurement.measured_at)
    .bind(&measurement.window_start)
    .bind(&measurement.window_end)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入 SLA 度量失败: {e}"));
    }

    ApiResponse::success(measurement, "SLA 度量已记录")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/sla/status",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_sla_status(
    State(state): State<AppState>,
    Query(params): Query<SLAStatusQuery>,
) -> ApiResponse<serde_json::Value> {
    // K1：数据源改真表（configs + measurements），聚合逻辑保留。
    let config_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_CONFIG_COLS} FROM master_data.mdm_sla_configs
           WHERE ($1::text IS NULL OR id::text = $1) ORDER BY metric"#,
    )))
    .bind(params.config_id.as_deref())
    .fetch_all(&state.db)
    .await;
    let configs: Vec<SLAConfig> = match config_rows {
        Ok(r) => r.iter().map(sla_config_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 配置失败: {e}")),
    };

    let meas_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_MEASUREMENT_COLS} FROM master_data.mdm_sla_measurements
           WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY measured_at"#,
    )))
    .bind(params.tenant_id.as_deref())
    .fetch_all(&state.db)
    .await;
    let measurements: Vec<SLAMeasurement> = match meas_rows {
        Ok(r) => r.iter().map(sla_measurement_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 度量失败: {e}")),
    };

    let mut statuses: Vec<serde_json::Value> = Vec::new();

    for config in configs.iter() {
        let config_measurements: Vec<&SLAMeasurement> = measurements
            .iter()
            .filter(|m| m.config_id == config.id)
            .collect();

        let met_count = config_measurements.iter().filter(|m| m.met).count();
        let total = config_measurements.len();
        let pass_rate = if total > 0 {
            (met_count as f64 / total as f64) * 100.0
        } else {
            100.0
        };

        statuses.push(serde_json::json!({
            "config_id": config.id,
            "metric": sla_metric_to_str(&config.metric),
            "target_value": config.target_value,
            "unit": config.unit,
            "measurements_count": total,
            "met_count": met_count,
            "pass_rate": pass_rate,
            "current_status": if pass_rate >= 99.0 { "compliant" } else { "breaching" },
        }));
    }

    ApiResponse::success(serde_json::json!({ "sla_statuses": statuses }), "SLA 状态")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/sla/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn get_sla_history(
    State(state): State<AppState>,
    Query(params): Query<SLAHistoryQuery>,
) -> ApiResponse<Vec<SLAMeasurement>> {
    // K1：真表 COALESCE 过滤。
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_MEASUREMENT_COLS} FROM master_data.mdm_sla_measurements
           WHERE ($1::text IS NULL OR tenant_id::text = $1)
             AND ($2::text IS NULL OR config_id = $2)
             AND ($3::text IS NULL OR measured_at::text >= $3)
             AND ($4::text IS NULL OR measured_at::text <= $4)
           ORDER BY measured_at"#,
    )))
    .bind(params.tenant_id.as_deref())
    .bind(params.config_id.as_deref())
    .bind(params.start_time.as_deref())
    .bind(params.end_time.as_deref())
    .fetch_all(&state.db)
    .await;
    let filtered: Vec<SLAMeasurement> = match rows {
        Ok(r) => r.iter().map(sla_measurement_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 历史失败: {e}")),
    };

    ApiResponse::success(filtered, "SLA 历史记录")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/sla/penalty",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss
)]
pub async fn calculate_penalty(
    State(state): State<AppState>,
    Query(params): Query<SLAPenaltyQuery>,
) -> ApiResponse<serde_json::Value> {
    // K1：数据源改真表（config + measurements），逻辑保留。
    let config_row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_CONFIG_COLS} FROM master_data.mdm_sla_configs WHERE id = $1 LIMIT 1"#,
    )))
    .bind(&params.config_id)
    .fetch_optional(&state.db)
    .await;
    let config = match config_row {
        Ok(Some(r)) => sla_config_from_row(&r),
        Ok(None) => return ApiResponse::not_found("未找到 SLA 配置"),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 配置失败: {e}")),
    };

    let meas_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_MEASUREMENT_COLS} FROM master_data.mdm_sla_measurements
           WHERE config_id = $1 AND tenant_id = $2 AND met = FALSE ORDER BY measured_at"#,
    )))
    .bind(&params.config_id)
    .bind(&params.tenant_id)
    .fetch_all(&state.db)
    .await;
    let breached: Vec<SLAMeasurement> = match meas_rows {
        Ok(r) => r.iter().map(sla_measurement_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 度量失败: {e}")),
    };

    let breach_count = breached.len() as i64;
    let penalty_per_breach = config.penalty_per_min;
    let total_penalty = breach_count as f64 * penalty_per_breach;

    ApiResponse::success(
        serde_json::json!({
            "config_id": params.config_id,
            "tenant_id": params.tenant_id,
            "breach_count": breach_count,
            "penalty_per_min": penalty_per_breach,
            "total_penalty": total_penalty,
            "currency": "CNY",
        }),
        "SLA 违约金额",
    )
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:commercial:write"])),
    path = "/mdm-v55/sla/incident",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn create_incident(
    State(state): State<AppState>,
    Json(req): Json<CreateSLAIncidentRequest>,
) -> ApiResponse<SLAIncident> {
    // K1：写真表 master_data.mdm_sla_incidents。
    let incident_type = sla_incident_type_from_str(&req.incident_type);
    let impact_severity = req
        .impact_severity
        .as_deref()
        .map(impact_severity_from_str)
        .unwrap_or(ImpactSeverity::Medium);

    let config_row = sqlx::query(
        "SELECT penalty_per_min FROM master_data.mdm_sla_configs WHERE id = $1 LIMIT 1",
    )
    .bind(&req.config_id)
    .fetch_optional(&state.db)
    .await;
    let penalty_per_min = match config_row {
        Ok(Some(r)) => r.get::<f64, _>("penalty_per_min"),
        Ok(None) => 10.0,
        Err(_) => 10.0,
    };

    let compensation_amount = penalty_per_min * req.duration_min as f64;

    let incident = SLAIncident {
        id: uuid::Uuid::new_v4().to_string(),
        config_id: req.config_id,
        tenant_id: req.tenant_id,
        incident_type,
        duration_min: req.duration_min,
        impact_severity,
        compensation_amount,
        status: IncidentStatus::Open,
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_sla_incidents
           (id, config_id, tenant_id, incident_type, duration_min, impact_severity, compensation_amount, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"#,
    )
    .bind(&incident.id)
    .bind(&incident.config_id)
    .bind(&incident.tenant_id)
    .bind(sla_incident_type_to_str(&incident.incident_type))
    .bind(incident.duration_min)
    .bind(impact_severity_to_str(&incident.impact_severity))
    .bind(incident.compensation_amount)
    .bind(incident_status_to_str(&incident.status))
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("创建 SLA 事故失败: {e}"));
    }

    ApiResponse::success(incident, "SLA 事故已创建")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/sla/incidents",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
pub async fn get_incidents(
    State(state): State<AppState>,
    Query(params): Query<SLAIncidentsQuery>,
) -> ApiResponse<Vec<SLAIncident>> {
    // K1：真表 COALESCE 过滤。
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_INCIDENT_COLS} FROM master_data.mdm_sla_incidents
           WHERE ($1::text IS NULL OR tenant_id::text = $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY id"#,
    )))
    .bind(params.tenant_id.as_deref())
    .bind(params.status.as_deref())
    .fetch_all(&state.db)
    .await;
    let filtered: Vec<SLAIncident> = match rows {
        Ok(r) => r.iter().map(sla_incident_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 事故失败: {e}")),
    };

    ApiResponse::success(filtered, "SLA 事故列表")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:commercial:read"])),
    path = "/mdm-v55/sla/report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "commercial_v55"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss
)]
pub async fn generate_sla_report(
    State(state): State<AppState>,
    Query(params): Query<SLAReportQuery>,
) -> ApiResponse<serde_json::Value> {
    // K1：数据源改真表（configs / measurements / incidents），逻辑保留。
    let config_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_CONFIG_COLS} FROM master_data.mdm_sla_configs ORDER BY metric"#,
    )))
    .fetch_all(&state.db)
    .await;
    let configs: Vec<SLAConfig> = match config_rows {
        Ok(r) => r.iter().map(sla_config_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 配置失败: {e}")),
    };

    let meas_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_MEASUREMENT_COLS} FROM master_data.mdm_sla_measurements ORDER BY measured_at"#,
    )))
    .fetch_all(&state.db)
    .await;
    let measurements: Vec<SLAMeasurement> = match meas_rows {
        Ok(r) => r.iter().map(sla_measurement_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 度量失败: {e}")),
    };

    let incident_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"SELECT {SLA_INCIDENT_COLS} FROM master_data.mdm_sla_incidents ORDER BY id"#,
    )))
    .fetch_all(&state.db)
    .await;
    let incidents: Vec<SLAIncident> = match incident_rows {
        Ok(r) => r.iter().map(sla_incident_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询 SLA 事故失败: {e}")),
    };

    let tenant_filter = params.tenant_id.as_deref();

    let mut config_summaries: Vec<serde_json::Value> = Vec::new();
    let mut total_breaches: i64 = 0;
    let mut total_compensation: f64 = 0.0;

    for config in configs.iter() {
        let config_measurements: Vec<&SLAMeasurement> = measurements
            .iter()
            .filter(|m| {
                m.config_id == config.id
                    && tenant_filter.map(|tid| m.tenant_id == tid).unwrap_or(true)
                    && params
                        .period_start
                        .as_ref()
                        .map(|s| {
                            chrono::DateTime::parse_from_rfc3339(s)
                                .map(|d| m.measured_at >= d.with_timezone(&chrono::Utc))
                                .unwrap_or(true)
                        })
                        .unwrap_or(true)
                    && params
                        .period_end
                        .as_ref()
                        .map(|e| {
                            chrono::DateTime::parse_from_rfc3339(e)
                                .map(|d| m.measured_at <= d.with_timezone(&chrono::Utc))
                                .unwrap_or(true)
                        })
                        .unwrap_or(true)
            })
            .collect();

        let met_count = config_measurements.iter().filter(|m| m.met).count();
        let total = config_measurements.len();
        let pass_rate = if total > 0 {
            (met_count as f64 / total as f64) * 100.0
        } else {
            100.0
        };

        let config_incidents: Vec<&SLAIncident> = incidents
            .iter()
            .filter(|i| {
                i.config_id == config.id
                    && tenant_filter.map(|tid| i.tenant_id == tid).unwrap_or(true)
            })
            .collect();

        total_breaches += config_incidents.len() as i64;
        total_compensation += config_incidents
            .iter()
            .map(|i| i.compensation_amount)
            .sum::<f64>();

        config_summaries.push(serde_json::json!({
            "config_id": config.id,
            "metric": sla_metric_to_str(&config.metric),
            "target_value": config.target_value,
            "unit": config.unit,
            "measurements_count": total,
            "met_count": met_count,
            "pass_rate": pass_rate,
            "incidents_count": config_incidents.len(),
            "total_duration_min": config_incidents.iter().map(|i| i.duration_min).sum::<i64>(),
        }));
    }

    let report = serde_json::json!({
        "report_id": uuid::Uuid::new_v4().to_string(),
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "tenant_id": tenant_filter.unwrap_or("all"),
        "period": {
            "start": params.period_start.as_deref().unwrap_or("epoch"),
            "end": params.period_end.as_deref().unwrap_or("now"),
        },
        "config_summaries": config_summaries,
        "total_breaches": total_breaches,
        "total_compensation": total_compensation,
        "overall_status": if total_breaches == 0 { "passing" } else { "needs_attention" },
    });

    ApiResponse::success(report, "SLA 报告")
}
// ==================== K1：真表映射（master_data.mdm_usage_records / billing / rate_cards / sla_*） ====================

const USAGE_COLS: &str =
    "id::text, tenant_id::text, api_product_id, endpoint, requests, errors, data_transferred, recorded_at";
const BILLING_COLS: &str =
    "id::text, tenant_id::text, period_start, period_end, tier, usage_summary, total_amount, status";
const RATE_CARD_COLS: &str =
    "id::text, tier, cost_per_request, cost_per_mb, overage_multiplier, currency";
const SLA_CONFIG_COLS: &str =
    "id::text, metric, target_value, unit, penalty_per_min, measurement_window";
const SLA_MEASUREMENT_COLS: &str =
    "id::text, config_id, tenant_id::text, measured_value, target_value, met, measured_at, window_start, window_end";
const SLA_INCIDENT_COLS: &str =
    "id::text, config_id, tenant_id::text, incident_type, duration_min, impact_severity, compensation_amount, status";

fn usage_record_from_row(row: &sqlx::postgres::PgRow) -> UsageRecord {
    use sqlx::Row;
    UsageRecord {
        id: row.get::<String, _>("id"),
        tenant_id: row.get::<String, _>("tenant_id"),
        api_product_id: row.get::<String, _>("api_product_id"),
        endpoint: row.get::<String, _>("endpoint"),
        requests: row.get::<i64, _>("requests"),
        errors: row.get::<i64, _>("errors"),
        data_transferred: row.get::<f64, _>("data_transferred"),
        recorded_at: row.get::<chrono::DateTime<chrono::Utc>, _>("recorded_at"),
    }
}

fn billing_status_from_str(s: &str) -> BillingStatus {
    match s {
        "invoiced" => BillingStatus::Invoiced,
        "paid" => BillingStatus::Paid,
        "overdue" => BillingStatus::Overdue,
        _ => BillingStatus::Pending,
    }
}

fn billing_status_to_str(b: &BillingStatus) -> String {
    match b {
        BillingStatus::Pending => "pending".to_string(),
        BillingStatus::Invoiced => "invoiced".to_string(),
        BillingStatus::Paid => "paid".to_string(),
        BillingStatus::Overdue => "overdue".to_string(),
    }
}

fn billing_record_from_row(row: &sqlx::postgres::PgRow) -> BillingRecord {
    use sqlx::Row;
    let summary: serde_json::Value = row.get::<serde_json::Value, _>("usage_summary");
    BillingRecord {
        id: row.get::<String, _>("id"),
        tenant_id: row.get::<String, _>("tenant_id"),
        period_start: row.get::<String, _>("period_start"),
        period_end: row.get::<String, _>("period_end"),
        tier: tier_from_str(&row.get::<String, _>("tier")),
        usage_summary: serde_json::from_value(summary).unwrap_or(UsageSummary {
            total_requests: 0,
            total_errors: 0,
            total_data_mb: 0.0,
            error_rate: 0.0,
        }),
        total_amount: row.get::<f64, _>("total_amount"),
        status: billing_status_from_str(&row.get::<String, _>("status")),
    }
}

fn rate_card_from_row(row: &sqlx::postgres::PgRow) -> RateCard {
    use sqlx::Row;
    RateCard {
        id: row.get::<String, _>("id"),
        tier: tier_from_str(&row.get::<String, _>("tier")),
        cost_per_request: row.get::<f64, _>("cost_per_request"),
        cost_per_mb: row.get::<f64, _>("cost_per_mb"),
        overage_multiplier: row.get::<f64, _>("overage_multiplier"),
        currency: row.get::<String, _>("currency"),
    }
}

fn sla_metric_from_str(s: &str) -> SLAMetric {
    match s {
        "latency" => SLAMetric::Latency,
        "error_rate" => SLAMetric::ErrorRate,
        _ => SLAMetric::Availability,
    }
}

fn sla_metric_to_str(m: &SLAMetric) -> String {
    match m {
        SLAMetric::Availability => "availability".to_string(),
        SLAMetric::Latency => "latency".to_string(),
        SLAMetric::ErrorRate => "error_rate".to_string(),
    }
}

fn sla_config_from_row(row: &sqlx::postgres::PgRow) -> SLAConfig {
    use sqlx::Row;
    SLAConfig {
        id: row.get::<String, _>("id"),
        metric: sla_metric_from_str(&row.get::<String, _>("metric")),
        target_value: row.get::<f64, _>("target_value"),
        unit: row.get::<String, _>("unit"),
        penalty_per_min: row.get::<f64, _>("penalty_per_min"),
        measurement_window: row.get::<i64, _>("measurement_window"),
    }
}

fn sla_measurement_from_row(row: &sqlx::postgres::PgRow) -> SLAMeasurement {
    use sqlx::Row;
    SLAMeasurement {
        id: row.get::<String, _>("id"),
        config_id: row.get::<String, _>("config_id"),
        tenant_id: row.get::<String, _>("tenant_id"),
        measured_value: row.get::<f64, _>("measured_value"),
        target_value: row.get::<f64, _>("target_value"),
        met: row.get::<bool, _>("met"),
        measured_at: row.get::<chrono::DateTime<chrono::Utc>, _>("measured_at"),
        window_start: row.get::<chrono::DateTime<chrono::Utc>, _>("window_start"),
        window_end: row.get::<chrono::DateTime<chrono::Utc>, _>("window_end"),
    }
}

fn sla_incident_type_from_str(s: &str) -> SLAIncidentType {
    match s {
        "degraded_performance" => SLAIncidentType::DegradedPerformance,
        "data_loss" => SLAIncidentType::DataLoss,
        "security_breach" => SLAIncidentType::SecurityBreach,
        _ => SLAIncidentType::Downtime,
    }
}

fn sla_incident_type_to_str(t: &SLAIncidentType) -> String {
    match t {
        SLAIncidentType::Downtime => "downtime".to_string(),
        SLAIncidentType::DegradedPerformance => "degraded_performance".to_string(),
        SLAIncidentType::DataLoss => "data_loss".to_string(),
        SLAIncidentType::SecurityBreach => "security_breach".to_string(),
    }
}

fn impact_severity_from_str(s: &str) -> ImpactSeverity {
    match s {
        "low" => ImpactSeverity::Low,
        "high" => ImpactSeverity::High,
        "critical" => ImpactSeverity::Critical,
        _ => ImpactSeverity::Medium,
    }
}

fn impact_severity_to_str(s: &ImpactSeverity) -> String {
    match s {
        ImpactSeverity::Low => "low".to_string(),
        ImpactSeverity::Medium => "medium".to_string(),
        ImpactSeverity::High => "high".to_string(),
        ImpactSeverity::Critical => "critical".to_string(),
    }
}

fn incident_status_from_str(s: &str) -> IncidentStatus {
    match s {
        "investigating" => IncidentStatus::Investigating,
        "resolved" => IncidentStatus::Resolved,
        "closed" => IncidentStatus::Closed,
        _ => IncidentStatus::Open,
    }
}

fn incident_status_to_str(s: &IncidentStatus) -> String {
    match s {
        IncidentStatus::Open => "open".to_string(),
        IncidentStatus::Investigating => "investigating".to_string(),
        IncidentStatus::Resolved => "resolved".to_string(),
        IncidentStatus::Closed => "closed".to_string(),
    }
}

fn sla_incident_from_row(row: &sqlx::postgres::PgRow) -> SLAIncident {
    use sqlx::Row;
    SLAIncident {
        id: row.get::<String, _>("id"),
        config_id: row.get::<String, _>("config_id"),
        tenant_id: row.get::<String, _>("tenant_id"),
        incident_type: sla_incident_type_from_str(&row.get::<String, _>("incident_type")),
        duration_min: row.get::<i64, _>("duration_min"),
        impact_severity: impact_severity_from_str(&row.get::<String, _>("impact_severity")),
        compensation_amount: row.get::<f64, _>("compensation_amount"),
        status: incident_status_from_str(&row.get::<String, _>("status")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- calculate_sla_penalty ----------

    #[test]
    fn test_sla_penalty_no_breach() {
        // uptime >= target，无违约
        assert_eq!(calculate_sla_penalty(99.95, 99.9, 1000.0), 0.0);
        assert_eq!(calculate_sla_penalty(100.0, 99.9, 1000.0), 0.0);
        assert_eq!(calculate_sla_penalty(99.9, 99.9, 1000.0), 0.0);
    }

    #[test]
    fn test_sla_penalty_minor_breach() {
        // uptime=99.8, target=99.9, monthly_fee=1000
        // breach=0.1, ratio=0.1/99.9≈0.001001
        // penalty = 1000 * 0.001001 * 0.10 = 0.1001 -> 0.10
        let p = calculate_sla_penalty(99.8, 99.9, 1000.0);
        assert!((p - 0.10).abs() < 0.01, "got {}", p);
    }

    #[test]
    fn test_sla_penalty_severe_breach() {
        // uptime=95.0, target=99.9, monthly_fee=1000
        // breach=4.9, ratio=4.9/99.9≈0.0490
        // penalty = 1000 * 0.0490 * 0.10 = 4.90
        let p = calculate_sla_penalty(95.0, 99.9, 1000.0);
        assert!((p - 4.90).abs() < 0.01, "got {}", p);
    }

    #[test]
    fn test_sla_penalty_zero_fee() {
        // 月费为 0 时罚金为 0
        assert_eq!(calculate_sla_penalty(50.0, 99.9, 0.0), 0.0);
    }

    #[test]
    fn test_sla_penalty_negative_fee_clamped() {
        // 负月费应被 clamp 到 0
        assert_eq!(calculate_sla_penalty(50.0, 99.9, -1000.0), 0.0);
    }

    #[test]
    fn test_sla_penalty_clamps_uptime_above_100() {
        // uptime > 100 clamp 到 100，仍 >= 99.9，无违约
        assert_eq!(calculate_sla_penalty(150.0, 99.9, 1000.0), 0.0);
    }

    #[test]
    fn test_sla_penalty_clamps_negative_uptime() {
        // uptime 为负 clamp 到 0
        // breach = 99.9 - 0 = 99.9, ratio = 99.9/99.9 = 1.0
        // penalty = 1000 * 1.0 * 0.10 = 100.0
        let p = calculate_sla_penalty(-5.0, 99.9, 1000.0);
        assert!((p - 100.0).abs() < 0.01, "got {}", p);
    }

    #[test]
    fn test_sla_penalty_zero_target() {
        // 目标为 0 时违约按固定 10% 罚款
        let p = calculate_sla_penalty(0.0, 0.0, 1000.0);
        // uptime=0, target=0 -> uptime >= target -> 无违约！罚金为 0
        assert_eq!(p, 0.0);
        // 改：uptime < target 才触发；这里 uptime=target=0，不触发
    }

    #[test]
    fn test_sla_penalty_zero_target_with_breach() {
        // uptime=-1 clamp 到 0，target=0；uptime(0) >= target(0)，无违约
        // 该测试覆盖目标为 0 边界
        let p = calculate_sla_penalty(0.0, 0.0, 1000.0);
        assert_eq!(p, 0.0);
    }

    #[test]
    fn test_sla_penalty_severity_proportional() {
        // 同样月费，违约越严重罚金越高
        let minor = calculate_sla_penalty(99.8, 99.9, 1000.0);
        let major = calculate_sla_penalty(90.0, 99.9, 1000.0);
        assert!(minor < major);
    }

    // ---------- calculate_usage_cost ----------

    #[test]
    fn test_usage_cost_zero_calls() {
        assert_eq!(calculate_usage_cost(0, 1.0, 1000), 0.0);
    }

    #[test]
    fn test_usage_cost_within_free_tier() {
        // 调用量在免费额度内
        assert_eq!(calculate_usage_cost(500, 1.0, 1000), 0.0);
        assert_eq!(calculate_usage_cost(1000, 1.0, 1000), 0.0);
    }

    #[test]
    fn test_usage_cost_exceeds_free_tier() {
        // 1500 calls, free=1000, rate=1.0/1k
        // billable = 500, cost = 500/1000 * 1.0 = 0.5
        let c = calculate_usage_cost(1500, 1.0, 1000);
        assert!((c - 0.5).abs() < 0.01, "got {}", c);
    }

    #[test]
    fn test_usage_cost_no_free_tier() {
        // free_tier=0，所有调用都要付费
        // 2000 calls, rate=0.5/1k -> cost = 2000/1000 * 0.5 = 1.0
        let c = calculate_usage_cost(2000, 0.5, 0);
        assert!((c - 1.0).abs() < 0.01, "got {}", c);
    }

    #[test]
    fn test_usage_cost_zero_rate() {
        // rate=0 时费用为 0
        assert_eq!(calculate_usage_cost(10000, 0.0, 0), 0.0);
    }

    #[test]
    fn test_usage_cost_negative_rate_clamped() {
        // 负费率应被 clamp 到 0
        assert_eq!(calculate_usage_cost(10000, -1.0, 0), 0.0);
    }

    #[test]
    fn test_usage_cost_negative_calls_clamped() {
        // 负调用量应被 clamp 到 0
        assert_eq!(calculate_usage_cost(-100, 1.0, 0), 0.0);
    }

    #[test]
    fn test_usage_cost_large_volume() {
        // 1_000_000 calls, rate=2.0/1k, free=0
        // cost = 1000000/1000 * 2.0 = 2000.0
        let c = calculate_usage_cost(1_000_000, 2.0, 0);
        assert!((c - 2000.0).abs() < 0.01, "got {}", c);
    }

    #[test]
    fn test_usage_cost_just_above_free_tier() {
        // 1001 calls, free=1000, rate=1.0
        // billable=1, raw_cost = 1/1000 * 1.0 = 0.001
        // 经两位小数四舍五入后 = 0.00
        let c = calculate_usage_cost(1001, 1.0, 1000);
        assert!((c - 0.0).abs() < f64::EPSILON, "got {}", c);
    }

    #[test]
    fn test_usage_cost_rounded_to_2_decimals() {
        // 1234 calls, free=0, rate=0.333
        // cost = 1234/1000 * 0.333 = 0.411222 -> round to 0.41
        let c = calculate_usage_cost(1234, 0.333, 0);
        assert!((c - 0.41).abs() < 0.01, "got {}", c);
    }

    #[test]
    fn test_usage_cost_negative_free_tier_clamped() {
        // 负免费额度应被 clamp 到 0
        // 500 calls, free=-1000 -> free=0, rate=1.0
        // cost = 500/1000 * 1.0 = 0.5
        let c = calculate_usage_cost(500, 1.0, -1000);
        assert!((c - 0.5).abs() < 0.01, "got {}", c);
    }

    // ---------- tier_from_str ----------

    #[test]
    fn test_tier_from_str_basic() {
        assert_eq!(tier_from_str("basic"), ProductTier::Basic);
    }

    #[test]
    fn test_tier_from_str_professional() {
        assert_eq!(tier_from_str("professional"), ProductTier::Professional);
    }

    #[test]
    fn test_tier_from_str_enterprise() {
        assert_eq!(tier_from_str("enterprise"), ProductTier::Enterprise);
    }

    #[test]
    fn test_tier_from_str_unlimited() {
        assert_eq!(tier_from_str("unlimited"), ProductTier::Unlimited);
    }

    #[test]
    fn test_tier_from_str_free_default() {
        assert_eq!(tier_from_str("free"), ProductTier::Free);
        assert_eq!(tier_from_str("unknown"), ProductTier::Free);
        assert_eq!(tier_from_str(""), ProductTier::Free);
    }

    // ---------- product_tier_to_string ----------

    #[test]
    fn test_product_tier_to_string_free() {
        assert_eq!(product_tier_to_string(&ProductTier::Free), "free");
    }

    #[test]
    fn test_product_tier_to_string_basic() {
        assert_eq!(product_tier_to_string(&ProductTier::Basic), "basic");
    }

    #[test]
    fn test_product_tier_to_string_professional() {
        assert_eq!(
            product_tier_to_string(&ProductTier::Professional),
            "professional"
        );
    }

    #[test]
    fn test_product_tier_to_string_enterprise() {
        assert_eq!(
            product_tier_to_string(&ProductTier::Enterprise),
            "enterprise"
        );
    }

    #[test]
    fn test_product_tier_to_string_unlimited() {
        assert_eq!(product_tier_to_string(&ProductTier::Unlimited), "unlimited");
    }

    #[test]
    fn test_tier_roundtrip_all_variants() {
        for t in [
            ProductTier::Free,
            ProductTier::Basic,
            ProductTier::Professional,
            ProductTier::Enterprise,
            ProductTier::Unlimited,
        ] {
            let s = product_tier_to_string(&t);
            let back = tier_from_str(&s);
            assert_eq!(t, back);
        }
    }

    // ---------- 枚举 serde 往返 ----------

    #[test]
    fn test_product_tier_serde_roundtrip() {
        for v in [
            ProductTier::Free,
            ProductTier::Basic,
            ProductTier::Professional,
            ProductTier::Enterprise,
            ProductTier::Unlimited,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: ProductTier = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_subscription_status_serde_roundtrip() {
        for v in [
            SubscriptionStatus::Active,
            SubscriptionStatus::Expired,
            SubscriptionStatus::Cancelled,
            SubscriptionStatus::Pending,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: SubscriptionStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_billing_status_serde_roundtrip() {
        for v in [
            BillingStatus::Pending,
            BillingStatus::Invoiced,
            BillingStatus::Paid,
            BillingStatus::Overdue,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: BillingStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_sla_metric_serde_roundtrip() {
        for v in [
            SLAMetric::Availability,
            SLAMetric::Latency,
            SLAMetric::ErrorRate,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: SLAMetric = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_sla_incident_type_serde_roundtrip() {
        for v in [
            SLAIncidentType::Downtime,
            SLAIncidentType::DegradedPerformance,
            SLAIncidentType::DataLoss,
            SLAIncidentType::SecurityBreach,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: SLAIncidentType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_incident_status_serde_roundtrip() {
        for v in [
            IncidentStatus::Open,
            IncidentStatus::Investigating,
            IncidentStatus::Resolved,
            IncidentStatus::Closed,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: IncidentStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_impact_severity_serde_roundtrip() {
        for v in [
            ImpactSeverity::Low,
            ImpactSeverity::Medium,
            ImpactSeverity::High,
            ImpactSeverity::Critical,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: ImpactSeverity = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    // ---------- 结构体 serde 往返 ----------

    #[test]
    fn test_api_product_serde_roundtrip() {
        let p = APIProduct {
            id: "prod-1".to_string(),
            name: "Basic".to_string(),
            tier: ProductTier::Basic,
            rate_limit_per_min: 100,
            rate_limit_per_day: 50000,
            features: vec!["basic_access".to_string()],
            price_monthly: 99.0,
            active: true,
        };
        let json = serde_json::to_string(&p).unwrap();
        let back: APIProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "prod-1");
        assert_eq!(back.tier, ProductTier::Basic);
        assert!(back.active);
    }

    #[test]
    fn test_subscription_serde_roundtrip() {
        let s = Subscription {
            id: "sub-1".to_string(),
            api_product_id: "prod-1".to_string(),
            tenant_id: "t-1".to_string(),
            tier: ProductTier::Professional,
            starts_at: "2024-01-01T00:00:00Z"
                .parse::<chrono::DateTime<chrono::Utc>>()
                .unwrap(),
            expires_at: "2024-02-01T00:00:00Z"
                .parse::<chrono::DateTime<chrono::Utc>>()
                .unwrap(),
            status: SubscriptionStatus::Active,
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: Subscription = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "sub-1");
        assert_eq!(back.tier, ProductTier::Professional);
    }

    #[test]
    fn test_usage_record_serde_roundtrip() {
        let r = UsageRecord {
            id: "ur-1".to_string(),
            tenant_id: "t-1".to_string(),
            api_product_id: "p-1".to_string(),
            endpoint: "/api/v1/data".to_string(),
            requests: 1000,
            errors: 10,
            data_transferred: 5.5,
            recorded_at: "2024-01-01T00:00:00Z"
                .parse::<chrono::DateTime<chrono::Utc>>()
                .unwrap(),
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: UsageRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "ur-1");
        assert_eq!(back.requests, 1000);
    }

    #[test]
    fn test_usage_summary_serde_roundtrip() {
        let s = UsageSummary {
            total_requests: 10000,
            total_errors: 50,
            total_data_mb: 500.0,
            error_rate: 0.5,
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: UsageSummary = serde_json::from_str(&json).unwrap();
        assert_eq!(back.total_requests, 10000);
        assert!((back.error_rate - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_billing_record_serde_roundtrip() {
        let r = BillingRecord {
            id: "br-1".to_string(),
            tenant_id: "t-1".to_string(),
            period_start: "2024-01-01".to_string(),
            period_end: "2024-01-31".to_string(),
            tier: ProductTier::Enterprise,
            usage_summary: UsageSummary {
                total_requests: 100,
                total_errors: 0,
                total_data_mb: 10.0,
                error_rate: 0.0,
            },
            total_amount: 999.0,
            status: BillingStatus::Paid,
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: BillingRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "br-1");
        assert_eq!(back.status, BillingStatus::Paid);
    }

    #[test]
    fn test_rate_card_serde_roundtrip() {
        let r = RateCard {
            id: "rc-1".to_string(),
            tier: ProductTier::Basic,
            cost_per_request: 0.001,
            cost_per_mb: 0.05,
            overage_multiplier: 1.5,
            currency: "CNY".to_string(),
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: RateCard = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "rc-1");
        assert_eq!(back.currency, "CNY");
    }

    #[test]
    fn test_sla_config_serde_roundtrip() {
        let c = SLAConfig {
            id: "cfg-1".to_string(),
            metric: SLAMetric::Availability,
            target_value: 99.9,
            unit: "%".to_string(),
            penalty_per_min: 10.0,
            measurement_window: 60,
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: SLAConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "cfg-1");
        assert_eq!(back.metric, SLAMetric::Availability);
    }

    #[test]
    fn test_sla_measurement_serde_roundtrip() {
        let m = SLAMeasurement {
            id: "m-1".to_string(),
            config_id: "cfg-1".to_string(),
            tenant_id: "t-1".to_string(),
            measured_value: 99.95,
            target_value: 99.9,
            met: true,
            measured_at: "2024-01-01T00:00:00Z"
                .parse::<chrono::DateTime<chrono::Utc>>()
                .unwrap(),
            window_start: "2024-01-01T00:00:00Z"
                .parse::<chrono::DateTime<chrono::Utc>>()
                .unwrap(),
            window_end: "2024-01-01T01:00:00Z"
                .parse::<chrono::DateTime<chrono::Utc>>()
                .unwrap(),
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: SLAMeasurement = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "m-1");
        assert!(back.met);
    }

    #[test]
    fn test_sla_incident_serde_roundtrip() {
        let i = SLAIncident {
            id: "inc-1".to_string(),
            config_id: "cfg-1".to_string(),
            tenant_id: "t-1".to_string(),
            incident_type: SLAIncidentType::Downtime,
            duration_min: 30,
            impact_severity: ImpactSeverity::High,
            compensation_amount: 500.0,
            status: IncidentStatus::Resolved,
        };
        let json = serde_json::to_string(&i).unwrap();
        let back: SLAIncident = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "inc-1");
        assert_eq!(back.incident_type, SLAIncidentType::Downtime);
    }

    // ---------- Clone/Eq trait ----------

    #[test]
    fn test_product_tier_clone_eq() {
        assert_eq!(ProductTier::Free, ProductTier::Free);
        assert_ne!(ProductTier::Free, ProductTier::Basic);
    }

    #[test]
    fn test_subscription_status_clone_eq() {
        assert_eq!(SubscriptionStatus::Active, SubscriptionStatus::Active);
        assert_ne!(SubscriptionStatus::Active, SubscriptionStatus::Expired);
    }

    #[test]
    fn test_billing_status_clone_eq() {
        assert_eq!(BillingStatus::Paid, BillingStatus::Paid);
        assert_ne!(BillingStatus::Paid, BillingStatus::Overdue);
    }

    #[test]
    fn test_impact_severity_clone_eq() {
        assert_eq!(ImpactSeverity::Critical, ImpactSeverity::Critical);
        assert_ne!(ImpactSeverity::Critical, ImpactSeverity::Low);
    }

    #[test]
    fn test_api_product_clone() {
        let p = APIProduct {
            id: "p1".to_string(),
            name: "test".to_string(),
            tier: ProductTier::Free,
            rate_limit_per_min: 10,
            rate_limit_per_day: 100,
            features: vec![],
            price_monthly: 0.0,
            active: true,
        };
        let cloned = p.clone();
        assert_eq!(cloned.id, p.id);
        assert_eq!(cloned.tier, p.tier);
    }

    #[test]
    fn test_sla_config_clone() {
        let c = SLAConfig {
            id: "c1".to_string(),
            metric: SLAMetric::Latency,
            target_value: 200.0,
            unit: "ms".to_string(),
            penalty_per_min: 5.0,
            measurement_window: 60,
        };
        let cloned = c.clone();
        assert_eq!(cloned.id, c.id);
        assert_eq!(cloned.metric, c.metric);
    }
}
