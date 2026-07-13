use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    BatchCreateDictItemsRequest, CreateDictItemRequest, CreateDictTypeRequest, DictItem,
    DictItemListResponse, DictItemQuery, DictType, DictTypeListResponse, DictTypeQuery,
    UpdateDictItemRequest, UpdateDictTypeRequest,
};

const DICT_TYPE_COLUMNS: &str =
    "id, code, name, category, description, status, created_at, updated_at";

const DICT_ITEM_COLUMNS: &str =
    "id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at";

fn csv_field(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

// ==================== DictType handlers ====================

pub async fn list_dict_types(
    State(state): State<AppState>,
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
           WHERE ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(category.clone())
    .bind(status.clone())
    .bind(search.clone())
    .fetch_one(&state.pool)
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
           WHERE ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
        DICT_TYPE_COLUMNS
    );

    let items: Vec<DictType> = match sqlx::query_as(&sql)
        .bind(category)
        .bind(status)
        .bind(search)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
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

pub async fn get_dict_type(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DictType>> {
    let sql = format!(
        r#"SELECT {} FROM core_dict_types WHERE id = $1"#,
        DICT_TYPE_COLUMNS
    );

    let dict_type: Option<DictType> = match sqlx::query_as(&sql)
        .bind(id)
        .fetch_optional(&state.pool)
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

pub async fn create_dict_type(
    State(state): State<AppState>,
    Json(req): Json<CreateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "字典类型编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "字典类型名称不能为空"));
    }

    let sql = format!(
        r#"INSERT INTO core_dict_types (code, name, category, description, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING {}"#,
        DICT_TYPE_COLUMNS
    );

    let dict_type: DictType = match sqlx::query_as(&sql)
        .bind(req.code)
        .bind(req.name)
        .bind(req.category.unwrap_or_else(|| "general".to_string()))
        .bind(req.description)
        .fetch_one(&state.pool)
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

pub async fn update_dict_type(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictTypeRequest>,
) -> Json<ApiResponse<DictType>> {
    let sql = format!(
        r#"UPDATE core_dict_types
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               category = COALESCE($3, category),
               description = COALESCE($4, description),
               status = COALESCE($5, status),
               updated_at = $6
           WHERE id = $7
           RETURNING {}"#,
        DICT_TYPE_COLUMNS
    );

    let dict_type: Option<DictType> = match sqlx::query_as(&sql)
        .bind(req.code)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.status)
        .bind(chrono::Utc::now())
        .bind(id)
        .fetch_optional(&state.pool)
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

pub async fn delete_dict_type(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(r#"DELETE FROM core_dict_types WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
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

pub async fn list_dict_items(
    State(state): State<AppState>,
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
           WHERE dict_type_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(dict_type_id)
    .bind(status.clone())
    .bind(search.clone())
    .fetch_one(&state.pool)
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
           WHERE dict_type_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $4 OFFSET $5"#,
        DICT_ITEM_COLUMNS
    );

    let items: Vec<DictItem> = match sqlx::query_as(&sql)
        .bind(dict_type_id)
        .bind(status)
        .bind(search)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
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

pub async fn get_dict_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DictItem>> {
    let sql = format!(
        r#"SELECT {} FROM core_dict_items WHERE id = $1"#,
        DICT_ITEM_COLUMNS
    );

    let dict_item: Option<DictItem> = match sqlx::query_as(&sql)
        .bind(id)
        .fetch_optional(&state.pool)
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

pub async fn create_dict_item(
    State(state): State<AppState>,
    Json(req): Json<CreateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "字典项编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "字典项名称不能为空"));
    }

    let sql = format!(
        r#"INSERT INTO core_dict_items (dict_type_id, code, name, value, sort_order, parent_id, extra_data, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING {}"#,
        DICT_ITEM_COLUMNS
    );

    let dict_item: DictItem = match sqlx::query_as(&sql)
        .bind(req.dict_type_id)
        .bind(req.code)
        .bind(req.name)
        .bind(req.value)
        .bind(req.sort_order.unwrap_or(0))
        .bind(req.parent_id)
        .bind(req.extra_data)
        .fetch_one(&state.pool)
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

pub async fn update_dict_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictItemRequest>,
) -> Json<ApiResponse<DictItem>> {
    let sql = format!(
        r#"UPDATE core_dict_items
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               value = COALESCE($3, value),
               sort_order = COALESCE($4, sort_order),
               parent_id = COALESCE($5, parent_id),
               extra_data = COALESCE($6, extra_data),
               status = COALESCE($7, status),
               updated_at = $8
           WHERE id = $9
           RETURNING {}"#,
        DICT_ITEM_COLUMNS
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
        .fetch_optional(&state.pool)
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

pub async fn delete_dict_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(r#"DELETE FROM core_dict_items WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
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

pub async fn batch_create_dict_items(
    State(state): State<AppState>,
    Json(req): Json<BatchCreateDictItemsRequest>,
) -> Json<ApiResponse<Vec<DictItem>>> {
    if req.items.is_empty() {
        return Json(api_error(400, "字典项列表不能为空"));
    }

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return Json(api_error(500, "开启事务失败"));
        }
    };

    let insert_sql = format!(
        r#"INSERT INTO core_dict_items (dict_type_id, code, name, value, sort_order, parent_id, extra_data, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING {}"#,
        DICT_ITEM_COLUMNS
    );

    let mut results: Vec<DictItem> = Vec::with_capacity(req.items.len());
    for item in req.items {
        let dict_item: DictItem = match sqlx::query_as(&insert_sql)
            .bind(req.dict_type_id)
            .bind(item.code)
            .bind(item.name)
            .bind(item.value)
            .bind(item.sort_order.unwrap_or(0))
            .bind(item.parent_id)
            .bind(item.extra_data)
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

pub async fn export_dict_items(
    State(state): State<AppState>,
    Path(dict_type_id): Path<Uuid>,
) -> String {
    let sql = format!(
        r#"SELECT {} FROM core_dict_items
           WHERE dict_type_id = $1
           ORDER BY sort_order ASC, created_at DESC"#,
        DICT_ITEM_COLUMNS
    );

    let items: Vec<DictItem> = match sqlx::query_as(&sql)
        .bind(dict_type_id)
        .fetch_all(&state.pool)
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
