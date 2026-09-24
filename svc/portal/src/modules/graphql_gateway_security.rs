//! V48.0: GraphQL 网关安全（自 graphql_schema.rs 拆分）
//!
//! 在 V40.0-E（深度/复杂度/速率/IP 黑名单）、V41.0-E（白名单自动化 + 安全报表）和
//! V42.0-E（字段级权限 + 数据掩码 + 审计追踪）基础上，构建端到端网关安全体系：
//! 1. 零信任架构（ZeroTrustGateway）：持续评估信任等级 + 风险评分 + 策略驱动的验证
//! 2. 请求签名验证（RequestSignatureV2）：HMAC/Ed25519/RS256 签名 + 时间窗口 + nonce 防重放
//! 3. 数据级权限控制（DataLevelPermissions）：行级过滤 + 字段掩码 + 有效权限合并 + 审计
//!
//! 状态用 static OnceLock + Mutex 单例存储，与现有代码风格一致。
//! 为避免与 V42.0 安全类型（FieldPermission/MaskType/UserRole 等）冲突，
//! 所有公开 GraphQL 类型统一加 Gql 后缀；管理器结构保持原名。
//! 内部加密辅助（v48_hmac / v48_sha256_hex 等）随本模块整体迁入。
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_gateway_security::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。
//! `uuid_simple` 定义于 `graphql_edge_v2.rs`（V46.0 区域），此处经模块路径引用。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

use crate::modules::graphql_edge_v2::uuid_simple;

// 在 V40.0-E（深度/复杂度/速率/IP 黑名单）、V41.0-E（白名单自动化 + 安全报表）和
// V42.0-E（字段级权限 + 数据掩码 + 审计追踪）基础上，构建端到端网关安全体系：
// 1. 零信任架构（ZeroTrustGateway）：持续评估信任等级 + 风险评分 + 策略驱动的验证
// 2. 请求签名验证（RequestSignatureV2）：HMAC/Ed25519/RS256 签名 + 时间窗口 + nonce 防重放
// 3. 数据级权限控制（DataLevelPermissions）：行级过滤 + 字段掩码 + 有效权限合并 + 审计
//
// 状态用 static OnceLock + Mutex 单例存储，与现有代码风格一致。
// 为避免与 V42.0 安全类型（FieldPermission/MaskType/UserRole 等）冲突，
// 所有公开 GraphQL 类型统一加 Gql 后缀；管理器结构保持原名。

// ----------------------------------------------------------------------------
// 内部加密辅助：HMAC-SHA2（sha2 0.10 未引入 hmac crate，按 RFC 2104 手工实现）
// ----------------------------------------------------------------------------

/// V48.0: 通用 HMAC 计算（RFC 2104），block_size 由调用方指定
fn v48_hmac<F>(key: &[u8], msg: &[u8], block_size: usize, hash_fn: F) -> Vec<u8>
where
    F: Fn(&[u8]) -> Vec<u8>,
{
    let mut k = if key.len() > block_size {
        hash_fn(key)
    } else {
        key.to_vec()
    };
    k.resize(block_size, 0);
    let mut ipad = vec![0x36u8; block_size];
    let mut opad = vec![0x5cu8; block_size];
    for i in 0..block_size {
        ipad[i] ^= k[i];
        opad[i] ^= k[i];
    }
    let mut inner_input = ipad;
    inner_input.extend_from_slice(msg);
    let inner = hash_fn(&inner_input);
    let mut outer_input = opad;
    outer_input.extend_from_slice(&inner);
    hash_fn(&outer_input)
}

/// V48.0: HMAC-SHA256
fn v48_hmac_sha256(key: &[u8], msg: &[u8]) -> Vec<u8> {
    v48_hmac(key, msg, 64, |data| {
        use sha2::{Digest, Sha256};
        let mut h = Sha256::new();
        h.update(data);
        h.finalize().to_vec()
    })
}

/// V48.0: HMAC-SHA384
fn v48_hmac_sha384(key: &[u8], msg: &[u8]) -> Vec<u8> {
    v48_hmac(key, msg, 128, |data| {
        use sha2::{Digest, Sha384};
        let mut h = Sha384::new();
        h.update(data);
        h.finalize().to_vec()
    })
}

/// V48.0: HMAC-SHA512
fn v48_hmac_sha512(key: &[u8], msg: &[u8]) -> Vec<u8> {
    v48_hmac(key, msg, 128, |data| {
        use sha2::{Digest, Sha512};
        let mut h = Sha512::new();
        h.update(data);
        h.finalize().to_vec()
    })
}

/// V48.0: 字节序列十六进制编码
fn v48_hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// V48.0: SHA256 哈希（十六进制输出，用于 body_hash）
fn v48_sha256_hex(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(data);
    v48_hex_encode(&h.finalize())
}

// ==================== V48.0: 1. 零信任架构（ZeroTrustGateway） ====================

/// V48.0: 信任等级
#[derive(
    Debug,
    Clone,
    Copy,
    Serialize,
    Deserialize,
    async_graphql::Enum,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Hash,
)]
pub enum TrustLevelGql {
    Untrusted,
    LowTrust,
    MediumTrust,
    HighTrust,
    FullyTrusted,
}

impl TrustLevelGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Untrusted => "untrusted",
            Self::LowTrust => "low_trust",
            Self::MediumTrust => "medium_trust",
            Self::HighTrust => "high_trust",
            Self::FullyTrusted => "fully_trusted",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "untrusted" => Self::Untrusted,
            "low_trust" => Self::LowTrust,
            "medium_trust" => Self::MediumTrust,
            "high_trust" => Self::HighTrust,
            "fully_trusted" => Self::FullyTrusted,
            _ => Self::Untrusted,
        }
    }

    /// 由风险评分映射到信任等级（分数越低信任越高）
    pub fn from_risk_score(score: u32) -> Self {
        match score {
            0..=20 => Self::FullyTrusted,
            21..=40 => Self::HighTrust,
            41..=60 => Self::MediumTrust,
            61..=80 => Self::LowTrust,
            _ => Self::Untrusted,
        }
    }
}

/// V48.0: 验证因子类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum VerificationFactorGql {
    Password,
    MFA,
    Biometric,
    DeviceCertificate,
    IPAllowlist,
    GeoFence,
    TimeWindow,
    Behavioral,
}

impl VerificationFactorGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Password => "password",
            Self::MFA => "mfa",
            Self::Biometric => "biometric",
            Self::DeviceCertificate => "device_certificate",
            Self::IPAllowlist => "ip_allowlist",
            Self::GeoFence => "geo_fence",
            Self::TimeWindow => "time_window",
            Self::Behavioral => "behavioral",
        }
    }
}

/// V48.0: 风险因子
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct RiskFactorGql {
    pub factor_type: String,
    pub severity: String,
    pub description: String,
    pub weight: i32,
}

/// V48.0: 风险评分
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct RiskScoreGql {
    pub total_score: i32,
    pub level: String,
    pub factors: Vec<RiskFactorGql>,
    pub assessed_at: String,
}

/// V48.0: 信任上下文
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct TrustContextGql {
    pub client_id: String,
    pub user_id: Option<String>,
    pub device_id: Option<String>,
    pub ip_address: String,
    pub geo_location: Option<String>,
    pub device_fingerprint: Option<String>,
    pub trust_level: TrustLevelGql,
    pub risk_score: i32,
    pub verification_factors: Vec<String>,
    pub assessed_at: String,
}

/// V48.0: 零信任策略
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ZeroTrustPolicyGql {
    pub policy_id: String,
    pub name: String,
    pub required_trust_level: TrustLevelGql,
    pub max_risk_score: i32,
    pub required_verification_factors: Vec<String>,
    pub resource_patterns: Vec<String>,
}

/// V48.0: 零信任统计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ZeroTrustStatsGql {
    pub total_assessments: i64,
    pub avg_risk_score: f64,
    pub by_trust_level: Vec<String>,
    pub blocked_requests: i64,
    pub verification_challenges: i64,
}

/// V48.0: 内部风险因子
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskFactor {
    pub factor_type: String,
    pub severity: String,
    pub description: String,
    pub weight: i32,
}

impl RiskFactor {
    fn to_gql(&self) -> RiskFactorGql {
        RiskFactorGql {
            factor_type: self.factor_type.clone(),
            severity: self.severity.clone(),
            description: self.description.clone(),
            weight: self.weight,
        }
    }
}

/// V48.0: 内部风险评分
#[derive(Debug, Clone)]
struct RiskScore {
    total_score: i32,
    level: String,
    factors: Vec<RiskFactor>,
    assessed_at: DateTime<Utc>,
}

impl RiskScore {
    fn to_gql(&self) -> RiskScoreGql {
        RiskScoreGql {
            total_score: self.total_score,
            level: self.level.clone(),
            factors: self.factors.iter().map(|f| f.to_gql()).collect(),
            assessed_at: self.assessed_at.to_rfc3339(),
        }
    }
}

/// V48.0: 内部信任上下文
#[derive(Debug, Clone)]
struct TrustContext {
    client_id: String,
    user_id: Option<String>,
    device_id: Option<String>,
    ip_address: String,
    geo_location: Option<String>,
    device_fingerprint: Option<String>,
    trust_level: TrustLevelGql,
    risk_score: i32,
    verification_factors: Vec<VerificationFactorGql>,
    assessed_at: DateTime<Utc>,
}

impl TrustContext {
    fn to_gql(&self) -> TrustContextGql {
        TrustContextGql {
            client_id: self.client_id.clone(),
            user_id: self.user_id.clone(),
            device_id: self.device_id.clone(),
            ip_address: self.ip_address.clone(),
            geo_location: self.geo_location.clone(),
            device_fingerprint: self.device_fingerprint.clone(),
            trust_level: self.trust_level,
            risk_score: self.risk_score,
            verification_factors: self
                .verification_factors
                .iter()
                .map(|f| f.as_str().to_string())
                .collect(),
            assessed_at: self.assessed_at.to_rfc3339(),
        }
    }
}

/// V48.0: 内部零信任策略
#[derive(Debug, Clone)]
struct ZeroTrustPolicy {
    policy_id: String,
    name: String,
    required_trust_level: TrustLevelGql,
    max_risk_score: i32,
    required_verification_factors: Vec<VerificationFactorGql>,
    resource_patterns: Vec<String>,
}

impl ZeroTrustPolicy {
    fn to_gql(&self) -> ZeroTrustPolicyGql {
        ZeroTrustPolicyGql {
            policy_id: self.policy_id.clone(),
            name: self.name.clone(),
            required_trust_level: self.required_trust_level,
            max_risk_score: self.max_risk_score,
            required_verification_factors: self
                .required_verification_factors
                .iter()
                .map(|f| f.as_str().to_string())
                .collect(),
            resource_patterns: self.resource_patterns.clone(),
        }
    }
}

/// V48.0: 零信任网关状态
struct ZeroTrustState {
    contexts: HashMap<String, TrustContext>,
    policies: HashMap<String, ZeroTrustPolicy>,
    total_assessments: u64,
    total_risk_score: u64,
    by_trust_level: HashMap<TrustLevelGql, u64>,
    blocked_requests: u64,
    verification_challenges: u64,
}

impl ZeroTrustState {
    fn new() -> Self {
        Self {
            contexts: HashMap::new(),
            policies: HashMap::new(),
            total_assessments: 0,
            total_risk_score: 0,
            by_trust_level: HashMap::new(),
            blocked_requests: 0,
            verification_challenges: 0,
        }
    }
}

static ZERO_TRUST_STATE: std::sync::OnceLock<Mutex<ZeroTrustState>> = std::sync::OnceLock::new();

fn zero_trust_state() -> &'static Mutex<ZeroTrustState> {
    ZERO_TRUST_STATE.get_or_init(|| Mutex::new(ZeroTrustState::new()))
}

/// V48.0: 零信任网关
pub struct ZeroTrustGateway;

impl ZeroTrustGateway {
    /// 评估信任等级（综合已知上下文 + 风险因子，写入信任上下文）
    pub fn assess_trust(
        client_id: &str,
        ip_address: &str,
        user_id: Option<&str>,
        device_id: Option<&str>,
        geo_location: Option<&str>,
        device_fingerprint: Option<&str>,
        verification_factors: Vec<VerificationFactorGql>,
    ) -> TrustContextGql {
        let risk = Self::calculate_risk_inner(
            ip_address,
            geo_location,
            device_id,
            device_fingerprint,
            &verification_factors,
        );
        let trust_level = TrustLevelGql::from_risk_score(risk.total_score as u32);
        let now = Utc::now();
        let ctx = TrustContext {
            client_id: client_id.to_string(),
            user_id: user_id.map(|s| s.to_string()),
            device_id: device_id.map(|s| s.to_string()),
            ip_address: ip_address.to_string(),
            geo_location: geo_location.map(|s| s.to_string()),
            device_fingerprint: device_fingerprint.map(|s| s.to_string()),
            trust_level,
            risk_score: risk.total_score,
            verification_factors,
            assessed_at: now,
        };
        let gql = ctx.to_gql();
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        state.contexts.insert(client_id.to_string(), ctx);
        state.total_assessments += 1;
        state.total_risk_score += risk.total_score as u64;
        *state.by_trust_level.entry(trust_level).or_insert(0) += 1;
        gql
    }

    /// 计算风险评分（暴露入口，返回结构化评分）
    pub fn calculate_risk(
        ip_address: &str,
        geo_location: Option<&str>,
        device_id: Option<&str>,
        device_fingerprint: Option<&str>,
        verification_factors: &[VerificationFactorGql],
    ) -> RiskScoreGql {
        Self::calculate_risk_inner(
            ip_address,
            geo_location,
            device_id,
            device_fingerprint,
            verification_factors,
        )
        .to_gql()
    }

    fn calculate_risk_inner(
        ip_address: &str,
        geo_location: Option<&str>,
        device_id: Option<&str>,
        device_fingerprint: Option<&str>,
        verification_factors: &[VerificationFactorGql],
    ) -> RiskScore {
        let mut factors: Vec<RiskFactor> = Vec::new();

        // 未知设备
        if device_id.is_none() && device_fingerprint.is_none() {
            factors.push(RiskFactor {
                factor_type: "unknown_device".into(),
                severity: "high".into(),
                description: "请求未携带设备标识".into(),
                weight: 25,
            });
        }
        // 内网/可信 IP 简单判定
        let is_internal = ip_address.starts_with("10.")
            || ip_address.starts_with("192.168.")
            || ip_address.starts_with("172.");
        if !is_internal {
            factors.push(RiskFactor {
                factor_type: "external_ip".into(),
                severity: "medium".into(),
                description: "请求来自外网 IP".into(),
                weight: 15,
            });
        }
        // 异地/未知地理位置
        if let Some(geo) = geo_location {
            if geo.trim().is_empty() || geo.contains("unknown") {
                factors.push(RiskFactor {
                    factor_type: "unknown_geo".into(),
                    severity: "medium".into(),
                    description: "无法解析地理位置".into(),
                    weight: 10,
                });
            }
        }
        // 验证因子不足
        let factor_count = verification_factors.len();
        if factor_count == 0 {
            factors.push(RiskFactor {
                factor_type: "no_verification".into(),
                severity: "critical".into(),
                description: "未提供任何验证因子".into(),
                weight: 30,
            });
        } else if factor_count == 1 {
            factors.push(RiskFactor {
                factor_type: "weak_verification".into(),
                severity: "low".into(),
                description: "仅单一验证因子".into(),
                weight: 8,
            });
        }

        let total_score: i32 = factors.iter().map(|f| f.weight).sum::<i32>().min(100);
        let level = match total_score {
            0..=20 => "low",
            21..=40 => "moderate",
            41..=60 => "elevated",
            61..=80 => "high",
            _ => "critical",
        }
        .to_string();
        RiskScore {
            total_score,
            level,
            factors,
            assessed_at: Utc::now(),
        }
    }

    /// 评估零信任策略（返回是否放行 + 缺失项列表）
    pub fn evaluate_policy(policy_id: &str, client_id: &str) -> (bool, Vec<String>) {
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        let policy = match state.policies.get(policy_id) {
            Some(p) => p.clone(),
            None => {
                state.blocked_requests += 1;
                return (false, vec!["policy_not_found".into()]);
            }
        };
        let ctx = match state.contexts.get(client_id) {
            Some(c) => c.clone(),
            None => {
                state.blocked_requests += 1;
                return (false, vec!["no_trust_context".into()]);
            }
        };

        let mut missing: Vec<String> = Vec::new();
        if ctx.trust_level < policy.required_trust_level {
            missing.push(format!(
                "trust_level_required:{:?}",
                policy.required_trust_level
            ));
        }
        if ctx.risk_score > policy.max_risk_score {
            missing.push(format!("risk_score_exceeded:{}", ctx.risk_score));
        }
        for req in &policy.required_verification_factors {
            if !ctx.verification_factors.contains(req) {
                missing.push(req.as_str().to_string());
            }
        }

        let allowed = missing.is_empty();
        if !allowed {
            state.blocked_requests += 1;
        }
        (allowed, missing)
    }

    /// 要求额外验证（触发验证挑战并补齐验证因子）
    pub fn require_verification(
        client_id: &str,
        factors: Vec<VerificationFactorGql>,
    ) -> Option<TrustContextGql> {
        // 持有锁期间只访问 contexts 字段：补齐验证因子并重算风险
        let gql = {
            let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
            let ctx = state.contexts.get_mut(client_id)?;
            for f in &factors {
                if !ctx.verification_factors.contains(f) {
                    ctx.verification_factors.push(*f);
                }
            }
            // 补齐验证因子后降低风险评分
            ctx.risk_score = (ctx.risk_score - factors.len() as i32 * 10).max(0);
            ctx.trust_level = TrustLevelGql::from_risk_score(ctx.risk_score as u32);
            ctx.assessed_at = Utc::now();
            ctx.to_gql()
        };
        // 释放 contexts 借用后再累加验证挑战计数（避免对 MutexGuard 重复可变借用）
        {
            let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
            state.verification_challenges += 1;
        }
        Some(gql)
    }

    /// 注册零信任策略
    pub fn register_policy(
        name: &str,
        required_trust_level: TrustLevelGql,
        max_risk_score: i32,
        required_verification_factors: Vec<VerificationFactorGql>,
        resource_patterns: Vec<String>,
    ) -> ZeroTrustPolicyGql {
        let policy = ZeroTrustPolicy {
            policy_id: uuid_simple(),
            name: name.to_string(),
            required_trust_level,
            max_risk_score,
            required_verification_factors,
            resource_patterns,
        };
        let gql = policy.to_gql();
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        state.policies.insert(gql.policy_id.clone(), policy);
        gql
    }

    /// 获取信任上下文
    pub fn get_trust_context(client_id: &str) -> Option<TrustContextGql> {
        let state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        state.contexts.get(client_id).map(|c| c.to_gql())
    }

    /// 撤销信任（移除信任上下文，后续请求需重新评估）
    pub fn revoke_trust(client_id: &str) -> bool {
        let mut state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        let existed = state.contexts.remove(client_id).is_some();
        if existed {
            state.blocked_requests += 1;
        }
        existed
    }

    /// 获取零信任统计
    pub fn get_stats() -> ZeroTrustStatsGql {
        let state = zero_trust_state().lock().unwrap_or_else(|e| e.into_inner());
        let avg = if state.total_assessments > 0 {
            state.total_risk_score as f64 / state.total_assessments as f64
        } else {
            0.0
        };
        let mut by_level: Vec<String> = Vec::new();
        for lvl in [
            TrustLevelGql::Untrusted,
            TrustLevelGql::LowTrust,
            TrustLevelGql::MediumTrust,
            TrustLevelGql::HighTrust,
            TrustLevelGql::FullyTrusted,
        ] {
            let count = state.by_trust_level.get(&lvl).copied().unwrap_or(0);
            by_level.push(format!("{}:{}", lvl.as_str(), count));
        }
        ZeroTrustStatsGql {
            total_assessments: state.total_assessments as i64,
            avg_risk_score: avg,
            by_trust_level: by_level,
            blocked_requests: state.blocked_requests as i64,
            verification_challenges: state.verification_challenges as i64,
        }
    }
}

// ==================== V48.0: 2. 请求签名验证（RequestSignatureV2） ====================

/// V48.0: 签名算法
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum SignatureAlgorithmGql {
    HMACSHA256,
    HMACSHA384,
    HMACSHA512,
    Ed25519,
    RS256,
}

impl SignatureAlgorithmGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::HMACSHA256 => "HMAC-SHA256",
            Self::HMACSHA384 => "HMAC-SHA384",
            Self::HMACSHA512 => "HMAC-SHA512",
            Self::Ed25519 => "Ed25519",
            Self::RS256 => "RS256",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "HMAC-SHA256" | "HMACSHA256" => Self::HMACSHA256,
            "HMAC-SHA384" | "HMACSHA384" => Self::HMACSHA384,
            "HMAC-SHA512" | "HMACSHA512" => Self::HMACSHA512,
            "Ed25519" => Self::Ed25519,
            "RS256" => Self::RS256,
            _ => Self::HMACSHA256,
        }
    }
}

/// V48.0: 签名拒绝原因
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum RejectionReasonGql {
    InvalidSignature,
    ExpiredTimestamp,
    ReplayedNonce,
    UnknownKey,
    MissingSignature,
    AlgorithmMismatch,
}

impl RejectionReasonGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::InvalidSignature => "invalid_signature",
            Self::ExpiredTimestamp => "expired_timestamp",
            Self::ReplayedNonce => "replayed_nonce",
            Self::UnknownKey => "unknown_key",
            Self::MissingSignature => "missing_signature",
            Self::AlgorithmMismatch => "algorithm_mismatch",
        }
    }
}

/// V48.0: 签名配置
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SignatureConfigGql {
    pub algorithm: SignatureAlgorithmGql,
    pub key_id: String,
    pub timestamp_window_seconds: i32,
    pub nonce_cache_size: i32,
    pub require_signature: bool,
}

/// V48.0: 已签名请求
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SignedRequestGql {
    pub request_id: String,
    pub signature: String,
    pub timestamp: i64,
    pub nonce: String,
    pub algorithm: SignatureAlgorithmGql,
    pub key_id: String,
    pub body_hash: String,
}

/// V48.0: 密钥信息
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct KeyInfoGql {
    pub key_id: String,
    pub algorithm: SignatureAlgorithmGql,
    pub created_at: String,
    pub revoked: bool,
    pub revoked_at: Option<String>,
    pub sign_count: i64,
}

/// V48.0: 签名统计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SignatureStatsGql {
    pub total_verified: i64,
    pub total_rejected: i64,
    pub rejection_reasons: Vec<String>,
    pub avg_verify_time_ms: f64,
}

/// V48.0: 内部签名密钥
#[derive(Debug, Clone)]
struct SignatureKey {
    key_id: String,
    algorithm: SignatureAlgorithmGql,
    key_secret: Vec<u8>,
    created_at: DateTime<Utc>,
    revoked: bool,
    revoked_at: Option<DateTime<Utc>>,
    sign_count: u64,
}

impl SignatureKey {
    fn to_gql(&self) -> KeyInfoGql {
        KeyInfoGql {
            key_id: self.key_id.clone(),
            algorithm: self.algorithm,
            created_at: self.created_at.to_rfc3339(),
            revoked: self.revoked,
            revoked_at: self.revoked_at.map(|t| t.to_rfc3339()),
            sign_count: self.sign_count as i64,
        }
    }
}

/// V48.0: 内部签名配置
#[derive(Debug, Clone)]
struct SignatureConfig {
    algorithm: SignatureAlgorithmGql,
    key_id: String,
    timestamp_window_seconds: i32,
    nonce_cache_size: usize,
    require_signature: bool,
}

impl SignatureConfig {
    fn to_gql(&self) -> SignatureConfigGql {
        SignatureConfigGql {
            algorithm: self.algorithm,
            key_id: self.key_id.clone(),
            timestamp_window_seconds: self.timestamp_window_seconds,
            nonce_cache_size: self.nonce_cache_size as i32,
            require_signature: self.require_signature,
        }
    }
}

/// V48.0: 请求签名验证器状态
struct RequestSignatureState {
    keys: HashMap<String, SignatureKey>,
    config: SignatureConfig,
    nonce_cache: VecDeque<String>,
    total_verified: u64,
    total_rejected: u64,
    rejection_reasons: HashMap<RejectionReasonGql, u64>,
    total_verify_time_ms: u64,
}

impl RequestSignatureState {
    fn new() -> Self {
        let default_key = SignatureKey {
            key_id: "v48-default-key".into(),
            algorithm: SignatureAlgorithmGql::HMACSHA256,
            key_secret: b"topems-v48-default-secret".to_vec(),
            created_at: Utc::now(),
            revoked: false,
            revoked_at: None,
            sign_count: 0,
        };
        let mut keys = HashMap::new();
        keys.insert(default_key.key_id.clone(), default_key);
        Self {
            keys,
            config: SignatureConfig {
                algorithm: SignatureAlgorithmGql::HMACSHA256,
                key_id: "v48-default-key".into(),
                timestamp_window_seconds: 300,
                nonce_cache_size: 10000,
                require_signature: true,
            },
            nonce_cache: VecDeque::new(),
            total_verified: 0,
            total_rejected: 0,
            rejection_reasons: HashMap::new(),
            total_verify_time_ms: 0,
        }
    }
}

static REQUEST_SIGNATURE_STATE: std::sync::OnceLock<Mutex<RequestSignatureState>> =
    std::sync::OnceLock::new();

fn request_signature_state() -> &'static Mutex<RequestSignatureState> {
    REQUEST_SIGNATURE_STATE.get_or_init(|| Mutex::new(RequestSignatureState::new()))
}

/// V48.0: 按算法计算签名
///
/// Ed25519/RS256 在未引入 ed25519-dalek/rsa crate 时回退到 HMAC-SHA256，
/// 保证签名与验证对称可执行；生产构建应替换为真正的非对称算法实现。
fn v48_compute_signature(algorithm: SignatureAlgorithmGql, key: &[u8], message: &[u8]) -> String {
    match algorithm {
        SignatureAlgorithmGql::HMACSHA256 => v48_hex_encode(&v48_hmac_sha256(key, message)),
        SignatureAlgorithmGql::HMACSHA384 => v48_hex_encode(&v48_hmac_sha384(key, message)),
        SignatureAlgorithmGql::HMACSHA512 => v48_hex_encode(&v48_hmac_sha512(key, message)),
        SignatureAlgorithmGql::Ed25519 | SignatureAlgorithmGql::RS256 => {
            v48_hex_encode(&v48_hmac_sha256(key, message))
        }
    }
}

/// V48.0: 请求签名验证器 V2
pub struct RequestSignatureV2;

impl RequestSignatureV2 {
    /// 签名请求（生成签名 + nonce + body_hash）
    pub fn sign_request(
        key_id: &str,
        body: &str,
        algorithm: Option<SignatureAlgorithmGql>,
    ) -> Option<SignedRequestGql> {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let key = state.keys.get_mut(key_id)?;
        if key.revoked {
            return None;
        }
        let algo = algorithm.unwrap_or(key.algorithm);
        let timestamp = Utc::now().timestamp();
        let nonce = Self::generate_nonce_inner();
        let body_hash = v48_sha256_hex(body.as_bytes());
        // 签名消息：key_id|timestamp|nonce|body_hash
        let message = format!("{}|{}|{}|{}", key_id, timestamp, nonce, body_hash);
        let signature = v48_compute_signature(algo, &key.key_secret, message.as_bytes());
        key.sign_count += 1;
        Some(SignedRequestGql {
            request_id: uuid_simple(),
            signature,
            timestamp,
            nonce,
            algorithm: algo,
            key_id: key_id.to_string(),
            body_hash,
        })
    }

    /// 验证签名（时间窗口 + nonce 防重放 + 哈希匹配 + 签名匹配）
    pub fn verify_signature(req: &SignedRequestGql, body: &str) -> Result<(), RejectionReasonGql> {
        let started = Utc::now().timestamp_millis();
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());

        // 1. 缺失签名
        if req.signature.is_empty() {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::MissingSignature,
                started,
            ));
        }
        // 2. 未知/已吊销密钥
        let key = match state.keys.get(&req.key_id) {
            Some(k) if !k.revoked => k.clone(),
            _ => {
                return Err(Self::record_rejection(
                    &mut state,
                    RejectionReasonGql::UnknownKey,
                    started,
                ))
            }
        };
        // 3. 算法不匹配
        if key.algorithm != req.algorithm {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::AlgorithmMismatch,
                started,
            ));
        }
        // 4. 时间窗口
        let now = Utc::now().timestamp();
        let window = state.config.timestamp_window_seconds as i64;
        if (now - req.timestamp).abs() > window {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::ExpiredTimestamp,
                started,
            ));
        }
        // 5. nonce 防重放
        if !Self::validate_nonce_inner(&mut state, &req.nonce) {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::ReplayedNonce,
                started,
            ));
        }
        // 6. body 哈希匹配
        let body_hash = v48_sha256_hex(body.as_bytes());
        if body_hash != req.body_hash {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::InvalidSignature,
                started,
            ));
        }
        // 7. 签名匹配
        let message = format!(
            "{}|{}|{}|{}",
            req.key_id, req.timestamp, req.nonce, req.body_hash
        );
        let expected = v48_compute_signature(req.algorithm, &key.key_secret, message.as_bytes());
        if expected != req.signature {
            return Err(Self::record_rejection(
                &mut state,
                RejectionReasonGql::InvalidSignature,
                started,
            ));
        }

        let elapsed = (Utc::now().timestamp_millis() - started) as u64;
        state.total_verified += 1;
        state.total_verify_time_ms += elapsed;
        Ok(())
    }

    /// 记录拒绝并返回拒绝原因
    fn record_rejection(
        state: &mut RequestSignatureState,
        reason: RejectionReasonGql,
        started: i64,
    ) -> RejectionReasonGql {
        state.total_rejected += 1;
        *state.rejection_reasons.entry(reason).or_insert(0) += 1;
        state.total_verify_time_ms += (Utc::now().timestamp_millis() - started) as u64;
        reason
    }

    /// 生成 nonce（时间戳 + 随机数，十六进制）
    pub fn generate_nonce() -> String {
        Self::generate_nonce_inner()
    }

    fn generate_nonce_inner() -> String {
        let now = Utc::now().timestamp_millis() as u64;
        let rand = {
            use std::collections::hash_map::RandomState;
            use std::hash::{BuildHasher, Hasher};
            let s = RandomState::new();
            let mut h = s.build_hasher();
            h.write_u64(now);
            h.finish()
        };
        format!("{:x}{:x}", now, rand)
    }

    /// 验证 nonce 唯一性（true = 首次出现并记录；false = 重放）
    pub fn validate_nonce(nonce: &str) -> bool {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Self::validate_nonce_inner(&mut state, nonce)
    }

    fn validate_nonce_inner(state: &mut RequestSignatureState, nonce: &str) -> bool {
        if state.nonce_cache.iter().any(|n| n == nonce) {
            return false;
        }
        state.nonce_cache.push_back(nonce.to_string());
        while state.nonce_cache.len() > state.config.nonce_cache_size {
            state.nonce_cache.pop_front();
        }
        true
    }

    /// 轮换密钥（生成新 key_id + secret，旧密钥标记为已吊销）
    pub fn rotate_key(
        old_key_id: &str,
        new_algorithm: Option<SignatureAlgorithmGql>,
        new_secret: Option<&str>,
    ) -> Option<KeyInfoGql> {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let old = state.keys.get_mut(old_key_id)?;
        let algo = new_algorithm.unwrap_or(old.algorithm);
        let secret = new_secret
            .map(|s| s.as_bytes().to_vec())
            .unwrap_or_else(|| {
                format!("{}-rotated-{}", old_key_id, Utc::now().timestamp_millis()).into_bytes()
            });
        let new_key = SignatureKey {
            key_id: format!("v48-{}", uuid_simple()),
            algorithm: algo,
            key_secret: secret,
            created_at: Utc::now(),
            revoked: false,
            revoked_at: None,
            sign_count: 0,
        };
        // 旧密钥标记为已轮换（吊销）
        old.revoked = true;
        old.revoked_at = Some(Utc::now());
        let gql = new_key.to_gql();
        state.keys.insert(new_key.key_id.clone(), new_key);
        // 默认配置指向新密钥
        state.config.algorithm = algo;
        state.config.key_id = gql.key_id.clone();
        Some(gql)
    }

    /// 获取密钥信息
    pub fn get_key_info(key_id: &str) -> Option<KeyInfoGql> {
        let state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.keys.get(key_id).map(|k| k.to_gql())
    }

    /// 吊销密钥
    pub fn revoke_key(key_id: &str) -> bool {
        let mut state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(k) = state.keys.get_mut(key_id) {
            if k.revoked {
                return false;
            }
            k.revoked = true;
            k.revoked_at = Some(Utc::now());
            return true;
        }
        false
    }

    /// 获取当前签名配置
    pub fn get_config() -> SignatureConfigGql {
        let state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.to_gql()
    }

    /// 获取签名统计
    pub fn get_stats() -> SignatureStatsGql {
        let state = request_signature_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.total_verified + state.total_rejected;
        let avg = if total > 0 {
            state.total_verify_time_ms as f64 / total as f64
        } else {
            0.0
        };
        let mut reasons: Vec<String> = Vec::new();
        for r in [
            RejectionReasonGql::InvalidSignature,
            RejectionReasonGql::ExpiredTimestamp,
            RejectionReasonGql::ReplayedNonce,
            RejectionReasonGql::UnknownKey,
            RejectionReasonGql::MissingSignature,
            RejectionReasonGql::AlgorithmMismatch,
        ] {
            let count = state.rejection_reasons.get(&r).copied().unwrap_or(0);
            reasons.push(format!("{}:{}", r.as_str(), count));
        }
        SignatureStatsGql {
            total_verified: state.total_verified as i64,
            total_rejected: state.total_rejected as i64,
            rejection_reasons: reasons,
            avg_verify_time_ms: avg,
        }
    }
}

// ==================== V48.0: 3. 数据级权限控制（DataLevelPermissions） ====================

/// V48.0: 权限级别
#[derive(
    Debug,
    Clone,
    Copy,
    Serialize,
    Deserialize,
    async_graphql::Enum,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Hash,
)]
pub enum PermissionLevelGql {
    None,
    Read,
    Write,
    Delete,
    Admin,
    Owner,
}

impl PermissionLevelGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Read => "read",
            Self::Write => "write",
            Self::Delete => "delete",
            Self::Admin => "admin",
            Self::Owner => "owner",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "none" => Self::None,
            "read" => Self::Read,
            "write" => Self::Write,
            "delete" => Self::Delete,
            "admin" => Self::Admin,
            "owner" => Self::Owner,
            _ => Self::None,
        }
    }
}

/// V48.0: 主体类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq, Hash)]
pub enum PrincipalTypeGql {
    User,
    Role,
    Group,
    ServiceAccount,
    Department,
}

impl PrincipalTypeGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Role => "role",
            Self::Group => "group",
            Self::ServiceAccount => "service_account",
            Self::Department => "department",
        }
    }
}

/// V48.0: 字段掩码策略
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq)]
pub enum MaskStrategyGql {
    None,
    Partial,
    Hash,
    Encrypt,
    Redact,
    Custom,
}

impl MaskStrategyGql {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Partial => "partial",
            Self::Hash => "hash",
            Self::Encrypt => "encrypt",
            Self::Redact => "redact",
            Self::Custom => "custom",
        }
    }
}

/// V48.0: 行级过滤条件
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct PermissionConditionGql {
    pub field: String,
    pub operator: String,
    pub value: String,
}

/// V48.0: 字段权限（数据级，与 V42.0 FieldPermission 区别命名）
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataFieldPermissionGql {
    pub field_name: String,
    pub allowed_levels: Vec<String>,
    pub mask_strategy: MaskStrategyGql,
}

/// V48.0: 数据权限
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataPermissionGql {
    pub permission_id: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub principal_type: PrincipalTypeGql,
    pub principal_id: String,
    pub permission_level: PermissionLevelGql,
    pub conditions: Vec<PermissionConditionGql>,
    pub field_permissions: Vec<DataFieldPermissionGql>,
    pub granted_by: String,
    pub granted_at: String,
    pub expires_at: Option<String>,
}

/// V48.0: 权限审计日志
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct PermissionAuditLogGql {
    pub action: String,
    pub principal: String,
    pub resource: String,
    pub permission_level: String,
    pub timestamp: String,
    pub result: String,
}

/// V48.0: 数据权限统计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataPermissionStatsGql {
    pub total_permissions: i64,
    pub by_principal_type: Vec<String>,
    pub by_permission_level: Vec<String>,
    pub audit_logs: i64,
    pub masked_fields: i64,
}

/// V48.0: 内部行级过滤条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionCondition {
    pub field: String,
    pub operator: String,
    pub value: String,
}

impl PermissionCondition {
    fn to_gql(&self) -> PermissionConditionGql {
        PermissionConditionGql {
            field: self.field.clone(),
            operator: self.operator.clone(),
            value: self.value.clone(),
        }
    }

    /// 判断单行是否满足该条件
    fn matches(&self, row: &serde_json::Value) -> bool {
        let actual = match row.get(&self.field) {
            Some(v) => v,
            None => return false,
        };
        match self.operator.as_str() {
            "eq" => v48_json_eq(actual, &serde_json::Value::String(self.value.clone())),
            "ne" => !v48_json_eq(actual, &serde_json::Value::String(self.value.clone())),
            "in" => self
                .value
                .split(',')
                .map(|s| s.trim().to_string())
                .any(|s| v48_json_eq(actual, &serde_json::Value::String(s))),
            _ => true,
        }
    }
}

/// V48.0: JSON 值相等比较（字符串/原始值统一处理）
fn v48_json_eq(a: &serde_json::Value, b: &serde_json::Value) -> bool {
    match (a, b) {
        (serde_json::Value::String(x), serde_json::Value::String(y)) => x == y,
        _ => a == b,
    }
}

/// V48.0: 内部字段权限
#[derive(Debug, Clone)]
struct DataFieldPermission {
    field_name: String,
    allowed_levels: Vec<PermissionLevelGql>,
    mask_strategy: MaskStrategyGql,
}

impl DataFieldPermission {
    fn to_gql(&self) -> DataFieldPermissionGql {
        DataFieldPermissionGql {
            field_name: self.field_name.clone(),
            allowed_levels: self
                .allowed_levels
                .iter()
                .map(|l| l.as_str().to_string())
                .collect(),
            mask_strategy: self.mask_strategy,
        }
    }
}

/// V48.0: 内部数据权限
#[derive(Debug, Clone)]
struct DataPermission {
    permission_id: String,
    resource_type: String,
    resource_id: Option<String>,
    principal_type: PrincipalTypeGql,
    principal_id: String,
    permission_level: PermissionLevelGql,
    conditions: Vec<PermissionCondition>,
    field_permissions: Vec<DataFieldPermission>,
    granted_by: String,
    granted_at: DateTime<Utc>,
    expires_at: Option<DateTime<Utc>>,
}

impl DataPermission {
    fn to_gql(&self) -> DataPermissionGql {
        DataPermissionGql {
            permission_id: self.permission_id.clone(),
            resource_type: self.resource_type.clone(),
            resource_id: self.resource_id.clone(),
            principal_type: self.principal_type,
            principal_id: self.principal_id.clone(),
            permission_level: self.permission_level,
            conditions: self.conditions.iter().map(|c| c.to_gql()).collect(),
            field_permissions: self.field_permissions.iter().map(|f| f.to_gql()).collect(),
            granted_by: self.granted_by.clone(),
            granted_at: self.granted_at.to_rfc3339(),
            expires_at: self.expires_at.map(|t| t.to_rfc3339()),
        }
    }

    fn is_expired(&self) -> bool {
        match self.expires_at {
            Some(t) => Utc::now() > t,
            None => false,
        }
    }
}

/// V48.0: 内部权限审计日志
#[derive(Debug, Clone)]
struct PermissionAuditLog {
    action: String,
    principal: String,
    resource: String,
    permission_level: PermissionLevelGql,
    timestamp: DateTime<Utc>,
    result: String,
}

impl PermissionAuditLog {
    fn to_gql(&self) -> PermissionAuditLogGql {
        PermissionAuditLogGql {
            action: self.action.clone(),
            principal: self.principal.clone(),
            resource: self.resource.clone(),
            permission_level: self.permission_level.as_str().to_string(),
            timestamp: self.timestamp.to_rfc3339(),
            result: self.result.clone(),
        }
    }
}

/// V48.0: 数据权限状态
struct DataPermissionState {
    permissions: HashMap<String, DataPermission>,
    audit_logs: VecDeque<PermissionAuditLog>,
    masked_field_count: u64,
}

impl DataPermissionState {
    fn new() -> Self {
        Self {
            permissions: HashMap::new(),
            audit_logs: VecDeque::new(),
            masked_field_count: 0,
        }
    }
}

static DATA_PERMISSION_STATE: std::sync::OnceLock<Mutex<DataPermissionState>> =
    std::sync::OnceLock::new();

fn data_permission_state() -> &'static Mutex<DataPermissionState> {
    DATA_PERMISSION_STATE.get_or_init(|| Mutex::new(DataPermissionState::new()))
}

/// V48.0: 审计日志环形缓冲上限
const V48_AUDIT_LOG_MAX: usize = 2000;

/// V48.0: 写入审计日志（环形缓冲）
fn v48_push_audit(log: PermissionAuditLog) {
    let mut state = data_permission_state()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.audit_logs.push_back(log);
    while state.audit_logs.len() > V48_AUDIT_LOG_MAX {
        state.audit_logs.pop_front();
    }
}

/// V48.0: 数据级权限控制
pub struct DataLevelPermissions;

impl DataLevelPermissions {
    /// 授予权限
    pub fn grant_permission(
        resource_type: &str,
        resource_id: Option<&str>,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
        permission_level: PermissionLevelGql,
        conditions: Vec<PermissionConditionGql>,
        field_permissions: Vec<DataFieldPermissionGql>,
        granted_by: &str,
        expires_at: Option<DateTime<Utc>>,
    ) -> DataPermissionGql {
        let perm = DataPermission {
            permission_id: uuid_simple(),
            resource_type: resource_type.to_string(),
            resource_id: resource_id.map(|s| s.to_string()),
            principal_type,
            principal_id: principal_id.to_string(),
            permission_level,
            conditions: conditions
                .iter()
                .map(|c| PermissionCondition {
                    field: c.field.clone(),
                    operator: c.operator.clone(),
                    value: c.value.clone(),
                })
                .collect(),
            field_permissions: field_permissions
                .iter()
                .map(|f| DataFieldPermission {
                    field_name: f.field_name.clone(),
                    allowed_levels: f
                        .allowed_levels
                        .iter()
                        .map(|s| PermissionLevelGql::from_str(s))
                        .collect(),
                    mask_strategy: f.mask_strategy,
                })
                .collect(),
            granted_by: granted_by.to_string(),
            granted_at: Utc::now(),
            expires_at,
        };
        let gql = perm.to_gql();
        let audit_principal = format!("{}:{}", principal_type.as_str(), principal_id);
        let audit_resource = format!("{}:{}", resource_type, resource_id.unwrap_or("*"));
        {
            let mut state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state.permissions.insert(perm.permission_id.clone(), perm);
        }
        v48_push_audit(PermissionAuditLog {
            action: "grant".into(),
            principal: audit_principal,
            resource: audit_resource,
            permission_level,
            timestamp: Utc::now(),
            result: "success".into(),
        });
        gql
    }

    /// 撤销权限
    pub fn revoke_permission(permission_id: &str) -> bool {
        let removed = {
            let mut state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state.permissions.remove(permission_id)
        };
        if let Some(p) = removed {
            v48_push_audit(PermissionAuditLog {
                action: "revoke".into(),
                principal: format!("{}:{}", p.principal_type.as_str(), p.principal_id),
                resource: format!(
                    "{}:{}",
                    p.resource_type,
                    p.resource_id.as_deref().unwrap_or("*")
                ),
                permission_level: p.permission_level,
                timestamp: Utc::now(),
                result: "success".into(),
            });
            true
        } else {
            false
        }
    }

    /// 检查权限（资源 + 操作）。返回是否允许，并记录审计。
    pub fn check_permission(
        resource_type: &str,
        resource_id: Option<&str>,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
        required_level: PermissionLevelGql,
    ) -> bool {
        let allowed = {
            let state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .permissions
                .values()
                .filter(|p| !p.is_expired())
                .filter(|p| p.resource_type == resource_type)
                .filter(|p| {
                    p.resource_id.as_deref().unwrap_or("*") == "*"
                        || p.resource_id.as_deref() == resource_id
                })
                .filter(|p| p.principal_type == principal_type && p.principal_id == principal_id)
                .any(|p| p.permission_level >= required_level)
        };
        v48_push_audit(PermissionAuditLog {
            action: "check".into(),
            principal: format!("{}:{}", principal_type.as_str(), principal_id),
            resource: format!("{}:{}", resource_type, resource_id.unwrap_or("*")),
            permission_level: required_level,
            timestamp: Utc::now(),
            result: if allowed {
                "allowed".into()
            } else {
                "denied".into()
            },
        });
        allowed
    }

    /// 获取权限列表（可按主体/资源类型过滤）
    pub fn get_permissions(
        principal_type: Option<PrincipalTypeGql>,
        principal_id: Option<&str>,
        resource_type: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<DataPermissionGql> {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(100) as usize;
        state
            .permissions
            .values()
            .filter(|p| {
                principal_type
                    .map(|pt| p.principal_type == pt)
                    .unwrap_or(true)
            })
            .filter(|p| principal_id.map(|id| p.principal_id == id).unwrap_or(true))
            .filter(|p| {
                resource_type
                    .map(|rt| p.resource_type == rt)
                    .unwrap_or(true)
            })
            .take(limit)
            .map(|p| p.to_gql())
            .collect()
    }

    /// 应用行级过滤：根据主体权限条件过滤查询结果（多组条件 OR 语义）
    pub fn apply_row_filter(
        rows: Vec<serde_json::Value>,
        resource_type: &str,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
    ) -> Vec<serde_json::Value> {
        let condition_sets: Vec<Vec<PermissionCondition>> = {
            let state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .permissions
                .values()
                .filter(|p| !p.is_expired())
                .filter(|p| p.resource_type == resource_type)
                .filter(|p| p.principal_type == principal_type && p.principal_id == principal_id)
                .map(|p| p.conditions.clone())
                .collect()
        };

        rows.into_iter()
            .filter(|row| {
                if condition_sets.is_empty() {
                    return true;
                }
                condition_sets
                    .iter()
                    .any(|conds| conds.is_empty() || conds.iter().all(|c| c.matches(row)))
            })
            .collect()
    }

    /// 应用字段掩码：根据字段权限的 mask_strategy 脱敏敏感字段
    pub fn apply_field_mask(
        mut row: serde_json::Value,
        resource_type: &str,
        principal_type: PrincipalTypeGql,
        principal_id: &str,
        principal_levels: &[PermissionLevelGql],
    ) -> serde_json::Value {
        let field_rules: Vec<(String, Vec<PermissionLevelGql>, MaskStrategyGql)> = {
            let state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state
                .permissions
                .values()
                .filter(|p| !p.is_expired())
                .filter(|p| p.resource_type == resource_type)
                .filter(|p| p.principal_type == principal_type && p.principal_id == principal_id)
                .flat_map(|p| p.field_permissions.iter())
                .map(|f| {
                    (
                        f.field_name.clone(),
                        f.allowed_levels.clone(),
                        f.mask_strategy,
                    )
                })
                .collect()
        };

        let mut masked_count = 0u64;
        if let Some(obj) = row.as_object_mut() {
            for (field, allowed_levels, strategy) in &field_rules {
                // 主体持有任一允许级别则不掩码
                if principal_levels
                    .iter()
                    .any(|pl| allowed_levels.contains(pl))
                {
                    continue;
                }
                if let Some(val) = obj.get_mut(field.as_str()) {
                    *val = v48_mask_value(val, *strategy);
                    masked_count += 1;
                }
            }
        }
        if masked_count > 0 {
            let mut state = data_permission_state()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            state.masked_field_count += masked_count;
        }
        row
    }

    /// 获取有效权限（合并用户/角色/组权限，按级别排序）
    pub fn get_effective_permissions(
        resource_type: &str,
        resource_id: Option<&str>,
        principal_specs: &[(PrincipalTypeGql, &str)],
    ) -> Vec<DataPermissionGql> {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut matching: Vec<&DataPermission> = state
            .permissions
            .values()
            .filter(|p| !p.is_expired())
            .filter(|p| p.resource_type == resource_type)
            .filter(|p| {
                p.resource_id.as_deref().unwrap_or("*") == "*"
                    || p.resource_id.as_deref() == resource_id
            })
            .filter(|p| {
                principal_specs
                    .iter()
                    .any(|(pt, id)| p.principal_type == *pt && p.principal_id == *id)
            })
            .collect();
        // 按权限级别升序排列（最低在前，调用方可取末尾为最高有效权限）
        matching.sort_by_key(|p| p.permission_level);
        matching.iter().map(|p| p.to_gql()).collect()
    }

    /// 获取权限审计日志（按时间倒序）
    pub fn get_audit_logs(limit: Option<u32>) -> Vec<PermissionAuditLogGql> {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(100) as usize;
        state
            .audit_logs
            .iter()
            .rev()
            .take(limit)
            .map(|l| l.to_gql())
            .collect()
    }

    /// 获取数据权限统计
    pub fn get_stats() -> DataPermissionStatsGql {
        let state = data_permission_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut by_principal: HashMap<PrincipalTypeGql, u64> = HashMap::new();
        let mut by_level: HashMap<PermissionLevelGql, u64> = HashMap::new();
        for p in state.permissions.values() {
            *by_principal.entry(p.principal_type).or_insert(0) += 1;
            *by_level.entry(p.permission_level).or_insert(0) += 1;
        }
        let mut principal_list: Vec<String> = Vec::new();
        for pt in [
            PrincipalTypeGql::User,
            PrincipalTypeGql::Role,
            PrincipalTypeGql::Group,
            PrincipalTypeGql::ServiceAccount,
            PrincipalTypeGql::Department,
        ] {
            let count = by_principal.get(&pt).copied().unwrap_or(0);
            principal_list.push(format!("{}:{}", pt.as_str(), count));
        }
        let mut level_list: Vec<String> = Vec::new();
        for pl in [
            PermissionLevelGql::None,
            PermissionLevelGql::Read,
            PermissionLevelGql::Write,
            PermissionLevelGql::Delete,
            PermissionLevelGql::Admin,
            PermissionLevelGql::Owner,
        ] {
            let count = by_level.get(&pl).copied().unwrap_or(0);
            level_list.push(format!("{}:{}", pl.as_str(), count));
        }
        DataPermissionStatsGql {
            total_permissions: state.permissions.len() as i64,
            by_principal_type: principal_list,
            by_permission_level: level_list,
            audit_logs: state.audit_logs.len() as i64,
            masked_fields: state.masked_field_count as i64,
        }
    }
}

/// V48.0: 对单个值应用掩码
fn v48_mask_value(value: &serde_json::Value, strategy: MaskStrategyGql) -> serde_json::Value {
    match strategy {
        MaskStrategyGql::None => value.clone(),
        MaskStrategyGql::Partial => match value {
            serde_json::Value::String(s) => {
                let len = s.chars().count();
                if len <= 2 {
                    serde_json::Value::String("*".repeat(len))
                } else {
                    let keep: String = s.chars().take(1).collect();
                    serde_json::Value::String(format!("{}{}", keep, "*".repeat(len - 1)))
                }
            }
            _ => serde_json::Value::String("***".into()),
        },
        MaskStrategyGql::Hash => {
            let hex: String = v48_sha256_hex(value.to_string().as_bytes())
                .chars()
                .take(8)
                .collect();
            serde_json::Value::String(format!("hash:{}", hex))
        }
        MaskStrategyGql::Encrypt => serde_json::Value::String("[encrypted]".into()),
        MaskStrategyGql::Redact => serde_json::Value::String("[redacted]".into()),
        MaskStrategyGql::Custom => serde_json::Value::String("[custom-mask]".into()),
    }
}
