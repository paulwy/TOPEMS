use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Budget {
    pub id: Uuid,
    pub project_id: Uuid,
    pub budget_code: String,
    pub budget_name: String,
    pub budget_type: Option<String>,
    pub total_amount: f64,
    pub allocated_amount: f64,
    pub spent_amount: f64,
    pub status: String,
    pub version: i32,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetRequest {
    pub project_id: Uuid,
    pub budget_code: String,
    pub budget_name: String,
    pub budget_type: Option<String>,
    pub total_amount: f64,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBudgetRequest {
    pub budget_name: Option<String>,
    pub budget_type: Option<String>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BudgetItem {
    pub id: Uuid,
    pub budget_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: f64,
    pub allocated_amount: f64,
    pub spent_amount: f64,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetItemRequest {
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: f64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBudgetItemRequest {
    pub item_name: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: Option<f64>,
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    // ---- Budget ----

    fn sample_budget() -> Budget {
        Budget {
            id: uid(),
            project_id: uid(),
            budget_code: "B-001".to_string(),
            budget_name: "年度预算".to_string(),
            budget_type: Some("annual".to_string()),
            total_amount: 1_000_000.0,
            allocated_amount: 800_000.0,
            spent_amount: 500_000.0,
            status: "approved".to_string(),
            version: 2,
            created_by: Some("admin".to_string()),
            approved_by: Some("boss".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_budget_serde_roundtrip() {
        let b = sample_budget();
        let s = serde_json::to_string(&b).unwrap();
        let back: Budget = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, b.id);
        assert_eq!(back.budget_code, b.budget_code);
        assert_eq!(back.total_amount, b.total_amount);
        assert_eq!(back.spent_amount, b.spent_amount);
        assert_eq!(back.version, b.version);
    }

    #[test]
    fn test_budget_clone_preserves_fields() {
        let b = sample_budget();
        let c = b.clone();
        assert_eq!(c.id, b.id);
        assert_eq!(c.budget_name, b.budget_name);
    }

    #[test]
    fn test_budget_with_none_optional_fields() {
        let b = Budget {
            id: uid(),
            project_id: uid(),
            budget_code: "B-002".to_string(),
            budget_name: "n".to_string(),
            budget_type: None,
            total_amount: 0.0,
            allocated_amount: 0.0,
            spent_amount: 0.0,
            status: "draft".to_string(),
            version: 1,
            created_by: None,
            approved_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&b).unwrap();
        let back: Budget = serde_json::from_str(&s).unwrap();
        assert!(back.budget_type.is_none());
        assert!(back.created_by.is_none());
    }

    #[test]
    fn test_budget_negative_amounts_roundtrip() {
        let mut b = sample_budget();
        b.spent_amount = -10.5;
        let s = serde_json::to_string(&b).unwrap();
        let back: Budget = serde_json::from_str(&s).unwrap();
        assert_eq!(back.spent_amount, -10.5);
    }

    // ---- CreateBudgetRequest ----

    #[test]
    fn test_create_budget_request_roundtrip() {
        let r = CreateBudgetRequest {
            project_id: uid(),
            budget_code: "C-001".to_string(),
            budget_name: "新预算".to_string(),
            budget_type: Some("quarterly".to_string()),
            total_amount: 250_000.0,
            created_by: Some("u1".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateBudgetRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.budget_code, r.budget_code);
        assert_eq!(back.total_amount, r.total_amount);
        assert_eq!(back.budget_type, r.budget_type);
    }

    #[test]
    fn test_create_budget_request_minimal() {
        let r = CreateBudgetRequest {
            project_id: uid(),
            budget_code: "C-002".to_string(),
            budget_name: "x".to_string(),
            budget_type: None,
            total_amount: 0.0,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateBudgetRequest = serde_json::from_str(&s).unwrap();
        assert!(back.budget_type.is_none());
        assert!(back.created_by.is_none());
    }

    // ---- UpdateBudgetRequest ----

    #[test]
    fn test_update_budget_request_all_none() {
        let r = UpdateBudgetRequest {
            budget_name: None,
            budget_type: None,
            total_amount: None,
            status: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateBudgetRequest = serde_json::from_str(&s).unwrap();
        assert!(back.budget_name.is_none());
        assert!(back.total_amount.is_none());
    }

    #[test]
    fn test_update_budget_request_with_values() {
        let r = UpdateBudgetRequest {
            budget_name: Some("updated".to_string()),
            budget_type: Some("yearly".to_string()),
            total_amount: Some(999.99),
            status: Some("approved".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateBudgetRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.budget_name, r.budget_name);
        assert_eq!(back.total_amount, r.total_amount);
    }

    // ---- BudgetItem ----

    fn sample_budget_item() -> BudgetItem {
        BudgetItem {
            id: uid(),
            budget_id: uid(),
            item_code: Some("I-001".to_string()),
            item_name: "材料费".to_string(),
            category: Some("material".to_string()),
            subcategory: Some("steel".to_string()),
            budget_amount: 100_000.0,
            allocated_amount: 80_000.0,
            spent_amount: 50_000.0,
            description: Some("原材料".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_budget_item_serde_roundtrip() {
        let bi = sample_budget_item();
        let s = serde_json::to_string(&bi).unwrap();
        let back: BudgetItem = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, bi.id);
        assert_eq!(back.item_name, bi.item_name);
        assert_eq!(back.budget_amount, bi.budget_amount);
        assert_eq!(back.category, bi.category);
    }

    #[test]
    fn test_budget_item_clone_eq() {
        let bi = sample_budget_item();
        let c = bi.clone();
        assert_eq!(c.id, bi.id);
        assert_eq!(c.item_name, bi.item_name);
    }

    #[test]
    fn test_budget_item_with_none_optional() {
        let bi = BudgetItem {
            id: uid(),
            budget_id: uid(),
            item_code: None,
            item_name: "n".to_string(),
            category: None,
            subcategory: None,
            budget_amount: 0.0,
            allocated_amount: 0.0,
            spent_amount: 0.0,
            description: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&bi).unwrap();
        let back: BudgetItem = serde_json::from_str(&s).unwrap();
        assert!(back.item_code.is_none());
        assert!(back.description.is_none());
    }

    // ---- CreateBudgetItemRequest ----

    #[test]
    fn test_create_budget_item_request_roundtrip() {
        let r = CreateBudgetItemRequest {
            item_code: Some("IC-1".to_string()),
            item_name: "人工费".to_string(),
            category: Some("labor".to_string()),
            subcategory: Some("engineer".to_string()),
            budget_amount: 5000.0,
            description: Some("d".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateBudgetItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.item_name, r.item_name);
        assert_eq!(back.budget_amount, r.budget_amount);
    }

    #[test]
    fn test_create_budget_item_request_minimal() {
        let r = CreateBudgetItemRequest {
            item_code: None,
            item_name: "x".to_string(),
            category: None,
            subcategory: None,
            budget_amount: 0.0,
            description: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateBudgetItemRequest = serde_json::from_str(&s).unwrap();
        assert!(back.item_code.is_none());
    }

    // ---- UpdateBudgetItemRequest ----

    #[test]
    fn test_update_budget_item_request_roundtrip() {
        let r = UpdateBudgetItemRequest {
            item_name: Some("new".to_string()),
            category: Some("c".to_string()),
            subcategory: Some("s".to_string()),
            budget_amount: Some(123.45),
            description: Some("d".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateBudgetItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.item_name, r.item_name);
        assert_eq!(back.budget_amount, r.budget_amount);
    }

    #[test]
    fn test_update_budget_item_request_all_none() {
        let r = UpdateBudgetItemRequest {
            item_name: None,
            category: None,
            subcategory: None,
            budget_amount: None,
            description: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateBudgetItemRequest = serde_json::from_str(&s).unwrap();
        assert!(back.item_name.is_none());
        assert!(back.budget_amount.is_none());
    }

    #[test]
    fn test_budget_status_default_string_field() {
        // Verify a Budget with status = "" (empty string) round-trips
        let mut b = sample_budget();
        b.status = String::new();
        let s = serde_json::to_string(&b).unwrap();
        let back: Budget = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "");
    }
}
