//! 业务看板模块（DashboardModule）
//!
//! Phase B 演示模块：**通过进程内 trait 调用财务模块**（非 HTTP）。
//!
//! 调用链路：
//!   DashboardModule → ModuleRegistry.get_account_balance_provider()
//!                    → FinanceModule.get_total_assets()（进程内直接调用）
//!
//! 这满足模块化单体验收标准："至少 2 个模块间调用通过进程内 trait 完成（非 HTTP）"。

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::providers::AccountBalanceProvider;
use crate::registry::ModuleRegistry;
use axum::{Json, Router};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// 业务看板模块：消费其他模块提供的进程内能力
pub struct DashboardModule {
    registry: Arc<Mutex<ModuleRegistry>>,
}

impl DashboardModule {
    pub fn new(registry: Arc<Mutex<ModuleRegistry>>) -> Self {
        Self { registry }
    }
}

// ================================================
// 进程内调用辅助
// ================================================

/// 从注册表同步获取 provider（立即释放锁，避免 MutexGuard 跨 await）
fn get_balance_provider(
    registry: &Arc<Mutex<ModuleRegistry>>,
) -> Option<Arc<dyn AccountBalanceProvider>> {
    let reg = registry.lock().unwrap();
    reg.get_account_balance_provider()
}

// ================================================
// 独立 handler（进程内 trait 调用，非 HTTP）
// ================================================

/// 财务汇总看板：进程内调用 `AccountBalanceProvider::get_total_assets`
async fn financial_summary(provider: Arc<dyn AccountBalanceProvider>) -> Json<Value> {
    let start = Instant::now();
    let total_assets = provider.get_total_assets().await.unwrap_or(0.0);
    let duration_us = start.elapsed().as_micros();
    Json(json!({
        "status": "ok",
        "total_assets": total_assets,
        "call_mode": "in_proc_trait",
        "caller": "dashboard",
        "callee": "finance",
        "capability": "AccountBalanceProvider::get_total_assets",
        "duration_us": duration_us,
        "note": "本次调用通过进程内 trait 完成（非 HTTP）"
    }))
}

/// 指定科目余额：进程内调用 `AccountBalanceProvider::get_account_balance`
async fn account_balance(provider: Arc<dyn AccountBalanceProvider>, code: String) -> Json<Value> {
    let start = Instant::now();
    let balance = provider.get_account_balance(&code).await;
    let duration_us = start.elapsed().as_micros();
    match balance {
        Ok(balance) => Json(json!({
            "status": "ok",
            "account_code": code,
            "balance": balance,
            "call_mode": "in_proc_trait",
            "caller": "dashboard",
            "callee": "finance",
            "capability": "AccountBalanceProvider::get_account_balance",
            "duration_us": duration_us
        })),
        Err(e) => Json(json!({
            "status": "error",
            "error": e,
            "call_mode": "in_proc_trait"
        })),
    }
}

/// 看板模块元信息
fn dashboard_info(registry: &Arc<Mutex<ModuleRegistry>>) -> Json<Value> {
    let reg = registry.lock().unwrap();
    let in_proc_calls = reg.provider_count();
    Json(json!({
        "module": "dashboard",
        "group": "core",
        "consumed_capabilities": [
            "AccountBalanceProvider::get_total_assets",
            "AccountBalanceProvider::get_account_balance"
        ],
        "registered_in_proc_providers": in_proc_calls,
        "architecture": "modular-monolith",
        "deployment": "private-deployment (进程内 trait 调用)"
    }))
}

#[async_trait::async_trait]
impl Module for DashboardModule {
    fn name(&self) -> &'static str {
        "dashboard"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        let registry = self.registry.clone();
        let registry2 = self.registry.clone();
        let registry3 = self.registry.clone();

        Router::new()
            // 总资产看板（进程内调用 finance 模块）
            .route(
                "/api/dashboard/financial-summary",
                axum::routing::get(move || {
                    let registry = registry.clone();
                    async move {
                        // 同步获取 provider（立即释放锁），再进程内调用
                        match get_balance_provider(&registry) {
                            Some(provider) => financial_summary(provider).await,
                            None => Json(json!({
                                "status": "degraded",
                                "error": "AccountBalanceProvider 未注册（finance 模块未启用或被裁剪）",
                                "call_mode": "n/a"
                            })),
                        }
                    }
                }),
            )
            // 指定科目余额（进程内调用）
            .route(
                "/api/dashboard/account/{code}",
                axum::routing::get(
                    move |axum::extract::Path(code): axum::extract::Path<String>| {
                        let registry = registry2.clone();
                        async move {
                            match get_balance_provider(&registry) {
                                Some(provider) => account_balance(provider, code).await,
                                None => Json(json!({
                                    "status": "degraded",
                                    "error": "AccountBalanceProvider 未注册",
                                    "call_mode": "n/a"
                                })),
                            }
                        }
                    },
                ),
            )
            // 进程内调用链路说明
            .route(
                "/api/dashboard/info",
                axum::routing::get(move || {
                    let registry = registry3.clone();
                    async move { dashboard_info(&registry) }
                }),
            )
    }

    async fn health_check(&self) -> ModuleHealth {
        let reg = self.registry.lock().unwrap();
        let provider_ok = reg.get_account_balance_provider().is_some();
        let mut health = ModuleHealth::healthy("dashboard", ModuleGroup::Core);
        health.dependencies.push(crate::module::DependencyHealth {
            name: "AccountBalanceProvider (in-proc)",
            healthy: provider_ok,
            detail: if provider_ok {
                "finance 模块已注册，进程内调用可用".to_string()
            } else {
                "finance 模块未注册，进程内调用不可用".to_string()
            },
        });
        health
    }
}
