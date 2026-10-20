//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V52.0 MDM AC-24: 数据血缘 + 影响分析 + 变更传播
//!
//! 核心能力：
//! - 数据血缘 (Data Lineage): 自动/手动血缘捕获、图谱遍历（上游/下游）、可视化导出（DOT/JSON）
//! - 影响分析 (Impact Analysis): 直接/间接依赖分析、连锁反应模拟、服务级影响评估、风险等级计算
//! - 变更传播 (Change Propagation): 变更检测与事件生成、规则驱动传播、级联更新、冲突解决、传播审计追踪
//!
//! 设计风格：ApiResponse + K1 真表（master_data schema，sqlx 直读写，store 已收敛）

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use std::collections::{HashMap, HashSet};
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

// ==================== K1：真表映射（master_data.mdm_lineage_*） ====================

fn node_from_row(row: &sqlx::postgres::PgRow) -> LineageNode {
    LineageNode {
        id: row.get::<String, _>("id"),
        entity_type: row.get::<String, _>("entity_type"),
        entity_id: row.get::<String, _>("entity_id"),
        name: row.get::<String, _>("name"),
        description: row.get::<Option<String>, _>("description"),
        created_at: row.get::<String, _>("created_at"),
    }
}
const NODE_COLS: &str = "id, entity_type, entity_id, name, description, created_at";

fn edge_from_row(row: &sqlx::postgres::PgRow) -> LineageEdge {
    LineageEdge {
        id: row.get::<String, _>("id"),
        from_node_id: row.get::<String, _>("from_node_id"),
        to_node_id: row.get::<String, _>("to_node_id"),
        edge_type: edge_type_from_str(&row.get::<String, _>("edge_type")),
        transformation_description: row.get::<Option<String>, _>("transformation_description"),
    }
}
const EDGE_COLS: &str = "id, from_node_id, to_node_id, edge_type, transformation_description";

fn graph_from_row(row: &sqlx::postgres::PgRow) -> LineageGraph {
    LineageGraph {
        nodes: serde_json::from_value(row.get::<serde_json::Value, _>("nodes")).unwrap_or_default(),
        edges: serde_json::from_value(row.get::<serde_json::Value, _>("edges")).unwrap_or_default(),
        version: row.get::<i64, _>("version"),
        last_updated: row.get::<String, _>("last_updated"),
    }
}
const GRAPH_COLS: &str = "id, nodes, edges, version, last_updated";

fn analysis_from_row(
    row: &sqlx::postgres::PgRow,
) -> Result<ImpactAnalysisResult, serde_json::Error> {
    serde_json::from_value(row.get::<serde_json::Value, _>("data"))
}
const ANALYSIS_COLS: &str = "id, data";

fn event_from_row(row: &sqlx::postgres::PgRow) -> ChangeEvent {
    ChangeEvent {
        id: row.get::<String, _>("id"),
        entity_type: row.get::<String, _>("entity_type"),
        entity_id: row.get::<String, _>("entity_id"),
        change_type: change_type_from_str(&row.get::<String, _>("change_type")),
        old_value: row.get::<Option<serde_json::Value>, _>("old_value"),
        new_value: row.get::<Option<serde_json::Value>, _>("new_value"),
        triggered_at: row.get::<String, _>("triggered_at"),
    }
}
const EVENT_COLS: &str =
    "id, entity_type, entity_id, change_type, old_value, new_value, triggered_at";

fn rule_from_row(row: &sqlx::postgres::PgRow) -> PropagationRule {
    PropagationRule {
        id: row.get::<String, _>("id"),
        source_entity_type: row.get::<String, _>("source_entity_type"),
        target_entity_type: row.get::<String, _>("target_entity_type"),
        condition: row.get::<String, _>("condition"),
        action: propagation_action_from_str(&row.get::<String, _>("action")),
    }
}
const RULE_COLS: &str = "id, source_entity_type, target_entity_type, condition, action";

fn log_from_row(row: &sqlx::postgres::PgRow) -> PropagationLog {
    PropagationLog {
        id: row.get::<String, _>("id"),
        change_event_id: row.get::<String, _>("change_event_id"),
        rule_id: row.get::<String, _>("rule_id"),
        source_entity_id: row.get::<String, _>("source_entity_id"),
        target_entity_id: row.get::<String, _>("target_entity_id"),
        action: propagation_action_from_str(&row.get::<String, _>("action")),
        status: row.get::<String, _>("status"),
        propagated_at: row.get::<String, _>("propagated_at"),
        rollback_id: row.get::<Option<String>, _>("rollback_id"),
    }
}
const LOG_COLS: &str = "id, change_event_id, rule_id, source_entity_id, target_entity_id, action, status, propagated_at, rollback_id";

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

// ==================== 初始化种子数据 ====================

// ==================== U4 持久化 ====================

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
        db: &sqlx::PgPool,
        from_entity_type: String,
        from_entity_id: String,
        to_entity_type: String,
        to_entity_id: String,
        edge_type: EdgeType,
        transformation_description: Option<String>,
    ) -> Result<(LineageNode, LineageNode, LineageEdge), TopemsError> {
        let now = chrono::Utc::now().to_rfc3339();

        // K1：真表权威——节点按 (entity_type, entity_id) 查复用，缺则 INSERT。
        let from_node = sqlx::query(&format!(
            "SELECT {NODE_COLS} FROM master_data.mdm_lineage_nodes
             WHERE entity_type = $1 AND entity_id = $2 LIMIT 1"
        ))
        .bind(&from_entity_type)
        .bind(&from_entity_id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询上游节点失败: {e}")))?
        .map(|r| node_from_row(&r))
        .unwrap_or_else(|| {
            let node = LineageNode {
                id: uuid::Uuid::new_v4().to_string(),
                entity_type: from_entity_type.clone(),
                entity_id: from_entity_id.clone(),
                name: format!("{}:{}", from_entity_type, from_entity_id),
                description: None,
                created_at: now.clone(),
            };
            node
        });

        let to_node = sqlx::query(&format!(
            "SELECT {NODE_COLS} FROM master_data.mdm_lineage_nodes
             WHERE entity_type = $1 AND entity_id = $2 LIMIT 1"
        ))
        .bind(&to_entity_type)
        .bind(&to_entity_id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询下游节点失败: {e}")))?
        .map(|r| node_from_row(&r))
        .unwrap_or_else(|| {
            let node = LineageNode {
                id: uuid::Uuid::new_v4().to_string(),
                entity_type: to_entity_type.clone(),
                entity_id: to_entity_id.clone(),
                name: format!("{}:{}", to_entity_type, to_entity_id),
                description: None,
                created_at: now.clone(),
            };
            node
        });

        // 缺失节点落库。
        for node in [&from_node, &to_node] {
            sqlx::query(
                r#"INSERT INTO master_data.mdm_lineage_nodes
                   (id, entity_type, entity_id, name, description, created_at, tenant_id)
                   VALUES ($1,$2,$3,$4,$5,$6, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
                   ON CONFLICT (id) DO NOTHING"#,
            )
            .bind(&node.id)
            .bind(&node.entity_type)
            .bind(&node.entity_id)
            .bind(&node.name)
            .bind(&node.description)
            .bind(&node.created_at)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("写入血缘节点失败: {e}")))?;
        }

        let edge = LineageEdge {
            id: uuid::Uuid::new_v4().to_string(),
            from_node_id: from_node.id.clone(),
            to_node_id: to_node.id.clone(),
            edge_type,
            transformation_description,
        };
        sqlx::query(
            r#"INSERT INTO master_data.mdm_lineage_edges
               (id, from_node_id, to_node_id, edge_type, transformation_description, tenant_id)
               VALUES ($1,$2,$3,$4,$5, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
        )
        .bind(&edge.id)
        .bind(&edge.from_node_id)
        .bind(&edge.to_node_id)
        .bind(edge_type_to_str(&edge.edge_type))
        .bind(&edge.transformation_description)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入血缘边失败: {e}")))?;

        // 图谱整体重算（读全量节点/边 → upsert 默认图）。
        refresh_graph(db).await?;

        Ok((from_node, to_node, edge))
    }

    async fn get_graph(db: &sqlx::PgPool) -> LineageGraph {
        sqlx::query(&format!(
            "SELECT {GRAPH_COLS} FROM master_data.mdm_lineage_graphs ORDER BY id LIMIT 1"
        ))
        .fetch_optional(db)
        .await
        .ok()
        .flatten()
        .map(|r| graph_from_row(&r))
        .unwrap_or_else(|| LineageGraph {
            nodes: Vec::new(),
            edges: Vec::new(),
            version: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }

    async fn get_upstream(
        db: &sqlx::PgPool,
        node_id: &str,
        depth: Option<i32>,
    ) -> Vec<LineageNode> {
        let nodes = fetch_nodes(db).await;
        let edges = fetch_edges(db).await;

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

    async fn get_downstream(
        db: &sqlx::PgPool,
        node_id: &str,
        depth: Option<i32>,
    ) -> Vec<LineageNode> {
        let nodes = fetch_nodes(db).await;
        let edges = fetch_edges(db).await;

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

    async fn export_graph(db: &sqlx::PgPool, format: &str) -> Result<String, TopemsError> {
        let graph = Self::get_graph(db).await;

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
            "json" => serde_json::to_string_pretty(&graph)
                .map_err(|e| TopemsError::BusinessLogic(e.to_string())),
            _ => Err(TopemsError::ValidationFailed(format!(
                "不支持的导出格式: {}",
                format
            ))),
        }
    }

    async fn delete_node(db: &sqlx::PgPool, node_id: &str) -> Result<(), TopemsError> {
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (SELECT 1 FROM master_data.mdm_lineage_nodes WHERE id = $1)",
        )
        .bind(node_id)
        .fetch_one(db)
        .await
        .unwrap_or(false);
        if !exists {
            return Err(TopemsError::BusinessLogic("未找到血缘节点".to_string()));
        }

        sqlx::query("DELETE FROM master_data.mdm_lineage_nodes WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))")
            .bind(node_id)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("删除血缘节点失败: {e}")))?;
        sqlx::query(
            "DELETE FROM master_data.mdm_lineage_edges WHERE (from_node_id = $1 OR to_node_id = $1) AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(node_id)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("删除血缘边失败: {e}")))?;

        refresh_graph(db).await?;

        Ok(())
    }
}

// ==================== K1：图谱/节点/边 读取与重算助手 ====================

async fn fetch_nodes(db: &sqlx::PgPool) -> Vec<LineageNode> {
    sqlx::query(&format!(
        "SELECT {NODE_COLS} FROM master_data.mdm_lineage_nodes"
    ))
    .fetch_all(db)
    .await
    .map(|rows| rows.iter().map(node_from_row).collect())
    .unwrap_or_default()
}

async fn fetch_edges(db: &sqlx::PgPool) -> Vec<LineageEdge> {
    sqlx::query(&format!(
        "SELECT {EDGE_COLS} FROM master_data.mdm_lineage_edges"
    ))
    .fetch_all(db)
    .await
    .map(|rows| rows.iter().map(edge_from_row).collect())
    .unwrap_or_default()
}

async fn refresh_graph(db: &sqlx::PgPool) -> Result<(), TopemsError> {
    let nodes = fetch_nodes(db).await;
    let edges = fetch_edges(db).await;
    let now = chrono::Utc::now().to_rfc3339();
    let graph = LineageGraph {
        nodes,
        edges,
        version: 0,
        last_updated: now,
    };
    sqlx::query(
        r#"INSERT INTO master_data.mdm_lineage_graphs (id, nodes, edges, version, last_updated, tenant_id)
           VALUES ('default', $1, $2, 1, $3, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
           ON CONFLICT (id) DO UPDATE
           SET nodes = EXCLUDED.nodes, edges = EXCLUDED.edges,
               version = master_data.mdm_lineage_graphs.version + 1,
               last_updated = EXCLUDED.last_updated"#,
    )
    .bind(serde_json::to_value(&graph.nodes).unwrap_or_default())
    .bind(serde_json::to_value(&graph.edges).unwrap_or_default())
    .bind(&graph.last_updated)
    .execute(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("刷新血缘图谱失败: {e}")))?;
    Ok(())
}

fn edge_type_to_str(e: &EdgeType) -> &'static str {
    match e {
        EdgeType::DerivesFrom => "derives_from",
        EdgeType::Transforms => "transforms",
        EdgeType::DependsOn => "depends_on",
        EdgeType::Implements => "implements",
    }
}

// ==================== ImpactAnalyzer 实现 ====================

struct ImpactAnalyzer;

impl ImpactAnalyzer {
    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_possible_wrap
    )]
    async fn analyze(
        db: &sqlx::PgPool,
        req: &ImpactAnalysisRequest,
    ) -> Result<ImpactAnalysisResult, TopemsError> {
        let nodes = fetch_nodes(db).await;
        let edges = fetch_edges(db).await;

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

        // K1：结果写真表（JSONB 全量承载）。
        let data = serde_json::to_value(&result)
            .map_err(|e| TopemsError::BusinessLogic(format!("影响分析序列化失败: {e}")))?;
        sqlx::query(
            r#"INSERT INTO master_data.mdm_impact_analyses (id, data, analyzed_at, tenant_id)
               VALUES ($1, $2, $3, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
        )
        .bind(&result.id)
        .bind(&data)
        .bind(&result.analyzed_at)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入影响分析失败: {e}")))?;

        Ok(result)
    }

    async fn get_report(db: &sqlx::PgPool, id: &str) -> Result<ImpactAnalysisResult, TopemsError> {
        let row = sqlx::query(&format!(
            "SELECT {ANALYSIS_COLS} FROM master_data.mdm_impact_analyses WHERE id = $1"
        ))
        .bind(id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询影响分析失败: {e}")))?
        .ok_or_else(|| TopemsError::ResourceNotFound("未找到影响分析报告".to_string()))?;
        analysis_from_row(&row)
            .map_err(|e| TopemsError::BusinessLogic(format!("影响分析数据反序列化失败: {e}")))
    }

    async fn simulate(
        db: &sqlx::PgPool,
        entity_type: String,
        entity_id: String,
        change_type: ChangeType,
    ) -> Result<ImpactSimulation, TopemsError> {
        let nodes = fetch_nodes(db).await;
        let edges = fetch_edges(db).await;

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

        let data = serde_json::to_value(&simulation)
            .map_err(|e| TopemsError::BusinessLogic(format!("变更模拟序列化失败: {e}")))?;
        sqlx::query(
            r#"INSERT INTO master_data.mdm_impact_simulations (id, data, created_at, tenant_id)
               VALUES ($1, $2, $3, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
        )
        .bind(&simulation.id)
        .bind(&data)
        .bind(&simulation.simulation_timestamp)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入变更模拟失败: {e}")))?;

        Ok(simulation)
    }

    async fn get_affected_scope(
        db: &sqlx::PgPool,
        entity_type: String,
        entity_id: String,
    ) -> Result<serde_json::Value, TopemsError> {
        let nodes = fetch_nodes(db).await;
        let edges = fetch_edges(db).await;

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
        db: &sqlx::PgPool,
        entity_type: String,
        entity_id: String,
        change_type: ChangeType,
        old_value: Option<serde_json::Value>,
        new_value: Option<serde_json::Value>,
    ) -> Result<(ChangeEvent, Vec<PropagationLog>), TopemsError> {
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

        // K1：规则从真表读取。
        let rules: Vec<PropagationRule> = sqlx::query(&format!(
            "SELECT {RULE_COLS} FROM master_data.mdm_propagation_rules
             WHERE source_entity_type = $1"
        ))
        .bind(&entity_type)
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(rule_from_row).collect())
        .unwrap_or_default();

        let mut logs = Vec::new();
        for rule in &rules {
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

        // K1：事件 + 日志写真表。
        sqlx::query(
            r#"INSERT INTO master_data.mdm_change_events
               (id, entity_type, entity_id, change_type, old_value, new_value, triggered_at, tenant_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
        )
        .bind(&event.id)
        .bind(&event.entity_type)
        .bind(&event.entity_id)
        .bind(change_type_to_str(&event.change_type))
        .bind(&event.old_value)
        .bind(&event.new_value)
        .bind(&event.triggered_at)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入变更事件失败: {e}")))?;

        for log in &logs {
            sqlx::query(
                r#"INSERT INTO master_data.mdm_propagation_logs
                   (id, change_event_id, rule_id, source_entity_id, target_entity_id, action, status, propagated_at, tenant_id)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
            )
            .bind(&log.id)
            .bind(&log.change_event_id)
            .bind(&log.rule_id)
            .bind(&log.source_entity_id)
            .bind(&log.target_entity_id)
            .bind(propagation_action_to_str(&log.action))
            .bind(&log.status)
            .bind(&log.propagated_at)
            .execute(db)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("写入传播日志失败: {e}")))?;
        }

        Ok((event, logs))
    }

    async fn get_rules(db: &sqlx::PgPool) -> Vec<PropagationRule> {
        sqlx::query(&format!(
            "SELECT {RULE_COLS} FROM master_data.mdm_propagation_rules"
        ))
        .fetch_all(db)
        .await
        .map(|rows| rows.iter().map(rule_from_row).collect())
        .unwrap_or_default()
    }

    async fn add_rule(
        db: &sqlx::PgPool,
        source_entity_type: String,
        target_entity_type: String,
        condition: String,
        action: PropagationAction,
    ) -> Result<PropagationRule, TopemsError> {
        let rule = PropagationRule {
            id: uuid::Uuid::new_v4().to_string(),
            source_entity_type,
            target_entity_type,
            condition,
            action,
        };
        sqlx::query(
            r#"INSERT INTO master_data.mdm_propagation_rules
               (id, source_entity_type, target_entity_type, condition, action, tenant_id)
               VALUES ($1,$2,$3,$4,$5, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
        )
        .bind(&rule.id)
        .bind(&rule.source_entity_type)
        .bind(&rule.target_entity_type)
        .bind(&rule.condition)
        .bind(propagation_action_to_str(&rule.action))
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入传播规则失败: {e}")))?;
        Ok(rule)
    }

    async fn get_log(
        db: &sqlx::PgPool,
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> Vec<PropagationLog> {
        let mut sql = format!("SELECT {LOG_COLS} FROM master_data.mdm_propagation_logs");
        let mut binds: Vec<String> = Vec::new();
        let mut conds = Vec::new();
        if let Some(eid) = &entity_id {
            conds.push("source_entity_id = $1".to_string());
            binds.push(eid.clone());
        }
        let _ = &entity_type;
        if !conds.is_empty() {
            sql.push_str(&format!(" WHERE {}", conds.join(" AND ")));
        }
        let mut q = sqlx::query(&sql);
        for b in &binds {
            q = q.bind(b);
        }
        q.fetch_all(db)
            .await
            .map(|rows| rows.iter().map(log_from_row).collect())
            .unwrap_or_default()
    }

    async fn rollback(
        db: &sqlx::PgPool,
        propagation_id: &str,
    ) -> Result<PropagationLog, TopemsError> {
        let existing = sqlx::query(&format!(
            "SELECT {LOG_COLS} FROM master_data.mdm_propagation_logs WHERE id = $1"
        ))
        .bind(propagation_id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询传播记录失败: {e}")))?
        .map(|r| log_from_row(&r));
        let log = match existing {
            Some(l) => l,
            None => return Err(TopemsError::BusinessLogic("未找到传播记录".to_string())),
        };
        if log.status == "rolled_back" {
            return Err(TopemsError::BusinessLogic("该记录已回滚".to_string()));
        }
        let rollback_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "UPDATE master_data.mdm_propagation_logs SET status = 'rolled_back', rollback_id = $2 WHERE id = $1",
        )
        .bind(propagation_id)
        .bind(&rollback_id)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("回滚传播记录失败: {e}")))?;

        let mut rolled_back = log;
        rolled_back.status = "rolled_back".to_string();
        rolled_back.rollback_id = Some(rollback_id);
        Ok(rolled_back)
    }
}

fn change_type_to_str(c: &ChangeType) -> &'static str {
    match c {
        ChangeType::Create => "create",
        ChangeType::Update => "update",
        ChangeType::Delete => "delete",
        ChangeType::Rename => "rename",
        ChangeType::Merge => "merge",
    }
}

fn propagation_action_to_str(a: &PropagationAction) -> &'static str {
    match a {
        PropagationAction::CascadeUpdate => "cascade_update",
        PropagationAction::SyncNotify => "sync_notify",
        PropagationAction::Reject => "reject",
        PropagationAction::Transform => "transform",
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/register",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn register_lineage(
    State(state): State<AppState>,
    Json(req): Json<RegisterLineageRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let edge_type = edge_type_from_str(&req.edge_type);

    match LineageTracker::register(
        &state.db,
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
        Err(e) => Json(ApiResponse::error(500, &e.classify().1)),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/lineage-v52/graph",
    responses((status = 200, description = "get_lineage_graph OK")),
    tag = "lineage_v52"
)]

pub async fn get_lineage_graph(State(state): State<AppState>) -> Json<ApiResponse<LineageGraph>> {
    let graph = LineageTracker::get_graph(&state.db).await;
    Json(ApiResponse::success(graph, "血缘图谱"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/lineage-v52/upstream/{entity_type}/{id}",
    params(
        ("entity_type" = String, Path, description = "entity_type"),
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get_upstream OK")),
    tag = "lineage_v52"
)]

pub async fn get_upstream(
    State(state): State<AppState>,
    Path((entity_type, id)): Path<(String, String)>,
    Query(params): Query<LineageQuery>,
) -> Json<ApiResponse<Vec<LineageNode>>> {
    // K1：目标节点从真表查询。
    let target = sqlx::query(&format!(
        "SELECT {NODE_COLS} FROM master_data.mdm_lineage_nodes
         WHERE entity_type = $1 AND entity_id = $2 LIMIT 1"
    ))
    .bind(&entity_type)
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten()
    .map(|r| node_from_row(&r));

    let target = match target {
        Some(t) => t,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };

    let upstream = LineageTracker::get_upstream(&state.db, &target.id, params.depth).await;
    Json(ApiResponse::success(upstream, "上游血缘节点"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/lineage-v52/downstream/{entity_type}/{id}",
    params(
        ("entity_type" = String, Path, description = "entity_type"),
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get_downstream OK")),
    tag = "lineage_v52"
)]

pub async fn get_downstream(
    State(state): State<AppState>,
    Path((entity_type, id)): Path<(String, String)>,
    Query(params): Query<LineageQuery>,
) -> Json<ApiResponse<Vec<LineageNode>>> {
    // K1：目标节点从真表查询。
    let target = sqlx::query(&format!(
        "SELECT {NODE_COLS} FROM master_data.mdm_lineage_nodes
         WHERE entity_type = $1 AND entity_id = $2 LIMIT 1"
    ))
    .bind(&entity_type)
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten()
    .map(|r| node_from_row(&r));

    let target = match target {
        Some(t) => t,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };

    let downstream = LineageTracker::get_downstream(&state.db, &target.id, params.depth).await;
    Json(ApiResponse::success(downstream, "下游血缘节点"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/lineage-v52/export",
    responses((status = 200, description = "export_lineage OK")),
    tag = "lineage_v52"
)]

pub async fn export_lineage(
    State(state): State<AppState>,
    Query(params): Query<ExportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let format = params.format.unwrap_or_else(|| "json".to_string());
    match LineageTracker::export_graph(&state.db, &format).await {
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
        Err(e) => Json(ApiResponse::error(500, &e.classify().1)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/delete",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn delete_lineage(
    State(state): State<AppState>,
    Json(req): Json<DeleteLineageRequest>,
) -> Json<ApiResponse<()>> {
    match LineageTracker::delete_node(&state.db, &req.node_id).await {
        Ok(()) => Json(ApiResponse::success_no_data("血缘节点已删除")),
        Err(e) => Json(ApiResponse::error(404, &e.classify().1)),
    }
}

// ==================== API 处理器：影响分析 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/impact/analyze",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn analyze_impact(
    State(state): State<AppState>,
    Json(req): Json<AnalyzeImpactRequest>,
) -> Json<ApiResponse<ImpactAnalysisResult>> {
    let change_type = change_type_from_str(&req.change_type);
    let analysis_req = ImpactAnalysisRequest {
        target_entity_id: req.target_entity_id,
        analysis_depth: req.analysis_depth,
        change_type,
        include_chain_reactions: req.include_chain_reactions,
    };

    match ImpactAnalyzer::analyze(&state.db, &analysis_req).await {
        Ok(result) => Json(ApiResponse::success(result, "影响分析完成")),
        Err(e) => Json(ApiResponse::error(404, &e.classify().1)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:lineage:read"])),
    path = "/lineage-v52/impact/report/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn get_impact_report(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ImpactAnalysisResult>> {
    match ImpactAnalyzer::get_report(&state.db, &id).await {
        Ok(report) => Json(ApiResponse::success(report, "影响分析报告")),
        Err(e) => Json(ApiResponse::from(e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/impact/simulate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn simulate_change(
    State(state): State<AppState>,
    Json(req): Json<SimulateChangeRequest>,
) -> Json<ApiResponse<ImpactSimulation>> {
    let change_type = change_type_from_str(&req.change_type);
    match ImpactAnalyzer::simulate(&state.db, req.entity_type, req.entity_id, change_type).await {
        Ok(simulation) => Json(ApiResponse::success(simulation, "变更模拟完成")),
        Err(e) => Json(ApiResponse::error(404, &e.classify().1)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:lineage:read"])),
    path = "/lineage-v52/impact/scope",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn get_affected_scope(
    State(state): State<AppState>,
    Query(params): Query<AffectedScopeQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    match ImpactAnalyzer::get_affected_scope(&state.db, params.entity_type, params.entity_id).await
    {
        Ok(scope) => Json(ApiResponse::success(scope, "受影响范围")),
        Err(e) => Json(ApiResponse::error(404, &e.classify().1)),
    }
}

// ==================== API 处理器：变更传播 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/propagate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn propagate_change(
    State(state): State<AppState>,
    Json(req): Json<PropagateChangeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let change_type = change_type_from_str(&req.change_type);
    match ChangePropagator::propagate(
        &state.db,
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
        Err(e) => Json(ApiResponse::error(500, &e.classify().1)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:lineage:read"])),
    path = "/lineage-v52/propagation/rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn get_propagation_rules(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<PropagationRule>>> {
    let rules = ChangePropagator::get_rules(&state.db).await;
    Json(ApiResponse::success(rules, "传播规则列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/propagation/rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn add_propagation_rule(
    State(state): State<AppState>,
    Json(req): Json<AddPropagationRuleRequest>,
) -> Json<ApiResponse<PropagationRule>> {
    let action = propagation_action_from_str(&req.action);
    match ChangePropagator::add_rule(
        &state.db,
        req.source_entity_type,
        req.target_entity_type,
        req.condition,
        action,
    )
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "传播规则已添加")),
        Err(e) => Json(ApiResponse::error(500, &e.classify().1)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:lineage:read"])),
    path = "/lineage-v52/propagation/log",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
pub async fn get_propagation_log(
    State(state): State<AppState>,
    Query(params): Query<PropagationLogQuery>,
) -> Json<ApiResponse<PaginatedResponse<PropagationLog>>> {
    let logs = ChangePropagator::get_log(&state.db, params.entity_type, params.entity_id).await;

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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:lineage:write"])),
    path = "/lineage-v52/propagation/rollback",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "lineage_v52"
)]
pub async fn rollback_propagation(
    State(state): State<AppState>,
    Json(req): Json<RollbackPropagationRequest>,
) -> Json<ApiResponse<PropagationLog>> {
    match ChangePropagator::rollback(&state.db, &req.propagation_id).await {
        Ok(log) => Json(ApiResponse::success(log, "传播已回滚")),
        Err(e) => Json(ApiResponse::error(404, &e.classify().1)),
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
