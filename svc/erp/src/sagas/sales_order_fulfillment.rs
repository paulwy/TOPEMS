//! 销售订单履约 Saga
//!
//! 编排销售订单从创建到应收凭证生成的完整流程，包含三个步骤：
//! 1. 创建销售订单（forward: 写入 orders 表，compensate: 删除订单）
//! 2. 预留库存（forward: 调用 WMS 预留库存，compensate: 释放预留）
//! 3. 创建应收凭证（forward: 调用 Finance 创建应收凭证，compensate: 冲销凭证）
//!
//! 本文件为样板实现，forward/compensate 仅记录日志，不做真实数据库操作。
//! V20.0 Saga 架构模板，保留供未来集成使用。

#![allow(dead_code)]

use tracing::info;
use uuid::Uuid;

use topems_shared::saga::{SagaInstance, SagaOrchestrator, SagaResult, SagaStepDefinition};

/// 销售订单履约 Saga
pub struct SalesOrderFulfillmentSaga;

impl SalesOrderFulfillmentSaga {
    /// Construct a new default instance. Prefer [`Default::default`] where semantically clear.
    pub fn new() -> Self {
        Self
    }

    /// 执行销售订单履约 Saga
    ///
    /// 传入订单 ID、客户 ID 与订单总金额，构造三个步骤的 SagaStepDefinition，
    /// 委托给 SagaOrchestrator 执行，返回 Saga 实例 ID。
    pub async fn execute(
        &self,
        orchestrator: &SagaOrchestrator,
        order_id: Uuid,
        customer_id: Uuid,
        total_amount: f64,
    ) -> SagaResult<Uuid> {
        let order_id_for_step1 = order_id;
        let order_id_for_step2 = order_id;
        let order_id_for_step3 = order_id;
        let customer_id_for_step1 = customer_id;
        let customer_id_for_step3 = customer_id;

        let steps = vec![
            // Step 1: 创建销售订单
            SagaStepDefinition {
                name: "create_sales_order".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step1,
                            customer_id = %customer_id_for_step1,
                            total_amount = total_amount,
                            "[create_sales_order] forward: 写入 orders 表，创建销售订单"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step1,
                            "[create_sales_order] compensate: 删除销售订单"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 2: 预留库存
            SagaStepDefinition {
                name: "reserve_inventory".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step2,
                            "[reserve_inventory] forward: 调用 WMS 预留库存"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step2,
                            "[reserve_inventory] compensate: 释放预留库存"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 3: 创建应收凭证
            SagaStepDefinition {
                name: "create_receivable_voucher".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step3,
                            customer_id = %customer_id_for_step3,
                            total_amount = total_amount,
                            "[create_receivable_voucher] forward: 调用 Finance 创建应收凭证"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            order_id = %order_id_for_step3,
                            "[create_receivable_voucher] compensate: 冲销应收凭证"
                        );
                        Ok(())
                    })
                })),
            },
        ];

        let payload = serde_json::json!({
            "order_id": order_id,
            "customer_id": customer_id,
            "total_amount": total_amount,
        });

        orchestrator
            .execute_saga("sales_order_fulfillment", payload, steps)
            .await
    }
}

impl Default for SalesOrderFulfillmentSaga {
    fn default() -> Self {
        Self::new()
    }
}
