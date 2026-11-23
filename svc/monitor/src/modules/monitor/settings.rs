//! Monitor 设置持久化 Handlers
//!
//! 提供通用 key-value 设置存储，支持批量读写。
//! - GET  /settings          — 获取所有设置（key -> value JSON）
//! - PUT  /settings          — 批量 upsert 设置（接收 key-value map）
//! - GET  /settings/{key}    — 获取单个设置
//! - PUT  /settings/{key}    — 更新单个设置
//! - DELETE /settings/{key}  — 删除单个设置

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

/// W12-B1：设置写入只落公司行（平台默认行只读）。
///
/// 缺少公司上下文时显式失败（400），不回退写 `company_id IS NULL` 的平台行——
/// 平台行只允许平台通道维护，业务侧误写会被 RLS 拒绝或静默 0 行。
fn require_company_context(action: &str) -> Result<Uuid, TopemsError> {
    topems_shared_auth::company_context::current_company_id().ok_or_else(|| {
        TopemsError::ValidationFailed(format!(
            "{action}需要公司上下文：请显式声明 x-company-id，或为用户配置默认公司"
        ))
    })
}

#[derive(Debug, Serialize)]
pub struct SettingItem {
    pub key: String,
    pub value: JsonValue,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SettingsQuery {
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchUpdateRequest {
    pub settings: std::collections::HashMap<String, JsonValue>,
}

#[derive(Debug, Deserialize)]
pub struct SingleUpdateRequest {
    pub value: JsonValue,
    pub category: Option<String>,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/settings", get(list_settings))
        .route("/settings", put(batch_update_settings))
        .route("/settings/{key}", get(get_setting))
        .route("/settings/{key}", put(update_setting))
        .route("/settings/{key}", delete(delete_setting))
}

/// GET /settings — 获取当前租户所有设置
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings",
    responses(
        (status = 200, description = "设置列表", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn list_settings(
    State(state): State<AppState>,
    Query(params): Query<SettingsQuery>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<std::collections::HashMap<String, JsonValue>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    // 读出作用域（请求事务内只读查询 + SET LOCAL search_path=public）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失：请求事务未注入",
            sqlx::Error::Protocol("RLS 事务缺失".into()),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::<std::collections::HashMap<String, JsonValue>>::from(
                TopemsError::internal("获取设置列表失败", e),
            )
        }
    };

    let rows = if let Some(cat) = &params.category {
        sqlx::query(
            "SELECT key, value FROM public.monitor_settings
             WHERE (tenant_id IS NULL OR tenant_id = $1) AND category = $2
             ORDER BY key,
                      CASE
                          WHEN company_id = NULLIF(current_setting('app.company_id', true), '')::uuid THEN 0
                          WHEN company_id IS NULL THEN 1
                          ELSE 2
                      END DESC",
        )
        .bind(tenant_id)
        .bind(cat)
        .fetch_all(&mut scope)
        .await
    } else {
        sqlx::query(
            "SELECT key, value FROM public.monitor_settings
             WHERE (tenant_id IS NULL OR tenant_id = $1)
             ORDER BY key,
                      CASE
                          WHEN company_id = NULLIF(current_setting('app.company_id', true), '')::uuid THEN 0
                          WHEN company_id IS NULL THEN 1
                          ELSE 2
                      END DESC",
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await
    };

    if let Err(e) = scope.commit().await {
        return ApiResponse::<std::collections::HashMap<String, JsonValue>>::from(
            TopemsError::internal("获取设置列表失败", e),
        );
    }

    let mut map = std::collections::HashMap::new();
    match rows {
        Ok(rows) => {
            for row in rows {
                let key: String = row.try_get("key").unwrap_or_default();
                let value: JsonValue = row.try_get("value").unwrap_or(JsonValue::Null);
                map.insert(key, value);
            }
        }
        Err(e) => {
            return ApiResponse::<std::collections::HashMap<String, JsonValue>>::from(
                TopemsError::internal("获取设置列表失败", e),
            );
        }
    }

    ApiResponse::success(map, "获取设置成功")
}

/// PUT /settings — 批量 upsert 设置
#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings",
    responses(
        (status = 200, description = "批量更新设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn batch_update_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<BatchUpdateRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    // W12-B1：批量写入只落公司行；缺公司上下文直接 400，不写平台行。
    let company_id = match require_company_context("保存设置") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };
    let mut updated = 0;

    for (key, value) in &payload.settings {
        let category = key.split('_').next().map(|s| s.to_string());
        // M-1: 复用请求事务；整批设置随请求原子提交/回滚。
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return ApiResponse::from(TopemsError::internal(
                "数据库事务上下文缺失：请求事务未注入",
                sqlx::Error::Protocol("RLS 事务缺失".into()),
            ));
        };
        let mut scope = match state.db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("设置保存作用域创建失败: {}", e);
                continue;
            }
        };
        let result = sqlx::query(
            "INSERT INTO public.monitor_settings (tenant_id, company_id, key, value, category)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, company_id, key)
                 WHERE deleted_at IS NULL AND company_id IS NOT NULL
             DO UPDATE
             SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP",
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(key)
        .bind(value)
        .bind(category)
        .execute(&mut scope)
        .await;

        if result.is_ok() && scope.commit().await.is_ok() {
            updated += 1;
        }
    }

    ApiResponse::success(
        serde_json::json!({ "updated": updated, "total": payload.settings.len() }),
        "设置保存成功",
    )
}

/// GET /settings/{key} — 获取单个设置
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings/{key}",
    params(
        ("key" = String, Path, description = "设置键")
    ),
    responses(
        (status = 200, description = "获取设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn get_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SettingItem> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失：请求事务未注入",
            sqlx::Error::Protocol("RLS 事务缺失".into()),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::<SettingItem>::from(TopemsError::internal("操作失败", e)),
    };

    let fetched = sqlx::query(
        "SELECT key, value, category FROM public.monitor_settings
         WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = $2
         ORDER BY CASE
                      WHEN company_id = NULLIF(current_setting('app.company_id', true), '')::uuid THEN 0
                      WHEN company_id IS NULL THEN 1
                      ELSE 2
                  END
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        return ApiResponse::<SettingItem>::from(TopemsError::internal("操作失败", e));
    }

    match fetched {
        Ok(Some(row)) => {
            let k: String = row.try_get("key").unwrap_or(key);
            let v: JsonValue = row.try_get("value").unwrap_or(JsonValue::Null);
            let cat: Option<String> = row.try_get("category").ok();
            ApiResponse::success(
                SettingItem {
                    key: k,
                    value: v,
                    category: cat,
                },
                "获取设置成功",
            )
        }
        Ok(None) => ApiResponse::<SettingItem>::not_found("设置不存在"),
        Err(e) => ApiResponse::<SettingItem>::from(TopemsError::internal("操作失败", e)),
    }
}

/// PUT /settings/{key} — 更新单个设置
#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings/{key}",
    params(
        ("key" = String, Path, description = "设置键")
    ),
    responses(
        (status = 200, description = "更新设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn update_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<SingleUpdateRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    // W12-B1：单条写入只落公司行；缺公司上下文直接 400。
    let company_id = match require_company_context("更新设置") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };
    let category = payload
        .category
        .or_else(|| key.split('_').next().map(|s| s.to_string()));

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失：请求事务未注入",
            sqlx::Error::Protocol("RLS 事务缺失".into()),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    };

    let result = sqlx::query(
        "INSERT INTO public.monitor_settings (tenant_id, company_id, key, value, category)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, company_id, key)
             WHERE deleted_at IS NULL AND company_id IS NOT NULL
         DO UPDATE
         SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP",
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .bind(&payload.value)
    .bind(category)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => match scope.commit().await {
            Ok(()) => ApiResponse::success(serde_json::json!({ "key": key }), "设置更新成功"),
            Err(e) => ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e)),
        },
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    }
}

/// DELETE /settings/{key} — 删除单个设置
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings/{key}",
    params(
        ("key" = String, Path, description = "设置键")
    ),
    responses(
        (status = 200, description = "删除设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn delete_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    // W12-B1：删除只允许删本司行；平台默认行只读，缺公司上下文直接 400。
    let company_id = match require_company_context("删除设置") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失：请求事务未注入",
            sqlx::Error::Protocol("RLS 事务缺失".into()),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    };

    let deleted = sqlx::query_scalar::<_, Uuid>(
        "DELETE FROM public.monitor_settings
         WHERE tenant_id = $1 AND company_id = $2 AND key = $3
         RETURNING id",
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await;

    match deleted {
        Ok(Some(_)) => match scope.commit().await {
            Ok(()) => ApiResponse::success(serde_json::json!({ "key": key }), "设置删除成功"),
            Err(e) => ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e)),
        },
        Ok(None) => {
            // 本司没有可删行：若平台默认行存在，明确告知只读，不静默成功。
            let platform_exists = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS (
                    SELECT 1 FROM public.monitor_settings
                     WHERE tenant_id IS NULL AND company_id IS NULL AND key = $1
                 )",
            )
            .bind(&key)
            .fetch_one(&mut scope)
            .await;
            let _ = scope.rollback().await;

            match platform_exists {
                Ok(true) => {
                    ApiResponse::<serde_json::Value>::from(TopemsError::OperationNotAllowed(
                        "平台默认设置只读，业务侧不可删除；如需停用请在公司行覆盖".to_string(),
                    ))
                }
                Ok(false) => ApiResponse::<serde_json::Value>::not_found("设置不存在"),
                Err(e) => {
                    ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
                }
            }
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    }
}
