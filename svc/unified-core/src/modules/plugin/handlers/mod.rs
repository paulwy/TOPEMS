pub mod marketplace;
pub mod tenant_plugins;
pub mod runtime;
pub mod simple_api;
pub mod versioning;
pub mod upgrade_workflow;
pub mod reviews_stats;
pub mod automated_upgrade;

pub use marketplace::{
    get_marketplace_summary,
    list_categories,
    list_plugins,
    get_plugin,
    get_plugin_versions,
    get_plugin_reviews,
    create_review,
};

pub use tenant_plugins::{
    list_tenant_plugins,
    list_my_plugins,
    install_plugin,
    uninstall_plugin,
    activate_plugin,
    deactivate_plugin,
    get_available_plugins,
    upload_plugin,
    upload_plugin_version,
    publish_plugin,
    unpublish_plugin,
    update_plugin,
};

pub use runtime::{
    register_plugin,
    update_plugin_status,
    get_plugin_status,
    unregister_plugin,
    list_plugins_with_status,
};

pub use simple_api::{
    PluginDetailsResponse,
    list_installed_plugins,
    get_plugin_details,
    install_plugin_simple,
    uninstall_plugin_simple,
    list_tenant_installed_plugins,
    enable_plugin_simple,
    disable_plugin_simple,
};

pub use versioning::{
    compare_plugin_versions,
    check_plugin_updates,
    rollback_plugin_version,
    check_all_updates,
};

pub use upgrade_workflow::{
    start_plugin_upgrade,
    verify_plugin_version,
    get_upgrade_task_status,
    list_upgrade_tasks,
};

pub use reviews_stats::{
    get_plugin_reviews_by_code,
    create_plugin_review,
    get_plugin_statistics,
    get_review_statistics,
    get_download_history,
};

pub use automated_upgrade::{
    get_upgrade_schedule,
    configure_upgrade_schedule,
    get_upgrade_queue,
    add_to_upgrade_queue,
    cancel_upgrade_queue_item,
    batch_upgrade,
    get_upgrade_history,
};
