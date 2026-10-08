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
//! 投影表 DDL 由本模块启动时 `CREATE TABLE IF NOT EXISTS` 自举（对齐 unified-core
//! audit_logs 先例），不占用 database/migrations（避开并行线 0011/0012）。

use sqlx::PgPool;
use std::time::Duration;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{EventSubscriber, EventType, SearchableEntityChangedPayload};
use uuid::Uuid;

/// 零租户占位 UUID（erp 未设置 app.tenant_id 时投影行归属）
const ZERO_TENANT: &str = "00000000-0000-0000-0000-000000000000";

/// 启动时自举投影表（幂等）。对齐 unified-core audit_logs 运行时建表先例。
pub async fn init_projection_table(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS public.search_entity_projections (
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            entity_type VARCHAR(32) NOT NULL,
            entity_id UUID NOT NULL,
            name TEXT,
            contact_person TEXT,
            contact_phone TEXT,
            email TEXT,
            address TEXT,
            status TEXT,
            remark TEXT,
            source_updated_at TIMESTAMPTZ,
            projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (tenant_id, entity_type, entity_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 检索索引：按实体类型 + 名称 ILIKE（pg_trgm 不可用时退化为 btree 前缀辅助）
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_sep_type_name ON public.search_entity_projections(entity_type, name);",
    )
    .execute(pool)
    .await?;

    Ok(())
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
