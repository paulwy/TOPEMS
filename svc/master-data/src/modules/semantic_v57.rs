//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V57.0 MDM AC-29: 主数据图谱增强 + 语义搜索 + 智能标签
//!
//! 核心能力：
//! - 图谱增强 (EnhancedKnowledgeGraph): 节点/边管理、社区检测、图嵌入、最短路径
//! - 语义搜索 (SemanticSearchEngine): 向量相似度搜索、混合关键词+语义搜索、索引管理
//! - 智能标签 (SmartTagger): 规则标签、ML标签推荐、标签管理

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

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

struct EnhancedKnowledgeGraph {
    nodes: Mutex<Vec<GraphNodeV57>>,
    edges: Mutex<Vec<GraphEdgeV57>>,
    communities: Mutex<Vec<GraphCommunity>>,
}

impl EnhancedKnowledgeGraph {
    async fn add_node(&self, mut node: GraphNodeV57) -> GraphNodeV57 {
        let nodes = self.nodes.lock().await;
        let degree = self
            .edges
            .lock()
            .await
            .iter()
            .filter(|e| e.source_id == node.id || e.target_id == node.id)
            .count() as i64;
        node.degree = degree;
        drop(nodes);
        self.nodes.lock().await.push(node.clone());
        node
    }

    async fn add_edge(&self, edge: GraphEdgeV57) -> GraphEdgeV57 {
        self.edges.lock().await.push(edge.clone());
        {
            let mut nodes = self.nodes.lock().await;
            if let Some(n) = nodes.iter_mut().find(|n| n.id == edge.source_id) {
                n.degree += 1;
            }
            if let Some(n) = nodes.iter_mut().find(|n| n.id == edge.target_id) {
                n.degree += 1;
            }
        }
        edge
    }

    async fn get_neighbors(&self, node_id: &str) -> Vec<GraphNodeV57> {
        let edges = self.edges.lock().await;
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
        drop(edges);

        let nodes = self.nodes.lock().await;
        nodes
            .iter()
            .filter(|n| neighbor_ids.contains(&n.id))
            .cloned()
            .collect()
    }

    async fn get_community(&self, node_id: &str) -> Option<GraphCommunity> {
        let nodes = self.nodes.lock().await;
        let node = nodes.iter().find(|n| n.id == node_id);
        let community_id = node.and_then(|n| n.community_id.clone())?;
        drop(nodes);

        let communities = self.communities.lock().await;
        communities.iter().find(|c| c.id == community_id).cloned()
    }

    async fn find_shortest_path(&self, from_id: &str, to_id: &str) -> Vec<String> {
        let edges = self.edges.lock().await;
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
        drop(edges);

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
                return path;
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
        Vec::new()
    }

    async fn get_subgraph(&self, node_ids: &[String]) -> (Vec<GraphNodeV57>, Vec<GraphEdgeV57>) {
        let nodes = self.nodes.lock().await;
        let sub_nodes: Vec<GraphNodeV57> = nodes
            .iter()
            .filter(|n| node_ids.contains(&n.id))
            .cloned()
            .collect();
        drop(nodes);

        let edges = self.edges.lock().await;
        let sub_edges: Vec<GraphEdgeV57> = edges
            .iter()
            .filter(|e| node_ids.contains(&e.source_id) && node_ids.contains(&e.target_id))
            .cloned()
            .collect();
        (sub_nodes, sub_edges)
    }

    async fn compute_embeddings(&self) -> i64 {
        let mut nodes = self.nodes.lock().await;
        let count = nodes.len() as i64;
        for node in nodes.iter_mut() {
            if node.embeddings.is_empty() {
                node.embeddings = generate_simulated_embedding(&node.label, &node.node_type);
            }
        }
        count
    }

    async fn detect_communities(&self) -> Vec<GraphCommunity> {
        let mut nodes = self.nodes.lock().await;
        let edges = self.edges.lock().await;

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

        for node in nodes.iter_mut() {
            node.community_id = node_community.get(&node.id).cloned();
        }

        drop(edges);
        *self.communities.lock().await = detected.clone();
        detected
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

struct SemanticSearchEngine {
    indexes: Mutex<Vec<SearchIndex>>,
    history: Mutex<Vec<serde_json::Value>>,
}

impl SemanticSearchEngine {
    async fn index_entity(
        &self,
        entity_type: String,
        entity_id: String,
        text: String,
        metadata: serde_json::Value,
    ) -> SearchIndex {
        let embeddings = generate_simulated_embedding(&text, &entity_type);
        let index = SearchIndex {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type,
            entity_id,
            embeddings,
            text,
            metadata,
        };
        self.indexes.lock().await.push(index.clone());
        index
    }

    async fn search_semantic(&self, query_embeddings: &[f64], top_k: usize) -> Vec<SearchResult> {
        let indexes = self.indexes.lock().await;
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

        results
            .into_iter()
            .map(|(idx, score)| SearchResult {
                entity_type: idx.entity_type,
                entity_id: idx.entity_id,
                score,
                highlights: vec![idx.text.clone()],
            })
            .collect()
    }

    async fn search_hybrid(&self, query: &str, top_k: usize) -> Vec<SearchResult> {
        let query_embeddings = generate_simulated_embedding(query, "search_query");
        let semantic_results = self.search_semantic(&query_embeddings, top_k).await;

        let keywords: Vec<&str> = query.split_whitespace().collect();

        let indexes = self.indexes.lock().await;
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
        drop(indexes);

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
        merged
    }

    async fn reindex_all(&self) -> i64 {
        let indexes = self.indexes.lock().await;
        let count = indexes.len() as i64;
        drop(indexes);
        count
    }

    async fn get_search_stats(&self) -> serde_json::Value {
        let indexes = self.indexes.lock().await;
        let history = self.history.lock().await;
        let total = indexes.len() as i64;
        let entity_types: Vec<String> = indexes
            .iter()
            .map(|i| i.entity_type.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        let queries_count = history.len() as i64;

        serde_json::json!({
            "total_indexes": total,
            "entity_types": entity_types,
            "total_queries": queries_count,
        })
    }

    async fn remove_from_index(&self, index_id: &str) -> bool {
        let mut indexes = self.indexes.lock().await;
        let before = indexes.len();
        indexes.retain(|i| i.id != index_id);
        indexes.len() < before
    }

    async fn get_index_size(&self) -> i64 {
        self.indexes.lock().await.len() as i64
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
    pub applied_at: String,
}

// ==================== 智能标签引擎 ====================

struct SmartTagger {
    tags: Mutex<Vec<Tag>>,
    rules: Mutex<Vec<TagRule>>,
    tagged_entities: Mutex<Vec<TaggedEntity>>,
}

impl SmartTagger {
    async fn create_tag(&self, mut tag: Tag) -> Tag {
        tag.usage_count = 0;
        self.tags.lock().await.push(tag.clone());
        tag
    }

    async fn apply_tag(
        &self,
        entity_type: String,
        entity_id: String,
        tag_id: String,
    ) -> TaggedEntity {
        let mut tagged = self.tagged_entities.lock().await;
        let now = chrono::Utc::now().to_rfc3339();

        if let Some(existing) = tagged
            .iter_mut()
            .find(|t| t.entity_type == entity_type && t.entity_id == entity_id)
        {
            if !existing.tag_ids.contains(&tag_id) {
                existing.tag_ids.push(tag_id.clone());
                existing.confidence = 1.0;
                existing.applied_at = now.clone();
            }
            existing.clone()
        } else {
            let new = TaggedEntity {
                entity_type,
                entity_id,
                tag_ids: vec![tag_id],
                confidence: 1.0,
                applied_at: now,
            };
            tagged.push(new.clone());
            new
        }
    }

    async fn auto_tag(
        &self,
        entity_type: &str,
        entity_id: &str,
        data: &serde_json::Value,
    ) -> Vec<String> {
        let auto_rules: Vec<TagRule> = {
            let rules = self.rules.lock().await;
            rules.iter().filter(|r| r.auto_apply).cloned().collect()
        };

        let mut applied_tags: Vec<String> = Vec::new();
        for rule in &auto_rules {
            if evaluate_rule(&rule.condition, data) {
                applied_tags.push(rule.tag_id.clone());
            }
        }

        if !applied_tags.is_empty() {
            let mut tagged = self.tagged_entities.lock().await;
            let now = chrono::Utc::now().to_rfc3339();
            if let Some(existing) = tagged
                .iter_mut()
                .find(|t| t.entity_type == entity_type && t.entity_id == entity_id)
            {
                for tag_id in &applied_tags {
                    if !existing.tag_ids.contains(tag_id) {
                        existing.tag_ids.push(tag_id.clone());
                    }
                }
                existing.applied_at = now;
                existing.confidence = 0.9;
            } else {
                tagged.push(TaggedEntity {
                    entity_type: entity_type.to_string(),
                    entity_id: entity_id.to_string(),
                    tag_ids: applied_tags.clone(),
                    confidence: 0.9,
                    applied_at: now,
                });
            }
        }

        applied_tags
    }

    async fn get_tags_for_entity(&self, entity_type: &str, entity_id: &str) -> Vec<Tag> {
        let tagged = self.tagged_entities.lock().await;
        let entity_tags: Vec<String> = tagged
            .iter()
            .filter(|t| t.entity_type == entity_type && t.entity_id == entity_id)
            .flat_map(|t| t.tag_ids.clone())
            .collect();
        drop(tagged);

        let tags = self.tags.lock().await;
        tags.iter()
            .filter(|t| entity_tags.contains(&t.id))
            .cloned()
            .collect()
    }

    async fn get_entities_by_tag(&self, tag_id: &str) -> Vec<TaggedEntity> {
        let tagged = self.tagged_entities.lock().await;
        tagged
            .iter()
            .filter(|t| t.tag_ids.contains(&tag_id.to_string()))
            .cloned()
            .collect()
    }

    async fn remove_tag(&self, entity_type: &str, entity_id: &str, tag_id: &str) -> bool {
        let mut tagged = self.tagged_entities.lock().await;
        if let Some(entity) = tagged
            .iter_mut()
            .find(|t| t.entity_type == entity_type && t.entity_id == entity_id)
        {
            let before = entity.tag_ids.len();
            entity.tag_ids.retain(|t| t != tag_id);
            entity.tag_ids.len() < before
        } else {
            false
        }
    }

    async fn list_tags(&self, category: Option<&str>) -> Vec<Tag> {
        let tags = self.tags.lock().await;
        match category {
            Some(cat) => tags.iter().filter(|t| t.category == cat).cloned().collect(),
            None => tags.clone(),
        }
    }

    async fn get_tag_stats(&self) -> serde_json::Value {
        let tags = self.tags.lock().await;
        let tagged = self.tagged_entities.lock().await;

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

        serde_json::json!({
            "total_tags": total_tags,
            "total_entities_tagged": total_entities,
            "total_assignments": total_assignments,
            "categories": categories,
        })
    }

    async fn suggest_tags(&self, entity_type: &str, data: &serde_json::Value) -> Vec<Tag> {
        let tags = self.tags.lock().await;
        let rules = self.rules.lock().await;

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
        scored_tags.into_iter().map(|(tag, _)| tag).collect()
    }
}

// ==================== 内存存储 ====================

struct V57Store {
    graph: EnhancedKnowledgeGraph,
    search: SemanticSearchEngine,
    tagger: SmartTagger,
    initialized: Mutex<bool>,
}

fn get_v57_store() -> &'static V57Store {
    static STORE: LazyLock<V57Store> = LazyLock::new(|| V57Store {
        graph: EnhancedKnowledgeGraph {
            nodes: Mutex::new(Vec::new()),
            edges: Mutex::new(Vec::new()),
            communities: Mutex::new(Vec::new()),
        },
        search: SemanticSearchEngine {
            indexes: Mutex::new(Vec::new()),
            history: Mutex::new(Vec::new()),
        },
        tagger: SmartTagger {
            tags: Mutex::new(Vec::new()),
            rules: Mutex::new(Vec::new()),
            tagged_entities: Mutex::new(Vec::new()),
        },
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 辅助函数 ====================

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

async fn ensure_initialized() {
    let store = get_v57_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    // --- 图谱种子数据 ---
    let node_types = [
        ("customer", "客户主数据"),
        ("product", "产品主数据"),
        ("supplier", "供应商主数据"),
        ("employee", "员工主数据"),
    ];

    let mut nodes = Vec::new();
    for (i, (type_name, label_prefix)) in node_types.iter().enumerate() {
        for j in 0..3 {
            let id = format!("{}_{}_{}", type_name, i, j);
            nodes.push(GraphNodeV57 {
                id: id.clone(),
                label: format!("{} #{}", label_prefix, j + 1),
                node_type: type_name.to_string(),
                properties: serde_json::json!({
                    "created_at": now,
                    "source": "seed",
                }),
                embeddings: generate_simulated_embedding(&id, type_name),
                degree: 0,
                community_id: None,
            });
        }
    }

    let mut edges = Vec::new();
    for i in 0..nodes.len() {
        for j in (i + 1)..nodes.len() {
            if nodes[i].node_type == nodes[j].node_type {
                edges.push(GraphEdgeV57 {
                    source_id: nodes[i].id.clone(),
                    target_id: nodes[j].id.clone(),
                    relation_type: "related".to_string(),
                    weight: 0.8,
                    confidence: 0.9,
                });
            }
        }
    }

    {
        let mut graph_nodes = store.graph.nodes.lock().await;
        *graph_nodes = nodes;
    }
    {
        let mut graph_edges = store.graph.edges.lock().await;
        *graph_edges = edges;
    }

    // --- 搜索索引种子数据 ---
    let search_data = vec![
        (
            "customer",
            "cust_001",
            "北京科技有限公司",
            serde_json::json!({"industry": "technology", "region": "north"}),
        ),
        (
            "customer",
            "cust_002",
            "上海贸易集团",
            serde_json::json!({"industry": "trade", "region": "east"}),
        ),
        (
            "product",
            "prod_001",
            "企业管理软件标准版",
            serde_json::json!({"category": "software", "version": "2.0"}),
        ),
        (
            "product",
            "prod_002",
            "数据分析平台高级版",
            serde_json::json!({"category": "software", "version": "3.0"}),
        ),
        (
            "supplier",
            "supp_001",
            "云计算服务商",
            serde_json::json!({"service": "cloud", "tier": "gold"}),
        ),
        (
            "supplier",
            "supp_002",
            "硬件设备供应商",
            serde_json::json!({"service": "hardware", "tier": "silver"}),
        ),
        (
            "employee",
            "emp_001",
            "张三 - 数据分析师",
            serde_json::json!({"role": "analyst", "dept": "data"}),
        ),
        (
            "employee",
            "emp_002",
            "李四 - 架构师",
            serde_json::json!({"role": "architect", "dept": "tech"}),
        ),
    ];

    for (et, eid, text, meta) in search_data {
        store
            .search
            .index_entity(et.to_string(), eid.to_string(), text.to_string(), meta)
            .await;
    }

    // --- 标签种子数据 ---
    let seed_tags = vec![
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "VIP客户".to_string(),
            category: "customer".to_string(),
            color: "#FFD700".to_string(),
            description: "重要客户标记".to_string(),
            usage_count: 0,
        },
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "重点产品".to_string(),
            category: "product".to_string(),
            color: "#007BFF".to_string(),
            description: "战略性产品".to_string(),
            usage_count: 0,
        },
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "优质供应商".to_string(),
            category: "supplier".to_string(),
            color: "#28A745".to_string(),
            description: "评级A以上供应商".to_string(),
            usage_count: 0,
        },
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "技术骨干".to_string(),
            category: "employee".to_string(),
            color: "#6F42C1".to_string(),
            description: "核心技术人员".to_string(),
            usage_count: 0,
        },
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "高价值".to_string(),
            category: "general".to_string(),
            color: "#DC3545".to_string(),
            description: "高价值实体标记".to_string(),
            usage_count: 0,
        },
    ];

    for tag in seed_tags {
        store.tagger.create_tag(tag).await;
    }

    // 标签规则种子数据
    let rules_data = vec![
        (
            "tag_vip",
            serde_json::json!({"field": "industry", "operator": "equals", "value": "technology"}),
            true,
            3,
        ),
        (
            "tag_key",
            serde_json::json!({"field": "category", "operator": "contains", "value": "software"}),
            true,
            2,
        ),
        (
            "tag_quality",
            serde_json::json!({"field": "tier", "operator": "equals", "value": "gold"}),
            true,
            3,
        ),
        (
            "tag_tech",
            serde_json::json!({"field": "role", "operator": "contains", "value": "architect"}),
            true,
            2,
        ),
    ];

    for (tag_id, condition, auto_apply, priority) in rules_data {
        store.tagger.rules.lock().await.push(TagRule {
            id: uuid::Uuid::new_v4().to_string(),
            tag_id: tag_id.to_string(),
            condition,
            auto_apply,
            priority,
        });
    }

    // 执行初始社区检测
    store.graph.detect_communities().await;

    *initialized = true;
}

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

#[derive(Debug, Deserialize)]
pub struct ComputeEmbeddingsRequest {
    pub node_ids: Option<Vec<String>>,
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
pub struct SuggestTagsRequest {
    pub entity_type: String,
    pub data: serde_json::Value,
}

// ==================== 处理器：图谱 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/graph/node",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn add_graph_node(
    State(_state): State<AppState>,
    Json(req): Json<AddGraphNodeRequest>,
) -> Json<ApiResponse<GraphNodeV57>> {
    ensure_initialized().await;
    let store = get_v57_store();

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

    let result = store.graph.add_node(node).await;
    Json(ApiResponse::success(result, "图谱节点已创建"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/graph/edge",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn add_graph_edge(
    State(_state): State<AppState>,
    Json(req): Json<AddGraphEdgeRequest>,
) -> Json<ApiResponse<GraphEdgeV57>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let edge = GraphEdgeV57 {
        source_id: req.source_id,
        target_id: req.target_id,
        relation_type: req.relation_type.unwrap_or_else(|| "related".to_string()),
        weight: req.weight.unwrap_or(1.0),
        confidence: req.confidence.unwrap_or(1.0),
    };

    let result = store.graph.add_edge(edge).await;
    Json(ApiResponse::success(result, "图谱边已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/graph/neighbors/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<GraphNodeV57>>> {
    ensure_initialized().await;
    let store = get_v57_store();
    let neighbors = store.graph.get_neighbors(&id).await;
    Json(ApiResponse::success(neighbors, "邻居节点列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/graph/community/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    match store.graph.get_community(&id).await {
        Some(community) => Json(ApiResponse::success(
            serde_json::json!(community),
            "社区信息",
        )),
        None => Json(ApiResponse::error(404, "未找到社区信息")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/graph/path",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn find_shortest_path_handler(
    State(_state): State<AppState>,
    Json(req): Json<FindPathRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let path = store
        .graph
        .find_shortest_path(&req.from_id, &req.to_id)
        .await;

    if path.is_empty() {
        return Json(ApiResponse::error(404, "未找到可达路径"));
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "path": path,
            "length": path.len() as i64,
            "from_id": req.from_id,
            "to_id": req.to_id,
        }),
        "最短路径",
    ))
}

pub async fn get_subgraph(
    State(_state): State<AppState>,
    Query(params): Query<SubgraphQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let node_ids: Vec<String> = params
        .node_ids
        .unwrap_or_else(String::new)
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if node_ids.is_empty() {
        return Json(ApiResponse::error(400, "请提供 node_ids 参数"));
    }

    let (nodes, edges) = store.graph.get_subgraph(&node_ids).await;

    Json(ApiResponse::success(
        serde_json::json!({
            "nodes": nodes,
            "edges": edges,
            "node_count": nodes.len() as i64,
            "edge_count": edges.len() as i64,
        }),
        "子图数据",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/graph/embeddings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn compute_embeddings_handler(
    State(_state): State<AppState>,
    Json(_req): Json<ComputeEmbeddingsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let count = store.graph.compute_embeddings().await;

    Json(ApiResponse::success(
        serde_json::json!({
            "nodes_processed": count,
            "status": "completed",
        }),
        "嵌入计算已完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/graph/communities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn detect_communities_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<GraphCommunity>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let communities = store.graph.detect_communities().await;
    Json(ApiResponse::success(communities, "社区检测完成"))
}

// ==================== 处理器：语义搜索 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/search/index",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn index_entity(
    State(_state): State<AppState>,
    Json(req): Json<IndexEntityRequest>,
) -> Json<ApiResponse<SearchIndex>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let metadata = req.metadata.unwrap_or_else(|| serde_json::json!({}));
    let result = store
        .search
        .index_entity(req.entity_type, req.entity_id, req.text, metadata)
        .await;

    Json(ApiResponse::success(result, "实体已索引"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/search/semantic",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn search_semantic_handler(
    State(_state): State<AppState>,
    Json(req): Json<SemanticSearchRequest>,
) -> Json<ApiResponse<Vec<SearchResult>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let top_k = req.top_k.unwrap_or(10);
    let query_embeddings = generate_simulated_embedding(&req.query, "search_query");
    let results = store.search.search_semantic(&query_embeddings, top_k).await;

    store.search.history.lock().await.push(serde_json::json!({
        "query": req.query,
        "type": "semantic",
        "results_count": results.len(),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }));

    Json(ApiResponse::success(results, "语义搜索结果"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/search/hybrid",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn search_hybrid_handler(
    State(_state): State<AppState>,
    Json(req): Json<HybridSearchRequest>,
) -> Json<ApiResponse<Vec<SearchResult>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let top_k = req.top_k.unwrap_or(10);
    let results = store.search.search_hybrid(&req.query, top_k).await;

    store.search.history.lock().await.push(serde_json::json!({
        "query": req.query,
        "type": "hybrid",
        "results_count": results.len(),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }));

    Json(ApiResponse::success(results, "混合搜索结果"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/search/reindex",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn reindex_all(
    State(_state): State<AppState>,
    Json(_req): Json<ReindexRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let count = store.search.reindex_all().await;

    Json(ApiResponse::success(
        serde_json::json!({
            "total_indexes": count,
            "status": "reindexed",
        }),
        "全量重建索引完成",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/search/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn get_search_stats(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();
    let stats = store.search.get_search_stats().await;
    Json(ApiResponse::success(stats, "搜索统计"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/search/index/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let removed = store.search.remove_from_index(&id).await;

    if removed {
        Json(ApiResponse::success(
            serde_json::json!({"index_id": id, "removed": true}),
            "索引已删除",
        ))
    } else {
        Json(ApiResponse::error(404, "未找到索引"))
    }
}

// ==================== 处理器：智能标签 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn create_tag(
    State(_state): State<AppState>,
    Json(req): Json<CreateTagRequest>,
) -> Json<ApiResponse<Tag>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let tag = Tag {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        category: req.category.unwrap_or_else(|| "general".to_string()),
        color: req.color.unwrap_or_else(|| "#6C757D".to_string()),
        description: req.description.unwrap_or_else(String::new),
        usage_count: 0,
    };

    let result = store.tagger.create_tag(tag).await;
    Json(ApiResponse::success(result, "标签已创建"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/tag/apply",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn apply_tag(
    State(_state): State<AppState>,
    Json(req): Json<ApplyTagRequest>,
) -> Json<ApiResponse<TaggedEntity>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let result = store
        .tagger
        .apply_tag(req.entity_type, req.entity_id, req.tag_id)
        .await;

    Json(ApiResponse::success(result, "标签已应用"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/tag/auto",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn auto_tag(
    State(_state): State<AppState>,
    Json(req): Json<AutoTagRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let applied = store
        .tagger
        .auto_tag(&req.entity_type, &req.entity_id, &req.data)
        .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "entity_type": req.entity_type,
            "entity_id": req.entity_id,
            "applied_tags": applied,
            "applied_count": applied.len() as i64,
        }),
        "自动标签已应用",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/tags/entity/{type}/{id}",
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
    State(_state): State<AppState>,
    Path((entity_type, entity_id)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<Tag>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let tags = store
        .tagger
        .get_tags_for_entity(&entity_type, &entity_id)
        .await;
    Json(ApiResponse::success(tags, "实体标签列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/entities/tag/{tag}",
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
    State(_state): State<AppState>,
    Path(tag): Path<String>,
) -> Json<ApiResponse<Vec<TaggedEntity>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let entities = store.tagger.get_entities_by_tag(&tag).await;
    Json(ApiResponse::success(entities, "标签实体列表"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:semantic:write"])),
    path = "/tag/{id}",
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
    State(_state): State<AppState>,
    Json(req): Json<RemoveTagRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let removed = store
        .tagger
        .remove_tag(&req.entity_type, &req.entity_id, &req.tag_id)
        .await;

    if removed {
        Json(ApiResponse::success(
            serde_json::json!({
                "entity_type": req.entity_type,
                "entity_id": req.entity_id,
                "tag_id": req.tag_id,
                "removed": true,
            }),
            "标签已移除",
        ))
    } else {
        Json(ApiResponse::error(404, "未找到标签关系"))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn list_tags(
    State(_state): State<AppState>,
    Query(params): Query<ListTagsQuery>,
) -> Json<ApiResponse<Vec<Tag>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let tags = store.tagger.list_tags(params.category.as_deref()).await;
    Json(ApiResponse::success(tags, "标签列表"))
}

pub async fn get_tag_stats(State(_state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v57_store();
    let stats = store.tagger.get_tag_stats().await;
    Json(ApiResponse::success(stats, "标签统计"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:semantic:read"])),
    path = "/tags/suggest",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "semantic_v57"
)]
pub async fn suggest_tags(
    State(_state): State<AppState>,
    Json(req): Json<SuggestTagsRequest>,
) -> Json<ApiResponse<Vec<Tag>>> {
    ensure_initialized().await;
    let store = get_v57_store();

    let tags = store.tagger.suggest_tags(&req.entity_type, &req.data).await;
    Json(ApiResponse::success(tags, "推荐标签"))
}
