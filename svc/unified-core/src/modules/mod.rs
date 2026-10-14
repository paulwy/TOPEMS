//! Modules for unified-core service
//! Contains IAM, Flow, File, Communication, Tenant, Billing, Plugin, and other submodules.
//!
//! 注：billing/ticket/feedback/search/communication 虽已外迁为独立微服务
//! （见 config/services.yaml 端口 8082-8087），但本 crate 内的实现仍被
//! routes/master.rs、routes/communication.rs、main.rs、iam/auth.rs 等活跃引用，
//! 作为 unified-core 内置兼容层保留。独立服务为可选的横向扩展部署方案。
//! Note: sync module was migrated to integration service (2026-07 方案 C)

pub mod audit;
pub mod automation;
// V434: Business Tools module - 统一业务工具, 连接真实服务(CRM/ERP/Finance等)
pub mod business_tools;
pub mod communication;
// V68.1 A2.3: dict 模块已合并到 svc/master-data/src/modules/dict/（主数据域）
pub mod doc;
pub mod file;
pub mod flow;
// V68.1 A2.4.2: help 模块已迁移至 svc/portal/src/modules/help/（Portal BFF 用户服务域）
pub mod iam;
// V68.1 A2.4.1: login_log 模块已合并为 audit/login_log_* 子模块（统一审计域）
pub mod master;
pub mod menu;
pub mod migration;
// V68.1 A2.1: monitor 模块已拆出到独立 svc/monitor/ crate，这里不再 re-export
pub mod openapi;
// V68.1 A2.2: plugin 模块已拆出到独立 svc/plugin-registry/（端口 8096）
pub mod subscription;
pub mod system_audit;
// P36-5: 外部集成设置（SMTP 配置 + API Key 保险库），此前模块存在但未声明/未挂载。
pub mod settings;
pub mod tenant;

// U1-b2（D1 §5 选项C 灰度下架）：以下 23 个业务镜像模块已删除——
// wms/mes/scm/finance/erp/crm/hrm/qms/pdm/ehs/analytics/pm/lims/srm/gis/tms/
// master_data/ticket/rd/integration/portal/mobile/ai。
// 它们曾是独立模式下的只读 GET 投影层（约 180 处跨业务 schema 直读），生产 nginx
// 不把业务前缀转发到 :8000（topems.conf:122-128），投影零入向流量。业务能力唯一
// 入口 = 各独立服务 / svc/server:8099 聚合。跨 schema 直读随模块目录删除一并清零。
// （communication 模块保留：ws.rs/ws_event_bridge.rs 为核心实时通信，其投影 handlers.rs 已删。）
