use chrono::Utc;
use sqlx::PgPool;
use topems_shared_event::event::{
    Event, EventResult, EventSubscriber, EventType, PermissionChangedPayload,
    PositionCreatedPayload, PositionDeletedPayload, PositionUpdatedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct HrmEventHandlers {
    pub db: PgPool,
}

impl HrmEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("hrm")?;

        let h1 = self.clone();

        Ok(subscriber.subscribe_handler(
            vec![
                EventType::PermissionChanged,
                EventType::PositionCreated,
                EventType::PositionUpdated,
                EventType::PositionDeleted,
            ],
            move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_permission_or_position_changed(event).await })
            },
        ))
    }

    async fn record_cache_invalidation(
        &self,
        cache_type: &str,
        cache_key: &str,
        operation: &str,
        source_event: &str,
    ) -> Result<uuid::Uuid, String> {
        let now = Utc::now();
        let log_id = uuid::Uuid::new_v4();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO hrm_cache_invalidation_logs (id, cache_type, cache_key, operation, source_event, invalidated_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, '00000000-0000-0000-0000-000000000000')
             RETURNING id",
        )
        .bind(log_id)
        .bind(cache_type)
        .bind(cache_key)
        .bind(operation)
        .bind(source_event)
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(id) => {
                tracing::info!(
                    "[hrm] 缓存失效记录成功: type={}, key={}, op={}, id={}",
                    cache_type,
                    cache_key,
                    operation,
                    id
                );
                Ok(id)
            }
            Err(e) => {
                tracing::warn!("[hrm] 缓存失效记录失败（graceful fallback）: {}", e);
                Ok(uuid::Uuid::nil())
            }
        }
    }

    async fn handle_permission_or_position_changed(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[hrm] 权限/岗位变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::PermissionChanged => {
                let payload: PermissionChangedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析权限变更事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[hrm] 权限变更: user_id={}, 新增 {} 项, 移除 {} 项",
                    payload.user_id,
                    payload.permissions_added.len(),
                    payload.permissions_removed.len()
                );

                let cache_key = format!("user_permissions:{}", payload.user_id);
                let _ = self
                    .record_cache_invalidation(
                        "user_permissions",
                        &cache_key,
                        "invalidate",
                        "PermissionChanged",
                    )
                    .await;

                tracing::info!("[hrm] 用户权限缓存已失效: user_id={}", payload.user_id);
            }
            EventType::PositionCreated => {
                let payload: PositionCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析岗位创建事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[hrm] 岗位创建: {} ({}, {})",
                    payload.name,
                    payload.code,
                    payload.position_id
                );

                let _ = self
                    .record_cache_invalidation(
                        "positions",
                        "all_positions",
                        "refresh",
                        "PositionCreated",
                    )
                    .await;

                tracing::info!(
                    "[hrm] 岗位列表缓存已刷新: position_id={}",
                    payload.position_id
                );
            }
            EventType::PositionUpdated => {
                let payload: PositionUpdatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析岗位更新事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[hrm] 岗位更新: position_id={}, changes={}",
                    payload.position_id,
                    payload.changes
                );

                let cache_key = format!("position:{}", payload.position_id);
                let _ = self
                    .record_cache_invalidation("position", &cache_key, "update", "PositionUpdated")
                    .await;

                let _ = self
                    .record_cache_invalidation(
                        "positions",
                        "all_positions",
                        "refresh",
                        "PositionUpdated",
                    )
                    .await;

                tracing::info!("[hrm] 岗位缓存已失效: position_id={}", payload.position_id);
            }
            EventType::PositionDeleted => {
                let payload: PositionDeletedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析岗位删除事件 payload 失败: {}", e))?;

                tracing::info!("[hrm] 岗位删除: position_id={}", payload.position_id);

                let cache_key = format!("position:{}", payload.position_id);
                let _ = self
                    .record_cache_invalidation("position", &cache_key, "delete", "PositionDeleted")
                    .await;

                let _ = self
                    .record_cache_invalidation(
                        "positions",
                        "all_positions",
                        "refresh",
                        "PositionDeleted",
                    )
                    .await;

                tracing::info!("[hrm] 岗位缓存已清理: position_id={}", payload.position_id);
            }
            _ => {}
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = HrmEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[hrm] 启动事件订阅者，注册 4 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[hrm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
