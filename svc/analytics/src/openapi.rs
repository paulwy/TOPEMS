use crate::modules;
use crate::modules::bi::dashboard::{CreateDashboardRequest, UpdateDashboardRequest};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        modules::bi::dashboard::list_dashboards,
        modules::bi::dashboard::create_dashboard,
        modules::bi::dashboard::get_dashboard,
        modules::bi::dashboard::update_dashboard,
        modules::bi::dashboard::delete_dashboard,
        modules::bi::widget::list_widgets,
        modules::bi::widget::create_widget,
        modules::bi::widget::get_widget,
        modules::bi::widget::update_widget,
        modules::bi::widget::delete_widget,
        modules::bi::self_service_report::list_reports,
        modules::bi::self_service_report::create_report,
        modules::bi::self_service_report::get_report,
        modules::bi::self_service_report::update_report,
        modules::bi::self_service_report::delete_report,
        modules::bi::analysis::list_analyses,
        modules::bi::analysis::create_analysis,
        modules::bi::analysis::get_analysis,
        modules::bi::analysis::execute_analysis,
    ),
    components(
        schemas(CreateDashboardRequest, UpdateDashboardRequest)
    ),
    tags(
        (name = "BI", description = "商业智能"),
        (name = "Analytics", description = "数据分析"),
        (name = "Report", description = "报表"),
        (name = "Dashboard", description = "仪表盘"),
        (name = "Visualization", description = "数据可视化"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-analytics API",
        version = "1.0.0",
        description = "TOPEMS BI 数据分析服务 - 报表、仪表盘、数据可视化",
    ),
    servers(
        (url = "http://localhost:8060", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;
