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
use sqlx::{PgConnection, PgPool, Row};
use std::sync::Arc;
use topems_shared_event::event::{EventPublisher, EventType, SearchableEntityChangedPayload};
use uuid::Uuid;

// ── D6：commit 后 emit + Redis ZSET 重试队列 ──────────────────────────────
//
// 原 emit_searchable_change 在写事务内发布——commit 失败则事件孤儿。
// 改造：写事务 commit 成功之后再发布（孤儿事件机制消除）；发布失败则把
// {entity_type, entity_id} 写入 Redis ZSET（score=下次重试时间戳），
// erp 内嵌 tokio 任务周期扫描到期项重发，成功即 ZREM。
// 消费侧 search 投影 UPSERT ON CONFLICT 天然幂等（projection.rs:87），
// at-least-once 重复投递无副作用。不落 DB 表（0013 不落库）。

const RETRY_ZSET: &str = "topems:event_retry:erp";
const RETRY_INTERVAL_SEC: i64 = 30; // 退避步长（指数 = attempts * 30s）
const MAX_ATTEMPTS: u32 = 8;

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

/// 从连接（连接池或事务）读取实体最新快照 + tenant_id；软删/不存在 → (None, tenant_id)。
async fn fetch_snapshot_with_tenant(
    conn: &mut PgConnection,
    entity_type: &str,
    entity_id: Uuid,
) -> (Option<Snapshot>, Option<Uuid>) {
    match entity_type {
        "customer" => {
            let row = sqlx::query(
                "SELECT id, tenant_id, name, contact_person, contact_phone, email, address, status, updated_at
                 FROM erp.customers WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(entity_id)
            .fetch_optional(&mut *conn)
            .await
            .ok()
            .flatten();
            match row {
                Some(r) => {
                    let snap = Snapshot {
                        name: r.try_get::<String, _>("name").ok(),
                        contact_person: r.try_get::<String, _>("contact_person").ok(),
                        contact_phone: r.try_get::<String, _>("contact_phone").ok(),
                        email: r.try_get::<String, _>("email").ok(),
                        address: r.try_get::<String, _>("address").ok(),
                        status: r.try_get::<String, _>("status").ok(),
                        remark: None,
                        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
                    };
                    (Some(snap), r.try_get::<Uuid, _>("tenant_id").ok())
                }
                None => (None, None),
            }
        }
        "sales_order" | "purchase_order" => {
            let table = if entity_type == "sales_order" {
                "erp.sales_orders"
            } else {
                "erp.purchase_orders"
            };
            let sql = format!(
                "SELECT id, tenant_id, order_no, status, remark, updated_at FROM {} WHERE id = $1 AND deleted_at IS NULL",
                table
            );
            let row = sqlx::query(&sql)
                .bind(entity_id)
                .fetch_optional(&mut *conn)
                .await
                .ok()
                .flatten();
            match row {
                Some(r) => {
                    let snap = Snapshot {
                        name: r.try_get::<String, _>("order_no").ok(),
                        contact_person: None,
                        contact_phone: None,
                        email: None,
                        address: None,
                        status: r.try_get::<String, _>("status").ok(),
                        remark: r.try_get::<String, _>("remark").ok(),
                        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
                    };
                    (Some(snap), r.try_get::<Uuid, _>("tenant_id").ok())
                }
                None => (None, None),
            }
        }
        other => {
            tracing::warn!(
                "[erp] emit 未知 entity_type={}，忽略",
                other
            );
            (None, None)
        }
    }
}

/// 构造 payload（upsert/delete），从已提交行读快照与 tenant_id。
async fn build_payload_from_pool(
    db: &PgPool,
    entity_type: &str,
    entity_id: Uuid,
) -> Option<SearchableEntityChangedPayload> {
    let mut conn = db.acquire().await.ok()?;
    let (snap, tenant_id) = fetch_snapshot_with_tenant(&mut conn, entity_type, entity_id).await;
    Some(match snap {
        Some(s) => SearchableEntityChangedPayload {
            entity_type: entity_type.to_string(),
            entity_id,
            tenant_id,
            op: "upsert".to_string(),
            name: s.name,
            contact_person: s.contact_person,
            contact_phone: s.contact_phone,
            email: s.email,
            address: s.address,
            status: s.status,
            remark: s.remark,
            source_updated_at: s.updated_at,
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
    })
}

fn redis_client() -> Option<redis::Client> {
    let url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    redis::Client::open(url).ok()
}

/// 通用：把 member JSON 推入 ZSET，score = now + (attempts+1)*步长。
async fn zadd_retry(member: &str, attempts: u32) {
    let Some(client) = redis_client() else { return };
    let Ok(mut con) = client.get_multiplexed_async_connection().await else {
        tracing::error!("[erp] 重试队列：无法连接 Redis，丢弃失败事件");
        return;
    };
    let delay = (i64::from(attempts) + 1) * RETRY_INTERVAL_SEC;
    let score = Utc::now().timestamp() + delay;
    let _: () = redis::cmd("ZADD")
        .arg(RETRY_ZSET)
        .arg(score)
        .arg(member)
        .query_async(&mut con)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("[erp] 重试队列 ZADD 失败: {}", e);
        });
}

/// searchable 通道：member = {channel:"searchable", entity_type, entity_id, attempts}。
async fn push_retry(entity_type: &str, entity_id: Uuid, attempts: u32) {
    let member = serde_json::json!({
        "channel": "searchable",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "attempts": attempts,
    })
    .to_string();
    zadd_retry(&member, attempts).await;
}

/// typed 通道：member = {channel:"typed", event_type:<EventType json>, payload, attempts}；重试时反序列化重发。
pub async fn push_retry_typed(event_type: EventType, payload: &impl serde::Serialize) {
    let Ok(p) = serde_json::to_value(payload) else { return };
    let Ok(et) = serde_json::to_value(event_type) else { return };
    let member = serde_json::json!({
        "channel": "typed",
        "event_type": et,
        "payload": p,
        "attempts": 0u32,
    })
    .to_string();
    zadd_retry(&member, 0).await;
}

/// 写事务 commit 成功之后调用：读已提交快照 → 发布；失败入 ZSET 重试。
/// 永不 panic、不阻断业务写（commit 已成功）。
pub async fn emit_after_commit(
    db: &PgPool,
    publisher: &Option<Arc<EventPublisher>>,
    entity_type: &str,
    entity_id: Uuid,
) {
    let Some(publisher) = publisher else { return };
    let Some(payload) = build_payload_from_pool(db, entity_type, entity_id).await else {
        return;
    };
    if let Err(e) = publisher
        .publish_event(EventType::SearchableEntityChanged, &payload)
        .await
    {
        tracing::warn!(
            "[erp] commit 后发布 SearchableEntityChanged 失败 {} id={}: {}，入重试队列",
            entity_type,
            entity_id,
            e
        );
        push_retry(entity_type, entity_id, 0).await;
    }
}

/// erp 内嵌后台任务：周期扫描 ZSET 到期项重发，成功 ZREM；超限 error! 告警。
pub async fn retry_due_events(db: &PgPool, publisher: &Option<Arc<EventPublisher>>) {
    let Some(publisher) = publisher else { return };
    let Some(client) = redis_client() else { return };
    let Ok(mut con) = client.get_multiplexed_async_connection().await else { return };
    let now = Utc::now().timestamp();
    let due: Vec<(String, i64)> = redis::cmd("ZRANGEBYSCORE")
        .arg(RETRY_ZSET)
        .arg("-inf")
        .arg(now)
        .arg("WITHSCORES")
        .query_async(&mut con)
        .await
        .unwrap_or_default();
    for (member, _score) in due {
        let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&member) else { continue };
        let attempts: u32 = v
            .get("attempts")
            .and_then(|x| x.as_u64())
            .and_then(|n| u32::try_from(n).ok())
            .unwrap_or(0);
        let channel = v.get("channel").and_then(|x| x.as_str()).unwrap_or("searchable");

        let (published, label) = match channel {
            "typed" => {
                let et: Option<EventType> = v.get("event_type").cloned().and_then(|e| serde_json::from_value(e).ok());
                let payload = v.get("payload").cloned().unwrap_or(serde_json::Value::Null);
                match et {
                    Some(et) => (publisher.publish_event(et, &payload).await.is_ok(), "typed".to_string()),
                    None => (false, "typed:bad-et".to_string()),
                }
            }
            _ => {
                let Some(entity_type) = v.get("entity_type").and_then(|x| x.as_str()) else { continue };
                let Some(entity_id) = v.get("entity_id").and_then(|x| x.as_str()).and_then(|s| Uuid::parse_str(s).ok()) else { continue };
                match build_payload_from_pool(db, entity_type, entity_id).await {
                    Some(payload) => (
                        publisher.publish_event(EventType::SearchableEntityChanged, &payload).await.is_ok(),
                        format!("searchable:{}", entity_type),
                    ),
                    None => (false, format!("searchable:{}", entity_type)),
                }
            }
        };

        if published {
            let _: i64 = redis::cmd("ZREM")
                .arg(RETRY_ZSET)
                .arg(&member)
                .query_async(&mut con)
                .await
                .unwrap_or(0);
            tracing::info!("[erp] 重试发布成功 {}", label);
        } else if attempts + 1 >= MAX_ATTEMPTS {
            let _: i64 = redis::cmd("ZREM")
                .arg(RETRY_ZSET)
                .arg(&member)
                .query_async(&mut con)
                .await
                .unwrap_or(0);
            tracing::error!(
                "[erp] 事件重试超上限（{} 次），放弃 {}——需 backfill 补拉",
                MAX_ATTEMPTS, label
            );
        } else {
            let _: i64 = redis::cmd("ZREM")
                .arg(RETRY_ZSET)
                .arg(&member)
                .query_async(&mut con)
                .await
                .unwrap_or(0);
            // 重排：attempts+1（typed 与 searchable 共用重排）
            if let Some(obj) = v.as_object_mut() {
                obj.insert("attempts".to_string(), serde_json::json!(attempts + 1));
                let new_member = serde_json::Value::Object(obj.clone()).to_string();
                zadd_retry(&new_member, attempts + 1).await;
            }
        }
    }
}


// ── B1 启动时差距对账：erp 快照端点（search backfill 拉取）──────────────────────
//
// CQRS 读模型重建：search 启动时调用本端点，把 erp 源表现有可搜索实体全量
// 作为 upsert 快照返回，search 逐行 UPSERT 进自有投影，补齐"停消费期间/历史
// 未发事件"造成的差距。不占用事件流，幂等可重复调用。

use axum::{extract::State, Json};
use topems_shared_core::response::ApiResponse;

use super::ApiState;

/// GET /internal/searchable-snapshot —— 返回全部可搜索实体当前快照（upsert）。
/// 供 search 启动 backfill；返回扁平列表，每项即一条 SearchableEntityChangedPayload。
pub async fn searchable_snapshot(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<SearchableEntityChangedPayload>>> {
    let db = &state.db;
    let mut out: Vec<SearchableEntityChangedPayload> = Vec::new();

    // customers
    if let Ok(rows) = sqlx::query(
        "SELECT id, tenant_id, name, contact_person, contact_phone, email, address, status, updated_at
         FROM erp.customers WHERE deleted_at IS NULL",
    )
    .fetch_all(db)
    .await
    {
        for r in rows {
            out.push(SearchableEntityChangedPayload {
                entity_type: "customer".to_string(),
                entity_id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                tenant_id: r.try_get::<Uuid, _>("tenant_id").ok(),
                op: "upsert".to_string(),
                name: r.try_get::<String, _>("name").ok(),
                contact_person: r.try_get::<String, _>("contact_person").ok(),
                contact_phone: r.try_get::<String, _>("contact_phone").ok(),
                email: r.try_get::<String, _>("email").ok(),
                address: r.try_get::<String, _>("address").ok(),
                status: r.try_get::<String, _>("status").ok(),
                remark: None,
                source_updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
            });
        }
    }

    // sales_orders
    if let Ok(rows) = sqlx::query(
        "SELECT id, tenant_id, order_no, status, remark, updated_at
         FROM erp.sales_orders WHERE deleted_at IS NULL",
    )
    .fetch_all(db)
    .await
    {
        for r in rows {
            out.push(SearchableEntityChangedPayload {
                entity_type: "sales_order".to_string(),
                entity_id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                tenant_id: r.try_get::<Uuid, _>("tenant_id").ok(),
                op: "upsert".to_string(),
                name: r.try_get::<String, _>("order_no").ok(),
                contact_person: None,
                contact_phone: None,
                email: None,
                address: None,
                status: r.try_get::<String, _>("status").ok(),
                remark: r.try_get::<String, _>("remark").ok(),
                source_updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
            });
        }
    }

    // purchase_orders
    if let Ok(rows) = sqlx::query(
        "SELECT id, tenant_id, order_no, status, remark, updated_at
         FROM erp.purchase_orders WHERE deleted_at IS NULL",
    )
    .fetch_all(db)
    .await
    {
        for r in rows {
            out.push(SearchableEntityChangedPayload {
                entity_type: "purchase_order".to_string(),
                entity_id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                tenant_id: r.try_get::<Uuid, _>("tenant_id").ok(),
                op: "upsert".to_string(),
                name: r.try_get::<String, _>("order_no").ok(),
                contact_person: None,
                contact_phone: None,
                email: None,
                address: None,
                status: r.try_get::<String, _>("status").ok(),
                remark: r.try_get::<String, _>("remark").ok(),
                source_updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
            });
        }
    }

    tracing::info!("[erp] searchable-snapshot 返回 {} 条实体供 search backfill", out.len());
    Json(ApiResponse::success(out, "快照"))
}
