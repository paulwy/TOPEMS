use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType, PurchaseOrderCreatedPayload,
    ScmPurchasePlanCreatedPayload, ScmSupplierEvaluatedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct SrmEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl SrmEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("srm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::ScmPurchasePlanCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_purchase_plan_created(event).await })
            })
            .subscribe_handler(vec![EventType::ScmSupplierEvaluated], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_supplier_evaluated(event).await })
            })
            .subscribe_handler(vec![EventType::PurchaseOrderCreated], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_purchase_order_created(event).await })
            }))
    }

    async fn handle_purchase_plan_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[srm] 采购计划创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ScmPurchasePlanCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购计划创建事件 payload 失败: {}", e))?;

        tracing::info!(
            "[srm] 采购计划创建: {} ({})，金额: {:?}，周期: {:?}",
            payload.plan_name,
            payload.plan_id,
            payload.total_amount,
            payload.period
        );

        let inquiry_no = format!(
            "RFQ-{}-{}",
            payload.plan_no,
            Utc::now().timestamp_subsec_millis()
        );
        let title = format!("询价单 - {}", payload.plan_name);
        let now = Utc::now();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO plugin_srm_inquiries (inquiry_no, title, description, status, creator, tenant_id, created_at, updated_at)
             VALUES ($1, $2, $3, 'draft', $4, '00000000-0000-0000-0000-000000000000', $5, $6)
             RETURNING id",
        )
        .bind(&inquiry_no)
        .bind(&title)
        .bind(format!("来源于采购计划: {}", payload.plan_no))
        .bind(payload.created_by.unwrap_or_else(|| "system".to_string()))
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(inquiry_id) => {
                tracing::info!("[srm] 联动生成询价单成功: {} ({})", inquiry_no, inquiry_id);
            }
            Err(e) => {
                tracing::error!("[srm] 联动生成询价单失败: {}", e);
            }
        }

        Ok(())
    }

    async fn handle_supplier_evaluated(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[srm] 供应商考评事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ScmSupplierEvaluatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析供应商考评事件 payload 失败: {}", e))?;

        tracing::info!(
            "[srm] 供应商考评: {} ({})，得分: {:?}，等级: {:?}",
            payload.supplier_name,
            payload.supplier_id,
            payload.score,
            payload.grade
        );

        let grade_val = payload.grade.clone().unwrap_or_else(|| "B".to_string());
        let risk_level = match grade_val.as_str() {
            "A" | "优秀" => "low",
            "B" | "良好" => "low",
            "C" | "合格" => "medium",
            "D" | "不合格" => "high",
            _ => "medium",
        };

        let result = sqlx::query(
            "UPDATE plugin_srm_suppliers SET credit_rating = $1, risk_level = $2, updated_at = $3 WHERE id = $4",
        )
        .bind(&grade_val)
        .bind(risk_level)
        .bind(Utc::now())
        .bind(payload.supplier_id)
        .execute(&self.db)
        .await;

        match result {
            Ok(result) => {
                if result.rows_affected() > 0 {
                    tracing::info!(
                        "[srm] 供应商分级更新成功: supplier={}, credit_rating={}, risk_level={}",
                        payload.supplier_name,
                        grade_val,
                        risk_level
                    );
                } else {
                    tracing::warn!(
                        "[srm] 供应商未找到，跳过分级更新: supplier_id={}",
                        payload.supplier_id
                    );
                }
            }
            Err(e) => {
                tracing::error!("[srm] 供应商分级更新失败: {}", e);
            }
        }

        Ok(())
    }

    async fn handle_purchase_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[srm] 采购订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PurchaseOrderCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购订单创建事件 payload 失败: {}", e))?;

        tracing::info!(
            "[srm] 采购订单创建: {} ({})，供应商: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.supplier_name,
            payload.total_amount
        );

        if let Some(supplier_id) = payload.supplier_id {
            let perf_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM plugin_srm_supplier_performance WHERE supplier_id = $1",
            )
            .bind(supplier_id)
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

            let result = sqlx::query(
                "INSERT INTO plugin_srm_supplier_performance (supplier_id, order_count, total_amount, last_order_date, tenant_id, created_at, updated_at)
                 VALUES ($1, 1, $2, $3, '00000000-0000-0000-0000-000000000000', $4, $4)
                 ON CONFLICT (supplier_id, tenant_id) DO UPDATE SET
                     order_count = plugin_srm_supplier_performance.order_count + 1,
                     total_amount = plugin_srm_supplier_performance.total_amount + EXCLUDED.total_amount,
                     last_order_date = EXCLUDED.last_order_date,
                     updated_at = EXCLUDED.updated_at",
            )
            .bind(supplier_id)
            .bind(payload.total_amount.unwrap_or(0.0))
            .bind(Utc::now().date_naive())
            .bind(Utc::now())
            .execute(&self.db)
            .await;

            match result {
                Ok(_) => {
                    tracing::info!(
                        "[srm] 供应商履约记录同步成功: supplier_id={}, perf_records={}",
                        supplier_id,
                        perf_count + 1
                    );
                }
                Err(e) => {
                    tracing::error!("[srm] 供应商履约记录同步失败: {}", e);
                }
            }
        } else {
            tracing::warn!("[srm] 采购订单无供应商ID，跳过履约记录同步");
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = SrmEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[srm] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[srm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
