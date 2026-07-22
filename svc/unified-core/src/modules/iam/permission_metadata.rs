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
                    let category = p.code.split(':').next().unwrap_or("other").to_string();
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
