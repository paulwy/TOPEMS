use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::services::list_services,
        crate::modules::todos::get_todos,
        crate::modules::todos::add_todo,
        crate::modules::todos::complete_todo,
        crate::modules::todos::delete_todo,
        crate::modules::user::get_user_info,
        crate::modules::dashboard::get_dashboard_stats,
        crate::modules::search::global_search,
        crate::modules::announcements::get_announcements,
        crate::modules::announcements::create_announcement,
        crate::modules::announcements::get_announcement,
        crate::modules::announcements::update_announcement,
        crate::modules::announcements::delete_announcement,
        crate::modules::notifications::get_notifications,
        crate::modules::notifications::mark_notification_read,
        crate::modules::notifications::mark_all_notifications_read,
        crate::modules::navigation::get_navigation_menu,
    ),
    tags(
        (name = "Portal", description = "门户"),
        (name = "Dashboard", description = "仪表盘"),
        (name = "Search", description = "全局搜索"),
        (name = "Todo", description = "待办聚合"),
        (name = "Navigation", description = "导航"),
        (name = "QuickActions", description = "快捷操作"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-portal API",
        version = "1.0.0",
        description = "TOPEMS 门户服务 - BFF 聚合层、仪表盘、全局搜索、待办聚合",
    ),
    servers(
        (url = "http://localhost:8063", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;
