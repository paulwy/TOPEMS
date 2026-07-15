//! 服务端口常量、Group1/Group2 权威分类清单、运行时查询函数
//!
//! 权威数据源：
//! - 端口号：`/config/ports.env`
//! - Group 1/2 分类：`/docs/superpowers/plans/2026-07-15-route-unification-contract.md`
//!
//! 用法示例：
//! ```rust
//! use topems_lib::service_port::{get_service_port, is_group2_service, HRM_PORT};
//!
//! assert_eq!(get_service_port("hrm"), Some(HRM_PORT));
//! assert!(is_group2_service("crm"));
//! ```

// ============ Group 1 统一入口端口 ============

/// unified-core 监听端口（Group 1 所有虚拟服务共用此端口）
pub const UNIFIED_CORE_PORT: u16 = 8000;

// ============ Group 2 独立服务端口（与 config/ports.env 一一对应）============

pub const ERP_PORT: u16 = 8010;
pub const FINANCE_PORT: u16 = 8011;
pub const DOC_PORT: u16 = 8012;
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
pub const REPORT_PORT: u16 = 8061;
pub const MONITOR_PORT: u16 = 8062;
pub const PORTAL_PORT: u16 = 8063;
pub const MOBILE_PORT: u16 = 8070;
pub const GIS_PORT: u16 = 8071;
pub const INTEGRATION_PORT: u16 = 8072;

// ============ 权威分组清单 ============

/// Group 1 — 核心虚拟服务模块列表（由 unified-core:8000 统一承载，K8s Ingress 前缀 `/api/core/*`）
pub const GROUP1_MODULES: &[&str] = &[
    "iam",
    "flow",
    "file",
    "mail",
    "im",
    "notification",
    "master",
    "migration",
    "comm",
];

/// Group 2 — 独立进程服务列表（每个服务独立端口，K8s Ingress 前缀 `/api/{svc}/*`）
/// 每项 (svc_name, port)
/// 含 23 个主服务 + 1 个 analytics 别名（与 bi 共端口）= 24 条目；
/// 长度断言见本文件单测 T10。
pub const GROUP2_SERVICES: &[(&str, u16)] = &[
    ("erp", ERP_PORT),
    ("finance", FINANCE_PORT),
    ("doc", DOC_PORT),
    ("ai", AI_PORT),
    ("hrm", HRM_PORT),
    ("pm", PM_PORT),
    ("crm", CRM_PORT),
    ("mes", MES_PORT),
    ("pdm", PDM_PORT),
    ("scm", SCM_PORT),
    ("wms", WMS_PORT),
    ("srm", SRM_PORT),
    ("qms", QMS_PORT),
    ("lims", LIMS_PORT),
    ("ehs", EHS_PORT),
    ("rd", RD_PORT),
    ("bi", BI_PORT),
    ("report", REPORT_PORT),
    ("monitor", MONITOR_PORT),
    ("portal", PORTAL_PORT),
    ("mobile", MOBILE_PORT),
    ("gis", GIS_PORT),
    ("integration", INTEGRATION_PORT),
    ("analytics", BI_PORT), // 别名：与 bi 共端口
];

// ============ 运行时查询函数 ============

/// 按服务短名查询端口。
///
/// ```
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
        // 23 主服务 + analytics 1 别名 = 24
        assert_eq!(
            GROUP2_SERVICES.len(),
            24,
            "GROUP2_SERVICES 条目数变化，说明新增/删除了服务。\
            请同步更新 V9.0 路由契约文档与本单测期望值。"
        );
    }
}
