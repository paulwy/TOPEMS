// V45.0 Track A: Finance Saga 协调器
// =============================================================================
// 分布式事务编排 + 补偿动作
// 步骤模型：正向 action + 补偿 compensation

use std::sync::Mutex;

use super::event_publisher::event_type_name;
use super::events::FinanceDomainEvent;

// =============================================================================
// Saga 数据模型
// =============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SagaStep {
    pub id: String,
    pub name: String,
    pub action: SagaAction,
    pub compensation: SagaAction,
    pub status: SagaStepStatus,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SagaAction {
    pub action_type: SagaActionType,
    pub target_service: String,
    pub endpoint: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SagaActionType {
    HttpPost,
    HttpPut,
    HttpDelete,
    PublishEvent,
    LocalCall,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SagaStepStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Compensated,
    Skipped,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SagaInstance {
    pub id: String,
    pub saga_type: String,
    pub status: SagaStatus,
    pub steps: Vec<SagaStep>,
    pub current_step: usize,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub correlation_id: String,
    pub payload: serde_json::Value,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SagaStatus {
    Running,
    Completed,
    Failed,
    Compensating,
    Compensated,
    Aborted,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct SagaStats {
    pub total: usize,
    pub running: usize,
    pub completed: usize,
    pub failed: usize,
    pub compensating: usize,
    pub compensated: usize,
    pub aborted: usize,
    pub by_type: std::collections::HashMap<String, usize>,
}

// =============================================================================
// Saga 定义 trait
// =============================================================================

pub trait SagaDefinition: Send + Sync {
    fn saga_type(&self) -> &str;
    fn build_steps(&self, payload: &serde_json::Value) -> Vec<SagaStep>;
}

/// 构造 SagaStep 的辅助函数
fn make_step(
    id: impl Into<String>,
    name: impl Into<String>,
    action_type: SagaActionType,
    target_service: impl Into<String>,
    endpoint: impl Into<String>,
    payload: serde_json::Value,
    comp_action_type: SagaActionType,
    comp_endpoint: impl Into<String>,
    comp_payload: serde_json::Value,
) -> SagaStep {
    let id = id.into();
    let name = name.into();
    let target_service = target_service.into();
    let endpoint = endpoint.into();
    let comp_endpoint = comp_endpoint.into();
    SagaStep {
        id,
        name,
        action: SagaAction {
            action_type,
            target_service,
            endpoint,
            payload,
        },
        compensation: SagaAction {
            action_type: comp_action_type,
            target_service: "finance".to_string(),
            endpoint: comp_endpoint,
            payload: comp_payload,
        },
        status: SagaStepStatus::Pending,
        started_at: None,
        completed_at: None,
        error: None,
    }
}

// =============================================================================
// Saga 协调器
// =============================================================================

pub struct SagaCoordinator {
    definitions: Mutex<Vec<Box<dyn SagaDefinition>>>,
    instances: Mutex<Vec<SagaInstance>>,
}

impl SagaCoordinator {
    pub fn new() -> Self {
        Self {
            definitions: Mutex::new(Vec::new()),
            instances: Mutex::new(Vec::new()),
        }
    }

    pub fn register_definition(&self, def: Box<dyn SagaDefinition>) {
        if let Ok(mut defs) = self.definitions.lock() {
            defs.push(def);
        }
    }

    pub async fn start_saga(
        &self,
        saga_type: &str,
        payload: serde_json::Value,
    ) -> Result<String, String> {
        let steps = {
            let defs = self.definitions.lock().map_err(|e| e.to_string())?;
            let def = defs
                .iter()
                .find(|d| d.saga_type() == saga_type)
                .ok_or_else(|| format!("Saga definition '{}' not found", saga_type))?;
            def.build_steps(&payload)
        };
        let saga_id = uuid::Uuid::new_v4().to_string();
        let correlation_id = uuid::Uuid::new_v4().to_string();
        let instance = SagaInstance {
            id: saga_id.clone(),
            saga_type: saga_type.to_string(),
            status: SagaStatus::Running,
            steps,
            current_step: 0,
            started_at: chrono::Utc::now(),
            completed_at: None,
            correlation_id,
            payload,
            result: None,
            error: None,
        };
        if let Ok(mut instances) = self.instances.lock() {
            instances.push(instance);
        }
        Ok(saga_id)
    }

    /// 执行 Saga：依次执行每个步骤的正向 action（内存模拟，标记为完成）
    pub async fn execute_saga(&self, saga_id: &str) -> Result<SagaStatus, String> {
        let snapshot = {
            let instances = self.instances.lock().map_err(|e| e.to_string())?;
            instances
                .iter()
                .find(|s| s.id == saga_id)
                .cloned()
                .ok_or_else(|| format!("Saga '{}' not found", saga_id))?
        };

        if snapshot.status == SagaStatus::Completed {
            return Ok(SagaStatus::Completed);
        }
        if snapshot.status == SagaStatus::Failed || snapshot.status == SagaStatus::Aborted {
            return Ok(snapshot.status);
        }

        let mut current = snapshot.clone();
        current.status = SagaStatus::Running;

        while current.current_step < current.steps.len() {
            let idx = current.current_step;
            current.steps[idx].status = SagaStepStatus::Running;
            current.steps[idx].started_at = Some(chrono::Utc::now());

            // 内存模拟：所有 LocalCall/PublishEvent 视为成功；
            // HTTP 类型的步骤若 payload 含 "force_fail": true 则视为失败。
            let force_fail = current.steps[idx]
                .action
                .payload
                .get("force_fail")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            if force_fail {
                current.steps[idx].status = SagaStepStatus::Failed;
                current.steps[idx].error = Some("forced failure".to_string());
                current.status = SagaStatus::Failed;
                current.error = Some(format!(
                    "Step '{}' failed (forced)",
                    current.steps[idx].name
                ));
                self.persist(current.clone());
                return Ok(SagaStatus::Failed);
            }

            current.steps[idx].status = SagaStepStatus::Completed;
            current.steps[idx].completed_at = Some(chrono::Utc::now());
            current.current_step += 1;
        }

        current.status = SagaStatus::Completed;
        current.completed_at = Some(chrono::Utc::now());
        current.result = Some(serde_json::json!({ "ok": true, "steps": current.steps.len() }));
        let final_status = current.status;
        self.persist(current);
        Ok(final_status)
    }

    /// 补偿 Saga：从最后一个已完成步骤倒序执行 compensation
    pub async fn compensate_saga(&self, saga_id: &str) -> Result<SagaStatus, String> {
        let snapshot = {
            let instances = self.instances.lock().map_err(|e| e.to_string())?;
            instances
                .iter()
                .find(|s| s.id == saga_id)
                .cloned()
                .ok_or_else(|| format!("Saga '{}' not found", saga_id))?
        };

        if snapshot.status == SagaStatus::Compensated {
            return Ok(SagaStatus::Compensated);
        }
        if snapshot.status == SagaStatus::Completed {
            // 已完成的 Saga 无需补偿
            return Ok(SagaStatus::Completed);
        }

        let mut current = snapshot.clone();
        current.status = SagaStatus::Compensating;

        // 从 current_step - 1 倒退到 0，对每个 Completed 步骤执行补偿
        let mut idx = current.current_step;
        while idx > 0 {
            idx -= 1;
            if current.steps[idx].status == SagaStepStatus::Completed {
                // 内存模拟：补偿直接标记为 Compensated
                current.steps[idx].status = SagaStepStatus::Compensated;
                current.steps[idx].completed_at = Some(chrono::Utc::now());
            }
        }

        current.status = SagaStatus::Compensated;
        current.completed_at = Some(chrono::Utc::now());
        let final_status = current.status;
        self.persist(current);
        Ok(final_status)
    }

    pub async fn get_saga(&self, saga_id: &str) -> Option<SagaInstance> {
        let instances = self.instances.lock().ok()?;
        instances.iter().find(|s| s.id == saga_id).cloned()
    }

    pub async fn list_sagas(&self, status: Option<SagaStatus>) -> Vec<SagaInstance> {
        let instances = match self.instances.lock() {
            Ok(g) => g,
            Err(_) => return Vec::new(),
        };
        match status {
            Some(s) => instances
                .iter()
                .filter(|i| i.status == s)
                .cloned()
                .collect(),
            None => instances.iter().cloned().collect(),
        }
    }

    pub fn get_stats(&self) -> SagaStats {
        let instances = match self.instances.lock() {
            Ok(g) => g,
            Err(_) => return SagaStats::default(),
        };
        let mut stats = SagaStats::default();
        stats.total = instances.len();
        for inst in instances.iter() {
            match inst.status {
                SagaStatus::Running => stats.running += 1,
                SagaStatus::Completed => stats.completed += 1,
                SagaStatus::Failed => stats.failed += 1,
                SagaStatus::Compensating => stats.compensating += 1,
                SagaStatus::Compensated => stats.compensated += 1,
                SagaStatus::Aborted => stats.aborted += 1,
            }
            *stats.by_type.entry(inst.saga_type.clone()).or_insert(0) += 1;
        }
        stats
    }

    pub fn definition_count(&self) -> usize {
        self.definitions.lock().map(|d| d.len()).unwrap_or(0)
    }

    fn persist(&self, instance: SagaInstance) {
        if let Ok(mut instances) = self.instances.lock() {
            if let Some(existing) = instances.iter_mut().find(|i| i.id == instance.id) {
                *existing = instance;
            }
        }
    }
}

impl Default for SagaCoordinator {
    fn default() -> Self {
        Self::new()
    }
}

/// 构造一个配置好默认定义的协调器
pub fn default_coordinator() -> SagaCoordinator {
    let coord = SagaCoordinator::new();
    coord.register_definition(Box::new(VoucherPostingSaga));
    coord.register_definition(Box::new(ReceivableSettlementSaga));
    coord.register_definition(Box::new(PayableSettlementSaga));
    coord.register_definition(Box::new(MonthEndClosingSaga));
    coord
}

// =============================================================================
// 具体 Saga 定义
// =============================================================================

/// 凭证过账 Saga: 验证 → 过账 → 更新总账 → 更新报表 → 通知
pub struct VoucherPostingSaga;

impl SagaDefinition for VoucherPostingSaga {
    fn saga_type(&self) -> &str {
        "VoucherPosting"
    }

    fn build_steps(&self, payload: &serde_json::Value) -> Vec<SagaStep> {
        let voucher_id = payload
            .get("voucher_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        vec![
            make_step(
                "validate",
                "验证凭证",
                SagaActionType::LocalCall,
                "finance",
                "/internal/vouchers/validate",
                payload.clone(),
                SagaActionType::LocalCall,
                "/internal/vouchers/validate/undo",
                serde_json::json!({ "voucher_id": voucher_id }),
            ),
            make_step(
                "post",
                "凭证过账",
                SagaActionType::HttpPost,
                "finance",
                "/api/v1/vouchers/post",
                payload.clone(),
                SagaActionType::HttpPost,
                "/api/v1/vouchers/unpost",
                serde_json::json!({ "voucher_id": voucher_id }),
            ),
            make_step(
                "ledger",
                "更新总账",
                SagaActionType::PublishEvent,
                "ledger",
                "event:VoucherPosted",
                serde_json::json!({ "voucher_id": voucher_id }),
                SagaActionType::PublishEvent,
                "event:VoucherPostedReversal",
                serde_json::json!({ "voucher_id": voucher_id }),
            ),
            make_step(
                "report",
                "更新报表",
                SagaActionType::LocalCall,
                "report",
                "/internal/reports/refresh",
                serde_json::json!({ "voucher_id": voucher_id }),
                SagaActionType::LocalCall,
                "/internal/reports/rollback",
                serde_json::json!({ "voucher_id": voucher_id }),
            ),
            make_step(
                "notify",
                "发送通知",
                SagaActionType::PublishEvent,
                "notification",
                "event:VoucherPostedNotification",
                serde_json::json!({ "voucher_id": voucher_id }),
                SagaActionType::LocalCall,
                "/internal/notify/skip",
                serde_json::json!({}),
            ),
        ]
    }
}

/// 应收结算 Saga: 验证 → 结算 → 更新账龄 → 生成收款记录 → 通知
pub struct ReceivableSettlementSaga;

impl SagaDefinition for ReceivableSettlementSaga {
    fn saga_type(&self) -> &str {
        "ReceivableSettlement"
    }

    fn build_steps(&self, payload: &serde_json::Value) -> Vec<SagaStep> {
        let receivable_id = payload
            .get("receivable_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        vec![
            make_step(
                "validate",
                "验证应收",
                SagaActionType::LocalCall,
                "finance",
                "/internal/receivables/validate",
                payload.clone(),
                SagaActionType::LocalCall,
                "/internal/receivables/validate/undo",
                serde_json::json!({ "receivable_id": receivable_id }),
            ),
            make_step(
                "settle",
                "应收结算",
                SagaActionType::HttpPost,
                "finance",
                "/api/v1/receivables/settle",
                payload.clone(),
                SagaActionType::HttpPost,
                "/api/v1/receivables/unsettle",
                serde_json::json!({ "receivable_id": receivable_id }),
            ),
            make_step(
                "aging",
                "更新账龄",
                SagaActionType::PublishEvent,
                "aging",
                "event:ReceivableSettled",
                serde_json::json!({ "receivable_id": receivable_id }),
                SagaActionType::PublishEvent,
                "event:ReceivableSettledReversal",
                serde_json::json!({ "receivable_id": receivable_id }),
            ),
            make_step(
                "collection",
                "生成收款记录",
                SagaActionType::HttpPost,
                "finance",
                "/api/v1/collections",
                payload.clone(),
                SagaActionType::HttpDelete,
                "/api/v1/collections",
                serde_json::json!({ "receivable_id": receivable_id }),
            ),
            make_step(
                "notify",
                "通知客户",
                SagaActionType::PublishEvent,
                "notification",
                "event:ReceivableSettledNotification",
                serde_json::json!({ "receivable_id": receivable_id }),
                SagaActionType::LocalCall,
                "/internal/notify/skip",
                serde_json::json!({}),
            ),
        ]
    }
}

/// 应付结算 Saga: 验证 → 结算 → 更新账龄 → 生成付款记录 → 通知
pub struct PayableSettlementSaga;

impl SagaDefinition for PayableSettlementSaga {
    fn saga_type(&self) -> &str {
        "PayableSettlement"
    }

    fn build_steps(&self, payload: &serde_json::Value) -> Vec<SagaStep> {
        let payable_id = payload
            .get("payable_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        vec![
            make_step(
                "validate",
                "验证应付",
                SagaActionType::LocalCall,
                "finance",
                "/internal/payables/validate",
                payload.clone(),
                SagaActionType::LocalCall,
                "/internal/payables/validate/undo",
                serde_json::json!({ "payable_id": payable_id }),
            ),
            make_step(
                "settle",
                "应付结算",
                SagaActionType::HttpPost,
                "finance",
                "/api/v1/payables/settle",
                payload.clone(),
                SagaActionType::HttpPost,
                "/api/v1/payables/unsettle",
                serde_json::json!({ "payable_id": payable_id }),
            ),
            make_step(
                "aging",
                "更新账龄",
                SagaActionType::PublishEvent,
                "aging",
                "event:PayableSettled",
                serde_json::json!({ "payable_id": payable_id }),
                SagaActionType::PublishEvent,
                "event:PayableSettledReversal",
                serde_json::json!({ "payable_id": payable_id }),
            ),
            make_step(
                "payment",
                "生成付款记录",
                SagaActionType::HttpPost,
                "finance",
                "/api/v1/payments",
                payload.clone(),
                SagaActionType::HttpDelete,
                "/api/v1/payments",
                serde_json::json!({ "payable_id": payable_id }),
            ),
            make_step(
                "notify",
                "通知供应商",
                SagaActionType::PublishEvent,
                "notification",
                "event:PayableSettledNotification",
                serde_json::json!({ "payable_id": payable_id }),
                SagaActionType::LocalCall,
                "/internal/notify/skip",
                serde_json::json!({}),
            ),
        ]
    }
}

/// 月末结账 Saga: 检查 → 汇总 → 结转 → 生成报表 → 归档
pub struct MonthEndClosingSaga;

impl SagaDefinition for MonthEndClosingSaga {
    fn saga_type(&self) -> &str {
        "MonthEndClosing"
    }

    fn build_steps(&self, payload: &serde_json::Value) -> Vec<SagaStep> {
        let period = payload
            .get("period")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        vec![
            make_step(
                "check",
                "期间检查",
                SagaActionType::LocalCall,
                "finance",
                "/internal/periods/check",
                payload.clone(),
                SagaActionType::LocalCall,
                "/internal/periods/check/undo",
                serde_json::json!({ "period": period }),
            ),
            make_step(
                "summarize",
                "汇总数据",
                SagaActionType::LocalCall,
                "finance",
                "/internal/periods/summarize",
                serde_json::json!({ "period": period }),
                SagaActionType::LocalCall,
                "/internal/periods/summarize/undo",
                serde_json::json!({ "period": period }),
            ),
            make_step(
                "carryforward",
                "损益结转",
                SagaActionType::HttpPost,
                "finance",
                "/api/v1/periods/carryforward",
                serde_json::json!({ "period": period }),
                SagaActionType::HttpPost,
                "/api/v1/periods/carryforward/reverse",
                serde_json::json!({ "period": period }),
            ),
            make_step(
                "report",
                "生成报表",
                SagaActionType::LocalCall,
                "report",
                "/internal/reports/generate",
                serde_json::json!({ "period": period }),
                SagaActionType::LocalCall,
                "/internal/reports/discard",
                serde_json::json!({ "period": period }),
            ),
            make_step(
                "archive",
                "归档",
                SagaActionType::HttpPost,
                "archive",
                "/api/v1/archive",
                serde_json::json!({ "period": period }),
                SagaActionType::HttpDelete,
                "/api/v1/archive",
                serde_json::json!({ "period": period }),
            ),
        ]
    }
}

/// 根据领域事件判断应触发的 Saga 类型（供管道使用）
pub fn saga_type_for_event(event: &FinanceDomainEvent) -> Option<&'static str> {
    match event_type_name(event) {
        "VoucherPosted" => Some("VoucherPosting"),
        "ReceivableSettled" => Some("ReceivableSettlement"),
        "PayableSettled" => Some("PayableSettlement"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    #[test]
    fn rt_saga_action_type_variants() {
        roundtrip(&SagaActionType::HttpPost);
        roundtrip(&SagaActionType::HttpPut);
        roundtrip(&SagaActionType::HttpDelete);
        roundtrip(&SagaActionType::PublishEvent);
        roundtrip(&SagaActionType::LocalCall);
    }

    #[test]
    fn rt_saga_step_status_variants() {
        roundtrip(&SagaStepStatus::Pending);
        roundtrip(&SagaStepStatus::Running);
        roundtrip(&SagaStepStatus::Completed);
        roundtrip(&SagaStepStatus::Failed);
        roundtrip(&SagaStepStatus::Compensated);
        roundtrip(&SagaStepStatus::Skipped);
    }

    #[test]
    fn rt_saga_status_variants() {
        roundtrip(&SagaStatus::Running);
        roundtrip(&SagaStatus::Completed);
        roundtrip(&SagaStatus::Failed);
        roundtrip(&SagaStatus::Compensating);
        roundtrip(&SagaStatus::Compensated);
        roundtrip(&SagaStatus::Aborted);
    }

    #[test]
    fn rt_saga_action_with_payload() {
        roundtrip(&SagaAction {
            action_type: SagaActionType::HttpPost,
            target_service: "finance".into(),
            endpoint: "/api/v1/vouchers/post".into(),
            payload: serde_json::json!({ "voucher_id": "v1", "force_fail": false }),
        });
    }

    #[test]
    fn rt_saga_step_all_none() {
        roundtrip(&SagaStep {
            id: uid(),
            name: "validate".into(),
            action: SagaAction {
                action_type: SagaActionType::LocalCall,
                target_service: "finance".into(),
                endpoint: "/internal/validate".into(),
                payload: serde_json::json!({}),
            },
            compensation: SagaAction {
                action_type: SagaActionType::LocalCall,
                target_service: "finance".into(),
                endpoint: "/internal/validate/undo".into(),
                payload: serde_json::json!({}),
            },
            status: SagaStepStatus::Pending,
            started_at: None,
            completed_at: None,
            error: None,
        });
    }

    #[test]
    fn rt_saga_step_all_some() {
        roundtrip(&SagaStep {
            id: uid(),
            name: "post".into(),
            action: SagaAction {
                action_type: SagaActionType::HttpPost,
                target_service: "ledger".into(),
                endpoint: "/api/ledger".into(),
                payload: serde_json::json!({ "amount": 100 }),
            },
            compensation: SagaAction {
                action_type: SagaActionType::HttpPost,
                target_service: "ledger".into(),
                endpoint: "/api/ledger/reverse".into(),
                payload: serde_json::json!({ "amount": 100 }),
            },
            status: SagaStepStatus::Failed,
            started_at: Some(now()),
            completed_at: Some(now()),
            error: Some("timeout".into()),
        });
    }

    #[test]
    fn rt_saga_instance_minimal() {
        roundtrip(&SagaInstance {
            id: uid(),
            saga_type: "VoucherPosting".into(),
            status: SagaStatus::Running,
            steps: vec![],
            current_step: 0,
            started_at: now(),
            completed_at: None,
            correlation_id: uid(),
            payload: serde_json::json!({ "voucher_id": "v1" }),
            result: None,
            error: None,
        });
    }

    #[test]
    fn rt_saga_instance_full() {
        let step_ok = SagaStep {
            id: uid(),
            name: "validate".into(),
            action: SagaAction {
                action_type: SagaActionType::LocalCall,
                target_service: "finance".into(),
                endpoint: "/internal/validate".into(),
                payload: serde_json::json!({}),
            },
            compensation: SagaAction {
                action_type: SagaActionType::LocalCall,
                target_service: "finance".into(),
                endpoint: "/internal/validate/undo".into(),
                payload: serde_json::json!({}),
            },
            status: SagaStepStatus::Completed,
            started_at: Some(now()),
            completed_at: Some(now()),
            error: None,
        };
        let step_bad = SagaStep {
            id: uid(),
            name: "post".into(),
            action: SagaAction {
                action_type: SagaActionType::HttpPost,
                target_service: "ledger".into(),
                endpoint: "/api/ledger".into(),
                payload: serde_json::json!({}),
            },
            compensation: SagaAction {
                action_type: SagaActionType::HttpPost,
                target_service: "ledger".into(),
                endpoint: "/api/ledger/reverse".into(),
                payload: serde_json::json!({}),
            },
            status: SagaStepStatus::Failed,
            started_at: Some(now()),
            completed_at: Some(now()),
            error: Some("downstream error".into()),
        };
        roundtrip(&SagaInstance {
            id: uid(),
            saga_type: "VoucherPosting".into(),
            status: SagaStatus::Failed,
            steps: vec![step_ok, step_bad],
            current_step: 1,
            started_at: now(),
            completed_at: Some(now()),
            correlation_id: uid(),
            payload: serde_json::json!({ "voucher_id": "v1" }),
            result: Some(serde_json::json!({ "ok": false })),
            error: Some("step failed".into()),
        });
    }

    #[test]
    fn rt_saga_stats_default() {
        roundtrip(&SagaStats::default());
    }

    #[test]
    fn rt_saga_stats_with_counts() {
        let mut by_type = HashMap::new();
        by_type.insert("VoucherPosting".to_string(), 3usize);
        by_type.insert("ReceivableSettlement".to_string(), 2usize);
        roundtrip(&SagaStats {
            total: 10,
            running: 1,
            completed: 6,
            failed: 1,
            compensating: 1,
            compensated: 1,
            aborted: 0,
            by_type,
        });
    }
}
