//! Quality Cost DTOs

use bigdecimal::BigDecimal;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QualityCostQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub cost_category: Option<String>,
    pub department: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct QualityCost {
    pub id: String,
    pub tenant_id: String,
    pub cost_no: String,
    pub cost_category: String,
    pub cost_type: Option<String>,
    pub amount: BigDecimal,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListQualityCostsResponse {
    pub costs: Vec<QualityCost>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateQualityCostRequest {
    pub cost_category: String,
    pub cost_type: Option<String>,
    pub amount: BigDecimal,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateQualityCostRequest {
    pub cost_category: Option<String>,
    pub cost_type: Option<String>,
    pub amount: Option<BigDecimal>,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostCategorySummary {
    pub category: String,
    pub total_amount: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostTrendItem {
    pub period: String,
    pub prevention: f64,
    pub appraisal: f64,
    pub internal_failure: f64,
    pub external_failure: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostDepartmentSummary {
    pub department: String,
    pub total_amount: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QualityCostStatistics {
    pub total_cost: f64,
    pub category_summary: Vec<CostCategorySummary>,
    pub department_summary: Vec<CostDepartmentSummary>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_quality_cost_query() {
        roundtrip(&QualityCostQuery {
            page: Some(1),
            page_size: Some(10),
            cost_category: None,
            department: None,
            start_date: None,
            end_date: None,
        });
    }

    #[test]
    fn test_quality_cost() {
        roundtrip(&QualityCost {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            cost_no: "QC001".to_string(),
            cost_category: "prevention".to_string(),
            cost_type: None,
            amount: BigDecimal::from(0),
            department: None,
            description: None,
            related_issue_id: None,
            incurred_date: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_list_quality_costs_response() {
        roundtrip(&ListQualityCostsResponse {
            costs: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        });
    }

    #[test]
    fn test_create_quality_cost_request() {
        roundtrip(&CreateQualityCostRequest {
            cost_category: "prevention".to_string(),
            cost_type: None,
            amount: BigDecimal::from(0),
            department: None,
            description: None,
            related_issue_id: None,
            incurred_date: NaiveDate::from_ymd_opt(2025, 1, 1),
            created_by: None,
        });
    }

    #[test]
    fn test_update_quality_cost_request() {
        roundtrip(&UpdateQualityCostRequest {
            cost_category: None,
            cost_type: None,
            amount: None,
            department: None,
            description: None,
            related_issue_id: None,
            incurred_date: None,
        });
    }

    #[test]
    fn test_cost_category_summary() {
        roundtrip(&CostCategorySummary {
            category: "prevention".to_string(),
            total_amount: 0.0,
            count: 0,
            percentage: 0.0,
        });
    }

    #[test]
    fn test_cost_trend_item() {
        roundtrip(&CostTrendItem {
            period: "2025-Q1".to_string(),
            prevention: 0.0,
            appraisal: 0.0,
            internal_failure: 0.0,
            external_failure: 0.0,
            total: 0.0,
        });
    }

    #[test]
    fn test_cost_department_summary() {
        roundtrip(&CostDepartmentSummary {
            department: "d".to_string(),
            total_amount: 0.0,
            count: 0,
            percentage: 0.0,
        });
    }

    #[test]
    fn test_quality_cost_statistics() {
        roundtrip(&QualityCostStatistics {
            total_cost: 0.0,
            category_summary: vec![CostCategorySummary {
                category: "c".to_string(),
                total_amount: 0.0,
                count: 0,
                percentage: 0.0,
            }],
            department_summary: vec![],
        });
    }
}
