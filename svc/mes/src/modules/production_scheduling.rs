//! Production Scheduling handlers

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
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use std::str::FromStr;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use topems_shared_db::decimal::big_decimal_to_f64;

use crate::modules::production_schedule_status::ProductionScheduleStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/schedules",
            get(list_production_schedules).post(create_production_schedule),
        )
        .route(
            "/schedules/{id}",
            get(get_production_schedule)
                .put(update_production_schedule)
                .delete(delete_production_schedule),
        )
        .route("/schedules/{id}/adjust", put(adjust_schedule))
        .route("/schedules/gantt", get(get_gantt_data))
        // 前端契约兜底：模板带可选路径段 — 待上游支持
        .route("/schedules/gantt/{_id}", get(get_gantt_data))
        .route("/schedules/{id}/submit", post(submit_schedule))
        .route("/schedules/{id}/release", post(release_schedule))
        .route("/schedules/{id}/hold", post(hold_schedule))
        .route("/schedules/{id}/start", post(start_schedule))
        .route("/schedules/{id}/complete", post(complete_schedule))
        .route("/schedules/{id}/cancel", post(cancel_schedule))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, sqlx::FromRow)]
struct ProductionScheduleRow {
    id: Uuid,
    schedule_no: String,
    order_id: Option<Uuid>,
    order_no: Option<String>,
    product_id: Option<Uuid>,
    product_name: String,
    product_code: String,
    quantity: BigDecimal,
    work_station_id: Option<Uuid>,
    equipment_id: Option<Uuid>,
    process_id: Option<Uuid>,
    planned_start_time: Option<DateTime<Utc>>,
    planned_end_time: Option<DateTime<Utc>>,
    actual_start_time: Option<DateTime<Utc>>,
    actual_end_time: Option<DateTime<Utc>>,
    status: Option<String>,
    priority: Option<i32>,
    sequence: Option<i32>,
    notes: Option<String>,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListProductionSchedulesQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProductionScheduleResponse {
    pub id: Uuid,
    pub schedule_no: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub work_station_id: Option<Uuid>,
    pub work_station_name: Option<String>,
    pub equipment_id: Option<Uuid>,
    pub equipment_name: Option<String>,
    pub process_id: Option<Uuid>,
    pub process_name: Option<String>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    pub actual_start_time: Option<DateTime<Utc>>,
    pub actual_end_time: Option<DateTime<Utc>>,
    pub status: String,
    pub priority: i32,
    pub sequence: i32,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListProductionSchedulesResponse {
    pub schedules: Vec<ProductionScheduleResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// 前端下拉框一律提交字符串，priority 需同时吃 "5" 与 5
fn de_opt_i32_flexible<'de, D>(d: D) -> Result<Option<i32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Raw {
        Num(i64),
        Text(String),
    }
    let raw = Option::<Raw>::deserialize(d)?;
    match raw {
        None => Ok(None),
        Some(Raw::Num(n)) => i32::try_from(n)
            .map(Some)
            .map_err(|_| serde::de::Error::custom("quantity out of range")),
        Some(Raw::Text(s)) => {
            let t = s.trim();
            if t.is_empty() {
                Ok(None)
            } else {
                t.parse::<i32>().map(Some).map_err(serde::de::Error::custom)
            }
        }
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateProductionScheduleRequest {
    pub order_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    /// 缺省时从关联生产订单反查（前端排程表单只选订单与数量）
    #[serde(default)]
    pub product_name: String,
    #[serde(default)]
    pub product_code: String,
    pub quantity: f64,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    #[serde(default, deserialize_with = "de_opt_i32_flexible")]
    pub priority: Option<i32>,
    pub sequence: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateProductionScheduleRequest {
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    #[serde(default, deserialize_with = "de_opt_i32_flexible")]
    pub priority: Option<i32>,
    pub sequence: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct AdjustScheduleRequest {
    pub schedule_ids: Vec<Uuid>,
    pub new_start_time: Option<DateTime<Utc>>,
    pub new_work_station_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct GanttTask {
    pub id: String,
    pub name: String,
    pub order_no: Option<String>,
    #[serde(alias = "start", rename = "start_time")]
    pub start: DateTime<Utc>,
    #[serde(alias = "end", rename = "end_time")]
    pub end: DateTime<Utc>,
    pub progress: f64,
    pub status: String,
    pub resource: Option<String>,
    pub parent: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct GanttDateRange {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct GanttDataResponse {
    pub tasks: Vec<GanttTask>,
    #[serde(rename = "work_stations")]
    pub resources: Vec<GanttResource>,
    pub date_range: GanttDateRange,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct GanttResource {
    pub id: String,
    pub name: String,
    pub category: String,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

// ==================== Production Scheduling Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/schedules",
    tag = "ProductionScheduling",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "排产列表", body = ApiResponse<ListProductionSchedulesResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn list_production_schedules(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProductionSchedulesQuery>,
) -> ApiResponse<ListProductionSchedulesResponse> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    // 租户作用域读：production_schedules 受 RLS（ENABLE+FORCE）保护，
    // 裸 pool 不带 app.tenant_id GUC，策略收紧后恒为 0 行。
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
            return ApiResponse::server_error("获取生产排产列表失败");
        }
    };

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE ps.deleted_at IS NULL AND ps.status IN ('pending','scheduled','released','running','completed','cancelled')");

    if let Some(raw) = query.status {
        let status = match ProductionScheduleStatus::from_db_str(&raw) {
            Some(v) => v.as_db_str().to_string(),
            None => return ApiResponse::bad_request("无效的排产状态"),
        };
        where_clause.push_str(" AND ps.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (ps.schedule_no ILIKE $1 OR ps.order_no ILIKE $1 OR ps.product_name ILIKE $1 OR ps.product_code ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (ps.schedule_no ILIKE ${} OR ps.order_no ILIKE ${} OR ps.product_name ILIKE ${} OR ps.product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("ps.tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.production_schedules ps{}",
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
            tracing::error!("Failed to count production schedules: {}", e);
            return ApiResponse::server_error("获取生产排产列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            ps.id, ps.schedule_no, ps.order_id, ps.order_no,
            ps.product_id, ps.product_name, ps.product_code,
            ps.quantity, ps.work_station_id, ps.equipment_id,
            ps.process_id, ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.priority, ps.sequence, ps.notes,
            ps.created_at, ps.updated_at,
            COALESCE(ws.station_name, NULL) as work_station_name,
            COALESCE(e.equipment_name, NULL) as equipment_name,
            COALESCE(pp.process_name, NULL) as process_name
        FROM mes.production_schedules ps
        LEFT JOIN mes.work_stations ws ON ps.work_station_id = ws.id
        LEFT JOIN mes.equipment e ON ps.equipment_id = e.id
        LEFT JOIN mes.production_processes pp ON ps.process_id = pp.id
        {} 
        ORDER BY ps.planned_start_time DESC, ps.priority DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // 占位符编号：where_clause 内 status/search 用 1..n、tenant 用 n+1；
        // LIMIT/OFFSET 顺延 n+2/n+3（旧代码 n+1 与 tenant 同号冲突 → bind 不匹配 500）
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let schedules = match fetch_query.fetch_all(&mut scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch production schedules: {}", e);
            return ApiResponse::server_error("获取生产排产列表失败");
        }
    };

    let schedules_list: Vec<ProductionScheduleResponse> = schedules
        .into_iter()
        .map(|r| ProductionScheduleResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            schedule_no: r.try_get::<String, _>("schedule_no").unwrap_or_default(),
            order_id: r.try_get::<Option<Uuid>, _>("order_id").ok().flatten(),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten(),
            work_station_name: r
                .try_get::<Option<String>, _>("work_station_name")
                .ok()
                .flatten(),
            equipment_id: r.try_get::<Option<Uuid>, _>("equipment_id").ok().flatten(),
            equipment_name: r
                .try_get::<Option<String>, _>("equipment_name")
                .ok()
                .flatten(),
            process_id: r.try_get::<Option<Uuid>, _>("process_id").ok().flatten(),
            process_name: r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten(),
            planned_start_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("planned_start_time")
                    .ok()
                    .flatten(),
            ),
            planned_end_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("planned_end_time")
                    .ok()
                    .flatten(),
            ),
            actual_start_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_start_time")
                    .ok()
                    .flatten(),
            ),
            actual_end_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_end_time")
                    .ok()
                    .flatten(),
            ),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            priority: r
                .try_get::<Option<i32>, _>("priority")
                .ok()
                .flatten()
                .unwrap_or(0),
            sequence: r
                .try_get::<Option<i32>, _>("sequence")
                .ok()
                .flatten()
                .unwrap_or(0),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    ApiResponse::success(
        ListProductionSchedulesResponse {
            schedules: schedules_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取生产排产列表成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/schedules",
    tag = "ProductionScheduling",
    request_body = CreateProductionScheduleRequest,
    responses(
        (status = 200, description = "排产创建成功", body = ApiResponse<ProductionScheduleResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_production_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateProductionScheduleRequest>,
) -> ApiResponse<ProductionScheduleResponse> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
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

    // 写作用域：建成单与回查订单号同属一个租户事务，避免裸 pool 读写受 RLS 拒止。
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
            return ApiResponse::server_error("创建生产排产失败");
        }
    };

    let schedule_no = format!(
        "PS{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    // 订单号仍走既有宏查询（离线缓存已存在，避免牵动 .sqlx 重刷）
    let order_no_flat = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_number AS order_no FROM mes.production_orders WHERE id = $1 AND tenant_id = $2::uuid"#,
            order_id,
            tenant_id
        )
        .fetch_optional(&mut scope)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };
    let order_no_arg = order_no_flat;

    // 产品信息兜底：非宏查询，无需更新 sqlx 离线缓存
    let order_product = if let Some(order_id) = req.order_id {
        sqlx::query_as::<_, (String, Option<String>)>(
            r#"SELECT product_name, product_code FROM mes.production_orders WHERE id = $1 AND tenant_id = $2::uuid"#,
        )
        .bind(order_id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
        .ok()
        .flatten()
    } else {
        None
    };
    let product_name = if req.product_name.trim().is_empty() {
        order_product
            .as_ref()
            .map(|o| o.0.clone())
            .unwrap_or_default()
    } else {
        req.product_name.clone()
    };
    let product_code = if req.product_code.trim().is_empty() {
        order_product
            .as_ref()
            .and_then(|o| o.1.clone())
            .unwrap_or_default()
    } else {
        req.product_code.clone()
    };
    if product_name.trim().is_empty() {
        return ApiResponse::bad_request("产品名称不能为空：请选择生产订单，或填写产品名称");
    }
    let result = sqlx::query!(
        r#"
        INSERT INTO mes.production_schedules (
            schedule_no, order_id, order_no, product_id, product_name, product_code,
            quantity, work_station_id, equipment_id, process_id,
            planned_start_time, planned_end_time, status, priority, sequence, notes,
            created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, $15, $16, $16, $17)
        RETURNING
            id, schedule_no, order_id, order_no,
            product_id, product_name, product_code,
            quantity, work_station_id, equipment_id,
            process_id, planned_start_time, planned_end_time,
            actual_start_time, actual_end_time,
            status, priority, sequence, notes,
            created_at, updated_at
        "#,
        schedule_no,
        req.order_id,
        order_no_arg.unwrap_or_default(),        req.product_id,
        product_name,
        product_code,
        BigDecimal::from_str(&req.quantity.to_string()).unwrap_or_default(),
        req.work_station_id,
        req.equipment_id,
        req.process_id,
req.planned_start_time,
req.planned_end_time,
        req.priority.unwrap_or(0),
        req.sequence.unwrap_or(0),
        req.notes,
Utc::now(),
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create production schedule: {}", e);
            return ApiResponse::server_error("创建生产排产失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交生产排产事务失败: {}", e);
        return ApiResponse::server_error("创建生产排产失败");
    }

    let schedule = ProductionScheduleResponse {
        id: result.id,
        schedule_no: result.schedule_no,
        order_id: result.order_id,
        order_no: Some(result.order_no.unwrap_or_default()),
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: big_decimal_to_f64(Some(result.quantity)),
        work_station_id: result.work_station_id,
        work_station_name: None,
        equipment_id: result.equipment_id,
        equipment_name: None,
        process_id: result.process_id,
        process_name: None,
        planned_start_time: result.planned_start_time,
        planned_end_time: result.planned_end_time,
        actual_start_time: result.actual_start_time,
        actual_end_time: result.actual_end_time,
        status: result.status.unwrap_or_else(|| "pending".to_string()),
        priority: result.priority.unwrap_or(0),
        sequence: result.sequence.unwrap_or(0),
        notes: result.notes,
        created_at: result.created_at.unwrap_or_else(Utc::now),
        updated_at: result.updated_at.unwrap_or_else(Utc::now),
    };

    ApiResponse::success(schedule, "生产排产创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/schedules/{id}",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    responses(
        (status = 200, description = "排产详情", body = ApiResponse<ProductionScheduleResponse>),
        (status = 404, description = "排产不存在"),
    ),
)]
pub async fn get_production_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionScheduleResponse> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

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
            return ApiResponse::server_error("获取生产排产失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            ps.id, ps.schedule_no, ps.order_id, ps.order_no,
            ps.product_id, ps.product_name, ps.product_code,
            ps.quantity, ps.work_station_id, ps.equipment_id,
            ps.process_id, ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.priority, ps.sequence, ps.notes,
            ps.created_at, ps.updated_at,
            COALESCE(ws.station_name, NULL) as work_station_name,
            COALESCE(e.equipment_name, NULL) as equipment_name,
            COALESCE(pp.process_name, NULL) as process_name
        FROM mes.production_schedules ps
        LEFT JOIN mes.work_stations ws ON ps.work_station_id = ws.id
            AND ws.tenant_id = $2::uuid
        LEFT JOIN mes.equipment e ON ps.equipment_id = e.id
            AND e.tenant_id = $2::uuid
        LEFT JOIN mes.production_processes pp ON ps.process_id = pp.id
            AND pp.tenant_id = $2::uuid
        WHERE ps.id = $1
          AND ps.tenant_id = $2::uuid
        "#,
        id,
        tenant_id,
    )
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch production schedule: {}", e);
            return ApiResponse::server_error("获取生产排产失败");
        }
    };

    match result {
        Some(r) => {
            if ProductionScheduleStatus::from_db_str(r.status.as_deref().unwrap_or("")).is_none() {
                return ApiResponse::not_found("生产排产不存在");
            }
            let schedule = ProductionScheduleResponse {
                id: r.id,
                schedule_no: r.schedule_no,
                order_id: r.order_id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                work_station_id: r.work_station_id,
                work_station_name: r.work_station_name,
                equipment_id: r.equipment_id,
                equipment_name: r.equipment_name,
                process_id: r.process_id,
                process_name: r.process_name,
                planned_start_time: r.planned_start_time,
                planned_end_time: r.planned_end_time,
                actual_start_time: r.actual_start_time,
                actual_end_time: r.actual_end_time,
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                priority: r.priority.unwrap_or(0),
                sequence: r.sequence.unwrap_or(0),
                notes: r.notes,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            };
            ApiResponse::success(schedule, "获取生产排产成功")
        }
        None => ApiResponse::not_found("生产排产不存在"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/schedules/{id}",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    request_body = UpdateProductionScheduleRequest,
    responses(
        (status = 200, description = "排产更新成功", body = ApiResponse<ProductionScheduleResponse>),
        (status = 404, description = "排产不存在"),
    ),
)]
pub async fn update_production_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionScheduleRequest>,
) -> ApiResponse<ProductionScheduleResponse> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
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
            return ApiResponse::server_error("更新生产排产失败");
        }
    };

    let requested_status = match req.status.as_deref() {
        Some(raw) => match ProductionScheduleStatus::from_db_str(raw) {
            Some(v) => Some(v),
            None => return ApiResponse::bad_request("无效的排产状态"),
        },
        None => None,
    };

    // 无论是否改状态都先读当前态，并对状态与软删做并发谓词
    let current: Option<(Option<String>,)> = match sqlx::query_as(
        "SELECT status FROM mes.production_schedules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("查询排产单当前状态失败: {}", e);
            return ApiResponse::server_error("更新生产排产失败");
        }
    };
    let Some((current_raw,)) = current else {
        return ApiResponse::not_found("排产单不存在");
    };
    let Some(current_raw) = current_raw else {
        return ApiResponse::conflict("排产单状态为空，需人工处理");
    };
    let Some(current_status) = ProductionScheduleStatus::from_db_str(&current_raw) else {
        return ApiResponse::conflict("排产单当前状态非法，需人工处理");
    };
    if !ProductionScheduleStatus::adjustable_from().contains(&current_status.as_db_str()) {
        return ApiResponse::conflict(&format!(
            "当前状态 {} 不允许编辑",
            current_status.as_db_str()
        ));
    }
    let target_status = requested_status.unwrap_or(current_status);
    if !current_status.can_transition_to(target_status) {
        return ApiResponse::conflict(&format!(
            "当前状态 {} 不允许切换到 {}",
            current_status.as_db_str(),
            target_status.as_db_str()
        ));
    }
    let status_value = Some(target_status.as_db_str().to_string());

    let result = sqlx::query_as::<_, ProductionScheduleRow>(
        r#"
        UPDATE mes.production_schedules SET
            work_station_id = COALESCE($2, work_station_id),
            equipment_id = COALESCE($3, equipment_id),
            process_id = COALESCE($4, process_id),
            planned_start_time = COALESCE($5, planned_start_time),
            planned_end_time = COALESCE($6, planned_end_time),
            priority = COALESCE($7, priority),
            sequence = COALESCE($8, sequence),
            status = COALESCE($9, status),
            notes = COALESCE($10, notes),
            updated_at = $11
        WHERE id = $1 AND tenant_id = $12::uuid AND status = $13 AND deleted_at IS NULL
        RETURNING 
            id, schedule_no, order_id, order_no,
            product_id, product_name, product_code,
            quantity, work_station_id, equipment_id,
            process_id, planned_start_time, planned_end_time,
            actual_start_time, actual_end_time,
            status, priority, sequence, notes,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.work_station_id)
    .bind(req.equipment_id)
    .bind(req.process_id)
    .bind(req.planned_start_time)
    .bind(req.planned_end_time)
    .bind(req.priority)
    .bind(req.sequence)
    .bind(status_value)
    .bind(req.notes)
    .bind(Utc::now())
    .bind(tenant_id)
    .bind(current_raw)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update production schedule: {}", e);
            return ApiResponse::server_error("更新生产排产失败");
        }
    };

    match result {
        Some(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交生产排产事务失败: {}", e);
                return ApiResponse::server_error("更新生产排产失败");
            }
            let schedule = ProductionScheduleResponse {
                id: r.id,
                schedule_no: r.schedule_no,
                order_id: r.order_id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                work_station_id: r.work_station_id,
                work_station_name: None,
                equipment_id: r.equipment_id,
                equipment_name: None,
                process_id: r.process_id,
                process_name: None,
                planned_start_time: r.planned_start_time,
                planned_end_time: r.planned_end_time,
                actual_start_time: r.actual_start_time,
                actual_end_time: r.actual_end_time,
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                priority: r.priority.unwrap_or(0),
                sequence: r.sequence.unwrap_or(0),
                notes: r.notes,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            };
            ApiResponse::success(schedule, "生产排产更新成功")
        }
        None => ApiResponse::conflict("排产单状态已被并发修改，更新失败"),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/schedules/{id}",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    responses(
        (status = 200, description = "排产删除成功"),
        (status = 404, description = "排产不存在"),
    ),
)]
pub async fn delete_production_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
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
            return ApiResponse::server_error("删除生产排产失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.production_schedules SET deleted_at = NOW()
        WHERE id = $1 AND status = ANY($3) AND tenant_id = $2::uuid
          AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(ProductionScheduleStatus::delete_from())
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete production schedule: {}", e);
            return ApiResponse::server_error("删除生产排产失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交删除生产排产事务失败: {}", e);
        return ApiResponse::server_error("删除生产排产失败");
    }

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "生产排产删除成功")
    } else {
        ApiResponse::conflict("生产排产不存在、已删除或状态不允许删除")
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/schedules/{id}/adjust",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    request_body = AdjustScheduleRequest,
    responses(
        (status = 200, description = "排产调整成功"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn adjust_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(_id): Path<String>,
    Json(req): Json<AdjustScheduleRequest>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingAdjust,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();
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
            return ApiResponse::server_error("调整生产排产失败");
        }
    };

    if req.schedule_ids.is_empty() {
        let _ = scope.rollback().await;
        return ApiResponse::bad_request("未选择需要调整的排产记录");
    }

    let mut invalid_ids: Vec<String> = Vec::new();
    let mut updated_count = 0u64;
    for schedule_id in &req.schedule_ids {
        let result = sqlx::query(
            r#"
            UPDATE mes.production_schedules SET
                work_station_id = COALESCE($2, work_station_id),
                planned_start_time = COALESCE($3, planned_start_time),
                updated_at = $4
            WHERE id = $1 AND status = ANY($6) AND tenant_id = $5::uuid
              AND deleted_at IS NULL
            "#,
        )
        .bind(schedule_id)
        .bind(req.new_work_station_id)
        .bind(req.new_start_time)
        .bind(now)
        .bind(tenant_id)
        .bind(ProductionScheduleStatus::adjustable_from())
        .execute(&mut scope)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => updated_count += r.rows_affected(),
            Ok(_) => invalid_ids.push(schedule_id.to_string()),
            Err(e) => {
                tracing::error!("Failed to adjust schedule {}: {}", schedule_id, e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("调整生产排产失败");
            }
        }
    }

    if !invalid_ids.is_empty() {
        let _ = scope.rollback().await;
        return ApiResponse::conflict(&format!(
            "{} 条排产不存在、已删除或状态不允许调整，整批未提交：{}",
            invalid_ids.len(),
            invalid_ids.join(", ")
        ));
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("提交调整生产排产事务失败: {}", e);
        return ApiResponse::server_error("调整生产排产失败");
    }

    ApiResponse::success(
        format!("已调整 {} 条排产", updated_count),
        "生产排产调整成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/schedules/gantt",
    tag = "ProductionScheduling",
    responses(
        (status = 200, description = "甘特图数据", body = ApiResponse<GanttDataResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_gantt_data(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<GanttDataResponse> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

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
            return ApiResponse::server_error("获取甘特图数据失败");
        }
    };

    let schedules = sqlx::query!(
        r#"
        SELECT
            ps.id, ps.schedule_no, ps.order_no, ps.product_name,
            ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.quantity, ps.completed_quantity,
            COALESCE(ws.station_name, NULL) as work_station_name
        FROM mes.production_schedules ps
        LEFT JOIN mes.work_stations ws ON ps.work_station_id = ws.id
            AND ws.tenant_id = $1::uuid
        WHERE ps.planned_start_time IS NOT NULL
          AND ps.planned_end_time IS NOT NULL
          AND ps.tenant_id = $1::uuid
        ORDER BY ps.planned_start_time ASC
        "#,
        tenant_id,
    )
    .fetch_all(&mut scope)
    .await;

    let schedules = match schedules {
        Ok(s) => s
            .into_iter()
            .filter(|row| {
                ProductionScheduleStatus::from_db_str(row.status.as_deref().unwrap_or("")).is_some()
            })
            .collect::<Vec<_>>(),
        Err(e) => {
            tracing::error!("Failed to fetch gantt data: {}", e);
            return ApiResponse::server_error("获取甘特图数据失败");
        }
    };

    let mut tasks = Vec::new();
    let mut resources = Vec::new();
    let mut resource_ids = std::collections::HashSet::new();

    for s in &schedules {
        let start = s.planned_start_time.unwrap_or_else(Utc::now);
        let end = s
            .planned_end_time
            .unwrap_or_else(|| Utc::now() + chrono::Duration::hours(1));

        let total = big_decimal_to_f64(Some(s.quantity.clone()));
        let completed = big_decimal_to_f64(s.completed_quantity.clone());
        let progress = if total > 0.0 {
            (completed / total) * 100.0
        } else {
            0.0
        };

        let resource_name = s.work_station_name.clone().unwrap_or_default();
        if resource_ids.insert(resource_name.clone()) {
            resources.push(GanttResource {
                id: resource_name.clone(),
                name: resource_name.clone(),
                category: "workstation".to_string(),
            });
        }

        tasks.push(GanttTask {
            id: s.id.to_string(),
            name: format!("{} - {}", s.schedule_no.clone(), s.product_name.clone()),
            order_no: s.order_no.clone(),
            start,
            end,
            progress,
            status: s.status.clone().unwrap_or_else(|| "pending".to_string()),
            resource: Some(resource_name),
            parent: None,
        });
    }

    let date_range = {
        let mut min_start: Option<DateTime<Utc>> = None;
        let mut max_end: Option<DateTime<Utc>> = None;
        for t in &tasks {
            min_start = Some(min_start.map_or(t.start, |m| m.min(t.start)));
            max_end = Some(max_end.map_or(t.end, |m| m.max(t.end)));
        }
        GanttDateRange {
            start: min_start.map(|d| d.to_rfc3339()).unwrap_or_default(),
            end: max_end.map(|d| d.to_rfc3339()).unwrap_or_default(),
        }
    };
    ApiResponse::success(
        GanttDataResponse {
            tasks,
            resources,
            date_range,
        },
        "获取甘特图数据成功",
    )
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::{Datelike, TimeZone, Timelike};

    fn claims_with_tenant(tenant_id: Option<&str>) -> Claims {
        serde_json::from_value(serde_json::json!({
            "sub": "00000000-0000-0000-0000-000000000001",
            "username": "tester",
            "role": "user",
            "roles": [],
            "permissions": [],
            "is_superuser": false,
            "exp": 0,
            "iat": 0,
            "email": null,
            "department": null,
            "tenant_id": tenant_id,
            "department_id": null,
            "position_id": null,
            "position_code": null,
            "must_change_password": false
        }))
        .expect("构造测试 Claims 失败")
    }

    #[test]
    fn schedule_tenant_accepts_valid_uuid() {
        let claims = claims_with_tenant(Some("550e8400-e29b-41d4-a716-446655440000"));
        assert_eq!(
            get_schedule_tenant_id(&claims),
            Some(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap())
        );
    }

    #[test]
    fn schedule_tenant_rejects_missing() {
        assert_eq!(get_schedule_tenant_id(&claims_with_tenant(None)), None);
    }

    #[test]
    fn schedule_tenant_rejects_nil_uuid() {
        let claims = claims_with_tenant(Some("00000000-0000-0000-0000-000000000000"));
        assert_eq!(get_schedule_tenant_id(&claims), None);
    }

    #[test]
    fn schedule_tenant_rejects_malformed() {
        let claims = claims_with_tenant(Some("not-a-uuid"));
        assert_eq!(get_schedule_tenant_id(&claims), None);
    }

    // ---- naive_to_utc ----
    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 9, 10, 14, 20, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.year(), 2024);
        assert_eq!(utc.month(), 9);
        assert_eq!(utc.day(), 10);
        assert_eq!(utc.hour(), 14);
        assert_eq!(utc.minute(), 20);
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    // ---- opt_naive_to_utc ----
    #[test]
    fn opt_naive_to_utc_some() {
        let dt = Utc.with_ymd_and_hms(2024, 2, 28, 23, 59, 59).unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.month(), 2);
        assert_eq!(r.day(), 28);
        assert_eq!(r.hour(), 23);
        assert_eq!(r.second(), 59);
    }

    #[test]
    fn opt_naive_to_utc_none() {
        assert!(opt_naive_to_utc(None).is_none());
    }

    // ---- big_decimal_to_f64 ----
    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "99.99".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 99.99);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_large() {
        let bd: BigDecimal = "1234567.89".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1234567.89);
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ScheduleActionRequest {
    pub operator: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ScheduleActionResponse {
    pub success: bool,
    pub message: String,
    pub id: Option<Uuid>,
}

async fn transition_schedule(
    state: &AppState,
    claims: &Claims,
    txn_arc: &RlsTxnCell,
    id: Uuid,
    to_status: &str,
    comment: Option<String>,
) -> ApiResponse<ScheduleActionResponse> {
    if let Err(e) = check_permission(
        &state.pool,
        claims,
        &ModulePermission::ProductionSchedulingWrite,
    )
    .await
    {
        return e;
    }

    let Some(tenant_id) = get_schedule_tenant_id(claims) else {
        tracing::warn!(
            "缺少租户上下文：拒绝排程状态流转（is_superuser={}）",
            claims.is_superuser
        );
        return ApiResponse::bad_request("缺少租户上下文");
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
            return ApiResponse::server_error("查询排产单状态失败");
        }
    };

    let existing: Option<(Option<String>,)> = match sqlx::query_as(
        "SELECT status FROM mes.production_schedules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => Some(row),
        Ok(None) => None,
        Err(e) => {
            tracing::error!("查询排产单状态失败: {}", e);
            return ApiResponse::server_error("查询排产单状态失败");
        }
    };

    let Some((current_status,)) = existing else {
        return ApiResponse::not_found("排产单不存在");
    };
    let Some(current_status) = current_status else {
        return ApiResponse::conflict("排产单状态为空，需人工处理");
    };

    let current = match ProductionScheduleStatus::from_db_str(&current_status) {
        Some(v) => v,
        None => return ApiResponse::conflict("排产单当前状态非法，需人工处理"),
    };
    let target = match ProductionScheduleStatus::from_db_str(to_status) {
        Some(v) => v,
        None => return ApiResponse::bad_request("无效的排产状态"),
    };
    if !current.can_transition_to(target) {
        return ApiResponse::conflict(&format!(
            "当前状态 {} 不允许切换到 {}",
            current.as_db_str(),
            target.as_db_str()
        ));
    }

    let now = Utc::now();
    let updated = sqlx::query(
        "UPDATE mes.production_schedules SET status = $1, notes = COALESCE($2, notes), updated_at = $3 WHERE id = $4 AND status = $6 AND tenant_id = $5 AND deleted_at IS NULL",
    )
    .bind(target.as_db_str())
    .bind(&comment)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .bind(current.as_db_str())
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交排产单状态事务失败: {}", e);
                return ApiResponse::server_error("更新排产单状态失败");
            }
            ApiResponse::success(
                ScheduleActionResponse {
                    success: true,
                    message: format!("排产单已{}", to_status),
                    id: Some(id),
                },
                "操作成功",
            )
        }
        Ok(_) => ApiResponse::conflict("排产单状态已变化或已删除，请刷新后重试"),
        Err(e) => {
            tracing::error!("更新排产单状态失败: {}", e);
            ApiResponse::server_error("更新排产单状态失败")
        }
    }
}

fn get_schedule_tenant_id(claims: &Claims) -> Option<Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .filter(|t| !t.is_nil())
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:scheduling:write"])),
    path = "/schedules/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionScheduling"
)]
pub async fn submit_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> ApiResponse<ScheduleActionResponse> {
    transition_schedule(&state, &claims, &txn_arc, id, "released", req.comment).await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:scheduling:write"])),
    path = "/schedules/{id}/release",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionScheduling"
)]
pub async fn release_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> ApiResponse<ScheduleActionResponse> {
    transition_schedule(&state, &claims, &txn_arc, id, "released", req.comment).await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:scheduling:write"])),
    path = "/schedules/{id}/hold",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionScheduling"
)]
pub async fn hold_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> ApiResponse<ScheduleActionResponse> {
    transition_schedule(&state, &claims, &txn_arc, id, "pending", req.comment).await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:scheduling:write"])),
    path = "/schedules/{id}/start",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionScheduling"
)]
pub async fn start_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> ApiResponse<ScheduleActionResponse> {
    transition_schedule(&state, &claims, &txn_arc, id, "running", req.comment).await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:scheduling:write"])),
    path = "/schedules/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionScheduling"
)]
pub async fn complete_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> ApiResponse<ScheduleActionResponse> {
    transition_schedule(&state, &claims, &txn_arc, id, "completed", req.comment).await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:scheduling:write"])),
    path = "/schedules/{id}/cancel",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ProductionScheduling"
)]
pub async fn cancel_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> ApiResponse<ScheduleActionResponse> {
    transition_schedule(&state, &claims, &txn_arc, id, "cancelled", req.comment).await
}
