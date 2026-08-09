use axum::{
    extract::{Json, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PatrolRecord {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub patrol_type: String,
    pub status: String,
    pub checked_by: String,
    pub checked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePatrolRequest {
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub patrol_type: String,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePatrolRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub address: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    path = "/patrol-records",
    tag = "patrol",
    responses(
        (status = 200, description = "获取巡逻记录成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_all_patrol_records(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let records: Vec<PatrolRecord> = match sqlx::query_as::<_, PatrolRecord>(
        "SELECT id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at 
         FROM patrol_records 
         WHERE checked_by = $1 
         ORDER BY created_at DESC"
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询巡逻记录失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (
        StatusCode::OK,
        axum::Json(ApiResponse::success(records, "获取巡逻记录成功")),
    )
}

#[utoipa::path(
    get,
    path = "/patrol-records/{id}",
    tag = "patrol",
    params(
        ("id" = Uuid, Path, description = "巡逻记录ID")
    ),
    responses(
        (status = 200, description = "获取巡逻记录成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 404, description = "巡逻记录不存在"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_patrol_record(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let record = match sqlx::query_as::<_, PatrolRecord>(
        "SELECT id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at 
         FROM patrol_records 
         WHERE id = $1 AND checked_by = $2"
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, axum::Json(ApiResponse::error(404, "巡逻记录不存在")));
        }
        Err(e) => {
            tracing::error!("查询巡逻记录失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (
        StatusCode::OK,
        axum::Json(ApiResponse::success(record, "获取巡逻记录成功")),
    )
}

#[utoipa::path(
    post,
    path = "/patrol-records",
    tag = "patrol",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建巡逻记录成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 500, description = "创建失败")
    )
)]
pub async fn create_patrol_record(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<CreatePatrolRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let patrol_id = Uuid::new_v4();
    let status = payload.status.unwrap_or_else(|| "pending".to_string());

    if let Err(e) = sqlx::query(
        "INSERT INTO patrol_records (id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    .bind(patrol_id)
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(payload.location_lat)
    .bind(payload.location_lng)
    .bind(&payload.address)
    .bind(&payload.patrol_type)
    .bind(&status)
    .bind(&user_id)
    .bind(Utc::now())
    .execute(&pool)
    .await
    {
        tracing::error!("创建巡逻记录失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "创建失败")));
    }

    let record = PatrolRecord {
        id: patrol_id,
        title: payload.title,
        description: payload.description,
        location_lat: payload.location_lat,
        location_lng: payload.location_lng,
        address: payload.address,
        patrol_type: payload.patrol_type,
        status,
        checked_by: user_id,
        checked_at: None,
        created_at: Utc::now(),
    };

    (
        StatusCode::CREATED,
        axum::Json(ApiResponse::success(record, "创建巡逻记录成功")),
    )
}

pub async fn update_patrol_record(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePatrolRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let current_record = match sqlx::query_as::<_, PatrolRecord>(
        "SELECT id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at 
         FROM patrol_records WHERE id = $1 AND checked_by = $2"
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, axum::Json(ApiResponse::error(404, "巡逻记录不存在或无权修改")));
        }
        Err(e) => {
            tracing::error!("查询巡逻记录失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "查询失败")));
        }
    };

    let title = payload.title.unwrap_or(current_record.title);
    let description = payload.description.or(current_record.description);
    let location_lat = payload.location_lat.unwrap_or(current_record.location_lat);
    let location_lng = payload.location_lng.unwrap_or(current_record.location_lng);
    let address = payload.address.or(current_record.address);
    let status = payload.status.unwrap_or(current_record.status);

    if let Err(e) = sqlx::query(
        "UPDATE patrol_records 
         SET title = $1, description = $2, location_lat = $3, location_lng = $4, address = $5, status = $6, updated_at = $7 
         WHERE id = $8 AND checked_by = $9"
    )
    .bind(&title)
    .bind(&description)
    .bind(location_lat)
    .bind(location_lng)
    .bind(&address)
    .bind(&status)
    .bind(Utc::now())
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await
    {
        tracing::error!("更新巡逻记录失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "更新失败")));
    }

    (
        StatusCode::OK,
        axum::Json(ApiResponse::success((), "更新成功")),
    )
}

pub async fn delete_patrol_record(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let result = sqlx::query(
        "UPDATE patrol_records SET deleted_at = NOW() WHERE id = $1 AND checked_by = $2",
    )
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            axum::Json(ApiResponse::success((), "删除成功")),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            axum::Json(ApiResponse::error(404, "巡逻记录不存在或无权删除")),
        ),
        Err(e) => {
            tracing::error!("删除巡逻记录失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(ApiResponse::error(500, "删除失败")),
            )
        }
    }
}
