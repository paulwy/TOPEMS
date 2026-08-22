// 配置管理模块 - 统一的配置加载和管理
// =============================================================================

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

/// 数据库配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DatabaseConfig {
    /// 数据库连接 URL
    pub url: String,

    /// 最大连接数
    pub max_connections: u32,

    /// 最小连接数
    pub min_connections: Option<u32>,

    /// 连接超时（秒）
    pub connect_timeout: Option<u64>,

    /// 空闲超时（秒）
    pub idle_timeout: Option<u64>,

    /// 连接最大生命周期（秒）
    pub max_lifetime: Option<u64>,

    /// 连接测试间隔（秒）
    pub test_interval: Option<u64>,

    /// 是否启用连接复用
    pub enable_connection_reuse: Option<bool>,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgres://topems:topems_secret@localhost:5432/topems".to_string()
            }),
            max_connections: 4,
            min_connections: Some(1),
            connect_timeout: Some(30),
            idle_timeout: Some(300),
            max_lifetime: Some(1800),
            test_interval: Some(60),
            enable_connection_reuse: Some(true),
        }
    }
}

impl DatabaseConfig {
    /// 从环境变量加载
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            url: env::var("DATABASE_URL").context("DATABASE_URL 环境变量未设置")?,
            max_connections: env::var("DB_MAX_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(4),
            min_connections: env::var("DB_MIN_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok()),
            connect_timeout: env::var("DB_CONNECT_TIMEOUT")
                .ok()
                .and_then(|s| s.parse().ok()),
            idle_timeout: env::var("DB_IDLE_TIMEOUT")
                .ok()
                .and_then(|s| s.parse().ok()),
            max_lifetime: env::var("DB_MAX_LIFETIME")
                .ok()
                .and_then(|s| s.parse().ok()),
            test_interval: env::var("DB_TEST_INTERVAL")
                .ok()
                .and_then(|s| s.parse().ok()),
            enable_connection_reuse: env::var("DB_ENABLE_CONNECTION_REUSE")
                .ok()
                .and_then(|s| s.parse().ok()),
        })
    }

    /// 验证配置
    pub fn validate(&self) -> Result<()> {
        if self.url.is_empty() {
            return Err(anyhow::anyhow!("数据库 URL 不能为空"));
        }

        if self.max_connections == 0 {
            return Err(anyhow::anyhow!("最大连接数必须大于 0"));
        }

        if let Some(min) = self.min_connections {
            if min > self.max_connections {
                return Err(anyhow::anyhow!("最小连接数不能大于最大连接数"));
            }
        }

        Ok(())
    }
}

/// 服务配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ServiceConfig {
    /// 服务名称
    pub name: String,

    /// 服务端口
    pub port: u16,

    /// 服务版本
    pub version: String,

    /// 服务描述
    pub description: Option<String>,

    /// 是否启用认证
    pub enable_auth: bool,

    /// 是否启用 CORS
    pub enable_cors: bool,

    /// 是否启用日志
    pub enable_logging: bool,

    /// 日志级别
    pub log_level: String,
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            name: "unknown".to_string(),
            port: 8000,
            version: "0.1.0".to_string(),
            description: None,
            enable_auth: true,
            enable_cors: true,
            enable_logging: true,
            log_level: "info".to_string(),
        }
    }
}

impl ServiceConfig {
    /// 从环境变量加载
    pub fn from_env(service_name: &str, default_port: u16) -> Result<Self> {
        Ok(Self {
            name: service_name.to_string(),
            port: env::var("SERVER_PORT")
                .or_else(|_| env::var("PORT"))
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_port),
            version: env::var("SERVICE_VERSION").unwrap_or_else(|_| "0.1.0".to_string()),
            description: env::var("SERVICE_DESCRIPTION").ok(),
            enable_auth: env::var("ENABLE_AUTH")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
            enable_cors: env::var("ENABLE_CORS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
            enable_logging: env::var("ENABLE_LOGGING")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
        })
    }

    /// 验证配置
    pub fn validate(&self) -> Result<()> {
        if self.name.is_empty() {
            return Err(anyhow::anyhow!("服务名称不能为空"));
        }

        if self.port == 0 {
            return Err(anyhow::anyhow!("服务端口不能为 0"));
        }

        Ok(())
    }
}

/// Redis 配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RedisConfig {
    /// Redis URL
    pub url: String,

    /// 最大连接数
    pub max_connections: u32,

    /// 连接超时（秒）
    pub connect_timeout: Option<u64>,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            max_connections: 10,
            connect_timeout: Some(5),
        }
    }
}

impl RedisConfig {
    /// 从环境变量加载
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            url: env::var("REDIS_URL").context("REDIS_URL 环境变量未设置")?,
            max_connections: env::var("REDIS_MAX_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            connect_timeout: env::var("REDIS_CONNECT_TIMEOUT")
                .ok()
                .and_then(|s| s.parse().ok()),
        })
    }
}

/// JWT 配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct JwtConfig {
    /// JWT 密钥
    pub secret: String,

    /// Token 过期时间（秒）
    pub expiration: u64,

    /// 刷新 Token 过期时间（秒）
    pub refresh_expiration: u64,
}

impl Default for JwtConfig {
    fn default() -> Self {
        Self {
            secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "topems_jwt_secret_key_change_in_production".to_string()),
            expiration: 3600,              // 1小时
            refresh_expiration: 86400 * 7, // 7天
        }
    }
}

impl JwtConfig {
    /// 从环境变量加载
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            secret: env::var("JWT_SECRET").context("JWT_SECRET 环境变量未设置")?,
            expiration: env::var("JWT_EXPIRATION")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3600),
            refresh_expiration: env::var("JWT_REFRESH_EXPIRATION")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(86400 * 7),
        })
    }

    /// 验证配置
    pub fn validate(&self) -> Result<()> {
        if self.secret.len() < 32 {
            return Err(anyhow::anyhow!("JWT 密钥长度必须至少 32 个字符"));
        }

        if self.expiration == 0 {
            return Err(anyhow::anyhow!("JWT 过期时间不能为 0"));
        }

        Ok(())
    }
}

/// AI 服务配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AIConfig {
    /// AI API 密钥
    pub api_key: Option<String>,

    /// AI API 基础 URL
    pub base_url: String,

    /// AI 模型名称
    pub model: String,

    /// 是否使用 Ollama
    pub use_ollama: bool,

    /// Embedding 模型
    pub embedding_model: String,

    /// 文档目录
    pub docs_dir: String,

    /// Chunk 大小
    pub chunk_size: usize,

    /// Chunk 重叠
    pub chunk_overlap: usize,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            api_key: env::var("OPENAI_API_KEY").ok(),
            base_url: env::var("OPENAI_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:11434/v1".to_string()),
            model: env::var("OPENAI_MODEL").unwrap_or_else(|_| "qwen2.5:7b-instruct".to_string()),
            use_ollama: env::var("USE_OLLAMA")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
            embedding_model: env::var("EMBEDDING_MODEL")
                .unwrap_or_else(|_| "all-minilm".to_string()),
            docs_dir: env::var("AI_DOCS_DIR").unwrap_or_else(|_| "docs".to_string()),
            chunk_size: 512,
            chunk_overlap: 128,
        }
    }
}

impl AIConfig {
    /// 从环境变量加载
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            api_key: env::var("OPENAI_API_KEY").ok(),
            base_url: env::var("OPENAI_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:11434/v1".to_string()),
            model: env::var("OPENAI_MODEL").unwrap_or_else(|_| "qwen2.5:7b-instruct".to_string()),
            use_ollama: env::var("USE_OLLAMA")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
            embedding_model: env::var("EMBEDDING_MODEL")
                .unwrap_or_else(|_| "all-minilm".to_string()),
            docs_dir: env::var("AI_DOCS_DIR").unwrap_or_else(|_| "docs".to_string()),
            chunk_size: env::var("AI_CHUNK_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(512),
            chunk_overlap: env::var("AI_CHUNK_OVERLAP")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(128),
        })
    }
}

/// 缓存配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CacheConfig {
    /// 缓存类型（memory/redis）
    pub cache_type: String,

    /// 最大缓存大小
    pub max_size: usize,

    /// 默认 TTL（秒）
    pub default_ttl: u64,

    /// 淘汰策略
    pub eviction_policy: String,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            cache_type: "memory".to_string(),
            max_size: 1000,
            default_ttl: 3600,
            eviction_policy: "lru".to_string(),
        }
    }
}

impl CacheConfig {
    /// 从环境变量加载
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            cache_type: env::var("CACHE_TYPE").unwrap_or_else(|_| "memory".to_string()),
            max_size: env::var("CACHE_MAX_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1000),
            default_ttl: env::var("CACHE_DEFAULT_TTL")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3600),
            eviction_policy: env::var("CACHE_EVICTION_POLICY")
                .unwrap_or_else(|_| "lru".to_string()),
        })
    }
}

/// 综合应用配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppConfig {
    /// 服务配置
    pub service: ServiceConfig,

    /// 数据库配置
    pub database: DatabaseConfig,

    /// Redis 配置
    pub redis: Option<RedisConfig>,

    /// JWT 配置
    pub jwt: JwtConfig,

    /// AI 配置
    pub ai: Option<AIConfig>,

    /// 缓存配置
    pub cache: CacheConfig,
}

impl AppConfig {
    /// 从环境变量加载完整配置
    pub fn from_env(service_name: &str, default_port: u16) -> Result<Self> {
        let service = ServiceConfig::from_env(service_name, default_port)?;
        let database = DatabaseConfig::from_env()?;
        let jwt = JwtConfig::from_env()?;
        let cache = CacheConfig::from_env()?;

        // 可选配置
        let redis = if env::var("REDIS_URL").is_ok() {
            Some(RedisConfig::from_env()?)
        } else {
            None
        };

        let ai = if env::var("OPENAI_API_KEY").is_ok() || env::var("USE_OLLAMA").is_ok() {
            Some(AIConfig::from_env()?)
        } else {
            None
        };

        Ok(Self {
            service,
            database,
            redis,
            jwt,
            ai,
            cache,
        })
    }

    /// 验证所有配置
    pub fn validate(&self) -> Result<()> {
        self.service.validate()?;
        self.database.validate()?;
        self.jwt.validate()?;

        if let Some(redis) = &self.redis {
            if redis.url.is_empty() {
                return Err(anyhow::anyhow!("Redis URL 不能为空"));
            }
        }

        Ok(())
    }

    /// 打印配置信息（用于调试）
    pub fn print_summary(&self) {
        tracing::info!("📋 配置摘要:");
        tracing::info!(
            "  服务: {} (端口: {})",
            self.service.name,
            self.service.port
        );
        tracing::info!(
            "  数据库: {}",
            self.database
                .url
                .split('@')
                .next_back()
                .unwrap_or("unknown")
        );
        tracing::info!(
            "  认证: {}",
            if self.service.enable_auth {
                "已启用"
            } else {
                "未启用"
            }
        );
        tracing::info!(
            "  CORS: {}",
            if self.service.enable_cors {
                "已启用"
            } else {
                "未启用"
            }
        );
        tracing::info!(
            "  缓存: {} (类型: {})",
            self.cache.max_size,
            self.cache.cache_type
        );

        if self.redis.is_some() {
            tracing::info!("  Redis: 已配置");
        }

        if self.ai.is_some() {
            tracing::info!("  AI: 已配置");
        }
    }
}

/// 服务注册表 - 管理所有服务的端口映射
#[derive(Debug, Clone)]
pub struct ServiceRegistry {
    services: HashMap<String, u16>,
}

impl ServiceRegistry {
    /// 创建新的服务注册表
    pub fn new() -> Self {
        let mut services = HashMap::new();

        // 核心平台服务 - 统一核心服务 (unified-core)
        services.insert("unified-core".to_string(), 8000);
        services.insert("core".to_string(), 8000);

        // 虚拟服务（由 unified-core 内部模块提供）
        services.insert("iam".to_string(), 8000);
        services.insert("doc".to_string(), 8000);
        services.insert("flow".to_string(), 8000);
        services.insert("file".to_string(), 8000);
        services.insert("mail".to_string(), 8000);
        services.insert("im".to_string(), 8000);
        services.insert("notification".to_string(), 8000);

        // 业务应用服务
        services.insert("pm".to_string(), 8023);
        services.insert("ai".to_string(), 8013);
        services.insert("portal".to_string(), 8063);
        services.insert("integration".to_string(), 8072);
        services.insert("hrm".to_string(), 8020);
        services.insert("erp".to_string(), 8010);
        services.insert("crm".to_string(), 8029);
        services.insert("rs".to_string(), 8053);
        services.insert("manufacturing".to_string(), 8030);
        services.insert("mfg".to_string(), 8030);
        services.insert("quality-assurance".to_string(), 8050);
        services.insert("qa".to_string(), 8050);
        services.insert("scm".to_string(), 8040);
        services.insert("srm".to_string(), 8042);
        services.insert("wms".to_string(), 8041);
        services.insert("gis".to_string(), 8071);
        services.insert("analytics".to_string(), 8060);
        services.insert("mobile".to_string(), 8070);
        services.insert("mes".to_string(), 8030);
        services.insert("pdm".to_string(), 8031);
        services.insert("qms".to_string(), 8050);
        services.insert("lims".to_string(), 8051);
        services.insert("ehs".to_string(), 8052);
        services.insert("bi".to_string(), 8060);
        services.insert("report".to_string(), 8061);
        services.insert("monitor".to_string(), 8095);

        Self { services }
    }

    /// 获取服务端口
    pub fn get_port(&self, service_name: &str) -> Option<u16> {
        self.services.get(service_name).copied()
    }

    /// 获取服务 URL
    pub fn get_url(&self, service_name: &str) -> Option<String> {
        self.get_port(service_name)
            .map(|port| format!("http://localhost:{}", port))
    }

    /// 注册新服务
    pub fn register(&mut self, service_name: String, port: u16) {
        self.services.insert(service_name, port);
    }

    /// 获取所有服务
    pub fn list_services(&self) -> Vec<(String, u16)> {
        self.services.iter().map(|(k, v)| (k.clone(), *v)).collect()
    }
}

impl Default for ServiceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// 获取服务的默认端口
pub fn get_default_port(service_name: &str) -> u16 {
    ServiceRegistry::new()
        .get_port(service_name)
        .unwrap_or(8080)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    fn test_database_config_default() {
        let config = DatabaseConfig::default();
        assert!(!config.url.is_empty());
        assert_eq!(config.max_connections, 4);
        assert_eq!(config.min_connections, Some(1));
        assert_eq!(config.idle_timeout, Some(300));
    }

    #[test]
    fn test_service_config_default() {
        let config = ServiceConfig::default();
        assert_eq!(config.port, 8000);
        assert!(config.enable_auth);
    }

    #[test]
    fn test_service_registry() {
        let registry = ServiceRegistry::new();
        assert_eq!(registry.get_port("core"), Some(8000));
        assert_eq!(registry.get_port("hrm"), Some(8020));
        assert_eq!(registry.get_port("unknown"), None);
    }

    #[test]
    fn test_get_default_port() {
        assert_eq!(get_default_port("core"), 8000);
        assert_eq!(get_default_port("hrm"), 8020);
        assert_eq!(get_default_port("unknown"), 8080);
    }

    // ===== 以下为补充测试 =====

    fn clear_enhanced_env_vars() {
        for k in [
            "DATABASE_URL",
            "DB_MAX_CONNECTIONS",
            "DB_MIN_CONNECTIONS",
            "DB_CONNECT_TIMEOUT",
            "DB_IDLE_TIMEOUT",
            "DB_MAX_LIFETIME",
            "DB_TEST_INTERVAL",
            "DB_ENABLE_CONNECTION_REUSE",
            "SERVER_PORT",
            "PORT",
            "SERVICE_VERSION",
            "SERVICE_DESCRIPTION",
            "ENABLE_AUTH",
            "ENABLE_CORS",
            "ENABLE_LOGGING",
            "LOG_LEVEL",
            "REDIS_URL",
            "REDIS_MAX_CONNECTIONS",
            "REDIS_CONNECT_TIMEOUT",
            "JWT_SECRET",
            "JWT_EXPIRATION",
            "JWT_REFRESH_EXPIRATION",
            "OPENAI_API_KEY",
            "OPENAI_BASE_URL",
            "OPENAI_MODEL",
            "USE_OLLAMA",
            "EMBEDDING_MODEL",
            "AI_DOCS_DIR",
            "AI_CHUNK_SIZE",
            "AI_CHUNK_OVERLAP",
            "CACHE_TYPE",
            "CACHE_MAX_SIZE",
            "CACHE_DEFAULT_TTL",
            "CACHE_EVICTION_POLICY",
        ] {
            std::env::remove_var(k);
        }
    }

    // ---------- DatabaseConfig ----------
    #[test]
    fn database_config_default_values() {
        let c = DatabaseConfig::default();
        assert!(!c.url.is_empty());
        assert_eq!(c.max_connections, 4);
        assert_eq!(c.min_connections, Some(1));
        assert_eq!(c.connect_timeout, Some(30));
        assert_eq!(c.idle_timeout, Some(300));
        assert_eq!(c.max_lifetime, Some(1800));
        assert_eq!(c.test_interval, Some(60));
        assert_eq!(c.enable_connection_reuse, Some(true));
    }

    #[test]
    fn database_config_clone_preserves_fields() {
        let c = DatabaseConfig {
            url: "postgres://u:p@h:5432/db".to_string(),
            max_connections: 8,
            min_connections: Some(2),
            connect_timeout: Some(15),
            idle_timeout: Some(120),
            max_lifetime: Some(900),
            test_interval: Some(30),
            enable_connection_reuse: Some(false),
        };
        let c2 = c.clone();
        assert_eq!(c2.url, c.url);
        assert_eq!(c2.max_connections, c.max_connections);
        assert_eq!(c2.min_connections, c.min_connections);
        assert_eq!(c2.connect_timeout, c.connect_timeout);
        assert_eq!(c2.enable_connection_reuse, c.enable_connection_reuse);
    }

    #[test]
    fn database_config_serde_json_roundtrip() {
        let c = DatabaseConfig {
            url: "postgres://u:p@h:5432/db".to_string(),
            max_connections: 8,
            min_connections: Some(2),
            connect_timeout: Some(15),
            idle_timeout: Some(120),
            max_lifetime: Some(900),
            test_interval: Some(30),
            enable_connection_reuse: Some(false),
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: DatabaseConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.url, c.url);
        assert_eq!(back.max_connections, c.max_connections);
        assert_eq!(back.min_connections, c.min_connections);
        assert_eq!(back.connect_timeout, c.connect_timeout);
        assert_eq!(back.idle_timeout, c.idle_timeout);
        assert_eq!(back.max_lifetime, c.max_lifetime);
        assert_eq!(back.test_interval, c.test_interval);
        assert_eq!(back.enable_connection_reuse, c.enable_connection_reuse);
    }

    #[test]
    fn database_config_serde_yaml_roundtrip() {
        let c = DatabaseConfig {
            url: "postgres://u:p@h:5432/db".to_string(),
            max_connections: 16,
            min_connections: None,
            connect_timeout: None,
            idle_timeout: Some(60),
            max_lifetime: None,
            test_interval: None,
            enable_connection_reuse: None,
        };
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: DatabaseConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.url, c.url);
        assert_eq!(back.max_connections, c.max_connections);
        assert_eq!(back.min_connections, None);
        assert_eq!(back.connect_timeout, None);
        assert_eq!(back.idle_timeout, Some(60));
        assert_eq!(back.enable_connection_reuse, None);
    }

    #[test]
    fn database_config_validate_empty_url_errors() {
        let c = DatabaseConfig {
            url: "".to_string(),
            max_connections: 4,
            ..Default::default()
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn database_config_validate_zero_max_connections_errors() {
        let c = DatabaseConfig {
            url: "x".to_string(),
            max_connections: 0,
            ..Default::default()
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn database_config_validate_min_gt_max_errors() {
        let c = DatabaseConfig {
            url: "x".to_string(),
            max_connections: 2,
            min_connections: Some(5),
            ..Default::default()
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn database_config_validate_valid_ok() {
        let c = DatabaseConfig::default();
        assert!(c.validate().is_ok());
    }

    #[test]
    fn database_config_from_env_missing_url_errors() {
        clear_enhanced_env_vars();
        assert!(DatabaseConfig::from_env().is_err());
    }

    #[test]
    #[serial]
    fn database_config_from_env_with_url_and_overrides() {
        clear_enhanced_env_vars();
        std::env::set_var("DATABASE_URL", "postgres://custom/db");
        std::env::set_var("DB_MAX_CONNECTIONS", "20");
        std::env::set_var("DB_MIN_CONNECTIONS", "5");
        std::env::set_var("DB_CONNECT_TIMEOUT", "7");
        let c = DatabaseConfig::from_env().expect("ok");
        assert_eq!(c.url, "postgres://custom/db");
        assert_eq!(c.max_connections, 20);
        assert_eq!(c.min_connections, Some(5));
        assert_eq!(c.connect_timeout, Some(7));
        clear_enhanced_env_vars();
    }

    // ---------- ServiceConfig ----------
    #[test]
    fn service_config_default_values() {
        let c = ServiceConfig::default();
        assert_eq!(c.name, "unknown");
        assert_eq!(c.port, 8000);
        assert_eq!(c.version, "0.1.0");
        assert!(c.description.is_none());
        assert!(c.enable_auth);
        assert!(c.enable_cors);
        assert!(c.enable_logging);
        assert_eq!(c.log_level, "info");
    }

    #[test]
    fn service_config_clone_preserves_fields() {
        let c = ServiceConfig {
            name: "svc".to_string(),
            port: 9000,
            version: "2.0.0".to_string(),
            description: Some("desc".to_string()),
            enable_auth: false,
            enable_cors: false,
            enable_logging: false,
            log_level: "debug".to_string(),
        };
        let c2 = c.clone();
        assert_eq!(c2.name, c.name);
        assert_eq!(c2.port, c.port);
        assert_eq!(c2.version, c.version);
        assert_eq!(c2.description, c.description);
        assert_eq!(c2.enable_auth, c.enable_auth);
        assert_eq!(c2.log_level, c.log_level);
    }

    #[test]
    fn service_config_serde_json_roundtrip() {
        let c = ServiceConfig {
            name: "svc".to_string(),
            port: 9000,
            version: "2.0.0".to_string(),
            description: Some("desc".to_string()),
            enable_auth: false,
            enable_cors: false,
            enable_logging: false,
            log_level: "debug".to_string(),
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: ServiceConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.name, c.name);
        assert_eq!(back.port, c.port);
        assert_eq!(back.version, c.version);
        assert_eq!(back.description, c.description);
        assert_eq!(back.enable_auth, c.enable_auth);
        assert_eq!(back.log_level, c.log_level);
    }

    #[test]
    fn service_config_serde_yaml_roundtrip() {
        let c = ServiceConfig::default();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: ServiceConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.name, c.name);
        assert_eq!(back.port, c.port);
        assert_eq!(back.log_level, c.log_level);
    }

    #[test]
    fn service_config_validate_empty_name_errors() {
        let c = ServiceConfig {
            name: "".to_string(),
            ..Default::default()
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn service_config_validate_zero_port_errors() {
        let c = ServiceConfig {
            port: 0,
            ..Default::default()
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn service_config_validate_valid_ok() {
        let c = ServiceConfig::default();
        assert!(c.validate().is_ok());
    }

    #[test]
    fn service_config_from_env_defaults() {
        clear_enhanced_env_vars();
        let c = ServiceConfig::from_env("my-svc", 8800).expect("ok");
        assert_eq!(c.name, "my-svc");
        assert_eq!(c.port, 8800); // 无 SERVER_PORT/PORT → 使用默认端口
        assert_eq!(c.version, "0.1.0");
        assert!(c.enable_auth);
        assert_eq!(c.log_level, "info");
        clear_enhanced_env_vars();
    }

    #[test]
    #[serial]
    fn service_config_from_env_server_port_overrides() {
        clear_enhanced_env_vars();
        std::env::set_var("SERVER_PORT", "7777");
        std::env::set_var("SERVICE_VERSION", "9.9.9");
        std::env::set_var("LOG_LEVEL", "trace");
        let c = ServiceConfig::from_env("svc", 8800).expect("ok");
        assert_eq!(c.port, 7777);
        assert_eq!(c.version, "9.9.9");
        assert_eq!(c.log_level, "trace");
        clear_enhanced_env_vars();
    }

    #[test]
    #[serial]
    fn service_config_from_env_port_var_fallback() {
        clear_enhanced_env_vars();
        std::env::set_var("PORT", "6666");
        let c = ServiceConfig::from_env("svc", 8800).expect("ok");
        assert_eq!(c.port, 6666);
        clear_enhanced_env_vars();
    }

    // ---------- RedisConfig ----------
    #[test]
    fn redis_config_default_values() {
        let c = RedisConfig::default();
        assert_eq!(c.url, "redis://localhost:6379");
        assert_eq!(c.max_connections, 10);
        assert_eq!(c.connect_timeout, Some(5));
    }

    #[test]
    fn redis_config_serde_json_roundtrip() {
        let c = RedisConfig {
            url: "redis://r:6379".to_string(),
            max_connections: 20,
            connect_timeout: Some(10),
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: RedisConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.url, c.url);
        assert_eq!(back.max_connections, c.max_connections);
        assert_eq!(back.connect_timeout, c.connect_timeout);
    }

    #[test]
    fn redis_config_from_env_missing_url_errors() {
        clear_enhanced_env_vars();
        assert!(RedisConfig::from_env().is_err());
    }

    #[test]
    #[serial]
    fn redis_config_from_env_with_url() {
        clear_enhanced_env_vars();
        std::env::set_var("REDIS_URL", "redis://custom:6380");
        std::env::set_var("REDIS_MAX_CONNECTIONS", "42");
        std::env::set_var("REDIS_CONNECT_TIMEOUT", "9");
        let c = RedisConfig::from_env().expect("ok");
        assert_eq!(c.url, "redis://custom:6380");
        assert_eq!(c.max_connections, 42);
        assert_eq!(c.connect_timeout, Some(9));
        clear_enhanced_env_vars();
    }

    // ---------- JwtConfig ----------
    #[test]
    fn jwt_config_default_values() {
        let c = JwtConfig::default();
        assert!(!c.secret.is_empty());
        assert_eq!(c.expiration, 3600);
        assert_eq!(c.refresh_expiration, 86400 * 7);
    }

    #[test]
    fn jwt_config_serde_json_roundtrip() {
        let c = JwtConfig {
            secret: "a".repeat(40),
            expiration: 100,
            refresh_expiration: 200,
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: JwtConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.secret, c.secret);
        assert_eq!(back.expiration, c.expiration);
        assert_eq!(back.refresh_expiration, c.refresh_expiration);
    }

    #[test]
    fn jwt_config_validate_short_secret_errors() {
        let c = JwtConfig {
            secret: "short".to_string(),
            expiration: 3600,
            refresh_expiration: 86400,
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn jwt_config_validate_zero_expiration_errors() {
        let c = JwtConfig {
            secret: "a".repeat(40),
            expiration: 0,
            refresh_expiration: 86400,
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn jwt_config_validate_valid_ok() {
        let c = JwtConfig {
            secret: "a".repeat(40),
            expiration: 3600,
            refresh_expiration: 86400,
        };
        assert!(c.validate().is_ok());
    }

    #[test]
    fn jwt_config_from_env_missing_secret_errors() {
        clear_enhanced_env_vars();
        assert!(JwtConfig::from_env().is_err());
    }

    #[test]
    #[serial]
    fn jwt_config_from_env_with_secret() {
        clear_enhanced_env_vars();
        std::env::set_var("JWT_SECRET", "my-super-secret-key-1234567890");
        std::env::set_var("JWT_EXPIRATION", "7200");
        std::env::set_var("JWT_REFRESH_EXPIRATION", "100000");
        let c = JwtConfig::from_env().expect("ok");
        assert_eq!(c.secret, "my-super-secret-key-1234567890");
        assert_eq!(c.expiration, 7200);
        assert_eq!(c.refresh_expiration, 100000);
        clear_enhanced_env_vars();
    }

    // ---------- AIConfig ----------
    #[test]
    fn ai_config_default_values() {
        let c = AIConfig::default();
        assert!(c.use_ollama);
        assert_eq!(c.chunk_size, 512);
        assert_eq!(c.chunk_overlap, 128);
        assert_eq!(c.base_url, "http://localhost:11434/v1");
        assert_eq!(c.model, "qwen2.5:7b-instruct");
        assert_eq!(c.embedding_model, "all-minilm");
        assert_eq!(c.docs_dir, "docs");
    }

    #[test]
    fn ai_config_serde_json_roundtrip() {
        let c = AIConfig {
            api_key: Some("k".to_string()),
            base_url: "http://x/v1".to_string(),
            model: "m".to_string(),
            use_ollama: false,
            embedding_model: "e".to_string(),
            docs_dir: "d".to_string(),
            chunk_size: 100,
            chunk_overlap: 20,
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: AIConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.api_key, c.api_key);
        assert_eq!(back.base_url, c.base_url);
        assert_eq!(back.model, c.model);
        assert_eq!(back.use_ollama, c.use_ollama);
        assert_eq!(back.chunk_size, c.chunk_size);
        assert_eq!(back.chunk_overlap, c.chunk_overlap);
    }

    #[test]
    fn ai_config_from_env_defaults() {
        clear_enhanced_env_vars();
        let c = AIConfig::from_env().expect("ok");
        assert!(c.use_ollama);
        assert_eq!(c.chunk_size, 512);
        assert_eq!(c.chunk_overlap, 128);
        assert_eq!(c.model, "qwen2.5:7b-instruct");
        clear_enhanced_env_vars();
    }

    // ---------- CacheConfig ----------
    #[test]
    fn cache_config_default_values() {
        let c = CacheConfig::default();
        assert_eq!(c.cache_type, "memory");
        assert_eq!(c.max_size, 1000);
        assert_eq!(c.default_ttl, 3600);
        assert_eq!(c.eviction_policy, "lru");
    }

    #[test]
    fn cache_config_serde_json_roundtrip() {
        let c = CacheConfig {
            cache_type: "redis".to_string(),
            max_size: 5000,
            default_ttl: 60,
            eviction_policy: "fifo".to_string(),
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: CacheConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.cache_type, c.cache_type);
        assert_eq!(back.max_size, c.max_size);
        assert_eq!(back.default_ttl, c.default_ttl);
        assert_eq!(back.eviction_policy, c.eviction_policy);
    }

    #[test]
    fn cache_config_from_env_defaults() {
        clear_enhanced_env_vars();
        let c = CacheConfig::from_env().expect("ok");
        assert_eq!(c.cache_type, "memory");
        assert_eq!(c.max_size, 1000);
        assert_eq!(c.default_ttl, 3600);
        assert_eq!(c.eviction_policy, "lru");
        clear_enhanced_env_vars();
    }

    #[test]
    #[serial]
    fn cache_config_from_env_with_overrides() {
        clear_enhanced_env_vars();
        std::env::set_var("CACHE_TYPE", "redis");
        std::env::set_var("CACHE_MAX_SIZE", "2000");
        std::env::set_var("CACHE_DEFAULT_TTL", "120");
        std::env::set_var("CACHE_EVICTION_POLICY", "ttl");
        let c = CacheConfig::from_env().expect("ok");
        assert_eq!(c.cache_type, "redis");
        assert_eq!(c.max_size, 2000);
        assert_eq!(c.default_ttl, 120);
        assert_eq!(c.eviction_policy, "ttl");
        clear_enhanced_env_vars();
    }

    // ---------- AppConfig ----------
    #[test]
    fn app_config_serde_json_roundtrip_minimal() {
        // redis 与 ai 为 None 的最小 AppConfig
        let c = AppConfig {
            service: ServiceConfig::default(),
            database: DatabaseConfig::default(),
            redis: None,
            jwt: JwtConfig::default(),
            ai: None,
            cache: CacheConfig::default(),
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: AppConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.service.name, c.service.name);
        assert_eq!(back.database.max_connections, c.database.max_connections);
        assert!(back.redis.is_none());
        assert!(back.ai.is_none());
        assert_eq!(back.cache.cache_type, c.cache.cache_type);
    }

    #[test]
    fn app_config_validate_calls_sub_validates() {
        // database url 为空 → validate 报错
        let c = AppConfig {
            service: ServiceConfig::default(),
            database: DatabaseConfig {
                url: "".to_string(),
                ..Default::default()
            },
            redis: None,
            jwt: JwtConfig::default(),
            ai: None,
            cache: CacheConfig::default(),
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn app_config_validate_redis_empty_url_errors() {
        let c = AppConfig {
            service: ServiceConfig::default(),
            database: DatabaseConfig::default(),
            redis: Some(RedisConfig {
                url: "".to_string(),
                max_connections: 1,
                connect_timeout: None,
            }),
            jwt: JwtConfig {
                secret: "a".repeat(40),
                expiration: 3600,
                refresh_expiration: 86400,
            },
            ai: None,
            cache: CacheConfig::default(),
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn app_config_validate_valid_ok() {
        let c = AppConfig {
            service: ServiceConfig::default(),
            database: DatabaseConfig::default(),
            redis: Some(RedisConfig {
                url: "redis://localhost:6379".to_string(),
                max_connections: 1,
                connect_timeout: None,
            }),
            jwt: JwtConfig {
                secret: "a".repeat(40),
                expiration: 3600,
                refresh_expiration: 86400,
            },
            ai: None,
            cache: CacheConfig::default(),
        };
        assert!(c.validate().is_ok());
    }

    // ---------- ServiceRegistry ----------
    #[test]
    fn service_registry_default_eq_new() {
        let a = ServiceRegistry::new();
        let b = ServiceRegistry::default();
        assert_eq!(a.get_port("core"), b.get_port("core"));
        assert_eq!(a.list_services().len(), b.list_services().len());
    }

    #[test]
    fn service_registry_get_url_format() {
        let r = ServiceRegistry::new();
        assert_eq!(r.get_url("core"), Some("http://localhost:8000".to_string()));
        assert_eq!(r.get_url("hrm"), Some("http://localhost:8020".to_string()));
        assert_eq!(r.get_url("unknown-xxx"), None);
    }

    #[test]
    fn service_registry_register_adds_and_overrides() {
        let mut r = ServiceRegistry::new();
        let before = r.list_services().len();
        r.register("brand-new".to_string(), 9999);
        assert_eq!(r.get_port("brand-new"), Some(9999));
        assert_eq!(r.list_services().len(), before + 1);
        // 覆盖已有
        r.register("core".to_string(), 1234);
        assert_eq!(r.get_port("core"), Some(1234));
    }

    #[test]
    fn service_registry_list_services_contains_core() {
        let r = ServiceRegistry::new();
        let list = r.list_services();
        assert!(list.iter().any(|(k, _)| k == "core"));
        assert!(list.iter().any(|(k, _)| k == "hrm"));
    }

    #[test]
    fn service_registry_clone_preserves_entries() {
        let r = ServiceRegistry::new();
        let r2 = r.clone();
        assert_eq!(r.get_port("core"), r2.get_port("core"));
        assert_eq!(r.get_port("mes"), r2.get_port("mes"));
    }

    #[test]
    fn get_default_port_function_known_and_unknown() {
        assert_eq!(get_default_port("core"), 8000);
        assert_eq!(get_default_port("hrm"), 8020);
        assert_eq!(get_default_port("mes"), 8030);
        assert_eq!(get_default_port("unknown-xyz"), 8080);
    }

    // ---------- AppConfig validate 补充 ----------

    #[test]
    fn app_config_validate_service_empty_name_errors() {
        let c = AppConfig {
            service: ServiceConfig {
                name: "".to_string(),
                port: 8000,
                ..Default::default()
            },
            database: DatabaseConfig::default(),
            redis: None,
            jwt: JwtConfig::default(),
            ai: None,
            cache: CacheConfig::default(),
        };
        assert!(c.validate().is_err());
    }
}
