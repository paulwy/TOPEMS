//! DSH AI 知识图谱集成模块
//!
//! 提供知识图谱能力，包括：
//! - 实体关系提取
//! - 知识图谱查询
//! - 推理和关联分析
//! - 图谱构建和管理
//! - 实体链接和消歧
//! - 路径分析和社区发现

use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// 实体类型
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EntityType {
    /// 人员
    Person,
    /// 组织
    Organization,
    /// 地点
    Location,
    /// 时间
    DateTime,
    /// 事件
    Event,
    /// 产品
    Product,
    /// 项目
    Project,
    /// 文档
    Document,
    /// 概念
    Concept,
    /// 自定义类型
    Custom(String),
}

impl EntityType {
    /// 获取类型名称
    pub fn as_str(&self) -> &str {
        match self {
            EntityType::Person => "person",
            EntityType::Organization => "organization",
            EntityType::Location => "location",
            EntityType::DateTime => "datetime",
            EntityType::Event => "event",
            EntityType::Product => "product",
            EntityType::Project => "project",
            EntityType::Document => "document",
            EntityType::Concept => "concept",
            EntityType::Custom(s) => s.as_str(),
        }
    }

    /// 从字符串创建实体类型
    pub fn from_str(s: &str) -> Self {
        match s {
            "person" => EntityType::Person,
            "organization" => EntityType::Organization,
            "location" => EntityType::Location,
            "datetime" => EntityType::DateTime,
            "event" => EntityType::Event,
            "product" => EntityType::Product,
            "project" => EntityType::Project,
            "document" => EntityType::Document,
            "concept" => EntityType::Concept,
            other => EntityType::Custom(other.to_string()),
        }
    }
}

/// 关系类型
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RelationType {
    /// 属于
    BelongsTo,
    /// 位于
    LocatedIn,
    /// 工作于
    WorksAt,
    /// 参与
    ParticipatesIn,
    /// 创建
    CreatedBy,
    /// 关联
    RelatedTo,
    /// 包含
    Contains,
    /// 依赖
    DependsOn,
    /// 继承
    InheritsFrom,
    /// 自定义关系
    Custom(String),
}

impl RelationType {
    /// 获取关系名称
    pub fn as_str(&self) -> &str {
        match self {
            RelationType::BelongsTo => "belongs_to",
            RelationType::LocatedIn => "located_in",
            RelationType::WorksAt => "works_at",
            RelationType::ParticipatesIn => "participates_in",
            RelationType::CreatedBy => "created_by",
            RelationType::RelatedTo => "related_to",
            RelationType::Contains => "contains",
            RelationType::DependsOn => "depends_on",
            RelationType::InheritsFrom => "inherits_from",
            RelationType::Custom(s) => s.as_str(),
        }
    }
}

/// 实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    /// 实体 ID
    pub id: String,
    /// 实体名称
    pub name: String,
    /// 实体类型
    pub entity_type: EntityType,
    /// 实体描述
    pub description: String,
    /// 实体属性
    pub properties: HashMap<String, String>,
    /// 别名（用于实体链接）
    pub aliases: Vec<String>,
    /// 置信度（0-1）
    pub confidence: f64,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

impl Entity {
    /// 创建新实体
    pub fn new(id: &str, name: &str, entity_type: EntityType) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: id.to_string(),
            name: name.to_string(),
            entity_type,
            description: String::new(),
            properties: HashMap::new(),
            aliases: Vec::new(),
            confidence: 1.0,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    /// 添加属性
    pub fn add_property(&mut self, key: &str, value: &str) {
        self.properties.insert(key.to_string(), value.to_string());
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }

    /// 添加别名
    pub fn add_alias(&mut self, alias: &str) {
        if !self.aliases.contains(&alias.to_string()) {
            self.aliases.push(alias.to_string());
            self.updated_at = chrono::Utc::now().to_rfc3339();
        }
    }
}

/// 关系（边）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relation {
    /// 关系 ID
    pub id: String,
    /// 源实体 ID
    pub source_id: String,
    /// 目标实体 ID
    pub target_id: String,
    /// 关系类型
    pub relation_type: RelationType,
    /// 关系描述
    pub description: String,
    /// 关系属性
    pub properties: HashMap<String, String>,
    /// 权重（0-1，用于图算法）
    pub weight: f64,
    /// 置信度（0-1）
    pub confidence: f64,
    /// 创建时间
    pub created_at: String,
}

impl Relation {
    /// 创建新关系
    pub fn new(
        source_id: &str,
        target_id: &str,
        relation_type: RelationType,
    ) -> Self {
        let id = format!("{}_{}_{}", source_id, relation_type.as_str(), target_id);
        Self {
            id,
            source_id: source_id.to_string(),
            target_id: target_id.to_string(),
            relation_type,
            description: String::new(),
            properties: HashMap::new(),
            weight: 1.0,
            confidence: 1.0,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// 提取的实体（用于 NER 结果）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedEntity {
    /// 实体文本
    pub text: String,
    /// 实体类型
    pub entity_type: EntityType,
    /// 在文本中的起始位置
    pub start_offset: usize,
    /// 在文本中的结束位置
    pub end_offset: usize,
    /// 置信度（0-1）
    pub confidence: f64,
}

/// 提取的关系（用于关系提取结果）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedRelation {
    /// 源实体文本
    pub source_text: String,
    /// 目标实体文本
    pub target_text: String,
    /// 关系类型
    pub relation_type: RelationType,
    /// 置信度（0-1）
    pub confidence: f64,
}

/// 实体关系提取结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    /// 提取的实体
    pub entities: Vec<ExtractedEntity>,
    /// 提取的关系
    pub relations: Vec<ExtractedRelation>,
    /// 处理的文本长度
    pub text_length: usize,
    /// 处理耗时（毫秒）
    pub duration_ms: u64,
}

/// 路径查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathResult {
    /// 路径上的实体 ID 列表
    pub entity_ids: Vec<String>,
    /// 路径上的关系 ID 列表
    pub relation_ids: Vec<String>,
    /// 路径长度（边数）
    pub path_length: usize,
    /// 路径总权重
    pub total_weight: f64,
}

/// 社区发现结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunityResult {
    /// 社区 ID
    pub community_id: usize,
    /// 社区中的实体 ID 列表
    pub entity_ids: Vec<String>,
    /// 社区大小
    pub size: usize,
    /// 社区密度（0-1）
    pub density: f64,
}

/// 知识图谱统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphStats {
    /// 实体总数
    pub total_entities: u64,
    /// 关系总数
    pub total_relations: u64,
    /// 按类型统计实体数
    pub entities_by_type: HashMap<String, u64>,
    /// 按类型统计关系数
    pub relations_by_type: HashMap<String, u64>,
    /// 平均实体度数
    pub avg_entity_degree: f64,
    /// 最大实体度数
    pub max_entity_degree: usize,
    /// 连通分量数
    pub connected_components: usize,
    /// 图密度（0-1）
    pub graph_density: f64,
}

/// 知识图谱配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphConfig {
    /// 是否启用知识图谱
    pub enabled: bool,
    /// 实体提取置信度阈值
    pub entity_extraction_threshold: f64,
    /// 关系提取置信度阈值
    pub relation_extraction_threshold: f64,
    /// 最大路径长度
    pub max_path_length: usize,
    /// 最大社区数量
    pub max_communities: usize,
    /// 是否启用实体链接
    pub enable_entity_linking: bool,
    /// 实体链接相似度阈值
    pub entity_linking_threshold: f64,
}

impl Default for KnowledgeGraphConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            entity_extraction_threshold: 0.5,
            relation_extraction_threshold: 0.5,
            max_path_length: 5,
            max_communities: 10,
            enable_entity_linking: true,
            entity_linking_threshold: 0.8,
        }
    }
}

// ============================================================================
// 知识图谱
// ============================================================================

/// 知识图谱
#[derive(Clone)]
pub struct KnowledgeGraph {
    /// 配置
    config: KnowledgeGraphConfig,
    /// 实体映射（ID -> 实体）
    entities: Arc<Mutex<HashMap<String, Entity>>>,
    /// 关系映射（ID -> 关系）
    relations: Arc<Mutex<HashMap<String, Relation>>>,
    /// 邻接表（实体 ID -> 关系 ID 列表）
    adjacency: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// 实体名称索引（名称 -> 实体 ID 列表，用于实体链接）
    name_index: Arc<Mutex<HashMap<String, Vec<String>>>>,
}

impl KnowledgeGraph {
    /// 创建新的知识图谱
    pub fn new(config: KnowledgeGraphConfig) -> Self {
        Self {
            config,
            entities: Arc::new(Mutex::new(HashMap::new())),
            relations: Arc::new(Mutex::new(HashMap::new())),
            adjacency: Arc::new(Mutex::new(HashMap::new())),
            name_index: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(KnowledgeGraphConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &KnowledgeGraphConfig {
        &self.config
    }

    /// 添加实体
    pub fn add_entity(&self, entity: Entity) -> String {
        let entity_id = entity.id.clone();
        let entity_name = entity.name.clone();

        let mut entities = self.entities.lock();
        entities.insert(entity_id.clone(), entity);
        drop(entities);

        // 更新名称索引
        let mut name_index = self.name_index.lock();
        name_index
            .entry(entity_name)
            .or_insert_with(Vec::new)
            .push(entity_id.clone());
        drop(name_index);

        // 初始化邻接表
        let mut adjacency = self.adjacency.lock();
        adjacency.entry(entity_id.clone()).or_insert_with(Vec::new);
        drop(adjacency);

        info!(entity_id = %entity_id, "Entity added to knowledge graph");
        entity_id
    }

    /// 获取实体
    pub fn get_entity(&self, entity_id: &str) -> Option<Entity> {
        self.entities.lock().get(entity_id).cloned()
    }

    /// 删除实体
    pub fn remove_entity(&self, entity_id: &str) -> Option<Entity> {
        let mut entities = self.entities.lock();
        let entity = entities.remove(entity_id);
        drop(entities);

        if let Some(ref ent) = entity {
            // 从名称索引中移除
            let mut name_index = self.name_index.lock();
            if let Some(ids) = name_index.get_mut(&ent.name) {
                ids.retain(|id| id != entity_id);
                if ids.is_empty() {
                    name_index.remove(&ent.name);
                }
            }
            drop(name_index);

            // 移除相关关系
            let mut relations = self.relations.lock();
            // 先收集需要删除的关系 ID
            let rel_ids_to_remove: Vec<String> = relations
                .iter()
                .filter(|(_, rel)| rel.source_id == entity_id || rel.target_id == entity_id)
                .map(|(id, _)| id.clone())
                .collect();
            relations.retain(|_, rel| rel.source_id != entity_id && rel.target_id != entity_id);
            drop(relations);

            // 从邻接表中移除
            let mut adjacency = self.adjacency.lock();
            adjacency.remove(entity_id);
            // 清理其他实体的邻接表中指向该实体的关系
            let rel_ids_set: HashSet<String> = rel_ids_to_remove.into_iter().collect();
            for rel_ids in adjacency.values_mut() {
                rel_ids.retain(|rel_id| !rel_ids_set.contains(rel_id));
            }
            drop(adjacency);
        }

        info!(entity_id = %entity_id, "Entity removed from knowledge graph");
        entity
    }

    /// 添加关系
    pub fn add_relation(&self, relation: Relation) -> String {
        let relation_id = relation.id.clone();
        let source_id = relation.source_id.clone();
        let target_id = relation.target_id.clone();

        // 检查实体是否存在
        let entities = self.entities.lock();
        if !entities.contains_key(&source_id) || !entities.contains_key(&target_id) {
            drop(entities);
            warn!(
                source_id = %source_id,
                target_id = %target_id,
                "Cannot add relation: entity not found"
            );
            return String::new();
        }
        drop(entities);

        let mut relations = self.relations.lock();
        relations.insert(relation_id.clone(), relation);
        drop(relations);

        // 更新邻接表
        let mut adjacency = self.adjacency.lock();
        adjacency
            .entry(source_id.clone())
            .or_insert_with(Vec::new)
            .push(relation_id.clone());
        adjacency
            .entry(target_id.clone())
            .or_insert_with(Vec::new)
            .push(relation_id.clone());
        drop(adjacency);

        info!(
            relation_id = %relation_id,
            source = %source_id,
            target = %target_id,
            "Relation added to knowledge graph"
        );
        relation_id
    }

    /// 获取关系
    pub fn get_relation(&self, relation_id: &str) -> Option<Relation> {
        self.relations.lock().get(relation_id).cloned()
    }

    /// 删除关系
    pub fn remove_relation(&self, relation_id: &str) -> Option<Relation> {
        let mut relations = self.relations.lock();
        let relation = relations.remove(relation_id);
        drop(relations);

        if let Some(ref rel) = relation {
            // 从邻接表中移除
            let mut adjacency = self.adjacency.lock();
            if let Some(rel_ids) = adjacency.get_mut(&rel.source_id) {
                rel_ids.retain(|id| id != relation_id);
            }
            if let Some(rel_ids) = adjacency.get_mut(&rel.target_id) {
                rel_ids.retain(|id| id != relation_id);
            }
            drop(adjacency);
        }

        info!(relation_id = %relation_id, "Relation removed from knowledge graph");
        relation
    }

    /// 获取实体的邻居
    pub fn get_neighbors(&self, entity_id: &str) -> Vec<Entity> {
        let adjacency = self.adjacency.lock();
        let rel_ids = match adjacency.get(entity_id) {
            Some(ids) => ids.clone(),
            None => return Vec::new(),
        };
        drop(adjacency);

        let relations = self.relations.lock();
        let entities = self.entities.lock();

        let mut neighbors = HashSet::new();
        for rel_id in &rel_ids {
            if let Some(rel) = relations.get(rel_id) {
                let neighbor_id = if rel.source_id == entity_id {
                    &rel.target_id
                } else {
                    &rel.source_id
                };
                if let Some(entity) = entities.get(neighbor_id) {
                    neighbors.insert(entity.id.clone());
                }
            }
        }

        neighbors
            .into_iter()
            .filter_map(|id| entities.get(&id).cloned())
            .collect()
    }

    /// 获取实体的度数（连接的关系数）
    pub fn get_entity_degree(&self, entity_id: &str) -> usize {
        let adjacency = self.adjacency.lock();
        adjacency.get(entity_id).map(|ids| ids.len()).unwrap_or(0)
    }

    /// 最短路径查询（BFS）
    pub fn shortest_path(&self, source_id: &str, target_id: &str) -> Option<PathResult> {
        if source_id == target_id {
            return Some(PathResult {
                entity_ids: vec![source_id.to_string()],
                relation_ids: Vec::new(),
                path_length: 0,
                total_weight: 0.0,
            });
        }

        let max_length = self.config.max_path_length;
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut parent: HashMap<String, (String, String)> = HashMap::new(); // (entity_id, relation_id)

        visited.insert(source_id.to_string());
        queue.push_back(source_id.to_string());

        while let Some(current) = queue.pop_front() {
            let adjacency = self.adjacency.lock();
            let rel_ids = match adjacency.get(&current) {
                Some(ids) => ids.clone(),
                None => continue,
            };
            drop(adjacency);

            let relations = self.relations.lock();
            for rel_id in &rel_ids {
                if let Some(rel) = relations.get(rel_id) {
                    let neighbor = if rel.source_id == current {
                        &rel.target_id
                    } else {
                        &rel.source_id
                    };

                    if !visited.contains(neighbor) {
                        visited.insert(neighbor.clone());
                        parent.insert(neighbor.clone(), (current.clone(), rel_id.clone()));
                        queue.push_back(neighbor.clone());

                        if neighbor == target_id {
                            // 重建路径
                            let mut entity_ids = vec![target_id.to_string()];
                            let mut relation_ids = Vec::new();
                            let mut current = target_id.to_string();

                            while let Some((parent_entity, parent_relation)) = parent.get(&current) {
                                entity_ids.push(parent_entity.clone());
                                relation_ids.push(parent_relation.clone());
                                current = parent_entity.clone();
                            }

                            entity_ids.reverse();
                            relation_ids.reverse();

                            // 计算路径长度和总权重
                            let path_length = relation_ids.len();
                            let total_weight: f64 = relation_ids
                                .iter()
                                .filter_map(|id| relations.get(id).map(|r| r.weight))
                                .sum();

                            return Some(PathResult {
                                entity_ids,
                                relation_ids,
                                path_length,
                                total_weight,
                            });
                        }
                    }
                }
            }

            // 检查路径长度
            if let Some(path_len) = parent.get(&current).map(|_| {
                let mut len = 0;
                let mut curr = current.clone();
                while let Some((p, _)) = parent.get(&curr) {
                    len += 1;
                    curr = p.clone();
                }
                len
            }) {
                if path_len >= max_length {
                    continue;
                }
            }
        }

        None
    }

    /// 实体链接（根据名称查找实体）
    pub fn link_entity(&self, name: &str) -> Vec<Entity> {
        if !self.config.enable_entity_linking {
            return Vec::new();
        }

        let name_index = self.name_index.lock();
        let entities = self.entities.lock();

        // 精确匹配
        if let Some(ids) = name_index.get(name) {
            return ids.iter().filter_map(|id| entities.get(id).cloned()).collect();
        }

        // 模糊匹配（简单实现：包含匹配）
        let mut results = Vec::new();
        for (entity_name, ids) in name_index.iter() {
            if entity_name.contains(name) || name.contains(entity_name) {
                for id in ids {
                    if let Some(entity) = entities.get(id) {
                        if entity.confidence >= self.config.entity_linking_threshold {
                            results.push(entity.clone());
                        }
                    }
                }
            }
        }

        results
    }

    /// 社区发现（简化实现：基于连通分量）
    pub fn detect_communities(&self) -> Vec<CommunityResult> {
        let max_communities = self.config.max_communities;
        let entities = self.entities.lock();
        let entity_ids: Vec<String> = entities.keys().cloned().collect();
        drop(entities);

        let mut visited = HashSet::new();
        let mut communities = Vec::new();

        for entity_id in &entity_ids {
            if visited.contains(entity_id) {
                continue;
            }

            // BFS 找连通分量
            let mut community = Vec::new();
            let mut queue = VecDeque::new();
            queue.push_back(entity_id.clone());
            visited.insert(entity_id.clone());

            while let Some(current) = queue.pop_front() {
                community.push(current.clone());

                let neighbors = self.get_neighbors(&current);
                for neighbor in neighbors {
                    if !visited.contains(&neighbor.id) {
                        visited.insert(neighbor.id.clone());
                        queue.push_back(neighbor.id);
                    }
                }
            }

            // 计算社区密度
            let size = community.len();
            let mut internal_edges = 0;

            // 先获取所有关系数据，避免死锁
            let relations = self.relations.lock();
            let adjacency = self.adjacency.lock();
            for id in &community {
                if let Some(rel_ids) = adjacency.get(id) {
                    for rel_id in rel_ids {
                        if let Some(rel) = relations.get(rel_id) {
                            if community.contains(&rel.source_id) && community.contains(&rel.target_id) {
                                internal_edges += 1;
                            }
                        }
                    }
                }
            }
            drop(adjacency);
            drop(relations);

            let density = if size > 1 {
                internal_edges as f64 / (size * (size - 1) / 2) as f64
            } else {
                0.0
            };

            communities.push(CommunityResult {
                community_id: communities.len(),
                entity_ids: community,
                size,
                density,
            });

            if communities.len() >= max_communities {
                break;
            }
        }

        // 按大小排序
        communities.sort_by(|a, b| b.size.cmp(&a.size));
        communities
    }

    /// 获取知识图谱统计
    pub fn get_stats(&self) -> KnowledgeGraphStats {
        // 第一部分：持有锁计算基本统计信息
        let (total_entities, total_relations, entities_by_type, relations_by_type, avg_degree, max_degree, graph_density) = {
            let entities = self.entities.lock();
            let relations = self.relations.lock();
            let adjacency = self.adjacency.lock();

            let total_entities = entities.len() as u64;
            let total_relations = relations.len() as u64;

            // 按类型统计
            let mut entities_by_type = HashMap::new();
            for entity in entities.values() {
                let type_name = entity.entity_type.as_str().to_string();
                *entities_by_type.entry(type_name).or_insert(0u64) += 1;
            }

            let mut relations_by_type = HashMap::new();
            for relation in relations.values() {
                let type_name = relation.relation_type.as_str().to_string();
                *relations_by_type.entry(type_name).or_insert(0u64) += 1;
            }

            // 度数统计
            let mut total_degree = 0;
            let mut max_degree = 0;
            for rel_ids in adjacency.values() {
                let degree = rel_ids.len();
                total_degree += degree;
                max_degree = max_degree.max(degree);
            }

            let avg_degree = if total_entities > 0 {
                total_degree as f64 / total_entities as f64
            } else {
                0.0
            };

            // 图密度
            let graph_density = if total_entities > 1 {
                total_relations as f64 / (total_entities * (total_entities - 1) / 2) as f64
            } else {
                0.0
            };

            (total_entities, total_relations, entities_by_type, relations_by_type, avg_degree, max_degree, graph_density)
        }; // 锁在这里释放

        // 第二部分：释放锁后调用 detect_communities
        let connected_components = self.detect_communities().len();

        KnowledgeGraphStats {
            total_entities,
            total_relations,
            entities_by_type,
            relations_by_type,
            avg_entity_degree: avg_degree,
            max_entity_degree: max_degree,
            connected_components,
            graph_density,
        }
    }

    /// 获取所有实体
    pub fn list_entities(&self) -> Vec<Entity> {
        self.entities.lock().values().cloned().collect()
    }

    /// 获取所有关系
    pub fn list_relations(&self) -> Vec<Relation> {
        self.relations.lock().values().cloned().collect()
    }

    /// 清空图谱
    pub fn clear(&self) {
        self.entities.lock().clear();
        self.relations.lock().clear();
        self.adjacency.lock().clear();
        self.name_index.lock().clear();
        info!("Knowledge graph cleared");
    }
}

// ============================================================================
// 实体关系提取器
// ============================================================================

/// 实体关系提取器
pub struct EntityRelationExtractor {
    /// 配置
    config: KnowledgeGraphConfig,
}

impl EntityRelationExtractor {
    /// 创建新的提取器
    pub fn new(config: KnowledgeGraphConfig) -> Self {
        Self { config }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(KnowledgeGraphConfig::default())
    }

    /// 从文本中提取实体和关系（简化实现，基于规则）
    pub fn extract(&self, text: &str) -> ExtractionResult {
        let start_time = std::time::Instant::now();

        let mut entities = Vec::new();
        let relations = Vec::new();

        // 简化实现：基于正则表达式的实体提取
        // 实际实现中应该使用 NLP 模型（如 spaCy、HanLP、LLM 等）

        // 提取日期时间
        let date_patterns = [
            r"\d{4}年\d{1,2}月\d{1,2}日",
            r"\d{4}-\d{2}-\d{2}",
            r"\d{1,2}月\d{1,2}日",
        ];

        for pattern in &date_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for mat in re.find_iter(text) {
                    entities.push(ExtractedEntity {
                        text: mat.as_str().to_string(),
                        entity_type: EntityType::DateTime,
                        start_offset: mat.start(),
                        end_offset: mat.end(),
                        confidence: 0.9,
                    });
                }
            }
        }

        // 提取组织（简化：包含"公司"、"集团"、"大学"等关键词）
        let org_keywords = ["公司", "集团", "大学", "学院", "研究院", "协会", "委员会"];
        for keyword in &org_keywords {
            let pattern = format!(r"[\u4e00-\u9fa5a-zA-Z0-9]+{}", keyword);
            if let Ok(re) = regex::Regex::new(&pattern) {
                for mat in re.find_iter(text) {
                    entities.push(ExtractedEntity {
                        text: mat.as_str().to_string(),
                        entity_type: EntityType::Organization,
                        start_offset: mat.start(),
                        end_offset: mat.end(),
                        confidence: 0.8,
                    });
                }
            }
        }

        // 提取人名（简化：2-4个中文字符，常见姓氏开头）
        let surnames = ["张", "王", "李", "赵", "刘", "陈", "杨", "黄", "周", "吴", "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗"];
        for surname in &surnames {
            let pattern = format!(r"{}[\u4e00-\u9fa5]{{1,3}}", surname);
            if let Ok(re) = regex::Regex::new(&pattern) {
                for mat in re.find_iter(text) {
                    let name = mat.as_str();
                    // 避免匹配到组织名
                    if !org_keywords.iter().any(|k| name.contains(k)) {
                        entities.push(ExtractedEntity {
                            text: name.to_string(),
                            entity_type: EntityType::Person,
                            start_offset: mat.start(),
                            end_offset: mat.end(),
                            confidence: 0.6,
                        });
                    }
                }
            }
        }

        // 去重（基于文本和类型）
        let mut seen = HashSet::new();
        entities.retain(|e| {
            let key = format!("{}_{}", e.text, e.entity_type.as_str());
            if seen.contains(&key) {
                false
            } else {
                seen.insert(key);
                true
            }
        });

        // 过滤低置信度实体
        entities.retain(|e| e.confidence >= self.config.entity_extraction_threshold);

        let duration_ms = start_time.elapsed().as_millis() as u64;

        debug!(
            entities = entities.len(),
            relations = relations.len(),
            duration_ms = duration_ms,
            "Entity relation extraction completed"
        );

        ExtractionResult {
            entities,
            relations,
            text_length: text.len(),
            duration_ms,
        }
    }

    /// 将提取结果添加到知识图谱
    pub fn add_to_graph(&self, extraction: &ExtractionResult, graph: &KnowledgeGraph) {
        // 添加实体
        let mut entity_id_map = HashMap::new();
        for extracted_entity in &extraction.entities {
            // 尝试实体链接
            let linked = graph.link_entity(&extracted_entity.text);
            let entity_id = if let Some(existing) = linked.first() {
                existing.id.clone()
            } else {
                // 创建新实体
                let id = format!("entity_{}", uuid::Uuid::new_v4());
                let mut entity = Entity::new(&id, &extracted_entity.text, extracted_entity.entity_type.clone());
                entity.confidence = extracted_entity.confidence;
                graph.add_entity(entity);
                id
            };
            entity_id_map.insert(extracted_entity.text.clone(), entity_id);
        }

        // 添加关系
        for extracted_relation in &extraction.relations {
            if let (Some(source_id), Some(target_id)) = (
                entity_id_map.get(&extracted_relation.source_text),
                entity_id_map.get(&extracted_relation.target_text),
            ) {
                let mut relation = Relation::new(source_id, target_id, extracted_relation.relation_type.clone());
                relation.confidence = extracted_relation.confidence;
                graph.add_relation(relation);
            }
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_graph() -> KnowledgeGraph {
        let graph = KnowledgeGraph::with_defaults();

        // 添加实体
        let person1 = Entity::new("p1", "张三", EntityType::Person);
        let person2 = Entity::new("p2", "李四", EntityType::Person);
        let org1 = Entity::new("o1", "ABC公司", EntityType::Organization);
        let loc1 = Entity::new("l1", "北京", EntityType::Location);

        graph.add_entity(person1);
        graph.add_entity(person2);
        graph.add_entity(org1);
        graph.add_entity(loc1);

        // 添加关系
        graph.add_relation(Relation::new("p1", "o1", RelationType::WorksAt));
        graph.add_relation(Relation::new("p2", "o1", RelationType::WorksAt));
        graph.add_relation(Relation::new("o1", "l1", RelationType::LocatedIn));
        graph.add_relation(Relation::new("p1", "p2", RelationType::RelatedTo));

        graph
    }

    #[test]
    fn test_entity_type_as_str() {
        assert_eq!(EntityType::Person.as_str(), "person");
        assert_eq!(EntityType::Organization.as_str(), "organization");
        assert_eq!(EntityType::Location.as_str(), "location");
        assert_eq!(EntityType::Custom("test".to_string()).as_str(), "test");
    }

    #[test]
    fn test_entity_type_from_str() {
        assert_eq!(EntityType::from_str("person"), EntityType::Person);
        assert_eq!(EntityType::from_str("organization"), EntityType::Organization);
        assert_eq!(EntityType::from_str("custom"), EntityType::Custom("custom".to_string()));
    }

    #[test]
    fn test_relation_type_as_str() {
        assert_eq!(RelationType::WorksAt.as_str(), "works_at");
        assert_eq!(RelationType::LocatedIn.as_str(), "located_in");
        assert_eq!(RelationType::RelatedTo.as_str(), "related_to");
    }

    #[test]
    fn test_entity_new() {
        let entity = Entity::new("e1", "Test Entity", EntityType::Person);
        assert_eq!(entity.id, "e1");
        assert_eq!(entity.name, "Test Entity");
        assert_eq!(entity.entity_type, EntityType::Person);
        assert_eq!(entity.confidence, 1.0);
        assert!(entity.properties.is_empty());
        assert!(entity.aliases.is_empty());
    }

    #[test]
    fn test_entity_add_property() {
        let mut entity = Entity::new("e1", "Test", EntityType::Person);
        entity.add_property("age", "30");
        assert_eq!(entity.properties.get("age"), Some(&"30".to_string()));
    }

    #[test]
    fn test_entity_add_alias() {
        let mut entity = Entity::new("e1", "Test", EntityType::Person);
        entity.add_alias("别名");
        assert_eq!(entity.aliases.len(), 1);
        assert_eq!(entity.aliases[0], "别名");

        // 重复添加不应该重复
        entity.add_alias("别名");
        assert_eq!(entity.aliases.len(), 1);
    }

    #[test]
    fn test_relation_new() {
        let relation = Relation::new("s1", "t1", RelationType::WorksAt);
        assert_eq!(relation.source_id, "s1");
        assert_eq!(relation.target_id, "t1");
        assert_eq!(relation.relation_type, RelationType::WorksAt);
        assert_eq!(relation.weight, 1.0);
    }

    #[test]
    fn test_knowledge_graph_add_and_get_entity() {
        let graph = KnowledgeGraph::with_defaults();
        let entity = Entity::new("e1", "Test", EntityType::Person);
        graph.add_entity(entity);

        let retrieved = graph.get_entity("e1");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "Test");
    }

    #[test]
    fn test_knowledge_graph_remove_entity() {
        let graph = create_test_graph();
        assert!(graph.get_entity("p1").is_some());

        graph.remove_entity("p1");
        assert!(graph.get_entity("p1").is_none());
    }

    #[test]
    fn test_knowledge_graph_add_and_get_relation() {
        let graph = create_test_graph();
        let relations = graph.list_relations();
        assert_eq!(relations.len(), 4);
    }

    #[test]
    fn test_knowledge_graph_get_neighbors() {
        let graph = create_test_graph();
        let neighbors = graph.get_neighbors("p1");
        assert_eq!(neighbors.len(), 2); // o1 和 p2
    }

    #[test]
    fn test_knowledge_graph_get_entity_degree() {
        let graph = create_test_graph();
        assert_eq!(graph.get_entity_degree("p1"), 2); // works_at + related_to
        assert_eq!(graph.get_entity_degree("o1"), 3); // p1 works_at + p2 works_at + located_in
    }

    #[test]
    fn test_knowledge_graph_shortest_path() {
        let graph = create_test_graph();

        // p1 -> o1 -> l1
        let path = graph.shortest_path("p1", "l1");
        assert!(path.is_some());
        let path = path.unwrap();
        assert_eq!(path.path_length, 2);
        assert_eq!(path.entity_ids, vec!["p1", "o1", "l1"]);
    }

    #[test]
    fn test_knowledge_graph_shortest_path_same_entity() {
        let graph = create_test_graph();
        let path = graph.shortest_path("p1", "p1");
        assert!(path.is_some());
        assert_eq!(path.unwrap().path_length, 0);
    }

    #[test]
    fn test_knowledge_graph_link_entity() {
        let graph = create_test_graph();
        let linked = graph.link_entity("张三");
        assert_eq!(linked.len(), 1);
        assert_eq!(linked[0].name, "张三");
    }

    #[test]
    fn test_knowledge_graph_detect_communities() {
        let graph = create_test_graph();
        let communities = graph.detect_communities();
        assert!(!communities.is_empty());
        // 所有实体应该在一个连通分量中
        assert_eq!(communities[0].size, 4);
    }

    #[test]
    fn test_knowledge_graph_get_stats() {
        let graph = create_test_graph();
        let stats = graph.get_stats();
        assert_eq!(stats.total_entities, 4);
        assert_eq!(stats.total_relations, 4);
        assert!(stats.avg_entity_degree > 0.0);
        assert!(stats.graph_density > 0.0);
    }

    #[test]
    fn test_knowledge_graph_list_entities() {
        let graph = create_test_graph();
        let entities = graph.list_entities();
        assert_eq!(entities.len(), 4);
    }

    #[test]
    fn test_knowledge_graph_clear() {
        let graph = create_test_graph();
        assert_eq!(graph.list_entities().len(), 4);

        graph.clear();
        assert_eq!(graph.list_entities().len(), 0);
        assert_eq!(graph.list_relations().len(), 0);
    }

    #[test]
    fn test_knowledge_graph_config_default() {
        let config = KnowledgeGraphConfig::default();
        assert!(config.enabled);
        assert_eq!(config.entity_extraction_threshold, 0.5);
        assert_eq!(config.max_path_length, 5);
        assert!(config.enable_entity_linking);
    }

    #[test]
    fn test_extracted_entity() {
        let entity = ExtractedEntity {
            text: "测试".to_string(),
            entity_type: EntityType::Person,
            start_offset: 0,
            end_offset: 2,
            confidence: 0.9,
        };
        assert_eq!(entity.text, "测试");
        assert_eq!(entity.confidence, 0.9);
    }

    #[test]
    fn test_extraction_result() {
        let result = ExtractionResult {
            entities: vec![],
            relations: vec![],
            text_length: 100,
            duration_ms: 50,
        };
        assert_eq!(result.text_length, 100);
        assert_eq!(result.duration_ms, 50);
    }

    #[test]
    fn test_path_result() {
        let path = PathResult {
            entity_ids: vec!["e1".to_string(), "e2".to_string()],
            relation_ids: vec!["r1".to_string()],
            path_length: 1,
            total_weight: 1.0,
        };
        assert_eq!(path.path_length, 1);
        assert_eq!(path.entity_ids.len(), 2);
    }

    #[test]
    fn test_community_result() {
        let community = CommunityResult {
            community_id: 0,
            entity_ids: vec!["e1".to_string(), "e2".to_string()],
            size: 2,
            density: 0.5,
        };
        assert_eq!(community.size, 2);
        assert_eq!(community.density, 0.5);
    }
}
