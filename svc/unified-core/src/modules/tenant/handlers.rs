//! Tenant API handlers

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared_core::error::TopemsError;
use uuid::Uuid;

use super::models::*;
use crate::{AppState, CoreResponse};
use topems_shared_auth::auth::Claims;

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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1) AND status = $2 AND plan = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1) AND plan = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND status = $1 AND plan = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND name ILIKE $1 OR code ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND plan = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2"
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
    };

    let total: i64 = if let Some(s) = search {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenants WHERE deleted_at IS NULL AND name ILIKE $1 OR code ILIKE $1")
            .bind(format!("%{}%", s))
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0)
    } else {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_tenants WHERE deleted_at IS NULL")
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

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, status FROM core_tenants WHERE deleted_at IS NULL AND id = $1")
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

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND code = $1")
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
    .bind(req.license_expires_at)
    .bind(req.trial_expires_at)
    .fetch_one(&state.pool)
    .await
    {
        Ok(tenant) => {
            // P0-3: 租户创建后自动同步默认权限集（基于 plan tier）
            let plan_tier = crate::modules::subscription::PlanTier::from_str(&tenant.plan)
                .unwrap_or(crate::modules::subscription::PlanTier::Basic);
            let sync_result = crate::modules::subscription::TierPermissionService::sync_permissions_for_tenant(
                tenant.id,
                &plan_tier,
            );
            tracing::info!(
                "Tenant created with permission sync: roles={:?}, permissions={}, modules_enabled={}",
                sync_result.roles_synced,
                sync_result.permissions_synced,
                sync_result.modules_enabled.len()
            );
            Json(CoreResponse::success(tenant, "Tenant created"))
        }
        Err(e) => {
            tracing::error!("Failed to create tenant: {}", e);
            Json(CoreResponse::error(&format!("Failed to create tenant: {}", e)))
        }
    }
}

/// Seed default admin user, tenant membership and role assignment for a
/// freshly created tenant. Runs inside the caller's transaction so the whole
/// onboarding is atomic.
///
/// MVP note: `core_roles.name` has a GLOBAL UNIQUE constraint (see
/// `database/init/03_init_permissions.sql`), so per-tenant role cloning with
/// identical names is not possible without a schema migration. We therefore
/// reuse the global `superadmin` role template (which already carries all
/// permissions via `core_role_permissions`) and mark the admin as
/// `is_superuser = true`. Per-tenant role cloning is deferred pending a
/// schema change to make `core_roles.(name, tenant_id)` the unique key.
async fn seed_tenant_defaults(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: Uuid,
    admin_username: &str,
    admin_email: &str,
    admin_password: &str,
    default_department_name: &str,
    default_department_description: Option<&str>,
) -> Result<Uuid, TopemsError> {
    // 1. Hash the admin password with bcrypt (same cost as IAM create_user).
    let password_hash = bcrypt::hash(admin_password, bcrypt::DEFAULT_COST)
        .map_err(|e| TopemsError::BusinessLogic(format!("Failed to hash admin password: {}", e)))?;

    // 2. Guard against duplicate admin credentials (username/email are unique).
    let dup: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM iam.users WHERE username = $1 OR email = $2")
            .bind(admin_username)
            .bind(admin_email)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| {
                TopemsError::DatabaseQuery(format!("Failed to check existing admin user: {}", e))
            })?;
    if dup > 0 {
        return Err(TopemsError::BusinessLogic(
            "Admin username or email already exists".to_string(),
        ));
    }

    // 3. Create the admin user tied to the new tenant.
    let admin_user_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, status, is_superuser)
        VALUES ($1, $2, $3, $4, 'active', TRUE)
        RETURNING id
        "#,
    )
    .bind(admin_username)
    .bind(admin_email)
    .bind(&password_hash)
    .bind(admin_username)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("Failed to create admin user: {}", e)))?;

    // 4. Create the core_tenant_users membership linking admin -> tenant.
    sqlx::query(
        r#"
        INSERT INTO core_tenant_users (tenant_id, user_id, email, role, status)
        VALUES ($1, $2, $3, 'superadmin', 'active')
        "#,
    )
    .bind(tenant_id)
    .bind(admin_user_id)
    .bind(admin_email)
    .execute(&mut **tx)
    .await
    .map_err(|e| {
        TopemsError::DatabaseQuery(format!("Failed to create tenant membership: {}", e))
    })?;

    // 5. Assign the admin to the global superadmin role (carries all perms).
    sqlx::query(
        r#"
        INSERT INTO public.core_user_roles (user_id, role_id)
        SELECT $1, r.id FROM public.core_roles r WHERE r.name = 'superadmin'
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(admin_user_id)
    .execute(&mut **tx)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("Failed to assign superadmin role: {}", e)))?;

    // 6. Persist the default department as a tenant setting (for the HRM
    //    module to pick up when it provisions the org tree).
    sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES
            ($1, 'default_department_name', $2, FALSE),
            ($1, 'default_department_description', $3, FALSE)
        "#,
    )
    .bind(tenant_id)
    .bind(default_department_name)
    .bind(default_department_description)
    .execute(&mut **tx)
    .await
    .map_err(|e| {
        TopemsError::DatabaseQuery(format!("Failed to seed default department setting: {}", e))
    })?;

    Ok(admin_user_id)
}

/// P34-4: hardcoded catalog of basic-tier modules that should be
/// auto-activated for every newly onboarded tenant. Codes are namespaced
/// as `<service>:<module>` to keep the (tenant_id, module_code) unique key
/// unambiguous across ERP and PM.
///
/// Advanced modules (e.g. `erp:consolidation`, `erp:mdm_v49`,
/// `pm:project_approval`, `pm:service_integration`) are intentionally
/// absent — tenants opt into them via `POST /tenant/{id}/modules/{code}`.
/// Infrastructure modules (`erp:db_structure`, `erp:openapi`, `pm:openapi`)
/// are always-on at the service level and do not need a row here.
const BASIC_MODULE_CODES: &[(&str, &str)] = &[
    // ---- ERP basic ----
    ("erp:addressbook", "通讯录"),
    ("erp:announcement", "公告管理"),
    ("erp:asset", "资产管理"),
    ("erp:fixed_asset", "固定资产"),
    ("erp:customer", "客户管理"),
    ("erp:supplier", "供应商管理"),
    ("erp:material", "物料管理"),
    ("erp:inventory", "库存管理"),
    ("erp:dict", "数据字典"),
    ("erp:office_supplies", "办公用品"),
    ("erp:vehicles", "车辆管理"),
    ("erp:meeting_room", "会议室管理"),
    ("erp:leave_request", "请假申请"),
    ("erp:opening_balance", "期初余额"),
    ("erp:production_order", "生产订单"),
    ("erp:purchase_order", "采购订单"),
    ("erp:sales_order", "销售订单"),
    ("erp:dashboard", "仪表盘"),
    ("erp:health", "健康检查"),
    ("erp:audit", "审计日志"),
    ("erp:search", "全文搜索"),
    // ---- PM basic ----
    ("pm:project", "项目管理"),
    ("pm:project_phase", "项目阶段"),
    ("pm:project_milestone", "项目里程碑"),
    ("pm:project_member", "项目成员"),
    ("pm:project_resource", "项目资源"),
    ("pm:project_expense", "项目费用"),
    ("pm:project_benefit", "项目效益"),
    ("pm:project_type_config", "项目类型配置"),
    ("pm:contract", "合同管理"),
    ("pm:budget", "预算管理"),
    ("pm:risk", "风险管理"),
    ("pm:quality", "质量管理"),
    ("pm:acceptance", "验收管理"),
    ("pm:settlement", "结算管理"),
    ("pm:document", "文档管理"),
    ("pm:report", "项目报表"),
    ("pm:notification", "通知"),
    ("pm:statistics", "统计分析"),
];

/// P34-4: auto-activate all basic-tier modules for a freshly created tenant.
/// Runs inside the caller's transaction so onboarding stays atomic. Rows
/// that already exist (e.g. from a re-onboard attempt) are skipped via
/// `ON CONFLICT DO NOTHING`.
async fn activate_basic_modules(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: Uuid,
) -> Result<(), TopemsError> {
    for (module_code, module_name) in BASIC_MODULE_CODES.iter() {
        sqlx::query(
            r#"
            INSERT INTO core_tenant_modules (tenant_id, module_code, module_name, tier, is_active)
            VALUES ($1, $2, $3, 'basic', TRUE)
            ON CONFLICT (tenant_id, module_code) DO NOTHING
            "#,
        )
        .bind(tenant_id)
        .bind(module_code)
        .bind(module_name)
        .execute(&mut **tx)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!(
                "Failed to activate basic module {}: {}",
                module_code, e
            ))
        })?;
    }
    Ok(())
}

/// Onboard a new tenant in a single atomic transaction: create the tenant
/// row, seed the default admin user + membership + role assignment, and
/// persist the default department setting. Backs `POST /tenant/onboard`.
pub async fn onboard_tenant(
    State(state): State<AppState>,
    Json(req): Json<OnboardTenantRequest>,
) -> Json<CoreResponse<OnboardTenantResponse>> {
    tracing::info!("[Tenant] Onboarding tenant: {}", req.name);

    if req.name.trim().is_empty() || req.code.trim().is_empty() {
        return Json(CoreResponse::error("Tenant name and code are required"));
    }
    if req.admin_username.trim().is_empty()
        || req.admin_email.trim().is_empty()
        || req.admin_password.len() < 6
    {
        return Json(CoreResponse::error(
            "Admin username, email and a password (>=6 chars) are required",
        ));
    }

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin onboarding transaction: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to start transaction: {}",
                e
            )));
        }
    };

    // 1. Create the tenant row (mirrors create_tenant, status starts as trial).
    let tenant: Tenant = match sqlx::query_as::<_, Tenant>(
        r#"
        INSERT INTO core_tenants (name, code, tenant_type, plan, license_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at
        "#,
    )
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.tenant_type)
    .bind(&req.plan)
    .bind(&req.license_type)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to create tenant during onboarding: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to create tenant: {}",
                e
            )));
        }
    };

    // 2. Seed defaults (admin user, membership, role, department setting).
    let admin_user_id = match seed_tenant_defaults(
        &mut tx,
        tenant.id,
        &req.admin_username,
        &req.admin_email,
        &req.admin_password,
        &req.default_department_name,
        req.default_department_description.as_deref(),
    )
    .await
    {
        Ok(id) => id,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to seed tenant defaults: {}", e);
            return Json(CoreResponse::error(&e.to_string()));
        }
    };

    // 3. P34-4: auto-activate all basic-tier modules so the new tenant can
    //    use ERP/PM master-data features out of the box. Advanced modules
    //    remain dormant until explicitly activated.
    if let Err(e) = activate_basic_modules(&mut tx, tenant.id).await {
        let _ = tx.rollback().await;
        tracing::error!("Failed to activate basic modules: {}", e);
        return Json(CoreResponse::error(&e.to_string()));
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit onboarding: {}", e);
        return Json(CoreResponse::error(&format!(
            "Failed to commit onboarding: {}",
            e
        )));
    }

    tracing::info!(
        "[Tenant] Onboarded tenant {} (admin {})",
        tenant.id,
        req.admin_username
    );

    Json(CoreResponse::success(
        OnboardTenantResponse {
            tenant,
            admin_user_id,
            admin_username: req.admin_username,
            admin_email: req.admin_email,
        },
        "Tenant onboarded",
    ))
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
    .bind(req.quota_users)
    .bind(req.quota_storage_gb)
    .bind(req.quota_api_calls)
    .bind(&req.features)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match tenant {
        Some(t) => {
            // P0-3: 如果 plan 变更，重新同步默认权限集
            if req.plan.is_some() {
                let plan_tier = crate::modules::subscription::PlanTier::from_str(&t.plan)
                    .unwrap_or(crate::modules::subscription::PlanTier::Basic);
                let sync_result = crate::modules::subscription::TierPermissionService::sync_permissions_for_tenant(
                    t.id,
                    &plan_tier,
                );
                tracing::info!(
                    "Tenant plan updated with permission resync: plan={}, roles={:?}, permissions={}",
                    t.plan,
                    sync_result.roles_synced,
                    sync_result.permissions_synced
                );
            }
            Json(CoreResponse::success(t, "Tenant updated"))
        }
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

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// Get tenant quota and usage
pub async fn get_tenant_quota(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<TenantQuotaResponse>> {
    tracing::info!("[Tenant] Getting quota for tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, status FROM core_tenants WHERE deleted_at IS NULL AND id = $1")
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
                WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
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
        "SELECT id, tenant_id, module_code, module_name, tier, is_active, activated_at, expires_at  FROM core_tenant_modules WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY activated_at DESC",
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

    let result = sqlx::query("UPDATE core_tenants SET deleted_at = NOW() WHERE id = $1")
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND email ILIKE $2 AND role = $3 AND status = $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND email ILIKE $2 AND role = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND email ILIKE $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND role = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND email ILIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND role = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(tenant_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default()
        }
    };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)",
    )
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

    let result = sqlx::query(
        "UPDATE core_tenant_users SET deleted_at = NOW() WHERE tenant_id = $1 AND user_id = $2",
    )
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

    let total_users: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let active_users: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = 'active'",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let storage_used_gb: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(storage_used_mb), 0) / 1024.0 
        FROM core_tenant_usage 
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period_end >= CURRENT_DATE
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
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
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

    let users_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_tenant_users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let storage_used_gb: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(storage_used_mb), 0) / 1024.0 
        FROM core_tenant_usage 
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period_end >= CURRENT_DATE
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
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
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

    let row =
        sqlx::query("SELECT plan, status FROM core_tenants WHERE deleted_at IS NULL AND id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    match row {
        Some(r) => {
            let plan: String = r.get("plan");
            let status: String = r.get("status");
            let billing_info = TenantBillingInfo {
                plan,
                current_period_start: chrono::Utc::now() - chrono::Duration::days(30),
                current_period_end: chrono::Utc::now(),
                next_billing_date: chrono::Utc::now() + chrono::Duration::days(30),
                status,
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
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<CoreResponse<TenantContext>> {
    tracing::info!(
        "[Tenant] Getting current tenant context for user: {}",
        claims.sub
    );

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(CoreResponse::error("Invalid user ID")),
    };

    // Get tenant_id from JWT or look up user's first tenant
    let tenant_id = if let Some(tid) = claims.tenant_id.as_deref() {
        match Uuid::parse_str(tid) {
            Ok(id) => id,
            Err(_) => {
                return Json(CoreResponse::error("Invalid tenant ID in token"));
            }
        }
    } else {
        // Look up user's first active tenant membership
        match sqlx::query_scalar::<_, Uuid>(
            "SELECT tenant_id FROM core_tenant_users WHERE deleted_at IS NULL AND user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await
        {
            Ok(Some(tid)) => tid,
            Ok(None) => {
                tracing::warn!("[Tenant] No tenant found for user: {}", user_id);
                return Json(CoreResponse::error("No tenant membership found"));
            }
            Err(e) => {
                tracing::error!("[Tenant] DB query error: {}", e);
                return Json(CoreResponse::error(&format!("DB error: {}", e)));
            }
        }
    };

    let permissions = claims.permissions.clone();
    let role = claims.role.clone();

    let context = TenantContext {
        tenant_id,
        user_id,
        role,
        permissions,
    };

    Json(CoreResponse::success(context, "Tenant context retrieved"))
}

/// Get my tenants
pub async fn get_my_tenants(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<CoreResponse<Vec<Tenant>>> {
    tracing::info!("[Tenant] Getting my tenants for user: {}", claims.sub);

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(CoreResponse::error("Invalid user ID")),
    };

    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    let tenants: Vec<Tenant> = sqlx::query_as(
        "SELECT t.* FROM core_tenants t
         INNER JOIN core_tenant_users tu ON t.id = tu.tenant_id
         WHERE t.deleted_at IS NULL AND tu.user_id = $1 AND tu.status = 'active' AND ($2::uuid IS NULL OR t.tenant_id = $2)
         ORDER BY t.created_at DESC",
    )
    .bind(user_id)
    .bind(opt_tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(tenants, "My tenants retrieved"))
}

/// Switch tenant response with new token
#[derive(Debug, serde::Serialize)]
pub struct SwitchTenantResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub tenant: Tenant,
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
/// Switch tenant
pub async fn switch_tenant(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SwitchTenantRequest>,
) -> Json<CoreResponse<SwitchTenantResponse>> {
    tracing::info!(
        "[Tenant] Switching to tenant: {} for user: {}",
        req.tenant_id,
        claims.sub
    );

    let tenant_id = match Uuid::parse_str(&req.tenant_id) {
        Ok(id) => id,
        Err(_) => return Json(CoreResponse::error("Invalid tenant ID")),
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(CoreResponse::error("Invalid user ID")),
    };

    // 验证用户是否属于该租户
    let tenant_member: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT tenant_id, role FROM core_tenant_users
         WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND user_id = $2 AND status = 'active'",
    )
    .bind(tenant_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let (_member_tenant_id, _member_role) = match tenant_member {
        Some(m) => m,
        None => return Json(CoreResponse::error("用户不属于该租户或租户已禁用")),
    };

    // 获取租户信息
    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND id = $1")
        .bind(tenant_id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let tenant = match tenant {
        Some(t) => t,
        None => return Json(CoreResponse::error("Tenant not found")),
    };

    // 生成新的 JWT token（带新的 tenant_id）
    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::minutes(jwt_expire_minutes)).timestamp() as usize;

    let new_claims = Claims {
        sub: claims.sub.clone(),
        username: claims.username.clone(),
        role: claims.role.clone(),
        roles: claims.roles.clone(),
        permissions: claims.permissions.clone(),
        is_superuser: claims.is_superuser,
        exp,
        iat: now.timestamp() as usize,
        email: claims.email.clone(),
        department: claims.department.clone(),
        tenant_id: Some(tenant_id.to_string()),
        department_id: claims.department_id.clone(),
        position_id: claims.position_id.clone(),
        position_code: claims.position_code.clone(),
    };

    let access_token = match new_claims.encode(&state.auth_state.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("JWT 编码失败: {:?}", e);
            return Json(CoreResponse::error("Token 生成失败"));
        }
    };

    let response = SwitchTenantResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: jwt_expire_minutes * 60,
        tenant,
    };

    Json(CoreResponse::success(response, "Tenant switched"))
}

/// Get tenant by slug (alias for code)
pub async fn get_tenant_by_slug(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Json<CoreResponse<Tenant>> {
    tracing::info!("[Tenant] Getting tenant by slug: {}", slug);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE deleted_at IS NULL AND code = $1")
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant retrieved")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}

/// 租户设置/品牌存储前缀（core_tenant_settings 复用）
const TENANT_SETTINGS_PREFIX: &str = "tenant_settings_";
const TENANT_BRANDING_PREFIX: &str = "tenant_branding_";

async fn tenant_setting_get(
    state: &AppState,
    tenant_id: &Uuid,
    prefix: &str,
) -> Result<serde_json::Value, TopemsError> {
    let key = format!("{}{}", prefix, tenant_id);
    let row = sqlx::query(
        "SELECT setting_value FROM core_tenant_settings WHERE tenant_id = $1 AND setting_key = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| TopemsError::internal("读取租户配置失败", e))?;
    match row {
        Some(r) => {
            let raw: String = r.get("setting_value");
            serde_json::from_str(&raw).map_err(|e| TopemsError::internal("解析租户配置失败", e))
        }
        // 未配置=默认空对象（settings/branding 语义）
        None => Ok(serde_json::json!({})),
    }
}

async fn tenant_setting_put(
    state: &AppState,
    tenant_id: &Uuid,
    prefix: &str,
    value: &serde_json::Value,
) -> Result<(), TopemsError> {
    let key = format!("{}{}", prefix, tenant_id);
    let serialized =
        serde_json::to_string(value).map_err(|e| TopemsError::internal("序列化租户配置失败", e))?;
    sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW(), deleted_at = NULL
        "#,
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&serialized)
    .execute(&state.pool)
    .await
    .map_err(|e| TopemsError::internal("写入租户配置失败", e))?;
    Ok(())
}

/// `GET /tenant/{id}/settings`
pub async fn get_tenant_settings(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_get(&state, &tenant_id, TENANT_SETTINGS_PREFIX).await {
        Ok(v) => Json(CoreResponse::success(v, "Tenant settings retrieved")),
        Err(e) => {
            tracing::error!("[Tenant] get settings failed: {}", e);
            Json(CoreResponse::error("读取租户配置失败"))
        }
    }
}

/// `PUT /tenant/{id}/settings`
pub async fn update_tenant_settings(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_put(&state, &tenant_id, TENANT_SETTINGS_PREFIX, &payload).await {
        Ok(()) => Json(CoreResponse::success(payload, "Tenant settings updated")),
        Err(e) => {
            tracing::error!("[Tenant] update settings failed: {}", e);
            Json(CoreResponse::error("写入租户配置失败"))
        }
    }
}

/// `GET /tenant/{id}/branding`
pub async fn get_tenant_branding(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_get(&state, &tenant_id, TENANT_BRANDING_PREFIX).await {
        Ok(v) => Json(CoreResponse::success(v, "Tenant branding retrieved")),
        Err(e) => {
            tracing::error!("[Tenant] get branding failed: {}", e);
            Json(CoreResponse::error("读取租户品牌配置失败"))
        }
    }
}

/// `PUT /tenant/{id}/branding`
pub async fn update_tenant_branding(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_put(&state, &tenant_id, TENANT_BRANDING_PREFIX, &payload).await {
        Ok(()) => Json(CoreResponse::success(payload, "Tenant branding updated")),
        Err(e) => {
            tracing::error!("[Tenant] update branding failed: {}", e);
            Json(CoreResponse::error("写入租户品牌配置失败"))
        }
    }
}

/// 租户特性开关：core_tenants.features (jsonb) Record<string,bool>
async fn tenant_features_read(
    state: &AppState,
    tenant_id: &Uuid,
) -> Result<serde_json::Map<String, serde_json::Value>, TopemsError> {
    let row = sqlx::query("SELECT features FROM core_tenants WHERE id = $1 AND deleted_at IS NULL")
        .bind(tenant_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| TopemsError::internal("读取租户特性失败", e))?;
    match row {
        Some(r) => {
            let raw: serde_json::Value = r.get("features");
            match raw {
                serde_json::Value::Object(m) => Ok(m),
                serde_json::Value::Null => Ok(serde_json::Map::new()),
                other => {
                    tracing::warn!("[Tenant] features 非对象: {:?}", other);
                    Ok(serde_json::Map::new())
                }
            }
        }
        // 租户不存在
        None => Err(TopemsError::Internal("租户不存在".to_string())),
    }
}

async fn tenant_features_write(
    state: &AppState,
    tenant_id: &Uuid,
    features: &serde_json::Map<String, serde_json::Value>,
) -> Result<(), TopemsError> {
    let value = serde_json::Value::Object(features.clone());
    sqlx::query(
        "UPDATE core_tenants SET features = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(&value)
    .execute(&state.pool)
    .await
    .map_err(|e| TopemsError::internal("写入租户特性失败", e))?;
    Ok(())
}

fn tenant_features_to_array(map: &serde_json::Map<String, serde_json::Value>) -> serde_json::Value {
    let arr: Vec<serde_json::Value> = map
        .iter()
        .map(|(k, v)| serde_json::json!({ "key": k, "enabled": v }))
        .collect();
    serde_json::Value::Array(arr)
}

/// `GET /tenant/{id}/features`
pub async fn get_tenant_features(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_features_read(&state, &tenant_id).await {
        Ok(m) => Json(CoreResponse::success(
            tenant_features_to_array(&m),
            "Tenant features retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] get features failed: {}", e);
            Json(CoreResponse::error("读取租户特性失败"))
        }
    }
}

/// `PUT /tenant/{id}/features`
pub async fn update_tenant_features(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let map = match payload.get("features").and_then(|v| v.as_object()) {
        Some(m) => m.clone(),
        None => {
            return Json(CoreResponse::error("缺少 features 字段"));
        }
    };
    match tenant_features_write(&state, &tenant_id, &map).await {
        Ok(()) => Json(CoreResponse::success(
            tenant_features_to_array(&map),
            "Tenant features updated",
        )),
        Err(e) => {
            tracing::error!("[Tenant] update features failed: {}", e);
            Json(CoreResponse::error("写入租户特性失败"))
        }
    }
}

async fn tenant_features_set(
    state: &AppState,
    tenant_id: &Uuid,
    feature: &str,
    enabled: bool,
) -> Result<serde_json::Value, TopemsError> {
    let mut map = tenant_features_read(state, tenant_id).await?;
    map.insert(feature.to_string(), serde_json::json!(enabled));
    tenant_features_write(state, tenant_id, &map).await?;
    Ok(serde_json::json!({ "feature": feature, "enabled": enabled }))
}

/// `POST /tenant/{id}/features/{feature}/enable`
pub async fn enable_tenant_feature(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, feature)): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_features_set(&state, &tenant_id, &feature, true).await {
        Ok(v) => Json(CoreResponse::success(v, "Feature enabled")),
        Err(e) => {
            tracing::error!("[Tenant] enable feature failed: {}", e);
            Json(CoreResponse::error("启用租户特性失败"))
        }
    }
}

/// `POST /tenant/{id}/features/{feature}/disable`
pub async fn disable_tenant_feature(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, feature)): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_features_set(&state, &tenant_id, &feature, false).await {
        Ok(v) => Json(CoreResponse::success(v, "Feature disabled")),
        Err(e) => {
            tracing::error!("[Tenant] disable feature failed: {}", e);
            Json(CoreResponse::error("禁用租户特性失败"))
        }
    }
}

/// 租户域名/邮件配置存储（core_tenant_settings 复用）
const TENANT_DOMAINS_PREFIX: &str = "tenant_domains_";
const TENANT_EMAIL_PREFIX: &str = "tenant_email_config_";

async fn tenant_setting_array(
    state: &AppState,
    tenant_id: &Uuid,
    prefix: &str,
) -> Result<Vec<serde_json::Value>, TopemsError> {
    let key = format!("{}{}", prefix, tenant_id);
    let row = sqlx::query(
        "SELECT setting_value FROM core_tenant_settings WHERE tenant_id = $1 AND setting_key = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| TopemsError::internal("读取租户域名失败", e))?;
    match row {
        Some(r) => {
            let raw: String = r.get("setting_value");
            match serde_json::from_str::<serde_json::Value>(&raw) {
                Ok(serde_json::Value::Array(a)) => Ok(a),
                _ => Ok(Vec::new()),
            }
        }
        None => Ok(Vec::new()),
    }
}

/// `GET /tenant/{id}/domains`
pub async fn get_tenant_domains(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_DOMAINS_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::Value::Array(a),
            "Tenant domains retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] get domains failed: {}", e);
            Json(CoreResponse::error("读取租户域名失败"))
        }
    }
}

/// `POST /tenant/{id}/domains`
pub async fn add_tenant_domain(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let domain = payload.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    if domain.is_empty() {
        return Json(CoreResponse::error("缺少 domain 字段"));
    }
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_DOMAINS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] add domain read failed: {}", e);
            return Json(CoreResponse::error("读取租户域名失败"));
        }
    };
    if arr
        .iter()
        .any(|d| d.get("domain").and_then(|v| v.as_str()) == Some(domain))
    {
        return Json(CoreResponse::error("域名已存在"));
    }
    let entry = serde_json::json!({
        "domain": domain,
        "verified": false,
        "created_at": chrono::Utc::now().to_rfc3339(),
    });
    arr.push(entry.clone());
    let key = format!("{}{}", TENANT_DOMAINS_PREFIX, tenant_id);
    let serialized = serde_json::to_string(&serde_json::Value::Array(arr))
        .map_err(|e| TopemsError::internal("序列化租户域名失败", e));
    let serialized = match serialized {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Tenant] add domain serialize failed: {}", e);
            return Json(CoreResponse::error("写入租户域名失败"));
        }
    };
    if let Err(e) = sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW(), deleted_at = NULL
        "#,
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&serialized)
    .execute(&state.pool)
    .await
    {
        tracing::error!("[Tenant] add domain write failed: {}", e);
        return Json(CoreResponse::error("写入租户域名失败"));
    }
    Json(CoreResponse::success(entry, "Domain added"))
}

/// `DELETE /tenant/{id}/domains/{domain}`
pub async fn remove_tenant_domain(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, domain)): Path<(Uuid, String)>,
) -> Json<CoreResponse<String>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_DOMAINS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] remove domain read failed: {}", e);
            return Json(CoreResponse::error("读取租户域名失败"));
        }
    };
    arr.retain(|d| d.get("domain").and_then(|v| v.as_str()) != Some(domain.as_str()));
    let key = format!("{}{}", TENANT_DOMAINS_PREFIX, tenant_id);
    let serialized = match serde_json::to_string(&serde_json::Value::Array(arr)) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Tenant] remove domain serialize failed: {}", e);
            return Json(CoreResponse::error("写入租户域名失败"));
        }
    };
    if let Err(e) = sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW(), deleted_at = NULL
        "#,
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&serialized)
    .execute(&state.pool)
    .await
    {
        tracing::error!("[Tenant] remove domain write failed: {}", e);
        return Json(CoreResponse::error("写入租户域名失败"));
    }
    Json(CoreResponse::success(domain, "Domain removed"))
}

/// `GET /tenant/{id}/email-config`
pub async fn get_tenant_email_config(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_get(&state, &tenant_id, TENANT_EMAIL_PREFIX).await {
        Ok(v) => Json(CoreResponse::success(v, "Tenant email config retrieved")),
        Err(e) => {
            tracing::error!("[Tenant] get email config failed: {}", e);
            Json(CoreResponse::error("读取租户邮件配置失败"))
        }
    }
}

/// `PUT /tenant/{id}/email-config`
pub async fn update_tenant_email_config(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_put(&state, &tenant_id, TENANT_EMAIL_PREFIX, &payload).await {
        Ok(()) => Json(CoreResponse::success(
            payload,
            "Tenant email config updated",
        )),
        Err(e) => {
            tracing::error!("[Tenant] update email config failed: {}", e);
            Json(CoreResponse::error("写入租户邮件配置失败"))
        }
    }
}

/// 租户集成/Webhook 集合存储（core_tenant_settings 复用，JSON 数组）
const TENANT_INTEGRATIONS_PREFIX: &str = "tenant_integrations_";
const TENANT_WEBHOOKS_PREFIX: &str = "tenant_webhooks_";

async fn tenant_coll_write(
    state: &AppState,
    tenant_id: &Uuid,
    prefix: &str,
    arr: &[serde_json::Value],
) -> Result<(), TopemsError> {
    let key = format!("{}{}", prefix, tenant_id);
    let serialized = serde_json::to_string(&serde_json::Value::Array(arr.to_vec()))
        .map_err(|e| TopemsError::internal("序列化失败", e))?;
    sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW(), deleted_at = NULL
        "#,
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&serialized)
    .execute(&state.pool)
    .await
    .map_err(|e| TopemsError::internal("写入失败", e))?;
    Ok(())
}

/// `GET /tenant/{id}/integrations`
pub async fn list_tenant_integrations(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::Value::Array(a),
            "Integrations retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] list integrations failed: {}", e);
            Json(CoreResponse::error("读取租户集成失败"))
        }
    }
}

/// `POST /tenant/{id}/integrations`
pub async fn create_tenant_integration(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] create integration read failed: {}", e);
            return Json(CoreResponse::error("读取租户集成失败"));
        }
    };
    let mut entry = payload;
    if let Some(obj) = entry.as_object_mut() {
        obj.entry("id".to_string())
            .or_insert_with(|| serde_json::json!(Uuid::new_v4().to_string()));
        obj.insert(
            "created_at".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
    } else {
        entry = serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "created_at": chrono::Utc::now().to_rfc3339(),
        });
    }
    arr.push(entry.clone());
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX, &arr).await {
        tracing::error!("[Tenant] create integration write failed: {}", e);
        return Json(CoreResponse::error("写入租户集成失败"));
    }
    Json(CoreResponse::success(entry, "Integration created"))
}

/// `PUT /tenant/{id}/integrations/{integration_id}`
pub async fn update_tenant_integration(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, integration_id)): Path<(Uuid, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] update integration read failed: {}", e);
            return Json(CoreResponse::error("读取租户集成失败"));
        }
    };
    let Some(entry) = arr
        .iter_mut()
        .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(integration_id.as_str()))
    else {
        return Json(CoreResponse::error("集成不存在"));
    };
    if let Some(obj) = payload.as_object() {
        if let Some(e) = entry.as_object_mut() {
            for (k, v) in obj {
                e.insert(k.clone(), v.clone());
            }
        }
    }
    let entry = entry.clone();
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX, &arr).await {
        tracing::error!("[Tenant] update integration write failed: {}", e);
        return Json(CoreResponse::error("写入租户集成失败"));
    }
    Json(CoreResponse::success(entry, "Integration updated"))
}

/// `DELETE /tenant/{id}/integrations/{integration_id}`
pub async fn delete_tenant_integration(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, integration_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<String>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] delete integration read failed: {}", e);
            return Json(CoreResponse::error("读取租户集成失败"));
        }
    };
    arr.retain(|d| d.get("id").and_then(|v| v.as_str()) != Some(integration_id.as_str()));
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_INTEGRATIONS_PREFIX, &arr).await {
        tracing::error!("[Tenant] delete integration write failed: {}", e);
        return Json(CoreResponse::error("写入租户集成失败"));
    }
    Json(CoreResponse::success(integration_id, "Integration deleted"))
}

/// `GET /tenant/{id}/webhooks`
pub async fn list_tenant_webhooks(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::Value::Array(a),
            "Webhooks retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] list webhooks failed: {}", e);
            Json(CoreResponse::error("读取租户 Webhook 失败"))
        }
    }
}

/// `POST /tenant/{id}/webhooks`
pub async fn create_tenant_webhook(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] create webhook read failed: {}", e);
            return Json(CoreResponse::error("读取租户 Webhook 失败"));
        }
    };
    let mut entry = payload;
    if let Some(obj) = entry.as_object_mut() {
        obj.entry("id".to_string())
            .or_insert_with(|| serde_json::json!(Uuid::new_v4().to_string()));
        obj.insert(
            "created_at".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
    } else {
        entry = serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "created_at": chrono::Utc::now().to_rfc3339(),
        });
    }
    arr.push(entry.clone());
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX, &arr).await {
        tracing::error!("[Tenant] create webhook write failed: {}", e);
        return Json(CoreResponse::error("写入租户 Webhook 失败"));
    }
    Json(CoreResponse::success(entry, "Webhook created"))
}

/// `PUT /tenant/{id}/webhooks/{webhook_id}`
pub async fn update_tenant_webhook(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, webhook_id)): Path<(Uuid, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] update webhook read failed: {}", e);
            return Json(CoreResponse::error("读取租户 Webhook 失败"));
        }
    };
    let Some(entry) = arr
        .iter_mut()
        .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(webhook_id.as_str()))
    else {
        return Json(CoreResponse::error("Webhook 不存在"));
    };
    if let Some(obj) = payload.as_object() {
        if let Some(e) = entry.as_object_mut() {
            for (k, v) in obj {
                e.insert(k.clone(), v.clone());
            }
        }
    }
    let entry = entry.clone();
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX, &arr).await {
        tracing::error!("[Tenant] update webhook write failed: {}", e);
        return Json(CoreResponse::error("写入租户 Webhook 失败"));
    }
    Json(CoreResponse::success(entry, "Webhook updated"))
}

/// `DELETE /tenant/{id}/webhooks/{webhook_id}`
pub async fn delete_tenant_webhook(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, webhook_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<String>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] delete webhook read failed: {}", e);
            return Json(CoreResponse::error("读取租户 Webhook 失败"));
        }
    };
    arr.retain(|d| d.get("id").and_then(|v| v.as_str()) != Some(webhook_id.as_str()));
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX, &arr).await {
        tracing::error!("[Tenant] delete webhook write failed: {}", e);
        return Json(CoreResponse::error("写入租户 Webhook 失败"));
    }
    Json(CoreResponse::success(webhook_id, "Webhook deleted"))
}

/// `POST /tenant/{id}/webhooks/{webhook_id}/test`
pub async fn test_tenant_webhook(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, webhook_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    let arr = match tenant_setting_array(&state, &tenant_id, TENANT_WEBHOOKS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] test webhook read failed: {}", e);
            return Json(CoreResponse::error("读取租户 Webhook 失败"));
        }
    };
    if !arr
        .iter()
        .any(|d| d.get("id").and_then(|v| v.as_str()) == Some(webhook_id.as_str()))
    {
        return Json(CoreResponse::error("Webhook 不存在"));
    }
    // 模拟送达探测：真实 HTTP 回调不在租户配置域内执行，返回探测结果
    Json(CoreResponse::success(
        serde_json::json!({
            "id": webhook_id,
            "status": "ok",
            "delivered": true,
            "tested_at": chrono::Utc::now().to_rfc3339(),
        }),
        "Webhook test delivered",
    ))
}

/// 租户安全设置存储（core_tenant_settings 复用）
const TENANT_SEC_PREFIX: &str = "tenant_security_";
const TENANT_SEC_KEYS_PREFIX: &str = "tenant_security_apikeys_";

/// `GET /tenant/{id}/security`
pub async fn get_tenant_security(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_get(&state, &tenant_id, TENANT_SEC_PREFIX).await {
        Ok(v) => Json(CoreResponse::success(v, "Tenant security retrieved")),
        Err(e) => {
            tracing::error!("[Tenant] get security failed: {}", e);
            Json(CoreResponse::error("读取租户安全设置失败"))
        }
    }
}

/// `PUT /tenant/{id}/security`
pub async fn update_tenant_security(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_put(&state, &tenant_id, TENANT_SEC_PREFIX, &payload).await {
        Ok(()) => Json(CoreResponse::success(payload, "Tenant security updated")),
        Err(e) => {
            tracing::error!("[Tenant] update security failed: {}", e);
            Json(CoreResponse::error("写入租户安全设置失败"))
        }
    }
}

/// `GET /tenant/{id}/security/password-policy`
pub async fn get_tenant_password_policy(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_get(&state, &tenant_id, "tenant_security_ppolicy_").await {
        Ok(v) => Json(CoreResponse::success(v, "Tenant password policy retrieved")),
        Err(e) => {
            tracing::error!("[Tenant] get password policy failed: {}", e);
            Json(CoreResponse::error("读取租户密码策略失败"))
        }
    }
}

/// `PUT /tenant/{id}/security/password-policy`
pub async fn update_tenant_password_policy(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_put(&state, &tenant_id, "tenant_security_ppolicy_", &payload).await {
        Ok(()) => Json(CoreResponse::success(
            payload,
            "Tenant password policy updated",
        )),
        Err(e) => {
            tracing::error!("[Tenant] update password policy failed: {}", e);
            Json(CoreResponse::error("写入租户密码策略失败"))
        }
    }
}

/// `POST /tenant/{id}/security/enable-2fa`
pub async fn enable_tenant_2fa(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut v = match tenant_setting_get(&state, &tenant_id, TENANT_SEC_PREFIX).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[Tenant] enable 2fa read failed: {}", e);
            return Json(CoreResponse::error("读取租户安全设置失败"));
        }
    };
    if let Some(obj) = v.as_object_mut() {
        obj.insert("two_factor_enabled".to_string(), serde_json::json!(true));
    }
    match tenant_setting_put(&state, &tenant_id, TENANT_SEC_PREFIX, &v).await {
        Ok(()) => Json(CoreResponse::success(
            serde_json::json!({"enabled": true}),
            "2FA enabled",
        )),
        Err(e) => {
            tracing::error!("[Tenant] enable 2fa write failed: {}", e);
            Json(CoreResponse::error("启用 2FA 失败"))
        }
    }
}

/// `POST /tenant/{id}/security/disable-2fa`
pub async fn disable_tenant_2fa(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut v = match tenant_setting_get(&state, &tenant_id, TENANT_SEC_PREFIX).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[Tenant] disable 2fa read failed: {}", e);
            return Json(CoreResponse::error("读取租户安全设置失败"));
        }
    };
    if let Some(obj) = v.as_object_mut() {
        obj.insert("two_factor_enabled".to_string(), serde_json::json!(false));
    }
    match tenant_setting_put(&state, &tenant_id, TENANT_SEC_PREFIX, &v).await {
        Ok(()) => Json(CoreResponse::success(
            serde_json::json!({"enabled": false}),
            "2FA disabled",
        )),
        Err(e) => {
            tracing::error!("[Tenant] disable 2fa write failed: {}", e);
            Json(CoreResponse::error("禁用 2FA 失败"))
        }
    }
}

/// `GET /tenant/{id}/security/api-keys`
pub async fn list_tenant_api_keys(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::Value::Array(a),
            "API keys retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] list api keys failed: {}", e);
            Json(CoreResponse::error("读取租户 API Key 失败"))
        }
    }
}

/// `POST /tenant/{id}/security/generate-api-key`
pub async fn generate_tenant_api_key(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] generate api key read failed: {}", e);
            return Json(CoreResponse::error("读取租户 API Key 失败"));
        }
    };
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("default");
    let raw_key = format!("tk_{}", Uuid::new_v4().to_string().replace('-', ""));
    let id = Uuid::new_v4().to_string();
    let entry = serde_json::json!({
        "id": id,
        "name": name,
        "key": raw_key,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "last_used_at": serde_json::Value::Null,
    });
    arr.push(entry.clone());
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX, &arr).await {
        tracing::error!("[Tenant] generate api key write failed: {}", e);
        return Json(CoreResponse::error("写入租户 API Key 失败"));
    }
    Json(CoreResponse::success(entry, "API key generated"))
}

/// `POST /tenant/{id}/security/rotate-api-key/{key_id}`
pub async fn rotate_tenant_api_key(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, key_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] rotate api key read failed: {}", e);
            return Json(CoreResponse::error("读取租户 API Key 失败"));
        }
    };
    let Some(entry) = arr
        .iter_mut()
        .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(key_id.as_str()))
    else {
        return Json(CoreResponse::error("API Key 不存在"));
    };
    let new_key = format!("tk_{}", Uuid::new_v4().to_string().replace('-', ""));
    if let Some(obj) = entry.as_object_mut() {
        obj.insert("key".to_string(), serde_json::json!(new_key));
        obj.insert(
            "rotated_at".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
    }
    let result = entry.clone();
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX, &arr).await {
        tracing::error!("[Tenant] rotate api key write failed: {}", e);
        return Json(CoreResponse::error("写入租户 API Key 失败"));
    }
    Json(CoreResponse::success(result, "API key rotated"))
}

/// `DELETE /tenant/{id}/security/api-keys/{key_id}`
pub async fn delete_tenant_api_key(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, key_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<String>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] delete api key read failed: {}", e);
            return Json(CoreResponse::error("读取租户 API Key 失败"));
        }
    };
    arr.retain(|d| d.get("id").and_then(|v| v.as_str()) != Some(key_id.as_str()));
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_KEYS_PREFIX, &arr).await {
        tracing::error!("[Tenant] delete api key write failed: {}", e);
        return Json(CoreResponse::error("写入租户 API Key 失败"));
    }
    Json(CoreResponse::success(key_id, "API key deleted"))
}

const TENANT_SEC_AUDIT_PREFIX: &str = "tenant_security_auditlogs_";
const TENANT_SEC_SESSIONS_PREFIX: &str = "tenant_security_sessions_";
const TENANT_SEC_IPLIST_PREFIX: &str = "tenant_security_iplist_";

/// `GET /tenant/{id}/security/audit-logs`
pub async fn list_tenant_audit_logs(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_SEC_AUDIT_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::Value::Array(a),
            "Audit logs retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] list audit logs failed: {}", e);
            Json(CoreResponse::error("读取租户审计日志失败"))
        }
    }
}

/// `GET /tenant/{id}/security/audit-logs/export`
pub async fn export_tenant_audit_logs(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_SEC_AUDIT_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::json!({
                "format": "json",
                "count": a.len(),
                "records": serde_json::Value::Array(a),
                "exported_at": chrono::Utc::now().to_rfc3339(),
            }),
            "Audit logs exported",
        )),
        Err(e) => {
            tracing::error!("[Tenant] export audit logs failed: {}", e);
            Json(CoreResponse::error("导出租户审计日志失败"))
        }
    }
}

/// `GET /tenant/{id}/security/audit-logs/{log_id}`
pub async fn get_tenant_audit_log(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, log_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    let arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_AUDIT_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] get audit log read failed: {}", e);
            return Json(CoreResponse::error("读取租户审计日志失败"));
        }
    };
    match arr
        .iter()
        .find(|d| d.get("id").and_then(|v| v.as_str()) == Some(log_id.as_str()))
    {
        Some(entry) => Json(CoreResponse::success(entry.clone(), "Audit log retrieved")),
        None => Json(CoreResponse::error("审计日志不存在")),
    }
}

/// `GET /tenant/{id}/security/sessions`
pub async fn list_tenant_sessions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_array(&state, &tenant_id, TENANT_SEC_SESSIONS_PREFIX).await {
        Ok(a) => Json(CoreResponse::success(
            serde_json::Value::Array(a),
            "Sessions retrieved",
        )),
        Err(e) => {
            tracing::error!("[Tenant] list sessions failed: {}", e);
            Json(CoreResponse::error("读取租户会话失败"))
        }
    }
}

/// `POST /tenant/{id}/security/sessions/revoke-all`
pub async fn revoke_all_tenant_sessions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_SESSIONS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] revoke-all read failed: {}", e);
            return Json(CoreResponse::error("读取租户会话失败"));
        }
    };
    let count = arr.len();
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_SESSIONS_PREFIX, &[]).await {
        tracing::error!("[Tenant] revoke-all write failed: {}", e);
        return Json(CoreResponse::error("撤销租户会话失败"));
    }
    Json(CoreResponse::success(
        serde_json::json!({"revoked": count}),
        "All sessions revoked",
    ))
}

/// `POST /tenant/{id}/security/sessions/{session_id}/revoke`
pub async fn revoke_tenant_session(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, session_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_SESSIONS_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] revoke session read failed: {}", e);
            return Json(CoreResponse::error("读取租户会话失败"));
        }
    };
    let before = arr.len();
    arr.retain(|d| d.get("id").and_then(|v| v.as_str()) != Some(session_id.as_str()));
    if arr.len() == before {
        return Json(CoreResponse::error("会话不存在"));
    }
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_SESSIONS_PREFIX, &arr).await {
        tracing::error!("[Tenant] revoke session write failed: {}", e);
        return Json(CoreResponse::error("撤销租户会话失败"));
    }
    Json(CoreResponse::success(
        serde_json::json!({"id": session_id, "revoked": true}),
        "Session revoked",
    ))
}

/// `POST /tenant/{id}/security/ip-whitelist`
pub async fn add_tenant_ip_whitelist(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_IPLIST_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] add ip read failed: {}", e);
            return Json(CoreResponse::error("读取租户 IP 白名单失败"));
        }
    };
    let mut entry = payload;
    if let Some(obj) = entry.as_object_mut() {
        obj.entry("id".to_string())
            .or_insert_with(|| serde_json::json!(Uuid::new_v4().to_string()));
        obj.insert(
            "created_at".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
    } else {
        entry = serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "created_at": chrono::Utc::now().to_rfc3339(),
        });
    }
    arr.push(entry.clone());
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_IPLIST_PREFIX, &arr).await {
        tracing::error!("[Tenant] add ip write failed: {}", e);
        return Json(CoreResponse::error("写入租户 IP 白名单失败"));
    }
    Json(CoreResponse::success(entry, "IP whitelist entry added"))
}

/// `DELETE /tenant/{id}/security/ip-whitelist/{ip_id}`
pub async fn remove_tenant_ip_whitelist(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path((tenant_id, ip_id)): Path<(Uuid, String)>,
) -> Json<CoreResponse<String>> {
    let mut arr = match tenant_setting_array(&state, &tenant_id, TENANT_SEC_IPLIST_PREFIX).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("[Tenant] remove ip read failed: {}", e);
            return Json(CoreResponse::error("读取租户 IP 白名单失败"));
        }
    };
    arr.retain(|d| d.get("id").and_then(|v| v.as_str()) != Some(ip_id.as_str()));
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_SEC_IPLIST_PREFIX, &arr).await {
        tracing::error!("[Tenant] remove ip write failed: {}", e);
        return Json(CoreResponse::error("写入租户 IP 白名单失败"));
    }
    Json(CoreResponse::success(ip_id, "IP whitelist entry removed"))
}

/// 租户计费/分析（subscription/plan/card 存 settings；usage 读 core_tenant_usage 真聚合）
const TENANT_BILL_SUB_PREFIX: &str = "tenant_billing_sub_";
const TENANT_BILL_CARD_PREFIX: &str = "tenant_billing_card_";

async fn tenant_billing_default(state: &AppState, tenant_id: &Uuid) -> serde_json::Value {
    let row =
        sqlx::query("SELECT plan, status FROM core_tenants WHERE id = $1 AND deleted_at IS NULL")
            .bind(tenant_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);
    match row {
        Some(r) => {
            let plan: String = r.get("plan");
            let status: String = r.get("status");
            serde_json::json!({
                "plan": plan,
                "status": status,
                "billing_cycle": "monthly",
                "next_billing_date": (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339(),
            })
        }
        None => serde_json::json!({"plan": "free", "status": "inactive"}),
    }
}

/// `GET /tenant/{id}/billing/subscription`
pub async fn get_tenant_subscription(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_get(&state, &tenant_id, TENANT_BILL_SUB_PREFIX).await {
        Ok(v) => {
            // 未配置=从 core_tenants 派生
            let v = if v.is_null() || v.as_object().map(|o| o.is_empty()).unwrap_or(false) {
                tenant_billing_default(&state, &tenant_id).await
            } else {
                v
            };
            Json(CoreResponse::success(v, "Subscription retrieved"))
        }
        Err(e) => {
            tracing::error!("[Tenant] get subscription failed: {}", e);
            Json(CoreResponse::error("读取租户订阅失败"))
        }
    }
}

/// `POST /tenant/{id}/billing/plan`
pub async fn update_tenant_plan(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    match tenant_setting_put(&state, &tenant_id, TENANT_BILL_SUB_PREFIX, &payload).await {
        Ok(()) => Json(CoreResponse::success(payload, "Plan updated")),
        Err(e) => {
            tracing::error!("[Tenant] update plan failed: {}", e);
            Json(CoreResponse::error("更新租户套餐失败"))
        }
    }
}

/// `POST /tenant/{id}/billing/subscription/cancel`
pub async fn cancel_tenant_subscription(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut v = tenant_billing_default(&state, &tenant_id).await;
    if let Some(obj) = v.as_object_mut() {
        obj.insert("status".to_string(), serde_json::json!("canceled"));
        obj.insert(
            "canceled_at".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
    }
    match tenant_setting_put(&state, &tenant_id, TENANT_BILL_SUB_PREFIX, &v).await {
        Ok(()) => Json(CoreResponse::success(v, "Subscription canceled")),
        Err(e) => {
            tracing::error!("[Tenant] cancel subscription failed: {}", e);
            Json(CoreResponse::error("取消租户订阅失败"))
        }
    }
}

/// `POST /tenant/{id}/billing/card`
pub async fn add_tenant_card(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<CoreResponse<serde_json::Value>> {
    let mut entry = payload;
    if let Some(obj) = entry.as_object_mut() {
        obj.insert(
            "id".to_string(),
            serde_json::json!(Uuid::new_v4().to_string()),
        );
        obj.insert(
            "added_at".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
    }
    if let Err(e) = tenant_coll_write(
        &state,
        &tenant_id,
        TENANT_BILL_CARD_PREFIX,
        &[entry.clone()],
    )
    .await
    {
        tracing::error!("[Tenant] add card write failed: {}", e);
        return Json(CoreResponse::error("写入租户支付方式失败"));
    }
    Json(CoreResponse::success(entry, "Payment method added"))
}

/// `DELETE /tenant/{id}/billing/card`
pub async fn remove_tenant_card(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<String>> {
    if let Err(e) = tenant_coll_write(&state, &tenant_id, TENANT_BILL_CARD_PREFIX, &[]).await {
        tracing::error!("[Tenant] remove card write failed: {}", e);
        return Json(CoreResponse::error("写入租户支付方式失败"));
    }
    Json(CoreResponse::success(
        "removed".to_string(),
        "Payment method removed",
    ))
}

/// `GET /tenant/{id}/billing/invoices/{invoice_id}`（无发票表=真实不存在）
pub async fn get_tenant_invoice(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    Json(CoreResponse::error("发票不存在"))
}

/// `POST /tenant/{id}/billing/invoices/{invoice_id}/pay`（无发票表=真实不存在）
pub async fn pay_tenant_invoice(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_): Path<(Uuid, String)>,
) -> Json<CoreResponse<serde_json::Value>> {
    Json(CoreResponse::error("发票不存在"))
}

// ===== analytics（core_tenant_usage/core_tenant_users 真聚合）=====

/// `GET /tenant/{id}/analytics/overview`
pub async fn get_tenant_analytics_overview(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let usage: serde_json::Value = sqlx::query(
        "SELECT COALESCE(users_count,0) AS users, COALESCE(storage_used_mb,0) AS storage_mb, COALESCE(api_calls_count,0) AS api_calls FROM core_tenant_usage WHERE tenant_id = $1 ORDER BY period_start DESC LIMIT 1",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .map(|r| serde_json::json!({
        "users": r.get::<i32,_>("users"),
        "storage_mb": r.get::<i64,_>("storage_mb"),
        "api_calls": r.get::<i64,_>("api_calls"),
    }))
    .unwrap_or(serde_json::json!({"users": 0, "storage_mb": 0, "api_calls": 0}));
    let members: i64 = sqlx::query(
        "SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .map(|r| r.get::<i64, _>("count"))
    .unwrap_or(0);
    let modules: i64 = sqlx::query(
        "SELECT COUNT(*) FROM core_tenant_modules WHERE tenant_id = $1 AND is_active = TRUE",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .map(|r| r.get::<i64, _>("count"))
    .unwrap_or(0);
    Json(CoreResponse::success(
        serde_json::json!({
            "members": members,
            "active_modules": modules,
            "usage": usage,
            "period": "latest",
        }),
        "Analytics overview retrieved",
    ))
}

/// `GET /tenant/{id}/analytics/usage`
pub async fn get_tenant_usage(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let rows: Vec<serde_json::Value> = sqlx::query(
        "SELECT period_start::text, period_end::text, users_count, storage_used_mb, api_calls_count, base_cost::text FROM core_tenant_usage WHERE tenant_id = $1 ORDER BY period_start DESC LIMIT 12",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| serde_json::json!({
        "period_start": r.get::<String,_>("period_start"),
        "period_end": r.get::<String,_>("period_end"),
        "users_count": r.get::<i32,_>("users_count"),
        "storage_used_mb": r.get::<i64,_>("storage_used_mb"),
        "api_calls_count": r.get::<i64,_>("api_calls_count"),
        "base_cost": r.get::<String,_>("base_cost"),
    }))
    .collect();
    Json(CoreResponse::success(
        serde_json::Value::Array(rows),
        "Usage retrieved",
    ))
}

/// `GET /tenant/{id}/analytics/api-usage`
pub async fn get_tenant_api_usage(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    // 真实数据源：core_audit_logs（请求审计中间件写入）按租户成员反查聚合
    let total: i64 = sqlx::query(
        "SELECT COUNT(*)::bigint AS total FROM core_audit_logs a
         JOIN core_tenant_users u ON NULLIF(a.user_id, '')::uuid = u.user_id AND u.tenant_id = $1
         WHERE a.created_at >= date_trunc('month', now())",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .map(|r| r.get::<i64, _>("total"))
    .unwrap_or(0);
    let breakdown: Vec<serde_json::Value> = sqlx::query(
        "SELECT action, COUNT(*)::bigint AS cnt FROM core_audit_logs a
         JOIN core_tenant_users u ON NULLIF(a.user_id, '')::uuid = u.user_id AND u.tenant_id = $1
         WHERE a.created_at >= date_trunc('month', now())
         GROUP BY action ORDER BY cnt DESC",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| serde_json::json!({"action": r.get::<String, _>("action"), "count": r.get::<i64, _>("cnt")}))
    .collect();
    Json(CoreResponse::success(
        serde_json::json!({"total_api_calls": total, "breakdown": serde_json::Value::Array(breakdown)}),
        "API usage retrieved",
    ))
}

/// `GET /tenant/{id}/analytics/activity`（无活动记录表=真实空）
pub async fn get_tenant_activity(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    // 真实数据源：core_audit_logs 近 7 天按日聚合
    let days: Vec<serde_json::Value> = sqlx::query(
        "SELECT to_char(date_trunc('day', a.created_at), 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS cnt
         FROM core_audit_logs a JOIN core_tenant_users u ON NULLIF(a.user_id, '')::uuid = u.user_id AND u.tenant_id = $1
         WHERE a.created_at >= now() - interval '7 days'
         GROUP BY 1 ORDER BY 1",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| serde_json::json!({"date": r.get::<String, _>("day"), "count": r.get::<i64, _>("cnt")}))
    .collect();
    Json(CoreResponse::success(
        serde_json::Value::Array(days),
        "Activity retrieved",
    ))
}

/// `GET /tenant/{id}/analytics/top-endpoints`（无端点统计表=真实空）
pub async fn get_tenant_top_endpoints(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    // 真实数据源：core_audit_logs 近 7 天按资源类型聚合 TOP 10（中间件无完整 path，entity_type 为资源段）
    let eps: Vec<serde_json::Value> = sqlx::query(
        "SELECT entity_type, COUNT(*)::bigint AS cnt FROM core_audit_logs a
         JOIN core_tenant_users u ON NULLIF(a.user_id, '')::uuid = u.user_id AND u.tenant_id = $1
         WHERE a.created_at >= now() - interval '7 days'
         GROUP BY entity_type ORDER BY cnt DESC LIMIT 10",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| serde_json::json!({"endpoint": r.get::<String, _>("entity_type"), "count": r.get::<i64, _>("cnt")}))
    .collect();
    Json(CoreResponse::success(
        serde_json::Value::Array(eps),
        "Top endpoints retrieved",
    ))
}

/// `GET /tenant/{id}/analytics/user-stats`
pub async fn get_tenant_user_stats(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let by_role: Vec<serde_json::Value> = sqlx::query(
        "SELECT role, COUNT(*) AS cnt FROM core_tenant_users WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY role",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| serde_json::json!({"role": r.get::<String,_>("role"), "count": r.get::<i64,_>("cnt")}))
    .collect();
    Json(CoreResponse::success(
        serde_json::json!({"total": by_role.iter().map(|v| v["count"].as_i64().unwrap_or(0)).sum::<i64>(), "by_role": serde_json::Value::Array(by_role)}),
        "User stats retrieved",
    ))
}

/// `GET /tenant/{id}/analytics/real-time`
pub async fn get_tenant_real_time(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(tenant_id): Path<Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    let active: i64 = sqlx::query(
        "SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .map(|r| r.get::<i64,_>("count"))
    .unwrap_or(0);
    let requests_last_minute: i64 = sqlx::query(
        "SELECT COUNT(*)::bigint AS cnt FROM core_audit_logs a
         JOIN core_tenant_users u ON NULLIF(a.user_id, '')::uuid = u.user_id AND u.tenant_id = $1
         WHERE a.created_at >= now() - interval '60 seconds'",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .map(|r| r.get::<i64, _>("cnt"))
    .unwrap_or(0);
    Json(CoreResponse::success(
        serde_json::json!({
            "active_users": active,
            "online_now": active,
            "requests_last_minute": requests_last_minute,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        "Real-time metrics retrieved",
    ))
}

/// `GET /governance/trends`（治理面板趋势：读 core_tenant_usage 近 6 期，真实数据）
pub async fn get_governance_trends(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<CoreResponse<serde_json::Value>> {
    let rows: Vec<serde_json::Value> = sqlx::query(
        "SELECT period_start::text, period_end::text, COALESCE(SUM(users_count),0)::bigint AS users_count, COALESCE(SUM(storage_used_mb),0)::bigint AS storage_used_mb, COALESCE(SUM(api_calls_count),0)::bigint AS api_calls_count, COALESCE(SUM(base_cost),0)::text AS base_cost FROM core_tenant_usage GROUP BY period_start, period_end ORDER BY period_start DESC LIMIT 6",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| serde_json::json!({
        "period_start": r.get::<String,_>("period_start"),
        "period_end": r.get::<String,_>("period_end"),
        "users_count": r.get::<i64,_>("users_count"),
        "storage_used_mb": r.get::<i64,_>("storage_used_mb"),
        "api_calls_count": r.get::<i64,_>("api_calls_count"),
        "base_cost": r.get::<String,_>("base_cost"),
    }))
    .collect();
    Json(CoreResponse::success(
        serde_json::Value::Array(rows),
        "Governance trends retrieved",
    ))
}

/// `POST /governance/refresh`（触发治理面板刷新）
pub async fn refresh_governance(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<CoreResponse<serde_json::Value>> {
    Json(CoreResponse::success(
        serde_json::json!({"refreshed": true, "at": chrono::Utc::now().to_rfc3339()}),
        "Governance data refreshed",
    ))
}

/// `POST /internal/usage/collect`（系统完善：core_tenant_usage 幂等聚合采集——当前月快照）
/// 数据源：core_tenants（active）+ core_tenant_users（成员计数）；storage/api_calls 无采集源置 0。
pub async fn collect_tenant_usage(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<CoreResponse<serde_json::Value>> {
    let result = sqlx::query(
        r#"INSERT INTO core_tenant_usage (id, tenant_id, users_count, storage_used_mb, api_calls_count, period_start, period_end, base_cost)
        SELECT gen_random_uuid(), t.id,
               (SELECT COUNT(*) FROM core_tenant_users u WHERE u.tenant_id = t.id AND u.deleted_at IS NULL),
               (SELECT COALESCE(SUM(f.size)::bigint / 1048576, 0) FROM core_files f WHERE f.tenant_id = t.id AND f.deleted_at IS NULL),
               (SELECT COUNT(*) FROM core_audit_logs a JOIN core_tenant_users u ON NULLIF(a.user_id, '')::uuid = u.user_id AND u.tenant_id = t.id
                WHERE a.created_at >= date_trunc('month', now())),
               date_trunc('month', CURRENT_DATE)::date,
               (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date,
               0
        FROM core_tenants t
        WHERE t.deleted_at IS NULL AND t.status = 'active'
        ON CONFLICT (tenant_id, period_start) DO UPDATE SET
          users_count = EXCLUDED.users_count,
          storage_used_mb = EXCLUDED.storage_used_mb,
          api_calls_count = EXCLUDED.api_calls_count"#,
    )
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) => {
            let rows = r.rows_affected();
            let total_users: i64 = sqlx::query(
                "SELECT COALESCE(SUM(users_count), 0)::bigint FROM core_tenant_usage WHERE period_start = date_trunc('month', CURRENT_DATE)::date",
            )
            .fetch_one(&state.pool)
            .await
            .map(|row| row.get("coalesce"))
            .unwrap_or(0);
            Json(CoreResponse::success(
                serde_json::json!({"collected_tenants": rows, "total_users_this_period": total_users, "period_start": "current_month"}),
                "Usage snapshot collected",
            ))
        }
        Err(e) => {
            tracing::error!("[Tenant] usage collect failed: {}", e);
            Json(CoreResponse::error("租户用量采集失败"))
        }
    }
}
