use crate::models::{
    AttendanceRecord, Company, Contract, ContractRenewal, CreateAttendanceRequest,
    CreateCompanyRequest, CreateContractRequest, CreateDepartmentRequest, CreateEmployeeRequest,
    Department, Employee, UpdateAttendanceRequest, UpdateCompanyRequest, UpdateContractRequest,
    UpdateDepartmentRequest, UpdateEmployeeRequest,
};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::employee::list_employees,
        crate::modules::employee::create_employee,
        crate::modules::employee::get_employee,
        crate::modules::employee::update_employee,
        crate::modules::employee::delete_employee,
        crate::modules::department::list_departments,
        crate::modules::department::create_department,
        crate::modules::department::get_department,
        crate::modules::company::list_companies,
        crate::modules::company::create_company,
        crate::modules::company::get_company,
    ),
    components(
        schemas(
            Employee,
            CreateEmployeeRequest,
            UpdateEmployeeRequest,
            Department,
            CreateDepartmentRequest,
            UpdateDepartmentRequest,
            Company,
            CreateCompanyRequest,
            UpdateCompanyRequest,
            AttendanceRecord,
            CreateAttendanceRequest,
            UpdateAttendanceRequest,
            Contract,
            CreateContractRequest,
            UpdateContractRequest,
            ContractRenewal,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-hrm-openapi.json", json).expect("Failed to write spec");
        tracing::debug!("OpenAPI spec written to /tmp/topems-hrm-openapi.json");
    }
}
