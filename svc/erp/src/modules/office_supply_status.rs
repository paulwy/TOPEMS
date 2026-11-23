//! 办公用品状态：`erp.office_supplies.status` 的唯一值源。
//!
//! 列定义：varchar NOT NULL，DB 默认 `in_stock`。创建写 `'in_stock'`（与 DB 默认一致），
//! 更新接口此前是 `req.status.unwrap_or(existing.status)` 直接透传（可写任意串），
//! 列表 `status` 过滤是 `params.status.clone()` 原样绑定（非法值静默查空、空串当真实值查）。
//!
//! 值集对齐前端 `apps/web/src/schemas/erp/officeSupplies.ts` 的下拉、筛选、
//! `statusBadge.colorMap` 与 `labelMap`：in_stock / low_stock / out_of_stock / discontinued。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OfficeSupplyStatus {
    /// 库存充足
    InStock,
    /// 库存偏低
    LowStock,
    /// 已缺货
    OutOfStock,
    /// 已停用
    Discontinued,
}

impl OfficeSupplyStatus {
    /// `erp.office_supplies.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] =
        ["in_stock", "low_stock", "out_of_stock", "discontinued"];

    /// 新建办公用品的默认状态（与 DB 默认、创建写入一致）
    pub const DEFAULT: Self = Self::InStock;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "in_stock" => Some(Self::InStock),
            "low_stock" => Some(Self::LowStock),
            "out_of_stock" | "out_stock" | "outofstock" => Some(Self::OutOfStock),
            "discontinued" => Some(Self::Discontinued),
            _ => None,
        }
    }

    /// 写入 `erp.office_supplies.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::InStock => "in_stock",
            Self::LowStock => "low_stock",
            Self::OutOfStock => "out_of_stock",
            Self::Discontinued => "discontinued",
        }
    }

    /// 响应兜底：列 NOT NULL，未知历史值回落 `DEFAULT`
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }

    /// 列表过滤解析：`None` / 空串 / `all` 表示不过滤，未知值返回 `Err` 交调用方报 400
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, &'static str> {
        match raw.map(str::trim) {
            None => Ok(None),
            Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or("unknown_status"),
        }
    }
}

impl std::fmt::Display for OfficeSupplyStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn db_strings_roundtrip() {
        for s in OfficeSupplyStatus::DB_VALUES {
            assert_eq!(
                OfficeSupplyStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
    }

    #[test]
    fn defaults_to_in_stock() {
        assert_eq!(OfficeSupplyStatus::DEFAULT.as_db_str(), "in_stock");
        assert_eq!(OfficeSupplyStatus::DB_VALUES.len(), 4);
    }

    #[test]
    fn rejects_unknown_values() {
        assert_eq!(OfficeSupplyStatus::from_db_str("bogus"), None);
        assert_eq!(OfficeSupplyStatus::from_db_str("available"), None);
        assert!(OfficeSupplyStatus::from_db_str("LOW_STOCK").is_some());
    }

    #[test]
    fn accepts_out_stock_alias() {
        assert_eq!(
            OfficeSupplyStatus::from_db_str("out_stock").map(|v| v.as_db_str()),
            Some("out_of_stock")
        );
    }

    #[test]
    fn normalize_falls_back_to_default() {
        assert_eq!(OfficeSupplyStatus::normalize("low_stock"), "low_stock");
        assert_eq!(OfficeSupplyStatus::normalize(""), "in_stock");
        assert_eq!(OfficeSupplyStatus::normalize("weird"), "in_stock");
    }

    #[test]
    fn parse_filter_handles_all_and_empty() {
        assert_eq!(OfficeSupplyStatus::parse_filter(None), Ok(None));
        assert_eq!(OfficeSupplyStatus::parse_filter(Some(" ")), Ok(None));
        assert_eq!(OfficeSupplyStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            OfficeSupplyStatus::parse_filter(Some("discontinued")),
            Ok(Some(OfficeSupplyStatus::Discontinued))
        );
        assert_eq!(
            OfficeSupplyStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }
}
