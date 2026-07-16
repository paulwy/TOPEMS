#![allow(dead_code)]

use crate::handlers::{connector_handlers, health, ai_handlers};
use crate::middleware;
use crate::modules::{
    AnalysisApi, DocumentApi, EmbeddingApi, MultimodalApi, QaApi, RecommendationApi, VectorApi,
};
use crate::shared::AppState;
use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post},
    Router,
};
use axum_prometheus::{metrics_exporter_prometheus::PrometheusHandle, PrometheusMetricLayer};
use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, telemetry_middleware,
    wrap_group2_router, RouteCompatConfig,
};

pub fn create_routes(
    app_state: AppState,
    prometheus_layer: PrometheusMetricLayer<'static>,
    metric_handle: PrometheusHandle,
) -> Router {
    let cors = create_cors_layer();

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
        .route("/api/core/ai/health/detailed", get(health::health_check_detailed))
        .route("/api/core/ai/metrics", get(VectorApi::stats))
        .route("/api/core/ai/search", post(ai_handlers::ai_search))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/api/core/ai/chat", post(ai_handlers::chat))
        .route("/api/core/ai/generate", post(ai_handlers::generate))
        .route("/api/core/ai/validate", post(ai_handlers::validate))
        .route("/api/core/ai/complete", post(ai_handlers::complete))
        .route("/api/core/ai/summarize", post(ai_handlers::summarize))
        .route("/api/core/ai/templates", get(ai_handlers::list_templates))
        // 文档处理 API - 使用 DocumentApi 模块
        .route("/api/core/ai/documents", get(DocumentApi::list))
        .route("/api/core/ai/documents/upload", post(DocumentApi::upload))
        .route(
            "/api/core/ai/documents/vectorize-from-file",
            post(DocumentApi::vectorize_from_file),
        )
        .route("/api/core/ai/documents/{id}", get(DocumentApi::get))
        .route("/api/core/ai/documents/{id}", delete(DocumentApi::delete))
        .route(
            "/api/core/ai/documents/{id}/process",
            post(DocumentApi::process),
        )
        .route(
            "/api/core/ai/documents/{id}/extract",
            post(DocumentApi::extract),
        )
        .route(
            "/api/core/ai/documents/{id}/summarize",
            post(DocumentApi::summarize),
        )
        .route(
            "/api/core/ai/documents/{id}/key-points",
            post(DocumentApi::extract_key_points),
        )
        .route("/api/core/ai/documents/qa", post(DocumentApi::document_qa))
        // 向量检索 API - 使用 VectorApi 模块
        .route("/api/core/ai/vectors/stats", get(VectorApi::stats))
        .route("/api/core/ai/vectors/search", post(VectorApi::search))
        .route("/api/core/ai/vectors/store", post(VectorApi::store))
        .route("/api/core/ai/vectors/{id}", get(VectorApi::get))
        .route("/api/core/ai/vectors/{id}", delete(VectorApi::delete))
        .route(
            "/api/core/ai/vectors/batch-store",
            post(VectorApi::batch_store),
        )
        .route(
            "/api/core/ai/embedding/generate",
            post(EmbeddingApi::generate),
        )
        .route(
            "/api/core/ai/vectors/hybrid-search",
            post(VectorApi::hybrid_search),
        )
        .route("/api/core/ai/vectors/clear", post(VectorApi::clear_all))
        // 问答 API - 使用 QaApi 模块
        .route("/api/core/ai/qa/ask", post(QaApi::ask))
        .route(
            "/api/core/ai/qa/ask-with-context",
            post(QaApi::ask_with_context),
        )
        .route(
            "/api/core/ai/qa/ask-structured",
            post(QaApi::ask_structured),
        )
        .route(
            "/api/core/ai/qa/ask-conversation",
            post(QaApi::ask_conversation),
        )
        .route("/api/core/ai/qa/classify", post(QaApi::classify))
        .route("/api/core/ai/qa/history", get(QaApi::history))
        .route(
            "/api/core/ai/qa/history/{id}",
            delete(QaApi::delete_history),
        )
        .route(
            "/api/core/ai/qa/history/batch-delete",
            post(QaApi::batch_delete_history),
        )
        .route("/api/core/ai/qa/feedback", post(QaApi::feedback))
        // 数据连接器 API
        .route("/api/core/ai/connectors", get(connector_handlers::list_connectors))
        .route("/api/core/ai/connectors/get", get(connector_handlers::get_connector))
        .route("/api/core/ai/connectors/create", post(connector_handlers::create_connector))
        .route("/api/core/ai/connectors/update", post(connector_handlers::update_connector))
        .route("/api/core/ai/connectors/delete", post(connector_handlers::delete_connector))
        .route("/api/core/ai/connectors/test", get(connector_handlers::test_connector))
        .route("/api/core/ai/connectors/query", post(connector_handlers::query_data))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .with_state(app_state.clone());

    // 分析 API - 使用 AnalysisApi 模块
    let analysis_router = Router::new()
        .route(
            "/api/core/ai/analysis/sentiment",
            post(AnalysisApi::sentiment),
        )
        .route(
            "/api/core/ai/analysis/classify",
            post(AnalysisApi::classify),
        )
        .route(
            "/api/core/ai/analysis/entities",
            post(AnalysisApi::extract_entities),
        )
        .route(
            "/api/core/ai/analysis/keywords",
            post(AnalysisApi::extract_keywords),
        )
        .route("/api/core/ai/analysis/history", post(AnalysisApi::history))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .with_state(app_state.clone());

    let agent_router = Router::new()
        .merge(crate::modules::agent::create_routes())
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .with_state(app_state.clone());

    let recommendation_router = Router::new()
        .route("/api/core/ai/recommend", post(RecommendationApi::recommend))
        .route(
            "/api/core/ai/recommend/documents",
            post(RecommendationApi::recommend_documents),
        )
        .route(
            "/api/core/ai/recommend/opportunities",
            post(RecommendationApi::recommend_opportunities),
        )
        .route(
            "/api/core/ai/recommend/knowledge",
            post(RecommendationApi::recommend_knowledge),
        )
        .route(
            "/api/core/ai/profile/get",
            post(RecommendationApi::get_user_profile),
        )
        .route(
            "/api/core/ai/profile/update",
            post(RecommendationApi::update_user_profile),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .with_state(app_state.clone());

    let multimodal_router = Router::new()
        .route(
            "/api/core/ai/multimodal/image/analyze",
            post(MultimodalApi::analyze_image),
        )
        .route(
            "/api/core/ai/multimodal/image/caption",
            post(MultimodalApi::generate_caption),
        )
        .route(
            "/api/core/ai/multimodal/image/objects",
            post(MultimodalApi::detect_objects),
        )
        .route(
            "/api/core/ai/multimodal/image/text",
            post(MultimodalApi::extract_text),
        )
        .route(
            "/api/core/ai/multimodal/image/describe",
            post(MultimodalApi::describe_image),
        )
        .route(
            "/api/core/ai/multimodal/video/analyze",
            post(MultimodalApi::analyze_video),
        )
        .route(
            "/api/core/ai/multimodal/video/summary",
            post(MultimodalApi::summarize_video),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(analysis_router)
        .merge(agent_router)
        .merge(recommendation_router)
        .merge(multimodal_router)
        .merge(create_api_info_router("topems-ai"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors)
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024));

    let cfg = RouteCompatConfig::new("ai", "/api/core/ai", &[]);
    let app = wrap_group2_router(app, cfg);

    app
}
