// Billing 服务 OpenAPI 文档
use utoipa::OpenApi;

use crate::models::{
    BillingPlan, CancelSubscriptionRequest, CostBreakdown, CreateSubscriptionRequest, Invoice,
    MetricUsage, PeriodInfo, Subscription, UsageMetrics, UsageRecord, UsageSummary,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::list_plans,
        crate::handlers::get_plan,
        crate::handlers::get_subscription,
        crate::handlers::create_subscription,
        crate::handlers::cancel_subscription,
        crate::handlers::list_invoices,
        crate::handlers::get_usage_summary,
        crate::handlers::record_usage,
    ),
    components(
        schemas(
            BillingPlan,
            Subscription,
            Invoice,
            UsageRecord,
            CreateSubscriptionRequest,
            CancelSubscriptionRequest,
            UsageSummary,
            PeriodInfo,
            UsageMetrics,
            MetricUsage,
            CostBreakdown,
        ),
    ),
    tags(
        (name = "plans", description = "计费套餐 API"),
        (name = "subscriptions", description = "订阅管理 API"),
        (name = "invoices", description = "发票管理 API"),
        (name = "usage", description = "用量统计 API"),
    ),
    info(
        title = "TOPEMS Billing API",
        version = "1.0.0",
        description = "计费服务 API - 包含套餐管理、订阅管理、发票和用量统计"
    )
)]
pub struct BillingApiDoc;
