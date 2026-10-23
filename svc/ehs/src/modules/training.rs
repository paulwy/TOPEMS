//! Training handlers

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/training", get(list_trainings).post(create_training))
        .route(
            "/training/{id}",
            get(get_training)
                .put(update_training)
                .delete(delete_training),
        )
        .route(
            "/training/plans",
            get(list_training_plans).post(create_training_plan),
        )
        .route(
            "/training/plans/{id}",
            get(get_training_plan)
                .put(update_training_plan)
                .delete(delete_training_plan),
        )
        .route(
            "/training/records",
            get(list_training_records).post(create_training_record),
        )
        .route(
            "/training/records/{id}",
            get(get_training_record)
                .put(update_training_record)
                .delete(delete_training_record),
        )
        .route(
            "/training/certificates",
            get(list_certificates).post(create_certificate),
        )
        .route(
            "/training/certificates/{id}",
            get(get_certificate)
                .put(update_certificate)
                .delete(delete_certificate),
        )
        .route("/training/statistics", get(get_training_statistics))
}

#[derive(Debug, Deserialize)]
pub struct TrainingQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Training {
    pub id: String,
    pub training_no: String,
    pub title: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_type: Option<String>,
    pub duration_hours: Option<i32>,
    pub scheduled_at: Option<String>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TrainingPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub training_type: Option<String>,
    pub planned_date: Option<String>,
    pub trainer: Option<String>,
    pub status: String,
    pub created_at: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TrainingRecord {
    pub id: String,
    pub record_no: String,
    pub plan_id: Option<String>,
    pub title: String,
    pub training_type: String,
    pub category: String,
    pub trainer: Option<String>,
    pub training_date: Option<String>,
    pub location: Option<String>,
    pub duration_hours: Option<f64>,
    pub participants: Option<Vec<String>>,
    pub content: Option<String>,
    pub materials: Option<Vec<String>>,
    pub result: Option<String>,
    pub pass_rate: Option<f64>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TrainingCertificate {
    pub id: String,
    pub certificate_no: String,
    pub employee_id: String,
    pub employee_name: String,
    pub training_type: String,
    pub certificate_type: String,
    pub issue_date: Option<String>,
    pub expiry_date: Option<String>,
    pub issuing_authority: Option<String>,
    pub status: String,
    pub record_id: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,

    pub tenant_id: Uuid,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_trainings(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<Training>>> {
    // 接真 ehs.qa_ehs_trainings；超管全量可见，普通用户强制 tenant 过滤
    let tenant_filter = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(|| {
                uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
            });
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at::text AS scheduled_at,
                  status, tenant_id
           FROM ehs.qa_ehs_trainings WHERE {} ORDER BY updated_at DESC"#,
        tenant_filter
    );
    let rows = match sqlx::query(&sql).fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list trainings: {}", e);
            return Json(ApiResponse::error(500, "培训列表获取失败"));
        }
    };
    let list: Vec<Training> = rows
        .iter()
        .map(|r| Training {
            id: r.try_get::<String, _>("id").unwrap_or_default(),
            training_no: r.try_get::<String, _>("training_no").unwrap_or_default(),
            title: r.try_get::<String, _>("title").unwrap_or_default(),
            content: r.try_get::<Option<String>, _>("content").unwrap_or(None),
            trainer: r.try_get::<Option<String>, _>("trainer").unwrap_or(None),
            training_type: r
                .try_get::<Option<String>, _>("training_type")
                .unwrap_or(None),
            duration_hours: r
                .try_get::<Option<i32>, _>("duration_hours")
                .unwrap_or(None),
            scheduled_at: r
                .try_get::<Option<String>, _>("scheduled_at")
                .unwrap_or(None),
            status: r.try_get::<String, _>("status").unwrap_or_default(),
            tenant_id: r.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
        })
        .collect();
    Json(ApiResponse::success(list, "获取培训列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_training(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Training>> {
    let tenant_id = resolve_tenant_id(&claims);
    let training_no = format!("TRN-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名培训")
        .to_string();
    let content = req
        .get("content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let trainer = req
        .get("trainer")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let duration_hours = req
        .get("duration_hours")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("scheduled")
        .to_string();

    let sql = r#"
        INSERT INTO ehs.qa_ehs_trainings
            (training_no, title, content, trainer, training_type,
             duration_hours, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at::text AS scheduled_at,
                  status, tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&training_no)
        .bind(&title)
        .bind(content)
        .bind(trainer)
        .bind(training_type)
        .bind(duration_hours)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training: {}", e);
            return Json(ApiResponse::error(500, "培训创建失败"));
        }
    };
    let training = Training {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        training_no: row.try_get::<String, _>("training_no").unwrap_or_default(),
        title: row.try_get::<String, _>("title").unwrap_or_default(),
        content: row.try_get::<Option<String>, _>("content").unwrap_or(None),
        trainer: row.try_get::<Option<String>, _>("trainer").unwrap_or(None),
        training_type: row
            .try_get::<Option<String>, _>("training_type")
            .unwrap_or(None),
        duration_hours: row
            .try_get::<Option<i32>, _>("duration_hours")
            .unwrap_or(None),
        scheduled_at: row
            .try_get::<Option<String>, _>("scheduled_at")
            .unwrap_or(None),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        tenant_id: row.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
    };
    Json(ApiResponse::success(training, "培训创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_training(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Training>> {
    let tenant_clause = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(|| {
                uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
            });
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at::text AS scheduled_at,
                  status, tenant_id
           FROM ehs.qa_ehs_trainings WHERE id = $1::uuid AND {}"#,
        tenant_clause
    );
    let row = match sqlx::query(&sql)
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训不存在")),
        Err(e) => {
            tracing::error!("Failed to get training {}: {}", id, e);
            return Json(ApiResponse::error(500, "培训获取失败"));
        }
    };
    let training = Training {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        training_no: row.try_get::<String, _>("training_no").unwrap_or_default(),
        title: row.try_get::<String, _>("title").unwrap_or_default(),
        content: row.try_get::<Option<String>, _>("content").unwrap_or(None),
        trainer: row.try_get::<Option<String>, _>("trainer").unwrap_or(None),
        training_type: row
            .try_get::<Option<String>, _>("training_type")
            .unwrap_or(None),
        duration_hours: row
            .try_get::<Option<i32>, _>("duration_hours")
            .unwrap_or(None),
        scheduled_at: row
            .try_get::<Option<String>, _>("scheduled_at")
            .unwrap_or(None),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        tenant_id: row.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
    };
    Json(ApiResponse::success(training, "获取培训成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn update_training(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Training>> {
    let tenant_clause = if claims.is_superuser {
        String::from("")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(|| {
                uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
            });
        format!(" AND tenant_id = '{}'", tid)
    };
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let content = req
        .get("content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let trainer = req
        .get("trainer")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let duration_hours = req
        .get("duration_hours")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sql = format!(
        r#"UPDATE ehs.qa_ehs_trainings
              SET title = COALESCE($1, title),
                  content = COALESCE($2, content),
                  trainer = COALESCE($3, trainer),
                  training_type = COALESCE($4, training_type),
                  duration_hours = COALESCE($5, duration_hours),
                  status = COALESCE($6, status),
                  updated_at = now()
            WHERE id = $7::uuid AND deleted_at IS NULL {}
          RETURNING id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at::text AS scheduled_at,
                  status, tenant_id"#,
        tenant_clause
    );
    let row = match sqlx::query(&sql)
        .bind(title)
        .bind(content)
        .bind(trainer)
        .bind(training_type)
        .bind(duration_hours)
        .bind(status)
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训不存在")),
        Err(e) => {
            tracing::error!("Failed to update training {}: {}", id, e);
            return Json(ApiResponse::error(500, "培训更新失败"));
        }
    };
    let training = Training {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        training_no: row.try_get::<String, _>("training_no").unwrap_or_default(),
        title: row.try_get::<String, _>("title").unwrap_or_default(),
        content: row.try_get::<Option<String>, _>("content").unwrap_or(None),
        trainer: row.try_get::<Option<String>, _>("trainer").unwrap_or(None),
        training_type: row
            .try_get::<Option<String>, _>("training_type")
            .unwrap_or(None),
        duration_hours: row
            .try_get::<Option<i32>, _>("duration_hours")
            .unwrap_or(None),
        scheduled_at: row
            .try_get::<Option<String>, _>("scheduled_at")
            .unwrap_or(None),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        tenant_id: row.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
    };
    Json(ApiResponse::success(training, "培训更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_training(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_clause = if claims.is_superuser {
        String::from("")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(|| {
                uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
            });
        format!(" AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        "UPDATE ehs.qa_ehs_trainings SET deleted_at = now() WHERE id = $1::uuid AND deleted_at IS NULL {}",
        tenant_clause
    );
    let res = match sqlx::query(&sql).bind(&id).execute(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training {}: {}", id, e);
            return Json(ApiResponse::error(500, "培训删除失败"));
        }
    };
    if res.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "培训不存在"));
    }
    Json(ApiResponse::success((), "培训删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_training_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TrainingPlan>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Getting training plan: {}", id);
    let sql = r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at::text AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("Failed to get training plan: {}", e);
            return Json(ApiResponse::error(500, "获取培训计划失败"));
        }
    };
    let plan = training_plan_from_row(&row);
    Json(ApiResponse::success(plan, "获取培训计划成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训计划 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
pub async fn update_training_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingPlan>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.get("title").and_then(|v| v.as_str()) {
        sets.push(format!("title = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("description").and_then(|v| v.as_str()) {
        sets.push(format!("content = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("training_type").and_then(|v| v.as_str()) {
        sets.push(format!("training_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("trainer").and_then(|v| v.as_str()) {
        sets.push(format!("instructor = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("planned_date").and_then(|v| v.as_str()) {
        sets.push(format!("start_date = ${}::timestamptz", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("status").and_then(|v| v.as_str()) {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.training_programs
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, program_no AS plan_no, title, content AS description,
                  training_type, start_date::text AS planned_date, instructor AS trainer,
                  status, created_at::text AS created_at, tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("Failed to update training plan: {}", e);
            return Json(ApiResponse::error(500, "培训计划更新失败"));
        }
    };
    let plan = training_plan_from_row(&row);
    Json(ApiResponse::success(plan, "培训计划更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_training_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.training_programs
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training plan: {}", e);
            return Json(ApiResponse::error(500, "培训计划删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "培训计划不存在"));
    }
    Json(ApiResponse::success((), "培训计划删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_training_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TrainingRecord>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Getting training record: {}", id);
    let sql = r#"
        SELECT id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
               category, trainer, training_date::text AS training_date, location, duration_hours,
               participants, content, materials, result, pass_rate, status, created_by,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.training_records
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get training record: {}", e);
            return Json(ApiResponse::error(500, "获取培训记录失败"));
        }
    };
    let record = training_record_from_row(&row);
    Json(ApiResponse::success(record, "获取培训记录成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训记录 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn update_training_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingRecord>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.get("title").and_then(|v| v.as_str()) {
        sets.push(format!("title = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("training_type").and_then(|v| v.as_str()) {
        sets.push(format!("training_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("category").and_then(|v| v.as_str()) {
        sets.push(format!("category = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("trainer").and_then(|v| v.as_str()) {
        sets.push(format!("trainer = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("training_date").and_then(|v| v.as_str()) {
        sets.push(format!(
            "training_date = ${}::timestamptz",
            params.len() + 1
        ));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("location").and_then(|v| v.as_str()) {
        sets.push(format!("location = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("duration_hours") {
        sets.push(format!("duration_hours = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("participants") {
        sets.push(format!("participants = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("content").and_then(|v| v.as_str()) {
        sets.push(format!("content = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("materials") {
        sets.push(format!("materials = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("result").and_then(|v| v.as_str()) {
        sets.push(format!("result = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("pass_rate") {
        sets.push(format!("pass_rate = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("status").and_then(|v| v.as_str()) {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.training_records
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
                  category, trainer, training_date::text AS training_date, location, duration_hours,
                  participants, content, materials, result, pass_rate, status, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训记录不存在")),
        Err(e) => {
            tracing::error!("Failed to update training record: {}", e);
            return Json(ApiResponse::error(500, "培训记录更新失败"));
        }
    };
    let record = training_record_from_row(&row);
    Json(ApiResponse::success(record, "培训记录更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_training_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.training_records
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training record: {}", e);
            return Json(ApiResponse::error(500, "培训记录删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "培训记录不存在"));
    }
    Json(ApiResponse::success((), "培训记录删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/certificates/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训证书 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_certificate(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TrainingCertificate>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Getting certificate: {}", id);
    let sql = r#"
        SELECT id::text AS id, certificate_no, employee_id, employee_name, training_type,
               certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
               issuing_authority, status, record_id::text AS record_id, attachments,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训证书不存在")),
        Err(e) => {
            tracing::error!("Failed to get training certificate: {}", e);
            return Json(ApiResponse::error(500, "获取培训证书失败"));
        }
    };
    let certificate = training_certificate_from_row(&row);
    Json(ApiResponse::success(certificate, "获取培训证书成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/certificates/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训证书 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
pub async fn update_certificate(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingCertificate>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.get("employee_name").and_then(|v| v.as_str()) {
        sets.push(format!("employee_name = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("training_type").and_then(|v| v.as_str()) {
        sets.push(format!("training_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("certificate_type").and_then(|v| v.as_str()) {
        sets.push(format!("certificate_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("issue_date").and_then(|v| v.as_str()) {
        sets.push(format!("issue_date = ${}::timestamptz", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("expiry_date").and_then(|v| v.as_str()) {
        sets.push(format!("expiry_date = ${}::timestamptz", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("issuing_authority").and_then(|v| v.as_str()) {
        sets.push(format!("issuing_authority = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("status").and_then(|v| v.as_str()) {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("attachments") {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_training_certificates
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, certificate_no, employee_id, employee_name, training_type,
                  certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
                  issuing_authority, status, record_id::text AS record_id, attachments,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "培训证书不存在")),
        Err(e) => {
            tracing::error!("Failed to update training certificate: {}", e);
            return Json(ApiResponse::error(500, "培训证书更新失败"));
        }
    };
    let certificate = training_certificate_from_row(&row);
    Json(ApiResponse::success(certificate, "培训证书更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/certificates/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训证书 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_certificate(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_training_certificates
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training certificate: {}", e);
            return Json(ApiResponse::error(500, "培训证书删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "培训证书不存在"));
    }
    Json(ApiResponse::success((), "培训证书删除成功"))
}

pub async fn get_training_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "total_trainings": 0,
            "total_plans": 0,
            "total_records": 0,
            "total_certificates": 0,
            "completion_rate": 0.0,
        }),
        "获取培训统计成功",
    ))
}

#[derive(Debug, Deserialize)]
pub struct TrainingPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub training_type: Option<String>,
    pub category: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_training_plans(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<TrainingPlanQuery>,
) -> Json<ApiResponse<Vec<TrainingPlan>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(" AND training_type = ${}", params.len() + 1));
        params.push(training_type.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(" AND title ILIKE ${}", params.len() + 1));
        params.push(format!("%{search}%"));
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at::text AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list training plans: {}", e);
            return Json(ApiResponse::error(500, "获取培训计划列表失败"));
        }
    };

    let list: Vec<TrainingPlan> = rows.iter().map(training_plan_from_row).collect();
    Json(ApiResponse::success(list, "获取培训计划列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_training_plan(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingPlan>> {
    let tenant_id = resolve_tenant_id(&claims);
    let program_no = format!("TPL-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("新培训计划")
        .to_string();
    let content = req
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    // training_type 列为 NOT NULL：请求未提供时回落 "general"
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "general".to_string());
    let instructor = req
        .get("trainer")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let start_date = req
        .get("planned_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft")
        .to_string();

    let sql = r#"
        INSERT INTO ehs.training_programs
            (program_no, title, content, training_type, instructor, start_date, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8::uuid)
        RETURNING id::text AS id, program_no AS plan_no, title, content AS description,
                  training_type, start_date::text AS planned_date, instructor AS trainer,
                  status, created_at::text AS created_at, tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&program_no)
        .bind(&title)
        .bind(content)
        .bind(training_type)
        .bind(instructor)
        .bind(start_date)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training plan: {}", e);
            return Json(ApiResponse::error(500, "培训计划创建失败"));
        }
    };
    let plan = training_plan_from_row(&row);
    Json(ApiResponse::success(plan, "培训计划创建成功"))
}

#[derive(Debug, Deserialize)]
pub struct TrainingRecordQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub training_type: Option<String>,
    pub category: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_training_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<TrainingRecordQuery>,
) -> Json<ApiResponse<Vec<TrainingRecord>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(" AND training_type = ${}", params.len() + 1));
        params.push(training_type.clone());
    }
    if let Some(category) = &q.category {
        where_clause.push_str(&format!(" AND category = ${}", params.len() + 1));
        params.push(category.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR record_no ILIKE ${} OR trainer ILIKE ${})",
            params.len() + 1,
            params.len() + 2,
            params.len() + 3
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
               category, trainer, training_date::text AS training_date, location, duration_hours,
               participants, content, materials, result, pass_rate, status, created_by,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.training_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list training records: {}", e);
            return Json(ApiResponse::error(500, "获取培训记录列表失败"));
        }
    };

    let list: Vec<TrainingRecord> = rows.iter().map(training_record_from_row).collect();
    Json(ApiResponse::success(list, "获取培训记录列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_training_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingRecord>> {
    let tenant_id = resolve_tenant_id(&claims);
    let record_no = format!("TRC-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let plan_id = req
        .get("plan_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("培训记录")
        .to_string();
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .unwrap_or("safety")
        .to_string();
    let category = req
        .get("category")
        .and_then(|v| v.as_str())
        .unwrap_or("general")
        .to_string();
    let trainer = req
        .get("trainer")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let training_date = req
        .get("training_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let location = req
        .get("location")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let duration_hours = req.get("duration_hours").map(|v| v.to_string());
    let participants: serde_json::Value = req
        .get("participants")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));
    let content = req
        .get("content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let materials: serde_json::Value = req
        .get("materials")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));
    let result = req
        .get("result")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let pass_rate = req.get("pass_rate").map(|v| v.to_string());
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("ongoing")
        .to_string();

    let sql = r#"
        INSERT INTO ehs.training_records
            (record_no, program_id, title, training_type, category, trainer, training_date,
             location, duration_hours, participants, content, materials, result, pass_rate,
             status, tenant_id)
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::timestamptz, $8, $9::numeric, $10, $11, $12, $13, $14::numeric, $15, $16::uuid)
        RETURNING id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
                  category, trainer, training_date::text AS training_date, location, duration_hours,
                  participants, content, materials, result, pass_rate, status, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&record_no)
        .bind(plan_id)
        .bind(&title)
        .bind(&training_type)
        .bind(&category)
        .bind(trainer)
        .bind(training_date)
        .bind(location)
        .bind(duration_hours)
        .bind(participants)
        .bind(content)
        .bind(materials)
        .bind(result)
        .bind(pass_rate)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training record: {}", e);
            return Json(ApiResponse::error(500, "培训记录创建失败"));
        }
    };
    let record = training_record_from_row(&row);
    Json(ApiResponse::success(record, "培训记录创建成功"))
}

#[derive(Debug, Deserialize)]
pub struct TrainingCertificateQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub training_type: Option<String>,
    pub employee_id: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:cert:read"])),
    path = "/api/ehs/training/certificates",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_certificates(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<TrainingCertificateQuery>,
) -> Json<ApiResponse<Vec<TrainingCertificate>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(" AND training_type = ${}", params.len() + 1));
        params.push(training_type.clone());
    }
    if let Some(employee_id) = &q.employee_id {
        where_clause.push_str(&format!(" AND employee_id = ${}", params.len() + 1));
        params.push(employee_id.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (employee_name ILIKE ${} OR certificate_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, certificate_no, employee_id, employee_name, training_type,
               certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
               issuing_authority, status, record_id::text AS record_id, attachments,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list training certificates: {}", e);
            return Json(ApiResponse::error(500, "获取证书列表失败"));
        }
    };

    let list: Vec<TrainingCertificate> = rows.iter().map(training_certificate_from_row).collect();
    Json(ApiResponse::success(list, "获取证书列表成功"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:cert:admin"])),
    path = "/api/ehs/training/certificates",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_certificate(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingCertificate>> {
    let tenant_id = resolve_tenant_id(&claims);
    let certificate_no = format!("CERT-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let employee_id = req
        .get("employee_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let employee_name = req
        .get("employee_name")
        .and_then(|v| v.as_str())
        .unwrap_or("员工")
        .to_string();
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .unwrap_or("safety")
        .to_string();
    let certificate_type = req
        .get("certificate_type")
        .and_then(|v| v.as_str())
        .unwrap_or("certificate")
        .to_string();
    let issue_date = req
        .get("issue_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let expiry_date = req
        .get("expiry_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let issuing_authority = req
        .get("issuing_authority")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let record_id = req
        .get("record_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("valid")
        .to_string();
    let attachments: serde_json::Value = req
        .get("attachments")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));

    let sql = r#"
        INSERT INTO ehs.qa_ehs_training_certificates
            (certificate_no, employee_id, employee_name, training_type, certificate_type,
             issue_date, expiry_date, issuing_authority, status, record_id, attachments, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9, $10::uuid, $11, $12::uuid)
        RETURNING id::text AS id, certificate_no, employee_id, employee_name, training_type,
                  certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
                  issuing_authority, status, record_id::text AS record_id, attachments,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&certificate_no)
        .bind(&employee_id)
        .bind(&employee_name)
        .bind(&training_type)
        .bind(&certificate_type)
        .bind(issue_date)
        .bind(expiry_date)
        .bind(issuing_authority)
        .bind(&status)
        .bind(record_id)
        .bind(attachments)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training certificate: {}", e);
            return Json(ApiResponse::error(500, "证书创建失败"));
        }
    };
    let certificate = training_certificate_from_row(&row);
    Json(ApiResponse::success(certificate, "证书创建成功"))
}

/// 解析请求租户：超管 → nil UUID（全租户可见）；否则取 claims.tenant_id。
fn resolve_tenant_id(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// training_programs 行 → TrainingPlan（SELECT 列别名对齐本函数字段）
fn training_plan_from_row(r: &sqlx::postgres::PgRow) -> TrainingPlan {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    TrainingPlan {
        id: r.try_get("id").unwrap_or_default(),
        plan_no: r.try_get("plan_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        description: r.try_get("description").ok().flatten(),
        training_type: r.try_get("training_type").ok().flatten(),
        planned_date: r.try_get("planned_date").ok().flatten(),
        trainer: r.try_get("trainer").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "draft".to_string()),
        created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// qa_ehs_training_certificates 行 → TrainingCertificate（SELECT 列别名对齐本函数字段）
fn training_certificate_from_row(r: &sqlx::postgres::PgRow) -> TrainingCertificate {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    TrainingCertificate {
        id: r.try_get("id").unwrap_or_default(),
        certificate_no: r.try_get("certificate_no").unwrap_or_default(),
        employee_id: r.try_get("employee_id").unwrap_or_default(),
        employee_name: r.try_get("employee_name").unwrap_or_default(),
        training_type: r.try_get("training_type").unwrap_or_default(),
        certificate_type: r.try_get("certificate_type").unwrap_or_default(),
        issue_date: r.try_get("issue_date").ok().flatten(),
        expiry_date: r.try_get("expiry_date").ok().flatten(),
        issuing_authority: r.try_get("issuing_authority").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "valid".to_string()),
        record_id: r.try_get("record_id").ok().flatten(),
        attachments,
        created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
        updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// ehs.training_records 行 → TrainingRecord（SELECT 列别名对齐本函数字段）
fn training_record_from_row(r: &sqlx::postgres::PgRow) -> TrainingRecord {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let participants: Option<serde_json::Value> = r.try_get("participants").ok().flatten();
    let participants = participants.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    let materials: Option<serde_json::Value> = r.try_get("materials").ok().flatten();
    let materials = materials.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    TrainingRecord {
        id: r.try_get("id").unwrap_or_default(),
        record_no: r.try_get("record_no").unwrap_or_default(),
        plan_id: r.try_get("plan_id").ok().flatten(),
        title: r.try_get("title").unwrap_or_default(),
        training_type: r.try_get("training_type").unwrap_or_default(),
        category: r.try_get("category").unwrap_or_default(),
        trainer: r.try_get("trainer").ok().flatten(),
        training_date: r.try_get("training_date").ok().flatten(),
        location: r.try_get("location").ok().flatten(),
        duration_hours: r.try_get("duration_hours").ok().flatten(),
        participants,
        content: r.try_get("content").ok().flatten(),
        materials,
        result: r.try_get("result").ok().flatten(),
        pass_rate: r.try_get("pass_rate").ok().flatten(),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "ongoing".to_string()),
        created_by: r.try_get("created_by").ok().flatten(),
        created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
        updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}
