use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// date-type-convention: exempt 交货周期文本（DB varchar 列），非时间戳，DTO 字符串展示
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Quotation {
    pub id: Uuid,
    pub quotation_no: String,
    pub inquiry_id: Uuid,
    pub inquiry_no: Option<String>,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub title: String,
    pub total_amount: f64,
    pub currency: String,
    pub valid_until: Option<DateTime<Utc>>,
    pub delivery_time: Option<String>,
    pub payment_terms: Option<String>,
    pub status: String,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQuotationRequest {
    pub inquiry_id: String,
    pub supplier_id: String,
    pub title: String,
    pub total_amount: f64,
    pub currency: String,
    pub valid_until: Option<String>,
    pub delivery_time: Option<String>,
    pub payment_terms: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateQuotationRequest {
    pub title: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub valid_until: Option<String>,
    pub delivery_time: Option<String>,
    pub payment_terms: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_quotation() -> Quotation {
        Quotation {
            id: Uuid::new_v4(),
            quotation_no: "QUO-001".to_string(),
            inquiry_id: Uuid::new_v4(),
            inquiry_no: Some("INQ-001".to_string()),
            supplier_id: Uuid::new_v4(),
            supplier_name: Some("Acme Corp".to_string()),
            title: "Quotation for Steel Pipes".to_string(),
            total_amount: 125_000.50,
            currency: "CNY".to_string(),
            valid_until: Some(
                DateTime::parse_from_rfc3339("2025-02-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            delivery_time: Some("15 days".to_string()),
            payment_terms: Some("Net 30".to_string()),
            status: "submitted".to_string(),
            items: Some(serde_json::json!([{"name": "Pipe", "qty": 500}])),
            remarks: Some("FOB Shanghai".to_string()),
            submitted_at: Some(
                DateTime::parse_from_rfc3339("2025-01-05T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            created_at: DateTime::parse_from_rfc3339("2025-01-05T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-06T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_quotation_serde_roundtrip_full() {
        let q = sample_quotation();
        let json = serde_json::to_string(&q).unwrap();
        let de: Quotation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, q.id);
        assert_eq!(de.quotation_no, q.quotation_no);
        assert_eq!(de.total_amount, q.total_amount);
        assert_eq!(de.payment_terms, q.payment_terms);
    }

    #[test]
    fn test_quotation_serde_roundtrip_none_options() {
        let mut q = sample_quotation();
        q.inquiry_no = None;
        q.supplier_name = None;
        q.valid_until = None;
        q.delivery_time = None;
        q.payment_terms = None;
        q.items = None;
        q.remarks = None;
        q.submitted_at = None;
        let json = serde_json::to_string(&q).unwrap();
        let de: Quotation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.inquiry_no, None);
        assert_eq!(de.payment_terms, None);
        assert_eq!(de.submitted_at, None);
    }

    #[test]
    fn test_quotation_clone_equal() {
        let q = sample_quotation();
        let cloned = q.clone();
        assert_eq!(cloned.id, q.id);
        assert_eq!(cloned.quotation_no, q.quotation_no);
        assert_eq!(cloned.total_amount, q.total_amount);
    }

    #[test]
    fn test_quotation_json_field_names() {
        let q = sample_quotation();
        let json = serde_json::to_value(&q).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("quotation_no"));
        assert!(obj.contains_key("inquiry_id"));
        assert!(obj.contains_key("inquiry_no"));
        assert!(obj.contains_key("supplier_name"));
        assert!(obj.contains_key("total_amount"));
        assert!(obj.contains_key("valid_until"));
        assert!(obj.contains_key("delivery_time"));
        assert!(obj.contains_key("payment_terms"));
        assert!(obj.contains_key("submitted_at"));
    }

    #[test]
    fn test_quotation_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "quotation_no": "QUO-002",
            "inquiry_id": "00000000-0000-0000-0000-000000000002",
            "inquiry_no": null,
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "supplier_name": null,
            "title": "Cables Quote",
            "total_amount": 50000.0,
            "currency": "USD",
            "valid_until": null,
            "delivery_time": null,
            "payment_terms": null,
            "status": "draft",
            "items": null,
            "remarks": null,
            "submitted_at": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let q: Quotation = serde_json::from_str(json).unwrap();
        assert_eq!(q.quotation_no, "QUO-002");
        assert_eq!(q.total_amount, 50_000.0);
        assert_eq!(q.currency, "USD");
        assert!(q.supplier_name.is_none());
    }

    #[test]
    fn test_quotation_ignores_unknown_fields() {
        let q = sample_quotation();
        let mut json = serde_json::to_value(&q).unwrap();
        json["unknown"] = serde_json::json!(true);
        let de: Quotation = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, q.id);
    }

    #[test]
    fn test_create_quotation_request_serde_roundtrip() {
        let req = CreateQuotationRequest {
            inquiry_id: "00000000-0000-0000-0000-000000000001".to_string(),
            supplier_id: "00000000-0000-0000-0000-000000000002".to_string(),
            title: "Quote".to_string(),
            total_amount: 99.99,
            currency: "CNY".to_string(),
            valid_until: Some("2025-02-01T00:00:00Z".to_string()),
            delivery_time: Some("7 days".to_string()),
            payment_terms: Some("Net 15".to_string()),
            items: Some(serde_json::json!([{"name": "X"}])),
            remarks: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateQuotationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, req.title);
        assert_eq!(de.total_amount, req.total_amount);
        assert_eq!(de.remarks, None);
    }

    #[test]
    fn test_create_quotation_request_clone() {
        let req = CreateQuotationRequest {
            inquiry_id: "x".to_string(),
            supplier_id: "y".to_string(),
            title: "T".to_string(),
            total_amount: 0.0,
            currency: "USD".to_string(),
            valid_until: None,
            delivery_time: None,
            payment_terms: None,
            items: None,
            remarks: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.title, req.title);
        assert_eq!(cloned.currency, req.currency);
    }

    #[test]
    fn test_create_quotation_request_minimal() {
        let json = r#"{
            "inquiry_id": "00000000-0000-0000-0000-000000000001",
            "supplier_id": "00000000-0000-0000-0000-000000000002",
            "title": "Min",
            "total_amount": 0.0,
            "currency": "CNY"
        }"#;
        let req: CreateQuotationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title, "Min");
        assert!(req.valid_until.is_none());
    }

    #[test]
    fn test_update_quotation_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateQuotationRequest = serde_json::from_str(json).unwrap();
        assert!(req.title.is_none());
        assert!(req.total_amount.is_none());
    }

    #[test]
    fn test_update_quotation_request_partial() {
        let json = r#"{"total_amount": 199.99, "currency": "EUR"}"#;
        let req: UpdateQuotationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.total_amount, Some(199.99));
        assert_eq!(req.currency.as_deref(), Some("EUR"));
    }

    #[test]
    fn test_update_quotation_request_serde_roundtrip_full() {
        let req = UpdateQuotationRequest {
            title: Some("Updated".to_string()),
            total_amount: Some(555.55),
            currency: Some("JPY".to_string()),
            valid_until: Some("2025-06-01T00:00:00Z".to_string()),
            delivery_time: Some("30 days".to_string()),
            payment_terms: Some("Net 60".to_string()),
            items: Some(serde_json::json!({"k": "v"})),
            remarks: Some("r".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateQuotationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, req.title);
        assert_eq!(de.total_amount, req.total_amount);
        assert_eq!(de.items, req.items);
    }

    #[test]
    fn test_quotation_status_variants() {
        let mut q = sample_quotation();
        for status in ["draft", "submitted", "accepted", "rejected", "expired"] {
            q.status = status.to_string();
            let json = serde_json::to_string(&q).unwrap();
            let de: Quotation = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_quotation_total_amount_zero_and_negative() {
        let mut q = sample_quotation();
        q.total_amount = 0.0;
        let json = serde_json::to_string(&q).unwrap();
        let de: Quotation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_amount, 0.0);

        q.total_amount = -50.0;
        let json = serde_json::to_string(&q).unwrap();
        let de: Quotation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_amount, -50.0);
    }

    #[test]
    fn test_quotation_items_complex_json() {
        let mut q = sample_quotation();
        let items = serde_json::json!({
            "lines": [
                {"sku": "A1", "qty": 10, "unit_price": 5.5},
                {"sku": "B2", "qty": 20, "unit_price": 7.25}
            ],
            "discount": {"type": "percent", "value": 0.1}
        });
        q.items = Some(items.clone());
        let json = serde_json::to_string(&q).unwrap();
        let de: Quotation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.items, Some(items));
    }
}
