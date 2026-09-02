//! V35.0 AC-7: 数据血缘
//!
//! 展示主数据在各服务间的引用关系（来源服务 → 本地引用）。
//! 从 master_data_refs.rs 拆分，保持独立模块。

use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;
use sqlx::Row;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;

use super::ApiState;

#[derive(Debug, Serialize)]
pub struct DataLineageNode {
    pub service: String,
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub status: String,
    pub local_entity_type: Option<String>,
    pub local_entity_id: Option<String>,
    pub last_synced_at: String,
}

#[derive(Debug, Serialize)]
pub struct DataLineageResponse {
    pub master_data_id: String,
    pub source_service: String,
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub references: Vec<DataLineageNode>,
    pub total_references: i64,
}

/// 查询主数据血缘关系
/// 展示主数据在各服务间的引用关系（来源服务 → 本地引用）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/lineage",
    tag = "Master Data",
    operation_id = "get_data_lineage",
    responses((status = 200, description = "OK")),
)]
pub async fn get_data_lineage(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<DataLineageResponse>> {
    // 查询主数据引用本身
    let ref_row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, tenant_id, domain, code, name, status,
                  source_service, local_entity_type, local_entity_id,
                  last_synced_at, created_at, updated_at
           FROM erp.erp_master_data_refs
           WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&state.db)
    .await;

    match ref_row {
        Ok(Some(row)) => {
            let source_service: String = row.try_get("source_service").unwrap_or_default();
            let domain: String = row.try_get("domain").unwrap_or_default();
            let code: String = row.try_get("code").unwrap_or_default();
            let name: Option<String> = row.try_get("name").ok().flatten();
            let local_entity_type: Option<String> = row.try_get("local_entity_type").ok().flatten();
            let local_entity_id: Option<uuid::Uuid> =
                row.try_get("local_entity_id").unwrap_or(None);
            let last_synced_at: chrono::DateTime<chrono::Utc> = row
                .try_get("last_synced_at")
                .unwrap_or_else(|_| chrono::Utc::now());
            let status: String = row.try_get("status").unwrap_or_default();

            // 构建血缘节点：来源服务 → ERP 本地引用
            let mut references = Vec::new();

            // 来源服务节点
            references.push(DataLineageNode {
                service: source_service.clone(),
                domain: domain.clone(),
                code: code.clone(),
                name: name.clone(),
                status: status.clone(),
                local_entity_type: None,
                local_entity_id: None,
                last_synced_at: last_synced_at.to_rfc3339(),
            });

            // ERP 本地引用节点
            references.push(DataLineageNode {
                service: "erp".to_string(),
                domain: domain.clone(),
                code: code.clone(),
                name: name.clone(),
                status: status.clone(),
                local_entity_type,
                local_entity_id: local_entity_id.map(|id| id.to_string()),
                last_synced_at: last_synced_at.to_rfc3339(),
            });

            let total = references.len() as i64;

            Json(ApiResponse::success(
                DataLineageResponse {
                    master_data_id,
                    source_service,
                    domain,
                    code,
                    name,
                    references,
                    total_references: total,
                },
                "数据血缘关系",
            ))
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询数据血缘失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询数据血缘失败: {}", e)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_lineage_node_serialization() {
        let node = DataLineageNode {
            service: "crm".to_string(),
            domain: "customer".to_string(),
            code: "CUST001".to_string(),
            name: Some("测试客户".to_string()),
            status: "active".to_string(),
            local_entity_type: Some("customer".to_string()),
            local_entity_id: Some("123".to_string()),
            last_synced_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&node).unwrap();
        assert_eq!(json["service"], "crm");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["code"], "CUST001");
        assert_eq!(json["name"], "测试客户");
        assert_eq!(json["status"], "active");
        assert_eq!(json["last_synced_at"], "2024-01-01T00:00:00Z");
    }

    #[test]
    fn test_data_lineage_node_minimal() {
        let node = DataLineageNode {
            service: "erp".to_string(),
            domain: "product".to_string(),
            code: "PROD001".to_string(),
            name: None,
            status: "inactive".to_string(),
            local_entity_type: None,
            local_entity_id: None,
            last_synced_at: "2024-01-02T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&node).unwrap();
        assert_eq!(json["service"], "erp");
        assert!(json["name"].is_null());
        assert_eq!(json["status"], "inactive");
    }

    #[test]
    fn test_data_lineage_response_serialization() {
        let response = DataLineageResponse {
            master_data_id: "md1".to_string(),
            source_service: "crm".to_string(),
            domain: "customer".to_string(),
            code: "CUST001".to_string(),
            name: Some("测试客户".to_string()),
            references: vec![],
            total_references: 0,
        };
        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["master_data_id"], "md1");
        assert_eq!(json["source_service"], "crm");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["code"], "CUST001");
        assert_eq!(json["name"], "测试客户");
        assert_eq!(json["total_references"], 0);
    }

    #[test]
    fn test_data_lineage_response_with_references() {
        let node = DataLineageNode {
            service: "wms".to_string(),
            domain: "customer".to_string(),
            code: "CUST001".to_string(),
            name: Some("测试客户".to_string()),
            status: "active".to_string(),
            local_entity_type: None,
            local_entity_id: None,
            last_synced_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let response = DataLineageResponse {
            master_data_id: "md1".to_string(),
            source_service: "crm".to_string(),
            domain: "customer".to_string(),
            code: "CUST001".to_string(),
            name: None,
            references: vec![node],
            total_references: 1,
        };
        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["total_references"], 1);
        assert_eq!(json["references"][0]["service"], "wms");
        assert!(json["name"].is_null());
    }
}
