//! Equipment OEE handlers

use axum::{
    extract::Extension, extract::Path, extract::Query, extract::State, routing::get, Json, Router,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;
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
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListOeeRecordsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
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
    pub pagesize: i64,
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

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

fn opt_naive_date_to_utc(dt: Option<NaiveDate>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d.and_hms_opt(0, 0, 0).unwrap_or_default()))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
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
        ("pagesize" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("shift" = Option<String>, Query, description = "班次过滤"),
    ),
    responses(
        (status = 200, description = "OEE记录列表", body = ApiResponse<ListOeeRecordsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_oee_records(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListOeeRecordsQuery>,
) -> Json<ApiResponse<ListOeeRecordsResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<String> = Vec::new();
    let mut where_clause = String::from(" WHERE oee.deleted_at IS NULL");

    if let Some(shift) = query.shift {
        where_clause.push_str(" AND oee.shift = $1");
        params.push(shift);
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
        params.push(pattern);
    }

    // 租户过滤：非 superuser 仅见本租户
    if let Some(t) = tenant_opt {
        let tidx = params.len() + 1;
        params.push(t.to_string());
        where_clause.push_str(&format!(" AND (oee.tenant_id = ${}::uuid)", tidx));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM equipment_oee oee LEFT JOIN equipment e ON oee.equipment_id = e.id{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count OEE records: {}", e);
            return Json(ApiResponse::error(500, "获取OEE记录列表失败"));
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
        FROM equipment_oee oee
        LEFT JOIN equipment e ON oee.equipment_id = e.id
        {}
        ORDER BY oee.record_date DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let records = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch OEE records: {}", e);
            return Json(ApiResponse::error(500, "获取OEE记录列表失败"));
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
            record_date: opt_naive_date_to_utc(
                r.try_get::<Option<NaiveDate>, _>("record_date")
                    .ok()
                    .flatten(),
            )
            .unwrap_or_else(Utc::now),
            planned_production_time: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("planned_production_time")
                    .ok()
                    .flatten(),
            ),
            run_time: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("actual_run_time")
                    .ok()
                    .flatten(),
            ),
            downtime: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("downtime")
                    .ok()
                    .flatten(),
            ),
            ideal_cycle_time: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("ideal_cycle_time")
                    .ok()
                    .flatten(),
            ),
            total_count: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("actual_output")
                    .ok()
                    .flatten(),
            ),
            good_count: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("good_output")
                    .ok()
                    .flatten(),
            ),
            reject_count: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("defective_output")
                    .ok()
                    .flatten(),
            ),
            availability: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("availability")
                    .ok()
                    .flatten(),
            ) * 100.0,
            performance: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("performance")
                    .ok()
                    .flatten(),
            ) * 100.0,
            quality: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quality_rate")
                    .ok()
                    .flatten(),
            ) * 100.0,
            oee: big_decimal_to_f64(r.try_get::<Option<BigDecimal>, _>("oee").ok().flatten())
                * 100.0,
            shift: r.try_get::<Option<String>, _>("shift").ok().flatten(),
            operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListOeeRecordsResponse {
            records: records_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取OEE记录列表成功",
    ))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateOeeRecordRequest>,
) -> Json<ApiResponse<OeeRecordResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await
    {
        return e;
    }
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let new_tenant: uuid::Uuid = tenant_opt
        .unwrap_or(uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());

    let now = Utc::now();

    let (availability, performance, quality_rate, oee) = calculate_oee(
        req.planned_production_time,
        req.actual_run_time,
        req.ideal_cycle_time,
        req.actual_output,
        req.good_output,
    );

    let result = sqlx::query!(
        r#"
        INSERT INTO equipment_oee (
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
        req.record_date.date_naive(),
        BigDecimal::from_str(&req.planned_production_time.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&req.actual_run_time.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&req.downtime.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&req.ideal_cycle_time.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&req.actual_output.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&req.good_output.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&req.defective_output.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&availability.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&performance.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&quality_rate.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&oee.to_string()).unwrap_or_default(),
        req.shift,
        req.operator,
        req.notes,
        now.naive_utc(),
        new_tenant,
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create OEE record: {}", e);
            return Json(ApiResponse::error(500, "创建OEE记录失败"));
        }
    };

    let equipment = sqlx::query!(
        r#"SELECT CASE WHEN $2 = 'en' THEN COALESCE(equipment_name_en, equipment_name) ELSE equipment_name END AS name, equipment_code AS equipment_no FROM equipment WHERE id = $1"#,
        req.equipment_id,
        topems_shared_core::locale::Locale::from_headers(&headers).as_sql()
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    let record = OeeRecordResponse {
        id: result.id,        equipment_id: result.equipment_id,        equipment_name: equipment.as_ref().and_then(|e| e.name.clone()),
        equipment_code: equipment.as_ref().and_then(|e| e.equipment_no.clone()),
        record_date: opt_naive_date_to_utc(Some(result.record_date)).unwrap_or_else(Utc::now),
        planned_production_time: big_decimal_to_f64(Some(result.planned_production_time)),
        run_time: big_decimal_to_f64(Some(result.actual_run_time)),
        downtime: big_decimal_to_f64(result.downtime),
        ideal_cycle_time: big_decimal_to_f64(Some(result.ideal_cycle_time)),
        total_count: big_decimal_to_f64(Some(result.actual_output)),
        good_count: big_decimal_to_f64(Some(result.good_output)),
        reject_count: big_decimal_to_f64(result.defective_output),
        availability: big_decimal_to_f64(result.availability) * 100.0,
        performance: big_decimal_to_f64(result.performance) * 100.0,
        quality: big_decimal_to_f64(result.quality_rate) * 100.0,
        oee: big_decimal_to_f64(result.oee) * 100.0,
        shift: result.shift,
        operator: result.operator,
        notes: result.notes,
        created_at: naive_to_utc(Some(result.created_at)),
        updated_at: naive_to_utc(Some(result.updated_at)),
    };

    Json(ApiResponse::success(record, "OEE记录创建成功"))
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
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OeeRecordResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
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
        FROM equipment_oee oee
        LEFT JOIN equipment e ON oee.equipment_id = e.id
        WHERE oee.id = $1
          AND ($2::uuid IS NULL OR oee.tenant_id = $2)
        "#,
        id,
        tenant_opt,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch OEE record: {}", e);
            return Json(ApiResponse::error(500, "获取OEE记录失败"));
        }
    };

    match result {
        Some(r) => {
            let record = OeeRecordResponse {
                id: r.id,                equipment_id: r.equipment_id,                equipment_name: r.equipment_name,
                equipment_code: r.equipment_no,
                record_date: opt_naive_date_to_utc(Some(r.record_date)).unwrap_or_else(Utc::now),
                planned_production_time: big_decimal_to_f64(Some(r.planned_production_time)),
                run_time: big_decimal_to_f64(Some(r.actual_run_time)),
                downtime: big_decimal_to_f64(r.downtime),
                ideal_cycle_time: big_decimal_to_f64(Some(r.ideal_cycle_time)),
                total_count: big_decimal_to_f64(Some(r.actual_output)),
                good_count: big_decimal_to_f64(Some(r.good_output)),
                reject_count: big_decimal_to_f64(r.defective_output),
                availability: big_decimal_to_f64(r.availability) * 100.0,
                performance: big_decimal_to_f64(r.performance) * 100.0,
                quality: big_decimal_to_f64(r.quality_rate) * 100.0,
                oee: big_decimal_to_f64(r.oee) * 100.0,
                shift: r.shift,
                operator: r.operator,
                notes: r.notes,
                created_at: naive_to_utc(Some(r.created_at)),
                updated_at: naive_to_utc(Some(r.updated_at)),
            };
            Json(ApiResponse::success(record, "获取OEE记录成功"))
        }
        None => Json(ApiResponse::error(404, "OEE记录不存在")),
    }
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
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateOeeRecordRequest>,
) -> Json<ApiResponse<OeeRecordResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await
    {
        return e;
    }
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };

    let existing = sqlx::query!(
        r#"
        SELECT planned_production_time, actual_run_time, downtime,
               ideal_cycle_time, actual_output, good_output, defective_output
        FROM equipment_oee WHERE id = $1
          AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
        id,
        tenant_opt,
    )
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "OEE记录不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch OEE record: {}", e);
            return Json(ApiResponse::error(500, "更新OEE记录失败"));
        }
    };

    let planned_time = req
        .planned_production_time
        .unwrap_or(big_decimal_to_f64(Some(existing.planned_production_time)));
    let run_time = req
        .actual_run_time
        .unwrap_or(big_decimal_to_f64(Some(existing.actual_run_time)));
    let cycle_time = req
        .ideal_cycle_time
        .unwrap_or(big_decimal_to_f64(Some(existing.ideal_cycle_time)));
    let output = req
        .actual_output
        .unwrap_or(big_decimal_to_f64(Some(existing.actual_output)));
    let good = req
        .good_output
        .unwrap_or(big_decimal_to_f64(Some(existing.good_output)));

    let (availability, performance, quality_rate, oee) =
        calculate_oee(planned_time, run_time, cycle_time, output, good);

    let result = sqlx::query!(
        r#"
        UPDATE equipment_oee SET
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
        WHERE id = $1
          AND ($17::uuid IS NULL OR tenant_id = $17)
        RETURNING 
            id, equipment_id, record_date,
            planned_production_time, actual_run_time, downtime,
            ideal_cycle_time, actual_output, good_output, defective_output,
            availability, performance, quality_rate, oee,
            shift, operator, notes, created_at, updated_at
        "#,
        id,
        req.planned_production_time
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.actual_run_time
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.downtime
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.ideal_cycle_time
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.actual_output
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.good_output
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.defective_output
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        BigDecimal::from_str(&availability.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&performance.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&quality_rate.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&oee.to_string()).unwrap_or_default(),
        req.shift,
        req.operator,
        req.notes,
        Utc::now().naive_utc(),
        tenant_opt,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update OEE record: {}", e);
            return Json(ApiResponse::error(500, "更新OEE记录失败"));
        }
    };

    match result {
        Some(r) => {
            let record = OeeRecordResponse {
                id: r.id,                equipment_id: r.equipment_id,                equipment_name: None,
                equipment_code: None,
                record_date: opt_naive_date_to_utc(Some(r.record_date)).unwrap_or_else(Utc::now),
                planned_production_time: big_decimal_to_f64(Some(r.planned_production_time)),
                run_time: big_decimal_to_f64(Some(r.actual_run_time)),
                downtime: big_decimal_to_f64(r.downtime),
                ideal_cycle_time: big_decimal_to_f64(Some(r.ideal_cycle_time)),
                total_count: big_decimal_to_f64(Some(r.actual_output)),
                good_count: big_decimal_to_f64(Some(r.good_output)),
                reject_count: big_decimal_to_f64(r.defective_output),
                availability: big_decimal_to_f64(r.availability) * 100.0,
                performance: big_decimal_to_f64(r.performance) * 100.0,
                quality: big_decimal_to_f64(r.quality_rate) * 100.0,
                oee: big_decimal_to_f64(r.oee) * 100.0,
                shift: r.shift,
                operator: r.operator,
                notes: r.notes,
                created_at: naive_to_utc(Some(r.created_at)),
                updated_at: naive_to_utc(Some(r.updated_at)),
            };
            Json(ApiResponse::success(record, "OEE记录更新成功"))
        }
        None => Json(ApiResponse::error(404, "OEE记录不存在")),
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
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await
    {
        return e;
    }
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };

    let result = sqlx::query!(
        r#"UPDATE equipment_oee SET deleted_at = NOW() WHERE id = $1
          AND ($2::uuid IS NULL OR tenant_id = $2)"#,
        id,
        tenant_opt,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete OEE record: {}", e);
            return Json(ApiResponse::error(500, "删除OEE记录失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "OEE记录删除成功"))
    } else {
        Json(ApiResponse::error(404, "OEE记录不存在"))
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
    Extension(claims): Extension<Claims>,
    Query(req): Query<OeeStatisticsQuery>,
) -> Json<ApiResponse<OeeStatisticsResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }

    let start_date = req
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = req
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // 总体统计
    let overall_result = sqlx::query!(
        r#"
        SELECT 
            COUNT(oee.id) as total_records,
            COALESCE(AVG(oee.availability), 0) as avg_availability,
            COALESCE(AVG(oee.performance), 0) as avg_performance,
            COALESCE(AVG(oee.quality_rate), 0) as avg_quality_rate,
            COALESCE(AVG(oee.oee), 0) as avg_oee
        FROM equipment_oee oee
        LEFT JOIN equipment e ON oee.equipment_id = e.id
        WHERE ($1::uuid IS NULL OR e.id = $1)
          AND ($2::date IS NULL OR oee.record_date >= $2)
          AND ($3::date IS NULL OR oee.record_date <= $3)
        "#,
        req.equipment_id,
        start_date,
        end_date,
    )
    .fetch_one(&state.pool)
    .await;

    let (total_records, avg_availability, avg_performance, avg_quality, avg_oee) =
        match overall_result {
            Ok(r) => (
                r.total_records.unwrap_or(0),
                big_decimal_to_f64(r.avg_availability) * 100.0,
                big_decimal_to_f64(r.avg_performance) * 100.0,
                big_decimal_to_f64(r.avg_quality_rate) * 100.0,
                big_decimal_to_f64(r.avg_oee) * 100.0,
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
        FROM equipment_oee oee
        LEFT JOIN equipment e ON oee.equipment_id = e.id
        WHERE oee.record_date >= CURRENT_DATE - INTERVAL '14 days'
          AND ($1::uuid IS NULL OR e.id = $1)
        GROUP BY DATE(oee.record_date)
        ORDER BY date DESC
        LIMIT 14
        "#,
    )
    .bind(req.equipment_id)
    .fetch_all(&state.pool)
    .await;

    let trend: Vec<OeeTrendItem> = match trend_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| {
                let date = r
                    .try_get::<Option<NaiveDate>, _>("date")
                    .ok()
                    .flatten()
                    .map(|d| d.format("%Y-%m-%d").to_string())
                    .unwrap_or_default();
                OeeTrendItem {
                    date,
                    availability: big_decimal_to_f64(
                        r.try_get::<Option<BigDecimal>, _>("availability")
                            .ok()
                            .flatten(),
                    ) * 100.0,
                    performance: big_decimal_to_f64(
                        r.try_get::<Option<BigDecimal>, _>("performance")
                            .ok()
                            .flatten(),
                    ) * 100.0,
                    quality: big_decimal_to_f64(
                        r.try_get::<Option<BigDecimal>, _>("quality").ok().flatten(),
                    ) * 100.0,
                    oee: big_decimal_to_f64(
                        r.try_get::<Option<BigDecimal>, _>("oee").ok().flatten(),
                    ) * 100.0,
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
        FROM equipment e
        LEFT JOIN equipment_oee oee ON e.id = oee.equipment_id
          AND ($2::date IS NULL OR oee.record_date >= $2)
          AND ($3::date IS NULL OR oee.record_date <= $3)
        WHERE ($1::uuid IS NULL OR e.id = $1)
        GROUP BY e.id, e.equipment_name, e.equipment_code
        ORDER BY oee DESC
        "#,
        req.equipment_id,
        start_date,
        end_date,
    )
    .fetch_all(&state.pool)
    .await;

    let by_equipment: Vec<OeeEquipmentStat> = match by_equip_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| OeeEquipmentStat {
                equipment_id: r.equipment_id,                equipment_name: r.equipment_name.unwrap_or_default(),                equipment_code: r.equipment_code.unwrap_or_default(),                availability: big_decimal_to_f64(r.availability) * 100.0,
                performance: big_decimal_to_f64(r.performance) * 100.0,
                quality: big_decimal_to_f64(r.quality_rate) * 100.0,
                oee: big_decimal_to_f64(r.oee) * 100.0,
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch OEE by equipment: {}", e);
            vec![]
        }
    };

    Json(ApiResponse::success(
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
    ))
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
pub async fn get_equipment_efficiency_analysis(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(equipment_id): Path<String>,
) -> Json<ApiResponse<Vec<EquipmentEfficiencyAnalysis>>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await
    {
        return e;
    }

    let equipment_uuid = match Uuid::parse_str(&equipment_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的设备ID"));
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
        FROM equipment e
        LEFT JOIN equipment_oee oee ON e.id = oee.equipment_id
          AND oee.record_date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE e.id = $1
        GROUP BY e.id, e.equipment_name, e.equipment_code, e.status
        ORDER BY oee DESC
        "#,
        equipment_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    let equipments = match result {
        Ok(e) => e,
        Err(err) => {
            tracing::error!("Failed to fetch equipment efficiency: {}", err);
            return Json(ApiResponse::error(500, "获取设备效率分析失败"));
        }
    };

    let analysis_list: Vec<EquipmentEfficiencyAnalysis> = equipments
        .into_iter()
        .enumerate()
        .map(|(idx, r)| {
            let oee_val = big_decimal_to_f64(r.oee);
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
                equipment_id: r.equipment_id,                equipment_name: r.equipment_name.unwrap_or_default(),                equipment_no: r.equipment_no.unwrap_or_default(),                oee: oee_val,
                availability: big_decimal_to_f64(r.availability),
                performance: big_decimal_to_f64(r.performance),
                quality_rate: big_decimal_to_f64(r.quality_rate),
                rank: (idx + 1) as i32,
                trend: 0.0,
                status,
            }
        })
        .collect();

    Json(ApiResponse::success(analysis_list, "获取设备效率分析成功"))
}
