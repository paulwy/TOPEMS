#![allow(dead_code)] // Reserved: GraphQL 聚合层模块，待业务接入后启用
#![allow(ambiguous_glob_reexports, hidden_glob_reexports)] // portal 模块级 glob re-export 设计模式
#![allow(unused_imports)] // 兼容层 pub use：供 feature_routes 等外部经 modules::graphql_schema::* 引用
//! V33.0 Portal BFF Phase 3: GraphQL 聚合层
//! V34.0 Portal BFF Phase 4: GraphQL Mutation + Subscription 支持
//! V35.0 Portal BFF Phase 5: DataLoader 批量加载 + 查询复杂度限制
//! V37.0 Portal BFF Phase 7: 完整 Apollo Federation v2（每服务实体 + 联邦网关）
//!
//! 提供单一端点让前端按需查询跨服务聚合数据，
//! 避免 N+1 REST 请求，支持字段级别的数据获取。
//! Phase 4 新增：
//! - Mutation：createTodo / completeTodo
//! - Subscription：serviceHealthChanged（WebSocket 实时推送）
//! Phase 5 新增：
//! - DataLoader：ServiceHealthLoader / TodoLoader 批量加载，解决 N+1 问题
//! - 查询复杂度限制：limit_complexity(1000) + limit_depth(10)
//! Phase 7 新增：
//! - Apollo Federation v2：每服务实体类型 + @key 指令 + Entity trait
//! - federation_sdl 查询：返回组合后的联邦 Schema SDL
//! - federation_entities 查询：批量解析跨服务联邦实体
//! - federation_service_sdls 查询：返回各服务的 SDL 片段
//!
//! ===== 审计登记（2026-10-03, P2-7）=====
//! 本文件 6537 行（portal 模块级 GraphQL 聚合层，含 Federation v2 / DataLoader /
//! Mutation / Subscription）。审计建议评估拆分；拆分风险高（Schema 注册顺序、
//! Object/Subscription 派生宏依赖同一模块作用域，拆分会触发大量 use 调整），
//! 且当前文件结构完整、编译通过、无功能缺陷，故本次不拆分，仅登记：
//! 若后续引入新的 GraphQL 域（如新增业务实体聚合），按域拆分为
//! `graphql/<domain>.rs` 子模块并在此汇总注册；届时必须保证
//! `cargo check --workspace` + `cargo test -p topems-portal --lib` 全绿。

use async_graphql::dataloader::DataLoader;
use async_graphql::{Context, Object, Schema, Subscription};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

pub use crate::modules::graphql_ai_assist::*;
pub use crate::modules::graphql_cache::*;
pub use crate::modules::graphql_dataloader::*;
pub use crate::modules::graphql_edge_computing::*;
pub use crate::modules::graphql_edge_v2::*;
pub use crate::modules::graphql_enterprise_security::*;
#[allow(unused_imports)]
pub use crate::modules::graphql_entities::*;
pub use crate::modules::graphql_event_bus::*;
pub use crate::modules::graphql_federation::*;
pub use crate::modules::graphql_federation_runtime::*;
pub use crate::modules::graphql_federation_sdl::*;
pub use crate::modules::graphql_federation_v4::*;
pub use crate::modules::graphql_gateway_security::*;
pub use crate::modules::graphql_governance::*;
pub use crate::modules::graphql_helpers::*;
pub use crate::modules::graphql_monitoring::*;
pub use crate::modules::graphql_persisted_queries::*;
pub use crate::modules::graphql_mutation_admin::*;
pub use crate::modules::graphql_mutation_impls::*;
pub use crate::modules::graphql_query_business::*;
pub use crate::modules::graphql_query_impls::*;
pub use crate::modules::graphql_realtime_stream::*;
pub use crate::modules::graphql_redis_pubsub::*;
#[allow(unused_imports)]
pub use crate::modules::graphql_security::*;
#[allow(unused_imports)]
pub use crate::modules::graphql_semantic_cache::*;
#[allow(unused_imports)]
pub use crate::modules::graphql_subscription_enhanced::*;
pub use crate::modules::graphql_types::*;
pub use crate::modules::query_governance::*;
pub use crate::modules::rate_limiting::*;
pub use crate::modules::schema_versioning::*;
// V44.0 拆分后：显式导入消歧（graphql_federation 与 rate_limiting 均定义 reset_circuit_breaker，
// 原 schema 本地副本为 `-> bool` 版本，与 graphql_federation 一致，故显式指向该版本）
use crate::modules::graphql_federation::reset_circuit_breaker;
use crate::shared::AppState;

// ==================== Query 根类型 ====================

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// 获取跨服务业务统计数据
    async fn business_stats(&self, ctx: &Context<'_>) -> async_graphql::Result<BusinessStatsGql> {
        impl_business_stats(ctx).await
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// 获取统一待办列表（聚合 workflow + portal + notification）
    async fn unified_todos(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<UnifiedTodoGql>> {
        impl_unified_todos(ctx).await
    }

    /// 获取所有服务健康状态（V34.0: 并行检查所有服务）
    async fn service_health(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceHealthGql>> {
        impl_service_health(_ctx).await
    }

    /// 获取复合仪表盘视图（V34.0: 并行获取 stats + todos + services）
    async fn dashboard(&self, ctx: &Context<'_>) -> async_graphql::Result<DashboardGql> {
        impl_dashboard(ctx).await
    }

    /// V35.0 Phase 5: 通过 DataLoader 获取单个服务健康状态
    /// 使用 DataLoader 自动批量合并多个请求，避免 N+1 问题
    async fn service_health_by_name(
        &self,
        ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Option<ServiceHealthGql>> {
        impl_service_health_by_name(ctx, service).await
    }

    /// V35.0 Phase 5: 通过 DataLoader 批量获取多个服务健康状态
    async fn service_health_batch(
        &self,
        ctx: &Context<'_>,
        services: Vec<String>,
    ) -> async_graphql::Result<Vec<ServiceHealthGql>> {
        impl_service_health_batch(ctx, services).await
    }

    /// V35.0 Phase 5: 通过 DataLoader 获取单个待办事项
    async fn todo_by_id(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<UnifiedTodoGql>> {
        impl_todo_by_id(ctx, id).await
    }

    /// V36.0 Phase 4: 获取扩展模块统计（qms/srm/lims/rd/ehs）
    /// 通过 BFF 并行调用各服务列表端点，聚合 total count
    async fn module_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<Vec<ModuleStatGql>> {
        impl_module_stats(_ctx).await
    }

    /// V36.0 Phase 6: 获取联邦服务注册表
    /// 返回所有已注册的联邦服务及其支持的实体类型
    async fn federated_services(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FederatedServiceGql>> {
        impl_federated_services(_ctx).await
    }

    /// V36.0 Phase 6: 联邦实体查询
    /// 通过 service + entity_type + id 跨服务查询实体
    async fn federated_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
    ) -> async_graphql::Result<FederatedEntityGql> {
        impl_federated_entity(_ctx, service, entity_type, id).await
    }

    /// V37.0 Phase 7: 获取组合后的联邦 Schema SDL
    /// 返回 Portal BFF 作为联邦网关组合后的完整 GraphQL Schema，
    /// 包含所有 @key 实体、查询、变更和订阅定义。
    async fn federation_sdl(&self, _ctx: &Context<'_>) -> async_graphql::Result<String> {
        impl_federation_sdl(_ctx).await
    }

    /// V37.0 Phase 7: 获取各服务的 SDL 片段
    /// 模拟 Apollo Federation v2 中每个服务暴露的 _service { sdl } 端点，
    /// 返回每个服务贡献给联邦的实体和字段定义。
    async fn federation_service_sdls(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FederationServiceSdlGql>> {
        impl_federation_service_sdls(_ctx).await
    }

    /// V37.0 Phase 7: 批量解析联邦实体（_entities）
    /// V38.0: 优化 - 按服务分组、错误处理、超时控制
    /// 接受一组实体表示（__typename + id），按服务分组后从各服务解析实体详情。
    #[allow(clippy::indexing_slicing)]
    async fn federation_entities(
        &self,
        _ctx: &Context<'_>,
        representations: Vec<serde_json::Value>,
    ) -> async_graphql::Result<Vec<FederationRepresentationGql>> {
        impl_federation_entities(_ctx, representations).await
    }

    /// V38.0: 批量获取同类型实体列表
    /// 接受 service + entity_type + ids 数组参数，批量获取多个同类型实体
    async fn federation_entity_list(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        ids: Vec<String>,
    ) -> async_graphql::Result<Vec<FederatedEntityGql>> {
        impl_federation_entity_list(_ctx, service, entity_type, ids).await
    }

    /// V37.0 Phase 7: 按 ID 获取 Customer 联邦实体
    async fn customer_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<CustomerEntityGql>> {
        impl_customer_entity(_ctx, id).await
    }

    /// V37.0 Phase 7: 按 ID 获取 Employee 联邦实体
    async fn employee_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<EmployeeEntityGql>> {
        impl_employee_entity(_ctx, id).await
    }

    /// V37.0 Phase 7: 按 ID 获取 Voucher 联邦实体
    async fn voucher_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<VoucherEntityGql>> {
        impl_voucher_entity(_ctx, id).await
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_possible_wrap
    )]
    /// V38.0: 查询当前活跃订阅数
    async fn subscription_count(&self, _ctx: &Context<'_>) -> async_graphql::Result<i32> {
        impl_subscription_count(_ctx).await
    }

    /// V40.0: 获取实体关系图
    /// 返回所有联邦实体及其关系的可视化数据
    async fn entity_relationship_graph(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<EntityRelationshipGraphGql> {
        impl_entity_relationship_graph(_ctx).await
    }

    /// V40.0: 获取联邦网关性能统计
    async fn federation_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationStatsGql> {
        impl_federation_stats(_ctx).await
    }

    /// V40.0: 优化后的批量实体列表查询（带缓存层）
    async fn federation_entity_list_cached(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        ids: Vec<String>,
    ) -> async_graphql::Result<Vec<FederatedEntityGql>> {
        impl_federation_entity_list_cached(_ctx, service, entity_type, ids).await
    }

    /// V41.0: 获取缓存统计信息
    async fn cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CacheStatsV41Gql> {
        impl_cache_stats(_ctx).await
    }

    /// V41.0: 获取缓存优化建议
    async fn cache_optimization_suggestions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CacheOptimizationSuggestionGql>> {
        impl_cache_optimization_suggestions(_ctx).await
    }

    /// V41.0: 获取查询预取规则
    async fn prefetch_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<QueryPrefetchRuleGql>> {
        impl_prefetch_rules(_ctx).await
    }

    /// V41.0: 获取缓存失效规则
    async fn cache_invalidation_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CacheInvalidationRuleGql>> {
        impl_cache_invalidation_rules(_ctx).await
    }

    /// V41.0 Track E: 获取发现的查询列表
    async fn discovered_queries(
        &self,
        _ctx: &Context<'_>,
        status: Option<String>,
    ) -> async_graphql::Result<Vec<DiscoveredQueryGql>> {
        impl_discovered_queries(_ctx, status).await
    }

    /// V41.0 Track E: 获取自动审批策略
    async fn auto_approval_policy(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AutoApprovalPolicyGql> {
        impl_auto_approval_policy(_ctx).await
    }

    /// V41.0 Track E: 获取安全审计报表
    async fn security_audit_report(
        &self,
        _ctx: &Context<'_>,
        period: String,
    ) -> async_graphql::Result<SecurityAuditReportGql> {
        impl_security_audit_report(_ctx, period).await
    }

    /// V41.0 Track E: 获取性能调优建议
    async fn performance_tuning_suggestions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<PerformanceTuningSuggestionGql>> {
        impl_performance_tuning_suggestions(_ctx).await
    }

    /// V41.0 Track E: 获取完整性能分析
    async fn performance_analysis(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<PerformanceAnalysisGql> {
        impl_performance_analysis(_ctx).await
    }

    /// V41.0 Track E: 获取白名单健康度
    async fn white_list_health(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<WhitelistHealthGql> {
        impl_white_list_health(_ctx).await
    }

    /// V42.0 Track E: 获取字段权限规则（可按 entity_type 过滤）
    async fn field_permissions(
        &self,
        _ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<FieldPermission>> {
        impl_field_permissions(_ctx, entity_type).await
    }

    /// V42.0 Track E: 获取掩码规则（可按 entity_type 过滤）
    async fn masking_rules(
        &self,
        _ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<MaskingRule>> {
        impl_masking_rules(_ctx, entity_type).await
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V42.0 Track E: 获取字段访问审计（按时间倒序，可按 entity_type 过滤）
    async fn field_access_audits(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<FieldAccessAudit>> {
        impl_field_access_audits(_ctx, limit, entity_type).await
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V42.0 Track E: 获取数据变更审计（按时间倒序，可按 entity_type 过滤）
    async fn data_change_audits(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<DataChangeAudit>> {
        impl_data_change_audits(_ctx, limit, entity_type).await
    }

    /// V42.0 Track E: 获取安全配置
    async fn security_config(&self, _ctx: &Context<'_>) -> async_graphql::Result<SecurityConfig> {
        impl_security_config(_ctx).await
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V42.0 Track B: 获取联邦查询计划（不执行）
    /// 解析查询字符串，生成执行计划（步骤 + 并行组 + 估算成本）
    async fn federation_v2_plan(
        &self,
        _ctx: &Context<'_>,
        query: String,
        variables: String,
    ) -> async_graphql::Result<FederationQueryPlanGql> {
        impl_federation_v2_plan(_ctx, query, variables).await
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V42.0 Track B: 执行联邦查询（计划 → 并发执行 → 合并结果）
    async fn federation_v2_execute(
        &self,
        _ctx: &Context<'_>,
        query: String,
        variables: String,
    ) -> async_graphql::Result<serde_json::Value> {
        impl_federation_v2_execute(_ctx, query, variables).await
    }

    /// V42.0 Track B: 联邦 V2 统计
    async fn federation_v2_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationV2StatsGql> {
        impl_federation_v2_stats(_ctx).await
    }

    /// V42.0 Track B: 已注册的服务列表
    async fn registered_services(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceMetadata>> {
        impl_registered_services(_ctx).await
    }

    /// V42.0 Track B: 实体元数据
    async fn entity_metadata(
        &self,
        _ctx: &Context<'_>,
        entity_name: String,
    ) -> async_graphql::Result<Option<EntityMetadata>> {
        impl_entity_metadata(_ctx, entity_name).await
    }

    /// V42.0 Track B: 自动组合的联邦 SDL
    async fn federation_v2_sdl(&self, _ctx: &Context<'_>) -> async_graphql::Result<String> {
        impl_federation_v2_sdl(_ctx).await
    }

    /// V43.0 Track B: 获取所有订阅会话
    async fn subscription_sessions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubscriptionSessionGql>> {
        impl_subscription_sessions(_ctx).await
    }

    /// V43.0 Track B: 获取订阅统计信息
    async fn subscription_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<SubscriptionStatsGql> {
        impl_subscription_stats(_ctx).await
    }

    /// V43.0 Track B: 获取所有活跃订阅
    async fn active_subscriptions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubscriptionInfoGql>> {
        impl_active_subscriptions(_ctx).await
    }

    /// V43.0 Track E: 获取查询优化建议
    async fn query_optimization_suggestions(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<Vec<QueryOptimizationSuggestionGql>> {
        impl_query_optimization_suggestions(_ctx, query_hash).await
    }

    /// V43.0 Track E: 获取查询健康度评分
    async fn query_health_score(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<QueryHealthScoreGql>> {
        impl_query_health_score(_ctx, query_hash).await
    }

    /// V43.0 Track E: 获取优化路线图
    async fn optimization_roadmap(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<OptimizationRoadmapGql> {
        impl_optimization_roadmap(_ctx).await
    }

    /// V43.0 Track E: 自然语言转 GraphQL（中英文）
    async fn nl2graphql(
        &self,
        _ctx: &Context<'_>,
        natural_language: String,
    ) -> async_graphql::Result<Nl2GraphqlResultGql> {
        impl_nl2graphql(_ctx, natural_language).await
    }

    /// V43.0 Track E: 获取智能缓存推荐
    async fn cache_recommendations(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<CacheRecommendationReportGql> {
        impl_cache_recommendations(_ctx).await
    }

    /// V43.0 Track E: 获取 AI 优化统计总览
    async fn ai_optimization_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AiOptimizationStatsGql> {
        impl_ai_optimization_stats(_ctx).await
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V44.0 Track B: 生成 V3 联邦查询计划
    async fn federation_v3_plan(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<FederationV3PlanGql> {
        impl_federation_v3_plan(_ctx, query).await
    }

    /// V44.0 Track B: 执行 V3 联邦查询
    async fn federation_v3_execute(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<serde_json::Value> {
        let vars = serde_json::Value::Null;
        let vars_hash = v3_variables_hash(&vars);
        let query_hash = {
            let mut hasher = Sha256::new();
            hasher.update(query.as_bytes());
            format!("{:x}", hasher.finalize())
        };

        if let Some(cached) = FederatedCacheManager::get_query_cache(&query_hash, &vars_hash) {
            return Ok(cached);
        }

        let plan = {
            let mut plan_cache = federation_v3_plan_cache()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            match plan_cache.get(&query_hash) {
                Some(p) => p.clone(),
                None => {
                    let plan = FederationV3Planner::build_plan_v3(&query, &vars);
                    plan_cache.put(query_hash.clone(), plan.clone());
                    plan
                }
            }
        };

        let result = FederationV3Executor::execute_plan_v3(&plan)
            .await
            .unwrap_or_else(|e| serde_json::json!({"error": e}));

        let services: Vec<String> = plan
            .nodes
            .iter()
            .filter_map(|n| n.service.clone())
            .collect();
        FederatedCacheManager::set_query_cache(
            &query_hash,
            &vars_hash,
            result.clone(),
            services,
            60000,
        );

        Ok(result)
    }

    /// V44.0 Track B: V3 网关统计
    async fn federation_v3_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationV3StatsGql> {
        Ok(get_federation_v3_stats())
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V44.0 Track B: 执行轨迹列表
    async fn federation_v3_traces(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<PlanExecutionTraceGql>> {
        Ok(get_v3_traces(limit.unwrap_or(20) as usize))
    }

    /// V44.0 Track B: 熔断器状态
    async fn federation_circuit_breakers(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CircuitBreakerStateGqlSimple>> {
        Ok(get_all_circuit_breakers())
    }

    /// V44.0 Track B: 缓存统计
    async fn federation_cache_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationCacheStatsGql> {
        Ok(get_v3_cache_stats())
    }

    /// V44.0 Track E: 查询追踪列表
    async fn graphql_traces(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
        operation_name: Option<String>,
        status: Option<String>,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<QueryTraceGql>> {
        Ok(list_traces(query_hash, operation_name, status, limit))
    }

    /// V44.0 Track E: 追踪详情
    async fn graphql_trace(
        &self,
        _ctx: &Context<'_>,
        trace_id: String,
    ) -> async_graphql::Result<Option<QueryTraceGql>> {
        Ok(get_trace(&trace_id))
    }

    /// V44.0 Track E: 实时指标
    async fn graphql_metrics(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<GraphqlMetricsGql> {
        Ok(get_metrics(window.unwrap_or(MetricsWindow::FiveMinutes)))
    }

    /// V44.0 Track E: 告警列表
    async fn graphql_alerts(
        &self,
        _ctx: &Context<'_>,
        status: Option<String>,
        level: Option<AlertLevel>,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<GraphqlAlertGql>> {
        Ok(get_alerts(status, level, limit))
    }

    /// V44.0 Track E: 告警规则列表
    async fn graphql_alert_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<AlertRuleGql>> {
        Ok(get_alert_rules())
    }

    /// V44.0 Track E: 监控仪表盘总览
    async fn monitoring_dashboard(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<MonitoringDashboardStatsGql> {
        Ok(get_monitoring_dashboard())
    }

    /// V44.0 Track E: 慢查询 Top N
    async fn top_slow_queries(
        &self,
        _ctx: &Context<'_>,
        limit: Option<usize>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<Vec<TopSlowQueryGql>> {
        Ok(get_top_slow_queries(
            limit,
            window.unwrap_or(MetricsWindow::FifteenMinutes),
        ))
    }

    /// V44.0 Track E: 错误率趋势
    async fn error_rate_trend(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
        interval: Option<i64>,
    ) -> async_graphql::Result<ErrorRateTrendGql> {
        Ok(get_error_rate_trend(
            window.unwrap_or(MetricsWindow::OneHour),
            interval,
        ))
    }

    /// V44.0 Track E: 查询延迟分布
    async fn query_latency_distribution(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<QueryLatencyDistributionGql> {
        Ok(get_query_latency_distribution(
            window.unwrap_or(MetricsWindow::FifteenMinutes),
        ))
    }

    // ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

    /// V45.0: 边缘节点列表
    async fn edge_nodes(&self, _ctx: &Context<'_>) -> async_graphql::Result<Vec<EdgeNodeGql>> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(state
            .nodes
            .iter()
            .map(|n| EdgeNodeGql {
                id: n.id.clone(),
                region: n.region.clone(),
                location: n.location.clone(),
                latency_ms: n.latency_ms,
                health: n.health,
                capacity: n.capacity,
                current_load: n.current_load,
                functions_deployed: n.functions_deployed,
            })
            .collect())
    }

    /// V45.0: 边缘函数列表
    async fn edge_functions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<EdgeFunctionGql>> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(state
            .functions
            .iter()
            .map(|f| EdgeFunctionGql {
                id: f.id.clone(),
                name: f.name.clone(),
                handler: f.handler.clone(),
                route_pattern: f.route_pattern.clone(),
                cache_ttl_ms: f.cache_ttl_ms,
                deployed_to_regions: f.deployed_to_regions.clone(),
                version: f.version.clone(),
                enabled: f.enabled,
            })
            .collect())
    }

    /// V45.0: 边缘计算统计
    async fn edge_compute_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<EdgeComputeStatsGql> {
        Ok(EdgeComputeManager::get_stats())
    }

    /// V45.0: CDN 缓存统计
    async fn cdn_cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CdnStatsGql> {
        Ok(CdnCacheManager::get_stats())
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V45.0: CDN 缓存条目列表（可按标签过滤）
    async fn cdn_cache_entries(
        &self,
        _ctx: &Context<'_>,
        tags: Option<Vec<String>>,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<CdnCacheEntryGql>> {
        let tags_ref = tags.as_deref();
        Ok(CdnCacheManager::get_entries(
            tags_ref,
            limit.unwrap_or(50) as usize,
        ))
    }

    /// V45.0: 流式响应统计
    async fn stream_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<StreamStatsGql> {
        Ok(StreamingResponseManager::get_stats())
    }

    /// V45.0: 流式配置
    async fn stream_config(&self, _ctx: &Context<'_>) -> async_graphql::Result<StreamConfigGql> {
        Ok(StreamingResponseManager::get_config())
    }

    /// V45.0: 延迟字段列表（可按 query_hash 过滤）
    async fn deferred_fields(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<Vec<DeferredFieldGql>> {
        Ok(StreamingResponseManager::get_deferred_fields(
            query_hash.as_deref(),
        ))
    }

    // ==================== V45.0 Track E: GraphQL 企业级治理 ====================

    /// V45.0: Schema 注册表（返回指定服务的所有已注册版本）
    async fn schema_registry(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<SchemaRegistryEntryGql>> {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.list_versions(&service))
    }

    /// V45.0: 版本列表（Schema 版本管理器中的版本列表）
    async fn schema_versions(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<SchemaVersionGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.list_versions(&service))
    }

    /// V45.0: 版本详情
    async fn schema_version_detail(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<Option<SchemaVersionGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.get_version(&service, &version))
    }

    /// V45.0: 版本差异
    async fn schema_diff(
        &self,
        _ctx: &Context<'_>,
        service: String,
        from_version: String,
        to_version: String,
    ) -> async_graphql::Result<Option<VersionDiffGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.diff(&service, &from_version, &to_version))
    }

    /// V45.0: 契约测试列表（service 为空时返回全部）
    async fn contract_tests(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<ContractTestGql>> {
        let runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner
            .tests
            .values()
            .filter(|t| service.is_empty() || t.service == service)
            .cloned()
            .collect())
    }

    /// V45.0: 测试结果（按 test_id 查询历史结果，limit 控制条数）
    async fn contract_test_results(
        &self,
        _ctx: &Context<'_>,
        test_id: String,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<ContractTestResultGql>> {
        let runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.get_results(&test_id, limit.unwrap_or(50)))
    }

    /// V45.0: Breaking Change 检测（对比两个版本之间的 Breaking Change）
    async fn breaking_changes(
        &self,
        _ctx: &Context<'_>,
        service: String,
        from_version: String,
        to_version: String,
    ) -> async_graphql::Result<Vec<SchemaChangeGql>> {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(diff) = registry.diff_versions(&service, &from_version, &to_version) {
            Ok(diff.breaking_changes)
        } else {
            Ok(vec![])
        }
    }

    /// V45.0: 治理统计
    async fn schema_governance_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<SchemaGovernanceStatsGql> {
        Ok(get_schema_governance_stats())
    }

    /// V45.0: 各服务治理信息
    async fn service_governance_info(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceGovernanceInfoGql>> {
        Ok(get_service_governance_info())
    }

    // ==================== V49.0: 自适应限流 + 熔断降级 + 负载感知路由 ====================

    /// V49.0: 获取所有服务的限流器状态
    async fn rate_limiter_status(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<RateLimiterStatusGql>> {
        Ok(get_rate_limiter_statuses())
    }

    /// V49.0: 获取所有服务的限流器配置
    async fn rate_limiter_configs(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<RateLimiterConfigGql>> {
        Ok(get_rate_limiter_configs())
    }

    /// V49.0: 获取所有服务的熔断器状态
    async fn circuit_breaker_states(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CircuitBreakerStateGql>> {
        Ok(get_circuit_breaker_states())
    }

    /// V49.0: 获取所有服务的降级配置
    async fn degradation_configs(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceDegradationConfigGql>> {
        Ok(get_degradation_configs())
    }

    /// V49.0: 获取服务负载指标（可按服务过滤）
    async fn load_metrics(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<LoadMetricsGql>> {
        if let Some(svc) = service {
            Ok(get_load_metrics(&svc))
        } else {
            Ok(get_all_load_metrics())
        }
    }

    /// V49.0: 获取实例健康状态（可按服务过滤）
    async fn instance_health(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<InstanceHealthGql>> {
        if let Some(svc) = service {
            Ok(get_instance_healths(&svc))
        } else {
            Ok(get_all_instance_healths())
        }
    }

    /// V49.0: 对指定服务做出路由决策
    async fn routing_decision(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<RoutingDecisionGql> {
        Ok(make_routing_decision(&service))
    }

    /// V49.0: 获取路由统计
    async fn routing_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AdaptiveRoutingStatsGql> {
        Ok(get_routing_stats())
    }

    /// V49.0: 获取路由规则（可按服务过滤）
    async fn routing_rules(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<RoutingRuleGql>> {
        Ok(get_routing_rules(service.as_deref()))
    }

    /// V49.0: 获取服务流量策略
    async fn traffic_policy(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<TrafficPolicyGql> {
        Ok(get_traffic_policy(&service))
    }
}

// ==================== Mutation 根类型（V34.0 Phase 4） ====================

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// 创建待办事项
    async fn create_todo(
        &self,
        ctx: &Context<'_>,
        title: String,
        user_id: Option<String>,
    ) -> async_graphql::Result<UnifiedTodoGql> {
        impl_create_todo(ctx, title, user_id).await
    }

    /// 完成待办事项
    async fn complete_todo(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        impl_complete_todo(ctx, id).await
    }

    /// 删除待办事项（软删除）
    async fn delete_todo(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        impl_delete_todo(ctx, id).await
    }

    /// V38.0: 创建实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST POST 端点
    async fn create_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        data: serde_json::Value,
    ) -> async_graphql::Result<serde_json::Value> {
        impl_create_entity(_ctx, service, entity_type, data).await
    }

    /// V38.0: 更新实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST PUT 端点
    async fn update_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
        data: serde_json::Value,
    ) -> async_graphql::Result<serde_json::Value> {
        impl_update_entity(_ctx, service, entity_type, id, data).await
    }

    /// V38.0: 删除实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST DELETE 端点
    async fn delete_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
    ) -> async_graphql::Result<bool> {
        impl_delete_entity(_ctx, service, entity_type, id).await
    }

    // ==================== V39.0 Phase 9: 事件发布 Mutations ====================

    /// 发布主数据变更事件
    /// 其他服务通过此 mutation 发布主数据变更事件到事件总线。
    async fn publish_master_data_event(
        &self,
        ctx: &Context<'_>,
        domain: String,
        action: String,
        master_data_id: String,
        source_service: String,
    ) -> async_graphql::Result<MasterDataEventGql> {
        impl_publish_master_data_event(ctx, domain, action, master_data_id, source_service).await
    }

    /// 发布通知事件
    async fn publish_notification(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        title: String,
        content: String,
        notification_type: String,
    ) -> async_graphql::Result<NotificationEventGql> {
        impl_publish_notification(ctx, user_id, title, content, notification_type).await
    }

    /// 发布工作流任务事件
    async fn publish_workflow_task(
        &self,
        ctx: &Context<'_>,
        task_id: String,
        assignee_id: String,
        instance_title: String,
        priority: String,
        status: String,
    ) -> async_graphql::Result<WorkflowTaskEventGql> {
        impl_publish_workflow_task(ctx, task_id, assignee_id, instance_title, priority, status).await
    }

    /// 发布订单状态变更事件
    async fn publish_order_status(
        &self,
        ctx: &Context<'_>,
        order_id: String,
        order_type: String,
        old_status: String,
        new_status: String,
    ) -> async_graphql::Result<OrderStatusEventGql> {
        impl_publish_order_status(ctx, order_id, order_type, old_status, new_status).await
    }

    /// V41.0: 手动失效缓存（按模式匹配）
    async fn cache_invalidate(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
    ) -> async_graphql::Result<bool> {
        impl_cache_invalidate(_ctx, pattern).await
    }

    /// V41.0: 清空所有缓存
    async fn cache_clear(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        impl_cache_clear(_ctx).await
    }

    /// V41.0: 触发查询预取
    async fn prefetch_trigger(
        &self,
        _ctx: &Context<'_>,
        query_name: String,
    ) -> async_graphql::Result<bool> {
        impl_prefetch_trigger(_ctx, query_name).await
    }

    /// V41.0 Track E: 审批通过发现的查询
    async fn approve_discovered_query(
        &self,
        _ctx: &Context<'_>,
        hash: String,
    ) -> async_graphql::Result<bool> {
        impl_approve_discovered_query(_ctx, hash).await
    }

    /// V41.0 Track E: 拒绝发现的查询
    async fn reject_discovered_query(
        &self,
        _ctx: &Context<'_>,
        hash: String,
    ) -> async_graphql::Result<bool> {
        impl_reject_discovered_query(_ctx, hash).await
    }

    /// V41.0 Track E: 更新自动审批策略
    async fn update_auto_approval_policy(
        &self,
        _ctx: &Context<'_>,
        policy: AutoApprovalPolicyInput,
    ) -> async_graphql::Result<bool> {
        impl_update_auto_approval_policy(_ctx, policy).await
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V41.0 Track E: 手动触发自动审批扫描
    async fn run_auto_approval_scan(&self, _ctx: &Context<'_>) -> async_graphql::Result<i32> {
        impl_run_auto_approval_scan(_ctx).await
    }

    /// V42.0 Track E: 设置字段权限（覆盖同 entity_type + field_name 的规则）
    async fn set_field_permission(
        &self,
        _ctx: &Context<'_>,
        permission: FieldPermissionInput,
    ) -> async_graphql::Result<FieldPermission> {
        impl_set_field_permission(_ctx, permission).await
    }

    /// V42.0 Track E: 移除字段权限
    async fn remove_field_permission(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        field_name: String,
    ) -> async_graphql::Result<bool> {
        impl_remove_field_permission(_ctx, entity_type, field_name).await
    }

    /// V42.0 Track E: 设置掩码规则（覆盖同 entity_type + field_name 的规则）
    async fn set_masking_rule(
        &self,
        _ctx: &Context<'_>,
        rule: MaskingRuleInput,
    ) -> async_graphql::Result<MaskingRule> {
        impl_set_masking_rule(_ctx, rule).await
    }

    /// V42.0 Track E: 移除掩码规则
    async fn remove_masking_rule(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        field_name: String,
    ) -> async_graphql::Result<bool> {
        impl_remove_masking_rule(_ctx, entity_type, field_name).await
    }

    /// V42.0 Track E: 更新安全配置
    async fn update_security_config(
        &self,
        _ctx: &Context<'_>,
        config: SecurityConfigInput,
    ) -> async_graphql::Result<SecurityConfig> {
        impl_update_security_config(_ctx, config).await
    }

    /// V43.0 Track B: 取消指定订阅
    async fn cancel_subscription(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        impl_cancel_subscription(_ctx, id).await
    }

    /// V43.0 Track B: 取消指定连接的所有订阅
    async fn cancel_all_subscriptions(
        &self,
        _ctx: &Context<'_>,
        connection_id: String,
    ) -> async_graphql::Result<u64> {
        impl_cancel_all_subscriptions(_ctx, connection_id).await
    }

    /// V43.0 Track E: 应用查询优化建议
    async fn apply_optimization(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        suggestion_id: String,
    ) -> async_graphql::Result<bool> {
        impl_apply_optimization(_ctx, query_hash, suggestion_id).await
    }

    /// V43.0 Track E: 生成缓存推荐（返回推荐变更数）
    async fn generate_cache_recommendations(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<u32> {
        impl_generate_cache_recommendations(_ctx).await
    }

    /// V43.0 Track E: 接受缓存推荐
    async fn accept_cache_recommendation(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        impl_accept_cache_recommendation(_ctx, query_hash).await
    }

    /// V44.0 Track B: 重置熔断器
    async fn federation_reset_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        impl_federation_reset_circuit_breaker(_ctx, service).await
    }

    /// V44.0 Track B: 失效查询缓存
    async fn federation_cache_invalidate(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<bool> {
        impl_federation_cache_invalidate(_ctx, query_hash).await
    }

    /// V44.0 Track B: 清除所有缓存
    async fn federation_cache_clear(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        impl_federation_cache_clear(_ctx).await
    }

    /// V44.0 Track B: 设置熔断器配置
    async fn federation_set_circuit_breaker_config(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: CircuitBreakerConfigInputGql,
    ) -> async_graphql::Result<bool> {
        impl_federation_set_circuit_breaker_config(_ctx, service, config).await
    }

    /// V44.0 Track E: 添加告警规则
    async fn add_alert_rule(
        &self,
        _ctx: &Context<'_>,
        input: AlertRuleInput,
    ) -> async_graphql::Result<String> {
        impl_add_alert_rule(_ctx, input).await
    }

    /// V44.0 Track E: 更新告警规则
    async fn update_alert_rule(
        &self,
        _ctx: &Context<'_>,
        id: String,
        input: AlertRuleInput,
    ) -> async_graphql::Result<bool> {
        impl_update_alert_rule(_ctx, id, input).await
    }

    /// V44.0 Track E: 删除告警规则
    async fn delete_alert_rule(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        impl_delete_alert_rule(_ctx, id).await
    }

    /// V44.0 Track E: 确认告警
    async fn acknowledge_alert(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        impl_acknowledge_alert(_ctx, id).await
    }

    /// V44.0 Track E: 解决告警
    async fn resolve_alert(&self, _ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        impl_resolve_alert(_ctx, id).await
    }

    /// V44.0 Track E: 测试告警
    async fn test_alert(
        &self,
        _ctx: &Context<'_>,
        alert_type: AlertType,
        level: AlertLevel,
    ) -> async_graphql::Result<String> {
        impl_test_alert(_ctx, alert_type, level).await
    }

    /// V44.0 Track E: 重置指标
    async fn reset_graphql_metrics(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        impl_reset_graphql_metrics(_ctx).await
    }

    // ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

    /// V45.0: 部署边缘函数
    async fn deploy_edge_function(
        &self,
        _ctx: &Context<'_>,
        name: String,
        handler: String,
        route_pattern: String,
        cache_ttl_ms: i64,
    ) -> async_graphql::Result<String> {
        impl_deploy_edge_function(_ctx, name, handler, route_pattern, cache_ttl_ms).await
    }

    /// V45.0: 在边缘节点执行函数
    async fn execute_at_edge(
        &self,
        _ctx: &Context<'_>,
        function_name: String,
        input: serde_json::Value,
        region: Option<String>,
    ) -> async_graphql::Result<serde_json::Value> {
        impl_execute_at_edge(_ctx, function_name, input, region).await
    }

    /// V45.0: CDN 缓存预热
    async fn cdn_cache_warm(
        &self,
        _ctx: &Context<'_>,
        query_hashes: Vec<String>,
    ) -> async_graphql::Result<u32> {
        impl_cdn_cache_warm(_ctx, query_hashes).await
    }

    /// V45.0: CDN 缓存预取
    async fn cdn_cache_prefetch(
        &self,
        _ctx: &Context<'_>,
        query_hashes: Vec<String>,
    ) -> async_graphql::Result<u32> {
        impl_cdn_cache_prefetch(_ctx, query_hashes).await
    }

    /// V45.0: 按标签失效 CDN 缓存
    async fn cdn_cache_invalidate_by_tag(
        &self,
        _ctx: &Context<'_>,
        tags: Vec<String>,
    ) -> async_graphql::Result<u32> {
        impl_cdn_cache_invalidate_by_tag(_ctx, tags).await
    }

    /// V45.0: 清空所有 CDN 缓存
    async fn cdn_cache_purge_all(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        impl_cdn_cache_purge_all(_ctx).await
    }

    /// V45.0: 更新流式配置
    async fn update_stream_config(
        &self,
        _ctx: &Context<'_>,
        config: StreamConfigInput,
    ) -> async_graphql::Result<bool> {
        impl_update_stream_config(_ctx, config).await
    }

    // ==================== V45.0 Track E: GraphQL 企业级治理 ====================

    /// V45.0: 注册 Schema（同时发布到版本管理器）
    async fn register_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
        sdl: String,
    ) -> async_graphql::Result<String> {
        impl_register_schema(_ctx, service, version, sdl).await
    }

    /// V45.0: 废弃 Schema 版本
    async fn deprecate_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        impl_deprecate_schema_version(_ctx, service, version).await
    }

    /// V45.0: 退役 Schema 版本
    async fn retire_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        impl_retire_schema_version(_ctx, service, version).await
    }

    /// V45.0: 添加契约测试
    async fn add_contract_test(
        &self,
        _ctx: &Context<'_>,
        input: ContractTestInput,
    ) -> async_graphql::Result<String> {
        impl_add_contract_test(_ctx, input).await
    }

    /// V45.0: 更新契约测试
    async fn update_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
        input: ContractTestInput,
    ) -> async_graphql::Result<bool> {
        impl_update_contract_test(_ctx, id, input).await
    }

    /// V45.0: 删除契约测试
    async fn delete_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        impl_delete_contract_test(_ctx, id).await
    }

    /// V45.0: 运行契约测试
    async fn run_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<ContractTestResultGql> {
        impl_run_contract_test(_ctx, id).await
    }

    /// V45.0: 运行所有契约测试（可按 service 过滤，返回运行数量）
    async fn run_all_contract_tests(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<u32> {
        impl_run_all_contract_tests(_ctx, service).await
    }

    /// V45.0: 发布 Schema 版本（从注册表获取 SDL 并发布到版本管理器）
    async fn publish_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
        changelog: String,
    ) -> async_graphql::Result<String> {
        impl_publish_schema_version(_ctx, service, version, changelog).await
    }

    /// V45.0: 提升 Schema 版本为 Active
    async fn promote_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        impl_promote_schema_version(_ctx, service, version).await
    }

    /// V45.0: 回滚 Schema 到指定版本
    async fn rollback_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
        to_version: String,
    ) -> async_graphql::Result<bool> {
        impl_rollback_schema(_ctx, service, to_version).await
    }

    // ==================== V49.0: 自适应限流 + 熔断降级 + 负载感知路由 ====================

    /// V49.0: 配置服务限流器
    async fn configure_rate_limiter(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: RateLimiterConfigInput,
    ) -> async_graphql::Result<RateLimiterConfigGql> {
        impl_configure_rate_limiter(_ctx, service, config).await
    }

    /// V49.0: 配置服务熔断器
    async fn configure_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: crate::modules::rate_limiting::CircuitBreakerConfigInput,
    ) -> async_graphql::Result<crate::modules::rate_limiting::CircuitBreakerStateGql> {
        impl_configure_circuit_breaker(_ctx, service, config).await
    }

    /// V49.0: 重置服务熔断器
    async fn reset_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        impl_reset_circuit_breaker(_ctx, service).await
    }

    /// V49.0: 配置服务降级策略
    async fn configure_degradation(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: DegradationConfigInput,
    ) -> async_graphql::Result<ServiceDegradationConfigGql> {
        impl_configure_degradation(_ctx, service, config).await
    }

    /// V49.0: 注册服务实例
    async fn register_instance(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
        url: String,
    ) -> async_graphql::Result<InstanceHealthGql> {
        impl_register_instance(_ctx, service, instance_id, url).await
    }

    /// V49.0: 更新实例负载指标
    async fn update_instance_metrics(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
        cpu_usage: f64,
        memory_usage: f64,
        active_requests: u64,
        queue_length: u64,
        latency_ms: f64,
        error_rate: f64,
    ) -> async_graphql::Result<LoadMetricsGql> {
        impl_update_instance_metrics(_ctx, service, instance_id, cpu_usage, memory_usage, active_requests, queue_length, latency_ms, error_rate).await
    }

    /// V49.0: 标记实例为健康
    async fn mark_instance_healthy(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
    ) -> async_graphql::Result<bool> {
        impl_mark_instance_healthy(_ctx, service, instance_id).await
    }

    /// V49.0: 标记实例为不健康（同时记录熔断失败）
    async fn mark_instance_unhealthy(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
    ) -> async_graphql::Result<bool> {
        impl_mark_instance_unhealthy(_ctx, service, instance_id).await
    }

    /// V49.0: 创建路由规则
    async fn set_routing_rule(
        &self,
        _ctx: &Context<'_>,
        rule: RoutingRuleInput,
    ) -> async_graphql::Result<RoutingRuleGql> {
        impl_set_routing_rule(_ctx, rule).await
    }

    /// V49.0: 删除路由规则
    async fn delete_routing_rule(
        &self,
        _ctx: &Context<'_>,
        rule_id: String,
    ) -> async_graphql::Result<bool> {
        impl_delete_routing_rule(_ctx, rule_id).await
    }

    // ==================== V49.0 Phase 19: AI 查询路由 + Schema Stitching + 智能缓存 ====================

    /// AI 查询路由分析
    async fn ai_route_query(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiRoutingDecisionGql> {
        impl_ai_route_query(_ctx, query).await
    }

    /// AI 查询意图识别
    async fn ai_detect_intent(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiQueryIntent> {
        impl_ai_detect_intent(_ctx, query).await
    }

    /// 获取指定名称的 Stitched Schema
    async fn stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<StitchedSchemaGql> {
        impl_stitched_schema(_ctx, name).await
    }

    /// 获取所有已注册的子 Schema 列表
    async fn stitched_sub_schemas(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubSchemaEntryGql>> {
        impl_stitched_sub_schemas(_ctx).await
    }

    /// 获取字段映射规则列表
    async fn stitched_field_mappings(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FieldMappingRuleGql>> {
        impl_stitched_field_mappings(_ctx).await
    }

    /// 智能缓存整体统计
    async fn cache_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<crate::modules::rate_limiting::CacheStatsGql> {
        impl_mutation_cache_stats(_ctx).await
    }

    /// 查询单个缓存条目
    async fn cache_get_entry(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        impl_cache_get_entry(_ctx, key).await
    }

    /// 按模式列出缓存条目
    async fn cache_list_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CacheEntryGql>> {
        impl_cache_list_entries(_ctx, pattern).await
    }

    /// 列出所有缓存策略
    async fn cache_list_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CachePolicyGql>> {
        impl_cache_list_policies(_ctx).await
    }

    // ==================== V50.0 Phase 20: 持久化查询管理 + 查询审计 + 企业级治理 ====================

    /// 获取持久化查询
    async fn persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        impl_persisted_query(_ctx, query_hash).await
    }

    /// 列出持久化查询
    async fn persisted_queries(
        &self,
        _ctx: &Context<'_>,
        page: Option<u32>,
        page_size: Option<u32>,
        status: Option<crate::modules::query_governance::QueryStatus>,
    ) -> async_graphql::Result<crate::modules::query_governance::PersistedQueryListGql> {
        impl_persisted_queries(_ctx, page, page_size, status).await
    }

    /// 按标签搜索持久化查询
    async fn persisted_queries_by_tag(
        &self,
        _ctx: &Context<'_>,
        tag: String,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::PersistedQueryGql>> {
        impl_persisted_queries_by_tag(_ctx, tag).await
    }

    /// 获取审计统计
    async fn audit_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<crate::modules::query_governance::AuditStatsGql> {
        impl_audit_stats(_ctx).await
    }

    /// 查询审计日志
    async fn audit_entries(
        &self,
        _ctx: &Context<'_>,
        filter: crate::modules::query_governance::QueryAuditFilterInput,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::QueryAuditEntryGql>> {
        impl_audit_entries(_ctx, filter, page, page_size).await
    }

    /// 获取查询配额
    async fn query_quota(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryQuotaGql>> {
        impl_query_quota(_ctx, entity_type, entity_id).await
    }

    /// 获取审批请求
    async fn approval_request(
        &self,
        _ctx: &Context<'_>,
        request_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryApprovalRequestGql>>
    {
        impl_approval_request(_ctx, request_id).await
    }

    /// 列出待审批请求
    async fn pending_approval_requests(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::QueryApprovalRequestGql>> {
        impl_pending_approval_requests(_ctx).await
    }

    /// 获取治理策略
    async fn governance_policy(
        &self,
        _ctx: &Context<'_>,
        policy_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::GovernancePolicyGql>> {
        impl_governance_policy(_ctx, policy_id).await
    }

    /// 列出治理策略
    async fn governance_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::GovernancePolicyGql>> {
        impl_governance_policies(_ctx).await
    }

    /// 获取字段访问控制
    async fn field_access_control(
        &self,
        _ctx: &Context<'_>,
        field_path: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::FieldAccessControlGql>>
    {
        impl_field_access_control(_ctx, field_path).await
    }

    /// 检查查询治理
    async fn check_governance(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        user_id: String,
        user_roles: Vec<String>,
        query_fields: Vec<String>,
    ) -> async_graphql::Result<crate::modules::query_governance::GovernanceCheckResultGql> {
        impl_check_governance(_ctx, query_hash, user_id, user_roles, query_fields).await
    }

    // ==================== V49.0 Phase 19 Mutation: AI 查询路由 + Schema Stitching + 智能缓存 ====================

    /// 注册/更新子 Schema
    async fn register_sub_schema(
        &self,
        _ctx: &Context<'_>,
        entry: crate::modules::rate_limiting::SubSchemaEntryInput,
    ) -> async_graphql::Result<crate::modules::rate_limiting::SubSchemaEntryGql> {
        impl_register_sub_schema(_ctx, entry).await
    }

    /// 移除子 Schema
    async fn remove_sub_schema(
        &self,
        _ctx: &Context<'_>,
        service_name: String,
    ) -> async_graphql::Result<bool> {
        impl_remove_sub_schema(_ctx, service_name).await
    }

    /// 设置类型合并策略
    async fn set_merge_strategy(
        &self,
        _ctx: &Context<'_>,
        strategy: crate::modules::rate_limiting::TypeMergeStrategy,
    ) -> async_graphql::Result<bool> {
        impl_set_merge_strategy(_ctx, strategy).await
    }

    /// 添加字段映射规则
    async fn add_field_mapping(
        &self,
        _ctx: &Context<'_>,
        rule: crate::modules::rate_limiting::FieldMappingRuleInput,
    ) -> async_graphql::Result<bool> {
        impl_add_field_mapping(_ctx, rule).await
    }

    /// 移除字段映射规则
    async fn remove_field_mapping(
        &self,
        _ctx: &Context<'_>,
        source_field: String,
        target_field: String,
    ) -> async_graphql::Result<bool> {
        impl_remove_field_mapping(_ctx, source_field, target_field).await
    }

    /// 刷新 Stitched Schema
    async fn refresh_stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<crate::modules::rate_limiting::StitchedSchemaGql> {
        impl_refresh_stitched_schema(_ctx, name).await
    }

    /// 设置缓存条目
    async fn cache_set(
        &self,
        _ctx: &Context<'_>,
        key: String,
        value: String,
        policy: Option<crate::modules::rate_limiting::CachePolicyInput>,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        impl_cache_set(_ctx, key, value, policy).await
    }

    /// 获取缓存条目
    async fn cache_get(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        impl_cache_get(_ctx, key).await
    }

    /// 删除缓存条目
    async fn cache_delete(&self, _ctx: &Context<'_>, key: String) -> async_graphql::Result<bool> {
        impl_cache_delete(_ctx, key).await
    }

    /// 按模式清空智能缓存条目
    async fn cache_clear_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<u64> {
        impl_cache_clear_entries(_ctx, pattern).await
    }

    /// 设置缓存策略
    async fn cache_set_policy(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
        policy: crate::modules::rate_limiting::CachePolicyInput,
    ) -> async_graphql::Result<bool> {
        impl_cache_set_policy(_ctx, pattern, policy).await
    }

    /// 清空缓存策略
    async fn cache_clear_policies(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        impl_cache_clear_policies(_ctx).await
    }

    // ==================== V50.0 Phase 20 Mutation: 持久化查询管理 + 查询审计 + 企业级治理 ====================

    /// 注册持久化查询
    async fn register_persisted_query(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::PersistedQueryInput,
    ) -> async_graphql::Result<crate::modules::query_governance::PersistedQueryGql> {
        impl_register_persisted_query(_ctx, input).await
    }

    /// 更新持久化查询状态
    async fn update_persisted_query_status(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        status: crate::modules::query_governance::QueryStatus,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        impl_update_persisted_query_status(_ctx, query_hash, status).await
    }

    /// 删除持久化查询
    async fn delete_persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        impl_delete_persisted_query(_ctx, query_hash).await
    }

    /// 添加持久化查询标签
    async fn add_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        impl_add_persisted_query_tag(_ctx, query_hash, tag).await
    }

    /// 移除持久化查询标签
    async fn remove_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        impl_remove_persisted_query_tag(_ctx, query_hash, tag).await
    }

    /// 设置查询配额
    async fn set_query_quota(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::QueryQuotaInput,
    ) -> async_graphql::Result<crate::modules::query_governance::QueryQuotaGql> {
        impl_set_query_quota(_ctx, input).await
    }

    /// 创建审批请求
    async fn create_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::ApprovalRequestInput,
    ) -> async_graphql::Result<crate::modules::query_governance::QueryApprovalRequestGql> {
        impl_create_approval_request(_ctx, input).await
    }

    /// 审批请求
    async fn review_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::ApprovalReviewInput,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryApprovalRequestGql>>
    {
        impl_review_approval_request(_ctx, input).await
    }

    /// 创建治理策略
    async fn create_governance_policy(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::GovernancePolicyInput,
    ) -> async_graphql::Result<crate::modules::query_governance::GovernancePolicyGql> {
        impl_create_governance_policy(_ctx, input).await
    }

    /// 设置字段访问控制
    async fn set_field_access_control(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::FieldAccessControlInput,
    ) -> async_graphql::Result<crate::modules::query_governance::FieldAccessControlGql> {
        impl_set_field_access_control(_ctx, input).await
    }
}

// ==================== Subscription 根类型（V34.0 Phase 4） ====================

pub struct SubscriptionRoot;

/// 服务健康监控的目标服务列表
const SUBSCRIPTION_SERVICES: &[(&str, &str)] = &[
    ("erp", "http://localhost:8010"),
    ("crm", "http://localhost:8029"),
    ("hrm", "http://localhost:8020"),
    ("finance", "http://localhost:8011"),
    ("mes", "http://localhost:8030"),
    ("workflow", "http://localhost:8000"),
    ("iam", "http://localhost:8000"),
    ("notification", "http://localhost:8084"),
];

#[Subscription]
impl SubscriptionRoot {
    /// 订阅服务健康状态变化（每 30 秒推送所有服务状态）
    /// V37.0: 每次推送事件时递增 CDN 缓存版本号，使 GET GraphQL 缓存失效
    /// V38.0: 添加订阅计数，开始时递增，结束时递减
    async fn service_health_changed(&self) -> ReceiverStream<ServiceHealthGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                invalidate_cache();
                let mut all_ok = true;
                for (name, url) in SUBSCRIPTION_SERVICES {
                    let healthy = probe_service_health(name, url).await;
                    if tx
                        .send(ServiceHealthGql {
                            service: (*name).to_string(),
                            healthy,
                            url: (*url).to_string(),
                        })
                        .await
                        .is_err()
                    {
                        all_ok = false;
                        break;
                    }
                }
                if !all_ok {
                    return;
                }
            }
        });
        ReceiverStream::new(rx)
    }

    // ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================

    /// 订阅主数据变更事件（可按 domain 过滤）
    ///
    /// 当主数据（客户/供应商/物料/员工等）发生变更时推送事件。
    /// 客户端可通过 domain 参数过滤特定域的变更。
    async fn master_data_changed(
        &self,
        ctx: &Context<'_>,
        domain: Option<String>,
    ) -> ReceiverStream<MasterDataEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::MasterDataChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<MasterDataEventGql>(value) {
                            // 按 domain 过滤
                            if let Some(ref d) = domain {
                                if !event.domain.eq_ignore_ascii_case(d) {
                                    continue;
                                }
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅通知接收事件（按 user_id 过滤）
    ///
    /// 当用户收到新通知时推送事件。客户端必须指定 user_id 进行过滤。
    async fn notification_received(
        &self,
        ctx: &Context<'_>,
        user_id: String,
    ) -> ReceiverStream<NotificationEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::NotificationReceived);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<NotificationEventGql>(value) {
                            if event.user_id != user_id {
                                continue;
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅工作流任务分配事件（按 assignee_id 过滤）
    ///
    /// 当有新工作流任务分配给用户时推送事件。客户端必须指定 assignee_id 进行过滤。
    async fn workflow_task_assigned(
        &self,
        ctx: &Context<'_>,
        assignee_id: String,
    ) -> ReceiverStream<WorkflowTaskEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::WorkflowTaskAssigned);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<WorkflowTaskEventGql>(value) {
                            if event.assignee_id != assignee_id {
                                continue;
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅订单状态变更事件（可按 order_type 过滤）
    ///
    /// 当订单状态发生变更时推送事件。客户端可通过 order_type 参数过滤特定类型。
    async fn order_status_changed(
        &self,
        ctx: &Context<'_>,
        order_type: Option<String>,
    ) -> ReceiverStream<OrderStatusEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::OrderStatusChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<OrderStatusEventGql>(value) {
                            if let Some(ref ot) = order_type {
                                if !event.order_type.eq_ignore_ascii_case(ot) {
                                    continue;
                                }
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// V43.0: 订阅数据变更事件（通用实体级实时推送）
    ///
    /// 当任何实体数据发生变更时推送事件，支持按 entity_type 和 update_type 过滤。
    /// 相比主数据变更事件，此频道提供更细粒度的实体级数据，包含完整 data 和 delta。
    async fn data_changed(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
        update_type: Option<String>,
    ) -> ReceiverStream<DataChangeEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::DataChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<DataChangeEvent>(value) {
                            if let Some(ref et) = entity_type {
                                if !event.entity_type.eq_ignore_ascii_case(et) {
                                    continue;
                                }
                            }
                            if let Some(ref ut) = update_type {
                                let event_ut = match event.update_type {
                                    UpdateType::Created => "created",
                                    UpdateType::Updated => "updated",
                                    UpdateType::Deleted => "deleted",
                                    UpdateType::Delta => "delta",
                                    UpdateType::Full => "full",
                                };
                                if !event_ut.eq_ignore_ascii_case(ut) {
                                    continue;
                                }
                            }
                            let gql_event = DataChangeEventGql {
                                entity_type: event.entity_type,
                                entity_id: event.entity_id,
                                update_type: event.update_type.into(),
                                data: event.data,
                                delta: event.delta,
                                version: event.version,
                                timestamp: event.timestamp,
                                source: event.source,
                            };
                            if tx.send(gql_event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    // ==================== V47.0 Phase 17: 实时数据流 + 增量更新 + 状态同步订阅 ====================

    /// 订阅实时数据流（可按 entity_type / update_type 过滤）
    ///
    /// V47.0: 客户端订阅特定实体类型的实时数据流，当数据发生
    /// Insert/Update/Delete/Sync/Snapshot 时推送增量更新事件。
    async fn realtime_data_stream(
        &self,
        entity_type: Option<String>,
        update_type: Option<String>,
    ) -> ReceiverStream<RealtimeStreamUpdateGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let et = entity_type.clone();
        let ut = update_type.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
            let mut last_seq: i64 = 0;
            loop {
                interval.tick().await;
                let target_et = et.clone().unwrap_or_else(|| "order".to_string());
                let updates =
                    RealtimeStreamManager::get_stream_updates(&target_et, last_seq, Some(50));
                for u in updates {
                    last_seq = last_seq.max(u.sequence_number);
                    if let Some(ref ut) = ut {
                        let type_str = match u.stream_type {
                            StreamUpdateTypeGql::Insert => "insert",
                            StreamUpdateTypeGql::Update => "update",
                            StreamUpdateTypeGql::Delete => "delete",
                            StreamUpdateTypeGql::Sync => "sync",
                            StreamUpdateTypeGql::Snapshot => "snapshot",
                        };
                        if !type_str.eq_ignore_ascii_case(ut) {
                            continue;
                        }
                    }
                    if tx.send(u).await.is_err() {
                        return;
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅增量更新（可按 entity_type / entity_id 过滤）
    ///
    /// V47.0: 推送待应用的增量更新（Delta），客户端可基于 base_version 做差异合并。
    async fn incremental_updates(
        &self,
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> ReceiverStream<IncrementalUpdateGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let et = entity_type.clone();
        let eid = entity_id.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
            let mut seen: HashSet<String> = HashSet::new();
            loop {
                interval.tick().await;
                let target_et = et.clone().unwrap_or_else(|| "order".to_string());
                let target_eid = eid.clone().unwrap_or_default();
                let updates =
                    IncrementalUpdateEngine::get_pending_updates(&target_et, &target_eid, 0);
                for u in updates {
                    if seen.contains(&u.update_id) {
                        continue;
                    }
                    seen.insert(u.update_id.clone());
                    if tx.send(u).await.is_err() {
                        return;
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅同步状态变更（可按 client_id 过滤）
    ///
    /// V47.0: 当同步会话状态发生变更（InSync/Syncing/Conflict/Error/Offline）时推送事件。
    async fn sync_state_changed(
        &self,
        client_id: Option<String>,
    ) -> ReceiverStream<SyncSessionGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let cid = client_id.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
            let mut last_count: usize = 0;
            loop {
                interval.tick().await;
                let history = StateSyncManager::get_sync_history(cid.as_deref(), Some(10));
                if history.len() != last_count {
                    last_count = history.len();
                    if let Some(latest) = history.first() {
                        if tx.send(latest.clone()).await.is_err() {
                            return;
                        }
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }
}

struct DeferSubscriptionCount;

impl Drop for DeferSubscriptionCount {
    fn drop(&mut self) {
        decrement_subscriptions();
    }
}

// ==================== V37.0 Phase 7: GraphQL 订阅 CDN 缓存失效 ====================

/// 全局缓存版本号
/// 每次订阅事件推送时递增，用于 CDN 缓存失效。
/// GET GraphQL 响应包含 ETag 头，客户端可据此判断缓存是否过期。
static CACHE_VERSION: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// 获取当前缓存版本号
pub fn get_cache_version() -> u64 {
    CACHE_VERSION.load(std::sync::atomic::Ordering::Relaxed)
}

/// 递增缓存版本号（订阅事件推送时调用）
/// 这会使所有基于旧版本号的 CDN 缓存失效。
pub fn invalidate_cache() {
    CACHE_VERSION.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] CDN 缓存版本递增至 {}", get_cache_version());
}

// ==================== V38.0: 活跃订阅计数器 ====================

/// 全局活跃订阅数计数器
/// 每个订阅开始时递增，结束时递减。
static ACTIVE_SUBSCRIPTIONS: std::sync::atomic::AtomicUsize =
    std::sync::atomic::AtomicUsize::new(0);

/// 获取当前活跃订阅数
pub fn get_active_subscriptions() -> usize {
    ACTIVE_SUBSCRIPTIONS.load(std::sync::atomic::Ordering::Relaxed)
}

/// 递增活跃订阅数
pub fn increment_subscriptions() {
    ACTIVE_SUBSCRIPTIONS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] 活跃订阅数递增至 {}", get_active_subscriptions());
}

/// 递减活跃订阅数
pub fn decrement_subscriptions() {
    ACTIVE_SUBSCRIPTIONS.fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] 活跃订阅数递减至 {}", get_active_subscriptions());
}

// ==================== Schema 构建 ====================

pub type PortalSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

/// V35.0 Phase 5: 查询复杂度限制
pub const MAX_QUERY_COMPLEXITY: usize = 1000;
/// V35.0 Phase 5: 查询深度限制
pub const MAX_QUERY_DEPTH: usize = 10;
/// V35.0 Phase 6: APQ 缓存容量
const APQ_CACHE_CAPACITY: usize = 256;
/// V40.0: 全局安全事件存储（内存环形缓冲）
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

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    include!("graphql_schema_tests.rs");
}







