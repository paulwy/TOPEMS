use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

use crate::models::material::{
    CreateCustomerRequest, CreateInventoryRequest, CreateMaterialRequest, CreateSupplierRequest,
    Customer, Inventory, Material, Supplier,
};
use crate::models::{Asset, CreateAssetRequest, UpdateAssetRequest};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FixedAsset {
    pub id: Uuid,
    pub asset_code: String,
    pub asset_name: String,
    pub asset_type: String,
    pub asset_category: String,
    pub purchase_date: Option<DateTime<Utc>>,
    pub original_value: f64,
    pub accumulated_depreciation: f64,
    pub net_value: f64,
    pub depreciation_method: String,
    pub useful_life_months: i32,
    pub depreciation_period: String,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub location: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Budget {
    pub id: Uuid,
    pub organization_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: String,
    pub total_budget: sqlx::types::Decimal,
    pub used_amount: sqlx::types::Decimal,
    pub remaining_amount: sqlx::types::Decimal,
    pub usage_rate: sqlx::types::Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub applicant_name: Option<String>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: f64,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub reimbursed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BankAccount {
    pub id: Uuid,
    pub company_id: Uuid,
    pub bank_name: String,
    pub branch_name: Option<String>,
    pub account_number: String,
    pub account_name: String,
    pub account_type: String,
    pub currency: String,
    pub tax_registration_number: Option<String>,
    pub opening_date: DateTime<Utc>,
    pub balance: f64,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BankTransaction {
    pub id: Uuid,
    pub bank_account_id: Uuid,
    pub transaction_type: String,
    pub amount: f64,
    pub balance_before: f64,
    pub balance_after: f64,
    pub summary: Option<String>,
    pub reference_number: Option<String>,
    pub transaction_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Receivable {
    pub id: Uuid,
    pub invoice_number: String,
    pub customer_name: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub received_amount: f64,
    pub payment_schedule: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Payable {
    pub id: Uuid,
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub paid_amount: f64,
    pub payment_schedule: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AccountingSubject {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: i32,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: bool,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OpeningBalance {
    pub id: Uuid,
    pub company_id: Uuid,
    pub subject_code: String,
    pub subject_name: String,
    pub period: String,
    pub debit_balance: f64,
    pub credit_balance: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MeetingRoom {
    pub id: Uuid,
    pub name: String,
    pub capacity: i32,
    pub location: Option<String>,
    pub facilities: Option<Vec<String>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MeetingBooking {
    pub id: Uuid,
    pub room_id: Uuid,
    pub room_name: String,
    pub title: String,
    pub organizer: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Announcement {
    pub id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub author: String,
    pub status: String,
    pub priority: Option<String>,
    pub publish_at: Option<DateTime<Utc>>,
    pub expire_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Vehicle {
    pub id: Uuid,
    pub plate_number: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub status: String,
    pub driver: Option<String>,
    pub last_service: Option<DateTime<Utc>>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VehicleRequest {
    pub id: Uuid,
    pub vehicle_id: Uuid,
    pub vehicle_plate: String,
    pub requester: String,
    pub purpose: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub driver_required: bool,
    pub status: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::asset::list_assets,
        crate::modules::asset::create_asset,
        crate::modules::asset::get_asset,
        crate::modules::material::list_materials,
        crate::modules::material::create_material,
    ),
    components(
        schemas(
            Asset,
            CreateAssetRequest,
            UpdateAssetRequest,
            Material,
            CreateMaterialRequest,
            Customer,
            CreateCustomerRequest,
            Supplier,
            CreateSupplierRequest,
            Inventory,
            CreateInventoryRequest,
            FixedAsset,
            Budget,
            Expense,
            BankAccount,
            BankTransaction,
            Receivable,
            Payable,
            AccountingSubject,
            OpeningBalance,
            MeetingRoom,
            MeetingBooking,
            Announcement,
            Vehicle,
            VehicleRequest,
        ),
    ),
    tags(
        (name = "ERP", description = "企业资源计划系统 API"),
        (name = "Health", description = "健康检查接口"),
        (name = "Metrics", description = "服务指标接口"),
        (name = "Assets", description = "资产管理接口"),
        (name = "Finance", description = "财务管理接口"),
        (name = "Voucher", description = "凭证管理接口"),
        (name = "Audit", description = "审计日志接口"),
        (name = "Dict", description = "数据字典接口"),
    ),
    info(
        title = "TOPEMS-ERP API",
        version = "1.0.0",
        description = "TOPEMS 企业资源计划系统 API 文档\n\n## 功能模块\n\n- **资产管理**: 资产的增删改查、状态管理\n- **财务管理**: 科目管理、预算管理、费用管理\n- **凭证管理**: 财务凭证的创建和审核\n- **审计日志**: 操作记录和审计追踪\n- **数据字典**: 系统配置数据管理",
    ),
    servers(
        (url = "http://localhost:8009", description = "本地开发环境"),
        (url = "http://erp.topems.local", description = "测试环境"),
        (url = "http://erp.topems.prod", description = "生产环境"),
    )
)]
pub struct ErpApiDoc;
