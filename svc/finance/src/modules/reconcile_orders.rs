// Finance · 对账订单模块（/reconcile order 模型）
//
// 第二批-⑦ ③A 决策：前端 reconciliation.ts 10 方法走 /reconcile 模型
// （orderId 粒度），后端此前仅 2 条桩实现（不查库）。本模块补齐真实现。
// 表：finance.reconcile_orders + finance.reconcile_items（迁移 20260908000005）
//
// 状态机：draft/pending → confirmed；draft/pending/disputed → disputed；confirmed/cancelled 为终态
// 匹配逻辑：updateItem 计算 difference = source_amount - match_amount；
//           列表/详情实时聚合 order 的 matched/unmatched 金额。

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use chrono::NaiveDate;
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::resolve_create_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::modules::reconcile_status::{
    normalize_reconcile_item, normalize_reconcile_order, ReconcileOrderStatus,
};
use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    // B375：此前整个 Router 只挂 `finance:reconcile_orders:read`，
    // `POST /reconcile`（建单）、`POST /reconcile/auto`（批量建单）、
    // `POST /reconcile/{id}/confirm|dispute|cancel`、`PUT /reconcile/{id}/items/{item_id}`
    // 这些写端点在独立部署（不经网关 `require_finance_write`）时对只读角色敞开。
    // 按 B363 口径把门槛下沉到服务内：读 = `finance:reconcile_orders:read`，写 = `finance:admin`。
    let read_routes = Router::new()
        .route("/reconcile", get(list_reconcile_orders))
        .route("/reconcile/{order_id}", get(get_reconcile_order))
        .route("/reconcile/{order_id}/items", get(get_reconcile_items))
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:reconcile_orders:read"),
        ));

    let write_routes = Router::new()
        .route("/reconcile", post(create_reconcile_order))
        .route("/reconcile/auto", post(auto_reconcile))
        .route(
            "/reconcile/{order_id}/confirm",
            post(confirm_reconcile_order),
        )
        .route(
            "/reconcile/{order_id}/dispute",
            post(dispute_reconcile_order),
        )
        .route("/reconcile/{order_id}/cancel", post(cancel_reconcile_order))
        .route(
            "/reconcile/{order_id}/items/{item_id}",
            put(update_reconcile_item),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:reconcile_orders:write"),
        ));

    read_routes.merge(write_routes)
}

#[derive(Debug, Deserialize)]
pub struct ListReconcileQuery {
    pub status: Option<String>,
    pub counterparty_id: Option<Uuid>,
    pub period: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReconcileRequest {
    pub counterparty_id: Option<Uuid>,
    pub counterparty_ids: Option<Vec<Uuid>>,
    pub period: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DisputeReconcileRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemRequest {
    pub source_type: Option<String>,
    pub source_no: Option<String>,
    pub source_date: Option<String>,
    pub source_amount: Option<f64>,
    pub matched: Option<bool>,
    pub match_id: Option<Uuid>,
    pub match_amount: Option<f64>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

fn internal_error(msg: &str) -> (StatusCode, ApiResponse<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        ApiResponse::server_error(msg),
    )
}

/// A 类业务端点守卫：nil 租户视为缺少上下文，显式报错，禁止降级为跨租户。
fn require_tenant(tenant_id: Uuid) -> Result<Uuid, (StatusCode, ApiResponse<serde_json::Value>)> {
    if tenant_id.is_nil() {
        return Err((
            StatusCode::BAD_REQUEST,
            ApiResponse::bad_request("缺少租户上下文"),
        ));
    }
    Ok(tenant_id)
}

fn not_found(msg: &str) -> (StatusCode, ApiResponse<serde_json::Value>) {
    // finance 统一信封契约：业务错误一律 HTTP 200，由 body.code 承载业务码。
    // （此前返回真实 HTTP 404，被 BFF 契约冒烟误判为"路由缺失 route_missing"。）
    (StatusCode::OK, ApiResponse::not_found(msg))
}

fn conflict(msg: &str) -> (StatusCode, ApiResponse<serde_json::Value>) {
    (StatusCode::OK, ApiResponse::conflict(msg))
}

fn parse_date(s: &Option<String>) -> Option<NaiveDate> {
    s.as_deref()
        .and_then(|v| v.parse::<chrono::NaiveDate>().ok())
}

fn order_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "order_no": row.get::<String, _>("order_no"),
        "counterparty_id": row.get::<Option<Uuid>, _>("counterparty_id").map(|v| v.to_string()),
        "counterparty_name": row.get::<Option<String>, _>("counterparty_name"),
        "period": row.get::<Option<String>, _>("period"),
        "start_date": row.get::<Option<NaiveDate>, _>("start_date"),
        "end_date": row.get::<Option<NaiveDate>, _>("end_date"),
        "total_amount": row.get::<f64, _>("total_amount"),
        "matched_amount": row.get::<f64, _>("matched_amount"),
        "unmatched_amount": row.get::<f64, _>("unmatched_amount"),
        "status": row.get::<String, _>("status"),
        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
    })
}

fn item_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "order_id": row.get::<Uuid, _>("order_id").to_string(),
        "source_type": row.get::<String, _>("source_type"),
        "source_id": row.get::<Option<Uuid>, _>("source_id").map(|v| v.to_string()),
        "source_no": row.get::<Option<String>, _>("source_no"),
        "source_date": row.get::<Option<NaiveDate>, _>("source_date"),
        "source_amount": row.get::<f64, _>("source_amount"),
        "matched": row.get::<bool, _>("matched"),
        "match_id": row.get::<Option<Uuid>, _>("match_id").map(|v| v.to_string()),
        "match_amount": row.get::<f64, _>("match_amount"),
        "difference": row.get::<f64, _>("difference"),
        "status": row.get::<String, _>("status"),
        "remark": row.get::<Option<String>, _>("remark"),
        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:reconcile_orders:read"])),
    path = "/api/finance/reconcile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn list_reconcile_orders(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListReconcileQuery>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let status_filter = match params
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        Some(raw) => match normalize_reconcile_order(raw) {
            Some(status) => Some(status),
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request(
                        "status 仅支持 draft/pending/confirmed/disputed/cancelled",
                    ),
                ))
            }
        },
        None => None,
    };

    let keyword = params.keyword.clone();
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("创建对账订单查询作用域失败: {}", e);
        internal_error("统计对账订单失败")
    })?;

    let total: i64 = match sqlx::query(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.reconcile_orders \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::uuid IS NULL OR counterparty_id = $2) \
           AND ($3::text IS NULL OR period = $3) \
           AND ($4::text IS NULL OR order_no ILIKE '%' || $4 || '%' \
             OR counterparty_name ILIKE '%' || $4 || '%') \
           AND (tenant_id = $5::uuid)"
    ))
    .bind(status_filter.map(|s| s.as_str()))
    .bind(params.counterparty_id)
    .bind(&params.period)
    .bind(&keyword)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(row) => row.get::<i64, _>(0),
        Err(e) => {
            tracing::error!("统计对账订单失败: {}", e);
            return Err(internal_error("统计对账订单失败"));
        }
    };

    let rows =
        match sqlx::query(only_own_schema_query!("finance",
        "SELECT id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                total_amount, matched_amount, unmatched_amount, status, created_at, updated_at \
         FROM finance.reconcile_orders \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::uuid IS NULL OR counterparty_id = $2) \
           AND ($3::text IS NULL OR period = $3) \
           AND ($4::text IS NULL OR order_no ILIKE '%' || $4 || '%' \
             OR counterparty_name ILIKE '%' || $4 || '%') \
           AND (tenant_id = $7::uuid) \
         ORDER BY created_at DESC LIMIT $5 OFFSET $6"))
        .bind(status_filter.map(|s| s.as_str()))
        .bind(params.counterparty_id)
        .bind(&params.period)
        .bind(&keyword)
        .bind(page_size)
        .bind(offset)
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await
        {
            Ok(rows) => rows,
            Err(e) => {
                tracing::error!("查询对账订单失败: {}", e);
                return Err(internal_error("查询对账订单失败"));
            }
        };
    scope.commit().await.map_err(|e| {
        tracing::error!("提交对账订单查询作用域失败: {}", e);
        internal_error("查询对账订单失败")
    })?;

    let items: Vec<serde_json::Value> = rows.iter().map(order_to_json).collect();
    Ok(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "获取对账订单列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:reconcile_orders:read"])),
    path = "/api/finance/reconcile/{order_id}",
    params(
        ("order_id" = String, Path, description = "order_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn get_reconcile_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("创建对账订单查询作用域失败: {}", e);
        internal_error("查询对账订单失败")
    })?;
    let row = match sqlx::query(only_own_schema_query!(
        "finance",
        "SELECT id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                total_amount, matched_amount, unmatched_amount, status, created_at, updated_at \
         FROM finance.reconcile_orders WHERE id = $1 \
           AND (tenant_id = $2::uuid)"
    ))
    .bind(order_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return Err(not_found("对账订单不存在")),
        Err(e) => {
            tracing::error!("查询对账订单失败: {}", e);
            return Err(internal_error("查询对账订单失败"));
        }
    };

    let mut data = match order_to_json(&row) {
        serde_json::Value::Object(map) => map,
        _ => {
            return Err(internal_error("对账订单数据异常"));
        }
    };

    let items = match sqlx::query(only_own_schema_query!("finance",
        "SELECT id, order_id, source_type, source_id, source_no, source_date, source_amount, \
                matched, match_id, match_amount, difference, status, remark, created_at, updated_at \
         FROM finance.reconcile_items WHERE order_id = $1 ORDER BY created_at"))
        .bind(order_id)
        .fetch_all(&mut scope)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询对账明细失败: {}", e);
            return Err(internal_error("查询对账明细失败"));
        }
    };
    scope.commit().await.map_err(|e| {
        tracing::error!("提交对账订单查询作用域失败: {}", e);
        internal_error("查询对账订单失败")
    })?;
    data.insert(
        "items".to_string(),
        serde_json::Value::Array(items.iter().map(item_to_json).collect()),
    );

    Ok(ApiResponse::success(
        serde_json::Value::Object(data),
        "获取对账订单成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:reconcile_orders:read"])),
    path = "/api/finance/reconcile/{order_id}/items",
    params(
        ("order_id" = String, Path, description = "order_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn get_reconcile_items(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("创建对账明细查询作用域失败: {}", e);
        internal_error("查询对账明细失败")
    })?;
    let rows = match sqlx::query(only_own_schema_query!("finance",
        "SELECT id, order_id, source_type, source_id, source_no, source_date, source_amount, \
                matched, match_id, match_amount, difference, status, remark, created_at, updated_at \
         FROM finance.reconcile_items WHERE order_id = $1 \
           AND EXISTS (SELECT 1 FROM finance.reconcile_orders o WHERE o.id = $1 \
             AND (o.tenant_id = $2::uuid)) \
         ORDER BY created_at"))
        .bind(order_id)
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询对账明细失败: {}", e);
            return Err(internal_error("查询对账明细失败"));
        }
    };
    scope.commit().await.map_err(|e| {
        tracing::error!("提交对账明细查询作用域失败: {}", e);
        internal_error("查询对账明细失败")
    })?;

    let items: Vec<serde_json::Value> = rows.iter().map(item_to_json).collect();
    Ok(ApiResponse::success(
        serde_json::json!({ "items": items }),
        "获取对账明细成功",
    ))
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:reconcile_orders:write"])),
    post,
    path = "/api/finance/reconcile",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/reconcile"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_reconcile_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReconcileRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    // 超管/服务身份落公共行（NULL）；普通用户绑定 claims.tenant_id，缺失/非法直接 400
    let tenant_opt = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((_, msg)) => return Err((StatusCode::BAD_REQUEST, ApiResponse::bad_request(&msg))),
    };
    let counterparty_ids: Vec<Uuid> = req
        .counterparty_ids
        .clone()
        .unwrap_or_default()
        .into_iter()
        .chain(req.counterparty_id.into_iter())
        .collect::<Vec<_>>();

    if counterparty_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            ApiResponse::bad_request("缺少 counterparty_id 或 counterparty_ids"),
        ));
    }

    let start_date = parse_date(&req.start_date);
    let end_date = parse_date(&req.end_date);

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("创建对账订单写入作用域失败: {}", e);
        internal_error("创建对账订单失败")
    })?;

    // 每个 counterparty 生成一个对账订单
    let mut orders = Vec::new();
    for cid in counterparty_ids {
        let order_no = format!(
            "RC-{:X}{:04}",
            Uuid::new_v4().as_u128() % 0xFFFF_FFFF,
            rand_suffix()
        );
        let row = match sqlx::query(only_own_schema_query!("finance",
            "INSERT INTO finance.reconcile_orders \
             (order_no, counterparty_id, period, start_date, end_date, status, tenant_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7) \
             RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                       total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"))
            .bind(&order_no)
            .bind(cid)
            .bind(&req.period)
            .bind(start_date)
            .bind(end_date)
            .bind(ReconcileOrderStatus::Draft.as_str())
            .bind(tenant_opt)
            .fetch_one(&mut scope)
            .await
        {
            Ok(row) => row,
            Err(e) => {
                tracing::error!("创建对账订单失败: {}", e);
                return Err(internal_error("创建对账订单失败"));
            }
        };
        orders.push(order_to_json(&row));
    }
    scope.commit().await.map_err(|e| {
        tracing::error!("提交创建对账订单作用域失败: {}", e);
        internal_error("创建对账订单失败")
    })?;

    Ok(ApiResponse::success(
        serde_json::json!({ "orders": orders }),
        "创建对账订单成功",
    ))
}

/// 自动对账：按 counterparty_ids（缺省为全部未完成订单）批量建单并返回汇总。
/// 匹配明细通过 updateItem 写入，差异实时聚合。
#[utoipa::path(
    security(("BearerAuth" = ["finance:reconcile_orders:write"])),
    post,
    path = "/api/finance/reconcile/auto",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn auto_reconcile(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReconcileRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    // 超管/服务身份落公共行（NULL）；普通用户绑定 claims.tenant_id，缺失/非法直接 400
    let tenant_opt = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((_, msg)) => return Err((StatusCode::BAD_REQUEST, ApiResponse::bad_request(&msg))),
    };
    let start_date = parse_date(&req.start_date);
    let end_date = parse_date(&req.end_date);

    let counterparty_ids = req.counterparty_ids.clone().unwrap_or_default();
    if counterparty_ids.is_empty() {
        return Ok(ApiResponse::success(
            serde_json::json!({ "reconciled_count": 0, "total_difference": 0, "orders": [] }),
            "自动对账完成（未指定对账对象）",
        ));
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("自动对账写入作用域失败: {}", e);
        internal_error("自动对账失败")
    })?;

    let mut orders = Vec::new();
    for cid in counterparty_ids {
        let order_no = format!(
            "RC-AUTO-{:X}{:04}",
            Uuid::new_v4().as_u128() % 0xFFFF_FFFF,
            rand_suffix()
        );
        let row = match sqlx::query(only_own_schema_query!("finance",
            "INSERT INTO finance.reconcile_orders \
             (order_no, counterparty_id, period, start_date, end_date, status, tenant_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7) \
             RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                       total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"))
            .bind(&order_no)
            .bind(cid)
            .bind(&req.period)
            .bind(start_date)
            .bind(end_date)
            .bind(ReconcileOrderStatus::Draft.as_str())
            .bind(tenant_opt)
            .fetch_one(&mut scope)
            .await
        {
            Ok(row) => row,
            Err(e) => {
                tracing::error!("自动对账失败: {}", e);
                return Err(internal_error("自动对账失败"));
            }
        };
        orders.push(order_to_json(&row));
    }
    scope.commit().await.map_err(|e| {
        tracing::error!("提交自动对账作用域失败: {}", e);
        internal_error("自动对账失败")
    })?;

    Ok(ApiResponse::success(
        serde_json::json!({
            "reconciled_count": 0,
            "total_difference": 0,
            "orders": orders,
        }),
        "自动对账完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:reconcile_orders:write"])),
    path = "/api/finance/reconcile/{order_id}/confirm",
    params(
        ("order_id" = String, Path, description = "order_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn confirm_reconcile_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("确认对账订单写入作用域失败: {}", e);
        internal_error("确认对账订单失败")
    })?;
    let row = match sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.reconcile_orders SET status = $3, updated_at = NOW() \
         WHERE id = $1 \
           AND status = ANY($4::text[]) \
           AND (tenant_id = $2::uuid) \
         RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                   total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"
    ))
    .bind(order_id)
    .bind(tenant_id)
    .bind(ReconcileOrderStatus::Confirmed.as_db_str())
    .bind(ReconcileOrderStatus::actionable_values().to_vec())
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            let exists = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
                "finance",
                "SELECT EXISTS(SELECT 1 FROM finance.reconcile_orders WHERE id = $1 AND tenant_id = $2::uuid)"
            ))
            .bind(order_id)
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(false);
            if exists {
                return Err(conflict("对账订单当前状态不允许确认"));
            }
            return Err(not_found("对账订单不存在"));
        }
        Err(e) => {
            tracing::error!("确认对账订单失败: {}", e);
            return Err(internal_error("确认对账订单失败"));
        }
    };
    scope.commit().await.map_err(|e| {
        tracing::error!("提交确认对账订单作用域失败: {}", e);
        internal_error("确认对账订单失败")
    })?;

    Ok(ApiResponse::success(
        order_to_json(&row),
        "确认对账订单成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:reconcile_orders:write"])),
    path = "/api/finance/reconcile/{order_id}/dispute",
    params(
        ("order_id" = String, Path, description = "order_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn dispute_reconcile_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
    Json(req): Json<DisputeReconcileRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let _remark = req.reason;
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("争议对账订单写入作用域失败: {}", e);
        internal_error("争议对账订单失败")
    })?;
    let row = match sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.reconcile_orders SET status = $3, updated_at = NOW() \
         WHERE id = $1 \
           AND status = ANY($4::text[]) \
           AND (tenant_id = $2::uuid) \
         RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                   total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"
    ))
    .bind(order_id)
    .bind(tenant_id)
    .bind(ReconcileOrderStatus::Disputed.as_db_str())
    .bind(ReconcileOrderStatus::actionable_values().to_vec())
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            let exists = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
                "finance",
                "SELECT EXISTS(SELECT 1 FROM finance.reconcile_orders WHERE id = $1 AND tenant_id = $2::uuid)"
            ))
            .bind(order_id)
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(false);
            if exists {
                return Err(conflict("对账订单当前状态不允许标记争议"));
            }
            return Err(not_found("对账订单不存在"));
        }
        Err(e) => {
            tracing::error!("争议对账订单失败: {}", e);
            return Err(internal_error("争议对账订单失败"));
        }
    };
    scope.commit().await.map_err(|e| {
        tracing::error!("提交争议对账订单作用域失败: {}", e);
        internal_error("争议对账订单失败")
    })?;

    Ok(ApiResponse::success(
        order_to_json(&row),
        "对账订单已标记争议",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:reconcile_orders:write"])),
    path = "/api/finance/reconcile/{order_id}/cancel",
    params(
        ("order_id" = String, Path, description = "order_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn cancel_reconcile_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };
    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("取消对账订单写入作用域失败: {}", e);
        internal_error("取消对账订单失败")
    })?;
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.reconcile_orders SET status = $3, updated_at = NOW() \
         WHERE id = $1 AND status <> ALL($4::text[]) \
           AND (tenant_id = $2::uuid)"
    ))
    .bind(order_id)
    .bind(tenant_id)
    .bind(ReconcileOrderStatus::Cancelled.as_db_str())
    .bind(ReconcileOrderStatus::terminal_values().to_vec())
    .execute(&mut scope)
    .await;
    scope.commit().await.map_err(|e| {
        tracing::error!("提交取消对账订单作用域失败: {}", e);
        internal_error("取消对账订单失败")
    })?;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Err(not_found("对账订单不存在或不可取消"));
            }
            Ok(ApiResponse::success(
                serde_json::json!({ "cancelled": true, "id": order_id.to_string() }),
                "取消对账订单成功",
            ))
        }
        Err(e) => {
            tracing::error!("取消对账订单失败: {}", e);
            Err(internal_error("取消对账订单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:reconcile_orders:write"])),
    path = "/api/finance/reconcile/{order_id}/items/{item_id}",
    params(
        ("order_id" = String, Path, description = "order_id"),
        ("item_id" = String, Path, description = "item_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ReconcileOrders"
)]
pub async fn update_reconcile_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((order_id, item_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateItemRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let tenant_id = require_tenant(topems_shared_auth::middleware::get_tenant_id_from_claims(
        &claims,
    ))?;
    let source_date = parse_date(&req.source_date);
    let matched = req.matched;
    let match_amount = req.match_amount;
    let item_status = match req
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        Some(raw) => match normalize_reconcile_item(raw) {
            Some(status) => Some(status),
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("status 仅支持 unmatched/matched/disputed"),
                ))
            }
        },
        None => None,
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Err(internal_error("请求事务缺失")),
    };

    let mut scope = state.db.scope_with(txn).await.map_err(|e| {
        tracing::error!("更新对账明细写入作用域失败: {}", e);
        internal_error("更新对账明细失败")
    })?;

    let row = match sqlx::query(only_own_schema_query!("finance",
        "UPDATE finance.reconcile_items SET \
         source_type = COALESCE($3, source_type), \
         source_no = COALESCE($4, source_no), \
         source_date = COALESCE($5, source_date), \
         source_amount = COALESCE($6, source_amount), \
         matched = COALESCE($7, matched), \
         match_id = COALESCE($8, match_id), \
         match_amount = COALESCE($9, match_amount), \
         status = COALESCE($10, status), \
         remark = COALESCE($11, remark), \
         difference = COALESCE($9, match_amount) - COALESCE($6, source_amount), \
         updated_at = NOW() \
         WHERE id = $2 AND order_id = $1 \
           AND EXISTS (SELECT 1 FROM finance.reconcile_orders o WHERE o.id = $1 \
             AND o.status = ANY($13::text[]) \
             AND (o.tenant_id = $12::uuid)) \
         RETURNING id, order_id, source_type, source_id, source_no, source_date, source_amount, \
                   matched, match_id, match_amount, difference, status, remark, created_at, updated_at"))
        .bind(order_id)
        .bind(item_id)
        .bind(&req.source_type)
        .bind(&req.source_no)
        .bind(source_date)
        .bind(req.source_amount)
        .bind(matched)
        .bind(req.match_id)
        .bind(match_amount)
        .bind(item_status.map(|s| s.as_str()))
        .bind(&req.remark)
        .bind(tenant_id)
        .bind(ReconcileOrderStatus::actionable_values().to_vec())
        .fetch_optional(&mut scope)
        .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            let item_exists = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
                "finance",
                "SELECT EXISTS(SELECT 1 FROM finance.reconcile_items i JOIN finance.reconcile_orders o ON o.id = i.order_id WHERE i.id = $1 AND i.order_id = $2 AND o.tenant_id = $3::uuid)"
            ))
            .bind(item_id)
            .bind(order_id)
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(false);
            if item_exists {
                return Err(conflict("所属对账订单已确认或取消，明细不可修改"));
            }
            return Err(not_found("对账明细不存在"));
        }
        Err(e) => {
            tracing::error!("更新对账明细失败: {}", e);
            return Err(internal_error("更新对账明细失败"));
        }
    };
    scope.commit().await.map_err(|e| {
        tracing::error!("提交更新对账明细作用域失败: {}", e);
        internal_error("更新对账明细失败")
    })?;

    // 重算订单聚合金额（同一请求事务：原实现忽略该步失败，不影响明细更新结果）
    let mut agg_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("创建对账订单聚合写入作用域失败: {}", e);
            return Err(internal_error("更新对账明细失败"));
        }
    };
    let _ = sqlx::query(only_own_schema_query!("finance",
        "UPDATE finance.reconcile_orders SET \
         total_amount = COALESCE((SELECT SUM(source_amount) FROM finance.reconcile_items WHERE order_id = $1), 0), \
         matched_amount = COALESCE((SELECT SUM(source_amount) FROM finance.reconcile_items \
                                   WHERE order_id = $1 AND matched = TRUE), 0), \
         unmatched_amount = COALESCE((SELECT SUM(source_amount) FROM finance.reconcile_items \
                                      WHERE order_id = $1 AND matched = FALSE), 0), \
         updated_at = NOW() \
         WHERE id = $1"))
        .bind(order_id)
        .execute(&mut agg_scope)
        .await;
    let _ = agg_scope.commit().await;

    Ok(ApiResponse::success(item_to_json(&row), "更新对账明细成功"))
}

#[allow(clippy::as_conversions)]
fn rand_suffix() -> u16 {
    // 无 rand 依赖的轻量随机后缀：取系统时间微秒低位
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    (nanos % 10000) as u16
}
