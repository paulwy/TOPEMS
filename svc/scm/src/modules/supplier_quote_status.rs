//! 供应商报价单状态唯一集合。
//!
//! 落库列：`scm.supplier_quotes.status`（varchar，NOT NULL，DB 默认 `draft`）。
//! 创建报价单写 `draft`，提交写 `submitted`；更新与提交都以 `draft` 为前置条件。
//! 该表当前只有这两个状态写入点，未出现的值不预先纳入口径。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupplierQuoteStatus {
    Draft,
    Submitted,
}

impl SupplierQuoteStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 2] = ["draft", "submitted"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Submitted => "submitted",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "submitted" => Some(Self::Submitted),
            _ => None,
        }
    }

    /// 响应兜底：列 NOT NULL，未知值回落 `DEFAULT`。
    #[must_use]
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(SupplierQuoteStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(SupplierQuoteStatus::DB_VALUES, ["draft", "submitted"]);
    }

    #[test]
    fn every_value_roundtrips() {
        for value in SupplierQuoteStatus::DB_VALUES {
            assert_eq!(
                SupplierQuoteStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(SupplierQuoteStatus::from_db_str("bogus"), None);
        assert_eq!(SupplierQuoteStatus::normalize(""), "draft");
        assert_eq!(SupplierQuoteStatus::normalize("BOGUS"), "draft");
        assert_eq!(SupplierQuoteStatus::normalize("Submitted"), "submitted");
    }
}
