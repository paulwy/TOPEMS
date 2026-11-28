//! SPC (Statistical Process Control) handlers

use crate::models::spc::*;
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use bigdecimal::ToPrimitive;
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::decimal::big_decimal_to_f64_non_opt;

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
fn std_dev(values: &[f64], avg: f64) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let variance =
        values.iter().map(|x| (x - avg).powi(2)).sum::<f64>() / (values.len() - 1) as f64;
    variance.sqrt()
}

fn range(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
    max - min
}

fn d2_factor(n: i64) -> f64 {
    match n {
        2 => 1.128,
        3 => 1.693,
        4 => 2.059,
        5 => 2.326,
        6 => 2.534,
        7 => 2.704,
        8 => 2.847,
        9 => 2.970,
        10 => 3.078,
        _ => 1.128,
    }
}

fn a2_factor(n: i64) -> f64 {
    match n {
        2 => 1.880,
        3 => 1.023,
        4 => 0.729,
        5 => 0.577,
        6 => 0.483,
        7 => 0.419,
        8 => 0.373,
        9 => 0.337,
        10 => 0.308,
        _ => 1.880,
    }
}

fn d3_factor(n: i64) -> f64 {
    match n {
        2 => 0.0,
        3 => 0.0,
        4 => 0.0,
        5 => 0.0,
        6 => 0.0,
        7 => 0.076,
        8 => 0.136,
        9 => 0.184,
        10 => 0.223,
        _ => 0.0,
    }
}

fn d4_factor(n: i64) -> f64 {
    match n {
        2 => 3.267,
        3 => 2.574,
        4 => 2.282,
        5 => 2.114,
        6 => 2.004,
        7 => 1.924,
        8 => 1.864,
        9 => 1.816,
        10 => 1.777,
        _ => 3.267,
    }
}

fn detect_trend(values: &[f64]) -> Option<String> {
    if values.len() < 7 {
        return None;
    }

    let recent = &values[values.len().saturating_sub(7)..];

    let mut increasing = true;
    let mut decreasing = true;

    for i in 1..recent.len() {
        if recent[i] <= recent[i - 1] {
            increasing = false;
        }
        if recent[i] >= recent[i - 1] {
            decreasing = false;
        }
    }

    if increasing {
        Some("uptrend".to_string())
    } else if decreasing {
        Some("downtrend".to_string())
    } else {
        None
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:spc:read"])),
    path = "/spc/charts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn list_spc_charts(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<SpcChartQuery>,
) -> ApiResponse<Vec<SpcChart>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取SPC控制图列表失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let charts = match (query.chart_type.as_ref(), query.product_id.as_ref()) {
        (Some(ct), Some(pid)) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND chart_type = $1 AND product_id::TEXT = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(ct).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(ct), None) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND chart_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(ct).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(pid)) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND product_id::TEXT = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match charts {
        Ok(data) => ApiResponse::success(data, "获取SPC控制图列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch SPC charts: {}", e);
            ApiResponse::server_error("获取SPC控制图列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:spc:write"])),
    path = "/spc/charts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn create_spc_chart(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSpcChartRequest>,
) -> ApiResponse<SpcChart> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let chart_no = format!(
        "SPC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    // TODO(w-b6b): product_id 属跨域主数据（pdm/mdm），当前未校验属主。
    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启SPC控制图创建事务失败: {}", e);
            return ApiResponse::server_error("SPC控制图创建失败");
        }
    };

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_spc_charts (tenant_id, chart_no, chart_type, product_id, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, COALESCE($19, 'active'), $20) RETURNING id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at"#)).bind(tenant_id).bind(chart_no).bind(req.chart_type).bind(product_id).bind(req.product_name).bind(req.parameter_name).bind(req.chart_name).bind(req.process_name).bind(req.unit).bind(req.usl).bind(req.lsl).bind(req.target).bind(req.sample_size).bind(req.sampling_frequency).bind(req.description).bind(req.ucl).bind(req.cl).bind(req.lcl).bind(req.status).bind(req.created_by)
    .fetch_one(&mut scope)
    .await;

    match chart {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交SPC控制图创建事务失败: {}", e);
                return ApiResponse::server_error("SPC控制图创建失败");
            }
            ApiResponse::success(data, "SPC控制图创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create SPC chart: {}", e);
            ApiResponse::server_error("SPC控制图创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:spc:read"])),
    path = "/spc/charts/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn get_spc_chart(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<SpcChart> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取SPC控制图失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND id = $1"#)).bind(id)
    .fetch_one(&mut scope)
    .await;

    match chart {
        Ok(data) => ApiResponse::success(data, "获取SPC控制图成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch SPC chart: {}", e);
            ApiResponse::server_error("获取SPC控制图失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:spc:write"])),
    path = "/spc/charts/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn update_spc_chart(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateSpcChartRequest>,
) -> ApiResponse<SpcChart> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启SPC控制图更新事务失败: {}", e);
            return ApiResponse::server_error("SPC控制图更新失败");
        }
    };

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"UPDATE qms.qa_spc_charts SET chart_type = COALESCE($2, chart_type), parameter_name = COALESCE($3, parameter_name), chart_name = COALESCE($4, chart_name), process_name = COALESCE($5, process_name), unit = COALESCE($6, unit), usl = COALESCE($7, usl), lsl = COALESCE($8, lsl), target = COALESCE($9, target), sample_size = COALESCE($10, sample_size), sampling_frequency = COALESCE($11, sampling_frequency), description = COALESCE($12, description), ucl = COALESCE($13, ucl), cl = COALESCE($14, cl), lcl = COALESCE($15, lcl), status = COALESCE($16, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $17 RETURNING id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at"#)).bind(id).bind(req.chart_type).bind(req.parameter_name).bind(req.chart_name).bind(req.process_name).bind(req.unit).bind(req.usl).bind(req.lsl).bind(req.target).bind(req.sample_size).bind(req.sampling_frequency).bind(req.description).bind(req.ucl).bind(req.cl).bind(req.lcl).bind(req.status).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match chart {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交SPC控制图更新事务失败: {}", e);
                return ApiResponse::server_error("SPC控制图更新失败");
            }
            ApiResponse::success(data, "SPC控制图更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update SPC chart: {}", e);
            ApiResponse::server_error("SPC控制图更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:spc:write"])),
    path = "/spc/charts/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn delete_spc_chart(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启SPC控制图删除事务失败: {}", e);
            return ApiResponse::server_error("SPC控制图删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_spc_charts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("SPC控制图不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交SPC控制图删除事务失败: {}", e);
                return ApiResponse::server_error("SPC控制图删除失败");
            }
            ApiResponse::success(true, "SPC控制图删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete SPC chart: {}", e);
            ApiResponse::server_error("SPC控制图删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:spc:read"])),
    path = "/spc/data-points",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn get_spc_data_points(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<SpcDataQuery>,
) -> ApiResponse<Vec<SpcDataPoint>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取SPC数据点失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let chart_id = match Uuid::parse_str(&query.chart_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };

    let limit = query.limit.unwrap_or(100);

    let points = sqlx::query_as::<_, SpcDataPoint>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_id::TEXT, sample_no, value, subgroup_size, is_out_of_control, trend_flag, mean, range, operator, remark, measured_at, created_at FROM qms.qa_spc_data_points WHERE chart_id::TEXT = $1 ORDER BY sample_no DESC LIMIT $2"#)).bind(chart_id.to_string()).bind(limit)
    .fetch_all(&mut scope)
    .await;

    match points {
        Ok(mut data) => {
            data.reverse();
            ApiResponse::success(data, "获取SPC数据点成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch SPC data points: {}", e);
            ApiResponse::server_error("获取SPC数据点失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:spc:write"])),
    path = "/spc/data-points",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
pub async fn add_spc_data_point(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSpcDataRequest>,
) -> ApiResponse<SpcDataPoint> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let chart_id = match Uuid::parse_str(&req.chart_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启SPC数据点创建事务失败: {}", e);
            return ApiResponse::server_error("SPC数据点添加失败");
        }
    };

    // 同域引用校验：控制图必须存在且同租户，禁止跨租户挂靠。
    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#)).bind(chart_id).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let chart = match chart {
        Ok(c) => c,
        Err(sqlx::Error::RowNotFound) => {
            return ApiResponse::bad_request("SPC控制图不存在或不属于当前租户")
        }
        Err(e) => {
            tracing::error!("Failed to find SPC chart: {}", e);
            return ApiResponse::server_error("SPC数据点添加失败");
        }
    };

    let ucl = chart
        .ucl
        .as_ref()
        .and_then(|v| v.to_f64())
        .unwrap_or(f64::INFINITY);
    let lcl = chart
        .lcl
        .as_ref()
        .and_then(|v| v.to_f64())
        .unwrap_or(f64::NEG_INFINITY);
    let value_f64 = big_decimal_to_f64_non_opt(req.value.clone());
    let is_out_of_control = Some(value_f64 > ucl || value_f64 < lcl);

    let measured_at = req
        .sample_time
        .as_ref()
        .or(req.measured_at.as_ref())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc));

    let point = sqlx::query_as::<_, SpcDataPoint>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_spc_data_points (tenant_id, chart_id, sample_no, value, subgroup_size, is_out_of_control, mean, range, operator, remark, measured_at) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id::TEXT, tenant_id, chart_id::TEXT, sample_no, value, subgroup_size, is_out_of_control, trend_flag, mean, range, operator, remark, measured_at, created_at"#)).bind(tenant_id).bind(chart_id).bind(req.sample_no).bind(req.value).bind(req.subgroup_size).bind(is_out_of_control).bind(req.mean).bind(req.range).bind(req.operator).bind(req.remark).bind(measured_at)
    .fetch_one(&mut scope)
    .await;

    match point {
        Ok(data) => {
            // 子表计数与数据点同事务，失败整体回滚。
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_spc_charts SET sample_count = COALESCE(sample_count, 0) + 1, updated_at = NOW() WHERE id = $1 AND tenant_id = $2"#))
                .bind(chart_id)
                .bind(tenant_id)
                .execute(&mut scope)
                .await
            {
                tracing::error!("更新SPC控制图计数失败，整体回滚: {}", e);
                return ApiResponse::server_error("SPC数据点添加失败");
            }
            if let Err(e) = scope.commit().await {
                tracing::error!("提交SPC数据点事务失败: {}", e);
                return ApiResponse::server_error("SPC数据点添加失败");
            }
            ApiResponse::success(data, "SPC数据点添加成功")
        }
        Err(e) => {
            tracing::error!("Failed to add SPC data point: {}", e);
            ApiResponse::server_error("SPC数据点添加失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:spc:write"])),
    path = "/spc/calculate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "spc"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss
)]
pub async fn calculate_control_limits(
    State(_state): State<crate::AppState>,
    Json(req): Json<CalculateControlLimitRequest>,
) -> ApiResponse<ControlLimitResult> {
    let values = &req.values;
    let subgroup_size = req.subgroup_size.unwrap_or(5);

    if values.is_empty() {
        return ApiResponse::bad_request("数据点不能为空");
    }

    let (ucl, cl, lcl, cp, cpk, pp, ppk) = match req.chart_type.as_str() {
        "x_bar_r" => {
            let x_bar = mean(values);
            let avg = x_bar;
            let r_bar = if subgroup_size > 1 {
                let num_subgroups = (values.len() as i64 / subgroup_size).max(1) as usize;
                let mut ranges = Vec::new();
                for i in 0..num_subgroups {
                    let start = i * subgroup_size as usize;
                    let end = (start + subgroup_size as usize).min(values.len());
                    if end > start {
                        ranges.push(range(&values[start..end]));
                    }
                }
                mean(&ranges)
            } else {
                range(values)
            };

            let a2 = a2_factor(subgroup_size);
            let d3 = d3_factor(subgroup_size);
            let d4 = d4_factor(subgroup_size);

            let x_ucl = x_bar + a2 * r_bar;
            let x_lcl = x_bar - a2 * r_bar;
            let _r_ucl = d4 * r_bar;
            let _r_lcl = d3 * r_bar;

            let sigma_within = r_bar / d2_factor(subgroup_size);
            let sigma_overall = std_dev(values, x_bar);

            let (cp_val, cpk_val) = if let (Some(usl), Some(lsl)) = (req.usl, req.lsl) {
                let cp = (usl - lsl) / (6.0 * sigma_within);
                let cpk_upper = (usl - x_bar) / (3.0 * sigma_within);
                let cpk_lower = (x_bar - lsl) / (3.0 * sigma_within);
                let cpk = cpk_upper.min(cpk_lower);
                (Some(cp), Some(cpk))
            } else {
                (None, None)
            };

            let (pp_val, ppk_val) = if let (Some(usl), Some(lsl)) = (req.usl, req.lsl) {
                let pp = (usl - lsl) / (6.0 * sigma_overall);
                let ppk_upper = (usl - x_bar) / (3.0 * sigma_overall);
                let ppk_lower = (x_bar - lsl) / (3.0 * sigma_overall);
                let ppk = ppk_upper.min(ppk_lower);
                (Some(pp), Some(ppk))
            } else {
                (None, None)
            };

            (x_ucl, avg, x_lcl, cp_val, cpk_val, pp_val, ppk_val)
        }
        "x_bar_s" => {
            let x_bar = mean(values);
            let s_bar = if subgroup_size > 1 {
                let num_subgroups = (values.len() as i64 / subgroup_size).max(1) as usize;
                let mut stds = Vec::new();
                for i in 0..num_subgroups {
                    let start = i * subgroup_size as usize;
                    let end = (start + subgroup_size as usize).min(values.len());
                    if end > start {
                        let sub = &values[start..end];
                        let sub_mean = mean(sub);
                        stds.push(std_dev(sub, sub_mean));
                    }
                }
                mean(&stds)
            } else {
                std_dev(values, x_bar)
            };

            let a3 = 3.0 / (d2_factor(subgroup_size) * (subgroup_size as f64).sqrt());
            let x_ucl = x_bar + a3 * s_bar;
            let x_lcl = x_bar - a3 * s_bar;

            let sigma_within = s_bar * (subgroup_size as f64).sqrt() / d2_factor(subgroup_size);
            let sigma_overall = std_dev(values, x_bar);

            let (cp_val, cpk_val) = if let (Some(usl), Some(lsl)) = (req.usl, req.lsl) {
                let cp = (usl - lsl) / (6.0 * sigma_within);
                let cpk_upper = (usl - x_bar) / (3.0 * sigma_within);
                let cpk_lower = (x_bar - lsl) / (3.0 * sigma_within);
                let cpk = cpk_upper.min(cpk_lower);
                (Some(cp), Some(cpk))
            } else {
                (None, None)
            };

            let (pp_val, ppk_val) = if let (Some(usl), Some(lsl)) = (req.usl, req.lsl) {
                let pp = (usl - lsl) / (6.0 * sigma_overall);
                let ppk_upper = (usl - x_bar) / (3.0 * sigma_overall);
                let ppk_lower = (x_bar - lsl) / (3.0 * sigma_overall);
                let ppk = ppk_upper.min(ppk_lower);
                (Some(pp), Some(ppk))
            } else {
                (None, None)
            };

            (x_ucl, x_bar, x_lcl, cp_val, cpk_val, pp_val, ppk_val)
        }
        "p" => {
            let p_bar = mean(values);
            let n = subgroup_size as f64;
            let sigma_p = ((p_bar * (1.0 - p_bar)) / n).sqrt();
            let p_ucl = p_bar + 3.0 * sigma_p;
            let p_lcl = (p_bar - 3.0 * sigma_p).max(0.0);
            (p_ucl, p_bar, p_lcl, None, None, None, None)
        }
        "c" => {
            let c_bar = mean(values);
            let sigma_c = c_bar.sqrt();
            let c_ucl = c_bar + 3.0 * sigma_c;
            let c_lcl = (c_bar - 3.0 * sigma_c).max(0.0);
            (c_ucl, c_bar, c_lcl, None, None, None, None)
        }
        _ => {
            let avg = mean(values);
            let sd = std_dev(values, avg);
            (avg + 3.0 * sd, avg, avg - 3.0 * sd, None, None, None, None)
        }
    };

    let trend = detect_trend(values);

    let mut out_of_control_count = 0;
    let data_points: Vec<CalculatedDataPoint> = values
        .iter()
        .enumerate()
        .map(|(i, &val)| {
            let ooc = val > ucl || val < lcl;
            if ooc {
                out_of_control_count += 1;
            }
            let trend_flag = if i == values.len() - 1 {
                trend.clone()
            } else {
                None
            };
            CalculatedDataPoint {
                sample_no: (i + 1) as i32,
                value: val,
                subgroup_size: Some(subgroup_size as i32),
                is_out_of_control: Some(ooc),
                trend_flag,
            }
        })
        .collect();

    let result = ControlLimitResult {
        ucl,
        cl,
        lcl,
        cp,
        cpk,
        pp,
        ppk,
        out_of_control_count,
        data_points,
    };

    ApiResponse::success(result, "控制限计算成功")
}

/// GET /spc/charts/{id}/data-points —— 按控制图 chart 作用域查询数据点（前端契约形状 data_points）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:spc:read"])),
    path = "/spc/charts/{id}/data-points",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/spc"
)]
pub async fn get_spc_chart_data_points(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取SPC数据点失败");
        }
    };
    let _ = get_tenant_id(&claims, &headers);
    let chart_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };
    let points = sqlx::query_as::<_, SpcDataPoint>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_id::TEXT, sample_no, value, subgroup_size, is_out_of_control, trend_flag, mean, range, operator, remark, measured_at, created_at FROM qms.qa_spc_data_points WHERE chart_id::TEXT = $1 ORDER BY sample_no ASC"#))
        .bind(chart_id.to_string())
        .fetch_all(&mut scope)
        .await;
    match points {
        Ok(data) => ApiResponse::success(
            serde_json::json!({ "data_points": data }),
            "获取SPC数据点成功",
        ),
        Err(e) => {
            tracing::error!("Failed to fetch chart data points: {}", e);
            ApiResponse::server_error("获取SPC数据点失败")
        }
    }
}

/// POST /spc/charts/{id}/calculate —— 返回指定控制图的当前控制限
/// 注：基于图内历史数据点的完整重算待上游支持，这里先回读已存储的控制限（ucl/cl/lcl/cp/cpk）。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:spc:write"])),
    path = "/spc/charts/{id}/calculate",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/spc"
)]
pub async fn calculate_spc_chart_limits(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    _body: Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let chart_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的控制图ID"),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 控制限读取作用域创建失败: {}", e);
            return ApiResponse::server_error("控制限计算失败");
        }
    };
    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, chart_name, process_name, unit, usl, lsl, target, sample_size, sampling_frequency, description, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND id::TEXT = $1"#)).bind(chart_id.to_string()).fetch_one(&mut scope).await;
    match chart {
        Ok(c) => {
            let f = |v: Option<&bigdecimal::BigDecimal>| v.and_then(|x| x.to_f64()).unwrap_or(0.0);
            ApiResponse::success(
                serde_json::json!({
                    "ucl": f(c.ucl.as_ref()),
                    "cl": f(c.cl.as_ref()),
                    "lcl": f(c.lcl.as_ref()),
                    "cp": f(c.cp.as_ref()),
                    "cpk": f(c.cpk.as_ref()),
                    "sample_count": c.sample_count,
                }),
                "控制限计算成功",
            )
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to calculate chart limits: {}", e);
            ApiResponse::server_error("控制限计算失败")
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/spc/charts", get(list_spc_charts))
        .route("/spc/charts", post(create_spc_chart))
        .route("/spc/charts/{id}", get(get_spc_chart))
        .route("/spc/charts/{id}", put(update_spc_chart))
        .route("/spc/charts/{id}", delete(delete_spc_chart))
        .route(
            "/spc/charts/{id}/data-points",
            get(get_spc_chart_data_points),
        )
        .route(
            "/spc/charts/{id}/calculate",
            post(calculate_spc_chart_limits),
        )
        .route("/spc/data-points", get(get_spc_data_points))
        .route("/spc/data-points", post(add_spc_data_point))
        .route("/spc/calculate", post(calculate_control_limits))
}
