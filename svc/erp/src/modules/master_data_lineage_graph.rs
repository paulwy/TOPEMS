//! V40.0 AC-12: 主数据血缘可视化
//!
//! 提供主数据血缘关系图，包括全局血缘图、指定主数据血缘、域血缘、上游血缘和下游血缘。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use utoipa::IntoParams;

use super::master_data_assets::domain_display_name;
use super::ApiState;

#[derive(Debug, Serialize)]
pub struct LineageGraph {
    pub nodes: Vec<LineageNode>,
    pub edges: Vec<LineageEdge>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LineageNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub domain: Option<String>,
    pub service: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LineageEdge {
    pub source: String,
    pub target: String,
    pub edge_type: String,
    pub direction: String,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct LineageQuery {
    pub master_data_id: Option<String>,
    pub domain: Option<String>,
    pub depth: Option<i32>,
}

/// V40.0 AC-12: 获取血缘图
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/governance/lineage",
    tag = "Master Data",
    operation_id = "get_lineage_graph",
    params(LineageQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn get_lineage_graph(
    State(state): State<ApiState>,
    Query(params): Query<LineageQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LineageGraph>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let db = &mut **txn;
    let _depth = params.depth.unwrap_or(3);

    let mut nodes: Vec<LineageNode> = Vec::new();
    let mut edges: Vec<LineageEdge> = Vec::new();
    let mut node_ids = std::collections::HashSet::new();

    let add_node = |nodes: &mut Vec<LineageNode>,
                    node_ids: &mut std::collections::HashSet<String>,
                    node: LineageNode| {
        if node_ids.insert(node.id.clone()) {
            nodes.push(node);
        }
    };

    if let Some(ref mid) = params.master_data_id {
        build_lineage_for_master_data(
            &mut *db,
            mid,
            &mut nodes,
            &mut edges,
            &mut node_ids,
            add_node,
        )
        .await;
    } else if let Some(ref domain) = params.domain {
        build_lineage_for_domain(
            &mut *db,
            domain,
            &mut nodes,
            &mut edges,
            &mut node_ids,
            add_node,
        )
        .await;
    } else {
        build_full_lineage_graph(&mut *db, &mut nodes, &mut edges, &mut node_ids, add_node).await;
    }

    Json(ApiResponse::success(
        LineageGraph { nodes, edges },
        "血缘关系图",
    ))
}

async fn build_lineage_for_master_data(
    db: &mut sqlx::PgConnection,
    master_data_id: &str,
    nodes: &mut Vec<LineageNode>,
    edges: &mut Vec<LineageEdge>,
    node_ids: &mut std::collections::HashSet<String>,
    add_node: fn(&mut Vec<LineageNode>, &mut std::collections::HashSet<String>, LineageNode),
) {
    let row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, domain, code, name, source_service, status
           FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(master_data_id)
    .fetch_optional(&mut *db)
    .await;

    if let Ok(Some(row)) = row {
        let domain: String = row.try_get("domain").unwrap_or_default();
        let code: String = row.try_get("code").unwrap_or_default();
        let name: Option<String> = row.try_get("name").ok().flatten();
        let source_service: String = row.try_get("source_service").unwrap_or_default();
        let label = name.clone().unwrap_or_else(|| code.clone());

        let source_service_id = format!("service:{}", source_service);
        add_node(
            nodes,
            node_ids,
            LineageNode {
                id: source_service_id.clone(),
                label: source_service.clone(),
                node_type: "service".to_string(),
                domain: Some(domain.clone()),
                service: Some(source_service.clone()),
            },
        );

        let md_node_id = format!("master_data:{}", master_data_id);
        add_node(
            nodes,
            node_ids,
            LineageNode {
                id: md_node_id.clone(),
                label,
                node_type: "master_data".to_string(),
                domain: Some(domain.clone()),
                service: None,
            },
        );

        edges.push(LineageEdge {
            source: source_service_id,
            target: md_node_id.clone(),
            edge_type: "sync".to_string(),
            direction: "downstream".to_string(),
        });

        let erp_service_id = "service{erp}".to_string();
        add_node(
            nodes,
            node_ids,
            LineageNode {
                id: erp_service_id.clone(),
                label: "erp".to_string(),
                node_type: "service".to_string(),
                domain: Some(domain.clone()),
                service: Some("erp".to_string()),
            },
        );

        edges.push(LineageEdge {
            source: md_node_id,
            target: erp_service_id,
            edge_type: "reference".to_string(),
            direction: "downstream".to_string(),
        });
    }
}

async fn build_lineage_for_domain(
    db: &mut sqlx::PgConnection,
    domain: &str,
    nodes: &mut Vec<LineageNode>,
    edges: &mut Vec<LineageEdge>,
    node_ids: &mut std::collections::HashSet<String>,
    add_node: fn(&mut Vec<LineageNode>, &mut std::collections::HashSet<String>, LineageNode),
) {
    let rows = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT DISTINCT source_service FROM erp.erp_master_data_refs
           WHERE domain = $1 AND status != 'destroyed' LIMIT 10"#
    ))
    .bind(domain)
    .fetch_all(&mut *db)
    .await;

    let domain_node_id = format!("domain:{}", domain);
    add_node(
        nodes,
        node_ids,
        LineageNode {
            id: domain_node_id.clone(),
            label: domain_display_name(domain),
            node_type: "master_data".to_string(),
            domain: Some(domain.to_string()),
            service: None,
        },
    );

    if let Ok(rows) = rows {
        for row in rows {
            let service: String = row.try_get("source_service").unwrap_or_default();
            let service_node_id = format!("service:{}", service);
            add_node(
                nodes,
                node_ids,
                LineageNode {
                    id: service_node_id.clone(),
                    label: service.clone(),
                    node_type: "service".to_string(),
                    domain: Some(domain.to_string()),
                    service: Some(service),
                },
            );
            edges.push(LineageEdge {
                source: service_node_id,
                target: domain_node_id.clone(),
                edge_type: "sync".to_string(),
                direction: "downstream".to_string(),
            });
        }
    }

    let erp_service_id = "service{erp}".to_string();
    add_node(
        nodes,
        node_ids,
        LineageNode {
            id: erp_service_id.clone(),
            label: "erp".to_string(),
            node_type: "service".to_string(),
            domain: Some(domain.to_string()),
            service: Some("erp".to_string()),
        },
    );
    edges.push(LineageEdge {
        source: domain_node_id,
        target: erp_service_id,
        edge_type: "reference".to_string(),
        direction: "downstream".to_string(),
    });
}

async fn build_full_lineage_graph(
    db: &mut sqlx::PgConnection,
    nodes: &mut Vec<LineageNode>,
    edges: &mut Vec<LineageEdge>,
    node_ids: &mut std::collections::HashSet<String>,
    add_node: fn(&mut Vec<LineageNode>, &mut std::collections::HashSet<String>, LineageNode),
) {
    let rows = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT domain, COUNT(DISTINCT source_service) as service_count
           FROM erp.erp_master_data_refs
           WHERE status != 'destroyed'
           GROUP BY domain
           ORDER BY domain
           LIMIT 20"#
    ))
    .fetch_all(&mut *db)
    .await;

    if let Ok(rows) = rows {
        let erp_service_id = "service{erp}".to_string();
        add_node(
            nodes,
            node_ids,
            LineageNode {
                id: erp_service_id.clone(),
                label: "erp".to_string(),
                node_type: "service".to_string(),
                domain: None,
                service: Some("erp".to_string()),
            },
        );

        for row in rows {
            let domain: String = row.try_get("domain").unwrap_or_default();
            let domain_node_id = format!("domain:{}", domain);
            add_node(
                nodes,
                node_ids,
                LineageNode {
                    id: domain_node_id.clone(),
                    label: domain_display_name(&domain),
                    node_type: "master_data".to_string(),
                    domain: Some(domain.clone()),
                    service: None,
                },
            );
            edges.push(LineageEdge {
                source: domain_node_id,
                target: erp_service_id.clone(),
                edge_type: "reference".to_string(),
                direction: "downstream".to_string(),
            });
        }
    }
}

/// V40.0 AC-12: 获取上游血缘
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/governance/lineage/{id}/upstream",
    tag = "Master Data",
    operation_id = "get_lineage_upstream",
    responses((status = 200, description = "OK")),
)]
pub async fn get_lineage_upstream(
    State(state): State<ApiState>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LineageGraph>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let db = &mut **txn;
    let mut nodes: Vec<LineageNode> = Vec::new();
    let mut edges: Vec<LineageEdge> = Vec::new();
    let mut node_ids = std::collections::HashSet::new();

    let add_node = |nodes: &mut Vec<LineageNode>,
                    node_ids: &mut std::collections::HashSet<String>,
                    node: LineageNode| {
        if node_ids.insert(node.id.clone()) {
            nodes.push(node);
        }
    };

    let row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, domain, code, name, source_service, status
           FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&id)
    .fetch_optional(&mut *db)
    .await;

    if let Ok(Some(row)) = row {
        let domain: String = row.try_get("domain").unwrap_or_default();
        let code: String = row.try_get("code").unwrap_or_default();
        let name: Option<String> = row.try_get("name").ok().flatten();
        let source_service: String = row.try_get("source_service").unwrap_or_default();
        let label = name.unwrap_or_else(|| code.clone());

        let source_service_id = format!("service:{}", source_service);
        add_node(
            &mut nodes,
            &mut node_ids,
            LineageNode {
                id: source_service_id.clone(),
                label: source_service.clone(),
                node_type: "service".to_string(),
                domain: Some(domain.clone()),
                service: Some(source_service),
            },
        );

        let md_node_id = format!("master_data:{}", id);
        add_node(
            &mut nodes,
            &mut node_ids,
            LineageNode {
                id: md_node_id.clone(),
                label,
                node_type: "master_data".to_string(),
                domain: Some(domain),
                service: None,
            },
        );

        edges.push(LineageEdge {
            source: source_service_id,
            target: md_node_id,
            edge_type: "sync".to_string(),
            direction: "downstream".to_string(),
        });
    }

    Json(ApiResponse::success(
        LineageGraph { nodes, edges },
        "上游血缘关系",
    ))
}

/// V40.0 AC-12: 获取下游血缘
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/governance/lineage/{id}/downstream",
    tag = "Master Data",
    operation_id = "get_lineage_downstream",
    responses((status = 200, description = "OK")),
)]
pub async fn get_lineage_downstream(
    State(state): State<ApiState>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LineageGraph>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let db = &mut **txn;
    let mut nodes: Vec<LineageNode> = Vec::new();
    let mut edges: Vec<LineageEdge> = Vec::new();
    let mut node_ids = std::collections::HashSet::new();

    let add_node = |nodes: &mut Vec<LineageNode>,
                    node_ids: &mut std::collections::HashSet<String>,
                    node: LineageNode| {
        if node_ids.insert(node.id.clone()) {
            nodes.push(node);
        }
    };

    let row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, domain, code, name, source_service, status,
                  local_entity_type, local_entity_id
           FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&id)
    .fetch_optional(&mut *db)
    .await;

    if let Ok(Some(row)) = row {
        let domain: String = row.try_get("domain").unwrap_or_default();
        let code: String = row.try_get("code").unwrap_or_default();
        let name: Option<String> = row.try_get("name").ok().flatten();
        let local_entity_type: Option<String> = row.try_get("local_entity_type").ok().flatten();
        let label = name.unwrap_or_else(|| code.clone());

        let md_node_id = format!("master_data:{}", id);
        add_node(
            &mut nodes,
            &mut node_ids,
            LineageNode {
                id: md_node_id.clone(),
                label,
                node_type: "master_data".to_string(),
                domain: Some(domain.clone()),
                service: None,
            },
        );

        let erp_service_id = "service{erp}".to_string();
        add_node(
            &mut nodes,
            &mut node_ids,
            LineageNode {
                id: erp_service_id.clone(),
                label: "erp".to_string(),
                node_type: "service".to_string(),
                domain: Some(domain),
                service: Some("erp".to_string()),
            },
        );

        edges.push(LineageEdge {
            source: md_node_id,
            target: erp_service_id,
            edge_type: "reference".to_string(),
            direction: "downstream".to_string(),
        });

        if let Some(entity_type) = local_entity_type {
            let entity_node_id = format!("entity:{}", entity_type);
            add_node(
                &mut nodes,
                &mut node_ids,
                LineageNode {
                    id: entity_node_id.clone(),
                    label: entity_type.clone(),
                    node_type: "system".to_string(),
                    domain: None,
                    service: Some("erp".to_string()),
                },
            );
            edges.push(LineageEdge {
                source: "service{erp}".to_string(),
                target: entity_node_id,
                edge_type: "dependency".to_string(),
                direction: "downstream".to_string(),
            });
        }
    }

    Json(ApiResponse::success(
        LineageGraph { nodes, edges },
        "下游血缘关系",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lineage_node_serialization() {
        let node = LineageNode {
            id: "node1".to_string(),
            label: "客户主数据".to_string(),
            node_type: "master_data".to_string(),
            domain: Some("customer".to_string()),
            service: Some("crm".to_string()),
        };
        let json = serde_json::to_value(&node).unwrap();
        assert_eq!(json["id"], "node1");
        assert_eq!(json["label"], "客户主数据");
        assert_eq!(json["node_type"], "master_data");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["service"], "crm");
    }

    #[test]
    fn test_lineage_node_minimal() {
        let node = LineageNode {
            id: "node2".to_string(),
            label: "产品主数据".to_string(),
            node_type: "master_data".to_string(),
            domain: None,
            service: None,
        };
        let json = serde_json::to_value(&node).unwrap();
        assert_eq!(json["id"], "node2");
        assert!(json["domain"].is_null());
        assert!(json["service"].is_null());
    }

    #[test]
    fn test_lineage_edge_serialization() {
        let edge = LineageEdge {
            source: "node1".to_string(),
            target: "node2".to_string(),
            edge_type: "references".to_string(),
            direction: "forward".to_string(),
        };
        let json = serde_json::to_value(&edge).unwrap();
        assert_eq!(json["source"], "node1");
        assert_eq!(json["target"], "node2");
        assert_eq!(json["edge_type"], "references");
        assert_eq!(json["direction"], "forward");
    }

    #[test]
    fn test_lineage_graph_serialization() {
        let node = LineageNode {
            id: "node1".to_string(),
            label: "测试节点".to_string(),
            node_type: "master_data".to_string(),
            domain: None,
            service: None,
        };
        let edge = LineageEdge {
            source: "node1".to_string(),
            target: "node2".to_string(),
            edge_type: "references".to_string(),
            direction: "forward".to_string(),
        };
        let graph = LineageGraph {
            nodes: vec![node],
            edges: vec![edge],
        };
        let json = serde_json::to_value(&graph).unwrap();
        assert_eq!(json["nodes"][0]["id"], "node1");
        assert_eq!(json["edges"][0]["source"], "node1");
        assert_eq!(json["edges"][0]["target"], "node2");
    }

    #[test]
    fn test_lineage_graph_empty() {
        let graph = LineageGraph {
            nodes: vec![],
            edges: vec![],
        };
        let json = serde_json::to_value(&graph).unwrap();
        assert!(json["nodes"].as_array().unwrap().is_empty());
        assert!(json["edges"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_lineage_query_deserialize() {
        let query = "master_data_id=md1&domain=customer&depth=3";
        let params: LineageQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.master_data_id.as_deref(), Some("md1"));
        assert_eq!(params.domain.as_deref(), Some("customer"));
        assert_eq!(params.depth, Some(3));
    }

    #[test]
    fn test_lineage_query_default() {
        let query = "";
        let params: LineageQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.master_data_id.is_none());
        assert!(params.domain.is_none());
        assert!(params.depth.is_none());
    }
}
