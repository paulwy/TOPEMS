//! 模块注册表：统一管理所有已接入的模块组
//!
//! 支持：
//! - 模块注册与按组查询
//! - 路由聚合（将所有模块路由合并到统一入口）
//! - **进程内调用**（类型安全枚举 provider，非 HTTP）
//!   私有化部署模式下，模块间通过 trait 直接调用，消除网络开销。

use crate::module::{Module, ModuleContext, ModuleGroup};
use crate::providers::{AccountBalanceProvider, InProcProvider};
use axum::extract::Request;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Router;
use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::Arc;
use topems_shared_core::response::ApiResponse;
use tower_http::catch_panic::CatchPanicLayer;

/// 模块注册表
pub struct ModuleRegistry {
    /// 已注册模块：name -> Box<dyn Module>
    modules: HashMap<&'static str, Box<dyn Module>>,
    /// 进程内 provider：TypeId -> InProcProvider
    providers: HashMap<TypeId, InProcProvider>,
    /// 模块共享上下文
    context: ModuleContext,
}

impl ModuleRegistry {
    pub fn new() -> Self {
        Self {
            modules: HashMap::new(),
            providers: HashMap::new(),
            context: ModuleContext::default(),
        }
    }

    // ================================================
    // 模块注册
    // ================================================

    /// 注册一个模块
    pub fn register<M: Module>(&mut self, module: M) -> &mut Self {
        tracing::info!(
            "注册模块: {} (group: {})",
            module.name(),
            module.group().as_str()
        );
        self.modules.insert(module.name(), Box::new(module));
        self
    }

    /// 注册一个模块（trait 对象形式）
    pub fn register_boxed(&mut self, module: Box<dyn Module>) -> &mut Self {
        tracing::info!(
            "注册模块: {} (group: {})",
            module.name(),
            module.group().as_str()
        );
        self.modules.insert(module.name(), module);
        self
    }

    // ================================================
    // 进程内调用（类型安全枚举 provider）
    // ================================================

    /// 注册账户余额 provider（由 finance 模块提供）
    pub fn register_account_balance_provider(
        &mut self,
        provider: Arc<dyn AccountBalanceProvider>,
    ) -> &mut Self {
        self.providers.insert(
            TypeId::of::<dyn AccountBalanceProvider>(),
            InProcProvider::AccountBalance(provider),
        );
        tracing::debug!("注册进程内 provider: AccountBalanceProvider");
        self
    }

    /// 获取账户余额 provider（进程内调用入口）
    ///
    /// 私有化模式下，其他模块通过此方法在进程内调用 finance 能力。
    /// 返回 `None` 表示 provider 未注册（或 finance 模块被 feature 裁剪）。
    pub fn get_account_balance_provider(&self) -> Option<Arc<dyn AccountBalanceProvider>> {
        self.providers
            .get(&TypeId::of::<dyn AccountBalanceProvider>())
            .map(|p| match p {
                InProcProvider::AccountBalance(p) => p.clone(),
            })
    }

    // ================================================
    // 查询与聚合
    // ================================================

    /// 获取模块（进程内调用入口）
    pub fn get(&self, name: &str) -> Option<&dyn Module> {
        self.modules.get(name).map(|m| m.as_ref())
    }

    /// 按模块组查询所有模块
    pub fn by_group(&self, group: ModuleGroup) -> Vec<&dyn Module> {
        self.modules
            .values()
            .filter(|m| m.group() == group)
            .map(|m| m.as_ref())
            .collect()
    }

    /// 聚合所有模块路由到统一入口
    pub fn merge_routes(&self) -> Router {
        let mut router = Router::new();
        for module in self.modules.values() {
            let module_routes = module.routes(self.context.clone());
            router = router.merge(module_routes);
        }
        router
            .route(
                "/api/openapi.json",
                axum::routing::get(openapi_json_handler),
            )
            .route("/api/docs", axum::routing::get(docs_handler))
            // 微前端模块灰度配置下发端点（apps/web canary-release.ts syncFromServer 拉取）。
            // 当前无灰度配置，返回空数组；注意前端期望裸数组 CanaryConfig[]，不能走 ApiResponse 包装。
            .route(
                "/api/canary/config",
                axum::routing::get(|| async { axum::Json::<Vec<serde_json::Value>>(vec![]) }),
            )
            // 通用模块级探活兜底：/api/{svc}/health（前端契约各服务客户端均声明 /health；
            // 已注册的静态 /api/{svc}/health 路由优先匹配，未注册的模块由参数路由兜底）
            .route(
                "/api/{svc}/health",
                axum::routing::get(
                    |axum::extract::Path(svc): axum::extract::Path<String>| async move {
                        ApiResponse::success(
                            serde_json::json!({ "module": svc, "status": "ok" }),
                            "module health ok",
                        )
                    },
                ),
            )
            // 插件运行时探活：前端 runtimeAxios 统一走 /plugin-health/{code}/api/plugins/{info|health}。
            // 真实各业务插件的 /plugins/{info,health} 已在对应 *real_module 内挂载；此处为通用兜底，
            // 保证未注册/探测 code 不再落到 BFF catch-all 裸 404（待上游支持按 code 反代到具体服务）。
            .route(
                "/plugin-health/{code}/api/plugins/info",
                axum::routing::get(
                    |axum::extract::Path(code): axum::extract::Path<String>| async move {
                        ApiResponse::success(
                            serde_json::json!({
                                "code": code,
                                "name": code,
                                "version": env!("CARGO_PKG_VERSION"),
                                "description": format!("plugin runtime info for {code}"),
                                "author": "topems",
                                "category": "plugin",
                                "plugin_type": "runtime",
                                "permissions": [],
                            }),
                            "plugin info",
                        )
                    },
                ),
            )
            .route(
                "/plugin-health/{code}/api/plugins/health",
                axum::routing::get(
                    |axum::extract::Path(code): axum::extract::Path<String>| async move {
                        ApiResponse::success(
                            serde_json::json!({ "module": code, "status": "running" }),
                            "plugin health ok",
                        )
                    },
                ),
            )
            .fallback(not_found_handler)
            .layer(CatchPanicLayer::custom(handle_panic))
    }

    /// 模块总数
    pub fn len(&self) -> usize {
        self.modules.len()
    }

    pub fn is_empty(&self) -> bool {
        self.modules.is_empty()
    }

    /// 已注册的进程内 provider 数量
    pub fn provider_count(&self) -> usize {
        self.providers.len()
    }

    /// 列出所有已注册模块
    pub fn list_modules(&self) -> Vec<(String, String, String)> {
        self.modules
            .values()
            .map(|m| {
                (
                    m.name().to_string(),
                    m.group().as_str().to_string(),
                    m.version().to_string(),
                )
            })
            .collect()
    }
}

impl Default for ModuleRegistry {
    fn default() -> Self {
        Self::new()
    }
}
/// 全局 404：未匹配任何模块路由时返回统一 ApiResponse JSON（而非 axum 默认裸文本）
async fn not_found_handler(_req: Request) -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        ApiResponse::<()>::not_found("接口不存在，请检查路径"),
    )
}

/// 全局 500：模块 handler panic 时返回统一 ApiResponse JSON
fn handle_panic(_payload: Box<dyn Any + Send + 'static>) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        ApiResponse::<()>::server_error("服务器内部错误，请稍后重试"),
    )
        .into_response()
}

/// OpenAPI 3.0 文档（docs/api/openapi.json，编译期内嵌）
async fn openapi_json_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(
            axum::http::header::CONTENT_TYPE,
            "application/json; charset=utf-8",
        )],
        include_str!("../../../docs/api/openapi.json"),
    )
}

/// Swagger UI 文档页（docs/api/index.html，编译期内嵌）
async fn docs_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        include_str!("../../../docs/api/index.html"),
    )
}
