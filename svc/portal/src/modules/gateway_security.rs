#![allow(dead_code)] // Reserved: V58 网关安全 V2 模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V58.0 BFF Phase 28: GraphQL 网关安全 V2 + 审计追踪 + 访问控制
//!
//! 核心能力：
//! 1. 网关安全 V2 (Gateway Security V2)
//!    - GatewaySecurityV2: Token 验证、认证检查、高级威胁检测
//!    - SecurityPolicyV2: 安全策略配置 (JWT/OAuth2/APIKey/MFA + 速率限制 + IP 白名单)
//!    - SecurityIncident: 安全事件记录 (UnauthorizedAccess/TokenExpired/RateLimitBreach/SQLInjection/XSS)
//! 2. 审计追踪 (Audit Trail)
//!    - AuditTrailV2: 不可变追加式审计日志
//!    - AuditEntryV2: 审计条目 (actor/action/resource/变更前后值/关联 ID)
//!    - AuditFilter: 审计查询过滤器
//! 3. 访问控制 (Access Control)
//!    - AccessControlV2: ABAC + RBAC 混合访问控制
//!    - AccessPolicy: 访问策略 (资源类型/模式/动作/效果/条件/优先级)
//!    - AccessDecision: 访问决策 (Allow/Deny/Challenge)

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
    authentication_type VARCHAR(32) NOT NULL DEFAULT 'jwt',
    token_validity_sec INT NOT NULL DEFAULT 3600,
    rate_limit_per_min INT NOT NULL DEFAULT 100,
    ip_whitelist JSONB NOT NULL DEFAULT '[]',
    require_https BOOLEAN NOT NULL DEFAULT TRUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_auth_type ON portal_security_policies(authentication_type);
CREATE INDEX IF NOT EXISTS idx_sp_enabled ON portal_security_policies(enabled);
"#;

pub const CREATE_SECURITY_INCIDENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_security_incidents (
    id VARCHAR(64) PRIMARY KEY,
    incident_type VARCHAR(32) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'medium',
    source_ip VARCHAR(64),
    user_agent TEXT,
    payload JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_si_type ON portal_security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_si_severity ON portal_security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_si_ip ON portal_security_incidents(source_ip);
CREATE INDEX IF NOT EXISTS idx_si_detected ON portal_security_incidents(detected_at DESC);
"#;

pub const CREATE_AUDIT_ENTRIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_audit_entries (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(128),
    actor_type VARCHAR(32) NOT NULL DEFAULT 'user',
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(128) NOT NULL,
    resource_id VARCHAR(128),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(64),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    correlation_id VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_ae_actor ON portal_audit_entries(actor_id);
CREATE INDEX IF NOT EXISTS idx_ae_action ON portal_audit_entries(action);
CREATE INDEX IF NOT EXISTS idx_ae_resource ON portal_audit_entries(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_ae_timestamp ON portal_audit_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ae_correlation ON portal_audit_entries(correlation_id);
"#;

pub const CREATE_AUDIT_EXPORTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_audit_exports (
    id VARCHAR(64) PRIMARY KEY,
    format VARCHAR(16) NOT NULL DEFAULT 'json',
    filter JSONB,
    created_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
"#;

pub const CREATE_ACCESS_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_access_policies (
    id VARCHAR(64) PRIMARY KEY,
    resource_type VARCHAR(128) NOT NULL,
    resource_pattern VARCHAR(256) NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]',
    effect VARCHAR(16) NOT NULL DEFAULT 'allow',
    conditions JSONB,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ap_resource ON portal_access_policies(resource_type);
CREATE INDEX IF NOT EXISTS idx_ap_effect ON portal_access_policies(effect);
CREATE INDEX IF NOT EXISTS idx_ap_priority ON portal_access_policies(priority DESC);
"#;

pub const CREATE_ACCESS_DECISIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_access_decisions (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(128),
    actor_id VARCHAR(128),
    resource VARCHAR(256),
    action VARCHAR(128),
    decision VARCHAR(16) NOT NULL DEFAULT 'allow',
    reason TEXT,
    matched_policy_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_actor ON portal_access_decisions(actor_id);
CREATE INDEX IF NOT EXISTS idx_ad_decision ON portal_access_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_ad_created ON portal_access_decisions(created_at DESC);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthenticationType {
    JWT,
    OAuth2,
    APIKey,
    MFA,
}

impl AuthenticationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::JWT => "jwt",
            Self::OAuth2 => "oauth2",
            Self::APIKey => "api_key",
            Self::MFA => "mfa",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "jwt" => Some(Self::JWT),
            "oauth2" => Some(Self::OAuth2),
            "api_key" => Some(Self::APIKey),
            "mfa" => Some(Self::MFA),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::JWT, Self::OAuth2, Self::APIKey, Self::MFA]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IncidentType {
    UnauthorizedAccess,
    TokenExpired,
    RateLimitBreach,
    SQLInjection,
    XSS,
}

impl IncidentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::UnauthorizedAccess => "unauthorized_access",
            Self::TokenExpired => "token_expired",
            Self::RateLimitBreach => "rate_limit_breach",
            Self::SQLInjection => "sql_injection",
            Self::XSS => "xss",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "unauthorized_access" => Some(Self::UnauthorizedAccess),
            "token_expired" => Some(Self::TokenExpired),
            "rate_limit_breach" => Some(Self::RateLimitBreach),
            "sql_injection" => Some(Self::SQLInjection),
            "xss" => Some(Self::XSS),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::UnauthorizedAccess,
            Self::TokenExpired,
            Self::RateLimitBreach,
            Self::SQLInjection,
            Self::XSS,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Severity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "low" => Some(Self::Low),
            "medium" => Some(Self::Medium),
            "high" => Some(Self::High),
            "critical" => Some(Self::Critical),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Low, Self::Medium, Self::High, Self::Critical]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActorType {
    User,
    Service,
    System,
}

impl ActorType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Service => "service",
            Self::System => "system",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "user" => Some(Self::User),
            "service" => Some(Self::Service),
            "system" => Some(Self::System),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccessEffect {
    Allow,
    Deny,
}

impl AccessEffect {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Allow => "allow",
            Self::Deny => "deny",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "allow" => Some(Self::Allow),
            "deny" => Some(Self::Deny),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccessDecisionType {
    Allow,
    Deny,
    Challenge,
}

impl AccessDecisionType {
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

// ==================== 核心结构体 ====================

// --- Gateway Security V2 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicyV2 {
    pub id: String,
    pub name: String,
    pub authentication_type: AuthenticationType,
    pub token_validity_sec: u32,
    pub rate_limit_per_min: u32,
    pub ip_whitelist: Vec<String>,
    pub require_https: bool,
    pub enabled: bool,
}

impl Default for SecurityPolicyV2 {
    fn default() -> Self {
        const TOKEN_VALIDITY_1H: u32 = 60 * 60;
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: "default".to_string(),
            authentication_type: AuthenticationType::JWT,
            token_validity_sec: TOKEN_VALIDITY_1H,
            rate_limit_per_min: 100,
            ip_whitelist: Vec::new(),
            require_https: true,
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityIncident {
    pub id: String,
    pub incident_type: IncidentType,
    pub severity: Severity,
    pub source_ip: Option<String>,
    pub user_agent: Option<String>,
    pub payload: Option<serde_json::Value>,
    pub detected_at: String,
}

impl SecurityIncident {
    pub fn new(
        incident_type: IncidentType,
        severity: Severity,
        source_ip: Option<String>,
        user_agent: Option<String>,
        payload: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            incident_type,
            severity,
            source_ip,
            user_agent,
            payload,
            detected_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenValidationResult {
    pub valid: bool,
    pub reason: Option<String>,
    pub policy_id: Option<String>,
}

// --- Audit Trail ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntryV2 {
    pub id: String,
    pub actor_id: Option<String>,
    pub actor_type: ActorType,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub timestamp: String,
    pub correlation_id: Option<String>,
}

impl AuditEntryV2 {
    pub fn new(
        actor_id: Option<String>,
        actor_type: ActorType,
        action: String,
        resource_type: String,
        resource_id: Option<String>,
        old_value: Option<serde_json::Value>,
        new_value: Option<serde_json::Value>,
        ip_address: Option<String>,
        correlation_id: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            actor_id,
            actor_type,
            action,
            resource_type,
            resource_id,
            old_value,
            new_value,
            ip_address,
            timestamp: chrono::Utc::now().to_rfc3339(),
            correlation_id,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AuditFilter {
    pub actor_id: Option<String>,
    pub action: Option<String>,
    pub resource_type: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub severity: Option<Severity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditSummary {
    pub total_entries: usize,
    pub by_action: HashMap<String, usize>,
    pub by_resource_type: HashMap<String, usize>,
    pub by_actor_type: HashMap<String, usize>,
    pub date_range: Option<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditExport {
    pub id: String,
    pub format: String,
    pub filter: AuditFilter,
    pub created_by: Option<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
}

// --- Access Control ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPolicy {
    pub id: String,
    pub resource_type: String,
    pub resource_pattern: String,
    pub actions: Vec<String>,
    pub effect: AccessEffect,
    pub conditions: Option<serde_json::Value>,
    pub priority: i32,
}

impl Default for AccessPolicy {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            resource_type: String::new(),
            resource_pattern: String::new(),
            actions: Vec::new(),
            effect: AccessEffect::Allow,
            conditions: None,
            priority: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessDecision {
    pub id: String,
    pub request_id: Option<String>,
    pub actor_id: String,
    pub resource: String,
    pub action: String,
    pub decision: AccessDecisionType,
    pub reason: String,
    pub matched_policy_id: Option<String>,
}

impl AccessDecision {
    pub fn new(
        request_id: Option<String>,
        actor_id: String,
        resource: String,
        action: String,
        decision: AccessDecisionType,
        reason: String,
        matched_policy_id: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            request_id,
            actor_id,
            resource,
            action,
            decision,
            reason,
            matched_policy_id,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPermissions {
    pub user_id: String,
    pub roles: Vec<String>,
    pub allowed_actions: Vec<String>,
    pub denied_actions: Vec<String>,
}

// ==================== 内存存储 ====================

struct GatewaySecurityStore {
    policies: Mutex<Vec<SecurityPolicyV2>>,
    incidents: Mutex<Vec<SecurityIncident>>,
    rate_limits: Mutex<HashMap<String, Vec<(String, std::time::Instant)>>>,
    audit_entries: Mutex<Vec<AuditEntryV2>>,
    audit_exports: Mutex<Vec<AuditExport>>,
    access_policies: Mutex<Vec<AccessPolicy>>,
    access_decisions: Mutex<Vec<AccessDecision>>,
    user_permissions: Mutex<HashMap<String, UserPermissions>>,
    revoked_tokens: Mutex<Vec<String>>,
}

fn get_gateway_security_store() -> &'static GatewaySecurityStore {
    static STORE: LazyLock<GatewaySecurityStore> = LazyLock::new(|| {
        let default_policy = SecurityPolicyV2::default();
        GatewaySecurityStore {
            policies: Mutex::new(vec![default_policy]),
            incidents: Mutex::new(Vec::new()),
            rate_limits: Mutex::new(HashMap::new()),
            audit_entries: Mutex::new(Vec::new()),
            audit_exports: Mutex::new(Vec::new()),
            access_policies: Mutex::new(Vec::new()),
            access_decisions: Mutex::new(Vec::new()),
            user_permissions: Mutex::new(HashMap::new()),
            revoked_tokens: Mutex::new(Vec::new()),
        }
    });
    &STORE
}

// ==================== GatewaySecurityV2 实现 ====================

pub struct GatewaySecurityV2;

impl GatewaySecurityV2 {
    pub async fn validate_token(
        token: &str,
        policy_id: Option<&str>,
    ) -> Result<TokenValidationResult, String> {
        let store = get_gateway_security_store();

        if token.is_empty() {
            return Ok(TokenValidationResult {
                valid: false,
                reason: Some("Token 不能为空".to_string()),
                policy_id: None,
            });
        }

        let revoked = store.revoked_tokens.lock().await;
        if revoked.contains(&token.to_string()) {
            return Ok(TokenValidationResult {
                valid: false,
                reason: Some("Token 已被吊销".to_string()),
                policy_id: policy_id.map(|s| s.to_string()),
            });
        }
        drop(revoked);

        let policy = if let Some(pid) = policy_id {
            let policies = store.policies.lock().await;
            policies.iter().find(|p| p.id == pid).cloned()
        } else {
            let policies = store.policies.lock().await;
            policies.iter().find(|p| p.enabled).cloned()
        };

        let policy = policy.ok_or_else(|| "未找到有效的安全策略".to_string())?;

        Ok(TokenValidationResult {
            valid: true,
            reason: None,
            policy_id: Some(policy.id),
        })
    }

    pub async fn check_authentication(
        token: &str,
        policy_id: Option<&str>,
    ) -> Result<bool, String> {
        let result = Self::validate_token(token, policy_id).await?;
        Ok(result.valid)
    }

    pub async fn detect_threat(
        source_ip: Option<&str>,
        user_agent: Option<&str>,
        payload: Option<&serde_json::Value>,
    ) -> Option<SecurityIncident> {
        let mut threats_detected: Vec<(IncidentType, Severity, String)> = Vec::new();

        if let Some(ua) = user_agent {
            let lower = ua.to_lowercase();
            let sql_patterns = ["union select", "or 1=1", "drop table", "insert into", "--"];
            for pattern in &sql_patterns {
                if lower.contains(pattern) {
                    threats_detected.push((
                        IncidentType::SQLInjection,
                        Severity::Critical,
                        format!("User-Agent 包含 SQL 注入特征: {}", pattern),
                    ));
                    break;
                }
            }

            let xss_patterns = ["<script", "javascript:", "onerror=", "onload="];
            for pattern in &xss_patterns {
                if lower.contains(pattern) {
                    threats_detected.push((
                        IncidentType::XSS,
                        Severity::High,
                        format!("User-Agent 包含 XSS 特征: {}", pattern),
                    ));
                    break;
                }
            }
        }

        if let Some(body) = payload {
            let body_str = serde_json::to_string(body).unwrap_or_default();
            let lower_body = body_str.to_lowercase();

            let sql_patterns = [
                "union select",
                "or 1=1",
                "drop table",
                "';--",
                "xp_cmdshell",
            ];
            for pattern in &sql_patterns {
                if lower_body.contains(pattern) {
                    threats_detected.push((
                        IncidentType::SQLInjection,
                        Severity::Critical,
                        format!("Payload 包含 SQL 注入特征: {}", pattern),
                    ));
                    break;
                }
            }

            let xss_patterns = ["<script>", "javascript:", "onerror=", "onload="];
            for pattern in &xss_patterns {
                if lower_body.contains(pattern) {
                    threats_detected.push((
                        IncidentType::XSS,
                        Severity::High,
                        format!("Payload 包含 XSS 特征: {}", pattern),
                    ));
                    break;
                }
            }
        }

        if threats_detected.is_empty() {
            return None;
        }

        let (incident_type, severity, _reason) = threats_detected.remove(0);
        let incident = SecurityIncident::new(
            incident_type,
            severity,
            source_ip.map(|s| s.to_string()),
            user_agent.map(|s| s.to_string()),
            payload.cloned(),
        );

        let store = get_gateway_security_store();
        let mut incidents = store.incidents.lock().await;
        incidents.push(incident.clone());

        Some(incident)
    }

    pub async fn record_incident(incident: SecurityIncident) {
        let store = get_gateway_security_store();
        let mut incidents = store.incidents.lock().await;
        incidents.push(incident);
    }

    pub async fn get_incidents(
        incident_type: Option<IncidentType>,
        severity: Option<Severity>,
        limit: Option<u64>,
    ) -> Vec<SecurityIncident> {
        let store = get_gateway_security_store();
        let incidents = store.incidents.lock().await;
        let limit = limit.unwrap_or(100).min(500) as usize;

        let filtered: Vec<SecurityIncident> = incidents
            .iter()
            .filter(|i| {
                incident_type
                    .as_ref()
                    .map_or(true, |t| &i.incident_type == t)
                    && severity.as_ref().map_or(true, |s| &i.severity == s)
            })
            .cloned()
            .collect();

        filtered.into_iter().rev().take(limit).collect()
    }

    pub async fn check_rate_limit(
        identifier: &str,
        policy_id: Option<&str>,
    ) -> Result<bool, String> {
        let store = get_gateway_security_store();

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

        entries.retain(|(_, t)| now.duration_since(*t).as_secs() < 60);

        if entries.len() >= policy.rate_limit_per_min as usize {
            let incident = SecurityIncident::new(
                IncidentType::RateLimitBreach,
                Severity::Medium,
                Some(identifier.to_string()),
                None,
                Some(serde_json::json!({
                    "rate_limit_per_min": policy.rate_limit_per_min,
                })),
            );
            drop(rate_limits);
            let mut incidents = store.incidents.lock().await;
            incidents.push(incident);
            return Ok(false);
        }

        entries.push((identifier.to_string(), now));
        Ok(true)
    }

    pub async fn create_policy(policy: SecurityPolicyV2) -> Result<SecurityPolicyV2, String> {
        let store = get_gateway_security_store();
        let mut policies = store.policies.lock().await;

        if policies.iter().any(|p| p.name == policy.name) {
            return Err(format!("策略名称 '{}' 已存在", policy.name));
        }

        policies.push(policy.clone());
        Ok(policy)
    }

    pub async fn list_policies() -> Vec<SecurityPolicyV2> {
        let store = get_gateway_security_store();
        let policies = store.policies.lock().await;
        policies.clone()
    }

    pub async fn get_policy_by_id(id: &str) -> Option<SecurityPolicyV2> {
        let store = get_gateway_security_store();
        let policies = store.policies.lock().await;
        policies.iter().find(|p| p.id == id).cloned()
    }

    pub async fn update_policy(
        id: &str,
        updates: SecurityPolicyV2,
    ) -> Result<SecurityPolicyV2, String> {
        let store = get_gateway_security_store();
        let mut policies = store.policies.lock().await;

        let policy = policies
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| format!("策略 ID '{}' 不存在", id))?;

        policy.name = updates.name;
        policy.authentication_type = updates.authentication_type;
        policy.token_validity_sec = updates.token_validity_sec;
        policy.rate_limit_per_min = updates.rate_limit_per_min;
        policy.ip_whitelist = updates.ip_whitelist;
        policy.require_https = updates.require_https;
        policy.enabled = updates.enabled;

        Ok(policy.clone())
    }

    pub async fn revoke_token(token: &str) {
        let store = get_gateway_security_store();
        let mut revoked = store.revoked_tokens.lock().await;
        if !revoked.contains(&token.to_string()) {
            revoked.push(token.to_string());
        }
    }

    pub async fn is_ip_allowed(ip: &str, policy_id: Option<&str>) -> bool {
        let store = get_gateway_security_store();
        let policies = store.policies.lock().await;

        let policy = if let Some(pid) = policy_id {
            policies.iter().find(|p| p.id == pid)
        } else {
            policies.iter().find(|p| p.enabled)
        };

        match policy {
            Some(p) if !p.ip_whitelist.is_empty() => p.ip_whitelist.contains(&ip.to_string()),
            _ => true,
        }
    }
}

// ==================== AuditTrailV2 实现 ====================

pub struct AuditTrailV2;

impl AuditTrailV2 {
    pub async fn write_audit(entry: AuditEntryV2) -> Result<AuditEntryV2, String> {
        let store = get_gateway_security_store();
        let mut entries = store.audit_entries.lock().await;
        entries.push(entry.clone());
        Ok(entry)
    }

    pub async fn query_audit(filter: AuditFilter) -> Vec<AuditEntryV2> {
        let store = get_gateway_security_store();
        let entries = store.audit_entries.lock().await;

        entries
            .iter()
            .filter(|e| {
                filter
                    .actor_id
                    .as_ref()
                    .map_or(true, |a| e.actor_id.as_ref().map_or(false, |ai| ai == a))
                    && filter.action.as_ref().map_or(true, |a| &e.action == a)
                    && filter
                        .resource_type
                        .as_ref()
                        .map_or(true, |r| &e.resource_type == r)
                    && filter
                        .date_from
                        .as_ref()
                        .map_or(true, |d| e.timestamp >= *d)
                    && filter.date_to.as_ref().map_or(true, |d| e.timestamp <= *d)
            })
            .cloned()
            .collect()
    }

    pub async fn get_audit_by_actor(actor_id: &str) -> Vec<AuditEntryV2> {
        let store = get_gateway_security_store();
        let entries = store.audit_entries.lock().await;

        entries
            .iter()
            .filter(|e| e.actor_id.as_ref().map_or(false, |a| a == actor_id))
            .cloned()
            .collect()
    }

    pub async fn get_audit_by_resource(
        resource_type: &str,
        resource_id: Option<&str>,
    ) -> Vec<AuditEntryV2> {
        let store = get_gateway_security_store();
        let entries = store.audit_entries.lock().await;

        entries
            .iter()
            .filter(|e| {
                e.resource_type == resource_type
                    && resource_id.map_or(true, |rid| {
                        e.resource_id.as_ref().map_or(false, |eid| eid == rid)
                    })
            })
            .cloned()
            .collect()
    }

    pub async fn get_audit_by_time_range(from: &str, to: &str) -> Vec<AuditEntryV2> {
        let store = get_gateway_security_store();
        let entries = store.audit_entries.lock().await;

        entries
            .iter()
            .filter(|e| e.timestamp.as_str() >= from && e.timestamp.as_str() <= to)
            .cloned()
            .collect()
    }

    pub async fn get_audit_summary(filter: AuditFilter) -> AuditSummary {
        let entries = Self::query_audit(filter).await;

        let mut by_action = HashMap::new();
        let mut by_resource_type = HashMap::new();
        let mut by_actor_type = HashMap::new();
        let mut min_ts: Option<String> = None;
        let mut max_ts: Option<String> = None;

        for entry in &entries {
            *by_action.entry(entry.action.clone()).or_insert(0) += 1;
            *by_resource_type
                .entry(entry.resource_type.clone())
                .or_insert(0) += 1;
            *by_actor_type
                .entry(entry.actor_type.as_str().to_string())
                .or_insert(0) += 1;

            if let Some(ref ts) = min_ts {
                if &entry.timestamp < ts {
                    min_ts = Some(entry.timestamp.clone());
                }
            } else {
                min_ts = Some(entry.timestamp.clone());
            }

            if let Some(ref ts) = max_ts {
                if &entry.timestamp > ts {
                    max_ts = Some(entry.timestamp.clone());
                }
            } else {
                max_ts = Some(entry.timestamp.clone());
            }
        }

        AuditSummary {
            total_entries: entries.len(),
            by_action,
            by_resource_type,
            by_actor_type,
            date_range: match (min_ts, max_ts) {
                (Some(min), Some(max)) => Some((min, max)),
                _ => None,
            },
        }
    }

    pub async fn export_audit(
        filter: AuditFilter,
        format: &str,
        created_by: Option<String>,
    ) -> Result<AuditExport, String> {
        let _entries = Self::query_audit(filter.clone()).await;

        let export = AuditExport {
            id: uuid::Uuid::new_v4().to_string(),
            format: format.to_string(),
            filter,
            created_by,
            created_at: chrono::Utc::now().to_rfc3339(),
            expires_at: None,
        };

        let store = get_gateway_security_store();
        let mut exports = store.audit_exports.lock().await;
        exports.push(export.clone());

        Ok(export)
    }

    pub async fn list_exports() -> Vec<AuditExport> {
        let store = get_gateway_security_store();
        let exports = store.audit_exports.lock().await;
        exports.clone()
    }

    pub async fn get_entries(limit: Option<u64>) -> Vec<AuditEntryV2> {
        let store = get_gateway_security_store();
        let entries = store.audit_entries.lock().await;
        let limit = limit.unwrap_or(100).min(500) as usize;
        entries.iter().rev().take(limit).cloned().collect()
    }
}

// ==================== AccessControlV2 实现 ====================

pub struct AccessControlV2;

impl AccessControlV2 {
    pub async fn evaluate_access(actor_id: &str, resource: &str, action: &str) -> AccessDecision {
        let store = get_gateway_security_store();
        let policies = store.access_policies.lock().await;

        let mut matched_allow: Option<&AccessPolicy> = None;
        let mut matched_deny: Option<&AccessPolicy> = None;

        for policy in policies.iter() {
            if Self::policy_matches(policy, resource, action) {
                match policy.effect {
                    AccessEffect::Allow => {
                        if matched_allow.map_or(true, |p| policy.priority > p.priority) {
                            matched_allow = Some(policy);
                        }
                    }
                    AccessEffect::Deny => {
                        if matched_deny.map_or(true, |p| policy.priority > p.priority) {
                            matched_deny = Some(policy);
                        }
                    }
                }
            }
        }

        let (decision, reason, matched_policy_id) = if let Some(p) = matched_deny {
            (
                AccessDecisionType::Deny,
                format!("策略 '{}' 拒绝访问", p.resource_pattern),
                Some(p.id.clone()),
            )
        } else if let Some(p) = matched_allow {
            (
                AccessDecisionType::Allow,
                format!("策略 '{}' 允许访问", p.resource_pattern),
                Some(p.id.clone()),
            )
        } else {
            (
                AccessDecisionType::Challenge,
                "无匹配策略，需要额外验证".to_string(),
                None,
            )
        };

        drop(policies);

        let access_decision = AccessDecision::new(
            Some(uuid::Uuid::new_v4().to_string()),
            actor_id.to_string(),
            resource.to_string(),
            action.to_string(),
            decision,
            reason,
            matched_policy_id,
        );

        let mut decisions = store.access_decisions.lock().await;
        decisions.push(access_decision.clone());

        access_decision
    }

    pub async fn grant_access(
        actor_id: &str,
        role: &str,
        permissions: Vec<String>,
    ) -> Result<UserPermissions, String> {
        let store = get_gateway_security_store();
        let mut user_permissions = store.user_permissions.lock().await;

        let perms = user_permissions
            .entry(actor_id.to_string())
            .or_insert_with(|| UserPermissions {
                user_id: actor_id.to_string(),
                roles: Vec::new(),
                allowed_actions: Vec::new(),
                denied_actions: Vec::new(),
            });

        if !perms.roles.contains(&role.to_string()) {
            perms.roles.push(role.to_string());
        }

        for perm in permissions {
            if !perms.allowed_actions.contains(&perm) {
                perms.allowed_actions.push(perm);
            }
        }

        Ok(perms.clone())
    }

    pub async fn revoke_access(
        actor_id: &str,
        role: Option<&str>,
        permissions: Option<Vec<String>>,
    ) -> Result<UserPermissions, String> {
        let store = get_gateway_security_store();
        let mut user_permissions = store.user_permissions.lock().await;

        let perms = user_permissions
            .entry(actor_id.to_string())
            .or_insert_with(|| UserPermissions {
                user_id: actor_id.to_string(),
                roles: Vec::new(),
                allowed_actions: Vec::new(),
                denied_actions: Vec::new(),
            });

        if let Some(r) = role {
            perms.roles.retain(|x| x != r);
        }

        if let Some(perms_to_revoke) = permissions {
            for perm in perms_to_revoke {
                perms.allowed_actions.retain(|x| x != &perm);
            }
        }

        Ok(perms.clone())
    }

    pub async fn get_policies(resource_type: Option<&str>) -> Vec<AccessPolicy> {
        let store = get_gateway_security_store();
        let policies = store.access_policies.lock().await;

        if let Some(rt) = resource_type {
            policies
                .iter()
                .filter(|p| p.resource_type == rt)
                .cloned()
                .collect()
        } else {
            policies.clone()
        }
    }

    pub async fn create_policy(policy: AccessPolicy) -> Result<AccessPolicy, String> {
        let store = get_gateway_security_store();
        let mut policies = store.access_policies.lock().await;
        policies.push(policy.clone());
        Ok(policy)
    }

    pub async fn update_policy(id: &str, updates: AccessPolicy) -> Result<AccessPolicy, String> {
        let store = get_gateway_security_store();
        let mut policies = store.access_policies.lock().await;

        let policy = policies
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| format!("策略 ID '{}' 不存在", id))?;

        policy.resource_type = updates.resource_type;
        policy.resource_pattern = updates.resource_pattern;
        policy.actions = updates.actions;
        policy.effect = updates.effect;
        policy.conditions = updates.conditions;
        policy.priority = updates.priority;

        Ok(policy.clone())
    }

    pub async fn delete_policy(id: &str) -> Result<bool, String> {
        let store = get_gateway_security_store();
        let mut policies = store.access_policies.lock().await;
        let len_before = policies.len();
        policies.retain(|p| p.id != id);
        Ok(policies.len() < len_before)
    }

    pub async fn get_user_permissions(actor_id: &str) -> Option<UserPermissions> {
        let store = get_gateway_security_store();
        let user_permissions = store.user_permissions.lock().await;
        user_permissions.get(actor_id).cloned()
    }

    pub async fn simulate_access(actor_id: &str, resource: &str, action: &str) -> AccessDecision {
        Self::evaluate_access(actor_id, resource, action).await
    }

    fn policy_matches(policy: &AccessPolicy, resource: &str, action: &str) -> bool {
        let resource_match = if policy.resource_pattern == "*" {
            true
        } else if let Some(rest) = resource.strip_prefix(&policy.resource_type) {
            rest.starts_with(&policy.resource_pattern) || resource == policy.resource_pattern
        } else {
            resource == policy.resource_pattern || resource.contains(&policy.resource_pattern)
        };

        let action_match = if policy.actions.is_empty() {
            true
        } else {
            policy.actions.iter().any(|a| a == action || a == "*")
        };

        resource_match && action_match
    }
}

// ==================== 请求 / 响应结构 ====================

// --- Gateway Security 请求 ---

#[derive(Debug, Deserialize)]
pub struct ValidateTokenRequest {
    pub token: String,
    pub policy_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuthenticateRequest {
    pub token: String,
    pub policy_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSecurityPolicyRequest {
    pub name: String,
    pub authentication_type: Option<String>,
    pub token_validity_sec: Option<u32>,
    pub rate_limit_per_min: Option<u32>,
    pub ip_whitelist: Option<Vec<String>>,
    pub require_https: Option<bool>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSecurityPolicyRequest {
    pub name: Option<String>,
    pub authentication_type: Option<String>,
    pub token_validity_sec: Option<u32>,
    pub rate_limit_per_min: Option<u32>,
    pub ip_whitelist: Option<Vec<String>>,
    pub require_https: Option<bool>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct IncidentsQuery {
    pub incident_type: Option<String>,
    pub severity: Option<String>,
    pub limit: Option<u64>,
}

// --- Audit 请求 ---

#[derive(Debug, Deserialize)]
pub struct WriteAuditRequest {
    pub actor_id: Option<String>,
    pub actor_type: Option<String>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub correlation_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditQueryParams {
    pub actor_id: Option<String>,
    pub action: Option<String>,
    pub resource_type: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub severity: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditExportRequest {
    pub filter: Option<AuditFilter>,
    pub format: Option<String>,
    pub created_by: Option<String>,
}

// --- Access Control 请求 ---

#[derive(Debug, Deserialize)]
pub struct EvaluateAccessRequest {
    pub actor_id: String,
    pub resource: String,
    pub action: String,
}

#[derive(Debug, Deserialize)]
pub struct GrantAccessRequest {
    pub actor_id: String,
    pub role: String,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct RevokeAccessRequest {
    pub role: Option<String>,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccessPolicyRequest {
    pub resource_type: String,
    pub resource_pattern: String,
    pub actions: Option<Vec<String>>,
    pub effect: Option<String>,
    pub conditions: Option<serde_json::Value>,
    pub priority: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccessPolicyRequest {
    pub resource_type: Option<String>,
    pub resource_pattern: Option<String>,
    pub actions: Option<Vec<String>>,
    pub effect: Option<String>,
    pub conditions: Option<serde_json::Value>,
    pub priority: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct SimulateAccessRequest {
    pub actor_id: String,
    pub resource: String,
    pub action: String,
}

#[derive(Debug, Deserialize)]
pub struct AccessPoliciesQuery {
    pub resource_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PermissionsUserQuery {
    pub user_id: Option<String>,
}

// ==================== API 处理器: Gateway Security V2 ====================

pub async fn validate_token_handler(
    State(_state): State<AppState>,
    Json(req): Json<ValidateTokenRequest>,
) -> Json<ApiResponse<TokenValidationResult>> {
    match GatewaySecurityV2::validate_token(&req.token, req.policy_id.as_deref()).await {
        Ok(result) => {
            if result.valid {
                Json(ApiResponse::success(result, "Token 验证通过"))
            } else {
                Json(ApiResponse::error(
                    401,
                    result.reason.as_deref().unwrap_or("Token 验证失败"),
                ))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn authenticate_handler(
    State(_state): State<AppState>,
    Json(req): Json<AuthenticateRequest>,
) -> Json<ApiResponse<bool>> {
    match GatewaySecurityV2::check_authentication(&req.token, req.policy_id.as_deref()).await {
        Ok(true) => Json(ApiResponse::success(true, "认证通过")),
        Ok(false) => Json(ApiResponse::error(401, "认证失败")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_incidents_handler(
    State(_state): State<AppState>,
    Query(params): Query<IncidentsQuery>,
) -> Json<ApiResponse<Vec<SecurityIncident>>> {
    let incident_type = params
        .incident_type
        .as_deref()
        .and_then(IncidentType::from_str);
    let severity = params.severity.as_deref().and_then(Severity::from_str);
    let incidents = GatewaySecurityV2::get_incidents(incident_type, severity, params.limit).await;
    Json(ApiResponse::success(incidents, "安全事件列表"))
}

pub async fn create_security_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateSecurityPolicyRequest>,
) -> Json<ApiResponse<SecurityPolicyV2>> {
    let auth_type = req
        .authentication_type
        .as_deref()
        .and_then(AuthenticationType::from_str)
        .unwrap_or(AuthenticationType::JWT);

    let policy = SecurityPolicyV2 {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        authentication_type: auth_type,
        token_validity_sec: req.token_validity_sec.unwrap_or(3600),
        rate_limit_per_min: req.rate_limit_per_min.unwrap_or(100),
        ip_whitelist: req.ip_whitelist.unwrap_or_default(),
        require_https: req.require_https.unwrap_or(true),
        enabled: req.enabled.unwrap_or(true),
    };

    match GatewaySecurityV2::create_policy(policy).await {
        Ok(p) => Json(ApiResponse::success(p, "安全策略创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn list_security_policies_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<SecurityPolicyV2>>> {
    let policies = GatewaySecurityV2::list_policies().await;
    Json(ApiResponse::success(policies, "安全策略列表"))
}

pub async fn update_security_policy_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateSecurityPolicyRequest>,
) -> Json<ApiResponse<SecurityPolicyV2>> {
    let existing = match GatewaySecurityV2::get_policy_by_id(&id).await {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "策略不存在")),
    };

    let auth_type = req
        .authentication_type
        .as_deref()
        .and_then(AuthenticationType::from_str)
        .unwrap_or(existing.authentication_type);

    let updates = SecurityPolicyV2 {
        id: id.clone(),
        name: req.name.unwrap_or(existing.name),
        authentication_type: auth_type,
        token_validity_sec: req
            .token_validity_sec
            .unwrap_or(existing.token_validity_sec),
        rate_limit_per_min: req
            .rate_limit_per_min
            .unwrap_or(existing.rate_limit_per_min),
        ip_whitelist: req.ip_whitelist.unwrap_or(existing.ip_whitelist),
        require_https: req.require_https.unwrap_or(existing.require_https),
        enabled: req.enabled.unwrap_or(existing.enabled),
    };

    match GatewaySecurityV2::update_policy(&id, updates).await {
        Ok(p) => Json(ApiResponse::success(p, "安全策略更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: Audit Trail ====================

pub async fn write_audit_handler(
    State(_state): State<AppState>,
    Json(req): Json<WriteAuditRequest>,
) -> Json<ApiResponse<AuditEntryV2>> {
    let actor_type = req
        .actor_type
        .as_deref()
        .and_then(ActorType::from_str)
        .unwrap_or(ActorType::User);

    let entry = AuditEntryV2::new(
        req.actor_id,
        actor_type,
        req.action,
        req.resource_type,
        req.resource_id,
        req.old_value,
        req.new_value,
        req.ip_address,
        req.correlation_id,
    );

    match AuditTrailV2::write_audit(entry).await {
        Ok(e) => Json(ApiResponse::success(e, "审计条目写入成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn query_audit_handler(
    State(_state): State<AppState>,
    Query(params): Query<AuditQueryParams>,
) -> Json<ApiResponse<Vec<AuditEntryV2>>> {
    let filter = AuditFilter {
        actor_id: params.actor_id,
        action: params.action,
        resource_type: params.resource_type,
        date_from: params.date_from,
        date_to: params.date_to,
        severity: params.severity.as_deref().and_then(Severity::from_str),
    };

    let entries = AuditTrailV2::query_audit(filter).await;
    Json(ApiResponse::success(entries, "审计查询结果"))
}

pub async fn get_audit_by_actor_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<AuditEntryV2>>> {
    let entries = AuditTrailV2::get_audit_by_actor(&id).await;
    Json(ApiResponse::success(entries, "演员审计记录"))
}

pub async fn get_audit_by_resource_handler(
    State(_state): State<AppState>,
    Path((resource_type, resource_id)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<AuditEntryV2>>> {
    let entries = AuditTrailV2::get_audit_by_resource(&resource_type, Some(&resource_id)).await;
    Json(ApiResponse::success(entries, "资源审计记录"))
}

pub async fn get_audit_summary_handler(
    State(_state): State<AppState>,
    Query(params): Query<AuditQueryParams>,
) -> Json<ApiResponse<AuditSummary>> {
    let filter = AuditFilter {
        actor_id: params.actor_id,
        action: params.action,
        resource_type: params.resource_type,
        date_from: params.date_from,
        date_to: params.date_to,
        severity: params.severity.as_deref().and_then(Severity::from_str),
    };

    let summary = AuditTrailV2::get_audit_summary(filter).await;
    Json(ApiResponse::success(summary, "审计汇总"))
}

pub async fn export_audit_handler(
    State(_state): State<AppState>,
    Json(req): Json<AuditExportRequest>,
) -> Json<ApiResponse<AuditExport>> {
    let filter = req.filter.unwrap_or_default();
    let format = req.format.unwrap_or_else(|| "json".to_string());

    match AuditTrailV2::export_audit(filter, &format, req.created_by).await {
        Ok(export) => Json(ApiResponse::success(export, "审计导出任务创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

// ==================== API 处理器: Access Control ====================

pub async fn evaluate_access_handler(
    State(_state): State<AppState>,
    Json(req): Json<EvaluateAccessRequest>,
) -> Json<ApiResponse<AccessDecision>> {
    let decision =
        AccessControlV2::evaluate_access(&req.actor_id, &req.resource, &req.action).await;
    Json(ApiResponse::success(decision, "访问决策完成"))
}

pub async fn grant_access_handler(
    State(_state): State<AppState>,
    Json(req): Json<GrantAccessRequest>,
) -> Json<ApiResponse<UserPermissions>> {
    let permissions = req.permissions.unwrap_or_default();

    match AccessControlV2::grant_access(&req.actor_id, &req.role, permissions).await {
        Ok(p) => Json(ApiResponse::success(p, "授权成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn revoke_access_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<RevokeAccessRequest>,
) -> Json<ApiResponse<UserPermissions>> {
    match AccessControlV2::revoke_access(&id, req.role.as_deref(), req.permissions).await {
        Ok(p) => Json(ApiResponse::success(p, "权限撤销成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn list_access_policies_handler(
    State(_state): State<AppState>,
    Query(params): Query<AccessPoliciesQuery>,
) -> Json<ApiResponse<Vec<AccessPolicy>>> {
    let policies = AccessControlV2::get_policies(params.resource_type.as_deref()).await;
    Json(ApiResponse::success(policies, "访问策略列表"))
}

pub async fn create_access_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateAccessPolicyRequest>,
) -> Json<ApiResponse<AccessPolicy>> {
    let effect = req
        .effect
        .as_deref()
        .and_then(AccessEffect::from_str)
        .unwrap_or(AccessEffect::Allow);

    let policy = AccessPolicy {
        id: uuid::Uuid::new_v4().to_string(),
        resource_type: req.resource_type,
        resource_pattern: req.resource_pattern,
        actions: req.actions.unwrap_or_default(),
        effect,
        conditions: req.conditions,
        priority: req.priority.unwrap_or(0),
    };

    match AccessControlV2::create_policy(policy).await {
        Ok(p) => Json(ApiResponse::success(p, "访问策略创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_user_permissions_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<UserPermissions>> {
    match AccessControlV2::get_user_permissions(&id).await {
        Some(p) => Json(ApiResponse::success(p, "用户权限")),
        None => Json(ApiResponse::error(404, "用户权限不存在")),
    }
}

pub async fn simulate_access_handler(
    State(_state): State<AppState>,
    Json(req): Json<SimulateAccessRequest>,
) -> Json<ApiResponse<AccessDecision>> {
    let decision =
        AccessControlV2::simulate_access(&req.actor_id, &req.resource, &req.action).await;
    Json(ApiResponse::success(decision, "访问模拟完成"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    // ==================== Enum roundtrip ====================

    #[test]
    fn authentication_type_roundtrip() {
        for v in AuthenticationType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn incident_type_roundtrip() {
        for v in IncidentType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn severity_roundtrip() {
        for v in Severity::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn actor_type_roundtrip() {
        for v in &[ActorType::User, ActorType::Service, ActorType::System] {
            roundtrip(v);
        }
    }

    #[test]
    fn access_effect_roundtrip() {
        for v in &[AccessEffect::Allow, AccessEffect::Deny] {
            roundtrip(v);
        }
    }

    #[test]
    fn access_decision_type_roundtrip() {
        for v in &[
            AccessDecisionType::Allow,
            AccessDecisionType::Deny,
            AccessDecisionType::Challenge,
        ] {
            roundtrip(v);
        }
    }

    // ==================== Enum as_str/from_str ====================

    #[test]
    fn authentication_type_as_str_from_str() {
        for v in AuthenticationType::all() {
            assert_eq!(AuthenticationType::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(AuthenticationType::from_str("unknown"), None);
    }

    #[test]
    fn incident_type_as_str_from_str() {
        for v in IncidentType::all() {
            assert_eq!(IncidentType::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(IncidentType::from_str("unknown"), None);
    }

    #[test]
    fn severity_as_str_from_str() {
        for v in Severity::all() {
            assert_eq!(Severity::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(Severity::from_str("unknown"), None);
    }

    #[test]
    fn actor_type_as_str_from_str() {
        for v in &[ActorType::User, ActorType::Service, ActorType::System] {
            assert_eq!(ActorType::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(ActorType::from_str("unknown"), None);
    }

    #[test]
    fn access_effect_as_str_from_str() {
        for v in &[AccessEffect::Allow, AccessEffect::Deny] {
            assert_eq!(AccessEffect::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(AccessEffect::from_str("unknown"), None);
    }

    #[test]
    fn access_decision_type_as_str_from_str() {
        for v in &[
            AccessDecisionType::Allow,
            AccessDecisionType::Deny,
            AccessDecisionType::Challenge,
        ] {
            assert_eq!(AccessDecisionType::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(AccessDecisionType::from_str("unknown"), None);
    }

    // ==================== Struct roundtrip ====================

    #[test]
    fn security_policy_v2_roundtrip() {
        let p = SecurityPolicyV2::default();
        roundtrip(&p);
    }

    #[test]
    fn security_incident_roundtrip() {
        let i = SecurityIncident::new(
            IncidentType::UnauthorizedAccess,
            Severity::High,
            Some("192.168.1.1".into()),
            Some("Mozilla".into()),
            None,
        );
        roundtrip(&i);
    }

    #[test]
    fn token_validation_result_roundtrip() {
        let r = TokenValidationResult {
            valid: true,
            reason: None,
            policy_id: Some("pol-1".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn audit_entry_v2_roundtrip() {
        let e = AuditEntryV2::new(
            Some("user-1".into()),
            ActorType::User,
            "login".into(),
            "auth".into(),
            None,
            None,
            None,
            Some("192.168.1.1".into()),
            None,
        );
        roundtrip(&e);
    }

    #[test]
    fn audit_filter_roundtrip() {
        let f = AuditFilter::default();
        roundtrip(&f);
    }

    #[test]
    fn audit_summary_roundtrip() {
        let s = AuditSummary {
            total_entries: 100,
            by_action: HashMap::from([("login".into(), 50usize)]),
            by_resource_type: HashMap::from([("auth".into(), 50usize)]),
            by_actor_type: HashMap::from([("user".into(), 80usize)]),
            date_range: Some(("2025-01-01".into(), "2025-02-01".into())),
        };
        roundtrip(&s);
    }

    #[test]
    fn audit_export_roundtrip() {
        let e = AuditExport {
            id: "exp-1".into(),
            format: "json".into(),
            filter: AuditFilter::default(),
            created_by: Some("admin".into()),
            created_at: "2025-01-01T00:00:00Z".into(),
            expires_at: None,
        };
        roundtrip(&e);
    }

    #[test]
    fn access_policy_roundtrip() {
        let p = AccessPolicy::default();
        roundtrip(&p);
    }

    #[test]
    fn access_decision_roundtrip() {
        let d = AccessDecision::new(
            Some("req-1".into()),
            "user-1".into(),
            "/users/1".into(),
            "GET".into(),
            AccessDecisionType::Allow,
            "matched policy".into(),
            Some("pol-1".into()),
        );
        roundtrip(&d);
    }

    #[test]
    fn user_permissions_roundtrip() {
        let p = UserPermissions {
            user_id: "user-1".into(),
            roles: vec!["admin".into()],
            allowed_actions: vec!["*".into()],
            denied_actions: vec![],
        };
        roundtrip(&p);
    }
}
