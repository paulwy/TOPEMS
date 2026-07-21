#![allow(dead_code)]

use axum::{routing::*, Router};

use super::accounting_subjects::*;
use super::generation::*;
use super::templates::*;
use super::vouchers::*;
use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/accounting-subjects",
            get(list_subjects).post(create_subject),
        )
        .route(
            "/accounting-subjects/{id}",
            get(get_subject).put(update_subject).delete(delete_subject),
        )
        .route("/vouchers", get(list_vouchers).post(create_voucher))
        .route(
            "/vouchers/{id}",
            get(get_voucher).put(update_voucher).delete(delete_voucher),
        )
        .route("/vouchers/{id}/items", get(get_voucher_items))
        .route("/vouchers/{id}/approve", post(approve_voucher))
        .route("/vouchers/{id}/post", post(post_voucher))
        .route("/vouchers/{id}/unpost", post(unpost_voucher))
        .route("/vouchers/import/u8", post(import_u8_vouchers))
        .route(
            "/voucher/templates",
            get(list_voucher_templates).post(create_voucher_template),
        )
        .route(
            "/voucher/templates/{template_id}",
            get(get_voucher_template)
                .put(update_voucher_template)
                .delete(delete_voucher_template),
        )
        .route(
            "/voucher/templates/{template_id}/copy",
            post(copy_voucher_template),
        )
        .route(
            "/voucher/templates/{template_id}/set-default",
            put(set_default_voucher_template),
        )
        .route(
            "/voucher/templates/{template_id}/toggle",
            put(toggle_voucher_template),
        )
        .route(
            "/voucher/templates/{template_id}/entries",
            post(add_voucher_template_entry),
        )
        .route(
            "/voucher/templates/{template_id}/entries/{entry_id}",
            put(update_voucher_template_entry).delete(delete_voucher_template_entry),
        )
        .route(
            "/voucher/templates/{template_id}/entries/reorder",
            put(reorder_voucher_template_entries),
        )
        .route(
            "/voucher/generate/preview",
            post(preview_generated_vouchers),
        )
        .route(
            "/voucher/generate/from-source",
            post(generate_voucher_from_source),
        )
        .route("/voucher/generate/batch", post(batch_generate_vouchers))
        .route("/voucher/generate/auto", post(auto_generate_vouchers))
        .route("/voucher/templates/match", post(match_voucher_template))
        .route(
            "/voucher/templates/{template_id}/usage-stats",
            get(get_template_usage_stats),
        )
        .route(
            "/voucher/rules",
            get(list_generation_rules).post(create_generation_rule),
        )
        .route(
            "/voucher/rules/{rule_id}",
            get(get_generation_rule)
                .put(update_generation_rule)
                .delete(delete_generation_rule),
        )
        .route(
            "/voucher/rules/{rule_id}/toggle",
            put(toggle_generation_rule),
        )
}
