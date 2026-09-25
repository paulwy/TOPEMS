use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct SerialNumber {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub serial_no: String,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub warehouse_id: Uuid,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub batch_no: Option<String>,
    pub production_date: Option<NaiveDate>,
    pub expiry_date: Option<NaiveDate>,
    pub quality_status: String,
    pub status: String,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub inbound_order_no: Option<String>,
    pub outbound_order_no: Option<String>,
    pub current_owner: Option<String>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateSerialNumberRequest {
    pub serial_no: String,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: Option<String>,
    pub warranty_start_date: Option<String>,
    pub warranty_end_date: Option<String>,
    pub inbound_order_no: Option<String>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateSerialNumberRequest {
    pub sku: Option<String>,
    pub material_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub warranty_start_date: Option<String>,
    pub warranty_end_date: Option<String>,
    pub outbound_order_no: Option<String>,
    pub current_owner: Option<String>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SerialNumberQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<Uuid>,
    pub sku: Option<String>,
    pub serial_no: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub expiry_warning: Option<bool>,
    pub warranty_warning: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SerialNumberStatistics {
    pub total_serials: i64,
    pub in_stock_count: i64,
    pub out_stock_count: i64,
    pub quality_pending_count: i64,
    pub warranty_expiring_soon_count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_serial() -> SerialNumber {
        SerialNumber {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            serial_no: "SN-001".into(),
            sku: "SKU-SN".into(),
            material_name: "Serial Item".into(),
            specification: Some("v2".into()),
            unit: Some("PCS".into()),
            warehouse_id: Uuid::new_v4(),
            warehouse_name: Some("WH-1".into()),
            location_id: Some(Uuid::new_v4()),
            location_code: Some("A-01".into()),
            supplier_id: Some(Uuid::new_v4()),
            supplier_name: Some("Sup".into()),
            batch_no: Some("BAT-1".into()),
            production_date: NaiveDate::from_ymd_opt(2026, 1, 1),
            expiry_date: NaiveDate::from_ymd_opt(2028, 1, 1),
            quality_status: "qualified".into(),
            status: "pending".into(),
            warranty_start_date: NaiveDate::from_ymd_opt(2026, 1, 1),
            warranty_end_date: NaiveDate::from_ymd_opt(2028, 1, 1),
            inbound_order_no: Some("INB-1".into()),
            outbound_order_no: None,
            current_owner: None,
            unit_price: Some(99.0),
            remark: Some("ok".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn serial_number_serde_roundtrip() {
        let s = sample_serial();
        let v = serde_json::to_value(&s).unwrap();
        let back: SerialNumber = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn serial_number_serde_all_none_optionals() {
        let s = SerialNumber {
            specification: None,
            unit: None,
            warehouse_name: None,
            location_id: None,
            location_code: None,
            supplier_id: None,
            supplier_name: None,
            batch_no: None,
            production_date: None,
            expiry_date: None,
            warranty_start_date: None,
            warranty_end_date: None,
            inbound_order_no: None,
            outbound_order_no: None,
            current_owner: None,
            unit_price: None,
            remark: None,
            ..sample_serial()
        };
        let v = serde_json::to_value(&s).unwrap();
        let back: SerialNumber = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.unit_price.is_none());
    }

    #[test]
    fn serial_number_clone_preserves_serial_no() {
        let s = sample_serial();
        let c = s.clone();
        assert_eq!(s.serial_no, c.serial_no);
        assert_eq!(s.status, c.status);
    }

    #[test]
    fn create_serial_number_request_serde_roundtrip() {
        let req = CreateSerialNumberRequest {
            serial_no: "SN-NEW".into(),
            sku: "SKU-N".into(),
            material_name: "New Serial".into(),
            specification: Some("v1".into()),
            unit: Some("EA".into()),
            warehouse_id: Uuid::new_v4(),
            location_id: Some(Uuid::new_v4()),
            supplier_id: None,
            batch_no: Some("BAT".into()),
            production_date: None,
            expiry_date: None,
            quality_status: Some("pending".into()),
            warranty_start_date: None,
            warranty_end_date: None,
            inbound_order_no: None,
            unit_price: Some(10.0),
            remark: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateSerialNumberRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_serial_number_request_partial() {
        let req = UpdateSerialNumberRequest {
            sku: None,
            material_name: Some("Updated".into()),
            specification: None,
            unit: None,
            warehouse_id: Some(Uuid::new_v4()),
            location_id: None,
            supplier_id: None,
            batch_no: None,
            production_date: None,
            expiry_date: Some("2029-01-01".into()),
            quality_status: Some("rejected".into()),
            status: Some("used".into()),
            warranty_start_date: None,
            warranty_end_date: None,
            outbound_order_no: Some("OUT-1".into()),
            current_owner: Some("Customer".into()),
            unit_price: None,
            remark: Some("updated".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateSerialNumberRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn serial_number_query_params_serde_roundtrip() {
        let p = SerialNumberQueryParams {
            page: Some(1),
            page_size: Some(10),
            warehouse_id: Some(Uuid::new_v4()),
            sku: Some("SKU".into()),
            serial_no: Some("SN".into()),
            supplier_id: None,
            batch_no: None,
            quality_status: Some("qualified".into()),
            status: None,
            expiry_warning: Some(true),
            warranty_warning: Some(false),
        };
        let v = serde_json::to_value(&p).unwrap();
        let back: SerialNumberQueryParams = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn serial_number_statistics_serde_roundtrip() {
        let stats = SerialNumberStatistics {
            total_serials: 500,
            in_stock_count: 400,
            out_stock_count: 100,
            quality_pending_count: 25,
            warranty_expiring_soon_count: 5,
        };
        let v = serde_json::to_value(&stats).unwrap();
        let back: SerialNumberStatistics = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn serial_number_statistics_zero_values() {
        let stats = SerialNumberStatistics {
            total_serials: 0,
            in_stock_count: 0,
            out_stock_count: 0,
            quality_pending_count: 0,
            warranty_expiring_soon_count: 0,
        };
        let v = serde_json::to_value(&stats).unwrap();
        let back: SerialNumberStatistics = serde_json::from_value(v).unwrap();
        assert_eq!(back.total_serials, 0);
    }

    #[test]
    fn serial_number_json_has_expected_keys() {
        let s = sample_serial();
        let v = serde_json::to_value(&s).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("serial_no"));
        assert!(obj.contains_key("quality_status"));
        assert!(obj.contains_key("warranty_end_date"));
    }
}
