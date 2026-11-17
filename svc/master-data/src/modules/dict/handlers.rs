use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Extension, Json,
};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::{resolve_create_tenant, RlsTxnCell};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::PLATFORM_TENANT_ID;
use uuid::Uuid;

use crate::shared::AppState;

use super::models::{
    BatchCreateDictItemsRequest, CreateDictItemRequest, CreateDictTypeRequest, DictItem,
    DictItemListResponse, DictItemQuery, DictType, DictTypeListResponse, DictTypeQuery,
    UpdateDictItemRequest, UpdateDictTypeRequest,
};

fn dict_type_columns(locale_placeholder: &str) -> String {
    format!(
        "id, code, CASE WHEN {} = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, category, description, status, created_at, updated_at",
        locale_placeholder
    )
}

fn dict_item_columns(locale_placeholder: &str) -> String {
    format!(
        "id, dict_type_id, code, CASE WHEN {} = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, value, sort_order, parent_id, extra_data, status, created_at, updated_at",
        locale_placeholder
    )
}

fn csv_field(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

/// 写路径落库租户：
/// - 普通用户 → `claims.tenant_id`（`tenant_middleware` 已确保存在且合法）；
/// - 超管 / 服务身份 → 平台语料租户 `PLATFORM_TENANT_ID`（与标准字典种子同一归属），
///   由读取端「本租户行 ∪ 平台行」对所有租户可见；普通租户写不到平台行。
fn create_tenant_id(claims: &Claims) -> Result<Uuid, String> {
    match resolve_create_tenant(claims) {
        Ok(Some(tenant_id)) => Ok(tenant_id),
        Ok(None) => Ok(PLATFORM_TENANT_ID),
        Err((_code, message)) => Err(message),
    }
}

// ==================== DictType handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/master-data/dict/dict-types",
    tag = "Dict",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页条数"),
        ("category" = Option<String>, Query, description = "分类"),
        ("status" = Option<String>, Query, description = "状态"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_dict_types(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Query(query): Query<DictTypeQuery>,
) -> ApiResponse<DictTypeListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let category = query.category.clone();
    let status = query.status.clone();
    let search = query.search.clone();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_dict_types
           WHERE deleted_at IS NULL AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(category.clone())
    .bind(status.clone())
    .bind(search.clone())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典类型总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询字典类型总数失败".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM public.core_dict_types
           WHERE deleted_at IS NULL AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
        dict_type_columns("$6")
    );

    let mut items: Vec<DictType> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(category.clone())
        .bind(status.clone())
        .bind(search.clone())
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典类型列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询字典类型列表失败".to_string()));
        }
    };
    let tenant_total = total;

    // 平台内置字典行（PLATFORM_TENANT_ID）：系统只读通道 + 显式平台谓词。
    // 平台行排在租户自定义行之后，两侧按合并序列做全局分页。
    // code 全局唯一（UNIQUE(code)），租户行与平台行天然不重叠，无需去重。
    let platform_sql = format!(
        r#"SELECT {} FROM public.core_dict_types
           WHERE deleted_at IS NULL AND tenant_id = $4
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC"#,
        dict_type_columns("$5")
    );
    let platform_items: Vec<DictType> = {
        let mut pscope = match state.rls_db.scope_read_platform().await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("建立平台只读作用域失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
            }
        };
        let result = sqlx::query_as(sqlx::AssertSqlSafe(platform_sql))
            .bind(category)
            .bind(status)
            .bind(search)
            .bind(PLATFORM_TENANT_ID)
            .bind(Locale::from_headers(&headers).as_sql())
            .fetch_all(&mut pscope)
            .await;
        let _ = pscope.rollback().await;
        match result {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询平台字典类型列表失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "查询字典类型列表失败".to_string(),
                ));
            }
        }
    };

    // usize→i64 用受检转换并饱和到 i64::MAX，避免 as 截断/回绕
    let platform_total = i64::try_from(platform_items.len()).unwrap_or(i64::MAX);
    let skip = usize::try_from((offset - tenant_total).max(0)).unwrap_or(0);
    let remaining = usize::try_from(page_size)
        .unwrap_or(0)
        .saturating_sub(items.len());
    items.extend(platform_items.into_iter().skip(skip).take(remaining));

    api_success(DictTypeListResponse {
        items,
        total: tenant_total + platform_total,
        page,
        page_size,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/master-data/dict/dict-types/{id}",
    tag = "Dict",
    params(
        ("id" = Uuid, Path, description = "字典类型ID"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 404, description = "字典类型不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_dict_type(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<DictType> {
    let sql = format!(
        r#"SELECT {} FROM public.core_dict_types WHERE deleted_at IS NULL AND id = $1"#,
        dict_type_columns("$2")
    );

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let dict_type: Option<DictType> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典类型详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询字典类型详情失败".to_string()));
        }
    };

    let dict_type = match dict_type {
        Some(dt) => Some(dt),
        None => {
            // 租户域未命中 → 平台内置行兜底（显式平台谓词，只读通道）。
            let platform_sql = format!(
                r#"SELECT {} FROM public.core_dict_types
                   WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $3"#,
                dict_type_columns("$2")
            );
            let mut pscope = match state.rls_db.scope_read_platform().await {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("建立平台只读作用域失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "数据库事务不可用".to_string(),
                    ));
                }
            };
            let result = sqlx::query_as(sqlx::AssertSqlSafe(platform_sql))
                .bind(id)
                .bind(Locale::from_headers(&headers).as_sql())
                .bind(PLATFORM_TENANT_ID)
                .fetch_optional(&mut pscope)
                .await;
            let _ = pscope.rollback().await;
            match result {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("查询平台字典类型详情失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "查询字典类型详情失败".to_string(),
                    ));
                }
            }
        }
    };

    match dict_type {
        Some(dt) => api_success(dt),
        None => ApiResponse::from(TopemsError::ResourceNotFound("字典类型不存在".to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master-data:schema:write"])),
    path = "/api/master-data/dict/dict-types",
    tag = "Dict",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "参数错误"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_dict_type(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateDictTypeRequest>,
) -> ApiResponse<DictType> {
    if req.code.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "字典类型编码不能为空".to_string(),
        ));
    }
    if req.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "字典类型名称不能为空".to_string(),
        ));
    }

    let tenant_id = match create_tenant_id(&claims) {
        Ok(id) => id,
        Err(message) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let sql = format!(
        r#"INSERT INTO public.core_dict_types (code, name, name_en, category, description, status, tenant_id)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)
           RETURNING {}"#,
        dict_type_columns("$7")
    );

    let dict_type: DictType = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.code)
        .bind(req.name)
        .bind(req.name_en)
        .bind(req.category.unwrap_or_else(|| "general".to_string()))
        .bind(req.description)
        .bind(tenant_id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_one(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建字典类型失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建字典类型失败".to_string()));
        }
    };

    api_success(dict_type)
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:update"])),
    path = "/api/master-data/dict/dict-types/{id}",
    tag = "Dict",
    params(
        ("id" = Uuid, Path, description = "字典类型ID"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新成功"),
        (status = 404, description = "字典类型不存在"),
        (status = 500, description = "更新失败"),
    ),
)]
pub async fn update_dict_type(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictTypeRequest>,
) -> ApiResponse<DictType> {
    let sql = format!(
        r#"UPDATE public.core_dict_types
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               name_en = COALESCE($8, name_en),
               category = COALESCE($3, category),
               description = COALESCE($4, description),
               status = COALESCE($5, status),
               updated_at = $6
           WHERE id = $7
           RETURNING {}"#,
        dict_type_columns("$9")
    );

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let dict_type: Option<DictType> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.code)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.status)
        .bind(chrono::Utc::now())
        .bind(id)
        .bind(req.name_en)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新字典类型失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新字典类型失败".to_string()));
        }
    };

    match dict_type {
        Some(dt) => api_success(dt),
        None => ApiResponse::from(TopemsError::ResourceNotFound("字典类型不存在".to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:delete"])),
    path = "/api/master-data/dict/dict-types/{id}",
    tag = "Dict",
    params(
        ("id" = Uuid, Path, description = "字典类型ID"),
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 404, description = "字典类型不存在"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_dict_type(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let result =
        sqlx::query(r#"UPDATE public.core_dict_types SET deleted_at = NOW() WHERE id = $1"#)
            .bind(id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success("字典类型删除成功".to_string()),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("字典类型不存在".to_string())),
        Err(e) => {
            tracing::error!("删除字典类型失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除字典类型失败".to_string()))
        }
    }
}

// ==================== DictItem handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/master-data/dict/dict-types/{dict_type_id}/items",
    tag = "Dict",
    params(
        ("dict_type_id" = Uuid, Path, description = "字典类型ID"),
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页条数"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_dict_items(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Path(dict_type_id): Path<Uuid>,
    Query(query): Query<DictItemQuery>,
) -> ApiResponse<DictItemListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = query.search.clone();
    let status = query.status.clone();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(dict_type_id)
    .bind(status.clone())
    .bind(search.clone())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典项总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询字典项总数失败".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM public.core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $4 OFFSET $5"#,
        dict_item_columns("$6")
    );

    let mut items: Vec<DictItem> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(dict_type_id)
        .bind(status.clone())
        .bind(search.clone())
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典项列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询字典项列表失败".to_string()));
        }
    };
    let tenant_total = total;

    // 平台内置字典项（PLATFORM_TENANT_ID）：与平台字典类型同 dict_type_id，
    // 租户域查不到平台类型时由这里补齐；按合并序列做全局分页。
    let platform_sql = format!(
        r#"SELECT {} FROM public.core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1 AND tenant_id = $4
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY sort_order ASC, created_at DESC"#,
        dict_item_columns("$5")
    );
    let platform_items: Vec<DictItem> = {
        let mut pscope = match state.rls_db.scope_read_platform().await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("建立平台只读作用域失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
            }
        };
        let result = sqlx::query_as(sqlx::AssertSqlSafe(platform_sql))
            .bind(dict_type_id)
            .bind(status)
            .bind(search)
            .bind(PLATFORM_TENANT_ID)
            .bind(Locale::from_headers(&headers).as_sql())
            .fetch_all(&mut pscope)
            .await;
        let _ = pscope.rollback().await;
        match result {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询平台字典项列表失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询字典项列表失败".to_string()));
            }
        }
    };

    // usize→i64 用受检转换并饱和到 i64::MAX，避免 as 截断/回绕
    let platform_total = i64::try_from(platform_items.len()).unwrap_or(i64::MAX);
    let skip = usize::try_from((offset - tenant_total).max(0)).unwrap_or(0);
    let remaining = usize::try_from(page_size)
        .unwrap_or(0)
        .saturating_sub(items.len());
    items.extend(platform_items.into_iter().skip(skip).take(remaining));

    api_success(DictItemListResponse {
        items,
        total: tenant_total + platform_total,
        page,
        page_size,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/master-data/dict/dict-items/{id}",
    tag = "Dict",
    params(
        ("id" = Uuid, Path, description = "字典项ID"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 404, description = "字典项不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_dict_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<DictItem> {
    let sql = format!(
        r#"SELECT {} FROM public.core_dict_items WHERE deleted_at IS NULL AND id = $1"#,
        dict_item_columns("$2")
    );

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let dict_item: Option<DictItem> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典项详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询字典项详情失败".to_string()));
        }
    };

    let dict_item = match dict_item {
        Some(di) => Some(di),
        None => {
            // 租户域未命中 → 平台内置行兜底（显式平台谓词，只读通道）。
            let platform_sql = format!(
                r#"SELECT {} FROM public.core_dict_items
                   WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $3"#,
                dict_item_columns("$2")
            );
            let mut pscope = match state.rls_db.scope_read_platform().await {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("建立平台只读作用域失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "数据库事务不可用".to_string(),
                    ));
                }
            };
            let result = sqlx::query_as(sqlx::AssertSqlSafe(platform_sql))
                .bind(id)
                .bind(Locale::from_headers(&headers).as_sql())
                .bind(PLATFORM_TENANT_ID)
                .fetch_optional(&mut pscope)
                .await;
            let _ = pscope.rollback().await;
            match result {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("查询平台字典项详情失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "查询字典项详情失败".to_string(),
                    ));
                }
            }
        }
    };

    match dict_item {
        Some(di) => api_success(di),
        None => ApiResponse::from(TopemsError::ResourceNotFound("字典项不存在".to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master-data:schema:write"])),
    path = "/api/master-data/dict/dict-items",
    tag = "Dict",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "参数错误"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_dict_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateDictItemRequest>,
) -> ApiResponse<DictItem> {
    if req.code.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "字典项编码不能为空".to_string(),
        ));
    }
    if req.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "字典项名称不能为空".to_string(),
        ));
    }

    let tenant_id = match create_tenant_id(&claims) {
        Ok(id) => id,
        Err(message) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let sql = format!(
        r#"INSERT INTO public.core_dict_items (dict_type_id, code, name, name_en, value, sort_order, parent_id, extra_data, status, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
           RETURNING {}"#,
        dict_item_columns("$10")
    );

    let dict_item: DictItem = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.dict_type_id)
        .bind(req.code)
        .bind(req.name)
        .bind(req.name_en)
        .bind(req.value)
        .bind(req.sort_order.unwrap_or(0))
        .bind(req.parent_id)
        .bind(req.extra_data)
        .bind(tenant_id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_one(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建字典项失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建字典项失败".to_string()));
        }
    };

    api_success(dict_item)
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:update"])),
    path = "/api/master-data/dict/dict-items/{id}",
    tag = "Dict",
    params(
        ("id" = Uuid, Path, description = "字典项ID"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新成功"),
        (status = 404, description = "字典项不存在"),
        (status = 500, description = "更新失败"),
    ),
)]
pub async fn update_dict_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictItemRequest>,
) -> ApiResponse<DictItem> {
    let sql = format!(
        r#"UPDATE public.core_dict_items
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               name_en = COALESCE($10, name_en),
               value = COALESCE($3, value),
               sort_order = COALESCE($4, sort_order),
               parent_id = COALESCE($5, parent_id),
               extra_data = COALESCE($6, extra_data),
               status = COALESCE($7, status),
               updated_at = $8
           WHERE id = $9
           RETURNING {}"#,
        dict_item_columns("$11")
    );

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let dict_item: Option<DictItem> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.code)
        .bind(req.name)
        .bind(req.value)
        .bind(req.sort_order)
        .bind(req.parent_id)
        .bind(req.extra_data)
        .bind(req.status)
        .bind(chrono::Utc::now())
        .bind(id)
        .bind(req.name_en)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新字典项失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新字典项失败".to_string()));
        }
    };

    match dict_item {
        Some(di) => api_success(di),
        None => ApiResponse::from(TopemsError::ResourceNotFound("字典项不存在".to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:delete"])),
    path = "/api/master-data/dict/dict-items/{id}",
    tag = "Dict",
    params(
        ("id" = Uuid, Path, description = "字典项ID"),
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 404, description = "字典项不存在"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_dict_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let result =
        sqlx::query(r#"UPDATE public.core_dict_items SET deleted_at = NOW() WHERE id = $1"#)
            .bind(id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success("字典项删除成功".to_string()),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("字典项不存在".to_string())),
        Err(e) => {
            tracing::error!("删除字典项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除字典项失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:write"])),
    path = "/api/master-data/dict/dict-items/batch",
    tag = "Dict",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "批量创建成功"),
        (status = 400, description = "字典项列表不能为空"),
        (status = 500, description = "批量创建失败"),
    ),
)]
pub async fn batch_create_dict_items(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchCreateDictItemsRequest>,
) -> ApiResponse<Vec<DictItem>> {
    if req.items.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "字典项列表不能为空".to_string(),
        ));
    }

    let tenant_id = match create_tenant_id(&claims) {
        Ok(id) => id,
        Err(message) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let insert_sql = format!(
        r#"INSERT INTO public.core_dict_items (dict_type_id, code, name, name_en, value, sort_order, parent_id, extra_data, status, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
           RETURNING {}"#,
        dict_item_columns("$10")
    );

    let mut results: Vec<DictItem> = Vec::with_capacity(req.items.len());
    for item in req.items {
        let dict_item: DictItem = match sqlx::query_as(sqlx::AssertSqlSafe(insert_sql.as_str()))
            .bind(req.dict_type_id)
            .bind(item.code)
            .bind(item.name)
            .bind(item.name_en)
            .bind(item.value)
            .bind(item.sort_order.unwrap_or(0))
            .bind(item.parent_id)
            .bind(item.extra_data)
            .bind(tenant_id)
            .bind(Locale::from_headers(&headers).as_sql())
            .fetch_one(&mut scope)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("批量创建字典项失败: {}", e);
                // 复用请求事务时不能只靠"未提交"兜底：本请求若继续返回 2xx，
                // 中间件会提交已经插入的部分行。这里显式回滚并摘除事务句柄。
                drop(scope);
                if let Some(txn) = guard.take() {
                    let _ = txn.rollback().await;
                }
                return ApiResponse::from(TopemsError::Internal("批量创建字典项失败".to_string()));
            }
        };
        results.push(dict_item);
    }

    api_success(results)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/master-data/dict/dict-types/{dict_type_id}/items/export",
    tag = "Dict",
    params(
        ("dict_type_id" = Uuid, Path, description = "字典类型ID"),
    ),
    responses(
        (status = 200, description = "导出成功，返回CSV文本"),
        (status = 500, description = "导出失败"),
    ),
)]
pub async fn export_dict_items(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Path(dict_type_id): Path<Uuid>,
) -> String {
    let sql = format!(
        r#"SELECT {} FROM public.core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1
           ORDER BY sort_order ASC, created_at DESC"#,
        dict_item_columns("$2")
    );

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return "导出失败: 数据库事务不可用".to_string();
    };
    let mut scope = match state.rls_db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return format!("导出失败: {}", e);
        }
    };

    let mut items: Vec<DictItem> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(dict_type_id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("导出字典项失败: {}", e);
            return format!("导出失败: {}", e);
        }
    };

    // 平台内置字典项一并导出（显式平台谓词，只读通道）。
    let platform_sql = format!(
        r#"SELECT {} FROM public.core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1 AND tenant_id = $3
           ORDER BY sort_order ASC, created_at DESC"#,
        dict_item_columns("$2")
    );
    {
        let mut pscope = match state.rls_db.scope_read_platform().await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("建立平台只读作用域失败: {}", e);
                return format!("导出失败: {}", e);
            }
        };
        let result = sqlx::query_as::<_, DictItem>(sqlx::AssertSqlSafe(platform_sql))
            .bind(dict_type_id)
            .bind(Locale::from_headers(&headers).as_sql())
            .bind(PLATFORM_TENANT_ID)
            .fetch_all(&mut pscope)
            .await;
        let _ = pscope.rollback().await;
        match result {
            Ok(v) => items.extend(v),
            Err(e) => {
                tracing::error!("导出平台字典项失败: {}", e);
                return format!("导出失败: {}", e);
            }
        }
    }

    let mut csv = String::from(
        "id,dict_type_id,code,name,value,sort_order,parent_id,status,created_at,updated_at\n",
    );
    for item in items {
        let value = item.value.unwrap_or_default();
        let parent_id = item.parent_id.map(|u| u.to_string()).unwrap_or_default();
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{}\n",
            item.id,
            item.dict_type_id,
            csv_field(&item.code),
            csv_field(&item.name),
            csv_field(&value),
            item.sort_order,
            parent_id,
            item.status,
            item.created_at.to_rfc3339(),
            item.updated_at.to_rfc3339(),
        ));
    }

    csv
}
