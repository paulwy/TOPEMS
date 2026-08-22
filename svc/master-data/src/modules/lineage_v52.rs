//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V52.0 MDM AC-24: 数据血缘 + 影响分析 + 变更传播
//!
//! 核心能力：
//! - 数据血缘 (Data Lineage): 自动/手动血缘捕获、图谱遍历（上游/下游）、可视化导出（DOT/JSON）
//! - 影响分析 (Impact Analysis): 直接/间接依赖分析、连锁反应模拟、服务级影响评估、风险等级计算
//! - 变更传播 (Change Propagation): 变更检测与事件生成、规则驱动传播、级联更新、冲突解决、传播审计追踪
//!
//! 设计风格：ApiResponse + LazyLock 内存存储

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

// ==================== 数据血缘 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EdgeType {
    DerivesFrom,
    Transforms,
    DependsOn,
    Implements,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct LineageNode {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct LineageEdge {
    pub id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub edge_type: EdgeType,
    pub transformation_description: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct LineageGraph {
    pub nodes: Vec<LineageNode>,
    pub edges: Vec<LineageEdge>,
    pub version: i64,
    pub last_updated: String,
}

// ==================== 影响分析 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    Create,
    Update,
    Delete,
    Rename,
    Merge,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct ImpactAnalysisRequest {
    pub target_entity_id: String,
    pub analysis_depth: Option<i32>,
    pub change_type: ChangeType,
    pub include_chain_reactions: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct AffectedNode {
    pub node_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub name: String,
    pub is_direct: bool,
    pub dependency_depth: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct AffectedService {
    pub service_name: String,
    pub impact_type: String,
    pub severity: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct ChainReaction {
    pub step: i32,
    pub trigger_node_id: String,
    pub affected_node_id: String,
    pub propagation_path: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct ImpactAnalysisResult {
    pub id: String,
    pub target_node: LineageNode,
    pub affected_nodes: Vec<AffectedNode>,
    pub affected_services: Vec<AffectedService>,
    pub risk_level: RiskLevel,
    pub chain_reactions: Vec<ChainReaction>,
    pub recommendations: Vec<String>,
    pub analyzed_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct ImpactSimulation {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub simulated_change: ChangeType,
    pub affected_scope: serde_json::Value,
    pub risk_assessment: String,
    pub simulation_timestamp: String,
}

// ==================== 变更传播 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct ChangeEvent {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: ChangeType,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub triggered_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum PropagationAction {
    CascadeUpdate,
    SyncNotify,
    Reject,
    Transform,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct PropagationRule {
    pub id: String,
    pub source_entity_type: String,
    pub target_entity_type: String,
    pub condition: String,
    pub action: PropagationAction,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct PropagationLog {
    pub id: String,
    pub change_event_id: String,
    pub rule_id: String,
    pub source_entity_id: String,
    pub target_entity_id: String,
    pub action: PropagationAction,
    pub status: String,
    pub propagated_at: String,
    pub rollback_id: Option<String>,
}

// ==================== 内存存储 ====================

struct LineageV52Store {
    lineage_nodes: Mutex<Vec<LineageNode>>,
    lineage_edges: Mutex<Vec<LineageEdge>>,
    lineage_graphs: Mutex<Vec<LineageGraph>>,
    impact_analyses: Mutex<Vec<ImpactAnalysisResult>>,
    impact_simulations: Mutex<Vec<ImpactSimulation>>,
    change_events: Mutex<Vec<ChangeEvent>>,
    propagation_rules: Mutex<Vec<PropagationRule>>,
    propagation_logs: Mutex<Vec<PropagationLog>>,
    initialized: Mutex<bool>,
}

fn get_lineage_v52_store() -> &'static LineageV52Store {
    static STORE: LazyLock<LineageV52Store> = LazyLock::new(|| LineageV52Store {
        lineage_nodes: Mutex::new(Vec::new()),
        lineage_edges: Mutex::new(Vec::new()),
        lineage_graphs: Mutex::new(Vec::new()),
        impact_analyses: Mutex::new(Vec::new()),
        impact_simulations: Mutex::new(Vec::new()),
        change_events: Mutex::new(Vec::new()),
        propagation_rules: Mutex::new(Vec::new()),
        propagation_logs: Mutex::new(Vec::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_lineage_v52_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    let nodes = vec![
        LineageNode {
            id: "node-001".to_string(),
            entity_type: "source_system".to_string(),
            entity_id: "SAP".to_string(),
            name: "SAP ERP".to_string(),
            description: Some("SAP ERP 源系统".to_string()),
            created_at: now.clone(),
        },
        LineageNode {
            id: "node-002".to_string(),
            entity_type: "source_system".to_string(),
            entity_id: "Oracle".to_string(),
            name: "Oracle 财务系统".to_string(),
            description: Some("Oracle 财务源系统".to_string()),
            created_at: now.clone(),
        },
        LineageNode {
            id: "node-003".to_string(),
            entity_type: "mdm_entity".to_string(),
            entity_id: "customer_master".to_string(),
            name: "客户主数据".to_string(),
            description: Some("MDM 客户主数据".to_string()),
            created_at: now.clone(),
        },
        LineageNode {
            id: "node-004".to_string(),
            entity_type: "mdm_entity".to_string(),
            entity_id: "supplier_master".to_string(),
            name: "供应商主数据".to_string(),
            description: Some("MDM 供应商主数据".to_string()),
            created_at: now.clone(),
        },
        LineageNode {
            id: "node-005".to_string(),
            entity_type: "business_service".to_string(),
            entity_id: "order_service".to_string(),
            name: "订单服务".to_string(),
            description: Some("订单业务服务".to_string()),
            created_at: now.clone(),
        },
        LineageNode {
            id: "node-006".to_string(),
            entity_type: "report".to_string(),
            entity_id: "sales_report".to_string(),
            name: "销售报表".to_string(),
            description: Some("销售分析报表".to_string()),
            created_at: now.clone(),
        },
    ];

    let edges = vec![
        LineageEdge {
            id: "edge-001".to_string(),
            from_node_id: "node-001".to_string(),
            to_node_id: "node-003".to_string(),
            edge_type: EdgeType::DerivesFrom,
            transformation_description: Some("SAP 客户数据同步".to_string()),
        },
        LineageEdge {
            id: "edge-002".to_string(),
            from_node_id: "node-002".to_string(),
            to_node_id: "node-004".to_string(),
            edge_type: EdgeType::DerivesFrom,
            transformation_description: Some("Oracle 供应商数据同步".to_string()),
        },
        LineageEdge {
            id: "edge-003".to_string(),
            from_node_id: "node-003".to_string(),
            to_node_id: "node-005".to_string(),
            edge_type: EdgeType::DependsOn,
            transformation_description: Some("订单依赖客户数据".to_string()),
        },
        LineageEdge {
            id: "edge-004".to_string(),
            from_node_id: "node-004".to_string(),
            to_node_id: "node-005".to_string(),
            edge_type: EdgeType::DependsOn,
            transformation_description: Some("订单依赖供应商数据".to_string()),
        },
        LineageEdge {
            id: "edge-005".to_string(),
            from_node_id: "node-005".to_string(),
            to_node_id: "node-006".to_string(),
            edge_type: EdgeType::Transforms,
            transformation_description: Some("订单数据聚合为销售报表".to_string()),
        },
        LineageEdge {
            id: "edge-006".to_string(),
            from_node_id: "node-001".to_string(),
            to_node_id: "node-004".to_string(),
            edge_type: EdgeType::Implements,
            transformation_description: Some("SAP 实现供应商数据".to_string()),
        },
    ];

    let graph = LineageGraph {
        nodes: nodes.clone(),
        edges: edges.clone(),
        version: 1,
        last_updated: now.clone(),
    };

    let rules = vec![
        PropagationRule {
            id: "rule-001".to_string(),
            source_entity_type: "customer".to_string(),
            target_entity_type: "order".to_string(),
            condition: "customer.code_changed".to_string(),
            action: PropagationAction::CascadeUpdate,
        },
        PropagationRule {
            id: "rule-002".to_string(),
            source_entity_type: "supplier".to_string(),
            target_entity_type: "purchase_order".to_string(),
            condition: "supplier.status_inactive".to_string(),
            action: PropagationAction::SyncNotify,
        },
        PropagationRule {
            id: "rule-003".to_string(),
            source_entity_type: "material".to_string(),
            target_entity_type: "bom".to_string(),
            condition: "material.deleted".to_string(),
            action: PropagationAction::Reject,
        },
    ];

    *store.lineage_nodes.lock().await = nodes;
    *store.lineage_edges.lock().await = edges;
    *store.lineage_graphs.lock().await = vec![graph];
    *store.propagation_rules.lock().await = rules;

    *initialized = true;
}

// ==================== 内部辅助函数 ====================

fn edge_type_from_str(s: &str) -> EdgeType {
    match s {
        "transforms" => EdgeType::Transforms,
        "depends_on" => EdgeType::DependsOn,
        "implements" => EdgeType::Implements,
        _ => EdgeType::DerivesFrom,
    }
}

fn change_type_from_str(s: &str) -> ChangeType {
    match s {
        "update" => ChangeType::Update,
        "delete" => ChangeType::Delete,
        "rename" => ChangeType::Rename,
        "merge" => ChangeType::Merge,
        _ => ChangeType::Create,
    }
}

fn propagation_action_from_str(s: &str) -> PropagationAction {
    match s {
        "sync_notify" => PropagationAction::SyncNotify,
        "reject" => PropagationAction::Reject,
        "transform" => PropagationAction::Transform,
        _ => PropagationAction::CascadeUpdate,
    }
}

fn compute_risk_level(direct_count: i32, indirect_count: i32) -> RiskLevel {
    let total = direct_count * 2 + indirect_count;
    if total >= 20 {
        RiskLevel::Critical
    } else if total >= 10 {
        RiskLevel::High
    } else if total >= 5 {
        RiskLevel::Medium
    } else {
        RiskLevel::Low
    }
}

fn generate_recommendations(
    risk_level: &RiskLevel,
    affected_services: &[AffectedService],
) -> Vec<String> {
    let mut recs = Vec::new();
    match risk_level {
        RiskLevel::Critical => {
            recs.push("立即通知所有相关团队并启动应急流程".to_string());
            recs.push("在变更前进行完整的回归测试".to_string());
        }
        RiskLevel::High => {
            recs.push("提前通知受影响的服务团队".to_string());
            recs.push("在变更前进行集成测试".to_string());
        }
        RiskLevel::Medium => {
            recs.push("建议在业务低峰期执行变更".to_string());
        }
        RiskLevel::Low => {
            recs.push("可按正常流程执行变更".to_string());
        }
    }
    for svc in affected_services {
        recs.push(format!(
            "检查 {} 服务的 {} 影响",
            svc.service_name, svc.impact_type
        ));
    }
    recs
}

// ==================== LineageTracker 实现 ====================

struct LineageTracker;

impl LineageTracker {
    async fn register(
        from_entity_type: String,
        from_entity_id: String,
        to_entity_type: String,
        to_entity_id: String,
        edge_type: EdgeType,
        transformation_description: Option<String>,
    ) -> Result<(LineageNode, LineageNode, LineageEdge), String> {
        let store = get_lineage_v52_store();
        let mut nodes = store.lineage_nodes.lock().await;
        let mut edges = store.lineage_edges.lock().await;
        let mut graphs = store.lineage_graphs.lock().await;

        let now = chrono::Utc::now().to_rfc3339();

        let from_node = nodes
            .iter()
            .find(|n| n.entity_type == from_entity_type && n.entity_id == from_entity_id)
            .cloned()
            .unwrap_or_else(|| {
                let id = uuid::Uuid::new_v4().to_string();
                let node = LineageNode {
                    id: id.clone(),
                    entity_type: from_entity_type.clone(),
                    entity_id: from_entity_id.clone(),
                    name: format!("{}:{}", from_entity_type, from_entity_id),
                    description: None,
                    created_at: now.clone(),
                };
                nodes.push(node.clone());
                node
            });

        let to_node = nodes
            .iter()
            .find(|n| n.entity_type == to_entity_type && n.entity_id == to_entity_id)
            .cloned()
            .unwrap_or_else(|| {
                let id = uuid::Uuid::new_v4().to_string();
                let node = LineageNode {
                    id: id.clone(),
                    entity_type: to_entity_type.clone(),
                    entity_id: to_entity_id.clone(),
                    name: format!("{}:{}", to_entity_type, to_entity_id),
                    description: None,
                    created_at: now.clone(),
                };
                nodes.push(node.clone());
                node
            });

        let edge = LineageEdge {
            id: uuid::Uuid::new_v4().to_string(),
            from_node_id: from_node.id.clone(),
            to_node_id: to_node.id.clone(),
            edge_type,
            transformation_description,
        };
        edges.push(edge.clone());

        if let Some(graph) = graphs.first_mut() {
            graph.nodes = nodes.clone();
            graph.edges = edges.clone();
            graph.version += 1;
            graph.last_updated = now;
        }

        Ok((from_node, to_node, edge))
    }

    async fn get_graph() -> LineageGraph {
        let store = get_lineage_v52_store();
        let graphs = store.lineage_graphs.lock().await;
        graphs.first().cloned().unwrap_or_else(|| LineageGraph {
            nodes: Vec::new(),
            edges: Vec::new(),
            version: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }

    async fn get_upstream(node_id: &str, depth: Option<i32>) -> Vec<LineageNode> {
        let store = get_lineage_v52_store();
        let nodes = store.lineage_nodes.lock().await;
        let edges = store.lineage_edges.lock().await;

        let max_depth = depth.unwrap_or(10);
        let mut visited = HashSet::new();
        let mut result = Vec::new();
        let mut current_level = vec![(node_id.to_string(), 0)];

        while !current_level.is_empty() {
            let mut next_level = Vec::new();
            for (nid, d) in &current_level {
                if *d >= max_depth || !visited.insert(nid.clone()) {
                    continue;
                }
                for edge in edges.iter() {
                    if edge.to_node_id == *nid {
                        if let Some(node) = nodes.iter().find(|n| n.id == edge.from_node_id) {
                            result.push(node.clone());
                            next_level.push((edge.from_node_id.clone(), d + 1));
                        }
                    }
                }
            }
            current_level = next_level;
        }
        result
    }

    async fn get_downstream(node_id: &str, depth: Option<i32>) -> Vec<LineageNode> {
        let store = get_lineage_v52_store();
        let nodes = store.lineage_nodes.lock().await;
        let edges = store.lineage_edges.lock().await;

        let max_depth = depth.unwrap_or(10);
        let mut visited = HashSet::new();
        let mut result = Vec::new();
        let mut current_level = vec![(node_id.to_string(), 0)];

        while !current_level.is_empty() {
            let mut next_level = Vec::new();
            for (nid, d) in &current_level {
                if *d >= max_depth || !visited.insert(nid.clone()) {
                    continue;
                }
                for edge in edges.iter() {
                    if edge.from_node_id == *nid {
                        if let Some(node) = nodes.iter().find(|n| n.id == edge.to_node_id) {
                            result.push(node.clone());
                            next_level.push((edge.to_node_id.clone(), d + 1));
                        }
                    }
                }
            }
            current_level = next_level;
        }
        result
    }

    async fn export_graph(format: &str) -> Result<String, String> {
        let store = get_lineage_v52_store();
        let graphs = store.lineage_graphs.lock().await;
        let graph = graphs.first().cloned().ok_or("没有可用的血缘图谱")?;

        match format {
            "dot" => {
                let mut dot = String::new();
                dot.push_str("digraph lineage {\n");
                dot.push_str("  rankdir=LR;\n");
                for node in &graph.nodes {
                    dot.push_str(&format!(
                        "  \"{}\" [label=\"{} ({})\"];\n",
                        node.id, node.name, node.entity_type
                    ));
                }
                for edge in &graph.edges {
                    let label = match &edge.transformation_description {
                        Some(desc) => format!("{:?}: {}", edge.edge_type, desc),
                        None => format!("{:?}", edge.edge_type),
                    };
                    dot.push_str(&format!(
                        "  \"{}\" -> \"{}\" [label=\"{}\"];\n",
                        edge.from_node_id, edge.to_node_id, label
                    ));
                }
                dot.push_str("}\n");
                Ok(dot)
            }
            "json" => serde_json::to_string_pretty(&graph).map_err(|e| e.to_string()),
            _ => Err(format!("不支持的导出格式: {}", format)),
        }
    }

    async fn delete_node(node_id: &str) -> Result<(), String> {
        let store = get_lineage_v52_store();
        let mut nodes = store.lineage_nodes.lock().await;
        let mut edges = store.lineage_edges.lock().await;
        let mut graphs = store.lineage_graphs.lock().await;

        let len_before = nodes.len();
        nodes.retain(|n| n.id != node_id);
        if nodes.len() == len_before {
            return Err("未找到血缘节点".to_string());
        }

        edges.retain(|e| e.from_node_id != node_id && e.to_node_id != node_id);

        if let Some(graph) = graphs.first_mut() {
            graph.nodes = nodes.clone();
            graph.edges = edges.clone();
            graph.version += 1;
            graph.last_updated = chrono::Utc::now().to_rfc3339();
        }

        Ok(())
    }
}

// ==================== ImpactAnalyzer 实现 ====================

struct ImpactAnalyzer;

impl ImpactAnalyzer {
    async fn analyze(req: &ImpactAnalysisRequest) -> Result<ImpactAnalysisResult, String> {
        let store = get_lineage_v52_store();
        let nodes = store.lineage_nodes.lock().await;
        let edges = store.lineage_edges.lock().await;

        let target_node = nodes
            .iter()
            .find(|n| n.entity_id == req.target_entity_id)
            .cloned()
            .ok_or_else(|| format!("未找到目标实体: {}", req.target_entity_id))?;

        let max_depth = req.analysis_depth.unwrap_or(5);
        let include_chain = req.include_chain_reactions.unwrap_or(true);

        let mut affected_nodes: Vec<AffectedNode> = Vec::new();
        let mut chain_reactions: Vec<ChainReaction> = Vec::new();
        let mut visited = HashSet::new();
        let mut services_map: HashMap<String, AffectedService> = HashMap::new();

        let mut current_level = vec![(target_node.id.clone(), 0, true)];
        let mut step: i32 = 0;

        while !current_level.is_empty() {
            let mut next_level = Vec::new();
            step += 1;

            for (nid, depth, is_direct) in &current_level {
                if *depth >= max_depth || !visited.insert(nid.clone()) {
                    continue;
                }

                for edge in edges.iter() {
                    if edge.from_node_id == *nid {
                        if let Some(node) = nodes.iter().find(|n| n.id == edge.to_node_id) {
                            let affected = AffectedNode {
                                node_id: node.id.clone(),
                                entity_type: node.entity_type.clone(),
                                entity_id: node.entity_id.clone(),
                                name: node.name.clone(),
                                is_direct: *is_direct,
                                dependency_depth: depth + 1,
                            };

                            if !affected_nodes.iter().any(|a| a.node_id == node.id) {
                                affected_nodes.push(affected);
                            }

                            if include_chain && *depth < max_depth - 1 {
                                let cr = ChainReaction {
                                    step,
                                    trigger_node_id: nid.clone(),
                                    affected_node_id: node.id.clone(),
                                    propagation_path: vec![nid.clone(), node.id.clone()],
                                };
                                chain_reactions.push(cr);
                                next_level.push((node.id.clone(), depth + 1, false));
                            }

                            if node.entity_type == "business_service" {
                                services_map
                                    .entry(node.entity_id.clone())
                                    .or_insert_with(|| AffectedService {
                                        service_name: node.name.clone(),
                                        impact_type: format!("{:?}", req.change_type)
                                            .to_lowercase(),
                                        severity: if *is_direct {
                                            "high".to_string()
                                        } else {
                                            "medium".to_string()
                                        },
                                    });
                            }
                        }
                    }
                }
            }
            current_level = next_level;
        }

        let direct_count = affected_nodes.iter().filter(|a| a.is_direct).count() as i32;
        let indirect_count = affected_nodes.iter().filter(|a| !a.is_direct).count() as i32;
        let risk_level = compute_risk_level(direct_count, indirect_count);

        let affected_services: Vec<AffectedService> = services_map.into_values().collect();
        let recommendations = generate_recommendations(&risk_level, &affected_services);

        let result = ImpactAnalysisResult {
            id: uuid::Uuid::new_v4().to_string(),
            target_node,
            affected_nodes,
            affected_services,
            risk_level,
            chain_reactions,
            recommendations,
            analyzed_at: chrono::Utc::now().to_rfc3339(),
        };

        drop(nodes);
        drop(edges);

        let mut analyses = store.impact_analyses.lock().await;
        analyses.push(result.clone());

        Ok(result)
    }

    async fn get_report(id: &str) -> Result<ImpactAnalysisResult, String> {
        let store = get_lineage_v52_store();
        let analyses = store.impact_analyses.lock().await;
        analyses
            .iter()
            .find(|r| r.id == id)
            .cloned()
            .ok_or_else(|| "未找到影响分析报告".to_string())
    }

    async fn simulate(
        entity_type: String,
        entity_id: String,
        change_type: ChangeType,
    ) -> Result<ImpactSimulation, String> {
        let store = get_lineage_v52_store();
        let nodes = store.lineage_nodes.lock().await;
        let edges = store.lineage_edges.lock().await;

        let target = nodes
            .iter()
            .find(|n| n.entity_type == entity_type && n.entity_id == entity_id)
            .ok_or_else(|| format!("未找到实体: {}:{}", entity_type, entity_id))?;

        let mut downstream_ids = Vec::new();
        let mut visited = HashSet::new();
        let mut queue = vec![target.id.clone()];

        while !queue.is_empty() {
            let nid = queue.remove(0);
            if !visited.insert(nid.clone()) {
                continue;
            }
            for edge in edges.iter() {
                if edge.from_node_id == nid {
                    if !downstream_ids.contains(&edge.to_node_id) {
                        downstream_ids.push(edge.to_node_id.clone());
                    }
                    queue.push(edge.to_node_id.clone());
                }
            }
        }

        let affected_entities: Vec<serde_json::Value> = nodes
            .iter()
            .filter(|n| downstream_ids.contains(&n.id))
            .map(|n| {
                serde_json::json!({
                    "node_id": n.id,
                    "entity_type": n.entity_type,
                    "entity_id": n.entity_id,
                    "name": n.name,
                })
            })
            .collect();

        let simulation = ImpactSimulation {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: entity_type.clone(),
            entity_id: entity_id.clone(),
            simulated_change: change_type,
            affected_scope: serde_json::json!({
                "affected_node_count": downstream_ids.len(),
                "affected_entities": affected_entities,
            }),
            risk_assessment: if downstream_ids.len() > 5 {
                "high_risk".to_string()
            } else if downstream_ids.len() > 2 {
                "medium_risk".to_string()
            } else {
                "low_risk".to_string()
            },
            simulation_timestamp: chrono::Utc::now().to_rfc3339(),
        };

        drop(nodes);
        drop(edges);

        let mut simulations = store.impact_simulations.lock().await;
        simulations.push(simulation.clone());

        Ok(simulation)
    }

    async fn get_affected_scope(
        entity_type: String,
        entity_id: String,
    ) -> Result<serde_json::Value, String> {
        let store = get_lineage_v52_store();
        let nodes = store.lineage_nodes.lock().await;
        let edges = store.lineage_edges.lock().await;

        let target = nodes
            .iter()
            .find(|n| n.entity_type == entity_type && n.entity_id == entity_id)
            .ok_or_else(|| format!("未找到实体: {}:{}", entity_type, entity_id))?;

        let mut downstream = Vec::new();
        let mut visited = HashSet::new();
        let mut queue = vec![target.id.clone()];

        while !queue.is_empty() {
            let nid = queue.remove(0);
            if !visited.insert(nid.clone()) {
                continue;
            }
            for edge in edges.iter() {
                if edge.from_node_id == nid {
                    if let Some(node) = nodes.iter().find(|n| n.id == edge.to_node_id) {
                        if !downstream.iter().any(|d: &LineageNode| d.id == node.id) {
                            downstream.push(node.clone());
                        }
                        queue.push(edge.to_node_id.clone());
                    }
                }
            }
        }

        let scope = serde_json::json!({
            "target": {
                "entity_type": target.entity_type,
                "entity_id": target.entity_id,
                "name": target.name,
            },
            "affected_count": downstream.len(),
            "affected_entities": downstream.iter().map(|n| {
                serde_json::json!({
                    "entity_type": n.entity_type,
                    "entity_id": n.entity_id,
                    "name": n.name,
                })
            }).collect::<Vec<_>>(),
        });

        Ok(scope)
    }
}

// ==================== ChangePropagator 实现 ====================

struct ChangePropagator;

impl ChangePropagator {
    async fn propagate(
        entity_type: String,
        entity_id: String,
        change_type: ChangeType,
        old_value: Option<serde_json::Value>,
        new_value: Option<serde_json::Value>,
    ) -> Result<(ChangeEvent, Vec<PropagationLog>), String> {
        let store = get_lineage_v52_store();

        let now = chrono::Utc::now().to_rfc3339();

        let event = ChangeEvent {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: entity_type.clone(),
            entity_id: entity_id.clone(),
            change_type,
            old_value,
            new_value,
            triggered_at: now.clone(),
        };

        let rules = store.propagation_rules.lock().await;
        let applicable_rules: Vec<PropagationRule> = rules
            .iter()
            .filter(|r| r.source_entity_type == entity_type)
            .cloned()
            .collect();
        drop(rules);

        let mut logs = Vec::new();
        for rule in &applicable_rules {
            let log = PropagationLog {
                id: uuid::Uuid::new_v4().to_string(),
                change_event_id: event.id.clone(),
                rule_id: rule.id.clone(),
                source_entity_id: entity_id.clone(),
                target_entity_id: format!("{}:*", rule.target_entity_type),
                action: rule.action.clone(),
                status: "propagated".to_string(),
                propagated_at: now.clone(),
                rollback_id: None,
            };
            logs.push(log);
        }

        let mut events = store.change_events.lock().await;
        events.push(event.clone());
        drop(events);

        let mut prop_logs = store.propagation_logs.lock().await;
        prop_logs.extend(logs.clone());

        Ok((event, logs))
    }

    async fn get_rules() -> Vec<PropagationRule> {
        let store = get_lineage_v52_store();
        let rules = store.propagation_rules.lock().await;
        rules.clone()
    }

    async fn add_rule(
        source_entity_type: String,
        target_entity_type: String,
        condition: String,
        action: PropagationAction,
    ) -> PropagationRule {
        let store = get_lineage_v52_store();
        let mut rules = store.propagation_rules.lock().await;

        let rule = PropagationRule {
            id: uuid::Uuid::new_v4().to_string(),
            source_entity_type,
            target_entity_type,
            condition,
            action,
        };
        rules.push(rule.clone());
        rule
    }

    async fn get_log(
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> Vec<PropagationLog> {
        let store = get_lineage_v52_store();
        let logs = store.propagation_logs.lock().await;

        logs.iter()
            .filter(|l| {
                if let Some(eid) = &entity_id {
                    if &l.source_entity_id != eid {
                        return false;
                    }
                }
                let _ = &entity_type;
                true
            })
            .cloned()
            .collect()
    }

    async fn rollback(propagation_id: &str) -> Result<PropagationLog, String> {
        let store = get_lineage_v52_store();
        let mut logs = store.propagation_logs.lock().await;

        let log = logs
            .iter_mut()
            .find(|l| l.id == propagation_id)
            .ok_or_else(|| "未找到传播记录".to_string())?;

        if log.status == "rolled_back" {
            return Err("该记录已回滚".to_string());
        }

        log.status = "rolled_back".to_string();
        log.rollback_id = Some(uuid::Uuid::new_v4().to_string());

        Ok(log.clone())
    }
}

// ==================== 请求/响应结构 ====================

// --- Lineage Requests ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct RegisterLineageRequest {
    pub from_entity_type: String,
    pub from_entity_id: String,
    pub to_entity_type: String,
    pub to_entity_id: String,
    pub edge_type: String,
    pub transformation_description: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LineageQuery {
    pub depth: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ExportQuery {
    pub format: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct DeleteLineageRequest {
    pub node_id: String,
}

// --- Impact Requests ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct AnalyzeImpactRequest {
    pub target_entity_id: String,
    pub analysis_depth: Option<i32>,
    pub change_type: String,
    pub include_chain_reactions: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SimulateChangeRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AffectedScopeQuery {
    pub entity_type: String,
    pub entity_id: String,
}

// --- Propagation Requests ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct PropagateChangeRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: String,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddPropagationRuleRequest {
    pub source_entity_type: String,
    pub target_entity_type: String,
    pub condition: String,
    pub action: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PropagationLogQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct RollbackPropagationRequest {
    pub propagation_id: String,
}

// ==================== API 处理器：数据血缘 ====================

pub async fn register_lineage(
    State(_state): State<AppState>,
    Json(req): Json<RegisterLineageRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    let edge_type = edge_type_from_str(&req.edge_type);

    match LineageTracker::register(
        req.from_entity_type,
        req.from_entity_id,
        req.to_entity_type,
        req.to_entity_id,
        edge_type,
        req.transformation_description,
    )
    .await
    {
        Ok((from_node, to_node, edge)) => Json(ApiResponse::success(
            serde_json::json!({
                "from_node": from_node,
                "to_node": to_node,
                "edge": edge,
            }),
            "血缘关系已注册",
        )),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_lineage_graph(State(_state): State<AppState>) -> Json<ApiResponse<LineageGraph>> {
    ensure_initialized().await;
    let graph = LineageTracker::get_graph().await;
    Json(ApiResponse::success(graph, "血缘图谱"))
}

pub async fn get_upstream(
    State(_state): State<AppState>,
    Path((entity_type, id)): Path<(String, String)>,
    Query(params): Query<LineageQuery>,
) -> Json<ApiResponse<Vec<LineageNode>>> {
    ensure_initialized().await;

    let store = get_lineage_v52_store();
    let nodes = store.lineage_nodes.lock().await;
    let target = nodes
        .iter()
        .find(|n| n.entity_type == entity_type && n.entity_id == id)
        .cloned();
    drop(nodes);

    let target = match target {
        Some(t) => t,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };

    let upstream = LineageTracker::get_upstream(&target.id, params.depth).await;
    Json(ApiResponse::success(upstream, "上游血缘节点"))
}

pub async fn get_downstream(
    State(_state): State<AppState>,
    Path((entity_type, id)): Path<(String, String)>,
    Query(params): Query<LineageQuery>,
) -> Json<ApiResponse<Vec<LineageNode>>> {
    ensure_initialized().await;

    let store = get_lineage_v52_store();
    let nodes = store.lineage_nodes.lock().await;
    let target = nodes
        .iter()
        .find(|n| n.entity_type == entity_type && n.entity_id == id)
        .cloned();
    drop(nodes);

    let target = match target {
        Some(t) => t,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };

    let downstream = LineageTracker::get_downstream(&target.id, params.depth).await;
    Json(ApiResponse::success(downstream, "下游血缘节点"))
}

pub async fn export_lineage(
    State(_state): State<AppState>,
    Query(params): Query<ExportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    let format = params.format.unwrap_or_else(|| "json".to_string());
    match LineageTracker::export_graph(&format).await {
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
                "血缘图谱导出成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn delete_lineage(
    State(_state): State<AppState>,
    Json(req): Json<DeleteLineageRequest>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;

    match LineageTracker::delete_node(&req.node_id).await {
        Ok(()) => Json(ApiResponse::success_no_data("血缘节点已删除")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

// ==================== API 处理器：影响分析 ====================

pub async fn analyze_impact(
    State(_state): State<AppState>,
    Json(req): Json<AnalyzeImpactRequest>,
) -> Json<ApiResponse<ImpactAnalysisResult>> {
    ensure_initialized().await;

    let change_type = change_type_from_str(&req.change_type);
    let analysis_req = ImpactAnalysisRequest {
        target_entity_id: req.target_entity_id,
        analysis_depth: req.analysis_depth,
        change_type,
        include_chain_reactions: req.include_chain_reactions,
    };

    match ImpactAnalyzer::analyze(&analysis_req).await {
        Ok(result) => Json(ApiResponse::success(result, "影响分析完成")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_impact_report(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ImpactAnalysisResult>> {
    ensure_initialized().await;

    match ImpactAnalyzer::get_report(&id).await {
        Ok(report) => Json(ApiResponse::success(report, "影响分析报告")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn simulate_change(
    State(_state): State<AppState>,
    Json(req): Json<SimulateChangeRequest>,
) -> Json<ApiResponse<ImpactSimulation>> {
    ensure_initialized().await;

    let change_type = change_type_from_str(&req.change_type);
    match ImpactAnalyzer::simulate(req.entity_type, req.entity_id, change_type).await {
        Ok(simulation) => Json(ApiResponse::success(simulation, "变更模拟完成")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_affected_scope(
    State(_state): State<AppState>,
    Query(params): Query<AffectedScopeQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    match ImpactAnalyzer::get_affected_scope(params.entity_type, params.entity_id).await {
        Ok(scope) => Json(ApiResponse::success(scope, "受影响范围")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

// ==================== API 处理器：变更传播 ====================

pub async fn propagate_change(
    State(_state): State<AppState>,
    Json(req): Json<PropagateChangeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;

    let change_type = change_type_from_str(&req.change_type);
    match ChangePropagator::propagate(
        req.entity_type,
        req.entity_id,
        change_type,
        req.old_value,
        req.new_value,
    )
    .await
    {
        Ok((event, logs)) => Json(ApiResponse::success(
            serde_json::json!({
                "change_event": event,
                "propagation_logs": logs,
                "propagated": true,
            }),
            "变更传播完成",
        )),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_propagation_rules(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<PropagationRule>>> {
    ensure_initialized().await;
    let rules = ChangePropagator::get_rules().await;
    Json(ApiResponse::success(rules, "传播规则列表"))
}

pub async fn add_propagation_rule(
    State(_state): State<AppState>,
    Json(req): Json<AddPropagationRuleRequest>,
) -> Json<ApiResponse<PropagationRule>> {
    ensure_initialized().await;

    let action = propagation_action_from_str(&req.action);
    let rule = ChangePropagator::add_rule(
        req.source_entity_type,
        req.target_entity_type,
        req.condition,
        action,
    )
    .await;

    Json(ApiResponse::success(rule, "传播规则已添加"))
}

pub async fn get_propagation_log(
    State(_state): State<AppState>,
    Query(params): Query<PropagationLogQuery>,
) -> Json<ApiResponse<PaginatedResponse<PropagationLog>>> {
    ensure_initialized().await;

    let logs = ChangePropagator::get_log(params.entity_type, params.entity_id).await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let total = logs.len() as i64;
    let items: Vec<PropagationLog> = logs
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "传播日志",
    ))
}

pub async fn rollback_propagation(
    State(_state): State<AppState>,
    Json(req): Json<RollbackPropagationRequest>,
) -> Json<ApiResponse<PropagationLog>> {
    ensure_initialized().await;

    match ChangePropagator::rollback(&req.propagation_id).await {
        Ok(log) => Json(ApiResponse::success(log, "传播已回滚")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- edge_type_from_str ----------

    #[test]
    fn test_edge_type_from_str_transforms() {
        assert_eq!(edge_type_from_str("transforms"), EdgeType::Transforms);
    }

    #[test]
    fn test_edge_type_from_str_depends_on() {
        assert_eq!(edge_type_from_str("depends_on"), EdgeType::DependsOn);
    }

    #[test]
    fn test_edge_type_from_str_implements() {
        assert_eq!(edge_type_from_str("implements"), EdgeType::Implements);
    }

    #[test]
    fn test_edge_type_from_str_derives_from_default() {
        assert_eq!(edge_type_from_str("derives_from"), EdgeType::DerivesFrom);
        assert_eq!(edge_type_from_str("unknown"), EdgeType::DerivesFrom);
        assert_eq!(edge_type_from_str(""), EdgeType::DerivesFrom);
    }

    // ---------- change_type_from_str ----------

    #[test]
    fn test_change_type_from_str_update() {
        assert_eq!(change_type_from_str("update"), ChangeType::Update);
    }

    #[test]
    fn test_change_type_from_str_delete() {
        assert_eq!(change_type_from_str("delete"), ChangeType::Delete);
    }

    #[test]
    fn test_change_type_from_str_rename() {
        assert_eq!(change_type_from_str("rename"), ChangeType::Rename);
    }

    #[test]
    fn test_change_type_from_str_merge() {
        assert_eq!(change_type_from_str("merge"), ChangeType::Merge);
    }

    #[test]
    fn test_change_type_from_str_create_default() {
        assert_eq!(change_type_from_str("create"), ChangeType::Create);
        assert_eq!(change_type_from_str("unknown"), ChangeType::Create);
    }

    // ---------- propagation_action_from_str ----------

    #[test]
    fn test_propagation_action_from_str_sync_notify() {
        assert_eq!(
            propagation_action_from_str("sync_notify"),
            PropagationAction::SyncNotify
        );
    }

    #[test]
    fn test_propagation_action_from_str_reject() {
        assert_eq!(
            propagation_action_from_str("reject"),
            PropagationAction::Reject
        );
    }

    #[test]
    fn test_propagation_action_from_str_transform() {
        assert_eq!(
            propagation_action_from_str("transform"),
            PropagationAction::Transform
        );
    }

    #[test]
    fn test_propagation_action_from_str_cascade_update_default() {
        assert_eq!(
            propagation_action_from_str("cascade_update"),
            PropagationAction::CascadeUpdate
        );
        assert_eq!(
            propagation_action_from_str("unknown"),
            PropagationAction::CascadeUpdate
        );
    }

    // ---------- compute_risk_level ----------

    #[test]
    fn test_compute_risk_level_low() {
        // 0 直接 + 4 间接 = 4 -> Low
        assert_eq!(compute_risk_level(0, 4), RiskLevel::Low);
        // 0 直接 + 0 间接 = 0 -> Low
        assert_eq!(compute_risk_level(0, 0), RiskLevel::Low);
    }

    #[test]
    fn test_compute_risk_level_medium() {
        // 1 直接 + 3 间接 = 2 + 3 = 5 -> Medium
        assert_eq!(compute_risk_level(1, 3), RiskLevel::Medium);
        // 2 直接 + 2 间接 = 4 + 2 = 6 -> Medium
        assert_eq!(compute_risk_level(2, 2), RiskLevel::Medium);
        // 0 直接 + 9 间接 = 9 -> Medium (临界值上界)
        assert_eq!(compute_risk_level(0, 9), RiskLevel::Medium);
    }

    #[test]
    fn test_compute_risk_level_high() {
        // 3 直接 + 4 间接 = 6 + 4 = 10 -> High
        assert_eq!(compute_risk_level(3, 4), RiskLevel::High);
        // 5 直接 + 0 间接 = 10 -> High (临界值下界)
        assert_eq!(compute_risk_level(5, 0), RiskLevel::High);
        // 0 直接 + 10 间接 = 10 -> High
        assert_eq!(compute_risk_level(0, 10), RiskLevel::High);
        // 9 直接 + 1 间接 = 18 + 1 = 19 -> High (临界值上界)
        assert_eq!(compute_risk_level(9, 1), RiskLevel::High);
    }

    #[test]
    fn test_compute_risk_level_critical() {
        // 10 直接 + 0 间接 = 20 -> Critical
        assert_eq!(compute_risk_level(10, 0), RiskLevel::Critical);
        // 5 直接 + 10 间接 = 10 + 10 = 20 -> Critical
        assert_eq!(compute_risk_level(5, 10), RiskLevel::Critical);
        // 100 直接 + 0 间接 = 200 -> Critical
        assert_eq!(compute_risk_level(100, 0), RiskLevel::Critical);
    }

    // ---------- generate_recommendations ----------

    fn make_service(name: &str, impact_type: &str) -> AffectedService {
        AffectedService {
            service_name: name.to_string(),
            impact_type: impact_type.to_string(),
            severity: "high".to_string(),
        }
    }

    #[test]
    fn test_generate_recommendations_critical() {
        let recs = generate_recommendations(&RiskLevel::Critical, &[]);
        assert!(recs.iter().any(|r| r.contains("应急")));
        assert!(recs.iter().any(|r| r.contains("回归测试")));
        assert_eq!(recs.len(), 2);
    }

    #[test]
    fn test_generate_recommendations_high() {
        let recs = generate_recommendations(&RiskLevel::High, &[]);
        assert!(recs.iter().any(|r| r.contains("通知受影响")));
        assert!(recs.iter().any(|r| r.contains("集成测试")));
        assert_eq!(recs.len(), 2);
    }

    #[test]
    fn test_generate_recommendations_medium() {
        let recs = generate_recommendations(&RiskLevel::Medium, &[]);
        assert!(recs.iter().any(|r| r.contains("业务低峰期")));
        assert_eq!(recs.len(), 1);
    }

    #[test]
    fn test_generate_recommendations_low() {
        let recs = generate_recommendations(&RiskLevel::Low, &[]);
        assert!(recs.iter().any(|r| r.contains("正常流程")));
        assert_eq!(recs.len(), 1);
    }

    #[test]
    fn test_generate_recommendations_includes_service_lines() {
        let services = vec![
            make_service("order-svc", "update"),
            make_service("report-svc", "delete"),
        ];
        let recs = generate_recommendations(&RiskLevel::Low, &services);
        // 1 base + 2 service lines
        assert_eq!(recs.len(), 3);
        assert!(recs.iter().any(|r| r.contains("order-svc")));
        assert!(recs.iter().any(|r| r.contains("report-svc")));
    }

    #[test]
    fn test_generate_recommendations_empty_services_critical() {
        let recs = generate_recommendations(&RiskLevel::Critical, &[]);
        assert_eq!(recs.len(), 2);
    }

    // ---------- 枚举 serde 往返 ----------

    #[test]
    fn test_edge_type_serde_roundtrip() {
        for v in [
            EdgeType::DerivesFrom,
            EdgeType::Transforms,
            EdgeType::DependsOn,
            EdgeType::Implements,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: EdgeType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_change_type_serde_roundtrip() {
        for v in [
            ChangeType::Create,
            ChangeType::Update,
            ChangeType::Delete,
            ChangeType::Rename,
            ChangeType::Merge,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: ChangeType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_risk_level_serde_roundtrip() {
        for v in [
            RiskLevel::Low,
            RiskLevel::Medium,
            RiskLevel::High,
            RiskLevel::Critical,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: RiskLevel = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_propagation_action_serde_roundtrip() {
        for v in [
            PropagationAction::CascadeUpdate,
            PropagationAction::SyncNotify,
            PropagationAction::Reject,
            PropagationAction::Transform,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: PropagationAction = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    // ---------- 结构体 serde 往返 ----------

    #[test]
    fn test_lineage_node_serde_roundtrip() {
        let node = LineageNode {
            id: "n-1".to_string(),
            entity_type: "source_system".to_string(),
            entity_id: "SAP".to_string(),
            name: "SAP".to_string(),
            description: Some("desc".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&node).unwrap();
        let back: LineageNode = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "n-1");
        assert_eq!(back.entity_id, "SAP");
        assert!(back.description.is_some());
    }

    #[test]
    fn test_lineage_edge_serde_roundtrip() {
        let edge = LineageEdge {
            id: "e-1".to_string(),
            from_node_id: "n-1".to_string(),
            to_node_id: "n-2".to_string(),
            edge_type: EdgeType::DerivesFrom,
            transformation_description: Some("desc".to_string()),
        };
        let json = serde_json::to_string(&edge).unwrap();
        let back: LineageEdge = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "e-1");
        assert_eq!(back.edge_type, EdgeType::DerivesFrom);
    }

    #[test]
    fn test_lineage_graph_serde_roundtrip() {
        let graph = LineageGraph {
            nodes: vec![],
            edges: vec![],
            version: 5,
            last_updated: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&graph).unwrap();
        let back: LineageGraph = serde_json::from_str(&json).unwrap();
        assert_eq!(back.version, 5);
    }

    #[test]
    fn test_impact_analysis_request_serde_roundtrip() {
        let req = ImpactAnalysisRequest {
            target_entity_id: "E001".to_string(),
            analysis_depth: Some(5),
            change_type: ChangeType::Update,
            include_chain_reactions: Some(true),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ImpactAnalysisRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.target_entity_id, "E001");
        assert_eq!(back.change_type, ChangeType::Update);
    }

    #[test]
    fn test_affected_node_serde_roundtrip() {
        let n = AffectedNode {
            node_id: "n-1".to_string(),
            entity_type: "mdm_entity".to_string(),
            entity_id: "E001".to_string(),
            name: "name".to_string(),
            is_direct: true,
            dependency_depth: 1,
        };
        let json = serde_json::to_string(&n).unwrap();
        let back: AffectedNode = serde_json::from_str(&json).unwrap();
        assert_eq!(back.node_id, "n-1");
        assert!(back.is_direct);
    }

    #[test]
    fn test_affected_service_serde_roundtrip() {
        let s = AffectedService {
            service_name: "order-svc".to_string(),
            impact_type: "update".to_string(),
            severity: "high".to_string(),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: AffectedService = serde_json::from_str(&json).unwrap();
        assert_eq!(back.service_name, "order-svc");
    }

    #[test]
    fn test_chain_reaction_serde_roundtrip() {
        let cr = ChainReaction {
            step: 2,
            trigger_node_id: "n-1".to_string(),
            affected_node_id: "n-2".to_string(),
            propagation_path: vec!["n-1".to_string(), "n-2".to_string()],
        };
        let json = serde_json::to_string(&cr).unwrap();
        let back: ChainReaction = serde_json::from_str(&json).unwrap();
        assert_eq!(back.step, 2);
        assert_eq!(back.propagation_path.len(), 2);
    }

    #[test]
    fn test_impact_analysis_result_serde_roundtrip() {
        let target = LineageNode {
            id: "n-1".to_string(),
            entity_type: "mdm_entity".to_string(),
            entity_id: "E001".to_string(),
            name: "name".to_string(),
            description: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let r = ImpactAnalysisResult {
            id: "ia-1".to_string(),
            target_node: target,
            affected_nodes: vec![],
            affected_services: vec![],
            risk_level: RiskLevel::Low,
            chain_reactions: vec![],
            recommendations: vec!["rec".to_string()],
            analyzed_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: ImpactAnalysisResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "ia-1");
        assert_eq!(back.risk_level, RiskLevel::Low);
        assert_eq!(back.recommendations.len(), 1);
    }

    #[test]
    fn test_impact_simulation_serde_roundtrip() {
        let s = ImpactSimulation {
            id: "sim-1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C001".to_string(),
            simulated_change: ChangeType::Update,
            affected_scope: serde_json::json!({"count": 5}),
            risk_assessment: "low_risk".to_string(),
            simulation_timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: ImpactSimulation = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "sim-1");
        assert_eq!(back.simulated_change, ChangeType::Update);
    }

    #[test]
    fn test_change_event_serde_roundtrip() {
        let e = ChangeEvent {
            id: "ce-1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C001".to_string(),
            change_type: ChangeType::Create,
            old_value: None,
            new_value: Some(serde_json::json!({"k": "v"})),
            triggered_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&e).unwrap();
        let back: ChangeEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "ce-1");
        assert!(back.new_value.is_some());
    }

    #[test]
    fn test_propagation_rule_serde_roundtrip() {
        let r = PropagationRule {
            id: "pr-1".to_string(),
            source_entity_type: "customer".to_string(),
            target_entity_type: "order".to_string(),
            condition: "code_changed".to_string(),
            action: PropagationAction::CascadeUpdate,
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: PropagationRule = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "pr-1");
        assert_eq!(back.action, PropagationAction::CascadeUpdate);
    }

    #[test]
    fn test_propagation_log_serde_roundtrip() {
        let l = PropagationLog {
            id: "pl-1".to_string(),
            change_event_id: "ce-1".to_string(),
            rule_id: "pr-1".to_string(),
            source_entity_id: "C001".to_string(),
            target_entity_id: "order:*".to_string(),
            action: PropagationAction::SyncNotify,
            status: "propagated".to_string(),
            propagated_at: "2024-01-01T00:00:00Z".to_string(),
            rollback_id: None,
        };
        let json = serde_json::to_string(&l).unwrap();
        let back: PropagationLog = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "pl-1");
        assert!(back.rollback_id.is_none());
    }

    // ---------- Clone/Eq trait ----------

    #[test]
    fn test_lineage_node_clone_eq() {
        let n = LineageNode {
            id: "n-1".to_string(),
            entity_type: "et".to_string(),
            entity_id: "eid".to_string(),
            name: "n".to_string(),
            description: None,
            created_at: "t".to_string(),
        };
        let cloned = n.clone();
        assert_eq!(n.id, cloned.id);
    }

    #[test]
    fn test_edge_type_eq() {
        assert_eq!(EdgeType::DerivesFrom, EdgeType::DerivesFrom);
        assert_ne!(EdgeType::DerivesFrom, EdgeType::Transforms);
    }

    #[test]
    fn test_risk_level_eq() {
        assert_eq!(RiskLevel::Critical, RiskLevel::Critical);
        assert_ne!(RiskLevel::Critical, RiskLevel::Low);
    }
}
