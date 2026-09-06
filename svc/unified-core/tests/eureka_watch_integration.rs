//! Eureka 服务发现集成测试（真实 Eureka server）
//!
//! 环境变量 `EUREKA_TEST_ADDRESS`（如 http://127.0.0.1:8761）未设置或不可达时自动跳过。
//! 需准备 Eureka 服务端（Spring Cloud Netflix Eureka，端口 8761）。

use std::time::Duration;

use topems_unified_core::shared::eureka_service_discovery::{EurekaConfig, EurekaServiceDiscovery};
use topems_unified_core::shared::service_client::{ServiceDiscovery, ServiceRegistration};

fn test_address() -> Option<String> {
    std::env::var("EUREKA_TEST_ADDRESS").ok()
}

async fn make_client() -> Option<EurekaServiceDiscovery> {
    let address = test_address()?;
    let config = EurekaConfig {
        address,
        ..Default::default()
    };
    let client = EurekaServiceDiscovery::new(config).ok()?;
    let probe = ServiceRegistration::new("eureka-probe", "http://127.0.0.1:1");
    if client.register(probe).await.is_err() {
        eprintln!("SKIP: Eureka 不可达");
        return None;
    }
    let _ = client.deregister("eureka-probe").await;
    Some(client)
}

#[tokio::test]
async fn test_register_discover_watch() {
    let Some(client) = make_client().await else { return; };

    let name = format!("eureka-it-{}", uuid::Uuid::new_v4().simple());
    let reg = ServiceRegistration::new(name.as_str(), "http://127.0.0.1:7201");
    let _guard = client.register(reg).await.expect("注册失败");

    let discovered = client.discover(&name).await.expect("发现失败");
    assert!(discovered.is_some(), "应能发现刚注册的服务");

    let (tx, mut rx) = tokio::sync::mpsc::channel::<usize>(8);
    let _watch = client.spawn_service_watch(name.clone(), move |instances: Vec<ServiceRegistration>| {
        let _ = tx.try_send(instances.len());
    });
    let initial = tokio::time::timeout(Duration::from_secs(35), rx.recv()).await;
    assert!(initial.is_ok(), "watch 应推送初始快照");

    let _ = client.deregister(&name).await;
}
