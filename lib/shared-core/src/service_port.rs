//! 服务端口常量、Group1/Group2 权威分类清单、运行时查询函数
//!
//! 权威数据源：
//! - 端口号：`/config/ports.env`
//! - Group 1/2 分类：`/docs/superpowers/plans/2026-07-15-route-unification-contract.md`
//!
//! 用法示例：
//! ```rust
//! use topems_shared_core::{get_service_port, is_group2_service, HRM_PORT};
//!
//! assert_eq!(get_service_port("hrm"), Some(HRM_PORT));
//! assert!(is_group2_service("crm"));
//! ```

// ============ Group 1 统一入口端口 ============

/// unified-core 监听端口（Group 1 所有虚拟服务共用此端口）
pub const UNIFIED_CORE_PORT: u16 = 8000;

// ============ Group 2 独立服务端口（与 config/services.yaml 一一对应）============
// 权威源：config/services.yaml
// 注意：doc 仍是虚拟服务；monitor 已拆到 svc/monitor:8095 独立部署
//       report 已整合到 analytics（bi），不再独立服务

pub const ERP_PORT: u16 = 8010;
pub const FINANCE_PORT: u16 = 8011;
pub const AI_PORT: u16 = 8013;
pub const HRM_PORT: u16 = 8020;
pub const PM_PORT: u16 = 8023;
pub const CRM_PORT: u16 = 8029;
pub const MES_PORT: u16 = 8030;
pub const PDM_PORT: u16 = 8031;
pub const SCM_PORT: u16 = 8040;
pub const WMS_PORT: u16 = 8041;
pub const SRM_PORT: u16 = 8042;
pub const QMS_PORT: u16 = 8050;
pub const LIMS_PORT: u16 = 8051;
pub const EHS_PORT: u16 = 8052;
pub const RD_PORT: u16 = 8053;
pub const BI_PORT: u16 = 8060;
pub const PORTAL_PORT: u16 = 8063;
pub const MOBILE_PORT: u16 = 8070;
pub const GIS_PORT: u16 = 8071;
pub const INTEGRATION_PORT: u16 = 8072;
pub const TMS_PORT: u16 = 8073;
pub const APS_PORT: u16 = 8074;

// ============ 扩展服务端口（8082-8088，从 unified-core 外迁）============

pub const SEARCH_PORT: u16 = 8082;
pub const COMMUNICATION_PORT: u16 = 8084;
pub const BILLING_PORT: u16 = 8085;
pub const TICKET_PORT: u16 = 8086;
pub const FEEDBACK_PORT: u16 = 8087;
pub const LOWCODE_PORT: u16 = 8088;

// ============ 主数据服务端口 ============

pub const MASTER_DATA_PORT: u16 = 8090;

// ============ 监控服务端口 ============

/// V68.1: monitor 已拆到 svc/monitor 独立部署
pub const MONITOR_PORT: u16 = 8095;

// ============ 权威分组清单 ============

/// Group 1 — 核心虚拟服务模块列表（由 unified-core:8000 统一承载，K8s Ingress 前缀 `/api/core/*`）
/// 注意：doc 是虚拟服务；monitor 已拆出为独立服务（8095）；mail/im/notification 外迁到 communication
pub const GROUP1_MODULES: &[&str] = &["iam", "flow", "file", "doc", "automation"];

/// Group 2 — 独立进程服务列表（每个服务独立端口，K8s Ingress 前缀 `/api/{svc}/*`）
/// 每项 (svc_name, port)
/// 权威源：config/services.yaml
/// 长度断言见本文件单测 T10。
pub const GROUP2_SERVICES: &[(&str, u16)] = &[
    // 经营管理
    ("erp", ERP_PORT),
    ("finance", FINANCE_PORT),
    ("ai", AI_PORT),
    // 协同办公
    ("hrm", HRM_PORT),
    ("pm", PM_PORT),
    ("crm", CRM_PORT),
    // 生产制造
    ("mes", MES_PORT),
    ("pdm", PDM_PORT),
    // 供应链
    ("scm", SCM_PORT),
    ("wms", WMS_PORT),
    ("srm", SRM_PORT),
    // 物流（V285: 端口对齐 8073/8074，与 srm 8042 解除冲突）
    ("tms", TMS_PORT),
    ("aps", APS_PORT),
    // 质量/研发
    ("qms", QMS_PORT),
    ("lims", LIMS_PORT),
    ("ehs", EHS_PORT),
    ("rd", RD_PORT),
    // 数据分析/门户
    ("bi", BI_PORT),
    ("portal", PORTAL_PORT),
    // 基础设施
    ("mobile", MOBILE_PORT),
    ("gis", GIS_PORT),
    ("integration", INTEGRATION_PORT),
    // 主数据
    ("master-data", MASTER_DATA_PORT),
    // 监控（V68.1：拆出独立部署）
    ("monitor", MONITOR_PORT),
    // 扩展服务（从 unified-core 外迁）
    ("search", SEARCH_PORT),
    ("communication", COMMUNICATION_PORT),
    ("billing", BILLING_PORT),
    ("ticket", TICKET_PORT),
    ("feedback", FEEDBACK_PORT),
    ("lowcode", LOWCODE_PORT),
    // 别名
    ("analytics", BI_PORT), // 与 bi 共端口
];

// ============ 运行时查询函数 ============

/// 按服务短名查询端口。
///
/// ```
/// use topems_shared_core::get_service_port;
/// assert_eq!(get_service_port("hrm"), Some(8020));
/// assert_eq!(get_service_port("unknown"), None);
/// ```
pub fn get_service_port(svc: &str) -> Option<u16> {
    GROUP2_SERVICES
        .iter()
        .find(|(name, _)| *name == svc)
        .map(|(_, port)| *port)
}

/// 判断某个模块名是否属于 Group 1（unified-core 承载）。
pub fn is_group1_module(svc: &str) -> bool {
    GROUP1_MODULES.contains(&svc)
}

/// 判断某个服务名是否属于 Group 2（独立进程）。
pub fn is_group2_service(svc: &str) -> bool {
    GROUP2_SERVICES.iter().any(|(name, _)| *name == svc)
}

/// 返回本地独立服务的完整 base URL，方便 `reqwest` 反向代理或集成测试使用。
///
/// ```
/// use topems_shared_core::local_service_url;
/// assert_eq!(local_service_url("hrm"), Some("http://localhost:8020".to_string()));
/// assert_eq!(local_service_url("unknown"), None);
/// ```
pub fn local_service_url(svc: &str) -> Option<String> {
    get_service_port(svc).map(|port| format!("http://localhost:{}", port))
}

// ============ 单测 ============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn t1_get_service_port_hrm() {
        assert_eq!(get_service_port("hrm"), Some(HRM_PORT));
    }

    #[test]
    fn t2_get_service_port_crm() {
        assert_eq!(get_service_port("crm"), Some(CRM_PORT));
    }

    #[test]
    fn t3_get_service_port_erp() {
        assert_eq!(get_service_port("erp"), Some(ERP_PORT));
    }

    #[test]
    fn t4_get_service_port_analytics_alias() {
        assert_eq!(get_service_port("analytics"), Some(BI_PORT));
    }

    #[test]
    fn t5_get_service_port_unknown() {
        assert_eq!(get_service_port("unknown_svc_xxx"), None);
    }

    #[test]
    fn t6_is_group1_module_iam_true() {
        assert!(is_group1_module("iam"));
    }

    #[test]
    fn t7_is_group1_module_hrm_false() {
        assert!(!is_group1_module("hrm"));
    }

    #[test]
    fn t8_is_group2_service_crm_true() {
        assert!(is_group2_service("crm"));
    }

    #[test]
    fn t9_is_group2_service_flow_false() {
        assert!(!is_group2_service("flow"));
    }

    #[test]
    fn t10_group2_services_length_protection() {
        // 20 主服务 + tms + aps + master-data + monitor + 6 扩展 + analytics 别名 = 31
        assert_eq!(
            GROUP2_SERVICES.len(),
            31,
            "GROUP2_SERVICES 条目数变化，说明新增/删除了服务。\
            请同步更新 config/services.yaml 与本单测期望值。"
        );
    }
}
