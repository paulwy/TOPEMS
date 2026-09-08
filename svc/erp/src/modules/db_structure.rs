use super::ApiState;
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;
fn escape_sql_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}
use crate::models::{ColumnInfo, DbChange, TableInfo};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};
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
        .route("/db/tables", get(list_tables))
        .route("/db/tables/{name}", get(get_table_detail))
        .route("/db/columns/preview", post(preview_add_column))
        .route("/db/columns", post(execute_add_column))
        .route(
            "/db/columns/{table}/{column}",
            put(execute_modify_column).delete(execute_drop_column),
        )
        .route("/db/changes", get(list_db_changes))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/db/tables",
    tag = "ERP",
    responses((status = 200, description = "获取数据库表列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_tables(
    State(state): State<ApiState>,
    Query(params): Query<TableQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<TableInfo>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let schema = params.schema.unwrap_or_else(|| "public".to_string());
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let result = sqlx::query_as::<_, TableInfo>(only_own_schema_query!(
        "erp",
        r#"
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = $1
          AND ($2::text IS NULL OR table_name ILIKE $2)
        ORDER BY table_name
        "#
    ))
    .bind(&schema)
    .bind(&search_pattern)
    .fetch_all(&mut **txn)
    .await;
    match result {
        Ok(tables) => Json(ApiResponse::success(tables, "获取表列表成功")),
        Err(e) => {
            tracing::error!("获取表列表失败: {}", e);
            Json(api_error(500, "获取表列表失败"))
        }
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/db/tables/{tableName}",
    tag = "ERP",
    params(("tableName" = String, Path, description = "表名")),
    responses((status = 200, description = "获取数据库表详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_table_detail(
    State(state): State<ApiState>,
    Path(table_name): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<TableDetail>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let columns_result = sqlx::query_as::<_, ColumnInfo>(only_own_schema_query!(
        "erp",
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
        "#
    ))
    .bind(&table_name)
    .fetch_all(&mut **txn)
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
    let row_count = sqlx::query_scalar(
        only_own_schema_query!("erp", r#"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1"#),
    )
    .bind(&table_name)
    .fetch_one(&mut **txn)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/db-structure/preview-add-column",
    tag = "DbStructure",
    operation_id = "preview_add_column",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn preview_add_column(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<crate::models::AddColumnRequest>,
) -> Json<ApiResponse<SqlPreview>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
        "ALTER TABLE {} ADD COLUMN {} {} {} {}",
        escape_sql_identifier(&req.table_name),
        escape_sql_identifier(&column.column_name),
        data_type,
        null_clause,
        default_clause
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/db-structure/execute-add-column",
    tag = "DbStructure",
    operation_id = "execute_add_column",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn execute_add_column(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<crate::models::AddColumnRequest>,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
        "ALTER TABLE {} ADD COLUMN {} {} {} {}",
        escape_sql_identifier(&req.table_name),
        escape_sql_identifier(&column.column_name),
        data_type,
        null_clause,
        default_clause
    );
    let id = Uuid::new_v4();
    let now = Utc::now();
    let new_definition = serde_json::to_value(column).ok();
    let result = sqlx::query(&sql).execute(&mut **txn).await;
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
        only_own_schema_query!("erp", r#"
        INSERT INTO sys_db_changes (id, change_type, table_name, column_name, new_definition, sql_statement, executed_by, executed_at)
        VALUES ($1, 'add_column', $2, $3, $4, $5, $6, $7)
        "#),
    )
    .bind(id)
    .bind(&req.table_name)
    .bind(&column.column_name)
    .bind(&new_definition)
    .bind(&sql)
    .bind(extract_user_from_headers(&headers))
    .bind(now)
    .execute(&mut **txn)
    .await;
    let is_success = status == "success";
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
    if is_success {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "事务提交失败"));
            }
        }
    }
    response
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/db-structure/execute-modify-column",
    tag = "DbStructure",
    operation_id = "execute_modify_column",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn execute_modify_column(
    State(state): State<ApiState>,
    Path((table_name, column_name)): Path<(String, String)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<crate::models::ModifyColumnRequest>,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
        "ALTER TABLE {} ALTER COLUMN {} TYPE {}, ALTER COLUMN {} SET {}, ALTER COLUMN {} {}",
        escape_sql_identifier(&table_name),
        escape_sql_identifier(&column_name),
        data_type,
        escape_sql_identifier(&column_name),
        if default_clause.is_empty() {
            "DEFAULT NULL".to_string()
        } else {
            default_clause
        },
        escape_sql_identifier(&column_name),
        null_clause
    );
    let id = Uuid::new_v4();
    let now = Utc::now();
    let new_definition = serde_json::to_value(column).ok();
    let result = sqlx::query(&sql).execute(&mut **txn).await;
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
        only_own_schema_query!("erp", r#"
        INSERT INTO sys_db_changes (id, change_type, table_name, column_name, new_definition, sql_statement, executed_by, executed_at)
        VALUES ($1, 'modify_column', $2, $3, $4, $5, $6, $7)
        "#),
    )
    .bind(id)
    .bind(&table_name)
    .bind(&column_name)
    .bind(&new_definition)
    .bind(&sql)
    .bind(extract_user_from_headers(&headers))
    .bind(now)
    .execute(&mut **txn)
    .await;
    let is_success = status == "success";
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
    if is_success {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "事务提交失败"));
            }
        }
    }
    response
}
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/db-structure/execute-drop-column",
    tag = "DbStructure",
    operation_id = "execute_drop_column",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn execute_drop_column(
    State(state): State<ApiState>,
    Path((table_name, column_name)): Path<(String, String)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let sql = format!(
        "ALTER TABLE \"{}\" DROP COLUMN \"{}\"",
        table_name, column_name
    );
    let id = Uuid::new_v4();
    let now = Utc::now();
    let result = sqlx::query(&sql).execute(&mut **txn).await;
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
        only_own_schema_query!("erp", r#"
        INSERT INTO sys_db_changes (id, change_type, table_name, column_name, sql_statement, executed_by, executed_at)
        VALUES ($1, 'drop_column', $2, $3, $4, $5, $6)
        "#),
    )
    .bind(id)
    .bind(&table_name)
    .bind(&column_name)
    .bind(&sql)
    .bind(extract_user_from_headers(&headers))
    .bind(now)
    .execute(&mut **txn)
    .await;
    let is_success = status_str == "success";
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
    if is_success {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "事务提交失败"));
            }
        }
    }
    response
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/db/changes",
    tag = "ERP",
    responses((status = 200, description = "获取数据库变更列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_db_changes(
    State(state): State<ApiState>,
    Query(params): Query<DbChangeQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<DbChange>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let table_filter = params.table_name.clone();
    let result = sqlx::query_as::<_, DbChange>(
        only_own_schema_query!("erp", r#"
        SELECT id, change_type, table_name, column_name, old_definition, new_definition, sql_statement, executed_by, executed_at, backup_data
        FROM sys_db_changes
        WHERE ($1::text IS NULL OR table_name = $1)
        ORDER BY executed_at DESC
        LIMIT $2 OFFSET $3
        "#),
    )
    .bind(&table_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;
    match result {
        Ok(changes) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "erp",
                r#"
                SELECT COUNT(*) FROM sys_db_changes
                WHERE ($1::text IS NULL OR table_name = $1)
                "#
            ))
            .bind(&table_filter)
            .fetch_one(&mut **txn)
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
#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;
    // --- escape_sql_identifier ---
    #[test]
    fn test_escape_sql_identifier_simple() {
        assert_eq!(escape_sql_identifier("users"), "\"users\"");
        assert_eq!(escape_sql_identifier("my_table"), "\"my_table\"");
    }
    #[test]
    fn test_escape_sql_identifier_empty() {
        assert_eq!(escape_sql_identifier(""), "\"\"");
    }
    #[test]
    fn test_escape_sql_identifier_escapes_quotes() {
        // Embedded double quotes are doubled
        assert_eq!(escape_sql_identifier("my\"table"), "\"my\"\"table\"");
        assert_eq!(escape_sql_identifier("a\"b\"c"), "\"a\"\"b\"\"c\"");
    }
    #[test]
    fn test_escape_sql_identifier_special_chars() {
        // Special characters are preserved inside quotes
        assert_eq!(escape_sql_identifier("my-table"), "\"my-table\"");
        assert_eq!(escape_sql_identifier("my.table"), "\"my.table\"");
        assert_eq!(escape_sql_identifier("schema.table"), "\"schema.table\"");
    }
    // --- build_data_type ---
    #[test]
    fn test_build_data_type_varchar_with_length() {
        assert_eq!(
            build_data_type("varchar", Some(255), None, None),
            "VARCHAR(255)"
        );
    }
    #[test]
    fn test_build_data_type_varchar_no_length() {
        assert_eq!(build_data_type("varchar", None, None, None), "VARCHAR");
    }
    #[test]
    fn test_build_data_type_character_varying_alias() {
        assert_eq!(
            build_data_type("character varying", Some(100), None, None),
            "VARCHAR(100)"
        );
    }
    #[test]
    fn test_build_data_type_varchar_case_insensitive() {
        assert_eq!(
            build_data_type("VARCHAR", Some(50), None, None),
            "VARCHAR(50)"
        );
        assert_eq!(build_data_type("VarChar", None, None, None), "VARCHAR");
    }
    #[test]
    fn test_build_data_type_char_with_length() {
        assert_eq!(build_data_type("char", Some(10), None, None), "CHAR(10)");
    }
    #[test]
    fn test_build_data_type_char_default_length() {
        // char with no length defaults to CHAR(1)
        assert_eq!(build_data_type("char", None, None, None), "CHAR(1)");
    }
    #[test]
    fn test_build_data_type_character_alias() {
        assert_eq!(build_data_type("character", Some(5), None, None), "CHAR(5)");
        assert_eq!(build_data_type("character", None, None, None), "CHAR(1)");
    }
    #[test]
    fn test_build_data_type_numeric_with_precision_and_scale() {
        assert_eq!(
            build_data_type("numeric", None, Some(10), Some(2)),
            "NUMERIC(10, 2)"
        );
    }
    #[test]
    fn test_build_data_type_numeric_precision_only() {
        assert_eq!(
            build_data_type("numeric", None, Some(10), None),
            "NUMERIC(10)"
        );
    }
    #[test]
    fn test_build_data_type_numeric_bare() {
        assert_eq!(build_data_type("numeric", None, None, None), "NUMERIC");
    }
    #[test]
    fn test_build_data_type_decimal_alias() {
        assert_eq!(
            build_data_type("decimal", None, Some(8), Some(3)),
            "NUMERIC(8, 3)"
        );
        assert_eq!(build_data_type("decimal", None, None, None), "NUMERIC");
    }
    #[test]
    fn test_build_data_type_other_uppercased() {
        assert_eq!(build_data_type("integer", None, None, None), "INTEGER");
        assert_eq!(build_data_type("text", None, None, None), "TEXT");
        assert_eq!(build_data_type("boolean", None, None, None), "BOOLEAN");
        assert_eq!(build_data_type("uuid", None, None, None), "UUID");
        assert_eq!(build_data_type("timestamp", None, None, None), "TIMESTAMP");
    }
    #[test]
    fn test_build_data_type_other_case_insensitive() {
        assert_eq!(build_data_type("INTEGER", None, None, None), "INTEGER");
        assert_eq!(build_data_type("Text", None, None, None), "TEXT");
    }
    // --- extract_user_from_headers ---
    #[test]
    fn test_extract_user_from_headers_present() {
        let mut headers = HeaderMap::new();
        headers.insert("x-user-id", HeaderValue::from_static("user-123"));
        assert_eq!(
            extract_user_from_headers(&headers),
            Some("user-123".to_string())
        );
    }
    #[test]
    fn test_extract_user_from_headers_missing() {
        let headers = HeaderMap::new();
        assert_eq!(extract_user_from_headers(&headers), None);
    }
    #[test]
    fn test_extract_user_from_headers_empty_value() {
        let mut headers = HeaderMap::new();
        headers.insert("x-user-id", HeaderValue::from_static(""));
        // Empty string still converts to Some("")
        assert_eq!(extract_user_from_headers(&headers), Some("".to_string()));
    }
    #[test]
    fn test_extract_user_from_headers_different_case_not_found() {
        // HeaderMap is case-insensitive, so "X-User-Id" should match "x-user-id"
        let mut headers = HeaderMap::new();
        headers.insert("X-USER-ID", HeaderValue::from_static("u1"));
        assert_eq!(extract_user_from_headers(&headers), Some("u1".to_string()));
    }
    #[test]
    fn test_extract_user_from_headers_non_ascii_returns_none() {
        let mut headers = HeaderMap::new();
        // Non-ASCII bytes cannot be converted to_str
        let val = HeaderValue::from_bytes(b"\xff\xfe").unwrap();
        headers.insert("x-user-id", val);
        assert_eq!(extract_user_from_headers(&headers), None);
    }
}
