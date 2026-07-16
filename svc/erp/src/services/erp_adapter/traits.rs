#![allow(dead_code)]

use std::collections::HashMap;

use super::models::{
    ErpAccountDto, ErpAssetDto, ErpCustomerDto, ErpEmployeeDto, ErpFinancialStatementDto,
    ErpResult, ErpSupplierDto, ErpVoucherDto,
};

pub trait ErpAdapter: Send + Sync {
    fn test_connection(&self) -> ErpResult<bool>;

    fn import_vouchers(&self, vouchers: Vec<ErpVoucherDto>) -> ErpResult<Vec<String>>;
    fn export_vouchers(&self, period: &str) -> ErpResult<Vec<ErpVoucherDto>>;

    fn import_accounts(&self, accounts: Vec<ErpAccountDto>) -> ErpResult<usize>;
    fn export_accounts(&self) -> ErpResult<Vec<ErpAccountDto>>;

    fn import_customers(&self, customers: Vec<ErpCustomerDto>) -> ErpResult<usize>;
    fn export_customers(&self) -> ErpResult<Vec<ErpCustomerDto>>;

    fn import_suppliers(&self, suppliers: Vec<ErpSupplierDto>) -> ErpResult<usize>;
    fn export_suppliers(&self) -> ErpResult<Vec<ErpSupplierDto>>;

    fn import_employees(&self, employees: Vec<ErpEmployeeDto>) -> ErpResult<usize>;
    fn export_employees(&self) -> ErpResult<Vec<ErpEmployeeDto>>;

    fn import_assets(&self, assets: Vec<ErpAssetDto>) -> ErpResult<usize>;
    fn export_assets(&self) -> ErpResult<Vec<ErpAssetDto>>;

    fn export_financial_statement(
        &self,
        report_type: &str,
        period: &str,
    ) -> ErpResult<ErpFinancialStatementDto>;

    fn sync_all(&self) -> ErpResult<HashMap<String, usize>>;
}
