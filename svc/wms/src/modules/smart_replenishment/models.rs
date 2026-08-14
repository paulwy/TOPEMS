use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ReplenishmentComputeRequest {
    pub warehouse_id: Option<Uuid>,
    pub include_all_warehouses: Option<bool>,
    pub rule_based_only: Option<bool>,
    pub consumption_period_days: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfirmSuggestionRequest {
    pub confirmed_quantity: Option<f64>,
    pub supplier_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateReplenishmentRuleRequest {
    pub rule_name: String,
    pub rule_type: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub material_category: Option<String>,
    pub material_code: Option<String>,
    pub safety_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub max_stock: Option<f64>,
    pub safety_factor: Option<f64>,
    pub lead_time_days: Option<i32>,
    pub consumption_days: Option<i32>,
    pub enabled: Option<bool>,
    pub priority_order: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateReplenishmentRuleRequest {
    pub rule_name: Option<String>,
    pub rule_type: Option<String>,
    pub safety_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub max_stock: Option<f64>,
    pub safety_factor: Option<f64>,
    pub lead_time_days: Option<i32>,
    pub consumption_days: Option<i32>,
    pub enabled: Option<bool>,
    pub priority_order: Option<i32>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replenishment_compute_request_serde_roundtrip() {
        let req = ReplenishmentComputeRequest {
            warehouse_id: Some(Uuid::new_v4()),
            include_all_warehouses: Some(true),
            rule_based_only: Some(false),
            consumption_period_days: Some(30),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: ReplenishmentComputeRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn replenishment_compute_request_all_none() {
        let req = ReplenishmentComputeRequest {
            warehouse_id: None,
            include_all_warehouses: None,
            rule_based_only: None,
            consumption_period_days: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: ReplenishmentComputeRequest = serde_json::from_value(v).unwrap();
        assert!(back.warehouse_id.is_none());
        assert!(back.consumption_period_days.is_none());
    }

    #[test]
    fn confirm_suggestion_request_serde_roundtrip() {
        let req = ConfirmSuggestionRequest {
            confirmed_quantity: Some(100.0),
            supplier_id: Some(Uuid::new_v4()),
            remarks: Some("ok".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: ConfirmSuggestionRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn confirm_suggestion_request_all_none() {
        let req = ConfirmSuggestionRequest {
            confirmed_quantity: None,
            supplier_id: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: ConfirmSuggestionRequest = serde_json::from_value(v).unwrap();
        assert!(back.confirmed_quantity.is_none());
    }

    #[test]
    fn create_replenishment_rule_request_serde_roundtrip() {
        let req = CreateReplenishmentRuleRequest {
            rule_name: "Rule-1".into(),
            rule_type: Some("custom".into()),
            warehouse_id: Some(Uuid::new_v4()),
            warehouse_name: Some("WH-1".into()),
            material_category: Some("A".into()),
            material_code: Some("SKU-1".into()),
            safety_stock: Some(50.0),
            reorder_point: Some(100.0),
            max_stock: Some(500.0),
            safety_factor: Some(1.5),
            lead_time_days: Some(7),
            consumption_days: Some(30),
            enabled: Some(true),
            priority_order: Some(1),
            remarks: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateReplenishmentRuleRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_replenishment_rule_request_minimal() {
        let req = CreateReplenishmentRuleRequest {
            rule_name: "Bare".into(),
            rule_type: None,
            warehouse_id: None,
            warehouse_name: None,
            material_category: None,
            material_code: None,
            safety_stock: None,
            reorder_point: None,
            max_stock: None,
            safety_factor: None,
            lead_time_days: None,
            consumption_days: None,
            enabled: None,
            priority_order: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateReplenishmentRuleRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.rule_name, "Bare");
        assert!(back.enabled.is_none());
    }

    #[test]
    fn update_replenishment_rule_request_serde_roundtrip() {
        let req = UpdateReplenishmentRuleRequest {
            rule_name: Some("Updated".into()),
            rule_type: Some("auto".into()),
            safety_stock: Some(75.0),
            reorder_point: Some(150.0),
            max_stock: Some(600.0),
            safety_factor: Some(2.0),
            lead_time_days: Some(10),
            consumption_days: Some(45),
            enabled: Some(false),
            priority_order: Some(5),
            remarks: Some("updated".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateReplenishmentRuleRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_replenishment_rule_request_all_none() {
        let req = UpdateReplenishmentRuleRequest {
            rule_name: None,
            rule_type: None,
            safety_stock: None,
            reorder_point: None,
            max_stock: None,
            safety_factor: None,
            lead_time_days: None,
            consumption_days: None,
            enabled: None,
            priority_order: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateReplenishmentRuleRequest = serde_json::from_value(v).unwrap();
        assert!(back.rule_name.is_none());
        assert!(back.enabled.is_none());
    }

    #[test]
    fn create_replenishment_rule_request_clone_preserves_name() {
        let req = CreateReplenishmentRuleRequest {
            rule_name: "Clone-Test".into(),
            rule_type: None,
            warehouse_id: None,
            warehouse_name: None,
            material_category: None,
            material_code: None,
            safety_stock: None,
            reorder_point: None,
            max_stock: None,
            safety_factor: None,
            lead_time_days: None,
            consumption_days: None,
            enabled: None,
            priority_order: None,
            remarks: None,
        };
        let c = req.clone();
        assert_eq!(req.rule_name, c.rule_name);
    }
}
