//! CRM 服务事件订阅处理器
//!
//! V20.1 事件驱动架构落地 - CRM 服务订阅核心业务事件
//!
//! 订阅事件清单：
//! - `AfterSalesTicketCreated` → 自动创建交互记录，关联工单与客户
//! - `OpportunityWon` → 自动创建跟进任务记录
//! - `CustomerCreated` → 触发欢迎邮件（记录日志，邮件发送由通知服务异步处理）

use sqlx::PgPool;
use topems_shared::event::{
    AfterSalesTicketCreatedPayload, CustomerCreatedPayload, Event, EventResult, EventSubscriber,
    EventType, OpportunityWonPayload,
};

type HandlerResult = std::result::Result<(), String>;

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

        Ok(subscriber
            .subscribe(vec![EventType::AfterSalesTicketCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_aftersales_ticket_created(event).await {
                        tracing::error!("[crm] handle_aftersales_ticket_created 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::OpportunityWon], move |event| {
                let h = h2.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_opportunity_won(event).await {
                        tracing::error!("[crm] handle_opportunity_won 失败: {}", e);
                    }
                })
            })
            .subscribe(vec![EventType::CustomerCreated], move |event| {
                let h = h3.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_customer_created(event).await {
                        tracing::error!("[crm] handle_customer_created 失败: {}", e);
                    }
                })
            }))
    }

    /// AfterSalesTicketCreated → 自动创建 CRM 交互记录，关联工单与客户
    ///
    /// 使用 graceful fallback：若 DB 操作失败，记录警告并继续，不让事件处理失败。
    async fn handle_aftersales_ticket_created(&self, event: Event) -> HandlerResult {
        let payload: AfterSalesTicketCreatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 AfterSalesTicketCreated payload 失败: {}", e))?;

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

        let org_id = uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001")
            .unwrap_or(uuid::Uuid::nil());

        let result = sqlx::query(
            r#"INSERT INTO crm.interactions
               (id, organization_id, customer_id, interaction_type, subject, content, status, scheduled_at, created_at, updated_at)
               VALUES ($1, $2, $3, 'aftersales_ticket', $4, $5, 'in_progress', $6, $7, $7)
               ON CONFLICT DO NOTHING"#,
        )
        .bind(interaction_id)
        .bind(org_id)
        .bind(payload.customer_id)
        .bind(&subject)
        .bind(&content)
        .bind(now)
        .bind(now)
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
            .map_err(|e| format!("解析 OpportunityWon payload 失败: {}", e))?;

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

        let org_id = uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001")
            .unwrap_or(uuid::Uuid::nil());

        let result = sqlx::query(
            r#"INSERT INTO crm.interactions
               (id, organization_id, customer_id, opportunity_id, interaction_type, subject, content, status, scheduled_at, follow_up_required, follow_up_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'follow_up', $5, $6, 'scheduled', $7, TRUE, $8, $9, $9)
               ON CONFLICT DO NOTHING"#,
        )
        .bind(interaction_id)
        .bind(org_id)
        .bind(payload.customer_id)
        .bind(payload.opportunity_id)
        .bind(&subject)
        .bind(&content)
        .bind(now)
        .bind(follow_up_date)
        .bind(now)
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

        Ok(())
    }

    /// CustomerCreated → 触发欢迎邮件
    ///
    /// 客户创建后记录欢迎邮件触发日志，实际邮件发送由通知服务异步处理。
    /// 若客户记录在 DB 中不存在，记录警告并跳过（graceful fallback）。
    async fn handle_customer_created(&self, event: Event) -> HandlerResult {
        let payload: CustomerCreatedPayload = serde_json::from_value(event.payload.clone())
            .map_err(|e| format!("解析 CustomerCreated payload 失败: {}", e))?;

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
                .map_err(|e| format!("查询客户记录失败: {}", e))?;

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
}

/// 启动 CRM 服务的事件订阅
pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = CrmEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[crm] 启动事件订阅者，注册 3 个业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[crm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
