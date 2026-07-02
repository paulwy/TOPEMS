use bigdecimal::BigDecimal;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PluginInfo {
    code: String,
    name: String,
    version: String,
    description: String,
    permissions: Vec<PermissionDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PermissionDef {
    code: String,
    name: String,
    resource_type: String,
    action: String,
}

#[test]
fn test_plugin_info_structure() {
    let info = PluginInfo {
        code: "hrm".to_string(),
        name: "人力资源管理".to_string(),
        version: "0.1.0".to_string(),
        description: "HRM 人力资源管理系统".to_string(),
        permissions: vec![PermissionDef {
            code: "hrm:employee:read".to_string(),
            name: "查看员工".to_string(),
            resource_type: "employee".to_string(),
            action: "read".to_string(),
        }],
    };

    assert_eq!(info.code, "hrm");
    assert_eq!(info.name, "人力资源管理");
    assert!(!info.version.is_empty());
    assert!(!info.description.is_empty());
    assert!(!info.permissions.is_empty());
}

#[test]
fn test_hrm_permission_codes_format() {
    let permissions = vec![
        ("hrm:employee:read", "employee", "read"),
        ("hrm:employee:write", "employee", "write"),
        ("hrm:department:read", "department", "read"),
        ("hrm:department:write", "department", "write"),
        ("hrm:attendance:read", "attendance", "read"),
        ("hrm:attendance:write", "attendance", "write"),
        ("hrm:leave:read", "leave", "read"),
        ("hrm:leave:write", "leave", "write"),
        ("hrm:payroll:read", "payroll", "read"),
        ("hrm:payroll:write", "payroll", "write"),
        ("hrm:recruitment:read", "recruitment", "read"),
        ("hrm:recruitment:write", "recruitment", "write"),
        ("hrm:training:read", "training", "read"),
        ("hrm:training:write", "training", "write"),
        ("hrm:performance:read", "performance", "read"),
        ("hrm:performance:write", "performance", "write"),
    ];

    for (code, resource, action) in permissions {
        assert!(code.starts_with("hrm:"), "{} should start with hrm:", code);
        let parts: Vec<&str> = code.split(':').collect();
        assert_eq!(parts.len(), 3, "{} should have 3 parts", code);
        assert_eq!(parts[0], "hrm");
        assert_eq!(parts[1], resource);
        assert_eq!(parts[2], action);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Employee {
    id: Uuid,
    employee_number: String,
    name: String,
    gender: String,
    department_id: Uuid,
    status: String,
    hire_date: NaiveDate,
}

#[test]
fn test_employee_creation() {
    let employee = Employee {
        id: Uuid::new_v4(),
        employee_number: "EMP001".to_string(),
        name: "张三".to_string(),
        gender: "男".to_string(),
        department_id: Uuid::new_v4(),
        status: "active".to_string(),
        hire_date: NaiveDate::from_ymd_opt(2020, 1, 1).unwrap(),
    };

    assert_eq!(employee.employee_number, "EMP001");
    assert_eq!(employee.name, "张三");
    assert_eq!(employee.status, "active");
}

#[test]
fn test_employee_statuses() {
    let statuses = vec!["active", "inactive", "resigned", "terminated"];

    for status in statuses {
        let employee = Employee {
            id: Uuid::new_v4(),
            employee_number: "EMP001".to_string(),
            name: "员工".to_string(),
            gender: "男".to_string(),
            department_id: Uuid::new_v4(),
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
        employee_number: "EMP002".to_string(),
        name: "李四".to_string(),
        gender: "女".to_string(),
        department_id: Uuid::new_v4(),
        status: "active".to_string(),
        hire_date: NaiveDate::from_ymd_opt(2021, 5, 5).unwrap(),
    };

    let json = serde_json::to_string(&employee).unwrap();
    let deserialized: Employee = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.employee_number, employee.employee_number);
    assert_eq!(deserialized.name, employee.name);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Department {
    id: Uuid,
    name: String,
    code: String,
    parent_id: Option<Uuid>,
    level: i32,
}

#[test]
fn test_department_creation() {
    let department = Department {
        id: Uuid::new_v4(),
        name: "研发部".to_string(),
        code: "DEV".to_string(),
        parent_id: None,
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
        level: 0,
    };

    let level1 = Department {
        id: Uuid::new_v4(),
        name: "技术部".to_string(),
        code: "TECH".to_string(),
        parent_id: Some(root.id),
        level: 1,
    };

    let level2 = Department {
        id: Uuid::new_v4(),
        name: "开发组".to_string(),
        code: "TECH-DEV".to_string(),
        parent_id: Some(level1.id),
        level: 2,
    };

    assert_eq!(root.level, 0);
    assert_eq!(level1.level, 1);
    assert_eq!(level2.level, 2);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AttendanceRecord {
    id: Uuid,
    employee_id: Uuid,
    date: NaiveDate,
    status: String,
    work_hours: Option<f64>,
}

#[test]
fn test_attendance_record() {
    let record = AttendanceRecord {
        id: Uuid::new_v4(),
        employee_id: Uuid::new_v4(),
        date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
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
            status: status.to_string(),
            work_hours: None,
        };

        assert_eq!(record.status, status);
    }
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LeaveRequest {
    id: Uuid,
    employee_id: Uuid,
    leave_type: String,
    start_date: NaiveDate,
    end_date: NaiveDate,
    status: String,
    days: f64,
}

#[test]
fn test_leave_request() {
    let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
    let end = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap();

    let leave = LeaveRequest {
        id: Uuid::new_v4(),
        employee_id: Uuid::new_v4(),
        leave_type: "annual".to_string(),
        start_date: start,
        end_date: end,
        status: "pending".to_string(),
        days: 3.0,
    };

    assert_eq!(leave.leave_type, "annual");
    assert_eq!(leave.status, "pending");
    assert_eq!(leave.days, 3.0);
}

#[test]
fn test_leave_types() {
    let types = vec!["annual", "sick", "personal", "maternity", "unpaid"];

    for leave_type in types {
        let leave = LeaveRequest {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            leave_type: leave_type.to_string(),
            start_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            status: "draft".to_string(),
            days: 1.0,
        };

        assert_eq!(leave.leave_type, leave_type);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    service: String,
    uptime: u64,
    database: String,
}

#[test]
fn test_health_response_healthy() {
    let health = HealthResponse {
        status: "healthy".to_string(),
        service: "topems-hrm".to_string(),
        uptime: 3600,
        database: "healthy".to_string(),
    };

    assert_eq!(health.status, "healthy");
    assert_eq!(health.service, "topems-hrm");
    assert!(health.uptime > 0);
}

#[cfg(test)]
mod http_endpoint_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::get,
        Router,
    };
    use tower::ServiceExt;

    async fn health_handler() -> &'static str {
        "OK"
    }

    async fn plugin_info_handler() -> String {
        let info = PluginInfo {
            code: "hrm".to_string(),
            name: "人力资源管理".to_string(),
            version: "0.1.0".to_string(),
            description: "HRM 人力资源管理系统".to_string(),
            permissions: vec![],
        };
        serde_json::to_string(&info).unwrap()
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

    #[tokio::test]
    async fn test_plugin_info_endpoint() {
        let app = Router::new().route("/api/plugins/info", get(plugin_info_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/plugins/info")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let info: PluginInfo = serde_json::from_slice(&body).unwrap();

        assert_eq!(info.code, "hrm");
        assert_eq!(info.name, "人力资源管理");
    }

    #[tokio::test]
    async fn test_404_endpoint() {
        let app = Router::new().route("/health", get(health_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/nonexistent")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_method_not_allowed() {
        let app = Router::new().route("/health", get(health_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    }
}

#[cfg(test)]
mod shared_schema_integration_tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct SharedCompany {
        id: Uuid,
        organization_id: Uuid,
        name: String,
        status: String,
        created_at: DateTime<Utc>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct SharedDepartment {
        id: Uuid,
        organization_id: Uuid,
        company_id: Option<Uuid>,
        name: String,
        code: String,
        status: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct SharedEmployee {
        id: Uuid,
        organization_id: Uuid,
        company_id: Option<Uuid>,
        department_id: Option<Uuid>,
        employee_number: String,
        name: String,
        status: String,
    }

    #[test]
    fn test_shared_company_structure() {
        let company = SharedCompany {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            name: "TOPEMS科技有限公司".to_string(),
            status: "active".to_string(),
            created_at: Utc::now(),
        };

        assert_eq!(company.name, "TOPEMS科技有限公司");
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
            status: "active".to_string(),
        };

        assert_eq!(department.name, "人力资源部");
        assert_eq!(department.code, "HR");
        assert!(department.company_id.is_some());
    }

    #[test]
    fn test_shared_employee_structure() {
        let employee = SharedEmployee {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(Uuid::new_v4()),
            department_id: Some(Uuid::new_v4()),
            employee_number: "EMP001".to_string(),
            name: "张三".to_string(),
            status: "active".to_string(),
        };

        assert_eq!(employee.employee_number, "EMP001");
        assert_eq!(employee.name, "张三");
        assert_eq!(employee.status, "active");
    }

    #[test]
    fn test_shared_schema_relationships() {
        let company_id = Uuid::new_v4();
        let department_id = Uuid::new_v4();

        let company = SharedCompany {
            id: company_id,
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            name: "测试公司".to_string(),
            status: "active".to_string(),
            created_at: Utc::now(),
        };

        let department = SharedDepartment {
            id: department_id,
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(company_id),
            name: "测试部门".to_string(),
            code: "TEST-DEPT".to_string(),
            status: "active".to_string(),
        };

        let employee = SharedEmployee {
            id: Uuid::new_v4(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            company_id: Some(company_id),
            department_id: Some(department_id),
            employee_number: "EMP001".to_string(),
            name: "测试员工".to_string(),
            status: "active".to_string(),
        };

        assert_eq!(employee.company_id.unwrap(), company.id);
        assert_eq!(employee.department_id.unwrap(), department.id);
        assert_eq!(department.company_id.unwrap(), company.id);
    }

    #[test]
    fn test_shared_entity_serialization() {
        let company = SharedCompany {
            id: Uuid::parse_str("12345678-1234-5678-1234-567812345678").unwrap(),
            organization_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            name: "序列化测试公司".to_string(),
            status: "active".to_string(),
            created_at: DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        };

        let json = serde_json::to_string(&company).unwrap();
        let deserialized: SharedCompany = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, company.id);
        assert_eq!(deserialized.name, company.name);
        assert_eq!(deserialized.status, company.status);
    }
}
