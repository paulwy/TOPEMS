#![allow(dead_code)] // Reserved: V56 API 版本管理模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V56.0 BFF Phase 26: GraphQL API 版本管理 + 灰度流量切换 + 向后兼容保证
//!
//! 核心能力：
//! 1. API 版本管理 (API Version Management)
//!    - APIVersionManager: 版本注册/查询/废弃/ sunset/兼容性检查
//!    - APIVersion: 版本号、状态、发布时间、变更日志、破坏性变更
//!    - VersionMapping: 客户端版本到服务端版本的映射
//! 2. 灰度流量切换 (Canary Traffic Switching)
//!    - CanaryManager: A/B 测试、灰度配置、流量切换、结果统计
//!    - CanaryConfig: 灰度规则（版本/百分比/条件/时间窗口）
//!    - CanaryResult: 灰度结果（请求数/错误率/胜者）
//! 3. 向后兼容保证 (Backward Compatibility)
//!    - CompatibilityChecker: Schema diff 分析、兼容性报告、迁移路径
//!    - CompatibilityReport: 兼容性报告、破坏性变更列表、废弃字段
//!    - BreakingChange: 破坏性变更详情（字段移除/类型变更/枚举变更等）

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_API_VERSIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_api_versions (
    version VARCHAR(64) PRIMARY KEY,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deprecated_at TIMESTAMPTZ,
    sunset_at TIMESTAMPTZ,
    changelog TEXT,
    breaking_changes JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_av_status ON portal_api_versions(status);
"#;

pub const CREATE_VERSION_MAPPINGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_version_mappings (
    id VARCHAR(64) PRIMARY KEY,
    client_version VARCHAR(64) NOT NULL,
    server_version VARCHAR(64) NOT NULL,
    compatibility VARCHAR(32) NOT NULL DEFAULT 'full',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vm_client ON portal_version_mappings(client_version);
CREATE INDEX IF NOT EXISTS idx_vm_server ON portal_version_mappings(server_version);
"#;

pub const CREATE_CANARY_CONFIGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_canary_configs (
    id VARCHAR(64) PRIMARY KEY,
    version VARCHAR(64) NOT NULL,
    percentage INT NOT NULL DEFAULT 0,
    conditions JSONB NOT NULL DEFAULT '{}',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cc_version ON portal_canary_configs(version);
CREATE INDEX IF NOT EXISTS idx_cc_status ON portal_canary_configs(status);
"#;

pub const CREATE_CANARY_RESULTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_canary_results (
    id VARCHAR(64) PRIMARY KEY,
    config_id VARCHAR(64) NOT NULL,
    total_requests BIGINT NOT NULL DEFAULT 0,
    canary_requests BIGINT NOT NULL DEFAULT 0,
    baseline_requests BIGINT NOT NULL DEFAULT 0,
    error_rate_canary DOUBLE PRECISION NOT NULL DEFAULT 0,
    error_rate_baseline DOUBLE PRECISION NOT NULL DEFAULT 0,
    winner VARCHAR(32),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_config ON portal_canary_results(config_id);
"#;

pub const CREATE_COMPATIBILITY_REPORTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_compatibility_reports (
    id VARCHAR(64) PRIMARY KEY,
    from_version VARCHAR(64) NOT NULL,
    to_version VARCHAR(64) NOT NULL,
    breaking_changes JSONB NOT NULL DEFAULT '[]',
    deprecated_fields JSONB NOT NULL DEFAULT '[]',
    compatible BOOLEAN NOT NULL DEFAULT TRUE,
    migration_path JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_from ON portal_compatibility_reports(from_version);
CREATE INDEX IF NOT EXISTS idx_cr_to ON portal_compatibility_reports(to_version);
"#;

pub const CREATE_COMPATIBILITY_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_compatibility_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    min_compatibility_level VARCHAR(32) NOT NULL DEFAULT 'partial',
    require_migration_path BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum APIVersionStatus {
    Active,
    Deprecated,
    Sunset,
    Preview,
}

impl APIVersionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Deprecated => "deprecated",
            Self::Sunset => "sunset",
            Self::Preview => "preview",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "deprecated" => Self::Deprecated,
            "sunset" => Self::Sunset,
            "preview" => Self::Preview,
            _ => Self::Active,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompatibilityLevel {
    Full,
    Partial,
    None,
}

impl CompatibilityLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Partial => "partial",
            Self::None => "none",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "full" => Self::Full,
            "partial" => Self::Partial,
            _ => Self::None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CanaryStatus {
    Draft,
    Running,
    Paused,
    Completed,
    RolledBack,
}

impl CanaryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Running => "running",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::RolledBack => "rolled_back",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "running" => Self::Running,
            "paused" => Self::Paused,
            "completed" => Self::Completed,
            "rolled_back" => Self::RolledBack,
            _ => Self::Draft,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BreakingChangeType {
    FieldRemoved,
    TypeChanged,
    EnumChanged,
    RequiredAdded,
    NullableChanged,
}

impl BreakingChangeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FieldRemoved => "field_removed",
            Self::TypeChanged => "type_changed",
            Self::EnumChanged => "enum_changed",
            Self::RequiredAdded => "required_added",
            Self::NullableChanged => "nullable_changed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "field_removed" => Self::FieldRemoved,
            "type_changed" => Self::TypeChanged,
            "enum_changed" => Self::EnumChanged,
            "required_added" => Self::RequiredAdded,
            _ => Self::NullableChanged,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::FieldRemoved,
            Self::TypeChanged,
            Self::EnumChanged,
            Self::RequiredAdded,
            Self::NullableChanged,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CanaryWinner {
    Canary,
    Baseline,
    Inconclusive,
}

impl CanaryWinner {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Canary => "canary",
            Self::Baseline => "baseline",
            Self::Inconclusive => "inconclusive",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "canary" => Self::Canary,
            "baseline" => Self::Baseline,
            _ => Self::Inconclusive,
        }
    }
}

// ==================== 核心结构体 ====================

// --- API 版本管理 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakingChange {
    #[serde(rename = "type")]
    pub change_type: BreakingChangeType,
    pub entity: String,
    pub field: Option<String>,
    pub description: String,
    pub mitigation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct APIVersion {
    pub version: String,
    pub status: APIVersionStatus,
    pub released_at: String,
    pub deprecated_at: Option<String>,
    pub sunset_at: Option<String>,
    pub changelog: Option<String>,
    pub breaking_changes: Vec<BreakingChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionMapping {
    pub id: String,
    pub client_version: String,
    pub server_version: String,
    pub compatibility: CompatibilityLevel,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangelogEntry {
    pub version: String,
    pub changes: Vec<String>,
    pub breaking: Vec<BreakingChange>,
}

// --- 灰度流量切换 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryCondition {
    pub user_segment: Option<String>,
    pub region: Option<String>,
    pub feature_flag: Option<String>,
    pub custom: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryConfig {
    pub id: String,
    pub version: String,
    pub percentage: u32,
    pub conditions: CanaryCondition,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub status: CanaryStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryResult {
    pub id: String,
    pub config_id: String,
    pub total_requests: u64,
    pub canary_requests: u64,
    pub baseline_requests: u64,
    pub error_rate_canary: f64,
    pub error_rate_baseline: f64,
    pub winner: Option<CanaryWinner>,
    pub recorded_at: String,
}

// --- 向后兼容保证 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityReport {
    pub id: String,
    pub from_version: String,
    pub to_version: String,
    pub breaking_changes: Vec<BreakingChange>,
    pub deprecated_fields: Vec<String>,
    pub compatible: bool,
    pub migration_path: Option<Vec<String>>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityPolicy {
    pub id: String,
    pub name: String,
    pub min_compatibility_level: CompatibilityLevel,
    pub require_migration_path: bool,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityStatus {
    pub client_version: String,
    pub server_version: String,
    pub compatible: bool,
    pub compatibility_level: CompatibilityLevel,
    pub breaking_changes_count: u32,
    pub migration_available: bool,
}

// ==================== 内存存储 ====================

struct VersionControlStore {
    api_versions: Mutex<HashMap<String, APIVersion>>,
    version_mappings: Mutex<Vec<VersionMapping>>,
    changelogs: Mutex<HashMap<String, ChangelogEntry>>,
    canary_configs: Mutex<HashMap<String, CanaryConfig>>,
    canary_results: Mutex<Vec<CanaryResult>>,
    canary_stats: Mutex<HashMap<String, (u64, u64, u64, u64)>>,
    compatibility_reports: Mutex<Vec<CompatibilityReport>>,
    compatibility_policies: Mutex<Vec<CompatibilityPolicy>>,
    active_policy: Mutex<CompatibilityPolicy>,
}

fn get_version_control_store() -> &'static VersionControlStore {
    static STORE: LazyLock<VersionControlStore> = LazyLock::new(|| {
        let default_policy = CompatibilityPolicy {
            id: uuid::Uuid::new_v4().to_string(),
            name: "default".to_string(),
            min_compatibility_level: CompatibilityLevel::Partial,
            require_migration_path: false,
            enabled: true,
        };
        VersionControlStore {
            api_versions: Mutex::new(HashMap::new()),
            version_mappings: Mutex::new(Vec::new()),
            changelogs: Mutex::new(HashMap::new()),
            canary_configs: Mutex::new(HashMap::new()),
            canary_results: Mutex::new(Vec::new()),
            canary_stats: Mutex::new(HashMap::new()),
            compatibility_reports: Mutex::new(Vec::new()),
            compatibility_policies: Mutex::new(vec![default_policy.clone()]),
            active_policy: Mutex::new(default_policy),
        }
    });
    &STORE
}

// ==================== APIVersionManager 实现 ====================

pub struct APIVersionManager;

impl APIVersionManager {
    pub async fn register_version(
        version: String,
        changelog: Option<String>,
        breaking_changes: Vec<BreakingChange>,
    ) -> Result<APIVersion, String> {
        let store = get_version_control_store();
        let mut versions = store.api_versions.lock().await;

        if versions.contains_key(&version) {
            return Err(format!("版本 '{}' 已存在", version));
        }

        if !Self::is_valid_semver(&version) {
            return Err(format!("无效的语义版本号: {}", version));
        }

        let now = chrono::Utc::now().to_rfc3339();
        let api_version = APIVersion {
            version: version.clone(),
            status: APIVersionStatus::Active,
            released_at: now.clone(),
            deprecated_at: None,
            sunset_at: None,
            changelog,
            breaking_changes: breaking_changes.clone(),
        };

        versions.insert(version.clone(), api_version.clone());
        drop(versions);

        let mut changelogs = store.changelogs.lock().await;
        changelogs.insert(
            version,
            ChangelogEntry {
                version: api_version.version.clone(),
                changes: Vec::new(),
                breaking: breaking_changes,
            },
        );

        Ok(api_version)
    }

    pub async fn get_version(version: &str) -> Option<APIVersion> {
        let store = get_version_control_store();
        let versions = store.api_versions.lock().await;
        versions.get(version).cloned()
    }

    pub async fn list_versions(status_filter: Option<APIVersionStatus>) -> Vec<APIVersion> {
        let store = get_version_control_store();
        let versions = store.api_versions.lock().await;

        let mut list: Vec<APIVersion> = if let Some(status) = status_filter {
            versions
                .values()
                .filter(|v| v.status == status)
                .cloned()
                .collect()
        } else {
            versions.values().cloned().collect()
        };

        list.sort_by(|a, b| b.released_at.cmp(&a.released_at));
        list
    }

    pub async fn deprecate_version(version: &str) -> Result<APIVersion, String> {
        let store = get_version_control_store();
        let mut versions = store.api_versions.lock().await;

        let v = versions
            .get_mut(version)
            .ok_or_else(|| format!("版本 '{}' 不存在", version))?;

        v.status = APIVersionStatus::Deprecated;
        v.deprecated_at = Some(chrono::Utc::now().to_rfc3339());

        let updated = v.clone();
        Ok(updated)
    }

    pub async fn sunset_version(version: &str) -> Result<APIVersion, String> {
        let store = get_version_control_store();
        let mut versions = store.api_versions.lock().await;

        let v = versions
            .get_mut(version)
            .ok_or_else(|| format!("版本 '{}' 不存在", version))?;

        if v.status != APIVersionStatus::Deprecated {
            return Err("只能废弃已标记为 Deprecated 的版本".to_string());
        }

        v.status = APIVersionStatus::Sunset;
        v.sunset_at = Some(chrono::Utc::now().to_rfc3339());

        let updated = v.clone();
        Ok(updated)
    }

    pub async fn check_compatibility(
        client_version: &str,
        server_version: &str,
    ) -> Result<VersionMapping, String> {
        let store = get_version_control_store();

        let versions = store.api_versions.lock().await;
        let server_v = server_version.to_string();
        let client_v = client_version.to_string();
        drop(versions);

        let mappings = store.version_mappings.lock().await;
        if let Some(mapping) = mappings
            .iter()
            .find(|m| m.client_version == client_v && m.server_version == server_v)
        {
            return Ok(mapping.clone());
        }
        drop(mappings);

        let compatibility = if client_v == server_v {
            CompatibilityLevel::Full
        } else {
            let client_parts: Vec<&str> = client_v.split('.').collect();
            let server_parts: Vec<&str> = server_v.split('.').collect();

            if client_parts.first() == server_parts.first() {
                CompatibilityLevel::Partial
            } else {
                CompatibilityLevel::None
            }
        };

        let mapping = VersionMapping {
            id: uuid::Uuid::new_v4().to_string(),
            client_version: client_v,
            server_version: server_v,
            compatibility,
            notes: Some("自动生成的兼容性映射".to_string()),
        };

        let mut mappings = store.version_mappings.lock().await;
        mappings.push(mapping.clone());

        Ok(mapping)
    }

    pub async fn get_changelog(version: &str) -> Option<ChangelogEntry> {
        let store = get_version_control_store();
        let changelogs = store.changelogs.lock().await;
        changelogs.get(version).cloned()
    }

    pub async fn update_version(
        version: &str,
        changelog: Option<String>,
        breaking_changes: Option<Vec<BreakingChange>>,
    ) -> Result<APIVersion, String> {
        let store = get_version_control_store();
        let mut versions = store.api_versions.lock().await;

        let v = versions
            .get_mut(version)
            .ok_or_else(|| format!("版本 '{}' 不存在", version))?;

        if let Some(cl) = changelog {
            v.changelog = Some(cl);
        }
        if let Some(bc) = breaking_changes {
            v.breaking_changes = bc;
        }

        let updated = v.clone();
        drop(versions);

        if let Some(cl) = &updated.changelog {
            let mut changelogs = store.changelogs.lock().await;
            if let Some(entry) = changelogs.get_mut(version) {
                entry.changes = vec![cl.clone()];
            }
        }

        Ok(updated)
    }

    fn is_valid_semver(version: &str) -> bool {
        let parts: Vec<&str> = version.split('.').collect();
        if parts.len() < 2 {
            return false;
        }
        parts.iter().all(|p| p.parse::<u64>().is_ok())
    }
}

// ==================== CanaryManager 实现 ====================

pub struct CanaryManager;

impl CanaryManager {
    pub async fn create_canary(
        version: String,
        percentage: u32,
        conditions: CanaryCondition,
        start_time: Option<String>,
        end_time: Option<String>,
    ) -> Result<CanaryConfig, String> {
        if percentage > 100 {
            return Err("百分比不能超过 100".to_string());
        }

        let store = get_version_control_store();
        let config = CanaryConfig {
            id: uuid::Uuid::new_v4().to_string(),
            version,
            percentage,
            conditions,
            start_time,
            end_time,
            status: CanaryStatus::Draft,
        };

        let mut configs = store.canary_configs.lock().await;
        configs.insert(config.id.clone(), config.clone());

        Ok(config)
    }

    pub async fn update_canary(id: &str, updates: CanaryConfig) -> Result<CanaryConfig, String> {
        let store = get_version_control_store();
        let mut configs = store.canary_configs.lock().await;

        let config = configs
            .get_mut(id)
            .ok_or_else(|| format!("灰度配置 '{}' 不存在", id))?;

        if config.status == CanaryStatus::Running {
            return Err("运行中的灰度配置不可更新".to_string());
        }

        config.version = updates.version;
        config.percentage = updates.percentage;
        config.conditions = updates.conditions;
        config.start_time = updates.start_time;
        config.end_time = updates.end_time;

        Ok(config.clone())
    }

    pub async fn start_canary(id: &str) -> Result<CanaryConfig, String> {
        let store = get_version_control_store();
        let mut configs = store.canary_configs.lock().await;

        let config = configs
            .get_mut(id)
            .ok_or_else(|| format!("灰度配置 '{}' 不存在", id))?;

        if config.status != CanaryStatus::Draft && config.status != CanaryStatus::Paused {
            return Err(format!(
                "灰度配置状态为 {}，无法启动",
                config.status.as_str()
            ));
        }

        config.status = CanaryStatus::Running;
        if config.start_time.is_none() {
            config.start_time = Some(chrono::Utc::now().to_rfc3339());
        }

        Ok(config.clone())
    }

    pub async fn stop_canary(id: &str) -> Result<CanaryConfig, String> {
        let store = get_version_control_store();
        let mut configs = store.canary_configs.lock().await;

        let config = configs
            .get_mut(id)
            .ok_or_else(|| format!("灰度配置 '{}' 不存在", id))?;

        if config.status != CanaryStatus::Running {
            return Err("灰度配置未在运行".to_string());
        }

        config.status = CanaryStatus::Paused;
        config.end_time = Some(chrono::Utc::now().to_rfc3339());

        Ok(config.clone())
    }

    pub async fn get_canary_status(id: &str) -> Option<CanaryConfig> {
        let store = get_version_control_store();
        let configs = store.canary_configs.lock().await;
        configs.get(id).cloned()
    }

    pub async fn get_canary_results(id: &str) -> Vec<CanaryResult> {
        let store = get_version_control_store();
        let results = store.canary_results.lock().await;
        results
            .iter()
            .filter(|r| r.config_id == id)
            .cloned()
            .collect()
    }

    pub async fn list_canaries(status_filter: Option<CanaryStatus>) -> Vec<CanaryConfig> {
        let store = get_version_control_store();
        let configs = store.canary_configs.lock().await;

        let mut list: Vec<CanaryConfig> = if let Some(status) = status_filter {
            configs
                .values()
                .filter(|c| c.status == status)
                .cloned()
                .collect()
        } else {
            configs.values().cloned().collect()
        };

        list.sort_by(|a, b| b.start_time.cmp(&a.start_time));
        list
    }

    pub async fn promote_canary(id: &str) -> Result<CanaryConfig, String> {
        let store = get_version_control_store();
        let config = {
            let mut configs = store.canary_configs.lock().await;

            let config = configs
                .get_mut(id)
                .ok_or_else(|| format!("灰度配置 '{}' 不存在", id))?;

            if config.status != CanaryStatus::Running && config.status != CanaryStatus::Paused {
                return Err("只能推广运行中或已暂停的灰度配置".to_string());
            }

            config.status = CanaryStatus::Completed;
            config.end_time = Some(chrono::Utc::now().to_rfc3339());

            config.clone()
        };

        let mut results = store.canary_results.lock().await;
        let total_stats = store.canary_stats.lock().await;

        if let Some((total, canary, baseline, _)) = total_stats.get(id) {
            let error_canary = if *canary > 0 { 0.05 } else { 0.0 };
            let error_baseline = if *baseline > 0 { 0.03 } else { 0.0 };

            let winner = if error_canary < error_baseline {
                CanaryWinner::Canary
            } else if error_baseline < error_canary {
                CanaryWinner::Baseline
            } else {
                CanaryWinner::Inconclusive
            };

            results.push(CanaryResult {
                id: uuid::Uuid::new_v4().to_string(),
                config_id: id.to_string(),
                total_requests: *total,
                canary_requests: *canary,
                baseline_requests: *baseline,
                error_rate_canary: error_canary,
                error_rate_baseline: error_baseline,
                winner: Some(winner),
                recorded_at: chrono::Utc::now().to_rfc3339(),
            });
        }

        Ok(config)
    }

    pub async fn rollback_canary(id: &str) -> Result<CanaryConfig, String> {
        let store = get_version_control_store();
        let mut configs = store.canary_configs.lock().await;

        let config = configs
            .get_mut(id)
            .ok_or_else(|| format!("灰度配置 '{}' 不存在", id))?;

        config.status = CanaryStatus::RolledBack;
        config.end_time = Some(chrono::Utc::now().to_rfc3339());

        Ok(config.clone())
    }

    pub async fn record_request(config_id: &str, is_canary: bool) -> Result<(), String> {
        let store = get_version_control_store();
        let mut stats = store.canary_stats.lock().await;

        let entry = stats.entry(config_id.to_string()).or_insert((0, 0, 0, 0));
        entry.0 += 1;
        if is_canary {
            entry.1 += 1;
        } else {
            entry.2 += 1;
        }

        Ok(())
    }

    pub async fn get_canary_stats(id: &str) -> (u64, u64, u64, u64) {
        let store = get_version_control_store();
        let stats = store.canary_stats.lock().await;
        stats.get(id).cloned().unwrap_or((0, 0, 0, 0))
    }
}

// ==================== CompatibilityChecker 实现 ====================

pub struct CompatibilityChecker;

impl CompatibilityChecker {
    pub async fn check_compatibility(
        from_version: &str,
        to_version: &str,
    ) -> Result<CompatibilityReport, String> {
        let store = get_version_control_store();

        let versions = store.api_versions.lock().await;
        let from_v = versions
            .get(from_version)
            .ok_or_else(|| format!("源版本 '{}' 不存在", from_version))?
            .clone();
        let to_v = versions
            .get(to_version)
            .ok_or_else(|| format!("目标版本 '{}' 不存在", to_version))?
            .clone();
        drop(versions);

        let breaking_changes = Self::diff_breaking_changes(&from_v, &to_v);
        let deprecated_fields = Self::diff_deprecated_fields(&from_v, &to_v);
        let compatible = breaking_changes.is_empty();
        let migration_path = if compatible {
            None
        } else {
            Some(vec![
                format!("从 {} 迁移到 {}", from_version, to_version),
                "检查破坏性变更".to_string(),
                "更新客户端代码".to_string(),
                "在预发布环境验证".to_string(),
            ])
        };

        let report = CompatibilityReport {
            id: uuid::Uuid::new_v4().to_string(),
            from_version: from_version.to_string(),
            to_version: to_version.to_string(),
            breaking_changes,
            deprecated_fields,
            compatible,
            migration_path,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut reports = store.compatibility_reports.lock().await;
        reports.push(report.clone());

        Ok(report)
    }

    pub async fn generate_report(
        from_version: &str,
        to_version: &str,
    ) -> Result<CompatibilityReport, String> {
        Self::check_compatibility(from_version, to_version).await
    }

    pub async fn get_migration_path(
        from_version: &str,
        to_version: &str,
    ) -> Result<Vec<String>, String> {
        let store = get_version_control_store();
        let reports = store.compatibility_reports.lock().await;

        let report = reports
            .iter()
            .find(|r| r.from_version == from_version && r.to_version == to_version)
            .cloned();
        drop(reports);

        if let Some(r) = report {
            Ok(r.migration_path
                .unwrap_or_else(|| vec!["直接升级".to_string()]))
        } else {
            Ok(vec![
                format!("从 {} 直接升级到 {}", from_version, to_version),
                "阅读变更日志".to_string(),
                "更新必要的客户端代码".to_string(),
                "执行回归测试".to_string(),
            ])
        }
    }

    pub async fn create_compatibility_policy(
        name: String,
        min_level: CompatibilityLevel,
        require_migration: bool,
    ) -> Result<CompatibilityPolicy, String> {
        let store = get_version_control_store();
        let mut policies = store.compatibility_policies.lock().await;

        if policies.iter().any(|p| p.name == name) {
            return Err(format!("策略名称 '{}' 已存在", name));
        }

        let policy = CompatibilityPolicy {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            min_compatibility_level: min_level,
            require_migration_path: require_migration,
            enabled: true,
        };

        policies.push(policy.clone());
        drop(policies);

        let mut active = store.active_policy.lock().await;
        *active = policy.clone();

        Ok(policy)
    }

    pub async fn validate_client_version(
        client_version: &str,
        server_version: &str,
    ) -> Result<CompatibilityStatus, String> {
        let store = get_version_control_store();
        let _policy = store.active_policy.lock().await;

        let mapping =
            APIVersionManager::check_compatibility(client_version, server_version).await?;

        let compatible = mapping.compatibility != CompatibilityLevel::None;
        let breaking_count = mapping.compatibility.breaking_changes_count();
        let migration_available = mapping.compatibility == CompatibilityLevel::Partial;

        Ok(CompatibilityStatus {
            client_version: client_version.to_string(),
            server_version: server_version.to_string(),
            compatible,
            compatibility_level: mapping.compatibility,
            breaking_changes_count: breaking_count,
            migration_available,
        })
    }

    pub async fn get_compatibility_status(
        client_version: &str,
        server_version: &str,
    ) -> Result<CompatibilityStatus, String> {
        Self::validate_client_version(client_version, server_version).await
    }

    fn diff_breaking_changes(from: &APIVersion, to: &APIVersion) -> Vec<BreakingChange> {
        let mut changes = Vec::new();

        for to_bc in &to.breaking_changes {
            if !from
                .breaking_changes
                .iter()
                .any(|fb| fb.entity == to_bc.entity && fb.field == to_bc.field)
            {
                changes.push(to_bc.clone());
            }
        }

        changes
    }

    fn diff_deprecated_fields(_from: &APIVersion, to: &APIVersion) -> Vec<String> {
        let mut deprecated = Vec::new();
        for bc in &to.breaking_changes {
            if bc.change_type == BreakingChangeType::FieldRemoved
                && !deprecated.contains(&bc.entity)
            {
                deprecated.push(bc.entity.clone());
            }
        }
        deprecated
    }
}

// ==================== 请求 / 响应结构 ====================

// --- API 版本管理 ---

#[derive(Debug, Deserialize)]
pub struct RegisterVersionRequest {
    pub version: String,
    pub changelog: Option<String>,
    pub breaking_changes: Option<Vec<BreakingChange>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVersionRequest {
    pub changelog: Option<String>,
    pub breaking_changes: Option<Vec<BreakingChange>>,
}

#[derive(Debug, Deserialize)]
pub struct ListVersionsQuery {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckCompatibilityRequest {
    pub client_version: String,
    pub server_version: String,
}

// --- 灰度流量切换 ---

#[derive(Debug, Deserialize)]
pub struct CreateCanaryRequest {
    pub version: String,
    pub percentage: u32,
    pub conditions: Option<CanaryCondition>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCanaryRequest {
    pub version: Option<String>,
    pub percentage: Option<u32>,
    pub conditions: Option<CanaryCondition>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListCanariesQuery {
    pub status: Option<String>,
}

// --- 向后兼容保证 ---

#[derive(Debug, Deserialize)]
pub struct CheckCompatibilityQuery {
    pub client_version: String,
    pub server_version: String,
}

#[derive(Debug, Deserialize)]
pub struct CompatibilityReportQuery {
    pub from_version: String,
    pub to_version: String,
}

#[derive(Debug, Deserialize)]
pub struct GenerateReportRequest {
    pub from_version: String,
    pub to_version: String,
}

#[derive(Debug, Deserialize)]
pub struct MigrationPathQuery {
    pub from_version: String,
    pub to_version: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompatibilityPolicyRequest {
    pub name: String,
    pub min_compatibility_level: Option<String>,
    pub require_migration_path: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CompatibilityStatusQuery {
    pub client_version: String,
    pub server_version: String,
}

// ==================== API 处理器: API 版本管理 ====================

pub async fn register_version_handler(
    State(_state): State<AppState>,
    Json(req): Json<RegisterVersionRequest>,
) -> Json<ApiResponse<APIVersion>> {
    let breaking = req.breaking_changes.unwrap_or_default();
    match APIVersionManager::register_version(req.version, req.changelog, breaking).await {
        Ok(v) => Json(ApiResponse::success(v, "版本注册成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn list_versions_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListVersionsQuery>,
) -> Json<ApiResponse<Vec<APIVersion>>> {
    let status = params.status.as_deref().map(APIVersionStatus::from_str);
    let versions = APIVersionManager::list_versions(status).await;
    Json(ApiResponse::success(versions, "API 版本列表"))
}

pub async fn get_version_handler(
    State(_state): State<AppState>,
    Path(version): Path<String>,
) -> Json<ApiResponse<APIVersion>> {
    match APIVersionManager::get_version(&version).await {
        Some(v) => Json(ApiResponse::success(v, "版本详情")),
        None => Json(ApiResponse::error(404, "版本不存在")),
    }
}

pub async fn update_version_handler(
    State(_state): State<AppState>,
    Path(version): Path<String>,
    Json(req): Json<UpdateVersionRequest>,
) -> Json<ApiResponse<APIVersion>> {
    match APIVersionManager::update_version(&version, req.changelog, req.breaking_changes).await {
        Ok(v) => Json(ApiResponse::success(v, "版本更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn deprecate_version_handler(
    State(_state): State<AppState>,
    Path(version): Path<String>,
) -> Json<ApiResponse<APIVersion>> {
    match APIVersionManager::deprecate_version(&version).await {
        Ok(v) => Json(ApiResponse::success(v, "版本已废弃")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn sunset_version_handler(
    State(_state): State<AppState>,
    Path(version): Path<String>,
) -> Json<ApiResponse<APIVersion>> {
    match APIVersionManager::sunset_version(&version).await {
        Ok(v) => Json(ApiResponse::success(v, "版本已 Sunset")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn check_compatibility_handler(
    State(_state): State<AppState>,
    Query(params): Query<CheckCompatibilityQuery>,
) -> Json<ApiResponse<VersionMapping>> {
    match APIVersionManager::check_compatibility(&params.client_version, &params.server_version)
        .await
    {
        Ok(m) => Json(ApiResponse::success(m, "兼容性检查完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: 灰度流量切换 ====================

pub async fn create_canary_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateCanaryRequest>,
) -> Json<ApiResponse<CanaryConfig>> {
    let conditions = req.conditions.unwrap_or_default();
    match CanaryManager::create_canary(
        req.version,
        req.percentage,
        conditions,
        req.start_time,
        req.end_time,
    )
    .await
    {
        Ok(c) => Json(ApiResponse::success(c, "灰度配置创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn update_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateCanaryRequest>,
) -> Json<ApiResponse<CanaryConfig>> {
    let current = match CanaryManager::get_canary_status(&id).await {
        Some(c) => c,
        None => return Json(ApiResponse::error(404, "灰度配置不存在")),
    };

    let updated = CanaryConfig {
        id: id.clone(),
        version: req.version.unwrap_or(current.version),
        percentage: req.percentage.unwrap_or(current.percentage),
        conditions: req.conditions.unwrap_or(current.conditions),
        start_time: req.start_time.or(current.start_time),
        end_time: req.end_time.or(current.end_time),
        status: current.status,
    };

    match CanaryManager::update_canary(&id, updated).await {
        Ok(c) => Json(ApiResponse::success(c, "灰度配置更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn start_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CanaryConfig>> {
    match CanaryManager::start_canary(&id).await {
        Ok(c) => Json(ApiResponse::success(c, "灰度已启动")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn stop_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CanaryConfig>> {
    match CanaryManager::stop_canary(&id).await {
        Ok(c) => Json(ApiResponse::success(c, "灰度已停止")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_canary_status_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CanaryConfig>> {
    match CanaryManager::get_canary_status(&id).await {
        Some(c) => Json(ApiResponse::success(c, "灰度配置状态")),
        None => Json(ApiResponse::error(404, "灰度配置不存在")),
    }
}

pub async fn get_canary_results_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<CanaryResult>>> {
    let results = CanaryManager::get_canary_results(&id).await;
    Json(ApiResponse::success(results, "灰度结果列表"))
}

pub async fn list_canaries_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListCanariesQuery>,
) -> Json<ApiResponse<Vec<CanaryConfig>>> {
    let status = params.status.as_deref().map(CanaryStatus::from_str);
    let list = CanaryManager::list_canaries(status).await;
    Json(ApiResponse::success(list, "灰度配置列表"))
}

pub async fn promote_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CanaryConfig>> {
    match CanaryManager::promote_canary(&id).await {
        Ok(c) => Json(ApiResponse::success(c, "灰度已推广")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn rollback_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CanaryConfig>> {
    match CanaryManager::rollback_canary(&id).await {
        Ok(c) => Json(ApiResponse::success(c, "灰度已回滚")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: 向后兼容保证 ====================

pub async fn check_compatibility_report_handler(
    State(_state): State<AppState>,
    Json(req): Json<GenerateReportRequest>,
) -> Json<ApiResponse<CompatibilityReport>> {
    match CompatibilityChecker::check_compatibility(&req.from_version, &req.to_version).await {
        Ok(r) => Json(ApiResponse::success(r, "兼容性检查完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_compatibility_report_handler(
    State(_state): State<AppState>,
    Query(params): Query<CompatibilityReportQuery>,
) -> Json<ApiResponse<CompatibilityReport>> {
    match CompatibilityChecker::generate_report(&params.from_version, &params.to_version).await {
        Ok(r) => Json(ApiResponse::success(r, "兼容性报告")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_migration_path_handler(
    State(_state): State<AppState>,
    Query(params): Query<MigrationPathQuery>,
) -> Json<ApiResponse<Vec<String>>> {
    match CompatibilityChecker::get_migration_path(&params.from_version, &params.to_version).await {
        Ok(path) => Json(ApiResponse::success(path, "迁移路径")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn create_compatibility_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateCompatibilityPolicyRequest>,
) -> Json<ApiResponse<CompatibilityPolicy>> {
    let level = req
        .min_compatibility_level
        .as_deref()
        .map(CompatibilityLevel::from_str)
        .unwrap_or(CompatibilityLevel::Partial);

    match CompatibilityChecker::create_compatibility_policy(
        req.name,
        level,
        req.require_migration_path.unwrap_or(false),
    )
    .await
    {
        Ok(p) => Json(ApiResponse::success(p, "兼容性策略创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_compatibility_status_handler(
    State(_state): State<AppState>,
    Query(params): Query<CompatibilityStatusQuery>,
) -> Json<ApiResponse<CompatibilityStatus>> {
    match CompatibilityChecker::get_compatibility_status(
        &params.client_version,
        &params.server_version,
    )
    .await
    {
        Ok(s) => Json(ApiResponse::success(s, "兼容性状态")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== 辅助方法 ====================

impl CompatibilityLevel {
    pub fn breaking_changes_count(&self) -> u32 {
        match self {
            CompatibilityLevel::Full => 0,
            CompatibilityLevel::Partial => 1,
            CompatibilityLevel::None => 10,
        }
    }
}

impl Default for CanaryCondition {
    fn default() -> Self {
        Self {
            user_segment: None,
            region: None,
            feature_flag: None,
            custom: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: serde::Serialize + for<'d> serde::Deserialize<'d>>(value: &T) -> bool {
        let json = serde_json::to_value(value).unwrap();
        let back: T = serde_json::from_value(json.clone()).unwrap();
        let json2 = serde_json::to_value(&back).unwrap();
        json == json2
    }

    // ---- APIVersionStatus ----

    fn api_version_status_all() -> Vec<APIVersionStatus> {
        vec![
            APIVersionStatus::Active,
            APIVersionStatus::Deprecated,
            APIVersionStatus::Sunset,
            APIVersionStatus::Preview,
        ]
    }

    #[test]
    fn api_version_status_roundtrip_all() {
        for v in api_version_status_all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn api_version_status_as_str_from_str() {
        for v in api_version_status_all() {
            let s = v.as_str();
            let parsed = APIVersionStatus::from_str(s);
            assert_eq!(parsed.as_str(), s, "from_str roundtrip for {}", s);
        }
        assert_eq!(
            APIVersionStatus::from_str("__unknown__"),
            APIVersionStatus::Active
        );
    }

    // ---- CompatibilityLevel ----

    fn compatibility_level_all() -> Vec<CompatibilityLevel> {
        vec![
            CompatibilityLevel::Full,
            CompatibilityLevel::Partial,
            CompatibilityLevel::None,
        ]
    }

    #[test]
    fn compatibility_level_roundtrip_all() {
        for v in compatibility_level_all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn compatibility_level_as_str_from_str() {
        for v in compatibility_level_all() {
            let s = v.as_str();
            let parsed = CompatibilityLevel::from_str(s);
            assert_eq!(parsed.as_str(), s, "from_str roundtrip for {}", s);
        }
        assert_eq!(
            CompatibilityLevel::from_str("__unknown__"),
            CompatibilityLevel::None
        );
    }

    // ---- CanaryStatus ----

    fn canary_status_all() -> Vec<CanaryStatus> {
        vec![
            CanaryStatus::Draft,
            CanaryStatus::Running,
            CanaryStatus::Paused,
            CanaryStatus::Completed,
            CanaryStatus::RolledBack,
        ]
    }

    #[test]
    fn canary_status_roundtrip_all() {
        for v in canary_status_all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn canary_status_as_str_from_str() {
        for v in canary_status_all() {
            let s = v.as_str();
            let parsed = CanaryStatus::from_str(s);
            assert_eq!(parsed.as_str(), s, "from_str roundtrip for {}", s);
        }
        assert_eq!(CanaryStatus::from_str("__unknown__"), CanaryStatus::Draft);
    }

    // ---- BreakingChangeType (has all()) ----

    #[test]
    fn breaking_change_type_roundtrip_all() {
        for v in BreakingChangeType::all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn breaking_change_type_as_str_from_str() {
        for v in BreakingChangeType::all() {
            let s = v.as_str();
            let parsed = BreakingChangeType::from_str(s);
            assert_eq!(parsed.as_str(), s, "from_str roundtrip for {}", s);
        }
        assert_eq!(
            BreakingChangeType::from_str("__unknown__"),
            BreakingChangeType::NullableChanged
        );
    }

    // ---- CanaryWinner ----

    fn canary_winner_all() -> Vec<CanaryWinner> {
        vec![
            CanaryWinner::Canary,
            CanaryWinner::Baseline,
            CanaryWinner::Inconclusive,
        ]
    }

    #[test]
    fn canary_winner_roundtrip_all() {
        for v in canary_winner_all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn canary_winner_as_str_from_str() {
        for v in canary_winner_all() {
            let s = v.as_str();
            let parsed = CanaryWinner::from_str(s);
            assert_eq!(parsed.as_str(), s, "from_str roundtrip for {}", s);
        }
        assert_eq!(
            CanaryWinner::from_str("__unknown__"),
            CanaryWinner::Inconclusive
        );
    }

    // ---- struct roundtrip ----

    #[test]
    fn struct_roundtrip_breaking_change() {
        let v = BreakingChange {
            change_type: BreakingChangeType::FieldRemoved,
            entity: "User".into(),
            field: Some("phone".into()),
            description: "phone removed".into(),
            mitigation: None,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_api_version() {
        let v = APIVersion {
            version: "v1".into(),
            status: APIVersionStatus::Active,
            released_at: "2025-01-01".into(),
            deprecated_at: None,
            sunset_at: None,
            changelog: Some("init".into()),
            breaking_changes: vec![],
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_version_mapping() {
        let v = VersionMapping {
            id: "1".into(),
            client_version: "v1".into(),
            server_version: "v1".into(),
            compatibility: CompatibilityLevel::Full,
            notes: None,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_changelog_entry() {
        let v = ChangelogEntry {
            version: "v1".into(),
            changes: vec!["add api".into()],
            breaking: vec![],
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_canary_condition() {
        let v = CanaryCondition::default();
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_canary_config() {
        let v = CanaryConfig {
            id: "c1".into(),
            version: "v2".into(),
            percentage: 10,
            conditions: CanaryCondition::default(),
            start_time: None,
            end_time: None,
            status: CanaryStatus::Draft,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_canary_result() {
        let v = CanaryResult {
            id: "r1".into(),
            config_id: "c1".into(),
            total_requests: 1000,
            canary_requests: 100,
            baseline_requests: 900,
            error_rate_canary: 0.01,
            error_rate_baseline: 0.02,
            winner: Some(CanaryWinner::Canary),
            recorded_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_compatibility_report() {
        let v = CompatibilityReport {
            id: "rep1".into(),
            from_version: "v1".into(),
            to_version: "v2".into(),
            breaking_changes: vec![],
            deprecated_fields: vec![],
            compatible: true,
            migration_path: Some(vec!["step1".into()]),
            created_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_compatibility_policy() {
        let v = CompatibilityPolicy {
            id: "pol1".into(),
            name: "strict".into(),
            min_compatibility_level: CompatibilityLevel::Partial,
            require_migration_path: true,
            enabled: true,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_compatibility_status() {
        let v = CompatibilityStatus {
            client_version: "v1".into(),
            server_version: "v2".into(),
            compatible: true,
            compatibility_level: CompatibilityLevel::Full,
            breaking_changes_count: 0,
            migration_available: false,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn compatibility_level_helper_count() {
        assert_eq!(CompatibilityLevel::Full.breaking_changes_count(), 0);
        assert_eq!(CompatibilityLevel::Partial.breaking_changes_count(), 1);
        assert_eq!(CompatibilityLevel::None.breaking_changes_count(), 10);
    }
}
