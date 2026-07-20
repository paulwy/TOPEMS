//! Saga 分布式事务编排器
//!
//! 提供基于编排（Orchestration）模式的分布式事务能力，包含：
//! - [`SagaInstance`] 与 [`SagaStep`]：实例与步骤数据模型
//! - [`SagaOrchestrator`]：正向执行 + 失败反向补偿的编排器
//! - [`SagaStore`] trait 与 [`InMemorySagaStore`] / [`PostgresSagaStore`] 实现
//!
//! 典型用法：
//! ```ignore
//! use std::sync::Arc;
//! use topems_shared::saga::{
//!     InMemorySagaStore, SagaOrchestrator, SagaStepDefinition,
//! };
//!
//! let store = Arc::new(InMemorySagaStore::new());
//! let orchestrator = SagaOrchestrator::new(store, None);
//! // orchestrator.execute_saga("order_create", payload, steps).await;
//! ```

pub mod orchestrator;
pub mod step;
pub mod store;

pub use orchestrator::{SagaInstance, SagaOrchestrator, SagaStatus, SagaStepDefinition};
pub use step::{SagaStep, StepStatus};
pub use store::{
    InMemorySagaStore, PostgresSagaStore, SagaError, SagaResult, SagaStore,
};
