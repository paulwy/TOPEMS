//! 主数据事件消费者（A1 稳定 ID 写入链路）
//!
//! 其他服务发布 `MasterDataEvent` 后，本消费者把事件落到
//! `public.core_master_data_refs`：按稳定 `master_data_id` UPSERT，
//! 同一实体反复发布只更新同一行。

use sqlx::PgPool;
use topems_shared_core::TopemsError;
use topems_shared_db::master_data_refs::MasterDataRefService;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    EventSubscriber, MasterDataAction, MasterDataDomain, MasterDataEvent,
};
use uuid::Uuid;

/// 消费组/订阅者名称
const CONSUMER_NAME: &str = "unified-core-mdm-refs";

/// 全部主数据域
fn all_domains() -> Vec<MasterDataDomain> {
    vec![
        MasterDataDomain::Customer,
        MasterDataDomain::Supplier,
        MasterDataDomain::Material,
        MasterDataDomain::Organization,
        MasterDataDomain::Employee,
        MasterDataDomain::AccountSubject,
    ]
}

/// 稳定 ID 校验：`{prefix}-{uuid}` 且前缀与事件域一致。
///
/// 旧格式（`{prefix}-{yyyymmdd}-{rand}`）与外部拼装 ID 无法保证同一实体收敛，
/// 直接跳过，避免在 refs 里制造重复行。
fn stable_entity_id(event: &MasterDataEvent) -> Option<Uuid> {
    let prefix = format!("{}-", event.domain.prefix());
    let rest = event.master_data_id.strip_prefix(&prefix)?;
    Uuid::parse_str(rest).ok()
}

/// 业务编码：优先事件 code；其次 payload.code；最后退回 master_data_id
fn resolve_code(event: &MasterDataEvent) -> String {
    let code = event.code.trim();
    if !code.is_empty() && code != event.master_data_id {
        return code.to_string();
    }
    if let Some(code) = event
        .payload
        .get("code")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        return code.to_string();
    }
    event.master_data_id.clone()
}

/// 名称：payload.name；缺失时退回业务编码
fn resolve_name(event: &MasterDataEvent, code: &str) -> String {
    event
        .payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .unwrap_or(code)
        .to_string()
}

/// 状态：激活/停用由动作决定；创建/更新优先取 payload.status。
///
/// 更新事件缺少合法 status 时返回 `None`，由 UPSERT 保留原状态。
fn resolve_status(event: &MasterDataEvent) -> Option<&'static str> {
    let payload_status = event
        .payload
        .get("status")
        .and_then(|v| v.as_str())
        .map(str::trim);
    match event.action {
        MasterDataAction::Activated => Some("active"),
        MasterDataAction::Deactivated => Some("inactive"),
        MasterDataAction::Deleted => Some("deleted"),
        MasterDataAction::Created => Some(match payload_status {
            Some("inactive") => "inactive",
            _ => "active",
        }),
        MasterDataAction::Updated => match payload_status {
            Some("active") => Some("active"),
            Some("inactive") => Some("inactive"),
            _ => None,
        },
    }
}

/// 消费单条主数据事件（幂等：同一 master_data_id 只保留一行）
pub async fn consume_master_data_event(
    pool: &PgPool,
    event: MasterDataEvent,
) -> Result<(), TopemsError> {
    if event.tenant_id.is_nil() {
        tracing::warn!(
            master_data_id = %event.master_data_id,
            domain = event.domain.as_str(),
            "跳过无租户主数据事件"
        );
        return Ok(());
    }
    if stable_entity_id(&event).is_none() {
        tracing::warn!(
            master_data_id = %event.master_data_id,
            domain = event.domain.as_str(),
            "跳过非稳定 ID 主数据事件（旧格式或外部拼装）"
        );
        return Ok(());
    }

    let service = MasterDataRefService::new(Db::new(pool.clone(), "public, shared"));

    if event.action == MasterDataAction::Deleted {
        service
            .soft_delete_master_data_ref(&event.master_data_id, event.tenant_id)
            .await
            .map_err(|e| TopemsError::Database(format!("消费主数据删除事件失败: {e}")))?;
        return Ok(());
    }

    let code = resolve_code(&event);
    let name = resolve_name(&event, &code);
    let status = resolve_status(&event);
    service
        .upsert_master_data_ref(
            &event.master_data_id,
            event.tenant_id,
            event.domain.as_str(),
            &code,
            &name,
            status,
            &event.source_service,
        )
        .await
        .map_err(|e| TopemsError::Database(format!("消费主数据事件失败: {e}")))?;
    Ok(())
}

/// 启动后台消费者；初始化/运行失败只记录日志，不影响 HTTP 服务。
pub fn spawn_master_data_consumer(pool: PgPool) {
    tokio::spawn(async move {
        let subscriber = match EventSubscriber::new(CONSUMER_NAME) {
            Ok(subscriber) => subscriber,
            Err(e) => {
                tracing::error!("[unified-core] 主数据事件消费者初始化失败: {}", e);
                return;
            }
        };
        let handler_pool = pool.clone();
        let subscriber = subscriber.subscribe_master_data_handler(all_domains(), move |event| {
            let pool = handler_pool.clone();
            Box::pin(async move { consume_master_data_event(&pool, event).await })
        });
        tracing::info!("[unified-core] 主数据事件消费者已启动: {}", CONSUMER_NAME);
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[unified-core] 主数据事件消费者退出: {}", e);
        }
    });
}
