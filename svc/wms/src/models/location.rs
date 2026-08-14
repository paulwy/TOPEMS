use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Location {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub code: String,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub capacity: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateLocationRequest {
    pub warehouse_id: Option<Uuid>,
    pub code: String,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub capacity: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateLocationRequest {
    pub warehouse_id: Option<Uuid>,
    pub code: Option<String>,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub capacity: Option<f64>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_location() -> Location {
        Location {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            warehouse_id: Some(Uuid::new_v4()),
            code: "LOC-001".into(),
            name: Some("Aisle A".into()),
            r#type: Some("storage".into()),
            capacity: Some(1000.0),
            status: "available".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn location_serde_roundtrip() {
        let loc = sample_location();
        let v = serde_json::to_value(&loc).unwrap();
        let back: Location = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn location_serde_preserves_type_field() {
        let loc = sample_location();
        let v = serde_json::to_value(&loc).unwrap();
        // raw identifier r#type serializes as "type"
        assert!(v.get("type").is_some());
        assert_eq!(v["type"], serde_json::json!("storage"));
        let back: Location = serde_json::from_value(v).unwrap();
        assert_eq!(back.r#type.as_deref(), Some("storage"));
    }

    #[test]
    fn location_serde_with_none_fields() {
        let loc = Location {
            warehouse_id: None,
            name: None,
            r#type: None,
            capacity: None,
            ..sample_location()
        };
        let v = serde_json::to_value(&loc).unwrap();
        let back: Location = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.name.is_none());
        assert!(back.capacity.is_none());
    }

    #[test]
    fn location_clone_preserves_code_and_status() {
        let loc = sample_location();
        let c = loc.clone();
        assert_eq!(loc.code, c.code);
        assert_eq!(loc.status, c.status);
    }

    #[test]
    fn create_location_request_serde_roundtrip() {
        let req = CreateLocationRequest {
            warehouse_id: Some(Uuid::new_v4()),
            code: "LOC-NEW".into(),
            name: Some("New Aisle".into()),
            r#type: Some("picking".into()),
            capacity: Some(500.0),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateLocationRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_location_request_minimal() {
        let req = CreateLocationRequest {
            warehouse_id: None,
            code: "LOC-BARE".into(),
            name: None,
            r#type: None,
            capacity: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateLocationRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.code, "LOC-BARE");
        assert!(back.capacity.is_none());
    }

    #[test]
    fn update_location_request_all_none() {
        let req = UpdateLocationRequest {
            warehouse_id: None,
            code: None,
            name: None,
            r#type: None,
            capacity: None,
            status: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateLocationRequest = serde_json::from_value(v).unwrap();
        assert!(back.code.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn update_location_request_partial() {
        let req = UpdateLocationRequest {
            warehouse_id: Some(Uuid::new_v4()),
            code: Some("LOC-UPD".into()),
            name: None,
            r#type: Some("receiving".into()),
            capacity: None,
            status: Some("blocked".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateLocationRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn location_json_has_type_key() {
        let loc = sample_location();
        let v = serde_json::to_value(&loc).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("type"));
        assert!(obj.contains_key("code"));
        assert!(obj.contains_key("capacity"));
    }
}
