// ==================== 单元测试 ====================

use super::*;

#[test]
fn test_default_registry_has_30_plus_forms() {
    let registry = default_registry();
    assert!(
        registry.count() >= 30,
        "默认注册表应包含至少 30 个表单，实际：{}",
        registry.count()
    );
}

#[test]
fn test_default_registry_supports_all_domains() {
    let registry = default_registry();
    let domains = registry.domains();
    assert!(domains.len() >= 9, "应覆盖 9 个业务域，实际：{}", domains.len());
}

#[test]
fn test_get_form_config() {
    let registry = default_registry();
    let customer = registry.get("customer");
    assert!(customer.is_some());
    assert_eq!(customer.unwrap().display_name, "客户");
    assert_eq!(customer.unwrap().domain, FormDomain::Crm);
}

#[test]
fn test_list_by_domain() {
    let registry = default_registry();
    let crm_forms = registry.list_by_domain(&FormDomain::Crm);
    assert_eq!(crm_forms.len(), 6, "CRM 域应有 6 个表单");
    let finance_forms = registry.list_by_domain(&FormDomain::ErpFinance);
    assert_eq!(finance_forms.len(), 8, "ERP 财务域应有 8 个表单");
}

#[test]
fn test_form_config_supports_features() {
    let registry = default_registry();
    let customer = registry.get("customer").unwrap();
    assert!(customer.supports("suggest"));
    assert!(customer.supports("validate"));
    assert!(customer.supports("translate"));
}

#[test]
fn test_fields_description_text() {
    let registry = default_registry();
    let customer = registry.get("customer").unwrap();
    let text = customer.fields_description_text();
    assert!(text.contains("name"));
    assert!(text.contains("客户名称"));
}

#[test]
fn test_business_terms_text() {
    let registry = default_registry();
    let voucher = registry.get("voucher").unwrap();
    let text = voucher.business_terms_text();
    assert!(text.contains("借贷必相等"));
}

#[test]
fn test_registry_register_and_overrides() {
    let mut registry = FormRegistry::new();
    let cfg = FormConfig::new("test_form", "测试表单", FormDomain::System)
        .with_description("测试用")
        .with_field(FieldDefinition::new(
            "f1", "字段1", "text", "测试字段", true, "示例",
        ));
    registry.register(cfg);
    assert_eq!(registry.count(), 1);
    assert!(registry.contains("test_form"));
    assert!(!registry.contains("non_existent"));
}
