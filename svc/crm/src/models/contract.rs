use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Contract {
    pub id: Uuid,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub org_id: Option<Uuid>,
    pub contract_no: String,
    pub title: String,
    #[serde(default)]
    pub customer_name: Option<String>,
    #[serde(default)]
    pub amount: Option<Decimal>,
    #[serde(default = "default_contract_status")]
    pub status: String,
    #[serde(default)]
    pub sign_date: Option<NaiveDate>,
    #[serde(default)]
    pub start_date: Option<NaiveDate>,
    #[serde(default)]
    pub end_date: Option<NaiveDate>,
    #[serde(default)]
    pub owner: Option<String>,
    #[serde(default, rename = "type")]
    #[sqlx(rename = "type")]
    pub contract_type: Option<String>,
    #[serde(default)]
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Contract {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            org_id: None,
            contract_no: String::new(),
            title: String::new(),
            customer_name: None,
            amount: None,
            status: "draft".into(),
            sign_date: None,
            start_date: None,
            end_date: None,
            owner: None,
            contract_type: None,
            remark: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

fn default_contract_status() -> String {
    "draft".into()
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct CreateContractRequest {
    pub contract_no: String,
    pub title: String,
    pub customer_name: Option<String>,
    pub amount: Option<Decimal>,
    pub status: Option<String>,
    pub sign_date: Option<NaiveDate>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub owner: Option<String>,
    #[serde(rename = "type")]
    pub contract_type: Option<String>,
    pub remark: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct UpdateContractRequest {
    pub contract_no: Option<String>,
    pub title: Option<String>,
    pub customer_name: Option<String>,
    pub amount: Option<Decimal>,
    pub status: Option<String>,
    pub sign_date: Option<NaiveDate>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub owner: Option<String>,
    #[serde(rename = "type")]
    pub contract_type: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ContractQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    #[serde(rename = "type")]
    pub contract_type: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contract_default() {
        let c = Contract::default();
        assert_eq!(c.status, "draft");
        assert!(c.deleted_at.is_none());
        assert!(c.amount.is_none());
        assert!(c.contract_type.is_none());
    }

    #[test]
    fn contract_roundtrip() {
        let c = Contract {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            org_id: None,
            contract_no: "HT-2026-001".into(),
            title: "框架采购合同".into(),
            customer_name: Some("示例客户".into()),
            amount: Some(Decimal::new(123456, 2)),
            status: "signed".into(),
            sign_date: Some(NaiveDate::from_ymd_opt(2026, 9, 1).unwrap()),
            start_date: None,
            end_date: None,
            owner: Some("zhangsan".into()),
            contract_type: Some("purchase".into()),
            remark: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };
        let json = serde_json::to_string(&c).unwrap();
        assert!(json.contains("\"type\":\"purchase\""));
        let back: Contract = serde_json::from_str(&json).unwrap();
        assert_eq!(back.contract_type.as_deref(), Some("purchase"));
    }

    #[test]
    fn create_request_roundtrip() {
        let r = CreateContractRequest {
            contract_no: "HT-2026-002".into(),
            title: "服务合同".into(),
            customer_name: None,
            amount: Some(Decimal::new(9999, 2)),
            status: Some("draft".into()),
            sign_date: None,
            start_date: None,
            end_date: None,
            owner: None,
            contract_type: Some("service".into()),
            remark: None,
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: CreateContractRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.contract_type.as_deref(), Some("service"));
    }

    #[test]
    fn update_request_roundtrip() {
        let r = UpdateContractRequest {
            contract_no: None,
            title: Some("新标题".into()),
            customer_name: None,
            amount: None,
            status: Some("signed".into()),
            sign_date: None,
            start_date: None,
            end_date: None,
            owner: None,
            contract_type: None,
            remark: Some("备注".into()),
        };
        let json = serde_json::to_string(&r).unwrap();
        let back: UpdateContractRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.status.as_deref(), Some("signed"));
        assert_eq!(back.remark.as_deref(), Some("备注"));
    }
}
