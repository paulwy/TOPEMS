use super::slo::{SLODefinition, SLOType};
use chrono::Utc;

impl SLOType {
    /// 99.9% 可用性
    pub fn availability_999() -> Self {
        Self::Availability
    }
    /// 99.95% 可用性
    pub fn availability_9995() -> Self {
        Self::Availability
    }
    /// P99 < 200ms
    pub fn latency_p99_200ms() -> Self {
        Self::Latency {
            percentile: 99.0,
            threshold_ms: 200,
        }
    }
    /// P99 < 500ms
    pub fn latency_p99_500ms() -> Self {
        Self::Latency {
            percentile: 99.0,
            threshold_ms: 500,
        }
    }
    /// P95 < 100ms
    pub fn latency_p95_100ms() -> Self {
        Self::Latency {
            percentile: 95.0,
            threshold_ms: 100,
        }
    }
    /// 错误率 < 1%
    pub fn error_rate_1pct() -> Self {
        Self::ErrorRate { max_rate: 0.01 }
    }
}

/// 为服务生成标准 SLO 集
pub fn standard_slos_for_service(service: &str) -> Vec<SLODefinition> {
    let now = Utc::now();
    vec![
        SLODefinition {
            id: format!("{}_availability", service),
            name: format!("{} 可用性", service),
            service: service.to_string(),
            slo_type: SLOType::availability_999(),
            target: 99.9,
            window_seconds: 86400,
            alert_threshold: 99.5,
            created_at: now,
            updated_at: now,
        },
        SLODefinition {
            id: format!("{}_latency_p99", service),
            name: format!("{} P99 延迟", service),
            service: service.to_string(),
            slo_type: SLOType::latency_p99_500ms(),
            target: 95.0,
            window_seconds: 300,
            alert_threshold: 90.0,
            created_at: now,
            updated_at: now,
        },
        SLODefinition {
            id: format!("{}_error_rate", service),
            name: format!("{} 错误率", service),
            service: service.to_string(),
            slo_type: SLOType::error_rate_1pct(),
            target: 99.0,
            window_seconds: 300,
            alert_threshold: 95.0,
            created_at: now,
            updated_at: now,
        },
    ]
}

/// 为所有 27 个服务生成标准 SLO
pub fn standard_slos_for_all_services() -> Vec<SLODefinition> {
    const SERVICES: &[&str] = &[
        "unified-core",
        "erp",
        "hrm",
        "pm",
        "crm",
        "mes",
        "pdm",
        "scm",
        "wms",
        "srm",
        "qms",
        "lims",
        "ehs",
        "rd",
        "doc",
        "ai",
        "portal",
        "monitor",
        "mobile",
        "gis",
        "analytics",
        "finance",
        "bi",
        "integration",
        "workflow",
        "form",
        "notification",
    ];

    SERVICES
        .iter()
        .flat_map(|svc| standard_slos_for_service(svc))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_standard_slos_for_service() {
        let slos = standard_slos_for_service("test-svc");
        assert_eq!(slos.len(), 3);

        let ids: Vec<&str> = slos.iter().map(|s| s.id.as_str()).collect();
        assert!(ids.contains(&"test-svc_availability"));
        assert!(ids.contains(&"test-svc_latency_p99"));
        assert!(ids.contains(&"test-svc_error_rate"));

        // 所有 SLO 都应归属同一服务
        assert!(slos.iter().all(|s| s.service == "test-svc"));
    }

    #[test]
    fn test_standard_slos_for_all_services_covers_27_services() {
        let slos = standard_slos_for_all_services();
        // 27 个服务，每个 3 个 SLO = 81 个
        assert_eq!(slos.len(), 81);

        // 抽样验证部分服务
        let services: std::collections::HashSet<&str> =
            slos.iter().map(|s| s.service.as_str()).collect();
        assert_eq!(services.len(), 27);
        assert!(services.contains("unified-core"));
        assert!(services.contains("erp"));
        assert!(services.contains("notification"));
        assert!(services.contains("ai"));
        assert!(services.contains("finance"));
    }

    #[test]
    fn test_slo_type_constructors() {
        match SLOType::availability_999() {
            SLOType::Availability => {}
            _ => panic!("expected Availability"),
        }
        match SLOType::availability_9995() {
            SLOType::Availability => {}
            _ => panic!("expected Availability"),
        }
        match SLOType::latency_p99_200ms() {
            SLOType::Latency {
                percentile,
                threshold_ms,
            } => {
                assert_eq!(percentile, 99.0);
                assert_eq!(threshold_ms, 200);
            }
            _ => panic!("expected Latency"),
        }
        match SLOType::latency_p99_500ms() {
            SLOType::Latency {
                percentile,
                threshold_ms,
            } => {
                assert_eq!(percentile, 99.0);
                assert_eq!(threshold_ms, 500);
            }
            _ => panic!("expected Latency"),
        }
        match SLOType::latency_p95_100ms() {
            SLOType::Latency {
                percentile,
                threshold_ms,
            } => {
                assert_eq!(percentile, 95.0);
                assert_eq!(threshold_ms, 100);
            }
            _ => panic!("expected Latency"),
        }
        match SLOType::error_rate_1pct() {
            SLOType::ErrorRate { max_rate } => {
                assert!((max_rate - 0.01).abs() < f64::EPSILON);
            }
            _ => panic!("expected ErrorRate"),
        }
    }
}
