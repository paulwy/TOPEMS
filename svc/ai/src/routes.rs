#![allow(dead_code)]

use crate::handlers::{ai_handlers, connector_handlers, health};
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
        .route("/health/detailed", get(health::health_check_detailed))
        .route("/search", post(ai_handlers::ai_search))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/chat", post(ai_handlers::chat))
        .route("/generate", post(ai_handlers::generate))
        .route("/validate", post(ai_handlers::validate))
        .route("/complete", post(ai_handlers::complete))
        .route("/summarize", post(ai_handlers::summarize))
        .route("/templates", get(ai_handlers::list_templates))
        // 文档处理 API - 使用 DocumentApi 模块
        .route("/documents", get(DocumentApi::list))
        .route("/documents/upload", post(DocumentApi::upload))
        .route(
            "/documents/vectorize-from-file",
            post(DocumentApi::vectorize_from_file),
        )
        .route("/documents/{id}", get(DocumentApi::get))
        .route("/documents/{id}", delete(DocumentApi::delete))
        .route("/documents/{id}/process", post(DocumentApi::process))
        .route("/documents/{id}/extract", post(DocumentApi::extract))
        .route("/documents/{id}/summarize", post(DocumentApi::summarize))
        .route(
            "/documents/{id}/key-points",
            post(DocumentApi::extract_key_points),
        )
        .route("/documents/qa", post(DocumentApi::document_qa))
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
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
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
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let agent_router = Router::new()
        .merge(crate::modules::agent::create_routes())
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

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
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
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
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .nest("/api/ai", protected_routes)
        .nest("/api/ai", analysis_router)
        .nest("/api/ai", agent_router)
        .nest("/api/ai", recommendation_router)
        .nest("/api/ai", multimodal_router)
        .merge(create_api_info_router("topems-ai"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors)
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024));

    app
}
