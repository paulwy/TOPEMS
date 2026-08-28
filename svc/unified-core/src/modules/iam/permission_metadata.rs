//! Permission Metadata submodule - Provides permission metadata for remote services

use crate::AppState;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionMetadataResponse {
    pub success: bool,
    pub message: String,
    pub data: Vec<PermissionMetadataItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionMetadataItem {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub resource: Option<String>,
    pub action: Option<String>,
    pub service: String,
}

pub async fn get_permission_metadata(
    State(state): State<AppState>,
) -> Json<PermissionMetadataResponse> {
    tracing::info!("IAM permission metadata requested");

    let result = sqlx::query!(
        "SELECT code, name, description, resource, action FROM core_permissions ORDER BY code"
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(permissions) => {
            let metadata_items: Vec<PermissionMetadataItem> = permissions
                .into_iter()
                .map(|p| {
                    let category = extract_category(&p.code);
                    let service = category.clone();

                    PermissionMetadataItem {
                        code: p.code,
                        name: p.name,
                        description: p.description,
                        category,
                        resource: p.resource,
                        action: p.action,
                        service,
                    }
                })
                .collect();

            Json(PermissionMetadataResponse {
                success: true,
                message: "获取权限元数据成功".to_string(),
                data: metadata_items,
            })
        }
        Err(e) => {
            tracing::error!("Failed to fetch permission metadata: {}", e);
            Json(PermissionMetadataResponse {
                success: false,
                message: format!("获取权限元数据失败: {}", e),
                data: Vec::new(),
            })
        }
    }
}

/// 从权限 code 中提取 category（例如 "iam:users_read" -> "iam"）
fn extract_category(code: &str) -> String {
    code.split(':').next().unwrap_or("other").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_metadata_item_serialization() {
        let item = PermissionMetadataItem {
            code: "iam:users_read".to_string(),
            name: "读取用户".to_string(),
            description: Some("读取用户列表".to_string()),
            category: "iam".to_string(),
            resource: Some("users".to_string()),
            action: Some("read".to_string()),
            service: "iam".to_string(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["code"], "iam:users_read");
        assert_eq!(json["name"], "读取用户");
        assert_eq!(json["category"], "iam");
        assert_eq!(json["service"], "iam");
        assert_eq!(json["resource"], "users");
        assert_eq!(json["action"], "read");
    }

    #[test]
    fn test_permission_metadata_item_deserialization() {
        let json = r#"{
            "code": "crm:customers_create",
            "name": "创建客户",
            "description": null,
            "category": "crm",
            "resource": null,
            "action": null,
            "service": "crm"
        }"#;
        let item: PermissionMetadataItem = serde_json::from_str(json).unwrap();
        assert_eq!(item.code, "crm:customers_create");
        assert_eq!(item.name, "创建客户");
        assert!(item.description.is_none());
        assert_eq!(item.category, "crm");
        assert!(item.resource.is_none());
        assert!(item.action.is_none());
    }

    #[test]
    fn test_permission_metadata_response_success() {
        let resp = PermissionMetadataResponse {
            success: true,
            message: "成功".to_string(),
            data: vec![],
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["success"], true);
        assert_eq!(json["message"], "成功");
        assert!(json["data"].is_array());
    }

    #[test]
    fn test_permission_metadata_response_with_items() {
        let items = vec![
            PermissionMetadataItem {
                code: "iam:users_read".to_string(),
                name: "读取用户".to_string(),
                description: None,
                category: "iam".to_string(),
                resource: None,
                action: None,
                service: "iam".to_string(),
            },
            PermissionMetadataItem {
                code: "crm:customers_write".to_string(),
                name: "写入客户".to_string(),
                description: Some("创建或更新客户".to_string()),
                category: "crm".to_string(),
                resource: Some("customers".to_string()),
                action: Some("write".to_string()),
                service: "crm".to_string(),
            },
        ];
        let resp = PermissionMetadataResponse {
            success: true,
            message: "成功".to_string(),
            data: items,
        };
        assert_eq!(resp.data.len(), 2);
        assert_eq!(resp.data[0].code, "iam:users_read");
        assert_eq!(resp.data[1].category, "crm");
    }

    #[test]
    fn test_extract_category_various() {
        assert_eq!(extract_category("iam:users_read"), "iam");
        assert_eq!(extract_category("crm:customers_create"), "crm");
        assert_eq!(extract_category("finance:invoices_approve"), "finance");
        assert_eq!(extract_category("no_colon"), "no_colon");
        assert_eq!(extract_category(""), "");
        assert_eq!(extract_category(":test"), "");
    }

    #[test]
    fn test_permission_metadata_item_clone() {
        let item = PermissionMetadataItem {
            code: "test:perm".to_string(),
            name: "测试权限".to_string(),
            description: None,
            category: "test".to_string(),
            resource: None,
            action: None,
            service: "test".to_string(),
        };
        let cloned = item.clone();
        assert_eq!(item.code, cloned.code);
        assert_eq!(item.name, cloned.name);
    }

    #[test]
    fn test_permission_metadata_item_debug() {
        let item = PermissionMetadataItem {
            code: "debug:test".to_string(),
            name: "调试测试".to_string(),
            description: None,
            category: "debug".to_string(),
            resource: None,
            action: None,
            service: "debug".to_string(),
        };
        let debug_str = format!("{:?}", item);
        assert!(debug_str.contains("debug:test"));
        assert!(debug_str.contains("调试测试"));
    }
}
