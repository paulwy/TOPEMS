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
use topems_shared_core::response::ApiResponse;

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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/events/published",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Events & Sagas",
    operation_id = "list_published_events",
)]

async fn list_published_events() -> Json<ApiResponse<Vec<PublishedEvent>>> {
    let pipeline = get_event_pipeline();
    Json(ApiResponse::success(
        pipeline.get_published_events(),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/handlers",
    tag = "EventRoutes",
    operation_id = "list_handlers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_handlers() -> Json<ApiResponse<HandlersResponse>> {
    let pipeline = get_event_pipeline();
    let handlers = pipeline.get_router().list_handlers();
    let count = handlers.len();
    Json(ApiResponse::success(
        HandlersResponse { handlers, count },
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/event",
    tag = "EventRoutes",
    operation_id = "route_event",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/events",
    tag = "EventRoutes",
    operation_id = "process_events",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn process_events(
    Json(req): Json<ProcessEventsRequest>,
) -> Json<ApiResponse<PipelineResult>> {
    let pipeline = get_event_pipeline();
    let result = pipeline.process_events(&req.events).await;
    Json(ApiResponse::success(result, "处理完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/sagas",
    tag = "EventRoutes",
    operation_id = "list_sagas",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_sagas() -> Json<ApiResponse<SagasListResponse>> {
    let pipeline = get_event_pipeline();
    let items = pipeline.get_saga_coordinator().list_sagas(None).await;
    let total = items.len();
    Json(ApiResponse::success(
        SagasListResponse { items, total },
        "查询成功",
    ))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/sagas/{saga_id}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("saga_id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Events & Sagas",
    operation_id = "get_saga",
)]

async fn get_saga(Path(saga_id): Path<String>) -> Json<ApiResponse<SagaInstance>> {
    let pipeline = get_event_pipeline();
    match pipeline.get_saga_coordinator().get_saga(&saga_id).await {
        Some(instance) => Json(ApiResponse::success(instance, "查询成功")),
        None => Json(ApiResponse::error(404, &format!("Saga {} 未找到", saga_id))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/saga",
    tag = "EventRoutes",
    operation_id = "start_saga",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/saga",
    tag = "EventRoutes",
    operation_id = "compensate_saga",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/saga_stats",
    tag = "EventRoutes",
    operation_id = "saga_stats",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn saga_stats() -> Json<ApiResponse<SagaStats>> {
    let pipeline = get_event_pipeline();
    Json(ApiResponse::success(
        pipeline.get_saga_coordinator().get_stats(),
        "查询成功",
    ))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/pipeline/stats",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Events & Sagas",
    operation_id = "pipeline_stats",
)]

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::events::VoucherCreatedEvent;
    use crate::domain::saga::{SagaAction, SagaActionType, SagaInstance, SagaStep, SagaStepStatus};
    use chrono::Utc;
    use serde::{Deserialize, Serialize};
    use serde_json::{from_value, to_value, Value};

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }
    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(v: &T) {
        let a = to_value(v).unwrap();
        let b: T = from_value(a.clone()).unwrap();
        let c = to_value(&b).unwrap();
        assert_eq!(a, c);
    }

    #[test]
    fn handlers_response_roundtrip() {
        roundtrip(&HandlersResponse {
            handlers: vec!["h1".into(), "h2".into()],
            count: 2,
        });
        roundtrip(&HandlersResponse {
            handlers: vec![],
            count: 0,
        });
    }

    #[test]
    fn route_event_request_roundtrip() {
        let evt = FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
            voucher_id: uid(),
            voucher_no: "V-001".into(),
            voucher_type: "journal".into(),
            total_amount: 123.45,
            created_by: "tester".into(),
            occurred_at: now(),
        });
        roundtrip(&RouteEventRequest {
            event: evt,
            aggregate_id: uid(),
        });
    }

    #[test]
    fn route_event_response_roundtrip() {
        let success = RouteResultDto {
            handler_name: "h".into(),
            success: true,
            error: None,
            side_effects_count: 0,
        };
        let failed = RouteResultDto {
            handler_name: "h".into(),
            success: false,
            error: Some("boom".into()),
            side_effects_count: 0,
        };
        roundtrip(&RouteEventResponse {
            results: vec![success, failed],
            handlers_invoked: 2,
        });
    }

    #[test]
    fn route_result_dto_roundtrip() {
        roundtrip(&RouteResultDto {
            handler_name: "h".into(),
            success: true,
            error: None,
            side_effects_count: 3,
        });
        roundtrip(&RouteResultDto {
            handler_name: "h".into(),
            success: false,
            error: Some("oops".into()),
            side_effects_count: 0,
        });
    }

    #[test]
    fn start_saga_request_roundtrip() {
        roundtrip(&StartSagaRequest {
            saga_type: "VoucherPosting".into(),
            payload: Value::from(uid()),
        });
    }

    #[test]
    fn start_saga_response_roundtrip() {
        roundtrip(&StartSagaResponse {
            saga_id: uid(),
            status: SagaStatus::Running,
        });
        roundtrip(&StartSagaResponse {
            saga_id: uid(),
            status: SagaStatus::Completed,
        });
    }

    #[test]
    fn compensate_saga_response_roundtrip() {
        roundtrip(&CompensateSagaResponse {
            saga_id: uid(),
            status: SagaStatus::Compensated,
        });
    }

    #[test]
    fn sagas_list_response_roundtrip() {
        roundtrip(&SagasListResponse {
            items: vec![],
            total: 0,
        });
        let step = SagaStep {
            id: uid(),
            name: "step-1".into(),
            action: SagaAction {
                action_type: SagaActionType::HttpPost,
                target_service: "fin".into(),
                endpoint: "/do".into(),
                payload: Value::Null,
            },
            compensation: SagaAction {
                action_type: SagaActionType::HttpPost,
                target_service: "fin".into(),
                endpoint: "/undo".into(),
                payload: Value::Null,
            },
            status: SagaStepStatus::Completed,
            started_at: Some(now()),
            completed_at: Some(now()),
            error: None,
        };
        let inst = SagaInstance {
            id: uid(),
            saga_type: "VoucherPosting".into(),
            status: SagaStatus::Completed,
            steps: vec![step],
            current_step: 1,
            started_at: now(),
            completed_at: Some(now()),
            correlation_id: uid(),
            payload: Value::from(42),
            result: Some(Value::from("ok")),
            error: None,
        };
        roundtrip(&SagasListResponse {
            items: vec![inst],
            total: 1,
        });
    }

    #[test]
    fn process_events_request_roundtrip() {
        let evt = FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
            voucher_id: uid(),
            voucher_no: "V-1".into(),
            voucher_type: "journal".into(),
            total_amount: 1.0,
            created_by: "u".into(),
            occurred_at: now(),
        });
        roundtrip(&ProcessEventsRequest {
            events: vec![(evt, uid())],
        });
    }
}
