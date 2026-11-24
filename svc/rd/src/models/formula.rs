use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// 配方业务状态（DB 契约固定小写英文）。
///
/// 历史后端创建路径写入中文 `草稿`，评审通过写入 `released`，与前端
/// `draft/testing/approved` 词表不一致；本枚举统一为 DB 可约束的四态。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormulaStatus {
    Draft,
    Testing,
    Approved,
    Archived,
}

impl FormulaStatus {
    pub const DB_VALUES: [&'static str; 4] = ["draft", "testing", "approved", "archived"];
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Testing => "testing",
            Self::Approved => "approved",
            Self::Archived => "archived",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "draft" => Some(Self::Draft),
            "testing" => Some(Self::Testing),
            "approved" => Some(Self::Approved),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    /// 兼容历史中文值与旧 `released` 值；未知值返回 None，由调用方 fail-closed。
    #[must_use]
    pub fn normalize(raw: &str) -> Option<Self> {
        match raw.trim().to_lowercase().as_str() {
            "draft" | "草稿" => Some(Self::Draft),
            "testing" | "测试中" | "待测试" => Some(Self::Testing),
            "approved" | "released" | "已批准" | "已发布" => Some(Self::Approved),
            "archived" | "已归档" => Some(Self::Archived),
            _ => None,
        }
    }

    /// 业务流转：草稿可测试/批准/归档，测试中可回草稿或批准/归档，
    /// 已批准仅可归档，归档为终态；同值幂等。
    #[must_use]
    pub const fn can_transition_to(self, target: Self) -> bool {
        matches!(
            (self, target),
            (
                Self::Draft,
                Self::Draft | Self::Testing | Self::Approved | Self::Archived
            ) | (
                Self::Testing,
                Self::Draft | Self::Testing | Self::Approved | Self::Archived
            ) | (Self::Approved, Self::Approved | Self::Archived)
                | (Self::Archived, Self::Archived)
        )
    }
}

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
    pub effective_date: Option<DateTime<Utc>>,
    pub expiration_date: Option<DateTime<Utc>>,
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
    pub effective_date: Option<DateTime<Utc>>,
    pub expiration_date: Option<DateTime<Utc>>,
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
pub struct ReviewFormulaRequest {
    /// 评审动作：submit（提交评审）/ approve（通过）/ reject（驳回）
    pub action: String,
    /// 评审人。缺省时后端回退为 "system"
    pub reviewer: Option<String>,
    /// 评审意见，仅写入审计日志（rs.formulas 无意见列，本批不新增）
    pub comment: Option<String>,
}

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
    fn test_review_formula_request_roundtrip() {
        let req = ReviewFormulaRequest {
            action: "approve".to_string(),
            reviewer: Some("张三".to_string()),
            comment: Some("配方评审通过".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ReviewFormulaRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.action, "approve");
        assert_eq!(back.reviewer.as_deref(), Some("张三"));
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

    #[test]
    fn formula_status_db_contract_and_legacy_values() {
        assert_eq!(
            FormulaStatus::DB_VALUES,
            ["draft", "testing", "approved", "archived"]
        );
        assert_eq!(FormulaStatus::DEFAULT.as_db_str(), "draft");
        for value in FormulaStatus::DB_VALUES {
            let parsed = FormulaStatus::from_db_str(value).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), value);
        }
        assert_eq!(FormulaStatus::normalize("草稿"), Some(FormulaStatus::Draft));
        assert_eq!(
            FormulaStatus::normalize("测试中"),
            Some(FormulaStatus::Testing)
        );
        assert_eq!(
            FormulaStatus::normalize("released"),
            Some(FormulaStatus::Approved)
        );
        assert_eq!(
            FormulaStatus::normalize("已批准"),
            Some(FormulaStatus::Approved)
        );
        assert_eq!(FormulaStatus::normalize("unknown"), None);
    }

    #[test]
    fn formula_status_transitions_guard_rollback() {
        assert!(FormulaStatus::Draft.can_transition_to(FormulaStatus::Testing));
        assert!(FormulaStatus::Draft.can_transition_to(FormulaStatus::Approved));
        assert!(FormulaStatus::Testing.can_transition_to(FormulaStatus::Draft));
        assert!(FormulaStatus::Approved.can_transition_to(FormulaStatus::Archived));
        assert!(!FormulaStatus::Approved.can_transition_to(FormulaStatus::Draft));
        assert!(!FormulaStatus::Archived.can_transition_to(FormulaStatus::Approved));
        assert!(FormulaStatus::Draft.can_transition_to(FormulaStatus::Draft));
    }
}
