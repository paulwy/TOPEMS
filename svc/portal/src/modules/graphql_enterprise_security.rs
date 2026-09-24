//! V42.0 Track E: GraphQL 企业级安全（自 graphql_schema.rs 拆分）
//!
//! 在 V40.0-E（深度/复杂度/速率/IP黑名单 + SecurityEvent）和 V41.0-E（白名单自动化 +
//! 安全报表 + 调优建议）基础上，实现企业级安全体系：
//! 1. 字段级权限控制（基于角色/用户的字段访问控制）
//! 2. 数据掩码（敏感字段自动掩码：Full/Partial/Hash/Truncate/Null/Range）
//! 3. 审计追踪强化（字段级访问审计 + 数据变更审计，环形缓冲 2000 条上限）
//! 4. 安全配置管理（开关 + 默认拒绝 + 仅审计敏感字段）
//!
//! 权限和掩码规则用全局 RwLock 包裹的 HashMap 存储；审计记录用环形缓冲。
//! 掩码在响应序列化前应用；权限检查在查询执行前应用。
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_enterprise_security::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::sync::{Mutex, RwLock};

// 在 V40.0-E（深度/复杂度/速率/IP黑名单 + SecurityEvent）和 V41.0-E（白名单自动化 +
// 安全报表 + 调优建议）基础上，实现企业级安全体系：
// 1. 字段级权限控制（基于角色/用户的字段访问控制）
// 2. 数据掩码（敏感字段自动掩码：Full/Partial/Hash/Truncate/Null/Range）
// 3. 审计追踪强化（字段级访问审计 + 数据变更审计，环形缓冲 2000 条上限）
// 4. 安全配置管理（开关 + 默认拒绝 + 仅审计敏感字段）
//
// 权限和掩码规则用全局 RwLock 包裹的 HashMap 存储；审计记录用环形缓冲。
// 掩码在响应序列化前应用；权限检查在查询执行前应用。

// ---------------- V42.0: 字段级权限控制 ----------------

/// V42.0: 用户角色
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UserRole {
    Admin,
    Manager,
    Accountant,
    SalesPerson,
    Viewer,
    Custom(String),
}

impl UserRole {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Admin => "admin",
            Self::Manager => "manager",
            Self::Accountant => "accountant",
            Self::SalesPerson => "sales_person",
            Self::Viewer => "viewer",
            Self::Custom(s) => s.as_str(),
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "admin" => Self::Admin,
            "manager" => Self::Manager,
            "accountant" => Self::Accountant,
            "sales_person" => Self::SalesPerson,
            "viewer" => Self::Viewer,
            other => Self::Custom(other.to_string()),
        }
    }
}

/// V42.0: 权限检查结果
#[derive(Debug, Clone)]
pub enum PermissionResult {
    Allowed,
    Denied(String),
    Conditional(String),
}

/// V42.0: 字段权限规则
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct FieldPermission {
    pub entity_type: String,
    pub field_name: String,
    pub allowed_roles: Vec<String>,
    pub denied_roles: Vec<String>,
    pub condition: Option<String>,
}

/// V42.0: 全局字段权限规则存储（entity_type -> rules）
static FIELD_PERMISSIONS: std::sync::OnceLock<RwLock<HashMap<String, Vec<FieldPermission>>>> =
    std::sync::OnceLock::new();

fn field_permissions() -> &'static RwLock<HashMap<String, Vec<FieldPermission>>> {
    FIELD_PERMISSIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

/// V42.0: 字段权限检查器
pub struct FieldPermissionChecker;

impl FieldPermissionChecker {
    pub fn new() -> Self {
        Self
    }

    /// 检查指定字段对给定角色的访问权限
    pub fn check(
        &self,
        entity_type: &str,
        field_name: &str,
        roles: &[UserRole],
    ) -> PermissionResult {
        let rules = field_permissions()
            .read()
            .unwrap_or_else(|e| e.into_inner());
        let config = security_config()
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone();

        if let Some(entity_rules) = rules.get(entity_type) {
            if let Some(rule) = entity_rules.iter().find(|r| r.field_name == field_name) {
                let role_names: Vec<String> =
                    roles.iter().map(|r| r.as_str().to_string()).collect();
                // 1. 检查拒绝列表
                for denied in &rule.denied_roles {
                    if role_names.iter().any(|r| r == denied) {
                        return PermissionResult::Denied(format!(
                            "Role '{}' is explicitly denied for {}.{}",
                            denied, entity_type, field_name
                        ));
                    }
                }
                // 2. 检查允许列表
                if rule.allowed_roles.is_empty() {
                    // 空允许列表 = 对所有角色允许（除非被拒绝）
                    return match &rule.condition {
                        Some(c) => PermissionResult::Conditional(c.clone()),
                        None => PermissionResult::Allowed,
                    };
                }
                for allowed in &rule.allowed_roles {
                    if role_names.iter().any(|r| r == allowed) {
                        return match &rule.condition {
                            Some(c) => PermissionResult::Conditional(c.clone()),
                            None => PermissionResult::Allowed,
                        };
                    }
                }
                return PermissionResult::Denied(format!(
                    "None of the roles are allowed for {}.{}",
                    entity_type, field_name
                ));
            }
        }
        // 3. 未配置规则：根据默认策略
        if config.default_deny {
            PermissionResult::Denied(format!(
                "No rule for {}.{} and default_deny is enabled",
                entity_type, field_name
            ))
        } else {
            PermissionResult::Allowed
        }
    }

    /// 过滤掉无权限的字段
    pub fn filter_fields(
        &self,
        entity_type: &str,
        fields: &[String],
        roles: &[UserRole],
    ) -> Vec<String> {
        fields
            .iter()
            .filter(|f| {
                matches!(
                    self.check(entity_type, f, roles),
                    PermissionResult::Allowed | PermissionResult::Conditional(_)
                )
            })
            .cloned()
            .collect()
    }
}

impl Default for FieldPermissionChecker {
    fn default() -> Self {
        Self::new()
    }
}

/// V42.0: 设置字段权限（覆盖同 entity_type + field_name 的规则）
pub fn set_field_permission(permission: FieldPermission) {
    let mut rules = field_permissions()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    let entry = rules.entry(permission.entity_type.clone()).or_default();
    entry.retain(|r| r.field_name != permission.field_name);
    entry.push(permission);
}

/// V42.0: 移除字段权限
pub fn remove_field_permission(entity_type: &str, field_name: &str) -> bool {
    let mut rules = field_permissions()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = rules.get_mut(entity_type) {
        let before = entry.len();
        entry.retain(|r| r.field_name != field_name);
        return entry.len() < before;
    }
    false
}

/// V42.0: 获取字段权限规则列表（可按 entity_type 过滤）
pub fn get_field_permissions(entity_type: Option<&str>) -> Vec<FieldPermission> {
    let rules = field_permissions()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    match entity_type {
        Some(et) => rules.get(et).cloned().unwrap_or_default(),
        None => rules.values().flatten().cloned().collect(),
    }
}

/// V42.0: 预定义字段权限规则
pub fn init_field_permissions() {
    let mut rules = field_permissions()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    // 仅在为空时初始化，避免重复添加
    if !rules.is_empty() {
        return;
    }
    let defaults = vec![
        FieldPermission {
            entity_type: "Customer".to_string(),
            field_name: "salary".to_string(),
            allowed_roles: vec!["admin".to_string(), "manager".to_string()],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Customer".to_string(),
            field_name: "credit_limit".to_string(),
            allowed_roles: vec![
                "admin".to_string(),
                "manager".to_string(),
                "accountant".to_string(),
            ],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Supplier".to_string(),
            field_name: "bank_account".to_string(),
            allowed_roles: vec!["admin".to_string(), "accountant".to_string()],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Voucher".to_string(),
            field_name: "amount".to_string(),
            allowed_roles: vec![],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Employee".to_string(),
            field_name: "salary".to_string(),
            allowed_roles: vec!["admin".to_string(), "manager".to_string()],
            denied_roles: vec![],
            condition: None,
        },
        FieldPermission {
            entity_type: "Employee".to_string(),
            field_name: "id_number".to_string(),
            allowed_roles: vec!["admin".to_string()],
            denied_roles: vec![],
            condition: None,
        },
    ];
    for perm in defaults {
        rules
            .entry(perm.entity_type.clone())
            .or_default()
            .push(perm);
    }
}

// ---------------- V42.0: 数据掩码 ----------------

/// V42.0: 掩码类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq)]
pub enum MaskType {
    Full,
    Partial,
    Hash,
    Truncate,
    Null,
    Range,
}

impl MaskType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Partial => "partial",
            Self::Hash => "hash",
            Self::Truncate => "truncate",
            Self::Null => "null",
            Self::Range => "range",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "full" => Self::Full,
            "partial" => Self::Partial,
            "hash" => Self::Hash,
            "truncate" => Self::Truncate,
            "null" => Self::Null,
            "range" => Self::Range,
            _ => Self::Full,
        }
    }
}

/// V42.0: 掩码规则
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct MaskingRule {
    pub entity_type: String,
    pub field_name: String,
    pub mask_type: MaskType,
    pub exempt_roles: Vec<String>,
}

/// V42.0: 全局掩码规则存储（entity_type -> rules）
static MASKING_RULES: std::sync::OnceLock<RwLock<HashMap<String, Vec<MaskingRule>>>> =
    std::sync::OnceLock::new();

fn masking_rules() -> &'static RwLock<HashMap<String, Vec<MaskingRule>>> {
    MASKING_RULES.get_or_init(|| RwLock::new(HashMap::new()))
}

/// V42.0: 应用掩码
///
/// 根据规则和角色对值进行掩码处理；若角色豁免或未配置规则则返回原值
pub fn apply_masking(
    entity_type: &str,
    field_name: &str,
    value: &serde_json::Value,
    roles: &[UserRole],
) -> serde_json::Value {
    let config = security_config()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    if !config.data_masking_enabled {
        return value.clone();
    }
    let rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
    let rule = match rules.get(entity_type) {
        Some(entry) => entry.iter().find(|r| r.field_name == field_name),
        None => None,
    };
    let rule = match rule {
        Some(r) => r,
        None => return value.clone(),
    };
    // 检查角色是否豁免
    let role_names: Vec<&str> = roles.iter().map(|r| r.as_str()).collect();
    for exempt in &rule.exempt_roles {
        if role_names.contains(&exempt.as_str()) {
            return value.clone();
        }
    }
    mask_value(value, &rule.mask_type)
}

/// V42.0: 对单个值应用掩码
pub fn mask_value(value: &serde_json::Value, mask_type: &MaskType) -> serde_json::Value {
    match mask_type {
        MaskType::Full => serde_json::Value::String("****".to_string()),
        MaskType::Partial => match value {
            serde_json::Value::String(s) => {
                let chars: Vec<char> = s.chars().collect();
                if chars.len() <= 4 {
                    serde_json::Value::String("****".to_string())
                } else {
                    let head: String = chars.iter().take(2).collect();
                    let tail: String = chars.iter().skip(chars.len() - 2).collect();
                    serde_json::Value::String(format!("{}**{}", head, tail))
                }
            }
            serde_json::Value::Number(n) => {
                if let Some(f) = n.as_f64() {
                    let s = f.to_string();
                    let chars: Vec<char> = s.chars().collect();
                    let show = ((chars.len() as f64) * 0.3).ceil() as usize;
                    let show = show.min(chars.len());
                    let head: String = chars.iter().take(show).collect();
                    serde_json::Value::String(format!("{}****", head))
                } else {
                    serde_json::Value::String("****".to_string())
                }
            }
            _ => serde_json::Value::String("****".to_string()),
        },
        MaskType::Hash => {
            let s = match value {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            let mut hasher = Sha256::new();
            hasher.update(s.as_bytes());
            let digest = hasher.finalize();
            let hex: String = digest
                .iter()
                .take(4)
                .map(|b| format!("{:02x}", b))
                .collect();
            serde_json::Value::String(format!("hash:{}", hex))
        }
        MaskType::Truncate => match value {
            serde_json::Value::String(s) => {
                let truncated: String = s.chars().take(3).collect();
                serde_json::Value::String(format!("{}...", truncated))
            }
            _ => serde_json::Value::String("***".to_string()),
        },
        MaskType::Null => serde_json::Value::Null,
        MaskType::Range => {
            if let Some(n) = value.as_f64() {
                let bucket = if n < 1000.0 {
                    "<1000"
                } else if n < 10000.0 {
                    "1000-10000"
                } else if n < 100000.0 {
                    "10000-100000"
                } else {
                    ">100000"
                };
                serde_json::Value::String(bucket.to_string())
            } else {
                serde_json::Value::String("invalid".to_string())
            }
        }
    }
}

/// V42.0: 设置掩码规则（覆盖同 entity_type + field_name 的规则）
pub fn set_masking_rule(rule: MaskingRule) {
    let mut rules = masking_rules().write().unwrap_or_else(|e| e.into_inner());
    let entry = rules.entry(rule.entity_type.clone()).or_default();
    entry.retain(|r| r.field_name != rule.field_name);
    entry.push(rule);
}

/// V42.0: 移除掩码规则
pub fn remove_masking_rule(entity_type: &str, field_name: &str) -> bool {
    let mut rules = masking_rules().write().unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = rules.get_mut(entity_type) {
        let before = entry.len();
        entry.retain(|r| r.field_name != field_name);
        return entry.len() < before;
    }
    false
}

/// V42.0: 获取掩码规则列表（可按 entity_type 过滤）
pub fn get_masking_rules(entity_type: Option<&str>) -> Vec<MaskingRule> {
    let rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
    match entity_type {
        Some(et) => rules.get(et).cloned().unwrap_or_default(),
        None => rules.values().flatten().cloned().collect(),
    }
}

/// V42.0: 预定义掩码规则
pub fn init_masking_rules() {
    let mut rules = masking_rules().write().unwrap_or_else(|e| e.into_inner());
    if !rules.is_empty() {
        return;
    }
    let defaults = vec![
        MaskingRule {
            entity_type: "Customer".to_string(),
            field_name: "phone".to_string(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".to_string()],
        },
        MaskingRule {
            entity_type: "Customer".to_string(),
            field_name: "email".to_string(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".to_string()],
        },
        MaskingRule {
            entity_type: "Customer".to_string(),
            field_name: "id_number".to_string(),
            mask_type: MaskType::Full,
            exempt_roles: vec!["admin".to_string()],
        },
        MaskingRule {
            entity_type: "Supplier".to_string(),
            field_name: "bank_account".to_string(),
            mask_type: MaskType::Full,
            exempt_roles: vec!["admin".to_string(), "accountant".to_string()],
        },
        MaskingRule {
            entity_type: "Employee".to_string(),
            field_name: "salary".to_string(),
            mask_type: MaskType::Range,
            exempt_roles: vec!["admin".to_string(), "manager".to_string()],
        },
        MaskingRule {
            entity_type: "Employee".to_string(),
            field_name: "phone".to_string(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".to_string(), "manager".to_string()],
        },
        MaskingRule {
            entity_type: "Employee".to_string(),
            field_name: "address".to_string(),
            mask_type: MaskType::Truncate,
            exempt_roles: vec!["admin".to_string()],
        },
    ];
    for rule in defaults {
        rules
            .entry(rule.entity_type.clone())
            .or_default()
            .push(rule);
    }
}

// ---------------- V42.0: 审计追踪强化 ----------------

/// V42.0: 字段级访问审计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct FieldAccessAudit {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub user_roles: Vec<String>,
    pub ip: Option<String>,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub field_name: String,
    pub access_result: String,
    pub mask_type: Option<String>,
    pub query_hash: Option<String>,
}

/// V42.0: 字段变更记录
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct FieldChange {
    pub field_name: String,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
    pub masked: bool,
}

/// V42.0: 数据变更审计
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct DataChangeAudit {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub user_roles: Vec<String>,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub changed_fields: Vec<FieldChange>,
    pub mutation_name: String,
    pub query_hash: Option<String>,
}

/// V42.0: 审计存储（环形缓冲）
static FIELD_ACCESS_AUDITS: std::sync::OnceLock<Mutex<VecDeque<FieldAccessAudit>>> =
    std::sync::OnceLock::new();

static DATA_CHANGE_AUDITS: std::sync::OnceLock<Mutex<VecDeque<DataChangeAudit>>> =
    std::sync::OnceLock::new();

/// V42.0: 审计记录最大保留条数
const MAX_AUDIT_RECORDS: usize = 2000;

fn field_access_audits_store() -> &'static Mutex<VecDeque<FieldAccessAudit>> {
    FIELD_ACCESS_AUDITS.get_or_init(|| Mutex::new(VecDeque::new()))
}

fn data_change_audits_store() -> &'static Mutex<VecDeque<DataChangeAudit>> {
    DATA_CHANGE_AUDITS.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// V42.0: 记录字段访问审计
pub fn record_field_access(audit: FieldAccessAudit) {
    let mut store = field_access_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if store.len() >= MAX_AUDIT_RECORDS {
        store.pop_front();
    }
    store.push_back(audit);
}

/// V42.0: 记录数据变更审计
pub fn record_data_change(audit: DataChangeAudit) {
    let mut store = data_change_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if store.len() >= MAX_AUDIT_RECORDS {
        store.pop_front();
    }
    store.push_back(audit);
}

/// V42.0: 获取字段访问审计（按时间倒序，可按 entity_type 过滤）
pub fn get_field_access_audits(limit: usize, entity_type: Option<&str>) -> Vec<FieldAccessAudit> {
    let store = field_access_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store
        .iter()
        .rev()
        .filter(|a| entity_type.is_none_or(|et| a.entity_type == et))
        .take(limit)
        .cloned()
        .collect()
}

/// V42.0: 获取数据变更审计（按时间倒序，可按 entity_type 过滤）
pub fn get_data_change_audits(limit: usize, entity_type: Option<&str>) -> Vec<DataChangeAudit> {
    let store = data_change_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store
        .iter()
        .rev()
        .filter(|a| entity_type.is_none_or(|et| a.entity_type == et))
        .take(limit)
        .cloned()
        .collect()
}

/// V42.0: 字段访问审计总数
pub fn get_field_access_audit_count() -> usize {
    field_access_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V42.0: 数据变更审计总数
pub fn get_data_change_audit_count() -> usize {
    data_change_audits_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

/// V42.0: 检查字段访问权限并记录审计（供解析器在查询执行前调用）
pub fn check_and_record_field_access(
    entity_type: &str,
    field_name: &str,
    entity_id: Option<&str>,
    user_id: Option<&str>,
    user_roles: &[UserRole],
    ip: Option<&str>,
    query_hash: Option<&str>,
) -> PermissionResult {
    let config = security_config()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let checker = FieldPermissionChecker::new();
    let result = checker.check(entity_type, field_name, user_roles);

    let audit_enabled = config.field_audit_enabled
        && (!config.audit_sensitive_fields_only || is_sensitive_field(entity_type, field_name));

    if audit_enabled {
        let (access_result, mask_type) = match &result {
            PermissionResult::Allowed => ("allowed".to_string(), None),
            PermissionResult::Denied(_) => ("denied".to_string(), None),
            PermissionResult::Conditional(_) => ("conditional".to_string(), None),
        };
        // 若允许且该字段有掩码规则，则标记为 masked
        let (access_result, mask_type) = if matches!(
            result,
            PermissionResult::Allowed | PermissionResult::Conditional(_)
        ) {
            let rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
            if let Some(entry) = rules.get(entity_type) {
                if let Some(rule) = entry.iter().find(|r| r.field_name == field_name) {
                    let role_names: Vec<&str> = user_roles.iter().map(|r| r.as_str()).collect();
                    let exempt = rule
                        .exempt_roles
                        .iter()
                        .any(|er| role_names.contains(&er.as_str()));
                    if !exempt {
                        (
                            "masked".to_string(),
                            Some(rule.mask_type.as_str().to_string()),
                        )
                    } else {
                        (access_result, mask_type)
                    }
                } else {
                    (access_result, mask_type)
                }
            } else {
                (access_result, mask_type)
            }
        } else {
            (access_result, mask_type)
        };

        record_field_access(FieldAccessAudit {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            user_id: user_id.map(|s| s.to_string()),
            user_roles: user_roles.iter().map(|r| r.as_str().to_string()).collect(),
            ip: ip.map(|s| s.to_string()),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.map(|s| s.to_string()),
            field_name: field_name.to_string(),
            access_result,
            mask_type,
            query_hash: query_hash.map(|s| s.to_string()),
        });
    }
    result
}

/// V42.0: 判断字段是否为敏感字段（有权限规则或掩码规则即视为敏感）
fn is_sensitive_field(entity_type: &str, field_name: &str) -> bool {
    let perm_rules = field_permissions()
        .read()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = perm_rules.get(entity_type) {
        if entry.iter().any(|r| r.field_name == field_name) {
            return true;
        }
    }
    let mask_rules = masking_rules().read().unwrap_or_else(|e| e.into_inner());
    if let Some(entry) = mask_rules.get(entity_type) {
        if entry.iter().any(|r| r.field_name == field_name) {
            return true;
        }
    }
    false
}

// ---------------- V42.0: 安全配置管理 ----------------

/// V42.0: 安全配置
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SecurityConfig {
    pub field_permissions_enabled: bool,
    pub data_masking_enabled: bool,
    pub field_audit_enabled: bool,
    pub data_change_audit_enabled: bool,
    pub default_deny: bool,
    pub audit_sensitive_fields_only: bool,
}

static SECURITY_CONFIG: std::sync::OnceLock<RwLock<SecurityConfig>> = std::sync::OnceLock::new();

fn security_config() -> &'static RwLock<SecurityConfig> {
    SECURITY_CONFIG.get_or_init(|| {
        RwLock::new(SecurityConfig {
            field_permissions_enabled: true,
            data_masking_enabled: true,
            field_audit_enabled: true,
            data_change_audit_enabled: true,
            default_deny: false,
            audit_sensitive_fields_only: true,
        })
    })
}

/// V42.0: 获取安全配置
pub fn get_security_config() -> SecurityConfig {
    security_config()
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
}

/// V42.0: 更新安全配置
pub fn update_security_config(config: SecurityConfig) -> SecurityConfig {
    let mut current = security_config().write().unwrap_or_else(|e| e.into_inner());
    *current = config;
    current.clone()
}

// ---------------- V42.0: GraphQL Input 类型 ----------------

/// V42.0: 字段权限输入
#[derive(async_graphql::InputObject)]
pub struct FieldPermissionInput {
    pub entity_type: String,
    pub field_name: String,
    pub allowed_roles: Option<Vec<String>>,
    pub denied_roles: Option<Vec<String>>,
    pub condition: Option<String>,
}

impl From<FieldPermissionInput> for FieldPermission {
    fn from(input: FieldPermissionInput) -> Self {
        FieldPermission {
            entity_type: input.entity_type,
            field_name: input.field_name,
            allowed_roles: input.allowed_roles.unwrap_or_default(),
            denied_roles: input.denied_roles.unwrap_or_default(),
            condition: input.condition,
        }
    }
}

/// V42.0: 掩码规则输入
#[derive(async_graphql::InputObject)]
pub struct MaskingRuleInput {
    pub entity_type: String,
    pub field_name: String,
    pub mask_type: MaskType,
    pub exempt_roles: Option<Vec<String>>,
}

impl From<MaskingRuleInput> for MaskingRule {
    fn from(input: MaskingRuleInput) -> Self {
        MaskingRule {
            entity_type: input.entity_type,
            field_name: input.field_name,
            mask_type: input.mask_type,
            exempt_roles: input.exempt_roles.unwrap_or_default(),
        }
    }
}

/// V42.0: 安全配置输入
#[derive(async_graphql::InputObject)]
pub struct SecurityConfigInput {
    pub field_permissions_enabled: Option<bool>,
    pub data_masking_enabled: Option<bool>,
    pub field_audit_enabled: Option<bool>,
    pub data_change_audit_enabled: Option<bool>,
    pub default_deny: Option<bool>,
    pub audit_sensitive_fields_only: Option<bool>,
}

/// V42.0: 初始化所有企业级安全规则（在 build_schema 中调用）
pub fn init_enterprise_security() {
    init_field_permissions();
    init_masking_rules();
}
