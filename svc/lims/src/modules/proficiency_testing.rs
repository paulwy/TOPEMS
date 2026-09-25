use axum::{
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/pt-plans", get(list_plans).post(create_plan))
        .route(
            "/pt-plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .route("/pt-plans/{id}/samples", get(list_plan_samples))
        .route("/pt-plans/{id}/results", get(list_plan_results))
        .route("/pt-plans/{id}/evaluations", get(list_plan_evaluations))
        .route(
            "/pt-plans/{id}/corrective-actions",
            get(list_plan_corrective_actions),
        )
        .route("/pt-samples/receive", post(receive_sample))
        .route("/pt-results", post(submit_result))
        .route("/pt-evaluations", post(evaluate_result))
        .route("/pt-corrective-actions", post(create_corrective_action))
        .route("/pt-corrective-actions/{id}", put(update_corrective_action))
}

#[derive(Debug, Deserialize)]
pub struct PtPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub year: Option<String>,
    pub plan_name: Option<String>,
    pub provider: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProficiencyTestingPlan {
    pub id: String,
    pub tenant_id: String,
    pub plan_no: String,
    pub plan_name: String,
    pub provider: Option<String>,
    pub test_item: Option<String>,
    pub test_method: Option<String>,
    pub plan_year: Option<String>,
    pub sample_type: Option<String>,
    pub expected_result: Option<serde_json::Value>,
    pub registration_date: Option<String>,
    pub test_deadline: Option<String>,
    pub report_deadline: Option<String>,
    pub status: String,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePtPlanRequest {
    pub plan_name: String,
    pub provider: Option<String>,
    pub test_item: Option<String>,
    pub test_method: Option<String>,
    pub plan_year: Option<String>,
    pub sample_type: Option<String>,
    pub expected_result: Option<serde_json::Value>,
    pub registration_date: Option<String>,
    pub test_deadline: Option<String>,
    pub report_deadline: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePtPlanRequest {
    pub plan_name: Option<String>,
    pub provider: Option<String>,
    pub test_item: Option<String>,
    pub test_method: Option<String>,
    pub plan_year: Option<String>,
    pub sample_type: Option<String>,
    pub expected_result: Option<serde_json::Value>,
    pub registration_date: Option<String>,
    pub test_deadline: Option<String>,
    pub report_deadline: Option<String>,
    pub status: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PtSample {
    pub id: String,
    pub tenant_id: String,
    pub plan_id: String,
    pub plan_no: String,
    pub plan_name: String,
    pub sample_code: String,
    pub sample_name: Option<String>,
    pub received_date: Option<String>,
    pub received_by: Option<String>,
    pub storage_condition: Option<String>,
    pub sample_status: String,
    pub notes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PtSampleReceiveRequest {
    pub plan_id: String,
    pub sample_code: String,
    pub sample_name: Option<String>,
    pub received_by: Option<String>,
    pub storage_condition: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PtResult {
    pub id: String,
    pub tenant_id: String,
    pub plan_id: String,
    pub plan_no: String,
    pub sample_id: String,
    pub sample_code: String,
    pub test_item: String,
    pub test_result: Option<f64>,
    pub result_unit: Option<String>,
    pub test_date: Option<String>,
    pub tested_by: Option<String>,
    pub instrument: Option<String>,
    pub test_method: Option<String>,
    pub replicate_results: Option<serde_json::Value>,
    pub mean_value: Option<f64>,
    pub standard_deviation: Option<f64>,
    pub coefficient_variation: Option<f64>,
    pub notes: Option<String>,
    pub submitted_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePtResultRequest {
    pub plan_id: String,
    pub sample_id: String,
    pub test_item: String,
    pub test_result: Option<f64>,
    pub result_unit: Option<String>,
    pub test_date: Option<String>,
    pub tested_by: Option<String>,
    pub instrument: Option<String>,
    pub test_method: Option<String>,
    pub replicate_results: Option<serde_json::Value>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PtEvaluation {
    pub id: String,
    pub tenant_id: String,
    pub plan_id: String,
    pub plan_no: String,
    pub sample_id: String,
    pub sample_code: String,
    pub test_item: String,
    pub test_result: Option<f64>,
    pub assigned_value: Option<f64>,
    pub standard_deviation: Option<f64>,
    pub z_score: Option<f64>,
    pub en_score: Option<f64>,
    pub measurement_uncertainty: Option<f64>,
    pub reference_uncertainty: Option<f64>,
    pub evaluation_method: Option<String>,
    pub evaluation_result: Option<String>,
    pub evaluated_by: Option<String>,
    pub evaluated_at: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PtEvaluateRequest {
    pub plan_id: String,
    pub result_id: String,
    pub assigned_value: f64,
    pub standard_deviation: Option<f64>,
    pub measurement_uncertainty: Option<f64>,
    pub reference_uncertainty: Option<f64>,
    pub evaluation_method: Option<String>,
    pub evaluated_by: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PtCorrectiveAction {
    pub id: String,
    pub tenant_id: String,
    pub plan_id: String,
    pub plan_no: String,
    pub evaluation_id: String,
    pub unsatisfactory_item: String,
    pub root_cause: Option<String>,
    pub corrective_measures: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub verification_result: Option<String>,
    pub verified_by: Option<String>,
    pub verified_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePtCorrectiveActionRequest {
    pub plan_id: String,
    pub evaluation_id: String,
    pub unsatisfactory_item: String,
    pub root_cause: Option<String>,
    pub corrective_measures: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePtCorrectiveActionRequest {
    pub root_cause: Option<String>,
    pub corrective_measures: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
    pub status: Option<String>,
    pub verification_result: Option<String>,
    pub verified_by: Option<String>,
}

pub async fn list_plans(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<PtPlanQuery>,
) -> Json<ApiResponse<Vec<ProficiencyTestingPlan>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.status.as_ref(), query.year.as_ref(), query.plan_name.as_ref(), query.provider.as_ref()) {
        (Some(_), Some(_), Some(_), Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND plan_year = $2 AND plan_name LIKE $3 AND provider LIKE $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6",
        (Some(_), Some(_), Some(_), None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND plan_year = $2 AND plan_name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), Some(_), None, Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND plan_year = $2 AND provider LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), Some(_), None, None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND plan_year = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, Some(_), Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND plan_name LIKE $2 AND provider LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None, Some(_), None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND plan_name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, None, Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 AND provider LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, None, None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, Some(_), Some(_), Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND plan_year = $1 AND plan_name LIKE $2 AND provider LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (None, Some(_), Some(_), None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND plan_year = $1 AND plan_name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_), None, Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND plan_year = $1 AND provider LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_), None, None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND plan_year = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, Some(_), Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND plan_name LIKE $1 AND provider LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None, Some(_), None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND plan_name LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, None, Some(_)) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND provider LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, None, None) => "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    };

    let mut query_builder = sqlx::query(sql);
    match (
        query.status.as_ref(),
        query.year.as_ref(),
        query.plan_name.as_ref(),
        query.provider.as_ref(),
    ) {
        (Some(st), Some(yr), Some(pn), Some(pr)) => {
            query_builder = query_builder
                .bind(st)
                .bind(yr)
                .bind(format!("%{}%", pn))
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(yr), Some(pn), None) => {
            query_builder = query_builder
                .bind(st)
                .bind(yr)
                .bind(format!("%{}%", pn))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(yr), None, Some(pr)) => {
            query_builder = query_builder
                .bind(st)
                .bind(yr)
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(yr), None, None) => {
            query_builder = query_builder.bind(st).bind(yr).bind(page_size).bind(offset);
        }
        (Some(st), None, Some(pn), Some(pr)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", pn))
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, Some(pn), None) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", pn))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, None, Some(pr)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, None, None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(yr), Some(pn), Some(pr)) => {
            query_builder = query_builder
                .bind(yr)
                .bind(format!("%{}%", pn))
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(yr), Some(pn), None) => {
            query_builder = query_builder
                .bind(yr)
                .bind(format!("%{}%", pn))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(yr), None, Some(pr)) => {
            query_builder = query_builder
                .bind(yr)
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(yr), None, None) => {
            query_builder = query_builder.bind(yr).bind(page_size).bind(offset);
        }
        (None, None, Some(pn), Some(pr)) => {
            query_builder = query_builder
                .bind(format!("%{}%", pn))
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, Some(pn), None) => {
            query_builder = query_builder
                .bind(format!("%{}%", pn))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None, Some(pr)) => {
            query_builder = query_builder
                .bind(format!("%{}%", pr))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let plans = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| ProficiencyTestingPlan {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                plan_no: row.get("plan_no"),
                plan_name: row.get("plan_name"),
                provider: row.get("provider"),
                test_item: row.get("test_item"),
                test_method: row.get("test_method"),
                plan_year: row.get("plan_year"),
                sample_type: row.get("sample_type"),
                expected_result: row.get("expected_result"),
                registration_date: row.get("registration_date"),
                test_deadline: row.get("test_deadline"),
                report_deadline: row.get("report_deadline"),
                status: row.get("status"),
                contact_person: row.get("contact_person"),
                contact_phone: row.get("contact_phone"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match plans {
        Ok(data) => Json(ApiResponse::success(data, "获取能力验证计划列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch PT plans: {}", e);
            Json(ApiResponse::error(500, "获取能力验证计划列表失败"))
        }
    }
}

pub async fn create_plan(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreatePtPlanRequest>,
) -> Json<ApiResponse<ProficiencyTestingPlan>> {
    let plan_no = format!(
        "PT-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_pt_plans (
            plan_no, plan_name, provider, test_item, test_method, plan_year,
            sample_type, expected_result, registration_date, test_deadline,
            report_deadline, status, contact_person, contact_phone, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'planning', $12, $13, $14)
        RETURNING id::TEXT, tenant_id::TEXT, plan_no, plan_name, provider, test_item, test_method, plan_year,
                  sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT,
                  report_deadline::TEXT, status, contact_person, contact_phone, notes,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(&plan_no)
    .bind(&req.plan_name)
    .bind(&req.provider)
    .bind(&req.test_item)
    .bind(&req.test_method)
    .bind(&req.plan_year)
    .bind(&req.sample_type)
    .bind(&req.expected_result)
    .bind(req.registration_date.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .bind(req.test_deadline.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .bind(req.report_deadline.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .bind(&req.contact_person)
    .bind(&req.contact_phone)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ProficiencyTestingPlan {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_no: r.get("plan_no"),
                plan_name: r.get("plan_name"),
                provider: r.get("provider"),
                test_item: r.get("test_item"),
                test_method: r.get("test_method"),
                plan_year: r.get("plan_year"),
                sample_type: r.get("sample_type"),
                expected_result: r.get("expected_result"),
                registration_date: r.get("registration_date"),
                test_deadline: r.get("test_deadline"),
                report_deadline: r.get("report_deadline"),
                status: r.get("status"),
                contact_person: r.get("contact_person"),
                contact_phone: r.get("contact_phone"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "能力验证计划创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create PT plan: {}", e);
            Json(ApiResponse::error(500, "能力验证计划创建失败"))
        }
    }
}

pub async fn get_plan(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ProficiencyTestingPlan>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let row = sqlx::query(
        "SELECT id, plan_no, plan_name, provider, test_item, test_method, plan_year, sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT, report_deadline::TEXT, status, contact_person, contact_phone, notes, created_at::TEXT, updated_at::TEXT FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ProficiencyTestingPlan {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_no: r.get("plan_no"),
                plan_name: r.get("plan_name"),
                provider: r.get("provider"),
                test_item: r.get("test_item"),
                test_method: r.get("test_method"),
                plan_year: r.get("plan_year"),
                sample_type: r.get("sample_type"),
                expected_result: r.get("expected_result"),
                registration_date: r.get("registration_date"),
                test_deadline: r.get("test_deadline"),
                report_deadline: r.get("report_deadline"),
                status: r.get("status"),
                contact_person: r.get("contact_person"),
                contact_phone: r.get("contact_phone"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取能力验证计划成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch PT plan: {}", e);
            Json(ApiResponse::error(500, "获取能力验证计划失败"))
        }
    }
}

pub async fn update_plan(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdatePtPlanRequest>,
) -> Json<ApiResponse<ProficiencyTestingPlan>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_pt_plans 
        SET plan_name = COALESCE($2, plan_name),
            provider = COALESCE($3, provider),
            test_item = COALESCE($4, test_item),
            test_method = COALESCE($5, test_method),
            plan_year = COALESCE($6, plan_year),
            sample_type = COALESCE($7, sample_type),
            expected_result = COALESCE($8, expected_result),
            registration_date = COALESCE($9, registration_date),
            test_deadline = COALESCE($10, test_deadline),
            report_deadline = COALESCE($11, report_deadline),
            status = COALESCE($12, status),
            contact_person = COALESCE($13, contact_person),
            contact_phone = COALESCE($14, contact_phone),
            notes = COALESCE($15, notes),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id::TEXT, tenant_id::TEXT, plan_no, plan_name, provider, test_item, test_method, plan_year,
                  sample_type, expected_result, registration_date::TEXT, test_deadline::TEXT,
                  report_deadline::TEXT, status, contact_person, contact_phone, notes,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.plan_name)
    .bind(&req.provider)
    .bind(&req.test_item)
    .bind(&req.test_method)
    .bind(&req.plan_year)
    .bind(&req.sample_type)
    .bind(&req.expected_result)
    .bind(req.registration_date.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .bind(req.test_deadline.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .bind(req.report_deadline.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .bind(&req.status)
    .bind(&req.contact_person)
    .bind(&req.contact_phone)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ProficiencyTestingPlan {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_no: r.get("plan_no"),
                plan_name: r.get("plan_name"),
                provider: r.get("provider"),
                test_item: r.get("test_item"),
                test_method: r.get("test_method"),
                plan_year: r.get("plan_year"),
                sample_type: r.get("sample_type"),
                expected_result: r.get("expected_result"),
                registration_date: r.get("registration_date"),
                test_deadline: r.get("test_deadline"),
                report_deadline: r.get("report_deadline"),
                status: r.get("status"),
                contact_person: r.get("contact_person"),
                contact_phone: r.get("contact_phone"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "能力验证计划更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update PT plan: {}", e);
            Json(ApiResponse::error(500, "能力验证计划更新失败"))
        }
    }
}

pub async fn delete_plan(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let result = sqlx::query("UPDATE qa_lims_pt_plans SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "能力验证计划删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete PT plan: {}", e);
            Json(ApiResponse::error(500, "能力验证计划删除失败"))
        }
    }
}

pub async fn receive_sample(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<PtSampleReceiveRequest>,
) -> Json<ApiResponse<PtSample>> {
    let plan_id = match Uuid::parse_str(&req.plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan_row = sqlx::query(
        "SELECT plan_no, plan_name FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(plan_id)
    .fetch_optional(&state.pool)
    .await;

    let (plan_no, plan_name) = match plan_row {
        Ok(Some(row)) => (
            row.get::<String, _>("plan_no"),
            row.get::<String, _>("plan_name"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "能力验证计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询计划失败: {}", e))),
    };

    let received_date = chrono::Utc::now().to_rfc3339();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_pt_samples (
            plan_id, plan_no, plan_name, sample_code, sample_name,
            received_date, received_by, storage_condition, sample_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'received', $9)
        RETURNING id, plan_id, plan_no, plan_name, sample_code, sample_name,
                  received_date::TEXT, received_by, storage_condition, sample_status,
                  notes, created_at::TEXT
        "#,
    )
    .bind(plan_id)
    .bind(&plan_no)
    .bind(&plan_name)
    .bind(&req.sample_code)
    .bind(&req.sample_name)
    .bind(&received_date)
    .bind(&req.received_by)
    .bind(&req.storage_condition)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    let _ = sqlx::query(
        "UPDATE qa_lims_pt_plans SET status = 'sample_received', updated_at = NOW() WHERE id = $1",
    )
    .bind(plan_id)
    .execute(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            PtSample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_id: r.get("plan_id"),
                plan_no: r.get("plan_no"),
                plan_name: r.get("plan_name"),
                sample_code: r.get("sample_code"),
                sample_name: r.get("sample_name"),
                received_date: r.get("received_date"),
                received_by: r.get("received_by"),
                storage_condition: r.get("storage_condition"),
                sample_status: r.get("sample_status"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
            },
            "能力验证样品接收登记成功",
        )),
        Err(e) => {
            tracing::error!("Failed to receive PT sample: {}", e);
            Json(ApiResponse::error(500, "能力验证样品接收登记失败"))
        }
    }
}

pub async fn list_plan_samples(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<PtSample>>> {
    let id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id, plan_id, plan_no, plan_name, sample_code, sample_name,
               received_date::TEXT, received_by, storage_condition, sample_status,
               notes, created_at::TEXT
        FROM qa_lims_pt_samples
        WHERE plan_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let samples: Vec<PtSample> = rows
                .into_iter()
                .map(|row| PtSample {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    plan_id: row.get("plan_id"),
                    plan_no: row.get("plan_no"),
                    plan_name: row.get("plan_name"),
                    sample_code: row.get("sample_code"),
                    sample_name: row.get("sample_name"),
                    received_date: row.get("received_date"),
                    received_by: row.get("received_by"),
                    storage_condition: row.get("storage_condition"),
                    sample_status: row.get("sample_status"),
                    notes: row.get("notes"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(samples, "获取能力验证样品列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch PT samples: {}", e);
            Json(ApiResponse::error(500, "获取能力验证样品列表失败"))
        }
    }
}

pub async fn submit_result(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreatePtResultRequest>,
) -> Json<ApiResponse<PtResult>> {
    let plan_id = match Uuid::parse_str(&req.plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };

    let plan_row =
        sqlx::query("SELECT plan_no FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND id = $1")
            .bind(plan_id)
            .fetch_optional(&state.pool)
            .await;

    let plan_no = match plan_row {
        Ok(Some(row)) => row.get::<String, _>("plan_no"),
        Ok(None) => return Json(ApiResponse::error(404, "能力验证计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询计划失败: {}", e))),
    };

    let sample_row = sqlx::query("SELECT sample_code FROM qa_lims_pt_samples WHERE id = $1")
        .bind(sample_id)
        .fetch_optional(&state.pool)
        .await;

    let sample_code = match sample_row {
        Ok(Some(row)) => row.get::<String, _>("sample_code"),
        Ok(None) => return Json(ApiResponse::error(404, "能力验证样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let (mean_val, std_dev, cv) = if let Some(replicates) = &req.replicate_results {
        if let Some(arr) = replicates.as_array() {
            let values: Vec<f64> = arr.iter().filter_map(|v| v.as_f64()).collect();
            if !values.is_empty() {
                let mean = values.iter().sum::<f64>() / values.len() as f64;
                let variance =
                    values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / values.len() as f64;
                let std = variance.sqrt();
                let coef_var = if mean != 0.0 {
                    (std / mean) * 100.0
                } else {
                    0.0
                };
                (Some(mean), Some(std), Some(coef_var))
            } else {
                (None, None, None)
            }
        } else {
            (None, None, None)
        }
    } else {
        (None, None, None)
    };

    let test_result = req.test_result.or(mean_val);

    let submitted_at = chrono::Utc::now().to_rfc3339();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_pt_results (
            plan_id, plan_no, sample_id, sample_code, test_item, test_result,
            result_unit, test_date, tested_by, instrument, test_method,
            replicate_results, mean_value, standard_deviation, coefficient_variation,
            notes, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, plan_id, plan_no, sample_id, sample_code, test_item, test_result,
                  result_unit, test_date::TEXT, tested_by, instrument, test_method,
                  replicate_results, mean_value, standard_deviation, coefficient_variation,
                  notes, submitted_at::TEXT, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(plan_id)
    .bind(&plan_no)
    .bind(sample_id)
    .bind(&sample_code)
    .bind(&req.test_item)
    .bind(test_result)
    .bind(&req.result_unit)
    .bind(&req.test_date)
    .bind(&req.tested_by)
    .bind(&req.instrument)
    .bind(&req.test_method)
    .bind(&req.replicate_results)
    .bind(mean_val)
    .bind(std_dev)
    .bind(cv)
    .bind(&req.notes)
    .bind(&submitted_at)
    .fetch_one(&state.pool)
    .await;

    let _ = sqlx::query(
        "UPDATE qa_lims_pt_plans SET status = 'testing', updated_at = NOW() WHERE id = $1",
    )
    .bind(plan_id)
    .execute(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            PtResult {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_id: r.get("plan_id"),
                plan_no: r.get("plan_no"),
                sample_id: r.get("sample_id"),
                sample_code: r.get("sample_code"),
                test_item: r.get("test_item"),
                test_result: r.get("test_result"),
                result_unit: r.get("result_unit"),
                test_date: r.get("test_date"),
                tested_by: r.get("tested_by"),
                instrument: r.get("instrument"),
                test_method: r.get("test_method"),
                replicate_results: r.get("replicate_results"),
                mean_value: r.get("mean_value"),
                standard_deviation: r.get("standard_deviation"),
                coefficient_variation: r.get("coefficient_variation"),
                notes: r.get("notes"),
                submitted_at: r.get("submitted_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "能力验证结果录入成功",
        )),
        Err(e) => {
            tracing::error!("Failed to submit PT result: {}", e);
            Json(ApiResponse::error(500, "能力验证结果录入失败"))
        }
    }
}

pub async fn list_plan_results(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<PtResult>>> {
    let id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id, plan_id, plan_no, sample_id, sample_code, test_item, test_result,
               result_unit, test_date::TEXT, tested_by, instrument, test_method,
               replicate_results, mean_value, standard_deviation, coefficient_variation,
               notes, submitted_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM qa_lims_pt_results
        WHERE plan_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let results: Vec<PtResult> = rows
                .into_iter()
                .map(|row| PtResult {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    plan_id: row.get("plan_id"),
                    plan_no: row.get("plan_no"),
                    sample_id: row.get("sample_id"),
                    sample_code: row.get("sample_code"),
                    test_item: row.get("test_item"),
                    test_result: row.get("test_result"),
                    result_unit: row.get("result_unit"),
                    test_date: row.get("test_date"),
                    tested_by: row.get("tested_by"),
                    instrument: row.get("instrument"),
                    test_method: row.get("test_method"),
                    replicate_results: row.get("replicate_results"),
                    mean_value: row.get("mean_value"),
                    standard_deviation: row.get("standard_deviation"),
                    coefficient_variation: row.get("coefficient_variation"),
                    notes: row.get("notes"),
                    submitted_at: row.get("submitted_at"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(results, "获取能力验证结果列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch PT results: {}", e);
            Json(ApiResponse::error(500, "获取能力验证结果列表失败"))
        }
    }
}

pub async fn evaluate_result(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<PtEvaluateRequest>,
) -> Json<ApiResponse<PtEvaluation>> {
    let plan_id = match Uuid::parse_str(&req.plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let result_id = match Uuid::parse_str(&req.result_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的结果ID")),
    };

    let result_row = sqlx::query(
        "SELECT plan_no, sample_id, sample_code, test_item, test_result FROM qa_lims_pt_results WHERE id = $1"
    )
    .bind(result_id)
    .fetch_optional(&state.pool)
    .await;

    let (plan_no, sample_id, sample_code, test_item, test_result) = match result_row {
        Ok(Some(row)) => (
            row.get::<String, _>("plan_no"),
            row.get::<Uuid, _>("sample_id"),
            row.get::<String, _>("sample_code"),
            row.get::<String, _>("test_item"),
            row.get::<Option<f64>, _>("test_result"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "能力验证结果不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询结果失败: {}", e))),
    };

    let result_val = test_result.unwrap_or(0.0);

    let z_score = compute_z_score(result_val, req.assigned_value, req.standard_deviation);
    let en_score = compute_en_score(
        result_val,
        req.assigned_value,
        req.measurement_uncertainty,
        req.reference_uncertainty,
    );

    let eval_method = req
        .evaluation_method
        .clone()
        .unwrap_or_else(|| "z_score".to_string());

    let evaluation_result = evaluate_pt_result(z_score, en_score, &eval_method);

    let evaluated_at = chrono::Utc::now().to_rfc3339();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_pt_evaluations (
            plan_id, plan_no, sample_id, sample_code, test_item, test_result,
            assigned_value, standard_deviation, z_score, en_score,
            measurement_uncertainty, reference_uncertainty, evaluation_method,
            evaluation_result, evaluated_by, evaluated_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, plan_id, plan_no, sample_id, sample_code, test_item, test_result,
                  assigned_value, standard_deviation, z_score, en_score,
                  measurement_uncertainty, reference_uncertainty, evaluation_method,
                  evaluation_result, evaluated_by, evaluated_at::TEXT, notes, created_at::TEXT
        "#,
    )
    .bind(plan_id)
    .bind(&plan_no)
    .bind(sample_id)
    .bind(&sample_code)
    .bind(&test_item)
    .bind(test_result)
    .bind(req.assigned_value)
    .bind(req.standard_deviation)
    .bind(z_score)
    .bind(en_score)
    .bind(req.measurement_uncertainty)
    .bind(req.reference_uncertainty)
    .bind(&eval_method)
    .bind(&evaluation_result)
    .bind(&req.evaluated_by)
    .bind(&evaluated_at)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    let _ = sqlx::query(
        "UPDATE qa_lims_pt_plans SET status = 'evaluated', updated_at = NOW() WHERE id = $1",
    )
    .bind(plan_id)
    .execute(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            PtEvaluation {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_id: r.get("plan_id"),
                plan_no: r.get("plan_no"),
                sample_id: r.get("sample_id"),
                sample_code: r.get("sample_code"),
                test_item: r.get("test_item"),
                test_result: r.get("test_result"),
                assigned_value: r.get("assigned_value"),
                standard_deviation: r.get("standard_deviation"),
                z_score: r.get("z_score"),
                en_score: r.get("en_score"),
                measurement_uncertainty: r.get("measurement_uncertainty"),
                reference_uncertainty: r.get("reference_uncertainty"),
                evaluation_method: r.get("evaluation_method"),
                evaluation_result: r.get("evaluation_result"),
                evaluated_by: r.get("evaluated_by"),
                evaluated_at: r.get("evaluated_at"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
            },
            "能力验证结果评价完成",
        )),
        Err(e) => {
            tracing::error!("Failed to evaluate PT result: {}", e);
            Json(ApiResponse::error(500, "能力验证结果评价失败"))
        }
    }
}

pub async fn list_plan_evaluations(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<PtEvaluation>>> {
    let id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id, plan_id, plan_no, sample_id, sample_code, test_item, test_result,
               assigned_value, standard_deviation, z_score, en_score,
               measurement_uncertainty, reference_uncertainty, evaluation_method,
               evaluation_result, evaluated_by, evaluated_at::TEXT, notes, created_at::TEXT
        FROM qa_lims_pt_evaluations
        WHERE plan_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let evaluations: Vec<PtEvaluation> = rows
                .into_iter()
                .map(|row| PtEvaluation {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    plan_id: row.get("plan_id"),
                    plan_no: row.get("plan_no"),
                    sample_id: row.get("sample_id"),
                    sample_code: row.get("sample_code"),
                    test_item: row.get("test_item"),
                    test_result: row.get("test_result"),
                    assigned_value: row.get("assigned_value"),
                    standard_deviation: row.get("standard_deviation"),
                    z_score: row.get("z_score"),
                    en_score: row.get("en_score"),
                    measurement_uncertainty: row.get("measurement_uncertainty"),
                    reference_uncertainty: row.get("reference_uncertainty"),
                    evaluation_method: row.get("evaluation_method"),
                    evaluation_result: row.get("evaluation_result"),
                    evaluated_by: row.get("evaluated_by"),
                    evaluated_at: row.get("evaluated_at"),
                    notes: row.get("notes"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(
                evaluations,
                "获取能力验证评价列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to fetch PT evaluations: {}", e);
            Json(ApiResponse::error(500, "获取能力验证评价列表失败"))
        }
    }
}

pub async fn create_corrective_action(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreatePtCorrectiveActionRequest>,
) -> Json<ApiResponse<PtCorrectiveAction>> {
    let plan_id = match Uuid::parse_str(&req.plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let evaluation_id = match Uuid::parse_str(&req.evaluation_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的评价ID")),
    };

    let plan_row =
        sqlx::query("SELECT plan_no FROM qa_lims_pt_plans WHERE deleted_at IS NULL AND id = $1")
            .bind(plan_id)
            .fetch_optional(&state.pool)
            .await;

    let plan_no = match plan_row {
        Ok(Some(row)) => row.get::<String, _>("plan_no"),
        Ok(None) => return Json(ApiResponse::error(404, "能力验证计划不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询计划失败: {}", e))),
    };

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_pt_corrective_actions (
            plan_id, plan_no, evaluation_id, unsatisfactory_item,
            root_cause, corrective_measures, responsible_person, deadline, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING id, plan_id, plan_no, evaluation_id, unsatisfactory_item,
                  root_cause, corrective_measures, responsible_person, deadline::TEXT,
                  status, verification_result, verified_by, verified_at::TEXT,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(plan_id)
    .bind(&plan_no)
    .bind(evaluation_id)
    .bind(&req.unsatisfactory_item)
    .bind(&req.root_cause)
    .bind(&req.corrective_measures)
    .bind(&req.responsible_person)
    .bind(&req.deadline)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            PtCorrectiveAction {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_id: r.get("plan_id"),
                plan_no: r.get("plan_no"),
                evaluation_id: r.get("evaluation_id"),
                unsatisfactory_item: r.get("unsatisfactory_item"),
                root_cause: r.get("root_cause"),
                corrective_measures: r.get("corrective_measures"),
                responsible_person: r.get("responsible_person"),
                deadline: r.get("deadline"),
                status: r.get("status"),
                verification_result: r.get("verification_result"),
                verified_by: r.get("verified_by"),
                verified_at: r.get("verified_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "不满意结果整改记录创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create PT corrective action: {}", e);
            Json(ApiResponse::error(500, "不满意结果整改记录创建失败"))
        }
    }
}

pub async fn update_corrective_action(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdatePtCorrectiveActionRequest>,
) -> Json<ApiResponse<PtCorrectiveAction>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的整改记录ID")),
    };

    let verified_at = if req.verification_result.is_some() {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_pt_corrective_actions 
        SET root_cause = COALESCE($2, root_cause),
            corrective_measures = COALESCE($3, corrective_measures),
            responsible_person = COALESCE($4, responsible_person),
            deadline = COALESCE($5, deadline),
            status = COALESCE($6, status),
            verification_result = COALESCE($7, verification_result),
            verified_by = COALESCE($8, verified_by),
            verified_at = COALESCE($9, verified_at),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, plan_id, plan_no, evaluation_id, unsatisfactory_item,
                  root_cause, corrective_measures, responsible_person, deadline::TEXT,
                  status, verification_result, verified_by, verified_at::TEXT,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.root_cause)
    .bind(&req.corrective_measures)
    .bind(&req.responsible_person)
    .bind(&req.deadline)
    .bind(&req.status)
    .bind(&req.verification_result)
    .bind(&req.verified_by)
    .bind(&verified_at)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            PtCorrectiveAction {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                plan_id: r.get("plan_id"),
                plan_no: r.get("plan_no"),
                evaluation_id: r.get("evaluation_id"),
                unsatisfactory_item: r.get("unsatisfactory_item"),
                root_cause: r.get("root_cause"),
                corrective_measures: r.get("corrective_measures"),
                responsible_person: r.get("responsible_person"),
                deadline: r.get("deadline"),
                status: r.get("status"),
                verification_result: r.get("verification_result"),
                verified_by: r.get("verified_by"),
                verified_at: r.get("verified_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "不满意结果整改记录更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update PT corrective action: {}", e);
            Json(ApiResponse::error(500, "不满意结果整改记录更新失败"))
        }
    }
}

pub async fn list_plan_corrective_actions(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<PtCorrectiveAction>>> {
    let id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id, plan_id, plan_no, evaluation_id, unsatisfactory_item,
               root_cause, corrective_measures, responsible_person, deadline::TEXT,
               status, verification_result, verified_by, verified_at::TEXT,
               created_at::TEXT, updated_at::TEXT
        FROM qa_lims_pt_corrective_actions
        WHERE plan_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let actions: Vec<PtCorrectiveAction> = rows
                .into_iter()
                .map(|row| PtCorrectiveAction {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    plan_id: row.get("plan_id"),
                    plan_no: row.get("plan_no"),
                    evaluation_id: row.get("evaluation_id"),
                    unsatisfactory_item: row.get("unsatisfactory_item"),
                    root_cause: row.get("root_cause"),
                    corrective_measures: row.get("corrective_measures"),
                    responsible_person: row.get("responsible_person"),
                    deadline: row.get("deadline"),
                    status: row.get("status"),
                    verification_result: row.get("verification_result"),
                    verified_by: row.get("verified_by"),
                    verified_at: row.get("verified_at"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(actions, "获取整改记录列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch PT corrective actions: {}", e);
            Json(ApiResponse::error(500, "获取整改记录列表失败"))
        }
    }
}

// ============================================================================
// 能力验证纯函数：计算 & 判定（可单元测试）
// ============================================================================

/// Z 比分数：z = (x - X) / s
/// 当 s = 0 或 None 时返回 None（无法比较）
pub fn compute_z_score(result: f64, assigned: f64, std_dev: Option<f64>) -> Option<f64> {
    std_dev
        .filter(|&sd| sd != 0.0)
        .map(|sd| (result - assigned) / sd)
}

/// E_n 评分（一致性评分）：|x_lab - X_ref| / √(u_lab² + u_ref²)
/// 当双侧不确定度缺失或分母为 0 返回 None
pub fn compute_en_score(
    result: f64,
    assigned: f64,
    u_lab: Option<f64>,
    u_ref: Option<f64>,
) -> Option<f64> {
    match (u_lab, u_ref) {
        (Some(ul), Some(ur)) => {
            let denom = (ul.powi(2) + ur.powi(2)).sqrt();
            if denom != 0.0 {
                Some((result - assigned).abs() / denom)
            } else {
                None
            }
        }
        _ => None,
    }
}

/// 判定能力验证结果
/// - z_score 法：|z| ≤ 2 → satisfactory；2 < |z| ≤ 3 → questionable；|z| > 3 → unsatisfactory
/// - en_score 法（任何非 "z_score" 的 method 都当 en 法）：E_n ≤ 1 → satisfactory；其它 → unsatisfactory
/// 当需要的指标缺失时返回 None
pub fn evaluate_pt_result(
    z_score: Option<f64>,
    en_score: Option<f64>,
    evaluation_method: &str,
) -> Option<String> {
    if evaluation_method == "z_score" {
        match z_score {
            Some(z) if z.abs() <= 2.0 => Some("satisfactory".to_string()),
            Some(z) if z.abs() <= 3.0 => Some("questionable".to_string()),
            Some(_) => Some("unsatisfactory".to_string()),
            None => None,
        }
    } else {
        match en_score {
            Some(en) if en <= 1.0 => Some("satisfactory".to_string()),
            Some(_) => Some("unsatisfactory".to_string()),
            None => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() < eps
    }

    // ===== compute_z_score =====
    #[test]
    fn test_z_score_within_range() {
        // result=101, assigned=100, sd=5 → z = 0.2
        let z = compute_z_score(101.0, 100.0, Some(5.0)).unwrap();
        assert!(approx_eq(z, 0.2, 1e-9));
    }

    #[test]
    fn test_z_score_negative() {
        let z = compute_z_score(92.0, 100.0, Some(5.0)).unwrap();
        assert!(approx_eq(z, -1.6, 1e-9));
    }

    #[test]
    fn test_z_score_sd_zero_is_none() {
        assert_eq!(compute_z_score(10.0, 10.0, Some(0.0)), None);
    }

    #[test]
    fn test_z_score_sd_missing_is_none() {
        assert_eq!(compute_z_score(10.0, 10.0, None), None);
    }

    // ===== compute_en_score =====
    #[test]
    fn test_en_score_satisfactory() {
        // |101-100| / √(4+9) = 1/√13 ≈ 0.277
        let en = compute_en_score(101.0, 100.0, Some(2.0), Some(3.0)).unwrap();
        assert!(approx_eq(en, 0.277_350_098, 1e-6));
    }

    #[test]
    fn test_en_score_unsatisfactory() {
        // |107-100| / √(4+9) = 7/√13 ≈ 1.941
        let en = compute_en_score(107.0, 100.0, Some(2.0), Some(3.0)).unwrap();
        assert!(en > 1.0);
    }

    #[test]
    fn test_en_score_zero_denominator_none() {
        assert_eq!(compute_en_score(100.0, 100.0, Some(0.0), Some(0.0)), None);
    }

    #[test]
    fn test_en_score_missing_inputs_none() {
        assert_eq!(compute_en_score(100.0, 100.0, Some(1.0), None), None);
        assert_eq!(compute_en_score(100.0, 100.0, None, Some(1.0)), None);
        assert_eq!(compute_en_score(100.0, 100.0, None, None), None);
    }

    // ===== evaluate_pt_result =====
    #[test]
    fn test_z_eval_satisfactory() {
        assert_eq!(
            evaluate_pt_result(Some(1.5), None, "z_score").as_deref(),
            Some("satisfactory")
        );
        assert_eq!(
            evaluate_pt_result(Some(-2.0), None, "z_score").as_deref(),
            Some("satisfactory")
        );
    }

    #[test]
    fn test_z_eval_questionable() {
        assert_eq!(
            evaluate_pt_result(Some(2.5), None, "z_score").as_deref(),
            Some("questionable")
        );
        assert_eq!(
            evaluate_pt_result(Some(-3.0), None, "z_score").as_deref(),
            Some("questionable")
        );
    }

    #[test]
    fn test_z_eval_unsatisfactory() {
        assert_eq!(
            evaluate_pt_result(Some(3.5), None, "z_score").as_deref(),
            Some("unsatisfactory")
        );
    }

    #[test]
    fn test_z_eval_missing_score_none() {
        assert_eq!(evaluate_pt_result(None, None, "z_score"), None);
    }

    #[test]
    fn test_en_eval_satisfactory() {
        assert_eq!(
            evaluate_pt_result(None, Some(0.8), "en_score").as_deref(),
            Some("satisfactory")
        );
        assert_eq!(
            evaluate_pt_result(None, Some(1.0), "en").as_deref(),
            Some("satisfactory")
        );
    }

    #[test]
    fn test_en_eval_unsatisfactory() {
        assert_eq!(
            evaluate_pt_result(None, Some(1.2), "en_score").as_deref(),
            Some("unsatisfactory")
        );
    }

    #[test]
    fn test_en_eval_missing_none() {
        assert_eq!(evaluate_pt_result(None, None, "en_score"), None);
    }

    #[test]
    fn test_full_evaluation_workflow() {
        // 综合：result 偏离 assigned 2.1，sd=1.0 → z = -2.1 (questionable)
        // en = 2.1 / sqrt(0.3²+0.5²) = 2.1 / √0.34 ≈ 3.6，E_n > 1 → unsatisfactory
        let result = 97.9;
        let assigned = 100.0;
        let sd = Some(1.0);
        let ul = Some(0.3);
        let ur = Some(0.5);
        let z = compute_z_score(result, assigned, sd);
        let en = compute_en_score(result, assigned, ul, ur);
        let z_eval = evaluate_pt_result(z, en, "z_score");
        let en_eval = evaluate_pt_result(z, en, "en_score");
        assert_eq!(z_eval.as_deref(), Some("questionable"));
        assert_eq!(en_eval.as_deref(), Some("unsatisfactory"));
        assert!(en.unwrap() > 1.0);
    }

    // ---- compute_z_score 补充 ----
    #[test]
    fn z_score_normal() {
        let z = compute_z_score(10.0, 5.0, Some(2.5)).unwrap();
        assert!((z - 2.0).abs() < 1e-9);
    }

    #[test]
    fn z_score_zero_sd_none() {
        assert_eq!(compute_z_score(10.0, 5.0, Some(0.0)), None);
        assert_eq!(compute_z_score(10.0, 5.0, None), None);
    }

    #[test]
    fn z_score_negative() {
        let z = compute_z_score(0.0, 10.0, Some(2.0)).unwrap();
        assert!((z + 5.0).abs() < 1e-9);
    }

    // ---- compute_en_score ----
    #[test]
    fn en_score_normal() {
        // |10-6| / sqrt(3^2+4^2) = 4 / 5 = 0.8
        let en = compute_en_score(10.0, 6.0, Some(3.0), Some(4.0)).unwrap();
        assert!((en - 0.8).abs() < 1e-9);
    }

    #[test]
    fn en_score_missing_uncertainty_none() {
        assert_eq!(compute_en_score(10.0, 6.0, None, Some(4.0)), None);
        assert_eq!(compute_en_score(10.0, 6.0, Some(3.0), None), None);
        assert_eq!(compute_en_score(10.0, 6.0, None, None), None);
    }

    #[test]
    fn en_score_zero_denom_none() {
        assert_eq!(compute_en_score(10.0, 6.0, Some(0.0), Some(0.0)), None);
    }

    // ---- evaluate_pt_result ----
    #[test]
    fn evaluate_z_score_tiers() {
        assert_eq!(
            evaluate_pt_result(Some(1.5), None, "z_score"),
            Some("satisfactory".to_string())
        );
        assert_eq!(
            evaluate_pt_result(Some(2.5), None, "z_score"),
            Some("questionable".to_string())
        );
        assert_eq!(
            evaluate_pt_result(Some(3.5), None, "z_score"),
            Some("unsatisfactory".to_string())
        );
        assert_eq!(evaluate_pt_result(None, None, "z_score"), None);
    }

    #[test]
    fn evaluate_en_tiers() {
        assert_eq!(
            evaluate_pt_result(None, Some(0.5), "en_score"),
            Some("satisfactory".to_string())
        );
        assert_eq!(
            evaluate_pt_result(None, Some(1.5), "en_score"),
            Some("unsatisfactory".to_string())
        );
        assert_eq!(evaluate_pt_result(None, None, "en_score"), None);
    }

    #[test]
    fn evaluate_z_score_boundary() {
        // |z| == 2.0 → satisfactory；|z| == 3.0 → questionable
        assert_eq!(
            evaluate_pt_result(Some(2.0), None, "z_score"),
            Some("satisfactory".to_string())
        );
        assert_eq!(
            evaluate_pt_result(Some(-2.0), None, "z_score"),
            Some("satisfactory".to_string())
        );
        assert_eq!(
            evaluate_pt_result(Some(3.0), None, "z_score"),
            Some("questionable".to_string())
        );
    }
}
