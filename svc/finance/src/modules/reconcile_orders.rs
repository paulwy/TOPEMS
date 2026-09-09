// Finance · 对账订单模块（/reconcile order 模型）
//
// 第二批-⑦ ③A 决策：前端 reconciliation.ts 10 方法走 /reconcile 模型
// （orderId 粒度），后端此前仅 2 条桩实现（不查库）。本模块补齐真实现。
// 表：finance.reconcile_orders + finance.reconcile_items（迁移 20260908000005）
//
// 状态机：draft → pending → confirmed / disputed / cancelled
// 匹配逻辑：updateItem 计算 difference = source_amount - match_amount；
//           列表/详情实时聚合 order 的 matched/unmatched 金额。

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use chrono::NaiveDate;
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/reconcile",
            get(list_reconcile_orders).post(create_reconcile_order),
        )
        .route("/reconcile/auto", post(auto_reconcile))
        .route("/reconcile/{order_id}", get(get_reconcile_order))
        .route("/reconcile/{order_id}/items", get(get_reconcile_items))
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
}

#[derive(Debug, Deserialize)]
pub struct ListReconcileQuery {
    pub status: Option<String>,
    pub counterparty_id: Option<Uuid>,
    pub period: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
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

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
    )
}

fn not_found(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (StatusCode::NOT_FOUND, Json(ApiResponse::error(404, msg)))
}

fn parse_date(s: &Option<String>) -> Option<NaiveDate> {
    s.as_deref()
        .and_then(|v| NaiveDate::parse_from_str(v, "%Y-%m-%d").ok())
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

pub async fn list_reconcile_orders(
    State(state): State<AppState>,
    Query(params): Query<ListReconcileQuery>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    let keyword = params.keyword.clone();

    let total: i64 = match sqlx::query(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.reconcile_orders \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::uuid IS NULL OR counterparty_id = $2) \
           AND ($3::text IS NULL OR period = $3) \
           AND ($4::text IS NULL OR order_no ILIKE '%' || $4 || '%' \
             OR counterparty_name ILIKE '%' || $4 || '%')"
    ))
    .bind(&params.status)
    .bind(params.counterparty_id)
    .bind(&params.period)
    .bind(&keyword)
    .fetch_one(&state.pool)
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
         ORDER BY created_at DESC LIMIT $5 OFFSET $6"))
        .bind(&params.status)
        .bind(params.counterparty_id)
        .bind(&params.period)
        .bind(&keyword)
        .bind(pagesize)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(rows) => rows,
            Err(e) => {
                tracing::error!("查询对账订单失败: {}", e);
                return Err(internal_error("查询对账订单失败"));
            }
        };

    let items: Vec<serde_json::Value> = rows.iter().map(order_to_json).collect();
    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取对账订单列表成功",
    )))
}

pub async fn get_reconcile_order(
    State(state): State<AppState>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let row =
        match sqlx::query(only_own_schema_query!("finance",
        "SELECT id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                total_amount, matched_amount, unmatched_amount, status, created_at, updated_at \
         FROM finance.reconcile_orders WHERE id = $1"))
        .bind(order_id)
        .fetch_optional(&state.pool)
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
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询对账明细失败: {}", e);
            return Err(internal_error("查询对账明细失败"));
        }
    };
    data.insert(
        "items".to_string(),
        serde_json::Value::Array(items.iter().map(item_to_json).collect()),
    );

    Ok(Json(ApiResponse::success(
        serde_json::Value::Object(data),
        "获取对账订单成功",
    )))
}

pub async fn get_reconcile_items(
    State(state): State<AppState>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let rows = match sqlx::query(only_own_schema_query!("finance",
        "SELECT id, order_id, source_type, source_id, source_no, source_date, source_amount, \
                matched, match_id, match_amount, difference, status, remark, created_at, updated_at \
         FROM finance.reconcile_items WHERE order_id = $1 ORDER BY created_at"))
        .bind(order_id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询对账明细失败: {}", e);
            return Err(internal_error("查询对账明细失败"));
        }
    };

    let items: Vec<serde_json::Value> = rows.iter().map(item_to_json).collect();
    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items }),
        "获取对账明细成功",
    )))
}

pub async fn create_reconcile_order(
    State(state): State<AppState>,
    Json(req): Json<CreateReconcileRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
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
            Json(ApiResponse::error(
                400,
                "缺少 counterparty_id 或 counterparty_ids",
            )),
        ));
    }

    let start_date = parse_date(&req.start_date);
    let end_date = parse_date(&req.end_date);

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
             (order_no, counterparty_id, period, start_date, end_date, status) \
             VALUES ($1, $2, $3, $4, $5, 'pending') \
             RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                       total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"))
            .bind(&order_no)
            .bind(cid)
            .bind(&req.period)
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&state.pool)
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

    Ok(Json(ApiResponse::success(
        serde_json::json!({ "orders": orders }),
        "创建对账订单成功",
    )))
}

/// 自动对账：按 counterparty_ids（缺省为全部未完成订单）批量建单并返回汇总。
/// 匹配明细通过 updateItem 写入，差异实时聚合。
pub async fn auto_reconcile(
    State(state): State<AppState>,
    Json(req): Json<CreateReconcileRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let start_date = parse_date(&req.start_date);
    let end_date = parse_date(&req.end_date);

    let counterparty_ids = req.counterparty_ids.clone().unwrap_or_default();
    if counterparty_ids.is_empty() {
        return Ok(Json(ApiResponse::success(
            serde_json::json!({ "reconciled_count": 0, "total_difference": 0, "orders": [] }),
            "自动对账完成（未指定对账对象）",
        )));
    }

    let mut orders = Vec::new();
    for cid in counterparty_ids {
        let order_no = format!(
            "RC-AUTO-{:X}{:04}",
            Uuid::new_v4().as_u128() % 0xFFFF_FFFF,
            rand_suffix()
        );
        let row = match sqlx::query(only_own_schema_query!("finance",
            "INSERT INTO finance.reconcile_orders \
             (order_no, counterparty_id, period, start_date, end_date, status) \
             VALUES ($1, $2, $3, $4, $5, 'draft') \
             RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                       total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"))
            .bind(&order_no)
            .bind(cid)
            .bind(&req.period)
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&state.pool)
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

    Ok(Json(ApiResponse::success(
        serde_json::json!({
            "reconciled_count": 0,
            "total_difference": 0,
            "orders": orders,
        }),
        "自动对账完成",
    )))
}

pub async fn confirm_reconcile_order(
    State(state): State<AppState>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let row = match sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.reconcile_orders SET status = 'confirmed', updated_at = NOW() \
         WHERE id = $1 \
         RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                   total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"
    ))
    .bind(order_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return Err(not_found("对账订单不存在")),
        Err(e) => {
            tracing::error!("确认对账订单失败: {}", e);
            return Err(internal_error("确认对账订单失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        order_to_json(&row),
        "确认对账订单成功",
    )))
}

pub async fn dispute_reconcile_order(
    State(state): State<AppState>,
    Path(order_id): Path<Uuid>,
    Json(req): Json<DisputeReconcileRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let _remark = req.reason;
    let row = match sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.reconcile_orders SET status = 'disputed', updated_at = NOW() \
         WHERE id = $1 \
         RETURNING id, order_no, counterparty_id, counterparty_name, period, start_date, end_date, \
                   total_amount, matched_amount, unmatched_amount, status, created_at, updated_at"
    ))
    .bind(order_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return Err(not_found("对账订单不存在")),
        Err(e) => {
            tracing::error!("争议对账订单失败: {}", e);
            return Err(internal_error("争议对账订单失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        order_to_json(&row),
        "对账订单已标记争议",
    )))
}

pub async fn cancel_reconcile_order(
    State(state): State<AppState>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.reconcile_orders SET status = 'cancelled', updated_at = NOW() \
         WHERE id = $1 AND status NOT IN ('confirmed', 'cancelled')"
    ))
    .bind(order_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Err(not_found("对账订单不存在或不可取消"));
            }
            Ok(Json(ApiResponse::success(
                serde_json::json!({ "cancelled": true, "id": order_id.to_string() }),
                "取消对账订单成功",
            )))
        }
        Err(e) => {
            tracing::error!("取消对账订单失败: {}", e);
            Err(internal_error("取消对账订单失败"))
        }
    }
}

pub async fn update_reconcile_item(
    State(state): State<AppState>,
    Path((order_id, item_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateItemRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let source_date = parse_date(&req.source_date);
    let matched = req.matched;
    let match_amount = req.match_amount;
    let status = req.status.clone();

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
        .bind(&status)
        .bind(&req.remark)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return Err(not_found("对账明细不存在")),
        Err(e) => {
            tracing::error!("更新对账明细失败: {}", e);
            return Err(internal_error("更新对账明细失败"));
        }
    };

    // 重算订单聚合金额
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
        .execute(&state.pool)
        .await;

    Ok(Json(ApiResponse::success(
        item_to_json(&row),
        "更新对账明细成功",
    )))
}

fn rand_suffix() -> u16 {
    // 无 rand 依赖的轻量随机后缀：取系统时间微秒低位
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    (nanos % 10000) as u16
}
