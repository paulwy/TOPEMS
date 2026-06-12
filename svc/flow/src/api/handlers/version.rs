use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::AppState;
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkflowVersion {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub version: String,
    pub definition: serde_json::Value,
    pub change_description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVersionRequest {
    pub version: String,
    pub definition: serde_json::Value,
    pub change_description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RollbackRequest {
    pub to_version: String,
    pub reason: Option<String>,
    pub rolled_back_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VersionListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VersionListResponse {
    pub items: Vec<WorkflowVersion>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_versions(
    State(state): State<AppState>,
    Path(workflow_id): Path<Uuid>,
    Query(query): Query<VersionListQuery>,
) -> Json<ApiResponse<VersionListResponse>> {
    let pool = state.repo.get_pool();

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let total: (i64,) =
        match sqlx::query_as("SELECT COUNT(*) FROM workflow_versions WHERE workflow_id = $1")
            .bind(workflow_id)
            .fetch_one(pool)
            .await
        {
            Ok(t) => t,
            Err(_) => (0,),
        };

    let versions: Vec<WorkflowVersion> = match sqlx::query_as(
        r#"
        SELECT 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        FROM workflow_versions
        WHERE workflow_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(workflow_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };

    Json(ApiResponse::success(
        VersionListResponse {
            items: versions,
            total: total.0,
            page,
            page_size,
        },
        "Success",
    ))
}

pub async fn create_version(
    State(state): State<AppState>,
    Path(workflow_id): Path<Uuid>,
    Json(req): Json<CreateVersionRequest>,
) -> Json<ApiResponse<WorkflowVersion>> {
    let pool = state.repo.get_pool();

    let version = sqlx::query_as(
        r#"
        INSERT INTO workflow_versions (workflow_id, version, definition, change_description, created_by, is_active)
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        "#,
    )
    .bind(workflow_id)
    .bind(req.version)
    .bind(req.definition)
    .bind(req.change_description)
    .bind(req.created_by)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create workflow version: {}", e);
        e
    })
    .ok();

    match version {
        Some(v) => Json(ApiResponse::success(v, "Version created successfully")),
        None => Json(ApiResponse::<WorkflowVersion>::error(
            500,
            "Failed to create version",
        )),
    }
}

pub async fn get_version(
    State(state): State<AppState>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<WorkflowVersion>> {
    let pool = state.repo.get_pool();

    let version = sqlx::query_as(
        r#"
        SELECT 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        FROM workflow_versions
        WHERE id = $1 AND workflow_id = $2
        "#,
    )
    .bind(version_id)
    .bind(workflow_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    match version {
        Some(v) => Json(ApiResponse::success(v, "Success")),
        None => Json(ApiResponse::<WorkflowVersion>::error(
            404,
            "Version not found",
        )),
    }
}

pub async fn delete_version(
    State(state): State<AppState>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<String>> {
    let pool = state.repo.get_pool();

    let result = sqlx::query("DELETE FROM workflow_versions WHERE id = $1 AND workflow_id = $2")
        .bind(version_id)
        .bind(workflow_id)
        .execute(pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            "".to_string(),
            "Version deleted successfully",
        )),
        Err(e) => {
            let msg = format!("Failed to delete version: {}", e);
            Json(ApiResponse::<String>::error(500, &msg))
        }
    }
}

pub async fn activate_version(
    State(state): State<AppState>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<WorkflowVersion>> {
    let pool = state.repo.get_pool();
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            let msg = format!("Failed to start transaction: {}", e);
            return Json(ApiResponse::<WorkflowVersion>::error(500, &msg));
        }
    };

    // Deactivate all versions for this workflow
    if let Err(e) =
        sqlx::query("UPDATE workflow_versions SET is_active = false WHERE workflow_id = $1")
            .bind(workflow_id)
            .execute(&mut *tx)
            .await
    {
        let _ = tx.rollback().await;
        let msg = format!("Failed to deactivate versions: {}", e);
        return Json(ApiResponse::<WorkflowVersion>::error(500, &msg));
    }

    // Activate the specified version
    let version = sqlx::query_as(
        r#"
        UPDATE workflow_versions 
        SET is_active = true 
        WHERE id = $1 AND workflow_id = $2
        RETURNING 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        "#,
    )
    .bind(version_id)
    .bind(workflow_id)
    .fetch_optional(&mut *tx)
    .await;

    match version {
        Ok(Some(v)) => {
            if tx.commit().await.is_ok() {
                Json(ApiResponse::success(v, "Version activated successfully"))
            } else {
                Json(ApiResponse::<WorkflowVersion>::error(
                    500,
                    "Failed to commit transaction",
                ))
            }
        }
        Ok(None) => {
            let _ = tx.rollback().await;
            Json(ApiResponse::<WorkflowVersion>::error(
                404,
                "Version not found",
            ))
        }
        Err(e) => {
            let _ = tx.rollback().await;
            let msg = format!("Failed to activate version: {}", e);
            Json(ApiResponse::<WorkflowVersion>::error(500, &msg))
        }
    }
}

pub async fn rollback_version(
    State(state): State<AppState>,
    Path(workflow_id): Path<Uuid>,
    Json(req): Json<RollbackRequest>,
) -> Json<ApiResponse<String>> {
    let pool = state.repo.get_pool();
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            let msg = format!("Failed to start transaction: {}", e);
            return Json(ApiResponse::<String>::error(500, &msg));
        }
    };

    // Find the version to rollback to
    let target_version: Option<WorkflowVersion> = sqlx::query_as(
        r#"
        SELECT 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        FROM workflow_versions
        WHERE workflow_id = $1 AND version = $2
        "#,
    )
    .bind(workflow_id)
    .bind(&req.to_version)
    .fetch_optional(&mut *tx)
    .await
    .ok()
    .flatten();

    let target_version = match target_version {
        Some(v) => v,
        None => {
            let _ = tx.rollback().await;
            return Json(ApiResponse::<String>::error(
                404,
                "Target version not found",
            ));
        }
    };

    // Get current active version
    let current_version: Option<WorkflowVersion> = sqlx::query_as(
        r#"
        SELECT 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        FROM workflow_versions
        WHERE workflow_id = $1 AND is_active = true
        "#,
    )
    .bind(workflow_id)
    .fetch_optional(&mut *tx)
    .await
    .ok()
    .flatten();

    let from_version = current_version
        .map(|v| v.version)
        .unwrap_or_else(|| "unknown".to_string());

    // Update the workflow with the definition from the target version
    if let Err(e) = sqlx::query("UPDATE flow.workflows SET definition = $1 WHERE id = $2")
        .bind(target_version.definition)
        .bind(workflow_id)
        .execute(&mut *tx)
        .await
    {
        let _ = tx.rollback().await;
        let msg = format!("Failed to update workflow: {}", e);
        return Json(ApiResponse::<String>::error(500, &msg));
    }

    // Activate the target version
    if let Err(e) =
        sqlx::query("UPDATE workflow_versions SET is_active = false WHERE workflow_id = $1")
            .bind(workflow_id)
            .execute(&mut *tx)
            .await
    {
        let _ = tx.rollback().await;
        let msg = format!("Failed to deactivate versions: {}", e);
        return Json(ApiResponse::<String>::error(500, &msg));
    }

    if let Err(e) = sqlx::query("UPDATE workflow_versions SET is_active = true WHERE id = $1")
        .bind(target_version.id)
        .execute(&mut *tx)
        .await
    {
        let _ = tx.rollback().await;
        let msg = format!("Failed to activate version: {}", e);
        return Json(ApiResponse::<String>::error(500, &msg));
    }

    // Record the rollback
    if let Err(e) = sqlx::query(
        r#"
        INSERT INTO workflow_rollbacks (workflow_id, from_version, to_version, reason, rolled_back_by)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(workflow_id)
    .bind(from_version)
    .bind(&req.to_version)
    .bind(req.reason)
    .bind(req.rolled_back_by)
    .execute(&mut *tx)
    .await {
        let _ = tx.rollback().await;
        let msg = format!("Failed to record rollback: {}", e);
        return Json(ApiResponse::<String>::error(500, &msg));
    }

    if tx.commit().await.is_ok() {
        Json(ApiResponse::success("".to_string(), "Rollback successful"))
    } else {
        Json(ApiResponse::<String>::error(
            500,
            "Failed to commit transaction",
        ))
    }
}

pub async fn compare_versions(
    State(state): State<AppState>,
    Path((workflow_id, version1, version2)): Path<(Uuid, String, String)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.repo.get_pool();

    let v1: Option<WorkflowVersion> = sqlx::query_as(
        r#"
        SELECT 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        FROM workflow_versions
        WHERE workflow_id = $1 AND version = $2
        "#,
    )
    .bind(workflow_id)
    .bind(&version1)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let v2: Option<WorkflowVersion> = sqlx::query_as(
        r#"
        SELECT 
            id,
            workflow_id,
            version,
            definition,
            change_description,
            created_by,
            created_at,
            is_active
        FROM workflow_versions
        WHERE workflow_id = $1 AND version = $2
        "#,
    )
    .bind(workflow_id)
    .bind(&version2)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let result = serde_json::json!({
        "version1": v1,
        "version2": v2,
    });

    Json(ApiResponse::success(result, "Success"))
}
