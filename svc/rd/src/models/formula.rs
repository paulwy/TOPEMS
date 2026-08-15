use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Formula {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub version: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub status: String,
    pub approval_status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub effective_date: Option<DateTime<Utc>>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub ingredients: serde_json::Value,
    pub process_steps: Option<String>,
    pub properties: serde_json::Value,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaIngredient {
    pub name: String,
    pub quantity: f64,
    pub unit: Option<String>,
    pub purity: Option<String>,
    pub supplier: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaRequest {
    pub name: String,
    pub code: String,
    pub version: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub status: Option<String>,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_steps: Option<String>,
    pub effective_date: Option<String>,
    pub expiration_date: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFormulaRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub approval_status: Option<String>,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_steps: Option<String>,
    pub effective_date: Option<String>,
    pub expiration_date: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FormulaVersion {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub formula_id: Uuid,
    pub version: String,
    pub ingredients: serde_json::Value,
    pub process_steps: Option<String>,
    pub process_params: Option<serde_json::Value>,
    pub properties: serde_json::Value,
    pub changes: Option<String>,
    pub approval_status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaVersionRequest {
    pub version: String,
    pub changes: String,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_steps: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveFormulaRequest {}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn sample_formula() -> Formula {
        Formula {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            name: "配方A".to_string(),
            code: "FM-001".to_string(),
            version: "1.0.0".to_string(),
            category: Some("树脂".to_string()),
            description: Some("测试配方".to_string()),
            project_id: Some(Uuid::nil()),
            status: "draft".to_string(),
            approval_status: Some("pending".to_string()),
            approved_by: None,
            approved_at: None,
            effective_date: Some(now()),
            expiration_date: None,
            ingredients: serde_json::json!([{"name": "A", "quantity": 10.0}]),
            process_steps: Some("步骤1;步骤2".to_string()),
            properties: serde_json::json!({"viscosity": 1.2}),
            created_by: "admin".to_string(),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_formula_serde_roundtrip() {
        let f = sample_formula();
        let json = serde_json::to_string(&f).unwrap();
        let back: Formula = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.version, "1.0.0");
    }

    #[test]
    fn test_formula_clone_preserves_serialization() {
        let f = sample_formula();
        let cloned = f.clone();
        assert_eq!(
            serde_json::to_string(&f).unwrap(),
            serde_json::to_string(&cloned).unwrap()
        );
    }

    #[test]
    fn test_formula_debug_contains_code() {
        let f = sample_formula();
        let debug = format!("{:?}", f);
        assert!(debug.contains("Formula"));
        assert!(debug.contains("FM-001"));
    }

    #[test]
    fn test_formula_ingredient_roundtrip() {
        let ing = FormulaIngredient {
            name: "原料X".to_string(),
            quantity: 25.5,
            unit: Some("g".to_string()),
            purity: Some("99%".to_string()),
            supplier: Some("供应商A".to_string()),
            notes: None,
        };
        let json = serde_json::to_string(&ing).unwrap();
        let back: FormulaIngredient = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "原料X");
        assert_eq!(back.quantity, 25.5);
        assert!(back.notes.is_none());
    }

    #[test]
    fn test_create_formula_request_roundtrip() {
        let req = CreateFormulaRequest {
            name: "配方B".to_string(),
            code: "FM-002".to_string(),
            version: Some("2.0.0".to_string()),
            category: None,
            description: None,
            project_id: None,
            status: Some("draft".to_string()),
            ingredients: Some(vec![FormulaIngredient {
                name: "Y".to_string(),
                quantity: 5.0,
                unit: None,
                purity: None,
                supplier: None,
                notes: None,
            }]),
            process_steps: None,
            effective_date: None,
            expiration_date: None,
            properties: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateFormulaRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.ingredients.as_ref().unwrap().len(), 1);
    }

    #[test]
    fn test_formula_version_roundtrip() {
        let fv = FormulaVersion {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            formula_id: Uuid::nil(),
            version: "1.2.0".to_string(),
            ingredients: serde_json::json!([]),
            process_steps: Some("新步骤".to_string()),
            process_params: None,
            properties: serde_json::json!({}),
            changes: Some("调整配比".to_string()),
            approval_status: Some("approved".to_string()),
            approved_by: Some("管理员".to_string()),
            approved_at: Some(now()),
            created_by: "admin".to_string(),
            created_at: now(),
            updated_at: now(),
        };
        let json = serde_json::to_string(&fv).unwrap();
        let back: FormulaVersion = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.version, "1.2.0");
    }

    #[test]
    fn test_update_formula_request_all_none_roundtrip() {
        let req = UpdateFormulaRequest {
            name: None,
            category: None,
            description: None,
            status: None,
            approval_status: None,
            ingredients: None,
            process_steps: None,
            effective_date: None,
            expiration_date: None,
            properties: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateFormulaRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }

    #[test]
    fn test_approve_formula_request_empty_roundtrip() {
        let req = ApproveFormulaRequest {};
        let json = serde_json::to_string(&req).unwrap();
        let back: ApproveFormulaRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }

    #[test]
    fn test_create_formula_version_request_roundtrip() {
        let req = CreateFormulaVersionRequest {
            version: "2.1.0".to_string(),
            changes: "新增原料".to_string(),
            ingredients: None,
            process_steps: Some("步骤A".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateFormulaVersionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.version, "2.1.0");
        assert!(back.ingredients.is_none());
    }
}
