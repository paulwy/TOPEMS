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
//! - `EmployeeOnboarded` → 按租户配置的入职成本创建应付账款（未配置则跳过）
//! - `PmProjectCompleted` → 仅记录完成，不确认收入（金额在结算时确定）
//! - `PmProjectSettled` → 按真实结算金额创建项目应收账款
//! - `OpportunityWon` → CRM 商机赢单自动创建销售订单
//! - `InventoryUpdated` → 库存更新事件（V20.1 真实实现，更新 account_balances）
//! - `ReturnCompleted` → 退款凭证自动生成（V19.6 真实实现）
//! - `PaymentReceived` → 自动核销应收账款（V20.1 新增）
//! - `PaymentMade` → 自动核销应付账款（V20.1 新增）

use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::error::TopemsError;
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler};
use topems_shared_event::event::{
    CacheInvalidatedPayload, EmployeeOnboardedPayload, Event, EventResult, EventSubscriber,
    EventType, InventoryUpdatedPayload, MasterDataAction, MasterDataDomain, MasterDataEvent,
    MesWorkReportSubmittedPayload, OpportunityWonPayload, PaymentMadePayload,
    PaymentReceivedPayload, PmProjectCompletedPayload, PmProjectSettledPayload,
    PurchaseOrderApprovedPayload, ReconciliationApprovedPayload, ReconciliationCreatedPayload,
    ReconciliationUpdatedPayload, SalesOrderApprovedPayload, StockInboundPayload,
    StockOutboundPayload, WorkOrderCompletedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

/// ERP 事件处理器集合，承载必要的依赖
#[derive(Clone)]
pub struct ErpEventHandlers {
    pub db: PgPool,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl ErpEventHandlers {
    pub fn new(db: PgPool, dict_cache: Arc<AsyncL2Cache<serde_json::Value>>) -> Self {
        Self { db, dict_cache }
    }

    /// 构建 ERP 服务的事件订阅者，注册所有业务事件 handler
    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("erp")?.with_consumer_group("erp-group");

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
        let h12 = self.clone();
        let h13 = self.clone();
        let h14 = self.clone();
        let h15 = self.clone();
        let h16 = self.clone();
        let h17 = self.clone();
        let h18 = self.clone();
        let h19 = self.clone();
        let h20 = self.clone();
        let h22 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::SalesOrderApproved], move |event| {
                let h = h1.clone();
                Box::pin(async move {
                    match h.handle_sales_order_approved(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_sales_order_approved 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::PurchaseOrderApproved], move |event| {
                let h = h2.clone();
                Box::pin(async move {
                    match h.handle_purchase_order_approved(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_purchase_order_approved 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::WorkOrderCompleted], move |event| {
                let h = h3.clone();
                Box::pin(async move {
                    match h.handle_work_order_completed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_work_order_completed 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::StockInbound], move |event| {
                let h = h4.clone();
                Box::pin(async move {
                    match h.handle_stock_inbound(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_stock_inbound 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::StockOutbound], move |event| {
                let h = h5.clone();
                Box::pin(async move {
                    match h.handle_stock_outbound(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_stock_outbound 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::EmployeeOnboarded], move |event| {
                let h = h6.clone();
                Box::pin(async move {
                    match h.handle_employee_onboarded(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_employee_onboarded 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::PmProjectCompleted], move |event| {
                let h = h7.clone();
                Box::pin(async move {
                    match h.handle_pm_project_completed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_pm_project_completed 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::PmProjectSettled], move |event| {
                let h = h8.clone();
                Box::pin(async move {
                    match h.handle_pm_project_settled(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_pm_project_settled 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::OpportunityWon], move |event| {
                let h = h9.clone();
                Box::pin(async move {
                    match h.handle_opportunity_won(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_opportunity_won 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::InventoryUpdated], move |event| {
                let h = h10.clone();
                Box::pin(async move {
                    match h.handle_inventory_updated(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_inventory_updated 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::PaymentReceived], move |event| {
                let h = h12.clone();
                Box::pin(async move {
                    match h.handle_payment_received(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_payment_received 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::PaymentMade], move |event| {
                let h = h13.clone();
                Box::pin(async move {
                    match h.handle_payment_made(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_payment_made 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler_employee(move |event| {
                let h = h14.clone();
                Box::pin(async move {
                    match h.handle_master_data_employee_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[erp] handle_master_data_employee_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler_organization(move |event| {
                let h = h15.clone();
                Box::pin(async move {
                    match h.handle_master_data_organization_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[erp] handle_master_data_organization_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler(vec![MasterDataDomain::Customer], move |event| {
                let h = h16.clone();
                Box::pin(async move {
                    match h.handle_master_data_customer_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[erp] handle_master_data_customer_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler(vec![MasterDataDomain::Material], move |event| {
                let h = h17.clone();
                Box::pin(async move {
                    match h.handle_master_data_material_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[erp] handle_master_data_material_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::ReconciliationCreated], move |event| {
                let h = h18.clone();
                Box::pin(async move {
                    match h.handle_reconciliation_created(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_reconciliation_created 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::ReconciliationApproved], move |event| {
                let h = h19.clone();
                Box::pin(async move {
                    match h.handle_reconciliation_approved(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_reconciliation_approved 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::ReconciliationUpdated], move |event| {
                let h = h20.clone();
                Box::pin(async move {
                    match h.handle_reconciliation_updated(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_reconciliation_updated 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::MesWorkReportSubmitted], move |event| {
                let h = h22.clone();
                Box::pin(async move {
                    match h.handle_mes_work_report_submitted(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[erp] handle_mes_work_report_submitted 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            }))
    }

    /// SalesOrderApproved → 自动生成应收账款 + 销售凭证
    async fn handle_sales_order_approved(&self, event: Event) -> HandlerResult {
        let payload: SalesOrderApprovedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 SalesOrderApproved payload 失败: {}",
                    e
                ))
            })?;

        tracing::info!(
            "[erp] SalesOrderApproved 处理 - order_no={}, order_id={}, trace_id={:?}",
            payload.order_no,
            payload.order_id,
            event.trace_id
        );

        // 事件 payload 本应携带租户：缺失/零租户时拒绝处理，禁止静默写入零 UUID。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                "[erp] SalesOrderApproved 缺少租户，跳过处理 - order_id={}",
                payload.order_id
            );
            return Ok(());
        };

        let order: Option<(Option<rust_decimal::Decimal>, Option<uuid::Uuid>, Option<String>, Option<chrono::DateTime<chrono::Utc>>)> = sqlx::query_as(
            r#"SELECT total_amount, customer_id, customer_name, order_date FROM erp.sales_orders WHERE id = $1"#,
        )
        .bind(payload.order_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("查询销售订单失败: {}", e)))?;

        if let Some((amount, customer_id, customer_name, order_date)) = order {
            let amount = amount.unwrap_or(rust_decimal::Decimal::ZERO);
            let receivable_no = format!("REC-{}", payload.order_no);
            let now = chrono::Utc::now();

            let mut tx = self
                .db
                .begin()
                .await
                .map_err(|e| TopemsError::DatabaseQuery(format!("开启事务失败: {}", e)))?;

            let receivable_result = sqlx::query(
                r#"INSERT INTO erp.receivables
                   (invoice_number, customer_id, customer_name, source_order_id, amount, status, invoice_date, created_at, updated_at, tenant_id)
                   VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7, $8)
                   ON CONFLICT (invoice_number) DO NOTHING"#,
            )
            .bind(&receivable_no)
            .bind(customer_id)
            .bind(&customer_name)
            .bind(payload.order_id)
            .bind(amount)
            .bind(order_date)
            .bind(now)
            .bind(tenant_id)
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

            // 凭证写入已收敛至 finance（finance 订阅 SalesOrderApproved 写完整分录），
            // ERP 侧只保留业务应收记录，不再写 erp.financial_vouchers / erp.voucher_items。
            tx.commit()
                .await
                .map_err(|e| TopemsError::DatabaseQuery(format!("提交事务失败: {}", e)))?;
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
        let payload: PurchaseOrderApprovedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 PurchaseOrderApproved payload 失败: {}", e))
        })?;

        tracing::info!(
            "[erp] PurchaseOrderApproved 处理 - order_no={}, order_id={}, trace_id={:?}",
            payload.order_no,
            payload.order_id,
            event.trace_id
        );

        // 事件 payload 本应携带租户：缺失/零租户时拒绝处理，禁止静默写入零 UUID。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                "[erp] PurchaseOrderApproved 缺少租户，跳过处理 - order_id={}",
                payload.order_id
            );
            return Ok(());
        };

        let order: Option<(Option<f64>, Option<uuid::Uuid>, Option<String>, Option<chrono::DateTime<chrono::Utc>>)> = sqlx::query_as(
            r#"SELECT total_amount, supplier_id, supplier_name, order_date FROM erp.purchase_orders WHERE id = $1"#,
        )
        .bind(payload.order_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("查询采购订单失败: {}", e)))?;

        if let Some((amount, supplier_id, supplier_name, order_date)) = order {
            let amount = amount.unwrap_or(0.0);
            let payable_no = format!("PAY-{}", payload.order_no);
            let now = chrono::Utc::now();

            let mut tx = self
                .db
                .begin()
                .await
                .map_err(|e| TopemsError::DatabaseQuery(format!("开启事务失败: {}", e)))?;

            let payable_result = sqlx::query(
                r#"INSERT INTO erp.payables
                   (invoice_number, supplier_id, supplier_name, source_order_id, amount, status, invoice_date, created_at, updated_at, tenant_id)
                   VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7, $8)
                   ON CONFLICT (invoice_number) DO NOTHING"#,
            )
            .bind(&payable_no)
            .bind(supplier_id)
            .bind(&supplier_name)
            .bind(payload.order_id)
            .bind(amount)
            .bind(order_date)
            .bind(now)
            .bind(tenant_id)
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

            // 凭证写入已收敛至 finance（finance 订阅 PurchaseOrderApproved 写完整分录），
            // ERP 侧只保留业务应付记录，不再写 erp.financial_vouchers / erp.voucher_items。
            tx.commit()
                .await
                .map_err(|e| TopemsError::DatabaseQuery(format!("提交事务失败: {}", e)))?;
        } else {
            tracing::warn!(
                "[erp] PurchaseOrderApproved 未找到对应订单 {}，跳过应付账款和凭证生成",
                payload.order_id
            );
        }

        Ok(())
    }

    /// WorkOrderCompleted → 订阅占位（原成本核算写入 erp_cost_allocations 属死代码已清理；
    /// 表在库中不存在、无发布方闭环，未来如需成本归集按新功能立项）
    async fn handle_work_order_completed(&self, event: Event) -> HandlerResult {
        let payload: WorkOrderCompletedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 WorkOrderCompleted payload 失败: {}",
                    e
                ))
            })?;

        tracing::info!(
            "[erp] WorkOrderCompleted 处理 - work_order_no={}, completed_qty={:?}, trace_id={:?}",
            payload.work_order_no,
            payload.completed_quantity,
            event.trace_id
        );

        Ok(())
    }

    /// StockInbound → 自动生成库存凭证
    async fn handle_stock_inbound(&self, event: Event) -> HandlerResult {
        let payload: StockInboundPayload =
            serde_json::from_value(event.payload.clone()).map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 StockInbound payload 失败: {}", e))
            })?;

        tracing::info!(
            "[erp] StockInbound 处理 - inbound_no={}, material={:?}, qty={}, reference_order_id={:?}, trace_id={:?}",
            payload.inbound_no,
            payload.material_name,
            payload.quantity,
            payload.reference_order_id,
            event.trace_id
        );

        // erp.vouchers 已停写（无金额凭证桩，无账务意义）；库存成本凭证待后续按估值链路立项，
        // 账务凭证唯一落点 = finance.core_finance_vouchers。
        tracing::info!("[erp] StockInbound 已忽略（erp.vouchers 停写）");
        Ok(())
    }

    /// StockOutbound → 自动生成库存凭证
    async fn handle_stock_outbound(&self, event: Event) -> HandlerResult {
        let payload: StockOutboundPayload =
            serde_json::from_value(event.payload.clone()).map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 StockOutbound payload 失败: {}", e))
            })?;

        tracing::info!(
            "[erp] StockOutbound 处理 - outbound_no={}, material={:?}, qty={:?}, trace_id={:?}",
            payload.outbound_no,
            payload.material_name,
            payload.quantity,
            event.trace_id
        );

        // erp.vouchers 已停写（无金额凭证桩，无账务意义）；账务凭证唯一落点 = finance。
        tracing::info!("[erp] StockOutbound 已忽略（erp.vouchers 停写）");
        Ok(())
    }

    /// EmployeeOnboarded → 自动创建入职费用应付账款 + 费用凭证
    ///
    /// 员工入职时自动生成一笔入职相关的应付账款（如办公用品、培训费用等）
    /// 并生成对应的财务凭证。使用 graceful fallback：若 DB 操作失败，记录警告并继续。
    async fn handle_employee_onboarded(&self, event: Event) -> HandlerResult {
        let payload: EmployeeOnboardedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 EmployeeOnboarded payload 失败: {}", e))
            })?;

        tracing::info!(
            "[erp] EmployeeOnboarded 处理 - employee_id={}, name={}, department={:?}, trace_id={:?}",
            payload.employee_id,
            payload.name,
            payload.department_id,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let onboard_date = payload.onboard_date.unwrap_or(now);
        // 事件 payload 本应携带租户：缺失/零租户时拒绝处理，禁止静默写入零 UUID。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                "[erp] EmployeeOnboarded 缺少租户，跳过处理 - employee_id={}",
                payload.employee_id
            );
            return Ok(());
        };

        // 入职成本是租户级固定规则，落到配置而不是写死：读取
        // public.core_tenant_settings('erp.employee_onboarding_cost')。
        // 未配置则不生成应付账款，避免继续写入 500.0 这类占位金额。
        let configured_cost: Option<Option<Decimal>> = sqlx::query_scalar(
            r#"SELECT NULLIF(setting_value, '')::numeric
               FROM public.core_tenant_settings
               WHERE tenant_id = $1
                 AND setting_key = 'erp.employee_onboarding_cost'
                 AND deleted_at IS NULL
               LIMIT 1"#,
        )
        .bind(tenant_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取入职成本配置失败: {}", e)))?;

        let onboarding_cost = match configured_cost.flatten() {
            Some(cost) => cost,
            None => {
                tracing::info!(
                    "[erp] 租户 {} 未配置 erp.employee_onboarding_cost，跳过入职应付账款（employee_id={}）",
                    tenant_id,
                    payload.employee_id
                );
                return Ok(());
            }
        };

        let payable_no = format!("PAY-ONBOARD-{}", payload.employee_id);
        let supplier_name = "员工入职福利（内部计提）".to_string();

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
               (invoice_number, supplier_name, category, amount, status, invoice_date, created_at, updated_at, tenant_id)
               VALUES ($1, $2, 'onboarding', $3, 'pending', $4, $5, $5, $6)
               ON CONFLICT (invoice_number) DO NOTHING"#,
        )
        .bind(&payable_no)
        .bind(&supplier_name)
        .bind(onboarding_cost)
        .bind(onboard_date)
        .bind(now)
        .bind(tenant_id)
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

        // 凭证写入已收敛至 finance（finance 订阅 EmployeeOnboarded 写完整分录），
        // ERP 侧只保留业务应付记录。
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
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 PmProjectCompleted payload 失败: {}",
                    e
                ))
            })?;

        tracing::info!(
            "[erp] PmProjectCompleted 处理 - project_name={}, project_id={}, completed_at={:?}, trace_id={:?}",
            payload.project_name,
            payload.project_id,
            payload.completed_at,
            event.trace_id
        );

        // 项目完成时没有可确认的真实金额：pm.projects 只有 budget，没有合同额/结算额，
        // 原先写死 10000.0 属占位假数据。现在不再在完成时确认应收，
        // 改由 PmProjectSettled 按 settled_amount 生成。
        tracing::info!(
            "[erp] PmProjectCompleted 处理 - project_name={}, project_id={}, 等待 PmProjectSettled 生成应收账款, trace_id={:?}",
            payload.project_name,
            payload.project_id,
            event.trace_id
        );

        Ok(())
    }

    /// PmProjectSettled → 按真实结算金额创建项目应收账款
    ///
    /// 结算金额来自 PmProjectSettledPayload.settled_amount（真实业务来源）。
    /// 缺失结算金额时跳过并告警，不再写入占位金额。
    async fn handle_pm_project_settled(&self, event: Event) -> HandlerResult {
        let payload: PmProjectSettledPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 PmProjectSettled payload 失败: {}", e))
            })?;

        let project_amount = match payload.settled_amount {
            Some(amount) => amount,
            None => {
                tracing::warn!(
                    "[erp] PmProjectSettled 缺少 settled_amount，跳过项目应收账款（project_id={}）",
                    payload.project_id
                );
                return Ok(());
            }
        };

        let now = chrono::Utc::now();
        let settled_at = payload.settled_at.unwrap_or(now);
        let receivable_no = format!("REC-PROJ-{}", payload.project_id);
        // 事件 payload 本应携带租户：缺失/零租户时拒绝处理，禁止静默写入零 UUID。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                "[erp] PmProjectSettled 缺少租户，跳过项目应收账款 - project_id={}",
                payload.project_id
            );
            return Ok(());
        };

        let receivable_result = sqlx::query(
            r#"INSERT INTO erp.receivables
               (invoice_number, customer_name, project_name, amount, status, invoice_date, created_at, updated_at, tenant_id)
               VALUES ($1, $2, $3, $4, 'pending', $5, $6, $6, $7)
               ON CONFLICT (invoice_number) DO NOTHING"#,
        )
        .bind(&receivable_no)
        // payload 不含客户名称，留空而不是编造"项目客户"。
        .bind(None::<String>)
        .bind(&payload.project_name)
        .bind(project_amount)
        .bind(settled_at)
        .bind(now)
        .bind(tenant_id)
        .execute(&self.db)
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

        Ok(())
    }

    /// OpportunityWon → CRM 商机赢单自动创建销售订单（幂等处理）
    async fn handle_opportunity_won(&self, event: Event) -> HandlerResult {
        let payload: OpportunityWonPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 OpportunityWon payload 失败: {}", e))
            })?;

        tracing::info!(
            "[erp] OpportunityWon 处理 - opportunity_id={}, opportunity_name={}, amount={:?}, trace_id={:?}",
            payload.opportunity_id,
            payload.opportunity_name,
            payload.amount,
            event.trace_id
        );

        // 事件 payload 本应携带租户：缺失/零租户时拒绝处理，禁止静默写入零 UUID。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                "[erp] OpportunityWon 缺少租户，跳过处理 - opportunity_id={}",
                payload.opportunity_id
            );
            return Ok(());
        };

        // 幂等检查：同一商机不会重复创建销售订单
        let existing_order: Option<(uuid::Uuid,)> =
            sqlx::query_as(r#"SELECT id FROM erp.sales_orders WHERE remark = $1"#)
                .bind(format!("from_crm_opportunity:{}", payload.opportunity_id))
                .fetch_optional(&self.db)
                .await
                .map_err(|e| {
                    TopemsError::DatabaseQuery(format!("查询销售订单是否存在失败: {}", e))
                })?;

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
               (id, order_no, customer_id, customer_name, order_date, total_amount, status, remark, created_at, updated_at, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $8, $9)"#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind(payload.customer_id)
        .bind(&payload.customer_name)
        .bind(now)
        .bind(payload.amount.unwrap_or(rust_decimal::Decimal::ZERO))
        .bind(format!("from_crm_opportunity:{}", payload.opportunity_id))
        .bind(now)
        .bind(tenant_id)
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
                return Err(TopemsError::BusinessLogic(format!(
                    "创建销售订单失败: {}",
                    e
                )));
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
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 InventoryUpdated payload 失败: {}", e))
            })?;

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

    /// PaymentReceived → 自动核销应收账款（V20.1 新增）
    ///
    /// 根据客户和金额匹配 erp.receivables，将状态置为 'paid' 并累加 received_amount。
    /// 使用 graceful fallback：若未找到匹配记录或更新失败，记录警告并继续。
    async fn handle_payment_received(&self, event: Event) -> HandlerResult {
        let payload: PaymentReceivedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 PaymentReceived payload 失败: {}", e))
            })?;

        tracing::info!(
            "[erp] PaymentReceived 处理 - payment_no={}, customer_id={:?}, amount={}, trace_id={:?}",
            payload.payment_no,
            payload.customer_id,
            payload.amount,
            event.trace_id
        );

        if payload.amount <= rust_decimal::Decimal::ZERO {
            tracing::info!(
                "[erp] 收款金额为 0，跳过应收账款核销 - payment_no={}",
                payload.payment_no
            );
            return Ok(());
        }

        let now = chrono::Utc::now();

        // 根据 customer_name（收款单无 customer_id，2026-09-08 新增字段）→ customer_id → 金额匹配。
        // RLS 事件链路隔离（2026-09-09）：仅在有租户上下文时核销；无租户时禁用兜底（宁缺勿乱）。
        let result = match payload.tenant_id {
            Some(tenant_id) => {
                if let Some(customer_name) = payload.customer_name.as_deref() {
                    sqlx::query(
                        r#"UPDATE erp.receivables
                           SET status = 'paid',
                               received_amount = received_amount + $1,
                               updated_at = $2
                           WHERE customer_name = $3
                             AND tenant_id = $4
                             AND status = 'pending'
                             AND amount = $1
                           RETURNING invoice_number"#,
                    )
                    .bind(payload.amount)
                    .bind(now)
                    .bind(customer_name)
                    .bind(tenant_id)
                    .fetch_optional(&self.db)
                    .await
                } else if let Some(customer_id) = payload.customer_id {
                    sqlx::query(
                        r#"UPDATE erp.receivables
                           SET status = 'paid',
                               received_amount = received_amount + $1,
                               updated_at = $2
                           WHERE customer_id = $3
                             AND tenant_id = $4
                             AND status = 'pending'
                             AND amount = $1
                           RETURNING invoice_number"#,
                    )
                    .bind(payload.amount)
                    .bind(now)
                    .bind(customer_id)
                    .bind(tenant_id)
                    .fetch_optional(&self.db)
                    .await
                } else {
                    sqlx::query(
                        r#"UPDATE erp.receivables
                           SET status = 'paid',
                               received_amount = received_amount + $1,
                               updated_at = $2
                           WHERE id = (
                               SELECT id FROM erp.receivables
                               WHERE status = 'pending'
                                 AND tenant_id = $3
                                 AND amount = $1
                               ORDER BY invoice_date ASC
                               LIMIT 1
                           )
                           RETURNING invoice_number"#,
                    )
                    .bind(payload.amount)
                    .bind(now)
                    .bind(tenant_id)
                    .fetch_optional(&self.db)
                    .await
                }
            }
            None => Ok(None),
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
        let payload: PaymentMadePayload =
            serde_json::from_value(event.payload.clone()).map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 PaymentMade payload 失败: {}", e))
            })?;

        tracing::info!(
            "[erp] PaymentMade 处理 - payment_no={}, supplier_id={:?}, amount={}, trace_id={:?}",
            payload.payment_no,
            payload.supplier_id,
            payload.amount,
            event.trace_id
        );

        if payload.amount <= rust_decimal::Decimal::ZERO {
            tracing::info!(
                "[erp] 付款金额为 0，跳过应付账款核销 - payment_no={}",
                payload.payment_no
            );
            return Ok(());
        }

        let now = chrono::Utc::now();

        // 根据 supplier_id 和 amount 匹配应付账款并核销。
        // RLS 事件链路隔离（2026-09-09）：仅在有租户上下文时核销；无租户时禁用兜底（宁缺勿乱）。
        let result = match payload.tenant_id {
            Some(tenant_id) => {
                if let Some(supplier_id) = payload.supplier_id {
                    sqlx::query(
                        r#"UPDATE erp.payables
                           SET status = 'paid',
                               paid_amount = paid_amount + $1,
                               updated_at = $2
                           WHERE supplier_id = $3
                             AND tenant_id = $4
                             AND status = 'pending'
                             AND amount = $1
                           RETURNING invoice_number"#,
                    )
                    .bind(payload.amount)
                    .bind(now)
                    .bind(supplier_id)
                    .bind(tenant_id)
                    .fetch_optional(&self.db)
                    .await
                } else {
                    sqlx::query(
                        r#"UPDATE erp.payables
                           SET status = 'paid',
                               paid_amount = paid_amount + $1,
                               updated_at = $2
                           WHERE id = (
                               SELECT id FROM erp.payables
                               WHERE status = 'pending'
                                 AND tenant_id = $3
                                 AND amount = $1
                               ORDER BY invoice_date ASC
                               LIMIT 1
                           )
                           RETURNING invoice_number"#,
                    )
                    .bind(payload.amount)
                    .bind(now)
                    .bind(tenant_id)
                    .fetch_optional(&self.db)
                    .await
                }
            }
            None => Ok(None),
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

        // K8：erp.erp_master_data_refs 收紧为 fail-closed 后，裸池 UPSERT 会报 42501。
        // 非 nil 租户一律走租户作用域；nil 租户代表全局共享主数据（服务身份/平台级），
        // 显式走系统通道（rls_system='on'），不复用「未设 GUC 即放行」的旧豁免。
        let db = topems_shared_db::scope::Db::new(self.db.clone(), "erp, public, shared");
        let scope_result = if event.tenant_id.is_nil() {
            // tenant-system: nil 租户代表全局共享主数据，需要写入 tenant_id IS NULL 的行
            db.scope_system().await
        } else {
            db.scope_for_tenant(event.tenant_id).await
        };
        let mut scope = scope_result.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[erp-mdm] 打开本地 ref 写入作用域失败 - master_data_id={}, tenant_id={}, domain={}: {}",
                event.master_data_id, event.tenant_id, domain_str, e
            ))
        })?;

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
        .execute(&mut scope)
        .await;

        // R-7b：写失败不再 warn 吞成 Ok（旧语义下 Err 被包成 Ok 立即 ACK，失败完全不可见）。
        // ref 写入是幂等 UPSERT，瞬态故障走 Stream 重试自愈；永久性失败超列 MDM DLQ。
        match result {
            Ok(_) => {
                scope.commit().await.map_err(|e| {
                    TopemsError::DatabaseTransaction(format!(
                        "[erp-mdm] 本地 ref 写入作用域提交失败 - master_data_id={}, tenant_id={}, domain={}: {}",
                        event.master_data_id, event.tenant_id, domain_str, e
                    ))
                })?;
                tracing::info!(
                    "[erp-mdm] 本地 ref 已同步 - master_data_id={}, tenant_id={}, domain={}, action={:?}, local_entity_type={}",
                    event.master_data_id,
                    event.tenant_id,
                    domain_str,
                    event.action,
                    local_entity_type
                );
            }
            Err(e) => {
                return Err(TopemsError::BusinessLogic(format!(
                    "[erp-mdm] 本地 ref 同步失败 - master_data_id={}, tenant_id={}, domain={}, local_entity_type={}: {}",
                    event.master_data_id, event.tenant_id, domain_str, local_entity_type, e
                )));
            }
        }

        Ok(())
    }

    async fn handle_reconciliation_created(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationCreatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 ReconciliationCreated payload 失败: {}", e))
        })?;

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
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!("写入 erp.fin_reconciliations 失败: {}", e))
        })?;

        Ok(())
    }

    async fn handle_reconciliation_approved(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationApprovedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 ReconciliationApproved payload 失败: {}",
                    e
                ))
            })?;

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
               WHERE id = $1 AND status IN ('pending', 'draft') AND tenant_id = $2"#,
        )
        .bind(payload.id)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!("更新 erp.fin_reconciliations 失败: {}", e))
        })?;

        Ok(())
    }

    async fn handle_reconciliation_updated(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationUpdatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 ReconciliationUpdated payload 失败: {}", e))
        })?;

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
               WHERE id = $2 AND tenant_id = $3"#,
        )
        .bind(&payload.status)
        .bind(payload.id)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!("更新 erp.fin_reconciliations 失败: {}", e))
        })?;

        Ok(())
    }

    /// MesWorkReportSubmitted → 更新生产订单进度（D2 U2 环2：mes→erp 报工回传事件化）
    /// 幂等键 = work_report_id；同 work_report_id 重放只更新一次。
    /// DLQ 兜底由 shared-event 订阅器统一提供（handler 返回 Err 即入 topems:dlq，retry_count 累加）。
    async fn handle_mes_work_report_submitted(&self, event: Event) -> HandlerResult {
        let payload: MesWorkReportSubmittedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 MesWorkReportSubmitted payload 失败: {}",
                    e
                ))
            })?;

        tracing::info!(
            "[erp] MesWorkReportSubmitted 处理 - work_report_id={}, erp_order_id={:?}, qty={:?}, trace_id={:?}",
            payload.work_report_id,
            payload.erp_order_id,
            payload.completed_quantity,
            event.trace_id
        );

        // C-1：幂等账本表由迁移链权威创建（运行时自建表已移除），直接进入幂等写入

        // 事件 payload 本应携带租户：缺失/零租户时拒绝处理，禁止静默写入零 UUID。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                "[erp] MesWorkReportSubmitted 缺少租户，跳过处理 - work_report_id={}",
                payload.work_report_id
            );
            return Ok(());
        };

        // 幂等：账本插入冲突 = 已处理过，直接收敛返回
        let key = format!("mes_work_report:{}", payload.work_report_id);
        let inserted = sqlx::query(
            "INSERT INTO erp.event_idempotency (idempotency_key, event_type, tenant_id) VALUES ($1, 'MesWorkReportSubmitted', $2) ON CONFLICT (idempotency_key) DO NOTHING",
        )
        .bind(&key)
        .bind(tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("写入幂等账本失败: {}", e)))?;
        if inserted.rows_affected() == 0 {
            tracing::info!(
                "[erp] MesWorkReportSubmitted 幂等跳过 - work_report_id={} 已处理",
                payload.work_report_id
            );
            return Ok(());
        }

        // 解析 erp 生产订单 ID：优先事件内携带，否则按 mes_order_id 反查 source_order_id
        let erp_order_id = match payload.erp_order_id {
            Some(id) => Some(id),
            None => match payload.mes_order_id {
                Some(mid) => {
                    sqlx::query_scalar::<_, Option<uuid::Uuid>>(
                        "SELECT id FROM erp.erp_production_orders WHERE source_order_id = $1 AND deleted_at IS NULL LIMIT 1",
                    )
                    .bind(mid.to_string())
                    .fetch_optional(&self.db)
                    .await
                    .map_err(|e| TopemsError::DatabaseQuery(format!("按 mes_order_id 反查 erp 订单失败: {}", e)))?
                    .flatten()
                }
                None => None,
            },
        };

        let Some(order_id) = erp_order_id else {
            tracing::warn!(
                "[erp] MesWorkReportSubmitted 无匹配 erp 订单 - work_report_id={}, mes_order_id={:?}（进 DLQ 待人工对账）",
                payload.work_report_id, payload.mes_order_id
            );
            return Err(TopemsError::BusinessLogic(format!(
                "未找到对应 erp 生产订单（mes_order_id={:?}）",
                payload.mes_order_id
            )));
        };

        let now = chrono::Utc::now();
        sqlx::query(
            r#"UPDATE erp.erp_production_orders SET
                   completed_quantity = COALESCE($2, completed_quantity),
                   status = COALESCE($3, status),
                   updated_at = $4
               WHERE id = $1"#,
        )
        .bind(order_id)
        .bind(payload.completed_quantity)
        .bind(&payload.status)
        .bind(now.naive_utc())
        .execute(&self.db)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!("更新 erp.erp_production_orders 进度失败: {}", e))
        })?;

        tracing::info!(
            "[erp] MesWorkReportSubmitted 完成 - work_report_id={}, erp_order_id={}, qty={:?}",
            payload.work_report_id,
            order_id,
            payload.completed_quantity
        );
        Ok(())
    }
}

/// 启动 ERP 服务的事件订阅
pub async fn start_event_subscribers(
    db: PgPool,
    dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
) -> Result<(), TopemsError> {
    let handlers = ErpEventHandlers::new(db, dict_cache.clone());
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::Internal(format!("事件订阅者初始化失败: {e}")))?;

    // 创建缓存失效监听器，注册字典缓存处理器
    let mut cache_invalidation_listener = CacheInvalidationListener::new("erp");
    let dict_cache_handler =
        AsyncL2CacheInvalidationHandler::new("erp_dict_cache", dict_cache, "erp:dict_type:");
    cache_invalidation_listener.register_handler(dict_cache_handler);
    let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

    tracing::info!(
        "[erp] 启动事件订阅者，注册 16 个业务事件 + 4 个 MDM 主数据事件 + 1 个缓存失效事件 handler"
    );
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[erp] 事件订阅者异常退出: {}", e);
        }
    });

    // 订阅缓存失效事件
    let cache_listener = cache_invalidation_listener;
    // CacheInvalidated 为 best-effort 内存缓存淘汰（parse 失败即跳过、dispatch 无失败语义），
    // 保持 .subscribe() 不入 DLQ——避免良性缓存失效失败制造死信噪音。
    let cache_subscriber = EventSubscriber::new("erp-cache-invalidation")
        .map_err(|e| TopemsError::Internal(format!("事件订阅者初始化失败: {e}")))?
        .with_consumer_group("erp-cache-invalidation-group")
        .subscribe(vec![EventType::CacheInvalidated], move |event| {
            let listener = cache_listener.clone();
            Box::pin(async move {
                if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                    let invalidation_event = CacheInvalidationEvent {
                        source_service: payload.source_service,
                        source_instance: payload.source_instance,
                        cache_key_pattern: payload.cache_key_pattern,
                        invalidation_level: InvalidationLevel::from_str(
                            &payload.invalidation_level,
                        ),
                        reason: payload.reason,
                    };
                    listener.dispatch_invalidation(&invalidation_event);
                }
            })
        });

    tokio::spawn(async move {
        if let Err(e) = cache_subscriber.start_listening().await {
            tracing::error!("[erp] 缓存失效事件订阅者异常退出: {}", e);
        }
    });

    Ok(())
}

#[cfg(test)]
mod rls_scope_tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

    use super::*;
    use sqlx::PgPool;
    use topems_shared_core::l2_cache::L2CacheConfig;

    /// 建 erp.erp_master_data_refs 并安装 K8 目标策略（fail-closed）。
    async fn setup(pool: &PgPool) {
        sqlx::raw_sql(
            r#"
            CREATE SCHEMA IF NOT EXISTS erp;
            CREATE TABLE erp.erp_master_data_refs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                master_data_id TEXT NOT NULL UNIQUE,
                tenant_id UUID NOT NULL,
                domain TEXT NOT NULL,
                code TEXT,
                name TEXT,
                status TEXT,
                source_service TEXT,
                local_entity_type TEXT,
                payload_snapshot JSONB,
                last_synced_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            ALTER TABLE erp.erp_master_data_refs ENABLE ROW LEVEL SECURITY;
            ALTER TABLE erp.erp_master_data_refs FORCE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS rls_tenant_isolation ON erp.erp_master_data_refs;
            CREATE POLICY rls_tenant_isolation ON erp.erp_master_data_refs
                USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                       OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
                WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                       OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);
            "#,
        )
        .execute(pool)
        .await
        .unwrap();
    }

    fn handlers(pool: &PgPool) -> ErpEventHandlers {
        let cache = Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default()));
        ErpEventHandlers::new(pool.clone(), cache)
    }

    fn material_event(tenant: uuid::Uuid) -> MasterDataEvent {
        MasterDataEvent::new(
            tenant,
            MasterDataDomain::Material,
            MasterDataAction::Updated,
            format!("mat-{}-test", uuid::Uuid::new_v4()),
            "MAT001".to_string(),
            "srm",
            serde_json::json!({"name": "Widget"}),
        )
    }

    /// 以系统通道读取全量 ref 行（仅断言用）。
    async fn all_refs(pool: &PgPool) -> Vec<(String, uuid::Uuid)> {
        let mut tx = pool.begin().await.unwrap();
        sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut *tx)
            .await
            .unwrap();
        let rows = sqlx::query_as("SELECT master_data_id, tenant_id FROM erp.erp_master_data_refs")
            .fetch_all(&mut *tx)
            .await
            .unwrap();
        tx.rollback().await.unwrap();
        rows
    }

    topems_test_support::sqlx_dsn_guard!();
    #[sqlx::test(migrations = false)]
    async fn mdm_ref_upsert_writes_in_tenant_scope(pool: PgPool) {
        setup(&pool).await;
        let tenant_a = uuid::Uuid::new_v4();
        let tenant_b = uuid::Uuid::new_v4();
        let event = material_event(tenant_a);

        handlers(&pool)
            .upsert_local_master_data_ref(&event, "material", "Widget", "active")
            .await
            .expect("有租户上下文时应写入本地 ref");

        let refs = all_refs(&pool).await;
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].0, event.master_data_id);
        assert_eq!(refs[0].1, tenant_a);

        // 异租户作用域读不到
        let db = topems_shared_db::scope::Db::new(pool.clone(), "erp, public, shared");
        let mut scope = db.scope_for_tenant(tenant_b).await.unwrap();
        let other: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM erp.erp_master_data_refs")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        scope.rollback().await.unwrap();
        assert_eq!(other, 0, "租户 B 不应看到租户 A 的主数据 ref");

        // 裸连接无 GUC：fail-closed
        let bare: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM erp.erp_master_data_refs")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(bare, 0);
    }

    #[sqlx::test(migrations = false)]
    async fn mdm_ref_nil_tenant_uses_explicit_system_scope(pool: PgPool) {
        setup(&pool).await;
        let tenant_a = uuid::Uuid::new_v4();
        let event = material_event(uuid::Uuid::nil());

        handlers(&pool)
            .upsert_local_master_data_ref(&event, "material", "Widget", "active")
            .await
            .expect("nil 租户（全局主数据）应显式走系统通道写入");

        let refs = all_refs(&pool).await;
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].1, uuid::Uuid::nil());

        // 普通租户作用域看不到全局行
        let db = topems_shared_db::scope::Db::new(pool.clone(), "erp, public, shared");
        let mut scope = db.scope_for_tenant(tenant_a).await.unwrap();
        let other: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM erp.erp_master_data_refs")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        scope.rollback().await.unwrap();
        assert_eq!(other, 0);

        // nil 租户本身不能当作用域用（fail-closed）
        let err = db
            .scope_for_tenant(uuid::Uuid::nil())
            .await
            .expect_err("nil 租户必须被作用域守卫拒绝");
        assert!(format!("{err}").contains("RLS context missing"), "{err}");
    }

    #[sqlx::test(migrations = false)]
    async fn mdm_ref_upsert_propagates_db_error(pool: PgPool) {
        sqlx::query("CREATE SCHEMA IF NOT EXISTS erp")
            .execute(&pool)
            .await
            .unwrap();
        let event = material_event(uuid::Uuid::new_v4());

        let err = handlers(&pool)
            .upsert_local_master_data_ref(&event, "material", "Widget", "active")
            .await
            .expect_err("ref 写入失败必须上抛（重试/DLQ），不得吞成 Ok");
        assert!(format!("{err}").contains("本地 ref 同步失败"), "{err}");
    }
}
