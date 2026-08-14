// V21.0 共享库逻辑分层架构
// =============================================================================
//
// 设计目标：在不破坏现有 import 路径的前提下，通过逻辑分层文档化
// 明确各模块的职责边界和依赖方向，为后续物理拆分做准备。
//
// 分层原则：
// - core（核心原语）：无任何外部框架依赖，最稳定
// - infra（基础设施）：封装第三方中间件
// - domain（领域层）：业务领域概念
// - web（Web框架层）：HTTP 相关
//
// 依赖方向：web → domain → infra → core
// 禁止反向依赖，禁止同层循环依赖
//
// 各模块归属：
// - core: error, validation, response, config, security, tenant
// - infra: database, cache, redis, event, saga, storage, backup, cluster,
//          messaging, migration, query_optimizer, repository, vector_store,
//          embedding, ollama_client, ai_client
// - domain: auth, permission, permission_center, audit, rls, crud, hrm,
//           service_config, service_discovery, service_port, service_client
// - web: api, api_version, cors, health, logging, middleware, metrics,
//        monitoring, notification, performance, rate_limit, service_bootstrap,
//        telemetry, compression

/// V21.0: 模块层级定义
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Layer {
    /// 核心原语层：无外部依赖，最稳定
    Core,
    /// 基础设施层：封装第三方中间件
    Infra,
    /// 领域层：业务领域概念
    Domain,
    /// Web 框架层：HTTP 相关
    Web,
}

impl Layer {
    pub fn as_str(&self) -> &'static str {
        match self {
            Layer::Core => "core",
            Layer::Infra => "infra",
            Layer::Domain => "domain",
            Layer::Web => "web",
        }
    }
}

/// V21.0: 模块归属层级映射
///
/// 记录每个共享库模块所属的层级，用于：
/// 1. 依赖方向检查（上层可依赖下层，禁止反向）
/// 2. 编译加速（按层级并行编译）
/// 3. 后续物理拆分参考
pub fn module_layer(module: &str) -> Option<Layer> {
    let layer = match module {
        // Core 层 - 核心原语
        "error" | "validation" | "response" | "config" | "security" | "tenant" => Layer::Core,

        // Infra 层 - 基础设施
        "database" | "cache" | "redis" | "event" | "saga" | "storage" | "backup" | "cluster"
        | "messaging" | "migration" | "query_optimizer" | "repository" | "vector_store"
        | "embedding" | "ollama_client" | "ai_client" => Layer::Infra,

        // Domain 层 - 领域概念
        "auth" | "permission" | "permission_center" | "audit" | "rls" | "crud" | "hrm"
        | "service_config" | "service_discovery" | "service_port" | "service_client" => {
            Layer::Domain
        }

        // Web 层 - HTTP 框架
        "api" | "api_version" | "cors" | "health" | "logging" | "middleware" | "metrics"
        | "monitoring" | "notification" | "performance" | "rate_limit" | "service_bootstrap"
        | "telemetry" | "compression" => Layer::Web,

        _ => return None,
    };
    Some(layer)
}

/// V21.0: 获取指定层级的所有模块
pub fn modules_by_layer(layer: Layer) -> Vec<&'static str> {
    match layer {
        Layer::Core => vec![
            "error",
            "validation",
            "response",
            "config",
            "security",
            "tenant",
        ],
        Layer::Infra => vec![
            "database",
            "cache",
            "redis",
            "event",
            "saga",
            "storage",
            "backup",
            "cluster",
            "messaging",
            "migration",
            "query_optimizer",
            "repository",
            "vector_store",
            "embedding",
            "ollama_client",
            "ai_client",
        ],
        Layer::Domain => vec![
            "auth",
            "permission",
            "permission_center",
            "audit",
            "rls",
            "crud",
            "hrm",
            "service_config",
            "service_discovery",
            "service_port",
            "service_client",
        ],
        Layer::Web => vec![
            "api",
            "api_version",
            "cors",
            "health",
            "logging",
            "middleware",
            "metrics",
            "monitoring",
            "notification",
            "performance",
            "rate_limit",
            "service_bootstrap",
            "telemetry",
            "compression",
        ],
    }
}

/// V21.0: 依赖方向检查
///
/// 检查 from 模块是否可以依赖 to 模块。
/// 规则：上层可依赖下层，同层之间禁止相互依赖。
pub fn can_depend(from: &str, to: &str) -> bool {
    match (module_layer(from), module_layer(to)) {
        (Some(from_layer), Some(to_layer)) => {
            // 同层禁止依赖（避免循环）
            if from_layer == to_layer {
                return false;
            }
            // 上层可依赖下层
            from_layer > to_layer
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_layer() {
        assert_eq!(module_layer("error"), Some(Layer::Core));
        assert_eq!(module_layer("cache"), Some(Layer::Infra));
        assert_eq!(module_layer("permission"), Some(Layer::Domain));
        assert_eq!(module_layer("middleware"), Some(Layer::Web));
        assert_eq!(module_layer("unknown"), None);
    }

    #[test]
    fn test_can_depend() {
        // Web 层可依赖 Domain/Infra/Core
        assert!(can_depend("middleware", "permission"));
        assert!(can_depend("middleware", "cache"));
        assert!(can_depend("middleware", "error"));
        // 同层禁止依赖
        assert!(!can_depend("middleware", "api"));
        // 下层不能依赖上层
        assert!(!can_depend("error", "cache"));
        assert!(!can_depend("cache", "permission"));
    }

    #[test]
    fn test_modules_by_layer() {
        let core_modules = modules_by_layer(Layer::Core);
        assert!(core_modules.contains(&"error"));
        assert!(core_modules.contains(&"tenant"));

        let infra_modules = modules_by_layer(Layer::Infra);
        assert!(infra_modules.contains(&"cache"));
        assert!(infra_modules.contains(&"saga"));
    }

    // ===== 新增：Layer 枚举 / 层级映射 / 依赖方向测试 =====

    #[test]
    fn test_layer_as_str_all_variants() {
        assert_eq!(Layer::Core.as_str(), "core");
        assert_eq!(Layer::Infra.as_str(), "infra");
        assert_eq!(Layer::Domain.as_str(), "domain");
        assert_eq!(Layer::Web.as_str(), "web");
    }

    #[test]
    fn test_layer_ordering() {
        assert!(Layer::Core < Layer::Infra);
        assert!(Layer::Infra < Layer::Domain);
        assert!(Layer::Domain < Layer::Web);
        assert!(Layer::Core < Layer::Web);
    }

    #[test]
    fn test_layer_clone_and_copy() {
        let l = Layer::Web;
        let cloned = l.clone();
        let copied = l;
        assert_eq!(l, cloned);
        assert_eq!(l, copied);
    }

    #[test]
    fn test_layer_equality() {
        assert_eq!(Layer::Core, Layer::Core);
        assert_ne!(Layer::Core, Layer::Infra);
        assert_ne!(Layer::Infra, Layer::Domain);
        assert_ne!(Layer::Domain, Layer::Web);
    }

    #[test]
    fn test_module_layer_all_core_modules() {
        for m in &["error", "validation", "response", "config", "security", "tenant"] {
            assert_eq!(module_layer(m), Some(Layer::Core));
        }
    }

    #[test]
    fn test_module_layer_all_infra_modules() {
        for m in &[
            "database",
            "cache",
            "redis",
            "event",
            "saga",
            "storage",
            "backup",
            "cluster",
            "messaging",
            "migration",
            "query_optimizer",
            "repository",
            "vector_store",
            "embedding",
            "ollama_client",
            "ai_client",
        ] {
            assert_eq!(module_layer(m), Some(Layer::Infra));
        }
    }

    #[test]
    fn test_module_layer_all_domain_modules() {
        for m in &[
            "auth",
            "permission",
            "permission_center",
            "audit",
            "rls",
            "crud",
            "hrm",
            "service_config",
            "service_discovery",
            "service_port",
            "service_client",
        ] {
            assert_eq!(module_layer(m), Some(Layer::Domain));
        }
    }

    #[test]
    fn test_module_layer_all_web_modules() {
        for m in &[
            "api",
            "api_version",
            "cors",
            "health",
            "logging",
            "middleware",
            "metrics",
            "monitoring",
            "notification",
            "performance",
            "rate_limit",
            "service_bootstrap",
            "telemetry",
            "compression",
        ] {
            assert_eq!(module_layer(m), Some(Layer::Web));
        }
    }

    #[test]
    fn test_can_depend_same_layer_returns_false() {
        assert!(!can_depend("error", "config"));
        assert!(!can_depend("cache", "redis"));
        assert!(!can_depend("auth", "permission"));
        assert!(!can_depend("api", "cors"));
    }

    #[test]
    fn test_can_depend_unknown_module_returns_false() {
        assert!(!can_depend("unknown", "error"));
        assert!(!can_depend("error", "unknown"));
        assert!(!can_depend("unknown1", "unknown2"));
    }

    #[test]
    fn test_can_depend_upper_to_lower_returns_true() {
        assert!(can_depend("middleware", "error"));
        assert!(can_depend("middleware", "cache"));
        assert!(can_depend("middleware", "permission"));
        assert!(can_depend("auth", "cache"));
        assert!(can_depend("cache", "error"));
    }

    #[test]
    fn test_modules_by_layer_completeness() {
        assert_eq!(modules_by_layer(Layer::Core).len(), 6);
        assert_eq!(modules_by_layer(Layer::Infra).len(), 16);
        assert_eq!(modules_by_layer(Layer::Domain).len(), 11);
        assert_eq!(modules_by_layer(Layer::Web).len(), 14);
    }

    #[test]
    fn test_modules_by_layer_web_contains_all() {
        let web_mods = modules_by_layer(Layer::Web);
        assert!(web_mods.contains(&"compression"));
        assert!(web_mods.contains(&"telemetry"));
        assert!(web_mods.contains(&"service_bootstrap"));
    }
}
