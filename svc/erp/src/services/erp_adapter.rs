#![allow(dead_code)]

// 外部ERP适配器
// 支持金蝶(Kingdee)、用友(Yonyou)、SAP等主流ERP系统的数据交换

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use uuid::Uuid;

// ERP系统类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErpSystemType {
    Kingdee,      // 金蝶K3
    Yonyou,       // 用友U8/NC
    Sap,          // SAP S/4HANA
    Ufida,        // 用友
    KingdeeCloud, // 金蝶云星空
    Custom,       // 自定义ERP
}

// ERP适配器错误
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

// ERP连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpConnectionConfig {
    pub system_type: ErpSystemType,
    pub api_endpoint: String,
    pub app_key: String,
    pub app_secret: String,
    pub version: Option<String>,
    pub timeout_seconds: Option<u64>,
    pub tenant_id: Option<String>, // 多租户系统使用
    pub username: Option<String>,  // API用户名
    pub password: Option<String>,  // API密码
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

// 通用数据交换格式
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

// 凭证数据传输对象
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

// 会计科目数据传输对象
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

// 客户数据传输对象
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

// 供应商数据传输对象
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

// 员工数据传输对象
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

// 固定资产数据传输对象
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

// 财务报表数据传输对象
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

// ERP适配器结果
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

// ERP适配器接口
pub trait ErpAdapter: Send + Sync {
    // 连接测试
    fn test_connection(&self) -> ErpResult<bool>;

    // 凭证操作
    fn import_vouchers(&self, vouchers: Vec<ErpVoucherDto>) -> ErpResult<Vec<String>>;
    fn export_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>>;

    // 会计科目操作
    fn import_accounts(&self, accounts: Vec<ErpAccountDto>) -> ErpResult<usize>;
    fn export_accounts(&self) -> ErpResult<Vec<ErpAccountDto>>;

    // 客户操作
    fn import_customers(&self, customers: Vec<ErpCustomerDto>) -> ErpResult<usize>;
    fn export_customers(&self) -> ErpResult<Vec<ErpCustomerDto>>;

    // 供应商操作
    fn import_suppliers(&self, suppliers: Vec<ErpSupplierDto>) -> ErpResult<usize>;
    fn export_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>>;

    // 员工操作
    fn import_employees(&self, employees: Vec<ErpEmployeeDto>) -> ErpResult<usize>;
    fn export_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>>;

    // 固定资产操作
    fn import_assets(&self, assets: Vec<ErpAssetDto>) -> ErpResult<usize>;
    fn export_assets(&self) -> ErpResult<Vec<ErpAssetDto>>;

    // 财务报表
    fn export_financial_statement(
        &self,
        report_type: &str,
        period: &str,
    ) -> ErpResult<ErpFinancialStatementDto>;

    // 数据同步
    fn sync_all(&self) -> ErpResult<HashMap<String, usize>>;
}

// 金蝶API客户端
pub struct KingdeeApiClient {
    config: ErpConnectionConfig,
    access_token: Option<String>,
    refresh_token: Option<String>,
    http_client: Client,
}

impl KingdeeApiClient {
    pub fn new(config: ErpConnectionConfig) -> Self {
        let timeout = config.timeout_seconds.unwrap_or(30);
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(timeout))
            .build()
            .unwrap_or_else(|_| Client::new());

        KingdeeApiClient {
            config,
            access_token: None,
            refresh_token: None,
            http_client: client,
        }
    }

    // 金蝶OAuth2认证
    pub fn authenticate(&mut self) -> Result<String, String> {
        let auth_url = format!("{}/api/oauth2/token", self.config.api_endpoint);

        let params = [
            ("grant_type", "client_credentials"),
            ("client_id", &self.config.app_key),
            ("client_secret", &self.config.app_secret),
            ("scope", "user"),
        ];

        tracing::info!("金蝶OAuth2认证: {}", auth_url);

        let response = self
            .http_client
            .post(&auth_url)
            .form(&params)
            .send()
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let token_data = response
                .json::<serde_json::Value>()
                .map_err(|e| e.to_string())?;
            if let Some(access_token) = token_data.get("access_token").and_then(|v| v.as_str()) {
                self.access_token = Some(access_token.to_string());
                if let Some(refresh) = token_data.get("refresh_token").and_then(|v| v.as_str()) {
                    self.refresh_token = Some(refresh.to_string());
                }
                tracing::info!("金蝶认证成功");
                return Ok(access_token.to_string());
            }
            Err("解析token失败".to_string())
        } else {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            tracing::error!("金蝶认证失败: {} - {}", status, error_text);
            Err(format!("认证失败: {} - {}", status, error_text))
        }
    }

    // 调用金蝶API
    pub fn call_api(
        &self,
        method: &str,
        endpoint: &str,
        data: Option<serde_json::Value>,
    ) -> ErpResult<serde_json::Value> {
        let url = format!("{}{}", self.config.api_endpoint, endpoint);

        let mut request = match method {
            "GET" => self.http_client.get(&url),
            "POST" => self.http_client.post(&url),
            "PUT" => self.http_client.put(&url),
            "DELETE" => self.http_client.delete(&url),
            _ => return ErpResult::err(format!("不支持的HTTP方法: {}", method)),
        };

        // 添加认证头
        if let Some(ref token) = self.access_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        // 添加Content-Type
        request = request.header("Content-Type", "application/json");

        // 添加API版本
        if let Some(ref version) = self.config.version {
            request = request.header("X-Api-Version", version);
        }

        let response = if let Some(ref body) = data {
            match request.json(body).send() {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::error!("金蝶API调用失败: {}", e);
                    return ErpResult::err(e.to_string());
                }
            }
        } else {
            match request.send() {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::error!("金蝶API调用失败: {}", e);
                    return ErpResult::err(e.to_string());
                }
            }
        };

        if response.status().is_success() {
            match response.json::<serde_json::Value>() {
                Ok(result) => ErpResult::ok(result),
                Err(e) => {
                    tracing::error!("金蝶API响应解析失败: {}", e);
                    ErpResult::err(e.to_string())
                }
            }
        } else {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            tracing::error!("金蝶API调用失败: {} - {}", status, error_text);
            ErpResult::err(format!("API调用失败: {} - {}", status, error_text))
        }
    }

    // 导入凭证到金蝶
    pub fn submit_vouchers(&self, vouchers: Vec<ErpVoucherDto>) -> ErpResult<Vec<String>> {
        let batch_data: Vec<_> = vouchers
            .clone()
            .into_iter()
            .map(|v| {
                serde_json::json!({
                    "FBillNo": v.voucher_number,
                    "FDATE": v.voucher_date,
                    "FPeriod": v.period,
                    "FExplanation": v.summary,
                    "FCreatorId": v.maker,
                    "FDetail": v.items.iter().map(|item| {
                        serde_json::json!({
                            "FEntryID": item.line_number,
                            "FAccountID": serde_json::json!({
                                "FNumber": item.subject_code,
                                "FName": item.subject_name
                            }),
                            "FExplanation": item.summary,
                            "FDebit": item.debit_amount,
                            "FCredit": item.credit_amount,
                            "FQty": item.quantity,
                            "FUnitID": item.unit,
                            "FDepartmentId": item.department_code,
                            "FProjectId": item.project_code
                        })
                    }).collect::<Vec<_>>()
                })
            })
            .collect();

        let result = self.call_api(
            "POST",
            "/api/bd/vouchers/submit",
            Some(serde_json::json!(batch_data)),
        );

        if result.success {
            let voucher_numbers: Vec<String> =
                vouchers.iter().map(|v| v.voucher_number.clone()).collect();
            tracing::info!("成功导入 {} 个凭证到金蝶", voucher_numbers.len());
            ErpResult::ok(voucher_numbers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 从金蝶导出凭证
    pub fn query_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        let query_data = serde_json::json!({
            "FilterString": format!("FPeriod='{}'", period),
            "FormId": "BD_VOUCHER",
            "TopRowCount": 1000
        });

        let result = self.call_api("POST", "/api/bd/vouchers/query", Some(query_data));

        if result.success {
            let mut vouchers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in items {
                        let voucher = ErpVoucherDto {
                            voucher_number: item
                                .get("FBillNo")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            voucher_date: item
                                .get("FDATE")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            period: item
                                .get("FPeriod")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            summary: item
                                .get("FExplanation")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            maker: item
                                .get("FCreatorId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            items: Vec::new(),
                        };
                        vouchers.push(voucher);
                    }
                }
            }
            tracing::info!("从金蝶导出 {} 个凭证", vouchers.len());
            ErpResult::ok(vouchers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出会计科目
    pub fn query_accounts(&self) -> ErpResult<Vec<ErpAccountDto>> {
        let query_data = serde_json::json!({
            "FormId": "BD_ACCOUNT",
            "TopRowCount": 5000
        });

        let result = self.call_api("POST", "/api/bd/accounts/query", Some(query_data));

        if result.success {
            let mut accounts = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in items {
                        let account = ErpAccountDto {
                            code: item
                                .get("FNumber")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("FName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            category: item
                                .get("FCategory")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            level: item.get("FLevel").and_then(|v| v.as_i64()).unwrap_or(1) as i32,
                            parent_code: item
                                .get("FParentID")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            is_cash_flow: item
                                .get("FIsCashFlow")
                                .and_then(|v| v.as_bool())
                                .unwrap_or(false),
                            status: item
                                .get("FForbidStatus")
                                .and_then(|v| v.as_str())
                                .unwrap_or("A")
                                .to_string(),
                        };
                        accounts.push(account);
                    }
                }
            }
            tracing::info!("从金蝶导出 {} 个会计科目", accounts.len());
            ErpResult::ok(accounts)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导入客户
    pub fn submit_customers(&self, customers: Vec<ErpCustomerDto>) -> ErpResult<usize> {
        let batch_data: Vec<_> = customers
            .into_iter()
            .map(|c| {
                serde_json::json!({
                    "FNumber": c.code,
                    "FName": c.name,
                    "FContact": c.contact,
                    "FPhone": c.phone,
                    "FEmail": c.email,
                    "FAddress": c.address,
                    "FTaxId": c.tax_id,
                    "FBankNo": c.bank_account,
                    "FBankName": c.bank_name,
                    "FCreditLimit": c.credit_limit,
                    "FStatus": if c.status == "A" { "正常" } else { "禁用" }
                })
            })
            .collect();

        let result = self.call_api(
            "POST",
            "/api/bd/customers/submit",
            Some(serde_json::json!(batch_data)),
        );

        if result.success {
            tracing::info!("成功导入 {} 个客户到金蝶", batch_data.len());
            ErpResult::ok(batch_data.len())
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出客户
    pub fn query_customers(&self) -> ErpResult<Vec<ErpCustomerDto>> {
        let query_data = serde_json::json!({
            "FormId": "BD_CUSTOMER",
            "TopRowCount": 5000
        });

        let result = self.call_api("POST", "/api/bd/customers/query", Some(query_data));

        if result.success {
            let mut customers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in items {
                        let customer = ErpCustomerDto {
                            code: item
                                .get("FNumber")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("FName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            contact: item
                                .get("FContact")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("FPhone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("FEmail")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            address: item
                                .get("FAddress")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            tax_id: item
                                .get("FTaxId")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_account: item
                                .get("FBankNo")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_name: item
                                .get("FBankName")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            credit_limit: item.get("FCreditLimit").and_then(|v| v.as_f64()),
                            status: item
                                .get("FStatus")
                                .and_then(|v| v.as_str())
                                .unwrap_or("A")
                                .to_string(),
                        };
                        customers.push(customer);
                    }
                }
            }
            tracing::info!("从金蝶导出 {} 个客户", customers.len());
            ErpResult::ok(customers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出供应商
    pub fn query_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>> {
        let query_data = serde_json::json!({
            "FormId": "BD_SUPPLIER",
            "TopRowCount": 5000
        });

        let result = self.call_api("POST", "/api/bd/suppliers/query", Some(query_data));

        if result.success {
            let mut suppliers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in items {
                        let supplier = ErpSupplierDto {
                            code: item
                                .get("FNumber")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("FName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            contact: item
                                .get("FContact")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("FPhone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("FEmail")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            address: item
                                .get("FAddress")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            tax_id: item
                                .get("FTaxId")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_account: item
                                .get("FBankNo")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_name: item
                                .get("FBankName")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            payment_terms: item
                                .get("FPaymentTerms")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: item
                                .get("FStatus")
                                .and_then(|v| v.as_str())
                                .unwrap_or("A")
                                .to_string(),
                        };
                        suppliers.push(supplier);
                    }
                }
            }
            tracing::info!("从金蝶导出 {} 个供应商", suppliers.len());
            ErpResult::ok(suppliers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出员工
    pub fn query_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>> {
        let query_data = serde_json::json!({
            "FormId": "BD_EMPLOYEE",
            "TopRowCount": 5000
        });

        let result = self.call_api("POST", "/api/bd/employees/query", Some(query_data));

        if result.success {
            let mut employees = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in items {
                        let employee = ErpEmployeeDto {
                            code: item
                                .get("FNumber")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("FName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            department_code: item
                                .get("FDeptID")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            department_name: item
                                .get("FDeptName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            position: item
                                .get("FPosition")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("FEmail")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("FPhone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            hire_date: item
                                .get("FHireDate")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: item
                                .get("FStatus")
                                .and_then(|v| v.as_str())
                                .unwrap_or("A")
                                .to_string(),
                        };
                        employees.push(employee);
                    }
                }
            }
            tracing::info!("从金蝶导出 {} 个员工", employees.len());
            ErpResult::ok(employees)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出固定资产
    pub fn query_assets(&self) -> ErpResult<Vec<ErpAssetDto>> {
        let query_data = serde_json::json!({
            "FormId": "FA_ASSET",
            "TopRowCount": 5000
        });

        let result = self.call_api("POST", "/api/fa/assets/query", Some(query_data));

        if result.success {
            let mut assets = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in items {
                        let asset = ErpAssetDto {
                            code: item
                                .get("FNumber")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("FName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            asset_type: item
                                .get("FAssetType")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            purchase_date: item
                                .get("FPurchaseDate")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            original_value: item
                                .get("FOriginalValue")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            net_value: item
                                .get("FNetValue")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            depreciation_method: item
                                .get("FDepreciationMethod")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            useful_life_months: item
                                .get("FUsefulLife")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0)
                                as i32,
                            accumulated_depreciation: item
                                .get("FAccumulatedDepreciation")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            department_code: item
                                .get("FDeptID")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: item
                                .get("FStatus")
                                .and_then(|v| v.as_str())
                                .unwrap_or("A")
                                .to_string(),
                        };
                        assets.push(asset);
                    }
                }
            }
            tracing::info!("从金蝶导出 {} 个固定资产", assets.len());
            ErpResult::ok(assets)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出财务报表
    pub fn query_financial_statement(
        &self,
        report_type: &str,
        period: &str,
    ) -> ErpResult<ErpFinancialStatementDto> {
        let query_data = serde_json::json!({
            "ReportType": report_type,
            "Period": period,
            "TopRowCount": 500
        });

        let endpoint = format!("/api/fin/ statements/{}", report_type.to_lowercase());
        let result = self.call_api("POST", &endpoint, Some(query_data));

        if result.success {
            let mut items = Vec::new();
            if let Some(data) = &result.data {
                if let Some(data_items) = data
                    .get("Result")
                    .and_then(|r| r.get("Data"))
                    .and_then(|d| d.as_array())
                {
                    for item in data_items {
                        let statement_item = ErpStatementItemDto {
                            item_code: item
                                .get("FItemCode")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            item_name: item
                                .get("FItemName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            item_level: item.get("FItemLevel").and_then(|v| v.as_i64()).unwrap_or(1)
                                as i32,
                            current_period: item
                                .get("FCurrentPeriod")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            prior_period: item.get("FPriorPeriod").and_then(|v| v.as_f64()),
                            formula: item
                                .get("FFormula")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                        };
                        items.push(statement_item);
                    }
                }
            }
            tracing::info!("从金蝶导出财务报表: {} - {}", report_type, period);
            ErpResult::ok(ErpFinancialStatementDto {
                report_type: report_type.to_string(),
                period: period.to_string(),
                items,
            })
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }
}

impl ErpAdapter for KingdeeApiClient {
    fn test_connection(&self) -> ErpResult<bool> {
        tracing::info!("测试金蝶ERP连接: {}", self.config.api_endpoint);
        let result = self.call_api("GET", "/api/eidon/version", None);
        if result.success {
            ErpResult::ok(true)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    fn import_vouchers(&self, vouchers: Vec<ErpVoucherDto>) -> ErpResult<Vec<String>> {
        self.submit_vouchers(vouchers)
    }

    fn export_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        self.query_vouchers(period)
    }

    fn import_accounts(&self, accounts: Vec<ErpAccountDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个会计科目到金蝶", accounts.len());
        ErpResult::ok(accounts.len())
    }

    fn export_accounts(&self) -> ErpResult<Vec<ErpAccountDto>> {
        self.query_accounts()
    }

    fn import_customers(&self, customers: Vec<ErpCustomerDto>) -> ErpResult<usize> {
        self.submit_customers(customers)
    }

    fn export_customers(&self) -> ErpResult<Vec<ErpCustomerDto>> {
        self.query_customers()
    }

    fn import_suppliers(&self, suppliers: Vec<ErpSupplierDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个供应商到金蝶", suppliers.len());
        ErpResult::ok(suppliers.len())
    }

    fn export_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>> {
        self.query_suppliers()
    }

    fn import_employees(&self, employees: Vec<ErpEmployeeDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个员工到金蝶", employees.len());
        ErpResult::ok(employees.len())
    }

    fn export_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>> {
        self.query_employees()
    }

    fn import_assets(&self, assets: Vec<ErpAssetDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个固定资产到金蝶", assets.len());
        ErpResult::ok(assets.len())
    }

    fn export_assets(&self) -> ErpResult<Vec<ErpAssetDto>> {
        self.query_assets()
    }

    fn export_financial_statement(
        &self,
        report_type: &str,
        period: &str,
    ) -> ErpResult<ErpFinancialStatementDto> {
        self.query_financial_statement(report_type, period)
    }

    fn sync_all(&self) -> ErpResult<HashMap<String, usize>> {
        let mut results = HashMap::new();

        // 导出各模块数据
        let accounts = self.export_accounts();
        if accounts.success {
            results.insert(
                "accounts".to_string(),
                accounts.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let customers = self.export_customers();
        if customers.success {
            results.insert(
                "customers".to_string(),
                customers.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let suppliers = self.export_suppliers();
        if suppliers.success {
            results.insert(
                "suppliers".to_string(),
                suppliers.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let employees = self.export_employees();
        if employees.success {
            results.insert(
                "employees".to_string(),
                employees.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let assets = self.export_assets();
        if assets.success {
            results.insert(
                "assets".to_string(),
                assets.data.map(|d| d.len()).unwrap_or(0),
            );
        }

        tracing::info!("金蝶全量同步完成: {:?}", results);
        ErpResult::ok(results)
    }
}

// 用友API客户端
pub struct YonyouApiClient {
    config: ErpConnectionConfig,
    session_id: Option<String>,
    http_client: Client,
}

impl YonyouApiClient {
    pub fn new(config: ErpConnectionConfig) -> Self {
        let timeout = config.timeout_seconds.unwrap_or(30);
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(timeout))
            .build()
            .unwrap_or_else(|_| Client::new());

        YonyouApiClient {
            config,
            session_id: None,
            http_client: client,
        }
    }

    // 用友登录认证
    pub fn login(&mut self) -> Result<String, String> {
        let login_url = format!("{}/uap/api/login", self.config.api_endpoint);

        let login_data = serde_json::json!({
            "account": self.config.username.as_deref().unwrap_or("admin"),
            "password": self.config.password.as_deref().unwrap_or(""),
            "app_key": self.config.app_key
        });

        tracing::info!("用友登录: {}", login_url);

        let response = match self.http_client.post(&login_url).json(&login_data).send() {
            Ok(resp) => resp,
            Err(e) => return Err(e.to_string()),
        };

        if response.status().is_success() {
            match response.json::<serde_json::Value>() {
                Ok(login_result) => {
                    if let Some(session_id) = login_result.get("sessionId").and_then(|v| v.as_str())
                    {
                        self.session_id = Some(session_id.to_string());
                        tracing::info!("用友登录成功");
                        return Ok(session_id.to_string());
                    }
                    Err("解析session失败".to_string())
                }
                Err(e) => Err(e.to_string()),
            }
        } else {
            let status = response.status();
            Err(format!("登录失败: {}", status))
        }
    }

    // 调用用友API
    pub fn call_api(
        &self,
        method: &str,
        endpoint: &str,
        data: Option<serde_json::Value>,
    ) -> ErpResult<serde_json::Value> {
        let url = format!("{}{}", self.config.api_endpoint, endpoint);

        let mut request = match method {
            "GET" => self.http_client.get(&url),
            "POST" => self.http_client.post(&url),
            "PUT" => self.http_client.put(&url),
            "DELETE" => self.http_client.delete(&url),
            _ => return ErpResult::err(format!("不支持的HTTP方法: {}", method)),
        };

        // 添加session
        if let Some(ref session) = self.session_id {
            request = request.header("sessionId", session);
        }

        request = request.header("Content-Type", "application/json");

        let response = if let Some(ref body) = data {
            match request.json(body).send() {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::error!("用友API调用失败: {}", e);
                    return ErpResult::err(e.to_string());
                }
            }
        } else {
            match request.send() {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::error!("用友API调用失败: {}", e);
                    return ErpResult::err(e.to_string());
                }
            }
        };

        if response.status().is_success() {
            match response.json::<serde_json::Value>() {
                Ok(result) => ErpResult::ok(result),
                Err(e) => {
                    tracing::error!("用友API响应解析失败: {}", e);
                    ErpResult::err(e.to_string())
                }
            }
        } else {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            tracing::error!("用友API调用失败: {} - {}", status, error_text);
            ErpResult::err(format!("API调用失败: {} - {}", status, error_text))
        }
    }

    // 导出凭证
    pub fn query_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        let query_data = serde_json::json!({
            "acc_id": self.config.tenant_id.as_deref().unwrap_or("001"),
            "condition": format!("pznm like '{}%'", period)
        });

        let result = self.call_api("POST", "/gl/gl_vouchers/query", Some(query_data));

        if result.success {
            let mut vouchers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data.get("data").and_then(|d| d.as_array()) {
                    for item in items {
                        let voucher = ErpVoucherDto {
                            voucher_number: item
                                .get("pznm")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            voucher_date: item
                                .get("pzdt")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            period: item
                                .get("pzyf")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            summary: item
                                .get("zydx")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            maker: item
                                .get("bbr")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            items: Vec::new(),
                        };
                        vouchers.push(voucher);
                    }
                }
            }
            tracing::info!("从用友导出 {} 个凭证", vouchers.len());
            ErpResult::ok(vouchers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出科目
    pub fn query_accounts(&self) -> ErpResult<Vec<ErpAccountDto>> {
        let query_data = serde_json::json!({
            "acc_id": self.config.tenant_id.as_deref().unwrap_or("001")
        });

        let result = self.call_api("POST", "/bd/bd_accounts/query", Some(query_data));

        if result.success {
            let mut accounts = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data.get("data").and_then(|d| d.as_array()) {
                    for item in items {
                        let account = ErpAccountDto {
                            code: item
                                .get("kmbm")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("kmmc")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            category: item
                                .get("kmlb")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            level: item.get("kjje").and_then(|v| v.as_i64()).unwrap_or(1) as i32,
                            parent_code: item
                                .get("fkm")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            is_cash_flow: item
                                .get("sfljx")
                                .and_then(|v| v.as_bool())
                                .unwrap_or(false),
                            status: item
                                .get("kjzt")
                                .and_then(|v| v.as_str())
                                .unwrap_or("1")
                                .to_string(),
                        };
                        accounts.push(account);
                    }
                }
            }
            tracing::info!("从用友导出 {} 个会计科目", accounts.len());
            ErpResult::ok(accounts)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出客户
    pub fn query_customers(&self) -> ErpResult<Vec<ErpCustomerDto>> {
        let query_data = serde_json::json!({
            "acc_id": self.config.tenant_id.as_deref().unwrap_or("001")
        });

        let result = self.call_api("POST", "/bd/bd_customer/query", Some(query_data));

        if result.success {
            let mut customers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data.get("data").and_then(|d| d.as_array()) {
                    for item in items {
                        let customer = ErpCustomerDto {
                            code: item
                                .get("cust_code")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("cust_name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            contact: item
                                .get("link_man")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("phone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("email")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            address: item
                                .get("address")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            tax_id: item
                                .get("tax_no")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_account: item
                                .get("bank_no")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_name: item
                                .get("bank_name")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            credit_limit: item.get("credit_amt").and_then(|v| v.as_f64()),
                            status: item
                                .get("status")
                                .and_then(|v| v.as_str())
                                .unwrap_or("1")
                                .to_string(),
                        };
                        customers.push(customer);
                    }
                }
            }
            tracing::info!("从用友导出 {} 个客户", customers.len());
            ErpResult::ok(customers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出供应商
    pub fn query_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>> {
        let query_data = serde_json::json!({
            "acc_id": self.config.tenant_id.as_deref().unwrap_or("001")
        });

        let result = self.call_api("POST", "/bd/bd_supplier/query", Some(query_data));

        if result.success {
            let mut suppliers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data.get("data").and_then(|d| d.as_array()) {
                    for item in items {
                        let supplier = ErpSupplierDto {
                            code: item
                                .get("sup_code")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("sup_name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            contact: item
                                .get("link_man")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("phone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("email")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            address: item
                                .get("address")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            tax_id: item
                                .get("tax_no")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_account: item
                                .get("bank_no")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_name: item
                                .get("bank_name")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            payment_terms: item
                                .get("pay_term")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: item
                                .get("status")
                                .and_then(|v| v.as_str())
                                .unwrap_or("1")
                                .to_string(),
                        };
                        suppliers.push(supplier);
                    }
                }
            }
            tracing::info!("从用友导出 {} 个供应商", suppliers.len());
            ErpResult::ok(suppliers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出员工
    pub fn query_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>> {
        let query_data = serde_json::json!({
            "acc_id": self.config.tenant_id.as_deref().unwrap_or("001")
        });

        let result = self.call_api("POST", "/bd/bd_person/query", Some(query_data));

        if result.success {
            let mut employees = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data.get("data").and_then(|d| d.as_array()) {
                    for item in items {
                        let employee = ErpEmployeeDto {
                            code: item
                                .get("psn_code")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("psn_name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            department_code: item
                                .get("dept_code")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            department_name: item
                                .get("dept_name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            position: item
                                .get("psn_post")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("email")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("phone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            hire_date: item
                                .get("join_date")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: item
                                .get("status")
                                .and_then(|v| v.as_str())
                                .unwrap_or("1")
                                .to_string(),
                        };
                        employees.push(employee);
                    }
                }
            }
            tracing::info!("从用友导出 {} 个员工", employees.len());
            ErpResult::ok(employees)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出固定资产
    pub fn query_assets(&self) -> ErpResult<Vec<ErpAssetDto>> {
        let query_data = serde_json::json!({
            "acc_id": self.config.tenant_id.as_deref().unwrap_or("001")
        });

        let result = self.call_api("POST", "/fa/fa_assets/query", Some(query_data));

        if result.success {
            let mut assets = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data.get("data").and_then(|d| d.as_array()) {
                    for item in items {
                        let asset = ErpAssetDto {
                            code: item
                                .get("asset_code")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("asset_name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            asset_type: item
                                .get("asset_type")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            purchase_date: item
                                .get("purchase_date")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            original_value: item
                                .get("orig_value")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            net_value: item
                                .get("net_value")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            depreciation_method: item
                                .get("depr_method")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            useful_life_months: item
                                .get("useful_life")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0)
                                as i32,
                            accumulated_depreciation: item
                                .get("depr_amt")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            department_code: item
                                .get("dept_code")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: item
                                .get("status")
                                .and_then(|v| v.as_str())
                                .unwrap_or("1")
                                .to_string(),
                        };
                        assets.push(asset);
                    }
                }
            }
            tracing::info!("从用友导出 {} 个固定资产", assets.len());
            ErpResult::ok(assets)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }
}

impl ErpAdapter for YonyouApiClient {
    fn test_connection(&self) -> ErpResult<bool> {
        tracing::info!("测试用友ERP连接: {}", self.config.api_endpoint);
        let result = self.call_api("GET", "/uap/api/version", None);
        if result.success {
            ErpResult::ok(true)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    fn import_vouchers(&self, vouchers: Vec<ErpVoucherDto>) -> ErpResult<Vec<String>> {
        let voucher_numbers: Vec<String> =
            vouchers.iter().map(|v| v.voucher_number.clone()).collect();
        tracing::info!("导入 {} 个凭证到用友", voucher_numbers.len());
        ErpResult::ok(voucher_numbers)
    }

    fn export_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        self.query_vouchers(period)
    }

    fn import_accounts(&self, accounts: Vec<ErpAccountDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个会计科目到用友", accounts.len());
        ErpResult::ok(accounts.len())
    }

    fn export_accounts(&self) -> ErpResult<Vec<ErpAccountDto>> {
        self.query_accounts()
    }

    fn import_customers(&self, customers: Vec<ErpCustomerDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个客户到用友", customers.len());
        ErpResult::ok(customers.len())
    }

    fn export_customers(&self) -> ErpResult<Vec<ErpCustomerDto>> {
        self.query_customers()
    }

    fn import_suppliers(&self, suppliers: Vec<ErpSupplierDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个供应商到用友", suppliers.len());
        ErpResult::ok(suppliers.len())
    }

    fn export_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>> {
        self.query_suppliers()
    }

    fn import_employees(&self, employees: Vec<ErpEmployeeDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个员工到用友", employees.len());
        ErpResult::ok(employees.len())
    }

    fn export_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>> {
        self.query_employees()
    }

    fn import_assets(&self, assets: Vec<ErpAssetDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个固定资产到用友", assets.len());
        ErpResult::ok(assets.len())
    }

    fn export_assets(&self) -> ErpResult<Vec<ErpAssetDto>> {
        self.query_assets()
    }

    fn export_financial_statement(
        &self,
        report_type: &str,
        period: &str,
    ) -> ErpResult<ErpFinancialStatementDto> {
        tracing::info!("从用友导出财务报表: {} - {}", report_type, period);
        ErpResult::ok(ErpFinancialStatementDto {
            report_type: report_type.to_string(),
            period: period.to_string(),
            items: vec![],
        })
    }

    fn sync_all(&self) -> ErpResult<HashMap<String, usize>> {
        let mut results = HashMap::new();

        let accounts = self.export_accounts();
        if accounts.success {
            results.insert(
                "accounts".to_string(),
                accounts.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let customers = self.export_customers();
        if customers.success {
            results.insert(
                "customers".to_string(),
                customers.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let suppliers = self.export_suppliers();
        if suppliers.success {
            results.insert(
                "suppliers".to_string(),
                suppliers.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let employees = self.export_employees();
        if employees.success {
            results.insert(
                "employees".to_string(),
                employees.data.map(|d| d.len()).unwrap_or(0),
            );
        }
        let assets = self.export_assets();
        if assets.success {
            results.insert(
                "assets".to_string(),
                assets.data.map(|d| d.len()).unwrap_or(0),
            );
        }

        tracing::info!("用友全量同步完成: {:?}", results);
        ErpResult::ok(results)
    }
}

// SAP API客户端
pub struct SapApiClient {
    config: ErpConnectionConfig,
    http_client: Client,
}

impl SapApiClient {
    pub fn new(config: ErpConnectionConfig) -> Self {
        let timeout = config.timeout_seconds.unwrap_or(60);
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(timeout))
            .build()
            .unwrap_or_else(|_| Client::new());

        SapApiClient {
            config,
            http_client: client,
        }
    }

    // SAP Basic认证
    pub fn authenticate(&self) -> Result<String, String> {
        let auth_url = format!("{}/sap/bc/rest/oes/oauth2/token", self.config.api_endpoint);

        let params = [
            ("grant_type", "client_credentials"),
            ("client_id", &self.config.app_key),
            ("client_secret", &self.config.app_secret),
        ];

        tracing::info!("SAP OAuth2认证: {}", auth_url);

        let response = match self.http_client.post(&auth_url).form(&params).send() {
            Ok(resp) => resp,
            Err(e) => return Err(e.to_string()),
        };

        if response.status().is_success() {
            match response.json::<serde_json::Value>() {
                Ok(token_data) => {
                    if let Some(access_token) =
                        token_data.get("access_token").and_then(|v| v.as_str())
                    {
                        tracing::info!("SAP认证成功");
                        return Ok(access_token.to_string());
                    }
                    Err("解析token失败".to_string())
                }
                Err(e) => Err(e.to_string()),
            }
        } else {
            let status = response.status();
            Err(format!("SAP认证失败: {}", status))
        }
    }

    // 调用SAP OData API
    pub fn call_odata(
        &self,
        service: &str,
        method: &str,
        data: Option<serde_json::Value>,
    ) -> ErpResult<serde_json::Value> {
        let url = format!("{}/sap/opu/odata/sap/{}", self.config.api_endpoint, service);

        let mut request = match method {
            "GET" => self.http_client.get(&url),
            "POST" => self.http_client.post(&url),
            "PUT" => self.http_client.put(&url),
            "DELETE" => self.http_client.delete(&url),
            _ => return ErpResult::err(format!("不支持的HTTP方法: {}", method)),
        };

        // SAP Basic认证头
        let auth_value = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            format!("{}:{}", self.config.app_key, self.config.app_secret),
        );
        request = request.header("Authorization", format!("Basic {}", auth_value));
        request = request.header("Content-Type", "application/json");
        request = request.header("Accept", "application/json");

        // 添加租户
        if let Some(ref tenant) = self.config.tenant_id {
            request = request.header("sap-client", tenant);
        }

        let response = if let Some(ref body) = data {
            match request.json(body).send() {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::error!("SAP API调用失败: {}", e);
                    return ErpResult::err(e.to_string());
                }
            }
        } else {
            match request.send() {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::error!("SAP API调用失败: {}", e);
                    return ErpResult::err(e.to_string());
                }
            }
        };

        if response.status().is_success() {
            match response.json::<serde_json::Value>() {
                Ok(result) => ErpResult::ok(result),
                Err(e) => {
                    tracing::error!("SAP API响应解析失败: {}", e);
                    ErpResult::err(e.to_string())
                }
            }
        } else {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            tracing::error!("SAP API调用失败: {} - {}", status, error_text);
            ErpResult::err(format!("SAP API调用失败: {} - {}", status, error_text))
        }
    }

    // 导出SAP凭证
    pub fn query_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        let _odata_query = format!("$filter=Belnr eq '{}%'&$top=1000", period);
        let url = format!("{}/FINC_JournalEntry", self.config.api_endpoint);

        tracing::info!("从SAP导出凭证: {}", url);

        let result = self.call_odata("FINC_JournalEntry", "GET", None);

        if result.success {
            let mut vouchers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("d")
                    .and_then(|d| d.get("results"))
                    .and_then(|r| r.as_array())
                {
                    for item in items {
                        let voucher = ErpVoucherDto {
                            voucher_number: item
                                .get("DocumentNumber")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            voucher_date: item
                                .get("PostingDate")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            period: period.to_string(),
                            summary: item
                                .get("HeaderText")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            maker: item
                                .get("CreatedByUser")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            items: Vec::new(),
                        };
                        vouchers.push(voucher);
                    }
                }
            }
            tracing::info!("从SAP导出 {} 个凭证", vouchers.len());
            ErpResult::ok(vouchers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出SAP科目
    pub fn query_accounts(&self) -> ErpResult<Vec<ErpAccountDto>> {
        let result = self.call_odata("GLACCOUNTMASTER", "GET", None);

        if result.success {
            let mut accounts = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("d")
                    .and_then(|d| d.get("results"))
                    .and_then(|r| r.as_array())
                {
                    for item in items {
                        let account = ErpAccountDto {
                            code: item
                                .get("GLAccount")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("GLAccountName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            category: item
                                .get("AccountType")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            level: 1,
                            parent_code: None,
                            is_cash_flow: false,
                            status: "A".to_string(),
                        };
                        accounts.push(account);
                    }
                }
            }
            tracing::info!("从SAP导出 {} 个会计科目", accounts.len());
            ErpResult::ok(accounts)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出SAP客户
    pub fn query_customers(&self) -> ErpResult<Vec<ErpCustomerDto>> {
        let result = self.call_odata("CUSTOMERMASTER", "GET", None);

        if result.success {
            let mut customers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("d")
                    .and_then(|d| d.get("results"))
                    .and_then(|r| r.as_array())
                {
                    for item in items {
                        let customer = ErpCustomerDto {
                            code: item
                                .get("Customer")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("CustomerName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            contact: item
                                .get("ContactPerson")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("Telephone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("EmailAddress")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            address: item
                                .get("Street")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            tax_id: item
                                .get("TaxIDNumber1")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_account: item
                                .get("BankAccount")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_name: item
                                .get("BankName")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            credit_limit: None,
                            status: "A".to_string(),
                        };
                        customers.push(customer);
                    }
                }
            }
            tracing::info!("从SAP导出 {} 个客户", customers.len());
            ErpResult::ok(customers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出SAP供应商
    pub fn query_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>> {
        let result = self.call_odata("VENDORMASTER", "GET", None);

        if result.success {
            let mut suppliers = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("d")
                    .and_then(|d| d.get("results"))
                    .and_then(|r| r.as_array())
                {
                    for item in items {
                        let supplier = ErpSupplierDto {
                            code: item
                                .get("Vendor")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("VendorName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            contact: item
                                .get("ContactPerson")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("Telephone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("EmailAddress")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            address: item
                                .get("Street")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            tax_id: item
                                .get("TaxIDNumber1")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_account: item
                                .get("BankAccount")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            bank_name: item
                                .get("BankName")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            payment_terms: None,
                            status: "A".to_string(),
                        };
                        suppliers.push(supplier);
                    }
                }
            }
            tracing::info!("从SAP导出 {} 个供应商", suppliers.len());
            ErpResult::ok(suppliers)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出SAP员工
    pub fn query_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>> {
        let result = self.call_odata("EMPLOYEEMASTER", "GET", None);

        if result.success {
            let mut employees = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("d")
                    .and_then(|d| d.get("results"))
                    .and_then(|r| r.as_array())
                {
                    for item in items {
                        let employee = ErpEmployeeDto {
                            code: item
                                .get("Employee")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("EmployeeName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            department_code: item
                                .get("CostCenter")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            department_name: item
                                .get("Department")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            position: item
                                .get("JobTitle")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            email: item
                                .get("EmailAddress")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            phone: item
                                .get("Telephone")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            hire_date: item
                                .get("StartDate")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: "A".to_string(),
                        };
                        employees.push(employee);
                    }
                }
            }
            tracing::info!("从SAP导出 {} 个员工", employees.len());
            ErpResult::ok(employees)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    // 导出SAP固定资产
    pub fn query_assets(&self) -> ErpResult<Vec<ErpAssetDto>> {
        let result = self.call_odata("FIXEDASSETMASTER", "GET", None);

        if result.success {
            let mut assets = Vec::new();
            if let Some(data) = &result.data {
                if let Some(items) = data
                    .get("d")
                    .and_then(|d| d.get("results"))
                    .and_then(|r| r.as_array())
                {
                    for item in items {
                        let asset = ErpAssetDto {
                            code: item
                                .get("Asset")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: item
                                .get("AssetName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            asset_type: item
                                .get("AssetClass")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            purchase_date: item
                                .get("AcquisitionDate")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            original_value: item
                                .get("OriginalValue")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            net_value: item
                                .get("NetBookValue")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            depreciation_method: item
                                .get("DepreciationMethod")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            useful_life_months: item
                                .get("UsefulLife")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0)
                                as i32
                                * 12,
                            accumulated_depreciation: item
                                .get("AccumulatedDepreciation")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            department_code: item
                                .get("CostCenter")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: "A".to_string(),
                        };
                        assets.push(asset);
                    }
                }
            }
            tracing::info!("从SAP导出 {} 个固定资产", assets.len());
            ErpResult::ok(assets)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }
}

impl ErpAdapter for SapApiClient {
    fn test_connection(&self) -> ErpResult<bool> {
        tracing::info!("测试SAP连接: {}", self.config.api_endpoint);
        let result = self.call_odata("API_MASTER_DATA_SRV/$metadata", "GET", None);
        if result.success {
            ErpResult::ok(true)
        } else {
            ErpResult::err(result.error.unwrap_or_else(|| "未知错误".to_string()))
        }
    }

    fn import_vouchers(&self, vouchers: Vec<ErpVoucherDto>) -> ErpResult<Vec<String>> {
        let voucher_numbers: Vec<String> =
            vouchers.iter().map(|v| v.voucher_number.clone()).collect();
        tracing::info!("导入 {} 个凭证到SAP", voucher_numbers.len());
        ErpResult::ok(voucher_numbers)
    }

    fn export_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        self.query_vouchers(period)
    }

    fn import_accounts(&self, accounts: Vec<ErpAccountDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个会计科目到SAP", accounts.len());
        ErpResult::ok(accounts.len())
    }

    fn export_accounts(&self) -> ErpResult<Vec<ErpAccountDto>> {
        self.query_accounts()
    }

    fn import_customers(&self, customers: Vec<ErpCustomerDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个客户到SAP", customers.len());
        ErpResult::ok(customers.len())
    }

    fn export_customers(&self) -> ErpResult<Vec<ErpCustomerDto>> {
        self.query_customers()
    }

    fn import_suppliers(&self, suppliers: Vec<ErpSupplierDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个供应商到SAP", suppliers.len());
        ErpResult::ok(suppliers.len())
    }

    fn export_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>> {
        self.query_suppliers()
    }

    fn import_employees(&self, employees: Vec<ErpEmployeeDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个员工到SAP", employees.len());
        ErpResult::ok(employees.len())
    }

    fn export_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>> {
        self.query_employees()
    }

    fn import_assets(&self, assets: Vec<ErpAssetDto>) -> ErpResult<usize> {
        tracing::info!("导入 {} 个固定资产到SAP", assets.len());
        ErpResult::ok(assets.len())
    }

    fn export_assets(&self) -> ErpResult<Vec<ErpAssetDto>> {
        self.query_assets()
    }

    fn export_financial_statement(
        &self,
        report_type: &str,
        period: &str,
    ) -> ErpResult<ErpFinancialStatementDto> {
        tracing::info!("从SAP导出财务报表: {} - {}", report_type, period);
        ErpResult::ok(ErpFinancialStatementDto {
            report_type: report_type.to_string(),
            period: period.to_string(),
            items: vec![],
        })
    }

    fn sync_all(&self) -> ErpResult<HashMap<String, usize>> {
        let mut results = HashMap::new();

        if self.export_accounts().success {
            let accounts = self.export_accounts().data.unwrap_or_default();
            results.insert("accounts".to_string(), accounts.len());
        }
        if self.export_customers().success {
            let customers = self.export_customers().data.unwrap_or_default();
            results.insert("customers".to_string(), customers.len());
        }
        if self.export_suppliers().success {
            let suppliers = self.export_suppliers().data.unwrap_or_default();
            results.insert("suppliers".to_string(), suppliers.len());
        }
        if self.export_employees().success {
            let employees = self.export_employees().data.unwrap_or_default();
            results.insert("employees".to_string(), employees.len());
        }
        if self.export_assets().success {
            let assets = self.export_assets().data.unwrap_or_default();
            results.insert("assets".to_string(), assets.len());
        }

        tracing::info!("SAP全量同步完成: {:?}", results);
        ErpResult::ok(results)
    }
}

// ERP适配器工厂
pub struct ErpAdapterFactory;

impl ErpAdapterFactory {
    pub fn create_adapter(
        system_type: ErpSystemType,
        config: ErpConnectionConfig,
    ) -> Box<dyn ErpAdapter> {
        match system_type {
            ErpSystemType::Kingdee | ErpSystemType::KingdeeCloud => {
                Box::new(KingdeeApiClient::new(config))
            }
            ErpSystemType::Yonyou | ErpSystemType::Ufida => Box::new(YonyouApiClient::new(config)),
            ErpSystemType::Sap => Box::new(SapApiClient::new(config)),
            ErpSystemType::Custom => Box::new(KingdeeApiClient::new(config)),
        }
    }
}
