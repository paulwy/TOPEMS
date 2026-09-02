#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AnomalyRecordResponse {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub severity: String,
    pub status: String,
    pub description: String,
    pub impact_duration_minutes: i32,
    pub handling_approval_id: Option<Uuid>,
    pub impact_assessment: Option<String>,
    pub mitigation_plan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> AnomalyRecordResponse {
        AnomalyRecordResponse {
            id: Uuid::new_v4(),
            equipment_id: Uuid::new_v4(),
            severity: "critical".to_string(),
            status: "open".to_string(),
            description: "设备过热".to_string(),
            impact_duration_minutes: 30,
            handling_approval_id: Some(Uuid::new_v4()),
            impact_assessment: Some("停线 30 分钟".to_string()),
            mitigation_plan: Some("降温检修".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn anomaly_response_serializes() {
        let json = serde_json::to_string(&sample()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["severity"], "critical");
        assert_eq!(v["status"], "open");
        assert_eq!(v["impact_duration_minutes"], 30);
        assert!(v["description"].is_string());
        assert!(v["created_at"].is_string());
    }

    #[test]
    fn anomaly_response_optional_fields_serialize() {
        let json = serde_json::to_string(&sample()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(v["handling_approval_id"].is_string());
        assert!(v["impact_assessment"].is_string());
    }

    #[test]
    fn anomaly_response_none_option_serializes_null() {
        let mut a = sample();
        a.handling_approval_id = None;
        a.impact_assessment = None;
        a.mitigation_plan = None;
        let json = serde_json::to_string(&a).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(v["handling_approval_id"].is_null());
        assert!(v["impact_assessment"].is_null());
        assert!(v["mitigation_plan"].is_null());
    }
}
