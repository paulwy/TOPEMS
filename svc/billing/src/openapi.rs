// Billing 服务 OpenAPI 文档
//
// 说明：handlers 函数未添加 #[utoipa::path] 注解，此处先注册 components.schemas
// 以支持前端 TypeScript 类型生成（前后端 DTO 同步）。paths 可后续补充注解后启用。
use utoipa::OpenApi;

use crate::models::{
    BillingPlan, CancelSubscriptionRequest, CostBreakdown, CreateSubscriptionRequest, Invoice,
    MetricUsage, PeriodInfo, Subscription, UsageMetrics, UsageRecord, UsageSummary,
};

#[derive(OpenApi)]
#[openapi(
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
