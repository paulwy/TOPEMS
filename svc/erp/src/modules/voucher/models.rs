#![allow(dead_code)]

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize, serde::Serialize)]
pub struct ApproveVoucherRequest {
    pub checker_id: Option<uuid::Uuid>,
    pub checker_name: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize, serde::Serialize)]
pub struct PostVoucherRequest {
    pub bookkeeper_id: Option<uuid::Uuid>,
    pub bookkeeper_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VoucherTemplateQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub r#type: Option<String>,
    pub module: Option<String>,
    pub isactive: Option<bool>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenerationRuleQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub source_module: Option<String>,
    pub isactive: Option<bool>,
}
