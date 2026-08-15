use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct InventoryItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub location_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub min_quantity: Option<f64>,
    pub max_quantity: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateInventoryItemRequest {
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub location_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub min_quantity: Option<f64>,
    pub max_quantity: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateInventoryItemRequest {
    pub sku: Option<String>,
    pub name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub location_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub min_quantity: Option<f64>,
    pub max_quantity: Option<f64>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_item() -> InventoryItem {
        InventoryItem {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            sku: "SKU-001".into(),
            name: "Widget".into(),
            specification: Some("10x10".into()),
            unit: Some("PCS".into()),
            quantity: 100.0,
            location_id: Some(Uuid::new_v4()),
            warehouse_id: Some(Uuid::new_v4()),
            min_quantity: Some(10.0),
            max_quantity: Some(500.0),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn inventory_item_serde_roundtrip() {
        let item = sample_item();
        let v = serde_json::to_value(&item).unwrap();
        let back: InventoryItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inventory_item_serde_with_none_fields() {
        let item = InventoryItem {
            specification: None,
            unit: None,
            location_id: None,
            warehouse_id: None,
            min_quantity: None,
            max_quantity: None,
            ..sample_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: InventoryItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.specification.is_none());
        assert!(back.location_id.is_none());
    }

    #[test]
    fn inventory_item_clone_is_equal() {
        let item = sample_item();
        let cloned = item.clone();
        assert_eq!(item.sku, cloned.sku);
        assert_eq!(item.quantity, cloned.quantity);
        assert_eq!(item.status, cloned.status);
    }

    #[test]
    fn create_inventory_request_serde_roundtrip() {
        let req = CreateInventoryItemRequest {
            sku: "SKU-002".into(),
            name: "Gadget".into(),
            specification: Some("red".into()),
            unit: Some("BOX".into()),
            quantity: 50.0,
            location_id: Some(Uuid::new_v4()),
            warehouse_id: Some(Uuid::new_v4()),
            min_quantity: Some(5.0),
            max_quantity: Some(200.0),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInventoryItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_inventory_request_with_none_fields() {
        let req = CreateInventoryItemRequest {
            sku: "SKU-003".into(),
            name: "Plain".into(),
            specification: None,
            unit: None,
            quantity: 0.0,
            location_id: None,
            warehouse_id: None,
            min_quantity: None,
            max_quantity: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInventoryItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.specification.is_none());
        assert!(back.min_quantity.is_none());
    }

    #[test]
    fn update_inventory_request_all_none() {
        let req = UpdateInventoryItemRequest {
            sku: None,
            name: None,
            specification: None,
            unit: None,
            quantity: None,
            location_id: None,
            warehouse_id: None,
            min_quantity: None,
            max_quantity: None,
            status: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateInventoryItemRequest = serde_json::from_value(v).unwrap();
        assert!(back.sku.is_none());
        assert!(back.status.is_none());
        assert!(back.quantity.is_none());
    }

    #[test]
    fn update_inventory_request_partial_fields() {
        let req = UpdateInventoryItemRequest {
            sku: Some("SKU-UPD".into()),
            name: None,
            specification: None,
            unit: Some("EA".into()),
            quantity: Some(200.0),
            location_id: None,
            warehouse_id: None,
            min_quantity: None,
            max_quantity: None,
            status: Some("inactive".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateInventoryItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inventory_item_negative_quantity_serializable() {
        let item = InventoryItem {
            quantity: -5.0,
            ..sample_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: InventoryItem = serde_json::from_value(v).unwrap();
        assert_eq!(back.quantity, -5.0);
    }

    #[test]
    fn inventory_item_json_has_expected_keys() {
        let item = sample_item();
        let v = serde_json::to_value(&item).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("sku"));
        assert!(obj.contains_key("quantity"));
        assert!(obj.contains_key("status"));
        assert!(obj.contains_key("created_at"));
    }

    // ===================== 扩展覆盖：Debug / 极端值 / 边界 =====================

    #[test]
    fn inventory_item_debug_format_contains_sku() {
        let item = sample_item();
        let s = format!("{:?}", item);
        assert!(s.contains("SKU-001"));
        assert!(s.contains("Widget"));
    }

    #[test]
    fn inventory_item_with_extreme_quantity_serializable() {
        // 极大数与极小正数都能正确序列化
        let big = InventoryItem {
            quantity: f64::MAX,
            ..sample_item()
        };
        let v = serde_json::to_value(&big).unwrap();
        let back: InventoryItem = serde_json::from_value(v).unwrap();
        assert_eq!(back.quantity, f64::MAX);

        let tiny = InventoryItem {
            quantity: 0.0001,
            ..sample_item()
        };
        let v = serde_json::to_value(&tiny).unwrap();
        let back: InventoryItem = serde_json::from_value(v).unwrap();
        assert_eq!(back.quantity, 0.0001);
    }

    #[test]
    fn inventory_item_unicode_name_roundtrip() {
        let item = InventoryItem {
            name: "中文商品名 ¥¥¥".into(),
            sku: "SKU-中文-001".into(),
            ..sample_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: InventoryItem = serde_json::from_value(v).unwrap();
        assert_eq!(back.name, "中文商品名 ¥¥¥");
        assert_eq!(back.sku, "SKU-中文-001");
    }
}
