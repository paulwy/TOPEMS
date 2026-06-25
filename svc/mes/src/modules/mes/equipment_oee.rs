//! Equipment OEE handlers

use axum::{extract::Path, extract::State, extract::Extension, Json};
use chrono::{DateTime, Duration, NaiveDate, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::{BigDecimal, Uuid}, PgPool};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::AppState;
use super::permission::{check_permission, ModulePermission};
use topems_shared::response::ApiResponse;

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize)]
pub struct OeeRecordResponse {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_name: Option<String>,
    pub equipment_no: Option<String>,
    pub record_date: DateTime<Utc>,
    pub planned_production_time: f64,
    pub actual_run_time: f64,
    pub downtime: f64,
    pub ideal_cycle_time: f64,
    pub actual_output: f64,
    pub good_output: f64,
    pub defective_output: f64,
    pub availability: f64,
    pub performance: f64,
    pub quality_rate: f64,
    pub oee: f64,
    pub shift: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OeeStatisticsResponse {
    pub equipment_id: Uuid,
    pub equipment_name: String,
    pub equipment_no: String,
    pub total_records: i64,
    pub avg_availability: f64,
    pub avg_performance: f64,
    pub avg_quality_rate: f64,
    pub avg_oee: f64,
    pub total_production_time: f64,
    pub total_output: f64,
    pub total_good_output: f64,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
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

#[derive(Debug, Clone, Serialize)]
pub struct ListOeeRecordsResponse {
    pub records: Vec<OeeRecordResponse>,
    pub total: i64,
}

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Deserialize)]
pub struct OeeStatisticsQuery {
    pub equipment_id: Option<Uuid>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d)).unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn opt_naive_date_to_utc(dt: Option<NaiveDate>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d.and_hms_opt(0, 0, 0).unwrap()))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok()).unwrap_or(0.0)
}

fn calculate_oee(
    planned_time: f64,
    run_time: f64,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
) -> (f64, f64, f64, f64) {
    let availability = if planned_time > 0.0 { run_time / planned_time } else { 0.0 };
    let performance = if run_time > 0.0 && ideal_cycle_time > 0.0 {
        (actual_output * ideal_cycle_time) / run_time
    } else {
        0.0
    };
    let performance = performance.min(1.0);
    let quality_rate = if actual_output > 0.0 { good_output / actual_output } else { 0.0 };
    let oee = availability * performance * quality_rate;
    
    (availability, performance, quality_rate, oee)
}

// ==================== Equipment OEE Handlers ====================

pub async fn list_oee_records(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ListOeeRecordsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            oee.id, oee.equipment_id, oee.record_date,
            oee.planned_production_time, oee.actual_run_time, oee.downtime,
            oee.ideal_cycle_time, oee.actual_output, oee.good_output, oee.defective_output,
            oee.availability, oee.performance, oee.quality_rate, oee.oee,
            oee.shift, oee.operator, oee.notes, oee.created_at, oee.updated_at,
            e.name as equipment_name, e.equipment_no
        FROM equipment_oee oee
        LEFT JOIN equipment e ON oee.equipment_id = e.id
        ORDER BY oee.record_date DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let records = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch OEE records: {}", e);
            return Json(ApiResponse::error(500, "获取OEE记录列表失败"));
        }
    };

    let records_list: Vec<OeeRecordResponse> = records.into_iter().map(|r| OeeRecordResponse {
        id: r.id,
        equipment_id: r.equipment_id,
        equipment_name: Some(r.equipment_name),
        equipment_no: Some(r.equipment_no),
        record_date: opt_naive_date_to_utc(Some(r.record_date)).unwrap_or_else(Utc::now),
        planned_production_time: big_decimal_to_f64(Some(r.planned_production_time)),
        actual_run_time: big_decimal_to_f64(Some(r.actual_run_time)),
        downtime: big_decimal_to_f64(r.downtime),
        ideal_cycle_time: big_decimal_to_f64(Some(r.ideal_cycle_time)),
        actual_output: big_decimal_to_f64(Some(r.actual_output)),
        good_output: big_decimal_to_f64(Some(r.good_output)),
        defective_output: big_decimal_to_f64(r.defective_output),
        availability: big_decimal_to_f64(r.availability),
        performance: big_decimal_to_f64(r.performance),
        quality_rate: big_decimal_to_f64(r.quality_rate),
        oee: big_decimal_to_f64(r.oee),
        shift: r.shift,
        operator: r.operator,
        notes: r.notes,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    let total = records_list.len() as i64;

    Json(ApiResponse::success(
        ListOeeRecordsResponse {
            records: records_list,
            total,
        },
        "获取OEE记录列表成功",
    ))
}

pub async fn create_oee_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateOeeRecordRequest>,
) -> Json<ApiResponse<OeeRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await {
        return e;
    }

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
            shift, operator, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
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
        r#"SELECT name, equipment_no FROM equipment WHERE id = $1"#,
        req.equipment_id
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    let record = OeeRecordResponse {
        id: result.id,
        equipment_id: result.equipment_id,
        equipment_name: equipment.as_ref().map(|e| e.name.clone()),
        equipment_no: equipment.as_ref().map(|e| e.equipment_no.clone()),
        record_date: opt_naive_date_to_utc(Some(result.record_date)).unwrap_or_else(Utc::now),
        planned_production_time: big_decimal_to_f64(Some(result.planned_production_time)),
        actual_run_time: big_decimal_to_f64(Some(result.actual_run_time)),
        downtime: big_decimal_to_f64(result.downtime),
        ideal_cycle_time: big_decimal_to_f64(Some(result.ideal_cycle_time)),
        actual_output: big_decimal_to_f64(Some(result.actual_output)),
        good_output: big_decimal_to_f64(Some(result.good_output)),
        defective_output: big_decimal_to_f64(result.defective_output),
        availability: big_decimal_to_f64(result.availability),
        performance: big_decimal_to_f64(result.performance),
        quality_rate: big_decimal_to_f64(result.quality_rate),
        oee: big_decimal_to_f64(result.oee),
        shift: result.shift,
        operator: result.operator,
        notes: result.notes,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
    };

    Json(ApiResponse::success(record, "OEE记录创建成功"))
}

pub async fn get_oee_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OeeRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            oee.id, oee.equipment_id, oee.record_date,
            oee.planned_production_time, oee.actual_run_time, oee.downtime,
            oee.ideal_cycle_time, oee.actual_output, oee.good_output, oee.defective_output,
            oee.availability, oee.performance, oee.quality_rate, oee.oee,
            oee.shift, oee.operator, oee.notes, oee.created_at, oee.updated_at,
            e.name as equipment_name, e.equipment_no
        FROM equipment_oee oee
        LEFT JOIN equipment e ON oee.equipment_id = e.id
        WHERE oee.id = $1
        "#,
        id,
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
                id: r.id,
                equipment_id: r.equipment_id,
                equipment_name: Some(r.equipment_name),
                equipment_no: Some(r.equipment_no),
                record_date: opt_naive_date_to_utc(Some(r.record_date)).unwrap_or_else(Utc::now),
                planned_production_time: big_decimal_to_f64(Some(r.planned_production_time)),
                actual_run_time: big_decimal_to_f64(Some(r.actual_run_time)),
                downtime: big_decimal_to_f64(r.downtime),
                ideal_cycle_time: big_decimal_to_f64(Some(r.ideal_cycle_time)),
                actual_output: big_decimal_to_f64(Some(r.actual_output)),
                good_output: big_decimal_to_f64(Some(r.good_output)),
                defective_output: big_decimal_to_f64(r.defective_output),
                availability: big_decimal_to_f64(r.availability),
                performance: big_decimal_to_f64(r.performance),
                quality_rate: big_decimal_to_f64(r.quality_rate),
                oee: big_decimal_to_f64(r.oee),
                shift: r.shift,
                operator: r.operator,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(record, "获取OEE记录成功"))
        }
        None => Json(ApiResponse::error(404, "OEE记录不存在")),
    }
}

pub async fn update_oee_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateOeeRecordRequest>,
) -> Json<ApiResponse<OeeRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await {
        return e;
    }

    let existing = sqlx::query!(
        r#"
        SELECT planned_production_time, actual_run_time, downtime,
               ideal_cycle_time, actual_output, good_output, defective_output
        FROM equipment_oee WHERE id = $1
        "#,
        id,
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

    let planned_time = req.planned_production_time.unwrap_or(big_decimal_to_f64(Some(existing.planned_production_time)));
    let run_time = req.actual_run_time.unwrap_or(big_decimal_to_f64(Some(existing.actual_run_time)));
    let cycle_time = req.ideal_cycle_time.unwrap_or(big_decimal_to_f64(Some(existing.ideal_cycle_time)));
    let output = req.actual_output.unwrap_or(big_decimal_to_f64(Some(existing.actual_output)));
    let good = req.good_output.unwrap_or(big_decimal_to_f64(Some(existing.good_output)));

    let (availability, performance, quality_rate, oee) = calculate_oee(
        planned_time, run_time, cycle_time, output, good,
    );

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
        RETURNING 
            id, equipment_id, record_date,
            planned_production_time, actual_run_time, downtime,
            ideal_cycle_time, actual_output, good_output, defective_output,
            availability, performance, quality_rate, oee,
            shift, operator, notes, created_at, updated_at
        "#,
        id,
        req.planned_production_time.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.actual_run_time.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.downtime.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.ideal_cycle_time.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.actual_output.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.good_output.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.defective_output.and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        BigDecimal::from_str(&availability.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&performance.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&quality_rate.to_string()).unwrap_or_default(),
        BigDecimal::from_str(&oee.to_string()).unwrap_or_default(),
        req.shift,
        req.operator,
        req.notes,
        Utc::now().naive_utc(),
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
                id: r.id,
                equipment_id: r.equipment_id,
                equipment_name: None,
                equipment_no: None,
                record_date: opt_naive_date_to_utc(Some(r.record_date)).unwrap_or_else(Utc::now),
                planned_production_time: big_decimal_to_f64(Some(r.planned_production_time)),
                actual_run_time: big_decimal_to_f64(Some(r.actual_run_time)),
                downtime: big_decimal_to_f64(r.downtime),
                ideal_cycle_time: big_decimal_to_f64(Some(r.ideal_cycle_time)),
                actual_output: big_decimal_to_f64(Some(r.actual_output)),
                good_output: big_decimal_to_f64(Some(r.good_output)),
                defective_output: big_decimal_to_f64(r.defective_output),
                availability: big_decimal_to_f64(r.availability),
                performance: big_decimal_to_f64(r.performance),
                quality_rate: big_decimal_to_f64(r.quality_rate),
                oee: big_decimal_to_f64(r.oee),
                shift: r.shift,
                operator: r.operator,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(record, "OEE记录更新成功"))
        }
        None => Json(ApiResponse::error(404, "OEE记录不存在")),
    }
}

pub async fn delete_oee_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"DELETE FROM equipment_oee WHERE id = $1"#,
        id,
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

pub async fn get_oee_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<OeeStatisticsQuery>,
) -> Json<ApiResponse<Vec<OeeStatisticsResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            e.id as equipment_id, e.name as equipment_name, e.equipment_no,
            COUNT(oee.id) as total_records,
            COALESCE(AVG(oee.availability), 0) as avg_availability,
            COALESCE(AVG(oee.performance), 0) as avg_performance,
            COALESCE(AVG(oee.quality_rate), 0) as avg_quality_rate,
            COALESCE(AVG(oee.oee), 0) as avg_oee,
            COALESCE(SUM(oee.actual_run_time), 0) as total_production_time,
            COALESCE(SUM(oee.actual_output), 0) as total_output,
            COALESCE(SUM(oee.good_output), 0) as total_good_output,
            MIN(oee.record_date) as date_from,
            MAX(oee.record_date) as date_to
        FROM equipment e
        LEFT JOIN equipment_oee oee ON e.id = oee.equipment_id
        WHERE ($1::uuid IS NULL OR e.id = $1)
          AND ($2::date IS NULL OR oee.record_date >= $2)
          AND ($3::date IS NULL OR oee.record_date <= $3)
        GROUP BY e.id, e.name, e.equipment_no
        ORDER BY avg_oee DESC
        "#,
        req.equipment_id,
        req.date_from.map(|d| d.date_naive()),
        req.date_to.map(|d| d.date_naive()),
    )
    .fetch_all(&state.pool)
    .await;

    let stats = match result {
        Ok(rows) => rows.into_iter().map(|r| OeeStatisticsResponse {
            equipment_id: r.equipment_id,
            equipment_name: r.equipment_name,
            equipment_no: r.equipment_no,
            total_records: r.total_records.unwrap_or(0),
            avg_availability: big_decimal_to_f64(r.avg_availability),
            avg_performance: big_decimal_to_f64(r.avg_performance),
            avg_quality_rate: big_decimal_to_f64(r.avg_quality_rate),
            avg_oee: big_decimal_to_f64(r.avg_oee),
            total_production_time: big_decimal_to_f64(r.total_production_time),
            total_output: big_decimal_to_f64(r.total_output),
            total_good_output: big_decimal_to_f64(r.total_good_output),
            date_from: opt_naive_date_to_utc(r.date_from),
            date_to: opt_naive_date_to_utc(r.date_to),
        }).collect(),
        Err(e) => {
            tracing::error!("Failed to fetch OEE statistics: {}", e);
            return Json(ApiResponse::error(500, "获取OEE统计数据失败"));
        }
    };

    Json(ApiResponse::success(stats, "获取OEE统计数据成功"))
}

pub async fn get_equipment_efficiency_analysis(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<EquipmentEfficiencyAnalysis>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentOeeRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            e.id as equipment_id, e.name as equipment_name, e.equipment_no,
            COALESCE(AVG(oee.oee), 0) as oee,
            COALESCE(AVG(oee.availability), 0) as availability,
            COALESCE(AVG(oee.performance), 0) as performance,
            COALESCE(AVG(oee.quality_rate), 0) as quality_rate,
            e.status
        FROM equipment e
        LEFT JOIN equipment_oee oee ON e.id = oee.equipment_id
          AND oee.record_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY e.id, e.name, e.equipment_no, e.status
        ORDER BY oee DESC
        "#
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

    let analysis_list: Vec<EquipmentEfficiencyAnalysis> = equipments.into_iter().enumerate().map(|(idx, r)| {
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
            equipment_id: r.equipment_id,
            equipment_name: r.equipment_name,
            equipment_no: r.equipment_no,
            oee: oee_val,
            availability: big_decimal_to_f64(r.availability),
            performance: big_decimal_to_f64(r.performance),
            quality_rate: big_decimal_to_f64(r.quality_rate),
            rank: (idx + 1) as i32,
            trend: 0.0,
            status,
        }
    }).collect();

    Json(ApiResponse::success(analysis_list, "获取设备效率分析成功"))
}
