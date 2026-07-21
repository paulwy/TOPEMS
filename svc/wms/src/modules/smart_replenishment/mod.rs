use axum::{
    extract::FromRef,
    routing::{get, post},
    Router,
};

use crate::modules::ApiState;

mod models;
mod orders;
mod rules;
mod safety_stock;
mod suggestions;

pub use models::{
    ConfirmSuggestionRequest, CreateReplenishmentRuleRequest, ReplenishmentComputeRequest,
    UpdateReplenishmentRuleRequest,
};

pub use suggestions::{
    compute_replenishment, confirm_suggestion, get_statistics, get_suggestion, list_suggestions,
};

pub use rules::{create_rule, delete_rule, get_rule, list_rules, update_rule};

pub use orders::{
    complete_order, confirm_order, create_order, delete_order, get_order, list_order_items,
    list_orders, update_order,
};

pub use safety_stock::{
    batch_update_safety_stock, calculate_safety_stock, get_safety_stock, list_safety_stock,
    update_safety_stock,
};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/smart-replenishment/suggestions", get(list_suggestions))
        .route(
            "/smart-replenishment/suggestions/generate",
            post(compute_replenishment),
        )
        .route(
            "/smart-replenishment/suggestions/{id}",
            get(get_suggestion).post(confirm_suggestion),
        )
        .route(
            "/smart-replenishment/rules",
            get(list_rules).post(create_rule),
        )
        .route(
            "/smart-replenishment/rules/{id}",
            get(get_rule).put(update_rule).delete(delete_rule),
        )
        .route("/smart-replenishment/statistics", get(get_statistics))
        .route(
            "/smart-replenishment/orders",
            get(list_orders).post(create_order),
        )
        .route(
            "/smart-replenishment/orders/{id}",
            get(get_order).put(update_order).delete(delete_order),
        )
        .route(
            "/smart-replenishment/orders/{id}/items",
            get(list_order_items),
        )
        .route(
            "/smart-replenishment/orders/{id}/confirm",
            post(confirm_order),
        )
        .route(
            "/smart-replenishment/orders/{id}/complete",
            post(complete_order),
        )
        .route("/smart-replenishment/safety-stock", get(list_safety_stock))
        .route(
            "/smart-replenishment/safety-stock/{id}",
            get(get_safety_stock).put(update_safety_stock),
        )
        .route(
            "/smart-replenishment/safety-stock/batch-update",
            post(batch_update_safety_stock),
        )
        .route(
            "/smart-replenishment/safety-stock/calculate",
            post(calculate_safety_stock),
        )
}
