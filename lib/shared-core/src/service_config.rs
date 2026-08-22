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
            (
                "erp",
                "企业资源计划",
                8010,
                ServiceGroup::Erp,
                vec!["unified-core"],
                "/api/erp",
            ),
            (
                "finance",
                "财务管理",
                8011,
                ServiceGroup::Erp,
                vec!["unified-core", "erp"],
                "/api/finance",
            ),
            (
                "doc",
                "文档管理",
                8012,
                ServiceGroup::Erp,
                vec!["unified-core"],
                "/api/doc",
            ),
            (
                "ai",
                "AI智能服务",
                8013,
                ServiceGroup::Erp,
                vec!["unified-core"],
                "/api/ai",
            ),
            (
                "hrm",
                "人力资源管理",
                8020,
                ServiceGroup::Collaboration,
                vec!["unified-core"],
                "/api/hrm",
            ),
            (
                "pm",
                "项目管理",
                8023,
                ServiceGroup::Collaboration,
                vec!["unified-core"],
                "/api/pm",
            ),
            (
                "crm",
                "客户关系管理",
                8029,
                ServiceGroup::Collaboration,
                vec!["unified-core"],
                "/api/crm",
            ),
            (
                "mes",
                "生产执行系统",
                8030,
                ServiceGroup::Manufacturing,
                vec!["unified-core"],
                "/api/mes",
            ),
            (
                "pdm",
                "产品数据管理",
                8031,
                ServiceGroup::Manufacturing,
                vec!["unified-core", "mes"],
                "/api/pdm",
            ),
            (
                "scm",
                "供应链管理",
                8040,
                ServiceGroup::SupplyChain,
                vec!["unified-core"],
                "/api/scm",
            ),
            (
                "wms",
                "仓储管理",
                8041,
                ServiceGroup::SupplyChain,
                vec!["unified-core", "scm"],
                "/api/wms",
            ),
            (
                "srm",
                "供应商管理",
                8042,
                ServiceGroup::SupplyChain,
                vec!["unified-core", "scm"],
                "/api/srm",
            ),
            (
                "qms",
                "质量管理",
                8050,
                ServiceGroup::QualityRd,
                vec!["unified-core", "erp", "mes"],
                "/api/qms",
            ),
            (
                "lims",
                "实验室信息管理",
                8051,
                ServiceGroup::QualityRd,
                vec!["unified-core", "qms"],
                "/api/lims",
            ),
            (
                "ehs",
                "环境健康安全",
                8052,
                ServiceGroup::QualityRd,
                vec!["unified-core", "mes", "qms"],
                "/api/ehs",
            ),
            (
                "rs",
                "研发管理",
                8053,
                ServiceGroup::QualityRd,
                vec!["unified-core", "pm", "mes"],
                "/api/rd",
            ),
            (
                "bi",
                "商业智能",
                8060,
                ServiceGroup::Analytics,
                vec!["unified-core"],
                "/api/bi",
            ),
            (
                "monitor",
                "系统监控",
                8095,
                ServiceGroup::Analytics,
                vec!["unified-core"],
                "/api/monitor",
            ),
            (
                "portal",
                "企业门户",
                8063,
                ServiceGroup::Analytics,
                vec!["unified-core"],
                "/api/portal",
            ),
            (
                "mobile",
                "移动服务",
                8070,
                ServiceGroup::Infrastructure,
                vec!["unified-core"],
                "/api/mobile",
            ),
            (
                "gis",
                "地理信息服务",
                8071,
                ServiceGroup::Infrastructure,
                vec!["unified-core", "mes"],
                "/api/gis",
            ),
            (
                "integration",
                "集成服务",
                8072,
                ServiceGroup::Infrastructure,
                vec!["unified-core"],
                "/api/integration",
            ),
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
                        message: format!(
                            "Port {} conflicts with service '{}'",
                            svc.port, other_code
                        ),
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

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    fn new_registry_has_expected_service_count() {
        let reg = ServiceConfigRegistry::new();
        assert_eq!(
            reg.get_all().len(),
            29,
            "默认配置应包含 29 个服务（1 core + 6 virtual + 22 business）"
        );
    }

    #[test]
    fn default_registry_contains_unified_core() {
        let reg = ServiceConfigRegistry::new();
        let core = reg
            .get("unified-core")
            .expect("unified-core 应存在于默认注册表");
        assert_eq!(core.group, ServiceGroup::Core);
        assert_eq!(core.port, 8000);
        assert_eq!(core.deployment_type, DeploymentType::Standalone);
        assert!(core.dependencies.is_empty());
    }

    #[test]
    fn get_nonexistent_service_returns_none() {
        let reg = ServiceConfigRegistry::new();
        assert!(reg.get("nonexistent").is_none());
        assert!(reg.get("").is_none());
    }

    #[test]
    fn get_all_returns_nonempty_sorted() {
        let reg = ServiceConfigRegistry::new();
        let all = reg.get_all();
        assert!(!all.is_empty());
        let mut pairs = all.windows(2);
        while let Some([a, b]) = pairs.next() {
            assert!(
                (a.group.clone(), a.port) <= (b.group.clone(), b.port),
                "服务应按 (group, port) 排序"
            );
        }
    }

    #[test]
    fn get_all_consistency_with_get() {
        let reg = ServiceConfigRegistry::new();
        let all = reg.get_all();
        for svc in &all {
            let fetched = reg
                .get(&svc.code)
                .expect("get_all 中的每个服务都应可被 get 查到");
            assert_eq!(fetched.code, svc.code);
        }
    }

    #[test]
    fn get_by_group_core_includes_unified_core() {
        let reg = ServiceConfigRegistry::new();
        let core_group = reg.get_by_group(ServiceGroup::Core);
        assert!(
            core_group.iter().any(|s| s.code == "unified-core"),
            "Core 组应包含 unified-core"
        );
        assert!(
            core_group.len() >= 7,
            "Core 组应有 1 个 standalone + 6 个虚拟服务"
        );
    }

    #[test]
    fn get_by_group_erp_has_erp_and_finance() {
        let reg = ServiceConfigRegistry::new();
        let erp_group = reg.get_by_group(ServiceGroup::Erp);
        let codes: Vec<&str> = erp_group.iter().map(|s| s.code.as_str()).collect();
        assert!(codes.contains(&"erp"));
        assert!(codes.contains(&"finance"));
        assert_eq!(erp_group.len(), 4, "Erp 组应有 erp/finance/doc/ai 四个服务");
    }

    #[test]
    fn get_by_group_infrastructure_isolation() {
        let reg = ServiceConfigRegistry::new();
        let infra = reg.get_by_group(ServiceGroup::Infrastructure);
        for svc in &infra {
            assert_eq!(svc.group, ServiceGroup::Infrastructure);
        }
    }

    #[test]
    fn get_startup_order_returns_ok_and_is_topo_sorted() {
        let reg = ServiceConfigRegistry::new();
        let order = reg.get_startup_order().expect("默认配置不应有循环依赖");
        assert_eq!(order.len(), 29);
        let pos: HashMap<&str, usize> = order
            .iter()
            .enumerate()
            .map(|(i, s)| (s.as_str(), i))
            .collect();

        for svc in reg.get_all() {
            let svc_pos = *pos.get(svc.code.as_str()).unwrap();
            for dep in &svc.dependencies {
                let dep_pos = *pos.get(dep.as_str()).unwrap();
                assert!(
                    dep_pos < svc_pos,
                    "依赖 {} 应排在 {} 之前（dep_pos={}, svc_pos={}）",
                    dep,
                    svc.code,
                    dep_pos,
                    svc_pos
                );
            }
        }
    }

    #[test]
    fn unified_core_is_among_first_in_startup_order() {
        let reg = ServiceConfigRegistry::new();
        let order = reg.get_startup_order().unwrap();
        let core_idx = order.iter().position(|s| s == "unified-core").unwrap();
        assert!(
            core_idx <= 6,
            "unified-core 应非常靠前（它是无依赖的根服务），实际位置: {}",
            core_idx
        );
    }

    #[test]
    fn validate_detects_port_conflict_between_core_and_monitor() {
        // FIXED: monitor moved to port 8095, no longer conflicts with unified-core:8000
        let reg = ServiceConfigRegistry::new();
        let issues = reg.validate();
        let has_port_conflict = issues.iter().any(|i| {
            i.severity == ValidationSeverity::Error
                && i.message.contains("conflicts")
                && (i.service == "unified-core" || i.service == "monitor")
        });
        assert!(
            !has_port_conflict,
            "修复后 monitor:8095 与 unified-core:8000 不应再有端口冲突。实际 issues: {:?}",
            issues
        );
    }

    #[test]
    fn validate_all_dependencies_exist() {
        let reg = ServiceConfigRegistry::new();
        let issues = reg.validate();
        let missing_dep_issues: Vec<_> = issues
            .iter()
            .filter(|i| i.message.contains("Dependency"))
            .collect();
        assert!(
            missing_dep_issues.is_empty(),
            "默认配置不应有缺失依赖: {:?}",
            missing_dep_issues
        );
    }

    #[test]
    #[serial]
    fn get_service_url_local_env_default() {
        // 防御性清理：即使其他测试泄漏了 env var 也能恢复默认行为
        std::env::remove_var("CORE_PORT");
        std::env::remove_var("DOCKER_ENV");
        let reg = ServiceConfigRegistry::new();
        let url = reg.get_service_url("unified-core").expect("应返回 URL");
        assert_eq!(url, "http://localhost:8000");
    }

    #[test]
    fn get_service_url_nonexistent_returns_none() {
        let reg = ServiceConfigRegistry::new();
        assert!(reg.get_service_url("no-such-svc").is_none());
    }

    #[test]
    #[serial]
    fn get_service_url_respects_env_override() {
        std::env::set_var("CORE_PORT", "9999");
        let reg = ServiceConfigRegistry::new();
        let url = reg.get_service_url("unified-core").unwrap();
        assert_eq!(url, "http://localhost:9999");
        std::env::remove_var("CORE_PORT");
    }

    #[test]
    #[serial]
    fn get_service_url_docker_env_uses_service_name_as_host() {
        std::env::set_var("DOCKER_ENV", "1");
        let reg = ServiceConfigRegistry::new();
        let url = reg.get_service_url("erp").unwrap();
        assert_eq!(url, "http://erp:8010");
        std::env::remove_var("DOCKER_ENV");
    }

    #[test]
    fn get_virtual_service_provider_iam_is_unified_core() {
        let reg = ServiceConfigRegistry::new();
        let provider = reg
            .get_virtual_service_provider("iam")
            .expect("iam 应有提供者");
        assert_eq!(provider, "unified-core");
    }

    #[test]
    fn get_virtual_service_provider_all_six_virtual_services() {
        let reg = ServiceConfigRegistry::new();
        for code in ["iam", "flow", "file", "notification", "mail", "im"] {
            let provider = reg.get_virtual_service_provider(code);
            assert_eq!(provider, Some(&"unified-core".to_string()));
        }
    }

    #[test]
    fn get_virtual_service_provider_nonexistent_returns_none() {
        let reg = ServiceConfigRegistry::new();
        assert!(reg.get_virtual_service_provider("erp").is_none());
        assert!(reg.get_virtual_service_provider("bogus").is_none());
    }

    #[test]
    fn get_dependencies_returns_ordered_deps() {
        let reg = ServiceConfigRegistry::new();
        let core_deps = reg.get_dependencies("unified-core");
        assert!(core_deps.is_empty(), "unified-core 无依赖");

        let finance_deps = reg.get_dependencies("finance");
        assert_eq!(finance_deps.len(), 2);
        let codes: Vec<&str> = finance_deps.iter().map(|s| s.code.as_str()).collect();
        assert!(codes.contains(&"unified-core"));
        assert!(codes.contains(&"erp"));
    }

    #[test]
    fn get_dependencies_nonexistent_returns_empty() {
        let reg = ServiceConfigRegistry::new();
        assert!(reg.get_dependencies("nope").is_empty());
    }

    #[test]
    fn register_adds_service() {
        let mut reg = ServiceConfigRegistry::new();
        let before = reg.get_all().len();
        reg.register(ServiceDefinition {
            code: "test-svc".into(),
            name: "测试服务".into(),
            description: "".into(),
            port: 9999,
            env_var: "TEST_PORT".into(),
            service_dir: "test-svc".into(),
            group: ServiceGroup::Infrastructure,
            dependencies: vec![],
            deployment_type: DeploymentType::Standalone,
            api_base_path: "/api/test".into(),
            health_check_path: "/health".into(),
        });
        assert_eq!(reg.get_all().len(), before + 1);
        assert!(reg.get("test-svc").is_some());
    }

    // ---- serde roundtrip ----

    #[test]
    fn service_group_serde_roundtrip() {
        for group in [
            ServiceGroup::Core,
            ServiceGroup::Erp,
            ServiceGroup::Collaboration,
            ServiceGroup::Manufacturing,
            ServiceGroup::SupplyChain,
            ServiceGroup::QualityRd,
            ServiceGroup::Analytics,
            ServiceGroup::Infrastructure,
        ] {
            let json = serde_json::to_string(&group).unwrap();
            assert!(json.starts_with('"') && json.ends_with('"'));
            assert_eq!(json, json.to_lowercase());
            let back: ServiceGroup = serde_json::from_str(&json).unwrap();
            assert_eq!(back, group);
        }
    }

    #[test]
    fn deployment_type_serde_roundtrip() {
        for dt in [DeploymentType::Standalone, DeploymentType::Virtual] {
            let json = serde_json::to_string(&dt).unwrap();
            assert_eq!(json, json.to_lowercase());
            let back: DeploymentType = serde_json::from_str(&json).unwrap();
            assert_eq!(back, dt);
        }
    }

    #[test]
    fn validation_severity_serialize_lowercase() {
        let pairs = [
            (ValidationSeverity::Error, "\"error\""),
            (ValidationSeverity::Warning, "\"warning\""),
            (ValidationSeverity::Info, "\"info\""),
        ];
        for (sev, expected) in pairs {
            let json = serde_json::to_string(&sev).unwrap();
            assert_eq!(json, expected, "ValidationSeverity 序列化为 lowercase");
        }
    }

    #[test]
    fn service_definition_serde_roundtrip() {
        let reg = ServiceConfigRegistry::new();
        let svc = reg.get("unified-core").unwrap();
        let json = serde_json::to_string(svc).unwrap();
        let back: ServiceDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, svc.code);
        assert_eq!(back.port, svc.port);
        assert_eq!(back.group, svc.group);
        assert_eq!(back.deployment_type, svc.deployment_type);
    }

    #[test]
    fn validation_issue_serializes_with_severity() {
        let issue = ValidationIssue {
            severity: ValidationSeverity::Error,
            service: "foo".into(),
            message: "bar".into(),
        };
        let json = serde_json::to_string(&issue).unwrap();
        assert!(json.contains("\"severity\":\"error\""));
        assert!(json.contains("\"service\":\"foo\""));
        assert!(json.contains("\"message\":\"bar\""));
    }

    // ---- global_registry 单例 ----

    #[test]
    fn global_registry_returns_same_instance() {
        let a = global_registry();
        let b = global_registry();
        let ra = a as *const ServiceConfigRegistry;
        let rb = b as *const ServiceConfigRegistry;
        assert_eq!(ra, rb, "两次调用 global_registry 应返回同一个地址");
    }

    #[test]
    fn global_registry_has_default_services() {
        let reg = global_registry();
        assert_eq!(reg.get_all().len(), 29);
        assert!(reg.get("unified-core").is_some());
    }

    // ---- Default impl ----

    #[test]
    fn default_impl_equals_new() {
        let a = ServiceConfigRegistry::new();
        let b = ServiceConfigRegistry::default();
        assert_eq!(a.get_all().len(), b.get_all().len());
    }
}
