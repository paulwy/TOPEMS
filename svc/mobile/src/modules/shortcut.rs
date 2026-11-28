use axum::{
    extract::{Extension, Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
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
pub struct Shortcut {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub icon: String,
    pub action_type: String,
    pub action_params: Option<serde_json::Value>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Shortcut {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            name: row.try_get("name")?,
            icon: row.try_get("icon")?,
            action_type: row.try_get("action_type")?,
            action_params: row.try_get("action_params")?,
            sort_order: row.try_get("sort_order")?,
            is_active: row.try_get("is_active")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateShortcutRequest {
    pub name: String,
    pub icon: String,
    pub action_type: String,
    pub action_params: Option<serde_json::Value>,
    pub sort_order: Option<i32>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:shortcuts:read"])),
    path = "/shortcuts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "shortcuts"
)]
pub async fn get_shortcuts(
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

    let user_id_uuid = match Uuid::parse_str(&user_id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let __mobile_response = {
        let shortcuts: Vec<Shortcut> = match sqlx::query_as::<_, Shortcut>(
        only_own_schema_query!("mobile", "SELECT id, user_id, name, icon, action_type, action_params, sort_order, is_active, created_at, updated_at 
         FROM mobile.shortcuts WHERE user_id = $1 AND is_active = true ORDER BY sort_order ASC")
    )
    .bind(user_id_uuid)
    .fetch_all(&mut scope)

    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询快捷操作失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("内部服务器错误"));
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(shortcuts, "获取快捷操作列表成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    path = "/api/mobile/shortcuts",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn create_shortcut(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<CreateShortcutRequest>,
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

    let user_id_uuid = match Uuid::parse_str(&user_id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let sort_order = match payload.sort_order {
        Some(v) => v,
        None => {
            #[derive(Debug, sqlx::FromRow)]
            struct NextOrder {
                next_order: Option<i32>,
            }
            match sqlx::query_as::<_, NextOrder>(
                only_own_schema_query!("mobile", "SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM mobile.shortcuts WHERE user_id = $1")
            )
            .bind(user_id_uuid)
            .fetch_one(&mut scope)
            .await
            {
                Ok(r) => r.next_order.unwrap_or(1),
                Err(_) => 1,
            }
        }
    };

    let shortcut_id = Uuid::new_v4();
    if let Err(e) = sqlx::query(
        only_own_schema_query!("mobile", "INSERT INTO mobile.shortcuts (id, user_id, name, icon, action_type, action_params, sort_order, is_active, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)")
    )
        .bind(shortcut_id)
        .bind(user_id_uuid)
        .bind(&payload.name)
        .bind(&payload.icon)
        .bind(&payload.action_type)
        .bind(&payload.action_params)
        .bind(sort_order)
        .bind(true)
        .bind(tenant_filter(&claims))
        .execute(&mut scope)
        .await
    {
        tracing::error!("创建快捷操作失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("创建快捷操作失败"));
    }

    let __mobile_response = {
        let shortcut = match sqlx::query_as::<_, Shortcut>(
        only_own_schema_query!("mobile", "SELECT id, user_id, name, icon, action_type, action_params, sort_order, is_active, created_at, updated_at 
         FROM mobile.shortcuts WHERE id = $1")
    )
    .bind(shortcut_id)
    .fetch_one(&mut scope)

    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询创建的快捷操作失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询快捷操作失败"));
        }
    };

        (
            StatusCode::CREATED,
            ApiResponse::success(shortcut, "创建快捷操作成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn shortcut_roundtrip() {
        use chrono::Utc;
        roundtrip(&Shortcut {
            id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            name: "scan".into(),
            icon: "Scan".into(),
            action_type: "navigate".into(),
            action_params: Some(serde_json::json!({"path":"/scan"})),
            sort_order: 1,
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn create_shortcut_request_roundtrip() {
        roundtrip(&CreateShortcutRequest {
            name: "scan".into(),
            icon: "Scan".into(),
            action_type: "navigate".into(),
            action_params: None,
            sort_order: Some(1),
        });
    }
}
