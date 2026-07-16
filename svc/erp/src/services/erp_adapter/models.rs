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
