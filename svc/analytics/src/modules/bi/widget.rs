use axum::{extract::Path, extract::State, Json};
use chrono::Utc;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::{info, warn};
use utoipa::ToSchema;

use crate::modules::bi::chart_service::{ChartQuery, ChartService, ChartType};
use crate::shared::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateWidgetRequest {
    pub dashboard_id: Uuid,
    pub name: String,
    pub widget_type: String,
    pub config: Option<serde_json::Value>,
    pub position: Option<serde_json::Value>,
    pub datasource_id: Option<Uuid>,
    pub query_config: Option<serde_json::Value>,
    pub cache_ttl_seconds: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateWidgetRequest {
    pub name: Option<String>,
    pub widget_type: Option<String>,
    pub config: Option<serde_json::Value>,
    pub position: Option<serde_json::Value>,
    pub datasource_id: Option<Uuid>,
    pub query_config: Option<serde_json::Value>,
    pub cache_ttl_seconds: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct WidgetResponse {
    pub id: Uuid,
    pub dashboard_id: Option<Uuid>,
    pub name: String,
    pub widget_type: String,
    pub config: Option<serde_json::Value>,
    pub position: Option<serde_json::Value>,
    pub datasource_id: Option<Uuid>,
    pub query_config: Option<serde_json::Value>,
    pub cache_ttl_seconds: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct WidgetListResponse {
    pub items: Vec<WidgetResponse>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CachedWidgetData {
    pub widget_id: Uuid,
    pub data: serde_json::Value,
    pub cached_at: chrono::DateTime<Utc>,
    pub ttl_seconds: i64,
}

/// Global widget data cache with TTL
pub struct WidgetCache {
    cache: DashMap<Uuid, CachedWidgetData>,
}

impl WidgetCache {
    pub fn new() -> Self {
        Self {
            cache: DashMap::new(),
        }
    }

    pub fn get(&self, widget_id: &Uuid) -> Option<CachedWidgetData> {
        self.cache
            .get(widget_id)
            .map(|entry| {
                let cached = entry.value().clone();
                let elapsed = Utc::now().timestamp() - cached.cached_at.timestamp();
                if elapsed > cached.ttl_seconds {
                    drop(entry);
                    self.cache.remove(widget_id);
                    None
                } else {
                    Some(cached)
                }
            })
            .flatten()
    }

    pub fn set(&self, widget_id: Uuid, data: serde_json::Value, ttl_seconds: i64) {
        self.cache.insert(
            widget_id,
            CachedWidgetData {
                widget_id,
                data,
                cached_at: Utc::now(),
                ttl_seconds,
            },
        );
    }

    pub fn invalidate(&self, widget_id: &Uuid) {
        self.cache.remove(widget_id);
    }

    pub fn invalidate_by_dashboard(&self, _dashboard_id: &Uuid) {
        let to_remove: Vec<Uuid> = self
            .cache
            .iter()
            .filter(|_entry| false)
            .map(|entry| *entry.key())
            .collect();
        for id in to_remove {
            self.cache.remove(&id);
        }
    }

    pub fn clear(&self) {
        self.cache.clear();
    }
}

impl Default for WidgetCache {
    fn default() -> Self {
        Self::new()
    }
}

// Global singleton cache
use once_cell::sync::Lazy;
pub static WIDGET_CACHE: Lazy<WidgetCache> = Lazy::new(WidgetCache::new);

#[utoipa::path(
    get,
    path = "/api/bi/widget",
    tag = "Visualization",
    responses(
        (status = 200, description = "List of widgets", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_widgets(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing widgets");

    let rows = match sqlx::query!(
        r#"
        SELECT id, dashboard_id, name, widget_type, config, position, datasource_id, query_config, cache_ttl_seconds, created_at, updated_at
        FROM analytics_widgets
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to list widgets: {}", e)));
        }
    };

    let items: Vec<WidgetResponse> = rows
        .into_iter()
        .map(|row| WidgetResponse {
            id: row.id,
            dashboard_id: row.dashboard_id,
            name: row.name,
            widget_type: row.widget_type,
            config: row.config,
            position: row.position,
            datasource_id: row.datasource_id,
            query_config: row.query_config,
            cache_ttl_seconds: row.cache_ttl_seconds,
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List widgets",
        "data": WidgetListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    get,
    path = "/api/bi/widget/dashboard/{dashboard_id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_widgets_by_dashboard(
    State(state): State<AppState>,
    Path(dashboard_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Listing widgets for dashboard: {}", dashboard_id);

    let rows = match sqlx::query!(
        r#"
        SELECT id, dashboard_id, name, widget_type, config, position, datasource_id, query_config, cache_ttl_seconds, created_at, updated_at
        FROM analytics_widgets
        WHERE dashboard_id = $1
        ORDER BY created_at ASC
        "#,
        dashboard_id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to list widgets: {}", e)));
        }
    };

    let items: Vec<WidgetResponse> = rows
        .into_iter()
        .map(|row| WidgetResponse {
            id: row.id,
            dashboard_id: row.dashboard_id,
            name: row.name,
            widget_type: row.widget_type,
            config: row.config,
            position: row.position,
            datasource_id: row.datasource_id,
            query_config: row.query_config,
            cache_ttl_seconds: row.cache_ttl_seconds,
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List widgets by dashboard",
        "data": WidgetListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    path = "/api/bi/widget",
    tag = "Visualization",
    request_body(
        content = CreateWidgetRequest,
        content_type = "application/json",
        description = "创建组件请求"
    ),
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_widget(
    State(state): State<AppState>,
    Json(req): Json<CreateWidgetRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Creating widget: {} for dashboard: {}",
        req.name, req.dashboard_id
    );

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_widgets (id, dashboard_id, name, widget_type, config, position, datasource_id, query_config, cache_ttl_seconds, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, dashboard_id, name, widget_type, config, position, datasource_id, query_config, cache_ttl_seconds, created_at, updated_at
        "#,
        id,
        req.dashboard_id,
        req.name,
        req.widget_type,
        req.config,
        req.position,
        req.datasource_id,
        req.query_config,
        req.cache_ttl_seconds,
        now,
        now,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
            "success": true,
            "message": "Create widget",
            "data": WidgetResponse {
                id: row.id,
                dashboard_id: row.dashboard_id,
                name: row.name,
                widget_type: row.widget_type,
                config: row.config,
                position: row.position,
                datasource_id: row.datasource_id,
                query_config: row.query_config,
                cache_ttl_seconds: row.cache_ttl_seconds,
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create widget: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    path = "/api/bi/widget/{id}",
    tag = "Visualization",
    params(
        ("id" = uuid::Uuid, Path, description = "Widget ID")
    ),
    responses(
        (status = 200, description = "Widget details", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_widget(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting widget: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, dashboard_id, name, widget_type, config, position, datasource_id, query_config, cache_ttl_seconds, created_at, updated_at
        FROM analytics_widgets
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to get widget: {}", e)));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
            "success": true,
            "message": "Get widget",
            "data": WidgetResponse {
                id: row.id,
                dashboard_id: row.dashboard_id,
                name: row.name,
                widget_type: row.widget_type,
                config: row.config,
                position: row.position,
                datasource_id: row.datasource_id,
                query_config: row.query_config,
                cache_ttl_seconds: row.cache_ttl_seconds,
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        None => Json(topems_shared_core::response::error_value(
            500,
            "Widget not found",
        )),
    }
}

#[utoipa::path(
    put,
    path = "/api/bi/widget/{id}",
    tag = "Visualization",
    params(
        ("id" = uuid::Uuid, Path, description = "Widget ID")
    ),
    request_body(
        content = UpdateWidgetRequest,
        content_type = "application/json",
        description = "更新组件请求"
    ),
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_widget(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWidgetRequest>,
) -> Json<serde_json::Value> {
    info!("Updating widget: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_widgets
        SET name = COALESCE($1, name),
            widget_type = COALESCE($2, widget_type),
            config = COALESCE($3, config),
            position = COALESCE($4, position),
            datasource_id = COALESCE($5, datasource_id),
            query_config = COALESCE($6, query_config),
            cache_ttl_seconds = COALESCE($7, cache_ttl_seconds),
            updated_at = $8
        WHERE id = $9
        RETURNING id, dashboard_id, name, widget_type, config, position, datasource_id, query_config, cache_ttl_seconds, created_at, updated_at
        "#,
        req.name,
        req.widget_type,
        req.config,
        req.position,
        req.datasource_id,
        req.query_config,
        req.cache_ttl_seconds,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            // Invalidate cache when widget is updated
            WIDGET_CACHE.invalidate(&id);
            Json(serde_json::json!({
                "success": true,
                "message": "Update widget",
                "data": WidgetResponse {
                    id: row.id,
                    dashboard_id: row.dashboard_id,
                    name: row.name,
                    widget_type: row.widget_type,
                    config: row.config,
                    position: row.position,
                    datasource_id: row.datasource_id,
                    query_config: row.query_config,
                    cache_ttl_seconds: row.cache_ttl_seconds,
                    created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                    updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
                }
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Widget not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update widget: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    path = "/api/bi/widget/{id}",
    tag = "Visualization",
    params(
        ("id" = uuid::Uuid, Path, description = "Widget ID")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_widget(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting widget: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE analytics_widgets SET deleted_at = NOW()
        WHERE id = $1
        RETURNING id
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(_)) => {
            WIDGET_CACHE.invalidate(&id);
            Json(serde_json::json!({
                "success": true,
                "message": "Delete widget"
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Widget not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete widget: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    path = "/api/bi/widget/{id}/data",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_widget_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting widget data: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT name, widget_type, config, position, query_config, cache_ttl_seconds
        FROM analytics_widgets
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get widget: {}", e),
            ));
        }
    };

    match row {
        Some(row) => {
            let chart_type = match row.widget_type.as_str() {
                "chart-bar" => ChartType::Bar,
                "chart-line" => ChartType::Line,
                "chart-pie" => ChartType::Pie,
                "chart-area" => ChartType::Area,
                "chart-scatter" => ChartType::Scatter,
                "chart-histogram" => ChartType::Histogram,
                "chart-gauge" => ChartType::Gauge,
                "table" => ChartType::Table,
                "metric" => ChartType::Table,
                "pivot" => ChartType::Table,
                _ => ChartType::Line,
            };

            let data_source = row
                .query_config
                .as_ref()
                .and_then(|c| c.get("data_source"))
                .and_then(|v| v.as_str())
                .unwrap_or("analytics_data")
                .to_string();

            let query_text = row
                .query_config
                .as_ref()
                .and_then(|c| c.get("query"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let x_axis_label = row
                .query_config
                .as_ref()
                .and_then(|c| c.get("x_axis"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let y_axis_label = row
                .query_config
                .as_ref()
                .and_then(|c| c.get("y_axis"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let chart_service = ChartService::new(state.pool.clone());
            #[allow(deprecated)]
            let chart_query = ChartQuery {
                chart_type,
                data_source,
                query: query_text,
                params: std::collections::HashMap::new(),
                title: Some(row.name.clone()),
                x_axis_label,
                y_axis_label,
                columns: vec![],
            };

            let payload = match chart_service.generate_chart(chart_query).await {
                Ok(chart_result) => serde_json::to_value(&chart_result).unwrap_or_default(),
                Err(e) => {
                    warn!("Failed to generate chart for widget {}: {}", id, e);
                    serde_json::json!({ "error": e })
                }
            };

            let ttl = row.cache_ttl_seconds.unwrap_or(60) as i64;
            WIDGET_CACHE.set(id, payload.clone(), ttl);

            Json(serde_json::json!({
                "success": true,
                "message": "Get widget data",
                "data": {
                    "widget_id": id,
                    "name": row.name,
                    "widget_type": row.widget_type,
                    "config": row.config,
                    "position": row.position,
                    "payload": payload,
                }
            }))
        }
        None => Json(topems_shared_core::response::error_value(
            500,
            "Widget not found",
        )),
    }
}

#[utoipa::path(
    get,
    path = "/widget/{id}/data/realtime",
    tag = "Visualization",
    operation_id = "get_widget_data_realtime",
    responses((status = 200, description = "OK")),
)]
/// Query real-time data for a widget using ChartService with caching
pub async fn get_widget_data_realtime(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting real-time widget data: {}", id);

    // Check cache first
    if let Some(cached) = WIDGET_CACHE.get(&id) {
        info!("Returning cached data for widget: {}", id);
        return Json(serde_json::json!({
            "success": true,
            "message": "Get widget data (cached)",
            "data": {
                "widget_id": id,
                "payload": cached.data,
                "cached": true,
                "cached_at": cached.cached_at.to_rfc3339(),
            }
        }));
    }

    let row = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config, query_config, cache_ttl_seconds
        FROM analytics_widgets
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get widget: {}", e),
            ));
        }
    };

    match row {
        Some(row) => {
            let chart_service = ChartService::new(state.pool.clone());

            let chart_type = match row.widget_type.as_str() {
                "chart-bar" => ChartType::Bar,
                "chart-line" => ChartType::Line,
                "chart-pie" => ChartType::Pie,
                "chart-area" => ChartType::Area,
                "chart-scatter" => ChartType::Scatter,
                "chart-histogram" => ChartType::Histogram,
                "chart-gauge" => ChartType::Gauge,
                "table" => ChartType::Table,
                _ => ChartType::Line,
            };

            let data_source = row
                .query_config
                .as_ref()
                .and_then(|c| c.get("data_source"))
                .and_then(|v| v.as_str())
                .unwrap_or("analytics_data")
                .to_string();

            let query_text = row
                .query_config
                .as_ref()
                .and_then(|c| c.get("query"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            #[allow(deprecated)]
            let chart_query = ChartQuery {
                chart_type,
                data_source,
                query: query_text,
                params: std::collections::HashMap::new(),
                title: Some(row.name.clone()),
                x_axis_label: row
                    .query_config
                    .as_ref()
                    .and_then(|c| c.get("x_axis"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                y_axis_label: row
                    .query_config
                    .as_ref()
                    .and_then(|c| c.get("y_axis"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                columns: vec![],
            };

            match chart_service.generate_chart(chart_query).await {
                Ok(chart_result) => {
                    let payload = serde_json::to_value(&chart_result).unwrap_or_default();
                    let ttl = row.cache_ttl_seconds.unwrap_or(60) as i64;

                    WIDGET_CACHE.set(id, payload.clone(), ttl);

                    Json(serde_json::json!({
                        "success": true,
                        "message": "Get widget data (real-time)",
                        "data": {
                            "widget_id": id,
                            "name": row.name,
                            "widget_type": row.widget_type,
                            "config": row.config,
                            "payload": payload,
                            "cached": false,
                        }
                    }))
                }
                Err(e) => {
                    tracing::error!("Failed to generate chart for widget {}: {}", id, e);
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("Failed to generate chart data: {}", e),
                    ))
                }
            }
        }
        None => Json(topems_shared_core::response::error_value(
            500,
            "Widget not found",
        )),
    }
}

#[utoipa::path(
    post,
    path = "/widget/{id}/cache/invalidate",
    tag = "Visualization",
    operation_id = "invalidate_widget_cache",
    responses((status = 200, description = "OK")),
)]
/// Invalidate widget cache
pub async fn invalidate_widget_cache(Path(id): Path<Uuid>) -> Json<serde_json::Value> {
    info!("Invalidating cache for widget: {}", id);
    WIDGET_CACHE.invalidate(&id);
    Json(serde_json::json!({
        "success": true,
        "message": "Widget cache invalidated"
    }))
}

#[utoipa::path(
    post,
    path = "/widget/cache/invalidate-all",
    tag = "Visualization",
    operation_id = "invalidate_all_widget_cache",
    responses((status = 200, description = "OK")),
)]
/// Invalidate all widget cache
pub async fn invalidate_all_widget_cache() -> Json<serde_json::Value> {
    info!("Invalidating all widget cache");
    WIDGET_CACHE.clear();
    Json(serde_json::json!({
        "success": true,
        "message": "All widget cache invalidated"
    }))
}
