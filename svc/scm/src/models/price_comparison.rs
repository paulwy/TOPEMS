use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierQuote {
    pub id: Uuid,
    pub inquiry_id: Uuid,
    pub supplier_id: Uuid,
    pub quote_no: String,
    pub quote_date: DateTime<Utc>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub delivery_days: Option<i32>,
    pub valid_until: Option<DateTime<Utc>>,
    pub payment_terms: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierQuoteRequest {
    pub supplier_id: Uuid,
    pub delivery_days: Option<i32>,
    pub valid_until: Option<DateTime<Utc>>,
    pub payment_terms: Option<String>,
    pub remarks: Option<String>,
    pub items: Vec<CreateQuoteItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQuoteItemRequest {
    pub inquiry_item_id: Uuid,
    pub unit_price: f64,
    pub lead_time_days: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceComparison {
    pub id: Uuid,
    pub inquiry_id: Uuid,
    pub comparison_no: String,
    pub compared_at: DateTime<Utc>,
    pub recommended_supplier_id: Option<Uuid>,
    pub recommended_quote_id: Option<Uuid>,
    pub total_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePriceComparisonRequest {
    pub inquiry_id: Option<Uuid>,
    pub recommended_supplier_id: Uuid,
    pub recommended_quote_id: Uuid,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub remarks: Option<String>,
    pub supplier_scores: Vec<SupplierScoreItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePriceComparisonRequest {
    pub compared_at: Option<DateTime<Utc>>,
    pub recommended_supplier_id: Option<Uuid>,
    pub recommended_quote_id: Option<Uuid>,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierScoreItem {
    pub supplier_id: Uuid,
    pub quote_id: Uuid,
    pub quality_score: f64,
    pub price_score: f64,
    pub delivery_score: f64,
    pub service_score: f64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceComparisonResult {
    pub comparison: PriceComparison,
    pub items: Vec<ComparisonItemDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonItemDetail {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub quote_id: Uuid,
    pub quality_score: f64,
    pub price_score: f64,
    pub delivery_score: f64,
    pub service_score: f64,
    pub total_score: f64,
    pub rank: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixed_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn fixed_dt() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn supplier_quote_serde_roundtrip_full() {
        let q = SupplierQuote {
            id: fixed_uuid(),
            inquiry_id: fixed_uuid(),
            supplier_id: fixed_uuid(),
            quote_no: "Q-001".to_string(),
            quote_date: fixed_dt(),
            total_amount: Some(50000.0),
            currency: "CNY".to_string(),
            delivery_days: Some(7),
            valid_until: Some(fixed_dt()),
            payment_terms: Some("net30".to_string()),
            status: "submitted".to_string(),
            remarks: Some("备注".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&q);
    }

    #[test]
    fn supplier_quote_serde_roundtrip_minimal() {
        let q = SupplierQuote {
            id: fixed_uuid(),
            inquiry_id: fixed_uuid(),
            supplier_id: fixed_uuid(),
            quote_no: "Q-002".to_string(),
            quote_date: fixed_dt(),
            total_amount: None,
            currency: "USD".to_string(),
            delivery_days: None,
            valid_until: None,
            payment_terms: None,
            status: "draft".to_string(),
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&q);
    }

    #[test]
    fn create_supplier_quote_request_serde_roundtrip() {
        let req = CreateSupplierQuoteRequest {
            supplier_id: fixed_uuid(),
            delivery_days: Some(5),
            valid_until: Some(fixed_dt()),
            payment_terms: Some("net30".to_string()),
            remarks: Some("ok".to_string()),
            items: vec![CreateQuoteItemRequest {
                inquiry_item_id: fixed_uuid(),
                unit_price: 12.5,
                lead_time_days: Some(3),
                remarks: None,
            }],
        };
        roundtrip(&req);
    }

    #[test]
    fn create_quote_item_request_serde_roundtrip() {
        let item = CreateQuoteItemRequest {
            inquiry_item_id: fixed_uuid(),
            unit_price: 99.9,
            lead_time_days: Some(10),
            remarks: Some("备注".to_string()),
        };
        roundtrip(&item);
    }

    #[test]
    fn price_comparison_serde_roundtrip_full() {
        let p = PriceComparison {
            id: fixed_uuid(),
            inquiry_id: fixed_uuid(),
            comparison_no: "CMP-001".to_string(),
            compared_at: fixed_dt(),
            recommended_supplier_id: Some(fixed_uuid()),
            recommended_quote_id: Some(fixed_uuid()),
            total_score: Some(95.5),
            quality_score: Some(90.0),
            price_score: Some(95.0),
            delivery_score: Some(100.0),
            service_score: Some(85.0),
            remarks: Some("推荐".to_string()),
            created_by: Some(fixed_uuid()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&p);
    }

    #[test]
    fn price_comparison_serde_roundtrip_minimal() {
        let p = PriceComparison {
            id: fixed_uuid(),
            inquiry_id: fixed_uuid(),
            comparison_no: "CMP-002".to_string(),
            compared_at: fixed_dt(),
            recommended_supplier_id: None,
            recommended_quote_id: None,
            total_score: None,
            quality_score: None,
            price_score: None,
            delivery_score: None,
            service_score: None,
            remarks: None,
            created_by: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&p);
    }

    #[test]
    fn create_price_comparison_request_serde_roundtrip() {
        let req = CreatePriceComparisonRequest {
            inquiry_id: None,
            recommended_supplier_id: fixed_uuid(),
            recommended_quote_id: fixed_uuid(),
            quality_score: Some(90.0),
            price_score: Some(95.0),
            delivery_score: Some(80.0),
            service_score: Some(85.0),
            remarks: Some("备注".to_string()),
            supplier_scores: vec![SupplierScoreItem {
                supplier_id: fixed_uuid(),
                quote_id: fixed_uuid(),
                quality_score: 90.0,
                price_score: 95.0,
                delivery_score: 80.0,
                service_score: 85.0,
                remarks: None,
            }],
        };
        roundtrip(&req);
    }

    #[test]
    fn create_price_comparison_request_serde_empty_scores() {
        let req = CreatePriceComparisonRequest {
            inquiry_id: None,
            recommended_supplier_id: fixed_uuid(),
            recommended_quote_id: fixed_uuid(),
            quality_score: None,
            price_score: None,
            delivery_score: None,
            service_score: None,
            remarks: None,
            supplier_scores: vec![],
        };
        roundtrip(&req);
    }

    #[test]
    fn supplier_score_item_serde_roundtrip() {
        let s = SupplierScoreItem {
            supplier_id: fixed_uuid(),
            quote_id: fixed_uuid(),
            quality_score: 80.0,
            price_score: 90.0,
            delivery_score: 70.0,
            service_score: 85.0,
            remarks: Some("备注".to_string()),
        };
        roundtrip(&s);
    }

    #[test]
    fn price_comparison_result_serde_roundtrip() {
        let r = PriceComparisonResult {
            comparison: PriceComparison {
                id: fixed_uuid(),
                inquiry_id: fixed_uuid(),
                comparison_no: "CMP-003".to_string(),
                compared_at: fixed_dt(),
                recommended_supplier_id: None,
                recommended_quote_id: None,
                total_score: Some(80.0),
                quality_score: None,
                price_score: None,
                delivery_score: None,
                service_score: None,
                remarks: None,
                created_by: None,
                created_at: fixed_dt(),
                updated_at: fixed_dt(),
            },
            items: vec![ComparisonItemDetail {
                supplier_id: fixed_uuid(),
                supplier_name: "Acme".to_string(),
                quote_id: fixed_uuid(),
                quality_score: 80.0,
                price_score: 90.0,
                delivery_score: 70.0,
                service_score: 85.0,
                total_score: 81.25,
                rank: 1,
            }],
        };
        roundtrip(&r);
    }

    #[test]
    fn price_comparison_result_serde_empty_items() {
        let r = PriceComparisonResult {
            comparison: PriceComparison {
                id: fixed_uuid(),
                inquiry_id: fixed_uuid(),
                comparison_no: "CMP-004".to_string(),
                compared_at: fixed_dt(),
                recommended_supplier_id: None,
                recommended_quote_id: None,
                total_score: None,
                quality_score: None,
                price_score: None,
                delivery_score: None,
                service_score: None,
                remarks: None,
                created_by: None,
                created_at: fixed_dt(),
                updated_at: fixed_dt(),
            },
            items: vec![],
        };
        roundtrip(&r);
    }

    #[test]
    fn comparison_item_detail_serde_roundtrip() {
        let d = ComparisonItemDetail {
            supplier_id: fixed_uuid(),
            supplier_name: "Supplier".to_string(),
            quote_id: fixed_uuid(),
            quality_score: 85.0,
            price_score: 90.0,
            delivery_score: 80.0,
            service_score: 75.0,
            total_score: 82.5,
            rank: 2,
        };
        roundtrip(&d);
    }
}
