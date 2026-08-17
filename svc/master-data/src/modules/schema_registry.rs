// Schema Registry — 元数据驱动的动态 API
//
// 接收前端 EntitySchema 配置，存储到数据库，并根据 Schema 动态生成 CRUD 路由。
// 这是 V63.0 低代码平台的后端核心能力。
//
// 路由：
//   POST   /api/master/schema-registry/schemas          注册新 Schema
//   GET    /api/master/schema-registry/schemas          列出所有 Schema
//   GET    /api/master/schema-registry/schemas/{id}     获取 Schema 详情
//   PUT    /api/master/schema-registry/schemas/{id}     更新 Schema
//   DELETE /api/master/schema-registry/schemas/{id}     删除 Schema
//   POST   /api/master/schema-registry/schemas/{id}/data    创建数据记录
//   GET    /api/master/schema-registry/schemas/{id}/data    查询数据记录（分页）
//   GET    /api/master/schema-registry/schemas/{id}/data/{record_id}  获取单条记录
//   PUT    /api/master/schema-registry/schemas/{id}/data/{record_id}  更新记录
//   DELETE /api/master/schema-registry/schemas/{id}/data/{record_id}  删除记录

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::shared::AppState;

// ============ 纯函数（无副作用，可单测） ============

/// 校验给定字符串值是否符合期望的字段类型。
/// 支持的类型：
/// - `text` / `string`: 任何非空字符串均通过（空字符串视为不合法）
/// - `number` / `float`: 可解析为 f64
/// - `integer` / `int` / `long`: 可解析为 i64
/// - `boolean` / `bool`: "true"/"false"（大小写不敏感）
/// - `date` / `datetime`: 符合 ISO 8601 / YYYY-MM-DD 等常见日期格式
/// 其它类型默认返回 false（保守拒绝）。
pub fn validate_field_type(value: &str, expected_type: &str) -> bool {
    let et = expected_type.trim().to_lowercase();
    match et.as_str() {
        "text" | "string" | "textarea" | "select" => !value.is_empty(),
        "number" | "float" | "decimal" => value.trim().parse::<f64>().is_ok(),
        "integer" | "int" | "long" => value.trim().parse::<i64>().is_ok(),
        "boolean" | "bool" | "switch" => {
            let v = value.trim().to_lowercase();
            v == "true" || v == "false"
        }
        "date" => is_valid_date(value),
        "datetime" => is_valid_datetime(value),
        _ => false,
    }
}

/// 简单日期校验：YYYY-MM-DD（要求严格 4-2-2 位数字）
fn is_valid_date(value: &str) -> bool {
    let parts: Vec<&str> = value.trim().split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    // 严格校验位数：年 4 位、月 2 位、日 2 位
    if parts[0].len() != 4 || parts[1].len() != 2 || parts[2].len() != 2 {
        return false;
    }
    let year = parts[0].parse::<u32>();
    let month = parts[1].parse::<u32>();
    let day = parts[2].parse::<u32>();
    match (year, month, day) {
        (Ok(y), Ok(m), Ok(d)) => {
            (1..=9999).contains(&y) && (1..=12).contains(&m) && (1..=31).contains(&d)
        }
        _ => false,
    }
}

/// 简单日期时间校验：YYYY-MM-DD[ T]HH:MM[:SS]
fn is_valid_datetime(value: &str) -> bool {
    let trimmed = value.trim();
    // 用空格或 T 分隔日期和时间部分
    let sep_idx = trimmed.find([' ', 'T']).unwrap_or(trimmed.len());
    let (date_part, time_part) = trimmed.split_at(sep_idx);
    if !is_valid_date(date_part) {
        return false;
    }
    let time_str = time_part.trim_start_matches(['T', ' ']);
    if time_str.is_empty() {
        return true; // 仅日期部分也接受
    }
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() < 2 || parts.len() > 3 {
        return false;
    }
    let h = parts[0].parse::<u32>();
    let m = parts[1].parse::<u32>();
    let s = if parts.len() == 3 {
        parts[2].parse::<u32>()
    } else {
        Ok(0)
    };
    matches!(
        (h, m, s),
        (Ok(h), Ok(m), Ok(s)) if h < 24 && m < 60 && s < 60
    )
}

// ============ 数据模型 ============

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SchemaDefinition {
    pub id: Uuid,
    pub name: String,
    pub title: String,
    pub description: Option<String>,
    pub schema_json: Value,
    pub table_name: String,
    pub is_active: bool,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSchemaRequest {
    pub name: String,
    pub title: String,
    pub description: Option<String>,
    pub schema_json: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateSchemaRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub schema_json: Option<Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListSchemaQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListDataQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
}

// ============ Schema CRUD ============

#[utoipa::path(
    post,
    path = "/api/master-data/schema-registry/schemas",
    tag = "Schema Registry",
    request_body = CreateSchemaRequest,
    responses((status = 200, description = "创建 Schema 定义"))
)]
pub async fn create_schema(
    State(state): State<AppState>,
    Json(req): Json<CreateSchemaRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let table_name = format!("dynamic_{}", req.name.replace('-', "_"));

    let schema = sqlx::query_as::<_, SchemaDefinition>(
        r#"
        INSERT INTO schema_registry (name, title, description, schema_json, table_name, is_active, version)
        VALUES ($1, $2, $3, $4, $5, true, 1)
        RETURNING *
        "#,
    )
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.schema_json)
    .bind(&table_name)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Failed to create schema: {}", e) })),
        )
    })?;

    // 自动创建数据表
    if let Err(e) = create_dynamic_table(&state.db, &table_name, &req.schema_json).await {
        // 表创建失败不阻塞 Schema 注册，记录警告
        tracing::warn!("Failed to create dynamic table {}: {}", table_name, e);
    }

    Ok(Json(json!({
        "success": true,
        "code": 201,
        "message": "Schema created successfully",
        "data": schema,
    })))
}

#[utoipa::path(
    get,
    path = "/api/master-data/schema-registry/schemas/{id}",
    tag = "Schema Registry",
    params(("id" = Uuid, Path, description = "Schema ID")),
    responses((status = 200, description = "获取 Schema 定义"))
)]
pub async fn get_schema(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let schema =
        sqlx::query_as::<_, SchemaDefinition>("id, name, code, schema_type, version, description, definition, is_active, created_by, created_at, updated_at FROM schema_registry WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
                )
            })?;

    match schema {
        Some(s) => Ok(Json(json!({
            "success": true,
            "code": 200,
            "data": s,
        }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Schema not found" })),
        )),
    }
}

#[utoipa::path(
    get,
    path = "/api/master-data/schema-registry/schemas",
    tag = "Schema Registry",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键字"),
        ("is_active" = Option<bool>, Query, description = "是否启用")
    ),
    responses((status = 200, description = "查询 Schema 定义列表"))
)]
pub async fn list_schemas(
    State(state): State<AppState>,
    Query(q): Query<ListSchemaQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let schemas = sqlx::query_as::<_, SchemaDefinition>(
        r#"
        SELECT id, tenant_id, name, code, schema_type, version, definition, is_active, created_at, updated_at FROM schema_registry
        WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR title ILIKE '%' || $1 || '%')
          AND ($2::bool IS NULL OR is_active = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&q.search)
    .bind(q.is_active)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
        )
    })?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM schema_registry
        WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR title ILIKE '%' || $1 || '%')
          AND ($2::bool IS NULL OR is_active = $2)
        "#,
    )
    .bind(&q.search)
    .bind(q.is_active)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    Ok(Json(json!({
        "success": true,
        "code": 200,
        "data": {
            "items": schemas,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) / page_size,
        }
    })))
}

#[utoipa::path(
    put,
    path = "/api/master-data/schema-registry/schemas/{id}",
    tag = "Schema Registry",
    params(("id" = Uuid, Path, description = "Schema ID")),
    request_body = UpdateSchemaRequest,
    responses((status = 200, description = "更新 Schema 定义"))
)]
pub async fn update_schema(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSchemaRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let schema = sqlx::query_as::<_, SchemaDefinition>(
        r#"
        UPDATE schema_registry
        SET title = COALESCE($2, title),
            description = COALESCE($3, description),
            schema_json = COALESCE($4, schema_json),
            is_active = COALESCE($5, is_active),
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.schema_json)
    .bind(req.is_active)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
        )
    })?;

    match schema {
        Some(s) => Ok(Json(json!({
            "success": true,
            "code": 200,
            "data": s,
        }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Schema not found" })),
        )),
    }
}

#[utoipa::path(
    delete,
    path = "/api/master-data/schema-registry/schemas/{id}",
    tag = "Schema Registry",
    params(("id" = Uuid, Path, description = "Schema ID")),
    responses((status = 200, description = "删除 Schema 定义"))
)]
pub async fn delete_schema(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let result = sqlx::query("DELETE FROM schema_registry WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
            )
        })?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Schema not found" })),
        ));
    }

    Ok(Json(json!({
        "success": true,
        "code": 200,
        "message": "Schema deleted successfully",
    })))
}

// ============ 动态数据 CRUD ============

#[utoipa::path(
    post,
    path = "/api/master-data/schema-registry/schemas/{schemaId}/data",
    tag = "Schema Registry",
    params(("schemaId" = Uuid, Path, description = "Schema ID")),
    request_body = Value,
    responses((status = 200, description = "创建动态数据记录"))
)]
pub async fn create_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(data): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let schema = get_schema_def(&state.db, id).await?;
    let record_id = Uuid::new_v4();

    // 使用 JSONB 存储动态数据
    sqlx::query(
        r#"
        INSERT INTO dynamic_data (id, schema_id, data_json)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(record_id)
    .bind(id)
    .bind(&data)
    .execute(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Failed to create data: {}", e) })),
        )
    })?;

    Ok(Json(json!({
        "success": true,
        "code": 201,
        "data": {
            "id": record_id,
            "schema_id": id,
            "schema_name": schema.name,
            "data": data,
        }
    })))
}

#[utoipa::path(
    get,
    path = "/api/master-data/schema-registry/schemas/{schemaId}/data",
    tag = "Schema Registry",
    params(
        ("schemaId" = Uuid, Path, description = "Schema ID"),
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键字")
    ),
    responses((status = 200, description = "查询动态数据记录列表"))
)]
pub async fn list_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<ListDataQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let schema = get_schema_def(&state.db, id).await?;
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let records: Vec<(Uuid, Uuid, Value, DateTime<Utc>, DateTime<Utc>)> = sqlx::query_as(
        r#"
        SELECT id, schema_id, data_json, created_at, updated_at
        FROM dynamic_data
        WHERE schema_id = $1
          AND ($2::text IS NULL OR data_json::text ILIKE '%' || $2 || '%')
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(id)
    .bind(&q.search)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
        )
    })?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM dynamic_data
        WHERE schema_id = $1
          AND ($2::text IS NULL OR data_json::text ILIKE '%' || $2 || '%')
        "#,
    )
    .bind(id)
    .bind(&q.search)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let items: Vec<Value> = records
        .into_iter()
        .map(|(id, schema_id, data, created_at, updated_at)| {
            json!({
                "id": id,
                "schema_id": schema_id,
                "data": data,
                "created_at": created_at,
                "updated_at": updated_at,
            })
        })
        .collect();

    Ok(Json(json!({
        "success": true,
        "code": 200,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) / page_size,
            "schema": {
                "id": schema.id,
                "name": schema.name,
                "title": schema.title,
            }
        }
    })))
}

#[utoipa::path(
    get,
    path = "/api/master-data/schema-registry/schemas/{schemaId}/data/{recordId}",
    tag = "Schema Registry",
    params(
        ("schemaId" = Uuid, Path, description = "Schema ID"),
        ("recordId" = Uuid, Path, description = "记录 ID")
    ),
    responses((status = 200, description = "获取动态数据记录"))
)]
pub async fn get_data(
    State(state): State<AppState>,
    Path((id, record_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let record: Option<(Uuid, Uuid, Value, DateTime<Utc>, DateTime<Utc>)> = sqlx::query_as(
        r#"
        SELECT id, schema_id, data_json, created_at, updated_at
        FROM dynamic_data
        WHERE id = $1 AND schema_id = $2
        "#,
    )
    .bind(record_id)
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
        )
    })?;

    match record {
        Some((id, schema_id, data, created_at, updated_at)) => Ok(Json(json!({
            "success": true,
            "code": 200,
            "data": {
                "id": id,
                "schema_id": schema_id,
                "data": data,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Record not found" })),
        )),
    }
}

#[utoipa::path(
    put,
    path = "/api/master-data/schema-registry/schemas/{schemaId}/data/{recordId}",
    tag = "Schema Registry",
    params(
        ("schemaId" = Uuid, Path, description = "Schema ID"),
        ("recordId" = Uuid, Path, description = "记录 ID")
    ),
    request_body = Value,
    responses((status = 200, description = "更新动态数据记录"))
)]
pub async fn update_data(
    State(state): State<AppState>,
    Path((id, record_id)): Path<(Uuid, Uuid)>,
    Json(data): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let result = sqlx::query(
        r#"
        UPDATE dynamic_data
        SET data_json = $3, updated_at = NOW()
        WHERE id = $1 AND schema_id = $2
        "#,
    )
    .bind(record_id)
    .bind(id)
    .bind(&data)
    .execute(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
        )
    })?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Record not found" })),
        ));
    }

    Ok(Json(json!({
        "success": true,
        "code": 200,
        "data": {
            "id": record_id,
            "schema_id": id,
            "data": data,
        }
    })))
}

#[utoipa::path(
    delete,
    path = "/api/master-data/schema-registry/schemas/{schemaId}/data/{recordId}",
    tag = "Schema Registry",
    params(
        ("schemaId" = Uuid, Path, description = "Schema ID"),
        ("recordId" = Uuid, Path, description = "记录 ID")
    ),
    responses((status = 200, description = "删除动态数据记录"))
)]
pub async fn delete_data(
    State(state): State<AppState>,
    Path((id, record_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let result = sqlx::query("DELETE FROM dynamic_data WHERE id = $1 AND schema_id = $2")
        .bind(record_id)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
            )
        })?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Record not found" })),
        ));
    }

    Ok(Json(json!({
        "success": true,
        "code": 200,
        "message": "Record deleted successfully",
    })))
}

// ============ 辅助函数 ============

async fn get_schema_def(
    pool: &PgPool,
    id: Uuid,
) -> Result<SchemaDefinition, (StatusCode, Json<Value>)> {
    sqlx::query_as::<_, SchemaDefinition>("id, name, code, schema_type, version, description, definition, is_active, created_by, created_at, updated_at FROM schema_registry WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "message": format!("Database error: {}", e) })),
            )
        })?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Schema not found" })),
        ))
}

/// 根据 Schema JSON 动态创建数据表
async fn create_dynamic_table(
    pool: &PgPool,
    table_name: &str,
    schema_json: &Value,
) -> Result<(), sqlx::Error> {
    let fields = schema_json
        .get("fields")
        .and_then(|f| f.as_array())
        .ok_or_else(|| sqlx::Error::Configuration("Schema JSON missing 'fields' array".into()))?;

    // 构建 CREATE TABLE 语句
    let mut columns = vec!["id UUID PRIMARY KEY DEFAULT gen_random_uuid()".to_string()];

    for field in fields {
        let name = field
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("unknown");
        let field_type = field.get("type").and_then(|t| t.as_str()).unwrap_or("text");

        let sql_type = match field_type {
            "number" | "integer" => "NUMERIC",
            "boolean" | "switch" => "BOOLEAN",
            "date" | "datetime" => "TIMESTAMPTZ",
            "select" => "TEXT",
            "textarea" => "TEXT",
            _ => "TEXT",
        };

        let required = field
            .get("required")
            .and_then(|r| r.as_bool())
            .unwrap_or(false);
        let nullable = if required { " NOT NULL" } else { "" };

        columns.push(format!("\"{}\" {}{}", name, sql_type, nullable));
    }

    columns.push("created_at TIMESTAMPTZ DEFAULT NOW()".to_string());
    columns.push("updated_at TIMESTAMPTZ DEFAULT NOW()".to_string());

    let sql = format!(
        "CREATE TABLE IF NOT EXISTS {} ({})",
        table_name,
        columns.join(", ")
    );

    sqlx::query(&sql).execute(pool).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- validate_field_type: text/string ----------

    #[test]
    fn test_validate_text_non_empty() {
        assert!(validate_field_type("hello", "text"));
        assert!(validate_field_type("hello", "string"));
        assert!(validate_field_type("任意内容", "textarea"));
    }

    #[test]
    fn test_validate_text_empty_fails() {
        assert!(!validate_field_type("", "text"));
        assert!(!validate_field_type("", "string"));
        assert!(!validate_field_type("", "textarea"));
    }

    #[test]
    fn test_validate_text_with_whitespace() {
        // 含空格但非空的字符串应通过
        assert!(validate_field_type("  ", "text"));
        assert!(validate_field_type("a b", "string"));
    }

    // ---------- validate_field_type: number/float ----------

    #[test]
    fn test_validate_number_valid() {
        assert!(validate_field_type("3.14", "number"));
        assert!(validate_field_type("3.14", "float"));
        assert!(validate_field_type("-100.5", "number"));
        assert!(validate_field_type("0", "float"));
        assert!(validate_field_type("1e10", "number"));
    }

    #[test]
    fn test_validate_number_invalid() {
        assert!(!validate_field_type("abc", "number"));
        assert!(!validate_field_type("", "float"));
        assert!(!validate_field_type("12.34.56", "number"));
    }

    // ---------- validate_field_type: integer/int ----------

    #[test]
    fn test_validate_integer_valid() {
        assert!(validate_field_type("42", "integer"));
        assert!(validate_field_type("42", "int"));
        assert!(validate_field_type("42", "long"));
        assert!(validate_field_type("-100", "integer"));
        assert!(validate_field_type("0", "int"));
    }

    #[test]
    fn test_validate_integer_rejects_float() {
        // 整数类型不应接受小数
        assert!(!validate_field_type("3.14", "integer"));
        assert!(!validate_field_type("3.14", "int"));
    }

    #[test]
    fn test_validate_integer_invalid() {
        assert!(!validate_field_type("abc", "integer"));
        assert!(!validate_field_type("", "int"));
        assert!(!validate_field_type("12abc", "long"));
    }

    // ---------- validate_field_type: boolean/bool ----------

    #[test]
    fn test_validate_boolean_valid() {
        assert!(validate_field_type("true", "boolean"));
        assert!(validate_field_type("false", "boolean"));
        assert!(validate_field_type("TRUE", "bool"));
        assert!(validate_field_type("FALSE", "bool"));
        assert!(validate_field_type("True", "switch"));
    }

    #[test]
    fn test_validate_boolean_invalid() {
        assert!(!validate_field_type("yes", "boolean"));
        assert!(!validate_field_type("1", "bool"));
        assert!(!validate_field_type("0", "bool"));
        assert!(!validate_field_type("", "switch"));
    }

    // ---------- validate_field_type: date ----------

    #[test]
    fn test_validate_date_valid() {
        assert!(validate_field_type("2024-01-01", "date"));
        assert!(validate_field_type("2024-12-31", "date"));
        assert!(validate_field_type("1999-06-15", "date"));
    }

    #[test]
    fn test_validate_date_invalid() {
        assert!(!validate_field_type("2024-13-01", "date")); // 月>12
        assert!(!validate_field_type("2024-00-01", "date")); // 月=0
        assert!(!validate_field_type("2024-01-32", "date")); // 日>31
        assert!(!validate_field_type("2024-1-1", "date")); // 不足位
        assert!(!validate_field_type("not-a-date", "date"));
        assert!(!validate_field_type("", "date"));
    }

    // ---------- validate_field_type: datetime ----------

    #[test]
    fn test_validate_datetime_valid() {
        assert!(validate_field_type("2024-01-01T12:00:00", "datetime"));
        assert!(validate_field_type("2024-01-01 12:00:00", "datetime"));
        assert!(validate_field_type("2024-01-01 12:00", "datetime"));
        assert!(validate_field_type("2024-01-01", "datetime")); // 仅日期也接受
    }

    #[test]
    fn test_validate_datetime_invalid() {
        assert!(!validate_field_type("2024-01-01T25:00:00", "datetime")); // 时>23
        assert!(!validate_field_type("2024-01-01T12:60:00", "datetime")); // 分>59
        assert!(!validate_field_type("2024-01-01T12:00:99", "datetime")); // 秒>59
        assert!(!validate_field_type("2024-13-01T12:00:00", "datetime")); // 日期无效
    }

    // ---------- validate_field_type: 未知类型 ----------

    #[test]
    fn test_validate_unknown_type_returns_false() {
        // 未知类型默认返回 false
        assert!(!validate_field_type("hello", "unknown_type"));
        assert!(!validate_field_type("hello", ""));
        assert!(!validate_field_type("hello", "binary"));
    }

    #[test]
    fn test_validate_type_is_case_insensitive() {
        // 类型名称大小写不敏感
        assert!(validate_field_type("42", "INTEGER"));
        assert!(validate_field_type("42", "Integer"));
        assert!(validate_field_type("3.14", "NUMBER"));
        assert!(validate_field_type("true", "Boolean"));
    }

    // ---------- is_valid_date / is_valid_datetime（内部函数） ----------

    #[test]
    fn test_is_valid_date_boundary() {
        assert!(is_valid_date("0001-01-01"));
        assert!(is_valid_date("9999-12-31"));
        assert!(!is_valid_date("0000-01-01")); // 年=0
        assert!(!is_valid_date("2024-01-00")); // 日=0
    }

    #[test]
    fn test_is_valid_datetime_time_only_with_t_separator() {
        assert!(is_valid_datetime("2024-01-01T00:00:00"));
        assert!(is_valid_datetime("2024-01-01T23:59:59"));
        assert!(!is_valid_datetime("2024-01-01T24:00:00"));
    }
}
