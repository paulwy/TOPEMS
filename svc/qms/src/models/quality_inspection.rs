//! Quality Inspection DTOs

use chrono::{DateTime, Utc};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InspectionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub inspection_type: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListInspectionsResponse {
    pub inspections: Vec<Inspection>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Inspection {
    pub id: String,
    pub tenant_id: String,
    pub inspection_no: String,
    pub inspection_type: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub standard_id: Option<Uuid>,
    pub quantity: BigDecimal,
    pub qualified_quantity: Option<BigDecimal>,
    pub unqualified_quantity: Option<BigDecimal>,
    pub qualification_rate: Option<BigDecimal>,
    pub status: Option<String>,
    pub inspector: Option<String>,
    pub assignee: Option<String>,
    pub inspected_at: Option<DateTime<Utc>>,
    pub result: Option<String>,
    pub memo: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateInspectionRequest {
    pub inspection_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub product_name_en: Option<String>,
    pub standard_id: Option<String>,
    pub quantity: BigDecimal,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AssignInspectionRequest {
    pub assignee: String,
    pub operator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SubmitInspectionResultRequest {
    pub qualified_quantity: BigDecimal,
    pub unqualified_quantity: BigDecimal,
    pub qualification_rate: Option<BigDecimal>,
    pub result: Option<String>,
    pub memo: Option<String>,
    pub inspector: String,
    pub results: Option<Vec<InspectionResultItem>>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct InspectionResultItem {
    pub item_name: String,
    pub item_name_en: Option<String>,
    pub standard_value: Option<String>,
    pub measured_value: Option<String>,
    pub is_qualified: bool,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditInspectionRequest {
    pub action: String,
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateInspectionRequest {
    pub inspection_type: Option<String>,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub standard_id: Option<String>,
    pub quantity: Option<BigDecimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct InspectionAudit {
    pub id: String,
    pub tenant_id: String,
    pub inspection_id: String,
    pub status_from: String,
    pub status_to: String,
    pub action: String,
    pub operator: String,
    pub comment: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InspectionResult {
    pub id: String,
    pub tenant_id: String,
    pub inspection_id: String,
    pub item_name: String,
    pub standard_value: Option<String>,
    pub measured_value: Option<String>,
    pub is_qualified: bool,
    pub remark: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_inspection_query() {
        roundtrip(&InspectionQuery {
            page: Some(1),
            page_size: Some(10),
            status: Some("pending".to_string()),
            inspection_type: None,
            search: None,
        });
    }

    #[test]
    fn test_list_inspections_response() {
        roundtrip(&ListInspectionsResponse {
            inspections: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        });
    }

    #[test]
    fn test_inspection() {
        roundtrip(&Inspection {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            inspection_no: "IN001".to_string(),
            inspection_type: "i".to_string(),
            product_id: Some(Uuid::new_v4()),
            product_name: None,
            standard_id: None,
            quantity: BigDecimal::from(100),
            qualified_quantity: Some(BigDecimal::from(95)),
            unqualified_quantity: None,
            qualification_rate: None,
            status: None,
            inspector: None,
            assignee: None,
            inspected_at: None,
            result: None,
            memo: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_inspection_request() {
        roundtrip(&CreateInspectionRequest {
            inspection_type: "i".to_string(),
            product_id: None,
            product_name: None,
            product_name_en: None,
            standard_id: None,
            quantity: BigDecimal::from(0),
            created_by: None,
        });
    }

    #[test]
    fn test_assign_inspection_request() {
        roundtrip(&AssignInspectionRequest {
            assignee: "a".to_string(),
            operator: "op".to_string(),
        });
    }

    #[test]
    fn test_submit_inspection_result_request() {
        roundtrip(&SubmitInspectionResultRequest {
            qualified_quantity: BigDecimal::from(10),
            unqualified_quantity: BigDecimal::from(0),
            qualification_rate: None,
            result: None,
            memo: None,
            inspector: "ins".to_string(),
            results: Some(vec![InspectionResultItem {
                item_name: "n".to_string(),
                item_name_en: None,
                standard_value: None,
                measured_value: None,
                is_qualified: true,
                remark: None,
            }]),
        });
    }

    #[test]
    fn test_audit_inspection_request() {
        roundtrip(&AuditInspectionRequest {
            action: "approve".to_string(),
            operator: "op".to_string(),
            comment: None,
        });
    }

    #[test]
    fn test_update_inspection_request() {
        roundtrip(&UpdateInspectionRequest {
            inspection_type: None,
            product_id: None,
            product_name: None,
            standard_id: None,
            quantity: None,
        });
    }

    #[test]
    fn test_inspection_audit() {
        roundtrip(&InspectionAudit {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            inspection_id: "in".to_string(),
            status_from: "a".to_string(),
            status_to: "b".to_string(),
            action: "ap".to_string(),
            operator: "op".to_string(),
            comment: None,
            created_at: None,
        });
    }

    #[test]
    fn test_inspection_result() {
        roundtrip(&InspectionResult {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            inspection_id: "in".to_string(),
            item_name: "n".to_string(),
            standard_value: None,
            measured_value: None,
            is_qualified: true,
            remark: None,
            created_at: None,
        });
    }

    #[test]
    fn test_inspection_query_clone_and_debug() {
        let q = InspectionQuery {
            page: Some(1),
            page_size: Some(10),
            status: Some("pending".to_string()),
            inspection_type: Some("incoming".to_string()),
            search: Some("test".to_string()),
        };
        let q2 = q.clone();
        assert_eq!(format!("{:?}", q), format!("{:?}", q2));
        assert_eq!(q.page, q2.page);
        assert_eq!(q.status, q2.status);
    }

    #[test]
    fn test_inspection_struct_clone_preserves_fields() {
        let i1 = Inspection {
            id: "id1".to_string(),
            tenant_id: "t1".to_string(),
            inspection_no: "INSP-001".to_string(),
            inspection_type: "typeA".to_string(),
            product_id: None,
            product_name: Some("Widget".to_string()),
            standard_id: None,
            quantity: BigDecimal::from(500),
            qualified_quantity: Some(BigDecimal::from(490)),
            unqualified_quantity: Some(BigDecimal::from(10)),
            qualification_rate: Some(BigDecimal::from(98)),
            status: Some("pending".to_string()),
            inspector: Some("inspector_a".to_string()),
            assignee: Some("assignee_b".to_string()),
            inspected_at: DateTime::from_timestamp(1704067200, 0),
            result: Some("pass".to_string()),
            memo: Some("memo text".to_string()),
            created_by: Some("creator".to_string()),
            created_at: DateTime::from_timestamp(1704067200, 0),
            updated_at: DateTime::from_timestamp(1704067200, 0),
        };
        let i2 = i1.clone();
        assert_eq!(i1.id, i2.id);
        assert_eq!(i1.inspection_no, i2.inspection_no);
        assert_eq!(i1.product_name, i2.product_name);
        assert_eq!(i1.status, i2.status);
        assert!(!format!("{:?}", i1).is_empty());
    }

    #[test]
    fn test_inspection_result_item_all_fields_filled() {
        roundtrip(&InspectionResultItem {
            item_name: "dim A".to_string(),
            item_name_en: Some("Dimension A".to_string()),
            standard_value: Some("10.0 ± 0.1".to_string()),
            measured_value: Some("10.05".to_string()),
            is_qualified: true,
            remark: Some("within spec".to_string()),
        });
    }

    #[test]
    fn test_create_inspection_request_all_some() {
        roundtrip(&CreateInspectionRequest {
            inspection_type: "incoming".to_string(),
            product_id: Some("p1".to_string()),
            product_name: Some("P1".to_string()),
            product_name_en: Some("P1 En".to_string()),
            standard_id: Some("s1".to_string()),
            quantity: BigDecimal::from(100),
            created_by: Some("user1".to_string()),
        });
    }

    #[test]
    fn test_update_inspection_request_all_some() {
        roundtrip(&UpdateInspectionRequest {
            inspection_type: Some("final".to_string()),
            product_id: Some("p2".to_string()),
            product_name: Some("P2".to_string()),
            standard_id: Some("s2".to_string()),
            quantity: Some(BigDecimal::from(200)),
        });
    }
}
