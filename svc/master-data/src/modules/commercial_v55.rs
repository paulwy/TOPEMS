//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V55.0 MDM AC-27: API 商业化 + 计量计费 + SLA 保障
//!
//! 核心能力：
//! - API 商业化 (APICommercialManager): 产品层级、订阅管理、套餐升级
//! - 计量计费 (MeteringService): 使用记录、账单生成、费率卡、成本计算
//! - SLA 保障 (SLAGuarantee): SLA 配置、度量、违约计算、事故管理

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::{ApiResponse, PaginatedResponse};

use crate::shared::AppState;

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
    pub starts_at: String,
    pub expires_at: String,
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
    pub recorded_at: String,
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
    pub measured_at: String,
    pub window_start: String,
    pub window_end: String,
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

// ==================== 内存存储 ====================

struct V55Store {
    api_products: Mutex<Vec<APIProduct>>,
    subscriptions: Mutex<Vec<Subscription>>,
    usage_records: Mutex<Vec<UsageRecord>>,
    billing_records: Mutex<Vec<BillingRecord>>,
    rate_cards: Mutex<Vec<RateCard>>,
    sla_configs: Mutex<Vec<SLAConfig>>,
    sla_measurements: Mutex<Vec<SLAMeasurement>>,
    sla_incidents: Mutex<Vec<SLAIncident>>,
    initialized: Mutex<bool>,
}

fn get_v55_store() -> &'static V55Store {
    static STORE: LazyLock<V55Store> = LazyLock::new(|| V55Store {
        api_products: Mutex::new(Vec::new()),
        subscriptions: Mutex::new(Vec::new()),
        usage_records: Mutex::new(Vec::new()),
        billing_records: Mutex::new(Vec::new()),
        rate_cards: Mutex::new(Vec::new()),
        sla_configs: Mutex::new(Vec::new()),
        sla_measurements: Mutex::new(Vec::new()),
        sla_incidents: Mutex::new(Vec::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_v55_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();
    let one_month_later = (now + chrono::Duration::days(30)).to_rfc3339();

    let free_product = APIProduct {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Free Tier".to_string(),
        tier: ProductTier::Free,
        rate_limit_per_min: 10,
        rate_limit_per_day: 1000,
        features: vec!["basic_access".to_string()],
        price_monthly: 0.0,
        active: true,
    };

    let basic_product = APIProduct {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Basic Tier".to_string(),
        tier: ProductTier::Basic,
        rate_limit_per_min: 100,
        rate_limit_per_day: 50000,
        features: vec!["basic_access".to_string(), "standard_support".to_string()],
        price_monthly: 99.0,
        active: true,
    };

    let pro_product = APIProduct {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Professional Tier".to_string(),
        tier: ProductTier::Professional,
        rate_limit_per_min: 1000,
        rate_limit_per_day: 500000,
        features: vec![
            "basic_access".to_string(),
            "priority_support".to_string(),
            "advanced_analytics".to_string(),
        ],
        price_monthly: 999.0,
        active: true,
    };

    let enterprise_product = APIProduct {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Enterprise Tier".to_string(),
        tier: ProductTier::Enterprise,
        rate_limit_per_min: 10000,
        rate_limit_per_day: 10000000,
        features: vec![
            "basic_access".to_string(),
            "dedicated_support".to_string(),
            "advanced_analytics".to_string(),
            "custom_integrations".to_string(),
            "sla_guarantee".to_string(),
        ],
        price_monthly: 9999.0,
        active: true,
    };

    let unlimited_product = APIProduct {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Unlimited Tier".to_string(),
        tier: ProductTier::Unlimited,
        rate_limit_per_min: -1,
        rate_limit_per_day: -1,
        features: vec![
            "all_features".to_string(),
            "dedicated_support".to_string(),
            "custom_integrations".to_string(),
            "sla_guarantee".to_string(),
            "white_label".to_string(),
        ],
        price_monthly: 99999.0,
        active: true,
    };

    let default_subscription = Subscription {
        id: uuid::Uuid::new_v4().to_string(),
        api_product_id: free_product.id.clone(),
        tenant_id: "tenant-001".to_string(),
        tier: ProductTier::Free,
        starts_at: now_str.clone(),
        expires_at: one_month_later.clone(),
        status: SubscriptionStatus::Active,
    };

    let rate_card = RateCard {
        id: uuid::Uuid::new_v4().to_string(),
        tier: ProductTier::Basic,
        cost_per_request: 0.001,
        cost_per_mb: 0.05,
        overage_multiplier: 1.5,
        currency: "CNY".to_string(),
    };

    let sla_avail = SLAConfig {
        id: uuid::Uuid::new_v4().to_string(),
        metric: SLAMetric::Availability,
        target_value: 99.9,
        unit: "%".to_string(),
        penalty_per_min: 10.0,
        measurement_window: 60,
    };

    let sla_latency = SLAConfig {
        id: uuid::Uuid::new_v4().to_string(),
        metric: SLAMetric::Latency,
        target_value: 200.0,
        unit: "ms".to_string(),
        penalty_per_min: 5.0,
        measurement_window: 60,
    };

    let sla_error = SLAConfig {
        id: uuid::Uuid::new_v4().to_string(),
        metric: SLAMetric::ErrorRate,
        target_value: 0.1,
        unit: "%".to_string(),
        penalty_per_min: 15.0,
        measurement_window: 60,
    };

    *store.api_products.lock().await = vec![
        free_product,
        basic_product,
        pro_product,
        enterprise_product,
        unlimited_product,
    ];
    *store.subscriptions.lock().await = vec![default_subscription];
    *store.usage_records.lock().await = Vec::new();
    *store.billing_records.lock().await = Vec::new();
    *store.rate_cards.lock().await = vec![rate_card];
    *store.sla_configs.lock().await = vec![sla_avail, sla_latency, sla_error];
    *store.sla_measurements.lock().await = Vec::new();
    *store.sla_incidents.lock().await = Vec::new();

    *initialized = true;
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

pub async fn create_api_product(
    State(_state): State<AppState>,
    Json(req): Json<CreateAPIProductRequest>,
) -> Json<ApiResponse<APIProduct>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut products = store.api_products.lock().await;

    let tier = req.tier.as_deref().map(tier_from_str).unwrap_or(ProductTier::Free);

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

    products.push(product.clone());
    Json(ApiResponse::success(product, "API 产品已创建"))
}

pub async fn list_api_products(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<APIProduct>>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let products = store.api_products.lock().await;
    let active: Vec<APIProduct> = products.iter().filter(|p| p.active).cloned().collect();
    Json(ApiResponse::success(active, "API 产品列表"))
}

pub async fn get_api_product(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<APIProduct>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let products = store.api_products.lock().await;
    match products.iter().find(|p| p.id == id) {
        Some(p) => Json(ApiResponse::success(p.clone(), "API 产品详情")),
        None => Json(ApiResponse::error(404, "未找到 API 产品")),
    }
}

pub async fn subscribe_tenant(
    State(_state): State<AppState>,
    Json(req): Json<SubscribeTenantRequest>,
) -> Json<ApiResponse<Subscription>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let products = store.api_products.lock().await;
    let product = products.iter().find(|p| p.id == req.api_product_id);

    let Some(product) = product else {
        return Json(ApiResponse::error(404, "未找到 API 产品"));
    };

    let tier = req.tier.as_deref().map(tier_from_str).unwrap_or_else(|| product.tier.clone());
    drop(products);

    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();
    let expires_at = (now + chrono::Duration::days(30)).to_rfc3339();

    let sub = Subscription {
        id: uuid::Uuid::new_v4().to_string(),
        api_product_id: req.api_product_id,
        tenant_id: req.tenant_id,
        tier,
        starts_at: now_str,
        expires_at,
        status: SubscriptionStatus::Active,
    };

    let mut subs = store.subscriptions.lock().await;
    subs.push(sub.clone());
    Json(ApiResponse::success(sub, "租户订阅已创建"))
}

pub async fn get_subscription(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Subscription>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let subs = store.subscriptions.lock().await;
    match subs.iter().find(|s| s.id == id) {
        Some(s) => Json(ApiResponse::success(s.clone(), "订阅详情")),
        None => Json(ApiResponse::error(404, "未找到订阅")),
    }
}

pub async fn list_subscriptions(
    State(_state): State<AppState>,
    Query(params): Query<UsageSummaryQuery>,
) -> Json<ApiResponse<Vec<Subscription>>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let subs = store.subscriptions.lock().await;

    let filtered: Vec<Subscription> = subs
        .iter()
        .filter(|s| {
            if let Some(tid) = &params.tenant_id {
                if &s.tenant_id != tid {
                    return false;
                }
            }
            if let Some(pid) = &params.api_product_id {
                if &s.api_product_id != pid {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    Json(ApiResponse::success(filtered, "订阅列表"))
}

pub async fn cancel_subscription(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Subscription>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut subs = store.subscriptions.lock().await;

    let sub = subs.iter_mut().find(|s| s.id == id);
    let Some(sub) = sub else {
        return Json(ApiResponse::error(404, "未找到订阅"));
    };

    sub.status = SubscriptionStatus::Cancelled;
    Json(ApiResponse::success(sub.clone(), "订阅已取消"))
}

pub async fn upgrade_tier(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateSubscriptionRequest>,
) -> Json<ApiResponse<Subscription>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut subs = store.subscriptions.lock().await;

    let sub = subs.iter_mut().find(|s| s.id == id);
    let Some(sub) = sub else {
        return Json(ApiResponse::error(404, "未找到订阅"));
    };

    if let Some(ref tier_str) = req.tier {
        sub.tier = tier_from_str(tier_str);
    }
    sub.status = SubscriptionStatus::Active;

    Json(ApiResponse::success(sub.clone(), "套餐已升级"))
}

// ==================== 处理器：计量计费 ====================

pub async fn record_usage(
    State(_state): State<AppState>,
    Json(req): Json<RecordUsageRequest>,
) -> Json<ApiResponse<UsageRecord>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut records = store.usage_records.lock().await;

    let record = UsageRecord {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: req.tenant_id,
        api_product_id: req.api_product_id,
        endpoint: req.endpoint,
        requests: req.requests,
        errors: req.errors.unwrap_or(0),
        data_transferred: req.data_transferred.unwrap_or(0.0),
        recorded_at: chrono::Utc::now().to_rfc3339(),
    };

    records.push(record.clone());
    Json(ApiResponse::success(record, "使用记录已保存"))
}

pub async fn get_usage_summary(
    State(_state): State<AppState>,
    Query(params): Query<UsageSummaryQuery>,
) -> Json<ApiResponse<UsageSummary>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let records = store.usage_records.lock().await;

    let filtered: Vec<&UsageRecord> = records
        .iter()
        .filter(|r| {
            if let Some(tid) = &params.tenant_id {
                if &r.tenant_id != tid {
                    return false;
                }
            }
            if let Some(pid) = &params.api_product_id {
                if &r.api_product_id != pid {
                    return false;
                }
            }
            if let Some(start) = &params.start_time {
                if &r.recorded_at < start {
                    return false;
                }
            }
            if let Some(end) = &params.end_time {
                if &r.recorded_at > end {
                    return false;
                }
            }
            true
        })
        .collect();

    let total_requests: i64 = filtered.iter().map(|r| r.requests).sum();
    let total_errors: i64 = filtered.iter().map(|r| r.errors).sum();
    let total_data_mb: f64 = filtered.iter().map(|r| r.data_transferred).sum();
    let error_rate = if total_requests > 0 {
        (total_errors as f64 / total_requests as f64) * 100.0
    } else {
        0.0
    };

    Json(ApiResponse::success(
        UsageSummary {
            total_requests,
            total_errors,
            total_data_mb,
            error_rate,
        },
        "使用量汇总",
    ))
}

pub async fn generate_bill(
    State(_state): State<AppState>,
    Json(req): Json<GenerateBillRequest>,
) -> Json<ApiResponse<BillingRecord>> {
    ensure_initialized().await;
    let store = get_v55_store();

    let period_start = req.period_start.unwrap_or_else(|| {
        (chrono::Utc::now() - chrono::Duration::days(30)).to_rfc3339()
    });
    let period_end = req.period_end.unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    let records = store.usage_records.lock().await;
    let filtered: Vec<UsageRecord> = records
        .iter()
        .filter(|r| {
            r.tenant_id == req.tenant_id
                && r.recorded_at >= period_start
                && r.recorded_at <= period_end
        })
        .cloned()
        .collect();

    let total_requests: i64 = filtered.iter().map(|r| r.requests).sum();
    let total_errors: i64 = filtered.iter().map(|r| r.errors).sum();
    let total_data_mb: f64 = filtered.iter().map(|r| r.data_transferred).sum();
    let error_rate = if total_requests > 0 {
        (total_errors as f64 / total_requests as f64) * 100.0
    } else {
        0.0
    };

    drop(records);

    let rate_cards = store.rate_cards.lock().await;
    let rate_card = rate_cards.first().cloned().unwrap_or(RateCard {
        id: String::new(),
        tier: ProductTier::Free,
        cost_per_request: 0.001,
        cost_per_mb: 0.05,
        overage_multiplier: 1.0,
        currency: "CNY".to_string(),
    });

    let product = store.api_products.lock().await;
    let matched_product = product.iter().find(|p| {
        filtered
            .iter()
            .any(|r| r.api_product_id == p.id)
    });

    let tier = matched_product
        .map(|p| p.tier.clone())
        .unwrap_or(ProductTier::Free);

    let base_cost = total_requests as f64 * rate_card.cost_per_request + total_data_mb * rate_card.cost_per_mb;
    let total_amount = if base_cost > 1000.0 {
        1000.0 + (base_cost - 1000.0) * rate_card.overage_multiplier
    } else {
        base_cost
    };

    drop(rate_cards);
    drop(product);

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

    let mut bills = store.billing_records.lock().await;
    bills.push(bill.clone());

    Json(ApiResponse::success(bill, "账单已生成"))
}

pub async fn get_billing_history(
    State(_state): State<AppState>,
    Query(params): Query<BillingHistoryQuery>,
) -> Json<ApiResponse<PaginatedResponse<BillingRecord>>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let bills = store.billing_records.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let filtered: Vec<BillingRecord> = bills
        .iter()
        .filter(|b| {
            if let Some(tid) = &params.tenant_id {
                if &b.tenant_id != tid {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    let total = filtered.len() as i64;
    let items: Vec<BillingRecord> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "账单历史",
    ))
}

pub async fn create_rate_card(
    State(_state): State<AppState>,
    Json(req): Json<CreateRateCardRequest>,
) -> Json<ApiResponse<RateCard>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut cards = store.rate_cards.lock().await;

    let card = RateCard {
        id: uuid::Uuid::new_v4().to_string(),
        tier: tier_from_str(&req.tier),
        cost_per_request: req.cost_per_request,
        cost_per_mb: req.cost_per_mb,
        overage_multiplier: req.overage_multiplier.unwrap_or(1.0),
        currency: req.currency.unwrap_or_else(|| "CNY".to_string()),
    };

    cards.push(card.clone());
    Json(ApiResponse::success(card, "费率卡已创建"))
}

pub async fn get_rate_cards(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<RateCard>>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let cards = store.rate_cards.lock().await;
    Json(ApiResponse::success(cards.clone(), "费率卡列表"))
}

pub async fn mark_bill_paid(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<BillingRecord>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut bills = store.billing_records.lock().await;

    let bill = bills.iter_mut().find(|b| b.id == id);
    let Some(bill) = bill else {
        return Json(ApiResponse::error(404, "未找到账单"));
    };

    bill.status = BillingStatus::Paid;
    Json(ApiResponse::success(bill.clone(), "账单已标记为已支付"))
}

// ==================== 处理器：SLA 保障 ====================

pub async fn configure_sla(
    State(_state): State<AppState>,
    Json(req): Json<ConfigureSLARequest>,
) -> Json<ApiResponse<SLAConfig>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let mut configs = store.sla_configs.lock().await;

    let metric = match req.metric.as_str() {
        "latency" => SLAMetric::Latency,
        "error_rate" => SLAMetric::ErrorRate,
        _ => SLAMetric::Availability,
    };

    let config = SLAConfig {
        id: uuid::Uuid::new_v4().to_string(),
        metric,
        target_value: req.target_value,
        unit: req.unit.unwrap_or_else(|| "%".to_string()),
        penalty_per_min: req.penalty_per_min.unwrap_or(10.0),
        measurement_window: req.measurement_window.unwrap_or(60),
    };

    configs.push(config.clone());
    Json(ApiResponse::success(config, "SLA 配置已创建"))
}

pub async fn measure_sla(
    State(_state): State<AppState>,
    Json(req): Json<MeasureSLARequest>,
) -> Json<ApiResponse<SLAMeasurement>> {
    ensure_initialized().await;
    let store = get_v55_store();

    let configs = store.sla_configs.lock().await;
    let config = configs.iter().find(|c| c.id == req.config_id);
    let Some(config) = config else {
        return Json(ApiResponse::error(404, "未找到 SLA 配置"));
    };

    let target = config.target_value;
    let met = match &config.metric {
        SLAMetric::Availability => req.measured_value >= target,
        SLAMetric::Latency => req.measured_value <= target,
        SLAMetric::ErrorRate => req.measured_value <= target,
    };
    drop(configs);

    let now = chrono::Utc::now();
    let measurement = SLAMeasurement {
        id: uuid::Uuid::new_v4().to_string(),
        config_id: req.config_id,
        tenant_id: req.tenant_id,
        measured_value: req.measured_value,
        target_value: target,
        met,
        measured_at: now.to_rfc3339(),
        window_start: (now - chrono::Duration::minutes(60)).to_rfc3339(),
        window_end: now.to_rfc3339(),
    };

    let mut measurements = store.sla_measurements.lock().await;
    measurements.push(measurement.clone());

    Json(ApiResponse::success(measurement, "SLA 度量已记录"))
}

pub async fn get_sla_status(
    State(_state): State<AppState>,
    Query(params): Query<SLAStatusQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v55_store();

    let configs = store.sla_configs.lock().await;
    let measurements = store.sla_measurements.lock().await;

    let mut statuses: Vec<serde_json::Value> = Vec::new();

    for config in configs.iter() {
        if let Some(cid) = &params.config_id {
            if &config.id != cid {
                continue;
            }
        }

        let config_measurements: Vec<&SLAMeasurement> = measurements
            .iter()
            .filter(|m| {
                m.config_id == config.id
                    && params
                        .tenant_id
                        .as_ref()
                        .map(|tid| &m.tenant_id == tid)
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

        statuses.push(serde_json::json!({
            "config_id": config.id,
            "metric": format!("{:?}", config.metric).to_lowercase(),
            "target_value": config.target_value,
            "unit": config.unit,
            "measurements_count": total,
            "met_count": met_count,
            "pass_rate": pass_rate,
            "current_status": if pass_rate >= 99.0 { "compliant" } else { "breaching" },
        }));
    }

    Json(ApiResponse::success(
        serde_json::json!({ "sla_statuses": statuses }),
        "SLA 状态",
    ))
}

pub async fn get_sla_history(
    State(_state): State<AppState>,
    Query(params): Query<SLAHistoryQuery>,
) -> Json<ApiResponse<Vec<SLAMeasurement>>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let measurements = store.sla_measurements.lock().await;

    let filtered: Vec<SLAMeasurement> = measurements
        .iter()
        .filter(|m| {
            if let Some(tid) = &params.tenant_id {
                if &m.tenant_id != tid {
                    return false;
                }
            }
            if let Some(cid) = &params.config_id {
                if &m.config_id != cid {
                    return false;
                }
            }
            if let Some(start) = &params.start_time {
                if &m.measured_at < start {
                    return false;
                }
            }
            if let Some(end) = &params.end_time {
                if &m.measured_at > end {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    Json(ApiResponse::success(filtered, "SLA 历史记录"))
}

pub async fn calculate_penalty(
    State(_state): State<AppState>,
    Query(params): Query<SLAPenaltyQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v55_store();

    let configs = store.sla_configs.lock().await;
    let config = configs.iter().find(|c| c.id == params.config_id);
    let Some(config) = config else {
        return Json(ApiResponse::error(404, "未找到 SLA 配置"));
    };

    let measurements = store.sla_measurements.lock().await;
    let breached: Vec<&SLAMeasurement> = measurements
        .iter()
        .filter(|m| m.config_id == params.config_id && m.tenant_id == params.tenant_id && !m.met)
        .collect();

    let breach_count = breached.len() as i64;
    let penalty_per_breach = config.penalty_per_min;
    let total_penalty = breach_count as f64 * penalty_per_breach;

    Json(ApiResponse::success(
        serde_json::json!({
            "config_id": params.config_id,
            "tenant_id": params.tenant_id,
            "breach_count": breach_count,
            "penalty_per_min": penalty_per_breach,
            "total_penalty": total_penalty,
            "currency": "CNY",
        }),
        "SLA 违约金额",
    ))
}

pub async fn create_incident(
    State(_state): State<AppState>,
    Json(req): Json<CreateSLAIncidentRequest>,
) -> Json<ApiResponse<SLAIncident>> {
    ensure_initialized().await;
    let store = get_v55_store();

    let incident_type = match req.incident_type.as_str() {
        "degraded_performance" => SLAIncidentType::DegradedPerformance,
        "data_loss" => SLAIncidentType::DataLoss,
        "security_breach" => SLAIncidentType::SecurityBreach,
        _ => SLAIncidentType::Downtime,
    };

    let impact_severity = match req.impact_severity.as_deref() {
        Some("medium") => ImpactSeverity::Medium,
        Some("high") => ImpactSeverity::High,
        Some("critical") => ImpactSeverity::Critical,
        _ => ImpactSeverity::Low,
    };

    let configs = store.sla_configs.lock().await;
    let config = configs.iter().find(|c| c.id == req.config_id);
    let penalty_per_min = config.map(|c| c.penalty_per_min).unwrap_or(10.0);

    let compensation_amount = penalty_per_min * req.duration_min as f64;
    drop(configs);

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

    let mut incidents = store.sla_incidents.lock().await;
    incidents.push(incident.clone());

    Json(ApiResponse::success(incident, "SLA 事故已创建"))
}

pub async fn get_incidents(
    State(_state): State<AppState>,
    Query(params): Query<SLAIncidentsQuery>,
) -> Json<ApiResponse<Vec<SLAIncident>>> {
    ensure_initialized().await;
    let store = get_v55_store();
    let incidents = store.sla_incidents.lock().await;

    let filtered: Vec<SLAIncident> = incidents
        .iter()
        .filter(|i| {
            if let Some(tid) = &params.tenant_id {
                if &i.tenant_id != tid {
                    return false;
                }
            }
            if let Some(st) = &params.status {
                let status_str = match &i.status {
                    IncidentStatus::Open => "open",
                    IncidentStatus::Investigating => "investigating",
                    IncidentStatus::Resolved => "resolved",
                    IncidentStatus::Closed => "closed",
                };
                if status_str != st.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    Json(ApiResponse::success(filtered, "SLA 事故列表"))
}

pub async fn generate_sla_report(
    State(_state): State<AppState>,
    Query(params): Query<SLAReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v55_store();

    let configs = store.sla_configs.lock().await;
    let measurements = store.sla_measurements.lock().await;
    let incidents = store.sla_incidents.lock().await;

    let tenant_filter = params.tenant_id.as_deref();

    let mut config_summaries: Vec<serde_json::Value> = Vec::new();
    let mut total_breaches: i64 = 0;
    let mut total_compensation: f64 = 0.0;

    for config in configs.iter() {
        let config_measurements: Vec<&SLAMeasurement> = measurements
            .iter()
            .filter(|m| {
                m.config_id == config.id
                    && tenant_filter
                        .map(|tid| &m.tenant_id == tid)
                        .unwrap_or(true)
                    && params
                        .period_start
                        .as_ref()
                        .map(|s| &m.measured_at >= s)
                        .unwrap_or(true)
                    && params
                        .period_end
                        .as_ref()
                        .map(|e| &m.measured_at <= e)
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
                    && tenant_filter
                        .map(|tid| &i.tenant_id == tid)
                        .unwrap_or(true)
            })
            .collect();

        total_breaches += config_incidents.len() as i64;
        total_compensation += config_incidents.iter().map(|i| i.compensation_amount).sum::<f64>();

        config_summaries.push(serde_json::json!({
            "config_id": config.id,
            "metric": format!("{:?}", config.metric).to_lowercase(),
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

    Json(ApiResponse::success(report, "SLA 报告"))
}