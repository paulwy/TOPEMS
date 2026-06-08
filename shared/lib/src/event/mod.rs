//! TOPEMS 事件驱动架构模块
//! 
//! 提供事件发布和订阅功能，实现模块间的松耦合通信。

pub mod error;
pub mod event;
pub mod publisher;
pub mod subscriber;

pub use error::{EventError, EventResult};
pub use event::{
    Event, 
    EventType, 
    HrmEmployeeCreatedPayload,
    HrmEmployeeUpdatedPayload,
    PmProjectCreatedPayload,
};
pub use publisher::EventPublisher;
pub use subscriber::EventSubscriber;
