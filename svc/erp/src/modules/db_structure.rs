use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::models::{ColumnInfo, DbChange, TableInfo};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct TableQueryParams {
    pub schema: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DbChangeQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub table_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SqlPreview {
    pub sql: String,
    pub warning: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TableDetail {
    pub table_name: String,
    pub schema_name: String,
    pub columns: Vec<ColumnInfo>,
    pub row_count: Option<i64>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/erp/db/tables", get(list_tables))
        .route("/api/erp/db/tables/{name}", get(get_table_detail))
        .route("/api/erp/db/columns/preview", post(preview_add_column))
        .route("/api/erp/db/columns", post(execute_add_column))
        .route(
            "/api/erp/db/columns/{table}/{column}",
            put(execute_modify_column).delete(execute_drop_column),
        )
        .route("/api/erp/db/changes", get(list_db_changes))
}

async fn list_tables(
    State(state): State<ApiState>,
    Query(params): Query<TableQueryParams>,
) -> Json<ApiResponse<Vec<TableInfo>>> {
    let schema = params.schema.unwrap_or_else(|| "public".to_string());
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, TableInfo>(
        r#"
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = $1
          AND ($2::text IS NULL OR table_name ILIKE $2)
        ORDER BY table_name
        "#,
    )
    .bind(&schema)
    .bind(&search_pattern)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(tables) => Json(ApiResponse::success(tables, "获取表列表成功")),
        Err(e) => {
            tracing::error!("获取表列表失败: {}", e);
            Json(api_error(500, "获取表列表失败"))
        }
    }
}

async fn get_table_detail(
    State(state): State<ApiState>,
    Path(table_name): Path<String>,
) -> Json<ApiResponse<TableDetail>> {
    let columns_result = sqlx::query_as::<_, ColumnInfo>(
        r#"
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
        "#,
    )
    .bind(&table_name)
    .fetch_all(&state.db)
    .await;

    let columns = match columns_result {
        Ok(cols) => cols,
        Err(e) => {
            tracing::error!("获取表结构失败: {}", e);
            return Json(api_error(500, "获取表结构失败"));
        }
    };

    if columns.is_empty() {
        return Json(api_error(404, "表不存在"));
    }

    let row_count = sqlx::query_scalar(&format!("SELECT COUNT(*) FROM \"{}\"", table_name))
        .fetch_one(&state.db)
        .await
        .ok();

    let detail = TableDetail {
        table_name: table_name.clone(),
        schema_name: "public".to_string(),
        columns,
        row_count,
    };

    Json(ApiResponse::success(detail, "获取表详情成功"))
}

async fn preview_add_column(
    State(_state): State<ApiState>,
    Json(req): Json<crate::models::AddColumnRequest>,
) -> Json<ApiResponse<SqlPreview>> {
    let column = &req.column;

    let data_type = build_data_type(
        &column.data_type,
        column.max_length,
        column.numeric_precision,
        column.numeric_scale,
    );

    let null_clause = if column.is_nullable {
        "NULL"
    } else {
        "NOT NULL"
    };

    let default_clause = match &column.default_value {
        Some(default) => format!("DEFAULT {}", default),
        None => String::new(),
    };

    let sql = format!(
        "ALTER TABLE \"{}\" ADD COLUMN \"{}\" {} {} {}",
        req.table_name, column.column_name, data_type, null_clause, default_clause
    );

    let warning = if !column.is_nullable && column.default_value.is_none() {
        Some("警告：添加非空且无默认值的列可能导致现有数据行出错".to_string())
    } else {
        None
    };

    Json(ApiResponse::success(
        SqlPreview { sql, warning },
        "SQL预览生成成功",
    ))
}

fn build_data_type(
    base_type: &str,
    max_length: Option<i32>,
    precision: Option<i32>,
    scale: Option<i32>,
) -> String {
    match base_type.to_lowercase().as_str() {
        "varchar" | "character varying" => match max_length {
            Some(len) => format!("VARCHAR({})", len),
            None => "VARCHAR".to_string(),
        },
        "char" | "character" => match max_length {
            Some(len) => format!("CHAR({})", len),
            None => "CHAR(1)".to_string(),
        },
        "numeric" | "decimal" => match (precision, scale) {
            (Some(p), Some(s)) => format!("NUMERIC({}, {})", p, s),
            (Some(p), None) => format!("NUMERIC({})", p),
            _ => "NUMERIC".to_string(),
        },
        _ => base_type.to_uppercase(),
    }
}

async fn execute_add_column(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<crate::models::AddColumnRequest>,
) -> Json<ApiResponse<String>> {
    let column = &req.column;

    let data_type = build_data_type(
        &column.data_type,
        column.max_length,
        column.numeric_precision,
        column.numeric_scale,
    );

    let null_clause = if column.is_nullable {
        "NULL"
    } else {
        "NOT NULL"
    };

    let default_clause = match &column.default_value {
        Some(default) => format!("DEFAULT {}", default),
        None => String::new(),
    };

    let sql = format!(
        "ALTER TABLE \"{}\" ADD COLUMN \"{}\" {} {} {}",
        req.table_name, column.column_name, data_type, null_clause, default_clause
    );

    let id = Uuid::new_v4();
    let now = Utc::now();

    let new_definition = serde_json::to_value(column).ok();

    let result = sqlx::query(&sql).execute(&state.db).await;

    let (response, status, error_msg) = match &result {
        Ok(_) => (
            Json(ApiResponse::success(sql.clone(), "字段添加成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("添加字段失败: {}", e);
            (
                Json(api_error(500, &format!("添加字段失败: {}", e))),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let _ = sqlx::query(
        r#"
        INSERT INTO sys_db_changes (id, change_type, table_name, column_name, new_definition, sql_statement, executed_by, executed_at)
        VALUES ($1, 'add_column', $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(id)
    .bind(&req.table_name)
    .bind(&column.column_name)
    .bind(&new_definition)
    .bind(&sql)
    .bind(extract_user_from_headers(&headers))
    .bind(now)
    .execute(&state.db)
    .await;

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "db_change".to_string(),
            entity_type: "add_column".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: serde_json::to_value(&req).ok(),
            response_details: Some(serde_json::json!({ "sql": sql })),
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn execute_modify_column(
    State(state): State<ApiState>,
    Path((table_name, column_name)): Path<(String, String)>,
    headers: HeaderMap,
    Json(req): Json<crate::models::ModifyColumnRequest>,
) -> Json<ApiResponse<String>> {
    let column = &req.column;

    let data_type = build_data_type(
        &column.data_type,
        column.max_length,
        column.numeric_precision,
        column.numeric_scale,
    );

    let null_clause = if column.is_nullable {
        "NULL"
    } else {
        "NOT NULL"
    };

    let default_clause = match &column.default_value {
        Some(default) => format!("DEFAULT {}", default),
        None => String::new(),
    };

    let sql = format!(
        "ALTER TABLE \"{}\" ALTER COLUMN \"{}\" TYPE {}, ALTER COLUMN \"{}\" SET {}, ALTER COLUMN \"{}\" {}",
        table_name,
        column_name,
        data_type,
        column_name,
        if default_clause.is_empty() { "DEFAULT NULL".to_string() } else { default_clause },
        column_name,
        null_clause
    );

    let id = Uuid::new_v4();
    let now = Utc::now();

    let new_definition = serde_json::to_value(column).ok();

    let result = sqlx::query(&sql).execute(&state.db).await;

    let (response, status, error_msg) = match &result {
        Ok(_) => (
            Json(ApiResponse::success(sql.clone(), "字段修改成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("修改字段失败: {}", e);
            (
                Json(api_error(500, &format!("修改字段失败: {}", e))),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let _ = sqlx::query(
        r#"
        INSERT INTO sys_db_changes (id, change_type, table_name, column_name, new_definition, sql_statement, executed_by, executed_at)
        VALUES ($1, 'modify_column', $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(id)
    .bind(&table_name)
    .bind(&column_name)
    .bind(&new_definition)
    .bind(&sql)
    .bind(extract_user_from_headers(&headers))
    .bind(now)
    .execute(&state.db)
    .await;

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "db_change".to_string(),
            entity_type: "modify_column".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: serde_json::to_value(&req).ok(),
            response_details: Some(serde_json::json!({ "sql": sql })),
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn execute_drop_column(
    State(state): State<ApiState>,
    Path((table_name, column_name)): Path<(String, String)>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let sql = format!(
        "ALTER TABLE \"{}\" DROP COLUMN \"{}\"",
        table_name, column_name
    );

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(&sql).execute(&state.db).await;

    let (response, status_str, error_msg) = match &result {
        Ok(_) => (
            Json(ApiResponse::success(sql.clone(), "字段删除成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("删除字段失败: {}", e);
            (
                Json(api_error(500, &format!("删除字段失败: {}", e))),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let _ = sqlx::query(
        r#"
        INSERT INTO sys_db_changes (id, change_type, table_name, column_name, sql_statement, executed_by, executed_at)
        VALUES ($1, 'drop_column', $2, $3, $4, $5, $6)
        "#,
    )
    .bind(id)
    .bind(&table_name)
    .bind(&column_name)
    .bind(&sql)
    .bind(extract_user_from_headers(&headers))
    .bind(now)
    .execute(&state.db)
    .await;

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "db_change".to_string(),
            entity_type: "drop_column".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: Some(serde_json::json!({ "sql": sql })),
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn list_db_changes(
    State(state): State<ApiState>,
    Query(params): Query<DbChangeQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<DbChange>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let table_filter = params.table_name.clone();

    let result = sqlx::query_as::<_, DbChange>(
        r#"
        SELECT id, change_type, table_name, column_name, old_definition, new_definition, sql_statement, executed_by, executed_at, backup_data
        FROM sys_db_changes
        WHERE ($1::text IS NULL OR table_name = $1)
        ORDER BY executed_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&table_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(changes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM sys_db_changes
                WHERE ($1::text IS NULL OR table_name = $1)
                "#,
            )
            .bind(&table_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(changes, total, page, page_size),
                "获取数据库变更历史成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取数据库变更历史失败: {}", e);
            Json(api_error(500, "获取数据库变更历史失败"))
        }
    }
}

fn extract_user_from_headers(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}
