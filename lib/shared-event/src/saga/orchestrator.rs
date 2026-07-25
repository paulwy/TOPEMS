//! Saga 编排器
//!
//! 实现 SagaInstance、SagaStatus、SagaOrchestrator 等核心类型，
//! 负责编排正向执行与失败时的反向补偿。

use crate::event::RabbitMqPublisher;
use crate::saga::step::{SagaStep, StepStatus};
use crate::saga::store::{SagaError, SagaResult, SagaStore};
use chrono::{DateTime, Utc};
use futures::future::BoxFuture;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

/// Saga 实例状态枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SagaStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 已完成（所有步骤成功）
    Completed,
    /// 已失败
    Failed,
    /// 补偿中
    Compensating,
    /// 已补偿
    Compensated,
    /// 已中止（补偿失败）
    Aborted,
}

/// Saga 实例
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SagaInstance {
    /// Saga 实例唯一 ID
    pub id: Uuid,
    /// Saga 类型标识
    pub saga_type: String,
    /// 当前状态
    pub status: SagaStatus,
    /// 启动时间
    pub started_at: DateTime<Utc>,
    /// 完成时间
    pub completed_at: Option<DateTime<Utc>>,
    /// 包含的所有步骤
    pub steps: Vec<SagaStep>,
    /// 当前正在执行的步骤序号
    pub current_step_index: u32,
    /// Saga 输入负载
    pub payload: serde_json::Value,
    /// 错误信息
    pub error: Option<String>,
}

impl SagaInstance {
    pub fn new(saga_type: &str, payload: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4(),
            saga_type: saga_type.to_string(),
            status: SagaStatus::Pending,
            started_at: Utc::now(),
            completed_at: None,
            steps: Vec::new(),
            current_step_index: 0,
            payload,
            error: None,
        }
    }
}

/// Saga 步骤定义（包含正向与补偿回调）
///
/// `forward_action` 在正向执行时调用，`compensate_action` 在需要补偿时调用。
/// 两个回调均以 `SagaInstance`（Clone）作为参数，并返回 `BoxFuture<Result<(), SagaError>>`。
pub struct SagaStepDefinition {
    /// 步骤名称
    pub name: String,
    /// 正向执行动作
    pub forward_action:
        Box<dyn Fn(SagaInstance) -> BoxFuture<'static, Result<(), SagaError>> + Send + Sync>,
    /// 补偿动作（可选，None 表示该步骤无补偿逻辑）
    pub compensate_action: Option<
        Box<dyn Fn(SagaInstance) -> BoxFuture<'static, Result<(), SagaError>> + Send + Sync>,
    >,
}

/// Saga 编排器
///
/// 持有一个 SagaStore 实现，可选 RabbitMQ 事件发布器，对外的核心 API 是
/// [`execute_saga`](Self::execute_saga) 和 [`compensate_saga](Self::compensate_saga)。
pub struct SagaOrchestrator {
    store: Arc<dyn SagaStore>,
    /// 事件发布器，目前仅用于日志记录；后续可接入 Saga 相关 EventType
    #[allow(dead_code)]
    event_publisher: Option<Arc<RabbitMqPublisher>>,
}

impl SagaOrchestrator {
    pub fn new(store: Arc<dyn SagaStore>, event_publisher: Option<Arc<RabbitMqPublisher>>) -> Self {
        Self {
            store,
            event_publisher,
        }
    }

    /// 执行一个 Saga
    ///
    /// 1. 创建 SagaInstance 并持久化到 store
    /// 2. 依次执行每个 step 的 forward_action
    /// 3. 任一 step 失败时，对之前已 Completed 的 steps 反向执行 compensate_action
    /// 4. 每个 step 执行前后更新状态并持久化
    /// 5. 事件发布：当前 EventType 没有 Saga 相关类型，仅记录日志
    /// 6. 返回 saga_id
    pub async fn execute_saga(
        &self,
        saga_type: &str,
        payload: serde_json::Value,
        steps: Vec<SagaStepDefinition>,
    ) -> SagaResult<Uuid> {
        // a. 创建 SagaInstance 并持久化
        let mut saga = SagaInstance::new(saga_type, payload);
        for (idx, def) in steps.iter().enumerate() {
            saga.steps.push(SagaStep::new(&def.name, idx as u32));
        }
        saga.status = SagaStatus::Running;
        self.store.save_saga(&saga).await?;
        let saga_id = saga.id;
        info!(saga_id = %saga_id, saga_type = %saga.saga_type, "Saga started");

        // b. 依次执行每个 step 的 forward_action
        for (idx, def) in steps.iter().enumerate() {
            saga.current_step_index = idx as u32;
            saga.steps[idx].start();
            self.store
                .update_step_status(saga_id, idx as u32, StepStatus::Running, None)
                .await?;
            self.store.save_saga(&saga).await?;

            let saga_snapshot = saga.clone();
            match (def.forward_action)(saga_snapshot).await {
                Ok(()) => {
                    saga.steps[idx].complete();
                    self.store
                        .update_step_status(saga_id, idx as u32, StepStatus::Completed, None)
                        .await?;
                    self.store.save_saga(&saga).await?;
                    info!(saga_id = %saga_id, step_index = idx, "Saga step completed");
                }
                Err(e) => {
                    let err_msg = e.to_string();
                    error!(
                        saga_id = %saga_id,
                        step_index = idx,
                        error = %err_msg,
                        "Saga step failed"
                    );
                    saga.steps[idx].fail(&err_msg);
                    saga.status = SagaStatus::Compensating;
                    saga.error = Some(err_msg.clone());
                    self.store
                        .update_step_status(
                            saga_id,
                            idx as u32,
                            StepStatus::Failed,
                            Some(err_msg.clone()),
                        )
                        .await?;
                    self.store
                        .update_saga_status(saga_id, SagaStatus::Compensating)
                        .await?;
                    self.store.save_saga(&saga).await?;

                    // c. 反向补偿已完成的 steps
                    for comp_idx in (0..idx).rev() {
                        // 跳过状态非 Completed 的 step
                        if saga.steps[comp_idx].status != StepStatus::Completed {
                            warn!(
                                saga_id = %saga_id,
                                step_index = comp_idx,
                                "Skipping compensation: step status is not Completed"
                            );
                            continue;
                        }
                        // 跳过没有 compensate_action 的 step
                        let compensate_action = match &steps[comp_idx].compensate_action {
                            Some(a) => a,
                            None => {
                                warn!(
                                    saga_id = %saga_id,
                                    step_index = comp_idx,
                                    "Skipping compensation: no compensate_action defined"
                                );
                                continue;
                            }
                        };

                        saga.steps[comp_idx].status = StepStatus::Compensating;
                        self.store
                            .update_step_status(
                                saga_id,
                                comp_idx as u32,
                                StepStatus::Compensating,
                                None,
                            )
                            .await?;
                        self.store.save_saga(&saga).await?;

                        let saga_comp = saga.clone();
                        match compensate_action(saga_comp).await {
                            Ok(()) => {
                                saga.steps[comp_idx].status = StepStatus::Compensated;
                                self.store
                                    .update_step_status(
                                        saga_id,
                                        comp_idx as u32,
                                        StepStatus::Compensated,
                                        None,
                                    )
                                    .await?;
                                self.store.save_saga(&saga).await?;
                                info!(
                                    saga_id = %saga_id,
                                    step_index = comp_idx,
                                    "Compensation succeeded"
                                );
                            }
                            Err(comp_err) => {
                                let err = comp_err.to_string();
                                error!(
                                    saga_id = %saga_id,
                                    step_index = comp_idx,
                                    error = %err,
                                    "Compensation failed"
                                );
                                saga.steps[comp_idx].error = Some(err.clone());
                                saga.status = SagaStatus::Aborted;
                                self.store
                                    .update_step_status(
                                        saga_id,
                                        comp_idx as u32,
                                        StepStatus::Failed,
                                        Some(err),
                                    )
                                    .await?;
                                self.store
                                    .update_saga_status(saga_id, SagaStatus::Aborted)
                                    .await?;
                                self.store.save_saga(&saga).await?;
                                // e. 事件发布（仅日志记录）
                                info!(
                                    saga_id = %saga_id,
                                    status = "Aborted",
                                    "Saga event (compensation failed)"
                                );
                                return Err(SagaError::CompensationFailed(comp_err.to_string()));
                            }
                        }
                    }

                    // 所有补偿成功完成
                    saga.status = SagaStatus::Compensated;
                    saga.completed_at = Some(Utc::now());
                    self.store
                        .update_saga_status(saga_id, SagaStatus::Compensated)
                        .await?;
                    self.store.save_saga(&saga).await?;
                    // e. 事件发布（仅日志记录）
                    info!(
                        saga_id = %saga_id,
                        status = "Compensated",
                        "Saga event (compensated)"
                    );
                    return Err(SagaError::StepFailed(err_msg));
                }
            }
        }

        // d. 所有步骤成功完成
        saga.status = SagaStatus::Completed;
        saga.completed_at = Some(Utc::now());
        self.store
            .update_saga_status(saga_id, SagaStatus::Completed)
            .await?;
        self.store.save_saga(&saga).await?;
        // e. 事件发布（仅日志记录）
        info!(
            saga_id = %saga_id,
            status = "Completed",
            "Saga event (completed)"
        );
        info!(saga_id = %saga_id, "Saga completed successfully");

        Ok(saga_id)
    }

    /// 对指定 Saga 实例执行补偿
    ///
    /// 从 store 加载 saga 实例，对状态为 Completed 的 steps 反向执行补偿。
    ///
    /// 注意：`compensate_action` 回调仅在 [`execute_saga`](Self::execute_saga) 调用上下文中可用，
    /// 此处只能更新步骤状态。业务侧应通过 `execute_saga` 的失败路径触发实际的补偿逻辑。
    pub async fn compensate_saga(&self, saga_id: Uuid) -> SagaResult<()> {
        let mut saga = self.store.load_saga(saga_id).await?;
        info!(saga_id = %saga_id, "Manual compensation started");

        saga.status = SagaStatus::Compensating;
        self.store
            .update_saga_status(saga_id, SagaStatus::Compensating)
            .await?;
        self.store.save_saga(&saga).await?;

        // 反向遍历步骤
        for step in saga.steps.iter_mut().rev() {
            if step.status != StepStatus::Completed {
                warn!(
                    saga_id = %saga_id,
                    step_index = step.step_index,
                    "Skipping compensation: step status is not Completed"
                );
                continue;
            }

            step.status = StepStatus::Compensating;
            self.store
                .update_step_status(saga_id, step.step_index, StepStatus::Compensating, None)
                .await?;

            step.status = StepStatus::Compensated;
            self.store
                .update_step_status(saga_id, step.step_index, StepStatus::Compensated, None)
                .await?;
            info!(
                saga_id = %saga_id,
                step_index = step.step_index,
                "Step marked as Compensated"
            );
        }

        saga.status = SagaStatus::Compensated;
        saga.completed_at = Some(Utc::now());
        self.store
            .update_saga_status(saga_id, SagaStatus::Compensated)
            .await?;
        self.store.save_saga(&saga).await?;
        info!(saga_id = %saga_id, "Manual compensation completed");

        Ok(())
    }
}
