use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use sqlx::types::Uuid;
use tracing::{info, warn};

use crate::modules::bi::chart_service::{ChartQuery, ChartService, ChartType};
use crate::modules::bi::widget::WIDGET_CACHE;
use crate::shared::AppState;

use super::models::SetAutoRefreshRequest;

pub async fn query_dashboard_realtime_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Querying real-time data for dashboard: {}", id);

    let dashboard = match sqlx::query!(
        r#"SELECT id, name FROM analytics_dashboards WHERE id = $1"#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get dashboard: {}", e),
            ));
        }
    };

    if dashboard.is_none() {
        return Json(topems_shared_core::response::error_value(
            500,
            "Dashboard not found",
        ));
    }

    let dashboard = dashboard.expect("Dashboard should exist after existence check");

    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config, query_config, cache_ttl_seconds
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get widgets: {}", e),
            ));
        }
    };

    let chart_service = ChartService::new(state.pool.clone());
    let mut widget_data = Vec::new();

    for widget in widgets {
        let chart_type = match widget.widget_type.as_str() {
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

        let data_source = widget
            .query_config
            .as_ref()
            .and_then(|c| c.get("data_source"))
            .and_then(|v| v.as_str())
            .unwrap_or("analytics_data")
            .to_string();

        let query_text = widget
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
            title: Some(widget.name.clone()),
            x_axis_label: widget
                .query_config
                .as_ref()
                .and_then(|c| c.get("x_axis"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            y_axis_label: widget
                .query_config
                .as_ref()
                .and_then(|c| c.get("y_axis"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            columns: vec![],
        };

        let payload = match chart_service.generate_chart(chart_query).await {
            Ok(chart_result) => serde_json::to_value(&chart_result).unwrap_or_default(),
            Err(e) => {
                warn!("Failed to generate chart for widget {}: {}", widget.id, e);
                serde_json::json!({ "error": e })
            }
        };

        let ttl = widget.cache_ttl_seconds.unwrap_or(60) as i64;
        WIDGET_CACHE.set(widget.id, payload.clone(), ttl);

        widget_data.push(serde_json::json!({
            "widget_id": widget.id,
            "name": widget.name,
            "widget_type": widget.widget_type,
            "payload": payload,
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "Query dashboard real-time data",
        "data": {
            "dashboard_id": id,
            "dashboard_name": dashboard.name,
            "widgets": widget_data,
            "queried_at": Utc::now().to_rfc3339(),
        }
    }))
}

pub async fn refresh_dashboard_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Refreshing dashboard data: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboards
        SET updated_at = $1
        WHERE id = $2
        RETURNING id, name
        "#,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let widgets = match sqlx::query!(
                r#"SELECT id FROM analytics_widgets WHERE dashboard_id = $1"#,
                id,
            )
            .fetch_all(&state.pool)
            .await
            {
                Ok(rows) => rows,
                Err(_) => vec![],
            };

            for widget in widgets {
                WIDGET_CACHE.invalidate(&widget.id);
            }

            Json(serde_json::json!({
                "success": true,
                "message": "Refresh dashboard data",
                "data": {
                    "id": row.id,
                    "name": row.name,
                    "last_refreshed": now.to_string(),
                    "widgets_refreshed": true,
                }
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Dashboard not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to refresh dashboard: {}", e),
        )),
    }
}

pub async fn set_auto_refresh(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SetAutoRefreshRequest>,
) -> Json<serde_json::Value> {
    info!("Setting auto-refresh for dashboard: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboards
        SET auto_refresh_enabled = $1,
            auto_refresh_interval = $2,
            updated_at = $3
        WHERE id = $4
        RETURNING id, auto_refresh_enabled, auto_refresh_interval
        "#,
        req.enabled,
        req.interval_seconds,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "Set auto-refresh",
            "data": {
                "id": row.id,
                "auto_refresh_enabled": row.auto_refresh_enabled.unwrap_or(false),
                "auto_refresh_interval": row.auto_refresh_interval,
            }
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Dashboard not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to set auto-refresh: {}", e),
        )),
    }
}
