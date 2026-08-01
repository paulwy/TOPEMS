use axum::{extract::Path, extract::State, Json};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::models::*;
use topems_shared::ApiResponse;

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

    Ok(())
}

pub async fn list_plans(State(pool): State<PgPool>) -> Json<ApiResponse<Vec<BillingPlan>>> {
    let plans: Vec<BillingPlan> = sqlx::query_as(
        "SELECT * FROM core_billing_plans WHERE is_active = true ORDER BY price_cents ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(plans, "Plans retrieved"))
}

pub async fn get_plan(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BillingPlan>> {
    let plan: Option<BillingPlan> =
        sqlx::query_as("SELECT * FROM core_billing_plans WHERE id = $1")
            .bind(id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    match plan {
        Some(p) => Json(ApiResponse::success(p, "Plan retrieved")),
        None => Json(ApiResponse::error(404, "Plan not found")),
    }
}

pub async fn get_subscription(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
) -> Json<ApiResponse<Option<(Subscription, BillingPlan)>>> {
    let subscription: Option<Subscription> =
        sqlx::query_as("SELECT * FROM core_subscriptions WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

    match subscription {
        Some(sub) => {
            let plan: Option<BillingPlan> =
                sqlx::query_as("SELECT * FROM core_billing_plans WHERE id = $1")
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

pub async fn list_invoices(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Invoice>>> {
    let invoices: Vec<Invoice> = sqlx::query_as(
        "SELECT * FROM core_billing_invoices WHERE tenant_id = $1 ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(invoices, "Invoices retrieved"))
}

pub async fn get_usage_summary(
    State(pool): State<PgPool>,
    Path(tenant_id): Path<Uuid>,
) -> Json<ApiResponse<UsageSummary>> {
    let subscription: Option<Subscription> = sqlx::query_as(
        "SELECT * FROM core_subscriptions WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let (included_users, included_storage, included_api) = if let Some(sub) = &subscription {
        let plan: Option<BillingPlan> =
            sqlx::query_as("SELECT * FROM core_billing_plans WHERE id = $1")
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
