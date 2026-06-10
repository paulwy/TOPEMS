pub mod employee;
pub mod department;
pub mod contract;
pub mod attendance;
pub mod audit_log;
pub mod salary_adjustment;
pub mod training;
pub mod company;

// Re-exports for API use
pub use employee::{Employee, CreateEmployeeRequest, UpdateEmployeeRequest};
pub use department::{Department, CreateDepartmentRequest, UpdateDepartmentRequest};
pub use contract::{Contract, ContractPaginationParams, ContractRenewal, CreateContractRequest, CreateRenewalRequest, UpdateContractRequest};
pub use attendance::{AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest};
pub use audit_log::AuditLog;
pub use salary_adjustment::{
    SalaryAdjustment, CreateSalaryAdjustmentRequest, UpdateSalaryAdjustmentRequest,
    ApproveSalaryAdjustmentRequest, RejectSalaryAdjustmentRequest,
};
pub use training::{
    CreateTrainingCourseRequest, CreateTrainingPlanRequest, CreateTrainingRecordRequest,
    TrainingCourse, TrainingPaginationParams, TrainingPlan, TrainingRecord,
    UpdateTrainingCourseRequest, UpdateTrainingPlanRequest, UpdateTrainingRecordRequest,
};
pub use company::{Company, CreateCompanyRequest, UpdateCompanyRequest};
