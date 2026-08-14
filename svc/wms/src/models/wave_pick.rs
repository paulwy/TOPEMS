use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize, Serialize, FromRow, ToSchema)]
pub struct WavePick {
    pub id: Uuid,
    pub wave_pick_number: String,
    pub wave_pick_type: String,
    pub warehouse_id: Uuid,
    pub warehouse_name: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub assigned_user_name: Option<String>,
    pub batch_id: Option<Uuid>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub total_items: i64,
    pub picked_items: i64,
    pub total_quantity: f64,
    pub picked_quantity: f64,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, FromRow, ToSchema)]
pub struct WavePickItem {
    pub id: Uuid,
    pub wave_pick_id: Uuid,
    pub outbound_order_id: Option<Uuid>,
    pub outbound_order_number: Option<String>,
    pub material_code: String,
    pub material_name: String,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub planned_quantity: f64,
    pub picked_quantity: f64,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateWavePickRequest {
    pub wave_pick_number: String,
    pub wave_pick_type: String,
    pub warehouse_id: Uuid,
    pub priority: Option<String>,
    pub batch_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateWavePickRequest {
    pub wave_pick_type: Option<String>,
    pub priority: Option<String>,
    pub batch_id: Option<Uuid>,
    pub remarks: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct AssignWavePickRequest {
    pub assigned_to: Uuid,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_wave_pick() -> WavePick {
        WavePick {
            id: Uuid::new_v4(),
            wave_pick_number: "WP-001".into(),
            wave_pick_type: "outbound".into(),
            warehouse_id: Uuid::new_v4(),
            warehouse_name: Some("WH-1".into()),
            status: "created".into(),
            priority: Some("high".into()),
            assigned_to: Some(Uuid::new_v4()),
            assigned_user_name: Some("Bob".into()),
            batch_id: Some(Uuid::new_v4()),
            start_time: Some(Utc::now()),
            end_time: None,
            total_items: 10,
            picked_items: 0,
            total_quantity: 100.0,
            picked_quantity: 0.0,
            remarks: Some("new wave".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_wave_pick_item() -> WavePickItem {
        WavePickItem {
            id: Uuid::new_v4(),
            wave_pick_id: Uuid::new_v4(),
            outbound_order_id: Some(Uuid::new_v4()),
            outbound_order_number: Some("OUT-001".into()),
            material_code: "SKU-WP".into(),
            material_name: "Wave Item".into(),
            location_id: Some(Uuid::new_v4()),
            location_code: Some("A-01".into()),
            planned_quantity: 20.0,
            picked_quantity: 15.0,
            status: "picking".into(),
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn wave_pick_serde_roundtrip() {
        let wp = sample_wave_pick();
        let v = serde_json::to_value(&wp).unwrap();
        let back: WavePick = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn wave_pick_serde_none_fields() {
        let wp = WavePick {
            warehouse_name: None,
            priority: None,
            assigned_to: None,
            assigned_user_name: None,
            batch_id: None,
            start_time: None,
            end_time: None,
            remarks: None,
            ..sample_wave_pick()
        };
        let v = serde_json::to_value(&wp).unwrap();
        let back: WavePick = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.assigned_to.is_none());
    }

    #[test]
    fn wave_pick_clone_preserves_number() {
        let wp = sample_wave_pick();
        let c = wp.clone();
        assert_eq!(wp.wave_pick_number, c.wave_pick_number);
        assert_eq!(wp.status, c.status);
    }

    #[test]
    fn wave_pick_item_serde_roundtrip() {
        let item = sample_wave_pick_item();
        let v = serde_json::to_value(&item).unwrap();
        let back: WavePickItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn wave_pick_item_serde_none_fields() {
        let item = WavePickItem {
            outbound_order_id: None,
            outbound_order_number: None,
            location_id: None,
            location_code: None,
            remarks: Some("note".into()),
            ..sample_wave_pick_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: WavePickItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.outbound_order_id.is_none());
    }

    #[test]
    fn create_wave_pick_request_serde_roundtrip() {
        let req = CreateWavePickRequest {
            wave_pick_number: "WP-NEW".into(),
            wave_pick_type: "outbound".into(),
            warehouse_id: Uuid::new_v4(),
            priority: Some("normal".into()),
            batch_id: None,
            remarks: Some("new".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateWavePickRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_wave_pick_request_partial() {
        let req = UpdateWavePickRequest {
            wave_pick_type: None,
            priority: Some("urgent".into()),
            batch_id: Some(Uuid::new_v4()),
            remarks: None,
            status: Some("assigned".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateWavePickRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_wave_pick_request_all_none() {
        let req = UpdateWavePickRequest {
            wave_pick_type: None,
            priority: None,
            batch_id: None,
            remarks: None,
            status: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateWavePickRequest = serde_json::from_value(v).unwrap();
        assert!(back.status.is_none());
    }

    #[test]
    fn assign_wave_pick_request_serde_roundtrip() {
        let req = AssignWavePickRequest {
            assigned_to: Uuid::new_v4(),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: AssignWavePickRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn wave_pick_json_has_expected_keys() {
        let wp = sample_wave_pick();
        let v = serde_json::to_value(&wp).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("wave_pick_number"));
        assert!(obj.contains_key("total_items"));
        assert!(obj.contains_key("picked_quantity"));
    }
}
