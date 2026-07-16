//! 集中化服务配置管理
//!
//! 统一管理所有服务的端口、依赖关系、部署配置等。
//! 提供运行时配置验证和一致性检查。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

/// 服务配置定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceDefinition {
    pub code: String,
    pub name: String,
    pub description: String,
    pub port: u16,
    pub env_var: String,
    pub service_dir: String,
    pub group: ServiceGroup,
    pub dependencies: Vec<String>,
    pub deployment_type: DeploymentType,
    pub api_base_path: String,
    pub health_check_path: String,
}

/// 服务分组
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum ServiceGroup {
    /// 核心服务
    Core,
    /// 经营管理
    Erp,
    /// 协同办公
    Collaboration,
    /// 生产制造
    Manufacturing,
    /// 供应链
    SupplyChain,
    /// 质量研发
    QualityRd,
    /// 数据分析
    Analytics,
    /// 基础设施
    Infrastructure,
}

/// 部署类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeploymentType {
    /// 独立进程
    Standalone,
    /// 虚拟服务（由 unified-core 承载）
    Virtual,
}

/// 服务配置注册表
pub struct ServiceConfigRegistry {
    services: HashMap<String, ServiceDefinition>,
    virtual_services: HashMap<String, String>, // virtual_service -> provider
}

impl ServiceConfigRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            services: HashMap::new(),
            virtual_services: HashMap::new(),
        };
        registry.load_default_config();
        registry
    }

    /// 加载默认配置（与 config/services.yaml 保持一致）
    fn load_default_config(&mut self) {
        // 核心服务
        self.register(ServiceDefinition {
            code: "unified-core".into(),
            name: "统一核心服务".into(),
            description: "IAM + Flow + File + Communication".into(),
            port: 8000,
            env_var: "CORE_PORT".into(),
            service_dir: "unified-core".into(),
            group: ServiceGroup::Core,
            dependencies: vec![],
            deployment_type: DeploymentType::Standalone,
            api_base_path: "/api/core".into(),
            health_check_path: "/health".into(),
        });

        // 虚拟服务（由 unified-core 承载）
        let virtual_svcs = vec![
            ("iam", "身份认证服务", "/api/core/iam"),
            ("flow", "工作流引擎", "/api/core/flow"),
            ("file", "文件存储服务", "/api/core/file"),
            ("notification", "通知服务", "/api/core/notification"),
            ("mail", "邮件服务", "/api/core/mail"),
            ("im", "即时通讯", "/api/core/im"),
        ];
        for (code, name, path) in virtual_svcs {
            self.virtual_services
                .insert(code.to_string(), "unified-core".to_string());
            self.register(ServiceDefinition {
                code: code.into(),
                name: name.into(),
                description: format!("{} (由 unified-core 提供)", name),
                port: 8000,
                env_var: format!("{}_PORT", code.to_uppercase()),
                service_dir: "unified-core".into(),
                group: ServiceGroup::Core,
                dependencies: vec!["unified-core".into()],
                deployment_type: DeploymentType::Virtual,
                api_base_path: path.into(),
                health_check_path: "/health".into(),
            });
        }

        // 业务服务定义
        let business_svcs = vec![
            ("erp", "企业资源计划", 8010, ServiceGroup::Erp, vec!["unified-core"], "/api/erp"),
            ("finance", "财务管理", 8011, ServiceGroup::Erp, vec!["unified-core", "erp"], "/api/finance"),
            ("doc", "文档管理", 8012, ServiceGroup::Erp, vec!["unified-core"], "/api/doc"),
            ("ai", "AI智能服务", 8013, ServiceGroup::Erp, vec!["unified-core"], "/api/ai"),
            ("hrm", "人力资源管理", 8020, ServiceGroup::Collaboration, vec!["unified-core"], "/api/hrm"),
            ("pm", "项目管理", 8023, ServiceGroup::Collaboration, vec!["unified-core"], "/api/pm"),
            ("crm", "客户关系管理", 8029, ServiceGroup::Collaboration, vec!["unified-core"], "/api/crm"),
            ("mes", "生产执行系统", 8030, ServiceGroup::Manufacturing, vec!["unified-core"], "/api/mes"),
            ("pdm", "产品数据管理", 8031, ServiceGroup::Manufacturing, vec!["unified-core", "mes"], "/api/pdm"),
            ("scm", "供应链管理", 8040, ServiceGroup::SupplyChain, vec!["unified-core"], "/api/scm"),
            ("wms", "仓储管理", 8041, ServiceGroup::SupplyChain, vec!["unified-core", "scm"], "/api/wms"),
            ("srm", "供应商管理", 8042, ServiceGroup::SupplyChain, vec!["unified-core", "scm"], "/api/srm"),
            ("qms", "质量管理", 8050, ServiceGroup::QualityRd, vec!["unified-core", "erp", "mes"], "/api/qms"),
            ("lims", "实验室信息管理", 8051, ServiceGroup::QualityRd, vec!["unified-core", "qms"], "/api/lims"),
            ("ehs", "环境健康安全", 8052, ServiceGroup::QualityRd, vec!["unified-core", "mes", "qms"], "/api/ehs"),
            ("rs", "研发管理", 8053, ServiceGroup::QualityRd, vec!["unified-core", "pm", "mes"], "/api/rd"),
            ("bi", "商业智能", 8060, ServiceGroup::Analytics, vec!["unified-core"], "/api/bi"),
            ("monitor", "系统监控", 8062, ServiceGroup::Analytics, vec!["unified-core"], "/api/monitor"),
            ("portal", "企业门户", 8063, ServiceGroup::Analytics, vec!["unified-core"], "/api/portal"),
            ("mobile", "移动服务", 8070, ServiceGroup::Infrastructure, vec!["unified-core"], "/api/mobile"),
            ("gis", "地理信息服务", 8071, ServiceGroup::Infrastructure, vec!["unified-core", "mes"], "/api/gis"),
            ("integration", "集成服务", 8072, ServiceGroup::Infrastructure, vec!["unified-core"], "/api/integration"),
        ];

        for (code, name, port, group, deps, path) in business_svcs {
            self.register(ServiceDefinition {
                code: code.into(),
                name: name.into(),
                description: name.into(),
                port,
                env_var: format!("{}_PORT", code.to_uppercase()),
                service_dir: code.into(),
                group,
                dependencies: deps.into_iter().map(String::from).collect(),
                deployment_type: DeploymentType::Standalone,
                api_base_path: path.into(),
                health_check_path: "/health".into(),
            });
        }
    }

    pub fn register(&mut self, service: ServiceDefinition) {
        self.services.insert(service.code.clone(), service);
    }

    pub fn get(&self, code: &str) -> Option<&ServiceDefinition> {
        self.services.get(code)
    }

    pub fn get_all(&self) -> Vec<&ServiceDefinition> {
        let mut services: Vec<_> = self.services.values().collect();
        services.sort_by_key(|s| (s.group.clone(), s.port));
        services
    }

    pub fn get_by_group(&self, group: ServiceGroup) -> Vec<&ServiceDefinition> {
        self.services
            .values()
            .filter(|s| s.group == group)
            .collect()
    }

    pub fn get_dependencies(&self, code: &str) -> Vec<&ServiceDefinition> {
        if let Some(svc) = self.services.get(code) {
            svc.dependencies
                .iter()
                .filter_map(|dep| self.services.get(dep))
                .collect()
        } else {
            vec![]
        }
    }

    /// 获取启动顺序（拓扑排序）
    pub fn get_startup_order(&self) -> Result<Vec<String>, String> {
        let mut visited = std::collections::HashSet::new();
        let mut result = vec![];

        fn visit(
            code: &str,
            registry: &ServiceConfigRegistry,
            visited: &mut std::collections::HashSet<String>,
            result: &mut Vec<String>,
            path: &mut Vec<String>,
        ) -> Result<(), String> {
            if visited.contains(code) {
                return Ok(());
            }
            if path.contains(&code.to_string()) {
                return Err(format!("Circular dependency detected: {:?}", path));
            }

            path.push(code.to_string());

            if let Some(svc) = registry.services.get(code) {
                for dep in &svc.dependencies {
                    visit(dep, registry, visited, result, path)?;
                }
            }

            path.pop();
            visited.insert(code.to_string());

            if registry.services.contains_key(code) {
                result.push(code.to_string());
            }
            Ok(())
        }

        for code in self.services.keys() {
            let mut path = vec![];
            visit(code, self, &mut visited, &mut result, &mut path)?;
        }

        Ok(result)
    }

    /// 验证配置一致性
    pub fn validate(&self) -> Vec<ValidationIssue> {
        let mut issues = vec![];

        for (code, svc) in &self.services {
            // 检查依赖是否存在
            for dep in &svc.dependencies {
                if !self.services.contains_key(dep) {
                    issues.push(ValidationIssue {
                        severity: ValidationSeverity::Error,
                        service: code.clone(),
                        message: format!("Dependency '{}' not found in registry", dep),
                    });
                }
            }

            // 检查端口冲突
            for (other_code, other_svc) in &self.services {
                if code != other_code
                    && svc.port == other_svc.port
                    && svc.deployment_type == DeploymentType::Standalone
                    && other_svc.deployment_type == DeploymentType::Standalone
                {
                    issues.push(ValidationIssue {
                        severity: ValidationSeverity::Error,
                        service: code.clone(),
                        message: format!("Port {} conflicts with service '{}'", svc.port, other_code),
                    });
                }
            }
        }

        issues
    }

    /// 获取服务 URL（从环境变量）
    pub fn get_service_url(&self, code: &str) -> Option<String> {
        let svc = self.services.get(code)?;
        let port = env::var(&svc.env_var)
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(svc.port);

        // 在 Docker 环境中，服务名即为主机名
        if env::var("DOCKER_ENV").is_ok() {
            Some(format!("http://{}:{}", code, port))
        } else {
            Some(format!("http://localhost:{}", port))
        }
    }

    /// 获取虚拟服务的提供者
    pub fn get_virtual_service_provider(&self, code: &str) -> Option<&String> {
        self.virtual_services.get(code)
    }
}

/// 配置验证问题
#[derive(Debug, Clone, Serialize)]
pub struct ValidationIssue {
    pub severity: ValidationSeverity,
    pub service: String,
    pub message: String,
}

/// 验证问题严重级别
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ValidationSeverity {
    Error,
    Warning,
    Info,
}

/// 全局配置单例
use std::sync::OnceLock;
static REGISTRY: OnceLock<ServiceConfigRegistry> = OnceLock::new();

pub fn global_registry() -> &'static ServiceConfigRegistry {
    REGISTRY.get_or_init(ServiceConfigRegistry::new)
}

impl Default for ServiceConfigRegistry {
    fn default() -> Self {
        Self::new()
    }
}
