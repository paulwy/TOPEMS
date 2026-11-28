use axum::{
    extract::{Extension, Json, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_db::scope::Db;
use topems_shared_core::response::ApiResponse;

use super::user::tenant_from_claims;

/// 移动应用包配置（租户级）。原页面只读写 localStorage 默认值。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettingsView {
    pub force_update: bool,
    pub auto_update: bool,
    pub min_version: String,
    pub app_key: String,
    /// 是否已有持久化记录；false 时为空默认值。
    pub configured: bool,
}

impl AppSettingsView {
    fn defaults() -> Self {
        Self {
            force_update: false,
            auto_update: true,
            min_version: String::new(),
            app_key: String::new(),
            configured: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateAppSettingsRequest {
    pub force_update: Option<bool>,
    pub auto_update: Option<bool>,
    pub min_version: Option<String>,
    pub app_key: Option<String>,
}

fn read_view(row: &sqlx::postgres::PgRow) -> sqlx::Result<AppSettingsView> {
    Ok(AppSettingsView {
        force_update: row.try_get("force_update")?,
        auto_update: row.try_get("auto_update")?,
        min_version: row.try_get("min_version")?,
        app_key: row.try_get("app_key")?,
        configured: true,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:user:read"])),
    path = "/app-settings",
    responses((status = 200, description = "OK", body = serde_json::Value)),
    tag = "user"
)]
pub async fn get_app_settings(
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    let tenant_id = match tenant_from_claims(&claims) {
        Some(t) => t,
        None => {
            return (StatusCode::BAD_REQUEST, ApiResponse::<AppSettingsView>::bad_request("缺少租户上下文"))
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("数据库作用域创建失败"));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("数据库作用域创建失败"));
        }
    };

    let row = sqlx::query(
        "SELECT force_update, auto_update, min_version, app_key FROM mobile.app_settings \
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let view = match row {
        Ok(Some(row)) => match read_view(&row) {
            Ok(view) => view,
            Err(e) => {
                tracing::error!("解析应用配置失败: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("配置行解析失败"));
            }
        },
        Ok(None) => AppSettingsView::defaults(),
        Err(e) => {
            tracing::error!("查询应用配置失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("内部服务器错误"));
        }
    };

    let _ = scope.commit().await;
    (StatusCode::OK, ApiResponse::success(view, "应用配置"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mobile:user:write"])),
    path = "/app-settings",
    request_body = UpdateAppSettingsRequest,
    responses((status = 200, description = "OK", body = serde_json::Value)),
    tag = "user"
)]
pub async fn update_app_settings(
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UpdateAppSettingsRequest>,
) -> impl IntoResponse {
    let tenant_id = match tenant_from_claims(&claims) {
        Some(t) => t,
        None => {
            return (StatusCode::BAD_REQUEST, ApiResponse::<AppSettingsView>::bad_request("缺少租户上下文"))
        }
    };

    if let Some(ref key) = payload.app_key {
        if key.chars().count() > 200 {
            return (StatusCode::BAD_REQUEST, ApiResponse::<AppSettingsView>::bad_request("AppKey 过长"));
        }
    }
    if let Some(ref version) = payload.min_version {
        if version.chars().count() > 20 {
            return (StatusCode::BAD_REQUEST, ApiResponse::<AppSettingsView>::bad_request("版本号过长"));
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("数据库作用域创建失败"));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("数据库作用域创建失败"));
        }
    };

    let existing = sqlx::query(
        "SELECT id FROM mobile.app_settings WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let has_row = match existing {
        Ok(row) => row.is_some(),
        Err(e) => {
            tracing::error!("查询应用配置失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("内部服务器错误"));
        }
    };

    let result = if has_row {
        sqlx::query(
            "UPDATE mobile.app_settings SET \
                force_update = COALESCE($2, force_update), \
                auto_update = COALESCE($3, auto_update), \
                min_version = COALESCE($4, min_version), \
                app_key = COALESCE($5, app_key), \
                updated_at = NOW() \
             WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(payload.force_update)
        .bind(payload.auto_update)
        .bind(payload.min_version.clone())
        .bind(payload.app_key.clone())
        .execute(&mut scope)
        .await
    } else {
        sqlx::query(
            "INSERT INTO mobile.app_settings (tenant_id, force_update, auto_update, min_version, app_key) \
             VALUES ($1::uuid, COALESCE($2, false), COALESCE($3, true), COALESCE($4, ''), COALESCE($5, '')) \
             ON CONFLICT (tenant_id) WHERE deleted_at IS NULL DO UPDATE SET \
                force_update = EXCLUDED.force_update, auto_update = EXCLUDED.auto_update, \
                min_version = EXCLUDED.min_version, app_key = EXCLUDED.app_key, updated_at = NOW()",
        )
        .bind(tenant_id)
        .bind(payload.force_update)
        .bind(payload.auto_update)
        .bind(payload.min_version.clone())
        .bind(payload.app_key.clone())
        .execute(&mut scope)
        .await
    };

    match result {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("保存应用配置失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("保存应用配置失败"));
        }
    }

    let row = sqlx::query(
        "SELECT force_update, auto_update, min_version, app_key FROM mobile.app_settings \
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let view = match row {
        Ok(row) => match read_view(&row) {
            Ok(view) => view,
            Err(e) => {
                tracing::error!("解析应用配置失败: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("配置行解析失败"));
            }
        },
        Err(e) => {
            tracing::error!("回读应用配置失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("内部服务器错误"));
        }
    };

    let _ = scope.commit().await;
    (StatusCode::OK, ApiResponse::success(view, "配置已保存"))
}
