//! Analytics 数据分析模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::analytics::handlers;
use crate::AppState;

/// Analytics 模块路由
pub fn analytics_router() -> Router<AppState> {
    Router::new()
        // 仪表板列表（真实数据库查询）
        .route("/api/analytics/dashboards", get(handlers::list_dashboards))
        // 数据集列表（真实数据库查询）
        .route("/api/analytics/datasets", get(handlers::list_datasets))
        // 数据源列表（真实数据库查询）
        .route("/api/analytics/datasources", get(handlers::list_datasources))
        // 组件列表（真实数据库查询）
        .route("/api/analytics/widgets", get(handlers::list_widgets))
}
