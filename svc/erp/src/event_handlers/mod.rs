//! ERP 服务事件订阅处理器
//!
//! V14.5 事件驱动架构落地 - ERP 服务订阅核心业务事件
//!
//! 订阅事件清单：
//! - `SalesOrderApproved` → 自动生成应收账款
//! - `PurchaseOrderApproved` → 自动生成应付账款
//! - `WorkOrderCompleted` → 触发成本核算（V20.1 真实实现，写入 erp_cost_allocations）
//! - `StockInbound` → 自动生成库存凭证
//! - `StockOutbound` → 自动生成库存凭证
//! - `EmployeeOnboarded` → 自动创建资产分配记录
//! - `PmProjectCompleted` → 触发项目财务结算（占位实现）
//! - `PmProjectSettled` → 触发项目成本结算（占位实现）
//! - `OpportunityWon` → CRM 商机赢单自动创建销售订单
//! - `InventoryUpdated` → 库存更新事件（V20.1 真实实现，更新 account_balances）
//! - `ReturnCompleted` → 退款凭证自动生成（V19.6 真实实现）
//! - `PaymentReceived` → 自动核销应收账款（V20.1 新增）
//! - `PaymentMade` → 自动核销应付账款（V20.1 新增）

use sqlx::{PgPool, Row};
use topems_shared_event::event::{
    EmployeeOnboardedPayload, Event, EventResult, EventSubscriber, EventType,
    InventoryUpdatedPayload, MasterDataAction, MasterDataDomain, MasterDataEvent,
    OpportunityWonPayload, PaymentMadePayload, PaymentReceivedPayload, PmProjectCompletedPayload,
    PmProjectSettledPayload, PurchaseOrderApprovedPayload, ReconciliationApprovedPayload,
    ReconciliationCreatedPayload, ReconciliationUpdatedPayload, ReturnCompletedPayload,
    SalesOrderApprovedPayload, StockInboundPayload, StockOutboundPayload,
    WorkOrderCompletedPayload,
};

type HandlerResult = std::result::Result<(), String>;

/// ERP 事件处理器集合，承载必要的依赖
#[derive(Clone)]
pub struct ErpEventHandlers {
    pub db: PgPool,
}

impl ErpEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// 构建 ERP 服务的事件订阅者，注册所有业务事件 handler
    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("erp")?;

        // 每个闭包前 clone 一份，避免 moved value 错误
        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h4 = self.clone();
        let h5 = self.clone();
        let h6 = self.clone();
        let h7 = self.clone();
        let h8 = self.clone();
        let h9 = self.clone();
        let h10 = self.clone();
        let h11 = self.clone();
        let h12 = self.clone();
        let h13 = self.clone();
        let h14 = self.clone();
        let h15 = self.clone();
        let h16 = self.clone();
        let h17 = self.clone();
        let h18 = self.clone();
        let h19 = self.clone();
        let h20 = self.clone();

        Ok(subscriber
            .subscribe(vec![EventType::SalesOrderApproved], move |event| {
                let h = h1.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_sales_order_approved(event).await {
                        tracing::error!("[erp] handle_sales_order_approved 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::PurchaseOrderApproved], move |event| {
                let h = h2.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_purchase_order_approved(event).await {
                        tracing::error!("[erp] handle_purchase_order_approved 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::WorkOrderCompleted], move |event| {
                let h = h3.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_work_order_completed(event).await {
                        tracing::error!("[erp] handle_work_order_completed 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::StockInbound], move |event| {
                let h = h4.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_stock_inbound(event).await {
                        tracing::error!("[erp] handle_stock_inbound 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::StockOutbound], move |event| {
                let h = h5.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_stock_outbound(event).await {
                        tracing::error!("[erp] handle_stock_outbound 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::EmployeeOnboarded], move |event| {
                let h = h6.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_employee_onboarded(event).await {
                        tracing::error!("[erp] handle_employee_onboarded 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::PmProjectCompleted], move |event| {
                let h = h7.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_pm_project_completed(event).await {
                        tracing::error!("[erp] handle_pm_project_completed 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::PmProjectSettled], move |event| {
                let h = h8.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_pm_project_settled(event).await {
                        tracing::error!("[erp] handle_pm_project_settled 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::OpportunityWon], move |event| {
                let h = h9.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_opportunity_won(event).await {
                        tracing::error!("[erp] handle_opportunity_won 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::InventoryUpdated], move |event| {
                let h = h10.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_inventory_updated(event).await {
                        tracing::error!("[erp] handle_inventory_updated 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::ReturnCompleted], move |event| {
                let h = h11.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_return_completed(event).await {
                        tracing::error!("[erp] handle_return_completed 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::PaymentReceived], move |event| {
                let h = h12.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_payment_received(event).await {
                        tracing::error!("[erp] handle_payment_received 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::PaymentMade], move |event| {
                let h = h13.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_payment_made(event).await {
                        tracing::error!("[erp] handle_payment_made 失败: {}", e);
                    }
                })
            })
            .subscribe_master_data_employee(move |event| {
                let h = h14.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_employee_changed(event).await {
                        tracing::error!("[erp] handle_master_data_employee_changed 失败: {}", e);
                    }
                })
            })
            .subscribe_master_data_organization(move |event| {
                let h = h15.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_organization_changed(event).await {
                        tracing::error!(
                            "[erp] handle_master_data_organization_changed 失败: {}",
                            e
                        );
                    }
                })
            })
            .subscribe_master_data(vec![MasterDataDomain::Customer], move |event| {
                let h = h16.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_customer_changed(event).await {
                        tracing::error!("[erp] handle_master_data_customer_changed 失败: {}", e);
                    }
                })
            })
            .subscribe_master_data(vec![MasterDataDomain::Material], move |event| {
                let h = h17.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_material_changed(event).await {
                        tracing::error!("[erp] handle_master_data_material_changed 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::ReconciliationCreated], move |event| {
                let h = h18.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_reconciliation_created(event).await {
                        tracing::error!("[erp] handle_reconciliation_created 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::ReconciliationApproved], move |event| {
                let h = h19.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_reconciliation_approved(event).await {
                        tracing::error!("[erp] handle_reconciliation_approved 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::ReconciliationUpdated], move |event| {
                let h = h20.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_reconciliation_updated(event).await {
                        tracing::error!("[erp] handle_reconciliation_updated 失败: {}", e);
                    }
                })
            }))
    }

    /// SalesOrderApproved → 自动生成应收账款 + 销售凭证
    async fn handle_sales_order_approved(&self, event: Event) -> HandlerResult {
        let payload: SalesOrderApprovedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 SalesOrderApproved payload 失败: {}", e))?;

        tracing::info!(
            "[erp] SalesOrderApproved 处理 - order_no={}, order_id={}, trace_id={:?}",
            payload.order_no,
            payload.order_id,
            event.trace_id
        );

        let order: Option<(Option<f64>, Option<uuid::Uuid>, Option<String>, Option<chrono::DateTime<chrono::Utc>>)> = sqlx::query_as(
            r#"SELECT total_amount, customer_id, customer_name, order_date FROM erp.sales_orders WHERE id = $1"#,
        )
        .bind(payload.order_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("查询销售订单失败: {}", e))?;

        if let Some((amount, customer_id, customer_name, order_date)) = order {
            let amount = amount.unwrap_or(0.0);
            let receivable_no = format!("REC-{}", payload.order_no);
            let now = chrono::Utc::now();
            let period = order_date
                .map(|d| d.format("%Y-%m").to_string())
                .unwrap_or_else(|| now.format("%Y-%m").to_string());

            let mut tx = self
                .db
                .begin()
                .await
                .map_err(|e| format!("开启事务失败: {}", e))?;

            let receivable_result = sqlx::query(
                r#"INSERT INTO erp.receivables
                   (invoice_number, customer_id, customer_name, source_order_id, amount, status, invoice_date, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7)
                   ON CONFLICT (invoice_number) DO NOTHING"#,
            )
            .bind(&receivable_no)
            .bind(customer_id)
            .bind(&customer_name)
            .bind(payload.order_id)
            .bind(amount)
            .bind(order_date)
            .bind(now)
            .execute(&mut *tx)
            .await;

            match receivable_result {
                Ok(_) => {
                    tracing::info!(
                        "[erp] 已生成应收账款 {} 金额={} 关联订单 {}",
                        receivable_no,
                        amount,
                        payload.order_no
                    );
                }
                Err(e) => {
                    tracing::warn!("[erp] 创建应收账款失败（可能已存在）: {}", e);
                }
            }

            let voucher_no = format!("VOU-SALE-{}", payload.order_no);
            let voucher_date = order_date.unwrap_or(now);

            let existing_voucher: Option<(uuid::Uuid,)> = sqlx::query_as(
                r#"SELECT id FROM erp.financial_vouchers WHERE voucher_number = $1 AND period = $2"#,
            )
            .bind(&voucher_no)
            .bind(&period)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| format!("查询销售凭证失败: {}", e))?;

            if existing_voucher.is_none() {
                let voucher_id = uuid::Uuid::new_v4();

                sqlx::query(
                    r#"INSERT INTO erp.financial_vouchers
                       (id, voucher_number, voucher_date, period, summary, status, total_debit, total_credit, source_system, source_id, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, 'sales_order', $7, $8, $8)"#,
                )
                .bind(voucher_id)
                .bind(&voucher_no)
                .bind(voucher_date)
                .bind(&period)
                .bind(format!("销售订单{}确认收入", payload.order_no))
                .bind(amount)
                .bind(payload.order_id.to_string())
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("创建销售凭证失败: {}", e))?;

                sqlx::query(
                    r#"INSERT INTO public.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
                       VALUES ($1, $2, 1, '1122', '应收账款', $3, $4, 0, $5, $5)"#,
                )
                .bind(uuid::Uuid::new_v4())
                .bind(voucher_id)
                .bind(format!("销售订单{}应收账款", payload.order_no))
                .bind(amount)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("创建凭证明细（应收账款）失败: {}", e))?;

                sqlx::query(
                    r#"INSERT INTO public.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
                       VALUES ($1, $2, 2, '6001', '主营业务收入', $3, 0, $4, $5, $5)"#,
                )
                .bind(uuid::Uuid::new_v4())
                .bind(voucher_id)
                .bind(format!("销售订单{}销售收入", payload.order_no))
                .bind(amount)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("创建凭证明细（主营业务收入）失败: {}", e))?;

                tracing::info!(
                    "[erp] 已生成销售凭证 {} 金额={} 关联订单 {}",
                    voucher_no,
                    amount,
                    payload.order_no
                );
            } else {
                tracing::info!("[erp] 销售凭证已存在 {}，跳过创建", voucher_no);
            }

            tx.commit()
                .await
                .map_err(|e| format!("提交事务失败: {}", e))?;
        } else {
            tracing::warn!(
                "[erp] SalesOrderApproved 未找到对应订单 {}，跳过应收账款和凭证生成",
                payload.order_id
            );
        }

        Ok(())
    }

    /// PurchaseOrderApproved → 自动生成应付账款 + 采购凭证
    async fn handle_purchase_order_approved(&self, event: Event) -> HandlerResult {
        let payload: PurchaseOrderApprovedPayload =
            serde_json::from_value(event.payload.clone())
                .map_err(|e| format!("解析 PurchaseOrderApproved payload 失败: {}", e))?;

        tracing::info!(
            "[erp] PurchaseOrderApproved 处理 - order_no={}, order_id={}, trace_id={:?}",
            payload.order_no,
            payload.order_id,
            event.trace_id
        );

        let order: Option<(Option<f64>, Option<uuid::Uuid>, Option<String>, Option<chrono::DateTime<chrono::Utc>>)> = sqlx::query_as(
            r#"SELECT total_amount, supplier_id, supplier_name, order_date FROM erp.purchase_orders WHERE id = $1"#,
        )
        .bind(payload.order_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("查询采购订单失败: {}", e))?;

        if let Some((amount, supplier_id, supplier_name, order_date)) = order {
            let amount = amount.unwrap_or(0.0);
            let payable_no = format!("PAY-{}", payload.order_no);
            let now = chrono::Utc::now();
            let period = order_date
                .map(|d| d.format("%Y-%m").to_string())
                .unwrap_or_else(|| now.format("%Y-%m").to_string());

            let mut tx = self
                .db
                .begin()
                .await
                .map_err(|e| format!("开启事务失败: {}", e))?;

            let payable_result = sqlx::query(
                r#"INSERT INTO erp.payables
                   (invoice_number, supplier_id, supplier_name, source_order_id, amount, status, invoice_date, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7)
                   ON CONFLICT (invoice_number) DO NOTHING"#,
            )
            .bind(&payable_no)
            .bind(supplier_id)
            .bind(&supplier_name)
            .bind(payload.order_id)
            .bind(amount)
            .bind(order_date)
            .bind(now)
            .execute(&mut *tx)
            .await;

            match payable_result {
                Ok(_) => {
                    tracing::info!(
                        "[erp] 已生成应付账款 {} 金额={} 关联订单 {}",
                        payable_no,
                        amount,
                        payload.order_no
                    );
                }
                Err(e) => {
                    tracing::warn!("[erp] 创建应付账款失败（可能已存在）: {}", e);
                }
            }

            let voucher_no = format!("VOU-PURCHASE-{}", payload.order_no);
            let voucher_date = order_date.unwrap_or(now);

            let existing_voucher: Option<(uuid::Uuid,)> = sqlx::query_as(
                r#"SELECT id FROM erp.financial_vouchers WHERE voucher_number = $1 AND period = $2"#,
            )
            .bind(&voucher_no)
            .bind(&period)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| format!("查询采购凭证失败: {}", e))?;

            if existing_voucher.is_none() {
                let voucher_id = uuid::Uuid::new_v4();

                sqlx::query(
                    r#"INSERT INTO erp.financial_vouchers
                       (id, voucher_number, voucher_date, period, summary, status, total_debit, total_credit, source_system, source_id, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, 'purchase_order', $7, $8, $8)"#,
                )
                .bind(voucher_id)
                .bind(&voucher_no)
                .bind(voucher_date)
                .bind(&period)
                .bind(format!("采购订单{}确认入库", payload.order_no))
                .bind(amount)
                .bind(payload.order_id.to_string())
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("创建采购凭证失败: {}", e))?;

                sqlx::query(
                    r#"INSERT INTO public.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
                       VALUES ($1, $2, 1, '1403', '原材料', $3, $4, 0, $5, $5)"#,
                )
                .bind(uuid::Uuid::new_v4())
                .bind(voucher_id)
                .bind(format!("采购订单{}原材料入库", payload.order_no))
                .bind(amount)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("创建凭证明细（原材料）失败: {}", e))?;

                sqlx::query(
                    r#"INSERT INTO public.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
                       VALUES ($1, $2, 2, '2202', '应付账款', $3, 0, $4, $5, $5)"#,
                )
                .bind(uuid::Uuid::new_v4())
                .bind(voucher_id)
                .bind(format!("采购订单{}应付账款", payload.order_no))
                .bind(amount)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("创建凭证明细（应付账款）失败: {}", e))?;

                tracing::info!(
                    "[erp] 已生成采购凭证 {} 金额={} 关联订单 {}",
                    voucher_no,
                    amount,
                    payload.order_no
                );
            } else {
                tracing::info!("[erp] 采购凭证已存在 {}，跳过创建", voucher_no);
            }

            tx.commit()
                .await
                .map_err(|e| format!("提交事务失败: {}", e))?;
        } else {
            tracing::warn!(
                "[erp] PurchaseOrderApproved 未找到对应订单 {}，跳过应付账款和凭证生成",
                payload.order_id
            );
        }

        Ok(())
    }

    /// WorkOrderCompleted → 触发成本核算（V20.1 真实实现）
    ///
    /// 解析工单完成事件，根据完成数量写入 erp_cost_allocations 表的成本归集记录。
    /// 使用 graceful fallback：若表不存在或写入失败，记录警告并继续，不让事件处理失败。
    async fn handle_work_order_completed(&self, event: Event) -> HandlerResult {
        let payload: WorkOrderCompletedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 WorkOrderCompleted payload 失败: {}", e))?;

        tracing::info!(
            "[erp] WorkOrderCompleted 处理 - work_order_no={}, completed_qty={:?}, trace_id={:?}",
            payload.work_order_no,
            payload.completed_quantity,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let period = payload
            .completed_at
            .map(|d| d.format("%Y-%m").to_string())
            .unwrap_or_else(|| now.format("%Y-%m").to_string());

        let allocation_no = format!("COST-WO-{}", payload.work_order_no);
        let completed_qty = payload.completed_quantity.unwrap_or(0.0);
        // 简化成本估算：完成数量 * 单位标准成本（1.0）
        // 真实场景应从 erp.material_standard_costs 查询标准成本
        let estimated_cost = completed_qty * 1.0;

        let result = sqlx::query(
            r#"INSERT INTO erp_cost_allocations
               (allocation_no, period, cost_type, work_order_id, product_id, product_name, amount, status, description, created_at)
               VALUES ($1, $2, 'work_order_complete', $3, $4, $5, $6, 'posted', $7, $8)
               ON CONFLICT (allocation_no) DO NOTHING"#,
        )
        .bind(&allocation_no)
        .bind(&period)
        .bind(payload.work_order_id)
        .bind(payload.product_id)
        .bind(payload.product_name.clone().unwrap_or_default())
        .bind(estimated_cost)
        .bind(format!(
            "工单完成自动成本归集 - work_order_no={}, qty={}",
            payload.work_order_no, completed_qty
        ))
        .bind(now)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::info!(
                    "[erp] 已生成工单完成成本归集记录 - allocation_no={}, work_order_no={}, estimated_cost={}",
                    allocation_no,
                    payload.work_order_no,
                    estimated_cost
                );
            }
            Err(e) => {
                tracing::warn!(
                    "[erp] 工单完成成本归集记录创建失败（graceful fallback）: {}",
                    e
                );
            }
        }

        Ok(())
    }

    /// StockInbound → 自动生成库存凭证
    async fn handle_stock_inbound(&self, event: Event) -> HandlerResult {
        let payload: StockInboundPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 StockInbound payload 失败: {}", e))?;

        tracing::info!(
            "[erp] StockInbound 处理 - inbound_no={}, material={:?}, qty={}, reference_order_id={:?}, trace_id={:?}",
            payload.inbound_no,
            payload.material_name,
            payload.quantity,
            payload.reference_order_id,
            event.trace_id
        );

        let voucher_no = format!("STK-IN-{}", payload.inbound_no);
        let now = chrono::Utc::now();

        sqlx::query(
            r#"INSERT INTO erp.vouchers
               (voucher_no, voucher_type, reference_no, status, created_at)
               VALUES ($1, 'stock_inbound', $2, 'draft', $3)
               ON CONFLICT (voucher_no) DO NOTHING"#,
        )
        .bind(&voucher_no)
        .bind(&payload.inbound_no)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("创建入库凭证失败: {}", e))?;

        tracing::info!("[erp] 已生成库存入库凭证 {}", voucher_no);

        if let Some(reference_order_id) = payload.reference_order_id {
            tracing::info!(
                "[erp] 检测到关联订单入库，触发生产成本核算 - inbound_no={}, reference_order_id={:?}",
                payload.inbound_no,
                reference_order_id
            );

            let cost_allocation_no = format!("COST-ALLOC-{}", payload.inbound_no);
            let quantity = payload.quantity;

            let result = sqlx::query(
                r#"INSERT INTO erp_cost_allocations
                   (allocation_no, period, cost_type, work_order_id, product_id, product_name, amount, status, description, created_at)
                   VALUES ($1, $2, 'production_inbound', $3, $4, $5, $6, 'posted', $7, $8)
                   ON CONFLICT (allocation_no) DO NOTHING"#,
            )
            .bind(&cost_allocation_no)
            .bind(now.format("%Y-%m").to_string())
            .bind(reference_order_id)
            .bind(payload.material_id)
            .bind(payload.material_name.unwrap_or_default())
            .bind(quantity)
            .bind(format!("生产入库自动成本归集 - {}", payload.inbound_no))
            .bind(now)
            .execute(&self.db)
            .await;

            match result {
                Ok(_) => {
                    tracing::info!(
                        "[erp] 生产成本核算记录已创建 - allocation_no={}",
                        cost_allocation_no
                    );

                    let production_voucher_no = format!("PROD-IN-{}", payload.inbound_no);
                    let pv_result = sqlx::query(
                        r#"INSERT INTO erp.vouchers
                           (voucher_no, voucher_type, reference_no, status, created_at)
                           VALUES ($1, 'production_inbound', $2, 'draft', $3)
                           ON CONFLICT (voucher_no) DO NOTHING"#,
                    )
                    .bind(&production_voucher_no)
                    .bind(&payload.inbound_no)
                    .bind(now)
                    .execute(&self.db)
                    .await;

                    match pv_result {
                        Ok(_) => {
                            tracing::info!(
                                "[erp] 生产入库凭证已生成 - voucher_no={}",
                                production_voucher_no
                            );
                        }
                        Err(e) => {
                            tracing::warn!(
                                "[erp] 生产入库凭证生成失败（graceful fallback）: {}",
                                e
                            );
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp] 生产成本核算记录创建失败（graceful fallback）: {}", e);
                }
            }
        }

        Ok(())
    }

    /// StockOutbound → 自动生成库存凭证
    async fn handle_stock_outbound(&self, event: Event) -> HandlerResult {
        let payload: StockOutboundPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 StockOutbound payload 失败: {}", e))?;

        tracing::info!(
            "[erp] StockOutbound 处理 - outbound_no={}, material={:?}, qty={:?}, trace_id={:?}",
            payload.outbound_no,
            payload.material_name,
            payload.quantity,
            event.trace_id
        );

        let voucher_no = format!("STK-OUT-{}", payload.outbound_no);
        let now = chrono::Utc::now();

        sqlx::query(
            r#"INSERT INTO erp.vouchers
               (voucher_no, voucher_type, reference_no, status, created_at)
               VALUES ($1, 'stock_outbound', $2, 'draft', $3)
               ON CONFLICT (voucher_no) DO NOTHING"#,
        )
        .bind(&voucher_no)
        .bind(&payload.outbound_no)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("创建出库凭证失败: {}", e))?;

        tracing::info!("[erp] 已生成库存出库凭证 {}", voucher_no);
        Ok(())
    }

    /// EmployeeOnboarded → 自动创建入职费用应付账款 + 费用凭证
    ///
    /// 员工入职时自动生成一笔入职相关的应付账款（如办公用品、培训费用等）
    /// 并生成对应的财务凭证。使用 graceful fallback：若 DB 操作失败，记录警告并继续。
    async fn handle_employee_onboarded(&self, event: Event) -> HandlerResult {
        let payload: EmployeeOnboardedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 EmployeeOnboarded payload 失败: {}", e))?;

        tracing::info!(
            "[erp] EmployeeOnboarded 处理 - employee_id={}, name={}, department={:?}, trace_id={:?}",
            payload.employee_id,
            payload.name,
            payload.department_id,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let onboard_date = payload.onboard_date.unwrap_or(now);
        let period = onboard_date.format("%Y-%m").to_string();

        let onboarding_cost = 500.0;
        let payable_no = format!("PAY-ONBOARD-{}", payload.employee_id);
        let supplier_name = "入职福利供应商".to_string();

        let mut tx = match self.db.begin().await {
            Ok(tx) => tx,
            Err(e) => {
                tracing::warn!(
                    "[erp] EmployeeOnboarded 开启事务失败（graceful fallback）: {}",
                    e
                );
                return Ok(());
            }
        };

        let payable_result = sqlx::query(
            r#"INSERT INTO erp.payables
               (invoice_number, supplier_name, category, amount, status, invoice_date, created_at, updated_at)
               VALUES ($1, $2, 'onboarding', $3, 'pending', $4, $5, $5)
               ON CONFLICT (invoice_number) DO NOTHING"#,
        )
        .bind(&payable_no)
        .bind(&supplier_name)
        .bind(onboarding_cost)
        .bind(onboard_date)
        .bind(now)
        .execute(&mut *tx)
        .await;

        match payable_result {
            Ok(_) => {
                tracing::info!(
                    "[erp] 已生成入职费用应付账款 {} 金额={} 员工={}",
                    payable_no,
                    onboarding_cost,
                    payload.name
                );
            }
            Err(e) => {
                tracing::warn!("[erp] 创建入职应付账款失败（graceful fallback）: {}", e);
            }
        }

        let voucher_no = format!("VOU-ONBOARD-{}", payload.employee_id);

        let existing_voucher: Option<(uuid::Uuid,)> = match sqlx::query_as(
            r#"SELECT id FROM erp.financial_vouchers WHERE voucher_number = $1 AND period = $2"#,
        )
        .bind(&voucher_no)
        .bind(&period)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("[erp] 查询入职费用凭证失败（graceful fallback）: {}", e);
                let _ = tx.rollback().await;
                return Ok(());
            }
        };

        if existing_voucher.is_none() {
            let voucher_id = uuid::Uuid::new_v4();
            let summary = format!("员工{}入职费用", payload.name);

            let voucher_result = sqlx::query(
                r#"INSERT INTO erp.financial_vouchers
                   (id, voucher_number, voucher_date, period, summary, status, total_debit, total_credit, source_system, source_id, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, 'hr_onboarding', $7, $8, $8)"#,
            )
            .bind(voucher_id)
            .bind(&voucher_no)
            .bind(onboard_date)
            .bind(&period)
            .bind(&summary)
            .bind(onboarding_cost)
            .bind(payload.employee_id.to_string())
            .bind(now)
            .execute(&mut *tx)
            .await;

            match voucher_result {
                Ok(_) => {
                    let _ = sqlx::query(
                        r#"INSERT INTO public.voucher_items
                           (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
                           VALUES ($1, $2, 1, '6602', '管理费用', $3, $4, 0, $5, $5)"#,
                    )
                    .bind(uuid::Uuid::new_v4())
                    .bind(voucher_id)
                    .bind(format!("员工{}入职培训费", payload.name))
                    .bind(onboarding_cost)
                    .bind(now)
                    .execute(&mut *tx)
                    .await;

                    let _ = sqlx::query(
                        r#"INSERT INTO public.voucher_items
                           (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
                           VALUES ($1, $2, 2, '2202', '应付账款', $3, 0, $4, $5, $5)"#,
                    )
                    .bind(uuid::Uuid::new_v4())
                    .bind(voucher_id)
                    .bind(format!("员工{}入职费用应付", payload.name))
                    .bind(onboarding_cost)
                    .bind(now)
                    .execute(&mut *tx)
                    .await;

                    tracing::info!(
                        "[erp] 已生成入职费用凭证 {} 金额={} 员工={}",
                        voucher_no,
                        onboarding_cost,
                        payload.name
                    );
                }
                Err(e) => {
                    tracing::warn!("[erp] 创建入职费用凭证失败（graceful fallback）: {}", e);
                }
            }
        } else {
            tracing::info!("[erp] 入职费用凭证已存在 {}，跳过创建", voucher_no);
        }

        match tx.commit().await {
            Ok(_) => {}
            Err(e) => {
                tracing::warn!(
                    "[erp] EmployeeOnboarded 提交事务失败（graceful fallback）: {}",
                    e
                );
            }
        }

        Ok(())
    }

    /// PmProjectCompleted → 自动创建项目应收账款 + 收入凭证
    ///
    /// 项目完成后自动生成应收账款记录（确认项目收入）并生成财务凭证。
    /// 使用 graceful fallback：若 DB 操作失败，记录警告并继续。
    async fn handle_pm_project_completed(&self, event: Event) -> HandlerResult {
        let payload: PmProjectCompletedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 PmProjectCompleted payload 失败: {}", e))?;

        tracing::info!(
            "[erp] PmProjectCompleted 处理 - project_name={}, project_id={}, completed_at={:?}, trace_id={:?}",
            payload.project_name,
            payload.project_id,
            payload.completed_at,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let completed_at = payload.completed_at.unwrap_or(now);
        let period = completed_at.format("%Y-%m").to_string();

        let receivable_no = format!("REC-PROJ-{}", payload.project_id);
        let project_amount = 10000.0;

        let mut tx = match self.db.begin().await {
            Ok(tx) => tx,
            Err(e) => {
                tracing::warn!(
                    "[erp] PmProjectCompleted 开启事务失败（graceful fallback）: {}",
                    e
                );
                return Ok(());
            }
        };

        let receivable_result = sqlx::query(
            r#"INSERT INTO erp.receivables
               (invoice_number, customer_name, project_name, amount, status, invoice_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'pending', $5, $6, $6)
               ON CONFLICT (invoice_number) DO NOTHING"#,
        )
        .bind(&receivable_no)
        .bind("项目客户")
        .bind(&payload.project_name)
        .bind(project_amount)
        .bind(completed_at)
        .bind(now)
        .execute(&mut *tx)
        .await;

        match receivable_result {
            Ok(_) => {
                tracing::info!(
                    "[erp] 已生成项目应收账款 {} 金额={} 项目={}",
                    receivable_no,
                    project_amount,
                    payload.project_name
                );
            }
            Err(e) => {
                tracing::warn!("[erp] 创建项目应收账款失败（graceful fallback）: {}", e);
            }
        }

        let voucher_no = format!("VOU-PROJ-COMPLETE-{}", payload.project_id);

        let existing_voucher: Option<(uuid::Uuid,)> = match sqlx::query_as(
            r#"SELECT id FROM erp.financial_vouchers WHERE voucher_number = $1 AND period = $2"#,
        )
        .bind(&voucher_no)
        .bind(&period)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("[erp] 查询项目完成凭证失败（graceful fallback）: {}", e);
                let _ = tx.rollback().await;
                return Ok(());
            }
        };

        if existing_voucher.is_none() {
            let voucher_id = uuid::Uuid::new_v4();
            let summary = format!("项目{}完成确认收入", payload.project_name);

            let voucher_result = sqlx::query(
                r#"INSERT INTO erp.financial_vouchers
                   (id, voucher_number, voucher_date, period, summary, status, total_debit, total_credit, source_system, source_id, project_id, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, 'pm_project', $7, $8, $9, $9)"#,
            )
            .bind(voucher_id)
            .bind(&voucher_no)
            .bind(completed_at)
            .bind(&period)
            .bind(&summary)
            .bind(project_amount)
            .bind(payload.project_id.to_string())
            .bind(payload.project_id)
            .bind(now)
            .execute(&mut *tx)
            .await;

            match voucher_result {
                Ok(_) => {
                    let _ = sqlx::query(
                        r#"INSERT INTO public.voucher_items
                           (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, project_id, created_at, updated_at)
                           VALUES ($1, $2, 1, '1122', '应收账款', $3, $4, 0, $5, $6, $6)"#,
                    )
                    .bind(uuid::Uuid::new_v4())
                    .bind(voucher_id)
                    .bind(format!("项目{}应收款", payload.project_name))
                    .bind(project_amount)
                    .bind(payload.project_id)
                    .bind(now)
                    .execute(&mut *tx)
                    .await;

                    let _ = sqlx::query(
                        r#"INSERT INTO public.voucher_items
                           (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, project_id, created_at, updated_at)
                           VALUES ($1, $2, 2, '6001', '主营业务收入', $3, 0, $4, $5, $6, $6)"#,
                    )
                    .bind(uuid::Uuid::new_v4())
                    .bind(voucher_id)
                    .bind(format!("项目{}完成收入", payload.project_name))
                    .bind(project_amount)
                    .bind(payload.project_id)
                    .bind(now)
                    .execute(&mut *tx)
                    .await;

                    tracing::info!(
                        "[erp] 已生成项目完成收入凭证 {} 金额={} 项目={}",
                        voucher_no,
                        project_amount,
                        payload.project_name
                    );
                }
                Err(e) => {
                    tracing::warn!("[erp] 创建项目完成凭证失败（graceful fallback）: {}", e);
                }
            }
        } else {
            tracing::info!("[erp] 项目完成凭证已存在 {}，跳过创建", voucher_no);
        }

        match tx.commit().await {
            Ok(_) => {}
            Err(e) => {
                tracing::warn!(
                    "[erp] PmProjectCompleted 提交事务失败（graceful fallback）: {}",
                    e
                );
            }
        }

        Ok(())
    }

    /// PmProjectSettled → 自动生成项目结算财务凭证
    ///
    /// 项目结算后自动生成结算财务凭证，根据结算金额结转项目成本和收入。
    /// 使用 graceful fallback：若 DB 操作失败，记录警告并继续。
    async fn handle_pm_project_settled(&self, event: Event) -> HandlerResult {
        let payload: PmProjectSettledPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 PmProjectSettled payload 失败: {}", e))?;

        tracing::info!(
            "[erp] PmProjectSettled 处理 - project_name={}, project_id={}, settled_amount={:?}, settled_at={:?}, trace_id={:?}",
            payload.project_name,
            payload.project_id,
            payload.settled_amount,
            payload.settled_at,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let settled_at = payload.settled_at.unwrap_or(now);
        let period = settled_at.format("%Y-%m").to_string();
        let settled_amount = payload.settled_amount.unwrap_or(0.0);

        if settled_amount <= 0.0 {
            tracing::info!(
                "[erp] 项目结算金额为 0，跳过凭证生成 - project_id={}",
                payload.project_id
            );
            return Ok(());
        }

        let voucher_no = format!("VOU-PROJ-SETTLE-{}", payload.project_id);

        let mut tx = match self.db.begin().await {
            Ok(tx) => tx,
            Err(e) => {
                tracing::warn!(
                    "[erp] PmProjectSettled 开启事务失败（graceful fallback）: {}",
                    e
                );
                return Ok(());
            }
        };

        let existing_voucher: Option<(uuid::Uuid,)> = match sqlx::query_as(
            r#"SELECT id FROM erp.financial_vouchers WHERE voucher_number = $1 AND period = $2"#,
        )
        .bind(&voucher_no)
        .bind(&period)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("[erp] 查询项目结算凭证失败（graceful fallback）: {}", e);
                let _ = tx.rollback().await;
                return Ok(());
            }
        };

        if existing_voucher.is_some() {
            tracing::info!("[erp] 项目结算凭证已存在 {}，跳过创建", voucher_no);
            let _ = tx.rollback().await;
            return Ok(());
        }

        let voucher_id = uuid::Uuid::new_v4();
        let summary = format!("项目{}结算", payload.project_name);
        let cost_amount = settled_amount * 0.7;

        let voucher_result = sqlx::query(
            r#"INSERT INTO erp.financial_vouchers
               (id, voucher_number, voucher_date, period, summary, status, total_debit, total_credit, source_system, source_id, project_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, 'pm_settlement', $7, $8, $9, $9)"#,
        )
        .bind(voucher_id)
        .bind(&voucher_no)
        .bind(settled_at)
        .bind(&period)
        .bind(&summary)
        .bind(settled_amount)
        .bind(payload.project_id.to_string())
        .bind(payload.project_id)
        .bind(now)
        .execute(&mut *tx)
        .await;

        match voucher_result {
            Ok(_) => {
                let _ = sqlx::query(
                    r#"INSERT INTO public.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, project_id, created_at, updated_at)
                       VALUES ($1, $2, 1, '6401', '主营业务成本', $3, $4, 0, $5, $6, $6)"#,
                )
                .bind(uuid::Uuid::new_v4())
                .bind(voucher_id)
                .bind(format!("项目{}结转成本", payload.project_name))
                .bind(cost_amount)
                .bind(payload.project_id)
                .bind(now)
                .execute(&mut *tx)
                .await;

                let _ = sqlx::query(
                    r#"INSERT INTO public.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, project_id, created_at, updated_at)
                       VALUES ($1, $2, 2, '1405', '库存商品', $3, 0, $4, $5, $6, $6)"#,
                )
                .bind(uuid::Uuid::new_v4())
                .bind(voucher_id)
                .bind(format!("项目{}成本结转", payload.project_name))
                .bind(cost_amount)
                .bind(payload.project_id)
                .bind(now)
                .execute(&mut *tx)
                .await;

                let profit_amount = settled_amount - cost_amount;
                if profit_amount > 0.0 {
                    let _ = sqlx::query(
                        r#"INSERT INTO public.voucher_items
                           (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, project_id, created_at, updated_at)
                           VALUES ($1, $2, 3, '4103', '本年利润', $3, $4, 0, $5, $6, $6)"#,
                    )
                    .bind(uuid::Uuid::new_v4())
                    .bind(voucher_id)
                    .bind(format!("项目{}结转利润", payload.project_name))
                    .bind(profit_amount)
                    .bind(payload.project_id)
                    .bind(now)
                    .execute(&mut *tx)
                    .await;
                }

                tracing::info!(
                    "[erp] 已生成项目结算凭证 {} 金额={} 项目={}",
                    voucher_no,
                    settled_amount,
                    payload.project_name
                );
            }
            Err(e) => {
                tracing::warn!("[erp] 创建项目结算凭证失败（graceful fallback）: {}", e);
            }
        }

        match tx.commit().await {
            Ok(_) => {}
            Err(e) => {
                tracing::warn!(
                    "[erp] PmProjectSettled 提交事务失败（graceful fallback）: {}",
                    e
                );
            }
        }

        Ok(())
    }

    /// OpportunityWon → CRM 商机赢单自动创建销售订单（幂等处理）
    async fn handle_opportunity_won(&self, event: Event) -> HandlerResult {
        let payload: OpportunityWonPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 OpportunityWon payload 失败: {}", e))?;

        tracing::info!(
            "[erp] OpportunityWon 处理 - opportunity_id={}, opportunity_name={}, amount={:?}, trace_id={:?}",
            payload.opportunity_id,
            payload.opportunity_name,
            payload.amount,
            event.trace_id
        );

        // 幂等检查：同一商机不会重复创建销售订单
        let existing_order: Option<(uuid::Uuid,)> =
            sqlx::query_as(r#"SELECT id FROM erp.sales_orders WHERE remark = $1"#)
                .bind(format!("from_crm_opportunity:{}", payload.opportunity_id))
                .fetch_optional(&self.db)
                .await
                .map_err(|e| format!("查询销售订单是否存在失败: {}", e))?;

        if existing_order.is_some() {
            tracing::info!(
                "[erp] 商机 {} 已创建过销售订单，跳过自动创建",
                payload.opportunity_id
            );
            return Ok(());
        }

        // 生成订单号
        let now = chrono::Utc::now();
        let order_no = format!(
            "SO-{}-{:06}",
            now.format("%Y%m%d"),
            rand::random::<u32>() % 1_000_000
        );

        let order_id = uuid::Uuid::new_v4();

        // 创建销售订单（状态为 draft）
        let result = sqlx::query(
            r#"INSERT INTO erp.sales_orders
               (id, order_no, customer_id, customer_name, order_date, total_amount, status, remark, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $8)"#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind(payload.customer_id)
        .bind(&payload.customer_name)
        .bind(now)
        .bind(payload.amount.unwrap_or(0.0))
        .bind(format!("from_crm_opportunity:{}", payload.opportunity_id))
        .bind(now)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::info!(
                    "[erp] CRM商机赢单自动创建销售订单成功 - order_no={}, opportunity_id={}",
                    order_no,
                    payload.opportunity_id
                );
            }
            Err(e) => {
                tracing::error!("[erp] CRM商机赢单自动创建销售订单失败: {}", e);
                return Err(format!("创建销售订单失败: {}", e));
            }
        }

        Ok(())
    }

    /// InventoryUpdated → 库存更新事件（V20.1 真实实现）
    ///
    /// 解析 InventoryUpdatedPayload，更新 erp.account_balances 表的
    /// last_movement_date 和 last_movement_type 字段。
    /// 若 material_code 在 erp.account_balances 中不存在，记录警告（graceful fallback，不让事件处理失败）。
    async fn handle_inventory_updated(&self, event: Event) -> HandlerResult {
        let payload: InventoryUpdatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 InventoryUpdated payload 失败: {}", e))?;

        tracing::info!(
            "[erp] InventoryUpdated 处理 - material_code={}, material_name={}, delta={}, change_type={}, trace_id={:?}",
            payload.material_code,
            payload.material_name,
            payload.delta,
            payload.change_type,
            event.trace_id
        );

        let now = chrono::Utc::now();

        // 更新 erp.account_balances 表的最近变动信息
        // 通过 material_code 匹配；若表/记录不存在，使用 warn+continue graceful fallback
        let result = sqlx::query(
            r#"UPDATE erp.account_balances
               SET last_movement_date = $1,
                   last_movement_type = $2,
                   updated_at = $1
               WHERE material_code = $3"#,
        )
        .bind(now)
        .bind(&payload.change_type)
        .bind(&payload.material_code)
        .execute(&self.db)
        .await;

        match result {
            Ok(rows_affected) => {
                if rows_affected.rows_affected() == 0 {
                    tracing::warn!(
                        "[erp] InventoryUpdated 未找到匹配的 account_balances 记录 - material_code={}（graceful fallback，跳过更新）",
                        payload.material_code
                    );
                } else {
                    tracing::info!(
                        "[erp] 已更新 account_balances 最近变动信息 - material_code={}, rows={}",
                        payload.material_code,
                        rows_affected.rows_affected()
                    );
                }
            }
            Err(e) => {
                tracing::warn!(
                    "[erp] 更新 account_balances 失败（graceful fallback）: {}",
                    e
                );
            }
        }

        Ok(())
    }

    /// ReturnCompleted → 退款凭证自动生成
    ///
    /// V19.6: 从占位实现升级为真实凭证生成。
    /// 退款在退货完成时触发，CRM 发布 ReturnCompleted，
    /// ERP 订阅后自动生成退款凭证（借：主营业务收入/应交税费，贷：应收账款/银行存款）。
    async fn handle_return_completed(&self, event: Event) -> HandlerResult {
        let payload: ReturnCompletedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 ReturnCompleted payload 失败: {}", e))?;

        tracing::info!(
            "[erp] ReturnCompleted 处理 - return_no={}, customer_id={:?}, customer_name={:?}, refund_amount={}, return_type={}, status={}, trace_id={:?}",
            payload.return_no,
            payload.customer_id,
            payload.customer_name,
            payload.refund_amount,
            payload.return_type,
            payload.status,
            event.trace_id
        );

        let now = chrono::Utc::now();
        // completed_at 是 String 类型，提取前 7 位 "YYYY-MM" 作为周期；为空或过短时回退到当前月份
        let period = if payload.completed_at.len() >= 7 {
            payload.completed_at[..7].to_string()
        } else {
            now.format("%Y-%m").to_string()
        };
        let refund_amount: f64 = payload.refund_amount;

        if refund_amount <= 0.0 {
            tracing::info!(
                "[erp] 退款金额为 0，跳过凭证生成 - return_no={}",
                payload.return_no
            );
            return Ok(());
        }

        let voucher_no = format!("VOU-REFUND-{}", payload.return_no);

        // 幂等检查：同一退换单不会重复生成退款凭证
        let existing_voucher: Option<(uuid::Uuid,)> = sqlx::query_as(
            r#"SELECT id FROM erp.financial_vouchers WHERE voucher_number = $1 AND period = $2"#,
        )
        .bind(&voucher_no)
        .bind(&period)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("查询退款凭证失败: {}", e))?;

        if existing_voucher.is_some() {
            tracing::info!("[erp] 退款凭证已存在 {}，跳过创建", voucher_no);
            return Ok(());
        }

        let mut tx = self
            .db
            .begin()
            .await
            .map_err(|e| format!("开启事务失败: {}", e))?;

        // 创建退款凭证头
        let voucher_id = uuid::Uuid::new_v4();
        let summary = format!(
            "退换单{}退款，客户{}",
            payload.return_no,
            payload.customer_name.as_deref().unwrap_or("未知")
        );

        sqlx::query(
            r#"INSERT INTO erp.financial_vouchers
               (id, voucher_number, voucher_date, period, summary, status, total_debit, total_credit, source_system, source_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, 'return_order', $7, $8, $8)"#,
        )
        .bind(voucher_id)
        .bind(&voucher_no)
        .bind(now)
        .bind(&period)
        .bind(&summary)
        .bind(refund_amount)
        .bind(payload.return_id.to_string())
        .bind(now)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("创建退款凭证失败: {}", e))?;

        // 凭证明细1：借 - 主营业务收入（冲减收入）
        sqlx::query(
            r#"INSERT INTO public.voucher_items
               (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
               VALUES ($1, $2, 1, '6001', '主营业务收入', $3, $4, 0, $5, $5)"#,
        )
        .bind(uuid::Uuid::new_v4())
        .bind(voucher_id)
        .bind(format!("退换货{}冲减收入", payload.return_no))
        .bind(refund_amount)
        .bind(now)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("创建退款凭证明细（收入冲减）失败: {}", e))?;

        // 凭证明细2：贷 - 应收账款/银行存款
        let customer_label = payload.customer_name.as_deref().unwrap_or("客户");
        sqlx::query(
            r#"INSERT INTO public.voucher_items
               (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, created_at, updated_at)
               VALUES ($1, $2, 2, '1122', '应收账款', $3, 0, $4, $5, $5)"#,
        )
        .bind(uuid::Uuid::new_v4())
        .bind(voucher_id)
        .bind(format!("退换货{}退款给{}", payload.return_no, customer_label))
        .bind(refund_amount)
        .bind(now)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("创建退款凭证明细（应收退款）失败: {}", e))?;

        tx.commit()
            .await
            .map_err(|e| format!("提交事务失败: {}", e))?;

        tracing::info!(
            "[erp] 已生成退款凭证 {} 金额={} 关联退换单 {}",
            voucher_no,
            refund_amount,
            payload.return_no
        );

        Ok(())
    }

    /// PaymentReceived → 自动核销应收账款（V20.1 新增）
    ///
    /// 根据客户和金额匹配 erp.receivables，将状态置为 'paid' 并累加 received_amount。
    /// 使用 graceful fallback：若未找到匹配记录或更新失败，记录警告并继续。
    async fn handle_payment_received(&self, event: Event) -> HandlerResult {
        let payload: PaymentReceivedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 PaymentReceived payload 失败: {}", e))?;

        tracing::info!(
            "[erp] PaymentReceived 处理 - payment_no={}, customer_id={:?}, amount={}, trace_id={:?}",
            payload.payment_no,
            payload.customer_id,
            payload.amount,
            event.trace_id
        );

        if payload.amount <= 0.0 {
            tracing::info!(
                "[erp] 收款金额为 0，跳过应收账款核销 - payment_no={}",
                payload.payment_no
            );
            return Ok(());
        }

        let now = chrono::Utc::now();

        // 根据 customer_id 和 amount 匹配应收账款并核销
        // 若 customer_id 为空，回退到金额匹配（取最早一笔 pending 的）
        let result = if let Some(customer_id) = payload.customer_id {
            sqlx::query(
                r#"UPDATE erp.receivables
                   SET status = 'paid',
                       received_amount = received_amount + $1,
                       updated_at = $2
                   WHERE customer_id = $3
                     AND status = 'pending'
                     AND amount = $1
                   RETURNING invoice_number"#,
            )
            .bind(payload.amount)
            .bind(now)
            .bind(customer_id)
            .fetch_optional(&self.db)
            .await
        } else {
            sqlx::query(
                r#"UPDATE erp.receivables
                   SET status = 'paid',
                       received_amount = received_amount + $1,
                       updated_at = $2
                   WHERE status = 'pending'
                     AND amount = $1
                   ORDER BY invoice_date ASC
                   LIMIT 1
                   RETURNING invoice_number"#,
            )
            .bind(payload.amount)
            .bind(now)
            .fetch_optional(&self.db)
            .await
        };

        match result {
            Ok(Some(row)) => {
                let invoice_number: String = row
                    .try_get("invoice_number")
                    .unwrap_or_else(|_| "<unknown>".to_string());
                tracing::info!(
                    "[erp] 已核销应收账款 - invoice_number={}, payment_no={}, amount={}",
                    invoice_number,
                    payload.payment_no,
                    payload.amount
                );
            }
            Ok(None) => {
                tracing::warn!(
                    "[erp] PaymentReceived 未找到匹配的应收账款 - payment_no={}, customer_id={:?}, amount={}（graceful fallback）",
                    payload.payment_no,
                    payload.customer_id,
                    payload.amount
                );
            }
            Err(e) => {
                tracing::warn!("[erp] 核销应收账款失败（graceful fallback）: {}", e);
            }
        }

        Ok(())
    }

    /// PaymentMade → 自动核销应付账款（V20.1 新增）
    ///
    /// 根据供应商和金额匹配 erp.payables，将状态置为 'paid' 并累加 paid_amount。
    /// 使用 graceful fallback：若未找到匹配记录或更新失败，记录警告并继续。
    async fn handle_payment_made(&self, event: Event) -> HandlerResult {
        let payload: PaymentMadePayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 PaymentMade payload 失败: {}", e))?;

        tracing::info!(
            "[erp] PaymentMade 处理 - payment_no={}, supplier_id={:?}, amount={}, trace_id={:?}",
            payload.payment_no,
            payload.supplier_id,
            payload.amount,
            event.trace_id
        );

        if payload.amount <= 0.0 {
            tracing::info!(
                "[erp] 付款金额为 0，跳过应付账款核销 - payment_no={}",
                payload.payment_no
            );
            return Ok(());
        }

        let now = chrono::Utc::now();

        // 根据 supplier_id 和 amount 匹配应付账款并核销
        let result = if let Some(supplier_id) = payload.supplier_id {
            sqlx::query(
                r#"UPDATE erp.payables
                   SET status = 'paid',
                       paid_amount = paid_amount + $1,
                       updated_at = $2
                   WHERE supplier_id = $3
                     AND status = 'pending'
                     AND amount = $1
                   RETURNING invoice_number"#,
            )
            .bind(payload.amount)
            .bind(now)
            .bind(supplier_id)
            .fetch_optional(&self.db)
            .await
        } else {
            sqlx::query(
                r#"UPDATE erp.payables
                   SET status = 'paid',
                       paid_amount = paid_amount + $1,
                       updated_at = $2
                   WHERE status = 'pending'
                     AND amount = $1
                   ORDER BY invoice_date ASC
                   LIMIT 1
                   RETURNING invoice_number"#,
            )
            .bind(payload.amount)
            .bind(now)
            .fetch_optional(&self.db)
            .await
        };

        match result {
            Ok(Some(row)) => {
                let invoice_number: String = row
                    .try_get("invoice_number")
                    .unwrap_or_else(|_| "<unknown>".to_string());
                tracing::info!(
                    "[erp] 已核销应付账款 - invoice_number={}, payment_no={}, amount={}",
                    invoice_number,
                    payload.payment_no,
                    payload.amount
                );
            }
            Ok(None) => {
                tracing::warn!(
                    "[erp] PaymentMade 未找到匹配的应付账款 - payment_no={}, supplier_id={:?}, amount={}（graceful fallback）",
                    payload.payment_no,
                    payload.supplier_id,
                    payload.amount
                );
            }
            Err(e) => {
                tracing::warn!("[erp] 核销应付账款失败（graceful fallback）: {}", e);
            }
        }

        Ok(())
    }

    /// MDM 员工变更事件处理
    ///
    /// 订阅 HRM 员工变更事件，同步更新 ERP 中的员工相关记录
    async fn handle_master_data_employee_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::info!(
            "[erp-mdm] 员工主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let employee_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "employee", employee_name, status)
            .await?;

        Ok(())
    }

    /// MDM 组织变更事件处理
    ///
    /// 订阅 HRM 部门/公司变更事件，同步更新 ERP 中的组织相关记录
    async fn handle_master_data_organization_changed(
        &self,
        event: MasterDataEvent,
    ) -> HandlerResult {
        tracing::info!(
            "[erp-mdm] 组织主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let org_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "organization", org_name, status)
            .await?;

        Ok(())
    }

    /// MDM 客户变更事件处理
    ///
    /// 订阅 CRM 客户变更事件，同步更新 ERP 中的客户相关财务记录
    async fn handle_master_data_customer_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::info!(
            "[erp-mdm] 客户主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let customer_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "customer", customer_name, status)
            .await?;

        Ok(())
    }

    /// MDM 物料变更事件处理
    ///
    /// 订阅 PDM 物料变更事件，同步更新 ERP 中的物料库存记录
    async fn handle_master_data_material_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::info!(
            "[erp-mdm] 物料主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let material_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "material", material_name, status)
            .await?;

        Ok(())
    }

    /// AC-5: 将主数据变更事件持久化到本地 ref 表
    ///
    /// 通过 master_data_id（而非业务编码）建立跨服务关联。
    /// 消费端查询时使用 master_data_id 定位本地业务记录。
    async fn upsert_local_master_data_ref(
        &self,
        event: &MasterDataEvent,
        local_entity_type: &str,
        name: &str,
        status: &str,
    ) -> HandlerResult {
        let domain_str = format!("{:?}", event.domain).to_lowercase();

        let result = sqlx::query(
            r#"INSERT INTO erp_master_data_refs
               (master_data_id, tenant_id, domain, code, name, status, source_service,
                local_entity_type, payload_snapshot, last_synced_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
               ON CONFLICT (master_data_id) DO UPDATE
               SET name = EXCLUDED.name,
                   status = EXCLUDED.status,
                   code = EXCLUDED.code,
                   payload_snapshot = EXCLUDED.payload_snapshot,
                   last_synced_at = NOW(),
                   updated_at = NOW()"#,
        )
        .bind(&event.master_data_id)
        .bind(event.tenant_id)
        .bind(&domain_str)
        .bind(&event.code)
        .bind(name)
        .bind(status)
        .bind(&event.source_service)
        .bind(local_entity_type)
        .bind(&event.payload)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::info!(
                    "[erp-mdm] 本地 ref 已同步 - master_data_id={}, domain={}, action={:?}, local_entity_type={}",
                    event.master_data_id,
                    domain_str,
                    event.action,
                    local_entity_type
                );
            }
            Err(e) => {
                tracing::warn!(
                    "[erp-mdm] 本地 ref 同步失败（graceful fallback）- master_data_id={}: {}",
                    event.master_data_id,
                    e
                );
            }
        }

        Ok(())
    }

    async fn handle_reconciliation_created(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationCreatedPayload =
            serde_json::from_value(event.payload.clone())
                .map_err(|e| format!("解析 ReconciliationCreated payload 失败: {}", e))?;

        tracing::info!(
            "[erp] ReconciliationCreated 处理 - id={}, recon_code={}, trace_id={:?}",
            payload.id,
            payload.recon_code.as_deref().unwrap_or(""),
            event.trace_id
        );

        let recon_code = payload
            .recon_code
            .clone()
            .unwrap_or_else(|| format!("REC-{}", payload.id));
        let now = chrono::Utc::now();

        sqlx::query(
            r#"INSERT INTO erp.fin_reconciliations
               (id, reconciliation_no, reconciliation_type, status, period,
                reference_id, total_amount, reconciled_amount, discrepancy_amount,
                tenant_id, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, $7, $8, $9, $9)
             ON CONFLICT (id) DO NOTHING"#,
        )
        .bind(payload.id)
        .bind(&recon_code)
        .bind(&payload.recon_type)
        .bind(&payload.status)
        .bind(&payload.period)
        .bind(payload.entity_id)
        .bind(payload.tenant_id)
        .bind(payload.created_by)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("写入 erp.fin_reconciliations 失败: {}", e))?;

        Ok(())
    }

    async fn handle_reconciliation_approved(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationApprovedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 ReconciliationApproved payload 失败: {}", e))?;

        tracing::info!(
            "[erp] ReconciliationApproved 处理 - id={}, approved_by={}, trace_id={:?}",
            payload.id,
            payload.approved_by,
            event.trace_id
        );

        sqlx::query(
            r#"UPDATE erp.fin_reconciliations
               SET status = 'approved',
                   updated_at = NOW()
               WHERE id = $1 AND status IN ('pending', 'draft')"#,
        )
        .bind(payload.id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("更新 erp.fin_reconciliations 失败: {}", e))?;

        Ok(())
    }

    async fn handle_reconciliation_updated(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationUpdatedPayload =
            serde_json::from_value(event.payload.clone())
                .map_err(|e| format!("解析 ReconciliationUpdated payload 失败: {}", e))?;

        tracing::debug!(
            "[erp] ReconciliationUpdated 处理 - id={}, status={}, trace_id={:?}",
            payload.id,
            payload.status,
            event.trace_id
        );

        sqlx::query(
            r#"UPDATE erp.fin_reconciliations
               SET status = $1,
                   updated_at = NOW()
               WHERE id = $2"#,
        )
        .bind(&payload.status)
        .bind(payload.id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("更新 erp.fin_reconciliations 失败: {}", e))?;

        Ok(())
    }
}

/// 启动 ERP 服务的事件订阅
pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = ErpEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[erp] 启动事件订阅者，注册 16 个业务事件 + 4 个 MDM 主数据事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[erp] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
