use crate::error::TopemsError;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

pub mod deployment;
pub mod enhanced;
pub mod services;
pub use services::{get_default_port, ServiceConfig, ServiceRegistry};

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub jwt_refresh_secret: String,
    pub jwt_refresh_expiry_days: u64,
    pub session_secret: String,
    pub session_timeout_minutes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    pub url: String,
    pub host: String,
    pub port: u16,
    pub password: Option<String>,
    pub db: u8,
    pub pool_max_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub upload_dir: String,
    pub upload_max_size: u64,
    pub allowed_file_types: Vec<String>,
    pub storage_provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub smtp_from: String,
    pub smtp_from_name: String,
    pub smtp_use_tls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub ollama_base_url: String,
    pub ollama_model: String,
    pub ollama_timeout: u64,
    pub rag_chunk_size: usize,
    pub rag_chunk_overlap: usize,
    pub rag_max_results: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
                allowed_file_types: env
                    .allowed_file_types
                    .split(',')
                    .map(|s| s.to_string())
                    .collect(),
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
                allowed_file_types: env
                    .allowed_file_types
                    .split(',')
                    .map(|s| s.to_string())
                    .collect(),
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
                allowed_file_types: env
                    .allowed_file_types
                    .split(',')
                    .map(|s| s.to_string())
                    .collect(),
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

fn default_app_env() -> String {
    "development".to_string()
}
fn default_database_url() -> String {
    "postgres://topems:topems_dev@localhost:5432/topems_dev".to_string()
}
fn default_test_database_url() -> String {
    "postgres://topems_test:topems_test_secret@localhost:5432/topems_test".to_string()
}
fn default_db_host() -> String {
    "localhost".to_string()
}
fn default_db_port() -> u16 {
    5432
}
fn default_db_name() -> String {
    "topems_dev".to_string()
}
fn default_test_db_name() -> String {
    "topems_test".to_string()
}
fn default_db_user() -> String {
    "topems".to_string()
}
fn default_db_password() -> String {
    "topems_dev".to_string()
}
fn default_test_db_password() -> String {
    "topems_test_secret".to_string()
}
fn default_pool_max_size() -> u32 {
    10
}
fn default_test_pool_max_size() -> u32 {
    5
}
fn default_pool_min_size() -> u32 {
    2
}
fn default_test_pool_min_size() -> u32 {
    1
}
fn default_connect_timeout() -> u64 {
    10
}
fn default_test_connect_timeout() -> u64 {
    5
}
fn default_idle_timeout() -> u64 {
    300
}
fn default_test_idle_timeout() -> u64 {
    60
}
fn default_jwt_secret() -> String {
    "dev-jwt-secret-key-not-for-production-use".to_string()
}
fn default_test_jwt_secret() -> String {
    "test-jwt-secret-key-for-testing-only-32chars".to_string()
}
fn default_jwt_expiry_hours() -> u64 {
    24
}
fn default_test_jwt_expiry_hours() -> u64 {
    1
}
fn default_jwt_refresh_secret() -> String {
    "dev-refresh-secret-key-not-for-production".to_string()
}
fn default_test_jwt_refresh_secret() -> String {
    "test-refresh-secret-for-testing-only".to_string()
}
fn default_jwt_refresh_expiry_days() -> u64 {
    7
}
fn default_test_jwt_refresh_expiry_days() -> u64 {
    1
}
fn default_session_secret() -> String {
    "dev-session-secret-not-for-production".to_string()
}
fn default_test_session_secret() -> String {
    "test-session-secret-for-testing-only".to_string()
}
fn default_session_timeout_minutes() -> u64 {
    240
}
fn default_test_session_timeout_minutes() -> u64 {
    30
}
fn default_server_host() -> String {
    "localhost".to_string()
}
fn default_server_port() -> u16 {
    8000
}
fn default_test_server_port() -> u16 {
    8000
}
fn default_cors_origins() -> String {
    "http://localhost:5173,http://localhost:3000".to_string()
}
fn default_test_cors_origins() -> String {
    "http://localhost:3000".to_string()
}
fn default_cors_methods() -> String {
    "GET,POST,PUT,DELETE,PATCH,OPTIONS".to_string()
}
fn default_cors_credentials() -> bool {
    true
}
fn default_rate_limit_enabled() -> bool {
    false
}
fn default_test_rate_limit_enabled() -> bool {
    false
}
fn default_rate_limit_requests() -> u32 {
    1000
}
fn default_test_rate_limit_requests() -> u32 {
    10000
}
fn default_rate_limit_window() -> u64 {
    60
}
fn default_redis_url() -> String {
    "redis://localhost:6379".to_string()
}
fn default_test_redis_url() -> String {
    "redis://localhost:6379/1".to_string()
}
fn default_redis_host() -> String {
    "localhost".to_string()
}
fn default_redis_port() -> u16 {
    6379
}
fn default_redis_db() -> u8 {
    0
}
fn default_test_redis_db() -> u8 {
    1
}
fn default_redis_pool_max_size() -> u32 {
    5
}
fn default_upload_dir() -> String {
    "./uploads".to_string()
}
fn default_test_upload_dir() -> String {
    "./test_uploads".to_string()
}
fn default_upload_max_size() -> u64 {
    104857600
}
fn default_test_upload_max_size() -> u64 {
    10485760
}
fn default_allowed_file_types() -> String {
    "jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip,rar,txt,md".to_string()
}
fn default_test_allowed_file_types() -> String {
    "jpg,pdf,txt,csv".to_string()
}
fn default_storage_provider() -> String {
    "local".to_string()
}
fn default_smtp_host() -> String {
    "localhost".to_string()
}
fn default_smtp_port() -> u16 {
    1025
}
fn default_smtp_user() -> String {
    "".to_string()
}
fn default_smtp_password() -> String {
    "".to_string()
}
fn default_smtp_from() -> String {
    "topems@localhost".to_string()
}
fn default_smtp_from_name() -> String {
    "TOPEMS".to_string()
}
fn default_smtp_use_tls() -> bool {
    false
}
fn default_ollama_base_url() -> String {
    "http://localhost:11434".to_string()
}
fn default_ollama_model() -> String {
    "qwen2.5:7b-instruct".to_string()
}
fn default_ollama_timeout() -> u64 {
    60
}
fn default_test_ollama_timeout() -> u64 {
    30
}
fn default_rag_chunk_size() -> usize {
    500
}
fn default_rag_chunk_overlap() -> usize {
    50
}
fn default_rag_max_results() -> usize {
    3
}
fn default_log_level() -> String {
    "debug".to_string()
}
fn default_test_log_level() -> String {
    "warn".to_string()
}
fn default_log_format() -> String {
    "pretty".to_string()
}
fn default_log_file_enabled() -> bool {
    false
}
fn default_log_file_path() -> String {
    "./logs/app.log".to_string()
}
fn default_log_max_size() -> u64 {
    50
}
fn default_log_max_files() -> u32 {
    5
}
fn default_cache_prefix() -> String {
    "topems:".to_string()
}
fn default_cache_default_ttl() -> u64 {
    3600
}
fn default_cache_memory_size() -> usize {
    1000
}
fn default_cache_eviction_policy() -> String {
    "LRU".to_string()
}
fn default_cache_write_through() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_config_default_values() {
        let c = CacheConfig::default();
        assert_eq!(c.prefix, "topems:");
        assert_eq!(c.default_ttl, 3600);
        assert_eq!(c.memory_cache_size, 1000);
        assert_eq!(c.eviction_policy, "LRU");
        assert!(!c.write_through);
        assert!(c.enable_multi_level);
        assert_eq!(c.l1_ttl, 60);
        assert_eq!(c.l2_ttl, 3600);
        assert!(c.enable_cache_warming);
        assert_eq!(c.warming_concurrency, 4);
        assert_eq!(c.stats_interval, 60);
    }

    fn build_devenv() -> DevEnv {
        DevEnv {
            app_env: default_app_env(),
            database_url: default_database_url(),
            db_host: default_db_host(),
            db_port: default_db_port(),
            db_name: default_db_name(),
            db_user: default_db_user(),
            db_password: default_db_password(),
            db_pool_max_size: default_pool_max_size(),
            db_pool_min_size: default_pool_min_size(),
            db_connect_timeout: default_connect_timeout(),
            db_idle_timeout: default_idle_timeout(),
            jwt_secret: default_jwt_secret(),
            jwt_expiry_hours: default_jwt_expiry_hours(),
            jwt_refresh_secret: default_jwt_refresh_secret(),
            jwt_refresh_expiry_days: default_jwt_refresh_expiry_days(),
            session_secret: default_session_secret(),
            session_timeout_minutes: default_session_timeout_minutes(),
            server_host: default_server_host(),
            server_port: default_server_port(),
            cors_origins: default_cors_origins(),
            cors_methods: default_cors_methods(),
            cors_credentials: default_cors_credentials(),
            rate_limit_enabled: default_rate_limit_enabled(),
            rate_limit_requests: default_rate_limit_requests(),
            rate_limit_window_secs: default_rate_limit_window(),
            redis_url: default_redis_url(),
            redis_host: default_redis_host(),
            redis_port: default_redis_port(),
            redis_password: None,
            redis_db: default_redis_db(),
            redis_pool_max_size: default_redis_pool_max_size(),
            cache_prefix: default_cache_prefix(),
            cache_default_ttl: default_cache_default_ttl(),
            cache_memory_size: default_cache_memory_size(),
            cache_eviction_policy: default_cache_eviction_policy(),
            cache_write_through: default_cache_write_through(),
            upload_dir: default_upload_dir(),
            upload_max_size: default_upload_max_size(),
            allowed_file_types: default_allowed_file_types(),
            storage_provider: default_storage_provider(),
            smtp_host: default_smtp_host(),
            smtp_port: default_smtp_port(),
            smtp_user: default_smtp_user(),
            smtp_password: default_smtp_password(),
            smtp_from: default_smtp_from(),
            smtp_from_name: default_smtp_from_name(),
            smtp_use_tls: default_smtp_use_tls(),
            ollama_base_url: default_ollama_base_url(),
            ollama_model: default_ollama_model(),
            ollama_timeout: default_ollama_timeout(),
            rag_chunk_size: default_rag_chunk_size(),
            rag_chunk_overlap: default_rag_chunk_overlap(),
            rag_max_results: default_rag_max_results(),
            log_level: default_log_level(),
            log_format: default_log_format(),
            log_file_enabled: default_log_file_enabled(),
            log_file_path: default_log_file_path(),
            log_max_size: default_log_max_size(),
            log_max_files: default_log_max_files(),
        }
    }

    #[test]
    fn from_devenv_to_appconfig_key_fields() {
        let env = build_devenv();
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.app_env, "development");
        assert_eq!(cfg.database.host, "localhost");
        assert_eq!(cfg.database.port, 5432);
        assert_eq!(cfg.database.pool_max_size, 10);
        assert_eq!(cfg.database.pool_min_size, 2);
        assert_eq!(cfg.database.connect_timeout, 10);
        assert_eq!(cfg.auth.jwt_expiry_hours, 24);
        assert_eq!(cfg.auth.session_timeout_minutes, 240);
        assert_eq!(cfg.server.host, "localhost");
        assert_eq!(cfg.server.port, 8000);
        assert_eq!(
            cfg.server.cors_origins,
            vec![
                "http://localhost:5173".to_string(),
                "http://localhost:3000".to_string()
            ]
        );
        assert_eq!(cfg.server.cors_methods.len(), 6);
        assert!(cfg.server.cors_credentials);
        assert!(!cfg.server.rate_limit_enabled);
        assert_eq!(cfg.redis.host, "localhost");
        assert_eq!(cfg.redis.port, 6379);
        assert_eq!(cfg.redis.db, 0);
        assert_eq!(cfg.cache.prefix, "topems:");
        assert!(cfg.cache.enable_multi_level);
        assert_eq!(cfg.cache.l1_ttl, 60);
        assert_eq!(cfg.cache.l2_ttl, 3600);
        assert!(cfg.cache.enable_cache_warming);
        assert_eq!(cfg.storage.upload_dir, "./uploads");
        assert_eq!(cfg.storage.storage_provider, "local");
        assert_eq!(cfg.mail.smtp_port, 1025);
        assert_eq!(cfg.mail.smtp_from, "topems@localhost");
        assert!(!cfg.mail.smtp_use_tls);
        assert_eq!(cfg.ai.ollama_model, "qwen2.5:7b-instruct");
        assert_eq!(cfg.logging.level, "debug");
        assert_eq!(cfg.logging.format, "pretty");
        assert!(!cfg.logging.file_enabled);
    }

    fn build_testenv() -> TestEnv {
        TestEnv {
            app_env: default_app_env(),
            database_url: default_test_database_url(),
            db_host: default_db_host(),
            db_port: default_db_port(),
            db_name: default_test_db_name(),
            db_user: default_db_user(),
            db_password: default_test_db_password(),
            db_pool_max_size: default_test_pool_max_size(),
            db_pool_min_size: default_test_pool_min_size(),
            db_connect_timeout: default_test_connect_timeout(),
            db_idle_timeout: default_test_idle_timeout(),
            jwt_secret: default_test_jwt_secret(),
            jwt_expiry_hours: default_test_jwt_expiry_hours(),
            jwt_refresh_secret: default_test_jwt_refresh_secret(),
            jwt_refresh_expiry_days: default_test_jwt_refresh_expiry_days(),
            session_secret: default_test_session_secret(),
            session_timeout_minutes: default_test_session_timeout_minutes(),
            server_host: default_server_host(),
            server_port: default_test_server_port(),
            cors_origins: default_test_cors_origins(),
            cors_methods: default_cors_methods(),
            cors_credentials: default_cors_credentials(),
            rate_limit_enabled: default_test_rate_limit_enabled(),
            rate_limit_requests: default_test_rate_limit_requests(),
            rate_limit_window_secs: default_rate_limit_window(),
            redis_url: default_test_redis_url(),
            redis_host: default_redis_host(),
            redis_port: default_redis_port(),
            redis_password: None,
            redis_db: default_test_redis_db(),
            redis_pool_max_size: default_redis_pool_max_size(),
            cache_prefix: default_cache_prefix(),
            cache_default_ttl: default_cache_default_ttl(),
            cache_memory_size: default_cache_memory_size(),
            cache_eviction_policy: default_cache_eviction_policy(),
            cache_write_through: default_cache_write_through(),
            upload_dir: default_test_upload_dir(),
            upload_max_size: default_test_upload_max_size(),
            allowed_file_types: default_test_allowed_file_types(),
            storage_provider: default_storage_provider(),
            smtp_host: default_smtp_host(),
            smtp_port: default_smtp_port(),
            smtp_user: default_smtp_user(),
            smtp_password: default_smtp_password(),
            smtp_from: default_smtp_from(),
            smtp_from_name: default_smtp_from_name(),
            smtp_use_tls: default_smtp_use_tls(),
            ollama_base_url: default_ollama_base_url(),
            ollama_model: default_ollama_model(),
            ollama_timeout: default_test_ollama_timeout(),
            rag_chunk_size: default_rag_chunk_size(),
            rag_chunk_overlap: default_rag_chunk_overlap(),
            rag_max_results: default_rag_max_results(),
            log_level: default_test_log_level(),
            log_format: default_log_format(),
            log_file_enabled: default_log_file_enabled(),
            log_file_path: default_log_file_path(),
            log_max_size: default_log_max_size(),
            log_max_files: default_log_max_files(),
        }
    }

    #[test]
    fn from_testenv_to_appconfig_key_fields() {
        let env = build_testenv();
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.database.name, "topems_test");
        assert_eq!(cfg.database.password, "topems_test_secret");
        assert_eq!(cfg.database.pool_max_size, 5);
        assert_eq!(cfg.database.pool_min_size, 1);
        assert_eq!(cfg.database.connect_timeout, 5);
        assert_eq!(cfg.database.idle_timeout, 60);
        assert_eq!(cfg.auth.jwt_expiry_hours, 1);
        assert_eq!(cfg.auth.jwt_refresh_expiry_days, 1);
        assert_eq!(cfg.auth.session_timeout_minutes, 30);
        assert_eq!(
            cfg.server.cors_origins,
            vec!["http://localhost:3000".to_string()]
        );
        assert_eq!(cfg.server.rate_limit_requests, 10000);
        assert_eq!(cfg.redis.db, 1);
        assert_eq!(cfg.storage.upload_dir, "./test_uploads");
        assert_eq!(cfg.storage.upload_max_size, 10485760);
        assert_eq!(cfg.logging.level, "warn");
    }

    #[test]
    fn default_functions_smoke() {
        assert_eq!(default_app_env(), "development");
        assert_eq!(default_db_host(), "localhost");
        assert_eq!(default_db_port(), 5432);
        assert_eq!(default_pool_max_size(), 10);
        assert_eq!(default_connect_timeout(), 10);
        assert_eq!(default_server_port(), 8000);
        assert_eq!(default_redis_port(), 6379);
        assert_eq!(default_cache_default_ttl(), 3600);
        assert_eq!(default_cache_memory_size(), 1000);
        assert_eq!(default_rag_chunk_size(), 500);
        assert_eq!(default_rag_chunk_overlap(), 50);
        assert_eq!(default_rag_max_results(), 3);
        assert_eq!(default_log_max_size(), 50);
        assert_eq!(default_log_max_files(), 5);
    }

    // ===== 以下为补充测试 =====
    use std::sync::Mutex;

    /// env var 测试全局锁，避免并行 set_var/remove_var 竞态
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn build_database_config() -> DatabaseConfig {
        DatabaseConfig {
            url: "postgres://u:p@h:5432/db".to_string(),
            host: "dbhost".to_string(),
            port: 5432,
            name: "dbname".to_string(),
            user: "dbuser".to_string(),
            password: "dbpass".to_string(),
            pool_max_size: 8,
            pool_min_size: 2,
            connect_timeout: 15,
            idle_timeout: 120,
        }
    }

    fn build_auth_config() -> AuthConfig {
        AuthConfig {
            jwt_secret: "jwt-secret-value".to_string(),
            jwt_expiry_hours: 24,
            jwt_refresh_secret: "refresh-secret".to_string(),
            jwt_refresh_expiry_days: 7,
            session_secret: "session-secret".to_string(),
            session_timeout_minutes: 60,
        }
    }

    fn build_server_config() -> ServerConfig {
        ServerConfig {
            host: "0.0.0.0".to_string(),
            port: 9000,
            cors_origins: vec!["http://a".to_string(), "http://b".to_string()],
            cors_methods: vec!["GET".to_string(), "POST".to_string()],
            cors_credentials: true,
            rate_limit_enabled: true,
            rate_limit_requests: 100,
            rate_limit_window_secs: 30,
        }
    }

    fn build_redis_config() -> RedisConfig {
        RedisConfig {
            url: "redis://r:6379".to_string(),
            host: "redishost".to_string(),
            port: 6379,
            password: Some("secret".to_string()),
            db: 2,
            pool_max_size: 16,
        }
    }

    fn build_storage_config() -> StorageConfig {
        StorageConfig {
            upload_dir: "/data/uploads".to_string(),
            upload_max_size: 1048576,
            allowed_file_types: vec!["png".to_string(), "pdf".to_string()],
            storage_provider: "s3".to_string(),
        }
    }

    fn build_mail_config() -> MailConfig {
        MailConfig {
            smtp_host: "smtp.example.com".to_string(),
            smtp_port: 587,
            smtp_user: "postmaster".to_string(),
            smtp_password: "pw".to_string(),
            smtp_from: "no-reply@example.com".to_string(),
            smtp_from_name: "TOPEMS".to_string(),
            smtp_use_tls: true,
        }
    }

    fn build_ai_config() -> AiConfig {
        AiConfig {
            ollama_base_url: "http://ollama:11434".to_string(),
            ollama_model: "qwen2.5:7b-instruct".to_string(),
            ollama_timeout: 120,
            rag_chunk_size: 500,
            rag_chunk_overlap: 50,
            rag_max_results: 5,
        }
    }

    fn build_logging_config() -> LoggingConfig {
        LoggingConfig {
            level: "info".to_string(),
            format: "json".to_string(),
            file_enabled: true,
            file_path: "/var/log/app.log".to_string(),
            max_size: 200,
            max_files: 10,
        }
    }

    // ---------- DatabaseConfig ----------
    #[test]
    fn database_config_serde_json_roundtrip() {
        let c = build_database_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: DatabaseConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.url, c.url);
        assert_eq!(back.host, c.host);
        assert_eq!(back.port, c.port);
        assert_eq!(back.name, c.name);
        assert_eq!(back.user, c.user);
        assert_eq!(back.password, c.password);
        assert_eq!(back.pool_max_size, c.pool_max_size);
        assert_eq!(back.pool_min_size, c.pool_min_size);
        assert_eq!(back.connect_timeout, c.connect_timeout);
        assert_eq!(back.idle_timeout, c.idle_timeout);
    }

    #[test]
    fn database_config_serde_yaml_roundtrip() {
        let c = build_database_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: DatabaseConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.url, c.url);
        assert_eq!(back.host, c.host);
        assert_eq!(back.port, c.port);
        assert_eq!(back.pool_max_size, c.pool_max_size);
        assert_eq!(back.connect_timeout, c.connect_timeout);
    }

    #[test]
    fn database_config_clone_preserves_fields() {
        let c = build_database_config();
        let c2 = c.clone();
        assert_eq!(c2.url, c.url);
        assert_eq!(c2.host, c.host);
        assert_eq!(c2.pool_max_size, c.pool_max_size);
        assert_eq!(c2.idle_timeout, c.idle_timeout);
    }

    // ---------- AuthConfig ----------
    #[test]
    fn auth_config_serde_json_roundtrip() {
        let c = build_auth_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: AuthConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.jwt_secret, c.jwt_secret);
        assert_eq!(back.jwt_expiry_hours, c.jwt_expiry_hours);
        assert_eq!(back.jwt_refresh_secret, c.jwt_refresh_secret);
        assert_eq!(back.jwt_refresh_expiry_days, c.jwt_refresh_expiry_days);
        assert_eq!(back.session_secret, c.session_secret);
        assert_eq!(back.session_timeout_minutes, c.session_timeout_minutes);
    }

    #[test]
    fn auth_config_serde_yaml_roundtrip() {
        let c = build_auth_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: AuthConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.jwt_secret, c.jwt_secret);
        assert_eq!(back.jwt_expiry_hours, c.jwt_expiry_hours);
        assert_eq!(back.session_timeout_minutes, c.session_timeout_minutes);
    }

    #[test]
    fn auth_config_clone_preserves_fields() {
        let c = build_auth_config();
        let c2 = c.clone();
        assert_eq!(c2.jwt_secret, c.jwt_secret);
        assert_eq!(c2.jwt_refresh_expiry_days, c.jwt_refresh_expiry_days);
    }

    // ---------- ServerConfig ----------
    #[test]
    fn server_config_serde_json_roundtrip() {
        let c = build_server_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: ServerConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.host, c.host);
        assert_eq!(back.port, c.port);
        assert_eq!(back.cors_origins, c.cors_origins);
        assert_eq!(back.cors_methods, c.cors_methods);
        assert_eq!(back.cors_credentials, c.cors_credentials);
        assert_eq!(back.rate_limit_enabled, c.rate_limit_enabled);
        assert_eq!(back.rate_limit_requests, c.rate_limit_requests);
        assert_eq!(back.rate_limit_window_secs, c.rate_limit_window_secs);
    }

    #[test]
    fn server_config_serde_yaml_roundtrip() {
        let c = build_server_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: ServerConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.host, c.host);
        assert_eq!(back.port, c.port);
        assert_eq!(back.cors_origins.len(), 2);
        assert_eq!(back.rate_limit_requests, c.rate_limit_requests);
    }

    #[test]
    fn server_config_clone_preserves_fields() {
        let c = build_server_config();
        let c2 = c.clone();
        assert_eq!(c2.host, c.host);
        assert_eq!(c2.cors_origins, c.cors_origins);
        assert_eq!(c2.rate_limit_window_secs, c.rate_limit_window_secs);
    }

    // ---------- RedisConfig ----------
    #[test]
    fn redis_config_serde_json_roundtrip() {
        let c = build_redis_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: RedisConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.url, c.url);
        assert_eq!(back.host, c.host);
        assert_eq!(back.port, c.port);
        assert_eq!(back.password, c.password);
        assert_eq!(back.db, c.db);
        assert_eq!(back.pool_max_size, c.pool_max_size);
    }

    #[test]
    fn redis_config_serde_yaml_roundtrip() {
        let c = build_redis_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: RedisConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.url, c.url);
        assert_eq!(back.password, c.password);
        assert_eq!(back.db, c.db);
        assert_eq!(back.pool_max_size, c.pool_max_size);
    }

    // ---------- CacheConfig ----------
    #[test]
    fn cache_config_serde_json_roundtrip() {
        let c = CacheConfig::default();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: CacheConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.prefix, c.prefix);
        assert_eq!(back.default_ttl, c.default_ttl);
        assert_eq!(back.memory_cache_size, c.memory_cache_size);
        assert_eq!(back.eviction_policy, c.eviction_policy);
        assert_eq!(back.write_through, c.write_through);
        assert_eq!(back.enable_multi_level, c.enable_multi_level);
        assert_eq!(back.l1_ttl, c.l1_ttl);
        assert_eq!(back.l2_ttl, c.l2_ttl);
        assert_eq!(back.enable_cache_warming, c.enable_cache_warming);
        assert_eq!(back.warming_concurrency, c.warming_concurrency);
        assert_eq!(back.stats_interval, c.stats_interval);
    }

    #[test]
    fn cache_config_serde_yaml_roundtrip() {
        let c = CacheConfig::default();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: CacheConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.prefix, c.prefix);
        assert_eq!(back.default_ttl, c.default_ttl);
        assert_eq!(back.l1_ttl, c.l1_ttl);
        assert_eq!(back.l2_ttl, c.l2_ttl);
        assert_eq!(back.warming_concurrency, c.warming_concurrency);
    }

    #[test]
    fn cache_config_clone_preserves_fields() {
        let c = CacheConfig::default();
        let c2 = c.clone();
        assert_eq!(c2.prefix, c.prefix);
        assert_eq!(c2.enable_multi_level, c.enable_multi_level);
        assert_eq!(c2.stats_interval, c.stats_interval);
    }

    // ---------- StorageConfig ----------
    #[test]
    fn storage_config_serde_json_roundtrip() {
        let c = build_storage_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: StorageConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.upload_dir, c.upload_dir);
        assert_eq!(back.upload_max_size, c.upload_max_size);
        assert_eq!(back.allowed_file_types, c.allowed_file_types);
        assert_eq!(back.storage_provider, c.storage_provider);
    }

    #[test]
    fn storage_config_serde_yaml_roundtrip() {
        let c = build_storage_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: StorageConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.upload_dir, c.upload_dir);
        assert_eq!(back.upload_max_size, c.upload_max_size);
        assert_eq!(back.allowed_file_types.len(), 2);
        assert_eq!(back.storage_provider, c.storage_provider);
    }

    // ---------- MailConfig ----------
    #[test]
    fn mail_config_serde_json_roundtrip() {
        let c = build_mail_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: MailConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.smtp_host, c.smtp_host);
        assert_eq!(back.smtp_port, c.smtp_port);
        assert_eq!(back.smtp_user, c.smtp_user);
        assert_eq!(back.smtp_password, c.smtp_password);
        assert_eq!(back.smtp_from, c.smtp_from);
        assert_eq!(back.smtp_from_name, c.smtp_from_name);
        assert_eq!(back.smtp_use_tls, c.smtp_use_tls);
    }

    #[test]
    fn mail_config_serde_yaml_roundtrip() {
        let c = build_mail_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: MailConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.smtp_host, c.smtp_host);
        assert_eq!(back.smtp_port, c.smtp_port);
        assert_eq!(back.smtp_use_tls, c.smtp_use_tls);
        assert_eq!(back.smtp_from_name, c.smtp_from_name);
    }

    // ---------- AiConfig ----------
    #[test]
    fn ai_config_serde_json_roundtrip() {
        let c = build_ai_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: AiConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.ollama_base_url, c.ollama_base_url);
        assert_eq!(back.ollama_model, c.ollama_model);
        assert_eq!(back.ollama_timeout, c.ollama_timeout);
        assert_eq!(back.rag_chunk_size, c.rag_chunk_size);
        assert_eq!(back.rag_chunk_overlap, c.rag_chunk_overlap);
        assert_eq!(back.rag_max_results, c.rag_max_results);
    }

    #[test]
    fn ai_config_serde_yaml_roundtrip() {
        let c = build_ai_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: AiConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.ollama_base_url, c.ollama_base_url);
        assert_eq!(back.ollama_model, c.ollama_model);
        assert_eq!(back.rag_max_results, c.rag_max_results);
    }

    // ---------- LoggingConfig ----------
    #[test]
    fn logging_config_serde_json_roundtrip() {
        let c = build_logging_config();
        let json = serde_json::to_string(&c).expect("serialize");
        let back: LoggingConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.level, c.level);
        assert_eq!(back.format, c.format);
        assert_eq!(back.file_enabled, c.file_enabled);
        assert_eq!(back.file_path, c.file_path);
        assert_eq!(back.max_size, c.max_size);
        assert_eq!(back.max_files, c.max_files);
    }

    #[test]
    fn logging_config_serde_yaml_roundtrip() {
        let c = build_logging_config();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: LoggingConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.level, c.level);
        assert_eq!(back.format, c.format);
        assert_eq!(back.file_path, c.file_path);
        assert_eq!(back.max_files, c.max_files);
    }

    // ---------- AppConfig ----------
    #[test]
    fn app_config_serde_json_roundtrip() {
        let cfg: AppConfig = build_devenv().into();
        let json = serde_json::to_string(&cfg).expect("serialize");
        let back: AppConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.app_env, cfg.app_env);
        assert_eq!(back.database.host, cfg.database.host);
        assert_eq!(back.database.port, cfg.database.port);
        assert_eq!(back.auth.jwt_expiry_hours, cfg.auth.jwt_expiry_hours);
        assert_eq!(back.server.port, cfg.server.port);
        assert_eq!(back.server.cors_origins, cfg.server.cors_origins);
        assert_eq!(back.redis.db, cfg.redis.db);
        assert_eq!(back.cache.prefix, cfg.cache.prefix);
        assert_eq!(back.storage.storage_provider, cfg.storage.storage_provider);
        assert_eq!(back.mail.smtp_port, cfg.mail.smtp_port);
        assert_eq!(back.ai.ollama_model, cfg.ai.ollama_model);
        assert_eq!(back.logging.level, cfg.logging.level);
    }

    #[test]
    fn app_config_serde_yaml_roundtrip() {
        let cfg: AppConfig = build_testenv().into();
        let yaml = serde_yaml::to_string(&cfg).expect("serialize yaml");
        let back: AppConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.database.name, cfg.database.name);
        assert_eq!(back.database.pool_max_size, cfg.database.pool_max_size);
        assert_eq!(back.auth.jwt_expiry_hours, cfg.auth.jwt_expiry_hours);
        assert_eq!(
            back.server.rate_limit_requests,
            cfg.server.rate_limit_requests
        );
        assert_eq!(back.storage.upload_dir, cfg.storage.upload_dir);
        assert_eq!(back.logging.level, cfg.logging.level);
    }

    #[test]
    fn app_config_clone_preserves_fields() {
        let cfg: AppConfig = build_devenv().into();
        let c2 = cfg.clone();
        assert_eq!(c2.app_env, cfg.app_env);
        assert_eq!(c2.database.host, cfg.database.host);
        assert_eq!(c2.server.cors_origins, cfg.server.cors_origins);
        assert_eq!(c2.cache.prefix, cfg.cache.prefix);
        assert_eq!(c2.ai.ollama_model, cfg.ai.ollama_model);
    }

    // ---------- ProductionEnv From ----------
    fn build_productionenv() -> ProductionEnv {
        ProductionEnv {
            app_env: "production".to_string(),
            database_url: "postgres://prod/db".to_string(),
            db_host: default_db_host(),
            db_port: default_db_port(),
            db_name: "topems_prod".to_string(),
            db_user: default_db_user(),
            db_password: "prod_secret".to_string(),
            db_pool_max_size: 20,
            db_pool_min_size: 5,
            db_connect_timeout: 15,
            db_idle_timeout: 600,
            jwt_secret: "prod-jwt-secret-32-chars-minimum!!".to_string(),
            jwt_expiry_hours: 12,
            jwt_refresh_secret: "prod-refresh-secret-32-chars-min!!".to_string(),
            jwt_refresh_expiry_days: 3,
            session_secret: "prod-session-secret-32-chars-min!!".to_string(),
            session_timeout_minutes: 120,
            server_host: "0.0.0.0".to_string(),
            server_port: 8000,
            cors_origins: "https://topems.example.com".to_string(),
            cors_methods: default_cors_methods(),
            cors_credentials: true,
            rate_limit_enabled: true,
            rate_limit_requests: 500,
            rate_limit_window_secs: 60,
            redis_url: "redis://prod-redis:6379".to_string(),
            redis_host: "prod-redis".to_string(),
            redis_port: 6379,
            redis_password: Some("secret".to_string()),
            redis_db: 0,
            redis_pool_max_size: 10,
            cache_prefix: "topems_prod:".to_string(),
            cache_default_ttl: 1800,
            cache_memory_size: 2000,
            cache_eviction_policy: "LRU".to_string(),
            cache_write_through: true,
            upload_dir: "/data/uploads".to_string(),
            upload_max_size: 104857600,
            allowed_file_types: default_allowed_file_types(),
            storage_provider: "s3".to_string(),
            smtp_host: "smtp.example.com".to_string(),
            smtp_port: 587,
            smtp_user: "postmaster".to_string(),
            smtp_password: "smtp_secret".to_string(),
            smtp_from: "no-reply@example.com".to_string(),
            smtp_from_name: "TOPEMS Prod".to_string(),
            smtp_use_tls: true,
            ollama_base_url: "http://ollama-prod:11434".to_string(),
            ollama_model: "qwen2.5:7b-instruct".to_string(),
            ollama_timeout: 120,
            rag_chunk_size: 500,
            rag_chunk_overlap: 50,
            rag_max_results: 5,
            log_level: "info".to_string(),
            log_format: "json".to_string(),
            log_file_enabled: true,
            log_file_path: "/var/log/topems/app.log".to_string(),
            log_max_size: 200,
            log_max_files: 10,
        }
    }

    #[test]
    fn from_productionenv_to_appconfig_key_fields() {
        let env = build_productionenv();
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.app_env, "production");
        assert_eq!(cfg.database.url, "postgres://prod/db");
        assert_eq!(cfg.database.name, "topems_prod");
        assert_eq!(cfg.database.pool_max_size, 20);
        assert_eq!(cfg.database.pool_min_size, 5);
        assert_eq!(cfg.auth.jwt_secret, "prod-jwt-secret-32-chars-minimum!!");
        assert_eq!(cfg.auth.jwt_expiry_hours, 12);
        assert_eq!(cfg.auth.jwt_refresh_expiry_days, 3);
        assert_eq!(cfg.server.host, "0.0.0.0");
        assert_eq!(
            cfg.server.cors_origins,
            vec!["https://topems.example.com".to_string()]
        );
        assert!(cfg.server.rate_limit_enabled);
        assert_eq!(cfg.server.rate_limit_requests, 500);
        assert_eq!(cfg.redis.password, Some("secret".to_string()));
        assert_eq!(cfg.cache.prefix, "topems_prod:");
        assert!(cfg.cache.write_through);
        assert_eq!(cfg.storage.storage_provider, "s3");
        assert!(cfg.mail.smtp_use_tls);
        assert_eq!(cfg.logging.format, "json");
        assert!(cfg.logging.file_enabled);
        assert_eq!(cfg.logging.max_files, 10);
    }

    // ---------- default_* 函数补充覆盖 ----------
    #[test]
    fn default_functions_extended_coverage() {
        // 数据库相关
        assert_eq!(
            default_database_url(),
            "postgres://topems:topems_dev@localhost:5432/topems_dev"
        );
        assert_eq!(
            default_test_database_url(),
            "postgres://topems_test:topems_test_secret@localhost:5432/topems_test"
        );
        assert_eq!(default_db_name(), "topems_dev");
        assert_eq!(default_test_db_name(), "topems_test");
        assert_eq!(default_db_user(), "topems");
        assert_eq!(default_db_password(), "topems_dev");
        assert_eq!(default_test_db_password(), "topems_test_secret");
        // 连接池
        assert_eq!(default_pool_min_size(), 2);
        assert_eq!(default_test_pool_max_size(), 5);
        assert_eq!(default_test_pool_min_size(), 1);
        assert_eq!(default_idle_timeout(), 300);
        assert_eq!(default_test_connect_timeout(), 5);
        assert_eq!(default_test_idle_timeout(), 60);
        // JWT
        assert_eq!(
            default_jwt_secret(),
            "dev-jwt-secret-key-not-for-production-use"
        );
        assert_eq!(
            default_test_jwt_secret(),
            "test-jwt-secret-key-for-testing-only-32chars"
        );
        assert_eq!(default_jwt_expiry_hours(), 24);
        assert_eq!(default_test_jwt_expiry_hours(), 1);
        assert_eq!(
            default_jwt_refresh_secret(),
            "dev-refresh-secret-key-not-for-production"
        );
        assert_eq!(
            default_test_jwt_refresh_secret(),
            "test-refresh-secret-for-testing-only"
        );
        assert_eq!(default_jwt_refresh_expiry_days(), 7);
        assert_eq!(default_test_jwt_refresh_expiry_days(), 1);
        // session
        assert_eq!(
            default_session_secret(),
            "dev-session-secret-not-for-production"
        );
        assert_eq!(
            default_test_session_secret(),
            "test-session-secret-for-testing-only"
        );
        assert_eq!(default_session_timeout_minutes(), 240);
        assert_eq!(default_test_session_timeout_minutes(), 30);
    }

    #[test]
    fn default_functions_server_redis_cache_storage_coverage() {
        // server
        assert_eq!(default_server_host(), "localhost");
        assert_eq!(default_test_server_port(), 8000);
        assert_eq!(
            default_cors_origins(),
            "http://localhost:5173,http://localhost:3000"
        );
        assert_eq!(default_test_cors_origins(), "http://localhost:3000");
        assert_eq!(default_cors_methods(), "GET,POST,PUT,DELETE,PATCH,OPTIONS");
        assert!(default_cors_credentials());
        assert!(!default_rate_limit_enabled());
        assert!(!default_test_rate_limit_enabled());
        assert_eq!(default_rate_limit_requests(), 1000);
        assert_eq!(default_test_rate_limit_requests(), 10000);
        assert_eq!(default_rate_limit_window(), 60);
        // redis
        assert_eq!(default_redis_url(), "redis://localhost:6379");
        assert_eq!(default_test_redis_url(), "redis://localhost:6379/1");
        assert_eq!(default_redis_host(), "localhost");
        assert_eq!(default_redis_db(), 0);
        assert_eq!(default_test_redis_db(), 1);
        assert_eq!(default_redis_pool_max_size(), 5);
        // cache
        assert_eq!(default_cache_prefix(), "topems:");
        assert_eq!(default_cache_eviction_policy(), "LRU");
        assert!(!default_cache_write_through());
        // storage
        assert_eq!(default_upload_dir(), "./uploads");
        assert_eq!(default_test_upload_dir(), "./test_uploads");
        assert_eq!(default_upload_max_size(), 104857600);
        assert_eq!(default_test_upload_max_size(), 10485760);
        assert_eq!(default_storage_provider(), "local");
        assert!(default_allowed_file_types().contains("pdf"));
        assert!(default_test_allowed_file_types().contains("csv"));
        // smtp
        assert_eq!(default_smtp_host(), "localhost");
        assert_eq!(default_smtp_port(), 1025);
        assert_eq!(default_smtp_user(), "");
        assert_eq!(default_smtp_password(), "");
        assert_eq!(default_smtp_from(), "topems@localhost");
        assert_eq!(default_smtp_from_name(), "TOPEMS");
        assert!(!default_smtp_use_tls());
        // ai / logging
        assert_eq!(default_ollama_base_url(), "http://localhost:11434");
        assert_eq!(default_ollama_model(), "qwen2.5:7b-instruct");
        assert_eq!(default_ollama_timeout(), 60);
        assert_eq!(default_test_ollama_timeout(), 30);
        assert_eq!(default_log_level(), "debug");
        assert_eq!(default_test_log_level(), "warn");
        assert_eq!(default_log_format(), "pretty");
        assert!(!default_log_file_enabled());
        assert_eq!(default_log_file_path(), "./logs/app.log");
    }

    #[test]
    fn from_devenv_empty_cors_origins_produces_empty_vec() {
        // cors_origins 为空字符串 → split(',') 产生单个空串元素
        let mut env = build_devenv();
        env.cors_origins = "".to_string();
        let cfg: AppConfig = env.into();
        // "".split(',') 产生 [""]，因此长度为 1（空串）
        assert_eq!(cfg.server.cors_origins.len(), 1);
        assert_eq!(cfg.server.cors_origins[0], "");
    }

    #[test]
    fn from_testenv_allowed_file_types_split_correctly() {
        let cfg: AppConfig = build_testenv().into();
        // default_test_allowed_file_types = "jpg,pdf,txt,csv"
        assert_eq!(cfg.storage.allowed_file_types.len(), 4);
        assert!(cfg.storage.allowed_file_types.contains(&"csv".to_string()));
        assert!(cfg.storage.allowed_file_types.contains(&"jpg".to_string()));
    }

    // ---------- Config (async) ----------
    #[tokio::test]
    async fn config_load_default_is_development() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load dev ok");
        assert_eq!(cfg.env(), "development");
        assert!(cfg.is_development());
        assert!(!cfg.is_production());
        assert!(!cfg.is_test());
    }

    #[tokio::test]
    async fn config_load_test_env() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::set_var("APP_ENV", "test");
        }
        let cfg = Config::load().await.expect("load test ok");
        assert_eq!(cfg.env(), "test");
        assert!(cfg.is_test());
        assert!(!cfg.is_development());
        assert!(!cfg.is_production());
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
    }

    #[tokio::test]
    async fn config_reload_dev_ok() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        assert!(cfg.reload().await.is_ok());
        // reload 后 env 不变
        assert_eq!(cfg.env(), "development");
    }

    #[tokio::test]
    async fn config_get_returns_appconfig() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        let app = cfg.get().await;
        assert_eq!(app.app_env, "development");
    }

    #[tokio::test]
    async fn config_get_database_auth_server_redis_invariants() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        let db = cfg.get_database().await;
        let auth = cfg.get_auth().await;
        let server = cfg.get_server().await;
        let redis = cfg.get_redis().await;
        // 仅断言不被其它 env 测试污染的字段（host/port/pool 等）
        assert_eq!(db.host, "localhost");
        assert_eq!(db.port, 5432);
        assert_eq!(db.pool_max_size, 10);
        assert_eq!(db.pool_min_size, 2);
        assert_eq!(auth.jwt_expiry_hours, 24);
        assert_eq!(auth.session_timeout_minutes, 240);
        assert_eq!(server.host, "localhost");
        assert!(server.cors_credentials);
        assert_eq!(redis.host, "localhost");
        assert_eq!(redis.port, 6379);
    }

    // ===== 第五批补充测试 =====

    // ---------- Config (async) 补充 ----------
    #[tokio::test]
    async fn config_load_unknown_env_falls_back_to_devenv() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::set_var("APP_ENV", "staging");
        }
        let cfg = Config::load().await.expect("load fallback ok");
        // 未知 env 走 _ => DevEnv 分支，但 Config.env 字段保留实际值
        assert_eq!(cfg.env(), "staging");
        assert!(!cfg.is_development());
        assert!(!cfg.is_production());
        assert!(!cfg.is_test());
        // envy 将 APP_ENV 读入 DevEnv.app_env 字段，因此值为 "staging"
        let app = cfg.get().await;
        assert_eq!(app.app_env, "staging");
        std::env::remove_var("APP_ENV");
    }

    #[tokio::test]
    async fn config_get_returns_independent_clone() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        let app1 = cfg.get().await;
        let app2 = cfg.get().await;
        assert_eq!(app1.app_env, app2.app_env);
        assert_eq!(app1.database.host, app2.database.host);
        assert_eq!(app1.server.port, app2.server.port);
    }

    #[tokio::test]
    async fn config_get_redis_returns_configured() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        let redis = cfg.get_redis().await;
        assert_eq!(redis.host, "localhost");
        assert_eq!(redis.port, 6379);
        assert_eq!(redis.db, 0);
        assert_eq!(redis.pool_max_size, 5);
        assert!(redis.password.is_none());
    }

    #[tokio::test]
    async fn config_get_auth_secret_fields() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        let auth = cfg.get_auth().await;
        assert_eq!(auth.jwt_secret, "dev-jwt-secret-key-not-for-production-use");
        assert_eq!(
            auth.jwt_refresh_secret,
            "dev-refresh-secret-key-not-for-production"
        );
        assert_eq!(auth.session_secret, "dev-session-secret-not-for-production");
        assert_eq!(auth.jwt_expiry_hours, 24);
        assert_eq!(auth.jwt_refresh_expiry_days, 7);
    }

    #[tokio::test]
    async fn config_get_server_returns_configured() {
        {
            let _g = ENV_LOCK.lock().unwrap();
            std::env::remove_var("APP_ENV");
        }
        let cfg = Config::load().await.expect("load ok");
        let server = cfg.get_server().await;
        assert_eq!(server.host, "localhost");
        assert_eq!(server.port, 8000);
        assert!(server.cors_credentials);
        assert!(!server.rate_limit_enabled);
        assert_eq!(server.rate_limit_requests, 1000);
        assert_eq!(server.rate_limit_window_secs, 60);
    }

    // ---------- From<DevEnv> 边界 ----------
    #[test]
    fn from_devenv_redis_password_some_preserved() {
        let mut env = build_devenv();
        env.redis_password = Some("dev-redis-secret".to_string());
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.redis.password, Some("dev-redis-secret".to_string()));
    }

    #[test]
    fn from_devenv_redis_password_none_preserved() {
        let mut env = build_devenv();
        env.redis_password = None;
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.redis.password, None);
    }

    #[test]
    fn from_devenv_cors_methods_split_correctly() {
        let env = build_devenv();
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.server.cors_methods.len(), 6);
        assert!(cfg.server.cors_methods.contains(&"GET".to_string()));
        assert!(cfg.server.cors_methods.contains(&"OPTIONS".to_string()));
        assert!(cfg.server.cors_methods.contains(&"PATCH".to_string()));
    }

    #[test]
    fn from_devenv_allowed_file_types_split_correctly() {
        let cfg: AppConfig = build_devenv().into();
        assert_eq!(cfg.storage.allowed_file_types.len(), 13);
        assert!(cfg.storage.allowed_file_types.contains(&"pdf".to_string()));
        assert!(cfg.storage.allowed_file_types.contains(&"md".to_string()));
        assert!(cfg.storage.allowed_file_types.contains(&"zip".to_string()));
    }

    #[test]
    fn from_devenv_empty_allowed_file_types_produces_single_empty() {
        let mut env = build_devenv();
        env.allowed_file_types = "".to_string();
        let cfg: AppConfig = env.into();
        // "".split(',') 产生 [""]
        assert_eq!(cfg.storage.allowed_file_types.len(), 1);
        assert_eq!(cfg.storage.allowed_file_types[0], "");
    }

    #[test]
    fn from_devenv_single_allowed_file_type() {
        let mut env = build_devenv();
        env.allowed_file_types = "pdf".to_string();
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.storage.allowed_file_types.len(), 1);
        assert_eq!(cfg.storage.allowed_file_types[0], "pdf");
    }

    #[test]
    fn from_devenv_preserves_all_ai_fields() {
        let cfg: AppConfig = build_devenv().into();
        assert_eq!(cfg.ai.ollama_base_url, "http://localhost:11434");
        assert_eq!(cfg.ai.ollama_model, "qwen2.5:7b-instruct");
        assert_eq!(cfg.ai.ollama_timeout, 60);
        assert_eq!(cfg.ai.rag_chunk_size, 500);
        assert_eq!(cfg.ai.rag_chunk_overlap, 50);
        assert_eq!(cfg.ai.rag_max_results, 3);
    }

    #[test]
    fn from_devenv_preserves_all_mail_fields() {
        let cfg: AppConfig = build_devenv().into();
        assert_eq!(cfg.mail.smtp_host, "localhost");
        assert_eq!(cfg.mail.smtp_port, 1025);
        assert_eq!(cfg.mail.smtp_user, "");
        assert_eq!(cfg.mail.smtp_password, "");
        assert_eq!(cfg.mail.smtp_from, "topems@localhost");
        assert_eq!(cfg.mail.smtp_from_name, "TOPEMS");
        assert!(!cfg.mail.smtp_use_tls);
    }

    // ---------- From<TestEnv> 边界 ----------
    #[test]
    fn from_testenv_redis_password_some_preserved() {
        let mut env = build_testenv();
        env.redis_password = Some("test-redis-secret".to_string());
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.redis.password, Some("test-redis-secret".to_string()));
    }

    #[test]
    fn from_testenv_cors_methods_split_correctly() {
        let cfg: AppConfig = build_testenv().into();
        assert_eq!(cfg.server.cors_methods.len(), 6);
        assert!(cfg.server.cors_methods.contains(&"POST".to_string()));
        assert!(cfg.server.cors_methods.contains(&"DELETE".to_string()));
    }

    #[test]
    fn from_testenv_preserves_all_logging_fields() {
        let cfg: AppConfig = build_testenv().into();
        assert_eq!(cfg.logging.level, "warn");
        assert_eq!(cfg.logging.format, "pretty");
        assert!(!cfg.logging.file_enabled);
        assert_eq!(cfg.logging.file_path, "./logs/app.log");
        assert_eq!(cfg.logging.max_size, 50);
        assert_eq!(cfg.logging.max_files, 5);
    }

    // ---------- From<ProductionEnv> 边界 ----------
    #[test]
    fn from_productionenv_redis_password_none_preserved() {
        let mut env = build_productionenv();
        env.redis_password = None;
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.redis.password, None);
    }

    #[test]
    fn from_productionenv_cors_methods_split_correctly() {
        let cfg: AppConfig = build_productionenv().into();
        assert_eq!(cfg.server.cors_methods.len(), 6);
        assert!(cfg.server.cors_methods.contains(&"GET".to_string()));
    }

    #[test]
    fn from_productionenv_allowed_file_types_split_correctly() {
        let cfg: AppConfig = build_productionenv().into();
        assert!(cfg.storage.allowed_file_types.contains(&"jpg".to_string()));
        assert!(cfg.storage.allowed_file_types.contains(&"pdf".to_string()));
        assert!(cfg.storage.allowed_file_types.contains(&"md".to_string()));
    }

    #[test]
    fn from_productionenv_multi_cors_origins_split() {
        let mut env = build_productionenv();
        env.cors_origins = "https://a.com,https://b.com,https://c.com".to_string();
        let cfg: AppConfig = env.into();
        assert_eq!(cfg.server.cors_origins.len(), 3);
        assert!(cfg
            .server
            .cors_origins
            .contains(&"https://b.com".to_string()));
        assert!(cfg
            .server
            .cors_origins
            .contains(&"https://c.com".to_string()));
    }

    #[test]
    fn from_productionenv_preserves_all_database_fields() {
        let cfg: AppConfig = build_productionenv().into();
        assert_eq!(cfg.database.url, "postgres://prod/db");
        assert_eq!(cfg.database.host, "localhost");
        assert_eq!(cfg.database.port, 5432);
        assert_eq!(cfg.database.name, "topems_prod");
        assert_eq!(cfg.database.user, "topems");
        assert_eq!(cfg.database.password, "prod_secret");
        assert_eq!(cfg.database.pool_max_size, 20);
        assert_eq!(cfg.database.pool_min_size, 5);
        assert_eq!(cfg.database.connect_timeout, 15);
        assert_eq!(cfg.database.idle_timeout, 600);
    }

    // ---------- Clone 测试补充 ----------
    #[test]
    fn redis_config_clone_preserves_all_fields() {
        let c = build_redis_config();
        let c2 = c.clone();
        assert_eq!(c2.url, c.url);
        assert_eq!(c2.host, c.host);
        assert_eq!(c2.port, c.port);
        assert_eq!(c2.password, c.password);
        assert_eq!(c2.db, c.db);
        assert_eq!(c2.pool_max_size, c.pool_max_size);
    }

    #[test]
    fn storage_config_clone_preserves_all_fields() {
        let c = build_storage_config();
        let c2 = c.clone();
        assert_eq!(c2.upload_dir, c.upload_dir);
        assert_eq!(c2.upload_max_size, c.upload_max_size);
        assert_eq!(c2.allowed_file_types, c.allowed_file_types);
        assert_eq!(c2.storage_provider, c.storage_provider);
    }

    #[test]
    fn mail_config_clone_preserves_all_fields() {
        let c = build_mail_config();
        let c2 = c.clone();
        assert_eq!(c2.smtp_host, c.smtp_host);
        assert_eq!(c2.smtp_port, c.smtp_port);
        assert_eq!(c2.smtp_user, c.smtp_user);
        assert_eq!(c2.smtp_password, c.smtp_password);
        assert_eq!(c2.smtp_from, c.smtp_from);
        assert_eq!(c2.smtp_from_name, c.smtp_from_name);
        assert_eq!(c2.smtp_use_tls, c.smtp_use_tls);
    }

    #[test]
    fn ai_config_clone_preserves_all_fields() {
        let c = build_ai_config();
        let c2 = c.clone();
        assert_eq!(c2.ollama_base_url, c.ollama_base_url);
        assert_eq!(c2.ollama_model, c.ollama_model);
        assert_eq!(c2.ollama_timeout, c.ollama_timeout);
        assert_eq!(c2.rag_chunk_size, c.rag_chunk_size);
        assert_eq!(c2.rag_chunk_overlap, c.rag_chunk_overlap);
        assert_eq!(c2.rag_max_results, c.rag_max_results);
    }

    #[test]
    fn logging_config_clone_preserves_all_fields() {
        let c = build_logging_config();
        let c2 = c.clone();
        assert_eq!(c2.level, c.level);
        assert_eq!(c2.format, c.format);
        assert_eq!(c2.file_enabled, c.file_enabled);
        assert_eq!(c2.file_path, c.file_path);
        assert_eq!(c2.max_size, c.max_size);
        assert_eq!(c2.max_files, c.max_files);
    }

    // ---------- Debug derive 测试 ----------
    #[test]
    fn database_config_debug_format_contains_fields() {
        let c = build_database_config();
        let debug = format!("{:?}", c);
        assert!(debug.contains("DatabaseConfig"));
        assert!(debug.contains("dbhost"));
        assert!(debug.contains("dbname"));
        assert!(debug.contains("dbuser"));
    }

    #[test]
    fn app_config_debug_format_contains_app_env() {
        let cfg: AppConfig = build_devenv().into();
        let debug = format!("{:?}", cfg);
        assert!(debug.contains("AppConfig"));
        assert!(debug.contains("development"));
        assert!(debug.contains("localhost"));
    }

    // ---------- AppConfig 自定义值 roundtrip ----------
    #[test]
    fn app_config_serde_json_custom_values_roundtrip() {
        let cfg = AppConfig {
            app_env: "custom".to_string(),
            database: DatabaseConfig {
                url: "postgres://custom".to_string(),
                host: "custom-host".to_string(),
                port: 9999,
                name: "custom_db".to_string(),
                user: "custom_user".to_string(),
                password: "custom_pw".to_string(),
                pool_max_size: 99,
                pool_min_size: 11,
                connect_timeout: 77,
                idle_timeout: 888,
            },
            auth: build_auth_config(),
            server: build_server_config(),
            redis: build_redis_config(),
            cache: CacheConfig::default(),
            storage: build_storage_config(),
            mail: build_mail_config(),
            ai: build_ai_config(),
            logging: build_logging_config(),
        };
        let json = serde_json::to_string(&cfg).expect("serialize");
        let back: AppConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.app_env, "custom");
        assert_eq!(back.database.host, "custom-host");
        assert_eq!(back.database.port, 9999);
        assert_eq!(back.database.pool_max_size, 99);
        assert_eq!(back.database.connect_timeout, 77);
        assert_eq!(back.auth.jwt_secret, "jwt-secret-value");
        assert_eq!(back.server.port, 9000);
        assert_eq!(back.redis.password, Some("secret".to_string()));
        assert_eq!(back.storage.storage_provider, "s3");
        assert_eq!(back.ai.ollama_timeout, 120);
        assert_eq!(back.logging.format, "json");
    }

    // ---------- CacheConfig 自定义值 ----------
    #[test]
    fn cache_config_custom_values_serde_roundtrip() {
        let c = CacheConfig {
            prefix: "custom:".to_string(),
            default_ttl: 120,
            memory_cache_size: 5000,
            eviction_policy: "FIFO".to_string(),
            write_through: true,
            enable_multi_level: false,
            l1_ttl: 10,
            l2_ttl: 100,
            enable_cache_warming: false,
            warming_concurrency: 8,
            stats_interval: 30,
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: CacheConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.prefix, "custom:");
        assert_eq!(back.default_ttl, 120);
        assert_eq!(back.memory_cache_size, 5000);
        assert_eq!(back.eviction_policy, "FIFO");
        assert!(back.write_through);
        assert!(!back.enable_multi_level);
        assert_eq!(back.l1_ttl, 10);
        assert_eq!(back.l2_ttl, 100);
        assert!(!back.enable_cache_warming);
        assert_eq!(back.warming_concurrency, 8);
        assert_eq!(back.stats_interval, 30);
    }

    // ---------- default_* 剩余覆盖 ----------
    #[test]
    fn default_functions_remaining_coverage() {
        assert_eq!(
            default_test_jwt_secret(),
            "test-jwt-secret-key-for-testing-only-32chars"
        );
        assert_eq!(
            default_test_jwt_refresh_secret(),
            "test-refresh-secret-for-testing-only"
        );
        assert_eq!(
            default_test_session_secret(),
            "test-session-secret-for-testing-only"
        );
        assert_eq!(default_test_server_port(), 8000);
        assert_eq!(default_test_cors_origins(), "http://localhost:3000");
        assert_eq!(default_log_file_path(), "./logs/app.log");
        assert_eq!(default_log_max_size(), 50);
        assert_eq!(default_log_max_files(), 5);
        assert!(!default_log_file_enabled());
        assert_eq!(default_log_format(), "pretty");
    }
}
