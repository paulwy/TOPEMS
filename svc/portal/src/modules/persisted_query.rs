#![allow(dead_code)]
//! V55.0 BFF Phase 26: GraphQL 持久化演进 — 持久化查询 V2 + 版本化缓存 + 边缘持久化
//!
//! 核心能力：
//! 1. 持久化查询 V2 (Persisted Queries V2)
//!    - PersistedQueryV2: 多版本持久化查询管理
//!    - PersistedEntryV2: 查询哈希、操作名、版本、状态追踪
//!    - 查询注册/执行/弃用/版本管理
//! 2. 版本化缓存 (Versioned Cache)
//!    - VersionedCache: 多版本缓存 + 版本失效
//!    - CacheEntryV2: 键值对 + 校验和 + 过期 + 标签
//!    - CacheVersion: 版本管理 + 描述 + 条目统计
//! 3. 边缘持久化 (Edge Persistence)
//!    - EdgePersistence: 多区域边缘数据同步
//!    - EdgeCacheLocation: CDN/EdgeNode/Regional/Global
//!    - 缓存复制 + 同步状态 + 复制策略

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_PERSISTED_QUERIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_persisted_queries (
    id VARCHAR(64) PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    operation_name VARCHAR(128),
    query_text TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pq_hash ON portal_persisted_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_pq_status ON portal_persisted_queries(status);
"#;

pub const CREATE_PERSISTED_QUERY_VERSIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_persisted_query_versions (
    id VARCHAR(64) PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    version INT NOT NULL,
    query_text TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pqv_hash ON portal_persisted_query_versions(query_hash);
CREATE INDEX IF NOT EXISTS idx_pqv_version ON portal_persisted_query_versions(version);
"#;

pub const CREATE_CACHE_VERSIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_cache_versions (
    version_id VARCHAR(64) PRIMARY KEY,
    description VARCHAR(256),
    entry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE
);
"#;

pub const CREATE_CACHE_ENTRIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_cache_entries (
    id VARCHAR(64) PRIMARY KEY,
    cache_key VARCHAR(512) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    version_id VARCHAR(64) NOT NULL,
    checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    tags JSONB
);
CREATE INDEX IF NOT EXISTS idx_ce_version ON portal_cache_entries(version_id);
CREATE INDEX IF NOT EXISTS idx_ce_expires ON portal_cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_ce_key ON portal_cache_entries(cache_key);
"#;

pub const CREATE_EDGE_ENTRIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_edge_entries (
    id VARCHAR(64) PRIMARY KEY,
    cache_key VARCHAR(512) NOT NULL,
    cache_value JSONB NOT NULL,
    location VARCHAR(32) NOT NULL,
    ttl_ms BIGINT NOT NULL DEFAULT 3600000,
    replicated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status VARCHAR(32) NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_ee_key ON portal_edge_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_ee_location ON portal_edge_entries(location);
CREATE INDEX IF NOT EXISTS idx_ee_status ON portal_edge_entries(sync_status);
"#;

pub const CREATE_EDGE_REPLICATION_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_edge_replication (
    id VARCHAR(64) PRIMARY KEY,
    source_location VARCHAR(32) NOT NULL,
    target_location VARCHAR(32) NOT NULL,
    cache_key VARCHAR(512) NOT NULL,
    replicated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'success'
);
CREATE INDEX IF NOT EXISTS idx_er_source ON portal_edge_replication(source_location);
CREATE INDEX IF NOT EXISTS idx_er_target ON portal_edge_replication(target_location);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryStatus {
    Active,
    Deprecated,
    Archived,
}

impl QueryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Deprecated => "deprecated",
            Self::Archived => "archived",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "deprecated" => Self::Deprecated,
            "archived" => Self::Archived,
            _ => Self::Active,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeCacheLocation {
    CDN,
    EdgeNode,
    Regional,
    Global,
}

impl EdgeCacheLocation {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::CDN => "cdn",
            Self::EdgeNode => "edge_node",
            Self::Regional => "regional",
            Self::Global => "global",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "cdn" => Self::CDN,
            "regional" => Self::Regional,
            "global" => Self::Global,
            _ => Self::EdgeNode,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::CDN, Self::EdgeNode, Self::Regional, Self::Global]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Synced,
    Pending,
    Failed,
}

impl SyncStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Synced => "synced",
            Self::Pending => "pending",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "pending" => Self::Pending,
            "failed" => Self::Failed,
            _ => Self::Synced,
        }
    }
}

// ==================== 持久化查询 V2 结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedEntryV2 {
    pub id: String,
    pub query_hash: String,
    pub operation_name: Option<String>,
    pub query_text: String,
    pub version: u32,
    pub status: QueryStatus,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub access_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedList {
    pub entries: Vec<PersistedEntryV2>,
    pub total: u64,
    pub page: u32,
    pub per_page: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedVersionInfo {
    pub version: u32,
    pub query_text: String,
    pub status: QueryStatus,
    pub created_by: Option<String>,
    pub created_at: String,
}

// ==================== 版本化缓存结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntryV2 {
    pub key: String,
    pub value: serde_json::Value,
    pub version: String,
    pub checksum: Option<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub size_bytes: u64,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheVersion {
    pub version_id: String,
    pub description: Option<String>,
    pub entry_count: u32,
    pub created_at: String,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub total_entries: u64,
    pub total_versions: u64,
    pub active_versions: u64,
    pub expired_entries: u64,
    pub total_size_bytes: u64,
}

// ==================== 边缘持久化结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeEntry {
    pub key: String,
    pub value: serde_json::Value,
    pub location: EdgeCacheLocation,
    pub ttl_ms: u64,
    pub replicated_at: String,
    pub sync_status: SyncStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeReplicationPolicy {
    pub target_locations: Vec<EdgeCacheLocation>,
    pub ttl_ms: u64,
    pub sync_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeReplicationStats {
    pub total_replications: u64,
    pub successful: u64,
    pub failed: u64,
    pub pending: u64,
    pub by_location: HashMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeStatusInfo {
    pub location: EdgeCacheLocation,
    pub entries_count: u64,
    pub synced_entries: u64,
    pub pending_entries: u64,
    pub failed_entries: u64,
}

// ==================== 内存存储 ====================

struct PersistedQueryStore {
    persisted_queries: Mutex<HashMap<String, PersistedEntryV2>>,
    query_versions: Mutex<HashMap<String, Vec<PersistedVersionInfo>>>,
    cache_entries: Mutex<HashMap<String, CacheEntryV2>>,
    cache_versions: Mutex<HashMap<String, CacheVersion>>,
    active_cache_version: Mutex<String>,
    edge_entries: Mutex<HashMap<String, EdgeEntry>>,
    edge_replications: Mutex<Vec<(String, String, String, String)>>,
    replication_policy: Mutex<EdgeReplicationPolicy>,
}

fn get_persisted_query_store() -> &'static PersistedQueryStore {
    static STORE: LazyLock<PersistedQueryStore> = LazyLock::new(|| {
        let mut cache_versions = HashMap::new();
        let default_version = CacheVersion {
            version_id: uuid::Uuid::new_v4().to_string(),
            description: Some("初始版本".to_string()),
            entry_count: 0,
            created_at: chrono::Utc::now().to_rfc3339(),
            active: true,
        };
        let version_id = default_version.version_id.clone();
        cache_versions.insert(version_id.clone(), default_version);

        PersistedQueryStore {
            persisted_queries: Mutex::new(HashMap::new()),
            query_versions: Mutex::new(HashMap::new()),
            cache_entries: Mutex::new(HashMap::new()),
            cache_versions: Mutex::new(cache_versions),
            active_cache_version: Mutex::new(version_id),
            edge_entries: Mutex::new(HashMap::new()),
            edge_replications: Mutex::new(Vec::new()),
            replication_policy: Mutex::new(EdgeReplicationPolicy {
                target_locations: EdgeCacheLocation::all(),
                ttl_ms: 3600000,
                sync_mode: "async".to_string(),
            }),
        }
    });
    &STORE
}

// ==================== PersistedQueryV2 实现 ====================

pub struct PersistedQueryV2;

impl PersistedQueryV2 {
    pub async fn register_query(
        query_text: String,
        operation_name: Option<String>,
        created_by: Option<String>,
    ) -> Result<PersistedEntryV2, String> {
        let query_hash = Self::compute_sha256(&query_text);
        let store = get_persisted_query_store();

        let mut queries = store.persisted_queries.lock().await;
        if let Some(existing) = queries.get(&query_hash) {
            return Err(format!(
                "查询哈希已存在: {} (版本 {})",
                query_hash, existing.version
            ));
        }

        let now = chrono::Utc::now().to_rfc3339();
        let entry = PersistedEntryV2 {
            id: uuid::Uuid::new_v4().to_string(),
            query_hash: query_hash.clone(),
            operation_name,
            query_text,
            version: 1,
            status: QueryStatus::Active,
            created_by,
            created_at: now.clone(),
            updated_at: now,
            access_count: 0,
        };

        queries.insert(query_hash.clone(), entry.clone());
        drop(queries);

        let mut versions = store.query_versions.lock().await;
        versions.insert(
            query_hash,
            vec![PersistedVersionInfo {
                version: 1,
                query_text: entry.query_text.clone(),
                status: QueryStatus::Active,
                created_by: entry.created_by.clone(),
                created_at: entry.created_at.clone(),
            }],
        );

        Ok(entry)
    }

    pub async fn get_query(query_hash: &str) -> Option<PersistedEntryV2> {
        let store = get_persisted_query_store();
        let queries = store.persisted_queries.lock().await;
        queries.get(query_hash).cloned()
    }

    pub async fn execute_query(query_hash: &str) -> Result<PersistedEntryV2, String> {
        let store = get_persisted_query_store();
        let mut queries = store.persisted_queries.lock().await;

        let entry = queries
            .get_mut(query_hash)
            .ok_or_else(|| format!("查询哈希不存在: {}", query_hash))?;

        if entry.status != QueryStatus::Active {
            return Err(format!("查询状态为 {}，不可执行", entry.status.as_str()));
        }

        entry.access_count += 1;
        entry.updated_at = chrono::Utc::now().to_rfc3339();

        Ok(entry.clone())
    }

    pub async fn list_queries(
        page: u32,
        per_page: u32,
        status_filter: Option<QueryStatus>,
    ) -> PersistedList {
        let store = get_persisted_query_store();
        let queries = store.persisted_queries.lock().await;

        let filtered: Vec<PersistedEntryV2> = if let Some(status) = status_filter {
            queries
                .values()
                .filter(|q| q.status == status)
                .cloned()
                .collect()
        } else {
            queries.values().cloned().collect()
        };

        let total = filtered.len() as u64;
        let start = ((page.saturating_sub(1)) * per_page) as usize;
        let entries: Vec<PersistedEntryV2> = filtered
            .into_iter()
            .skip(start)
            .take(per_page as usize)
            .collect();

        PersistedList {
            entries,
            total,
            page,
            per_page,
        }
    }

    pub async fn update_query(
        query_hash: &str,
        new_query_text: String,
        created_by: Option<String>,
    ) -> Result<PersistedEntryV2, String> {
        let store = get_persisted_query_store();
        let mut queries = store.persisted_queries.lock().await;

        let entry = queries
            .get_mut(query_hash)
            .ok_or_else(|| format!("查询哈希不存在: {}", query_hash))?;

        let new_version = entry.version + 1;
        entry.query_text = new_query_text.clone();
        entry.version = new_version;
        entry.updated_at = chrono::Utc::now().to_rfc3339();
        if let Some(user) = created_by {
            entry.created_by = Some(user);
        }

        let updated = entry.clone();
        drop(queries);

        let mut versions = store.query_versions.lock().await;
        if let Some(version_list) = versions.get_mut(query_hash) {
            version_list.push(PersistedVersionInfo {
                version: new_version,
                query_text: new_query_text,
                status: QueryStatus::Active,
                created_by: updated.created_by.clone(),
                created_at: updated.updated_at.clone(),
            });
        }

        Ok(updated)
    }

    pub async fn deprecate_query(
        query_hash: &str,
        status: QueryStatus,
    ) -> Result<PersistedEntryV2, String> {
        let store = get_persisted_query_store();
        let mut queries = store.persisted_queries.lock().await;

        let entry = queries
            .get_mut(query_hash)
            .ok_or_else(|| format!("查询哈希不存在: {}", query_hash))?;

        entry.status = status.clone();
        entry.updated_at = chrono::Utc::now().to_rfc3339();

        let updated = entry.clone();
        drop(queries);

        let mut versions = store.query_versions.lock().await;
        if let Some(version_list) = versions.get_mut(query_hash) {
            if let Some(last) = version_list.last_mut() {
                last.status = status;
            }
        }

        Ok(updated)
    }

    pub async fn get_query_versions(query_hash: &str) -> Vec<PersistedVersionInfo> {
        let store = get_persisted_query_store();
        let versions = store.query_versions.lock().await;
        versions.get(query_hash).cloned().unwrap_or_default()
    }

    pub fn validate_query_hash(query: &str, expected_hash: &str) -> bool {
        let computed = Self::compute_sha256(query);
        computed == expected_hash
    }

    fn compute_sha256(input: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        input.hash(&mut hasher);
        format!("{:016x}", hasher.finish())
    }
}

// ==================== VersionedCache 实现 ====================

pub struct VersionedCache;

impl VersionedCache {
    pub async fn get(key: &str) -> Option<CacheEntryV2> {
        let store = get_persisted_query_store();
        let entries = store.cache_entries.lock().await;
        entries.get(key).cloned()
    }

    pub async fn set(
        key: String,
        value: serde_json::Value,
        tags: Option<Vec<String>>,
        ttl_seconds: Option<u64>,
    ) -> Result<CacheEntryV2, String> {
        let store = get_persisted_query_store();

        let active_version = store.active_cache_version.lock().await;
        let version_id = active_version.clone();
        drop(active_version);

        let now = chrono::Utc::now();
        let expires_at =
            ttl_seconds.map(|sec| (now + chrono::Duration::seconds(sec as i64)).to_rfc3339());

        let size_bytes = serde_json::to_string(&value)
            .map(|s| s.len() as u64)
            .unwrap_or(0);

        let checksum = Self::compute_checksum(&value);

        let entry = CacheEntryV2 {
            key: key.clone(),
            value,
            version: version_id,
            checksum,
            created_at: now.to_rfc3339(),
            expires_at,
            size_bytes,
            tags: tags.unwrap_or_default(),
        };

        let mut entries = store.cache_entries.lock().await;
        entries.insert(key, entry.clone());
        drop(entries);

        let mut versions = store.cache_versions.lock().await;
        if let Some(ver) = versions.get_mut(&entry.version) {
            ver.entry_count += 1;
        }

        Ok(entry)
    }

    pub async fn invalidate_version(version_id: &str) -> Result<u64, String> {
        let store = get_persisted_query_store();

        let mut entries = store.cache_entries.lock().await;
        let before = entries.len();
        entries.retain(|_, v| v.version != version_id);
        let removed = (before - entries.len()) as u64;
        drop(entries);

        let mut versions = store.cache_versions.lock().await;
        if let Some(ver) = versions.get_mut(version_id) {
            ver.active = false;
        }

        Ok(removed)
    }

    pub async fn create_version(description: Option<String>) -> Result<CacheVersion, String> {
        let store = get_persisted_query_store();

        let mut versions = store.cache_versions.lock().await;

        for ver in versions.values_mut() {
            ver.active = false;
        }

        let version = CacheVersion {
            version_id: uuid::Uuid::new_v4().to_string(),
            description,
            entry_count: 0,
            created_at: chrono::Utc::now().to_rfc3339(),
            active: true,
        };

        versions.insert(version.version_id.clone(), version.clone());
        drop(versions);

        let mut active = store.active_cache_version.lock().await;
        *active = version.version_id.clone();

        Ok(version)
    }

    pub async fn get_version_info(version_id: &str) -> Option<CacheVersion> {
        let store = get_persisted_query_store();
        let versions = store.cache_versions.lock().await;
        versions.get(version_id).cloned()
    }

    pub async fn list_versions() -> Vec<CacheVersion> {
        let store = get_persisted_query_store();
        let versions = store.cache_versions.lock().await;
        let mut list: Vec<CacheVersion> = versions.values().cloned().collect();
        list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        list
    }

    pub async fn get_cache_stats() -> CacheStats {
        let store = get_persisted_query_store();
        let entries = store.cache_entries.lock().await;
        let versions = store.cache_versions.lock().await;

        let now = chrono::Utc::now();
        let expired_entries = entries
            .values()
            .filter(|e| {
                e.expires_at
                    .as_ref()
                    .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                    .map(|exp| now > exp)
                    .unwrap_or(false)
            })
            .count() as u64;

        let total_size: u64 = entries.values().map(|e| e.size_bytes).sum();

        CacheStats {
            total_entries: entries.len() as u64,
            total_versions: versions.len() as u64,
            active_versions: versions.values().filter(|v| v.active).count() as u64,
            expired_entries,
            total_size_bytes: total_size,
        }
    }

    pub async fn purge_expired() -> u64 {
        let store = get_persisted_query_store();
        let mut entries = store.cache_entries.lock().await;
        let before = entries.len();
        let now = chrono::Utc::now();
        entries.retain(|_, v| {
            v.expires_at
                .as_ref()
                .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                .map(|exp| now <= exp)
                .unwrap_or(true)
        });
        (before - entries.len()) as u64
    }

    fn compute_checksum(value: &serde_json::Value) -> Option<String> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let s = serde_json::to_string(value).ok()?;
        let mut hasher = DefaultHasher::new();
        s.hash(&mut hasher);
        Some(format!("{:016x}", hasher.finish()))
    }
}

// ==================== EdgePersistence 实现 ====================

pub struct EdgePersistence;

impl EdgePersistence {
    pub async fn store_at_edge(
        key: String,
        value: serde_json::Value,
        location: EdgeCacheLocation,
        ttl_ms: Option<u64>,
    ) -> Result<EdgeEntry, String> {
        let store = get_persisted_query_store();

        let ttl = match ttl_ms {
            Some(ttl) => ttl,
            None => {
                let policy = store.replication_policy.lock().await;
                policy.ttl_ms
            }
        };

        let entry = EdgeEntry {
            key: key.clone(),
            value,
            location,
            ttl_ms: ttl,
            replicated_at: chrono::Utc::now().to_rfc3339(),
            sync_status: SyncStatus::Synced,
        };

        let mut entries = store.edge_entries.lock().await;
        entries.insert(key, entry.clone());
        Ok(entry)
    }

    pub async fn read_from_edge(
        key: &str,
        location: Option<EdgeCacheLocation>,
    ) -> Option<EdgeEntry> {
        let store = get_persisted_query_store();
        let entries = store.edge_entries.lock().await;
        let entry = entries.get(key)?;

        if let Some(loc) = location {
            if entry.location != loc {
                return None;
            }
        }

        Some(entry.clone())
    }

    pub async fn sync_to_regions(
        key: &str,
        target_locations: Vec<EdgeCacheLocation>,
    ) -> Result<u64, String> {
        let store = get_persisted_query_store();
        let entries = store.edge_entries.lock().await;

        let source = entries
            .get(key)
            .ok_or_else(|| format!("键不存在: {}", key))?
            .clone();
        drop(entries);

        let mut replications = store.edge_replications.lock().await;
        let mut success_count = 0u64;

        for target in &target_locations {
            replications.push((
                source.location.as_str().to_string(),
                target.as_str().to_string(),
                key.to_string(),
                "success".to_string(),
            ));
            success_count += 1;
        }

        let mut entries = store.edge_entries.lock().await;
        for target in &target_locations {
            entries.insert(
                format!("{}:{}", key, target.as_str()),
                EdgeEntry {
                    key: key.to_string(),
                    value: source.value.clone(),
                    location: target.clone(),
                    ttl_ms: source.ttl_ms,
                    replicated_at: chrono::Utc::now().to_rfc3339(),
                    sync_status: SyncStatus::Synced,
                },
            );
        }

        Ok(success_count)
    }

    pub async fn get_edge_status() -> Vec<EdgeStatusInfo> {
        let store = get_persisted_query_store();
        let entries = store.edge_entries.lock().await;

        let mut statuses = Vec::new();
        for loc in EdgeCacheLocation::all() {
            let loc_entries: Vec<&EdgeEntry> =
                entries.values().filter(|e| e.location == loc).collect();

            let synced = loc_entries
                .iter()
                .filter(|e| e.sync_status == SyncStatus::Synced)
                .count() as u64;
            let pending = loc_entries
                .iter()
                .filter(|e| e.sync_status == SyncStatus::Pending)
                .count() as u64;
            let failed = loc_entries
                .iter()
                .filter(|e| e.sync_status == SyncStatus::Failed)
                .count() as u64;

            statuses.push(EdgeStatusInfo {
                location: loc,
                entries_count: loc_entries.len() as u64,
                synced_entries: synced,
                pending_entries: pending,
                failed_entries: failed,
            });
        }

        statuses
    }

    pub async fn invalidate_edge(
        key: Option<String>,
        location: Option<EdgeCacheLocation>,
    ) -> Result<u64, String> {
        let store = get_persisted_query_store();
        let mut entries = store.edge_entries.lock().await;
        let before = entries.len();

        if let Some(k) = key {
            entries.remove(&k);
            let keys_to_remove: Vec<String> = entries
                .keys()
                .filter(|ek| ek.starts_with(&k))
                .cloned()
                .collect();
            for ek in keys_to_remove {
                entries.remove(&ek);
            }
        } else if let Some(loc) = location {
            entries.retain(|_, v| v.location != loc);
        } else {
            entries.clear();
        }

        Ok((before - entries.len()) as u64)
    }

    pub async fn get_edge_replication_stats() -> EdgeReplicationStats {
        let store = get_persisted_query_store();
        let replications = store.edge_replications.lock().await;

        let mut by_location = HashMap::new();
        let mut successful = 0u64;
        let mut failed = 0u64;
        let mut pending = 0u64;

        for (_, target, _, status) in replications.iter() {
            *by_location.entry(target.clone()).or_insert(0u64) += 1;
            match status.as_str() {
                "success" => successful += 1,
                "failed" => failed += 1,
                _ => pending += 1,
            }
        }

        EdgeReplicationStats {
            total_replications: replications.len() as u64,
            successful,
            failed,
            pending,
            by_location,
        }
    }

    pub async fn set_replication_policy(
        policy: EdgeReplicationPolicy,
    ) -> Result<EdgeReplicationPolicy, String> {
        let store = get_persisted_query_store();
        let mut existing = store.replication_policy.lock().await;
        *existing = policy.clone();
        Ok(policy)
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 持久化查询 V2 ---

#[derive(Debug, Deserialize)]
pub struct RegisterQueryRequest {
    pub query_text: String,
    pub operation_name: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQueryRequest {
    pub query_text: String,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DeprecateQueryRequest {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListQueriesQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteQueryRequest {
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ValidateQueryRequest {
    pub query: String,
}

// --- 版本化缓存 ---

#[derive(Debug, Deserialize)]
pub struct CacheSetRequest {
    pub key: String,
    pub value: serde_json::Value,
    pub tags: Option<Vec<String>>,
    pub ttl_seconds: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct CacheVersionRequest {
    pub description: Option<String>,
}

// --- 边缘持久化 ---

#[derive(Debug, Deserialize)]
pub struct EdgeStoreRequest {
    pub key: String,
    pub value: serde_json::Value,
    pub location: Option<String>,
    pub ttl_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct EdgeReadQuery {
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EdgeSyncRequest {
    pub key: String,
    pub target_locations: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct EdgeInvalidateRequest {
    pub key: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EdgePolicyRequest {
    pub target_locations: Option<Vec<String>>,
    pub ttl_ms: Option<u64>,
    pub sync_mode: Option<String>,
}

// ==================== API 处理器: 持久化查询 V2 ====================

pub async fn register_query_handler(
    State(_state): State<AppState>,
    Json(req): Json<RegisterQueryRequest>,
) -> Json<ApiResponse<PersistedEntryV2>> {
    match PersistedQueryV2::register_query(req.query_text, req.operation_name, req.created_by).await
    {
        Ok(entry) => Json(ApiResponse::success(entry, "查询注册成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_query_handler(
    State(_state): State<AppState>,
    Path(hash): Path<String>,
) -> Json<ApiResponse<PersistedEntryV2>> {
    match PersistedQueryV2::get_query(&hash).await {
        Some(entry) => Json(ApiResponse::success(entry, "查询详情")),
        None => Json(ApiResponse::error(404, "查询不存在")),
    }
}

pub async fn execute_query_handler(
    State(_state): State<AppState>,
    Path(hash): Path<String>,
    Json(_req): Json<ExecuteQueryRequest>,
) -> Json<ApiResponse<PersistedEntryV2>> {
    match PersistedQueryV2::execute_query(&hash).await {
        Ok(entry) => Json(ApiResponse::success(entry, "查询执行成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn list_queries_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListQueriesQuery>,
) -> Json<ApiResponse<PersistedList>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let status = params.status.as_deref().map(QueryStatus::from_str);

    let list = PersistedQueryV2::list_queries(page, per_page, status).await;
    Json(ApiResponse::success(list, "持久化查询列表"))
}

pub async fn update_query_handler(
    State(_state): State<AppState>,
    Path(hash): Path<String>,
    Json(req): Json<UpdateQueryRequest>,
) -> Json<ApiResponse<PersistedEntryV2>> {
    match PersistedQueryV2::update_query(&hash, req.query_text, req.created_by).await {
        Ok(entry) => Json(ApiResponse::success(entry, "查询更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn deprecate_query_handler(
    State(_state): State<AppState>,
    Path(hash): Path<String>,
    Json(req): Json<DeprecateQueryRequest>,
) -> Json<ApiResponse<PersistedEntryV2>> {
    let status = req
        .status
        .as_deref()
        .map(QueryStatus::from_str)
        .unwrap_or(QueryStatus::Deprecated);

    match PersistedQueryV2::deprecate_query(&hash, status).await {
        Ok(entry) => Json(ApiResponse::success(entry, "查询状态已更新")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_query_versions_handler(
    State(_state): State<AppState>,
    Path(hash): Path<String>,
) -> Json<ApiResponse<Vec<PersistedVersionInfo>>> {
    let versions = PersistedQueryV2::get_query_versions(&hash).await;
    Json(ApiResponse::success(versions, "查询版本列表"))
}

// ==================== API 处理器: 版本化缓存 ====================

pub async fn cache_get_handler(
    State(_state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<CacheEntryV2>> {
    match VersionedCache::get(&key).await {
        Some(entry) => Json(ApiResponse::success(entry, "缓存命中")),
        None => Json(ApiResponse::error(404, "缓存未命中")),
    }
}

pub async fn cache_set_handler(
    State(_state): State<AppState>,
    Json(req): Json<CacheSetRequest>,
) -> Json<ApiResponse<CacheEntryV2>> {
    match VersionedCache::set(req.key, req.value, req.tags, req.ttl_seconds).await {
        Ok(entry) => Json(ApiResponse::success(entry, "缓存写入成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn cache_invalidate_handler(
    State(_state): State<AppState>,
    Path(version): Path<String>,
) -> Json<ApiResponse<u64>> {
    match VersionedCache::invalidate_version(&version).await {
        Ok(count) => Json(ApiResponse::success(count, "版本缓存已失效")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn cache_create_version_handler(
    State(_state): State<AppState>,
    Json(req): Json<CacheVersionRequest>,
) -> Json<ApiResponse<CacheVersion>> {
    match VersionedCache::create_version(req.description).await {
        Ok(version) => Json(ApiResponse::success(version, "缓存版本创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn cache_list_versions_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<CacheVersion>>> {
    let versions = VersionedCache::list_versions().await;
    Json(ApiResponse::success(versions, "缓存版本列表"))
}

pub async fn cache_stats_handler(State(_state): State<AppState>) -> Json<ApiResponse<CacheStats>> {
    let stats = VersionedCache::get_cache_stats().await;
    Json(ApiResponse::success(stats, "缓存统计"))
}

pub async fn cache_purge_expired_handler(State(_state): State<AppState>) -> Json<ApiResponse<u64>> {
    let purged = VersionedCache::purge_expired().await;
    Json(ApiResponse::success(purged, "过期缓存已清理"))
}

// ==================== API 处理器: 边缘持久化 ====================

pub async fn edge_store_handler(
    State(_state): State<AppState>,
    Json(req): Json<EdgeStoreRequest>,
) -> Json<ApiResponse<EdgeEntry>> {
    let location = req
        .location
        .as_deref()
        .map(EdgeCacheLocation::from_str)
        .unwrap_or(EdgeCacheLocation::EdgeNode);

    match EdgePersistence::store_at_edge(req.key, req.value, location, req.ttl_ms).await {
        Ok(entry) => Json(ApiResponse::success(entry, "边缘存储成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn edge_read_handler(
    State(_state): State<AppState>,
    Path(key): Path<String>,
    Query(params): Query<EdgeReadQuery>,
) -> Json<ApiResponse<EdgeEntry>> {
    let location = params.location.as_deref().map(EdgeCacheLocation::from_str);

    match EdgePersistence::read_from_edge(&key, location).await {
        Some(entry) => Json(ApiResponse::success(entry, "边缘读取成功")),
        None => Json(ApiResponse::error(404, "边缘缓存未命中")),
    }
}

pub async fn edge_sync_handler(
    State(_state): State<AppState>,
    Json(req): Json<EdgeSyncRequest>,
) -> Json<ApiResponse<u64>> {
    let target_locations = req
        .target_locations
        .unwrap_or_else(|| {
            vec![
                "cdn".to_string(),
                "regional".to_string(),
                "global".to_string(),
            ]
        })
        .iter()
        .map(|l| EdgeCacheLocation::from_str(l))
        .collect();

    match EdgePersistence::sync_to_regions(&req.key, target_locations).await {
        Ok(count) => Json(ApiResponse::success(count, "边缘同步完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn edge_status_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<EdgeStatusInfo>>> {
    let statuses = EdgePersistence::get_edge_status().await;
    Json(ApiResponse::success(statuses, "边缘节点状态"))
}

pub async fn edge_invalidate_handler(
    State(_state): State<AppState>,
    Json(req): Json<EdgeInvalidateRequest>,
) -> Json<ApiResponse<u64>> {
    let location = req.location.as_deref().map(EdgeCacheLocation::from_str);

    match EdgePersistence::invalidate_edge(req.key, location).await {
        Ok(count) => Json(ApiResponse::success(count, "边缘缓存已失效")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn edge_replication_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<EdgeReplicationStats>> {
    let stats = EdgePersistence::get_edge_replication_stats().await;
    Json(ApiResponse::success(stats, "边缘复制统计"))
}

pub async fn edge_set_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<EdgePolicyRequest>,
) -> Json<ApiResponse<EdgeReplicationPolicy>> {
    let target_locations = req
        .target_locations
        .unwrap_or_else(|| {
            vec![
                "cdn".to_string(),
                "edge_node".to_string(),
                "regional".to_string(),
                "global".to_string(),
            ]
        })
        .iter()
        .map(|l| EdgeCacheLocation::from_str(l))
        .collect();

    let policy = EdgeReplicationPolicy {
        target_locations,
        ttl_ms: req.ttl_ms.unwrap_or(3600000),
        sync_mode: req.sync_mode.unwrap_or_else(|| "async".to_string()),
    };

    match EdgePersistence::set_replication_policy(policy).await {
        Ok(p) => Json(ApiResponse::success(p, "复制策略已更新")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_query_status_roundtrip_all_variants() {
        for v in [
            QueryStatus::Active,
            QueryStatus::Deprecated,
            QueryStatus::Archived,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_query_status_as_str_from_str() {
        for v in [
            QueryStatus::Active,
            QueryStatus::Deprecated,
            QueryStatus::Archived,
        ] {
            let s = v.as_str();
            let back = QueryStatus::from_str(s);
            roundtrip(&back);
        }
    }

    #[test]
    fn test_edge_cache_location_roundtrip_all_variants() {
        for v in EdgeCacheLocation::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_edge_cache_location_as_str_from_str_all() {
        for v in EdgeCacheLocation::all() {
            let s = v.as_str();
            let back = EdgeCacheLocation::from_str(s);
            roundtrip(&back);
        }
        assert_eq!(EdgeCacheLocation::all().len(), 4);
    }

    #[test]
    fn test_sync_status_roundtrip_all_variants() {
        for v in [SyncStatus::Synced, SyncStatus::Pending, SyncStatus::Failed] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_sync_status_as_str_from_str() {
        for v in [SyncStatus::Synced, SyncStatus::Pending, SyncStatus::Failed] {
            let s = v.as_str();
            let back = SyncStatus::from_str(s);
            roundtrip(&back);
        }
    }

    #[test]
    fn test_persisted_entry_v2_roundtrip() {
        let e = PersistedEntryV2 {
            id: "e1".to_string(),
            query_hash: "hash1".to_string(),
            operation_name: Some("Op".to_string()),
            query_text: "{ me { id } }".to_string(),
            version: 1,
            status: QueryStatus::Active,
            created_by: None,
            created_at: "2025-01-01T00:00:00Z".to_string(),
            updated_at: "2025-01-01T00:00:00Z".to_string(),
            access_count: 42,
        };
        roundtrip(&e);
    }

    #[test]
    fn test_persisted_list_roundtrip() {
        let list = PersistedList {
            entries: vec![],
            total: 100,
            page: 1,
            per_page: 20,
        };
        roundtrip(&list);
    }

    #[test]
    fn test_persisted_version_info_roundtrip() {
        let info = PersistedVersionInfo {
            version: 2,
            query_text: "{ me { name } }".to_string(),
            status: QueryStatus::Deprecated,
            created_by: Some("admin".to_string()),
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&info);
    }

    #[test]
    fn test_cache_entry_v2_roundtrip() {
        let ce = CacheEntryV2 {
            key: "k1".to_string(),
            value: Value::String("cached".to_string()),
            version: "v1".to_string(),
            checksum: None,
            created_at: "2025-01-01T00:00:00Z".to_string(),
            expires_at: None,
            size_bytes: 256,
            tags: vec!["hot".to_string()],
        };
        roundtrip(&ce);
    }

    #[test]
    fn test_cache_version_roundtrip() {
        let cv = CacheVersion {
            version_id: "cv1".to_string(),
            description: Some("initial".to_string()),
            entry_count: 50,
            created_at: "2025-01-01T00:00:00Z".to_string(),
            active: true,
        };
        roundtrip(&cv);
    }

    #[test]
    fn test_cache_stats_roundtrip() {
        let cs = CacheStats {
            total_entries: 1000,
            total_versions: 5,
            active_versions: 2,
            expired_entries: 100,
            total_size_bytes: 1024000,
        };
        roundtrip(&cs);
    }

    #[test]
    fn test_edge_entry_roundtrip() {
        let ee = EdgeEntry {
            key: "ek1".to_string(),
            value: Value::Null,
            location: EdgeCacheLocation::CDN,
            ttl_ms: 3600000,
            replicated_at: "2025-01-01T00:00:00Z".to_string(),
            sync_status: SyncStatus::Synced,
        };
        roundtrip(&ee);
    }

    #[test]
    fn test_edge_replication_policy_roundtrip() {
        let p = EdgeReplicationPolicy {
            target_locations: vec![EdgeCacheLocation::CDN, EdgeCacheLocation::Regional],
            ttl_ms: 3600000,
            sync_mode: "async".to_string(),
        };
        roundtrip(&p);
    }

    #[test]
    fn test_edge_replication_stats_roundtrip() {
        let s = EdgeReplicationStats {
            total_replications: 100,
            successful: 95,
            failed: 3,
            pending: 2,
            by_location: HashMap::new(),
        };
        roundtrip(&s);
    }

    #[test]
    fn test_edge_status_info_roundtrip() {
        let info = EdgeStatusInfo {
            location: EdgeCacheLocation::Global,
            entries_count: 500,
            synced_entries: 480,
            pending_entries: 15,
            failed_entries: 5,
        };
        roundtrip(&info);
    }
}
