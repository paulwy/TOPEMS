use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Tag {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct CustomerTag {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Uuid,
    pub tag_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTagRequest {
    pub name: String,
    pub name_en: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateTagRequest {
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AddTagToCustomerRequest {
    pub customer_id: Uuid,
    pub tag_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CustomerWithTags {
    pub customer_id: Uuid,
    pub customer_name: String,
    pub tags: Vec<Tag>,
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

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    #[test]
    fn rt_tag() {
        roundtrip(&Tag {
            id: uid(),
            tenant_id: uid(),
            name: "VIP客户".into(),
            color: "#FF0000".into(),
            description: Some("高价值".into()),
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_tag_no_desc() {
        roundtrip(&Tag {
            id: uid(),
            tenant_id: uid(),
            name: "潜在".into(),
            color: "#00FF00".into(),
            description: None,
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_customer_tag() {
        roundtrip(&CustomerTag {
            id: uid(),
            tenant_id: uid(),
            customer_id: uid(),
            tag_id: uid(),
            created_at: now(),
        });
    }
    #[test]
    fn rt_create_tag_request_with_color() {
        roundtrip(&CreateTagRequest {
            name: "新标签".into(),
            name_en: None,
            color: Some("#123456".into()),
            description: None,
        });
    }
    #[test]
    fn rt_create_tag_request_minimal() {
        roundtrip(&CreateTagRequest {
            name: "极简".into(),
            name_en: None,
            color: None,
            description: None,
        });
    }
    #[test]
    fn rt_update_tag_request_full() {
        roundtrip(&UpdateTagRequest {
            name: Some("改名".into()),
            name_en: None,
            color: Some("#ABC".into()),
            description: Some("新描述".into()),
        });
    }
    #[test]
    fn rt_update_tag_request_none() {
        roundtrip(&UpdateTagRequest {
            name: None,
            name_en: None,
            color: None,
            description: None,
        });
    }
    #[test]
    fn rt_add_tag_to_customer_request() {
        roundtrip(&AddTagToCustomerRequest {
            customer_id: uid(),
            tag_id: uid(),
        });
    }
    #[test]
    fn rt_customer_with_tags() {
        roundtrip(&CustomerWithTags {
            customer_id: uid(),
            customer_name: "ABC公司".into(),
            tags: vec![
                Tag {
                    id: uid(),
                    tenant_id: uid(),
                    name: "VIP".into(),
                    color: "#F00".into(),
                    description: None,
                    created_at: now(),
                    updated_at: now(),
                },
                Tag {
                    id: uid(),
                    tenant_id: uid(),
                    name: "重点".into(),
                    color: "#0F0".into(),
                    description: None,
                    created_at: now(),
                    updated_at: now(),
                },
            ],
        });
    }
}
