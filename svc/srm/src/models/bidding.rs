use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Bidding {
    pub id: Uuid,
    pub bidding_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bidding_type: Option<String>,
    pub status: String,
    pub budget_amount: Option<f64>,
    pub currency: String,
    pub publish_date: Option<DateTime<Utc>>,
    pub bid_deadline: Option<DateTime<Utc>>,
    pub open_date: Option<DateTime<Utc>>,
    pub winner_supplier_id: Option<Uuid>,
    pub winner_supplier_name: Option<String>,
    pub winner_amount: Option<f64>,
    pub supplier_count: Option<i64>,
    pub creator: Option<String>,
    pub department: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBiddingRequest {
    pub bidding_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bidding_type: Option<String>,
    pub budget_amount: Option<f64>,
    pub currency: String,
    pub bid_deadline: Option<String>,
    pub open_date: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBiddingRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bidding_type: Option<String>,
    pub budget_amount: Option<f64>,
    pub currency: Option<String>,
    pub bid_deadline: Option<String>,
    pub open_date: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwardBiddingRequest {
    pub supplier_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_bidding() -> Bidding {
        Bidding {
            id: Uuid::new_v4(),
            bidding_no: "BID-001".to_string(),
            title: "Office Supplies Tender".to_string(),
            description: Some("Annual office supplies procurement".to_string()),
            category: Some("office_supplies".to_string()),
            bidding_type: Some("public".to_string()),
            status: "published".to_string(),
            budget_amount: Some(500_000.0),
            currency: "CNY".to_string(),
            publish_date: Some(
                DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            bid_deadline: Some(
                DateTime::parse_from_rfc3339("2025-02-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            open_date: Some(
                DateTime::parse_from_rfc3339("2025-02-05T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            winner_supplier_id: Some(Uuid::new_v4()),
            winner_supplier_name: Some("Acme Corp".to_string()),
            winner_amount: Some(450_000.0),
            supplier_count: Some(5),
            creator: Some("Admin".to_string()),
            department: Some("Procurement".to_string()),
            items: Some(serde_json::json!([{"name": "Paper", "qty": 1000}])),
            remarks: Some("Standard terms".to_string()),
            created_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-02T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_bidding_serde_roundtrip_full() {
        let b = sample_bidding();
        let json = serde_json::to_string(&b).unwrap();
        let de: Bidding = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, b.id);
        assert_eq!(de.bidding_no, b.bidding_no);
        assert_eq!(de.title, b.title);
        assert_eq!(de.budget_amount, b.budget_amount);
        assert_eq!(de.winner_amount, b.winner_amount);
    }

    #[test]
    fn test_bidding_serde_roundtrip_none_options() {
        let mut b = sample_bidding();
        b.description = None;
        b.category = None;
        b.bidding_type = None;
        b.budget_amount = None;
        b.publish_date = None;
        b.bid_deadline = None;
        b.open_date = None;
        b.winner_supplier_id = None;
        b.winner_supplier_name = None;
        b.winner_amount = None;
        b.supplier_count = None;
        b.creator = None;
        b.department = None;
        b.items = None;
        b.remarks = None;
        let json = serde_json::to_string(&b).unwrap();
        let de: Bidding = serde_json::from_str(&json).unwrap();
        assert_eq!(de.budget_amount, None);
        assert_eq!(de.winner_supplier_id, None);
        assert_eq!(de.items, None);
    }

    #[test]
    fn test_bidding_clone_equal() {
        let b = sample_bidding();
        let cloned = b.clone();
        assert_eq!(cloned.id, b.id);
        assert_eq!(cloned.bidding_no, b.bidding_no);
        assert_eq!(cloned.budget_amount, b.budget_amount);
    }

    #[test]
    fn test_bidding_json_field_names() {
        let b = sample_bidding();
        let json = serde_json::to_value(&b).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("bidding_no"));
        assert!(obj.contains_key("bidding_type"));
        assert!(obj.contains_key("budget_amount"));
        assert!(obj.contains_key("bid_deadline"));
        assert!(obj.contains_key("open_date"));
        assert!(obj.contains_key("winner_supplier_id"));
        assert!(obj.contains_key("winner_amount"));
        assert!(obj.contains_key("supplier_count"));
    }

    #[test]
    fn test_bidding_items_json_value_roundtrip() {
        let mut b = sample_bidding();
        let items = serde_json::json!([
            {"name": "Item A", "qty": 100, "price": 10.5},
            {"name": "Item B", "qty": 200, "price": 20.0}
        ]);
        b.items = Some(items.clone());
        let json = serde_json::to_string(&b).unwrap();
        let de: Bidding = serde_json::from_str(&json).unwrap();
        assert_eq!(de.items, Some(items));
    }

    #[test]
    fn test_bidding_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "bidding_no": "BID-002",
            "title": "IT Equipment",
            "description": null,
            "category": null,
            "bidding_type": null,
            "status": "draft",
            "budget_amount": null,
            "currency": "USD",
            "publish_date": null,
            "bid_deadline": null,
            "open_date": null,
            "winner_supplier_id": null,
            "winner_supplier_name": null,
            "winner_amount": null,
            "supplier_count": null,
            "creator": null,
            "department": null,
            "items": null,
            "remarks": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let b: Bidding = serde_json::from_str(json).unwrap();
        assert_eq!(b.bidding_no, "BID-002");
        assert_eq!(b.status, "draft");
        assert_eq!(b.currency, "USD");
        assert!(b.budget_amount.is_none());
    }

    #[test]
    fn test_bidding_ignores_unknown_fields() {
        let b = sample_bidding();
        let mut json = serde_json::to_value(&b).unwrap();
        json["unknown"] = serde_json::json!("x");
        let de: Bidding = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, b.id);
    }

    #[test]
    fn test_create_bidding_request_serde_roundtrip() {
        let req = CreateBiddingRequest {
            bidding_no: "BID-003".to_string(),
            title: "Furniture".to_string(),
            description: Some("desc".to_string()),
            category: Some("furniture".to_string()),
            bidding_type: Some("invited".to_string()),
            budget_amount: Some(100_000.0),
            currency: "CNY".to_string(),
            bid_deadline: Some("2025-02-01T00:00:00Z".to_string()),
            open_date: None,
            items: Some(serde_json::json!([{"name": "Desk"}])),
            remarks: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateBiddingRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.bidding_no, req.bidding_no);
        assert_eq!(de.budget_amount, req.budget_amount);
        assert_eq!(de.open_date, None);
    }

    #[test]
    fn test_create_bidding_request_clone() {
        let req = CreateBiddingRequest {
            bidding_no: "BID-004".to_string(),
            title: "T".to_string(),
            description: None,
            category: None,
            bidding_type: None,
            budget_amount: None,
            currency: "USD".to_string(),
            bid_deadline: None,
            open_date: None,
            items: None,
            remarks: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.bidding_no, req.bidding_no);
        assert_eq!(cloned.currency, req.currency);
    }

    #[test]
    fn test_create_bidding_request_minimal() {
        let json = r#"{
            "bidding_no": "BID-005",
            "title": "Min",
            "currency": "CNY"
        }"#;
        let req: CreateBiddingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.bidding_no, "BID-005");
        assert!(req.budget_amount.is_none());
        assert!(req.items.is_none());
    }

    #[test]
    fn test_update_bidding_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateBiddingRequest = serde_json::from_str(json).unwrap();
        assert!(req.title.is_none());
        assert!(req.bid_deadline.is_none());
    }

    #[test]
    fn test_update_bidding_request_partial() {
        let json = r#"{"title": "New Title", "budget_amount": 999.99}"#;
        let req: UpdateBiddingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title.as_deref(), Some("New Title"));
        assert_eq!(req.budget_amount, Some(999.99));
    }

    #[test]
    fn test_update_bidding_request_serde_roundtrip_full() {
        let req = UpdateBiddingRequest {
            title: Some("Updated".to_string()),
            description: Some("desc".to_string()),
            category: Some("cat".to_string()),
            bidding_type: Some("public".to_string()),
            budget_amount: Some(200_000.0),
            currency: Some("EUR".to_string()),
            bid_deadline: Some("2025-05-01T00:00:00Z".to_string()),
            open_date: Some("2025-05-05T00:00:00Z".to_string()),
            items: Some(serde_json::json!({"key": "value"})),
            remarks: Some("r".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateBiddingRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, req.title);
        assert_eq!(de.budget_amount, req.budget_amount);
        assert_eq!(de.items, req.items);
    }

    #[test]
    fn test_award_bidding_request_serde_roundtrip() {
        let req = AwardBiddingRequest {
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: AwardBiddingRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_id, req.supplier_id);
    }

    #[test]
    fn test_award_bidding_request_clone() {
        let req = AwardBiddingRequest {
            supplier_id: "sup-123".to_string(),
        };
        let cloned = req.clone();
        assert_eq!(cloned.supplier_id, req.supplier_id);
    }

    #[test]
    fn test_bidding_status_variants() {
        let mut b = sample_bidding();
        for status in ["draft", "published", "evaluating", "awarded", "cancelled"] {
            b.status = status.to_string();
            let json = serde_json::to_string(&b).unwrap();
            let de: Bidding = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }
}
