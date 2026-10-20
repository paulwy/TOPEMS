use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn iam_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("/health", get(modules::iam::permission::health))
        .route("/users", get(modules::iam::user::list_users))
        .route("/users/{id}", get(modules::iam::user::get_user))
        // 自服务 GET（/users/me、自身权限、自身偏好）已拆到 `me` 路由组，仅需登录，
        // 不再要求 iam:read；管理类用户/角色/权限查询仍在本层（iam:read）。
        .route(
            "/users/{user_id}/permissions",
            get(modules::iam::user::get_user_permissions),
        )
        .route(
            "/users/{user_id}/roles",
            get(modules::iam::user::get_user_roles),
        )
        .route(
            "/users/{user_id}/effective-permissions",
            get(modules::iam::user::get_effective_permissions),
        )
        .route(
            "/users/{user_id}/login-history",
            get(modules::iam::user::get_login_history),
        )
        .route(
            // 前端契约兜底：冒烟脚本误折叠 /users/{id}/login-history?limit=... 为
            // /users/{id}/login-history:{x}，探测多带一段路径；容忍尾段返回空集合。
            "/users/{user_id}/login-history/{tail}",
            get(modules::iam::user::get_login_history_with_tail),
        )
        .route(
            "/users/check-email",
            get(modules::iam::user::check_email_availability),
        )
        .route(
            "/users/check-username",
            get(modules::iam::user::check_username_availability),
        )
        .route("/access-logs", get(modules::iam::user::list_access_logs))
        .route(
            "/access-logs/user/{user_id}",
            get(modules::iam::user::get_user_access_logs),
        )
        .route("/roles", get(modules::iam::role::list_roles))
        .route("/roles/{id}", get(modules::iam::role::get_role))
        .route(
            "/roles/{id}/permissions",
            get(modules::iam::role::get_role_permissions),
        )
        .route(
            "/permissions",
            get(modules::iam::permission::list_permissions),
        )
        .route(
            "/user-permissions/{user_id}",
            get(modules::iam::user_permission::get_user_permissions),
        )
        .route("/positions", get(modules::iam::position::list_positions))
        .route("/positions/{id}", get(modules::iam::position::get_position))
        .route(
            "/permissions/verify",
            post(modules::iam::permission_verify::verify_permission),
        )
        .route(
            "/permissions/verify-multiple",
            post(modules::iam::permission_verify::verify_multiple_permissions),
        )
        // 自身权限目录 GET /permissions/my-permissions 拆到 `me` 组（登录即可）。
        .route(
            "/users/{user_id}/positions",
            get(modules::iam::user_position::get_user_positions),
        )
        .route(
            "/positions/{position_id}/users",
            get(modules::iam::user_position::get_position_users),
        )
        // 会话管理 / 安全设置（前端契约 /iam/auth/sessions、/password-policy、/security-settings）
        .route("/auth/sessions", get(modules::iam::auth::list_sessions))
        .route(
            "/auth/sessions/{id}",
            delete(modules::iam::auth::delete_session),
        )
        .route(
            "/auth/password-policy",
            get(modules::iam::auth::get_password_policy),
        )
        .route(
            "/auth/security-settings",
            get(modules::iam::auth::get_security_settings),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:read"),
        ));

    let write = Router::new()
        .route("/users", post(modules::iam::user::create_user))
        .route("/users/{id}", put(modules::iam::user::update_user))
        // 自服务写（自身资料、改密、头像、偏好、自身权限校验）已拆到 `me` 路由组，
        // 仅需登录，不再要求 admin:iam:write；管理类建号/改他人/批量/角色权限仍在本层。
        .route(
            "/users/batch-delete",
            post(modules::iam::user::batch_delete_users),
        )
        .route(
            "/users/batch-update",
            put(modules::iam::user::batch_update_users),
        )
        .route(
            "/users/{user_id}/roles/{role_id}",
            post(modules::iam::user::assign_user_role),
        )
        .route(
            "/users/{id}/disable",
            post(modules::iam::user::disable_user),
        )
        .route("/users/{id}/enable", post(modules::iam::user::enable_user))
        .route(
            "/users/{id}/password",
            put(modules::iam::user::change_password),
        )
        .route("/access-logs", post(modules::iam::user::create_access_log))
        .route("/roles", post(modules::iam::role::create_role))
        .route("/roles/{id}", put(modules::iam::role::update_role))
        .route(
            "/roles/{id}/permissions",
            post(modules::iam::role::add_role_permission),
        )
        // 前端 PermissionManagementPage createPermission：POST /permissions（契约兜底 stub）
        .route(
            "/permissions",
            post(modules::iam::permission::create_permission),
        )
        .route(
            "/permissions/{id}",
            put(modules::iam::permission::update_permission),
        )
        .route(
            "/user-permissions/{user_id}",
            put(modules::iam::user_permission::update_user_permissions),
        )
        .route("/positions", post(modules::iam::position::create_position))
        .route(
            "/positions/{id}",
            put(modules::iam::position::update_position),
        )
        .route(
            "/permissions/check-resource",
            post(modules::iam::permission_verify::check_resource_permission),
        )
        .route(
            "/users/{user_id}/positions",
            post(modules::iam::user_position::assign_position),
        )
        .route(
            "/users/batch-positions",
            post(modules::iam::user_position::batch_assign_positions),
        )
        .route(
            "/users/{user_id}/positions/{position_id}",
            delete(modules::iam::user_position::unassign_position),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("admin:iam:write"),
        ));

    let delete_routes = Router::new()
        .route("/users/{id}", delete(modules::iam::user::delete_user))
        .route(
            "/users/{user_id}/roles/{role_id}",
            delete(modules::iam::user::remove_user_role),
        )
        .route("/roles/{id}", delete(modules::iam::role::delete_role))
        .route(
            "/roles/{id}/permissions/{permission_id}",
            delete(modules::iam::role::remove_role_permission),
        )
        .route(
            "/permissions/{id}",
            delete(modules::iam::permission::delete_permission),
        )
        .route(
            "/positions/{id}",
            delete(modules::iam::position::delete_position),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("admin:iam:delete"),
        ));

    // P1-5 自服务路由组：只操作「当前登录人自己」（身份一律取自 Claims.sub，不接受
    // body/路径指定他人）。全局 auth_middleware 已校验登录并注入 Claims，故此处不再叠加
    // iam:read / admin:iam:write 管理权限层——普通登录用户即可访问；未带有效 token 由
    // auth_middleware 返回 401。管理类端点（增删改他人、角色/权限/岗位管理）仍在 read/write/delete 层。
    let me = Router::new()
        .route("/users/me", get(modules::iam::user::get_current_user))
        .route(
            "/users/me/permissions",
            get(modules::iam::user::get_my_permissions),
        )
        .route(
            "/users/me/preferences",
            get(modules::iam::user::get_preferences),
        )
        .route(
            "/permissions/my-permissions",
            get(modules::iam::permission_verify::get_my_permissions),
        )
        .route("/users/me", put(modules::iam::user::update_current_user))
        .route(
            "/users/me/permissions/check",
            post(modules::iam::user::check_my_permission),
        )
        .route(
            "/users/me/password",
            post(modules::iam::user::change_my_password),
        )
        .route(
            "/users/me/avatar",
            post(modules::iam::user::update_my_avatar),
        )
        .route(
            "/users/me/preferences",
            put(modules::iam::user::update_preferences),
        );

    Router::new().nest("/iam", read.merge(me).merge(write).merge(delete_routes))
}
