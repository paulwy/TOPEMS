use crate::models::{
    Alert, LogEntry, MonitoringMetrics, MonitoringService as MonitoringServiceModel,
};

pub struct MonitoringService;

impl MonitoringService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_services(&self) -> Vec<MonitoringServiceModel> {
        vec![
            MonitoringServiceModel {
                service_name: "科研研发管理".to_string(),
                status: "healthy".to_string(),
                response_time_ms: 120,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务运行正常".to_string()),
            },
            MonitoringServiceModel {
                service_name: "实验室信息管理".to_string(),
                status: "healthy".to_string(),
                response_time_ms: 85,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务运行正常".to_string()),
            },
            MonitoringServiceModel {
                service_name: "数据大屏报表".to_string(),
                status: "degraded".to_string(),
                response_time_ms: 250,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("响应时间较长".to_string()),
            },
            MonitoringServiceModel {
                service_name: "厂区空间数字化".to_string(),
                status: "healthy".to_string(),
                response_time_ms: 156,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务运行正常".to_string()),
            },
            MonitoringServiceModel {
                service_name: "人力资源管理".to_string(),
                status: "healthy".to_string(),
                response_time_ms: 95,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务运行正常".to_string()),
            },
            MonitoringServiceModel {
                service_name: "企业资源计划".to_string(),
                status: "unhealthy".to_string(),
                response_time_ms: 0,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务连接超时".to_string()),
            },
            MonitoringServiceModel {
                service_name: "生产执行系统".to_string(),
                status: "healthy".to_string(),
                response_time_ms: 112,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务运行正常".to_string()),
            },
            MonitoringServiceModel {
                service_name: "仓储管理系统".to_string(),
                status: "healthy".to_string(),
                response_time_ms: 78,
                last_check: chrono::Utc::now().to_rfc3339(),
                message: Some("服务运行正常".to_string()),
            },
        ]
    }

    pub fn get_metrics(&self) -> MonitoringMetrics {
        MonitoringMetrics {
            requests_total: 12847,
            requests_success: 12653,
            requests_failed: 194,
            avg_response_time_ms: 156,
            active_connections: 42,
            memory_usage_mb: 892,
            cpu_usage_percent: 23,
        }
    }

    pub fn get_alerts(&self) -> Vec<Alert> {
        vec![
            Alert {
                id: "alert-001".to_string(),
                rule_name: "服务响应超时".to_string(),
                severity: "critical".to_string(),
                message: "企业资源计划服务响应时间超过阈值".to_string(),
                triggered_at: chrono::Utc::now() - chrono::Duration::minutes(15),
                acknowledged: false,
            },
            Alert {
                id: "alert-002".to_string(),
                rule_name: "高CPU使用率".to_string(),
                severity: "warning".to_string(),
                message: "数据大屏报表服务CPU使用率达到75%".to_string(),
                triggered_at: chrono::Utc::now() - chrono::Duration::minutes(30),
                acknowledged: false,
            },
            Alert {
                id: "alert-003".to_string(),
                rule_name: "内存使用率警告".to_string(),
                severity: "warning".to_string(),
                message: "系统内存使用率达到80%".to_string(),
                triggered_at: chrono::Utc::now() - chrono::Duration::hours(1),
                acknowledged: true,
            },
        ]
    }

    pub fn acknowledge_alert(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id, "acknowledged": true })
    }

    pub fn get_logs(&self) -> Vec<LogEntry> {
        vec![
            LogEntry {
                timestamp: chrono::Utc::now() - chrono::Duration::seconds(30),
                level: "INFO".to_string(),
                service: "portal".to_string(),
                message: "用户张三登录系统".to_string(),
            },
            LogEntry {
                timestamp: chrono::Utc::now() - chrono::Duration::seconds(45),
                level: "WARN".to_string(),
                service: "erp".to_string(),
                message: "数据库连接池接近上限".to_string(),
            },
            LogEntry {
                timestamp: chrono::Utc::now() - chrono::Duration::minutes(1),
                level: "ERROR".to_string(),
                service: "erp".to_string(),
                message: "服务健康检查失败".to_string(),
            },
            LogEntry {
                timestamp: chrono::Utc::now() - chrono::Duration::minutes(2),
                level: "INFO".to_string(),
                service: "lims".to_string(),
                message: "检验报告生成完成".to_string(),
            },
            LogEntry {
                timestamp: chrono::Utc::now() - chrono::Duration::minutes(5),
                level: "DEBUG".to_string(),
                service: "portal".to_string(),
                message: "缓存清理完成".to_string(),
            },
        ]
    }
}
