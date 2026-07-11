use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

use crate::middleware::tenant::TenantContext;
use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/lims/samples", get(list_samples).post(register_sample))
        .route(
            "/api/lims/samples/{id}",
            get(get_sample).put(update_sample).delete(delete_sample),
        )
        .route(
            "/api/lims/samples/{id}/lifecycle",
            get(get_sample_lifecycle),
        )
        .route("/api/lims/samples/lifecycle", post(record_lifecycle_event))
        .route(
            "/api/lims/samples/{id}/stage/{to_stage}",
            post(transition_sample_stage),
        )
        .route(
            "/api/lims/samples/{id}/traceability",
            get(get_sample_traceability),
        )
        .route("/api/lims/lifecycle-stages", get(get_lifecycle_stages))
}

#[derive(Debug, Deserialize)]
pub struct SampleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub sample_no: Option<String>,
    pub sample_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Sample {
    pub id: String,
    pub tenant_id: String,
    pub sample_no: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
    pub received_at: Option<String>,
    pub expired_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSampleRequest {
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSampleRequest {
    pub sample_name: Option<String>,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub expired_at: Option<String>,
}

pub async fn list_samples(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Query(query): axum::extract::Query<SampleQuery>,
) -> Json<ApiResponse<Vec<Sample>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id = ctx.tenant_id;

    let sql = match (query.status.as_ref(), query.sample_no.as_ref(), query.sample_name.as_ref()) {
        (Some(_), Some(_), Some(_)) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND status = $2 AND sample_no LIKE $3 AND sample_name LIKE $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6",
        (Some(_), Some(_), None) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND status = $2 AND sample_no LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None, Some(_)) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND status = $2 AND sample_name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None, None) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_), Some(_)) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND sample_no LIKE $2 AND sample_name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (None, Some(_), None) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND sample_no LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None, Some(_)) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 AND sample_name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None, None) => "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    };

    let mut query_builder = sqlx::query(sql).bind(tenant_id);
    match (
        query.status.as_ref(),
        query.sample_no.as_ref(),
        query.sample_name.as_ref(),
    ) {
        (Some(st), Some(no), Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", no))
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(no), None) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", no))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(no), Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", no))
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(no), None) => {
            query_builder = query_builder
                .bind(format!("%{}%", no))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let samples = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| Sample {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                sample_no: row.get("sample_no"),
                sample_name: row.get("sample_name"),
                sample_type: row.get("sample_type"),
                source: row.get("source"),
                quantity: row.get("quantity"),
                unit: row.get("unit"),
                status: row.get("status"),
                received_at: row.get("received_at"),
                expired_at: row.get("expired_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match samples {
        Ok(data) => Json(ApiResponse::success(data, "获取样品列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch samples: {}", e);
            Json(ApiResponse::error(500, "获取样品列表失败"))
        }
    }
}

pub async fn register_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let sample_no = format!(
        "SMP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "INSERT INTO qa_lab_samples (tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'received') RETURNING id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(tenant_id)
    .bind(sample_no)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Sample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                sample_no: r.get("sample_no"),
                sample_name: r.get("sample_name"),
                sample_type: r.get("sample_type"),
                source: r.get("source"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                received_at: r.get("received_at"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "样品登记成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create sample: {}", e);
            Json(ApiResponse::error(500, "样品登记失败"))
        }
    }
}

pub async fn get_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Sample>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_samples WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Sample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                sample_no: r.get("sample_no"),
                sample_name: r.get("sample_name"),
                sample_type: r.get("sample_type"),
                source: r.get("source"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                received_at: r.get("received_at"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取样品成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch sample: {}", e);
            Json(ApiResponse::error(500, "获取样品失败"))
        }
    }
}

pub async fn update_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "UPDATE qa_lab_samples SET sample_name = COALESCE($3, sample_name), sample_type = COALESCE($4, sample_type), source = COALESCE($5, source), quantity = COALESCE($6, quantity), unit = COALESCE($7, unit), status = COALESCE($8, status), expired_at = COALESCE($9, expired_at), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(&req.expired_at)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Sample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                sample_no: r.get("sample_no"),
                sample_name: r.get("sample_name"),
                sample_type: r.get("sample_type"),
                source: r.get("source"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                received_at: r.get("received_at"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "样品更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update sample: {}", e);
            Json(ApiResponse::error(500, "样品更新失败"))
        }
    }
}

pub async fn delete_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let result = sqlx::query("DELETE FROM qa_lab_samples WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "样品删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete sample: {}", e);
            Json(ApiResponse::error(500, "样品删除失败"))
        }
    }
}

// ========================================
// Sample Lifecycle Tracking
// ========================================

#[derive(Debug, Serialize)]
pub struct SampleLifecycleRecord {
    pub id: String,
    pub tenant_id: String,
    pub sample_id: String,
    pub sample_no: String,
    pub lifecycle_stage: String,
    pub stage_description: String,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub location: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateLifecycleRecordRequest {
    pub sample_id: String,
    pub lifecycle_stage: String,
    pub stage_description: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LifecycleStageTransition {
    pub from_stage: String,
    pub to_stage: String,
    pub description: String,
}

const LIFECYCLE_STAGES: &[(&str, &str)] = &[
    ("received", "样品接收"),
    ("registered", "登记入库"),
    ("testing", "检测中"),
    ("completed", "检测完成"),
    ("stored", "留样存储"),
    ("retrieved", "样品领取"),
    ("disposed", "样品处置"),
    ("destroyed", "已销毁"),
];

pub async fn get_sample_lifecycle(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<SampleLifecycleRecord>>> {
    let id = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
               operator, notes, location, created_at::TEXT
        FROM qa_lab_sample_lifecycle
        WHERE sample_id = $1 AND tenant_id = $2
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let records: Vec<SampleLifecycleRecord> = rows
                .into_iter()
                .map(|row| SampleLifecycleRecord {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    sample_id: row.get("sample_id"),
                    sample_no: row.get("sample_no"),
                    lifecycle_stage: row.get("lifecycle_stage"),
                    stage_description: row.get("stage_description"),
                    operator: row.get("operator"),
                    notes: row.get("notes"),
                    location: row.get("location"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(records, "获取样品生命周期记录成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch lifecycle records: {}", e);
            Json(ApiResponse::error(500, "获取样品生命周期记录失败"))
        }
    }
}

pub async fn record_lifecycle_event(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateLifecycleRecordRequest>,
) -> Json<ApiResponse<SampleLifecycleRecord>> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let sample_row =
        sqlx::query("SELECT sample_no FROM qa_lab_samples WHERE id = $1 AND tenant_id = $2")
            .bind(sample_id)
            .bind(tenant_id)
            .fetch_optional(&state.pool)
            .await;

    let sample_no = match sample_row {
        Ok(Some(row)) => row.get::<String, _>("sample_no"),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let valid_stage = LIFECYCLE_STAGES
        .iter()
        .any(|(stage, _)| *stage == req.lifecycle_stage);

    if !valid_stage {
        return Json(ApiResponse::error(400, "无效的生命周期阶段"));
    }

    let record_id = Uuid::new_v4();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lab_sample_lifecycle (
            id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
            operator, notes, location, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
                  operator, notes, location, created_at::TEXT
        "#,
    )
    .bind(record_id)
    .bind(tenant_id)
    .bind(sample_id)
    .bind(&sample_no)
    .bind(&req.lifecycle_stage)
    .bind(&req.stage_description)
    .bind(&req.operator)
    .bind(&req.notes)
    .bind(&req.location)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                "UPDATE qa_lab_samples SET status = $2, updated_at = NOW() WHERE id = $1 AND tenant_id = $3",
            )
            .bind(sample_id)
            .bind(&req.lifecycle_stage)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                SampleLifecycleRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    sample_id: r.get("sample_id"),
                    sample_no: r.get("sample_no"),
                    lifecycle_stage: r.get("lifecycle_stage"),
                    stage_description: r.get("stage_description"),
                    operator: r.get("operator"),
                    notes: r.get("notes"),
                    location: r.get("location"),
                    created_at: r.get("created_at"),
                },
                "生命周期事件记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to record lifecycle event: {}", e);
            Json(ApiResponse::error(500, "记录生命周期事件失败"))
        }
    }
}

pub async fn transition_sample_stage(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path((sample_id, to_stage)): axum::extract::Path<(String, String)>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<SampleLifecycleRecord>> {
    let sample_uuid = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let valid_stage = LIFECYCLE_STAGES.iter().any(|(stage, _)| *stage == to_stage);

    if !valid_stage {
        return Json(ApiResponse::error(400, "无效的目标阶段"));
    }

    let current_row = sqlx::query(
        "SELECT sample_no, status FROM qa_lab_samples WHERE id = $1 AND tenant_id = $2",
    )
    .bind(sample_uuid)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let (sample_no, current_stage) = match current_row {
        Ok(Some(row)) => (
            row.get::<String, _>("sample_no"),
            row.get::<String, _>("status"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let operator = req.get("operator").and_then(|v| v.as_str());
    let notes = req.get("notes").and_then(|v| v.as_str());
    let location = req.get("location").and_then(|v| v.as_str());
    let description = format!(
        "样品从 [{}] 阶段转换到 [{}] 阶段",
        get_stage_name(&current_stage),
        get_stage_name(&to_stage)
    );

    let record_id = Uuid::new_v4();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lab_sample_lifecycle (
            id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
            operator, notes, location, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
                  operator, notes, location, created_at::TEXT
        "#,
    )
    .bind(record_id)
    .bind(tenant_id)
    .bind(sample_uuid)
    .bind(&sample_no)
    .bind(&to_stage)
    .bind(&description)
    .bind(operator)
    .bind(notes)
    .bind(location)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                "UPDATE qa_lab_samples SET status = $2, updated_at = NOW() WHERE id = $1 AND tenant_id = $3",
            )
            .bind(sample_uuid)
            .bind(&to_stage)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                SampleLifecycleRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    sample_id: r.get("sample_id"),
                    sample_no: r.get("sample_no"),
                    lifecycle_stage: r.get("lifecycle_stage"),
                    stage_description: r.get("stage_description"),
                    operator: r.get("operator"),
                    notes: r.get("notes"),
                    location: r.get("location"),
                    created_at: r.get("created_at"),
                },
                "样品阶段转换成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to transition sample stage: {}", e);
            Json(ApiResponse::error(500, "样品阶段转换失败"))
        }
    }
}

fn get_stage_name(stage: &str) -> String {
    LIFECYCLE_STAGES
        .iter()
        .find(|(s, _)| *s == stage)
        .map(|(_, name)| name.to_string())
        .unwrap_or_else(|| stage.to_string())
}

pub async fn get_lifecycle_stages() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let stages: Vec<serde_json::Value> = LIFECYCLE_STAGES
        .iter()
        .map(|(code, name)| {
            serde_json::json!({
                "code": code,
                "name": name
            })
        })
        .collect();

    Json(ApiResponse::success(stages, "获取生命周期阶段列表成功"))
}

pub async fn get_sample_traceability(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id = ctx.tenant_id;

    let sample_row = sqlx::query(
        r#"
        SELECT id, tenant_id, sample_no, sample_name, sample_type, source, quantity, unit,
               status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM qa_lab_samples WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let sample = match sample_row {
        Ok(Some(row)) => serde_json::json!({
            "id": row.get::<String, _>("id"),
            "tenant_id": row.get::<String, _>("tenant_id"),
            "sample_no": row.get::<String, _>("sample_no"),
            "sample_name": row.get::<String, _>("sample_name"),
            "sample_type": row.get::<Option<String>, _>("sample_type"),
            "source": row.get::<Option<String>, _>("source"),
            "quantity": row.get::<Option<f64>, _>("quantity"),
            "unit": row.get::<Option<String>, _>("unit"),
            "status": row.get::<String, _>("status"),
            "received_at": row.get::<Option<String>, _>("received_at"),
            "expired_at": row.get::<Option<String>, _>("expired_at"),
            "created_at": row.get::<Option<String>, _>("created_at"),
            "updated_at": row.get::<Option<String>, _>("updated_at"),
        }),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let lifecycle_rows = sqlx::query(
        r#"
        SELECT id, lifecycle_stage, stage_description, operator, notes, location, created_at::TEXT
        FROM qa_lab_sample_lifecycle
        WHERE sample_id = $1 AND tenant_id = $2
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    let lifecycle_history: Vec<serde_json::Value> = match lifecycle_rows {
        Ok(rows) => rows
            .into_iter()
            .map(|row| {
                serde_json::json!({
                    "id": row.get::<String, _>("id"),
                    "lifecycle_stage": row.get::<String, _>("lifecycle_stage"),
                    "stage_description": row.get::<Option<String>, _>("stage_description"),
                    "operator": row.get::<Option<String>, _>("operator"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "location": row.get::<Option<String>, _>("location"),
                    "created_at": row.get::<String, _>("created_at"),
                })
            })
            .collect(),
        Err(e) => {
            return Json(ApiResponse::error(
                500,
                &format!("查询生命周期记录失败: {}", e),
            ))
        }
    };

    let current_status = sample
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let is_expired = sample
        .get("expired_at")
        .and_then(|v| v.as_str())
        .map(|d| {
            chrono::DateTime::parse_from_rfc3339(d)
                .map(|dt| dt < chrono::Utc::now())
                .unwrap_or(false)
        })
        .unwrap_or(false);

    Json(ApiResponse::success(
        serde_json::json!({
            "sample": sample,
            "lifecycle_history": lifecycle_history,
            "lifecycle_statistics": {
                "total_stages": lifecycle_history.len(),
                "current_stage": current_status,
                "is_expired": is_expired,
                "stage_progress": calculate_stage_progress(current_status),
            }
        }),
        "获取样品追溯信息成功",
    ))
}

fn calculate_stage_progress(current_stage: &str) -> f64 {
    let stages_order = [
        "received",
        "registered",
        "testing",
        "completed",
        "stored",
        "retrieved",
        "disposed",
        "destroyed",
    ];
    let current_idx = stages_order
        .iter()
        .position(|s| *s == current_stage)
        .unwrap_or(0);
    (current_idx as f64 / (stages_order.len() - 1) as f64 * 100.0).round() / 100.0
}
