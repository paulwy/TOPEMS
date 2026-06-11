

use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::error::TopemsError;

pub mod enhanced;
pub mod services;
pub use services::{ServiceConfig, ServiceRegistry, get_default_port};

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub app_env: String,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
    pub server: ServerConfig,
    pub redis: RedisConfig,
    pub cache: CacheConfig,
    pub storage: StorageConfig,
    pub mail: MailConfig,
    pub ai: AiConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub host: String,
    pub port: u16,
    pub name: String,
    pub user: String,
    pub password: String,
    pub pool_max_size: u32,
    pub pool_min_size: u32,
    pub connect_timeout: u64,
    pub idle_timeout: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub jwt_refresh_secret: String,
    pub jwt_refresh_expiry_days: u64,
    pub session_secret: String,
    pub session_timeout_minutes: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub cors_origins: Vec<String>,
    pub cors_methods: Vec<String>,
    pub cors_credentials: bool,
    pub rate_limit_enabled: bool,
    pub rate_limit_requests: u32,
    pub rate_limit_window_secs: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RedisConfig {
    pub url: String,
    pub host: String,
    pub port: u16,
    pub password: Option<String>,
    pub db: u8,
    pub pool_max_size: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CacheConfig {
    pub prefix: String,
    pub default_ttl: u64,
    pub memory_cache_size: usize,
    pub eviction_policy: String,
    pub write_through: bool,
    
    pub enable_multi_level: bool,
    pub l1_ttl: u64,
    pub l2_ttl: u64,
    pub enable_cache_warming: bool,
    pub warming_concurrency: usize,
    pub stats_interval: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            prefix: default_cache_prefix(),
            default_ttl: default_cache_default_ttl(),
            memory_cache_size: default_cache_memory_size(),
            eviction_policy: default_cache_eviction_policy(),
            write_through: default_cache_write_through(),
            enable_multi_level: true,
            l1_ttl: 60,
            l2_ttl: 3600,
            enable_cache_warming: true,
            warming_concurrency: 4,
            stats_interval: 60,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct StorageConfig {
    pub upload_dir: String,
    pub upload_max_size: u64,
    pub allowed_file_types: Vec<String>,
    pub storage_provider: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub smtp_from: String,
    pub smtp_from_name: String,
    pub smtp_use_tls: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AiConfig {
    pub ollama_base_url: String,
    pub ollama_model: String,
    pub ollama_timeout: u64,
    pub rag_chunk_size: usize,
    pub rag_chunk_overlap: usize,
    pub rag_max_results: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
    pub file_enabled: bool,
    pub file_path: String,
    pub max_size: u64,
    pub max_files: u32,
}

#[derive(Clone)]
pub struct Config {
    inner: Arc<RwLock<AppConfig>>,
    env: String,
}

impl Config {
    pub async fn load() -> Result<Self, TopemsError> {
        let env = std::env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());
        let config = Self::load_config_for_env(&env).await?;
        
        Ok(Self {
            inner: Arc::new(RwLock::new(config)),
            env,
        })
    }

    async fn load_config_for_env(env: &str) -> Result<AppConfig, TopemsError> {
        match env {
            "production" => envy::from_env::<ProductionEnv>()
                .map(|e| e.into())
                .map_err(|e| TopemsError::Config(format!("Failed to load config: {}", e))),
            "test" => envy::from_env::<TestEnv>()
                .map(|e| e.into())
                .map_err(|e| TopemsError::Config(format!("Failed to load config: {}", e))),
            _ => envy::from_env::<DevEnv>()
                .map(|e| e.into())
                .map_err(|e| TopemsError::Config(format!("Failed to load config: {}", e))),
        }
    }

    pub async fn reload(&self) -> Result<(), TopemsError> {
        let new_config = Self::load_config_for_env(&self.env).await?;
        let mut config = self.inner.write().await;
        *config = new_config;
        Ok(())
    }

    pub async fn get(&self) -> AppConfig {
        self.inner.read().await.clone()
    }

    pub async fn get_database(&self) -> DatabaseConfig {
        self.inner.read().await.database.clone()
    }

    pub async fn get_auth(&self) -> AuthConfig {
        self.inner.read().await.auth.clone()
    }

    pub async fn get_server(&self) -> ServerConfig {
        self.inner.read().await.server.clone()
    }

    pub async fn get_redis(&self) -> RedisConfig {
        self.inner.read().await.redis.clone()
    }

    pub fn env(&self) -> &str {
        &self.env
    }

    pub fn is_production(&self) -> bool {
        self.env == "production"
    }

    pub fn is_development(&self) -> bool {
        self.env == "development"
    }

    pub fn is_test(&self) -> bool {
        self.env == "test"
    }
}

#[derive(Debug, Deserialize)]
struct DevEnv {
    #[serde(default = "default_app_env")]
    app_env: String,
    #[serde(default = "default_database_url")]
    database_url: String,
    #[serde(default = "default_db_host")]
    db_host: String,
    #[serde(default = "default_db_port")]
    db_port: u16,
    #[serde(default = "default_db_name")]
    db_name: String,
    #[serde(default = "default_db_user")]
    db_user: String,
    #[serde(default = "default_db_password")]
    db_password: String,
    #[serde(default = "default_pool_max_size")]
    db_pool_max_size: u32,
    #[serde(default = "default_pool_min_size")]
    db_pool_min_size: u32,
    #[serde(default = "default_connect_timeout")]
    db_connect_timeout: u64,
    #[serde(default = "default_idle_timeout")]
    db_idle_timeout: u64,
    #[serde(default = "default_jwt_secret")]
    jwt_secret: String,
    #[serde(default = "default_jwt_expiry_hours")]
    jwt_expiry_hours: u64,
    #[serde(default = "default_jwt_refresh_secret")]
    jwt_refresh_secret: String,
    #[serde(default = "default_jwt_refresh_expiry_days")]
    jwt_refresh_expiry_days: u64,
    #[serde(default = "default_session_secret")]
    session_secret: String,
    #[serde(default = "default_session_timeout_minutes")]
    session_timeout_minutes: u64,
    #[serde(default = "default_server_host")]
    server_host: String,
    #[serde(default = "default_server_port")]
    server_port: u16,
    #[serde(default = "default_cors_origins")]
    cors_origins: String,
    #[serde(default = "default_cors_methods")]
    cors_methods: String,
    #[serde(default = "default_cors_credentials")]
    cors_credentials: bool,
    #[serde(default = "default_rate_limit_enabled")]
    rate_limit_enabled: bool,
    #[serde(default = "default_rate_limit_requests")]
    rate_limit_requests: u32,
    #[serde(default = "default_rate_limit_window")]
    rate_limit_window_secs: u64,
    #[serde(default = "default_redis_url")]
    redis_url: String,
    #[serde(default = "default_redis_host")]
    redis_host: String,
    #[serde(default = "default_redis_port")]
    redis_port: u16,
    redis_password: Option<String>,
    #[serde(default = "default_redis_db")]
    redis_db: u8,
    #[serde(default = "default_redis_pool_max_size")]
    redis_pool_max_size: u32,
    #[serde(default = "default_cache_prefix")]
    cache_prefix: String,
    #[serde(default = "default_cache_default_ttl")]
    cache_default_ttl: u64,
    #[serde(default = "default_cache_memory_size")]
    cache_memory_size: usize,
    #[serde(default = "default_cache_eviction_policy")]
    cache_eviction_policy: String,
    #[serde(default = "default_cache_write_through")]
    cache_write_through: bool,
    #[serde(default = "default_upload_dir")]
    upload_dir: String,
    #[serde(default = "default_upload_max_size")]
    upload_max_size: u64,
    #[serde(default = "default_allowed_file_types")]
    allowed_file_types: String,
    #[serde(default = "default_storage_provider")]
    storage_provider: String,
    #[serde(default = "default_smtp_host")]
    smtp_host: String,
    #[serde(default = "default_smtp_port")]
    smtp_port: u16,
    #[serde(default = "default_smtp_user")]
    smtp_user: String,
    #[serde(default = "default_smtp_password")]
    smtp_password: String,
    #[serde(default = "default_smtp_from")]
    smtp_from: String,
    #[serde(default = "default_smtp_from_name")]
    smtp_from_name: String,
    #[serde(default = "default_smtp_use_tls")]
    smtp_use_tls: bool,
    #[serde(default = "default_ollama_base_url")]
    ollama_base_url: String,
    #[serde(default = "default_ollama_model")]
    ollama_model: String,
    #[serde(default = "default_ollama_timeout")]
    ollama_timeout: u64,
    #[serde(default = "default_rag_chunk_size")]
    rag_chunk_size: usize,
    #[serde(default = "default_rag_chunk_overlap")]
    rag_chunk_overlap: usize,
    #[serde(default = "default_rag_max_results")]
    rag_max_results: usize,
    #[serde(default = "default_log_level")]
    log_level: String,
    #[serde(default = "default_log_format")]
    log_format: String,
    #[serde(default = "default_log_file_enabled")]
    log_file_enabled: bool,
    #[serde(default = "default_log_file_path")]
    log_file_path: String,
    #[serde(default = "default_log_max_size")]
    log_max_size: u64,
    #[serde(default = "default_log_max_files")]
    log_max_files: u32,
}

#[derive(Debug, Deserialize)]
struct TestEnv {
    #[serde(default = "default_app_env")]
    app_env: String,
    #[serde(default = "default_test_database_url")]
    database_url: String,
    #[serde(default = "default_db_host")]
    db_host: String,
    #[serde(default = "default_db_port")]
    db_port: u16,
    #[serde(default = "default_test_db_name")]
    db_name: String,
    #[serde(default = "default_db_user")]
    db_user: String,
    #[serde(default = "default_test_db_password")]
    db_password: String,
    #[serde(default = "default_test_pool_max_size")]
    db_pool_max_size: u32,
    #[serde(default = "default_test_pool_min_size")]
    db_pool_min_size: u32,
    #[serde(default = "default_test_connect_timeout")]
    db_connect_timeout: u64,
    #[serde(default = "default_test_idle_timeout")]
    db_idle_timeout: u64,
    #[serde(default = "default_test_jwt_secret")]
    jwt_secret: String,
    #[serde(default = "default_test_jwt_expiry_hours")]
    jwt_expiry_hours: u64,
    #[serde(default = "default_test_jwt_refresh_secret")]
    jwt_refresh_secret: String,
    #[serde(default = "default_test_jwt_refresh_expiry_days")]
    jwt_refresh_expiry_days: u64,
    #[serde(default = "default_test_session_secret")]
    session_secret: String,
    #[serde(default = "default_test_session_timeout_minutes")]
    session_timeout_minutes: u64,
    #[serde(default = "default_server_host")]
    server_host: String,
    #[serde(default = "default_test_server_port")]
    server_port: u16,
    #[serde(default = "default_test_cors_origins")]
    cors_origins: String,
    #[serde(default = "default_cors_methods")]
    cors_methods: String,
    #[serde(default = "default_cors_credentials")]
    cors_credentials: bool,
    #[serde(default = "default_test_rate_limit_enabled")]
    rate_limit_enabled: bool,
    #[serde(default = "default_test_rate_limit_requests")]
    rate_limit_requests: u32,
    #[serde(default = "default_rate_limit_window")]
    rate_limit_window_secs: u64,
    #[serde(default = "default_test_redis_url")]
    redis_url: String,
    #[serde(default = "default_redis_host")]
    redis_host: String,
    #[serde(default = "default_redis_port")]
    redis_port: u16,
    redis_password: Option<String>,
    #[serde(default = "default_test_redis_db")]
    redis_db: u8,
    #[serde(default = "default_redis_pool_max_size")]
    redis_pool_max_size: u32,
    #[serde(default = "default_cache_prefix")]
    cache_prefix: String,
    #[serde(default = "default_cache_default_ttl")]
    cache_default_ttl: u64,
    #[serde(default = "default_cache_memory_size")]
    cache_memory_size: usize,
    #[serde(default = "default_cache_eviction_policy")]
    cache_eviction_policy: String,
    #[serde(default = "default_cache_write_through")]
    cache_write_through: bool,
    #[serde(default = "default_test_upload_dir")]
    upload_dir: String,
    #[serde(default = "default_test_upload_max_size")]
    upload_max_size: u64,
    #[serde(default = "default_test_allowed_file_types")]
    allowed_file_types: String,
    #[serde(default = "default_storage_provider")]
    storage_provider: String,
    #[serde(default = "default_smtp_host")]
    smtp_host: String,
    #[serde(default = "default_smtp_port")]
    smtp_port: u16,
    #[serde(default = "default_smtp_user")]
    smtp_user: String,
    #[serde(default = "default_smtp_password")]
    smtp_password: String,
    #[serde(default = "default_smtp_from")]
    smtp_from: String,
    #[serde(default = "default_smtp_from_name")]
    smtp_from_name: String,
    #[serde(default = "default_smtp_use_tls")]
    smtp_use_tls: bool,
    #[serde(default = "default_ollama_base_url")]
    ollama_base_url: String,
    #[serde(default = "default_ollama_model")]
    ollama_model: String,
    #[serde(default = "default_test_ollama_timeout")]
    ollama_timeout: u64,
    #[serde(default = "default_rag_chunk_size")]
    rag_chunk_size: usize,
    #[serde(default = "default_rag_chunk_overlap")]
    rag_chunk_overlap: usize,
    #[serde(default = "default_rag_max_results")]
    rag_max_results: usize,
    #[serde(default = "default_test_log_level")]
    log_level: String,
    #[serde(default = "default_log_format")]
    log_format: String,
    #[serde(default = "default_log_file_enabled")]
    log_file_enabled: bool,
    #[serde(default = "default_log_file_path")]
    log_file_path: String,
    #[serde(default = "default_log_max_size")]
    log_max_size: u64,
    #[serde(default = "default_log_max_files")]
    log_max_files: u32,
}

#[derive(Debug, Deserialize)]
struct ProductionEnv {
    app_env: String,
    database_url: String,
    db_host: String,
    db_port: u16,
    db_name: String,
    db_user: String,
    db_password: String,
    db_pool_max_size: u32,
    db_pool_min_size: u32,
    db_connect_timeout: u64,
    db_idle_timeout: u64,
    jwt_secret: String,
    jwt_expiry_hours: u64,
    jwt_refresh_secret: String,
    jwt_refresh_expiry_days: u64,
    session_secret: String,
    session_timeout_minutes: u64,
    server_host: String,
    server_port: u16,
    cors_origins: String,
    cors_methods: String,
    cors_credentials: bool,
    rate_limit_enabled: bool,
    rate_limit_requests: u32,
    rate_limit_window_secs: u64,
    redis_url: String,
    redis_host: String,
    redis_port: u16,
    redis_password: Option<String>,
    redis_db: u8,
    redis_pool_max_size: u32,
    cache_prefix: String,
    cache_default_ttl: u64,
    cache_memory_size: usize,
    cache_eviction_policy: String,
    cache_write_through: bool,
    upload_dir: String,
    upload_max_size: u64,
    allowed_file_types: String,
    storage_provider: String,
    smtp_host: String,
    smtp_port: u16,
    smtp_user: String,
    smtp_password: String,
    smtp_from: String,
    smtp_from_name: String,
    smtp_use_tls: bool,
    ollama_base_url: String,
    ollama_model: String,
    ollama_timeout: u64,
    rag_chunk_size: usize,
    rag_chunk_overlap: usize,
    rag_max_results: usize,
    log_level: String,
    log_format: String,
    log_file_enabled: bool,
    log_file_path: String,
    log_max_size: u64,
    log_max_files: u32,
}

impl From<DevEnv> for AppConfig {
    fn from(env: DevEnv) -> Self {
        AppConfig {
            app_env: env.app_env,
            database: DatabaseConfig {
                url: env.database_url,
                host: env.db_host,
                port: env.db_port,
                name: env.db_name,
                user: env.db_user,
                password: env.db_password,
                pool_max_size: env.db_pool_max_size,
                pool_min_size: env.db_pool_min_size,
                connect_timeout: env.db_connect_timeout,
                idle_timeout: env.db_idle_timeout,
            },
            auth: AuthConfig {
                jwt_secret: env.jwt_secret,
                jwt_expiry_hours: env.jwt_expiry_hours,
                jwt_refresh_secret: env.jwt_refresh_secret,
                jwt_refresh_expiry_days: env.jwt_refresh_expiry_days,
                session_secret: env.session_secret,
                session_timeout_minutes: env.session_timeout_minutes,
            },
            server: ServerConfig {
                host: env.server_host,
                port: env.server_port,
                cors_origins: env.cors_origins.split(',').map(|s| s.to_string()).collect(),
                cors_methods: env.cors_methods.split(',').map(|s| s.to_string()).collect(),
                cors_credentials: env.cors_credentials,
                rate_limit_enabled: env.rate_limit_enabled,
                rate_limit_requests: env.rate_limit_requests,
                rate_limit_window_secs: env.rate_limit_window_secs,
            },
            redis: RedisConfig {
                url: env.redis_url,
                host: env.redis_host,
                port: env.redis_port,
                password: env.redis_password,
                db: env.redis_db,
                pool_max_size: env.redis_pool_max_size,
            },
            cache: CacheConfig {
                prefix: env.cache_prefix,
                default_ttl: env.cache_default_ttl,
                memory_cache_size: env.cache_memory_size,
                eviction_policy: env.cache_eviction_policy,
                write_through: env.cache_write_through,
                enable_multi_level: true,
                l1_ttl: 60,
                l2_ttl: 3600,
                enable_cache_warming: true,
                warming_concurrency: 4,
                stats_interval: 60,
            },
            storage: StorageConfig {
                upload_dir: env.upload_dir,
                upload_max_size: env.upload_max_size,
                allowed_file_types: env.allowed_file_types.split(',').map(|s| s.to_string()).collect(),
                storage_provider: env.storage_provider,
            },
            mail: MailConfig {
                smtp_host: env.smtp_host,
                smtp_port: env.smtp_port,
                smtp_user: env.smtp_user,
                smtp_password: env.smtp_password,
                smtp_from: env.smtp_from,
                smtp_from_name: env.smtp_from_name,
                smtp_use_tls: env.smtp_use_tls,
            },
            ai: AiConfig {
                ollama_base_url: env.ollama_base_url,
                ollama_model: env.ollama_model,
                ollama_timeout: env.ollama_timeout,
                rag_chunk_size: env.rag_chunk_size,
                rag_chunk_overlap: env.rag_chunk_overlap,
                rag_max_results: env.rag_max_results,
            },
            logging: LoggingConfig {
                level: env.log_level,
                format: env.log_format,
                file_enabled: env.log_file_enabled,
                file_path: env.log_file_path,
                max_size: env.log_max_size,
                max_files: env.log_max_files,
            },
        }
    }
}

impl From<TestEnv> for AppConfig {
    fn from(env: TestEnv) -> Self {
        AppConfig {
            app_env: env.app_env,
            database: DatabaseConfig {
                url: env.database_url,
                host: env.db_host,
                port: env.db_port,
                name: env.db_name,
                user: env.db_user,
                password: env.db_password,
                pool_max_size: env.db_pool_max_size,
                pool_min_size: env.db_pool_min_size,
                connect_timeout: env.db_connect_timeout,
                idle_timeout: env.db_idle_timeout,
            },
            auth: AuthConfig {
                jwt_secret: env.jwt_secret,
                jwt_expiry_hours: env.jwt_expiry_hours,
                jwt_refresh_secret: env.jwt_refresh_secret,
                jwt_refresh_expiry_days: env.jwt_refresh_expiry_days,
                session_secret: env.session_secret,
                session_timeout_minutes: env.session_timeout_minutes,
            },
            server: ServerConfig {
                host: env.server_host,
                port: env.server_port,
                cors_origins: env.cors_origins.split(',').map(|s| s.to_string()).collect(),
                cors_methods: env.cors_methods.split(',').map(|s| s.to_string()).collect(),
                cors_credentials: env.cors_credentials,
                rate_limit_enabled: env.rate_limit_enabled,
                rate_limit_requests: env.rate_limit_requests,
                rate_limit_window_secs: env.rate_limit_window_secs,
            },
            redis: RedisConfig {
                url: env.redis_url,
                host: env.redis_host,
                port: env.redis_port,
                password: env.redis_password,
                db: env.redis_db,
                pool_max_size: env.redis_pool_max_size,
            },
            cache: CacheConfig {
                prefix: env.cache_prefix,
                default_ttl: env.cache_default_ttl,
                memory_cache_size: env.cache_memory_size,
                eviction_policy: env.cache_eviction_policy,
                write_through: env.cache_write_through,
                enable_multi_level: true,
                l1_ttl: 60,
                l2_ttl: 3600,
                enable_cache_warming: true,
                warming_concurrency: 4,
                stats_interval: 60,
            },
            storage: StorageConfig {
                upload_dir: env.upload_dir,
                upload_max_size: env.upload_max_size,
                allowed_file_types: env.allowed_file_types.split(',').map(|s| s.to_string()).collect(),
                storage_provider: env.storage_provider,
            },
            mail: MailConfig {
                smtp_host: env.smtp_host,
                smtp_port: env.smtp_port,
                smtp_user: env.smtp_user,
                smtp_password: env.smtp_password,
                smtp_from: env.smtp_from,
                smtp_from_name: env.smtp_from_name,
                smtp_use_tls: env.smtp_use_tls,
            },
            ai: AiConfig {
                ollama_base_url: env.ollama_base_url,
                ollama_model: env.ollama_model,
                ollama_timeout: env.ollama_timeout,
                rag_chunk_size: env.rag_chunk_size,
                rag_chunk_overlap: env.rag_chunk_overlap,
                rag_max_results: env.rag_max_results,
            },
            logging: LoggingConfig {
                level: env.log_level,
                format: env.log_format,
                file_enabled: env.log_file_enabled,
                file_path: env.log_file_path,
                max_size: env.log_max_size,
                max_files: env.log_max_files,
            },
        }
    }
}

impl From<ProductionEnv> for AppConfig {
    fn from(env: ProductionEnv) -> Self {
        AppConfig {
            app_env: env.app_env,
            database: DatabaseConfig {
                url: env.database_url,
                host: env.db_host,
                port: env.db_port,
                name: env.db_name,
                user: env.db_user,
                password: env.db_password,
                pool_max_size: env.db_pool_max_size,
                pool_min_size: env.db_pool_min_size,
                connect_timeout: env.db_connect_timeout,
                idle_timeout: env.db_idle_timeout,
            },
            auth: AuthConfig {
                jwt_secret: env.jwt_secret,
                jwt_expiry_hours: env.jwt_expiry_hours,
                jwt_refresh_secret: env.jwt_refresh_secret,
                jwt_refresh_expiry_days: env.jwt_refresh_expiry_days,
                session_secret: env.session_secret,
                session_timeout_minutes: env.session_timeout_minutes,
            },
            server: ServerConfig {
                host: env.server_host,
                port: env.server_port,
                cors_origins: env.cors_origins.split(',').map(|s| s.to_string()).collect(),
                cors_methods: env.cors_methods.split(',').map(|s| s.to_string()).collect(),
                cors_credentials: env.cors_credentials,
                rate_limit_enabled: env.rate_limit_enabled,
                rate_limit_requests: env.rate_limit_requests,
                rate_limit_window_secs: env.rate_limit_window_secs,
            },
            redis: RedisConfig {
                url: env.redis_url,
                host: env.redis_host,
                port: env.redis_port,
                password: env.redis_password,
                db: env.redis_db,
                pool_max_size: env.redis_pool_max_size,
            },
            cache: CacheConfig {
                prefix: env.cache_prefix,
                default_ttl: env.cache_default_ttl,
                memory_cache_size: env.cache_memory_size,
                eviction_policy: env.cache_eviction_policy,
                write_through: env.cache_write_through,
                enable_multi_level: true,
                l1_ttl: 60,
                l2_ttl: 3600,
                enable_cache_warming: true,
                warming_concurrency: 4,
                stats_interval: 60,
            },
            storage: StorageConfig {
                upload_dir: env.upload_dir,
                upload_max_size: env.upload_max_size,
                allowed_file_types: env.allowed_file_types.split(',').map(|s| s.to_string()).collect(),
                storage_provider: env.storage_provider,
            },
            mail: MailConfig {
                smtp_host: env.smtp_host,
                smtp_port: env.smtp_port,
                smtp_user: env.smtp_user,
                smtp_password: env.smtp_password,
                smtp_from: env.smtp_from,
                smtp_from_name: env.smtp_from_name,
                smtp_use_tls: env.smtp_use_tls,
            },
            ai: AiConfig {
                ollama_base_url: env.ollama_base_url,
                ollama_model: env.ollama_model,
                ollama_timeout: env.ollama_timeout,
                rag_chunk_size: env.rag_chunk_size,
                rag_chunk_overlap: env.rag_chunk_overlap,
                rag_max_results: env.rag_max_results,
            },
            logging: LoggingConfig {
                level: env.log_level,
                format: env.log_format,
                file_enabled: env.log_file_enabled,
                file_path: env.log_file_path,
                max_size: env.log_max_size,
                max_files: env.log_max_files,
            },
        }
    }
}

fn default_app_env() -> String { "development".to_string() }
fn default_database_url() -> String { "postgres://topems:topems_dev@localhost:5432/topems_dev".to_string() }
fn default_test_database_url() -> String { "postgres://topems_test:topems_test_secret@localhost:5432/topems_test".to_string() }
fn default_db_host() -> String { "localhost".to_string() }
fn default_db_port() -> u16 { 5432 }
fn default_db_name() -> String { "topems_dev".to_string() }
fn default_test_db_name() -> String { "topems_test".to_string() }
fn default_db_user() -> String { "topems".to_string() }
fn default_db_password() -> String { "topems_dev".to_string() }
fn default_test_db_password() -> String { "topems_test_secret".to_string() }
fn default_pool_max_size() -> u32 { 10 }
fn default_test_pool_max_size() -> u32 { 5 }
fn default_pool_min_size() -> u32 { 2 }
fn default_test_pool_min_size() -> u32 { 1 }
fn default_connect_timeout() -> u64 { 10 }
fn default_test_connect_timeout() -> u64 { 5 }
fn default_idle_timeout() -> u64 { 300 }
fn default_test_idle_timeout() -> u64 { 60 }
fn default_jwt_secret() -> String { "dev-jwt-secret-key-not-for-production-use".to_string() }
fn default_test_jwt_secret() -> String { "test-jwt-secret-key-for-testing-only-32chars".to_string() }
fn default_jwt_expiry_hours() -> u64 { 24 }
fn default_test_jwt_expiry_hours() -> u64 { 1 }
fn default_jwt_refresh_secret() -> String { "dev-refresh-secret-key-not-for-production".to_string() }
fn default_test_jwt_refresh_secret() -> String { "test-refresh-secret-for-testing-only".to_string() }
fn default_jwt_refresh_expiry_days() -> u64 { 7 }
fn default_test_jwt_refresh_expiry_days() -> u64 { 1 }
fn default_session_secret() -> String { "dev-session-secret-not-for-production".to_string() }
fn default_test_session_secret() -> String { "test-session-secret-for-testing-only".to_string() }
fn default_session_timeout_minutes() -> u64 { 240 }
fn default_test_session_timeout_minutes() -> u64 { 30 }
fn default_server_host() -> String { "localhost".to_string() }
fn default_server_port() -> u16 { 8000 }
fn default_test_server_port() -> u16 { 8000 }
fn default_cors_origins() -> String { "http://localhost:5173,http://localhost:3000".to_string() }
fn default_test_cors_origins() -> String { "http://localhost:3000".to_string() }
fn default_cors_methods() -> String { "GET,POST,PUT,DELETE,PATCH,OPTIONS".to_string() }
fn default_cors_credentials() -> bool { true }
fn default_rate_limit_enabled() -> bool { false }
fn default_test_rate_limit_enabled() -> bool { false }
fn default_rate_limit_requests() -> u32 { 1000 }
fn default_test_rate_limit_requests() -> u32 { 10000 }
fn default_rate_limit_window() -> u64 { 60 }
fn default_redis_url() -> String { "redis://localhost:6379".to_string() }
fn default_test_redis_url() -> String { "redis://localhost:6379/1".to_string() }
fn default_redis_host() -> String { "localhost".to_string() }
fn default_redis_port() -> u16 { 6379 }
fn default_redis_db() -> u8 { 0 }
fn default_test_redis_db() -> u8 { 1 }
fn default_redis_pool_max_size() -> u32 { 5 }
fn default_upload_dir() -> String { "./uploads".to_string() }
fn default_test_upload_dir() -> String { "./test_uploads".to_string() }
fn default_upload_max_size() -> u64 { 104857600 }
fn default_test_upload_max_size() -> u64 { 10485760 }
fn default_allowed_file_types() -> String { "jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip,rar,txt,md".to_string() }
fn default_test_allowed_file_types() -> String { "jpg,pdf,txt,csv".to_string() }
fn default_storage_provider() -> String { "local".to_string() }
fn default_smtp_host() -> String { "localhost".to_string() }
fn default_smtp_port() -> u16 { 1025 }
fn default_smtp_user() -> String { "".to_string() }
fn default_smtp_password() -> String { "".to_string() }
fn default_smtp_from() -> String { "topems@localhost".to_string() }
fn default_smtp_from_name() -> String { "TOPEMS".to_string() }
fn default_smtp_use_tls() -> bool { false }
fn default_ollama_base_url() -> String { "http://localhost:11434".to_string() }
fn default_ollama_model() -> String { "qwen2.5:7b-instruct".to_string() }
fn default_ollama_timeout() -> u64 { 60 }
fn default_test_ollama_timeout() -> u64 { 30 }
fn default_rag_chunk_size() -> usize { 500 }
fn default_rag_chunk_overlap() -> usize { 50 }
fn default_rag_max_results() -> usize { 3 }
fn default_log_level() -> String { "debug".to_string() }
fn default_test_log_level() -> String { "warn".to_string() }
fn default_log_format() -> String { "pretty".to_string() }
fn default_log_file_enabled() -> bool { false }
fn default_log_file_path() -> String { "./logs/app.log".to_string() }
fn default_log_max_size() -> u64 { 50 }
fn default_log_max_files() -> u32 { 5 }
fn default_cache_prefix() -> String { "topems:".to_string() }
fn default_cache_default_ttl() -> u64 { 3600 }
fn default_cache_memory_size() -> usize { 1000 }
fn default_cache_eviction_policy() -> String { "LRU".to_string() }
fn default_cache_write_through() -> bool { false }