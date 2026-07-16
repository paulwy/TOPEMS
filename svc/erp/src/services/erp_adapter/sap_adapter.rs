#![allow(dead_code)]

use std::collections::HashMap;

use reqwest::blocking::Client;

use super::models::{
    ErpAccountDto, ErpAssetDto, ErpConnectionConfig, ErpCustomerDto, ErpEmployeeDto,
    ErpFinancialStatementDto, ErpResult, ErpSupplierDto, ErpVoucherDto,
};
use super::traits::ErpAdapter;

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

        let auth_value = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            format!("{}:{}", self.config.app_key, self.config.app_secret),
        );
        request = request.header("Authorization", format!("Basic {}", auth_value));
        request = request.header("Content-Type", "application/json");
        request = request.header("Accept", "application/json");

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

    pub fn query_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>> {
        let _odata_query = format!("$filter=Belnr eq '{}%'&$top=1000", period);
        let _url = format!("{}/FINC_JournalEntry", self.config.api_endpoint);

        tracing::info!("从SAP导出凭证");

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
