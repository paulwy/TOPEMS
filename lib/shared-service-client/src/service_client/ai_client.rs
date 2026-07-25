use super::generic::ApiResponse;

crate::define_service_client!(
    AiServiceClient,
    "AI_SERVICE_URL",
    "http://localhost:8013",
    {
        chat_completion() -> ApiResponse<serde_json::Value> {
            post => "/api/ai/chat/completion"; body: data: &serde_json::Value
        }
        text_embedding() -> ApiResponse<serde_json::Value> {
            post => "/api/ai/embedding"; body: data: &serde_json::Value
        }
        document_summarize() -> ApiResponse<serde_json::Value> {
            post => "/api/ai/document/summarize"; body: data: &serde_json::Value
        }
        code_generate() -> ApiResponse<serde_json::Value> {
            post => "/api/ai/code/generate"; body: data: &serde_json::Value
        }
        ai_analyze() -> ApiResponse<serde_json::Value> {
            post => "/api/ai/analyze"; body: data: &serde_json::Value
        }
    }
);
