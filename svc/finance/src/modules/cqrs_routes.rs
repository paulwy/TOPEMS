use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::async_projector::ProjectionProgress;
use crate::domain::cqrs::*;
use crate::domain::event_store::{EventMetadata, EventRecord, EventStore};
use crate::domain::materialized_view::*;
use crate::shared::AppState;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
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
    security(("BearerAuth" = ["finance:voucher:create"])),
    path = "/finance/cqrs/commands/create-voucher",
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

pub async fn handle_create_voucher(
    Json(req): Json<CreateVoucherCommand>,
) -> ApiResponse<CommandResult> {
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
        Ok(result) => ApiResponse::success(result, "创建凭证成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/commands/post-voucher/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "post /api/finance/commands/post-voucher/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn handle_post_voucher(
    Path(id): Path<String>,
    Json(req): Json<PostVoucherCommand>,
) -> ApiResponse<CommandResult> {
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
        Ok(result) => ApiResponse::success(result, "过账成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/commands/reverse-voucher/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "post /api/finance/commands/reverse-voucher/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn handle_reverse_voucher(
    Path(id): Path<String>,
    Json(req): Json<ReverseVoucherCommand>,
) -> ApiResponse<CommandResult> {
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
        Ok(result) => ApiResponse::success(result, "冲销成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/cqrs/views/voucher-summary",
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

pub async fn list_voucher_summary(
    Query(params): Query<VoucherSummaryQueryParams>,
) -> ApiResponse<PaginatedResponse<VoucherSummaryView>> {
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
            ApiResponse::success(paginated, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/views/voucher-summary/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get /api/finance/views/voucher-summary/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_voucher_summary_by_id(
    Path(id): Path<String>,
) -> ApiResponse<Option<VoucherSummaryView>> {
    let context = get_cqrs_context();
    match context.voucher_summary_view.get_by_id(&id).await {
        Ok(item) => ApiResponse::success(item, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/views/receivable-aging",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/views/receivable-aging"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_receivable_aging(
    Query(params): Query<ReceivableAgingQueryParams>,
) -> ApiResponse<PaginatedResponse<ReceivableAgingView>> {
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
            ApiResponse::success(paginated, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/cqrs/events/{aggregate_id}",
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

pub async fn get_events(Path(aggregate_id): Path<String>) -> ApiResponse<Vec<EventRecord>> {
    let context = get_cqrs_context();
    match context
        .event_store
        .read_events(&aggregate_id, 0, None)
        .await
    {
        Ok(events) => ApiResponse::success(events, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/views/rebuild",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/views/rebuild"), (status = 500, description = "服务内部错误")),
)]
pub async fn rebuild_views() -> ApiResponse<()> {
    let context = get_cqrs_context();
    match context.projector.rebuild_all().await {
        Ok(()) => ApiResponse::success((), "重建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/stats",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/stats"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_stats() -> ApiResponse<CqrsStatsResponse> {
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

    ApiResponse::success(stats, "查询成功")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/cqrs/projection-progress",
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

pub async fn get_projection_progress(
    State(_state): State<AppState>,
) -> ApiResponse<Vec<ProjectionProgress>> {
    match get_pg_cqrs_context() {
        Some(ctx) => match ctx.async_projector.get_progress().await {
            Ok(progress) => ApiResponse::success(progress, "查询成功"),
            Err(e) => crate::shared::err_resp(e),
        },
        None => ApiResponse::server_error("PgCqrsContext 未初始化"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/events",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/events"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_events_paginated(
    Query(params): Query<EventsQueryParams>,
) -> ApiResponse<PaginatedEventsResponse> {
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
                ApiResponse::success(response, "查询成功")
            }
            Err(e) => crate::shared::err_resp(e),
        },
        None => ApiResponse::server_error("PgCqrsContext 未初始化"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/finance/cqrs/views/replay/{view_name}",
    tag = "Auto-Backfill",
    params(
        ("view_name" = String, Path, description = "view_name"),
    ),
    responses((status = 200, description = "post /api/finance/views/replay/{view_name}"), (status = 500, description = "服务内部错误")),
)]
pub async fn replay_view(Path(view_name): Path<String>) -> ApiResponse<()> {
    match get_pg_cqrs_context() {
        Some(ctx) => match ctx.async_projector.replay_view(&view_name).await {
            Ok(()) => ApiResponse::success((), "重放成功"),
            Err(e) => crate::shared::err_resp(e),
        },
        None => ApiResponse::server_error("PgCqrsContext 未初始化"),
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
        // 批 41：CQRS 视图/事件流路由统一挂 finance:event:read 细码（纵深防御；
        // 写端点在网关层 require_finance_write 已要求 finance:admin）
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:event:read"),
        ))
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
