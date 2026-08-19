use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

use crate::modules::bi::chart_service::{ChartQuery, ChartService, ChartType};
use crate::shared::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateVisualizationRequest {
    pub name: String,
    pub chart_type: String,
    pub data_source: String,
    pub query: String,
    pub title: Option<String>,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VisualizationResponse {
    pub id: Uuid,
    pub name: String,
    pub chart_type: String,
    pub title: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/visualization",
    tag = "Visualization",
    operation_id = "list_visualizations",
    responses((status = 200, description = "OK")),
)]
pub async fn list_visualizations(State(_state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing visualizations");
    Json(serde_json::json!({
        "success": true,
        "message": "List visualizations",
        "data": []
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/visualization",
    tag = "Visualization",
    operation_id = "create_visualization",
    request_body(
        content = CreateVisualizationRequest,
        content_type = "application/json",
        description = "创建可视化请求"
    ),
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_visualization(
    State(state): State<AppState>,
    Json(req): Json<CreateVisualizationRequest>,
) -> Json<serde_json::Value> {
    info!("Creating visualization: {}", req.name);

    let chart_service = ChartService::new(state.pool.clone());

    let chart_type = match req.chart_type.as_str() {
        "line" => ChartType::Line,
        "bar" => ChartType::Bar,
        "pie" => ChartType::Pie,
        "scatter" => ChartType::Scatter,
        "area" => ChartType::Area,
        "histogram" => ChartType::Histogram,
        "gauge" => ChartType::Gauge,
        "table" => ChartType::Table,
        _ => ChartType::Line,
    };

    #[allow(deprecated)]
    let chart_query = ChartQuery {
        chart_type,
        data_source: req.data_source,
        query: req.query,
        params: std::collections::HashMap::new(),
        title: req.title,
        x_axis_label: req.x_axis_label,
        y_axis_label: req.y_axis_label,
        columns: vec![],
    };

    match chart_service.generate_chart(chart_query).await {
        Ok(chart) => Json(serde_json::json!({
            "success": true,
            "message": "Create visualization",
            "data": chart
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create visualization: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/visualization/{id}",
    tag = "Visualization",
    operation_id = "get_visualization",
    responses((status = 200, description = "OK")),
)]
pub async fn get_visualization(State(_state): State<AppState>) -> Json<serde_json::Value> {
    info!("Getting visualization");
    Json(serde_json::json!({
        "success": true,
        "message": "Get visualization"
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/visualization/chart-types",
    tag = "Visualization",
    operation_id = "get_chart_types",
    responses((status = 200, description = "OK")),
)]
pub async fn get_chart_types(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Getting chart types");

    let chart_service = ChartService::new(state.pool.clone());
    let chart_types = chart_service.get_available_chart_types().await;

    Json(serde_json::json!({
        "success": true,
        "message": "Get chart types",
        "data": chart_types
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/visualization/line",
    tag = "Visualization",
    operation_id = "generate_line_chart",
    responses((status = 200, description = "OK")),
)]
pub async fn generate_line_chart(
    State(state): State<AppState>,
    Json(req): Json<GenerateChartRequest>,
) -> Json<serde_json::Value> {
    info!("Generating line chart");

    let chart_service = ChartService::new(state.pool.clone());

    match chart_service
        .generate_line_chart(&req.data_source, &req.x_column, &req.y_columns, req.title)
        .await
    {
        Ok(chart) => Json(serde_json::json!({
            "success": true,
            "message": "Generate line chart",
            "data": chart
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to generate line chart: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/visualization/bar",
    tag = "Visualization",
    operation_id = "generate_bar_chart",
    responses((status = 200, description = "OK")),
)]
pub async fn generate_bar_chart(
    State(state): State<AppState>,
    Json(req): Json<GenerateChartRequest>,
) -> Json<serde_json::Value> {
    info!("Generating bar chart");

    let chart_service = ChartService::new(state.pool.clone());

    match chart_service
        .generate_bar_chart(&req.data_source, &req.x_column, &req.y_columns, req.title)
        .await
    {
        Ok(chart) => Json(serde_json::json!({
            "success": true,
            "message": "Generate bar chart",
            "data": chart
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to generate bar chart: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/visualization/pie",
    tag = "Visualization",
    operation_id = "generate_pie_chart",
    responses((status = 200, description = "OK")),
)]
pub async fn generate_pie_chart(
    State(state): State<AppState>,
    Json(req): Json<GeneratePieChartRequest>,
) -> Json<serde_json::Value> {
    info!("Generating pie chart");

    let chart_service = ChartService::new(state.pool.clone());

    match chart_service
        .generate_pie_chart(
            &req.data_source,
            &req.label_column,
            &req.value_column,
            req.title,
        )
        .await
    {
        Ok(chart) => Json(serde_json::json!({
            "success": true,
            "message": "Generate pie chart",
            "data": chart
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to generate pie chart: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/visualization/gauge",
    tag = "Visualization",
    operation_id = "generate_gauge_chart",
    responses((status = 200, description = "OK")),
)]
pub async fn generate_gauge_chart(
    State(state): State<AppState>,
    Json(req): Json<GenerateGaugeChartRequest>,
) -> Json<serde_json::Value> {
    info!("Generating gauge chart");

    let chart_service = ChartService::new(state.pool.clone());

    match chart_service
        .generate_gauge_chart(req.value, req.min, req.max, req.title)
        .await
    {
        Ok(chart) => Json(serde_json::json!({
            "success": true,
            "message": "Generate gauge chart",
            "data": chart
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to generate gauge chart: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/widgets/{widget_id}/drilldown",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_drilldown_config(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Getting drilldown config for widget: {}", widget_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Get drilldown config",
        "data": {
            "widgetId": widget_id,
            "levels": [],
            "defaultLevel": 0
        }
    }))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:update"])),
    path = "/widgets/{widget_id}/drilldown",
    tag = "Drilldown",
    operation_id = "update_drilldown_config",
    responses((status = 200, description = "OK")),
)]
pub async fn update_drilldown_config(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
    Json(_config): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Updating drilldown config for widget: {}", widget_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Update drilldown config"
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/widgets/{widget_id}/drilldown/execute",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn execute_drilldown(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
    Json(req): Json<DrilldownRequest>,
) -> Json<serde_json::Value> {
    info!("Executing drilldown for widget: {}", widget_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Execute drilldown",
        "data": {
            "widgetId": widget_id,
            "level": req.level,
            "filters": req.filters,
            "result": []
        }
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/dashboards/{dashboard_id}/links",
    tag = "Visualization",
    operation_id = "get_chart_link_config",
    responses((status = 200, description = "OK")),
)]
pub async fn get_chart_link_config(
    State(_state): State<AppState>,
    Path(dashboard_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Getting chart link config for dashboard: {}", dashboard_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Get chart link config",
        "data": {
            "dashboardId": dashboard_id,
            "links": []
        }
    }))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:update"])),
    path = "/api/bi/dashboards/{dashboard_id}/links",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn update_chart_link_config(
    State(_state): State<AppState>,
    Path(dashboard_id): Path<String>,
    Json(_config): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Updating chart link config for dashboard: {}", dashboard_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Update chart link config"
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/widgets/{widget_id}/annotations",
    tag = "Visualization",
    operation_id = "get_chart_annotations",
    responses((status = 200, description = "OK")),
)]
pub async fn get_chart_annotations(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Getting annotations for widget: {}", widget_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Get chart annotations",
        "data": []
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/widgets/{widget_id}/annotations",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn create_chart_annotation(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
    Json(req): Json<AnnotationRequest>,
) -> Json<serde_json::Value> {
    info!("Creating annotation for widget: {}", widget_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Create chart annotation",
        "data": {
            "id": Uuid::new_v4(),
            "widgetId": widget_id,
            "type": req.r#type,
            "position": req.position,
            "content": req.content,
            "color": req.color
        }
    }))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:delete"])),
    path = "/api/bi/annotations/{annotation_id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn delete_chart_annotation(
    State(_state): State<AppState>,
    Path(annotation_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Deleting annotation: {}", annotation_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Delete chart annotation"
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/widgets/{widget_id}/export",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn export_chart(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
    Json(req): Json<ExportRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Exporting chart for widget: {} format: {}",
        widget_id, req.format
    );
    Json(serde_json::json!({
        "success": true,
        "message": "Export chart",
        "data": {
            "widgetId": widget_id,
            "format": req.format,
            "url": "/download/placeholder"
        }
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/widgets/{widget_id}/fullscreen",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_fullscreen_chart(
    State(_state): State<AppState>,
    Path(widget_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Getting fullscreen chart for widget: {}", widget_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Get fullscreen chart",
        "data": {
            "widgetId": widget_id,
            "config": {}
        }
    }))
}

#[derive(Debug, Deserialize)]
pub struct DrilldownRequest {
    pub level: i64,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AnnotationRequest {
    #[serde(rename = "type")]
    pub r#type: String,
    pub position: serde_json::Value,
    pub content: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub format: String,
}

#[derive(Debug, Deserialize)]
pub struct GenerateChartRequest {
    pub data_source: String,
    pub x_column: String,
    pub y_columns: Vec<String>,
    pub title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GeneratePieChartRequest {
    pub data_source: String,
    pub label_column: String,
    pub value_column: String,
    pub title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateGaugeChartRequest {
    pub value: f64,
    pub min: f64,
    pub max: f64,
    pub title: Option<String>,
}
