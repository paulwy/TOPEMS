use crate::AppState;
use axum::{extract::Path, extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignPositionRequest {
    position_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchAssignPositionsRequest {
    pub user_ids: Vec<Uuid>,
    pub position_id: Uuid,
}

pub async fn get_user_positions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(user_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let rows = sqlx::query(
        r#"
        SELECT p.id, p.code, p.name, p.department_id, p.description
        FROM iam.positions p
        JOIN iam.user_positions up ON p.id = up.position_id
        WHERE up.user_id = $1
        ORDER BY p.name
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<uuid::Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "department_id": r.get::<Option<uuid::Uuid>, _>("department_id"),
                "description": r.get::<Option<String>, _>("description"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "code": 200,
    }))
}

pub async fn assign_position(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<Uuid>,
    Json(req): Json<AssignPositionRequest>,
) -> Json<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query(
        r#"
        INSERT INTO iam.user_positions (user_id, position_id, tenant_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, position_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(req.position_id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    if result.is_err() {
        return Json(topems_shared_core::response::error_value(
            500,
            "分配岗位失败",
        ));
    }

    get_user_positions(State(state), Extension(claims.clone()), Path(user_id)).await
}

pub async fn batch_assign_positions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchAssignPositionsRequest>,
) -> Json<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    for user_id in &req.user_ids {
        let _ = sqlx::query(
            r#"
            INSERT INTO iam.user_positions (user_id, position_id, tenant_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, position_id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .bind(req.position_id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;
    }

    Json(serde_json::json!({
        "success": true,
        "message": "批量分配成功",
        "code": 200,
    }))
}

pub async fn unassign_position(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((user_id, position_id)): Path<(Uuid, Uuid)>,
) -> Json<serde_json::Value> {
    let result = sqlx::query(
        r#"
        DELETE FROM iam.user_positions
        WHERE user_id = $1 AND position_id = $2
        "#,
    )
    .bind(user_id)
    .bind(position_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            get_user_positions(State(state), Extension(claims.clone()), Path(user_id)).await
        }
        _ => Json(topems_shared_core::response::error_value(
            404,
            "取消分配失败",
        )),
    }
}

pub async fn get_position_users(
    State(state): State<AppState>,
    Path(position_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let rows = sqlx::query(
        r#"
        SELECT u.id, u.username, u.email, u.full_name, u.tenant_id
        FROM iam.users u
        JOIN iam.user_positions up ON u.id = up.user_id
        WHERE up.position_id = $1
        ORDER BY u.username
        "#,
    )
    .bind(position_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<uuid::Uuid, _>("id"),
                "username": r.get::<String, _>("username"),
                "email": r.get::<String, _>("email"),
                "full_name": r.get::<Option<String>, _>("full_name"),
                "tenant_id": r.get::<Option<uuid::Uuid>, _>("tenant_id"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "code": 200,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_assign_position_request_deserialization() {
        let json = r#"{"position_id": "550e8400-e29b-41d4-a716-446655440000"}"#;
        let req: AssignPositionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(
            req.position_id,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_assign_position_request_serialization() {
        let req = AssignPositionRequest {
            position_id: Uuid::nil(),
        };
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["position_id"], "00000000-0000-0000-0000-000000000000");
    }

    #[test]
    fn test_batch_assign_positions_request() {
        let json = r#"{
            "user_ids": [
                "550e8400-e29b-41d4-a716-446655440001",
                "550e8400-e29b-41d4-a716-446655440002"
            ],
            "position_id": "550e8400-e29b-41d4-a716-446655440000"
        }"#;
        let req: BatchAssignPositionsRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.user_ids.len(), 2);
        assert_eq!(
            req.position_id,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_batch_assign_positions_request_empty_users() {
        let json = r#"{
            "user_ids": [],
            "position_id": "550e8400-e29b-41d4-a716-446655440000"
        }"#;
        let req: BatchAssignPositionsRequest = serde_json::from_str(json).unwrap();
        assert!(req.user_ids.is_empty());
    }

    #[test]
    fn test_batch_assign_positions_request_clone() {
        let req = BatchAssignPositionsRequest {
            user_ids: vec![Uuid::nil()],
            position_id: Uuid::nil(),
        };
        let cloned = req.clone();
        assert_eq!(req.user_ids.len(), cloned.user_ids.len());
        assert_eq!(req.position_id, cloned.position_id);
    }

    #[test]
    fn test_assign_position_request_clone() {
        let req = AssignPositionRequest {
            position_id: Uuid::nil(),
        };
        let cloned = req.clone();
        assert_eq!(req.position_id, cloned.position_id);
    }
}
