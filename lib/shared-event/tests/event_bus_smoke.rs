//! 事件总线冒烟测试：验证 Redis Stream 发布 / 订阅消费 / DLQ 全链路（需 Redis）
//!
//! 运行（本地 Redis 可用时）：
//!   cargo test -p topems-shared-event --test event_bus_smoke -- --ignored
//!
//! 背景：TODO P0「事件总线升级（Redis Stream + ACK + DLQ）」已实现（publisher 默认 stream 模式 +
//! StreamSubscriber XREADGROUP/XACK + DeadLetterQueue），本测试验证链路真实可用。
//! 注意：stream key 为 `topems:stream:events:{EventType}`（不含 service_name），各测试用不同 EventType 避免 key 冲突。

use std::time::Duration;

use serde_json::json;
use topems_shared_event::event::dead_letter_queue::DeadLetterQueue;
use topems_shared_event::event::event_types::{Event, EventType};
use topems_shared_event::event::stream_publisher::StreamEventPublisher;
use topems_shared_event::event::stream_subscriber::StreamEventSubscriber;

/// 场景 1：stream 发布链路——publish 后 stream 长度增长
#[tokio::test]
#[ignore = "requires Redis"]
async fn stream_publish_smoke() {
    let event_type = EventType::HrmEmployeeCreated;
    let publisher = StreamEventPublisher::new("smoke-test").unwrap();
    let before = publisher.stream_length(&event_type).await.unwrap();
    publisher
        .publish_event(event_type.clone(), json!({"employee_id": "e1"}))
        .await
        .unwrap();
    let after = publisher.stream_length(&event_type).await.unwrap();
    assert!(
        after > before,
        "发布后 stream 长度应增长（{before} → {after}）"
    );
    let _ = publisher.delete_stream(&event_type).await;
}

/// 场景 2：DLQ 链路——push 后 size > 0，pop 能弹出
#[tokio::test]
#[ignore = "requires Redis"]
async fn dlq_push_pop_smoke() {
    let event_type = EventType::PmProjectCreated;
    let dlq = DeadLetterQueue::new().unwrap();
    let ev = Event::new(
        event_type.clone(),
        "smoke-test",
        json!({"project_id": "p1"}),
    );
    dlq.push(ev, "smoke test failure").await.unwrap();
    let size = dlq.size(&event_type.to_string()).await.unwrap();
    assert!(size > 0, "DLQ size 应 > 0");
    let popped = dlq.pop(&event_type.to_string()).await.unwrap();
    assert!(popped.is_some(), "DLQ 应能弹出死信消息");
}

/// 场景 3：订阅消费链路——publish 后消费者（XREADGROUP）收到事件
#[tokio::test]
#[ignore = "requires Redis"]
async fn subscriber_consumes_event_smoke() {
    let event_type = EventType::LimsSampleRegistered;
    let (tx, mut rx) = tokio::sync::mpsc::channel(4);

    let subscriber = StreamEventSubscriber::new("smoke-test-svc")
        .unwrap()
        .subscribe(event_type.clone(), move |ev| {
            let tx = tx.clone();
            async move {
                tx.send(ev.event_id).await.map_err(|e| e.to_string())?;
                Ok(())
            }
        });
    let listener = tokio::spawn(async move { subscriber.start_listening().await });

    // 等待消费者组建立
    tokio::time::sleep(Duration::from_millis(300)).await;

    let publisher = StreamEventPublisher::new("smoke-test-svc").unwrap();
    publisher
        .publish_event(event_type.clone(), json!({"sample_no": "S-001"}))
        .await
        .unwrap();

    let got = tokio::time::timeout(Duration::from_secs(3), rx.recv()).await;
    assert!(got.is_ok(), "消费者应收到发布的事件");
    let _ = publisher.delete_stream(&event_type).await;
    listener.abort();
}
