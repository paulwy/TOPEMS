/// TOPEMS 系统的 Schema 定义
/// 为了确保数据库架构隔离，每个服务都应该只访问自己对应的 Schema

pub const HRM_SCHEMA: &str = "hrm";
pub const ERP_SCHEMA: &str = "erp";
pub const PM_SCHEMA: &str = "pm";
pub const CRM_SCHEMA: &str = "crm";
pub const QMS_SCHEMA: &str = "qms";
pub const MES_SCHEMA: &str = "mes";
pub const WMS_SCHEMA: &str = "wms";
pub const SRM_SCHEMA: &str = "srm";
pub const SCM_SCHEMA: &str = "scm";
pub const PDM_SCHEMA: &str = "pdm";
pub const LIMS_SCHEMA: &str = "lims";
pub const RS_SCHEMA: &str = "rs";
pub const GIS_SCHEMA: &str = "gis";
pub const EHS_SCHEMA: &str = "ehs";
pub const BI_SCHEMA: &str = "bi";
pub const AI_SCHEMA: &str = "ai";
pub const IM_SCHEMA: &str = "im";
pub const INTEGRATION_SCHEMA: &str = "integration";
pub const MAIL_SCHEMA: &str = "mail";
pub const MOBILE_SCHEMA: &str = "mobile";
pub const PORTAL_SCHEMA: &str = "portal";

/// 为表名添加指定的 Schema 前缀
pub fn with_schema(table_name: &str, schema: &str) -> String {
    format!("{}.{}", schema, table_name)
}

/// 为 HRM 模块的表添加前缀
pub fn hrm_table(table_name: &str) -> String {
    with_schema(table_name, HRM_SCHEMA)
}

/// 为 ERP 模块的表添加前缀
pub fn erp_table(table_name: &str) -> String {
    with_schema(table_name, ERP_SCHEMA)
}

/// 为 PM 模块的表添加前缀
pub fn pm_table(table_name: &str) -> String {
    with_schema(table_name, PM_SCHEMA)
}

/// 为 CRM 模块的表添加前缀
pub fn crm_table(table_name: &str) -> String {
    with_schema(table_name, CRM_SCHEMA)
}

/// 为 QMS 模块的表添加前缀
pub fn qms_table(table_name: &str) -> String {
    with_schema(table_name, QMS_SCHEMA)
}

/// 为 MES 模块的表添加前缀
pub fn mes_table(table_name: &str) -> String {
    with_schema(table_name, MES_SCHEMA)
}

/// 为 WMS 模块的表添加前缀
pub fn wms_table(table_name: &str) -> String {
    with_schema(table_name, WMS_SCHEMA)
}

/// 为 SRM 模块的表添加前缀
pub fn srm_table(table_name: &str) -> String {
    with_schema(table_name, SRM_SCHEMA)
}

/// 为 SCM 模块的表添加前缀
pub fn scm_table(table_name: &str) -> String {
    with_schema(table_name, SCM_SCHEMA)
}

/// 为 PDM 模块的表添加前缀
pub fn pdm_table(table_name: &str) -> String {
    with_schema(table_name, PDM_SCHEMA)
}

/// 为 LIMS 模块的表添加前缀
pub fn lims_table(table_name: &str) -> String {
    with_schema(table_name, LIMS_SCHEMA)
}

/// 为 RS 模块的表添加前缀
pub fn rs_table(table_name: &str) -> String {
    with_schema(table_name, RS_SCHEMA)
}

/// 为 GIS 模块的表添加前缀
pub fn gis_table(table_name: &str) -> String {
    with_schema(table_name, GIS_SCHEMA)
}

/// 为 EHS 模块的表添加前缀
pub fn ehs_table(table_name: &str) -> String {
    with_schema(table_name, EHS_SCHEMA)
}

/// 为 BI 模块的表添加前缀
pub fn bi_table(table_name: &str) -> String {
    with_schema(table_name, BI_SCHEMA)
}

/// 为 AI 模块的表添加前缀
pub fn ai_table(table_name: &str) -> String {
    with_schema(table_name, AI_SCHEMA)
}

/// 为 IM 模块的表添加前缀
pub fn im_table(table_name: &str) -> String {
    with_schema(table_name, IM_SCHEMA)
}

/// 为 Integration 模块的表添加前缀
pub fn integration_table(table_name: &str) -> String {
    with_schema(table_name, INTEGRATION_SCHEMA)
}

/// 为 Mail 模块的表添加前缀
pub fn mail_table(table_name: &str) -> String {
    with_schema(table_name, MAIL_SCHEMA)
}

/// 为 Mobile 模块的表添加前缀
pub fn mobile_table(table_name: &str) -> String {
    with_schema(table_name, MOBILE_SCHEMA)
}

/// 为 Portal 模块的表添加前缀
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
    fn test_hrm_table() {
        assert_eq!(hrm_table("employees"), "hrm.employees");
        assert_eq!(hrm_table("departments"), "hrm.departments");
    }

    #[test]
    fn test_erp_table() {
        assert_eq!(erp_table("assets"), "erp.assets");
        assert_eq!(erp_table("financial_records"), "erp.financial_records");
    }

    #[test]
    fn test_pm_table() {
        assert_eq!(pm_table("projects"), "pm.projects");
    }
}
