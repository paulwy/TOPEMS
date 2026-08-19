pub mod aftersales;
pub mod app_state;
pub mod audit_log;
pub mod billing;
pub mod contact;
pub mod customer;
pub mod customer_scoring;
pub mod interaction;
pub mod opportunity;
pub mod sales_forecast;
pub mod tag;

pub use audit_log::AuditLog;
pub use billing::{BillingQueryParams, BillingRecord, UpdateBillingRequest};
pub use contact::{Contact, CreateContactRequest, UpdateContactRequest};
pub use customer::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
pub use interaction::{CreateInteractionRequest, Interaction, UpdateInteractionRequest};
pub use opportunity::{CreateOpportunityRequest, Opportunity, UpdateOpportunityRequest};
pub use tag::{AddTagToCustomerRequest, CreateTagRequest, CustomerWithTags, Tag, UpdateTagRequest};

// V19.5: 启用 aftersales 模块编译（此前缺失模型导致未编译）
pub use aftersales::{
    CreateReturnItemRequest, CreateReturnRequest, Return, ReturnActionRequest, ReturnItem,
    ReturnQuery, UpdateReturnRequest,
};
