use axum::{
    extract::{Json, Path, Query, State},
    Extension, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::*;
use crate::services::ReconciliationService;
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/reconciliation/sessions",
            axum::routing::post(create_session_handler),
        )
        .route(
            "/reconciliation/sessions",
            axum::routing::get(list_sessions_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}",
            axum::routing::get(get_session_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/items",
            axum::routing::get(get_items_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/items/import",
            axum::routing::post(import_items_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/match",
            axum::routing::post(auto_match_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/complete",
            axum::routing::post(complete_session_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/summary",
            axum::routing::get(get_summary_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/report",
            axum::routing::get(get_report_handler),
        )
        .route(
            "/reconciliation/sessions/{session_id}/diff-stats",
            axum::routing::get(get_diff_statistics_handler),
        )
        .route(
            "/reconciliation/items/{item_id}/diff",
            axum::routing::put(update_diff_handler),
        )
        .route(
            "/reconciliation/items/diff/batch",
            axum::routing::post(batch_update_diff_handler),
        )
        .route(
            "/reconciliation/aging",
            axum::routing::get(get_aging_handler),
        )
}

async fn create_session_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReconciliationSessionRequest>,
) -> Json<ApiResponse<ReconciliationSession>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();

    match service.create_session(tenant_id, req, &created_by).await {
        Ok(session) => Json(ApiResponse::success(session, "对账会话创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_session_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationSession>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.get_session(tenant_id, session_id).await {
        Ok(session) => Json(ApiResponse::success(session, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_sessions_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReconciliationSessionListQuery>,
) -> Json<ApiResponse<ReconciliationSessionListResponse>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);

    match service
        .list_sessions(tenant_id, params.reco_type, params.status, page, page_size)
        .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            ReconciliationSessionListResponse {
                items,
                total,
                page,
                page_size,
            },
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn import_items_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
    Json(mut req): Json<ImportReconciliationItemsRequest>,
) -> Json<ApiResponse<i32>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);
    req.session_id = session_id;

    match service.import_items(tenant_id, req).await {
        Ok(count) => Json(ApiResponse::success(count, "导入成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn auto_match_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
) -> Json<ApiResponse<MatchResult>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.auto_match(tenant_id, session_id).await {
        Ok(result) => Json(ApiResponse::success(result, "自动匹配完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn complete_session_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationSession>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.complete_session(tenant_id, session_id).await {
        Ok(session) => Json(ApiResponse::success(session, "对账会话已完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[axum::debug_handler]
async fn get_items_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
    Query(params): Query<ItemsQueryParams>,
) -> Json<ApiResponse<Vec<ReconciliationItem>>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    let source_type = params.source_type.as_ref().and_then(|s| match s.as_str() {
        "bank" => Some(ItemSource::Bank),
        "erp" => Some(ItemSource::Erp),
        _ => None,
    });
    let match_status = params.match_status.as_ref().and_then(|s| match s.as_str() {
        "unmatched" => Some(MatchStatus::Unmatched),
        "matched" => Some(MatchStatus::Matched),
        "diff" => Some(MatchStatus::Diff),
        "manual" => Some(MatchStatus::Manual),
        _ => None,
    });

    match service
        .get_items(tenant_id, session_id, source_type, match_status)
        .await
    {
        Ok(items) => Json(ApiResponse::success(items, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationSummary>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.get_summary(tenant_id, session_id).await {
        Ok(summary) => Json(ApiResponse::success(summary, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_diff_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(item_id): Path<Uuid>,
    Json(req): Json<UpdateDiffRequest>,
) -> Json<ApiResponse<ReconciliationItem>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service
        .update_diff(tenant_id, item_id, req.diff_reason, req.notes)
        .await
    {
        Ok(item) => Json(ApiResponse::success(item, "差异标记成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ItemsQueryParams {
    pub source_type: Option<String>,
    pub match_status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgingQueryParams {
    pub as_of_date: Option<String>,
    pub direction: String,
}

async fn get_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationReport>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.get_report(tenant_id, session_id).await {
        Ok(report) => {
            // V15 Phase 5+: 差异项 > 0 时自动创建工单
            if report.diff_items > 0 {
                let _ = create_ticket_for_reconciliation(&report, &claims).await;
            }
            Json(ApiResponse::success(report, "对账报告生成成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 对账差异自动开单：调用 unified-core ticket API
async fn create_ticket_for_reconciliation(
    report: &ReconciliationReport,
    claims: &Claims,
) -> Result<(), String> {
    let core_url = std::env::var("UNIFIED_CORE_URL")
        .or_else(|_| std::env::var("CORE_URL"))
        .unwrap_or_else(|_| "http://localhost:8000".to_string());

    let severity = if report.diff_items >= 10 {
        "critical"
    } else if report.diff_items >= 5 {
        "high"
    } else {
        "medium"
    };

    let title = format!(
        "对账差异工单 [{}] - 差异 {} 项",
        report.session_no, report.diff_items
    );

    let description = format!(
        "对账类型: {}\n期间: {} ~ {}\n差异项: {}\n差异金额: {}\n未匹配项: {}\n完成率: {:.1}%",
        report.reco_type,
        report.period_start,
        report.period_end,
        report.diff_items,
        report.total_diff_amount,
        report.unmatched_items,
        report.match_rate
    );

    let body = serde_json::json!({
        "title": title,
        "description": description,
        "ticket_type": "reconciliation_diff",
        "severity": severity,
        "source_service": "finance",
        "source_business_id": report.session_id.to_string(),
        "sla_hours": 24,
        "tags": ["reconciliation", "auto-created"],
        "metadata": {
            "session_no": report.session_no,
            "reco_type": report.reco_type,
            "period_start": report.period_start.to_string(),
            "period_end": report.period_end.to_string(),
            "diff_items": report.diff_items,
            "diff_amount": report.total_diff_amount.to_string(),
            "match_rate": report.match_rate,
        }
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let url = format!("{}/api/core/master/tickets", core_url.trim_end_matches('/'));

    let mut req = client.post(&url).json(&body);
    if let Some(tid) = &claims.tenant_id {
        req = req.header("x-tenant-id", tid);
    }
    if !claims.sub.is_empty() {
        req = req.header("x-user-id", &claims.sub);
    }

    match req.send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                tracing::debug!("对账差异工单自动创建成功: session_id={}", report.session_id);
                Ok(())
            } else {
                let text = resp.text().await.unwrap_or_default();
                tracing::warn!("对账差异工单创建失败: {}", text);
                Err(text)
            }
        }
        Err(e) => {
            tracing::warn!("对账差异工单创建请求失败: {}", e);
            Err(e.to_string())
        }
    }
}

async fn batch_update_diff_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchDiffRequest>,
) -> Json<ApiResponse<BatchDiffResponse>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.batch_update_diff(tenant_id, req).await {
        Ok(resp) => Json(ApiResponse::success(resp, "批量差异处理完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_diff_statistics_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(session_id): Path<Uuid>,
) -> Json<ApiResponse<DiffStatistics>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    match service.get_diff_statistics(tenant_id, session_id).await {
        Ok(stats) => Json(ApiResponse::success(stats, "差异统计查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_aging_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AgingQueryParams>,
) -> Json<ApiResponse<AgingReport>> {
    let service = ReconciliationService::new(state.pool.clone());
    let tenant_id = get_tenant_id(&claims);

    let as_of_date = match params.as_of_date {
        Some(s) => chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Utc::now().date_naive()),
        None => chrono::Utc::now().date_naive(),
    };
    let direction = match params.direction.as_str() {
        "receivable" | "payable" => params.direction.clone(),
        _ => "payable".to_string(), // 默认应付
    };

    match service.get_aging(tenant_id, as_of_date, &direction).await {
        Ok(report) => Json(ApiResponse::success(report, "账龄分析查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}
