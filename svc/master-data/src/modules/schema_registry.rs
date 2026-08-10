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
