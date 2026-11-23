//! 供应商准入审批状态唯一集合。
//!
//! 落库列：`scm.supplier_admissions.approval_status`（varchar，可空，无默认）。
//! 与主状态 `status` 是两列：`status` 走草稿/提交/审批/激活，本列只记录审批结果。
//! 审批通过写 `approved`，驳回写 `rejected`；NULL 表示尚未审批，
//! `pending` 为前端筛选与审批流约定的待审批值。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupplierAdmissionApprovalStatus {
    Pending,
    Approved,
    Rejected,
}

impl SupplierAdmissionApprovalStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 3] = ["pending", "approved", "rejected"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 响应兜底：NULL 保持 `None`（尚未审批），未知值回落 `DEFAULT`。
    #[must_use]
    pub fn normalize_option(raw: Option<&str>) -> Option<&'static str> {
        raw.map(|value| {
            Self::from_db_str(value)
                .unwrap_or(Self::DEFAULT)
                .as_db_str()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(
            SupplierAdmissionApprovalStatus::DEFAULT.as_db_str(),
            "pending"
        );
        assert_eq!(
            SupplierAdmissionApprovalStatus::DB_VALUES,
            ["pending", "approved", "rejected"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in SupplierAdmissionApprovalStatus::DB_VALUES {
            assert_eq!(
                SupplierAdmissionApprovalStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(SupplierAdmissionApprovalStatus::from_db_str("bogus"), None);
        assert_eq!(
            SupplierAdmissionApprovalStatus::normalize_option(None),
            None
        );
        assert_eq!(
            SupplierAdmissionApprovalStatus::normalize_option(Some("BOGUS")),
            Some("pending")
        );
        assert_eq!(
            SupplierAdmissionApprovalStatus::normalize_option(Some("Approved")),
            Some("approved")
        );
    }
}
