//! Production Record handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post},
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

use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_db::decimal::big_decimal_to_f64;

use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/records", get(list_records).post(create_record))
        .route(
            "/records/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/records/{id}/complete", post(complete_record))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListRecordsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRecordRequest {
    pub order_id: Uuid,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub start_time: DateTime<Utc>,
    pub quantity_produced: Option<f64>,
    pub quantity_defective: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRecordRequest {
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub end_time: Option<DateTime<Utc>>,
    pub quantity_produced: Option<f64>,
    pub quantity_defective: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductionRecordResponse {
    pub id: Uuid,
    pub order_id: Uuid,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub operator: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    #[serde(alias = "quantity_produced", rename = "quantity_completed")]
    pub quantity_produced: f64,
    #[serde(alias = "quantity_defective", rename = "quantity_rejected")]
    pub quantity_defective: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListRecordsResponse {
    pub records: Vec<ProductionRecordResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct ProductionRecordRow {
    id: Uuid,
    order_id: Uuid,
    process_id: Option<Uuid>,
    work_station_id: Option<Uuid>,
    equipment_id: Option<Uuid>,
    operator_id: Option<Uuid>,
    operator: String,
    start_time: DateTime<Utc>,
    end_time: Option<DateTime<Utc>>,
    quantity_produced: BigDecimal,
    quantity_defective: Option<i32>,
    status: String,
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

fn f64_to_big_decimal(f: Option<f64>) -> Option<BigDecimal> {
    f.and_then(|v| BigDecimal::from_str(&v.to_string()).ok())
}

// ==================== Production Record Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:record:read"])),
    path = "/records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Record"
)]
#[allow(clippy::as_conversions)]
pub async fn list_records(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListRecordsQuery>,
) -> ApiResponse<ListRecordsResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordRead).await {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    // 租户作用域读：production_records 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
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
            return ApiResponse::server_error("获取生产记录列表失败");
        }
    };

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (notes ILIKE $1 OR operator_id::text ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (notes ILIKE ${} OR operator_id::text ILIKE ${})",
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

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.production_records{}",
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
            tracing::error!("Failed to count records: {}", e);
            return ApiResponse::server_error("获取生产记录列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, operator, start_time, end_time,
            completed_quantity AS quantity_produced, rejected_quantity::numeric AS quantity_defective, status, notes,
            created_at, updated_at
        FROM mes.production_records
        {}
        ORDER BY start_time DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // tenant 隔离占 1 位（where_clause 内 $N），LIMIT/OFFSET 必须顺延到 N+1/N+2，
        // 否则无筛选时 LIMIT $1 复用 tenant_uuid → uuid 类型错误 → 500
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let records = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch records: {}", e);
            return ApiResponse::server_error("获取生产记录列表失败");
        }
    };

    let records_list: Vec<ProductionRecordResponse> = records
        .into_iter()
        .map(|r| ProductionRecordResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            order_id: r.try_get::<Uuid, _>("order_id").unwrap_or_default(),
            process_id: r.try_get::<Option<Uuid>, _>("process_id").ok().flatten(),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten(),
            equipment_id: r.try_get::<Option<Uuid>, _>("equipment_id").ok().flatten(),
            operator_id: r.try_get::<Option<Uuid>, _>("operator_id").ok().flatten(),
            operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
            start_time: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("start_time")
                    .ok()
                    .flatten(),
            ),
            end_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("end_time")
                    .ok()
                    .flatten(),
            ),
            quantity_produced: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity_produced")
                    .ok()
                    .flatten(),
            ),
            quantity_defective: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity_defective")
                    .ok()
                    .flatten(),
            ),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "in_progress".to_string()),
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
        ListRecordsResponse {
            records: records_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取生产记录列表成功",
    )
}

#[allow(clippy::as_conversions)]
pub async fn create_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRecordRequest>,
) -> ApiResponse<ProductionRecordResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
        return e;
    }

    let now = Utc::now();
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    // P1 修复（第四十六轮遗留）：operator 列 NOT NULL，此前硬编码 NULL 导致创建必 500。
    // 优先用 operator_id 的字符串形式，未提供时回退当前登录用户（Claims.username）。
    let operator_name = req
        .operator_id
        .map(|id| id.to_string())
        .unwrap_or_else(|| claims.username.clone());

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
            return ApiResponse::server_error("创建生产记录失败");
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO mes.production_records (
            order_id, process_id, work_station_id,
            operator_id, operator, start_time, end_time,
            completed_quantity, status, notes,
            created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, 'in_progress', $8, $9, $9, $10)
        RETURNING
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, operator, start_time, end_time,
            completed_quantity AS quantity_produced, rejected_quantity AS quantity_defective, status, notes,
            created_at, updated_at
        "#,
        req.order_id,
        req.process_id,
        req.work_station_id,
        req.operator_id,
        operator_name,
        req.start_time,
        f64_to_big_decimal(req.quantity_produced),
        req.notes,
        now,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create record: {}", e);
            return ApiResponse::server_error("创建生产记录失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交生产记录事务失败: {}", e);
        return ApiResponse::server_error("创建生产记录失败");
    }

    let record = ProductionRecordResponse {
        id: result.id,
        order_id: result.order_id,
        process_id: result.process_id,
        work_station_id: result.work_station_id,
        equipment_id: result.equipment_id,
        operator_id: result.operator_id,
        operator: Some(result.operator),
        start_time: result.start_time,
        end_time: result.end_time,
        quantity_produced: big_decimal_to_f64(Some(BigDecimal::from(result.quantity_produced))),
        quantity_defective: result
            .quantity_defective
            .map(|v| v as f64)
            .unwrap_or_default(),
        status: result.status,
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };

    ApiResponse::success(record, "生产记录创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:record:read"])),
    path = "/records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Record"
)]
#[allow(clippy::as_conversions)]
pub async fn get_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionRecordResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordRead).await {
        return e;
    }

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
            return ApiResponse::server_error("获取生产记录失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, operator, start_time, end_time,
            completed_quantity AS quantity_produced, rejected_quantity AS quantity_defective, status, notes,
            created_at, updated_at
        FROM mes.production_records
        WHERE id = $1
          AND tenant_id = $2::uuid
        "#,
        id,
        get_tenant_id(&claims),
    )
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch record: {}", e);
            return ApiResponse::server_error("获取生产记录失败");
        }
    };

    match result {
        Some(r) => {
            let record = ProductionRecordResponse {
                id: r.id,
                order_id: r.order_id,
                process_id: r.process_id,
                work_station_id: r.work_station_id,
                equipment_id: r.equipment_id,
                operator_id: r.operator_id,
                operator: Some(r.operator),
                start_time: r.start_time,
                end_time: r.end_time,
                quantity_produced: big_decimal_to_f64(Some(BigDecimal::from(r.quantity_produced))),
                quantity_defective: r.quantity_defective.map(|v| v as f64).unwrap_or_default(),
                status: r.status,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(record, "获取生产记录成功")
        }
        None => ApiResponse::not_found("生产记录不存在"),
    }
}

#[allow(clippy::as_conversions)]
pub async fn update_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRecordRequest>,
) -> ApiResponse<ProductionRecordResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
        return e;
    }

    let now = Utc::now();
    let status = if req.end_time.is_some() {
        "completed"
    } else {
        "in_progress"
    };

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
            return ApiResponse::server_error("更新生产记录失败");
        }
    };

    let result = sqlx::query_as::<_, ProductionRecordRow>(
        r#"
        UPDATE mes.production_records SET
            process_id = COALESCE($2, process_id),
            work_station_id = COALESCE($3, work_station_id),
            operator_id = COALESCE($4, operator_id),
            end_time = COALESCE($5, end_time),
            completed_quantity = COALESCE($6, completed_quantity),
            status = $7,
            notes = COALESCE($8, notes),
            updated_at = $9
        WHERE id = $1 AND tenant_id = $10::uuid
        RETURNING 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, operator, start_time, end_time,
            completed_quantity AS quantity_produced, rejected_quantity AS quantity_defective, status, notes,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.process_id)
    .bind(req.work_station_id)
    .bind(req.operator_id)
    .bind(req.end_time)
    .bind(f64_to_big_decimal(req.quantity_produced))
    .bind(status)
    .bind(req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update record: {}", e);
            return ApiResponse::server_error("更新生产记录失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交生产记录事务失败: {}", e);
        return ApiResponse::server_error("更新生产记录失败");
    }

    match result {
        Some(r) => {
            let record = ProductionRecordResponse {
                id: r.id,
                order_id: r.order_id,
                process_id: r.process_id,
                work_station_id: r.work_station_id,
                equipment_id: r.equipment_id,
                operator_id: r.operator_id,
                operator: Some(r.operator),
                start_time: r.start_time,
                end_time: r.end_time,
                quantity_produced: big_decimal_to_f64(Some(BigDecimal::from(r.quantity_produced))),
                quantity_defective: r.quantity_defective.map(|v| v as f64).unwrap_or_default(),
                status: r.status,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(record, "生产记录更新成功")
        }
        None => ApiResponse::not_found("生产记录不存在"),
    }
}

pub async fn delete_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
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
            return ApiResponse::server_error("删除生产记录失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.production_records SET deleted_at = NOW()
        WHERE id = $1 AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete record: {}", e);
            return ApiResponse::server_error("删除生产记录失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交生产记录事务失败: {}", e);
        return ApiResponse::server_error("删除生产记录失败");
    }

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "生产记录删除成功")
    } else {
        ApiResponse::not_found("生产记录不存在")
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:record:write"])),
    path = "/records/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Record"
)]
#[allow(clippy::as_conversions)]
pub async fn complete_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionRecordResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
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
            return ApiResponse::server_error("完成生产记录失败");
        }
    };

    let result = sqlx::query_as::<_, ProductionRecordRow>(
        r#"
        UPDATE mes.production_records SET
            end_time = $2,
            status = 'completed',
            updated_at = $2
        WHERE id = $1 AND status = 'in_progress' AND tenant_id = $3::uuid
        RETURNING 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, operator, start_time, end_time,
            completed_quantity AS quantity_produced, rejected_quantity AS quantity_defective, status, notes,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to complete record: {}", e);
            return ApiResponse::server_error("完成生产记录失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交生产记录事务失败: {}", e);
        return ApiResponse::server_error("完成生产记录失败");
    }

    match result {
        Some(r) => {
            let record = ProductionRecordResponse {
                id: r.id,
                order_id: r.order_id,
                process_id: r.process_id,
                work_station_id: r.work_station_id,
                equipment_id: r.equipment_id,
                operator_id: r.operator_id,
                operator: Some(r.operator),
                start_time: r.start_time,
                end_time: r.end_time,
                quantity_produced: big_decimal_to_f64(Some(BigDecimal::from(r.quantity_produced))),
                quantity_defective: r.quantity_defective.map(|v| v as f64).unwrap_or_default(),
                status: r.status,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(record, "生产记录完成成功")
        }
        None => ApiResponse::not_found("生产记录不存在或状态不允许完成"),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::{Datelike, TimeZone, Timelike};

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

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

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }

    #[test]
    fn f64_to_big_decimal_roundtrip() {
        let bd = f64_to_big_decimal(Some(3.5)).unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 3.5);
    }

    #[test]
    fn f64_to_big_decimal_none() {
        assert!(f64_to_big_decimal(None).is_none());
    }

    #[test]
    fn f64_to_big_decimal_zero() {
        let bd = f64_to_big_decimal(Some(0.0)).unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 0.0);
    }
}
