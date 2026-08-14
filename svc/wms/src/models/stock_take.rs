use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct StockTake {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub stock_take_number: String,
    pub status: String,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateStockTakeRequest {
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub stock_take_number: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateStockTakeRequest {
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub status: Option<String>,
    pub end_time: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct StockTakeItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub stock_take_id: Uuid,
    pub inventory_item_id: Uuid,
    pub expected_quantity: f64,
    pub actual_quantity: Option<f64>,
    pub variance: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateStockTakeItemRequest {
    pub inventory_item_id: Uuid,
    pub expected_quantity: f64,
    pub actual_quantity: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateStockTakeItemRequest {
    pub actual_quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_stock_take() -> StockTake {
        StockTake {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            warehouse_id: Some(Uuid::new_v4()),
            location_id: Some(Uuid::new_v4()),
            stock_take_number: "ST-001".into(),
            status: "planned".into(),
            start_time: Some(Utc::now()),
            end_time: None,
            remarks: Some("initial".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_stock_take_item() -> StockTakeItem {
        StockTakeItem {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            stock_take_id: Uuid::new_v4(),
            inventory_item_id: Uuid::new_v4(),
            expected_quantity: 100.0,
            actual_quantity: Some(98.0),
            variance: Some(-2.0),
            status: "counted".into(),
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn stock_take_serde_roundtrip() {
        let st = sample_stock_take();
        let v = serde_json::to_value(&st).unwrap();
        let back: StockTake = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn stock_take_serde_none_fields() {
        let st = StockTake {
            warehouse_id: None,
            location_id: None,
            start_time: None,
            end_time: None,
            remarks: None,
            ..sample_stock_take()
        };
        let v = serde_json::to_value(&st).unwrap();
        let back: StockTake = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.remarks.is_none());
    }

    #[test]
    fn stock_take_clone_preserves_number() {
        let st = sample_stock_take();
        let c = st.clone();
        assert_eq!(st.stock_take_number, c.stock_take_number);
        assert_eq!(st.status, c.status);
    }

    #[test]
    fn stock_take_item_serde_roundtrip() {
        let item = sample_stock_take_item();
        let v = serde_json::to_value(&item).unwrap();
        let back: StockTakeItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn stock_take_item_serde_none_fields() {
        let item = StockTakeItem {
            actual_quantity: None,
            variance: None,
            remarks: Some("uncounted".into()),
            ..sample_stock_take_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: StockTakeItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.actual_quantity.is_none());
    }

    #[test]
    fn create_stock_take_request_serde_roundtrip() {
        let req = CreateStockTakeRequest {
            warehouse_id: Some(Uuid::new_v4()),
            location_id: None,
            stock_take_number: "ST-NEW".into(),
            remarks: Some("new".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateStockTakeRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_stock_take_request_partial() {
        let req = UpdateStockTakeRequest {
            warehouse_id: None,
            location_id: None,
            status: Some("in_progress".into()),
            end_time: Some(Utc::now()),
            remarks: Some("started".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateStockTakeRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_stock_take_item_request_serde_roundtrip() {
        let req = CreateStockTakeItemRequest {
            inventory_item_id: Uuid::new_v4(),
            expected_quantity: 50.0,
            actual_quantity: Some(50.0),
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateStockTakeItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_stock_take_item_request_all_none() {
        let req = UpdateStockTakeItemRequest {
            actual_quantity: None,
            status: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateStockTakeItemRequest = serde_json::from_value(v).unwrap();
        assert!(back.actual_quantity.is_none());
    }

    #[test]
    fn stock_take_json_has_expected_keys() {
        let st = sample_stock_take();
        let v = serde_json::to_value(&st).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("stock_take_number"));
        assert!(obj.contains_key("start_time"));
    }
}
