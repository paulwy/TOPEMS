// 订阅分层（Tier）与订阅状态（SubscriptionStatus）业务模型
//
// 设计说明：为避免依赖 serde（crate 内其他模块不依赖 serde 时保持轻量），
// 这里手工提供 from_str/to_string 而不是走 Serialize/Deserialize，
// 与 lib.rs 中 `pub mod tier;` 对齐，供 svc/server 的 subscription_module 使用。
// 如需扩展枚举值，请同步更新 from_str 匹配分支和上游错误提示文案。

/// 订阅分层
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Tier {
    /// 免费版（降级兜底）
    Free,
    /// 基础版
    Basic,
    /// 高级版
    Advanced,
}

impl Tier {
    /// 从字符串解析，匹配失败返回 None。
    /// 输入大小写不敏感（允许 "Free" / "FREE" / "free" 等写法）。
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_ascii_lowercase().as_str() {
            "free" => Some(Tier::Free),
            "basic" => Some(Tier::Basic),
            "advanced" => Some(Tier::Advanced),
            _ => None,
        }
    }
}

impl std::fmt::Display for Tier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Tier::Free => "free",
            Tier::Basic => "basic",
            Tier::Advanced => "advanced",
        };
        f.write_str(s)
    }
}

/// 订阅状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SubscriptionStatus {
    /// 活跃订阅
    Active,
    /// 试用中
    Trial,
    /// 已过期
    Expired,
    /// 已取消（但仍在有效期则仍可使用，此处与 Expired 同一处理级别）
    Canceled,
}

impl SubscriptionStatus {
    /// 从字符串解析，大小写不敏感，未识别返回 None。
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_ascii_lowercase().as_str() {
            "active" => Some(SubscriptionStatus::Active),
            "trial" => Some(SubscriptionStatus::Trial),
            "expired" => Some(SubscriptionStatus::Expired),
            "canceled" | "cancelled" => Some(SubscriptionStatus::Canceled),
            _ => None,
        }
    }
}

impl std::fmt::Display for SubscriptionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            SubscriptionStatus::Active => "active",
            SubscriptionStatus::Trial => "trial",
            SubscriptionStatus::Expired => "expired",
            SubscriptionStatus::Canceled => "canceled",
        };
        f.write_str(s)
    }
}

/// 根据"用户订阅的 Tier + 订阅状态"计算实际生效的分层。
///
/// 规则（与 subscription_module 的 tests 对齐）：
/// - 状态为 Active / Trial → 维持订阅的 tier
/// - 状态为 Expired / Canceled → 降级为 Free
pub fn resolve_effective_tier(subscribed: Tier, status: SubscriptionStatus) -> Tier {
    match status {
        SubscriptionStatus::Active | SubscriptionStatus::Trial => subscribed,
        SubscriptionStatus::Expired | SubscriptionStatus::Canceled => Tier::Free,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_from_str_accepts_case_insensitive() {
        assert_eq!(Tier::from_str("FREE"), Some(Tier::Free));
        assert_eq!(Tier::from_str("Free"), Some(Tier::Free));
        assert_eq!(Tier::from_str("basic"), Some(Tier::Basic));
        assert_eq!(Tier::from_str("ADVANCED"), Some(Tier::Advanced));
        assert_eq!(Tier::from_str("enterprise"), None);
    }

    #[test]
    fn subscription_status_from_str_variants() {
        assert_eq!(SubscriptionStatus::from_str("active"), Some(SubscriptionStatus::Active));
        assert_eq!(SubscriptionStatus::from_str("Trial"), Some(SubscriptionStatus::Trial));
        assert_eq!(SubscriptionStatus::from_str("EXPIRED"), Some(SubscriptionStatus::Expired));
        assert_eq!(SubscriptionStatus::from_str("canceled"), Some(SubscriptionStatus::Canceled));
        assert_eq!(SubscriptionStatus::from_str("cancelled"), Some(SubscriptionStatus::Canceled));
        assert_eq!(SubscriptionStatus::from_str("suspended"), None);
    }

    #[test]
    fn resolve_effective_tier_matches_contract() {
        // Active 维持原 tier
        assert_eq!(resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Active), Tier::Advanced);
        assert_eq!(resolve_effective_tier(Tier::Basic, SubscriptionStatus::Active), Tier::Basic);
        // Trial 也算有效
        assert_eq!(resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Trial), Tier::Advanced);
        // 过期 / 取消 → 免费
        assert_eq!(resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Expired), Tier::Free);
        assert_eq!(resolve_effective_tier(Tier::Basic, SubscriptionStatus::Canceled), Tier::Free);
    }

    #[test]
    fn display_roundtrip_succeeds_for_valid_variants() {
        for tier in [Tier::Free, Tier::Basic, Tier::Advanced] {
            assert_eq!(Tier::from_str(&tier.to_string()), Some(tier));
        }
        for status in [
            SubscriptionStatus::Active,
            SubscriptionStatus::Trial,
            SubscriptionStatus::Expired,
            SubscriptionStatus::Canceled,
        ] {
            assert_eq!(SubscriptionStatus::from_str(&status.to_string()), Some(status));
        }
    }
}
