#![allow(dead_code)]

use crate::handlers::{
    ai_handlers, connector_handlers, dify_handlers, dsh_agent_handlers, dsh_ai_enhanced_handlers,
    dsh_performance_handlers, health, model_admin_handlers, prompt_handlers, workflow_handlers,
};
use crate::modules::{
    AnalysisApi, CodeAssistantApi, DocumentApi, EmbeddingApi, MultimodalApi, QaApi,
    RecommendationApi, VectorApi,
};
use crate::shared::AppState;
use std::sync::Arc;

use crate::dsh::mcp::{
    create_mcp_routes, register_aps_tools, register_bi_tools, register_crm_tools,
    register_cs_tools, register_ehs_tools, register_erp_tools, register_finance_tools,
    register_hr_tools, register_iot_tools, register_lims_tools, register_mes_tools,
    register_oa_tools, register_pm_tools, register_qms_tools, register_scm_tools,
    register_wms_tools, McpServer,
};

use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post},
    Router,
};
use axum_prometheus::{metrics_exporter_prometheus::PrometheusHandle, PrometheusMetricLayer};
use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, register_routes_with_legacy_alias,
};
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_core::logging::request_context_middleware;
use topems_shared_observability::telemetry::telemetry_middleware;
use utoipa::OpenApi;

// `ApiDoc`（来自 `modules::openapi`）注册了所有 `#[utoipa::path]` 注解的 handler。
// 此处以 `AiApiDoc` 别名重新导出，保持与 `tests/openapi_extract.rs` 的导入兼容：
//   use topems_ai::routes::AiApiDoc;
pub use crate::modules::openapi::ApiDoc as AiApiDoc;

pub fn create_routes(
    app_state: AppState,
    pool: sqlx::PgPool,
    prometheus_layer: PrometheusMetricLayer<'static>,
    metric_handle: PrometheusHandle,
    include_api_info: bool,
) -> Router {
    let cors = create_cors_layer();

    // 服务间认证：MCP 业务工具以 ai-service 身份签发 service token 调用下游
    let jwt_secret = app_state.auth_state.jwt_secret.clone();

    // MCP 认证独立 secret（jwt_secret 变量后续被 tokio spawn 捕获 move，MCP 用独立副本）
    let mcp_jwt_secret = jwt_secret.clone();

    // 创建 MCP Server 和 DSH Agent 编排器
    let mcp_server = Arc::new(McpServer::new(
        "topems-ai-mcp",
        env!("CARGO_PKG_VERSION"),
        mcp_jwt_secret.clone(),
    ));

    // 创建 DSH Agent 编排器（使用 MCP Server 的 ToolRegistry）
    let mut dsh_agent_orchestrator =
        crate::dsh::agent::AgentOrchestrator::new(mcp_server.tool_registry().clone());

    // 设置性能监控器（如果已配置）
    if let Some(perf_monitor) = &app_state.dsh_agent_performance_monitor {
        dsh_agent_orchestrator.set_performance_monitor(perf_monitor.clone());
    }

    // 设置告警管理器
    let alert_manager = crate::dsh::alerting::AlertManager::with_defaults();
    dsh_agent_orchestrator.set_alert_manager(alert_manager);

    // 设置缓存管理器
    let cache_manager = crate::dsh::cache::CacheManager::with_defaults();
    dsh_agent_orchestrator.set_cache_manager(cache_manager);

    // 初始化知识图谱
    let knowledge_graph = crate::dsh::knowledge_graph::KnowledgeGraph::with_defaults();

    // 初始化 RAG 引擎
    let rag_engine = crate::dsh::rag::RagEngine::with_defaults();

    // 初始化多 Agent 协调器
    let multi_agent_config = crate::dsh::multi_agent::CollaborationGroupConfig {
        group_id: "default".to_string(),
        name: "默认协作组".to_string(),
        mode: crate::dsh::multi_agent::CollaborationMode::MasterWorker,
        coordinator_id: None,
        member_ids: Vec::new(),
        max_tasks: 100,
        task_timeout_secs: 300,
    };
    let multi_agent_coordinator =
        crate::dsh::multi_agent::MultiAgentCoordinator::new(multi_agent_config);

    // 更新 app_state，添加 DSH Agent 编排器和增强能力
    let app_state = AppState {
        dsh_agent_orchestrator: Some(dsh_agent_orchestrator),
        dsh_knowledge_graph: Some(knowledge_graph),
        dsh_rag_engine: Some(rag_engine),
        dsh_multi_agent_coordinator: Some(multi_agent_coordinator),
        ..app_state
    };

    // 异步注册 MCP 工具
    let server_clone = mcp_server.clone();
    tokio::task::spawn(async move {
        server_clone.register_system_tools().await;
        let jwt_secret = jwt_secret;
        register_crm_tools(&server_clone, &jwt_secret).await;
        register_erp_tools(&server_clone, &jwt_secret).await;
        register_finance_tools(&server_clone, &jwt_secret).await;
        register_hr_tools(&server_clone, &jwt_secret).await;
        register_mes_tools(&server_clone, &jwt_secret).await;
        register_ehs_tools(&server_clone, &jwt_secret).await;
        register_wms_tools(&server_clone, &jwt_secret).await;
        register_qms_tools(&server_clone, &jwt_secret).await;
        register_pm_tools(&server_clone, &jwt_secret).await;
        register_lims_tools(&server_clone, &jwt_secret).await;
        register_bi_tools(&server_clone, &jwt_secret).await;
        register_aps_tools(&server_clone, &jwt_secret).await;
        register_cs_tools(&server_clone, &jwt_secret).await;
        register_scm_tools(&server_clone, &jwt_secret).await;
        register_iot_tools(&server_clone, &jwt_secret).await;
        register_oa_tools(&server_clone, &jwt_secret).await;
        tracing::info!(
            "MCP Server tools registered: {} tools total",
            server_clone.tool_registry().len().await
        );
    });

    let public_routes = Router::new()
        .route("/", get(health::home))
        .route("/health", get(health::health))
        .route(
            "/api/plugins/info",
            get(crate::modules::ai_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(crate::modules::ai_plugin::plugin_health_check),
        )
        .route("/health/detailed", get(health::health_check_detailed))
        .route("/search", post(ai_handlers::ai_search))
        .route(
            "/metrics",
            get(move || async move {
                // 合并导出两套 registry：
                //   1) gather()（默认 registry）——业务指标（record_service_call 的
                //      topems_service_to_service_calls_total / degraded、进程指标等）；
                //   2) metric_handle.render()（pair() layer registry）——axum HTTP 请求指标。
                let mut out = String::new();
                if let Err(e) =
                    prometheus::TextEncoder::new().encode_utf8(&prometheus::gather(), &mut out)
                {
                    return format!("Error encoding default metrics: {}", e);
                }
                let layer_s = metric_handle.render();
                if !layer_s.is_empty() {
                    if !out.is_empty() && !out.ends_with('\n') {
                        out.push('\n');
                    }
                    out.push_str(&layer_s);
                }
                out
            }),
        )
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/chat", post(ai_handlers::chat))
        .route("/search", post(ai_handlers::ai_search))
        .route("/generate", post(ai_handlers::generate))
        .route("/validate", post(ai_handlers::validate))
        .route("/complete", post(ai_handlers::complete))
        .route("/summarize", post(ai_handlers::summarize))
        .route("/templates", get(ai_handlers::list_templates))
        // ========== AI 仪表盘（known_gap A 补全，2026-09-09）==========
        .route(
            "/dashboard/stats",
            get(model_admin_handlers::get_dashboard_stats),
        )
        .route(
            "/dashboard/activity-trend",
            get(model_admin_handlers::get_activity_trend),
        )
        .route(
            "/dashboard/feature-usage",
            get(model_admin_handlers::get_feature_usage),
        )
        // ========== 模型管理（known_gap A 补全，2026-09-09）==========
        .route("/models", get(model_admin_handlers::list_models))
        .route("/models/usage", get(model_admin_handlers::get_model_usage))
        .route(
            "/models/{id}/config",
            get(model_admin_handlers::get_model_config)
                .put(model_admin_handlers::update_model_config),
        )
        // ========== Prompt 模板（known_gap A 补全，2026-09-09）==========
        .route(
            "/prompts/templates",
            get(prompt_handlers::list_prompt_templates)
                .post(prompt_handlers::create_prompt_template),
        )
        .route(
            "/prompts/templates/{id}",
            get(prompt_handlers::get_prompt_template)
                .put(prompt_handlers::update_prompt_template)
                .delete(prompt_handlers::delete_prompt_template),
        )
        .route(
            "/prompts/templates/{id}/favorite",
            post(prompt_handlers::toggle_prompt_favorite),
        )
        .route(
            "/prompts/templates/{id}/use",
            post(prompt_handlers::use_prompt_template),
        )
        .route(
            "/prompts/categories",
            get(prompt_handlers::get_prompt_categories),
        )
        // AI 智能助手 Phase 3
        .route("/assistant/report", post(ai_handlers::report_assistant))
        .route("/assistant/flow", post(ai_handlers::flow_assistant))
        .route(
            "/assistant/anomaly/predict",
            post(ai_handlers::anomaly_predict),
        )
        .route("/assistant/knowledge/ask", post(ai_handlers::knowledge_ask))
        // 文档处理 API - 使用 DocumentApi 模块
        .route(
            "/documents",
            get(DocumentApi::list).post(DocumentApi::create),
        )
        .route("/documents/upload", post(DocumentApi::upload))
        .route(
            "/documents/vectorize-from-file",
            post(DocumentApi::vectorize_from_file),
        )
        .route(
            "/documents/{id}",
            get(DocumentApi::get)
                .put(DocumentApi::update)
                .delete(DocumentApi::delete),
        )
        .route("/documents/{id}/process", post(DocumentApi::process))
        .route("/documents/{id}/extract", post(DocumentApi::extract))
        .route("/documents/{id}/summarize", post(DocumentApi::summarize))
        .route(
            "/documents/{id}/key-points",
            post(DocumentApi::extract_key_points),
        )
        .route("/documents/qa", post(DocumentApi::document_qa))
        // 代码助手 API - 使用 CodeAssistantApi 模块
        .route("/code/generate", post(CodeAssistantApi::generate))
        .route("/code/explain", post(CodeAssistantApi::explain))
        .route("/code/fix", post(CodeAssistantApi::fix))
        .route("/code/optimize", post(CodeAssistantApi::optimize))
        .route("/code/review", post(CodeAssistantApi::review))
        // 向量检索 API - 使用 VectorApi 模块
        .route("/vectors/stats", get(VectorApi::stats))
        .route("/vectors/search", post(VectorApi::search))
        .route("/vectors/store", post(VectorApi::store))
        .route("/vectors/{id}", get(VectorApi::get))
        .route("/vectors/{id}", delete(VectorApi::delete))
        .route("/vectors/batch-store", post(VectorApi::batch_store))
        .route("/embedding/generate", post(EmbeddingApi::generate))
        .route("/vectors/hybrid-search", post(VectorApi::hybrid_search))
        .route("/vectors/clear", post(VectorApi::clear_all))
        // 问答 API - 使用 QaApi 模块
        .route("/qa/ask", post(QaApi::ask))
        .route("/qa/ask-with-context", post(QaApi::ask_with_context))
        .route("/qa/ask-structured", post(QaApi::ask_structured))
        .route("/qa/ask-conversation", post(QaApi::ask_conversation))
        .route("/qa/classify", post(QaApi::classify))
        .route("/qa/history", get(QaApi::history))
        .route("/qa/history/{id}", delete(QaApi::delete_history))
        .route(
            "/qa/history/batch-delete",
            post(QaApi::batch_delete_history),
        )
        .route("/qa/feedback", post(QaApi::feedback))
        // 数据连接器 API
        .route("/connectors", get(connector_handlers::list_connectors))
        .route("/connectors/get", get(connector_handlers::get_connector))
        .route(
            "/connectors/create",
            post(connector_handlers::create_connector),
        )
        .route(
            "/connectors/update",
            post(connector_handlers::update_connector),
        )
        .route(
            "/connectors/delete",
            post(connector_handlers::delete_connector),
        )
        .route("/connectors/test", get(connector_handlers::test_connector))
        .route("/connectors/query", post(connector_handlers::query_data))
        // Axum layer order: LAST added = OUTERMOST = runs FIRST on incoming request.
        // Therefore tenant_middleware (needs Claims) must be added FIRST (innermost),
        // auth_middleware (inserts Claims) must be added LAST (outermost).
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // 分析 API - 使用 AnalysisApi 模块
    let analysis_router = Router::new()
        .route("/analysis/sentiment", post(AnalysisApi::sentiment))
        .route("/analysis/classify", post(AnalysisApi::classify))
        .route("/analysis/entities", post(AnalysisApi::extract_entities))
        .route("/analysis/keywords", post(AnalysisApi::extract_keywords))
        .route("/analysis/history", post(AnalysisApi::history))
        // Axum layer order: LAST added = OUTERMOST = runs FIRST on incoming request.
        // Therefore tenant_middleware (needs Claims) must be added FIRST (innermost),
        // auth_middleware (inserts Claims) must be added LAST (outermost).
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let agent_router = Router::new()
        .merge(crate::modules::agent::create_routes())
        // Axum layer order: LAST added = OUTERMOST = runs FIRST on incoming request.
        // Therefore tenant_middleware (needs Claims) must be added FIRST (innermost),
        // auth_middleware (inserts Claims) must be added LAST (outermost).
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // DSH Agent 编排器 API 路由
    let dsh_agent_router = Router::new()
        .route(
            "/dsh/agent/execute",
            post(dsh_agent_handlers::execute_agent),
        )
        .route("/dsh/agent/stream", post(dsh_agent_handlers::stream_agent))
        .route(
            "/dsh/agent/session/{session_id}",
            get(dsh_agent_handlers::get_session).delete(dsh_agent_handlers::clear_session),
        )
        .route("/dsh/agent/tools", get(dsh_agent_handlers::list_tools))
        .route(
            "/dsh/agent/active-sessions",
            get(dsh_agent_handlers::active_sessions),
        )
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // DSH Agent 性能监控 API 路由
    let dsh_performance_router = Router::new()
        .route(
            "/dsh/agent/performance/metrics",
            get(dsh_performance_handlers::get_performance_metrics),
        )
        .route(
            "/dsh/agent/performance/prometheus",
            get(dsh_performance_handlers::export_prometheus_metrics),
        )
        .route(
            "/dsh/agent/performance/reset",
            post(dsh_performance_handlers::reset_performance_metrics),
        )
        .route(
            "/dsh/agent/performance/tools/{tool_name}",
            get(dsh_performance_handlers::get_tool_performance),
        )
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // DSH AI 增强能力 API 路由（知识图谱、RAG、多 Agent 协作）
    let dsh_enhanced_router = Router::new()
        // 知识图谱 API
        .route(
            "/dsh/kg/entities",
            post(dsh_ai_enhanced_handlers::add_entity).get(dsh_ai_enhanced_handlers::list_entities),
        )
        .route(
            "/dsh/kg/entities/{entity_id}",
            get(dsh_ai_enhanced_handlers::get_entity)
                .delete(dsh_ai_enhanced_handlers::delete_entity),
        )
        .route(
            "/dsh/kg/entities/{entity_id}/neighbors",
            get(dsh_ai_enhanced_handlers::get_entity_neighbors),
        )
        .route(
            "/dsh/kg/relations",
            post(dsh_ai_enhanced_handlers::add_relation)
                .get(dsh_ai_enhanced_handlers::list_relations),
        )
        .route(
            "/dsh/kg/shortest-path",
            post(dsh_ai_enhanced_handlers::shortest_path),
        )
        .route(
            "/dsh/kg/link-entity",
            post(dsh_ai_enhanced_handlers::link_entity),
        )
        .route(
            "/dsh/kg/communities",
            get(dsh_ai_enhanced_handlers::detect_communities),
        )
        .route(
            "/dsh/kg/stats",
            get(dsh_ai_enhanced_handlers::get_graph_stats),
        )
        .route(
            "/dsh/kg/extract",
            post(dsh_ai_enhanced_handlers::extract_entities),
        )
        // RAG API
        .route(
            "/dsh/rag/retrieve",
            post(dsh_ai_enhanced_handlers::rag_retrieve),
        )
        .route(
            "/dsh/rag/stats",
            get(dsh_ai_enhanced_handlers::get_rag_stats),
        )
        // 多 Agent 协作 API
        .route(
            "/dsh/multi-agent/execute",
            post(dsh_ai_enhanced_handlers::multi_agent_execute),
        )
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // 业务 Copilot 路由
    let copilot_state = crate::handlers::business_copilot_handlers::CopilotAppState::new();
    let business_copilot_router = Router::new()
        .route(
            "/dsh/copilot/sessions",
            post(crate::handlers::business_copilot_handlers::create_session)
                .get(crate::handlers::business_copilot_handlers::list_active_sessions),
        )
        .route(
            "/dsh/copilot/sessions/{session_id}",
            get(crate::handlers::business_copilot_handlers::get_session)
                .delete(crate::handlers::business_copilot_handlers::delete_session),
        )
        .route(
            "/dsh/copilot/sessions/{session_id}/messages",
            post(crate::handlers::business_copilot_handlers::send_message),
        )
        .route(
            "/dsh/copilot/intent/recognize",
            post(crate::handlers::business_copilot_handlers::recognize_intent),
        )
        .route(
            "/dsh/copilot/modules",
            get(crate::handlers::business_copilot_handlers::list_modules),
        )
        .route(
            "/dsh/copilot/modules/{module}",
            get(crate::handlers::business_copilot_handlers::get_module_config),
        )
        .with_state(copilot_state);

    // 治理仪表盘路由
    let governance_state =
        crate::handlers::governance_dashboard_handlers::GovernanceAppState::new();
    let governance_dashboard_router = Router::new()
        .route(
            "/dsh/governance/dashboard",
            get(crate::handlers::governance_dashboard_handlers::get_dashboard),
        )
        .route(
            "/dsh/governance/score",
            get(crate::handlers::governance_dashboard_handlers::get_governance_score),
        )
        .route(
            "/dsh/governance/risk",
            get(crate::handlers::governance_dashboard_handlers::get_risk_assessment),
        )
        .route(
            "/dsh/governance/compliance",
            get(crate::handlers::governance_dashboard_handlers::get_compliance_status),
        )
        .route(
            "/dsh/governance/cost",
            get(crate::handlers::governance_dashboard_handlers::get_cost_analysis),
        )
        .route(
            "/dsh/governance/performance",
            get(crate::handlers::governance_dashboard_handlers::get_performance_metrics),
        )
        .route(
            "/dsh/governance/security-events",
            get(crate::handlers::governance_dashboard_handlers::get_security_events),
        )
        .route(
            "/dsh/governance/audit",
            get(crate::handlers::governance_dashboard_handlers::get_audit_summary),
        )
        .route(
            "/dsh/governance/recommendations",
            get(crate::handlers::governance_dashboard_handlers::get_recommendations),
        )
        .route(
            "/dsh/governance/cache",
            delete(crate::handlers::governance_dashboard_handlers::clear_cache),
        )
        .with_state(governance_state);

    // 智能表单路由（3.2b）
    let smart_forms_state = crate::handlers::smart_forms_handlers::SmartFormsAppState::new();
    let smart_forms_router = Router::new()
        .route(
            "/dsh/smart-forms/templates",
            get(crate::handlers::smart_forms_handlers::list_templates),
        )
        .route(
            "/dsh/smart-forms/templates/{id}",
            get(crate::handlers::smart_forms_handlers::get_template),
        )
        .route(
            "/dsh/smart-forms/ai-fill",
            post(crate::handlers::smart_forms_handlers::ai_fill),
        )
        .route(
            "/dsh/smart-forms/validate",
            post(crate::handlers::smart_forms_handlers::validate),
        )
        .with_state(smart_forms_state);

    let recommendation_router = Router::new()
        .route("/recommend", post(RecommendationApi::recommend))
        .route(
            "/recommend/documents",
            post(RecommendationApi::recommend_documents),
        )
        .route(
            "/recommend/opportunities",
            post(RecommendationApi::recommend_opportunities),
        )
        .route(
            "/recommend/knowledge",
            post(RecommendationApi::recommend_knowledge),
        )
        .route("/profile/get", post(RecommendationApi::get_user_profile))
        .route(
            "/profile/update",
            post(RecommendationApi::update_user_profile),
        )
        // Axum layer order: LAST added = OUTERMOST = runs FIRST on incoming request.
        // Therefore tenant_middleware (needs Claims) must be added FIRST (innermost),
        // auth_middleware (inserts Claims) must be added LAST (outermost).
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let multimodal_router = Router::new()
        .route(
            "/multimodal/image/analyze",
            post(MultimodalApi::analyze_image),
        )
        .route(
            "/multimodal/image/caption",
            post(MultimodalApi::generate_caption),
        )
        .route(
            "/multimodal/image/objects",
            post(MultimodalApi::detect_objects),
        )
        .route("/multimodal/image/text", post(MultimodalApi::extract_text))
        .route(
            "/multimodal/image/describe",
            post(MultimodalApi::describe_image),
        )
        .route(
            "/multimodal/video/analyze",
            post(MultimodalApi::analyze_video),
        )
        .route(
            "/multimodal/video/summary",
            post(MultimodalApi::summarize_video),
        )
        // Axum layer order: LAST added = OUTERMOST = runs FIRST on incoming request.
        // Therefore tenant_middleware (needs Claims) must be added FIRST (innermost),
        // auth_middleware (inserts Claims) must be added LAST (outermost).
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // Dify 集成 API - 代理到 Dify Service API
    let dify_router = Router::new()
        .route("/dify/chat", post(dify_handlers::chat))
        .route("/dify/chat/stream", post(dify_handlers::chat_stream))
        .route("/dify/info", get(dify_handlers::info))
        .route("/dify/parameters", get(dify_handlers::parameters))
        .route("/dify/meta", get(dify_handlers::meta))
        .route(
            "/dify/conversations",
            get(dify_handlers::list_conversations),
        )
        .route("/dify/messages", get(dify_handlers::list_messages))
        .route(
            "/dify/conversations/{conversation_id}",
            delete(dify_handlers::delete_conversation),
        )
        .route(
            "/dify/messages/{message_id}/feedbacks",
            post(dify_handlers::feedback),
        )
        .route(
            "/dify/messages/{message_id}/stop",
            post(dify_handlers::stop),
        )
        .route("/dify/health", get(dify_handlers::health))
        // Axum layer order: LAST added = OUTERMOST = runs FIRST on incoming request.
        // Therefore tenant_middleware (needs Claims) must be added FIRST (innermost),
        // auth_middleware (inserts Claims) must be added LAST (outermost).
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // Workflow orchestration API
    let workflow_router = Router::new()
        .route("/workflows", get(workflow_handlers::list_workflows))
        .route(
            "/workflows/execute",
            post(workflow_handlers::execute_workflow),
        )
        .route(
            "/workflows/{workflow_id}",
            get(workflow_handlers::get_workflow),
        )
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let rate_limit_config = RateLimitConfig::new(5000, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let rate_limit_layer = axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    // 遗留⑩闭环（2026-09-08）：ai_knowledge 模块路由（自带 require_permission 中间件，
    // with_state 注入 AppState 后以 Router<()> 形态并入受保护路由链）
    let ai_knowledge_router = Router::new()
        .merge(crate::modules::ai_knowledge::create_routes())
        .with_state(app_state.clone());

    let all_protected_routes = Router::new()
        .merge(protected_routes)
        .merge(analysis_router)
        .merge(agent_router)
        .merge(dsh_agent_router)
        .merge(dsh_performance_router)
        .merge(dsh_enhanced_router)
        .merge(business_copilot_router)
        .merge(governance_dashboard_router)
        .merge(smart_forms_router)
        .merge(recommendation_router)
        .merge(multimodal_router)
        .merge(dify_router)
        .merge(workflow_router)
        .merge(ai_knowledge_router)
        .layer(rate_limit_layer);

    let app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        "/api/core/ai/v1",
        &["/api/v1/ai", "/api/ai"],
        all_protected_routes,
    )
    .merge(if include_api_info {
        create_api_info_router("topems-ai")
    } else {
        Router::new()
    })
    .route(
        if include_api_info {
            "/api-docs/openapi.json"
        } else {
            "/__ai_docs_disabled__"
        },
        get(|| async {
            serde_json::to_string_pretty(&AiApiDoc::openapi()).unwrap_or_else(|e| {
                tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                "{}".to_string()
            })
        }),
    )
    .layer(axum::middleware::from_fn(request_context_middleware))
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(prometheus_layer)
    .layer(cors)
    .layer(DefaultBodyLimit::max(500 * 1024 * 1024));

    // V335: MCP (Model Context Protocol) Server 路由
    // 端点：POST /mcp, GET /mcp/sse
    // MCP 客户端（如 Cursor）通过这些端点进行 JSON-RPC 通信
    let app = app.merge(create_mcp_routes(mcp_server, mcp_jwt_secret.clone()));

    app
}
