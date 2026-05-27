pub mod employee;
pub mod department;
pub mod contract;
pub mod attendance;

pub use employee::{Employee, CreateEmployeeRequest, UpdateEmployeeRequest};
pub use department::{Department, CreateDepartmentRequest, UpdateDepartmentRequest};
pub use contract::{Contract, CreateContractRequest, UpdateContractRequest};
pub use attendance::{AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest};
