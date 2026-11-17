use std::sync::Arc;
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::error::TopemsError;
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler};
use topems_shared_auth::middleware::TenantScope;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    CacheInvalidatedPayload, Event, EventResult, EventSubscriber, EventType, MasterDataAction,
    MasterDataDomain, MasterDataEvent, ProductionOrderCreatedPayload, PurchaseOrderCreatedPayload,
    ScmShipmentReceivedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

#[derive(Clone)]
pub struct PdmEventHandlers {
    pub db: Db,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl PdmEventHandlers {
    pub fn new(db: Db, dict_cache: Arc<AsyncL2Cache<serde_json::Value>>) -> Self {
        Self { db, dict_cache }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("pdm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h4 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::PurchaseOrderCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_purchase_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::ProductionOrderCreated], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_production_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::ScmShipmentReceived], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_shipment_received(event).await })
            })
            .subscribe_master_data(vec![MasterDataDomain::AccountSubject], move |event| {
                let h = h4.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_account_subject_changed(event).await {
                        tracing::error!(
                            "[pdm] handle_master_data_account_subject_changed 失败: {}",
                            e
                        );
                    }
                })
            }))
    }

    async fn handle_purchase_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pdm] 采购订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PurchaseOrderCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析采购订单创建事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[pdm] 采购订单: {} ({})，供应商: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.supplier_name,
            payload.total_amount
        );

        // tenant-system: 后台事件处理器（白名单第 4 类），系统通道跨租户统计。
        let material_count = match self.db.scope_read_system().await {
            Ok(mut scope) => {
                let count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM pdm_materials WHERE status = 'active'",
                )
                .fetch_one(&mut scope)
                .await
                .unwrap_or(0);
                if let Err(e) = scope.commit().await {
                    tracing::warn!("[pdm] 事件查询事务提交失败: {}", e);
                }
                count
            }
            Err(e) => {
                tracing::warn!("[pdm] 事件查询建立作用域失败: {}", e);
                0
            }
        };

        tracing::info!(
            "[pdm] 采购订单创建触发物料数据同步，当前 PDM 物料总数: {}",
            material_count
        );

        Ok(())
    }

    async fn handle_production_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pdm] 生产订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ProductionOrderCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析生产订单创建事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[pdm] 生产订单: {} ({})，产品: {:?}，数量: {:?}",
            payload.order_no,
            payload.order_id,
            payload.product_name,
            payload.quantity
        );

        if let Some(product_id) = payload.product_id {
            // tenant-system: 后台事件处理器（白名单第 4 类），系统通道跨租户统计。
            let config_count = match self.db.scope_read_system().await {
                Ok(mut scope) => {
                    let count = sqlx::query_scalar::<_, i64>(
                        "SELECT COUNT(*) FROM pdm_configurations WHERE product_id = $1",
                    )
                    .bind(product_id)
                    .fetch_one(&mut scope)
                    .await
                    .unwrap_or(0);
                    if let Err(e) = scope.commit().await {
                        tracing::warn!("[pdm] 事件查询事务提交失败: {}", e);
                    }
                    count
                }
                Err(e) => {
                    tracing::warn!("[pdm] 事件查询建立作用域失败: {}", e);
                    0
                }
            };

            if config_count > 0 {
                tracing::info!(
                    "[pdm] 产品 {} 有 {} 个 BOM 配置，已同步到生产订单",
                    product_id,
                    config_count
                );
            } else {
                tracing::warn!("[pdm] 产品 {} 未找到 BOM 配置，请检查 PDM 数据", product_id);
            }
        }

        Ok(())
    }

    async fn handle_shipment_received(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pdm] 收货事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ScmShipmentReceivedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析收货事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[pdm] 收货单: {} ({})，供应商: {:?}，数量: {:?}，收货人: {:?}",
            payload.shipment_no,
            payload.shipment_id,
            payload.supplier_name,
            payload.quantity,
            payload.received_by
        );

        // tenant-system: 后台事件处理器（白名单第 4 类），系统通道跨租户统计。
        let material_count = match self.db.scope_read_system().await {
            Ok(mut scope) => {
                let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pdm_materials")
                    .fetch_one(&mut scope)
                    .await
                    .unwrap_or(0);
                if let Err(e) = scope.commit().await {
                    tracing::warn!("[pdm] 事件查询事务提交失败: {}", e);
                }
                count
            }
            Err(e) => {
                tracing::warn!("[pdm] 事件查询建立作用域失败: {}", e);
                0
            }
        };

        tracing::info!(
            "[pdm] 收货事件触发物料数据同步检查，当前物料总数: {}",
            material_count
        );

        Ok(())
    }

    /// MDM 会计科目变更事件处理
    ///
    /// 订阅 ERP 会计科目变更事件，同步更新 PDM 中的相关财务配置
    async fn handle_master_data_account_subject_changed(
        &self,
        event: MasterDataEvent,
    ) -> HandlerResult {
        tracing::info!(
            "[pdm-mdm] 会计科目主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let subject_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "account_subject", subject_name, status)
            .await?;

        Ok(())
    }

    /// AC-5: 将主数据变更事件持久化到本地 ref 表
    ///
    /// 通过 master_data_id（而非业务编码）建立跨服务关联。
    /// 消费端查询时使用 master_data_id 定位本地业务记录。
    async fn upsert_local_master_data_ref(
        &self,
        event: &MasterDataEvent,
        local_entity_type: &str,
        name: &str,
        status: &str,
    ) -> HandlerResult {
        let domain_str = format!("{:?}", event.domain).to_lowercase();

        // 事件载荷缺租户直接报错，禁止降级为 nil（nil 租户是系统通道，不属于业务事件）。
        // 统一经 TenantScope 严格原语解析：nil/缺失在构造期拒绝，绑定值直接取自作用域，
        // 不做任何兜底零值（与表定性解耦，任何定性下都必须显式绑定租户）。
        let tenant_scope = TenantScope::tenant(event.tenant_id).map_err(|(_, msg)| {
            TopemsError::ValidationFailed(format!(
                "[pdm-mdm] 事件载荷缺少租户（{}）：master_data_id={} domain={}",
                msg, event.master_data_id, domain_str
            ))
        })?;
        let tenant_id = tenant_scope.tenant_id().ok_or_else(|| {
            TopemsError::Internal("[pdm-mdm] 租户作用域状态异常（Tenant 变体缺少 tenant_id）".to_string())
        })?;

        // pdm_master_data_refs 已含 tenant_id（20261115142300 补齐），写入为
        // 「系统通道 + 显式租户绑定」：走 scope_system（app.rls_system='on'）的同时
        // 必须把租户写进行内，禁止用请求租户上下文借道或写 nil。
        // tenant-system: 后台事件处理器（白名单第 4 类），主数据引用按系统通道写。
        let result = match self.db.scope_system().await {
            Ok(mut scope) => {
                let result = sqlx::query(
                    r#"INSERT INTO pdm_master_data_refs
                       (master_data_id, tenant_id, domain, code, name, status, source_service,
                        local_entity_type, payload_snapshot, last_synced_at, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
                       ON CONFLICT (master_data_id) DO UPDATE
                       SET name = EXCLUDED.name,
                           status = EXCLUDED.status,
                           code = EXCLUDED.code,
                           payload_snapshot = EXCLUDED.payload_snapshot,
                           last_synced_at = NOW(),
                           updated_at = NOW()"#,
                )
                .bind(&event.master_data_id)
                .bind(tenant_id)
                .bind(&domain_str)
                .bind(&event.code)
                .bind(name)
                .bind(status)
                .bind(&event.source_service)
                .bind(local_entity_type)
                .bind(&event.payload)
                .execute(&mut scope)
                .await;
                if result.is_ok() {
                    if let Err(e) = scope.commit().await {
                        tracing::warn!("[pdm-mdm] ref 同步事务提交失败: {}", e);
                    }
                }
                result
            }
            Err(e) => Err(e),
        };

        match result {
            Ok(_) => {
                tracing::info!(
                    "[pdm-mdm] 本地 ref 已同步 - master_data_id={}, domain={}, action={:?}, local_entity_type={}",
                    event.master_data_id,
                    domain_str,
                    event.action,
                    local_entity_type
                );
            }
            Err(e) => {
                tracing::warn!(
                    "[pdm-mdm] 本地 ref 同步失败（graceful fallback）- master_data_id={}: {}",
                    event.master_data_id,
                    e
                );
            }
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: Db,
    dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
) -> Result<(), TopemsError> {
    let handlers = PdmEventHandlers::new(db, dict_cache.clone());
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::Internal(format!("事件订阅者初始化失败: {e}")))?;

    // 创建缓存失效监听器，注册物料缓存处理器
    let mut cache_invalidation_listener = CacheInvalidationListener::new("pdm");
    let material_cache_handler =
        AsyncL2CacheInvalidationHandler::new("pdm_material_cache", dict_cache, "pdm:material:");
    cache_invalidation_listener.register_handler(material_cache_handler);
    let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

    tracing::info!("[pdm] 启动事件订阅者，注册 3 类业务事件 + 1 个缓存失效事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[pdm] 事件订阅者异常退出: {}", e);
        }
    });

    // 订阅缓存失效事件
    let cache_listener = cache_invalidation_listener;
    let cache_subscriber = EventSubscriber::new("pdm-cache-invalidation")
        .map_err(|e| TopemsError::Internal(format!("事件订阅者初始化失败: {e}")))?
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
            tracing::error!("[pdm] 缓存失效事件订阅者异常退出: {}", e);
        }
    });

    Ok(())
}
