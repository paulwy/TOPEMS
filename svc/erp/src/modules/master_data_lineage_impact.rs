//! 主数据血缘溯源 + 影响分析 + 数据血缘图谱模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V46.0 AC-18）。
//! 提供主数据实体的血缘溯源、变更影响分析和数据血缘图谱功能。
//!
//! 功能：
//! - Part 1: 数据血缘溯源（上游/下游/双向溯源、数据来源查找、路径查找）
//! - Part 2: 影响分析（变更影响范围评估、风险等级、工作量估算、报告生成）
//! - Part 3: 数据血缘图谱（图谱构建、过滤、统计、导出、关键路径、循环依赖检测）

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;

// ==================== Part 1: 数据血缘溯源类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LineageDirection {
    Upstream,
    Downstream,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LineageRelationship {
    References,
    DependsOn,
    Produces,
    Consumes,
    Transforms,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageTraceQuery {
    pub entity_id: String,
    pub trace_depth: Option<usize>,
    pub direction: Option<LineageDirection>,
    pub relationship_types: Option<Vec<LineageRelationship>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LineageTraceResult {
    pub nodes: Vec<LineageGraphNode>,
    pub edges: Vec<LineageGraphEdge>,
    pub trace_path: Vec<String>,
    pub depth_reached: usize,
}

// ==================== Part 2: 影响分析类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImpactSeverity {
    Critical,
    High,
    Medium,
    Low,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    SchemaChange,
    DataChange,
    BusinessRuleChange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImpactAnalysisRequest {
    pub entity_id: String,
    pub change_type: ChangeType,
    pub affected_fields: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImpactedEntity {
    pub entity_id: String,
    pub entity_name: String,
    pub domain: String,
    pub impact_severity: ImpactSeverity,
    pub change_required: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImpactAnalysisResult {
    pub impacted_entities: Vec<ImpactedEntity>,
    pub risk_level: ImpactSeverity,
    pub estimated_effort: f64,
    pub recommendations: Vec<String>,
}

// ==================== Part 3: 数据血缘图谱类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GraphLayout {
    Hierarchical,
    ForceDirected,
    Circular,
    Radial,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageGraphNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub domain: String,
    pub attributes: serde_json::Value,
    pub level: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageGraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub relationship: LineageRelationship,
    pub weight: f64,
    pub attributes: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct DataLineageGraph {
    pub nodes: Vec<LineageGraphNode>,
    pub edges: Vec<LineageGraphEdge>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct LineageGraphStats {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub nodes_by_type: HashMap<String, usize>,
    pub nodes_by_domain: HashMap<String, usize>,
    pub edges_by_relationship: HashMap<String, usize>,
    pub avg_degree: f64,
    pub density: f64,
    pub max_depth: usize,
    pub leaf_nodes: usize,
    pub root_nodes: usize,
}

// ==================== 内存存储 ====================

struct LineageTraceStore {
    nodes: tokio::sync::Mutex<Vec<LineageGraphNode>>,
    edges: tokio::sync::Mutex<Vec<LineageGraphEdge>>,
    impact_reports: tokio::sync::Mutex<HashMap<String, ImpactAnalysisResult>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_lineage_trace_store() -> &'static LineageTraceStore {
    static STORE: LazyLock<LineageTraceStore> = LazyLock::new(|| LineageTraceStore {
        nodes: tokio::sync::Mutex::new(Vec::new()),
        edges: tokio::sync::Mutex::new(Vec::new()),
        impact_reports: tokio::sync::Mutex::new(HashMap::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_lineage_trace_initialized() {
    let store = get_lineage_trace_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let domains = vec![
        ("customer", "客户"),
        ("supplier", "供应商"),
        ("material", "物料"),
        ("product", "产品"),
        ("order", "订单"),
        ("finance", "财务"),
        ("organization", "组织"),
        ("employee", "员工"),
    ];

    let entity_names: HashMap<&str, Vec<(&str, &str)>> = [
        (
            "customer",
            vec![
                ("CUST001", "华信科技"),
                ("CUST002", "盛达贸易"),
                ("CUST003", "恒泰制造"),
            ],
        ),
        (
            "supplier",
            vec![("SUPP001", "原材料供应商A"), ("SUPP002", "零部件供应商B")],
        ),
        (
            "material",
            vec![
                ("MAT001", "原材料A"),
                ("MAT002", "原材料B"),
                ("MAT003", "零部件X"),
            ],
        ),
        (
            "product",
            vec![("PROD001", "产品甲"), ("PROD002", "产品乙")],
        ),
        (
            "order",
            vec![("ORD001", "销售订单001"), ("ORD002", "采购订单001")],
        ),
        (
            "finance",
            vec![("FIN001", "应收账款"), ("FIN002", "应付账款")],
        ),
        (
            "organization",
            vec![("ORG001", "总部"), ("ORG002", "华东分公司")],
        ),
        ("employee", vec![("EMP001", "张三"), ("EMP002", "李四")]),
    ]
    .iter()
    .cloned()
    .collect();

    let mut nodes: Vec<LineageGraphNode> = Vec::new();
    let mut edges: Vec<LineageGraphEdge> = Vec::new();
    let mut edge_id_counter = 0;

    for (domain, domain_label) in &domains {
        if let Some(entities) = entity_names.get(domain) {
            for (i, (entity_id, entity_name)) in entities.iter().enumerate() {
                nodes.push(LineageGraphNode {
                    id: format!("{}:{}", domain, entity_id),
                    label: entity_name.to_string(),
                    node_type: domain_label.to_string(),
                    domain: domain.to_string(),
                    attributes: serde_json::json!({
                        "code": entity_id,
                        "status": "active",
                    }),
                    level: i as i32,
                });
            }
        }
    }

    let edge_definitions = vec![
        (
            "material:MAT001",
            "product:PROD001",
            LineageRelationship::Produces,
            0.8,
        ),
        (
            "material:MAT002",
            "product:PROD001",
            LineageRelationship::Consumes,
            0.6,
        ),
        (
            "material:MAT003",
            "product:PROD002",
            LineageRelationship::Transforms,
            0.7,
        ),
        (
            "supplier:SUPP001",
            "material:MAT001",
            LineageRelationship::References,
            0.9,
        ),
        (
            "supplier:SUPP002",
            "material:MAT003",
            LineageRelationship::DependsOn,
            0.85,
        ),
        (
            "product:PROD001",
            "order:ORD001",
            LineageRelationship::References,
            0.75,
        ),
        (
            "customer:CUST001",
            "order:ORD001",
            LineageRelationship::DependsOn,
            0.9,
        ),
        (
            "order:ORD001",
            "finance:FIN001",
            LineageRelationship::Produces,
            0.8,
        ),
        (
            "order:ORD002",
            "finance:FIN002",
            LineageRelationship::Consumes,
            0.7,
        ),
        (
            "employee:EMP001",
            "customer:CUST001",
            LineageRelationship::References,
            0.5,
        ),
        (
            "organization:ORG001",
            "employee:EMP001",
            LineageRelationship::DependsOn,
            0.6,
        ),
        (
            "organization:ORG002",
            "employee:EMP002",
            LineageRelationship::References,
            0.55,
        ),
        (
            "customer:CUST002",
            "order:ORD002",
            LineageRelationship::Transforms,
            0.65,
        ),
    ];

    for (source, target, relationship, weight) in &edge_definitions {
        edge_id_counter += 1;
        edges.push(LineageGraphEdge {
            id: format!("edge-{}", edge_id_counter),
            source: source.to_string(),
            target: target.to_string(),
            relationship: relationship.clone(),
            weight: *weight,
            attributes: serde_json::json!({
                "created_at": chrono::Utc::now().to_rfc3339(),
            }),
        });
    }

    *store.nodes.lock().await = nodes;
    *store.edges.lock().await = edges;
    *initialized = true;
}

// ==================== Part 1: 血缘溯源功能 ====================

async fn trace_lineage(query: &LineageTraceQuery) -> LineageTraceResult {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();
    let nodes = store.nodes.lock().await.clone();
    let edges = store.edges.lock().await.clone();

    let max_depth = query.trace_depth.unwrap_or(5);
    let direction = query.direction.clone().unwrap_or(LineageDirection::Both);

    let mut visited_nodes: HashSet<String> = HashSet::new();
    let mut result_nodes: Vec<LineageGraphNode> = Vec::new();
    let mut result_edges: Vec<LineageGraphEdge> = Vec::new();
    let mut trace_path: Vec<String> = Vec::new();
    let mut depth_reached = 0;

    let mut queue: VecDeque<(String, usize)> = VecDeque::new();
    queue.push_back((query.entity_id.clone(), 0));
    visited_nodes.insert(query.entity_id.clone());

    while let Some((current_id, depth)) = queue.pop_front() {
        if depth > max_depth {
            continue;
        }
        depth_reached = depth_reached.max(depth);
        trace_path.push(current_id.clone());

        if let Some(node) = nodes.iter().find(|n| n.id == current_id) {
            result_nodes.push(node.clone());
        }

        match direction {
            LineageDirection::Upstream => {
                for edge in &edges {
                    if edge.target == current_id
                        && !visited_nodes.contains(&edge.source)
                        && query.relationship_types.as_ref().is_none_or(|types| {
                            types.iter().any(|t| {
                                std::mem::discriminant(t)
                                    == std::mem::discriminant(&edge.relationship)
                            })
                        })
                    {
                        visited_nodes.insert(edge.source.clone());
                        result_edges.push(edge.clone());
                        queue.push_back((edge.source.clone(), depth + 1));
                    }
                }
            }
            LineageDirection::Downstream => {
                for edge in &edges {
                    if edge.source == current_id
                        && !visited_nodes.contains(&edge.target)
                        && query.relationship_types.as_ref().is_none_or(|types| {
                            types.iter().any(|t| {
                                std::mem::discriminant(t)
                                    == std::mem::discriminant(&edge.relationship)
                            })
                        })
                    {
                        visited_nodes.insert(edge.target.clone());
                        result_edges.push(edge.clone());
                        queue.push_back((edge.target.clone(), depth + 1));
                    }
                }
            }
            LineageDirection::Both => {
                for edge in &edges {
                    if edge.source == current_id
                        && !visited_nodes.contains(&edge.target)
                        && query.relationship_types.as_ref().is_none_or(|types| {
                            types.iter().any(|t| {
                                std::mem::discriminant(t)
                                    == std::mem::discriminant(&edge.relationship)
                            })
                        })
                    {
                        visited_nodes.insert(edge.target.clone());
                        result_edges.push(edge.clone());
                        queue.push_back((edge.target.clone(), depth + 1));
                    }
                    if edge.target == current_id
                        && !visited_nodes.contains(&edge.source)
                        && query.relationship_types.as_ref().is_none_or(|types| {
                            types.iter().any(|t| {
                                std::mem::discriminant(t)
                                    == std::mem::discriminant(&edge.relationship)
                            })
                        })
                    {
                        visited_nodes.insert(edge.source.clone());
                        result_edges.push(edge.clone());
                        queue.push_back((edge.source.clone(), depth + 1));
                    }
                }
            }
        }
    }

    LineageTraceResult {
        nodes: result_nodes,
        edges: result_edges,
        trace_path,
        depth_reached,
    }
}

async fn trace_upstream(entity_id: &str, depth: Option<usize>) -> LineageTraceResult {
    trace_lineage(&LineageTraceQuery {
        entity_id: entity_id.to_string(),
        trace_depth: depth,
        direction: Some(LineageDirection::Upstream),
        relationship_types: None,
    })
    .await
}

async fn trace_downstream(entity_id: &str, depth: Option<usize>) -> LineageTraceResult {
    trace_lineage(&LineageTraceQuery {
        entity_id: entity_id.to_string(),
        trace_depth: depth,
        direction: Some(LineageDirection::Downstream),
        relationship_types: None,
    })
    .await
}

async fn find_data_origin(entity_id: &str) -> Option<LineageGraphNode> {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();
    let nodes = store.nodes.lock().await.clone();
    let edges = store.edges.lock().await.clone();

    let mut current = entity_id.to_string();
    let mut visited = HashSet::new();

    loop {
        if !visited.insert(current.clone()) {
            break;
        }

        let mut has_upstream = false;
        for edge in &edges {
            if edge.target == current {
                current = edge.source.clone();
                has_upstream = true;
                break;
            }
        }

        if !has_upstream {
            break;
        }
    }

    nodes.into_iter().find(|n| n.id == current)
}

async fn get_lineage_path(source_id: &str, target_id: &str) -> Option<Vec<String>> {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();
    let edges = store.edges.lock().await.clone();

    let mut queue: VecDeque<(String, Vec<String>)> = VecDeque::new();
    let mut visited = HashSet::new();

    queue.push_back((source_id.to_string(), vec![source_id.to_string()]));
    visited.insert(source_id.to_string());

    while let Some((current, path)) = queue.pop_front() {
        if current == target_id {
            return Some(path);
        }

        for edge in &edges {
            if edge.source == current && !visited.contains(&edge.target) {
                visited.insert(edge.target.clone());
                let mut new_path = path.clone();
                new_path.push(edge.target.clone());
                queue.push_back((edge.target.clone(), new_path));
            }
        }
    }

    None
}

// ==================== Part 1: 血缘溯源 Handler ====================

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct LineageTraceQueryParams {
    pub entity_id: String,
    pub depth: Option<usize>,
    pub direction: Option<String>,
}

/// GET /lineage/trace — 执行血缘溯源
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/trace-lineage-handler",
    tag = "MasterDataRefs",
    operation_id = "trace_lineage_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn trace_lineage_handler(
    State(state): State<ApiState>,
    Query(params): Query<LineageTraceQueryParams>,
) -> Json<ApiResponse<LineageTraceResult>> {
    let _ = &state;
    let direction = match params.direction.as_deref() {
        Some("upstream") => LineageDirection::Upstream,
        Some("downstream") => LineageDirection::Downstream,
        _ => LineageDirection::Both,
    };

    let result = trace_lineage(&LineageTraceQuery {
        entity_id: params.entity_id,
        trace_depth: params.depth,
        direction: Some(direction),
        relationship_types: None,
    })
    .await;

    Json(ApiResponse::success(result, "血缘溯源完成"))
}

/// GET /lineage/trace/{id}/upstream — 溯源上游数据来源
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/trace-upstream-handler",
    tag = "MasterDataRefs",
    operation_id = "trace_upstream_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn trace_upstream_handler(
    State(state): State<ApiState>,
    Path(id): Path<String>,
    Query(params): Query<LineageTraceQueryParams>,
) -> Json<ApiResponse<LineageTraceResult>> {
    let _ = &state;
    let _ = &params;
    let result = trace_upstream(&id, params.depth).await;
    Json(ApiResponse::success(result, "上游溯源完成"))
}

/// GET /lineage/trace/{id}/downstream — 溯源下游影响范围
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/trace-downstream-handler",
    tag = "MasterDataRefs",
    operation_id = "trace_downstream_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn trace_downstream_handler(
    State(state): State<ApiState>,
    Path(id): Path<String>,
    Query(params): Query<LineageTraceQueryParams>,
) -> Json<ApiResponse<LineageTraceResult>> {
    let _ = &state;
    let _ = &params;
    let result = trace_downstream(&id, params.depth).await;
    Json(ApiResponse::success(result, "下游溯源完成"))
}

/// GET /lineage/origin/{id} — 查找数据最初来源
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/lineage/origin/{id}",
    tag = "Master Data",
    operation_id = "find_data_origin_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn find_data_origin_handler(
    State(state): State<ApiState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<LineageGraphNode>> {
    let _ = &state;
    match find_data_origin(&id).await {
        Some(node) => Json(ApiResponse::success(node, "数据来源查找成功")),
        None => Json(ApiResponse::error(404, "未找到数据来源")),
    }
}

// ==================== Part 2: 影响分析功能 ====================

async fn analyze_impact(request: &ImpactAnalysisRequest) -> ImpactAnalysisResult {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();

    let downstream = trace_downstream(&request.entity_id, Some(10)).await;

    let mut impacted_entities: Vec<ImpactedEntity> = Vec::new();

    for node in &downstream.nodes {
        if node.id == request.entity_id {
            continue;
        }

        let severity = match request.change_type {
            ChangeType::SchemaChange => {
                if node.level <= 1 {
                    ImpactSeverity::Critical
                } else if node.level <= 3 {
                    ImpactSeverity::High
                } else if node.level <= 5 {
                    ImpactSeverity::Medium
                } else {
                    ImpactSeverity::Low
                }
            }
            ChangeType::DataChange => {
                if node.level <= 2 {
                    ImpactSeverity::High
                } else if node.level <= 4 {
                    ImpactSeverity::Medium
                } else {
                    ImpactSeverity::Low
                }
            }
            ChangeType::BusinessRuleChange => {
                if node.level <= 1 {
                    ImpactSeverity::High
                } else if node.level <= 3 {
                    ImpactSeverity::Medium
                } else {
                    ImpactSeverity::Low
                }
            }
        };

        impacted_entities.push(ImpactedEntity {
            entity_id: node.id.clone(),
            entity_name: node.label.clone(),
            domain: node.domain.clone(),
            impact_severity: severity,
            change_required: true,
        });
    }

    let risk_level = if impacted_entities
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::Critical))
    {
        ImpactSeverity::Critical
    } else if impacted_entities
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::High))
    {
        ImpactSeverity::High
    } else if impacted_entities
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::Medium))
    {
        ImpactSeverity::Medium
    } else if impacted_entities
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::Low))
    {
        ImpactSeverity::Low
    } else {
        ImpactSeverity::None
    };

    let estimated_effort = impacted_entities.len() as f64
        * match request.change_type {
            ChangeType::SchemaChange => 8.0,
            ChangeType::DataChange => 3.0,
            ChangeType::BusinessRuleChange => 5.0,
        };

    let mut recommendations = vec![
        "建议进行全面的影响范围评估".to_string(),
        "建议制定详细的变更计划".to_string(),
        "建议在测试环境充分验证".to_string(),
    ];

    if matches!(risk_level, ImpactSeverity::Critical) || matches!(risk_level, ImpactSeverity::High)
    {
        recommendations.push("建议成立专项变更小组".to_string());
        recommendations.push("建议制定回滚方案".to_string());
    }

    if let Some(ref fields) = request.affected_fields {
        recommendations.push(format!("涉及 {} 个字段变更，需重点验证", fields.len()));
    }

    let result = ImpactAnalysisResult {
        impacted_entities: impacted_entities.clone(),
        risk_level,
        estimated_effort,
        recommendations,
    };

    store
        .impact_reports
        .lock()
        .await
        .insert(request.entity_id.clone(), result.clone());

    result
}

fn calculate_risk_level(impacted: &[ImpactedEntity]) -> ImpactSeverity {
    if impacted
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::Critical))
    {
        ImpactSeverity::Critical
    } else if impacted
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::High))
    {
        ImpactSeverity::High
    } else if impacted
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::Medium))
    {
        ImpactSeverity::Medium
    } else if impacted
        .iter()
        .any(|e| matches!(e.impact_severity, ImpactSeverity::Low))
    {
        ImpactSeverity::Low
    } else {
        ImpactSeverity::None
    }
}

fn estimate_migration_effort(impacted: &[ImpactedEntity], change_type: &ChangeType) -> f64 {
    let base_effort = match change_type {
        ChangeType::SchemaChange => 8.0,
        ChangeType::DataChange => 3.0,
        ChangeType::BusinessRuleChange => 5.0,
    };

    let mut total = 0.0;
    for entity in impacted {
        let multiplier = match entity.impact_severity {
            ImpactSeverity::Critical => 3.0,
            ImpactSeverity::High => 2.0,
            ImpactSeverity::Medium => 1.0,
            ImpactSeverity::Low => 0.5,
            ImpactSeverity::None => 0.0,
        };
        total += base_effort * multiplier;
    }
    total
}

fn generate_impact_report(result: &ImpactAnalysisResult) -> String {
    let mut report = String::new();
    report.push_str("=== 影响分析报告 ===\n");
    report.push_str(&format!("风险等级: {:?}\n", result.risk_level));
    report.push_str(&format!(
        "预估工作量: {:.1} 人天\n",
        result.estimated_effort
    ));
    report.push_str(&format!(
        "受影响实体数: {}\n",
        result.impacted_entities.len()
    ));
    report.push_str("\n受影响实体:\n");
    for entity in &result.impacted_entities {
        report.push_str(&format!(
            "  - {} ({}): {:?}\n",
            entity.entity_name, entity.domain, entity.impact_severity
        ));
    }
    report.push_str("\n建议:\n");
    for rec in &result.recommendations {
        report.push_str(&format!("  * {}\n", rec));
    }
    report
}

// ==================== Part 2: 影响分析 Handler ====================

/// POST /impact/analyze — 分析变更影响范围
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/impact/analyze",
    tag = "Master Data",
    operation_id = "analyze_impact_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn analyze_impact_handler(
    State(state): State<ApiState>,
    Json(req): Json<ImpactAnalysisRequest>,
) -> Json<ApiResponse<ImpactAnalysisResult>> {
    let _ = &state;
    let result = analyze_impact(&req).await;
    Json(ApiResponse::success(result, "影响分析完成"))
}

/// GET /impact/report/{entity_id} — 获取影响分析报告
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/impact/report/{entity_id}",
    tag = "Master Data",
    operation_id = "get_impact_report_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_impact_report_handler(
    State(state): State<ApiState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<ImpactAnalysisResult>> {
    let _ = &state;
    let store = get_lineage_trace_store();
    let reports = store.impact_reports.lock().await;

    match reports.get(&entity_id) {
        Some(report) => Json(ApiResponse::success(report.clone(), "影响报告获取成功")),
        None => Json(ApiResponse::error(404, "未找到影响分析报告")),
    }
}

// ==================== Part 3: 数据血缘图谱功能 ====================

async fn build_lineage_graph() -> DataLineageGraph {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();
    let nodes = store.nodes.lock().await.clone();
    let edges = store.edges.lock().await.clone();

    DataLineageGraph {
        nodes,
        edges,
        metadata: serde_json::json!({
            "generated_at": chrono::Utc::now().to_rfc3339(),
            "version": "1.0",
            "layout": "force_directed",
        }),
    }
}

async fn filter_graph(
    domain: Option<&str>,
    node_type: Option<&str>,
    relationship: Option<&str>,
) -> DataLineageGraph {
    let graph = build_lineage_graph().await;

    let filtered_nodes: Vec<LineageGraphNode> = graph
        .nodes
        .into_iter()
        .filter(|n| {
            domain.is_none_or(|d| n.domain == d) && node_type.is_none_or(|t| n.node_type == t)
        })
        .collect();

    let node_ids: HashSet<String> = filtered_nodes.iter().map(|n| n.id.clone()).collect();

    let filtered_edges: Vec<LineageGraphEdge> = graph
        .edges
        .into_iter()
        .filter(|e| {
            node_ids.contains(&e.source)
                && node_ids.contains(&e.target)
                && relationship.is_none_or(|r| {
                    let rel_str = match e.relationship {
                        LineageRelationship::References => "references",
                        LineageRelationship::DependsOn => "depends_on",
                        LineageRelationship::Produces => "produces",
                        LineageRelationship::Consumes => "consumes",
                        LineageRelationship::Transforms => "transforms",
                    };
                    rel_str == r
                })
        })
        .collect();

    DataLineageGraph {
        nodes: filtered_nodes,
        edges: filtered_edges,
        metadata: graph.metadata,
    }
}

async fn get_lineage_graph_stats() -> LineageGraphStats {
    let graph = build_lineage_graph().await;

    let mut nodes_by_type: HashMap<String, usize> = HashMap::new();
    let mut nodes_by_domain: HashMap<String, usize> = HashMap::new();
    let mut edges_by_relationship: HashMap<String, usize> = HashMap::new();
    let mut degree_map: HashMap<String, usize> = HashMap::new();

    for node in &graph.nodes {
        *nodes_by_type.entry(node.node_type.clone()).or_insert(0) += 1;
        *nodes_by_domain.entry(node.domain.clone()).or_insert(0) += 1;
    }

    for edge in &graph.edges {
        let rel_str = match edge.relationship {
            LineageRelationship::References => "references",
            LineageRelationship::DependsOn => "depends_on",
            LineageRelationship::Produces => "produces",
            LineageRelationship::Consumes => "consumes",
            LineageRelationship::Transforms => "transforms",
        }
        .to_string();
        *edges_by_relationship.entry(rel_str).or_insert(0) += 1;

        *degree_map.entry(edge.source.clone()).or_insert(0) += 1;
        *degree_map.entry(edge.target.clone()).or_insert(0) += 1;
    }

    let total_degree: usize = degree_map.values().sum();
    let avg_degree = if !graph.nodes.is_empty() {
        total_degree as f64 / graph.nodes.len() as f64
    } else {
        0.0
    };

    let n = graph.nodes.len() as f64;
    let density = if n > 1.0 {
        (2.0 * graph.edges.len() as f64) / (n * (n - 1.0))
    } else {
        0.0
    };

    let mut max_depth = 0;
    let mut root_nodes = 0;
    let mut leaf_nodes = 0;

    let incoming: HashSet<String> = graph.edges.iter().map(|e| e.target.clone()).collect();
    let outgoing: HashSet<String> = graph.edges.iter().map(|e| e.source.clone()).collect();

    for node in &graph.nodes {
        if !incoming.contains(&node.id) {
            root_nodes += 1;
        }
        if !outgoing.contains(&node.id) {
            leaf_nodes += 1;
        }
    }

    for node in &graph.nodes {
        let mut depth = 0;
        let mut current = node.id.clone();
        let mut visited = HashSet::new();
        while !visited.insert(current.clone()) {
            if let Some(edge) = graph.edges.iter().find(|e| e.target == current) {
                current = edge.source.clone();
                depth += 1;
            } else {
                break;
            }
            if depth > 100 {
                break;
            }
        }
        max_depth = max_depth.max(depth);
    }

    LineageGraphStats {
        total_nodes: graph.nodes.len(),
        total_edges: graph.edges.len(),
        nodes_by_type,
        nodes_by_domain,
        edges_by_relationship,
        avg_degree,
        density,
        max_depth,
        leaf_nodes,
        root_nodes,
    }
}

async fn export_graph(format: &str) -> Result<String, String> {
    let graph = build_lineage_graph().await;

    match format {
        "json" => Ok(serde_json::to_string_pretty(&graph).map_err(|e| e.to_string())?),
        "graphml" => {
            let mut xml = String::new();
            xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            xml.push_str("<graphml xmlns=\"http://graphml.graphdrawing.org/xmlns\">\n");
            xml.push_str(
                "  <key id=\"label\" for=\"node\" attr.name=\"label\" attr.type=\"string\"/>\n",
            );
            xml.push_str(
                "  <key id=\"domain\" for=\"node\" attr.name=\"domain\" attr.type=\"string\"/>\n",
            );
            xml.push_str("  <key id=\"relationship\" for=\"edge\" attr.name=\"relationship\" attr.type=\"string\"/>\n");
            xml.push_str("  <graph id=\"G\" edgedefault=\"directed\">\n");

            for node in &graph.nodes {
                xml.push_str(&format!(
                    "    <node id=\"{}\">\n      <data key=\"label\">{}</data>\n      <data key=\"domain\">{}</data>\n    </node>\n",
                    node.id, node.label, node.domain
                ));
            }

            for edge in &graph.edges {
                let rel_str = match edge.relationship {
                    LineageRelationship::References => "references",
                    LineageRelationship::DependsOn => "depends_on",
                    LineageRelationship::Produces => "produces",
                    LineageRelationship::Consumes => "consumes",
                    LineageRelationship::Transforms => "transforms",
                };
                xml.push_str(&format!(
                    "    <edge id=\"{}\" source=\"{}\" target=\"{}\">\n      <data key=\"relationship\">{}</data>\n    </edge>\n",
                    edge.id, edge.source, edge.target, rel_str
                ));
            }

            xml.push_str("  </graph>\n");
            xml.push_str("</graphml>\n");
            Ok(xml)
        }
        _ => Err(format!("不支持的导出格式: {}", format)),
    }
}

async fn find_critical_paths() -> Vec<Vec<String>> {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();
    let nodes = store.nodes.lock().await.clone();
    let edges = store.edges.lock().await.clone();

    let mut incoming: HashMap<String, Vec<String>> = HashMap::new();
    let mut outgoing: HashMap<String, Vec<String>> = HashMap::new();

    for edge in &edges {
        outgoing
            .entry(edge.source.clone())
            .or_default()
            .push(edge.target.clone());
        incoming
            .entry(edge.target.clone())
            .or_default()
            .push(edge.source.clone());
    }

    let roots: Vec<String> = nodes
        .iter()
        .filter(|n| !incoming.contains_key(&n.id))
        .map(|n| n.id.clone())
        .collect();

    let mut all_paths: Vec<Vec<String>> = Vec::new();

    fn dfs(
        current: &str,
        path: Vec<String>,
        outgoing: &HashMap<String, Vec<String>>,
        all_paths: &mut Vec<Vec<String>>,
        max_len: usize,
    ) {
        if path.len() > max_len {
            return;
        }

        if let Some(neighbors) = outgoing.get(current) {
            for next in neighbors {
                if path.contains(next) {
                    continue;
                }
                let mut new_path = path.clone();
                new_path.push(next.clone());
                dfs(next, new_path, outgoing, all_paths, max_len);
            }
        } else {
            all_paths.push(path);
        }
    }

    for root in &roots {
        dfs(root, vec![root.clone()], &outgoing, &mut all_paths, 20);
    }

    let max_len = all_paths.iter().map(|p| p.len()).max().unwrap_or(0);
    all_paths.retain(|p| p.len() == max_len && max_len >= 3);

    all_paths.truncate(10);
    all_paths
}

async fn detect_circular_dependencies() -> Vec<Vec<String>> {
    ensure_lineage_trace_initialized().await;
    let store = get_lineage_trace_store();
    let nodes = store.nodes.lock().await.clone();
    let edges = store.edges.lock().await.clone();

    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for edge in &edges {
        adj.entry(edge.source.clone())
            .or_default()
            .push(edge.target.clone());
    }

    let mut cycles: Vec<Vec<String>> = Vec::new();
    let mut visited = HashSet::new();
    let mut rec_stack = Vec::new();

    fn dfs(
        node: &str,
        adj: &HashMap<String, Vec<String>>,
        visited: &mut HashSet<String>,
        rec_stack: &mut Vec<String>,
        cycles: &mut Vec<Vec<String>>,
    ) -> bool {
        visited.insert(node.to_string());
        rec_stack.push(node.to_string());

        if let Some(neighbors) = adj.get(node) {
            for next in neighbors {
                if !visited.contains(next) {
                    if dfs(next, adj, visited, rec_stack, cycles) {
                        return true;
                    }
                } else if let Some(pos) = rec_stack.iter().position(|x| x == next) {
                    let cycle = rec_stack[pos..].to_vec();
                    if cycle.len() >= 2 {
                        cycles.push(cycle);
                    }
                    return true;
                }
            }
        }

        rec_stack.pop();
        false
    }

    for node in &nodes {
        if !visited.contains(&node.id) {
            let _ = dfs(&node.id, &adj, &mut visited, &mut rec_stack, &mut cycles);
        }
    }

    cycles
}

// ==================== Part 3: 数据血缘图谱 Handler ====================

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct LineageGraphQueryParams {
    pub domain: Option<String>,
    pub node_type: Option<String>,
    pub relationship: Option<String>,
}

/// GET /lineage/graph — 获取血缘图谱
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/get-lineage-graph-handler",
    tag = "MasterDataRefs",
    operation_id = "get_lineage_graph_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_lineage_graph_handler(
    State(state): State<ApiState>,
    Query(params): Query<LineageGraphQueryParams>,
) -> Json<ApiResponse<DataLineageGraph>> {
    let _ = &state;
    let graph = filter_graph(
        params.domain.as_deref(),
        params.node_type.as_deref(),
        params.relationship.as_deref(),
    )
    .await;
    Json(ApiResponse::success(graph, "血缘图谱获取成功"))
}

/// GET /lineage/graph/stats — 获取图谱统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/lineage/graph/stats",
    tag = "Master Data",
    operation_id = "get_graph_stats_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_graph_stats_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<LineageGraphStats>> {
    let _ = &state;
    let stats = get_lineage_graph_stats().await;
    Json(ApiResponse::success(stats, "图谱统计获取成功"))
}

/// GET /lineage/critical-paths — 查找关键路径
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/lineage/critical-paths",
    tag = "Master Data",
    operation_id = "get_critical_paths_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_critical_paths_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<Vec<String>>>> {
    let _ = &state;
    let paths = find_critical_paths().await;
    Json(ApiResponse::success(paths, "关键路径查找完成"))
}

/// GET /lineage/circular-deps — 检测循环依赖
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/lineage/circular-deps",
    tag = "Master Data",
    operation_id = "detect_circular_deps_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn detect_circular_deps_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<Vec<String>>>> {
    let _ = &state;
    let cycles = detect_circular_dependencies().await;
    Json(ApiResponse::success(cycles, "循环依赖检测完成"))
}
