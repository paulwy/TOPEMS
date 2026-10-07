#![allow(dead_code)]

use crate::shared::AppState;
use axum::{
    http::Method,
    middleware::Next,
    routing::{delete, get, patch, post, put},
    Router,
};

pub mod ai_governance_v59;
// Web 前端契约收口兜底（mdm-v66 预埋 + 静态提取伪动态段）—— 待上游支持
pub mod commercial_v55;
pub mod contract_fallbacks;
pub mod disaster_v56;
pub mod governance_v58;
pub mod knowledge_v53;
pub mod lineage_v52;
pub mod master_plugin;
pub mod metadata_v60;
pub mod persist;
pub mod quality_v51;
pub mod schema_registry;
pub mod semantic_v57;
pub mod versioning_v54;
// V68.1 A2.3: dict 模块从 unified-core 合并到主数据服务
pub mod dict;

/// B10：把 10 个 MDM 模块的内存集合快照全部回写库（幂等 upsert）。
/// 与 main.rs 后台 3s flush 的调用面一致；各模块内部按 initialized 门控，
/// 未 seed/load 前为 no-op，避免启动空集合覆盖库内既有快照。
pub async fn flush_all() {
    quality_v51::background_flush().await;
    lineage_v52::background_flush().await;
    knowledge_v53::background_flush().await;
    versioning_v54::background_flush().await;
    commercial_v55::background_flush().await;
    disaster_v56::background_flush().await;
    semantic_v57::background_flush().await;
    governance_v58::background_flush().await;
    ai_governance_v59::background_flush().await;
    metadata_v60::background_flush().await;
}

/// B10 写后同步落库中间件：POST/PUT/PATCH/DELETE 请求处理完成后立即全量 flush。
/// 消除 U4 遗留的 "≤3s 快照窗口 SIGKILL 丢最近写" —— 写请求返回前数据已落库，
/// 后台 3s ticker 降级为周期兜底（幂等重写 + 未走 HTTP 的本地变更覆盖）。
pub async fn flush_on_write(
    req: axum::http::Request<axum::body::Body>,
    next: Next,
) -> axum::response::Response {
    let method = req.method().clone();
    let resp = next.run(req).await;
    if is_write_method(&method) {
        flush_all().await;
    }
    resp
}

/// 是否写方法（触发写后同步落库）。抽离为纯函数便于单测。
fn is_write_method(m: &Method) -> bool {
    matches!(
        *m,
        Method::POST | Method::PUT | Method::PATCH | Method::DELETE
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Method;

    #[test]
    fn write_method_detection() {
        for m in [Method::POST, Method::PUT, Method::PATCH, Method::DELETE] {
            assert!(is_write_method(&m), "{m} 应为写方法");
        }
        for m in [Method::GET, Method::HEAD, Method::OPTIONS, Method::TRACE] {
            assert!(!is_write_method(&m), "{m} 不应触发落库");
        }
    }
}

pub fn create_routes() -> Router<AppState> {
    // 注意：Router::layer 只作用于调用时已注册的路由，必须放在所有 nest/route 之后
    // （B10 曾先 layer 后 nest 导致中间件未生效）。
    Router::new()
        .nest(
            "/quality-v51",
            Router::new()
                .route("/checks", post(quality_v51::run_quality_check))
                .route("/checks", get(quality_v51::list_quality_checks))
                .route(
                    "/checks/{entity_type}/{entity_id}",
                    get(quality_v51::get_quality_check_results),
                )
                .route("/rules", post(quality_v51::create_quality_rule))
                .route("/rules", get(quality_v51::list_quality_rules))
                .route("/rules/{id}", get(quality_v51::get_quality_rule))
                .route("/rules/{id}", put(quality_v51::update_quality_rule))
                .route("/rules/{id}", delete(quality_v51::delete_quality_rule))
                .route("/dashboard", get(quality_v51::get_quality_dashboard))
                .route("/score", get(quality_v51::get_quality_score))
                .route("/auto-fix/run", post(quality_v51::apply_auto_fix))
                .route("/auto-fix/actions", get(quality_v51::get_fix_actions))
                .route(
                    "/auto-fix/actions/{id}/revert",
                    post(quality_v51::revert_fix_action),
                )
                .route("/auto-fix/history", get(quality_v51::get_fix_history))
                .route("/auto-fix/workflow", post(quality_v51::run_fix_workflow))
                .route("/ai/suggest", post(quality_v51::generate_suggestions))
                .route("/ai/suggestions", get(quality_v51::get_suggestions))
                .route(
                    "/ai/suggestions/{id}/approve",
                    post(quality_v51::approve_suggestion),
                )
                .route(
                    "/ai/suggestions/{id}/reject",
                    post(quality_v51::reject_suggestion),
                )
                .route("/ai/insights", get(quality_v51::get_governance_insights))
                .route("/ai/predict", post(quality_v51::predict_quality_trend)),
        )
        .nest(
            "/lineage-v52",
            Router::new()
                .route("/register", post(lineage_v52::register_lineage))
                .route("/graph", get(lineage_v52::get_lineage_graph))
                .route(
                    "/upstream/{entity_type}/{id}",
                    get(lineage_v52::get_upstream),
                )
                .route(
                    "/downstream/{entity_type}/{id}",
                    get(lineage_v52::get_downstream),
                )
                .route("/export", get(lineage_v52::export_lineage))
                .route("/delete", post(lineage_v52::delete_lineage))
                .route("/impact/analyze", post(lineage_v52::analyze_impact))
                .route("/impact/report/{id}", get(lineage_v52::get_impact_report))
                .route("/impact/simulate", post(lineage_v52::simulate_change))
                .route("/impact/scope", get(lineage_v52::get_affected_scope))
                .route("/propagate", post(lineage_v52::propagate_change))
                .route(
                    "/propagation/rules",
                    get(lineage_v52::get_propagation_rules),
                )
                .route(
                    "/propagation/rules",
                    post(lineage_v52::add_propagation_rule),
                )
                .route("/propagation/log", get(lineage_v52::get_propagation_log))
                .route(
                    "/propagation/rollback",
                    post(lineage_v52::rollback_propagation),
                ),
        )
        .nest(
            "/kg-v53",
            Router::new()
                .route("/nodes", post(knowledge_v53::add_kg_node))
                .route("/edges", post(knowledge_v53::add_kg_edge))
                .route("/subgraph/{node_id}", get(knowledge_v53::get_subgraph))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/subgraph/{a}/{b}", get(contract_fallbacks::ok))
                .route("/path", get(knowledge_v53::find_path))
                .route("/similar/{node_id}", get(knowledge_v53::get_similar))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/similar/{a}/{b}", get(contract_fallbacks::list))
                .route("/export", get(knowledge_v53::export_kg))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/export/{tail}", get(contract_fallbacks::ok))
                .route(
                    "/recommendations/{user_id}",
                    get(knowledge_v53::get_recommendations),
                )
                .route("/interactions", post(knowledge_v53::record_interaction))
                .route(
                    "/similar-items/{item_id}",
                    get(knowledge_v53::get_similar_items),
                )
                .route("/trending", get(knowledge_v53::get_trending_items))
                .route("/assets", post(knowledge_v53::register_asset))
                .route("/assets", get(knowledge_v53::search_assets))
                .route("/assets/stats", get(knowledge_v53::get_asset_stats))
                .route("/assets/{id}", get(knowledge_v53::get_asset))
                .route("/assets/{id}", put(knowledge_v53::update_asset))
                .route("/categories", get(knowledge_v53::list_categories)),
        )
        .nest(
            "/mdm-v54",
            Router::new()
                .route("/version/snapshot", post(versioning_v54::create_snapshot))
                .route(
                    "/version/{entity_type}/{entity_id}",
                    get(versioning_v54::get_version),
                )
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/version/{a}/{b}/{c}", get(contract_fallbacks::ok))
                .route("/version/diff", get(versioning_v54::diff_versions))
                .route("/version/restore", post(versioning_v54::restore_version))
                .route(
                    "/version/history/{entity_type}/{entity_id}",
                    get(versioning_v54::list_history),
                )
                // 静态提取折叠尾段兜底（待上游支持）
                .route(
                    "/version/history/{a}/{b}/{c}",
                    get(contract_fallbacks::list),
                )
                .route("/version/branch", post(versioning_v54::create_branch))
                .route("/version/merge", post(versioning_v54::merge_branch))
                .route("/audit/log", get(versioning_v54::query_audit_log))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/audit/log/{tail}", get(contract_fallbacks::list))
                .route(
                    "/audit/user/{user_id}",
                    get(versioning_v54::get_user_activity),
                )
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/audit/user/{a}/{b}", get(contract_fallbacks::list))
                .route(
                    "/audit/entity/{entity_type}/{entity_id}",
                    get(versioning_v54::get_entity_history),
                )
                .route("/audit/export", post(versioning_v54::export_audit_log))
                .route(
                    "/audit/compliance",
                    get(versioning_v54::get_compliance_audit),
                )
                .route("/permissions/grant", post(versioning_v54::grant_permission))
                .route(
                    "/permissions/{id}",
                    delete(versioning_v54::revoke_permission),
                )
                .route("/permissions/check", get(versioning_v54::check_permission))
                .route(
                    "/permissions/user/{user_id}",
                    get(versioning_v54::get_user_permissions),
                )
                .route(
                    "/permissions/resource",
                    get(versioning_v54::get_resource_permissions),
                )
                // 静态提取折叠尾段兜底（待上游支持）
                .route(
                    "/permissions/resource/{tail}",
                    get(contract_fallbacks::list),
                )
                .route("/roles", post(versioning_v54::create_role))
                .route("/roles/assign", post(versioning_v54::assign_role))
                .route("/roles/revoke", delete(versioning_v54::revoke_role)),
        )
        .nest(
            "/mdm-v55",
            Router::new()
                // --- API 商业化 ---
                .route("/products", post(commercial_v55::create_api_product))
                .route("/products", get(commercial_v55::list_api_products))
                .route("/products/{id}", get(commercial_v55::get_api_product))
                .route("/subscribe", post(commercial_v55::subscribe_tenant))
                .route("/subscriptions", get(commercial_v55::list_subscriptions))
                .route("/subscriptions/{id}", get(commercial_v55::get_subscription))
                .route(
                    "/subscriptions/{id}/cancel",
                    put(commercial_v55::cancel_subscription),
                )
                .route(
                    "/subscriptions/{id}/upgrade",
                    put(commercial_v55::upgrade_tier),
                )
                // --- 计量计费 ---
                .route("/usage/record", post(commercial_v55::record_usage))
                .route("/usage/summary", get(commercial_v55::get_usage_summary))
                .route("/bill/generate", post(commercial_v55::generate_bill))
                .route("/billing", get(commercial_v55::get_billing_history))
                .route("/rate-cards", post(commercial_v55::create_rate_card))
                .route("/rate-cards", get(commercial_v55::get_rate_cards))
                .route(
                    "/billing/{id}/mark-paid",
                    put(commercial_v55::mark_bill_paid),
                )
                // --- SLA 保障 ---
                .route("/sla/configure", post(commercial_v55::configure_sla))
                .route("/sla/measure", post(commercial_v55::measure_sla))
                .route("/sla/status", get(commercial_v55::get_sla_status))
                .route("/sla/history", get(commercial_v55::get_sla_history))
                .route("/sla/penalty", get(commercial_v55::calculate_penalty))
                .route("/sla/incident", post(commercial_v55::create_incident))
                .route("/sla/incidents", get(commercial_v55::get_incidents))
                .route("/sla/report", get(commercial_v55::generate_sla_report)),
        )
        .nest(
            "/mdm-v56",
            Router::new()
                // --- 灾难恢复 ---
                .route("/recovery/point", post(disaster_v56::create_recovery_point))
                .route("/recovery/points", get(disaster_v56::list_recovery_points))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/recovery/points/{id}", get(contract_fallbacks::list))
                .route("/recovery/restore", post(disaster_v56::restore_from_point))
                .route("/recovery/status", get(disaster_v56::get_recovery_status))
                .route("/recovery/plan", post(disaster_v56::create_recovery_plan))
                .route("/recovery/plan/execute", post(disaster_v56::execute_plan))
                .route(
                    "/recovery/plan/{id}/progress",
                    get(disaster_v56::get_plan_progress),
                )
                .route("/recovery/test", post(disaster_v56::test_recovery))
                // --- 业务连续性 ---
                .route(
                    "/continuity/plan",
                    post(disaster_v56::create_continuity_plan),
                )
                .route("/continuity/plans", get(disaster_v56::list_plans))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/continuity/plans/{id}", get(contract_fallbacks::ok))
                .route("/continuity/plan/{id}", get(disaster_v56::get_plan))
                .route("/continuity/plan/{id}", put(disaster_v56::update_plan))
                .route("/continuity/plan/{id}/test", post(disaster_v56::test_plan))
                .route("/continuity/impact", get(disaster_v56::assess_impact))
                .route("/continuity/score", get(disaster_v56::get_continuity_score))
                // --- 跨地域容灾 ---
                .route("/dr/replication", post(disaster_v56::configure_replication))
                .route(
                    "/dr/replication/start",
                    post(disaster_v56::start_replication),
                )
                .route("/dr/replication/stop", post(disaster_v56::stop_replication))
                .route(
                    "/dr/replication/status",
                    get(disaster_v56::get_replication_status),
                )
                .route("/dr/failover", post(disaster_v56::initiate_failover))
                .route(
                    "/dr/failover/{id}/complete",
                    post(disaster_v56::complete_failover),
                )
                .route(
                    "/dr/failover/history",
                    get(disaster_v56::get_failover_history),
                )
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/dr/failover/history/{id}", get(contract_fallbacks::list))
                .route("/dr/switch", post(disaster_v56::switch_regions))
                .route("/dr/region-health", get(disaster_v56::get_region_health)),
        )
        .nest(
            "/mdm-v57",
            Router::new()
                // --- 图谱增强 ---
                .route("/graph/node", post(semantic_v57::add_graph_node))
                .route("/graph/edge", post(semantic_v57::add_graph_edge))
                .route("/graph/neighbors/{id}", get(semantic_v57::get_neighbors))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/graph/neighbors/{a}/{b}", get(contract_fallbacks::ok))
                .route("/graph/community/{id}", get(semantic_v57::get_community))
                .route(
                    "/graph/path",
                    post(semantic_v57::find_shortest_path_handler),
                )
                .route("/graph/subgraph", get(semantic_v57::get_subgraph))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/graph/subgraph/{tail}", get(contract_fallbacks::ok))
                .route(
                    "/graph/embeddings",
                    post(semantic_v57::compute_embeddings_handler),
                )
                .route(
                    "/graph/communities",
                    post(semantic_v57::detect_communities_handler),
                )
                // --- 语义搜索 ---
                .route("/search/index", post(semantic_v57::index_entity))
                .route(
                    "/search/semantic",
                    post(semantic_v57::search_semantic_handler),
                )
                .route("/search/hybrid", post(semantic_v57::search_hybrid_handler))
                .route("/search/reindex", post(semantic_v57::reindex_all))
                .route("/search/stats", get(semantic_v57::get_search_stats))
                .route(
                    "/search/index/{id}",
                    delete(semantic_v57::remove_from_index),
                )
                // --- 智能标签 ---
                .route("/tags", post(semantic_v57::create_tag))
                .route("/tag/apply", post(semantic_v57::apply_tag))
                .route("/tag/auto", post(semantic_v57::auto_tag))
                .route(
                    "/tags/entity/{type}/{id}",
                    get(semantic_v57::get_tags_for_entity),
                )
                .route(
                    "/entities/tag/{tag}",
                    get(semantic_v57::get_entities_by_tag),
                )
                .route("/tag/{id}", delete(semantic_v57::remove_tag_handler))
                .route("/tags", get(semantic_v57::list_tags))
                // 静态提取折叠尾段兜底（待上游支持）
                .route("/tags/{tail}", get(contract_fallbacks::list))
                .route("/tags/suggest", get(semantic_v57::suggest_tags)),
        )
        .nest(
            "/mdm-v58",
            Router::new()
                // --- 治理成熟度 ---
                .route("/maturity/assess", post(governance_v58::assess_maturity))
                .route("/maturity/assessment", get(governance_v58::get_assessment))
                .route(
                    "/maturity/scores",
                    get(governance_v58::get_dimension_scores),
                )
                .route(
                    "/maturity/improvement-plan",
                    post(governance_v58::create_improvement_plan),
                )
                .route("/maturity/progress", get(governance_v58::track_progress))
                .route(
                    "/maturity/history",
                    get(governance_v58::get_maturity_history),
                )
                .route("/maturity/benchmark", get(governance_v58::get_benchmark))
                // --- 自动化工作流 ---
                .route("/workflow", post(governance_v58::create_workflow))
                .route("/workflow/{id}/start", post(governance_v58::start_workflow))
                .route("/workflow/{id}/advance", post(governance_v58::advance_step))
                .route(
                    "/workflow/{id}/status",
                    get(governance_v58::get_workflow_status),
                )
                .route("/workflows", get(governance_v58::list_workflows))
                .route(
                    "/workflow/templates",
                    get(governance_v58::get_workflow_templates),
                )
                .route(
                    "/workflow/step/{id}/approve",
                    post(governance_v58::approve_step),
                )
                .route(
                    "/workflow/step/{id}/reject",
                    post(governance_v58::reject_step),
                )
                // --- 数据产品化 ---
                .route("/data-product", post(governance_v58::create_data_product))
                .route("/data-product/{id}", get(governance_v58::get_data_product))
                .route("/data-products", get(governance_v58::list_data_products))
                .route(
                    "/data-product/{id}/contract",
                    put(governance_v58::update_contract),
                )
                .route(
                    "/data-product/{id}/contract/status",
                    get(governance_v58::get_contract_status),
                )
                .route(
                    "/data-product/{id}/expose",
                    post(governance_v58::expose_as_api),
                )
                .route(
                    "/data-product/{id}/consumers",
                    get(governance_v58::get_consumers),
                )
                .route(
                    "/data-product/{id}/lineage",
                    get(governance_v58::get_product_lineage),
                ),
        )
        .nest(
            "/mdm-v59",
            Router::new()
                // --- 数据治理 AI ---
                .route("/governance/analyze", post(ai_governance_v59::analyze))
                .route(
                    "/governance/suggestions",
                    get(ai_governance_v59::get_suggestions),
                )
                .route(
                    "/governance/entity/{id}",
                    get(ai_governance_v59::get_entity_suggestions),
                )
                .route(
                    "/governance/apply/{id}",
                    post(ai_governance_v59::apply_suggestion),
                )
                .route(
                    "/governance/dismiss/{id}",
                    post(ai_governance_v59::dismiss_suggestion),
                )
                .route("/governance/models", get(ai_governance_v59::get_models))
                .route(
                    "/governance/train/{id}",
                    post(ai_governance_v59::train_model),
                )
                // --- 智能匹配 ---
                .route("/matching/rule", post(ai_governance_v59::create_match_rule))
                .route("/matching/rules", get(ai_governance_v59::get_match_rules))
                .route(
                    "/matching/entities",
                    post(ai_governance_v59::match_entities),
                )
                .route(
                    "/matching/results",
                    get(ai_governance_v59::get_match_results),
                )
                .route(
                    "/matching/review/{id}",
                    post(ai_governance_v59::review_match),
                )
                .route(
                    "/matching/confirm/{id}",
                    post(ai_governance_v59::confirm_match),
                )
                .route(
                    "/matching/reject/{id}",
                    post(ai_governance_v59::reject_match),
                )
                .route("/matching/stats", get(ai_governance_v59::get_match_stats))
                // --- 自动分类 ---
                .route("/classifier", post(ai_governance_v59::create_classifier))
                .route("/classifiers", get(ai_governance_v59::get_classifiers))
                .route(
                    "/classify/{entity_type}/{id}",
                    post(ai_governance_v59::classify_entity),
                )
                .route(
                    "/classification/{entity_type}/{id}",
                    get(ai_governance_v59::get_classification),
                )
                .route(
                    "/classification/categories/{entity_type}",
                    get(ai_governance_v59::get_entity_categories),
                )
                .route(
                    "/classification/review/{id}",
                    post(ai_governance_v59::review_classification),
                )
                .route(
                    "/classification/stats",
                    get(ai_governance_v59::get_classification_stats),
                )
                .route(
                    "/classifier/rules/{id}",
                    post(ai_governance_v59::update_classifier_rules),
                ),
        )
        .nest(
            "/mdm-v60",
            Router::new()
                // --- 元数据管理 ---
                .route("/metadata", post(metadata_v60::create_metadata))
                .route("/metadata/{id}", get(metadata_v60::get_metadata))
                .route("/metadata", get(metadata_v60::list_metadata))
                .route("/metadata/search", get(metadata_v60::search_metadata))
                // 静态提取把 /metadata/search?qs 折叠成 /metadata/search:x 的兜底（待上游支持）
                .route("/metadata/search/{tail}", get(contract_fallbacks::list))
                .route("/metadata/{id}", put(metadata_v60::update_metadata))
                .route("/metadata/{id}", delete(metadata_v60::delete_metadata))
                .route(
                    "/metadata/{id}/attribute",
                    post(metadata_v60::add_attribute),
                )
                .route("/metadata/tag", post(metadata_v60::add_tag))
                .route("/metadata/stats", get(metadata_v60::get_metadata_stats))
                // --- 数据血缘增强 ---
                .route("/lineage/graph", post(metadata_v60::build_lineage_graph))
                .route("/lineage/graph/{id}", get(metadata_v60::get_lineage_graph))
                .route("/lineage/{id}/upstream", get(metadata_v60::get_upstream))
                // /lineage/{id}/upstream?depth= 被静态提取折叠出的尾段兜底（待上游支持）
                .route("/lineage/{id}/upstream/{tail}", get(contract_fallbacks::ok))
                .route(
                    "/lineage/{id}/downstream",
                    get(metadata_v60::get_downstream),
                )
                .route(
                    "/lineage/{id}/downstream/{tail}",
                    get(contract_fallbacks::ok),
                )
                .route("/lineage/path", post(metadata_v60::get_path))
                .route(
                    "/lineage/{id}/impact",
                    get(metadata_v60::get_lineage_impact),
                )
                .route(
                    "/lineage/dashboard",
                    get(metadata_v60::get_lineage_dashboard),
                )
                .route("/lineage/export", get(metadata_v60::export_lineage))
                // --- 生命周期管理 ---
                .route(
                    "/lifecycle/{id}/stage",
                    get(metadata_v60::get_current_stage),
                )
                .route(
                    "/lifecycle/{id}/transition",
                    post(metadata_v60::transition_stage),
                )
                .route(
                    "/lifecycle/{id}/history",
                    get(metadata_v60::get_lifecycle_history),
                )
                .route("/lifecycle/policy", post(metadata_v60::create_policy))
                .route("/lifecycle/policies", get(metadata_v60::get_policies))
                .route(
                    "/lifecycle/auto-transition",
                    post(metadata_v60::auto_transition),
                )
                .route(
                    "/lifecycle/dashboard",
                    get(metadata_v60::get_lifecycle_dashboard),
                )
                .route("/lifecycle/bulk", post(metadata_v60::bulk_transition)),
        )
        // Schema Registry — 元数据驱动动态 API
        .nest(
            "/schema-registry",
            Router::new()
                // Schema 管理
                .route("/schemas", post(schema_registry::create_schema))
                .route("/schemas", get(schema_registry::list_schemas))
                .route("/schemas/{id}", get(schema_registry::get_schema))
                .route("/schemas/{id}", put(schema_registry::update_schema))
                .route("/schemas/{id}", delete(schema_registry::delete_schema))
                // 动态数据 CRUD
                .route("/schemas/{id}/data", post(schema_registry::create_data))
                .route("/schemas/{id}/data", get(schema_registry::list_data))
                .route(
                    "/schemas/{id}/data/{record_id}",
                    get(schema_registry::get_data),
                )
                .route(
                    "/schemas/{id}/data/{record_id}",
                    put(schema_registry::update_data),
                )
                .route(
                    "/schemas/{id}/data/{record_id}",
                    delete(schema_registry::delete_data),
                ),
        )
        // V68.1 A2.3: dict 模块从 unified-core 迁移到 master-data
        // master-data 的 api_prefix=/api/master-data，此处用相对路径 /dict 注册，
        // 实际挂载路径为 /api/master-data/dict/*；
        // vite.config.ts 兼容代理将 /api/core/dict/* 重写为 /api/master-data/dict/*
        // （与 monitor/plugin 模块外迁采用相同的 rewrite 模式）
        .nest(
            "/dict",
            Router::new()
                // DictType CRUD
                .route("/dict-types", get(dict::list_dict_types))
                .route("/dict-types/{id}", get(dict::get_dict_type))
                .route("/dict-types", post(dict::create_dict_type))
                .route("/dict-types/{id}", put(dict::update_dict_type))
                .route("/dict-types/{id}", delete(dict::delete_dict_type))
                // DictItem CRUD（通过 dict_type 嵌套）
                .route(
                    "/dict-types/{dict_type_id}/items",
                    get(dict::list_dict_items),
                )
                .route(
                    "/dict-types/{dict_type_id}/items/export",
                    get(dict::export_dict_items),
                )
                // DictItem 直接操作（独立路由）
                .route("/dict-items/{id}", get(dict::get_dict_item))
                .route("/dict-items", post(dict::create_dict_item))
                .route("/dict-items/{id}", put(dict::update_dict_item))
                .route("/dict-items/{id}", delete(dict::delete_dict_item))
                .route("/dict-items/batch", post(dict::batch_create_dict_items)),
        )
        // mdm-v66 数据资产目录：前端 dataAssetCatalogV66.ts 的预埋零消费端点
        // （bulk/import/export/maps/categories/columns/tags 等，页面零消费，待 V66 后端落地）。
        // 挂轻量空数据兜底，绝不裸 404；待上游支持后替换为真实 handler。
        .nest(
            "/mdm-v66",
            Router::new()
                // --- 资产列 ---
                .route(
                    "/assets/{id}/columns",
                    get(contract_fallbacks::array).put(contract_fallbacks::ok),
                )
                // --- 资产批量/导入导出 ---
                .route("/assets/bulk", patch(contract_fallbacks::ok))
                .route("/assets/bulk-delete", post(contract_fallbacks::ok))
                .route("/assets/import", post(contract_fallbacks::ok))
                .route("/assets/export", get(contract_fallbacks::ok))
                // --- 血缘（预埋）---
                .route("/lineage", get(contract_fallbacks::ok))
                .route("/lineage/column", get(contract_fallbacks::ok))
                .route("/lineage/refresh/{id}", post(contract_fallbacks::ok))
                // --- 资产标签 ---
                .route("/tags", post(contract_fallbacks::ok))
                .route(
                    "/tags/{id}",
                    get(contract_fallbacks::ok)
                        .put(contract_fallbacks::ok)
                        .delete(contract_fallbacks::ok),
                )
                .route(
                    "/assets/{id}/tags",
                    post(contract_fallbacks::ok).delete(contract_fallbacks::ok),
                )
                // --- 资产分类 ---
                .route("/categories", post(contract_fallbacks::ok))
                .route("/categories/tree", get(contract_fallbacks::array))
                .route(
                    "/categories/{id}",
                    get(contract_fallbacks::ok)
                        .put(contract_fallbacks::ok)
                        .delete(contract_fallbacks::ok),
                )
                // --- 数据地图 ---
                .route("/maps", post(contract_fallbacks::ok))
                .route(
                    "/maps/{id}",
                    get(contract_fallbacks::ok)
                        .put(contract_fallbacks::ok)
                        .delete(contract_fallbacks::ok),
                )
                .route("/maps/{id}/export", get(contract_fallbacks::ok))
                // --- 搜索建议 / 仪表盘 ---
                .route("/search/suggestions", get(contract_fallbacks::array))
                .route("/dashboard/recent/{id}", get(contract_fallbacks::array))
                .route("/dashboard/orphans", get(contract_fallbacks::array)),
        )
        // B10：写请求后同步落库中间件（必须位于所有路由注册之后才生效）
        .layer(axum::middleware::from_fn(flush_on_write))
}
