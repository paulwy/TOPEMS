use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::{response::ApiResponse, TopemsError};

const NIL_UUID: Uuid = Uuid::nil();

/// 非超管可见行：本租户或公共（nil）行；超管不限制。
fn tenant_scope(claims: &Claims) -> Option<String> {
    if claims.is_superuser {
        return None;
    }
    Some(format!(
        "(tenant_id = '{}' OR tenant_id = '{NIL_UUID}')",
        get_tenant_id_from_claims(claims)
    ))
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Geofence {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub chat_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub shape_type: String,
    pub coordinates: serde_json::Value,
    pub radius: Option<f64>,
    pub event_types: serde_json::Value,
    pub status: String,
    pub trigger_cooldown: i32,
    pub notify_channels: serde_json::Value,
    pub notify_users: serde_json::Value,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGeofenceRequest {
    pub name: String,
    pub description: Option<String>,
    pub chat_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub shape_type: String,
    pub coordinates: serde_json::Value,
    pub radius: Option<f64>,
    pub event_types: Option<Vec<String>>,
    pub status: Option<String>,
    pub trigger_cooldown: Option<i32>,
    pub notify_channels: Option<Vec<String>>,
    pub notify_users: Option<Vec<String>>,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGeofenceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub coordinates: Option<serde_json::Value>,
    pub radius: Option<f64>,
    pub event_types: Option<Vec<String>>,
    pub status: Option<String>,
    pub trigger_cooldown: Option<i32>,
    pub notify_channels: Option<Vec<String>>,
    pub notify_users: Option<Vec<String>>,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct GeofenceQuery {
    pub chat_id: Option<String>,
    pub status: Option<String>,
    pub shape_type: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:geofence:read"])),
    path = "/fences",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "geofence"
)]
pub async fn list_geofences(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GeofenceQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut db_scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let mut sql = String::from("SELECT * FROM gis.geofences WHERE 1=1");

    if let Some(ref _chat_id) = params.chat_id {
        sql.push_str(" AND chat_id = $1");
    }

    if let Some(ref _status) = params.status {
        sql.push_str(" AND status = $2");
    }

    if let Some(ref _shape_type) = params.shape_type {
        sql.push_str(" AND shape_type = $3");
    }

    if let Some(scope) = tenant_scope(&claims) {
        sql.push_str(&format!(" AND {scope}"));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut query = sqlx::query_as::<_, Geofence>(sqlx::AssertSqlSafe(sql));
    if let Some(chat_id) = params.chat_id {
        query = query.bind(chat_id);
    }
    if let Some(status) = params.status {
        query = query.bind(status);
    }
    if let Some(shape_type) = params.shape_type {
        query = query.bind(shape_type);
    }
    let result = query.fetch_all(&mut db_scope).await;

    if let Err(e) = db_scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(geofences) => ApiResponse::success(
            serde_json::json!({
                "items": geofences,
                "total": geofences.len()
            }),
            "获取地理围栏列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:geofence:read"])),
    path = "/fences/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "geofence"
)]
pub async fn get_geofence(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Geofence> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut db_scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let scope = tenant_scope(&claims)
        .map(|s| format!(" AND {s}"))
        .unwrap_or_default();
    let base = only_own_schema_query!("gis", "SELECT * FROM gis.geofences WHERE id = $1");
    let result = sqlx::query_as::<_, Geofence>(sqlx::AssertSqlSafe(format!("{base}{scope}")))
        .bind(id)
        .fetch_one(&mut db_scope)
        .await;
    let commit_res = match &result {
        Ok(_) => db_scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(geofence) => ApiResponse::success(geofence, "获取地理围栏成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("地理围栏未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:geofence:write"])),
    path = "/fences",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "geofence"
)]
pub async fn create_geofence(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateGeofenceRequest>,
) -> ApiResponse<Geofence> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut db_scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let event_types = serde_json::json!(payload
        .event_types
        .unwrap_or_else(|| vec!["enter".to_string()]));
    let notify_channels = serde_json::json!(payload
        .notify_channels
        .unwrap_or_else(|| vec!["notification".to_string()]));
    let notify_users = serde_json::json!(payload.notify_users.unwrap_or_default());
    let tenant_id = get_tenant_id_from_claims(&claims);

    let result = sqlx::query_as::<_, Geofence>(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.geofences (
            name, description, chat_id, creator_id, shape_type,
            coordinates, radius, event_types, status, trigger_cooldown,
            notify_channels, notify_users, gis_fence_id, start_at, end_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        "#
    ))
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(payload.chat_id)
    .bind(payload.creator_id)
    .bind(&payload.shape_type)
    .bind(&payload.coordinates)
    .bind(payload.radius)
    .bind(&event_types)
    .bind(payload.status.unwrap_or_else(|| "active".to_string()))
    .bind(payload.trigger_cooldown.unwrap_or(300))
    .bind(&notify_channels)
    .bind(&notify_users)
    .bind(payload.gis_fence_id)
    .bind(payload.start_at)
    .bind(payload.end_at)
    .bind(tenant_id)
    .fetch_one(&mut db_scope)
    .await;
    let commit_res = match &result {
        Ok(_) => db_scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(geofence) => ApiResponse::success(geofence, "创建地理围栏成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:geofence:write"])),
    path = "/fences/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "geofence"
)]
pub async fn update_geofence(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateGeofenceRequest>,
) -> ApiResponse<Geofence> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut db_scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let scope = tenant_scope(&claims)
        .map(|s| format!(" AND {s}"))
        .unwrap_or_default();
    let current_base = only_own_schema_query!("gis", "SELECT * FROM gis.geofences WHERE id = $1");
    let current =
        match sqlx::query_as::<_, Geofence>(sqlx::AssertSqlSafe(format!("{current_base}{scope}")))
            .bind(id)
            .fetch_one(&mut db_scope)
            .await
        {
            Ok(g) => g,
            Err(sqlx::Error::RowNotFound) => {
                return ApiResponse::not_found("地理围栏未找到");
            }
            Err(e) => {
                return ApiResponse::from(TopemsError::internal("数据库查询失败", e));
            }
        };

    let name = payload.name.unwrap_or(current.name);
    let description = payload.description.or(current.description);
    let coordinates = payload.coordinates.unwrap_or(current.coordinates);
    let radius = payload.radius.or(current.radius);
    let event_types = payload
        .event_types
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.event_types);
    let status = payload.status.unwrap_or(current.status);
    let trigger_cooldown = payload.trigger_cooldown.unwrap_or(current.trigger_cooldown);
    let notify_channels = payload
        .notify_channels
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.notify_channels);
    let notify_users = payload
        .notify_users
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.notify_users);
    let gis_fence_id = payload.gis_fence_id.or(current.gis_fence_id);
    let start_at = payload.start_at.or(current.start_at);
    let end_at = payload.end_at.or(current.end_at);

    let update_base = only_own_schema_query!(
        "gis",
        r#"
        UPDATE gis.geofences
        SET name = $1, description = $2, coordinates = $3, radius = $4,
            event_types = $5, status = $6, trigger_cooldown = $7,
            notify_channels = $8, notify_users = $9, gis_fence_id = $10,
            start_at = $11, end_at = $12, updated_at = NOW()
        WHERE id = $13
        RETURNING *
        "#
    );
    let result =
        sqlx::query_as::<_, Geofence>(sqlx::AssertSqlSafe(format!("{update_base}{scope}")))
            .bind(&name)
            .bind(&description)
            .bind(&coordinates)
            .bind(radius)
            .bind(&event_types)
            .bind(&status)
            .bind(trigger_cooldown)
            .bind(&notify_channels)
            .bind(&notify_users)
            .bind(gis_fence_id)
            .bind(start_at)
            .bind(end_at)
            .bind(id)
            .fetch_one(&mut db_scope)
            .await;
    let commit_res = match &result {
        Ok(_) => db_scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(geofence) => ApiResponse::success(geofence, "更新地理围栏成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:geofence:write"])),
    path = "/fences/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "geofence"
)]
pub async fn delete_geofence(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut db_scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let scope = tenant_scope(&claims)
        .map(|s| format!(" AND {s}"))
        .unwrap_or_default();
    let delete_base = only_own_schema_query!("gis", "DELETE FROM gis.geofences WHERE id = $1");
    let result = sqlx::query(sqlx::AssertSqlSafe(format!("{delete_base}{scope}")))
        .bind(id)
        .execute(&mut db_scope)
        .await;
    let commit_res = match &result {
        Ok(_) => db_scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                ApiResponse::success(true, "删除地理围栏成功")
            } else {
                ApiResponse::not_found("地理围栏未找到")
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}
