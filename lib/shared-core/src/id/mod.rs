//! 主数据 ID 生成器
//!
//! 为 5 大主数据域生成语义化 ID，格式为 `{prefix}-{uuid}`。
//! 如 `cust-550e8400-e29b-41d4-a716-446655440000`。

use std::str::FromStr;
use uuid::Uuid;

/// 主数据领域（用于 ID 生成）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MasterDataDomain {
    Customer,
    Supplier,
    Material,
    Organization,
    Employee,
    AccountSubject,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseMasterDataDomainError(pub String);

impl std::fmt::Display for ParseMasterDataDomainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "invalid master data domain: {}", self.0)
    }
}

impl std::error::Error for ParseMasterDataDomainError {}

impl MasterDataDomain {
    pub fn prefix(&self) -> &'static str {
        match self {
            Self::Customer => "cust",
            Self::Supplier => "supp",
            Self::Material => "mat",
            Self::Organization => "org",
            Self::Employee => "emp",
            Self::AccountSubject => "acct",
        }
    }

    pub fn table(&self) -> &'static str {
        match self {
            Self::Customer => "customers",
            Self::Supplier => "suppliers",
            Self::Material => "materials",
            Self::Organization => "organizations",
            Self::Employee => "employees",
            Self::AccountSubject => "account_subjects",
        }
    }
}

impl FromStr for MasterDataDomain {
    type Err = ParseMasterDataDomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "customer" | "customers" | "cust" => Ok(Self::Customer),
            "supplier" | "suppliers" | "supp" => Ok(Self::Supplier),
            "material" | "materials" | "mat" => Ok(Self::Material),
            "organization" | "organizations" | "org" => Ok(Self::Organization),
            "employee" | "employees" | "emp" => Ok(Self::Employee),
            "account_subject" | "account_subjects" | "acct" => Ok(Self::AccountSubject),
            _ => Err(ParseMasterDataDomainError(s.to_string())),
        }
    }
}

/// 生成主数据 ID
///
/// 返回格式：`{domain_prefix}-{uuid}`，例如 `cust-550e8400-e29b-41d4-a716-446655440000`
pub fn generate_master_data_id(domain: MasterDataDomain) -> String {
    let uuid = Uuid::new_v4();
    format!("{}-{}", domain.prefix(), uuid)
}

/// 解析主数据 ID
///
/// 返回 `Some((domain, uuid))` 如果 ID 格式正确，否则返回 `None`。
pub fn parse_master_data_id(id: &str) -> Option<(MasterDataDomain, Uuid)> {
    let parts: Vec<&str> = id.splitn(2, '-').collect();
    if parts.len() != 2 {
        return None;
    }

    let domain = match parts[0] {
        "cust" => MasterDataDomain::Customer,
        "supp" => MasterDataDomain::Supplier,
        "mat" => MasterDataDomain::Material,
        "org" => MasterDataDomain::Organization,
        "emp" => MasterDataDomain::Employee,
        "acct" => MasterDataDomain::AccountSubject,
        _ => return None,
    };

    let uuid = Uuid::parse_str(parts[1]).ok()?;
    Some((domain, uuid))
}

/// 生成主数据 ID 的 UUID 部分
///
/// 用于在数据库中存储为 UUID 字段，前缀仅用于语义化。
pub fn extract_uuid(master_data_id: &str) -> Option<Uuid> {
    parse_master_data_id(master_data_id).map(|(_, uuid)| uuid)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_id() {
        let id = generate_master_data_id(MasterDataDomain::Customer);
        assert!(id.starts_with("cust-"));
        let parsed = parse_master_data_id(&id).unwrap();
        assert_eq!(parsed.0, MasterDataDomain::Customer);
    }

    #[test]
    fn test_parse_all_domains() {
        for domain in [
            MasterDataDomain::Customer,
            MasterDataDomain::Supplier,
            MasterDataDomain::Material,
            MasterDataDomain::Organization,
            MasterDataDomain::Employee,
            MasterDataDomain::AccountSubject,
        ] {
            let id = generate_master_data_id(domain);
            let (parsed_domain, _) = parse_master_data_id(&id).unwrap();
            assert_eq!(parsed_domain, domain);
        }
    }

    #[test]
    fn test_invalid_id() {
        assert!(parse_master_data_id("invalid-id").is_none());
        assert!(parse_master_data_id("cust-not-a-uuid").is_none());
    }

    #[test]
    fn test_extract_uuid() {
        let id = generate_master_data_id(MasterDataDomain::Employee);
        let uuid = extract_uuid(&id).unwrap();
        assert!(!uuid.is_nil());
    }
}
