use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Material {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub category: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub barcode: Option<String>,
    pub safety_stock: f64,
    pub unit_price: f64,
    pub tax_rate: f64,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateMaterialRequest {
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub category: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub barcode: Option<String>,
    pub safety_stock: Option<f64>,
    pub unit_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateMaterialRequest {
    pub name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub barcode: Option<String>,
    pub safety_stock: Option<f64>,
    pub unit_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Customer {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub customer_type: String,
    pub industry: Option<String>,
    pub scale: Option<String>,
    pub credit_limit: f64,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCustomerRequest {
    pub code: String,
    pub name: String,
    pub name_en: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub customer_type: String,
    pub industry: Option<String>,
    pub scale: Option<String>,
    pub credit_limit: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub customer_type: Option<String>,
    pub industry: Option<String>,
    pub scale: Option<String>,
    pub credit_limit: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Supplier {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub supplier_type: String,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateSupplierRequest {
    pub code: String,
    pub name: String,
    pub name_en: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub supplier_type: String,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub supplier_type: Option<String>,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Inventory {
    pub id: Uuid,
    pub material_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub location_code: Option<String>,
    pub quantity: f64,
    pub available_quantity: f64,
    pub reserved_quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub total_amount: f64,
    pub batch_no: Option<String>,
    pub expire_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateInventoryRequest {
    pub material_id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub batch_no: Option<String>,
    pub expire_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateInventoryRequest {
    pub warehouse_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub batch_no: Option<String>,
    pub expire_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct SalesOrder {
    pub id: Uuid,
    pub order_no: String,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Decimal,
    pub tax_amount: Decimal,
    pub discount_amount: Decimal,
    pub payable_amount: Decimal,
    pub status: String,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateSalesOrderRequest {
    pub order_no: String,
    pub customer_id: Uuid,
    pub order_date: Option<DateTime<Utc>>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub discount_amount: Option<f64>,
    pub payable_amount: Option<f64>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateSalesOrderRequest {
    pub customer_id: Option<Uuid>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub discount_amount: Option<f64>,
    pub payable_amount: Option<f64>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub payable_amount: f64,
    pub status: String,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct PurchaseOrderItem {
    pub material_id: Uuid,
    pub material_name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePurchaseOrderRequest {
    pub supplier_id: Uuid,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub items: Vec<PurchaseOrderItem>,
    pub tax_rate: Option<f64>,
    pub discount_rate: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdatePurchaseOrderRequest {
    pub supplier_name: Option<String>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub remark: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::str::FromStr;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    // ========== Material ==========
    #[test]
    fn test_material_serde_full() {
        let m = Material {
            id: sample_uuid(),
            code: "MAT-001".into(),
            name: "螺纹钢".into(),
            specification: Some("HRB400 Φ12".into()),
            unit: "ton".into(),
            category: "steel".into(),
            brand: Some("宝钢".into()),
            model: Some("HRB400".into()),
            barcode: Some("6901234567890".into()),
            safety_stock: 50.5,
            unit_price: 3800.0,
            tax_rate: 0.13,
            description: Some("建筑用钢材".into()),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&m).unwrap();
        let m2: Material = serde_json::from_value(v).unwrap();
        assert_eq!(m.code, m2.code);
        assert_eq!(m.name, m2.name);
        assert_eq!(m.safety_stock, m2.safety_stock);
        assert_eq!(m.unit_price, m2.unit_price);
        assert_eq!(m.tax_rate, m2.tax_rate);
    }

    #[test]
    fn test_material_zero_safety_stock_and_price() {
        let m = Material {
            id: sample_uuid(),
            code: "M0".into(),
            name: "零值物料".into(),
            specification: None,
            unit: "pcs".into(),
            category: "misc".into(),
            brand: None,
            model: None,
            barcode: None,
            safety_stock: 0.0,
            unit_price: 0.0,
            tax_rate: 0.0,
            description: None,
            status: "inactive".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&m).unwrap();
        let m2: Material = serde_json::from_str(&s).unwrap();
        assert_eq!(m2.safety_stock, 0.0);
        assert_eq!(m2.unit_price, 0.0);
    }

    #[test]
    fn test_material_negative_tax_rate() {
        let m = Material {
            id: sample_uuid(),
            code: "MN".into(),
            name: "负税率测试".into(),
            specification: None,
            unit: "x".into(),
            category: "y".into(),
            brand: None,
            model: None,
            barcode: None,
            safety_stock: -10.0,
            unit_price: -5.5,
            tax_rate: -0.05,
            description: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&m).unwrap();
        let m2: Material = serde_json::from_value(v).unwrap();
        assert_eq!(m2.tax_rate, -0.05);
    }

    #[test]
    fn test_create_material_request_full() {
        let r = CreateMaterialRequest {
            code: "NEW-M".into(),
            name: "新物料".into(),
            specification: Some("spec".into()),
            unit: "kg".into(),
            category: "raw".into(),
            brand: Some("b".into()),
            model: Some("m".into()),
            barcode: Some("bc".into()),
            safety_stock: Some(10.0),
            unit_price: Some(100.0),
            tax_rate: Some(0.06),
            description: Some("d".into()),
            status: Some("active".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateMaterialRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.code, "NEW-M");
        assert_eq!(r2.safety_stock, Some(10.0));
    }

    #[test]
    fn test_create_material_request_minimal() {
        let r = CreateMaterialRequest {
            code: "C".into(),
            name: "N".into(),
            specification: None,
            unit: "u".into(),
            category: "c".into(),
            brand: None,
            model: None,
            barcode: None,
            safety_stock: None,
            unit_price: None,
            tax_rate: None,
            description: None,
            status: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let r2: CreateMaterialRequest = serde_json::from_str(&s).unwrap();
        assert!(r2.safety_stock.is_none());
        assert!(r2.status.is_none());
    }

    #[test]
    fn test_update_material_request_all_some() {
        let r = UpdateMaterialRequest {
            name: Some("新名".into()),
            specification: Some("新规格".into()),
            unit: Some("新单位".into()),
            category: Some("新分类".into()),
            brand: Some("新品牌".into()),
            model: Some("新型号".into()),
            barcode: Some("新条码".into()),
            safety_stock: Some(999.9),
            unit_price: Some(1234.5),
            tax_rate: Some(0.25),
            description: Some("新描述".into()),
            status: Some("inactive".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateMaterialRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.safety_stock, Some(999.9));
        assert_eq!(r2.status, Some("inactive".into()));
    }

    #[test]
    fn test_update_material_request_all_none() {
        let r = UpdateMaterialRequest {
            name: None,
            specification: None,
            unit: None,
            category: None,
            brand: None,
            model: None,
            barcode: None,
            safety_stock: None,
            unit_price: None,
            tax_rate: None,
            description: None,
            status: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateMaterialRequest = serde_json::from_value(v).unwrap();
        assert!(r2.name.is_none());
    }

    // ========== Customer ==========
    #[test]
    fn test_customer_serde_full() {
        let c = Customer {
            id: sample_uuid(),
            code: "CUST-007".into(),
            name: "北京科技有限公司".into(),
            short_name: Some("北科".into()),
            contact_person: Some("张经理".into()),
            contact_phone: Some("13800138000".into()),
            email: Some("zhang@beike.com".into()),
            address: Some("北京市海淀区中关村".into()),
            province: Some("北京".into()),
            city: Some("北京".into()),
            district: Some("海淀区".into()),
            customer_type: "enterprise".into(),
            industry: Some("IT".into()),
            scale: Some("large".into()),
            credit_limit: 500000.0,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&c).unwrap();
        let c2: Customer = serde_json::from_value(v).unwrap();
        assert_eq!(c.code, c2.code);
        assert_eq!(c.name, c2.name);
        assert_eq!(c.contact_phone, c2.contact_phone);
        assert_eq!(c.credit_limit, c2.credit_limit);
    }

    #[test]
    fn test_customer_minimal_no_optional() {
        let c = Customer {
            id: sample_uuid(),
            code: "C".into(),
            name: "N".into(),
            short_name: None,
            contact_person: None,
            contact_phone: None,
            email: None,
            address: None,
            province: None,
            city: None,
            district: None,
            customer_type: "individual".into(),
            industry: None,
            scale: None,
            credit_limit: 0.0,
            status: "inactive".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&c).unwrap();
        let c2: Customer = serde_json::from_str(&s).unwrap();
        assert_eq!(c2.credit_limit, 0.0);
        assert!(c2.email.is_none());
    }

    #[test]
    fn test_customer_negative_credit_limit() {
        let c = Customer {
            id: sample_uuid(),
            code: "CN".into(),
            name: "负额度客户".into(),
            short_name: None,
            contact_person: None,
            contact_phone: None,
            email: None,
            address: None,
            province: None,
            city: None,
            district: None,
            customer_type: "x".into(),
            industry: None,
            scale: None,
            credit_limit: -1000.0,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&c).unwrap();
        let c2: Customer = serde_json::from_value(v).unwrap();
        assert_eq!(c2.credit_limit, -1000.0);
    }

    #[test]
    fn test_create_customer_request() {
        let r = CreateCustomerRequest {
            code: "NEW-C".into(),
            name: "新客户".into(),
            name_en: None,
            short_name: Some("NC".into()),
            contact_person: None,
            contact_phone: None,
            email: None,
            address: None,
            province: None,
            city: None,
            district: None,
            customer_type: "vip".into(),
            industry: Some("制造".into()),
            scale: Some("medium".into()),
            credit_limit: Some(10000.0),
            status: Some("active".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateCustomerRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.customer_type, "vip");
        assert_eq!(r2.credit_limit, Some(10000.0));
    }

    #[test]
    fn test_update_customer_request_mixed() {
        let r = UpdateCustomerRequest {
            name: Some("改名".into()),
            name_en: None,
            short_name: None,
            contact_person: Some("新联系人".into()),
            contact_phone: None,
            email: Some("a@b.com".into()),
            address: None,
            province: None,
            city: None,
            district: None,
            customer_type: None,
            industry: None,
            scale: None,
            credit_limit: Some(999.0),
            status: Some("inactive".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateCustomerRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.name, Some("改名".into()));
        assert_eq!(r2.credit_limit, Some(999.0));
    }

    // ========== Supplier ==========
    #[test]
    fn test_supplier_serde() {
        let s = Supplier {
            id: sample_uuid(),
            code: "SUP-001".into(),
            name: "上海材料供应商".into(),
            short_name: Some("上材".into()),
            contact_person: Some("李总".into()),
            contact_phone: Some("13900000000".into()),
            email: Some("li@sh.com".into()),
            address: Some("上海浦东".into()),
            province: Some("上海".into()),
            city: Some("上海".into()),
            district: Some("浦东新区".into()),
            supplier_type: "manufacturer".into(),
            industry: Some("化工".into()),
            qualification_level: Some("A".into()),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&s).unwrap();
        let s2: Supplier = serde_json::from_value(v).unwrap();
        assert_eq!(s.code, s2.code);
        assert_eq!(s.supplier_type, s2.supplier_type);
        assert_eq!(s.qualification_level, s2.qualification_level);
    }

    #[test]
    fn test_create_supplier_request_all_fields() {
        let r = CreateSupplierRequest {
            code: "NEW-S".into(),
            name: "新供应商".into(),
            name_en: None,
            short_name: Some("NS".into()),
            contact_person: Some("C".into()),
            contact_phone: None,
            email: None,
            address: None,
            province: None,
            city: None,
            district: None,
            supplier_type: "trader".into(),
            industry: None,
            qualification_level: Some("B".into()),
            status: Some("pending".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateSupplierRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.supplier_type, "trader");
        assert_eq!(r2.qualification_level, Some("B".into()));
    }

    #[test]
    fn test_update_supplier_request_none() {
        let r = UpdateSupplierRequest {
            name: None,
            name_en: None,
            short_name: None,
            contact_person: None,
            contact_phone: None,
            email: None,
            address: None,
            province: None,
            city: None,
            district: None,
            supplier_type: None,
            industry: None,
            qualification_level: None,
            status: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateSupplierRequest = serde_json::from_value(v).unwrap();
        assert!(r2.name.is_none());
    }

    // ========== Inventory ==========
    #[test]
    fn test_inventory_serde_full() {
        let inv = Inventory {
            id: sample_uuid(),
            material_id: sample_uuid(),
            material_code: "MAT-001".into(),
            material_name: "原材料A".into(),
            warehouse_id: Some(sample_uuid()),
            warehouse_name: Some("主仓库".into()),
            location_code: Some("A-01-02".into()),
            quantity: 1500.0,
            available_quantity: 1200.0,
            reserved_quantity: 300.0,
            unit: "kg".into(),
            unit_price: 50.25,
            total_amount: 75375.0,
            batch_no: Some("B20250101".into()),
            expire_date: Some(Utc::now()),
            status: "normal".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&inv).unwrap();
        let inv2: Inventory = serde_json::from_value(v).unwrap();
        assert_eq!(inv.quantity, inv2.quantity);
        assert_eq!(inv.available_quantity, inv2.available_quantity);
        assert_eq!(inv.reserved_quantity, inv2.reserved_quantity);
        assert_eq!(inv.total_amount, inv2.total_amount);
        assert_eq!(inv.batch_no, inv2.batch_no);
    }

    #[test]
    fn test_inventory_zero_stock() {
        let inv = Inventory {
            id: sample_uuid(),
            material_id: sample_uuid(),
            material_code: "M".into(),
            material_name: "N".into(),
            warehouse_id: None,
            warehouse_name: None,
            location_code: None,
            quantity: 0.0,
            available_quantity: 0.0,
            reserved_quantity: 0.0,
            unit: "pcs".into(),
            unit_price: 0.0,
            total_amount: 0.0,
            batch_no: None,
            expire_date: None,
            status: "out_of_stock".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&inv).unwrap();
        let inv2: Inventory = serde_json::from_str(&s).unwrap();
        assert_eq!(inv2.quantity, 0.0);
        assert_eq!(inv2.total_amount, 0.0);
    }

    #[test]
    fn test_inventory_negative_quantity_reserved() {
        let inv = Inventory {
            id: sample_uuid(),
            material_id: sample_uuid(),
            material_code: "MN".into(),
            material_name: "负库存".into(),
            warehouse_id: None,
            warehouse_name: None,
            location_code: None,
            quantity: -50.0,
            available_quantity: -60.0,
            reserved_quantity: 10.0,
            unit: "x".into(),
            unit_price: -5.0,
            total_amount: 250.0,
            batch_no: None,
            expire_date: None,
            status: "abnormal".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&inv).unwrap();
        let inv2: Inventory = serde_json::from_value(v).unwrap();
        assert_eq!(inv2.quantity, -50.0);
        assert_eq!(inv2.unit_price, -5.0);
    }

    #[test]
    fn test_create_inventory_request() {
        let r = CreateInventoryRequest {
            material_id: sample_uuid(),
            warehouse_id: Some(sample_uuid()),
            location_code: Some("L-1".into()),
            quantity: 100.0,
            unit_price: Some(10.0),
            batch_no: Some("B1".into()),
            expire_date: None,
            status: Some("normal".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateInventoryRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.quantity, 100.0);
        assert_eq!(r2.status, Some("normal".into()));
    }

    #[test]
    fn test_update_inventory_request() {
        let r = UpdateInventoryRequest {
            warehouse_id: None,
            location_code: Some("NEW-LOC".into()),
            quantity: Some(500.5),
            unit_price: None,
            batch_no: None,
            expire_date: Some(Utc::now()),
            status: Some("quarantine".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateInventoryRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.location_code, Some("NEW-LOC".into()));
        assert_eq!(r2.quantity, Some(500.5));
    }

    // ========== SalesOrder ==========
    #[test]
    fn test_sales_order_full() {
        let so = SalesOrder {
            id: sample_uuid(),
            order_no: "SO-2025-0001".into(),
            customer_id: sample_uuid(),
            customer_name: "客户A".into(),
            order_date: Utc::now(),
            delivery_date: Some(Utc::now()),
            total_amount: Decimal::from_str("113000.0").unwrap(),
            tax_amount: Decimal::from_str("13000.0").unwrap(),
            discount_amount: Decimal::from_str("0.0").unwrap(),
            payable_amount: Decimal::from_str("113000.0").unwrap(),
            status: "confirmed".into(),
            remark: Some("加急订单".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&so).unwrap();
        let so2: SalesOrder = serde_json::from_value(v).unwrap();
        assert_eq!(so.order_no, so2.order_no);
        assert_eq!(so.total_amount, so2.total_amount);
        assert_eq!(so.tax_amount, so2.tax_amount);
        assert_eq!(so.payable_amount, so2.payable_amount);
    }

    #[test]
    fn test_sales_order_discount_gt_total() {
        let so = SalesOrder {
            id: sample_uuid(),
            order_no: "SO-DISC".into(),
            customer_id: sample_uuid(),
            customer_name: "折价客户".into(),
            order_date: Utc::now(),
            delivery_date: None,
            total_amount: Decimal::from_str("1000.0").unwrap(),
            tax_amount: Decimal::from_str("130.0").unwrap(),
            discount_amount: Decimal::from_str("2000.0").unwrap(),
            payable_amount: Decimal::from_str("-870.0").unwrap(),
            status: "draft".into(),
            remark: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&so).unwrap();
        let so2: SalesOrder = serde_json::from_str(&s).unwrap();
        assert_eq!(so2.discount_amount, Decimal::from_str("2000.0").unwrap());
        assert_eq!(so2.payable_amount, Decimal::from_str("-870.0").unwrap());
    }

    #[test]
    fn test_create_sales_order_request() {
        let r = CreateSalesOrderRequest {
            order_no: "SO-NEW".into(),
            customer_id: sample_uuid(),
            order_date: Some(Utc::now()),
            delivery_date: None,
            total_amount: Some(5000.0),
            tax_amount: Some(650.0),
            discount_amount: Some(100.0),
            payable_amount: Some(5550.0),
            status: Some("draft".into()),
            remark: Some("新订单".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateSalesOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.order_no, "SO-NEW");
        assert_eq!(r2.discount_amount, Some(100.0));
    }

    #[test]
    fn test_update_sales_order_request() {
        let r = UpdateSalesOrderRequest {
            customer_id: None,
            delivery_date: Some(Utc::now()),
            total_amount: Some(999.9),
            tax_amount: None,
            discount_amount: None,
            payable_amount: Some(999.9),
            status: Some("shipped".into()),
            remark: Some("已发货".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateSalesOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.status, Some("shipped".into()));
        assert_eq!(r2.total_amount, Some(999.9));
    }

    // ========== PurchaseOrder ==========
    #[test]
    fn test_purchase_order_serde() {
        let po = PurchaseOrder {
            id: sample_uuid(),
            order_no: "PO-2025-001".into(),
            supplier_id: sample_uuid(),
            supplier_name: "供应商X".into(),
            order_date: Utc::now(),
            delivery_date: Some(Utc::now()),
            total_amount: 56500.0,
            tax_amount: 6500.0,
            discount_amount: 500.0,
            payable_amount: 56000.0,
            status: "pending".into(),
            remark: Some("采购生产原料".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&po).unwrap();
        let po2: PurchaseOrder = serde_json::from_value(v).unwrap();
        assert_eq!(po.order_no, po2.order_no);
        assert_eq!(po.supplier_name, po2.supplier_name);
        assert_eq!(po.discount_amount, po2.discount_amount);
    }

    #[test]
    fn test_purchase_order_item_serde() {
        let item = PurchaseOrderItem {
            material_id: sample_uuid(),
            material_name: "钢材".into(),
            quantity: 100.5,
            unit_price: 3800.0,
            amount: 381900.0,
        };
        let v = serde_json::to_value(&item).unwrap();
        let item2: PurchaseOrderItem = serde_json::from_value(v).unwrap();
        assert_eq!(item.quantity, item2.quantity);
        assert_eq!(item.unit_price, item2.unit_price);
        assert_eq!(item.amount, item2.amount);
    }

    #[test]
    fn test_purchase_order_item_zero_and_negative() {
        let items = vec![
            PurchaseOrderItem {
                material_id: sample_uuid(),
                material_name: "零数量".into(),
                quantity: 0.0,
                unit_price: 0.0,
                amount: 0.0,
            },
            PurchaseOrderItem {
                material_id: sample_uuid(),
                material_name: "退货项".into(),
                quantity: -10.0,
                unit_price: 50.0,
                amount: -500.0,
            },
        ];
        let v = serde_json::to_value(&items).unwrap();
        let items2: Vec<PurchaseOrderItem> = serde_json::from_value(v).unwrap();
        assert_eq!(items2.len(), 2);
        assert_eq!(items2[0].amount, 0.0);
        assert_eq!(items2[1].quantity, -10.0);
    }

    #[test]
    fn test_create_purchase_order_request_with_items() {
        let r = CreatePurchaseOrderRequest {
            supplier_id: sample_uuid(),
            order_date: Utc::now(),
            delivery_date: None,
            items: vec![
                PurchaseOrderItem {
                    material_id: sample_uuid(),
                    material_name: "物料1".into(),
                    quantity: 10.0,
                    unit_price: 100.0,
                    amount: 1000.0,
                },
                PurchaseOrderItem {
                    material_id: sample_uuid(),
                    material_name: "物料2".into(),
                    quantity: 5.0,
                    unit_price: 200.0,
                    amount: 1000.0,
                },
            ],
            tax_rate: Some(0.13),
            discount_rate: Some(0.05),
            remark: Some("月度采购".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreatePurchaseOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.items.len(), 2);
        assert_eq!(r2.tax_rate, Some(0.13));
        assert_eq!(r2.items[1].amount, 1000.0);
    }

    #[test]
    fn test_create_purchase_order_request_no_items() {
        let r = CreatePurchaseOrderRequest {
            supplier_id: sample_uuid(),
            order_date: Utc::now(),
            delivery_date: None,
            items: vec![],
            tax_rate: None,
            discount_rate: None,
            remark: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let r2: CreatePurchaseOrderRequest = serde_json::from_str(&s).unwrap();
        assert!(r2.items.is_empty());
        assert!(r2.tax_rate.is_none());
    }

    #[test]
    fn test_update_purchase_order_request() {
        let r = UpdatePurchaseOrderRequest {
            supplier_name: Some("新供应商名".into()),
            delivery_date: Some(Utc::now()),
            remark: Some("已修改".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdatePurchaseOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.supplier_name, Some("新供应商名".into()));
        assert_eq!(r2.remark, Some("已修改".into()));
    }

    #[test]
    fn test_sales_order_large_amounts() {
        let so = SalesOrder {
            id: sample_uuid(),
            order_no: "SO-BIG".into(),
            customer_id: sample_uuid(),
            customer_name: "大客户".into(),
            order_date: Utc::now(),
            delivery_date: None,
            total_amount: Decimal::from_str("99999999999999999999.99").unwrap(),
            tax_amount: Decimal::from_str("9999999999999999999.999").unwrap(),
            discount_amount: Decimal::from_str("0.0").unwrap(),
            payable_amount: Decimal::from_str("99999999999999999999.99").unwrap(),
            status: "draft".into(),
            remark: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&so).unwrap();
        let so2: SalesOrder = serde_json::from_str(&s).unwrap();
        assert_eq!(
            so2.total_amount,
            Decimal::from_str("99999999999999999999.99").unwrap()
        );
    }
}
