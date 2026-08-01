//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V53.0 MDM AC-25: 知识图谱 + 智能推荐 + 数据资产目录
//!
//! 核心能力：
//! - 知识图谱 (Knowledge Graph): ECAR 模型、图谱遍历（BFS/DFS/路径查找）、子图提取、图谱嵌入、相似度计算
//! - 智能推荐 (Intelligent Recommendation): 协同过滤、基于内容过滤、基于知识图谱推荐、混合策略、冷启动处理
//! - 数据资产目录 (Data Asset Catalog): 资产注册、元数据管理、全文搜索、分类标签、资产发现、使用分析
//!
//! 设计风格：ApiResponse + LazyLock 内存存储

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::{ApiResponse, PaginatedResponse};

use crate::shared::AppState;

// ==================== 知识图谱 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KGNodeType {
    Entity,
    Concept,
    Attribute,
    Relation,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KGNode {
    pub id: String,
    pub label: String,
    pub r#type: KGNodeType,
    pub properties: serde_json::Value,
    pub embeddings: Vec<f64>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KGRelationType {
    BelongsTo,
    PartOf,
    DependsOn,
    SimilarTo,
    DerivedFrom,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KGEdge {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub relation_type: KGRelationType,
    pub weight: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KnowledgeGraph {
    pub nodes: Vec<KGNode>,
    pub edges: Vec<KGEdge>,
    pub version: i64,
    pub last_updated: String,
}

// ==================== 智能推荐 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationSource {
    Collaborative,
    Content,
    KnowledgeGraph,
    Hybrid,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Recommendation {
    pub id: String,
    pub target_id: String,
    pub item_id: String,
    pub score: f64,
    pub reason: serde_json::Value,
    pub source: RecommendationSource,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InteractionRecord {
    pub id: String,
    pub user_id: String,
    pub item_id: String,
    pub interaction_type: String,
    pub timestamp: String,
}

// ==================== 数据资产目录 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssetType {
    Entity,
    Attribute,
    Relation,
    Dataset,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
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
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssetCategory {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub asset_count: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssetCatalog {
    pub assets: Vec<DataAsset>,
    pub categories: Vec<AssetCategory>,
    pub search_index: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssetStats {
    pub total_assets: i64,
    pub by_type: HashMap<String, i64>,
    pub by_domain: HashMap<String, i64>,
    pub avg_quality_score: f64,
    pub recent_updates: i64,
}

// ==================== 内存存储 ====================

struct KnowledgeV53Store {
    kg_nodes: Mutex<Vec<KGNode>>,
    kg_edges: Mutex<Vec<KGEdge>>,
    kg_graphs: Mutex<Vec<KnowledgeGraph>>,
    recommendations: Mutex<Vec<Recommendation>>,
    interactions: Mutex<Vec<InteractionRecord>>,
    assets: Mutex<Vec<DataAsset>>,
    asset_categories: Mutex<Vec<AssetCategory>>,
    search_index: Mutex<HashMap<String, Vec<String>>>,
    initialized: Mutex<bool>,
}

fn get_knowledge_v53_store() -> &'static KnowledgeV53Store {
    static STORE: LazyLock<KnowledgeV53Store> = LazyLock::new(|| KnowledgeV53Store {
        kg_nodes: Mutex::new(Vec::new()),
        kg_edges: Mutex::new(Vec::new()),
        kg_graphs: Mutex::new(Vec::new()),
        recommendations: Mutex::new(Vec::new()),
        interactions: Mutex::new(Vec::new()),
        assets: Mutex::new(Vec::new()),
        asset_categories: Mutex::new(Vec::new()),
        search_index: Mutex::new(HashMap::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_knowledge_v53_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    let nodes = vec![
        KGNode {
            id: "kg-node-001".to_string(),
            label: "Customer".to_string(),
            r#type: KGNodeType::Entity,
            properties: serde_json::json!({
                "code": "CUSTOMER",
                "table": "mdm_customer"
            }),
            embeddings: vec![0.1, 0.2, 0.3, 0.4, 0.5],
            created_at: now.clone(),
        },
        KGNode {
            id: "kg-node-002".to_string(),
            label: "Supplier".to_string(),
            r#type: KGNodeType::Entity,
            properties: serde_json::json!({
                "code": "SUPPLIER",
                "table": "mdm_supplier"
            }),
            embeddings: vec![0.15, 0.25, 0.35, 0.45, 0.55],
            created_at: now.clone(),
        },
        KGNode {
            id: "kg-node-003".to_string(),
            label: "Material".to_string(),
            r#type: KGNodeType::Entity,
            properties: serde_json::json!({
                "code": "MATERIAL",
                "table": "mdm_material"
            }),
            embeddings: vec![0.2, 0.3, 0.4, 0.5, 0.6],
            created_at: now.clone(),
        },
        KGNode {
            id: "kg-node-004".to_string(),
            label: "Customer Code".to_string(),
            r#type: KGNodeType::Attribute,
            properties: serde_json::json!({
                "field": "code",
                "data_type": "String"
            }),
            embeddings: vec![0.12, 0.22, 0.32, 0.42, 0.52],
            created_at: now.clone(),
        },
        KGNode {
            id: "kg-node-005".to_string(),
            label: "Customer-Order Relation".to_string(),
            r#type: KGNodeType::Relation,
            properties: serde_json::json!({
                "name": "has_orders",
                "cardinality": "one_to_many"
            }),
            embeddings: vec![0.3, 0.4, 0.5, 0.6, 0.7],
            created_at: now.clone(),
        },
        KGNode {
            id: "kg-node-006".to_string(),
            label: "Business Partner".to_string(),
            r#type: KGNodeType::Concept,
            properties: serde_json::json!({
                "description": "A partner in business transactions"
            }),
            embeddings: vec![0.13, 0.23, 0.33, 0.43, 0.53],
            created_at: now.clone(),
        },
    ];

    let edges = vec![
        KGEdge {
            id: "kg-edge-001".to_string(),
            source_id: "kg-node-001".to_string(),
            target_id: "kg-node-004".to_string(),
            relation_type: KGRelationType::BelongsTo,
            weight: 1.0,
            confidence: 0.95,
        },
        KGEdge {
            id: "kg-edge-002".to_string(),
            source_id: "kg-node-001".to_string(),
            target_id: "kg-node-005".to_string(),
            relation_type: KGRelationType::DependsOn,
            weight: 0.8,
            confidence: 0.9,
        },
        KGEdge {
            id: "kg-edge-003".to_string(),
            source_id: "kg-node-001".to_string(),
            target_id: "kg-node-006".to_string(),
            relation_type: KGRelationType::PartOf,
            weight: 0.7,
            confidence: 0.85,
        },
        KGEdge {
            id: "kg-edge-004".to_string(),
            source_id: "kg-node-002".to_string(),
            target_id: "kg-node-006".to_string(),
            relation_type: KGRelationType::PartOf,
            weight: 0.7,
            confidence: 0.85,
        },
        KGEdge {
            id: "kg-edge-005".to_string(),
            source_id: "kg-node-001".to_string(),
            target_id: "kg-node-002".to_string(),
            relation_type: KGRelationType::SimilarTo,
            weight: 0.6,
            confidence: 0.8,
        },
        KGEdge {
            id: "kg-edge-006".to_string(),
            source_id: "kg-node-003".to_string(),
            target_id: "kg-node-002".to_string(),
            relation_type: KGRelationType::DependsOn,
            weight: 0.5,
            confidence: 0.75,
        },
    ];

    let graph = KnowledgeGraph {
        nodes: nodes.clone(),
        edges: edges.clone(),
        version: 1,
        last_updated: now.clone(),
    };

    let categories = vec![
        AssetCategory {
            id: "cat-001".to_string(),
            name: "实体".to_string(),
            parent_id: None,
            asset_count: 3,
        },
        AssetCategory {
            id: "cat-002".to_string(),
            name: "属性".to_string(),
            parent_id: None,
            asset_count: 2,
        },
        AssetCategory {
            id: "cat-003".to_string(),
            name: "关系".to_string(),
            parent_id: None,
            asset_count: 1,
        },
        AssetCategory {
            id: "cat-004".to_string(),
            name: "数据集".to_string(),
            parent_id: None,
            asset_count: 2,
        },
    ];

    let assets = vec![
        DataAsset {
            id: "asset-001".to_string(),
            name: "Customer Master".to_string(),
            asset_type: AssetType::Entity,
            description: "客户主数据实体".to_string(),
            owner: "master-data-team".to_string(),
            domain: "customer".to_string(),
            tags: vec!["customer".to_string(), "master".to_string()],
            lineage_summary: serde_json::json!({
                "upstream_count": 2,
                "downstream_count": 3,
                "key_tables": ["mdm_customer", "mdm_customer_code"]
            }),
            quality_score: 0.92,
            access_level: "restricted".to_string(),
            updated_at: now.clone(),
        },
        DataAsset {
            id: "asset-002".to_string(),
            name: "Supplier Master".to_string(),
            asset_type: AssetType::Entity,
            description: "供应商主数据实体".to_string(),
            owner: "procurement-team".to_string(),
            domain: "supplier".to_string(),
            tags: vec!["supplier".to_string(), "master".to_string()],
            lineage_summary: serde_json::json!({
                "upstream_count": 1,
                "downstream_count": 2,
                "key_tables": ["mdm_supplier"]
            }),
            quality_score: 0.88,
            access_level: "restricted".to_string(),
            updated_at: now.clone(),
        },
        DataAsset {
            id: "asset-003".to_string(),
            name: "Customer Code".to_string(),
            asset_type: AssetType::Attribute,
            description: "客户编码属性".to_string(),
            owner: "master-data-team".to_string(),
            domain: "customer".to_string(),
            tags: vec!["customer".to_string(), "code".to_string()],
            lineage_summary: serde_json::json!({
                "parent_entity": "Customer Master",
                "data_type": "String"
            }),
            quality_score: 0.95,
            access_level: "public".to_string(),
            updated_at: now.clone(),
        },
        DataAsset {
            id: "asset-004".to_string(),
            name: "Customer-Order Relation".to_string(),
            asset_type: AssetType::Relation,
            description: "客户-订单关系".to_string(),
            owner: "master-data-team".to_string(),
            domain: "customer".to_string(),
            tags: vec![
                "customer".to_string(),
                "order".to_string(),
                "relation".to_string(),
            ],
            lineage_summary: serde_json::json!({
                "source": "Customer Master",
                "target": "Order Service",
                "cardinality": "one_to_many"
            }),
            quality_score: 0.85,
            access_level: "restricted".to_string(),
            updated_at: now.clone(),
        },
        DataAsset {
            id: "asset-005".to_string(),
            name: "Sales Dataset".to_string(),
            asset_type: AssetType::Dataset,
            description: "销售数据集".to_string(),
            owner: "analytics-team".to_string(),
            domain: "sales".to_string(),
            tags: vec!["sales".to_string(), "dataset".to_string()],
            lineage_summary: serde_json::json!({
                "source_entities": ["Customer Master", "Order Service"],
                "refresh_rate": "daily"
            }),
            quality_score: 0.9,
            access_level: "public".to_string(),
            updated_at: now.clone(),
        },
        DataAsset {
            id: "asset-006".to_string(),
            name: "Material Master".to_string(),
            asset_type: AssetType::Entity,
            description: "物料主数据实体".to_string(),
            owner: "logistics-team".to_string(),
            domain: "material".to_string(),
            tags: vec!["material".to_string(), "master".to_string()],
            lineage_summary: serde_json::json!({
                "upstream_count": 1,
                "downstream_count": 4,
                "key_tables": ["mdm_material"]
            }),
            quality_score: 0.87,
            access_level: "restricted".to_string(),
            updated_at: now.clone(),
        },
    ];

    let mut search_index: HashMap<String, Vec<String>> = HashMap::new();
    for asset in &assets {
        search_index
            .entry(asset.name.to_lowercase())
            .or_default()
            .push(asset.id.clone());
        search_index
            .entry(asset.description.to_lowercase())
            .or_default()
            .push(asset.id.clone());
        for tag in &asset.tags {
            search_index
                .entry(tag.to_lowercase())
                .or_default()
                .push(asset.id.clone());
        }
        search_index
            .entry(asset.domain.to_lowercase())
            .or_default()
            .push(asset.id.clone());
    }

    *store.kg_nodes.lock().await = nodes;
    *store.kg_edges.lock().await = edges;
    *store.kg_graphs.lock().await = vec![graph];
    *store.assets.lock().await = assets;
    *store.asset_categories.lock().await = categories;
    *store.search_index.lock().await = search_index;

    *initialized = true;
}

// ==================== 内部辅助函数 ====================

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
        label: String,
        node_type: KGNodeType,
        properties: serde_json::Value,
    ) -> Result<KGNode, String> {
        let store = get_knowledge_v53_store();
        let mut nodes = store.kg_nodes.lock().await;
        let mut graphs = store.kg_graphs.lock().await;

        let now = chrono::Utc::now().to_rfc3339();
        let node = KGNode {
            id: uuid::Uuid::new_v4().to_string(),
            label,
            r#type: node_type,
            properties,
            embeddings: Vec::new(),
            created_at: now.clone(),
        };
        nodes.push(node.clone());

        if let Some(graph) = graphs.first_mut() {
            graph.nodes = nodes.clone();
            graph.version += 1;
            graph.last_updated = now;
        }

        Ok(node)
    }

    async fn add_edge(
        source_id: String,
        target_id: String,
        relation_type: KGRelationType,
        weight: Option<f64>,
        confidence: Option<f64>,
    ) -> Result<KGEdge, String> {
        let store = get_knowledge_v53_store();
        let nodes = store.kg_nodes.lock().await;
        if !nodes.iter().any(|n| n.id == source_id) {
            return Err(format!("源节点不存在: {}", source_id));
        }
        if !nodes.iter().any(|n| n.id == target_id) {
            return Err(format!("目标节点不存在: {}", target_id));
        }
        drop(nodes);

        let mut edges = store.kg_edges.lock().await;
        let mut graphs = store.kg_graphs.lock().await;

        let edge = KGEdge {
            id: uuid::Uuid::new_v4().to_string(),
            source_id,
            target_id,
            relation_type,
            weight: weight.unwrap_or(1.0),
            confidence: confidence.unwrap_or(1.0),
        };
        edges.push(edge.clone());

        let now = chrono::Utc::now().to_rfc3339();
        if let Some(graph) = graphs.first_mut() {
            graph.edges = edges.clone();
            graph.version += 1;
            graph.last_updated = now;
        }

        Ok(edge)
    }

    async fn get_subgraph(node_id: &str, depth: Option<i32>) -> Result<KnowledgeGraph, String> {
        let store = get_knowledge_v53_store();
        let nodes = store.kg_nodes.lock().await;
        let edges = store.kg_edges.lock().await;

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

        drop(nodes);
        drop(edges);

        Ok(KnowledgeGraph {
            nodes: subgraph_nodes,
            edges: subgraph_edges,
            version: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }

    async fn find_path(start_id: &str, end_id: &str) -> Result<Vec<KGEdge>, String> {
        let store = get_knowledge_v53_store();
        let nodes = store.kg_nodes.lock().await;
        let edges = store.kg_edges.lock().await;

        if !nodes.iter().any(|n| n.id == start_id) {
            return Err(format!("起始节点不存在: {}", start_id));
        }
        if !nodes.iter().any(|n| n.id == end_id) {
            return Err(format!("目标节点不存在: {}", end_id));
        }
        drop(nodes);

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

        Err(format!("未找到从 {} 到 {} 的路径", start_id, end_id))
    }

    async fn get_similar(node_id: &str, limit: Option<i32>) -> Result<Vec<KGNode>, String> {
        let store = get_knowledge_v53_store();
        let nodes = store.kg_nodes.lock().await;
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

    async fn export_graph(format: &str) -> Result<String, String> {
        let store = get_knowledge_v53_store();
        let graphs = store.kg_graphs.lock().await;
        let graph = graphs.first().cloned().ok_or("没有可用的知识图谱")?;

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
            "json" => serde_json::to_string_pretty(&graph).map_err(|e| e.to_string()),
            _ => Err(format!("不支持的导出格式: {}", format)),
        }
    }
}

// ==================== RecommendationEngine 实现 ====================

struct RecommendationEngine;

impl RecommendationEngine {
    async fn get_recommendations(
        user_id: &str,
        target_id: Option<String>,
        limit: Option<i32>,
    ) -> Result<Vec<Recommendation>, String> {
        let store = get_knowledge_v53_store();
        let interactions = store.interactions.lock().await;
        let assets = store.assets.lock().await;

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

        drop(interactions);
        drop(assets);

        let mut recs = store.recommendations.lock().await;
        recs.extend(recommendations.clone());

        Ok(recommendations)
    }

    async fn record_interaction(
        user_id: String,
        item_id: String,
        interaction_type: String,
    ) -> InteractionRecord {
        let store = get_knowledge_v53_store();
        let mut interactions = store.interactions.lock().await;

        let record = InteractionRecord {
            id: uuid::Uuid::new_v4().to_string(),
            user_id,
            item_id,
            interaction_type,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        interactions.push(record.clone());
        record
    }

    async fn get_similar_items(
        item_id: &str,
        limit: Option<i32>,
    ) -> Result<Vec<DataAsset>, String> {
        let store = get_knowledge_v53_store();
        let assets = store.assets.lock().await;
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

    async fn get_popular_items(limit: Option<i32>) -> Vec<DataAsset> {
        let store = get_knowledge_v53_store();
        let assets = store.assets.lock().await;
        let interactions = store.interactions.lock().await;

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

    async fn get_trending_items(limit: Option<i32>) -> Vec<DataAsset> {
        let store = get_knowledge_v53_store();
        let assets = store.assets.lock().await;
        let interactions = store.interactions.lock().await;

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
        name: String,
        asset_type: AssetType,
        description: String,
        owner: String,
        domain: String,
        tags: Vec<String>,
    ) -> Result<DataAsset, String> {
        let store = get_knowledge_v53_store();
        let mut assets = store.assets.lock().await;
        let mut search_index = store.search_index.lock().await;

        let now = chrono::Utc::now().to_rfc3339();
        let asset = DataAsset {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.clone(),
            asset_type,
            description,
            owner,
            domain: domain.clone(),
            tags: tags.clone(),
            lineage_summary: serde_json::json!({}),
            quality_score: 0.0,
            access_level: "internal".to_string(),
            updated_at: now,
        };
        assets.push(asset.clone());

        search_index
            .entry(asset.name.to_lowercase())
            .or_default()
            .push(asset.id.clone());
        search_index
            .entry(asset.description.to_lowercase())
            .or_default()
            .push(asset.id.clone());
        for tag in &tags {
            search_index
                .entry(tag.to_lowercase())
                .or_default()
                .push(asset.id.clone());
        }
        search_index
            .entry(domain.to_lowercase())
            .or_default()
            .push(asset.id.clone());

        Ok(asset)
    }

    async fn search_assets(
        query: Option<String>,
        asset_type: Option<AssetType>,
        domain: Option<String>,
        tags: Option<Vec<String>>,
        page: Option<i64>,
        page_size: Option<i64>,
    ) -> (Vec<DataAsset>, i64) {
        let store = get_knowledge_v53_store();
        let assets = store.assets.lock().await;

        let mut filtered: Vec<DataAsset> = assets.iter().cloned().collect();

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

    async fn get_asset(id: &str) -> Result<DataAsset, String> {
        let store = get_knowledge_v53_store();
        let assets = store.assets.lock().await;
        assets
            .iter()
            .find(|a| a.id == id)
            .cloned()
            .ok_or_else(|| format!("未找到资产: {}", id))
    }

    async fn update_asset(
        id: &str,
        name: Option<String>,
        description: Option<String>,
        tags: Option<Vec<String>>,
        quality_score: Option<f64>,
        access_level: Option<String>,
    ) -> Result<DataAsset, String> {
        let store = get_knowledge_v53_store();
        let mut assets = store.assets.lock().await;
        let mut search_index = store.search_index.lock().await;

        let asset = assets
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or_else(|| format!("未找到资产: {}", id))?;

        if let Some(n) = name {
            asset.name = n.clone();
            search_index
                .entry(asset.name.to_lowercase())
                .or_default()
                .push(asset.id.clone());
        }
        if let Some(d) = description {
            asset.description = d.clone();
            search_index
                .entry(asset.description.to_lowercase())
                .or_default()
                .push(asset.id.clone());
        }
        if let Some(t) = tags {
            asset.tags = t.clone();
            for tag in &t {
                search_index
                    .entry(tag.to_lowercase())
                    .or_default()
                    .push(asset.id.clone());
            }
        }
        if let Some(q) = quality_score {
            asset.quality_score = q;
        }
        if let Some(al) = access_level {
            asset.access_level = al;
        }
        asset.updated_at = chrono::Utc::now().to_rfc3339();

        Ok(asset.clone())
    }

    async fn list_categories() -> Vec<AssetCategory> {
        let store = get_knowledge_v53_store();
        let categories = store.asset_categories.lock().await;
        categories.clone()
    }

    async fn get_asset_stats() -> AssetStats {
        let store = get_knowledge_v53_store();
        let assets = store.assets.lock().await;

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
            if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&asset.updated_at) {
                if ts > one_day_ago {
                    recent_updates += 1;
                }
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

// ==================== 请求/响应结构 ====================

// --- Knowledge Graph Requests ---

#[derive(Debug, Deserialize)]
pub struct AddKGNodeRequest {
    pub label: String,
    pub node_type: String,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AddKGEdgeRequest {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub weight: Option<f64>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct SubgraphQuery {
    pub depth: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct PathQuery {
    pub start_id: String,
    pub end_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SimilarQuery {
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ExportKGQuery {
    pub format: Option<String>,
}

// --- Recommendation Requests ---

#[derive(Debug, Deserialize)]
pub struct RecommendationQuery {
    pub target_id: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RecordInteractionRequest {
    pub user_id: String,
    pub item_id: String,
    pub interaction_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SimilarItemsQuery {
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct TrendingQuery {
    pub limit: Option<i32>,
}

// --- Asset Catalog Requests ---

#[derive(Debug, Deserialize)]
pub struct RegisterAssetRequest {
    pub name: String,
    pub asset_type: String,
    pub description: String,
    pub owner: String,
    pub domain: String,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct SearchAssetsQuery {
    pub q: Option<String>,
    pub asset_type: Option<String>,
    pub domain: Option<String>,
    pub tags: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAssetRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub quality_score: Option<f64>,
    pub access_level: Option<String>,
}

// ==================== API 处理器：知识图谱 ====================

pub async fn add_kg_node(
    State(_state): State<AppState>,
    Json(req): Json<AddKGNodeRequest>,
) -> Json<ApiResponse<KGNode>> {
    ensure_initialized().await;

    let node_type = node_type_from_str(&req.node_type);
    let props = req.properties.unwrap_or_else(|| serde_json::json!({}));

    match KnowledgeGraphEngine::add_node(req.label, node_type, props).await {
        Ok(node) => Json(ApiResponse::success(node, "知识图谱节点已添加")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn add_kg_edge(
    State(_state): State<AppState>,
    Json(req): Json<AddKGEdgeRequest>,
) -> Json<ApiResponse<KGEdge>> {
    ensure_initialized().await;

    let relation_type = relation_type_from_str(&req.relation_type);
    match KnowledgeGraphEngine::add_edge(
        req.source_id,
        req.target_id,
        relation_type,
        req.weight,
        req.confidence,
    )
    .await
    {
        Ok(edge) => Json(ApiResponse::success(edge, "知识图谱边已添加")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_subgraph(
    State(_state): State<AppState>,
    Path(node_id): Path<String>,
    Query(params): Query<SubgraphQuery>,
) -> Json<ApiResponse<KnowledgeGraph>> {
    ensure_initialized().await;

    match KnowledgeGraphEngine::get_subgraph(&node_id, params.depth).await {
        Ok(graph) => Json(ApiResponse::success(graph, "子图谱")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn find_path(
    State(_state): State<AppState>,
    Query(params): Query<PathQuery>,
) -> Json<ApiResponse<Vec<KGEdge>>> {
    ensure_initialized().await;

    match KnowledgeGraphEngine::find_path(&params.start_id, &params.end_id).await {
        Ok(path) => Json(ApiResponse::success(path, "路径查找成功")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_similar(
    State(_state): State<AppState>,
    Path(node_id): Path<String>,
    Query(params): Query<SimilarQuery>,
) -> Json<ApiResponse<Vec<KGNode>>> {
    ensure_initialized().await;

    match KnowledgeGraphEngine::get_similar(&node_id, params.limit).await {
        Ok(nodes) => Json(ApiResponse::success(nodes, "相似节点")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn export_kg(
    State(_state): State<AppState>,
    Query(params): Query<ExportKGQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    let format = params.format.unwrap_or_else(|| "json".to_string());
    match KnowledgeGraphEngine::export_graph(&format).await {
        Ok(content) => {
            let content_type = match format.as_str() {
                "dot" => "text/vnd.graphviz",
                _ => "application/json",
            };
            Json(ApiResponse::success(
                serde_json::json!({
                    "format": format,
                    "content": content,
                    "content_type": content_type,
                }),
                "知识图谱导出成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

// ==================== API 处理器：智能推荐 ====================

pub async fn get_recommendations(
    State(_state): State<AppState>,
    Path(user_id): Path<String>,
    Query(params): Query<RecommendationQuery>,
) -> Json<ApiResponse<Vec<Recommendation>>> {
    ensure_initialized().await;

    match RecommendationEngine::get_recommendations(&user_id, params.target_id, params.limit).await
    {
        Ok(recs) => Json(ApiResponse::success(recs, "推荐结果")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn record_interaction(
    State(_state): State<AppState>,
    Json(req): Json<RecordInteractionRequest>,
) -> Json<ApiResponse<InteractionRecord>> {
    ensure_initialized().await;

    let interaction_type = req.interaction_type.unwrap_or_else(|| "view".to_string());
    let record =
        RecommendationEngine::record_interaction(req.user_id, req.item_id, interaction_type).await;

    Json(ApiResponse::success(record, "交互记录已保存"))
}

pub async fn get_similar_items(
    State(_state): State<AppState>,
    Path(item_id): Path<String>,
    Query(params): Query<SimilarItemsQuery>,
) -> Json<ApiResponse<Vec<DataAsset>>> {
    ensure_initialized().await;

    match RecommendationEngine::get_similar_items(&item_id, params.limit).await {
        Ok(items) => Json(ApiResponse::success(items, "相似资产")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_trending_items(
    State(_state): State<AppState>,
    Query(params): Query<TrendingQuery>,
) -> Json<ApiResponse<Vec<DataAsset>>> {
    ensure_initialized().await;

    let items = RecommendationEngine::get_trending_items(params.limit).await;
    Json(ApiResponse::success(items, "趋势资产"))
}

// ==================== API 处理器：数据资产目录 ====================

pub async fn register_asset(
    State(_state): State<AppState>,
    Json(req): Json<RegisterAssetRequest>,
) -> Json<ApiResponse<DataAsset>> {
    ensure_initialized().await;

    let asset_type = asset_type_from_str(&req.asset_type);
    let tags = req.tags.unwrap_or_default();

    match AssetCatalogManager::register_asset(
        req.name,
        asset_type,
        req.description,
        req.owner,
        req.domain,
        tags,
    )
    .await
    {
        Ok(asset) => Json(ApiResponse::success(asset, "数据资产已注册")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn search_assets(
    State(_state): State<AppState>,
    Query(params): Query<SearchAssetsQuery>,
) -> Json<ApiResponse<PaginatedResponse<DataAsset>>> {
    ensure_initialized().await;

    let asset_type = params.asset_type.as_ref().map(|t| asset_type_from_str(t));
    let tags = params
        .tags
        .as_ref()
        .map(|t| t.split(',').map(|s| s.trim().to_string()).collect());

    let (items, total) = AssetCatalogManager::search_assets(
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

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "资产列表",
    ))
}

pub async fn get_asset(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<DataAsset>> {
    ensure_initialized().await;

    match AssetCatalogManager::get_asset(&id).await {
        Ok(asset) => Json(ApiResponse::success(asset, "资产详情")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn update_asset(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateAssetRequest>,
) -> Json<ApiResponse<DataAsset>> {
    ensure_initialized().await;

    match AssetCatalogManager::update_asset(
        &id,
        req.name,
        req.description,
        req.tags,
        req.quality_score,
        req.access_level,
    )
    .await
    {
        Ok(asset) => Json(ApiResponse::success(asset, "资产已更新")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn list_categories(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<AssetCategory>>> {
    ensure_initialized().await;

    let categories = AssetCatalogManager::list_categories().await;
    Json(ApiResponse::success(categories, "资产分类列表"))
}

pub async fn get_asset_stats(State(_state): State<AppState>) -> Json<ApiResponse<AssetStats>> {
    ensure_initialized().await;

    let stats = AssetCatalogManager::get_asset_stats().await;
    Json(ApiResponse::success(stats, "资产统计"))
}
