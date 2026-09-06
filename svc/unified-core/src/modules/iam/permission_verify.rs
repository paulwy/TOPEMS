use crate::AppState;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPermissionRequest {
    pub permission: String,
    pub resource_id: Option<Uuid>,
    pub resource_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPermissionResponse {
    pub has_permission: bool,
    pub permission: String,
    pub message: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:permission:read"])),
    path = "/iam/permissions/verify",
    tag = "IAM-Permissions",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "权限校验结果（has_permission）"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn verify_permission(
    State(state): State<AppState>,
    Json(req): Json<VerifyPermissionRequest>,
) -> Json<serde_json::Value> {
    let result = verify_user_permission(&state.pool, &req.permission).await;
    let permission = req.permission.clone();

    Json(serde_json::json!({
        "success": true,
        "data": VerifyPermissionResponse {
            has_permission: result,
            permission: req.permission,
            message: if result { None } else { Some(format!("无权访问：{}", permission)) },
        },
        "code": 200,
    }))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyMultiplePermissionsRequest {
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyMultiplePermissionsResponse {
    pub results: Vec<VerifyPermissionResponse>,
    pub all_granted: bool,
    pub any_granted: bool,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:permission:read"])),
    path = "/iam/permissions/verify-multiple",
    tag = "IAM-Permissions",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "批量权限校验结果（results/all_granted/any_granted）"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn verify_multiple_permissions(
    State(state): State<AppState>,
    Json(req): Json<VerifyMultiplePermissionsRequest>,
) -> Json<serde_json::Value> {
    let mut results = Vec::new();

    for permission in req.permissions {
        let has_permission = verify_user_permission(&state.pool, &permission).await;
        results.push(VerifyPermissionResponse {
            has_permission,
            permission: permission.clone(),
            message: if has_permission {
                None
            } else {
                Some(format!("无权访问：{}", permission))
            },
        });
    }

    let all_granted = results.iter().all(|r| r.has_permission);
    let any_granted = results.iter().any(|r| r.has_permission);

    Json(serde_json::json!({
        "success": true,
        "data": VerifyMultiplePermissionsResponse {
            results,
            all_granted,
            any_granted,
        },
        "code": 200,
    }))
}

async fn verify_user_permission(pool: &PgPool, permission_code: &str) -> bool {
    let count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM core_role_permissions rp
        JOIN core_permissions p ON rp.permission_id = p.id
        JOIN core_user_roles ur ON rp.role_id = ur.role_id
        JOIN core_users u ON ur.user_id = u.id
        WHERE p.code = $1 AND u.is_superuser = true
        UNION ALL
        SELECT COUNT(*) as count
        FROM core_role_permissions rp
        JOIN core_permissions p ON rp.permission_id = p.id
        JOIN core_user_roles ur ON rp.role_id = ur.role_id
        JOIN core_users u ON ur.user_id = u.id
        WHERE p.code = $1 AND u.is_superuser = false
        "#,
        permission_code,
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    !count.is_empty() && count.iter().any(|r| r.count.unwrap_or(0) > 0)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResourcePermissionRequest {
    pub user_id: Uuid,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub action: String,
}

pub async fn check_resource_permission(
    State(state): State<AppState>,
    Json(req): Json<CheckResourcePermissionRequest>,
) -> Json<serde_json::Value> {
    let has_permission = check_user_resource_permission(
        &state.pool,
        &req.user_id,
        &req.resource_type,
        &req.resource_id,
        &req.action,
    )
    .await;

    Json(serde_json::json!({
        "success": true,
        "data": VerifyPermissionResponse {
            has_permission,
            permission: format!("{}:{}:{}", req.resource_type, req.resource_id, req.action),
            message: if has_permission { None } else { Some("无权访问此资源".to_string()) },
        },
        "code": 200,
    }))
}

async fn check_user_resource_permission(
    pool: &PgPool,
    user_id: &Uuid,
    resource_type: &str,
    resource_id: &Uuid,
    action: &str,
) -> bool {
    let result: Result<(i64,), _> = sqlx::query_as(
        r#"
        SELECT COUNT(*)::int8 as count
        FROM iam.resource_permissions rp
        WHERE rp.user_id = $1
          AND rp.resource_type = $2
          AND rp.resource_id = $3
          AND rp.permission = $4
        "#,
    )
    .bind(user_id)
    .bind(resource_type)
    .bind(resource_id)
    .bind(action)
    .fetch_one(pool)
    .await;

    match result {
        Ok((count,)) => count > 0,
        Err(_) => false,
    }
}

pub async fn get_my_permissions(State(state): State<AppState>) -> Json<serde_json::Value> {
    let permissions: Vec<String> = sqlx::query!(
        r#"
        SELECT DISTINCT p.code
        FROM core_permissions p
        JOIN core_role_permissions rp ON p.id = rp.permission_id
        JOIN core_user_roles ur ON rp.role_id = ur.role_id
        JOIN core_users u ON ur.user_id = u.id
        WHERE u.is_superuser = true
        ORDER BY p.code
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.code)
    .collect();

    Json(serde_json::json!({
        "success": true,
        "data": permissions,
        "code": 200,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_permission_request_deserialization() {
        let json = r#"{"permission": "iam:users_read"}"#;
        let req: VerifyPermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permission, "iam:users_read");
        assert!(req.resource_id.is_none());
        assert!(req.resource_type.is_none());
    }

    #[test]
    fn test_verify_permission_request_with_resource() {
        let json = r#"{"permission": "crm:customers_read", "resource_id": "550e8400-e29b-41d4-a716-446655440000", "resource_type": "customer"}"#;
        let req: VerifyPermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permission, "crm:customers_read");
        assert!(req.resource_id.is_some());
        assert_eq!(req.resource_type.as_deref(), Some("customer"));
    }

    #[test]
    fn test_verify_permission_response_serialization_granted() {
        let resp = VerifyPermissionResponse {
            has_permission: true,
            permission: "iam:users_read".to_string(),
            message: None,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["has_permission"], true);
        assert_eq!(json["permission"], "iam:users_read");
        assert!(json["message"].is_null());
    }

    #[test]
    fn test_verify_permission_response_serialization_denied() {
        let resp = VerifyPermissionResponse {
            has_permission: false,
            permission: "iam:users_delete".to_string(),
            message: Some("无权访问".to_string()),
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["has_permission"], false);
        assert_eq!(json["message"], "无权访问");
    }

    #[test]
    fn test_verify_multiple_permissions_request() {
        let json = r#"{"permissions": ["iam:users_read", "iam:users_write"]}"#;
        let req: VerifyMultiplePermissionsRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permissions.len(), 2);
        assert_eq!(req.permissions[0], "iam:users_read");
        assert_eq!(req.permissions[1], "iam:users_write");
    }

    #[test]
    fn test_verify_multiple_permissions_empty() {
        let json = r#"{"permissions": []}"#;
        let req: VerifyMultiplePermissionsRequest = serde_json::from_str(json).unwrap();
        assert!(req.permissions.is_empty());
    }

    #[test]
    fn test_check_resource_permission_request() {
        let json = r#"{
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "resource_type": "customer",
            "resource_id": "660e8400-e29b-41d4-a716-446655440001",
            "action": "read"
        }"#;
        let req: CheckResourcePermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.resource_type, "customer");
        assert_eq!(req.action, "read");
    }
}
