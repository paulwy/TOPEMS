use axum::{
    extract::{Extension, Json, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use utoipa::ToSchema;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use super::mobile_content_status::MobilePatrolStatus;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

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
    /// DB 列是 uuid，wire 字段保持字符串（serde 将 Uuid 序列化为字符串）
    pub checked_by: Option<Uuid>,
    pub checked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算巡逻完成率：visited / total_checkpoints * 100.0。
/// 当 total_checkpoints 为 0 时返回 0.0 以避免除零。
pub fn calculate_patrol_completion(total_checkpoints: usize, visited: usize) -> f64 {
    if total_checkpoints == 0 {
        return 0.0;
    }
    let visited = visited.min(total_checkpoints);
    (visited as f64 / total_checkpoints as f64) * 100.0
}

/// 判断巡逻是否已逾期：当当前时间 `now` 超过 `scheduled_time + deadline` 时视为逾期。
pub fn is_patrol_overdue(scheduled_time: i64, deadline: i64, now: i64) -> bool {
    let end_time = scheduled_time.saturating_add(deadline);
    now > end_time
}

/// 判断给定的巡逻状态字符串是否有效。
pub fn is_valid_patrol_status(status: &str) -> bool {
    MobilePatrolStatus::from_db_str(status).is_some()
}

/// 根据完成率返回表示进度的状态字符串。
pub fn patrol_progress_label(completion_pct: f64) -> &'static str {
    if completion_pct <= 0.0 {
        "not_started"
    } else if completion_pct >= 100.0 {
        "completed"
    } else {
        "in_progress"
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:read"])),
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
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let __mobile_response = {
        let records: Vec<PatrolRecord> = match sqlx::query_as::<_, PatrolRecord>(
        only_own_schema_query!("mobile", "SELECT id, title, description, location_lat::float8 AS location_lat, location_lng::float8 AS location_lng, address, patrol_type, status, checked_by, checked_at, created_at 
         FROM mobile.patrol_records 
         WHERE deleted_at IS NULL AND checked_by = $1 
         ORDER BY created_at DESC")
    )
    .bind(Uuid::parse_str(&user_id).ok())
    .fetch_all(&mut scope)

    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询巡逻记录失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(records, "获取巡逻记录成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:read"])),
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
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let __mobile_response = {
        let record = match sqlx::query_as::<_, PatrolRecord>(
        only_own_schema_query!("mobile", "SELECT id, title, description, location_lat::float8 AS location_lat, location_lng::float8 AS location_lng, address, patrol_type, status, checked_by, checked_at, created_at 
         FROM mobile.patrol_records 
         WHERE id = $1 AND checked_by = $2 AND deleted_at IS NULL")
    )
    .bind(id)
    .bind(Uuid::parse_str(&user_id).ok())
    .fetch_optional(&mut scope)

    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, ApiResponse::not_found("巡逻记录不存在"));
        }
        Err(e) => {
            tracing::error!("查询巡逻记录失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(record, "获取巡逻记录成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:config:write"])),
    path = "/patrol-records",
    tag = "patrol",
    request_body = CreatePatrolRequest,
    responses(
        (status = 201, description = "创建巡逻记录成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 500, description = "创建失败")
    )
)]
pub async fn create_patrol_record(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<CreatePatrolRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let patrol_id = Uuid::new_v4();
    let status = match payload.status.as_deref() {
        None | Some("") => MobilePatrolStatus::DEFAULT,
        Some(raw) => match MobilePatrolStatus::from_db_str(raw) {
            Some(status) => status,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的巡逻状态"),
                )
            }
        },
    };

    if let Err(e) = sqlx::query(
        only_own_schema_query!("mobile", "INSERT INTO mobile.patrol_records (id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)")
    )
    .bind(patrol_id)
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(payload.location_lat)
    .bind(payload.location_lng)
    .bind(&payload.address)
    .bind(&payload.patrol_type)
    .bind(status.as_db_str())
    .bind(Uuid::parse_str(&user_id).ok())
    .bind(Utc::now())
    .bind(tenant_filter(&claims))
    .execute(&mut scope)
    .await
    {
        tracing::error!("创建巡逻记录失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("创建失败"));
    }

    let __mobile_response = {
        let record = PatrolRecord {
            id: patrol_id,
            title: payload.title,
            description: payload.description,
            location_lat: payload.location_lat,
            location_lng: payload.location_lng,
            address: payload.address,
            patrol_type: payload.patrol_type,
            status: status.as_db_str().to_string(),
            checked_by: Uuid::parse_str(&user_id).ok(),
            checked_at: None,
            created_at: Utc::now(),
        };

        (
            StatusCode::CREATED,
            ApiResponse::success(record, "创建巡逻记录成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

pub async fn update_patrol_record(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePatrolRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let current_record = match sqlx::query_as::<_, PatrolRecord>(
        only_own_schema_query!("mobile", "SELECT id, title, description, location_lat::float8 AS location_lat, location_lng::float8 AS location_lng, address, patrol_type, status, checked_by, checked_at, created_at 
         FROM mobile.patrol_records WHERE id = $1 AND checked_by = $2 AND deleted_at IS NULL")
    )
    .bind(id)
    .bind(Uuid::parse_str(&user_id).ok())
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, ApiResponse::not_found("巡逻记录不存在或无权修改"));
        }
        Err(e) => {
            tracing::error!("查询巡逻记录失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

    let title = payload.title.unwrap_or(current_record.title);
    let description = payload.description.or(current_record.description);
    let location_lat = payload.location_lat.unwrap_or(current_record.location_lat);
    let location_lng = payload.location_lng.unwrap_or(current_record.location_lng);
    let address = payload.address.or(current_record.address);
    let status = match payload.status.as_deref() {
        None | Some("") => match MobilePatrolStatus::from_db_str(&current_record.status) {
            Some(status) => status,
            None => {
                return (
                    StatusCode::CONFLICT,
                    ApiResponse::conflict("巡逻记录当前状态异常，请刷新后重试"),
                )
            }
        },
        Some(raw) => match MobilePatrolStatus::from_db_str(raw) {
            Some(status) => status,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    ApiResponse::bad_request("无效的巡逻状态"),
                )
            }
        },
    };

    if let Err(e) = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.patrol_records
         SET title = $1, description = $2, location_lat = $3, location_lng = $4, address = $5, status = $6
         WHERE id = $7 AND checked_by = $8")
    )
    .bind(&title)
    .bind(&description)
    .bind(location_lat)
    .bind(location_lng)
    .bind(&address)
    .bind(status.as_db_str())
    .bind(id)
    .bind(Uuid::parse_str(&user_id).ok())
    .execute(&mut scope)
    .await
    {
        tracing::error!("更新巡逻记录失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("更新失败"));
    }

    let __mobile_response = { (StatusCode::OK, ApiResponse::success((), "更新成功")) };
    let _ = scope.commit().await;
    __mobile_response
}

pub async fn delete_patrol_record(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.patrol_records SET deleted_at = NOW() WHERE id = $1 AND checked_by = $2 AND deleted_at IS NULL"),
    )
    .bind(id)
    .bind(Uuid::parse_str(&user_id).ok())
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "删除成功"))
            }
            Ok(_) => (
                StatusCode::NOT_FOUND,
                ApiResponse::not_found("巡逻记录不存在或无权删除"),
            ),
            Err(e) => {
                tracing::error!("删除巡逻记录失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("删除失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_patrol_completion ----

    #[test]
    fn test_calculate_patrol_completion_zero_total() {
        assert_eq!(calculate_patrol_completion(0, 0), 0.0);
        assert_eq!(calculate_patrol_completion(0, 5), 0.0);
    }

    #[test]
    fn test_calculate_patrol_completion_full() {
        assert_eq!(calculate_patrol_completion(10, 10), 100.0);
    }

    #[test]
    fn test_calculate_patrol_completion_half() {
        assert_eq!(calculate_patrol_completion(10, 5), 50.0);
    }

    #[test]
    fn test_calculate_patrol_completion_none_visited() {
        assert_eq!(calculate_patrol_completion(8, 0), 0.0);
    }

    #[test]
    fn test_calculate_patrol_completion_visited_exceeds_total() {
        // 超过 total 的部分应被截断
        assert_eq!(calculate_patrol_completion(4, 10), 100.0);
    }

    #[test]
    fn test_calculate_patrol_completion_partial_third() {
        let result = calculate_patrol_completion(9, 3);
        assert!((result - 33.333_333_333_333_336).abs() < 1e-6);
    }

    // ---- is_patrol_overdue ----

    #[test]
    fn test_is_patrol_overdue_before_window() {
        // scheduled=100, deadline=50, now=80 -> 未到期
        assert!(!is_patrol_overdue(100, 50, 80));
    }

    #[test]
    fn test_is_patrol_overdue_at_deadline() {
        // scheduled=100, deadline=50, now=150 -> 正好等于截止时间，不算逾期
        assert!(!is_patrol_overdue(100, 50, 150));
    }

    #[test]
    fn test_is_patrol_overdue_after_deadline() {
        // scheduled=100, deadline=50, now=151 -> 已逾期
        assert!(is_patrol_overdue(100, 50, 151));
    }

    #[test]
    fn test_is_patrol_overdue_zero_deadline_immediate() {
        // deadline=0 时，只要 now > scheduled_time 即逾期
        assert!(is_patrol_overdue(100, 0, 101));
        assert!(!is_patrol_overdue(100, 0, 100));
    }

    #[test]
    fn test_is_patrol_overdue_saturating_add() {
        // i64 最大值附近的饱和加法
        assert!(!is_patrol_overdue(i64::MAX, 10, 100));
    }

    // ---- is_valid_patrol_status ----

    #[test]
    fn test_is_valid_patrol_status_valid() {
        assert!(is_valid_patrol_status("pending"));
        assert!(is_valid_patrol_status("in_progress"));
        assert!(is_valid_patrol_status("completed"));
        assert!(is_valid_patrol_status("cancelled"));
    }

    #[test]
    fn test_is_valid_patrol_status_invalid() {
        assert!(!is_valid_patrol_status(""));
        assert!(!is_valid_patrol_status("done"));
        assert!(!is_valid_patrol_status("PENDING"));
        assert!(!is_valid_patrol_status("paused"));
    }

    // ---- patrol_progress_label ----

    #[test]
    fn test_patrol_progress_label_zero() {
        assert_eq!(patrol_progress_label(0.0), "not_started");
    }

    #[test]
    fn test_patrol_progress_label_negative() {
        assert_eq!(patrol_progress_label(-1.0), "not_started");
    }

    #[test]
    fn test_patrol_progress_label_full() {
        assert_eq!(patrol_progress_label(100.0), "completed");
    }

    #[test]
    fn test_patrol_progress_label_above_full() {
        assert_eq!(patrol_progress_label(120.0), "completed");
    }

    #[test]
    fn test_patrol_progress_label_partial() {
        assert_eq!(patrol_progress_label(50.0), "in_progress");
        assert_eq!(patrol_progress_label(99.99), "in_progress");
        assert_eq!(patrol_progress_label(0.01), "in_progress");
    }
}
