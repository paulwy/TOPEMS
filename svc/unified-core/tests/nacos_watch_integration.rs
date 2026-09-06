//! Nacos 服务发现集成测试（真实 Nacos server）
//!
//! 环境变量 `NACOS_TEST_ADDRESS`（如 http://127.0.0.1:8848）未设置或不可达时自动跳过。
//! 启动方式（Docker 就绪后）：
//!   docker compose -f deploy/docker/nacos-compose.yml up -d

use std::time::Duration;

use topems_unified_core::shared::nacos_service_discovery::{NacosConfig, NacosServiceDiscovery};
use topems_unified_core::shared::service_client::{ServiceDiscovery, ServiceRegistration};

fn test_address() -> Option<String> {
    std::env::var("NACOS_TEST_ADDRESS").ok()
}

async fn make_client() -> Option<NacosServiceDiscovery> {
    let address = test_address()?;
    let config = NacosConfig {
        address,
        ..Default::default()
    };
    let client = NacosServiceDiscovery::new(config).ok()?;
    // 探活：注册一个临时服务，成功才继续（避免对不可达地址空等）
    let probe = ServiceRegistration::new("nacos-probe", "http://127.0.0.1:1");
    if client.register(probe).await.is_err() {
        eprintln!("SKIP: Nacos 不可达");
        return None;
    }
    let _ = client.deregister("nacos-probe").await;
    Some(client)
}

#[tokio::test]
async fn test_register_discover_watch() {
    let Some(client) = make_client().await else { return; };

    let name = format!("nacos-it-{}", uuid::Uuid::new_v4().simple());
    let reg = ServiceRegistration::new(name.as_str(), "http://127.0.0.1:7101");
    let _guard = client.register(reg).await.expect("注册失败");

    let discovered = client.discover(&name).await.expect("发现失败");
    assert!(discovered.is_some(), "应能发现刚注册的服务");

    // watch：轮询感知到实例
    let (tx, mut rx) = tokio::sync::mpsc::channel::<usize>(8);
    let _watch = client.spawn_service_watch(name.clone(), move |instances: Vec<ServiceRegistration>| {
        let _ = tx.try_send(instances.len());
    });
    let initial = tokio::time::timeout(Duration::from_secs(30), rx.recv()).await;
    assert!(initial.is_ok(), "watch 应推送初始快照");

    let _ = client.deregister(&name).await;
}

#[tokio::test]
async fn test_watch_deregister_change() {
    let Some(client) = make_client().await else { return; };

    let name = format!("nacos-it-{}", uuid::Uuid::new_v4().simple());
    let reg = ServiceRegistration::new(name.as_str(), "http://127.0.0.1:7102");
    let _guard = client.register(reg).await.expect("注册失败");

    let (tx, mut rx) = tokio::sync::mpsc::channel::<usize>(8);
    let _watch = client.spawn_service_watch(name.clone(), move |instances: Vec<ServiceRegistration>| {
        let _ = tx.try_send(instances.len());
    });
    let _first = tokio::time::timeout(Duration::from_secs(30), rx.recv()).await;

    // 注销后轮询应感知实例消失（快照为空）
    let _ = client.deregister(&name).await;
    let mut saw_empty = false;
    for _ in 0..20 {
        match tokio::time::timeout(Duration::from_secs(3), rx.recv()).await {
            Ok(Some(n)) if n == 0 => {
                saw_empty = true;
                break;
            }
            _ => {}
        }
    }
    assert!(saw_empty, "watch 应感知注销后的空快照");
}
