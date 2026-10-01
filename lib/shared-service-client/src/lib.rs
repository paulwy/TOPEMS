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
pub use service_client::error::ServiceClientResult;
// ServiceClientError 已合并到 TopemsError，保留 re-export 以向后兼容
pub use service_client::generic::GenericServiceClient;
pub use service_client::trait_api::{ServiceApi, TypedServiceClient};
pub use topems_shared_core::error::TopemsError as ServiceClientError;

// P0-2 Phase 2 + P2-2: 所有服务类型统一从 api::*_api 导出
pub use service_client::api::erp_api::{ErpApi, ErpAsset};
pub use service_client::api::finance_api::FinanceApi;
pub use service_client::api::hrm_api::{
    HrmApi, HrmAttendanceStats, HrmCheckInRequest, HrmCheckOutRequest, HrmCompany,
    HrmCreateLeaveRequest, HrmDepartment, HrmEmployee,
};
pub use service_client::api::iam_api::{IamApi, IamRole, IamUser};
pub use service_client::api::monitor_api::MonitorApi;
pub use service_client::api::notification_api::{
    CreateNotification, NotificationApi, NotificationItem,
};
pub use service_client::api::wms_api::WmsApi;
pub use service_client::api::workflow_api::{
    CreateInstanceRequest, TaskActionRequest, TaskStats, WorkflowApi, WorkflowInstance,
    WorkflowStatistics, WorkflowTask,
};
// P2-2: 从宏模式客户端迁移的 16 个 Api 元数据（[V2026.08 已移除] LowcodeApi）
pub use service_client::api::macro_client_apis::{
    AiApi, BiApi, CommunicationApi, DocApi, EhsApi, GisApi, IntegrationApi, LimsApi, MasterDataApi,
    MobileApi, PdmApi, PmApi, PortalApi, RdApi, ScmApi, SrmApi,
};

// notification 模块 re-export
pub use notification::{
    ArchiveConfig, CreateNotificationRequest, CreateTemplateRequest, Notification,
    NotificationListQuery, NotificationListResponse, NotificationServiceClient,
    NotificationServiceState, NotificationStats, NotificationTemplate, NotificationType,
    RenderTemplateRequest, TemplateStatus,
};

// 工厂函数 re-export
// P0-2 + P2-2: 所有 *_client 工厂函数已删除，统一使用 TypedServiceClient<XxxApi>::from_env_default()
pub use service_client::create_generic_client;

// 宏通过 #[macro_export] 自动导出到 crate 根：
// - define_service_api!
