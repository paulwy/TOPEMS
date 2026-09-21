use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Warehouse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateWarehouseRequest {
    pub name: String,
    pub warehouse_name_en: Option<String>,
    pub code: Option<String>,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateWarehouseRequest {
    pub name: Option<String>,
    pub warehouse_name_en: Option<String>,
    pub code: Option<String>,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_warehouse() -> Warehouse {
        Warehouse {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Main WH".into(),
            code: Some("WH-001".into()),
            address: Some("123 St".into()),
            manager: Some("Alice".into()),
            phone: Some("555-0100".into()),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn warehouse_serde_roundtrip() {
        let w = sample_warehouse();
        let v = serde_json::to_value(&w).unwrap();
        let back: Warehouse = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn warehouse_serde_with_none_fields() {
        let w = Warehouse {
            code: None,
            address: None,
            manager: None,
            phone: None,
            ..sample_warehouse()
        };
        let v = serde_json::to_value(&w).unwrap();
        let back: Warehouse = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.code.is_none());
        assert!(back.manager.is_none());
    }

    #[test]
    fn warehouse_clone_preserves_name_and_status() {
        let w = sample_warehouse();
        let c = w.clone();
        assert_eq!(w.name, c.name);
        assert_eq!(w.status, c.status);
    }

    #[test]
    fn create_warehouse_request_serde_roundtrip() {
        let req = CreateWarehouseRequest {
            name: "WH-2".into(),
            warehouse_name_en: None,
            code: Some("WH-002".into()),
            address: Some("456 Ave".into()),
            manager: Some("Bob".into()),
            phone: Some("555-0200".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateWarehouseRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_warehouse_request_minimal_fields() {
        let req = CreateWarehouseRequest {
            name: "Bare WH".into(),
            warehouse_name_en: None,
            code: None,
            address: None,
            manager: None,
            phone: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateWarehouseRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.name, "Bare WH");
        assert!(back.code.is_none());
    }

    #[test]
    fn update_warehouse_request_all_none() {
        let req = UpdateWarehouseRequest {
            name: None,
            warehouse_name_en: None,
            code: None,
            address: None,
            manager: None,
            phone: None,
            status: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateWarehouseRequest = serde_json::from_value(v).unwrap();
        assert!(back.name.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn update_warehouse_request_partial() {
        let req = UpdateWarehouseRequest {
            name: Some("Updated".into()),
            warehouse_name_en: None,
            code: None,
            address: None,
            manager: Some("Charlie".into()),
            phone: None,
            status: Some("inactive".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateWarehouseRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn warehouse_json_contains_id_and_tenant_id() {
        let w = sample_warehouse();
        let v = serde_json::to_value(&w).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("id"));
        assert!(obj.contains_key("tenant_id"));
        assert!(obj.contains_key("name"));
    }

    // ===================== 扩展覆盖：Debug / 边界 / 极端值 =====================

    #[test]
    fn warehouse_debug_format_contains_name() {
        let w = sample_warehouse();
        let s = format!("{:?}", w);
        assert!(s.contains("Main WH"));
        assert!(s.contains("WH-001"));
        assert!(s.contains("active"));
    }

    #[test]
    fn warehouse_with_unicode_name_roundtrip() {
        let w = Warehouse {
            name: "北京中心仓".into(),
            code: Some("WH-中文".into()),
            address: Some("北京市朝阳区".into()),
            manager: Some("张三".into()),
            ..sample_warehouse()
        };
        let v = serde_json::to_value(&w).unwrap();
        let back: Warehouse = serde_json::from_value(v).unwrap();
        assert_eq!(back.name, "北京中心仓");
        assert_eq!(back.code.as_deref(), Some("WH-中文"));
        assert_eq!(back.manager.as_deref(), Some("张三"));
    }

    #[test]
    fn warehouse_with_empty_name_still_serializes() {
        // name 是 String，空串也能序列化（语义校验由上层负责）
        let w = Warehouse {
            name: String::new(),
            ..sample_warehouse()
        };
        let v = serde_json::to_value(&w).unwrap();
        let back: Warehouse = serde_json::from_value(v).unwrap();
        assert_eq!(back.name, "");
    }
}
