use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// 库存移动记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct InventoryMovement {
    pub id: Uuid,
    pub movement_no: String,
    pub tenant_id: Uuid,
    pub movement_type: String, // inbound/outbound/transfer/return/adjustment
    pub reference_id: Option<String>,
    pub reference_type: Option<String>, // return_order/sales_order/purchase_order/transfer_order
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub from_warehouse_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub status: String, // pending/completed/cancelled
    pub performed_by: Option<Uuid>,
    pub performed_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateInventoryMovementRequest {
    pub movement_type: String,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub from_warehouse_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct InventoryMovementQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub movement_type: Option<String>,
    pub status: Option<String>,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub material_id: Option<Uuid>,
    pub ref_id: Option<String>,
    pub ref_type: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_movement() -> InventoryMovement {
        InventoryMovement {
            id: Uuid::new_v4(),
            movement_no: "MV-001".into(),
            tenant_id: Uuid::new_v4(),
            movement_type: "inbound".into(),
            reference_id: Some("REF-1".into()),
            reference_type: Some("purchase_order".into()),
            material_id: Some(Uuid::new_v4()),
            material_code: Some("SKU-MV".into()),
            material_name: Some("Moved Item".into()),
            quantity: 50.0,
            from_location_id: None,
            to_location_id: Some(Uuid::new_v4()),
            from_warehouse_id: None,
            to_warehouse_id: Some(Uuid::new_v4()),
            status: "completed".into(),
            performed_by: Some(Uuid::new_v4()),
            performed_at: Some(Utc::now()),
            notes: Some("test move".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn inventory_movement_serde_roundtrip() {
        let m = sample_movement();
        let v = serde_json::to_value(&m).unwrap();
        let back: InventoryMovement = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inventory_movement_serde_all_none_optionals() {
        let m = InventoryMovement {
            reference_id: None,
            reference_type: None,
            material_id: None,
            material_code: None,
            material_name: None,
            from_location_id: None,
            to_location_id: None,
            from_warehouse_id: None,
            to_warehouse_id: None,
            performed_by: None,
            performed_at: None,
            notes: None,
            ..sample_movement()
        };
        let v = serde_json::to_value(&m).unwrap();
        let back: InventoryMovement = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.material_id.is_none());
    }

    #[test]
    fn inventory_movement_clone_preserves_movement_no() {
        let m = sample_movement();
        let c = m.clone();
        assert_eq!(m.movement_no, c.movement_no);
        assert_eq!(m.movement_type, c.movement_type);
    }

    #[test]
    fn create_inventory_movement_request_serde_roundtrip() {
        let req = CreateInventoryMovementRequest {
            movement_type: "transfer".into(),
            reference_id: Some("REF".into()),
            reference_type: Some("transfer_order".into()),
            material_id: Some(Uuid::new_v4()),
            material_code: None,
            material_name: Some("Item".into()),
            quantity: 25.0,
            from_location_id: Some(Uuid::new_v4()),
            to_location_id: Some(Uuid::new_v4()),
            from_warehouse_id: Some(Uuid::new_v4()),
            to_warehouse_id: Some(Uuid::new_v4()),
            notes: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInventoryMovementRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_inventory_movement_request_minimal() {
        let req = CreateInventoryMovementRequest {
            movement_type: "adjustment".into(),
            reference_id: None,
            reference_type: None,
            material_id: None,
            material_code: Some("SKU".into()),
            material_name: None,
            quantity: 0.0,
            from_location_id: None,
            to_location_id: None,
            from_warehouse_id: None,
            to_warehouse_id: None,
            notes: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInventoryMovementRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.movement_type, "adjustment");
        assert!(back.notes.is_none());
    }

    #[test]
    fn inventory_movement_query_params_serde_roundtrip() {
        let p = InventoryMovementQueryParams {
            page: Some(1),
            page_size: Some(20),
            movement_type: Some("inbound".into()),
            status: Some("completed".into()),
            reference_id: Some("REF".into()),
            reference_type: None,
            material_id: Some(Uuid::new_v4()),
            ref_id: Some("ref2".into()),
            ref_type: None,
        };
        let v = serde_json::to_value(&p).unwrap();
        let back: InventoryMovementQueryParams = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inventory_movement_query_params_all_none() {
        let p = InventoryMovementQueryParams {
            page: None,
            page_size: None,
            movement_type: None,
            status: None,
            reference_id: None,
            reference_type: None,
            material_id: None,
            ref_id: None,
            ref_type: None,
        };
        let v = serde_json::to_value(&p).unwrap();
        let back: InventoryMovementQueryParams = serde_json::from_value(v).unwrap();
        assert!(back.page.is_none());
        assert!(back.movement_type.is_none());
    }

    #[test]
    fn inventory_movement_json_has_expected_keys() {
        let m = sample_movement();
        let v = serde_json::to_value(&m).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("movement_no"));
        assert!(obj.contains_key("movement_type"));
        assert!(obj.contains_key("quantity"));
    }
}
