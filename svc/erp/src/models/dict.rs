use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DictType {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDictTypeRequest {
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateDictTypeRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DictItem {
    pub id: Uuid,
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: i32,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDictItemRequest {
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateDictItemRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json::json;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    #[test]
    fn test_dict_type_serde_roundtrip() {
        let dt = DictType {
            id: sample_uuid(),
            code: "gender".into(),
            name: "性别".into(),
            category: "personnel".into(),
            description: Some("员工性别字典".into()),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&dt).unwrap();
        let dt2: DictType = serde_json::from_value(json).unwrap();
        assert_eq!(dt.id, dt2.id);
        assert_eq!(dt.code, dt2.code);
        assert_eq!(dt.name, dt2.name);
        assert_eq!(dt.category, dt2.category);
        assert_eq!(dt.description, dt2.description);
        assert_eq!(dt.status, dt2.status);
    }

    #[test]
    fn test_dict_type_clone() {
        let dt = DictType {
            id: sample_uuid(),
            code: "c".into(),
            name: "n".into(),
            category: "cat".into(),
            description: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let dt2 = dt.clone();
        assert_eq!(dt.id, dt2.id);
    }

    #[test]
    fn test_dict_type_without_optional_description() {
        let dt = DictType {
            id: sample_uuid(),
            code: "c".into(),
            name: "n".into(),
            category: "cat".into(),
            description: None,
            status: "inactive".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&dt).unwrap();
        let dt2: DictType = serde_json::from_str(&s).unwrap();
        assert!(dt2.description.is_none());
    }

    #[test]
    fn test_create_dict_type_request_serde() {
        let req = CreateDictTypeRequest {
            code: "status".into(),
            name: "状态".into(),
            category: "common".into(),
            description: Some("通用状态".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: CreateDictTypeRequest = serde_json::from_value(v).unwrap();
        assert_eq!(req.code, req2.code);
        assert_eq!(req.name, req2.name);
        assert_eq!(req.category, req2.category);
        assert_eq!(req.description, req2.description);
    }

    #[test]
    fn test_create_dict_type_request_no_description() {
        let req = CreateDictTypeRequest {
            code: "a".into(),
            name: "b".into(),
            category: "c".into(),
            description: None,
        };
        let s = serde_json::to_string(&req).unwrap();
        let req2: CreateDictTypeRequest = serde_json::from_str(&s).unwrap();
        assert!(req2.description.is_none());
    }

    #[test]
    fn test_update_dict_type_request_all_none() {
        let req = UpdateDictTypeRequest {
            name: None,
            category: None,
            description: None,
            status: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: UpdateDictTypeRequest = serde_json::from_value(v).unwrap();
        assert!(req2.name.is_none());
        assert!(req2.category.is_none());
        assert!(req2.description.is_none());
        assert!(req2.status.is_none());
    }

    #[test]
    fn test_update_dict_type_request_all_some() {
        let req = UpdateDictTypeRequest {
            name: Some("新名称".into()),
            category: Some("新分类".into()),
            description: Some("新描述".into()),
            status: Some("inactive".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: UpdateDictTypeRequest = serde_json::from_value(v).unwrap();
        assert_eq!(req2.name, Some("新名称".into()));
        assert_eq!(req2.category, Some("新分类".into()));
        assert_eq!(req2.description, Some("新描述".into()));
        assert_eq!(req2.status, Some("inactive".into()));
    }

    #[test]
    fn test_dict_item_serde_roundtrip() {
        let di = DictItem {
            id: sample_uuid(),
            dict_type_id: sample_uuid(),
            code: "male".into(),
            name: "男".into(),
            value: Some("M".into()),
            sort_order: 1,
            parent_id: None,
            extra_data: Some(json!({"key": "value"})),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&di).unwrap();
        let di2: DictItem = serde_json::from_value(v).unwrap();
        assert_eq!(di.id, di2.id);
        assert_eq!(di.dict_type_id, di2.dict_type_id);
        assert_eq!(di.code, di2.code);
        assert_eq!(di.name, di2.name);
        assert_eq!(di.value, di2.value);
        assert_eq!(di.sort_order, di2.sort_order);
        assert_eq!(di.extra_data, di2.extra_data);
    }

    #[test]
    fn test_dict_item_with_parent() {
        let parent = Uuid::parse_str("660e8400-e29b-41d4-a716-446655440001").unwrap();
        let di = DictItem {
            id: sample_uuid(),
            dict_type_id: sample_uuid(),
            code: "sub".into(),
            name: "子项".into(),
            value: None,
            sort_order: -5,
            parent_id: Some(parent),
            extra_data: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&di).unwrap();
        let di2: DictItem = serde_json::from_str(&s).unwrap();
        assert_eq!(di2.parent_id, Some(parent));
        assert_eq!(di2.sort_order, -5);
    }

    #[test]
    fn test_create_dict_item_request_full() {
        let req = CreateDictItemRequest {
            dict_type_id: sample_uuid(),
            code: "M".into(),
            name: "男".into(),
            value: Some("1".into()),
            sort_order: Some(10),
            parent_id: Some(sample_uuid()),
            extra_data: Some(json!({"color": "red"})),
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: CreateDictItemRequest = serde_json::from_value(v).unwrap();
        assert_eq!(req.code, req2.code);
        assert_eq!(req.sort_order, Some(10));
        assert_eq!(req.extra_data, Some(json!({"color": "red"})));
    }

    #[test]
    fn test_create_dict_item_request_minimal() {
        let req = CreateDictItemRequest {
            dict_type_id: sample_uuid(),
            code: "x".into(),
            name: "y".into(),
            value: None,
            sort_order: None,
            parent_id: None,
            extra_data: None,
        };
        let s = serde_json::to_string(&req).unwrap();
        let req2: CreateDictItemRequest = serde_json::from_str(&s).unwrap();
        assert!(req2.value.is_none());
        assert!(req2.sort_order.is_none());
        assert!(req2.parent_id.is_none());
    }

    #[test]
    fn test_update_dict_item_request_mixed() {
        let req = UpdateDictItemRequest {
            code: Some("new_code".into()),
            name: None,
            value: Some("new_val".into()),
            sort_order: None,
            parent_id: Some(sample_uuid()),
            extra_data: None,
            status: Some("inactive".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: UpdateDictItemRequest = serde_json::from_value(v).unwrap();
        assert_eq!(req2.code, Some("new_code".into()));
        assert!(req2.name.is_none());
        assert_eq!(req2.status, Some("inactive".into()));
    }

    #[test]
    fn test_dict_item_large_sort_order() {
        let di = DictItem {
            id: sample_uuid(),
            dict_type_id: sample_uuid(),
            code: "x".into(),
            name: "y".into(),
            value: None,
            sort_order: i32::MAX,
            parent_id: None,
            extra_data: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&di).unwrap();
        let di2: DictItem = serde_json::from_str(&s).unwrap();
        assert_eq!(di2.sort_order, i32::MAX);
    }

    #[test]
    fn test_dict_item_negative_sort_order() {
        let di = DictItem {
            id: sample_uuid(),
            dict_type_id: sample_uuid(),
            code: "x".into(),
            name: "y".into(),
            value: None,
            sort_order: i32::MIN,
            parent_id: None,
            extra_data: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&di).unwrap();
        let di2: DictItem = serde_json::from_str(&s).unwrap();
        assert_eq!(di2.sort_order, i32::MIN);
    }
}
