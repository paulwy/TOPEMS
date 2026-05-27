pub mod sample;
pub mod inspection_process;
pub mod inspection_task;
pub mod inspection_record;

pub use sample::{Sample, CreateSampleRequest, UpdateSampleRequest};
pub use inspection_process::{InspectionProcess, InspectionStep, CreateInspectionProcessRequest, UpdateInspectionProcessRequest};
pub use inspection_task::{InspectionTask, CreateInspectionTaskRequest, UpdateInspectionTaskRequest, CompleteStepRequest};
pub use inspection_record::{InspectionRecord, CreateInspectionRecordRequest};
