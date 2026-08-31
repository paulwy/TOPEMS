//! 真实业务服务接入模板（Phase B3）
//!
//! 目标：将已 lib+bin 化的服务（svc/finance、svc/erp、svc/qms）接入
//! topems-server 统一入口，实现单进程启动多个业务模块。
//!
//! ## 接入模式（三个业务服务一致）
//!
//! 现有三个业务服务（finance/erp/qms）都是：
//! ```rust,ignore
//! // svc/finance/src/modules/mod.rs
//! pub fn create_routes() -> Router<AppState> { ... }
//! ```
//! 即：`create_routes() -> Router<AppState>` + `main.rs` 中 `.with_state(state)`。
//!
//! 接入 topems-server 需要两步：
//! 1. 将服务的 `AppState` 构建逻辑从 main.rs 提取为库级工厂函数
//!    （如 `pub async fn build_state(ctx) -> AppState`）
//! 2. 在统一入口中实现 `Module` trait，调用工厂构建 state + routes
//!
//! ## 完整接入示例（以 finance 为例）
//!
//! ```rust,ignore
//! use topems_finance::shared::AppState;
//! use topems_finance::modules;
//!
//! /// finance 业务模块接入适配器
//! pub struct FinanceRealModule {
//!     state: AppState,          // 需从 topems_finance 构建
//!     routes: axum::Router,     // modules::create_routes().with_state(state)
//! }
//!
//! #[async_trait::async_trait]
//! impl Module for FinanceRealModule {
//!     fn name(&self) -> &'static str { "finance-real" }
//!     fn group(&self) -> ModuleGroup { ModuleGroup::Finance }
//!
//!     fn routes(&self, _state: ModuleContext) -> Router {
//!         self.routes.clone()
//!     }
//! }
//! ```
//!
//! ## 前置条件
//!
//! 1. `svc/finance`、`svc/erp`、`svc/qms` 已在 workspace（✅ 已加入）
//! 2. 将 `topems-finance`、`topems-erp`、`topems-qms` 加入
//!    `svc/server/Cargo.toml` 的可选依赖（feature 控制）
//! 3. 将各服务的 `AppState` 构建逻辑提取为 lib 工厂函数
//!    （当前在 main.rs，需重构为 lib 可调用）
//!
//! ## Cargo.toml 示例
//!
//! ```toml
//! [dependencies]
//! topems-finance = { path = "../finance", optional = true }
//!
//! [features]
//! module-finance = ["dep:topems-finance"]
//! ```
//!
//! ## 接入后验证
//!
//! 1. `cargo build -p topems-server --features module-finance` 编译通过
//! 2. 启动后 `/api/server/health` 应包含 finance 模块
//! 3. finance 路由（`/api/finance/*`）在统一入口 8099 端口可用
//! 4. 跨模块调用优先走进程内 provider（`get_provider::<dyn ...>()`），
//!    仅在 provider 未注册时回退 HTTP

/// 真实服务接入状态标记（避免 dead_code 警告）
#[allow(dead_code)]
pub struct RealServiceAdapterStatus {
    /// 已接入的服务数（目标 3：finance/erp/qms）
    pub connected_services: usize,
    /// 是否已建立库级 AppState 工厂
    pub lib_factory_ready: bool,
    /// 接入文档
    pub doc: &'static str,
}

#[allow(dead_code)]
pub fn adapter_status() -> RealServiceAdapterStatus {
    RealServiceAdapterStatus {
        connected_services: 0,
        lib_factory_ready: false,
        doc: "docs/architecture/modular-monolith-design.md §5 Phase B3",
    }
}
