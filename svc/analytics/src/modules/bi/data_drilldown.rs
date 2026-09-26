use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::info;

use crate::shared::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateDrilldownPathRequest {
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub levels: serde_json::Value,
    pub measures: serde_json::Value,
    pub owner_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDrilldownPathRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub levels: Option<serde_json::Value>,
    pub measures: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct DrilldownPathResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub levels: serde_json::Value,
    pub measures: serde_json::Value,
    pub owner_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DrilldownPathListResponse {
    pub items: Vec<DrilldownPathResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct DrilldownQueryRequest {
    pub path_id: Uuid,
    pub current_level: i32,
    pub drill_dimension: String,
    pub drill_value: Option<String>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct DrilldownHistoryRequest {
    pub user_id: String,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct DrilldownHistoryResponse {
    pub id: Uuid,
    pub user_id: String,
    pub path_id: Uuid,
    pub action: String,
    pub from_level: i32,
    pub to_level: i32,
    pub drill_dimension: Option<String>,
    pub drill_value: Option<String>,
    pub filters: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DrilldownHistoryListResponse {
    pub items: Vec<DrilldownHistoryResponse>,
    pub total: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:viz:read"])),
    path = "/drilldown/path",
    tag = "Drilldown",
    operation_id = "list_drilldown_paths",
    responses((status = 200, description = "OK")),
)]
pub async fn list_drilldown_paths(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing drilldown paths");

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, levels, measures, owner_id, created_at, updated_at
        FROM analytics_drilldown_paths
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to list drilldown paths: {}", e)));
        }
    };

    let items: Vec<DrilldownPathResponse> = rows
        .into_iter()
        .map(|row| DrilldownPathResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            datasource_id: row.datasource_id,
            levels: row.levels.unwrap_or(serde_json::json!([])),
            measures: row.measures.unwrap_or(serde_json::json!([])),
            owner_id: row.owner_id,
            created_at: row.created_at.unwrap_or_default().and_utc(),
            updated_at: row.updated_at.unwrap_or_default().and_utc(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List drilldown paths",
        "data": DrilldownPathListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:viz:write"])),
    path = "/drilldown/path",
    tag = "Drilldown",
    operation_id = "create_drilldown_path",
    responses((status = 200, description = "OK")),
)]
pub async fn create_drilldown_path(
    State(state): State<AppState>,
    Json(req): Json<CreateDrilldownPathRequest>,
) -> Json<serde_json::Value> {
    info!("Creating drilldown path: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_drilldown_paths 
        (id, name, description, datasource_id, levels, measures, owner_id, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, name, description, datasource_id, levels, measures, owner_id, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.datasource_id,
        req.levels,
        req.measures,
        req.owner_id,
now.naive_utc(),
now.naive_utc(),
        Uuid::nil(),
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
                                    "success": true,
                                    "message": "Create drilldown path",
                                    "data": DrilldownPathResponse {
                                        id: row.id,
                                        name: row.name,
                                        description: row.description,
                                        datasource_id: row.datasource_id,
                                        levels: row.levels.unwrap_or(serde_json::json!([])),
                                        measures: row.measures.unwrap_or(serde_json::json!([])),
                                        owner_id: row.owner_id,
        created_at: row.created_at.unwrap_or_default().and_utc(),
        updated_at: row.updated_at.unwrap_or_default().and_utc(),
                                    }
                                })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create drilldown path: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:viz:read"])),
    path = "/drilldown/path/{id}",
    tag = "Drilldown",
    operation_id = "get_drilldown_path",
    responses((status = 200, description = "OK")),
)]
pub async fn get_drilldown_path(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting drilldown path: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, levels, measures, owner_id, created_at, updated_at
        FROM analytics_drilldown_paths
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to get drilldown path: {}", e)));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
                                    "success": true,
                                    "message": "Get drilldown path",
                                    "data": DrilldownPathResponse {
                                        id: row.id,
                                        name: row.name,
                                        description: row.description,
                                        datasource_id: row.datasource_id,
                                        levels: row.levels.unwrap_or(serde_json::json!([])),
                                        measures: row.measures.unwrap_or(serde_json::json!([])),
                                        owner_id: row.owner_id,
        created_at: row.created_at.unwrap_or_default().and_utc(),
        updated_at: row.updated_at.unwrap_or_default().and_utc(),
                                    }
                                })),
        None => Json(topems_shared_core::response::error_value(
            500,
            "Drilldown path not found",
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:viz:write"])),
    path = "/drilldown/path/{id}",
    tag = "Drilldown",
    operation_id = "update_drilldown_path",
    responses((status = 200, description = "OK")),
)]
pub async fn update_drilldown_path(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDrilldownPathRequest>,
) -> Json<serde_json::Value> {
    info!("Updating drilldown path: {}", id);

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_drilldown_paths
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            levels = COALESCE($3, levels),
            measures = COALESCE($4, measures),
            updated_at = $5
        WHERE id = $6
        RETURNING id, name, description, datasource_id, levels, measures, owner_id, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.levels,
        req.measures,
now.naive_utc(),
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
                                    "success": true,
                                    "message": "Update drilldown path",
                                    "data": DrilldownPathResponse {
                                        id: row.id,
                                        name: row.name,
                                        description: row.description,
                                        datasource_id: row.datasource_id,
                                        levels: row.levels.unwrap_or(serde_json::json!([])),
                                        measures: row.measures.unwrap_or(serde_json::json!([])),
                                        owner_id: row.owner_id,
        created_at: row.created_at.unwrap_or_default().and_utc(),
        updated_at: row.updated_at.unwrap_or_default().and_utc(),
                                    }
                                })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Drilldown path not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update drilldown path: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:viz:write"])),
    path = "/drilldown/path/{id}",
    tag = "Drilldown",
    operation_id = "delete_drilldown_path",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_drilldown_path(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting drilldown path: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE analytics_drilldown_paths SET deleted_at = NOW()
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
            "message": "Delete drilldown path"
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Drilldown path not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete drilldown path: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:viz:write"])),
    path = "/drilldown/drill-down",
    tag = "Drilldown",
    operation_id = "drill_down",
    responses((status = 200, description = "OK")),
)]
pub async fn drill_down(
    State(state): State<AppState>,
    Json(req): Json<DrilldownQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Drilling down on path: {}", req.path_id);

    let path = match sqlx::query!(
        r#"
        SELECT id, name, levels, measures
        FROM analytics_drilldown_paths
        WHERE id = $1
        "#,
        req.path_id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Json(topems_shared_core::response::error_value(
                500,
                "Drilldown path not found",
            ));
        }
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get drilldown path: {}", e),
            ));
        }
    };

    let next_level = req.current_level + 1;
    let levels = path.levels.unwrap_or(serde_json::json!([]));
    let levels_arr = levels.as_array();

    if levels_arr.is_none_or(|arr| next_level as usize >= arr.len()) {
        return Json(topems_shared_core::response::error_value(
            500,
            "Already at the lowest drill level",
        ));
    }

    let now = Utc::now();
    let history_id = Uuid::new_v4();

    let _ = sqlx::query!(
        r#"
        INSERT INTO analytics_drilldown_history
        (id, user_id, path_id, action, from_level, to_level, drill_dimension, drill_value, filters, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
        history_id,
        "system",
        req.path_id,
        "drill_down",
        req.current_level,
        next_level,
        Some(req.drill_dimension.clone()),
        req.drill_value.clone(),
        req.filters.clone(),
now.naive_utc(),
        Uuid::nil(),
    )
    .fetch_optional(&state.pool)
    .await;

    Json(serde_json::json!({
        "success": true,
        "message": "Drill down",
        "data": {
            "path_id": req.path_id,
            "path_name": path.name,
            "from_level": req.current_level,
            "to_level": next_level,
            "drill_dimension": req.drill_dimension,
            "drill_value": req.drill_value,
            "levels": levels,
            "data": [],
            "drilled_at": Utc::now().to_rfc3339(),
        }
    }))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:viz:admin"])),
    path = "/drilldown/roll-up",
    tag = "Drilldown",
    operation_id = "roll_up",
    responses((status = 200, description = "OK")),
)]
pub async fn roll_up(
    State(state): State<AppState>,
    Json(req): Json<DrilldownQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Rolling up on path: {}", req.path_id);

    let path = match sqlx::query!(
        r#"
        SELECT id, name, levels, measures
        FROM analytics_drilldown_paths
        WHERE id = $1
        "#,
        req.path_id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Json(topems_shared_core::response::error_value(
                500,
                "Drilldown path not found",
            ));
        }
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get drilldown path: {}", e),
            ));
        }
    };

    if req.current_level <= 0 {
        return Json(topems_shared_core::response::error_value(
            500,
            "Already at the highest level",
        ));
    }

    let prev_level = req.current_level - 1;
    let levels = path.levels.unwrap_or(serde_json::json!([]));

    let now = Utc::now();
    let history_id = Uuid::new_v4();

    let _ = sqlx::query!(
        r#"
        INSERT INTO analytics_drilldown_history
        (id, user_id, path_id, action, from_level, to_level, drill_dimension, drill_value, filters, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
        history_id,
        "system",
        req.path_id,
        "roll_up",
        req.current_level,
        prev_level,
        Some(req.drill_dimension.clone()),
        req.drill_value.clone(),
        req.filters.clone(),
now.naive_utc(),
        Uuid::nil(),
    )
    .fetch_optional(&state.pool)
    .await;

    Json(serde_json::json!({
        "success": true,
        "message": "Roll up",
        "data": {
            "path_id": req.path_id,
            "path_name": path.name,
            "from_level": req.current_level,
            "to_level": prev_level,
            "levels": levels,
            "data": [],
            "rolled_up_at": Utc::now().to_rfc3339(),
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:viz:write"])),
    path = "/drilldown/history",
    tag = "Drilldown",
    operation_id = "get_drilldown_history",
    responses((status = 200, description = "OK")),
)]
pub async fn get_drilldown_history(
    State(state): State<AppState>,
    Json(req): Json<DrilldownHistoryRequest>,
) -> Json<serde_json::Value> {
    info!("Getting drilldown history for user: {}", req.user_id);

    let page = req.page.unwrap_or(1);
    let page_size = req.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let rows = match sqlx::query!(
        r#"
        SELECT id, user_id, path_id, action, from_level, to_level, drill_dimension, drill_value, filters, created_at
        FROM analytics_drilldown_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        req.user_id,
        page_size,
        offset,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to get drilldown history: {}", e)));
        }
    };

    let items: Vec<DrilldownHistoryResponse> = rows
        .into_iter()
        .map(|row| DrilldownHistoryResponse {
            id: row.id,
            user_id: row.user_id,
            path_id: row.path_id,
            action: row.action,
            from_level: row.from_level,
            to_level: row.to_level,
            drill_dimension: row.drill_dimension,
            drill_value: row.drill_value,
            filters: row.filters,
            created_at: row.created_at.unwrap_or_default().and_utc(),
        })
        .collect();

    let total = items.len() as i64;

    Json(serde_json::json!({
        "success": true,
        "message": "Get drilldown history",
        "data": DrilldownHistoryListResponse {
            items,
            total,
        }
    }))
}
