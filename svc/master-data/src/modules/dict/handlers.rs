use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared::ApiResponse;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::{api_error, api_success};

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
    headers: HeaderMap,
    Query(query): Query<DictTypeQuery>,
) -> Json<ApiResponse<DictTypeListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let category = query.category.clone();
    let status = query.status.clone();
    let search = query.search.clone();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_dict_types
           WHERE deleted_at IS NULL AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(category.clone())
    .bind(status.clone())
    .bind(search.clone())
    .fetch_one(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典类型总数失败: {}", e);
            return Json(api_error(500, "查询字典类型总数失败"));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM core_dict_types
           WHERE deleted_at IS NULL AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
        dict_type_columns("$6")
    );

    let items: Vec<DictType> = match sqlx::query_as(&sql)
        .bind(category)
        .bind(status)
        .bind(search)
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典类型列表失败: {}", e);
            return Json(api_error(500, "查询字典类型列表失败"));
        }
    };

    Json(api_success(DictTypeListResponse {
        items,
        total,
        page,
        page_size,
    }))
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DictType>> {
    let sql = format!(
        r#"SELECT {} FROM core_dict_types WHERE deleted_at IS NULL AND id = $1"#,
        dict_type_columns("$2")
    );

    let dict_type: Option<DictType> = match sqlx::query_as(&sql)
        .bind(id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典类型详情失败: {}", e);
            return Json(api_error(500, "查询字典类型详情失败"));
        }
    };

    match dict_type {
        Some(dt) => Json(api_success(dt)),
        None => Json(api_error(404, "字典类型不存在")),
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
    headers: HeaderMap,
    Json(req): Json<CreateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "字典类型编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "字典类型名称不能为空"));
    }

    let sql = format!(
        r#"INSERT INTO core_dict_types (code, name, name_en, category, description, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING {}"#,
        dict_type_columns("$6")
    );

    let dict_type: DictType = match sqlx::query_as(&sql)
        .bind(req.code)
        .bind(req.name)
        .bind(req.name_en)
        .bind(req.category.unwrap_or_else(|| "general".to_string()))
        .bind(req.description)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_one(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建字典类型失败: {}", e);
            return Json(api_error(500, "创建字典类型失败"));
        }
    };

    Json(api_success(dict_type))
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    let sql = format!(
        r#"UPDATE core_dict_types
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

    let dict_type: Option<DictType> = match sqlx::query_as(&sql)
        .bind(req.code)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.status)
        .bind(chrono::Utc::now())
        .bind(id)
        .bind(req.name_en)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新字典类型失败: {}", e);
            return Json(api_error(500, "更新字典类型失败"));
        }
    };

    match dict_type {
        Some(dt) => Json(api_success(dt)),
        None => Json(api_error(404, "字典类型不存在")),
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
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(r#"UPDATE core_dict_types SET deleted_at = NOW() WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success("字典类型删除成功".to_string())),
        Ok(_) => Json(api_error(404, "字典类型不存在")),
        Err(e) => {
            tracing::error!("删除字典类型失败: {}", e);
            Json(api_error(500, "删除字典类型失败"))
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
    headers: HeaderMap,
    Path(dict_type_id): Path<Uuid>,
    Query(query): Query<DictItemQuery>,
) -> Json<ApiResponse<DictItemListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = query.search.clone();
    let status = query.status.clone();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(dict_type_id)
    .bind(status.clone())
    .bind(search.clone())
    .fetch_one(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典项总数失败: {}", e);
            return Json(api_error(500, "查询字典项总数失败"));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $4 OFFSET $5"#,
        dict_item_columns("$6")
    );

    let items: Vec<DictItem> = match sqlx::query_as(&sql)
        .bind(dict_type_id)
        .bind(status)
        .bind(search)
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典项列表失败: {}", e);
            return Json(api_error(500, "查询字典项列表失败"));
        }
    };

    Json(api_success(DictItemListResponse {
        items,
        total,
        page,
        page_size,
    }))
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DictItem>> {
    let sql = format!(
        r#"SELECT {} FROM core_dict_items WHERE deleted_at IS NULL AND id = $1"#,
        dict_item_columns("$2")
    );

    let dict_item: Option<DictItem> = match sqlx::query_as(&sql)
        .bind(id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询字典项详情失败: {}", e);
            return Json(api_error(500, "查询字典项详情失败"));
        }
    };

    match dict_item {
        Some(di) => Json(api_success(di)),
        None => Json(api_error(404, "字典项不存在")),
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
    headers: HeaderMap,
    Json(req): Json<CreateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "字典项编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "字典项名称不能为空"));
    }

    let sql = format!(
        r#"INSERT INTO core_dict_items (dict_type_id, code, name, name_en, value, sort_order, parent_id, extra_data, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
           RETURNING {}"#,
        dict_item_columns("$9")
    );

    let dict_item: DictItem = match sqlx::query_as(&sql)
        .bind(req.dict_type_id)
        .bind(req.code)
        .bind(req.name)
        .bind(req.name_en)
        .bind(req.value)
        .bind(req.sort_order.unwrap_or(0))
        .bind(req.parent_id)
        .bind(req.extra_data)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_one(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建字典项失败: {}", e);
            return Json(api_error(500, "创建字典项失败"));
        }
    };

    Json(api_success(dict_item))
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    let sql = format!(
        r#"UPDATE core_dict_items
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

    let dict_item: Option<DictItem> = match sqlx::query_as(&sql)
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
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新字典项失败: {}", e);
            return Json(api_error(500, "更新字典项失败"));
        }
    };

    match dict_item {
        Some(di) => Json(api_success(di)),
        None => Json(api_error(404, "字典项不存在")),
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
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(r#"UPDATE core_dict_items SET deleted_at = NOW() WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success("字典项删除成功".to_string())),
        Ok(_) => Json(api_error(404, "字典项不存在")),
        Err(e) => {
            tracing::error!("删除字典项失败: {}", e);
            Json(api_error(500, "删除字典项失败"))
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
    headers: HeaderMap,
    Json(req): Json<BatchCreateDictItemsRequest>,
) -> Json<ApiResponse<Vec<DictItem>>> {
    if req.items.is_empty() {
        return Json(api_error(400, "字典项列表不能为空"));
    }

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return Json(api_error(500, "开启事务失败"));
        }
    };

    let insert_sql = format!(
        r#"INSERT INTO core_dict_items (dict_type_id, code, name, name_en, value, sort_order, parent_id, extra_data, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
           RETURNING {}"#,
        dict_item_columns("$9")
    );

    let mut results: Vec<DictItem> = Vec::with_capacity(req.items.len());
    for item in req.items {
        let dict_item: DictItem = match sqlx::query_as(&insert_sql)
            .bind(req.dict_type_id)
            .bind(item.code)
            .bind(item.name)
            .bind(item.name_en)
            .bind(item.value)
            .bind(item.sort_order.unwrap_or(0))
            .bind(item.parent_id)
            .bind(item.extra_data)
            .bind(Locale::from_headers(&headers).as_sql())
            .fetch_one(&mut *tx)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("批量创建字典项失败: {}", e);
                let _ = tx.rollback().await;
                return Json(api_error(500, "批量创建字典项失败"));
            }
        };
        results.push(dict_item);
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(api_error(500, "提交事务失败"));
    }

    Json(api_success(results))
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
    headers: HeaderMap,
    Path(dict_type_id): Path<Uuid>,
) -> String {
    let sql = format!(
        r#"SELECT {} FROM core_dict_items
           WHERE deleted_at IS NULL AND dict_type_id = $1
           ORDER BY sort_order ASC, created_at DESC"#,
        dict_item_columns("$2")
    );

    let items: Vec<DictItem> = match sqlx::query_as(&sql)
        .bind(dict_type_id)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("导出字典项失败: {}", e);
            return format!("导出失败: {}", e);
        }
    };

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
