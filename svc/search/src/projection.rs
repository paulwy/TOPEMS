//! B1/F-37：search 实体投影（CQRS 本地读模型）
//!
//! 终态（一步到位、性能最优）：erp 发布 SearchableEntityChanged 事件 → 本服务订阅，
//! 把 customers / sales_orders / purchase_orders 的可搜索快照 UPSERT 到本地投影表
//! `public.search_entity_projections`。聚合检索查询只读本地投影，不再 query-time 跨服务
//! fan-out（erp HTTP），也不直读 erp schema。
//!
//! 幂等键 = (tenant_id, entity_type, entity_id)：UPSERT 天然幂等，重复投递/乱序收敛；
//! op=delete 时删除投影行。handler 返回 Err 直传 Stream 层走重试/DLQ（对齐 R-6/R-7b）。
//!
//! 投影表 DDL 已版本化：`database/migrations/20261015000071_k1_b1_search_projection_table.sql`
//! （建表 + 检索索引 + GRANT topems_app）。运行时不再自举建表/索引——自举曾导致
//! owner 随连接角色漂移：topems_app 非 owner 时订阅写投影 permission denied（事件
//! 重试 3 次进 DLQ）、CREATE INDEX 报 must be owner。现仅探测表存在性：缺失即告警
//! （migration 未应用），不阻塞订阅（待事件追平或 backfill 时由 migration 补齐后恢复）。

use sqlx::PgPool;
use std::time::Duration;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{EventSubscriber, EventType, SearchableEntityChangedPayload};
use uuid::Uuid;

/// 零租户占位 UUID（erp 未设置 app.tenant_id 时投影行归属）
const ZERO_TENANT: &str = "00000000-0000-0000-0000-000000000000";

/// 启动时探测投影表（migration 版本化后不再自举建表）。表缺失返回 Err，由
/// 调用方告警（migration 未应用）；投影未就绪时搜索为空结果，待事件/backfill 追平。
pub async fn init_projection_table(pool: &PgPool) -> Result<(), sqlx::Error> {
    let exists: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('public.search_entity_projections')::text")
            .fetch_optional(pool)
            .await?;
    match exists {
        Some(_) => Ok(()),
        None => Err(sqlx::Error::Protocol(
            "投影表 public.search_entity_projections 缺失：请确认迁移 \
             database/migrations/20261015000071_k1_b1_search_projection_table.sql 已应用"
                .to_string(),
        )),
    }
}

/// 把事件快照 UPSERT / DELETE 到投影表（幂等）。
async fn apply_event(
    pool: &PgPool,
    payload: SearchableEntityChangedPayload,
) -> Result<(), TopemsError> {
    let tenant = payload
        .tenant_id
        .unwrap_or_else(|| Uuid::parse_str(ZERO_TENANT).unwrap_or_default());

    if payload.op == "delete" {
        sqlx::query(
            "DELETE FROM public.search_entity_projections
             WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3",
        )
        .bind(tenant)
        .bind(&payload.entity_type)
        .bind(payload.entity_id)
        .execute(pool)
        .await
        .map_err(|e| TopemsError::Internal(format!("search 投影 delete 失败: {}", e)))?;
        return Ok(());
    }

    // upsert（op != delete 一律按 upsert 处理，容忍未知 op）
    sqlx::query(
        r#"
        INSERT INTO public.search_entity_projections
            (tenant_id, entity_type, entity_id, name, contact_person, contact_phone,
             email, address, status, remark, source_updated_at, projected_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE SET
            name = EXCLUDED.name,
            contact_person = EXCLUDED.contact_person,
            contact_phone = EXCLUDED.contact_phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            source_updated_at = EXCLUDED.source_updated_at,
            projected_at = NOW()
        "#,
    )
    .bind(tenant)
    .bind(&payload.entity_type)
    .bind(payload.entity_id)
    .bind(&payload.name)
    .bind(&payload.contact_person)
    .bind(&payload.contact_phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .bind(&payload.status)
    .bind(&payload.remark)
    .bind(payload.source_updated_at)
    .execute(pool)
    .await
    .map_err(|e| TopemsError::Internal(format!("search 投影 upsert 失败: {}", e)))?;

    Ok(())
}

/// 启动实体事件订阅者（失败不阻塞 search 启动；对齐 erp start_event_subscribers）。
pub async fn start_projection_subscriber(pool: PgPool) -> Result<(), String> {
    let subscriber = EventSubscriber::new("search").map_err(|e| e.to_string())?;

    let sub =
        subscriber.subscribe_handler(vec![EventType::SearchableEntityChanged], move |event| {
            let pool = pool.clone();
            Box::pin(async move {
                match event.parse_payload::<SearchableEntityChangedPayload>() {
                    Ok(payload) => apply_event(&pool, payload).await,
                    Err(e) => {
                        tracing::error!("[search] 解析 SearchableEntityChanged 失败: {}", e);
                        // 载荷不可恢复错误不应无限重试进 DLQ 风暴；返回 Ok 让其 ACK。
                        Ok(())
                    }
                }
            })
        });

    tokio::spawn(async move {
        // 订阅者长驻；断线重连由 start_listening 内部策略处理，这里仅记录异常退出。
        if let Err(e) = sub.start_listening().await {
            tracing::error!("[search] 投影事件订阅者异常退出: {}", e);
        }
    });

    // 给 Redis/Stream 一点就绪时间（非严格要求，仅避免启动日志噪音）
    tokio::time::sleep(Duration::from_millis(50)).await;
    tracing::info!("[search] 实体投影订阅者已启动（SearchableEntityChanged）");
    Ok(())
}

/// 启动时差距对账：从 erp 快照端点拉取全量可搜索实体，逐行 UPSERT 进投影。
///
/// 用途：补齐"停消费期间/历史未发事件"造成的投影缺口。读模型重建走 erp HTTP
/// 快照（不直读 erp schema，守住 schema 边界）；best-effort——erp 不可达仅告警，
/// 不阻塞 search 启动，后续增量仍由事件流收敛。
pub async fn backfill_projections(pool: &PgPool) {
    let erp_base = std::env::var("ERP_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());
    let url = format!("{}/api/erp/internal/searchable-snapshot", erp_base);

    // backfill 前差距：投影已有行数
    let before: i64 = sqlx::query_scalar("SELECT count(*) FROM public.search_entity_projections")
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .unwrap_or(0);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build();
    let token = std::env::var("BACKFILL_TOKEN").ok();
    let mut rb = match client {
        Ok(c) => c.get(&url),
        Err(e) => {
            tracing::warn!("[search] backfill 构建 HTTP 客户端失败: {}（跳过对账）", e);
            return;
        }
    };
    if let Some(t) = token.as_deref() {
        rb = rb.bearer_auth(t);
    }
    let resp = rb.send().await;

    match resp {
        Ok(r) => match r.json::<serde_json::Value>().await {
            Ok(body) => {
                let items = body
                    .get("data")
                    .and_then(|d| d.as_array())
                    .cloned()
                    .unwrap_or_default();
                let mut upserted = 0;
                for item in items {
                    if let Ok(payload) =
                        serde_json::from_value::<SearchableEntityChangedPayload>(item)
                    {
                        if apply_event(pool, payload).await.is_ok() {
                            upserted += 1;
                        }
                    }
                }
                let after: i64 =
                    sqlx::query_scalar("SELECT count(*) FROM public.search_entity_projections")
                        .fetch_optional(pool)
                        .await
                        .ok()
                        .flatten()
                        .unwrap_or(0);
                tracing::info!(
                    "[search] backfill 对账完成: 源快照 {} 条, 投影补写 {} 行, 投影行数 {} -> {}",
                    upserted,
                    upserted,
                    before,
                    after
                );
            }
            Err(e) => {
                tracing::warn!("[search] backfill 解析快照响应失败: {}（跳过对账）", e);
            }
        },
        Err(e) => {
            tracing::warn!(
                "[search] backfill 拉取 erp 快照失败: {}（erp 未起则跳过，不阻塞）",
                e
            );
        }
    }
}
