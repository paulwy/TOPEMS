use axum::{
    extract::{Extension, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashSet;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

/// 预检查询失败必须显式 500，不能把 DB 故障当成「0 行」再误报 400「不存在」。
/// 只用于拦非法引用的只读预检；事务已 abort 时仍返回可诊断的服务错误。
macro_rules! precheck_db {
    ($label:literal, $query:expr) => {
        match $query {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("{} 预检失败: {}", $label, e);
                return ApiResponse::from(TopemsError::Internal(format!(
                    "{}校验失败，请稍后重试",
                    $label
                )));
            }
        }
    };
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InitializationStatus {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub step_name: String,
    pub step_order: i32,
    pub status: String,
    pub completed_at: Option<chrono::DateTime<Utc>>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InitProgressResponse {
    pub is_completed: bool,
    pub current_step: i32,
    pub steps: Vec<StepStatus>,
    /// P3-3：语义就是当前租户的公司 id（旧名 org_id 会与 organization_id 混淆）。
    pub company_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StepStatus {
    pub name: String,
    pub order: i32,
    pub status: String,
    pub is_current: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CompanyInfoRequest {
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DepartmentRequest {
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DepartmentsBatchRequest {
    pub departments: Vec<DepartmentRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PositionRequest {
    pub name: String,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub level: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PositionsBatchRequest {
    pub positions: Vec<PositionRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminUserRequest {
    pub name: String,
    pub employee_number: String,
    /// 可登录用户名（可选）。缺省时回退 employee_number；规则与 IAM 一致：
    /// 3-20 位字母/数字/下划线（见 setup_admin_user 内校验）。
    pub username: Option<String>,
    /// 可选：前端先调 IAM 建号端点拿到的 user_id，随本请求回绑到员工档案。
    pub user_id: Option<Uuid>,
    pub gender: Option<String>,
    pub birth_date: Option<String>,
    pub id_card_number: Option<String>,
    pub hire_date: Option<String>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub address: Option<String>,
    /// 仅为兼容旧前端保留；本接口不落库、不校验强度（密码由 IAM 建号端点消费）。
    #[serde(default)]
    pub password: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CompleteInitRequest {
    pub confirm: bool,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/setup/progress", get(get_init_progress))
        .route("/setup/company", post(setup_company_info))
        .route("/setup/departments", post(setup_departments))
        .route("/setup/positions", post(setup_positions))
        .route("/setup/admin", post(setup_admin_user))
        .route("/setup/complete", post(complete_initialization))
}

/// P1-1：初始化向导统一租户解析。
///
/// 超管的 `x-tenant-id` 已由 `tenant_middleware` 写入 `Claims.tenant_id`，
/// 这里不再读 header；服务身份（无租户维度）不允许执行初始化。
/// `resolve_create_tenant` 不过滤 nil UUID，故这里补 `!t.is_nil()`，
/// 避免全零租户绕过 RLS 的 `WITH CHECK`。
fn setup_tenant(claims: &Claims) -> Result<Uuid, TopemsError> {
    match topems_shared_auth::middleware::tenant::resolve_create_tenant(claims) {
        Ok(Some(t)) if !t.is_nil() => Ok(t),
        Ok(Some(_)) => Err(TopemsError::ValidationFailed(
            "租户ID不能为全零".to_string(),
        )),
        Ok(None) => Err(TopemsError::ValidationFailed(
            "服务身份不能执行初始化，请使用租户用户或携带 x-tenant-id 的超管".to_string(),
        )),
        Err((_code, msg)) => Err(TopemsError::ValidationFailed(msg)),
    }
}

/// P1-2：幂等补种当前租户的 5 条进度行。
///
/// 迁移只给默认租户播种，新租户不会重放迁移；读写路径都调用本函数自愈。
/// 依赖 20261124150000 创建的 `(tenant_id, step_name)` 唯一索引。
async fn ensure_init_status_rows(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        INSERT INTO hrm.initialization_status
            (id, tenant_id, step_name, step_order, status, created_at, updated_at)
        SELECT gen_random_uuid(), $1, v.step_name, v.step_order, 'pending', now(), now()
        FROM (VALUES
            ('company_info', 1),
            ('departments', 2),
            ('positions', 3),
            ('admin_user', 4),
            ('completion', 5)
        ) AS v(step_name, step_order)
        ON CONFLICT (tenant_id, step_name) DO NOTHING
        "#
    ))
    .bind(tenant)
    .execute(&mut **txn)
    .await?;
    Ok(())
}

/// P1-2：置完成单步进度；影响行数不为 1 视为进度行缺失，fail-closed 返回 500。
async fn mark_step_completed(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant: Uuid,
    step: &str,
    now: chrono::DateTime<Utc>,
) -> Result<(), TopemsError> {
    let res = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.initialization_status
        SET status = 'completed', completed_at = $1, updated_at = $1
        WHERE tenant_id = $2 AND step_name = $3
        "#
    ))
    .bind(now)
    .bind(tenant)
    .bind(step)
    .execute(&mut **txn)
    .await
    .map_err(|e| TopemsError::Internal(format!("更新初始化进度失败: {e}")))?;

    if res.rows_affected() != 1 {
        tracing::error!(
            "初始化进度行缺失: tenant={}, step={}, affected={}",
            tenant,
            step,
            res.rows_affected()
        );
        return Err(TopemsError::Internal(
            "初始化进度行缺失，请刷新后重试".to_string(),
        ));
    }
    Ok(())
}

/// P2-4：日期字段统一解析，非法值返回 400 而不是落到 SQL `::date` 报 500。
/// P2-4：按 DDL 列宽做前置长度校验（字符数，trim 后）。
fn ensure_max_chars(field: &str, value: Option<&str>, max: usize) -> Result<(), TopemsError> {
    if let Some(v) = value {
        if v.trim().chars().count() > max {
            return Err(TopemsError::ValidationFailed(format!(
                "{field}不能超过{max}个字符"
            )));
        }
    }
    Ok(())
}

fn parse_optional_date(
    field: &str,
    raw: Option<&String>,
) -> Result<Option<chrono::NaiveDate>, TopemsError> {
    match raw.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        None => Ok(None),
        Some(s) => chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
            .map(Some)
            .map_err(|_| {
                TopemsError::ValidationFailed(format!("{field}格式不正确，应为 YYYY-MM-DD"))
            }),
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/setup/progress",
    responses((status = 200, description = "Get init progress")),
    description = "实际门禁：读取需任一 hrm 权限（require_module_access(\"hrm\")）；写操作需 hrm:admin。",
    tag = "setup"
)]
pub async fn get_init_progress(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<InitProgressResponse> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(t) => t,
        None => return ApiResponse::server_error("租户事务缺失，请重试"),
    };
    // P1-1：统一严格解析（含超管的 x-tenant-id；服务身份拒绝）
    let org_id = match setup_tenant(&claims) {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(e),
    };
    // P1-2：读取前幂等补种当前租户的 5 条进度行（迁移只覆盖默认租户）
    if let Err(e) = ensure_init_status_rows(txn, org_id).await {
        tracing::error!("初始化进度补种失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("获取初始化进度失败".to_string()));
    }

    let steps = sqlx::query_as::<_, InitializationStatus>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id AS organization_id, step_name, step_order, status, completed_at, created_at, updated_at
        FROM hrm.initialization_status
        WHERE tenant_id = $1
        ORDER BY step_order
        "#),
    )
    .bind(org_id)
    .fetch_all(&mut **txn)
    .await;

    match steps {
        Ok(steps) => {
            // 补种后正常必有 5 行；空集只可能是异常，仍按「未开始」处理，
            // 绝不允许空表 all()=true 误判完成。
            if steps.is_empty() {
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("rls commit failed (progress): {}", e);
                        return ApiResponse::server_error("提交事务失败");
                    }
                }
                return ApiResponse::success(
                    InitProgressResponse {
                        is_completed: false,
                        current_step: 1,
                        steps: vec![],
                        company_id: None,
                    },
                    "获取初始化进度成功",
                );
            }

            let is_completed = steps.iter().all(|s| s.status == "completed");
            let current_step = steps
                .iter()
                .find(|s| s.status != "completed")
                .map(|s| s.step_order)
                .unwrap_or(5);

            // P3-3：不再用不存在的占位名过滤；进度里的 org_id 语义是当前租户的公司 id。
            let company_result = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
                "hrm",
                "SELECT id FROM hrm.companies WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1"
            ))
            .bind(org_id)
            .fetch_optional(&mut **txn)
            .await;

            let company_id: Option<Uuid> = precheck_db!("公司信息", company_result);

            let step_statuses: Vec<StepStatus> = steps
                .iter()
                .map(|s| {
                    // P2-5：只有当前步是 current，其余未完成一律 pending
                    let is_current = s.status != "completed" && s.step_order == current_step;
                    StepStatus {
                        name: s.step_name.clone(),
                        order: s.step_order,
                        status: s.status.clone(),
                        is_current,
                    }
                })
                .collect();

            // 补种语句属于写操作，读路径也要提交事务，否则请求结束会被回滚。
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed (progress): {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }

            ApiResponse::success(
                InitProgressResponse {
                    is_completed,
                    current_step,
                    steps: step_statuses,
                    company_id,
                },
                "获取初始化进度成功",
            )
        }
        Err(e) => {
            tracing::error!("获取初始化进度失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取初始化进度失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/setup/company",
    responses((status = 200, description = "Setup company info")),
    description = "实际门禁：require_module_write(\"hrm\")，即需 hrm:admin（不存在 hrm:setup:write 权限码）。",
    tag = "setup"
)]
pub async fn setup_company_info(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CompanyInfoRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(t) => t,
        None => return ApiResponse::server_error("租户事务缺失，请重试"),
    };
    let now = Utc::now();
    // P1-1：统一严格解析（含超管的 x-tenant-id；服务身份拒绝）
    let org_id = match setup_tenant(&claims) {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(e),
    };
    // P1-2：写入前确保本租户进度行存在
    if let Err(e) = ensure_init_status_rows(txn, org_id).await {
        tracing::error!("初始化进度补种失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("保存公司信息失败".to_string()));
    }

    // 验证必填字段与 DDL 长度
    let name = req.name.trim().to_string();
    if name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "公司名称不能为空".to_string(),
        ));
    }
    if let Err(e) = ensure_max_chars("公司名称", Some(&name), 255) {
        return ApiResponse::from(e);
    }
    if let Err(e) = ensure_max_chars("公司简称", req.short_name.as_deref(), 100) {
        return ApiResponse::from(e);
    }
    if let Err(e) = ensure_max_chars("注册号", req.registration_number.as_deref(), 100) {
        return ApiResponse::from(e);
    }
    if let Err(e) = ensure_max_chars("税号", req.tax_number.as_deref(), 100) {
        return ApiResponse::from(e);
    }
    if let Err(e) = ensure_max_chars("官网", req.website.as_deref(), 255) {
        return ApiResponse::from(e);
    }

    // P3-5：同租户首存串行化。hrm.companies 允许一租户多公司（company.rs 正常 CRUD
    // 可新增多条），因此不能加 (tenant_id) 唯一索引；用事务级 advisory lock 防止
    // 并发首存各插一条。
    if let Err(e) = sqlx::query("SELECT pg_advisory_xact_lock(hashtext($1::text)::bigint)")
        .bind(format!("hrm_setup_company:{org_id}"))
        .execute(&mut **txn)
        .await
    {
        tracing::error!("公司首存加锁失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("查询公司信息失败".to_string()));
    }

    // P1：按租户 upsert——同一租户只保留一个设置主体，重复保存必须更新同一行，
    // 不再每次生成新 id（旧实现 ON CONFLICT (id) + Uuid::new_v4() 必然 INSERT 新公司，
    // 在 code 唯一约束上线后会被打回）。列名以 live DDL 为准：联系邮箱是 contact_email。
    // 可选字段沿用 COALESCE 语义：仅在本次传入时覆盖，未传保留原值。
    let tenant_uuid = org_id;
    let existing_company: Option<Uuid> = match sqlx::query_scalar(
        "SELECT id FROM hrm.companies WHERE deleted_at IS NULL AND tenant_id = $1 ORDER BY created_at ASC LIMIT 1",
    )
    .bind(tenant_uuid)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("查询公司信息失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询公司信息失败".to_string()));
        }
    };

    let is_update = existing_company.is_some();
    let result = if let Some(company_id) = existing_company {
        sqlx::query_as::<_, Company>(only_own_schema_query!(
            "hrm",
            r#"
            UPDATE hrm.companies SET
                name = $2,
                short_name = COALESCE($3, short_name),
                registration_number = COALESCE($4, registration_number),
                tax_number = COALESCE($5, tax_number),
                address = COALESCE($6, address),
                contact_phone = COALESCE($7, contact_phone),
                contact_email = COALESCE($8, contact_email),
                website = COALESCE($9, website),
                description = COALESCE($10, description),
                organization_id = $11,
                updated_at = $12
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, tenant_id, organization_id, name, short_name, registration_number,
                      tax_number, address, contact_phone, contact_email, website, description,
                      status, created_at, updated_at
            "#
        ))
        .bind(company_id)
        .bind(&name)
        .bind(&req.short_name)
        .bind(&req.registration_number)
        .bind(&req.tax_number)
        .bind(&req.address)
        .bind(&req.contact_phone)
        .bind(&req.email)
        .bind(&req.website)
        .bind(&req.description)
        .bind(org_id)
        .bind(now)
        .fetch_one(&mut **txn)
        .await
    } else {
        let company_id = Uuid::new_v4();
        let code = format!("COMP-{}", company_id.simple());
        sqlx::query_as::<_, Company>(only_own_schema_query!(
            "hrm",
            r#"
            INSERT INTO hrm.companies (
                id, tenant_id, organization_id, code, name, short_name, registration_number,
                tax_number, address, contact_phone, contact_email, website, description,
                status, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                'active', $14, $14
            )
            RETURNING id, tenant_id, organization_id, name, short_name, registration_number,
                      tax_number, address, contact_phone, contact_email, website, description,
                      status, created_at, updated_at
            "#
        ))
        .bind(company_id)
        .bind(tenant_uuid)
        .bind(tenant_uuid)
        .bind(code)
        .bind(&name)
        .bind(&req.short_name)
        .bind(&req.registration_number)
        .bind(&req.tax_number)
        .bind(&req.address)
        .bind(&req.contact_phone)
        .bind(&req.email)
        .bind(&req.website)
        .bind(&req.description)
        .bind(now)
        .fetch_one(&mut **txn)
        .await
    };

    match result {
        Ok(company) => {
            // P1-2：进度置完成，影响 0 行即 500（不再静默成功）
            if let Err(e) = mark_step_completed(txn, org_id, "company_info", now).await {
                return ApiResponse::from(e);
            }

            // P3-4：区分首次创建与更新；日志失败不再静默吞掉
            let action = if is_update { "update" } else { "create" };
            if let Err(e) = sqlx::query(
                only_own_schema_query!("hrm", r#"
                INSERT INTO hrm.initialization_logs (id, organization_id, tenant_id, step_name, action, new_data, created_at)
                VALUES ($1, $2, $3, 'company_info', $4, $5, $6)
                "#)
            )
            .bind(Uuid::new_v4())
            .bind(org_id)
            .bind(tenant_uuid)
            .bind(action)
            .bind(serde_json::json!({ "org_id": company.id, "name": company.name }))
            .bind(now)
            .execute(&mut **txn)
            .await
            {
                tracing::warn!("初始化日志写入失败（不阻断）: {}", e);
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(
                serde_json::json!({ "org_id": company.id, "name": company.name }),
                "公司信息保存成功",
            )
        }
        Err(e) => {
            tracing::error!("保存公司信息失败: {}", e);
            ApiResponse::from(TopemsError::Internal("保存公司信息失败".to_string()))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Company {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/setup/departments",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "setup"
)]
pub async fn setup_departments(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<DepartmentsBatchRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(t) => t,
        None => return ApiResponse::server_error("租户事务缺失，请重试"),
    };
    let now = Utc::now();
    // P1-1：统一严格解析（含超管的 x-tenant-id；服务身份拒绝）
    let org_id = match setup_tenant(&claims) {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(e),
    };
    // P1-2：写入前确保本租户进度行存在
    if let Err(e) = ensure_init_status_rows(txn, org_id).await {
        tracing::error!("初始化进度补种失败: {}", e);
        return ApiResponse::from(TopemsError::Internal(
            "创建部门失败，整批已回滚".to_string(),
        ));
    }

    // P1-3：库内已有部门时允许「无新增」提交——只把该步置完成，不再报「至少录入一个」。
    if req.departments.is_empty() {
        let existing: i64 = precheck_db!(
            "部门数据",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM hrm.departments WHERE tenant_id = $1 AND deleted_at IS NULL"
            ))
            .bind(org_id)
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        if existing == 0 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "请至少创建一个部门".to_string(),
            ));
        }
        if let Err(e) = mark_step_completed(txn, org_id, "departments", now).await {
            return ApiResponse::from(e);
        }
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("rls commit failed (departments): {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
        }
        return ApiResponse::success(
            serde_json::json!({ "created_count": 0, "departments": [] }),
            "部门已存在，本步直接完成",
        );
    }

    // P2-3/P2-4：整批预校验（空名、批次内重名/重码、库内同名），全部通过才写库；
    // 任一失败或 DB 错误都不 commit，请求结束 txn drop 自动回滚整批，杜绝部分成功混杂。
    let mut seen_names: HashSet<String> = HashSet::new();
    let mut seen_codes: HashSet<String> = HashSet::new();
    let mut requested_names: Vec<String> = Vec::new();
    for dept in &req.departments {
        let name = dept.name.trim().to_string();
        if name.is_empty() {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "部门名称不能为空".to_string(),
            ));
        }
        if name.chars().count() > 255 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "部门名称不能超过255个字符".to_string(),
            ));
        }
        let key = name.to_lowercase();
        if !seen_names.insert(key) {
            return ApiResponse::from(TopemsError::ValidationFailed(format!(
                "部门名称重复：{name}"
            )));
        }
        if let Some(code) = dept
            .code
            .as_deref()
            .map(str::trim)
            .filter(|c| !c.is_empty())
        {
            if code.chars().count() > 50 {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "部门编码不能超过50个字符".to_string(),
                ));
            }
            let ckey = code.to_lowercase();
            if !seen_codes.insert(ckey) {
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "部门编码重复：{code}"
                )));
            }
        }
        requested_names.push(name);
    }

    // 库内同名（租户范围，软删除外）提前拦截，避免重复落库。
    let dup_dept: Option<String> = precheck_db!(
        "部门重名",
        sqlx::query_scalar::<_, String>(only_own_schema_query!(
            "hrm",
            r#"
            SELECT LOWER(name) FROM hrm.departments
            WHERE tenant_id = $1
              AND deleted_at IS NULL
              AND LOWER(name) = ANY($2::text[])
            LIMIT 1
            "#
        ))
        .bind(org_id)
        .bind(
            requested_names
                .iter()
                .map(|n| n.to_lowercase())
                .collect::<Vec<_>>(),
        )
        .fetch_optional(&mut **txn)
        .await
    );
    if let Some(dup) = dup_dept {
        return ApiResponse::from(TopemsError::ResourceAlreadyExists(format!(
            "部门已存在：{dup}"
        )));
    }

    // P2-2：上级部门（departments.parent_id）与负责人（employees.id）必须存在、
    // 未删除且属本租户；否则会形成孤儿引用/跨租户引用。
    let mut parent_ids: Vec<Uuid> = Vec::new();
    let mut manager_ids: Vec<Uuid> = Vec::new();
    for dept in &req.departments {
        if let Some(pid) = dept.parent_id {
            parent_ids.push(pid);
        }
        if let Some(mid) = dept.manager_id {
            manager_ids.push(mid);
        }
    }
    parent_ids.sort_unstable();
    parent_ids.dedup();
    manager_ids.sort_unstable();
    manager_ids.dedup();

    if !parent_ids.is_empty() {
        let found: i64 = precheck_db!(
            "上级部门引用",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.departments
                WHERE tenant_id = $1 AND deleted_at IS NULL AND id = ANY($2::uuid[])
                "#
            ))
            .bind(org_id)
            .bind(parent_ids.clone())
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        let expected = i64::try_from(parent_ids.len()).unwrap_or(i64::MAX);
        if found != expected {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "引用的上级部门不存在或不属于当前租户".to_string(),
            ));
        }
    }

    if !manager_ids.is_empty() {
        let found: i64 = precheck_db!(
            "部门负责人引用",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.employees
                WHERE tenant_id = $1 AND deleted_at IS NULL AND id = ANY($2::uuid[])
                "#
            ))
            .bind(org_id)
            .bind(manager_ids.clone())
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        let expected = i64::try_from(manager_ids.len()).unwrap_or(i64::MAX);
        if found != expected {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "引用的部门负责人不存在或不属于当前租户".to_string(),
            ));
        }
    }

    let mut created_depts = Vec::new();
    for dept in req.departments {
        let id = Uuid::new_v4();
        // P2-3：落库值与校验值统一 trim，避免「校验同名、库里不同名」。
        let name = dept.name.trim().to_string();
        let code = dept
            .code
            .as_deref()
            .map(str::trim)
            .filter(|c| !c.is_empty())
            .map(|c| c.to_string());
        let result = sqlx::query_as::<_, Department>(
            only_own_schema_query!("hrm", r#"
            INSERT INTO hrm.departments (id, tenant_id, org_id, name, code, parent_id, manager_id, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
            RETURNING id, tenant_id, org_id, name, code, parent_id, manager_id, description, status, created_at, updated_at
            "#),
        )
        .bind(id)
        .bind(org_id)
        .bind(org_id)
        .bind(&name)
        .bind(&code)
        .bind(dept.parent_id)
        .bind(dept.manager_id)
        .bind(&dept.description)
        .bind(now)
        .bind(now)
        .fetch_one(&mut **txn)
        .await;

        match result {
            Ok(d) => created_depts.push(d),
            Err(e) => {
                tracing::error!("创建部门失败，整批回滚: {}", e);
                // 不 commit：请求结束 txn drop 自动回滚整批，绝不部分提交。
                return ApiResponse::from(TopemsError::Internal(
                    "创建部门失败，整批已回滚".to_string(),
                ));
            }
        }
    }

    // P1-2：进度置完成，影响 0 行即 500
    if let Err(e) = mark_step_completed(txn, org_id, "departments", now).await {
        return ApiResponse::from(e);
    }

    // 4.4 修复：与 company 步同构提交 RLS 事务。中间件逐请求 begin 注入 txn，
    // 不 commit 则请求结束 txn drop 自动回滚——此前接口返回成功但数据未持久化。
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed (departments): {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    ApiResponse::success(
        serde_json::json!({
            "created_count": created_depts.len(),
            "departments": created_depts.iter().map(|d| {
                serde_json::json!({
                    "id": d.id,
                    "name": d.name,
                    "code": d.code
                })
            }).collect::<Vec<_>>()
        }),
        &format!("成功创建 {} 个部门", created_depts.len()),
    )
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Department {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub org_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/setup/positions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "setup"
)]
pub async fn setup_positions(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<PositionsBatchRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(t) => t,
        None => return ApiResponse::server_error("租户事务缺失，请重试"),
    };
    let now = Utc::now();
    // P1-1：统一严格解析（含超管的 x-tenant-id；服务身份拒绝）
    let org_id = match setup_tenant(&claims) {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(e),
    };
    // P1-2：写入前确保本租户进度行存在
    if let Err(e) = ensure_init_status_rows(txn, org_id).await {
        tracing::error!("初始化进度补种失败: {}", e);
        return ApiResponse::from(TopemsError::Internal(
            "创建职位失败，整批已回滚".to_string(),
        ));
    }

    // P1-3：库内已有岗位时允许「无新增」提交——只把该步置完成。
    if req.positions.is_empty() {
        let existing: i64 = precheck_db!(
            "岗位数据",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM hrm.positions WHERE tenant_id = $1 AND deleted_at IS NULL"
            ))
            .bind(org_id)
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        if existing == 0 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "请至少创建一个职位".to_string(),
            ));
        }
        if let Err(e) = mark_step_completed(txn, org_id, "positions", now).await {
            return ApiResponse::from(e);
        }
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("rls commit failed (positions): {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
        }
        return ApiResponse::success(
            serde_json::json!({ "created_count": 0, "positions": [] }),
            "职位已存在，本步直接完成",
        );
    }

    // P2-3/P2-4：整批预校验（空名、批次内重名/重码、库内同名、部门归属存在性），
    // 全部通过才写库；任一失败或 DB 错误都不 commit，txn drop 自动回滚整批。
    let mut seen_names: HashSet<String> = HashSet::new();
    let mut seen_codes: HashSet<String> = HashSet::new();
    let mut requested_names: Vec<String> = Vec::new();
    let mut dept_ids: HashSet<Uuid> = HashSet::new();
    for pos in &req.positions {
        let name = pos.name.trim().to_string();
        if name.is_empty() {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "职位名称不能为空".to_string(),
            ));
        }
        if name.chars().count() > 255 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "职位名称不能超过255个字符".to_string(),
            ));
        }
        let key = name.to_lowercase();
        if !seen_names.insert(key) {
            return ApiResponse::from(TopemsError::ValidationFailed(format!(
                "职位名称重复：{name}"
            )));
        }
        if let Some(code) = pos.code.as_deref().map(str::trim).filter(|c| !c.is_empty()) {
            if code.chars().count() > 50 {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "职位编码不能超过50个字符".to_string(),
                ));
            }
            let ckey = code.to_lowercase();
            if !seen_codes.insert(ckey) {
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "职位编码重复：{code}"
                )));
            }
        }
        requested_names.push(name);
        if let Some(did) = pos.department_id {
            dept_ids.insert(did);
        }
    }

    // P2-4：岗位引用的部门必须存在且属本租户，杜绝孤儿岗位（应用层外键防护）。
    if !dept_ids.is_empty() {
        let found: i64 = precheck_db!(
            "岗位部门引用",
            sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.departments
                WHERE tenant_id = $1
                  AND deleted_at IS NULL
                  AND id = ANY($2::uuid[])
                "#
            ))
            .bind(org_id)
            .bind(dept_ids.iter().copied().collect::<Vec<_>>())
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        let expected: i64 = i64::try_from(dept_ids.len()).unwrap_or(i64::MAX);
        if found != expected {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "引用的部门不存在或已删除".to_string(),
            ));
        }
    }

    // 库内同名（租户范围，软删除外）提前拦截。
    let dup_pos: Option<String> = precheck_db!(
        "岗位重名",
        sqlx::query_scalar::<_, String>(only_own_schema_query!(
            "hrm",
            r#"
            SELECT LOWER(name) FROM hrm.positions
            WHERE tenant_id = $1
              AND deleted_at IS NULL
              AND LOWER(name) = ANY($2::text[])
            LIMIT 1
            "#
        ))
        .bind(org_id)
        .bind(
            requested_names
                .iter()
                .map(|n| n.to_lowercase())
                .collect::<Vec<_>>(),
        )
        .fetch_optional(&mut **txn)
        .await
    );
    if let Some(dup) = dup_pos {
        return ApiResponse::from(TopemsError::ResourceAlreadyExists(format!(
            "职位已存在：{dup}"
        )));
    }

    let mut created_positions = Vec::new();
    for pos in req.positions {
        let id = Uuid::new_v4();
        // P2-3：落库值与校验值统一 trim。
        let name = pos.name.trim().to_string();
        let code = pos
            .code
            .as_deref()
            .map(str::trim)
            .filter(|c| !c.is_empty())
            .map(|c| c.to_string());
        let result = sqlx::query_as::<_, Position>(
            only_own_schema_query!("hrm", r#"
            INSERT INTO hrm.positions (id, tenant_id, org_id, department_id, name, code, level, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
            RETURNING id, tenant_id, org_id, department_id, name, code, level, description, status, created_at, updated_at
            "#),
        )
        .bind(id)
        .bind(org_id)
        .bind(org_id)
        .bind(pos.department_id)
        .bind(&name)
        .bind(&code)
        .bind(pos.level)
        .bind(&pos.description)
        .bind(now)
        .bind(now)
        .fetch_one(&mut **txn)
        .await;

        match result {
            Ok(p) => created_positions.push(p),
            Err(e) => {
                tracing::error!("创建职位失败，整批回滚: {}", e);
                // 不 commit：请求结束 txn drop 自动回滚整批，绝不部分提交。
                return ApiResponse::from(TopemsError::Internal(
                    "创建职位失败，整批已回滚".to_string(),
                ));
            }
        }
    }

    // P1-2：进度置完成，影响 0 行即 500
    if let Err(e) = mark_step_completed(txn, org_id, "positions", now).await {
        return ApiResponse::from(e);
    }

    // 4.4 修复：提交 RLS 事务（否则请求结束自动回滚）。
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed (positions): {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    ApiResponse::success(
        serde_json::json!({
            "created_count": created_positions.len(),
            "positions": created_positions.iter().map(|p| {
                serde_json::json!({
                    "id": p.id,
                    "name": p.name,
                    "code": p.code
                })
            }).collect::<Vec<_>>()
        }),
        &format!("成功创建 {} 个职位", created_positions.len()),
    )
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Position {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub org_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<i32>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// P0-3 方案选择：采用【方案B：跨服务走既有 IAM 建号端点，hrm 只建员工并回绑 user_id】。
//
// 为何不选方案A（hrm 同库直写 iam.users/core_users/core_user_roles）：
// 1. 登录源唯一是 iam.users（auth.rs login 只查 iam.users；core_sessions/refresh_tokens
//    的 user_id 外键也指向 iam.users.id），而 public.core_users 与 iam.users 是两张不同步
//    的表（id 空间 overlap=0）；core_user_roles.user_id 外键引用 core_users(id)，
//    hrm 无法在同一 RLS 事务内同时保证三表一致，强写会制造孤儿/错位角色行。
// 2. core_users/core_roles 带 RLS 租户策略，角色目录（core_roles）归 unified-core 所有，
//    测试库无 admin/superadmin 角色；由 hrm 直写用户表/建角色会绕过 IAM 的去重、审计、
//    邮箱校验与角色目录管理，破坏建号权威边界（权威在 unified-core）。
// 3. 因此本接口只负责 hrm.employees 建档与 user_id 回绑；账号开通由前端向导串联既有
//    IAM 端点完成（见成功响应 message 与下方「前端衔接」注释）。
//
// 前端衔接（方案B）：
//   1. 收集管理员姓名/员工编号/用户名/邮箱/密码；
//   2. 先调 unified-core 既有建号端点 POST /api/core/iam/users（或公开注册端点
//      /api/core/iam/auth/register），传 username/email/password/full_name，
//      拿到返回的 data.id（IAM user_id）；
//   3. 再调 POST /api/hrm/setup/admin，带上 user_id 完成员工档案与账号绑定；
//      本接口不保存密码、不写 iam.users，密码哈希由 IAM 端点负责。
#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/setup/admin",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Validation failed"),
        (status = 409, description = "Username or employee number already exists"),
        (status = 500, description = "Internal server error")
    ),
    description = "实际门禁：require_module_write(\"hrm\") 即 hrm:admin；前端第 4 步还会先调 IAM POST /users 建号，另需 admin:iam:write 或租户用户写权限。",
    tag = "setup"
)]
pub async fn setup_admin_user(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<AdminUserRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(t) => t,
        None => return ApiResponse::server_error("租户事务缺失，请重试"),
    };
    let now = Utc::now();
    // P1-1：统一严格解析（含超管的 x-tenant-id；服务身份拒绝）
    let org_id = match setup_tenant(&claims) {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(e),
    };
    // P1-2：写入前确保本租户进度行存在
    if let Err(e) = ensure_init_status_rows(txn, org_id).await {
        tracing::error!("初始化进度补种失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("创建管理员账户失败".to_string()));
    }

    // 验证必填字段与 DDL 长度
    let name = req.name.trim().to_string();
    let employee_number = req.employee_number.trim().to_string();
    if name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "管理员姓名不能为空".to_string(),
        ));
    }
    if employee_number.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "员工编号不能为空".to_string(),
        ));
    }
    if let Err(e) = ensure_max_chars("管理员姓名", Some(&name), 255) {
        return ApiResponse::from(e);
    }
    if let Err(e) = ensure_max_chars("员工编号", Some(&employee_number), 50) {
        return ApiResponse::from(e);
    }
    // P3-1：password 由 IAM 建号端点消费，本接口只做兼容接收，不再强制长度。

    // 解析可登录用户名：缺省回退 employee_number；格式规则对齐 IAM register
    // （3-20 位字母/数字/下划线）。回退值若含中文/连字符等非法字符，要求显式传 username。
    let username = req
        .username
        .clone()
        .unwrap_or_else(|| employee_number.clone());
    let username = username.trim().to_string();
    let username_valid = username.len() >= 3
        && username.len() <= 20
        && username
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_');
    if !username_valid {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "用户名必须为3-20个字符，只允许字母、数字和下划线；未传 username 时回退员工编号，员工编号不符合规则时请显式提供 username".to_string(),
        ));
    }

    // 邮箱格式轻校验（权威校验在 IAM 建号端点；此处提前给出 400 而非落到 500）
    if let Some(email) = &req.email {
        let email = email.trim();
        if !email.contains('@') || !email.contains('.') {
            return ApiResponse::from(TopemsError::ValidationFailed("邮箱格式不正确".to_string()));
        }
    }

    // 只读预检 iam.users 的用户名/邮箱占用（跨 schema 只读，第三参数显式白名单 "iam"）。
    // 权威去重仍由 IAM 建号端点负责；预检失败要真正放行，必须用 SAVEPOINT 包住：
    // PostgreSQL 中一条语句失败会把整个事务置为 aborted，后面的查询/写入会全部报错，
    // 仅 `.ok()` 吞掉返回值并不能让事务继续。
    let email_norm = req.email.as_ref().map(|e| e.trim().to_string());
    if let Err(e) = sqlx::query("SAVEPOINT iam_users_precheck")
        .execute(&mut **txn)
        .await
    {
        tracing::error!("创建 iam.users 预检 savepoint 失败: {}", e);
        return ApiResponse::from(TopemsError::Internal(
            "管理员预检初始化失败，请稍后重试".to_string(),
        ));
    }
    let precheck: Result<Option<i64>, sqlx::Error> =
        sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "hrm",
            r#"
            SELECT COUNT(*) FROM iam.users
            WHERE deleted_at IS NULL
              AND (username = $1 OR ($2::text IS NOT NULL AND email = $2))
            "#,
            "iam"
        ))
        .bind(&username)
        .bind(&email_norm)
        .fetch_optional(&mut **txn)
        .await;
    match precheck {
        Ok(Some(n)) if n > 0 => {
            if let Err(e) = sqlx::query("RELEASE SAVEPOINT iam_users_precheck")
                .execute(&mut **txn)
                .await
            {
                tracing::error!("释放 iam.users 预检 savepoint 失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "管理员预检收尾失败，请稍后重试".to_string(),
                ));
            }
            // 区分冲突类型给出友好 409（只读预检已命中即提前拒绝）；
            // 二次诊断查询本身失败时回退通用冲突文案，不误判为另一种冲突。
            let name_taken = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL AND username = $1",
                "iam"
            ))
            .bind(&username)
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten();
            let message = match name_taken {
                Some(c) if c > 0 => "用户名已存在".to_string(),
                Some(_) => "邮箱已被占用".to_string(),
                None => "用户名或邮箱已被占用".to_string(),
            };
            return ApiResponse::from(TopemsError::ResourceAlreadyExists(message));
        }
        Ok(_) => {
            if let Err(e) = sqlx::query("RELEASE SAVEPOINT iam_users_precheck")
                .execute(&mut **txn)
                .await
            {
                tracing::error!("释放 iam.users 预检 savepoint 失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "管理员预检收尾失败，请稍后重试".to_string(),
                ));
            }
        }
        Err(e) => {
            // 失败后先回滚到 savepoint 恢复事务可用状态，再释放、告警放行。
            if let Err(rb) = sqlx::query("ROLLBACK TO SAVEPOINT iam_users_precheck")
                .execute(&mut **txn)
                .await
            {
                tracing::error!("回滚 iam.users 预检 savepoint 失败: {}", rb);
                return ApiResponse::from(TopemsError::Internal(
                    "管理员预检恢复失败，请稍后重试".to_string(),
                ));
            }
            if let Err(rb) = sqlx::query("RELEASE SAVEPOINT iam_users_precheck")
                .execute(&mut **txn)
                .await
            {
                tracing::error!("释放 iam.users 预检 savepoint 失败: {}", rb);
                return ApiResponse::from(TopemsError::Internal(
                    "管理员预检收尾失败，请稍后重试".to_string(),
                ));
            }
            tracing::warn!(
                "iam.users 占用预检失败（已回滚 savepoint 并放行，由 IAM 端点权威去重）: {}",
                e
            );
        }
    }

    // P2-2 / P3-1：管理员引用的部门、岗位、IAM 账号必须存在、未删除且属本租户。
    if let Some(did) = req.department_id {
        let found: i64 = precheck_db!(
            "管理员部门引用",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM hrm.departments WHERE tenant_id = $1 AND deleted_at IS NULL AND id = $2"
            ))
            .bind(org_id)
            .bind(did)
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        if found == 0 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "引用的部门不存在或不属于当前租户".to_string(),
            ));
        }
    }
    if let Some(pid) = req.position_id {
        let found: i64 = precheck_db!(
            "管理员岗位引用",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM hrm.positions WHERE tenant_id = $1 AND deleted_at IS NULL AND id = $2"
            ))
            .bind(org_id)
            .bind(pid)
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        if found == 0 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "引用的岗位不存在或不属于当前租户".to_string(),
            ));
        }
    }
    if let Some(uid) = req.user_id {
        let exists: i64 = precheck_db!(
            "IAM 账号引用",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM iam.users WHERE id = $1 AND deleted_at IS NULL",
                "iam"
            ))
            .bind(uid)
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        if exists == 0 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "关联的 IAM 账号不存在".to_string(),
            ));
        }
        // iam.users 无 tenant 列，租户成员关系查 core_tenant_users。
        let member: i64 = precheck_db!(
            "租户成员关系",
            sqlx::query_scalar(only_own_schema_query!(
                "hrm",
                "SELECT COUNT(*) FROM core_tenant_users WHERE tenant_id = $1 AND user_id = $2"
            ))
            .bind(org_id)
            .bind(uid)
            .fetch_optional(&mut **txn)
            .await
        )
        .unwrap_or(0);
        if member == 0 {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "该 IAM 账号不属于当前租户".to_string(),
            ));
        }
    }

    // P2-4：日期非法直接 400，不再静默 None 或落到 SQL `::date` 报 500。
    let birth_date = match parse_optional_date("出生日期", req.birth_date.as_ref()) {
        Ok(d) => d,
        Err(e) => return ApiResponse::from(e),
    };
    let hire_date = match parse_optional_date("入职日期", req.hire_date.as_ref()) {
        Ok(Some(d)) => Some(d),
        Ok(None) => Some(now.date_naive()),
        Err(e) => return ApiResponse::from(e),
    };

    // 创建员工
    let employee_id = Uuid::new_v4();

    let result = sqlx::query_as::<_, Employee>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.employees (
            id, tenant_id, org_id, department_id, position_id,
            employee_number, name, gender, birth_date, hire_date,
            id_card_number, email, phone,
            emergency_contact_name, emergency_contact_phone, address,
            user_id,
            status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active', $18, $19)
        RETURNING id, tenant_id, org_id, department_id, position_id,
                  employee_number, name, status, created_at, updated_at
        "#),
    )
    .bind(employee_id)
    .bind(org_id)
    .bind(org_id)
    .bind(req.department_id)
    .bind(req.position_id)
    .bind(&employee_number)
    .bind(&name)
    .bind(&req.gender)
    .bind(birth_date)
    .bind(hire_date)
    .bind(&req.id_card_number)
    .bind(email_norm.clone())
    .bind(&req.phone)
    .bind(&req.emergency_contact_name)
    .bind(&req.emergency_contact_phone)
    .bind(&req.address)
    .bind(req.user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(employee) => {
            // 方案B：hrm 不落密码哈希、不写 iam.users；账号开通由前端串联 IAM 建号端点。
            // P1-2：进度置完成，影响 0 行即 500。
            if let Err(e) = mark_step_completed(txn, org_id, "admin_user", now).await {
                return ApiResponse::from(e);
            }

            // 4.4 修复：提交 RLS 事务（否则请求结束自动回滚）。
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed (admin): {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }

            let bound = req.user_id.is_some();
            let message = if bound {
                "管理员员工档案已创建并关联 IAM 账号，可使用该账号登录".to_string()
            } else {
                "员工档案已创建；账号由统一认证服务开通：请先调用 IAM 建号端点（POST /api/core/iam/users，传 username/email/password/full_name），再将返回的 user_id 回传本接口完成绑定".to_string()
            };
            ApiResponse::success(
                serde_json::json!({
                    "employee_id": employee.id,
                    "employee_number": employee.employee_number,
                    "name": employee.name,
                    "username": username,
                    "user_id": req.user_id,
                    "bound": bound,
                    "message": message
                }),
                "管理员员工档案创建成功",
            )
        }
        Err(e) => {
            // P2-4：按约束名分支，只有员工编号唯一索引冲突才是 409；
            // 其他唯一约束（例如未来新增 user_id 唯一）不再误报「员工编号已存在」。
            let constraint = e
                .as_database_error()
                .and_then(|db| db.constraint().map(str::to_string));
            if constraint.as_deref() == Some("idx_employees_employee_number_unique") {
                return ApiResponse::from(TopemsError::ResourceAlreadyExists(
                    "员工编号已存在".to_string(),
                ));
            }
            tracing::error!("创建管理员账户失败: {} (constraint={:?})", e, constraint);
            ApiResponse::from(TopemsError::Internal("创建管理员账户失败".to_string()))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub org_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employee_number: String,
    pub name: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/setup/complete",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "setup"
)]
pub async fn complete_initialization(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CompleteInitRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(t) => t,
        None => return ApiResponse::server_error("租户事务缺失，请重试"),
    };
    let now = Utc::now();
    // P1-1：统一严格解析（含超管的 x-tenant-id；服务身份拒绝）
    let org_id = match setup_tenant(&claims) {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(e),
    };
    // P1-2：写入前确保本租户进度行存在
    if let Err(e) = ensure_init_status_rows(txn, org_id).await {
        tracing::error!("初始化进度补种失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("完成初始化失败".to_string()));
    }

    if !req.confirm {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "请确认完成初始化".to_string(),
        ));
    }

    // 检查前置步骤是否完成
    let steps = sqlx::query_as::<_, InitializationStatus>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id AS organization_id, step_name, step_order, status, completed_at, created_at, updated_at
        FROM hrm.initialization_status
        WHERE tenant_id = $1 AND step_name != 'completion'
        ORDER BY step_order
        "#),
    )
    .bind(org_id)
    .fetch_all(&mut **txn)
    .await;

    match steps {
        Ok(steps) => {
            // P1-2：fail-closed——必须恰有 4 条前置步骤且全部 completed；
            // 空集/缺行不再放行（旧实现空集时 incomplete 为空 → 直接判完成）。
            let incomplete: Vec<&str> = steps
                .iter()
                .filter(|s| s.status != "completed")
                .map(|s| s.step_name.as_str())
                .collect();

            if steps.len() < 4 || !incomplete.is_empty() {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "请先完成初始化步骤".to_string(),
                ));
            }

            // P1-1：落租户初始化标记。completion 行即首启闭环标记，进度读取据此判定
            // is_completed。默认角色/权限由 IAM 建号端点分配（方案B，hrm 不跨服务直写
            // core_user_roles，避免孤儿/错位角色行），此处只做结果核验与汇总。
            // P1-2：影响 0 行即 500，不得返回成功。
            if let Err(e) = mark_step_completed(txn, org_id, "completion", now).await {
                return ApiResponse::from(e);
            }

            // 首启结果汇总（租户范围），供前端确认；admin 未绑定 IAM 账号仅告警不阻断。
            let company_count: i64 = precheck_db!(
                "公司汇总",
                sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                    "hrm",
                    r#"
                    SELECT COUNT(*) FROM hrm.companies
                    WHERE tenant_id = $1 AND deleted_at IS NULL
                    "#
                ))
                .bind(org_id)
                .fetch_optional(&mut **txn)
                .await
            )
            .unwrap_or(0);
            let department_count: i64 = precheck_db!(
                "部门汇总",
                sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                    "hrm",
                    r#"
                    SELECT COUNT(*) FROM hrm.departments
                    WHERE tenant_id = $1 AND deleted_at IS NULL
                    "#
                ))
                .bind(org_id)
                .fetch_optional(&mut **txn)
                .await
            )
            .unwrap_or(0);
            let position_count: i64 = precheck_db!(
                "岗位汇总",
                sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                    "hrm",
                    r#"
                    SELECT COUNT(*) FROM hrm.positions
                    WHERE tenant_id = $1 AND deleted_at IS NULL
                    "#
                ))
                .bind(org_id)
                .fetch_optional(&mut **txn)
                .await
            )
            .unwrap_or(0);
            let admin_bound: i64 = precheck_db!(
                "管理员绑定汇总",
                sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                    "hrm",
                    r#"
                    SELECT COUNT(*) FROM hrm.employees
                    WHERE tenant_id = $1 AND deleted_at IS NULL AND user_id IS NOT NULL
                    "#
                ))
                .bind(org_id)
                .fetch_optional(&mut **txn)
                .await
            )
            .unwrap_or(0);
            let admin_bound = admin_bound > 0;

            // 4.4 修复：提交 RLS 事务（否则请求结束自动回滚）。
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed (complete): {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }

            let message = if admin_bound {
                "初始化完成！系统已准备就绪。".to_string()
            } else {
                "初始化已完成；管理员员工档案尚未绑定 IAM 账号：请先在统一认证开通账号并分配默认角色/权限，再用该账号登录。".to_string()
            };
            ApiResponse::success(
                serde_json::json!({
                    "is_completed": true,
                    "completed_at": now,
                    "admin_bound": admin_bound,
                    "summary": {
                        "company_count": company_count,
                        "department_count": department_count,
                        "position_count": position_count
                    }
                }),
                &message,
            )
        }
        Err(e) => {
            tracing::error!("完成初始化失败: {}", e);
            ApiResponse::from(TopemsError::Internal("完成初始化失败".to_string()))
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn claims(tenant: Option<&str>, superuser: bool, role: &str) -> Claims {
        Claims {
            sub: Uuid::new_v4().to_string(),
            username: "tester".to_string(),
            role: role.to_string(),
            roles: vec![role.to_string()],
            permissions: vec![],
            is_superuser: superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant.map(str::to_string),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn setup_tenant_accepts_superuser_with_explicit_tenant() {
        let t = Uuid::new_v4();
        let c = claims(Some(&t.to_string()), true, "superadmin");
        assert_eq!(setup_tenant(&c).ok(), Some(t));
    }

    #[test]
    fn setup_tenant_rejects_missing_nil_and_service() {
        assert!(setup_tenant(&claims(None, true, "superadmin")).is_err());
        assert!(setup_tenant(&claims(Some(&Uuid::nil().to_string()), true, "admin")).is_err());
        assert!(setup_tenant(&claims(None, false, "service")).is_err());
    }

    #[test]
    fn parse_optional_date_validates_format() {
        let ok = Some("2026-01-02".to_string());
        assert!(parse_optional_date("出生日期", ok.as_ref()).is_ok());
        let bad = Some("2020-13-40".to_string());
        assert!(parse_optional_date("出生日期", bad.as_ref()).is_err());
        let blank = Some("   ".to_string());
        assert_eq!(
            parse_optional_date("入职日期", blank.as_ref()).unwrap(),
            None
        );
    }

    #[test]
    fn ensure_max_chars_counts_chars_not_bytes() {
        let long = "名".repeat(256);
        assert!(ensure_max_chars("公司名称", Some(&long), 255).is_err());
        let ok = "名".repeat(255);
        assert!(ensure_max_chars("公司名称", Some(&ok), 255).is_ok());
        assert!(ensure_max_chars("官网", None, 255).is_ok());
    }
}
