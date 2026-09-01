//! Quality Cost handlers

use crate::models::quality_cost::*;
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use bigdecimal::{BigDecimal, ToPrimitive};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/quality-costs",
    tag = "quality_cost",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("cost_category" = Option<String>, Query, description = "成本分类过滤 (prevention/appraisal/internal_failure/external_failure)"),
        ("department" = Option<String>, Query, description = "部门过滤"),
        ("start_date" = Option<String>, Query, description = "起始日期 (YYYY-MM-DD)"),
        ("end_date" = Option<String>, Query, description = "结束日期 (YYYY-MM-DD)"),
    ),
    responses(
        (status = 200, description = "质量成本列表", body = ApiResponse<ListQualityCostsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_quality_costs(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<QualityCostQuery>,
) -> Json<ApiResponse<ListQualityCostsResponse>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE tenant_id::TEXT = $1");
    params.push(serde_json::Value::String(tenant_id.to_string()));

    if let Some(category) = &query.cost_category {
        where_clause.push_str(&format!(" AND cost_category = ${}", params.len() + 1));
        params.push(serde_json::Value::String(category.clone()));
    }

    if let Some(dept) = &query.department {
        where_clause.push_str(&format!(" AND department = ${}", params.len() + 1));
        params.push(serde_json::Value::String(dept.clone()));
    }

    if let Some(start) = &query.start_date {
        where_clause.push_str(&format!(
            " AND incurred_date::date >= ${}::date",
            params.len() + 1
        ));
        params.push(serde_json::Value::String(start.clone()));
    }

    if let Some(end) = &query.end_date {
        where_clause.push_str(&format!(
            " AND incurred_date::date <= ${}::date",
            params.len() + 1
        ));
        params.push(serde_json::Value::String(end.clone()));
    }

    let count_sql = format!("SELECT COUNT(*) FROM qms.qa_quality_costs{}", where_clause);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }

    let total: i64 = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality costs: {}", e);
            return Json(ApiResponse::error(500, "获取质量成本列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"SELECT id::TEXT, tenant_id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_quality_costs{} ORDER BY incurred_date DESC LIMIT ${} OFFSET ${}"#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query_as::<_, QualityCost>(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    match fetch_query.fetch_all(&state.pool).await {
        Ok(data) => Json(ApiResponse::success(
            ListQualityCostsResponse {
                costs: data,
                total,
                page,
                page_size,
            },
            "获取质量成本列表成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch quality costs: {}", e);
            Json(ApiResponse::error(500, "获取质量成本列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/quality-costs",
    tag = "quality_cost",
    request_body = CreateQualityCostRequest,
    responses(
        (status = 200, description = "质量成本记录创建成功", body = ApiResponse<QualityCost>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_quality_cost(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateQualityCostRequest>,
) -> Json<ApiResponse<QualityCost>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let cost_no = format!(
        "QC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let related_issue_id = req
        .related_issue_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let incurred_dt = req
        .incurred_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let cost = sqlx::query_as::<_, QualityCost>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_quality_costs (tenant_id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id, incurred_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, tenant_id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(tenant_id).bind(cost_no).bind(req.cost_category).bind(req.cost_type).bind(req.amount).bind(req.department).bind(req.description).bind(related_issue_id).bind(incurred_dt).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match cost {
        Ok(data) => Json(ApiResponse::success(data, "质量成本记录创建成功")),
        Err(e) => {
            tracing::error!("Failed to create quality cost: {}", e);
            Json(ApiResponse::error(500, "质量成本记录创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/quality-costs/{id}",
    tag = "quality_cost",
    params(
        ("id" = String, Path, description = "成本记录 ID (UUID)"),
    ),
    responses(
        (status = 200, description = "质量成本记录详情", body = ApiResponse<QualityCost>),
        (status = 400, description = "无效的成本记录ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_quality_cost(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<QualityCost>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的成本记录ID")),
    };

    let cost = sqlx::query_as::<_, QualityCost>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_quality_costs WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#)).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match cost {
        Ok(data) => Json(ApiResponse::success(data, "获取质量成本记录成功")),
        Err(e) => {
            tracing::error!("Failed to fetch quality cost: {}", e);
            Json(ApiResponse::error(500, "获取质量成本记录失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/quality-costs/{id}",
    tag = "quality_cost",
    params(
        ("id" = String, Path, description = "成本记录 ID (UUID)"),
    ),
    request_body = UpdateQualityCostRequest,
    responses(
        (status = 200, description = "质量成本记录更新成功", body = ApiResponse<QualityCost>),
        (status = 400, description = "无效的成本记录ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_quality_cost(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateQualityCostRequest>,
) -> Json<ApiResponse<QualityCost>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的成本记录ID")),
    };

    let related_issue_id = req
        .related_issue_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let incurred_dt = req
        .incurred_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let cost = sqlx::query_as::<_, QualityCost>(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_costs SET cost_category = COALESCE($2, cost_category), cost_type = COALESCE($3, cost_type), amount = COALESCE($4, amount), department = COALESCE($5, department), description = COALESCE($6, description), related_issue_id = COALESCE($7, related_issue_id), incurred_date = COALESCE($8, incurred_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $9 RETURNING id, tenant_id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(req.cost_category).bind(req.cost_type).bind(req.amount).bind(req.department).bind(req.description).bind(related_issue_id).bind(incurred_dt).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match cost {
        Ok(data) => Json(ApiResponse::success(data, "质量成本记录更新成功")),
        Err(e) => {
            tracing::error!("Failed to update quality cost: {}", e);
            Json(ApiResponse::error(500, "质量成本记录更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/quality-costs/{id}",
    tag = "quality_cost",
    params(
        ("id" = String, Path, description = "成本记录 ID (UUID)"),
    ),
    responses(
        (status = 200, description = "质量成本记录删除成功", body = ApiResponse<bool>),
        (status = 400, description = "无效的成本记录ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_quality_cost(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的成本记录ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_quality_costs SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "质量成本记录删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality cost: {}", e);
            Json(ApiResponse::error(500, "质量成本记录删除失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/quality-costs/statistics",
    tag = "quality_cost",
    params(
        ("cost_category" = Option<String>, Query, description = "成本分类过滤"),
        ("department" = Option<String>, Query, description = "部门过滤"),
        ("start_date" = Option<String>, Query, description = "起始日期 (YYYY-MM-DD)"),
        ("end_date" = Option<String>, Query, description = "结束日期 (YYYY-MM-DD)"),
    ),
    responses(
        (status = 200, description = "质量成本统计", body = ApiResponse<QualityCostStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_cost_statistics(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<QualityCostQuery>,
) -> Json<ApiResponse<QualityCostStatistics>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE tenant_id::TEXT = $1");
    params.push(serde_json::Value::String(tenant_id.to_string()));

    if let Some(category) = &query.cost_category {
        where_clause.push_str(&format!(" AND cost_category = ${}", params.len() + 1));
        params.push(serde_json::Value::String(category.clone()));
    }

    if let Some(dept) = &query.department {
        where_clause.push_str(&format!(" AND department = ${}", params.len() + 1));
        params.push(serde_json::Value::String(dept.clone()));
    }

    if let Some(start) = &query.start_date {
        where_clause.push_str(&format!(
            " AND incurred_date::date >= ${}::date",
            params.len() + 1
        ));
        params.push(serde_json::Value::String(start.clone()));
    }

    if let Some(end) = &query.end_date {
        where_clause.push_str(&format!(
            " AND incurred_date::date <= ${}::date",
            params.len() + 1
        ));
        params.push(serde_json::Value::String(end.clone()));
    }

    let total_sql = format!(
        "SELECT COALESCE(SUM(amount), 0) FROM qms.qa_quality_costs{}",
        where_clause
    );
    let mut total_query = sqlx::query_scalar::<_, BigDecimal>(&total_sql);
    for p in &params {
        total_query = total_query.bind(p.as_str().unwrap_or(""));
    }
    let total: Option<BigDecimal> = match total_query.fetch_one(&state.pool).await {
        Ok(v) => Some(v),
        Err(e) => {
            tracing::error!("Failed to fetch total cost: {}", e);
            None
        }
    };
    let total_cost: f64 = total.map(|v| v.to_f64().unwrap_or(0.0)).unwrap_or(0.0);

    let category_sql = format!(
        r#"SELECT cost_category as category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM qms.qa_quality_costs{} GROUP BY cost_category ORDER BY total DESC"#,
        where_clause
    );
    let mut category_query = sqlx::query(&category_sql);
    for p in &params {
        category_query = category_query.bind(p.as_str().unwrap_or(""));
    }
    let category_rows = category_query.fetch_all(&state.pool).await;

    let category_summary = match category_rows {
        Ok(rows) => rows
            .iter()
            .map(|r| {
                let cat_total: f64 = r.get::<BigDecimal, _>("total").to_f64().unwrap_or(0.0);
                let percentage = if total_cost > 0.0 {
                    (cat_total / total_cost) * 100.0
                } else {
                    0.0
                };
                CostCategorySummary {
                    category: r.get::<String, _>("category"),
                    total_amount: cat_total,
                    count: r.get::<i64, _>("count"),
                    percentage: (percentage * 100.0).round() / 100.0,
                }
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch category summary: {}", e);
            Vec::new()
        }
    };

    let dept_sql = format!(
        r#"SELECT COALESCE(department, '未分配') as department, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM qms.qa_quality_costs{} GROUP BY department ORDER BY total DESC"#,
        where_clause
    );
    let mut dept_query = sqlx::query(&dept_sql);
    for p in &params {
        dept_query = dept_query.bind(p.as_str().unwrap_or(""));
    }
    let dept_rows = dept_query.fetch_all(&state.pool).await;

    let department_summary = match dept_rows {
        Ok(rows) => rows
            .iter()
            .map(|r| {
                let dept_total: f64 = r.get::<BigDecimal, _>("total").to_f64().unwrap_or(0.0);
                let percentage = if total_cost > 0.0 {
                    (dept_total / total_cost) * 100.0
                } else {
                    0.0
                };
                CostDepartmentSummary {
                    department: r
                        .get::<Option<String>, _>("department")
                        .unwrap_or_else(|| "未分配".to_string()),
                    total_amount: dept_total,
                    count: r.get::<i64, _>("count"),
                    percentage: (percentage * 100.0).round() / 100.0,
                }
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch department summary: {}", e);
            Vec::new()
        }
    };

    let stats = QualityCostStatistics {
        total_cost,
        category_summary,
        department_summary,
    };

    Json(ApiResponse::success(stats, "获取质量成本统计成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/quality-costs/trend",
    tag = "quality_cost",
    params(
        ("cost_category" = Option<String>, Query, description = "成本分类过滤"),
        ("department" = Option<String>, Query, description = "部门过滤"),
        ("start_date" = Option<String>, Query, description = "起始日期 (YYYY-MM-DD)"),
        ("end_date" = Option<String>, Query, description = "结束日期 (YYYY-MM-DD)"),
    ),
    responses(
        (status = 200, description = "质量成本趋势", body = ApiResponse<Vec<CostTrendItem>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_cost_trend(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<QualityCostQuery>,
) -> Json<ApiResponse<Vec<CostTrendItem>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE tenant_id::TEXT = $1");
    params.push(serde_json::Value::String(tenant_id.to_string()));

    if let Some(start) = &query.start_date {
        where_clause.push_str(&format!(
            " AND incurred_date::date >= ${}::date",
            params.len() + 1
        ));
        params.push(serde_json::Value::String(start.clone()));
    }
    if let Some(end) = &query.end_date {
        where_clause.push_str(&format!(
            " AND incurred_date::date <= ${}::date",
            params.len() + 1
        ));
        params.push(serde_json::Value::String(end.clone()));
    }
    if query.start_date.is_none() && query.end_date.is_none() {
        where_clause
            .push_str(" AND incurred_date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 year'");
    }

    if let Some(category) = &query.cost_category {
        where_clause.push_str(&format!(" AND cost_category = ${}", params.len() + 1));
        params.push(serde_json::Value::String(category.clone()));
    }

    if let Some(dept) = &query.department {
        where_clause.push_str(&format!(" AND department = ${}", params.len() + 1));
        params.push(serde_json::Value::String(dept.clone()));
    }

    let sql = format!(
        r#"
        SELECT
            TO_CHAR(DATE_TRUNC('month', COALESCE(incurred_date, created_at)), 'YYYY-MM') as period,
            COALESCE(SUM(CASE WHEN cost_category = 'prevention' THEN amount ELSE 0 END), 0) as prevention,
            COALESCE(SUM(CASE WHEN cost_category = 'appraisal' THEN amount ELSE 0 END), 0) as appraisal,
            COALESCE(SUM(CASE WHEN cost_category = 'internal_failure' THEN amount ELSE 0 END), 0) as internal_failure,
            COALESCE(SUM(CASE WHEN cost_category = 'external_failure' THEN amount ELSE 0 END), 0) as external_failure,
            COALESCE(SUM(amount), 0) as total
        FROM qms.qa_quality_costs
        {}
        GROUP BY DATE_TRUNC('month', COALESCE(incurred_date, created_at))
        ORDER BY period ASC
        "#,
        where_clause
    );

    let mut q = sqlx::query(&sql);
    for p in &params {
        q = q.bind(p.as_str().unwrap_or(""));
    }
    let rows = q.fetch_all(&state.pool).await;

    match rows {
        Ok(data) => {
            let trend: Vec<CostTrendItem> = data
                .iter()
                .map(|r| CostTrendItem {
                    period: r.get::<Option<String>, _>("period").unwrap_or_default(),
                    prevention: r.get::<BigDecimal, _>("prevention").to_f64().unwrap_or(0.0),
                    appraisal: r.get::<BigDecimal, _>("appraisal").to_f64().unwrap_or(0.0),
                    internal_failure: r
                        .get::<BigDecimal, _>("internal_failure")
                        .to_f64()
                        .unwrap_or(0.0),
                    external_failure: r
                        .get::<BigDecimal, _>("external_failure")
                        .to_f64()
                        .unwrap_or(0.0),
                    total: r.get::<BigDecimal, _>("total").to_f64().unwrap_or(0.0),
                })
                .collect();
            Json(ApiResponse::success(trend, "获取质量成本趋势成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch cost trend: {}", e);
            Json(ApiResponse::error(500, "获取质量成本趋势失败"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/quality-costs", get(list_quality_costs))
        .route("/quality-costs", post(create_quality_cost))
        .route("/quality-costs/{id}", get(get_quality_cost))
        .route("/quality-costs/{id}", put(update_quality_cost))
        .route("/quality-costs/{id}", delete(delete_quality_cost))
        .route("/quality-costs/statistics", get(get_cost_statistics))
        .route("/quality-costs/trend", get(get_cost_trend))
}
