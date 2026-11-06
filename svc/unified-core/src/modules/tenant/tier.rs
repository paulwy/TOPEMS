//! 业务域 tier 统一映射（批 13 / P4）
//!
//! 与前端 `apps/web/src/config/moduleTiers.ts` 保持同一份映射（36 个业务域）。
//! 一级权威 = 业务域 code（= `core_tenant_modules.module_code` 中 `:` 之前的前缀
//! = 前端一级菜单 code）。
//!
//! tier 固定三级：basic / standard / enterprise（平台级统一映射，不做租户级自定义）。

/// 业务域 → tier 的权威映射。新增域必须先在此登记，并同步前端 moduleTiers.ts。
pub const DOMAIN_TIER_MAP: &[(&str, &str)] = &[
    // ---- basic：平台基座 + 核心业务域 ----
    ("admin", "basic"),
    ("iam", "basic"),
    ("notification", "basic"),
    ("workflow", "basic"),
    ("doc", "basic"),
    ("erp", "basic"),
    ("mes", "basic"),
    ("wms", "basic"),
    ("scm", "basic"),
    ("crm", "basic"),
    ("finance", "basic"),
    ("asset", "basic"),
    ("hrm", "basic"),
    ("oa", "basic"),
    ("master", "basic"),
    // ---- standard：进阶业务域 + 分析/报表/移动 ----
    ("pm", "standard"),
    ("qms", "standard"),
    ("aps", "standard"),
    ("lims", "standard"),
    ("pdm", "standard"),
    ("srm", "standard"),
    ("tms", "standard"),
    ("ehs", "standard"),
    ("bi", "standard"),
    ("report", "standard"),
    ("mobile", "standard"),
    // ---- enterprise：集成/智能/监控/插件等增值能力 ----
    ("ai", "enterprise"),
    ("gis", "enterprise"),
    ("monitor", "enterprise"),
    ("plugin", "enterprise"),
    ("im", "enterprise"),
    ("integration", "enterprise"),
    ("automation", "enterprise"),
    ("rd", "enterprise"),
    ("registry", "enterprise"),
    ("ticket", "enterprise"),
];

/// 取某域 tier；未登记返回 None（调用方按"放行"处理，不误隐藏）。
pub fn tier_of_domain(domain: &str) -> Option<&'static str> {
    DOMAIN_TIER_MAP
        .iter()
        .find(|(d, _)| *d == domain)
        .map(|(_, t)| *t)
}

/// 某 tier 下的全部业务域。
pub fn domains_of_tier(tier: &str) -> Vec<&'static str> {
    DOMAIN_TIER_MAP
        .iter()
        .filter(|(_, t)| *t == tier)
        .map(|(d, _)| *d)
        .collect()
}

/// 基本套件（basic）业务域清单。
pub fn basic_domains() -> Vec<&'static str> {
    domains_of_tier("basic")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_three_tiers_present_and_disjoint() {
        let basic = domains_of_tier("basic");
        let standard = domains_of_tier("standard");
        let enterprise = domains_of_tier("enterprise");
        assert!(!basic.is_empty() && !standard.is_empty() && !enterprise.is_empty());
        assert_eq!(DOMAIN_TIER_MAP.len(), 36);
        assert_eq!(basic.len() + standard.len() + enterprise.len(), 36);
    }

    #[test]
    fn core_domains_correctly_mapped() {
        assert_eq!(tier_of_domain("erp"), Some("basic"));
        assert_eq!(tier_of_domain("mes"), Some("basic"));
        assert_eq!(tier_of_domain("bi"), Some("standard"));
        assert_eq!(tier_of_domain("ai"), Some("enterprise"));
        assert_eq!(tier_of_domain("unknown-domain"), None);
    }
}
