use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct CustomerScore {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub score: i32,
    pub score_level: String,
    pub scoring_date: DateTime<Utc>,
    pub factors: serde_json::Value,
    pub trend: String,
    pub last_score: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateCustomerScoreRequest {
    pub customer_id: Uuid,
    pub score: Option<i32>,
    pub score_level: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateCustomerScoreRequest {
    pub score: Option<i32>,
    pub score_level: Option<String>,
    pub factors: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScoreFactor {
    pub name: String,
    pub weight: i32,
    pub score: i32,
    pub max_score: i32,
}

#[derive(Debug, Deserialize)]
pub struct CustomerScoringQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub customer_id: Option<Uuid>,
    pub score_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchCalculateRequest {
    pub customer_ids: Vec<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(value: &T) {
        let json = serde_json::to_value(value).expect("serialize to Value");
        let restored: T = serde_json::from_value(json.clone()).expect("deserialize from Value");
        let json2 = serde_json::to_value(&restored).expect("re-serialize");
        assert_eq!(json, json2);
    }

    #[test]
    fn customer_score_roundtrip_some_last() {
        let r = CustomerScore {
            id: uid(),
            tenant_id: uid(),
            customer_id: uid(),
            customer_name: "ACME".into(),
            score: 85,
            score_level: "A".into(),
            scoring_date: now(),
            factors: serde_json::json!({"payment": 30, "engagement": 25}),
            trend: "up".into(),
            last_score: Some(78),
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&r);
    }

    #[test]
    fn customer_score_roundtrip_none_last() {
        let r = CustomerScore {
            id: uid(),
            tenant_id: uid(),
            customer_id: uid(),
            customer_name: "Beta".into(),
            score: 60,
            score_level: "C".into(),
            scoring_date: now(),
            factors: serde_json::Value::Object(serde_json::Map::new()),
            trend: "new".into(),
            last_score: None,
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_customer_score_request_roundtrip_full() {
        let r = CreateCustomerScoreRequest {
            customer_id: uid(),
            score: Some(90),
            score_level: Some("A".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_customer_score_request_roundtrip_none() {
        let r = CreateCustomerScoreRequest {
            customer_id: uid(),
            score: None,
            score_level: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn update_customer_score_request_roundtrip_full() {
        let r = UpdateCustomerScoreRequest {
            score: Some(88),
            score_level: Some("A".into()),
            factors: Some(serde_json::json!({"growth": 40})),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_customer_score_request_roundtrip_none() {
        let r = UpdateCustomerScoreRequest {
            score: None,
            score_level: None,
            factors: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn score_factor_roundtrip() {
        let r = ScoreFactor {
            name: "payment".into(),
            weight: 30,
            score: 28,
            max_score: 30,
        };
        roundtrip(&r);
    }

    #[test]
    fn customer_scoring_query_params_deserialize() {
        let json = r#"{
            "page": 1,
            "page_size": 20,
            "customer_id": null,
            "score_level": "A"
        }"#;
        let q: CustomerScoringQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert!(q.customer_id.is_none());
        assert_eq!(q.score_level.as_deref(), Some("A"));
    }

    #[test]
    fn batch_calculate_request_deserialize() {
        let id = uid().to_string();
        let json = format!(r#"{{"customer_ids": ["{}"]}}"#, id);
        let r: BatchCalculateRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(r.customer_ids.len(), 1);
    }
}
