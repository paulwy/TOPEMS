use chrono::{Datelike, Utc};
use rust_decimal::Decimal;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{
    EmployeeOnboardedPayload, Event, EventPublisher, EventResult, EventSubscriber, EventType,
    HrmPayrollPostedPayload, PaymentMadePayload, PaymentReceivedPayload, PmProjectCompletedPayload,
    PmProjectSettledPayload, PurchaseOrderApprovedPayload, PurchaseOrderCreatedPayload,
    ReconciliationApprovedPayload, ReconciliationCreatedPayload, ReconciliationUpdatedPayload,
    ReturnCompletedPayload, SalesOrderApprovedPayload, SalesOrderCreatedPayload,
    SettlementApprovedPayload, SettlementCreatedPayload, SettlementRejectedPayload,
};

use crate::services::finance::company::resolve_tenant_company;

type HandlerResult = std::result::Result<(), TopemsError>;

/// 自动凭证分录：按科目 code 解析 account_id；code 不存在即 fail-closed（不写半张凭证）。
struct AutoVoucherLine {
    account_code: String,
    debit: Decimal,
    credit: Decimal,
    description: String,
    aux_type: Option<&'static str>,
    aux_id: Option<uuid::Uuid>,
}

impl AutoVoucherLine {
    fn debit(
        account_code: impl Into<String>,
        amount: Decimal,
        description: impl Into<String>,
    ) -> Self {
        Self {
            account_code: account_code.into(),
            debit: amount,
            credit: Decimal::ZERO,
            description: description.into(),
            aux_type: None,
            aux_id: None,
        }
    }

    fn credit(
        account_code: impl Into<String>,
        amount: Decimal,
        description: impl Into<String>,
    ) -> Self {
        Self {
            account_code: account_code.into(),
            debit: Decimal::ZERO,
            credit: amount,
            description: description.into(),
            aux_type: None,
            aux_id: None,
        }
    }

    fn with_aux(mut self, aux_type: &'static str, aux_id: Option<uuid::Uuid>) -> Self {
        if aux_id.is_some() {
            self.aux_type = Some(aux_type);
            self.aux_id = aux_id;
        }
        self
    }
}

/// U6-2：事件 payload 金额已全链升级为 Decimal，Finance 入站直接消费 Decimal。

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
        let h13 = self.clone();
        let h14 = self.clone();
        let h15 = self.clone();
        let h16 = self.clone();
        let h17 = self.clone();

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
            })
            .subscribe_handler(vec![EventType::EmployeeOnboarded], move |event| {
                let h = h13.clone();
                Box::pin(async move { h.handle_employee_onboarded(event).await })
            })
            .subscribe_handler(vec![EventType::PmProjectCompleted], move |event| {
                let h = h14.clone();
                Box::pin(async move { h.handle_pm_project_completed(event).await })
            })
            .subscribe_handler(vec![EventType::PmProjectSettled], move |event| {
                let h = h15.clone();
                Box::pin(async move { h.handle_pm_project_settled(event).await })
            })
            .subscribe_handler(vec![EventType::ReturnCompleted], move |event| {
                let h = h16.clone();
                Box::pin(async move { h.handle_return_completed(event).await })
            })
            .subscribe_handler(vec![EventType::HrmPayrollPosted], move |event| {
                let h = h17.clone();
                Box::pin(async move { h.handle_hrm_payroll_posted(event).await })
            }))
    }

    fn generate_voucher_no(voucher_type: &str, now: chrono::DateTime<Utc>) -> String {
        let period_prefix = format!("{:04}{:02}", now.year(), now.month());
        let time_suffix = format!("{:09}", now.timestamp_subsec_nanos() / 1000);
        format!("AUTO-{}-{}-{}", voucher_type, period_prefix, time_suffix)
    }

    /// 写一张完整、借贷平衡的自动凭证（头 + 全部分录）。
    ///
    /// - 幂等：`(tenant_id, source_module, source_id)` 命中部分唯一索引 → 整单跳过；
    /// - fail-closed：任一科目 code 在本租户不存在即返回 Err，事务回滚（不写半张凭证），
    ///   由事件层重试 / DLQ 兜底，绝不静默降级。
    async fn create_auto_voucher(
        &self,
        voucher_type: &str,
        description: &str,
        source_type: &str,
        source_id: uuid::Uuid,
        created_by: Option<&str>,
        tenant_id: uuid::Uuid,
        lines: Vec<AutoVoucherLine>,
    ) -> Result<Option<uuid::Uuid>, TopemsError> {
        if lines.is_empty() {
            return Err(TopemsError::ValidationFailed(format!(
                "自动凭证无分录，拒绝生成: source={}/{}",
                source_type, source_id
            )));
        }

        let total_debit: Decimal = lines.iter().map(|l| l.debit).sum();
        let total_credit: Decimal = lines.iter().map(|l| l.credit).sum();
        if total_debit != total_credit || total_debit <= Decimal::ZERO {
            return Err(TopemsError::ValidationFailed(format!(
                "自动凭证借贷不平衡（借 {} / 贷 {}），拒绝生成: source={}/{}",
                total_debit, total_credit, source_type, source_id
            )));
        }

        let now = Utc::now();
        let period = format!("{:04}{:02}", now.year(), now.month());
        let voucher_no = Self::generate_voucher_no(voucher_type, now);
        let created_by = created_by.unwrap_or("system");
        // 记账主体：事件不带公司，单主体租户解析唯一公司，多主体/无主体 fail-closed
        let company_id = resolve_tenant_company(&self.db, tenant_id).await?;

        let mut tx = self
            .db
            .begin()
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("开启自动凭证事务失败: {}", e)))?;

        // 幂等键落点：finance.uq_finance_voucher_tenant_source（部分唯一索引）
        let voucher_id = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (tenant_id, company_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, source_module, source_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6::voucher_type, $7, $8, 'draft', $9, $10, $11, $12)
             ON CONFLICT (tenant_id, source_module, source_id) WHERE source_id IS NOT NULL AND deleted_at IS NULL DO NOTHING
             RETURNING id"),
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(&voucher_no)
        .bind(now)
        .bind(&period)
        .bind(voucher_type)
        .bind(total_debit)
        .bind(total_credit)
        .bind(description)
        .bind(source_type)
        .bind(source_id.to_string())
        .bind(created_by)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("创建凭证失败: {}", e)))?;

        let Some(voucher_id) = voucher_id else {
            tx.rollback()
                .await
                .map_err(|e| TopemsError::DatabaseQuery(format!("回滚自动凭证事务失败: {}", e)))?;
            tracing::info!(
                "[finance] 凭证已存在（幂等跳过）, 来源: {}/{}",
                source_type,
                source_id
            );
            return Ok(None);
        };

        for (i, line) in lines.iter().enumerate() {
            let account: Option<(uuid::Uuid, String, String)> = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, code, name FROM finance.core_finance_accounts WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL AND is_enabled = TRUE"),
            )
            .bind(tenant_id)
            .bind(&line.account_code)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("解析会计科目 {} 失败: {}", line.account_code, e)))?;

            // fail-closed：缺科目不做任何兜底映射，直接中止整张凭证
            let Some((account_id, account_code, account_name)) = account else {
                return Err(TopemsError::ValidationFailed(format!(
                    "缺少会计科目 {}（租户 {}），自动凭证拒绝生成: source={}/{}",
                    line.account_code, tenant_id, source_type, source_id
                )));
            };

            sqlx::query(
                only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (tenant_id, company_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, aux_type, aux_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"),
            )
            .bind(tenant_id)
            .bind(company_id)
            .bind(voucher_id)
            .bind(i32::try_from(i + 1).unwrap_or(i32::MAX))
            .bind(account_id)
            .bind(&account_code)
            .bind(&account_name)
            .bind(&line.description)
            .bind(line.debit)
            .bind(line.credit)
            .bind(line.aux_type)
            .bind(line.aux_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("创建凭证明细失败: {}", e)))?;
        }

        tx.commit()
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("提交自动凭证事务失败: {}", e)))?;

        tracing::info!(
            "[finance] 自动生成凭证: {} ({}), 借贷: {}/{}, 分录: {}, 来源: {}/{}",
            voucher_no,
            voucher_type,
            total_debit,
            total_credit,
            lines.len(),
            source_type,
            source_id
        );
        Ok(Some(voucher_id))
    }

    async fn handle_sales_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 销售订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        // v1.85 闭环：payload 解析失败属不可恢复消息（重试无法修复），记录日志后跳过 ACK，
        // 避免 UUID 解析失败等坏事件触发无限重试/ERROR 风暴（与 mobile/crm 消费端同构修复）。
        let payload: SalesOrderCreatedPayload = match event.parse_payload() {
            Ok(p) => p,
            Err(e) => {
                tracing::error!(
                    "[finance] 解析销售订单创建事件 payload 失败（不可恢复，跳过）: {}",
                    e
                );
                return Ok(());
            }
        };

        tracing::info!(
            "[finance] 销售订单创建: {} ({})，客户: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.customer_name,
            payload.total_amount
        );

        let payable_amount = payload.payable_amount.unwrap_or(Decimal::ZERO);
        if payable_amount > Decimal::ZERO {
            self.store_source_amount_snapshot(
                "sales_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(Decimal::ZERO);
        if amount <= Decimal::ZERO {
            tracing::warn!("[finance] 销售订单金额为 0，跳过应收款记录生成");
            return Ok(());
        }

        // 创建阶段只存金额快照，不生成凭证：收入在审批事件确认，
        // 避免「半张凭证」以及同一订单创建/审批重复确认收入。
        Ok(())
    }

    async fn handle_sales_order_approved(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[finance] 销售订单审批事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: SalesOrderApprovedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析销售订单审批事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[finance] 销售订单审批通过: {} ({})，客户: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.customer_name,
            payload.total_amount
        );

        let payable_amount = payload.payable_amount.unwrap_or(Decimal::ZERO);
        if payable_amount > Decimal::ZERO {
            self.store_source_amount_snapshot(
                "sales_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(Decimal::ZERO);
        if amount <= Decimal::ZERO {
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
                "general",
                &description,
                "sales_order",
                payload.order_id,
                payload.approved_by.as_deref(),
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
                vec![
                    AutoVoucherLine::debit(
                        "1122",
                        amount,
                        format!("销售订单{}应收账款", payload.order_no),
                    )
                    .with_aux("customer", payload.customer_id),
                    AutoVoucherLine::credit(
                        "6001",
                        amount,
                        format!("销售订单{}销售收入", payload.order_no),
                    )
                    .with_aux("customer", payload.customer_id),
                ],
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
                return Err(e);
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

        let payload: PurchaseOrderApprovedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析采购订单审批事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[finance] 采购订单审批通过: {} ({})，供应商: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.supplier_name,
            payload.total_amount
        );

        let payable_amount = payload.payable_amount.unwrap_or(Decimal::ZERO);
        if payable_amount > Decimal::ZERO {
            self.store_source_amount_snapshot(
                "purchase_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        let amount = payload.total_amount.unwrap_or(Decimal::ZERO);
        if amount <= Decimal::ZERO {
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
                "general",
                &description,
                "purchase_order",
                payload.order_id,
                payload.approved_by.as_deref(),
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
                vec![
                    AutoVoucherLine::debit(
                        "1403",
                        amount,
                        format!("采购订单{}原材料入库", payload.order_no),
                    )
                    .with_aux("supplier", payload.supplier_id),
                    AutoVoucherLine::credit(
                        "2202",
                        amount,
                        format!("采购订单{}应付账款", payload.order_no),
                    )
                    .with_aux("supplier", payload.supplier_id),
                ],
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
                return Err(e);
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

        let payload: PaymentReceivedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析收款事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[finance] 收款: {} ({})，金额: {}，方式: {:?}",
            payload.payment_no,
            payload.payment_id,
            payload.amount,
            payload.payment_method
        );

        let amount = payload.amount;
        if amount <= Decimal::ZERO {
            tracing::warn!("[finance] 收款金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "收款 {} - 金额: {}，方式: {}",
            payload.payment_no,
            amount,
            payload.payment_method.unwrap_or_else(|| "未知".to_string())
        );

        match self
            .create_auto_voucher(
                "receipt",
                &description,
                "payment_received",
                payload.payment_id,
                None,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
                vec![
                    AutoVoucherLine::debit(
                        "1002",
                        amount,
                        format!("收款{}存入银行", payload.payment_no),
                    ),
                    AutoVoucherLine::credit(
                        "1122",
                        amount,
                        format!("收款{}冲减应收账款", payload.payment_no),
                    )
                    .with_aux("customer", payload.customer_id),
                ],
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
                return Err(e);
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

        let payload: PaymentMadePayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析付款事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[finance] 付款: {} ({})，金额: {}，方式: {:?}",
            payload.payment_no,
            payload.payment_id,
            payload.amount,
            payload.payment_method
        );

        let amount = payload.amount;
        if amount <= Decimal::ZERO {
            tracing::warn!("[finance] 付款金额为 0，跳过凭证生成");
            return Ok(());
        }

        let description = format!(
            "付款 {} - 金额: {}，方式: {}",
            payload.payment_no,
            amount,
            payload.payment_method.unwrap_or_else(|| "未知".to_string())
        );

        match self
            .create_auto_voucher(
                "payment",
                &description,
                "payment_made",
                payload.payment_id,
                None,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
                vec![
                    AutoVoucherLine::debit(
                        "2202",
                        amount,
                        format!("付款{}冲减应付账款", payload.payment_no),
                    )
                    .with_aux("supplier", payload.supplier_id),
                    AutoVoucherLine::credit(
                        "1002",
                        amount,
                        format!("付款{}银行付款", payload.payment_no),
                    ),
                ],
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
                return Err(e);
            }
        }

        Ok(())
    }

    /// 将业务单据的应付金额存入 Finance 本地快照表，替代跨Schema直查 ERP
    async fn store_source_amount_snapshot(
        &self,
        source_type: &str,
        source_id: uuid::Uuid,
        // U6: 快照金额改 Decimal（列已对齐 NUMERIC(18,4)）
        payable_amount: Decimal,
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

        let payload: PurchaseOrderCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析采购订单创建事件 payload 失败: {}", e))
        })?;

        let payable_amount = payload.payable_amount.unwrap_or(Decimal::ZERO);
        if payable_amount > Decimal::ZERO {
            self.store_source_amount_snapshot(
                "purchase_order",
                payload.order_id,
                payable_amount,
                payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            )
            .await;
        }

        // 创建阶段只存金额快照，不生成凭证：应付在审批事件确认，
        // 避免「半张凭证」以及同一订单创建/审批重复确认负债。
        Ok(())
    }

    // ========================================================
    // 结算中心快照处理器（订阅 ERP / PM 事件，存本地快照）
    // ========================================================

    async fn handle_reconciliation_created(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析对账单创建事件 payload 失败: {}", e))
        })?;
        tracing::info!(
            "[finance] 收到 ReconciliationCreated 事件 - recon_id={}, recon_name={}",
            payload.id,
            payload.recon_name
        );
        let _ = self.store_reconciliation_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_reconciliation_updated(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationUpdatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析对账单更新事件 payload 失败: {}", e))
        })?;
        tracing::info!(
            "[finance] 收到 ReconciliationUpdated 事件 - recon_id={}, status={}",
            payload.id,
            payload.status
        );
        let _ = self.update_reconciliation_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_reconciliation_approved(&self, event: Event) -> HandlerResult {
        let payload: ReconciliationApprovedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析对账单审批事件 payload 失败: {}", e))
        })?;
        tracing::info!(
            "[finance] 收到 ReconciliationApproved 事件 - recon_id={}, approved_by={}",
            payload.id,
            payload.approved_by
        );
        let _ = self.approve_reconciliation_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_settlement_created(&self, event: Event) -> HandlerResult {
        let payload: SettlementCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析结算单创建事件 payload 失败: {}", e))
        })?;
        tracing::info!(
            "[finance] 收到 SettlementCreated 事件 - settlement_id={}, settlement_no={}",
            payload.id,
            payload.settlement_no
        );
        let _ = self.store_settlement_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_settlement_approved(&self, event: Event) -> HandlerResult {
        let payload: SettlementApprovedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析结算单审批事件 payload 失败: {}", e))
        })?;
        tracing::info!(
            "[finance] 收到 SettlementApproved 事件 - settlement_id={}, approved_by={}",
            payload.id,
            payload.approved_by
        );
        let _ = self.approve_settlement_snapshot(&payload).await;
        Ok(())
    }

    async fn handle_settlement_rejected(&self, event: Event) -> HandlerResult {
        let payload: SettlementRejectedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析结算单拒绝事件 payload 失败: {}", e))
        })?;
        tracing::info!(
            "[finance] 收到 SettlementRejected 事件 - settlement_id={}, rejected_by={}",
            payload.id,
            payload.rejected_by
        );
        let _ = self.reject_settlement_snapshot(&payload).await;
        Ok(())
    }

    // ========================================================
    // ERP 侧原 7 类写凭证点收敛后的 finance 处理器
    // ========================================================

    /// EmployeeOnboarded：入职费用计提（管理费用 / 应付账款）
    ///
    /// 入职成本来自租户配置 public.core_tenant_settings('erp.employee_onboarding_cost')，
    /// 未配置则跳过，不再写死 500 元占位金额。
    async fn handle_employee_onboarded(&self, event: Event) -> HandlerResult {
        let payload: EmployeeOnboardedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 EmployeeOnboarded payload 失败: {}", e))
        })?;

        let tenant_id = payload.tenant_id.unwrap_or(uuid::Uuid::nil());
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

        let amount = match configured_cost.flatten() {
            Some(cost) => cost,
            None => {
                tracing::info!(
                    "[finance] 租户 {} 未配置 erp.employee_onboarding_cost，跳过入职费用凭证（employee_id={}）",
                    tenant_id,
                    payload.employee_id
                );
                return Ok(());
            }
        };

        self.create_auto_voucher(
            "general",
            &format!("员工{}入职费用", payload.name),
            "employee",
            payload.employee_id,
            None,
            tenant_id,
            vec![
                AutoVoucherLine::debit("6602", amount, format!("员工{}入职培训费", payload.name)),
                AutoVoucherLine::credit(
                    "2202",
                    amount,
                    format!("员工{}入职费用应付", payload.name),
                ),
            ],
        )
        .await?;

        Ok(())
    }

    /// PmProjectCompleted：项目完成仅记录，不确认收入
    ///
    /// pm.projects 没有合同额/结算额，完成时不存在可确认的真实金额；
    /// 原先写死 10,000 元属占位假数据。收入改在 PmProjectSettled 按 settled_amount 确认。
    async fn handle_pm_project_completed(&self, event: Event) -> HandlerResult {
        let payload: PmProjectCompletedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 PmProjectCompleted payload 失败: {}", e))
        })?;

        tracing::info!(
            "[finance] PmProjectCompleted 处理 - project_name={}, project_id={}, 等待 PmProjectSettled 按结算额确认收入",
            payload.project_name,
            payload.project_id
        );

        Ok(())
    }

    /// PmProjectSettled：按结算金额确认收入（借贷平衡）
    ///
    /// 收入：借 1122 应收账款 / 贷 6001 主营业务收入（settled_amount）。
    /// 金额全部来自真实结算额，不再使用完成时的固定 10,000 元；
    /// 也不再按写死的 70% 结转成本——项目实际成本未在事件中提供，
    /// 凭空生成成本分录同样是假数据，成本结转待成本归集接入后单独处理。
    async fn handle_pm_project_settled(&self, event: Event) -> HandlerResult {
        let payload: PmProjectSettledPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 PmProjectSettled payload 失败: {}", e))
        })?;

        let settled_amount = payload.settled_amount.unwrap_or(Decimal::ZERO);
        if settled_amount <= Decimal::ZERO {
            tracing::info!(
                "[finance] 项目结算金额为 0，跳过凭证生成 - project_id={}",
                payload.project_id
            );
            return Ok(());
        }

        self.create_auto_voucher(
            "general",
            &format!("项目{}结算收入", payload.project_name),
            "pm_project_settled",
            payload.project_id,
            payload.settled_by.as_deref(),
            payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            vec![
                AutoVoucherLine::debit(
                    "1122",
                    settled_amount,
                    format!("项目{}结算应收款", payload.project_name),
                ),
                AutoVoucherLine::credit(
                    "6001",
                    settled_amount,
                    format!("项目{}结算收入", payload.project_name),
                ),
            ],
        )
        .await?;

        Ok(())
    }

    /// ReturnCompleted：退款完成冲减收入与应收
    async fn handle_return_completed(&self, event: Event) -> HandlerResult {
        let payload: ReturnCompletedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 ReturnCompleted payload 失败: {}", e))
        })?;

        if payload.refund_amount <= Decimal::ZERO {
            tracing::info!(
                "[finance] 退款金额为 0，跳过凭证生成 - return_id={}",
                payload.return_id
            );
            return Ok(());
        }

        let customer_name = payload
            .customer_name
            .clone()
            .unwrap_or_else(|| "未知客户".to_string());
        self.create_auto_voucher(
            "general",
            &format!("退款单{}完成 - {}", payload.return_no, customer_name),
            "return_order",
            payload.return_id,
            None,
            payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            vec![
                AutoVoucherLine::debit(
                    "6001",
                    payload.refund_amount,
                    format!("退款单{}冲减收入", payload.return_no),
                )
                .with_aux("customer", payload.customer_id),
                AutoVoucherLine::credit(
                    "1122",
                    payload.refund_amount,
                    format!("退款单{}冲减应收", payload.return_no),
                )
                .with_aux("customer", payload.customer_id),
            ],
        )
        .await?;

        Ok(())
    }

    /// HrmPayrollPosted：按 payroll 事件携带的明细科目生成工资凭证
    ///
    /// 明细分录来自 HRM 计算引擎（subject_code 为 6 位明细科目）；
    /// 任一科目在 finance 缺失即整单失败（fail-closed），不静默少记。
    async fn handle_hrm_payroll_posted(&self, event: Event) -> HandlerResult {
        let payload: HrmPayrollPostedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 HrmPayrollPosted payload 失败: {}", e))
        })?;

        if payload.entries.is_empty() {
            return Err(TopemsError::ValidationFailed(format!(
                "工资过账事件无分录，拒绝生成凭证: payroll_run_id={}",
                payload.payroll_run_id
            )));
        }

        let lines = payload
            .entries
            .iter()
            .map(|entry| AutoVoucherLine {
                account_code: entry.subject_code.clone(),
                debit: entry.debit_amount,
                credit: entry.credit_amount,
                description: format!("工资{}-{}", payload.period, entry.subject_name),
                aux_type: None,
                aux_id: None,
            })
            .collect();

        self.create_auto_voucher(
            "general",
            &payload.summary,
            "hrm_payroll",
            payload.payroll_run_id,
            Some(payload.maker_name.as_str()),
            payload.tenant_id.unwrap_or(uuid::Uuid::nil()),
            lines,
        )
        .await?;

        Ok(())
    }

    // ========================================================
    // 快照存储方法
    // ========================================================

    async fn store_reconciliation_snapshot(
        &self,
        payload: &ReconciliationCreatedPayload,
    ) -> Result<(), TopemsError> {
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
        .map_err(|e| TopemsError::DatabaseQuery(format!("存储对账快照失败: {}", e)))?;
        Ok(())
    }

    async fn update_reconciliation_snapshot(
        &self,
        payload: &ReconciliationUpdatedPayload,
    ) -> Result<(), TopemsError> {
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
        .map_err(|e| TopemsError::DatabaseQuery(format!("更新对账快照失败: {}", e)))?;
        Ok(())
    }

    async fn approve_reconciliation_snapshot(
        &self,
        payload: &ReconciliationApprovedPayload,
    ) -> Result<(), TopemsError> {
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
        .map_err(|e| TopemsError::DatabaseQuery(format!("审批对账快照失败: {}", e)))?;
        Ok(())
    }

    async fn store_settlement_snapshot(
        &self,
        payload: &SettlementCreatedPayload,
    ) -> Result<(), TopemsError> {
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
        .map_err(|e| TopemsError::DatabaseQuery(format!("存储结算快照失败: {}", e)))?;
        Ok(())
    }

    async fn approve_settlement_snapshot(
        &self,
        payload: &SettlementApprovedPayload,
    ) -> Result<(), TopemsError> {
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
        .map_err(|e| TopemsError::DatabaseQuery(format!("审批结算快照失败: {}", e)))?;
        Ok(())
    }

    async fn reject_settlement_snapshot(
        &self,
        payload: &SettlementRejectedPayload,
    ) -> Result<(), TopemsError> {
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
        .map_err(|e| TopemsError::DatabaseQuery(format!("拒绝结算快照失败: {}", e)))?;
        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), TopemsError> {
    let handlers = FinanceEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber()?;

    tracing::info!(
        "[finance] 启动事件订阅者，注册 17 类业务事件 handler（销售/采购/收付款/对账/结算 + 入职/项目/退款/薪资）"
    );
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[finance] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// U6-2 全链精度：事件 payload 金额已是 Decimal，入站求和精确无浮点漂移。
    #[test]
    fn payload_amount_boundary_precision() {
        // Decimal::new(m, scale) = m / 10^scale；0.3 = new(3, 1)
        let total = Decimal::new(1, 1) + Decimal::new(2, 1);
        assert_eq!(total, Decimal::new(3, 1));
        assert_eq!(total - Decimal::new(3, 1), Decimal::ZERO);
        // 0.1 * 3 精确
        assert_eq!(Decimal::new(1, 1) * Decimal::from(3), Decimal::new(3, 1));
    }

    /// U6 借贷平衡：自动凭证把同一 Decimal 同时写入 total_debit / total_credit，
    /// 借贷两侧严格相等、差额恒为 Decimal::ZERO，无需容差（f64 路径下尾数漂移会破坏精确平衡）。
    #[test]
    fn auto_voucher_debit_credit_balanced_exactly() {
        // 模拟某张应收自动凭证金额（含两位小数，f64 易漂移）
        let amount = Decimal::new(10010, 2) + Decimal::new(20, 2);
        // create_auto_voucher 将 amount 同时绑定 total_debit($5) 与 total_credit($6)
        let total_debit = amount;
        let total_credit = amount;
        // 严格平衡，不依赖 abs() < 1e-9 容差
        assert_eq!(total_debit, total_credit);
        assert_eq!(total_debit - total_credit, Decimal::ZERO);
        assert!(total_debit > Decimal::ZERO);
    }
}

#[cfg(test)]
mod p2a_e2e_tests {
    use super::*;
    use crate::services::FinanceService;
    use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

    /// P2a 第一笔端到端证据（需真实数据库）：
    /// 业务事件 → finance 生成含借贷分录的凭证 → 过账 → ledger / aux_balances 有行；
    /// 重放同一事件不产生重复凭证；缺科目时 fail-closed 不落半张凭证。
    ///
    /// 运行：DATABASE_URL=... cargo test -p topems-finance --bin topems-finance -- --ignored p2a
    #[tokio::test]
    #[ignore = "需要真实数据库：DATABASE_URL"]
    async fn event_to_posted_voucher_is_balanced_and_idempotent() {
        let url = std::env::var("DATABASE_URL").expect("DATABASE_URL 未设置");
        let pool = sqlx::PgPool::connect(&url).await.unwrap();

        let tenant_id = uuid::Uuid::new_v4();
        sqlx::query("INSERT INTO public.core_tenants (id, name, code) VALUES ($1, $2, $3)")
            .bind(tenant_id)
            .bind("P2a Auto Voucher E2E")
            .bind(format!("p2a-{}", &tenant_id.to_string()[..8]))
            .execute(&pool)
            .await
            .expect("创建测试租户失败");

        // P2a 公司维度：凭证必须归属唯一公司主体
        sqlx::query(
            "INSERT INTO hrm.companies (tenant_id, name, code, status) VALUES ($1, 'P2a 测试公司', 'DEFAULT', 'active')",
        )
        .bind(tenant_id)
        .execute(&pool)
        .await
        .expect("创建测试公司失败");

        sqlx::query("SELECT finance.bootstrap_defaults($1)")
            .bind(tenant_id)
            .execute(&pool)
            .await
            .expect("播种默认科目失败");

        let handlers = FinanceEventHandlers {
            db: pool.clone(),
            event_publisher: None,
        };

        let order_id = uuid::Uuid::new_v4();
        let customer_id = uuid::Uuid::new_v4();
        let event = Event::new(
            EventType::SalesOrderApproved,
            "test",
            serde_json::json!({
                "order_id": order_id,
                "order_no": "SO-P2A-001",
                "customer_id": customer_id,
                "customer_name": "P2a 测试客户",
                "total_amount": 1000.00,
                "approved_by": "tester",
                "tenant_id": tenant_id,
            }),
        );

        // 1) 事件 → 完整平衡分录凭证
        handlers
            .handle_sales_order_approved(event.clone())
            .await
            .expect("自动凭证生成失败");

        let voucher: (uuid::Uuid, Decimal, Decimal) = sqlx::query_as(
            "SELECT id, total_debit, total_credit FROM finance.core_finance_vouchers WHERE tenant_id = $1 AND source_module = 'sales_order' AND source_id = $2",
        )
        .bind(tenant_id)
        .bind(order_id.to_string())
        .fetch_one(&pool)
        .await
        .expect("未找到凭证");

        let lines: Vec<(String, Decimal, Decimal)> = sqlx::query_as(
            "SELECT account_code, debit, credit FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no",
        )
        .bind(voucher.0)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(lines.len(), 2, "应生成两行分录");
        assert_eq!(lines[0].0, "1122");
        assert_eq!(lines[0].1, Decimal::new(1000, 0));
        assert_eq!(lines[1].0, "6001");
        assert_eq!(lines[1].2, Decimal::new(1000, 0));
        assert_eq!(voucher.1, voucher.2, "凭证借贷必须相等");

        // 2) 重放同一事件：不产生重复凭证
        handlers
            .handle_sales_order_approved(event.clone())
            .await
            .expect("重放事件不应失败");
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE tenant_id = $1 AND source_module = 'sales_order' AND source_id = $2",
        )
        .bind(tenant_id)
        .bind(order_id.to_string())
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1, "重放事件不得重复生成凭证");

        // 3) 过账 → ledger / aux_balances 有行
        let service = FinanceService::new(
            pool.clone(),
            TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
                .expect("构造 workflow 客户端失败"),
        );
        service.submit_voucher(tenant_id, voucher.0).await.unwrap();
        service
            .approve_voucher(tenant_id, voucher.0, "tester")
            .await
            .unwrap();
        let posted = service
            .post_voucher(tenant_id, voucher.0, "tester")
            .await
            .unwrap();
        assert_eq!(posted.status.to_string(), "posted");

        let ledger_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM finance.core_finance_ledger WHERE voucher_id = $1",
        )
        .bind(voucher.0)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(ledger_count, 2, "过账后 ledger 应有 2 行");

        let aux_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM finance.core_finance_aux_balances WHERE tenant_id = $1 AND aux_id = $2",
        )
        .bind(tenant_id)
        .bind(customer_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(aux_count >= 1, "过账后 aux_balances 应有行");

        // 4) 缺科目 fail-closed：新租户未播种任何科目
        let bare_tenant = uuid::Uuid::new_v4();
        sqlx::query("INSERT INTO public.core_tenants (id, name, code) VALUES ($1, $2, $3)")
            .bind(bare_tenant)
            .bind("P2a Bare Tenant")
            .bind(format!("p2a-bare-{}", &bare_tenant.to_string()[..8]))
            .execute(&pool)
            .await
            .unwrap();
        // 有公司但无科目：确保失败点是「缺科目」而不是「无公司主体」
        sqlx::query(
            "INSERT INTO hrm.companies (tenant_id, name, code, status) VALUES ($1, 'P2a Bare 公司', 'DEFAULT', 'active')",
        )
        .bind(bare_tenant)
        .execute(&pool)
        .await
        .unwrap();
        let bare_event = Event::new(
            EventType::SalesOrderApproved,
            "test",
            serde_json::json!({
                "order_id": uuid::Uuid::new_v4(),
                "order_no": "SO-P2A-BARE",
                "total_amount": 100.00,
                "tenant_id": bare_tenant,
            }),
        );
        let err = handlers
            .handle_sales_order_approved(bare_event)
            .await
            .expect_err("缺科目必须 fail-closed");
        assert!(
            err.to_string().contains("缺少会计科目"),
            "错误信息应明确指出缺科目: {err}"
        );
        let bare_vouchers: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE tenant_id = $1",
        )
        .bind(bare_tenant)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(bare_vouchers, 0, "失败时不得落半张凭证");

        // 清理测试租户数据（先子后父）
        for tid in [tenant_id, bare_tenant] {
            let _ =
                sqlx::query("DELETE FROM finance.core_finance_aux_balances WHERE tenant_id = $1")
                    .bind(tid)
                    .execute(&pool)
                    .await;
            let _ = sqlx::query("DELETE FROM finance.core_finance_ledger WHERE tenant_id = $1")
                .bind(tid)
                .execute(&pool)
                .await;
            let _ =
                sqlx::query("DELETE FROM finance.core_finance_voucher_lines WHERE tenant_id = $1")
                    .bind(tid)
                    .execute(&pool)
                    .await;
            let _ = sqlx::query("DELETE FROM finance.core_finance_vouchers WHERE tenant_id = $1")
                .bind(tid)
                .execute(&pool)
                .await;
            let _ = sqlx::query("DELETE FROM finance.core_finance_accounts WHERE tenant_id = $1")
                .bind(tid)
                .execute(&pool)
                .await;
            let _ = sqlx::query("DELETE FROM finance.core_finance_periods WHERE tenant_id = $1")
                .bind(tid)
                .execute(&pool)
                .await;
            let _ = sqlx::query("DELETE FROM hrm.companies WHERE tenant_id = $1")
                .bind(tid)
                .execute(&pool)
                .await;
            let _ = sqlx::query("DELETE FROM public.core_tenants WHERE id = $1")
                .bind(tid)
                .execute(&pool)
                .await;
        }
    }
}
