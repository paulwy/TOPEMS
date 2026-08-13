// CRM 服务 OpenAPI 文档
use crate::models::{
    AddTagToCustomerRequest, Contact, CreateContactRequest, CreateCustomerRequest,
    CreateInteractionRequest, CreateOpportunityRequest, CreateTagRequest, Customer,
    CustomerWithTags, Interaction, Opportunity, Tag, UpdateContactRequest, UpdateCustomerRequest,
    UpdateInteractionRequest, UpdateOpportunityRequest, UpdateTagRequest,
};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::customer::list_customers,
        crate::modules::customer::create_customer,
        crate::modules::customer::get_customer,
        crate::modules::customer::update_customer,
        crate::modules::customer::delete_customer,
        crate::modules::customer::batch_delete_customers,
        crate::modules::customer::start_customer_approval,
        crate::modules::customer::approve_customer,
        crate::modules::customer::reject_customer,
        // crate::modules::contact::list_contacts,
        // crate::modules::contact::create_contact,
        // crate::modules::opportunity::list_opportunities,
        // crate::modules::opportunity::create_opportunity,
    ),
    components(
        schemas(
            Customer,
            CreateCustomerRequest,
            UpdateCustomerRequest,
            Contact,
            CreateContactRequest,
            UpdateContactRequest,
            Opportunity,
            CreateOpportunityRequest,
            UpdateOpportunityRequest,
            Interaction,
            CreateInteractionRequest,
            UpdateInteractionRequest,
            Tag,
            CreateTagRequest,
            UpdateTagRequest,
            AddTagToCustomerRequest,
            CustomerWithTags,
        ),
    ),
    tags(
        (name = "customer", description = "客户管理 API"),
        (name = "contact", description = "联系人 API"),
        (name = "opportunity", description = "商机 API"),
        (name = "interaction", description = "交互记录 API"),
        (name = "tag", description = "标签 API"),
        (name = "audit", description = "审计日志 API"),
    ),
    info(
        title = "TOPEMS CRM API",
        version = "1.0.0",
        description = "客户关系管理系统 API - 包含客户管理、商机管理、交互记录等功能"
    )
)]
pub struct CrmApiDoc;

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    #[test]
    fn extract_openapi_spec() {
        let spec = CrmApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).unwrap();
        std::fs::write("/tmp/topems-crm-openapi.json", json).unwrap();
    }
}
