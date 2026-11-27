//! Equipment OEE handlers

use axum::{
    extract::Extension, extract::Path, extract::Query, extract::State, routing::get, Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/equipment-oee",
            get(list_oee_records).post(create_oee_record),
        )
        .route(
            "/equipment-oee/{id}",
            get(get_oee_record)
                .put(update_oee_record)
                .delete(delete_oee_record),
        )
        .route("/equipment-oee/statistics", get(get_oee_statistics))
        .route(
            "/equipment-oee/{equipment_id}/efficiency",
            get(get_equipment_efficiency_analysis),
        )
        // 前端契约兜底：模板带可选路径段 — 待上游支持
        .route("/equipment-oee/statistics/{_id}", get(get_oee_statistics))
        // 前端模板 /equipment-oee/{id}/efficiency/{rid} 双段兜底
        .route(
            "/equipment-oee/{equipment_id}/efficiency/{rid}",
            get(stub_efficiency_detail),
        )
}

/// S2：效率分析详情——按设备 ID 查 OEE 记录返回（非空）
#[utoipa::path(
    security(("BearerAuth" = [])),
    get,
    path = "/equipment-oee/{equipment_id}/efficiency/{rid}",
    tag = "mes",
    responses((status = 200, description = "OK"))
)]
async fn stub_efficiency_detail(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((equipment_id, _rid)): Path<(String, String)>,
) -> ApiResponse<Vec<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }

    let equipment_uuid = match Uuid::parse_str(&equipment_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的设备ID"),
    };

    let tenant_id = get_tenant_id(&claims);

    // 租户作用域读：equipment_oee 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
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
            return ApiResponse::server_error("设备效率详情查询失败");
        }
    };

    let rows = sqlx::query(
        r#"SELECT id, equipment_id, record_date, availability, performance, quality_rate, oee
           FROM mes.equipment_oee
           WHERE equipment_id = $1
             AND tenant_id = $2::uuid
           ORDER BY record_date DESC
           LIMIT 10"#,
    )
    .bind(equipment_uuid)
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let records: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<Uuid, _>("id"),
                        "equipment_id": r.get::<Uuid, _>("equipment_id"),
                        "record_date": r.get::<DateTime<Utc>, _>("record_date"),
                        "availability_rate": r.get::<Option<f64>, _>("availability").unwrap_or(0.0),
                        "performance_rate": r.get::<Option<f64>, _>("performance").unwrap_or(0.0),
                        "quality_rate": r.get::<Option<f64>, _>("quality_rate").unwrap_or(0.0),
                        "oee_value": r.get::<Option<f64>, _>("oee").unwrap_or(0.0),
                    })
                })
                .collect();
            ApiResponse::success(records, "设备效率详情查询成功")
        }
        Err(e) => ApiResponse::server_error(&format!("查询失败: {e}")),
    }
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListOeeRecordsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    shift: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OeeRecordResponse {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_name: Option<String>,
    pub equipment_code: Option<String>,
    pub record_date: DateTime<Utc>,
    pub planned_production_time: f64,
    pub run_time: f64,
    pub downtime: f64,
    pub ideal_cycle_time: f64,
    pub total_count: f64,
    pub good_count: f64,
    pub reject_count: f64,
    pub availability: f64,
    pub performance: f64,
    pub quality: f64,
    pub oee: f64,
    pub shift: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OeeEquipmentStat {
    pub equipment_id: Uuid,
    pub equipment_name: String,
    pub equipment_code: String,
    pub availability: f64,
    pub performance: f64,
    pub quality: f64,
    pub oee: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OeeTrendItem {
    pub date: String,
    pub availability: f64,
    pub performance: f64,
    pub quality: f64,
    pub oee: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OeeStatisticsResponse {
    pub total_records: i64,
    pub avg_availability: f64,
    pub avg_performance: f64,
    pub avg_quality: f64,
    pub avg_oee: f64,
    pub trend: Vec<OeeTrendItem>,
    pub by_equipment: Vec<OeeEquipmentStat>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentEfficiencyAnalysis {
    pub equipment_id: Uuid,
    pub equipment_name: String,
    pub equipment_no: String,
    pub oee: f64,
    pub availability: f64,
    pub performance: f64,
    pub quality_rate: f64,
    pub rank: i32,
    pub trend: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListOeeRecordsResponse {
    pub records: Vec<OeeRecordResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateOeeRecordRequest {
    pub equipment_id: Uuid,
    pub record_date: DateTime<Utc>,
    pub planned_production_time: f64,
    pub actual_run_time: f64,
    pub downtime: f64,
    pub ideal_cycle_time: f64,
    pub actual_output: f64,
    pub good_output: f64,
    pub defective_output: f64,
    pub shift: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateOeeRecordRequest {
    pub planned_production_time: Option<f64>,
    pub actual_run_time: Option<f64>,
    pub downtime: Option<f64>,
    pub ideal_cycle_time: Option<f64>,
    pub actual_output: Option<f64>,
    pub good_output: Option<f64>,
    pub defective_output: Option<f64>,
    pub shift: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct OeeStatisticsQuery {
    pub equipment_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

fn calculate_oee(
    planned_time: f64,
    run_time: f64,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
) -> (f64, f64, f64, f64) {
    let availability = if planned_time > 0.0 {
        (run_time / planned_time) * 100.0
    } else {
        0.0
    };
    let performance = if run_time > 0.0 && ideal_cycle_time > 0.0 {
        ((actual_output * ideal_cycle_time) / run_time) * 100.0
    } else {
        0.0
    };
    let performance = performance.min(100.0);
    let quality = if actual_output > 0.0 {
        (good_output / actual_output) * 100.0
    } else {
        0.0
    };
    let oee = (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0;

    (availability, performance, quality, oee)
}

// ==================== Equipment OEE Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment-oee",
    tag = "EquipmentOEE",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("shift" = Option<String>, Query, description = "班次过滤"),
    ),
    responses(
        (status = 200, description = "OEE记录列表", body = ApiResponse<ListOeeRecordsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn list_oee_records(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListOeeRecordsQuery>,
) -> ApiResponse<ListOeeRecordsResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE oee.deleted_at IS NULL");

    if let Some(shift) = query.shift {
        where_clause.push_str(" AND oee.shift = $1");
        params.push(serde_json::Value::String(shift));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (e.equipment_name ILIKE $1 OR e.equipment_code ILIKE $1 OR oee.operator ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (e.equipment_name ILIKE ${} OR e.equipment_code ILIKE ${} OR oee.operator ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("oee.tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    // 租户作用域读：equipment_oee 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
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
            return ApiResponse::server_error("获取OEE记录列表失败");
        }
    };

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.equipment_oee oee LEFT JOIN mes.equipment e ON oee.equipment_id = e.id{}",
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
            tracing::error!("Failed to count OEE records: {}", e);
            return ApiResponse::server_error("获取OEE记录列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            oee.id, oee.equipment_id, oee.record_date,
            oee.planned_production_time, oee.actual_run_time, oee.downtime,
            oee.ideal_cycle_time, oee.actual_output, oee.good_output, oee.defective_output,
            oee.availability, oee.performance, oee.quality_rate, oee.oee,
            oee.shift, oee.operator, oee.notes, oee.created_at, oee.updated_at,
            e.equipment_name as equipment_name, e.equipment_code as equipment_no
        FROM mes.equipment_oee oee
        LEFT JOIN mes.equipment e ON oee.equipment_id = e.id
        {}
        ORDER BY oee.record_date DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // tenant 隔离占 1 位，LIMIT/OFFSET 顺延 N+1/N+2（无筛选时 LIMIT $1 会复用 tenant_uuid → uuid 类型错误 → 500）
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
            tracing::error!("Failed to fetch OEE records: {}", e);
            return ApiResponse::server_error("获取OEE记录列表失败");
        }
    };

    let records_list: Vec<OeeRecordResponse> = records
        .into_iter()
        .map(|r| OeeRecordResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            equipment_id: r.try_get::<Uuid, _>("equipment_id").unwrap_or_default(),
            equipment_name: r
                .try_get::<Option<String>, _>("equipment_name")
                .ok()
                .flatten(),
            equipment_code: r
                .try_get::<Option<String>, _>("equipment_no")
                .ok()
                .flatten(),
            record_date: r
                .try_get::<DateTime<Utc>, _>("record_date")
                .unwrap_or_else(|_| Utc::now()),
            planned_production_time: r
                .try_get::<f64, _>("planned_production_time")
                .unwrap_or(0.0),
            run_time: r.try_get::<f64, _>("actual_run_time").unwrap_or(0.0),
            downtime: r
                .try_get::<Option<f64>, _>("downtime")
                .ok()
                .flatten()
                .unwrap_or(0.0),
            ideal_cycle_time: r.try_get::<f64, _>("ideal_cycle_time").unwrap_or(0.0),
            total_count: r.try_get::<f64, _>("actual_output").unwrap_or(0.0),
            good_count: r.try_get::<f64, _>("good_output").unwrap_or(0.0),
            reject_count: r
                .try_get::<Option<f64>, _>("defective_output")
                .ok()
                .flatten()
                .unwrap_or(0.0),
            availability: r
                .try_get::<Option<f64>, _>("availability")
                .ok()
                .flatten()
                .unwrap_or(0.0)
                * 100.0,
            performance: r
                .try_get::<Option<f64>, _>("performance")
                .ok()
                .flatten()
                .unwrap_or(0.0)
                * 100.0,
            quality: r
                .try_get::<Option<f64>, _>("quality_rate")
                .ok()
                .flatten()
                .unwrap_or(0.0)
                * 100.0,
            oee: r
                .try_get::<Option<f64>, _>("oee")
                .ok()
                .flatten()
                .unwrap_or(0.0)
                * 100.0,
            shift: r.try_get::<Option<String>, _>("shift").ok().flatten(),
            operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: r
                .try_get::<DateTime<Utc>, _>("created_at")
                .unwrap_or_else(|_| Utc::now()),
            updated_at: r
                .try_get::<DateTime<Utc>, _>("updated_at")
                .unwrap_or_else(|_| Utc::now()),
        })
        .collect();

    ApiResponse::success(
        ListOeeRecordsResponse {
            records: records_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取OEE记录列表成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/equipment-oee",
    tag = "EquipmentOEE",
    request_body = CreateOeeRecordRequest,
    responses(
        (status = 200, description = "OEE记录创建成功", body = ApiResponse<OeeRecordResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_oee_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateOeeRecordRequest>,
) -> ApiResponse<OeeRecordResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await
    {
        return e;
    }

    // 写操作必须携带有效租户：缺失/零租户返回 400。
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let now = Utc::now();

    let (availability, performance, quality_rate, oee) = calculate_oee(
        req.planned_production_time,
        req.actual_run_time,
        req.ideal_cycle_time,
        req.actual_output,
        req.good_output,
    );

    // 写作用域：INSERT 与随后回查设备名同属一个租户事务。
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
            return ApiResponse::server_error("创建OEE记录失败");
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO mes.equipment_oee (
            equipment_id, record_date,
            planned_production_time, actual_run_time, downtime,
            ideal_cycle_time, actual_output, good_output, defective_output,
            availability, performance, quality_rate, oee,
            shift, operator, notes, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17, $18)
        RETURNING
            id, equipment_id, record_date,
            planned_production_time, actual_run_time, downtime,
            ideal_cycle_time, actual_output, good_output, defective_output,
            availability, performance, quality_rate, oee,
            shift, operator, notes, created_at, updated_at
        "#,
        req.equipment_id,
        req.record_date,
        req.planned_production_time,
        req.actual_run_time,
        req.downtime,
        req.ideal_cycle_time,
        req.actual_output,
        req.good_output,
        req.defective_output,
        availability,
        performance,
        quality_rate,
        oee,
        req.shift,
        req.operator,
        req.notes,
        now,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create OEE record: {}", e);
            return ApiResponse::server_error("创建OEE记录失败");
        }
    };

    let equipment = sqlx::query!(
        r#"SELECT equipment_name AS name, equipment_code AS equipment_no FROM mes.equipment WHERE id = $1 AND tenant_id = $2::uuid"#,
        req.equipment_id,
        tenant_id,
    )
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    if let Err(e) = scope.commit().await {
        tracing::error!("提交OEE记录事务失败: {}", e);
        return ApiResponse::server_error("创建OEE记录失败");
    }

    let record = OeeRecordResponse {
        id: result.id,
        equipment_id: result.equipment_id,
        equipment_name: equipment.as_ref().map(|e| e.name.clone()),
        equipment_code: equipment.as_ref().map(|e| e.equipment_no.clone()),
        record_date: result.record_date,
        planned_production_time: result.planned_production_time,
        run_time: result.actual_run_time,
        downtime: result.downtime.unwrap_or(0.0),
        ideal_cycle_time: result.ideal_cycle_time,
        total_count: result.actual_output,
        good_count: result.good_output,
        reject_count: result.defective_output.unwrap_or(0.0),
        availability: result.availability.unwrap_or(0.0) * 100.0,
        performance: result.performance.unwrap_or(0.0) * 100.0,
        quality: result.quality_rate.unwrap_or(0.0) * 100.0,
        oee: result.oee.unwrap_or(0.0) * 100.0,
        shift: result.shift,
        operator: result.operator,
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };

    ApiResponse::success(record, "OEE记录创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment-oee/{id}",
    tag = "EquipmentOEE",
    params(
        ("id" = Uuid, Path, description = "OEE记录ID"),
    ),
    responses(
        (status = 200, description = "OEE记录详情", body = ApiResponse<OeeRecordResponse>),
        (status = 404, description = "OEE记录不存在"),
    ),
)]
pub async fn get_oee_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OeeRecordResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
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
            return ApiResponse::server_error("获取OEE记录失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            oee.id, oee.equipment_id, oee.record_date,
            oee.planned_production_time, oee.actual_run_time, oee.downtime,
            oee.ideal_cycle_time, oee.actual_output, oee.good_output, oee.defective_output,
            oee.availability, oee.performance, oee.quality_rate, oee.oee,
            oee.shift, oee.operator, oee.notes, oee.created_at, oee.updated_at,
            e.equipment_name as equipment_name, e.equipment_code as equipment_no
        FROM mes.equipment_oee oee
        LEFT JOIN mes.equipment e ON oee.equipment_id = e.id
            AND e.tenant_id = $2::uuid
        WHERE oee.id = $1
          AND oee.tenant_id = $2::uuid
        "#,
        id,
        get_tenant_id(&claims),
    )
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch OEE record: {}", e);
            return ApiResponse::server_error("获取OEE记录失败");
        }
    };

    match result {
        Some(r) => {
            let record = OeeRecordResponse {
                id: r.id,
                equipment_id: r.equipment_id,
                equipment_name: r.equipment_name,
                equipment_code: r.equipment_no,
                record_date: r.record_date,
                planned_production_time: r.planned_production_time,
                run_time: r.actual_run_time,
                downtime: r.downtime.unwrap_or(0.0),
                ideal_cycle_time: r.ideal_cycle_time,
                total_count: r.actual_output,
                good_count: r.good_output,
                reject_count: r.defective_output.unwrap_or(0.0),
                availability: r.availability.unwrap_or(0.0) * 100.0,
                performance: r.performance.unwrap_or(0.0) * 100.0,
                quality: r.quality_rate.unwrap_or(0.0) * 100.0,
                oee: r.oee.unwrap_or(0.0) * 100.0,
                shift: r.shift,
                operator: r.operator,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(record, "获取OEE记录成功")
        }
        None => ApiResponse::not_found("OEE记录不存在"),
    }
}

#[derive(sqlx::FromRow)]
struct OeeRecordUpdateRow {
    id: Uuid,
    equipment_id: Uuid,
    record_date: DateTime<Utc>,
    planned_production_time: f64,
    actual_run_time: f64,
    downtime: Option<f64>,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
    defective_output: Option<f64>,
    availability: Option<f64>,
    performance: Option<f64>,
    quality_rate: Option<f64>,
    oee: Option<f64>,
    shift: Option<String>,
    operator: Option<String>,
    notes: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/equipment-oee/{id}",
    tag = "EquipmentOEE",
    params(
        ("id" = Uuid, Path, description = "OEE记录ID"),
    ),
    request_body = UpdateOeeRecordRequest,
    responses(
        (status = 200, description = "OEE记录更新成功", body = ApiResponse<OeeRecordResponse>),
        (status = 404, description = "OEE记录不存在"),
    ),
)]
pub async fn update_oee_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateOeeRecordRequest>,
) -> ApiResponse<OeeRecordResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await
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
            return ApiResponse::server_error("更新OEE记录失败");
        }
    };

    let existing = sqlx::query!(
        r#"
        SELECT planned_production_time, actual_run_time, downtime,
               ideal_cycle_time, actual_output, good_output, defective_output
        FROM mes.equipment_oee
        WHERE id = $1
          AND tenant_id = $2::uuid
        "#,
        id,
        tenant_id,
    )
    .fetch_optional(&mut scope)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return ApiResponse::not_found("OEE记录不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch OEE record: {}", e);
            return ApiResponse::server_error("更新OEE记录失败");
        }
    };

    let planned_time = req
        .planned_production_time
        .unwrap_or(existing.planned_production_time);
    let run_time = req.actual_run_time.unwrap_or(existing.actual_run_time);
    let cycle_time = req.ideal_cycle_time.unwrap_or(existing.ideal_cycle_time);
    let output = req.actual_output.unwrap_or(existing.actual_output);
    let good = req.good_output.unwrap_or(existing.good_output);

    let (availability, performance, quality_rate, oee) =
        calculate_oee(planned_time, run_time, cycle_time, output, good);

    let result = sqlx::query_as::<_, OeeRecordUpdateRow>(
        r#"
        UPDATE mes.equipment_oee SET
            planned_production_time = COALESCE($2, planned_production_time),
            actual_run_time = COALESCE($3, actual_run_time),
            downtime = COALESCE($4, downtime),
            ideal_cycle_time = COALESCE($5, ideal_cycle_time),
            actual_output = COALESCE($6, actual_output),
            good_output = COALESCE($7, good_output),
            defective_output = COALESCE($8, defective_output),
            availability = $9,
            performance = $10,
            quality_rate = $11,
            oee = $12,
            shift = COALESCE($13, shift),
            operator = COALESCE($14, operator),
            notes = COALESCE($15, notes),
            updated_at = $16
        WHERE id = $1 AND tenant_id = $17::uuid
        RETURNING 
            id, equipment_id, record_date,
            planned_production_time, actual_run_time, downtime,
            ideal_cycle_time, actual_output, good_output, defective_output,
            availability, performance, quality_rate, oee,
            shift, operator, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.planned_production_time)
    .bind(req.actual_run_time)
    .bind(req.downtime)
    .bind(req.ideal_cycle_time)
    .bind(req.actual_output)
    .bind(req.good_output)
    .bind(req.defective_output)
    .bind(availability)
    .bind(performance)
    .bind(quality_rate)
    .bind(oee)
    .bind(req.shift)
    .bind(req.operator)
    .bind(req.notes)
    .bind(Utc::now())
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update OEE record: {}", e);
            return ApiResponse::server_error("更新OEE记录失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交OEE记录事务失败: {}", e);
        return ApiResponse::server_error("更新OEE记录失败");
    }

    match result {
        Some(r) => {
            let record = OeeRecordResponse {
                id: r.id,
                equipment_id: r.equipment_id,
                equipment_name: None,
                equipment_code: None,
                record_date: r.record_date,
                planned_production_time: r.planned_production_time,
                run_time: r.actual_run_time,
                downtime: r.downtime.unwrap_or(0.0),
                ideal_cycle_time: r.ideal_cycle_time,
                total_count: r.actual_output,
                good_count: r.good_output,
                reject_count: r.defective_output.unwrap_or(0.0),
                availability: r.availability.unwrap_or(0.0) * 100.0,
                performance: r.performance.unwrap_or(0.0) * 100.0,
                quality: r.quality_rate.unwrap_or(0.0) * 100.0,
                oee: r.oee.unwrap_or(0.0) * 100.0,
                shift: r.shift,
                operator: r.operator,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(record, "OEE记录更新成功")
        }
        None => ApiResponse::not_found("OEE记录不存在"),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:delete"])),
    path = "/api/mes/equipment-oee/{id}",
    tag = "EquipmentOEE",
    params(
        ("id" = Uuid, Path, description = "OEE记录ID"),
    ),
    responses(
        (status = 200, description = "OEE记录删除成功"),
        (status = 404, description = "OEE记录不存在"),
    ),
)]
pub async fn delete_oee_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await
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
            return ApiResponse::server_error("删除OEE记录失败");
        }
    };

    let result = sqlx::query(
        r#"UPDATE mes.equipment_oee SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2::uuid"#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete OEE record: {}", e);
            return ApiResponse::server_error("删除OEE记录失败");
        }
    };

    if result.rows_affected() > 0 {
        if let Err(e) = scope.commit().await {
            tracing::error!("提交OEE记录事务失败: {}", e);
            return ApiResponse::server_error("删除OEE记录失败");
        }
        ApiResponse::success("".to_string(), "OEE记录删除成功")
    } else {
        ApiResponse::not_found("OEE记录不存在")
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment-oee/statistics",
    tag = "EquipmentOEE",
    params(
        ("equipment_id" = Option<Uuid>, Query, description = "设备ID"),
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
    ),
    responses(
        (status = 200, description = "OEE统计数据", body = ApiResponse<OeeStatisticsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_oee_statistics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(req): Query<OeeStatisticsQuery>,
) -> ApiResponse<OeeStatisticsResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }

    let start_date = req
        .start_date
        .as_ref()
        .and_then(|s| s.parse::<chrono::NaiveDate>().ok());
    let end_date = req
        .end_date
        .as_ref()
        .and_then(|s| s.parse::<chrono::NaiveDate>().ok());

    // 总体统计
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
            return ApiResponse::server_error("获取OEE统计数据失败");
        }
    };

    let overall_result = sqlx::query!(
        r#"
        SELECT
            COUNT(oee.id) as total_records,
            COALESCE(AVG(oee.availability), 0) as avg_availability,
            COALESCE(AVG(oee.performance), 0) as avg_performance,
            COALESCE(AVG(oee.quality_rate), 0) as avg_quality_rate,
            COALESCE(AVG(oee.oee), 0) as avg_oee
        FROM mes.equipment_oee oee
        LEFT JOIN mes.equipment e ON oee.equipment_id = e.id
          AND e.tenant_id = $4::uuid
        WHERE ($1::uuid IS NULL OR e.id = $1)
          AND ($2::date IS NULL OR oee.record_date >= $2)
          AND ($3::date IS NULL OR oee.record_date <= $3)
          AND oee.tenant_id = $4::uuid
        "#,
        req.equipment_id,
        start_date,
        end_date,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let (total_records, avg_availability, avg_performance, avg_quality, avg_oee) =
        match overall_result {
            Ok(r) => (
                r.total_records.unwrap_or(0),
                r.avg_availability.unwrap_or(0.0) * 100.0,
                r.avg_performance.unwrap_or(0.0) * 100.0,
                r.avg_quality_rate.unwrap_or(0.0) * 100.0,
                r.avg_oee.unwrap_or(0.0) * 100.0,
            ),
            Err(e) => {
                tracing::error!("Failed to fetch overall OEE stats: {}", e);
                (0, 0.0, 0.0, 0.0, 0.0)
            }
        };

    // 趋势数据（近14天）
    let trend_result = sqlx::query(
        r#"
        SELECT
            DATE(oee.record_date) as date,
            COALESCE(AVG(oee.availability), 0) as availability,
            COALESCE(AVG(oee.performance), 0) as performance,
            COALESCE(AVG(oee.quality_rate), 0) as quality,
            COALESCE(AVG(oee.oee), 0) as oee
        FROM mes.equipment_oee oee
        LEFT JOIN mes.equipment e ON oee.equipment_id = e.id
          AND e.tenant_id = $2::uuid
        WHERE oee.record_date >= CURRENT_DATE - INTERVAL '14 days'
          AND ($1::uuid IS NULL OR e.id = $1)
          AND oee.tenant_id = $2::uuid
        GROUP BY DATE(oee.record_date)
        ORDER BY date DESC
        LIMIT 14
        "#,
    )
    .bind(req.equipment_id)
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;

    let trend: Vec<OeeTrendItem> = match trend_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| {
                let date = r
                    .try_get::<Option<NaiveDate>, _>("date")
                    .ok()
                    .flatten()
                    .map(|d| d.to_string())
                    .unwrap_or_default();
                OeeTrendItem {
                    date,
                    availability: r
                        .try_get::<Option<f64>, _>("availability")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0)
                        * 100.0,
                    performance: r
                        .try_get::<Option<f64>, _>("performance")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0)
                        * 100.0,
                    quality: r
                        .try_get::<Option<f64>, _>("quality")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0)
                        * 100.0,
                    oee: r
                        .try_get::<Option<f64>, _>("oee")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0)
                        * 100.0,
                }
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch OEE trend: {}", e);
            vec![]
        }
    };

    // 按设备统计
    let by_equip_result = sqlx::query!(
        r#"
        SELECT
            e.id as equipment_id,
            e.equipment_name as equipment_name,
            e.equipment_code as equipment_code,
            COALESCE(AVG(oee.availability), 0) as availability,
            COALESCE(AVG(oee.performance), 0) as performance,
            COALESCE(AVG(oee.quality_rate), 0) as quality_rate,
            COALESCE(AVG(oee.oee), 0) as oee
        FROM mes.equipment e
        LEFT JOIN mes.equipment_oee oee ON e.id = oee.equipment_id
          AND ($2::date IS NULL OR oee.record_date >= $2)
          AND ($3::date IS NULL OR oee.record_date <= $3)
          AND oee.tenant_id = $4::uuid
        WHERE ($1::uuid IS NULL OR e.id = $1)
          AND e.tenant_id = $4::uuid
        GROUP BY e.id, e.equipment_name, e.equipment_code
        ORDER BY oee DESC
        "#,
        req.equipment_id,
        start_date,
        end_date,
        tenant_id,
    )
    .fetch_all(&mut scope)
    .await;

    let by_equipment: Vec<OeeEquipmentStat> = match by_equip_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| OeeEquipmentStat {
                equipment_id: r.equipment_id,
                equipment_name: r.equipment_name,
                equipment_code: r.equipment_code,
                availability: r.availability.unwrap_or(0.0) * 100.0,
                performance: r.performance.unwrap_or(0.0) * 100.0,
                quality: r.quality_rate.unwrap_or(0.0) * 100.0,
                oee: r.oee.unwrap_or(0.0) * 100.0,
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch OEE by equipment: {}", e);
            vec![]
        }
    };

    ApiResponse::success(
        OeeStatisticsResponse {
            total_records,
            avg_availability,
            avg_performance,
            avg_quality,
            avg_oee,
            trend,
            by_equipment,
        },
        "获取OEE统计数据成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment-oee/{equipment_id}/efficiency",
    tag = "EquipmentOEE",
    params(
        ("equipment_id" = String, Path, description = "设备ID"),
    ),
    responses(
        (status = 200, description = "设备效率分析", body = ApiResponse<Vec<EquipmentEfficiencyAnalysis>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn get_equipment_efficiency_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(equipment_id): Path<String>,
) -> ApiResponse<Vec<EquipmentEfficiencyAnalysis>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }

    let equipment_uuid = match Uuid::parse_str(&equipment_id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的设备ID");
        }
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
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取设备效率分析失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            e.id as equipment_id, e.equipment_name as equipment_name, e.equipment_code as equipment_no,
            COALESCE(AVG(oee.oee), 0) as oee,
            COALESCE(AVG(oee.availability), 0) as availability,
            COALESCE(AVG(oee.performance), 0) as performance,
            COALESCE(AVG(oee.quality_rate), 0) as quality_rate,
            e.status
        FROM mes.equipment e
        LEFT JOIN mes.equipment_oee oee ON e.id = oee.equipment_id
          AND oee.record_date >= CURRENT_DATE - INTERVAL '30 days'
          AND oee.tenant_id = $2::uuid
        WHERE e.id = $1
          AND e.tenant_id = $2::uuid
        GROUP BY e.id, e.equipment_name, e.equipment_code, e.status
        ORDER BY oee DESC
        "#,
        equipment_uuid,
        get_tenant_id(&claims),
    )
    .fetch_all(&mut scope)
    .await;

    let equipments = match result {
        Ok(e) => e,
        Err(err) => {
            tracing::error!("Failed to fetch equipment efficiency: {}", err);
            return ApiResponse::server_error("获取设备效率分析失败");
        }
    };

    let analysis_list: Vec<EquipmentEfficiencyAnalysis> = equipments
        .into_iter()
        .enumerate()
        .map(|(idx, r)| {
            let oee_val = r.oee.unwrap_or(0.0);
            let status = if oee_val >= 0.85 {
                "excellent".to_string()
            } else if oee_val >= 0.70 {
                "good".to_string()
            } else if oee_val >= 0.50 {
                "fair".to_string()
            } else {
                "poor".to_string()
            };

            EquipmentEfficiencyAnalysis {
                equipment_id: r.equipment_id,
                equipment_name: r.equipment_name,
                equipment_no: r.equipment_no,
                oee: oee_val,
                availability: r.availability.unwrap_or(0.0),
                performance: r.performance.unwrap_or(0.0),
                quality_rate: r.quality_rate.unwrap_or(0.0),
                rank: (idx + 1) as i32,
                trend: 0.0,
                status,
            }
        })
        .collect();

    ApiResponse::success(analysis_list, "获取设备效率分析成功")
}
