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
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<SpcChartQuery>,
) -> Json<ApiResponse<Vec<SpcChart>>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let charts = match (query.chart_type.as_ref(), query.product_id.as_ref()) {
        (Some(ct), Some(pid)) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND chart_type = $2 AND product_id::TEXT = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_opt).bind(ct).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(ct), None) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND chart_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_opt).bind(ct).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(pid)) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND product_id::TEXT = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_opt).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(tenant_opt).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match charts {
        Ok(data) => Json(ApiResponse::success(data, "获取SPC控制图列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch SPC charts: {}", e);
            Json(ApiResponse::error(500, "获取SPC控制图列表失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSpcChartRequest>,
) -> Json<ApiResponse<SpcChart>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let chart_no = format!(
        "SPC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_spc_charts (tenant_id, chart_no, chart_type, product_id, product_name, parameter_name, ucl, cl, lcl, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10) RETURNING id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at"#)).bind(tenant_id).bind(chart_no).bind(req.chart_type).bind(product_id).bind(req.product_name).bind(req.parameter_name).bind(req.ucl).bind(req.cl).bind(req.lcl).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match chart {
        Ok(data) => Json(ApiResponse::success(data, "SPC控制图创建成功")),
        Err(e) => {
            tracing::error!("Failed to create SPC chart: {}", e);
            Json(ApiResponse::error(500, "SPC控制图创建失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SpcChart>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的控制图ID")),
    };

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id).bind(tenant_opt)
    .fetch_one(&state.pool)
    .await;

    match chart {
        Ok(data) => Json(ApiResponse::success(data, "获取SPC控制图成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch SPC chart: {}", e);
            Json(ApiResponse::error(500, "获取SPC控制图失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateSpcChartRequest>,
) -> Json<ApiResponse<SpcChart>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的控制图ID")),
    };

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"UPDATE qms.qa_spc_charts SET chart_type = COALESCE($2, chart_type), parameter_name = COALESCE($3, parameter_name), ucl = COALESCE($4, ucl), cl = COALESCE($5, cl), lcl = COALESCE($6, lcl), status = COALESCE($7, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $8 RETURNING id::TEXT, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at"#)).bind(id).bind(req.chart_type).bind(req.parameter_name).bind(req.ucl).bind(req.cl).bind(req.lcl).bind(req.status).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match chart {
        Ok(data) => Json(ApiResponse::success(data, "SPC控制图更新成功")),
        Err(e) => {
            tracing::error!("Failed to update SPC chart: {}", e);
            Json(ApiResponse::error(500, "SPC控制图更新失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的控制图ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_spc_charts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "SPC控制图删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete SPC chart: {}", e);
            Json(ApiResponse::error(500, "SPC控制图删除失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<SpcDataQuery>,
) -> Json<ApiResponse<Vec<SpcDataPoint>>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let chart_id = match Uuid::parse_str(&query.chart_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的控制图ID")),
    };

    let limit = query.limit.unwrap_or(100);

    let points = sqlx::query_as::<_, SpcDataPoint>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_id::TEXT, sample_no, value, subgroup_size, is_out_of_control, trend_flag, measured_at, created_at FROM qms.qa_spc_data_points WHERE chart_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY sample_no DESC LIMIT $3"#)).bind(chart_id).bind(tenant_opt).bind(limit)
    .fetch_all(&state.pool)
    .await;

    match points {
        Ok(mut data) => {
            data.reverse();
            Json(ApiResponse::success(data, "获取SPC数据点成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch SPC data points: {}", e);
            Json(ApiResponse::error(500, "获取SPC数据点失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSpcDataRequest>,
) -> Json<ApiResponse<SpcDataPoint>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let chart_id = match Uuid::parse_str(&req.chart_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的控制图ID")),
    };

    let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, chart_no, chart_type, product_id::TEXT, product_name, parameter_name, ucl, cl, lcl, cp, cpk, pp, ppk, sample_count, status, created_by, created_at, updated_at FROM qms.qa_spc_charts WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(chart_id).bind(tenant_opt)
    .fetch_one(&state.pool)
    .await;

    let ucl = chart
        .as_ref()
        .ok()
        .and_then(|c| c.ucl.as_ref().and_then(|v| v.to_f64()))
        .unwrap_or(f64::INFINITY);
    let lcl = chart
        .as_ref()
        .ok()
        .and_then(|c| c.lcl.as_ref().and_then(|v| v.to_f64()))
        .unwrap_or(f64::NEG_INFINITY);
    let value_f64 = req.value.to_f64().unwrap_or(0.0);
    let is_out_of_control = Some(value_f64 > ucl || value_f64 < lcl);

    let point = sqlx::query_as::<_, SpcDataPoint>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_spc_data_points (tenant_id, chart_id, sample_no, value, subgroup_size, is_out_of_control) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, tenant_id, chart_id::TEXT, sample_no, value, subgroup_size, is_out_of_control, trend_flag, measured_at, created_at"#)).bind(tenant_id).bind(chart_id).bind(req.sample_no).bind(req.value).bind(req.subgroup_size).bind(is_out_of_control)
    .fetch_one(&state.pool)
    .await;

    match point {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_spc_charts SET sample_count = COALESCE(sample_count, 0) + 1, updated_at = NOW() WHERE id = $1 AND tenant_id = $2"#)).bind(chart_id).bind(tenant_id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "SPC数据点添加成功"))
        }
        Err(e) => {
            tracing::error!("Failed to add SPC data point: {}", e);
            Json(ApiResponse::error(500, "SPC数据点添加失败"))
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
pub async fn calculate_control_limits(
    State(_state): State<crate::AppState>,
    Json(req): Json<CalculateControlLimitRequest>,
) -> Json<ApiResponse<ControlLimitResult>> {
    let values = &req.values;
    let subgroup_size = req.subgroup_size.unwrap_or(5);

    if values.is_empty() {
        return Json(ApiResponse::error(400, "数据点不能为空"));
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

    Json(ApiResponse::success(result, "控制限计算成功"))
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/spc/charts", get(list_spc_charts))
        .route("/spc/charts", post(create_spc_chart))
        .route("/spc/charts/{id}", get(get_spc_chart))
        .route("/spc/charts/{id}", put(update_spc_chart))
        .route("/spc/charts/{id}", delete(delete_spc_chart))
        .route("/spc/data-points", get(get_spc_data_points))
        .route("/spc/data-points", post(add_spc_data_point))
        .route("/spc/calculate", post(calculate_control_limits))
}
