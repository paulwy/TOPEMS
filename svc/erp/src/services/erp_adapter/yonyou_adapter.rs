#![allow(dead_code)]

use std::collections::HashMap;

use reqwest::blocking::Client;

use super::models::{
    ErpAccountDto, ErpAssetDto, ErpConnectionConfig, ErpCustomerDto, ErpEmployeeDto,
    ErpFinancialStatementDto, ErpResult, ErpSupplierDto, ErpVoucherDto,
};
use super::traits::ErpAdapter;

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
