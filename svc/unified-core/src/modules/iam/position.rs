use crate::AppState;
use axum::{extract::Path, extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePositionRequest {
    pub code: String,
    pub name: String,
    pub department_id: Option<Uuid>,
    pub description: Option<String>,
    pub permissions: Vec<String>,
    pub role_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePositionRequest {
    pub name: Option<String>,
    pub department_id: Option<Uuid>,
    pub description: Option<String>,
    pub permissions: Option<Vec<String>>,
    pub role_ids: Option<Vec<Uuid>>,
}

pub async fn list_positions(State(state): State<AppState>) -> Json<serde_json::Value> {
    let rows = sqlx::query(
        r#"SELECT id, code, name, department_id, description FROM iam.positions ORDER BY name"#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|p| {
            serde_json::json!({
                "id": p.get::<uuid::Uuid, _>("id"),
                "code": p.get::<String, _>("code"),
                "name": p.get::<String, _>("name"),
                "department_id": p.get::<Option<uuid::Uuid>, _>("department_id"),
                "description": p.get::<Option<String>, _>("description"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "code": 200,
    }))
}

pub async fn create_position(
    State(state): State<AppState>,
    Json(req): Json<CreatePositionRequest>,
) -> Json<serde_json::Value> {
    let position_id = Uuid::new_v4();

    let result = sqlx::query(
        r#"INSERT INTO iam.positions (id, code, name, department_id, description, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(position_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(req.department_id)
    .bind(&req.description)
    .bind(Uuid::nil())
    .execute(&state.pool)
    .await;

    if result.is_err() {
        return Json(topems_shared_core::response::error_value(
            500,
            "创建岗位失败",
        ));
    }

    for perm in &req.permissions {
        let _ = sqlx::query(
            r#"INSERT INTO iam.position_permissions (position_id, permission, tenant_id) VALUES ($1, $2, $3)"#,
        )
        .bind(position_id)
        .bind(perm)
        .bind(Uuid::nil())
        .execute(&state.pool)
        .await;
    }

    for role_id in &req.role_ids {
        let _ = sqlx::query(
            r#"INSERT INTO iam.position_roles (position_id, role_id, tenant_id) VALUES ($1, $2, $3)"#,
        )
        .bind(position_id)
        .bind(role_id)
        .bind(Uuid::nil())
        .execute(&state.pool)
        .await;
    }

    Json(serde_json::json!({
        "success": true,
        "data": {
            "id": position_id,
            "code": req.code,
            "name": req.name,
            "department_id": req.department_id,
            "description": req.description,
            "permissions": req.permissions,
            "roles": req.role_ids,
        },
        "code": 201,
    }))
}

pub async fn get_position(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let row = sqlx::query(
        r#"SELECT id, code, name, department_id, description FROM iam.positions WHERE deleted_at IS NULL AND id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    let p = match row {
        Some(p) => p,
        None => return Json(topems_shared_core::response::error_value(404, "岗位不存在")),
    };

    let permissions: Vec<String> =
        sqlx::query(r#"SELECT permission FROM iam.position_permissions WHERE position_id = $1"#)
            .bind(id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|r| r.get::<String, _>("permission"))
            .collect();

    let roles: Vec<Uuid> =
        sqlx::query(r#"SELECT role_id FROM iam.position_roles WHERE position_id = $1"#)
            .bind(id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|r| r.get::<uuid::Uuid, _>("role_id"))
            .collect();

    Json(serde_json::json!({
        "success": true,
        "data": {
            "id": p.get::<uuid::Uuid, _>("id"),
            "code": p.get::<String, _>("code"),
            "name": p.get::<String, _>("name"),
            "department_id": p.get::<Option<uuid::Uuid>, _>("department_id"),
            "description": p.get::<Option<String>, _>("description"),
            "permissions": permissions,
            "roles": roles,
        },
        "code": 200,
    }))
}

pub async fn update_position(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePositionRequest>,
) -> Json<serde_json::Value> {
    let exists =
        sqlx::query(r#"SELECT id FROM iam.positions WHERE deleted_at IS NULL AND id = $1"#)
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .ok()
            .flatten();

    if exists.is_none() {
        return Json(topems_shared_core::response::error_value(404, "岗位不存在"));
    }

    if let Some(name) = &req.name {
        let _ = sqlx::query(r#"UPDATE iam.positions SET name = $1 WHERE id = $2"#)
            .bind(name)
            .bind(id)
            .execute(&state.pool)
            .await;
    }

    if req.department_id.is_some() {
        let _ = sqlx::query(r#"UPDATE iam.positions SET department_id = $1 WHERE id = $2"#)
            .bind(req.department_id)
            .bind(id)
            .execute(&state.pool)
            .await;
    }

    if let Some(description) = &req.description {
        let _ = sqlx::query(r#"UPDATE iam.positions SET description = $1 WHERE id = $2"#)
            .bind(description)
            .bind(id)
            .execute(&state.pool)
            .await;
    }

    if let Some(permissions) = &req.permissions {
        let _ = sqlx::query(r#"DELETE FROM iam.position_permissions WHERE position_id = $1"#)
            .bind(id)
            .execute(&state.pool)
            .await;

        for perm in permissions {
            let _ = sqlx::query(
                r#"INSERT INTO iam.position_permissions (position_id, permission, tenant_id) VALUES ($1, $2, $3)"#,
            )
            .bind(id)
            .bind(perm)
            .bind(Uuid::nil())
            .execute(&state.pool)
            .await;
        }
    }

    if let Some(role_ids) = &req.role_ids {
        let _ = sqlx::query(r#"DELETE FROM iam.position_roles WHERE position_id = $1"#)
            .bind(id)
            .execute(&state.pool)
            .await;

        for role_id in role_ids {
            let _ = sqlx::query(
                r#"INSERT INTO iam.position_roles (position_id, role_id, tenant_id) VALUES ($1, $2, $3)"#,
            )
            .bind(id)
            .bind(role_id)
            .bind(Uuid::nil())
            .execute(&state.pool)
            .await;
        }
    }

    get_position(State(state), Path(id)).await
}

pub async fn delete_position(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query(r#"UPDATE iam.positions SET deleted_at = NOW() WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "删除成功",
            "code": 200,
        })),
        _ => Json(topems_shared_core::response::error_value(
            404,
            "删除岗位失败",
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_position_request_deserialization() {
        let json = r#"{
            "code": "ENGINEER",
            "name": "工程师",
            "department_id": "550e8400-e29b-41d4-a716-446655440000",
            "description": "负责软件开发",
            "permissions": ["crm:customers_read", "crm:customers_write"],
            "role_ids": ["660e8400-e29b-41d4-a716-446655440001"]
        }"#;
        let req: CreatePositionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.code, "ENGINEER");
        assert_eq!(req.name, "工程师");
        assert!(req.department_id.is_some());
        assert_eq!(req.description.as_deref(), Some("负责软件开发"));
        assert_eq!(req.permissions.len(), 2);
        assert_eq!(req.role_ids.len(), 1);
    }

    #[test]
    fn test_create_position_request_minimal() {
        let json = r#"{"code": "MANAGER", "name": "经理", "permissions": [], "role_ids": []}"#;
        let req: CreatePositionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.code, "MANAGER");
        assert_eq!(req.name, "经理");
        assert!(req.department_id.is_none());
        assert!(req.description.is_none());
        assert!(req.permissions.is_empty());
        assert!(req.role_ids.is_empty());
    }

    #[test]
    fn test_update_position_request_all_fields() {
        let json = r#"{
            "name": "高级工程师",
            "department_id": "550e8400-e29b-41d4-a716-446655440000",
            "description": "负责高级软件开发",
            "permissions": ["crm:customers_read"],
            "role_ids": []
        }"#;
        let req: UpdatePositionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name.as_deref(), Some("高级工程师"));
        assert!(req.department_id.is_some());
        assert_eq!(req.permissions.unwrap().len(), 1);
    }

    #[test]
    fn test_update_position_request_empty() {
        let json = r#"{}"#;
        let req: UpdatePositionRequest = serde_json::from_str(json).unwrap();
        assert!(req.name.is_none());
        assert!(req.department_id.is_none());
        assert!(req.description.is_none());
        assert!(req.permissions.is_none());
        assert!(req.role_ids.is_none());
    }

    #[test]
    fn test_create_position_request_serialization() {
        let req = CreatePositionRequest {
            code: "TEST".to_string(),
            name: "测试岗位".to_string(),
            department_id: None,
            description: Some("测试描述".to_string()),
            permissions: vec!["perm1".to_string(), "perm2".to_string()],
            role_ids: vec![],
        };
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["code"], "TEST");
        assert_eq!(json["name"], "测试岗位");
        assert_eq!(json["permissions"][0], "perm1");
        assert!(json["role_ids"].is_array());
    }
}
