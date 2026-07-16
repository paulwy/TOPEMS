use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterConfig {
    pub cluster_id: Uuid,
    pub name: String,
    pub mode: ClusterMode,
    pub nodes: Vec<NodeConfig>,
    pub load_balancer: LoadBalancerConfig,
    pub health_check: HealthCheckConfig,
    pub failover: FailoverConfig,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum ClusterMode {
    ActivePassive,
    ActiveActive,
    Geographic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    pub id: Uuid,
    pub hostname: String,
    pub ip_address: String,
    pub port: u16,
    pub role: NodeRole,
    pub weight: u32,
    pub max_connections: u32,
    pub is_master: bool,
    pub region: Option<String>,
    pub status: NodeStatus,
    pub health: NodeHealth,
    pub last_heartbeat: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum NodeRole {
    Primary,
    Secondary,
    Witness,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum NodeStatus {
    Online,
    Offline,
    Standby,
    Maintenance,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeHealth {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub network_latency_ms: u64,
    pub request_rate: u64,
    pub error_rate: f64,
    pub score: u32,
}

impl NodeHealth {
    pub fn is_healthy(&self) -> bool {
        self.cpu_usage < 80.0
            && self.memory_usage < 85.0
            && self.disk_usage < 90.0
            && self.error_rate < 5.0
            && self.score >= 70
    }

    pub fn calculate_score(&self) -> u32 {
        let mut score = 100u32;

        if self.cpu_usage > 80.0 {
            score -= 20;
        } else if self.cpu_usage > 60.0 {
            score -= 10;
        }

        if self.memory_usage > 85.0 {
            score -= 20;
        } else if self.memory_usage > 70.0 {
            score -= 10;
        }

        if self.disk_usage > 90.0 {
            score -= 15;
        } else if self.disk_usage > 75.0 {
            score -= 5;
        }

        if self.network_latency_ms > 100 {
            score -= 15;
        } else if self.network_latency_ms > 50 {
            score -= 5;
        }

        if self.error_rate > 5.0 {
            score -= 30;
        } else if self.error_rate > 2.0 {
            score -= 15;
        }

        score.saturating_sub((self.request_rate / 10000) as u32)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancerConfig {
    pub enabled: bool,
    pub algorithm: LoadBalancingAlgorithm,
    pub health_check_interval_seconds: u64,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub connection_timeout_ms: u64,
    pub keepalive_seconds: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum LoadBalancingAlgorithm {
    RoundRobin,
    LeastConnections,
    IpHash,
    WeightedRoundRobin,
    Random,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    pub enabled: bool,
    pub interval_seconds: u64,
    pub timeout_seconds: u64,
    pub healthy_threshold: u32,
    pub unhealthy_threshold: u32,
    pub path: String,
    pub method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailoverConfig {
    pub enabled: bool,
    pub automatic: bool,
    pub failover_timeout_seconds: u64,
    pub max_failover_duration_seconds: u64,
    pub failover_retries: u32,
    pub pre_failover_script: Option<String>,
    pub post_failover_script: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterMetrics {
    pub cluster_id: Uuid,
    pub total_nodes: u32,
    pub healthy_nodes: u32,
    pub unhealthy_nodes: u32,
    pub offline_nodes: u32,
    pub total_requests: u64,
    pub failed_requests: u64,
    pub average_response_time_ms: u64,
    pub average_load: f64,
    pub failover_count: u64,
    pub last_failover: Option<DateTime<Utc>>,
    pub uptime_percentage: f64,
}

impl ClusterMetrics {
    pub fn calculate_health_percentage(&self) -> f64 {
        if self.total_nodes == 0 {
            return 0.0;
        }
        (self.healthy_nodes as f64 / self.total_nodes as f64) * 100.0
    }

    pub fn calculate_error_rate(&self) -> f64 {
        if self.total_requests == 0 {
            return 0.0;
        }
        (self.failed_requests as f64 / self.total_requests as f64) * 100.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterEvent {
    pub id: Uuid,
    pub cluster_id: Uuid,
    pub event_type: ClusterEventType,
    pub node_id: Option<Uuid>,
    pub severity: EventSeverity,
    pub message: String,
    pub details: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ClusterEventType {
    NodeJoined,
    NodeLeft,
    NodeFailed,
    FailoverStarted,
    FailoverCompleted,
    FailoverFailed,
    HealthCheckPassed,
    HealthCheckFailed,
    LoadBalanced,
    ConfigurationChanged,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum EventSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

pub struct ClusterManager {
    config: Arc<RwLock<Option<ClusterConfig>>>,
    nodes: Arc<RwLock<HashMap<Uuid, NodeConfig>>>,
    events: Arc<RwLock<Vec<ClusterEvent>>>,
    failover_in_progress: Arc<RwLock<bool>>,
}

impl Default for ClusterManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ClusterManager {
    pub fn new() -> Self {
        Self {
            config: Arc::new(RwLock::new(None)),
            nodes: Arc::new(RwLock::new(HashMap::new())),
            events: Arc::new(RwLock::new(Vec::new())),
            failover_in_progress: Arc::new(RwLock::new(false)),
        }
    }

    pub async fn configure(&self, config: ClusterConfig) {
        let mut cfg = self.config.write().await;
        *cfg = Some(config);
    }

    pub async fn get_config(&self) -> Option<ClusterConfig> {
        self.config.read().await.clone()
    }

    pub async fn add_node(&self, node: NodeConfig) -> Result<(), ClusterError> {
        let mut nodes = self.nodes.write().await;
        if nodes.contains_key(&node.id) {
            return Err(ClusterError::NodeAlreadyExists);
        }
        nodes.insert(node.id, node.clone());

        self.record_event(ClusterEvent {
            id: Uuid::new_v4(),
            cluster_id: Uuid::nil(),
            event_type: ClusterEventType::NodeJoined,
            node_id: Some(node.id),
            severity: EventSeverity::Info,
            message: format!("Node {} joined the cluster", node.hostname),
            details: HashMap::new(),
            created_at: Utc::now(),
        })
        .await;

        Ok(())
    }

    pub async fn remove_node(&self, node_id: Uuid) -> Result<NodeConfig, ClusterError> {
        let mut nodes = self.nodes.write().await;
        let node = nodes.remove(&node_id).ok_or(ClusterError::NodeNotFound)?;

        self.record_event(ClusterEvent {
            id: Uuid::new_v4(),
            cluster_id: Uuid::nil(),
            event_type: ClusterEventType::NodeLeft,
            node_id: Some(node_id),
            severity: EventSeverity::Warning,
            message: format!("Node {} left the cluster", node.hostname),
            details: HashMap::new(),
            created_at: Utc::now(),
        })
        .await;

        Ok(node)
    }

    pub async fn get_node(&self, node_id: Uuid) -> Option<NodeConfig> {
        let nodes = self.nodes.read().await;
        nodes.get(&node_id).cloned()
    }

    pub async fn list_nodes(&self) -> Vec<NodeConfig> {
        let nodes = self.nodes.read().await;
        nodes.values().cloned().collect()
    }

    pub async fn get_healthy_nodes(&self) -> Vec<NodeConfig> {
        let nodes = self.nodes.read().await;
        nodes
            .values()
            .filter(|n| n.status == NodeStatus::Online && n.health.is_healthy())
            .cloned()
            .collect()
    }

    pub async fn update_node_health(
        &self,
        node_id: Uuid,
        health: NodeHealth,
    ) -> Result<(), ClusterError> {
        let mut nodes = self.nodes.write().await;
        let node = nodes.get_mut(&node_id).ok_or(ClusterError::NodeNotFound)?;

        let was_healthy = node.health.is_healthy();
        node.health = health;
        node.last_heartbeat = Utc::now();
        node.health.score = node.health.calculate_score();

        let is_healthy = node.health.is_healthy();

        if was_healthy && !is_healthy {
            node.status = NodeStatus::Standby;

            self.record_event(ClusterEvent {
                id: Uuid::new_v4(),
                cluster_id: Uuid::nil(),
                event_type: ClusterEventType::HealthCheckFailed,
                node_id: Some(node_id),
                severity: EventSeverity::Error,
                message: format!("Node {} health check failed", node.hostname),
                details: HashMap::new(),
                created_at: Utc::now(),
            })
            .await;
        } else if !was_healthy && is_healthy {
            node.status = NodeStatus::Online;

            self.record_event(ClusterEvent {
                id: Uuid::new_v4(),
                cluster_id: Uuid::nil(),
                event_type: ClusterEventType::HealthCheckPassed,
                node_id: Some(node_id),
                severity: EventSeverity::Info,
                message: format!("Node {} health check passed", node.hostname),
                details: HashMap::new(),
                created_at: Utc::now(),
            })
            .await;
        }

        Ok(())
    }

    pub async fn select_node(
        &self,
        algorithm: LoadBalancingAlgorithm,
    ) -> Result<Option<NodeConfig>, ClusterError> {
        let healthy_nodes = self.get_healthy_nodes().await;

        if healthy_nodes.is_empty() {
            return Ok(None);
        }

        let selected = match algorithm {
            LoadBalancingAlgorithm::RoundRobin => healthy_nodes.first().cloned(),
            LoadBalancingAlgorithm::LeastConnections => {
                let mut sorted = healthy_nodes;
                sorted.sort_by_key(|n| n.health.request_rate);
                sorted.first().cloned()
            }
            LoadBalancingAlgorithm::WeightedRoundRobin => {
                let total_weight: u32 = healthy_nodes.iter().map(|n| n.weight).sum();
                let nodes_with_weight: Vec<_> = healthy_nodes.iter().collect();

                if total_weight > 0 {
                    let weight_sum: u32 = (0..nodes_with_weight.len())
                        .map(|i| nodes_with_weight[i].weight)
                        .sum();

                    let selected_weight = weight_sum % nodes_with_weight.len() as u32;
                    let mut cumulative = 0u32;

                    for node in nodes_with_weight {
                        cumulative += node.weight;
                        if cumulative >= selected_weight {
                            return Ok(Some(node.clone()));
                        }
                    }
                }

                healthy_nodes.first().cloned()
            }
            LoadBalancingAlgorithm::Random => {
                use std::collections::hash_map::RandomState;
                use std::hash::{BuildHasher, Hasher};

                let state = RandomState::new();
                let mut hasher = state.build_hasher();
                hasher.write_u64(Utc::now().timestamp_nanos_opt().unwrap_or(0) as u64);
                let hash = hasher.finish();

                let index = (hash as usize) % healthy_nodes.len();
                Some(healthy_nodes[index].clone())
            }
            LoadBalancingAlgorithm::IpHash => healthy_nodes.first().cloned(),
        };

        Ok(selected)
    }

    pub async fn trigger_failover(&self, failed_node_id: Uuid) -> Result<(), ClusterError> {
        let mut in_progress = self.failover_in_progress.write().await;
        if *in_progress {
            return Err(ClusterError::FailoverInProgress);
        }
        *in_progress = true;
        drop(in_progress);

        self.record_event(ClusterEvent {
            id: Uuid::new_v4(),
            cluster_id: Uuid::nil(),
            event_type: ClusterEventType::FailoverStarted,
            node_id: Some(failed_node_id),
            severity: EventSeverity::Critical,
            message: format!("Failover started for node {}", failed_node_id),
            details: HashMap::new(),
            created_at: Utc::now(),
        })
        .await;

        {
            let mut nodes = self.nodes.write().await;
            if let Some(node) = nodes.get_mut(&failed_node_id) {
                node.status = NodeStatus::Offline;
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        let mut in_progress = self.failover_in_progress.write().await;
        *in_progress = false;

        self.record_event(ClusterEvent {
            id: Uuid::new_v4(),
            cluster_id: Uuid::nil(),
            event_type: ClusterEventType::FailoverCompleted,
            node_id: Some(failed_node_id),
            severity: EventSeverity::Info,
            message: format!("Failover completed for node {}", failed_node_id),
            details: HashMap::new(),
            created_at: Utc::now(),
        })
        .await;

        Ok(())
    }

    pub async fn get_metrics(&self) -> ClusterMetrics {
        let nodes = self.nodes.read().await;
        let total = nodes.len() as u32;
        let healthy = nodes
            .values()
            .filter(|n| n.status == NodeStatus::Online && n.health.is_healthy())
            .count() as u32;
        let unhealthy = nodes.values().filter(|n| !n.health.is_healthy()).count() as u32;
        let offline = nodes
            .values()
            .filter(|n| n.status == NodeStatus::Offline)
            .count() as u32;

        let total_requests: u64 = nodes.values().map(|n| n.health.request_rate).sum();
        let avg_response: u64 = if total > 0 {
            nodes
                .values()
                .map(|n| n.health.network_latency_ms)
                .sum::<u64>()
                / total as u64
        } else {
            0
        };

        ClusterMetrics {
            cluster_id: Uuid::nil(),
            total_nodes: total,
            healthy_nodes: healthy,
            unhealthy_nodes: unhealthy,
            offline_nodes: offline,
            total_requests,
            failed_requests: 0,
            average_response_time_ms: avg_response,
            average_load: 0.0,
            failover_count: 0,
            last_failover: None,
            uptime_percentage: if total > 0 {
                (healthy as f64 / total as f64) * 100.0
            } else {
                0.0
            },
        }
    }

    async fn record_event(&self, event: ClusterEvent) {
        let mut events = self.events.write().await;
        events.push(event);

        if events.len() > 1000 {
            events.remove(0);
        }
    }

    pub async fn get_events(&self, limit: usize) -> Vec<ClusterEvent> {
        let events = self.events.read().await;
        events.iter().rev().take(limit).cloned().collect()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ClusterError {
    #[error("Node not found")]
    NodeNotFound,

    #[error("Node already exists")]
    NodeAlreadyExists,

    #[error("No healthy nodes available")]
    NoHealthyNodes,

    #[error("Failover already in progress")]
    FailoverInProgress,

    #[error("Cluster not configured")]
    ClusterNotConfigured,

    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_node_health_calculation() {
        let mut health = NodeHealth {
            cpu_usage: 50.0,
            memory_usage: 60.0,
            disk_usage: 70.0,
            network_latency_ms: 30,
            request_rate: 500,
            error_rate: 1.0,
            score: 0,
        };

        // 先计算正确的健康分数
        health.score = health.calculate_score();

        // 现在应该是健康的
        assert!(health.is_healthy());
        assert!(health.score >= 70);
    }

    #[tokio::test]
    async fn test_add_node() {
        let manager = ClusterManager::new();

        let node = NodeConfig {
            id: Uuid::new_v4(),
            hostname: "node1.example.com".to_string(),
            ip_address: "192.168.1.1".to_string(),
            port: 8080,
            role: NodeRole::Primary,
            weight: 100,
            max_connections: 1000,
            is_master: true,
            region: Some("us-east".to_string()),
            status: NodeStatus::Online,
            health: NodeHealth {
                cpu_usage: 30.0,
                memory_usage: 40.0,
                disk_usage: 50.0,
                network_latency_ms: 10,
                request_rate: 100,
                error_rate: 0.1,
                score: 100,
            },
            last_heartbeat: Utc::now(),
        };

        manager.add_node(node.clone()).await.expect("Failed to add node");

        let found = manager.get_node(node.id).await;
        assert!(found.is_some());
        assert_eq!(found.expect("Node not found").hostname, "node1.example.com");
    }

    #[tokio::test]
    async fn test_load_balancing() {
        let manager = ClusterManager::new();

        for i in 0..3 {
            let node = NodeConfig {
                id: Uuid::new_v4(),
                hostname: format!("node{}.example.com", i),
                ip_address: format!("192.168.1.{}", i + 1),
                port: 8080,
                role: NodeRole::Secondary,
                weight: 100 - (i as u32 * 20),
                max_connections: 1000,
                is_master: false,
                region: None,
                status: NodeStatus::Online,
                health: NodeHealth {
                    cpu_usage: 30.0,
                    memory_usage: 40.0,
                    disk_usage: 50.0,
                    network_latency_ms: 10,
                    request_rate: 100,
                    error_rate: 0.1,
                    score: 100,
                },
                last_heartbeat: Utc::now(),
            };

            manager.add_node(node).await.expect("Failed to add node");
        }

        let selected = manager
            .select_node(LoadBalancingAlgorithm::RoundRobin)
            .await;
        assert!(selected.is_ok());
        assert!(selected.expect("Load balancing selection failed").is_some());
    }

    #[tokio::test]
    async fn test_metrics() {
        let manager = ClusterManager::new();
        let metrics = manager.get_metrics().await;

        assert_eq!(metrics.total_nodes, 0);
        assert_eq!(metrics.healthy_nodes, 0);
    }
}
