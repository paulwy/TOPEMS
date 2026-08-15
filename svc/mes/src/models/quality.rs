#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateQualityInspectionRequest {
    pub work_report_id: Uuid,
    pub inspector_id: Uuid,
    pub inspector_name: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct QualityInspectionResponse {
    pub id: Uuid,
    pub work_report_id: Uuid,
    pub inspector_id: Uuid,
    pub inspector_name: String,
    pub result: String,
    pub defect_type: Option<String>,
    pub defect_description: Option<String>,
    pub concession_approval_id: Option<Uuid>,
    pub risk_assessment: Option<String>,
    pub customer_notified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TraceabilityRecordResponse {
    pub id: Uuid,
    pub batch_id: Uuid,
    pub lot_code: String,
    pub source_id: Option<Uuid>,
    pub status: String,
    pub freeze_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;
    use serde::Serialize;
    use uuid::Uuid;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(val: &T) {
        let s1 = serde_json::to_string(val).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&s1).unwrap();
        let val2: T = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&val2).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&s2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_create_quality_inspection_request_roundtrip() {
        let r = CreateQualityInspectionRequest {
            work_report_id: uid(),
            inspector_id: uid(),
            inspector_name: "李检验".to_string(),
        };
        roundtrip(&r);
    }
}
