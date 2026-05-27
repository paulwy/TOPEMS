use serde::{Deserialize, Serialize};
use fake::faker::name::en::Name;
use fake::faker::internet::en::Username;
use fake::faker::company::en::CompanyName;
use fake::faker::lorem::en::{Sentence, Word};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestFixture {
    pub id: String,
    pub name: String,
    pub data: serde_json::Value,
}

pub struct TestFixtures {
    fixtures: Vec<TestFixture>,
}

impl TestFixtures {
    pub fn new() -> Self {
        TestFixtures {
            fixtures: vec![],
        }
    }

    pub fn add_fixture(&mut self, name: &str, data: serde_json::Value) {
        self.fixtures.push(TestFixture {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            data,
        });
    }

    pub fn get_fixture(&self, name: &str) -> Option<&TestFixture> {
        self.fixtures.iter().find(|f| f.name == name)
    }

    pub fn generate_test_user() -> serde_json::Value {
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "username": Username().fake::<String>(),
            "email": format!("{}@example.com", Username().fake::<String>()),
            "role": "test_user",
            "is_active": true
        })
    }

    pub fn generate_test_production_plan() -> serde_json::Value {
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "product_name": CompanyName().fake::<String>(),
            "product_code": format!("PROD-{}", rand::random::<u32>() % 10000),
            "planned_quantity": rand::random::<i32>() % 1000 + 100,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "status": "计划中",
            "created_by": Name().fake::<String>()
        })
    }

    pub fn generate_test_supply_chain_order() -> serde_json::Value {
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "order_type": "采购",
            "material_name": Word().fake::<String>(),
            "quantity": rand::random::<i32>() % 1000 + 100,
            "supplier_customer": CompanyName().fake::<String>(),
            "status": "待处理",
            "order_date": "2026-01-01",
            "expected_date": "2026-12-31",
            "created_by": Name().fake::<String>()
        })
    }

    pub fn generate_test_financial_record() -> serde_json::Value {
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "record_type": "收入",
            "description": Sentence(3..6).fake::<String>(),
            "amount": (rand::random::<f64>() * 10000.0).round() / 100.0,
            "category": "销售收入",
            "date": "2026-01-01",
            "reference_number": format!("INV-{}", rand::random::<u32>() % 10000),
            "created_by": Name().fake::<String>()
        })
    }

    pub fn get_default_test_users() -> Vec<serde_json::Value> {
        vec![
            serde_json::json!({
                "id": "1",
                "username": "admin",
                "email": "admin@topems.com",
                "role": "admin",
                "password": "admin123",
                "permissions": ["read", "write", "delete", "admin"]
            }),
            serde_json::json!({
                "id": "2",
                "username": "user",
                "email": "user@topems.com",
                "role": "user",
                "password": "user123",
                "permissions": ["read", "write"]
            }),
            serde_json::json!({
                "id": "3",
                "username": "guest",
                "email": "guest@topems.com",
                "role": "guest",
                "password": "guest123",
                "permissions": ["read"]
            })
        ]
    }
}

impl Default for TestFixtures {
    fn default() -> Self {
        Self::new()
    }
}
