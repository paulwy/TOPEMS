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
use sqlx::{PgPool, Row};
use std::sync::Arc;
use topems_shared_event::event::commit_retry;
use topems_shared_event::event::{EventPublisher, EventType, SearchableEntityChangedPayload};
use uuid::Uuid;

const SERVICE_NAME: &str = "erp";

/// 实体可搜索快照（仅保留投影所需列）
struct Snapshot {
    /// 归属公司（W13 v2 投影公司维度）：订单取源表 company_id；
    /// 客户暂取 group_company_id（无该列时保持 None，等业务清单回填）。
    company_id: Option<Uuid>,
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
    scope: &mut topems_shared_db::ScopedTxn<'_>,
    entity_type: &str,
    entity_id: Uuid,
) -> (Option<Snapshot>, Option<Uuid>) {
    match entity_type {
        "customer" => {
            let row = sqlx::query(
                "SELECT id, tenant_id, group_company_id, name, contact_person, contact_phone, email, address, status, updated_at
                 FROM erp.customers WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(entity_id)
            .fetch_optional(&mut *scope)
            .await
            .ok()
            .flatten();
            match row {
                Some(r) => {
                    let snap = Snapshot {
                        company_id: r.try_get::<Uuid, _>("group_company_id").ok(),
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
                "SELECT id, tenant_id, company_id, order_no, status, remark, updated_at FROM {} WHERE id = $1 AND deleted_at IS NULL",
                table
            );
            let row = sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(entity_id)
                .fetch_optional(&mut *scope)
                .await
                .ok()
                .flatten();
            match row {
                Some(r) => {
                    let snap = Snapshot {
                        company_id: r.try_get::<Uuid, _>("company_id").ok(),
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
            tracing::warn!("[erp] emit 未知 entity_type={}，忽略", other);
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
    // commit 后快照读取不属于任何请求事务：显式系统只读通道，连接不裸借。
    let scoped_db = topems_shared_db::scope::Db::new(db.clone(), "public, shared");
    let mut scope = scoped_db.scope_read_system().await.ok()?;
    let (snap, tenant_id) = fetch_snapshot_with_tenant(&mut scope, entity_type, entity_id).await;
    Some(match snap {
        Some(s) => SearchableEntityChangedPayload {
            entity_type: entity_type.to_string(),
            entity_id,
            tenant_id,
            company_id: s.company_id,
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
            company_id: None,
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

/// typed 通道入队（转发共享模块）。
pub async fn push_retry_typed(event_type: EventType, payload: &impl serde::Serialize) {
    commit_retry::push_retry_typed(SERVICE_NAME, event_type, payload).await;
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
        commit_retry::push_retry_searchable(SERVICE_NAME, entity_type, entity_id, 0).await;
    }
}

/// erp 内嵌后台任务：周期扫描 ZSET 到期项重发（转发共享模块，rebuild 回调为本模块 DB 重建）。
pub async fn retry_due_events(db: &PgPool, publisher: &Option<Arc<EventPublisher>>) {
    let Some(publisher) = publisher else { return };
    let db = db.clone();
    commit_retry::run_relay(SERVICE_NAME, publisher, move |et: &str, eid| {
        let db = db.clone();
        let et = et.to_string();
        async move {
            build_payload_from_pool(&db, &et, eid)
                .await
                .and_then(|p| serde_json::to_value(p).ok())
        }
    })
    .await;
}

// ── B1 启动时差距对账：erp 快照端点（search backfill 拉取）──────────────────────
//
// CQRS 读模型重建：search 启动时调用本端点，把 erp 源表现有可搜索实体全量
// 作为 upsert 快照返回，search 逐行 UPSERT 进自有投影，补齐"停消费期间/历史
// 未发事件"造成的差距。不占用事件流，幂等可重复调用。

use axum::extract::State;
use topems_shared_core::response::ApiResponse;

use super::ApiState;

/// GET /internal/searchable-snapshot —— 返回全部可搜索实体当前快照（upsert）。
/// 供 search 启动 backfill；返回扁平列表，每项即一条 SearchableEntityChangedPayload。
pub async fn searchable_snapshot(
    State(state): State<ApiState>,
) -> ApiResponse<Vec<SearchableEntityChangedPayload>> {
    // 内部 backfill 入口没有请求租户，需要全量快照：显式系统只读通道。
    let scoped_db = topems_shared_db::scope::Db::new(state.system_pool.clone(), "public, shared");
    let mut scope = match scoped_db.scope_read_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("[erp] 打开搜索快照只读作用域失败: {}", e);
            return ApiResponse::server_error("搜索快照读取失败");
        }
    };
    let mut out: Vec<SearchableEntityChangedPayload> = Vec::new();

    // customers
    if let Ok(rows) = sqlx::query(
        "SELECT id, tenant_id, group_company_id, name, contact_person, contact_phone, email, address, status, updated_at
         FROM erp.customers WHERE deleted_at IS NULL",
    )
    .fetch_all(&mut scope)
    .await
    {
        for r in rows {
            out.push(SearchableEntityChangedPayload {
                entity_type: "customer".to_string(),
                entity_id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                tenant_id: r.try_get::<Uuid, _>("tenant_id").ok(),
                company_id: r.try_get::<Uuid, _>("group_company_id").ok(),
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
        "SELECT id, tenant_id, company_id, order_no, status, remark, updated_at
         FROM erp.sales_orders WHERE deleted_at IS NULL",
    )
    .fetch_all(&mut scope)
    .await
    {
        for r in rows {
            out.push(SearchableEntityChangedPayload {
                entity_type: "sales_order".to_string(),
                entity_id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                tenant_id: r.try_get::<Uuid, _>("tenant_id").ok(),
                company_id: r.try_get::<Uuid, _>("company_id").ok(),
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
        "SELECT id, tenant_id, company_id, order_no, status, remark, updated_at
         FROM erp.purchase_orders WHERE deleted_at IS NULL",
    )
    .fetch_all(&mut scope)
    .await
    {
        for r in rows {
            out.push(SearchableEntityChangedPayload {
                entity_type: "purchase_order".to_string(),
                entity_id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
                tenant_id: r.try_get::<Uuid, _>("tenant_id").ok(),
                company_id: r.try_get::<Uuid, _>("company_id").ok(),
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

    tracing::info!(
        "[erp] searchable-snapshot 返回 {} 条实体供 search backfill",
        out.len()
    );
    ApiResponse::success(out, "快照")
}
