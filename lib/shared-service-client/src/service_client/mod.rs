// ============ trait-based 统一通信模式 ============
pub mod api;
pub mod examples;
pub mod trait_api;

// ============ 基础设施（保留）============
pub mod base_client;
pub mod circuit_breaker;
pub mod error;
pub mod generic;
pub mod metrics;

pub use base_client::BaseServiceClient;
pub use error::ServiceClientResult;
// ServiceClientError 已合并到 TopemsError，保留 re-export 以向后兼容
pub use generic::GenericServiceClient;
pub use metrics::{ClientMetrics, ClientMetricsSnapshot};
pub use topems_shared_core::error::TopemsError as ServiceClientError;
pub use trait_api::{ServiceApi, TypedServiceClient};

// P0-2 Phase 2: 各服务类型从 api::*_api 导出
pub use api::erp_api::{ErpApi, ErpAsset};
pub use api::finance_api::FinanceApi;
pub use api::hrm_api::{
    HrmApi, HrmAttendanceStats, HrmCheckInRequest, HrmCheckOutRequest, HrmCompany,
    HrmCreateLeaveRequest, HrmDepartment, HrmEmployee,
};
pub use api::iam_api::{IamApi, IamRole, IamUser};
pub use api::monitor_api::MonitorApi;
pub use api::notification_api::{CreateNotification, NotificationApi, NotificationItem};
pub use api::wms_api::WmsApi;
pub use api::workflow_api::{
    CreateInstanceRequest, TaskActionRequest, TaskStats, WorkflowApi, WorkflowInstance,
    WorkflowStatistics, WorkflowTask,
};

// P2-2: 从宏模式客户端迁移的 16 个 Api 元数据（[V2026.08 已移除] LowcodeApi）
pub use api::macro_client_apis::{
    AiApi, BiApi, CommunicationApi, DocApi, EhsApi, GisApi, IntegrationApi, LimsApi, MasterDataApi,
    MobileApi, PdmApi, PmApi, PortalApi, RdApi, ScmApi, SrmApi,
};

pub fn create_generic_client(
    service_name: impl Into<String>,
    env_var: &str,
    default_url: &str,
) -> ServiceClientResult<GenericServiceClient> {
    GenericServiceClient::from_env(service_name, env_var, default_url)
}
