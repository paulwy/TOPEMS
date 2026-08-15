#![allow(dead_code)]

//! Integration 服务权限枚举。
//!
//! 定义 10 类跨主体同步权限（Read / Write / Admin × 五大同步域），
//! 映射到 shared-permission 层的统一 ModuleCode + PermissionAction。

use topems_shared_auth::permission::{
    ModuleCode, ModulePermission as SharedModulePermission, PermissionAction,
};

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum IntegrationPermission {
    // ---- Mes <-> Erp ----
    MesErpSyncRead,
    MesErpSyncWrite,
    // ---- Mes <-> Qms ----
    MesQmsSyncRead,
    MesQmsSyncWrite,
    // ---- Crm <-> Erp / Scm ----
    CrmBizSyncRead,
    CrmBizSyncWrite,
    // ---- Erp <-> Wms ----
    ErpWmsSyncRead,
    ErpWmsSyncWrite,
    // ---- Qms <-> Lims <-> Ehs / Hrm -> Finance ----
    CrossDomainRead,
    CrossDomainWrite,
    // ---- 超级权限 ----
    All,
}

impl IntegrationPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        use IntegrationPermission::*;
        match self {
            MesErpSyncRead => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Read)
            }
            MesErpSyncWrite => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Write)
            }
            MesQmsSyncRead => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Read)
            }
            MesQmsSyncWrite => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Write)
            }
            CrmBizSyncRead => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Read)
            }
            CrmBizSyncWrite => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Write)
            }
            ErpWmsSyncRead => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Read)
            }
            ErpWmsSyncWrite => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Write)
            }
            CrossDomainRead => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Read)
            }
            CrossDomainWrite => {
                SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Write)
            }
            All => SharedModulePermission::new(ModuleCode::Integration, PermissionAction::Admin),
        }
    }

    /// 返回权限所属的逻辑域（MesErp / MesQms / CrmBiz / ErpWms / CrossDomain）。
    pub fn domain(&self) -> &'static str {
        use IntegrationPermission::*;
        match self {
            MesErpSyncRead | MesErpSyncWrite => "MesErp",
            MesQmsSyncRead | MesQmsSyncWrite => "MesQms",
            CrmBizSyncRead | CrmBizSyncWrite => "CrmBiz",
            ErpWmsSyncRead | ErpWmsSyncWrite => "ErpWms",
            CrossDomainRead | CrossDomainWrite => "CrossDomain",
            All => "All",
        }
    }

    /// 是否是写权限（含 Admin）。
    pub fn is_write_or_higher(&self) -> bool {
        matches!(
            self,
            IntegrationPermission::MesErpSyncWrite
                | IntegrationPermission::MesQmsSyncWrite
                | IntegrationPermission::CrmBizSyncWrite
                | IntegrationPermission::ErpWmsSyncWrite
                | IntegrationPermission::CrossDomainWrite
                | IntegrationPermission::All
        )
    }
}

impl std::fmt::Display for IntegrationPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = IntegrationPermission;

#[cfg(test)]
mod tests {
    use super::*;
    use IntegrationPermission::*;

    // ---- to_shared 每变体覆盖 ----

    #[test]
    fn test_mes_erp_read() {
        let p = MesErpSyncRead.to_shared();
        assert_eq!(p.module, ModuleCode::Integration);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_mes_erp_write() {
        let p = MesErpSyncWrite.to_shared();
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_mes_qms_read() {
        let p = MesQmsSyncRead.to_shared();
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_mes_qms_write() {
        let p = MesQmsSyncWrite.to_shared();
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_crm_biz_read() {
        let p = CrmBizSyncRead.to_shared();
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_crm_biz_write() {
        let p = CrmBizSyncWrite.to_shared();
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_erp_wms_read() {
        let p = ErpWmsSyncRead.to_shared();
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_erp_wms_write() {
        let p = ErpWmsSyncWrite.to_shared();
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_cross_domain_read() {
        let p = CrossDomainRead.to_shared();
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_cross_domain_write() {
        let p = CrossDomainWrite.to_shared();
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_all_admin() {
        let p = All.to_shared();
        assert_eq!(p.action, PermissionAction::Admin);
    }

    // ---- domain() 分组 ----

    #[test]
    fn test_domain_groups() {
        assert_eq!(MesErpSyncRead.domain(), "MesErp");
        assert_eq!(MesErpSyncWrite.domain(), "MesErp");
        assert_eq!(MesQmsSyncRead.domain(), "MesQms");
        assert_eq!(CrmBizSyncRead.domain(), "CrmBiz");
        assert_eq!(ErpWmsSyncRead.domain(), "ErpWms");
        assert_eq!(CrossDomainRead.domain(), "CrossDomain");
        assert_eq!(All.domain(), "All");
    }

    // ---- is_write_or_higher ----

    #[test]
    fn test_is_write_or_higher_write_variants() {
        let writes = [
            MesErpSyncWrite,
            MesQmsSyncWrite,
            CrmBizSyncWrite,
            ErpWmsSyncWrite,
            CrossDomainWrite,
            All,
        ];
        for w in &writes {
            assert!(w.is_write_or_higher(), "{:?}", w);
        }
    }

    #[test]
    fn test_is_write_or_higher_read_variants_not() {
        let reads = [
            MesErpSyncRead,
            MesQmsSyncRead,
            CrmBizSyncRead,
            ErpWmsSyncRead,
            CrossDomainRead,
        ];
        for r in &reads {
            assert!(!r.is_write_or_higher(), "{:?}", r);
        }
    }

    // ---- Display / Clone / PartialEq 基本 trait ----

    #[test]
    fn test_display_format() {
        let s = format!("{}", MesErpSyncWrite);
        assert_eq!(s, "integration:write");
    }

    #[test]
    fn test_display_admin() {
        let s = format!("{}", All);
        assert_eq!(s, "integration:admin");
    }

    #[test]
    fn test_permission_variant_equality() {
        assert_eq!(MesErpSyncRead, MesErpSyncRead);
        assert_ne!(MesErpSyncRead, MesErpSyncWrite);
    }

    // ---- 全变体统一属性 ----

    #[test]
    fn test_all_variants_use_integration_module() {
        let all = [
            MesErpSyncRead,
            MesErpSyncWrite,
            MesQmsSyncRead,
            MesQmsSyncWrite,
            CrmBizSyncRead,
            CrmBizSyncWrite,
            ErpWmsSyncRead,
            ErpWmsSyncWrite,
            CrossDomainRead,
            CrossDomainWrite,
            All,
        ];
        for v in &all {
            assert_eq!(v.to_shared().module, ModuleCode::Integration);
        }
    }
}
