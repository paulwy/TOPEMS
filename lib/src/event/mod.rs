//! TOPEMS 事件驱动架构模块
//!
//! 提供事件发布和订阅功能，实现模块间的松耦合通信。

pub mod dead_letter_queue;
pub mod error;
pub mod event_types;
pub mod monitor;
pub mod publisher;
pub mod rabbitmq;
pub mod subscriber;

pub use dead_letter_queue::{DeadLetter, DeadLetterQueue};
pub use error::{EventError, EventResult};
pub use event_types::{
    EhsAccidentReportedPayload, EhsHazardReportedPayload, Event, EventType,
    HrmDepartmentCreatedPayload, HrmDepartmentDeletedPayload, HrmDepartmentUpdatedPayload,
    HrmEmployeeCreatedPayload, HrmEmployeeUpdatedPayload, LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload, LimsReagentAlertPayload, LimsRecordCompletedPayload,
    LimsSampleRegisteredPayload, PermissionChangedPayload, PmProjectCreatedPayload,
    PmProjectUpdatedPayload, PmTaskCreatedPayload, PmTaskDeletedPayload, PmTaskUpdatedPayload,
    PositionCreatedPayload, PositionDeletedPayload, PositionUpdatedPayload,
    QmsCorrectiveActionCreatedPayload, QmsInspectionCompletedPayload,
    QmsQualityIssueCreatedPayload,
};
pub use monitor::{EventMetrics, EventMonitor, EventTrace, TraceStatus};
pub use publisher::EventPublisher;
pub use rabbitmq::{RabbitMqPublisher, RabbitMqSubscriber};
pub use subscriber::EventSubscriber;
