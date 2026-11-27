use axum::{
    extract::{Extension, Path, State},
    Json,
};
use chrono::Utc;
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use tracing::info;

use crate::modules::bi::{begin_tenant_txn, tenant_uuid};
use crate::shared::AppState;

use super::models::{
    CreateDashboardRequest, DashboardListResponse, DashboardResponse, ImportDashboardRequest,
    UpdateDashboardRequest,
};
use super::IntoDateTime;

// 软删除行不应出现在列表中（deleted_at 由 delete_dashboard 写入）
async fn load_deleted_dashboard_ids(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>) -> Vec<Uuid> {
    sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM bi.analytics_dashboards WHERE deleted_at IS NOT NULL",
    )
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard",
    tag = "Dashboard",
    responses(
        (status = 200, description = "List of dashboards", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn list_dashboards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    info!("Listing dashboards");

    let mut tx = match begin_tenant_txn(&state.pool, &claims).await {
        Ok(tx) => tx,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to open tenant txn: {}", e),
            ));
        }
    };

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM bi.analytics_dashboards
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&mut *tx)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list dashboards: {}", e),
            ));
        }
    };

    let deleted_ids = load_deleted_dashboard_ids(&mut tx).await;
    let items: Vec<DashboardResponse> = rows
        .into_iter()
        .filter(|row| !deleted_ids.contains(&row.id))
        .map(|row| DashboardResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.into_datetime(),
            updated_at: row.updated_at.into_datetime(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List dashboards",
        "data": DashboardListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard",
    tag = "Dashboard",
    request_body(
        content = CreateDashboardRequest,
        content_type = "application/json",
        description = "创建仪表盘请求"
    ),
    responses(
        (status = 200, description = "OK"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard: {}", req.name);

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
        INSERT INTO bi.analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        id,
        req.name,
        req.description,
        req.layout,
        req.owner_id,
        req.is_public.unwrap_or(false),
now,
now,
        tenant_uuid(&claims),
    )
    .execute(&mut *tx)
    .await;

    match result {
        Ok(_) => {
            if let Err(e) = tx.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to commit dashboard: {}", e),
                ));
            }
            Json(serde_json::json!({
                "success": true,
                "message": "Create dashboard",
                "data": DashboardResponse {
                    id,
                    name: req.name,
                    description: req.description,
                    layout: req.layout,
                    owner_id: req.owner_id,
                    is_public: req.is_public.unwrap_or(false),
                    created_at: now,
                    updated_at: now,
                }
            }))
        }
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create dashboard: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard/{id}",
    tag = "Dashboard",
    params(
        ("id" = uuid::Uuid, Path, description = "Dashboard ID")
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn get_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting dashboard: {}", id);

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
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM bi.analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get dashboard: {}", e),
            ));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
                            "success": true,
                            "message": "Get dashboard",
                            "data": DashboardResponse {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                layout: row.layout,
                                owner_id: row.owner_id,
                                is_public: row.is_public.unwrap_or(false),
        created_at: row.created_at.into_datetime(),
        updated_at: row.updated_at.into_datetime(),
                            }
                        })),
        None => Json(topems_shared_core::response::error_value(
            404,
            "Dashboard not found",
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard/{id}",
    tag = "Dashboard",
    params(
        ("id" = uuid::Uuid, Path, description = "Dashboard ID")
    ),
    request_body(
        content = UpdateDashboardRequest,
        content_type = "application/json",
        description = "更新仪表盘请求"
    ),
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Updating dashboard: {}", id);

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
        UPDATE bi.analytics_dashboards
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            layout = COALESCE($3, layout),
            is_public = COALESCE($4, is_public),
            updated_at = $5
        WHERE id = $6
        RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.layout,
        req.is_public,
        now,
        id,
    )
    .fetch_optional(&mut *tx)
    .await;

    match result {
        Ok(Some(row)) => {
            if let Err(e) = tx.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to commit dashboard update: {}", e),
                ));
            }
            Json(serde_json::json!({
                                "success": true,
                                "message": "Update dashboard",
                                "data": DashboardResponse {
                                    id: row.id,
                                    name: row.name,
                                    description: row.description,
                                    layout: row.layout,
                                    owner_id: row.owner_id,
                                    is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.into_datetime(),
            updated_at: row.updated_at.into_datetime(),
                                }
                            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            404,
            "Dashboard not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update dashboard: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard/{id}",
    tag = "Dashboard",
    params(
        ("id" = uuid::Uuid, Path, description = "Dashboard ID")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]

pub async fn delete_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting dashboard: {}", id);

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
        UPDATE bi.analytics_dashboards SET deleted_at = NOW()
        WHERE id = $1
        RETURNING id
        "#,
        id,
    )
    .fetch_optional(&mut *tx)
    .await;

    match result {
        Ok(Some(_)) => {
            if let Err(e) = tx.commit().await {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to commit dashboard delete: {}", e),
                ));
            }
            Json(serde_json::json!({
                "success": true,
                "message": "Delete dashboard"
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            404,
            "Dashboard not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete dashboard: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/public",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_public_dashboards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    info!("Listing public dashboards");

    let mut tx = match begin_tenant_txn(&state.pool, &claims).await {
        Ok(tx) => tx,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to open tenant txn: {}", e),
            ));
        }
    };

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM bi.analytics_dashboards
        WHERE is_public = true
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&mut *tx)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list public dashboards: {}", e),
            ));
        }
    };

    let deleted_ids = load_deleted_dashboard_ids(&mut tx).await;
    let items: Vec<DashboardResponse> = rows
        .into_iter()
        .filter(|row| !deleted_ids.contains(&row.id))
        .map(|row| DashboardResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.into_datetime(),
            updated_at: row.updated_at.into_datetime(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List public dashboards",
        "data": DashboardListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/user/{owner_id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_user_dashboards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(owner_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Listing dashboards for user: {}", owner_id);

    let mut tx = match begin_tenant_txn(&state.pool, &claims).await {
        Ok(tx) => tx,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to open tenant txn: {}", e),
            ));
        }
    };

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM bi.analytics_dashboards
        WHERE owner_id = $1
        ORDER BY created_at DESC
        "#,
        owner_id,
    )
    .fetch_all(&mut *tx)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list user dashboards: {}", e),
            ));
        }
    };

    let deleted_ids = load_deleted_dashboard_ids(&mut tx).await;
    let items: Vec<DashboardResponse> = rows
        .into_iter()
        .filter(|row| !deleted_ids.contains(&row.id))
        .map(|row| DashboardResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.into_datetime(),
            updated_at: row.updated_at.into_datetime(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List user dashboards",
        "data": DashboardListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/{id}/clone",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn clone_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Cloning dashboard: {}", id);

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
        SELECT name, description, layout, owner_id, is_public
        FROM bi.analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get dashboard: {}", e),
            ));
        }
    };

    match row {
        Some(row) => {
            let new_id = Uuid::new_v4();
            let now = Utc::now();
            let new_name = format!("{} (副本)", row.name);

            let result = sqlx::query!(
                r#"
                INSERT INTO bi.analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
                "#,
                new_id,
                new_name,
                row.description,
                row.layout,
                row.owner_id,
                false,
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
                            &format!("Failed to commit dashboard clone: {}", e),
                        ));
                    }
                    Json(serde_json::json!({
                                                        "success": true,
                                                        "message": "Clone dashboard",
                                                        "data": DashboardResponse {
                                                            id: new_row.id,
                                                            name: new_row.name,
                                                            description: new_row.description,
                                                            layout: new_row.layout,
                                                            owner_id: new_row.owner_id,
                                                            is_public: new_row.is_public.unwrap_or(false),
                    created_at: new_row.created_at.into_datetime(),
                    updated_at: new_row.updated_at.into_datetime(),
                                                        }
                                                    }))
                }
                Err(e) => Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to clone dashboard: {}", e),
                )),
            }
        }
        None => Json(topems_shared_core::response::error_value(
            404,
            "Dashboard not found",
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/dashboard/import",
    tag = "Dashboard",
    operation_id = "import_dashboard",
    responses((status = 200, description = "OK")),
)]
pub async fn import_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ImportDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Importing dashboard: {}", req.name);

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
        INSERT INTO bi.analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.layout,
        req.owner_id,
        req.is_public.unwrap_or(false),
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
                    &format!("Failed to commit dashboard import: {}", e),
                ));
            }
            Json(serde_json::json!({
                                "success": true,
                                "message": "Import dashboard",
                                "data": DashboardResponse {
                                    id: row.id,
                                    name: row.name,
                                    description: row.description,
                                    layout: row.layout,
                                    owner_id: row.owner_id,
                                    is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.into_datetime(),
            updated_at: row.updated_at.into_datetime(),
                                }
                            }))
        }
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to import dashboard: {}", e),
        )),
    }
}
