//! Quality Cost handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use bigdecimal::{BigDecimal, ToPrimitive};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, Row};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct QualityCostQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub cost_category: Option<String>,
    pub department: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct QualityCost {
    pub id: String,
    pub cost_no: String,
    pub cost_category: String,
    pub cost_type: Option<String>,
    pub amount: BigDecimal,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListQualityCostsResponse {
    pub costs: Vec<QualityCost>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateQualityCostRequest {
    pub cost_category: String,
    pub cost_type: Option<String>,
    pub amount: BigDecimal,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQualityCostRequest {
    pub cost_category: Option<String>,
    pub cost_type: Option<String>,
    pub amount: Option<BigDecimal>,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize)]
pub struct CostCategorySummary {
    pub category: String,
    pub total_amount: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct CostTrendItem {
    pub period: String,
    pub prevention: f64,
    pub appraisal: f64,
    pub internal_failure: f64,
    pub external_failure: f64,
    pub total: f64,
}

#[derive(Debug, Serialize)]
pub struct CostDepartmentSummary {
    pub department: String,
    pub total_amount: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct QualityCostStatistics {
    pub total_cost: f64,
    pub category_summary: Vec<CostCategorySummary>,
    pub department_summary: Vec<CostDepartmentSummary>,
}

pub async fn list_quality_costs(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<QualityCostQuery>,
) -> Json<ApiResponse<ListQualityCostsResponse>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(category) = &query.cost_category {
        where_clause.push_str(&format!(" WHERE cost_category = ${}", params.len() + 1));
        params.push(serde_json::Value::String(category.clone()));
    }

    if let Some(dept) = &query.department {
        if where_clause.is_empty() {
            where_clause.push_str(&format!(" WHERE department = ${}", params.len() + 1));
        } else {
            where_clause.push_str(&format!(" AND department = ${}", params.len() + 1));
        }
        params.push(serde_json::Value::String(dept.clone()));
    }

    if let Some(start) = &query.start_date {
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE incurred_date::date >= ${}::date",
                params.len() + 1
            ));
        } else {
            where_clause.push_str(&format!(
                " AND incurred_date::date >= ${}::date",
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(start.clone()));
    }

    if let Some(end) = &query.end_date {
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE incurred_date::date <= ${}::date",
                params.len() + 1
            ));
        } else {
            where_clause.push_str(&format!(
                " AND incurred_date::date <= ${}::date",
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(end.clone()));
    }

    let count_sql = format!("SELECT COUNT(*) FROM qa_quality_costs{}", where_clause);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: i64 = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality costs: {}", e);
            return Json(ApiResponse::error(500, "获取质量成本列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"SELECT id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_quality_costs{} ORDER BY incurred_date DESC LIMIT ${} OFFSET ${}"#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query_as::<_, QualityCost>(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
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

pub async fn create_quality_cost(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateQualityCostRequest>,
) -> Json<ApiResponse<QualityCost>> {
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

    let cost = sqlx::query_as::<_, QualityCost>(r#"INSERT INTO qa_quality_costs (cost_no, cost_category, cost_type, amount, department, description, related_issue_id, incurred_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(cost_no).bind(req.cost_category).bind(req.cost_type).bind(req.amount).bind(req.department).bind(req.description).bind(related_issue_id).bind(incurred_dt).bind(req.created_by)
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

pub async fn get_quality_cost(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<QualityCost>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的成本记录ID")),
    };

    let cost = sqlx::query_as::<_, QualityCost>(r#"SELECT id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_quality_costs WHERE id = $1"#).bind(id)
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

pub async fn update_quality_cost(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateQualityCostRequest>,
) -> Json<ApiResponse<QualityCost>> {
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

    let cost = sqlx::query_as::<_, QualityCost>(r#"UPDATE qa_quality_costs SET cost_category = COALESCE($2, cost_category), cost_type = COALESCE($3, cost_type), amount = COALESCE($4, amount), department = COALESCE($5, department), description = COALESCE($6, description), related_issue_id = COALESCE($7, related_issue_id), incurred_date = COALESCE($8, incurred_date), updated_at = NOW() WHERE id = $1 RETURNING id, cost_no, cost_category, cost_type, amount, department, description, related_issue_id::TEXT, incurred_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.cost_category).bind(req.cost_type).bind(req.amount).bind(req.department).bind(req.description).bind(related_issue_id).bind(incurred_dt)
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

pub async fn delete_quality_cost(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的成本记录ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_quality_costs WHERE id = $1"#)
        .bind(id)
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

pub async fn get_cost_statistics(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<QualityCostQuery>,
) -> Json<ApiResponse<QualityCostStatistics>> {
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(category) = &query.cost_category {
        where_clause.push_str(&format!(" WHERE cost_category = ${}", params.len() + 1));
        params.push(serde_json::Value::String(category.clone()));
    }

    if let Some(dept) = &query.department {
        if where_clause.is_empty() {
            where_clause.push_str(&format!(" WHERE department = ${}", params.len() + 1));
        } else {
            where_clause.push_str(&format!(" AND department = ${}", params.len() + 1));
        }
        params.push(serde_json::Value::String(dept.clone()));
    }

    if let Some(start) = &query.start_date {
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE incurred_date::date >= ${}::date",
                params.len() + 1
            ));
        } else {
            where_clause.push_str(&format!(
                " AND incurred_date::date >= ${}::date",
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(start.clone()));
    }

    if let Some(end) = &query.end_date {
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE incurred_date::date <= ${}::date",
                params.len() + 1
            ));
        } else {
            where_clause.push_str(&format!(
                " AND incurred_date::date <= ${}::date",
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(end.clone()));
    }

    let total_sql = format!(
        "SELECT COALESCE(SUM(amount), 0) FROM qa_quality_costs{}",
        where_clause
    );
    let mut total_query = sqlx::query_scalar::<_, BigDecimal>(&total_sql);
    for p in &params {
        total_query = total_query.bind(p.clone());
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
        r#"SELECT cost_category as category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM qa_quality_costs{} GROUP BY cost_category ORDER BY total DESC"#,
        where_clause
    );
    let mut category_query = sqlx::query(&category_sql);
    for p in &params {
        category_query = category_query.bind(p.clone());
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
        r#"SELECT COALESCE(department, '未分配') as department, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM qa_quality_costs{} GROUP BY department ORDER BY total DESC"#,
        where_clause
    );
    let mut dept_query = sqlx::query(&dept_sql);
    for p in &params {
        dept_query = dept_query.bind(p.clone());
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

pub async fn get_cost_trend(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<QualityCostQuery>,
) -> Json<ApiResponse<Vec<CostTrendItem>>> {
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE 1=1");

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
        FROM qa_quality_costs
        {}
        GROUP BY DATE_TRUNC('month', COALESCE(incurred_date, created_at))
        ORDER BY period ASC
        "#,
        where_clause
    );

    let mut q = sqlx::query(&sql);
    for p in &params {
        q = q.bind(p.clone());
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
        .route("/api/qms/quality-costs", get(list_quality_costs))
        .route("/api/qms/quality-costs", post(create_quality_cost))
        .route("/api/qms/quality-costs/{id}", get(get_quality_cost))
        .route("/api/qms/quality-costs/{id}", put(update_quality_cost))
        .route("/api/qms/quality-costs/{id}", delete(delete_quality_cost))
        .route(
            "/api/qms/quality-costs/statistics",
            get(get_cost_statistics),
        )
        .route("/api/qms/quality-costs/trend", get(get_cost_trend))
}
