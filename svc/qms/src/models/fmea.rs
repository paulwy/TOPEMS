//! FMEA (Failure Mode and Effects Analysis) DTOs

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FmeaQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub product_id: Option<String>,
    pub process_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FmeaAnalysis {
    pub id: String,
    pub tenant_id: String,
    pub fmea_no: String,
    pub title: String,
    pub fmea_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub scope: Option<String>,
    pub status: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateFmeaRequest {
    pub title: String,
    pub fmea_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub scope: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateFmeaRequest {
    pub title: Option<String>,
    pub fmea_type: Option<String>,
    pub scope: Option<String>,
    pub status: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FmeaItem {
    pub id: String,
    pub tenant_id: String,
    pub fmea_id: String,
    pub component: String,
    pub function: Option<String>,
    pub failure_mode: String,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub rpn: Option<i32>,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub action_status: Option<String>,
    pub revised_severity: Option<i32>,
    pub revised_occurrence: Option<i32>,
    pub revised_detection: Option<i32>,
    pub revised_rpn: Option<i32>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FmeaItemQuery {
    pub fmea_id: Option<String>,
    pub min_rpn: Option<i64>,
    pub action_status: Option<String>,
    pub sort_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateFmeaItemRequest {
    pub fmea_id: String,
    pub component: String,
    pub function: Option<String>,
    pub failure_mode: String,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateFmeaItemRequest {
    pub component: Option<String>,
    pub function: Option<String>,
    pub failure_mode: Option<String>,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub action_status: Option<String>,
    pub revised_severity: Option<i32>,
    pub revised_occurrence: Option<i32>,
    pub revised_detection: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FmeaStatistics {
    pub total_items: i64,
    pub high_risk_count: i64,
    pub medium_risk_count: i64,
    pub low_risk_count: i64,
    pub average_rpn: f64,
    pub max_rpn: i64,
    pub min_rpn: i64,
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
    fn test_fmea_query() {
        roundtrip(&FmeaQuery {
            page: Some(1),
            page_size: Some(10),
            status: None,
            product_id: None,
            process_id: None,
        });
    }

    #[test]
    fn test_fmea_analysis() {
        roundtrip(&FmeaAnalysis {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            fmea_no: "F001".to_string(),
            title: "x".to_string(),
            fmea_type: "Design".to_string(),
            product_id: None,
            product_name: None,
            process_id: None,
            process_name: None,
            scope: None,
            status: None,
            revision: None,
            team: None,
            leader: None,
            description: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_fmea_request() {
        roundtrip(&CreateFmeaRequest {
            title: "x".to_string(),
            fmea_type: "Design".to_string(),
            product_id: None,
            product_name: None,
            process_id: None,
            process_name: None,
            scope: None,
            revision: None,
            team: None,
            leader: None,
            description: None,
            created_by: None,
        });
    }

    #[test]
    fn test_update_fmea_request() {
        roundtrip(&UpdateFmeaRequest {
            title: None,
            fmea_type: None,
            scope: None,
            status: None,
            revision: None,
            team: None,
            leader: None,
            description: None,
        });
    }

    #[test]
    fn test_fmea_item() {
        roundtrip(&FmeaItem {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            fmea_id: "f".to_string(),
            component: "c".to_string(),
            function: None,
            failure_mode: "fm".to_string(),
            failure_effect: None,
            failure_cause: None,
            severity: 1,
            occurrence: 1,
            detection: 1,
            rpn: None,
            current_controls: None,
            recommended_actions: None,
            responsible: None,
            target_date: None,
            action_status: None,
            revised_severity: None,
            revised_occurrence: None,
            revised_detection: None,
            revised_rpn: None,
            sort_order: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_fmea_item_query() {
        roundtrip(&FmeaItemQuery {
            fmea_id: None,
            min_rpn: None,
            action_status: None,
            sort_by: None,
        });
    }

    #[test]
    fn test_create_fmea_item_request() {
        roundtrip(&CreateFmeaItemRequest {
            fmea_id: "f".to_string(),
            component: "c".to_string(),
            function: None,
            failure_mode: "fm".to_string(),
            failure_effect: None,
            failure_cause: None,
            severity: 1,
            occurrence: 1,
            detection: 1,
            current_controls: None,
            recommended_actions: None,
            responsible: None,
            target_date: NaiveDate::from_ymd_opt(2025, 1, 1),
            sort_order: None,
        });
    }

    #[test]
    fn test_update_fmea_item_request() {
        roundtrip(&UpdateFmeaItemRequest {
            component: None,
            function: None,
            failure_mode: None,
            failure_effect: None,
            failure_cause: None,
            severity: None,
            occurrence: None,
            detection: None,
            current_controls: None,
            recommended_actions: None,
            responsible: None,
            target_date: None,
            action_status: None,
            revised_severity: None,
            revised_occurrence: None,
            revised_detection: None,
            sort_order: None,
        });
    }

    #[test]
    fn test_fmea_statistics() {
        roundtrip(&FmeaStatistics {
            total_items: 0,
            high_risk_count: 0,
            medium_risk_count: 0,
            low_risk_count: 0,
            average_rpn: 0.0,
            max_rpn: 0,
            min_rpn: 0,
        });
    }

    #[test]
    fn test_fmea_analysis_clone_and_debug() {
        let f = FmeaAnalysis {
            id: "f1".to_string(),
            tenant_id: "t1".to_string(),
            fmea_no: "FMEA-001".to_string(),
            title: "Design FMEA for X".to_string(),
            fmea_type: "Design".to_string(),
            product_id: Some("p1".to_string()),
            product_name: Some("Product X".to_string()),
            process_id: Some("pr1".to_string()),
            process_name: Some("Assembly".to_string()),
            scope: Some("scope desc".to_string()),
            status: Some("draft".to_string()),
            revision: Some("A".to_string()),
            team: Some("team 1".to_string()),
            leader: Some("l1".to_string()),
            description: Some("full desc".to_string()),
            created_by: Some("u1".to_string()),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let f2 = f.clone();
        assert_eq!(f.id, f2.id);
        assert_eq!(f.fmea_no, f2.fmea_no);
        assert_eq!(f.fmea_type, f2.fmea_type);
        assert_eq!(f.status, f2.status);
        assert!(!format!("{:?}", f).is_empty());
    }

    #[test]
    fn test_fmea_item_clone_and_rpn() {
        let item = FmeaItem {
            id: "item1".to_string(),
            tenant_id: "t1".to_string(),
            fmea_id: "f1".to_string(),
            component: "Bolt".to_string(),
            function: Some("fasten".to_string()),
            failure_mode: "loosens".to_string(),
            failure_effect: Some("joint fails".to_string()),
            failure_cause: Some("torque too low".to_string()),
            severity: 8,
            occurrence: 4,
            detection: 5,
            rpn: Some(160),
            current_controls: Some("torque wrench".to_string()),
            recommended_actions: Some("specify torque".to_string()),
            responsible: Some("eng A".to_string()),
            target_date: Some("2025-12-31".to_string()),
            action_status: Some("open".to_string()),
            revised_severity: Some(8),
            revised_occurrence: Some(2),
            revised_detection: Some(3),
            revised_rpn: Some(48),
            sort_order: Some(1),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let item2 = item.clone();
        assert_eq!(item.id, item2.id);
        assert_eq!(item.rpn, item2.rpn);
        assert_eq!(item.revised_rpn, item2.revised_rpn);
        assert!(!format!("{:?}", item).is_empty());
    }

    #[test]
    fn test_fmea_item_query_all_some() {
        roundtrip(&FmeaItemQuery {
            fmea_id: Some("f1".to_string()),
            min_rpn: Some(100),
            action_status: Some("in_progress".to_string()),
            sort_by: Some("rpn".to_string()),
        });
    }

    #[test]
    fn test_fmea_statistics_nonzero() {
        roundtrip(&FmeaStatistics {
            total_items: 50,
            high_risk_count: 5,
            medium_risk_count: 20,
            low_risk_count: 25,
            average_rpn: 82.5,
            max_rpn: 729,
            min_rpn: 1,
        });
    }
}
