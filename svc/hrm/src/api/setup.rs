use axum::{extract::State, routing::*, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::ApiState;
use topems_shared::{api_error, ApiResponse};

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
        .route("/api/v1/hrm/setup/progress", get(get_init_progress))
        .route("/api/v1/hrm/setup/company", post(setup_company_info))
        .route("/api/v1/hrm/setup/departments", post(setup_departments))
        .route("/api/v1/hrm/setup/positions", post(setup_positions))
        .route("/api/v1/hrm/setup/admin", post(setup_admin_user))
        .route("/api/v1/hrm/setup/complete", post(complete_initialization))
}

const DEFAULT_ORG_ID: &str = "00000000-0000-0000-0000-000000000001";
const DEFAULT_COMPANY_ID: &str = "00000000-0000-0000-0000-000000000001";

async fn get_init_progress(
    State(state): State<ApiState>,
) -> Json<ApiResponse<InitProgressResponse>> {
    let org_id = Uuid::parse_str(DEFAULT_ORG_ID).unwrap();

    let steps = sqlx::query_as::<_, InitializationStatus>(
        r#"
        SELECT id, organization_id, step_name, step_order, status, completed_at, created_at, updated_at
        FROM hrm.initialization_status
        WHERE organization_id = $1
        ORDER BY step_order
        "#,
    )
    .bind(org_id)
    .fetch_all(&state.db)
    .await;

    match steps {
        Ok(steps) => {
            let is_completed = steps.iter().all(|s| s.status == "completed");
            let current_step = steps
                .iter()
                .find(|s| s.status != "completed")
                .map(|s| s.step_order)
                .unwrap_or(5);

            let company_result = sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM shared.companies WHERE organization_id = $1 AND name != '我的公司' LIMIT 1"
            )
            .bind(org_id)
            .fetch_optional(&state.db)
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

            Json(ApiResponse::success(
                InitProgressResponse {
                    is_completed,
                    current_step,
                    steps: step_statuses,
                    company_id: company_result.ok().flatten(),
                },
                "获取初始化进度成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取初始化进度失败: {}", e);
            Json(api_error(500, &format!("获取初始化进度失败: {}", e)))
        }
    }
}

async fn setup_company_info(
    State(state): State<ApiState>,
    Json(req): Json<CompanyInfoRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let org_id = Uuid::parse_str(DEFAULT_ORG_ID).unwrap();
    let company_id = Uuid::parse_str(DEFAULT_COMPANY_ID).unwrap();
    let now = Utc::now();

    // 验证必填字段
    if req.name.trim().is_empty() {
        return Json(api_error(400, "公司名称不能为空"));
    }

    // 更新公司信息
    let result = sqlx::query_as::<_, Company>(
        r#"
        UPDATE shared.companies SET
            name = $2,
            short_name = COALESCE($3, short_name),
            registration_number = COALESCE($4, registration_number),
            tax_number = COALESCE($5, tax_number),
            address = COALESCE($6, address),
            contact_phone = COALESCE($7, contact_phone),
            email = COALESCE($8, email),
            website = COALESCE($9, website),
            description = COALESCE($10, description),
            updated_at = $11
        WHERE id = $1
        RETURNING id, organization_id, name, short_name, registration_number, tax_number, address,
                   contact_phone, email, website, description, status, created_at, updated_at
        "#,
    )
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            // 更新初始化状态
            let _ = sqlx::query(
                r#"
                UPDATE hrm.initialization_status
                SET status = 'completed', completed_at = $1, updated_at = $1
                WHERE organization_id = $2 AND step_name = 'company_info'
                "#,
            )
            .bind(now)
            .bind(org_id)
            .execute(&state.db)
            .await;

            // 记录日志
            let _ = sqlx::query(
                r#"
                INSERT INTO hrm.initialization_logs (id, organization_id, step_name, action, new_data, created_at)
                VALUES ($1, $2, 'company_info', 'update', $3, $4)
                "#
            )
            .bind(Uuid::new_v4())
            .bind(org_id)
            .bind(serde_json::json!({ "company_id": company.id, "name": company.name }))
            .bind(now)
            .execute(&state.db)
            .await;

            Json(ApiResponse::success(
                serde_json::json!({ "company_id": company.id, "name": company.name }),
                "公司信息更新成功",
            ))
        }
        Err(e) => {
            tracing::error!("更新公司信息失败: {}", e);
            Json(api_error(500, &format!("更新公司信息失败: {}", e)))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Company {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

async fn setup_departments(
    State(state): State<ApiState>,
    Json(req): Json<DepartmentsBatchRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let org_id = Uuid::parse_str(DEFAULT_ORG_ID).unwrap();
    let company_id = Uuid::parse_str(DEFAULT_COMPANY_ID).unwrap();
    let now = Utc::now();

    if req.departments.is_empty() {
        return Json(api_error(400, "请至少创建一个部门"));
    }

    // 验证名称不重复
    let names: Vec<&String> = req.departments.iter().map(|d| &d.name).collect();
    if names.len() != names.iter().collect::<std::collections::HashSet<_>>().len() {
        return Json(api_error(400, "部门名称不能重复"));
    }

    let mut created_depts = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    for dept in req.departments {
        if dept.name.trim().is_empty() {
            errors.push("部门名称不能为空".to_string());
            continue;
        }

        let id = Uuid::new_v4();
        let result = sqlx::query_as::<_, Department>(
            r#"
            INSERT INTO shared.departments (id, organization_id, company_id, name, code, parent_id, manager_id, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
            RETURNING id, organization_id, company_id, name, code, parent_id, manager_id, description, status, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(org_id)
        .bind(company_id)
        .bind(&dept.name)
        .bind(&dept.code)
        .bind(dept.parent_id)
        .bind(dept.manager_id)
        .bind(&dept.description)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        match result {
            Ok(d) => created_depts.push(d),
            Err(e) => {
                tracing::error!("创建部门失败: {}", e);
                errors.push(format!("创建部门 '{}' 失败", dept.name));
            }
        }
    }

    if created_depts.is_empty() {
        return Json(api_error(
            500,
            &format!("创建部门失败: {}", errors.join(", ")),
        ));
    }

    // 更新初始化状态
    let _ = sqlx::query(
        r#"
        UPDATE hrm.initialization_status
        SET status = 'completed', completed_at = $1, updated_at = $1
        WHERE organization_id = $2 AND step_name = 'departments'
        "#,
    )
    .bind(now)
    .bind(org_id)
    .execute(&state.db)
    .await;

    Json(ApiResponse::success(
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
    ))
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Department {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

async fn setup_positions(
    State(state): State<ApiState>,
    Json(req): Json<PositionsBatchRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let org_id = Uuid::parse_str(DEFAULT_ORG_ID).unwrap();
    let company_id = Uuid::parse_str(DEFAULT_COMPANY_ID).unwrap();
    let now = Utc::now();

    if req.positions.is_empty() {
        return Json(api_error(400, "请至少创建一个职位"));
    }

    let mut created_positions = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    for pos in req.positions {
        if pos.name.trim().is_empty() {
            errors.push("职位名称不能为空".to_string());
            continue;
        }

        let id = Uuid::new_v4();
        let result = sqlx::query_as::<_, Position>(
            r#"
            INSERT INTO hrm.positions (id, organization_id, company_id, department_id, name, code, level, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
            RETURNING id, organization_id, company_id, department_id, name, code, level, description, status, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(org_id)
        .bind(company_id)
        .bind(pos.department_id)
        .bind(&pos.name)
        .bind(&pos.code)
        .bind(pos.level)
        .bind(&pos.description)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        match result {
            Ok(p) => created_positions.push(p),
            Err(e) => {
                tracing::error!("创建职位失败: {}", e);
                errors.push(format!("创建职位 '{}' 失败", pos.name));
            }
        }
    }

    if created_positions.is_empty() {
        return Json(api_error(
            500,
            &format!("创建职位失败: {}", errors.join(", ")),
        ));
    }

    // 更新初始化状态
    let _ = sqlx::query(
        r#"
        UPDATE hrm.initialization_status
        SET status = 'completed', completed_at = $1, updated_at = $1
        WHERE organization_id = $2 AND step_name = 'positions'
        "#,
    )
    .bind(now)
    .bind(org_id)
    .execute(&state.db)
    .await;

    Json(ApiResponse::success(
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
    ))
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Position {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<i32>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

async fn setup_admin_user(
    State(state): State<ApiState>,
    Json(req): Json<AdminUserRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let org_id = Uuid::parse_str(DEFAULT_ORG_ID).unwrap();
    let company_id = Uuid::parse_str(DEFAULT_COMPANY_ID).unwrap();
    let now = Utc::now();

    // 验证必填字段
    if req.name.trim().is_empty() {
        return Json(api_error(400, "管理员姓名不能为空"));
    }
    if req.employee_number.trim().is_empty() {
        return Json(api_error(400, "员工编号不能为空"));
    }
    if req.password.len() < 6 {
        return Json(api_error(400, "密码长度至少6位"));
    }

    // 创建员工
    let employee_id = Uuid::new_v4();
    let hire_date = if let Some(hd) = &req.hire_date {
        chrono::NaiveDate::parse_from_str(hd, "%Y-%m-%d").ok()
    } else {
        Some(now.date_naive())
    };

    let result = sqlx::query_as::<_, Employee>(
        r#"
        INSERT INTO shared.employees (
            id, organization_id, company_id, department_id, position_id,
            employee_number, name, gender, birth_date, hire_date,
            id_card_number, email, phone,
            emergency_contact_name, emergency_contact_phone, address,
            status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active', $17, $18)
        RETURNING id, organization_id, company_id, department_id, position_id,
                  employee_number, name, status, created_at, updated_at
        "#,
    )
    .bind(employee_id)
    .bind(org_id)
    .bind(company_id)
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
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(employee) => {
            // 注意：密码应该通过单独的认证服务处理，这里仅记录
            // 实际密码设置应由 IAM 服务完成

            // 更新初始化状态
            let _ = sqlx::query(
                r#"
                UPDATE hrm.initialization_status
                SET status = 'completed', completed_at = $1, updated_at = $1
                WHERE organization_id = $2 AND step_name = 'admin_user'
                "#,
            )
            .bind(now)
            .bind(org_id)
            .execute(&state.db)
            .await;

            Json(ApiResponse::success(
                serde_json::json!({
                    "employee_id": employee.id,
                    "employee_number": employee.employee_number,
                    "name": employee.name,
                    "message": "管理员账户创建成功，请前往认证服务设置密码"
                }),
                "管理员账户创建成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建管理员账户失败: {}", e);
            Json(api_error(500, &format!("创建管理员账户失败: {}", e)))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employee_number: String,
    pub name: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

async fn complete_initialization(
    State(state): State<ApiState>,
    Json(req): Json<CompleteInitRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let org_id = Uuid::parse_str(DEFAULT_ORG_ID).unwrap();
    let now = Utc::now();

    if !req.confirm {
        return Json(api_error(400, "请确认完成初始化"));
    }

    // 检查前置步骤是否完成
    let steps = sqlx::query_as::<_, InitializationStatus>(
        r#"
        SELECT id, organization_id, step_name, step_order, status, completed_at, created_at, updated_at
        FROM hrm.initialization_status
        WHERE organization_id = $1 AND step_name != 'completion'
        ORDER BY step_order
        "#,
    )
    .bind(org_id)
    .fetch_all(&state.db)
    .await;

    match steps {
        Ok(steps) => {
            let incomplete: Vec<&str> = steps
                .iter()
                .filter(|s| s.status != "completed")
                .map(|s| s.step_name.as_str())
                .collect();

            if !incomplete.is_empty() {
                return Json(api_error(
                    400,
                    &format!("请先完成以下步骤: {}", incomplete.join(", ")),
                ));
            }

            // 更新完成状态
            let _ = sqlx::query(
                r#"
                UPDATE hrm.initialization_status
                SET status = 'completed', completed_at = $1, updated_at = $1
                WHERE organization_id = $2 AND step_name = 'completion'
                "#,
            )
            .bind(now)
            .bind(org_id)
            .execute(&state.db)
            .await;

            Json(ApiResponse::success(
                serde_json::json!({
                    "is_completed": true,
                    "completed_at": now
                }),
                "初始化完成！系统已准备就绪。",
            ))
        }
        Err(e) => {
            tracing::error!("完成初始化失败: {}", e);
            Json(api_error(500, &format!("完成初始化失败: {}", e)))
        }
    }
}
