use topems_erp::db::schema::DatabaseSchema;

#[cfg(test)]
mod database_tests {
    use super::*;

    #[test]
    fn test_init_tables() {
        let schema = DatabaseSchema::init_tables();
        assert!(schema.contains("production_plans"));
        assert!(schema.contains("supply_chain_orders"));
        assert!(schema.contains("financial_records"));
    }

    #[test]
    fn test_schema_contains_create_statements() {
        let schema = DatabaseSchema::init_tables();
        assert!(schema.contains("CREATE TABLE IF NOT EXISTS"));
    }

    #[test]
    fn test_production_plans_table_structure() {
        let schema = DatabaseSchema::init_tables();
        assert!(schema.contains("product_name"));
        assert!(schema.contains("product_code"));
        assert!(schema.contains("planned_quantity"));
        assert!(schema.contains("start_date"));
        assert!(schema.contains("end_date"));
        assert!(schema.contains("status"));
        assert!(schema.contains("created_by"));
    }

    #[test]
    fn test_supply_chain_orders_table_structure() {
        let schema = DatabaseSchema::init_tables();
        assert!(schema.contains("order_type"));
        assert!(schema.contains("material_name"));
        assert!(schema.contains("quantity"));
        assert!(schema.contains("supplier_customer"));
        assert!(schema.contains("order_date"));
        assert!(schema.contains("expected_date"));
    }

    #[test]
    fn test_financial_records_table_structure() {
        let schema = DatabaseSchema::init_tables();
        assert!(schema.contains("record_type"));
        assert!(schema.contains("description"));
        assert!(schema.contains("amount"));
        assert!(schema.contains("category"));
        assert!(schema.contains("date"));
        assert!(schema.contains("reference_number"));
    }
}
