//! MES 服务业务事件订阅处理器（D2 U2 环2 决策 A）
//!
//! 订阅 erp 侧生产订单下达事件 `ErpProductionOrderDispatched`，在 MES 本地创建生产工单。
//! 取代原 erp→mes 同步 HTTP（POST /api/mes/production-orders/from-erp）；
//! 幂等键 = erp_order_id（映射到 mes.production_orders.source_order_id），重复投递只建单一次。
//! 消费失败由 shared-event 订阅器统一进 DLQ（topems:dlq + retry_count）。

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared_event::event::{
    ErpProductionOrderDispatchedPayload, Event, EventSubscriber, EventType,
};

/// 启动 MES 业务事件订阅（在 main.rs 中与缓存失效订阅并行 spawn）。
pub async fn start_business_event_subscribers(db: PgPool) -> Result<(), String> {
    let subscriber = EventSubscriber::new("mes-business")
        .map_err(|e| format!("创建 MES 业务事件订阅者失败: {}", e))?;

    let subscriber = subscriber.subscribe(
        vec![EventType::ErpProductionOrderDispatched],
        move |event| {
            let db = db.clone();
            Box::pin(async move {
                if let Err(e) = handle_erp_production_order_dispatched(&db, event).await {
                    tracing::error!("[mes] handle_erp_production_order_dispatched 失败: {}", e);
                }
            })
        },
    );

    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[mes] 业务事件订阅者异常退出: {}", e);
        }
    });

    tracing::info!("[mes] 业务事件订阅者启动成功（订阅 ErpProductionOrderDispatched）");
    Ok(())
}

/// ErpProductionOrderDispatched → 在 MES 本地创建生产工单。
/// 幂等：source_order_id = erp_order_id 已存在则跳过（事件重放不重复建单）。
async fn handle_erp_production_order_dispatched(db: &PgPool, event: Event) -> Result<(), String> {
    let payload: ErpProductionOrderDispatchedPayload = event
        .parse_payload()
        .map_err(|e| format!("解析 ErpProductionOrderDispatched payload 失败: {}", e))?;

    tracing::info!(
        "[mes] ErpProductionOrderDispatched 处理 - erp_order_id={}, order_no={}, qty={:?}, trace_id={:?}",
        payload.erp_order_id,
        payload.order_no,
        payload.quantity,
        event.trace_id
    );

    // 幂等去重：同一 erp_order_id 已建单则直接收敛返回
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT source_order_id FROM production_orders WHERE source_order_id = $1 LIMIT 1",
    )
    .bind(payload.erp_order_id.to_string())
    .fetch_optional(db)
    .await
    .map_err(|e| format!("幂等查询 source_order_id 失败: {}", e))?;
    if existing.is_some() {
        tracing::info!(
            "[mes] ErpProductionOrderDispatched 幂等跳过 - erp_order_id={} 已建单",
            payload.erp_order_id
        );
        return Ok(());
    }

    let now = Utc::now();
    let order_no = format!(
        "MO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );
    let planned_start = payload.planned_start_date.unwrap_or(now);
    let planned_end = payload
        .planned_end_date
        .unwrap_or_else(|| now + chrono::Duration::days(7));

    // 服务间事件（无租户上下文）：事务内绑定 nil 租户，确保 RLS 放行 INSERT
    let mut tx = db
        .begin()
        .await
        .map_err(|e| format!("开启事务失败: {}", e))?;
    sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(Uuid::nil().to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("设置 nil 租户上下文失败: {}", e))?;

    // f64→i32 无 TryFrom 实现；生产订单数量在 i32 合理范围，截断后转换（cast deny 受控点）
    #[allow(clippy::cast_possible_truncation, clippy::as_conversions)]
    let quantity_i32 = payload.quantity.unwrap_or(0.0).trunc() as i32;

    sqlx::query(
        r#"INSERT INTO production_orders (
               order_number, product_name, product_code, quantity,
               status, source_order_id, source_order_number,
               planned_start_date, planned_end_date, workshop_id, notes,
               created_at, updated_at, tenant_id
           ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $11, $12)"#,
    )
    .bind(&order_no)
    .bind(payload.product_name.unwrap_or_default())
    .bind(payload.product_code.unwrap_or_default())
    .bind(quantity_i32)
    .bind(payload.erp_order_id.to_string())
    .bind(&payload.order_no)
    .bind(planned_start.date_naive())
    .bind(planned_end.date_naive())
    .bind(payload.workshop_id)
    .bind(&payload.notes)
    .bind(now)
    .bind(Uuid::nil())
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("插入 production_orders 失败: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("提交事务失败: {}", e))?;

    tracing::info!(
        "[mes] ErpProductionOrderDispatched 完成 - 新建工单 {}, source_order_id={}",
        order_no,
        payload.erp_order_id
    );
    Ok(())
}
