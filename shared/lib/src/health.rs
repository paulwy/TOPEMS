use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceHealth {
    pub service_name: String,
    pub status: HealthStatus,
    pub message: String,
    pub timestamp: String,
    pub uptime: Option<String>,
    pub dependencies: Option<Vec<DependencyHealth>>,
    pub response_time_ms: Option<u64>,
    pub last_check: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unhealthy")]
    Unhealthy,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DependencyHealth {
    pub name: String,
    pub status: HealthStatus,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub overall_status: HealthStatus,
    pub services: Vec<ServiceHealth>,
    pub timestamp: String,
    pub total_services: usize,
    pub healthy_count: usize,
    pub degraded_count: usize,
    pub unhealthy_count: usize,
    pub avg_response_time_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceMetrics {
    pub service_name: String,
    pub status: HealthStatus,
    pub uptime_seconds: u64,
    pub request_count: u64,
    pub error_count: u64,
    pub avg_response_time_ms: f64,
    pub max_response_time_ms: u64,
    pub min_response_time_ms: u64,
    pub cpu_usage_percent: Option<f64>,
    pub memory_usage_bytes: Option<u64>,
    pub timestamp: String,
}

#[derive(Debug, Clone)]
pub struct ServiceMonitor {
    service_name: String,
    health_url: String,
    last_health: Option<HealthStatus>,
    last_check: Option<DateTime<Utc>>,
    request_count: u64,
    error_count: u64,
    response_times: VecDeque<u64>,
    start_time: Instant,
}

impl ServiceMonitor {
    pub fn new(service_name: &str, health_url: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            health_url: health_url.to_string(),
            last_health: None,
            last_check: None,
            request_count: 0,
            error_count: 0,
            response_times: VecDeque::with_capacity(100),
            start_time: Instant::now(),
        }
    }

    pub async fn check_health(&mut self) -> ServiceHealth {
        let start = Instant::now();
        let result = check_http_health(&self.health_url).await;
        let response_time = start.elapsed().as_millis() as u64;
        
        self.response_times.push_back(response_time);
        if self.response_times.len() > 100 {
            self.response_times.pop_front();
        }

        let (status, message) = match result {
            Ok(status) => {
                if status == HealthStatus::Healthy {
                    self.request_count += 1;
                    (status, "Service is healthy".to_string())
                } else {
                    self.error_count += 1;
                    (status, "Service is degraded".to_string())
                }
            }
            Err(e) => {
                self.error_count += 1;
                (HealthStatus::Unhealthy, e)
            }
        };

        self.last_health = Some(status.clone());
        self.last_check = Some(Utc::now());

        ServiceHealth {
            service_name: self.service_name.clone(),
            status,
            message,
            timestamp: Utc::now().to_rfc3339(),
            uptime: Some(self.get_uptime()),
            dependencies: None,
            response_time_ms: Some(response_time),
            last_check: Some(self.last_check.unwrap().to_rfc3339()),
        }
    }

    pub fn get_uptime(&self) -> String {
        let elapsed = self.start_time.elapsed();
        let days = elapsed.as_secs() / 86400;
        let hours = (elapsed.as_secs() % 86400) / 3600;
        let minutes = (elapsed.as_secs() % 3600) / 60;
        let seconds = elapsed.as_secs() % 60;

        if days > 0 {
            format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
        } else if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, seconds)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, seconds)
        } else {
            format!("{}s", seconds)
        }
    }

    pub fn get_metrics(&self) -> ServiceMetrics {
        let avg_response_time = if self.response_times.is_empty() {
            0.0
        } else {
            self.response_times.iter().sum::<u64>() as f64 / self.response_times.len() as f64
        };

        ServiceMetrics {
            service_name: self.service_name.clone(),
            status: self.last_health.clone().unwrap_or(HealthStatus::Unhealthy),
            uptime_seconds: self.start_time.elapsed().as_secs(),
            request_count: self.request_count,
            error_count: self.error_count,
            avg_response_time_ms: avg_response_time,
            max_response_time_ms: self.response_times.iter().cloned().max().unwrap_or(0),
            min_response_time_ms: self.response_times.iter().cloned().min().unwrap_or(0),
            cpu_usage_percent: None,
            memory_usage_bytes: None,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

impl ServiceHealth {
    pub fn healthy(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Healthy,
            message: "Service is running normally".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn healthy_with_message(service_name: &str, message: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Healthy,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn degraded(service_name: &str, message: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Degraded,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn unhealthy(service_name: &str, message: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Unhealthy,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn with_uptime(mut self, uptime: &str) -> Self {
        self.uptime = Some(uptime.to_string());
        self
    }

    pub fn with_dependencies(mut self, dependencies: Vec<DependencyHealth>) -> Self {
        self.dependencies = Some(dependencies);
        self
    }

    pub fn with_response_time(mut self, response_time_ms: u64) -> Self {
        self.response_time_ms = Some(response_time_ms);
        self
    }
}

impl HealthCheckResponse {
    pub fn new(services: Vec<ServiceHealth>) -> Self {
        let total_services = services.len();
        let overall_status = Self::calculate_overall_status(&services);
        let healthy_count = services.iter().filter(|s| s.status == HealthStatus::Healthy).count();
        let degraded_count = services.iter().filter(|s| s.status == HealthStatus::Degraded).count();
        let unhealthy_count = services.iter().filter(|s| s.status == HealthStatus::Unhealthy).count();
        
        let total_response_time: u64 = services.iter()
            .filter_map(|s| s.response_time_ms)
            .sum();
        let avg_response_time = if healthy_count + degraded_count > 0 {
            Some(total_response_time / (healthy_count + degraded_count) as u64)
        } else {
            None
        };

        Self {
            overall_status,
            services,
            timestamp: Utc::now().to_rfc3339(),
            total_services,
            healthy_count,
            degraded_count,
            unhealthy_count,
            avg_response_time_ms: avg_response_time,
        }
    }

    fn calculate_overall_status(services: &[ServiceHealth]) -> HealthStatus {
        if services.is_empty() {
            return HealthStatus::Healthy;
        }

        let has_unhealthy = services.iter()
            .any(|s| s.status == HealthStatus::Unhealthy);
        
        if has_unhealthy {
            return HealthStatus::Unhealthy;
        }

        let has_degraded = services.iter()
            .any(|s| s.status == HealthStatus::Degraded);
        
        if has_degraded {
            return HealthStatus::Degraded;
        }

        HealthStatus::Healthy
    }
}

pub async fn check_http_health(url: &str) -> Result<HealthStatus, String> {
    let client = reqwest::Client::new();
    
    match client.get(url).timeout(std::time::Duration::from_secs(5)).send().await {
        Ok(response) => {
            if response.status().is_success() {
                Ok(HealthStatus::Healthy)
            } else {
                Ok(HealthStatus::Degraded)
            }
        }
        Err(e) => {
            Err(format!("Failed to reach service: {}", e))
        }
    }
}

pub struct HealthChecker {
    monitors: HashMap<String, Arc<Mutex<ServiceMonitor>>>,
}

impl HealthChecker {
    pub fn new() -> Self {
        Self {
            monitors: HashMap::new(),
        }
    }

    pub fn add_service(&mut self, name: &str, health_url: &str) {
        self.monitors.insert(
            name.to_string(),
            Arc::new(Mutex::new(ServiceMonitor::new(name, health_url))),
        );
    }

    pub async fn check_all(&self) -> HealthCheckResponse {
        let mut results = Vec::new();
        
        for (_name, monitor) in &self.monitors {
            let mut monitor = monitor.lock().unwrap();
            let health = monitor.check_health().await;
            results.push(health);
        }
        
        HealthCheckResponse::new(results)
    }

    pub fn get_metrics(&self, service_name: &str) -> Option<ServiceMetrics> {
        self.monitors.get(service_name)
            .map(|monitor| monitor.lock().unwrap().get_metrics())
    }

    pub fn get_all_metrics(&self) -> Vec<ServiceMetrics> {
        self.monitors.values()
            .map(|monitor| monitor.lock().unwrap().get_metrics())
            .collect()
    }
}

pub struct SystemMetrics {
    start_time: Instant,
    request_count: Arc<Mutex<u64>>,
    error_count: Arc<Mutex<u64>>,
    active_connections: Arc<Mutex<u64>>,
}

impl SystemMetrics {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            request_count: Arc::new(Mutex::new(0)),
            error_count: Arc::new(Mutex::new(0)),
            active_connections: Arc::new(Mutex::new(0)),
        }
    }

    pub fn record_request(&self) {
        *self.request_count.lock().unwrap() += 1;
    }

    pub fn record_error(&self) {
        *self.error_count.lock().unwrap() += 1;
    }

    pub fn increment_connections(&self) {
        *self.active_connections.lock().unwrap() += 1;
    }

    pub fn decrement_connections(&self) {
        *self.active_connections.lock().unwrap() -= 1;
    }

    pub fn get_uptime(&self) -> String {
        let elapsed = self.start_time.elapsed();
        let days = elapsed.as_secs() / 86400;
        let hours = (elapsed.as_secs() % 86400) / 3600;
        let minutes = (elapsed.as_secs() % 3600) / 60;
        let seconds = elapsed.as_secs() % 60;

        format!("{} days, {} hours, {} minutes, {} seconds", days, hours, minutes, seconds)
    }

    pub fn get_request_count(&self) -> u64 {
        *self.request_count.lock().unwrap()
    }

    pub fn get_error_count(&self) -> u64 {
        *self.error_count.lock().unwrap()
    }

    pub fn get_active_connections(&self) -> u64 {
        *self.active_connections.lock().unwrap()
    }

    pub fn get_uptime_seconds(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }
}
