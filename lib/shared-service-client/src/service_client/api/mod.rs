//! 各服务 API trait 定义
//!
//! 每个子模块定义一个服务的元数据（通过 `ServiceApi` trait）和
//! `TypedServiceClient<SpecificApi>` 上的业务方法。
//!
//! 与 `service_client/` 下已有的具体 Client（如 `iam_client.rs`）相比，
//! 这里的模式用 trait + 泛型替代了手写 struct，消除了样板代码。

pub mod billing_api;
pub mod crm_api;
pub mod erp_api;
pub mod feedback_api;
pub mod file_api;
pub mod finance_api;
pub mod hrm_api;
pub mod iam_api;
pub mod mes_api;
pub mod monitor_api;
pub mod notification_api;
pub mod qms_api;
pub mod search_api;
pub mod ticket_api;
pub mod wms_api;
pub mod workflow_api;
