//! Tier 分层：free/basic/advanced 三层功能清单 + 权限自动关联 + 订阅状态
//!
//! 纯逻辑（无 IO，可单测）：
//! - `Tier`：Free / Basic / Advanced 三层
//! - `tier_modules`：该 tier 开放的模块 feature 清单（与 svc/server 的 module-xxx 对齐）
//! - `tier_has_module`：功能开关（模块级 feature 判定）
//! - `tier_permissions`：权限自动关联（tier → 基础权限集，模块级只读）
//! - `SubscriptionStatus` + `resolve_effective_tier`：订阅状态决定生效 tier
//! - `modules_to_disable_for_tier`：模块化单体按 tier 裁剪建议

use serde::{Deserialize, Serialize};
use std::fmt;

/// 三层订阅 tier（free < basic < advanced）
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Tier {
    Free,
    Basic,
    Advanced,
}

impl fmt::Display for Tier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Tier::Free => "free",
            Tier::Basic => "basic",
            Tier::Advanced => "advanced",
        };
        write!(f, "{s}")
    }
}

impl Tier {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "free" => Some(Tier::Free),
            "basic" => Some(Tier::Basic),
            "advanced" => Some(Tier::Advanced),
            _ => None,
        }
    }
}

/// 该 tier 开放的模块 feature 清单（与 svc/server 的 module-xxx 对齐）
///
/// - free：平台核心（IAM/文档/流程/门户/ticket）
/// - basic：核心 + 企业资源（erp/finance/scm/wms）
/// - advanced：全部 15 个模块（含 qms/crm/hrm/pm/mes/ehs/lims/tms/advanced/ai）
pub fn tier_modules(tier: Tier) -> &'static [&'static str] {
    match tier {
        Tier::Free => &["module-core"],
        Tier::Basic => &[
            "module-core",
            "module-erp",
            "module-finance",
            "module-scm",
            "module-wms",
        ],
        Tier::Advanced => &[
            "module-core",
            "module-erp",
            "module-finance",
            "module-qms",
            "module-crm",
            "module-hrm",
            "module-scm",
            "module-wms",
            "module-pm",
            "module-mes",
            "module-ehs",
            "module-lims",
            "module-tms",
            "module-advanced",
            "module-ai",
        ],
    }
}

/// 功能开关：某 tier 是否开放某模块（module-xxx 形式）
pub fn tier_has_module(tier: Tier, module: &str) -> bool {
    tier_modules(tier).contains(&module)
}

/// tier 权限自动关联：返回该 tier 自动获得的基础权限集（模块级只读 + 平台级）
pub fn tier_permissions(tier: Tier) -> Vec<String> {
    let modules = tier_modules(tier);
    let mut perms: Vec<String> = Vec::new();
    for m in modules {
        let name = m.trim_start_matches("module-");
        perms.push(format!("{name}:read"));
        perms.push(format!("{name}:view"));
    }
    perms.push("dashboard:read".to_string());
    perms.push("iam:view".to_string());
    // 平台级订阅：所有 tier 可查询自己的订阅状态（subscription:read）
    perms.push("subscription:read".to_string());
    perms.sort();
    perms.dedup();
    perms
}

/// 订阅状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    Active,
    Trial,
    Expired,
    Canceled,
}

impl SubscriptionStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "active" => Some(SubscriptionStatus::Active),
            "trial" => Some(SubscriptionStatus::Trial),
            "expired" => Some(SubscriptionStatus::Expired),
            "canceled" => Some(SubscriptionStatus::Canceled),
            _ => None,
        }
    }
}

/// 订阅状态决定生效 tier：active/trial 保持订阅 tier；expired/canceled 降级到 free
pub fn resolve_effective_tier(subscribed: Tier, status: SubscriptionStatus) -> Tier {
    match status {
        SubscriptionStatus::Active | SubscriptionStatus::Trial => subscribed,
        SubscriptionStatus::Expired | SubscriptionStatus::Canceled => Tier::Free,
    }
}

/// 模块裁剪建议：给定订阅 tier 与当前启用模块，返回应裁剪的模块（不在该 tier 开放清单内）
pub fn modules_to_disable_for_tier(tier: Tier, enabled: &[&str]) -> Vec<String> {
    let allowed = tier_modules(tier);
    enabled
        .iter()
        .filter(|m| !allowed.contains(m))
        .map(|s| s.to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_rank_order() {
        assert!(Tier::Free < Tier::Basic);
        assert!(Tier::Basic < Tier::Advanced);
        assert!(Tier::Free < Tier::Advanced);
    }

    #[test]
    fn tier_display_and_parse() {
        assert_eq!(Tier::Free.to_string(), "free");
        assert_eq!(Tier::Basic.to_string(), "basic");
        assert_eq!(Tier::Advanced.to_string(), "advanced");
        assert_eq!(Tier::from_str("basic"), Some(Tier::Basic));
        assert_eq!(Tier::from_str("premium"), None);
    }

    #[test]
    fn tier_modules_nested_subset() {
        let free = tier_modules(Tier::Free);
        let basic = tier_modules(Tier::Basic);
        let advanced = tier_modules(Tier::Advanced);
        for m in free {
            assert!(basic.contains(m), "{m} should be in basic");
        }
        for m in basic {
            assert!(advanced.contains(m), "{m} should be in advanced");
        }
    }

    #[test]
    fn tier_has_module_boundary() {
        assert!(tier_has_module(Tier::Free, "module-core"));
        assert!(!tier_has_module(Tier::Free, "module-finance"));
        assert!(tier_has_module(Tier::Basic, "module-finance"));
        assert!(!tier_has_module(Tier::Basic, "module-qms"));
        assert!(tier_has_module(Tier::Advanced, "module-qms"));
        assert!(tier_has_module(Tier::Advanced, "module-ai"));
        assert!(tier_has_module(Tier::Advanced, "module-tms"));
    }

    #[test]
    fn tier_permissions_auto_association() {
        let free_perms = tier_permissions(Tier::Free);
        assert!(free_perms.contains(&"core:read".to_string()));
        assert!(free_perms.contains(&"dashboard:read".to_string()));
        assert!(free_perms.contains(&"subscription:read".to_string()));
        assert!(!free_perms.contains(&"finance:read".to_string()));

        let advanced_perms = tier_permissions(Tier::Advanced);
        assert!(advanced_perms.contains(&"finance:read".to_string()));
        assert!(advanced_perms.contains(&"qms:read".to_string()));
        assert!(advanced_perms.contains(&"ai:read".to_string()));
    }

    #[test]
    fn tier_permissions_sorted_deduped() {
        let perms = tier_permissions(Tier::Basic);
        let mut sorted = perms.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(perms, sorted, "permissions should be sorted and deduped");
    }

    #[test]
    fn subscription_active_keeps_tier() {
        assert_eq!(
            resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Active),
            Tier::Advanced
        );
        assert_eq!(
            resolve_effective_tier(Tier::Basic, SubscriptionStatus::Trial),
            Tier::Basic
        );
    }

    #[test]
    fn subscription_expired_downgrades_to_free() {
        assert_eq!(
            resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Expired),
            Tier::Free
        );
        assert_eq!(
            resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Canceled),
            Tier::Free
        );
    }

    #[test]
    fn subscription_status_parse() {
        assert_eq!(
            SubscriptionStatus::from_str("active"),
            Some(SubscriptionStatus::Active)
        );
        assert_eq!(
            SubscriptionStatus::from_str("expired"),
            Some(SubscriptionStatus::Expired)
        );
        assert_eq!(SubscriptionStatus::from_str("unknown"), None);
    }

    #[test]
    fn modules_disable_for_tier() {
        let enabled = vec!["module-core", "module-finance", "module-qms", "module-ai"];
        let to_disable = modules_to_disable_for_tier(Tier::Basic, &enabled);
        assert_eq!(
            to_disable,
            vec!["module-qms".to_string(), "module-ai".to_string()]
        );
    }

    #[test]
    fn modules_disable_none_for_advanced() {
        let enabled = vec!["module-core", "module-qms", "module-ai"];
        let to_disable = modules_to_disable_for_tier(Tier::Advanced, &enabled);
        assert!(to_disable.is_empty());
    }
}
