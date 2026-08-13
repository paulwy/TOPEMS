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
}
