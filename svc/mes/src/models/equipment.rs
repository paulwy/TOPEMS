#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentResponse {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub workshop_id: Option<Uuid>,
    pub status: String,
    pub oee_rate: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentOeeSnapshotResponse {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub date: chrono::NaiveDate,
    pub shift: String,
    pub availability: f64,
    pub performance: f64,
    pub quality_rate: f64,
    pub oee: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_equipment() -> EquipmentResponse {
        EquipmentResponse {
            id: Uuid::new_v4(),
            name: "注塑机 A".to_string(),
            code: "EQ-001".to_string(),
            workshop_id: None,
            status: "running".to_string(),
            oee_rate: 0.85,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_snapshot() -> EquipmentOeeSnapshotResponse {
        EquipmentOeeSnapshotResponse {
            id: Uuid::new_v4(),
            equipment_id: Uuid::new_v4(),
            date: chrono::NaiveDate::from_ymd_opt(2024, 6, 1).unwrap(),
            shift: "day".to_string(),
            availability: 0.9,
            performance: 0.95,
            quality_rate: 0.99,
            oee: 0.85,
        }
    }

    #[test]
    fn equipment_response_serializes() {
        let json = serde_json::to_string(&sample_equipment()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["name"], "注塑机 A");
        assert_eq!(v["code"], "EQ-001");
        assert_eq!(v["status"], "running");
        assert_eq!(v["oee_rate"], 0.85);
        assert!(v["workshop_id"].is_null());
    }

    #[test]
    fn equipment_response_with_workshop() {
        let mut e = sample_equipment();
        e.workshop_id = Some(Uuid::new_v4());
        let json = serde_json::to_string(&e).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(v["workshop_id"].is_string());
    }

    #[test]
    fn oee_snapshot_serializes() {
        let json = serde_json::to_string(&sample_snapshot()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["shift"], "day");
        assert_eq!(v["oee"], 0.85);
        assert_eq!(v["date"], "2024-06-01");
        assert_eq!(v["availability"], 0.9);
    }
}
