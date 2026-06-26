use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::{info, warn};

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreatePermissionRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub table_name: String,
    pub rule_type: String,
    pub condition: serde_json::Value,
    pub role_ids: Option<Vec<String>>,
    pub user_ids: Option<Vec<String>>,
    pub is_active: Option<bool>,
    pub created_by: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePermissionRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub condition: Option<serde_json::Value>,
    pub role_ids: Option<Vec<String>>,
    pub user_ids: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PermissionRuleResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub table_name: String,
    pub rule_type: String,
    pub condition: serde_json::Value,
    pub role_ids: Option<Vec<String>>,
    pub user_ids: Option<Vec<String>>,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct PermissionRuleListResponse {
    pub items: Vec<PermissionRuleResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct ValidatePermissionRequest {
    pub datasource_id: Uuid,
    pub table_name: String,
    pub user_id: String,
    pub role_ids: Option<Vec<String>>,
    pub query: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PermissionValidationResponse {
    pub is_allowed: bool,
    pub user_id: String,
    pub datasource_id: Uuid,
    pub table_name: String,
    pub applicable_rules: Vec<Uuid>,
    pub filter_condition: Option<String>,
    pub filtered_columns: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct FilterDataRequest {
    pub datasource_id: Uuid,
    pub table_name: String,
    pub user_id: String,
    pub role_ids: Option<Vec<String>>,
    pub columns: Option<Vec<String>>,
    pub filters: Option<serde_json::Value>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct FilteredDataResponse {
    pub datasource_id: Uuid,
    pub table_name: String,
    pub user_id: String,
    pub data: Vec<serde_json::Value>,
    pub applied_filters: Vec<String>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_permission_rules(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    info!("Listing row-level permission rules");

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, table_name, rule_type, condition, 
               role_ids, user_ids, is_active, created_by, created_at, updated_at
        FROM analytics_row_level_permissions
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list permission rules: {}", e)
            }));
        }
    };

    let items: Vec<PermissionRuleResponse> = rows
        .into_iter()
        .map(|row| PermissionRuleResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            datasource_id: row.datasource_id,
            table_name: row.table_name,
            rule_type: row.rule_type,
            condition: row.condition.unwrap_or(serde_json::json!({})),
            role_ids: row.role_ids,
            user_ids: row.user_ids,
            is_active: row.is_active.unwrap_or(true),
            created_by: row.created_by,
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List permission rules",
        "data": PermissionRuleListResponse {
            items,
            total,
        }
    }))
}

pub async fn create_permission_rule(
    State(state): State<AppState>,
    Json(req): Json<CreatePermissionRuleRequest>,
) -> Json<serde_json::Value> {
    info!("Creating permission rule: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_row_level_permissions 
        (id, name, description, datasource_id, table_name, rule_type, condition, 
         role_ids, user_ids, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, name, description, datasource_id, table_name, rule_type, condition,
                  role_ids, user_ids, is_active, created_by, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.datasource_id,
        req.table_name,
        req.rule_type,
        req.condition,
        req.role_ids.as_deref(),
        req.user_ids.as_deref(),
        req.is_active.unwrap_or(true),
        req.created_by,
        now,
        now,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
            "success": true,
            "message": "Create permission rule",
            "data": PermissionRuleResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                datasource_id: row.datasource_id,
                table_name: row.table_name,
                rule_type: row.rule_type,
                condition: row.condition.unwrap_or(serde_json::json!({})),
                role_ids: row.role_ids,
                user_ids: row.user_ids,
                is_active: row.is_active.unwrap_or(true),
                created_by: row.created_by,
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to create permission rule: {}", e)
        })),
    }
}

pub async fn get_permission_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting permission rule: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, table_name, rule_type, condition,
               role_ids, user_ids, is_active, created_by, created_at, updated_at
        FROM analytics_row_level_permissions
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get permission rule: {}", e)
            }));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
            "success": true,
            "message": "Get permission rule",
            "data": PermissionRuleResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                datasource_id: row.datasource_id,
                table_name: row.table_name,
                rule_type: row.rule_type,
                condition: row.condition.unwrap_or(serde_json::json!({})),
                role_ids: row.role_ids,
                user_ids: row.user_ids,
                is_active: row.is_active.unwrap_or(true),
                created_by: row.created_by,
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        None => Json(serde_json::json!({
            "success": false,
            "message": "Permission rule not found"
        })),
    }
}

pub async fn update_permission_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePermissionRuleRequest>,
) -> Json<serde_json::Value> {
    info!("Updating permission rule: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_row_level_permissions
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            condition = COALESCE($3, condition),
            role_ids = COALESCE($4, role_ids),
            user_ids = COALESCE($5, user_ids),
            is_active = COALESCE($6, is_active),
            updated_at = $7
        WHERE id = $8
        RETURNING id, name, description, datasource_id, table_name, rule_type, condition,
                  role_ids, user_ids, is_active, created_by, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.condition,
        req.role_ids.as_deref(),
        req.user_ids.as_deref(),
        req.is_active,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "Update permission rule",
            "data": PermissionRuleResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                datasource_id: row.datasource_id,
                table_name: row.table_name,
                rule_type: row.rule_type,
                condition: row.condition.unwrap_or(serde_json::json!({})),
                role_ids: row.role_ids,
                user_ids: row.user_ids,
                is_active: row.is_active.unwrap_or(true),
                created_by: row.created_by,
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Permission rule not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to update permission rule: {}", e)
        })),
    }
}

pub async fn delete_permission_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting permission rule: {}", id);

    let result = sqlx::query!(
        r#"
        DELETE FROM analytics_row_level_permissions
        WHERE id = $1
        RETURNING id
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(_)) => Json(serde_json::json!({
            "success": true,
            "message": "Delete permission rule"
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Permission rule not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete permission rule: {}", e)
        })),
    }
}

pub async fn validate_permission(
    State(state): State<AppState>,
    Json(req): Json<ValidatePermissionRequest>,
) -> Json<serde_json::Value> {
    info!("Validating permission for user: {} on table: {}", req.user_id, req.table_name);

    let role_ids = req.role_ids.unwrap_or_default();

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, rule_type, condition
        FROM analytics_row_level_permissions
        WHERE datasource_id = $1
          AND table_name = $2
          AND is_active = true
          AND (
            user_ids @> $3::text[]
            OR role_ids && $4::text[]
            OR (user_ids IS NULL AND role_ids IS NULL)
          )
        "#,
        req.datasource_id,
        req.table_name,
        &[req.user_id.clone()][..],
        &role_ids[..],
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to validate permission: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to validate permission: {}", e)
            }));
        }
    };

    let applicable_rule_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
    let is_allowed = !rows.is_empty();

    let filter_conditions: Vec<String> = rows
        .iter()
        .filter_map(|r| {
            r.condition
                .as_ref()
                .and_then(|c| c.get("sql"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
        })
        .collect();

    let filter_condition = if filter_conditions.is_empty() {
        None
    } else {
        Some(filter_conditions.join(" AND "))
    };

    Json(serde_json::json!({
        "success": true,
        "message": "Validate permission",
        "data": PermissionValidationResponse {
            is_allowed,
            user_id: req.user_id,
            datasource_id: req.datasource_id,
            table_name: req.table_name,
            applicable_rules: applicable_rule_ids,
            filter_condition,
            filtered_columns: None,
        }
    }))
}

pub async fn filter_data(
    State(state): State<AppState>,
    Json(req): Json<FilterDataRequest>,
) -> Json<serde_json::Value> {
    info!("Filtering data for user: {} on table: {}", req.user_id, req.table_name);

    let page = req.page.unwrap_or(1);
    let page_size = req.page_size.unwrap_or(50);
    let offset = (page - 1) * page_size;

    let query = format!(
        "SELECT * FROM {} LIMIT {} OFFSET {}",
        req.table_name, page_size, offset
    );

    let data_result = sqlx::query(&query).fetch_all(&state.pool).await;

    match data_result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|_| {
                    let mut map = serde_json::Map::new();
                    map.insert("id".to_string(), serde_json::Value::Null);
                    serde_json::Value::Object(map)
                })
                .collect();

            let total = data.len() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Filter data",
                "data": FilteredDataResponse {
                    datasource_id: req.datasource_id,
                    table_name: req.table_name,
                    user_id: req.user_id,
                    data,
                    applied_filters: vec![],
                    total,
                    page,
                    page_size,
                }
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to filter data: {}", e)
        })),
    }
}

pub async fn get_user_permissions(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Getting permissions for user: {}", user_id);

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, table_name, rule_type, condition,
               role_ids, user_ids, is_active, created_by, created_at, updated_at
        FROM analytics_row_level_permissions
        WHERE is_active = true
          AND (user_ids @> $1::text[] OR user_ids IS NULL)
        ORDER BY created_at DESC
        "#,
        &[user_id.clone()][..],
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get user permissions: {}", e)
            }));
        }
    };

    let items: Vec<PermissionRuleResponse> = rows
        .into_iter()
        .map(|row| PermissionRuleResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            datasource_id: row.datasource_id,
            table_name: row.table_name,
            rule_type: row.rule_type,
            condition: row.condition.unwrap_or(serde_json::json!({})),
            role_ids: row.role_ids,
            user_ids: row.user_ids,
            is_active: row.is_active.unwrap_or(true),
            created_by: row.created_by,
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;

    Json(serde_json::json!({
        "success": true,
        "message": "Get user permissions",
        "data": {
            "user_id": user_id,
            "rules": items,
            "total": total,
        }
    }))
}

pub async fn get_permission_rule_types(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    info!("Getting permission rule types");

    let rule_types = vec![
        serde_json::json!({
            "type": "row_filter",
            "name": "行数据过滤",
            "description": "基于条件过滤数据行",
            "config_schema": {
                "field": "string",
                "operator": "string",
                "value": "any"
            }
        }),
        serde_json::json!({
            "type": "column_mask",
            "name": "列数据脱敏",
            "description": "对指定列数据进行脱敏处理",
            "config_schema": {
                "columns": "array",
                "mask_type": "string"
            }
        }),
        serde_json::json!({
            "type": "department_scope",
            "name": "部门范围",
            "description": "限制用户只能访问指定部门的数据",
            "config_schema": {
                "department_field": "string",
                "department_ids": "array"
            }
        }),
        serde_json::json!({
            "type": "owner_only",
            "name": "仅本人数据",
            "description": "用户只能访问自己创建或负责的数据",
            "config_schema": {
                "owner_field": "string"
            }
        }),
    ];

    Json(serde_json::json!({
        "success": true,
        "message": "Get permission rule types",
        "data": rule_types
    }))
}
