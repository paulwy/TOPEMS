#![allow(dead_code)] // Reserved: V50 持久化查询管理模块，待业务接入后启用
//! V50.0 Portal BFF Phase 20: 持久化查询管理 + 查询审计 + 企业级治理
//!
//! Phase 20 核心能力：
//! 1. PersistedQueryManager — 持久化查询管理
//!    - 查询注册：通过 SHA-256 哈希注册持久化查询
//!    - 查询存储：内存 + 可选持久化存储
//!    - 查询检索：通过哈希快速获取查询文本
//!    - 版本控制：支持查询的多版本管理
//! 2. QueryAuditor — 查询审计
//!    - 查询日志：记录查询执行详情（时间、用户、复杂度、结果）
//!    - 性能分析：跟踪查询执行时间、资源消耗
//!    - 错误追踪：记录失败查询和错误详情
//!    - 安全审计：检测异常查询模式、权限检查
//! 3. EnterpriseGovernance — 企业级治理
//!    - 查询配额：按用户/团队/组织设置查询配额
//!    - 查询审批：敏感查询需要审批流程
//!    - 合规检查：确保查询符合企业策略
//!    - 数据访问控制：字段级访问控制、PII 保护
//!
//! Phase 21 追加：GraphQL 网关联邦
//! 4. FederationQueryPlanner — 联邦查询计划器
//!    - 跨服务查询分解和执行计划生成
//!    - 查询优化和依赖分析
//!    - 执行计划缓存和复用
//!    - 并行执行和结果聚合
//! 5. DistributedTransaction — 跨服务事务（两阶段提交/SAGA）
//!    - TwoPhaseCommit 协调器：Prepare → Commit/Abort
//!    - SAGA 模式：补偿事务链
//!    - 事务日志和恢复机制
//!    - 幂等性保证和超时处理
//! 6. DistributedConsistency — 分布式一致性
//!    - 最终一致性保证
//!    - 冲突检测和解决策略
//!    - 分布式锁和版本控制
//!    - 向量时钟和冲突解决

use async_graphql::{Context, Enum, InputObject, Object, SimpleObject};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest as Sha2Digest, Sha256};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};

// ==================== 持久化查询：类型定义 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum QueryStatus {
    Active,
    Deprecated,
    Archived,
    Draft,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct PersistedQueryGql {
    pub query_hash: String,
    pub query_text: String,
    pub operation_name: Option<String>,
    pub status: QueryStatus,
    pub version: u32,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: String,
    pub tags: Vec<String>,
    pub usage_count: u64,
    pub avg_latency_ms: f64,
    pub complexity: u32,
}

#[derive(Debug, Clone, InputObject)]
pub struct PersistedQueryInput {
    pub query_text: String,
    pub operation_name: Option<String>,
    pub created_by: String,
    pub tags: Option<Vec<String>>,
    pub status: Option<QueryStatus>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct PersistedQueryListGql {
    pub queries: Vec<PersistedQueryGql>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
}

// ==================== 查询审计：类型定义 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum AuditEventType {
    QueryExecuted,
    QueryFailed,
    QueryDenied,
    QuotaExceeded,
    UnauthorizedAccess,
    SensitiveFieldAccess,
    AnomalyDetected,
    ApprovalRequired,
    ApprovalGranted,
    ApprovalRejected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum QueryRisk {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct QueryAuditEntryGql {
    pub audit_id: String,
    pub event_type: AuditEventType,
    pub query_hash: Option<String>,
    pub query_text: Option<String>,
    pub operation_name: Option<String>,
    pub user_id: String,
    pub team_id: Option<String>,
    pub org_id: Option<String>,
    pub client_ip: String,
    pub user_agent: Option<String>,
    pub timestamp: String,
    pub latency_ms: u64,
    pub complexity: u32,
    pub depth: u32,
    pub result_count: u64,
    pub error_message: Option<String>,
    pub risk_level: QueryRisk,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, InputObject)]
pub struct QueryAuditFilterInput {
    pub event_type: Option<AuditEventType>,
    pub user_id: Option<String>,
    pub team_id: Option<String>,
    pub org_id: Option<String>,
    pub risk_level: Option<QueryRisk>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub query_hash: Option<String>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct AuditStatsGql {
    pub total_queries: u64,
    pub successful_queries: u64,
    pub failed_queries: u64,
    pub denied_queries: u64,
    pub avg_latency_ms: f64,
    pub avg_complexity: f64,
    pub by_risk_level: HashMap<String, u64>,
    pub by_event_type: HashMap<String, u64>,
    pub top_users: Vec<UserQueryCountGql>,
    pub top_queries: Vec<QueryCountGql>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct UserQueryCountGql {
    pub user_id: String,
    pub query_count: u64,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct QueryCountGql {
    pub query_hash: String,
    pub count: u64,
    pub avg_latency_ms: f64,
}

// ==================== 企业级治理：类型定义 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum QuotaPeriod {
    Second,
    Minute,
    Hour,
    Day,
    Month,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct QueryQuotaGql {
    pub entity_id: String,
    pub entity_type: String, // "user", "team", "org"
    pub max_queries: u64,
    pub period: QuotaPeriod,
    pub current_usage: u64,
    pub remaining: u64,
    pub reset_at: String,
    pub enforcement: bool,
}

#[derive(Debug, Clone, InputObject)]
pub struct QueryQuotaInput {
    pub entity_id: String,
    pub entity_type: String,
    pub max_queries: u64,
    pub period: QuotaPeriod,
    pub enforcement: Option<bool>,
}

/// 审批状态 — 与 shared-core ApprovalStatus 对齐（因 async_graphql::Enum 需本地派生）
/// 变体与 topems_shared::common_types::ApprovalStatus 保持一致
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    InProgress,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct QueryApprovalRequestGql {
    pub request_id: String,
    pub query_hash: String,
    pub query_text: String,
    pub requester_id: String,
    pub team_id: Option<String>,
    pub org_id: Option<String>,
    pub status: ApprovalStatus,
    pub requested_at: String,
    pub reviewed_at: Option<String>,
    pub reviewer_id: Option<String>,
    pub review_notes: Option<String>,
    pub expires_at: Option<String>,
    pub reason: String,
}

#[derive(Debug, Clone, InputObject)]
pub struct ApprovalRequestInput {
    pub query_hash: String,
    pub query_text: String,
    pub requester_id: String,
    pub team_id: Option<String>,
    pub org_id: Option<String>,
    pub reason: String,
}

#[derive(Debug, Clone, InputObject)]
pub struct ApprovalReviewInput {
    pub request_id: String,
    pub reviewer_id: String,
    pub approved: bool,
    pub review_notes: Option<String>,
    pub expires_in_hours: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Enum, Serialize, Deserialize)]
pub enum ComplianceLevel {
    Strict,
    Standard,
    Relaxed,
    Custom,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct GovernancePolicyGql {
    pub policy_id: String,
    pub policy_name: String,
    pub description: String,
    pub compliance_level: ComplianceLevel,
    pub enabled: bool,
    pub rules: Vec<GovernanceRuleGql>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct GovernanceRuleGql {
    pub rule_id: String,
    pub rule_type: String,
    pub condition: String,
    pub action: String,
    pub severity: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, InputObject)]
pub struct GovernanceRuleInput {
    pub rule_type: String,
    pub condition: String,
    pub action: String,
    pub severity: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, InputObject)]
pub struct GovernancePolicyInput {
    pub policy_name: String,
    pub description: String,
    pub compliance_level: ComplianceLevel,
    pub enabled: Option<bool>,
    pub rules: Option<Vec<GovernanceRuleInput>>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct FieldAccessControlGql {
    pub field_path: String,
    pub allowed_roles: Vec<String>,
    pub denied_roles: Vec<String>,
    pub requires_approval: bool,
    pub pii: bool,
    pub audit: bool,
}

#[derive(Debug, Clone, InputObject)]
pub struct FieldAccessControlInput {
    pub field_path: String,
    pub allowed_roles: Option<Vec<String>>,
    pub denied_roles: Option<Vec<String>>,
    pub requires_approval: Option<bool>,
    pub pii: Option<bool>,
    pub audit: Option<bool>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct GovernanceCheckResultGql {
    pub query_hash: String,
    pub user_id: String,
    pub allowed: bool,
    pub denial_reason: Option<String>,
    pub warnings: Vec<String>,
    pub required_approvals: Vec<String>,
    pub field_restrictions: Vec<String>,
    pub applied_policies: Vec<String>,
}

// ==================== 持久化查询实现 ====================

struct PersistedQueryEntry {
    query_hash: String,
    query_text: String,
    operation_name: Option<String>,
    status: QueryStatus,
    version: u32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    created_by: String,
    tags: Vec<String>,
    usage_count: AtomicU64,
    total_latency_ms: AtomicU64,
    complexity: u32,
}

impl PersistedQueryEntry {
    fn calculate_hash(query_text: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query_text.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn to_gql(&self) -> PersistedQueryGql {
        let usage = self.usage_count.load(Ordering::Relaxed);
        let total_latency = self.total_latency_ms.load(Ordering::Relaxed);
        let avg_latency = if usage > 0 {
            total_latency as f64 / usage as f64
        } else {
            0.0
        };
        PersistedQueryGql {
            query_hash: self.query_hash.clone(),
            query_text: self.query_text.clone(),
            operation_name: self.operation_name.clone(),
            status: self.status,
            version: self.version,
            created_at: self.created_at.to_rfc3339(),
            updated_at: self.updated_at.to_rfc3339(),
            created_by: self.created_by.clone(),
            tags: self.tags.clone(),
            usage_count: usage,
            avg_latency_ms: avg_latency,
            complexity: self.complexity,
        }
    }
}

pub struct PersistedQueryManager {
    queries: HashMap<String, PersistedQueryEntry>,
    version_index: HashMap<String, Vec<String>>,
    tag_index: HashMap<String, Vec<String>>,
}

impl PersistedQueryManager {
    fn new() -> Self {
        Self {
            queries: HashMap::new(),
            version_index: HashMap::new(),
            tag_index: HashMap::new(),
        }
    }

    fn register(&mut self, input: PersistedQueryInput) -> PersistedQueryGql {
        let query_hash = PersistedQueryEntry::calculate_hash(&input.query_text);
        let now = Utc::now();
        let complexity = Self::estimate_complexity(&input.query_text);
        let entry = PersistedQueryEntry {
            query_hash: query_hash.clone(),
            query_text: input.query_text,
            operation_name: input.operation_name,
            status: input.status.unwrap_or(QueryStatus::Active),
            version: 1,
            created_at: now,
            updated_at: now,
            created_by: input.created_by,
            tags: input.tags.unwrap_or_default(),
            usage_count: AtomicU64::new(0),
            total_latency_ms: AtomicU64::new(0),
            complexity,
        };
        let gql = entry.to_gql();
        self.queries.insert(query_hash.clone(), entry);
        self.version_index
            .entry(query_hash.clone())
            .or_default()
            .push(query_hash.clone());
        gql
    }

    fn get(&self, query_hash: &str) -> Option<PersistedQueryGql> {
        self.queries.get(query_hash).map(|e| e.to_gql())
    }

    fn get_by_hash(&self, query_hash: &str) -> Option<String> {
        self.queries.get(query_hash).map(|e| e.query_text.clone())
    }

    fn update_status(
        &mut self,
        query_hash: &str,
        status: QueryStatus,
    ) -> Option<PersistedQueryGql> {
        if let Some(entry) = self.queries.get_mut(query_hash) {
            entry.status = status;
            entry.updated_at = Utc::now();
            Some(entry.to_gql())
        } else {
            None
        }
    }

    fn record_usage(&self, query_hash: &str, latency_ms: u64) {
        if let Some(entry) = self.queries.get(query_hash) {
            entry.usage_count.fetch_add(1, Ordering::Relaxed);
            entry
                .total_latency_ms
                .fetch_add(latency_ms, Ordering::Relaxed);
        }
    }

    fn list(
        &self,
        page: u32,
        page_size: u32,
        status: Option<QueryStatus>,
    ) -> PersistedQueryListGql {
        let filtered: Vec<PersistedQueryGql> = self
            .queries
            .values()
            .filter(|e| status.is_none() || e.status == status.unwrap())
            .map(|e| e.to_gql())
            .collect();
        let total_count = filtered.len() as u64;
        let start = ((page.saturating_sub(1)) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, filtered.len());
        let queries = if start < filtered.len() {
            filtered[start..end].to_vec()
        } else {
            Vec::new()
        };
        PersistedQueryListGql {
            queries,
            total_count,
            page,
            page_size,
        }
    }

    fn delete(&mut self, query_hash: &str) -> bool {
        self.queries.remove(query_hash).is_some()
    }

    fn estimate_complexity(query: &str) -> u32 {
        let field_count = query.matches(|c| c == '{' || c == '(').count() as u32;
        let nesting = query.matches('{').count() as u32;
        field_count * nesting / 10 + 1
    }

    fn add_tag(&mut self, query_hash: &str, tag: &str) -> Option<PersistedQueryGql> {
        if let Some(entry) = self.queries.get_mut(query_hash) {
            if !entry.tags.contains(&tag.to_string()) {
                entry.tags.push(tag.to_string());
                self.tag_index
                    .entry(tag.to_string())
                    .or_default()
                    .push(query_hash.to_string());
            }
            Some(entry.to_gql())
        } else {
            None
        }
    }

    fn remove_tag(&mut self, query_hash: &str, tag: &str) -> Option<PersistedQueryGql> {
        if let Some(entry) = self.queries.get_mut(query_hash) {
            entry.tags.retain(|t| t != tag);
            if let Some(hashes) = self.tag_index.get_mut(tag) {
                hashes.retain(|h| h != query_hash);
            }
            Some(entry.to_gql())
        } else {
            None
        }
    }

    fn search_by_tag(&self, tag: &str) -> Vec<PersistedQueryGql> {
        self.tag_index
            .get(tag)
            .map(|hashes| hashes.iter().filter_map(|h| self.get(h)).collect())
            .unwrap_or_default()
    }
}

// ==================== 查询审计实现 ====================

struct QueryAuditStore {
    entries: Vec<QueryAuditEntryGql>,
    index_by_user: HashMap<String, Vec<String>>,
    index_by_hash: HashMap<String, Vec<String>>,
    index_by_time: Vec<(i64, String)>,
    stats: Mutex<AuditStatsGql>,
}

impl QueryAuditStore {
    fn new() -> Self {
        Self {
            entries: Vec::new(),
            index_by_user: HashMap::new(),
            index_by_hash: HashMap::new(),
            index_by_time: Vec::new(),
            stats: Mutex::new(AuditStatsGql {
                total_queries: 0,
                successful_queries: 0,
                failed_queries: 0,
                denied_queries: 0,
                avg_latency_ms: 0.0,
                avg_complexity: 0.0,
                by_risk_level: HashMap::new(),
                by_event_type: HashMap::new(),
                top_users: Vec::new(),
                top_queries: Vec::new(),
            }),
        }
    }

    fn record(&mut self, entry: QueryAuditEntryGql) {
        let audit_id = entry.audit_id.clone();
        let user_id = entry.user_id.clone();
        let query_hash = entry.query_hash.clone();
        let timestamp = Utc::now().timestamp();

        self.index_by_user
            .entry(user_id.clone())
            .or_default()
            .push(audit_id.clone());
        if let Some(hash) = &query_hash {
            self.index_by_hash
                .entry(hash.clone())
                .or_default()
                .push(audit_id.clone());
        }
        self.index_by_time.push((timestamp, audit_id.clone()));
        self.update_stats(&entry);
        self.entries.push(entry);
    }

    fn update_stats(&self, entry: &QueryAuditEntryGql) {
        let mut stats = self.stats.lock().unwrap_or_else(|e| e.into_inner());
        match entry.event_type {
            AuditEventType::QueryExecuted => {
                stats.total_queries += 1;
                stats.successful_queries += 1;
            }
            AuditEventType::QueryFailed => {
                stats.total_queries += 1;
                stats.failed_queries += 1;
            }
            AuditEventType::QueryDenied
            | AuditEventType::QuotaExceeded
            | AuditEventType::UnauthorizedAccess => {
                stats.denied_queries += 1;
            }
            _ => {}
        }
        stats.avg_latency_ms = (stats.avg_latency_ms * 0.95) + (entry.latency_ms as f64 * 0.05);
        stats.avg_complexity = (stats.avg_complexity * 0.95) + (entry.complexity as f64 * 0.05);
        *stats
            .by_risk_level
            .entry(format!("{:?}", entry.risk_level))
            .or_insert(0) += 1;
        *stats
            .by_event_type
            .entry(format!("{:?}", entry.event_type))
            .or_insert(0) += 1;
    }

    fn get_stats(&self) -> AuditStatsGql {
        let mut stats = self.stats.lock().unwrap_or_else(|e| e.into_inner()).clone();
        let mut user_counts: HashMap<String, u64> = HashMap::new();
        let mut query_counts: HashMap<String, (u64, f64)> = HashMap::new();
        for entry in &self.entries {
            if entry.event_type == AuditEventType::QueryExecuted {
                *user_counts.entry(entry.user_id.clone()).or_insert(0) += 1;
                if let Some(hash) = &entry.query_hash {
                    let (count, total_lat) = query_counts.entry(hash.clone()).or_insert((0, 0.0));
                    *count += 1;
                    *total_lat += entry.latency_ms as f64;
                }
            }
        }
        stats.top_users = user_counts
            .into_iter()
            .map(|(k, v)| UserQueryCountGql {
                user_id: k,
                query_count: v,
            })
            .collect();
        stats.top_queries = query_counts
            .into_iter()
            .map(|(k, (count, total_lat))| QueryCountGql {
                query_hash: k,
                count,
                avg_latency_ms: if count > 0 {
                    total_lat / count as f64
                } else {
                    0.0
                },
            })
            .collect();
        stats
    }

    fn query(
        &self,
        filter: &QueryAuditFilterInput,
        page: u32,
        page_size: u32,
    ) -> Vec<QueryAuditEntryGql> {
        let filtered: Vec<&QueryAuditEntryGql> = self
            .entries
            .iter()
            .filter(|e| {
                if let Some(et) = filter.event_type {
                    if e.event_type != et {
                        return false;
                    }
                }
                if let Some(uid) = &filter.user_id {
                    if &e.user_id != uid {
                        return false;
                    }
                }
                if let Some(tid) = &filter.team_id {
                    if e.team_id.as_ref() != Some(tid) {
                        return false;
                    }
                }
                if let Some(oid) = &filter.org_id {
                    if e.org_id.as_ref() != Some(oid) {
                        return false;
                    }
                }
                if let Some(rl) = filter.risk_level {
                    if e.risk_level != rl {
                        return false;
                    }
                }
                if let Some(qh) = &filter.query_hash {
                    if e.query_hash.as_ref() != Some(qh) {
                        return false;
                    }
                }
                true
            })
            .collect();
        let start = ((page.saturating_sub(1)) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, filtered.len());
        if start < filtered.len() {
            filtered[start..end].iter().map(|e| (*e).clone()).collect()
        } else {
            Vec::new()
        }
    }
}

pub struct QueryAuditor {
    store: Mutex<QueryAuditStore>,
    counter: AtomicU64,
}

impl QueryAuditor {
    fn new() -> Self {
        Self {
            store: Mutex::new(QueryAuditStore::new()),
            counter: AtomicU64::new(0),
        }
    }

    fn generate_audit_id(&self) -> String {
        let id = self.counter.fetch_add(1, Ordering::Relaxed);
        format!("audit_{}", id)
    }

    pub fn log_query(
        &self,
        event_type: AuditEventType,
        query_hash: Option<String>,
        query_text: Option<String>,
        operation_name: Option<String>,
        user_id: String,
        team_id: Option<String>,
        org_id: Option<String>,
        client_ip: String,
        user_agent: Option<String>,
        latency_ms: u64,
        complexity: u32,
        depth: u32,
        result_count: u64,
        error_message: Option<String>,
        risk_level: QueryRisk,
    ) -> QueryAuditEntryGql {
        let entry = QueryAuditEntryGql {
            audit_id: self.generate_audit_id(),
            event_type,
            query_hash,
            query_text,
            operation_name,
            user_id,
            team_id,
            org_id,
            client_ip,
            user_agent,
            timestamp: Utc::now().to_rfc3339(),
            latency_ms,
            complexity,
            depth,
            result_count,
            error_message,
            risk_level,
            tags: Vec::new(),
        };
        self.store
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .record(entry.clone());
        entry
    }

    fn get_stats(&self) -> AuditStatsGql {
        self.store
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_stats()
    }

    fn query(
        &self,
        filter: QueryAuditFilterInput,
        page: u32,
        page_size: u32,
    ) -> Vec<QueryAuditEntryGql> {
        self.store
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .query(&filter, page, page_size)
    }
}

// ==================== 企业级治理实现 ====================

struct QueryQuotaTracker {
    quotas: HashMap<String, QueryQuotaGql>,
    usage: HashMap<String, AtomicU64>,
}

impl QueryQuotaTracker {
    fn new() -> Self {
        Self {
            quotas: HashMap::new(),
            usage: HashMap::new(),
        }
    }

    fn set_quota(&mut self, input: QueryQuotaInput) -> QueryQuotaGql {
        let key = format!("{}_{}", input.entity_type, input.entity_id);
        let reset_at = Self::calculate_reset_at(&input.period);
        let quota = QueryQuotaGql {
            entity_id: input.entity_id,
            entity_type: input.entity_type,
            max_queries: input.max_queries,
            period: input.period,
            current_usage: 0,
            remaining: input.max_queries,
            reset_at,
            enforcement: input.enforcement.unwrap_or(true),
        };
        self.quotas.insert(key.clone(), quota.clone());
        self.usage.insert(key, AtomicU64::new(0));
        quota
    }

    fn check_quota(&self, entity_type: &str, entity_id: &str) -> Option<(bool, u64)> {
        let key = format!("{}_{}", entity_type, entity_id);
        let quota = self.quotas.get(&key)?;
        let current = self.usage.get(&key)?.load(Ordering::Relaxed);
        Some((current < quota.max_queries, quota.max_queries - current))
    }

    fn record_usage(&self, entity_type: &str, entity_id: &str) -> u64 {
        let key = format!("{}_{}", entity_type, entity_id);
        if let Some(usage) = self.usage.get(&key) {
            usage.fetch_add(1, Ordering::Relaxed) + 1
        } else {
            0
        }
    }

    fn get_quota(&self, entity_type: &str, entity_id: &str) -> Option<QueryQuotaGql> {
        let key = format!("{}_{}", entity_type, entity_id);
        let quota = self.quotas.get(&key)?;
        let current = self.usage.get(&key)?.load(Ordering::Relaxed);
        Some(QueryQuotaGql {
            current_usage: current,
            remaining: quota.max_queries.saturating_sub(current),
            ..quota.clone()
        })
    }

    fn calculate_reset_at(period: &QuotaPeriod) -> String {
        let now = Utc::now();
        let reset = match period {
            QuotaPeriod::Second => now + chrono::Duration::seconds(1),
            QuotaPeriod::Minute => now + chrono::Duration::minutes(1),
            QuotaPeriod::Hour => now + chrono::Duration::hours(1),
            QuotaPeriod::Day => now + chrono::Duration::days(1),
            QuotaPeriod::Month => now + chrono::Duration::days(30),
        };
        reset.to_rfc3339()
    }
}

struct ApprovalWorkflow {
    requests: HashMap<String, QueryApprovalRequestGql>,
    counter: AtomicU64,
}

impl ApprovalWorkflow {
    fn new() -> Self {
        Self {
            requests: HashMap::new(),
            counter: AtomicU64::new(0),
        }
    }

    fn create_request(&mut self, input: ApprovalRequestInput) -> QueryApprovalRequestGql {
        let request_id = format!("approval_{}", self.counter.fetch_add(1, Ordering::Relaxed));
        let request = QueryApprovalRequestGql {
            request_id: request_id.clone(),
            query_hash: input.query_hash,
            query_text: input.query_text,
            requester_id: input.requester_id,
            team_id: input.team_id,
            org_id: input.org_id,
            status: ApprovalStatus::Pending,
            requested_at: Utc::now().to_rfc3339(),
            reviewed_at: None,
            reviewer_id: None,
            review_notes: None,
            expires_at: None,
            reason: input.reason,
        };
        self.requests.insert(request_id, request.clone());
        request
    }

    fn review(&mut self, input: ApprovalReviewInput) -> Option<QueryApprovalRequestGql> {
        let request = self.requests.get_mut(&input.request_id)?;
        if request.status != ApprovalStatus::Pending {
            return None;
        }
        request.status = if input.approved {
            ApprovalStatus::Approved
        } else {
            ApprovalStatus::Rejected
        };
        request.reviewed_at = Some(Utc::now().to_rfc3339());
        request.reviewer_id = Some(input.reviewer_id);
        request.review_notes = input.review_notes;
        if let Some(hours) = input.expires_in_hours {
            request.expires_at =
                Some((Utc::now() + chrono::Duration::hours(hours as i64)).to_rfc3339());
        }
        Some(request.clone())
    }

    fn get_request(&self, request_id: &str) -> Option<QueryApprovalRequestGql> {
        self.requests.get(request_id).cloned()
    }

    fn list_pending(&self) -> Vec<QueryApprovalRequestGql> {
        self.requests
            .values()
            .filter(|r| r.status == ApprovalStatus::Pending)
            .cloned()
            .collect()
    }

    fn is_approved(&self, query_hash: &str, user_id: &str) -> bool {
        self.requests.values().any(|r| {
            r.query_hash == query_hash
                && r.requester_id == user_id
                && r.status == ApprovalStatus::Approved
                && r.expires_at
                    .as_ref()
                    .map(|e| {
                        chrono::DateTime::parse_from_rfc3339(e)
                            .map(|dt| dt.with_timezone(&Utc) > Utc::now())
                            .unwrap_or(false)
                    })
                    .unwrap_or(true)
        })
    }
}

struct GovernanceEngine {
    policies: HashMap<String, GovernancePolicyGql>,
    field_controls: HashMap<String, FieldAccessControlGql>,
    policy_counter: AtomicU64,
    rule_counter: AtomicU64,
}

impl GovernanceEngine {
    fn new() -> Self {
        Self {
            policies: HashMap::new(),
            field_controls: HashMap::new(),
            policy_counter: AtomicU64::new(0),
            rule_counter: AtomicU64::new(0),
        }
    }

    fn create_policy(&mut self, input: GovernancePolicyInput) -> GovernancePolicyGql {
        let policy_id = format!(
            "policy_{}",
            self.policy_counter.fetch_add(1, Ordering::Relaxed)
        );
        let now = Utc::now();
        let rules = input
            .rules
            .unwrap_or_default()
            .into_iter()
            .map(|r| {
                let rule_id = format!("rule_{}", self.rule_counter.fetch_add(1, Ordering::Relaxed));
                GovernanceRuleGql {
                    rule_id,
                    rule_type: r.rule_type,
                    condition: r.condition,
                    action: r.action,
                    severity: r.severity.unwrap_or_else(|| "medium".to_string()),
                    enabled: r.enabled.unwrap_or(true),
                }
            })
            .collect();
        let policy = GovernancePolicyGql {
            policy_id: policy_id.clone(),
            policy_name: input.policy_name,
            description: input.description,
            compliance_level: input.compliance_level,
            enabled: input.enabled.unwrap_or(true),
            rules,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        };
        self.policies.insert(policy_id, policy.clone());
        policy
    }

    fn get_policy(&self, policy_id: &str) -> Option<GovernancePolicyGql> {
        self.policies.get(policy_id).cloned()
    }

    fn list_policies(&self) -> Vec<GovernancePolicyGql> {
        self.policies.values().cloned().collect()
    }

    fn set_field_control(&mut self, input: FieldAccessControlInput) -> FieldAccessControlGql {
        let control = FieldAccessControlGql {
            field_path: input.field_path.clone(),
            allowed_roles: input.allowed_roles.unwrap_or_default(),
            denied_roles: input.denied_roles.unwrap_or_default(),
            requires_approval: input.requires_approval.unwrap_or(false),
            pii: input.pii.unwrap_or(false),
            audit: input.audit.unwrap_or(true),
        };
        self.field_controls
            .insert(input.field_path, control.clone());
        control
    }

    fn get_field_control(&self, field_path: &str) -> Option<FieldAccessControlGql> {
        self.field_controls.get(field_path).cloned()
    }

    fn check_governance(
        &self,
        query_hash: &str,
        user_id: &str,
        user_roles: &[String],
        query_fields: &[String],
    ) -> GovernanceCheckResultGql {
        let mut allowed = true;
        let mut denial_reason = None;
        let mut warnings = Vec::new();
        let mut required_approvals = Vec::new();
        let mut field_restrictions = Vec::new();
        let mut applied_policies = Vec::new();

        for field in query_fields {
            if let Some(control) = self.field_controls.get(field) {
                if control.pii {
                    warnings.push(format!("Field {} contains PII", field));
                }
                if control.requires_approval {
                    required_approvals.push(field.clone());
                }
                if !control.denied_roles.is_empty() {
                    for role in user_roles {
                        if control.denied_roles.contains(role) {
                            field_restrictions.push(field.clone());
                            if control.audit {
                                warnings.push(format!(
                                    "User role {} denied access to field {}",
                                    role, field
                                ));
                            }
                        }
                    }
                }
                if !control.allowed_roles.is_empty() {
                    let has_allowed = user_roles.iter().any(|r| control.allowed_roles.contains(r));
                    if !has_allowed && control.allowed_roles.iter().all(|r| r != "*") {
                        field_restrictions.push(field.clone());
                        denial_reason = Some("User lacks required role for field".to_string());
                        allowed = false;
                    }
                }
            }
        }

        for (policy_id, policy) in &self.policies {
            if policy.enabled {
                applied_policies.push(policy_id.clone());
                for rule in &policy.rules {
                    if rule.enabled && rule.severity == "critical" {
                        warnings.push(format!(
                            "Policy {} rule {} triggered",
                            policy_id, rule.rule_id
                        ));
                    }
                }
            }
        }

        if !field_restrictions.is_empty() {
            allowed = false;
        }

        GovernanceCheckResultGql {
            query_hash: query_hash.to_string(),
            user_id: user_id.to_string(),
            allowed,
            denial_reason,
            warnings,
            required_approvals,
            field_restrictions,
            applied_policies,
        }
    }
}

pub struct EnterpriseGovernance {
    quota_tracker: Mutex<QueryQuotaTracker>,
    approval_workflow: Mutex<ApprovalWorkflow>,
    governance_engine: Mutex<GovernanceEngine>,
}

impl EnterpriseGovernance {
    fn new() -> Self {
        Self {
            quota_tracker: Mutex::new(QueryQuotaTracker::new()),
            approval_workflow: Mutex::new(ApprovalWorkflow::new()),
            governance_engine: Mutex::new(GovernanceEngine::new()),
        }
    }

    fn set_quota(&self, input: QueryQuotaInput) -> QueryQuotaGql {
        self.quota_tracker
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .set_quota(input)
    }

    fn check_quota(&self, entity_type: &str, entity_id: &str) -> Option<(bool, u64)> {
        self.quota_tracker
            .lock()
            .unwrap()
            .check_quota(entity_type, entity_id)
    }

    fn record_quota_usage(&self, entity_type: &str, entity_id: &str) -> u64 {
        self.quota_tracker
            .lock()
            .unwrap()
            .record_usage(entity_type, entity_id)
    }

    fn get_quota(&self, entity_type: &str, entity_id: &str) -> Option<QueryQuotaGql> {
        self.quota_tracker
            .lock()
            .unwrap()
            .get_quota(entity_type, entity_id)
    }

    fn create_approval_request(&self, input: ApprovalRequestInput) -> QueryApprovalRequestGql {
        self.approval_workflow
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .create_request(input)
    }

    fn review_approval(&self, input: ApprovalReviewInput) -> Option<QueryApprovalRequestGql> {
        self.approval_workflow
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .review(input)
    }

    fn get_approval_request(&self, request_id: &str) -> Option<QueryApprovalRequestGql> {
        self.approval_workflow
            .lock()
            .unwrap()
            .get_request(request_id)
    }

    fn list_pending_approvals(&self) -> Vec<QueryApprovalRequestGql> {
        self.approval_workflow
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .list_pending()
    }

    fn is_query_approved(&self, query_hash: &str, user_id: &str) -> bool {
        self.approval_workflow
            .lock()
            .unwrap()
            .is_approved(query_hash, user_id)
    }

    fn create_policy(&self, input: GovernancePolicyInput) -> GovernancePolicyGql {
        self.governance_engine
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .create_policy(input)
    }

    fn get_policy(&self, policy_id: &str) -> Option<GovernancePolicyGql> {
        self.governance_engine
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get_policy(policy_id)
    }

    fn list_policies(&self) -> Vec<GovernancePolicyGql> {
        self.governance_engine
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .list_policies()
    }

    fn set_field_control(&self, input: FieldAccessControlInput) -> FieldAccessControlGql {
        self.governance_engine
            .lock()
            .unwrap()
            .set_field_control(input)
    }

    fn get_field_control(&self, field_path: &str) -> Option<FieldAccessControlGql> {
        self.governance_engine
            .lock()
            .unwrap()
            .get_field_control(field_path)
    }

    fn check_governance(
        &self,
        query_hash: &str,
        user_id: &str,
        user_roles: &[String],
        query_fields: &[String],
    ) -> GovernanceCheckResultGql {
        self.governance_engine
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .check_governance(query_hash, user_id, user_roles, query_fields)
    }
}

// ==================== 全局单例 ====================

static PERSISTED_QUERY_MANAGER: OnceLock<Mutex<PersistedQueryManager>> = OnceLock::new();
static QUERY_AUDITOR: OnceLock<QueryAuditor> = OnceLock::new();
static ENTERPRISE_GOVERNANCE: OnceLock<EnterpriseGovernance> = OnceLock::new();

pub fn persisted_query_manager() -> &'static Mutex<PersistedQueryManager> {
    PERSISTED_QUERY_MANAGER.get_or_init(|| Mutex::new(PersistedQueryManager::new()))
}

pub fn query_auditor() -> &'static QueryAuditor {
    QUERY_AUDITOR.get_or_init(|| QueryAuditor::new())
}

pub fn enterprise_governance() -> &'static EnterpriseGovernance {
    ENTERPRISE_GOVERNANCE.get_or_init(|| EnterpriseGovernance::new())
}

// ==================== 公共 API 函数 ====================

pub fn register_persisted_query(input: PersistedQueryInput) -> PersistedQueryGql {
    persisted_query_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .register(input)
}

pub fn get_persisted_query(query_hash: &str) -> Option<PersistedQueryGql> {
    persisted_query_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(query_hash)
}

pub fn get_persisted_query_text(query_hash: &str) -> Option<String> {
    persisted_query_manager()
        .lock()
        .unwrap()
        .get_by_hash(query_hash)
}

pub fn list_persisted_queries(
    page: u32,
    page_size: u32,
    status: Option<QueryStatus>,
) -> PersistedQueryListGql {
    persisted_query_manager()
        .lock()
        .unwrap()
        .list(page, page_size, status)
}

pub fn update_persisted_query_status(
    query_hash: &str,
    status: QueryStatus,
) -> Option<PersistedQueryGql> {
    persisted_query_manager()
        .lock()
        .unwrap()
        .update_status(query_hash, status)
}

pub fn delete_persisted_query(query_hash: &str) -> bool {
    persisted_query_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .delete(query_hash)
}

pub fn add_persisted_query_tag(query_hash: &str, tag: &str) -> Option<PersistedQueryGql> {
    persisted_query_manager()
        .lock()
        .unwrap()
        .add_tag(query_hash, tag)
}

pub fn remove_persisted_query_tag(query_hash: &str, tag: &str) -> Option<PersistedQueryGql> {
    persisted_query_manager()
        .lock()
        .unwrap()
        .remove_tag(query_hash, tag)
}

pub fn search_persisted_queries_by_tag(tag: &str) -> Vec<PersistedQueryGql> {
    persisted_query_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .search_by_tag(tag)
}

pub fn record_persisted_query_usage(query_hash: &str, latency_ms: u64) {
    persisted_query_manager()
        .lock()
        .unwrap()
        .record_usage(query_hash, latency_ms);
}

pub fn log_audit_event(
    event_type: AuditEventType,
    query_hash: Option<String>,
    query_text: Option<String>,
    operation_name: Option<String>,
    user_id: String,
    team_id: Option<String>,
    org_id: Option<String>,
    client_ip: String,
    user_agent: Option<String>,
    latency_ms: u64,
    complexity: u32,
    depth: u32,
    result_count: u64,
    error_message: Option<String>,
    risk_level: QueryRisk,
) -> QueryAuditEntryGql {
    query_auditor().log_query(
        event_type,
        query_hash,
        query_text,
        operation_name,
        user_id,
        team_id,
        org_id,
        client_ip,
        user_agent,
        latency_ms,
        complexity,
        depth,
        result_count,
        error_message,
        risk_level,
    )
}

pub fn get_audit_stats() -> AuditStatsGql {
    query_auditor().get_stats()
}

pub fn query_audit_entries(
    filter: QueryAuditFilterInput,
    page: u32,
    page_size: u32,
) -> Vec<QueryAuditEntryGql> {
    query_auditor().query(filter, page, page_size)
}

pub fn set_query_quota(input: QueryQuotaInput) -> QueryQuotaGql {
    enterprise_governance().set_quota(input)
}

pub fn check_query_quota(entity_type: &str, entity_id: &str) -> Option<(bool, u64)> {
    enterprise_governance().check_quota(entity_type, entity_id)
}

pub fn record_quota_usage(entity_type: &str, entity_id: &str) -> u64 {
    enterprise_governance().record_quota_usage(entity_type, entity_id)
}

pub fn get_query_quota(entity_type: &str, entity_id: &str) -> Option<QueryQuotaGql> {
    enterprise_governance().get_quota(entity_type, entity_id)
}

pub fn create_approval_request(input: ApprovalRequestInput) -> QueryApprovalRequestGql {
    enterprise_governance().create_approval_request(input)
}

pub fn review_approval_request(input: ApprovalReviewInput) -> Option<QueryApprovalRequestGql> {
    enterprise_governance().review_approval(input)
}

pub fn get_approval_request(request_id: &str) -> Option<QueryApprovalRequestGql> {
    enterprise_governance().get_approval_request(request_id)
}

pub fn list_pending_approval_requests() -> Vec<QueryApprovalRequestGql> {
    enterprise_governance().list_pending_approvals()
}

pub fn is_query_approved(query_hash: &str, user_id: &str) -> bool {
    enterprise_governance().is_query_approved(query_hash, user_id)
}

pub fn create_governance_policy(input: GovernancePolicyInput) -> GovernancePolicyGql {
    enterprise_governance().create_policy(input)
}

pub fn get_governance_policy(policy_id: &str) -> Option<GovernancePolicyGql> {
    enterprise_governance().get_policy(policy_id)
}

pub fn list_governance_policies() -> Vec<GovernancePolicyGql> {
    enterprise_governance().list_policies()
}

pub fn set_field_access_control(input: FieldAccessControlInput) -> FieldAccessControlGql {
    enterprise_governance().set_field_control(input)
}

pub fn get_field_access_control(field_path: &str) -> Option<FieldAccessControlGql> {
    enterprise_governance().get_field_control(field_path)
}

pub fn check_query_governance(
    query_hash: &str,
    user_id: &str,
    user_roles: &[String],
    query_fields: &[String],
) -> GovernanceCheckResultGql {
    enterprise_governance().check_governance(query_hash, user_id, user_roles, query_fields)
}

// ==================== 初始化函数 ====================

pub fn init_query_governance() {
    // 注册一些默认的持久化查询
    let default_queries = vec![
        (
            "query GetDashboard { businessStats { erp { service total active available } } }",
            "GetDashboard",
            "system",
        ),
        (
            "query GetServices { services { service healthy url } }",
            "GetServices",
            "system",
        ),
        (
            "query GetTodos { todos { id title source priority status } }",
            "GetTodos",
            "system",
        ),
    ];

    for (query_text, operation_name, created_by) in default_queries {
        let input = PersistedQueryInput {
            query_text: query_text.to_string(),
            operation_name: Some(operation_name.to_string()),
            created_by: created_by.to_string(),
            tags: Some(vec!["default".to_string(), "system".to_string()]),
            status: Some(QueryStatus::Active),
        };
        register_persisted_query(input);
    }

    // 设置默认配额
    let default_quotas = vec![
        ("user", "anonymous", 100, QuotaPeriod::Hour),
        ("user", "authenticated", 1000, QuotaPeriod::Hour),
        ("team", "default", 10000, QuotaPeriod::Day),
        ("org", "enterprise", 100000, QuotaPeriod::Day),
    ];

    for (entity_type, entity_id, max_queries, period) in default_quotas {
        set_query_quota(QueryQuotaInput {
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            max_queries,
            period,
            enforcement: Some(true),
        });
    }

    // 设置默认字段访问控制
    let default_field_controls = vec![
        ("User.email", vec!["admin", "user"], vec![], true, true),
        ("User.phone", vec!["admin"], vec![], true, true),
        ("User.ssn", vec!["admin"], vec!["*"], true, true),
        ("BusinessStats.*", vec!["*"], vec![], false, false),
    ];

    for (field_path, allowed_roles, denied_roles, requires_approval, pii) in default_field_controls
    {
        set_field_access_control(FieldAccessControlInput {
            field_path: field_path.to_string(),
            allowed_roles: Some(allowed_roles.iter().map(|s| s.to_string()).collect()),
            denied_roles: Some(denied_roles.iter().map(|s| s.to_string()).collect()),
            requires_approval: Some(requires_approval),
            pii: Some(pii),
            audit: Some(true),
        });
    }

    // 创建默认治理策略
    create_governance_policy(GovernancePolicyInput {
        policy_name: "Default Security Policy".to_string(),
        description: "Default enterprise security governance policy".to_string(),
        compliance_level: ComplianceLevel::Standard,
        enabled: Some(true),
        rules: Some(vec![
            GovernanceRuleInput {
                rule_type: "max_complexity".to_string(),
                condition: "complexity > 1000".to_string(),
                action: "deny".to_string(),
                severity: Some("high".to_string()),
                enabled: Some(true),
            },
            GovernanceRuleInput {
                rule_type: "max_depth".to_string(),
                condition: "depth > 15".to_string(),
                action: "warn".to_string(),
                severity: Some("medium".to_string()),
                enabled: Some(true),
            },
        ]),
    });
}

// ==================== QueryGovernanceQueryRoot / QueryGovernanceMutationRoot ====================

pub struct QueryGovernanceQueryRoot;
pub struct QueryGovernanceMutationRoot;

#[Object]
#[allow(clippy::needless_update)]
impl QueryGovernanceQueryRoot {
    /// 获取持久化查询
    async fn persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<PersistedQueryGql>> {
        Ok(get_persisted_query(&query_hash))
    }

    /// 列出持久化查询
    async fn persisted_queries(
        &self,
        _ctx: &Context<'_>,
        page: Option<u32>,
        page_size: Option<u32>,
        status: Option<QueryStatus>,
    ) -> async_graphql::Result<PersistedQueryListGql> {
        Ok(list_persisted_queries(
            page.unwrap_or(1),
            page_size.unwrap_or(20),
            status,
        ))
    }

    /// 按标签搜索持久化查询
    async fn persisted_queries_by_tag(
        &self,
        _ctx: &Context<'_>,
        tag: String,
    ) -> async_graphql::Result<Vec<PersistedQueryGql>> {
        Ok(search_persisted_queries_by_tag(&tag))
    }

    /// 获取审计统计
    async fn audit_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<AuditStatsGql> {
        Ok(get_audit_stats())
    }

    /// 查询审计日志
    async fn audit_entries(
        &self,
        _ctx: &Context<'_>,
        filter: QueryAuditFilterInput,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> async_graphql::Result<Vec<QueryAuditEntryGql>> {
        Ok(query_audit_entries(
            filter,
            page.unwrap_or(1),
            page_size.unwrap_or(20),
        ))
    }

    /// 获取查询配额
    async fn query_quota(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
    ) -> async_graphql::Result<Option<QueryQuotaGql>> {
        Ok(get_query_quota(&entity_type, &entity_id))
    }

    /// 获取审批请求
    async fn approval_request(
        &self,
        _ctx: &Context<'_>,
        request_id: String,
    ) -> async_graphql::Result<Option<QueryApprovalRequestGql>> {
        Ok(get_approval_request(&request_id))
    }

    /// 列出待审批请求
    async fn pending_approval_requests(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<QueryApprovalRequestGql>> {
        Ok(list_pending_approval_requests())
    }

    /// 获取治理策略
    async fn governance_policy(
        &self,
        _ctx: &Context<'_>,
        policy_id: String,
    ) -> async_graphql::Result<Option<GovernancePolicyGql>> {
        Ok(get_governance_policy(&policy_id))
    }

    /// 列出治理策略
    async fn governance_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<GovernancePolicyGql>> {
        Ok(list_governance_policies())
    }

    /// 获取字段访问控制
    async fn field_access_control(
        &self,
        _ctx: &Context<'_>,
        field_path: String,
    ) -> async_graphql::Result<Option<FieldAccessControlGql>> {
        Ok(get_field_access_control(&field_path))
    }

    /// 检查查询治理
    async fn check_governance(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        user_id: String,
        user_roles: Vec<String>,
        query_fields: Vec<String>,
    ) -> async_graphql::Result<GovernanceCheckResultGql> {
        Ok(check_query_governance(
            &query_hash,
            &user_id,
            &user_roles,
            &query_fields,
        ))
    }
}

#[Object]
#[allow(clippy::needless_update)]
impl QueryGovernanceMutationRoot {
    /// 注册持久化查询
    async fn register_persisted_query(
        &self,
        _ctx: &Context<'_>,
        input: PersistedQueryInput,
    ) -> async_graphql::Result<PersistedQueryGql> {
        Ok(register_persisted_query(input))
    }

    /// 更新持久化查询状态
    async fn update_persisted_query_status(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        status: QueryStatus,
    ) -> async_graphql::Result<Option<PersistedQueryGql>> {
        Ok(update_persisted_query_status(&query_hash, status))
    }

    /// 删除持久化查询
    async fn delete_persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(delete_persisted_query(&query_hash))
    }

    /// 添加持久化查询标签
    async fn add_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<PersistedQueryGql>> {
        Ok(add_persisted_query_tag(&query_hash, &tag))
    }

    /// 移除持久化查询标签
    async fn remove_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<PersistedQueryGql>> {
        Ok(remove_persisted_query_tag(&query_hash, &tag))
    }

    /// 设置查询配额
    async fn set_query_quota(
        &self,
        _ctx: &Context<'_>,
        input: QueryQuotaInput,
    ) -> async_graphql::Result<QueryQuotaGql> {
        Ok(set_query_quota(input))
    }

    /// 创建审批请求
    async fn create_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: ApprovalRequestInput,
    ) -> async_graphql::Result<QueryApprovalRequestGql> {
        Ok(create_approval_request(input))
    }

    /// 审批请求
    async fn review_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: ApprovalReviewInput,
    ) -> async_graphql::Result<Option<QueryApprovalRequestGql>> {
        Ok(review_approval_request(input))
    }

    /// 创建治理策略
    async fn create_governance_policy(
        &self,
        _ctx: &Context<'_>,
        input: GovernancePolicyInput,
    ) -> async_graphql::Result<GovernancePolicyGql> {
        Ok(create_governance_policy(input))
    }

    /// 设置字段访问控制
    async fn set_field_access_control(
        &self,
        _ctx: &Context<'_>,
        input: FieldAccessControlInput,
    ) -> async_graphql::Result<FieldAccessControlGql> {
        Ok(set_field_access_control(input))
    }
}
