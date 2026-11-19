//! CRM 服务事件订阅处理器
//!
//! V20.1 事件驱动架构落地 - CRM 服务订阅核心业务事件
//!
//! 订阅事件清单：
//! - `AfterSalesTicketCreated` → 自动创建交互记录，关联工单与客户
//! - `OpportunityWon` → 自动创建跟进任务记录
//! - `CustomerCreated` → 触发欢迎邮件（记录日志，邮件发送由通知服务异步处理）

use sqlx::PgPool;
use topems_shared_core::error::TopemsError;
use topems_shared_db::master_data_refs::{MasterDataRefService, UpsertLocalMasterDataRefRequest};
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    AfterSalesTicketCreatedPayload, CustomerCreatedPayload, Event, EventResult, EventSubscriber,
    EventType, MasterDataAction, MasterDataDomain, MasterDataEvent, OpportunityWonPayload,
    PaymentReceivedPayload, SalesOrderCreatedPayload, ShippingOrderRequestedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

/// CRM 事件处理器集合，承载必要的依赖
#[derive(Clone)]
pub struct CrmEventHandlers {
    pub db: PgPool,
}

impl CrmEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// 构建 CRM 服务的事件订阅者，注册所有业务事件 handler
    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("crm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h4 = self.clone();
        let h5 = self.clone();
        let h6 = self.clone();
        let h7 = self.clone();
        let h8 = self.clone();
        let h9 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::AfterSalesTicketCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move {
                    match h.handle_aftersales_ticket_created(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[crm] handle_aftersales_ticket_created 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::OpportunityWon], move |event| {
                let h = h2.clone();
                Box::pin(async move {
                    match h.handle_opportunity_won(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[crm] handle_opportunity_won 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::CustomerCreated], move |event| {
                let h = h3.clone();
                Box::pin(async move {
                    match h.handle_customer_created(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[crm] handle_customer_created 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::ShippingOrderRequested], move |event| {
                let h = h7.clone();
                Box::pin(async move {
                    match h.handle_shipping_order_requested(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[crm] handle_shipping_order_requested 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::PaymentReceived], move |event| {
                let h = h8.clone();
                Box::pin(async move {
                    match h.handle_payment_received(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[crm] handle_payment_received 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_handler(vec![EventType::SalesOrderCreated], move |event| {
                let h = h9.clone();
                Box::pin(async move {
                    match h.handle_sales_order_created(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!("[crm] handle_sales_order_created 失败: {}", e);
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler_employee(move |event| {
                let h = h4.clone();
                Box::pin(async move {
                    match h.handle_master_data_employee_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[crm] handle_master_data_employee_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler_organization(move |event| {
                let h = h5.clone();
                Box::pin(async move {
                    match h.handle_master_data_organization_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[crm] handle_master_data_organization_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            })
            .subscribe_master_data_handler(vec![MasterDataDomain::Supplier], move |event| {
                let h = h6.clone();
                Box::pin(async move {
                    match h.handle_master_data_supplier_changed(event).await {
                        Ok(()) => Ok(()),
                        Err(e) => {
                            tracing::error!(
                                "[crm] handle_master_data_supplier_changed 失败: {}",
                                e
                            );
                            Err(e)
                        }
                    }
                })
            }))
    }

    /// AfterSalesTicketCreated → 自动创建 CRM 交互记录，关联工单与客户
    ///
    /// 使用 graceful fallback：若 DB 操作失败，记录警告并继续，不让事件处理失败。
    async fn handle_aftersales_ticket_created(&self, event: Event) -> HandlerResult {
        let payload: AfterSalesTicketCreatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 AfterSalesTicketCreated payload 失败: {}",
                    e
                ))
            })?;

        tracing::info!(
            "[crm] AfterSalesTicketCreated 处理 - ticket_no={}, title={}, customer_id={:?}, priority={:?}, trace_id={:?}",
            payload.ticket_no,
            payload.title,
            payload.customer_id,
            payload.priority,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let interaction_id = uuid::Uuid::new_v4();
        let interaction_no = format!("INT-TICKET-{}", payload.ticket_no);
        let subject = format!("售后工单 {} - {}", payload.ticket_no, payload.title);
        let content = format!(
            "客户提交售后工单，优先级: {}，由 {} 创建",
            payload.priority.as_deref().unwrap_or("normal"),
            payload.created_by.as_deref().unwrap_or("system")
        );

        // 多租户：org_id 与 tenant_id 均取事件携带的租户维度；无租户（系统事件）落 SQL NULL，
        // 不再硬编码真实租户 ...0001（命中 crm.interactions 的 tenant_id IS NULL 分支）。
        let result = sqlx::query(
            r#"INSERT INTO crm.interactions
               (id, org_id, customer_id, interaction_type, subject, content, status, scheduled_at, created_at, updated_at, tenant_id)
               VALUES ($1, $2, $3, 'aftersales_ticket', $4, $5, 'in_progress', $6, $7, $7, $8)
               ON CONFLICT DO NOTHING"#,
        )
        .bind(interaction_id)
        .bind(payload.tenant_id)
        .bind(payload.customer_id)
        .bind(&subject)
        .bind(&content)
        .bind(now)
        .bind(now)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::info!(
                    "[crm] 已创建售后工单交互记录 - interaction_id={}, interaction_no={}, ticket_no={}, customer_id={:?}",
                    interaction_id,
                    interaction_no,
                    payload.ticket_no,
                    payload.customer_id
                );
            }
            Err(e) => {
                tracing::warn!("[crm] 创建售后工单交互记录失败（graceful fallback）: {}", e);
            }
        }

        Ok(())
    }

    /// OpportunityWon → 自动创建跟进任务记录
    ///
    /// 商机赢单后创建一条跟进交互记录，提醒销售人员继续维护客户关系。
    /// 使用 graceful fallback：若 DB 操作失败，记录警告并继续。
    async fn handle_opportunity_won(&self, event: Event) -> HandlerResult {
        let payload: OpportunityWonPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 OpportunityWon payload 失败: {}", e))
            })?;

        tracing::info!(
            "[crm] OpportunityWon 处理 - opportunity_id={}, opportunity_name={}, customer_id={:?}, amount={:?}, trace_id={:?}",
            payload.opportunity_id,
            payload.opportunity_name,
            payload.customer_id,
            payload.amount,
            event.trace_id
        );

        let now = chrono::Utc::now();
        let interaction_id = uuid::Uuid::new_v4();
        let interaction_no = format!("INT-FOLLOWUP-{}", payload.opportunity_id);
        let subject = format!("商机赢单跟进 - {}", payload.opportunity_name);
        let content = format!(
            "商机 {} 已赢单，金额 {:?}，由 {} 赢单。建议 7 天内安排客户回访，确认交付进度并挖掘二次销售机会。",
            payload.opportunity_name,
            payload.amount,
            payload.won_by.as_deref().unwrap_or("unknown")
        );
        // 跟进日期：商机赢单后 7 天
        let follow_up_date = now + chrono::Duration::days(7);

        // 多租户：org_id 与 tenant_id 均取事件携带的租户维度；无租户（系统事件）落 SQL NULL，
        // 不再硬编码真实租户 ...0001（命中 crm.interactions 的 tenant_id IS NULL 分支）。
        let result = sqlx::query(
            r#"INSERT INTO crm.interactions
               (id, org_id, customer_id, opportunity_id, interaction_type, subject, content, status, scheduled_at, follow_up_required, follow_up_date, created_at, updated_at, tenant_id)
               VALUES ($1, $2, $3, $4, 'follow_up', $5, $6, 'scheduled', $7, TRUE, $8, $9, $9, $10)
               ON CONFLICT DO NOTHING"#,
        )
        .bind(interaction_id)
        .bind(payload.tenant_id)
        .bind(payload.customer_id)
        .bind(payload.opportunity_id)
        .bind(&subject)
        .bind(&content)
        .bind(now)
        .bind(follow_up_date)
        .bind(now)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::info!(
                    "[crm] 已创建商机赢单跟进任务 - interaction_id={}, interaction_no={}, opportunity_id={}, follow_up_date={}",
                    interaction_id,
                    interaction_no,
                    payload.opportunity_id,
                    follow_up_date.format("%Y-%m-%d")
                );
            }
            Err(e) => {
                tracing::warn!("[crm] 创建商机赢单跟进任务失败（graceful fallback）: {}", e);
            }
        }

        // 商机赢单 → 应收账款记录（billing_records 写入方接通）
        // 数据源：OpportunityWon 事件（crm 商机赢单发布），幂等按 invoice_no=OPP-{opportunity_id}
        // K8：crm.billing_records 收紧为 fail-closed，读/写必须落在租户作用域内；
        // 写入失败不再 warn 吞掉（旧语义会让应收静默丢失），一律 Err 上抛交给重试/DLQ。
        let invoice_no = format!("OPP-{}", payload.opportunity_id);
        let due_date = now + chrono::Duration::days(30);
        let billing_amount = payload.amount.unwrap_or(rust_decimal::Decimal::ZERO);

        let Some(tenant_id) = self.resolve_opportunity_tenant(&payload).await? else {
            tracing::warn!(
                target: "crm",
                event = "OpportunityWon",
                opportunity_id = %payload.opportunity_id,
                customer_id = ?payload.customer_id,
                invoice_no = %invoice_no,
                "无法确定租户，跳过应收账款创建（不跨租户兜底）"
            );
            return Ok(());
        };

        let db = Db::new(self.db.clone(), "crm, public, shared");
        let mut scope = db.scope_for_tenant(tenant_id).await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[crm] 打开应收写入租户作用域失败 - tenant_id={}, invoice_no={}: {}",
                tenant_id, invoice_no, e
            ))
        })?;

        let existing_bill: Option<(uuid::Uuid,)> = sqlx::query_as(
            "SELECT id FROM crm.billing_records WHERE invoice_no = $1 AND tenant_id = $2",
        )
        .bind(&invoice_no)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!(
                "[crm] 查询应收账单失败 - tenant_id={}, invoice_no={}: {}",
                tenant_id, invoice_no, e
            ))
        })?;

        if existing_bill.is_none() {
            let items = serde_json::json!({
                "opportunity_id": payload.opportunity_id,
                "opportunity_name": payload.opportunity_name,
                "won_by": payload.won_by,
            });

            sqlx::query(
                r#"INSERT INTO crm.billing_records
                   (tenant_id, customer_id, customer_name, invoice_no, amount,
                    currency, status, due_date, paid_at, items, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, 'CNY', 'pending', $6, NULL, $7, $8, $8)
                   ON CONFLICT DO NOTHING"#,
            )
            .bind(tenant_id)
            .bind(payload.customer_id)
            .bind(payload.customer_name.as_deref())
            .bind(&invoice_no)
            .bind(billing_amount)
            .bind(due_date)
            .bind(items)
            .bind(now)
            .execute(&mut scope)
            .await
            .map_err(|e| {
                TopemsError::DatabaseQuery(format!(
                    "[crm] 创建应收账款失败 - tenant_id={}, invoice_no={}, opportunity_id={}: {}",
                    tenant_id, invoice_no, payload.opportunity_id, e
                ))
            })?;

            tracing::info!(
                "[crm] 已创建应收账款 - tenant_id={}, invoice_no={}, amount={}, due_date={}",
                tenant_id,
                invoice_no,
                billing_amount,
                due_date.format("%Y-%m-%d")
            );
        } else {
            tracing::debug!("[crm] 应收账款已存在（跳过）- invoice_no={}", invoice_no);
        }

        scope.commit().await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[crm] 应收写入作用域提交失败 - tenant_id={}, invoice_no={}: {}",
                tenant_id, invoice_no, e
            ))
        })?;

        Ok(())
    }

    /// 解析 OpportunityWon 要落账的租户：优先事件载荷（新事件已携带 `tenant_id`），
    /// 旧载荷缺失时按 `customer_id` 只读反查一次。
    ///
    /// 反查走显式系统通道：这是为了**建立租户作用域本身**，不是读写业务行；
    /// `crm.customers` 已收紧为 fail-closed，裸池反查在 K8 后必然返回 0 行。
    async fn resolve_opportunity_tenant(
        &self,
        payload: &OpportunityWonPayload,
    ) -> std::result::Result<Option<uuid::Uuid>, TopemsError> {
        if let Some(tenant) = payload.tenant_id.filter(|t| !t.is_nil()) {
            return Ok(Some(tenant));
        }
        let Some(customer_id) = payload.customer_id else {
            return Ok(None);
        };

        let db = Db::new(self.db.clone(), "crm, public, shared");
        // tenant-system: 旧 OpportunityWon 载荷无 tenant_id，仅按主键反查客户归属租户以建立作用域（只读单行）
        let mut scope = db.scope_read_system().await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[crm] 打开客户租户反查作用域失败 - customer_id={}: {}",
                customer_id, e
            ))
        })?;
        let tenant: Option<uuid::Uuid> =
            sqlx::query_scalar("SELECT tenant_id FROM crm.customers WHERE id = $1")
                .bind(customer_id)
                .fetch_optional(&mut scope)
                .await
                .map_err(|e| {
                    TopemsError::DatabaseQuery(format!(
                        "[crm] 反查客户租户失败 - customer_id={}: {}",
                        customer_id, e
                    ))
                })?;
        scope.commit().await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[crm] 客户租户反查作用域提交失败 - customer_id={}: {}",
                customer_id, e
            ))
        })?;

        Ok(tenant.filter(|t| !t.is_nil()))
    }

    /// PaymentReceived → 核销应收账单（billing_records 状态流转）
    ///
    /// finance create_collection 发布 PaymentReceived（2026-09-08 补齐发布方）。
    /// 匹配优先 customer_name（收款单无 customer_id 关联），回退金额匹配最早 pending 账单；
    /// 置 status='paid' + paid_at。
    async fn handle_payment_received(&self, event: Event) -> HandlerResult {
        let payload: PaymentReceivedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 PaymentReceived payload 失败: {}", e))
            })?;

        tracing::info!(
            "[crm] PaymentReceived 处理 - payment_no={}, customer_name={:?}, amount={}, trace_id={:?}",
            payload.payment_no,
            payload.customer_name,
            payload.amount,
            event.trace_id
        );

        if payload.amount <= rust_decimal::Decimal::ZERO {
            return Ok(());
        }

        let now = chrono::Utc::now();

        // 优先 customer_name 匹配；无则金额匹配最早 pending。
        // K8：核销必须在租户作用域内执行（billing_records 已 fail-closed，裸池 UPDATE 会命中 0 行）；
        // 无 tenant_id 时保持「宁缺勿乱」跳过，并带业务键告警，便于定位丢单。
        let Some(tenant_id) = payload.tenant_id.filter(|t| !t.is_nil()) else {
            tracing::warn!(
                target: "crm",
                event = "PaymentReceived",
                payment_no = %payload.payment_no,
                amount = %payload.amount,
                "缺少 tenant_id，跳过应收核销（不跨租户兜底）"
            );
            return Ok(());
        };

        let db = Db::new(self.db.clone(), "crm, public, shared");
        let mut scope = db.scope_for_tenant(tenant_id).await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[crm] 打开应收核销租户作用域失败 - tenant_id={}, payment_no={}: {}",
                tenant_id, payload.payment_no, e
            ))
        })?;

        let result = if let Some(name) = payload.customer_name.as_deref() {
            sqlx::query(
                r#"UPDATE crm.billing_records
                   SET status = 'paid',
                       paid_at = $1,
                       updated_at = $1
                   WHERE customer_name = $2
                     AND tenant_id = $4
                     AND status = 'pending'
                     AND amount = $3
                   RETURNING invoice_no"#,
            )
            .bind(now)
            .bind(name)
            .bind(payload.amount)
            .bind(tenant_id)
            .fetch_optional(&mut scope)
            .await
        } else {
            sqlx::query(
                r#"UPDATE crm.billing_records b
                   SET status = 'paid',
                       paid_at = $1,
                       updated_at = $1
                   FROM (
                       SELECT id FROM crm.billing_records
                       WHERE status = 'pending'
                         AND tenant_id = $3
                         AND amount = $2
                       ORDER BY created_at ASC
                       LIMIT 1
                   ) s
                   WHERE b.id = s.id
                   RETURNING b.invoice_no"#,
            )
            .bind(now)
            .bind(payload.amount)
            .bind(tenant_id)
            .fetch_optional(&mut scope)
            .await
        };

        // 失败不再 warn 吞成 Ok：核销是幂等 UPDATE，瞬态故障走重试，永久失败进 DLQ。
        let matched = result.map_err(|e| {
            TopemsError::DatabaseQuery(format!(
                "[crm] 核销应收账单失败 - tenant_id={}, payment_no={}, customer_name={:?}, amount={}: {}",
                tenant_id, payload.payment_no, payload.customer_name, payload.amount, e
            ))
        })?;

        scope.commit().await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "[crm] 应收核销作用域提交失败 - tenant_id={}, payment_no={}: {}",
                tenant_id, payload.payment_no, e
            ))
        })?;

        match matched {
            Some(row) => {
                let invoice_no: String = sqlx::Row::get(&row, "invoice_no");
                tracing::info!(
                    "[crm] 应收账单已核销 - tenant_id={}, invoice_no={}, amount={}, payment_no={}",
                    tenant_id,
                    invoice_no,
                    payload.amount,
                    payload.payment_no
                );
            }
            None => {
                tracing::info!(
                    "[crm] 无匹配应收账单（跳过）- tenant_id={}, payment_no={}, amount={}",
                    tenant_id,
                    payload.payment_no,
                    payload.amount
                );
            }
        }

        Ok(())
    }

    /// CustomerCreated → 触发欢迎邮件
    ///
    /// 客户创建后记录欢迎邮件触发日志，实际邮件发送由通知服务异步处理。
    /// 若客户记录在 DB 中不存在，记录警告并跳过（graceful fallback）。
    async fn handle_customer_created(&self, event: Event) -> HandlerResult {
        let payload: CustomerCreatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 CustomerCreated payload 失败: {}", e))
            })?;

        tracing::info!(
            "[crm] CustomerCreated 处理 - customer_id={}, customer_name={}, email={:?}, source={:?}, trace_id={:?}",
            payload.customer_id,
            payload.customer_name,
            payload.email,
            payload.source,
            event.trace_id
        );

        // 校验客户记录存在（防止事件先于客户落库的情况）
        let customer_exists: Option<(uuid::Uuid,)> =
            sqlx::query_as(r#"SELECT id FROM crm.customers WHERE id = $1"#)
                .bind(payload.customer_id)
                .fetch_optional(&self.db)
                .await
                .map_err(|e| TopemsError::DatabaseQuery(format!("查询客户记录失败: {}", e)))?;

        if customer_exists.is_none() {
            tracing::warn!(
                "[crm] CustomerCreated 未找到客户记录 - customer_id={}（graceful fallback，跳过欢迎邮件触发）",
                payload.customer_id
            );
            return Ok(());
        }

        // 触发欢迎邮件：记录日志表明事件已被消费
        // 真实场景应通过 EventPublisher 发布 SendEmail 事件或调用通知服务 API
        let email_target = payload.email.as_deref().unwrap_or("(no-email)");
        tracing::info!(
            "[crm] 欢迎邮件触发 - customer_id={}, customer_name={}, email={}, source={:?}",
            payload.customer_id,
            payload.customer_name,
            email_target,
            payload.source
        );

        Ok(())
    }

    /// MDM 员工变更事件处理
    ///
    /// 订阅 HRM 员工变更事件，更新 CRM 中的联系人信息
    async fn handle_master_data_employee_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::info!(
            "[crm-mdm] 员工主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
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

    /// MDM 供应商变更事件处理
    ///
    /// 订阅 SCM 供应商变更事件，同步更新 CRM 中的供应商相关信息
    async fn handle_master_data_supplier_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::info!(
            "[crm-mdm] 供应商主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let supplier_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "supplier", supplier_name, status)
            .await?;

        Ok(())
    }

    /// MDM 组织变更事件处理
    ///
    /// 订阅 HRM 部门/公司变更事件，更新 CRM 中的客户所属组织信息
    async fn handle_master_data_organization_changed(
        &self,
        event: MasterDataEvent,
    ) -> HandlerResult {
        tracing::info!(
            "[crm-mdm] 组织主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
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

    /// ShippingOrderRequested → WMS 出库单确认后，在 CRM 本地创建销售订单
    ///
    /// 替代 WMS 直接跨 Schema 写 crm.sales_orders 的方式，
    /// 采用事件驱动解耦，CRM 在本地创建销售订单。
    async fn handle_shipping_order_requested(&self, event: Event) -> HandlerResult {
        let payload: ShippingOrderRequestedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "解析 ShippingOrderRequested payload 失败: {}",
                    e
                ))
            })?;

        tracing::info!(
            "[crm] ShippingOrderRequested 处理 - outbound_order_id={}, shipping_id={}, shipping_order_number={}, customer_id={:?}, total_amount={}, trace_id={:?}",
            payload.outbound_order_id,
            payload.shipping_id,
            payload.shipping_order_number,
            payload.customer_id,
            payload.total_amount,
            event.trace_id
        );

        let now = chrono::Utc::now();

        let existing: Option<(uuid::Uuid,)> =
            sqlx::query_as("SELECT id FROM crm.sales_orders WHERE order_number = $1")
                .bind(&payload.shipping_order_number)
                .fetch_optional(&self.db)
                .await
                .map_err(|e| {
                    TopemsError::DatabaseQuery(format!("查询销售订单是否存在失败: {}", e))
                })?;

        if existing.is_some() {
            tracing::warn!(
                "[crm] 销售订单已存在（跳过）- shipping_order_number={}",
                payload.shipping_order_number
            );
            return Ok(());
        }

        let result = sqlx::query(
            r#"INSERT INTO crm.sales_orders 
               (id, order_number, customer_id, order_date, 
                total_amount, status, created_at, updated_at, tenant_id)
               VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)
               ON CONFLICT (order_number) DO NOTHING"#,
        )
        .bind(payload.shipping_id)
        .bind(&payload.shipping_order_number)
        .bind(payload.customer_id)
        .bind(payload.order_date)
        .bind(payload.total_amount)
        .bind(now)
        .bind(now)
        .bind(payload.tenant_id)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => {
                tracing::info!(
                    "[crm] 销售订单已创建 - shipping_id={}, shipping_order_number={}, customer_id={:?}, total_amount={}",
                    payload.shipping_id,
                    payload.shipping_order_number,
                    payload.customer_id,
                    payload.total_amount
                );
            }
            Err(e) => {
                tracing::warn!(
                    "[crm] 创建销售订单失败（graceful fallback）- shipping_order_number={}: {}",
                    payload.shipping_order_number,
                    e
                );
            }
        }

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

        // V284: 复用 shared-db MasterDataRefService（消除 crm_master_data_refs 内联 SQL）
        let svc = MasterDataRefService::with_table(
            Db::new(self.db.clone(), "crm, public, shared"),
            "crm_master_data_refs",
        );
        let req = UpsertLocalMasterDataRefRequest {
            master_data_id: event.master_data_id.clone(),
            tenant_id: event.tenant_id,
            domain: domain_str.clone(),
            code: event.code.clone(),
            name: name.to_string(),
            status: status.to_string(),
            source_service: event.source_service.clone(),
            local_entity_type: local_entity_type.to_string(),
            payload_snapshot: event.payload.clone(),
        };

        // R-7b：写失败不再 warn 吞成 Ok（旧语义下 Err 被包成 Ok 立即 ACK，失败完全不可见）。
        // ref 写入是幂等 UPSERT，瞬态故障走 Stream 重试自愈；永久性失败超列 MDM DLQ。
        svc.upsert_local_master_data_ref(&req).await.map_err(|e| {
            format!(
                "[crm-mdm] 本地 ref 同步失败 - master_data_id={}, domain={}, local_entity_type={}: {}",
                event.master_data_id, domain_str, local_entity_type, e
            )
        })?;

        tracing::info!(
            "[crm-mdm] 本地 ref 已同步 - master_data_id={}, domain={}, action={:?}, local_entity_type={}",
            event.master_data_id,
            domain_str,
            event.action,
            local_entity_type
        );

        Ok(())
    }
    /// SalesOrderCreated → 客户订单台账（customer_orders 写入方接通，遗留⑥收口）
    ///
    /// 数据源：erp 创建销售订单发布（svc/erp/src/modules/sales_order.rs），
    /// 幂等按 order_no+tenant_id 去重；order_amount 取应付金额（payable_amount，含税口径），
    /// status 透传 erp 侧真实状态（draft/confirmed/...），tenant_id 优先事件载荷、回退连接上下文。
    async fn handle_sales_order_created(&self, event: Event) -> HandlerResult {
        // v1.85 闭环：payload 解析失败属不可恢复消息（重试无法修复），记录日志后跳过 ACK，
        // 避免 UUID 解析失败等坏事件触发无限重试/ERROR 风暴（与 mobile/finance 消费端同构修复）。
        let payload: SalesOrderCreatedPayload = match serde_json::from_value(event.payload.clone())
        {
            Ok(p) => p,
            Err(e) => {
                tracing::error!(
                    "[crm] 解析 SalesOrderCreated payload 失败（不可恢复，跳过）: {}",
                    e
                );
                return Ok(());
            }
        };

        // 幂等：同租户同单号已同步则跳过
        let order_no = payload.order_no.clone();
        let payload_tenant = payload.tenant_id;
        let existing: Option<(uuid::Uuid,)> = sqlx::query_as(
            "SELECT id FROM crm.customer_orders WHERE order_no = $1 AND tenant_id = $2",
        )
        .bind(&order_no)
        .bind(payload_tenant)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("查询客户订单失败: {}", e)))?;

        if existing.is_some() {
            tracing::debug!("[crm] 客户订单已同步（跳过）- order_no={}", order_no);
            return Ok(());
        }

        // 事件载荷必须携带租户；后台链路无请求 GUC，缺失租户时跳过（与既有行为一致）
        let Some(tenant_id) = payload_tenant else {
            tracing::warn!(
                "[crm] 跳过客户订单同步（无租户上下文）- order_no={}",
                order_no
            );
            return Ok(());
        };

        // 状态透传：erp 侧真实订单状态；缺失时按 CRM 台账语义记 confirmed（进入台账视为已确认）
        let status = payload
            .status
            .clone()
            .unwrap_or_else(|| "confirmed".to_string());
        let order_amount = payload
            .payable_amount
            .unwrap_or_else(|| payload.total_amount.unwrap_or(rust_decimal::Decimal::ZERO));
        let customer_id = payload.customer_id;

        let result = sqlx::query(
            r#"INSERT INTO crm.customer_orders
               (tenant_id, customer_id, order_no, order_date, order_amount, status, created_at, updated_at)
               VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, NOW(), NOW())"#,
        )
        .bind(tenant_id)
        .bind(customer_id)
        .bind(&order_no)
        .bind(order_amount)
        .bind(&status)
        .execute(&self.db)
        .await;

        match result {
            Ok(_) => tracing::info!(
                "[crm] 客户订单台账已同步 - order_no={}, amount={}, status={}",
                order_no,
                order_amount,
                status
            ),
            Err(e) => tracing::warn!("[crm] 客户订单同步失败（graceful fallback）: {}", e),
        }
        Ok(())
    }
}

/// 启动 CRM 服务的事件订阅
pub async fn start_event_subscribers(db: PgPool) -> Result<(), TopemsError> {
    let handlers = CrmEventHandlers::new(db);
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::internal("构建事件订阅者失败", e))?;

    tracing::info!("[crm] 启动事件订阅者，注册 4 个业务事件 handler（含 ShippingOrderRequested）");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[crm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}

#[cfg(test)]
mod rls_scope_tests {
    #![cfg(feature = "db-tests")]
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

    use super::*;
    use sqlx::PgPool;
    use topems_shared_db::scope::Db;
    use uuid::Uuid;

    /// 建 crm.billing_records 并安装 K8 目标策略（fail-closed）。
    async fn setup(pool: &PgPool) {
        sqlx::raw_sql(
            r#"
            CREATE SCHEMA IF NOT EXISTS crm;
            CREATE TABLE crm.billing_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                customer_id UUID,
                customer_name TEXT,
                invoice_no TEXT NOT NULL,
                amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
                currency TEXT NOT NULL DEFAULT 'CNY',
                status TEXT,
                due_date TIMESTAMPTZ,
                paid_at TIMESTAMPTZ,
                items JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
            ALTER TABLE crm.billing_records ENABLE ROW LEVEL SECURITY;
            ALTER TABLE crm.billing_records FORCE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS rls_tenant_isolation ON crm.billing_records;
            CREATE POLICY rls_tenant_isolation ON crm.billing_records
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

    async fn insert_pending_bill(
        pool: &PgPool,
        tenant: Uuid,
        invoice_no: &str,
        customer_name: &str,
        amount: i64,
    ) {
        let mut tx = pool.begin().await.unwrap();
        sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut *tx)
            .await
            .unwrap();
        sqlx::query(
            r#"INSERT INTO crm.billing_records
               (tenant_id, customer_name, invoice_no, amount, status, due_date)
               VALUES ($1, $2, $3, $4, 'pending', NOW() + INTERVAL '7 days')"#,
        )
        .bind(tenant)
        .bind(customer_name)
        .bind(invoice_no)
        .bind(rust_decimal::Decimal::from(amount))
        .execute(&mut *tx)
        .await
        .unwrap();
        tx.commit().await.unwrap();
    }

    /// 以系统通道读取全量账单，用于断言（业务代码不使用该通道写账单）。
    async fn all_bills(pool: &PgPool) -> Vec<(Uuid, String, String)> {
        let mut tx = pool.begin().await.unwrap();
        sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut *tx)
            .await
            .unwrap();
        let rows = sqlx::query_as(
            "SELECT tenant_id, invoice_no, COALESCE(status, '') FROM crm.billing_records",
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();
        tx.rollback().await.unwrap();
        rows
    }

    fn opportunity_payload(opportunity_id: Uuid, tenant: Option<Uuid>) -> serde_json::Value {
        serde_json::json!({
            "opportunity_id": opportunity_id,
            "opportunity_name": "Big Deal",
            "customer_id": null,
            "customer_name": "Acme",
            "amount": 123,
            "won_by": "alice",
            "won_at": null,
            "tenant_id": tenant,
        })
    }

    fn payment_payload(payment_no: &str, tenant: Option<Uuid>, amount: i64) -> serde_json::Value {
        serde_json::json!({
            "payment_id": Uuid::new_v4(),
            "payment_no": payment_no,
            "order_id": null,
            "customer_id": null,
            "customer_name": "Acme",
            "amount": amount,
            "payment_method": null,
            "received_at": null,
            "tenant_id": tenant,
        })
    }

    topems_test_support::sqlx_dsn_guard!();
    #[sqlx::test(migrations = false)]
    async fn opportunity_won_writes_billing_in_tenant_scope(pool: PgPool) {
        setup(&pool).await;
        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();
        let opportunity_id = Uuid::new_v4();
        let handlers = CrmEventHandlers::new(pool.clone());

        handlers
            .handle_opportunity_won(Event::new(
                EventType::OpportunityWon,
                "crm",
                opportunity_payload(opportunity_id, Some(tenant_a)),
            ))
            .await
            .expect("有租户载荷时应写入应收账款");

        let bills = all_bills(&pool).await;
        assert_eq!(bills.len(), 1, "只应落一条应收");
        assert_eq!(bills[0].0, tenant_a, "应收必须落在载荷租户");
        assert_eq!(bills[0].1, format!("OPP-{opportunity_id}"));

        // 异租户作用域读不到该应收
        let db = Db::new(pool.clone(), "crm, public, shared");
        let mut scope = db.scope_for_tenant(tenant_b).await.unwrap();
        let other: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM crm.billing_records")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        scope.rollback().await.unwrap();
        assert_eq!(other, 0, "租户 B 不应看到租户 A 的应收");

        // 裸连接无 GUC：fail-closed
        let bare: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM crm.billing_records")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(bare, 0);
    }

    #[sqlx::test(migrations = false)]
    async fn opportunity_won_without_tenant_does_not_write(pool: PgPool) {
        setup(&pool).await;
        let handlers = CrmEventHandlers::new(pool.clone());

        handlers
            .handle_opportunity_won(Event::new(
                EventType::OpportunityWon,
                "crm",
                opportunity_payload(Uuid::new_v4(), None),
            ))
            .await
            .expect("无法确定租户时应跳过而非报错");

        assert!(
            all_bills(&pool).await.is_empty(),
            "无租户上下文不得落任何应收"
        );

        // nil 租户无法构造作用域：fail-closed
        let err = Db::new(pool.clone(), "crm, public, shared")
            .scope_for_tenant(Uuid::nil())
            .await
            .expect_err("nil 租户必须被作用域守卫拒绝");
        assert!(format!("{err}").contains("RLS context missing"), "{err}");
    }

    #[sqlx::test(migrations = false)]
    async fn opportunity_won_propagates_db_error(pool: PgPool) {
        sqlx::query("CREATE SCHEMA IF NOT EXISTS crm")
            .execute(&pool)
            .await
            .unwrap();
        let handlers = CrmEventHandlers::new(pool.clone());

        let err = handlers
            .handle_opportunity_won(Event::new(
                EventType::OpportunityWon,
                "crm",
                opportunity_payload(Uuid::new_v4(), Some(Uuid::new_v4())),
            ))
            .await
            .expect_err("写应收失败必须上抛，不得 warn 吞掉");
        assert!(format!("{err}").contains("查询应收账单失败"), "{err}");
    }

    #[sqlx::test(migrations = false)]
    async fn payment_received_settles_only_own_tenant(pool: PgPool) {
        setup(&pool).await;
        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();
        insert_pending_bill(&pool, tenant_a, "INV-A", "Acme", 88).await;
        insert_pending_bill(&pool, tenant_b, "INV-B", "Acme", 88).await;
        let handlers = CrmEventHandlers::new(pool.clone());

        handlers
            .handle_payment_received(Event::new(
                EventType::PaymentReceived,
                "finance",
                payment_payload("PAY-A", Some(tenant_a), 88),
            ))
            .await
            .expect("租户 A 核销应成功");

        let bills = all_bills(&pool).await;
        let a = bills.iter().find(|b| b.1 == "INV-A").unwrap();
        let b = bills.iter().find(|b| b.1 == "INV-B").unwrap();
        assert_eq!(a.2, "paid", "租户 A 的应收应被核销");
        assert_eq!(b.2, "pending", "租户 B 的应收不得被跨租户核销");

        // 无租户载荷：跳过，不得改动任何账单
        handlers
            .handle_payment_received(Event::new(
                EventType::PaymentReceived,
                "finance",
                payment_payload("PAY-NO-TENANT", None, 88),
            ))
            .await
            .expect("无租户载荷应跳过");
        let bills = all_bills(&pool).await;
        let b = bills.iter().find(|b| b.1 == "INV-B").unwrap();
        assert_eq!(b.2, "pending", "无租户上下文不得核销");
    }

    #[sqlx::test(migrations = false)]
    async fn payment_received_propagates_db_error(pool: PgPool) {
        sqlx::query("CREATE SCHEMA IF NOT EXISTS crm")
            .execute(&pool)
            .await
            .unwrap();
        let handlers = CrmEventHandlers::new(pool.clone());

        let err = handlers
            .handle_payment_received(Event::new(
                EventType::PaymentReceived,
                "finance",
                payment_payload("PAY-ERR", Some(Uuid::new_v4()), 88),
            ))
            .await
            .expect_err("核销失败必须上抛，不得 warn 吞掉");
        assert!(format!("{err}").contains("核销应收账单失败"), "{err}");
    }
}
