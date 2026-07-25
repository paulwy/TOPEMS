//! User submodule - User management handlers

mod access_log;
mod batch;
mod crud;
mod models;
mod profile;
mod profile_ext;
mod roles;
mod status;
mod validation;

pub use models::ListUsersParams;

pub use crud::{create_user, delete_user, get_user, list_users, update_user};

pub use status::{change_password, disable_user, enable_user};

pub use profile::{get_current_user, get_preferences, update_preferences};

pub use profile_ext::{
    change_my_password, check_my_permission, get_my_permissions, update_current_user,
    update_my_avatar,
};

pub use roles::{assign_user_role, get_user_permissions, get_user_roles, remove_user_role};

pub use batch::{batch_delete_users, batch_update_users, get_effective_permissions};

pub use validation::{check_email_availability, check_username_availability};

pub use access_log::{
    create_access_log, get_login_history, get_user_access_logs, list_access_logs,
};
