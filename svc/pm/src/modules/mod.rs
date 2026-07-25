pub mod acceptance;
pub mod budget;
pub mod contract;
pub mod document;
pub mod notification;
pub mod openapi;
pub mod pm_plugin;
pub mod project;
pub mod project_approval;
pub mod project_benefit;
pub mod project_expense;
pub mod project_member;
pub mod project_milestone;
pub mod project_phase;
pub mod project_resource;
pub mod project_type_config;
pub mod quality;
pub mod report;
pub mod risk;
pub mod service_integration;
pub mod settlement;
pub mod statistics;

use axum::Router;
use std::sync::Arc;
use topems_shared::event::EventPublisher;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;

pub fn create_routes(
    pool: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    workflow_client: TypedServiceClient<WorkflowApi>,
) -> Router {
    Router::new()
        .merge(project::create_routes(
            pool.clone(),
            event_publisher.clone(),
        ))
        .merge(project_phase::create_routes(pool.clone()))
        .merge(project_milestone::create_routes(pool.clone()))
        .merge(project_member::create_routes(pool.clone()))
        .merge(project_resource::create_routes(pool.clone()))
        .merge(project_expense::create_routes(pool.clone()))
        .merge(project_benefit::create_routes(pool.clone()))
        .merge(project_approval::create_routes(pool.clone(), workflow_client.clone()))
        .merge(project_type_config::create_routes(pool.clone()))
        .merge(service_integration::create_routes(pool.clone()))
        .merge(contract::create_routes(pool.clone()))
        .merge(budget::create_routes(pool.clone()))
        .merge(risk::create_routes(pool.clone()))
        .merge(quality::create_routes(pool.clone()))
        .merge(acceptance::create_routes(pool.clone()))
        .merge(settlement::create_routes(pool.clone()))
        .merge(document::create_routes(pool.clone()))
        .merge(report::create_routes(pool.clone()))
        .merge(notification::create_routes(pool.clone()))
        .merge(statistics::create_routes(pool))
}
