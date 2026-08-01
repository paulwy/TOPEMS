//! V79-1: AppState + GraphQL Schema 构建（从 main.rs SECTION 3 抽出）
//!
//! 负责：`AppState::new(db, event_publisher)` → `graphql_schema::build_schema(app_state)`。
//! 未来若 AppState 字段增多（Redis、缓存、配置），统一在此文件扩展，不污染 main orchestration。

use crate::modules;
use crate::shared::AppState;
use topems_shared::service_bootstrap::ServiceContext;

/// 构建 AppState（V79 标准化入口）。
///
/// 当前等价于 `AppState::new(ctx.db, ctx.event_publisher).await`，
/// 未来若新增依赖（Redis / Cache / ConfigCenter 等），在此函数内部扩展，
/// main.rs 无需感知，保证 orchestration 稳定。
pub async fn build_app_state(ctx: &ServiceContext) -> AppState {
    AppState::new(ctx.db.clone(), ctx.event_publisher.clone()).await
}

/// 构建 Portal BFF 的 GraphQL 聚合 Schema。
///
/// 当前等价于 `modules::graphql_schema::build_schema(app_state)`。
/// Schema 构建涉及 Query/Mutation/Subscription 根节点的组合，未来若增加
/// 权限检查器、复杂度分析器、Apollo 持久化查询等，在此函数内部扩展。
pub fn build_graphql_schema(app_state: &AppState) -> modules::graphql_schema::PortalSchema {
    modules::graphql_schema::build_schema(app_state.clone())
}
