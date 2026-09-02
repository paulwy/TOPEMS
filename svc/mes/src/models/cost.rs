#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProductionCostRecordResponse {
    pub id: Uuid,
    pub production_order_id: Uuid,
    pub cost_type: String,
    pub amount: f64,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EnergyRecordResponse {
    pub id: Uuid,
    pub workshop_id: Uuid,
    pub product_id: Option<Uuid>,
    pub energy_type: String,
    pub consumption: f64,
    pub unit: String,
    pub cost: f64,
    pub recorded_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_cost() -> ProductionCostRecordResponse {
        ProductionCostRecordResponse {
            id: Uuid::new_v4(),
            production_order_id: Uuid::new_v4(),
            cost_type: "labor".to_string(),
            amount: 1234.5,
            recorded_at: Utc::now(),
        }
    }

    fn sample_energy() -> EnergyRecordResponse {
        EnergyRecordResponse {
            id: Uuid::new_v4(),
            workshop_id: Uuid::new_v4(),
            product_id: None,
            energy_type: "electricity".to_string(),
            consumption: 99.9,
            unit: "kWh".to_string(),
            cost: 10.5,
            recorded_at: Utc::now(),
        }
    }

    #[test]
    fn cost_record_serializes() {
        let json = serde_json::to_string(&sample_cost()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["cost_type"], "labor");
        assert_eq!(v["amount"], 1234.5);
        assert!(v["recorded_at"].is_string());
    }

    #[test]
    fn energy_record_serializes_with_null_product() {
        let json = serde_json::to_string(&sample_energy()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["energy_type"], "electricity");
        assert_eq!(v["consumption"], 99.9);
        assert_eq!(v["unit"], "kWh");
        assert!(v["product_id"].is_null());
    }

    #[test]
    fn energy_record_with_product_id() {
        let mut e = sample_energy();
        e.product_id = Some(Uuid::new_v4());
        let json = serde_json::to_string(&e).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(v["product_id"].is_string());
    }
}
