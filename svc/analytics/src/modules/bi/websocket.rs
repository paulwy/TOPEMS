//! WebSocket handler for real-time dashboard data updates

use axum::{
    extract::{Path, State, WebSocketUpgrade},
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};
use sqlx::types::Uuid;
use tokio::time::{interval, Duration};
use tracing::{info, warn};

use crate::modules::bi::chart_service::{ChartQuery, ChartService, ChartType};
use crate::modules::bi::widget::WIDGET_CACHE;
use crate::shared::AppState;

/// WebSocket endpoint for real-time dashboard data
#[utoipa::path(
    get,
    path = "/ws/bi/dashboard/{id}",
    tag = "WebSocket",
    operation_id = "dashboard_websocket",
    responses((status = 200, description = "OK")),
)]
pub async fn dashboard_websocket(
    State(state): State<AppState>,
    Path(dashboard_id): Path<Uuid>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    info!(
        "WebSocket connection requested for dashboard: {}",
        dashboard_id
    );
    ws.on_upgrade(move |socket| handle_dashboard_socket(socket, state, dashboard_id))
}

async fn handle_dashboard_socket(
    socket: axum::extract::ws::WebSocket,
    state: AppState,
    dashboard_id: Uuid,
) {
    info!(
        "WebSocket connection established for dashboard: {}",
        dashboard_id
    );

    let (mut sender, mut receiver) = socket.split();

    // Verify dashboard exists
    let dashboard = match sqlx::query!(
        r#"SELECT id, name, auto_refresh_enabled, auto_refresh_interval FROM analytics_dashboards WHERE id = $1"#,
        dashboard_id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            warn!("Failed to get dashboard for websocket: {}", e);
            let _ = sender
                .send(axum::extract::ws::Message::Text(
                    serde_json::json!({
                        "type": "error",
                        "message": "Failed to get dashboard"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
            return;
        }
    };

    if dashboard.is_none() {
        let _ = sender
            .send(axum::extract::ws::Message::Text(
                serde_json::json!({
                    "type": "error",
                    "message": "Dashboard not found"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    let Some(dashboard) = dashboard else {
        return;
    };
    let refresh_interval = if dashboard.auto_refresh_enabled.unwrap_or(false) {
        dashboard.auto_refresh_interval.unwrap_or(30) as u64
    } else {
        30
    };

    // Send initial connection message
    let init_msg = serde_json::json!({
        "type": "connected",
        "dashboard_id": dashboard_id,
        "dashboard_name": dashboard.name,
        "refresh_interval": refresh_interval,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    if sender
        .send(axum::extract::ws::Message::Text(
            init_msg.to_string().into(),
        ))
        .await
        .is_err()
    {
        warn!("Failed to send initial WebSocket message");
        return;
    }

    // Send current widget data immediately
    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config, query_config, cache_ttl_seconds
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        dashboard_id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to get widgets for websocket: {}", e);
            vec![]
        }
    };

    let chart_service = ChartService::new(state.pool.clone());
    let mut widget_data = Vec::new();

    for widget in &widgets {
        let cached = WIDGET_CACHE.get(&widget.id);
        let payload = if let Some(cached) = cached {
            cached.data
        } else {
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

            match chart_service.generate_chart(chart_query).await {
                Ok(chart_result) => {
                    let val = serde_json::to_value(&chart_result).unwrap_or_default();
                    let ttl = widget.cache_ttl_seconds.unwrap_or(60) as i64;
                    WIDGET_CACHE.set(widget.id, val.clone(), ttl);
                    val
                }
                Err(_) => serde_json::json!({"error": "Failed to generate chart"}),
            }
        };

        widget_data.push(serde_json::json!({
            "widget_id": widget.id,
            "name": widget.name,
            "widget_type": widget.widget_type,
            "payload": payload,
        }));
    }

    let data_msg = serde_json::json!({
        "type": "widget_data",
        "dashboard_id": dashboard_id,
        "widgets": widget_data,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    if sender
        .send(axum::extract::ws::Message::Text(
            data_msg.to_string().into(),
        ))
        .await
        .is_err()
    {
        warn!("Failed to send widget data via WebSocket");
        return;
    }

    // Start periodic updates
    let mut tick_interval = interval(Duration::from_secs(refresh_interval));

    loop {
        tokio::select! {
            _ = tick_interval.tick() => {
                // Refresh and send updated widget data
                let updated_data = refresh_widget_data(&state, dashboard_id).await;
                let update_msg = serde_json::json!({
                    "type": "data_update",
                    "dashboard_id": dashboard_id,
                    "widgets": updated_data,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                });

                if sender.send(axum::extract::ws::Message::Text(update_msg.to_string().into())).await.is_err() {
                    info!("WebSocket client disconnected for dashboard: {}", dashboard_id);
                    break;
                }
            }
            Some(msg) = receiver.next() => {
                match msg {
                    Ok(axum::extract::ws::Message::Text(text)) => {
                        // Handle client messages (e.g., manual refresh request)
                        if let Ok(client_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                            if client_msg.get("action").and_then(|v| v.as_str()) == Some("refresh") {
                                let updated_data = refresh_widget_data(&state, dashboard_id).await;
                                let update_msg = serde_json::json!({
                                    "type": "data_update",
                                    "dashboard_id": dashboard_id,
                                    "widgets": updated_data,
                                    "timestamp": chrono::Utc::now().to_rfc3339(),
                                });
                                if sender.send(axum::extract::ws::Message::Text(update_msg.to_string().into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                    Ok(axum::extract::ws::Message::Close(_)) => {
                        info!("WebSocket connection closed for dashboard: {}", dashboard_id);
                        break;
                    }
                    Err(e) => {
                        warn!("WebSocket error for dashboard {}: {}", dashboard_id, e);
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
}

async fn refresh_widget_data(state: &AppState, dashboard_id: Uuid) -> Vec<serde_json::Value> {
    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config, query_config, cache_ttl_seconds
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        dashboard_id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(_) => return vec![],
    };

    let chart_service = ChartService::new(state.pool.clone());
    let mut widget_data = Vec::new();

    for widget in widgets {
        // Invalidate cache to force refresh
        WIDGET_CACHE.invalidate(&widget.id);

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
            Ok(chart_result) => {
                let val = serde_json::to_value(&chart_result).unwrap_or_default();
                let ttl = widget.cache_ttl_seconds.unwrap_or(60) as i64;
                WIDGET_CACHE.set(widget.id, val.clone(), ttl);
                val
            }
            Err(_) => serde_json::json!({"error": "Failed to generate chart"}),
        };

        widget_data.push(serde_json::json!({
            "widget_id": widget.id,
            "name": widget.name,
            "widget_type": widget.widget_type,
            "payload": payload,
        }));
    }

    widget_data
}
