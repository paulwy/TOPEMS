//! # TOPEMS Shared Service Client
//!
//! 服务客户端模块，提供类型安全的跨服务 HTTP 调用能力。
//!
//! 包含：基础服务客户端、各业务服务客户端（Iam/Hrm/Finance/Erp 等）、
//! 泛型客户端、trait 定义、API trait 定义等。

pub mod notification;
pub mod service_client;

// 细粒度 re-export：基础类型
pub use service_client::base_client::BaseServiceClient;
pub use service_client::error::{ServiceClientError, ServiceClientResult};
pub use service_client::generic::GenericServiceClient;
pub use service_client::trait_api::{ServiceApi, TypedServiceClient};

// 各业务服务客户端 re-export
pub use service_client::ai_client::AiServiceClient;
pub use service_client::bi_client::BiServiceClient;
pub use service_client::crm_client::CrmServiceClient;
pub use service_client::doc_client::DocServiceClient;
pub use service_client::ehs_client::EhsServiceClient;
pub use service_client::erp_client::ErpServiceClient;
pub use service_client::finance_client::FinanceServiceClient;
pub use service_client::gis_client::GisServiceClient;
pub use service_client::hrm_client::{
    AttendanceRecord, AttendanceStats, CheckInRequest, CheckOutRequest, Company,
    CreateLeaveRequest, Department, Employee, HrmServiceClient, LeaveApplication,
};
pub use service_client::iam_client::{IamServiceClient, Role, User};
pub use service_client::integration_client::IntegrationServiceClient;
pub use service_client::lims_client::LimsServiceClient;
pub use service_client::mes_client::MesServiceClient;
pub use service_client::mobile_client::MobileServiceClient;
pub use service_client::monitor_client::MonitorServiceClient;
pub use service_client::notification_client::NotificationSvcClient;
pub use service_client::pdm_client::PdmServiceClient;
pub use service_client::pm_client::PmServiceClient;
pub use service_client::portal_client::PortalServiceClient;
pub use service_client::qms_client::QmsServiceClient;
pub use service_client::rd_client::RdServiceClient;
pub use service_client::scm_client::ScmServiceClient;
pub use service_client::srm_client::SrmServiceClient;
pub use service_client::wms_client::WmsServiceClient;
pub use service_client::workflow_client::{
    CreateInstanceRequest, TaskStats, WorkflowInstance, WorkflowServiceClient, WorkflowStatistics,
    WorkflowTask,
};

// notification 模块 re-export
pub use notification::{
    ArchiveConfig, CreateNotificationRequest, CreateTemplateRequest, Notification,
    NotificationListQuery, NotificationListResponse, NotificationServiceClient,
    NotificationServiceState, NotificationStats, NotificationTemplate, NotificationType,
    RenderTemplateRequest, TemplateStatus,
};

// 工厂函数 re-export
pub use service_client::{
    create_ai_client, create_bi_client, create_crm_client, create_doc_client, create_ehs_client,
    create_erp_client, create_finance_client, create_generic_client, create_gis_client,
    create_hrm_client, create_iam_client, create_integration_client, create_lims_client,
    create_mes_client, create_mobile_client, create_monitor_client, create_notification_client,
    create_pdm_client, create_pm_client, create_portal_client, create_qms_client, create_rd_client,
    create_scm_client, create_srm_client, create_wms_client, create_workflow_client,
};

// 宏通过 #[macro_export] 自动导出到 crate 根：
// - define_service_client!
// - define_service_api!
