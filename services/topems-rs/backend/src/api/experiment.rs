use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateExperimentRequest, Experiment, UpdateExperimentRequest};
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
    pub experiment_type: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> topems_shared::Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/v1/experiments",
            get(list_experiments).post(create_experiment),
        )
        .route(
            "/api/v1/experiments/{id}",
            get(get_experiment)
                .put(update_experiment)
                .delete(delete_experiment),
        )
        .route(
            "/api/v1/experiments/{id}/records",
            get(get_experiment_records).post(create_experiment_record),
        )
        .route("/api/v1/experiments/phase/lab", get(list_lab_experiments))
        .route(
            "/api/v1/experiments/phase/pilot",
            get(list_pilot_experiments),
        )
        .route(
            "/api/v1/experiments/phase/scaleup",
            get(list_scaleup_experiments),
        )
        .route(
            "/api/v1/experiments/{id}/advance-phase",
            post(advance_phase),
        )
        .route("/api/v1/batch-trace/{batch_number}", get(trace_batch))
        .with_state(state);

    Ok(app)
}

async fn list_experiments(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, name, code, project_id, formula_id, experiment_type, status,
               objective, method, results, conclusions, experimenter,
               started_at, completed_at, created_by, created_at, updated_at
        FROM rs.experiments
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR project_id = $3)
          AND ($4::text IS NULL OR experiment_type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&params.search)
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
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR project_id = $3)
                  AND ($4::text IS NULL OR experiment_type = $4)
                "#,
            )
            .bind(&params.search)
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
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateExperimentRequest>,
) -> Json<ApiResponse<Experiment>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let phase = req.phase.clone();

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        INSERT INTO rs.experiments (
            id, name, code, project_id, formula_id, experiment_type, phase, status,
            objective, method, results, conclusions, experimenter,
            batch_number, scale, scale_unit, started_at, completed_at,
            created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id, name, code, project_id, formula_id, experiment_type, phase, status,
                  objective, method, results, conclusions, experimenter,
                  batch_number, scale, scale_unit, started_at, completed_at,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
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

    match result {
        Ok(experiment) => Json(ApiResponse::success(experiment, "试验创建成功")),
        Err(e) => {
            tracing::error!("创建试验失败: {}", e);
            Json(ApiResponse::error(500, "试验创建失败"))
        }
    }
}

async fn get_experiment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Experiment>> {
    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments WHERE id = $1
        "#,
    )
    .bind(id)
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
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateExperimentRequest>,
) -> Json<ApiResponse<Experiment>> {
    let existing = sqlx::query_as::<_, Experiment>(
        "SELECT id, name, code, project_id, formula_id, experiment_type, phase, status, objective, method, results, conclusions, experimenter, batch_number, scale, scale_unit, started_at, completed_at, created_by, created_at, updated_at FROM rs.experiments WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "试验不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询试验失败: {}", e))),
    };

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
        WHERE id = $1
        RETURNING id, name, code, project_id, formula_id, experiment_type, phase, status,
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(experiment) => Json(ApiResponse::success(experiment, "试验更新成功")),
        Err(e) => {
            tracing::error!("更新试验失败: {}", e);
            Json(ApiResponse::error(500, "试验更新失败"))
        }
    }
}

async fn delete_experiment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM rs.experiments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "试验删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "试验不存在")),
        Err(e) => {
            tracing::error!("删除试验失败: {}", e);
            Json(ApiResponse::error(500, "试验删除失败"))
        }
    }
}

async fn get_experiment_records(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
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
        FROM rs.experiment_records
        WHERE experiment_id = $1
        ORDER BY recorded_at ASC
        "#,
    )
    .bind(id)
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
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
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
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE phase = 'lab'
          AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.search)
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
                WHERE phase = 'lab'
                  AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&params.search)
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
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE phase = 'pilot'
          AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.search)
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
                WHERE phase = 'pilot'
                  AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&params.search)
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
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Experiment>(
        r#"
        SELECT id, name, code, project_id, formula_id, experiment_type, phase, status,
               objective, method, results, conclusions, experimenter,
               batch_number, scale, scale_unit, started_at, completed_at,
               created_by, created_at, updated_at
        FROM rs.experiments
        WHERE phase = 'scaleup'
          AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.search)
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
                WHERE phase = 'scaleup'
                  AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&params.search)
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
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<AdvancePhaseRequest>,
) -> Json<ApiResponse<Experiment>> {
    let existing = sqlx::query_as::<_, Experiment>(
        "SELECT id, phase, status FROM rs.experiments WHERE id = $1",
    )
    .bind(id)
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
        WHERE id = $1
        RETURNING id, name, code, project_id, formula_id, experiment_type, phase, status,
                  objective, method, results, conclusions, experimenter,
                  batch_number, scale, scale_unit, started_at, completed_at,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(new_phase)
    .bind(&req.new_status.unwrap_or("in_progress".to_string()))
    .bind(Utc::now())
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
    State(state): State<Arc<AppState>>,
    Path(batch_number): Path<String>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
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
        WHERE e.batch_number = $1
        "#,
    )
    .bind(batch_number)
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
