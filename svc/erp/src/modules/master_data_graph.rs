// ==================== V43.0 AC-15: 主数据图谱 + 知识图谱 + 智能推荐 ====================

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::LazyLock;
use tokio::sync::RwLock;

use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::ApiState;

// ==================== 主数据图谱类型 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub entity_type: String,
    pub domain: String,
    pub properties: serde_json::Value,
    pub degree: i32,
    pub centrality: f64,
    pub cluster: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub relation_type: String,
    pub label: String,
    pub weight: f64,
    pub properties: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MasterDataGraph {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub node_count: usize,
    pub edge_count: usize,
    pub avg_degree: f64,
    pub density: f64,
    pub connected_components: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphStats {
    pub node_count: usize,
    pub edge_count: usize,
    pub avg_degree: f64,
    pub density: f64,
    pub connected_components: usize,
    pub nodes_by_domain: HashMap<String, usize>,
    pub edges_by_relation: HashMap<String, usize>,
    pub top_degree_nodes: Vec<(String, String, i32)>,
    pub avg_clustering_coefficient: f64,
}

#[derive(Debug, Deserialize)]
pub struct GraphQuery {
    pub domain: Option<String>,
    pub entity_type: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct NeighborQuery {
    pub relation_type: Option<String>,
    pub direction: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct ShortestPathQuery {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Deserialize)]
pub struct MultiHopQuery {
    pub max_hops: Option<usize>,
    pub relation_type: Option<String>,
}

// ==================== 知识图谱类型 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Concept {
    pub id: String,
    pub name: String,
    pub concept_type: String,
    pub description: String,
    pub parent_id: Option<String>,
    pub properties: serde_json::Value,
    pub synonyms: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KnowledgeTriple {
    pub subject: String,
    pub predicate: String,
    pub object: String,
    pub confidence: f64,
    pub source: String,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InferenceRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub condition_pattern: String,
    pub conclusion_pattern: String,
    pub confidence: f64,
    pub enabled: bool,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ConceptQuery {
    pub concept_type: Option<String>,
    pub parent_id: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct TripleQuery {
    pub subject: Option<String>,
    pub predicate: Option<String>,
    pub object: Option<String>,
    pub min_confidence: Option<f64>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct InferenceRequest {
    pub entity_id: String,
    pub rule_ids: Option<Vec<String>>,
    pub max_depth: Option<usize>,
}

#[derive(Debug, serde::Serialize)]
pub struct InferenceResult {
    pub entity_id: String,
    pub inferred_triples: Vec<KnowledgeTriple>,
    pub used_rules: Vec<String>,
    pub inference_depth: usize,
    pub total_inferred: usize,
}

// ==================== 智能推荐类型 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimilarEntity {
    pub entity_id: String,
    pub entity_type: String,
    pub entity_name: String,
    pub similarity: f64,
    pub similarity_reasons: Vec<String>,
    pub shared_attributes: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssociationRecommendation {
    pub source_entity_id: String,
    pub target_entity_id: String,
    pub target_entity_name: String,
    pub relation_type: String,
    pub confidence: f64,
    pub evidence: Vec<String>,
    pub support: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CompletionSuggestion {
    pub entity_id: String,
    pub entity_type: String,
    pub field_name: String,
    pub suggested_value: String,
    pub confidence: f64,
    pub source: String,
    pub reasoning: String,
}

#[derive(Debug, Deserialize)]
pub struct SimilarEntityQuery {
    pub entity_id: String,
    pub entity_type: Option<String>,
    pub top_k: Option<usize>,
    pub min_similarity: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct AssociationQuery {
    pub entity_id: String,
    pub relation_type: Option<String>,
    pub top_k: Option<usize>,
    pub min_confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CompletionQuery {
    pub entity_id: String,
    pub field_name: Option<String>,
    pub top_k: Option<usize>,
    pub min_confidence: Option<f64>,
}

// ==================== 内存存储 ====================

pub struct KnowledgeGraphStore {
    pub graph_nodes: RwLock<Vec<GraphNode>>,
    pub graph_edges: RwLock<Vec<GraphEdge>>,
    pub concepts: RwLock<Vec<Concept>>,
    pub triples: RwLock<Vec<KnowledgeTriple>>,
    pub inference_rules: RwLock<Vec<InferenceRule>>,
    pub initialized: RwLock<bool>,
}

impl Default for KnowledgeGraphStore {
    fn default() -> Self {
        Self {
            graph_nodes: RwLock::new(Vec::new()),
            graph_edges: RwLock::new(Vec::new()),
            concepts: RwLock::new(Vec::new()),
            triples: RwLock::new(Vec::new()),
            inference_rules: RwLock::new(Vec::new()),
            initialized: RwLock::new(false),
        }
    }
}

static KNOWLEDGE_GRAPH_STORE: LazyLock<KnowledgeGraphStore> =
    LazyLock::new(KnowledgeGraphStore::default);

pub fn get_knowledge_graph_store() -> &'static KnowledgeGraphStore {
    &KNOWLEDGE_GRAPH_STORE
}

async fn ensure_knowledge_graph_initialized() {
    let store = get_knowledge_graph_store();
    let mut initialized = store.initialized.write().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    let domains = vec![
        (
            "customer",
            "客户",
            vec!["C001", "C002", "C003", "C004", "C005"],
        ),
        ("supplier", "供应商", vec!["S001", "S002", "S003", "S004"]),
        (
            "material",
            "物料",
            vec!["M001", "M002", "M003", "M004", "M005", "M006"],
        ),
        ("employee", "员工", vec!["E001", "E002", "E003", "E004"]),
        ("account_subject", "会计科目", vec!["A001", "A002", "A003"]),
        ("organization", "组织", vec!["O001", "O002", "O003"]),
    ];

    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut edge_id_counter = 0;

    let default_names = vec!["未知", "未知", "未知", "未知"];
    let node_names: HashMap<&str, Vec<&str>> = [
        (
            "C001",
            vec![
                "华信科技有限公司",
                "北京市朝阳区",
                "高新技术企业",
                "A级客户",
            ],
        ),
        (
            "C002",
            vec!["盛达贸易集团", "上海市浦东新区", "贸易企业", "B级客户"],
        ),
        (
            "C003",
            vec!["恒泰制造股份", "广州市天河区", "制造企业", "A级客户"],
        ),
        (
            "C004",
            vec!["创新电子科技", "深圳市南山区", "电子企业", "A级客户"],
        ),
        (
            "C005",
            vec!["远景物流有限公司", "杭州市西湖区", "物流企业", "C级客户"],
        ),
        (
            "S001",
            vec!["原材料供应商A", "天津市滨海新区", "原材料", "合格供应商"],
        ),
        (
            "S002",
            vec!["零部件供应商B", "重庆市渝北区", "零部件", "优秀供应商"],
        ),
        (
            "S003",
            vec!["包装材料供应商C", "成都市武侯区", "包装材料", "合格供应商"],
        ),
        (
            "S004",
            vec!["设备供应商D", "武汉市洪山区", "生产设备", "战略供应商"],
        ),
        ("M001", vec!["产品甲", "电子产品", "成品", "高价值"]),
        ("M002", vec!["产品乙", "机械产品", "成品", "中价值"]),
        ("M003", vec!["原材料A", "金属材料", "原材料", "批量采购"]),
        ("M004", vec!["原材料B", "塑料材料", "原材料", "批量采购"]),
        ("M005", vec!["零部件X", "电子元件", "零部件", "标准件"]),
        ("M006", vec!["零部件Y", "机械元件", "零部件", "定制件"]),
        ("E001", vec!["张三", "销售部", "销售经理", "高级"]),
        ("E002", vec!["李四", "采购部", "采购主管", "中级"]),
        ("E003", vec!["王五", "技术部", "技术总监", "高级"]),
        ("E004", vec!["赵六", "财务部", "财务主管", "中级"]),
        ("A001", vec!["应收账款", "资产类", "流动资产", "往来科目"]),
        ("A002", vec!["应付账款", "负债类", "流动负债", "往来科目"]),
        (
            "A003",
            vec!["主营业务收入", "损益类", "营业收入", "收入科目"],
        ),
        ("O001", vec!["总部", "集团总部", "一级组织", "北京"]),
        ("O002", vec!["华东分公司", "区域分公司", "二级组织", "上海"]),
        ("O003", vec!["华南分公司", "区域分公司", "二级组织", "广州"]),
    ]
    .iter()
    .cloned()
    .collect();

    for (domain, domain_label, codes) in &domains {
        for code in codes {
            let names = node_names.get(&code[..]).unwrap_or(&default_names);
            nodes.push(GraphNode {
                id: code.to_string(),
                label: names[0].to_string(),
                entity_type: domain_label.to_string(),
                domain: domain.to_string(),
                properties: serde_json::json!({
                    "code": code,
                    "category": names[1],
                    "level": names[2],
                    "grade": names[3],
                }),
                degree: 0,
                centrality: 0.0,
                cluster: Some(domain.to_string()),
            });
        }
    }

    let edge_definitions = vec![
        ("C001", "C002", "partner", "合作伙伴", 0.8),
        ("C001", "C003", "same_industry", "同行业", 0.6),
        ("C002", "C004", "customer_of", "客户关系", 0.7),
        ("C003", "C004", "competitor", "竞争对手", 0.5),
        ("C001", "S001", "supplies_to", "供应关系", 0.9),
        ("C001", "S002", "supplies_to", "供应关系", 0.85),
        ("C002", "S003", "supplies_to", "供应关系", 0.8),
        ("C003", "S001", "supplies_to", "供应关系", 0.75),
        ("C003", "S004", "supplies_to", "供应关系", 0.9),
        ("C004", "S002", "supplies_to", "供应关系", 0.8),
        ("C004", "S004", "supplies_to", "供应关系", 0.7),
        ("S001", "M003", "supplies", "供应物料", 0.95),
        ("S001", "M004", "supplies", "供应物料", 0.9),
        ("S002", "M005", "supplies", "供应物料", 0.95),
        ("S002", "M006", "supplies", "供应物料", 0.85),
        ("S003", "M001", "supplies", "供应物料", 0.7),
        ("S004", "M001", "produces_with", "生产设备", 0.8),
        ("S004", "M002", "produces_with", "生产设备", 0.75),
        ("M001", "M003", "contains", "包含原材料", 0.9),
        ("M001", "M005", "contains", "包含零部件", 0.95),
        ("M002", "M004", "contains", "包含原材料", 0.85),
        ("M002", "M006", "contains", "包含零部件", 0.9),
        ("E001", "C001", "manages", "负责客户", 0.8),
        ("E001", "C002", "manages", "负责客户", 0.7),
        ("E002", "S001", "manages", "负责供应商", 0.8),
        ("E002", "S002", "manages", "负责供应商", 0.75),
        ("E003", "M001", "manages", "负责产品", 0.85),
        ("E003", "M002", "manages", "负责产品", 0.8),
        ("E004", "A001", "manages", "负责科目", 0.9),
        ("E004", "A002", "manages", "负责科目", 0.9),
        ("E004", "A003", "manages", "负责科目", 0.85),
        ("O001", "O002", "has_subsidiary", "下辖分公司", 0.95),
        ("O001", "O003", "has_subsidiary", "下辖分公司", 0.95),
        ("O002", "C002", "serves", "服务客户", 0.7),
        ("O003", "C003", "serves", "服务客户", 0.75),
        ("O003", "C004", "serves", "服务客户", 0.7),
        ("C001", "A001", "related_to", "关联科目", 0.6),
        ("C001", "A003", "related_to", "关联科目", 0.5),
        ("S001", "A002", "related_to", "关联科目", 0.6),
    ];

    for (src, tgt, rel_type, label, weight) in edge_definitions {
        let edge_id = format!("edge_{}", edge_id_counter);
        edges.push(GraphEdge {
            id: edge_id,
            source: src.to_string(),
            target: tgt.to_string(),
            relation_type: rel_type.to_string(),
            label: label.to_string(),
            weight,
            properties: serde_json::json!({
                "created_at": now,
                "source_system": "mdm",
            }),
        });
        edge_id_counter += 1;

        if let Some(node) = nodes.iter_mut().find(|n| n.id == src) {
            node.degree += 1;
        }
        if let Some(node) = nodes.iter_mut().find(|n| n.id == tgt) {
            node.degree += 1;
        }
    }

    let node_count = nodes.len();
    for node in &mut nodes {
        node.centrality = if node_count > 1 {
            node.degree as f64 / (node_count as f64 - 1.0)
        } else {
            0.0
        };
    }

    let concepts = vec![
        Concept {
            id: "concept_1".to_string(),
            name: "客户".to_string(),
            concept_type: "domain".to_string(),
            description: "企业的客户实体，包括个人客户和企业客户".to_string(),
            parent_id: None,
            properties: serde_json::json!({"color": "#3b82f6"}),
            synonyms: vec!["顾客".to_string(), "Client".to_string()],
        },
        Concept {
            id: "concept_2".to_string(),
            name: "供应商".to_string(),
            concept_type: "domain".to_string(),
            description: "为企业提供货物或服务的外部实体".to_string(),
            parent_id: None,
            properties: serde_json::json!({"color": "#10b981"}),
            synonyms: vec!["供货商".to_string(), "Vendor".to_string()],
        },
        Concept {
            id: "concept_3".to_string(),
            name: "物料".to_string(),
            concept_type: "domain".to_string(),
            description: "企业生产经营中涉及的各类物品".to_string(),
            parent_id: None,
            properties: serde_json::json!({"color": "#f59e0b"}),
            synonyms: vec!["物资".to_string(), "Material".to_string()],
        },
        Concept {
            id: "concept_4".to_string(),
            name: "员工".to_string(),
            concept_type: "domain".to_string(),
            description: "企业的雇员，包括正式员工和临时员工".to_string(),
            parent_id: None,
            properties: serde_json::json!({"color": "#8b5cf6"}),
            synonyms: vec!["职员".to_string(), "Employee".to_string()],
        },
        Concept {
            id: "concept_5".to_string(),
            name: "会计科目".to_string(),
            concept_type: "domain".to_string(),
            description: "财务核算中的科目分类".to_string(),
            parent_id: None,
            properties: serde_json::json!({"color": "#ef4444"}),
            synonyms: vec!["科目".to_string(), "Account".to_string()],
        },
        Concept {
            id: "concept_6".to_string(),
            name: "组织".to_string(),
            concept_type: "domain".to_string(),
            description: "企业的组织结构单元".to_string(),
            parent_id: None,
            properties: serde_json::json!({"color": "#06b6d4"}),
            synonyms: vec!["部门".to_string(), "Organization".to_string()],
        },
        Concept {
            id: "concept_7".to_string(),
            name: "A级客户".to_string(),
            concept_type: "classification".to_string(),
            description: "高价值客户，信用等级最高".to_string(),
            parent_id: Some("concept_1".to_string()),
            properties: serde_json::json!({"level": "A", "priority": 1}),
            synonyms: vec!["优质客户".to_string()],
        },
        Concept {
            id: "concept_8".to_string(),
            name: "战略供应商".to_string(),
            concept_type: "classification".to_string(),
            description: "具有战略意义的重要供应商".to_string(),
            parent_id: Some("concept_2".to_string()),
            properties: serde_json::json!({"level": "strategic", "priority": 1}),
            synonyms: vec!["核心供应商".to_string()],
        },
        Concept {
            id: "concept_9".to_string(),
            name: "成品".to_string(),
            concept_type: "classification".to_string(),
            description: "已完成生产可销售的产品".to_string(),
            parent_id: Some("concept_3".to_string()),
            properties: serde_json::json!({"type": "finished"}),
            synonyms: vec!["产成品".to_string()],
        },
        Concept {
            id: "concept_10".to_string(),
            name: "原材料".to_string(),
            concept_type: "classification".to_string(),
            description: "用于生产的原始材料".to_string(),
            parent_id: Some("concept_3".to_string()),
            properties: serde_json::json!({"type": "raw"}),
            synonyms: vec!["原料".to_string()],
        },
    ];

    let triples = vec![
        KnowledgeTriple {
            subject: "C001".to_string(),
            predicate: "is_a".to_string(),
            object: "A级客户".to_string(),
            confidence: 0.95,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "C003".to_string(),
            predicate: "is_a".to_string(),
            object: "A级客户".to_string(),
            confidence: 0.92,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "C004".to_string(),
            predicate: "is_a".to_string(),
            object: "A级客户".to_string(),
            confidence: 0.9,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "S004".to_string(),
            predicate: "is_a".to_string(),
            object: "战略供应商".to_string(),
            confidence: 0.93,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "M001".to_string(),
            predicate: "is_a".to_string(),
            object: "成品".to_string(),
            confidence: 0.98,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "M002".to_string(),
            predicate: "is_a".to_string(),
            object: "成品".to_string(),
            confidence: 0.97,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "M003".to_string(),
            predicate: "is_a".to_string(),
            object: "原材料".to_string(),
            confidence: 0.96,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "M004".to_string(),
            predicate: "is_a".to_string(),
            object: "原材料".to_string(),
            confidence: 0.95,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "C001".to_string(),
            predicate: "located_in".to_string(),
            object: "北京".to_string(),
            confidence: 0.99,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "C002".to_string(),
            predicate: "located_in".to_string(),
            object: "上海".to_string(),
            confidence: 0.99,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "C003".to_string(),
            predicate: "located_in".to_string(),
            object: "广州".to_string(),
            confidence: 0.98,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "C004".to_string(),
            predicate: "located_in".to_string(),
            object: "深圳".to_string(),
            confidence: 0.98,
            source: "mdm_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "E001".to_string(),
            predicate: "works_in".to_string(),
            object: "销售部".to_string(),
            confidence: 0.95,
            source: "hr_system".to_string(),
            created_at: now.clone(),
        },
        KnowledgeTriple {
            subject: "E002".to_string(),
            predicate: "works_in".to_string(),
            object: "采购部".to_string(),
            confidence: 0.95,
            source: "hr_system".to_string(),
            created_at: now.clone(),
        },
    ];

    let inference_rules = vec![
        InferenceRule {
            id: "rule_1".to_string(),
            name: "间接供应推理".to_string(),
            description: "如果A供应B，B包含C，则A间接供应C".to_string(),
            condition_pattern: "A supplies B, B contains C".to_string(),
            conclusion_pattern: "A indirect_supplies C".to_string(),
            confidence: 0.7,
            enabled: true,
        },
        InferenceRule {
            id: "rule_2".to_string(),
            name: "同行业需求推理".to_string(),
            description: "同行业企业可能有相似需求".to_string(),
            condition_pattern: "A same_industry B".to_string(),
            conclusion_pattern: "A similar_needs B".to_string(),
            confidence: 0.6,
            enabled: true,
        },
        InferenceRule {
            id: "rule_3".to_string(),
            name: "竞争对手供应商推理".to_string(),
            description: "竞争对手的供应商可能也是潜在供应商".to_string(),
            condition_pattern: "A competitor B, B supplies_to C".to_string(),
            conclusion_pattern: "A potential_supplier C".to_string(),
            confidence: 0.5,
            enabled: true,
        },
        InferenceRule {
            id: "rule_4".to_string(),
            name: "子公司服务推理".to_string(),
            description: "母公司服务的客户，子公司也可能服务".to_string(),
            condition_pattern: "A has_subsidiary B, A serves C".to_string(),
            conclusion_pattern: "B serves C".to_string(),
            confidence: 0.65,
            enabled: true,
        },
        InferenceRule {
            id: "rule_5".to_string(),
            name: "间接包含推理".to_string(),
            description: "如果A包含B，B包含C，则A间接包含C".to_string(),
            condition_pattern: "A contains B, B contains C".to_string(),
            conclusion_pattern: "A indirect_contains C".to_string(),
            confidence: 0.8,
            enabled: true,
        },
    ];

    *store.graph_nodes.write().await = nodes;
    *store.graph_edges.write().await = edges;
    *store.concepts.write().await = concepts;
    *store.triples.write().await = triples;
    *store.inference_rules.write().await = inference_rules;
    *initialized = true;
}

// ==================== 图算法实现 ====================

fn build_adjacency_list(edges: &[GraphEdge]) -> HashMap<String, Vec<String>> {
    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for edge in edges {
        adj.entry(edge.source.clone())
            .or_insert_with(Vec::new)
            .push(edge.target.clone());
        adj.entry(edge.target.clone())
            .or_insert_with(Vec::new)
            .push(edge.source.clone());
    }
    adj
}

fn shortest_path_bfs(edges: &[GraphEdge], source: &str, target: &str) -> Option<Vec<String>> {
    if source == target {
        return Some(vec![source.to_string()]);
    }

    let adj = build_adjacency_list(edges);
    let mut visited: HashSet<String> = HashSet::new();
    let mut queue: VecDeque<(String, Vec<String>)> = VecDeque::new();
    queue.push_back((source.to_string(), vec![source.to_string()]));
    visited.insert(source.to_string());

    while let Some((current, path)) = queue.pop_front() {
        if let Some(neighbors) = adj.get(&current) {
            for neighbor in neighbors {
                if !visited.contains(neighbor) {
                    let mut new_path = path.clone();
                    new_path.push(neighbor.clone());
                    if neighbor == target {
                        return Some(new_path);
                    }
                    visited.insert(neighbor.clone());
                    queue.push_back((neighbor.clone(), new_path));
                }
            }
        }
    }

    None
}

fn count_connected_components(nodes: &[GraphNode], edges: &[GraphEdge]) -> usize {
    let adj = build_adjacency_list(edges);
    let mut visited: HashSet<String> = HashSet::new();
    let mut count = 0;

    for node in nodes {
        if !visited.contains(&node.id) {
            count += 1;
            let mut queue: VecDeque<String> = VecDeque::new();
            queue.push_back(node.id.clone());
            visited.insert(node.id.clone());

            while let Some(current) = queue.pop_front() {
                if let Some(neighbors) = adj.get(&current) {
                    for neighbor in neighbors {
                        if !visited.contains(neighbor) {
                            visited.insert(neighbor.clone());
                            queue.push_back(neighbor.clone());
                        }
                    }
                }
            }
        }
    }

    count
}

fn calculate_graph_stats(nodes: &[GraphNode], edges: &[GraphEdge]) -> GraphStats {
    let node_count = nodes.len();
    let edge_count = edges.len();

    let avg_degree = if node_count > 0 {
        (2.0 * edge_count as f64) / node_count as f64
    } else {
        0.0
    };

    let density = if node_count > 1 {
        (2.0 * edge_count as f64) / (node_count as f64 * (node_count as f64 - 1.0))
    } else {
        0.0
    };

    let connected_components = count_connected_components(nodes, edges);

    let mut nodes_by_domain: HashMap<String, usize> = HashMap::new();
    for node in nodes {
        *nodes_by_domain.entry(node.domain.clone()).or_insert(0) += 1;
    }

    let mut edges_by_relation: HashMap<String, usize> = HashMap::new();
    for edge in edges {
        *edges_by_relation
            .entry(edge.relation_type.clone())
            .or_insert(0) += 1;
    }

    let mut sorted_nodes: Vec<(String, String, i32)> = nodes
        .iter()
        .map(|n| (n.id.clone(), n.label.clone(), n.degree))
        .collect();
    sorted_nodes.sort_by(|a, b| b.2.cmp(&a.2));
    let top_degree_nodes: Vec<(String, String, i32)> = sorted_nodes.into_iter().take(10).collect();

    let adj = build_adjacency_list(edges);
    let mut total_cc = 0.0;
    let mut cc_count = 0;
    for node in nodes {
        if let Some(neighbors) = adj.get(&node.id) {
            let k = neighbors.len();
            if k >= 2 {
                let neighbor_set: HashSet<&String> = neighbors.iter().collect();
                let mut links = 0;
                for n in neighbors {
                    if let Some(n_neighbors) = adj.get(n) {
                        for nn in n_neighbors {
                            if neighbor_set.contains(nn) {
                                links += 1;
                            }
                        }
                    }
                }
                let cc = (links as f64) / (k * (k - 1)) as f64;
                total_cc += cc;
                cc_count += 1;
            }
        }
    }

    let avg_clustering_coefficient = if cc_count > 0 {
        total_cc / cc_count as f64
    } else {
        0.0
    };

    GraphStats {
        node_count,
        edge_count,
        avg_degree,
        density,
        connected_components,
        nodes_by_domain,
        edges_by_relation,
        top_degree_nodes,
        avg_clustering_coefficient,
    }
}

// ==================== 推荐引擎实现 ====================

fn calculate_similarity(
    nodes: &[GraphNode],
    edges: &[GraphEdge],
    entity_id: &str,
    entity_type: Option<&str>,
    top_k: usize,
    min_similarity: f64,
) -> Vec<SimilarEntity> {
    let source_node = match nodes.iter().find(|n| n.id == entity_id) {
        Some(n) => n,
        None => return vec![],
    };

    let adj = build_adjacency_list(edges);
    let source_neighbors: HashSet<String> = adj
        .get(entity_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .collect();

    let mut similarities: Vec<SimilarEntity> = Vec::new();

    for target_node in nodes {
        if target_node.id == entity_id {
            continue;
        }

        if let Some(et) = entity_type {
            if target_node.domain != et && target_node.entity_type != et {
                continue;
            }
        }

        let target_neighbors: HashSet<String> = adj
            .get(&target_node.id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect();

        let intersection: HashSet<&String> =
            source_neighbors.intersection(&target_neighbors).collect();
        let union: HashSet<&String> = source_neighbors.union(&target_neighbors).collect();

        let jaccard = if union.is_empty() {
            0.0
        } else {
            intersection.len() as f64 / union.len() as f64
        };

        let mut shared_attrs: Vec<String> = Vec::new();
        let mut attr_similarity = 0.0;
        let mut attr_count = 0;

        if let (Some(s_props), Some(t_props)) = (
            source_node.properties.as_object(),
            target_node.properties.as_object(),
        ) {
            for (key, s_val) in s_props {
                if let Some(t_val) = t_props.get(key) {
                    attr_count += 1;
                    if s_val == t_val {
                        attr_similarity += 1.0;
                        shared_attrs.push(key.clone());
                    }
                }
            }
        }

        let attr_sim = if attr_count > 0 {
            attr_similarity / attr_count as f64
        } else {
            0.0
        };

        let domain_bonus = if source_node.domain == target_node.domain {
            0.1
        } else {
            0.0
        };

        let total_similarity =
            ((jaccard * 0.5 + attr_sim * 0.3 + domain_bonus) * 100.0).min(100.0) / 100.0;

        if total_similarity >= min_similarity {
            let mut reasons: Vec<String> = Vec::new();
            if jaccard > 0.3 {
                reasons.push(format!(
                    "共同邻居数量: {}/{}",
                    intersection.len(),
                    union.len()
                ));
            }
            if attr_sim > 0.5 {
                reasons.push(format!("属性相似度: {:.0}%", attr_sim * 100.0));
            }
            if source_node.domain == target_node.domain {
                reasons.push("同一数据域".to_string());
            }

            similarities.push(SimilarEntity {
                entity_id: target_node.id.clone(),
                entity_type: target_node.entity_type.clone(),
                entity_name: target_node.label.clone(),
                similarity: total_similarity,
                similarity_reasons: reasons,
                shared_attributes: shared_attrs,
            });
        }
    }

    similarities.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    similarities.into_iter().take(top_k).collect()
}

fn find_associations(
    nodes: &[GraphNode],
    edges: &[GraphEdge],
    entity_id: &str,
    relation_type: Option<&str>,
    top_k: usize,
    min_confidence: f64,
) -> Vec<AssociationRecommendation> {
    let adj = build_adjacency_list(edges);
    let source_neighbors: HashSet<String> = adj
        .get(entity_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .collect();

    let mut recommendations: Vec<AssociationRecommendation> = Vec::new();

    for edge in edges {
        if edge.source == entity_id || edge.target == entity_id {
            continue;
        }

        let other = if edge.source == entity_id {
            &edge.target
        } else {
            &edge.source
        };

        if source_neighbors.contains(other) {
            continue;
        }

        if let Some(rt) = relation_type {
            if edge.relation_type != rt {
                continue;
            }
        }

        let target_node = nodes.iter().find(|n| n.id == *other);
        let target_name = target_node.map(|n| n.label.clone()).unwrap_or_default();

        let mut evidence: Vec<String> = Vec::new();
        let mut support = 0;

        for e in edges {
            if (e.source == entity_id && e.target == *other)
                || (e.target == entity_id && e.source == *other)
            {
                support += 1;
                evidence.push(format!("通过关系 {} 关联", e.relation_type));
            }
        }

        let confidence = (edge.weight * 0.6 + (support as f64 * 0.1)).min(1.0);

        if confidence >= min_confidence {
            recommendations.push(AssociationRecommendation {
                source_entity_id: entity_id.to_string(),
                target_entity_id: other.clone(),
                target_entity_name: target_name,
                relation_type: edge.relation_type.clone(),
                confidence,
                evidence,
                support,
            });
        }
    }

    recommendations.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    recommendations.into_iter().take(top_k).collect()
}

fn suggest_completions(
    nodes: &[GraphNode],
    edges: &[GraphEdge],
    entity_id: &str,
    field_name: Option<&str>,
    top_k: usize,
    min_confidence: f64,
) -> Vec<CompletionSuggestion> {
    let source_node = match nodes.iter().find(|n| n.id == entity_id) {
        Some(n) => n,
        None => return vec![],
    };

    let adj = build_adjacency_list(edges);
    let neighbor_ids: HashSet<String> = adj
        .get(entity_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .collect();

    let mut suggestions: Vec<CompletionSuggestion> = Vec::new();

    if let Some(s_props) = source_node.properties.as_object() {
        for (key, s_val) in s_props {
            if let Some(fname) = field_name {
                if key != fname {
                    continue;
                }
            }

            if !s_val.is_null() && s_val.as_str() != Some("") {
                continue;
            }

            let mut value_counts: HashMap<String, usize> = HashMap::new();
            let mut total = 0;

            for neighbor_id in &neighbor_ids {
                if let Some(neighbor) = nodes.iter().find(|n| n.id == *neighbor_id) {
                    if let Some(n_props) = neighbor.properties.as_object() {
                        if let Some(val) = n_props.get(key) {
                            if let Some(s) = val.as_str() {
                                if !s.is_empty() {
                                    *value_counts.entry(s.to_string()).or_insert(0) += 1;
                                    total += 1;
                                }
                            }
                        }
                    }
                }
            }

            for (value, count) in value_counts {
                let confidence = if total > 0 {
                    count as f64 / total as f64
                } else {
                    0.0
                };

                if confidence >= min_confidence {
                    suggestions.push(CompletionSuggestion {
                        entity_id: entity_id.to_string(),
                        entity_type: source_node.entity_type.clone(),
                        field_name: key.clone(),
                        suggested_value: value,
                        confidence,
                        source: "neighbor_majority".to_string(),
                        reasoning: format!("基于 {} 个邻居实体的多数值", count),
                    });
                }
            }
        }
    }

    suggestions.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    suggestions.into_iter().take(top_k).collect()
}

// ==================== 主数据图谱 Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/graph",
    tag = "Master Data",
    responses((status = 200, description = "获取主数据图谱成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_master_data_graph(
    State(state): State<ApiState>,
    Query(params): Query<GraphQuery>,
) -> Json<ApiResponse<MasterDataGraph>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let all_nodes = store.graph_nodes.read().await.clone();
    let all_edges = store.graph_edges.read().await.clone();

    let filtered_nodes: Vec<GraphNode> = all_nodes
        .iter()
        .filter(|n| {
            let domain_ok = params
                .domain
                .as_ref()
                .map(|d| n.domain == *d)
                .unwrap_or(true);
            let type_ok = params
                .entity_type
                .as_ref()
                .map(|t| n.entity_type.contains(t) || n.domain == *t)
                .unwrap_or(true);
            domain_ok && type_ok
        })
        .cloned()
        .collect();

    let node_ids: HashSet<String> = filtered_nodes.iter().map(|n| n.id.clone()).collect();
    let filtered_edges: Vec<GraphEdge> = all_edges
        .iter()
        .filter(|e| node_ids.contains(&e.source) && node_ids.contains(&e.target))
        .cloned()
        .collect();

    let limit = params.limit.unwrap_or(1000);
    let limited_nodes: Vec<GraphNode> = filtered_nodes.into_iter().take(limit).collect();
    let limited_node_ids: HashSet<String> = limited_nodes.iter().map(|n| n.id.clone()).collect();
    let limited_edges: Vec<GraphEdge> = filtered_edges
        .into_iter()
        .filter(|e| limited_node_ids.contains(&e.source) && limited_node_ids.contains(&e.target))
        .collect();

    let node_count = limited_nodes.len();
    let edge_count = limited_edges.len();

    let avg_degree = if node_count > 0 {
        (2.0 * edge_count as f64) / node_count as f64
    } else {
        0.0
    };

    let density = if node_count > 1 {
        (2.0 * edge_count as f64) / (node_count as f64 * (node_count as f64 - 1.0))
    } else {
        0.0
    };

    let connected_components = count_connected_components(&limited_nodes, &limited_edges);

    Json(ApiResponse::success(
        MasterDataGraph {
            nodes: limited_nodes,
            edges: limited_edges,
            node_count,
            edge_count,
            avg_degree,
            density,
            connected_components,
        },
        "主数据图谱",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/graph/nodes/{nodeId}",
    tag = "Master Data",
    params(("nodeId" = String, Path, description = "节点ID")),
    responses((status = 200, description = "获取图谱节点成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_graph_node(
    State(state): State<ApiState>,
    Path(node_id): Path<String>,
) -> Json<ApiResponse<GraphNode>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let nodes = store.graph_nodes.read().await;
    match nodes.iter().find(|n| n.id == node_id) {
        Some(node) => Json(ApiResponse::success(node.clone(), "图节点详情")),
        None => Json(ApiResponse::error(404, "未找到图节点")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/graph/nodes/{nodeId}/neighbors",
    tag = "Master Data",
    params(("nodeId" = String, Path, description = "节点ID")),
    responses((status = 200, description = "获取节点邻居成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_node_neighbors(
    State(state): State<ApiState>,
    Path(node_id): Path<String>,
    Query(params): Query<NeighborQuery>,
) -> Json<ApiResponse<Vec<GraphNode>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let edges = store.graph_edges.read().await;
    let nodes = store.graph_nodes.read().await;

    let direction = params.direction.as_deref().unwrap_or("all");
    let limit = params.limit.unwrap_or(50);

    let neighbor_ids: HashSet<String> = edges
        .iter()
        .filter(|e| {
            let rel_match = params
                .relation_type
                .as_ref()
                .map(|r| e.relation_type == *r)
                .unwrap_or(true);

            let dir_match = match direction {
                "out" => e.source == node_id,
                "in" => e.target == node_id,
                _ => e.source == node_id || e.target == node_id,
            };

            rel_match && dir_match
        })
        .map(|e| {
            if e.source == node_id {
                e.target.clone()
            } else {
                e.source.clone()
            }
        })
        .collect();

    let neighbors: Vec<GraphNode> = nodes
        .iter()
        .filter(|n| neighbor_ids.contains(&n.id))
        .take(limit)
        .cloned()
        .collect();

    Json(ApiResponse::success(neighbors, "节点邻居列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/graph/shortest-path",
    tag = "Master Data",
    responses((status = 200, description = "获取最短路径成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_shortest_path(
    State(state): State<ApiState>,
    Query(params): Query<ShortestPathQuery>,
) -> Json<ApiResponse<Vec<String>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let edges = store.graph_edges.read().await;

    match shortest_path_bfs(&edges, &params.source, &params.target) {
        Some(path) => Json(ApiResponse::success(path, "最短路径")),
        None => Json(ApiResponse::error(404, "未找到路径")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/graph/nodes/{nodeId}/multi-hop",
    tag = "Master Data",
    params(("nodeId" = String, Path, description = "节点ID")),
    responses((status = 200, description = "多跳遍历成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn multi_hop_traversal(
    State(state): State<ApiState>,
    Path(node_id): Path<String>,
    Query(params): Query<MultiHopQuery>,
) -> Json<ApiResponse<Vec<(String, usize)>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let edges = store.graph_edges.read().await;
    let max_hops = params.max_hops.unwrap_or(3);

    let adj = build_adjacency_list(&edges);
    let mut visited: HashMap<String, usize> = HashMap::new();
    let mut queue: VecDeque<(String, usize)> = VecDeque::new();
    queue.push_back((node_id.clone(), 0));
    visited.insert(node_id.clone(), 0);

    while let Some((current, depth)) = queue.pop_front() {
        if depth >= max_hops {
            continue;
        }
        if let Some(neighbors) = adj.get(&current) {
            for neighbor in neighbors {
                if !visited.contains_key(neighbor) {
                    visited.insert(neighbor.clone(), depth + 1);
                    queue.push_back((neighbor.clone(), depth + 1));
                }
            }
        }
    }

    let result: Vec<(String, usize)> = visited
        .into_iter()
        .filter(|(id, _)| id != &node_id)
        .collect();

    Json(ApiResponse::success(result, "多跳遍历结果"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/graph/stats",
    tag = "Master Data",
    responses((status = 200, description = "获取图谱统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_graph_stats(State(state): State<ApiState>) -> Json<ApiResponse<GraphStats>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let nodes = store.graph_nodes.read().await.clone();
    let edges = store.graph_edges.read().await.clone();

    let stats = calculate_graph_stats(&nodes, &edges);

    Json(ApiResponse::success(stats, "图谱统计"))
}

// ==================== 知识图谱 Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/knowledge/concepts/{conceptId}",
    tag = "Master Data",
    params(("conceptId" = String, Path, description = "概念ID")),
    responses((status = 200, description = "获取概念成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_concept(
    State(state): State<ApiState>,
    Path(concept_id): Path<String>,
) -> Json<ApiResponse<Concept>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let concepts = store.concepts.read().await;
    match concepts.iter().find(|c| c.id == concept_id) {
        Some(concept) => Json(ApiResponse::success(concept.clone(), "概念详情")),
        None => Json(ApiResponse::error(404, "未找到概念")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/knowledge/concepts",
    tag = "Master Data",
    responses((status = 200, description = "获取概念列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_concepts(
    State(state): State<ApiState>,
    Query(params): Query<ConceptQuery>,
) -> Json<ApiResponse<PaginatedResponse<Concept>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let concepts = store.concepts.read().await.clone();

    let filtered: Vec<Concept> = concepts
        .into_iter()
        .filter(|c| {
            let type_ok = params
                .concept_type
                .as_ref()
                .map(|t| c.concept_type == *t)
                .unwrap_or(true);
            let parent_ok = params
                .parent_id
                .as_ref()
                .map(|p| c.parent_id.as_ref() == Some(p))
                .unwrap_or(true);
            let keyword_ok = params
                .keyword
                .as_ref()
                .map(|k| {
                    c.name.contains(k)
                        || c.description.contains(k)
                        || c.synonyms.iter().any(|s| s.contains(k))
                })
                .unwrap_or(true);
            type_ok && parent_ok && keyword_ok
        })
        .collect();

    let total = filtered.len();
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = ((page - 1) * page_size) as usize;

    let items: Vec<Concept> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total as i64, page, page_size),
        "概念列表",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/knowledge/triples",
    tag = "Master Data",
    responses((status = 200, description = "获取知识三元组成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_triples(
    State(state): State<ApiState>,
    Query(params): Query<TripleQuery>,
) -> Json<ApiResponse<PaginatedResponse<KnowledgeTriple>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let triples = store.triples.read().await.clone();

    let filtered: Vec<KnowledgeTriple> = triples
        .into_iter()
        .filter(|t| {
            let subject_ok = params
                .subject
                .as_ref()
                .map(|s| t.subject == *s)
                .unwrap_or(true);
            let predicate_ok = params
                .predicate
                .as_ref()
                .map(|p| t.predicate == *p)
                .unwrap_or(true);
            let object_ok = params
                .object
                .as_ref()
                .map(|o| t.object == *o)
                .unwrap_or(true);
            let confidence_ok = params
                .min_confidence
                .map(|c| t.confidence >= c)
                .unwrap_or(true);
            subject_ok && predicate_ok && object_ok && confidence_ok
        })
        .collect();

    let total = filtered.len();
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = ((page - 1) * page_size) as usize;

    let items: Vec<KnowledgeTriple> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total as i64, page, page_size),
        "知识三元组列表",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/knowledge/inference-rules",
    tag = "Master Data",
    responses((status = 200, description = "获取推理规则成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_inference_rules(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<InferenceRule>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let rules = store.inference_rules.read().await.clone();

    Json(ApiResponse::success(rules, "推理规则列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/knowledge/inference",
    tag = "Master Data",
    responses((status = 200, description = "运行知识推理成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn run_inference(
    State(state): State<ApiState>,
    Json(req): Json<InferenceRequest>,
) -> Json<ApiResponse<InferenceResult>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let triples = store.triples.read().await.clone();
    let rules = store.inference_rules.read().await.clone();
    let edges = store.graph_edges.read().await.clone();
    let nodes = store.graph_nodes.read().await.clone();

    let max_depth = req.max_depth.unwrap_or(2);
    let mut inferred: Vec<KnowledgeTriple> = Vec::new();
    let mut used_rules: HashSet<String> = HashSet::new();
    let now = chrono::Utc::now().to_rfc3339();

    let enabled_rules: Vec<&InferenceRule> = rules
        .iter()
        .filter(|r| {
            r.enabled
                && req
                    .rule_ids
                    .as_ref()
                    .map(|ids| ids.contains(&r.id))
                    .unwrap_or(true)
        })
        .collect();

    let adj = build_adjacency_list(&edges);
    let start_neighbors: HashSet<String> = adj
        .get(&req.entity_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .collect();

    for rule in &enabled_rules {
        match rule.id.as_str() {
            "rule_1" => {
                for edge in &edges {
                    if edge.source == req.entity_id && edge.relation_type == "supplies" {
                        let mid = &edge.target;
                        for e2 in &edges {
                            if e2.source == *mid && e2.relation_type == "contains" {
                                let target = &e2.target;
                                inferred.push(KnowledgeTriple {
                                    subject: req.entity_id.clone(),
                                    predicate: "indirect_supplies".to_string(),
                                    object: target.clone(),
                                    confidence: rule.confidence * edge.weight * e2.weight,
                                    source: format!("inference:{}", rule.id),
                                    created_at: now.clone(),
                                });
                                used_rules.insert(rule.id.clone());
                            }
                        }
                    }
                }
            }
            "rule_2" => {
                for edge in &edges {
                    if (edge.source == req.entity_id || edge.target == req.entity_id)
                        && edge.relation_type == "same_industry"
                    {
                        let other = if edge.source == req.entity_id {
                            &edge.target
                        } else {
                            &edge.source
                        };
                        inferred.push(KnowledgeTriple {
                            subject: req.entity_id.clone(),
                            predicate: "similar_needs".to_string(),
                            object: other.clone(),
                            confidence: rule.confidence * edge.weight,
                            source: format!("inference:{}", rule.id),
                            created_at: now.clone(),
                        });
                        used_rules.insert(rule.id.clone());
                    }
                }
            }
            "rule_3" => {
                for edge in &edges {
                    if (edge.source == req.entity_id || edge.target == req.entity_id)
                        && edge.relation_type == "competitor"
                    {
                        let competitor = if edge.source == req.entity_id {
                            &edge.target
                        } else {
                            &edge.source
                        };
                        for e2 in &edges {
                            if e2.source == *competitor && e2.relation_type == "supplies_to" {
                                let supplier = &e2.target;
                                if !start_neighbors.contains(supplier) {
                                    inferred.push(KnowledgeTriple {
                                        subject: req.entity_id.clone(),
                                        predicate: "potential_supplier".to_string(),
                                        object: supplier.clone(),
                                        confidence: rule.confidence * edge.weight * e2.weight,
                                        source: format!("inference:{}", rule.id),
                                        created_at: now.clone(),
                                    });
                                    used_rules.insert(rule.id.clone());
                                }
                            }
                        }
                    }
                }
            }
            "rule_4" => {
                for edge in &edges {
                    if edge.target == req.entity_id && edge.relation_type == "has_subsidiary" {
                        let parent = &edge.source;
                        for e2 in &edges {
                            if e2.source == *parent && e2.relation_type == "serves" {
                                let customer = &e2.target;
                                inferred.push(KnowledgeTriple {
                                    subject: req.entity_id.clone(),
                                    predicate: "serves".to_string(),
                                    object: customer.clone(),
                                    confidence: rule.confidence * edge.weight * e2.weight,
                                    source: format!("inference:{}", rule.id),
                                    created_at: now.clone(),
                                });
                                used_rules.insert(rule.id.clone());
                            }
                        }
                    }
                }
            }
            "rule_5" => {
                for edge in &edges {
                    if edge.source == req.entity_id && edge.relation_type == "contains" {
                        let comp = &edge.target;
                        for e2 in &edges {
                            if e2.source == *comp && e2.relation_type == "contains" {
                                let material = &e2.target;
                                inferred.push(KnowledgeTriple {
                                    subject: req.entity_id.clone(),
                                    predicate: "indirect_contains".to_string(),
                                    object: material.clone(),
                                    confidence: rule.confidence * edge.weight * e2.weight,
                                    source: format!("inference:{}", rule.id),
                                    created_at: now.clone(),
                                });
                                used_rules.insert(rule.id.clone());
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    let used_rules_vec: Vec<String> = used_rules.into_iter().collect();
    let total_inferred = inferred.len();

    inferred.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    drop(triples);
    drop(rules);
    drop(edges);
    drop(nodes);

    Json(ApiResponse::success(
        InferenceResult {
            entity_id: req.entity_id,
            inferred_triples: inferred,
            used_rules: used_rules_vec,
            inference_depth: max_depth,
            total_inferred,
        },
        "推理结果",
    ))
}

// ==================== 智能推荐 Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/recommendations/similar",
    tag = "Master Data",
    responses((status = 200, description = "获取相似实体成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_similar_entities(
    State(state): State<ApiState>,
    Query(params): Query<SimilarEntityQuery>,
) -> Json<ApiResponse<Vec<SimilarEntity>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let nodes = store.graph_nodes.read().await.clone();
    let edges = store.graph_edges.read().await.clone();

    let top_k = params.top_k.unwrap_or(10);
    let min_sim = params.min_similarity.unwrap_or(0.1);

    let results = calculate_similarity(
        &nodes,
        &edges,
        &params.entity_id,
        params.entity_type.as_deref(),
        top_k,
        min_sim,
    );

    Json(ApiResponse::success(results, "相似实体推荐"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/recommendations/associations",
    tag = "Master Data",
    responses((status = 200, description = "获取关联推荐成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_association_recommendations(
    State(state): State<ApiState>,
    Query(params): Query<AssociationQuery>,
) -> Json<ApiResponse<Vec<AssociationRecommendation>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let nodes = store.graph_nodes.read().await.clone();
    let edges = store.graph_edges.read().await.clone();

    let top_k = params.top_k.unwrap_or(10);
    let min_conf = params.min_confidence.unwrap_or(0.3);

    let results = find_associations(
        &nodes,
        &edges,
        &params.entity_id,
        params.relation_type.as_deref(),
        top_k,
        min_conf,
    );

    Json(ApiResponse::success(results, "关联推荐"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/recommendations/completions",
    tag = "Master Data",
    responses((status = 200, description = "获取补全建议成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_completion_suggestions(
    State(state): State<ApiState>,
    Query(params): Query<CompletionQuery>,
) -> Json<ApiResponse<Vec<CompletionSuggestion>>> {
    let _ = &state;
    ensure_knowledge_graph_initialized().await;
    let store = get_knowledge_graph_store();

    let nodes = store.graph_nodes.read().await.clone();
    let edges = store.graph_edges.read().await.clone();

    let top_k = params.top_k.unwrap_or(10);
    let min_conf = params.min_confidence.unwrap_or(0.5);

    let results = suggest_completions(
        &nodes,
        &edges,
        &params.entity_id,
        params.field_name.as_deref(),
        top_k,
        min_conf,
    );

    Json(ApiResponse::success(results, "数据补全建议"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graph_node_serialization() {
        let node = GraphNode {
            id: "node1".to_string(),
            label: "客户A".to_string(),
            entity_type: "customer".to_string(),
            domain: "customer".to_string(),
            properties: serde_json::json!({"name": "客户A"}),
            degree: 5,
            centrality: 0.85,
            cluster: Some("cluster1".to_string()),
        };
        let json = serde_json::to_value(&node).unwrap();
        assert_eq!(json["id"], "node1");
        assert_eq!(json["label"], "客户A");
        assert_eq!(json["entity_type"], "customer");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["degree"], 5);
        assert_eq!(json["centrality"], 0.85);
        assert_eq!(json["cluster"], "cluster1");
    }

    #[test]
    fn test_graph_node_deserialize() {
        let json = r#"{
            "id": "node2",
            "label": "产品B",
            "entity_type": "product",
            "domain": "product",
            "properties": {},
            "degree": 3,
            "centrality": 0.5,
            "cluster": null
        }"#;
        let node: GraphNode = serde_json::from_str(json).unwrap();
        assert_eq!(node.id, "node2");
        assert_eq!(node.label, "产品B");
        assert_eq!(node.entity_type, "product");
        assert_eq!(node.degree, 3);
        assert!(node.cluster.is_none());
    }

    #[test]
    fn test_graph_edge_serialization() {
        let edge = GraphEdge {
            id: "edge1".to_string(),
            source: "node1".to_string(),
            target: "node2".to_string(),
            relation_type: "purchases".to_string(),
            label: "购买".to_string(),
            weight: 0.9,
            properties: serde_json::json!({"count": 10}),
        };
        let json = serde_json::to_value(&edge).unwrap();
        assert_eq!(json["id"], "edge1");
        assert_eq!(json["source"], "node1");
        assert_eq!(json["target"], "node2");
        assert_eq!(json["relation_type"], "purchases");
        assert_eq!(json["label"], "购买");
        assert_eq!(json["weight"], 0.9);
    }

    #[test]
    fn test_master_data_graph_serialization() {
        let graph = MasterDataGraph {
            nodes: vec![],
            edges: vec![],
            node_count: 0,
            edge_count: 0,
            avg_degree: 0.0,
            density: 0.0,
            connected_components: 0,
        };
        let json = serde_json::to_value(&graph).unwrap();
        assert_eq!(json["node_count"], 0);
        assert_eq!(json["edge_count"], 0);
        assert_eq!(json["avg_degree"], 0.0);
        assert_eq!(json["density"], 0.0);
        assert_eq!(json["connected_components"], 0);
    }

    #[test]
    fn test_graph_stats_serialization() {
        let stats = GraphStats {
            node_count: 100,
            edge_count: 200,
            avg_degree: 4.0,
            density: 0.04,
            connected_components: 5,
            nodes_by_domain: HashMap::new(),
            edges_by_relation: HashMap::new(),
            top_degree_nodes: vec![],
            avg_clustering_coefficient: 0.3,
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["node_count"], 100);
        assert_eq!(json["edge_count"], 200);
        assert_eq!(json["avg_degree"], 4.0);
        assert_eq!(json["density"], 0.04);
        assert_eq!(json["connected_components"], 5);
        assert_eq!(json["avg_clustering_coefficient"], 0.3);
    }

    #[test]
    fn test_concept_serialization() {
        let concept = Concept {
            id: "concept1".to_string(),
            name: "客户".to_string(),
            concept_type: "entity".to_string(),
            description: "客户实体概念".to_string(),
            parent_id: None,
            properties: serde_json::json!({}),
            synonyms: vec!["顾客".to_string(), "Client".to_string()],
        };
        let json = serde_json::to_value(&concept).unwrap();
        assert_eq!(json["id"], "concept1");
        assert_eq!(json["name"], "客户");
        assert_eq!(json["concept_type"], "entity");
        assert_eq!(json["description"], "客户实体概念");
        assert_eq!(json["synonyms"][0], "顾客");
        assert_eq!(json["synonyms"][1], "Client");
    }

    #[test]
    fn test_knowledge_triple_serialization() {
        let triple = KnowledgeTriple {
            subject: "客户A".to_string(),
            predicate: "购买".to_string(),
            object: "产品B".to_string(),
            confidence: 0.95,
            source: "transaction_log".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&triple).unwrap();
        assert_eq!(json["subject"], "客户A");
        assert_eq!(json["predicate"], "购买");
        assert_eq!(json["object"], "产品B");
        assert_eq!(json["confidence"], 0.95);
        assert_eq!(json["source"], "transaction_log");
    }

    #[test]
    fn test_inference_rule_serialization() {
        let rule = InferenceRule {
            id: "rule1".to_string(),
            name: "客户购买推断".to_string(),
            description: "根据购买记录推断客户偏好".to_string(),
            condition_pattern: "?customer purchases ?product".to_string(),
            conclusion_pattern: "?customer prefers ?product.category".to_string(),
            confidence: 0.8,
            enabled: true,
        };
        let json = serde_json::to_value(&rule).unwrap();
        assert_eq!(json["id"], "rule1");
        assert_eq!(json["name"], "客户购买推断");
        assert_eq!(json["confidence"], 0.8);
        assert_eq!(json["enabled"], true);
    }

    #[test]
    fn test_inference_rule_disabled() {
        let rule = InferenceRule {
            id: "rule2".to_string(),
            name: "禁用规则".to_string(),
            description: "测试禁用规则".to_string(),
            condition_pattern: "?a ?b ?c".to_string(),
            conclusion_pattern: "?d ?e ?f".to_string(),
            confidence: 0.5,
            enabled: false,
        };
        let json = serde_json::to_value(&rule).unwrap();
        assert_eq!(json["enabled"], false);
        assert_eq!(json["confidence"], 0.5);
    }
}
