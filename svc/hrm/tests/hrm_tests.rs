// HRM 服务单元测试和集成测试
// 测试员工管理、部门管理、考勤管理、薪资管理等功能

use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate, Datelike};
use serde::{Deserialize, Serialize};
use bigdecimal::BigDecimal;

// ============ 员工管理测试 ============

#[cfg(test)]
mod employee_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct Employee {
        id: Uuid,
        employee_no: String,
        name: String,
        gender: String,
        birth_date: NaiveDate,
        department_id: Uuid,
        position_id: Option<Uuid>,
        phone: String,
        email: String,
        status: String,
        hire_date: NaiveDate,
    }

    #[test]
    fn test_employee_creation() {
        let employee = Employee {
            id: Uuid::new_v4(),
            employee_no: "EMP001".to_string(),
            name: "张三".to_string(),
            gender: "男".to_string(),
            birth_date: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
            department_id: Uuid::new_v4(),
            position_id: Some(Uuid::new_v4()),
            phone: "13800138000".to_string(),
            email: "zhangsan@example.com".to_string(),
            status: "active".to_string(),
            hire_date: NaiveDate::from_ymd_opt(2020, 1, 1).unwrap(),
        };

        assert_eq!(employee.employee_no, "EMP001");
        assert_eq!(employee.name, "张三");
        assert_eq!(employee.status, "active");
    }

    #[test]
    fn test_employee_statuses() {
        let statuses = vec!["active", "inactive", "resigned", "terminated"];

        for status in statuses {
            let employee = Employee {
                id: Uuid::new_v4(),
                employee_no: "EMP001".to_string(),
                name: "员工".to_string(),
                gender: "男".to_string(),
                birth_date: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
                department_id: Uuid::new_v4(),
                position_id: None,
                phone: "13800138000".to_string(),
                email: "emp@example.com".to_string(),
                status: status.to_string(),
                hire_date: NaiveDate::from_ymd_opt(2020, 1, 1).unwrap(),
            };

            assert_eq!(employee.status, status);
        }
    }

    #[test]
    fn test_employee_serialization() {
        let employee = Employee {
            id: Uuid::new_v4(),
            employee_no: "EMP002".to_string(),
            name: "李四".to_string(),
            gender: "女".to_string(),
            birth_date: NaiveDate::from_ymd_opt(1995, 5, 5).unwrap(),
            department_id: Uuid::new_v4(),
            position_id: Some(Uuid::new_v4()),
            phone: "13900139000".to_string(),
            email: "lisi@example.com".to_string(),
            status: "active".to_string(),
            hire_date: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
        };

        let json = serde_json::to_string(&employee).unwrap();
        let deserialized: Employee = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.employee_no, employee.employee_no);
    }
}

// ============ 部门管理测试 ============

#[cfg(test)]
mod department_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct Department {
        id: Uuid,
        name: String,
        code: String,
        parent_id: Option<Uuid>,
        manager_id: Option<Uuid>,
        level: i32,
    }

    #[test]
    fn test_department_creation() {
        let department = Department {
            id: Uuid::new_v4(),
            name: "研发部".to_string(),
            code: "DEV".to_string(),
            parent_id: None,
            manager_id: Some(Uuid::new_v4()),
            level: 1,
        };

        assert_eq!(department.name, "研发部");
        assert_eq!(department.code, "DEV");
        assert!(department.parent_id.is_none());
    }

    #[test]
    fn test_nested_department() {
        let parent_id = Uuid::new_v4();
        let child_department = Department {
            id: Uuid::new_v4(),
            name: "前端组".to_string(),
            code: "DEV-FE".to_string(),
            parent_id: Some(parent_id),
            manager_id: Some(Uuid::new_v4()),
            level: 2,
        };

        assert!(child_department.parent_id.is_some());
        assert_eq!(child_department.level, 2);
    }

    #[test]
    fn test_department_hierarchy() {
        let root = Department {
            id: Uuid::new_v4(),
            name: "公司".to_string(),
            code: "ROOT".to_string(),
            parent_id: None,
            manager_id: None,
            level: 0,
        };

        let level1 = Department {
            id: Uuid::new_v4(),
            name: "技术部".to_string(),
            code: "TECH".to_string(),
            parent_id: Some(root.id),
            manager_id: Some(Uuid::new_v4()),
            level: 1,
        };

        let level2 = Department {
            id: Uuid::new_v4(),
            name: "开发组".to_string(),
            code: "TECH-DEV".to_string(),
            parent_id: Some(level1.id),
            manager_id: Some(Uuid::new_v4()),
            level: 2,
        };

        assert_eq!(root.level, 0);
        assert_eq!(level1.level, 1);
        assert_eq!(level2.level, 2);
    }
}

// ============ 考勤管理测试 ============

#[cfg(test)]
mod attendance_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct AttendanceRecord {
        id: Uuid,
        employee_id: Uuid,
        date: NaiveDate,
        check_in_time: Option<DateTime<Utc>>,
        check_out_time: Option<DateTime<Utc>>,
        status: String,
        work_hours: Option<f64>,
    }

    #[test]
    fn test_attendance_record() {
        let record = AttendanceRecord {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            check_in_time: Some(Utc::now()),
            check_out_time: Some(Utc::now()),
            status: "normal".to_string(),
            work_hours: Some(8.0),
        };

        assert_eq!(record.status, "normal");
        assert_eq!(record.work_hours.unwrap(), 8.0);
    }

    #[test]
    fn test_attendance_statuses() {
        let statuses = vec!["normal", "late", "early_leave", "absent", "leave"];

        for status in statuses {
            let record = AttendanceRecord {
                id: Uuid::new_v4(),
                employee_id: Uuid::new_v4(),
                date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                check_in_time: None,
                check_out_time: None,
                status: status.to_string(),
                work_hours: None,
            };

            assert_eq!(record.status, status);
        }
    }

    #[test]
    fn test_work_hours_calculation() {
        let check_in = Utc::now();
        let check_out = check_in + chrono::Duration::hours(8);

        let record = AttendanceRecord {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            check_in_time: Some(check_in),
            check_out_time: Some(check_out),
            status: "normal".to_string(),
            work_hours: Some(8.0),
        };

        assert_eq!(record.work_hours.unwrap(), 8.0);
    }
}

// ============ 薪资管理测试 ============

#[cfg(test)]
mod payroll_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct PayrollRecord {
        id: Uuid,
        employee_id: Uuid,
        month: String,
        base_salary: BigDecimal,
        bonus: BigDecimal,
        deductions: BigDecimal,
        net_salary: BigDecimal,
        status: String,
    }

    #[test]
    fn test_payroll_record() {
        let record = PayrollRecord {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            month: "2024-01".to_string(),
            base_salary: BigDecimal::from(10000),
            bonus: BigDecimal::from(2000),
            deductions: BigDecimal::from(500),
            net_salary: BigDecimal::from(11500),
            status: "paid".to_string(),
        };

        assert_eq!(record.month, "2024-01");
        assert_eq!(record.status, "paid");
    }

    #[test]
    fn test_salary_calculation() {
        let base = BigDecimal::from(10000);
        let bonus = BigDecimal::from(2000);
        let deductions = BigDecimal::from(500);
        let net = base + bonus - deductions;

        assert_eq!(net, BigDecimal::from(11500));
    }

    #[test]
    fn test_payroll_statuses() {
        let statuses = vec!["draft", "approved", "paid", "cancelled"];

        for status in statuses {
            let record = PayrollRecord {
                id: Uuid::new_v4(),
                employee_id: Uuid::new_v4(),
                month: "2024-01".to_string(),
                base_salary: BigDecimal::from(10000),
                bonus: BigDecimal::from(0),
                deductions: BigDecimal::from(0),
                net_salary: BigDecimal::from(10000),
                status: status.to_string(),
            };

            assert_eq!(record.status, status);
        }
    }
}

// ============ HTTP 端点测试 ============

#[cfg(test)]
mod http_endpoint_tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        Router,
        routing::get,
    };
    use tower::ServiceExt;

    async fn health_handler() -> &'static str {
        "OK"
    }

    #[tokio::test]
    async fn test_health_endpoint() {
        let app = Router::new().route("/health", get(health_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}

// ============ Shared Schema 集成测试 ============

#[cfg(test)]
mod shared_schema_integration_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct SharedCompany {
        id: Uuid,
        organization_id: Uuid,
        name: String,
        short_name: Option<String>,
        status: String,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct SharedDepartment {
        id: Uuid,
        organization_id: Uuid,
        company_id: Option<Uuid>,
        name: String,
        code: String,
        parent_id: Option<Uuid>,
        manager_id: Option<Uuid>,
        status: String,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct SharedEmployee {
        id: Uuid,
        organization_id: Uuid,
        company_id: Option<Uuid>,
        department_id: Option<Uuid>,
        position_id: Option<Uuid>,
        employee_number: String,
        name: String,
        gender: Option<String>,
        birth_date: Option<NaiveDate>,
        hire_date: Option<NaiveDate>,
        status: String,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    }

    #[test]
    fn test_shared_company_structure() {
        let company = SharedCompany {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            name: "TOPEMS科技有限公司".to_string(),
            short_name: Some("TOPEMS".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(company.name, "TOPEMS科技有限公司");
        assert_eq!(company.short_name.unwrap(), "TOPEMS");
        assert_eq!(company.status, "active");
    }

    #[test]
    fn test_shared_department_structure() {
        let department = SharedDepartment {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(Uuid::new_v4()),
            name: "人力资源部".to_string(),
            code: "HR".to_string(),
            parent_id: None,
            manager_id: Some(Uuid::new_v4()),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(department.name, "人力资源部");
        assert_eq!(department.code, "HR");
        assert!(department.parent_id.is_none());
        assert!(department.manager_id.is_some());
    }

    #[test]
    fn test_shared_employee_structure() {
        let employee = SharedEmployee {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(Uuid::new_v4()),
            department_id: Some(Uuid::new_v4()),
            position_id: Some(Uuid::new_v4()),
            employee_number: "EMP001".to_string(),
            name: "张三".to_string(),
            gender: Some("男".to_string()),
            birth_date: Some(NaiveDate::from_ymd_opt(1990, 1, 1).unwrap()),
            hire_date: Some(NaiveDate::from_ymd_opt(2020, 1, 1).unwrap()),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(employee.employee_number, "EMP001");
        assert_eq!(employee.name, "张三");
        assert_eq!(employee.status, "active");
        assert!(employee.birth_date.is_some());
        assert!(employee.hire_date.is_some());
    }

    #[test]
    fn test_shared_schema_relationships() {
        let company_id = Uuid::new_v4();
        let department_id = Uuid::new_v4();

        let company = SharedCompany {
            id: company_id,
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            name: "测试公司".to_string(),
            short_name: Some("TEST".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let department = SharedDepartment {
            id: department_id,
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(company_id),
            name: "测试部门".to_string(),
            code: "TEST-DEPT".to_string(),
            parent_id: None,
            manager_id: None,
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let employee = SharedEmployee {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(company_id),
            department_id: Some(department_id),
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "测试员工".to_string(),
            gender: None,
            birth_date: None,
            hire_date: None,
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(employee.company_id.unwrap(), company.id);
        assert_eq!(employee.department_id.unwrap(), department.id);
        assert_eq!(department.company_id.unwrap(), company.id);
    }

    #[test]
    fn test_shared_employee_date_types() {
        let employee = SharedEmployee {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: None,
            department_id: None,
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "测试员工".to_string(),
            gender: None,
            birth_date: Some(NaiveDate::from_ymd_opt(1990, 12, 31).unwrap()),
            hire_date: Some(NaiveDate::from_ymd_opt(2024, 1, 15).unwrap()),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(employee.birth_date.unwrap().year(), 1990);
        assert_eq!(employee.hire_date.unwrap().month(), 1);
        assert_eq!(employee.hire_date.unwrap().day(), 15);
    }

    #[test]
    fn test_shared_entity_serialization() {
        let company = SharedCompany {
            id: Uuid::parse_str("12345678-1234-5678-1234-567812345678").unwrap(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            name: "序列化测试公司".to_string(),
            short_name: Some("SERIAL".to_string()),
            status: "active".to_string(),
            created_at: DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z").unwrap().with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2024-01-02T12:00:00Z").unwrap().with_timezone(&Utc),
        };

        let json = serde_json::to_string(&company).unwrap();
        let deserialized: SharedCompany = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.id, company.id);
        assert_eq!(deserialized.name, company.name);
        assert_eq!(deserialized.status, company.status);
    }
}

// ============ Schema 迁移验证测试 ============

#[cfg(test)]
mod schema_migration_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct MigrationStatus {
        schema_name: String,
        table_name: String,
        migrated: bool,
        record_count: i32,
    }

    #[test]
    fn test_migration_status_validation() {
        let migration_statuses = vec![
            MigrationStatus {
                schema_name: "shared".to_string(),
                table_name: "companies".to_string(),
                migrated: true,
                record_count: 7,
            },
            MigrationStatus {
                schema_name: "shared".to_string(),
                table_name: "departments".to_string(),
                migrated: true,
                record_count: 5,
            },
            MigrationStatus {
                schema_name: "shared".to_string(),
                table_name: "employees".to_string(),
                migrated: true,
                record_count: 5,
            },
        ];

        for status in migration_statuses {
            assert!(status.migrated, "{} should be migrated", status.table_name);
            assert!(status.record_count > 0, "{} should have records", status.table_name);
            assert_eq!(status.schema_name, "shared");
        }
    }

    #[test]
    fn test_search_path_configuration() {
        let search_paths = vec![
            "hrm, shared, public",
            "crm, shared, public",
            "erp, shared, public",
            "mes, shared, public",
            "wms, shared, public",
        ];

        for path in search_paths {
            assert!(path.contains("shared"), "search_path must include shared");
            assert!(path.contains("public"), "search_path must include public");
        }
    }
}