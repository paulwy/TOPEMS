use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Transfer {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub transfer_number: String,
    pub from_warehouse_id: Option<Uuid>,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTransferRequest {
    pub transfer_number: String,
    pub from_warehouse_id: Option<Uuid>,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateTransferRequest {
    pub from_warehouse_id: Option<Uuid>,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TransferItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub transfer_id: Uuid,
    pub inventory_item_id: Uuid,
    pub quantity: f64,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTransferItemRequest {
    pub inventory_item_id: Uuid,
    pub quantity: f64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateTransferItemRequest {
    pub quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_transfer() -> Transfer {
        Transfer {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            transfer_number: "TRF-001".into(),
            from_warehouse_id: Some(Uuid::new_v4()),
            from_location_id: Some(Uuid::new_v4()),
            to_warehouse_id: Some(Uuid::new_v4()),
            to_location_id: Some(Uuid::new_v4()),
            status: "pending".into(),
            remarks: Some("test transfer".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn transfer_serde_roundtrip() {
        let t = sample_transfer();
        let v = serde_json::to_value(&t).unwrap();
        let back: Transfer = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_serde_with_none_fields() {
        let t = Transfer {
            from_warehouse_id: None,
            from_location_id: None,
            to_warehouse_id: None,
            to_location_id: None,
            remarks: None,
            ..sample_transfer()
        };
        let v = serde_json::to_value(&t).unwrap();
        let back: Transfer = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.remarks.is_none());
    }

    #[test]
    fn transfer_clone_preserves_number_and_status() {
        let t = sample_transfer();
        let c = t.clone();
        assert_eq!(t.transfer_number, c.transfer_number);
        assert_eq!(t.status, c.status);
    }

    #[test]
    fn create_transfer_request_serde_roundtrip() {
        let req = CreateTransferRequest {
            transfer_number: "TRF-NEW".into(),
            from_warehouse_id: Some(Uuid::new_v4()),
            from_location_id: None,
            to_warehouse_id: Some(Uuid::new_v4()),
            to_location_id: None,
            remarks: Some("new".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateTransferRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_transfer_request_all_none() {
        let req = UpdateTransferRequest {
            from_warehouse_id: None,
            from_location_id: None,
            to_warehouse_id: None,
            to_location_id: None,
            status: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateTransferRequest = serde_json::from_value(v).unwrap();
        assert!(back.status.is_none());
        assert!(back.remarks.is_none());
    }

    #[test]
    fn transfer_item_serde_roundtrip() {
        let item = TransferItem {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            transfer_id: Uuid::new_v4(),
            inventory_item_id: Uuid::new_v4(),
            quantity: 25.0,
            status: "active".into(),
            remarks: Some("item remark".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: TransferItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_item_serde_with_none_remarks() {
        let item = TransferItem {
            remarks: None,
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            transfer_id: Uuid::new_v4(),
            inventory_item_id: Uuid::new_v4(),
            quantity: 0.0,
            status: "pending".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: TransferItem = serde_json::from_value(v).unwrap();
        assert!(back.remarks.is_none());
    }

    #[test]
    fn create_transfer_item_request_serde_roundtrip() {
        let req = CreateTransferItemRequest {
            inventory_item_id: Uuid::new_v4(),
            quantity: 10.0,
            remarks: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateTransferItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_transfer_item_request_partial() {
        let req = UpdateTransferItemRequest {
            quantity: Some(15.0),
            status: Some("completed".into()),
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateTransferItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_json_has_expected_keys() {
        let t = sample_transfer();
        let v = serde_json::to_value(&t).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("transfer_number"));
        assert!(obj.contains_key("from_warehouse_id"));
        assert!(obj.contains_key("to_warehouse_id"));
    }
}
