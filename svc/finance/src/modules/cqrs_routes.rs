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
use topems_shared::{ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct VoucherSummaryQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
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

#[derive(Debug, Deserialize)]
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

async fn get_voucher_summary_by_id(
    Path(id): Path<String>,
) -> Json<ApiResponse<Option<VoucherSummaryView>>> {
    let context = get_cqrs_context();
    match context.voucher_summary_view.get_by_id(&id).await {
        Ok(item) => Json(ApiResponse::success(item, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

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

async fn rebuild_views() -> Json<ApiResponse<()>> {
    let context = get_cqrs_context();
    match context.projector.rebuild_all().await {
        Ok(()) => Json(ApiResponse::success((), "重建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

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
            "/commands/post-voucher/:id",
            axum::routing::post(handle_post_voucher),
        )
        .route(
            "/commands/reverse-voucher/:id",
            axum::routing::post(handle_reverse_voucher),
        )
        .route(
            "/views/voucher-summary",
            axum::routing::get(list_voucher_summary),
        )
        .route(
            "/views/voucher-summary/:id",
            axum::routing::get(get_voucher_summary_by_id),
        )
        .route(
            "/views/receivable-aging",
            axum::routing::get(list_receivable_aging),
        )
        .route("/events/:aggregate_id", axum::routing::get(get_events))
        .route("/views/rebuild", axum::routing::post(rebuild_views))
        .route("/stats", axum::routing::get(get_stats))
        .route(
            "/projection-progress",
            axum::routing::get(get_projection_progress),
        )
        .route("/events", axum::routing::get(list_events_paginated))
        .route("/views/replay/:view_name", axum::routing::post(replay_view))
}
