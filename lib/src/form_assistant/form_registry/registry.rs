use std::collections::HashMap;
use std::sync::OnceLock;
use super::common::FormDomain;
use super::config::FormConfig;
use super::{
    crm_forms::register_crm_forms, ehs_forms::register_ehs_forms,
    erp_finance_forms::register_erp_finance_forms,
    erp_inventory_forms::register_erp_inventory_forms,
    erp_production_forms::register_erp_production_forms,
    erp_purchase_forms::register_erp_purchase_forms, erp_sales_forms::register_erp_sales_forms,
    hrm_forms::register_hrm_forms, iam_forms::register_iam_forms,
    lims_forms::register_lims_forms, mes_forms::register_mes_forms, pm_forms::register_pm_forms,
    qms_forms::register_qms_forms, rd_forms::register_rd_forms, scm_forms::register_scm_forms,
    system_forms::register_system_forms, wms_forms::register_wms_forms,
};

// ==================== 表单注册表 ====================

/// 表单配置注册表
#[derive(Debug, Clone, Default)]
pub struct FormRegistry {
    forms: HashMap<String, FormConfig>,
}

impl FormRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// 注册一个表单配置
    pub fn register(&mut self, config: FormConfig) -> &mut Self {
        self.forms.insert(config.form_type.clone(), config);
        self
    }

    /// 获取表单配置
    pub fn get(&self, form_type: &str) -> Option<&FormConfig> {
        self.forms.get(form_type)
    }

    /// 列出所有表单配置
    pub fn list(&self) -> Vec<&FormConfig> {
        self.forms.values().collect()
    }

    /// 按业务域列出表单
    pub fn list_by_domain(&self, domain: &FormDomain) -> Vec<&FormConfig> {
        self.forms
            .values()
            .filter(|c| &c.domain == domain)
            .collect()
    }

    /// 表单数量
    pub fn count(&self) -> usize {
        self.forms.len()
    }

    /// 是否包含指定表单
    pub fn contains(&self, form_type: &str) -> bool {
        self.forms.contains_key(form_type)
    }

    /// 所有已注册表单的类型列表
    pub fn form_types(&self) -> Vec<String> {
        self.forms.keys().cloned().collect()
    }

    /// 列出所有业务域
    pub fn domains(&self) -> Vec<FormDomain> {
        let mut seen = std::collections::HashSet::new();
        let mut domains = Vec::new();
        for cfg in self.forms.values() {
            if seen.insert(cfg.domain.clone()) {
                domains.push(cfg.domain.clone());
            }
        }
        domains
    }
}

// ==================== 全局默认注册表 ====================

/// 全局默认注册表（预注册 30+ 核心表单）
static DEFAULT_REGISTRY: OnceLock<FormRegistry> = OnceLock::new();

/// 获取全局默认注册表
pub fn default_registry() -> &'static FormRegistry {
    DEFAULT_REGISTRY.get_or_init(build_default_registry)
}

fn build_default_registry() -> FormRegistry {
    let mut registry = FormRegistry::new();
    register_crm_forms(&mut registry);
    register_erp_sales_forms(&mut registry);
    register_erp_purchase_forms(&mut registry);
    register_erp_production_forms(&mut registry);
    register_erp_finance_forms(&mut registry);
    register_erp_inventory_forms(&mut registry);
    register_pm_forms(&mut registry);
    register_iam_forms(&mut registry);
    register_system_forms(&mut registry);
    register_qms_forms(&mut registry);
    register_mes_forms(&mut registry);
    register_wms_forms(&mut registry);
    register_hrm_forms(&mut registry);
    register_scm_forms(&mut registry);
    register_lims_forms(&mut registry);
    register_ehs_forms(&mut registry);
    register_rd_forms(&mut registry);
    registry
}
