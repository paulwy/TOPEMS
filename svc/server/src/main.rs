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
use topems_server::platform_module::PlatformModule;
use topems_server::registry::classify_degraded_kind;
use topems_server::ModuleRegistry;
use topems_shared_bootstrap::shutdown_signal;
use topems_shared_core::logging::init_logging;

/// 记录模块降级：构建失败不阻塞启动（既有设计），但健康检查必须能看到。
///
/// 预算不足与「数据库连不上」必须可区分：前者带 `[db-budget-exhausted]` 标记，
/// 归类为 `kind=budget`；建池/探活失败归为 `kind=database`；其余为 `kind=build`。
fn note_degraded(
    registry: &Arc<Mutex<ModuleRegistry>>,
    name: &'static str,
    err: impl std::fmt::Display,
) {
    let msg = format!("{err:#}");
    let kind = classify_degraded_kind(&msg);
    if kind == "budget" {
        tracing::error!("⚠️ 模块 {name} 因数据库连接预算不足降级（kind=budget）: {msg}");
    } else {
        tracing::error!("⚠️ 模块 {name} 构建失败（降级运行，kind={kind}）: {msg}");
    }
    registry.lock().unwrap().mark_degraded(name, kind, msg);
}

/// 由服务注册表（下方模块 build 列表）推导的数据库池总数。
///
/// 唯一事实来源是 `main()` 里的模块 build 列表，计数规则：
/// - 每个 `*_real_module` 经 `bootstrap_service` 建 1 个业务池；
/// - `module-core`（unified-core）在 `embedded::build_router_embedded` 内**二次**
///   `bootstrap_service`，计 **2**；
/// - `module-advanced` 由 master-data + analytics 两个真实模块组成，计 **2**；
/// - 进程级共享迁移池计 **1**（`MIGRATE_URL` 为空时该池不建，按安全侧仍计入预算）；
/// - `platform` / `dashboard` 是纯聚合模块、不建池，显式排除在计数之外。
///
/// 新增/移除模块时必须同步修改本函数；启动末尾会用实际建池数核对并在不一致时告警。
fn derived_db_pools() -> u32 {
    #[allow(unused_mut)]
    let mut pools: u32 = 1; // 共享迁移池（create_migrate_pool 单例）

    #[cfg(feature = "module-finance")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-erp")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-qms")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-crm")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-hrm")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-scm")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-wms")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-pm")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-mes")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-ehs")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-lims")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-tms")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-pdm")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-gis")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-ticket")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-rd")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-srm")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-advanced")]
    {
        pools += 2; // master-data + analytics
    }
    #[cfg(feature = "module-communication")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-search")]
    {
        pools += 1;
    }
    // 连接治理 B 批次 1：monitor / plugin-registry / subscription 已迁移到共享运行时池
    // （`bootstrap_service_shared`），不再各自建池。它们只占 1 个物理池，但在预算
    // 公平分摊中按「模块数」权重参与，因此这里计入 SHARED_POOL_MODULE_WEIGHT 个预算单位。
    #[cfg(any(
        feature = "module-monitor",
        feature = "module-plugin-registry",
        feature = "module-subscription"
    ))]
    {
        pools += topems_shared_bootstrap::SHARED_POOL_MODULE_WEIGHT;
    }
    // 注意：上面 3 个模块各占 1 个物理池已消失，物理池数 = 本函数返回值
    // - (SHARED_POOL_MODULE_WEIGHT - 1)。
    #[cfg(feature = "module-integration")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-mobile")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-ai")]
    {
        pools += 1;
    }
    #[cfg(feature = "module-core")]
    {
        pools += 2; // unified-core 业务池 + build_router_embedded 内部业务池
    }
    #[cfg(feature = "module-portal")]
    {
        pools += 1;
    }
    // module-subscription 已迁移到共享运行时池（计在 SHARED_POOL_MODULE_WEIGHT 中）。

    pools
}

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志：LOG_FORMAT=text|json|file 控制格式（默认 text），RUST_LOG 控制级别
    // （默认 topems-server=info + 端口排查相关 directives），支持滚动文件与 JSON 结构化
    init_logging("topems-server");

    tracing::info!("🚀 启动 topems-server 模块化单体统一入口");
    tracing::info!("部署模式: private-deployment（进程内 trait 调用）");

    // 模块化单体标记：各 real_module 经 bootstrap_service 独立建池，
    // 需按小上限 + 零预热带宽收敛（详见 shared-bootstrap::embedded_pool_limits）。
    std::env::set_var("TOPEMS_EMBEDDED", "true");

    // 提前加载 .env：derived_db_pools() 需要读取 MIGRATE_URL 判断迁移池是否存在。
    // bootstrap_service 内部也会 dotenv，但那时首个池已创建、预算分母已固化。
    let _ = dotenv::dotenv();

    // 池数由注册表（下方 build 列表）推导，必须在首个池创建前设置。
    // DB_EXPECTED_POOLS 仅作一致性校验：不一致时告警并采用推导值（见 budget::from_env）。
    let derived_pools = derived_db_pools();
    topems_shared_db::database::budget::configure_expected_pools(derived_pools);
    tracing::info!(
        "数据库连接预算：池数由注册表推导 = {derived_pools}，每池默认上限 {}，默认总预算 {}",
        topems_shared_db::database::budget::DEFAULT_CONNECTIONS_PER_POOL,
        derived_pools
            .saturating_mul(topems_shared_db::database::budget::DEFAULT_CONNECTIONS_PER_POOL)
    );

    // ================================================
    // 模块注册表（共享引用，支持进程内调用）
    // ================================================
    let registry = Arc::new(Mutex::new(ModuleRegistry::new()));

    // 1. 平台零号模块（健康检查聚合）
    let platform = PlatformModule::new(registry.clone());
    registry.lock().unwrap().register_boxed(Box::new(platform));

    // 2. 业务看板模块（进程内 trait 调用；finance provider 缺失时自动降级）
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
                note_degraded(&registry, "finance", e);
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
                note_degraded(&registry, "erp", e);
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
                note_degraded(&registry, "qms", e);
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
                note_degraded(&registry, "crm", e);
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
                note_degraded(&registry, "hrm", e);
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
                note_degraded(&registry, "scm", e);
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
                note_degraded(&registry, "wms", e);
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
                note_degraded(&registry, "pm", e);
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
                note_degraded(&registry, "mes", e);
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
                note_degraded(&registry, "ehs", e);
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
                note_degraded(&registry, "lims", e);
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
                note_degraded(&registry, "tms", e);
            }
        }
    }

    // 16a. 真实 pdm 服务接入（feature `module-pdm` 门控，默认启用，P2 更多模块业务 API）
    #[cfg(feature = "module-pdm")]
    {
        use topems_server::modules::pdm_real_module::PdmRealModule;
        match PdmRealModule::build().await {
            Ok(real_pdm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_pdm));
                tracing::info!("✅ 真实 pdm 服务已注册（pdm-real，含数据库/事件总线）");
            }
            Err(e) => {
                note_degraded(&registry, "pdm", e);
            }
        }
    }

    // 16b. 真实 gis 服务接入（P3 feature flag `module-gis` 门控，默认不启用）
    #[cfg(feature = "module-gis")]
    {
        use topems_server::modules::gis_real_module::GisRealModule;
        match GisRealModule::build().await {
            Ok(real_gis) => {
                registry.lock().unwrap().register_boxed(Box::new(real_gis));
                tracing::info!("✅ 真实 gis 服务已注册（gis-real，含数据库）");
            }
            Err(e) => {
                note_degraded(&registry, "gis", e);
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
                note_degraded(&registry, "ticket", e);
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
                note_degraded(&registry, "rd", e);
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
                note_degraded(&registry, "srm", e);
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
                note_degraded(&registry, "master-data", e);
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
                note_degraded(&registry, "analytics", e);
            }
        }
    }

    // 21. 真实 communication 服务接入（Core 组，feature `module-communication` 门控，默认启用）
    #[cfg(feature = "module-communication")]
    {
        use topems_server::modules::communication_real_module::CommunicationRealModule;
        match CommunicationRealModule::build().await {
            Ok(real_comm) => {
                registry.lock().unwrap().register_boxed(Box::new(real_comm));
                tracing::info!(
                    "✅ 真实 communication 服务已注册（communication-real，含数据库/IM 通知路由）"
                );
            }
            Err(e) => {
                note_degraded(&registry, "communication", e);
            }
        }
    }

    // 22. 真实 search 服务接入（Core 组，feature `module-search` 门控，默认启用）
    #[cfg(feature = "module-search")]
    {
        use topems_server::modules::search_real_module::SearchRealModule;
        match SearchRealModule::build().await {
            Ok(real_search) => {
                registry
                    .lock()
                    .unwrap()
                    .register_boxed(Box::new(real_search));
                tracing::info!("✅ 真实 search 服务已注册（search-real，含数据库/全文搜索路由）");
            }
            Err(e) => {
                note_degraded(&registry, "search", e);
            }
        }
    }

    // 23. 真实 monitor 服务接入（Core 组，feature `module-monitor` 门控，默认启用）
    #[cfg(feature = "module-monitor")]
    {
        use topems_server::modules::monitor_real_module::MonitorRealModule;
        match MonitorRealModule::build().await {
            Ok(real_monitor) => {
                registry
                    .lock()
                    .unwrap()
                    .register_boxed(Box::new(real_monitor));
                tracing::info!("✅ 真实 monitor 服务已注册（monitor-real，含数据库/监控告警路由）");
            }
            Err(e) => {
                note_degraded(&registry, "monitor", e);
            }
        }
    }

    // 24. 真实 plugin-registry 服务接入（Core 组，feature `module-plugin-registry` 门控，默认启用）
    #[cfg(feature = "module-plugin-registry")]
    {
        use topems_server::modules::plugin_registry_real_module::PluginRegistryRealModule;
        match PluginRegistryRealModule::build().await {
            Ok(real_pr) => {
                registry.lock().unwrap().register_boxed(Box::new(real_pr));
                tracing::info!("✅ 真实 plugin-registry 服务已注册（plugin-registry-real，含数据库/插件注册路由）");
            }
            Err(e) => {
                note_degraded(&registry, "plugin-registry", e);
            }
        }
    }

    // 25. 真实 integration 服务接入（Core 组，feature `module-integration` 门控，默认启用）
    #[cfg(feature = "module-integration")]
    {
        use topems_server::modules::integration_real_module::IntegrationRealModule;
        match IntegrationRealModule::build().await {
            Ok(real_intg) => {
                registry.lock().unwrap().register_boxed(Box::new(real_intg));
                tracing::info!(
                    "✅ 真实 integration 服务已注册（integration-real，含数据库/系统集成路由）"
                );
            }
            Err(e) => {
                note_degraded(&registry, "integration", e);
            }
        }
    }

    // 26. 真实 mobile 服务接入（Core 组，feature `module-mobile` 门控，默认启用）
    #[cfg(feature = "module-mobile")]
    {
        use topems_server::modules::mobile_real_module::MobileRealModule;
        match MobileRealModule::build().await {
            Ok(real_mobile) => {
                registry
                    .lock()
                    .unwrap()
                    .register_boxed(Box::new(real_mobile));
                tracing::info!("✅ 真实 mobile 服务已注册（mobile-real，含数据库/移动端路由）");
            }
            Err(e) => {
                note_degraded(&registry, "mobile", e);
            }
        }
    }

    // 27. 真实 ai 服务接入（Core 组，feature `module-ai` 门控，默认启用）
    // [2026-09-16] AI 智能服务（知识库/QA/分析/Agent/DSH 编排），AppState 组装复用独立部署 main.rs
    #[cfg(feature = "module-ai")]
    {
        use topems_server::modules::ai_real_module::AiRealModule;
        match AiRealModule::build().await {
            Ok(real_ai) => {
                registry.lock().unwrap().register_boxed(Box::new(real_ai));
                tracing::info!("✅ 真实 ai 服务已注册（ai-real，含知识库/QA/Analysis/Agent 路由）");
            }
            Err(e) => {
                note_degraded(&registry, "ai", e);
            }
        }
    }

    // 28. 真实 unified-core 服务接入（Core 组，feature `module-core` 门控，默认启用）
    // [2026-09-16] 认证/登录/流程/IAM 等统一入口（routes 已 nest /api/core 隔离根路径冲突）
    #[cfg(feature = "module-core")]
    {
        use topems_server::modules::unified_core_real_module::UnifiedCoreRealModule;
        match UnifiedCoreRealModule::build().await {
            Ok(real_core) => {
                registry.lock().unwrap().register_boxed(Box::new(real_core));
                tracing::info!(
                    "✅ 真实 unified-core 服务已注册（unified-core-real，含 IAM/Flow/File/Tenant 路由）"
                );
            }
            Err(e) => {
                note_degraded(&registry, "unified-core", e);
            }
        }
    }

    // 28. 真实 portal 服务接入（Core 组，feature `module-portal` 门控，默认启用）
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
                note_degraded(&registry, "portal", e);
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
                note_degraded(&registry, "subscription", e);
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

    // 池数与注册表一致性核对（只告警，不阻塞启动）：
    // - 实际建池数 > 推导值 → derived_db_pools() 漏计，预算分母偏小，后续易误判额度不足；
    // - 实际建池数 + 降级模块数 < 推导值 → 有模块未建池却未在 derived_db_pools() 中显式排除。
    {
        let snap = topems_shared_db::database::budget::snapshot();
        let degraded = registry.lock().unwrap().degraded_modules().len() as u32;
        let migrate_expected: u32 = if std::env::var("MIGRATE_URL")
            .map(|v| !v.trim().is_empty())
            .unwrap_or(false)
        {
            1
        } else {
            0
        };
        let physical_expected = derived_pools
            .saturating_sub(1)
            .saturating_add(migrate_expected)
            .saturating_sub(topems_shared_bootstrap::SHARED_POOL_MODULE_WEIGHT - 1);
        tracing::info!(
            "[db-budget] 启动核对：注册表推导 {} 预算单位（物理池 {}），实际建池 {}，降级 {}，预算 {}，已分配 {}",
            derived_pools,
            physical_expected,
            snap.physical_pools,
            degraded,
            snap.total,
            snap.allocated
        );
        if snap.physical_pools > physical_expected {
            tracing::warn!(
                "[db-budget] 实际建池数 {} 超过注册表推导值 {}：derived_db_pools() 与 build 列表不一致（预算分母偏小）",
                snap.physical_pools,
                physical_expected
            );
        } else if degraded == 0 && snap.physical_pools < physical_expected {
            tracing::warn!(
                "[db-budget] 实际建池 {} < 推导 {}：有模块未建池却未在 derived_db_pools() 中显式排除（无降级可解释）",
                snap.physical_pools,
                physical_expected
            );
        }
    }

    // ================================================
    // 启动 HTTP 服务（健康检查 + 模块路由聚合）
    // ================================================
    let port = std::env::var("SERVER_PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8099);

    let app = registry.lock().unwrap().merge_routes();
    // [U1-b2 D1] 原 3 行借用 unified-core mes 投影 handler 的根层路由（/ws/mes/dashboard、
    // /api/mes/dashboard/stats、/api/mes/dashboard/initial）已随 unified-core mes 镜像模块删除而解引用。
    // 生产 nginx 全 /api/* 统一代理 topems-server:8099（无 per-service 转发，P0-3 双轨合一）；
    // 真实 mes 模块（mes_real_module → topems_mes::create_routes 挂 /api/mes）已提供业务路由；ws 看板如需在
    // :8099 恢复，应由 mes_real_module 内嵌 topems_mes::dashboard_ws（属 server 侧后续接线，非 U1 范围）。
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("topems-server 监听于 http://{}", addr);
    tracing::info!("健康检查: http://localhost:{}/api/server/health", port);
    tracing::info!(
        "进程内调用演示: http://localhost:{}/api/dashboard/financial-summary",
        port
    );

    // 优雅停机：SIGTERM/Ctrl+C → 停止接受新连接、排空在途请求。
    // 模块化单体的 PgPool 由各 real_module 内部持有（经 bootstrap_service 创建），
    // 本函数不直接触达；HTTP 排空后随 runtime 退出由 sqlx 自行回收。
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    tracing::info!("✅ topems-server 优雅停机完成");
    Ok(())
}
