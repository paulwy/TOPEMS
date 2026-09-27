//! EHS 服务事件流集成测试
//!
//! 验证 EHS 订阅的事件类型（LIMS 异常检测、QMS 纠正措施、HRM 员工变更）
//! 能通过 Redis Pub/Sub 正确传递。使用通用两阶段 API
//! （prepare_subscription + wait_for_match）消除竞态。
//!
//! 运行命令:
//! cargo test -p topems-ehs --test event_flow_integration -- --test-threads=1

use topems_shared_event::event::{
    Event, EventPublisher, EventType, HrmEmployeeCreatedPayload,
    LimsInspectionAbnormalDetectedPayload, QmsCorrectiveActionCreatedPayload,
};
use topems_shared_event::test_helpers::redis_pubsub::{self, ActiveSubscription};
use uuid::Uuid;

// =====================================================================
// 规范说明：
// 所有涉及 Redis Pub/Sub 的测试必须使用 topems_shared::test_helpers::redis_pubsub
// 的两阶段 API。禁止"spawn 订阅任务后立刻 publish"的旧模式。
// =====================================================================

/// 验证 EventPublisher 发布的 HrmEmployeeCreated 事件能被正确接收。
///
/// EHS 的 EventSubscriber 订阅了 HrmEmployeeCreated + HrmEmployeeUpdated，
/// 此测试验证该事件类型的 Redis Pub/Sub 通道端到端可用。
#[tokio::test]
async fn test_ehs_hrm_employee_event_roundtrip() {
    let Some((client, _guard)) = redis_pubsub::skip_without_redis().await else {
        return;
    };

    let publisher = EventPublisher::new("ehs-test-publisher").unwrap();
    let employee_id = Uuid::new_v4();
    let department_id = Uuid::new_v4();
    let employee_name = "测试员工-EHS".to_string();
    let channel = format!("topems:events:{}", EventType::HrmEmployeeCreated);

    // ——— 阶段一：订阅完全就绪 ———
    let match_emp_id = employee_id;
    let match_name = employee_name.clone();
    let subscription: ActiveSubscription<Event> =
        redis_pubsub::prepare_subscription(&client, &channel, move |e: &Event| {
            e.event_type == EventType::HrmEmployeeCreated
                && e.parse_payload::<HrmEmployeeCreatedPayload>()
                    .map(|p| p.employee_id == match_emp_id && p.name == match_name)
                    .unwrap_or(false)
        })
        .await;

    // ——— 阶段二：发布事件 ———
    let publish_name = employee_name.clone();
    let publish_task = tokio::spawn(async move {
        publisher
            .publish_hrm_employee_created(
                employee_id,
                &publish_name,
                "ehs-test@topems.local",
                Some(department_id),
            )
            .await
    });

    // ——— 阶段三：等待并断言 ———
    let (received, pub_result) = tokio::join!(subscription.wait_for_match(), publish_task);
    assert!(pub_result.is_ok(), "publish task 异常: {pub_result:?}");
    let inner = pub_result.unwrap();
    assert!(inner.is_ok(), "EventPublisher::publish 失败: {inner:?}");

    assert_eq!(received.event_type, EventType::HrmEmployeeCreated);
    assert_eq!(received.source, "ehs-test-publisher");
    let payload = received
        .parse_payload::<HrmEmployeeCreatedPayload>()
        .unwrap();
    assert_eq!(payload.employee_id, employee_id);
    assert_eq!(payload.name, employee_name);
    assert_eq!(payload.email, "ehs-test@topems.local");
    assert_eq!(payload.department_id, Some(department_id));
}

/// 验证 LIMS 异常检测事件端到端可达。
#[tokio::test]
async fn test_ehs_lims_abnormal_event_roundtrip() {
    let Some((client, _guard)) = redis_pubsub::skip_without_redis().await else {
        return;
    };

    let publisher = EventPublisher::new("ehs-lims-test").unwrap();
    let task_id = Uuid::new_v4();
    let sample_id = Uuid::new_v4();
    let channel = format!(
        "topems:events:{}",
        EventType::LimsInspectionAbnormalDetected
    );

    let match_sample = sample_id;
    let subscription: ActiveSubscription<Event> =
        redis_pubsub::prepare_subscription(&client, &channel, move |e: &Event| {
            e.event_type == EventType::LimsInspectionAbnormalDetected
                && e.parse_payload::<LimsInspectionAbnormalDetectedPayload>()
                    .map(|p| p.sample_id == match_sample)
                    .unwrap_or(false)
        })
        .await;

    let pub_task = tokio::spawn(async move {
        publisher
            .publish_event(
                EventType::LimsInspectionAbnormalDetected,
                LimsInspectionAbnormalDetectedPayload {
                    task_id,
                    task_no: "LIMS-TASK-001".to_string(),
                    sample_id,
                    sample_no: "SMP-001".to_string(),
                    test_item: "重金属检测".to_string(),
                    abnormal_data: serde_json::json!({"value": 0.85, "limit": 0.50}),
                    conclusion: "不合格".to_string(),
                },
            )
            .await
    });

    let (received, pub_result) = tokio::join!(subscription.wait_for_match(), pub_task);
    assert!(pub_result.is_ok(), "publish task 异常: {pub_result:?}");
    let inner = pub_result.unwrap();
    assert!(inner.is_ok(), "publish 失败: {inner:?}");

    assert_eq!(
        received.event_type,
        EventType::LimsInspectionAbnormalDetected
    );
    assert_eq!(received.source, "ehs-lims-test");
    let payload = received
        .parse_payload::<LimsInspectionAbnormalDetectedPayload>()
        .unwrap();
    assert_eq!(payload.sample_id, sample_id);
    assert_eq!(payload.task_id, task_id);
    assert_eq!(payload.conclusion, "不合格");
}

/// 验证 QMS 纠正措施事件端到端可达。
#[tokio::test]
async fn test_ehs_qms_corrective_action_event_roundtrip() {
    let Some((client, _guard)) = redis_pubsub::skip_without_redis().await else {
        return;
    };

    let publisher = EventPublisher::new("ehs-qms-test").unwrap();
    let action_id = Uuid::new_v4();
    let channel = format!("topems:events:{}", EventType::QmsCorrectiveActionCreated);

    let match_action = action_id;
    let subscription: ActiveSubscription<Event> =
        redis_pubsub::prepare_subscription(&client, &channel, move |e: &Event| {
            e.event_type == EventType::QmsCorrectiveActionCreated
                && e.parse_payload::<QmsCorrectiveActionCreatedPayload>()
                    .map(|p| p.action_id == match_action)
                    .unwrap_or(false)
        })
        .await;

    let issue_id = Uuid::new_v4();
    let pub_task = tokio::spawn(async move {
        publisher
            .publish_event(
                EventType::QmsCorrectiveActionCreated,
                QmsCorrectiveActionCreatedPayload {
                    action_id,
                    issue_id,
                    title: "EHS 纠正措施测试".to_string(),
                    description: Some("针对异常检测的纠正措施".to_string()),
                    assigned_to: "安全员".to_string(),
                },
            )
            .await
    });

    let (received, pub_result) = tokio::join!(subscription.wait_for_match(), pub_task);
    assert!(pub_result.is_ok(), "publish task 异常: {pub_result:?}");
    let inner = pub_result.unwrap();
    assert!(inner.is_ok(), "publish 失败: {inner:?}");

    assert_eq!(received.event_type, EventType::QmsCorrectiveActionCreated);
    let payload = received
        .parse_payload::<QmsCorrectiveActionCreatedPayload>()
        .unwrap();
    assert_eq!(payload.action_id, action_id);
    assert_eq!(payload.title, "EHS 纠正措施测试");
    assert_eq!(payload.assigned_to, "安全员");
}

/// 并发测试：多组 EHS 事件同时发布到同一 channel，验证 event_id 过滤不串扰。
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn test_ehs_concurrent_events_no_crosstalk() {
    let Some((client, _guard)) = redis_pubsub::skip_without_redis().await else {
        return;
    };

    const N: usize = 5;
    let channel = format!("topems:events:{}", EventType::HrmEmployeeCreated);
    let mut handles = Vec::with_capacity(N);

    for i in 0..N {
        let client = client.clone();
        let ch = channel.clone();
        handles.push(tokio::spawn(async move {
            let publisher = EventPublisher::new(&format!("ehs-conc-{i}")).unwrap();
            let emp_id = Uuid::new_v4();
            let dept_id = Uuid::new_v4();
            let name = format!("并发员工{i}");

            let match_id = emp_id;
            let match_name = name.clone();
            let sub: ActiveSubscription<Event> =
                redis_pubsub::prepare_subscription(&client, &ch, move |e: &Event| {
                    e.event_type == EventType::HrmEmployeeCreated
                        && e.parse_payload::<HrmEmployeeCreatedPayload>()
                            .map(|p| p.employee_id == match_id && p.name == match_name)
                            .unwrap_or(false)
                })
                .await;

            let delay = (i * 9) % 14;
            tokio::time::sleep(tokio::time::Duration::from_millis(delay as u64)).await;

            let pub_name = name.clone();
            let pub_email = format!("emp{i}@test.local");
            let (received, pub_res) = tokio::join!(
                sub.wait_for_match(),
                publisher.publish_hrm_employee_created(
                    emp_id,
                    &pub_name,
                    &pub_email,
                    Some(dept_id)
                ),
            );
            assert!(pub_res.is_ok(), "第{i}个 publish 失败: {pub_res:?}");

            let payload = received
                .parse_payload::<HrmEmployeeCreatedPayload>()
                .unwrap();
            assert_eq!(
                payload.employee_id, emp_id,
                "EHS 并发串扰！第{i}对收到非本对消息"
            );
            assert_eq!(payload.name, name);
            (i, emp_id)
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
    assert_eq!(ids.len(), N);
}
