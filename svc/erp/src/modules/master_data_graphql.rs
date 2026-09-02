// ==================== V44.0 AC-16: MDM GraphQL API（REST 模拟） ====================

use axum::extract::State;
use axum::Json;
use serde::Deserialize;
use std::collections::HashMap;

use super::ApiState;

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct MasterDataEntity {
    pub id: String,
    pub code: String,
    pub name: String,
    pub domain: String,
    pub status: String,
    pub source_service: String,
    pub created_at: String,
    pub updated_at: String,
    pub properties: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct MasterDataEdge {
    pub node: MasterDataEntity,
    pub cursor: String,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct PageInfo {
    pub has_next_page: bool,
    pub has_previous_page: bool,
    pub start_cursor: Option<String>,
    pub end_cursor: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct MasterDataConnection {
    pub total_count: i64,
    pub page_info: PageInfo,
    pub edges: Vec<MasterDataEdge>,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct QualityInfo {
    pub score: f64,
    pub issues_count: i64,
    pub last_check_at: String,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct LineageInfo {
    pub upstream_count: i64,
    pub downstream_count: i64,
    pub lineage_depth: i64,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct GraphInfo {
    pub degree: i64,
    pub centrality: f64,
    pub community_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GraphqlRequest {
    pub query: String,
    pub variables: Option<serde_json::Value>,
    pub operation_name: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct GraphqlResponse {
    pub data: Option<serde_json::Value>,
    pub errors: Option<Vec<GraphqlError>>,
}

#[derive(Debug, serde::Serialize)]
pub struct GraphqlError {
    pub message: String,
    pub path: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct MasterDataQueryParams {
    pub domain: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LineageQueryParams {
    pub direction: Option<String>,
    pub max_depth: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct GraphQueryParams {
    pub entity_type: Option<String>,
    pub domain: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SimilarEntitiesParams {
    pub id: String,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMasterDataInput {
    pub domain: String,
    pub code: String,
    pub name: String,
    pub properties: Option<serde_json::Value>,
    pub source_service: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMasterDataInput {
    pub name: Option<String>,
    pub status: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct MergeMasterDataRequest {
    pub source_id: String,
    pub target_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SyncMasterDataRequest {
    pub domain: String,
    pub target_service: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MdmStats {
    pub total_entities: i64,
    pub by_domain: HashMap<String, i64>,
    pub avg_quality_score: f64,
    pub active_services: i64,
    pub sync_jobs_today: i64,
    pub data_quality_trend: Vec<f64>,
}

lazy_static::lazy_static! {
    static ref MDM_GRAPHQL_STORE: tokio::sync::Mutex<MdmGraphqlStore> =
        tokio::sync::Mutex::new(MdmGraphqlStore::new());
}

pub struct MdmGraphqlStore {
    pub entities: HashMap<String, MasterDataEntity>,
}

impl MdmGraphqlStore {
    fn new() -> Self {
        let mut entities = HashMap::new();
        let now = chrono::Utc::now().to_rfc3339();
        let domains = [
            "customer",
            "supplier",
            "material",
            "employee",
            "account_subject",
            "organization",
        ];
        for (i, domain) in domains.iter().enumerate() {
            for j in 1..=5 {
                let id = uuid::Uuid::new_v4().to_string();
                entities.insert(
                    id.clone(),
                    MasterDataEntity {
                        id: id.clone(),
                        code: format!("{}-{:03}", domain, j),
                        name: format!("{} 示例数据 {}", domain, j),
                        domain: domain.to_string(),
                        status: if j % 3 == 0 { "inactive" } else { "active" }.to_string(),
                        source_service: "erp".to_string(),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        properties: serde_json::json!({
                            "index": i * 5 + j,
                            "sample": true,
                            "tags": ["mdm", domain]
                        }),
                    },
                );
            }
        }
        Self { entities }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data/graphql",
    tag = "Master Data",
    operation_id = "graphql_endpoint",
    responses((status = 200, description = "OK")),
)]
pub async fn graphql_endpoint(
    State(state): State<ApiState>,
    Json(req): Json<GraphqlRequest>,
) -> Json<GraphqlResponse> {
    let _ = &state;
    let query = req.query.trim();

    if query.contains("query") && query.contains("masterData(") {
        return handle_master_data_query(&req).await;
    }
    if query.contains("masterDataById") {
        return handle_master_data_by_id(&req).await;
    }
    if query.contains("masterDataByCode") {
        return handle_master_data_by_code(&req).await;
    }
    if query.contains("masterDataQuality") {
        return handle_master_data_quality(&req).await;
    }
    if query.contains("masterDataLineage") {
        return handle_master_data_lineage(&req).await;
    }
    if query.contains("masterDataGraph") {
        return handle_master_data_graph(&req).await;
    }
    if query.contains("similarEntities") {
        return handle_similar_entities(&req).await;
    }
    if query.contains("completionSuggestions") {
        return handle_completion_suggestions(&req).await;
    }
    if query.contains("mdmStats") {
        return handle_mdm_stats(&req).await;
    }
    if query.contains("mutation") && query.contains("createMasterData") {
        return handle_create_master_data(&req).await;
    }
    if query.contains("updateMasterData") {
        return handle_update_master_data(&req).await;
    }
    if query.contains("deleteMasterData") {
        return handle_delete_master_data(&req).await;
    }
    if query.contains("mergeMasterData") {
        return handle_merge_master_data(&req).await;
    }
    if query.contains("syncMasterData") {
        return handle_sync_master_data(&req).await;
    }

    Json(GraphqlResponse {
        data: None,
        errors: Some(vec![GraphqlError {
            message: format!(
                "Unsupported query: {}",
                query.chars().take(50).collect::<String>()
            ),
            path: None,
        }]),
    })
}

async fn handle_master_data_query(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);

    let domain = vars.get("domain").and_then(|v| v.as_str());
    let status = vars.get("status").and_then(|v| v.as_str());
    let search = vars.get("search").and_then(|v| v.as_str());
    let page = vars
        .get("page")
        .and_then(|v| v.as_i64())
        .unwrap_or(1)
        .max(1);
    let page_size = vars
        .get("page_size")
        .and_then(|v| v.as_i64())
        .unwrap_or(10)
        .min(100);

    let mut filtered: Vec<MasterDataEntity> = store
        .entities
        .values()
        .filter(|e| {
            if let Some(d) = domain {
                if e.domain != d {
                    return false;
                }
            }
            if let Some(s) = status {
                if e.status != s {
                    return false;
                }
            }
            if let Some(q) = search {
                let q = q.to_lowercase();
                if !e.name.to_lowercase().contains(&q) && !e.code.to_lowercase().contains(&q) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    let total_count = filtered.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let page_items: Vec<MasterDataEntity> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();

    let edges: Vec<MasterDataEdge> = page_items
        .iter()
        .enumerate()
        .map(|(i, node)| MasterDataEdge {
            node: node.clone(),
            cursor: base64_encode(&format!("cursor-{}", offset + i)),
        })
        .collect();

    let has_next_page = (offset + page_items.len()) < total_count as usize;
    let has_previous_page = page > 1;

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "masterData": {
                "total_count": total_count,
                "page_info": {
                    "has_next_page": has_next_page,
                    "has_previous_page": has_previous_page,
                    "start_cursor": edges.first().map(|e| e.cursor.clone()),
                    "end_cursor": edges.last().map(|e| e.cursor.clone()),
                },
                "edges": edges,
            }
        })),
        errors: None,
    })
}

async fn handle_master_data_by_id(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");

    match store.entities.get(id) {
        Some(entity) => Json(GraphqlResponse {
            data: Some(serde_json::json!({
                "masterDataById": entity
            })),
            errors: None,
        }),
        None => Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["masterDataById".to_string()]),
            }]),
        }),
    }
}

async fn handle_master_data_by_code(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let domain = vars.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    let code = vars.get("code").and_then(|v| v.as_str()).unwrap_or("");

    let entity = store
        .entities
        .values()
        .find(|e| e.domain == domain && e.code == code);

    match entity {
        Some(entity) => Json(GraphqlResponse {
            data: Some(serde_json::json!({
                "masterDataByCode": entity
            })),
            errors: None,
        }),
        None => Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["masterDataByCode".to_string()]),
            }]),
        }),
    }
}

async fn handle_master_data_quality(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");

    if !store.entities.contains_key(id) {
        return Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["masterDataQuality".to_string()]),
            }]),
        });
    }

    let quality = QualityInfo {
        score: 85.5 + (id.len() as f64 % 15.0),
        issues_count: (id.len() as i64 % 5),
        last_check_at: chrono::Utc::now().to_rfc3339(),
    };

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "masterDataQuality": quality
        })),
        errors: None,
    })
}

async fn handle_master_data_lineage(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");

    if !store.entities.contains_key(id) {
        return Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["masterDataLineage".to_string()]),
            }]),
        });
    }

    let direction = vars
        .get("direction")
        .and_then(|v| v.as_str())
        .unwrap_or("both");
    let max_depth = vars.get("max_depth").and_then(|v| v.as_i64()).unwrap_or(3);

    let lineage = LineageInfo {
        upstream_count: if direction == "both" || direction == "upstream" {
            2 + max_depth
        } else {
            0
        },
        downstream_count: if direction == "both" || direction == "downstream" {
            3 + max_depth
        } else {
            0
        },
        lineage_depth: max_depth,
    };

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "masterDataLineage": lineage
        })),
        errors: None,
    })
}

async fn handle_master_data_graph(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let limit = vars
        .get("limit")
        .and_then(|v| v.as_i64())
        .unwrap_or(20)
        .min(100);

    let entities: Vec<MasterDataEntity> = store
        .entities
        .values()
        .take(limit as usize)
        .cloned()
        .collect();

    let nodes: Vec<serde_json::Value> = entities
        .iter()
        .map(|e| {
            serde_json::json!({
                "id": e.id,
                "name": e.name,
                "domain": e.domain,
                "degree": (e.id.len() % 5) as i64 + 1,
                "centrality": 0.1 + (e.id.len() as f64 % 80.0) / 100.0,
                "community_id": format!("community-{}", e.domain),
            })
        })
        .collect();

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "masterDataGraph": {
                "nodes": nodes,
                "total_nodes": store.entities.len() as i64,
            }
        })),
        errors: None,
    })
}

async fn handle_similar_entities(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");
    let limit = vars.get("limit").and_then(|v| v.as_i64()).unwrap_or(5);

    if !store.entities.contains_key(id) {
        return Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["similarEntities".to_string()]),
            }]),
        });
    }

    let similar: Vec<serde_json::Value> = store
        .entities
        .values()
        .filter(|e| e.id != id)
        .take(limit as usize)
        .enumerate()
        .map(|(i, e)| {
            serde_json::json!({
                "id": e.id,
                "name": e.name,
                "domain": e.domain,
                "similarity": 0.9 - (i as f64 * 0.1),
                "reasons": ["属性相似", "同一数据域"]
            })
        })
        .collect();

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "similarEntities": similar
        })),
        errors: None,
    })
}

async fn handle_completion_suggestions(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");

    if !store.entities.contains_key(id) {
        return Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["completionSuggestions".to_string()]),
            }]),
        });
    }

    let suggestions = vec![
        serde_json::json!({
            "field": "description",
            "suggested_value": "自动补全的描述信息",
            "confidence": 0.85,
            "source": "knowledge_graph"
        }),
        serde_json::json!({
            "field": "category",
            "suggested_value": "标准分类",
            "confidence": 0.72,
            "source": "pattern_mining"
        }),
    ];

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "completionSuggestions": suggestions
        })),
        errors: None,
    })
}

async fn handle_mdm_stats(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let _ = req;
    let store = MDM_GRAPHQL_STORE.lock().await;

    let mut by_domain = HashMap::new();
    for entity in store.entities.values() {
        *by_domain.entry(entity.domain.clone()).or_insert(0i64) += 1;
    }

    let stats = MdmStats {
        total_entities: store.entities.len() as i64,
        by_domain,
        avg_quality_score: 87.3,
        active_services: 6,
        sync_jobs_today: 128,
        data_quality_trend: vec![82.5, 84.1, 85.8, 86.2, 87.3],
    };

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "mdmStats": stats
        })),
        errors: None,
    })
}

async fn handle_create_master_data(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let mut store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let input = vars.get("input").unwrap_or(&serde_json::Value::Null);

    let domain = input
        .get("domain")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let code = input.get("code").and_then(|v| v.as_str()).unwrap_or("");
    let name = input.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let properties = input
        .get("properties")
        .cloned()
        .unwrap_or(serde_json::json!({}));
    let source_service = input
        .get("source_service")
        .and_then(|v| v.as_str())
        .unwrap_or("graphql");

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let entity = MasterDataEntity {
        id: id.clone(),
        code: code.to_string(),
        name: name.to_string(),
        domain: domain.to_string(),
        status: "active".to_string(),
        source_service: source_service.to_string(),
        created_at: now.clone(),
        updated_at: now,
        properties,
    };

    store.entities.insert(id.clone(), entity.clone());

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "createMasterData": entity
        })),
        errors: None,
    })
}

async fn handle_update_master_data(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let mut store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");
    let input = vars.get("input").unwrap_or(&serde_json::Value::Null);

    let entity = match store.entities.get_mut(id) {
        Some(e) => e,
        None => {
            return Json(GraphqlResponse {
                data: None,
                errors: Some(vec![GraphqlError {
                    message: "Entity not found".to_string(),
                    path: Some(vec!["updateMasterData".to_string()]),
                }]),
            })
        }
    };

    if let Some(name) = input.get("name").and_then(|v| v.as_str()) {
        entity.name = name.to_string();
    }
    if let Some(status) = input.get("status").and_then(|v| v.as_str()) {
        entity.status = status.to_string();
    }
    if let Some(props) = input.get("properties") {
        entity.properties = props.clone();
    }
    entity.updated_at = chrono::Utc::now().to_rfc3339();

    let updated = entity.clone();

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "updateMasterData": updated
        })),
        errors: None,
    })
}

async fn handle_delete_master_data(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let mut store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let id = vars.get("id").and_then(|v| v.as_str()).unwrap_or("");

    match store.entities.remove(id) {
        Some(_) => Json(GraphqlResponse {
            data: Some(serde_json::json!({
                "deleteMasterData": true
            })),
            errors: None,
        }),
        None => Json(GraphqlResponse {
            data: None,
            errors: Some(vec![GraphqlError {
                message: "Entity not found".to_string(),
                path: Some(vec!["deleteMasterData".to_string()]),
            }]),
        }),
    }
}

async fn handle_merge_master_data(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let mut store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let source_id = vars.get("source_id").and_then(|v| v.as_str()).unwrap_or("");
    let target_id = vars.get("target_id").and_then(|v| v.as_str()).unwrap_or("");

    let source = match store.entities.remove(source_id) {
        Some(s) => s,
        None => {
            return Json(GraphqlResponse {
                data: None,
                errors: Some(vec![GraphqlError {
                    message: "Source or target entity not found".to_string(),
                    path: Some(vec!["mergeMasterData".to_string()]),
                }]),
            })
        }
    };
    let target = match store.entities.get_mut(target_id) {
        Some(t) => t,
        None => {
            store.entities.insert(source_id.to_string(), source);
            return Json(GraphqlResponse {
                data: None,
                errors: Some(vec![GraphqlError {
                    message: "Source or target entity not found".to_string(),
                    path: Some(vec!["mergeMasterData".to_string()]),
                }]),
            });
        }
    };
    target.updated_at = chrono::Utc::now().to_rfc3339();
    target.properties = serde_json::json!({
        "merged_from": source.id,
        "original_name": source.name,
    });

    let merged = target.clone();

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "mergeMasterData": merged
        })),
        errors: None,
    })
}

async fn handle_sync_master_data(req: &GraphqlRequest) -> Json<GraphqlResponse> {
    let store = MDM_GRAPHQL_STORE.lock().await;
    let vars = req.variables.as_ref().unwrap_or(&serde_json::Value::Null);
    let domain = vars.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    let target_service = vars
        .get("target_service")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let count = store
        .entities
        .values()
        .filter(|e| e.domain == domain)
        .count() as i64;

    Json(GraphqlResponse {
        data: Some(serde_json::json!({
            "syncMasterData": {
                "job_id": uuid::Uuid::new_v4().to_string(),
                "domain": domain,
                "target_service": target_service,
                "entities_count": count,
                "status": "queued",
            }
        })),
        errors: None,
    })
}

fn base64_encode(input: &str) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(input.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_master_data_entity_serialization() {
        let entity = MasterDataEntity {
            id: "ent1".to_string(),
            code: "CUST001".to_string(),
            name: "测试客户".to_string(),
            domain: "customer".to_string(),
            status: "active".to_string(),
            source_service: "crm".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-02T00:00:00Z".to_string(),
            properties: serde_json::json!({"email": "test@example.com"}),
        };
        let json = serde_json::to_value(&entity).unwrap();
        assert_eq!(json["id"], "ent1");
        assert_eq!(json["code"], "CUST001");
        assert_eq!(json["name"], "测试客户");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["status"], "active");
        assert_eq!(json["source_service"], "crm");
    }

    #[test]
    fn test_master_data_entity_deserialize() {
        let json = r#"{
            "id": "ent2",
            "code": "PROD001",
            "name": "测试产品",
            "domain": "product",
            "status": "inactive",
            "source_service": "erp",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "properties": {}
        }"#;
        let entity: MasterDataEntity = serde_json::from_str(json).unwrap();
        assert_eq!(entity.id, "ent2");
        assert_eq!(entity.domain, "product");
        assert_eq!(entity.status, "inactive");
    }

    #[test]
    fn test_page_info_serialization() {
        let page_info = PageInfo {
            has_next_page: true,
            has_previous_page: false,
            start_cursor: Some("cursor1".to_string()),
            end_cursor: Some("cursor2".to_string()),
        };
        let json = serde_json::to_value(&page_info).unwrap();
        assert_eq!(json["has_next_page"], true);
        assert_eq!(json["has_previous_page"], false);
        assert_eq!(json["start_cursor"], "cursor1");
        assert_eq!(json["end_cursor"], "cursor2");
    }

    #[test]
    fn test_quality_info_serialization() {
        let info = QualityInfo {
            score: 95.5,
            issues_count: 3,
            last_check_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["score"], 95.5);
        assert_eq!(json["issues_count"], 3);
        assert_eq!(json["last_check_at"], "2024-01-01T00:00:00Z");
    }

    #[test]
    fn test_lineage_info_serialization() {
        let info = LineageInfo {
            upstream_count: 5,
            downstream_count: 10,
            lineage_depth: 3,
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["upstream_count"], 5);
        assert_eq!(json["downstream_count"], 10);
        assert_eq!(json["lineage_depth"], 3);
    }

    #[test]
    fn test_graph_info_serialization() {
        let info = GraphInfo {
            degree: 7,
            centrality: 0.85,
            community_id: "comm1".to_string(),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["degree"], 7);
        assert_eq!(json["centrality"], 0.85);
        assert_eq!(json["community_id"], "comm1");
    }

    #[test]
    fn test_graphql_request_deserialize() {
        let json = r#"{
            "query": "{ entities { id name } }",
            "variables": {"domain": "customer"},
            "operation_name": "GetEntities"
        }"#;
        let request: GraphqlRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.query, "{ entities { id name } }");
        assert_eq!(request.operation_name.as_deref(), Some("GetEntities"));
        assert!(request.variables.is_some());
    }

    #[test]
    fn test_graphql_response_serialization() {
        let response = GraphqlResponse {
            data: Some(serde_json::json!({"entities": []})),
            errors: None,
        };
        let json = serde_json::to_value(&response).unwrap();
        assert!(json["data"]["entities"].as_array().unwrap().is_empty());
        assert!(json["errors"].is_null());
    }

    #[test]
    fn test_graphql_error_serialization() {
        let error = GraphqlError {
            message: "查询语法错误".to_string(),
            path: Some(vec!["entities".to_string(), "0".to_string()]),
        };
        let json = serde_json::to_value(&error).unwrap();
        assert_eq!(json["message"], "查询语法错误");
        assert_eq!(json["path"][0], "entities");
    }

    #[test]
    fn test_master_data_query_params_deserialize() {
        let query = "domain=customer&status=active&search=test&page=1&page_size=20";
        let params: MasterDataQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.search.as_deref(), Some("test"));
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_create_master_data_input_deserialize() {
        let json = r#"{
            "domain": "customer",
            "code": "CUST001",
            "name": "新客户",
            "properties": {"email": "new@example.com"},
            "source_service": "crm"
        }"#;
        let input: CreateMasterDataInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.domain, "customer");
        assert_eq!(input.code, "CUST001");
        assert_eq!(input.name, "新客户");
        assert!(input.properties.is_some());
        assert_eq!(input.source_service.as_deref(), Some("crm"));
    }

    #[test]
    fn test_merge_master_data_request_deserialize() {
        let json = r#"{"source_id": "ent1", "target_id": "ent2"}"#;
        let request: MergeMasterDataRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.source_id, "ent1");
        assert_eq!(request.target_id, "ent2");
    }

    #[test]
    fn test_mdm_stats_serialization() {
        let mut by_domain = HashMap::new();
        by_domain.insert("customer".to_string(), 100);
        let stats = MdmStats {
            total_entities: 500,
            by_domain,
            avg_quality_score: 92.5,
            active_services: 5,
            sync_jobs_today: 50,
            data_quality_trend: vec![85.0, 88.0, 90.0, 92.5],
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_entities"], 500);
        assert_eq!(json["avg_quality_score"], 92.5);
        assert_eq!(json["active_services"], 5);
        assert_eq!(json["sync_jobs_today"], 50);
        assert_eq!(json["data_quality_trend"].as_array().unwrap().len(), 4);
    }
}
