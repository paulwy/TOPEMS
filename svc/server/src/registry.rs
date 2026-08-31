//! 模块注册表：统一管理所有已接入的模块组
//!
//! 支持：
//! - 模块注册与按组查询
//! - 路由聚合（将所有模块路由合并到统一入口）
//! - 健康检查聚合
//! - **进程内调用**（类型安全枚举 provider，非 HTTP）
//!   私有化部署模式下，模块间通过 trait 直接调用，消除网络开销。

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::providers::{AccountBalanceProvider, InProcProvider};
use axum::Router;
use std::any::TypeId;
use std::collections::HashMap;
use std::sync::Arc;

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
    }

    /// 聚合所有模块健康检查
    pub async fn health_check_all(&self) -> Vec<ModuleHealth> {
        let mut results = Vec::new();
        for module in self.modules.values() {
            results.push(module.health_check().await);
        }
        results
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
