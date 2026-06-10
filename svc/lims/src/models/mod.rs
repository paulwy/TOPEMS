pub mod sample;
pub mod inspection_process;
pub mod inspection_task;
pub mod inspection_record;
pub mod audit_log;
pub mod instrument;
pub mod reagent;

pub use sample::{Sample, CreateSampleRequest, UpdateSampleRequest};
pub use inspection_process::{InspectionProcess, CreateInspectionProcessRequest, UpdateInspectionProcessRequest};
pub use inspection_task::{InspectionTask, CreateInspectionTaskRequest, UpdateInspectionTaskRequest, CompleteStepRequest};
pub use inspection_record::{InspectionRecord, CreateInspectionRecordRequest};
pub use audit_log::AuditLog;
pub use instrument::{Instrument, CreateInstrumentRequest, UpdateInstrumentRequest, MaintenanceRecord, CreateMaintenanceRecordRequest};
pub use reagent::{Reagent, CreateReagentRequest, UpdateReagentRequest, ReagentUsageRequest};
