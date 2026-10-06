// ==================== graphql_schema_builder：Schema 构建（批次5 拆分） ====================
// 拆分自 graphql_schema.rs：PortalSchema 类型 + build_schema + APQ 缓存容量。
// 主文件保留根类型与 pub use 兼容层，外部经 modules::graphql_schema::* 引用路径不变。

#![allow(ambiguous_glob_reexports, unused_imports)]

use crate::modules::graphql_schema::{
    MutationRoot, QueryRoot, SubscriptionRoot, MAX_QUERY_COMPLEXITY, MAX_QUERY_DEPTH,
};
use crate::shared::AppState;
use async_graphql::dataloader::DataLoader;
use async_graphql::{
    extensions::apollo_persisted_queries::{ApolloPersistedQueries, LruCacheStorage},
    Schema,
};

use crate::modules::graphql_ai_assist::*;
use crate::modules::graphql_cache::*;
use crate::modules::graphql_dataloader::*;
use crate::modules::graphql_edge_computing::*;
use crate::modules::graphql_edge_v2::*;
use crate::modules::graphql_enterprise_security::*;
use crate::modules::graphql_entities::*;
use crate::modules::graphql_event_bus::*;
use crate::modules::graphql_federation::*;
use crate::modules::graphql_federation_runtime::*;
use crate::modules::graphql_federation_sdl::*;
use crate::modules::graphql_federation_v4::*;
use crate::modules::graphql_gateway_security::*;
use crate::modules::graphql_governance::*;
use crate::modules::graphql_helpers::*;
use crate::modules::graphql_monitoring::*;
use crate::modules::graphql_mutation_admin::*;
use crate::modules::graphql_mutation_impls::*;
use crate::modules::graphql_persisted_queries::*;
use crate::modules::graphql_query_business::*;
use crate::modules::graphql_query_impls::*;
use crate::modules::graphql_realtime_stream::*;
use crate::modules::graphql_redis_pubsub::*;
use crate::modules::graphql_security::*;
use crate::modules::graphql_semantic_cache::*;
use crate::modules::graphql_subscription_enhanced::*;
use crate::modules::graphql_subscription_impls::*;
use crate::modules::graphql_types::*;
use crate::modules::query_governance::*;
use crate::modules::rate_limiting::*;
use crate::modules::schema_versioning::*;

pub type PortalSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

const APQ_CACHE_CAPACITY: usize = 256;

pub fn build_schema(state: AppState) -> PortalSchema {
    let pool = state.pool.clone();

    // V42.0 Track E: 初始化企业级安全规则（字段权限 + 掩码规则）
    init_enterprise_security();
    // V42.0 Track B: 初始化联邦网关 V2 服务注册表（5 个服务元数据）
    init_service_registry();
    // V43.0 Track E: 初始化 AI 辅助功能（示例数据 + 缓存推荐）
    init_ai_assistance();
    // V45.0 Track E: 初始化 Schema 治理（5 个服务预置 Schema + 默认契约测试）
    init_schema_governance();
    // V49.0: 初始化自适应限流 + 熔断降级 + 负载感知路由
    init_rate_limiting();
    // V50.0: 初始化持久化查询管理 + 查询审计 + 企业级治理
    init_query_governance();
    // V51.0: 初始化 Schema 演进 + 破坏性变更检测 + 版本协商
    init_schema_versioning();

    Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(state)
        // V39.0 Phase 9: 注入 EventBus（多频道事件总线）
        .data(global_event_bus().clone())
        // V35.0 Phase 5: 注册 DataLoader
        .data(DataLoader::new(ServiceHealthLoader, tokio::spawn))
        .data(DataLoader::new(TodoLoader::new(pool), tokio::spawn))
        // V35.0 Phase 5: 查询复杂度限制（防止恶意复杂查询）
        .limit_complexity(MAX_QUERY_COMPLEXITY)
        // V35.0 Phase 5: 查询深度限制（防止过深嵌套查询）
        .limit_depth(MAX_QUERY_DEPTH)
        // V35.0 Phase 6: Apollo 持久化查询（APQ）— 查询白名单 + CDN 缓存基础
        // 前端发送查询哈希，后端从 LRU 缓存查找查询字符串，减少请求体积
        .extension(
            async_graphql::extensions::apollo_persisted_queries::ApolloPersistedQueries::new(
                async_graphql::extensions::apollo_persisted_queries::LruCacheStorage::new(
                    APQ_CACHE_CAPACITY,
                ),
            ),
        )
        .finish()
}
