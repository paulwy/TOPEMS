use crate::AppState;
use axum::{extract::Path, extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
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

fn user_positions_response(rows: Vec<sqlx::postgres::PgRow>) -> Json<serde_json::Value> {
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

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/users/{user_id}/positions",
    tag = "Core-IAM",
    params(
        ("user_id" = String, Path, description = "user_id"),
    ),
    responses((status = 200, description = "Core users/{user_id}/positions GET"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_user_positions(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(user_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化岗位分配事务作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "初始化岗位分配事务作用域失败",
            ));
        }
    };

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
    .fetch_all(&mut scope)
    .await;

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询用户岗位失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "查询用户岗位失败",
            ));
        }
    };

    user_positions_response(rows)
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/iam/users/{user_id}/positions",
    tag = "Core-IAM",
    params(
        ("user_id" = String, Path, description = "user_id"),
    ),
    responses((status = 200, description = "Core users/{user_id}/positions POST"), (status = 500, description = "服务内部错误")),
)]
pub async fn assign_position(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(user_id): Path<Uuid>,
    Json(req): Json<AssignPositionRequest>,
) -> Json<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化岗位分配事务作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "初始化岗位分配事务作用域失败",
            ));
        }
    };
    if let Err(e) = sqlx::query(
        r#"
        INSERT INTO iam.user_positions (user_id, position_id, tenant_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, position_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(req.position_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        tracing::error!("分配岗位失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            "分配岗位失败",
        ));
    }

    let rows = match sqlx::query(
        r#"
        SELECT p.id, p.code, p.name, p.department_id, p.description
        FROM iam.positions p
        JOIN iam.user_positions up ON p.id = up.position_id
        WHERE up.user_id = $1
        ORDER BY p.name
        "#,
    )
    .bind(user_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询用户岗位失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "查询用户岗位失败",
            ));
        }
    };

    user_positions_response(rows)
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/iam/users/batch-positions",
    tag = "Core-IAM",
    responses((status = 200, description = "Core users/batch-positions POST"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_assign_positions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<BatchAssignPositionsRequest>,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化岗位分配事务作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "初始化岗位分配事务作用域失败",
            ));
        }
    };
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    for user_id in &req.user_ids {
        if let Err(e) = sqlx::query(
            r#"
            INSERT INTO iam.user_positions (user_id, position_id, tenant_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, position_id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .bind(req.position_id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await
        {
            tracing::error!("批量分配岗位失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "批量分配岗位失败",
            ));
        }
    }

    Json(serde_json::json!({
        "success": true,
        "message": "批量分配成功",
        "code": 200,
    }))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/iam/users/{user_id}/positions/{position_id}",
    tag = "Core-IAM",
    params(
        ("user_id" = String, Path, description = "user_id"),
        ("position_id" = String, Path, description = "position_id"),
    ),
    responses((status = 200, description = "Core users/{user_id}/positions/{position_id} DELETE"), (status = 500, description = "服务内部错误")),
)]
pub async fn unassign_position(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((user_id, position_id)): Path<(Uuid, Uuid)>,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化取消岗位分配事务作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "初始化取消岗位分配事务作用域失败",
            ));
        }
    };
    let result = sqlx::query(
        r#"
        DELETE FROM iam.user_positions
        WHERE user_id = $1 AND position_id = $2
        "#,
    )
    .bind(user_id)
    .bind(position_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
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
            .fetch_all(&mut scope)
            .await
            .unwrap_or_default();
            user_positions_response(rows)
        }
        _ => Json(topems_shared_core::response::error_value(
            404,
            "取消分配失败",
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/positions/{position_id}/users",
    tag = "Core-IAM",
    params(
        ("position_id" = String, Path, description = "position_id"),
    ),
    responses((status = 200, description = "Core positions/{position_id}/users GET"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_position_users(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(position_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化岗位分配事务作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "初始化岗位分配事务作用域失败",
            ));
        }
    };
    let rows = sqlx::query(
        r#"
        SELECT u.id, u.username, u.email, u.full_name
        FROM iam.users u
        JOIN iam.user_positions up ON u.id = up.user_id
        WHERE up.position_id = $1
        ORDER BY u.username
        "#,
    )
    .bind(position_id)
    .fetch_all(&mut scope)
    .await;

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询岗位用户失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "查询岗位用户失败",
            ));
        }
    };

    let result: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<uuid::Uuid, _>("id"),
                "username": r.get::<String, _>("username"),
                "email": r.get::<String, _>("email"),
                "full_name": r.get::<Option<String>, _>("full_name"),
                "tenant_id": null,
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
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
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
