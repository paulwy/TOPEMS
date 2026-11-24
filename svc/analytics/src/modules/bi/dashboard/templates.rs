use axum::{
    extract::{Extension, Path, State},
    Json,
};
use chrono::Utc;
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::TenantScope;
use tracing::info;

use crate::modules::bi::{begin_tenant_txn, tenant_uuid};
use crate::shared::AppState;

use super::models::{
    CreateDashboardRequest, CreateDashboardTemplateRequest, DashboardResponse,
    DashboardTemplateListResponse, DashboardTemplateResponse, UpdateDashboardTemplateRequest,
};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn list_dashboard_templates(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
) -> Json<serde_json::Value> {
    info!("Listing dashboard templates");

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.list_templates",
        "bi.analytics_dashboard_templates",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list templates: {}", e),
            ));
        }
    };

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        FROM bi.analytics_dashboard_templates
        WHERE is_active = true
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&mut db_scope)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to list templates: {}", e)));
        }
    };

    let items: Vec<DashboardTemplateResponse> = rows
        .into_iter()
        .map(|row| DashboardTemplateResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout.unwrap_or(serde_json::json!({})),
            preview_image: row.preview_image,
            category: row.category,
            tags: row.tags,
            is_active: row.is_active.unwrap_or(true),
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List dashboard templates",
        "data": DashboardTemplateListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template",
    tag = "BI",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_dashboard_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDashboardTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard template: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now();

    let mut tx = match begin_tenant_txn(&state.pool, &claims).await {
        Ok(tx) => tx,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to open tenant txn: {}", e),
            ));
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO bi.analytics_dashboard_templates (id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.layout,
        req.preview_image,
        req.category,
        req.tags.as_deref(),
        true,
now,
now,
        tenant_uuid(&claims),
    )
    .fetch_one(&mut *tx)
    .await;

    match result {
        Ok(row) => {
            if let Err(e) = tx.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to commit dashboard template: {}", e),
                ));
            }
            Json(serde_json::json!({
                                "success": true,
                                "message": "Create dashboard template",
                                "data": DashboardTemplateResponse {
                                    id: row.id,
                                    name: row.name,
                                    description: row.description,
                                    layout: row.layout.unwrap_or(serde_json::json!({})),
                                    preview_image: row.preview_image,
                                    category: row.category,
                                    tags: row.tags,
                                    is_active: row.is_active.unwrap_or(true),
            created_at: row.created_at,
            updated_at: row.updated_at,
                                }
                            }))
        }
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create template: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_dashboard_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting dashboard template: {}", id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.get_template",
        "bi.analytics_dashboard_templates",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get template: {}", e),
            ));
        }
    };

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        FROM bi.analytics_dashboard_templates
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&mut db_scope)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to get template: {}", e)));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
                            "success": true,
                            "message": "Get dashboard template",
                            "data": DashboardTemplateResponse {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                layout: row.layout.unwrap_or(serde_json::json!({})),
                                preview_image: row.preview_image,
                                category: row.category,
                                tags: row.tags,
                                is_active: row.is_active.unwrap_or(true),
        created_at: row.created_at,
        updated_at: row.updated_at,
                            }
                        })),
        None => Json(topems_shared_core::response::error_value(
            404,
            "Template not found",
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{id}",
    tag = "BI",
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_dashboard_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDashboardTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Updating dashboard template: {}", id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.update_template",
        "bi.analytics_dashboard_templates",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to update template: {}", e),
            ));
        }
    };

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE bi.analytics_dashboard_templates
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            layout = COALESCE($3, layout),
            preview_image = COALESCE($4, preview_image),
            category = COALESCE($5, category),
            tags = COALESCE($6, tags),
            is_active = COALESCE($7, is_active),
            updated_at = $8
        WHERE id = $9
          AND ($10::uuid IS NULL OR tenant_id = $10::uuid)
        RETURNING id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.layout,
        req.preview_image,
        req.category,
        req.tags.as_deref(),
        req.is_active,
now,
        id,
        tenant_scope.tenant_id(),
    )
    .fetch_optional(&mut db_scope)
    .await;

    match result {
        Ok(Some(row)) => {
            if let Err(e) = db_scope.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to update template: {}", e),
                ));
            }
            Json(serde_json::json!({
                                "success": true,
                                "message": "Update dashboard template",
                                "data": DashboardTemplateResponse {
                                    id: row.id,
                                    name: row.name,
                                    description: row.description,
                                    layout: row.layout.unwrap_or(serde_json::json!({})),
                                    preview_image: row.preview_image,
                                    category: row.category,
                                    tags: row.tags,
                                    is_active: row.is_active.unwrap_or(true),
            created_at: row.created_at,
            updated_at: row.updated_at,
                                }
                            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            404,
            "Template not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update template: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{id}",
    tag = "BI",
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_dashboard_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting dashboard template: {}", id);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.dashboard.delete_template",
        "bi.analytics_dashboard_templates",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to delete template: {}", e),
            ));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE bi.analytics_dashboard_templates
        SET is_active = false, updated_at = $1
        WHERE id = $2
          AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        RETURNING id
        "#,
        Utc::now(),
        id,
        tenant_scope.tenant_id(),
    )
    .fetch_optional(&mut db_scope)
    .await;

    match result {
        Ok(Some(_)) => {
            if let Err(e) = db_scope.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to delete template: {}", e),
                ));
            }
            Json(serde_json::json!({
                "success": true,
                "message": "Delete dashboard template"
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            404,
            "Template not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete template: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{template_id}/create",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn create_dashboard_from_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<CreateDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard from template: {}", template_id);

    let mut tx = match begin_tenant_txn(&state.pool, &claims).await {
        Ok(tx) => tx,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to open tenant txn: {}", e),
            ));
        }
    };

    let row = match sqlx::query!(
        r#"
        SELECT name, description, layout
        FROM bi.analytics_dashboard_templates
        WHERE id = $1 AND is_active = true
        "#,
        template_id,
    )
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get template: {}", e),
            ));
        }
    };

    match row {
        Some(row) => {
            let id = Uuid::new_v4();
            let now = Utc::now();

            let result = sqlx::query!(
                r#"
                INSERT INTO bi.analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
                "#,
                id,
                req.name,
                req.description.or(row.description),
                row.layout,
                req.owner_id,
                req.is_public.unwrap_or(false),
now,
now,
                tenant_uuid(&claims),
            )
            .fetch_one(&mut *tx)
            .await;

            match result {
                Ok(new_row) => {
                    if let Err(e) = tx.commit().await {
                        return Json(topems_shared_core::response::error_value(
                            500,
                            &format!("Failed to commit dashboard: {}", e),
                        ));
                    }
                    Json(serde_json::json!({
                                                        "success": true,
                                                        "message": "Create dashboard from template",
                                                        "data": DashboardResponse {
                                                            id: new_row.id,
                                                            name: new_row.name,
                                                            description: new_row.description,
                                                            layout: new_row.layout,
                                                            owner_id: new_row.owner_id,
                                                            is_public: new_row.is_public.unwrap_or(false),
                    created_at: new_row.created_at.unwrap_or_else(Utc::now),
                    updated_at: new_row.updated_at.unwrap_or_else(Utc::now),
                                                        }
                                                    }))
                }
                Err(e) => Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to create dashboard: {}", e),
                )),
            }
        }
        None => Json(topems_shared_core::response::error_value(
            404,
            "Template not found or inactive",
        )),
    }
}
