use axum::{
    extract::{Extension, Path, State},
    Json,
};
use chrono::Utc;
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::TenantScope;
use tracing::info;

use crate::shared::AppState;

use super::models::{ShareDashboardRequest, ShareLinkResponse};

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/dashboard/{id}/share",
    tag = "Dashboard",
    operation_id = "create_share_link",
    responses((status = 200, description = "OK")),
)]
pub async fn create_share_link(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ShareDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating share link for dashboard: {}", id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.create_share_link",
        "bi.analytics_dashboard_shares",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to create share link: {}", e),
            ));
        }
    };

    // 校验看板归属，避免为其他租户看板创建分享链接后经 share_id 读布局
    let owns_dashboard = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM analytics_dashboards \
         WHERE id = $1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR tenant_id = $2::uuid)",
    )
    .bind(id)
    .bind(tenant_scope.tenant_id())
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);
    if owns_dashboard == 0 {
        return Json(topems_shared_core::response::error_value(
            404,
            "Dashboard not found",
        ));
    }

    let share_id = Uuid::new_v4();
    let now = Utc::now();

    let expires_at = req.expires_at;

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_dashboard_shares (id, dashboard_id, shared_with, permission, expires_at, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, dashboard_id, permission, expires_at, created_at
        "#,
        share_id,
        id,
        &req.shared_with,
        req.permission,
expires_at, now,
        tenant_scope.create_tenant_id(),
    )
    .fetch_one(&mut db_scope)
    .await;

    match result {
        Ok(row) => {
            if let Err(e) = db_scope.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to create share link: {}", e),
                ));
            }
            Json(serde_json::json!({
                                "success": true,
                                "message": "Create share link",
                                "data": ShareLinkResponse {
                                    id: row.id,
                                    dashboard_id: row.dashboard_id,
                                    share_url: format!("/dashboard/share/{}", row.id),
                                    permission: row.permission,
                                    expires_at: row.expires_at,
            created_at: row.created_at,
                                }
                            }))
        }
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create share link: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard/share/{share_id}",
    tag = "Dashboard",
    operation_id = "get_shared_dashboard",
    responses((status = 200, description = "OK")),
)]
pub async fn get_shared_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(share_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting shared dashboard: {}", share_id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.get_shared_dashboard",
        "bi.analytics_dashboard_shares",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get shared dashboard: {}", e),
            ));
        }
    };

    let share_row = match sqlx::query!(
        r#"
        SELECT s.dashboard_id, s.permission, s.expires_at,
               d.id, d.name, d.description, d.layout, d.owner_id, d.created_at, d.updated_at
        FROM analytics_dashboard_shares s
        JOIN analytics_dashboards d ON s.dashboard_id = d.id
        WHERE s.id = $1
          AND (s.expires_at IS NULL OR s.expires_at > NOW())
          AND d.tenant_id = s.tenant_id
          AND ($2::uuid IS NULL OR s.tenant_id = $2::uuid)
        "#,
        share_id,
        tenant_scope.tenant_id(),
    )
    .fetch_optional(&mut db_scope)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get shared dashboard: {}", e),
            ));
        }
    };

    match share_row {
        Some(row) => Json(serde_json::json!({
            "success": true,
            "message": "Get shared dashboard",
            "data": {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "layout": row.layout,
                "owner_id": row.owner_id,
                "permission": row.permission,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
            }
        })),
        None => Json(topems_shared_core::response::error_value(
            404,
            "Share link not found or expired",
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/dashboard/{id}/shares",
    tag = "Dashboard",
    operation_id = "list_share_links",
    responses((status = 200, description = "OK")),
)]
pub async fn list_share_links(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Listing share links for dashboard: {}", id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.list_share_links",
        "bi.analytics_dashboard_shares",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list share links: {}", e),
            ));
        }
    };

    let rows = match sqlx::query!(
        r#"
        SELECT id, dashboard_id, shared_with, permission, expires_at, created_at
        FROM analytics_dashboard_shares
        WHERE dashboard_id = $1
          AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
        ORDER BY created_at DESC
        "#,
        id,
        tenant_scope.tenant_id(),
    )
    .fetch_all(&mut db_scope)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list share links: {}", e),
            ));
        }
    };

    let items: Vec<ShareLinkResponse> = rows
        .into_iter()
        .map(|row| ShareLinkResponse {
            id: row.id,
            dashboard_id: row.dashboard_id,
            share_url: format!("/dashboard/share/{}", row.id),
            permission: row.permission,
            expires_at: row.expires_at,
            created_at: row.created_at,
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "message": "List share links",
        "data": {
            "items": items,
            "total": items.len(),
        }
    }))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:delete"])),
    path = "/dashboard/share/{share_id}",
    tag = "Dashboard",
    operation_id = "delete_share_link",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_share_link(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(share_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting share link: {}", share_id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.delete_share_link",
        "bi.analytics_dashboard_shares",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to delete share link: {}", e),
            ));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboard_shares SET deleted_at = NOW()
        WHERE id = $1
          AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
        RETURNING id
        "#,
        share_id,
        tenant_scope.tenant_id(),
    )
    .fetch_optional(&mut db_scope)
    .await;

    match result {
        Ok(Some(_)) => {
            if let Err(e) = db_scope.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to delete share link: {}", e),
                ));
            }
            Json(serde_json::json!({
                "success": true,
                "message": "Delete share link"
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            404,
            "Share link not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete share link: {}", e),
        )),
    }
}
