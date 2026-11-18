use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn master_routes(state: &AppState) -> Router<AppState> {
    let tenant_read = Router::new()
        .route(
            "/tenant/tenants",
            get(modules::tenant::handlers::list_tenants),
        )
        .route(
            "/tenant/tenants/{id}",
            get(modules::tenant::handlers::get_tenant),
        )
        .route(
            "/tenant/tenants/{id}/quota",
            get(modules::tenant::handlers::get_tenant_quota),
        )
        .route(
            "/tenant/tenants/{id}/modules",
            get(modules::tenant::handlers::list_tenant_modules),
        )
        .route(
            "/tenant/by-code/{code}",
            get(modules::tenant::handlers::get_tenant_by_code),
        )
        .route("/tenant/list", get(modules::tenant::handlers::list_tenants))
        .route("/tenant/{id}", get(modules::tenant::handlers::get_tenant))
        .route(
            "/tenant/slug/{slug}",
            get(modules::tenant::handlers::get_tenant_by_slug),
        )
        .route(
            "/tenant/{id}/users",
            get(modules::tenant::handlers::get_tenant_users),
        )
        .route(
            "/tenant/{id}/stats",
            get(modules::tenant::handlers::get_tenant_stats),
        )
        .route(
            "/tenant/{id}/metrics",
            get(modules::tenant::handlers::get_usage_metrics),
        )
        .route(
            "/tenant/{id}/usage",
            get(modules::tenant::handlers::get_usage_metrics),
        )
        .route(
            "/tenant/{id}/billing",
            get(modules::tenant::handlers::get_billing_info),
        )
        .route(
            "/tenant/{id}/invoices",
            get(modules::tenant::handlers::get_invoices),
        )
        .route(
            "/tenant/{id}/settings",
            get(modules::tenant::handlers::get_tenant_settings),
        )
        .route(
            "/tenant/{id}/branding",
            get(modules::tenant::handlers::get_tenant_branding),
        )
        .route(
            "/tenant/{id}/features",
            get(modules::tenant::handlers::get_tenant_features),
        )
        .route(
            "/tenant/{id}/domains",
            get(modules::tenant::handlers::get_tenant_domains),
        )
        .route(
            "/tenant/{id}/email-config",
            get(modules::tenant::handlers::get_tenant_email_config),
        )
        .route(
            "/tenant/{id}/integrations",
            get(modules::tenant::handlers::list_tenant_integrations),
        )
        .route(
            "/tenant/{id}/webhooks",
            get(modules::tenant::handlers::list_tenant_webhooks),
        )
        .route(
            "/tenant/{id}/security",
            get(modules::tenant::handlers::get_tenant_security),
        )
        .route(
            "/tenant/{id}/security/password-policy",
            get(modules::tenant::handlers::get_tenant_password_policy),
        )
        .route(
            "/tenant/{id}/security/api-keys",
            get(modules::tenant::handlers::list_tenant_api_keys),
        )
        .route(
            "/tenant/{id}/billing/invoices",
            get(modules::tenant::handlers::get_invoices),
        )
        .route(
            "/tenant/{id}/billing/invoices/{invoice_id}",
            get(modules::tenant::handlers::get_tenant_invoice),
        )
        .route(
            "/tenant/{id}/billing/subscription",
            get(modules::tenant::handlers::get_tenant_subscription),
        )
        .route(
            "/tenant/{id}/analytics/overview",
            get(modules::tenant::handlers::get_tenant_analytics_overview),
        )
        .route(
            "/tenant/{id}/analytics/usage",
            get(modules::tenant::handlers::get_tenant_usage),
        )
        .route(
            "/tenant/{id}/analytics/api-usage",
            get(modules::tenant::handlers::get_tenant_api_usage),
        )
        .route(
            "/tenant/{id}/analytics/activity",
            get(modules::tenant::handlers::get_tenant_activity),
        )
        .route(
            "/tenant/{id}/analytics/top-endpoints",
            get(modules::tenant::handlers::get_tenant_top_endpoints),
        )
        .route(
            "/tenant/{id}/analytics/user-stats",
            get(modules::tenant::handlers::get_tenant_user_stats),
        )
        .route(
            "/tenant/{id}/analytics/real-time",
            get(modules::tenant::handlers::get_tenant_real_time),
        )
        .route(
            "/governance/trends",
            get(modules::tenant::handlers::get_governance_trends),
        )
        .route(
            "/tenant/{id}/security/audit-logs",
            get(modules::tenant::handlers::list_tenant_audit_logs),
        )
        .route(
            "/tenant/{id}/security/audit-logs/export",
            get(modules::tenant::handlers::export_tenant_audit_logs),
        )
        .route(
            "/tenant/{id}/security/audit-logs/{log_id}",
            get(modules::tenant::handlers::get_tenant_audit_log),
        )
        .route(
            "/tenant/{id}/security/sessions",
            get(modules::tenant::handlers::list_tenant_sessions),
        )
        .route(
            "/tenant/context",
            get(modules::tenant::handlers::get_current_tenant_context),
        )
        .route("/tenant/my", get(modules::tenant::handlers::get_my_tenants))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:tenant:read"),
        ));

    let tenant_write = Router::new()
        .route(
            "/tenant/tenants",
            post(modules::tenant::handlers::create_tenant),
        )
        .route(
            "/tenant/tenants/{id}",
            put(modules::tenant::handlers::update_tenant),
        )
        .route(
            "/tenant/tenants/{id}/activate",
            post(modules::tenant::handlers::activate_tenant),
        )
        .route(
            "/tenant/tenants/{id}/suspend",
            post(modules::tenant::handlers::suspend_tenant),
        )
        .route(
            "/tenant/tenants/{tenant_id}/modules/{module_code}/activate",
            post(modules::tenant::handlers::activate_module),
        )
        .route(
            "/tenant/tenants/{tenant_id}/modules/{module_code}/deactivate",
            post(modules::tenant::handlers::deactivate_module),
        )
        .route(
            "/tenant/create",
            post(modules::tenant::handlers::create_tenant),
        )
        .route(
            "/tenant/{id}",
            put(modules::tenant::handlers::update_tenant),
        )
        .route(
            "/tenant/{id}",
            delete(modules::tenant::handlers::delete_tenant),
        )
        .route(
            "/tenant/{id}/activate",
            post(modules::tenant::handlers::activate_tenant),
        )
        .route(
            "/tenant/{id}/suspend",
            post(modules::tenant::handlers::suspend_tenant),
        )
        .route(
            "/tenant/{id}/settings",
            put(modules::tenant::handlers::update_tenant_settings),
        )
        .route(
            "/tenant/{id}/branding",
            put(modules::tenant::handlers::update_tenant_branding),
        )
        .route(
            "/tenant/{id}/features",
            put(modules::tenant::handlers::update_tenant_features),
        )
        .route(
            "/tenant/{id}/features/{feature}/enable",
            post(modules::tenant::handlers::enable_tenant_feature),
        )
        .route(
            "/tenant/{id}/features/{feature}/disable",
            post(modules::tenant::handlers::disable_tenant_feature),
        )
        .route(
            "/tenant/{id}/domains",
            post(modules::tenant::handlers::add_tenant_domain),
        )
        .route(
            "/tenant/{id}/domains/{domain}",
            delete(modules::tenant::handlers::remove_tenant_domain),
        )
        .route(
            "/tenant/{id}/email-config",
            put(modules::tenant::handlers::update_tenant_email_config),
        )
        .route(
            "/tenant/{id}/integrations",
            post(modules::tenant::handlers::create_tenant_integration),
        )
        .route(
            "/tenant/{id}/integrations/{integration_id}",
            put(modules::tenant::handlers::update_tenant_integration),
        )
        .route(
            "/tenant/{id}/integrations/{integration_id}",
            delete(modules::tenant::handlers::delete_tenant_integration),
        )
        .route(
            "/tenant/{id}/webhooks",
            post(modules::tenant::handlers::create_tenant_webhook),
        )
        .route(
            "/tenant/{id}/webhooks/{webhook_id}",
            put(modules::tenant::handlers::update_tenant_webhook),
        )
        .route(
            "/tenant/{id}/webhooks/{webhook_id}",
            delete(modules::tenant::handlers::delete_tenant_webhook),
        )
        .route(
            "/tenant/{id}/webhooks/{webhook_id}/test",
            post(modules::tenant::handlers::test_tenant_webhook),
        )
        .route(
            "/tenant/{id}/security",
            put(modules::tenant::handlers::update_tenant_security),
        )
        .route(
            "/tenant/{id}/security/password-policy",
            put(modules::tenant::handlers::update_tenant_password_policy),
        )
        .route(
            "/tenant/{id}/security/enable-2fa",
            post(modules::tenant::handlers::enable_tenant_2fa),
        )
        .route(
            "/tenant/{id}/security/disable-2fa",
            post(modules::tenant::handlers::disable_tenant_2fa),
        )
        .route(
            "/tenant/{id}/security/generate-api-key",
            post(modules::tenant::handlers::generate_tenant_api_key),
        )
        .route(
            "/tenant/{id}/security/rotate-api-key/{key_id}",
            post(modules::tenant::handlers::rotate_tenant_api_key),
        )
        .route(
            "/tenant/{id}/security/api-keys/{key_id}",
            delete(modules::tenant::handlers::delete_tenant_api_key),
        )
        .route(
            "/tenant/{id}/billing/plan",
            post(modules::tenant::handlers::update_tenant_plan),
        )
        .route(
            "/tenant/{id}/billing/subscription/cancel",
            post(modules::tenant::handlers::cancel_tenant_subscription),
        )
        .route(
            "/tenant/{id}/billing/invoices/{invoice_id}/pay",
            post(modules::tenant::handlers::pay_tenant_invoice),
        )
        .route(
            "/tenant/{id}/billing/card",
            post(modules::tenant::handlers::add_tenant_card),
        )
        .route(
            "/tenant/{id}/billing/card",
            delete(modules::tenant::handlers::remove_tenant_card),
        )
        .route(
            "/governance/refresh",
            post(modules::tenant::handlers::refresh_governance),
        )
        .route(
            "/internal/usage/collect",
            post(modules::tenant::handlers::collect_tenant_usage),
        )
        .route(
            "/tenant/{id}/security/sessions/revoke-all",
            post(modules::tenant::handlers::revoke_all_tenant_sessions),
        )
        .route(
            "/tenant/{id}/security/sessions/{session_id}/revoke",
            post(modules::tenant::handlers::revoke_tenant_session),
        )
        .route(
            "/tenant/{id}/security/ip-whitelist",
            post(modules::tenant::handlers::add_tenant_ip_whitelist),
        )
        .route(
            "/tenant/{id}/security/ip-whitelist/{ip_id}",
            delete(modules::tenant::handlers::remove_tenant_ip_whitelist),
        )
        .route(
            "/tenant/{id}/users/invite",
            post(modules::tenant::handlers::invite_member),
        )
        .route(
            "/tenant/{id}/users/{user_id}",
            delete(modules::tenant::handlers::remove_member),
        )
        .route(
            "/tenant/{id}/users/{user_id}/role",
            put(modules::tenant::handlers::update_member_role),
        )
        .route(
            "/tenant/switch",
            post(modules::tenant::handlers::switch_tenant),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("admin:iam:tenant:write"),
        ));

    // V68.1 A2.3: dict 路由迁移到 svc/master-data，后续通过服务发现代理 /dict/* → 主数据服务
    // let dict_read = Router::new()
    //     .route(
    //         "/dict/dict-types",
    //         get(modules::dict::handlers::list_dict_types),
    //     )
    //     .route(
    //         "/dict/dict-types/{id}",
    //         get(modules::dict::handlers::get_dict_type),
    //     )
    //     .route(
    //         "/dict/dict-types/{dict_type_id}/items",
    //         get(modules::dict::handlers::list_dict_items),
    //     )
    //     .route(
    //         "/dict/dict-types/{dict_type_id}/items/export",
    //         get(modules::dict::handlers::export_dict_items),
    //     )
    //     .route(
    //         "/dict/dict-items/{id}",
    //         get(modules::dict::handlers::get_dict_item),
    //     )
    //     .layer(axum::middleware::from_fn_with_state(
    //         state.clone(),
    //         require_permission("system:read"),
    //     ));
    //
    // let dict_write = Router::new()
    //     .route(
    //         "/dict/dict-types",
    //         post(modules::dict::handlers::create_dict_type),
    //     )
    //     .route(
    //         "/dict/dict-types/{id}",
    //         put(modules::dict::handlers::update_dict_type),
    //     )
    //     .route(
    //         "/dict/dict-types/{id}",
    //         delete(modules::dict::handlers::delete_dict_type),
    //     )
    //     .route(
    //         "/dict/dict-items",
    //         post(modules::dict::handlers::create_dict_item),
    //     )
    //     .route(
    //         "/dict/dict-items/batch",
    //         post(modules::dict::handlers::batch_create_dict_items),
    //     )
    //     .route(
    //         "/dict/dict-items/{id}",
    //         put(modules::dict::handlers::update_dict_item),
    //     )
    //     .route(
    //         "/dict/dict-items/{id}",
    //         delete(modules::dict::handlers::delete_dict_item),
    //     )
    //     .layer(axum::middleware::from_fn_with_state(
    //         state.clone(),
    //         require_permission("system:write"),
    //     ));

    // Phase 1：角色化菜单读取（DB 运行时权威）。任意登录用户可用，内容按 Claims 权限裁剪；
    // 不绑定 system:read（那是菜单 CRUD 管理台权限）。
    let my_menus = Router::new().route("/menus", get(modules::menu::handlers::my_menu_tree));

    let menu_read = Router::new()
        .route("/menu/groups", get(modules::menu::handlers::list_groups))
        .route("/menu/groups/{id}", get(modules::menu::handlers::get_group))
        .route("/menu/menus", get(modules::menu::handlers::list_menus))
        .route("/menu/menus/{id}", get(modules::menu::handlers::get_menu))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let menu_write = Router::new()
        .route("/menu/groups", post(modules::menu::handlers::create_group))
        .route(
            "/menu/groups/{id}",
            put(modules::menu::handlers::update_group),
        )
        .route(
            "/menu/groups/{id}",
            delete(modules::menu::handlers::delete_group),
        )
        .route("/menu/menus", post(modules::menu::handlers::create_menu))
        .route(
            "/menu/menus/{id}",
            put(modules::menu::handlers::update_menu),
        )
        .route(
            "/menu/menus/{id}",
            delete(modules::menu::handlers::delete_menu),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    // 通用评论 / 个人收藏：登录即可用（全局 auth_middleware 已注入 Claims），
    // 不绑定细粒度权限点；作者本人改删评论，收藏按当前用户隔离。
    let engagement_read = Router::new()
        .route(
            "/comments",
            get(modules::engagement::handlers::list_comments),
        )
        .route(
            "/favorites",
            get(modules::engagement::handlers::list_favorites),
        )
        .route(
            "/favorites/check",
            get(modules::engagement::handlers::check_favorite),
        );

    let engagement_write = Router::new()
        .route(
            "/comments",
            post(modules::engagement::handlers::create_comment),
        )
        .route(
            "/comments/{id}",
            put(modules::engagement::handlers::update_comment),
        )
        .route(
            "/comments/{id}",
            delete(modules::engagement::handlers::delete_comment),
        )
        .route(
            "/favorites",
            post(modules::engagement::handlers::add_favorite),
        )
        .route(
            "/favorites/{id}",
            delete(modules::engagement::handlers::remove_favorite),
        );

    // ===== MDM 主数据路由（V15 新增）=====
    let mdm_read = Router::new()
        .route(
            "/mdm/refs",
            get(modules::master::handlers::list_refs_handler),
        )
        .route(
            "/mdm/refs/stats",
            get(modules::master::handlers::get_overall_stats_handler),
        )
        .route(
            "/mdm/refs/sync-status",
            get(modules::master::handlers::get_sync_status_handler),
        )
        .route(
            "/mdm/refs/{master_data_id}",
            get(modules::master::handlers::get_ref_handler),
        )
        .route(
            "/mdm/refs/{master_data_id}/changes",
            get(modules::master::handlers::list_changes_handler),
        )
        .route(
            "/mdm/refs/by-code/{domain}/{code}",
            get(modules::master::handlers::get_ref_by_code_handler),
        )
        .route(
            "/mdm/approvals/pending",
            get(modules::master::handlers::list_pending_approvals_handler),
        )
        .route(
            "/mdm/approvals/history/{master_data_id}",
            get(modules::master::handlers::list_approval_history_handler),
        )
        .route(
            "/mdm/quality/report",
            get(modules::master::handlers::get_quality_report_handler),
        )
        .route(
            "/mdm/quality/duplicates",
            get(modules::master::handlers::list_duplicates_handler),
        )
        .route(
            "/mdm/quality/stale",
            get(modules::master::handlers::list_stale_handler),
        )
        .route(
            "/mdm/reconciliation/logs",
            get(modules::master::handlers::list_reconciliation_logs_handler),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let mdm_write = Router::new()
        .route(
            "/mdm/refs",
            post(modules::master::handlers::create_ref_handler),
        )
        .route(
            "/mdm/refs/{master_data_id}",
            put(modules::master::handlers::update_ref_handler)
                .delete(modules::master::handlers::delete_ref_handler),
        )
        .route(
            "/mdm/approvals",
            post(modules::master::handlers::create_approval_handler),
        )
        .route(
            "/mdm/approvals/{approval_id}/review",
            post(modules::master::handlers::review_approval_handler),
        )
        .route(
            "/mdm/reconciliation/run",
            post(modules::master::handlers::run_reconciliation_handler),
        )
        .route(
            "/mdm/reconciliation/logs/{issue_id}/resolve",
            post(modules::master::handlers::resolve_reconciliation_issue_handler),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    tenant_read
        .merge(tenant_write)
        // V68.1 A2.3: dict 路由合并到 svc/master-data
        // .merge(dict_read)
        // .merge(dict_write)
        .merge(my_menus)
        .merge(menu_read)
        .merge(menu_write)
        .merge(engagement_read)
        .merge(engagement_write)
        .merge(mdm_read)
        .merge(mdm_write)
}
