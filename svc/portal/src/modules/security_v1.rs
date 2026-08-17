#![allow(dead_code)] // Reserved: V55 安全网关模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V55.0 BFF Phase 25: GraphQL 安全网关 + 零信任架构 + 数据脱敏
//!
//! 核心能力：
//! 1. GraphQL 安全网关 (Security Gateway)
//!    - SecurityGateway: 查询深度/复杂度限制、速率限制、安全事件审计
//!    - SecurityPolicy: 安全策略配置 (速率限制/深度/复杂度/鉴权)
//!    - SecurityEvent: 安全事件记录 (AuthFail/RateLimit/DepthExceed/ComplexityExceed/SchemaViolation)
//! 2. 零信任架构 (Zero-Trust Architecture)
//!    - ZeroTrustEngine: 身份验证、设备指纹、网络上下文分析、信任决策
//!    - TrustDecision: Allow/Deny/Challenge 决策
//!    - IdentityContext: 身份上下文 (user_id/session_id/device_id/ip/location/mfa)
//! 3. 数据脱敏 (Data Masking)
//!    - DataMasker: 动态字段级脱敏、基于角色的脱敏策略
//!    - MaskingRule: 脱敏规则 (Full/Partial/Hash/Range/Null)
//!    - MaskedField: 脱敏结果记录

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_SECURITY_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_security_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    rate_limit_per_sec INT NOT NULL DEFAULT 100,
    max_query_depth INT NOT NULL DEFAULT 10,
    max_complexity INT NOT NULL DEFAULT 1000,
    require_auth BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_operations JSONB NOT NULL DEFAULT '["query","mutation"]',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_SECURITY_EVENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_security_events (
    id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(32) NOT NULL,
    client_ip VARCHAR(64),
    query_hash VARCHAR(128),
    action VARCHAR(64),
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sec_events_type ON portal_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_ip ON portal_security_events(client_ip);
CREATE INDEX IF NOT EXISTS idx_sec_events_timestamp ON portal_security_events(timestamp DESC);
"#;

pub const CREATE_TRUST_DECISIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_trust_decisions (
    id VARCHAR(64) PRIMARY KEY,
    identity VARCHAR(128) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    reason TEXT,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trust_identity ON portal_trust_decisions(identity);
CREATE INDEX IF NOT EXISTS idx_trust_decision ON portal_trust_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_trust_created ON portal_trust_decisions(created_at DESC);
"#;

pub const CREATE_IDENTITY_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_identity_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    description TEXT,
    risk_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_locations JSONB NOT NULL DEFAULT '[]',
    allowed_devices JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_MASKING_RULES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_masking_rules (
    id VARCHAR(64) PRIMARY KEY,
    field_path VARCHAR(256) NOT NULL,
    mask_type VARCHAR(32) NOT NULL,
    pattern VARCHAR(256),
    applied_to JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_masking_field ON portal_masking_rules(field_path);
CREATE INDEX IF NOT EXISTS idx_masking_type ON portal_masking_rules(mask_type);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecurityEventType {
    AuthFail,
    RateLimit,
    DepthExceed,
    ComplexityExceed,
    SchemaViolation,
}

impl SecurityEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AuthFail => "auth_fail",
            Self::RateLimit => "rate_limit",
            Self::DepthExceed => "depth_exceed",
            Self::ComplexityExceed => "complexity_exceed",
            Self::SchemaViolation => "schema_violation",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "auth_fail" => Some(Self::AuthFail),
            "rate_limit" => Some(Self::RateLimit),
            "depth_exceed" => Some(Self::DepthExceed),
            "complexity_exceed" => Some(Self::ComplexityExceed),
            "schema_violation" => Some(Self::SchemaViolation),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::AuthFail,
            Self::RateLimit,
            Self::DepthExceed,
            Self::ComplexityExceed,
            Self::SchemaViolation,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrustDecisionType {
    Allow,
    Deny,
    Challenge,
}

impl TrustDecisionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Allow => "allow",
            Self::Deny => "deny",
            Self::Challenge => "challenge",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "allow" => Some(Self::Allow),
            "deny" => Some(Self::Deny),
            "challenge" => Some(Self::Challenge),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MaskType {
    Full,
    Partial,
    Hash,
    Range,
    Null,
}

impl MaskType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Partial => "partial",
            Self::Hash => "hash",
            Self::Range => "range",
            Self::Null => "null",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "full" => Some(Self::Full),
            "partial" => Some(Self::Partial),
            "hash" => Some(Self::Hash),
            "range" => Some(Self::Range),
            "null" => Some(Self::Null),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::Full,
            Self::Partial,
            Self::Hash,
            Self::Range,
            Self::Null,
        ]
    }
}

// ==================== 核心结构体 ====================

// --- Security Gateway ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicy {
    pub id: String,
    pub name: String,
    pub rate_limit_per_sec: u32,
    pub max_query_depth: u32,
    pub max_complexity: u32,
    pub require_auth: bool,
    pub allowed_operations: Vec<String>,
    pub enabled: bool,
}

impl Default for SecurityPolicy {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: "default".to_string(),
            rate_limit_per_sec: 100,
            max_query_depth: 10,
            max_complexity: 1000,
            require_auth: true,
            allowed_operations: vec!["query".to_string(), "mutation".to_string()],
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: String,
    pub event_type: SecurityEventType,
    pub client_ip: Option<String>,
    pub query_hash: Option<String>,
    pub timestamp: String,
    pub action: Option<String>,
    pub details: Option<serde_json::Value>,
}

impl SecurityEvent {
    pub fn new(
        event_type: SecurityEventType,
        client_ip: Option<String>,
        query_hash: Option<String>,
        action: Option<String>,
        details: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            event_type,
            client_ip,
            query_hash,
            timestamp: chrono::Utc::now().to_rfc3339(),
            action,
            details,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub reason: Option<String>,
    pub depth: Option<u32>,
    pub complexity: Option<u32>,
}

// --- Zero Trust ---

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IdentityContext {
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub device_id: Option<String>,
    pub ip: Option<String>,
    pub location: Option<String>,
    pub mfa_completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustDecision {
    pub id: String,
    pub identity: String,
    pub context: IdentityContext,
    pub risk_score: f64,
    pub decision: TrustDecisionType,
    pub reason: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityPolicy {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub risk_threshold: f64,
    pub require_mfa: bool,
    pub allowed_locations: Vec<String>,
    pub allowed_devices: Vec<String>,
    pub enabled: bool,
}

impl Default for IdentityPolicy {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: "default".to_string(),
            description: None,
            risk_threshold: 0.7,
            require_mfa: false,
            allowed_locations: Vec::new(),
            allowed_devices: Vec::new(),
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTrust {
    pub session_id: String,
    pub trust_score: f64,
    pub decision: TrustDecisionType,
    pub risk_factors: Vec<String>,
}

// --- Data Masking ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskingRule {
    pub id: String,
    pub field_path: String,
    pub mask_type: MaskType,
    pub pattern: Option<String>,
    pub applied_to: Vec<String>,
    pub enabled: bool,
}

impl Default for MaskingRule {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            field_path: String::new(),
            mask_type: MaskType::Full,
            pattern: None,
            applied_to: Vec::new(),
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskedField {
    pub original: String,
    pub masked: String,
    pub rule_id: String,
    pub applied_at: String,
}

// ==================== 内存存储 ====================

struct SecurityStore {
    policies: Mutex<Vec<SecurityPolicy>>,
    events: Mutex<Vec<SecurityEvent>>,
    rate_limits: Mutex<HashMap<String, Vec<(String, std::time::Instant)>>>,
    trust_decisions: Mutex<Vec<TrustDecision>>,
    identity_policies: Mutex<Vec<IdentityPolicy>>,
    session_trusts: Mutex<HashMap<String, SessionTrust>>,
    masking_rules: Mutex<Vec<MaskingRule>>,
    masked_fields: Mutex<Vec<MaskedField>>,
}

fn get_security_store() -> &'static SecurityStore {
    static STORE: LazyLock<SecurityStore> = LazyLock::new(|| {
        let default_policy = SecurityPolicy::default();
        let default_identity_policy = IdentityPolicy::default();
        SecurityStore {
            policies: Mutex::new(vec![default_policy]),
            events: Mutex::new(Vec::new()),
            rate_limits: Mutex::new(HashMap::new()),
            trust_decisions: Mutex::new(Vec::new()),
            identity_policies: Mutex::new(vec![default_identity_policy]),
            session_trusts: Mutex::new(HashMap::new()),
            masking_rules: Mutex::new(Vec::new()),
            masked_fields: Mutex::new(Vec::new()),
        }
    });
    &STORE
}

// ==================== SecurityGateway 实现 ====================

pub struct SecurityGateway;

impl SecurityGateway {
    pub async fn validate_query(
        query: &str,
        client_ip: Option<&str>,
        policy_id: Option<&str>,
    ) -> Result<ValidationResult, String> {
        let store = get_security_store();

        let policy = if let Some(pid) = policy_id {
            let policies = store.policies.lock().await;
            policies.iter().find(|p| p.id == pid).cloned()
        } else {
            let policies = store.policies.lock().await;
            policies.iter().find(|p| p.enabled).cloned()
        };

        let policy = policy.ok_or_else(|| "未找到有效的安全策略".to_string())?;

        let depth = Self::estimate_query_depth(query);
        let complexity = Self::estimate_query_complexity(query);

        if depth > policy.max_query_depth {
            let event = SecurityEvent::new(
                SecurityEventType::DepthExceed,
                client_ip.map(|s| s.to_string()),
                None,
                Some("query_depth_exceeded".to_string()),
                Some(serde_json::json!({
                    "depth": depth,
                    "max_depth": policy.max_query_depth,
                })),
            );
            let mut events = store.events.lock().await;
            events.push(event);

            return Ok(ValidationResult {
                valid: false,
                reason: Some(format!(
                    "查询深度 {} 超过最大限制 {}",
                    depth, policy.max_query_depth
                )),
                depth: Some(depth),
                complexity: Some(complexity),
            });
        }

        if complexity > policy.max_complexity {
            let event = SecurityEvent::new(
                SecurityEventType::ComplexityExceed,
                client_ip.map(|s| s.to_string()),
                None,
                Some("query_complexity_exceeded".to_string()),
                Some(serde_json::json!({
                    "complexity": complexity,
                    "max_complexity": policy.max_complexity,
                })),
            );
            let mut events = store.events.lock().await;
            events.push(event);

            return Ok(ValidationResult {
                valid: false,
                reason: Some(format!(
                    "查询复杂度 {} 超过最大限制 {}",
                    complexity, policy.max_complexity
                )),
                depth: Some(depth),
                complexity: Some(complexity),
            });
        }

        Ok(ValidationResult {
            valid: true,
            reason: None,
            depth: Some(depth),
            complexity: Some(complexity),
        })
    }

    pub async fn check_rate_limit(
        identifier: &str,
        policy_id: Option<&str>,
    ) -> Result<bool, String> {
        let store = get_security_store();

        let policy = if let Some(pid) = policy_id {
            let policies = store.policies.lock().await;
            policies.iter().find(|p| p.id == pid).cloned()
        } else {
            let policies = store.policies.lock().await;
            policies.iter().find(|p| p.enabled).cloned()
        };

        let policy = policy.ok_or_else(|| "未找到有效的安全策略".to_string())?;

        let now = std::time::Instant::now();
        let mut rate_limits = store.rate_limits.lock().await;
        let entries = rate_limits
            .entry(identifier.to_string())
            .or_insert_with(Vec::new);

        entries.retain(|(_, t)| now.duration_since(*t).as_secs() < 1);

        if entries.len() >= policy.rate_limit_per_sec as usize {
            let event = SecurityEvent::new(
                SecurityEventType::RateLimit,
                Some(identifier.to_string()),
                None,
                Some("rate_limit_exceeded".to_string()),
                Some(serde_json::json!({
                    "rate_limit": policy.rate_limit_per_sec,
                })),
            );
            let mut events = store.events.lock().await;
            events.push(event);

            return Ok(false);
        }

        entries.push((identifier.to_string(), now));
        Ok(true)
    }

    pub async fn get_security_events(
        event_type: Option<SecurityEventType>,
        limit: Option<u64>,
    ) -> Vec<SecurityEvent> {
        let store = get_security_store();
        let events = store.events.lock().await;
        let limit = limit.unwrap_or(100).min(500) as usize;

        let filtered: Vec<SecurityEvent> = if let Some(et) = event_type {
            events
                .iter()
                .filter(|e| e.event_type == et)
                .cloned()
                .collect()
        } else {
            events.clone()
        };

        filtered.into_iter().rev().take(limit).collect()
    }

    pub async fn create_policy(policy: SecurityPolicy) -> Result<SecurityPolicy, String> {
        let store = get_security_store();
        let mut policies = store.policies.lock().await;

        if policies.iter().any(|p| p.name == policy.name) {
            return Err(format!("策略名称 '{}' 已存在", policy.name));
        }

        policies.push(policy.clone());
        Ok(policy)
    }

    pub async fn list_policies() -> Vec<SecurityPolicy> {
        let store = get_security_store();
        let policies = store.policies.lock().await;
        policies.clone()
    }

    pub async fn get_policy_by_id(id: &str) -> Option<SecurityPolicy> {
        let store = get_security_store();
        let policies = store.policies.lock().await;
        policies.iter().find(|p| p.id == id).cloned()
    }

    pub async fn update_policy(
        id: &str,
        updates: SecurityPolicy,
    ) -> Result<SecurityPolicy, String> {
        let store = get_security_store();
        let mut policies = store.policies.lock().await;

        let policy = policies
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| format!("策略 ID '{}' 不存在", id))?;

        policy.name = updates.name;
        policy.rate_limit_per_sec = updates.rate_limit_per_sec;
        policy.max_query_depth = updates.max_query_depth;
        policy.max_complexity = updates.max_complexity;
        policy.require_auth = updates.require_auth;
        policy.allowed_operations = updates.allowed_operations;
        policy.enabled = updates.enabled;

        Ok(policy.clone())
    }

    fn estimate_query_depth(query: &str) -> u32 {
        let mut depth = 0u32;
        let mut max_depth = 0u32;
        for ch in query.chars() {
            if ch == '{' {
                depth += 1;
                max_depth = max_depth.max(depth);
            } else if ch == '}' {
                depth = depth.saturating_sub(1);
            }
        }
        max_depth
    }

    fn estimate_query_complexity(query: &str) -> u32 {
        let open_braces = query.chars().filter(|&c| c == '{').count() as u32;
        let close_braces = query.chars().filter(|&c| c == '}').count() as u32;
        let fields = query.chars().filter(|&c| c == ':').count() as u32;
        open_braces * 10 + close_braces * 5 + fields * 2
    }
}

// ==================== ZeroTrustEngine 实现 ====================

pub struct ZeroTrustEngine;

impl ZeroTrustEngine {
    pub async fn evaluate_trust(
        identity: &str,
        context: IdentityContext,
    ) -> Result<TrustDecision, String> {
        let store = get_security_store();

        let mut risk_score = 0.0f64;
        let mut risk_factors = Vec::new();

        if context.ip.is_none() {
            risk_score += 0.3;
            risk_factors.push("missing_ip".to_string());
        }

        if context.user_id.is_none() {
            risk_score += 0.4;
            risk_factors.push("unauthenticated".to_string());
        }

        if context.device_id.is_none() {
            risk_score += 0.2;
            risk_factors.push("unknown_device".to_string());
        }

        if !context.mfa_completed {
            risk_score += 0.2;
            risk_factors.push("mfa_not_completed".to_string());
        }

        if context.location.is_none() {
            risk_score += 0.1;
            risk_factors.push("unknown_location".to_string());
        }

        let policies = store.identity_policies.lock().await;
        let applicable_policy = policies.iter().find(|p| p.enabled).cloned();
        drop(policies);

        let (decision, reason) = if let Some(ref policy) = applicable_policy {
            if risk_score >= policy.risk_threshold {
                (
                    TrustDecisionType::Deny,
                    format!(
                        "风险分数 {:.2} 超过阈值 {:.2}",
                        risk_score, policy.risk_threshold
                    ),
                )
            } else if policy.require_mfa && !context.mfa_completed {
                (
                    TrustDecisionType::Challenge,
                    "需要完成 MFA 验证".to_string(),
                )
            } else if risk_score >= 0.5 {
                (
                    TrustDecisionType::Challenge,
                    format!("风险分数较高 {:.2}, 需要额外验证", risk_score),
                )
            } else {
                (
                    TrustDecisionType::Allow,
                    format!("风险分数 {:.2} 在安全范围内", risk_score),
                )
            }
        } else {
            if risk_score >= 0.7 {
                (
                    TrustDecisionType::Deny,
                    format!("风险分数 {:.2} 超过默认阈值 0.7", risk_score),
                )
            } else if risk_score >= 0.4 {
                (
                    TrustDecisionType::Challenge,
                    format!("风险分数 {:.2}, 需要额外验证", risk_score),
                )
            } else {
                (
                    TrustDecisionType::Allow,
                    format!("风险分数 {:.2} 在安全范围内", risk_score),
                )
            }
        };

        let trust_decision = TrustDecision {
            id: uuid::Uuid::new_v4().to_string(),
            identity: identity.to_string(),
            context: context.clone(),
            risk_score,
            decision,
            reason,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut decisions = store.trust_decisions.lock().await;
        decisions.push(trust_decision.clone());

        if let Some(session_id) = &context.session_id {
            let mut session_trusts = store.session_trusts.lock().await;
            session_trusts.insert(
                session_id.clone(),
                SessionTrust {
                    session_id: session_id.clone(),
                    trust_score: 1.0 - risk_score,
                    decision: trust_decision.decision.clone(),
                    risk_factors,
                },
            );
        }

        Ok(trust_decision)
    }

    pub async fn get_trust_score(identity: &str) -> Result<f64, String> {
        let store = get_security_store();
        let decisions = store.trust_decisions.lock().await;

        let latest = decisions.iter().rfind(|d| d.identity == identity);

        match latest {
            Some(d) => Ok(1.0 - d.risk_score),
            None => Ok(0.5),
        }
    }

    pub async fn verify_identity(identity: &str, context: IdentityContext) -> Result<bool, String> {
        let store = get_security_store();

        let policies = store.identity_policies.lock().await;
        let applicable = policies.iter().find(|p| p.enabled);

        if let Some(policy) = applicable {
            if policy.require_mfa && !context.mfa_completed {
                return Ok(false);
            }
        }

        if identity.is_empty() {
            return Ok(false);
        }

        Ok(true)
    }

    pub async fn create_identity_policy(policy: IdentityPolicy) -> Result<IdentityPolicy, String> {
        let store = get_security_store();
        let mut policies = store.identity_policies.lock().await;

        if policies.iter().any(|p| p.name == policy.name) {
            return Err(format!("策略名称 '{}' 已存在", policy.name));
        }

        policies.push(policy.clone());
        Ok(policy)
    }

    pub async fn list_identity_policies() -> Vec<IdentityPolicy> {
        let store = get_security_store();
        let policies = store.identity_policies.lock().await;
        policies.clone()
    }

    pub async fn get_session_trust(session_id: &str) -> Option<SessionTrust> {
        let store = get_security_store();
        let session_trusts = store.session_trusts.lock().await;
        session_trusts.get(session_id).cloned()
    }
}

// ==================== DataMasker 实现 ====================

pub struct DataMasker;

impl DataMasker {
    pub async fn mask_response(
        data: serde_json::Value,
        user_roles: Vec<String>,
    ) -> Result<serde_json::Value, String> {
        let store = get_security_store();

        let applicable: Vec<MaskingRule> = {
            let rules = store.masking_rules.lock().await;
            rules
                .iter()
                .filter(|r| {
                    r.enabled
                        && (r.applied_to.is_empty()
                            || r.applied_to.iter().any(|role| user_roles.contains(role)))
                })
                .cloned()
                .collect()
        };

        if applicable.is_empty() {
            return Ok(data);
        }

        let mut result = data.clone();

        for rule in &applicable {
            if let Some(value) = Self::get_nested_mut(&mut result, &rule.field_path) {
                let original = serde_json::to_string(value).unwrap_or_default();
                let masked_value = Self::apply_mask(value, rule);
                let masked_str = serde_json::to_string(&masked_value).unwrap_or_default();

                let mut masked_fields = store.masked_fields.lock().await;
                masked_fields.push(MaskedField {
                    original,
                    masked: masked_str,
                    rule_id: rule.id.clone(),
                    applied_at: chrono::Utc::now().to_rfc3339(),
                });
            }
        }

        Ok(result)
    }

    pub async fn add_masking_rule(rule: MaskingRule) -> Result<MaskingRule, String> {
        let store = get_security_store();
        let mut rules = store.masking_rules.lock().await;
        rules.push(rule.clone());
        Ok(rule)
    }

    pub async fn list_masking_rules() -> Vec<MaskingRule> {
        let store = get_security_store();
        let rules = store.masking_rules.lock().await;
        rules.clone()
    }

    pub async fn remove_masking_rule(id: &str) -> Result<bool, String> {
        let store = get_security_store();
        let mut rules = store.masking_rules.lock().await;
        let len_before = rules.len();
        rules.retain(|r| r.id != id);
        Ok(rules.len() < len_before)
    }

    pub async fn preview_masking(
        data: serde_json::Value,
        rule_ids: Vec<String>,
    ) -> Result<serde_json::Value, String> {
        let store = get_security_store();

        let selected: Vec<MaskingRule> = {
            let rules = store.masking_rules.lock().await;
            rules
                .iter()
                .filter(|r| rule_ids.contains(&r.id))
                .cloned()
                .collect()
        };

        let mut result = data.clone();

        for rule in &selected {
            if let Some(value) = Self::get_nested_mut(&mut result, &rule.field_path) {
                let masked_value = Self::apply_mask(value, rule);
                *value = masked_value;
            }
        }

        Ok(result)
    }

    pub async fn get_field_rules(field_path: &str) -> Vec<MaskingRule> {
        let store = get_security_store();
        let rules = store.masking_rules.lock().await;
        rules
            .iter()
            .filter(|r| r.field_path == field_path)
            .cloned()
            .collect()
    }

    fn get_nested_mut<'a>(
        value: &'a mut serde_json::Value,
        path: &str,
    ) -> Option<&'a mut serde_json::Value> {
        let keys: Vec<&str> = path.split('.').collect();
        let mut current = value;

        for key in keys {
            current = current.as_object_mut()?.get_mut(key)?;
        }

        Some(current)
    }

    fn apply_mask(value: &serde_json::Value, rule: &MaskingRule) -> serde_json::Value {
        match rule.mask_type {
            MaskType::Full => serde_json::Value::String("***".to_string()),
            MaskType::Partial => {
                if let Some(s) = value.as_str() {
                    let len = s.len();
                    if len <= 4 {
                        serde_json::Value::String("***".to_string())
                    } else {
                        let visible_len = (len as f64 * 0.3).floor() as usize;
                        let masked = format!(
                            "{}{}{}",
                            &s[..visible_len],
                            "****",
                            &s[len.saturating_sub(visible_len)..]
                        );
                        serde_json::Value::String(masked)
                    }
                } else {
                    value.clone()
                }
            }
            MaskType::Hash => {
                if let Some(s) = value.as_str() {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    let mut hasher = DefaultHasher::new();
                    s.hash(&mut hasher);
                    let hash = format!("{:016x}", hasher.finish());
                    serde_json::Value::String(format!("{}...", &hash[..8]))
                } else {
                    value.clone()
                }
            }
            MaskType::Range => {
                if let Some(n) = value.as_i64() {
                    let range = rule.pattern.as_deref().unwrap_or("1000");
                    let range_val: i64 = range.parse().unwrap_or(1000);
                    let bucket = (n / range_val) * range_val;
                    serde_json::json!({
                        "min": bucket,
                        "max": bucket + range_val - 1,
                    })
                } else {
                    value.clone()
                }
            }
            MaskType::Null => serde_json::Value::Null,
        }
    }
}

// ==================== 请求 / 响应结构 ====================

// --- Security Gateway 请求 ---

#[derive(Debug, Deserialize)]
pub struct ValidateQueryRequest {
    pub query: String,
    pub client_ip: Option<String>,
    pub policy_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePolicyRequest {
    pub name: String,
    pub rate_limit_per_sec: Option<u32>,
    pub max_query_depth: Option<u32>,
    pub max_complexity: Option<u32>,
    pub require_auth: Option<bool>,
    pub allowed_operations: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePolicyRequest {
    pub name: Option<String>,
    pub rate_limit_per_sec: Option<u32>,
    pub max_query_depth: Option<u32>,
    pub max_complexity: Option<u32>,
    pub require_auth: Option<bool>,
    pub allowed_operations: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SecurityEventsQuery {
    pub event_type: Option<String>,
    pub limit: Option<u64>,
}

// --- Zero Trust 请求 ---

#[derive(Debug, Deserialize)]
pub struct EvaluateTrustRequest {
    pub identity: String,
    pub context: Option<IdentityContext>,
}

#[derive(Debug, Deserialize)]
pub struct CreateIdentityPolicyRequest {
    pub name: String,
    pub description: Option<String>,
    pub risk_threshold: Option<f64>,
    pub require_mfa: Option<bool>,
    pub allowed_locations: Option<Vec<String>>,
    pub allowed_devices: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

// --- Data Masking 请求 ---

#[derive(Debug, Deserialize)]
pub struct MaskResponseRequest {
    pub data: serde_json::Value,
    pub user_roles: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct AddMaskingRuleRequest {
    pub field_path: String,
    pub mask_type: String,
    pub pattern: Option<String>,
    pub applied_to: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PreviewMaskingRequest {
    pub data: serde_json::Value,
    pub rule_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct FieldRulesQuery {
    pub field_path: Option<String>,
}

// ==================== API 处理器: Security Gateway ====================

pub async fn validate_query_handler(
    State(_state): State<AppState>,
    Json(req): Json<ValidateQueryRequest>,
) -> Json<ApiResponse<ValidationResult>> {
    match SecurityGateway::validate_query(
        &req.query,
        req.client_ip.as_deref(),
        req.policy_id.as_deref(),
    )
    .await
    {
        Ok(result) => {
            if result.valid {
                Json(ApiResponse::success(result, "查询验证通过"))
            } else {
                Json(ApiResponse::error(
                    400,
                    result.reason.as_deref().unwrap_or("查询验证失败"),
                ))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_security_events_handler(
    State(_state): State<AppState>,
    Query(params): Query<SecurityEventsQuery>,
) -> Json<ApiResponse<Vec<SecurityEvent>>> {
    let event_type = params
        .event_type
        .as_deref()
        .and_then(SecurityEventType::from_str);
    let events = SecurityGateway::get_security_events(event_type, params.limit).await;
    Json(ApiResponse::success(events, "安全事件列表"))
}

pub async fn create_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreatePolicyRequest>,
) -> Json<ApiResponse<SecurityPolicy>> {
    let policy = SecurityPolicy {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        rate_limit_per_sec: req.rate_limit_per_sec.unwrap_or(100),
        max_query_depth: req.max_query_depth.unwrap_or(10),
        max_complexity: req.max_complexity.unwrap_or(1000),
        require_auth: req.require_auth.unwrap_or(true),
        allowed_operations: req
            .allowed_operations
            .unwrap_or_else(|| vec!["query".to_string(), "mutation".to_string()]),
        enabled: req.enabled.unwrap_or(true),
    };

    match SecurityGateway::create_policy(policy).await {
        Ok(p) => Json(ApiResponse::success(p, "安全策略创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn list_policies_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<SecurityPolicy>>> {
    let policies = SecurityGateway::list_policies().await;
    Json(ApiResponse::success(policies, "安全策略列表"))
}

pub async fn update_policy_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdatePolicyRequest>,
) -> Json<ApiResponse<SecurityPolicy>> {
    let existing = match SecurityGateway::get_policy_by_id(&id).await {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "策略不存在")),
    };

    let updates = SecurityPolicy {
        id: id.clone(),
        name: req.name.unwrap_or(existing.name),
        rate_limit_per_sec: req
            .rate_limit_per_sec
            .unwrap_or(existing.rate_limit_per_sec),
        max_query_depth: req.max_query_depth.unwrap_or(existing.max_query_depth),
        max_complexity: req.max_complexity.unwrap_or(existing.max_complexity),
        require_auth: req.require_auth.unwrap_or(existing.require_auth),
        allowed_operations: req
            .allowed_operations
            .unwrap_or(existing.allowed_operations),
        enabled: req.enabled.unwrap_or(existing.enabled),
    };

    match SecurityGateway::update_policy(&id, updates).await {
        Ok(p) => Json(ApiResponse::success(p, "安全策略更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: Zero Trust ====================

pub async fn evaluate_trust_handler(
    State(_state): State<AppState>,
    Json(req): Json<EvaluateTrustRequest>,
) -> Json<ApiResponse<TrustDecision>> {
    let context = req.context.unwrap_or_default();

    match ZeroTrustEngine::evaluate_trust(&req.identity, context).await {
        Ok(decision) => Json(ApiResponse::success(decision, "信任评估完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_trust_score_handler(
    State(_state): State<AppState>,
    Path(identity): Path<String>,
) -> Json<ApiResponse<f64>> {
    match ZeroTrustEngine::get_trust_score(&identity).await {
        Ok(score) => Json(ApiResponse::success(score, "信任分数")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn create_identity_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateIdentityPolicyRequest>,
) -> Json<ApiResponse<IdentityPolicy>> {
    let policy = IdentityPolicy {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        description: req.description,
        risk_threshold: req.risk_threshold.unwrap_or(0.7),
        require_mfa: req.require_mfa.unwrap_or(false),
        allowed_locations: req.allowed_locations.unwrap_or_default(),
        allowed_devices: req.allowed_devices.unwrap_or_default(),
        enabled: req.enabled.unwrap_or(true),
    };

    match ZeroTrustEngine::create_identity_policy(policy).await {
        Ok(p) => Json(ApiResponse::success(p, "身份策略创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn list_identity_policies_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<IdentityPolicy>>> {
    let policies = ZeroTrustEngine::list_identity_policies().await;
    Json(ApiResponse::success(policies, "身份策略列表"))
}

pub async fn get_session_trust_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SessionTrust>> {
    match ZeroTrustEngine::get_session_trust(&id).await {
        Some(trust) => Json(ApiResponse::success(trust, "会话信任状态")),
        None => Json(ApiResponse::error(404, "会话信任记录不存在")),
    }
}

// ==================== API 处理器: Data Masking ====================

pub async fn mask_response_handler(
    State(_state): State<AppState>,
    Json(req): Json<MaskResponseRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let roles = req.user_roles.unwrap_or_default();

    match DataMasker::mask_response(req.data, roles).await {
        Ok(masked) => Json(ApiResponse::success(masked, "数据脱敏完成")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn add_masking_rule_handler(
    State(_state): State<AppState>,
    Json(req): Json<AddMaskingRuleRequest>,
) -> Json<ApiResponse<MaskingRule>> {
    let mask_type = match MaskType::from_str(&req.mask_type) {
        Some(mt) => mt,
        None => return Json(ApiResponse::error(400, "无效的脱敏类型")),
    };

    let rule = MaskingRule {
        id: uuid::Uuid::new_v4().to_string(),
        field_path: req.field_path,
        mask_type,
        pattern: req.pattern,
        applied_to: req.applied_to.unwrap_or_default(),
        enabled: req.enabled.unwrap_or(true),
    };

    match DataMasker::add_masking_rule(rule).await {
        Ok(r) => Json(ApiResponse::success(r, "脱敏规则创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn list_masking_rules_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<MaskingRule>>> {
    let rules = DataMasker::list_masking_rules().await;
    Json(ApiResponse::success(rules, "脱敏规则列表"))
}

pub async fn remove_masking_rule_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match DataMasker::remove_masking_rule(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "脱敏规则删除成功")),
        Ok(false) => Json(ApiResponse::error(404, "脱敏规则不存在")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn preview_masking_handler(
    State(_state): State<AppState>,
    Json(req): Json<PreviewMaskingRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match DataMasker::preview_masking(req.data, req.rule_ids).await {
        Ok(preview) => Json(ApiResponse::success(preview, "脱敏预览")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_field_rules_handler(
    State(_state): State<AppState>,
    Query(params): Query<FieldRulesQuery>,
) -> Json<ApiResponse<Vec<MaskingRule>>> {
    let field_path = params.field_path.unwrap_or_default();
    let rules = DataMasker::get_field_rules(&field_path).await;
    Json(ApiResponse::success(rules, "字段脱敏规则"))
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
    fn test_security_event_type_roundtrip_all_variants() {
        for v in SecurityEventType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_security_event_type_as_str_from_str_all() {
        for v in SecurityEventType::all() {
            let s = v.as_str();
            let back = SecurityEventType::from_str(s);
            assert!(back.is_some());
            roundtrip(back.as_ref().unwrap());
        }
        assert_eq!(SecurityEventType::all().len(), 5);
    }

    #[test]
    fn test_trust_decision_type_roundtrip_all_variants() {
        for v in [
            TrustDecisionType::Allow,
            TrustDecisionType::Deny,
            TrustDecisionType::Challenge,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_trust_decision_type_as_str_from_str() {
        for v in [
            TrustDecisionType::Allow,
            TrustDecisionType::Deny,
            TrustDecisionType::Challenge,
        ] {
            let s = v.as_str();
            let back = TrustDecisionType::from_str(s);
            assert!(back.is_some());
            roundtrip(back.as_ref().unwrap());
        }
        assert!(TrustDecisionType::from_str("bogus").is_none());
    }

    #[test]
    fn test_mask_type_roundtrip_all_variants() {
        for v in MaskType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_mask_type_as_str_from_str_all() {
        for v in MaskType::all() {
            let s = v.as_str();
            let back = MaskType::from_str(s);
            assert!(back.is_some());
            roundtrip(back.as_ref().unwrap());
        }
        assert_eq!(MaskType::all().len(), 5);
    }

    #[test]
    fn test_security_policy_roundtrip() {
        let p = SecurityPolicy {
            id: "p1".to_string(),
            name: "default".to_string(),
            rate_limit_per_sec: 100,
            max_query_depth: 10,
            max_complexity: 1000,
            require_auth: true,
            allowed_operations: vec!["query".to_string()],
            enabled: true,
        };
        roundtrip(&p);
    }

    #[test]
    fn test_security_event_roundtrip() {
        let e = SecurityEvent {
            id: "e1".to_string(),
            event_type: SecurityEventType::AuthFail,
            client_ip: Some("127.0.0.1".to_string()),
            query_hash: None,
            timestamp: "2025-01-01T00:00:00Z".to_string(),
            action: None,
            details: Some(Value::Null),
        };
        roundtrip(&e);
    }

    #[test]
    fn test_validation_result_roundtrip() {
        let r = ValidationResult {
            valid: true,
            reason: None,
            depth: Some(5),
            complexity: Some(50),
        };
        roundtrip(&r);
    }

    #[test]
    fn test_identity_context_roundtrip() {
        let c = IdentityContext {
            user_id: Some("u1".to_string()),
            session_id: None,
            device_id: None,
            ip: Some("10.0.0.1".to_string()),
            location: None,
            mfa_completed: false,
        };
        roundtrip(&c);
    }

    #[test]
    fn test_trust_decision_roundtrip() {
        let d = TrustDecision {
            id: "td1".to_string(),
            identity: "user:u1".to_string(),
            context: IdentityContext::default(),
            risk_score: 0.1,
            decision: TrustDecisionType::Allow,
            reason: "ok".to_string(),
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&d);
    }

    #[test]
    fn test_identity_policy_roundtrip() {
        let p = IdentityPolicy {
            id: "ip1".to_string(),
            name: "strict".to_string(),
            description: None,
            risk_threshold: 0.8,
            require_mfa: true,
            allowed_locations: vec!["US".to_string()],
            allowed_devices: vec![],
            enabled: true,
        };
        roundtrip(&p);
    }

    #[test]
    fn test_session_trust_roundtrip() {
        let st = SessionTrust {
            session_id: "sess1".to_string(),
            trust_score: 0.95,
            decision: TrustDecisionType::Allow,
            risk_factors: vec![],
        };
        roundtrip(&st);
    }

    #[test]
    fn test_masking_rule_roundtrip() {
        let r = MaskingRule {
            id: "mr1".to_string(),
            field_path: "user.password".to_string(),
            mask_type: MaskType::Partial,
            pattern: Some("***".to_string()),
            applied_to: vec!["user".to_string()],
            enabled: true,
        };
        roundtrip(&r);
    }

    #[test]
    fn test_masked_field_roundtrip() {
        let f = MaskedField {
            original: "secret".to_string(),
            masked: "******".to_string(),
            rule_id: "mr1".to_string(),
            applied_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&f);
    }
}
