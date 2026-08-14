use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Inquiry {
    pub id: Uuid,
    pub inquiry_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub urgency: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub deadline: Option<DateTime<Utc>>,
    pub creator: Option<String>,
    pub department: Option<String>,
    pub quotation_count: Option<i64>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInquiryRequest {
    pub inquiry_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub urgency: Option<String>,
    pub deadline: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInquiryRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub urgency: Option<String>,
    pub deadline: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_inquiry() -> Inquiry {
        Inquiry {
            id: Uuid::new_v4(),
            inquiry_no: "INQ-001".to_string(),
            title: "Steel Pipe Inquiry".to_string(),
            description: Some("Carbon steel pipes for construction".to_string()),
            category: Some("raw_material".to_string()),
            urgency: Some("high".to_string()),
            status: "published".to_string(),
            published_at: Some(
                DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            deadline: Some(
                DateTime::parse_from_rfc3339("2025-01-15T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            creator: Some("Buyer Zhang".to_string()),
            department: Some("Procurement".to_string()),
            quotation_count: Some(3),
            items: Some(serde_json::json!([{"spec": "DN100", "qty": 500}])),
            remarks: Some("Quote FOB Shanghai".to_string()),
            created_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-02T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_inquiry_serde_roundtrip_full() {
        let i = sample_inquiry();
        let json = serde_json::to_string(&i).unwrap();
        let de: Inquiry = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, i.id);
        assert_eq!(de.inquiry_no, i.inquiry_no);
        assert_eq!(de.title, i.title);
        assert_eq!(de.urgency, i.urgency);
        assert_eq!(de.quotation_count, i.quotation_count);
    }

    #[test]
    fn test_inquiry_serde_roundtrip_none_options() {
        let mut i = sample_inquiry();
        i.description = None;
        i.category = None;
        i.urgency = None;
        i.published_at = None;
        i.deadline = None;
        i.creator = None;
        i.department = None;
        i.quotation_count = None;
        i.items = None;
        i.remarks = None;
        let json = serde_json::to_string(&i).unwrap();
        let de: Inquiry = serde_json::from_str(&json).unwrap();
        assert_eq!(de.urgency, None);
        assert_eq!(de.quotation_count, None);
        assert_eq!(de.items, None);
    }

    #[test]
    fn test_inquiry_clone_equal() {
        let i = sample_inquiry();
        let cloned = i.clone();
        assert_eq!(cloned.id, i.id);
        assert_eq!(cloned.inquiry_no, i.inquiry_no);
    }

    #[test]
    fn test_inquiry_json_field_names() {
        let i = sample_inquiry();
        let json = serde_json::to_value(&i).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("inquiry_no"));
        assert!(obj.contains_key("urgency"));
        assert!(obj.contains_key("published_at"));
        assert!(obj.contains_key("deadline"));
        assert!(obj.contains_key("quotation_count"));
        assert!(obj.contains_key("department"));
    }

    #[test]
    fn test_inquiry_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "inquiry_no": "INQ-002",
            "title": "Cables",
            "description": null,
            "category": null,
            "urgency": null,
            "status": "draft",
            "published_at": null,
            "deadline": null,
            "creator": null,
            "department": null,
            "quotation_count": null,
            "items": null,
            "remarks": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let i: Inquiry = serde_json::from_str(json).unwrap();
        assert_eq!(i.inquiry_no, "INQ-002");
        assert_eq!(i.status, "draft");
        assert!(i.urgency.is_none());
    }

    #[test]
    fn test_inquiry_ignores_unknown_fields() {
        let i = sample_inquiry();
        let mut json = serde_json::to_value(&i).unwrap();
        json["unknown"] = serde_json::json!(123);
        let de: Inquiry = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, i.id);
    }

    #[test]
    fn test_create_inquiry_request_serde_roundtrip() {
        let req = CreateInquiryRequest {
            inquiry_no: "INQ-003".to_string(),
            title: "New Inquiry".to_string(),
            description: Some("desc".to_string()),
            category: Some("cat".to_string()),
            urgency: Some("low".to_string()),
            deadline: Some("2025-02-01T00:00:00Z".to_string()),
            items: Some(serde_json::json!([{"name": "X"}])),
            remarks: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateInquiryRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.inquiry_no, req.inquiry_no);
        assert_eq!(de.urgency, req.urgency);
        assert_eq!(de.remarks, None);
    }

    #[test]
    fn test_create_inquiry_request_clone() {
        let req = CreateInquiryRequest {
            inquiry_no: "INQ-004".to_string(),
            title: "T".to_string(),
            description: None,
            category: None,
            urgency: None,
            deadline: None,
            items: None,
            remarks: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.inquiry_no, req.inquiry_no);
    }

    #[test]
    fn test_create_inquiry_request_minimal() {
        let json = r#"{
            "inquiry_no": "INQ-005",
            "title": "Min"
        }"#;
        let req: CreateInquiryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.inquiry_no, "INQ-005");
        assert!(req.urgency.is_none());
    }

    #[test]
    fn test_update_inquiry_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateInquiryRequest = serde_json::from_str(json).unwrap();
        assert!(req.title.is_none());
        assert!(req.urgency.is_none());
    }

    #[test]
    fn test_update_inquiry_request_partial() {
        let json = r#"{"title": "Updated", "urgency": "critical"}"#;
        let req: UpdateInquiryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title.as_deref(), Some("Updated"));
        assert_eq!(req.urgency.as_deref(), Some("critical"));
    }

    #[test]
    fn test_update_inquiry_request_serde_roundtrip_full() {
        let req = UpdateInquiryRequest {
            title: Some("T2".to_string()),
            description: Some("d".to_string()),
            category: Some("c".to_string()),
            urgency: Some("medium".to_string()),
            deadline: Some("2025-06-01T00:00:00Z".to_string()),
            items: Some(serde_json::json!({"k": 1})),
            remarks: Some("r".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateInquiryRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, req.title);
        assert_eq!(de.urgency, req.urgency);
        assert_eq!(de.items, req.items);
    }

    #[test]
    fn test_inquiry_urgency_variants() {
        let mut i = sample_inquiry();
        for urgency in ["low", "medium", "high", "critical"] {
            i.urgency = Some(urgency.to_string());
            let json = serde_json::to_string(&i).unwrap();
            let de: Inquiry = serde_json::from_str(&json).unwrap();
            assert_eq!(de.urgency.as_deref(), Some(urgency));
        }
    }

    #[test]
    fn test_inquiry_status_variants() {
        let mut i = sample_inquiry();
        for status in ["draft", "published", "closed", "cancelled"] {
            i.status = status.to_string();
            let json = serde_json::to_string(&i).unwrap();
            let de: Inquiry = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_inquiry_quotation_count_zero_and_large() {
        let mut i = sample_inquiry();
        i.quotation_count = Some(0);
        let json = serde_json::to_string(&i).unwrap();
        let de: Inquiry = serde_json::from_str(&json).unwrap();
        assert_eq!(de.quotation_count, Some(0));

        i.quotation_count = Some(i64::MAX);
        let json = serde_json::to_string(&i).unwrap();
        let de: Inquiry = serde_json::from_str(&json).unwrap();
        assert_eq!(de.quotation_count, Some(i64::MAX));
    }
}
