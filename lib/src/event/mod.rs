//! TOPEMS 事件驱动架构模块
//!
//! 提供事件发布和订阅功能，实现模块间的松耦合通信。
//!
//! V23.0 新增组件：
//! - [`versioning::EventVersionRegistry`]：事件版本注册表，支持灰度迁移
//! - [`schema_registry::SchemaRegistry`]：事件 Schema 注册表，集中管理 payload 校验规则
//! - [`dashboard::EventDashboardGenerator`]：事件治理仪表盘数据生成器
//! - [`dead_letter_queue::DeadLetterQueue`] 增强管理 API：查看/重试/归档/统计

pub mod dashboard;
pub mod dead_letter_queue;
pub mod delayed_message;
pub mod error;
pub mod event_types;
pub mod monitor;
pub mod publisher;
pub mod rabbitmq;
pub mod schema_registry;
pub mod subscriber;
pub mod versioning;

pub use dashboard::{
    EventDashboardGenerator, EventGovernanceDashboard, EventGovernanceSummary,
    EventTypeDistribution, RecentEvent, SchemaRegistryStats as DashboardSchemaRegistryStats,
};
pub use dead_letter_queue::{DeadLetter, DeadLetterList, DeadLetterQueue, DeadLetterStats};
pub use delayed_message::{DelayedMessagePublisher, DelayedMessageSubscriber};
pub use error::{EventError, EventResult};
pub use event_types::{
    AfterSalesTicketCreatedPayload, AiDocumentProcessedPayload, AiImageAnalyzedPayload,
    AiModelTrainedPayload, AiPredictionCompletedPayload, CacheInvalidatedPayload,
    CustomerCreatedPayload, DocDocumentApprovedPayload, DocDocumentUploadedPayload,
    DocDocumentVersionCreatedPayload, EhsAccidentReportedPayload, EhsHazardReportedPayload,
    EmployeeOffboardedPayload, EmployeeOnboardedPayload, Event, EventType,
    FinanceBudgetCreatedPayload, FinanceInvoiceCreatedPayload, FinancePaymentMadePayload,
    FinanceReceiptReceivedPayload, GisDataImportedPayload, GisGeofenceTriggeredPayload,
    GisLocationTrackedPayload, HrmDepartmentCreatedPayload, HrmDepartmentDeletedPayload,
    HrmDepartmentUpdatedPayload, HrmEmployeeCreatedPayload, HrmEmployeeUpdatedPayload,
    InventoryUpdatedPayload, LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload, LimsReagentAlertPayload, LimsRecordCompletedPayload,
    LimsSampleRegisteredPayload, MaterialConsumedPayload, OpportunityWonPayload,
    PaymentMadePayload, PaymentReceivedPayload, PdmBomCreatedPayload, PdmBomUpdatedPayload,
    PdmDocumentReleasedPayload, PdmMaterialCreatedPayload, PdmMaterialUpdatedPayload,
    PermissionChangedPayload, PermissionMetadataChangedPayload, PmProjectCompletedPayload,
    PmProjectCreatedPayload, PmProjectSettledPayload, PmProjectUpdatedPayload,
    PmTaskCreatedPayload, PmTaskDeletedPayload, PmTaskUpdatedPayload, PortalMenuUpdatedPayload,
    PortalNotificationPublishedPayload, PositionCreatedPayload, PositionDeletedPayload,
    PositionUpdatedPayload, ProductionOrderCreatedPayload, PurchaseOrderApprovedPayload,
    PurchaseOrderCreatedPayload, QmsCorrectiveActionCreatedPayload, QmsInspectionCompletedPayload,
    QmsQualityIssueCreatedPayload, QualityIssueResolvedPayload, RdCodeCommitPayload,
    RdProjectCreatedPayload, RdReleaseCreatedPayload, RdRequirementCreatedPayload,
    ReturnCompletedPayload, ReturnProcessedPayload, SalesOrderApprovedPayload,
    SalesOrderCreatedPayload, ScmDemandForecastGeneratedPayload, ScmPurchasePlanCreatedPayload,
    ScmShipmentReceivedPayload, ScmSupplierEvaluatedPayload, SrmBidSubmittedPayload,
    SrmRfqCreatedPayload, SrmSupplierApprovedPayload, SrmSupplierRegisteredPayload,
    StockAdjustedPayload, StockInboundPayload, StockOutboundPayload, StockTakeCompletedPayload,
    StockTransferredPayload, WorkOrderCompletedPayload, WorkflowApprovedPayload,
    WorkflowRejectedPayload, WorkflowStartedPayload,
};
pub use monitor::{EventMetrics, EventMonitor, EventTrace, TraceStatus};
pub use publisher::EventPublisher;
pub use rabbitmq::{RabbitMqPublisher, RabbitMqSubscriber};
pub use schema_registry::{EventSchema, SchemaRegistry, ValidationResult};
pub use subscriber::EventSubscriber;
pub use versioning::{
    EventVersion, EventVersionEntry, EventVersionRegistry, EventVersionRegistryStats,
};
