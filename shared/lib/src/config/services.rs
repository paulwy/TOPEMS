use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub port: u16,
    pub health_endpoint: String,
    pub api_prefix: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceRegistry {
    pub services: Vec<ServiceConfig>,
}

impl ServiceRegistry {
    pub fn new() -> Self {
        Self {
            services: Self::default_services(),
        }
    }

    pub fn default_services() -> Vec<ServiceConfig> {
        vec![
            ServiceConfig {
                name: "topems-iam".to_string(),
                display_name: "身份认证服务".to_string(),
                description: "统一身份认证与授权管理".to_string(),
                port: 8002,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-doc".to_string(),
                display_name: "文档管理服务".to_string(),
                description: "文档管理与文件存储".to_string(),
                port: 8001,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-ai".to_string(),
                display_name: "AI知识库".to_string(),
                description: "AI智能知识库".to_string(),
                port: 8003,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-flow".to_string(),
                display_name: "工作流服务".to_string(),
                description: "工作流引擎与审批流程".to_string(),
                port: 8004,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-rs".to_string(),
                display_name: "研发管理系统".to_string(),
                description: "科研配方与实验管理".to_string(),
                port: 8005,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-lims".to_string(),
                display_name: "实验室系统".to_string(),
                description: "实验室信息管理".to_string(),
                port: 8006,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-qms".to_string(),
                display_name: "质量管理系统".to_string(),
                description: "质量检验与管理".to_string(),
                port: 8007,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-ehs".to_string(),
                display_name: "安全管理系统".to_string(),
                description: "环境健康安全管理".to_string(),
                port: 8008,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-erp".to_string(),
                display_name: "企业资源计划".to_string(),
                description: "企业资源规划管理".to_string(),
                port: 8009,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-srm".to_string(),
                display_name: "供应商管理".to_string(),
                description: "供应商关系管理".to_string(),
                port: 8010,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-bi".to_string(),
                display_name: "商业智能".to_string(),
                description: "数据分析与报表".to_string(),
                port: 8011,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-crm".to_string(),
                display_name: "客户关系管理".to_string(),
                description: "客户关系管理".to_string(),
                port: 8014,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-pdm".to_string(),
                display_name: "产品数据管理".to_string(),
                description: "产品数据管理".to_string(),
                port: 8015,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-scm".to_string(),
                display_name: "供应链系统".to_string(),
                description: "供应链管理".to_string(),
                port: 8016,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-gis".to_string(),
                display_name: "地理信息系统".to_string(),
                description: "地理信息管理".to_string(),
                port: 8017,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-im".to_string(),
                display_name: "即时通讯".to_string(),
                description: "即时通讯服务".to_string(),
                port: 8018,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-hrm".to_string(),
                display_name: "人力资源管理".to_string(),
                description: "人力资源管理".to_string(),
                port: 8019,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-wms".to_string(),
                display_name: "仓库管理系统".to_string(),
                description: "仓储物流管理".to_string(),
                port: 8020,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-mobile".to_string(),
                display_name: "移动端服务".to_string(),
                description: "移动端API服务".to_string(),
                port: 8021,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-integration".to_string(),
                display_name: "集成服务".to_string(),
                description: "系统集成服务".to_string(),
                port: 8022,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-portal".to_string(),
                display_name: "企业门户".to_string(),
                description: "企业统一门户".to_string(),
                port: 8023,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-report".to_string(),
                display_name: "报表服务".to_string(),
                description: "报表生成服务".to_string(),
                port: 8024,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-mes".to_string(),
                display_name: "生产执行系统".to_string(),
                description: "生产过程执行管理".to_string(),
                port: 8025,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "notification-service".to_string(),
                display_name: "通知服务".to_string(),
                description: "消息通知服务".to_string(),
                port: 8026,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-mail".to_string(),
                display_name: "邮件服务".to_string(),
                description: "邮件发送与模板管理".to_string(),
                port: 8027,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
        ]
    }

    pub fn get_service(&self, name: &str) -> Option<&ServiceConfig> {
        self.services.iter().find(|s| s.name == name)
    }

    pub fn get_service_port(&self, name: &str) -> u16 {
        self.get_service(name).map(|s| s.port).unwrap_or(8080)
    }

    pub fn get_service_url(&self, name: &str) -> String {
        self.get_service(name)
            .map(|s| format!("http://localhost:{}", s.port))
            .unwrap_or_else(|| "http://localhost:8080".to_string())
    }

    pub fn to_map(&self) -> HashMap<String, ServiceConfig> {
        self.services
            .iter()
            .map(|s| (s.name.clone(), s.clone()))
            .collect()
    }
}

impl Default for ServiceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_default_port(service_name: &str) -> u16 {
    match service_name {
        "topems-iam" => 8002,
        "topems-doc" => 8001,
        "topems-ai" => 8003,
        "topems-flow" => 8004,
        "topems-rs" => 8005,
        "topems-lims" => 8006,
        "topems-qms" => 8007,
        "topems-ehs" => 8008,
        "topems-erp" => 8009,
        "topems-srm" => 8010,
        "topems-bi" => 8011,
        "topems-crm" => 8014,
        "topems-pdm" => 8015,
        "topems-scm" => 8016,
        "topems-gis" => 8017,
        "topems-im" => 8018,
        "topems-hrm" => 8019,
        "topems-wms" => 8020,
        "topems-mobile" => 8021,
        "topems-integration" => 8022,
        "topems-portal" => 8023,
        "topems-report" => 8024,
        "topems-mes" => 8025,
        "notification-service" => 8026,
        "topems-mail" => 8027,
        _ => 8080,
    }
}