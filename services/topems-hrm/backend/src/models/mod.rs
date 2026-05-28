pub mod employee;
pub mod department;
pub mod contract;
pub mod attendance;
pub mod audit_log;

pub use employee::{Employee, CreateEmployeeRequest, UpdateEmployeeRequest};
pub use department::{Department, CreateDepartmentRequest, UpdateDepartmentRequest};
pub use contract::{Contract, CreateContractRequest, UpdateContractRequest};
pub use attendance::{AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest};
pub use audit_log::{AuditLog, CreateAuditLogRequest, AuditLogQuery};
