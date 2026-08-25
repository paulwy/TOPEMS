use crate::models::{
    AttendanceRecord, Company, Contract, ContractRenewal, CreateAttendanceRequest,
    CreateCompanyRequest, CreateContractRequest, CreateDepartmentRequest, CreateEmployeeRequest,
    CreateSalaryAdjustmentRequest, CreateTrainingCourseRequest, CreateTrainingPlanRequest,
    CreateTrainingRecordRequest, Department, Employee, SalaryAdjustment, TrainingCourse,
    TrainingPaginationParams, TrainingPlan, TrainingRecord, UpdateAttendanceRequest,
    UpdateCompanyRequest, UpdateContractRequest, UpdateDepartmentRequest, UpdateEmployeeRequest,
    UpdateSalaryAdjustmentRequest, UpdateTrainingCourseRequest, UpdateTrainingPlanRequest,
    UpdateTrainingRecordRequest,
};
use crate::modules::audit::ListAuditLogsQuery;
use crate::modules::leave::{CreateLeaveRequest, LeaveRequest, UpdateLeaveRequest};
use crate::modules::position::{CreatePositionRequest, Position, UpdatePositionRequest};
use crate::modules::recruitment::JobOpeningQueryParams;
use crate::modules::salary_adjustment::SalaryAdjustmentPaginationParams;
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
        crate::modules::department::update_department,
        crate::modules::department::delete_department,
        crate::modules::company::list_companies,
        crate::modules::company::create_company,
        crate::modules::company::get_company,
        crate::modules::company::update_company,
        crate::modules::company::delete_company,
        // === V284: HRM utoipa::path 补全 ===
        crate::modules::attendance::list_attendance,
        crate::modules::attendance::create_attendance,
        crate::modules::attendance::get_attendance,
        crate::modules::attendance::update_attendance,
        crate::modules::attendance::delete_attendance,
        crate::modules::audit::list_audit_logs,
        crate::modules::audit::get_audit_log,
        crate::modules::contract::list_contracts,
        crate::modules::contract::create_contract,
        crate::modules::contract::get_contract,
        crate::modules::contract::update_contract,
        crate::modules::contract::delete_contract,
        crate::modules::leave::list_leaves,
        crate::modules::leave::create_leave,
        crate::modules::leave::get_leave,
        crate::modules::leave::update_leave,
        crate::modules::leave::delete_leave,
        crate::modules::position::list_positions,
        crate::modules::position::create_position,
        crate::modules::position::get_position,
        crate::modules::position::update_position,
        crate::modules::position::delete_position,
        crate::modules::salary_adjustment::list_salary_adjustments,
        crate::modules::salary_adjustment::get_salary_adjustment,
        crate::modules::salary_adjustment::create_salary_adjustment,
        crate::modules::salary_adjustment::update_salary_adjustment,
        crate::modules::training::list_plans,
        crate::modules::training::list_courses,
        crate::modules::training::list_records,
        crate::modules::recruitment::list_job_openings,
        crate::modules::performance::list_reviews,
        crate::modules::payroll::list_payroll_runs,
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
            // === V284: 新增 schema ===
            LeaveRequest,
            CreateLeaveRequest,
            UpdateLeaveRequest,
            Position,
            CreatePositionRequest,
            UpdatePositionRequest,
            SalaryAdjustment,
            CreateSalaryAdjustmentRequest,
            UpdateSalaryAdjustmentRequest,
            SalaryAdjustmentPaginationParams,
            TrainingPlan,
            CreateTrainingPlanRequest,
            UpdateTrainingPlanRequest,
            TrainingCourse,
            CreateTrainingCourseRequest,
            UpdateTrainingCourseRequest,
            TrainingRecord,
            CreateTrainingRecordRequest,
            UpdateTrainingRecordRequest,
            TrainingPaginationParams,
            ListAuditLogsQuery,
            JobOpeningQueryParams,
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
