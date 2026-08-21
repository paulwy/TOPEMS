use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateExperimentRequest, Experiment, UpdateExperimentRequest};
use crate::modules::audit::log_audit_event;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::repository::ListQueryParams;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(flatten)]
    pub base: ListQueryParams,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
    pub experiment_type: Option<String>,
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route(
            "/experiments",
            get(list_experiments).post(create_experiment),
        )
        .route(
            "/experiments/{id}",
            get(get_experiment)
                .put(update_experiment)
                .delete(delete_experiment),
        )
        .route(
            "/experiments/{id}/records",
            get(get_experiment_records).post(create_experiment_record),
        )
        .route("/experiments/phase/lab", get(list_lab_experiments))
        .route("/experiments/phase/pilot", get(list_pilot_experiments))
        .route("/experiments/phase/scaleup", get(list_scaleup_experiments))
        .route("/experiments/{id}/advance-phase", post(advance_phase))
        .route("/batch-trace/{batch_number}", get(trace_batch))
}

async fn list_experiments(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR project_id = $4)
          AND ($5::text IS NULL OR experiment_type = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&params.base.search)
    .bind(&params.status)
    .bind(params.project_id)
    .bind(&params.experiment_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(experiments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.experiments
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR project_id = $4)
                  AND ($5::text IS NULL OR experiment_type = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.base.search)
            .bind(&params.status)
            .bind(params.project_id)
            .bind(&params.experiment_type)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "experiments": experiments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取试验列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取试验列表失败: {}", e);
            Json(ApiResponse::error(500, "获取试验列表失败"))
        }
    }
}

async fn create_experiment(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateExperimentRequest>,
) -> Json<ApiResponse<Experiment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "试验名称不能为空"));
    }

    if req.code.is_empty() {
        return Json(ApiResponse::error(400, "试验编码不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let phase = req.phase.clone();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        INSERT INTO rs.experiments (
            id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
            objective, method, results, conclusions, experimenter,
            batch_number, scale, scale_unit, started_at, completed_at,
            created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
                  objective, method, results, conclusions, experimenter,
                  batch_number, scale, scale_unit, started_at, completed_at,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.project_id)
    .bind(req.formula_id)
    .bind(&req.experiment_type)
    .bind(&phase)
    .bind("planned")
    .bind(&req.objective)
    .bind(&req.method)
    .bind(serde_json::json!({}))
    .bind::<Option<String>>(None)
    .bind(&req.experimenter)
    .bind(&req.batch_number)
    .bind(req.scale)
    .bind(&req.scale_unit)
    .bind(now)
    .bind::<Option<chrono::DateTime<chrono::Utc>>>(None)
    .bind(&req.experimenter)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(experiment) => (
            Json(ApiResponse::success(experiment.clone(), "试验创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建试验失败: {}", e);
            (
                Json(ApiResponse::error(500, "试验创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(experiment) = &result {
        serde_json::to_value(experiment).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "experiment".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_experiment(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Experiment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(experiment)) => Json(ApiResponse::success(experiment, "获取试验成功")),
        Ok(None) => Json(ApiResponse::error(404, "试验不存在")),
        Err(e) => {
            tracing::error!("获取试验失败: {}", e);
            Json(ApiResponse::error(500, "获取试验失败"))
        }
    }
}

async fn update_experiment(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<UpdateExperimentRequest>,
) -> Json<ApiResponse<Experiment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let existing = sqlx::query_as::<_, Experiment>(
        "SELECT id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status, objective, method, results, conclusions, experimenter, batch_number, scale, scale_unit, started_at, completed_at, created_by, created_at, updated_at FROM rs.experiments WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "试验不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询试验失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let status = req.status.unwrap_or(existing.status);
    let results = req.results.unwrap_or(existing.results);
    let conclusions = req.conclusions.or(existing.conclusions);
    let completed_at = req.completed_at.or(existing.completed_at);
    let batch_number = req.batch_number.or(existing.batch_number);
    let scale = req.scale.or(existing.scale);
    let scale_unit = req.scale_unit.or(existing.scale_unit);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        UPDATE rs.experiments SET
            name = $2, status = $3, results = $4, conclusions = $5,
            completed_at = $6, batch_number = $7, scale = $8, scale_unit = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
                  objective, method, results, conclusions, experimenter,
                  batch_number, scale, scale_unit, started_at, completed_at,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&status)
    .bind(&results)
    .bind(&conclusions)
    .bind(completed_at)
    .bind(batch_number)
    .bind(scale)
    .bind(scale_unit)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(experiment) => (
            Json(ApiResponse::success(experiment.clone(), "试验更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新试验失败: {}", e);
            (
                Json(ApiResponse::error(500, "试验更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(experiment) = &result {
        serde_json::to_value(experiment).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "experiment".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_experiment(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        "UPDATE rs.experiments SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "试验删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "试验不存在")),
            "error".to_string(),
            Some("试验不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除试验失败: {}", e);
            (
                Json(ApiResponse::error(500, "试验删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "experiment".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_experiment_records(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, (Option<serde_json::Value>,)>(
        r#"
        SELECT json_agg(
            json_build_object(
                'id', id,
                'experiment_id', experiment_id,
                'record_type', record_type,
                'content', content,
                'attachments', attachments,
                'recorded_by', recorded_by,
                'recorded_at', recorded_at
            )
        ) as records
        FROM rs.experiment_records er
        JOIN rs.experiments e ON er.experiment_id = e.id
        WHERE er.experiment_id = $1 AND e.tenant_id = $2
        ORDER BY recorded_at ASC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok((records,)) => {
            let records = records.unwrap_or(serde_json::json!([]));
            Json(ApiResponse::success(
                records.as_array().unwrap_or(&vec![]).clone(),
                "获取试验记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取试验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取试验记录失败"))
        }
    }
}

async fn create_experiment_record(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    let record_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO rs.experiment_records (
            id, experiment_id, record_type, content, attachments, recorded_by, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(record_id)
    .bind(id)
    .bind(&req.record_type)
    .bind(&req.content)
    .bind(serde_json::to_value(req.attachments).unwrap_or(serde_json::json!([])))
    .bind(&req.recorded_by)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({
                "id": record_id,
                "recorded_at": now
            }),
            "试验记录创建成功",
        )),
        Err(e) => {
            tracing::error!("创建试验记录失败: {}", e);
            Json(ApiResponse::error(500, "创建试验记录失败"))
        }
    }
}

async fn list_lab_experiments(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE tenant_id = $1
          AND phase = 'lab'
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&params.base.search)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(experiments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.experiments
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND phase = 'lab'
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.base.search)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "experiments": experiments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取小试试验列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取小试试验列表失败: {}", e);
            Json(ApiResponse::error(500, "获取小试试验列表失败"))
        }
    }
}

async fn list_pilot_experiments(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE tenant_id = $1
          AND phase = 'pilot'
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&params.base.search)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(experiments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.experiments
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND phase = 'pilot'
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.base.search)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "experiments": experiments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取中试试验列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取中试试验列表失败: {}", e);
            Json(ApiResponse::error(500, "获取中试试验列表失败"))
        }
    }
}

async fn list_scaleup_experiments(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE tenant_id = $1
          AND phase = 'scaleup'
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&params.base.search)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(experiments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.experiments
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND phase = 'scaleup'
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.base.search)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "experiments": experiments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取放大试验列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取放大试验列表失败: {}", e);
            Json(ApiResponse::error(500, "获取放大试验列表失败"))
        }
    }
}

async fn advance_phase(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<AdvancePhaseRequest>,
) -> Json<ApiResponse<Experiment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let existing = sqlx::query_as::<_, Experiment>(
        "SELECT id, tenant_id, phase, status FROM rs.experiments WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "试验不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询试验失败: {}", e))),
    };

    let new_phase = match existing.phase.as_str() {
        "lab" => "pilot",
        "pilot" => "scaleup",
        "scaleup" => "production",
        _ => return Json(ApiResponse::error(400, "无法推进当前试验阶段")),
    };

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        UPDATE rs.experiments SET
            phase = $2, status = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5
        RETURNING id, tenant_id, name, code, project_id, formula_id, experiment_type, phase, status,
                  objective, method, results, conclusions, experimenter,
                  batch_number, scale, scale_unit, started_at, completed_at,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(new_phase)
    .bind(req.new_status.unwrap_or("in_progress".to_string()))
    .bind(Utc::now())
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(experiment) => Json(ApiResponse::success(experiment, "试验阶段推进成功")),
        Err(e) => {
            tracing::error!("推进试验阶段失败: {}", e);
            Json(ApiResponse::error(500, "推进试验阶段失败"))
        }
    }
}

async fn trace_batch(
    State(state): State<super::ApiState>,
    Path(batch_number): Path<String>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, (Option<serde_json::Value>,)>(
        r#"
        SELECT json_agg(
            json_build_object(
                'id', e.id,
                'batch_number', e.batch_number,
                'experiment_id', e.id,
                'experiment_name', e.name,
                'phase', e.phase,
                'formula_id', f.id,
                'formula_name', f.name,
                'status', e.status,
                'started_at', e.started_at,
                'completed_at', e.completed_at
            ) ORDER BY e.started_at ASC
        ) as trace_items
        FROM rs.experiments e
        LEFT JOIN rs.formulas f ON e.formula_id = f.id
        WHERE e.batch_number = $1 AND e.tenant_id = $2
        "#,
    )
    .bind(batch_number)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok((trace_items,)) => {
            let trace_items = trace_items.unwrap_or(serde_json::json!([]));
            Json(ApiResponse::success(
                trace_items.as_array().unwrap_or(&vec![]).clone(),
                "批次追溯成功",
            ))
        }
        Err(e) => {
            tracing::error!("批次追溯失败: {}", e);
            Json(ApiResponse::error(500, "批次追溯失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateRecordRequest {
    pub record_type: String,
    pub content: String,
    pub attachments: Vec<String>,
    pub recorded_by: String,
}

#[derive(Debug, Deserialize)]
pub struct AdvancePhaseRequest {
    pub new_status: Option<String>,
}
