use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler};
use topems_shared_event::event::{
    CacheInvalidatedPayload, Event, EventResult, EventSubscriber, EventType,
    PermissionChangedPayload, PositionCreatedPayload, PositionDeletedPayload,
    PositionUpdatedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct HrmEventHandlers {
    pub db: PgPool,
    pub employee_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl HrmEventHandlers {
    pub fn new(db: PgPool, employee_cache: Arc<AsyncL2Cache<serde_json::Value>>) -> Self {
        Self { db, employee_cache }
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

pub async fn start_event_subscribers(
    db: PgPool,
    employee_cache: Arc<AsyncL2Cache<serde_json::Value>>,
) -> Result<(), String> {
    let handlers = HrmEventHandlers::new(db, employee_cache.clone());
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    // 创建缓存失效监听器，注册员工缓存处理器
    let mut cache_invalidation_listener = CacheInvalidationListener::new("hrm");
    let employee_cache_handler =
        AsyncL2CacheInvalidationHandler::new("hrm_employee_cache", employee_cache, "hrm:employee:");
    cache_invalidation_listener.register_handler(employee_cache_handler);
    let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

    tracing::info!("[hrm] 启动事件订阅者，注册 4 类业务事件 + 1 个缓存失效事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[hrm] 事件订阅者异常退出: {}", e);
        }
    });

    // 订阅缓存失效事件
    let cache_listener = cache_invalidation_listener.clone();
    let cache_subscriber = EventSubscriber::new("hrm-cache-invalidation")
        .map_err(|e| e.to_string())?
        .subscribe(vec![EventType::CacheInvalidated], move |event| {
            let listener = cache_listener.clone();
            Box::pin(async move {
                if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                    let invalidation_event = CacheInvalidationEvent {
                        source_service: payload.source_service,
                        source_instance: payload.source_instance,
                        cache_key_pattern: payload.cache_key_pattern,
                        invalidation_level: InvalidationLevel::from_str(
                            &payload.invalidation_level,
                        ),
                        reason: payload.reason,
                    };
                    listener.dispatch_invalidation(&invalidation_event);
                }
            })
        });

    tokio::spawn(async move {
        if let Err(e) = cache_subscriber.start_listening().await {
            tracing::error!("[hrm] 缓存失效事件订阅者异常退出: {}", e);
        }
    });

    Ok(())
}
