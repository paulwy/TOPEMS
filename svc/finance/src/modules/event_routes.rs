// V45.0 Track A: Finance 事件管理 HTTP 端点
// =============================================================================
// 事件管道 / Saga 的管理与查询接口

use axum::{
    extract::Path,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::domain::event_handler::RouteResult;
use crate::domain::event_pipeline::{
    get_event_pipeline, get_pipeline_stats, PipelineResult, PipelineStats,
};
use crate::domain::event_publisher::PublishedEvent;
use crate::domain::events::FinanceDomainEvent;
use crate::domain::saga::{SagaInstance, SagaStats, SagaStatus};
use crate::shared::AppState;
use topems_shared::ApiResponse;

// =============================================================================
// 响应模型
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlersResponse {
    pub handlers: Vec<String>,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteEventRequest {
    pub event: FinanceDomainEvent,
    pub aggregate_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteEventResponse {
    pub results: Vec<RouteResultDto>,
    pub handlers_invoked: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteResultDto {
    pub handler_name: String,
    pub success: bool,
    pub error: Option<String>,
    pub side_effects_count: usize,
}

impl From<RouteResult> for RouteResultDto {
    fn from(r: RouteResult) -> Self {
        Self {
            handler_name: r.handler_name,
            success: r.success,
            error: r.error,
            side_effects_count: r.side_effects.len(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartSagaRequest {
    pub saga_type: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartSagaResponse {
    pub saga_id: String,
    pub status: SagaStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompensateSagaResponse {
    pub saga_id: String,
    pub status: SagaStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SagasListResponse {
    pub items: Vec<SagaInstance>,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessEventsRequest {
    pub events: Vec<(FinanceDomainEvent, String)>,
}

// =============================================================================
// 处理器
// =============================================================================

async fn list_published_events() -> Json<ApiResponse<Vec<PublishedEvent>>> {
    let pipeline = get_event_pipeline();
    Json(ApiResponse::success(
        pipeline.get_published_events(),
        "查询成功",
    ))
}

async fn list_handlers() -> Json<ApiResponse<HandlersResponse>> {
    let pipeline = get_event_pipeline();
    let handlers = pipeline.get_router().list_handlers();
    let count = handlers.len();
    Json(ApiResponse::success(
        HandlersResponse { handlers, count },
        "查询成功",
    ))
}

async fn route_event(Json(req): Json<RouteEventRequest>) -> Json<ApiResponse<RouteEventResponse>> {
    let pipeline = get_event_pipeline();
    let results = pipeline
        .get_router()
        .route(&req.event, &req.aggregate_id)
        .await;
    let handlers_invoked = results.len();
    let results_dto: Vec<RouteResultDto> = results.into_iter().map(RouteResultDto::from).collect();
    Json(ApiResponse::success(
        RouteEventResponse {
            results: results_dto,
            handlers_invoked,
        },
        "路由完成",
    ))
}

async fn process_events(
    Json(req): Json<ProcessEventsRequest>,
) -> Json<ApiResponse<PipelineResult>> {
    let pipeline = get_event_pipeline();
    let result = pipeline.process_events(&req.events).await;
    Json(ApiResponse::success(result, "处理完成"))
}

async fn list_sagas() -> Json<ApiResponse<SagasListResponse>> {
    let pipeline = get_event_pipeline();
    let items = pipeline.get_saga_coordinator().list_sagas(None).await;
    let total = items.len();
    Json(ApiResponse::success(
        SagasListResponse { items, total },
        "查询成功",
    ))
}

async fn get_saga(Path(saga_id): Path<String>) -> Json<ApiResponse<SagaInstance>> {
    let pipeline = get_event_pipeline();
    match pipeline.get_saga_coordinator().get_saga(&saga_id).await {
        Some(instance) => Json(ApiResponse::success(instance, "查询成功")),
        None => Json(ApiResponse::error(404, &format!("Saga {} 未找到", saga_id))),
    }
}

async fn start_saga(Json(req): Json<StartSagaRequest>) -> Json<ApiResponse<StartSagaResponse>> {
    let pipeline = get_event_pipeline();
    match pipeline
        .get_saga_coordinator()
        .start_saga(&req.saga_type, req.payload)
        .await
    {
        Ok(saga_id) => {
            // 立即执行（内存模拟）
            let _ = pipeline.get_saga_coordinator().execute_saga(&saga_id).await;
            let status = pipeline
                .get_saga_coordinator()
                .get_saga(&saga_id)
                .await
                .map(|i| i.status)
                .unwrap_or(SagaStatus::Running);
            Json(ApiResponse::success(
                StartSagaResponse { saga_id, status },
                "Saga 已启动并执行",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

async fn compensate_saga(Path(saga_id): Path<String>) -> Json<ApiResponse<CompensateSagaResponse>> {
    let pipeline = get_event_pipeline();
    match pipeline
        .get_saga_coordinator()
        .compensate_saga(&saga_id)
        .await
    {
        Ok(status) => Json(ApiResponse::success(
            CompensateSagaResponse { saga_id, status },
            "补偿完成",
        )),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

async fn saga_stats() -> Json<ApiResponse<SagaStats>> {
    let pipeline = get_event_pipeline();
    Json(ApiResponse::success(
        pipeline.get_saga_coordinator().get_stats(),
        "查询成功",
    ))
}

async fn pipeline_stats() -> Json<ApiResponse<PipelineStats>> {
    Json(ApiResponse::success(get_pipeline_stats(), "查询成功"))
}

// =============================================================================
// 路由
// =============================================================================

pub fn event_routes() -> Router<AppState> {
    Router::new()
        .route("/events/published", get(list_published_events))
        .route("/events/handlers", get(list_handlers))
        .route("/events/route", post(route_event))
        .route("/events/process", post(process_events))
        .route("/sagas", get(list_sagas))
        .route("/sagas/stats", get(saga_stats))
        .route("/sagas/start", post(start_saga))
        .route("/sagas/{saga_id}", get(get_saga))
        .route("/sagas/{saga_id}/compensate", post(compensate_saga))
        .route("/pipeline/stats", get(pipeline_stats))
}
