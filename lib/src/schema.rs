//! TOPEMS 系统的 Schema 定义
//! 为了确保数据库架构隔离，每个服务都应该只访问自己对应的 Schema

pub const PUBLIC_SCHEMA: &str = "public";
pub const UNIFIED_CORE_SCHEMA: &str = "unified_core";

pub const HRM_SCHEMA: &str = "plugin_hrm";
pub const ERP_SCHEMA: &str = "plugin_erp";
pub const PM_SCHEMA: &str = "plugin_pm";
pub const CRM_SCHEMA: &str = "plugin_crm";
pub const QMS_SCHEMA: &str = "plugin_qms";
pub const MES_SCHEMA: &str = "plugin_mes";
pub const WMS_SCHEMA: &str = "plugin_wms";
pub const SRM_SCHEMA: &str = "plugin_srm";
pub const SCM_SCHEMA: &str = "plugin_scm";
pub const PDM_SCHEMA: &str = "plugin_pdm";
pub const LIMS_SCHEMA: &str = "plugin_lims";
pub const RS_SCHEMA: &str = "plugin_rs";
pub const GIS_SCHEMA: &str = "plugin_gis";
pub const EHS_SCHEMA: &str = "plugin_ehs";
pub const BI_SCHEMA: &str = "plugin_bi";
pub const AI_SCHEMA: &str = "plugin_ai";
pub const IM_SCHEMA: &str = "plugin_im";
pub const INTEGRATION_SCHEMA: &str = "plugin_integration";
pub const MAIL_SCHEMA: &str = "plugin_mail";
pub const MOBILE_SCHEMA: &str = "plugin_mobile";
pub const PORTAL_SCHEMA: &str = "plugin_portal";

pub fn with_schema(table_name: &str, schema: &str) -> String {
    format!("{}.{}", schema, table_name)
}

pub fn public_table(table_name: &str) -> String {
    with_schema(table_name, PUBLIC_SCHEMA)
}

pub fn unified_core_table(table_name: &str) -> String {
    with_schema(table_name, UNIFIED_CORE_SCHEMA)
}

pub fn hrm_table(table_name: &str) -> String {
    with_schema(table_name, HRM_SCHEMA)
}

pub fn erp_table(table_name: &str) -> String {
    with_schema(table_name, ERP_SCHEMA)
}

pub fn pm_table(table_name: &str) -> String {
    with_schema(table_name, PM_SCHEMA)
}

pub fn crm_table(table_name: &str) -> String {
    with_schema(table_name, CRM_SCHEMA)
}

pub fn qms_table(table_name: &str) -> String {
    with_schema(table_name, QMS_SCHEMA)
}

pub fn mes_table(table_name: &str) -> String {
    with_schema(table_name, MES_SCHEMA)
}

pub fn wms_table(table_name: &str) -> String {
    with_schema(table_name, WMS_SCHEMA)
}

pub fn srm_table(table_name: &str) -> String {
    with_schema(table_name, SRM_SCHEMA)
}

pub fn scm_table(table_name: &str) -> String {
    with_schema(table_name, SCM_SCHEMA)
}

pub fn pdm_table(table_name: &str) -> String {
    with_schema(table_name, PDM_SCHEMA)
}

pub fn lims_table(table_name: &str) -> String {
    with_schema(table_name, LIMS_SCHEMA)
}

pub fn rs_table(table_name: &str) -> String {
    with_schema(table_name, RS_SCHEMA)
}

pub fn gis_table(table_name: &str) -> String {
    with_schema(table_name, GIS_SCHEMA)
}

pub fn ehs_table(table_name: &str) -> String {
    with_schema(table_name, EHS_SCHEMA)
}

pub fn bi_table(table_name: &str) -> String {
    with_schema(table_name, BI_SCHEMA)
}

pub fn ai_table(table_name: &str) -> String {
    with_schema(table_name, AI_SCHEMA)
}

pub fn im_table(table_name: &str) -> String {
    with_schema(table_name, IM_SCHEMA)
}

pub fn integration_table(table_name: &str) -> String {
    with_schema(table_name, INTEGRATION_SCHEMA)
}

pub fn mail_table(table_name: &str) -> String {
    with_schema(table_name, MAIL_SCHEMA)
}

pub fn mobile_table(table_name: &str) -> String {
    with_schema(table_name, MOBILE_SCHEMA)
}

pub fn portal_table(table_name: &str) -> String {
    with_schema(table_name, PORTAL_SCHEMA)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_schema() {
        assert_eq!(with_schema("users", "test"), "test.users");
    }

    #[test]
    fn test_public_table() {
        assert_eq!(public_table("tenants"), "public.tenants");
        assert_eq!(public_table("companies"), "public.companies");
    }

    #[test]
    fn test_hrm_table() {
        assert_eq!(hrm_table("payroll_runs"), "plugin_hrm.payroll_runs");
        assert_eq!(
            hrm_table("attendance_records"),
            "plugin_hrm.attendance_records"
        );
    }

    #[test]
    fn test_erp_table() {
        assert_eq!(erp_table("assets"), "plugin_erp.assets");
        assert_eq!(
            erp_table("financial_records"),
            "plugin_erp.financial_records"
        );
    }

    #[test]
    fn test_pm_table() {
        assert_eq!(pm_table("projects"), "plugin_pm.projects");
    }
}
