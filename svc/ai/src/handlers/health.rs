#![allow(dead_code)]

use crate::shared::AppState;
use axum::extract::State;
use axum::Json;
use reqwest::Client;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::health::{check_http_health, DependencyHealth, HealthStatus, ServiceHealth};

pub async fn home() -> &'static str {
    "TOPEMS-AI 智能知识库服务 API\n\nPublic Endpoints:\n  GET  /              - API documentation\n  GET  /health        - Health check\n  GET  /api/plugins/info     - Plugin info\n  GET  /api/plugins/health   - Plugin health\n  GET  /api/core/ai/health/detailed - Detailed health\n  GET  /api/core/ai/metrics       - Metrics\n  POST /api/core/ai/search        - AI search\n  GET  /api/info            - API info\n\nProtected Endpoints (require JWT token):\n\nChat & Generation:\n  POST /api/core/ai/chat          - Chat with AI\n  POST /api/core/ai/generate      - Generate content\n  POST /api/core/ai/validate     - Data validation\n  POST /api/core/ai/complete     - Data completion\n  POST /api/core/ai/summarize    - Text summarization\n  GET  /api/core/ai/templates    - List AI templates\n\nDocuments:\n  GET  /api/core/ai/documents              - List documents\n  POST /api/core/ai/documents/upload        - Upload document\n  GET  /api/core/ai/documents/{id}         - Get document\n  DELETE /api/core/ai/documents/{id}       - Delete document\n  POST /api/core/ai/documents/{id}/process - Process document\n  POST /api/core/ai/documents/{id}/extract - Extract from document\n  POST /api/core/ai/documents/{id}/summarize - Summarize document\n  POST /api/core/ai/documents/{id}/key-points - Extract key points\n  POST /api/core/ai/documents/qa           - Document Q&A\n\nVectors:\n  GET  /api/core/ai/vectors/stats         - Vector stats\n  POST /api/core/ai/vectors/search        - Vector search\n  POST /api/core/ai/vectors/store         - Store vector\n  POST /api/core/ai/vectors/batch-store  - Batch store vectors\n  GET  /api/core/ai/vectors/{id}         - Get vector\n  DELETE /api/core/ai/vectors/{id}       - Delete vector\n  POST /api/core/ai/vectors/clear        - Clear all vectors\n  POST /api/core/ai/vectors/hybrid-search - Hybrid search\n  POST /api/core/ai/embedding/generate   - Generate embeddings\n\nQA (Question Answering):\n  POST /api/core/ai/qa/ask              - Ask question\n  POST /api/core/ai/qa/ask-with-context - Ask with context\n  POST /api/core/ai/qa/ask-structured   - Structured response\n  POST /api/core/ai/qa/ask-conversation - Conversational Q&A\n  POST /api/core/ai/qa/classify         - Classify question\n  GET  /api/core/ai/qa/history          - Q&A history\n  DELETE /api/core/ai/qa/history/{id}   - Delete history item\n  POST /api/core/ai/qa/feedback         - Submit feedback\n\nAnalysis:\n  POST /api/core/ai/analysis/sentiment   - Sentiment analysis\n  POST /api/core/ai/analysis/classify    - Text classification\n  POST /api/core/ai/analysis/entities    - Extract entities\n  POST /api/core/ai/analysis/keywords    - Extract keywords\n  GET  /api/core/ai/analysis/history     - Analysis history\n\nConnectors:\n  GET  /api/core/ai/connectors          - List connectors\n  GET  /api/core/ai/connectors/get      - Get connector\n  POST /api/core/ai/connectors/create   - Create connector\n  POST /api/core/ai/connectors/update   - Update connector\n  POST /api/core/ai/connectors/delete   - Delete connector\n  GET  /api/core/ai/connectors/test     - Test connector\n  POST /api/core/ai/connectors/query    - Query data\n\nRecommendation:\n  POST /api/core/ai/recommend           - General recommendations\n  POST /api/core/ai/recommend/documents - Document recommendations\n  POST /api/core/ai/recommend/opportunities - Opportunity recommendations\n  POST /api/core/ai/recommend/knowledge - Knowledge recommendations\n  POST /api/core/ai/profile/get         - Get user profile\n  POST /api/core/ai/profile/update      - Update user profile\n\nMultimodal:\n  POST /api/core/ai/multimodal/image/analyze   - Analyze image\n  POST /api/core/ai/multimodal/image/caption   - Generate caption\n  POST /api/core/ai/multimodal/image/objects   - Detect objects\n  POST /api/core/ai/multimodal/image/text      - Extract text from image\n  POST /api/core/ai/multimodal/image/describe  - Describe image\n  POST /api/core/ai/multimodal/video/analyze   - Analyze video\n  POST /api/core/ai/multimodal/video/summary   - Summarize video\n\nAgent:\n  POST /api/core/ai/agent/execute       - Execute agent task\n  GET  /api/core/ai/agent/status/{id}  - Get task status\n"
}

pub async fn health() -> Json<ApiResponse<String>> {
    let iam_health = check_iam_health().await;

    let overall_status = if iam_health.status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Degraded
    };

    let status_str = match overall_status {
        HealthStatus::Healthy => "healthy".to_string(),
        HealthStatus::Degraded => "degraded".to_string(),
        HealthStatus::Unhealthy => "unhealthy".to_string(),
    };

    Json(ApiResponse::success(status_str, "健康检查"))
}

pub async fn health_check_detailed(
    State(state): State<AppState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_iam_health().await,
        check_database_health(&state.document_service.pool().await).await,
        check_ai_service_health().await,
    ];

    let all_healthy = dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy);
    let any_unhealthy = dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy);

    let overall_status = if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let message = match overall_status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    };

    let health =
        ServiceHealth::healthy_with_message("topems-ai", message).with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn check_iam_health() -> DependencyHealth {
    let iam_url =
        std::env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

async fn check_database_health(db: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1").execute(db).await {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
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
