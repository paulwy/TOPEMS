pub mod attendance;
pub mod department;
pub mod employee;
pub mod leave;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_hrm_departments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(200) NOT NULL,
            parent_id UUID REFERENCES core_hrm_departments(id) ON DELETE SET NULL,
            manager_id UUID,
            sort_order INTEGER DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_hrm_employees (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            employee_no VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            gender VARCHAR(10),
            birth_date DATE,
            phone VARCHAR(50),
            email VARCHAR(200),
            department_id UUID REFERENCES core_hrm_departments(id) ON DELETE SET NULL,
            position VARCHAR(100),
            hire_date DATE,
            leave_date DATE,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, employee_no)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_hrm_attendance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            employee_id UUID NOT NULL REFERENCES core_hrm_employees(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            check_in_time TIMESTAMPTZ,
            check_out_time TIMESTAMPTZ,
            status VARCHAR(20) NOT NULL DEFAULT 'normal',
            remarks TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_hrm_leaves (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            employee_id UUID NOT NULL REFERENCES core_hrm_employees(id) ON DELETE CASCADE,
            leave_type VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days DECIMAL(5,1) NOT NULL,
            reason TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            approver_id UUID,
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_hrm_emp_tenant ON core_hrm_employees(tenant_id);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hrm_dept_tenant ON core_hrm_departments(tenant_id);",
    )
    .execute(pool)
    .await?;

    Ok(())
}
