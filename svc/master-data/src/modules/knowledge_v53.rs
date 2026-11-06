//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V53.0 MDM AC-25: 知识图谱 + 智能推荐 + 数据资产目录
//!
//! 核心能力：
//! - 知识图谱 (Knowledge Graph): ECAR 模型、图谱遍历（BFS/DFS/路径查找）、子图提取、图谱嵌入、相似度计算
//! - 智能推荐 (Intelligent Recommendation): 协同过滤、基于内容过滤、基于知识图谱推荐、混合策略、冷启动处理
//! - 数据资产目录 (Data Asset Catalog): 资产注册、元数据管理、全文搜索、分类标签、资产发现、使用分析
//!
//! 设计风格：ApiResponse + K1 真表（master_data schema，sqlx 直读写，store 已收敛）

use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use std::collections::{HashMap, HashSet};
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;
use utoipa::ToSchema;

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

// ==================== K1：真表映射（master_data.mdm_kg_* 等 8 表） ====================

fn kg_node_from_row(row: &sqlx::postgres::PgRow) -> KGNode {
    KGNode {
        id: row.get::<String, _>("id"),
        label: row.get::<String, _>("label"),
        r#type: node_type_from_str(&row.get::<String, _>("node_type")),
        properties: row.get::<serde_json::Value, _>("properties"),
        embeddings: serde_json::from_value(row.get::<serde_json::Value, _>("embeddings"))
            .unwrap_or_default(),
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
    }
}
const KG_NODE_COLS: &str =
    "id, label, node_type, properties, embeddings, created_at::timestamptz AS created_at";

fn kg_edge_from_row(row: &sqlx::postgres::PgRow) -> KGEdge {
    KGEdge {
        id: row.get::<String, _>("id"),
        source_id: row.get::<String, _>("source_id"),
        target_id: row.get::<String, _>("target_id"),
        relation_type: relation_type_from_str(&row.get::<String, _>("relation_type")),
        weight: row.get::<f64, _>("weight"),
        confidence: row.get::<f64, _>("confidence"),
    }
}
const KG_EDGE_COLS: &str = "id, source_id, target_id, relation_type, weight, confidence";

fn kg_graph_from_row(row: &sqlx::postgres::PgRow) -> KnowledgeGraph {
    KnowledgeGraph {
        nodes: serde_json::from_value(row.get::<serde_json::Value, _>("nodes")).unwrap_or_default(),
        edges: serde_json::from_value(row.get::<serde_json::Value, _>("edges")).unwrap_or_default(),
        version: row.get::<i64, _>("version"),
        last_updated: row.get::<String, _>("last_updated"),
    }
}
const KG_GRAPH_COLS: &str = "id, nodes, edges, version, last_updated";

fn recommendation_from_row(row: &sqlx::postgres::PgRow) -> Recommendation {
    Recommendation {
        id: row.get::<String, _>("id"),
        target_id: row.get::<String, _>("target_id"),
        item_id: row.get::<String, _>("item_id"),
        score: row.get::<f64, _>("score"),
        reason: row.get::<serde_json::Value, _>("reason"),
        source: recommendation_source_from_str(&row.get::<String, _>("source")),
    }
}
const RECOMMENDATION_COLS: &str = "id, target_id, item_id, score, reason, source";

fn interaction_from_row(row: &sqlx::postgres::PgRow) -> InteractionRecord {
    InteractionRecord {
        id: row.get::<String, _>("id"),
        user_id: row.get::<String, _>("user_id"),
        item_id: row.get::<String, _>("item_id"),
        interaction_type: row.get::<String, _>("interaction_type"),
        timestamp: row.get::<String, _>("timestamp"),
    }
}
const INTERACTION_COLS: &str = "id, user_id, item_id, interaction_type, timestamp";

fn asset_from_row(row: &sqlx::postgres::PgRow) -> DataAsset {
    DataAsset {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        asset_type: asset_type_from_str(&row.get::<String, _>("asset_type")),
        description: row.get::<String, _>("description"),
        owner: row.get::<String, _>("owner"),
        domain: row.get::<String, _>("domain"),
        tags: serde_json::from_value(row.get::<serde_json::Value, _>("tags")).unwrap_or_default(),
        lineage_summary: row.get::<serde_json::Value, _>("lineage_summary"),
        quality_score: row.get::<f64, _>("quality_score"),
        access_level: row.get::<String, _>("access_level"),
        updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
    }
}
const ASSET_COLS: &str = "id, name, asset_type, description, owner, domain, tags, lineage_summary, quality_score, access_level, updated_at::timestamptz AS updated_at";

fn asset_category_from_row(row: &sqlx::postgres::PgRow) -> AssetCategory {
    AssetCategory {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        parent_id: row.get::<Option<String>, _>("parent_id"),
        asset_count: row.get::<i64, _>("asset_count"),
    }
}
const ASSET_CATEGORY_COLS: &str = "id, name, parent_id, asset_count";

fn search_index_from_row(row: &sqlx::postgres::PgRow) -> (String, Vec<String>) {
    let key: String = row.get("key");
    let value: Vec<String> =
        serde_json::from_value(row.get::<serde_json::Value, _>("value")).unwrap_or_default();
    (key, value)
}
const SEARCH_INDEX_COLS: &str = "key, value";

// ==================== 知识图谱 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum KGNodeType {
    Entity,
    Concept,
    Attribute,
    Relation,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct KGNode {
    pub id: String,
    pub label: String,
    pub r#type: KGNodeType,
    pub properties: serde_json::Value,
    pub embeddings: Vec<f64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum KGRelationType {
    BelongsTo,
    PartOf,
    DependsOn,
    SimilarTo,
    DerivedFrom,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct KGEdge {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub relation_type: KGRelationType,
    pub weight: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct KnowledgeGraph {
    pub nodes: Vec<KGNode>,
    pub edges: Vec<KGEdge>,
    pub version: i64,
    pub last_updated: String,
}

// ==================== 智能推荐 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationSource {
    Collaborative,
    Content,
    KnowledgeGraph,
    Hybrid,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct Recommendation {
    pub id: String,
    pub target_id: String,
    pub item_id: String,
    pub score: f64,
    pub reason: serde_json::Value,
    pub source: RecommendationSource,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct InteractionRecord {
    pub id: String,
    pub user_id: String,
    pub item_id: String,
    pub interaction_type: String,
    pub timestamp: String,
}

// ==================== 数据资产目录 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AssetType {
    Entity,
    Attribute,
    Relation,
    Dataset,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct DataAsset {
    pub id: String,
    pub name: String,
    pub asset_type: AssetType,
    pub description: String,
    pub owner: String,
    pub domain: String,
    pub tags: Vec<String>,
    pub lineage_summary: serde_json::Value,
    pub quality_score: f64,
    pub access_level: String,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct AssetCategory {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub asset_count: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct AssetCatalog {
    pub assets: Vec<DataAsset>,
    pub categories: Vec<AssetCategory>,
    pub search_index: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct AssetStats {
    pub total_assets: i64,
    pub by_type: HashMap<String, i64>,
    pub by_domain: HashMap<String, i64>,
    pub avg_quality_score: f64,
    pub recent_updates: i64,
}

// ==================== 内存存储 ====================

// ==================== 初始化种子数据 ====================

// ==================== U4 持久化 ====================

// ==================== 内部辅助函数 ====================

fn relation_type_to_str(t: &KGRelationType) -> &'static str {
    match t {
        KGRelationType::BelongsTo => "belongs_to",
        KGRelationType::PartOf => "part_of",
        KGRelationType::DependsOn => "depends_on",
        KGRelationType::SimilarTo => "similar_to",
        KGRelationType::DerivedFrom => "derived_from",
    }
}

fn node_type_to_str(t: &KGNodeType) -> &'static str {
    match t {
        KGNodeType::Entity => "entity",
        KGNodeType::Concept => "concept",
        KGNodeType::Attribute => "attribute",
        KGNodeType::Relation => "relation",
    }
}

fn asset_type_to_str(t: &AssetType) -> &'static str {
    match t {
        AssetType::Entity => "entity",
        AssetType::Attribute => "attribute",
        AssetType::Relation => "relation",
        AssetType::Dataset => "dataset",
    }
}

fn recommendation_source_from_str(s: &str) -> RecommendationSource {
    match s {
        "collaborative" => RecommendationSource::Collaborative,
        "content" => RecommendationSource::Content,
        "knowledge_graph" => RecommendationSource::KnowledgeGraph,
        _ => RecommendationSource::Hybrid,
    }
}

fn recommendation_source_to_str(s: &RecommendationSource) -> &'static str {
    match s {
        RecommendationSource::Collaborative => "collaborative",
        RecommendationSource::Content => "content",
        RecommendationSource::KnowledgeGraph => "knowledge_graph",
        RecommendationSource::Hybrid => "hybrid",
    }
}

fn relation_type_from_str(s: &str) -> KGRelationType {
    match s {
        "part_of" => KGRelationType::PartOf,
        "depends_on" => KGRelationType::DependsOn,
        "similar_to" => KGRelationType::SimilarTo,
        "derived_from" => KGRelationType::DerivedFrom,
        _ => KGRelationType::BelongsTo,
    }
}

fn node_type_from_str(s: &str) -> KGNodeType {
    match s {
        "concept" => KGNodeType::Concept,
        "attribute" => KGNodeType::Attribute,
        "relation" => KGNodeType::Relation,
        _ => KGNodeType::Entity,
    }
}

fn asset_type_from_str(s: &str) -> AssetType {
    match s {
        "attribute" => AssetType::Attribute,
        "relation" => AssetType::Relation,
        "dataset" => AssetType::Dataset,
        _ => AssetType::Entity,
    }
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let dot_product: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot_product / (norm_a * norm_b)
}

// ==================== K1：真表读取与图谱重算助手 ====================

async fn fetch_kg_nodes(db: &sqlx::PgPool) -> Vec<KGNode> {
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {KG_NODE_COLS} FROM master_data.mdm_kg_nodes"
    )))
    .fetch_all(db)
    .await
    .map(|rows| rows.iter().map(kg_node_from_row).collect())
    .unwrap_or_default()
}

async fn fetch_kg_edges(db: &sqlx::PgPool) -> Vec<KGEdge> {
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {KG_EDGE_COLS} FROM master_data.mdm_kg_edges"
    )))
    .fetch_all(db)
    .await
    .map(|rows| rows.iter().map(kg_edge_from_row).collect())
    .unwrap_or_default()
}

async fn fetch_kg_graph(db: &sqlx::PgPool) -> Option<KnowledgeGraph> {
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {KG_GRAPH_COLS} FROM master_data.mdm_kg_graphs ORDER BY id LIMIT 1"
    )))
    .fetch_optional(db)
    .await
    .ok()
    .flatten()
    .map(|r| kg_graph_from_row(&r))
}

async fn refresh_kg_graph(
    db: &sqlx::PgPool,
    tenant: Option<uuid::Uuid>,
) -> Result<(), TopemsError> {
    let nodes = fetch_kg_nodes(db).await;
    let edges = fetch_kg_edges(db).await;
    let now = chrono::Utc::now().to_rfc3339();
    let graph = KnowledgeGraph {
        nodes,
        edges,
        version: 0,
        last_updated: now,
    };
    sqlx::query(
        r#"INSERT INTO master_data.mdm_kg_graphs (id, nodes, edges, version, last_updated, tenant_id)
           VALUES ('default', $1, $2, 1, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET nodes = EXCLUDED.nodes, edges = EXCLUDED.edges,
               version = master_data.mdm_kg_graphs.version + 1,
               last_updated = EXCLUDED.last_updated"#,
    )
    .bind(serde_json::to_value(&graph.nodes).unwrap_or_default())
    .bind(serde_json::to_value(&graph.edges).unwrap_or_default())
    .bind(&graph.last_updated)
    .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
    .execute(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("刷新知识图谱失败: {e}")))?;
    Ok(())
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
fn jaccard_similarity<T: Eq + std::hash::Hash>(a: &[T], b: &[T]) -> f64 {
    let set_a: HashSet<&T> = HashSet::from_iter(a.iter());
    let set_b: HashSet<&T> = HashSet::from_iter(b.iter());
    let intersection = set_a.intersection(&set_b).count() as f64;
    let union = set_a.union(&set_b).count() as f64;
    if union == 0.0 {
        0.0
    } else {
        intersection / union
    }
}

// ==================== KnowledgeGraphEngine 实现 ====================

struct KnowledgeGraphEngine;

impl KnowledgeGraphEngine {
    async fn add_node(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        label: String,
        node_type: KGNodeType,
        properties: serde_json::Value,
    ) -> Result<KGNode, TopemsError> {
        let now = chrono::Utc::now();
        let node = KGNode {
            id: uuid::Uuid::new_v4().to_string(),
            label,
            r#type: node_type,
            properties,
            embeddings: Vec::new(),
            created_at: now,
        };
        sqlx::query(
            r#"INSERT INTO master_data.mdm_kg_nodes (id, label, node_type, properties, embeddings, created_at, tenant_id)
               VALUES ($1,$2,$3,$4,$5,$6, $7)"#,
        )
        .bind(&node.id)
        .bind(&node.label)
        .bind(node_type_to_str(&node.r#type))
        .bind(&node.properties)
        .bind(serde_json::to_value(&node.embeddings).unwrap_or_default())
        .bind(node.created_at.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入知识图谱节点失败: {e}")))?;

        refresh_kg_graph(db, tenant).await?;

        Ok(node)
    }

    async fn add_edge(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        source_id: String,
        target_id: String,
        relation_type: KGRelationType,
        weight: Option<f64>,
        confidence: Option<f64>,
    ) -> Result<KGEdge, TopemsError> {
        let nodes = fetch_kg_nodes(db).await;
        if !nodes.iter().any(|n| n.id == source_id) {
            return Err(TopemsError::ResourceNotFound(format!(
                "源节点不存在: {}",
                source_id
            )));
        }
        if !nodes.iter().any(|n| n.id == target_id) {
            return Err(TopemsError::ResourceNotFound(format!(
                "目标节点不存在: {}",
                target_id
            )));
        }

        let edge = KGEdge {
            id: uuid::Uuid::new_v4().to_string(),
            source_id,
            target_id,
            relation_type,
            weight: weight.unwrap_or(1.0),
            confidence: confidence.unwrap_or(1.0),
        };
        sqlx::query(
            r#"INSERT INTO master_data.mdm_kg_edges (id, source_id, target_id, relation_type, weight, confidence, tenant_id)
               VALUES ($1,$2,$3,$4,$5,$6, $7)"#,
        )
        .bind(&edge.id)
        .bind(&edge.source_id)
        .bind(&edge.target_id)
        .bind(relation_type_to_str(&edge.relation_type))
        .bind(edge.weight)
        .bind(edge.confidence)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入知识图谱边失败: {e}")))?;

        refresh_kg_graph(db, tenant).await?;

        Ok(edge)
    }

    async fn get_subgraph(
        db: &sqlx::PgPool,
        node_id: &str,
        depth: Option<i32>,
    ) -> Result<KnowledgeGraph, TopemsError> {
        let nodes = fetch_kg_nodes(db).await;
        let edges = fetch_kg_edges(db).await;

        let max_depth = depth.unwrap_or(3);
        let mut visited = HashSet::new();
        let mut subgraph_nodes: Vec<KGNode> = Vec::new();
        let mut subgraph_edges: Vec<KGEdge> = Vec::new();
        let mut queue = vec![(node_id.to_string(), 0)];

        while !queue.is_empty() {
            let (nid, d) = queue.remove(0);
            if d >= max_depth || !visited.insert(nid.clone()) {
                continue;
            }

            if let Some(node) = nodes.iter().find(|n| n.id == nid).cloned() {
                if !subgraph_nodes.iter().any(|n| n.id == node.id) {
                    subgraph_nodes.push(node);
                }
            }

            for edge in edges.iter() {
                if edge.source_id == nid || edge.target_id == nid {
                    if !subgraph_edges.iter().any(|e| e.id == edge.id) {
                        subgraph_edges.push(edge.clone());
                    }
                    if edge.source_id == nid && !visited.contains(&edge.target_id) {
                        queue.push((edge.target_id.clone(), d + 1));
                    }
                    if edge.target_id == nid && !visited.contains(&edge.source_id) {
                        queue.push((edge.source_id.clone(), d + 1));
                    }
                }
            }
        }

        Ok(KnowledgeGraph {
            nodes: subgraph_nodes,
            edges: subgraph_edges,
            version: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }

    async fn find_path(
        db: &sqlx::PgPool,
        start_id: &str,
        end_id: &str,
    ) -> Result<Vec<KGEdge>, TopemsError> {
        let nodes = fetch_kg_nodes(db).await;
        let edges = fetch_kg_edges(db).await;

        if !nodes.iter().any(|n| n.id == start_id) {
            return Err(TopemsError::ResourceNotFound(format!(
                "起始节点不存在: {}",
                start_id
            )));
        }
        if !nodes.iter().any(|n| n.id == end_id) {
            return Err(TopemsError::ResourceNotFound(format!(
                "目标节点不存在: {}",
                end_id
            )));
        }

        let mut visited = HashSet::new();
        let mut queue: Vec<(String, Vec<KGEdge>)> = vec![(start_id.to_string(), Vec::new())];

        while !queue.is_empty() {
            let (current, path) = queue.remove(0);
            if current == end_id {
                return Ok(path);
            }
            if !visited.insert(current.clone()) {
                continue;
            }

            for edge in edges.iter() {
                let mut new_path = path.clone();
                if edge.source_id == current && !visited.contains(&edge.target_id) {
                    new_path.push(edge.clone());
                    queue.push((edge.target_id.clone(), new_path));
                } else if edge.target_id == current && !visited.contains(&edge.source_id) {
                    new_path.push(edge.clone());
                    queue.push((edge.source_id.clone(), new_path));
                }
            }
        }

        Err(TopemsError::BusinessLogic(format!(
            "未找到从 {} 到 {} 的路径",
            start_id, end_id
        )))
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    async fn get_similar(
        db: &sqlx::PgPool,
        node_id: &str,
        limit: Option<i32>,
    ) -> Result<Vec<KGNode>, TopemsError> {
        let nodes = fetch_kg_nodes(db).await;
        let target = nodes
            .iter()
            .find(|n| n.id == node_id)
            .cloned()
            .ok_or_else(|| format!("未找到节点: {}", node_id))?;

        let limit = limit.unwrap_or(10) as usize;

        let mut scored: Vec<(f64, KGNode)> = nodes
            .iter()
            .filter(|n| n.id != target.id)
            .map(|n| {
                let sim = if !target.embeddings.is_empty() && !n.embeddings.is_empty() {
                    cosine_similarity(&target.embeddings, &n.embeddings)
                } else {
                    let tags_target: Vec<&str> = target
                        .properties
                        .as_object()
                        .map(|m| m.keys().map(|k| k.as_str()).collect())
                        .unwrap_or_default();
                    let tags_other: Vec<&str> = n
                        .properties
                        .as_object()
                        .map(|m| m.keys().map(|k| k.as_str()).collect())
                        .unwrap_or_default();
                    jaccard_similarity(&tags_target, &tags_other)
                };
                (sim, n.clone())
            })
            .collect();

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        let result: Vec<KGNode> = scored.into_iter().take(limit).map(|(_, n)| n).collect();

        Ok(result)
    }

    async fn export_graph(db: &sqlx::PgPool, format: &str) -> Result<String, TopemsError> {
        let graph = fetch_kg_graph(db).await;
        let graph = match graph {
            Some(g) if !g.nodes.is_empty() || !g.edges.is_empty() => g,
            _ => return Err(TopemsError::BusinessLogic("没有可用的知识图谱".to_string())),
        };

        match format {
            "dot" => {
                let mut dot = String::new();
                dot.push_str("digraph knowledge_graph {\n");
                dot.push_str("  rankdir=LR;\n");
                for node in &graph.nodes {
                    dot.push_str(&format!(
                        "  \"{}\" [label=\"{} ({:?})\"];\n",
                        node.id, node.label, node.r#type
                    ));
                }
                for edge in &graph.edges {
                    dot.push_str(&format!(
                        "  \"{}\" -> \"{}\" [label=\"{:?}\"];\n",
                        edge.source_id, edge.target_id, edge.relation_type
                    ));
                }
                dot.push_str("}\n");
                Ok(dot)
            }
            "json" => serde_json::to_string_pretty(&graph)
                .map_err(|e| TopemsError::BusinessLogic(e.to_string())),
            _ => Err(TopemsError::ValidationFailed(format!(
                "不支持的导出格式: {}",
                format
            ))),
        }
    }
}

// ==================== RecommendationEngine 实现 ====================

struct RecommendationEngine;

impl RecommendationEngine {
    #[allow(
        clippy::as_conversions,
        clippy::cast_precision_loss,
        clippy::cast_sign_loss
    )]
    async fn get_recommendations(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        user_id: &str,
        target_id: Option<String>,
        limit: Option<i32>,
    ) -> Result<Vec<Recommendation>, TopemsError> {
        // K1：交互与资产从真表读。
        let interactions: Vec<InteractionRecord> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {INTERACTION_COLS} FROM master_data.mdm_interactions WHERE user_id = $1"
        )))
        .bind(user_id)
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(interaction_from_row).collect())
        .unwrap_or_default();
        let assets: Vec<DataAsset> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_from_row).collect())
        .unwrap_or_default();

        let limit = limit.unwrap_or(10) as usize;

        let user_interactions: Vec<&InteractionRecord> = interactions
            .iter()
            .filter(|i| i.user_id == user_id)
            .collect();

        let mut scores: Vec<(f64, String, RecommendationSource, serde_json::Value)> = Vec::new();

        if !user_interactions.is_empty() {
            let interacted_ids: HashSet<&str> = user_interactions
                .iter()
                .map(|i| i.item_id.as_str())
                .collect();

            for asset in assets.iter() {
                if interacted_ids.contains(&asset.id.as_str()) {
                    continue;
                }

                let mut score = 0.0;
                let mut source = RecommendationSource::Content;
                let mut reason = serde_json::json!({});

                if let Some(ref tid) = target_id {
                    if let Some(target_asset) = assets.iter().find(|a| a.id == *tid) {
                        let tag_overlap = jaccard_similarity(&asset.tags, &target_asset.tags);
                        score += tag_overlap * 0.5;
                        if asset.domain == target_asset.domain {
                            score += 0.2;
                        }
                        reason = serde_json::json!({
                            "target_based": true,
                            "tag_similarity": tag_overlap,
                        });
                        source = RecommendationSource::Content;
                    }
                }

                let category_match = user_interactions
                    .iter()
                    .filter(|i| {
                        assets
                            .iter()
                            .find(|a| a.id == i.item_id)
                            .map(|a| a.asset_type == asset.asset_type)
                            .unwrap_or(false)
                    })
                    .count() as f64;
                score += category_match * 0.1;

                if score > 0.01 {
                    scores.push((score, asset.id.clone(), source.clone(), reason));
                }
            }
        }

        if scores.is_empty() {
            let mut all_assets: Vec<&DataAsset> = assets.iter().collect();
            all_assets.sort_by(|a, b| {
                b.quality_score
                    .partial_cmp(&a.quality_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            for asset in all_assets.iter().take(limit) {
                scores.push((
                    asset.quality_score,
                    asset.id.clone(),
                    RecommendationSource::Hybrid,
                    serde_json::json!({
                        "cold_start": true,
                        "reason": "基于质量评分的热门推荐",
                    }),
                ));
            }
        }

        scores.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        let recommendations: Vec<Recommendation> = scores
            .into_iter()
            .take(limit)
            .map(|(score, item_id, source, reason)| Recommendation {
                id: uuid::Uuid::new_v4().to_string(),
                target_id: user_id.to_string(),
                item_id,
                score,
                reason,
                source,
            })
            .collect();

        // K1：结果写真表（推荐即生成即存）。
        for rec in &recommendations {
            sqlx::query(
                r#"INSERT INTO master_data.mdm_recommendations
                   (id, target_id, item_id, score, reason, source, tenant_id)
                   VALUES ($1,$2,$3,$4,$5,$6, $7)"#,
            )
            .bind(&rec.id)
            .bind(&rec.target_id)
            .bind(&rec.item_id)
            .bind(rec.score)
            .bind(&rec.reason)
            .bind(recommendation_source_to_str(&rec.source))
            .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("写入推荐记录失败: {e}")))?;
        }

        Ok(recommendations)
    }

    async fn record_interaction(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        user_id: String,
        item_id: String,
        interaction_type: String,
    ) -> Result<InteractionRecord, TopemsError> {
        let record = InteractionRecord {
            id: uuid::Uuid::new_v4().to_string(),
            user_id,
            item_id,
            interaction_type,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        sqlx::query(
            r#"INSERT INTO master_data.mdm_interactions
               (id, user_id, item_id, interaction_type, timestamp, tenant_id)
               VALUES ($1,$2,$3,$4,$5, $6)"#,
        )
        .bind(&record.id)
        .bind(&record.user_id)
        .bind(&record.item_id)
        .bind(&record.interaction_type)
        .bind(&record.timestamp)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入交互记录失败: {e}")))?;
        Ok(record)
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    async fn get_similar_items(
        db: &sqlx::PgPool,
        item_id: &str,
        limit: Option<i32>,
    ) -> Result<Vec<DataAsset>, TopemsError> {
        let assets: Vec<DataAsset> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_from_row).collect())
        .unwrap_or_default();
        let target = assets
            .iter()
            .find(|a| a.id == item_id)
            .cloned()
            .ok_or_else(|| format!("未找到资产: {}", item_id))?;

        let limit = limit.unwrap_or(10) as usize;
        let mut scored: Vec<(f64, &DataAsset)> = assets
            .iter()
            .filter(|a| a.id != target.id)
            .map(|a| {
                let tag_sim = jaccard_similarity(&target.tags, &a.tags);
                let domain_sim = if target.domain == a.domain { 0.3 } else { 0.0 };
                let type_sim = if target.asset_type == a.asset_type {
                    0.2
                } else {
                    0.0
                };
                let score = tag_sim * 0.5 + domain_sim + type_sim;
                (score, a)
            })
            .collect();

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        let result: Vec<DataAsset> = scored
            .into_iter()
            .take(limit)
            .map(|(_, a)| a.clone())
            .collect();
        Ok(result)
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    async fn get_popular_items(db: &sqlx::PgPool, limit: Option<i32>) -> Vec<DataAsset> {
        let assets: Vec<DataAsset> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_from_row).collect())
        .unwrap_or_default();
        let interactions: Vec<InteractionRecord> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {INTERACTION_COLS} FROM master_data.mdm_interactions"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(interaction_from_row).collect())
        .unwrap_or_default();

        let limit = limit.unwrap_or(10) as usize;

        let mut interaction_counts: HashMap<String, i64> = HashMap::new();
        for interaction in interactions.iter() {
            *interaction_counts
                .entry(interaction.item_id.clone())
                .or_insert(0) += 1;
        }

        let mut scored: Vec<(i64, &DataAsset)> = assets
            .iter()
            .map(|a| {
                let count = interaction_counts.get(&a.id).copied().unwrap_or(0);
                (count, a)
            })
            .collect();

        scored.sort_by(|a, b| b.0.cmp(&a.0));
        let result: Vec<DataAsset> = scored
            .into_iter()
            .take(limit)
            .map(|(_, a)| a.clone())
            .collect();
        result
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    async fn get_trending_items(db: &sqlx::PgPool, limit: Option<i32>) -> Vec<DataAsset> {
        let assets: Vec<DataAsset> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_from_row).collect())
        .unwrap_or_default();
        let interactions: Vec<InteractionRecord> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {INTERACTION_COLS} FROM master_data.mdm_interactions"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(interaction_from_row).collect())
        .unwrap_or_default();

        let limit = limit.unwrap_or(10) as usize;
        let now = chrono::Utc::now();
        let one_day_ago = now - chrono::Duration::days(1);

        let mut recent_counts: HashMap<String, i64> = HashMap::new();
        for interaction in interactions.iter() {
            if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&interaction.timestamp) {
                if ts > one_day_ago {
                    *recent_counts
                        .entry(interaction.item_id.clone())
                        .or_insert(0) += 1;
                }
            }
        }

        let mut scored: Vec<(i64, f64, &DataAsset)> = assets
            .iter()
            .map(|a| {
                let count = recent_counts.get(&a.id).copied().unwrap_or(0);
                let quality_boost = a.quality_score;
                (count, quality_boost, a)
            })
            .collect();

        scored.sort_by(|a, b| {
            b.0.cmp(&a.0)
                .then_with(|| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal))
        });
        let result: Vec<DataAsset> = scored
            .into_iter()
            .take(limit)
            .map(|(_, _, a)| a.clone())
            .collect();
        result
    }
}

// ==================== AssetCatalogManager 实现 ====================

struct AssetCatalogManager;

impl AssetCatalogManager {
    async fn register_asset(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        name: String,
        asset_type: AssetType,
        description: String,
        owner: String,
        domain: String,
        tags: Vec<String>,
    ) -> Result<DataAsset, TopemsError> {
        let now = chrono::Utc::now();
        let asset = DataAsset {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.clone(),
            asset_type,
            description: description.clone(),
            owner,
            domain: domain.clone(),
            tags: tags.clone(),
            lineage_summary: serde_json::json!({}),
            quality_score: 0.0,
            access_level: "internal".to_string(),
            updated_at: now,
        };
        sqlx::query(
            r#"INSERT INTO master_data.mdm_assets
               (id, name, asset_type, description, owner, domain, tags, lineage_summary, quality_score, access_level, updated_at, tenant_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, $12)"#,
        )
        .bind(&asset.id)
        .bind(&asset.name)
        .bind(asset_type_to_str(&asset.asset_type))
        .bind(&asset.description)
        .bind(&asset.owner)
        .bind(&asset.domain)
        .bind(serde_json::to_value(&asset.tags).unwrap_or_default())
        .bind(&asset.lineage_summary)
        .bind(asset.quality_score)
        .bind(&asset.access_level)
        .bind(asset.updated_at.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入数据资产失败: {e}")))?;

        // 搜索索引同步落真表。
        upsert_search_index(db, tenant, &asset, &description, &domain, &tags).await?;

        Ok(asset)
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_possible_wrap,
        clippy::cast_sign_loss
    )]
    async fn search_assets(
        db: &sqlx::PgPool,
        query: Option<String>,
        asset_type: Option<AssetType>,
        domain: Option<String>,
        tags: Option<Vec<String>>,
        page: Option<i64>,
        page_size: Option<i64>,
    ) -> (Vec<DataAsset>, i64) {
        let assets: Vec<DataAsset> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_from_row).collect())
        .unwrap_or_default();

        let mut filtered: Vec<DataAsset> = assets;

        if let Some(ref q) = query {
            let q_lower = q.to_lowercase();
            filtered.retain(|a| {
                a.name.to_lowercase().contains(&q_lower)
                    || a.description.to_lowercase().contains(&q_lower)
                    || a.tags.iter().any(|t| t.to_lowercase().contains(&q_lower))
                    || a.domain.to_lowercase().contains(&q_lower)
            });
        }

        if let Some(ref at) = asset_type {
            filtered.retain(|a| a.asset_type == *at);
        }

        if let Some(ref d) = domain {
            filtered.retain(|a| a.domain == *d);
        }

        if let Some(ref tgs) = tags {
            filtered.retain(|a| tgs.iter().all(|t| a.tags.contains(t)));
        }

        let total = filtered.len() as i64;
        let page = page.unwrap_or(1).max(1);
        let page_size = page_size.unwrap_or(20).min(100);
        let items: Vec<DataAsset> = filtered
            .into_iter()
            .skip(((page - 1) * page_size) as usize)
            .take(page_size as usize)
            .collect();

        (items, total)
    }

    async fn get_asset(db: &sqlx::PgPool, id: &str) -> Result<DataAsset, TopemsError> {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets WHERE id = $1"
        )))
        .bind(id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询数据资产失败: {e}")))?
        .map(|r| asset_from_row(&r))
        .ok_or_else(|| TopemsError::ResourceNotFound(format!("未找到资产: {}", id)))
    }

    async fn update_asset(
        db: &sqlx::PgPool,
        tenant: Option<uuid::Uuid>,
        id: &str,
        name: Option<String>,
        description: Option<String>,
        tags: Option<Vec<String>>,
        quality_score: Option<f64>,
        access_level: Option<String>,
    ) -> Result<DataAsset, TopemsError> {
        let current = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets WHERE id = $1"
        )))
        .bind(id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询数据资产失败: {e}")))?
        .map(|r| asset_from_row(&r))
        .ok_or_else(|| TopemsError::BusinessLogic(format!("未找到资产: {}", id)))?;

        let mut asset = current;
        if let Some(n) = name {
            asset.name = n;
        }
        if let Some(d) = description {
            asset.description = d;
        }
        if let Some(t) = tags {
            asset.tags = t;
        }
        if let Some(q) = quality_score {
            asset.quality_score = q;
        }
        if let Some(al) = access_level {
            asset.access_level = al;
        }
        asset.updated_at = chrono::Utc::now();

        sqlx::query(
            r#"UPDATE master_data.mdm_assets SET
               name = $2, description = $3, tags = $4, quality_score = $5,
               access_level = $6, updated_at = $7
               WHERE id = $1 AND ($8::uuid IS NULL OR tenant_id = $8)"#,
        )
        .bind(id)
        .bind(&asset.name)
        .bind(&asset.description)
        .bind(serde_json::to_value(&asset.tags).unwrap_or_default())
        .bind(asset.quality_score)
        .bind(&asset.access_level)
        .bind(asset.updated_at.to_rfc3339())
        .bind(tenant)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新数据资产失败: {e}")))?;

        // 搜索索引同步刷新。
        upsert_search_index(db, tenant, &asset, &asset.description, &asset.domain, &asset.tags)
            .await?;

        Ok(asset)
    }

    async fn list_categories(db: &sqlx::PgPool) -> Vec<AssetCategory> {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_CATEGORY_COLS} FROM master_data.mdm_asset_categories"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_category_from_row).collect())
        .unwrap_or_default()
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_wrap,
        clippy::cast_precision_loss
    )]
    async fn get_asset_stats(db: &sqlx::PgPool) -> AssetStats {
        let assets: Vec<DataAsset> = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSET_COLS} FROM master_data.mdm_assets"
        )))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(asset_from_row).collect())
        .unwrap_or_default();

        let total = assets.len() as i64;
        let mut by_type: HashMap<String, i64> = HashMap::new();
        let mut by_domain: HashMap<String, i64> = HashMap::new();
        let mut quality_sum = 0.0;
        let now = chrono::Utc::now();
        let one_day_ago = now - chrono::Duration::days(1);
        let mut recent_updates = 0i64;

        for asset in assets.iter() {
            *by_type
                .entry(format!("{:?}", asset.asset_type).to_lowercase())
                .or_insert(0) += 1;
            *by_domain.entry(asset.domain.clone()).or_insert(0) += 1;
            quality_sum += asset.quality_score;
            if asset.updated_at > one_day_ago {
                recent_updates += 1;
            }
        }

        let avg_quality = if total > 0 {
            quality_sum / total as f64
        } else {
            0.0
        };

        AssetStats {
            total_assets: total,
            by_type,
            by_domain,
            avg_quality_score: avg_quality,
            recent_updates,
        }
    }
}

// ==================== K1：搜索索引同步助手 ====================

async fn upsert_search_index(
    db: &sqlx::PgPool,
    tenant: Option<uuid::Uuid>,
    asset: &DataAsset,
    description: &str,
    domain: &str,
    tags: &[String],
) -> Result<(), TopemsError> {
    let mut keys = Vec::new();
    keys.push(asset.name.to_lowercase());
    if !description.is_empty() {
        keys.push(description.to_lowercase());
    }
    for tag in tags {
        keys.push(tag.to_lowercase());
    }
    if !domain.is_empty() {
        keys.push(domain.to_lowercase());
    }

    for key in keys {
        // 追加 asset id 到既有索引值（去重由 jsonb 内含实现：读→合并→写）。
        let existing: Vec<String> =
            sqlx::query("SELECT value FROM master_data.mdm_search_indexes WHERE key = $1")
                .bind(&key)
                .fetch_optional(db)
                .await
                .ok()
                .flatten()
                .and_then(|r| r.try_get::<serde_json::Value, _>("value").ok())
                .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
                .unwrap_or_default();

        let mut merged = existing;
        if !merged.contains(&asset.id) {
            merged.push(asset.id.clone());
        }
        sqlx::query(
            r#"INSERT INTO master_data.mdm_search_indexes (key, value, tenant_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"#,
        )
        .bind(&key)
        .bind(serde_json::to_value(&merged).unwrap_or_default())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入搜索索引失败: {e}")))?;
    }
    Ok(())
}

// ==================== 请求/响应结构 ====================

// --- Knowledge Graph Requests ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddKGNodeRequest {
    pub label: String,
    pub node_type: String,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddKGEdgeRequest {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub weight: Option<f64>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SubgraphQuery {
    pub depth: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PathQuery {
    pub start_id: String,
    pub end_id: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SimilarQuery {
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ExportKGQuery {
    pub format: Option<String>,
}

// --- Recommendation Requests ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct RecommendationQuery {
    pub target_id: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct RecordInteractionRequest {
    pub user_id: String,
    pub item_id: String,
    pub interaction_type: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SimilarItemsQuery {
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct TrendingQuery {
    pub limit: Option<i32>,
}

// --- Asset Catalog Requests ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct RegisterAssetRequest {
    pub name: String,
    pub asset_type: String,
    pub description: String,
    pub owner: String,
    pub domain: String,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SearchAssetsQuery {
    pub q: Option<String>,
    pub asset_type: Option<String>,
    pub domain: Option<String>,
    pub tags: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateAssetRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub quality_score: Option<f64>,
    pub access_level: Option<String>,
}

// ==================== API 处理器：知识图谱 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:knowledge:write"])),
    path = "/kg-v53/nodes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn add_kg_node(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AddKGNodeRequest>,
) -> ApiResponse<KGNode> {
    let tenant = tenant_of(&claims);
    let node_type = node_type_from_str(&req.node_type);
    let props = req.properties.unwrap_or_else(|| serde_json::json!({}));

    match KnowledgeGraphEngine::add_node(&state.db, tenant, req.label, node_type, props).await {
        Ok(node) => ApiResponse::success(node, "知识图谱节点已添加"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:knowledge:write"])),
    path = "/kg-v53/edges",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn add_kg_edge(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AddKGEdgeRequest>,
) -> ApiResponse<KGEdge> {
    let tenant = tenant_of(&claims);
    let relation_type = relation_type_from_str(&req.relation_type);
    match KnowledgeGraphEngine::add_edge(
        &state.db,
        tenant,
        req.source_id,
        req.target_id,
        relation_type,
        req.weight,
        req.confidence,
    )
    .await
    {
        Ok(edge) => ApiResponse::success(edge, "知识图谱边已添加"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/kg-v53/subgraph/{node_id}",
    params(
        ("node_id" = String, Path, description = "node_id"),
    ),
    responses((status = 200, description = "get_subgraph OK")),
    tag = "knowledge_v53"
)]

pub async fn get_subgraph(
    State(state): State<AppState>,
    Path(node_id): Path<String>,
    Query(params): Query<SubgraphQuery>,
) -> ApiResponse<KnowledgeGraph> {
    match KnowledgeGraphEngine::get_subgraph(&state.db, &node_id, params.depth).await {
        Ok(graph) => ApiResponse::success(graph, "子图谱"),
        Err(e) => ApiResponse::not_found(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/path",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn find_path(
    State(state): State<AppState>,
    Query(params): Query<PathQuery>,
) -> ApiResponse<Vec<KGEdge>> {
    match KnowledgeGraphEngine::find_path(&state.db, &params.start_id, &params.end_id).await {
        Ok(path) => ApiResponse::success(path, "路径查找成功"),
        Err(e) => ApiResponse::not_found(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/similar/{node_id}",
    params(
        ("node_id" = String, Path, description = "node_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn get_similar(
    State(state): State<AppState>,
    Path(node_id): Path<String>,
    Query(params): Query<SimilarQuery>,
) -> ApiResponse<Vec<KGNode>> {
    match KnowledgeGraphEngine::get_similar(&state.db, &node_id, params.limit).await {
        Ok(nodes) => ApiResponse::success(nodes, "相似节点"),
        Err(e) => ApiResponse::not_found(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/export",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn export_kg(
    State(state): State<AppState>,
    Query(params): Query<ExportKGQuery>,
) -> ApiResponse<serde_json::Value> {
    let format = params.format.unwrap_or_else(|| "json".to_string());
    match KnowledgeGraphEngine::export_graph(&state.db, &format).await {
        Ok(content) => {
            let content_type = match format.as_str() {
                "dot" => "text/vnd.graphviz",
                _ => "application/json",
            };
            ApiResponse::success(
                serde_json::json!({
                    "format": format,
                    "content": content,
                    "content_type": content_type,
                }),
                "知识图谱导出成功",
            )
        }
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

// ==================== API 处理器：智能推荐 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/recommendations/{user_id}",
    params(
        ("user_id" = String, Path, description = "user_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn get_recommendations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Query(params): Query<RecommendationQuery>,
) -> ApiResponse<Vec<Recommendation>> {
    let tenant = tenant_of(&claims);
    match RecommendationEngine::get_recommendations(
        &state.db,
        tenant,
        &user_id,
        params.target_id,
        params.limit,
    )
    .await
    {
        Ok(recs) => ApiResponse::success(recs, "推荐结果"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:knowledge:write"])),
    path = "/kg-v53/interactions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn record_interaction(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RecordInteractionRequest>,
) -> ApiResponse<InteractionRecord> {
    let tenant = tenant_of(&claims);
    let interaction_type = req.interaction_type.unwrap_or_else(|| "view".to_string());
    match RecommendationEngine::record_interaction(
        &state.db,
        tenant,
        req.user_id,
        req.item_id,
        interaction_type,
    )
    .await
    {
        Ok(record) => ApiResponse::success(record, "交互记录已保存"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/similar-items/{item_id}",
    params(
        ("item_id" = String, Path, description = "item_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn get_similar_items(
    State(state): State<AppState>,
    Path(item_id): Path<String>,
    Query(params): Query<SimilarItemsQuery>,
) -> ApiResponse<Vec<DataAsset>> {
    match RecommendationEngine::get_similar_items(&state.db, &item_id, params.limit).await {
        Ok(items) => ApiResponse::success(items, "相似资产"),
        Err(e) => ApiResponse::not_found(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/trending",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn get_trending_items(
    State(state): State<AppState>,
    Query(params): Query<TrendingQuery>,
) -> ApiResponse<Vec<DataAsset>> {
    let items = RecommendationEngine::get_trending_items(&state.db, params.limit).await;
    ApiResponse::success(items, "趋势资产")
}

// ==================== API 处理器：数据资产目录 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:knowledge:write"])),
    path = "/kg-v53/assets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn register_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RegisterAssetRequest>,
) -> ApiResponse<DataAsset> {
    let tenant = tenant_of(&claims);
    let asset_type = asset_type_from_str(&req.asset_type);
    let tags = req.tags.unwrap_or_default();

    match AssetCatalogManager::register_asset(
        &state.db,
        tenant,
        req.name,
        asset_type,
        req.description,
        req.owner,
        req.domain,
        tags,
    )
    .await
    {
        Ok(asset) => ApiResponse::success(asset, "数据资产已注册"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/assets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn search_assets(
    State(state): State<AppState>,
    Query(params): Query<SearchAssetsQuery>,
) -> ApiResponse<PaginatedResponse<DataAsset>> {
    let asset_type = params.asset_type.as_ref().map(|t| asset_type_from_str(t));
    let tags = params
        .tags
        .as_ref()
        .map(|t| t.split(',').map(|s| s.trim().to_string()).collect());

    let (items, total) = AssetCatalogManager::search_assets(
        &state.db,
        params.q,
        asset_type,
        params.domain,
        tags,
        params.page,
        params.page_size,
    )
    .await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "资产列表",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/assets/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn get_asset(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<DataAsset> {
    match AssetCatalogManager::get_asset(&state.db, &id).await {
        Ok(asset) => ApiResponse::success(asset, "资产详情"),
        Err(e) => ApiResponse::from(e),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:knowledge:write"])),
    path = "/kg-v53/assets/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn update_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<UpdateAssetRequest>,
) -> ApiResponse<DataAsset> {
    let tenant = tenant_of(&claims);
    match AssetCatalogManager::update_asset(
        &state.db,
        tenant,
        &id,
        req.name,
        req.description,
        req.tags,
        req.quality_score,
        req.access_level,
    )
    .await
    {
        Ok(asset) => ApiResponse::success(asset, "资产已更新"),
        Err(e) => ApiResponse::not_found(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn list_categories(State(state): State<AppState>) -> ApiResponse<Vec<AssetCategory>> {
    let categories = AssetCatalogManager::list_categories(&state.db).await;
    ApiResponse::success(categories, "资产分类列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:knowledge:read"])),
    path = "/kg-v53/assets/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "knowledge_v53"
)]
pub async fn get_asset_stats(State(state): State<AppState>) -> ApiResponse<AssetStats> {
    let stats = AssetCatalogManager::get_asset_stats(&state.db).await;
    ApiResponse::success(stats, "资产统计")
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- relation_type_from_str ----------

    #[test]
    fn test_relation_type_from_str_part_of() {
        assert_eq!(relation_type_from_str("part_of"), KGRelationType::PartOf);
    }

    #[test]
    fn test_relation_type_from_str_depends_on() {
        assert_eq!(
            relation_type_from_str("depends_on"),
            KGRelationType::DependsOn
        );
    }

    #[test]
    fn test_relation_type_from_str_similar_to() {
        assert_eq!(
            relation_type_from_str("similar_to"),
            KGRelationType::SimilarTo
        );
    }

    #[test]
    fn test_relation_type_from_str_derived_from() {
        assert_eq!(
            relation_type_from_str("derived_from"),
            KGRelationType::DerivedFrom
        );
    }

    #[test]
    fn test_relation_type_from_str_belongs_to_default() {
        assert_eq!(
            relation_type_from_str("belongs_to"),
            KGRelationType::BelongsTo
        );
        assert_eq!(relation_type_from_str("unknown"), KGRelationType::BelongsTo);
        assert_eq!(relation_type_from_str(""), KGRelationType::BelongsTo);
    }

    // ---------- node_type_from_str ----------

    #[test]
    fn test_node_type_from_str_concept() {
        assert_eq!(node_type_from_str("concept"), KGNodeType::Concept);
    }

    #[test]
    fn test_node_type_from_str_attribute() {
        assert_eq!(node_type_from_str("attribute"), KGNodeType::Attribute);
    }

    #[test]
    fn test_node_type_from_str_relation() {
        assert_eq!(node_type_from_str("relation"), KGNodeType::Relation);
    }

    #[test]
    fn test_node_type_from_str_entity_default() {
        assert_eq!(node_type_from_str("entity"), KGNodeType::Entity);
        assert_eq!(node_type_from_str("xxx"), KGNodeType::Entity);
        assert_eq!(node_type_from_str(""), KGNodeType::Entity);
    }

    // ---------- asset_type_from_str ----------

    #[test]
    fn test_asset_type_from_str_attribute() {
        assert_eq!(asset_type_from_str("attribute"), AssetType::Attribute);
    }

    #[test]
    fn test_asset_type_from_str_relation() {
        assert_eq!(asset_type_from_str("relation"), AssetType::Relation);
    }

    #[test]
    fn test_asset_type_from_str_dataset() {
        assert_eq!(asset_type_from_str("dataset"), AssetType::Dataset);
    }

    #[test]
    fn test_asset_type_from_str_entity_default() {
        assert_eq!(asset_type_from_str("entity"), AssetType::Entity);
        assert_eq!(asset_type_from_str("xxx"), AssetType::Entity);
    }

    // ---------- cosine_similarity ----------

    #[test]
    fn test_cosine_similarity_identical_vectors() {
        let v = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_cosine_similarity_orthogonal_vectors() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 1e-9);
    }

    #[test]
    fn test_cosine_similarity_empty_returns_zero() {
        assert_eq!(cosine_similarity(&[], &[1.0]), 0.0);
        assert_eq!(cosine_similarity(&[1.0], &[]), 0.0);
        assert_eq!(cosine_similarity(&[], &[]), 0.0);
    }

    #[test]
    fn test_cosine_similarity_zero_norm_returns_zero() {
        let a = vec![0.0, 0.0];
        let b = vec![1.0, 1.0];
        assert_eq!(cosine_similarity(&a, &b), 0.0);
    }

    #[test]
    fn test_cosine_similarity_opposite_vectors() {
        let a = vec![1.0, 1.0];
        let b = vec![-1.0, -1.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim + 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_cosine_similarity_known_value() {
        // a = [1,0,0], b = [1,1,0] -> dot=1, |a|=1, |b|=sqrt(2)
        // sim = 1/sqrt(2) ≈ 0.7071
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 1.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        let expected = 1.0 / 2.0_f64.sqrt();
        assert!((sim - expected).abs() < 1e-9);
    }

    #[test]
    fn test_cosine_similarity_different_lengths() {
        // 长度不一致：zip 会以较短的为准
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0];
        let sim = cosine_similarity(&a, &b);
        // dot = 1*1 + 2*2 = 5
        // |a| (前2维) = sqrt(1+4) = sqrt(5)；实际计算使用 a 完整向量 -> sqrt(1+4+9)=sqrt(14)
        // |b| = sqrt(5)
        // sim = 5 / (sqrt(14)*sqrt(5))
        let expected = 5.0 / (14.0_f64.sqrt() * 5.0_f64.sqrt());
        assert!((sim - expected).abs() < 1e-9);
    }

    // ---------- jaccard_similarity ----------

    #[test]
    fn test_jaccard_similarity_identical() {
        let a = vec![1, 2, 3];
        let b = vec![1, 2, 3];
        let sim = jaccard_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_jaccard_similarity_disjoint() {
        let a = vec![1, 2];
        let b = vec![3, 4];
        let sim = jaccard_similarity(&a, &b);
        assert!(sim.abs() < 1e-9);
    }

    #[test]
    fn test_jaccard_similarity_empty() {
        let a: Vec<i32> = vec![];
        let b: Vec<i32> = vec![];
        assert_eq!(jaccard_similarity(&a, &b), 0.0);
    }

    #[test]
    fn test_jaccard_similarity_half_overlap() {
        let a = vec![1, 2, 3, 4];
        let b = vec![1, 2, 5, 6];
        // intersection = {1,2} -> 2; union = {1,2,3,4,5,6} -> 6
        let sim = jaccard_similarity(&a, &b);
        assert!((sim - 2.0 / 6.0).abs() < 1e-9);
    }

    #[test]
    fn test_jaccard_similarity_with_duplicates() {
        // 集合语义：重复元素被去重
        let a = vec![1, 1, 2];
        let b = vec![1, 2, 2];
        let sim = jaccard_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 1e-9);
    }

    // ---------- 枚举 serde 往返 ----------

    #[test]
    fn test_kg_node_type_serde_roundtrip() {
        for v in [
            KGNodeType::Entity,
            KGNodeType::Concept,
            KGNodeType::Attribute,
            KGNodeType::Relation,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: KGNodeType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_kg_relation_type_serde_roundtrip() {
        for v in [
            KGRelationType::BelongsTo,
            KGRelationType::PartOf,
            KGRelationType::DependsOn,
            KGRelationType::SimilarTo,
            KGRelationType::DerivedFrom,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: KGRelationType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_recommendation_source_serde_roundtrip() {
        for v in [
            RecommendationSource::Collaborative,
            RecommendationSource::Content,
            RecommendationSource::KnowledgeGraph,
            RecommendationSource::Hybrid,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: RecommendationSource = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_asset_type_serde_roundtrip() {
        for v in [
            AssetType::Entity,
            AssetType::Attribute,
            AssetType::Relation,
            AssetType::Dataset,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: AssetType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    // ---------- 结构体 serde 往返 ----------

    #[test]
    fn test_kg_node_serde_roundtrip() {
        let node = KGNode {
            id: "n-1".to_string(),
            label: "Customer".to_string(),
            r#type: KGNodeType::Entity,
            properties: serde_json::json!({"k": "v"}),
            embeddings: vec![0.1, 0.2],
            created_at: chrono::DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&chrono::Utc),
        };
        let json = serde_json::to_string(&node).unwrap();
        let back: KGNode = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "n-1");
        assert_eq!(back.r#type, KGNodeType::Entity);
        assert_eq!(back.embeddings.len(), 2);
    }

    #[test]
    fn test_kg_node_serde_preserves_type_field() {
        let node = KGNode {
            id: "n".to_string(),
            label: "L".to_string(),
            r#type: KGNodeType::Concept,
            properties: serde_json::json!({}),
            embeddings: vec![],
            created_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&node).unwrap();
        assert!(json.contains("\"type\":\"concept\""));
    }

    #[test]
    fn test_kg_edge_serde_roundtrip() {
        let edge = KGEdge {
            id: "e-1".to_string(),
            source_id: "n-1".to_string(),
            target_id: "n-2".to_string(),
            relation_type: KGRelationType::DependsOn,
            weight: 0.8,
            confidence: 0.9,
        };
        let json = serde_json::to_string(&edge).unwrap();
        let back: KGEdge = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "e-1");
        assert_eq!(back.relation_type, KGRelationType::DependsOn);
        assert!((back.weight - 0.8).abs() < f64::EPSILON);
    }

    #[test]
    fn test_knowledge_graph_serde_roundtrip() {
        let g = KnowledgeGraph {
            nodes: vec![],
            edges: vec![],
            version: 3,
            last_updated: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&g).unwrap();
        let back: KnowledgeGraph = serde_json::from_str(&json).unwrap();
        assert_eq!(back.version, 3);
    }

    #[test]
    fn test_recommendation_serde_roundtrip() {
        let r = Recommendation {
            id: "r-1".to_string(),
            target_id: "u-1".to_string(),
            item_id: "i-1".to_string(),
            score: 0.95,
            reason: serde_json::json!({"k": "v"}),
            source: RecommendationSource::Hybrid,
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: Recommendation = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "r-1");
        assert_eq!(back.source, RecommendationSource::Hybrid);
    }

    #[test]
    fn test_interaction_record_serde_roundtrip() {
        let i = InteractionRecord {
            id: "i-1".to_string(),
            user_id: "u-1".to_string(),
            item_id: "a-1".to_string(),
            interaction_type: "view".to_string(),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&i).unwrap();
        let back: InteractionRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "i-1");
        assert_eq!(back.interaction_type, "view");
    }

    #[test]
    fn test_data_asset_serde_roundtrip() {
        let a = DataAsset {
            id: "a-1".to_string(),
            name: "Customer Master".to_string(),
            asset_type: AssetType::Entity,
            description: "desc".to_string(),
            owner: "team".to_string(),
            domain: "customer".to_string(),
            tags: vec!["customer".to_string()],
            lineage_summary: serde_json::json!({}),
            quality_score: 0.9,
            access_level: "restricted".to_string(),
            updated_at: chrono::DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&chrono::Utc),
        };
        let json = serde_json::to_string(&a).unwrap();
        let back: DataAsset = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "a-1");
        assert_eq!(back.asset_type, AssetType::Entity);
        assert!((back.quality_score - 0.9).abs() < 1e-9);
    }

    #[test]
    fn test_asset_category_serde_roundtrip() {
        let c = AssetCategory {
            id: "cat-1".to_string(),
            name: "实体".to_string(),
            parent_id: None,
            asset_count: 5,
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: AssetCategory = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "cat-1");
        assert!(back.parent_id.is_none());
        assert_eq!(back.asset_count, 5);
    }

    #[test]
    fn test_asset_catalog_serde_roundtrip() {
        let c = AssetCatalog {
            assets: vec![],
            categories: vec![],
            search_index: HashMap::new(),
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: AssetCatalog = serde_json::from_str(&json).unwrap();
        assert!(back.assets.is_empty());
    }

    #[test]
    fn test_asset_stats_serde_roundtrip() {
        let s = AssetStats {
            total_assets: 10,
            by_type: HashMap::new(),
            by_domain: HashMap::new(),
            avg_quality_score: 0.85,
            recent_updates: 3,
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: AssetStats = serde_json::from_str(&json).unwrap();
        assert_eq!(back.total_assets, 10);
        assert_eq!(back.recent_updates, 3);
    }

    // ---------- Clone/Eq ----------

    #[test]
    fn test_kg_node_clone_eq() {
        let n = KGNode {
            id: "n".to_string(),
            label: "L".to_string(),
            r#type: KGNodeType::Entity,
            properties: serde_json::json!({}),
            embeddings: vec![],
            created_at: chrono::Utc::now(),
        };
        let cloned = n.clone();
        assert_eq!(n.id, cloned.id);
        assert_eq!(n.r#type, cloned.r#type);
    }

    #[test]
    fn test_kg_node_type_eq() {
        assert_eq!(KGNodeType::Entity, KGNodeType::Entity);
        assert_ne!(KGNodeType::Entity, KGNodeType::Concept);
    }

    #[test]
    fn test_asset_type_eq() {
        assert_eq!(AssetType::Dataset, AssetType::Dataset);
        assert_ne!(AssetType::Dataset, AssetType::Entity);
    }
}
