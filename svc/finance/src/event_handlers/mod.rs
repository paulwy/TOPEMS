use chrono::{Datelike, Utc};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType, PaymentMadePayload,
    PaymentReceivedPayload, PurchaseOrderApprovedPayload, SalesOrderApprovedPayload,
    SalesOrderCreatedPayload,
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

        Ok(subscriber
            .subscribe_handler(vec![EventType::SalesOrderCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_sales_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::SalesOrderApproved], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_sales_order_approved(event).await })
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
    ) -> Result<Option<uuid::Uuid>, String> {
        let now = Utc::now();
        let period = format!("{:04}{:02}", now.year(), now.month());
        let voucher_no = Self::generate_voucher_no(voucher_type, now);
        let created_by = created_by.unwrap_or("system");

        let voucher_id = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, source_type, source_id, created_by)
             VALUES ('00000000-0000-0000-0000-000000000000', $1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10)
             ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING
             RETURNING id",
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
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = FinanceEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[finance] 启动事件订阅者，注册 5 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[finance] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
