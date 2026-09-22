//! etcd 服务发现集成测试（真实 etcd 集群）
//!
//! 前置：`docker compose -f deploy/docker/etcd-compose.yml up -d`
//! 运行：`ETCD_TEST_ENDPOINTS=http://localhost:2379 cargo test -p topems-shared-event --test etcd_integration`
//! 未设置 ETCD_TEST_ENDPOINTS 时测试自动 skip（CI 友好）。

use std::env;
use std::time::Duration;

use topems_shared_event::etcd::{EtcdClient, EtcdConfig, ServiceRegistration};

fn test_endpoints() -> Option<Vec<String>> {
    env::var("ETCD_TEST_ENDPOINTS")
        .ok()
        .map(|s| {
            s.split(',')
                .map(|x| x.trim().to_string())
                .filter(|x| !x.is_empty())
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
}

async fn make_client() -> Option<EtcdClient> {
    let endpoints = test_endpoints()?;
    let config = EtcdConfig {
        endpoints,
        prefix: format!("/topems-it/{}", uuid::Uuid::new_v4()),
        lease_ttl_secs: 10,
        username: None,
        password: None,
        reconnect_interval_secs: 2,
    };
    let client = EtcdClient::new(config).await.expect("etcd 连接失败");
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
        eprintln!("SKIP: ETCD_TEST_ENDPOINTS 未设置或 etcd 不可达");
        return;
    };

    // 注册
    let mut guard = client
        .register_service(
            ServiceRegistration::new("erp-it-1", "topems-erp", 8080)
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
    assert_eq!(instances[0].id, "erp-it-1");
    assert_eq!(instances[0].port, 8080);
    assert_eq!(instances[0].address, "127.0.0.1");
    assert!(instances[0].lease_id > 0, "实例应携带租约 ID");

    // 列表
    let services = client.list_services().await.expect("列表失败");
    assert!(
        services.get("topems-erp").map(|v| v.len()).unwrap_or(0) >= 1,
        "服务列表应包含 topems-erp"
    );

    // 注销（撤销租约后实例应消失）
    guard.deregister().await.expect("注销失败");
    // 等待租约回收（etcd 删除绑定 key 是异步的，短暂轮询）
    let mut gone = false;
    for _ in 0..10 {
        let remaining = client
            .discover_service("topems-erp")
            .await
            .unwrap_or_default();
        if remaining.is_empty() {
            gone = true;
            break;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    assert!(gone, "注销后应无实例");
}

#[tokio::test]
async fn test_lease_keep_alive() {
    let Some(client) = make_client().await else {
        eprintln!("SKIP: ETCD_TEST_ENDPOINTS 未设置或 etcd 不可达");
        return;
    };

    // 申请一个 TTL 很短的租约，keep-alive 应保持其存活
    let lease_id = client.grant_lease(3).await.expect("grant 失败");
    let key = format!("{}/keep-alive-test", client.prefix());
    client
        .put_with_lease(key.clone(), "alive", lease_id)
        .await
        .expect("put 失败");

    let stop = tokio_util::sync::CancellationToken::new();
    let task_stop = stop.clone();
    let keep_client = client.clone();
    let keep_task = tokio::spawn(async move {
        keep_client.keep_alive_loop(lease_id, 3, task_stop).await;
    });

    // 等 5 秒（超过 3 秒 TTL），key 应仍然存在（keep-alive 生效）
    tokio::time::sleep(Duration::from_secs(5)).await;

    let mut kv = client.kv_client();
    let resp = kv.get(key.clone(), None).await.expect("get 失败");
    assert!(
        !resp.kvs().is_empty(),
        "keep-alive 后 key 应仍然存在（TTL 3s，已过 5s）"
    );

    // 停止 keep-alive，等租约过期，key 应消失
    stop.cancel();
    let _ = tokio::time::timeout(Duration::from_secs(3), keep_task).await;
    let mut gone = false;
    for _ in 0..10 {
        let resp = kv.get(key.clone(), None).await.expect("get 失败");
        if resp.kvs().is_empty() {
            gone = true;
            break;
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
    assert!(gone, "停止 keep-alive 后租约应过期，key 应删除");

    // 清理
    let _ = client.revoke_lease(lease_id).await;
}

#[tokio::test]
async fn test_multi_instance_discovery() {
    let Some(client) = make_client().await else {
        eprintln!("SKIP: ETCD_TEST_ENDPOINTS 未设置或 etcd 不可达");
        return;
    };

    // 注册 2 个同服务实例
    let mut g1 = client
        .register_service(
            ServiceRegistration::new("wms-a", "topems-wms", 9001).with_address("10.0.0.1"),
        )
        .await
        .expect("g1 注册失败");
    let g2 = client
        .register_service(
            ServiceRegistration::new("wms-b", "topems-wms", 9002).with_address("10.0.0.2"),
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

    // 注销一个，剩一个
    g1.deregister().await.expect("注销失败");
    let mut one_left = false;
    for _ in 0..10 {
        let remaining = client
            .discover_service("topems-wms")
            .await
            .unwrap_or_default();
        if remaining.len() == 1 {
            one_left = true;
            break;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    assert!(one_left, "注销一个实例后应剩 1 个");
    let _ = g2;
}
