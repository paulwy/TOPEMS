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
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-doc".to_string(),
                display_name: "文档管理服务".to_string(),
                description: "文档管理与文件存储".to_string(),
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-pm".to_string(),
                display_name: "项目管理服务".to_string(),
                description: "项目管理与预算管理".to_string(),
                port: 8023,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "notification-service".to_string(),
                display_name: "通知服务".to_string(),
                description: "消息通知服务".to_string(),
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-integration".to_string(),
                display_name: "集成服务".to_string(),
                description: "系统集成服务".to_string(),
                port: 8072,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-portal".to_string(),
                display_name: "企业门户".to_string(),
                description: "企业统一门户".to_string(),
                port: 8063,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-flow".to_string(),
                display_name: "工作流服务".to_string(),
                description: "工作流引擎与审批流程".to_string(),
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-erp".to_string(),
                display_name: "企业资源计划".to_string(),
                description: "企业资源规划管理".to_string(),
                port: 8010,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-hrm".to_string(),
                display_name: "人力资源管理".to_string(),
                description: "人力资源管理".to_string(),
                port: 8020,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-crm".to_string(),
                display_name: "客户关系管理".to_string(),
                description: "客户关系管理".to_string(),
                port: 8029,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-ai".to_string(),
                display_name: "AI知识库".to_string(),
                description: "AI智能知识库".to_string(),
                port: 8064,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/ai".to_string(),
            },
            ServiceConfig {
                name: "topems-finance".to_string(),
                display_name: "财务管理系统".to_string(),
                description: "财务核算与报表管理".to_string(),
                port: 8011,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/finance".to_string(),
            },
            ServiceConfig {
                name: "topems-doc-standalone".to_string(),
                display_name: "文档管理服务(独立)".to_string(),
                description: "文档管理独立部署版".to_string(),
                port: 8012,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/doc".to_string(),
            },
            ServiceConfig {
                name: "topems-rs".to_string(),
                display_name: "研发管理系统".to_string(),
                description: "科研配方与实验管理".to_string(),
                port: 8053,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-lims".to_string(),
                display_name: "实验室系统".to_string(),
                description: "实验室信息管理".to_string(),
                port: 8051,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-pdm".to_string(),
                display_name: "产品数据管理".to_string(),
                description: "产品数据管理".to_string(),
                port: 8031,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-mes".to_string(),
                display_name: "生产执行系统".to_string(),
                description: "生产过程执行管理".to_string(),
                port: 8030,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-qms".to_string(),
                display_name: "质量管理系统".to_string(),
                description: "质量检验与管理".to_string(),
                port: 8050,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-ehs".to_string(),
                display_name: "安全管理系统".to_string(),
                description: "环境健康安全管理".to_string(),
                port: 8052,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-scm".to_string(),
                display_name: "供应链系统".to_string(),
                description: "供应链管理".to_string(),
                port: 8040,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-srm".to_string(),
                display_name: "供应商管理".to_string(),
                description: "供应商关系管理".to_string(),
                port: 8042,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-wms".to_string(),
                display_name: "仓库管理系统".to_string(),
                description: "仓储物流管理".to_string(),
                port: 8041,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-gis".to_string(),
                display_name: "地理信息系统".to_string(),
                description: "地理信息管理".to_string(),
                port: 8071,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-im".to_string(),
                display_name: "即时通讯".to_string(),
                description: "即时通讯服务".to_string(),
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-bi".to_string(),
                display_name: "商业智能".to_string(),
                description: "数据分析与报表".to_string(),
                port: 8060,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-report".to_string(),
                display_name: "报表服务".to_string(),
                description: "报表生成服务".to_string(),
                port: 8061,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-mail".to_string(),
                display_name: "邮件服务".to_string(),
                description: "邮件发送与模板管理".to_string(),
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-monitor".to_string(),
                display_name: "系统监控".to_string(),
                description: "系统监控服务".to_string(),
                port: 8062,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/v1".to_string(),
            },
            ServiceConfig {
                name: "topems-mobile".to_string(),
                display_name: "移动端服务".to_string(),
                description: "移动端API服务".to_string(),
                port: 8070,
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

    pub fn get_all_ports(&self) -> Vec<u16> {
        self.services.iter().map(|s| s.port).collect()
    }

    pub fn get_port_ranges(&self) -> Vec<(u16, u16)> {
        vec![
            (8000, 8009),
            (8010, 8029),
            (8030, 8039),
            (8040, 8049),
            (8050, 8059),
        ]
    }
}

impl Default for ServiceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_default_port(service_name: &str) -> u16 {
    match service_name {
        "topems-iam" => 8000,
        "topems-doc" => 8000,
        "topems-pm" => 8023,
        "notification-service" => 8000,
        "topems-integration" => 8072,
        "topems-portal" => 8063,
        "topems-flow" => 8000,
        "topems-erp" => 8010,
        "topems-hrm" => 8020,
        "topems-crm" => 8029,
        "topems-ai" => 8064,
        "topems-rs" => 8053,
        "topems-lims" => 8051,
        "topems-pdm" => 8031,
        "topems-mes" => 8030,
        "topems-qms" => 8050,
        "topems-ehs" => 8052,
        "topems-scm" => 8040,
        "topems-srm" => 8042,
        "topems-wms" => 8041,
        "topems-gis" => 8071,
        "topems-im" => 8000,
        "topems-bi" => 8060,
        "topems-report" => 8061,
        "topems-mail" => 8000,
        "topems-mobile" => 8070,
        "topems-monitor" => 8062,
        _ => 8080,
    }
}
pub fn get_service_name_by_port(port: u16) -> Option<&'static str> {
    match port {
        8000 => Some("topems-iam"),
        8010 => Some("topems-erp"),
        8020 => Some("topems-hrm"),
        8023 => Some("topems-pm"),
        8029 => Some("topems-crm"),
        8030 => Some("topems-mes"),
        8031 => Some("topems-pdm"),
        8040 => Some("topems-scm"),
        8041 => Some("topems-wms"),
        8042 => Some("topems-srm"),
        8050 => Some("topems-qms"),
        8051 => Some("topems-lims"),
        8052 => Some("topems-ehs"),
        8053 => Some("topems-rs"),
        8060 => Some("topems-bi"),
        8061 => Some("topems-report"),
        8062 => Some("topems-monitor"),
        8063 => Some("topems-portal"),
        8064 => Some("topems-ai"),
        8070 => Some("topems-mobile"),
        8071 => Some("topems-gis"),
        8072 => Some("topems-integration"),
        _ => None,
    }
}
