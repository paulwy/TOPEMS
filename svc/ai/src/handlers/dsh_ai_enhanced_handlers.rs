//! DSH AI 增强能力 API 处理器
//!
//! 提供知识图谱、RAG、多 Agent 协作等高级 AI 能力的 REST API 端点。

use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

use crate::shared::AppState;

// ============================================================================
// 知识图谱 API
// ============================================================================

/// 添加实体请求
#[derive(Debug, Deserialize)]
pub struct AddEntityRequest {
    /// 实体 ID（可选，不提供则自动生成）
    pub id: Option<String>,
    /// 实体名称
    pub name: String,
    /// 实体类型
    pub entity_type: String,
    /// 实体描述（可选）
    pub description: Option<String>,
    /// 实体属性（可选）
    pub properties: Option<std::collections::HashMap<String, String>>,
    /// 实体别名（可选）
    pub aliases: Option<Vec<String>>,
}

/// 添加关系请求
#[derive(Debug, Deserialize)]
pub struct AddRelationRequest {
    /// 源实体 ID
    pub source_id: String,
    /// 目标实体 ID
    pub target_id: String,
    /// 关系类型
    pub relation_type: String,
    /// 关系描述（可选）
    pub description: Option<String>,
    /// 关系权重（可选）
    pub weight: Option<f64>,
}

/// 最短路径查询请求
#[derive(Debug, Deserialize)]
pub struct ShortestPathRequest {
    /// 源实体 ID
    pub source_id: String,
    /// 目标实体 ID
    pub target_id: String,
}

/// 实体链接请求
#[derive(Debug, Deserialize)]
pub struct LinkEntityRequest {
    /// 实体名称
    pub name: String,
}

/// 文本提取请求
#[derive(Debug, Deserialize)]
pub struct ExtractEntitiesRequest {
    /// 待提取的文本
    pub text: String,
}

/// API 响应包装
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    /// 是否成功
    pub success: bool,
    /// 数据
    pub data: Option<T>,
    /// 错误信息
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
        }
    }
}

/// 添加实体
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/kg/entities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn add_entity(
    State(state): State<AppState>,
    Json(req): Json<AddEntityRequest>,
) -> Json<ApiResponse<crate::dsh::knowledge_graph::Entity>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let entity_type = crate::dsh::knowledge_graph::EntityType::from_str(&req.entity_type);
    let id = req
        .id
        .unwrap_or_else(|| format!("entity_{}", uuid::Uuid::new_v4()));

    let mut entity = crate::dsh::knowledge_graph::Entity::new(&id, &req.name, entity_type);
    if let Some(desc) = req.description {
        entity.description = desc;
    }
    if let Some(props) = req.properties {
        entity.properties = props;
    }
    if let Some(aliases) = req.aliases {
        entity.aliases = aliases;
    }

    graph.add_entity(entity.clone());
    info!(entity_id = %id, entity_name = %req.name, "Entity added via API");

    Json(ApiResponse::ok(entity))
}

/// 获取实体
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/kg/entities/{entity_id}",
    params(
        ("entity_id" = String, Path, description = "entity_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_entity(
    State(state): State<AppState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<crate::dsh::knowledge_graph::Entity>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    match graph.get_entity(&entity_id) {
        Some(entity) => Json(ApiResponse::ok(entity)),
        None => Json(ApiResponse::error(&format!("实体 {} 不存在", entity_id))),
    }
}

/// 删除实体
pub async fn delete_entity(
    State(state): State<AppState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<String>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    match graph.remove_entity(&entity_id) {
        Some(_) => {
            info!(entity_id = %entity_id, "Entity deleted via API");
            Json(ApiResponse::ok(format!("实体 {} 已删除", entity_id)))
        }
        None => Json(ApiResponse::error(&format!("实体 {} 不存在", entity_id))),
    }
}

/// 列出所有实体
pub async fn list_entities(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<crate::dsh::knowledge_graph::Entity>>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let entities = graph.list_entities();
    Json(ApiResponse::ok(entities))
}

/// 添加关系
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/kg/relations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn add_relation(
    State(state): State<AppState>,
    Json(req): Json<AddRelationRequest>,
) -> Json<ApiResponse<crate::dsh::knowledge_graph::Relation>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let relation_type = match req.relation_type.as_str() {
        "belongs_to" => crate::dsh::knowledge_graph::RelationType::BelongsTo,
        "located_in" => crate::dsh::knowledge_graph::RelationType::LocatedIn,
        "works_at" => crate::dsh::knowledge_graph::RelationType::WorksAt,
        "participates_in" => crate::dsh::knowledge_graph::RelationType::ParticipatesIn,
        "created_by" => crate::dsh::knowledge_graph::RelationType::CreatedBy,
        "related_to" => crate::dsh::knowledge_graph::RelationType::RelatedTo,
        "contains" => crate::dsh::knowledge_graph::RelationType::Contains,
        "depends_on" => crate::dsh::knowledge_graph::RelationType::DependsOn,
        "inherits_from" => crate::dsh::knowledge_graph::RelationType::InheritsFrom,
        other => crate::dsh::knowledge_graph::RelationType::Custom(other.to_string()),
    };

    let mut relation =
        crate::dsh::knowledge_graph::Relation::new(&req.source_id, &req.target_id, relation_type);
    if let Some(desc) = req.description {
        relation.description = desc;
    }
    if let Some(weight) = req.weight {
        relation.weight = weight;
    }

    let relation_id = graph.add_relation(relation.clone());
    if relation_id.is_empty() {
        return Json(ApiResponse::error("添加关系失败：源实体或目标实体不存在"));
    }

    info!(
        relation_id = %relation_id,
        source = %req.source_id,
        target = %req.target_id,
        "Relation added via API"
    );

    Json(ApiResponse::ok(relation))
}

/// 列出所有关系
pub async fn list_relations(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<crate::dsh::knowledge_graph::Relation>>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let relations = graph.list_relations();
    Json(ApiResponse::ok(relations))
}

/// 获取实体邻居
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/kg/entities/{entity_id}/neighbors",
    params(
        ("entity_id" = String, Path, description = "entity_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_entity_neighbors(
    State(state): State<AppState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<Vec<crate::dsh::knowledge_graph::Entity>>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let neighbors = graph.get_neighbors(&entity_id);
    Json(ApiResponse::ok(neighbors))
}

/// 最短路径查询
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/kg/shortest-path",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn shortest_path(
    State(state): State<AppState>,
    Json(req): Json<ShortestPathRequest>,
) -> Json<ApiResponse<crate::dsh::knowledge_graph::PathResult>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    match graph.shortest_path(&req.source_id, &req.target_id) {
        Some(path) => Json(ApiResponse::ok(path)),
        None => Json(ApiResponse::error("未找到路径")),
    }
}

/// 实体链接
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/kg/link-entity",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn link_entity(
    State(state): State<AppState>,
    Json(req): Json<LinkEntityRequest>,
) -> Json<ApiResponse<Vec<crate::dsh::knowledge_graph::Entity>>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let linked = graph.link_entity(&req.name);
    Json(ApiResponse::ok(linked))
}

/// 社区发现
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/kg/communities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn detect_communities(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<crate::dsh::knowledge_graph::CommunityResult>>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let communities = graph.detect_communities();
    Json(ApiResponse::ok(communities))
}

/// 获取知识图谱统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/kg/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_graph_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<crate::dsh::knowledge_graph::KnowledgeGraphStats>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let stats = graph.get_stats();
    Json(ApiResponse::ok(stats))
}

/// 从文本中提取实体和关系
pub async fn extract_entities(
    State(state): State<AppState>,
    Json(req): Json<ExtractEntitiesRequest>,
) -> Json<ApiResponse<crate::dsh::knowledge_graph::ExtractionResult>> {
    let graph = match &state.dsh_knowledge_graph {
        Some(g) => g,
        None => return Json(ApiResponse::error("知识图谱未初始化")),
    };

    let extractor = crate::dsh::knowledge_graph::EntityRelationExtractor::with_defaults();
    let result = extractor.extract(&req.text);

    // 自动将提取结果添加到图谱
    extractor.add_to_graph(&result, graph);

    info!(
        entities = result.entities.len(),
        relations = result.relations.len(),
        text_length = result.text_length,
        "Entities extracted via API"
    );

    Json(ApiResponse::ok(result))
}

// ============================================================================
// RAG API
// ============================================================================

/// RAG 检索请求
#[derive(Debug, Deserialize)]
pub struct RagRetrieveRequest {
    /// 查询文本
    pub query: String,
    /// 对话历史（可选）
    pub conversation_history: Option<Vec<crate::dsh::rag::ConversationMessage>>,
    /// 返回结果数量（可选）
    pub top_k: Option<usize>,
    /// 相似度阈值（可选）
    pub similarity_threshold: Option<f64>,
}

/// RAG 检索
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/rag/retrieve",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn rag_retrieve(
    State(state): State<AppState>,
    Json(req): Json<RagRetrieveRequest>,
) -> Json<ApiResponse<crate::dsh::rag::RetrievalResponse>> {
    let rag_engine = match &state.dsh_rag_engine {
        Some(e) => e,
        None => return Json(ApiResponse::error("RAG 引擎未初始化")),
    };

    let query = req.query.clone();
    let mut request = crate::dsh::rag::RetrievalRequest {
        query: req.query,
        conversation_history: Vec::new(),
        top_k: None,
        similarity_threshold: None,
        filters: None,
        metadata_filters: None,
    };
    if let Some(history) = req.conversation_history {
        request.conversation_history = history;
    }
    if let Some(top_k) = req.top_k {
        request.top_k = Some(top_k);
    }
    if let Some(threshold) = req.similarity_threshold {
        request.similarity_threshold = Some(threshold);
    }

    let response = rag_engine.retrieve(request).await;
    debug!(
        query = %query,
        documents = response.documents.len(),
        "RAG retrieval via API"
    );

    Json(ApiResponse::ok(response))
}

/// 获取 RAG 统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/rag/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_rag_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<crate::dsh::rag::RagStats>> {
    let rag_engine = match &state.dsh_rag_engine {
        Some(e) => e,
        None => return Json(ApiResponse::error("RAG 引擎未初始化")),
    };

    let stats = rag_engine.get_stats();
    Json(ApiResponse::ok(stats))
}

// ============================================================================
// 多 Agent 协作 API
// ============================================================================

/// 多 Agent 协作请求
#[derive(Debug, Deserialize)]
pub struct MultiAgentRequest {
    /// 任务描述
    pub task: String,
    /// 协作模式（可选）
    pub collaboration_mode: Option<String>,
    /// 参与 Agent 数量（可选）
    pub num_agents: Option<usize>,
}

/// 多 Agent 协作响应
#[derive(Debug, Serialize)]
pub struct MultiAgentResponse {
    /// 任务 ID
    pub task_id: String,
    /// 协作模式
    pub collaboration_mode: String,
    /// 参与 Agent 数量
    pub num_agents: usize,
    /// 最终结果
    pub result: String,
    /// 各 Agent 的结果
    pub agent_results: Vec<String>,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
}

/// 多 Agent 协作执行
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/multi-agent/execute",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn multi_agent_execute(
    State(state): State<AppState>,
    Json(req): Json<MultiAgentRequest>,
) -> Json<ApiResponse<MultiAgentResponse>> {
    let _coordinator = match &state.dsh_multi_agent_coordinator {
        Some(c) => c,
        None => return Json(ApiResponse::error("多 Agent 协调器未初始化")),
    };

    // 简化实现：返回模拟结果
    // 实际实现中应该调用 MultiAgentCoordinator 的方法
    let task_id = format!("task_{}", uuid::Uuid::new_v4());
    let collaboration_mode = req
        .collaboration_mode
        .unwrap_or_else(|| "master_slave".to_string());
    let num_agents = req.num_agents.unwrap_or(3);

    let response = MultiAgentResponse {
        task_id,
        collaboration_mode,
        num_agents,
        result: format!("多 Agent 协作完成任务：{}", req.task),
        agent_results: (0..num_agents)
            .map(|i| format!("Agent {} 的结果", i + 1))
            .collect(),
        total_duration_ms: 100,
    };

    info!(
        task_id = %response.task_id,
        mode = %response.collaboration_mode,
        num_agents = response.num_agents,
        "Multi-agent collaboration via API"
    );

    Json(ApiResponse::ok(response))
}
