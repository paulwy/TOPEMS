//! WebSocket handler for real-time dashboard data updates

use axum::{
    extract::{Path, Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::Deserialize;
use sqlx::types::Uuid;
use sqlx::Row as _;
use tokio::time::{interval, Duration};
use tracing::{info, warn};

use crate::modules::bi::chart_service::{ChartQuery, ChartService, ChartType};
use crate::modules::bi::widget::WIDGET_CACHE;
use crate::shared::AppState;
use topems_shared_auth::auth::{verify_jwt_token, Claims};

/// WebSocket 连接 query 参数：`?token=<JWT>`（与 mes/communication WS 模式一致）
#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    pub token: Option<String>,
}

/// WebSocket endpoint for real-time dashboard data
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/ws/bi/dashboard/{id}",
    tag = "WebSocket",
    operation_id = "dashboard_websocket",
    responses((status = 200, description = "OK")),
)]
pub async fn dashboard_websocket(
    State(state): State<AppState>,
    Path(dashboard_id): Path<Uuid>,
    Query(params): Query<WsQueryParams>,
    ws: WebSocketUpgrade,
) -> Response {
    info!(
        "WebSocket connection requested for dashboard: {}",
        dashboard_id
    );

    // P1-13: 订阅前强制认证——无 token / JWT 校验失败直接拒绝升级（401），
    // 不建立 WebSocket、不下发任何看板数据。路由挂在 stateful_public（浏览器 WS
    // 无法携带 Authorization 头，沿用 ?token= 查询参数模式，鉴权在升级层完成）。
    let claims = match params.token {
        Some(tok) => match verify_jwt_token(&tok, &state.auth_state.jwt_secret) {
            Ok(c) => c,
            Err(e) => {
                warn!(
                    "WS dashboard auth rejected: dashboard={}, err={}",
                    dashboard_id, e
                );
                return StatusCode::UNAUTHORIZED.into_response();
            }
        },
        None => {
            warn!("WS dashboard missing token: dashboard={}", dashboard_id);
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    ws.on_upgrade(move |socket| handle_dashboard_socket(socket, state, dashboard_id, claims))
}

#[allow(clippy::as_conversions, clippy::cast_sign_loss)]
async fn handle_dashboard_socket(
    socket: axum::extract::ws::WebSocket,
    state: AppState,
    dashboard_id: Uuid,
    claims: Claims,
) {
    info!(
        "WebSocket connection established for dashboard: {}",
        dashboard_id
    );

    // P1-13: 订阅者租户上下文（只读通道）。普通用户按 claims.tenant_id 隔离看板数据；
    // 超管/服务/无 tenant claims → 显式平台哨兵，严格 RLS 下 fail-closed 为 0 行。
    let tenant_id = topems_shared_auth::middleware::get_tenant_id_from_claims(&claims);

    let (mut sender, mut receiver) = socket.split();

    // P1-13: 看板归属校验——仅允许订阅者本租户看板 / 公开看板（is_public），
    // 超管（tenant_id = nil）不受限；软删过滤。非归属一律 not found，不泄露存在性。
    let dashboard_row = match sqlx::query(
        r#"SELECT id, name, auto_refresh_enabled, auto_refresh_interval
           FROM bi.analytics_dashboards
           WHERE id = $1 AND deleted_at IS NULL
             AND (tenant_id = $2 OR $2 = '00000000-0000-0000-0000-000000000000' OR is_public = TRUE)"#,
    )
    .bind(dashboard_id)
    .bind(tenant_id)
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

    let Some(row) = dashboard_row else {
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
    };
    let dashboard_name: String = row.try_get("name").unwrap_or_default();
    let auto_refresh_enabled: Option<bool> = row.try_get("auto_refresh_enabled").ok().flatten();
    let auto_refresh_interval: Option<i32> = row.try_get("auto_refresh_interval").ok().flatten();
    let refresh_interval = if auto_refresh_enabled.unwrap_or(false) {
        auto_refresh_interval.unwrap_or(30) as u64
    } else {
        30
    };

    // Send initial connection message
    let init_msg = serde_json::json!({
        "type": "connected",
        "dashboard_id": dashboard_id,
        "dashboard_name": dashboard_name,
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
        FROM bi.analytics_widgets
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

#[allow(clippy::as_conversions)]
async fn refresh_widget_data(state: &AppState, dashboard_id: Uuid) -> Vec<serde_json::Value> {
    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config, query_config, cache_ttl_seconds
        FROM bi.analytics_widgets
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
