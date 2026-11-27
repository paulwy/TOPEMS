//! Production Order handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::resolve_create_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{commit_retry, EventType, ProductionOrderCreatedPayload};
use utoipa::ToSchema;

use crate::modules::approval_common::{
    build_approve_response, build_reject_response, build_start_response,
    create_approval_and_log_db, execute_transition_and_log_db, reject_and_log_db,
};
use crate::modules::production_order_status::ProductionOrderStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

/// v1.85 内部调用放行：无认证（claims.sub 为空，如 mobile service client 直连）
/// 的请求跳过权限检查，有 token 的请求仍走 check_permission（Web 端防线保留）。
async fn check_perm_or_internal<T>(
    db: &sqlx::PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), ApiResponse<T>> {
    if claims.sub.is_empty() {
        return Ok(());
    }
    check_permission(db, claims, permission).await
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/orders",
            get(list_production_orders).post(create_production_order),
        )
        // v1.85 别名路由：mobile MesApi 契约路径为 /production/orders，
        // MES 权威路径为 /orders，补别名兼容层对齐契约（后续契约统一时收敛）
        .route(
            "/production/orders",
            get(list_production_orders).post(create_production_order),
        )
        .route("/orders/from-erp", post(create_order_from_erp))
        .route(
            "/orders/{id}",
            get(get_production_order)
                .put(update_production_order)
                .delete(delete_production_order),
        )
        .route("/orders/{id}/release", put(release_production_order))
        .route("/orders/{id}/start", put(start_production_order))
        .route("/orders/{id}/complete", put(complete_production_order))
        .route("/orders/{id}/cancel", put(cancel_production_order))
        // APV-1: 生产订单审批端点
        .route("/orders/{id}/approval/start", post(start_order_approval))
        .route("/orders/{id}/approval/approve", post(approve_order))
        .route("/orders/{id}/approval/reject", post(reject_order))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListProductionOrdersQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ProductionOrderSource {
    #[serde(rename = "manual")]
    Manual,
    #[serde(rename = "erp_sales_order")]
    ErpSalesOrder,
    #[serde(rename = "mrp")]
    Mrp,
}

impl std::fmt::Display for ProductionOrderSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProductionOrderSource::Manual => write!(f, "manual"),
            ProductionOrderSource::ErpSalesOrder => write!(f, "erp_sales_order"),
            ProductionOrderSource::Mrp => write!(f, "mrp"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErpSalesOrderInfo {
    pub order_id: Uuid,
    pub order_number: String,
    pub customer_name: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub unit: String,
    pub delivery_date: Option<DateTime<Utc>>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateFromErpRequest {
    pub erp_order: ErpSalesOrderInfo,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_completion_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateProductionOrderRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateProductionOrderRequest {
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub quantity: Option<f64>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProductionOrderResponse {
    pub id: Uuid,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub status: String,
    pub source: String,
    pub source_order_id: Option<Uuid>,
    pub source_order_number: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListProductionOrdersResponse {
    pub orders: Vec<ProductionOrderResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// 写路径 RETURNING 的运行时行类型。
///
/// 这 5 个状态流转 handler 需要把租户谓词改为 Claims 绑定参数（见各处注释），
/// 而 `sqlx::query!` 的 SQL 哈希会变化、离线缓存（.sqlx）无法在不重编全工作区
/// 的情况下更新（live DB 编译又被 unified-core 的既有 schema 漂移阻断），
/// 故改用运行时 `query_as` + FromRow。字段与 `ProductionOrderResponse` 一一对应，
/// 映射代码保持原样。
#[derive(Debug, sqlx::FromRow)]
struct ProductionOrderRow {
    id: Uuid,
    order_no: String,
    product_id: Option<Uuid>,
    product_name: String,
    product_code: String,
    quantity: Option<f64>,
    completed_quantity: Option<f64>,
    status: String,
    source: Option<String>,
    source_order_id: Option<Uuid>,
    source_order_number: Option<String>,
    planned_start_date: Option<DateTime<Utc>>,
    planned_end_date: Option<DateTime<Utc>>,
    actual_start_date: Option<DateTime<Utc>>,
    actual_end_date: Option<DateTime<Utc>>,
    workshop_id: Option<Uuid>,
    notes: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

// ==================== State Transition ====================

pub fn validate_state_transition(
    current_status: &str,
    target_status: &str,
) -> Result<(), TopemsError> {
    let from = ProductionOrderStatus::from_db_str(current_status).ok_or_else(|| {
        TopemsError::BusinessLogic(format!("Unknown current status: {current_status}"))
    })?;
    let to = ProductionOrderStatus::from_db_str(target_status).ok_or_else(|| {
        TopemsError::BusinessLogic(format!("Unknown target status: {target_status}"))
    })?;
    if from.can_transition_to(to) {
        return Ok(());
    }
    Err(TopemsError::BusinessLogic(format!(
        "Invalid state transition: {} -> {}",
        from.as_db_str(),
        to.as_db_str()
    )))
}

/// 归一化分页参数：page/page_size 来自查询串，调用方可能传 0 或负数。
/// 直接代入 `(page - 1) * page_size` 会得到负 OFFSET（PostgreSQL 报错 → 500），
/// 故下限钳到 1，保证任意入参都只回落到第一页而非 500。
fn normalize_page_params(page: Option<i32>, page_size: Option<i32>) -> (i64, i64) {
    let page = i64::from(page.unwrap_or(1)).max(1);
    let page_size = i64::from(page_size.unwrap_or(10)).max(1);
    (page, page_size)
}

// ==================== Production Order Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/orders",
    tag = "ProductionOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "生产订单列表", body = ApiResponse<ListProductionOrdersResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn list_production_orders(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProductionOrdersQuery>,
) -> ApiResponse<ListProductionOrdersResponse> {
    if let Err(e) =
        check_perm_or_internal(&state.pool, &claims, &ModulePermission::ProductionOrderRead).await
    {
        return e;
    }

    let (page, page_size) = normalize_page_params(query.page, query.page_size);
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE deleted_at IS NULL AND status IN ('pending','released','in_progress','paused','completed','closed','cancelled','planned')");

    if let Some(raw) = query.status {
        let status = match ProductionOrderStatus::from_db_str(&raw) {
            Some(v) => v.as_db_str().to_string(),
            None => return ApiResponse::bad_request("无效的生产订单状态"),
        };
        where_clause.push_str(" AND status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (order_number ILIKE $1 OR product_name ILIKE $1 OR product_code ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (order_number ILIKE ${} OR product_name ILIKE ${} OR product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取生产工单列表失败");
        }
    };

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.production_orders{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }
    count_query = count_query.bind(tenant_uuid);

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count production orders: {}", e);
            return ApiResponse::server_error("获取生产工单列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        FROM mes.production_orders
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // 占位符编号：where/status/search 用 1..n、tenant 用 n+1；LIMIT/OFFSET 顺延 n+2/n+3
        // （旧代码 n+1 与 tenant 同号冲突 → bind 不匹配 500）
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let orders = match fetch_query.fetch_all(&mut scope).await {
        Ok(o) => o,
        Err(e) => {
            tracing::error!("Failed to fetch production orders: {}", e);
            return ApiResponse::server_error("获取生产工单列表失败");
        }
    };

    let orders_list: Vec<ProductionOrderResponse> = orders
        .into_iter()
        .map(|r| ProductionOrderResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            order_no: r.try_get::<String, _>("order_no").unwrap_or_default(),
            product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            quantity: r
                .try_get::<Option<f64>, _>("quantity")
                .ok()
                .flatten()
                .unwrap_or(0.0),
            completed_quantity: r
                .try_get::<Option<f64>, _>("completed_quantity")
                .ok()
                .flatten()
                .unwrap_or(0.0),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            source: r
                .try_get::<Option<String>, _>("source")
                .ok()
                .flatten()
                .unwrap_or_else(|| "manual".to_string()),
            source_order_id: r
                .try_get::<Option<Uuid>, _>("source_order_id")
                .ok()
                .flatten(),
            source_order_number: r
                .try_get::<Option<String>, _>("source_order_number")
                .ok()
                .flatten(),
            planned_start_date: r
                .try_get::<Option<DateTime<Utc>>, _>("planned_start_date")
                .ok()
                .flatten(),
            planned_end_date: r
                .try_get::<Option<DateTime<Utc>>, _>("planned_end_date")
                .ok()
                .flatten(),
            actual_start_date: r
                .try_get::<Option<DateTime<Utc>>, _>("actual_start_date")
                .ok()
                .flatten(),
            actual_end_date: r
                .try_get::<Option<DateTime<Utc>>, _>("actual_end_date")
                .ok()
                .flatten(),
            workshop_id: r.try_get::<Option<Uuid>, _>("workshop_id").ok().flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten()
                .unwrap_or_else(Utc::now),
            updated_at: r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten()
                .unwrap_or_else(Utc::now),
        })
        .collect();

    ApiResponse::success(
        ListProductionOrdersResponse {
            orders: orders_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取生产工单列表成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders",
    tag = "ProductionOrder",
    request_body = CreateProductionOrderRequest,
    responses(
        (status = 200, description = "生产订单创建成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateProductionOrderRequest>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    // 入参语义校验：数量必须为正。此前负数会直接落库（quantity=-1 返回 200）。
    if !req.quantity.is_finite() || req.quantity <= 0.0 {
        return ApiResponse::unprocessable("数量必须大于 0");
    }

    let now = Utc::now();
    let order_no = format!(
        "MO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    // RLS 连接级隔离：事务内设置租户上下文，确保 set_config 与 INSERT 同连接
    // （tenant_middleware 在 pool 连接上设置的 GUC 不保证与本查询取到同一连接）
    let tenant_opt: Option<Uuid> = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin scope for create_production_order: {}", e);
            return ApiResponse::server_error("创建生产工单失败");
        }
    };

    // B354：车间必须同租户且未软删；服务身份无租户时不得绑定车间。
    if let Some(workshop_id) = req.workshop_id {
        match tenant_opt {
            Some(tenant_id) => {
                match crate::shared::workshop_ref::workshop_exists_in_tenant(
                    &mut scope,
                    workshop_id,
                    tenant_id,
                )
                .await
                {
                    Ok(true) => {}
                    Ok(false) => return ApiResponse::bad_request("车间不存在或不属于当前租户"),
                    Err(e) => {
                        tracing::error!("[mes] 生产工单创建前校验车间失败: {}", e);
                        return ApiResponse::server_error("创建生产工单失败");
                    }
                }
            }
            None => return ApiResponse::bad_request("缺少租户上下文，无法绑定车间"),
        }
    }

    let result = sqlx::query!(
        r#"
        INSERT INTO mes.production_orders (
            order_number, order_no, product_name, product_code,
            quantity, completed_quantity, status,
            planned_start_date, planned_end_date, workshop_id, notes,
            created_at, updated_at, tenant_id
        ) VALUES ($1, $1, $2, $3, $4, 0, 'pending', $5, $6, $7, $8, $9, $9, $10)
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        order_no,
        req.product_name,
        req.product_code,
        req.quantity as i32,
req.planned_start_date.map(|d| d.date_naive()),
        req.planned_end_date.map(|d| d.date_naive()),
        req.workshop_id,
        req.notes,
        now,
        tenant_opt,
    )
    .fetch_one(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tx for create_production_order: {}", e);
                return ApiResponse::server_error("创建生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to create production order: {}", e);
            return ApiResponse::server_error("创建生产工单失败");
        }
    };

    let order = ProductionOrderResponse {
        id: result.id,
        order_no: result.order_no,
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: result.quantity.unwrap_or_default(),
        completed_quantity: result.completed_quantity.unwrap_or_default(),
        status: result.status,
        source: result.source.unwrap_or_else(|| "manual".to_string()),
        source_order_id: result.source_order_id,
        source_order_number: result.source_order_number,
        planned_start_date: result.planned_start_date,
        planned_end_date: result.planned_end_date,
        actual_start_date: result.actual_start_date,
        actual_end_date: result.actual_end_date,
        workshop_id: result.workshop_id,
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };

    if let Some(ref publisher) = state.event_publisher {
        let publisher = publisher.clone();
        let oid = order.id;
        let ono = order.order_no.clone();
        let pid = order.product_id;
        let pname = order.product_name.clone();
        let qty = order.quantity;
        let psd = order.planned_start_date;
        let cby = Some(claims.sub.clone());
        tokio::spawn(async move {
            let payload = ProductionOrderCreatedPayload {
                order_id: oid,
                order_no: ono,
                product_id: pid,
                product_name: Some(pname),
                quantity: Some(qty),
                planned_start_date: psd,
                created_by: cby,
            };
            let et = EventType::ProductionOrderCreated;
            match publisher.publish_event(et, &payload).await {
                Ok(_) => tracing::info!(
                    "[mes] ProductionOrderCreated 事件发布成功 - order_id={}",
                    oid
                ),
                Err(e) => {
                    tracing::warn!(
                        "[mes] ProductionOrderCreated 事件发布失败: {}，入重试队列",
                        e
                    );
                    commit_retry::push_retry_typed("mes", et, &payload).await;
                }
            }
        });
    }

    ApiResponse::success(order, "生产工单创建成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/from-erp",
    tag = "ProductionOrder",
    request_body = CreateFromErpRequest,
    responses(
        (status = 200, description = "从ERP创建生产订单成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_order_from_erp(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateFromErpRequest>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();
    let order_no = format!(
        "MO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let planned_start = req.planned_start_date.unwrap_or(now);
    let planned_end = req
        .planned_completion_date
        .or(req.erp_order.delivery_date)
        .unwrap_or_else(|| now + chrono::Duration::days(7));

    // 租户来源统一为 Claims：服务身份（tenant 为空）落 NULL 公共行；
    // 事务内显式设置同一租户上下文，保证与 INSERT 同一连接（RLS WITH CHECK 放行）
    let tenant_opt: Option<Uuid> = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin scope for create_order_from_erp: {}", e);
            return ApiResponse::server_error("从ERP订单创建生产工单失败");
        }
    };

    // B354：车间必须同租户且未软删；服务身份无租户时不得绑定车间。
    if let Some(workshop_id) = req.workshop_id {
        match tenant_opt {
            Some(tenant_id) => {
                match crate::shared::workshop_ref::workshop_exists_in_tenant(
                    &mut scope,
                    workshop_id,
                    tenant_id,
                )
                .await
                {
                    Ok(true) => {}
                    Ok(false) => return ApiResponse::bad_request("车间不存在或不属于当前租户"),
                    Err(e) => {
                        tracing::error!("[mes] 生产工单创建前校验车间失败: {}", e);
                        return ApiResponse::server_error("从ERP订单创建生产工单失败");
                    }
                }
            }
            None => return ApiResponse::bad_request("缺少租户上下文，无法绑定车间"),
        }
    }

    let result = sqlx::query!(
        r#"
        INSERT INTO mes.production_orders (
            order_number, order_no, product_name, product_code, quantity,
            status, source_order_id, source_order_number,
            planned_start_date, planned_end_date, workshop_id, notes,
            created_at, updated_at, tenant_id
        ) VALUES ($1, $1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $11, $12)
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        order_no,
        req.erp_order.product_name,
        req.erp_order.product_code,
        req.erp_order.quantity as i32,
        req.erp_order.order_id,
        req.erp_order.order_number,
planned_start.date_naive(),
        planned_end.date_naive(),
        req.workshop_id,
        req.notes,
        now,
        tenant_opt,
    )
    .fetch_one(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tx for create_order_from_erp: {}", e);
                return ApiResponse::server_error("从ERP订单创建生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to create production order from ERP: {}", e);
            return ApiResponse::server_error("从ERP订单创建生产工单失败");
        }
    };

    let order = ProductionOrderResponse {
        id: result.id,
        order_no: result.order_no,
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: result.quantity.unwrap_or_default(),
        completed_quantity: result.completed_quantity.unwrap_or_default(),
        status: result.status,
        source: result
            .source
            .unwrap_or_else(|| "erp_sales_order".to_string()),
        source_order_id: result.source_order_id,
        source_order_number: result.source_order_number,
        planned_start_date: result.planned_start_date,
        planned_end_date: result.planned_end_date,
        actual_start_date: result.actual_start_date,
        actual_end_date: result.actual_end_date,
        workshop_id: result.workshop_id,
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };

    tracing::info!(
        "[MES] Created production order {} from ERP order {}",
        order_no,
        req.erp_order.order_number
    );

    ApiResponse::success(order, "从ERP订单创建生产工单成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/orders/{id}",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单详情", body = ApiResponse<ProductionOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) =
        check_perm_or_internal(&state.pool, &claims, &ModulePermission::ProductionOrderRead).await
    {
        return e;
    }

    // 详情读取同样按 Claims 租户隔离 + 过滤软删除，避免跨租户 200 或已删单可读。
    let tenant_id = get_tenant_id(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取生产工单失败");
        }
    };
    let result = sqlx::query(
        r#"
        SELECT 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        FROM mes.production_orders
        WHERE id = $1 AND deleted_at IS NULL AND status IN ('pending','released','in_progress','paused','completed','closed','cancelled','planned')
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch production order: {}", e);
            return ApiResponse::server_error("获取生产工单失败");
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                order_no: r.try_get::<String, _>("order_no").unwrap_or_default(),
                product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
                product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
                product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
                quantity: r
                    .try_get::<Option<f64>, _>("quantity")
                    .ok()
                    .flatten()
                    .unwrap_or_default(),
                completed_quantity: r
                    .try_get::<Option<f64>, _>("completed_quantity")
                    .ok()
                    .flatten()
                    .unwrap_or_default(),
                status: r.try_get::<String, _>("status").unwrap_or_default(),
                source: r
                    .try_get::<Option<String>, _>("source")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "manual".to_string()),
                source_order_id: r
                    .try_get::<Option<Uuid>, _>("source_order_id")
                    .ok()
                    .flatten(),
                source_order_number: r
                    .try_get::<Option<String>, _>("source_order_number")
                    .ok()
                    .flatten(),
                planned_start_date: r
                    .try_get::<Option<DateTime<Utc>>, _>("planned_start_date")
                    .ok()
                    .flatten(),
                planned_end_date: r
                    .try_get::<Option<DateTime<Utc>>, _>("planned_end_date")
                    .ok()
                    .flatten(),
                actual_start_date: r
                    .try_get::<Option<DateTime<Utc>>, _>("actual_start_date")
                    .ok()
                    .flatten(),
                actual_end_date: r
                    .try_get::<Option<DateTime<Utc>>, _>("actual_end_date")
                    .ok()
                    .flatten(),
                workshop_id: r.try_get::<Option<Uuid>, _>("workshop_id").ok().flatten(),
                notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
                created_at: r
                    .try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten()
                    .unwrap_or_else(Utc::now),
                updated_at: r
                    .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                    .ok()
                    .flatten()
                    .unwrap_or_else(Utc::now),
            };
            ApiResponse::success(order, "获取生产工单成功")
        }
        None => ApiResponse::not_found("生产工单不存在"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = UpdateProductionOrderRequest,
    responses(
        (status = 200, description = "生产订单更新成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn update_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionOrderRequest>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    // 租户来源统一为 Claims（与 create 写入的 tenant_id 同源）。
    // `Db::scope()` 在独立事务上同时落 search_path 与请求租户 GUC，RLS 与内联谓词可见。
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新生产工单失败");
        }
    };

    // B354：换绑车间同样要求同租户且未软删。
    if let Some(workshop_id) = req.workshop_id {
        match crate::shared::workshop_ref::workshop_exists_in_tenant(
            &mut scope,
            workshop_id,
            tenant_id,
        )
        .await
        {
            Ok(true) => {}
            Ok(false) => return ApiResponse::bad_request("车间不存在或不属于当前租户"),
            Err(e) => {
                tracing::error!("[mes] 生产工单更新前校验车间失败: {}", e);
                return ApiResponse::server_error("更新生产工单失败");
            }
        }
    }

    let result = sqlx::query_as::<_, ProductionOrderRow>(
        r#"
        UPDATE mes.production_orders SET
            product_name = COALESCE($2, product_name),
            product_code = COALESCE($3, product_code),
            quantity = COALESCE($4, quantity),
            planned_start_date = COALESCE($5, planned_start_date),
            planned_end_date = COALESCE($6, planned_end_date),
            workshop_id = COALESCE($7, workshop_id),
            notes = COALESCE($8, notes),
            updated_at = $9
        WHERE id = $1 AND status = ANY($11) AND tenant_id = $10::uuid AND deleted_at IS NULL
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(req.product_name)
    .bind(req.product_code)
    .bind(req.quantity.map(|q| q as i64))
    .bind(req.planned_start_date.map(|d| d.date_naive()))
    .bind(req.planned_end_date.map(|d| d.date_naive()))
    .bind(req.workshop_id)
    .bind(req.notes)
    .bind(Utc::now())
    .bind(tenant_id)
    .bind(ProductionOrderStatus::update_from())
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit production order update: {}", e);
                return ApiResponse::server_error("更新生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to update production order: {}", e);
            return ApiResponse::server_error("更新生产工单失败");
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(order, "生产工单更新成功")
        }
        None => ApiResponse::not_found("生产工单不存在或状态不允许修改"),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单删除成功"),
        (status = 404, description = "生产订单不存在"),
    ),
)]
pub async fn delete_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除生产工单失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.production_orders SET deleted_at = NOW()
        WHERE id = $1 AND status = ANY($3) AND deleted_at IS NULL
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(ProductionOrderStatus::delete_from())
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit delete production order: {}", e);
                return ApiResponse::server_error("删除生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to delete production order: {}", e);
            return ApiResponse::server_error("删除生产工单失败");
        }
    };

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "生产工单删除成功")
    } else {
        ApiResponse::not_found("生产工单不存在或状态不允许删除")
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/start",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单开始成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
pub async fn start_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderStart,
    )
    .await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("启动生产工单失败");
        }
    };

    let result = sqlx::query_as::<_, ProductionOrderRow>(
        r#"
        UPDATE mes.production_orders SET
            status = $2,
            actual_start_date = $3,
            updated_at = $4
        WHERE id = $1 AND status = ANY($5) AND tenant_id = $6::uuid AND deleted_at IS NULL
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(ProductionOrderStatus::InProgress.as_db_str())
    .bind(now.date_naive())
    .bind(now)
    .bind(ProductionOrderStatus::start_from())
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit start production order: {}", e);
                return ApiResponse::server_error("启动生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to start production order: {}", e);
            return ApiResponse::server_error("启动生产工单失败");
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(order, "生产工单启动成功")
        }
        None => ApiResponse::not_found("生产工单不存在或状态不允许启动"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/complete",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单完成成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
pub async fn complete_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderComplete,
    )
    .await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("完成生产工单失败");
        }
    };

    let result = sqlx::query_as::<_, ProductionOrderRow>(
        r#"
        UPDATE mes.production_orders SET
            status = $2,
            completed_quantity = quantity,
            actual_end_date = $3,
            updated_at = $4
        WHERE id = $1 AND status = ANY($5) AND tenant_id = $6::uuid AND deleted_at IS NULL
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(ProductionOrderStatus::Completed.as_db_str())
    .bind(now.date_naive())
    .bind(now)
    .bind(ProductionOrderStatus::complete_from())
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit complete production order: {}", e);
                return ApiResponse::server_error("完成生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to complete production order: {}", e);
            return ApiResponse::server_error("完成生产工单失败");
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(order, "生产工单完成成功")
        }
        None => ApiResponse::not_found("生产工单不存在或状态不允许完成"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/cancel",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单取消成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
pub async fn cancel_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderCancel,
    )
    .await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("取消生产工单失败");
        }
    };

    let result = sqlx::query_as::<_, ProductionOrderRow>(
        r#"
        UPDATE mes.production_orders SET
            status = $2,
            updated_at = $3
        WHERE id = $1 AND status = ANY($4) AND tenant_id = $5::uuid AND deleted_at IS NULL
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(ProductionOrderStatus::Cancelled.as_db_str())
    .bind(now)
    .bind(ProductionOrderStatus::cancel_from())
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit cancel production order: {}", e);
                return ApiResponse::server_error("取消生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to cancel production order: {}", e);
            return ApiResponse::server_error("取消生产工单失败");
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(order, "生产工单取消成功")
        }
        None => ApiResponse::not_found("生产工单不存在或状态不允许取消"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/release",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单下达成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
pub async fn release_production_order(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionOrderResponse> {
    if let Err(e) = check_perm_or_internal(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("发布生产工单失败");
        }
    };

    let result = sqlx::query_as::<_, ProductionOrderRow>(
        r#"
        UPDATE mes.production_orders SET
            status = $2,
            updated_at = $3
        WHERE id = $1 AND status = ANY($4) AND tenant_id = $5::uuid AND deleted_at IS NULL
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(ProductionOrderStatus::Released.as_db_str())
    .bind(now)
    .bind(ProductionOrderStatus::release_from())
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit release production order: {}", e);
                return ApiResponse::server_error("发布生产工单失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to release production order: {}", e);
            return ApiResponse::server_error("发布生产工单失败");
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(order, "生产工单发布成功")
        }
        None => ApiResponse::not_found("生产工单不存在或状态不允许发布"),
    }
}

// ==================== APV-1: 生产订单审批端点（骨架） ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ApprovalStartRequest {
    pub reason: String,
    #[allow(dead_code)]
    pub change_scope: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ApprovalDecisionRequest {
    pub approval_id: Uuid,
    pub comment: String,
    #[allow(dead_code)]
    pub expected_approval_version: i32,
}

/// 发起生产订单审批（撤单/回滚场景）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/{id}/approval/start",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = ApprovalStartRequest,
    responses(
        (status = 200, description = "审批发起成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn start_order_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalStartRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_perm_or_internal(&state.pool, &claims, &ModulePermission::MesOrderApprove).await
    {
        return e;
    }
    // 校验当前 status + 创建 approval 记录并写入 audit log
    let approver_id = match claims.user_id() {
        Ok(uid) => uid,
        Err(_) => return ApiResponse::unauthorized("无效的用户身份"),
    };
    let approval_id = match create_approval_and_log_db(
        &state.db,
        "production_order",
        id,
        "pending",
        "released",
        approver_id,
    )
    .await
    {
        Ok(aid) => aid,
        Err(e) => {
            tracing::error!("发起生产订单审批失败: {}", e);
            return ApiResponse::server_error("发起审批失败");
        }
    };
    ApiResponse::success(build_start_response(approval_id), "审批已发起")
}

/// 审批通过
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/{id}/approval/approve",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = ApprovalDecisionRequest,
    responses(
        (status = 200, description = "审批通过成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn approve_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalDecisionRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_perm_or_internal(&state.pool, &claims, &ModulePermission::MesOrderApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，执行状态转换并写入 audit log
    if let Err(e) = execute_transition_and_log_db(
        &state.db,
        Some("production_orders"),
        "production_order",
        id,
        req.approval_id,
        "pending",
        "released",
    )
    .await
    {
        tracing::error!("生产订单审批通过失败: {}", e);
        return ApiResponse::server_error("审批通过失败");
    }
    ApiResponse::success(build_approve_response(req.approval_id), "审批通过成功")
}

/// 审批驳回
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/{id}/approval/reject",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = ApprovalDecisionRequest,
    responses(
        (status = 200, description = "审批驳回成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn reject_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalDecisionRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_perm_or_internal(&state.pool, &claims, &ModulePermission::MesOrderApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，记录驳回并写入 audit log
    if let Err(e) = reject_and_log_db(
        &state.db,
        "production_order",
        id,
        req.approval_id,
        &req.comment,
    )
    .await
    {
        tracing::error!("生产订单审批驳回失败: {}", e);
        return ApiResponse::server_error("审批驳回失败");
    }
    ApiResponse::success(build_reject_response(req.approval_id), "审批驳回成功")
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;
    use serde::Serialize;
    use uuid::Uuid;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(val: &T) {
        let s1 = serde_json::to_string(val).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&s1).unwrap();
        let val2: T = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&val2).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&s2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_production_order_source_roundtrip() {
        roundtrip(&ProductionOrderSource::Manual);
        roundtrip(&ProductionOrderSource::ErpSalesOrder);
        roundtrip(&ProductionOrderSource::Mrp);
    }

    #[test]
    fn test_normalize_page_params_defaults_and_clamps() {
        // 缺省
        assert_eq!(normalize_page_params(None, None), (1, 10));
        // 显式 0 / 负数不得产生负 OFFSET（旧实现 page=0 → offset=-10 → SQL 报错 500）
        assert_eq!(normalize_page_params(Some(0), Some(10)), (1, 10));
        assert_eq!(normalize_page_params(Some(-3), Some(-5)), (1, 1));
        assert_eq!(normalize_page_params(Some(0), Some(0)), (1, 1));
        // 正常值透传
        assert_eq!(normalize_page_params(Some(2), Some(50)), (2, 50));
    }

    #[test]
    fn test_erp_sales_order_info_roundtrip_some() {
        let info = ErpSalesOrderInfo {
            order_id: uid(),
            order_number: "SO-20260815-001".to_string(),
            customer_name: "ABC 公司".to_string(),
            product_name: "轴承 SKF-6205".to_string(),
            product_code: "BRG-6205".to_string(),
            quantity: 500.0,
            unit: "PCS".to_string(),
            delivery_date: Some(now()),
            priority: Some(1),
        };
        roundtrip(&info);
    }

    #[test]
    fn test_erp_sales_order_info_roundtrip_none() {
        let info = ErpSalesOrderInfo {
            order_id: uid(),
            order_number: "SO-20260815-002".to_string(),
            customer_name: "XYZ 公司".to_string(),
            product_name: "轴承 SKF-6205".to_string(),
            product_code: "BRG-6205".to_string(),
            quantity: 300.0,
            unit: "PCS".to_string(),
            delivery_date: None,
            priority: None,
        };
        roundtrip(&info);
    }

    #[test]
    fn test_validate_state_transition_same_status() {
        assert!(validate_state_transition("pending", "pending").is_ok());
        assert!(validate_state_transition("in_progress", "in_progress").is_ok());
    }

    #[test]
    fn test_validate_state_transition_valid_paths() {
        assert!(validate_state_transition("pending", "released").is_ok());
        assert!(validate_state_transition("pending", "cancelled").is_ok());
        assert!(validate_state_transition("released", "in_progress").is_ok());
        assert!(validate_state_transition("released", "cancelled").is_ok());
        assert!(validate_state_transition("in_progress", "completed").is_ok());
        assert!(validate_state_transition("in_progress", "paused").is_ok());
        assert!(validate_state_transition("paused", "in_progress").is_ok());
        assert!(validate_state_transition("paused", "cancelled").is_ok());
        assert!(validate_state_transition("completed", "closed").is_ok());
    }

    #[test]
    fn test_validate_state_transition_invalid_paths() {
        assert!(validate_state_transition("pending", "in_progress").is_err());
        assert!(validate_state_transition("pending", "completed").is_err());
        assert!(validate_state_transition("released", "completed").is_err());
        assert!(validate_state_transition("in_progress", "released").is_err());
        assert!(validate_state_transition("completed", "in_progress").is_err());
        assert!(validate_state_transition("cancelled", "released").is_err());
        assert!(validate_state_transition("closed", "completed").is_err());
    }

    #[test]
    fn test_validate_state_transition_error_message() {
        let err = validate_state_transition("pending", "completed").unwrap_err();
        assert!(err.to_string().contains("Invalid state transition"));
        assert!(err.to_string().contains("pending"));
        assert!(err.to_string().contains("completed"));
    }
}
