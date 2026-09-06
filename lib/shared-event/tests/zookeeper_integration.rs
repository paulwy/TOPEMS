//! ZooKeeper 服务发现集成测试（真实 ZooKeeper 集群）
//!
//! 前置：`docker compose -f deploy/docker/zookeeper-compose.yml up -d`
//! 运行：`ZK_TEST_CONNECT_STRING=127.0.0.1:2181 cargo test -p topems-shared-event --test zookeeper_integration`
//! 未设置 ZK_TEST_CONNECT_STRING 时测试自动 skip（CI 友好）。

use std::env;
use std::time::Duration;

use topems_shared_event::zookeeper::{
    ServiceInstance, ServiceRegistration, ZkClient, ZkConfig,
};

fn test_connect_string() -> Option<String> {
    env::var("ZK_TEST_CONNECT_STRING")
        .ok()
        .filter(|s| !s.is_empty())
}

async fn make_client() -> Option<ZkClient> {
    let connect_string = test_connect_string()?;
    let config = ZkConfig {
        connect_string,
        prefix: format!("/topems-zkit-{}", uuid::Uuid::new_v4()),
        session_timeout_secs: 8,
        reconnect_interval_secs: 2,
    };
    let client = ZkClient::new(config).await.expect("ZooKeeper 连接失败");
    // 等待集群就绪
    let mut ok = false;
    for _ in 0..10 {
        if client.ping().await.ok() == Some(true) {
            ok = true;
            break;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    if !ok {
        return None;
    }
    Some(client)
}

#[tokio::test]
async fn test_register_discover_deregister() {
    let Some(client) = make_client().await else {
        eprintln!("SKIP: ZK_TEST_CONNECT_STRING 未设置或 ZooKeeper 不可达");
        return;
    };

    // 注册
    let mut guard = client
        .register_service(
            ServiceRegistration::new("erp-zk-1", "topems-erp", 8080)
                .with_address("127.0.0.1")
                .with_tag("it"),
        )
        .await
        .expect("注册失败");

    // 发现
    let instances = client
        .discover_service("topems-erp")
        .await
        .expect("发现失败");
    assert_eq!(instances.len(), 1, "应发现 1 个实例");
    assert_eq!(instances[0].id, "erp-zk-1");
    assert_eq!(instances[0].port, 8080);
    assert_eq!(instances[0].address, "127.0.0.1");

    // 列表
    let services = client.list_services().await.expect("列表失败");
    assert!(
        services.get("topems-erp").map(|v| v.len()).unwrap_or(0) >= 1,
        "服务列表应包含 topems-erp"
    );

    // 注销
    guard
        .deregister()
        .await
        .expect("注销失败");
    let remaining = client
        .discover_service("topems-erp")
        .await
        .expect("发现失败");
    assert!(remaining.is_empty(), "注销后应无实例");
}

#[tokio::test]
async fn test_multi_instance_discovery() {
    let Some(client) = make_client().await else {
        eprintln!("SKIP: ZK_TEST_CONNECT_STRING 未设置或 ZooKeeper 不可达");
        return;
    };

    let mut g1 = client
        .register_service(
            ServiceRegistration::new("wms-a", "topems-wms", 9001)
                .with_address("10.0.0.1"),
        )
        .await
        .expect("g1 注册失败");
    let _g2 = client
        .register_service(
            ServiceRegistration::new("wms-b", "topems-wms", 9002)
                .with_address("10.0.0.2"),
        )
        .await
        .expect("g2 注册失败");

    let instances = client
        .discover_service("topems-wms")
        .await
        .expect("发现失败");
    assert_eq!(instances.len(), 2, "应发现 2 个实例");
    let mut ports: Vec<u16> = instances.iter().map(|i| i.port).collect();
    ports.sort_unstable();
    assert_eq!(ports, vec![9001, 9002]);

    g1.deregister().await.expect("注销失败");
    let remaining = client
        .discover_service("topems-wms")
        .await
        .expect("发现失败");
    assert_eq!(remaining.len(), 1, "注销一个实例后应剩 1 个");
}

#[tokio::test]
async fn test_watcher_service_change() {
    let Some(client) = make_client().await else {
        eprintln!("SKIP: ZK_TEST_CONNECT_STRING 未设置或 ZooKeeper 不可达");
        return;
    };

    // 订阅服务目录变更（一次性 watch 循环重设）
    let (tx, mut rx) = tokio::sync::mpsc::channel::<usize>(16);
    let _watch = client.spawn_service_watch("topems-ai".to_string(), move |instances: Vec<ServiceInstance>| {
        let _ = tx.try_send(instances.len());
    });

    // 消费初始快照（可能为空）
    let _initial = rx.recv().await;

    // 注册新实例 → watch 应触发并推送含实例的快照
    let _guard = client
        .register_service(
            ServiceRegistration::new("ai-1", "topems-ai", 7001)
                .with_address("127.0.0.1"),
        )
        .await
        .expect("注册失败");

    let mut saw_instance = false;
    for _ in 0..20 {
        match tokio::time::timeout(Duration::from_secs(2), rx.recv()).await {
            Ok(Some(n)) if n >= 1 => {
                saw_instance = true;
                break;
            }
            _ => {}
        }
    }
    assert!(saw_instance, "watcher 应感知新注册实例");
}

#[tokio::test]
async fn test_reconnect_handle_start_stop() {
    let Some(client) = make_client().await else {
        eprintln!("SKIP: ZK_TEST_CONNECT_STRING 未设置或 ZooKeeper 不可达");
        return;
    };

    // 重连任务应能正常启动与停止（不崩溃）
    let mut handle = client.spawn_reconnect();
    tokio::time::sleep(Duration::from_millis(200)).await;
    handle.cancel().await;
}
