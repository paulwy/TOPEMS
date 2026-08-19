use axum::{extract::Path, extract::State, Json};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::models::*;
use topems_shared_core::response::ApiResponse;

// =============================================================================
// Pure functions（无 DB / 无 async / 无外部依赖，仅做计算与格式化）
// =============================================================================

/// 根据发票行项目（数量、单价）计算发票小计。
/// 返回 0.0 当列表为空。
pub fn calculate_invoice_total(items: &[(f64, f64)]) -> f64 {
    items.iter().map(|(qty, price)| qty * price).sum()
}

/// 按给定税率计算税额。负税率视为 0，避免异常输出。
pub fn calculate_tax(amount: f64, tax_rate: f64) -> f64 {
    if tax_rate < 0.0 {
        return 0.0;
    }
    amount * tax_rate
}

/// 应用百分比折扣（discount_pct 用百分数表示，例如 10 表示 10%）。
/// 折扣区间限制在 [0, 100]，超出范围夹紧。
pub fn apply_discount(amount: f64, discount_pct: f64) -> f64 {
    let pct = discount_pct.clamp(0.0, 100.0);
    amount * (1.0 - pct / 100.0)
}

/// 生成发票号：`{prefix}-{year}-{seq:06}`，例如 `INV-2026-000042`。
pub fn generate_invoice_number(prefix: &str, year: i32, seq: u64) -> String {
    format!("{}-{}-{:06}", prefix, year, seq)
}

/// 判断付款是否逾期。返回 true 当且仅当未支付且当前时间晚于到期时间。
pub fn is_payment_overdue(due_date: i64, now: i64, paid: bool) -> bool {
    !paid && now > due_date
}

/// 计算逾期罚金 = 金额 × 逾期天数 × 日费率。
/// 逾期天数 ≤ 0 时返回 0；负金额视为 0。
pub fn calculate_late_fee(amount: f64, overdue_days: i64, daily_rate: f64) -> f64 {
    if overdue_days <= 0 || amount <= 0.0 || daily_rate <= 0.0 {
        return 0.0;
    }
    amount * overdue_days as f64 * daily_rate
}

/// 按货币代码格式化金额，例如 `"$100.00"`、`"¥1,234"`（JPY 不带小数）。
/// 未知货币回退为 `"{amount} {code}"`。
pub fn format_currency(amount: f64, currency: &str) -> String {
    match currency.to_uppercase().as_str() {
        "USD" => format!("${:.2}", amount),
        "CNY" => format!("¥{:.2}", amount),
        "EUR" => format!("€{:.2}", amount),
        "GBP" => format!("£{:.2}", amount),
        "JPY" => format!("¥{:.0}", amount),
        other => format!("{:.2} {}", amount, other),
    }
}

/// 按比例计算月费分摊。days_in_month ≤ 0 时返回 0。
pub fn calculate_proration(monthly_amount: f64, days_used: i64, days_in_month: i64) -> f64 {
    if days_in_month <= 0 || days_used <= 0 {
        return 0.0;
    }
    let used = days_used.min(days_in_month) as f64;
    monthly_amount * (used / days_in_month as f64)
}

/// 计算订阅套餐总价。已知 tier：basic=29.99/月、professional=99.99/月、enterprise=199.99/月；
/// 年付（months >= 12）赠送 2 个月。未知 tier 返回 None。
pub fn calculate_subscription_price(tier: &str, months: u32) -> Option<f64> {
    let monthly = match tier {
        "basic" => 29.99,
        "professional" => 99.99,
        "enterprise" => 199.99,
        _ => return None,
    };
    if months == 0 {
        return Some(0.0);
    }
    if months >= 12 {
        // 年付优惠：每 12 个月只收 10 个月费用
        let years = months / 12;
        let remainder = months % 12;
        Some(monthly * (years as f64 * 10.0 + remainder as f64))
    } else {
        Some(monthly * months as f64)
    }
}

/// 校验支付金额是否合法：必须 > 0 且 ≤ 发票总额（允许 1 分钱容差）。
pub fn validate_payment_amount(amount: f64, invoice_total: f64) -> bool {
    if amount <= 0.0 || invoice_total < 0.0 {
        return false;
    }
    amount <= invoice_total + 0.01
}

/// 计算退款金额 = amount × (total_days - used_days) / total_days。
/// used_days >= total_days 返回 0；total_days <= 0 返回 0。
pub fn calculate_refund(amount: f64, used_days: i64, total_days: i64) -> f64 {
    if total_days <= 0 || amount <= 0.0 {
        return 0.0;
    }
    if used_days >= total_days {
        return 0.0;
    }
    if used_days < 0 {
        return amount;
    }
    let remaining = (total_days - used_days) as f64;
    amount * (remaining / total_days as f64)
}

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_billing_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            license_type VARCHAR(32) DEFAULT 'subscription',
            price_cents INTEGER NOT NULL DEFAULT 0,
            price_period VARCHAR(32) DEFAULT 'monthly',
            included_users INTEGER DEFAULT 5,
            included_storage_gb BIGINT DEFAULT 5,
            included_api_calls BIGINT DEFAULT 50000,
            included_modules TEXT[],
            overage_users_cents INTEGER DEFAULT 500,
            overage_storage_cents INTEGER DEFAULT 50,
            overage_api_calls_cents INTEGER DEFAULT 10,
            is_active BOOLEAN DEFAULT TRUE,
            is_trial BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            plan_id UUID NOT NULL REFERENCES core_billing_plans(id),
            status VARCHAR(32) DEFAULT 'active',
            current_period_start DATE NOT NULL,
            current_period_end DATE NOT NULL,
            is_trial BOOLEAN DEFAULT FALSE,
            trial_ends_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_billing_invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            subscription_id UUID REFERENCES core_subscriptions(id),
            invoice_number VARCHAR(64) NOT NULL,
            status VARCHAR(32) DEFAULT 'draft',
            subtotal_cents INTEGER DEFAULT 0,
            discount_cents INTEGER DEFAULT 0,
            tax_cents INTEGER DEFAULT 0,
            total_cents INTEGER DEFAULT 0,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            paid_at TIMESTAMP,
            payment_method VARCHAR(64),
            payment_reference VARCHAR(256),
            line_items JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, invoice_number)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_usage_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            metric_type VARCHAR(64) NOT NULL,
            metric_name VARCHAR(128),
            quantity BIGINT NOT NULL DEFAULT 0,
            unit VARCHAR(32),
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            cost_cents INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_subscriptions_tenant ON core_subscriptions(tenant_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_invoices_tenant ON core_billing_invoices(tenant_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_usage_tenant_period ON core_usage_records(tenant_id, period_start)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO core_billing_plans (code, name, description, license_type, price_cents, price_period, included_users, included_storage_gb, included_api_calls, included_modules)
        VALUES 
            ('basic', '基础版', '适合小团队，包含核心功能', 'perpetual', 29999, 'yearly', 20, 10, 100000, ARRAY['iam', 'doc', 'flow', 'file']),
            ('basic-monthly', '基础版（月付）', '适合小团队，按月付费', 'subscription', 299, 'monthly', 20, 10, 100000, ARRAY['iam', 'doc', 'flow', 'file']),
            ('professional', '专业版', '适合成长型企业', 'perpetual', 99999, 'yearly', 100, 100, 500000, ARRAY['iam', 'doc', 'flow', 'file', 'comm', 'erp', 'hrms', 'crm']),
            ('professional-monthly', '专业版（月付）', '适合成长型企业，按月付费', 'subscription', 999, 'monthly', 100, 100, 500000, ARRAY['iam', 'doc', 'flow', 'file', 'comm', 'erp', 'hrms', 'crm']),
            ('enterprise', '企业版', '适合大型企业，无限用户', 'perpetual', 199999, 'yearly', -1, 1000, -1, ARRAY['*']),
            ('enterprise-monthly', '企业版（月付）', '适合大型企业，无限用户', 'subscription', 1999, 'monthly', -1, 1000, -1, ARRAY['*'])
        ON CONFLICT (code) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    // Schema 防御：增量迁移 + 一致性自检（V69.3）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[billing] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["billing:plan:read"])),
    path = "/plans",
    tag = "plans",
    responses(
        (status = 200, description = "Plans retrieved", body = Vec<BillingPlan>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_plans(State(pool): State<PgPool>) -> Json<ApiResponse<Vec<BillingPlan>>> {
    let plans: Vec<BillingPlan> = sqlx::query_as(
        "SELECT id, tenant_id, name, description, billing_type, price, currency, duration, is_active, created_at, updated_at FROM core_billing_plans WHERE is_active = true ORDER BY price_cents ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(plans, "Plans retrieved"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["billing:plan:read"])),
    path = "/plans/{id}",
    tag = "plans",
    params(
        ("id" = Uuid, Path, description = "套餐ID")
    ),
    responses(
        (status = 200, description = "Plan retrieved", body = BillingPlan),
        (status = 404, description = "Plan not found")
    )
)]
pub async fn get_plan(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BillingPlan>> {
    let plan: Option<BillingPlan> =
        sqlx::query_as("SELECT id, tenant_id, name, description, billing_type, price, currency, duration, is_active, created_at, updated_at FROM core_billing_plans WHERE id = $1")
            .bind(id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    match plan {
        Some(p) => Json(ApiResponse::success(p, "Plan retrieved")),
        None => Json(ApiResponse::error(404, "Plan not found")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["billing:subscription:read"])),
    path = "/subscriptions/{tenant_id}",
    tag = "subscriptions",
    params(
        ("tenant_id" = Uuid, Path, description = "租户ID")
    ),
    responses(
        (status = 200, description = "Subscription retrieved", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_subscription(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
) -> Json<ApiResponse<Option<(Subscription, BillingPlan)>>> {
    let subscription: Option<Subscription> =
        sqlx::query_as("SELECT id, tenant_id, user_id, plan_id, plan_name, status, started_at, expires_at, created_at, updated_at FROM core_subscriptions WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    match subscription {
        Some(sub) => {
            let plan: Option<BillingPlan> =
                sqlx::query_as("SELECT id, tenant_id, name, description, billing_type, price, currency, duration, is_active, created_at, updated_at FROM core_billing_plans WHERE id = $1")
                    .bind(sub.plan_id)
                    .fetch_optional(&pool)
                    .await
                    .unwrap_or(None);

            let default_plan = BillingPlan {
                id: Uuid::nil(),
                code: "unknown".to_string(),
                name: "Unknown".to_string(),
                description: None,
                license_type: "subscription".to_string(),
                price_cents: 0,
                price_period: "monthly".to_string(),
                included_users: 0,
                included_storage_gb: None,
                included_api_calls: None,
                included_modules: None,
                overage_users_cents: None,
                overage_storage_cents: None,
                overage_api_calls_cents: None,
                is_active: false,
                is_trial: false,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };

            Json(ApiResponse::success(
                Some((sub, plan.unwrap_or(default_plan))),
                "Subscription retrieved",
            ))
        }
        None => Json(ApiResponse::success(None, "No subscription found")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["billing:subscription:write"])),
    path = "/subscriptions",
    tag = "subscriptions",
    request_body = CreateSubscriptionRequest,
    responses(
        (status = 200, description = "Subscription created", body = Subscription),
        (status = 500, description = "Failed to create subscription")
    )
)]
pub async fn create_subscription(
    State(pool): State<PgPool>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Json<ApiResponse<Subscription>> {
    let now = Utc::now();
    let (period_start, period_end) = if req.is_trial {
        let end = now + Duration::days(req.trial_days as i64);
        (now.date_naive(), end.date_naive())
    } else {
        let end = now + Duration::days(30);
        (now.date_naive(), end.date_naive())
    };

    let subscription_result = sqlx::query_as(
        r#"
        INSERT INTO core_subscriptions 
            (tenant_id, plan_id, status, current_period_start, current_period_end, is_trial, trial_ends_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id) 
        DO UPDATE SET plan_id = $2, status = $3, updated_at = NOW()
        RETURNING *
        "#,
    )
    .bind(req.tenant_id)
    .bind(req.plan_id)
    .bind(if req.is_trial { "trial" } else { "active" })
    .bind(period_start)
    .bind(period_end)
    .bind(req.is_trial)
    .bind(if req.is_trial { Some(now + Duration::days(req.trial_days as i64)) } else { None })
    .fetch_one(&pool)
    .await;

    match subscription_result {
        Ok(subscription) => Json(ApiResponse::success(subscription, "Subscription created")),
        Err(e) => {
            tracing::error!("Failed to create subscription: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create subscription: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["billing:subscription:write"])),
    path = "/subscriptions/{tenant_id}",
    tag = "subscriptions",
    params(
        ("tenant_id" = Uuid, Path, description = "租户ID")
    ),
    request_body = CancelSubscriptionRequest,
    responses(
        (status = 200, description = "Subscription cancelled", body = Subscription),
        (status = 404, description = "Subscription not found")
    )
)]
pub async fn cancel_subscription(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
    Json(req): Json<CancelSubscriptionRequest>,
) -> Json<ApiResponse<Subscription>> {
    let subscription: Option<Subscription> = sqlx::query_as(
        r#"
        UPDATE core_subscriptions
        SET 
            cancelled_at = NOW(),
            cancel_at_period_end = $2,
            status = CASE WHEN $2 THEN 'active' ELSE 'cancelled' END,
            updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(req.cancel_at_period_end)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    match subscription {
        Some(sub) => Json(ApiResponse::success(sub, "Subscription cancelled")),
        None => Json(ApiResponse::error(404, "Subscription not found")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["billing:invoice:read"])),
    path = "/invoices/{tenant_id}",
    tag = "invoices",
    params(
        ("tenant_id" = Uuid, Path, description = "租户ID")
    ),
    responses(
        (status = 200, description = "Invoices retrieved", body = Vec<Invoice>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_invoices(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Invoice>>> {
    let invoices: Vec<Invoice> = sqlx::query_as(
        "SELECT id, tenant_id, invoice_no, user_id, subscription_id, amount, currency, tax_amount, total_amount, status, issued_at, paid_at, created_at FROM core_billing_invoices WHERE tenant_id = $1 ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(invoices, "Invoices retrieved"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["billing:usage:read"])),
    path = "/usage/{tenant_id}",
    tag = "usage",
    params(
        ("tenant_id" = Uuid, Path, description = "租户ID")
    ),
    responses(
        (status = 200, description = "Usage summary retrieved", body = UsageSummary),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_usage_summary(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
) -> Json<ApiResponse<UsageSummary>> {
    let subscription: Option<Subscription> = sqlx::query_as(
        "SELECT id, tenant_id, user_id, plan_id, plan_name, status, started_at, expires_at, created_at, updated_at FROM core_subscriptions WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let (included_users, included_storage, included_api) = if let Some(sub) = &subscription {
        let plan: Option<BillingPlan> =
            sqlx::query_as("SELECT id, tenant_id, name, description, billing_type, price, currency, duration, is_active, created_at, updated_at FROM core_billing_plans WHERE id = $1")
                .bind(sub.plan_id)
                .fetch_optional(&pool)
                .await
                .unwrap_or(None);

        if let Some(p) = plan {
            (
                p.included_users as i64,
                p.included_storage_gb.unwrap_or(5) as i64,
                p.included_api_calls.unwrap_or(50000) as i64,
            )
        } else {
            (5, 5, 50000)
        }
    } else {
        (5, 5, 50000)
    };

    let usage: (i64, i64, i64) = sqlx::query_as(
        r#"
        SELECT 
            COALESCE(SUM(CASE WHEN metric_type = 'users' THEN quantity ELSE 0 END), 0) as users,
            COALESCE(SUM(CASE WHEN metric_type = 'storage' THEN quantity ELSE 0 END), 0) as storage,
            COALESCE(SUM(CASE WHEN metric_type = 'api_calls' THEN quantity ELSE 0 END), 0) as api_calls
        FROM core_usage_records
        WHERE tenant_id = $1 AND period_start >= NOW() - INTERVAL '30 days'
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&pool)
    .await
    .unwrap_or((0i64, 0i64, 0i64));

    let current_users = usage.0;
    let current_storage = usage.1 / (1024 * 1024);
    let current_api = usage.2;

    let summary = UsageSummary {
        tenant_id,
        period: PeriodInfo {
            start_date: (Utc::now() - Duration::days(30)).date_naive(),
            end_date: Utc::now().date_naive(),
        },
        usage: UsageMetrics {
            users: MetricUsage {
                current: current_users,
                quota: included_users,
                percent_used: if included_users > 0 {
                    current_users as f64 / included_users as f64 * 100.0
                } else {
                    0.0
                },
            },
            storage: MetricUsage {
                current: current_storage,
                quota: included_storage,
                percent_used: if included_storage > 0 {
                    current_storage as f64 / included_storage as f64 * 100.0
                } else {
                    0.0
                },
            },
            api_calls: MetricUsage {
                current: current_api,
                quota: included_api,
                percent_used: if included_api > 0 {
                    current_api as f64 / included_api as f64 * 100.0
                } else {
                    0.0
                },
            },
        },
        costs: CostBreakdown {
            base_cost_cents: 0,
            overage_cost_cents: 0,
            plugin_cost_cents: 0,
            total_cost_cents: 0,
        },
    };

    Json(ApiResponse::success(summary, "Usage summary retrieved"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["billing:usage:write"])),
    path = "/usage/{tenant_id}/{metric_type}",
    tag = "usage",
    params(
        ("tenant_id" = Uuid, Path, description = "租户ID"),
        ("metric_type" = String, Path, description = "指标类型 (users/storage/api_calls)")
    ),
    request_body = i64,
    responses(
        (status = 200, description = "Usage recorded", body = UsageRecord),
        (status = 500, description = "Failed to record usage")
    )
)]
pub async fn record_usage(
    State(pool): State<PgPool>,
    Path((tenant_id, metric_type)): Path<(Uuid, String)>,
    Json(quantity): Json<i64>,
) -> Json<ApiResponse<UsageRecord>> {
    let now = Utc::now();
    let metric_name = match metric_type.as_str() {
        "users" => "Active Users",
        "storage" => "Storage in MB",
        "api_calls" => "API Calls",
        _ => &metric_type,
    }
    .to_string();

    let record_result = sqlx::query_as(
        r#"
        INSERT INTO core_usage_records (tenant_id, metric_type, metric_name, quantity, period_start, period_end)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(&metric_type)
    .bind(&metric_name)
    .bind(quantity)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match record_result {
        Ok(record) => Json(ApiResponse::success(record, "Usage recorded")),
        Err(e) => {
            tracing::error!("Failed to record usage: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to record usage: {}", e),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_invoice_total ----

    #[test]
    fn invoice_total_empty_list_is_zero() {
        assert_eq!(calculate_invoice_total(&[]), 0.0);
    }

    #[test]
    fn invoice_total_single_item() {
        assert_eq!(calculate_invoice_total(&[(2.0, 5.0)]), 10.0);
    }

    #[test]
    fn invoice_total_multiple_items() {
        let items = vec![(1.0, 100.0), (3.0, 20.0), (2.0, 7.5)];
        assert_eq!(calculate_invoice_total(&items), 175.0);
    }

    #[test]
    fn invoice_total_zero_quantity() {
        assert_eq!(calculate_invoice_total(&[(0.0, 99.99)]), 0.0);
    }

    #[test]
    fn invoice_total_zero_price() {
        assert_eq!(calculate_invoice_total(&[(5.0, 0.0)]), 0.0);
    }

    #[test]
    fn invoice_total_fractional_values() {
        let items = vec![(1.5, 10.0), (2.5, 4.0)];
        assert_eq!(calculate_invoice_total(&items), 25.0);
    }

    // ---- calculate_tax ----

    #[test]
    fn tax_zero_amount() {
        assert_eq!(calculate_tax(0.0, 0.1), 0.0);
    }

    #[test]
    fn tax_zero_rate() {
        assert_eq!(calculate_tax(100.0, 0.0), 0.0);
    }

    #[test]
    fn tax_normal_rate() {
        assert_eq!(calculate_tax(100.0, 0.13), 13.0);
    }

    #[test]
    fn tax_negative_rate_returns_zero() {
        assert_eq!(calculate_tax(100.0, -0.1), 0.0);
    }

    #[test]
    fn tax_high_rate() {
        assert_eq!(calculate_tax(50.0, 1.0), 50.0);
    }

    // ---- apply_discount ----

    #[test]
    fn discount_zero_pct() {
        assert_eq!(apply_discount(100.0, 0.0), 100.0);
    }

    #[test]
    fn discount_full_pct() {
        assert_eq!(apply_discount(100.0, 100.0), 0.0);
    }

    #[test]
    fn discount_normal() {
        assert_eq!(apply_discount(200.0, 10.0), 180.0);
    }

    #[test]
    fn discount_over_100_clamped() {
        assert_eq!(apply_discount(100.0, 150.0), 0.0);
    }

    #[test]
    fn discount_negative_clamped() {
        assert_eq!(apply_discount(100.0, -20.0), 100.0);
    }

    #[test]
    fn discount_zero_amount() {
        assert_eq!(apply_discount(0.0, 50.0), 0.0);
    }

    // ---- generate_invoice_number ----

    #[test]
    fn invoice_number_basic() {
        assert_eq!(generate_invoice_number("INV", 2026, 42), "INV-2026-000042");
    }

    #[test]
    fn invoice_number_zero_seq() {
        assert_eq!(generate_invoice_number("INV", 2026, 0), "INV-2026-000000");
    }

    #[test]
    fn invoice_number_large_seq_preserves_width() {
        assert_eq!(
            generate_invoice_number("BILL", 2026, 1234567),
            "BILL-2026-1234567"
        );
    }

    #[test]
    fn invoice_number_empty_prefix() {
        assert_eq!(generate_invoice_number("", 2026, 1), "-2026-000001");
    }

    #[test]
    fn invoice_number_year_zero() {
        assert_eq!(generate_invoice_number("INV", 0, 5), "INV-0-000005");
    }

    // ---- is_payment_overdue ----

    #[test]
    fn overdue_unpaid_after_due() {
        assert!(is_payment_overdue(1_000, 2_000, false));
    }

    #[test]
    fn overdue_paid_never_overdue() {
        assert!(!is_payment_overdue(1_000, 2_000, true));
    }

    #[test]
    fn overdue_before_due_date() {
        assert!(!is_payment_overdue(2_000, 1_000, false));
    }

    #[test]
    fn overdue_exactly_at_due_date() {
        assert!(!is_payment_overdue(2_000, 2_000, false));
    }

    #[test]
    fn overdue_unpaid_at_due_date() {
        assert!(!is_payment_overdue(1_000, 1_000, false));
    }

    // ---- calculate_late_fee ----

    #[test]
    fn late_fee_zero_days() {
        assert_eq!(calculate_late_fee(100.0, 0, 0.01), 0.0);
    }

    #[test]
    fn late_fee_negative_days() {
        assert_eq!(calculate_late_fee(100.0, -5, 0.01), 0.0);
    }

    #[test]
    fn late_fee_normal() {
        assert_eq!(calculate_late_fee(1000.0, 5, 0.001), 5.0);
    }

    #[test]
    fn late_fee_zero_amount() {
        assert_eq!(calculate_late_fee(0.0, 10, 0.01), 0.0);
    }

    #[test]
    fn late_fee_negative_amount() {
        assert_eq!(calculate_late_fee(-100.0, 10, 0.01), 0.0);
    }

    #[test]
    fn late_fee_negative_rate() {
        assert_eq!(calculate_late_fee(100.0, 10, -0.01), 0.0);
    }

    // ---- format_currency ----

    #[test]
    fn currency_usd() {
        assert_eq!(format_currency(100.0, "USD"), "$100.00");
    }

    #[test]
    fn currency_cny() {
        assert_eq!(format_currency(99.5, "CNY"), "¥99.50");
    }

    #[test]
    fn currency_eur() {
        assert_eq!(format_currency(50.25, "EUR"), "€50.25");
    }

    #[test]
    fn currency_gbp() {
        assert_eq!(format_currency(12.0, "GBP"), "£12.00");
    }

    #[test]
    fn currency_jpy_no_decimals() {
        // JPY 不带小数（1234.6 进位到 1235）
        assert_eq!(format_currency(1234.6, "JPY"), "¥1235");
    }

    #[test]
    fn currency_unknown_code_fallback() {
        assert_eq!(format_currency(10.0, "KRW"), "10.00 KRW");
    }

    #[test]
    fn currency_lowercase_normalized() {
        assert_eq!(format_currency(10.0, "usd"), "$10.00");
    }

    #[test]
    fn currency_zero_amount() {
        assert_eq!(format_currency(0.0, "USD"), "$0.00");
    }

    // ---- calculate_proration ----

    #[test]
    fn proration_full_month() {
        assert_eq!(calculate_proration(100.0, 30, 30), 100.0);
    }

    #[test]
    fn proration_zero_days_used() {
        assert_eq!(calculate_proration(100.0, 0, 30), 0.0);
    }

    #[test]
    fn proration_half_month() {
        assert_eq!(calculate_proration(100.0, 15, 30), 50.0);
    }

    #[test]
    fn proration_days_used_exceeds_month_clamped() {
        assert_eq!(calculate_proration(100.0, 45, 30), 100.0);
    }

    #[test]
    fn proration_zero_days_in_month() {
        assert_eq!(calculate_proration(100.0, 15, 0), 0.0);
    }

    #[test]
    fn proration_negative_days_used() {
        assert_eq!(calculate_proration(100.0, -5, 30), 0.0);
    }

    #[test]
    fn proration_zero_amount() {
        assert_eq!(calculate_proration(0.0, 15, 30), 0.0);
    }

    // ---- calculate_subscription_price ----

    #[test]
    fn subscription_basic_one_month() {
        assert_eq!(calculate_subscription_price("basic", 1), Some(29.99));
    }

    #[test]
    fn subscription_professional_six_months() {
        // 99.99 × 6 = 599.94，浮点误差允许 0.01
        let result = calculate_subscription_price("professional", 6).unwrap();
        assert!((result - 599.94).abs() < 0.01);
    }

    #[test]
    fn subscription_enterprise_one_year() {
        // 12 个月按 10 个月计费
        assert_eq!(calculate_subscription_price("enterprise", 12), Some(1999.9));
    }

    #[test]
    fn subscription_zero_months() {
        assert_eq!(calculate_subscription_price("basic", 0), Some(0.0));
    }

    #[test]
    fn subscription_unknown_tier() {
        assert_eq!(calculate_subscription_price("platinum", 12), None);
    }

    #[test]
    fn subscription_year_plus_months() {
        // 14 = 1 年(10 个月计费) + 2 个月
        // enterprise: 199.99 × (10 + 2) = 2399.88
        assert_eq!(
            calculate_subscription_price("enterprise", 14),
            Some(2399.88)
        );
    }

    #[test]
    fn subscription_empty_tier() {
        assert_eq!(calculate_subscription_price("", 12), None);
    }

    // ---- validate_payment_amount ----

    #[test]
    fn payment_valid_partial() {
        assert!(validate_payment_amount(50.0, 100.0));
    }

    #[test]
    fn payment_valid_exact() {
        assert!(validate_payment_amount(100.0, 100.0));
    }

    #[test]
    fn payment_zero_amount_invalid() {
        assert!(!validate_payment_amount(0.0, 100.0));
    }

    #[test]
    fn payment_negative_amount_invalid() {
        assert!(!validate_payment_amount(-10.0, 100.0));
    }

    #[test]
    fn payment_over_invoice_invalid() {
        assert!(!validate_payment_amount(150.0, 100.0));
    }

    #[test]
    fn payment_within_one_cent_tolerance() {
        // 0.005 浮点误差允许
        assert!(validate_payment_amount(100.005, 100.0));
    }

    #[test]
    fn payment_negative_invoice_invalid() {
        assert!(!validate_payment_amount(10.0, -100.0));
    }

    // ---- calculate_refund ----

    #[test]
    fn refund_unused_full() {
        assert_eq!(calculate_refund(100.0, 0, 30), 100.0);
    }

    #[test]
    fn refund_half_used() {
        assert_eq!(calculate_refund(100.0, 15, 30), 50.0);
    }

    #[test]
    fn refund_fully_used_zero() {
        assert_eq!(calculate_refund(100.0, 30, 30), 0.0);
    }

    #[test]
    fn refund_over_used_zero() {
        assert_eq!(calculate_refund(100.0, 60, 30), 0.0);
    }

    #[test]
    fn refund_zero_total_days() {
        assert_eq!(calculate_refund(100.0, 5, 0), 0.0);
    }

    #[test]
    fn refund_negative_used_days_full_refund() {
        assert_eq!(calculate_refund(100.0, -5, 30), 100.0);
    }

    #[test]
    fn refund_zero_amount() {
        assert_eq!(calculate_refund(0.0, 10, 30), 0.0);
    }

    #[test]
    fn refund_negative_amount() {
        assert_eq!(calculate_refund(-50.0, 5, 30), 0.0);
    }
}
