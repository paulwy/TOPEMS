//! Kubernetes 服务发现集成测试（真实 K8s 集群）
//!
//! 环境变量 `K8S_TEST_API_SERVER`（如 https://127.0.0.1:6443）、
//! `K8S_TEST_NAMESPACE`（默认 default）、`K8S_TEST_TOKEN` 未设置或不可达时自动跳过。
//! 需准备可访问的 K8s 集群（minikube/kind/真实集群均可）。

use std::time::Duration;

use topems_unified_core::shared::k8s_service_discovery::{K8sConfig, K8sServiceDiscovery};
use topems_unified_core::shared::service_client::{ServiceDiscovery, ServiceRegistration};

fn test_api_server() -> Option<String> {
    std::env::var("K8S_TEST_API_SERVER").ok()
}

async fn make_client() -> Option<K8sServiceDiscovery> {
    let api_server = test_api_server()?;
    let config = K8sConfig {
        api_server,
        namespace: std::env::var("K8S_TEST_NAMESPACE").unwrap_or_else(|_| "default".into()),
        token: std::env::var("K8S_TEST_TOKEN").ok(),
        skip_tls_verify: true,
        ..Default::default()
    };
    let client = K8sServiceDiscovery::new(config).ok()?;
    // 探活：尝试发现一个不存在的服务；连接错误则跳过
    if client.discover("k8s-it-probe").await.is_err() {
        eprintln!("SKIP: K8s API 不可达");
        return None;
    }
    Some(client)
}

#[tokio::test]
async fn test_watch_initial_snapshot() {
    let Some(client) = make_client().await else { return; };

    let (tx, mut rx) = tokio::sync::mpsc::channel::<usize>(8);
    let _watch = client.spawn_service_watch("k8s-it-watch".to_string(), move |instances: Vec<ServiceRegistration>| {
        let _ = tx.try_send(instances.len());
    });
    // 初始快照（服务不存在时为 0；watch 在 NoNode 情形推送空快照）
    let initial = tokio::time::timeout(Duration::from_secs(15), rx.recv()).await;
    assert!(initial.is_ok(), "watch 应推送初始快照");
}
