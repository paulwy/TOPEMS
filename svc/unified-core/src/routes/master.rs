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
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    tenant_read
        .merge(tenant_write)
        // V68.1 A2.3: dict 路由合并到 svc/master-data
        // .merge(dict_read)
        // .merge(dict_write)
        .merge(menu_read)
        .merge(menu_write)
        .merge(mdm_read)
        .merge(mdm_write)
}
