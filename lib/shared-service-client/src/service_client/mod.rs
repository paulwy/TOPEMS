// ============ 新增：trait-based 统一通信模式 ============
pub mod api;
pub mod examples;
pub mod trait_api;

// ============ 已有：具体 Client 模块（保持向后兼容）============
pub mod ai_client;
pub mod base_client;
pub mod bi_client;
pub mod billing_client;
pub mod communication_client;
pub mod crm_client;
pub mod doc_client;
pub mod ehs_client;
pub mod erp_client;
pub mod error;
pub mod feedback_client;
pub mod finance_client;
pub mod generic;
pub mod gis_client;
pub mod hrm_client;
pub mod iam_client;
pub mod integration_client;
pub mod lims_client;
pub mod lowcode_client;
pub mod master_data_client;
pub mod mes_client;
pub mod mobile_client;
pub mod monitor_client;
pub mod notification_client;
pub mod pdm_client;
pub mod pm_client;
pub mod portal_client;
pub mod qms_client;
pub mod rd_client;
pub mod scm_client;
pub mod search_client;
pub mod srm_client;
pub mod ticket_client;
pub mod wms_client;
pub mod workflow_client;

pub use ai_client::AiServiceClient;
pub use base_client::BaseServiceClient;
pub use bi_client::BiServiceClient;
pub use billing_client::BillingServiceClient;
pub use communication_client::CommunicationServiceClient;
pub use crm_client::CrmServiceClient;
pub use doc_client::DocServiceClient;
pub use ehs_client::EhsServiceClient;
pub use erp_client::ErpServiceClient;
pub use error::{ServiceClientError, ServiceClientResult};
pub use feedback_client::FeedbackServiceClient;
pub use finance_client::FinanceServiceClient;
pub use generic::GenericServiceClient;
pub use gis_client::GisServiceClient;
pub use hrm_client::{
    AttendanceRecord, AttendanceStats, CheckInRequest, CheckOutRequest, Company,
    CreateLeaveRequest, Department, Employee, HrmServiceClient, LeaveApplication,
};
pub use iam_client::{IamServiceClient, Role, User};
pub use integration_client::IntegrationServiceClient;
pub use lims_client::LimsServiceClient;
pub use lowcode_client::LowcodeServiceClient;
pub use master_data_client::MasterDataServiceClient;
pub use mes_client::MesServiceClient;
pub use mobile_client::MobileServiceClient;
pub use monitor_client::MonitorServiceClient;
pub use notification_client::NotificationSvcClient;
pub use pdm_client::PdmServiceClient;
pub use pm_client::PmServiceClient;
pub use portal_client::PortalServiceClient;
pub use qms_client::QmsServiceClient;
pub use rd_client::RdServiceClient;
pub use scm_client::ScmServiceClient;
pub use search_client::SearchServiceClient;
pub use srm_client::SrmServiceClient;
pub use ticket_client::TicketServiceClient;
pub use trait_api::{ServiceApi, TypedServiceClient};
pub use wms_client::WmsServiceClient;
pub use workflow_client::{
    CreateInstanceRequest, TaskStats, WorkflowInstance, WorkflowServiceClient, WorkflowStatistics,
    WorkflowTask,
};

pub fn create_hrm_client() -> ServiceClientResult<HrmServiceClient> {
    HrmServiceClient::from_env()
}

pub fn create_iam_client() -> ServiceClientResult<IamServiceClient> {
    IamServiceClient::from_env()
}

pub fn create_notification_client() -> ServiceClientResult<NotificationSvcClient> {
    NotificationSvcClient::from_env()
}

pub fn create_qms_client() -> ServiceClientResult<QmsServiceClient> {
    QmsServiceClient::from_env()
}

pub fn create_mes_client() -> ServiceClientResult<MesServiceClient> {
    MesServiceClient::from_env()
}

pub fn create_erp_client() -> ServiceClientResult<ErpServiceClient> {
    ErpServiceClient::from_env()
}

pub fn create_wms_client() -> ServiceClientResult<WmsServiceClient> {
    WmsServiceClient::from_env()
}

pub fn create_scm_client() -> ServiceClientResult<ScmServiceClient> {
    ScmServiceClient::from_env()
}

pub fn create_pm_client() -> ServiceClientResult<PmServiceClient> {
    PmServiceClient::from_env()
}

pub fn create_crm_client() -> ServiceClientResult<CrmServiceClient> {
    CrmServiceClient::from_env()
}

pub fn create_finance_client() -> ServiceClientResult<FinanceServiceClient> {
    FinanceServiceClient::from_env()
}

pub fn create_doc_client() -> ServiceClientResult<DocServiceClient> {
    DocServiceClient::from_env()
}

pub fn create_ai_client() -> ServiceClientResult<AiServiceClient> {
    AiServiceClient::from_env()
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

pub fn create_monitor_client() -> ServiceClientResult<MonitorServiceClient> {
    MonitorServiceClient::from_env()
}

pub fn create_workflow_client() -> ServiceClientResult<WorkflowServiceClient> {
    WorkflowServiceClient::from_env()
}

pub fn create_gis_client() -> ServiceClientResult<GisServiceClient> {
    GisServiceClient::from_env()
}

pub fn create_integration_client() -> ServiceClientResult<IntegrationServiceClient> {
    IntegrationServiceClient::from_env()
}

pub fn create_billing_client() -> ServiceClientResult<BillingServiceClient> {
    BillingServiceClient::from_env()
}

pub fn create_communication_client() -> ServiceClientResult<CommunicationServiceClient> {
    CommunicationServiceClient::from_env()
}

pub fn create_feedback_client() -> ServiceClientResult<FeedbackServiceClient> {
    FeedbackServiceClient::from_env()
}

pub fn create_lowcode_client() -> ServiceClientResult<LowcodeServiceClient> {
    LowcodeServiceClient::from_env()
}

pub fn create_master_data_client() -> ServiceClientResult<MasterDataServiceClient> {
    MasterDataServiceClient::from_env()
}

pub fn create_search_client() -> ServiceClientResult<SearchServiceClient> {
    SearchServiceClient::from_env()
}

pub fn create_ticket_client() -> ServiceClientResult<TicketServiceClient> {
    TicketServiceClient::from_env()
}

pub fn create_generic_client(
    service_name: impl Into<String>,
    env_var: &str,
    default_url: &str,
) -> ServiceClientResult<GenericServiceClient> {
    GenericServiceClient::from_env(service_name, env_var, default_url)
}
