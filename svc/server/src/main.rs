//! topems-server 统一入口（模块化单体）
//!
//! 启动方式：
//!   cargo run -p topems-server
//!
//! 模块组裁剪（仅编译指定模块组）：
//!   cargo run -p topems-server --no-default-features --features module-core,module-erp
//!
//! 部署模式：
//!   private-deployment：进程内 trait 调用（默认，见 providers.rs）
//!   saas-deployment：保留 HTTP 服务间调用

use anyhow::Result;
use std::sync::{Arc, Mutex};
use topems_server::modules::dashboard_module::DashboardModule;
use topems_server::modules::finance_module::FinanceModule;
use topems_server::platform_module::PlatformModule;
use topems_server::ModuleRegistry;

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=info".into()),
        )
        .init();

    tracing::info!("🚀 启动 topems-server 模块化单体统一入口");
    tracing::info!("部署模式: private-deployment（进程内 trait 调用）");

    // ================================================
    // 模块注册表（共享引用，支持进程内调用）
    // ================================================
    let registry = Arc::new(Mutex::new(ModuleRegistry::new()));

    // 1. 平台零号模块（健康检查聚合）
    let platform = PlatformModule::new(registry.clone());
    registry.lock().unwrap().register_boxed(Box::new(platform));

    // 2. 财务模块（实现 AccountBalanceProvider 进程内调用契约）
    let finance = FinanceModule::new();
    {
        let mut reg = registry.lock().unwrap();
        // 注册进程内 provider：其他模块可通过 trait 直接调用（非 HTTP）
        reg.register_account_balance_provider(Arc::new(finance.clone()));
        // 注册为模块：路由合并到统一入口
        reg.register_boxed(Box::new(finance));
    }

    // 3. 业务看板模块（通过进程内 trait 调用 finance，演示跨模块调用）
    let dashboard = DashboardModule::new(registry.clone());
    registry.lock().unwrap().register_boxed(Box::new(dashboard));

    // 4. 真实 finance 服务接入（Phase B3，feature `module-finance` 门控）
    //    使用真实业务代码：数据库 + 事件总线 + 完整路由
    #[cfg(feature = "module-finance")]
    {
        use topems_server::modules::finance_real_module::FinanceRealModule;
        match FinanceRealModule::build().await {
            Ok(real_finance) => {
                registry
                    .lock()
                    .unwrap()
                    .register_boxed(Box::new(real_finance));
                tracing::info!("✅ 真实 finance 服务已注册（finance-real，含数据库/事件总线）");
            }
            Err(e) => {
                // 真实服务依赖数据库，构建失败时降级运行（不阻塞统一入口）
                tracing::error!("⚠️ 真实 finance 服务构建失败（降级为演示模块）: {:#}", e);
            }
        }
    }

    // 5. 真实 erp 服务接入（Phase B3 扩展，feature `module-erp` 门控）
    #[cfg(feature = "module-erp")]
    {
        use topems_server::modules::erp_real_module::ErpRealModule;
        match ErpRealModule::build().await {
            Ok(real_erp) => {
                registry.lock().unwrap().register_boxed(Box::new(real_erp));
                tracing::info!("✅ 真实 erp 服务已注册（erp-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 erp 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 6. 真实 qms 服务接入（Phase B3 扩展，feature `module-qms` 门控）
    #[cfg(feature = "module-qms")]
    {
        use topems_server::modules::qms_real_module::QmsRealModule;
        match QmsRealModule::build().await {
            Ok(real_qms) => {
                registry.lock().unwrap().register_boxed(Box::new(real_qms));
                tracing::info!("✅ 真实 qms 服务已注册（qms-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 qms 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 7. 真实 crm 服务接入（Phase B3 扩展，feature `module-crm` 门控）
    #[cfg(feature = "module-crm")]
    {
        use topems_server::modules::crm_real_module::CrmRealModule;
        match CrmRealModule::build().await {
            Ok(real_crm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_crm));
                tracing::info!("✅ 真实 crm 服务已注册（crm-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 crm 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 8. 真实 hrm 服务接入（Phase B3 扩展，feature `module-hrm` 门控）
    #[cfg(feature = "module-hrm")]
    {
        use topems_server::modules::hrm_real_module::HrmRealModule;
        match HrmRealModule::build().await {
            Ok(real_hrm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_hrm));
                tracing::info!("✅ 真实 hrm 服务已注册（hrm-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 hrm 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 9. 真实 scm 服务接入（Phase B3 扩展，feature `module-scm` 门控）
    #[cfg(feature = "module-scm")]
    {
        use topems_server::modules::scm_real_module::ScmRealModule;
        match ScmRealModule::build().await {
            Ok(real_scm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_scm));
                tracing::info!("✅ 真实 scm 服务已注册（scm-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 scm 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 10. 真实 wms 服务接入（Phase B3 扩展，feature `module-wms` 门控）
    #[cfg(feature = "module-wms")]
    {
        use topems_server::modules::wms_real_module::WmsRealModule;
        match WmsRealModule::build().await {
            Ok(real_wms) => {
                registry.lock().unwrap().register_boxed(Box::new(real_wms));
                tracing::info!("✅ 真实 wms 服务已注册（wms-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 wms 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 11. [V2026.08 已合并] aps 服务接入已移除（aps 合并至 mes，由 module-mes 承载）

    // 12. 真实 pm 服务接入（Phase B3 扩展，feature `module-pm` 门控）
    #[cfg(feature = "module-pm")]
    {
        use topems_server::modules::pm_real_module::PmRealModule;
        match PmRealModule::build().await {
            Ok(real_pm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_pm));
                tracing::info!("✅ 真实 pm 服务已注册（pm-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 pm 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 13. 真实 mes 服务接入（Phase B3 扩展，feature `module-mes` 门控）
    #[cfg(feature = "module-mes")]
    {
        use topems_server::modules::mes_real_module::MesRealModule;
        match MesRealModule::build().await {
            Ok(real_mes) => {
                registry.lock().unwrap().register_boxed(Box::new(real_mes));
                tracing::info!("✅ 真实 mes 服务已注册（mes-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 mes 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 14. 真实 ehs 服务接入（Phase B3 扩展，feature `module-ehs` 门控）
    #[cfg(feature = "module-ehs")]
    {
        use topems_server::modules::ehs_real_module::EhsRealModule;
        match EhsRealModule::build().await {
            Ok(real_ehs) => {
                registry.lock().unwrap().register_boxed(Box::new(real_ehs));
                tracing::info!("✅ 真实 ehs 服务已注册（ehs-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 ehs 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 15. 真实 lims 服务接入（Phase B3 扩展，feature `module-lims` 门控）
    #[cfg(feature = "module-lims")]
    {
        use topems_server::modules::lims_real_module::LimsRealModule;
        match LimsRealModule::build().await {
            Ok(real_lims) => {
                registry.lock().unwrap().register_boxed(Box::new(real_lims));
                tracing::info!("✅ 真实 lims 服务已注册（lims-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 lims 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 16. 真实 tms 服务接入（P3 feature flag `module-tms` 门控，默认不启用）
    #[cfg(feature = "module-tms")]
    {
        use topems_server::modules::tms_real_module::TmsRealModule;
        match TmsRealModule::build().await {
            Ok(real_tms) => {
                registry.lock().unwrap().register_boxed(Box::new(real_tms));
                tracing::info!("✅ 真实 tms 服务已注册（tms-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 tms 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 17. 真实 ticket 服务接入（feature `module-ticket` 门控，默认启用）
    #[cfg(feature = "module-ticket")]
    {
        use topems_server::modules::ticket_real_module::TicketRealModule;
        match TicketRealModule::build().await {
            Ok(real_ticket) => {
                registry
                    .lock()
                    .unwrap()
                    .register_boxed(Box::new(real_ticket));
                tracing::info!("✅ 真实 ticket 服务已注册（ticket-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 ticket 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 18. 真实 rd 服务接入（feature `module-rd` 门控，默认启用）
    #[cfg(feature = "module-rd")]
    {
        use topems_server::modules::rd_real_module::RdRealModule;
        match RdRealModule::build().await {
            Ok(real_rd) => {
                registry.lock().unwrap().register_boxed(Box::new(real_rd));
                tracing::info!("✅ 真实 rd 服务已注册（rd-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 rd 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 19. 真实 srm 服务接入（feature `module-srm` 门控，默认启用）
    #[cfg(feature = "module-srm")]
    {
        use topems_server::modules::srm_real_module::SrmRealModule;
        match SrmRealModule::build().await {
            Ok(real_srm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_srm));
                tracing::info!("✅ 真实 srm 服务已注册（srm-real，含数据库/事件总线）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 srm 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 20. 真实 master-data 服务接入（advanced 组，feature `module-advanced` 门控，默认启用）
    #[cfg(feature = "module-advanced")]
    {
        use topems_server::modules::master_data_real_module::MasterDataRealModule;
        match MasterDataRealModule::build().await {
            Ok(real_md) => {
                registry.lock().unwrap().register_boxed(Box::new(real_md));
                tracing::info!(
                    "✅ 真实 master-data 服务已注册（master-data-real，含数据库/事件总线）"
                );
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 master-data 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 20b. 真实 analytics 服务接入（advanced 组，feature `module-advanced` 门控，默认启用）
    #[cfg(feature = "module-advanced")]
    {
        use topems_server::modules::analytics_real_module::AnalyticsRealModule;
        match AnalyticsRealModule::build().await {
            Ok(real_bi) => {
                registry.lock().unwrap().register_boxed(Box::new(real_bi));
                tracing::info!("✅ 真实 analytics 服务已注册（analytics-real，含数据库/BI 路由）");
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 analytics 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 21. 真实 portal 服务接入（Core 组，feature `module-portal` 门控，默认启用）
    // [2026-09-08] portal 嵌入模块化单体：业务组装链由 lib 侧 embedded::build_router 统一提供，
    // 独立部署 main.rs 与 server 嵌入共用同一实现，消除双轨漂移
    #[cfg(feature = "module-portal")]
    {
        use topems_server::modules::portal_real_module::PortalRealModule;
        match PortalRealModule::build().await {
            Ok(real_portal) => {
                registry
                    .lock()
                    .unwrap()
                    .register_boxed(Box::new(real_portal));
                tracing::info!(
                    "✅ 真实 portal 服务已注册（portal-real，含数据库/GraphQL 聚合层/事件总线）"
                );
            }
            Err(e) => {
                tracing::error!("⚠️ 真实 portal 服务构建失败（降级运行）: {:#}", e);
            }
        }
    }

    // 17. 订阅管理模块（P5 商业化支撑，feature `module-subscription` 门控）
    #[cfg(feature = "module-subscription")]
    {
        use topems_server::modules::subscription_module::SubscriptionModule;
        match SubscriptionModule::build().await {
            Ok(sub) => {
                registry.lock().unwrap().register_boxed(Box::new(sub));
                tracing::info!("✅ 订阅模块已注册（subscription，含数据库）");
            }
            Err(e) => {
                tracing::error!("⚠️ 订阅模块构建失败（降级运行）: {:#}", e);
            }
        }
    }

    {
        let reg = registry.lock().unwrap();
        tracing::info!(
            "已注册模块: {} 个 | 进程内 provider: {} 个",
            reg.len(),
            reg.provider_count()
        );
    }

    // ================================================
    // 启动 HTTP 服务（健康检查 + 模块路由聚合）
    // ================================================
    let port = std::env::var("SERVER_PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8099);

    let app = registry.lock().unwrap().merge_routes();
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("topems-server 监听于 http://{}", addr);
    tracing::info!("健康检查: http://localhost:{}/api/server/health", port);
    tracing::info!(
        "进程内调用演示: http://localhost:{}/api/dashboard/financial-summary",
        port
    );

    axum::serve(listener, app).await?;
    Ok(())
}
