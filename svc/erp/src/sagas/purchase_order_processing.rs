//! 采购订单处理 Saga
//!
//! 编排采购订单从创建到付款安排的完整流程，包含三个步骤：
//! 1. 创建采购订单（forward: 写入 purchase_orders 表，compensate: 标记订单为取消状态）
//! 2. 创建应付凭证（forward: 调用 Finance 创建应付凭证，compensate: 冲销凭证）
//! 3. 安排付款（forward: 创建付款计划，compensate: 取消付款计划）
//!
//! 本文件为样板实现，forward/compensate 仅记录日志，不做真实数据库操作。
//! V20.0 Saga 架构模板，保留供未来集成使用。

#![allow(dead_code)]

use tracing::info;
use uuid::Uuid;

use topems_shared_event::saga::{SagaInstance, SagaOrchestrator, SagaResult, SagaStepDefinition};

/// 采购订单处理 Saga
pub struct PurchaseOrderProcessingSaga;

impl PurchaseOrderProcessingSaga {
    pub fn new() -> Self {
        Self
    }

    /// 执行采购订单处理 Saga
    ///
    /// 传入订单 ID、供应商 ID 与订单总金额，构造三个步骤的 SagaStepDefinition，
    /// 委托给 SagaOrchestrator 执行，返回 Saga 实例 ID。
    pub async fn execute(
        &self,
        orchestrator: &SagaOrchestrator,
        order_id: Uuid,
        supplier_id: Uuid,
        total_amount: f64,
    ) -> SagaResult<Uuid> {
        let order_id_for_step1 = order_id;
        let order_id_for_step2 = order_id;
        let order_id_for_step3 = order_id;
        let supplier_id_for_step2 = supplier_id;

        let steps = vec![
            // Step 1: 创建采购订单
            SagaStepDefinition {
                name: "create_purchase_order".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step1,
                            supplier_id = %supplier_id,
                            total_amount = total_amount,
                            "[create_purchase_order] forward: 写入 purchase_orders 表，创建采购订单"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step1,
                            "[create_purchase_order] compensate: 标记订单为取消状态"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 2: 创建应付凭证
            SagaStepDefinition {
                name: "create_payable_voucher".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step2,
                            supplier_id = %supplier_id_for_step2,
                            total_amount = total_amount,
                            "[create_payable_voucher] forward: 调用 Finance 创建应付凭证"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step2,
                            "[create_payable_voucher] compensate: 冲销应付凭证"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 3: 安排付款
            SagaStepDefinition {
                name: "schedule_payment".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step3,
                            total_amount = total_amount,
                            "[schedule_payment] forward: 创建付款计划"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step3,
                            "[schedule_payment] compensate: 取消付款计划"
                        );
                        Ok(())
                    })
                })),
            },
        ];

        let payload = serde_json::json!({
            "order_id": order_id,
            "supplier_id": supplier_id,
            "total_amount": total_amount,
        });

        orchestrator
            .execute_saga("purchase_order_processing", payload, steps)
            .await
    }
}

impl Default for PurchaseOrderProcessingSaga {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_returns_instance() {
        let _saga = PurchaseOrderProcessingSaga::new();
    }

    #[test]
    fn test_default_returns_instance() {
        let _saga = PurchaseOrderProcessingSaga::default();
    }

    #[test]
    fn test_new_and_default_are_equivalent() {
        let _a = PurchaseOrderProcessingSaga::new();
        let _b = PurchaseOrderProcessingSaga::default();
    }
}
