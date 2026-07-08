//! Billing API handlers

use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{Duration, Utc};
use uuid::Uuid;

use super::models::*;
use crate::{AppState, CoreResponse};

/// List all billing plans
pub async fn list_plans(State(state): State<AppState>) -> Json<CoreResponse<Vec<BillingPlan>>> {
    tracing::info!("[Billing] Listing plans");

    let plans: Vec<BillingPlan> = sqlx::query_as(
        "SELECT * FROM core_billing_plans WHERE is_active = true ORDER BY price_cents ASC",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(plans, "Plans retrieved"))
}

/// Get plan by ID
pub async fn get_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<BillingPlan>> {
    tracing::info!("[Billing] Getting plan: {}", id);

    let plan: Option<BillingPlan> =
        sqlx::query_as("SELECT * FROM core_billing_plans WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    match plan {
        Some(p) => Json(CoreResponse::success(p, "Plan retrieved")),
        None => Json(CoreResponse::error("Plan not found")),
    }
}

/// Get subscription for tenant
pub async fn get_subscription(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<Option<(Subscription, BillingPlan)>>> {
    tracing::info!("[Billing] Getting subscription for tenant: {}", tenant_id);

    let subscription: Option<Subscription> =
        sqlx::query_as("SELECT * FROM core_subscriptions WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    match subscription {
        Some(sub) => {
            let plan: Option<BillingPlan> =
                sqlx::query_as("SELECT * FROM core_billing_plans WHERE id = $1")
                    .bind(sub.plan_id)
                    .fetch_optional(&state.pool)
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

            Json(CoreResponse::success(
                Some((sub, plan.unwrap_or(default_plan))),
                "Subscription retrieved",
            ))
        }
        None => Json(CoreResponse::success(
            None::<(Subscription, BillingPlan)>,
            "No subscription found",
        )),
    }
}

/// Create subscription for tenant
pub async fn create_subscription(
    State(state): State<AppState>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Json<CoreResponse<Subscription>> {
    tracing::info!(
        "[Billing] Creating subscription for tenant: {}",
        req.tenant_id
    );

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
    .fetch_one(&state.pool)
    .await;

    match subscription_result {
        Ok(subscription) => Json(CoreResponse::success(subscription, "Subscription created")),
        Err(e) => {
            tracing::error!("Failed to create subscription: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to create subscription: {}",
                e
            )))
        }
    }
}

/// Cancel subscription
pub async fn cancel_subscription(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
    Json(req): Json<CancelSubscriptionRequest>,
) -> Json<CoreResponse<Subscription>> {
    tracing::info!(
        "[Billing] Cancelling subscription for tenant: {}",
        tenant_id
    );

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
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match subscription {
        Some(sub) => Json(CoreResponse::success(sub, "Subscription cancelled")),
        None => Json(CoreResponse::error("Subscription not found")),
    }
}

/// List invoices for tenant
pub async fn list_invoices(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<Invoice>>> {
    tracing::info!("[Billing] Listing invoices for tenant: {}", tenant_id);

    let invoices: Vec<Invoice> = sqlx::query_as(
        "SELECT * FROM core_billing_invoices WHERE tenant_id = $1 ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(invoices, "Invoices retrieved"))
}

/// Get usage summary for tenant
pub async fn get_usage_summary(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<UsageSummary>> {
    tracing::info!("[Billing] Getting usage summary for tenant: {}", tenant_id);

    let subscription: Option<Subscription> = sqlx::query_as(
        "SELECT * FROM core_subscriptions WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let (included_users, included_storage, included_api) = if let Some(sub) = &subscription {
        let plan: Option<BillingPlan> =
            sqlx::query_as("SELECT * FROM core_billing_plans WHERE id = $1")
                .bind(sub.plan_id)
                .fetch_optional(&state.pool)
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

    // Get current usage
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
    .fetch_one(&state.pool)
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

    Json(CoreResponse::success(summary, "Usage summary retrieved"))
}

/// Record usage for tenant
pub async fn record_usage(
    State(state): State<AppState>,
    Path((tenant_id, metric_type)): Path<(Uuid, String)>,
    Json(quantity): Json<i64>,
) -> Json<CoreResponse<UsageRecord>> {
    tracing::info!(
        "[Billing] Recording usage for tenant: {}, metric: {}",
        tenant_id,
        metric_type
    );

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
    .fetch_one(&state.pool)
    .await;

    match record_result {
        Ok(record) => Json(CoreResponse::success(record, "Usage recorded")),
        Err(e) => {
            tracing::error!("Failed to record usage: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to record usage: {}",
                e
            )))
        }
    }
}
