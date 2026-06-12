pub mod attendance;
pub mod audit_log;
pub mod company;
pub mod contract;
pub mod department;
pub mod employee;
pub mod salary_adjustment;
pub mod training;

// Re-exports for API use
pub use attendance::{AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest};
pub use audit_log::AuditLog;
pub use company::{Company, CreateCompanyRequest, UpdateCompanyRequest};
pub use contract::{
    Contract, ContractPaginationParams, ContractRenewal, CreateContractRequest,
    CreateRenewalRequest, UpdateContractRequest,
};
pub use department::{CreateDepartmentRequest, Department, UpdateDepartmentRequest};
pub use employee::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
pub use salary_adjustment::{
    ApproveSalaryAdjustmentRequest, CreateSalaryAdjustmentRequest, RejectSalaryAdjustmentRequest,
    SalaryAdjustment, UpdateSalaryAdjustmentRequest,
};
pub use training::{
    CreateTrainingCourseRequest, CreateTrainingPlanRequest, CreateTrainingRecordRequest,
    TrainingCourse, TrainingPaginationParams, TrainingPlan, TrainingRecord,
    UpdateTrainingCourseRequest, UpdateTrainingPlanRequest, UpdateTrainingRecordRequest,
};
