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

    /// 当前服务清单（26 个独立部署服务 + 1 个 unified-core）
    /// 虚拟服务（iam/doc/flow/file/monitor）由 unified-core 内部模块提供，
    /// 共用端口 8000，通过 URL 路径区分，不再作为独立条目列出。
    ///
    /// V66.1 新增：6 个扩展服务（search/communication/billing/ticket/feedback/lowcode）
    pub fn default_services() -> Vec<ServiceConfig> {
        vec![
            // === 核心平台 (8000) ===
            ServiceConfig {
                name: "unified-core".to_string(),
                display_name: "统一核心服务".to_string(),
                description: "IAM + Doc + Flow + File + Monitor 等虚拟服务 + 插件网关".to_string(),
                port: 8000,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/core".to_string(),
            },
            // === 扩展服务 (8082-8088，从 unified-core 外迁为独立进程) ===
            ServiceConfig {
                name: "topems-search".to_string(),
                display_name: "全文搜索服务".to_string(),
                description: "跨模块全文搜索引擎".to_string(),
                port: 8082,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/search".to_string(),
            },
            ServiceConfig {
                name: "topems-communication".to_string(),
                display_name: "通讯服务".to_string(),
                description: "邮件/通知/IM/站内消息（原 unified-core communication 模块外迁）".to_string(),
                port: 8084,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/communication".to_string(),
            },
            ServiceConfig {
                name: "topems-billing".to_string(),
                display_name: "计费服务".to_string(),
                description: "多租户计费与配额管理（原 unified-core billing 模块外迁）".to_string(),
                port: 8085,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/billing".to_string(),
            },
            ServiceConfig {
                name: "topems-ticket".to_string(),
                display_name: "工单服务".to_string(),
                description: "工单系统与处理流程（原 unified-core ticket 模块外迁）".to_string(),
                port: 8086,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/ticket".to_string(),
            },
            ServiceConfig {
                name: "topems-feedback".to_string(),
                display_name: "反馈服务".to_string(),
                description: "用户反馈与需求管理（原 unified-core feedback 模块外迁）".to_string(),
                port: 8087,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/feedback".to_string(),
            },
            ServiceConfig {
                name: "topems-lowcode".to_string(),
                display_name: "低代码平台".to_string(),
                description: "低代码开发平台（页面/表单/流程/数据模型设计器，预留）".to_string(),
                port: 8088,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/lowcode".to_string(),
            },
            // === 经营管理 (8010-8019) ===
            ServiceConfig {
                name: "topems-erp".to_string(),
                display_name: "企业资源计划".to_string(),
                description: "企业资源规划管理".to_string(),
                port: 8010,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/erp".to_string(),
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
                name: "topems-ai".to_string(),
                display_name: "AI服务".to_string(),
                description: "AI智能服务".to_string(),
                port: 8013,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/ai".to_string(),
            },
            // === 协同办公 (8020-8029) ===
            ServiceConfig {
                name: "topems-hrm".to_string(),
                display_name: "人力资源管理".to_string(),
                description: "人力资源管理".to_string(),
                port: 8020,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/hrm".to_string(),
            },
            ServiceConfig {
                name: "topems-pm".to_string(),
                display_name: "项目管理服务".to_string(),
                description: "项目管理与预算管理".to_string(),
                port: 8023,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/pm".to_string(),
            },
            ServiceConfig {
                name: "topems-crm".to_string(),
                display_name: "客户关系管理".to_string(),
                description: "客户关系管理".to_string(),
                port: 8029,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/crm".to_string(),
            },
            // === 生产制造 (8030-8039) ===
            ServiceConfig {
                name: "topems-mes".to_string(),
                display_name: "生产执行系统".to_string(),
                description: "生产过程执行管理".to_string(),
                port: 8030,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/mes".to_string(),
            },
            ServiceConfig {
                name: "topems-pdm".to_string(),
                display_name: "产品数据管理".to_string(),
                description: "产品数据管理".to_string(),
                port: 8031,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/pdm".to_string(),
            },
            // === 供应链 (8040-8049) ===
            ServiceConfig {
                name: "topems-scm".to_string(),
                display_name: "供应链系统".to_string(),
                description: "供应链管理".to_string(),
                port: 8040,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/scm".to_string(),
            },
            ServiceConfig {
                name: "topems-wms".to_string(),
                display_name: "仓库管理系统".to_string(),
                description: "仓储物流管理".to_string(),
                port: 8041,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/wms".to_string(),
            },
            ServiceConfig {
                name: "topems-srm".to_string(),
                display_name: "供应商管理".to_string(),
                description: "供应商关系管理".to_string(),
                port: 8042,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/srm".to_string(),
            },
            // === 质量/研发 (8050-8059) ===
            ServiceConfig {
                name: "topems-qms".to_string(),
                display_name: "质量管理系统".to_string(),
                description: "质量检验与管理".to_string(),
                port: 8050,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/qms".to_string(),
            },
            ServiceConfig {
                name: "topems-lims".to_string(),
                display_name: "实验室系统".to_string(),
                description: "实验室信息管理".to_string(),
                port: 8051,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/lims".to_string(),
            },
            ServiceConfig {
                name: "topems-ehs".to_string(),
                display_name: "安全管理系统".to_string(),
                description: "环境健康安全管理".to_string(),
                port: 8052,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/ehs".to_string(),
            },
            ServiceConfig {
                name: "topems-rd".to_string(),
                display_name: "研发管理系统".to_string(),
                description: "科研配方与实验管理".to_string(),
                port: 8053,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/rd".to_string(),
            },
            // === 数据分析/门户 (8060-8069) ===
            ServiceConfig {
                name: "topems-analytics".to_string(),
                display_name: "商业智能".to_string(),
                description: "数据分析与报表（含原 bi/report 功能）".to_string(),
                port: 8060,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/bi".to_string(),
            },
            ServiceConfig {
                name: "topems-portal".to_string(),
                display_name: "企业门户".to_string(),
                description: "企业统一门户".to_string(),
                port: 8063,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/portal".to_string(),
            },
            // === 基础设施 (8070-8079) ===
            ServiceConfig {
                name: "topems-mobile".to_string(),
                display_name: "移动端服务".to_string(),
                description: "移动端API服务".to_string(),
                port: 8070,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/mobile".to_string(),
            },
            ServiceConfig {
                name: "topems-gis".to_string(),
                display_name: "地理信息系统".to_string(),
                description: "地理信息管理".to_string(),
                port: 8071,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/gis".to_string(),
            },
            ServiceConfig {
                name: "topems-integration".to_string(),
                display_name: "集成服务".to_string(),
                description: "系统集成服务".to_string(),
                port: 8072,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/integration".to_string(),
            },
            // === 主数据 (8090) ===
            ServiceConfig {
                name: "topems-master-data".to_string(),
                display_name: "主数据管理".to_string(),
                description: "主数据管理服务".to_string(),
                port: 8090,
                health_endpoint: "/health".to_string(),
                api_prefix: "/api/master-data".to_string(),
            },
        ]
    }

    /// 支持以下格式的 name：
    ///   - 严格匹配：`"topems-billing"`
    ///   - 短名匹配：`"billing"`（自动尝试 `topems-{name}` 前缀匹配 + api_prefix 后缀匹配）
    pub fn get_service(&self, name: &str) -> Option<&ServiceConfig> {
        // 1) 严格匹配
        if let Some(s) = self.services.iter().find(|s| s.name == name) {
            return Some(s);
        }
        // 2) 短名匹配（billing → topems-billing）
        let prefixed = format!("topems-{}", name);
        if let Some(s) = self.services.iter().find(|s| s.name == prefixed) {
            return Some(s);
        }
        // 3) 去掉 topems- 前缀反向匹配
        if let Some(stripped) = name.strip_prefix("topems-") {
            if let Some(s) = self.services.iter().find(|s| {
                s.api_prefix == format!("/api/{}", stripped)
                    || s.api_prefix == format!("/api/core/{}", stripped)
            }) {
                return Some(s);
            }
        }
        // 4) 通过 api_prefix 匹配（master-data → /api/master-data）
        self.services.iter().find(|s| {
            s.api_prefix == format!("/api/{}", name)
                || s.api_prefix == format!("/api/core/{}", name)
        })
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
            (8000, 8009),   // 核心
            (8082, 8088),   // 扩展服务（search/communication/billing/ticket/feedback/lowcode）
            (8010, 8029),   // 经营 + 协同办公
            (8030, 8039),   // 生产制造
            (8040, 8049),   // 供应链
            (8050, 8059),   // 质量/研发
            (8060, 8069),   // 数据分析/门户
            (8070, 8079),   // 基础设施
            (8090, 8099),   // 主数据
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
        // 核心
        "unified-core" | "core" => 8000,
        // 扩展服务（V66 外迁独立进程）
        "search" | "topems-search" => 8082,
        "communication" | "comm" | "topems-communication" => 8084,
        "billing" | "topems-billing" => 8085,
        "ticket" | "topems-ticket" => 8086,
        "feedback" | "topems-feedback" => 8087,
        "lowcode" | "topems-lowcode" => 8088,
        // 经营管理
        "erp" | "topems-erp" => 8010,
        "finance" | "topems-finance" => 8011,
        "ai" | "topems-ai" => 8013,
        // 协同办公
        "hrm" | "topems-hrm" => 8020,
        "pm" | "topems-pm" => 8023,
        "crm" | "topems-crm" => 8029,
        // 生产制造
        "mes" | "topems-mes" => 8030,
        "pdm" | "topems-pdm" => 8031,
        // 供应链
        "scm" | "topems-scm" => 8040,
        "wms" | "topems-wms" => 8041,
        "srm" | "topems-srm" => 8042,
        // 质量/研发
        "qms" | "topems-qms" => 8050,
        "lims" | "topems-lims" => 8051,
        "ehs" | "topems-ehs" => 8052,
        "rd" | "topems-rd" => 8053,
        // 数据分析/门户
        "bi" | "analytics" | "topems-analytics" => 8060,
        "portal" | "topems-portal" => 8063,
        // 基础设施
        "mobile" | "topems-mobile" => 8070,
        "gis" | "topems-gis" => 8071,
        "integration" | "topems-integration" => 8072,
        // 主数据（V66.1：删除 mdm 别名，统一使用 master-data / topems-master-data）
        "master-data" | "topems-master-data" => 8090,
        // 虚拟服务（统一归 core）
        "iam" | "workflow" | "flow" | "file" | "doc" | "monitor" | "tenant" | "plugin" | "automation" | "migration" | "master" => 8000,
        // 兼容旧名
        "notification" | "mail" | "im" => 8084, // 外迁到 communication
        _ => 8080,
    }
}

pub fn get_service_name_by_port(port: u16) -> Option<&'static str> {
    match port {
        // 核心
        8000 => Some("unified-core"),
        // 扩展服务
        8082 => Some("topems-search"),
        8084 => Some("topems-communication"),
        8085 => Some("topems-billing"),
        8086 => Some("topems-ticket"),
        8087 => Some("topems-feedback"),
        8088 => Some("topems-lowcode"),
        // 经营管理
        8010 => Some("topems-erp"),
        8011 => Some("topems-finance"),
        8013 => Some("topems-ai"),
        // 协同办公
        8020 => Some("topems-hrm"),
        8023 => Some("topems-pm"),
        8029 => Some("topems-crm"),
        // 生产制造
        8030 => Some("topems-mes"),
        8031 => Some("topems-pdm"),
        // 供应链
        8040 => Some("topems-scm"),
        8041 => Some("topems-wms"),
        8042 => Some("topems-srm"),
        // 质量/研发
        8050 => Some("topems-qms"),
        8051 => Some("topems-lims"),
        8052 => Some("topems-ehs"),
        8053 => Some("topems-rd"),
        // 数据分析/门户
        8060 => Some("topems-analytics"),
        8063 => Some("topems-portal"),
        // 基础设施
        8070 => Some("topems-mobile"),
        8071 => Some("topems-gis"),
        8072 => Some("topems-integration"),
        // 主数据
        8090 => Some("topems-master-data"),
        _ => None,
    }
}
