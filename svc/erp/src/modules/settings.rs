// ERP · 系统设置模块
//
// 缺口#22：前端 systemSettingApi（apps/web/src/api/admin/systemSetting.ts）
// 调用 /api/erp/system/settings CRUD+batch。
// 表：system_settings（id, tenant_id, company_id, key, value, description, category, created_at, updated_at, deleted_at）
//
// W12-B2（2026-11-23 回改）：
//   * 参数分级：override_policy 三档 platform_only / company_overridable / company_only；
//     平台行（tenant_id/company_id 均 NULL）默认 platform_only（fail-closed）；
//     集团母版行（tenant_id 非空、company_id NULL）默认 company_overridable；
//     取值顺序：本司行 > 集团母版行 > 平台默认行；
//   * platform 入口（/system/settings）仅平台运维可写，写入需 `x-platform-confirm`
//     二次确认并落审计（谁/何时/旧值/新值）；审批流后续挂现有审批模块，本模块不新造；
//   * 公司作用域入口（/system/company-settings）只落本司行；platform_only 的键写公司行
//     显式 403（数据库触发器再兜一层）；公司参数只审计不审批。

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::FromRow;
use sqlx::PgPool;
use std::collections::HashMap;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use topems_shared_db::ScopedTxn;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};

const OVERRIDE_POLICIES: [&str; 3] = ["platform_only", "company_overridable", "company_only"];

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

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, utoipa::ToSchema)]
pub struct SystemSetting {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub key: String,
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub override_policy: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListSettingsQuery {
    pub category: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub category: String,
    /// 缺省 platform_only（fail-closed，运维按需放开）。
    pub override_policy: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateSettingRequest {
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub override_policy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchUpdateRequest {
    pub settings: Value,
}

/// 公司作用域读结果：三层取值，本司行 `company`、集团母版行 `master`、
/// 平台默认行 `platform`（后两者只读）。
#[derive(Debug, Serialize)]
pub struct CompanySettingItem {
    pub key: String,
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    /// `company` = 本司覆盖行（可写）；`master`/`platform` = 只读上级行
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

/// 平台通道事务：显式打开 `app.rls_system`，只由 pod 内平台参数入口使用。
///
/// `system_settings` 是 FORCE RLS 表，平台行策略（platform_maintain）要求
/// `app.rls_system='on'`。普通连接池不会设置该 GUC，若直接查询会读写 0 行；
/// 这里在事务内 `SET LOCAL`，事务结束即复位，不污染连接池中的复用连接。
async fn platform_tx(pool: &PgPool) -> Result<sqlx::Transaction<'_, sqlx::Postgres>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query(
        "SELECT set_config('app.tenant_id', '', true), \
                set_config('app.rls_system', 'on', true)",
    )
    .execute(&mut *tx)
    .await?;
    Ok(tx)
}

/// 平台运维判定：与 IAM tenant_scope 的平台管理员口径一致（超管或 IAM 写权限）。
fn is_platform_operator(claims: &Claims) -> bool {
    claims.is_superuser
        || claims.has_permission("admin:iam:write")
        || claims.has_permission("admin:iam:delete")
}

fn require_platform_operator(claims: &Claims) -> Result<(), TopemsError> {
    if is_platform_operator(claims) {
        Ok(())
    } else {
        Err(TopemsError::OperationNotAllowed(
            "平台参数仅平台运维角色可写".to_string(),
        ))
    }
}

/// 平台参数写入二次确认：单键写要求 `x-platform-confirm: <key>`，批量写要求 `batch`。
fn require_platform_confirm(headers: &HeaderMap, expected: &str) -> Result<(), TopemsError> {
    match headers
        .get("x-platform-confirm")
        .and_then(|v| v.to_str().ok())
    {
        Some(v) if v == expected => Ok(()),
        _ => Err(TopemsError::ValidationFailed(format!(
            "平台参数写入需要二次确认：请携带 x-platform-confirm: {expected}"
        ))),
    }
}

fn validate_override_policy(policy: &str) -> Result<(), TopemsError> {
    if OVERRIDE_POLICIES.contains(&policy) {
        Ok(())
    } else {
        Err(TopemsError::ValidationFailed(format!(
            "override_policy 非法：{policy}（可选 platform_only/company_overridable/company_only）"
        )))
    }
}

/// 平台参数写入审计：谁、何时（服务端时间）、旧值、新值。
async fn audit_platform_setting(
    pool: &PgPool,
    claims: &Claims,
    headers: &HeaderMap,
    action: &str,
    entity_id: Option<Uuid>,
    key: &str,
    old_value: Option<&str>,
    new_value: Option<&str>,
) {
    log_audit_event(
        pool,
        AuditEventParams {
            action: action.to_string(),
            entity_type: "system_setting".to_string(),
            entity_id,
            entity_ids: None,
            tenant_id: claims.tenant_id.clone(),
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: Some(json!({ "key": key, "scope": "platform" })),
            response_details: Some(json!({ "old": old_value, "new": new_value })),
            status: "success".to_string(),
            error_message: None,
        },
        headers,
    )
    .await;
}

/// 公司参数写入审计：只审计，不进入审批流。
async fn audit_company_setting(
    pool: &PgPool,
    claims: &Claims,
    headers: &HeaderMap,
    action: &str,
    entity_id: Option<Uuid>,
    key: &str,
    old_value: Option<&str>,
    new_value: Option<&str>,
) {
    log_audit_event(
        pool,
        AuditEventParams {
            action: action.to_string(),
            entity_type: "system_setting".to_string(),
            entity_id,
            entity_ids: None,
            tenant_id: claims.tenant_id.clone(),
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: Some(json!({ "key": key, "scope": "company" })),
            response_details: Some(json!({ "old": old_value, "new": new_value })),
            status: "success".to_string(),
            error_message: None,
        },
        headers,
    )
    .await;
}

/// 解析 key 的母版/平台策略（母版优先），返回 `Some(policy)` 表示存在上级行。
async fn resolve_parent_policy(
    scope: &mut ScopedTxn<'_>,
    tenant_id: Uuid,
    key: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar::<_, String>(
        r#"SELECT override_policy
             FROM public.system_settings
            WHERE deleted_at IS NULL
              AND company_id IS NULL
              AND key = $2
              AND (tenant_id = $1 OR tenant_id IS NULL)
            ORDER BY (tenant_id IS NULL)
            LIMIT 1"#,
    )
    .bind(tenant_id)
    .bind(key)
    .fetch_optional(&mut *scope)
    .await
}

/// `platform_only` 的键禁止写公司行：服务层 403，数据库触发器兜底。
async fn reject_if_platform_locked(
    scope: &mut ScopedTxn<'_>,
    tenant_id: Uuid,
    key: &str,
) -> Result<bool, TopemsError> {
    let policy = resolve_parent_policy(scope, tenant_id, key)
        .await
        .map_err(|e| TopemsError::internal("校验参数覆盖策略失败", e))?;
    if policy.as_deref() == Some("platform_only") {
        return Err(TopemsError::OperationNotAllowed(format!(
            "参数 {key} 被平台锁定（platform_only），公司不可覆盖"
        )));
    }
    Ok(policy.is_some())
}

// ─── 平台参数 handlers（系统通道；仅 tenant_id/company_id 均为 NULL 的行） ─────

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/system/settings",
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

    let mut tx = match platform_tx(&pool).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询设置失败", e)),
    };

    let items: Vec<SystemSetting> = sqlx::query_as(
        r#"SELECT id, tenant_id, company_id, key, value, description, category, override_policy,
                  created_at, updated_at
           FROM public.system_settings
           WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
             AND ($1::text IS NULL OR category = $1)
             AND ($2 = '' OR key ILIKE '%' || $2 || '%' OR value ILIKE '%' || $2 || '%')
           ORDER BY category, key"#,
    )
    .bind(&category)
    .bind(&search)
    .fetch_all(&mut *tx)
    .await
    .unwrap_or_default();

    let _ = tx.commit().await;

    ApiResponse::success(items, "查询成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/system/settings/{key}",
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
    let mut tx = match platform_tx(&pool).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询设置项失败", e)),
    };
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"SELECT id, tenant_id, company_id, key, value, description, category, override_policy,
                  created_at, updated_at
           FROM public.system_settings
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL"#,
    )
    .bind(&key)
    .fetch_one(&mut *tx)
    .await;

    match setting {
        Ok(v) => {
            let _ = tx.commit().await;
            ApiResponse::success(v, "查询成功")
        }
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/system/settings",
    tag = "ERP",
    request_body = CreateSettingRequest,
    responses(
        (status = 200, description = "OK", body = SystemSetting),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_setting(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(payload): Json<CreateSettingRequest>,
) -> ApiResponse<SystemSetting> {
    if let Err(e) = require_platform_operator(&claims) {
        return ApiResponse::from(e);
    }
    if let Err(e) = require_platform_confirm(&headers, &payload.key) {
        return ApiResponse::from(e);
    }
    let override_policy = payload
        .override_policy
        .as_deref()
        .unwrap_or("platform_only");
    if let Err(e) = validate_override_policy(override_policy) {
        return ApiResponse::from(e);
    }

    let mut tx = match platform_tx(&pool).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("创建设置项失败", e)),
    };
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"INSERT INTO public.system_settings
               (tenant_id, company_id, key, value, description, category, override_policy)
           VALUES (NULL, NULL, $1, $2, $3, $4, $5)
           RETURNING id, tenant_id, company_id, key, value, description, category, override_policy,
                     created_at, updated_at"#,
    )
    .bind(&payload.key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.category)
    .bind(override_policy)
    .fetch_one(&mut *tx)
    .await;

    match setting {
        Ok(v) => {
            let _ = tx.commit().await;
            audit_platform_setting(
                &pool,
                &claims,
                &headers,
                "create",
                Some(v.id),
                &payload.key,
                None,
                v.value.as_deref(),
            )
            .await;
            ApiResponse::success(v, "创建成功")
        }
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("创建设置项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建设置项失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/system/settings/{key}",
    tag = "ERP",
    request_body = UpdateSettingRequest,
    params(("key" = String, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = SystemSetting),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_setting(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(key): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<UpdateSettingRequest>,
) -> ApiResponse<SystemSetting> {
    if let Err(e) = require_platform_operator(&claims) {
        return ApiResponse::from(e);
    }
    if let Err(e) = require_platform_confirm(&headers, &key) {
        return ApiResponse::from(e);
    }
    if let Some(policy) = payload.override_policy.as_deref() {
        if let Err(e) = validate_override_policy(policy) {
            return ApiResponse::from(e);
        }
    }

    let mut tx = match platform_tx(&pool).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("更新设置项失败", e)),
    };
    let old_value: Option<String> = match sqlx::query_scalar(
        r#"SELECT value FROM public.system_settings
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL"#,
    )
    .bind(&key)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            let _ = tx.rollback().await;
            return ApiResponse::from(TopemsError::internal("更新设置项失败", e));
        }
    };
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"UPDATE public.system_settings SET
              value = COALESCE($2, value),
              description = COALESCE($3, description),
              category = COALESCE($4, category),
              override_policy = COALESCE($5, override_policy),
              updated_at = NOW()
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
           RETURNING id, tenant_id, company_id, key, value, description, category, override_policy,
                     created_at, updated_at"#,
    )
    .bind(&key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.category)
    .bind(&payload.override_policy)
    .fetch_one(&mut *tx)
    .await;

    match setting {
        Ok(v) => {
            let _ = tx.commit().await;
            audit_platform_setting(
                &pool,
                &claims,
                &headers,
                "update",
                Some(v.id),
                &key,
                old_value.as_deref(),
                v.value.as_deref(),
            )
            .await;
            ApiResponse::success(v, "更新成功")
        }
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:write"])),
    path = "/system/settings/{key}",
    tag = "ERP",
    params(("key" = String, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = String),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_setting(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(key): Path<String>,
    headers: HeaderMap,
) -> ApiResponse<String> {
    if let Err(e) = require_platform_operator(&claims) {
        return ApiResponse::from(e);
    }
    if let Err(e) = require_platform_confirm(&headers, &key) {
        return ApiResponse::from(e);
    }

    let mut tx = match platform_tx(&pool).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("删除设置项失败", e)),
    };
    let deleted: Result<Option<(Uuid, Option<String>)>, _> = sqlx::query_as(
        r#"DELETE FROM public.system_settings
           WHERE key = $1 AND tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
           RETURNING id, value"#,
    )
    .bind(&key)
    .fetch_optional(&mut *tx)
    .await;

    match deleted {
        Ok(Some((id, old_value))) => {
            let _ = tx.commit().await;
            audit_platform_setting(
                &pool,
                &claims,
                &headers,
                "delete",
                Some(id),
                &key,
                old_value.as_deref(),
                None,
            )
            .await;
            ApiResponse::success("删除成功".to_string(), "删除成功")
        }
        Ok(None) => {
            let _ = tx.rollback().await;
            ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string()))
        }
        Err(e) => {
            let _ = tx.rollback().await;
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
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(payload): Json<BatchUpdateRequest>,
) -> ApiResponse<Vec<SystemSetting>> {
    if let Err(e) = require_platform_operator(&claims) {
        return ApiResponse::from(e);
    }
    if let Err(e) = require_platform_confirm(&headers, "batch") {
        return ApiResponse::from(e);
    }
    let settings_map = match payload.settings.as_object() {
        Some(m) => m,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "settings 必须为对象".to_string(),
            ))
        }
    };

    let mut updated = Vec::new();

    let mut tx = match platform_tx(&pool).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("批量更新设置失败", e)),
    };

    let keys: Vec<String> = settings_map.keys().cloned().collect();
    let old_values: HashMap<String, String> = match sqlx::query_as::<_, (String, Option<String>)>(
        r#"SELECT key, value FROM public.system_settings
           WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
             AND key = ANY($1)"#,
    )
    .bind(&keys)
    .fetch_all(&mut *tx)
    .await
    {
        Ok(rows) => rows
            .into_iter()
            .filter_map(|(k, v)| v.map(|v| (k, v)))
            .collect(),
        Err(e) => {
            let _ = tx.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量更新设置失败", e));
        }
    };

    for (key, value) in settings_map {
        let value_str = match value {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };

        let result: Result<SystemSetting, _> = sqlx::query_as(
            r#"INSERT INTO public.system_settings
                   (tenant_id, company_id, key, value, category, override_policy)
               VALUES (NULL, NULL, $1, $2, 'general', 'platform_only')
               ON CONFLICT (key) WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
               DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
               RETURNING id, tenant_id, company_id, key, value, description, category, override_policy,
                         created_at, updated_at"#,
        )
        .bind(key)
        .bind(&value_str)
        .fetch_one(&mut *tx)
        .await;

        if let Ok(s) = result {
            updated.push(s);
        }
    }

    let _ = tx.commit().await;

    let entity_ids = serde_json::json!(updated
        .iter()
        .map(|s| s.key.clone())
        .collect::<Vec<String>>());
    let new_values: serde_json::Map<String, Value> = settings_map
        .iter()
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    log_audit_event(
        &pool,
        AuditEventParams {
            action: "batch_update".to_string(),
            entity_type: "system_setting".to_string(),
            entity_id: None,
            entity_ids: Some(entity_ids),
            tenant_id: claims.tenant_id.clone(),
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: Some(json!({ "scope": "platform" })),
            response_details: Some(json!({ "old": old_values, "new": new_values })),
            status: "success".to_string(),
            error_message: None,
        },
        &headers,
    )
    .await;

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
        r#"SELECT key, value, description, category, company_id, tenant_id
           FROM public.system_settings
           WHERE deleted_at IS NULL
             AND ((tenant_id = $1 AND company_id = $2)
                  OR (tenant_id = $1 AND company_id IS NULL)
                  OR (tenant_id IS NULL AND company_id IS NULL))
             AND ($3::text IS NULL OR category = $3)
             AND ($4 = '' OR key ILIKE '%' || $4 || '%' OR value ILIKE '%' || $4 || '%')
           ORDER BY key,
                    CASE
                        WHEN company_id = $2 THEN 0
                        WHEN company_id IS NULL AND tenant_id IS NOT NULL THEN 1
                        ELSE 2
                    END"#,
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
        let row_tenant: Option<Uuid> = row.try_get("tenant_id").ok();
        let source = if row_company.is_some() {
            "company"
        } else if row_tenant.is_some() {
            "master"
        } else {
            "platform"
        };
        let item = CompanySettingItem {
            key: key.clone(),
            value: row.try_get("value").ok(),
            description: row.try_get("description").ok(),
            category: row.try_get("category").ok(),
            source,
        };
        // 三层取值：本司行 > 集团母版行 > 平台默认行；先到先得。
        merged.entry(key).or_insert(item);
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
        r#"SELECT key, value, description, category, company_id, tenant_id
           FROM public.system_settings
           WHERE deleted_at IS NULL
             AND key = $3
             AND ((tenant_id = $1 AND company_id = $2)
                  OR (tenant_id = $1 AND company_id IS NULL)
                  OR (tenant_id IS NULL AND company_id IS NULL))
           ORDER BY CASE
                        WHEN company_id = $2 THEN 0
                        WHEN company_id IS NULL AND tenant_id IS NOT NULL THEN 1
                        ELSE 2
                    END
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
            let row_tenant: Option<Uuid> = row.try_get("tenant_id").ok();
            let source = if row_company.is_some() {
                "company"
            } else if row_tenant.is_some() {
                "master"
            } else {
                "platform"
            };
            ApiResponse::success(
                CompanySettingItem {
                    key: row.try_get("key").unwrap_or(key),
                    value: row.try_get("value").ok(),
                    description: row.try_get("description").ok(),
                    category: row.try_get("category").ok(),
                    source,
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
    headers: HeaderMap,
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

    let has_parent = match reject_if_platform_locked(&mut scope, tenant_id, &key).await {
        Ok(v) => v,
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(e);
        }
    };
    let old_value: Option<String> = sqlx::query_scalar(
        r#"SELECT value FROM public.system_settings
           WHERE tenant_id = $1 AND company_id = $2 AND key = $3 AND deleted_at IS NULL"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await
    .unwrap_or(None);
    let override_policy = if has_parent {
        "company_overridable"
    } else {
        "company_only"
    };

    let result: Result<Uuid, sqlx::Error> = sqlx::query_scalar(
        r#"INSERT INTO public.system_settings
               (tenant_id, company_id, key, value, description, category, override_policy)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (tenant_id, company_id, key)
               WHERE deleted_at IS NULL AND company_id IS NOT NULL
           DO UPDATE SET
               value = EXCLUDED.value,
               description = COALESCE(EXCLUDED.description, system_settings.description),
               category = COALESCE(EXCLUDED.category, system_settings.category),
               override_policy = EXCLUDED.override_policy,
               updated_at = NOW()
           RETURNING id"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&category)
    .bind(override_policy)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(entity_id) => match scope.commit().await {
            Ok(()) => {
                audit_company_setting(
                    &state.system_pool,
                    &claims,
                    &headers,
                    "update",
                    Some(entity_id),
                    &key,
                    old_value.as_deref(),
                    Some(&payload.value),
                )
                .await;
                ApiResponse::success(
                    CompanySettingItem {
                        key,
                        value: Some(payload.value),
                        description: payload.description,
                        category,
                        source: "company",
                    },
                    "保存成功",
                )
            }
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
    headers: HeaderMap,
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
        let has_parent = match reject_if_platform_locked(&mut scope, tenant_id, key).await {
            Ok(v) => v,
            Err(e) => {
                let _ = scope.rollback().await;
                return ApiResponse::from(e);
            }
        };
        let override_policy = if has_parent {
            "company_overridable"
        } else {
            "company_only"
        };
        let result = sqlx::query(
            r#"INSERT INTO public.system_settings
                   (tenant_id, company_id, key, value, category, override_policy)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (tenant_id, company_id, key)
                   WHERE deleted_at IS NULL AND company_id IS NOT NULL
               DO UPDATE SET value = EXCLUDED.value,
                             override_policy = EXCLUDED.override_policy,
                             updated_at = NOW()
               RETURNING id"#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(key)
        .bind(&value_str)
        .bind(&category)
        .bind(override_policy)
        .fetch_one(&mut scope)
        .await;

        match result {
            Ok(row) => {
                use sqlx::Row;
                let _entity_id: Uuid = row.try_get("id").unwrap_or(company_id);
                updated.push(CompanySettingItem {
                    key: key.clone(),
                    value: Some(value_str),
                    description: None,
                    category,
                    source: "company",
                });
            }
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
        Ok(()) => {
            let new_values: serde_json::Map<String, Value> = settings_map
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            log_audit_event(
                &state.system_pool,
                AuditEventParams {
                    action: "batch_update".to_string(),
                    entity_type: "system_setting".to_string(),
                    entity_id: None,
                    entity_ids: Some(json!(settings_map.keys().cloned().collect::<Vec<_>>())),
                    tenant_id: claims.tenant_id.clone(),
                    user_id: Some(claims.sub.clone()),
                    user_name: Some(claims.username.clone()),
                    request_details: Some(json!({ "scope": "company" })),
                    response_details: Some(json!({ "new": new_values })),
                    status: "success".to_string(),
                    error_message: None,
                },
                &headers,
            )
            .await;
            ApiResponse::success(updated, "批量保存成功")
        }
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
    headers: HeaderMap,
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

    let deleted: Result<Option<(Uuid, Option<String>)>, sqlx::Error> = sqlx::query_as(
        r#"DELETE FROM public.system_settings
           WHERE tenant_id = $1 AND company_id = $2 AND key = $3 AND deleted_at IS NULL
           RETURNING id, value"#,
    )
    .bind(tenant_id)
    .bind(company_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await;

    match deleted {
        Ok(Some((entity_id, old_value))) => match scope.commit().await {
            Ok(()) => {
                audit_company_setting(
                    &state.system_pool,
                    &claims,
                    &headers,
                    "delete",
                    Some(entity_id),
                    &key,
                    old_value.as_deref(),
                    None,
                )
                .await;
                ApiResponse::success(serde_json::json!({ "key": key }), "删除成功")
            }
            Err(e) => ApiResponse::from(TopemsError::internal("删除公司参数失败", e)),
        },
        Ok(None) => {
            // 本司没有可删行：若母版/平台参数存在，明确 403 只读，不静默成功。
            let parent_exists = sqlx::query_scalar::<_, bool>(
                r#"SELECT EXISTS (
                       SELECT 1 FROM public.system_settings
                        WHERE tenant_id = $1 AND company_id IS NULL
                          AND key = $2 AND deleted_at IS NULL
                   ) OR EXISTS (
                       SELECT 1 FROM public.system_settings
                        WHERE tenant_id IS NULL AND company_id IS NULL
                          AND key = $2 AND deleted_at IS NULL
                   )"#,
            )
            .bind(tenant_id)
            .bind(&key)
            .fetch_one(&mut scope)
            .await;
            let _ = scope.rollback().await;

            match parent_exists {
                Ok(true) => ApiResponse::from(TopemsError::OperationNotAllowed(
                    "母版/平台参数只读，业务侧不可删除；如需停用请在公司行覆盖".to_string(),
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
