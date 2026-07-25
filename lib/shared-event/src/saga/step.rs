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
