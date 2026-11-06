//! 历史存量字典类（legacy）标注
//!
//! 这 4 个类由早期 HRM 种子写入，当前标准种子（[`crate::modules::dict::seed`]）不包含它们，
//! 但业务仍在使用，**必须保留**。`seed_dict_data` 只做合并（`INSERT ... ON CONFLICT`），
//! 从不删除字典行；本清单是代码层的显式标注，防止后续 seed 迭代把它们当作“多余数据”清掉。
//!
//! 维护约定：
//! - 新增/下线 legacy 类必须先改本清单，并同步 `docs/database/dict-legacy-types.md`；
//! - 本清单中的 code 不允许出现在 `get_system_dict_definitions()`（单元测试会失败）；
//! - `seed.rs` 禁止出现 `DELETE FROM public.core_dict_*` / `TRUNCATE`（单元测试会失败）。

/// 历史存量字典类
#[derive(Debug, Clone, Copy)]
pub struct LegacyDictType {
    /// 字典类型 code
    pub code: &'static str,
    /// 字典类型名称
    pub name: &'static str,
    /// 该类型在 prod 的字典项数量（只读核对基线）
    pub item_count: usize,
    /// 保留原因 / 引用方
    pub note: &'static str,
}

/// 4 个非标准存量类（prod 2026-11-06 只读核对：4/4/4/5 项，合计 17 项）
pub const LEGACY_DICT_TYPES: &[LegacyDictType] = &[
    LegacyDictType {
        code: "department_type",
        name: "部门类型",
        item_count: 4,
        note: "HRM 组织架构引用；标准种子未覆盖",
    },
    LegacyDictType {
        code: "education",
        name: "学历",
        item_count: 4,
        note: "HRM 员工档案引用；标准种子未覆盖",
    },
    LegacyDictType {
        code: "marital_status",
        name: "婚姻状况",
        item_count: 4,
        note: "HRM 员工档案引用；标准种子未覆盖",
    },
    LegacyDictType {
        code: "position_level",
        name: "岗位职级",
        item_count: 5,
        note: "HRM 岗位/职级引用；标准种子未覆盖",
    },
];

/// 判断某个字典类型 code 是否属于 legacy 清单
pub fn is_legacy_dict_type(code: &str) -> bool {
    LEGACY_DICT_TYPES.iter().any(|t| t.code == code)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::dict::seed::get_system_dict_definitions;
    use std::collections::HashSet;

    /// seed.rs 源码：用于静态断言 seed 不包含删除字典行的语句
    const SEED_SOURCE: &str = include_str!("seed.rs");

    #[test]
    fn legacy_codes_are_unique_and_expected() {
        let codes: Vec<&str> = LEGACY_DICT_TYPES.iter().map(|t| t.code).collect();
        let set: HashSet<&str> = codes.iter().copied().collect();
        assert_eq!(codes.len(), set.len(), "legacy 字典 code 必须唯一");
        assert_eq!(
            codes,
            vec![
                "department_type",
                "education",
                "marital_status",
                "position_level"
            ],
            "legacy 清单变更必须同步文档与回灌核对 SQL"
        );
    }

    #[test]
    fn legacy_types_are_not_in_standard_seed() {
        let defs = get_system_dict_definitions();
        for legacy in LEGACY_DICT_TYPES {
            assert!(
                !defs.iter().any(|(code, _, _)| *code == legacy.code),
                "{} 属于 legacy 清单，不应出现在标准种子定义中；如确需纳入标准种子，请先更新本清单与文档",
                legacy.code
            );
        }
    }

    #[test]
    fn seed_has_no_destructive_dict_sql() {
        assert!(
            !SEED_SOURCE.contains("DELETE FROM public.core_dict"),
            "seed_dict_data 必须只做合并，禁止删除字典行"
        );
        assert!(
            !SEED_SOURCE.contains("TRUNCATE"),
            "seed_dict_data 禁止 TRUNCATE 字典表"
        );
    }

    #[test]
    fn legacy_item_counts_match_prod_baseline() {
        assert_eq!(
            LEGACY_DICT_TYPES
                .iter()
                .map(|t| t.item_count)
                .sum::<usize>(),
            17,
            "prod 基线：4 个 legacy 类合计 17 项"
        );
    }

    #[test]
    fn is_legacy_dict_type_matches_manifest() {
        for legacy in LEGACY_DICT_TYPES {
            assert!(is_legacy_dict_type(legacy.code));
        }
        assert!(!is_legacy_dict_type("gender"));
        assert!(!is_legacy_dict_type("department"));
    }
}
