//! PDM 服务事件流集成测试
//!
//! 验证 MdmEventService 发布的 MasterDataEvent 能通过 Redis Pub/Sub 被
//! 正确接收。使用通用两阶段 API（prepare_subscription + wait_for_match）
//! 消除"Future 惰性执行 → 发布先于订阅登记 → 消息丢失"竞态。
//!
//! 运行命令:
//! cargo test -p topems-pdm --test event_flow_integration -- --test-threads=1

use topems_shared::event::{
    MasterDataAction, MasterDataDomain, MasterDataEvent,
};
use topems_shared::test_helpers::redis_pubsub::{self, ActiveSubscription};
use uuid::Uuid;

// =====================================================================
// 规范说明：
// 所有涉及 Redis Pub/Sub 的测试必须使用 topems_shared::test_helpers::redis_pubsub
// 的两阶段 API。禁止"spawn 订阅任务后立刻 publish"的旧模式。
// =====================================================================

/// 验证 MdmEventService.publish_material_event 发布的事件能被正确接收。
///
/// 此测试不依赖 PDM 数据库（MdmEventService.publish_material_event 内部
/// 会尝试 publish_to_rabbitmq，但 RabbitMQ 不可用时不影响 Redis publish 路径）。
#[tokio::test]
async fn test_pdm_material_event_publish_and_subscribe() {
    let Some(client) = redis_pubsub::skip_without_redis().await else { return };

    let tenant_id = Uuid::new_v4();
    let material_id = Uuid::new_v4();

    // 构造与 MdmEventService.publish_material_event 相同的 channel
    let channel = format!("topems:master_data:{}", MasterDataDomain::Material.prefix());

    // ——— 阶段一：先 await 订阅完全就绪 ———
    let expected_tenant = tenant_id;
    let subscription: ActiveSubscription<MasterDataEvent> =
        redis_pubsub::prepare_subscription(&client, &channel, move |e: &MasterDataEvent| {
            e.domain == MasterDataDomain::Material
                && e.tenant_id == expected_tenant
                && e.action == MasterDataAction::Created
        })
        .await;

    // ——— 阶段二：订阅就绪后，手动构造并发布事件 ———
    // （不直接调用 MdmEventService，因为它需要 PgPool 且会尝试 RabbitMQ；
    //  这里验证的是 Redis Pub/Sub 通道本身的一致性）
    let event = MasterDataEvent::new(
        tenant_id,
        MasterDataDomain::Material,
        MasterDataAction::Created,
        format!("mat-test-{}", &Uuid::new_v4().to_string()[..8]),
        "MATTEST001".to_string(),
        "pdm",
        serde_json::json!({
            "id": material_id,
            "material_no": "MAT-TEST-001",
            "name": "测试物料",
            "spec": "100x200mm",
            "unit": "个",
            "status": "active"
        }),
    );
    let expected_event_id = event.event_id;

    let publish_task = tokio::spawn(async move { event.publish().await });

    // ——— 阶段三：等待匹配事件并断言 ———
    let (received, publish_result) = tokio::join!(
        subscription.wait_for_match(),
        publish_task,
    );
    assert!(publish_result.is_ok(), "publish task 异常: {publish_result:?}");
    let inner = publish_result.unwrap();
    assert!(inner.is_ok(), "MasterDataEvent::publish 失败: {inner:?}");

    assert_eq!(received.event_id, expected_event_id);
    assert_eq!(received.domain, MasterDataDomain::Material);
    assert_eq!(received.action, MasterDataAction::Created);
    assert_eq!(received.source_service, "pdm");
    assert_eq!(received.tenant_id, tenant_id);
}

/// 并发测试：多组 Material 事件同时发布，验证 event_id 过滤不串扰。
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn test_pdm_material_event_concurrent_no_crosstalk() {
    let Some(client) = redis_pubsub::skip_without_redis().await else { return };

    const N: usize = 5;
    let tenant_id = Uuid::new_v4();
    let channel = format!("topems:master_data:{}", MasterDataDomain::Material.prefix());

    let mut handles = Vec::with_capacity(N);

    for i in 0..N {
        let client = client.clone();
        let tenant = tenant_id;
        let ch = channel.clone();
        handles.push(tokio::spawn(async move {
            let event = MasterDataEvent::new(
                tenant,
                MasterDataDomain::Material,
                MasterDataAction::Updated,
                format!("mat-cc-{i:03}"),
                format!("MATCC{i:03}"),
                "pdm",
                serde_json::json!({"seq": i, "name": format!("并发物料{i}")}),
            );
            let expected_event_id = event.event_id;

            // —— 阶段一：订阅完全就绪 ——
            let sub: ActiveSubscription<MasterDataEvent> =
                redis_pubsub::prepare_subscription(&client, &ch, move |e: &MasterDataEvent| {
                    e.event_id == expected_event_id
                })
                .await;

            // —— 阶段二：随机延迟 ——
            let delay = (i * 11) % 13;
            tokio::time::sleep(tokio::time::Duration::from_millis(delay as u64)).await;

            // —— 阶段三：发布并等待 ——
            let pub_task = tokio::spawn(async move { event.publish().await });
            let (received, pub_res) = tokio::join!(sub.wait_for_match(), pub_task);
            assert!(pub_res.is_ok(), "第{i}个 publish 失败: {pub_res:?}");
            let inner = pub_res.unwrap();
            assert!(inner.is_ok(), "第{i}个 publish 内部错误: {inner:?}");

            assert_eq!(
                received.event_id, expected_event_id,
                "PDM 并发串扰！第{i}对收到了非本对消息"
            );
            assert_eq!(received.domain, MasterDataDomain::Material);
            assert_eq!(received.tenant_id, tenant);
            (i, expected_event_id)
        }));
    }

    let mut results = Vec::with_capacity(N);
    for h in handles {
        results.push(h.await.expect("子任务 panic"));
    }
    assert_eq!(results.len(), N);

    let mut ids: Vec<Uuid> = results.iter().map(|(_, id)| *id).collect();
    ids.sort();
    ids.dedup();
    assert_eq!(ids.len(), N, "存在重复 event_id");
}
