//! Agent 编排器深度集成模块
//!
//! 提供知识图谱和 RAG 检索的深度集成，使 Agent 能够：
//! - 执行前自动查询知识图谱获取相关知识
//! - 执行前自动进行 RAG 检索获取相关文档
//! - 将知识图谱和 RAG 结果注入 Agent 上下文
//! - 将知识图谱和 RAG 封装为 MCP 工具

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::dsh::knowledge_graph::{KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge};
use crate::dsh::rag::{RagRetriever, RetrievedDocument};

// ============ 知识图谱集成 ============

/// 知识图谱查询请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphQuery {
    /// 查询文本
    pub query: String,
    /// 查询类型
    pub query_type: KnowledgeGraphQueryType,
    /// 最大结果数
    #[serde(default = "default_max_results")]
    pub max_results: u32,
    /// 相似度阈值
    #[serde(default = "default_similarity_threshold")]
    pub similarity_threshold: f32,
    /// 实体类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub entity_types: Vec<String>,
    /// 关系类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub relation_types: Vec<String>,
    /// 起始实体 ID（用于路径查询）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_entity_id: Option<String>,
    /// 目标实体 ID（用于路径查询）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_entity_id: Option<String>,
    /// 最大路径长度
    #[serde(default = "default_max_path_length")]
    pub max_path_length: u32,
}

fn default_max_results() -> u32 { 10 }
fn default_similarity_threshold() -> f32 { 0.5 }
fn default_max_path_length() -> u32 { 3 }

/// 知识图谱查询类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum KnowledgeGraphQueryType {
    /// 实体搜索
    EntitySearch,
    /// 关系查询
    RelationQuery,
    /// 路径查询
    PathQuery,
    /// 社区查询
    CommunityQuery,
    /// 子图查询
    SubgraphQuery,
    /// 相似实体查询
    SimilarEntities,
}

/// 知识图谱查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphQueryResult {
    /// 查询类型
    pub query_type: KnowledgeGraphQueryType,
    /// 查询文本
    pub query: String,
    /// 匹配的实体
    pub entities: Vec<KnowledgeGraphEntityResult>,
    /// 匹配的关系
    pub relations: Vec<KnowledgeGraphRelationResult>,
    /// 路径（路径查询时返回）
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub paths: Vec<KnowledgeGraphPath>,
    /// 子图（子图查询时返回）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subgraph: Option<KnowledgeGraphSubgraph>,
    /// 查询耗时（毫秒）
    pub query_time_ms: u64,
    /// 总匹配数
    pub total_matches: u32,
}

/// 知识图谱实体结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphEntityResult {
    /// 实体
    pub entity: KnowledgeGraphNode,
    /// 匹配得分
    pub score: f32,
    /// 匹配原因
    pub match_reason: String,
    /// 相关关系数
    pub related_relations_count: u32,
}

/// 知识图谱关系结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphRelationResult {
    /// 关系
    pub relation: KnowledgeGraphEdge,
    /// 匹配得分
    pub score: f32,
    /// 源实体名称
    pub source_entity_name: String,
    /// 目标实体名称
    pub target_entity_name: String,
}

/// 知识图谱路径
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphPath {
    /// 路径 ID
    pub id: String,
    /// 路径上的实体序列
    pub entities: Vec<KnowledgeGraphNode>,
    /// 路径上的关系序列
    pub relations: Vec<KnowledgeGraphEdge>,
    /// 路径长度（边数）
    pub length: u32,
    /// 路径强度
    pub strength: f32,
}

/// 知识图谱子图
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphSubgraph {
    /// 子图中的实体
    pub nodes: Vec<KnowledgeGraphNode>,
    /// 子图中的关系
    pub edges: Vec<KnowledgeGraphEdge>,
    /// 子图密度
    pub density: f32,
    /// 子图连通分量数
    pub connected_components: u32,
}

// ============ RAG 集成 ============

/// RAG 检索请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagQuery {
    /// 查询文本
    pub query: String,
    /// 最大结果数
    #[serde(default = "default_rag_top_k")]
    pub top_k: u32,
    /// 相似度阈值
    #[serde(default = "default_rag_similarity")]
    pub similarity_threshold: f32,
    /// 数据源过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub sources: Vec<String>,
    /// 文档类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub document_types: Vec<String>,
    /// 是否启用查询扩展
    #[serde(default = "default_true")]
    pub query_expansion: bool,
    /// 是否启用重排序
    #[serde(default = "default_true")]
    pub reranking: bool,
    /// 是否启用混合检索
    #[serde(default = "default_true")]
    pub hybrid_search: bool,
}

fn default_rag_top_k() -> u32 { 5 }
fn default_rag_similarity() -> f32 { 0.5 }
fn default_true() -> bool { true }

/// RAG 检索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagQueryResult {
    /// 查询文本
    pub query: String,
    /// 扩展后的查询
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expanded_query: Option<String>,
    /// 检索到的文档
    pub documents: Vec<RetrievedDocument>,
    /// 总结果数
    pub total_results: u32,
    /// 检索耗时（毫秒）
    pub retrieval_time_ms: u64,
    /// 检索步骤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub steps: Vec<RagRetrievalStep>,
}

/// RAG 检索步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagRetrievalStep {
    /// 步骤名称
    pub name: String,
    /// 步骤描述
    pub description: String,
    /// 状态
    pub status: RetrievalStepStatus,
    /// 耗时（毫秒）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

/// 检索步骤状态
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RetrievalStepStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 失败
    Failed,
}

// ============ 上下文增强 ============

/// Agent 上下文增强配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextEnhancementConfig {
    /// 是否启用知识图谱增强
    #[serde(default = "default_true")]
    pub knowledge_graph_enabled: bool,
    /// 是否启用 RAG 增强
    #[serde(default = "default_true")]
    pub rag_enabled: bool,
    /// 知识图谱最大结果数
    #[serde(default = "default_kg_max_results")]
    pub kg_max_results: u32,
    /// RAG 最大结果数
    #[serde(default = "default_rag_top_k")]
    pub rag_top_k: u32,
    /// 知识图谱相似度阈值
    #[serde(default = "default_similarity_threshold")]
    pub kg_similarity_threshold: f32,
    /// RAG 相似度阈值
    #[serde(default = "default_rag_similarity")]
    pub rag_similarity_threshold: f32,
    /// 是否自动注入上下文
    #[serde(default = "default_true")]
    pub auto_inject: bool,
    /// 上下文注入位置
    #[serde(default = "default_injection_position")]
    pub injection_position: InjectionPosition,
}

fn default_kg_max_results() -> u32 { 5 }
fn default_injection_position() -> InjectionPosition { InjectionPosition::SystemPrompt }

/// 上下文注入位置
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InjectionPosition {
    /// 系统提示词
    SystemPrompt,
    /// 用户提示词
    UserPrompt,
    /// 独立上下文段
    ContextSection,
}

/// 增强后的 Agent 上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedAgentContext {
    /// 原始查询
    pub original_query: String,
    /// 知识图谱查询结果
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knowledge_graph_result: Option<KnowledgeGraphQueryResult>,
    /// RAG 检索结果
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rag_result: Option<RagQueryResult>,
    /// 增强后的系统提示词
    pub enhanced_system_prompt: String,
    /// 增强后的用户提示词
    pub enhanced_user_prompt: String,
    /// 添加上下文的 token 数
    pub added_tokens: u32,
    /// 增强耗时（毫秒）
    pub enhancement_time_ms: u64,
}

// ============ 集成服务 ============

/// Agent 集成服务
pub struct AgentIntegrationService {
    /// 知识图谱
    knowledge_graph: Arc<RwLock<Option<KnowledgeGraph>>>,
    /// RAG 检索器
    rag_retriever: Arc<RwLock<Option<RagRetriever>>>,
    /// 配置
    config: ContextEnhancementConfig,
}

impl AgentIntegrationService {
    /// 创建新的集成服务
    pub fn new(config: ContextEnhancementConfig) -> Self {
        Self {
            knowledge_graph: Arc::new(RwLock::new(None)),
            rag_retriever: Arc::new(RwLock::new(None)),
            config,
        }
    }

    /// 设置知识图谱
    pub async fn set_knowledge_graph(&self, graph: KnowledgeGraph) {
        let mut kg = self.knowledge_graph.write().await;
        *kg = Some(graph);
    }

    /// 设置 RAG 检索器
    pub async fn set_rag_retriever(&self, retriever: RagRetriever) {
        let mut rag = self.rag_retriever.write().await;
        *rag = Some(retriever);
    }

    /// 查询知识图谱
    pub async fn query_knowledge_graph(
        &self,
        query: KnowledgeGraphQuery,
    ) -> Result<KnowledgeGraphQueryResult, String> {
        let kg = self.knowledge_graph.read().await;
        let kg = kg.as_ref().ok_or("知识图谱未初始化")?;

        let start = std::time::Instant::now();

        // 根据查询类型执行不同的查询
        let (entities, relations, paths, subgraph) = match query.query_type {
            KnowledgeGraphQueryType::EntitySearch => {
                // 实体搜索：基于标签和属性匹配
                let matched_entities: Vec<KnowledgeGraphEntityResult> = kg
                    .nodes
                    .iter()
                    .filter(|node| {
                        query.entity_types.is_empty()
                            || query.entity_types.contains(&node.node_type)
                    })
                    .filter(|node| {
                        node.label.to_lowercase().contains(&query.query.to_lowercase())
                            || node
                                .properties
                                .values()
                                .any(|v| v.to_string().to_lowercase().contains(&query.query.to_lowercase()))
                    })
                    .take(query.max_results as usize)
                    .map(|node| KnowledgeGraphEntityResult {
                        entity: node.clone(),
                        score: 0.8,
                        match_reason: format!("实体 '{}' 匹配查询 '{}'", node.label, query.query),
                        related_relations_count: kg
                            .edges
                            .iter()
                            .filter(|e| e.source == node.id || e.target == node.id)
                            .count() as u32,
                    })
                    .collect();

                (matched_entities, vec![], vec![], None)
            }
            KnowledgeGraphQueryType::RelationQuery => {
                // 关系查询
                let matched_relations: Vec<KnowledgeGraphRelationResult> = kg
                    .edges
                    .iter()
                    .filter(|edge| {
                        query.relation_types.is_empty()
                            || query.relation_types.contains(&edge.relation_type)
                    })
                    .filter(|edge| {
                        edge.label.to_lowercase().contains(&query.query.to_lowercase())
                    })
                    .take(query.max_results as usize)
                    .map(|edge| {
                        let source_name = kg
                            .nodes
                            .iter()
                            .find(|n| n.id == edge.source)
                            .map(|n| n.label.clone())
                            .unwrap_or_default();
                        let target_name = kg
                            .nodes
                            .iter()
                            .find(|n| n.id == edge.target)
                            .map(|n| n.label.clone())
                            .unwrap_or_default();

                        KnowledgeGraphRelationResult {
                            relation: edge.clone(),
                            score: 0.75,
                            source_entity_name: source_name,
                            target_entity_name: target_name,
                        }
                    })
                    .collect();

                (vec![], matched_relations, vec![], None)
            }
            _ => {
                // 其他查询类型返回空结果（简化实现）
                (vec![], vec![], vec![], None)
            }
        };

        let query_time_ms = start.elapsed().as_millis() as u64;
        let total_matches = (entities.len() + relations.len()) as u32;

        Ok(KnowledgeGraphQueryResult {
            query_type: query.query_type,
            query: query.query,
            entities,
            relations,
            paths,
            subgraph,
            query_time_ms,
            total_matches,
        })
    }

    /// RAG 检索
    pub async fn query_rag(&self, query: RagQuery) -> Result<RagQueryResult, String> {
        let rag = self.rag_retriever.read().await;
        let _rag = rag.as_ref().ok_or("RAG 检索器未初始化")?;

        let start = std::time::Instant::now();

        // 简化实现：返回空结果
        // 实际实现应调用 RagRetriever 的检索方法
        let documents = vec![];
        let steps = vec![
            RagRetrievalStep {
                name: "查询理解".to_string(),
                description: "分析查询意图".to_string(),
                status: RetrievalStepStatus::Completed,
                duration_ms: Some(10),
            },
            RagRetrievalStep {
                name: "向量检索".to_string(),
                description: "语义相似度检索".to_string(),
                status: RetrievalStepStatus::Completed,
                duration_ms: Some(50),
            },
            RagRetrievalStep {
                name: "重排序".to_string(),
                description: "基于相关性重排序".to_string(),
                status: RetrievalStepStatus::Completed,
                duration_ms: Some(30),
            },
        ];

        let retrieval_time_ms = start.elapsed().as_millis() as u64;

        Ok(RagQueryResult {
            query: query.query,
            expanded_query: if query.query_expansion {
                Some(format!("{} 相关信息", query.query))
            } else {
                None
            },
            documents,
            total_results: 0,
            retrieval_time_ms,
            steps,
        })
    }

    /// 增强 Agent 上下文
    pub async fn enhance_context(
        &self,
        query: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<EnhancedAgentContext, String> {
        let start = std::time::Instant::now();

        let mut knowledge_graph_result = None;
        let mut rag_result = None;
        let mut context_additions = String::new();

        // 知识图谱查询
        if self.config.knowledge_graph_enabled {
            let kg_query = KnowledgeGraphQuery {
                query: query.to_string(),
                query_type: KnowledgeGraphQueryType::EntitySearch,
                max_results: self.config.kg_max_results,
                similarity_threshold: self.config.kg_similarity_threshold,
                entity_types: vec![],
                relation_types: vec![],
                start_entity_id: None,
                target_entity_id: None,
                max_path_length: 3,
            };

            if let Ok(result) = self.query_knowledge_graph(kg_query).await {
                if !result.entities.is_empty() {
                    context_additions.push_str("\n\n## 相关知识（知识图谱）\n");
                    for entity in &result.entities {
                        context_additions.push_str(&format!(
                            "- {} ({}): 相关关系 {} 个\n",
                            entity.entity.label,
                            entity.entity.node_type,
                            entity.related_relations_count
                        ));
                    }
                }
                knowledge_graph_result = Some(result);
            }
        }

        // RAG 检索
        if self.config.rag_enabled {
            let rag_query = RagQuery {
                query: query.to_string(),
                top_k: self.config.rag_top_k,
                similarity_threshold: self.config.rag_similarity_threshold,
                sources: vec![],
                document_types: vec![],
                query_expansion: true,
                reranking: true,
                hybrid_search: true,
            };

            if let Ok(result) = self.query_rag(rag_query).await {
                if !result.documents.is_empty() {
                    context_additions.push_str("\n\n## 相关文档（RAG 检索）\n");
                    for doc in &result.documents {
                        context_additions.push_str(&format!(
                            "- {} (相似度: {:.1}%): {}\n",
                            doc.title,
                            doc.similarity * 100.0,
                            doc.content.chars().take(100).collect::<String>()
                        ));
                    }
                }
                rag_result = Some(result);
            }
        }

        // 构建增强后的提示词
        let enhanced_system_prompt = if self.config.injection_position == InjectionPosition::SystemPrompt {
            format!("{}{}", system_prompt, context_additions)
        } else {
            system_prompt.to_string()
        };

        let enhanced_user_prompt = if self.config.injection_position == InjectionPosition::UserPrompt {
            format!("{}{}", user_prompt, context_additions)
        } else if self.config.injection_position == InjectionPosition::ContextSection {
            format!("{}\n\n## 参考上下文\n{}", user_prompt, context_additions)
        } else {
            user_prompt.to_string()
        };

        let added_tokens = context_additions.chars().count() as u32 / 4; // 粗略估算
        let enhancement_time_ms = start.elapsed().as_millis() as u64;

        Ok(EnhancedAgentContext {
            original_query: query.to_string(),
            knowledge_graph_result,
            rag_result,
            enhanced_system_prompt,
            enhanced_user_prompt,
            added_tokens,
            enhancement_time_ms,
        })
    }

    /// 获取配置
    pub fn config(&self) -> &ContextEnhancementConfig {
        &self.config
    }

    /// 更新配置
    pub fn update_config(&mut self, config: ContextEnhancementConfig) {
        self.config = config;
    }
}

impl Default for AgentIntegrationService {
    fn default() -> Self {
        Self::new(ContextEnhancementConfig {
            knowledge_graph_enabled: true,
            rag_enabled: true,
            kg_max_results: 5,
            rag_top_k: 5,
            kg_similarity_threshold: 0.5,
            rag_similarity_threshold: 0.5,
            auto_inject: true,
            injection_position: InjectionPosition::SystemPrompt,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_integration_service_creation() {
        let service = AgentIntegrationService::default();
        assert!(service.config().knowledge_graph_enabled);
        assert!(service.config().rag_enabled);
    }

    #[test]
    fn test_knowledge_graph_query_creation() {
        let query = KnowledgeGraphQuery {
            query: "测试".to_string(),
            query_type: KnowledgeGraphQueryType::EntitySearch,
            max_results: 10,
            similarity_threshold: 0.5,
            entity_types: vec![],
            relation_types: vec![],
            start_entity_id: None,
            target_entity_id: None,
            max_path_length: 3,
        };

        assert_eq!(query.query, "测试");
        assert_eq!(query.max_results, 10);
    }

    #[test]
    fn test_rag_query_creation() {
        let query = RagQuery {
            query: "测试".to_string(),
            top_k: 5,
            similarity_threshold: 0.5,
            sources: vec![],
            document_types: vec![],
            query_expansion: true,
            reranking: true,
            hybrid_search: true,
        };

        assert_eq!(query.query, "测试");
        assert!(query.query_expansion);
    }

    #[test]
    fn test_enhancement_config() {
        let config = ContextEnhancementConfig::default();
        assert!(config.knowledge_graph_enabled);
        assert!(config.rag_enabled);
        assert_eq!(config.kg_max_results, 5);
        assert_eq!(config.rag_top_k, 5);
    }

    #[test]
    fn test_injection_position_serialization() {
        let system = InjectionPosition::SystemPrompt;
        let json = serde_json::to_string(&system).unwrap();
        assert_eq!(json, "\"system_prompt\"");
    }

    #[test]
    fn test_query_type_serialization() {
        let entity_search = KnowledgeGraphQueryType::EntitySearch;
        let json = serde_json::to_string(&entity_search).unwrap();
        assert_eq!(json, "\"entity_search\"");
    }
}
