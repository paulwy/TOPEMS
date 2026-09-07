//! AI 知识库 - API handlers
//!
//! 所有接口在 `/knowledge/` 路径下（经 web 网关 /api/ai/knowledge/... 访问）。
//! 按业务域分组：知识库管理 / 文档管理 / 问答 / 检索

use std::sync::Arc;

use axum::{
    extract::{Extension, Multipart, Path as AxumPath, Query, State},
    Json,
};
use serde_json::json;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_ai::ai_client::UnifiedAIClient;
use topems_shared_core::response::{api_error, api_success};
use uuid::Uuid;

use crate::shared::AppState;

use super::document_processor::parse_document;
use super::models::*;
use super::rag;
use super::service;

// ============================================================
// 工具函数
// ============================================================

fn current_tenant_id(claims: &Claims) -> Uuid {
    service::parse_tenant_id(&claims.tenant_id)
}

fn current_user_id(claims: &Claims) -> Option<Uuid> {
    Uuid::parse_str(&claims.sub).ok()
}

/// 从文件名推断文档类型
fn infer_doc_type(filename: &str) -> Option<String> {
    let lower = filename.to_lowercase();
    if lower.ends_with(".txt") {
        Some("txt".to_string())
    } else if lower.ends_with(".md") || lower.ends_with(".markdown") {
        Some("md".to_string())
    } else if lower.ends_with(".pdf") {
        Some("pdf".to_string())
    } else if lower.ends_with(".docx") {
        Some("docx".to_string())
    } else if lower.ends_with(".html") || lower.ends_with(".htm") {
        Some("html".to_string())
    } else {
        None
    }
}

/// 创建 AI 客户端（handler 内部使用）
fn make_ai_client() -> Arc<UnifiedAIClient> {
    Arc::new(service::create_ai_client())
}

// ============================================================
// 知识库管理 API
// ============================================================

/// GET /api/core/ai-knowledge/bases
pub async fn list_knowledge_bases(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<KbQuery>,
) -> Json<ApiResponse<Vec<KnowledgeBase>>> {
    let tenant_id = current_tenant_id(&claims);
    match service::list_knowledge_bases(&state.pool, tenant_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[AiKnowledge] list_knowledge_bases 失败: {}", e);
            Json(api_error(500, "获取知识库列表失败"))
        }
    }
}

/// POST /api/core/ai-knowledge/bases
pub async fn create_knowledge_base(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateKbRequest>,
) -> Json<ApiResponse<KnowledgeBase>> {
    if req.name.trim().is_empty() {
        return Json(api_error(400, "知识库名称不能为空"));
    }
    let valid_types = ["general", "product", "internal", "faq"];
    if !valid_types.contains(&req.kb_type.as_str()) {
        return Json(api_error(400, "无效的知识库类型"));
    }

    let tenant_id = current_tenant_id(&claims);
    let Some(creator) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    match service::create_knowledge_base(&state.pool, tenant_id, &req, creator).await {
        Ok(item) => Json(api_success(item)),
        Err(e) => {
            tracing::error!("[AiKnowledge] create_knowledge_base 失败: {}", e);
            Json(api_error(500, "创建知识库失败"))
        }
    }
}

/// GET /api/core/ai-knowledge/bases/{id}
pub async fn get_knowledge_base(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
) -> Json<ApiResponse<KnowledgeBase>> {
    let tenant_id = current_tenant_id(&claims);
    match service::get_knowledge_base(&state.pool, tenant_id, id).await {
        Ok(Some(item)) => Json(api_success(item)),
        Ok(None) => Json(api_error(404, "知识库不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] get_knowledge_base 失败: {}", e);
            Json(api_error(500, "获取知识库失败"))
        }
    }
}

/// PUT /api/core/ai-knowledge/bases/{id}
pub async fn update_knowledge_base(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
    Json(req): Json<UpdateKbRequest>,
) -> Json<ApiResponse<KnowledgeBase>> {
    // 校验状态值
    if let Some(ref status) = req.status {
        if !["active", "inactive"].contains(&status.as_str()) {
            return Json(api_error(400, "无效的状态值"));
        }
    }
    if let Some(ref kb_type) = req.kb_type {
        if !["general", "product", "internal", "faq"].contains(&kb_type.as_str()) {
            return Json(api_error(400, "无效的知识库类型"));
        }
    }

    let tenant_id = current_tenant_id(&claims);
    match service::update_knowledge_base(&state.pool, tenant_id, id, &req).await {
        Ok(Some(item)) => Json(api_success(item)),
        Ok(None) => Json(api_error(404, "知识库不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] update_knowledge_base 失败: {}", e);
            Json(api_error(500, "更新知识库失败"))
        }
    }
}

/// DELETE /api/core/ai-knowledge/bases/{id}
pub async fn delete_knowledge_base(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = current_tenant_id(&claims);
    match service::delete_knowledge_base(&state.pool, tenant_id, id).await {
        Ok(true) => Json(api_success(json!({ "deleted": true }))),
        Ok(false) => Json(api_error(404, "知识库不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] delete_knowledge_base 失败: {}", e);
            Json(api_error(500, "删除知识库失败"))
        }
    }
}

// ============================================================
// 文档管理 API
// ============================================================

/// GET /api/core/ai-knowledge/documents
pub async fn list_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DocumentQuery>,
) -> Json<ApiResponse<Vec<KnowledgeDocument>>> {
    let tenant_id = current_tenant_id(&claims);
    match service::list_documents(&state.pool, tenant_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[AiKnowledge] list_documents 失败: {}", e);
            Json(api_error(500, "获取文档列表失败"))
        }
    }
}

/// POST /api/core/ai-knowledge/documents
///
/// 通过 multipart 上传文档文件，自动解析、分块、向量化（异步）
pub async fn upload_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<ApiResponse<KnowledgeDocument>> {
    let tenant_id = current_tenant_id(&claims);
    let Some(user_id) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    let mut kb_id: Option<Uuid> = None;
    let mut file_name: Option<String> = None;
    let mut file_data: Option<Vec<u8>> = None;
    let mut content_type: Option<String> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "kb_id" => {
                if let Ok(data) = field.bytes().await {
                    let s = String::from_utf8_lossy(&data);
                    kb_id = Uuid::parse_str(s.trim()).ok();
                }
            }
            "file" => {
                file_name = field.file_name().map(|s| s.to_string());
                content_type = field.content_type().map(|s| s.to_string());
                if let Ok(data) = field.bytes().await {
                    file_data = Some(data.to_vec());
                }
            }
            _ => {
                // 忽略未知字段
                let _ = field.bytes().await;
            }
        }
    }

    let Some(kb_id) = kb_id else {
        return Json(api_error(400, "缺少 kb_id 参数"));
    };
    let Some(file_name) = file_name else {
        return Json(api_error(400, "缺少文件"));
    };
    let Some(file_data) = file_data else {
        return Json(api_error(400, "文件内容为空"));
    };

    // 文件大小限制：50MB
    if file_data.len() > 50 * 1024 * 1024 {
        return Json(api_error(400, "文件大小超过限制（最大 50MB）"));
    }

    // 推断文档类型
    let doc_type = match infer_doc_type(&file_name) {
        Some(t) => t,
        None => {
            return Json(api_error(
                400,
                "不支持的文件类型，仅支持 txt/md/pdf/docx/html",
            ));
        }
    };

    // 解析文档内容
    let parsed_content = match parse_document(&doc_type, &file_data) {
        Ok(text) => text,
        Err(e) => {
            tracing::error!("[AiKnowledge] 文档解析失败: {}", e);
            return Json(api_error(400, &format!("文档解析失败: {}", e)));
        }
    };

    // 文件原件存储：ai 服务无外部存储服务（storage_service 属旧架构引用，已移除），
    // 文档内容以 parsed_content 落库（检索/问答用），storage_path 记引用路径供后续扩展
    let file_id = Uuid::new_v4();
    let storage_path = format!("ai_knowledge/{}/{:x}", claims.sub, file_id);

    let file_size = file_data.len() as i64;

    // 创建文档记录（status=pending）
    let document = match service::create_document_from_file(
        &state.pool,
        tenant_id,
        kb_id,
        &file_name,
        &doc_type,
        Some(&parsed_content),
        Some(&storage_path),
        Some(file_size),
        user_id,
    )
    .await
    {
        Ok(doc) => doc,
        Err(sqlx::Error::RowNotFound) => {
            return Json(api_error(404, "知识库不存在"));
        }
        Err(e) => {
            tracing::error!("[AiKnowledge] 创建文档记录失败: {}", e);
            return Json(api_error(500, "创建文档记录失败"));
        }
    };

    // 异步处理文档（向量化）：spawn 后台任务
    let pool_clone = state.pool.clone();
    let ai_client = make_ai_client();
    let doc_id = document.id;
    let tenant_id_clone = tenant_id;
    tokio::spawn(async move {
        tracing::info!(
            "[AiKnowledge] 开始异步处理文档 {} (tenant={})",
            doc_id,
            tenant_id_clone
        );
        if let Err(e) =
            service::process_document(&pool_clone, &ai_client, tenant_id_clone, doc_id).await
        {
            tracing::error!("[AiKnowledge] 异步处理文档 {} 失败: {}", doc_id, e);
        } else {
            tracing::info!("[AiKnowledge] 文档 {} 处理完成", doc_id);
        }
    });

    Json(api_success(document))
}

/// GET /api/core/ai-knowledge/documents/{id}
pub async fn get_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
) -> Json<ApiResponse<DocumentDetail>> {
    let tenant_id = current_tenant_id(&claims);
    match service::get_document_detail(&state.pool, tenant_id, id).await {
        Ok(Some(detail)) => Json(api_success(detail)),
        Ok(None) => Json(api_error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] get_document 失败: {}", e);
            Json(api_error(500, "获取文档详情失败"))
        }
    }
}

/// PUT /api/core/ai-knowledge/documents/{id}
pub async fn update_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<KnowledgeDocument>> {
    let tenant_id = current_tenant_id(&claims);

    match service::update_document(&state.pool, tenant_id, id, &req).await {
        Ok(Some(doc)) => {
            if req.content.is_some() {
                let pool_clone = state.pool.clone();
                let ai_client = make_ai_client();
                let doc_id = doc.id;
                let tenant_id_clone = tenant_id;
                tokio::spawn(async move {
                    tracing::info!(
                        "[AiKnowledge] 内容变更，开始重新处理文档 {} (tenant={})",
                        doc_id,
                        tenant_id_clone
                    );
                    if let Err(e) =
                        service::process_document(&pool_clone, &ai_client, tenant_id_clone, doc_id)
                            .await
                    {
                        tracing::error!("[AiKnowledge] 重新处理文档 {} 失败: {}", doc_id, e);
                    } else {
                        tracing::info!("[AiKnowledge] 文档 {} 重新处理完成", doc_id);
                    }
                });
            }

            Json(api_success(doc))
        }
        Ok(None) => Json(api_error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] update_document 失败: {}", e);
            Json(api_error(500, "更新文档失败"))
        }
    }
}

/// DELETE /api/core/ai-knowledge/documents/{id}
pub async fn delete_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = current_tenant_id(&claims);
    match service::delete_document(&state.pool, tenant_id, id).await {
        Ok(true) => Json(api_success(json!({ "deleted": true }))),
        Ok(false) => Json(api_error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] delete_document 失败: {}", e);
            Json(api_error(500, "删除文档失败"))
        }
    }
}

/// POST /api/core/ai-knowledge/documents/{id}/reprocess
///
/// 重新处理文档（向量化）。用于：
/// - 处理失败的文档重试
/// - embedding 模型升级后重新生成向量
pub async fn reprocess_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = current_tenant_id(&claims);

    // 校验文档存在
    match service::get_document_detail(&state.pool, tenant_id, id).await {
        Ok(Some(_)) => {}
        Ok(None) => return Json(api_error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] reprocess_document 查询失败: {}", e);
            return Json(api_error(500, "查询文档失败"));
        }
    }

    // 异步处理
    let pool_clone = state.pool.clone();
    let ai_client = make_ai_client();
    tokio::spawn(async move {
        tracing::info!("[AiKnowledge] 开始重新处理文档 {}", id);
        if let Err(e) = service::process_document(&pool_clone, &ai_client, tenant_id, id).await {
            tracing::error!("[AiKnowledge] 重新处理文档 {} 失败: {}", id, e);
        }
    });

    Json(api_success(
        json!({ "reprocessing": true, "document_id": id }),
    ))
}

// ============================================================
// 问答 API
// ============================================================

/// POST /api/core/ai-knowledge/ask
///
/// 智能问答：基于知识库的 RAG 检索增强生成
pub async fn ask_question(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AskRequest>,
) -> Json<ApiResponse<AskResponse>> {
    if req.question.trim().is_empty() {
        return Json(api_error(400, "问题不能为空"));
    }
    if req.top_k < 1 || req.top_k > 20 {
        return Json(api_error(400, "top_k 必须在 1-20 之间"));
    }

    let tenant_id = current_tenant_id(&claims);
    let Some(user_id) = current_user_id(&claims) else {
        return Json(api_error(401, "无效的用户身份"));
    };

    // 校验知识库存在
    match service::get_knowledge_base(&state.pool, tenant_id, req.kb_id).await {
        Ok(Some(_)) => {}
        Ok(None) => return Json(api_error(404, "知识库不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] ask_question 校验知识库失败: {}", e);
            return Json(api_error(500, "校验知识库失败"));
        }
    }

    let ai_client = make_ai_client();
    match rag::ask_question(
        &state.pool,
        &ai_client,
        tenant_id,
        req.kb_id,
        user_id,
        &req.question,
        req.top_k,
    )
    .await
    {
        Ok(response) => Json(api_success(response)),
        Err(e) => {
            tracing::error!("[AiKnowledge] ask_question 失败: {}", e);
            // 降级策略：AI 调用失败时返回明确错误，不阻塞用户
            Json(api_error(500, &format!("问答服务暂时不可用: {}", e)))
        }
    }
}

/// GET /api/core/ai-knowledge/qa-history
pub async fn list_qa_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<QaHistoryQuery>,
) -> Json<ApiResponse<Vec<QaHistory>>> {
    let tenant_id = current_tenant_id(&claims);
    let user_id = current_user_id(&claims);
    match service::list_qa_history(&state.pool, tenant_id, user_id, &query).await {
        Ok(items) => Json(api_success(items)),
        Err(e) => {
            tracing::error!("[AiKnowledge] list_qa_history 失败: {}", e);
            Json(api_error(500, "获取问答历史失败"))
        }
    }
}

/// POST /api/core/ai-knowledge/qa/{id}/feedback
pub async fn submit_feedback(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    AxumPath(id): AxumPath<Uuid>,
    Json(req): Json<FeedbackRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if req.feedback != 1 && req.feedback != -1 {
        return Json(api_error(400, "feedback 必须为 1（赞）或 -1（踩）"));
    }

    let tenant_id = current_tenant_id(&claims);
    match service::update_qa_feedback(&state.pool, tenant_id, id, req.feedback).await {
        Ok(true) => Json(api_success(json!({ "updated": true }))),
        Ok(false) => Json(api_error(404, "问答记录不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] submit_feedback 失败: {}", e);
            Json(api_error(500, "更新反馈失败"))
        }
    }
}

// ============================================================
// 检索 API
// ============================================================

/// POST /api/core/ai-knowledge/search
///
/// 语义检索：仅返回相关分块，不调用 LLM 生成答案
pub async fn semantic_search(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SearchRequest>,
) -> Json<ApiResponse<SearchResponse>> {
    if req.query.trim().is_empty() {
        return Json(api_error(400, "检索内容不能为空"));
    }
    if req.top_k < 1 || req.top_k > 50 {
        return Json(api_error(400, "top_k 必须在 1-50 之间"));
    }

    let tenant_id = current_tenant_id(&claims);

    // 校验知识库存在
    match service::get_knowledge_base(&state.pool, tenant_id, req.kb_id).await {
        Ok(Some(_)) => {}
        Ok(None) => return Json(api_error(404, "知识库不存在")),
        Err(e) => {
            tracing::error!("[AiKnowledge] semantic_search 校验知识库失败: {}", e);
            return Json(api_error(500, "校验知识库失败"));
        }
    }

    let ai_client = make_ai_client();
    let query_clone = req.query.clone();
    match service::semantic_search(&state.pool, &ai_client, tenant_id, &req).await {
        Ok(results) => Json(api_success(SearchResponse {
            query: query_clone,
            results,
        })),
        Err(e) => {
            tracing::error!("[AiKnowledge] semantic_search 失败: {}", e);
            Json(api_error(500, &format!("检索失败: {}", e)))
        }
    }
}
