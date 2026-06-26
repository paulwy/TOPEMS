use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use super::super::models::*;

pub struct SharedRepository {
    pool: PgPool,
}

impl SharedRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_company(&self, data: &CreateCompanyRequest) -> Result<Company, sqlx::Error> {
        let company = sqlx::query_as::<_, Company>(
            r#"
            INSERT INTO public.companies (name, short_name, tax_id, registered_address, business_scope, industry, scale)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(&data.name)
        .bind(&data.short_name)
        .bind(&data.tax_id)
        .bind(&data.registered_address)
        .bind(&data.business_scope)
        .bind(&data.industry)
        .bind(data.scale.as_deref().unwrap_or("medium"))
        .fetch_one(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn get_company(&self, id: Uuid) -> Result<Option<Company>, sqlx::Error> {
        let company = sqlx::query_as::<_, Company>(
            r#"SELECT * FROM public.companies WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn get_companies(&self, status: Option<String>) -> Result<Vec<Company>, sqlx::Error> {
        let companies = match status {
            Some(s) => sqlx::query_as::<_, Company>(r#"SELECT * FROM public.companies WHERE status = $1"#)
                .bind(s)
                .fetch_all(&self.pool)
                .await?,
            None => sqlx::query_as::<_, Company>(r#"SELECT * FROM public.companies"#)
                .fetch_all(&self.pool)
                .await?,
        };

        Ok(companies)
    }

    pub async fn update_company(
        &self,
        id: Uuid,
        data: &CreateCompanyRequest,
    ) -> Result<Company, sqlx::Error> {
        let company = sqlx::query_as::<_, Company>(
            r#"
            UPDATE public.companies
            SET name = $1, short_name = $2, tax_id = $3, registered_address = $4, 
                business_scope = $5, industry = $6, scale = $7
            WHERE id = $8
            RETURNING *
            "#,
        )
        .bind(&data.name)
        .bind(&data.short_name)
        .bind(&data.tax_id)
        .bind(&data.registered_address)
        .bind(&data.business_scope)
        .bind(&data.industry)
        .bind(data.scale.as_deref().unwrap_or("medium"))
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn delete_company(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(r#"DELETE FROM public.companies WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn create_department(
        &self,
        data: &CreateDepartmentRequest,
    ) -> Result<Department, sqlx::Error> {
        let department = sqlx::query_as::<_, Department>(
            r#"
            INSERT INTO public.departments (company_id, parent_id, name, code, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(data.company_id)
        .bind(data.parent_id)
        .bind(&data.name)
        .bind(&data.code)
        .bind(&data.description)
        .fetch_one(&self.pool)
        .await?;

        Ok(department)
    }

    pub async fn get_department(&self, id: Uuid) -> Result<Option<Department>, sqlx::Error> {
        let department = sqlx::query_as::<_, Department>(
            r#"SELECT * FROM public.departments WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(department)
    }

    pub async fn get_departments(
        &self,
        company_id: Option<Uuid>,
    ) -> Result<Vec<Department>, sqlx::Error> {
        let departments = match company_id {
            Some(id) => sqlx::query_as::<_, Department>(r#"SELECT * FROM public.departments WHERE company_id = $1"#)
                .bind(id)
                .fetch_all(&self.pool)
                .await?,
            None => sqlx::query_as::<_, Department>(r#"SELECT * FROM public.departments"#)
                .fetch_all(&self.pool)
                .await?,
        };

        Ok(departments)
    }

    pub async fn create_position(
        &self,
        data: &CreatePositionRequest,
    ) -> Result<Position, sqlx::Error> {
        let position = sqlx::query_as::<_, Position>(
            r#"
            INSERT INTO plugin_hrm.positions (company_id, name, code, level, department_id, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
        )
        .bind(data.company_id)
        .bind(&data.name)
        .bind(&data.code)
        .bind(&data.level)
        .bind(data.department_id)
        .bind(&data.description)
        .fetch_one(&self.pool)
        .await?;

        Ok(position)
    }

    pub async fn get_position(&self, id: Uuid) -> Result<Option<Position>, sqlx::Error> {
        let position = sqlx::query_as::<_, Position>(
            r#"SELECT * FROM plugin_hrm.positions WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(position)
    }

    pub async fn create_employee(
        &self,
        data: &CreateEmployeeRequest,
    ) -> Result<Employee, sqlx::Error> {
        let hire_date = data.hire_date.as_ref().map(|d| DateTime::parse_from_rfc3339(d).unwrap().with_timezone(&Utc));
        
        let employee = sqlx::query_as::<_, Employee>(
            r#"
            INSERT INTO public.employees (company_id, department_id, position_id, employee_no, name, gender, email, phone, hire_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(data.company_id)
        .bind(data.department_id)
        .bind(data.position_id)
        .bind(&data.employee_no)
        .bind(&data.name)
        .bind(&data.gender)
        .bind(&data.email)
        .bind(&data.phone)
        .bind(hire_date)
        .fetch_one(&self.pool)
        .await?;

        Ok(employee)
    }

    pub async fn get_employee(&self, id: Uuid) -> Result<Option<Employee>, sqlx::Error> {
        let employee = sqlx::query_as::<_, Employee>(
            r#"SELECT * FROM public.employees WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(employee)
    }

    pub async fn get_employees(
        &self,
        company_id: Option<Uuid>,
        department_id: Option<Uuid>,
    ) -> Result<Vec<Employee>, sqlx::Error> {
        let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM public.employees WHERE 1=1");
        
        if let Some(company) = company_id {
            query.push(" AND company_id = ");
            query.push_bind(company);
        }
        if let Some(department) = department_id {
            query.push(" AND department_id = ");
            query.push_bind(department);
        }

        let employees = query.build_query_as::<Employee>().fetch_all(&self.pool).await?;
        Ok(employees)
    }

    pub async fn create_id_record(&self, record: &IdRecord) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO public.id_records (id, id_type, entity_type, entity_id, company_id, created_by, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(&record.id)
        .bind(&record.id_type)
        .bind(&record.entity_type)
        .bind(record.entity_id)
        .bind(record.company_id)
        .bind(&record.created_by)
        .bind(&record.metadata)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_id_record(&self, id: &str) -> Result<Option<IdRecord>, sqlx::Error> {
        let record = sqlx::query_as::<_, IdRecord>(
            r#"SELECT * FROM public.id_records WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get_system_param(&self, param_key: &str) -> Result<Option<SystemParam>, sqlx::Error> {
        let param = sqlx::query_as::<_, SystemParam>(
            r#"SELECT * FROM public.system_params WHERE param_key = $1"#,
        )
        .bind(param_key)
        .fetch_optional(&self.pool)
        .await?;

        Ok(param)
    }

    pub async fn set_system_param(
        &self,
        param_key: &str,
        param_value: &str,
        param_type: Option<&str>,
        description: Option<&str>,
        module: Option<&str>,
    ) -> Result<SystemParam, sqlx::Error> {
        let param = sqlx::query_as::<_, SystemParam>(
            r#"
            INSERT INTO public.system_params (param_key, param_value, param_type, description, module)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (param_key) DO UPDATE SET param_value = $2, param_type = $3, description = $4, module = $5
            RETURNING *
            "#,
        )
        .bind(param_key)
        .bind(param_value)
        .bind(param_type.unwrap_or("string"))
        .bind(description)
        .bind(module)
        .fetch_one(&self.pool)
        .await?;

        Ok(param)
    }
}
