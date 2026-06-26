use chrono::Utc;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
use topems_shared::{api_error, ApiResponse, FieldEncryptionService};

pub struct EmployeeService {
    db: PgPool,
    encryption: FieldEncryptionService,
}

impl EmployeeService {
    pub fn new(db: PgPool, encryption: FieldEncryptionService) -> Self {
        Self { db, encryption }
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
                   employee_number, name, gender, hire_date, email, phone, 
                   id_card_number, address, status,
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
            Ok(mut employees) => {
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

                for emp in employees.iter_mut() {
                    let _ = emp.decrypt_fields(&self.encryption);
                }

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
                   employee_number, name, gender, hire_date, email, phone,
                   id_card_number, address, status,
                   created_at, updated_at
            FROM hrm.employees WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(mut employee)) => {
                let _ = employee.decrypt_fields(&self.encryption);
                ApiResponse::success(employee, "获取员工成功")
            }
            Ok(None) => api_error(404, "员工不存在"),
            Err(e) => {
                tracing::error!("获取员工失败: {}", e);
                api_error(500, "获取员工失败")
            }
        }
    }

    pub async fn create_employee(&self, mut req: CreateEmployeeRequest) -> ApiResponse<Employee> {
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

        let encrypted_phone = match &req.phone {
            Some(p) if !p.is_empty() => {
                Some(self.encryption.encrypt_to_string(p).unwrap_or_else(|e| {
                    tracing::warn!("手机号加密失败: {}", e);
                    p.clone()
                }))
            }
            Some(p) => Some(p.clone()),
            None => None,
        };

        let encrypted_email = match &req.email {
            Some(e) if !e.is_empty() => {
                Some(self.encryption.encrypt_to_string(e).unwrap_or_else(|err| {
                    tracing::warn!("邮箱加密失败: {}", err);
                    e.clone()
                }))
            }
            Some(e) => Some(e.clone()),
            None => None,
        };

        let encrypted_id_card = match &req.id_card_number {
            Some(idc) if !idc.is_empty() => {
                Some(self.encryption.encrypt_to_string(idc).unwrap_or_else(|e| {
                    tracing::warn!("身份证号加密失败: {}", e);
                    idc.clone()
                }))
            }
            Some(idc) => Some(idc.clone()),
            None => None,
        };

        let encrypted_address = match &req.address {
            Some(a) if !a.is_empty() => {
                Some(self.encryption.encrypt_to_string(a).unwrap_or_else(|e| {
                    tracing::warn!("地址加密失败: {}", e);
                    a.clone()
                }))
            }
            Some(a) => Some(a.clone()),
            None => None,
        };

        let result = sqlx::query_as::<_, Employee>(
            r#"
            INSERT INTO hrm.employees (
                id, company_id, department_id, position_id,
                employee_number, name, gender, hire_date, email, phone,
                id_card_number, address,
                status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14)
            RETURNING id, company_id, department_id, position_id,
                      employee_number, name, gender, hire_date, email, phone,
                      id_card_number, address, status,
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
        .bind(&encrypted_email)
        .bind(&encrypted_phone)
        .bind(&encrypted_id_card)
        .bind(&encrypted_address)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(mut employee) => {
                let _ = employee.decrypt_fields(&self.encryption);
                ApiResponse::success(employee, "员工创建成功")
            }
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
                   employee_number, name, gender, hire_date, email, phone,
                   id_card_number, address, status,
                   created_at, updated_at FROM hrm.employees WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await;

        let mut existing = match existing {
            Ok(Some(e)) => e,
            Ok(None) => return api_error(404, "员工不存在"),
            Err(e) => return api_error(500, &format!("查询员工失败: {}", e)),
        };

        let _ = existing.decrypt_fields(&self.encryption);

        let company_id = req.company_id.or(existing.company_id);
        let department_id = req.department_id.or(existing.department_id);
        let position_id = req.position_id.or(existing.position_id);
        let name = req.name.unwrap_or(existing.name);
        let gender = req.gender.or(existing.gender);
        let hire_date = req.hire_date.or(existing.hire_date);
        let status = req.status.unwrap_or(existing.status);
        let now = Utc::now();

        let new_email = req.email.or(existing.email.clone());
        let new_phone = req.phone.or(existing.phone.clone());
        let new_id_card = req.id_card_number.or(existing.id_card_number.clone());
        let new_address = req.address.or(existing.address.clone());

        let encrypted_email = match &new_email {
            Some(e) if !e.is_empty() => {
                Some(self.encryption.encrypt_to_string(e).unwrap_or_else(|err| {
                    tracing::warn!("邮箱加密失败: {}", err);
                    e.clone()
                }))
            }
            _ => new_email.clone(),
        };

        let encrypted_phone = match &new_phone {
            Some(p) if !p.is_empty() => {
                Some(self.encryption.encrypt_to_string(p).unwrap_or_else(|e| {
                    tracing::warn!("手机号加密失败: {}", e);
                    p.clone()
                }))
            }
            _ => new_phone.clone(),
        };

        let encrypted_id_card = match &new_id_card {
            Some(idc) if !idc.is_empty() => {
                Some(self.encryption.encrypt_to_string(idc).unwrap_or_else(|e| {
                    tracing::warn!("身份证号加密失败: {}", e);
                    idc.clone()
                }))
            }
            _ => new_id_card.clone(),
        };

        let encrypted_address = match &new_address {
            Some(a) if !a.is_empty() => {
                Some(self.encryption.encrypt_to_string(a).unwrap_or_else(|e| {
                    tracing::warn!("地址加密失败: {}", e);
                    a.clone()
                }))
            }
            _ => new_address.clone(),
        };

        let result = sqlx::query_as::<_, Employee>(
            r#"
            UPDATE hrm.employees SET
                company_id = $2, department_id = $3, position_id = $4,
                name = $5, gender = $6, hire_date = $7, email = $8, phone = $9,
                id_card_number = $10, address = $11,
                status = $12, updated_at = $13
            WHERE id = $1
            RETURNING id, company_id, department_id, position_id,
                      employee_number, name, gender, hire_date, email, phone,
                      id_card_number, address, status,
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
        .bind(&encrypted_email)
        .bind(&encrypted_phone)
        .bind(&encrypted_id_card)
        .bind(&encrypted_address)
        .bind(&status)
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(mut employee) => {
                let _ = employee.decrypt_fields(&self.encryption);
                ApiResponse::success(employee, "员工更新成功")
            }
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
