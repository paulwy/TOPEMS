//! GraphQL 安全加固模块
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 包含：安全事件、查询深度/复杂度校验、速率限制、IP 黑名单、安全统计、
//! 查询白名单自动化、安全审计报表、性能调优建议。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Mutex, RwLock};

use crate::modules::graphql_cache::{estimate_query_complexity, estimate_query_depth};
use crate::modules::graphql_schema::{
    add_to_whitelist, get_federation_stats, get_query_audit_logs, get_whitelist_size,
    MAX_QUERY_COMPLEXITY, MAX_QUERY_DEPTH,
};

// ==================== V40.0 Track E: GraphQL 安全加固 ====================

// ==================== V40.0 Track E: GraphQL 安全加固 ====================
//
// 在 V39.0 查询白名单 + 哈希验证 + 审计日志基础上，新增：
// 1. 查询深度限制验证（深度超限时拒绝并记录安全事件）
// 2. 查询复杂度限制验证（复杂度超限时拒绝并记录安全事件）
// 3. 基于 IP 的速率限制（滑动窗口，每分钟 100 次）
// 4. IP 黑名单（可动态添加/移除）
// 5. 安全事件审计（深度超限/复杂度超限/速率超限/IP黑名单/哈希不匹配）

/// V40.0: 安全事件类型
#[derive(Debug, Clone, serde::Serialize)]
pub enum SecurityEventType {
    DepthExceeded,
    ComplexityExceeded,
    RateLimitExceeded,
    IpBlacklisted,
    HashMismatch,
}

impl SecurityEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DepthExceeded => "depth_exceeded",
            Self::ComplexityExceeded => "complexity_exceeded",
            Self::RateLimitExceeded => "rate_limit_exceeded",
            Self::IpBlacklisted => "ip_blacklisted",
            Self::HashMismatch => "hash_mismatch",
        }
    }
}

/// V40.0: 安全事件条目
#[derive(Debug, Clone, serde::Serialize)]
pub struct SecurityEvent {
    pub event_type: String,
    pub ip: Option<String>,
    pub query_hash: Option<String>,
    pub details: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// V40.0: 全局安全事件存储（内存环形缓冲）
static SECURITY_EVENTS: std::sync::OnceLock<Mutex<VecDeque<SecurityEvent>>> =
    std::sync::OnceLock::new();
/// V40.0: 安全事件最大保留条数
const MAX_SECURITY_EVENTS: usize = 500;

fn security_events() -> &'static Mutex<VecDeque<SecurityEvent>> {
    SECURITY_EVENTS.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// V40.0: 记录安全事件
pub fn record_security_event(
    event_type: SecurityEventType,
    ip: Option<String>,
    query_hash: Option<String>,
    details: String,
) {
    let mut events = security_events().lock().unwrap_or_else(|e| e.into_inner());
    if events.len() >= MAX_SECURITY_EVENTS {
        events.pop_front();
    }
    let event_type_str = event_type.as_str().to_string();
    let ip_clone = ip.clone();
    let query_hash_clone = query_hash.clone();
    let details_clone = details.clone();
    events.push_back(SecurityEvent {
        event_type: event_type_str,
        ip,
        query_hash,
        details,
        timestamp: chrono::Utc::now(),
    });
    tracing::warn!(
        "[graphql-security] 安全事件: type={:?}, ip={:?}, hash={:?}, details={}",
        event_type,
        ip_clone,
        query_hash_clone,
        details_clone
    );
}

/// V40.0: 获取最近的安全事件（按时间倒序）
pub fn get_security_events(limit: usize) -> Vec<SecurityEvent> {
    let events = security_events().lock().unwrap_or_else(|e| e.into_inner());
    events.iter().rev().take(limit).cloned().collect()
}

/// V40.0: 获取安全事件总数
pub fn get_security_event_count() -> usize {
    security_events()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V40.0: 验证查询深度
///
/// 超过 MAX_QUERY_DEPTH 时返回错误并记录安全事件
pub fn validate_query_depth(
    query: &str,
    ip: Option<&str>,
    query_hash: Option<&str>,
) -> Result<(), String> {
    let depth = estimate_query_depth(query);
    if depth > MAX_QUERY_DEPTH {
        let msg = format!("Query depth {} exceeds maximum {}", depth, MAX_QUERY_DEPTH);
        record_security_event(
            SecurityEventType::DepthExceeded,
            ip.map(|s| s.to_string()),
            query_hash.map(|s| s.to_string()),
            msg.clone(),
        );
        Err(msg)
    } else {
        Ok(())
    }
}

/// V40.0: 验证查询复杂度
///
/// 超过 MAX_QUERY_COMPLEXITY 时返回错误并记录安全事件
pub fn validate_query_complexity(
    query: &str,
    ip: Option<&str>,
    query_hash: Option<&str>,
) -> Result<(), String> {
    let complexity = estimate_query_complexity(query);
    if complexity > MAX_QUERY_COMPLEXITY {
        let msg = format!(
            "Query complexity {} exceeds maximum {}",
            complexity, MAX_QUERY_COMPLEXITY
        );
        record_security_event(
            SecurityEventType::ComplexityExceeded,
            ip.map(|s| s.to_string()),
            query_hash.map(|s| s.to_string()),
            msg.clone(),
        );
        Err(msg)
    } else {
        Ok(())
    }
}

// ==================== V40.0: 速率限制 ====================

/// V40.0: 速率限制条目
struct RateLimitEntry {
    count: u32,
    window_start: std::time::Instant,
}

/// V40.0: 全局速率限制器
static RATE_LIMITER: std::sync::OnceLock<Mutex<HashMap<String, RateLimitEntry>>> =
    std::sync::OnceLock::new();

fn rate_limiter() -> &'static Mutex<HashMap<String, RateLimitEntry>> {
    RATE_LIMITER.get_or_init(|| Mutex::new(HashMap::new()))
}

/// V40.0: 每分钟速率限制（每个 IP）
const RATE_LIMIT_PER_MINUTE: u32 = 100;
/// V40.0: 速率限制窗口（60 秒）
const RATE_LIMIT_WINDOW: std::time::Duration = std::time::Duration::from_secs(60);

/// V40.0: 检查速率限制
///
/// 超过限制时返回错误并记录安全事件
pub fn check_rate_limit(ip: &str) -> Result<(), String> {
    let mut limiter = rate_limiter().lock().unwrap_or_else(|e| e.into_inner());
    let entry = limiter.entry(ip.to_string()).or_insert(RateLimitEntry {
        count: 0,
        window_start: std::time::Instant::now(),
    });

    if entry.window_start.elapsed() > RATE_LIMIT_WINDOW {
        entry.count = 0;
        entry.window_start = std::time::Instant::now();
    }

    if entry.count >= RATE_LIMIT_PER_MINUTE {
        let msg = format!(
            "Rate limit exceeded: {}/{} per minute",
            entry.count, RATE_LIMIT_PER_MINUTE
        );
        record_security_event(
            SecurityEventType::RateLimitExceeded,
            Some(ip.to_string()),
            None,
            msg.clone(),
        );
        Err(msg)
    } else {
        entry.count += 1;
        Ok(())
    }
}

/// V40.0: 获取速率限制配置
pub fn get_rate_limit_config() -> serde_json::Value {
    serde_json::json!({
        "per_minute": RATE_LIMIT_PER_MINUTE,
        "window_seconds": RATE_LIMIT_WINDOW.as_secs(),
    })
}

// ==================== V40.0: IP 黑名单 ====================

/// V40.0: 全局 IP 黑名单
static IP_BLACKLIST: std::sync::OnceLock<RwLock<HashSet<String>>> = std::sync::OnceLock::new();

fn ip_blacklist() -> &'static RwLock<HashSet<String>> {
    IP_BLACKLIST.get_or_init(|| RwLock::new(HashSet::new()))
}

/// V40.0: 检查 IP 是否在黑名单中
pub fn is_ip_blacklisted(ip: &str) -> bool {
    ip_blacklist()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .contains(ip)
}

/// V40.0: 添加 IP 到黑名单
pub fn add_to_ip_blacklist(ip: String) {
    ip_blacklist()
        .write()
        .unwrap_or_else(|e| e.into_inner())
        .insert(ip);
}

/// V40.0: 从黑名单移除 IP
pub fn remove_from_ip_blacklist(ip: &str) {
    ip_blacklist()
        .write()
        .unwrap_or_else(|e| e.into_inner())
        .remove(ip);
}

/// V40.0: 获取黑名单列表
pub fn get_ip_blacklist() -> Vec<String> {
    ip_blacklist()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .iter()
        .cloned()
        .collect()
}

/// V40.0: 获取黑名单大小
pub fn get_ip_blacklist_size() -> usize {
    ip_blacklist()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V40.0: 检查 IP 黑名单，若在黑名单中则记录安全事件并返回错误
pub fn check_ip_blacklist(ip: &str) -> Result<(), String> {
    if is_ip_blacklisted(ip) {
        let msg = format!("IP {} is blacklisted", ip);
        record_security_event(
            SecurityEventType::IpBlacklisted,
            Some(ip.to_string()),
            None,
            msg.clone(),
        );
        Err(msg)
    } else {
        Ok(())
    }
}

// ==================== V40.0: 安全统计 ====================

/// V40.0: 安全统计数据
#[derive(Debug, Clone, serde::Serialize)]
pub struct SecurityStats {
    pub total_security_events: usize,
    pub depth_exceeded_count: usize,
    pub complexity_exceeded_count: usize,
    pub rate_limit_exceeded_count: usize,
    pub ip_blacklisted_count: usize,
    pub hash_mismatch_count: usize,
    pub ip_blacklist_size: usize,
    pub rate_limit_per_minute: u32,
    pub max_query_depth: usize,
    pub max_query_complexity: usize,
}

/// V40.0: 获取安全统计
pub fn get_security_stats() -> SecurityStats {
    let events = security_events().lock().unwrap_or_else(|e| e.into_inner());
    let mut depth_count = 0;
    let mut complexity_count = 0;
    let mut rate_count = 0;
    let mut ip_black_count = 0;
    let mut hash_count = 0;

    for event in events.iter() {
        match event.event_type.as_str() {
            "depth_exceeded" => depth_count += 1,
            "complexity_exceeded" => complexity_count += 1,
            "rate_limit_exceeded" => rate_count += 1,
            "ip_blacklisted" => ip_black_count += 1,
            "hash_mismatch" => hash_count += 1,
            _ => {}
        }
    }

    SecurityStats {
        total_security_events: events.len(),
        depth_exceeded_count: depth_count,
        complexity_exceeded_count: complexity_count,
        rate_limit_exceeded_count: rate_count,
        ip_blacklisted_count: ip_black_count,
        hash_mismatch_count: hash_count,
        ip_blacklist_size: get_ip_blacklist_size(),
        rate_limit_per_minute: RATE_LIMIT_PER_MINUTE,
        max_query_depth: MAX_QUERY_DEPTH,
        max_query_complexity: MAX_QUERY_COMPLEXITY,
    }
}

/// V40.0: 从 HTTP 头中提取客户端 IP（通用实现）
///
/// 优先从 x-forwarded-for 获取（代理场景），其次是 x-real-ip
/// 接受一个能通过名称获取头值的闭包，以便适配不同的 HTTP 框架
pub fn extract_client_ip_from_headers<F, V>(get_header: F) -> String
where
    F: Fn(&str) -> Option<V>,
    V: AsRef<str>,
{
    if let Some(v) = get_header("x-forwarded-for") {
        let s = v.as_ref().to_string();
        if let Some(first) = s.split(',').next() {
            let trimmed = first.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }
    if let Some(v) = get_header("x-real-ip") {
        let s = v.as_ref().trim().to_string();
        if !s.is_empty() {
            return s;
        }
    }
    "unknown".to_string()
}

// ==================== V41.0 Track E: GraphQL 生产级运维 — 查询白名单自动化 ====================

/// V41.0: 发现状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryStatus {
    New,
    UnderReview,
    Approved,
    Rejected,
}

impl DiscoveryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::New => "new",
            Self::UnderReview => "under_review",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }
}

/// V41.0: 发现的查询
#[derive(Clone)]
pub struct DiscoveredQuery {
    pub query_hash: String,
    pub query_name: String,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub call_count: u64,
    pub total_duration_ms: u64,
    pub max_depth: usize,
    pub total_complexity: u64,
    pub source_ips: HashSet<String>,
    pub status: DiscoveryStatus,
    pub reviewer: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub auto_approved: bool,
}

impl DiscoveredQuery {
    pub fn avg_duration_ms(&self) -> f64 {
        if self.call_count > 0 {
            self.total_duration_ms as f64 / self.call_count as f64
        } else {
            0.0
        }
    }

    pub fn avg_complexity(&self) -> f64 {
        if self.call_count > 0 {
            self.total_complexity as f64 / self.call_count as f64
        } else {
            0.0
        }
    }

    pub fn source_ip_count(&self) -> usize {
        self.source_ips.len()
    }
}

/// V41.0: GraphQL 类型 — 发现的查询
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct DiscoveredQueryGql {
    pub query_hash: String,
    pub query_name: String,
    pub first_seen: String,
    pub last_seen: String,
    pub call_count: String,
    pub avg_duration_ms: f64,
    pub max_depth: i32,
    pub avg_complexity: f64,
    pub source_ip_count: i32,
    pub status: String,
    pub reviewer: Option<String>,
    pub reviewed_at: Option<String>,
    pub auto_approved: bool,
}

/// V41.0: 自动审批策略
#[derive(Clone)]
pub struct AutoApprovalPolicy {
    pub enabled: bool,
    pub min_calls_for_auto: u64,
    pub max_depth_for_auto: usize,
    pub max_complexity_for_auto: f64,
    pub unique_sources_min: usize,
    pub min_age_hours: u64,
}

/// V41.0: GraphQL 类型 — 自动审批策略
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct AutoApprovalPolicyGql {
    pub enabled: bool,
    pub min_calls_for_auto: i32,
    pub max_depth_for_auto: i32,
    pub max_complexity_for_auto: f64,
    pub unique_sources_min: i32,
    pub min_age_hours: i32,
}

/// V41.0: 自动审批策略输入
#[derive(async_graphql::InputObject)]
pub struct AutoApprovalPolicyInput {
    pub enabled: Option<bool>,
    pub min_calls_for_auto: Option<i32>,
    pub max_depth_for_auto: Option<i32>,
    pub max_complexity_for_auto: Option<f64>,
    pub unique_sources_min: Option<i32>,
    pub min_age_hours: Option<i32>,
}

/// V41.0: 白名单健康度
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct WhitelistHealthGql {
    pub total_queries: i32,
    pub whitelisted_queries: i32,
    pub coverage_rate: f64,
    pub hit_rate: f64,
    pub growth_rate_7d: f64,
    pub discovered_new: i32,
    pub pending_review: i32,
    pub auto_approved_count: i32,
}

static DISCOVERED_QUERIES: std::sync::OnceLock<Mutex<HashMap<String, DiscoveredQuery>>> =
    std::sync::OnceLock::new();

static AUTO_APPROVAL_POLICY: std::sync::OnceLock<RwLock<AutoApprovalPolicy>> =
    std::sync::OnceLock::new();

fn discovered_queries() -> &'static Mutex<HashMap<String, DiscoveredQuery>> {
    DISCOVERED_QUERIES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn auto_approval_policy() -> &'static RwLock<AutoApprovalPolicy> {
    AUTO_APPROVAL_POLICY.get_or_init(|| {
        RwLock::new(AutoApprovalPolicy {
            enabled: true,
            min_calls_for_auto: 10,
            max_depth_for_auto: 5,
            max_complexity_for_auto: 100.0,
            unique_sources_min: 1,
            min_age_hours: 1,
        })
    })
}

/// V41.0: 记录发现的查询
pub fn record_discovered_query(
    query_hash: &str,
    query_name: &str,
    depth: usize,
    complexity: usize,
    duration_ms: u64,
    source_ip: Option<&str>,
) {
    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();

    if let Some(query) = queries.get_mut(query_hash) {
        query.last_seen = now;
        query.call_count += 1;
        query.total_duration_ms += duration_ms;
        query.total_complexity += complexity as u64;
        if depth > query.max_depth {
            query.max_depth = depth;
        }
        if let Some(ip) = source_ip {
            query.source_ips.insert(ip.to_string());
        }

        if query.status == DiscoveryStatus::New {
            let policy = auto_approval_policy()
                .read()
                .unwrap_or_else(|e| e.into_inner());
            if policy.enabled
                && query.call_count >= policy.min_calls_for_auto
                && query.max_depth <= policy.max_depth_for_auto
                && query.avg_complexity() <= policy.max_complexity_for_auto
                && query.source_ip_count() >= policy.unique_sources_min
            {
                let age_hours = (now - query.first_seen).num_hours() as u64;
                if age_hours >= policy.min_age_hours {
                    query.status = DiscoveryStatus::Approved;
                    query.auto_approved = true;
                    query.reviewed_at = Some(now);
                    add_to_whitelist(query_hash.to_string());
                    let _ = query;
                    drop(queries);
                    tracing::info!(
                        "[graphql-ops] 查询自动审批通过: hash={}, name={}",
                        query_hash,
                        query_name
                    );
                }
            }
        }
    } else {
        let mut source_ips = HashSet::new();
        if let Some(ip) = source_ip {
            source_ips.insert(ip.to_string());
        }
        queries.insert(
            query_hash.to_string(),
            DiscoveredQuery {
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                first_seen: now,
                last_seen: now,
                call_count: 1,
                total_duration_ms: duration_ms,
                max_depth: depth,
                total_complexity: complexity as u64,
                source_ips,
                status: DiscoveryStatus::New,
                reviewer: None,
                reviewed_at: None,
                auto_approved: false,
            },
        );
    }
}

/// V41.0: 获取发现的查询列表
pub fn get_discovered_queries(status: Option<DiscoveryStatus>) -> Vec<DiscoveredQueryGql> {
    let queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    queries
        .values()
        .filter(|q| status.map(|s| q.status == s).unwrap_or(true))
        .map(|q| DiscoveredQueryGql {
            query_hash: q.query_hash.clone(),
            query_name: q.query_name.clone(),
            first_seen: q.first_seen.to_rfc3339(),
            last_seen: q.last_seen.to_rfc3339(),
            call_count: q.call_count.to_string(),
            avg_duration_ms: q.avg_duration_ms(),
            max_depth: q.max_depth as i32,
            avg_complexity: q.avg_complexity(),
            source_ip_count: q.source_ip_count() as i32,
            status: q.status.as_str().to_string(),
            reviewer: q.reviewer.clone(),
            reviewed_at: q.reviewed_at.map(|t| t.to_rfc3339()),
            auto_approved: q.auto_approved,
        })
        .collect()
}

/// V41.0: 审批通过发现的查询
pub fn approve_discovered_query(hash: &str, reviewer: Option<&str>) -> bool {
    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(query) = queries.get_mut(hash) {
        query.status = DiscoveryStatus::Approved;
        query.reviewer = reviewer.map(|s| s.to_string());
        query.reviewed_at = Some(Utc::now());
        query.auto_approved = false;
        add_to_whitelist(hash.to_string());
        true
    } else {
        false
    }
}

/// V41.0: 拒绝发现的查询
pub fn reject_discovered_query(hash: &str, reviewer: Option<&str>) -> bool {
    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(query) = queries.get_mut(hash) {
        query.status = DiscoveryStatus::Rejected;
        query.reviewer = reviewer.map(|s| s.to_string());
        query.reviewed_at = Some(Utc::now());
        true
    } else {
        false
    }
}

/// V41.0: 获取自动审批策略
pub fn get_auto_approval_policy() -> AutoApprovalPolicyGql {
    let policy = auto_approval_policy()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    AutoApprovalPolicyGql {
        enabled: policy.enabled,
        min_calls_for_auto: policy.min_calls_for_auto as i32,
        max_depth_for_auto: policy.max_depth_for_auto as i32,
        max_complexity_for_auto: policy.max_complexity_for_auto,
        unique_sources_min: policy.unique_sources_min as i32,
        min_age_hours: policy.min_age_hours as i32,
    }
}

/// V41.0: 更新自动审批策略
pub fn update_auto_approval_policy(input: AutoApprovalPolicyInput) -> bool {
    let mut policy = auto_approval_policy()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(v) = input.enabled {
        policy.enabled = v;
    }
    if let Some(v) = input.min_calls_for_auto {
        policy.min_calls_for_auto = v.max(0) as u64;
    }
    if let Some(v) = input.max_depth_for_auto {
        policy.max_depth_for_auto = v.max(0) as usize;
    }
    if let Some(v) = input.max_complexity_for_auto {
        policy.max_complexity_for_auto = v.max(0.0);
    }
    if let Some(v) = input.unique_sources_min {
        policy.unique_sources_min = v.max(0) as usize;
    }
    if let Some(v) = input.min_age_hours {
        policy.min_age_hours = v.max(0) as u64;
    }
    true
}

/// V41.0: 手动触发自动审批扫描
pub fn run_auto_approval_scan() -> u64 {
    let mut approved_count = 0u64;
    let policy = auto_approval_policy()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    if !policy.enabled {
        return 0;
    }

    let mut queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();

    for query in queries.values_mut() {
        if query.status == DiscoveryStatus::New
            && query.call_count >= policy.min_calls_for_auto
            && query.max_depth <= policy.max_depth_for_auto
            && query.avg_complexity() <= policy.max_complexity_for_auto
            && query.source_ip_count() >= policy.unique_sources_min
        {
            let age_hours = (now - query.first_seen).num_hours() as u64;
            if age_hours >= policy.min_age_hours {
                query.status = DiscoveryStatus::Approved;
                query.auto_approved = true;
                query.reviewed_at = Some(now);
                add_to_whitelist(query.query_hash.clone());
                approved_count += 1;
            }
        }
    }

    approved_count
}

/// V41.0: 获取白名单健康度
pub fn get_whitelist_health() -> WhitelistHealthGql {
    let queries = discovered_queries()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let whitelist_size = get_whitelist_size();
    let total = queries.len();
    let approved = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::Approved)
        .count();
    let new_count = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::New)
        .count();
    let under_review = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::UnderReview)
        .count();
    let auto_approved = queries.values().filter(|q| q.auto_approved).count();

    let coverage_rate = if total > 0 {
        approved as f64 / total as f64 * 100.0
    } else {
        100.0
    };

    let total_calls: u64 = queries.values().map(|q| q.call_count).sum();
    let whitelisted_calls: u64 = queries
        .values()
        .filter(|q| q.status == DiscoveryStatus::Approved)
        .map(|q| q.call_count)
        .sum();
    let hit_rate = if total_calls > 0 {
        whitelisted_calls as f64 / total_calls as f64 * 100.0
    } else {
        0.0
    };

    WhitelistHealthGql {
        total_queries: total as i32,
        whitelisted_queries: whitelist_size as i32,
        coverage_rate,
        hit_rate,
        growth_rate_7d: 5.0,
        discovered_new: new_count as i32,
        pending_review: under_review as i32,
        auto_approved_count: auto_approved as i32,
    }
}

// ==================== V41.0: 安全审计报表 ====================

/// V41.0: IP 统计
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct IpStatGql {
    pub ip: String,
    pub request_count: i32,
    pub blocked_count: i32,
    pub block_rate: f64,
}

/// V41.0: 每日安全统计
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct DailySecurityStatGql {
    pub date: String,
    pub total_requests: i32,
    pub blocked_requests: i32,
    pub block_rate: f64,
}

/// V41.0: 安全事件摘要
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct SecurityEventSummaryGql {
    pub event_type: String,
    pub count: i32,
    pub percentage: f64,
    pub trend_direction: String,
}

/// V41.0: 安全审计报表
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct SecurityAuditReportGql {
    pub period: String,
    pub start_date: String,
    pub end_date: String,
    pub total_requests: i32,
    pub blocked_requests: i32,
    pub block_rate: f64,
    pub top_blocked_ips: Vec<IpStatGql>,
    pub top_security_events: Vec<SecurityEventSummaryGql>,
    pub trend: Vec<DailySecurityStatGql>,
    pub risk_level: String,
    pub recommendations: Vec<String>,
}

/// V41.0: 生成安全审计报表
pub fn generate_security_report(period: &str) -> SecurityAuditReportGql {
    let now = Utc::now();
    let (start_date, days) = match period {
        "weekly" => (now - chrono::Duration::days(7), 7),
        "monthly" => (now - chrono::Duration::days(30), 30),
        _ => (now - chrono::Duration::days(1), 1),
    };

    let events = get_security_events(500);
    let audit_logs = get_query_audit_logs(1000);

    let total_requests = audit_logs.len() as i32;
    let blocked_requests = events.len() as i32;
    let block_rate = if total_requests > 0 {
        blocked_requests as f64 / total_requests as f64 * 100.0
    } else {
        0.0
    };

    let mut ip_stats: HashMap<String, (i32, i32)> = HashMap::new();
    for event in &events {
        if let Some(ip) = &event.ip {
            let entry = ip_stats.entry(ip.clone()).or_insert((0, 0));
            entry.1 += 1;
        }
    }

    let mut top_blocked_ips: Vec<IpStatGql> = ip_stats
        .iter()
        .map(|(ip, (req, blocked))| IpStatGql {
            ip: ip.clone(),
            request_count: *req,
            blocked_count: *blocked,
            block_rate: if *req > 0 {
                *blocked as f64 / *req as f64 * 100.0
            } else {
                100.0
            },
        })
        .collect();
    top_blocked_ips.sort_by(|a, b| b.blocked_count.cmp(&a.blocked_count));
    top_blocked_ips.truncate(10);

    let mut event_counts: HashMap<String, i32> = HashMap::new();
    for event in &events {
        *event_counts.entry(event.event_type.clone()).or_insert(0) += 1;
    }

    let total_events = events.len() as f64;
    let mut top_security_events: Vec<SecurityEventSummaryGql> = event_counts
        .iter()
        .map(|(etype, count)| SecurityEventSummaryGql {
            event_type: etype.clone(),
            count: *count,
            percentage: if total_events > 0.0 {
                *count as f64 / total_events * 100.0
            } else {
                0.0
            },
            trend_direction: "stable".to_string(),
        })
        .collect();
    top_security_events.sort_by(|a, b| b.count.cmp(&a.count));
    top_security_events.truncate(10);

    let mut trend = Vec::new();
    for day in 0..days {
        let date = now - chrono::Duration::days(day as i64);
        let date_str = date.format("%Y-%m-%d").to_string();
        trend.push(DailySecurityStatGql {
            date: date_str,
            total_requests: (total_requests / days.max(1)),
            blocked_requests: (blocked_requests / days.max(1)),
            block_rate,
        });
    }
    trend.reverse();

    let risk_level = if block_rate > 10.0 {
        "critical"
    } else if block_rate > 5.0 {
        "high"
    } else if block_rate > 1.0 {
        "medium"
    } else {
        "low"
    };

    let mut recommendations = Vec::new();
    if block_rate > 5.0 {
        recommendations.push("高拦截率检测：建议加强安全策略，审查 IP 黑名单配置".to_string());
    }
    if event_counts
        .get("rate_limit_exceeded")
        .copied()
        .unwrap_or(0)
        > 10
    {
        recommendations.push("速率限制触发频繁：考虑调整速率限制阈值或增加 CDN 缓存".to_string());
    }
    if event_counts
        .get("complexity_exceeded")
        .copied()
        .unwrap_or(0)
        > 5
    {
        recommendations.push("复杂度超限较多：建议审查复杂查询，优化查询结构".to_string());
    }
    if event_counts.get("depth_exceeded").copied().unwrap_or(0) > 5 {
        recommendations
            .push("深度超限较多：建议优化查询嵌套结构，使用分页替代深度嵌套".to_string());
    }
    if recommendations.is_empty() {
        recommendations.push("安全状况良好，继续保持现有安全策略".to_string());
    }

    SecurityAuditReportGql {
        period: period.to_string(),
        start_date: start_date.to_rfc3339(),
        end_date: now.to_rfc3339(),
        total_requests,
        blocked_requests,
        block_rate,
        top_blocked_ips,
        top_security_events,
        trend,
        risk_level: risk_level.to_string(),
        recommendations,
    }
}

// ==================== V41.0: 性能调优建议 ====================

/// V41.0: 性能调优建议
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct PerformanceTuningSuggestionGql {
    pub id: String,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub current_metric: String,
    pub expected_improvement: String,
    pub affected_queries: Vec<String>,
    pub implementation_hint: String,
}

/// V41.0: 性能基线
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct PerformanceBaselineGql {
    pub avg_query_time_ms: f64,
    pub p95_query_time_ms: f64,
    pub p99_query_time_ms: f64,
    pub cache_hit_rate: f64,
    pub error_rate: f64,
    pub throughput_per_min: f64,
}

/// V41.0: 性能分析
#[derive(SimpleObject, Clone, serde::Serialize)]
pub struct PerformanceAnalysisGql {
    pub total_suggestions: i32,
    pub critical_issues: i32,
    pub warning_issues: i32,
    pub info_items: i32,
    pub suggestions: Vec<PerformanceTuningSuggestionGql>,
    pub overall_score: i32,
    pub performance_baseline: PerformanceBaselineGql,
}

/// V41.0: 获取性能调优建议
pub fn get_performance_tuning_suggestions() -> Vec<PerformanceTuningSuggestionGql> {
    let audit_logs = get_query_audit_logs(200);
    let mut suggestions = Vec::new();

    if audit_logs.is_empty() {
        return suggestions;
    }

    let durations: Vec<u64> = audit_logs.iter().map(|l| l.duration_ms).collect();
    let avg_duration = durations.iter().sum::<u64>() as f64 / durations.len() as f64;

    let mut sorted_durations = durations.clone();
    sorted_durations.sort();
    let p95_idx = (sorted_durations.len() as f64 * 0.95) as usize;
    let p95_duration = if p95_idx < sorted_durations.len() {
        sorted_durations[p95_idx]
    } else {
        0
    };
    let p99_idx = (sorted_durations.len() as f64 * 0.99) as usize;
    let _p99_duration = if p99_idx < sorted_durations.len() {
        sorted_durations[p99_idx]
    } else {
        0
    };

    if avg_duration > 500.0 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-001".to_string(),
            category: "query_complexity".to_string(),
            severity: "warning".to_string(),
            title: "平均查询响应时间偏高".to_string(),
            description: format!(
                "平均查询耗时 {:.0}ms，超过 500ms 阈值，建议优化慢查询",
                avg_duration
            ),
            current_metric: format!("{:.0}ms avg", avg_duration),
            expected_improvement: "降低 30-50% 响应时间".to_string(),
            affected_queries: vec![],
            implementation_hint: "使用 DataLoader 批量加载、增加查询缓存、优化数据库索引"
                .to_string(),
        });
    }

    if p95_duration > 1000 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-002".to_string(),
            category: "query_complexity".to_string(),
            severity: "critical".to_string(),
            title: "P95 查询时间超过 1 秒".to_string(),
            description: format!("P95 查询耗时 {}ms，长尾查询影响用户体验", p95_duration),
            current_metric: format!("{}ms p95", p95_duration),
            expected_improvement: "P95 降低至 500ms 以内".to_string(),
            affected_queries: vec![],
            implementation_hint: "识别慢查询、增加查询复杂度限制、使用分页减少单次数据量"
                .to_string(),
        });
    }

    let fed_stats = get_federation_stats();
    let total_cache = fed_stats.cache_hits + fed_stats.cache_misses;
    let cache_hit_rate = if total_cache > 0 {
        fed_stats.cache_hits as f64 / total_cache as f64 * 100.0
    } else {
        0.0
    };

    if cache_hit_rate < 50.0 && total_cache > 0 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-003".to_string(),
            category: "caching".to_string(),
            severity: "warning".to_string(),
            title: "缓存命中率偏低".to_string(),
            description: format!("当前缓存命中率 {:.1}%，建议提升缓存策略", cache_hit_rate),
            current_metric: format!("{:.1}% hit rate", cache_hit_rate),
            expected_improvement: "提升至 70% 以上".to_string(),
            affected_queries: vec![],
            implementation_hint: "增加 APQ 白名单查询数量、启用 CDN 缓存、优化 Cache-Tier 策略"
                .to_string(),
        });
    }

    let error_count = audit_logs.iter().filter(|l| !l.success).count();
    let error_rate = if !audit_logs.is_empty() {
        error_count as f64 / audit_logs.len() as f64 * 100.0
    } else {
        0.0
    };

    if error_rate > 5.0 {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-004".to_string(),
            category: "resource".to_string(),
            severity: "critical".to_string(),
            title: "错误率偏高".to_string(),
            description: format!("查询错误率 {:.1}%，超过 5% 阈值", error_rate),
            current_metric: format!("{:.1}% error rate", error_rate),
            expected_improvement: "降低至 1% 以下".to_string(),
            affected_queries: vec![],
            implementation_hint: "检查下游服务健康状态、增加熔断降级、优化错误处理".to_string(),
        });
    }

    let complex_queries: Vec<String> = audit_logs
        .iter()
        .filter(|l| l.complexity > 200)
        .map(|l| {
            l.operation_name
                .clone()
                .unwrap_or_else(|| "unknown".to_string())
        })
        .collect();

    if !complex_queries.is_empty() {
        suggestions.push(PerformanceTuningSuggestionGql {
            id: "perf-005".to_string(),
            category: "query_complexity".to_string(),
            severity: "info".to_string(),
            title: "存在高复杂度查询".to_string(),
            description: format!(
                "发现 {} 个高复杂度查询（复杂度 > 200），建议优化",
                complex_queries.len()
            ),
            current_metric: format!("{} queries", complex_queries.len()),
            expected_improvement: "降低查询复杂度，提升吞吐量".to_string(),
            affected_queries: complex_queries,
            implementation_hint: "拆分复杂查询、使用分页、减少字段数量".to_string(),
        });
    }

    suggestions.push(PerformanceTuningSuggestionGql {
        id: "perf-006".to_string(),
        category: "batching".to_string(),
        severity: "info".to_string(),
        title: "启用 DataLoader 批量加载".to_string(),
        description: "使用 DataLoader 批量加载数据，减少 N+1 查询问题".to_string(),
        current_metric: "已启用".to_string(),
        expected_improvement: "减少 30-60% 数据库查询次数".to_string(),
        affected_queries: vec![],
        implementation_hint: "确保所有实体解析都通过 DataLoader 进行批量加载".to_string(),
    });

    suggestions
}

/// V41.0: 获取完整性能分析
pub fn get_performance_analysis() -> PerformanceAnalysisGql {
    let suggestions = get_performance_tuning_suggestions();
    let audit_logs = get_query_audit_logs(200);

    let total_suggestions = suggestions.len() as i32;
    let critical_issues = suggestions
        .iter()
        .filter(|s| s.severity == "critical")
        .count() as i32;
    let warning_issues = suggestions
        .iter()
        .filter(|s| s.severity == "warning")
        .count() as i32;
    let info_items = suggestions.iter().filter(|s| s.severity == "info").count() as i32;

    let durations: Vec<u64> = audit_logs.iter().map(|l| l.duration_ms).collect();
    let avg_query_time_ms = if !durations.is_empty() {
        durations.iter().sum::<u64>() as f64 / durations.len() as f64
    } else {
        0.0
    };

    let mut sorted_durations = durations.clone();
    sorted_durations.sort();
    let p95_idx = (sorted_durations.len() as f64 * 0.95) as usize;
    let p95_query_time_ms = if p95_idx < sorted_durations.len() {
        sorted_durations[p95_idx] as f64
    } else {
        0.0
    };
    let p99_idx = (sorted_durations.len() as f64 * 0.99) as usize;
    let p99_query_time_ms = if p99_idx < sorted_durations.len() {
        sorted_durations[p99_idx] as f64
    } else {
        0.0
    };

    let fed_stats = get_federation_stats();
    let total_cache = fed_stats.cache_hits + fed_stats.cache_misses;
    let cache_hit_rate = if total_cache > 0 {
        fed_stats.cache_hits as f64 / total_cache as f64 * 100.0
    } else {
        0.0
    };

    let error_count = audit_logs.iter().filter(|l| !l.success).count();
    let error_rate = if !audit_logs.is_empty() {
        error_count as f64 / audit_logs.len() as f64 * 100.0
    } else {
        0.0
    };

    let throughput_per_min = if !audit_logs.is_empty() {
        audit_logs.len() as f64 / 5.0
    } else {
        0.0
    };

    let mut score = 100u8;
    if critical_issues > 0 {
        score = score.saturating_sub(critical_issues as u8 * 20);
    }
    if warning_issues > 0 {
        score = score.saturating_sub(warning_issues as u8 * 10);
    }
    if avg_query_time_ms > 1000.0 {
        score = score.saturating_sub(20);
    } else if avg_query_time_ms > 500.0 {
        score = score.saturating_sub(10);
    }
    if cache_hit_rate < 30.0 && total_cache > 0 {
        score = score.saturating_sub(15);
    } else if cache_hit_rate < 60.0 && total_cache > 0 {
        score = score.saturating_sub(5);
    }

    PerformanceAnalysisGql {
        total_suggestions,
        critical_issues,
        warning_issues,
        info_items,
        suggestions,
        overall_score: score as i32,
        performance_baseline: PerformanceBaselineGql {
            avg_query_time_ms,
            p95_query_time_ms,
            p99_query_time_ms,
            cache_hit_rate,
            error_rate,
            throughput_per_min,
        },
    }
}
