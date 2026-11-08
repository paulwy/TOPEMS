use axum::{
    extract::{Extension, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashSet;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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
    pub org_id: Option<Uuid>,
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
    pub password: String,
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

const DEFAULT_ORG_ID: Uuid = Uuid::from_u128(0x00000000000000000000000000000001);

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:setup:read"])),
    path = "/setup/progress",
    responses((status = 200, description = "Get init progress")),
    tag = "setup"
)]
pub async fn get_init_progress(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<InitProgressResponse> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    // P2-2：进度行按会话租户归属；首启超管无租户时回退 DEFAULT_ORG_ID（与种子一致）
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    let org_id = tenant_filter.unwrap_or(DEFAULT_ORG_ID);

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
            // P0-2：新库/未播种空集按「未开始」处理——禁止空表 all()=true 误判完成，
            // 禁止 current_step 兜底 5；返回空 steps、current_step=1、未完成。
            if steps.is_empty() {
                return ApiResponse::success(
                    InitProgressResponse {
                        is_completed: false,
                        current_step: 1,
                        steps: vec![],
                        org_id: None,
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

            let company_result = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
                "hrm",
                "SELECT id FROM hrm.companies WHERE tenant_id = $1 AND name != '我的公司' LIMIT 1"
            ))
            .bind(org_id)
            .fetch_optional(&mut **txn)
            .await;

            let step_statuses: Vec<StepStatus> = steps
                .iter()
                .map(|s| {
                    let is_current = s.status != "completed" && s.status != "failed";
                    StepStatus {
                        name: s.step_name.clone(),
                        order: s.step_order,
                        status: s.status.clone(),
                        is_current,
                    }
                })
                .collect();

            ApiResponse::success(
                InitProgressResponse {
                    is_completed,
                    current_step,
                    steps: step_statuses,
                    org_id: company_result.ok().flatten(),
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
    security(("BearerAuth" = ["hrm:setup:write"])),
    path = "/setup/company",
    responses((status = 200, description = "Setup company info")),
    tag = "setup"
)]
pub async fn setup_company_info(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CompanyInfoRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    // P2-2：进度行/公司归属按会话租户；首启超管回退 DEFAULT_ORG_ID（与种子一致）
    let org_id = tenant_filter.unwrap_or(DEFAULT_ORG_ID);

    // 验证必填字段
    if req.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "公司名称不能为空".to_string(),
        ));
    }

    // P1：按租户 upsert——同一租户只保留一个设置主体，重复保存必须更新同一行，
    // 不再每次生成新 id（旧实现 ON CONFLICT (id) + Uuid::new_v4() 必然 INSERT 新公司，
    // 在 code 唯一约束上线后会被打回）。列名以 live DDL 为准：联系邮箱是 contact_email。
    // 可选字段沿用 COALESCE 语义：仅在本次传入时覆盖，未传保留原值。
    let tenant_uuid = tenant_filter.unwrap_or(DEFAULT_ORG_ID);
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
                updated_at = $11
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, tenant_id, organization_id, name, short_name, registration_number,
                      tax_number, address, contact_phone, contact_email, website, description,
                      status, created_at, updated_at
            "#
        ))
        .bind(company_id)
        .bind(&req.name)
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
    } else {
        let company_id = Uuid::new_v4();
        let code = format!("COMP-{}", company_id.simple());
        sqlx::query_as::<_, Company>(only_own_schema_query!(
            "hrm",
            r#"
            INSERT INTO hrm.companies (
                id, tenant_id, code, name, short_name, registration_number,
                tax_number, address, contact_phone, contact_email, website, description,
                status, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                'active', $13, $13
            )
            RETURNING id, tenant_id, organization_id, name, short_name, registration_number,
                      tax_number, address, contact_phone, contact_email, website, description,
                      status, created_at, updated_at
            "#
        ))
        .bind(company_id)
        .bind(tenant_uuid)
        .bind(code)
        .bind(&req.name)
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
            // 更新初始化状态
            let _ = sqlx::query(only_own_schema_query!(
                "hrm",
                r#"
                UPDATE hrm.initialization_status
                SET status = 'completed', completed_at = $1, updated_at = $1
                WHERE tenant_id = $2 AND step_name = 'company_info'
                  AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
                "#
            ))
            .bind(now)
            .bind(org_id)
            .bind(tenant_filter)
            .execute(&mut **txn)
            .await;

            // 记录日志
            let _ = sqlx::query(
                only_own_schema_query!("hrm", r#"
                INSERT INTO hrm.initialization_logs (id, organization_id, tenant_id, step_name, action, new_data, created_at)
                VALUES ($1, $2, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'), 'company_info', 'update', $3, $4)
                "#)
            )
            .bind(Uuid::new_v4())
            .bind(org_id)
            .bind(serde_json::json!({ "org_id": company.id, "name": company.name }))
            .bind(now)
            .execute(&mut **txn)
            .await;

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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<DepartmentsBatchRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    // P2-2：进度行/部门归属按会话租户；首启超管回退 DEFAULT_ORG_ID（与种子一致）
    let org_id = tenant_filter.unwrap_or(DEFAULT_ORG_ID);

    if req.departments.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "请至少创建一个部门".to_string(),
        ));
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
    let dup_dept: Option<String> = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT LOWER(name) FROM hrm.departments
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
          AND LOWER(name) = ANY($2::text[])
        LIMIT 1
        "#
    ))
    .bind(tenant_filter)
    .bind(
        requested_names
            .iter()
            .map(|n| n.to_lowercase())
            .collect::<Vec<_>>(),
    )
    .fetch_optional(&mut **txn)
    .await
    .ok()
    .flatten();
    if let Some(dup) = dup_dept {
        return ApiResponse::from(TopemsError::ResourceAlreadyExists(format!(
            "部门已存在：{dup}"
        )));
    }

    let mut created_depts = Vec::new();
    for dept in req.departments {
        let id = Uuid::new_v4();
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
        .bind(&dept.name)
        .bind(&dept.code)
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

    // 更新初始化状态
    let _ = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.initialization_status
        SET status = 'completed', completed_at = $1, updated_at = $1
        WHERE tenant_id = $2 AND step_name = 'departments'
          AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        "#
    ))
    .bind(now)
    .bind(org_id)
    .bind(tenant_filter)
    .execute(&mut **txn)
    .await;

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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<PositionsBatchRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    // P2-2：进度行/岗位归属按会话租户；首启超管回退 DEFAULT_ORG_ID（与种子一致）
    let org_id = tenant_filter.unwrap_or(DEFAULT_ORG_ID);

    if req.positions.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "请至少创建一个职位".to_string(),
        ));
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
        let found: i64 = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "hrm",
            r#"
            SELECT COUNT(*) FROM hrm.departments
            WHERE deleted_at IS NULL
              AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
              AND id = ANY($2::uuid[])
            "#
        ))
        .bind(tenant_filter)
        .bind(dept_ids.iter().copied().collect::<Vec<_>>())
        .fetch_optional(&mut **txn)
        .await
        .ok()
        .flatten()
        .unwrap_or(0);
        let expected: i64 = i64::try_from(dept_ids.len()).unwrap_or(i64::MAX);
        if found != expected {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "引用的部门不存在或已删除".to_string(),
            ));
        }
    }

    // 库内同名（租户范围，软删除外）提前拦截。
    let dup_pos: Option<String> = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT LOWER(name) FROM hrm.positions
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
          AND LOWER(name) = ANY($2::text[])
        LIMIT 1
        "#
    ))
    .bind(tenant_filter)
    .bind(
        requested_names
            .iter()
            .map(|n| n.to_lowercase())
            .collect::<Vec<_>>(),
    )
    .fetch_optional(&mut **txn)
    .await
    .ok()
    .flatten();
    if let Some(dup) = dup_pos {
        return ApiResponse::from(TopemsError::ResourceAlreadyExists(format!(
            "职位已存在：{dup}"
        )));
    }

    let mut created_positions = Vec::new();
    for pos in req.positions {
        let id = Uuid::new_v4();
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
        .bind(&pos.name)
        .bind(&pos.code)
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

    // 更新初始化状态
    let _ = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.initialization_status
        SET status = 'completed', completed_at = $1, updated_at = $1
        WHERE tenant_id = $2 AND step_name = 'positions'
          AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        "#
    ))
    .bind(now)
    .bind(org_id)
    .bind(tenant_filter)
    .execute(&mut **txn)
    .await;

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
    tag = "setup"
)]
pub async fn setup_admin_user(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<AdminUserRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    // P2-2：进度行/管理员归属按会话租户；首启超管回退 DEFAULT_ORG_ID（与种子一致）
    let org_id = tenant_filter.unwrap_or(DEFAULT_ORG_ID);

    // 验证必填字段
    if req.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "管理员姓名不能为空".to_string(),
        ));
    }
    if req.employee_number.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "员工编号不能为空".to_string(),
        ));
    }
    if req.password.len() < 6 {
        return ApiResponse::from(TopemsError::ValidationFailed("密码长度至少6位".to_string()));
    }

    // 解析可登录用户名：缺省回退 employee_number；格式规则对齐 IAM register
    // （3-20 位字母/数字/下划线）。回退值若含中文/连字符等非法字符，要求显式传 username。
    let username = req
        .username
        .clone()
        .unwrap_or_else(|| req.employee_number.clone());
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
    // 权威去重仍由 IAM 建号端点负责；预检本身失败仅告警放行，绝不阻断本事务。
    let email_norm = req.email.as_ref().map(|e| e.trim().to_string());
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
        Ok(_) => {}
        Err(e) => {
            tracing::warn!("iam.users 占用预检失败（放行，由 IAM 端点权威去重）: {}", e);
        }
    }

    // 创建员工
    let employee_id = Uuid::new_v4();
    let hire_date = if let Some(hd) = &req.hire_date {
        hd.parse::<chrono::NaiveDate>().ok()
    } else {
        Some(now.date_naive())
    };

    let result = sqlx::query_as::<_, Employee>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.employees (
            id, tenant_id, org_id, department_id, position_id,
            employee_number, name, gender, birth_date, hire_date,
            id_card_number, email, phone,
            emergency_contact_name, emergency_contact_phone, address,
            user_id,
            status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11, $12, $13, $14, $15, $16, $17, 'active', $18, $19)
        RETURNING id, tenant_id, org_id, department_id, position_id,
                  employee_number, name, status, created_at, updated_at
        "#),
    )
    .bind(employee_id)
    .bind(org_id)
    .bind(org_id)
    .bind(req.department_id)
    .bind(req.position_id)
    .bind(&req.employee_number)
    .bind(&req.name)
    .bind(&req.gender)
    .bind(&req.birth_date)
    .bind(hire_date)
    .bind(&req.id_card_number)
    .bind(&req.email)
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
            // 此处仅更新本服务的初始化步骤状态。
            let _ = sqlx::query(only_own_schema_query!(
                "hrm",
                r#"
                UPDATE hrm.initialization_status
                SET status = 'completed', completed_at = $1, updated_at = $1
                WHERE tenant_id = $2 AND step_name = 'admin_user'
                  AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
                "#
            ))
            .bind(now)
            .bind(org_id)
            .bind(tenant_filter)
            .execute(&mut **txn)
            .await;

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
            // 员工编号唯一冲突（部分唯一索引 idx_employees_employee_number_unique）→ 友好 409，绝不 500
            let duplicate_employee_number = e
                .as_database_error()
                .and_then(|db| db.code())
                .map(|c| c == "23505")
                .unwrap_or(false);
            if duplicate_employee_number {
                return ApiResponse::from(TopemsError::ResourceAlreadyExists(
                    "员工编号已存在".to_string(),
                ));
            }
            tracing::error!("创建管理员账户失败: {}", e);
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CompleteInitRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    // P2-2：complete 进度归属按会话租户；首启超管回退 DEFAULT_ORG_ID（与种子一致）
    let org_id = tenant_filter.unwrap_or(DEFAULT_ORG_ID);

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
            let incomplete: Vec<&str> = steps
                .iter()
                .filter(|s| s.status != "completed")
                .map(|s| s.step_name.as_str())
                .collect();

            if !incomplete.is_empty() {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "请先完成初始化步骤".to_string(),
                ));
            }

            // P1-1：落租户初始化标记。completion 行即首启闭环标记，进度读取据此判定
            // is_completed。默认角色/权限由 IAM 建号端点分配（方案B，hrm 不跨服务直写
            // core_user_roles，避免孤儿/错位角色行），此处只做结果核验与汇总。
            let _ = sqlx::query(only_own_schema_query!(
                "hrm",
                r#"
                UPDATE hrm.initialization_status
                SET status = 'completed', completed_at = $1, updated_at = $1
                WHERE tenant_id = $2 AND step_name = 'completion'
                  AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
                "#
            ))
            .bind(now)
            .bind(org_id)
            .bind(tenant_filter)
            .execute(&mut **txn)
            .await;

            // 首启结果汇总（租户范围），供前端确认；admin 未绑定 IAM 账号仅告警不阻断。
            let company_count: i64 = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.companies
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
                "#
            ))
            .bind(tenant_filter)
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
            let department_count: i64 = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.departments
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
                "#
            ))
            .bind(tenant_filter)
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
            let position_count: i64 = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.positions
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
                "#
            ))
            .bind(tenant_filter)
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);
            let admin_bound: i64 = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.employees
                WHERE deleted_at IS NULL AND user_id IS NOT NULL
                  AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
                "#
            ))
            .bind(tenant_filter)
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten()
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
