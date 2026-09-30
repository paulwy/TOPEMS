//! Master-data 主数据管理模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::master_data::handlers;
use crate::AppState;

/// Master-data 模块路由
pub fn master_data_router() -> Router<AppState> {
    Router::new()
        // 字典类型列表（真实数据库查询）
        .route("/api/master-data/dict-types", get(handlers::list_dict_types))
        // 字典项列表（真实数据库查询）
        .route("/api/master-data/dict-items", get(handlers::list_dict_items))
        // Schema注册表列表（真实数据库查询）
        .route("/api/master-data/schema-registry", get(handlers::list_schema_registry))
        // 动态数据列表（真实数据库查询）
        .route("/api/master-data/dynamic-data", get(handlers::list_dynamic_data))
}
