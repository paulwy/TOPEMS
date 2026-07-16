#![allow(dead_code)]

pub mod accounting_subjects;
pub mod generation;
pub mod models;
pub mod routes;
pub mod templates;
pub mod vouchers;

use super::ApiState;

pub use models::{
    ApproveVoucherRequest, GenerationRuleQueryParams, PaginationParams, PostVoucherRequest,
    VoucherTemplateQueryParams,
};

pub use routes::create_routes;

pub use accounting_subjects::{
    create_subject, delete_subject, get_subject, list_subjects, update_subject,
};

pub use vouchers::{
    approve_voucher, create_voucher, delete_voucher, get_voucher, get_voucher_items,
    import_u8_vouchers, list_vouchers, post_voucher, unpost_voucher, update_voucher,
};

pub use templates::{
    add_voucher_template_entry, copy_voucher_template, create_voucher_template,
    delete_voucher_template, delete_voucher_template_entry, get_voucher_template,
    list_voucher_templates, reorder_voucher_template_entries, set_default_voucher_template,
    toggle_voucher_template, update_voucher_template, update_voucher_template_entry,
};

pub use generation::{
    auto_generate_vouchers, batch_generate_vouchers, create_generation_rule,
    delete_generation_rule, generate_voucher_from_source, get_generation_rule,
    get_template_usage_stats, list_generation_rules, match_voucher_template,
    preview_generated_vouchers, toggle_generation_rule, update_generation_rule,
};
