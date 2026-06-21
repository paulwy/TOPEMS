use chrono::Utc;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
use topems_shared::{api_error, ApiResponse};

pub struct EmployeeService {
    db: PgPool,
}

impl EmployeeService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn list_employees(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
        department_id: Option<Uuid>,
        company_id: Option<Uuid>,
    ) -> ApiResponse<serde_json::Value> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let employees = sqlx::query_as::<_, Employee>(
            r#"
            SELECT id, company_id, department_id, position_id,
                   employee_number, name, gender, hire_date, email, phone, status,
                   created_at, updated_at
            FROM hrm.employees
            WHERE ($1::text IS NULL OR name ILIKE $1 OR employee_number ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::uuid IS NULL OR department_id = $3)
              AND ($4::uuid IS NULL OR company_id = $4)
            ORDER BY created_at DESC
            LIMIT $5 OFFSET $6
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(department_id)
        .bind(company_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.db)
        .await;

        match employees {
            Ok(employees) => {
                let total = sqlx::query_scalar::<_, i64>(
                    r#"
                    SELECT COUNT(*) FROM hrm.employees AS e
                    WHERE ($1::text IS NULL OR e.name ILIKE $1 OR e.employee_number ILIKE $1)
                      AND ($2::text IS NULL OR e.status = $2)
                      AND ($3::uuid IS NULL OR e.department_id = $3)
                      AND ($4::uuid IS NULL OR e.company_id = $4)
                    "#,
                )
                .bind(&search_pattern)
                .bind(&status)
                .bind(department_id)
                .bind(company_id)
                .fetch_one(&self.db)
                .await
                .unwrap_or(0);

                ApiResponse::success(
                    serde_json::json!({
                        "employees": employees,
                        "total": total,
                        "page": page,
                        "page_size": page_size
                    }),
                    "获取员工列表成功",
                )
            }
            Err(e) => {
                tracing::error!("获取员工列表失败: {}", e);
                api_error(500, "获取员工列表失败")
            }
        }
    }

    pub async fn get_employee(&self, id: &Uuid) -> ApiResponse<Employee> {
        let result = sqlx::query_as::<_, Employee>(
            r#"
            SELECT id, company_id, department_id, position_id,
                   employee_number, name, gender, hire_date, email, phone, status,
                   created_at, updated_at
            FROM hrm.employees WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(employee)) => ApiResponse::success(employee, "获取员工成功"),
            Ok(None) => api_error(404, "员工不存在"),
            Err(e) => {
                tracing::error!("获取员工失败: {}", e);
                api_error(500, "获取员工失败")
            }
        }
    }

    pub async fn create_employee(&self, req: CreateEmployeeRequest) -> ApiResponse<Employee> {
        if req.name.is_empty() {
            return api_error(400, "员工姓名不能为空");
        }

        if req.employee_number.is_empty() {
            return api_error(400, "员工编号不能为空");
        }

        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM hrm.employees WHERE employee_number = $1)",
        )
        .bind(&req.employee_number)
        .fetch_one(&self.db)
        .await
        .unwrap_or(false);

        if exists {
            return api_error(409, "员工编号已存在");
        }

        let id = Uuid::new_v4();
        let now = Utc::now();

        let result = sqlx::query_as::<_, Employee>(
            r#"
            INSERT INTO public.employees (
                id, company_id, department_id, position_id,
                employee_number, name, gender, hire_date, email, phone,
                status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12)
            RETURNING id, company_id, department_id, position_id,
                      employee_number, name, gender, hire_date, email, phone, status,
                      created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(req.company_id)
        .bind(req.department_id)
        .bind(req.position_id)
        .bind(&req.employee_number)
        .bind(&req.name)
        .bind(&req.gender)
        .bind(req.hire_date)
        .bind(&req.email)
        .bind(&req.phone)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(employee) => ApiResponse::success(employee, "员工创建成功"),
            Err(e) => {
                tracing::error!("创建员工失败: {}", e);
                api_error(500, "员工创建失败")
            }
        }
    }

    pub async fn update_employee(
        &self,
        id: &Uuid,
        req: UpdateEmployeeRequest,
    ) -> ApiResponse<Employee> {
        let existing = sqlx::query_as::<_, Employee>(
            r#"
            SELECT id, company_id, department_id, position_id,
                   employee_number, name, gender, hire_date, email, phone, status,
                   created_at, updated_at FROM hrm.employees WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await;

        let existing = match existing {
            Ok(Some(e)) => e,
            Ok(None) => return api_error(404, "员工不存在"),
            Err(e) => return api_error(500, &format!("查询员工失败: {}", e)),
        };

        let company_id = req.company_id.or(existing.company_id);
        let department_id = req.department_id.or(existing.department_id);
        let position_id = req.position_id.or(existing.position_id);
        let name = req.name.unwrap_or(existing.name);
        let gender = req.gender.or(existing.gender);
        let hire_date = req.hire_date.or(existing.hire_date);
        let email = req.email.or(existing.email);
        let phone = req.phone.or(existing.phone);
        let status = req.status.unwrap_or(existing.status);
        let now = Utc::now();

        let result = sqlx::query_as::<_, Employee>(
            r#"
            UPDATE public.employees SET
                company_id = $2, department_id = $3, position_id = $4,
                name = $5, gender = $6, hire_date = $7, email = $8, phone = $9,
                status = $10, updated_at = $11
            WHERE id = $1
            RETURNING id, company_id, department_id, position_id,
                      employee_number, name, gender, hire_date, email, phone, status,
                      created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(company_id)
        .bind(department_id)
        .bind(position_id)
        .bind(&name)
        .bind(&gender)
        .bind(hire_date)
        .bind(&email)
        .bind(&phone)
        .bind(&status)
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(employee) => ApiResponse::success(employee, "员工更新成功"),
            Err(e) => {
                tracing::error!("更新员工失败: {}", e);
                api_error(500, "员工更新失败")
            }
        }
    }

    pub async fn delete_employee(&self, id: &Uuid) -> ApiResponse<String> {
        let result = sqlx::query("DELETE FROM hrm.employees WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "员工删除成功"),
            Ok(_) => api_error(404, "员工不存在"),
            Err(e) => {
                tracing::error!("删除员工失败: {}", e);
                api_error(500, "员工删除失败")
            }
        }
    }
}
