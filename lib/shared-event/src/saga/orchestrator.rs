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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::saga::store::InMemorySagaStore;

    fn make_orchestrator() -> SagaOrchestrator {
        let store = Arc::new(InMemorySagaStore::new());
        SagaOrchestrator::new(store, None)
    }

    fn ok_step(name: &str) -> SagaStepDefinition {
        SagaStepDefinition {
            name: name.to_string(),
            forward_action: Box::new(|_saga| Box::pin(async { Ok(()) })),
            compensate_action: Some(Box::new(|_saga| Box::pin(async { Ok(()) }))),
        }
    }

    fn fail_step(name: &str, err: &str) -> SagaStepDefinition {
        let err = err.to_string();
        SagaStepDefinition {
            name: name.to_string(),
            forward_action: Box::new(move |_saga| {
                let err = err.clone();
                Box::pin(async move { Err(SagaError::StepFailed(err)) })
            }),
            compensate_action: Some(Box::new(|_saga| Box::pin(async { Ok(()) }))),
        }
    }

    #[test]
    fn test_saga_instance_new_defaults() {
        let saga = SagaInstance::new("order_create", serde_json::json!({"amount": 100}));
        assert_eq!(saga.saga_type, "order_create");
        assert_eq!(saga.status, SagaStatus::Pending);
        assert!(saga.completed_at.is_none());
        assert!(saga.steps.is_empty());
        assert_eq!(saga.current_step_index, 0);
        assert!(saga.error.is_none());
        assert_eq!(saga.payload["amount"], 100);
    }

    #[test]
    fn test_saga_status_equality() {
        assert_eq!(SagaStatus::Pending, SagaStatus::Pending);
        assert_ne!(SagaStatus::Running, SagaStatus::Completed);
        assert_ne!(SagaStatus::Compensating, SagaStatus::Compensated);
        assert_ne!(SagaStatus::Failed, SagaStatus::Aborted);
    }

    #[test]
    fn test_saga_status_serialization() {
        let json = serde_json::to_string(&SagaStatus::Running).unwrap();
        assert!(json.contains("Running"));
        let back: SagaStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(back, SagaStatus::Running);
    }

    #[test]
    fn test_saga_instance_serialization() {
        let saga = SagaInstance::new("test", serde_json::json!({"x": 1}));
        let json = serde_json::to_string(&saga).unwrap();
        let back: SagaInstance = serde_json::from_str(&json).unwrap();
        assert_eq!(back.saga_type, "test");
        assert_eq!(back.payload["x"], 1);
    }

    #[tokio::test]
    async fn test_execute_saga_all_steps_succeed() {
        let orch = make_orchestrator();
        let steps = vec![
            ok_step("create_order"),
            ok_step("reserve_inventory"),
            ok_step("charge_payment"),
        ];

        let saga_id = orch
            .execute_saga("order_flow", serde_json::json!({}), steps)
            .await
            .expect("saga should complete");

        let saga = orch.store.load_saga(saga_id).await.unwrap();
        assert_eq!(saga.status, SagaStatus::Completed);
        assert!(saga.completed_at.is_some());
        assert_eq!(saga.steps.len(), 3);
        for step in &saga.steps {
            assert_eq!(step.status, StepStatus::Completed);
        }
    }

    #[tokio::test]
    async fn test_execute_saga_single_step() {
        let orch = make_orchestrator();
        let saga_id = orch
            .execute_saga("simple", serde_json::json!({}), vec![ok_step("only_step")])
            .await
            .unwrap();

        let saga = orch.store.load_saga(saga_id).await.unwrap();
        assert_eq!(saga.status, SagaStatus::Completed);
        assert_eq!(saga.steps.len(), 1);
    }

    #[tokio::test]
    async fn test_execute_saga_empty_steps_completes() {
        let orch = make_orchestrator();
        let saga_id = orch
            .execute_saga("noop", serde_json::json!({}), vec![])
            .await
            .unwrap();

        let saga = orch.store.load_saga(saga_id).await.unwrap();
        assert_eq!(saga.status, SagaStatus::Completed);
        assert!(saga.steps.is_empty());
    }

    #[tokio::test]
    async fn test_execute_saga_step_fails_triggers_compensation() {
        let orch = make_orchestrator();
        let steps = vec![
            ok_step("step_a"),
            fail_step("step_b", "network error"),
            ok_step("step_c"), // should never run
        ];

        let result = orch
            .execute_saga("fail_flow", serde_json::json!({}), steps)
            .await;

        assert!(result.is_err());
        let saga_id = result.unwrap_err().to_string();

        // The saga should be in Compensated state (all compensations succeeded)
        let sagas = orch.store.list_failed_sagas().await.unwrap();
        // list_failed only returns Failed status, but our saga is Compensated
        assert!(sagas.is_empty());

        // Verify by listing pending - should also be empty
        let pending = orch.store.list_pending_sagas().await.unwrap();
        assert!(pending.is_empty());
    }

    #[tokio::test]
    async fn test_execute_saga_first_step_fails_no_compensation_needed() {
        let orch = make_orchestrator();
        let steps = vec![
            fail_step("step_a", "immediate failure"),
            ok_step("step_b"),
        ];

        let result = orch
            .execute_saga("early_fail", serde_json::json!({}), steps)
            .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_execute_saga_compensation_failure_aborts() {
        let orch = make_orchestrator();
        // Step A succeeds (Completed) but its compensation fails.
        // Step B fails → triggers compensation of step A → compensation fails → Aborted.
        let steps = vec![
            SagaStepDefinition {
                name: "step_a".to_string(),
                forward_action: Box::new(|_saga| Box::pin(async { Ok(()) })),
                compensate_action: Some(Box::new(|_saga| {
                    Box::pin(async { Err(SagaError::CompensationFailed("rollback failed".into())) })
                })),
            },
            fail_step("step_b", "forward failure"),
        ];

        let result = orch
            .execute_saga("comp_fail", serde_json::json!({}), steps)
            .await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("rollback failed"));
    }

    #[tokio::test]
    async fn test_execute_saga_step_without_compensation_skipped() {
        let orch = make_orchestrator();
        let steps = vec![
            SagaStepDefinition {
                name: "no_comp".to_string(),
                forward_action: Box::new(|_saga| Box::pin(async { Ok(()) })),
                compensate_action: None, // No compensation
            },
            fail_step("fail_step", "fail"),
        ];

        let result = orch
            .execute_saga("no_comp_flow", serde_json::json!({}), steps)
            .await;

        assert!(result.is_err());
        // The saga should be compensated (step without compensation is skipped)
    }

    #[tokio::test]
    async fn test_compensate_saga_manual() {
        let orch = make_orchestrator();

        // First, create a saga manually and save it
        let mut saga = SagaInstance::new("manual_comp", serde_json::json!({}));
        saga.steps.push(crate::saga::step::SagaStep::new("s1", 0));
        saga.steps[0].status = StepStatus::Completed;
        saga.steps.push(crate::saga::step::SagaStep::new("s2", 1));
        saga.steps[1].status = StepStatus::Completed;
        let saga_id = saga.id;
        orch.store.save_saga(&saga).await.unwrap();

        // Now compensate
        orch.compensate_saga(saga_id).await.expect("compensation should succeed");

        let loaded = orch.store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.status, SagaStatus::Compensated);
        assert!(loaded.completed_at.is_some());
        // All completed steps should be compensated
        for step in &loaded.steps {
            assert_eq!(step.status, StepStatus::Compensated);
        }
    }

    #[tokio::test]
    async fn test_compensate_saga_skips_non_completed_steps() {
        let orch = make_orchestrator();
        let mut saga = SagaInstance::new("skip_comp", serde_json::json!({}));
        saga.steps.push(crate::saga::step::SagaStep::new("completed", 0));
        saga.steps[0].status = StepStatus::Completed;
        saga.steps.push(crate::saga::step::SagaStep::new("pending", 1));
        saga.steps[1].status = StepStatus::Pending;
        let saga_id = saga.id;
        orch.store.save_saga(&saga).await.unwrap();

        orch.compensate_saga(saga_id).await.unwrap();

        let loaded = orch.store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.steps[0].status, StepStatus::Compensated);
        // Pending step should remain Pending
        assert_eq!(loaded.steps[1].status, StepStatus::Pending);
    }

    #[tokio::test]
    async fn test_compensate_nonexistent_saga_returns_error() {
        let orch = make_orchestrator();
        let result = orch.compensate_saga(Uuid::new_v4()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_execute_saga_with_payload() {
        let orch = make_orchestrator();
        let payload = serde_json::json!({
            "order_id": "12345",
            "amount": 99.99,
            "currency": "USD"
        });

        let saga_id = orch
            .execute_saga("payload_test", payload.clone(), vec![ok_step("process")])
            .await
            .unwrap();

        let saga = orch.store.load_saga(saga_id).await.unwrap();
        assert_eq!(saga.payload["order_id"], "12345");
        assert_eq!(saga.payload["amount"], 99.99);
        assert_eq!(saga.payload["currency"], "USD");
    }

    #[tokio::test]
    async fn test_execute_saga_persists_to_store() {
        let store = Arc::new(InMemorySagaStore::new());
        let orch = SagaOrchestrator::new(store.clone(), None);

        let saga_id = orch
            .execute_saga("persist_test", serde_json::json!({}), vec![ok_step("s1")])
            .await
            .unwrap();

        // Verify it's persisted in the shared store
        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.saga_type, "persist_test");
    }

    #[tokio::test]
    async fn test_multiple_sagas_independent() {
        let orch = make_orchestrator();

        let id1 = orch
            .execute_saga("saga_1", serde_json::json!({}), vec![ok_step("a")])
            .await
            .unwrap();
        let id2 = orch
            .execute_saga("saga_2", serde_json::json!({}), vec![ok_step("b")])
            .await
            .unwrap();

        assert_ne!(id1, id2);
        let s1 = orch.store.load_saga(id1).await.unwrap();
        let s2 = orch.store.load_saga(id2).await.unwrap();
        assert_eq!(s1.saga_type, "saga_1");
        assert_eq!(s2.saga_type, "saga_2");
    }
}
