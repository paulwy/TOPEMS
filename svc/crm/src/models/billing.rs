use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct BillingRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub invoice_no: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub due_date: DateTime<Utc>,
    #[serde(default)]
    pub paid_at: Option<DateTime<Utc>>,
    pub items: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for BillingRecord {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            customer_id: Uuid::nil(),
            customer_name: String::new(),
            invoice_no: String::new(),
            amount: 0.0,
            currency: "CNY".into(),
            status: "pending".into(),
            due_date: Utc::now(),
            paid_at: None,
            items: serde_json::Value::Array(vec![]),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct BillingItem {
    #[serde(default)]
    pub id: Option<Uuid>,
    pub name: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateBillingRequest {
    pub customer_id: Uuid,
    #[serde(default)]
    pub invoice_no: Option<String>,
    pub amount: f64,
    #[serde(default)]
    pub currency: Option<String>,
    pub due_date: DateTime<Utc>,
    #[serde(default)]
    pub items: Vec<BillingItem>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateBillingRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub invoice_no: Option<String>,
    #[serde(default)]
    pub amount: Option<f64>,
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(default)]
    pub due_date: Option<DateTime<Utc>>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub items: Option<Vec<BillingItem>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BillingQueryParams {
    #[serde(default)]
    pub page: Option<i64>,
    #[serde(default)]
    pub page_size: Option<i64>,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub status: Option<String>,
}

impl Default for CreateBillingRequest {
    fn default() -> Self {
        Self {
            customer_id: Uuid::nil(),
            invoice_no: None,
            amount: 0.0,
            currency: Some("CNY".into()),
            due_date: Utc::now(),
            items: vec![],
        }
    }
}

impl Default for UpdateBillingRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            invoice_no: None,
            amount: None,
            currency: None,
            due_date: None,
            status: None,
            items: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(value: &T) {
        let json = serde_json::to_value(value).expect("serialize to Value");
        let restored: T = serde_json::from_value(json.clone()).expect("deserialize from Value");
        let json2 = serde_json::to_value(&restored).expect("re-serialize");
        assert_eq!(json, json2);
    }

    fn item() -> BillingItem {
        BillingItem {
            id: Some(uid()),
            name: "Server X1".into(),
            quantity: 2,
            unit_price: 1000.0,
            amount: 2000.0,
        }
    }

    #[test]
    fn billing_record_roundtrip_full() {
        let r = BillingRecord {
            id: uid(),
            tenant_id: uid(),
            customer_id: uid(),
            customer_name: "ACME".into(),
            invoice_no: "INV-001".into(),
            amount: 2000.0,
            currency: "CNY".into(),
            status: "paid".into(),
            due_date: now(),
            paid_at: Some(now()),
            items: serde_json::Value::Array(vec![serde_json::to_value(item()).unwrap()]),
            created_at: now(),
            updated_at: now(),
            deleted_at: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn billing_record_roundtrip_minimal() {
        let r = BillingRecord::default();
        roundtrip(&r);
    }

    #[test]
    fn billing_item_roundtrip_some_id() {
        roundtrip(&item());
    }

    #[test]
    fn billing_item_roundtrip_none_id() {
        let mut b = item();
        b.id = None;
        roundtrip(&b);
    }

    #[test]
    fn create_billing_request_roundtrip_full() {
        let r = CreateBillingRequest {
            customer_id: uid(),
            invoice_no: Some("INV-002".into()),
            amount: 500.0,
            currency: Some("USD".into()),
            due_date: now(),
            items: vec![item()],
        };
        roundtrip(&r);
    }

    #[test]
    fn create_billing_request_roundtrip_minimal() {
        let r = CreateBillingRequest::default();
        roundtrip(&r);
    }

    #[test]
    fn update_billing_request_roundtrip_full() {
        let r = UpdateBillingRequest {
            customer_id: Some(uid()),
            invoice_no: Some("INV-003".into()),
            amount: Some(999.0),
            currency: Some("EUR".into()),
            due_date: Some(now()),
            status: Some("paid".into()),
            items: Some(vec![item()]),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_billing_request_roundtrip_none() {
        let r = UpdateBillingRequest::default();
        roundtrip(&r);
    }

    #[test]
    fn billing_query_params_deserialize() {
        let json = r#"{
            "page": 1,
            "page_size": 20,
            "customer_id": null,
            "status": "pending"
        }"#;
        let q: BillingQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert!(q.customer_id.is_none());
        assert_eq!(q.status.as_deref(), Some("pending"));
    }
}
