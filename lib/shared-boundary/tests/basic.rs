//! `only_own_schema_query!` 宏集成测试：正常场景展开验证。

use topems_shared_boundary::only_own_schema_query;

#[test]
fn macro_expands_to_sql_string() {
    let sql = only_own_schema_query!("crm", "SELECT * FROM crm.customers WHERE id = $1");
    assert_eq!(sql, "SELECT * FROM crm.customers WHERE id = $1");
}

#[test]
fn macro_accepts_own_schema_joins() {
    let sql = only_own_schema_query!(
        "crm",
        "SELECT c.name, o.amount FROM crm.customers c \
         JOIN crm.opportunities o ON o.customer_id = c.id WHERE c.id = $1"
    );
    assert!(sql.contains("crm.customers"));
    assert!(sql.contains("crm.opportunities"));
}

#[test]
fn macro_accepts_public_shared_schema() {
    // public / unified_core 默认允许，无需显式声明
    let sql = only_own_schema_query!(
        "crm",
        "SELECT c.name FROM crm.customers c \
         JOIN public.users u ON u.id = c.owner_id"
    );
    assert!(sql.contains("public.users"));
}

#[test]
fn macro_accepts_explicit_extra_schema() {
    // 跨 schema 只读引用必须显式声明白名单
    let sql = only_own_schema_query!(
        "erp",
        "SELECT * FROM plugin_finance.accounting_subjects WHERE id = $1",
        "plugin_finance"
    );
    assert_eq!(
        sql,
        "SELECT * FROM plugin_finance.accounting_subjects WHERE id = $1"
    );
}

#[test]
fn macro_handles_aliases_in_where() {
    // WHERE / ON 中的 alias.column 不是 schema 引用，不误报
    let sql = only_own_schema_query!(
        "wms",
        "SELECT w.id FROM wms.warehouses w \
         LEFT JOIN wms.stocks s ON s.warehouse_id = w.id \
         WHERE w.status = 'active' AND s.qty > 0"
    );
    assert!(sql.contains("wms.warehouses"));
}
