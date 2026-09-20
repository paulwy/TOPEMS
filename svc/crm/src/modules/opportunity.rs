use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{Datelike, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateOpportunityRequest, Opportunity, UpdateOpportunityRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OppStage {
    Draft,
    Lead,
    Qualified,
    Proposal,
    Negotiation,
    Won,
    Lost,
    Closed,
}

impl OppStage {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "draft" => Some(Self::Draft),
            "lead" => Some(Self::Lead),
            "qualified" => Some(Self::Qualified),
            "proposal" => Some(Self::Proposal),
            "negotiation" => Some(Self::Negotiation),
            "won" => Some(Self::Won),
            "lost" => Some(Self::Lost),
            "closed" => Some(Self::Closed),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Lead => "lead",
            Self::Qualified => "qualified",
            Self::Proposal => "proposal",
            Self::Negotiation => "negotiation",
            Self::Won => "won",
            Self::Lost => "lost",
            Self::Closed => "closed",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Won | Self::Lost | Self::Closed)
    }
}

pub fn can_transition(
    from: OppStage,
    to: OppStage,
    is_owner_or_admin: bool,
) -> Result<(), &'static str> {
    use OppStage::*;
    if !is_owner_or_admin {
        return Err("NOT_OWNER");
    }
    if from.is_terminal() {
        return Err("TERMINAL_CANNOT_TRANSITION");
    }
    let ok_advance = matches!(
        (from, to),
        (Draft, Lead)
            | (Lead, Qualified)
            | (Qualified, Proposal)
            | (Proposal, Negotiation)
            | (Negotiation, Won)
            | (Negotiation, Lost)
            | (Negotiation, Closed)
    );
    let ok_rollback = matches!(
        (from, to),
        (Qualified, Lead) | (Proposal, Qualified) | (Negotiation, Proposal)
    );
    if ok_advance || ok_rollback {
        Ok(())
    } else {
        Err("INVALID_TRANSITION")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelStage {
    pub stage: String,
    pub stage_label: String,
    pub count: i64,
    pub total_value: Option<f64>,
    pub avg_probability: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityStats {
    pub total_count: i64,
    pub total_value: Option<f64>,
    pub weighted_value: Option<f64>,
    pub won_count: i64,
    pub won_value: Option<f64>,
    pub lost_count: i64,
    pub lost_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StageTransition {
    pub from_stage: String,
    pub to_stage: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityForecast {
    pub forecast_month: String,
    pub forecast_value: f64,
    pub opportunity_count: i64,
    pub avg_probability: f64,
}

#[derive(Debug, Deserialize)]
pub struct ForecastParams {
    pub months: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct OpportunityPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub stage: Option<String>,
    pub customer_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/opportunities",
            get(list_opportunities).post(create_opportunity),
        )
        .route(
            "/opportunities/batch-delete",
            post(batch_delete_opportunities),
        )
        .route(
            "/opportunities/{id}",
            get(get_opportunity)
                .put(update_opportunity)
                .delete(delete_opportunity),
        )
        .route("/opportunities/{id}/advance", post(advance_opportunity))
        .route("/opportunities/{id}/rollback", post(rollback_opportunity))
        .route("/opportunities/funnel", get(get_sales_funnel))
        .route("/opportunities/stats", get(get_opportunity_stats))
        .route("/opportunities/forecast", get(get_opportunity_forecast))
        .route(
            "/opportunities/stage-transitions",
            get(get_stage_transitions),
        )
}

/// 单条商机详情缓存 key（含 tenant_id 做租户隔离）
fn opportunity_detail_cache_key(tenant_id: Uuid, id: Uuid) -> String {
    format!("crm:opportunity:{}:{}", tenant_id, id)
}

/// 商机列表缓存 key（含 tenant_id 与查询参数 hash）
fn opportunity_list_cache_key(
    tenant_id: Uuid,
    page: i64,
    page_size: i64,
    search: &Option<String>,
    stage: &Option<String>,
    customer_id: &Option<Uuid>,
) -> String {
    format!(
        "crm:opportunity:list:{}:page:{}:size:{}:search:{:?}:stage:{:?}:customer:{:?}",
        tenant_id, page, page_size, search, stage, customer_id
    )
}

/// 商机数据变更后失效本地缓存并发布跨实例失效事件
async fn invalidate_opportunity_cache(state: &ApiState, reason: &str) {
    state.opportunity_cache.clear_l1();
    if let Some(publisher) = &state.event_publisher {
        if let Err(e) = publisher
            .publish_cache_invalidated("crm:opportunity:*", "pattern", Some(reason))
            .await
        {
            tracing::warn!("发布商机缓存失效事件失败: {}", e);
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:read"])),
    path = "/opportunities",
    tag = "opportunity",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("stage" = Option<String>, Query, description = "阶段过滤"),
        ("customer_id" = Option<Uuid>, Query, description = "客户ID过滤"),
    ),
    responses(
        (status = 200, description = "商机列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_opportunities(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<OpportunityPaginationParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let stage_filter = params.stage.clone();
    let customer_filter = params.customer_id;
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    // 缓存命中则直接返回
    let list_cache_key = opportunity_list_cache_key(
        tenant_id,
        page,
        page_size,
        &params.search,
        &stage_filter,
        &customer_filter,
    );
    if let Some(cached) = state.opportunity_cache.get(&list_cache_key).await {
        tracing::debug!("📋 商机列表缓存命中: {}", list_cache_key);
        return Json(ApiResponse::success(cached, "获取销售机会列表成功"));
    }

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, probability, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        FROM crm.opportunities
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR name ILIKE $2)
          AND ($3::text IS NULL OR stage = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&stage_filter)
    .bind(customer_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(opportunities) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.opportunities
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2)
                  AND ($3::text IS NULL OR stage = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&stage_filter)
            .bind(customer_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            let data = serde_json::json!({
                "items": opportunities,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            // 回填缓存
            state.opportunity_cache.set(list_cache_key, data.clone()).await;

            Json(ApiResponse::success(data, "获取销售机会列表成功"))
        }
        Err(e) => {
            tracing::error!("获取销售机会列表失败: {}", e);
            Json(api_error(500, "获取销售机会列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:opportunity:write"])),
    path = "/opportunities",
    tag = "opportunity",
    request_body = CreateOpportunityRequest,
    responses(
        (status = 200, description = "商机创建成功", body = ApiResponse<Opportunity>),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_opportunity(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(api_error(400, "销售机会名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("valid org uuid");

    let opp_no = if req.opp_no.is_empty() {
        format!("OPP-{}", now.timestamp())
    } else {
        req.opp_no.clone()
    };
    let stage = "draft".to_string();
    let priority = req.priority.clone().unwrap_or_else(|| "medium".into());
    let status = "open".to_string();

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        INSERT INTO crm.opportunities (
            id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, probability, close_date, owner_id, status, notes, created_at, updated_at, org_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, probability, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&opp_no)
    .bind(&req.name)
    .bind(req.customer_id)
    .bind(&req.customer_name)
    .bind(&stage)
    .bind(&priority)
    .bind(req.value)
    .bind(req.win_rate)
    .bind(req.close_date)
    .bind(req.owner_id)
    .bind(&status)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .bind(org_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opportunity) => (
            Json(ApiResponse::success(
                opportunity.clone(),
                "销售机会创建成功",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
        // 创建商机后失效商机列表缓存
        invalidate_opportunity_cache(&state, "opportunity_created").await;
    }

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(opportunity) = &result {
        serde_json::to_value(opportunity).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "opportunity".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn get_opportunity(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Opportunity>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    // 缓存命中则直接返回
    let detail_key = opportunity_detail_cache_key(tenant_id, id);
    if let Some(cached) = state.opportunity_cache.get(&detail_key).await {
        match serde_json::from_value::<Opportunity>(cached) {
            Ok(opportunity) => {
                tracing::debug!("📋 商机详情缓存命中: {}", detail_key);
                return Json(ApiResponse::success(opportunity, "获取销售机会成功"));
            }
            Err(_) => {
                tracing::warn!("商机详情缓存反序列化失败，回源查询");
            }
        }
    }

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, probability, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        FROM crm.opportunities WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(opportunity)) => {
            if let Ok(value) = serde_json::to_value(&opportunity) {
                state.opportunity_cache.set(detail_key, value).await;
            }
            Json(ApiResponse::success(opportunity, "获取销售机会成功"))
        }
        Ok(None) => Json(api_error(404, "销售机会不存在")),
        Err(e) => {
            tracing::error!("获取销售机会失败: {}", e);
            Json(api_error(500, "获取销售机会失败"))
        }
    }
}

async fn update_opportunity(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let existing = sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, tenant_id, name, customer_id, value, stage, probability, close_date, notes, created_at, updated_at FROM crm.opportunities WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "销售机会不存在")),
        Err(e) => return Json(api_error(500, &format!("查询销售机会失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let customer_id = req.customer_id.or(existing.customer_id);
    let customer_name = req.customer_name.or(existing.customer_name);
    let value = req.value.or(existing.value);
    let stage = req.stage.unwrap_or(existing.stage);
    let win_rate = req.win_rate.or(existing.win_rate);
    let close_date = req.close_date.or(existing.close_date);
    let owner_id = req.owner_id.or(existing.owner_id);
    let priority = req.priority.unwrap_or(existing.priority);
    let status = req.status.unwrap_or(existing.status);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        UPDATE crm.opportunities SET
            name = $2, customer_id = $3, customer_name = $4, value = $5, stage = $6, priority = $7, probability = $8,
            close_date = $9, owner_id = $10, status = $11, notes = $12, updated_at = $13
        WHERE id = $1 AND tenant_id = $14
        RETURNING id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, probability, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(customer_id)
    .bind(&customer_name)
    .bind(value)
    .bind(&stage)
    .bind(&priority)
    .bind(win_rate)
    .bind(close_date)
    .bind(owner_id)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opportunity) => (
            Json(ApiResponse::success(
                opportunity.clone(),
                "销售机会更新成功",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
        // 更新商机后失效商机详情与列表缓存
        invalidate_opportunity_cache(&state, "opportunity_updated").await;
    }

    let response_data = if let Ok(opportunity) = &result {
        serde_json::to_value(opportunity).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "opportunity".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn delete_opportunity(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query(
        "UPDATE crm.opportunities SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    // 删除成功后失效缓存
    if matches!(&result, Ok(r) if r.rows_affected() > 0) {
        invalidate_opportunity_cache(&state, "opportunity_deleted").await;
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "销售机会删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "销售机会不存在")),
            "error".to_string(),
            Some("销售机会不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除销售机会失败: {}", e);
            (
                Json(api_error(500, "销售机会删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "opportunity".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn batch_delete_opportunities(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的销售机会"));
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query(
        "UPDATE crm.opportunities SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    // 批量删除成功后失效缓存
    if result.is_ok() {
        invalidate_opportunity_cache(&state, "opportunity_batch_deleted").await;
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                "".to_string(),
                &format!("成功删除 {} 个销售机会", r.rows_affected()),
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除销售机会失败: {}", e);
            (
                Json(api_error(500, "批量删除销售机会失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "batch_delete".to_string(),
            entity_type: "opportunity".to_string(),
            entity_id: None,
            entity_ids: serde_json::to_value(&req.ids).ok(),
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn get_sales_funnel(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<FunnelStage>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let stages = vec![
        ("prospecting", "线索"),
        ("qualified", "合格"),
        ("proposal", "提案"),
        ("negotiation", "谈判"),
        ("closed_won", "赢单"),
        ("closed_lost", "输单"),
    ];

    let mut funnel_stages = Vec::new();

    for (stage, stage_label) in stages {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = $2",
        )
        .bind(tenant_id)
        .bind(stage)
        .fetch_one(&mut **txn)
        .await
        .unwrap_or(0);

        let total_value: Option<f64> = sqlx::query_scalar(
            "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = $2 AND value IS NOT NULL"
        )
        .bind(tenant_id)
        .bind(stage)
        .fetch_optional(&mut **txn)
        .await
        .unwrap_or(Some(0.0));

        let avg_probability: Option<f64> = sqlx::query_scalar(
            "SELECT COALESCE(AVG(probability), 0) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = $2 AND probability IS NOT NULL"
        )
        .bind(tenant_id)
        .bind(stage)
        .fetch_optional(&mut **txn)
        .await
        .unwrap_or(Some(0.0));

        funnel_stages.push(FunnelStage {
            stage: stage.to_string(),
            stage_label: stage_label.to_string(),
            count,
            total_value,
            avg_probability,
        });
    }

    Json(ApiResponse::success(funnel_stages, "获取销售漏斗成功"))
}

async fn get_opportunity_stats(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<OpportunityStats>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let total_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let total_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND value IS NOT NULL",
    )
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(Some(0.0));

    let weighted_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value * probability / 100), 0) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND value IS NOT NULL AND probability IS NOT NULL"
    )
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(Some(0.0));

    let won_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = 'closed_won'",
    )
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let won_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = 'closed_won' AND value IS NOT NULL"
    )
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(Some(0.0));

    let lost_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = 'closed_lost'",
    )
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let lost_value: Option<f64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE deleted_at IS NULL AND tenant_id = $1 AND stage = 'closed_lost' AND value IS NOT NULL"
    )
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(Some(0.0));

    let stats = OpportunityStats {
        total_count,
        total_value,
        weighted_value,
        won_count,
        won_value,
        lost_count,
        lost_value,
    };

    Json(ApiResponse::success(stats, "获取商机统计成功"))
}

async fn get_opportunity_forecast(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ForecastParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<OpportunityForecast>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    let months = params.months.unwrap_or(12).clamp(1, 24);

    let mut forecasts = Vec::new();

    for i in 0..months as usize {
        let forecast_month = Utc::now() + chrono::Duration::days(i as i64 * 30);
        let month_start = if let Some(day1) = forecast_month.date_naive().with_day(1) {
            if let Some(dt) = day1.and_hms_opt(0, 0, 0) {
                Utc.from_utc_datetime(&dt)
            } else {
                forecast_month
            }
        } else {
            forecast_month
        };
        let month_end = month_start + chrono::Duration::days(31);

        let forecast_value: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(value * probability / 100), 0) 
            FROM crm.opportunities 
            WHERE tenant_id = $1 AND close_date >= $2 AND close_date < $3 AND stage NOT IN ('closed_won', 'closed_lost')
            "#,
        )
        .bind(tenant_id)
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&mut **txn)
        .await
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0);

        let opportunity_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) 
            FROM crm.opportunities 
            WHERE tenant_id = $1 AND close_date >= $2 AND close_date < $3 AND stage NOT IN ('closed_won', 'closed_lost')
            "#,
        )
        .bind(tenant_id)
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&mut **txn)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0);

        let avg_probability: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(AVG(probability), 0) 
            FROM crm.opportunities 
            WHERE tenant_id = $1 AND close_date >= $2 AND close_date < $3 AND stage NOT IN ('closed_won', 'closed_lost') AND probability IS NOT NULL
            "#,
        )
        .bind(tenant_id)
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&mut **txn)
        .await
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0);

        forecasts.push(OpportunityForecast {
            forecast_month: forecast_month.format("%Y-%m").to_string(),
            forecast_value,
            opportunity_count,
            avg_probability,
        });
    }

    Json(ApiResponse::success(forecasts, "获取商机预测成功"))
}

async fn get_stage_transitions(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<StageTransition>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let transitions: Vec<StageTransition> = sqlx::query_as(
        r#"
        SELECT stage AS from_stage, stage AS to_stage, COUNT(*) as count
        FROM crm.opportunities
        WHERE tenant_id = $1
        GROUP BY stage
        ORDER BY count DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(transitions, "获取阶段转换统计成功"))
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AdvanceOpportunityRequest {
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RollbackOpportunityRequest {
    pub note: Option<String>,
    pub reason: Option<String>,
}

fn next_advance_stage(from: OppStage) -> OppStage {
    use OppStage::*;
    match from {
        Draft => Lead,
        Lead => Qualified,
        Qualified => Proposal,
        Proposal => Negotiation,
        Negotiation => Won,
        _ => from,
    }
}

fn prev_stage(from: OppStage) -> OppStage {
    use OppStage::*;
    match from {
        Qualified => Lead,
        Proposal => Qualified,
        Negotiation => Proposal,
        _ => from,
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:opportunity:write"])),
    path = "/opportunities/{id}/advance",
    params(("id" = Uuid, Path, description = "Opportunity id to advance stage")),
    request_body = AdvanceOpportunityRequest,
    responses(
        (status = 200, description = "Opportunity stage advanced (e.g. Lead → Qualified)"),
        (status = 400, description = "CRM::INVALID_TRANSITION / CRM::TERMINAL_CANNOT_TRANSITION"),
        (status = 403, description = "CRM::NOT_OWNER"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:opportunity:write"])),
    tag = "opportunity"
)]
async fn advance_opportunity(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<AdvanceOpportunityRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let existing = match sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, win_rate, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        FROM crm.opportunities WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "商机不存在")),
        Err(e) => return Json(api_error(500, &format!("查询商机失败: {}", e))),
    };

    let is_owner_or_admin = true;

    let from_stage = match OppStage::from_str(&existing.stage) {
        Some(s) => s,
        None => return Json(api_error(400, &format!("未知商机阶段: {}", existing.stage))),
    };
    let to_stage = next_advance_stage(from_stage);

    match can_transition(from_stage, to_stage, is_owner_or_admin) {
        Ok(_) => {}
        Err("NOT_OWNER") => return Json(api_error(403, "仅负责人或管理员可推进阶段")),
        Err("TERMINAL_CANNOT_TRANSITION") => return Json(api_error(400, "终态商机不可推进")),
        Err("INVALID_TRANSITION") => {
            return Json(api_error(
                400,
                &format!("无效推进: {} → {}", from_stage.as_str(), to_stage.as_str()),
            ))
        }
        Err(e) => return Json(api_error(400, e)),
    }

    let now = Utc::now();
    let to_stage_str = to_stage.as_str();
    let new_status = match to_stage {
        OppStage::Won => "won",
        OppStage::Lost => "lost",
        OppStage::Closed => "archived",
        _ => &existing.status,
    };

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        UPDATE crm.opportunities SET
            stage = $2, status = $3, notes = COALESCE($4, notes), updated_at = $5
        WHERE id = $1 AND tenant_id = $6
        RETURNING id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, win_rate, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(to_stage_str)
    .bind(new_status)
    .bind(req.note.as_deref().or(existing.notes.as_deref()))
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(_opp) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return Json(api_error(500, "事务提交失败"));
                }
            }
            // 阶段推进后失效商机详情与列表缓存
            invalidate_opportunity_cache(&state, "opportunity_advanced").await;
            let from_s = from_stage.as_str();
            let to_s = to_stage_str;
            let response_payload = serde_json::json!({
                "id": id,
                "fromStage": from_s,
                "toStage": to_s,
            });
            (
                Json(ApiResponse::success(
                    response_payload,
                    &format!("商机阶段已推进: {} → {}", from_s, to_s),
                )),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("推进商机阶段失败: {}", e);
            (
                Json(api_error(500, "推进商机阶段失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(opp) = &result {
        Some(serde_json::json!({
            "id": opp.id,
            "fromStage": from_stage.as_str(),
            "toStage": opp.stage,
        }))
    } else {
        None
    };

    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.opportunity.advance".to_string(),
                entity_type: "opportunity".to_string(),
                entity_id: Some(id),
                entity_ids: None,
                user_id: None,
                user_name: None,
                request_details: request_data,
                response_details: response_data,
                status: status_str,
                error_message: error_msg,
            },
            &headers,
        )
        .await;
    });

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:opportunity:write"])),
    path = "/opportunities/{id}/rollback",
    params(("id" = Uuid, Path, description = "Opportunity id to rollback stage (adjacent only)")),
    request_body = RollbackOpportunityRequest,
    responses(
        (status = 200, description = "Opportunity stage rolled back (adjacent only)"),
        (status = 400, description = "CRM::INVALID_TRANSITION / CRM::TERMINAL_CANNOT_TRANSITION"),
        (status = 403, description = "CRM::NOT_OWNER"),
        (status = 404, description = "CRM::NOT_FOUND"),
    ),
    security(("bearer_auth" = ["crm:opportunity:write"])),
    tag = "opportunity"
)]
async fn rollback_opportunity(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<RollbackOpportunityRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let existing = match sqlx::query_as::<_, Opportunity>(
        r#"
        SELECT id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, win_rate, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        FROM crm.opportunities WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "商机不存在")),
        Err(e) => return Json(api_error(500, &format!("查询商机失败: {}", e))),
    };

    let is_owner_or_admin = true;

    let from_stage = match OppStage::from_str(&existing.stage) {
        Some(s) => s,
        None => return Json(api_error(400, &format!("未知商机阶段: {}", existing.stage))),
    };
    let to_stage = prev_stage(from_stage);

    match can_transition(from_stage, to_stage, is_owner_or_admin) {
        Ok(_) => {}
        Err("NOT_OWNER") => return Json(api_error(403, "仅负责人或管理员可回退阶段")),
        Err("TERMINAL_CANNOT_TRANSITION") => return Json(api_error(400, "终态商机不可回退")),
        Err("INVALID_TRANSITION") => {
            return Json(api_error(
                400,
                &format!(
                    "无效回退(仅相邻阶段允许): {} → {}",
                    from_stage.as_str(),
                    to_stage.as_str()
                ),
            ))
        }
        Err(e) => return Json(api_error(400, e)),
    }

    let now = Utc::now();
    let to_stage_str = to_stage.as_str();
    let new_status = match to_stage {
        OppStage::Won | OppStage::Lost | OppStage::Closed => "archived",
        _ => "open",
    };

    let notes_combined = match (
        req.reason.as_deref(),
        req.note.as_deref(),
        existing.notes.as_deref(),
    ) {
        (Some(reason), Some(note), Some(old)) => {
            Some(format!("{}\n[回退原因: {}] {}", old, reason, note))
        }
        (Some(reason), None, Some(old)) => Some(format!("{}\n[回退原因: {}]", old, reason)),
        (_, _, old_note) => old_note.map(|s| s.to_string()),
    };

    let result = sqlx::query_as::<_, Opportunity>(
        r#"
        UPDATE crm.opportunities SET
            stage = $2, status = $3, notes = COALESCE($4, notes), updated_at = $5
        WHERE id = $1 AND tenant_id = $6
        RETURNING id, tenant_id, opp_no, name, customer_id, customer_name, stage, priority, value, win_rate, close_date, owner_id, status, notes, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(to_stage_str)
    .bind(new_status)
    .bind(notes_combined.as_deref())
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(_opp) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return Json(api_error(500, "事务提交失败"));
                }
            }
            // 阶段回退后失效商机详情与列表缓存
            invalidate_opportunity_cache(&state, "opportunity_rolled_back").await;
            let from_s = from_stage.as_str();
            let to_s = to_stage_str;
            let response_payload = serde_json::json!({
                "id": id,
                "fromStage": from_s,
                "toStage": to_s,
            });
            (
                Json(ApiResponse::success(
                    response_payload,
                    &format!("商机阶段已回退: {} → {}", from_s, to_s),
                )),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("回退商机阶段失败: {}", e);
            (
                Json(api_error(500, "回退商机阶段失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(opp) = &result {
        Some(serde_json::json!({
            "id": opp.id,
            "fromStage": from_stage.as_str(),
            "toStage": opp.stage,
        }))
    } else {
        None
    };

    tokio::spawn(async move {
        let _ = log_audit_event(
            &state.db,
            AuditEventParams {
                action: "crm.opportunity.rollback".to_string(),
                entity_type: "opportunity".to_string(),
                entity_id: Some(id),
                entity_ids: None,
                user_id: None,
                user_name: None,
                request_details: request_data,
                response_details: response_data,
                status: status_str,
                error_message: error_msg,
            },
            &headers,
        )
        .await;
    });

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: serde::Serialize + for<'de> serde::Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn roundtrip_funnel_stage() {
        roundtrip(&FunnelStage {
            stage: "lead".to_string(),
            stage_label: "商机".to_string(),
            count: 5,
            total_value: Some(10000.0),
            avg_probability: Some(0.6),
        });
    }

    #[test]
    fn roundtrip_opportunity_stats() {
        roundtrip(&OpportunityStats {
            total_count: 10,
            total_value: Some(50000.0),
            weighted_value: Some(25000.0),
            won_count: 3,
            won_value: Some(15000.0),
            lost_count: 1,
            lost_value: Some(2000.0),
        });
    }

    #[test]
    fn roundtrip_stage_transition() {
        roundtrip(&StageTransition {
            from_stage: "lead".to_string(),
            to_stage: "qualified".to_string(),
            count: 2,
        });
    }

    #[test]
    fn roundtrip_opportunity_forecast() {
        roundtrip(&OpportunityForecast {
            forecast_month: "2026-09".to_string(),
            forecast_value: 100000.0,
            opportunity_count: 8,
            avg_probability: 0.7,
        });
    }

    #[test]
    fn roundtrip_advance_opportunity_request() {
        roundtrip(&AdvanceOpportunityRequest {
            note: Some("推进中".to_string()),
        });
    }

    #[test]
    fn roundtrip_rollback_opportunity_request() {
        roundtrip(&RollbackOpportunityRequest {
            note: Some("需要补充资料".to_string()),
            reason: Some("客户反馈".to_string()),
        });
    }

    #[test]
    fn opp_stage_from_str_all_variants() {
        assert_eq!(OppStage::from_str("draft"), Some(OppStage::Draft));
        assert_eq!(OppStage::from_str("lead"), Some(OppStage::Lead));
        assert_eq!(OppStage::from_str("qualified"), Some(OppStage::Qualified));
        assert_eq!(OppStage::from_str("proposal"), Some(OppStage::Proposal));
        assert_eq!(
            OppStage::from_str("negotiation"),
            Some(OppStage::Negotiation)
        );
        assert_eq!(OppStage::from_str("won"), Some(OppStage::Won));
        assert_eq!(OppStage::from_str("lost"), Some(OppStage::Lost));
        assert_eq!(OppStage::from_str("closed"), Some(OppStage::Closed));
        assert_eq!(OppStage::from_str("invalid"), None);
        assert_eq!(OppStage::from_str(""), None);
    }

    #[test]
    fn opp_stage_as_str_roundtrip() {
        let variants = [
            OppStage::Draft,
            OppStage::Lead,
            OppStage::Qualified,
            OppStage::Proposal,
            OppStage::Negotiation,
            OppStage::Won,
            OppStage::Lost,
            OppStage::Closed,
        ];
        for v in variants {
            let s = v.as_str();
            let back = OppStage::from_str(s).unwrap();
            assert_eq!(back, v);
        }
    }

    #[test]
    fn opp_stage_terminal_detection() {
        assert!(OppStage::Won.is_terminal());
        assert!(OppStage::Lost.is_terminal());
        assert!(OppStage::Closed.is_terminal());
        assert!(!OppStage::Draft.is_terminal());
        assert!(!OppStage::Lead.is_terminal());
        assert!(!OppStage::Qualified.is_terminal());
        assert!(!OppStage::Proposal.is_terminal());
        assert!(!OppStage::Negotiation.is_terminal());
    }

    #[test]
    fn opp_stage_copy_clone_eq() {
        let a = OppStage::Lead;
        let b = a;
        assert_eq!(a, b);
        assert_eq!(a.clone(), b);
    }

    #[test]
    fn can_transition_advances_as_owner() {
        use OppStage::*;
        assert!(can_transition(Draft, Lead, true).is_ok());
        assert!(can_transition(Lead, Qualified, true).is_ok());
        assert!(can_transition(Qualified, Proposal, true).is_ok());
        assert!(can_transition(Proposal, Negotiation, true).is_ok());
        assert!(can_transition(Negotiation, Won, true).is_ok());
        assert!(can_transition(Negotiation, Lost, true).is_ok());
        assert!(can_transition(Negotiation, Closed, true).is_ok());
    }

    #[test]
    fn can_transition_rollbacks_as_owner() {
        use OppStage::*;
        assert!(can_transition(Qualified, Lead, true).is_ok());
        assert!(can_transition(Proposal, Qualified, true).is_ok());
        assert!(can_transition(Negotiation, Proposal, true).is_ok());
    }

    #[test]
    fn can_transition_rejects_not_owner() {
        assert_eq!(
            can_transition(OppStage::Draft, OppStage::Lead, false),
            Err("NOT_OWNER")
        );
        assert_eq!(
            can_transition(OppStage::Lead, OppStage::Qualified, false),
            Err("NOT_OWNER")
        );
    }

    #[test]
    fn can_transition_rejects_from_terminal() {
        use OppStage::*;
        assert_eq!(
            can_transition(Won, Lead, true),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
        assert_eq!(
            can_transition(Lost, Won, true),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
        assert_eq!(
            can_transition(Closed, Proposal, true),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
    }

    #[test]
    fn can_transition_invalid_jumps() {
        use OppStage::*;
        assert_eq!(
            can_transition(Draft, Qualified, true),
            Err("INVALID_TRANSITION")
        );
        assert_eq!(
            can_transition(Lead, Proposal, true),
            Err("INVALID_TRANSITION")
        );
        assert_eq!(
            can_transition(Negotiation, Draft, true),
            Err("INVALID_TRANSITION")
        );
        assert_eq!(can_transition(Draft, Won, true), Err("INVALID_TRANSITION"));
    }

    #[test]
    fn next_advance_stage_happy_path() {
        use OppStage::*;
        assert_eq!(next_advance_stage(Draft), Lead);
        assert_eq!(next_advance_stage(Lead), Qualified);
        assert_eq!(next_advance_stage(Qualified), Proposal);
        assert_eq!(next_advance_stage(Proposal), Negotiation);
        assert_eq!(next_advance_stage(Negotiation), Won);
    }

    #[test]
    fn next_advance_stage_terminal_noop() {
        use OppStage::*;
        assert_eq!(next_advance_stage(Won), Won);
        assert_eq!(next_advance_stage(Lost), Lost);
        assert_eq!(next_advance_stage(Closed), Closed);
    }

    #[test]
    fn prev_stage_rollback() {
        use OppStage::*;
        assert_eq!(prev_stage(Qualified), Lead);
        assert_eq!(prev_stage(Proposal), Qualified);
        assert_eq!(prev_stage(Negotiation), Proposal);
    }

    #[test]
    fn prev_stage_noop_for_early_or_terminal() {
        use OppStage::*;
        assert_eq!(prev_stage(Draft), Draft);
        assert_eq!(prev_stage(Lead), Lead);
        assert_eq!(prev_stage(Won), Won);
        assert_eq!(prev_stage(Lost), Lost);
        assert_eq!(prev_stage(Closed), Closed);
    }

    #[test]
    fn forecast_params_none() {
        let json = r#"{}"#;
        let q: ForecastParams = serde_json::from_str(json).unwrap();
        assert!(q.months.is_none());
    }

    #[test]
    fn forecast_params_some() {
        let json = r#"{"months":6}"#;
        let q: ForecastParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.months, Some(6));
    }

    #[test]
    fn opportunity_pagination_params_empty() {
        let json = r#"{}"#;
        let q: OpportunityPaginationParams = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.stage.is_none());
        assert!(q.customer_id.is_none());
    }

    #[test]
    fn opportunity_pagination_params_all() {
        let cid = Uuid::new_v4();
        let json = format!(
            r#"{{"page":4,"page_size":15,"search":"deal","stage":"negotiation","customer_id":"{}"}}"#,
            cid
        );
        let q: OpportunityPaginationParams = serde_json::from_str(&json).unwrap();
        assert_eq!(q.page, Some(4));
        assert_eq!(q.page_size, Some(15));
        assert_eq!(q.search.as_deref(), Some("deal"));
        assert_eq!(q.stage.as_deref(), Some("negotiation"));
        assert_eq!(q.customer_id, Some(cid));
    }

    #[test]
    fn opportunity_pagination_params_partial() {
        let json = r#"{"stage":"won","page":1}"#;
        let q: OpportunityPaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.stage.as_deref(), Some("won"));
        assert_eq!(q.page, Some(1));
        assert!(q.search.is_none());
    }

    #[test]
    fn opportunity_pagination_params_invalid_uuid_fails() {
        let json = r#"{"customer_id":"bad-uuid"}"#;
        let res: Result<OpportunityPaginationParams, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn opportunity_batch_delete_request_ok() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let json = format!(r#"{{"ids":["{}","{}"]}}"#, id1, id2);
        let r: BatchDeleteRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.ids.len(), 2);
        assert_eq!(r.ids[0], id1);
    }

    #[test]
    fn opportunity_batch_delete_request_invalid_uuid_fails() {
        let json = r#"{"ids":["garbage"]}"#;
        let res: Result<BatchDeleteRequest, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}
