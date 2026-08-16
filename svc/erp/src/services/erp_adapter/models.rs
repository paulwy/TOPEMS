#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErpSystemType {
    Kingdee,
    Yonyou,
    Sap,
    Ufida,
    KingdeeCloud,
    Custom,
}

#[derive(Error, Debug)]
pub enum ErpAdapterError {
    #[error("连接ERP失败: {0}")]
    ConnectionFailed(String),
    #[error("认证失败: {0}")]
    AuthenticationFailed(String),
    #[error("API调用失败: {0}")]
    ApiCallFailed(String),
    #[error("数据转换失败: {0}")]
    DataTransformFailed(String),
    #[error("不支持的操作: {0}")]
    UnsupportedOperation(String),
    #[error("HTTP请求失败: {0}")]
    HttpError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpConnectionConfig {
    pub system_type: ErpSystemType,
    pub api_endpoint: String,
    pub app_key: String,
    pub app_secret: String,
    pub version: Option<String>,
    pub timeout_seconds: Option<u64>,
    pub tenant_id: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

impl Default for ErpConnectionConfig {
    fn default() -> Self {
        ErpConnectionConfig {
            system_type: ErpSystemType::Custom,
            api_endpoint: String::new(),
            app_key: String::new(),
            app_secret: String::new(),
            version: Some("v1".to_string()),
            timeout_seconds: Some(30),
            tenant_id: None,
            username: None,
            password: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpDataExchange {
    pub exchange_id: Uuid,
    pub source_system: ErpSystemType,
    pub target_system: ErpSystemType,
    pub data_type: String,
    pub operation: String,
    pub data: serde_json::Value,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpVoucherDto {
    pub voucher_number: String,
    pub voucher_date: String,
    pub period: String,
    pub summary: String,
    pub maker: String,
    pub items: Vec<ErpVoucherItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpVoucherItemDto {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: String,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub department_code: Option<String>,
    pub project_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpAccountDto {
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: i32,
    pub parent_code: Option<String>,
    pub is_cash_flow: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpCustomerDto {
    pub code: String,
    pub name: String,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_id: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub credit_limit: Option<f64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpSupplierDto {
    pub code: String,
    pub name: String,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_id: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub payment_terms: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpEmployeeDto {
    pub code: String,
    pub name: String,
    pub department_code: String,
    pub department_name: String,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub hire_date: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpAssetDto {
    pub code: String,
    pub name: String,
    pub asset_type: String,
    pub purchase_date: Option<String>,
    pub original_value: f64,
    pub net_value: f64,
    pub depreciation_method: String,
    pub useful_life_months: i32,
    pub accumulated_depreciation: f64,
    pub department_code: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpFinancialStatementDto {
    pub report_type: String,
    pub period: String,
    pub items: Vec<ErpStatementItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpStatementItemDto {
    pub item_code: String,
    pub item_name: String,
    pub item_level: i32,
    pub current_period: f64,
    pub prior_period: Option<f64>,
    pub formula: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ErpResult<T> {
    pub fn ok(data: T) -> Self {
        ErpResult {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: String) -> Self {
        ErpResult {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- ErpResult ---
    #[test]
    fn test_erp_result_ok_success_true() {
        let r: ErpResult<i32> = ErpResult::ok(42);
        assert!(r.success);
        assert_eq!(r.data, Some(42));
        assert!(r.error.is_none());
    }

    #[test]
    fn test_erp_result_err_success_false() {
        let r: ErpResult<i32> = ErpResult::err("boom".to_string());
        assert!(!r.success);
        assert!(r.data.is_none());
        assert_eq!(r.error, Some("boom".to_string()));
    }

    #[test]
    fn test_erp_result_ok_with_string() {
        let r: ErpResult<String> = ErpResult::ok("hello".to_string());
        assert_eq!(r.data.as_deref(), Some("hello"));
    }

    #[test]
    fn test_erp_result_err_empty_message() {
        let r: ErpResult<i32> = ErpResult::err(String::new());
        assert!(!r.success);
        assert_eq!(r.error, Some("".to_string()));
    }

    #[test]
    fn test_erp_result_ok_with_struct() {
        #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
        struct Foo {
            a: i32,
            b: String,
        }
        let foo = Foo {
            a: 1,
            b: "x".to_string(),
        };
        let r = ErpResult::ok(foo.clone());
        assert_eq!(r.data, Some(foo));
    }

    // --- ErpConnectionConfig::default ---
    #[test]
    fn test_erp_connection_config_default_system_type() {
        let c = ErpConnectionConfig::default();
        assert_eq!(c.system_type, ErpSystemType::Custom);
    }

    #[test]
    fn test_erp_connection_config_default_empty_strings() {
        let c = ErpConnectionConfig::default();
        assert!(c.api_endpoint.is_empty());
        assert!(c.app_key.is_empty());
        assert!(c.app_secret.is_empty());
    }

    #[test]
    fn test_erp_connection_config_default_optional_fields() {
        let c = ErpConnectionConfig::default();
        assert_eq!(c.version, Some("v1".to_string()));
        assert_eq!(c.timeout_seconds, Some(30));
        assert!(c.tenant_id.is_none());
        assert!(c.username.is_none());
        assert!(c.password.is_none());
    }

    // --- ErpSystemType serde ---
    #[test]
    fn test_erp_system_type_serde_roundtrip() {
        let types = vec![
            ErpSystemType::Kingdee,
            ErpSystemType::Yonyou,
            ErpSystemType::Sap,
            ErpSystemType::Ufida,
            ErpSystemType::KingdeeCloud,
            ErpSystemType::Custom,
        ];
        for t in types {
            let json = serde_json::to_string(&t).unwrap();
            let back: ErpSystemType = serde_json::from_str(&json).unwrap();
            assert_eq!(t, back);
        }
    }

    #[test]
    fn test_erp_system_type_equality() {
        assert_eq!(ErpSystemType::Kingdee, ErpSystemType::Kingdee);
        assert_ne!(ErpSystemType::Kingdee, ErpSystemType::Yonyou);
        assert_ne!(ErpSystemType::Sap, ErpSystemType::Custom);
    }

    // --- ErpAdapterError display ---
    #[test]
    fn test_erp_adapter_error_display_connection_failed() {
        let e = ErpAdapterError::ConnectionFailed("timeout".to_string());
        assert_eq!(e.to_string(), "连接ERP失败: timeout");
    }

    #[test]
    fn test_erp_adapter_error_display_authentication_failed() {
        let e = ErpAdapterError::AuthenticationFailed("bad token".to_string());
        assert_eq!(e.to_string(), "认证失败: bad token");
    }

    #[test]
    fn test_erp_adapter_error_display_api_call_failed() {
        let e = ErpAdapterError::ApiCallFailed("500".to_string());
        assert_eq!(e.to_string(), "API调用失败: 500");
    }

    #[test]
    fn test_erp_adapter_error_display_data_transform_failed() {
        let e = ErpAdapterError::DataTransformFailed("bad json".to_string());
        assert_eq!(e.to_string(), "数据转换失败: bad json");
    }

    #[test]
    fn test_erp_adapter_error_display_unsupported_operation() {
        let e = ErpAdapterError::UnsupportedOperation("foo".to_string());
        assert_eq!(e.to_string(), "不支持的操作: foo");
    }

    #[test]
    fn test_erp_adapter_error_display_http_error() {
        let e = ErpAdapterError::HttpError("network".to_string());
        assert_eq!(e.to_string(), "HTTP请求失败: network");
    }

    // --- ErpConnectionConfig serde ---
    #[test]
    fn test_erp_connection_config_serde_roundtrip() {
        let c = ErpConnectionConfig {
            system_type: ErpSystemType::Sap,
            api_endpoint: "https://sap.example.com".to_string(),
            app_key: "key".to_string(),
            app_secret: "secret".to_string(),
            version: Some("v2".to_string()),
            timeout_seconds: Some(60),
            tenant_id: Some("t1".to_string()),
            username: Some("u".to_string()),
            password: Some("p".to_string()),
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: ErpConnectionConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(back.system_type, ErpSystemType::Sap);
        assert_eq!(back.api_endpoint, "https://sap.example.com");
        assert_eq!(back.app_key, "key");
        assert_eq!(back.app_secret, "secret");
        assert_eq!(back.version, Some("v2".to_string()));
        assert_eq!(back.timeout_seconds, Some(60));
        assert_eq!(back.tenant_id, Some("t1".to_string()));
        assert_eq!(back.username, Some("u".to_string()));
        assert_eq!(back.password, Some("p".to_string()));
    }

    // --- DTO serde roundtrips ---
    #[test]
    fn test_erp_voucher_dto_serde_roundtrip() {
        let v = ErpVoucherDto {
            voucher_number: "V001".to_string(),
            voucher_date: "2024-01-01".to_string(),
            period: "2024-01".to_string(),
            summary: "test".to_string(),
            maker: "alice".to_string(),
            items: vec![ErpVoucherItemDto {
                line_number: 1,
                subject_code: "1001".to_string(),
                subject_name: "Cash".to_string(),
                summary: "item".to_string(),
                debit_amount: 100.0,
                credit_amount: 0.0,
                quantity: Some(1.0),
                unit: Some("个".to_string()),
                department_code: Some("D001".to_string()),
                project_code: Some("P001".to_string()),
            }],
        };
        let json = serde_json::to_string(&v).unwrap();
        let back: ErpVoucherDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.voucher_number, "V001");
        assert_eq!(back.items.len(), 1);
        assert_eq!(back.items[0].debit_amount, 100.0);
    }

    #[test]
    fn test_erp_account_dto_serde_roundtrip() {
        let a = ErpAccountDto {
            code: "1001".to_string(),
            name: "Cash".to_string(),
            category: "asset".to_string(),
            level: 1,
            parent_code: None,
            is_cash_flow: true,
            status: "active".to_string(),
        };
        let json = serde_json::to_string(&a).unwrap();
        let back: ErpAccountDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "1001");
        assert!(back.is_cash_flow);
    }

    #[test]
    fn test_erp_customer_dto_serde_roundtrip() {
        let c = ErpCustomerDto {
            code: "C001".to_string(),
            name: "Alice".to_string(),
            contact: Some("Bob".to_string()),
            phone: Some("13800138000".to_string()),
            email: Some("a@b.com".to_string()),
            address: Some("123 St".to_string()),
            tax_id: Some("T001".to_string()),
            bank_account: Some("6228".to_string()),
            bank_name: Some("ICBC".to_string()),
            credit_limit: Some(50000.0),
            status: "active".to_string(),
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: ErpCustomerDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "C001");
        assert_eq!(back.credit_limit, Some(50000.0));
    }

    #[test]
    fn test_erp_supplier_dto_serde_roundtrip() {
        let s = ErpSupplierDto {
            code: "S001".to_string(),
            name: "Supplier Co".to_string(),
            contact: None,
            phone: None,
            email: None,
            address: None,
            tax_id: None,
            bank_account: None,
            bank_name: None,
            payment_terms: Some("net30".to_string()),
            status: "active".to_string(),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: ErpSupplierDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "Supplier Co");
        assert_eq!(back.payment_terms, Some("net30".to_string()));
    }

    #[test]
    fn test_erp_employee_dto_serde_roundtrip() {
        let e = ErpEmployeeDto {
            code: "E001".to_string(),
            name: "Carol".to_string(),
            department_code: "D001".to_string(),
            department_name: "Engineering".to_string(),
            position: Some("Engineer".to_string()),
            email: Some("c@d.com".to_string()),
            phone: Some("13900139000".to_string()),
            hire_date: Some("2024-01-01".to_string()),
            status: "active".to_string(),
        };
        let json = serde_json::to_string(&e).unwrap();
        let back: ErpEmployeeDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "E001");
        assert_eq!(back.department_name, "Engineering");
    }

    #[test]
    fn test_erp_asset_dto_serde_roundtrip() {
        let a = ErpAssetDto {
            code: "A001".to_string(),
            name: "Laptop".to_string(),
            asset_type: "IT".to_string(),
            purchase_date: Some("2024-01-01".to_string()),
            original_value: 10000.0,
            net_value: 8000.0,
            depreciation_method: "straight_line".to_string(),
            useful_life_months: 36,
            accumulated_depreciation: 2000.0,
            department_code: Some("D001".to_string()),
            status: "in_use".to_string(),
        };
        let json = serde_json::to_string(&a).unwrap();
        let back: ErpAssetDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.original_value, 10000.0);
        assert_eq!(back.useful_life_months, 36);
    }

    #[test]
    fn test_erp_financial_statement_dto_serde_roundtrip() {
        let s = ErpFinancialStatementDto {
            report_type: "balance_sheet".to_string(),
            period: "2024-01".to_string(),
            items: vec![ErpStatementItemDto {
                item_code: "1001".to_string(),
                item_name: "Cash".to_string(),
                item_level: 1,
                current_period: 1000.0,
                prior_period: Some(900.0),
                formula: None,
            }],
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: ErpFinancialStatementDto = serde_json::from_str(&json).unwrap();
        assert_eq!(back.items.len(), 1);
        assert_eq!(back.items[0].current_period, 1000.0);
    }

    #[test]
    fn test_erp_data_exchange_serde_roundtrip() {
        let e = ErpDataExchange {
            exchange_id: Uuid::new_v4(),
            source_system: ErpSystemType::Sap,
            target_system: ErpSystemType::Kingdee,
            data_type: "voucher".to_string(),
            operation: "create".to_string(),
            data: serde_json::json!({"k": "v"}),
            status: "pending".to_string(),
            error_message: None,
            created_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&e).unwrap();
        let back: ErpDataExchange = serde_json::from_str(&json).unwrap();
        assert_eq!(back.exchange_id, e.exchange_id);
        assert_eq!(back.data_type, "voucher");
    }
}
