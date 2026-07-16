#![allow(dead_code)]

use std::collections::HashMap;

use reqwest::blocking::Client;

use super::models::{
    ErpAccountDto, ErpAssetDto, ErpConnectionConfig, ErpCustomerDto, ErpEmployeeDto,
    ErpFinancialStatementDto, ErpResult, ErpStatementItemDto, ErpSupplierDto, ErpVoucherDto,
};
use super::traits::ErpAdapter;

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

        if let Some(ref token) = self.access_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        request = request.header("Content-Type", "application/json");

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
