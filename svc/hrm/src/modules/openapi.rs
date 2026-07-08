use crate::models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::employee::list_employees,
        crate::modules::employee::create_employee,
        crate::modules::employee::get_employee,
        crate::modules::employee::update_employee,
        crate::modules::employee::delete_employee,
    ),
    components(
        schemas(
            Employee,
            CreateEmployeeRequest,
            UpdateEmployeeRequest,
        )
    ),
    tags(
        (name = "employees", description = "员工管理接口"),
        (name = "departments", description = "部门管理接口"),
        (name = "companies", description = "公司管理接口"),
        (name = "positions", description = "职位管理接口"),
        (name = "contracts", description = "合同管理接口"),
        (name = "attendance", description = "考勤管理接口"),
        (name = "leave", description = "请假管理接口"),
        (name = "payroll", description = "薪资管理接口"),
        (name = "performance", description = "绩效管理接口"),
        (name = "recruitment", description = "招聘管理接口"),
        (name = "training", description = "培训管理接口"),
        (name = "salary_adjustment", description = "薪资调整接口"),
        (name = "audit", description = "审计日志接口"),
        (name = "health", description = "健康检查接口"),
        (name = "reports", description = "报表接口"),
        (name = "setup", description = "系统设置接口"),
    ),
    info(
        title = "TOPEMS-HRM API",
        version = "1.0.0",
        description = "人力资源管理服务 API",
        contact(
            name = "TOPEMS Team"
        )
    )
)]
pub struct ApiDoc;
