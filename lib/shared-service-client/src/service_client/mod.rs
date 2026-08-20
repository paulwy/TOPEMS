// ============ 新增：trait-based 统一通信模式 ============
pub mod api;
pub mod examples;
pub mod trait_api;

// ============ 已有：具体 Client 模块（保持向后兼容）============
// P0-2: 已删除 7 个零引用 client（billing/crm/feedback/search/ticket/mes/qms）
// P0-2 Phase 2: 已删除 7 个有引用 client（wms/erp/finance/monitor/hrm/iam/notification）
// 对应功能由 api/*_api.rs + TypedServiceClient<XxxApi> 替代
pub mod ai_client;
pub mod base_client;
pub mod bi_client;
pub mod communication_client;
pub mod doc_client;
pub mod ehs_client;
pub mod error;
pub mod generic;
pub mod gis_client;
pub mod integration_client;
pub mod lims_client;
pub mod lowcode_client;
pub mod master_data_client;
pub mod mobile_client;
pub mod pdm_client;
pub mod pm_client;
pub mod portal_client;
pub mod rd_client;
pub mod scm_client;
pub mod srm_client;

pub use ai_client::AiServiceClient;
pub use base_client::BaseServiceClient;
pub use bi_client::BiServiceClient;
pub use communication_client::CommunicationServiceClient;
pub use doc_client::DocServiceClient;
pub use ehs_client::EhsServiceClient;
pub use error::{ServiceClientError, ServiceClientResult};
pub use generic::GenericServiceClient;
pub use gis_client::GisServiceClient;
pub use integration_client::IntegrationServiceClient;
pub use lims_client::LimsServiceClient;
pub use lowcode_client::LowcodeServiceClient;
pub use master_data_client::MasterDataServiceClient;
pub use mobile_client::MobileServiceClient;
pub use pdm_client::PdmServiceClient;
pub use pm_client::PmServiceClient;
pub use portal_client::PortalServiceClient;
pub use rd_client::RdServiceClient;
pub use scm_client::ScmServiceClient;
pub use srm_client::SrmServiceClient;
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
// P0-2 Phase 2: workflow 类型从 api::workflow_api 导出
pub use api::workflow_api::{
    CreateInstanceRequest, TaskActionRequest, TaskStats, WorkflowApi, WorkflowInstance,
    WorkflowStatistics, WorkflowTask,
};

pub fn create_ai_client() -> ServiceClientResult<AiServiceClient> {
    AiServiceClient::from_env()
}

pub fn create_scm_client() -> ServiceClientResult<ScmServiceClient> {
    ScmServiceClient::from_env()
}

pub fn create_pm_client() -> ServiceClientResult<PmServiceClient> {
    PmServiceClient::from_env()
}

pub fn create_doc_client() -> ServiceClientResult<DocServiceClient> {
    DocServiceClient::from_env()
}

pub fn create_pdm_client() -> ServiceClientResult<PdmServiceClient> {
    PdmServiceClient::from_env()
}

pub fn create_srm_client() -> ServiceClientResult<SrmServiceClient> {
    SrmServiceClient::from_env()
}

pub fn create_lims_client() -> ServiceClientResult<LimsServiceClient> {
    LimsServiceClient::from_env()
}

pub fn create_ehs_client() -> ServiceClientResult<EhsServiceClient> {
    EhsServiceClient::from_env()
}

pub fn create_bi_client() -> ServiceClientResult<BiServiceClient> {
    BiServiceClient::from_env()
}

pub fn create_rd_client() -> ServiceClientResult<RdServiceClient> {
    RdServiceClient::from_env()
}

pub fn create_mobile_client() -> ServiceClientResult<MobileServiceClient> {
    MobileServiceClient::from_env()
}

pub fn create_portal_client() -> ServiceClientResult<PortalServiceClient> {
    PortalServiceClient::from_env()
}

pub fn create_gis_client() -> ServiceClientResult<GisServiceClient> {
    GisServiceClient::from_env()
}

pub fn create_integration_client() -> ServiceClientResult<IntegrationServiceClient> {
    IntegrationServiceClient::from_env()
}

pub fn create_communication_client() -> ServiceClientResult<CommunicationServiceClient> {
    CommunicationServiceClient::from_env()
}

pub fn create_lowcode_client() -> ServiceClientResult<LowcodeServiceClient> {
    LowcodeServiceClient::from_env()
}

pub fn create_master_data_client() -> ServiceClientResult<MasterDataServiceClient> {
    MasterDataServiceClient::from_env()
}

pub fn create_generic_client(
    service_name: impl Into<String>,
    env_var: &str,
    default_url: &str,
) -> ServiceClientResult<GenericServiceClient> {
    GenericServiceClient::from_env(service_name, env_var, default_url)
}
