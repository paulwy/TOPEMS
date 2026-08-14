use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OfficeSupply {
    pub id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub location: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOfficeSupplyRequest {
    pub name: String,
    pub category: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOfficeSupplyRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub quantity: Option<i32>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub location: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    #[test]
    fn test_office_supply_serde_full() {
        let o = OfficeSupply {
            id: sample_uuid(),
            name: "A4打印纸".into(),
            category: Some("纸张".into()),
            quantity: 500,
            unit: Some("包".into()),
            price: Some(25.5),
            location: Some("3楼储物间".into()),
            status: "in_stock".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&o).unwrap();
        let o2: OfficeSupply = serde_json::from_value(v).unwrap();
        assert_eq!(o.name, o2.name);
        assert_eq!(o.category, o2.category);
        assert_eq!(o.quantity, o2.quantity);
        assert_eq!(o.price, o2.price);
        assert_eq!(o.status, o2.status);
    }

    #[test]
    fn test_office_supply_minimal() {
        let o = OfficeSupply {
            id: sample_uuid(),
            name: "笔".into(),
            category: None,
            quantity: 0,
            unit: None,
            price: None,
            location: None,
            status: "out_of_stock".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&o).unwrap();
        let o2: OfficeSupply = serde_json::from_str(&s).unwrap();
        assert_eq!(o2.quantity, 0);
        assert!(o2.category.is_none());
        assert!(o2.price.is_none());
    }

    #[test]
    fn test_office_supply_negative_quantity() {
        let o = OfficeSupply {
            id: sample_uuid(),
            name: "记录错误".into(),
            category: None,
            quantity: -10,
            unit: Some("个".into()),
            price: Some(-5.0),
            location: None,
            status: "error".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&o).unwrap();
        let o2: OfficeSupply = serde_json::from_value(v).unwrap();
        assert_eq!(o2.quantity, -10);
        assert_eq!(o2.price, Some(-5.0));
    }

    #[test]
    fn test_office_supply_large_quantity() {
        let o = OfficeSupply {
            id: sample_uuid(),
            name: "大库存".into(),
            category: Some("misc".into()),
            quantity: i32::MAX,
            unit: Some("pcs".into()),
            price: Some(0.01),
            location: Some("大仓库".into()),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let st = serde_json::to_string(&o).unwrap();
        let o2: OfficeSupply = serde_json::from_str(&st).unwrap();
        assert_eq!(o2.quantity, i32::MAX);
    }

    #[test]
    fn test_create_office_supply_request() {
        let r = CreateOfficeSupplyRequest {
            name: "订书机".into(),
            category: Some("文具".into()),
            quantity: 50,
            unit: Some("台".into()),
            price: Some(18.8),
            location: Some("前台".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateOfficeSupplyRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.name, "订书机");
        assert_eq!(r2.quantity, 50);
    }

    #[test]
    fn test_create_office_supply_request_minimal() {
        let r = CreateOfficeSupplyRequest {
            name: "X".into(),
            category: None,
            quantity: i32::MIN,
            unit: None,
            price: None,
            location: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let r2: CreateOfficeSupplyRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(r2.quantity, i32::MIN);
    }

    #[test]
    fn test_update_office_supply_request_mixed() {
        let r = UpdateOfficeSupplyRequest {
            name: Some("新名称".into()),
            category: None,
            quantity: Some(100),
            unit: None,
            price: Some(99.99),
            location: None,
            status: Some("discontinued".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateOfficeSupplyRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.name, Some("新名称".into()));
        assert_eq!(r2.quantity, Some(100));
        assert_eq!(r2.status, Some("discontinued".into()));
    }

    #[test]
    fn test_update_office_supply_all_none() {
        let r = UpdateOfficeSupplyRequest {
            name: None,
            category: None,
            quantity: None,
            unit: None,
            price: None,
            location: None,
            status: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateOfficeSupplyRequest = serde_json::from_value(v).unwrap();
        assert!(r2.name.is_none());
        assert!(r2.status.is_none());
    }
}
