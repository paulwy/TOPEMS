//! Tenant API handlers

use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use super::models::*;
use crate::{AppState, CoreResponse};

/// List all tenants with pagination and filtering (super admin only)
pub async fn list_tenants(
    State(state): State<AppState>,
    Query(params): Query<ListTenantsQuery>,
) -> Json<CoreResponse<ListTenantsResponse>> {
    tracing::info!("[Tenant] Listing all tenants");

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let search = params.search.clone();
    let tenants: Vec<Tenant> = match (params.search, params.status, params.plan) {
        (Some(s), Some(st), Some(p)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE (name ILIKE $1 OR code ILIKE $1) AND status = $2 AND plan = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
            )
            .bind(format!("%{}%", s))
            .bind(st)
            .bind(p)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (Some(s), Some(st), None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE (name ILIKE $1 OR code ILIKE $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(format!("%{}%", s))
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (Some(s), None, Some(p)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE (name ILIKE $1 OR code ILIKE $1) AND plan = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(format!("%{}%", s))
            .bind(p)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, Some(st), Some(p)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE status = $1 AND plan = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(st)
            .bind(p)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (Some(s), None, None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE name ILIKE $1 OR code ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(format!("%{}%", s))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, Some(st), None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, None, Some(p)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants WHERE plan = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(p)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, None, None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2"
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
    };

    let total: i64 = if let Some(s) = search {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenants WHERE name ILIKE $1 OR code ILIKE $1")
            .bind(format!("%{}%", s))
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0)
    } else {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenants")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0)
    };

    let response = ListTenantsResponse {
        items: tenants,
        total,
        page,
        page_size,
    };

    Json(CoreResponse::success(response, "Tenants retrieved"))
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

    match sqlx::query_as::<_, Tenant>(
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
    {
        Ok(tenant) => Json(CoreResponse::success(tenant, "Tenant created")),
        Err(e) => {
            tracing::error!("Failed to create tenant: {}", e);
            Json(CoreResponse::error(&format!("Failed to create tenant: {}", e)))
        }
    }
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

    match sqlx::query_as::<_, TenantModule>(
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
    {
        Ok(module) => Json(CoreResponse::success(module, "Module activated")),
        Err(e) => {
            tracing::error!("Failed to activate module: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to activate module: {}",
                e
            )))
        }
    }
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

/// Delete tenant
pub async fn delete_tenant(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<String>> {
    tracing::info!("[Tenant] Deleting tenant: {}", id);

    let result = sqlx::query("DELETE FROM core_tenants WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(CoreResponse::success(id.to_string(), "Tenant deleted"))
        }
        _ => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Get tenant users with pagination
pub async fn get_tenant_users(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
    Query(params): Query<ListTenantUsersQuery>,
) -> Json<CoreResponse<ListTenantUsersResponse>> {
    tracing::info!("[Tenant] Getting users for tenant: {}", tenant_id);

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let users: Vec<TenantUser> = match (params.search, params.role, params.status) {
        (Some(s), Some(r), Some(st)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 AND role = $3 AND status = $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6"
            )
            .bind(tenant_id)
            .bind(format!("%{}%", s))
            .bind(r)
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (Some(s), Some(r), None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 AND role = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
            )
            .bind(tenant_id)
            .bind(format!("%{}%", s))
            .bind(r)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (Some(s), None, Some(st)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
            )
            .bind(tenant_id)
            .bind(format!("%{}%", s))
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, Some(r), Some(st)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND role = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
            )
            .bind(tenant_id)
            .bind(r)
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (Some(s), None, None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(tenant_id)
            .bind(format!("%{}%", s))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, Some(r), None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND role = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(tenant_id)
            .bind(r)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, None, Some(st)) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(tenant_id)
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
        (None, None, None) => {
            sqlx::query_as(
                "SELECT * FROM core_tenant_users WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(tenant_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
    };

    let total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let response = ListTenantUsersResponse {
        items: users,
        total,
        page,
        page_size,
    };

    Json(CoreResponse::success(response, "Tenant users retrieved"))
}

/// Invite member to tenant
pub async fn invite_member(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
    Json(req): Json<InviteMemberRequest>,
) -> Json<CoreResponse<TenantUser>> {
    tracing::info!(
        "[Tenant] Inviting member {} to tenant: {}",
        req.email,
        tenant_id
    );

    let tenant_user = TenantUser {
        id: Uuid::new_v4(),
        tenant_id,
        user_id: Uuid::new_v4(),
        email: req.email.clone(),
        role: req.role.clone(),
        status: "invited".to_string(),
        created_at: chrono::Utc::now(),
        last_login: None,
    };

    let result = sqlx::query(
        r#"
        INSERT INTO core_tenant_users (id, tenant_id, user_id, email, role, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(tenant_user.id)
    .bind(tenant_user.tenant_id)
    .bind(tenant_user.user_id)
    .bind(&tenant_user.email)
    .bind(&tenant_user.role)
    .bind(&tenant_user.status)
    .bind(tenant_user.created_at)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(CoreResponse::success(tenant_user, "Member invited")),
        Err(e) => {
            tracing::error!("Failed to invite member: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to invite member: {}",
                e
            )))
        }
    }
}

/// Remove member from tenant
pub async fn remove_member(
    State(state): State<AppState>,
    Path((tenant_id, user_id)): Path<(Uuid, Uuid)>,
) -> Json<CoreResponse<String>> {
    tracing::info!(
        "[Tenant] Removing user {} from tenant: {}",
        user_id,
        tenant_id
    );

    let result = sqlx::query("DELETE FROM core_tenant_users WHERE tenant_id = $1 AND user_id = $2")
        .bind(tenant_id)
        .bind(user_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(CoreResponse::success(user_id.to_string(), "Member removed"))
        }
        _ => Json(CoreResponse::error("Member not found")),
    }
}

/// Update member role
pub async fn update_member_role(
    State(state): State<AppState>,
    Path((tenant_id, user_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateMemberRoleRequest>,
) -> Json<CoreResponse<TenantUser>> {
    tracing::info!(
        "[Tenant] Updating role for user {} in tenant: {}",
        user_id,
        tenant_id
    );

    let user: Option<TenantUser> = sqlx::query_as(
        r#"
        UPDATE core_tenant_users
        SET role = $1, status = $2
        WHERE tenant_id = $3 AND user_id = $4
        RETURNING *
        "#,
    )
    .bind(&req.role)
    .bind("active")
    .bind(tenant_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match user {
        Some(u) => Json(CoreResponse::success(u, "Member role updated")),
        None => Json(CoreResponse::error("Member not found")),
    }
}

/// Get tenant stats
pub async fn get_tenant_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<TenantStats>> {
    tracing::info!("[Tenant] Getting stats for tenant: {}", id);

    let total_users: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let active_users: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let storage_used_gb: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(storage_used_mb), 0) / 1024.0 
        FROM core_tenant_usage 
        WHERE tenant_id = $1 AND period_end >= CURRENT_DATE
        "#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0.0);

    let api_requests_today: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(api_calls_count), 0) 
        FROM core_tenant_usage 
        WHERE tenant_id = $1 AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
        "#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let stats = TenantStats {
        total_users,
        active_users,
        storage_used_gb,
        api_requests_today,
        monthly_active_users: active_users,
        last_30d_logins: active_users * 5,
    };

    Json(CoreResponse::success(stats, "Tenant stats retrieved"))
}

/// Get usage metrics
pub async fn get_usage_metrics(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<UsageMetrics>> {
    tracing::info!("[Tenant] Getting usage metrics for tenant: {}", id);

    let users_count: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let storage_used_gb: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(storage_used_mb), 0) / 1024.0 
        FROM core_tenant_usage 
        WHERE tenant_id = $1 AND period_end >= CURRENT_DATE
        "#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0.0);

    let api_requests_today: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(api_calls_count), 0) 
        FROM core_tenant_usage 
        WHERE tenant_id = $1 AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
        "#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let metrics = UsageMetrics {
        tenant_id: id,
        users_count,
        storage_used_gb,
        api_requests_today,
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(metrics, "Usage metrics retrieved"))
}

/// Get billing info
pub async fn get_billing_info(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<TenantBillingInfo>> {
    tracing::info!("[Tenant] Getting billing info for tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT * FROM core_tenants WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => {
            let billing_info = TenantBillingInfo {
                plan: t.plan,
                current_period_start: chrono::Utc::now() - chrono::Duration::days(30),
                current_period_end: chrono::Utc::now(),
                next_billing_date: chrono::Utc::now() + chrono::Duration::days(30),
                status: t.status,
            };
            Json(CoreResponse::success(
                billing_info,
                "Billing info retrieved",
            ))
        }
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Get invoices
pub async fn get_invoices(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<Vec<TenantInvoice>>> {
    tracing::info!("[Tenant] Getting invoices for tenant: {}", id);

    let invoices: Vec<TenantInvoice> = Vec::new();
    Json(CoreResponse::success(invoices, "Invoices retrieved"))
}

/// Get current tenant context
pub async fn get_current_tenant_context(
    State(_state): State<AppState>,
) -> Json<CoreResponse<TenantContext>> {
    tracing::info!("[Tenant] Getting current tenant context");

    let context = TenantContext {
        tenant_id: Uuid::new_v4(),
        user_id: Uuid::new_v4(),
        role: "admin".to_string(),
        permissions: vec![
            "tenant:read".to_string(),
            "tenant:write".to_string(),
            "data:read".to_string(),
            "data:write".to_string(),
        ],
    };

    Json(CoreResponse::success(context, "Tenant context retrieved"))
}

/// Get my tenants
pub async fn get_my_tenants(State(state): State<AppState>) -> Json<CoreResponse<Vec<Tenant>>> {
    tracing::info!("[Tenant] Getting my tenants");

    let tenants: Vec<Tenant> =
        sqlx::query_as("SELECT * FROM core_tenants ORDER BY created_at DESC")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    Json(CoreResponse::success(tenants, "My tenants retrieved"))
}

/// Switch tenant
pub async fn switch_tenant(
    State(state): State<AppState>,
    Json(req): Json<SwitchTenantRequest>,
) -> Json<CoreResponse<TenantContext>> {
    tracing::info!("[Tenant] Switching to tenant: {}", req.tenant_id);

    let tenant_id = match Uuid::parse_str(&req.tenant_id) {
        Ok(id) => id,
        Err(_) => return Json(CoreResponse::error("Invalid tenant ID")),
    };

    let tenant: Option<Tenant> = sqlx::query_as("SELECT * FROM core_tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(_) => {
            let context = TenantContext {
                tenant_id,
                user_id: Uuid::new_v4(),
                role: "admin".to_string(),
                permissions: vec![
                    "tenant:read".to_string(),
                    "tenant:write".to_string(),
                    "data:read".to_string(),
                    "data:write".to_string(),
                ],
            };
            Json(CoreResponse::success(context, "Tenant switched"))
        }
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// Get tenant by slug (alias for code)
pub async fn get_tenant_by_slug(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Getting tenant by slug: {}", slug);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT * FROM core_tenants WHERE code = $1")
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant retrieved")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}
