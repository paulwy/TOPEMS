//! # TOPEMS Shared Service Client
//!
//! 服务客户端模块，提供类型安全的跨服务 HTTP 调用能力。
//!
//! 包含：基础服务客户端、各业务服务客户端（Iam/Hrm/Finance/Erp 等）、
//! 泛型客户端、trait 定义、API trait 定义等。

#![allow(
    unknown_lints,
    renamed_and_removed_lints,
    clippy::should_implement_trait,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::module_inception,
    clippy::manual_clamp,
    clippy::unwrap_or_default,
    clippy::doc_markdown,
    clippy::clone_on_copy,
    clippy::if_same_then_else,
    clippy::inconsistent_digit_grouping,
    clippy::is_digit_ascii_radix,
    clippy::single_range_in_vec_init,
    clippy::needless_range_loop,
    clippy::filter_map_next,
    clippy::unnecessary_lazy_evaluations,
    clippy::get_first,
    clippy::ptr_as_ptr,
    clippy::useless_asref,
    clippy::assigning_clones,
    clippy::write_literal,
    clippy::expect_fun_call,
    clippy::redundant_guards,
    clippy::match_like_matches_macro,
    clippy::redundant_pattern_matching,
    clippy::wildcard_enum_match_arm,
    clippy::same_functions_in_if_condition,
    clippy::unused_peekable,
    clippy::stable_sort_primitive,
    clippy::mut_mut,
    clippy::vec_init_then_push,
    clippy::format_push_string,
    clippy::unused_self,
    clippy::let_unit_value,
    clippy::zero_prefixed_literal,
    clippy::borrow_as_ptr,
    clippy::needless_borrow,
    clippy::needless_late_init,
    clippy::needless_update,
    clippy::needless_pass_by_value,
    clippy::implicit_hasher,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::must_use_candidate,
    clippy::return_self_not_must_use,
    clippy::used_underscore_binding,
    clippy::default_trait_access,
    clippy::equatable_if_let,
    clippy::large_enum_variant,
    clippy::from_over_into,
    clippy::let_and_return,
    clippy::match_bool,
    clippy::match_wild_err_arm,
    clippy::new_without_default,
    clippy::blocks_in_conditions,
    clippy::explicit_iter_loop,
    clippy::explicit_auto_deref,
    clippy::range_plus_one,
    clippy::single_char_add_str,
    clippy::string_add,
    clippy::string_add_assign,
    clippy::option_map_unit_fn,
    clippy::filter_next,
    clippy::iter_not_returning_iterator,
    clippy::from_str_radix_10,
    clippy::naive_bytecount,
    clippy::manual_string_new,
    clippy::flat_map_option,
    clippy::or_fun_call,
    clippy::identity_op,
    clippy::try_err,
    clippy::useless_conversion,
    clippy::uninlined_format_args,
    clippy::trivially_copy_pass_by_ref,
    clippy::nonminimal_bool,
    clippy::derive_partial_eq_without_eq,
    clippy::enum_variant_names,
    clippy::upper_case_acronyms,
    clippy::struct_field_names,
    clippy::needless_arbitrary_self_type,
    clippy::empty_line_after_doc_comments,
    clippy::empty_docs,
    clippy::manual_strip,
    clippy::match_same_arms,
    clippy::unnecessary_wraps,
    clippy::path_buf_push_overwrite,
    clippy::read_zero_byte_vec,
    clippy::redundant_locals,
    clippy::collapsible_match,
    clippy::verbose_file_reads,
    clippy::suboptimal_flops,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    dead_code,
    clippy::never_loop,
    clippy::no_effect_underscore_binding,
    clippy::mixed_case_hex_literals,
    clippy::needless_bitwise_bool,
    clippy::needless_continue,
    clippy::needless_for_each,
    clippy::non_canonical_clone_impl,
    clippy::non_canonical_partial_ord_impl,
    clippy::almost_swapped,
    clippy::cmp_owned,
    clippy::double_parens,
    clippy::float_cmp,
    clippy::float_cmp_const,
    clippy::float_equality_without_abs,
    clippy::inherent_to_string,
    clippy::manual_ok_or,
    clippy::map_entry,
    clippy::map_flatten,
    clippy::match_wildcard_for_single_variants,
    clippy::needless_bool,
    clippy::option_env_unwrap,
    clippy::significant_drop_in_scrutinee,
    clippy::unit_arg,
    clippy::ok_expect,
    clippy::option_option,
    clippy::question_mark,
    clippy::undocumented_unsafe_blocks,
    clippy::unsafe_removed_from_name,
    clippy::verbose_bit_mask,
    clippy::wildcard_imports,
    clippy::unreadable_literal,
    clippy::unseparated_literal_suffix,
    clippy::suspicious_arithmetic_impl,
    clippy::suspicious_op_assign_impl,
    clippy::suspicious_operation_groupings,
    clippy::suspicious_xor_used_as_pow,
    clippy::transmute_ptr_to_ref,
    clippy::too_long_first_doc_paragraph,
    clippy::unnecessary_fallible_conversions,
    clippy::unnecessary_join,
    clippy::unnecessary_struct_initialization,
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::std_instead_of_alloc,
    clippy::std_instead_of_core,
    clippy::alloc_instead_of_core,
    clippy::str_to_string,
    clippy::debug_assert_with_mut_call,
    clippy::error_impl_error,
    clippy::partial_pub_fields,
    clippy::ref_patterns,
    clippy::manual_let_else,
    clippy::manual_find_map,
    clippy::mem_replace_with_default,
    clippy::mem_replace_option_with_none,
    clippy::semicolon_if_nothing_returned,
    clippy::search_is_some,
    clippy::box_collection,
    clippy::box_default,
    clippy::linkedlist,
    clippy::option_if_let_else,
    clippy::partialeq_ne_impl,
    clippy::redundant_clone,
    clippy::use_self,
    clippy::doc_lazy_continuation,
    clippy::checked_conversions,
    clippy::cognitive_complexity,
    clippy::absolute_paths,
    clippy::macro_use_imports,
    clippy::multiple_unsafe_ops_per_block,
    clippy::cloned_ref_to_slice_refs,
    clippy::const_is_empty,
    clippy::explicit_counter_loop,
    clippy::field_reassign_with_default,
    clippy::manual_checked_ops,
    clippy::manual_unwrap_or_default,
    clippy::unnecessary_filter_map,
    clippy::unnecessary_get_then_check,
    clippy::unnecessary_literal_unwrap,
    clippy::unnecessary_sort_by,
    clippy::unnecessary_unwrap,
    clippy::wildcard_in_or_patterns,
    clippy::doc_overindented_list_items,
    clippy::manual_unwrap_or,
    clippy::result_large_err,
    clippy::collapsible_if,
    clippy::manual_contains,
    clippy::unnecessary_cast,
    clippy::useless_format
)]
pub mod notification;
pub mod service_client;

// 细粒度 re-export：基础类型
pub use service_client::base_client::BaseServiceClient;
pub use service_client::error::{ServiceClientError, ServiceClientResult};
pub use service_client::generic::GenericServiceClient;
pub use service_client::trait_api::{ServiceApi, TypedServiceClient};

// 各业务服务客户端 re-export
pub use service_client::ai_client::AiServiceClient;
pub use service_client::bi_client::BiServiceClient;
pub use service_client::doc_client::DocServiceClient;
pub use service_client::ehs_client::EhsServiceClient;
pub use service_client::gis_client::GisServiceClient;
pub use service_client::integration_client::IntegrationServiceClient;
pub use service_client::lims_client::LimsServiceClient;
pub use service_client::mobile_client::MobileServiceClient;
pub use service_client::pdm_client::PdmServiceClient;
pub use service_client::pm_client::PmServiceClient;
pub use service_client::portal_client::PortalServiceClient;
pub use service_client::rd_client::RdServiceClient;
pub use service_client::scm_client::ScmServiceClient;
pub use service_client::srm_client::SrmServiceClient;
// P0-2 Phase 2: 各服务类型从 api::*_api 导出
pub use service_client::api::erp_api::{ErpApi, ErpAsset};
pub use service_client::api::finance_api::FinanceApi;
pub use service_client::api::hrm_api::{
    HrmApi, HrmAttendanceStats, HrmCheckInRequest, HrmCheckOutRequest, HrmCompany,
    HrmCreateLeaveRequest, HrmDepartment, HrmEmployee,
};
pub use service_client::api::iam_api::{IamApi, IamRole, IamUser};
pub use service_client::api::monitor_api::MonitorApi;
pub use service_client::api::notification_api::{
    CreateNotification, NotificationApi, NotificationItem,
};
pub use service_client::api::wms_api::WmsApi;
pub use service_client::api::workflow_api::{
    CreateInstanceRequest, TaskActionRequest, TaskStats, WorkflowApi, WorkflowInstance,
    WorkflowStatistics, WorkflowTask,
};

// notification 模块 re-export
pub use notification::{
    ArchiveConfig, CreateNotificationRequest, CreateTemplateRequest, Notification,
    NotificationListQuery, NotificationListResponse, NotificationServiceClient,
    NotificationServiceState, NotificationStats, NotificationTemplate, NotificationType,
    RenderTemplateRequest, TemplateStatus,
};

// 工厂函数 re-export
// P0-2: 已删除 create_billing/crm/feedback/search/ticket/mes/qms_client（零引用）
// P0-2 Phase 2: 已删除 create_wms/erp/finance/monitor/hrm/iam/notification_client（迁移到 TypedServiceClient<XxxApi>）
pub use service_client::{
    create_ai_client, create_bi_client, create_communication_client, create_doc_client,
    create_ehs_client, create_generic_client, create_gis_client, create_integration_client,
    create_lims_client, create_lowcode_client, create_master_data_client, create_mobile_client,
    create_pdm_client, create_pm_client, create_portal_client, create_rd_client, create_scm_client,
    create_srm_client,
};

// 宏通过 #[macro_export] 自动导出到 crate 根：
// - define_service_client!
// - define_service_api!
