use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Batch {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub batch_no: Option<String>,
    pub sku: Option<String>,
    pub material_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub available_quantity: f64,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub production_date: Option<DateTime<Utc>>,
    pub expiry_date: Option<DateTime<Utc>>,
    pub receipt_date: Option<DateTime<Utc>>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub manufacture_date: Option<DateTime<Utc>>,
    pub shelf_life_days: Option<i32>,
    pub remaining_days: Option<i32>,
    pub unit_price: Option<f64>,
    pub total_value: Option<f64>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateBatchRequest {
    pub batch_no: Option<String>,
    pub sku: Option<String>,
    pub material_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub receipt_date: Option<String>,
    pub quality_status: Option<String>,
    pub manufacture_date: Option<String>,
    pub shelf_life_days: Option<i32>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateBatchRequest {
    pub batch_no: Option<String>,
    pub sku: Option<String>,
    pub material_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub warehouse_id: Option<String>,
    pub location_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub manufacture_date: Option<String>,
    pub shelf_life_days: Option<i32>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct BatchQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<String>,
    pub sku: Option<String>,
    pub batch_no: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub expiry_warning: Option<bool>,
    pub expired: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BatchStatistics {
    pub total_batches: i64,
    pub total_quantity: f64,
    pub total_value: f64,
    pub expiring_soon_count: i64,
    pub expired_count: i64,
    pub quality_pending_count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_batch() -> Batch {
        Batch {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            batch_no: "BAT-001".into(),
            sku: "SKU-A".into(),
            material_name: "Material A".into(),
            specification: Some("10mm".into()),
            unit: Some("PCS".into()),
            quantity: 500.0,
            available_quantity: 480.0,
            warehouse_id: "wh-1".into(),
            warehouse_name: Some("Main".into()),
            location_id: Some("loc-1".into()),
            location_code: Some("A-01".into()),
            supplier_id: Some("sup-1".into()),
            supplier_name: Some("Supplier Co".into()),
            production_date: NaiveDate::from_ymd_opt(2026, 1, 1),
            expiry_date: NaiveDate::from_ymd_opt(2027, 1, 1),
            receipt_date: NaiveDate::from_ymd_opt(2026, 2, 1),
            quality_status: "qualified".into(),
            status: "active".into(),
            manufacture_date: NaiveDate::from_ymd_opt(2026, 1, 1),
            shelf_life_days: Some(365),
            remaining_days: Some(180),
            unit_price: Some(9.99),
            total_value: Some(4995.0),
            remark: Some("OK".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn batch_serde_roundtrip() {
        let b = sample_batch();
        let v = serde_json::to_value(&b).unwrap();
        let back: Batch = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn batch_serde_all_none_optional_fields() {
        let b = Batch {
            specification: None,
            unit: None,
            warehouse_name: None,
            location_id: None,
            location_code: None,
            supplier_id: None,
            supplier_name: None,
            production_date: None,
            expiry_date: None,
            receipt_date: None,
            manufacture_date: None,
            shelf_life_days: None,
            remaining_days: None,
            unit_price: None,
            total_value: None,
            remark: None,
            ..sample_batch()
        };
        let v = serde_json::to_value(&b).unwrap();
        let back: Batch = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.unit_price.is_none());
        assert!(back.remaining_days.is_none());
    }

    #[test]
    fn batch_clone_preserves_key_fields() {
        let b = sample_batch();
        let c = b.clone();
        assert_eq!(b.batch_no, c.batch_no);
        assert_eq!(b.quantity, c.quantity);
        assert_eq!(b.quality_status, c.quality_status);
    }

    #[test]
    fn create_batch_request_serde_roundtrip() {
        let req = CreateBatchRequest {
            batch_no: "BAT-NEW".into(),
            sku: "SKU-B".into(),
            material_name: "Material B".into(),
            specification: Some("20mm".into()),
            unit: Some("KG".into()),
            quantity: 100.0,
            warehouse_id: "wh-2".into(),
            location_id: Some("loc-2".into()),
            supplier_id: Some("sup-2".into()),
            production_date: Some("2026-03-01".into()),
            expiry_date: Some("2027-03-01".into()),
            receipt_date: None,
            quality_status: Some("pending".into()),
            manufacture_date: None,
            shelf_life_days: Some(180),
            unit_price: Some(15.50),
            remark: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateBatchRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_batch_request_minimal() {
        let req = CreateBatchRequest {
            batch_no: "BAT-MIN".into(),
            sku: "SKU-X".into(),
            material_name: "Plain".into(),
            specification: None,
            unit: None,
            quantity: 0.0,
            warehouse_id: "wh".into(),
            location_id: None,
            supplier_id: None,
            production_date: None,
            expiry_date: None,
            receipt_date: None,
            quality_status: None,
            manufacture_date: None,
            shelf_life_days: None,
            unit_price: None,
            remark: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateBatchRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.batch_no, "BAT-MIN");
        assert!(back.quality_status.is_none());
    }

    #[test]
    fn update_batch_request_all_none() {
        let req = UpdateBatchRequest {
            batch_no: None,
            sku: None,
            material_name: None,
            specification: None,
            unit: None,
            quantity: None,
            warehouse_id: None,
            location_id: None,
            supplier_id: None,
            production_date: None,
            expiry_date: None,
            quality_status: None,
            status: None,
            manufacture_date: None,
            shelf_life_days: None,
            unit_price: None,
            remark: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateBatchRequest = serde_json::from_value(v).unwrap();
        assert!(back.batch_no.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn update_batch_request_partial() {
        let req = UpdateBatchRequest {
            batch_no: Some("BAT-UPD".into()),
            sku: None,
            material_name: None,
            specification: None,
            unit: None,
            quantity: Some(250.0),
            warehouse_id: None,
            location_id: None,
            supplier_id: None,
            production_date: None,
            expiry_date: Some("2028-01-01".into()),
            quality_status: Some("rejected".into()),
            status: Some("inactive".into()),
            manufacture_date: None,
            shelf_life_days: None,
            unit_price: Some(12.0),
            remark: Some("Updated".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateBatchRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn batch_query_params_serde_roundtrip() {
        let params = BatchQueryParams {
            page: Some(1),
            page_size: Some(20),
            warehouse_id: Some("wh-1".into()),
            sku: Some("SKU-A".into()),
            batch_no: Some("BAT-001".into()),
            supplier_id: None,
            quality_status: Some("qualified".into()),
            status: None,
            expiry_warning: Some(true),
            expired: Some(false),
        };
        let v = serde_json::to_value(&params).unwrap();
        let back: BatchQueryParams = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn batch_query_params_all_none() {
        let params = BatchQueryParams {
            page: None,
            page_size: None,
            warehouse_id: None,
            sku: None,
            batch_no: None,
            supplier_id: None,
            quality_status: None,
            status: None,
            expiry_warning: None,
            expired: None,
        };
        let v = serde_json::to_value(&params).unwrap();
        let back: BatchQueryParams = serde_json::from_value(v).unwrap();
        assert!(back.page.is_none());
        assert!(back.expiry_warning.is_none());
    }

    #[test]
    fn batch_statistics_serde_roundtrip() {
        let stats = BatchStatistics {
            total_batches: 100,
            total_quantity: 5000.0,
            total_value: 25000.0,
            expiring_soon_count: 5,
            expired_count: 2,
            quality_pending_count: 8,
        };
        let v = serde_json::to_value(&stats).unwrap();
        let back: BatchStatistics = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn batch_statistics_zero_values() {
        let stats = BatchStatistics {
            total_batches: 0,
            total_quantity: 0.0,
            total_value: 0.0,
            expiring_soon_count: 0,
            expired_count: 0,
            quality_pending_count: 0,
        };
        let v = serde_json::to_value(&stats).unwrap();
        let back: BatchStatistics = serde_json::from_value(v).unwrap();
        assert_eq!(back.total_batches, 0);
        assert_eq!(back.total_value, 0.0);
    }

    #[test]
    fn batch_json_has_expected_keys() {
        let b = sample_batch();
        let v = serde_json::to_value(&b).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("batch_no"));
        assert!(obj.contains_key("available_quantity"));
        assert!(obj.contains_key("quality_status"));
    }

    // ===================== 扩展覆盖：Debug / 极端值 / 边界 =====================

    #[test]
    fn batch_debug_format_contains_batch_no() {
        let b = sample_batch();
        let s = format!("{:?}", b);
        assert!(s.contains("BAT-001"));
        assert!(s.contains("SKU-A"));
    }

    #[test]
    fn batch_available_quantity_less_than_total() {
        // available < quantity 的语义场景
        let b = Batch {
            quantity: 1000.0,
            available_quantity: 0.0,
            ..sample_batch()
        };
        let v = serde_json::to_value(&b).unwrap();
        let back: Batch = serde_json::from_value(v).unwrap();
        assert_eq!(back.quantity, 1000.0);
        assert_eq!(back.available_quantity, 0.0);
    }

    #[test]
    fn batch_statistics_with_negative_counts_serializable() {
        // 异常输入（负数）也应可序列化，由上层校验
        let stats = BatchStatistics {
            total_batches: -1,
            total_quantity: -100.0,
            total_value: -500.0,
            expiring_soon_count: -2,
            expired_count: -3,
            quality_pending_count: -4,
        };
        let v = serde_json::to_value(&stats).unwrap();
        let back: BatchStatistics = serde_json::from_value(v).unwrap();
        assert_eq!(back.total_batches, -1);
    }
}
