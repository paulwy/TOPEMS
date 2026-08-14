//! 退换货模型 - Return FSM 含 resolved_at

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Return {
    pub id: Uuid,
    pub return_no: String,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
    pub return_type: String,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reason_detail: Option<String>,
    pub status: String,
    pub refund_amount: Decimal,
    #[serde(default)]
    pub exchange_product_id: Option<Uuid>,
    pub received: bool,
    #[serde(default)]
    pub received_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub approved_by: Option<Uuid>,
    #[serde(default)]
    pub approved_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub resolved_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub created_by: Option<Uuid>,
    #[serde(default)]
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub ticket_id: Option<Uuid>,
    #[serde(default)]
    pub warehouse_id: Option<Uuid>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Return {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            return_no: String::new(),
            tenant_id: Uuid::nil(),
            customer_id: None,
            order_id: None,
            return_type: "return".into(),
            reason: None,
            reason_detail: None,
            status: "pending".into(),
            refund_amount: Decimal::ZERO,
            exchange_product_id: None,
            received: false,
            received_at: None,
            approved_by: None,
            approved_at: None,
            completed_at: None,
            resolved_at: None,
            created_by: None,
            updated_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            ticket_id: None,
            warehouse_id: None,
            deleted_at: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ReturnItem {
    pub id: Uuid,
    pub return_id: Uuid,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub product_id: Option<Uuid>,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub total_amount: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateReturnRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
    #[serde(default)]
    pub return_type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reason_detail: Option<String>,
    #[serde(default)]
    pub exchange_product_id: Option<Uuid>,
    #[serde(default)]
    pub ticket_id: Option<Uuid>,
    #[serde(default)]
    pub warehouse_id: Option<Uuid>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateReturnRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
    #[serde(default)]
    pub return_type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reason_detail: Option<String>,
    #[serde(default)]
    pub exchange_product_id: Option<Uuid>,
    #[serde(default)]
    pub ticket_id: Option<Uuid>,
    #[serde(default)]
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReturnQuery {
    #[serde(default)]
    pub page: Option<i64>,
    #[serde(default)]
    pub page_size: Option<i64>,
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub return_type: Option<String>,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct ReturnActionRequest {
    #[serde(default)]
    pub comment: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub process_type: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateReturnItemRequest {
    #[serde(default)]
    pub product_id: Option<Uuid>,
    pub quantity: i32,
    pub unit_price: Decimal,
}

impl Default for CreateReturnRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            order_id: None,
            return_type: Some("return".into()),
            reason: None,
            reason_detail: None,
            exchange_product_id: None,
            ticket_id: None,
            warehouse_id: None,
        }
    }
}

impl Default for UpdateReturnRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            order_id: None,
            return_type: None,
            reason: None,
            reason_detail: None,
            exchange_product_id: None,
            ticket_id: None,
            warehouse_id: None,
        }
    }
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
    fn return_roundtrip_full() {
        let r = Return {
            id: uid(),
            return_no: "RET-001".into(),
            tenant_id: uid(),
            customer_id: Some(uid()),
            order_id: Some(uid()),
            return_type: "return".into(),
            reason: Some("质量问题".into()),
            reason_detail: Some("产品存在瑕疵".into()),
            status: "completed".into(),
            refund_amount: Decimal::from(500),
            exchange_product_id: Some(uid()),
            received: true,
            received_at: Some(now()),
            approved_by: Some(uid()),
            approved_at: Some(now()),
            completed_at: Some(now()),
            resolved_at: Some(now()),
            created_by: Some(uid()),
            updated_by: Some(uid()),
            created_at: now(),
            updated_at: now(),
            ticket_id: Some(uid()),
            warehouse_id: Some(uid()),
            deleted_at: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn return_roundtrip_minimal() {
        let r = Return::default();
        roundtrip(&r);
    }

    #[test]
    fn return_item_roundtrip_some_product() {
        let r = ReturnItem {
            id: uid(),
            return_id: uid(),
            tenant_id: uid(),
            product_id: Some(uid()),
            quantity: 1,
            unit_price: Decimal::from(100),
            total_amount: Decimal::from(100),
            created_at: now(),
        };
        roundtrip(&r);
    }

    #[test]
    fn return_item_roundtrip_none_product() {
        let r = ReturnItem {
            id: uid(),
            return_id: uid(),
            tenant_id: uid(),
            product_id: None,
            quantity: 1,
            unit_price: Decimal::from(100),
            total_amount: Decimal::from(100),
            created_at: now(),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_return_request_roundtrip_full() {
        let r = CreateReturnRequest {
            customer_id: Some(uid()),
            order_id: Some(uid()),
            return_type: Some("exchange".into()),
            reason: Some("尺寸不合适".into()),
            reason_detail: Some("S 换 M".into()),
            exchange_product_id: Some(uid()),
            ticket_id: Some(uid()),
            warehouse_id: Some(uid()),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_return_request_roundtrip_minimal() {
        let r = CreateReturnRequest::default();
        roundtrip(&r);
    }

    #[test]
    fn update_return_request_roundtrip_full() {
        let r = UpdateReturnRequest {
            customer_id: Some(uid()),
            order_id: Some(uid()),
            return_type: Some("return".into()),
            reason: Some("不想要了".into()),
            reason_detail: Some("七天无理由".into()),
            exchange_product_id: None,
            ticket_id: Some(uid()),
            warehouse_id: Some(uid()),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_return_request_roundtrip_none() {
        let r = UpdateReturnRequest::default();
        roundtrip(&r);
    }

    #[test]
    fn return_action_request_roundtrip_full() {
        let r = ReturnActionRequest {
            comment: Some("已审批".into()),
            reason: Some("符合政策".into()),
            process_type: Some("approve".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn return_action_request_roundtrip_none() {
        let r = ReturnActionRequest {
            comment: None,
            reason: None,
            process_type: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn create_return_item_request_roundtrip_some_product() {
        let r = CreateReturnItemRequest {
            product_id: Some(uid()),
            quantity: 2,
            unit_price: Decimal::from(80),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_return_item_request_roundtrip_none_product() {
        let r = CreateReturnItemRequest {
            product_id: None,
            quantity: 1,
            unit_price: Decimal::from(120),
        };
        roundtrip(&r);
    }

    #[test]
    fn return_query_deserialize() {
        let json = r#"{
            "page": 1,
            "page_size": 10,
            "search": "RET-001",
            "status": "pending",
            "return_type": "return",
            "customer_id": null,
            "order_id": null
        }"#;
        let q: ReturnQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(10));
        assert_eq!(q.search.as_deref(), Some("RET-001"));
        assert_eq!(q.status.as_deref(), Some("pending"));
    }
}
