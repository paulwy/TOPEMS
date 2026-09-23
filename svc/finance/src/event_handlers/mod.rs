use chrono::{Datelike, Utc};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_event::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType, PaymentMadePayload,
    PaymentReceivedPayload, PurchaseOrderApprovedPayload, PurchaseOrderCreatedPayload,
    ReconciliationApprovedPayload, ReconciliationCreatedPayload, ReconciliationUpdatedPayload,
    SalesOrderApprovedPayload, SalesOrderCreatedPayload, SettlementApprovedPayload,
    SettlementCreatedPayload, SettlementRejectedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct FinanceEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl FinanceEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("finance")?;

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

        Ok(subscriber
            .subscribe_handler(vec![EventType::SalesOrderCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_sales_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::SalesOrderApproved], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_sales_order_approved(event).await })
            })
            .subscribe_handler(vec![EventType::PurchaseOrderCreated], move |event| {
                let h = h6.clone();
                Box::pin(async move { h.handle_purchase_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::PurchaseOrderApproved], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_purchase_order_approved(event).await })
            })
            .subscribe_handler(vec![EventType::PaymentReceived], move |event| {
                let h = h4.clone();
                Box::pin(async move { h.handle_payment_received(event).await })
            })
            .subscribe_handler(vec![EventType::PaymentMade], move |event| {
                let h = h5.clone();
                Box::pin(async move { h.handle_payment_made(event).await })
            })
            .subscribe_handler(vec![EventType::ReconciliationCreated], move |event| {
                let h = h7.clone();
                Box::pin(async move { h.handle_reconciliation_created(event).await })
            })
            .subscribe_handler(vec![EventType::ReconciliationUpdated], move |event| {
                let h = h8.clone();
                Box::pin(async move { h.handle_reconciliation_updated(event).await })
            })
            .subscribe_handler(vec![EventType::ReconciliationApproved], move |event| {
                let h = h9.clone();
                Box::pin(async move { h.handle_reconciliation_approved(event).await })
            })
            .subscribe_handler(vec![EventType::SettlementCreated], move |event| {
                let h = h10.clone();
                Box::pin(async move { h.handle_settlement_created(event).await })
            })
            .subscribe_handler(vec![EventType::SettlementApproved], move |event| {
                let h = h11.clone();
                Box::pin(async move { h.handle_settlement_approved(event).await })
            })
            .subscribe_handler(vec![EventType::SettlementRejected], move |event| {
                let h = h12.clone();
                Box::pin(async move { h.handle_settlement_rejected(event).await })
            }))
    }

    fn generate_voucher_no(voucher_type: &str, now: chrono::DateTime<Utc>) -> String {
        let period_prefix = format!("{:04}{:02}", now.year(), now.month());
        let time_suffix = format!("{:09}", now.timestamp_subsec_nanos() / 1000);
        format!("AUTO-{}-{}-{}", voucher_type, period_prefix, time_suffix)
    }

    async fn create_auto_voucher(
        &self,
        voucher_type: &str,
        description: &str,
        amount: f64,
        source_type: &str,
        source_id: uuid::Uuid,
        created_by: Option<&str>,
        tenant_id: uuid::Uuid,
    ) -> Result<Option<uuid::Uuid>, String> {
        let now = Utc::now();
        let period = format!("{:04}{:02}", now.year(), now.month());
        let voucher_no = Self::generate_voucher_no(voucher_type, now);
        let created_by = created_by.unwrap_or("system");

        let voucher_id = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, source_module, source_id, created_by)
             VALUES ($11, $1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10)
             ON CONFLICT (tenant_id, source_module, source_id) DO NOTHING
             RETURNING id"),
        )
        .bind(&voucher_no)
        .bind(now)
        .bind(&period)
        .bind(voucher_type)
        .bind(amount)
        .bind(amount)
        .bind(description)
        .bind(source_type)
        .bind(source_id)
        .bind(created_by)
        .bind(tenant_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("创建凭证失败: {}", e))?;

        if let Some(vid) = voucher_id {
            tracing::info!(
                "[finance] 自动生成凭证: {} ({}), 金额: {}, 来源: {}/{}",
                voucher_no,
                voucher_type,
                amount,
                source_type,
                source_id
            );
            Ok(Some(vid))
        } else {
            tracing::info!(
                "[finance] 凭证已存在（幂等跳过）, 来源: {}/{}",
                source_type,
                source_id
            );
            Ok(None)
        }
    }

    async fn handle_sales_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 销售订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: SalesOrderCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析销售订单创建事件 payload 失败: {}", e))?;

        tracing::info!(
            "[finance] 销售订单创建: {} ({})，客户: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.customer_name,
            payload.total_amount
        );

        let payable_amount = payload.payable_amount.unwrap_or(0.0);
        if payable_amount > 0.0 {
            self.store_source_amount_snapshot(
                "sales_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(0.0);
        if amount <= 0.0 {
            tracing::warn!("[finance] 销售订单金额为 0，跳过应收款记录生成");
            return Ok(());
        }

        let description = format!(
            "销售订单 {} 创建 - {}",
            payload.order_no,
            payload
                .customer_name
                .unwrap_or_else(|| "未知客户".to_string())
        );

        match self
            .create_auto_voucher(
                "receivable_draft",
                &description,
                amount,
                "sales_order_created",
                payload.order_id,
                payload.created_by.as_deref(),
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await
        {
            Ok(Some(voucher_id)) => {
                tracing::info!("[finance] 应收款草稿生成成功: voucher_id={}", voucher_id);
            }
            Ok(None) => {
                tracing::info!(
                    "[finance] 应收款草稿已存在（幂等跳过）, order_id={}",
                    payload.order_id
                );
            }
            Err(e) => {
                tracing::error!("[finance] 应收款草稿生成失败: {}", e);
            }
        }

        Ok(())
    }

    async fn handle_sales_order_approved(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 销售订单审批事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: SalesOrderApprovedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析销售订单审批事件 payload 失败: {}", e))?;

        tracing::info!(
            "[finance] 销售订单审批通过: {} ({})，客户: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.customer_name,
            payload.total_amount
        );

        let payable_amount = payload.payable_amount.unwrap_or(0.0);
        if payable_amount > 0.0 {
            self.store_source_amount_snapshot(
                "sales_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(0.0);
        if amount <= 0.0 {
            tracing::warn!("[finance] 销售订单金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "销售订单 {} 审批通过 - {}",
            payload.order_no,
            payload
                .customer_name
                .unwrap_or_else(|| "未知客户".to_string())
        );

        match self
            .create_auto_voucher(
                "receivable",
                &description,
                amount,
                "sales_order",
                payload.order_id,
                payload.approved_by.as_deref(),
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await
        {
            Ok(Some(voucher_id)) => {
                tracing::info!("[finance] 应收凭证生成成功: voucher_id={}", voucher_id);
            }
            Ok(None) => {
                tracing::info!(
                    "[finance] 应收凭证已存在（幂等跳过）, order_id={}",
                    payload.order_id
                );
            }
            Err(e) => {
                tracing::error!("[finance] 应收凭证生成失败: {}", e);
            }
        }

        Ok(())
    }

    async fn handle_purchase_order_approved(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 采购订单审批事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PurchaseOrderApprovedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购订单审批事件 payload 失败: {}", e))?;

        tracing::info!(
            "[finance] 采购订单审批通过: {} ({})，供应商: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.supplier_name,
            payload.total_amount
        );

        let payable_amount = payload.payable_amount.unwrap_or(0.0);
        if payable_amount > 0.0 {
            self.store_source_amount_snapshot(
                "purchase_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(0.0);
        if amount <= 0.0 {
            tracing::warn!("[finance] 采购订单金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "采购订单 {} 审批通过 - {}",
            payload.order_no,
            payload
                .supplier_name
                .unwrap_or_else(|| "未知供应商".to_string())
        );

        match self
            .create_auto_voucher(
                "payable",
                &description,
                amount,
                "purchase_order",
                payload.order_id,
                payload.approved_by.as_deref(),
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await
        {
            Ok(Some(voucher_id)) => {
                tracing::info!("[finance] 应付凭证生成成功: voucher_id={}", voucher_id);
            }
            Ok(None) => {
                tracing::info!(
                    "[finance] 应付凭证已存在（幂等跳过）, order_id={}",
                    payload.order_id
                );
            }
            Err(e) => {
                tracing::error!("[finance] 应付凭证生成失败: {}", e);
            }
        }

        Ok(())
    }

    async fn handle_payment_received(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 收款事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PaymentReceivedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析收款事件 payload 失败: {}", e))?;

        tracing::info!(
            "[finance] 收款: {} ({})，金额: {}，方式: {:?}",
            payload.payment_no,
            payload.payment_id,
            payload.amount,
            payload.payment_method
        );

        if payload.amount <= 0.0 {
            tracing::warn!("[finance] 收款金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "收款 {} - 金额: {}，方式: {}",
            payload.payment_no,
            payload.amount,
            payload.payment_method.unwrap_or_else(|| "未知".to_string())
        );

        match self
            .create_auto_voucher(
                "receipt",
                &description,
                payload.amount,
                "payment_received",
                payload.payment_id,
                None,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await
        {
            Ok(Some(voucher_id)) => {
                tracing::info!("[finance] 收款凭证生成成功: voucher_id={}", voucher_id);
            }
            Ok(None) => {
                tracing::info!(
                    "[finance] 收款凭证已存在（幂等跳过）, payment_id={}",
                    payload.payment_id
                );
            }
            Err(e) => {
                tracing::error!("[finance] 收款凭证生成失败: {}", e);
            }
        }

        Ok(())
    }

    async fn handle_payment_made(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 付款事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PaymentMadePayload = event
            .parse_payload()
            .map_err(|e| format!("解析付款事件 payload 失败: {}", e))?;

        tracing::info!(
            "[finance] 付款: {} ({})，金额: {}，方式: {:?}",
            payload.payment_no,
            payload.payment_id,
            payload.amount,
            payload.payment_method
        );

        if payload.amount <= 0.0 {
            tracing::warn!("[finance] 付款金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "付款 {} - 金额: {}，方式: {}",
            payload.payment_no,
            payload.amount,
            payload.payment_method.unwrap_or_else(|| "未知".to_string())
        );

        match self
            .create_auto_voucher(
                "payment",
                &description,
                payload.amount,
                "payment_made",
                payload.payment_id,
                None,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await
        {
            Ok(Some(voucher_id)) => {
                tracing::info!("[finance] 付款凭证生成成功: voucher_id={}", voucher_id);
            }
            Ok(None) => {
                tracing::info!(
                    "[finance] 付款凭证已存在（幂等跳过）, payment_id={}",
                    payload.payment_id
                );
            }
            Err(e) => {
                tracing::error!("[finance] 付款凭证生成失败: {}", e);
            }
        }

        Ok(())
    }

    /// 将业务单据的应付金额存入 Finance 本地快照表，替代跨Schema直查 ERP
    async fn store_source_amount_snapshot(
        &self,
        source_type: &str,
        source_id: uuid::Uuid,
        payable_amount: f64,
        tenant_id: uuid::Uuid,
    ) {
        let now = Utc::now();
        let result = sqlx::query(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.source_amount_snapshots
               (source_type, source_id, payable_amount, updated_at, tenant_id)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (source_type, source_id) DO UPDATE
               SET payable_amount = EXCLUDED.payable_amount,
                   updated_at = EXCLUDED.updated_at"#
        ))
        .bind(source_type)
        .bind(source_id)
        .bind(payable_amount)
        .bind(now)
        .bind(tenant_id)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::debug!(
                    "[finance] 本地金额快照已存储 - source_type={}, source_id={}, payable_amount={}",
                    source_type, source_id, payable_amount
                );
            }
            Err(e) => {
                tracing::warn!(
                    "[finance] 本地金额快照存储失败（graceful）- source_type={}, source_id={}: {}，首次使用时将从ERP补拉",
                    source_type, source_id, e
                );
            }
        }
    }

    /// PurchaseOrderCreated → 采购订单创建时，存快照 + 生成应付凭证
    async fn handle_purchase_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 采购订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PurchaseOrderCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购订单创建事件 payload 失败: {}", e))?;

        let payable_amount = payload.payable_amount.unwrap_or(0.0);
        if payable_amount > 0.0 {
            self.store_source_amount_snapshot(
                "purchase_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(0.0);
        if amount <= 0.0 {
            tracing::warn!("[finance] 采购订单金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "采购订单 {} 创建 - {}",
            payload.order_no,
            payload
                .supplier_name
                .unwrap_or_else(|| "未知供应商".to_string())
        );

        match self
            .create_auto_voucher(
                "payable_draft",
                &description,
                amount,
                "purchase_order_created",
                payload.order_id,
                payload.created_by.as_deref(),
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await
        {
            Ok(Some(voucher_id)) => {
                tracing::info!("[finance] 应付凭证草稿生成成功: voucher_id={}", voucher_id);
            }
            Ok(None) => {
                tracing::info!(
                    "[finance] 应付凭证草稿已存在（幂等跳过）, order_id={}",
                    payload.order_id
                );
            }
            Err(e) => {
                tracing::error!("[finance] 应付凭证草稿生成失败: {}", e);
            }
        }

        Ok(())
    }

    // ========================================================
    // 结算中心快照处理器（订阅 ERP / PM 事件，存本地快照）
    // ========================================================

    async fn handle_reconciliation_created(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析对账单创建事件 payload 失败: {}", e))?;
        tracing::info!(
            "[finance] 收到 ReconciliationCreated 事件 - recon_id={}, recon_name={}",
            payload.id,
            payload.recon_name
        );
        let _ = self.store_reconciliation_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_reconciliation_updated(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationUpdatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析对账单更新事件 payload 失败: {}", e))?;
        tracing::info!(
            "[finance] 收到 ReconciliationUpdated 事件 - recon_id={}, status={}",
            payload.id,
            payload.status
        );
        let _ = self.update_reconciliation_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_reconciliation_approved(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationApprovedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析对账单审批事件 payload 失败: {}", e))?;
        tracing::info!(
            "[finance] 收到 ReconciliationApproved 事件 - recon_id={}, approved_by={}",
            payload.id,
            payload.approved_by
        );
        let _ = self.approve_reconciliation_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_settlement_created(&self, event: Event) -> HandlerResult {
        let payload: SettlementCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析结算单创建事件 payload 失败: {}", e))?;
        tracing::info!(
            "[finance] 收到 SettlementCreated 事件 - settlement_id={}, settlement_no={}",
            payload.id,
            payload.settlement_no
        );
        let _ = self.store_settlement_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_settlement_approved(&self, event: Event) -> HandlerResult {
        let payload: SettlementApprovedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析结算单审批事件 payload 失败: {}", e))?;
        tracing::info!(
            "[finance] 收到 SettlementApproved 事件 - settlement_id={}, approved_by={}",
            payload.id,
            payload.approved_by
        );
        let _ = self.approve_settlement_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_settlement_rejected(&self, event: Event) -> HandlerResult {
        let payload: SettlementRejectedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析结算单拒绝事件 payload 失败: {}", e))?;
        tracing::info!(
            "[finance] 收到 SettlementRejected 事件 - settlement_id={}, rejected_by={}",
            payload.id,
            payload.rejected_by
        );
        let _ = self.reject_settlement_snapshot(&payload).await;
        Ok(())
    }

    // ========================================================
    // 快照存储方法
    // ========================================================

    async fn store_reconciliation_snapshot(
        &self,
        payload: &ReconciliationCreatedPayload,
    ) -> Result<(), String> {
        let now = Utc::now();
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.reconciliation_snapshots
               (id, tenant_id, recon_code, recon_name, recon_type, status, period,
                entity_id, entity_type, description, created_by, synced_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $12)
               ON CONFLICT (id) DO UPDATE SET
                   recon_code = EXCLUDED.recon_code,
                   recon_name = EXCLUDED.recon_name,
                   recon_type = EXCLUDED.recon_type,
                   status = EXCLUDED.status,
                   period = EXCLUDED.period,
                   entity_id = EXCLUDED.entity_id,
                   entity_type = EXCLUDED.entity_type,
                   description = EXCLUDED.description,
                   synced_at = EXCLUDED.synced_at,
                   updated_at = EXCLUDED.updated_at"#
        ))
        .bind(payload.id)
        .bind(payload.tenant_id)
        .bind(&payload.recon_code)
        .bind(&payload.recon_name)
        .bind(&payload.recon_type)
        .bind(&payload.status)
        .bind(&payload.period)
        .bind(payload.entity_id)
        .bind(&payload.entity_type)
        .bind(&payload.description)
        .bind(&payload.created_by)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("存储对账快照失败: {}", e))?;
        Ok(())
    }

    async fn update_reconciliation_snapshot(
        &self,
        payload: &ReconciliationUpdatedPayload,
    ) -> Result<(), String> {
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.reconciliation_snapshots
               SET status = $1,
                   total_debit = $2,
                   total_credit = $3,
                   difference = $4,
                   matched_count = $5,
                   unmatched_count = $6,
                   updated_at = NOW(),
                   synced_at = NOW()
               WHERE id = $7"#
        ))
        .bind(&payload.status)
        .bind(payload.total_debit)
        .bind(payload.total_credit)
        .bind(payload.difference)
        .bind(payload.matched_count)
        .bind(payload.unmatched_count)
        .bind(payload.id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("更新对账快照失败: {}", e))?;
        Ok(())
    }

    async fn approve_reconciliation_snapshot(
        &self,
        payload: &ReconciliationApprovedPayload,
    ) -> Result<(), String> {
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.reconciliation_snapshots
               SET status = 'approved',
                   approved_by = $1,
                   approved_at = $2,
                   updated_at = NOW(),
                   synced_at = NOW()
               WHERE id = $3 AND tenant_id = $4"#
        ))
        .bind(&payload.approved_by)
        .bind(payload.approved_at)
        .bind(payload.id)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("审批对账快照失败: {}", e))?;
        Ok(())
    }

    async fn store_settlement_snapshot(
        &self,
        payload: &SettlementCreatedPayload,
    ) -> Result<(), String> {
        let now = Utc::now();
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.settlement_snapshots
               (id, tenant_id, project_id, settlement_no, settlement_type, status,
                amount, settlement_date, remarks, created_by, synced_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $11)
               ON CONFLICT (id) DO UPDATE SET
                   project_id = EXCLUDED.project_id,
                   settlement_no = EXCLUDED.settlement_no,
                   settlement_type = EXCLUDED.settlement_type,
                   status = EXCLUDED.status,
                   amount = EXCLUDED.amount,
                   settlement_date = EXCLUDED.settlement_date,
                   remarks = EXCLUDED.remarks,
                   synced_at = EXCLUDED.synced_at,
                   updated_at = EXCLUDED.updated_at"#
        ))
        .bind(payload.id)
        .bind(payload.tenant_id)
        .bind(payload.project_id)
        .bind(&payload.settlement_no)
        .bind(&payload.settlement_type)
        .bind(&payload.status)
        .bind(payload.amount)
        .bind(payload.settlement_date)
        .bind(&payload.remarks)
        .bind(&payload.created_by)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("存储结算快照失败: {}", e))?;
        Ok(())
    }

    async fn approve_settlement_snapshot(
        &self,
        payload: &SettlementApprovedPayload,
    ) -> Result<(), String> {
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.settlement_snapshots
               SET status = 'approved',
                   approved_by = $1,
                   approved_at = $2,
                   updated_at = NOW(),
                   synced_at = NOW()
               WHERE id = $3 AND tenant_id = $4"#
        ))
        .bind(&payload.approved_by)
        .bind(payload.approved_at)
        .bind(payload.id)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("审批结算快照失败: {}", e))?;
        Ok(())
    }

    async fn reject_settlement_snapshot(
        &self,
        payload: &SettlementRejectedPayload,
    ) -> Result<(), String> {
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.settlement_snapshots
               SET status = 'rejected',
                   updated_at = NOW(),
                   synced_at = NOW()
               WHERE id = $1 AND tenant_id = $2"#
        ))
        .bind(payload.id)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("拒绝结算快照失败: {}", e))?;
        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = FinanceEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!(
        "[finance] 启动事件订阅者，注册 12 类业务事件 handler（销售/采购/收付款+对账/结算快照）"
    );
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[finance] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
