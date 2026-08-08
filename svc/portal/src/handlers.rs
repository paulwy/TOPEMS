/**
 * V80-E2: 辅助 Handler（健康检查、首页说明等轻量函数）
 * 从 main.rs SECTION 6 物理拆分
 */
use axum::{response::IntoResponse, Json};
use topems_shared_core::health::{build_health_response, ServiceHealth};
use topems_shared_core::response::ApiResponse;

use crate::{get_ws_connection_count, models, modules::graphql_schema};

/// V80-E2: 基础健康检查
pub async fn health_check() -> ServiceHealth {
    build_health_response("topems-portal", true)
}

/// V80-E2: 详细健康检查（含 WS 连接数、活跃订阅数、依赖健康）
pub async fn health_check_detailed() -> Json<ApiResponse<models::DetailedHealth>> {
    let ws_connections = get_ws_connection_count();
    let active_subscriptions = graphql_schema::get_active_subscriptions();
    let health = models::DetailedHealth {
        service_name: "topems-portal".to_string(),
        status: models::HealthStatus::Healthy,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: None, // @todo V81+ 接入 get_uptime()
        dependencies: Some(vec![
            models::DependencyHealth {
                name: "websocket".to_string(),
                status: models::HealthStatus::Healthy,
                message: format!(
                    "WS 连接: {}, 活跃订阅: {}",
                    ws_connections, active_subscriptions
                ),
            },
            models::DependencyHealth {
                name: "graphql".to_string(),
                status: models::HealthStatus::Healthy,
                message: "GraphQL 端点正常运行".to_string(),
            },
        ]),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    Json(ApiResponse::success(health, "健康检查完成"))
}

/// V80-E2: 首页 API 说明文档（开发环境引导）
pub async fn home() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success(
        "TOPEMS Unified Portal API

Public Endpoints:
  GET  /              - API documentation
  GET  /health        - Health check
  GET  /api/health/detailed - Detailed health check
  GET  /api/info      - API information
  GET  /api/plugins/info     - Plugin info
  GET  /api/plugins/health   - Plugin health
  GET  /metrics       - Prometheus metrics

Protected Endpoints (require JWT token):

  Services:
    GET  /api/core/portal/services        - List all services

  Todos:
    GET  /api/core/portal/todos           - Get todos
    POST /api/core/portal/todos           - Add todo
    POST /api/core/portal/todos/{id}      - Complete todo
    DELETE /api/core/portal/todos/{id}    - Delete todo

  User:
    GET  /api/core/portal/user            - Get user info

  Monitoring:
    GET  /api/core/portal/monitoring/services - Monitoring services
    GET  /api/core/portal/monitoring/metrics   - Monitoring metrics
    GET  /api/core/portal/monitoring/alerts    - Monitoring alerts
    POST /api/core/portal/monitoring/alerts/{id} - Acknowledge alert
    GET  /api/core/portal/monitoring/logs      - Monitoring logs

  Notifications:
    GET  /api/core/portal/notifications        - Notifications
    POST /api/core/portal/notifications/{id}   - Mark notification read
    POST /api/core/portal/notifications/mark-all-read - Mark all read

  Dashboard:
    GET  /api/core/portal/dashboard/stats      - Dashboard statistics
    GET  /api/core/portal/dashboard/quick-access - Quick access list
    POST /api/core/portal/dashboard/quick-access - Add quick access
    DELETE /api/core/portal/dashboard/quick-access/{id} - Remove quick access

  Announcements:
    GET  /api/core/portal/announcements        - List announcements
    GET  /api/core/portal/announcements/{id}   - Get announcement detail
    POST /api/core/portal/announcements        - Create announcement
    PUT  /api/core/portal/announcements/{id}   - Update announcement
    DELETE /api/core/portal/announcements/{id} - Delete announcement
    POST /api/core/portal/announcements/{id}/pin - Toggle pin
    GET  /api/core/portal/announcements/pinned - Pinned announcements

  Settings:
    GET  /api/core/portal/settings             - Get user settings
    PUT  /api/core/portal/settings             - Update user settings
    POST /api/core/portal/settings/reset       - Reset user settings
    GET  /api/core/portal/settings/themes      - Available themes
    GET  /api/core/portal/settings/languages   - Available languages

  Quick Actions:
    GET  /api/core/portal/quick-actions        - Quick actions list
    GET  /api/core/portal/quick-actions/favorites - Favorite actions
    POST /api/core/portal/quick-actions/{id}/favorite - Toggle favorite
    POST /api/core/portal/quick-actions/{id}/execute - Execute action

  Navigation:
    GET  /api/core/portal/navigation/menu      - Navigation menu
    GET  /api/core/portal/navigation/pinned    - Pinned apps
    POST /api/core/portal/navigation/pinned    - Add pinned app
    DELETE /api/core/portal/navigation/pinned/{id} - Remove pinned app
    PUT  /api/core/portal/navigation/pinned/reorder - Reorder pinned apps
",
        "首页",
    ))
}
