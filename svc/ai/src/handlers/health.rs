#![allow(dead_code)]

use crate::shared::AppState;
use axum::extract::State;
use axum::Json;
use reqwest::Client;
use topems_shared::ApiResponse;
use topems_shared_bootstrap::{
    check_database_health, check_iam_health, health_status_str, overall_health_message,
    rollup_health_status,
};
use topems_shared_core::health::{DependencyHealth, HealthStatus, ServiceHealth};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn home() -> &'static str {
    "TOPEMS-AI 智能知识库服务 API\n\nPublic Endpoints:\n  GET  /              - API documentation\n  GET  /health        - Health check\n  GET  /api/plugins/info     - Plugin info\n  GET  /api/plugins/health   - Plugin health\n  GET  /api/core/ai/health/detailed - Detailed health\n  GET  /api/core/ai/metrics       - Metrics\n  POST /api/core/ai/search        - AI search\n  GET  /api/info            - API info\n\nProtected Endpoints (require JWT token):\n\nChat & Generation:\n  POST /api/core/ai/chat          - Chat with AI\n  POST /api/core/ai/generate      - Generate content\n  POST /api/core/ai/validate     - Data validation\n  POST /api/core/ai/complete     - Data completion\n  POST /api/core/ai/summarize    - Text summarization\n  GET  /api/core/ai/templates    - List AI templates\n\nDocuments:\n  GET  /api/core/ai/documents              - List documents\n  POST /api/core/ai/documents/upload        - Upload document\n  GET  /api/core/ai/documents/{id}         - Get document\n  DELETE /api/core/ai/documents/{id}       - Delete document\n  POST /api/core/ai/documents/{id}/process - Process document\n  POST /api/core/ai/documents/{id}/extract - Extract from document\n  POST /api/core/ai/documents/{id}/summarize - Summarize document\n  POST /api/core/ai/documents/{id}/key-points - Extract key points\n  POST /api/core/ai/documents/qa           - Document Q&A\n\nVectors:\n  GET  /api/core/ai/vectors/stats         - Vector stats\n  POST /api/core/ai/vectors/search        - Vector search\n  POST /api/core/ai/vectors/store         - Store vector\n  POST /api/core/ai/vectors/batch-store  - Batch store vectors\n  GET  /api/core/ai/vectors/{id}         - Get vector\n  DELETE /api/core/ai/vectors/{id}       - Delete vector\n  POST /api/core/ai/vectors/clear        - Clear all vectors\n  POST /api/core/ai/vectors/hybrid-search - Hybrid search\n  POST /api/core/ai/embedding/generate   - Generate embeddings\n\nQA (Question Answering):\n  POST /api/core/ai/qa/ask              - Ask question\n  POST /api/core/ai/qa/ask-with-context - Ask with context\n  POST /api/core/ai/qa/ask-structured   - Structured response\n  POST /api/core/ai/qa/ask-conversation - Conversational Q&A\n  POST /api/core/ai/qa/classify         - Classify question\n  GET  /api/core/ai/qa/history          - Q&A history\n  DELETE /api/core/ai/qa/history/{id}   - Delete history item\n  POST /api/core/ai/qa/feedback         - Submit feedback\n\nAnalysis:\n  POST /api/core/ai/analysis/sentiment   - Sentiment analysis\n  POST /api/core/ai/analysis/classify    - Text classification\n  POST /api/core/ai/analysis/entities    - Extract entities\n  POST /api/core/ai/analysis/keywords    - Extract keywords\n  GET  /api/core/ai/analysis/history     - Analysis history\n\nConnectors:\n  GET  /api/core/ai/connectors          - List connectors\n  GET  /api/core/ai/connectors/get      - Get connector\n  POST /api/core/ai/connectors/create   - Create connector\n  POST /api/core/ai/connectors/update   - Update connector\n  POST /api/core/ai/connectors/delete   - Delete connector\n  GET  /api/core/ai/connectors/test     - Test connector\n  POST /api/core/ai/connectors/query    - Query data\n\nRecommendation:\n  POST /api/core/ai/recommend           - General recommendations\n  POST /api/core/ai/recommend/documents - Document recommendations\n  POST /api/core/ai/recommend/opportunities - Opportunity recommendations\n  POST /api/core/ai/recommend/knowledge - Knowledge recommendations\n  POST /api/core/ai/profile/get         - Get user profile\n  POST /api/core/ai/profile/update      - Update user profile\n\nMultimodal:\n  POST /api/core/ai/multimodal/image/analyze   - Analyze image\n  POST /api/core/ai/multimodal/image/caption   - Generate caption\n  POST /api/core/ai/multimodal/image/objects   - Detect objects\n  POST /api/core/ai/multimodal/image/text      - Extract text from image\n  POST /api/core/ai/multimodal/image/describe  - Describe image\n  POST /api/core/ai/multimodal/video/analyze   - Analyze video\n  POST /api/core/ai/multimodal/video/summary   - Summarize video\n\nAgent:\n  POST /api/core/ai/agent/execute       - Execute agent task\n  GET  /api/core/ai/agent/status/{id}  - Get task status\n"
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/health",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn health() -> Json<ApiResponse<String>> {
    let iam_health = check_iam_health().await;
    let overall_status = rollup_health_status(&[iam_health.status]);
    Json(ApiResponse::success(
        health_status_str(&overall_status).to_string(),
        "健康检查",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/health/detailed",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn health_check_detailed(
    State(state): State<AppState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_iam_health().await,
        check_database_health(&state.document_service.pool().await).await,
        check_ai_service_health().await,
    ];

    let statuses: Vec<HealthStatus> = dependencies.iter().map(|d| d.status.clone()).collect();
    let overall_status = rollup_health_status(&statuses);
    let message = overall_health_message(&overall_status);

    let health =
        ServiceHealth::healthy_with_message("topems-ai", message).with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn check_ai_service_health() -> DependencyHealth {
    let base_url = std::env::var("OLLAMA_URL")
        .or_else(|_| std::env::var("OLLAMA_BASE_URL"))
        .or_else(|_| std::env::var("OPENAI_BASE_URL"))
        .unwrap_or_else(|_| "http://localhost:11434/v1".to_string());

    let health_url = format!("{}/models", base_url);

    let client = Client::new();
    match client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "ai-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "AI 服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "ai-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("AI 服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("AI 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "ai-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("AI 服务连接异常: {}", e),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_home_returns_non_empty_string() {
        let result = home().await;
        assert!(!result.is_empty());
    }

    #[tokio::test]
    async fn test_home_contains_api_info() {
        let result = home().await;
        assert!(result.contains("TOPEMS-AI"));
        assert!(result.contains("health"));
    }

    #[tokio::test]
    async fn test_home_mentions_documents_endpoint() {
        let result = home().await;
        assert!(result.contains("documents"));
    }

    #[tokio::test]
    async fn test_home_mentions_qa_endpoint() {
        let result = home().await;
        assert!(result.contains("qa"));
    }

    #[tokio::test]
    async fn test_home_mentions_analysis_endpoint() {
        let result = home().await;
        assert!(result.contains("analysis"));
    }

    #[tokio::test]
    async fn test_home_mentions_connectors_endpoint() {
        let result = home().await;
        assert!(result.contains("connectors"));
    }

    #[tokio::test]
    async fn test_home_mentions_vectors_endpoint() {
        let result = home().await;
        assert!(result.contains("vectors"));
    }
}
