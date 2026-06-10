use axum::{
    extract::{FromRef, Path, Query, State},
    routing::{delete, get, post},
    Json,
    Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use tower_cookies::CookieManagerLayer;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router, ServiceInfo, ServiceCategory,
    ServiceRegistryStatus, LocalServiceRegistry, PortalServiceAggregator,
};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
    service_registry: Arc<LocalServiceRegistry>,
    service_aggregator: Arc<PortalServiceAggregator>,
    http_client: Client,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    async fn new() -> Self {
        let aggregator = PortalServiceAggregator::new();
        aggregator.init_default_services().await;

        Self {
            auth_state: AuthState::from_env(),
            service_registry: Arc::new(LocalServiceRegistry::new()),
            service_aggregator: Arc::new(aggregator),
            http_client: Client::new(),
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-portal");
    START_TIME.get_or_init(Instant::now);

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_portal_custom_metric",
        "This is a custom metric for TOPEMS-PORTAL",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let app_state = AppState::new().await;

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        .route("/", get(home));

    let protected_routes = Router::new()
        .route("/api/v1/services", get(list_services))
        .route("/api/v1/todos", get(get_todos))
        .route("/api/v1/todos", post(add_todo))
        .route("/api/v1/todos/{id}", post(complete_todo))
        .route("/api/v1/todos/{id}", delete(delete_todo))
        .route("/api/v1/user", get(get_user_info))
        .route("/api/v1/monitoring/services", get(get_monitoring_services))
        .route("/api/v1/monitoring/metrics", get(get_monitoring_metrics))
        .route("/api/v1/monitoring/alerts", get(get_monitoring_alerts))
        .route("/api/v1/monitoring/alerts/{id}", post(acknowledge_alert))
        .route("/api/v1/monitoring/logs", get(get_monitoring_logs))
        .route("/api/v1/notifications", get(get_notifications))
        .route("/api/v1/notifications/{id}", post(mark_notification_read))
        .route("/api/v1/notifications/mark-all-read", post(mark_all_notifications_read))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-portal"))
        .layer(cors)
        .layer(CookieManagerLayer::new())
        .layer(prometheus_layer);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8005".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-PORTAL 统一门户系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-portal", true)
}

#[derive(Debug, Clone, serde::Serialize, PartialEq)]
enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unhealthy")]
    Unhealthy,
}

#[derive(Debug, Clone, serde::Serialize)]
struct DependencyHealth {
    name: String,
    status: HealthStatus,
    message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
struct DetailedHealth {
    service_name: String,
    status: HealthStatus,
    message: String,
    timestamp: String,
    uptime: Option<u64>,
    dependencies: Option<Vec<DependencyHealth>>,
    response_time_ms: Option<u64>,
    last_check: Option<String>,
}

async fn health_check_detailed() -> Json<ApiResponse<DetailedHealth>> {
    let health = DetailedHealth {
        service_name: "topems-portal".to_string(),
        status: HealthStatus::Healthy,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(get_uptime()),
        dependencies: None,
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    Json(ApiResponse::success(health, "健康检查完成"))
}

async fn home() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS Unified Portal API", "首页"))
}

async fn list_services(State(state): State<AppState>) -> Json<ApiResponse<Vec<ServiceDto>>> {
    let services = state.service_aggregator.registry.list_all().await;

    let service_dtos: Vec<ServiceDto> = services.into_iter().map(|s| {
        ServiceDto {
            id: s.code,
            name: s.name,
            description: s.description,
            url: s.url.map(|_| format!("http://localhost:{}", s.port)).unwrap_or_default(),
            icon: s.icon.unwrap_or_else(|| "App".to_string()),
            status: match s.status {
                ServiceRegistryStatus::Active => "running".to_string(),
                ServiceRegistryStatus::Inactive => "stopped".to_string(),
                ServiceRegistryStatus::Maintenance => "maintenance".to_string(),
            },
            category: format!("{:?}", s.category),
        }
    }).collect();

    Json(ApiResponse::success(service_dtos, "服务列表获取成功"))
}

async fn get_todos() -> Json<ApiResponse<Vec<Todo>>> {
    let todos = vec![
        Todo {
            id: "1".to_string(),
            title: "完成项目周报".to_string(),
            service: "rs".to_string(),
            service_name: "科研研发".to_string(),
            due_date: "2026-05-26".to_string(),
            priority: "high".to_string(),
            completed: false,
            todo_type: "personal".to_string(),
            link_url: None,
        },
        Todo {
            id: "2".to_string(),
            title: "审核检验报告".to_string(),
            service: "lims".to_string(),
            service_name: "实验室".to_string(),
            due_date: "2026-05-26".to_string(),
            priority: "high".to_string(),
            completed: false,
            todo_type: "approval".to_string(),
            link_url: Some("http://localhost:3002/reports/123".to_string()),
        },
        Todo {
            id: "3".to_string(),
            title: "提交专利申请材料".to_string(),
            service: "rs".to_string(),
            service_name: "科研研发".to_string(),
            due_date: "2026-05-28".to_string(),
            priority: "medium".to_string(),
            completed: false,
            todo_type: "personal".to_string(),
            link_url: None,
        },
        Todo {
            id: "4".to_string(),
            title: "更新BI报表数据".to_string(),
            service: "bi".to_string(),
            service_name: "数据大屏".to_string(),
            due_date: "2026-05-27".to_string(),
            priority: "low".to_string(),
            completed: false,
            todo_type: "system".to_string(),
            link_url: None,
        },
        Todo {
            id: "5".to_string(),
            title: "设备维护保养".to_string(),
            service: "lims".to_string(),
            service_name: "实验室".to_string(),
            due_date: "2026-05-29".to_string(),
            priority: "medium".to_string(),
            completed: false,
            todo_type: "notification".to_string(),
            link_url: Some("http://localhost:3002/equipment/maintenance".to_string()),
        },
        Todo {
            id: "6".to_string(),
            title: "审批员工请假申请".to_string(),
            service: "hrm".to_string(),
            service_name: "人力资源".to_string(),
            due_date: "2026-05-25".to_string(),
            priority: "high".to_string(),
            completed: false,
            todo_type: "approval".to_string(),
            link_url: Some("http://localhost:3005/leave/approval".to_string()),
        },
    ];
    Json(ApiResponse::success(todos, "待办事项获取成功"))
}

async fn add_todo(Json(todo): Json<NewTodo>) -> Json<ApiResponse<Todo>> {
    let id = uuid::Uuid::new_v4().to_string();
    let service_clone = todo.service.clone();
    let new_todo = Todo {
        id,
        title: todo.title,
        service: todo.service,
        service_name: get_service_name(&service_clone),
        due_date: todo.due_date,
        priority: todo.priority,
        completed: false,
        todo_type: "personal".to_string(),
        link_url: None,
    };
    Json(ApiResponse::success(new_todo, "待办事项添加成功"))
}

async fn complete_todo(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "id": id
    }), "待办事项完成成功"))
}

async fn delete_todo(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "id": id
    }), "待办事项删除成功"))
}

async fn get_user_info() -> Json<ApiResponse<UserInfo>> {
    Json(ApiResponse::success(UserInfo {
        id: "user-001".to_string(),
        name: "张三".to_string(),
        email: "zhangsan@topems.com".to_string(),
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan".to_string(),
        department: "研发部".to_string(),
        role: "高级研究员".to_string(),
        last_login: "2026-05-25 09:00:00".to_string(),
    }, "用户信息获取成功"))
}

async fn get_monitoring_services() -> Json<ApiResponse<Vec<MonitoringService>>> {
    let services = vec![
        MonitoringService {
            service_name: "科研研发管理".to_string(),
            status: "healthy".to_string(),
            response_time_ms: 120,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务运行正常".to_string()),
        },
        MonitoringService {
            service_name: "实验室信息管理".to_string(),
            status: "healthy".to_string(),
            response_time_ms: 85,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务运行正常".to_string()),
        },
        MonitoringService {
            service_name: "数据大屏报表".to_string(),
            status: "degraded".to_string(),
            response_time_ms: 250,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("响应时间较长".to_string()),
        },
        MonitoringService {
            service_name: "厂区空间数字化".to_string(),
            status: "healthy".to_string(),
            response_time_ms: 156,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务运行正常".to_string()),
        },
        MonitoringService {
            service_name: "人力资源管理".to_string(),
            status: "healthy".to_string(),
            response_time_ms: 95,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务运行正常".to_string()),
        },
        MonitoringService {
            service_name: "企业资源计划".to_string(),
            status: "unhealthy".to_string(),
            response_time_ms: 0,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务连接超时".to_string()),
        },
        MonitoringService {
            service_name: "生产执行系统".to_string(),
            status: "healthy".to_string(),
            response_time_ms: 112,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务运行正常".to_string()),
        },
        MonitoringService {
            service_name: "仓储管理系统".to_string(),
            status: "healthy".to_string(),
            response_time_ms: 78,
            last_check: chrono::Utc::now().to_rfc3339(),
            message: Some("服务运行正常".to_string()),
        },
    ];
    Json(ApiResponse::success(services, "监控服务状态获取成功"))
}

async fn get_monitoring_metrics() -> Json<ApiResponse<MonitoringMetrics>> {
    let metrics = MonitoringMetrics {
        requests_total: 12847,
        requests_success: 12653,
        requests_failed: 194,
        avg_response_time_ms: 156,
        active_connections: 42,
        memory_usage_mb: 892,
        cpu_usage_percent: 23,
    };
    Json(ApiResponse::success(metrics, "监控指标获取成功"))
}

async fn get_monitoring_alerts() -> Json<ApiResponse<Vec<Alert>>> {
    let alerts = vec![
        Alert {
            id: "alert-001".to_string(),
            rule_name: "服务响应超时".to_string(),
            severity: "critical".to_string(),
            message: "企业资源计划服务响应时间超过阈值".to_string(),
            triggered_at: chrono::Utc::now() - chrono::Duration::minutes(15),
            acknowledged: false,
        },
        Alert {
            id: "alert-002".to_string(),
            rule_name: "高CPU使用率".to_string(),
            severity: "warning".to_string(),
            message: "数据大屏报表服务CPU使用率达到75%".to_string(),
            triggered_at: chrono::Utc::now() - chrono::Duration::minutes(30),
            acknowledged: false,
        },
        Alert {
            id: "alert-003".to_string(),
            rule_name: "内存使用率警告".to_string(),
            severity: "warning".to_string(),
            message: "系统内存使用率达到80%".to_string(),
            triggered_at: chrono::Utc::now() - chrono::Duration::hours(1),
            acknowledged: true,
        },
    ];
    Json(ApiResponse::success(alerts, "告警列表获取成功"))
}

async fn acknowledge_alert(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "id": id,
        "acknowledged": true
    }), "告警已确认"))
}

async fn get_monitoring_logs() -> Json<ApiResponse<Vec<LogEntry>>> {
    let logs = vec![
        LogEntry {
            timestamp: chrono::Utc::now() - chrono::Duration::seconds(30),
            level: "INFO".to_string(),
            service: "portal".to_string(),
            message: "用户张三登录系统".to_string(),
        },
        LogEntry {
            timestamp: chrono::Utc::now() - chrono::Duration::seconds(45),
            level: "WARN".to_string(),
            service: "erp".to_string(),
            message: "数据库连接池接近上限".to_string(),
        },
        LogEntry {
            timestamp: chrono::Utc::now() - chrono::Duration::minutes(1),
            level: "ERROR".to_string(),
            service: "erp".to_string(),
            message: "服务健康检查失败".to_string(),
        },
        LogEntry {
            timestamp: chrono::Utc::now() - chrono::Duration::minutes(2),
            level: "INFO".to_string(),
            service: "lims".to_string(),
            message: "检验报告生成完成".to_string(),
        },
        LogEntry {
            timestamp: chrono::Utc::now() - chrono::Duration::minutes(5),
            level: "DEBUG".to_string(),
            service: "portal".to_string(),
            message: "缓存清理完成".to_string(),
        },
    ];
    Json(ApiResponse::success(logs, "日志列表获取成功"))
}

async fn get_notifications() -> Json<ApiResponse<Vec<Notification>>> {
    let notifications = vec![
        Notification {
            id: "notif-001".to_string(),
            title: "待审批提醒".to_string(),
            content: "有3条审批请求等待处理".to_string(),
            service: "hrm".to_string(),
            service_name: "人力资源".to_string(),
            notification_type: "approval".to_string(),
            read: false,
            created_at: chrono::Utc::now() - chrono::Duration::minutes(10),
            link_url: Some("http://localhost:3005/approval".to_string()),
        },
        Notification {
            id: "notif-002".to_string(),
            title: "系统维护通知".to_string(),
            content: "本周六凌晨2点-4点将进行系统维护，请提前做好数据备份".to_string(),
            service: "system".to_string(),
            service_name: "系统管理".to_string(),
            notification_type: "system".to_string(),
            read: false,
            created_at: chrono::Utc::now() - chrono::Duration::hours(2),
            link_url: None,
        },
        Notification {
            id: "notif-003".to_string(),
            title: "试验完成提醒".to_string(),
            content: "您负责的试验'新型材料性能测试'已完成".to_string(),
            service: "rs".to_string(),
            service_name: "科研研发".to_string(),
            notification_type: "info".to_string(),
            read: true,
            created_at: chrono::Utc::now() - chrono::Duration::hours(4),
            link_url: Some("http://localhost:3007/experiments/123".to_string()),
        },
        Notification {
            id: "notif-004".to_string(),
            title: "库存预警".to_string(),
            content: "试剂'乙醇'库存不足，当前库存: 50ml".to_string(),
            service: "lims".to_string(),
            service_name: "实验室".to_string(),
            notification_type: "warning".to_string(),
            read: false,
            created_at: chrono::Utc::now() - chrono::Duration::hours(6),
            link_url: Some("http://localhost:3002/inventory".to_string()),
        },
        Notification {
            id: "notif-005".to_string(),
            title: "会议邀请".to_string(),
            content: "邀请您参加'Q2项目进度评审会'，时间：本周四下午2点".to_string(),
            service: "system".to_string(),
            service_name: "系统管理".to_string(),
            notification_type: "info".to_string(),
            read: true,
            created_at: chrono::Utc::now() - chrono::Duration::days(1),
            link_url: None,
        },
    ];
    Json(ApiResponse::success(notifications, "通知列表获取成功"))
}

async fn mark_notification_read(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "id": id,
        "read": true
    }), "通知已标记为已读"))
}

async fn mark_all_notifications_read() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "count": 5
    }), "所有通知已标记为已读"))
}

fn get_service_name(service_id: &str) -> String {
    match service_id {
        "rs" => "科研研发".to_string(),
        "lims" => "实验室".to_string(),
        "bi" => "数据大屏".to_string(),
        "gis" => "厂区GIS".to_string(),
        "hrm" => "人力资源".to_string(),
        "erp" => "企业资源".to_string(),
        "mes" => "生产执行".to_string(),
        "wms" => "仓储管理".to_string(),
        "scm" => "供应链".to_string(),
        "qms" => "质量管理".to_string(),
        "ehs" => "EHS".to_string(),
        "im" => "即时通讯".to_string(),
        _ => "未知服务".to_string(),
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ServiceDto {
    id: String,
    name: String,
    description: String,
    url: String,
    icon: String,
    status: String,
    category: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Todo {
    id: String,
    title: String,
    service: String,
    service_name: String,
    due_date: String,
    priority: String,
    completed: bool,
    todo_type: String,
    link_url: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct NewTodo {
    title: String,
    service: String,
    due_date: String,
    priority: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct UserInfo {
    id: String,
    name: String,
    email: String,
    avatar: String,
    department: String,
    role: String,
    last_login: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct MonitoringService {
    service_name: String,
    status: String,
    response_time_ms: u64,
    last_check: String,
    message: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct MonitoringMetrics {
    requests_total: u64,
    requests_success: u64,
    requests_failed: u64,
    avg_response_time_ms: u64,
    active_connections: u64,
    memory_usage_mb: u64,
    cpu_usage_percent: u64,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Alert {
    id: String,
    rule_name: String,
    severity: String,
    message: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    triggered_at: chrono::DateTime<chrono::Utc>,
    acknowledged: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct LogEntry {
    #[serde(with = "chrono::serde::ts_seconds")]
    timestamp: chrono::DateTime<chrono::Utc>,
    level: String,
    service: String,
    message: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Notification {
    id: String,
    title: String,
    content: String,
    service: String,
    service_name: String,
    notification_type: String,
    read: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    created_at: chrono::DateTime<chrono::Utc>,
    link_url: Option<String>,
}