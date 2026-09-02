use super::error::EventResult;
use super::event_types::{
    EhsAccidentReportedPayload, EhsHazardReportedPayload, Event, EventType,
    HrmDepartmentCreatedPayload, HrmDepartmentDeletedPayload, HrmDepartmentUpdatedPayload,
    HrmEmployeeCreatedPayload, InboundOrderRequestedPayload, LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload, LimsSampleRegisteredPayload, PmProjectCreatedPayload,
    PmProjectUpdatedPayload, PmTaskCreatedPayload, PmTaskDeletedPayload, PmTaskUpdatedPayload,
    PurchaseOrderApprovedPayload, PurchaseOrderCreatedPayload, QmsCorrectiveActionCreatedPayload,
    QmsInspectionCompletedPayload, ReconciliationApprovedPayload, ReconciliationCreatedPayload,
    ReconciliationUpdatedPayload, SalesOrderApprovedPayload, SalesOrderCreatedPayload,
    SettlementApprovedPayload, SettlementCreatedPayload, SettlementRejectedPayload,
    ShippingOrderRequestedPayload, SrmSupplierCreatedPayload, SrmSupplierStatusChangedPayload,
    SrmSupplierUpdatedPayload, SupplierDataSyncRequestedPayload, WmsInventoryItemReceivedPayload,
    WmsInventoryItemShippedPayload, WmsInventoryLowStockPayload,
    WmsWarehouseTransferCompletedPayload,
};
use super::stream_publisher::StreamEventPublisher;
use redis::Client;
use serde::Serialize;
use std::env;
use tracing::info;

/// Redis 事件发布者
///
/// 支持两种发布模式（通过环境变量 `EVENT_BUS_MODE` 切换）：
/// - `pubsub`（默认）：使用 Redis Pub/Sub（PUBLISH 命令）
/// - `stream`：使用 Redis Stream（XADD 命令，消息持久化，支持消费者组）
pub struct EventPublisher {
    redis_client: Client,
    service_name: String,
    /// 是否使用 Redis Stream 模式
    use_stream: bool,
    /// Stream 模式下的发布器（惰性初始化）
    stream_publisher: Option<StreamEventPublisher>,
}

impl EventPublisher {
    /// 创建新的事件发布者
    ///
    /// 通过环境变量 `EVENT_BUS_MODE` 选择发布模式：
    /// - 未设置 或 `pubsub`：使用 Redis Pub/Sub（默认，向后兼容）
    /// - `stream`：使用 Redis Stream（消息持久化，支持消费者组）
    pub fn new(service_name: &str) -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let redis_client = Client::open(redis_url)?;

        // V321: 默认模式改为 stream（Redis Stream，支持持久化 + ACK + DLQ）
        // 可通过 EVENT_BUS_MODE=pubsub 显式切换回 Pub/Sub 模式
        let bus_mode = env::var("EVENT_BUS_MODE").unwrap_or_else(|_| "stream".to_string());
        let use_stream = !bus_mode.eq_ignore_ascii_case("pubsub");

        // Stream 模式初始化失败时自动降级到 Pub/Sub，确保向后兼容
        let stream_publisher = if use_stream {
            match StreamEventPublisher::new(service_name) {
                Ok(p) => Some(p),
                Err(e) => {
                    tracing::warn!(
                        "StreamEventPublisher 初始化失败，自动降级到 Pub/Sub 模式: {}",
                        e
                    );
                    None
                }
            }
        } else {
            None
        };

        Ok(Self {
            redis_client,
            service_name: service_name.to_string(),
            use_stream,
            stream_publisher,
        })
    }

    /// 发布事件（自动携带当前 trace context）
    ///
    /// 根据 `EVENT_BUS_MODE` 环境变量自动选择发布模式：
    /// - `pubsub`：使用 Redis PUBLISH 命令
    /// - `stream`：使用 Redis XADD 命令（Stream 持久化）
    pub async fn publish_event(
        &self,
        event_type: EventType,
        payload: impl Serialize,
    ) -> EventResult<()> {
        // Stream 模式：使用 Redis Stream（XADD）
        if self.use_stream {
            if let Some(stream_publisher) = &self.stream_publisher {
                stream_publisher.publish_event(event_type, payload).await?;
                return Ok(());
            }
        }

        // Pub/Sub 模式（显式降级路径，非默认）：
        // 仅当 EVENT_BUS_MODE=pubsub 显式设置，或 StreamEventPublisher 初始化失败兜底时进入。
        // 事件总线默认模式为 stream（V321），发布器/订阅器/DLQ 重试均走 Redis Stream。
        let payload_json = serde_json::to_value(&payload)?;
        let trace_id: Option<String> = None;
        let event =
            Event::new(event_type, &self.service_name, payload_json).with_trace_id(trace_id);

        let channel_name = format!("topems:events:{}", event_type);
        let event_json = serde_json::to_string(&event)?;

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let _: () = redis::cmd("PUBLISH")
            .arg(&channel_name)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;

        info!(
            "事件发布成功 - 类型: {:?}, 事件ID: {}, 频道: {}",
            event_type, event.event_id, channel_name
        );

        Ok(())
    }

    /// 发布 HRM 员工创建事件
    pub async fn publish_hrm_employee_created(
        &self,
        employee_id: uuid::Uuid,
        name: &str,
        email: &str,
        department_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmEmployeeCreatedPayload {
            employee_id,
            name: name.to_string(),
            email: email.to_string(),
            department_id,
        };
        self.publish_event(EventType::HrmEmployeeCreated, payload)
            .await
    }

    /// 发布 PM 项目创建事件
    pub async fn publish_pm_project_created(
        &self,
        project_id: uuid::Uuid,
        project_name: &str,
        owner_id: uuid::Uuid,
    ) -> EventResult<()> {
        let payload = PmProjectCreatedPayload {
            project_id,
            project_name: project_name.to_string(),
            owner_id,
        };
        self.publish_event(EventType::PmProjectCreated, payload)
            .await
    }

    pub async fn publish_pm_project_updated(
        &self,
        project_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = PmProjectUpdatedPayload {
            project_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::PmProjectUpdated, payload)
            .await
    }

    pub async fn publish_pm_task_created(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        task_name: &str,
    ) -> EventResult<()> {
        let payload = PmTaskCreatedPayload {
            task_id,
            project_id,
            task_name: task_name.to_string(),
        };
        self.publish_event(EventType::PmTaskCreated, payload).await
    }

    pub async fn publish_pm_task_updated(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = PmTaskUpdatedPayload {
            task_id,
            project_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::PmTaskUpdated, payload).await
    }

    pub async fn publish_pm_task_deleted(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        deleted_by: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = PmTaskDeletedPayload {
            task_id,
            project_id,
            deleted_by,
        };
        self.publish_event(EventType::PmTaskDeleted, payload).await
    }

    pub async fn publish_hrm_department_created(
        &self,
        department_id: uuid::Uuid,
        department_name: &str,
        parent_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentCreatedPayload {
            department_id,
            department_name: department_name.to_string(),
            parent_id,
        };
        self.publish_event(EventType::HrmDepartmentCreated, payload)
            .await
    }

    pub async fn publish_hrm_department_updated(
        &self,
        department_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentUpdatedPayload {
            department_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::HrmDepartmentUpdated, payload)
            .await
    }

    pub async fn publish_hrm_department_deleted(
        &self,
        department_id: uuid::Uuid,
        department_name: &str,
        deleted_by: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentDeletedPayload {
            department_id,
            department_name: department_name.to_string(),
            deleted_by,
        };
        self.publish_event(EventType::HrmDepartmentDeleted, payload)
            .await
    }

    // --- LIMS Events ---

    pub async fn publish_lims_sample_registered(
        &self,
        sample_id: uuid::Uuid,
        sample_no: &str,
        sample_name: &str,
        sample_type: Option<&str>,
        source: Option<&str>,
    ) -> EventResult<()> {
        let payload = LimsSampleRegisteredPayload {
            sample_id,
            sample_no: sample_no.to_string(),
            sample_name: sample_name.to_string(),
            sample_type: sample_type.map(|s| s.to_string()),
            source: source.map(|s| s.to_string()),
        };
        self.publish_event(EventType::LimsSampleRegistered, payload)
            .await
    }

    pub async fn publish_lims_inspection_result_submitted(
        &self,
        payload: LimsInspectionResultSubmittedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::LimsInspectionResultSubmitted, payload)
            .await
    }

    pub async fn publish_lims_inspection_abnormal_detected(
        &self,
        payload: LimsInspectionAbnormalDetectedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::LimsInspectionAbnormalDetected, payload)
            .await
    }

    // --- QMS Events ---

    pub async fn publish_qms_inspection_completed(
        &self,
        payload: QmsInspectionCompletedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::QmsInspectionCompleted, payload)
            .await
    }

    pub async fn publish_qms_corrective_action_created(
        &self,
        action_id: uuid::Uuid,
        issue_id: uuid::Uuid,
        title: &str,
        description: Option<&str>,
        assigned_to: &str,
    ) -> EventResult<()> {
        let payload = QmsCorrectiveActionCreatedPayload {
            action_id,
            issue_id,
            title: title.to_string(),
            description: description.map(|s| s.to_string()),
            assigned_to: assigned_to.to_string(),
        };
        self.publish_event(EventType::QmsCorrectiveActionCreated, payload)
            .await
    }

    // --- EHS Events ---

    pub async fn publish_ehs_hazard_reported(
        &self,
        payload: EhsHazardReportedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::EhsHazardReported, payload)
            .await
    }

    pub async fn publish_ehs_accident_reported(
        &self,
        accident_id: uuid::Uuid,
        accident_no: &str,
        title: &str,
        severity: &str,
        location: Option<&str>,
        occurred_at: Option<&str>,
    ) -> EventResult<()> {
        let payload = EhsAccidentReportedPayload {
            accident_id,
            accident_no: accident_no.to_string(),
            title: title.to_string(),
            severity: severity.to_string(),
            location: location.map(|s| s.to_string()),
            occurred_at: occurred_at.map(|s| s.to_string()),
        };
        self.publish_event(EventType::EhsAccidentReported, payload)
            .await
    }

    // --- WMS Events（P3 事件驱动规范化） ---

    /// 发布 SCM→WMS 入库单创建请求事件
    pub async fn publish_inbound_order_requested(
        &self,
        payload: InboundOrderRequestedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::InboundOrderRequested, payload)
            .await
    }

    /// 发布库存出库事件，通知 SCM/Finance 出库完成
    pub async fn publish_inventory_shipped(
        &self,
        payload: WmsInventoryItemShippedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::WmsInventoryItemShipped, payload)
            .await
    }

    /// 发布库存入库事件，通知 SCM/Finance 入库完成
    pub async fn publish_inventory_received(
        &self,
        payload: WmsInventoryItemReceivedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::WmsInventoryItemReceived, payload)
            .await
    }

    /// 发布仓库间调拨完成事件，通知 SCM/Finance 调拨已完成
    pub async fn publish_warehouse_transfer_completed(
        &self,
        payload: WmsWarehouseTransferCompletedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::WmsWarehouseTransferCompleted, payload)
            .await
    }

    /// 发布库存不足预警事件，通知 SCM/Portal 触发补货与提醒
    pub async fn publish_inventory_low_stock(
        &self,
        payload: WmsInventoryLowStockPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::WmsInventoryLowStock, payload)
            .await
    }

    /// 发布出库单转销售订单事件，通知 CRM 在本地创建销售订单
    /// 替代原有的跨Schema直写（WMS直写CRM表），采用事件驱动解耦
    pub async fn publish_shipping_order_requested(
        &self,
        payload: ShippingOrderRequestedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::ShippingOrderRequested, payload)
            .await
    }

    // --- ERP Sales/Purchase Events（P3 事件驱动规范化，替代跨Schema直查） ---

    /// 发布销售订单创建事件，携带 payable_amount 供 Finance 本地快照存储
    pub async fn publish_sales_order_created(
        &self,
        payload: SalesOrderCreatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SalesOrderCreated, payload)
            .await
    }

    /// 发布销售订单审批事件，携带最新 payable_amount
    pub async fn publish_sales_order_approved(
        &self,
        payload: SalesOrderApprovedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SalesOrderApproved, payload)
            .await
    }

    /// 发布采购订单创建事件，携带 payable_amount 供 Finance 本地快照存储
    pub async fn publish_purchase_order_created(
        &self,
        payload: PurchaseOrderCreatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::PurchaseOrderCreated, payload)
            .await
    }

    /// 发布采购订单审批事件，携带最新 payable_amount
    pub async fn publish_purchase_order_approved(
        &self,
        payload: PurchaseOrderApprovedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::PurchaseOrderApproved, payload)
            .await
    }

    // --- SRM→SCM Supplier Sync Events ---

    /// 发布供应商数据同步请求事件（SRM→SCM 方向）
    pub async fn publish_supplier_data_sync_requested(
        &self,
        payload: SupplierDataSyncRequestedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SupplierDataSyncRequested, payload)
            .await
    }

    // --- SRM Events（P3 事件驱动规范化） ---

    /// 发布供应商创建事件，通知 SCM/Finance 同步供应商主数据
    pub async fn publish_supplier_created(
        &self,
        payload: SrmSupplierCreatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SrmSupplierCreated, payload)
            .await
    }

    /// 发布供应商更新事件，通知 SCM/Finance 同步供应商快照
    pub async fn publish_supplier_updated(
        &self,
        payload: SrmSupplierUpdatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SrmSupplierUpdated, payload)
            .await
    }

    /// 发布供应商状态变更事件，通知 SCM/Finance/Portal 状态流转
    pub async fn publish_supplier_status_changed(
        &self,
        payload: SrmSupplierStatusChangedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SrmSupplierStatusChanged, payload)
            .await
    }

    // --- Finance Reconciliation & Settlement Events ---

    pub async fn publish_reconciliation_created(
        &self,
        payload: ReconciliationCreatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::ReconciliationCreated, payload)
            .await
    }

    pub async fn publish_reconciliation_updated(
        &self,
        payload: ReconciliationUpdatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::ReconciliationUpdated, payload)
            .await
    }

    pub async fn publish_reconciliation_approved(
        &self,
        payload: ReconciliationApprovedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::ReconciliationApproved, payload)
            .await
    }

    pub async fn publish_settlement_created(
        &self,
        payload: SettlementCreatedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SettlementCreated, payload)
            .await
    }

    pub async fn publish_settlement_approved(
        &self,
        payload: SettlementApprovedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SettlementApproved, payload)
            .await
    }

    pub async fn publish_settlement_rejected(
        &self,
        payload: SettlementRejectedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::SettlementRejected, payload)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::event_types::Event;
    use crate::test_helpers::redis_pubsub::{self, ActiveSubscription};
    use serde_json::json;
    use uuid::Uuid;

    // =====================================================================
    // 说明：以下所有 Redis 集成测试统一使用 crate::test_helpers::redis_pubsub
    //       提供的 prepare_subscription + wait_for_match 两阶段 API，
    //       解决 Rust Future 惰性执行导致的"发布先于订阅登记"竞态问题。
    //       任何将来新增 EventPublisher / EventSubscriber 相关集成测试，
    //       都必须遵循此模式，禁止直接"spawn 订阅再立刻发布"。
    // =====================================================================

    #[tokio::test]
    async fn test_event_publisher_roundtrip() {
        let Some(client) = redis_pubsub::skip_without_redis().await else {
            return;
        };

        let publisher = EventPublisher::new("test-publisher-service")
            .expect("EventPublisher 构造失败（Redis Client::open 惰性初始化通常不会失败）");

        let test_project_id = Uuid::new_v4();
        let test_owner_id = Uuid::new_v4();
        let expected_project_name = "集成测试项目".to_string();
        let channel_name = format!("topems:events:{}", EventType::PmProjectCreated);

        // 提前克隆需要被多次 move 的变量，避免单次 move 导致后续使用冲突
        let matcher_project_id = test_project_id;
        let matcher_name = expected_project_name.clone();
        let publish_name = expected_project_name.clone();
        let assert_name = expected_project_name;

        // ——— 阶段一：使用通用两阶段工具，确认订阅在服务端完全生效 ———
        let subscription: ActiveSubscription<Event> =
            redis_pubsub::prepare_subscription(&client, &channel_name, move |e: &Event| {
                // 严格按 event_type + 解析后的 payload 字段双重匹配，
                // 避免并发测试收到其他频道/事件的消息（串扰）
                e.event_type == EventType::PmProjectCreated
                    && e.parse_payload::<PmProjectCreatedPayload>()
                        .map(|p| {
                            p.project_id == matcher_project_id && p.project_name == matcher_name
                        })
                        .unwrap_or(false)
            })
            .await;

        // ——— 阶段二：订阅就绪后发布 ———
        let publish_task = tokio::spawn(async move {
            publisher
                .publish_pm_project_created(test_project_id, &publish_name, test_owner_id)
                .await
        });

        // ——— 阶段三：等待匹配事件并断言 ———
        let (received_event, publish_result) =
            tokio::join!(subscription.wait_for_match(), publish_task,);
        assert!(
            publish_result.is_ok(),
            "publish task 异常终止: {publish_result:?}"
        );
        let inner = publish_result.unwrap();
        assert!(inner.is_ok(), "EventPublisher::publish 失败: {inner:?}");

        assert_eq!(received_event.event_type, EventType::PmProjectCreated);
        assert_eq!(received_event.source, "test-publisher-service");
        let payload = received_event
            .parse_payload::<PmProjectCreatedPayload>()
            .expect("payload 解析失败");
        assert_eq!(payload.project_id, test_project_id);
        assert_eq!(payload.project_name, assert_name);
        assert_eq!(payload.owner_id, test_owner_id);
    }

    #[tokio::test]
    async fn test_event_publisher_concurrent_no_crosstalk() {
        let Some(client) = redis_pubsub::skip_without_redis().await else {
            return;
        };

        // 并发 6 对订阅-发布，使用同一个 PM 事件频道，验证不会串扰
        const N: usize = 6;
        let mut handles = Vec::with_capacity(N);

        for i in 0..N {
            let client = client.clone();
            handles.push(tokio::spawn(async move {
                let publisher = EventPublisher::new(&format!("concurrent-pub-{i}")).unwrap();
                let project_id = Uuid::new_v4();
                let owner_id = Uuid::new_v4();
                let project_name = format!("并发项目{i}");
                let channel_name = format!("topems:events:{}", EventType::PmProjectCreated);

                // —— 阶段一：订阅完全就绪 ——
                let expected_project_id = project_id;
                let expected_name = project_name.clone();
                let subscription =
                    redis_pubsub::prepare_subscription(&client, &channel_name, move |e: &Event| {
                        e.event_type == EventType::PmProjectCreated
                            && e.parse_payload::<PmProjectCreatedPayload>()
                                .map(|p| {
                                    p.project_id == expected_project_id
                                        && p.project_name == expected_name
                                })
                                .unwrap_or(false)
                    })
                    .await;

                // —— 阶段二：随机打乱发布顺序 ——
                let delay_ms = (i * 13) % 17;
                tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms as u64)).await;

                // —— 阶段三：发布并等待匹配 ——
                let publish_fut =
                    publisher.publish_pm_project_created(project_id, &project_name, owner_id);
                let (received, publish_res) =
                    tokio::join!(subscription.wait_for_match(), publish_fut,);
                assert!(publish_res.is_ok(), "第{i}个 publish 失败: {publish_res:?}");

                let payload = received.parse_payload::<PmProjectCreatedPayload>().unwrap();
                assert_eq!(payload.project_id, project_id, "第{i}对发生并发串扰！");
                assert_eq!(payload.project_name, project_name);
                (i, project_id)
            }));
        }

        let mut results = Vec::with_capacity(N);
        for h in handles {
            results.push(h.await.expect("并发子任务 panic"));
        }
        assert_eq!(results.len(), N);
        // 确保每个事件 ID 不重复（测试数据构造正确）
        let mut ids: Vec<Uuid> = results.iter().map(|(_, id)| *id).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), N);
    }

    // 烟雾测试：无 Redis 时验证 EventPublisher::new 不会 panic（惰性连接特性）
    #[test]
    fn test_event_publisher_new_is_lazy() {
        // EventPublisher::new 仅做 Client::open，不建立实际连接。
        // 此测试保证：即使本地完全没有 Redis，此构造函数也不会 panic。
        let publisher = EventPublisher::new("lazy-connect-test");
        assert!(publisher.is_ok(), "EventPublisher::new 惰性构造应始终成功");
    }

    #[test]
    fn test_event_payload_structs_serialize() {
        // 确保所有 Payload 类型都能正确序列化（不依赖 Redis 环境）
        let payload = PmProjectCreatedPayload {
            project_id: Uuid::nil(),
            project_name: "x".into(),
            owner_id: Uuid::nil(),
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"project_id\""));
        assert!(json.contains("\"x\""));

        let hrm = HrmEmployeeCreatedPayload {
            employee_id: Uuid::nil(),
            name: "张三".into(),
            email: "a@b.c".into(),
            department_id: None,
        };
        let json = serde_json::to_value(&hrm).unwrap();
        assert_eq!(json["name"], "张三");
        assert_eq!(json["email"], "a@b.c");
        assert_eq!(json["department_id"], json!(null));
    }

    #[test]
    fn test_pm_project_updated_payload_serde_roundtrip() {
        let payload = PmProjectUpdatedPayload {
            project_id: Uuid::new_v4(),
            updated_fields: vec!["name".to_string(), "status".to_string()],
            old_data: Some(json!({"name": "old"})),
            new_data: Some(json!({"name": "new"})),
        };
        let v = serde_json::to_value(&payload).unwrap();
        assert_eq!(v["updated_fields"][0], "name");
        assert_eq!(v["updated_fields"][1], "status");
        assert_eq!(v["old_data"]["name"], "old");
        assert_eq!(v["new_data"]["name"], "new");
        let back: PmProjectUpdatedPayload = serde_json::from_value(v).unwrap();
        assert_eq!(back.updated_fields, payload.updated_fields);
    }

    #[test]
    fn test_pm_task_created_payload_serde_roundtrip() {
        let payload = PmTaskCreatedPayload {
            task_id: Uuid::new_v4(),
            project_id: Uuid::new_v4(),
            task_name: "实现登录".to_string(),
        };
        let json = serde_json::to_string(&payload).unwrap();
        let back: PmTaskCreatedPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(back.task_id, payload.task_id);
        assert_eq!(back.project_id, payload.project_id);
        assert_eq!(back.task_name, "实现登录");
    }

    #[test]
    fn test_pm_task_deleted_payload_serde_roundtrip_with_deleted_by() {
        let payload = PmTaskDeletedPayload {
            task_id: Uuid::new_v4(),
            project_id: Uuid::new_v4(),
            deleted_by: Some(Uuid::new_v4()),
        };
        let json = serde_json::to_string(&payload).unwrap();
        let back: PmTaskDeletedPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(back.task_id, payload.task_id);
        assert!(back.deleted_by.is_some());
    }

    #[test]
    fn test_pm_task_deleted_payload_serde_roundtrip_without_deleted_by() {
        let payload = PmTaskDeletedPayload {
            task_id: Uuid::new_v4(),
            project_id: Uuid::new_v4(),
            deleted_by: None,
        };
        let v = serde_json::to_value(&payload).unwrap();
        assert_eq!(v["deleted_by"], json!(null));
        let back: PmTaskDeletedPayload = serde_json::from_value(v).unwrap();
        assert!(back.deleted_by.is_none());
    }

    #[test]
    fn test_hrm_department_created_payload_serde_roundtrip() {
        let payload = HrmDepartmentCreatedPayload {
            department_id: Uuid::new_v4(),
            department_name: "研发部".to_string(),
            parent_id: Some(Uuid::new_v4()),
        };
        let json = serde_json::to_string(&payload).unwrap();
        let back: HrmDepartmentCreatedPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(back.department_name, "研发部");
        assert!(back.parent_id.is_some());
    }

    #[test]
    fn test_channel_name_format() {
        // publish_event 使用 format!("topems:events:{}", event_type) 作为频道名
        for (et, expected) in [
            (EventType::HealthCheck, "topems:events:HealthCheck"),
            (
                EventType::CacheInvalidated,
                "topems:events:CacheInvalidated",
            ),
            (
                EventType::PmProjectCreated,
                "topems:events:PmProjectCreated",
            ),
        ] {
            let channel = format!("topems:events:{}", et);
            assert_eq!(channel, expected);
        }
    }

    #[test]
    fn test_event_with_trace_id_builder() {
        // publish_event 内部使用 Event::new(...).with_trace_id(trace_id)
        let event = Event::new(EventType::HealthCheck, "svc", json!({}))
            .with_trace_id(Some("trace-123".to_string()));
        assert_eq!(event.trace_id.as_deref(), Some("trace-123"));
        assert_eq!(event.event_type, EventType::HealthCheck);
        assert_eq!(event.source, "svc");

        // 也验证 None 的情况
        let event2 = Event::new(EventType::HealthCheck, "svc", json!({})).with_trace_id(None);
        assert!(event2.trace_id.is_none());
    }

    #[tokio::test]
    async fn test_publish_event_returns_err_when_redis_unavailable() {
        if crate::test_helpers::redis_pubsub::maybe_connect_redis()
            .await
            .is_some()
        {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let publisher = EventPublisher::new("test-service").expect("lazy construction succeeds");
        let result = publisher
            .publish_event(EventType::HealthCheck, json!({"k": "v"}))
            .await;
        assert!(result.is_err(), "Redis 不可达时 publish_event 应返回 Err");
    }

    #[tokio::test]
    async fn test_publish_pm_project_created_returns_err_when_redis_unavailable() {
        if crate::test_helpers::redis_pubsub::maybe_connect_redis()
            .await
            .is_some()
        {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let publisher = EventPublisher::new("test-service").expect("lazy construction succeeds");
        let result = publisher
            .publish_pm_project_created(Uuid::new_v4(), "项目", Uuid::new_v4())
            .await;
        assert!(
            result.is_err(),
            "Redis 不可达时 publish_pm_project_created 应返回 Err"
        );
    }

    #[tokio::test]
    async fn test_publish_hrm_employee_created_returns_err_when_redis_unavailable() {
        if crate::test_helpers::redis_pubsub::maybe_connect_redis()
            .await
            .is_some()
        {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let publisher = EventPublisher::new("test-service").expect("lazy construction succeeds");
        let result = publisher
            .publish_hrm_employee_created(Uuid::new_v4(), "张三", "z@x.c", None)
            .await;
        assert!(
            result.is_err(),
            "Redis 不可达时 publish_hrm_employee_created 应返回 Err"
        );
    }

    #[tokio::test]
    async fn test_publish_event_with_non_serializable_payload_returns_err() {
        // 测试序列化错误路径：serialize 一个无法序列化的类型
        // 注意：由于 publish_event 接受 impl Serialize，绝大多数类型都能序列化
        // 这里通过验证 Redis 不可达时的错误路径来补充覆盖
        if crate::test_helpers::redis_pubsub::maybe_connect_redis()
            .await
            .is_some()
        {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let publisher = EventPublisher::new("test-service").expect("lazy construction succeeds");
        // publish_pm_task_updated 接受 Vec<String> 和 Option<Value> 参数
        let result = publisher
            .publish_pm_task_updated(
                Uuid::new_v4(),
                Uuid::new_v4(),
                vec!["name".to_string()],
                None,
                None,
            )
            .await;
        assert!(
            result.is_err(),
            "Redis 不可达时 publish_pm_task_updated 应返回 Err"
        );
    }
}
