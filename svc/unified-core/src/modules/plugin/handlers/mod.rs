pub mod automated_upgrade;
pub mod marketplace;
pub mod reviews_stats;
pub mod runtime;
pub mod simple_api;
pub mod tenant_plugins;
pub mod upgrade_workflow;
pub mod versioning;

pub use marketplace::{
    create_review, get_marketplace_summary, get_plugin, get_plugin_reviews, get_plugin_versions,
    list_categories, list_plugins,
};

pub use tenant_plugins::{
    activate_plugin, deactivate_plugin, get_available_plugins, install_plugin, list_my_plugins,
    list_tenant_plugins, publish_plugin, uninstall_plugin, unpublish_plugin, update_plugin,
    upload_plugin, upload_plugin_version,
};

pub use runtime::{
    get_plugin_status, list_plugins_with_status, register_plugin, unregister_plugin,
    update_plugin_status,
};

pub use simple_api::{
    disable_plugin_simple, enable_plugin_simple, get_plugin_details, install_plugin_simple,
    list_installed_plugins, list_tenant_installed_plugins, uninstall_plugin_simple,
    PluginDetailsResponse,
};

pub use versioning::{
    check_all_updates, check_plugin_updates, compare_plugin_versions, rollback_plugin_version,
};

pub use upgrade_workflow::{
    get_upgrade_task_status, list_upgrade_tasks, start_plugin_upgrade, verify_plugin_version,
};

pub use reviews_stats::{
    create_plugin_review, get_download_history, get_plugin_reviews_by_code, get_plugin_statistics,
    get_review_statistics,
};

pub use automated_upgrade::{
    add_to_upgrade_queue, batch_upgrade, cancel_upgrade_queue_item, configure_upgrade_schedule,
    get_upgrade_history, get_upgrade_queue, get_upgrade_schedule,
};
