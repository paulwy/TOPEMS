//! Saga 步骤定义
//!
//! 每个 Saga 由多个 SagaStep 组成，每个步骤包含状态、时间戳和元数据。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 步骤状态枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StepStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 已失败
    Failed,
    /// 补偿中
    Compensating,
    /// 已补偿
    Compensated,
    /// 已跳过
    Skipped,
}

/// Saga 步骤实例
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SagaStep {
    /// 步骤唯一 ID
    pub id: Uuid,
    /// 步骤名称
    pub name: String,
    /// 步骤序号（从 0 开始）
    pub step_index: u32,
    /// 步骤状态
    pub status: StepStatus,
    /// 开始执行时间
    pub started_at: Option<DateTime<Utc>>,
    /// 完成时间
    pub completed_at: Option<DateTime<Utc>>,
    /// 错误信息
    pub error: Option<String>,
    /// 步骤负载数据
    pub payload: serde_json::Value,
}

impl SagaStep {
    /// 创建一个新的 Pending 状态的步骤
    pub fn new(name: &str, step_index: u32) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.to_string(),
            step_index,
            status: StepStatus::Pending,
            started_at: None,
            completed_at: None,
            error: None,
            payload: serde_json::Value::Null,
        }
    }

    /// 将步骤标记为 Running
    pub fn start(&mut self) {
        self.status = StepStatus::Running;
        self.started_at = Some(Utc::now());
    }

    /// 将步骤标记为 Completed
    pub fn complete(&mut self) {
        self.status = StepStatus::Completed;
        self.completed_at = Some(Utc::now());
    }

    /// 将步骤标记为 Failed，并记录错误信息
    pub fn fail(&mut self, error: &str) {
        self.status = StepStatus::Failed;
        self.error = Some(error.to_string());
        self.completed_at = Some(Utc::now());
    }

    /// 将步骤标记为 Skipped
    pub fn skip(&mut self) {
        self.status = StepStatus::Skipped;
        self.completed_at = Some(Utc::now());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_step_new_defaults() {
        let step = SagaStep::new("create_order", 0);
        assert_eq!(step.name, "create_order");
        assert_eq!(step.step_index, 0);
        assert_eq!(step.status, StepStatus::Pending);
        assert!(step.started_at.is_none());
        assert!(step.completed_at.is_none());
        assert!(step.error.is_none());
        assert!(step.payload.is_null());
    }

    #[test]
    fn test_step_start_sets_running_and_timestamp() {
        let mut step = SagaStep::new("reserve_inventory", 1);
        step.start();
        assert_eq!(step.status, StepStatus::Running);
        assert!(step.started_at.is_some());
        assert!(step.completed_at.is_none());
    }

    #[test]
    fn test_step_complete_sets_completed_and_timestamp() {
        let mut step = SagaStep::new("charge_payment", 2);
        step.start();
        step.complete();
        assert_eq!(step.status, StepStatus::Completed);
        assert!(step.completed_at.is_some());
    }

    #[test]
    fn test_step_fail_records_error() {
        let mut step = SagaStep::new("ship_order", 3);
        step.start();
        step.fail("carrier unavailable");
        assert_eq!(step.status, StepStatus::Failed);
        assert_eq!(step.error.as_deref(), Some("carrier unavailable"));
        assert!(step.completed_at.is_some());
    }

    #[test]
    fn test_step_skip_sets_status_and_timestamp() {
        let mut step = SagaStep::new("optional_gift_wrap", 4);
        step.skip();
        assert_eq!(step.status, StepStatus::Skipped);
        assert!(step.completed_at.is_some());
    }

    #[test]
    fn test_step_full_lifecycle_start_complete() {
        let mut step = SagaStep::new("send_notification", 0);
        assert_eq!(step.status, StepStatus::Pending);

        step.start();
        assert_eq!(step.status, StepStatus::Running);

        step.complete();
        assert_eq!(step.status, StepStatus::Completed);
    }

    #[test]
    fn test_step_fail_without_start() {
        let mut step = SagaStep::new("skip_start", 0);
        step.fail("immediate failure");
        assert_eq!(step.status, StepStatus::Failed);
        assert_eq!(step.error.as_deref(), Some("immediate failure"));
        assert!(step.started_at.is_none());
        assert!(step.completed_at.is_some());
    }

    #[test]
    fn test_step_serialization_roundtrip() {
        let mut step = SagaStep::new("persist_event", 5);
        step.start();
        step.complete();
        let json = serde_json::to_string(&step).expect("serialize");
        let deserialized: SagaStep = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.name, "persist_event");
        assert_eq!(deserialized.step_index, 5);
        assert_eq!(deserialized.status, StepStatus::Completed);
    }

    #[test]
    fn test_step_status_serde_roundtrip() {
        for status in [
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Completed,
            StepStatus::Failed,
            StepStatus::Compensating,
            StepStatus::Compensated,
            StepStatus::Skipped,
        ] {
            let json = serde_json::to_string(&status).expect("serialize");
            let back: StepStatus = serde_json::from_str(&json).expect("deserialize");
            assert_eq!(status, back);
        }
    }

    #[test]
    fn test_step_clone_is_equal() {
        let mut step = SagaStep::new("clone_test", 7);
        step.start();
        let cloned = step.clone();
        assert_eq!(cloned.name, step.name);
        assert_eq!(cloned.step_index, step.step_index);
        assert_eq!(cloned.status, step.status);
        assert_eq!(cloned.started_at, step.started_at);
    }
}
