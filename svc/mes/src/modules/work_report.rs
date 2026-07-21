use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, put},
    Json, Router,
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

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/work-reports",
            get(list_work_reports).post(create_work_report),
        )
        .route(
            "/work-reports/{id}",
            get(get_work_report)
                .put(update_work_report)
                .delete(delete_work_report),
        )
        .route("/work-reports/{id}/approve", put(approve_work_report))
        .route("/work-reports/{id}/reject", put(reject_work_report))
}

// ==================== Request / Response Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListWorkReportsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateWorkReportRequest {
    pub work_order_id: Option<String>,
    pub work_order_no: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub reporter_name: String,
    pub report_date: String,
    pub shift: Option<String>,
    pub output_quantity: Option<f64>,
    pub defect_quantity: Option<f64>,
    pub labor_hours: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateWorkReportRequest {
    pub work_order_id: Option<String>,
    pub work_order_no: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub reporter_name: Option<String>,
    pub report_date: Option<String>,
    pub shift: Option<String>,
    pub output_quantity: Option<f64>,
    pub defect_quantity: Option<f64>,
    pub labor_hours: Option<f64>,
    pub remark: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RejectWorkReportRequest {
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkReportResponse {
    pub id: String,
    pub report_no: String,
    pub work_order_id: Option<String>,
    pub work_order_no: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub reporter_name: String,
    pub report_date: String,
    pub shift: Option<String>,
    pub output_quantity: f64,
    pub defect_quantity: f64,
    pub labor_hours: f64,
    pub remark: Option<String>,
    pub status: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub approval_remark: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ==================== Helpers ====================

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    match dt {
        Some(d) => Utc.from_utc_datetime(&d),
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

fn opt_datetime_to_string(dt: Option<NaiveDateTime>) -> Option<String> {
    dt.map(|d| Utc.from_utc_datetime(&d).to_rfc3339())
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

fn parse_report_date(s: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").map_err(|e| format!("无效的 report_date: {}", e))
}

fn generate_report_no() -> String {
    let now = Utc::now();
    format!("WR{}", now.format("%Y%m%d%H%M%S"))
}

// ==================== Handlers ====================

pub async fn list_work_reports(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWorkReportsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE wr.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (wr.report_no ILIKE $1 OR wr.reporter_name ILIKE $1 OR wr.work_order_no ILIKE $1 OR wr.order_no ILIKE $1)",
            );
        } else {
            let idx = params.len() + 1;
            where_clause.push_str(&format!(
                " AND (wr.report_no ILIKE ${idx} OR wr.reporter_name ILIKE ${idx} OR wr.work_order_no ILIKE ${idx} OR wr.order_no ILIKE ${idx})",
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM work_reports wr{}",
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
            tracing::error!("Failed to count work reports: {}", e);
            return Json(ApiResponse::error(500, "获取工报列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            wr.id, wr.report_no, wr.work_order_id, wr.work_order_no,
            wr.order_id, wr.order_no, wr.work_station_id, wr.work_station_name,
            wr.reporter_name, wr.report_date, wr.shift,
            wr.output_quantity, wr.defect_quantity, wr.labor_hours, wr.remark,
            wr.status, wr.approved_by, wr.approved_at, wr.approval_remark,
            wr.created_at, wr.updated_at
        FROM work_reports wr
        {}
        ORDER BY wr.created_at DESC
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

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work reports: {}", e);
            return Json(ApiResponse::error(500, "获取工报列表失败"));
        }
    };

    let reports: Vec<WorkReportResponse> = rows
        .into_iter()
        .map(|r| WorkReportResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            report_no: r.try_get::<String, _>("report_no").unwrap_or_default(),
            work_order_id: r
                .try_get::<Option<Uuid>, _>("work_order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            work_order_no: r
                .try_get::<Option<String>, _>("work_order_no")
                .ok()
                .flatten(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            work_station_name: r
                .try_get::<Option<String>, _>("work_station_name")
                .ok()
                .flatten(),
            reporter_name: r.try_get::<String, _>("reporter_name").unwrap_or_default(),
            report_date: r
                .try_get::<Option<NaiveDate>, _>("report_date")
                .ok()
                .flatten()
                .map(|d| d.to_string())
                .unwrap_or_default(),
            shift: r.try_get::<Option<String>, _>("shift").ok().flatten(),
            output_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("output_quantity")
                    .ok()
                    .flatten(),
            ),
            defect_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("defect_quantity")
                    .ok()
                    .flatten(),
            ),
            labor_hours: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("labor_hours")
                    .ok()
                    .flatten(),
            ),
            remark: r.try_get::<Option<String>, _>("remark").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            approved_by: r.try_get::<Option<String>, _>("approved_by").ok().flatten(),
            approved_at: opt_datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("approved_at")
                    .ok()
                    .flatten(),
            ),
            approval_remark: r
                .try_get::<Option<String>, _>("approval_remark")
                .ok()
                .flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "reports": reports,
            "total": total.unwrap_or(0),
            "page": page,
            "pagesize": pagesize,
        }),
        "获取工报列表成功",
    ))
}

pub async fn get_work_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkReportResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工报ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            wr.id, wr.report_no, wr.work_order_id, wr.work_order_no,
            wr.order_id, wr.order_no, wr.work_station_id, wr.work_station_name,
            wr.reporter_name, wr.report_date, wr.shift,
            wr.output_quantity, wr.defect_quantity, wr.labor_hours, wr.remark,
            wr.status, wr.approved_by, wr.approved_at, wr.approval_remark,
            wr.created_at, wr.updated_at
        FROM work_reports wr
        WHERE wr.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            WorkReportResponse {
                id: r.id.to_string(),
                report_no: r.report_no,
                work_order_id: r.work_order_id.map(|u| u.to_string()),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: r.work_station_name,
                reporter_name: r.reporter_name.unwrap_or_default(),
                report_date: r.report_date.to_string(),
                shift: r.shift,
                output_quantity: big_decimal_to_f64(r.output_quantity),
                defect_quantity: big_decimal_to_f64(r.defect_quantity),
                labor_hours: big_decimal_to_f64(r.labor_hours),
                remark: r.remark,
                status: r.status.unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at),
                approval_remark: r.approval_remark,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "获取工报成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工报不存在")),
        Err(e) => {
            tracing::error!("Failed to get work report: {}", e);
            Json(ApiResponse::error(500, "获取工报失败"))
        }
    }
}

pub async fn create_work_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateWorkReportRequest>,
) -> Json<ApiResponse<WorkReportResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let work_order_id = body
        .work_order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let order_id = body
        .order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let work_station_id = body
        .work_station_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let report_date = match parse_report_date(&body.report_date) {
        Ok(d) => d,
        Err(e) => {
            return Json(ApiResponse::error(400, &e));
        }
    };

    let output_quantity = body
        .output_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let defect_quantity = body
        .defect_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let labor_hours = body
        .labor_hours
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());

    let report_no = generate_report_no();

    let result = sqlx::query!(
        r#"
        INSERT INTO work_reports (
            report_no, work_order_id, work_order_no, order_id, order_no,
            work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
        report_no,
        work_order_id,
        body.work_order_no,
        order_id,
        body.order_no,
        work_station_id,
        body.work_station_name,
        body.reporter_name,
        report_date,
        body.shift,
        output_quantity,
        defect_quantity,
        labor_hours,
        body.remark,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            WorkReportResponse {
                id: r.id.to_string(),
                report_no: r.report_no,
                work_order_id: r.work_order_id.map(|u| u.to_string()),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: r.work_station_name,
                reporter_name: r.reporter_name.unwrap_or_default(),
                report_date: r.report_date.to_string(),
                shift: r.shift,
                output_quantity: big_decimal_to_f64(r.output_quantity),
                defect_quantity: big_decimal_to_f64(r.defect_quantity),
                labor_hours: big_decimal_to_f64(r.labor_hours),
                remark: r.remark,
                status: r.status.unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at),
                approval_remark: r.approval_remark,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "创建工报成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create work report: {}", e);
            Json(ApiResponse::error(500, "创建工报失败"))
        }
    }
}

pub async fn update_work_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateWorkReportRequest>,
) -> Json<ApiResponse<WorkReportResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工报ID"));
        }
    };

    let work_order_id = body
        .work_order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let order_id = body
        .order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let work_station_id = body
        .work_station_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let report_date = match body.report_date.as_ref() {
        Some(s) => match parse_report_date(s) {
            Ok(d) => Some(d),
            Err(e) => return Json(ApiResponse::error(400, &e)),
        },
        None => None,
    };

    let output_quantity = body
        .output_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let defect_quantity = body
        .defect_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let labor_hours = body
        .labor_hours
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());

    let result = sqlx::query!(
        r#"
        UPDATE work_reports
        SET
            work_order_id = COALESCE($1, work_order_id),
            work_order_no = COALESCE($2, work_order_no),
            order_id = COALESCE($3, order_id),
            order_no = COALESCE($4, order_no),
            work_station_id = COALESCE($5, work_station_id),
            work_station_name = COALESCE($6, work_station_name),
            reporter_name = COALESCE($7, reporter_name),
            report_date = COALESCE($8, report_date),
            shift = COALESCE($9, shift),
            output_quantity = COALESCE($10, output_quantity),
            defect_quantity = COALESCE($11, defect_quantity),
            labor_hours = COALESCE($12, labor_hours),
            remark = COALESCE($13, remark),
            status = COALESCE($14, status),
            updated_at = NOW()
        WHERE id = $15
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
        work_order_id,
        body.work_order_no,
        order_id,
        body.order_no,
        work_station_id,
        body.work_station_name,
        body.reporter_name,
        report_date,
        body.shift,
        output_quantity,
        defect_quantity,
        labor_hours,
        body.remark,
        body.status,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            WorkReportResponse {
                id: r.id.to_string(),
                report_no: r.report_no,
                work_order_id: r.work_order_id.map(|u| u.to_string()),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: r.work_station_name,
                reporter_name: r.reporter_name.unwrap_or_default(),
                report_date: r.report_date.to_string(),
                shift: r.shift,
                output_quantity: big_decimal_to_f64(r.output_quantity),
                defect_quantity: big_decimal_to_f64(r.defect_quantity),
                labor_hours: big_decimal_to_f64(r.labor_hours),
                remark: r.remark,
                status: r.status.unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at),
                approval_remark: r.approval_remark,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "更新工报成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工报不存在")),
        Err(e) => {
            tracing::error!("Failed to update work report: {}", e);
            Json(ApiResponse::error(500, "更新工报失败"))
        }
    }
}

pub async fn delete_work_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工报ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM work_reports WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除工报成功")),
        Err(e) => {
            tracing::error!("Failed to delete work report: {}", e);
            Json(ApiResponse::error(500, "删除工报失败"))
        }
    }
}

pub async fn approve_work_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkReportResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工报ID"));
        }
    };

    let approver = Uuid::parse_str(&claims.username).ok();

    let result = sqlx::query!(
        r#"
        UPDATE work_reports
        SET
            status = 'approved',
            approved_by = $1::uuid,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
        approver,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            WorkReportResponse {
                id: r.id.to_string(),
                report_no: r.report_no,
                work_order_id: r.work_order_id.map(|u| u.to_string()),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: r.work_station_name,
                reporter_name: r.reporter_name.unwrap_or_default(),
                report_date: r.report_date.to_string(),
                shift: r.shift,
                output_quantity: big_decimal_to_f64(r.output_quantity),
                defect_quantity: big_decimal_to_f64(r.defect_quantity),
                labor_hours: big_decimal_to_f64(r.labor_hours),
                remark: r.remark,
                status: r.status.unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at),
                approval_remark: r.approval_remark,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "审批通过成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工报不存在")),
        Err(e) => {
            tracing::error!("Failed to approve work report: {}", e);
            Json(ApiResponse::error(500, "审批通过失败"))
        }
    }
}

pub async fn reject_work_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<RejectWorkReportRequest>,
) -> Json<ApiResponse<WorkReportResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工报ID"));
        }
    };

    let approver = Uuid::parse_str(&claims.username).ok();
    let remark = body.remark.unwrap_or_default();

    let result = sqlx::query!(
        r#"
        UPDATE work_reports
        SET
            status = 'rejected',
            approved_by = $1::uuid,
            approval_remark = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
        approver,
        remark,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            WorkReportResponse {
                id: r.id.to_string(),
                report_no: r.report_no,
                work_order_id: r.work_order_id.map(|u| u.to_string()),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: r.work_station_name,
                reporter_name: r.reporter_name.unwrap_or_default(),
                report_date: r.report_date.to_string(),
                shift: r.shift,
                output_quantity: big_decimal_to_f64(r.output_quantity),
                defect_quantity: big_decimal_to_f64(r.defect_quantity),
                labor_hours: big_decimal_to_f64(r.labor_hours),
                remark: r.remark,
                status: r.status.unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at),
                approval_remark: r.approval_remark,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "审批驳回成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工报不存在")),
        Err(e) => {
            tracing::error!("Failed to reject work report: {}", e);
            Json(ApiResponse::error(500, "审批驳回失败"))
        }
    }
}
