use axum::{extract::State, routing::{delete, get, post, put}, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/lims/uncertainty-projects", get(list_projects).post(create_project))
        .route("/api/lims/uncertainty-projects/{id}", get(get_project).put(update_project).delete(delete_project))
        .route("/api/lims/uncertainty-projects/{id}/sources", get(list_sources))
        .route("/api/lims/uncertainty-projects/{id}/components", get(list_components))
        .route("/api/lims/uncertainty-projects/{id}/combined", post(calculate_combined))
        .route("/api/lims/uncertainty-projects/{id}/report", get(generate_report))
        .route("/api/lims/uncertainty-sources", post(create_source))
        .route("/api/lims/uncertainty-sources/{id}", put(update_source).delete(delete_source))
        .route("/api/lims/uncertainty-components", post(create_component))
        .route("/api/lims/uncertainty-components/{id}", put(update_component).delete(delete_component))
        .route("/api/lims/uncertainty/type-a", post(calculate_type_a))
        .route("/api/lims/uncertainty/type-b", post(calculate_type_b))
}

#[derive(Debug, Deserialize)]
pub struct UncertaintyProjectQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub method_id: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UncertaintyProject {
    pub id: String,
    pub project_no: String,
    pub project_name: String,
    pub method_id: Option<String>,
    pub method_name: Option<String>,
    pub test_item: Option<String>,
    pub measurand: Option<String>,
    pub measurement_range: Option<String>,
    pub unit: Option<String>,
    pub status: String,
    pub evaluator: Option<String>,
    pub evaluation_date: Option<String>,
    pub combined_uncertainty: Option<f64>,
    pub expanded_uncertainty: Option<f64>,
    pub coverage_factor: Option<f64>,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUncertaintyProjectRequest {
    pub project_name: String,
    pub method_id: Option<String>,
    pub method_name: Option<String>,
    pub test_item: Option<String>,
    pub measurand: Option<String>,
    pub measurement_range: Option<String>,
    pub unit: Option<String>,
    pub evaluator: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUncertaintyProjectRequest {
    pub project_name: Option<String>,
    pub method_id: Option<String>,
    pub method_name: Option<String>,
    pub test_item: Option<String>,
    pub measurand: Option<String>,
    pub measurement_range: Option<String>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub evaluator: Option<String>,
    pub evaluation_date: Option<String>,
    pub coverage_factor: Option<f64>,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UncertaintySource {
    pub id: String,
    pub project_id: String,
    pub source_name: String,
    pub source_type: String,
    pub description: Option<String>,
    pub distribution_type: Option<String>,
    pub sensitivity_coefficient: Option<f64>,
    pub sort_order: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUncertaintySourceRequest {
    pub project_id: String,
    pub source_name: String,
    pub source_type: String,
    pub description: Option<String>,
    pub distribution_type: Option<String>,
    pub sensitivity_coefficient: Option<f64>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUncertaintySourceRequest {
    pub source_name: Option<String>,
    pub source_type: Option<String>,
    pub description: Option<String>,
    pub distribution_type: Option<String>,
    pub sensitivity_coefficient: Option<f64>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct UncertaintyComponent {
    pub id: String,
    pub project_id: String,
    pub source_id: String,
    pub source_name: String,
    pub component_type: String,
    pub component_name: String,
    pub standard_uncertainty: Option<f64>,
    pub relative_uncertainty: Option<f64>,
    pub sensitivity_coefficient: Option<f64>,
    pub degrees_freedom: Option<f64>,
    pub calculation_method: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUncertaintyComponentRequest {
    pub project_id: String,
    pub source_id: String,
    pub component_type: String,
    pub component_name: String,
    pub standard_uncertainty: Option<f64>,
    pub relative_uncertainty: Option<f64>,
    pub sensitivity_coefficient: Option<f64>,
    pub degrees_freedom: Option<f64>,
    pub calculation_method: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUncertaintyComponentRequest {
    pub component_name: Option<String>,
    pub standard_uncertainty: Option<f64>,
    pub relative_uncertainty: Option<f64>,
    pub sensitivity_coefficient: Option<f64>,
    pub degrees_freedom: Option<f64>,
    pub calculation_method: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TypeACalculationRequest {
    pub project_id: String,
    pub source_id: String,
    pub component_name: String,
    pub measurements: Vec<f64>,
    pub sensitivity_coefficient: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct TypeBCalculationRequest {
    pub project_id: String,
    pub source_id: String,
    pub component_name: String,
    pub uncertainty_value: f64,
    pub distribution_type: String,
    pub sensitivity_coefficient: Option<f64>,
    pub degrees_freedom: Option<f64>,
    pub description: Option<String>,
}

pub async fn list_projects(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<UncertaintyProjectQuery>,
) -> Json<ApiResponse<Vec<UncertaintyProject>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let base_sql = "SELECT p.id, p.project_no, p.project_name, p.method_id, p.method_name, p.test_item, p.measurand, p.measurement_range, p.unit, p.status, p.evaluator, p.evaluation_date::TEXT, p.combined_uncertainty, p.expanded_uncertainty, p.coverage_factor, p.confidence_level, p.notes, p.created_at::TEXT, p.updated_at::TEXT FROM qa_lims_uncertainty_projects p";

    let sql = match (query.status.as_ref(), query.method_id.as_ref(), query.project_name.as_ref()) {
        (Some(_), Some(_), Some(_)) => format!("{} WHERE p.status = $1 AND p.method_id = $2 AND p.project_name LIKE $3 ORDER BY p.created_at DESC LIMIT $4 OFFSET $5", base_sql),
        (Some(_), Some(_), None) => format!("{} WHERE p.status = $1 AND p.method_id = $2 ORDER BY p.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (Some(_), None, Some(_)) => format!("{} WHERE p.status = $1 AND p.project_name LIKE $2 ORDER BY p.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (Some(_), None, None) => format!("{} WHERE p.status = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, Some(_), Some(_)) => format!("{} WHERE p.method_id = $1 AND p.project_name LIKE $2 ORDER BY p.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (None, Some(_), None) => format!("{} WHERE p.method_id = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, None, Some(_)) => format!("{} WHERE p.project_name LIKE $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, None, None) => format!("{} ORDER BY p.created_at DESC LIMIT $1 OFFSET $2", base_sql),
    };

    let mut query_builder = sqlx::query(&sql);
    match (query.status.as_ref(), query.method_id.as_ref(), query.project_name.as_ref()) {
        (Some(st), Some(mid), Some(pn)) => {
            let mid_uuid = Uuid::parse_str(mid).unwrap_or(Uuid::nil());
            query_builder = query_builder.bind(st).bind(mid_uuid).bind(format!("%{}%", pn)).bind(page_size).bind(offset);
        }
        (Some(st), Some(mid), None) => {
            let mid_uuid = Uuid::parse_str(mid).unwrap_or(Uuid::nil());
            query_builder = query_builder.bind(st).bind(mid_uuid).bind(page_size).bind(offset);
        }
        (Some(st), None, Some(pn)) => {
            query_builder = query_builder.bind(st).bind(format!("%{}%", pn)).bind(page_size).bind(offset);
        }
        (Some(st), None, None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(mid), Some(pn)) => {
            let mid_uuid = Uuid::parse_str(mid).unwrap_or(Uuid::nil());
            query_builder = query_builder.bind(mid_uuid).bind(format!("%{}%", pn)).bind(page_size).bind(offset);
        }
        (None, Some(mid), None) => {
            let mid_uuid = Uuid::parse_str(mid).unwrap_or(Uuid::nil());
            query_builder = query_builder.bind(mid_uuid).bind(page_size).bind(offset);
        }
        (None, None, Some(pn)) => {
            query_builder = query_builder.bind(format!("%{}%", pn)).bind(page_size).bind(offset);
        }
        (None, None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let projects = query_builder
        .fetch_all(&state.pool)
        .await
        .map(|rows| {
            rows.into_iter()
                .map(|row| UncertaintyProject {
                    id: row.get("id"),
                    project_no: row.get("project_no"),
                    project_name: row.get("project_name"),
                    method_id: row.get("method_id"),
                    method_name: row.get("method_name"),
                    test_item: row.get("test_item"),
                    measurand: row.get("measurand"),
                    measurement_range: row.get("measurement_range"),
                    unit: row.get("unit"),
                    status: row.get("status"),
                    evaluator: row.get("evaluator"),
                    evaluation_date: row.get("evaluation_date"),
                    combined_uncertainty: row.get("combined_uncertainty"),
                    expanded_uncertainty: row.get("expanded_uncertainty"),
                    coverage_factor: row.get("coverage_factor"),
                    confidence_level: row.get("confidence_level"),
                    notes: row.get("notes"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect()
        });

    match projects {
        Ok(data) => Json(ApiResponse::success(data, "获取不确定度评定项目列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch uncertainty projects: {}", e);
            Json(ApiResponse::error(500, "获取不确定度评定项目列表失败"))
        }
    }
}

pub async fn create_project(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateUncertaintyProjectRequest>,
) -> Json<ApiResponse<UncertaintyProject>> {
    let project_no = format!("UNC-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_uncertainty_projects (
            project_no, project_name, method_id, method_name, test_item,
            measurand, measurement_range, unit, status, evaluator, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10)
        RETURNING id, project_no, project_name, method_id, method_name, test_item,
                  measurand, measurement_range, unit, status, evaluator,
                  evaluation_date::TEXT, combined_uncertainty, expanded_uncertainty,
                  coverage_factor, confidence_level, notes, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(&project_no)
    .bind(&req.project_name)
    .bind(&req.method_id)
    .bind(&req.method_name)
    .bind(&req.test_item)
    .bind(&req.measurand)
    .bind(&req.measurement_range)
    .bind(&req.unit)
    .bind(&req.evaluator)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyProject {
            id: r.get("id"),
            project_no: r.get("project_no"),
            project_name: r.get("project_name"),
            method_id: r.get("method_id"),
            method_name: r.get("method_name"),
            test_item: r.get("test_item"),
            measurand: r.get("measurand"),
            measurement_range: r.get("measurement_range"),
            unit: r.get("unit"),
            status: r.get("status"),
            evaluator: r.get("evaluator"),
            evaluation_date: r.get("evaluation_date"),
            combined_uncertainty: r.get("combined_uncertainty"),
            expanded_uncertainty: r.get("expanded_uncertainty"),
            coverage_factor: r.get("coverage_factor"),
            confidence_level: r.get("confidence_level"),
            notes: r.get("notes"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "不确定度评定项目创建成功")),
        Err(e) => {
            tracing::error!("Failed to create uncertainty project: {}", e);
            Json(ApiResponse::error(500, "不确定度评定项目创建失败"))
        }
    }
}

pub async fn get_project(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<UncertaintyProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let row = sqlx::query(
        "SELECT id, project_no, project_name, method_id, method_name, test_item, measurand, measurement_range, unit, status, evaluator, evaluation_date::TEXT, combined_uncertainty, expanded_uncertainty, coverage_factor, confidence_level, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_uncertainty_projects WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyProject {
            id: r.get("id"),
            project_no: r.get("project_no"),
            project_name: r.get("project_name"),
            method_id: r.get("method_id"),
            method_name: r.get("method_name"),
            test_item: r.get("test_item"),
            measurand: r.get("measurand"),
            measurement_range: r.get("measurement_range"),
            unit: r.get("unit"),
            status: r.get("status"),
            evaluator: r.get("evaluator"),
            evaluation_date: r.get("evaluation_date"),
            combined_uncertainty: r.get("combined_uncertainty"),
            expanded_uncertainty: r.get("expanded_uncertainty"),
            coverage_factor: r.get("coverage_factor"),
            confidence_level: r.get("confidence_level"),
            notes: r.get("notes"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "获取不确定度评定项目成功")),
        Err(e) => {
            tracing::error!("Failed to fetch uncertainty project: {}", e);
            Json(ApiResponse::error(500, "获取不确定度评定项目失败"))
        }
    }
}

pub async fn update_project(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateUncertaintyProjectRequest>,
) -> Json<ApiResponse<UncertaintyProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_uncertainty_projects 
        SET project_name = COALESCE($2, project_name),
            method_id = COALESCE($3, method_id),
            method_name = COALESCE($4, method_name),
            test_item = COALESCE($5, test_item),
            measurand = COALESCE($6, measurand),
            measurement_range = COALESCE($7, measurement_range),
            unit = COALESCE($8, unit),
            status = COALESCE($9, status),
            evaluator = COALESCE($10, evaluator),
            evaluation_date = COALESCE($11, evaluation_date),
            coverage_factor = COALESCE($12, coverage_factor),
            confidence_level = COALESCE($13, confidence_level),
            notes = COALESCE($14, notes),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, project_no, project_name, method_id, method_name, test_item,
                  measurand, measurement_range, unit, status, evaluator,
                  evaluation_date::TEXT, combined_uncertainty, expanded_uncertainty,
                  coverage_factor, confidence_level, notes, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(id)
    .bind(&req.project_name)
    .bind(&req.method_id)
    .bind(&req.method_name)
    .bind(&req.test_item)
    .bind(&req.measurand)
    .bind(&req.measurement_range)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(&req.evaluator)
    .bind(&req.evaluation_date)
    .bind(req.coverage_factor)
    .bind(req.confidence_level)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyProject {
            id: r.get("id"),
            project_no: r.get("project_no"),
            project_name: r.get("project_name"),
            method_id: r.get("method_id"),
            method_name: r.get("method_name"),
            test_item: r.get("test_item"),
            measurand: r.get("measurand"),
            measurement_range: r.get("measurement_range"),
            unit: r.get("unit"),
            status: r.get("status"),
            evaluator: r.get("evaluator"),
            evaluation_date: r.get("evaluation_date"),
            combined_uncertainty: r.get("combined_uncertainty"),
            expanded_uncertainty: r.get("expanded_uncertainty"),
            coverage_factor: r.get("coverage_factor"),
            confidence_level: r.get("confidence_level"),
            notes: r.get("notes"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "不确定度评定项目更新成功")),
        Err(e) => {
            tracing::error!("Failed to update uncertainty project: {}", e);
            Json(ApiResponse::error(500, "不确定度评定项目更新失败"))
        }
    }
}

pub async fn delete_project(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_uncertainty_projects WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "不确定度评定项目删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete uncertainty project: {}", e);
            Json(ApiResponse::error(500, "不确定度评定项目删除失败"))
        }
    }
}

pub async fn list_sources(
    State(state): State<crate::AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<UncertaintySource>>> {
    let id = match Uuid::parse_str(&project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id, project_id, source_name, source_type, description,
               distribution_type, sensitivity_coefficient, sort_order,
               created_at::TEXT, updated_at::TEXT
        FROM qa_lims_uncertainty_sources
        WHERE project_id = $1
        ORDER BY sort_order ASC, created_at ASC
        "#
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let sources: Vec<UncertaintySource> = rows
                .into_iter()
                .map(|row| UncertaintySource {
                    id: row.get("id"),
                    project_id: row.get("project_id"),
                    source_name: row.get("source_name"),
                    source_type: row.get("source_type"),
                    description: row.get("description"),
                    distribution_type: row.get("distribution_type"),
                    sensitivity_coefficient: row.get("sensitivity_coefficient"),
                    sort_order: row.get("sort_order"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(sources, "获取不确定度来源列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch uncertainty sources: {}", e);
            Json(ApiResponse::error(500, "获取不确定度来源列表失败"))
        }
    }
}

pub async fn create_source(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateUncertaintySourceRequest>,
) -> Json<ApiResponse<UncertaintySource>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let sort_order = req.sort_order.unwrap_or(0);

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_uncertainty_sources (
            project_id, source_name, source_type, description,
            distribution_type, sensitivity_coefficient, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, project_id, source_name, source_type, description,
                  distribution_type, sensitivity_coefficient, sort_order,
                  created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(project_id)
    .bind(&req.source_name)
    .bind(&req.source_type)
    .bind(&req.description)
    .bind(&req.distribution_type)
    .bind(req.sensitivity_coefficient)
    .bind(sort_order)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintySource {
            id: r.get("id"),
            project_id: r.get("project_id"),
            source_name: r.get("source_name"),
            source_type: r.get("source_type"),
            description: r.get("description"),
            distribution_type: r.get("distribution_type"),
            sensitivity_coefficient: r.get("sensitivity_coefficient"),
            sort_order: r.get("sort_order"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "不确定度来源创建成功")),
        Err(e) => {
            tracing::error!("Failed to create uncertainty source: {}", e);
            Json(ApiResponse::error(500, "不确定度来源创建失败"))
        }
    }
}

pub async fn update_source(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateUncertaintySourceRequest>,
) -> Json<ApiResponse<UncertaintySource>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的来源ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_uncertainty_sources 
        SET source_name = COALESCE($2, source_name),
            source_type = COALESCE($3, source_type),
            description = COALESCE($4, description),
            distribution_type = COALESCE($5, distribution_type),
            sensitivity_coefficient = COALESCE($6, sensitivity_coefficient),
            sort_order = COALESCE($7, sort_order),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, project_id, source_name, source_type, description,
                  distribution_type, sensitivity_coefficient, sort_order,
                  created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(id)
    .bind(&req.source_name)
    .bind(&req.source_type)
    .bind(&req.description)
    .bind(&req.distribution_type)
    .bind(req.sensitivity_coefficient)
    .bind(req.sort_order)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintySource {
            id: r.get("id"),
            project_id: r.get("project_id"),
            source_name: r.get("source_name"),
            source_type: r.get("source_type"),
            description: r.get("description"),
            distribution_type: r.get("distribution_type"),
            sensitivity_coefficient: r.get("sensitivity_coefficient"),
            sort_order: r.get("sort_order"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "不确定度来源更新成功")),
        Err(e) => {
            tracing::error!("Failed to update uncertainty source: {}", e);
            Json(ApiResponse::error(500, "不确定度来源更新失败"))
        }
    }
}

pub async fn delete_source(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的来源ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_uncertainty_sources WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "不确定度来源删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete uncertainty source: {}", e);
            Json(ApiResponse::error(500, "不确定度来源删除失败"))
        }
    }
}

pub async fn list_components(
    State(state): State<crate::AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<UncertaintyComponent>>> {
    let id = match Uuid::parse_str(&project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT c.id, c.project_id, c.source_id, s.source_name, c.component_type,
               c.component_name, c.standard_uncertainty, c.relative_uncertainty,
               c.sensitivity_coefficient, c.degrees_freedom, c.calculation_method,
               c.parameters, c.description, c.created_at::TEXT, c.updated_at::TEXT
        FROM qa_lims_uncertainty_components c
        LEFT JOIN qa_lims_uncertainty_sources s ON c.source_id = s.id
        WHERE c.project_id = $1
        ORDER BY c.created_at ASC
        "#
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let components: Vec<UncertaintyComponent> = rows
                .into_iter()
                .map(|row| UncertaintyComponent {
                    id: row.get("id"),
                    project_id: row.get("project_id"),
                    source_id: row.get("source_id"),
                    source_name: row.get("source_name"),
                    component_type: row.get("component_type"),
                    component_name: row.get("component_name"),
                    standard_uncertainty: row.get("standard_uncertainty"),
                    relative_uncertainty: row.get("relative_uncertainty"),
                    sensitivity_coefficient: row.get("sensitivity_coefficient"),
                    degrees_freedom: row.get("degrees_freedom"),
                    calculation_method: row.get("calculation_method"),
                    parameters: row.get("parameters"),
                    description: row.get("description"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(components, "获取不确定度分量列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch uncertainty components: {}", e);
            Json(ApiResponse::error(500, "获取不确定度分量列表失败"))
        }
    }
}

pub async fn create_component(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateUncertaintyComponentRequest>,
) -> Json<ApiResponse<UncertaintyComponent>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let source_id = match Uuid::parse_str(&req.source_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的来源ID")),
    };

    let source_row = sqlx::query(
        "SELECT source_name FROM qa_lims_uncertainty_sources WHERE id = $1"
    )
    .bind(source_id)
    .fetch_optional(&state.pool)
    .await;

    let source_name: Option<String> = match source_row {
        Ok(Some(row)) => Some(row.get("source_name")),
        Ok(None) => None,
        Err(_) => None,
    };

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_uncertainty_components (
            project_id, source_id, component_type, component_name,
            standard_uncertainty, relative_uncertainty, sensitivity_coefficient,
            degrees_freedom, calculation_method, parameters, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, project_id, source_id, $12 as source_name, component_type,
                  component_name, standard_uncertainty, relative_uncertainty,
                  sensitivity_coefficient, degrees_freedom, calculation_method,
                  parameters, description, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(project_id)
    .bind(source_id)
    .bind(&req.component_type)
    .bind(&req.component_name)
    .bind(req.standard_uncertainty)
    .bind(req.relative_uncertainty)
    .bind(req.sensitivity_coefficient)
    .bind(req.degrees_freedom)
    .bind(&req.calculation_method)
    .bind(&req.parameters)
    .bind(&req.description)
    .bind(source_name.as_deref())
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyComponent {
            id: r.get("id"),
            project_id: r.get("project_id"),
            source_id: r.get("source_id"),
            source_name: r.get("source_name"),
            component_type: r.get("component_type"),
            component_name: r.get("component_name"),
            standard_uncertainty: r.get("standard_uncertainty"),
            relative_uncertainty: r.get("relative_uncertainty"),
            sensitivity_coefficient: r.get("sensitivity_coefficient"),
            degrees_freedom: r.get("degrees_freedom"),
            calculation_method: r.get("calculation_method"),
            parameters: r.get("parameters"),
            description: r.get("description"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "不确定度分量创建成功")),
        Err(e) => {
            tracing::error!("Failed to create uncertainty component: {}", e);
            Json(ApiResponse::error(500, "不确定度分量创建失败"))
        }
    }
}

pub async fn update_component(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateUncertaintyComponentRequest>,
) -> Json<ApiResponse<UncertaintyComponent>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的分量ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_uncertainty_components 
        SET component_name = COALESCE($2, component_name),
            standard_uncertainty = COALESCE($3, standard_uncertainty),
            relative_uncertainty = COALESCE($4, relative_uncertainty),
            sensitivity_coefficient = COALESCE($5, sensitivity_coefficient),
            degrees_freedom = COALESCE($6, degrees_freedom),
            calculation_method = COALESCE($7, calculation_method),
            parameters = COALESCE($8, parameters),
            description = COALESCE($9, description),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, project_id, source_id, NULL as source_name, component_type,
                  component_name, standard_uncertainty, relative_uncertainty,
                  sensitivity_coefficient, degrees_freedom, calculation_method,
                  parameters, description, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(id)
    .bind(&req.component_name)
    .bind(req.standard_uncertainty)
    .bind(req.relative_uncertainty)
    .bind(req.sensitivity_coefficient)
    .bind(req.degrees_freedom)
    .bind(&req.calculation_method)
    .bind(&req.parameters)
    .bind(&req.description)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyComponent {
            id: r.get("id"),
            project_id: r.get("project_id"),
            source_id: r.get("source_id"),
            source_name: r.get("source_name"),
            component_type: r.get("component_type"),
            component_name: r.get("component_name"),
            standard_uncertainty: r.get("standard_uncertainty"),
            relative_uncertainty: r.get("relative_uncertainty"),
            sensitivity_coefficient: r.get("sensitivity_coefficient"),
            degrees_freedom: r.get("degrees_freedom"),
            calculation_method: r.get("calculation_method"),
            parameters: r.get("parameters"),
            description: r.get("description"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "不确定度分量更新成功")),
        Err(e) => {
            tracing::error!("Failed to update uncertainty component: {}", e);
            Json(ApiResponse::error(500, "不确定度分量更新失败"))
        }
    }
}

pub async fn delete_component(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的分量ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_uncertainty_components WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "不确定度分量删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete uncertainty component: {}", e);
            Json(ApiResponse::error(500, "不确定度分量删除失败"))
        }
    }
}

pub async fn calculate_type_a(
    State(state): State<crate::AppState>,
    Json(req): Json<TypeACalculationRequest>,
) -> Json<ApiResponse<UncertaintyComponent>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let source_id = match Uuid::parse_str(&req.source_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的来源ID")),
    };

    if req.measurements.is_empty() {
        return Json(ApiResponse::error(400, "测量数据不能为空"));
    }

    let n = req.measurements.len() as f64;
    let mean = req.measurements.iter().sum::<f64>() / n;

    let variance = if n > 1.0 {
        req.measurements.iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>() / (n - 1.0)
    } else {
        0.0
    };

    let std_dev = variance.sqrt();
    let standard_uncertainty = if n > 0.0 { std_dev / n.sqrt() } else { 0.0 };
    let degrees_freedom = if n > 1.0 { n - 1.0 } else { 0.0 };
    let sensitivity_coeff = req.sensitivity_coefficient.unwrap_or(1.0);

    let params = serde_json::json!({
        "measurements": req.measurements,
        "mean": mean,
        "standard_deviation": std_dev,
        "count": n
    });

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_uncertainty_components (
            project_id, source_id, component_type, component_name,
            standard_uncertainty, sensitivity_coefficient, degrees_freedom,
            calculation_method, parameters
        ) VALUES ($1, $2, 'type_a', $3, $4, $5, $6, 'statistics', $7)
        RETURNING id, project_id, source_id, NULL as source_name, component_type,
                  component_name, standard_uncertainty, relative_uncertainty,
                  sensitivity_coefficient, degrees_freedom, calculation_method,
                  parameters, description, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(project_id)
    .bind(source_id)
    .bind(&req.component_name)
    .bind(standard_uncertainty)
    .bind(sensitivity_coeff)
    .bind(degrees_freedom)
    .bind(&params)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyComponent {
            id: r.get("id"),
            project_id: r.get("project_id"),
            source_id: r.get("source_id"),
            source_name: r.get("source_name"),
            component_type: r.get("component_type"),
            component_name: r.get("component_name"),
            standard_uncertainty: r.get("standard_uncertainty"),
            relative_uncertainty: r.get("relative_uncertainty"),
            sensitivity_coefficient: r.get("sensitivity_coefficient"),
            degrees_freedom: r.get("degrees_freedom"),
            calculation_method: r.get("calculation_method"),
            parameters: r.get("parameters"),
            description: r.get("description"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "A类不确定度计算完成")),
        Err(e) => {
            tracing::error!("Failed to calculate Type A uncertainty: {}", e);
            Json(ApiResponse::error(500, "A类不确定度计算失败"))
        }
    }
}

pub async fn calculate_type_b(
    State(state): State<crate::AppState>,
    Json(req): Json<TypeBCalculationRequest>,
) -> Json<ApiResponse<UncertaintyComponent>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let source_id = match Uuid::parse_str(&req.source_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的来源ID")),
    };

    let divisor = match req.distribution_type.as_str() {
        "normal" => 1.0,
        "rectangular" | "uniform" => 3.0_f64.sqrt(),
        "triangular" => 6.0_f64.sqrt(),
        "arcsine" => 2.0_f64.sqrt(),
        _ => 3.0_f64.sqrt(),
    };

    let standard_uncertainty = req.uncertainty_value / divisor;
    let sensitivity_coeff = req.sensitivity_coefficient.unwrap_or(1.0);
    let degrees_freedom = req.degrees_freedom.unwrap_or(f64::INFINITY);

    let params = serde_json::json!({
        "input_uncertainty": req.uncertainty_value,
        "distribution_type": req.distribution_type,
        "divisor": divisor
    });

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_uncertainty_components (
            project_id, source_id, component_type, component_name,
            standard_uncertainty, sensitivity_coefficient, degrees_freedom,
            calculation_method, parameters, description
        ) VALUES ($1, $2, 'type_b', $3, $4, $5, $6, 'distribution', $7, $8)
        RETURNING id, project_id, source_id, NULL as source_name, component_type,
                  component_name, standard_uncertainty, relative_uncertainty,
                  sensitivity_coefficient, degrees_freedom, calculation_method,
                  parameters, description, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(project_id)
    .bind(source_id)
    .bind(&req.component_name)
    .bind(standard_uncertainty)
    .bind(sensitivity_coeff)
    .bind(degrees_freedom)
    .bind(&params)
    .bind(&req.description)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(UncertaintyComponent {
            id: r.get("id"),
            project_id: r.get("project_id"),
            source_id: r.get("source_id"),
            source_name: r.get("source_name"),
            component_type: r.get("component_type"),
            component_name: r.get("component_name"),
            standard_uncertainty: r.get("standard_uncertainty"),
            relative_uncertainty: r.get("relative_uncertainty"),
            sensitivity_coefficient: r.get("sensitivity_coefficient"),
            degrees_freedom: r.get("degrees_freedom"),
            calculation_method: r.get("calculation_method"),
            parameters: r.get("parameters"),
            description: r.get("description"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }, "B类不确定度计算完成")),
        Err(e) => {
            tracing::error!("Failed to calculate Type B uncertainty: {}", e);
            Json(ApiResponse::error(500, "B类不确定度计算失败"))
        }
    }
}

pub async fn calculate_combined(
    State(state): State<crate::AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let rows = sqlx::query(
        "SELECT standard_uncertainty, sensitivity_coefficient, degrees_freedom FROM qa_lims_uncertainty_components WHERE project_id = $1"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    let components = match rows {
        Ok(rows) => rows,
        Err(e) => return Json(ApiResponse::error(500, &format!("查询分量失败: {}", e))),
    };

    if components.is_empty() {
        return Json(ApiResponse::error(400, "没有可计算的不确定度分量"));
    }

    let mut combined_var = 0.0;
    let mut numerator = 0.0;
    let mut denominator = 0.0;

    for row in &components {
        let u: Option<f64> = row.get("standard_uncertainty");
        let c: Option<f64> = row.get("sensitivity_coefficient");
        let v: Option<f64> = row.get("degrees_freedom");

        let ui = u.unwrap_or(0.0);
        let ci = c.unwrap_or(1.0);
        let vi = v.unwrap_or(f64::INFINITY);

        let uici = ci * ui;
        combined_var += uici.powi(2);

        if vi.is_finite() && vi > 0.0 && uici > 0.0 {
            numerator += uici.powi(4);
            denominator += uici.powi(4) / vi;
        }
    }

    let combined_uncertainty = combined_var.sqrt();
    let effective_dof = if denominator > 0.0 {
        numerator / denominator
    } else {
        f64::INFINITY
    };

    let project_row = sqlx::query(
        "SELECT coverage_factor FROM qa_lims_uncertainty_projects WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let coverage_factor = match project_row {
        Ok(Some(row)) => row.get::<Option<f64>, _>("coverage_factor").unwrap_or(2.0),
        _ => 2.0,
    };

    let expanded_uncertainty = combined_uncertainty * coverage_factor;

    let _ = sqlx::query(
        r#"
        UPDATE qa_lims_uncertainty_projects 
        SET combined_uncertainty = $2, expanded_uncertainty = $3, updated_at = NOW()
        WHERE id = $1
        "#
    )
    .bind(id)
    .bind(combined_uncertainty)
    .bind(expanded_uncertainty)
    .execute(&state.pool)
    .await;

    let result = serde_json::json!({
        "combined_uncertainty": combined_uncertainty,
        "expanded_uncertainty": expanded_uncertainty,
        "coverage_factor": coverage_factor,
        "effective_degrees_of_freedom": effective_dof,
        "component_count": components.len()
    });

    Json(ApiResponse::success(result, "合成不确定度计算完成"))
}

pub async fn generate_report(
    State(state): State<crate::AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let project_row = sqlx::query(
        "SELECT id, project_no, project_name, method_id, method_name, test_item, measurand, measurement_range, unit, status, evaluator, evaluation_date::TEXT, combined_uncertainty, expanded_uncertainty, coverage_factor, confidence_level, notes, created_at::TEXT FROM qa_lims_uncertainty_projects WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let project = match project_row {
        Ok(Some(row)) => {
            serde_json::json!({
                "id": row.get::<String, _>("id"),
                "project_no": row.get::<String, _>("project_no"),
                "project_name": row.get::<String, _>("project_name"),
                "method_id": row.get::<Option<String>, _>("method_id"),
                "method_name": row.get::<Option<String>, _>("method_name"),
                "test_item": row.get::<Option<String>, _>("test_item"),
                "measurand": row.get::<Option<String>, _>("measurand"),
                "measurement_range": row.get::<Option<String>, _>("measurement_range"),
                "unit": row.get::<Option<String>, _>("unit"),
                "status": row.get::<String, _>("status"),
                "evaluator": row.get::<Option<String>, _>("evaluator"),
                "evaluation_date": row.get::<Option<String>, _>("evaluation_date"),
                "combined_uncertainty": row.get::<Option<f64>, _>("combined_uncertainty"),
                "expanded_uncertainty": row.get::<Option<f64>, _>("expanded_uncertainty"),
                "coverage_factor": row.get::<Option<f64>, _>("coverage_factor"),
                "confidence_level": row.get::<Option<f64>, _>("confidence_level"),
                "notes": row.get::<Option<String>, _>("notes"),
                "created_at": row.get::<Option<String>, _>("created_at"),
            })
        }
        Ok(None) => return Json(ApiResponse::error(404, "不确定度评定项目不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询项目失败: {}", e))),
    };

    let source_rows = sqlx::query(
        "SELECT id, source_name, source_type, description, distribution_type, sensitivity_coefficient, sort_order FROM qa_lims_uncertainty_sources WHERE project_id = $1 ORDER BY sort_order ASC"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    let sources: Vec<serde_json::Value> = match source_rows {
        Ok(rows) => rows.iter()
            .map(|row| serde_json::json!({
                "id": row.get::<String, _>("id"),
                "source_name": row.get::<String, _>("source_name"),
                "source_type": row.get::<String, _>("source_type"),
                "description": row.get::<Option<String>, _>("description"),
                "distribution_type": row.get::<Option<String>, _>("distribution_type"),
                "sensitivity_coefficient": row.get::<Option<f64>, _>("sensitivity_coefficient"),
            }))
            .collect(),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询来源失败: {}", e))),
    };

    let component_rows = sqlx::query(
        r#"
        SELECT c.id, c.component_type, c.component_name, c.standard_uncertainty,
               c.relative_uncertainty, c.sensitivity_coefficient, c.degrees_freedom,
               c.calculation_method, s.source_name
        FROM qa_lims_uncertainty_components c
        LEFT JOIN qa_lims_uncertainty_sources s ON c.source_id = s.id
        WHERE c.project_id = $1
        ORDER BY c.created_at ASC
        "#
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    let components: Vec<serde_json::Value> = match component_rows {
        Ok(rows) => rows.iter()
            .map(|row| serde_json::json!({
                "id": row.get::<String, _>("id"),
                "component_type": row.get::<String, _>("component_type"),
                "component_name": row.get::<String, _>("component_name"),
                "source_name": row.get::<Option<String>, _>("source_name"),
                "standard_uncertainty": row.get::<Option<f64>, _>("standard_uncertainty"),
                "relative_uncertainty": row.get::<Option<f64>, _>("relative_uncertainty"),
                "sensitivity_coefficient": row.get::<Option<f64>, _>("sensitivity_coefficient"),
                "degrees_freedom": row.get::<Option<f64>, _>("degrees_freedom"),
                "calculation_method": row.get::<Option<String>, _>("calculation_method"),
            }))
            .collect(),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询分量失败: {}", e))),
    };

    let report = serde_json::json!({
        "report_title": "测量不确定度评定报告",
        "report_no": format!("RPT-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "project": project,
        "sources": sources,
        "components": components,
        "summary": {
            "source_count": sources.len(),
            "component_count": components.len(),
        },
        "sections": [
            {
                "title": "1. 概述",
                "content": "本报告对测量不确定度进行了评定，分析了各种不确定度来源，并计算了合成不确定度和扩展不确定度。"
            },
            {
                "title": "2. 不确定度来源分析",
                "content": "通过对测量过程的分析，识别了主要的不确定度来源，包括人员、设备、环境、方法、材料等方面。"
            },
            {
                "title": "3. 不确定度分量评定",
                "content": "采用A类和B类评定方法对各不确定度分量进行了评定。"
            },
            {
                "title": "4. 合成不确定度",
                "content": "根据各分量的标准不确定度和灵敏系数，采用方和根法计算合成不确定度。"
            },
            {
                "title": "5. 扩展不确定度",
                "content": "取包含因子k=2（约95%置信概率），计算扩展不确定度。"
            },
            {
                "title": "6. 结论",
                "content": "根据评定结果，给出最终的扩展不确定度。"
            }
        ]
    });

    Json(ApiResponse::success(report, "不确定度评定报告生成成功"))
}
