use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::domain::async_projector::ProjectionProgress;
use crate::domain::cqrs::*;
use crate::domain::event_store::{EventMetadata, EventRecord, EventStore};
use crate::domain::materialized_view::*;
use crate::shared::AppState;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct VoucherSummaryQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ReceivableAgingQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CqrsStatsResponse {
    pub view_names: Vec<String>,
    pub voucher_summary_count: usize,
    pub receivable_aging_count: usize,
    pub event_count: usize,
    pub snapshot_count: usize,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct EventsQueryParams {
    pub aggregate_type: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedEventsResponse {
    pub items: Vec<EventRecord>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/cqrs/commands/create-voucher",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance CQRS",
    operation_id = "handle_create_voucher",
)]

async fn handle_create_voucher(
    Json(req): Json<CreateVoucherCommand>,
) -> Json<ApiResponse<CommandResult>> {
    let context = get_cqrs_context();
    let metadata = Some(EventMetadata {
        user_id: None,
        ..Default::default()
    });

    match context
        .command_handler
        .handle_create_voucher(req, metadata)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "创建凭证成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/handle_post_voucher",
    tag = "CqrsRoutes",
    operation_id = "handle_post_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn handle_post_voucher(
    Path(id): Path<String>,
    Json(req): Json<PostVoucherCommand>,
) -> Json<ApiResponse<CommandResult>> {
    let context = get_cqrs_context();
    let metadata = Some(EventMetadata {
        user_id: None,
        ..Default::default()
    });

    match context
        .command_handler
        .handle_post_voucher(&id, req, metadata)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "过账成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/handle_reverse_voucher/{id}",
    tag = "CqrsRoutes",
    operation_id = "handle_reverse_voucher",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn handle_reverse_voucher(
    Path(id): Path<String>,
    Json(req): Json<ReverseVoucherCommand>,
) -> Json<ApiResponse<CommandResult>> {
    let context = get_cqrs_context();
    let metadata = Some(EventMetadata {
        user_id: None,
        ..Default::default()
    });

    match context
        .command_handler
        .handle_reverse_voucher(&id, req, metadata)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "冲销成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/cqrs/views/voucher-summary",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = VoucherSummaryQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance CQRS",
    operation_id = "list_voucher_summary",
)]

async fn list_voucher_summary(
    Query(params): Query<VoucherSummaryQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<VoucherSummaryView>>> {
    let context = get_cqrs_context();
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);

    match context
        .voucher_summary_view
        .list(page, page_size, params.status)
        .await
    {
        Ok((items, total)) => {
            let paginated = PaginatedResponse::new(items, total, page, page_size);
            Json(ApiResponse::success(paginated, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/voucher_summary_by_id",
    tag = "CqrsRoutes",
    operation_id = "get_voucher_summary_by_id",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_voucher_summary_by_id(
    Path(id): Path<String>,
) -> Json<ApiResponse<Option<VoucherSummaryView>>> {
    let context = get_cqrs_context();
    match context.voucher_summary_view.get_by_id(&id).await {
        Ok(item) => Json(ApiResponse::success(item, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/receivable_aging",
    tag = "CqrsRoutes",
    operation_id = "list_receivable_aging",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_receivable_aging(
    Query(params): Query<ReceivableAgingQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<ReceivableAgingView>>> {
    let context = get_cqrs_context();
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);

    match context
        .receivable_aging_view
        .list(page, page_size, params.status)
        .await
    {
        Ok((items, total)) => {
            let paginated = PaginatedResponse::new(items, total, page, page_size);
            Json(ApiResponse::success(paginated, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/cqrs/events/{aggregate_id}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("aggregate_id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance CQRS",
    operation_id = "get_events",
)]

async fn get_events(Path(aggregate_id): Path<String>) -> Json<ApiResponse<Vec<EventRecord>>> {
    let context = get_cqrs_context();
    match context
        .event_store
        .read_events(&aggregate_id, 0, None)
        .await
    {
        Ok(events) => Json(ApiResponse::success(events, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/views",
    tag = "CqrsRoutes",
    operation_id = "rebuild_views",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn rebuild_views() -> Json<ApiResponse<()>> {
    let context = get_cqrs_context();
    match context.projector.rebuild_all().await {
        Ok(()) => Json(ApiResponse::success((), "重建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/stats",
    tag = "CqrsRoutes",
    operation_id = "get_stats",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_stats() -> Json<ApiResponse<CqrsStatsResponse>> {
    let context = get_cqrs_context();
    let view_names: Vec<String> = context
        .projector
        .view_names()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let (voucher_summary, _) = context
        .voucher_summary_view
        .list(1, 1, None)
        .await
        .unwrap_or((vec![], 0));
    let (receivable_aging, _) = context
        .receivable_aging_view
        .list(1, 1, None)
        .await
        .unwrap_or((vec![], 0));

    let event_count = 0;
    let snapshot_count = 0;

    let stats = CqrsStatsResponse {
        view_names,
        voucher_summary_count: voucher_summary.len(),
        receivable_aging_count: receivable_aging.len(),
        event_count,
        snapshot_count,
    };

    Json(ApiResponse::success(stats, "查询成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/cqrs/projection-progress",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance CQRS",
    operation_id = "get_projection_progress",
)]

async fn get_projection_progress(
    State(_pool): State<PgPool>,
) -> Json<ApiResponse<Vec<ProjectionProgress>>> {
    match get_pg_cqrs_context() {
        Some(ctx) => match ctx.async_projector.get_progress().await {
            Ok(progress) => Json(ApiResponse::success(progress, "查询成功")),
            Err(e) => Json(ApiResponse::error(500, &e)),
        },
        None => Json(ApiResponse::error(500, "PgCqrsContext 未初始化")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/events_paginated",
    tag = "CqrsRoutes",
    operation_id = "list_events_paginated",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_events_paginated(
    Query(params): Query<EventsQueryParams>,
) -> Json<ApiResponse<PaginatedEventsResponse>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let aggregate_type = params
        .aggregate_type
        .unwrap_or_else(|| "Voucher".to_string());

    match get_pg_cqrs_context() {
        Some(ctx) => match ctx
            .event_store
            .get_events_by_type(&aggregate_type, page, page_size)
            .await
        {
            Ok((items, total)) => {
                let response = PaginatedEventsResponse {
                    items,
                    total,
                    page,
                    page_size,
                };
                Json(ApiResponse::success(response, "查询成功"))
            }
            Err(e) => Json(ApiResponse::error(500, &e)),
        },
        None => Json(ApiResponse::error(500, "PgCqrsContext 未初始化")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/view",
    tag = "CqrsRoutes",
    operation_id = "replay_view",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn replay_view(Path(view_name): Path<String>) -> Json<ApiResponse<()>> {
    match get_pg_cqrs_context() {
        Some(ctx) => match ctx.async_projector.replay_view(&view_name).await {
            Ok(()) => Json(ApiResponse::success((), "重放成功")),
            Err(e) => Json(ApiResponse::error(500, &e)),
        },
        None => Json(ApiResponse::error(500, "PgCqrsContext 未初始化")),
    }
}

pub fn cqrs_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/commands/create-voucher",
            axum::routing::post(handle_create_voucher),
        )
        .route(
            "/commands/post-voucher/{id}",
            axum::routing::post(handle_post_voucher),
        )
        .route(
            "/commands/reverse-voucher/{id}",
            axum::routing::post(handle_reverse_voucher),
        )
        .route(
            "/views/voucher-summary",
            axum::routing::get(list_voucher_summary),
        )
        .route(
            "/views/voucher-summary/{id}",
            axum::routing::get(get_voucher_summary_by_id),
        )
        .route(
            "/views/receivable-aging",
            axum::routing::get(list_receivable_aging),
        )
        .route("/events/{aggregate_id}", axum::routing::get(get_events))
        .route("/views/rebuild", axum::routing::post(rebuild_views))
        .route("/stats", axum::routing::get(get_stats))
        .route(
            "/projection-progress",
            axum::routing::get(get_projection_progress),
        )
        .route("/events", axum::routing::get(list_events_paginated))
        .route(
            "/views/replay/{view_name}",
            axum::routing::post(replay_view),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::event_store::{EventMetadata, EventRecord};
    use crate::domain::events::{FinanceDomainEvent, VoucherCreatedEvent};
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
    fn cqrs_stats_response_roundtrip() {
        roundtrip(&CqrsStatsResponse {
            view_names: vec!["v1".into(), "v2".into()],
            voucher_summary_count: 10,
            receivable_aging_count: 5,
            event_count: 100,
            snapshot_count: 3,
        });
        roundtrip(&CqrsStatsResponse {
            view_names: vec![],
            voucher_summary_count: 0,
            receivable_aging_count: 0,
            event_count: 0,
            snapshot_count: 0,
        });
    }

    #[test]
    fn paginated_events_response_roundtrip() {
        let evt = FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
            voucher_id: uid(),
            voucher_no: "V-001".into(),
            voucher_type: "journal".into(),
            total_amount: 100.0,
            created_by: "u".into(),
            occurred_at: now(),
        });
        let record = EventRecord {
            id: uid(),
            aggregate_id: uid(),
            aggregate_type: "Voucher".into(),
            event_type: "VoucherCreated".into(),
            version: 1,
            payload: evt,
            metadata: EventMetadata {
                causation_id: None,
                correlation_id: Some(uid()),
                user_id: Some("u".into()),
                ip_address: None,
                extra: Value::Null,
            },
            occurred_at: now(),
        };
        roundtrip(&PaginatedEventsResponse {
            items: vec![record],
            total: 1,
            page: 1,
            page_size: 20,
        });
        roundtrip(&PaginatedEventsResponse {
            items: vec![],
            total: 0,
            page: 1,
            page_size: 20,
        });
    }
}
