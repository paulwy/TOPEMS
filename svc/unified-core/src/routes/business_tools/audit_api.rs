//! V454: Permission Audit Log API
//!
//! Provides REST API endpoints for querying permission audit logs.

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use axum::Router;

use crate::shared::AppState;
use super::permission_audit_log::{AuditLogEntry, AuditLogQuery, AuditLogResponse, AuditLogStore, InMemoryAuditLogStore};

// ===== Route Handlers =====

/// `GET /api/business-tools/permissions/audit-logs` — Query audit logs.
pub async fn list_audit_logs(
    State(state): State<AppState>,
    Query(query): Query<AuditLogQuery>,
) -> Result<Json<AuditLogResponse>, (StatusCode, Json<serde_json::Value>)> {
    // For now, use an in-memory store. In production, this would be injected via AppState.
    let store = InMemoryAuditLogStore::new();
    let response = store.query(&query).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to query audit logs: {}", e),
            })),
        )
    })?;

    Ok(Json(response))
}

/// `GET /api/business-tools/permissions/audit-logs/{id}` — Get a single audit log entry.
pub async fn get_audit_log(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<AuditLogEntry>, (StatusCode, Json<serde_json::Value>)> {
    let store = InMemoryAuditLogStore::new();
    let entry = store.get_by_id(&id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to get audit log: {}", e),
            })),
        )
    })?;

    match entry {
        Some(entry) => Ok(Json(entry)),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": format!("Audit log not found: {}", id),
            })),
        )),
    }
}

/// `GET /api/business-tools/permissions/audit-logs/count` — Get total audit log count.
pub async fn count_audit_logs(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let store = InMemoryAuditLogStore::new();
    let count = store.count().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to count audit logs: {}", e),
            })),
        )
    })?;

    Ok(Json(serde_json::json!({
        "count": count,
    })))
}

// ===== Route Registration =====

/// Create audit log routes.
pub fn audit_log_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/permissions/audit-logs",
            axum::routing::get(list_audit_logs),
        )
        .route(
            "/business-tools/permissions/audit-logs/count",
            axum::routing::get(count_audit_logs),
        )
        .route(
            "/business-tools/permissions/audit-logs/{id}",
            axum::routing::get(get_audit_log),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_log_query_deserialization() {
        let query_str = "tenant_id=t1&user_id=u1&limit=50&offset=10";
        let query: AuditLogQuery = serde_urlencoded::from_str(query_str).unwrap();
        assert_eq!(query.tenant_id.as_deref(), Some("t1"));
        assert_eq!(query.user_id.as_deref(), Some("u1"));
        assert_eq!(query.limit, 50);
        assert_eq!(query.offset, 10);
    }

    #[test]
    fn test_audit_log_query_default_limit() {
        let query_str = "";
        let query: AuditLogQuery = serde_urlencoded::from_str(query_str).unwrap();
        assert_eq!(query.limit, 100);
        assert_eq!(query.offset, 0);
    }
}
