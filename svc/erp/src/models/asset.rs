use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Asset {
    pub id: Uuid,
    pub asset_number: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    pub responsible_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // 设备专用字段
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub rated_power: Option<f64>,
    pub rated_voltage: Option<f64>,
    pub rated_current: Option<f64>,
    pub specifications: Option<Value>,
    pub image_url: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateAssetRequest {
    pub asset_number: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub responsible_id: Option<Uuid>,
    // 设备专用字段
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub rated_power: Option<f64>,
    pub rated_voltage: Option<f64>,
    pub rated_current: Option<f64>,
    pub specifications: Option<Value>,
    pub image_url: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateAssetRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub responsible_id: Option<Uuid>,
    pub status: Option<String>,
    // 设备专用字段
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub rated_power: Option<f64>,
    pub rated_voltage: Option<f64>,
    pub rated_current: Option<f64>,
    pub specifications: Option<Value>,
    pub image_url: Option<String>,
    pub department: Option<String>,
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
    fn test_asset_serde_roundtrip_full() {
        let a = Asset {
            id: sample_uuid(),
            asset_number: "AST-001".into(),
            name: "联想笔记本".into(),
            category: Some("电子设备".into()),
            brand: Some("联想".into()),
            model: Some("ThinkPad X1".into()),
            purchase_date: Some(Utc::now()),
            purchase_amount: Some(12999.99),
            location: Some("北京总部3楼".into()),
            responsible_id: Some(sample_uuid()),
            status: "in_use".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            serial_number: Some("SN123456".into()),
            manufacturer: Some("联想集团".into()),
            rated_power: Some(65.0),
            rated_voltage: Some(220.0),
            rated_current: Some(0.5),
            specifications: Some(json!({"cpu": "i7", "ram": "16GB"})),
            image_url: Some("https://img.example.com/a.jpg".into()),
            department: Some("技术部".into()),
        };
        let v = serde_json::to_value(&a).unwrap();
        let a2: Asset = serde_json::from_value(v).unwrap();
        assert_eq!(a.id, a2.id);
        assert_eq!(a.asset_number, a2.asset_number);
        assert_eq!(a.name, a2.name);
        assert_eq!(a.category, a2.category);
        assert_eq!(a.brand, a2.brand);
        assert_eq!(a.model, a2.model);
        assert_eq!(a.purchase_amount, a2.purchase_amount);
        assert_eq!(a.location, a2.location);
        assert_eq!(a.responsible_id, a2.responsible_id);
        assert_eq!(a.status, a2.status);
        assert_eq!(a.serial_number, a2.serial_number);
        assert_eq!(a.manufacturer, a2.manufacturer);
        assert_eq!(a.rated_power, a2.rated_power);
        assert_eq!(a.rated_voltage, a2.rated_voltage);
        assert_eq!(a.rated_current, a2.rated_current);
        assert_eq!(a.specifications, a2.specifications);
        assert_eq!(a.image_url, a2.image_url);
        assert_eq!(a.department, a2.department);
    }

    #[test]
    fn test_asset_minimal_all_optionals_none() {
        let a = Asset {
            id: sample_uuid(),
            asset_number: "AST-002".into(),
            name: "办公桌".into(),
            category: None,
            brand: None,
            model: None,
            purchase_date: None,
            purchase_amount: None,
            location: None,
            responsible_id: None,
            status: "idle".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            serial_number: None,
            manufacturer: None,
            rated_power: None,
            rated_voltage: None,
            rated_current: None,
            specifications: None,
            image_url: None,
            department: None,
        };
        let s = serde_json::to_string(&a).unwrap();
        let a2: Asset = serde_json::from_str(&s).unwrap();
        assert_eq!(a.asset_number, a2.asset_number);
        assert!(a2.category.is_none());
        assert!(a2.brand.is_none());
        assert!(a2.purchase_date.is_none());
        assert!(a2.purchase_amount.is_none());
        assert!(a2.responsible_id.is_none());
        assert!(a2.serial_number.is_none());
    }

    #[test]
    fn test_asset_clone() {
        let a = Asset {
            id: sample_uuid(),
            asset_number: "X".into(),
            name: "Y".into(),
            category: None,
            brand: None,
            model: None,
            purchase_date: None,
            purchase_amount: Some(0.0),
            location: None,
            responsible_id: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            serial_number: None,
            manufacturer: None,
            rated_power: None,
            rated_voltage: None,
            rated_current: None,
            specifications: None,
            image_url: None,
            department: None,
        };
        let a2 = a.clone();
        assert_eq!(a.id, a2.id);
        assert_eq!(a.name, a2.name);
    }

    #[test]
    fn test_asset_negative_purchase_amount() {
        let a = Asset {
            id: sample_uuid(),
            asset_number: "A".into(),
            name: "B".into(),
            category: None,
            brand: None,
            model: None,
            purchase_date: None,
            purchase_amount: Some(-500.0),
            location: None,
            responsible_id: None,
            status: "retired".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            serial_number: None,
            manufacturer: None,
            rated_power: None,
            rated_voltage: None,
            rated_current: None,
            specifications: None,
            image_url: None,
            department: None,
        };
        let s = serde_json::to_string(&a).unwrap();
        let a2: Asset = serde_json::from_str(&s).unwrap();
        assert_eq!(a2.purchase_amount, Some(-500.0));
    }

    #[test]
    fn test_asset_large_specifications_json() {
        let a = Asset {
            id: sample_uuid(),
            asset_number: "EQ-999".into(),
            name: "大型设备".into(),
            category: Some("机械".into()),
            brand: None,
            model: None,
            purchase_date: None,
            purchase_amount: Some(999999.99),
            location: None,
            responsible_id: None,
            status: "in_use".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            serial_number: None,
            manufacturer: None,
            rated_power: Some(10000.0),
            rated_voltage: Some(380.0),
            rated_current: Some(50.0),
            specifications: Some(json!({
                "parts": ["电机", "传送带", "控制器"],
                "warranty_years": 5,
                "maintenance": {
                    "interval_days": 90,
                    "last_date": "2025-01-01"
                }
            })),
            image_url: None,
            department: None,
        };
        let v = serde_json::to_value(&a).unwrap();
        let a2: Asset = serde_json::from_value(v).unwrap();
        let specs = a2.specifications.unwrap();
        assert_eq!(specs["parts"][0], "电机");
        assert_eq!(specs["warranty_years"], 5);
    }

    #[test]
    fn test_create_asset_request_full() {
        let req = CreateAssetRequest {
            asset_number: "NEW-001".into(),
            name: "新资产".into(),
            category: Some("IT".into()),
            brand: Some("Dell".into()),
            model: Some("XPS".into()),
            purchase_date: Some(Utc::now()),
            purchase_amount: Some(5000.0),
            location: Some("上海".into()),
            responsible_id: Some(sample_uuid()),
            serial_number: Some("SN777".into()),
            manufacturer: Some("戴尔".into()),
            rated_power: Some(100.0),
            rated_voltage: Some(220.0),
            rated_current: Some(0.8),
            specifications: Some(json!({"hdd": "1TB"})),
            image_url: Some("http://x.com/a.png".into()),
            department: Some("财务部".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: CreateAssetRequest = serde_json::from_value(v).unwrap();
        assert_eq!(req.asset_number, req2.asset_number);
        assert_eq!(req.responsible_id, req2.responsible_id);
        assert_eq!(req.department, req2.department);
    }

    #[test]
    fn test_create_asset_request_minimal() {
        let req = CreateAssetRequest {
            asset_number: "M-1".into(),
            name: "最小资产".into(),
            category: None,
            brand: None,
            model: None,
            purchase_date: None,
            purchase_amount: None,
            location: None,
            responsible_id: None,
            serial_number: None,
            manufacturer: None,
            rated_power: None,
            rated_voltage: None,
            rated_current: None,
            specifications: None,
            image_url: None,
            department: None,
        };
        let s = serde_json::to_string(&req).unwrap();
        let req2: CreateAssetRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(req2.asset_number, "M-1");
        assert!(req2.category.is_none());
    }

    #[test]
    fn test_update_asset_request_all_none() {
        let req = UpdateAssetRequest {
            name: None,
            category: None,
            brand: None,
            model: None,
            purchase_date: None,
            purchase_amount: None,
            location: None,
            responsible_id: None,
            status: None,
            serial_number: None,
            manufacturer: None,
            rated_power: None,
            rated_voltage: None,
            rated_current: None,
            specifications: None,
            image_url: None,
            department: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: UpdateAssetRequest = serde_json::from_value(v).unwrap();
        assert!(req2.name.is_none());
        assert!(req2.status.is_none());
    }

    #[test]
    fn test_update_asset_request_mixed() {
        let req = UpdateAssetRequest {
            name: Some("新名称".into()),
            category: None,
            brand: Some("新品牌".into()),
            model: None,
            purchase_date: None,
            purchase_amount: Some(100.0),
            location: None,
            responsible_id: Some(sample_uuid()),
            status: Some("in_repair".into()),
            serial_number: None,
            manufacturer: None,
            rated_power: None,
            rated_voltage: None,
            rated_current: None,
            specifications: None,
            image_url: Some("http://new.img".into()),
            department: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let req2: UpdateAssetRequest = serde_json::from_value(v).unwrap();
        assert_eq!(req2.name, Some("新名称".into()));
        assert_eq!(req2.brand, Some("新品牌".into()));
        assert_eq!(req2.purchase_amount, Some(100.0));
        assert_eq!(req2.responsible_id, Some(sample_uuid()));
        assert_eq!(req2.status, Some("in_repair".into()));
    }

    #[test]
    fn test_create_asset_request_responsible_id_null_serializes() {
        #[derive(Debug, Serialize, Deserialize)]
        struct Wrapper {
            #[serde(default, with = "option_uuid")]
            rid: Option<Uuid>,
        }
        let w = Wrapper { rid: None };
        let v = serde_json::to_value(&w).unwrap();
        assert_eq!(v["rid"], json!(null));
    }
}
