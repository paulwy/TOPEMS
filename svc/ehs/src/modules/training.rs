//! Training handlers

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::modules::training_status::{
    TrainingCertificateStatus, TrainingProgramStatus, TrainingRecordStatus, TrainingSessionStatus,
};
use crate::shared::permission::{dual_scope, open_read_scope, open_write_scope};
use crate::shared::AppState;

async fn training_count(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    sql: String,
    tenant: Option<Uuid>,
) -> i64 {
    let mut q = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(sql));
    if let Some(t) = tenant {
        q = q.bind(t);
    }
    q.fetch_one(&mut *scope).await.unwrap_or(0)
}

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
    pub scheduled_at: Option<DateTime<Utc>>,
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
    pub created_at: DateTime<Utc>,

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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

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
) -> ApiResponse<Vec<Training>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.list_trainings",
        "ehs.qa_ehs_trainings",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 不带租户谓词。
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"SELECT id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at AS scheduled_at,
                  status, tenant_id
           FROM ehs.qa_ehs_trainings
           WHERE tenant_id = $1::uuid AND deleted_at IS NULL ORDER BY updated_at DESC"#
    } else {
        r#"SELECT id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at AS scheduled_at,
                  status, tenant_id
           FROM ehs.qa_ehs_trainings
           WHERE deleted_at IS NULL ORDER BY updated_at DESC"#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list trainings: {}", e);
            return ApiResponse::server_error("培训列表获取失败");
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
                .try_get::<Option<DateTime<Utc>>, _>("scheduled_at")
                .unwrap_or(None),
            status: r.try_get::<String, _>("status").unwrap_or_default(),
            tenant_id: r.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
        })
        .collect();
    ApiResponse::success(list, "获取培训列表成功")
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
) -> ApiResponse<Training> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        // scope-exempt: no-request-txn
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
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
    let status = match req.get("status").and_then(|v| v.as_str()) {
        None | Some("") => TrainingSessionStatus::DEFAULT,
        Some(raw) => match TrainingSessionStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训场次状态"),
        },
    };

    let sql = r#"
        INSERT INTO ehs.qa_ehs_trainings
            (training_no, title, content, trainer, training_type,
             duration_hours, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at AS scheduled_at,
                  status, tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&training_no)
        .bind(&title)
        .bind(content)
        .bind(trainer)
        .bind(training_type)
        .bind(duration_hours)
        .bind(status.as_db_str())
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training: {}", e);
            return ApiResponse::server_error("培训创建失败");
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
            .try_get::<Option<DateTime<Utc>>, _>("scheduled_at")
            .unwrap_or(None),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        tenant_id: row.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(training, "培训创建成功")
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
) -> ApiResponse<Training> {
    let tenant_scope =
        match dual_scope(&claims, "ehs.training.get_training", "ehs.qa_ehs_trainings") {
            Ok(s) => s,
            Err(resp) => return resp,
        };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"SELECT id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at AS scheduled_at,
                  status, tenant_id
           FROM ehs.qa_ehs_trainings
           WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL"#
    } else {
        r#"SELECT id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at AS scheduled_at,
                  status, tenant_id
           FROM ehs.qa_ehs_trainings
           WHERE id = $1::uuid AND deleted_at IS NULL"#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训不存在"),
        Err(e) => {
            tracing::error!("Failed to get training {}: {}", id, e);
            return ApiResponse::server_error("培训获取失败");
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
            .try_get::<Option<DateTime<Utc>>, _>("scheduled_at")
            .unwrap_or(None),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        tenant_id: row.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
    };
    ApiResponse::success(training, "获取培训成功")
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
) -> ApiResponse<Training> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.update_training",
        "ehs.qa_ehs_trainings",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
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
    let status = match req.get("status").and_then(|v| v.as_str()) {
        None | Some("") => None,
        Some(raw) => match TrainingSessionStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => return ApiResponse::bad_request("无效的培训场次状态"),
        },
    };

    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        " AND tenant_id = $8::uuid"
    } else {
        ""
    };
    let sql = format!(
        r#"UPDATE ehs.qa_ehs_trainings
              SET title = COALESCE($1, title),
                  content = COALESCE($2, content),
                  trainer = COALESCE($3, trainer),
                  training_type = COALESCE($4, training_type),
                  duration_hours = COALESCE($5, duration_hours),
                  status = COALESCE($6, status),
                  updated_at = now()
            WHERE id = $7::uuid AND deleted_at IS NULL{tenant_filter}
          RETURNING id::text AS id, training_no, title, content, trainer,
                  training_type, duration_hours, scheduled_at AS scheduled_at,
                  status, tenant_id"#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(title)
        .bind(content)
        .bind(trainer)
        .bind(training_type)
        .bind(duration_hours)
        .bind(status)
        .bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训不存在"),
        Err(e) => {
            tracing::error!("Failed to update training {}: {}", id, e);
            return ApiResponse::server_error("培训更新失败");
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
            .try_get::<Option<DateTime<Utc>>, _>("scheduled_at")
            .unwrap_or(None),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        tenant_id: row.try_get::<Uuid, _>("tenant_id").unwrap_or_default(),
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(training, "培训更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.delete_training",
        "ehs.qa_ehs_trainings",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        "UPDATE ehs.qa_ehs_trainings SET deleted_at = now() \
         WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL"
    } else {
        "UPDATE ehs.qa_ehs_trainings SET deleted_at = now() \
         WHERE id = $1::uuid AND deleted_at IS NULL"
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let res = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training {}: {}", id, e);
            return ApiResponse::server_error("培训删除失败");
        }
    };
    if res.rows_affected() == 0 {
        return ApiResponse::not_found("培训不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "培训删除成功")
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
) -> ApiResponse<TrainingPlan> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.get_training_plan",
        "ehs.training_programs",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Getting training plan: {}", id);
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训计划不存在"),
        Err(e) => {
            tracing::error!("Failed to get training plan: {}", e);
            return ApiResponse::server_error("获取培训计划失败");
        }
    };
    let plan = training_plan_from_row(&row);
    ApiResponse::success(plan, "获取培训计划成功")
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
) -> ApiResponse<TrainingPlan> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.update_training_plan",
        "ehs.training_programs",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
        let status = match TrainingProgramStatus::from_db_str(v) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训计划状态"),
        };
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(status.as_db_str().to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.training_programs
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING id::text AS id, program_no AS plan_no, title, content AS description,
                  training_type, start_date::text AS planned_date, instructor AS trainer,
                  status, created_at AS created_at, tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训计划不存在"),
        Err(e) => {
            tracing::error!("Failed to update training plan: {}", e);
            return ApiResponse::server_error("培训计划更新失败");
        }
    };
    let plan = training_plan_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(plan, "培训计划更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.delete_training_plan",
        "ehs.training_programs",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.training_programs
        SET deleted_at = now()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        UPDATE ehs.training_programs
        SET deleted_at = now()
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training plan: {}", e);
            return ApiResponse::server_error("培训计划删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("培训计划不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "培训计划删除成功")
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
) -> ApiResponse<TrainingRecord> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.get_training_record",
        "ehs.training_records",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Getting training record: {}", id);
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
               category, trainer, training_date::text AS training_date, location, duration_hours,
               participants, content, materials, result, pass_rate, status, created_by,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.training_records
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        SELECT id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
               category, trainer, training_date::text AS training_date, location, duration_hours,
               participants, content, materials, result, pass_rate, status, created_by,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.training_records
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训记录不存在"),
        Err(e) => {
            tracing::error!("Failed to get training record: {}", e);
            return ApiResponse::server_error("获取培训记录失败");
        }
    };
    let record = training_record_from_row(&row);
    ApiResponse::success(record, "获取培训记录成功")
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
) -> ApiResponse<TrainingRecord> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.update_training_record",
        "ehs.training_records",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
        let status = match TrainingRecordStatus::from_db_str(v) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训记录状态"),
        };
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(status.as_db_str().to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.training_records
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
                  category, trainer, training_date::text AS training_date, location, duration_hours,
                  participants, content, materials, result, pass_rate, status, created_by,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update training record: {}", e);
            return ApiResponse::server_error("培训记录更新失败");
        }
    };
    let record = training_record_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(record, "培训记录更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.delete_training_record",
        "ehs.training_records",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.training_records
        SET deleted_at = now()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        UPDATE ehs.training_records
        SET deleted_at = now()
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training record: {}", e);
            return ApiResponse::server_error("培训记录删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("培训记录不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "培训记录删除成功")
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
) -> ApiResponse<TrainingCertificate> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.get_certificate",
        "ehs.qa_ehs_training_certificates",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Getting certificate: {}", id);
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, certificate_no, employee_id, employee_name, training_type,
               certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
               issuing_authority, status, record_id::text AS record_id, attachments,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        SELECT id::text AS id, certificate_no, employee_id, employee_name, training_type,
               certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
               issuing_authority, status, record_id::text AS record_id, attachments,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训证书不存在"),
        Err(e) => {
            tracing::error!("Failed to get training certificate: {}", e);
            return ApiResponse::server_error("获取培训证书失败");
        }
    };
    let certificate = training_certificate_from_row(&row);
    ApiResponse::success(certificate, "获取培训证书成功")
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
) -> ApiResponse<TrainingCertificate> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.update_certificate",
        "ehs.qa_ehs_training_certificates",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
        let status = match TrainingCertificateStatus::from_db_str(v) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训证书状态"),
        };
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(status.as_db_str().to_string());
    }
    if let Some(v) = req.get("attachments") {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_training_certificates
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING id::text AS id, certificate_no, employee_id, employee_name, training_type,
                  certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
                  issuing_authority, status, record_id::text AS record_id, attachments,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("培训证书不存在"),
        Err(e) => {
            tracing::error!("Failed to update training certificate: {}", e);
            return ApiResponse::server_error("培训证书更新失败");
        }
    };
    let certificate = training_certificate_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(certificate, "培训证书更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.delete_certificate",
        "ehs.qa_ehs_training_certificates",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.qa_ehs_training_certificates
        SET deleted_at = now()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        UPDATE ehs.qa_ehs_training_certificates
        SET deleted_at = now()
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete training certificate: {}", e);
            return ApiResponse::server_error("培训证书删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("培训证书不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "培训证书删除成功")
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_training_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.get_training_statistics",
        "ehs.qa_ehs_trainings",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant = tenant_scope.tenant_id();
    // 租户通道显式绑定 tenant_id；系统通道显式不带租户谓词。
    let tc = if tenant.is_some() {
        "tenant_id = $1::uuid AND deleted_at IS NULL"
    } else {
        "deleted_at IS NULL"
    };

    let total_trainings = training_count(
        &mut scope,
        format!("SELECT COUNT(*) FROM ehs.qa_ehs_trainings WHERE {tc}"),
        tenant,
    )
    .await;
    let total_plans = training_count(
        &mut scope,
        format!("SELECT COUNT(*) FROM ehs.training_programs WHERE {tc}"),
        tenant,
    )
    .await;
    let total_records = training_count(
        &mut scope,
        format!("SELECT COUNT(*) FROM ehs.training_records WHERE {tc}"),
        tenant,
    )
    .await;
    let total_certificates = training_count(
        &mut scope,
        format!("SELECT COUNT(*) FROM ehs.qa_ehs_training_certificates WHERE {tc}"),
        tenant,
    )
    .await;

    let completion_rate = if total_trainings > 0 {
        (total_records as f64 / total_trainings as f64).min(1.0)
    } else {
        0.0
    };

    let obj = serde_json::json!({
        "total_trainings": total_trainings,
        "total_plans": total_plans,
        "total_records": total_records,
        "total_certificates": total_certificates,
        "completion_rate": completion_rate,
    });
    ApiResponse::success(obj, "获取培训统计成功")
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
) -> ApiResponse<Vec<TrainingPlan>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.list_training_plans",
        "ehs.training_programs",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 不带租户谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(raw) = &q.status {
        let status = match TrainingProgramStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训计划状态"),
        };
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(status.as_db_str().to_string());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(
            " AND training_type = ${}",
            params.len() + filter_base
        ));
        params.push(training_type.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(" AND title ILIKE ${}", params.len() + filter_base));
        params.push(format!("%{search}%"));
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list training plans: {}", e);
            return ApiResponse::server_error("获取培训计划列表失败");
        }
    };

    let list: Vec<TrainingPlan> = rows.iter().map(training_plan_from_row).collect();
    ApiResponse::success(list, "获取培训计划列表成功")
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
) -> ApiResponse<TrainingPlan> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        // scope-exempt: no-request-txn
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
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
    let status = match req.get("status").and_then(|v| v.as_str()) {
        None | Some("") => TrainingProgramStatus::DEFAULT,
        Some(raw) => match TrainingProgramStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训计划状态"),
        },
    };

    let sql = r#"
        INSERT INTO ehs.training_programs
            (program_no, title, content, training_type, instructor, start_date, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8::uuid)
        RETURNING id::text AS id, program_no AS plan_no, title, content AS description,
                  training_type, start_date::text AS planned_date, instructor AS trainer,
                  status, created_at AS created_at, tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&program_no)
        .bind(&title)
        .bind(content)
        .bind(training_type)
        .bind(instructor)
        .bind(start_date)
        .bind(status.as_db_str())
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training plan: {}", e);
            return ApiResponse::server_error("培训计划创建失败");
        }
    };
    let plan = training_plan_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(plan, "培训计划创建成功")
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
) -> ApiResponse<Vec<TrainingRecord>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.list_training_records",
        "ehs.training_records",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 不带租户谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(raw) = &q.status {
        let status = match TrainingRecordStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训记录状态"),
        };
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(status.as_db_str().to_string());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(
            " AND training_type = ${}",
            params.len() + filter_base
        ));
        params.push(training_type.clone());
    }
    if let Some(category) = &q.category {
        where_clause.push_str(&format!(" AND category = ${}", params.len() + filter_base));
        params.push(category.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR record_no ILIKE ${} OR trainer ILIKE ${})",
            params.len() + filter_base,
            params.len() + filter_base + 1,
            params.len() + filter_base + 2
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
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.training_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list training records: {}", e);
            return ApiResponse::server_error("获取培训记录列表失败");
        }
    };

    let list: Vec<TrainingRecord> = rows.iter().map(training_record_from_row).collect();
    ApiResponse::success(list, "获取培训记录列表成功")
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
) -> ApiResponse<TrainingRecord> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        // scope-exempt: no-request-txn
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
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
    let status = match req.get("status").and_then(|v| v.as_str()) {
        None | Some("") => TrainingRecordStatus::DEFAULT,
        Some(raw) => match TrainingRecordStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训记录状态"),
        },
    };

    let sql = r#"
        INSERT INTO ehs.training_records
            (record_no, program_id, title, training_type, category, trainer, training_date,
             location, duration_hours, participants, content, materials, result, pass_rate,
             status, tenant_id)
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::timestamptz, $8, $9::numeric, $10, $11, $12, $13, $14::numeric, $15, $16::uuid)
        RETURNING id::text AS id, record_no, program_id::text AS plan_id, title, training_type,
                  category, trainer, training_date::text AS training_date, location, duration_hours,
                  participants, content, materials, result, pass_rate, status, created_by,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
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
        .bind(status.as_db_str())
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training record: {}", e);
            return ApiResponse::server_error("培训记录创建失败");
        }
    };
    let record = training_record_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(record, "培训记录创建成功")
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
) -> ApiResponse<Vec<TrainingCertificate>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.training.list_certificates",
        "ehs.qa_ehs_training_certificates",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open training scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 不带租户谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(raw) = &q.status {
        let status = match TrainingCertificateStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训证书状态"),
        };
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(status.as_db_str().to_string());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(
            " AND training_type = ${}",
            params.len() + filter_base
        ));
        params.push(training_type.clone());
    }
    if let Some(employee_id) = &q.employee_id {
        where_clause.push_str(&format!(
            " AND employee_id = ${}",
            params.len() + filter_base
        ));
        params.push(employee_id.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (employee_name ILIKE ${} OR certificate_no ILIKE ${})",
            params.len() + filter_base,
            params.len() + filter_base + 1
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
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list training certificates: {}", e);
            return ApiResponse::server_error("获取证书列表失败");
        }
    };

    let list: Vec<TrainingCertificate> = rows.iter().map(training_certificate_from_row).collect();
    ApiResponse::success(list, "获取证书列表成功")
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
) -> ApiResponse<TrainingCertificate> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let tenant_id = tenant;
    // 显式租户写作用域：单条连接 + 事务级租户 GUC；提交由本函数显式完成。
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        // scope-exempt: no-request-txn
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
    let status = match req.get("status").and_then(|v| v.as_str()) {
        None | Some("") => TrainingCertificateStatus::DEFAULT,
        Some(raw) => match TrainingCertificateStatus::from_db_str(raw) {
            Some(status) => status,
            None => return ApiResponse::bad_request("无效的培训证书状态"),
        },
    };
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
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&certificate_no)
        .bind(&employee_id)
        .bind(&employee_name)
        .bind(&training_type)
        .bind(&certificate_type)
        .bind(issue_date)
        .bind(expiry_date)
        .bind(issuing_authority)
        .bind(status.as_db_str())
        .bind(record_id)
        .bind(attachments)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training certificate: {}", e);
            return ApiResponse::server_error("证书创建失败");
        }
    };
    let certificate = training_certificate_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit training certificate: {}", e);
        return ApiResponse::server_error("证书创建失败");
    }
    ApiResponse::success(certificate, "证书创建成功")
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
        created_at: r
            .try_get::<DateTime<Utc>, _>("created_at")
            .unwrap_or_default(),
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
        created_at: r
            .try_get::<DateTime<Utc>, _>("created_at")
            .unwrap_or_default(),
        updated_at: r
            .try_get::<DateTime<Utc>, _>("updated_at")
            .unwrap_or_default(),
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
        created_at: r
            .try_get::<DateTime<Utc>, _>("created_at")
            .unwrap_or_default(),
        updated_at: r
            .try_get::<DateTime<Utc>, _>("updated_at")
            .unwrap_or_default(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}
