use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
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
    // U6: 金额精度 f64 -> Decimal（DB 列 crm.billing_records.amount 为 NUMERIC(15,2)）
    pub amount: Decimal,
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
            amount: Decimal::ZERO,
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
    // U6: 单价/行金额改 Decimal（存 JSONB，仅序列化；对齐 ReturnItem.unit_price/total_amount）
    pub unit_price: Decimal,
    pub amount: Decimal,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateBillingRequest {
    pub customer_id: Uuid,
    #[serde(default)]
    pub invoice_no: Option<String>,
    pub amount: Decimal,
    #[serde(default)]
    pub currency: Option<String>,
    pub due_date: DateTime<Utc>,
    #[serde(default)]
    pub items: Vec<BillingItem>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema, Default)]
pub struct UpdateBillingRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub invoice_no: Option<String>,
    #[serde(default)]
    pub amount: Option<Decimal>,
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
            amount: Decimal::ZERO,
            currency: Some("CNY".into()),
            due_date: Utc::now(),
            items: vec![],
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
            unit_price: Decimal::new(100000, 2),
            amount: Decimal::new(200000, 2),
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
            amount: Decimal::new(200000, 2),
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
            amount: Decimal::new(50000, 2),
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
            amount: Some(Decimal::new(99900, 2)),
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

    /// U6 精度断言：Decimal 金额运算不产生 f64 累积误差（0.1 + 0.2 != 0.3 在 f64 下）。
    #[test]
    fn billing_amount_precision_exact() {
        // Decimal::new(m, scale) = m / 10^scale：0.1=new(1,1)，0.2=new(2,1)，0.3=new(3,1)
        let a = Decimal::new(1, 1); // 0.1
        let b = Decimal::new(2, 1); // 0.2
        assert_eq!(a + b, Decimal::new(3, 1)); // 0.3，精确
                                               // 0.1 * 3 = 0.3 精确（f64 下为 0.30000000000000004）
        let line = Decimal::new(1, 1) * Decimal::from(3);
        assert_eq!(line, Decimal::new(3, 1));
    }

    /// U6 API 契约：响应侧 amount 序列化为 JSON 字符串（对齐 Return.refund_amount 等既有 Decimal DTO），
    /// 请求侧仍可从 JSON 数字反序列化（前端 POST 数字金额不受影响）。
    #[test]
    fn billing_amount_serde_contract() {
        // 响应序列化：Decimal -> JSON string
        let v = serde_json::to_value(Decimal::new(200000, 2)).expect("serialize");
        assert_eq!(v, serde_json::json!("2000.00"));
        // 请求反序列化：兼容 JSON 数字与字符串两种形态
        let from_num: Decimal = serde_json::from_str("2000.00").expect("from number");
        let from_str: Decimal = serde_json::from_str("\"2000.00\"").expect("from string");
        assert_eq!(from_num, Decimal::new(200000, 2));
        assert_eq!(from_str, Decimal::new(200000, 2));
        // CreateBillingRequest 可直接从数字 amount 构造（前端契约）
        let req: CreateBillingRequest = serde_json::from_str(
            r#"{"customer_id":"00000000-0000-0000-0000-000000000000","amount":1234.56,"due_date":"2026-10-03T00:00:00Z"}"#,
        )
        .expect("deserialize numeric amount");
        assert_eq!(req.amount, Decimal::new(123456, 2));
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
