// ERP · 系统设置模块
//
// 缺口#22：前端 systemSettingApi（apps/web/src/api/admin/systemSetting.ts）
// 调用 /api/erp/system/settings CRUD+batch。
// 表：system_settings（id, tenant_id, company_id, key, value, description, category, created_at, updated_at, deleted_at）
//
// W12-B2（2026-11-23）：
//   * platform 入口（/system/settings）继续走系统连接（`State<PgPool>` = system_pool），
//     语义保持平台通道不变，但所有 SQL 都限定 `tenant_id IS NULL AND company_id IS NULL`，
//     不会顺带读写任何公司行；
//   * 新增公司作用域入口（/system/company-settings），走请求事务 + 公司上下文：
//     公司行本司可读写，平台参数行只读（读可见、写/删显式 403），缺公司上下文 400。

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use sqlx::PgPool;
use std::collections::HashMap;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        // 平台参数（系统通道，只操作 tenant_id/company_id 同时为 NULL 的行）
        .route("/system/settings", get(list_settings).post(create_setting))
        .route("/system/settings/batch", put(batch_update_settings))
        .route(
            "/system/settings/{key}",
            get(get_setting).put(update_setting).delete(delete_setting),
        )
        // 公司作用域参数（请求事务 + 公司上下文）
        .route(
            "/system/company-settings",
            get(list_company_settings).put(batch_update_company_settings),
        )
        .route(
            "/system/company-settings/{key}",
            get(get_company_setting)
                .put(update_company_setting)
                .delete(delete_company_setting),
        )
}

// ─── Models ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SystemSetting {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub key: String,
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListSettingsQuery {
    pub category: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub category: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingRequest {
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchUpdateRequest {
    pub settings: Value,
}

/// 公司作用域读结果：本司覆盖行为 `company`，未覆盖时回落平台参数行（`platform`，只读）。
#[derive(Debug, Serialize)]
pub struct CompanySettingItem {
    pub key: String,
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    /// `company` = 本司覆盖行（可写）；`platform` = 平台参数（只读）
    pub source: &'static str,
}

#[derive(Debug, Deserialize)]
pub struct CompanySettingUpdateRequest {
    pub value: String,
    pub description: Option<String>,
    pub category: Option<String>,
}

/// W12-B2：公司作用域写入必须带公司上下文，缺失时 400 fail-closed。
fn require_company_context(action: &str) -> Result<Uuid, TopemsError> {
    topems_shared_auth::company_context::current_company_id().ok_or_else(|| {
        TopemsError::ValidationFailed(format!(
            "{action}需要公司上下文：请显式声明 x-company-id，或为用户配置默认公司"
        ))
    })
}

fn txn_missing_error() -> TopemsError {
    TopemsError::internal(
        "数据库事务上下文缺失：请求事务未注入",
        sqlx::Error::Protocol("RLS 事务缺失".into()),
    )
}

// ─── 平台参数 handlers（系统通道；仅 tenant_id/company_id 均为 NULL 的行） ─────

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/settings",
    responses(
        (status = 200, description = "list_settings OK")
    ),
    tag = "ERP/settings"
)]
pub async fn list_settings(
    State(pool): State<PgPool>,
    Query(params): Query<ListSettingsQuery>,
) -> ApiResponse<Vec<SystemSetting>> {
    let category = params.category.clone();
    let search = params.search.clone().unwrap_or_default();

    let items: Vec<SystemSetting> = sqlx::query_as(
        r#"SELECT id, tenant_id, company_id, key, value, description, category, created_at, updated_at
           FROM public.system_settings
           WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
             AND ($1::text IS NULL OR category = $1)
             AND ($2 = '' OR key ILIKE '%' || $2 || '%' OR value ILIKE '%' || $2 || '%')
           ORDER BY category, key"#,
    )
    .bind(&category)
    .bind(&search)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    ApiResponse::success(items, "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/settings/{key}",
    params(
        ("key" = String, Path, description = "key")
    ),
    responses(
        (status = 200, description = "get_setting OK")
    ),
    tag = "ERP/settings"
)]
pub async fn get_setting(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
) -> ApiResponse<SystemSetting> {
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"SELECT id, tenant_id, company_id, key, value, description, category, created_at, updated_at
           FROM public.system_settings
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL"#,
    )
    .bind(&key)
    .fetch_one(&pool)
    .await;

    match setting {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string()))
            } else {
                tracing::error!("查询设置项失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询设置项失败".to_string()))
            }
        }
    }
}

pub async fn create_setting(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateSettingRequest>,
) -> ApiResponse<SystemSetting> {
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"INSERT INTO public.system_settings
               (tenant_id, company_id, key, value, description, category)
           VALUES (NULL, NULL, $1, $2, $3, $4)
           RETURNING id, tenant_id, company_id, key, value, description, category, created_at, updated_at"#,
    )
    .bind(&payload.key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.category)
    .fetch_one(&pool)
    .await;

    match setting {
        Ok(v) => ApiResponse::success(v, "创建成功"),
        Err(e) => {
            tracing::error!("创建设置项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建设置项失败".to_string()))
        }
    }
}

pub async fn update_setting(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
    Json(payload): Json<UpdateSettingRequest>,
) -> ApiResponse<SystemSetting> {
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"UPDATE public.system_settings SET
              value = COALESCE($2, value),
              description = COALESCE($3, description),
              category = COALESCE($4, category),
              updated_at = NOW()
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
           RETURNING id, tenant_id, company_id, key, value, description, category, created_at, updated_at"#,
    )
    .bind(&key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.category)
    .fetch_one(&pool)
    .await;

    match setting {
        Ok(v) => ApiResponse::success(v, "更新成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string()))
            } else {
                tracing::error!("更新设置项失败: {}", e);
                ApiResponse::from(TopemsError::Internal("更新设置项失败".to_string()))
            }
        }
    }
}

pub async fn delete_setting(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
) -> ApiResponse<String> {
    let result = sqlx::query(
        r#"DELETE FROM public.system_settings
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL"#,
    )
    .bind(&key)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("删除成功".to_string(), "删除成功"),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string())),
        Err(e) => {
            tracing::error!("删除设置项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除设置项失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/system/settings/batch",
    responses(
        (status = 200, description = "batch_update_settings OK")
    ),
    tag = "ERP/settings"
)]
pub async fn batch_update_settings(
    State(pool): State<PgPool>,
    Json(payload): Json<BatchUpdateRequest>,
) -> ApiResponse<Vec<SystemSetting>> {
    let settings_map = match payload.settings.as_object() {
        Some(m) => m,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "settings 必须为对象".to_string(),
            ))
        }
    };

    let mut updated = Vec::new();

    for (key, value) in settings_map {
        let value_str = match value {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };

        let result: Result<SystemSetting, _> = sqlx::query_as(
            r#"INSERT INTO public.system_settings (tenant_id, company_id, key, value, category)
               VALUES (NULL, NULL, $1, $2, 'general')
               ON CONFLICT (key) WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
               DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
               RETURNING id, tenant_id, company_id, key, value, description, category, created_at, updated_at"#,
        )
        .bind(key)
        .bind(&value_str)
        .fetch_one(&pool)
        .await;

        if let Ok(s) = result {
            updated.push(s);
        }
    }

    ApiResponse::success(updated, "批量更新成功")
}

// ─── 公司作用域 handlers（请求事务 + 公司上下文；平台行只读） ────────────────

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/company-settings",
    responses(
        (status = 200, description = "公司参数（本司覆盖 + 平台默认）"),
        (status = 400, description = "缺少公司上下文")
    ),
    tag = "ERP/settings"
)]
pub async fn list_company_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<ListSettingsQuery>,
) -> ApiResponse<Vec<CompanySettingItem>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }
    let tenant_id = get_tenant_id_from_claims(&claims);
    let company_id = match require_company_context("查询公司参数") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(txn_missing_error());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询公司参数失败", e)),
    };

    let rows = sqlx::query(
        r#"SELECT key, value, description, category, company_id
           FROM public.system_settings
           WHERE deleted_at IS NULL
             AND ((tenant_id = $1 AND company_id = $2)
                  OR (tenant_id IS NULL AND company_id IS NULL))
             AND ($3::text IS NULL OR category = $3)
             AND ($4 = '' OR key ILIKE '%' || $4 || '%' OR value ILIKE '%' || $4 || '%')
           ORDER BY key"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(params.category.clone())
    .bind(params.search.clone().unwrap_or_default())
    .fetch_all(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("查询公司参数失败", e));
    }

    let rows = match rows {
        Ok(r) => r,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询公司参数失败", e)),
    };

    use sqlx::Row;
    let mut merged: HashMap<String, CompanySettingItem> = HashMap::new();
    for row in rows {
        let key: String = row.try_get("key").unwrap_or_default();
        let row_company: Option<Uuid> = row.try_get("company_id").ok();
        let item = CompanySettingItem {
            key: key.clone(),
            value: row.try_get("value").ok(),
            description: row.try_get("description").ok(),
            category: row.try_get("category").ok(),
            source: if row_company.is_some() {
                "company"
            } else {
                "platform"
            },
        };
        if row_company.is_some() || !merged.contains_key(&key) {
            merged.insert(key, item);
        }
    }
    let mut items: Vec<CompanySettingItem> = merged.into_values().collect();
    items.sort_by(|a, b| a.key.cmp(&b.key));

    ApiResponse::success(items, "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/company-settings/{key}",
    params(
        ("key" = String, Path, description = "key")
    ),
    responses(
        (status = 200, description = "公司参数生效值"),
        (status = 400, description = "缺少公司上下文"),
        (status = 404, description = "参数不存在")
    ),
    tag = "ERP/settings"
)]
pub async fn get_company_setting(
    State(state): State<ApiState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<CompanySettingItem> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }
    let tenant_id = get_tenant_id_from_claims(&claims);
    let company_id = match require_company_context("查询公司参数") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(txn_missing_error());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询公司参数失败", e)),
    };

    let fetched = sqlx::query(
        r#"SELECT key, value, description, category, company_id
           FROM public.system_settings
           WHERE deleted_at IS NULL
             AND key = $3
             AND ((tenant_id = $1 AND company_id = $2)
                  OR (tenant_id IS NULL AND company_id IS NULL))
           ORDER BY company_id NULLS LAST
           LIMIT 1"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("查询公司参数失败", e));
    }

    use sqlx::Row;
    match fetched {
        Ok(Some(row)) => {
            let row_company: Option<Uuid> = row.try_get("company_id").ok();
            ApiResponse::success(
                CompanySettingItem {
                    key: row.try_get("key").unwrap_or(key),
                    value: row.try_get("value").ok(),
                    description: row.try_get("description").ok(),
                    category: row.try_get("category").ok(),
                    source: if row_company.is_some() {
                        "company"
                    } else {
                        "platform"
                    },
                },
                "查询成功",
            )
        }
        Ok(None) => ApiResponse::not_found("设置项不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询公司参数失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/system/company-settings/{key}",
    params(
        ("key" = String, Path, description = "key")
    ),
    responses(
        (status = 200, description = "写本司覆盖行"),
        (status = 400, description = "缺少公司上下文"),
        (status = 403, description = "无权限")
    ),
    tag = "ERP/settings"
)]
pub async fn update_company_setting(
    State(state): State<ApiState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CompanySettingUpdateRequest>,
) -> ApiResponse<CompanySettingItem> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    let tenant_id = get_tenant_id_from_claims(&claims);
    let company_id = match require_company_context("保存公司参数") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };
    let category = payload
        .category
        .or_else(|| key.split('.').next().map(|s| s.to_string()));

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(txn_missing_error());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("保存公司参数失败", e)),
    };

    let result = sqlx::query(
        r#"INSERT INTO public.system_settings
               (tenant_id, company_id, key, value, description, category)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tenant_id, company_id, key)
               WHERE deleted_at IS NULL AND company_id IS NOT NULL
           DO UPDATE SET
               value = EXCLUDED.value,
               description = COALESCE(EXCLUDED.description, system_settings.description),
               category = COALESCE(EXCLUDED.category, system_settings.category),
               updated_at = NOW()"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&category)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => match scope.commit().await {
            Ok(()) => ApiResponse::success(
                CompanySettingItem {
                    key,
                    value: Some(payload.value),
                    description: payload.description,
                    category,
                    source: "company",
                },
                "保存成功",
            ),
            Err(e) => ApiResponse::from(TopemsError::internal("保存公司参数失败", e)),
        },
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("保存公司参数失败", e))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/system/company-settings",
    responses(
        (status = 200, description = "批量写本司覆盖行"),
        (status = 400, description = "缺少公司上下文")
    ),
    tag = "ERP/settings"
)]
pub async fn batch_update_company_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<BatchUpdateRequest>,
) -> ApiResponse<Vec<CompanySettingItem>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    let tenant_id = get_tenant_id_from_claims(&claims);
    let company_id = match require_company_context("保存公司参数") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };
    let settings_map = match payload.settings.as_object() {
        Some(m) => m,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "settings 必须为对象".to_string(),
            ))
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(txn_missing_error());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("保存公司参数失败", e)),
    };

    let mut updated = Vec::new();
    let mut failed: Option<sqlx::Error> = None;
    for (key, value) in settings_map {
        let value_str = match value {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };
        let category = key.split('.').next().map(|s| s.to_string());
        let result = sqlx::query(
            r#"INSERT INTO public.system_settings
                   (tenant_id, company_id, key, value, category)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (tenant_id, company_id, key)
                   WHERE deleted_at IS NULL AND company_id IS NOT NULL
               DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(key)
        .bind(&value_str)
        .bind(&category)
        .execute(&mut scope)
        .await;

        match result {
            Ok(_) => updated.push(CompanySettingItem {
                key: key.clone(),
                value: Some(value_str),
                description: None,
                category,
                source: "company",
            }),
            Err(e) => {
                failed = Some(e);
                break;
            }
        }
    }

    if let Some(e) = failed {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("保存公司参数失败", e));
    }

    match scope.commit().await {
        Ok(()) => ApiResponse::success(updated, "批量保存成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("保存公司参数失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/system/company-settings/{key}",
    params(
        ("key" = String, Path, description = "key")
    ),
    responses(
        (status = 200, description = "删除本司覆盖行"),
        (status = 400, description = "缺少公司上下文"),
        (status = 403, description = "平台参数只读，不可删除")
    ),
    tag = "ERP/settings"
)]
pub async fn delete_company_setting(
    State(state): State<ApiState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Value> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    let tenant_id = get_tenant_id_from_claims(&claims);
    let company_id = match require_company_context("删除公司参数") {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(txn_missing_error());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("删除公司参数失败", e)),
    };

    let deleted = sqlx::query_scalar::<_, Uuid>(
        r#"DELETE FROM public.system_settings
           WHERE tenant_id = $1 AND company_id = $2 AND key = $3 AND deleted_at IS NULL
           RETURNING id"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await;

    match deleted {
        Ok(Some(_)) => match scope.commit().await {
            Ok(()) => ApiResponse::success(serde_json::json!({ "key": key }), "删除成功"),
            Err(e) => ApiResponse::from(TopemsError::internal("删除公司参数失败", e)),
        },
        Ok(None) => {
            // 本司没有可删行：若平台参数存在，明确 403 只读，不静默成功。
            let platform_exists = sqlx::query_scalar::<_, bool>(
                r#"SELECT EXISTS (
                       SELECT 1 FROM public.system_settings
                        WHERE tenant_id IS NULL AND company_id IS NULL
                          AND key = $1 AND deleted_at IS NULL
                   )"#,
            )
            .bind(&key)
            .fetch_one(&mut scope)
            .await;
            let _ = scope.rollback().await;

            match platform_exists {
                Ok(true) => ApiResponse::from(TopemsError::OperationNotAllowed(
                    "平台参数只读，业务侧不可删除；如需停用请在公司行覆盖".to_string(),
                )),
                Ok(false) => ApiResponse::not_found("设置项不存在"),
                Err(e) => ApiResponse::from(TopemsError::internal("删除公司参数失败", e)),
            }
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("删除公司参数失败", e))
        }
    }
}
