//! B1/F-37：erp → search 实体投影事件发布辅助
//!
//! 背景：search 聚合检索的终态（一步到位、性能最优）= erp 发布可搜索实体快照事件，
//! search 订阅维护自有投影表，查询只读本地投影（不再 query-time 跨服务 fan-out，
//! 也不再直读 erp schema）。
//!
//! 本模块在 erp 侧提供单一发布入口 [`emit_searchable_change`]：customers /
//! sales_orders / purchase_orders 的任意写路径（create/update/delete/状态流转/批量）
//! 成功后调用一次。辅助从同一事务连接读取最新行（含软删判定），构建
//! [`SearchableEntityChangedPayload`] 并发布。
//!
//! 幂等键 = (tenant_id, entity_type, entity_id)；消费端 UPSERT/DELETE 天然幂等，
//! 重复投递/乱序收敛由投影表自身处理。发布为最佳努力：失败仅告警，不阻断业务写。

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Row};
use std::sync::Arc;
use topems_shared_event::event::{EventPublisher, EventType, SearchableEntityChangedPayload};
use uuid::Uuid;

/// 实体可搜索快照（仅保留投影所需列）
struct Snapshot {
    name: Option<String>,
    contact_person: Option<String>,
    contact_phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    status: Option<String>,
    remark: Option<String>,
    updated_at: Option<DateTime<Utc>>,
}

/// 从连接读取实体最新快照；行已软删（deleted_at 非空）或不存在时返回 None（→ delete op）。
async fn fetch_snapshot(
    conn: &mut PgConnection,
    entity_type: &str,
    entity_id: Uuid,
) -> Option<Snapshot> {
    match entity_type {
        "customer" => {
            let row = sqlx::query(
                "SELECT name, contact_person, contact_phone, email, address, status, updated_at
                 FROM erp.customers WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(entity_id)
            .fetch_optional(&mut *conn)
            .await
            .ok()??;
            Some(Snapshot {
                name: row.try_get::<String, _>("name").ok(),
                contact_person: row.try_get::<String, _>("contact_person").ok(),
                contact_phone: row.try_get::<String, _>("contact_phone").ok(),
                email: row.try_get::<String, _>("email").ok(),
                address: row.try_get::<String, _>("address").ok(),
                status: row.try_get::<String, _>("status").ok(),
                remark: None,
                updated_at: row.try_get::<DateTime<Utc>, _>("updated_at").ok(),
            })
        }
        "sales_order" | "purchase_order" => {
            // 两类订单列结构一致（order_no/status/remark），按表名区分
            let table = if entity_type == "sales_order" {
                "erp.sales_orders"
            } else {
                "erp.purchase_orders"
            };
            // query! 不支持动态表名拼接，用 query_as 原始映射
            let sql = format!(
                "SELECT order_no, status, remark, updated_at FROM {} WHERE id = $1 AND deleted_at IS NULL",
                table
            );
            let row = sqlx::query(&sql)
                .bind(entity_id)
                .fetch_optional(&mut *conn)
                .await
                .ok()?;
            row.map(|r| Snapshot {
                name: r.try_get::<String, _>("order_no").ok(),
                contact_person: None,
                contact_phone: None,
                email: None,
                address: None,
                status: r.try_get::<String, _>("status").ok(),
                remark: r.try_get::<String, _>("remark").ok(),
                updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
            })
        }
        other => {
            tracing::warn!(
                "[erp] emit_searchable_change 未知 entity_type={}，忽略",
                other
            );
            None
        }
    }
}

/// 在写事务内发布实体快照变更事件（upsert 或 delete）。
///
/// `conn` 为当前写事务连接（须能看到未提交写入）；`publisher` 来自 ApiState.event_publisher。
/// 永不 panic、不返回错误——投影新鲜度为最终一致，业务写不被它拖垮。
pub async fn emit_searchable_change(
    conn: &mut PgConnection,
    publisher: &Option<Arc<EventPublisher>>,
    entity_type: &str,
    entity_id: Uuid,
) {
    let Some(publisher) = publisher else {
        return;
    };

    let tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid")
            .fetch_optional(&mut *conn)
            .await
            .ok()
            .flatten();

    let payload = match fetch_snapshot(conn, entity_type, entity_id).await {
        Some(snap) => SearchableEntityChangedPayload {
            entity_type: entity_type.to_string(),
            entity_id,
            tenant_id,
            op: "upsert".to_string(),
            name: snap.name,
            contact_person: snap.contact_person,
            contact_phone: snap.contact_phone,
            email: snap.email,
            address: snap.address,
            status: snap.status,
            remark: snap.remark,
            source_updated_at: snap.updated_at,
        },
        None => SearchableEntityChangedPayload {
            entity_type: entity_type.to_string(),
            entity_id,
            tenant_id,
            op: "delete".to_string(),
            name: None,
            contact_person: None,
            contact_phone: None,
            email: None,
            address: None,
            status: None,
            remark: None,
            source_updated_at: None,
        },
    };

    if let Err(e) = publisher
        .publish_event(EventType::SearchableEntityChanged, &payload)
        .await
    {
        tracing::warn!(
            "[erp] 发布 SearchableEntityChanged 失败 {} id={}: {}（search 投影将滞后至下次写/补拉）",
            entity_type,
            entity_id,
            e
        );
    }
}
