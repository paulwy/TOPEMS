use axum::{
    extract::{FromRef, Path},
    routing::{get, post},
    Json,
    Router,
};
use std::env;
use tower_cookies::CookieManagerLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let refresh_secret = env::var("REFRESH_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("REFRESH_SECRET not set, using default");
            "topems-default-refresh-secret-change-me".to_string()
        });

    let token_expiry_hours: i64 = env::var("TOKEN_EXPIRY_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    let app_state = AppState {
        auth_state: AuthState::new(jwt_secret, refresh_secret, token_expiry_hours),
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/", get(home))
        .route("/api/v1/services", get(list_services))
        .route("/api/v1/todos", get(get_todos))
        .route("/api/v1/todos", post(add_todo))
        .route("/api/v1/todos/:id", post(complete_todo))
        .route("/api/v1/user", get(get_user_info))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state)
        .layer(cors)
        .layer(CookieManagerLayer::new());

    let port = env::var("PORT").unwrap_or_else(|_| "8020".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-PORTAL 统一门户系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-PORTAL is running", "健康检查"))
}

async fn home() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS Unified Portal API", "首页"))
}

async fn list_services() -> Json<ApiResponse<Vec<Service>>> {
    let services = vec![
        Service {
            id: "rs".to_string(),
            name: "科研研发管理",
            description: "项目、配方、试验、专利管理",
            url: "http://localhost:3007".to_string(),
            icon: "🔬",
            status: "running".to_string(),
        },
        Service {
            id: "lims".to_string(),
            name: "实验室信息管理",
            description: "样品、检验、仪器、试剂管理",
            url: "http://localhost:3002".to_string(),
            icon: "🧪",
            status: "running".to_string(),
        },
        Service {
            id: "bi".to_string(),
            name: "数据大屏报表",
            description: "数据分析与可视化报表",
            url: "http://localhost:3003".to_string(),
            icon: "📊",
            status: "running".to_string(),
        },
        Service {
            id: "gis".to_string(),
            name: "厂区空间数字化",
            description: "厂区地图与空间管理",
            url: "http://localhost:3004".to_string(),
            icon: "🗺️",
            status: "starting".to_string(),
        },
        Service {
            id: "hrm".to_string(),
            name: "人力资源管理",
            description: "员工、考勤、合同管理",
            url: "http://localhost:3005".to_string(),
            icon: "👥",
            status: "running".to_string(),
        },
        Service {
            id: "erp".to_string(),
            name: "企业资源计划",
            description: "资产、部门、组织管理",
            url: "http://localhost:3006".to_string(),
            icon: "🏢",
            status: "running".to_string(),
        },
        Service {
            id: "mes".to_string(),
            name: "生产执行系统",
            description: "生产订单与过程管理",
            url: "http://localhost:3008".to_string(),
            icon: "🏭",
            status: "running".to_string(),
        },
        Service {
            id: "wms".to_string(),
            name: "仓储管理系统",
            description: "库存、出入库管理",
            url: "http://localhost:3009".to_string(),
            icon: "📦",
            status: "running".to_string(),
        },
        Service {
            id: "scm".to_string(),
            name: "供应链管理",
            description: "采购、供应商管理",
            url: "http://localhost:3010".to_string(),
            icon: "🔗",
            status: "running".to_string(),
        },
        Service {
            id: "qms".to_string(),
            name: "质量管理系统",
            description: "质量检验、问题管理",
            url: "http://localhost:3011".to_string(),
            icon: "✅",
            status: "running".to_string(),
        },
        Service {
            id: "ehs".to_string(),
            name: "环境健康安全",
            description: "EHS合规与安全管理",
            url: "http://localhost:3012".to_string(),
            icon: "🛡️",
            status: "running".to_string(),
        },
        Service {
            id: "im".to_string(),
            name: "即时通讯",
            description: "企业即时通讯与协作",
            url: "http://localhost:3013".to_string(),
            icon: "💬",
            status: "starting".to_string(),
        },
    ];
    Json(ApiResponse::success(services, "服务列表获取成功"))
}

async fn get_todos() -> Json<ApiResponse<Vec<Todo>>> {
    let todos = vec![
        Todo {
            id: "1".to_string(),
            title: "完成项目周报".to_string(),
            service: "rs".to_string(),
            service_name: "科研研发",
            due_date: "2026-05-26".to_string(),
            priority: "high".to_string(),
            completed: false,
        },
        Todo {
            id: "2".to_string(),
            title: "审核检验报告".to_string(),
            service: "lims".to_string(),
            service_name: "实验室",
            due_date: "2026-05-26".to_string(),
            priority: "high".to_string(),
            completed: false,
        },
        Todo {
            id: "3".to_string(),
            title: "提交专利申请材料".to_string(),
            service: "rs".to_string(),
            service_name: "科研研发",
            due_date: "2026-05-28".to_string(),
            priority: "medium".to_string(),
            completed: false,
        },
        Todo {
            id: "4".to_string(),
            title: "更新BI报表数据".to_string(),
            service: "bi".to_string(),
            service_name: "数据大屏",
            due_date: "2026-05-27".to_string(),
            priority: "low".to_string(),
            completed: false,
        },
        Todo {
            id: "5".to_string(),
            title: "设备维护保养".to_string(),
            service: "lims".to_string(),
            service_name: "实验室",
            due_date: "2026-05-29".to_string(),
            priority: "medium".to_string(),
            completed: false,
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
    };
    Json(ApiResponse::success(new_todo, "待办事项添加成功"))
}

async fn complete_todo(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "id": id
    }), "待办事项完成成功"))
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

fn get_service_name(service_id: &str) -> &'static str {
    match service_id {
        "rs" => "科研研发",
        "lims" => "实验室",
        "bi" => "数据大屏",
        "gis" => "厂区GIS",
        "hrm" => "人力资源",
        "erp" => "企业资源",
        "mes" => "生产执行",
        "wms" => "仓储管理",
        "scm" => "供应链",
        "qms" => "质量管理",
        "ehs" => "EHS",
        "im" => "即时通讯",
        _ => "未知服务",
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Service {
    id: String,
    name: &'static str,
    description: &'static str,
    url: String,
    icon: &'static str,
    status: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Todo {
    id: String,
    title: String,
    service: String,
    service_name: &'static str,
    due_date: String,
    priority: String,
    completed: bool,
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
