//! 内置平台模块：统一入口自身的健康检查与元信息
//!
//! 作为模块化单体的"零号模块"，演示 Module trait 的接入方式，
//! 并提供统一入口的聚合健康检查端点（通过共享 ModuleRegistry 引用）。

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::registry::ModuleRegistry;
use axum::{routing::get, Json, Router};
use serde_json::json;
use std::sync::{Arc, Mutex};

/// 统一入口平台模块
///
/// 持有共享的 `Arc<Mutex<ModuleRegistry>>`，运行时从注册表读取
/// 所有已注册模块（含后续注册的业务模块），提供聚合视图。
pub struct PlatformModule {
    registry: Arc<Mutex<ModuleRegistry>>,
}

impl PlatformModule {
    pub fn new(registry: Arc<Mutex<ModuleRegistry>>) -> Self {
        Self { registry }
    }
}

#[async_trait::async_trait]
impl Module for PlatformModule {
    fn name(&self) -> &'static str {
        "platform"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        let registry = self.registry.clone();
        let registry2 = self.registry.clone();

        Router::new()
            // 统一入口健康检查（聚合所有已注册模块）
            .route(
                "/api/server/health",
                get({
                    let registry = registry.clone();
                    move || {
                        let reg = registry.lock().unwrap();
                        let modules = reg.list_modules();
                        async move {
                            Json(json!({
                                "status": "ok",
                                "server": "topems-server",
                                "modules": modules.len(),
                                "module_list": modules,
                            }))
                        }
                    }
                }),
            )
            // 模块组列表（按 7 个核心模块组分组展示）
            .route(
                "/api/server/modules",
                get({
                    let registry = registry2.clone();
                    move || {
                        let reg = registry.lock().unwrap();
                        let modules = reg.list_modules();
                        async move { Json(json!({ "modules": modules })) }
                    }
                }),
            )
    }

    async fn health_check(&self) -> ModuleHealth {
        ModuleHealth::healthy("platform", ModuleGroup::Core)
    }
}
