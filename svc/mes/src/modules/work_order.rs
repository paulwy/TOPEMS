use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    http::HeaderMap,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use std::str::FromStr;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::require_tenant;
use utoipa::ToSchema;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_db::decimal::big_decimal_to_f64;

use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/work-orders",
            get(list_work_orders).post(create_work_order),
        )
        .route(
            "/work-orders/{id}",
            get(get_work_order)
                .put(update_work_order)
                .delete(delete_work_order),
        )
        .route("/work-orders/{id}/start", put(start_work_order))
        .route("/work-orders/{id}/complete", put(complete_work_order))
        .route("/work-orders/{id}/cancel", put(cancel_work_order))
        .route("/work-orders/{id}/pause", put(pause_work_order))
        .route("/work-orders/{id}/resume", put(resume_work_order))
}

// ==================== Request / Response Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListWorkOrdersQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateWorkOrderRequest {
    pub work_order_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: f64,
    pub plan_start_date: Option<String>,
    pub plan_end_date: Option<String>,
    pub team_id: Option<String>,
    pub operator: Option<String>,
    pub priority: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWorkOrderRequest {
    pub work_order_no: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: Option<f64>,
    pub completed_quantity: Option<f64>,
    pub plan_start_date: Option<String>,
    pub plan_end_date: Option<String>,
    pub team_id: Option<String>,
    pub operator: Option<String>,
    pub priority: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkOrderResponse {
    pub id: String,
    pub work_order_no: String,
    pub order_id: Option<String>,
    #[serde(alias = "order_no", rename = "order_number")]
    pub order_no: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    #[serde(alias = "planned_quantity", rename = "quantity")]
    pub planned_quantity: f64,
    pub completed_quantity: f64,
    #[serde(alias = "plan_start_date", rename = "planned_start_time")]
    pub plan_start_date: Option<String>,
    #[serde(alias = "plan_end_date", rename = "planned_end_time")]
    pub plan_end_date: Option<String>,
    #[serde(alias = "actual_start_date", rename = "actual_start_time")]
    pub actual_start_date: Option<String>,
    #[serde(alias = "actual_end_date", rename = "actual_end_time")]
    pub actual_end_date: Option<String>,
    pub team_id: Option<String>,
    pub operator: Option<String>,
    pub process_name: Option<String>,
    pub work_station_name: Option<String>,
    pub team_name: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ==================== Helper Functions ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

fn row_to_work_order(r: &sqlx::postgres::PgRow) -> WorkOrderResponse {
    WorkOrderResponse {
        id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
        work_order_no: r.try_get::<String, _>("work_order_no").unwrap_or_default(),
        order_id: r
            .try_get::<Option<Uuid>, _>("order_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
        product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
        product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
        work_station_id: r
            .try_get::<Option<Uuid>, _>("work_station_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        process_id: r
            .try_get::<Option<Uuid>, _>("process_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        planned_quantity: big_decimal_to_f64(
            r.try_get::<Option<BigDecimal>, _>("planned_quantity")
                .ok()
                .flatten(),
        ),
        completed_quantity: big_decimal_to_f64(
            r.try_get::<Option<BigDecimal>, _>("completed_quantity")
                .ok()
                .flatten(),
        ),
        plan_start_date: opt_datetime_to_string(
            r.try_get::<Option<DateTime<Utc>>, _>("plan_start_date")
                .ok()
                .flatten(),
        ),
        plan_end_date: opt_datetime_to_string(
            r.try_get::<Option<DateTime<Utc>>, _>("plan_end_date")
                .ok()
                .flatten(),
        ),
        actual_start_date: opt_datetime_to_string(
            r.try_get::<Option<DateTime<Utc>>, _>("actual_start_date")
                .ok()
                .flatten(),
        ),
        actual_end_date: opt_datetime_to_string(
            r.try_get::<Option<DateTime<Utc>>, _>("actual_end_date")
                .ok()
                .flatten(),
        ),
        team_id: r
            .try_get::<Option<Uuid>, _>("team_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
        process_name: None,
        work_station_name: None,
        team_name: None,
        status: r
            .try_get::<Option<String>, _>("status")
            .ok()
            .flatten()
            .unwrap_or_default(),
        priority: r
            .try_get::<Option<i32>, _>("priority")
            .ok()
            .flatten()
            .map(|v| v.to_string()),
        remark: r.try_get::<Option<String>, _>("remark").ok().flatten(),
        created_at: (r
            .try_get::<Option<DateTime<Utc>>, _>("created_at")
            .ok()
            .flatten())
        .unwrap_or_else(Utc::now),
        updated_at: (r
            .try_get::<Option<DateTime<Utc>>, _>("updated_at")
            .ok()
            .flatten())
        .unwrap_or_else(Utc::now),
    }
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    match dt {
        Some(d) => d,
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

fn opt_datetime_to_string(dt: Option<DateTime<Utc>>) -> Option<String> {
    dt.map(|d| d.to_rfc3339())
}

fn parse_datetime(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
        .or_else(|| {
            NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f")
                .map(|dt| dt.and_utc())
                .ok()
        })
        .or_else(|| {
            NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.and_utc())
                .ok()
        })
}

fn parse_opt_uuid(s: &Option<String>) -> Option<Uuid> {
    s.as_ref().and_then(|id| Uuid::parse_str(id).ok())
}

fn parse_opt_datetime(s: &Option<String>) -> Option<DateTime<Utc>> {
    s.as_ref().and_then(|d| parse_datetime(d))
}

fn parse_opt_big_decimal(v: &Option<f64>) -> Option<BigDecimal> {
    v.and_then(|x| BigDecimal::from_str(&x.to_string()).ok())
}

// ==================== Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:work_order:read"])),
    path = "/api/mes/work-orders",
    tag = "WorkOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "工单列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn list_work_orders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWorkOrdersQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let mut scope = match state.db.scope_read().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工单列表失败");
        }
    };

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE wo.deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND wo.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (wo.work_order_no ILIKE $1 OR wo.order_no ILIKE $1 OR wo.product_code ILIKE $1 OR wo.product_name ILIKE $1)",
            );
        } else {
            let idx = params.len() + 1;
            where_clause.push_str(&format!(
                " AND (wo.work_order_no ILIKE ${idx} OR wo.order_no ILIKE ${idx} OR wo.product_code ILIKE ${idx} OR wo.product_name ILIKE ${idx})",
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let tenant_id = get_tenant_id(&claims);
    let tenant_idx = params.len() + 1;
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE wo.tenant_id = ${tenant_idx}::uuid"));
    } else {
        where_clause.push_str(&format!(" AND wo.tenant_id = ${tenant_idx}::uuid"));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.work_orders wo{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }
    count_query = count_query.bind(tenant_id);

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count work orders: {}", e);
            return ApiResponse::server_error("获取工单列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            wo.id, wo.work_order_no, wo.order_id, wo.order_no,
            wo.product_code, wo.product_name,
            wo.work_station_id, wo.process_id,
            wo.planned_quantity, wo.completed_quantity,
            wo.plan_start_date, wo.plan_end_date,
            wo.actual_start_date, wo.actual_end_date,
            wo.team_id, wo.operator,
            wo.status, wo.priority::text, wo.remark,
            wo.created_at, wo.updated_at,
            pp.process_name, pp.work_station_name, tm.team_name
        FROM mes.work_orders wo
        LEFT JOIN mes.production_processes pp ON pp.id = wo.process_id
        LEFT JOIN mes.teams tm ON tm.id = wo.team_id
        {}
        ORDER BY wo.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_id).bind(page_size).bind(offset);

    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work orders: {}", e);
            return ApiResponse::server_error("获取工单列表失败");
        }
    };

    let orders: Vec<WorkOrderResponse> = rows
        .into_iter()
        .map(|r| WorkOrderResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            work_order_no: r.try_get::<String, _>("work_order_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            process_id: r
                .try_get::<Option<Uuid>, _>("process_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            planned_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("planned_quantity")
                    .ok()
                    .flatten(),
            ),
            completed_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("completed_quantity")
                    .ok()
                    .flatten(),
            ),
            plan_start_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("plan_start_date")
                    .ok()
                    .flatten(),
            ),
            plan_end_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("plan_end_date")
                    .ok()
                    .flatten(),
            ),
            actual_start_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_start_date")
                    .ok()
                    .flatten(),
            ),
            actual_end_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_end_date")
                    .ok()
                    .flatten(),
            ),
            team_id: r
                .try_get::<Option<Uuid>, _>("team_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
            process_name: r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten(),
            work_station_name: r
                .try_get::<Option<String>, _>("work_station_name")
                .ok()
                .flatten(),
            team_name: r.try_get::<Option<String>, _>("team_name").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            priority: r.try_get::<Option<String>, _>("priority").ok().flatten(),
            remark: r.try_get::<Option<String>, _>("remark").ok().flatten(),
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "work_orders": orders,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": page_size,
        }),
        "获取工单列表成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:work_order:read"])),
    path = "/api/mes/work-orders/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单详情", body = ApiResponse<WorkOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let mut scope = match state.db.scope_read().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        SELECT 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        FROM mes.work_orders wo
        WHERE wo.id = $1
          AND wo.tenant_id = $2::uuid
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "获取工单成功"),
        Ok(None) => ApiResponse::not_found("工单不存在"),
        Err(e) => {
            tracing::error!("Failed to get work order: {}", e);
            ApiResponse::server_error("获取工单失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders",
    tag = "WorkOrder",
    request_body = CreateWorkOrderRequest,
    responses(
        (status = 200, description = "工单创建成功", body = ApiResponse<WorkOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(body): Json<CreateWorkOrderRequest>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    // work_orders 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for create_work_order: {}", e);
            return ApiResponse::server_error("创建工单失败");
        }
    };
    let order_id = parse_opt_uuid(&body.order_id);
    let work_station_id = parse_opt_uuid(&body.work_station_id);
    let process_id = parse_opt_uuid(&body.process_id);
    let team_id = parse_opt_uuid(&body.team_id);
    let plan_start_date = parse_opt_datetime(&body.plan_start_date);
    let plan_end_date = parse_opt_datetime(&body.plan_end_date);
    let planned_quantity =
        BigDecimal::from_str(&body.planned_quantity.to_string()).unwrap_or_default();
    let priority = body
        .priority
        .as_ref()
        .and_then(|p| p.parse::<i32>().ok())
        .unwrap_or(0);

    let result = sqlx::query(
        r#"
        INSERT INTO work_orders (
            work_order_no, order_id, order_no, product_code, product_name,
            work_station_id, process_id,
            planned_quantity,
            plan_start_date, plan_end_date,
            team_id, operator,
            status, priority, remark, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, $15)
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(&body.work_order_no)
    .bind(order_id)
    .bind(&body.order_no)
    .bind(&body.product_code)
    .bind(&body.product_name)
    .bind(work_station_id)
    .bind(process_id)
    .bind(planned_quantity)
    .bind(plan_start_date)
    .bind(plan_end_date)
    .bind(team_id)
    .bind(&body.operator)
    .bind(priority)
    .bind(&body.remark)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order: {}", e);
            return ApiResponse::server_error("创建工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => {
            let id: Uuid = r.get("id");
            let work_order_no: String = r.get("work_order_no");
            let order_id: Option<Uuid> = r.get("order_id");
            let order_no: Option<String> = r.get("order_no");
            let product_code: Option<String> = r.get("product_code");
            let product_name: Option<String> = r.get("product_name");
            let work_station_id: Option<Uuid> = r.get("work_station_id");
            let process_id: Option<Uuid> = r.get("process_id");
            let planned_quantity: BigDecimal = r.get("planned_quantity");
            let completed_quantity: Option<BigDecimal> = r.get("completed_quantity");
            let plan_start_date: Option<DateTime<Utc>> = r.get("plan_start_date");
            let plan_end_date: Option<DateTime<Utc>> = r.get("plan_end_date");
            let actual_start_date: Option<DateTime<Utc>> = r.get("actual_start_date");
            let actual_end_date: Option<DateTime<Utc>> = r.get("actual_end_date");
            let team_id: Option<Uuid> = r.get("team_id");
            let operator: Option<String> = r.get("operator");
            let status: Option<String> = r.get("status");
            let priority: Option<i32> = r.get("priority");
            let remark: Option<String> = r.get("remark");
            let created_at: Option<DateTime<Utc>> = r.get("created_at");
            let updated_at: Option<DateTime<Utc>> = r.get("updated_at");
            ApiResponse::success(
                WorkOrderResponse {
                    id: id.to_string(),
                    work_order_no,
                    order_id: order_id.map(|u| u.to_string()),
                    order_no,
                    product_code: product_code.unwrap_or_default(),
                    product_name: product_name.unwrap_or_default(),
                    work_station_id: work_station_id.map(|u| u.to_string()),
                    process_id: process_id.map(|u| u.to_string()),
                    planned_quantity: big_decimal_to_f64(Some(planned_quantity)),
                    completed_quantity: big_decimal_to_f64(completed_quantity),
                    plan_start_date: opt_datetime_to_string(plan_start_date),
                    plan_end_date: opt_datetime_to_string(plan_end_date),
                    actual_start_date: opt_datetime_to_string(actual_start_date),
                    actual_end_date: opt_datetime_to_string(actual_end_date),
                    team_id: team_id.map(|u| u.to_string()),
                    operator,
                    process_name: None,
                    work_station_name: None,
                    team_name: None,
                    status: status.unwrap_or_default(),
                    priority: priority.map(|v| v.to_string()),
                    remark,
                    created_at: created_at.unwrap_or_else(Utc::now),
                    updated_at: updated_at.unwrap_or_else(Utc::now),
                },
                "创建工单成功",
            )
        }
        Err(e) => {
            if let Some(db_err) = e.as_database_error() {
                if db_err.is_unique_violation() {
                    return ApiResponse::conflict("工单号已存在");
                }
            }
            tracing::error!("Failed to create work order: {}", e);
            ApiResponse::server_error("创建工单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    request_body = UpdateWorkOrderRequest,
    responses(
        (status = 200, description = "工单更新成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn update_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateWorkOrderRequest>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for update_work_order: {}", e);
            return ApiResponse::server_error("更新工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let order_id = parse_opt_uuid(&body.order_id);
    let work_station_id = parse_opt_uuid(&body.work_station_id);
    let process_id = parse_opt_uuid(&body.process_id);
    let team_id = parse_opt_uuid(&body.team_id);
    let plan_start_date = parse_opt_datetime(&body.plan_start_date);
    let plan_end_date = parse_opt_datetime(&body.plan_end_date);
    let planned_quantity = parse_opt_big_decimal(&body.planned_quantity);
    let completed_quantity = parse_opt_big_decimal(&body.completed_quantity);
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo
        SET 
            work_order_no = COALESCE($1, work_order_no),
            order_id = COALESCE($2, order_id),
            order_no = COALESCE($3, order_no),
            product_code = COALESCE($4, product_code),
            product_name = COALESCE($5, product_name),
            work_station_id = COALESCE($6, work_station_id),
            process_id = COALESCE($7, process_id),
            planned_quantity = COALESCE($8, planned_quantity),
            completed_quantity = COALESCE($9, completed_quantity),
            plan_start_date = COALESCE($10, plan_start_date),
            plan_end_date = COALESCE($11, plan_end_date),
            team_id = COALESCE($12, team_id),
            operator = COALESCE($13, operator),
            priority = COALESCE($14, priority),
            remark = COALESCE($15, remark),
            updated_at = NOW()
        WHERE wo.id = $16
          AND wo.tenant_id = $17::uuid
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(body.work_order_no)
    .bind(order_id)
    .bind(body.order_no)
    .bind(body.product_code)
    .bind(body.product_name)
    .bind(work_station_id)
    .bind(process_id)
    .bind(planned_quantity)
    .bind(completed_quantity)
    .bind(plan_start_date)
    .bind(plan_end_date)
    .bind(team_id)
    .bind(body.operator)
    .bind(body.priority.map(|v| v.parse::<i32>().unwrap_or(0)))
    .bind(body.remark)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order update: {}", e);
            return ApiResponse::server_error("更新工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "更新工单成功"),
        Ok(None) => ApiResponse::not_found("工单不存在"),
        Err(e) => {
            if let Some(db_err) = e.as_database_error() {
                if db_err.is_unique_violation() {
                    return ApiResponse::conflict("工单号已存在");
                }
            }
            tracing::error!("Failed to update work order: {}", e);
            ApiResponse::server_error("更新工单失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单删除成功"),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn delete_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for delete_work_order: {}", e);
            return ApiResponse::server_error("删除工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo SET deleted_at = NOW()
        WHERE wo.id = $1 AND wo.status IN ('pending', 'cancelled')
          AND wo.tenant_id = $2::uuid
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order deletion: {}", e);
            return ApiResponse::server_error("删除工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => {
            if r.rows_affected() > 0 {
                ApiResponse::success(id, "删除工单成功")
            } else {
                ApiResponse::not_found("工单不存在或状态不允许删除")
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete work order: {}", e);
            ApiResponse::server_error("删除工单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}/start",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单开始成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn start_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for start_work_order: {}", e);
            return ApiResponse::server_error("开始工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo
        SET status = 'in_progress', actual_start_date = NOW(), updated_at = NOW()
        WHERE wo.id = $1 AND wo.status = 'pending'
          AND wo.tenant_id = $2::uuid
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order start: {}", e);
            return ApiResponse::server_error("开始工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "开始工单成功"),
        Ok(None) => ApiResponse::not_found("工单不存在或状态不允许开始（仅 pending 状态可开始）"),
        Err(e) => {
            tracing::error!("Failed to start work order: {}", e);
            ApiResponse::server_error("开始工单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}/complete",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单完成成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn complete_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for complete_work_order: {}", e);
            return ApiResponse::server_error("完成工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo
        SET status = 'completed', actual_end_date = NOW(), updated_at = NOW()
        WHERE wo.id = $1 AND wo.status = 'in_progress'
          AND wo.tenant_id = $2::uuid
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order completion: {}", e);
            return ApiResponse::server_error("完成工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "完成工单成功"),
        Ok(None) => {
            ApiResponse::not_found("工单不存在或状态不允许完成（仅 in_progress 状态可完成）")
        }
        Err(e) => {
            tracing::error!("Failed to complete work order: {}", e);
            ApiResponse::server_error("完成工单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}/cancel",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单取消成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn cancel_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for cancel_work_order: {}", e);
            return ApiResponse::server_error("取消工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo
        SET status = 'cancelled', updated_at = NOW()
        WHERE wo.id = $1 AND wo.status IN ('pending', 'in_progress', 'paused')
          AND wo.tenant_id = $2::uuid
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order cancellation: {}", e);
            return ApiResponse::server_error("取消工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "取消工单成功"),
        Ok(None) => {
            ApiResponse::not_found("工单不存在或状态不允许取消（已完成/已取消的工单不可取消）")
        }
        Err(e) => {
            tracing::error!("Failed to cancel work order: {}", e);
            ApiResponse::server_error("取消工单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}/pause",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单暂停成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn pause_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for pause_work_order: {}", e);
            return ApiResponse::server_error("暂停工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo
        SET status = 'paused', updated_at = NOW()
        WHERE wo.id = $1 AND wo.status = 'in_progress'
          AND wo.tenant_id = $2::uuid
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order pause: {}", e);
            return ApiResponse::server_error("暂停工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "暂停工单成功"),
        Ok(None) => {
            ApiResponse::not_found("工单不存在或状态不允许暂停（仅 in_progress 状态可暂停）")
        }
        Err(e) => {
            tracing::error!("Failed to pause work order: {}", e);
            ApiResponse::server_error("暂停工单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:work_order:write"])),
    path = "/api/mes/work-orders/{id}/resume",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单恢复成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn resume_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkOrderResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut scope = match state.db.scope().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for resume_work_order: {}", e);
            return ApiResponse::server_error("恢复工单失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工单ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE mes.work_orders wo
        SET status = 'in_progress', updated_at = NOW()
        WHERE wo.id = $1 AND wo.status = 'paused'
          AND wo.tenant_id = $2::uuid
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit work order resume: {}", e);
            return ApiResponse::server_error("恢复工单失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(Some(r)) => ApiResponse::success(row_to_work_order(&r), "恢复工单成功"),
        Ok(None) => ApiResponse::not_found("工单不存在或状态不允许恢复（仅 paused 状态可恢复）"),
        Err(e) => {
            tracing::error!("Failed to resume work order: {}", e);
            ApiResponse::server_error("恢复工单失败")
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::{Datelike, Timelike};

    #[test]
    fn test_parse_datetime_rfc3339() {
        let s = "2024-01-15T10:30:00Z";
        let result = parse_datetime(s);
        assert!(result.is_some());
        let dt = result.unwrap();
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 1);
        assert_eq!(dt.day(), 15);
    }

    #[test]
    fn test_parse_datetime_alternative_format() {
        let s = "2024-01-15 10:30:00";
        let result = parse_datetime(s);
        assert!(result.is_some());
        let dt = result.unwrap();
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.hour(), 10);
    }

    #[test]
    fn test_parse_datetime_invalid_returns_none() {
        assert!(parse_datetime("not-a-date").is_none());
        assert!(parse_datetime("").is_none());
        assert!(parse_datetime("2024/13/01").is_none());
    }

    #[test]
    fn test_parse_opt_uuid_valid() {
        let valid_id = Uuid::new_v4();
        let s = Some(valid_id.to_string());
        let result = parse_opt_uuid(&s);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), valid_id);
    }

    #[test]
    fn test_parse_opt_uuid_invalid() {
        let s = Some("not-a-uuid".to_string());
        assert!(parse_opt_uuid(&s).is_none());

        let none: Option<String> = None;
        assert!(parse_opt_uuid(&none).is_none());
    }

    #[test]
    fn test_parse_opt_datetime_some() {
        let s = Some("2024-06-20T14:00:00Z".to_string());
        let result = parse_opt_datetime(&s);
        assert!(result.is_some());
    }

    #[test]
    fn test_parse_opt_datetime_none() {
        let none: Option<String> = None;
        assert!(parse_opt_datetime(&none).is_none());
    }

    #[test]
    fn test_big_decimal_to_f64_some() {
        let bd = Some(BigDecimal::from_str("123.45").unwrap());
        let result = big_decimal_to_f64(bd);
        assert!((result - 123.45).abs() < 0.001);
    }

    #[test]
    fn test_big_decimal_to_f64_none() {
        let result = big_decimal_to_f64(None);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_big_decimal_to_f64_integer() {
        let bd = Some(BigDecimal::from(100));
        let result = big_decimal_to_f64(bd);
        assert_eq!(result, 100.0);
    }

    #[test]
    fn test_parse_opt_big_decimal_some() {
        let v = Some(123.45);
        let result = parse_opt_big_decimal(&v);
        assert!(result.is_some());
        let f = result.unwrap().to_string().parse::<f64>().unwrap();
        assert!((f - 123.45).abs() < 0.001);
    }

    #[test]
    fn test_parse_opt_big_decimal_none() {
        let v: Option<f64> = None;
        assert!(parse_opt_big_decimal(&v).is_none());
    }

    #[test]
    fn test_naive_to_utc_some() {
        let naive = NaiveDateTime::parse_from_str("2024-01-01 00:00:00", "%Y-%m-%d %H:%M:%S").ok();
        let result = naive_to_utc(naive.map(|d| d.and_utc()));
        assert_eq!(result.year(), 2024);
    }

    #[test]
    fn test_naive_to_utc_none() {
        let result = naive_to_utc(None);
        assert!(result <= Utc::now());
    }

    #[test]
    fn test_datetime_to_string_returns_nonempty() {
        let naive = NaiveDateTime::parse_from_str("2024-01-01 12:00:00", "%Y-%m-%d %H:%M:%S").ok();
        let s = datetime_to_string(naive.map(|d| d.and_utc()));
        assert!(!s.is_empty());
        assert!(s.contains("2024"));
    }

    #[test]
    fn test_opt_datetime_to_string_some_and_none() {
        let naive = NaiveDateTime::parse_from_str("2024-03-15 08:30:00", "%Y-%m-%d %H:%M:%S").ok();
        let some_result = opt_datetime_to_string(naive.map(|d| d.and_utc()));
        assert!(some_result.is_some());
        assert!(some_result.unwrap().contains("2024"));

        let none_result = opt_datetime_to_string(None);
        assert!(none_result.is_none());
    }
}
