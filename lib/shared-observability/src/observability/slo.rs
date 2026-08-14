use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// SLO 目标类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SLOType {
    /// 可用性（成功率）
    Availability,
    /// 延迟（P99/P95/P90）
    Latency { percentile: f64, threshold_ms: u64 },
    /// 吞吐量
    Throughput { min_rps: f64 },
    /// 错误率
    ErrorRate { max_rate: f64 },
}

/// SLO 定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SLODefinition {
    pub id: String,
    pub name: String,
    pub service: String,
    pub slo_type: SLOType,
    /// 目标值（如 99.9%）
    pub target: f64,
    /// 测量窗口（秒）：300=5min, 3600=1h, 86400=1day
    pub window_seconds: u64,
    /// 告警阈值（低于此值触发告警）
    pub alert_threshold: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// SLO 测量数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SLOMeasurement {
    pub slo_id: String,
    pub timestamp: DateTime<Utc>,
    pub current_value: f64,
    pub sample_count: u64,
    pub error_count: u64,
    pub is_breaching: bool,
}

/// SLO 状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SLOStatus {
    /// 满足目标
    Healthy,
    /// 接近阈值（80%-100% 目标）
    Warning,
    /// 违反目标
    Breaching,
    /// 数据不足
    InsufficientData,
}

impl SLOStatus {
    pub fn from_measurement(value: f64, target: f64, alert_threshold: f64) -> Self {
        if value >= target {
            Self::Healthy
        } else if value >= alert_threshold {
            Self::Warning
        } else {
            Self::Breaching
        }
    }
}

/// SLO 管理器
pub struct SLOManager {
    definitions: Arc<RwLock<HashMap<String, SLODefinition>>>,
    measurements: Arc<RwLock<HashMap<String, Vec<SLOMeasurement>>>>,
    max_measurements_per_slo: usize,
}

impl SLOManager {
    pub fn new() -> Self {
        Self {
            definitions: Arc::new(RwLock::new(HashMap::new())),
            measurements: Arc::new(RwLock::new(HashMap::new())),
            max_measurements_per_slo: 1000,
        }
    }

    /// 注册 SLO 定义
    pub fn register(&self, definition: SLODefinition) {
        self.definitions
            .write()
            .insert(definition.id.clone(), definition);
    }

    /// 记录测量数据
    pub fn record_measurement(&self, measurement: SLOMeasurement) {
        let mut measurements = self.measurements.write();
        let entries = measurements.entry(measurement.slo_id.clone()).or_default();
        entries.push(measurement);
        // 保留最近的 max_measurements_per_slo 条
        if entries.len() > self.max_measurements_per_slo {
            let drain_count = entries.len() - self.max_measurements_per_slo;
            entries.drain(0..drain_count);
        }
    }

    /// 获取 SLO 当前状态
    pub fn get_status(&self, slo_id: &str) -> SLOStatus {
        let definitions = self.definitions.read();
        let measurements = self.measurements.read();

        let def = match definitions.get(slo_id) {
            Some(d) => d,
            None => return SLOStatus::InsufficientData,
        };

        let entries = match measurements.get(slo_id) {
            Some(e) if !e.is_empty() => e,
            _ => return SLOStatus::InsufficientData,
        };

        let latest = entries.last().unwrap();
        SLOStatus::from_measurement(latest.current_value, def.target, def.alert_threshold)
    }

    /// 获取所有 SLO 的状态
    pub fn get_all_statuses(&self) -> HashMap<String, SLOStatus> {
        let ids: Vec<String> = self.definitions.read().keys().cloned().collect();
        ids.into_iter()
            .map(|id| {
                let status = self.get_status(&id);
                (id, status)
            })
            .collect()
    }

    /// 获取 SLO 历史数据
    pub fn get_history(&self, slo_id: &str, limit: usize) -> Vec<SLOMeasurement> {
        let measurements = self.measurements.read();
        match measurements.get(slo_id) {
            Some(entries) => entries.iter().rev().take(limit).cloned().collect(),
            None => Vec::new(),
        }
    }

    /// 生成 SLO 报告
    pub fn generate_report(&self) -> SLOReport {
        let definitions = self.definitions.read();
        let mut service_slos: HashMap<String, Vec<SLOStatus>> = HashMap::new();

        for (id, def) in definitions.iter() {
            let status = self.get_status(id);
            service_slos
                .entry(def.service.clone())
                .or_default()
                .push(status);
        }

        let total_slos = definitions.len();
        let healthy = service_slos
            .values()
            .flatten()
            .filter(|s| **s == SLOStatus::Healthy)
            .count();
        let warning = service_slos
            .values()
            .flatten()
            .filter(|s| **s == SLOStatus::Warning)
            .count();
        let breaching = service_slos
            .values()
            .flatten()
            .filter(|s| **s == SLOStatus::Breaching)
            .count();

        SLOReport {
            total_slos,
            healthy_count: healthy,
            warning_count: warning,
            breaching_count: breaching,
            overall_health: if breaching > 0 {
                SLOStatus::Breaching
            } else if warning > 0 {
                SLOStatus::Warning
            } else if healthy > 0 {
                SLOStatus::Healthy
            } else {
                SLOStatus::InsufficientData
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SLOReport {
    pub total_slos: usize,
    pub healthy_count: usize,
    pub warning_count: usize,
    pub breaching_count: usize,
    pub overall_health: SLOStatus,
}

impl Default for SLOManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_definition(id: &str, target: f64, alert_threshold: f64) -> SLODefinition {
        let now = Utc::now();
        SLODefinition {
            id: id.to_string(),
            name: format!("test-{}", id),
            service: "test-service".to_string(),
            slo_type: SLOType::Availability,
            target,
            window_seconds: 300,
            alert_threshold,
            created_at: now,
            updated_at: now,
        }
    }

    fn make_measurement(slo_id: &str, value: f64) -> SLOMeasurement {
        SLOMeasurement {
            slo_id: slo_id.to_string(),
            timestamp: Utc::now(),
            current_value: value,
            sample_count: 100,
            error_count: 0,
            is_breaching: value < 90.0,
        }
    }

    #[test]
    fn test_slo_register_and_status() {
        let manager = SLOManager::new();
        let def = make_definition("slo-1", 99.9, 99.5);
        manager.register(def);

        // 没有测量数据时应为 InsufficientData
        assert_eq!(manager.get_status("slo-1"), SLOStatus::InsufficientData);

        // 记录健康数据
        manager.record_measurement(make_measurement("slo-1", 99.95));
        assert_eq!(manager.get_status("slo-1"), SLOStatus::Healthy);

        // 记录警告数据
        manager.record_measurement(make_measurement("slo-1", 99.6));
        assert_eq!(manager.get_status("slo-1"), SLOStatus::Warning);

        // 记录违反数据
        manager.record_measurement(make_measurement("slo-1", 90.0));
        assert_eq!(manager.get_status("slo-1"), SLOStatus::Breaching);

        // 未知 SLO 应为 InsufficientData
        assert_eq!(
            manager.get_status("unknown-slo"),
            SLOStatus::InsufficientData
        );
    }

    #[test]
    fn test_slo_measurement_recording() {
        let manager = SLOManager::new();
        manager.register(make_definition("slo-2", 99.9, 99.5));

        // 记录多条测量数据
        for value in [99.95, 99.96, 99.97, 99.98] {
            manager.record_measurement(make_measurement("slo-2", value));
        }

        // 历史数据应按倒序返回
        let history = manager.get_history("slo-2", 2);
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].current_value, 99.98);
        assert_eq!(history[1].current_value, 99.97);

        // 获取所有状态
        let statuses = manager.get_all_statuses();
        assert_eq!(statuses.len(), 1);
        assert_eq!(statuses.get("slo-2"), Some(&SLOStatus::Healthy));
    }

    #[test]
    fn test_slo_report_generation() {
        let manager = SLOManager::new();
        manager.register(make_definition("slo-a", 99.9, 99.5));
        manager.register(make_definition("slo-b", 99.9, 99.5));
        manager.register(make_definition("slo-c", 99.9, 99.5));

        // slo-a: Healthy
        manager.record_measurement(make_measurement("slo-a", 99.99));
        // slo-b: Warning
        manager.record_measurement(make_measurement("slo-b", 99.7));
        // slo-c: Breaching
        manager.record_measurement(make_measurement("slo-c", 50.0));

        let report = manager.generate_report();
        assert_eq!(report.total_slos, 3);
        assert_eq!(report.healthy_count, 1);
        assert_eq!(report.warning_count, 1);
        assert_eq!(report.breaching_count, 1);
        assert_eq!(report.overall_health, SLOStatus::Breaching);
    }

    #[test]
    fn test_slo_status_from_measurement_all_branches() {
        // value >= target → Healthy
        assert_eq!(
            SLOStatus::from_measurement(99.9, 99.9, 99.5),
            SLOStatus::Healthy
        );
        assert_eq!(
            SLOStatus::from_measurement(100.0, 99.9, 99.5),
            SLOStatus::Healthy
        );

        // alert_threshold <= value < target → Warning
        assert_eq!(
            SLOStatus::from_measurement(99.5, 99.9, 99.5),
            SLOStatus::Warning
        );
        assert_eq!(
            SLOStatus::from_measurement(99.7, 99.9, 99.5),
            SLOStatus::Warning
        );

        // value < alert_threshold → Breaching
        assert_eq!(
            SLOStatus::from_measurement(99.4, 99.9, 99.5),
            SLOStatus::Breaching
        );
        assert_eq!(
            SLOStatus::from_measurement(0.0, 99.9, 99.5),
            SLOStatus::Breaching
        );
    }

    #[test]
    fn test_slo_manager_new_empty_state() {
        let manager = SLOManager::new();
        assert_eq!(manager.get_all_statuses().len(), 0);
        let report = manager.generate_report();
        assert_eq!(report.total_slos, 0);
        assert_eq!(report.healthy_count, 0);
        assert_eq!(report.warning_count, 0);
        assert_eq!(report.breaching_count, 0);
        assert_eq!(report.overall_health, SLOStatus::InsufficientData);
        assert!(manager.get_history("any-slo", 10).is_empty());
    }

    #[test]
    fn test_slo_get_history_nonexistent_returns_empty() {
        let manager = SLOManager::new();
        let history = manager.get_history("nonexistent-slo", 10);
        assert!(history.is_empty());
    }

    #[test]
    fn test_slo_report_with_zero_slos() {
        let manager = SLOManager::new();
        let report = manager.generate_report();
        assert_eq!(report.total_slos, 0);
        assert_eq!(report.healthy_count, 0);
        assert_eq!(report.warning_count, 0);
        assert_eq!(report.breaching_count, 0);
        assert_eq!(report.overall_health, SLOStatus::InsufficientData);
    }

    #[test]
    fn test_slo_measurement_eviction() {
        let manager = SLOManager::new();
        manager.register(make_definition("slo-evict", 99.9, 99.5));
        // Record 1001 measurements; only the most recent 1000 should be kept.
        for i in 0..1001u64 {
            manager.record_measurement(make_measurement("slo-evict", 99.0 + (i as f64) / 10000.0));
        }
        let history = manager.get_history("slo-evict", usize::MAX);
        assert_eq!(history.len(), 1000);
        // The oldest measurement (i=0) should have been evicted; the newest (i=1000) kept.
        assert_eq!(history[0].current_value, 99.0 + (1000.0 / 10000.0));
        assert_ne!(history.last().unwrap().current_value, 99.0);
    }

    #[test]
    fn test_slo_type_serde_roundtrip() {
        let variants = vec![
            SLOType::Availability,
            SLOType::Latency {
                percentile: 99.0,
                threshold_ms: 500,
            },
            SLOType::Throughput { min_rps: 1000.0 },
            SLOType::ErrorRate { max_rate: 0.01 },
        ];
        for original in variants {
            let json = serde_json::to_string(&original).expect("serialize SLOType");
            let back: SLOType = serde_json::from_str(&json).expect("deserialize SLOType");
            let json_again = serde_json::to_string(&back).expect("serialize SLOType again");
            assert_eq!(json, json_again, "SLOType serde roundtrip mismatch");
        }
    }

    #[test]
    fn test_slo_status_serde_roundtrip() {
        let variants = vec![
            SLOStatus::Healthy,
            SLOStatus::Warning,
            SLOStatus::Breaching,
            SLOStatus::InsufficientData,
        ];
        for original in variants {
            let json = serde_json::to_string(&original).expect("serialize SLOStatus");
            let back: SLOStatus = serde_json::from_str(&json).expect("deserialize SLOStatus");
            assert_eq!(original, back, "SLOStatus serde roundtrip mismatch");
        }
    }

    #[test]
    fn test_slo_definition_serde_roundtrip() {
        let original = make_definition("slo-serde", 99.9, 99.5);
        let json = serde_json::to_string(&original).expect("serialize SLODefinition");
        let back: SLODefinition = serde_json::from_str(&json).expect("deserialize SLODefinition");
        let json_again = serde_json::to_string(&back).expect("serialize SLODefinition again");
        assert_eq!(json, json_again, "SLODefinition serde roundtrip mismatch");
    }

    #[test]
    fn test_slo_measurement_serde_roundtrip() {
        let original = make_measurement("slo-meas", 99.95);
        let json = serde_json::to_string(&original).expect("serialize SLOMeasurement");
        let back: SLOMeasurement = serde_json::from_str(&json).expect("deserialize SLOMeasurement");
        let json_again = serde_json::to_string(&back).expect("serialize SLOMeasurement again");
        assert_eq!(json, json_again, "SLOMeasurement serde roundtrip mismatch");
    }
}
