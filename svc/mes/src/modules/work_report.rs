use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use std::str::FromStr;
use topems_shared_core::error::TopemsError;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use utoipa::ToSchema;

use crate::modules::approval_common::{
    build_approve_response, build_reject_response, build_start_response,
    create_approval_and_log_db, execute_transition_and_log_db, reject_and_log_db,
};
use crate::modules::work_report_status::WorkReportStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_db::decimal::big_decimal_to_f64;
use topems_shared_event::event::{commit_retry, EventType, MesWorkReportSubmittedPayload};

use crate::AppState;
use topems_shared_core::response::ApiResponse;

/// 报工 RETURNING 列（与 work_reports 表字段对齐）
#[derive(Debug, sqlx::FromRow)]
struct WorkReportRow {
    id: Uuid,
    report_no: Option<String>,
    work_order_id: Option<Uuid>,
    work_order_no: Option<String>,
    order_id: Option<Uuid>,
    order_no: Option<String>,
    work_station_id: Option<Uuid>,
    work_station_name: Option<String>,
    reporter_name: Option<String>,
    report_date: Option<DateTime<Utc>>,
    shift: Option<String>,
    output_quantity: Option<BigDecimal>,
    defect_quantity: Option<BigDecimal>,
    labor_hours: Option<BigDecimal>,
    remark: Option<String>,
    status: Option<String>,
    approved_by: Option<String>,
    approved_at: Option<DateTime<Utc>>,
    approval_remark: Option<String>,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
}

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
    page_size: Option<i32>,
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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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

fn parse_report_date(s: &str) -> Result<NaiveDate, TopemsError> {
    s.parse::<chrono::NaiveDate>()
        .map_err(|e| TopemsError::ValidationFailed(format!("无效的 report_date: {}", e)))
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

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn get_today_production_output(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<TodayOutputQuery>,
) -> ApiResponse<serde_json::Value> {
    // Mobile BFF 数据迁移已完成：改为查询 MES 自有表 work_reports。
    // Mobile 端通过 MesApi.create_work_report（由 TypedServiceClient<MesApi> 转发）
    // 直接写入 MES 表，无需跨 schema 查询 plugin_mobile。
    //
    // 字段映射（mobile 旧表 → MES 自有表）：
    //   operator        → reporter_name
    //   good_quantity   → output_quantity
    //
    // 跟踪: docs/project/TODO.md "V62.x Mobile BFF 数据迁移" 章节
    let operator = match query.operator {
        Some(op) => op,
        None => {
            return ApiResponse::<serde_json::Value>::bad_request("operator 参数是必需的");
        }
    };

    // 今日产量按本租户汇总：跨租户按操作员姓名汇总会把他人产量计入本租户看板，
    // 属数据越界。此处用请求租户的只读作用域 + 显式 tenant_id 谓词。
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
            return ApiResponse::server_error("获取今日产量失败");
        }
    };

    let output: Option<BigDecimal> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(output_quantity), 0) FROM mes.work_reports \
         WHERE reporter_name = $1 AND created_at >= CURRENT_DATE \
           AND tenant_id = $2::uuid",
    )
    .bind(&operator)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    .ok();

    let output_i64: i64 = output
        .and_then(|v| v.to_string().parse::<f64>().ok())
        .map(|v| v.round() as i64)
        .unwrap_or(0);

    ApiResponse::success(
        serde_json::json!({ "output": output_i64 }),
        "获取今日产量成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/work-reports",
    tag = "WorkOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "生产报工列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn list_work_reports(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWorkReportsQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    // 租户作用域读：work_reports 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
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
            return ApiResponse::server_error("获取工报列表失败");
        }
    };

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(raw_status) = query.status.as_deref() {
        let raw_status = raw_status.trim();
        if !raw_status.is_empty() && !raw_status.eq_ignore_ascii_case("all") {
            let Some(status) = WorkReportStatus::from_db_str(raw_status) else {
                return ApiResponse::bad_request("无效的报工状态");
            };
            where_clause.push_str(" WHERE wr.status = $1");
            params.push(serde_json::Value::String(status.as_db_str().to_string()));
        }
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

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("wr.tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.work_reports wr{}",
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
            tracing::error!("Failed to count work reports: {}", e);
            return ApiResponse::server_error("获取工报列表失败");
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
        FROM mes.work_reports wr
        {}
        ORDER BY wr.created_at DESC
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

    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work reports: {}", e);
            return ApiResponse::server_error("获取工报列表失败");
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
                .unwrap_or_else(|| WorkReportStatus::DEFAULT.as_db_str().to_string()),
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
            "reports": reports,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": page_size,
        }),
        "获取工报列表成功",
    )
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkReportResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工报ID");
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
            return ApiResponse::server_error("获取工报失败");
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
        FROM mes.work_reports wr
        WHERE wr.id = $1
        "#,
        uuid,
    )
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(r) => ApiResponse::success(
            WorkReportResponse {
                id: r.id.to_string(),
                report_no: r.report_no.unwrap_or_default(),
                work_order_id: r.work_order_id.map(|u| u.to_string()),
                work_order_no: Some(r.work_order_no.unwrap_or_default()),
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: r.work_station_name,
                reporter_name: r.reporter_name.unwrap_or_default(),
                report_date: r.report_date.map(|d| d.to_string()).unwrap_or_default(),
                shift: r.shift,
                output_quantity: big_decimal_to_f64(r.output_quantity),
                defect_quantity: big_decimal_to_f64(r.defect_quantity),
                labor_hours: big_decimal_to_f64(r.labor_hours),
                remark: r.remark,
                status: r.status.unwrap_or_default(),
                approved_by: r.approved_by.map(|u| u.to_string()),
                approved_at: opt_datetime_to_string(r.approved_at),
                approval_remark: r.approval_remark,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            },
            "获取工报成功",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("工报不存在"),
        Err(e) => {
            tracing::error!("Failed to get work report: {}", e);
            ApiResponse::server_error("获取工报失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateWorkReportRequest>,
) -> ApiResponse<WorkReportResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
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

    let report_date = match parse_report_date(&body.report_date) {
        Ok(d) => d,
        Err(e) => {
            return ApiResponse::from(e);
        }
    };
    let report_date = DateTime::<Utc>::from_naive_utc_and_offset(
        chrono::NaiveDateTime::new(report_date, chrono::NaiveTime::MIN),
        Utc,
    );

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

    // 写作用域由 Db::scope() 统一设置 app.tenant_id / app.rls_system：
    // 改前这里对 nil 租户设置 GUC，却向真实租户 INSERT，fail-closed 策略下必然被
    // WITH CHECK 拒绝（0 行写入，接口 500）；现在 GUC 与插入行租户同源。
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
            return ApiResponse::server_error("创建工报失败");
        }
    };

    let result = sqlx::query_as::<_, WorkReportRow>(
        r#"
        INSERT INTO mes.work_reports (
            report_no, work_order_id, work_order_no, order_id, order_no,
            work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
    )
    .bind(report_no)
    .bind(work_order_id)
    .bind(body.work_order_no)
    .bind(order_id)
    .bind(body.order_no)
    .bind(work_station_id)
    .bind(body.work_station_name)
    .bind(body.reporter_name)
    .bind(report_date)
    .bind(body.shift)
    .bind(output_quantity)
    .bind(defect_quantity)
    .bind(labor_hours)
    .bind(body.remark)
    .bind(WorkReportStatus::DEFAULT.as_db_str())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(r) => {
            // 提交前在请求事务内反查 ERP 订单号：原先放在提交后的 spawn 里另开租户只读事务，
            // 既多占一条连接，也与请求上下文脱节；改为一并复用当前事务，spawn 内只发事件。
            let erp_order_id: Option<Uuid> = match r.work_order_id {
                Some(mes_order_id) => sqlx::query_scalar::<_, Option<Uuid>>(
                    "SELECT source_order_id FROM mes.production_orders WHERE id = $1",
                )
                .bind(mes_order_id)
                .fetch_optional(&mut scope)
                .await
                .ok()
                .flatten()
                .flatten(),
                None => None,
            };

            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tx for create_work_report: {}", e);
                return ApiResponse::server_error("创建工报失败");
            }

            // D2 U2 环2（决策 A）：mes→erp 报工进度回传由同步 HTTP（erp_client.sync_mes_progress）
            // 改为发布 `MesWorkReportSubmitted` 事件，erp 订阅更新生产订单进度。
            // 幂等键 = work_report_id；DLQ 兜底由 erp 订阅器统一提供，不阻塞报工主流程。
            // erp_order_id 仍由工单 ID（work_order_id）反查本地 source_order_id 得到。
            let mes_order_id = r.work_order_id;
            let report_tenant_id = tenant_id;
            let output_qty = big_decimal_to_f64(r.output_quantity.clone());
            let work_report_id = r.id;
            let report_no = r.report_no.clone();
            if let (Some(mes_order_id), Some(publisher)) =
                (mes_order_id, state.event_publisher.clone())
            {
                tokio::spawn(async move {
                    let payload = MesWorkReportSubmittedPayload {
                        work_report_id,
                        report_no,
                        mes_order_id: Some(mes_order_id),
                        erp_order_id,
                        completed_quantity: Some(output_qty),
                        status: Some("in_progress".to_string()),
                        reported_at: Some(Utc::now()),
                        tenant_id: Some(report_tenant_id),
                    };
                    let et = EventType::MesWorkReportSubmitted;
                    match publisher.publish_event(et, &payload).await {
                        Ok(_) => tracing::info!(
                            "[MES→ERP] 报工进度回传事件发布成功 - work_report_id={}, erp_order_id={:?}",
                            work_report_id, erp_order_id
                        ),
                        Err(e) => {
                            tracing::error!(
                                "[MES→ERP] MesWorkReportSubmitted 事件发布失败: {}，入重试队列",
                                e
                            );
                            commit_retry::push_retry_typed("mes", et, &payload).await;
                        }
                    }
                });
            }
            ApiResponse::success(
                WorkReportResponse {
                    id: r.id.to_string(),
                    report_no: r.report_no.unwrap_or_default(),
                    work_order_id: r.work_order_id.map(|u| u.to_string()),
                    work_order_no: Some(r.work_order_no.unwrap_or_default()),
                    order_id: r.order_id.map(|u| u.to_string()),
                    order_no: r.order_no,
                    work_station_id: r.work_station_id.map(|u| u.to_string()),
                    work_station_name: r.work_station_name,
                    reporter_name: r.reporter_name.unwrap_or_default(),
                    report_date: r.report_date.map(|d| d.to_string()).unwrap_or_default(),
                    shift: r.shift,
                    output_quantity: big_decimal_to_f64(r.output_quantity),
                    defect_quantity: big_decimal_to_f64(r.defect_quantity),
                    labor_hours: big_decimal_to_f64(r.labor_hours),
                    remark: r.remark,
                    status: r.status.unwrap_or_default(),
                    approved_by: r.approved_by.map(|u| u.to_string()),
                    approved_at: opt_datetime_to_string(r.approved_at),
                    approval_remark: r.approval_remark,
                    created_at: naive_to_utc(r.created_at),
                    updated_at: naive_to_utc(r.updated_at),
                },
                "创建工报成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to create work report: {}", e);
            ApiResponse::server_error("创建工报失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateWorkReportRequest>,
) -> ApiResponse<WorkReportResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工报ID");
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
            Ok(d) => Some(DateTime::<Utc>::from_naive_utc_and_offset(
                chrono::NaiveDateTime::new(d, chrono::NaiveTime::MIN),
                Utc,
            )),
            Err(e) => return ApiResponse::from(e),
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
            return ApiResponse::server_error("更新工报失败");
        }
    };

    let current_raw = match sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT status FROM mes.work_reports
           WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(raw)) => raw.unwrap_or_else(|| WorkReportStatus::DEFAULT.as_db_str().to_string()),
        Ok(None) => return ApiResponse::not_found("工报不存在或已删除"),
        Err(e) => {
            tracing::error!("读取工报当前态失败: {}", e);
            return ApiResponse::server_error("更新工报失败");
        }
    };
    let current = match WorkReportStatus::from_db_str(&current_raw) {
        Some(v) => v,
        None => return ApiResponse::conflict("工报当前状态非法"),
    };
    if !WorkReportStatus::editable_from().contains(&current.as_db_str()) {
        return ApiResponse::conflict("当前状态不可编辑");
    }

    let status = match body.status.as_deref() {
        None => None,
        Some(raw) if raw.trim().is_empty() => None,
        Some(raw) => match WorkReportStatus::from_db_str(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的报工状态"),
        },
    };
    if let Some(target) = status {
        if !current.can_transition_to(target) {
            return ApiResponse::conflict("当前状态不允许迁移到目标状态");
        }
    }
    let result = sqlx::query_as::<_, WorkReportRow>(
        r#"
        UPDATE mes.work_reports
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
          AND tenant_id = $16::uuid
          AND COALESCE(status, 'submitted') = $17
          AND deleted_at IS NULL
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
    )
    .bind(work_order_id)
    .bind(body.work_order_no)
    .bind(order_id)
    .bind(body.order_no)
    .bind(work_station_id)
    .bind(body.work_station_name)
    .bind(body.reporter_name)
    .bind(report_date)
    .bind(body.shift)
    .bind(output_quantity)
    .bind(defect_quantity)
    .bind(labor_hours)
    .bind(body.remark)
    .bind(status.map(WorkReportStatus::as_db_str))
    .bind(uuid)
    .bind(tenant_id)
    .bind(&current_raw)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工报事务失败: {}", e);
                return ApiResponse::server_error("更新工报失败");
            }
            ApiResponse::success(
                WorkReportResponse {
                    id: r.id.to_string(),
                    report_no: r.report_no.unwrap_or_default(),
                    work_order_id: r.work_order_id.map(|u| u.to_string()),
                    work_order_no: Some(r.work_order_no.unwrap_or_default()),
                    order_id: r.order_id.map(|u| u.to_string()),
                    order_no: r.order_no,
                    work_station_id: r.work_station_id.map(|u| u.to_string()),
                    work_station_name: r.work_station_name,
                    reporter_name: r.reporter_name.unwrap_or_default(),
                    report_date: r.report_date.map(|d| d.to_string()).unwrap_or_default(),
                    shift: r.shift,
                    output_quantity: big_decimal_to_f64(r.output_quantity),
                    defect_quantity: big_decimal_to_f64(r.defect_quantity),
                    labor_hours: big_decimal_to_f64(r.labor_hours),
                    remark: r.remark,
                    status: r.status.unwrap_or_default(),
                    approved_by: r.approved_by.map(|u| u.to_string()),
                    approved_at: opt_datetime_to_string(r.approved_at),
                    approval_remark: r.approval_remark,
                    created_at: naive_to_utc(r.created_at),
                    updated_at: naive_to_utc(r.updated_at),
                },
                "更新工报成功",
            )
        }
        Ok(None) => ApiResponse::conflict("工报已被并发修改或删除"),
        Err(e) => {
            tracing::error!("Failed to update work report: {}", e);
            ApiResponse::server_error("更新工报失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工报ID");
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
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除工报失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.work_reports SET deleted_at = NOW() WHERE id = $1
          AND tenant_id = $2::uuid
          AND COALESCE(status, 'submitted') = ANY($3)
          AND deleted_at IS NULL
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .bind(WorkReportStatus::deletable_from().to_vec())
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("工报不存在、已删除或当前状态不可删除")
        }
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工报事务失败: {}", e);
                return ApiResponse::server_error("删除工报失败");
            }
            ApiResponse::success(id, "删除工报成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete work report: {}", e);
            ApiResponse::server_error("删除工报失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<WorkReportResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工报ID");
        }
    };

    let approver = claims.user_id().ok();

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
            return ApiResponse::server_error("审批通过失败");
        }
    };

    let result = sqlx::query_as::<_, WorkReportRow>(
        r#"
        UPDATE mes.work_reports
        SET
            status = $4,
            approved_by = $1::uuid,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
          AND tenant_id = $3::uuid
          AND COALESCE(status, 'submitted') = 'submitted'
          AND deleted_at IS NULL
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
    )
    .bind(approver)
    .bind(uuid)
    .bind(tenant_id)
    .bind(WorkReportStatus::Approved.as_db_str())
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工报事务失败: {}", e);
                return ApiResponse::server_error("审批通过失败");
            }
            ApiResponse::success(
                WorkReportResponse {
                    id: r.id.to_string(),
                    report_no: r.report_no.unwrap_or_default(),
                    work_order_id: r.work_order_id.map(|u| u.to_string()),
                    work_order_no: Some(r.work_order_no.unwrap_or_default()),
                    order_id: r.order_id.map(|u| u.to_string()),
                    order_no: r.order_no,
                    work_station_id: r.work_station_id.map(|u| u.to_string()),
                    work_station_name: r.work_station_name,
                    reporter_name: r.reporter_name.unwrap_or_default(),
                    report_date: r.report_date.map(|d| d.to_string()).unwrap_or_default(),
                    shift: r.shift,
                    output_quantity: big_decimal_to_f64(r.output_quantity),
                    defect_quantity: big_decimal_to_f64(r.defect_quantity),
                    labor_hours: big_decimal_to_f64(r.labor_hours),
                    remark: r.remark,
                    status: r.status.unwrap_or_default(),
                    approved_by: r.approved_by.map(|u| u.to_string()),
                    approved_at: opt_datetime_to_string(r.approved_at),
                    approval_remark: r.approval_remark,
                    created_at: naive_to_utc(r.created_at),
                    updated_at: naive_to_utc(r.updated_at),
                },
                "审批通过成功",
            )
        }
        Ok(None) => ApiResponse::conflict("工报不存在、已删除或非待审批状态"),
        Err(e) => {
            tracing::error!("Failed to approve work report: {}", e);
            ApiResponse::server_error("审批通过失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<RejectWorkReportRequest>,
) -> ApiResponse<WorkReportResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工报ID");
        }
    };

    let approver = claims.user_id().ok();
    let remark = body.remark.unwrap_or_default();

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
            return ApiResponse::server_error("审批驳回失败");
        }
    };

    let result = sqlx::query_as::<_, WorkReportRow>(
        r#"
        UPDATE mes.work_reports
        SET
            status = $5,
            approved_by = $1::uuid,
            approval_remark = $2,
            updated_at = NOW()
        WHERE id = $3
          AND tenant_id = $4::uuid
          AND COALESCE(status, 'submitted') = 'submitted'
          AND deleted_at IS NULL
        RETURNING
            id, report_no, work_order_id, work_order_no,
            order_id, order_no, work_station_id, work_station_name,
            reporter_name, report_date, shift,
            output_quantity, defect_quantity, labor_hours, remark,
            status, approved_by, approved_at, approval_remark,
            created_at, updated_at
        "#,
    )
    .bind(approver)
    .bind(remark)
    .bind(uuid)
    .bind(tenant_id)
    .bind(WorkReportStatus::Rejected.as_db_str())
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工报事务失败: {}", e);
                return ApiResponse::server_error("审批驳回失败");
            }
            ApiResponse::success(
                WorkReportResponse {
                    id: r.id.to_string(),
                    report_no: r.report_no.unwrap_or_default(),
                    work_order_id: r.work_order_id.map(|u| u.to_string()),
                    work_order_no: Some(r.work_order_no.unwrap_or_default()),
                    order_id: r.order_id.map(|u| u.to_string()),
                    order_no: r.order_no,
                    work_station_id: r.work_station_id.map(|u| u.to_string()),
                    work_station_name: r.work_station_name,
                    reporter_name: r.reporter_name.unwrap_or_default(),
                    report_date: r.report_date.map(|d| d.to_string()).unwrap_or_default(),
                    shift: r.shift,
                    output_quantity: big_decimal_to_f64(r.output_quantity),
                    defect_quantity: big_decimal_to_f64(r.defect_quantity),
                    labor_hours: big_decimal_to_f64(r.labor_hours),
                    remark: r.remark,
                    status: r.status.unwrap_or_default(),
                    approved_by: r.approved_by.map(|u| u.to_string()),
                    approved_at: opt_datetime_to_string(r.approved_at),
                    approval_remark: r.approval_remark,
                    created_at: naive_to_utc(r.created_at),
                    updated_at: naive_to_utc(r.updated_at),
                },
                "审批驳回成功",
            )
        }
        Ok(None) => ApiResponse::conflict("工报不存在、已删除或非待审批状态"),
        Err(e) => {
            tracing::error!("Failed to reject work report: {}", e);
            ApiResponse::server_error("审批驳回失败")
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
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesReworkApprove).await
    {
        return e;
    }
    // 校验当前 status=rejected，创建 approval 记录并写入 audit log
    let approver_id = match claims.user_id() {
        Ok(uid) => uid,
        Err(_) => return ApiResponse::unauthorized("无效的用户身份"),
    };
    let record_id = Uuid::parse_str(&id).unwrap_or_default();
    let approval_id = match create_approval_and_log_db(
        &state.db,
        "work_report",
        record_id,
        WorkReportStatus::Rejected.as_db_str(),
        WorkReportStatus::Reworking.as_db_str(),
        approver_id,
    )
    .await
    {
        Ok(aid) => aid,
        Err(e) => {
            tracing::error!("发起返工审批失败: {}", e);
            return ApiResponse::server_error("发起审批失败");
        }
    };
    ApiResponse::success(build_start_response(approval_id), "返工审批已发起")
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
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesReworkApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，执行 rejected→reworking 转换并写入 audit log
    let record_id = Uuid::parse_str(&id).unwrap_or_default();
    if let Err(e) = execute_transition_and_log_db(
        &state.db,
        Some("work_reports"),
        "work_report",
        record_id,
        req.approval_id,
        WorkReportStatus::Rejected.as_db_str(),
        WorkReportStatus::Reworking.as_db_str(),
    )
    .await
    {
        tracing::error!("返工审批通过失败: {}", e);
        return ApiResponse::server_error("审批通过失败");
    }
    ApiResponse::success(build_approve_response(req.approval_id), "返工审批通过成功")
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
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesReworkApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，记录驳回并写入 audit log
    let record_id = Uuid::parse_str(&id).unwrap_or_default();
    if let Err(e) = reject_and_log_db(
        &state.db,
        "work_report",
        record_id,
        req.approval_id,
        &req.comment,
    )
    .await
    {
        tracing::error!("返工审批驳回失败: {}", e);
        return ApiResponse::server_error("审批驳回失败");
    }
    ApiResponse::success(build_reject_response(req.approval_id), "返工审批驳回成功")
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::{Datelike, TimeZone, Timelike};

    // ---- naive_to_utc ----
    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 5, 20, 8, 30, 15).unwrap();
        let utc = naive_to_utc(Some(dt));
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
        let dt = Utc.with_ymd_and_hms(2024, 1, 2, 3, 4, 5).unwrap();
        let s = datetime_to_string(Some(dt));
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
        let dt = Utc.with_ymd_and_hms(2024, 6, 15, 12, 0, 0).unwrap();
        let r = opt_datetime_to_string(Some(dt));
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
