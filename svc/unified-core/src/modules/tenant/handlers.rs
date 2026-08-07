//! Tenant API handlers

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use uuid::Uuid;

use super::models::*;
use crate::{AppState, CoreResponse};
use topems_shared::auth::Claims;

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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE (name ILIKE $1 OR code ILIKE $1) AND status = $2 AND plan = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE (name ILIKE $1 OR code ILIKE $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE (name ILIKE $1 OR code ILIKE $1) AND plan = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE status = $1 AND plan = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE name ILIKE $1 OR code ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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
                "SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE plan = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE id = $1")
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

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE code = $1")
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
) -> Result<Uuid, String> {
    // 1. Hash the admin password with bcrypt (same cost as IAM create_user).
    let password_hash = bcrypt::hash(admin_password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash admin password: {}", e))?;

    // 2. Guard against duplicate admin credentials (username/email are unique).
    let dup: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE username = $1 OR email = $2")
            .bind(admin_username)
            .bind(admin_email)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| format!("Failed to check existing admin user: {}", e))?;
    if dup > 0 {
        return Err("Admin username or email already exists".to_string());
    }

    // 3. Create the admin user tied to the new tenant.
    let admin_user_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO core_users (username, email, password_hash, full_name, status, is_superuser, tenant_id)
        VALUES ($1, $2, $3, $4, 'active', TRUE, $5)
        RETURNING id
        "#,
    )
    .bind(admin_username)
    .bind(admin_email)
    .bind(&password_hash)
    .bind(admin_username)
    .bind(tenant_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| format!("Failed to create admin user: {}", e))?;

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
    .map_err(|e| format!("Failed to create tenant membership: {}", e))?;

    // 5. Assign the admin to the global superadmin role (carries all perms).
    sqlx::query(
        r#"
        INSERT INTO core_user_roles (user_id, role_id)
        SELECT $1, r.id FROM core_roles r WHERE r.name = 'superadmin'
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(admin_user_id)
    .execute(&mut **tx)
    .await
    .map_err(|e| format!("Failed to assign superadmin role: {}", e))?;

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
    .map_err(|e| format!("Failed to seed default department setting: {}", e))?;

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
) -> Result<(), String> {
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
        .map_err(|e| format!("Failed to activate basic module {}: {}", module_code, e))?;
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
            return Json(CoreResponse::error(&e));
        }
    };

    // 3. P34-4: auto-activate all basic-tier modules so the new tenant can
    //    use ERP/PM master-data features out of the box. Advanced modules
    //    remain dormant until explicitly activated.
    if let Err(e) = activate_basic_modules(&mut tx, tenant.id).await {
        let _ = tx.rollback().await;
        tracing::error!("Failed to activate basic modules: {}", e);
        return Json(CoreResponse::error(&e));
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

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE id = $1")
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
                created_at: chrono::Utc::now().naive_utc(),
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
        "SELECT id, tenant_id, module_code, module_name, tier, is_active, activated_at, expires_at  FROM core_tenant_modules WHERE tenant_id = $1 ORDER BY activated_at DESC",
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 AND role = $3 AND status = $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 AND role = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND role = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND email ILIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND role = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
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
                "SELECT id, tenant_id, user_id, created_at, last_login  FROM core_tenant_users WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
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
        created_at: chrono::Utc::now().naive_utc(),
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
        updated_at: chrono::Utc::now().naive_utc(),
    };

    Json(CoreResponse::success(metrics, "Usage metrics retrieved"))
}

/// Get billing info
pub async fn get_billing_info(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<CoreResponse<TenantBillingInfo>> {
    tracing::info!("[Tenant] Getting billing info for tenant: {}", id);

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE id = $1")
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
            "SELECT tenant_id FROM core_tenant_users WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
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

    let tenants: Vec<Tenant> = sqlx::query_as(
        "SELECT t.* FROM core_tenants t
         INNER JOIN core_tenant_users tu ON t.id = tu.tenant_id
         WHERE tu.user_id = $1 AND tu.status = 'active' AND tenant_id = $2 
         ORDER BY t.created_at DESC",
    )
    .bind(user_id)
    .bind(
        claims
            .tenant_id
            .as_deref()
            .unwrap_or("00000000-0000-0000-0000-000000000000"),
    )
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
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'",
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
    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE id = $1")
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

    let tenant: Option<Tenant> = sqlx::query_as("SELECT id, name, code, tenant_type, plan, license_type, license_expires_at, database_host, database_port, database_name, quota_users, quota_storage_gb, quota_api_calls, quota_plugins, features, status, trial_expires_at, created_at, updated_at, activated_at, suspended_at  FROM core_tenants WHERE code = $1")
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match tenant {
        Some(t) => Json(CoreResponse::success(t, "Tenant retrieved")),
        None => Json(CoreResponse::error("Tenant not found")),
    }
}
