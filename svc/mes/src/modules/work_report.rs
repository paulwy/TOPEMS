use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared_auth::auth::Claims;
use utoipa::ToSchema;

use crate::modules::approval_common::{
    build_approve_response, build_reject_response, build_start_response, create_approval_and_log,
    execute_transition_and_log, reject_and_log,
};
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/work-reports",
            get(list_work_reports).post(create_work_report),
        )
        .route(
            "/work-reports/today-output",
            get(get_today_production_output),
        )
        .route(
            "/work-reports/{id}",
            get(get_work_report)
                .put(update_work_report)
                .delete(delete_work_report),
        )
        .route("/work-reports/{id}/approve", put(approve_work_report))
        .route("/work-reports/{id}/reject", put(reject_work_report))
        // APV-2: 报工返工审批端点
        .route(
            "/work-reports/{id}/approval/start",
            post(start_rework_approval),
        )
        .route("/work-reports/{id}/approval/approve", post(approve_rework))
        .route("/work-reports/{id}/approval/reject", post(reject_rework))
}

// ==================== Request / Response Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListWorkReportsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RejectWorkReportRequest {
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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

fn naive_to_utc<T: Into<Option<DateTime<Utc>>>>(dt: T) -> DateTime<Utc> {
    match dt.into() {
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

#[derive(Debug, Clone, Deserialize)]
pub struct TodayOutputQuery {
    pub operator: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/work-reports/today/output",
    tag = "WorkReport",
    responses(
        (status = 200, description = "今日产量", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_today_production_output(
    State(state): State<AppState>,
    Query(query): Query<TodayOutputQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Mobile BFF 数据迁移已完成：改为查询 MES 自有表 work_reports。
    // Mobile 端通过 MesApi.create_work_report（由 TypedServiceClient<MesApi> 转发）
    // 直接写入 MES 表，无需跨 schema 查询 plugin_mobile。
    //
    // 字段映射（mobile 旧表 → MES 自有表）：
    //   operator        → reporter_name
    //   good_quantity   → output_quantity
    //
    // 跟踪: docs/roadmap/TODO.md "V62.x Mobile BFF 数据迁移" 章节
    let operator = match query.operator {
        Some(op) => op,
        None => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "operator 参数是必需的",
            ));
        }
    };

    let output: Option<BigDecimal> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(output_quantity), 0) FROM work_reports WHERE reporter_name = $1 AND created_at >= CURRENT_DATE",
    )
    .bind(&operator)
    .fetch_one(&state.pool)
    .await
    .ok();

    let output_i64: i64 = output
        .and_then(|v| v.to_string().parse::<f64>().ok())
        .map(|v| v.round() as i64)
        .unwrap_or(0);

    Json(ApiResponse::success(
        serde_json::json!({ "output": output_i64 }),
        "获取今日产量成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/work-reports",
    tag = "WorkOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("pagesize" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "生产报工列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
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
                r.try_get::<Option<DateTime<Utc>>, _>("approved_at")
                    .ok()
                    .flatten(),
            ),
            approval_remark: r
                .try_get::<Option<String>, _>("approval_remark")
                .ok()
                .flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
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
            "page_size": pagesize,
        }),
        "获取工报列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/work-reports/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    responses(
        (status = 200, description = "生产报工详情", body = ApiResponse<WorkReportResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
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
                status: r.status.map(|u| u.to_string()).unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at.map(|d| d.and_utc())),
                approval_remark: r.approval_remark,
                created_at: r.created_at.and_utc().to_rfc3339(),
                updated_at: r.updated_at.and_utc().to_rfc3339(),
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/work-reports",
    tag = "WorkOrder",
    request_body = CreateWorkReportRequest,
    responses(
        (status = 200, description = "生产报工创建成功", body = ApiResponse<WorkReportResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
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

    // 事务内设置 RLS 上下文（与 create_from_erp 一致）：确保 set_config 与 INSERT 同连接
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin tx for create_work_report: {}", e);
            return Json(ApiResponse::error(500, "创建工报失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(Uuid::nil().to_string())
        .execute(&mut *tx)
        .await
    {
        tracing::error!(
            "Failed to set nil RLS context for create_work_report: {}",
            e
        );
        return Json(ApiResponse::error(500, "创建工报失败"));
    }

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
    .fetch_one(&mut *tx)
    .await;

    match result {
        Ok(r) => {
            if let Err(e) = tx.commit().await {
                tracing::error!("Failed to commit tx for create_work_report: {}", e);
                return Json(ApiResponse::error(500, "创建工报失败"));
            }

            // 生产执行闭环：报工后异步回传 ERP 生产进度（服务间认证，失败不阻塞主流程）
            // 回传基于工单 ID（work_order_id）反查 ERP 销售订单，而非可选 order_id 字段
            let mes_order_id = r.work_order_id;
            let erp_client_opt = state.erp_client.clone();
            let pool = state.pool.clone();
            let output_qty = big_decimal_to_f64(r.output_quantity.clone());
            if let (Some(mes_order_id), Some(erp_client)) = (mes_order_id, erp_client_opt) {
                tokio::spawn(async move {
                    // RLS 连接级隔离：反查工单需在独立连接上绑定 nil 租户上下文
                    // （service token 无租户，未设置则受限 DB 用户下 RLS 拒绝该查询）
                    let mut conn = match pool.acquire().await {
                        Ok(c) => c,
                        Err(_) => return,
                    };
                    let _ = sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                        .bind(Uuid::nil().to_string())
                        .execute(&mut *conn)
                        .await;
                    let erp_order_id: Option<Uuid> = sqlx::query_scalar(
                        "SELECT source_order_id FROM production_orders WHERE id = $1",
                    )
                    .bind(mes_order_id)
                    .fetch_optional(&mut *conn)
                    .await
                    .ok()
                    .flatten();
                    if let Some(erp_order_id) = erp_order_id {
                        let payload = serde_json::json!({
                            "mes_order_id": mes_order_id,
                            "erp_order_id": erp_order_id,
                            "completed_quantity": output_qty,
                            "status": "in_progress",
                        });
                        match erp_client.sync_mes_progress(&payload).await {
                            Ok(resp) => {
                                tracing::info!("[MES→ERP] 生产进度回传成功: {}", resp);
                            }
                            Err(e) => {
                                tracing::error!(
                                    "[MES→ERP] 生产进度回传失败（异步降级，不影响报工）: {}",
                                    e
                                );
                            }
                        }
                    }
                });
            }
            Json(ApiResponse::success(
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
                    status: r.status.map(|u| u.to_string()).unwrap_or_default(),
                    approved_by: r.approved_by.map(|u| u.to_string()),
                    approved_at: opt_datetime_to_string(r.approved_at.map(|d| d.and_utc())),
                    approval_remark: r.approval_remark,
                    created_at: r.created_at.and_utc().to_rfc3339(),
                    updated_at: r.updated_at.and_utc().to_rfc3339(),
                },
                "创建工报成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to create work report: {}", e);
            Json(ApiResponse::error(500, "创建工报失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/work-reports/{id}",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    request_body = UpdateWorkReportRequest,
    responses(
        (status = 200, description = "报工更新成功", body = ApiResponse<WorkReportResponse>),
        (status = 404, description = "报工不存在"),
    ),
)]
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
                status: r.status.map(|u| u.to_string()).unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at.map(|d| d.and_utc())),
                approval_remark: r.approval_remark,
                created_at: r.created_at.and_utc().to_rfc3339(),
                updated_at: r.updated_at.and_utc().to_rfc3339(),
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:delete"])),
    path = "/api/mes/work-reports/{id}",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    responses(
        (status = 200, description = "报工删除成功"),
        (status = 404, description = "报工不存在"),
    ),
)]
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
        UPDATE work_reports SET deleted_at = NOW() WHERE id = $1
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/work-reports/{id}/approve",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    responses(
        (status = 200, description = "报工审批成功", body = ApiResponse<WorkReportResponse>),
        (status = 404, description = "报工不存在"),
    ),
)]
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
                status: r.status.map(|u| u.to_string()).unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at.map(|d| d.and_utc())),
                approval_remark: r.approval_remark,
                created_at: r.created_at.and_utc().to_rfc3339(),
                updated_at: r.updated_at.and_utc().to_rfc3339(),
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/work-reports/{id}/reject",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    request_body = RejectWorkReportRequest,
    responses(
        (status = 200, description = "报工驳回成功", body = ApiResponse<WorkReportResponse>),
        (status = 404, description = "报工不存在"),
    ),
)]
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
                status: r.status.map(|u| u.to_string()).unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at.map(|d| d.and_utc())),
                approval_remark: r.approval_remark,
                created_at: r.created_at.and_utc().to_rfc3339(),
                updated_at: r.updated_at.and_utc().to_rfc3339(),
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

// ==================== APV-2: 报工返工审批端点（骨架） ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ReworkApprovalStartRequest {
    pub reason: String,
    #[allow(dead_code)]
    pub target_status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ReworkApprovalDecisionRequest {
    pub approval_id: Uuid,
    pub comment: String,
    #[allow(dead_code)]
    pub expected_approval_version: i32,
}

/// 发起返工审批（rejected→reworking）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/work-reports/{id}/approval/start",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    request_body = ReworkApprovalStartRequest,
    responses(
        (status = 200, description = "返工审批发起成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn start_rework_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<ReworkApprovalStartRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesReworkApprove).await
    {
        return e;
    }
    // 校验当前 status=rejected，创建 approval 记录并写入 audit log
    let approver_id = match claims.user_id() {
        Ok(uid) => uid,
        Err(_) => return Json(ApiResponse::error(401, "无效的用户身份")),
    };
    let record_id = Uuid::parse_str(&id).unwrap_or_default();
    let approval_id = match create_approval_and_log(
        &state.pool,
        "work_report",
        record_id,
        "rejected",
        "reworking",
        approver_id,
    )
    .await
    {
        Ok(aid) => aid,
        Err(e) => {
            tracing::error!("发起返工审批失败: {}", e);
            return Json(ApiResponse::error(500, "发起审批失败"));
        }
    };
    Json(ApiResponse::success(
        build_start_response(approval_id),
        "返工审批已发起",
    ))
}

/// 返工审批通过
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/work-reports/{id}/approval/approve",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    request_body = ReworkApprovalDecisionRequest,
    responses(
        (status = 200, description = "返工审批通过成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn approve_rework(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<ReworkApprovalDecisionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesReworkApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，执行 rejected→reworking 转换并写入 audit log
    let record_id = Uuid::parse_str(&id).unwrap_or_default();
    if let Err(e) = execute_transition_and_log(
        &state.pool,
        Some("work_reports"),
        "work_report",
        record_id,
        req.approval_id,
        "rejected",
        "reworking",
    )
    .await
    {
        tracing::error!("返工审批通过失败: {}", e);
        return Json(ApiResponse::error(500, "审批通过失败"));
    }
    Json(ApiResponse::success(
        build_approve_response(req.approval_id),
        "返工审批通过成功",
    ))
}

/// 返工审批驳回
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/work-reports/{id}/approval/reject",
    tag = "WorkReport",
    params(
        ("id" = String, Path, description = "报工ID"),
    ),
    request_body = ReworkApprovalDecisionRequest,
    responses(
        (status = 200, description = "返工审批驳回成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn reject_rework(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<ReworkApprovalDecisionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesReworkApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，记录驳回并写入 audit log
    let record_id = Uuid::parse_str(&id).unwrap_or_default();
    if let Err(e) = reject_and_log(
        &state.pool,
        "work_report",
        record_id,
        req.approval_id,
        &req.comment,
    )
    .await
    {
        tracing::error!("返工审批驳回失败: {}", e);
        return Json(ApiResponse::error(500, "审批驳回失败"));
    }
    Json(ApiResponse::success(
        build_reject_response(req.approval_id),
        "返工审批驳回成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, Timelike};

    // ---- naive_to_utc ----
    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = NaiveDate::from_ymd_opt(2024, 5, 20)
            .unwrap()
            .and_hms_opt(8, 30, 15)
            .unwrap();
        let utc = naive_to_utc(Some(dt.and_utc()));
        assert_eq!(utc.year(), 2024);
        assert_eq!(utc.month(), 5);
        assert_eq!(utc.day(), 20);
        assert_eq!(utc.hour(), 8);
        assert_eq!(utc.minute(), 30);
        assert_eq!(utc.second(), 15);
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    // ---- datetime_to_string ----
    #[test]
    fn datetime_to_string_some_produces_rfc3339() {
        let dt = NaiveDate::from_ymd_opt(2024, 1, 2)
            .unwrap()
            .and_hms_opt(3, 4, 5)
            .unwrap();
        let s = datetime_to_string(Some(dt.and_utc()));
        assert!(s.starts_with("2024-01-02T03:04:05"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_returns_empty() {
        let s = datetime_to_string(None);
        assert!(s.is_empty(), "got {}", s);
    }

    // ---- opt_datetime_to_string ----
    #[test]
    fn opt_datetime_to_string_some_returns_some() {
        let dt = NaiveDate::from_ymd_opt(2024, 6, 15)
            .unwrap()
            .and_hms_opt(12, 0, 0)
            .unwrap();
        let r = opt_datetime_to_string(Some(dt.and_utc()));
        assert!(r.is_some());
        assert!(r.unwrap().starts_with("2024-06-15T12:00:00"));
    }

    #[test]
    fn opt_datetime_to_string_none_returns_none() {
        assert!(opt_datetime_to_string(None).is_none());
    }

    // ---- big_decimal_to_f64 ----
    #[test]
    fn big_decimal_to_f64_some_parses() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_integer() {
        let bd: BigDecimal = "42".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 42.0);
    }

    #[test]
    fn big_decimal_to_f64_none_defaults_zero() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }

    // ---- parse_report_date ----
    #[test]
    fn parse_report_date_valid() {
        let d = parse_report_date("2024-03-10").unwrap();
        assert_eq!(d.year(), 2024);
        assert_eq!(d.month(), 3);
        assert_eq!(d.day(), 10);
    }

    #[test]
    fn parse_report_date_leap_year() {
        assert!(parse_report_date("2024-02-29").is_ok());
    }

    #[test]
    fn parse_report_date_non_leap_year_rejected() {
        assert!(parse_report_date("2023-02-29").is_err());
    }

    #[test]
    fn parse_report_date_invalid_month() {
        assert!(parse_report_date("2024-13-01").is_err());
    }

    #[test]
    fn parse_report_date_empty_rejected() {
        assert!(parse_report_date("").is_err());
    }

    #[test]
    fn parse_report_date_bad_format() {
        assert!(parse_report_date("2024/03/10").is_err());
        assert!(parse_report_date("10-03-2024").is_err());
    }

    #[test]
    fn parse_report_date_single_digit_day() {
        let d = parse_report_date("2024-03-05").unwrap();
        assert_eq!(d.day(), 5);
    }

    // ---- generate_report_no ----
    #[test]
    fn generate_report_no_has_prefix() {
        assert!(generate_report_no().starts_with("WR"));
    }

    #[test]
    fn generate_report_no_length() {
        // "WR" + YYYYMMDDHHMMSS(14) = 16
        assert_eq!(generate_report_no().len(), 16);
    }

    #[test]
    fn generate_report_no_has_digits_only_after_prefix() {
        let no = generate_report_no();
        let digits = &no[2..];
        assert!(digits.chars().all(|c| c.is_ascii_digit()));
    }
}
