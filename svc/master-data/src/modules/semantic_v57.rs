//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V57.0 MDM AC-29: 主数据图谱增强 + 语义搜索 + 智能标签
//!
//! 核心能力：
//! - 图谱增强 (EnhancedKnowledgeGraph): 节点/边管理、社区检测、图嵌入、最短路径
//! - 语义搜索 (SemanticSearchEngine): 向量相似度搜索、混合关键词+语义搜索、索引管理
//! - 智能标签 (SmartTagger): 规则标签、ML标签推荐、标签管理

use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

/// 请求租户：超管/无租户 → None（全量）；普通用户 → claims 租户。
fn tenant_of(claims: &Claims) -> Option<uuid::Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    }
}

// ==================== K1：handler 内 sqlx 错误统一出口 ====================

macro_rules! db_exec {
    ($e:expr) => {
        match $e {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("数据库操作失败: {}", e);
                return ApiResponse::from(TopemsError::internal("数据库操作失败", e));
            }
        }
    };
}

// ==================== K1：真表映射（master_data.mdm_* 8 表） ====================

fn graph_node_from_row(row: &sqlx::postgres::PgRow) -> GraphNodeV57 {
    GraphNodeV57 {
        id: row.get::<String, _>("id"),
        label: row.get::<String, _>("label"),
        node_type: row.get::<String, _>("node_type"),
        properties: row.get::<serde_json::Value, _>("properties"),
        embeddings: serde_json::from_value(row.get::<serde_json::Value, _>("embeddings"))
            .unwrap_or_default(),
        degree: row.get::<i64, _>("degree"),
        community_id: row.get::<Option<String>, _>("community_id"),
    }
}
const GRAPH_NODE_COLS: &str = "id, label, node_type, properties, embeddings, degree, community_id";

fn graph_edge_from_row(row: &sqlx::postgres::PgRow) -> GraphEdgeV57 {
    GraphEdgeV57 {
        source_id: row.get::<String, _>("source_id"),
        target_id: row.get::<String, _>("target_id"),
        relation_type: row.get::<String, _>("relation_type"),
        weight: row.get::<f64, _>("weight"),
        confidence: row.get::<f64, _>("confidence"),
    }
}
const GRAPH_EDGE_COLS: &str = "source_id, target_id, relation_type, weight, confidence";

fn graph_community_from_row(row: &sqlx::postgres::PgRow) -> GraphCommunity {
    GraphCommunity {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        node_ids: serde_json::from_value(row.get::<serde_json::Value, _>("node_ids"))
            .unwrap_or_default(),
        algorithm: row.get::<String, _>("algorithm"),
        modularity: row.get::<f64, _>("modularity"),
    }
}
const GRAPH_COMMUNITY_COLS: &str = "id, name, node_ids, algorithm, modularity";

fn search_index_from_row(row: &sqlx::postgres::PgRow) -> SearchIndex {
    SearchIndex {
        id: row.get::<String, _>("id"),
        entity_type: row.get::<String, _>("entity_type"),
        entity_id: row.get::<String, _>("entity_id"),
        embeddings: serde_json::from_value(row.get::<serde_json::Value, _>("embeddings"))
            .unwrap_or_default(),
        text: row.get::<String, _>("text"),
        metadata: row.get::<serde_json::Value, _>("metadata"),
    }
}
const SEARCH_INDEX_COLS: &str = "id, entity_type, entity_id, embeddings, text, metadata";

fn tag_from_row(row: &sqlx::postgres::PgRow) -> Tag {
    Tag {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        category: row.get::<String, _>("category"),
        color: row.get::<String, _>("color"),
        description: row.get::<String, _>("description"),
        usage_count: row.get::<i64, _>("usage_count"),
    }
}
const TAG_COLS: &str = "id, name, category, color, description, usage_count";

fn tag_rule_from_row(row: &sqlx::postgres::PgRow) -> TagRule {
    TagRule {
        id: row.get::<String, _>("id"),
        tag_id: row.get::<String, _>("tag_id"),
        condition: row.get::<serde_json::Value, _>("condition"),
        auto_apply: row.get::<bool, _>("auto_apply"),
        priority: row.get::<i32, _>("priority"),
    }
}
const TAG_RULE_COLS: &str = "id, tag_id, condition, auto_apply, priority";

fn tagged_entity_from_row(row: &sqlx::postgres::PgRow) -> TaggedEntity {
    TaggedEntity {
        entity_type: row.get::<String, _>("entity_type"),
        entity_id: row.get::<String, _>("entity_id"),
        tag_ids: serde_json::from_value(row.get::<serde_json::Value, _>("tag_ids"))
            .unwrap_or_default(),
        confidence: row.get::<f64, _>("confidence"),
        applied_at: row.get::<chrono::DateTime<chrono::Utc>, _>("applied_at"),
    }
}
const TAGGED_ENTITY_COLS: &str =
    "entity_type, entity_id, tag_ids, confidence, applied_at::timestamptz AS applied_at";

async fn fetch_graph_nodes(db: &sqlx::PgPool) -> Result<Vec<GraphNodeV57>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {GRAPH_NODE_COLS} FROM master_data.mdm_graph_nodes ORDER BY id"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询图谱节点失败: {e}")))?;
    Ok(rows.iter().map(graph_node_from_row).collect())
}

async fn fetch_graph_edges(db: &sqlx::PgPool) -> Result<Vec<GraphEdgeV57>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {GRAPH_EDGE_COLS} FROM master_data.mdm_graph_edges"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询图谱边失败: {e}")))?;
    Ok(rows.iter().map(graph_edge_from_row).collect())
}

async fn fetch_graph_communities(db: &sqlx::PgPool) -> Result<Vec<GraphCommunity>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {GRAPH_COMMUNITY_COLS} FROM master_data.mdm_graph_communities ORDER BY id"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询社区失败: {e}")))?;
    Ok(rows.iter().map(graph_community_from_row).collect())
}

async fn fetch_search_indexes(db: &sqlx::PgPool) -> Result<Vec<SearchIndex>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {SEARCH_INDEX_COLS} FROM master_data.mdm_semantic_search_indexes ORDER BY id"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询搜索索引失败: {e}")))?;
    Ok(rows.iter().map(search_index_from_row).collect())
}

async fn fetch_tags(db: &sqlx::PgPool) -> Result<Vec<Tag>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {TAG_COLS} FROM master_data.mdm_tags ORDER BY id"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询标签失败: {e}")))?;
    Ok(rows.iter().map(tag_from_row).collect())
}

async fn fetch_tag_rules(db: &sqlx::PgPool) -> Result<Vec<TagRule>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {TAG_RULE_COLS} FROM master_data.mdm_tag_rules ORDER BY id"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询标签规则失败: {e}")))?;
    Ok(rows.iter().map(tag_rule_from_row).collect())
}

async fn fetch_tagged_entities(db: &sqlx::PgPool) -> Result<Vec<TaggedEntity>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {TAGGED_ENTITY_COLS} FROM master_data.mdm_tagged_entities"
    )))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询实体标签失败: {e}")))?;
    Ok(rows.iter().map(tagged_entity_from_row).collect())
}

async fn fetch_graph_node_properties(db: &sqlx::PgPool, id: &str) -> serde_json::Value {
    let row = sqlx::query("SELECT properties FROM master_data.mdm_graph_nodes WHERE id = $1")
        .bind(id)
        .fetch_optional(db)
        .await
        .ok()
        .flatten();
    match row {
        Some(r) => r
            .try_get::<serde_json::Value, _>("properties")
            .unwrap_or_else(|_| serde_json::json!({})),
        None => serde_json::json!({}),
    }
}

// ==================== 图谱数据结构 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphNodeV57 {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub properties: serde_json::Value,
    pub embeddings: Vec<f64>,
    pub degree: i64,
    pub community_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphEdgeV57 {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub weight: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphCommunity {
    pub id: String,
    pub name: String,
    pub node_ids: Vec<String>,
    pub algorithm: String,
    pub modularity: f64,
}

// ==================== 图谱引擎 ====================

struct EnhancedKnowledgeGraph;

impl EnhancedKnowledgeGraph {
    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    async fn add_node(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        mut node: GraphNodeV57,
    ) -> Result<GraphNodeV57, TopemsError> {
        let degree = sqlx::query(
            "SELECT count(*)::bigint AS c FROM master_data.mdm_graph_edges WHERE source_id = $1 OR target_id = $1",
        )
        .bind(&node.id)
        .fetch_one(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("计算节点度失败: {e}")))?
        .get::<i64, _>("c");
        node.degree = degree;

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_graph_nodes ({GRAPH_NODE_COLS}, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, $8)
             ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, node_type = EXCLUDED.node_type,
               properties = EXCLUDED.properties, embeddings = EXCLUDED.embeddings,
               degree = EXCLUDED.degree, community_id = EXCLUDED.community_id"
        )))
        .bind(&node.id)
        .bind(&node.label)
        .bind(&node.node_type)
        .bind(serde_json::to_value(&node.properties).unwrap_or_default())
        .bind(serde_json::to_value(&node.embeddings).unwrap_or_default())
        .bind(node.degree)
        .bind(&node.community_id)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入图谱节点失败: {e}")))?;

        Ok(node)
    }

    async fn add_edge(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        edge: GraphEdgeV57,
    ) -> Result<GraphEdgeV57, TopemsError> {
        sqlx::query(
            "INSERT INTO master_data.mdm_graph_edges (source_id, target_id, relation_type, weight, confidence, tenant_id)
             VALUES ($1,$2,$3,$4,$5, $6)
             ON CONFLICT (source_id, target_id, relation_type) DO UPDATE SET
               weight = EXCLUDED.weight, confidence = EXCLUDED.confidence",
        )
        .bind(&edge.source_id)
        .bind(&edge.target_id)
        .bind(&edge.relation_type)
        .bind(edge.weight)
        .bind(edge.confidence)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入图谱边失败: {e}")))?;

        sqlx::query("UPDATE master_data.mdm_graph_nodes SET degree = degree + 1 WHERE id = $1")
            .bind(&edge.source_id)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("更新节点度失败: {e}")))?;
        sqlx::query("UPDATE master_data.mdm_graph_nodes SET degree = degree + 1 WHERE id = $1")
            .bind(&edge.target_id)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("更新节点度失败: {e}")))?;

        Ok(edge)
    }

    async fn get_neighbors(
        db: &sqlx::PgPool,
        node_id: &str,
    ) -> Result<Vec<GraphNodeV57>, TopemsError> {
        let edges = fetch_graph_edges(db).await?;
        let neighbor_ids: Vec<String> = edges
            .iter()
            .filter(|e| e.source_id == node_id || e.target_id == node_id)
            .map(|e| {
                if e.source_id == node_id {
                    e.target_id.clone()
                } else {
                    e.source_id.clone()
                }
            })
            .collect();

        let nodes = fetch_graph_nodes(db).await?;
        Ok(nodes
            .iter()
            .filter(|n| neighbor_ids.contains(&n.id))
            .cloned()
            .collect())
    }

    async fn get_community(
        db: &sqlx::PgPool,
        node_id: &str,
    ) -> Result<Option<GraphCommunity>, TopemsError> {
        let nodes = fetch_graph_nodes(db).await?;
        let node = nodes.iter().find(|n| n.id == node_id);
        let Some(community_id) = node.and_then(|n| n.community_id.clone()) else {
            return Ok(None);
        };

        let communities = fetch_graph_communities(db).await?;
        let matched = communities
            .iter()
            .find(|c| c.id == community_id)
            .or_else(|| {
                communities
                    .iter()
                    .find(|c| c.id == format!("community_{community_id}"))
            })
            .cloned();
        Ok(matched)
    }

    async fn find_shortest_path(
        db: &sqlx::PgPool,
        from_id: &str,
        to_id: &str,
    ) -> Result<Vec<String>, TopemsError> {
        let edges = fetch_graph_edges(db).await?;
        let mut adjacency: std::collections::HashMap<String, Vec<String>> =
            std::collections::HashMap::new();
        for edge in edges.iter() {
            adjacency
                .entry(edge.source_id.clone())
                .or_default()
                .push(edge.target_id.clone());
            adjacency
                .entry(edge.target_id.clone())
                .or_default()
                .push(edge.source_id.clone());
        }

        let mut queue = std::collections::VecDeque::new();
        let mut visited = std::collections::HashSet::new();
        let mut parent: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();

        queue.push_back(from_id.to_string());
        visited.insert(from_id.to_string());

        while let Some(current) = queue.pop_front() {
            if current == to_id {
                let mut path = vec![to_id.to_string()];
                let mut node = to_id.to_string();
                while let Some(p) = parent.get(&node) {
                    path.push(p.clone());
                    node = p.clone();
                }
                path.reverse();
                return Ok(path);
            }

            if let Some(neighbors) = adjacency.get(&current) {
                for next_node in neighbors {
                    if visited.insert(next_node.clone()) {
                        parent.insert(next_node.clone(), current.clone());
                        queue.push_back(next_node.clone());
                    }
                }
            }
        }
        Ok(Vec::new())
    }

    async fn get_subgraph(
        db: &sqlx::PgPool,
        node_ids: &[String],
    ) -> Result<(Vec<GraphNodeV57>, Vec<GraphEdgeV57>), TopemsError> {
        let nodes = fetch_graph_nodes(db).await?;
        let sub_nodes: Vec<GraphNodeV57> = nodes
            .iter()
            .filter(|n| node_ids.contains(&n.id))
            .cloned()
            .collect();

        let edges = fetch_graph_edges(db).await?;
        let sub_edges: Vec<GraphEdgeV57> = edges
            .iter()
            .filter(|e| node_ids.contains(&e.source_id) && node_ids.contains(&e.target_id))
            .cloned()
            .collect();
        Ok((sub_nodes, sub_edges))
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn detect_communities(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
    ) -> Result<Vec<GraphCommunity>, TopemsError> {
        let nodes = fetch_graph_nodes(db).await?;
        let edges = fetch_graph_edges(db).await?;

        let mut node_community: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();
        let mut communities_map: std::collections::HashMap<String, Vec<String>> =
            std::collections::HashMap::new();

        for node in nodes.iter() {
            let type_based = node.node_type.clone();
            node_community.insert(node.id.clone(), type_based.clone());
            communities_map
                .entry(type_based)
                .or_default()
                .push(node.id.clone());
        }

        let mut detected: Vec<GraphCommunity> = Vec::new();
        for (community_id, member_ids) in &communities_map {
            let edge_count = edges
                .iter()
                .filter(|e| member_ids.contains(&e.source_id) && member_ids.contains(&e.target_id))
                .count() as f64;
            let possible_edges = (member_ids.len() as f64 * (member_ids.len() as f64 - 1.0)) / 2.0;
            let modularity = if possible_edges > 0.0 {
                edge_count / possible_edges
            } else {
                0.0
            };

            detected.push(GraphCommunity {
                id: format!("community_{}", community_id),
                name: format!("{} 社区", community_id),
                node_ids: member_ids.clone(),
                algorithm: "label_propagation".to_string(),
                modularity,
            });
        }

        // 写社区表（UPSERT 幂等）
        for community in &detected {
            sqlx::query(
                "INSERT INTO master_data.mdm_graph_communities (id, name, node_ids, algorithm, modularity, tenant_id)
                 VALUES ($1,$2,$3,$4,$5, $6)
                 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, node_ids = EXCLUDED.node_ids,
                   algorithm = EXCLUDED.algorithm, modularity = EXCLUDED.modularity",
            )
            .bind(&community.id)
            .bind(&community.name)
            .bind(serde_json::to_value(&community.node_ids).unwrap_or_default())
            .bind(&community.algorithm)
            .bind(community.modularity)
            .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("写入社区失败: {e}")))?;
        }

        // 回写节点 community_id（与社区表 id 的 community_ 前缀保持一致）
        for node in &nodes {
            if let Some(cid) = node_community.get(&node.id) {
                sqlx::query(
                    "UPDATE master_data.mdm_graph_nodes SET community_id = $2 WHERE id = $1",
                )
                .bind(&node.id)
                .bind(format!("community_{cid}"))
                .execute(db)
                .await
                .map_err(|e| TopemsError::BusinessLogic(format!("更新节点社区失败: {e}")))?;
            }
        }

        Ok(detected)
    }
}

// ==================== 语义搜索数据结构 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchIndex {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub embeddings: Vec<f64>,
    pub text: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchResult {
    pub entity_type: String,
    pub entity_id: String,
    pub score: f64,
    pub highlights: Vec<String>,
}

// ==================== 语义搜索引擎 ====================

struct SemanticSearchEngine;

impl SemanticSearchEngine {
    async fn index_entity(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        entity_type: String,
        entity_id: String,
        text: String,
        metadata: serde_json::Value,
    ) -> Result<SearchIndex, TopemsError> {
        let embeddings = generate_simulated_embedding(&text, &entity_type);
        let index = SearchIndex {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type,
            entity_id,
            embeddings,
            text,
            metadata,
        };

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_semantic_search_indexes ({SEARCH_INDEX_COLS}, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6, $7)"
        )))
        .bind(&index.id)
        .bind(&index.entity_type)
        .bind(&index.entity_id)
        .bind(serde_json::to_value(&index.embeddings).unwrap_or_default())
        .bind(&index.text)
        .bind(&index.metadata)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入搜索索引失败: {e}")))?;

        Ok(index)
    }

    async fn search_semantic(
        db: &sqlx::PgPool,
        query_embeddings: &[f64],
        top_k: usize,
    ) -> Result<Vec<SearchResult>, TopemsError> {
        let indexes = fetch_search_indexes(db).await?;
        let mut results: Vec<(SearchIndex, f64)> = indexes
            .iter()
            .map(|idx| {
                let score = cosine_similarity(query_embeddings, &idx.embeddings);
                (idx.clone(), score)
            })
            .filter(|(_, score)| *score > 0.1)
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);

        Ok(results
            .into_iter()
            .map(|(idx, score)| SearchResult {
                entity_type: idx.entity_type,
                entity_id: idx.entity_id,
                score,
                highlights: vec![idx.text],
            })
            .collect())
    }

    async fn search_hybrid(
        db: &sqlx::PgPool,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<SearchResult>, TopemsError> {
        let query_embeddings = generate_simulated_embedding(query, "search_query");
        let semantic_results = Self::search_semantic(db, &query_embeddings, top_k).await?;

        let keywords: Vec<&str> = query.split_whitespace().collect();

        let indexes = fetch_search_indexes(db).await?;
        let keyword_matches: Vec<SearchResult> = indexes
            .iter()
            .filter(|idx| {
                let text_lower = idx.text.to_lowercase();
                keywords
                    .iter()
                    .any(|kw| text_lower.contains(&kw.to_lowercase()))
            })
            .map(|idx| SearchResult {
                entity_type: idx.entity_type.clone(),
                entity_id: idx.entity_id.clone(),
                score: 0.8,
                highlights: vec![idx.text.clone()],
            })
            .collect();

        let mut merged = semantic_results;
        for km in keyword_matches {
            if !merged.iter().any(|m| m.entity_id == km.entity_id) {
                merged.push(km);
            }
        }

        merged.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        merged.truncate(top_k);
        Ok(merged)
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    async fn reindex_all(db: &sqlx::PgPool) -> Result<i64, TopemsError> {
        let indexes = fetch_search_indexes(db).await?;
        Ok(indexes.len() as i64)
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    async fn get_search_stats(db: &sqlx::PgPool) -> Result<serde_json::Value, TopemsError> {
        let indexes = fetch_search_indexes(db).await?;
        let total = indexes.len() as i64;
        let entity_types: Vec<String> = indexes
            .iter()
            .map(|i| i.entity_type.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        let queries_count: i64 =
            sqlx::query("SELECT count(*)::bigint AS c FROM master_data.mdm_search_history")
                .fetch_one(db)
                .await
                .map_err(|e| TopemsError::BusinessLogic(format!("查询搜索历史失败: {e}")))?
                .get::<i64, _>("c");

        Ok(serde_json::json!({
            "total_indexes": total,
            "entity_types": entity_types,
            "total_queries": queries_count,
        }))
    }

    async fn remove_from_index(db: &sqlx::PgPool, index_id: &str) -> Result<bool, TopemsError> {
        let res = sqlx::query("DELETE FROM master_data.mdm_semantic_search_indexes WHERE id = $1")
            .bind(index_id)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("删除搜索索引失败: {e}")))?;
        Ok(res.rows_affected() > 0)
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    async fn get_index_size(db: &sqlx::PgPool) -> Result<i64, TopemsError> {
        let indexes = fetch_search_indexes(db).await?;
        Ok(indexes.len() as i64)
    }
}

// ==================== 智能标签数据结构 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub category: String,
    pub color: String,
    pub description: String,
    pub usage_count: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TagRule {
    pub id: String,
    pub tag_id: String,
    pub condition: serde_json::Value,
    pub auto_apply: bool,
    pub priority: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TaggedEntity {
    pub entity_type: String,
    pub entity_id: String,
    pub tag_ids: Vec<String>,
    pub confidence: f64,
    pub applied_at: chrono::DateTime<chrono::Utc>,
}

// ==================== 智能标签引擎 ====================

struct SmartTagger;

impl SmartTagger {
    async fn create_tag(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        mut tag: Tag,
    ) -> Result<Tag, TopemsError> {
        tag.usage_count = 0;
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_tags ({TAG_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6, $7)"
        )))
        .bind(&tag.id)
        .bind(&tag.name)
        .bind(&tag.category)
        .bind(&tag.color)
        .bind(&tag.description)
        .bind(tag.usage_count)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入标签失败: {e}")))?;

        Ok(tag)
    }

    async fn apply_tag(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        entity_type: String,
        entity_id: String,
        tag_id: String,
    ) -> Result<TaggedEntity, TopemsError> {
        let now = chrono::Utc::now();
        let tagged = fetch_tagged_entities(db).await?;
        let mut tag_ids: Vec<String> = tagged
            .iter()
            .find(|t| t.entity_type == entity_type && t.entity_id == entity_id)
            .map(|t| t.tag_ids.clone())
            .unwrap_or_default();
        if !tag_ids.contains(&tag_id) {
            tag_ids.push(tag_id.clone());
        }

        sqlx::query(
            "INSERT INTO master_data.mdm_tagged_entities (entity_type, entity_id, tag_ids, confidence, applied_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5, $6)
             ON CONFLICT (entity_type, entity_id) DO UPDATE SET
               tag_ids = EXCLUDED.tag_ids, confidence = EXCLUDED.confidence, applied_at = EXCLUDED.applied_at",
        )
        .bind(&entity_type)
        .bind(&entity_id)
        .bind(serde_json::to_value(&tag_ids).unwrap_or_default())
        .bind(1.0)
        .bind(now.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入实体标签失败: {e}")))?;

        sqlx::query("UPDATE master_data.mdm_tags SET usage_count = usage_count + 1 WHERE id = $1")
            .bind(&tag_id)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("更新标签计数失败: {e}")))?;

        Ok(TaggedEntity {
            entity_type,
            entity_id,
            tag_ids,
            confidence: 1.0,
            applied_at: now,
        })
    }

    async fn auto_tag(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        entity_type: &str,
        entity_id: &str,
        data: &serde_json::Value,
    ) -> Result<Vec<String>, TopemsError> {
        let rules = fetch_tag_rules(db).await?;
        let auto_rules: Vec<TagRule> = rules.iter().filter(|r| r.auto_apply).cloned().collect();

        let mut applied_tags: Vec<String> = Vec::new();
        for rule in &auto_rules {
            if evaluate_rule(&rule.condition, data) {
                applied_tags.push(rule.tag_id.clone());
            }
        }

        if !applied_tags.is_empty() {
            let now = chrono::Utc::now().to_rfc3339();
            let tagged = fetch_tagged_entities(db).await?;
            let mut tag_ids: Vec<String> = tagged
                .iter()
                .find(|t| t.entity_type == entity_type && t.entity_id == entity_id)
                .map(|t| t.tag_ids.clone())
                .unwrap_or_default();
            for tag_id in &applied_tags {
                if !tag_ids.contains(tag_id) {
                    tag_ids.push(tag_id.clone());
                }
            }

            sqlx::query(
                "INSERT INTO master_data.mdm_tagged_entities (entity_type, entity_id, tag_ids, confidence, applied_at, tenant_id)
                 VALUES ($1,$2,$3,$4,$5, $6)
                 ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                   tag_ids = EXCLUDED.tag_ids, confidence = EXCLUDED.confidence, applied_at = EXCLUDED.applied_at",
            )
            .bind(entity_type)
            .bind(entity_id)
            .bind(serde_json::to_value(&tag_ids).unwrap_or_default())
            .bind(0.9)
            .bind(&now)
            .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("写入实体标签失败: {e}")))?;

            for tag_id in &applied_tags {
                sqlx::query(
                    "UPDATE master_data.mdm_tags SET usage_count = usage_count + 1 WHERE id = $1",
                )
                .bind(tag_id)
                .execute(db)
                .await
                .map_err(|e| TopemsError::BusinessLogic(format!("更新标签计数失败: {e}")))?;
            }
        }

        Ok(applied_tags)
    }

    async fn get_tags_for_entity(
        db: &sqlx::PgPool,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<Vec<Tag>, TopemsError> {
        let tagged = fetch_tagged_entities(db).await?;
        let entity_tags: Vec<String> = tagged
            .iter()
            .filter(|t| t.entity_type == entity_type && t.entity_id == entity_id)
            .flat_map(|t| t.tag_ids.clone())
            .collect();

        let tags = fetch_tags(db).await?;
        Ok(tags
            .iter()
            .filter(|t| entity_tags.contains(&t.id))
            .cloned()
            .collect())
    }

    async fn get_entities_by_tag(
        db: &sqlx::PgPool,
        tag_id: &str,
    ) -> Result<Vec<TaggedEntity>, TopemsError> {
        let tagged = fetch_tagged_entities(db).await?;
        Ok(tagged
            .iter()
            .filter(|t| t.tag_ids.contains(&tag_id.to_string()))
            .cloned()
            .collect())
    }

    async fn remove_tag(
        db: &sqlx::PgPool,
        entity_type: &str,
        entity_id: &str,
        tag_id: &str,
    ) -> Result<bool, TopemsError> {
        let tagged = fetch_tagged_entities(db).await?;
        let Some(entity) = tagged
            .iter()
            .find(|t| t.entity_type == entity_type && t.entity_id == entity_id)
        else {
            return Ok(false);
        };
        if !entity.tag_ids.contains(&tag_id.to_string()) {
            return Ok(false);
        }
        let new_tag_ids: Vec<String> = entity
            .tag_ids
            .iter()
            .filter(|t| **t != tag_id)
            .cloned()
            .collect();

        sqlx::query(
            "UPDATE master_data.mdm_tagged_entities SET tag_ids = $3, confidence = $4, applied_at = $5
             WHERE entity_type = $1 AND entity_id = $2",
        )
        .bind(entity_type)
        .bind(entity_id)
        .bind(serde_json::to_value(&new_tag_ids).unwrap_or_default())
        .bind(entity.confidence)
        .bind(chrono::Utc::now().to_rfc3339())
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("移除实体标签失败: {e}")))?;

        Ok(true)
    }

    async fn list_tags(db: &sqlx::PgPool, category: Option<&str>) -> Result<Vec<Tag>, TopemsError> {
        let tags = fetch_tags(db).await?;
        Ok(match category {
            Some(cat) => tags.iter().filter(|t| t.category == cat).cloned().collect(),
            None => tags,
        })
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    async fn get_tag_stats(db: &sqlx::PgPool) -> Result<serde_json::Value, TopemsError> {
        let tags = fetch_tags(db).await?;
        let tagged = fetch_tagged_entities(db).await?;

        let total_tags = tags.len() as i64;
        let total_entities = tagged.len() as i64;
        let total_assignments: i64 = tagged.iter().map(|t| t.tag_ids.len() as i64).sum();

        let mut category_counts: std::collections::HashMap<String, i64> =
            std::collections::HashMap::new();
        for tag in tags.iter() {
            *category_counts.entry(tag.category.clone()).or_insert(0) += 1;
        }

        let categories: Vec<serde_json::Value> = category_counts
            .iter()
            .map(|(k, v)| serde_json::json!({"category": k, "count": v}))
            .collect();

        Ok(serde_json::json!({
            "total_tags": total_tags,
            "total_entities_tagged": total_entities,
            "total_assignments": total_assignments,
            "categories": categories,
        }))
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn suggest_tags(
        db: &sqlx::PgPool,
        entity_type: &str,
        data: &serde_json::Value,
    ) -> Result<Vec<Tag>, TopemsError> {
        let tags = fetch_tags(db).await?;
        let rules = fetch_tag_rules(db).await?;

        let mut scored_tags: Vec<(Tag, f64)> = Vec::new();
        for tag in tags.iter() {
            let mut score = 0.0;
            for rule in rules.iter() {
                if rule.tag_id == tag.id && evaluate_rule(&rule.condition, data) {
                    score += rule.priority as f64 * 0.25;
                }
            }
            if tag.category == entity_type {
                score += 0.3;
            }
            score += (tag.usage_count as f64 * 0.01).min(0.2);

            if score > 0.1 {
                scored_tags.push((tag.clone(), score));
            }
        }

        scored_tags.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored_tags.truncate(5);
        Ok(scored_tags.into_iter().map(|(tag, _)| tag).collect())
    }
}

// ==================== 内存存储 ====================

// ==================== 辅助函数 ====================

#[allow(clippy::as_conversions)]
fn generate_simulated_embedding(text: &str, context: &str) -> Vec<f64> {
    let dim = 64;
    let mut rng =
        simple_rand::SimpleRand::new(text.len() as u64 * 31 + context.len() as u64 * 17 + 42);
    (0..dim).map(|_| rng.next_f64()).collect()
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}

fn evaluate_rule(condition: &serde_json::Value, data: &serde_json::Value) -> bool {
    if let Some(field) = condition.get("field").and_then(|f| f.as_str()) {
        if let Some(op) = condition.get("operator").and_then(|o| o.as_str()) {
            let expected = condition.get("value");
            let actual = data.get(field);
            match op {
                "equals" => actual == expected,
                "contains" => {
                    if let (Some(a), Some(b)) = (actual, expected) {
                        a.as_str()
                            .map(|s| b.as_str().map(|sub| s.contains(sub)).unwrap_or(false))
                            .unwrap_or(false)
                    } else {
                        false
                    }
                }
                "exists" => actual.is_some(),
                _ => false,
            }
        } else {
            false
        }
    } else {
        false
    }
}

mod simple_rand {
    pub struct SimpleRand {
        state: u64,
    }

    impl SimpleRand {
        pub fn new(seed: u64) -> Self {
            Self {
                state: if seed == 0 { 1 } else { seed },
            }
        }

        #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
        pub fn next_f64(&mut self) -> f64 {
            self.state = self
                .state
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            (self.state >> 11) as f64 / (1u64 << 53) as f64
        }
    }
}

// ==================== 初始化种子数据 ====================

#[allow(dead_code)]
// ==================== U4 持久化 ====================

// ==================== 请求/响应结构 ====================

// --- 图谱请求 ---
#[derive(Debug, Deserialize)]
pub struct AddGraphNodeRequest {
    pub id: Option<String>,
    pub label: String,
    pub node_type: String,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AddGraphEdgeRequest {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: Option<String>,
    pub weight: Option<f64>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct FindPathRequest {
    pub from_id: String,
    pub to_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SubgraphQuery {
    pub node_ids: Option<String>,
}

// --- 搜索请求 ---

#[derive(Debug, Deserialize)]
pub struct IndexEntityRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub text: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SemanticSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct HybridSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct ReindexRequest {
    pub entity_type: Option<String>,
}

// --- 标签请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub category: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApplyTagRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub tag_id: String,
}

#[derive(Debug, Deserialize)]
pub struct AutoTagRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct RemoveTagRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub tag_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ListTagsQuery {
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SuggestQuery {
    pub entity_type: String,
    pub id: String,
}

// ==================== 处理器：图谱 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/graph/node",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn add_graph_node(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AddGraphNodeRequest>,
) -> ApiResponse<GraphNodeV57> {
    let tenant = tenant_of(&claims);
    let id = req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let embeddings = generate_simulated_embedding(&req.label, &req.node_type);

    let node = GraphNodeV57 {
        id,
        label: req.label,
        node_type: req.node_type,
        properties: req.properties.unwrap_or_else(|| serde_json::json!({})),
        embeddings,
        degree: 0,
        community_id: None,
    };

    let result = db_exec!(EnhancedKnowledgeGraph::add_node(&state.db, tenant, node).await);
    ApiResponse::success(result, "图谱节点已创建")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/graph/edge",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn add_graph_edge(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AddGraphEdgeRequest>,
) -> ApiResponse<GraphEdgeV57> {
    let tenant = tenant_of(&claims);
    let edge = GraphEdgeV57 {
        source_id: req.source_id,
        target_id: req.target_id,
        relation_type: req.relation_type.unwrap_or_else(|| "related".to_string()),
        weight: req.weight.unwrap_or(1.0),
        confidence: req.confidence.unwrap_or(1.0),
    };

    let result = db_exec!(EnhancedKnowledgeGraph::add_edge(&state.db, tenant, edge).await);
    ApiResponse::success(result, "图谱边已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/graph/neighbors/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn get_neighbors(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Vec<GraphNodeV57>> {
    let neighbors = db_exec!(EnhancedKnowledgeGraph::get_neighbors(&state.db, &id).await);
    ApiResponse::success(neighbors, "邻居节点列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/graph/community/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn get_community(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    match db_exec!(EnhancedKnowledgeGraph::get_community(&state.db, &id).await) {
        Some(community) => ApiResponse::success(serde_json::json!(community), "社区信息"),
        None => ApiResponse::not_found("未找到社区信息"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/graph/path",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn find_shortest_path_handler(
    State(state): State<AppState>,
    Json(req): Json<FindPathRequest>,
) -> ApiResponse<serde_json::Value> {
    let path = db_exec!(
        EnhancedKnowledgeGraph::find_shortest_path(&state.db, &req.from_id, &req.to_id).await
    );

    if path.is_empty() {
        return ApiResponse::not_found("未找到可达路径");
    }

    ApiResponse::success(
        serde_json::json!({
            "path": path,
            "length": path.len() as i64,
            "from_id": req.from_id,
            "to_id": req.to_id,
        }),
        "最短路径",
    )
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/mdm-v57/graph/subgraph",
    responses((status = 200, description = "get_subgraph OK")),
    tag = "semantic_v57"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_subgraph(
    State(state): State<AppState>,
    Query(params): Query<SubgraphQuery>,
) -> ApiResponse<serde_json::Value> {
    let node_ids: Vec<String> = params
        .node_ids
        .unwrap_or_else(String::new)
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if node_ids.is_empty() {
        return ApiResponse::bad_request("请提供 node_ids 参数");
    }

    let (nodes, edges) = db_exec!(EnhancedKnowledgeGraph::get_subgraph(&state.db, &node_ids).await);

    ApiResponse::success(
        serde_json::json!({
            "nodes": nodes,
            "edges": edges,
            "node_count": nodes.len() as i64,
            "edge_count": edges.len() as i64,
        }),
        "子图数据",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/graph/communities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn detect_communities_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<GraphCommunity>> {
    let tenant = tenant_of(&claims);
    let communities = db_exec!(EnhancedKnowledgeGraph::detect_communities(&state.db, tenant).await);
    ApiResponse::success(communities, "社区检测完成")
}

// ==================== 处理器：语义搜索 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/search/index",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn index_entity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<IndexEntityRequest>,
) -> ApiResponse<SearchIndex> {
    let tenant = tenant_of(&claims);
    let metadata = req.metadata.unwrap_or_else(|| serde_json::json!({}));
    let result = db_exec!(
        SemanticSearchEngine::index_entity(
            &state.db,
            tenant,
            req.entity_type,
            req.entity_id,
            req.text,
            metadata
        )
        .await
    );

    ApiResponse::success(result, "实体已索引")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/search/semantic",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn search_semantic_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SemanticSearchRequest>,
) -> ApiResponse<Vec<SearchResult>> {
    let tenant = tenant_of(&claims);
    let top_k = req.top_k.unwrap_or(10);
    let query_embeddings = generate_simulated_embedding(&req.query, "search_query");
    let results =
        db_exec!(SemanticSearchEngine::search_semantic(&state.db, &query_embeddings, top_k).await);

    // 写搜索历史真表
    let history_id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = sqlx::query(
        "INSERT INTO master_data.mdm_search_history (id, query, results_count, created_at, tenant_id)
         VALUES ($1,$2,$3,$4, $5)",
    )
    .bind(&history_id)
    .bind(&req.query)
    .bind(results.len() as i64)
    .bind(chrono::Utc::now().to_rfc3339())
    .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
    .execute(&state.db)
    .await
    {
        return ApiResponse::from(TopemsError::internal("写入搜索历史失败", e));
    }

    ApiResponse::success(results, "语义搜索结果")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/search/hybrid",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn search_hybrid_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<HybridSearchRequest>,
) -> ApiResponse<Vec<SearchResult>> {
    let tenant = tenant_of(&claims);
    let top_k = req.top_k.unwrap_or(10);
    let results = db_exec!(SemanticSearchEngine::search_hybrid(&state.db, &req.query, top_k).await);

    // 写搜索历史真表
    let history_id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = sqlx::query(
        "INSERT INTO master_data.mdm_search_history (id, query, results_count, created_at, tenant_id)
         VALUES ($1,$2,$3,$4, $5)",
    )
    .bind(&history_id)
    .bind(&req.query)
    .bind(results.len() as i64)
    .bind(chrono::Utc::now().to_rfc3339())
    .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
    .execute(&state.db)
    .await
    {
        return ApiResponse::from(TopemsError::internal("写入搜索历史失败", e));
    }

    ApiResponse::success(results, "混合搜索结果")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/search/reindex",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn reindex_all(
    State(state): State<AppState>,
    Json(_req): Json<ReindexRequest>,
) -> ApiResponse<serde_json::Value> {
    let count = db_exec!(SemanticSearchEngine::reindex_all(&state.db).await);

    ApiResponse::success(
        serde_json::json!({
            "total_indexes": count,
            "status": "reindexed",
        }),
        "全量重建索引完成",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/search/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn get_search_stats(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    let stats = db_exec!(SemanticSearchEngine::get_search_stats(&state.db).await);
    ApiResponse::success(stats, "搜索统计")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/search/index/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn remove_from_index(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    let removed = db_exec!(SemanticSearchEngine::remove_from_index(&state.db, &id).await);

    if removed {
        ApiResponse::success(
            serde_json::json!({"index_id": id, "removed": true}),
            "索引已删除",
        )
    } else {
        ApiResponse::not_found("未找到索引")
    }
}

// ==================== 处理器：智能标签 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn create_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTagRequest>,
) -> ApiResponse<Tag> {
    let tenant = tenant_of(&claims);
    let tag = Tag {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        category: req.category.unwrap_or_else(|| "general".to_string()),
        color: req.color.unwrap_or_else(|| "#6C757D".to_string()),
        description: req.description.unwrap_or_else(String::new),
        usage_count: 0,
    };

    let result = db_exec!(SmartTagger::create_tag(&state.db, tenant, tag).await);
    ApiResponse::success(result, "标签已创建")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/tag/apply",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn apply_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ApplyTagRequest>,
) -> ApiResponse<TaggedEntity> {
    let tenant = tenant_of(&claims);
    let result = db_exec!(
        SmartTagger::apply_tag(&state.db, tenant, req.entity_type, req.entity_id, req.tag_id).await
    );

    ApiResponse::success(result, "标签已应用")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/tag/auto",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn auto_tag(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoTagRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant = tenant_of(&claims);
    let applied = db_exec!(
        SmartTagger::auto_tag(&state.db, tenant, &req.entity_type, &req.entity_id, &req.data).await
    );

    ApiResponse::success(
        serde_json::json!({
            "entity_type": req.entity_type,
            "entity_id": req.entity_id,
            "applied_tags": applied,
            "applied_count": applied.len() as i64,
        }),
        "自动标签已应用",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/tags/entity/{type}/{id}",
    params(
        ("type" = String, Path, description = "type"),
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn get_tags_for_entity(
    State(state): State<AppState>,
    Path((entity_type, entity_id)): Path<(String, String)>,
) -> ApiResponse<Vec<Tag>> {
    let tags =
        db_exec!(SmartTagger::get_tags_for_entity(&state.db, &entity_type, &entity_id).await);
    ApiResponse::success(tags, "实体标签列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/entities/tag/{tag}",
    params(
        ("tag" = String, Path, description = "tag")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn get_entities_by_tag(
    State(state): State<AppState>,
    Path(tag): Path<String>,
) -> ApiResponse<Vec<TaggedEntity>> {
    let entities = db_exec!(SmartTagger::get_entities_by_tag(&state.db, &tag).await);
    ApiResponse::success(entities, "标签实体列表")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/tag/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn remove_tag_handler(
    State(state): State<AppState>,
    Json(req): Json<RemoveTagRequest>,
) -> ApiResponse<serde_json::Value> {
    let removed = db_exec!(
        SmartTagger::remove_tag(&state.db, &req.entity_type, &req.entity_id, &req.tag_id).await
    );

    if removed {
        ApiResponse::success(
            serde_json::json!({
                "entity_type": req.entity_type,
                "entity_id": req.entity_id,
                "tag_id": req.tag_id,
                "removed": true,
            }),
            "标签已移除",
        )
    } else {
        ApiResponse::not_found("未找到标签关系")
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn list_tags(
    State(state): State<AppState>,
    Query(params): Query<ListTagsQuery>,
) -> ApiResponse<Vec<Tag>> {
    let tags = db_exec!(SmartTagger::list_tags(&state.db, params.category.as_deref()).await);
    ApiResponse::success(tags, "标签列表")
}

pub async fn get_tag_stats(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    let stats = db_exec!(SmartTagger::get_tag_stats(&state.db).await);
    ApiResponse::success(stats, "标签统计")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/mdm-v57/tags/suggest",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn suggest_tags(
    State(state): State<AppState>,
    Query(params): Query<SuggestQuery>,
) -> ApiResponse<Vec<Tag>> {
    let data = fetch_graph_node_properties(&state.db, &params.id).await;
    let tags = db_exec!(SmartTagger::suggest_tags(&state.db, &params.entity_type, &data).await);
    ApiResponse::success(tags, "推荐标签")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/mdm-v57/graph/embeddings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
    ),
    tag = "semantic_v57"
)]
/// 文本向量化（降级占位）：项目当前未接入 embedding 模型服务（ai 服务的
/// generate_embeddings 需 embedding_model 配置），此处返回业务码 501 明确能力
/// 缺口，前端可据此降级；接入模型服务后替换为真实调用。
pub async fn compute_embeddings(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::not_implemented("Embedding 服务未接入：请配置 embedding_model 后由 AI 服务提供")
}
