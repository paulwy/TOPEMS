use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// 搜索结果 - 使用 services/vector 模块的定义
pub use crate::services::vector::SearchResult;

/// 问答历史
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QAHistory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub question: String,
    pub answer: String,
    pub context: Option<serde_json::Value>,
    pub sources: Option<Vec<SearchResult>>,
    pub feedback: Option<String>,
    pub rating: Option<i32>,
    pub created_at: DateTime<Utc>,
}

/// 分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub analysis_type: String,
    pub input_text: String,
    pub result: serde_json::Value,
    pub confidence: Option<f64>,
    pub created_at: DateTime<Utc>,
}

/// 文档处理请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct ProcessDocumentRequest {
    pub document_id: Uuid,
    #[allow(dead_code)]
    pub chunk_size: Option<usize>,
    #[allow(dead_code)]
    pub overlap: Option<usize>,
}

/// 文档提取请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct ExtractDocumentRequest {
    #[allow(dead_code)]
    pub document_id: Uuid,
    pub extract_type: String, // keywords, summary, entities
}

/// 文档摘要请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct SummarizeDocumentRequest {
    #[allow(dead_code)]
    pub document_id: Uuid,
    pub max_length: Option<i32>,
}

/// 提取关键点请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct ExtractKeyPointsRequest {
    pub max_points: Option<i32>,
}

/// 提取关键点响应
#[derive(Debug, Serialize)]
pub struct ExtractKeyPointsResponse {
    pub document_id: Uuid,
    pub key_points: Vec<String>,
}

/// 文档问答请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct DocumentQAQuestionRequest {
    pub question: String,
    pub document_ids: Option<Vec<Uuid>>,
    pub top_k: Option<usize>,
}

/// 文档问答响应
#[derive(Debug, Serialize)]
pub struct DocumentQAAnswerResponse {
    pub answer: String,
    pub confidence: f64,
    pub sources: Vec<DocumentQASourceResponse>,
    pub follow_up_questions: Vec<String>,
}

/// 文档问答来源响应
#[derive(Debug, Serialize)]
pub struct DocumentQASourceResponse {
    pub document_id: Uuid,
    pub document_title: String,
    pub chunk_content: String,
    pub similarity: f64,
}

/// 向量存储请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct StoreVectorRequest {
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Vec<f32>,
}

/// 批量向量存储请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchStoreVectorsRequest {
    pub vectors: Vec<StoreVectorRequest>,
}

/// 向量搜索请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct VectorSearchRequest {
    #[allow(dead_code)]
    pub query: String,
    pub top_k: Option<usize>,
    #[allow(dead_code)]
    pub threshold: Option<f64>,
}

/// 混合检索请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct HybridSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
    pub vector_weight: Option<f64>,
    pub keyword_weight: Option<f64>,
}

/// 问答请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct AskRequest {
    pub question: String,
    #[allow(dead_code)]
    pub conversation_id: Option<Uuid>,
    pub top_k: Option<usize>,
}

/// 基于文档上下文提问请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct AskWithContextRequest {
    pub question: String,
    pub document_ids: Vec<Uuid>,
    pub top_k: Option<usize>,
}

/// 答案反馈请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct FeedbackRequest {
    pub qa_id: Uuid,
    pub feedback: String,
    pub rating: Option<i32>,
}

/// 情感分析请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct SentimentAnalysisRequest {
    pub text: String,
}

/// 分析历史请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct AnalysisHistoryRequest {
    pub analysis_type: Option<String>,
    pub limit: Option<usize>,
}

/// 分析历史响应
#[derive(Debug, Serialize)]
pub struct AnalysisHistoryResponse {
    pub history: Vec<AnalysisResult>,
    pub total: i32,
}

/// 文本分类请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct ClassifyTextRequest {
    pub text: String,
    pub categories: Option<Vec<String>>,
}

/// 实体提取请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct ExtractEntitiesRequest {
    pub text: String,
    pub entity_types: Option<Vec<String>>,
}

/// 关键词提取请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct ExtractKeywordsRequest {
    pub text: String,
    pub max_keywords: Option<i32>,
}

/// 文档上传响应
#[derive(Debug, Serialize)]
pub struct UploadDocumentResponse {
    pub document_id: Uuid,
    pub message: String,
}

/// 文档处理响应
#[derive(Debug, Serialize)]
pub struct ProcessDocumentResponse {
    pub document_id: Uuid,
    pub chunks_count: i32,
    pub vectors_count: i32,
    pub status: String,
}

/// 文档提取响应
#[derive(Debug, Serialize)]
pub struct ExtractDocumentResponse {
    pub document_id: Uuid,
    pub extract_type: String,
    pub result: serde_json::Value,
}

/// 文档摘要响应
#[derive(Debug, Serialize)]
pub struct SummarizeDocumentResponse {
    pub document_id: Uuid,
    pub summary: String,
}

/// 向量存储响应
#[derive(Debug, Serialize)]
pub struct StoreVectorResponse {
    pub vector_id: Uuid,
    pub message: String,
}

/// 批量向量存储响应
#[derive(Debug, Serialize)]
pub struct BatchStoreVectorsResponse {
    pub stored_count: i32,
    pub message: String,
}

/// 向量搜索响应
#[derive(Debug, Serialize)]
pub struct VectorSearchResponse {
    pub results: Vec<SearchResult>,
    pub query_time_ms: u64,
}

/// 混合检索响应
#[derive(Debug, Serialize)]
pub struct HybridSearchResponse {
    pub results: Vec<HybridSearchResult>,
    pub query_time_ms: u64,
}

/// 混合检索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridSearchResult {
    pub document_id: Uuid,
    pub chunk_id: Uuid,
    pub content: String,
    pub vector_similarity: f64,
    pub keyword_score: f64,
    pub combined_score: f64,
    pub document_title: Option<String>,
}

/// 问答响应
#[derive(Debug, Serialize)]
pub struct AskResponse {
    pub answer: String,
    pub sources: Vec<SearchResult>,
    pub qa_id: Uuid,
    pub confidence: f64,
}

/// 问答历史响应
#[derive(Debug, Serialize)]
pub struct QAHistoryResponse {
    pub history: Vec<QAHistory>,
    pub total: i32,
}

/// 答案反馈响应
#[derive(Debug, Serialize)]
pub struct FeedbackResponse {
    pub qa_id: Uuid,
    pub message: String,
}

/// 情感分析响应
#[derive(Debug, Serialize)]
pub struct SentimentAnalysisResponse {
    pub sentiment: String,
    pub confidence: f64,
    pub details: Option<serde_json::Value>,
}

/// 文本分类响应
#[derive(Debug, Serialize)]
pub struct ClassifyTextResponse {
    pub category: String,
    pub confidence: f64,
    pub all_categories: Option<Vec<CategoryScore>>,
}

/// 分类得分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryScore {
    pub category: String,
    pub score: f64,
}

/// 实体提取响应
#[derive(Debug, Serialize)]
pub struct ExtractEntitiesResponse {
    pub entities: Vec<Entity>,
}

/// 实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub text: String,
    pub entity_type: String,
    pub start_pos: i32,
    pub end_pos: i32,
    pub confidence: f64,
}

/// 关键词提取响应
#[derive(Debug, Serialize)]
pub struct ExtractKeywordsResponse {
    pub keywords: Vec<Keyword>,
}

/// 关键词
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyword {
    pub text: String,
    pub score: f64,
    pub frequency: i32,
}

/// 向量统计信息
#[derive(Debug, Serialize)]
pub struct VectorStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub total_vectors: usize,
    pub vector_dimension: usize,
}

/// 从 File 服务向量化请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct VectorizeFromFileRequest {
    pub file_id: Uuid,
}

/// 从 File 服务向量化响应
#[derive(Debug, Serialize)]
pub struct VectorizeFromFileResponse {
    pub document_id: Uuid,
    pub file_id: Uuid,
    pub chunks_count: usize,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn any_uuid() -> Uuid {
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    }

    // ── QAHistory (Serialize + Deserialize) ──

    #[test]
    fn test_qa_history_serde_roundtrip() {
        let item = QAHistory {
            id: any_uuid(),
            tenant_id: any_uuid(),
            question: "什么是 TOPEMS?".into(),
            answer: "TOPEMS 是一个企业系统".into(),
            context: Some(serde_json::json!({"k": "v"})),
            sources: None,
            feedback: Some("good".into()),
            rating: Some(5),
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&item).unwrap();
        let back: QAHistory = serde_json::from_str(&json).unwrap();
        assert_eq!(back.question, item.question);
        assert_eq!(back.answer, item.answer);
        assert_eq!(back.rating, Some(5));
    }

    #[test]
    fn test_qa_history_minimal() {
        let item = QAHistory {
            id: any_uuid(),
            tenant_id: any_uuid(),
            question: "q".into(),
            answer: "a".into(),
            context: None,
            sources: None,
            feedback: None,
            rating: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"question\":\"q\""));
    }

    // ── AnalysisResult ──

    #[test]
    fn test_analysis_result_serde_roundtrip() {
        let item = AnalysisResult {
            id: any_uuid(),
            tenant_id: any_uuid(),
            analysis_type: "sentiment".into(),
            input_text: "text".into(),
            result: serde_json::json!({"score": 0.9}),
            confidence: Some(0.92),
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&item).unwrap();
        let back: AnalysisResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.analysis_type, "sentiment");
        assert_eq!(back.confidence, Some(0.92));
    }

    // ── Request types (Deserialize only) ──

    #[test]
    fn test_process_document_request_deserialize() {
        let json = format!(
            "{{\"document_id\":\"{}\",\"chunk_size\":512,\"overlap\":64}}",
            any_uuid()
        );
        let req: ProcessDocumentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.chunk_size, Some(512));
        assert_eq!(req.overlap, Some(64));
    }

    #[test]
    fn test_process_document_request_minimal() {
        let json = format!("{{\"document_id\":\"{}\"}}", any_uuid());
        let req: ProcessDocumentRequest = serde_json::from_str(&json).unwrap();
        assert!(req.chunk_size.is_none());
    }

    #[test]
    fn test_extract_document_request_deserialize() {
        let json = format!(
            "{{\"document_id\":\"{}\",\"extract_type\":\"keywords\"}}",
            any_uuid()
        );
        let req: ExtractDocumentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.extract_type, "keywords");
    }

    #[test]
    fn test_summarize_document_request_deserialize() {
        let json = format!("{{\"document_id\":\"{}\",\"max_length\":200}}", any_uuid());
        let req: SummarizeDocumentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.max_length, Some(200));
    }

    #[test]
    fn test_extract_key_points_request_deserialize() {
        let req: ExtractKeyPointsRequest = serde_json::from_str("{\"max_points\":5}").unwrap();
        assert_eq!(req.max_points, Some(5));
    }

    #[test]
    fn test_extract_key_points_request_empty() {
        let req: ExtractKeyPointsRequest = serde_json::from_str("{}").unwrap();
        assert!(req.max_points.is_none());
    }

    #[test]
    fn test_extract_key_points_response_serialize() {
        let resp = ExtractKeyPointsResponse {
            document_id: any_uuid(),
            key_points: vec!["point1".into(), "point2".into()],
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"key_points\":[\"point1\",\"point2\"]"));
    }

    #[test]
    fn test_document_qa_question_request_deserialize() {
        let req: DocumentQAQuestionRequest =
            serde_json::from_str("{\"question\":\"如何安装?\",\"top_k\":3}").unwrap();
        assert_eq!(req.question, "如何安装?");
        assert_eq!(req.top_k, Some(3));
        assert!(req.document_ids.is_none());
    }

    #[test]
    fn test_document_qa_answer_response_serialize() {
        let resp = DocumentQAAnswerResponse {
            answer: "答案是…".into(),
            confidence: 0.85,
            sources: vec![],
            follow_up_questions: vec!["后续1".into()],
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"confidence\":0.85"));
    }

    #[test]
    fn test_document_qa_source_response_serialize() {
        let resp = DocumentQASourceResponse {
            document_id: any_uuid(),
            document_title: "标题".into(),
            chunk_content: "内容".into(),
            similarity: 0.78,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"similarity\":0.78"));
    }

    // ── Vector-related requests ──

    #[test]
    fn test_store_vector_request_deserialize() {
        let json = format!(
            "{{\"document_id\":\"{}\",\"chunk_id\":\"{}\",\"chunk_index\":3,\"content\":\"hello\",\"embedding\":[0.1,0.2,0.3]}}",
            any_uuid(),
            any_uuid()
        );
        let req: StoreVectorRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.chunk_index, 3);
        assert_eq!(req.embedding, vec![0.1, 0.2, 0.3]);
    }

    #[test]
    fn test_batch_store_vectors_request_deserialize() {
        let single = format!(
            "{{\"document_id\":\"{}\",\"chunk_id\":\"{}\",\"chunk_index\":0,\"content\":\"a\",\"embedding\":[0.1]}}",
            any_uuid(),
            any_uuid()
        );
        let json = format!("{{\"vectors\":[{}]}}", single);
        let req: BatchStoreVectorsRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.vectors.len(), 1);
    }

    #[test]
    fn test_vector_search_request_deserialize() {
        let req: VectorSearchRequest =
            serde_json::from_str("{\"query\":\"test\",\"top_k\":5}").unwrap();
        assert_eq!(req.top_k, Some(5));
    }

    #[test]
    fn test_hybrid_search_request_deserialize() {
        let req: HybridSearchRequest = serde_json::from_str(
            "{\"query\":\"q\",\"top_k\":10,\"vector_weight\":0.7,\"keyword_weight\":0.3}",
        )
        .unwrap();
        assert_eq!(req.vector_weight, Some(0.7));
        assert_eq!(req.keyword_weight, Some(0.3));
    }

    #[test]
    fn test_ask_request_deserialize() {
        let req: AskRequest =
            serde_json::from_str("{\"question\":\"如何配置?\",\"top_k\":3}").unwrap();
        assert_eq!(req.question, "如何配置?");
        assert_eq!(req.top_k, Some(3));
    }

    #[test]
    fn test_ask_with_context_request_deserialize() {
        let json = format!(
            "{{\"question\":\"q\",\"document_ids\":[\"{}\"],\"top_k\":2}}",
            any_uuid()
        );
        let req: AskWithContextRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.document_ids.len(), 1);
    }

    #[test]
    fn test_feedback_request_deserialize() {
        let json = format!(
            "{{\"qa_id\":\"{}\",\"feedback\":\"good\",\"rating\":5}}",
            any_uuid()
        );
        let req: FeedbackRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.feedback, "good");
        assert_eq!(req.rating, Some(5));
    }

    #[test]
    fn test_sentiment_analysis_request_deserialize() {
        let req: SentimentAnalysisRequest =
            serde_json::from_str("{\"text\":\"今天天气很好\"}").unwrap();
        assert_eq!(req.text, "今天天气很好");
    }

    #[test]
    fn test_analysis_history_request_deserialize() {
        let req: AnalysisHistoryRequest =
            serde_json::from_str("{\"analysis_type\":\"sentiment\",\"limit\":20}").unwrap();
        assert_eq!(req.analysis_type.as_deref(), Some("sentiment"));
        assert_eq!(req.limit, Some(20));
    }

    #[test]
    fn test_analysis_history_response_serialize() {
        let resp = AnalysisHistoryResponse {
            history: vec![],
            total: 0,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"total\":0"));
    }

    #[test]
    fn test_classify_text_request_deserialize() {
        let req: ClassifyTextRequest =
            serde_json::from_str("{\"text\":\"hello\",\"categories\":[\"a\",\"b\"]}").unwrap();
        assert_eq!(
            req.categories.as_deref(),
            Some(&["a".to_string(), "b".to_string()][..])
        );
    }

    #[test]
    fn test_extract_entities_request_deserialize() {
        let req: ExtractEntitiesRequest =
            serde_json::from_str("{\"text\":\"text\",\"entity_types\":[\"PER\"]}").unwrap();
        assert_eq!(req.entity_types.as_deref().map(|v| v.len()), Some(1));
    }

    #[test]
    fn test_extract_keywords_request_deserialize() {
        let req: ExtractKeywordsRequest =
            serde_json::from_str("{\"text\":\"text\",\"max_keywords\":5}").unwrap();
        assert_eq!(req.max_keywords, Some(5));
    }

    // ── Response types (Serialize only) ──

    #[test]
    fn test_upload_document_response_serialize() {
        let resp = UploadDocumentResponse {
            document_id: any_uuid(),
            message: "上传成功".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"message\":\"上传成功\""));
    }

    #[test]
    fn test_process_document_response_serialize() {
        let resp = ProcessDocumentResponse {
            document_id: any_uuid(),
            chunks_count: 5,
            vectors_count: 5,
            status: "ready".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"status\":\"ready\""));
    }

    #[test]
    fn test_extract_document_response_serialize() {
        let resp = ExtractDocumentResponse {
            document_id: any_uuid(),
            extract_type: "keywords".into(),
            result: serde_json::json!({"k": ["a"]}),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"extract_type\":\"keywords\""));
    }

    #[test]
    fn test_summarize_document_response_serialize() {
        let resp = SummarizeDocumentResponse {
            document_id: any_uuid(),
            summary: "摘要内容".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"summary\":\"摘要内容\""));
    }

    #[test]
    fn test_store_vector_response_serialize() {
        let resp = StoreVectorResponse {
            vector_id: any_uuid(),
            message: "OK".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"message\":\"OK\""));
    }

    #[test]
    fn test_batch_store_vectors_response_serialize() {
        let resp = BatchStoreVectorsResponse {
            stored_count: 10,
            message: "done".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"stored_count\":10"));
    }

    #[test]
    fn test_vector_search_response_serialize() {
        let resp = VectorSearchResponse {
            results: vec![],
            query_time_ms: 42,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"query_time_ms\":42"));
    }

    #[test]
    fn test_hybrid_search_response_serialize() {
        let resp = HybridSearchResponse {
            results: vec![],
            query_time_ms: 100,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"query_time_ms\":100"));
    }

    // ── HybridSearchResult (Serialize + Deserialize) ──

    #[test]
    fn test_hybrid_search_result_serde_roundtrip() {
        let item = HybridSearchResult {
            document_id: any_uuid(),
            chunk_id: any_uuid(),
            content: "内容".into(),
            vector_similarity: 0.8,
            keyword_score: 0.4,
            combined_score: 0.6,
            document_title: Some("标题".into()),
        };
        let json = serde_json::to_string(&item).unwrap();
        let back: HybridSearchResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.combined_score, 0.6);
        assert_eq!(back.document_title.as_deref(), Some("标题"));
    }

    #[test]
    fn test_hybrid_search_result_no_title() {
        let item = HybridSearchResult {
            document_id: any_uuid(),
            chunk_id: any_uuid(),
            content: "c".into(),
            vector_similarity: 0.0,
            keyword_score: 0.0,
            combined_score: 0.0,
            document_title: None,
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"document_title\":null"));
    }

    // ── AskResponse / QAHistoryResponse ──

    #[test]
    fn test_ask_response_serialize() {
        let resp = AskResponse {
            answer: "回答".into(),
            sources: vec![],
            qa_id: any_uuid(),
            confidence: 0.7,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"confidence\":0.7"));
    }

    #[test]
    fn test_qa_history_response_serialize() {
        let resp = QAHistoryResponse {
            history: vec![],
            total: 0,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"total\":0"));
    }

    #[test]
    fn test_feedback_response_serialize() {
        let resp = FeedbackResponse {
            qa_id: any_uuid(),
            message: "感谢反馈".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"message\":\"感谢反馈\""));
    }

    #[test]
    fn test_sentiment_analysis_response_serialize() {
        let resp = SentimentAnalysisResponse {
            sentiment: "positive".into(),
            confidence: 0.95,
            details: Some(serde_json::json!({"intensity": 0.8})),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"sentiment\":\"positive\""));
    }

    #[test]
    fn test_classify_text_response_serialize() {
        let resp = ClassifyTextResponse {
            category: "tech".into(),
            confidence: 0.88,
            all_categories: Some(vec![CategoryScore {
                category: "tech".into(),
                score: 0.88,
            }]),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"category\":\"tech\""));
    }

    #[test]
    fn test_category_score_serde_roundtrip() {
        let cs = CategoryScore {
            category: "x".into(),
            score: 0.5,
        };
        let json = serde_json::to_string(&cs).unwrap();
        let back: CategoryScore = serde_json::from_str(&json).unwrap();
        assert_eq!(back.score, 0.5);
    }

    #[test]
    fn test_extract_entities_response_serialize() {
        let resp = ExtractEntitiesResponse {
            entities: vec![Entity {
                text: "Apple".into(),
                entity_type: "ORG".into(),
                start_pos: 0,
                end_pos: 5,
                confidence: 0.9,
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"entity_type\":\"ORG\""));
    }

    #[test]
    fn test_entity_serde_roundtrip() {
        let e = Entity {
            text: "Beijing".into(),
            entity_type: "LOC".into(),
            start_pos: 10,
            end_pos: 17,
            confidence: 0.92,
        };
        let json = serde_json::to_string(&e).unwrap();
        let back: Entity = serde_json::from_str(&json).unwrap();
        assert_eq!(back.entity_type, "LOC");
    }

    #[test]
    fn test_extract_keywords_response_serialize() {
        let resp = ExtractKeywordsResponse {
            keywords: vec![Keyword {
                text: "AI".into(),
                score: 0.9,
                frequency: 5,
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"frequency\":5"));
    }

    #[test]
    fn test_keyword_serde_roundtrip() {
        let k = Keyword {
            text: "AI".into(),
            score: 0.9,
            frequency: 5,
        };
        let json = serde_json::to_string(&k).unwrap();
        let back: Keyword = serde_json::from_str(&json).unwrap();
        assert_eq!(back.frequency, 5);
    }

    #[test]
    fn test_vector_stats_serialize() {
        let stats = VectorStats {
            total_documents: 10,
            total_chunks: 100,
            total_vectors: 100,
            vector_dimension: 768,
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"vector_dimension\":768"));
    }

    #[test]
    fn test_vectorize_from_file_request_deserialize() {
        let json = format!("{{\"file_id\":\"{}\"}}", any_uuid());
        let req: VectorizeFromFileRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.file_id, any_uuid());
    }

    #[test]
    fn test_vectorize_from_file_response_serialize() {
        let resp = VectorizeFromFileResponse {
            document_id: any_uuid(),
            file_id: any_uuid(),
            chunks_count: 8,
            message: "done".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"chunks_count\":8"));
    }
}
