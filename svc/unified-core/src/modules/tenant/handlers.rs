//! Tenant API handlers

use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use super::models::*;
use crate::{AppState, CoreResponse};

/// List all tenants (super admin only)
pub async fn list_tenants(State(state): State<AppState>) -> Json<CoreResponse<Vec<Tenant>>> {
    tracing::info!("[Tenant] Listing all tenants");

    let tenants: Vec<Tenant> =
        sqlx::query_as("SELECT * FROM core_tenants ORDER BY created_at DESC")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    Json(CoreResponse::success(tenants, "Tenants retrieved"))
}

/// Get tenant by ID
pub async fn get_tenant(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Getting tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT * FROM core_tenants WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant retrieved")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Get tenant by code (for subdomain routing)
pub async fn get_tenant_by_code(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Getting tenant by code: {}", code);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT * FROM core_tenants WHERE code = $1")
        .bind(&code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant retrieved")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Create new tenant
pub async fn create_tenant(
    State(state): State<AppState>,
    Json(req): Json<CreateTenantRequest>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Creating tenant: {}", req.name);

    let tenant: Tenant = sqlx::query_as(
        r#"
        INSERT INTO core_tenants (name, code, tenant_type, plan, license_type, license_expires_at, trial_expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.tenant_type)
    .bind(&req.plan)
    .bind(&req.license_type)
    .bind(&req.license_expires_at)
    .bind(&req.trial_expires_at)
    .fetch_one(&state.pool)
    .await
    .unwrap();

    Json(CoreResponse::success(tenant, "Tenant created"))
}

/// Update tenant
pub async fn update_tenant(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTenantRequest>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Updating tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as(
        r#"
        UPDATE core_tenants
        SET 
            name = COALESCE($2, name),
            plan = COALESCE($3, plan),
            status = COALESCE($4, status),
            quota_users = COALESCE($5, quota_users),
            quota_storage_gb = COALESCE($6, quota_storage_gb),
            quota_api_calls = COALESCE($7, quota_api_calls),
            features = COALESCE($8, features),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.plan)
    .bind(&req.status)
    .bind(&req.quota_users)
    .bind(&req.quota_storage_gb)
    .bind(&req.quota_api_calls)
    .bind(&req.features)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant updated")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Activate tenant
pub async fn activate_tenant(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Activating tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as(
        r#"
        UPDATE core_tenants
        SET status = 'active', activated_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant activated")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Suspend tenant
pub async fn suspend_tenant(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Suspending tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as(
        r#"
        UPDATE core_tenants
        SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant suspended")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Get tenant quota and usage
pub async fn get_tenant_quota(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<TenantQuotaResponse>> {
    tracing::info!("[Tenant] Getting quota for tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT * FROM core_tenants WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => {
            // Get current usage
            let usage: TenantUsage = sqlx::query_as(
                r#"
                SELECT COALESCE(users_count, 0) as users_count,
                       COALESCE(storage_used_mb, 0) as storage_used_mb,
                       COALESCE(api_calls_count, 0) as api_calls_count,
                       *
                FROM core_tenant_usage
                WHERE tenant_id = $1 AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
                ORDER BY period_start DESC LIMIT 1
                "#,
            )
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None)
            .unwrap_or(TenantUsage {
                id: Uuid::new_v4(),
                tenant_id: id,
                users_count: 0,
                storage_used_mb: 0,
                api_calls_count: 0,
                period_start: chrono::Utc::now().date_naive(),
                period_end: chrono::Utc::now().date_naive(),
                base_cost_cents: None,
                overage_cost_cents: None,
                plugin_cost_cents: None,
                total_cost_cents: None,
                created_at: chrono::Utc::now(),
            });

            let quota = TenantQuotaResponse {
                tenant_id: id,
                plan: t.plan.clone(),
                quota: QuotaInfo {
                    users: t.quota_users,
                    storage_gb: t.quota_storage_gb.unwrap_or(10),
                    api_calls: t.quota_api_calls.unwrap_or(100000),
                },
                usage: UsageInfo {
                    users: usage.users_count,
                    storage_gb: usage.storage_used_mb as f64 / 1024.0,
                    api_calls: usage.api_calls_count,
                },
                overage: OverageInfo {
                    users: None,
                    storage: None,
                    api_calls: None,
                },
            };

            Json(CoreResponse::success(quota, "Quota retrieved"))
        }
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// List tenant modules
pub async fn list_tenant_modules(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<TenantModule>>> {
    tracing::info!("[Tenant] Listing modules for tenant: {}", tenant_id);

    let modules: Vec<TenantModule> = sqlx::query_as(
        "SELECT * FROM core_tenant_modules WHERE tenant_id = $1 ORDER BY activated_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(modules, "Modules retrieved"))
}

/// Activate module for tenant
pub async fn activate_module(
    State(state): State<AppState>,
    Path((tenant_id, module_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantModule>> {
    tracing::info!(
        "[Tenant] Activating module {} for tenant: {}",
        module_code,
        tenant_id
    );

    let module: TenantModule = sqlx::query_as(
        r#"
        INSERT INTO core_tenant_modules (tenant_id, module_code, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (tenant_id, module_code) 
        DO UPDATE SET is_active = true, activated_at = NOW()
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(&module_code)
    .fetch_one(&state.pool)
    .await
    .unwrap();

    Json(CoreResponse::success(module, "Module activated"))
}

/// Deactivate module for tenant
pub async fn deactivate_module(
    State(state): State<AppState>,
    Path((tenant_id, module_code)): Path<(Uuid, String)>,
) -> Json<CoreResponse<TenantModule>> {
    tracing::info!(
        "[Tenant] Deactivating module {} for tenant: {}",
        module_code,
        tenant_id
    );

    let module: Option<TenantModule> = sqlx::query_as(
        r#"
        UPDATE core_tenant_modules
        SET is_active = false
        WHERE tenant_id = $1 AND module_code = $2
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(&module_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match module {
        Some(m) => Json(CoreResponse::success(m, "Module deactivated")),
        None => Json(CoreResponse::error("Module not found")),
    }
}
