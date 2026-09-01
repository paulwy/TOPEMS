//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "srm";
pub const SERVICE_TAG: &str = "srm";

/// srm 13 张表的列定义单一事实源。不含 id 列（verify 自动拼）。
/// 提取自 migrations/*.sql，仅保留 TYPE/NOT NULL/DEFAULT，排除 UNIQUE/REFERENCES/CHECK。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    // ===== 20260609100002_create_srm_schema.sql =====
    (
        "suppliers",
        &[
            ("supplier_no", "VARCHAR(50) NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("legal_name", "VARCHAR(200)"),
            ("category", "VARCHAR(50) NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("tax_id", "VARCHAR(50)"),
            ("address", "VARCHAR(500)"),
            ("contact_person", "VARCHAR(100)"),
            ("phone", "VARCHAR(20)"),
            ("email", "VARCHAR(100)"),
            ("website", "VARCHAR(200)"),
            ("credit_rating", "VARCHAR(20)"),
            ("risk_level", "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
            ("bank_name", "VARCHAR(100)"),
            ("bank_account", "VARCHAR(50)"),
            ("sync_from_scm", "BOOLEAN NOT NULL DEFAULT false"),
            ("scm_supplier_id", "UUID"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "supplier_categories",
        &[
            ("category_no", "VARCHAR(50) NOT NULL"),
            ("name", "VARCHAR(100) NOT NULL"),
            ("description", "TEXT"),
            ("parent_id", "UUID"),
            ("level", "INTEGER NOT NULL DEFAULT 1"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "supplier_evaluations",
        &[
            ("supplier_id", "UUID NOT NULL"),
            ("evaluation_no", "VARCHAR(50) NOT NULL"),
            ("evaluation_date", "TIMESTAMPTZ NOT NULL"),
            ("evaluator", "VARCHAR(100)"),
            ("overall_score", "NUMERIC(5,2)"),
            ("quality_score", "NUMERIC(5,2)"),
            ("delivery_score", "NUMERIC(5,2)"),
            ("service_score", "NUMERIC(5,2)"),
            ("price_score", "NUMERIC(5,2)"),
            ("comments", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "supplier_contracts",
        &[
            ("contract_no", "VARCHAR(50) NOT NULL"),
            ("supplier_id", "UUID NOT NULL"),
            ("supplier_name", "VARCHAR(200)"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("contract_type", "VARCHAR(50) NOT NULL"),
            ("total_amount", "NUMERIC(15,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("sign_date", "TIMESTAMPTZ"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("remarks", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "contract_terms",
        &[
            ("contract_id", "UUID NOT NULL"),
            ("term_type", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("content", "TEXT"),
            ("sort_order", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "supplier_products",
        &[
            ("product_no", "VARCHAR(50) NOT NULL"),
            ("supplier_id", "UUID NOT NULL"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("category", "VARCHAR(50)"),
            ("unit", "VARCHAR(20)"),
            ("unit_price", "NUMERIC(10,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("min_order_qty", "INTEGER"),
            ("lead_time_days", "INTEGER"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("specifications", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "purchase_orders",
        &[
            ("po_no", "VARCHAR(50) NOT NULL"),
            ("supplier_id", "UUID NOT NULL"),
            ("order_date", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("expected_date", "TIMESTAMPTZ"),
            ("actual_date", "TIMESTAMPTZ"),
            ("total_amount", "NUMERIC(15,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("remarks", "TEXT"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "audit_logs",
        &[
            ("table_name", "VARCHAR(50) NOT NULL"),
            ("record_id", "UUID NOT NULL"),
            ("action", "VARCHAR(20) NOT NULL"),
            ("old_values", "JSONB"),
            ("new_values", "JSONB"),
            ("changed_by", "UUID"),
            ("changed_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("ip_address", "VARCHAR(50)"),
            ("user_agent", "VARCHAR(200)"),
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
        ],
    ),
    // ===== 20260710000003_add_tender_tables.sql =====
    (
        "tenders",
        &[
            ("tender_no", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("type", "VARCHAR(50)"),
            ("budget", "NUMERIC(15,2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "tender_bids",
        &[
            ("bid_no", "VARCHAR(50) NOT NULL"),
            ("tender_id", "UUID NOT NULL"),
            ("supplier_id", "UUID"),
            ("supplier_name", "VARCHAR(200)"),
            ("bid_price", "NUMERIC(15,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("bid_date", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            // 20260710000004_add_tender_bid_scores.sql
            ("technical_score", "NUMERIC(5,2)"),
            ("commercial_score", "NUMERIC(5,2)"),
            ("total_score", "NUMERIC(5,2)"),
            // 20260710000005_add_tender_bid_remarks.sql
            ("remarks", "TEXT"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "tender_awards",
        &[
            ("award_no", "VARCHAR(50) NOT NULL"),
            ("tender_id", "UUID NOT NULL"),
            ("bid_id", "UUID NOT NULL"),
            ("supplier_id", "UUID"),
            ("supplier_name", "VARCHAR(200)"),
            ("award_price", "NUMERIC(15,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
        ],
    ),
    // ===== 20260710000006_add_bid_tables.sql + 20260710000007_add_bids_metadata.sql =====
    (
        "bid_requests",
        &[
            ("request_no", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200) NOT NULL"),
            ("description", "TEXT"),
            ("deadline", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "bids",
        &[
            ("request_id", "UUID NOT NULL"),
            ("supplier_id", "UUID"),
            ("supplier_name", "VARCHAR(200)"),
            ("price", "NUMERIC(15,2)"),
            ("currency", "VARCHAR(10) NOT NULL DEFAULT 'CNY'"),
            ("valid_until", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            // 20260710000007_add_bids_metadata.sql
            ("created_by", "UUID"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    // 询价单表（event_handlers 写入，收敛自 plugin_srm_inquiries）
    (
        "inquiries",
        &[
            ("inquiry_no", "VARCHAR(50) NOT NULL"),
            ("title", "VARCHAR(200)"),
            ("description", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("creator", "UUID"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    // 供应商绩效表（event_handlers 写入，收敛自 plugin_srm_supplier_performance）
    (
        "supplier_performance",
        &[
            ("supplier_id", "UUID"),
            ("order_count", "INTEGER NOT NULL DEFAULT 0"),
            ("total_amount", "NUMERIC(15,2)"),
            ("last_order_date", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    // SCM→SRM 供应商快照表 - 替代跨 Schema 直读 plugin_scm.suppliers
    (
        "scm_supplier_snapshots",
        &[
            ("id", "UUID PRIMARY KEY"),
            ("supplier_code", "VARCHAR(50)"),
            ("name", "VARCHAR(200) NOT NULL"),
            ("short_name", "VARCHAR(200)"),
            ("contact_name", "VARCHAR(100)"),
            ("contact_phone", "VARCHAR(50)"),
            ("email", "VARCHAR(200)"),
            ("address", "VARCHAR(500)"),
            ("tax_number", "VARCHAR(50)"),
            ("bank_account", "VARCHAR(50)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("synced_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    if SERVICE_SCHEMA != "public" {
        sqlx::query(&format!(
            "CREATE SCHEMA IF NOT EXISTS \"{}\"",
            SERVICE_SCHEMA
        ))
        .execute(pool)
        .await?;
    }
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_schema_is_srm() {
        assert_eq!(SERVICE_SCHEMA, "srm");
    }

    #[test]
    fn test_service_tag_is_srm() {
        assert_eq!(SERVICE_TAG, "srm");
    }

    #[test]
    fn test_table_defs_has_16_tables() {
        assert_eq!(TABLE_DEFS.len(), 16, "SRM should define 16 tables");
    }

    #[test]
    fn test_suppliers_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"suppliers"));
    }

    #[test]
    fn test_supplier_categories_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"supplier_categories"));
    }

    #[test]
    fn test_supplier_evaluations_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"supplier_evaluations"));
    }

    #[test]
    fn test_supplier_contracts_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"supplier_contracts"));
    }

    #[test]
    fn test_contract_terms_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"contract_terms"));
    }

    #[test]
    fn test_supplier_products_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"supplier_products"));
    }

    #[test]
    fn test_purchase_orders_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"purchase_orders"));
    }

    #[test]
    fn test_audit_logs_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"audit_logs"));
    }

    #[test]
    fn test_tenders_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"tenders"));
    }

    #[test]
    fn test_tender_bids_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"tender_bids"));
    }

    #[test]
    fn test_tender_awards_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"tender_awards"));
    }

    #[test]
    fn test_bid_requests_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"bid_requests"));
    }

    #[test]
    fn test_bids_table_exists() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"bids"));
    }

    #[test]
    fn test_suppliers_has_tenant_id_column() {
        let (_, cols) = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "suppliers")
            .expect("suppliers table should exist");
        let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"tenant_id"));
    }

    #[test]
    fn test_suppliers_has_required_columns() {
        let (_, cols) = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "suppliers")
            .expect("suppliers table should exist");
        let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
        for required in &["supplier_no", "name", "category", "status", "risk_level"] {
            assert!(
                col_names.contains(required),
                "suppliers table should have column: {}",
                required
            );
        }
    }

    #[test]
    fn test_all_tables_have_at_least_one_column() {
        for (name, cols) in TABLE_DEFS {
            assert!(
                !cols.is_empty(),
                "table {} should have at least one column definition",
                name
            );
        }
    }

    #[test]
    fn test_column_definitions_have_type_info() {
        for (tbl, cols) in TABLE_DEFS {
            for (col_name, col_type) in *cols {
                assert!(
                    !col_type.is_empty(),
                    "column {}.{} should have a non-empty type definition",
                    tbl,
                    col_name
                );
            }
        }
    }

    #[test]
    fn test_tender_bids_has_score_columns() {
        let (_, cols) = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "tender_bids")
            .expect("tender_bids table should exist");
        let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"technical_score"));
        assert!(col_names.contains(&"commercial_score"));
        assert!(col_names.contains(&"total_score"));
    }

    #[test]
    fn test_supplier_evaluations_has_score_columns() {
        let (_, cols) = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "supplier_evaluations")
            .expect("supplier_evaluations table should exist");
        let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
        for required in &[
            "overall_score",
            "quality_score",
            "delivery_score",
            "service_score",
            "price_score",
        ] {
            assert!(col_names.contains(required));
        }
    }

    #[test]
    fn test_table_names_are_non_empty() {
        for (name, _) in TABLE_DEFS {
            assert!(!name.is_empty(), "table name should not be empty");
        }
    }

    #[test]
    fn test_column_names_are_non_empty() {
        for (tbl, cols) in TABLE_DEFS {
            for (col, _) in *cols {
                assert!(
                    !col.is_empty(),
                    "column name in {} should not be empty",
                    tbl
                );
            }
        }
    }

    #[test]
    fn test_no_duplicate_table_names() {
        let mut names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        names.sort();
        let len_before = names.len();
        names.dedup();
        assert_eq!(names.len(), len_before, "duplicate table names found");
    }
}
