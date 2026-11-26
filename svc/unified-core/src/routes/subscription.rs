//! Subscription plans public routes (P2 遗留修复：subscription 纯类型框架此前无路由，API 404)。
//!
//! 基于 TierFeatureMatrix 暴露订阅计划只读视图：层级、等级、模块数、模块清单。
//! plans 为静态配置数据，无需 DB 访问。

use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;

use crate::modules::subscription::{PlanTier, TierFeatureMatrix};
use crate::AppState;
use topems_shared_core::response::{api_success, ApiResponse};

#[derive(Serialize)]
pub struct PlanInfo {
    tier: String,
    level: u8,
    module_count: usize,
    modules: Vec<String>,
}

#[utoipa::path(
    get,
    path = "/subscriptions/plans",
    tag = "Subscription",
    security(("BearerAuth" = [])),
    responses(
        (status = 200, description = "列出全部订阅计划及模块覆盖")
    )
)]
pub(crate) async fn list_plans(State(_state): State<AppState>) -> Json<ApiResponse<Vec<PlanInfo>>> {
    let tiers = [PlanTier::Free, PlanTier::Basic, PlanTier::Advanced];
    let plans: Vec<PlanInfo> = tiers
        .iter()
        .map(|tier| {
            let modules = TierFeatureMatrix::modules_for_tier(tier);
            PlanInfo {
                tier: tier.as_str().to_string(),
                level: tier.level(),
                module_count: modules.len(),
                modules: modules.iter().map(|m| m.module.clone()).collect(),
            }
        })
        .collect();
    Json(api_success(plans))
}

pub fn subscription_routes(state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/subscriptions/plans", get(list_plans))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::permission::require_permission("subscription:read"),
        ))
}
