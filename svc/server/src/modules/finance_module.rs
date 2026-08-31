//! 财务模块（FinanceModule）
//!
//! Phase B 演示模块：实现 `AccountBalanceProvider` 进程内调用契约。
//! 作为模块化单体中"finance"模块组的代表，对外提供账户余额查询能力。
//!
//! 当前使用内存实现（无需 DB），用于验证进程内调用机制；
//! 真实接入时替换为 `svc/finance` 的 `plugin_finance.accounting_subjects` 查询。

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::providers::AccountBalanceProvider;
use axum::{Json, Router};
use serde_json::json;
use std::collections::HashMap;
use std::sync::RwLock;

/// 财务模块：持有科目余额（内存实现）
pub struct FinanceModule {
    /// 科目编码 -> 余额
    balances: RwLock<HashMap<String, f64>>,
    /// 资产类科目列表
    asset_codes: Vec<String>,
}

impl Clone for FinanceModule {
    fn clone(&self) -> Self {
        Self {
            balances: RwLock::new(self.balances.read().unwrap().clone()),
            asset_codes: self.asset_codes.clone(),
        }
    }
}

impl FinanceModule {
    pub fn new() -> Self {
        let mut balances = HashMap::new();
        // 示例科目数据（模拟 accounting_subjects 余额）
        balances.insert("1001".to_string(), 1_250_000.0); // 银行存款
        balances.insert("1002".to_string(), 320_000.0); // 应收账款
        balances.insert("1405".to_string(), 680_000.0); // 库存商品
        balances.insert("1601".to_string(), 2_400_000.0); // 固定资产
        balances.insert("2001".to_string(), 890_000.0); // 短期借款（负债）
        balances.insert("4001".to_string(), 1_760_000.0); // 实收资本（权益）

        Self {
            balances: RwLock::new(balances),
            asset_codes: vec![
                "1001".to_string(),
                "1002".to_string(),
                "1405".to_string(),
                "1601".to_string(),
            ],
        }
    }
}

impl Default for FinanceModule {
    fn default() -> Self {
        Self::new()
    }
}

/// 实现进程内调用契约（AccountBalanceProvider）
#[async_trait::async_trait]
impl AccountBalanceProvider for FinanceModule {
    async fn get_account_balance(&self, account_code: &str) -> Result<f64, String> {
        self.balances
            .read()
            .map_err(|e| format!("余额锁读取失败: {}", e))?
            .get(account_code)
            .copied()
            .ok_or_else(|| format!("科目 {} 不存在", account_code))
    }

    async fn get_total_assets(&self) -> Result<f64, String> {
        let balances = self
            .balances
            .read()
            .map_err(|e| format!("余额锁读取失败: {}", e))?;
        Ok(self
            .asset_codes
            .iter()
            .filter_map(|c| balances.get(c))
            .sum())
    }
}

#[async_trait::async_trait]
impl Module for FinanceModule {
    fn name(&self) -> &'static str {
        "finance"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Finance
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        // 读取数据快照供闭包捕获（RwLock 不可 clone，读取后移入闭包）
        let balances: HashMap<String, f64> = self.balances.read().unwrap().clone();
        let balances_2 = balances.clone();
        let asset_codes = self.asset_codes.clone();
        let asset_codes_2 = asset_codes.clone();

        Router::new()
            // 账户余额查询（通过进程内 trait 调用的能力对外暴露）
            // 注意：演示模块使用 /api/finance-demo/* 前缀，避免与真实 finance 服务路由冲突
            .route(
                "/api/finance-demo/accounts",
                axum::routing::get({
                    let balances = balances.clone();
                    move || {
                        let balances = balances.clone();
                        async move { Json(json!({ "accounts": balances })) }
                    }
                }),
            )
            // 总资产（跨模块演示用）
            .route(
                "/api/finance-demo/total-assets",
                axum::routing::get({
                    let asset_codes = asset_codes.clone();
                    let balances = balances_2.clone();
                    move || {
                        let balances = balances.clone();
                        let total: f64 = asset_codes.iter().filter_map(|c| balances.get(c)).sum();
                        async move { Json(json!({ "total_assets": total })) }
                    }
                }),
            )
            // 模块元信息（进程内调用契约声明）
            .route(
                "/api/finance-demo/info",
                axum::routing::get({
                    let asset_codes = asset_codes_2.clone();
                    move || {
                        let asset_codes = asset_codes.clone();
                        async move {
                            Json(json!({
                                "module": "finance-demo",
                                "group": "finance",
                                "providers": ["AccountBalanceProvider"],
                                "in_proc_capabilities": ["get_account_balance", "get_total_assets"],
                                "asset_accounts": asset_codes,
                            }))
                        }
                    }
                }),
            )
    }

    async fn health_check(&self) -> ModuleHealth {
        let balance_count = self.balances.read().map(|b| b.len()).unwrap_or(0);
        let mut health = ModuleHealth::healthy("finance", ModuleGroup::Finance);
        health.dependencies.push(crate::module::DependencyHealth {
            name: "accounting_subjects (in-memory)",
            healthy: balance_count > 0,
            detail: format!("{} 个科目", balance_count),
        });
        health
    }
}
