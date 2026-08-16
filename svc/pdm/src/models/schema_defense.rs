//! Schema 防御定义（自动生成自 DB 元数据）
//!
//! 服务: pdm | Schema: pdm
//! 规范: 新增列需两处同步 -> CREATE TABLE 文本块 + TABLE_DEFS 数组

pub const SERVICE_SCHEMA: &str = "pdm";

/// pdm 19 张表的列定义单一事实源。不含 id 列（verify 自动拼）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "pdm_bom_items",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("bom_id", "UUID NOT NULL"),
            ("material_id", "UUID"),
            ("material_code", "VARCHAR(64) NOT NULL"),
            ("material_name", "VARCHAR(256) NOT NULL"),
            ("specification", "VARCHAR(256)"),
            ("unit", "VARCHAR(32)"),
            ("quantity", "DECIMAL(18,4) NOT NULL DEFAULT 0"),
            ("loss_rate", "DECIMAL(8,4) DEFAULT 0"),
            ("sequence", "INTEGER DEFAULT 0"),
            ("notes", "TEXT"),
        ],
    ),
    (
        "pdm_boms",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("bom_no", "VARCHAR(64) NOT NULL"),
            ("product_id", "UUID"),
            ("product_name", "VARCHAR(256) NOT NULL"),
            ("product_code", "VARCHAR(64)"),
            ("version", "VARCHAR(32) DEFAULT '1.0'"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "pdm_change_notices",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("ecn_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("change_type", "VARCHAR(32) NOT NULL"),
            ("affected_items", "JSONB"),
            ("reason", "TEXT"),
            ("priority", "VARCHAR(32) DEFAULT 'normal'"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("initiator", "VARCHAR(128) NOT NULL"),
            ("approver", "VARCHAR(128)"),
            ("approved_at", "TIMESTAMP"),
            ("effective_date", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_configurations",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("config_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("product_id", "UUID"),
            ("config_items", "JSONB DEFAULT '[]'"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_document_versions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("document_id", "UUID NOT NULL"),
            ("document_type", "VARCHAR(64)"),
            ("version_number", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("file_url", "VARCHAR(1000)"),
            ("filesize", "BIGINT"),
            ("file_type", "VARCHAR(128)"),
            ("changes", "TEXT[] NOT NULL DEFAULT '{}'"),
            ("created_by", "VARCHAR(128) NOT NULL DEFAULT 'system'"),
            ("created_by_name", "VARCHAR(128)"),
            ("reviewed_by", "VARCHAR(128)"),
            ("approved_by", "VARCHAR(128)"),
            ("published_at", "TIMESTAMP"),
            ("file_content", "BYTEA"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_documents",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("document_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("document_type", "VARCHAR(64)"),
            ("file_path", "VARCHAR(500)"),
            ("file_size", "BIGINT"),
            ("version", "VARCHAR(32) DEFAULT '1.0'"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_materials",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("material_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("spec", "VARCHAR(256)"),
            ("unit", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_production_batches",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("batch_no", "VARCHAR(64) NOT NULL"),
            ("product_id", "UUID"),
            ("product_name", "VARCHAR(256)"),
            ("quantity", "DECIMAL(18,4)"),
            ("unit", "VARCHAR(32)"),
            ("start_date", "TIMESTAMP"),
            ("end_date", "TIMESTAMP"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_production_formulas",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("formula_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("product_id", "UUID"),
            ("description", "TEXT"),
            ("formula_items", "JSONB DEFAULT '[]'"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_production_processes",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("process_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("process_type", "VARCHAR(64)"),
            ("standard_time", "DECIMAL(10,2)"),
            ("unit", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_production_steps",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("process_id", "UUID NOT NULL"),
            ("step_no", "INTEGER NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("standard_time", "DECIMAL(10,2)"),
            ("equipment_requirement", "VARCHAR(256)"),
            ("quality_check", "VARCHAR(256)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_products",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("product_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("version", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_project_members",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_id", "UUID NOT NULL"),
            ("user_id", "VARCHAR(128) NOT NULL"),
            ("user_name", "VARCHAR(128)"),
            ("user_email", "VARCHAR(256)"),
            ("role", "VARCHAR(32) NOT NULL"),
            ("joined_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "pdm_project_phases",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_id", "UUID NOT NULL"),
            ("phase", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("start_date", "TIMESTAMP"),
            ("end_date", "TIMESTAMP"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("deliverables", "TEXT[] DEFAULT '{}'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "pdm_projects",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("project_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'planning'"),
            ("phase", "VARCHAR(32) DEFAULT 'initiation'"),
            ("start_date", "TIMESTAMP"),
            ("end_date", "TIMESTAMP"),
            ("manager_id", "VARCHAR(128)"),
            ("manager_name", "VARCHAR(128)"),
            ("budget", "DOUBLE PRECISION"),
            ("progress", "INTEGER DEFAULT 0"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_versions",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("version_no", "VARCHAR(64) NOT NULL"),
            ("target_type", "VARCHAR(64) NOT NULL"),
            ("target_id", "UUID NOT NULL"),
            ("target_name", "VARCHAR(256)"),
            ("version_label", "VARCHAR(32) NOT NULL"),
            ("description", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "pdm_workflow_instances",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("workflow_id", "UUID NOT NULL"),
            ("workflow_name", "VARCHAR(256) NOT NULL"),
            ("target_type", "VARCHAR(64) NOT NULL"),
            ("target_id", "UUID NOT NULL"),
            ("current_step", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'running'"),
            ("assignees", "JSONB DEFAULT '[]'"),
            ("history", "JSONB DEFAULT '[]'"),
            ("created_by", "VARCHAR(128) NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "pdm_workflows",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("workflow_type", "VARCHAR(64) NOT NULL"),
            ("steps", "JSONB NOT NULL"),
            ("conditions", "JSONB DEFAULT '{}'"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_by", "VARCHAR(128) NOT NULL"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_schema() {
        assert_eq!(SERVICE_SCHEMA, "pdm");
    }

    #[test]
    fn test_table_defs_count_and_names() {
        assert!(TABLE_DEFS.len() >= 18);
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"pdm_boms"));
        assert!(names.contains(&"pdm_bom_items"));
        assert!(names.contains(&"pdm_products"));
        assert!(names.contains(&"pdm_materials"));
        assert!(names.contains(&"pdm_documents"));
        assert!(names.contains(&"pdm_document_versions"));
        assert!(names.contains(&"pdm_projects"));
        assert!(names.contains(&"pdm_project_members"));
        assert!(names.contains(&"pdm_project_phases"));
        assert!(names.contains(&"pdm_versions"));
        assert!(names.contains(&"pdm_change_notices"));
        assert!(names.contains(&"pdm_workflows"));
        assert!(names.contains(&"pdm_workflow_instances"));
        assert!(names.contains(&"pdm_configurations"));
        assert!(names.contains(&"pdm_production_processes"));
        assert!(names.contains(&"pdm_production_steps"));
        assert!(names.contains(&"pdm_production_formulas"));
        assert!(names.contains(&"pdm_production_batches"));
    }

    #[test]
    fn test_table_defs_each_has_columns() {
        for (table_name, columns) in TABLE_DEFS {
            assert!(
                !columns.is_empty(),
                "Table {table_name} should have at least one column defined"
            );
            for (col_name, col_def) in *columns {
                assert!(!col_name.is_empty());
                assert!(!col_def.is_empty());
            }
        }
    }

    #[test]
    fn test_each_table_has_tenant_id() {
        for (table_name, columns) in TABLE_DEFS {
            let has_tenant = columns.iter().any(|(c, _)| *c == "tenant_id");
            assert!(
                has_tenant,
                "Table {table_name} should have tenant_id column"
            );
        }
    }

    #[test]
    fn test_bom_items_columns_exist() {
        let bom_items = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "pdm_bom_items")
            .unwrap()
            .1;
        let col_names: Vec<&str> = bom_items.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"tenant_id"));
        assert!(col_names.contains(&"bom_id"));
        assert!(col_names.contains(&"material_code"));
        assert!(col_names.contains(&"material_name"));
        assert!(col_names.contains(&"quantity"));
    }

    #[test]
    fn test_products_has_status_and_version() {
        let products = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "pdm_products")
            .unwrap()
            .1;
        let col_names: Vec<&str> = products.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"product_no"));
        assert!(col_names.contains(&"name"));
        assert!(col_names.contains(&"status"));
        assert!(col_names.contains(&"version"));
        assert!(col_names.contains(&"description"));
    }

    #[test]
    fn test_workflow_tables_reference_ids() {
        let wf = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "pdm_workflows")
            .unwrap()
            .1;
        let wf_cols: Vec<&str> = wf.iter().map(|(c, _)| *c).collect();
        assert!(wf_cols.contains(&"workflow_type"));
        assert!(wf_cols.contains(&"steps"));
        assert!(wf_cols.contains(&"conditions"));
        assert!(wf_cols.contains(&"status"));

        let inst = TABLE_DEFS
            .iter()
            .find(|(n, _)| *n == "pdm_workflow_instances")
            .unwrap()
            .1;
        let inst_cols: Vec<&str> = inst.iter().map(|(c, _)| *c).collect();
        assert!(inst_cols.contains(&"workflow_id"));
        assert!(inst_cols.contains(&"workflow_name"));
        assert!(inst_cols.contains(&"target_type"));
        assert!(inst_cols.contains(&"target_id"));
        assert!(inst_cols.contains(&"current_step"));
        assert!(inst_cols.contains(&"status"));
    }
}
