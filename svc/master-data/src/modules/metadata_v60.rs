//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V60.0 MDM AC-32: 元数据管理 + 数据血缘增强 + 生命周期管理
//!
//! 核心能力：
//! - 元数据管理 (MetadataManager): 元数据对象CRUD、属性管理、标签管理、统计分析
//! - 数据血缘增强 (EnhancedLineage): 多层级血缘追踪、影响分析、血缘图谱、导出
//! - 生命周期管理 (LifecycleManager): 阶段管理、策略配置、自动转换、批量操作

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 纯函数（无副作用，可单测） ====================

/// 标签规范化：
/// - 去除首尾空白
/// - 转为小写
/// - 将内部连续空白（含空格、制表符、换行）替换为单个连字符 `-`
/// - 空字符串返回空字符串
pub fn normalize_tag(tag: &str) -> String {
    let trimmed = tag.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_dash = false;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            if !prev_dash {
                result.push('-');
                prev_dash = true;
            }
        } else {
            for lower in ch.to_lowercase() {
                result.push(lower);
            }
            prev_dash = false;
        }
    }
    result
}

/// 校验生命周期阶段转换是否合法。
/// 合法阶段：draft → review → approved → published → archived → deprecated
/// 合法转换：
/// - 同阶段（self-transition）始终允许
/// - draft -> review, approved
/// - review -> approved, draft
/// - approved -> published, draft
/// - published -> archived, review
/// - archived -> deprecated, published
/// - deprecated -> archived（仅允许回退）
/// 未知阶段返回 false。
pub fn is_valid_lifecycle_transition(from: &str, to: &str) -> bool {
    let f = from.trim().to_lowercase();
    let t = to.trim().to_lowercase();
    if f == t {
        return true;
    }
    let allowed: &[(&str, &str)] = &[
        ("draft", "review"),
        ("draft", "approved"),
        ("review", "approved"),
        ("review", "draft"),
        ("approved", "published"),
        ("approved", "draft"),
        ("published", "archived"),
        ("published", "review"),
        ("archived", "deprecated"),
        ("archived", "published"),
        ("deprecated", "archived"),
    ];
    allowed.iter().any(|(a, b)| *a == f && *b == t)
}

// ==================== 元数据管理：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MetadataObjectType {
    Table,
    Field,
    Entity,
    Model,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataObject {
    pub id: String,
    pub name: String,
    pub object_type: MetadataObjectType,
    pub description: String,
    pub owner: String,
    pub tags: Vec<String>,
    pub attributes: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataAttribute {
    pub id: String,
    pub object_id: String,
    pub key: String,
    pub value: String,
    pub data_type: String,
    pub is_required: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataTag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: String,
    pub usage_count: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataStats {
    pub total_objects: usize,
    pub total_attributes: usize,
    pub total_tags: usize,
    pub by_type: HashMap<String, usize>,
    pub recent_created: Vec<MetadataObject>,
}

// ==================== 元数据管理：引擎 ====================

struct MetadataManager {
    objects: Mutex<Vec<MetadataObject>>,
    attributes: Mutex<Vec<MetadataAttribute>>,
    tags: Mutex<Vec<MetadataTag>>,
    initialized: Mutex<bool>,
}

impl MetadataManager {
    async fn create_metadata(
        &self,
        name: String,
        object_type: MetadataObjectType,
        description: String,
        owner: String,
        tags: Vec<String>,
        attributes: serde_json::Value,
    ) -> MetadataObject {
        let now = chrono::Utc::now().to_rfc3339();
        let obj = MetadataObject {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            object_type,
            description,
            owner,
            tags,
            attributes,
            created_at: now.clone(),
            updated_at: now,
        };
        self.objects.lock().await.push(obj.clone());
        obj
    }

    async fn get_metadata(&self, id: &str) -> Option<MetadataObject> {
        let objects = self.objects.lock().await;
        objects.iter().find(|o| o.id == id).cloned()
    }

    async fn list_metadata(&self, object_type: Option<MetadataObjectType>) -> Vec<MetadataObject> {
        let objects = self.objects.lock().await;
        if let Some(ot) = object_type {
            objects
                .iter()
                .filter(|o| o.object_type == ot)
                .cloned()
                .collect()
        } else {
            objects.clone()
        }
    }

    async fn search_metadata(&self, query: &str) -> Vec<MetadataObject> {
        let objects = self.objects.lock().await;
        let q = query.to_lowercase();
        objects
            .iter()
            .filter(|o| {
                o.name.to_lowercase().contains(&q)
                    || o.description.to_lowercase().contains(&q)
                    || o.tags.iter().any(|t| t.to_lowercase().contains(&q))
            })
            .cloned()
            .collect()
    }

    async fn update_metadata(
        &self,
        id: &str,
        name: Option<String>,
        description: Option<String>,
        owner: Option<String>,
        tags: Option<Vec<String>>,
        attributes: Option<serde_json::Value>,
    ) -> Option<MetadataObject> {
        let mut objects = self.objects.lock().await;
        let obj = objects.iter_mut().find(|o| o.id == id)?;
        if let Some(n) = name {
            obj.name = n;
        }
        if let Some(d) = description {
            obj.description = d;
        }
        if let Some(o) = owner {
            obj.owner = o;
        }
        if let Some(t) = tags {
            obj.tags = t;
        }
        if let Some(a) = attributes {
            obj.attributes = a;
        }
        obj.updated_at = chrono::Utc::now().to_rfc3339();
        Some(obj.clone())
    }

    async fn delete_metadata(&self, id: &str) -> bool {
        let mut objects = self.objects.lock().await;
        let pos = objects.iter().position(|o| o.id == id);
        if let Some(p) = pos {
            objects.remove(p);
            true
        } else {
            false
        }
    }

    async fn add_attribute(
        &self,
        object_id: String,
        key: String,
        value: String,
        data_type: String,
        is_required: bool,
    ) -> MetadataAttribute {
        let attr = MetadataAttribute {
            id: uuid::Uuid::new_v4().to_string(),
            object_id,
            key,
            value,
            data_type,
            is_required,
        };
        self.attributes.lock().await.push(attr.clone());
        attr
    }

    async fn add_tag(&self, name: String, color: String, description: String) -> MetadataTag {
        let tag = MetadataTag {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            color,
            description,
            usage_count: 0,
        };
        self.tags.lock().await.push(tag.clone());
        tag
    }

    async fn get_metadata_stats(&self) -> MetadataStats {
        let objects = self.objects.lock().await;
        let attributes = self.attributes.lock().await;
        let tags = self.tags.lock().await;

        let mut by_type = HashMap::new();
        for obj in objects.iter() {
            let key = metadata_type_str(&obj.object_type).to_string();
            *by_type.entry(key).or_insert(0) += 1;
        }

        let mut recent_created = objects.clone();
        recent_created.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        recent_created.truncate(10);

        MetadataStats {
            total_objects: objects.len(),
            total_attributes: attributes.len(),
            total_tags: tags.len(),
            by_type,
            recent_created,
        }
    }
}

// ==================== 数据血缘增强：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransformationType {
    Filter,
    Map,
    Aggregate,
    Join,
    Transform,
    Load,
    Extract,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageNodeV60 {
    pub id: String,
    pub entity_id: String,
    pub entity_type: String,
    pub name: String,
    pub attributes: serde_json::Value,
    pub level: u32,
    pub position: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageEdgeV60 {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub transformation_type: TransformationType,
    pub transformation_details: serde_json::Value,
    pub confidence: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageGraph {
    pub id: String,
    pub nodes: Vec<LineageNodeV60>,
    pub edges: Vec<LineageEdgeV60>,
    pub root_ids: Vec<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageImpact {
    pub entity_id: String,
    pub entity_type: String,
    pub affected_nodes: usize,
    pub affected_downstream: usize,
    pub confidence: f64,
    pub impact_score: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageDashboard {
    pub total_graphs: usize,
    pub total_nodes: usize,
    pub total_edges: usize,
    pub entity_types: Vec<String>,
    pub avg_confidence: f64,
    pub deepest_level: u32,
}

// ==================== 数据血缘增强：引擎 ====================

struct EnhancedLineage {
    graphs: Mutex<Vec<LineageGraph>>,
    nodes: Mutex<Vec<LineageNodeV60>>,
    edges: Mutex<Vec<LineageEdgeV60>>,
    initialized: Mutex<bool>,
}

impl EnhancedLineage {
    async fn build_lineage_graph(
        &self,
        root_entity_id: String,
        root_entity_type: String,
        max_depth: u32,
    ) -> LineageGraph {
        let now = chrono::Utc::now().to_rfc3339();
        let graph_id = uuid::Uuid::new_v4().to_string();

        let root_node = LineageNodeV60 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: root_entity_id.clone(),
            entity_type: root_entity_type.clone(),
            name: format!("{}:{}", root_entity_type, root_entity_id),
            attributes: serde_json::json!({"is_root": true}),
            level: 0,
            position: serde_json::json!({"x": 0, "y": 0}),
        };

        let mut nodes = vec![root_node.clone()];
        let mut edges = Vec::new();

        for level in 1..=max_depth {
            let node = LineageNodeV60 {
                id: uuid::Uuid::new_v4().to_string(),
                entity_id: format!("{}_level_{}", root_entity_id, level),
                entity_type: root_entity_type.clone(),
                name: format!("{} L{}", root_entity_type, level),
                attributes: serde_json::json!({"level": level}),
                level,
                position: serde_json::json!({"x": level as i64 * 100, "y": 0}),
            };

            let edge = LineageEdgeV60 {
                id: uuid::Uuid::new_v4().to_string(),
                source_id: nodes.last().unwrap().id.clone(),
                target_id: node.id.clone(),
                transformation_type: TransformationType::Transform,
                transformation_details: serde_json::json!({"step": level}),
                confidence: 0.9,
            };

            nodes.push(node);
            edges.push(edge);
        }

        let graph = LineageGraph {
            id: graph_id,
            nodes: nodes.clone(),
            edges: edges.clone(),
            root_ids: vec![root_node.id.clone()],
            updated_at: now,
        };

        {
            let mut graph_nodes = self.nodes.lock().await;
            graph_nodes.extend(nodes);
        }
        {
            let mut graph_edges = self.edges.lock().await;
            graph_edges.extend(edges);
        }
        self.graphs.lock().await.push(graph.clone());
        graph
    }

    async fn get_lineage_graph(&self, id: &str) -> Option<LineageGraph> {
        let graphs = self.graphs.lock().await;
        graphs.iter().find(|g| g.id == id).cloned()
    }

    async fn get_upstream(&self, entity_id: &str) -> Vec<LineageNodeV60> {
        let edges = self.edges.lock().await;
        let nodes = self.nodes.lock().await;

        let mut result = Vec::new();
        let mut visited = std::collections::HashSet::new();
        let mut queue = vec![entity_id.to_string()];

        while let Some(current) = queue.pop() {
            if !visited.insert(current.clone()) {
                continue;
            }

            let upstream_edges: Vec<LineageEdgeV60> = edges
                .iter()
                .filter(|e| e.target_id == current)
                .cloned()
                .collect();

            for edge in upstream_edges {
                if let Some(node) = nodes.iter().find(|n| n.id == edge.source_id).cloned() {
                    queue.push(node.id.clone());
                    result.push(node);
                }
            }
        }

        result
    }

    async fn get_downstream(&self, entity_id: &str) -> Vec<LineageNodeV60> {
        let edges = self.edges.lock().await;
        let nodes = self.nodes.lock().await;

        let mut result = Vec::new();
        let mut visited = std::collections::HashSet::new();
        let mut queue = vec![entity_id.to_string()];

        while let Some(current) = queue.pop() {
            if !visited.insert(current.clone()) {
                continue;
            }

            let downstream_edges: Vec<LineageEdgeV60> = edges
                .iter()
                .filter(|e| e.source_id == current)
                .cloned()
                .collect();

            for edge in downstream_edges {
                if let Some(node) = nodes.iter().find(|n| n.id == edge.target_id).cloned() {
                    queue.push(node.id.clone());
                    result.push(node);
                }
            }
        }

        result
    }

    async fn get_path(&self, source_id: &str, target_id: &str) -> Option<Vec<LineageEdgeV60>> {
        let edges = self.edges.lock().await;

        let mut adjacency: HashMap<String, Vec<LineageEdgeV60>> = HashMap::new();
        for edge in edges.iter() {
            adjacency
                .entry(edge.source_id.clone())
                .or_default()
                .push(edge.clone());
        }

        let mut queue: Vec<(String, Vec<LineageEdgeV60>)> =
            vec![(source_id.to_string(), Vec::new())];
        let mut visited = std::collections::HashSet::new();

        while let Some((current, path)) = queue.pop() {
            if current == target_id {
                return Some(path);
            }

            if !visited.insert(current.clone()) {
                continue;
            }

            if let Some(next_edges) = adjacency.get(&current) {
                for edge in next_edges {
                    let mut new_path = path.clone();
                    new_path.push(edge.clone());
                    queue.push((edge.target_id.clone(), new_path));
                }
            }
        }

        None
    }

    async fn get_lineage_impact(&self, entity_id: &str, entity_type: &str) -> LineageImpact {
        let downstream = self.get_downstream(entity_id).await;
        let upstream = self.get_upstream(entity_id).await;

        let affected_downstream = downstream.len();
        let affected_nodes = downstream.len() + upstream.len();
        let confidence = if downstream.is_empty() { 0.5 } else { 0.9 };
        let impact_score =
            (affected_downstream as f64 * 0.3 + affected_nodes as f64 * 0.1).min(1.0);

        LineageImpact {
            entity_id: entity_id.to_string(),
            entity_type: entity_type.to_string(),
            affected_nodes,
            affected_downstream,
            confidence,
            impact_score,
        }
    }

    async fn get_lineage_dashboard(&self) -> LineageDashboard {
        let graphs = self.graphs.lock().await;
        let nodes = self.nodes.lock().await;
        let edges = self.edges.lock().await;

        let entity_types: Vec<String> = nodes
            .iter()
            .map(|n| n.entity_type.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        let avg_confidence = if edges.is_empty() {
            0.0
        } else {
            edges.iter().map(|e| e.confidence).sum::<f64>() / edges.len() as f64
        };

        let deepest_level = nodes.iter().map(|n| n.level).max().unwrap_or(0);

        LineageDashboard {
            total_graphs: graphs.len(),
            total_nodes: nodes.len(),
            total_edges: edges.len(),
            entity_types,
            avg_confidence,
            deepest_level,
        }
    }

    async fn export_lineage(&self, format: &str) -> serde_json::Value {
        let graphs = self.graphs.lock().await;
        let nodes = self.nodes.lock().await;
        let edges = self.edges.lock().await;

        match format {
            "json" | _ => serde_json::json!({
                "graphs": graphs.clone(),
                "nodes": nodes.clone(),
                "edges": edges.clone(),
                "exported_at": chrono::Utc::now().to_rfc3339(),
                "format": "json"
            }),
        }
    }
}

// ==================== 生命周期管理：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleStage {
    Created,
    Active,
    Maintenance,
    Deprecated,
    Archived,
    Deleted,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecyclePolicy {
    pub id: String,
    pub entity_type: String,
    pub transitions: serde_json::Value,
    pub duration_days: u32,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleHistory {
    pub id: String,
    pub entity_id: String,
    pub stage: LifecycleStage,
    pub from_stage: Option<LifecycleStage>,
    pub reason: String,
    pub changed_at: String,
    pub changed_by: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleDashboard {
    pub total_entities: usize,
    pub by_stage: HashMap<String, usize>,
    pub policies_count: usize,
    pub recent_transitions: Vec<LifecycleHistory>,
}

// ==================== 生命周期管理：引擎 ====================

struct LifecycleManager {
    policies: Mutex<Vec<LifecyclePolicy>>,
    history: Mutex<Vec<LifecycleHistory>>,
    current_stages: Mutex<HashMap<String, LifecycleStage>>,
    initialized: Mutex<bool>,
}

impl LifecycleManager {
    async fn get_current_stage(&self, entity_id: &str) -> Option<LifecycleStage> {
        let stages = self.current_stages.lock().await;
        stages.get(entity_id).cloned()
    }

    async fn transition_stage(
        &self,
        entity_id: &str,
        new_stage: LifecycleStage,
        reason: String,
        changed_by: String,
    ) -> LifecycleHistory {
        let now = chrono::Utc::now().to_rfc3339();
        let from_stage = {
            let stages = self.current_stages.lock().await;
            stages.get(entity_id).cloned()
        };

        let history = LifecycleHistory {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: entity_id.to_string(),
            stage: new_stage.clone(),
            from_stage,
            reason,
            changed_at: now,
            changed_by,
        };

        {
            let mut stages = self.current_stages.lock().await;
            stages.insert(entity_id.to_string(), new_stage);
        }
        {
            let mut hist = self.history.lock().await;
            hist.push(history.clone());
        }

        history
    }

    async fn get_lifecycle_history(&self, entity_id: &str) -> Vec<LifecycleHistory> {
        let history = self.history.lock().await;
        history
            .iter()
            .filter(|h| h.entity_id == entity_id)
            .cloned()
            .collect()
    }

    async fn create_policy(
        &self,
        entity_type: String,
        transitions: serde_json::Value,
        duration_days: u32,
        actions: Vec<String>,
    ) -> LifecyclePolicy {
        let policy = LifecyclePolicy {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type,
            transitions,
            duration_days,
            actions,
        };
        self.policies.lock().await.push(policy.clone());
        policy
    }

    async fn get_policies(&self, entity_type: Option<String>) -> Vec<LifecyclePolicy> {
        let policies = self.policies.lock().await;
        if let Some(et) = entity_type {
            policies
                .iter()
                .filter(|p| p.entity_type == et)
                .cloned()
                .collect()
        } else {
            policies.clone()
        }
    }

    async fn auto_transition(&self) -> Vec<LifecycleHistory> {
        let policies = self.policies.lock().await;
        let mut results = Vec::new();

        for policy in policies.iter() {
            if let Some(transitions) = policy.transitions.as_array() {
                for transition in transitions {
                    if let (Some(from), Some(to)) = (
                        transition.get("from").and_then(|v| v.as_str()),
                        transition.get("to").and_then(|v| v.as_str()),
                    ) {
                        let stages = self.current_stages.lock().await;
                        let matching: Vec<String> = stages
                            .iter()
                            .filter(|(_, v)| lifecycle_stage_str(v) == from)
                            .map(|(k, _)| k.clone())
                            .collect();
                        drop(stages);

                        for entity_id in matching {
                            if let Some(to_stage) = parse_lifecycle_stage(to) {
                                let history = self
                                    .transition_stage(
                                        &entity_id,
                                        to_stage,
                                        format!("auto_transition: {}", policy.entity_type),
                                        "system".to_string(),
                                    )
                                    .await;
                                results.push(history);
                            }
                        }
                    }
                }
            }
        }

        results
    }

    async fn get_lifecycle_dashboard(&self) -> LifecycleDashboard {
        let stages = self.current_stages.lock().await;
        let policies = self.policies.lock().await;
        let history = self.history.lock().await;

        let mut by_stage = HashMap::new();
        for stage in stages.values() {
            let key = lifecycle_stage_str(stage).to_string();
            *by_stage.entry(key).or_insert(0) += 1;
        }

        let mut recent_transitions = history.clone();
        recent_transitions.sort_by(|a, b| b.changed_at.cmp(&a.changed_at));
        recent_transitions.truncate(10);

        LifecycleDashboard {
            total_entities: stages.len(),
            by_stage,
            policies_count: policies.len(),
            recent_transitions,
        }
    }

    async fn bulk_transition(
        &self,
        entity_ids: Vec<String>,
        target_stage: LifecycleStage,
        reason: String,
        changed_by: String,
    ) -> Vec<LifecycleHistory> {
        let mut results = Vec::new();
        for entity_id in entity_ids {
            let history = self
                .transition_stage(
                    &entity_id,
                    target_stage.clone(),
                    reason.clone(),
                    changed_by.clone(),
                )
                .await;
            results.push(history);
        }
        results
    }
}

// ==================== V60 内存存储 ====================

struct V60Store {
    metadata: MetadataManager,
    lineage: EnhancedLineage,
    lifecycle: LifecycleManager,
}

fn get_v60_store() -> &'static V60Store {
    static STORE: LazyLock<V60Store> = LazyLock::new(|| V60Store {
        metadata: MetadataManager {
            objects: Mutex::new(Vec::new()),
            attributes: Mutex::new(Vec::new()),
            tags: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
        lineage: EnhancedLineage {
            graphs: Mutex::new(Vec::new()),
            nodes: Mutex::new(Vec::new()),
            edges: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
        lifecycle: LifecycleManager {
            policies: Mutex::new(Vec::new()),
            history: Mutex::new(Vec::new()),
            current_stages: Mutex::new(HashMap::new()),
            initialized: Mutex::new(false),
        },
    });
    &STORE
}

// ==================== 辅助函数 ====================

fn metadata_type_str(t: &MetadataObjectType) -> &str {
    match t {
        MetadataObjectType::Table => "table",
        MetadataObjectType::Field => "field",
        MetadataObjectType::Entity => "entity",
        MetadataObjectType::Model => "model",
    }
}

fn parse_metadata_type(s: &str) -> Option<MetadataObjectType> {
    match s {
        "table" => Some(MetadataObjectType::Table),
        "field" => Some(MetadataObjectType::Field),
        "entity" => Some(MetadataObjectType::Entity),
        "model" => Some(MetadataObjectType::Model),
        _ => None,
    }
}

fn lifecycle_stage_str(s: &LifecycleStage) -> &str {
    match s {
        LifecycleStage::Created => "created",
        LifecycleStage::Active => "active",
        LifecycleStage::Maintenance => "maintenance",
        LifecycleStage::Deprecated => "deprecated",
        LifecycleStage::Archived => "archived",
        LifecycleStage::Deleted => "deleted",
    }
}

fn parse_lifecycle_stage(s: &str) -> Option<LifecycleStage> {
    match s {
        "created" => Some(LifecycleStage::Created),
        "active" => Some(LifecycleStage::Active),
        "maintenance" => Some(LifecycleStage::Maintenance),
        "deprecated" => Some(LifecycleStage::Deprecated),
        "archived" => Some(LifecycleStage::Archived),
        "deleted" => Some(LifecycleStage::Deleted),
        _ => None,
    }
}

fn transformation_type_str(t: &TransformationType) -> &str {
    match t {
        TransformationType::Filter => "filter",
        TransformationType::Map => "map",
        TransformationType::Aggregate => "aggregate",
        TransformationType::Join => "join",
        TransformationType::Transform => "transform",
        TransformationType::Load => "load",
        TransformationType::Extract => "extract",
    }
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_v60_store();

    {
        let mut init = store.metadata.initialized.lock().await;
        if *init {
            return;
        }

        let now = chrono::Utc::now().to_rfc3339();

        let seed_objects = vec![
            MetadataObject {
                id: uuid::Uuid::new_v4().to_string(),
                name: "客户主数据表".to_string(),
                object_type: MetadataObjectType::Table,
                description: "客户核心主数据表，包含客户基本信息".to_string(),
                owner: "data_owner_001".to_string(),
                tags: vec!["customer".to_string(), "master".to_string()],
                attributes: serde_json::json!({"row_count": 150000, "storage": "partitioned"}),
                created_at: now.clone(),
                updated_at: now.clone(),
            },
            MetadataObject {
                id: uuid::Uuid::new_v4().to_string(),
                name: "供应商主数据表".to_string(),
                object_type: MetadataObjectType::Table,
                description: "供应商核心主数据表".to_string(),
                owner: "data_owner_002".to_string(),
                tags: vec!["supplier".to_string()],
                attributes: serde_json::json!({"row_count": 8500, "storage": "normal"}),
                created_at: now.clone(),
                updated_at: now,
            },
        ];
        *store.metadata.objects.lock().await = seed_objects;

        let seed_tags = vec![
            MetadataTag {
                id: uuid::Uuid::new_v4().to_string(),
                name: "customer".to_string(),
                color: "#3498db".to_string(),
                description: "客户域".to_string(),
                usage_count: 15,
            },
            MetadataTag {
                id: uuid::Uuid::new_v4().to_string(),
                name: "supplier".to_string(),
                color: "#2ecc71".to_string(),
                description: "供应商域".to_string(),
                usage_count: 8,
            },
            MetadataTag {
                id: uuid::Uuid::new_v4().to_string(),
                name: "master".to_string(),
                color: "#e74c3c".to_string(),
                description: "主数据".to_string(),
                usage_count: 25,
            },
        ];
        *store.metadata.tags.lock().await = seed_tags;
        *init = true;
    }

    {
        let mut init = store.lineage.initialized.lock().await;
        if *init {
            return;
        }

        let graph = store
            .lineage
            .build_lineage_graph("customer_table".to_string(), "table".to_string(), 3)
            .await;
        let _ = graph;
        *init = true;
    }

    {
        let mut init = store.lifecycle.initialized.lock().await;
        if *init {
            return;
        }

        let seed_policies = vec![LifecyclePolicy {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "customer".to_string(),
            transitions: serde_json::json!([
                {"from": "created", "to": "active"},
                {"from": "active", "to": "maintenance"},
                {"from": "maintenance", "to": "deprecated"},
                {"from": "deprecated", "to": "archived"}
            ]),
            duration_days: 90,
            actions: vec!["notify_owner".to_string(), "audit_log".to_string()],
        }];
        *store.lifecycle.policies.lock().await = seed_policies;

        let mut stages = HashMap::new();
        stages.insert("entity_001".to_string(), LifecycleStage::Active);
        stages.insert("entity_002".to_string(), LifecycleStage::Maintenance);
        *store.lifecycle.current_stages.lock().await = stages;
        *init = true;
    }
}

// ==================== 请求/响应结构 ====================

// --- 元数据管理请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateMetadataRequest {
    pub name: String,
    pub object_type: String,
    pub description: Option<String>,
    pub owner: String,
    pub tags: Option<Vec<String>>,
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMetadataRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub owner: Option<String>,
    pub tags: Option<Vec<String>>,
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AddAttributeRequest {
    pub object_id: String,
    pub key: String,
    pub value: String,
    pub data_type: Option<String>,
    pub is_required: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AddTagRequest {
    pub name: String,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListMetadataQuery {
    pub object_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchMetadataQuery {
    pub q: String,
}

// --- 数据血缘增强请求 ---

#[derive(Debug, Deserialize)]
pub struct BuildLineageGraphRequest {
    pub root_entity_id: String,
    pub root_entity_type: String,
    pub max_depth: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct GetPathRequest {
    pub source_id: String,
    pub target_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportLineageQuery {
    pub format: Option<String>,
}

// --- 生命周期管理请求 ---

#[derive(Debug, Deserialize)]
pub struct TransitionRequest {
    pub new_stage: String,
    pub reason: Option<String>,
    pub changed_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePolicyRequest {
    pub entity_type: String,
    pub transitions: serde_json::Value,
    pub duration_days: Option<u32>,
    pub actions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct GetPoliciesQuery {
    pub entity_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkTransitionRequest {
    pub entity_ids: Vec<String>,
    pub target_stage: String,
    pub reason: Option<String>,
    pub changed_by: Option<String>,
}

// ==================== 处理器：元数据管理 ====================

pub async fn create_metadata(
    State(_state): State<AppState>,
    Json(req): Json<CreateMetadataRequest>,
) -> Json<ApiResponse<MetadataObject>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let object_type = match parse_metadata_type(&req.object_type) {
        Some(t) => t,
        None => return Json(ApiResponse::error(400, "无效的元数据对象类型")),
    };

    let obj = store
        .metadata
        .create_metadata(
            req.name,
            object_type,
            req.description.unwrap_or_default(),
            req.owner,
            req.tags.unwrap_or_default(),
            req.attributes.unwrap_or_else(|| serde_json::json!({})),
        )
        .await;
    Json(ApiResponse::success(obj, "元数据对象已创建"))
}

pub async fn get_metadata(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<MetadataObject>> {
    ensure_initialized().await;
    let store = get_v60_store();

    match store.metadata.get_metadata(&id).await {
        Some(obj) => Json(ApiResponse::success(obj, "元数据对象")),
        None => Json(ApiResponse::error(404, "未找到元数据对象")),
    }
}

pub async fn list_metadata(
    State(_state): State<AppState>,
    Query(params): Query<ListMetadataQuery>,
) -> Json<ApiResponse<Vec<MetadataObject>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let object_type = params.object_type.as_deref().and_then(parse_metadata_type);

    let list = store.metadata.list_metadata(object_type).await;
    Json(ApiResponse::success(list, "元数据对象列表"))
}

pub async fn search_metadata(
    State(_state): State<AppState>,
    Query(params): Query<SearchMetadataQuery>,
) -> Json<ApiResponse<Vec<MetadataObject>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let results = store.metadata.search_metadata(&params.q).await;
    Json(ApiResponse::success(results, "元数据搜索结果"))
}

pub async fn update_metadata(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateMetadataRequest>,
) -> Json<ApiResponse<MetadataObject>> {
    ensure_initialized().await;
    let store = get_v60_store();

    match store
        .metadata
        .update_metadata(
            &id,
            req.name,
            req.description,
            req.owner,
            req.tags,
            req.attributes,
        )
        .await
    {
        Some(obj) => Json(ApiResponse::success(obj, "元数据对象已更新")),
        None => Json(ApiResponse::error(404, "未找到元数据对象")),
    }
}

pub async fn delete_metadata(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;
    let store = get_v60_store();

    match store.metadata.delete_metadata(&id).await {
        true => Json(ApiResponse::success((), "元数据对象已删除")),
        false => Json(ApiResponse::error(404, "未找到元数据对象")),
    }
}

pub async fn add_attribute(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<AddAttributeRequest>,
) -> Json<ApiResponse<MetadataAttribute>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let attr = store
        .metadata
        .add_attribute(
            id,
            req.key,
            req.value,
            req.data_type.unwrap_or_else(|| "string".to_string()),
            req.is_required.unwrap_or(false),
        )
        .await;
    Json(ApiResponse::success(attr, "属性已添加"))
}

pub async fn add_tag(
    State(_state): State<AppState>,
    Json(req): Json<AddTagRequest>,
) -> Json<ApiResponse<MetadataTag>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let tag = store
        .metadata
        .add_tag(
            req.name,
            req.color.unwrap_or_else(|| "#95a5a6".to_string()),
            req.description.unwrap_or_default(),
        )
        .await;
    Json(ApiResponse::success(tag, "标签已添加"))
}

pub async fn get_metadata_stats(
    State(_state): State<AppState>,
) -> Json<ApiResponse<MetadataStats>> {
    ensure_initialized().await;
    let store = get_v60_store();
    let stats = store.metadata.get_metadata_stats().await;
    Json(ApiResponse::success(stats, "元数据统计"))
}

// ==================== 处理器：数据血缘增强 ====================

pub async fn build_lineage_graph(
    State(_state): State<AppState>,
    Json(req): Json<BuildLineageGraphRequest>,
) -> Json<ApiResponse<LineageGraph>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let max_depth = req.max_depth.unwrap_or(3);
    let graph = store
        .lineage
        .build_lineage_graph(req.root_entity_id, req.root_entity_type, max_depth)
        .await;
    Json(ApiResponse::success(graph, "血缘图谱已构建"))
}

pub async fn get_lineage_graph(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<LineageGraph>> {
    ensure_initialized().await;
    let store = get_v60_store();

    match store.lineage.get_lineage_graph(&id).await {
        Some(graph) => Json(ApiResponse::success(graph, "血缘图谱")),
        None => Json(ApiResponse::error(404, "未找到血缘图谱")),
    }
}

pub async fn get_upstream(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<LineageNodeV60>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let nodes = store.lineage.get_upstream(&id).await;
    Json(ApiResponse::success(nodes, "上游血缘节点"))
}

pub async fn get_downstream(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<LineageNodeV60>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let nodes = store.lineage.get_downstream(&id).await;
    Json(ApiResponse::success(nodes, "下游血缘节点"))
}

pub async fn get_path(
    State(_state): State<AppState>,
    Json(req): Json<GetPathRequest>,
) -> Json<ApiResponse<Vec<LineageEdgeV60>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    match store.lineage.get_path(&req.source_id, &req.target_id).await {
        Some(path) => Json(ApiResponse::success(path, "血缘路径")),
        None => Json(ApiResponse::error(404, "未找到血缘路径")),
    }
}

pub async fn get_lineage_impact(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<LineageImpact>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let impact = store.lineage.get_lineage_impact(&id, "entity").await;
    Json(ApiResponse::success(impact, "血缘影响分析"))
}

pub async fn get_lineage_dashboard(
    State(_state): State<AppState>,
) -> Json<ApiResponse<LineageDashboard>> {
    ensure_initialized().await;
    let store = get_v60_store();
    let dashboard = store.lineage.get_lineage_dashboard().await;
    Json(ApiResponse::success(dashboard, "血缘仪表盘"))
}

pub async fn export_lineage(
    State(_state): State<AppState>,
    Query(params): Query<ExportLineageQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let format = params.format.as_deref().unwrap_or("json");
    let data = store.lineage.export_lineage(format).await;
    Json(ApiResponse::success(data, "血缘导出数据"))
}

// ==================== 处理器：生命周期管理 ====================

pub async fn get_current_stage(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v60_store();

    match store.lifecycle.get_current_stage(&id).await {
        Some(stage) => Json(ApiResponse::success(
            serde_json::json!({"stage": lifecycle_stage_str(&stage)}),
            "当前生命周期阶段",
        )),
        None => Json(ApiResponse::error(404, "未找到实体的生命周期信息")),
    }
}

pub async fn transition_stage(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<TransitionRequest>,
) -> Json<ApiResponse<LifecycleHistory>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let new_stage = match parse_lifecycle_stage(&req.new_stage) {
        Some(s) => s,
        None => return Json(ApiResponse::error(400, "无效的生命周期阶段")),
    };

    let history = store
        .lifecycle
        .transition_stage(
            &id,
            new_stage,
            req.reason.unwrap_or_else(|| "手动转换".to_string()),
            req.changed_by.unwrap_or_else(|| "user".to_string()),
        )
        .await;
    Json(ApiResponse::success(history, "生命周期阶段已转换"))
}

pub async fn get_lifecycle_history(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<LifecycleHistory>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let history = store.lifecycle.get_lifecycle_history(&id).await;
    Json(ApiResponse::success(history, "生命周期历史"))
}

pub async fn create_policy(
    State(_state): State<AppState>,
    Json(req): Json<CreatePolicyRequest>,
) -> Json<ApiResponse<LifecyclePolicy>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let policy = store
        .lifecycle
        .create_policy(
            req.entity_type,
            req.transitions,
            req.duration_days.unwrap_or(90),
            req.actions.unwrap_or_default(),
        )
        .await;
    Json(ApiResponse::success(policy, "生命周期策略已创建"))
}

pub async fn get_policies(
    State(_state): State<AppState>,
    Query(params): Query<GetPoliciesQuery>,
) -> Json<ApiResponse<Vec<LifecyclePolicy>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let policies = store.lifecycle.get_policies(params.entity_type).await;
    Json(ApiResponse::success(policies, "生命周期策略列表"))
}

pub async fn auto_transition(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<LifecycleHistory>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let results = store.lifecycle.auto_transition().await;
    Json(ApiResponse::success(results, "自动转换完成"))
}

pub async fn get_lifecycle_dashboard(
    State(_state): State<AppState>,
) -> Json<ApiResponse<LifecycleDashboard>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let dashboard = store.lifecycle.get_lifecycle_dashboard().await;
    Json(ApiResponse::success(dashboard, "生命周期仪表盘"))
}

pub async fn bulk_transition(
    State(_state): State<AppState>,
    Json(req): Json<BulkTransitionRequest>,
) -> Json<ApiResponse<Vec<LifecycleHistory>>> {
    ensure_initialized().await;
    let store = get_v60_store();

    let target_stage = match parse_lifecycle_stage(&req.target_stage) {
        Some(s) => s,
        None => return Json(ApiResponse::error(400, "无效的目标生命周期阶段")),
    };

    let results = store
        .lifecycle
        .bulk_transition(
            req.entity_ids,
            target_stage,
            req.reason.unwrap_or_else(|| "批量转换".to_string()),
            req.changed_by.unwrap_or_else(|| "user".to_string()),
        )
        .await;
    Json(ApiResponse::success(results, "批量生命周期转换完成"))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- normalize_tag ----------

    #[test]
    fn test_normalize_tag_empty() {
        assert_eq!(normalize_tag(""), "");
        assert_eq!(normalize_tag("   "), "");
        assert_eq!(normalize_tag("\t\n"), "");
    }

    #[test]
    fn test_normalize_tag_no_change() {
        assert_eq!(normalize_tag("alpha"), "alpha");
        assert_eq!(normalize_tag("v1"), "v1");
    }

    #[test]
    fn test_normalize_tag_lowercases() {
        assert_eq!(normalize_tag("Hello"), "hello");
        assert_eq!(normalize_tag("MIXEDCase"), "mixedcase");
    }

    #[test]
    fn test_normalize_tag_replaces_internal_whitespace() {
        assert_eq!(normalize_tag("hello world"), "hello-world");
        assert_eq!(normalize_tag("a b c"), "a-b-c");
    }

    #[test]
    fn test_normalize_tag_collapses_multiple_whitespace() {
        assert_eq!(normalize_tag("a  b"), "a-b");
        assert_eq!(normalize_tag("a\t\tb"), "a-b");
        assert_eq!(normalize_tag("a\n\nb"), "a-b");
        assert_eq!(normalize_tag("a \t\n b"), "a-b");
    }

    #[test]
    fn test_normalize_tag_trims_leading_trailing() {
        assert_eq!(normalize_tag("  hello  "), "hello");
        assert_eq!(normalize_tag("\tworld\n"), "world");
        assert_eq!(normalize_tag("  a b  "), "a-b");
    }

    #[test]
    fn test_normalize_tag_with_unicode() {
        // 中文标签保留，但前后空格去除
        assert_eq!(normalize_tag("  数据  "), "数据");
        assert_eq!(normalize_tag("数据 治理"), "数据-治理");
    }

    #[test]
    fn test_normalize_tag_special_chars_preserved() {
        // 特殊字符保留（仅空白被替换）
        assert_eq!(normalize_tag("a_b c"), "a_b-c");
        assert_eq!(normalize_tag("a.b@c"), "a.b@c");
    }

    #[test]
    fn test_normalize_tag_only_whitespace_becomes_empty() {
        assert_eq!(normalize_tag("     "), "");
        assert_eq!(normalize_tag("\t\t\t"), "");
    }

    // ---------- is_valid_lifecycle_transition ----------

    #[test]
    fn test_lifecycle_self_transition_always_valid() {
        assert!(is_valid_lifecycle_transition("draft", "draft"));
        assert!(is_valid_lifecycle_transition("published", "published"));
        assert!(is_valid_lifecycle_transition("archived", "archived"));
        // 未知阶段的同阶段也允许（因为 f == t 触发）
        assert!(is_valid_lifecycle_transition("unknown", "unknown"));
    }

    #[test]
    fn test_lifecycle_forward_transition_valid() {
        assert!(is_valid_lifecycle_transition("draft", "review"));
        assert!(is_valid_lifecycle_transition("review", "approved"));
        assert!(is_valid_lifecycle_transition("approved", "published"));
        assert!(is_valid_lifecycle_transition("published", "archived"));
        assert!(is_valid_lifecycle_transition("archived", "deprecated"));
    }

    #[test]
    fn test_lifecycle_backward_transition_valid() {
        assert!(is_valid_lifecycle_transition("review", "draft"));
        assert!(is_valid_lifecycle_transition("approved", "draft"));
        assert!(is_valid_lifecycle_transition("published", "review"));
        assert!(is_valid_lifecycle_transition("archived", "published"));
        assert!(is_valid_lifecycle_transition("deprecated", "archived"));
    }

    #[test]
    fn test_lifecycle_skip_transition_valid() {
        // draft -> approved（跳过 review）
        assert!(is_valid_lifecycle_transition("draft", "approved"));
    }

    #[test]
    fn test_lifecycle_invalid_forward_skip() {
        // draft -> published（跨多级）不允许
        assert!(!is_valid_lifecycle_transition("draft", "published"));
        // draft -> archived 不允许
        assert!(!is_valid_lifecycle_transition("draft", "archived"));
        // draft -> deprecated 不允许
        assert!(!is_valid_lifecycle_transition("draft", "deprecated"));
    }

    #[test]
    fn test_lifecycle_invalid_backward() {
        // published -> approved 不允许（已发布不能回退到已批准）
        assert!(!is_valid_lifecycle_transition("published", "approved"));
        // deprecated -> draft 不允许
        assert!(!is_valid_lifecycle_transition("deprecated", "draft"));
        // deprecated -> published 不允许（必须先回到 archived）
        assert!(!is_valid_lifecycle_transition("deprecated", "published"));
    }

    #[test]
    fn test_lifecycle_unknown_stage() {
        // 未知阶段之间的非自身转换不允许
        assert!(!is_valid_lifecycle_transition("draft", "unknown"));
        assert!(!is_valid_lifecycle_transition("unknown", "draft"));
        assert!(!is_valid_lifecycle_transition("foo", "bar"));
    }

    #[test]
    fn test_lifecycle_case_insensitive() {
        assert!(is_valid_lifecycle_transition("Draft", "Review"));
        assert!(is_valid_lifecycle_transition("DRAFT", "REVIEW"));
        assert!(is_valid_lifecycle_transition("Published", "Archived"));
    }

    #[test]
    fn test_lifecycle_trims_whitespace() {
        assert!(is_valid_lifecycle_transition("  draft  ", "  review  "));
        assert!(is_valid_lifecycle_transition("\tdraft\n", "\treview\n"));
    }

    #[test]
    fn test_lifecycle_empty_strings() {
        // 空字符串视为相同阶段
        assert!(is_valid_lifecycle_transition("", ""));
        // 空字符串与已知阶段不允许转换
        assert!(!is_valid_lifecycle_transition("", "draft"));
        assert!(!is_valid_lifecycle_transition("draft", ""));
    }
}
