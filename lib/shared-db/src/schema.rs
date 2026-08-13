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

// ============================================================================
// Schema 防御通用层（V69.2）
//
// 背景：CREATE TABLE IF NOT EXISTS 对已经存在的旧表**零修改**，
// 当代码后续新增列时，存量数据库不会自动补齐，线上升级即炸锅。
//
// 解决：每个服务只需提供：
//   1) SERVICE_SCHEMA: &str
//   2) TABLE_DEFS: &[(&str, &[(&str, &str)])]    ← 列定义单一事实源
//
// 然后调用 run_schema_defense(pool, schema, table_defs, service_tag)
// 即可获得两阶段防御：
//   阶段 1 ensure = 逐列 ALTER TABLE ADD COLUMN IF NOT EXISTS（增量补齐）
//   阶段 2 verify = information_schema 对比 TABLE_DEFS + id 列
//                   缺列按 SCHEMA_DEFENSE_VERIFY_STRICT 环境变量决定
//                   warn 跳过 vs panic（CI 门禁）
// ============================================================================

use sqlx::PgPool;

/// 单列原子加列：ALTER TABLE <schema>.<table> ADD COLUMN IF NOT EXISTS <col> <def>
pub async fn add_column_if_missing(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let ddl = build_add_column_sql(schema, table, column, definition);
    sqlx::query(&ddl).execute(pool).await?;
    Ok(())
}

/// 单表批量列检查。返回：本次检查的列数量（便于日志汇总）。
pub async fn ensure_table_columns(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    columns: &[(&str, &str)],
) -> Result<usize, sqlx::Error> {
    let mut n = 0usize;
    for (col, def) in columns {
        if let Err(e) = add_column_if_missing(pool, schema, table, col, def).await {
            tracing::warn!(
                "[schema_defense] {}.{} ADD COLUMN {} 失败（跳过）: {}",
                schema.unwrap_or("public"),
                table,
                col,
                e
            );
        } else {
            n += 1;
        }
    }
    Ok(n)
}

/// 从环境变量读取严格模式。默认 `false`（宽松）。
pub fn is_verify_strict() -> bool {
    is_verify_strict_from(
        std::env::var("SCHEMA_DEFENSE_VERIFY_STRICT")
            .unwrap_or_default()
            .as_str(),
    )
}

/// 严格模式解析的纯函数版本（便于单元测试，不读 env）
pub fn is_verify_strict_from(env_value: &str) -> bool {
    matches!(
        env_value.to_ascii_lowercase().as_str(),
        "1" | "true" | "yes" | "on"
    )
}

/// 生成 "schema"."table" / "table" 限定名（纯函数）
pub fn build_qualified_table(schema: Option<&str>, table: &str) -> String {
    match schema {
        Some(s) => format!(r#""{}"."{}""#, s, table),
        None => format!(r#""{}""#, table),
    }
}

/// 生成 ALTER TABLE ... ADD COLUMN IF NOT EXISTS 语句（纯函数）
pub fn build_add_column_sql(
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> String {
    format!(
        r#"ALTER TABLE {} ADD COLUMN IF NOT EXISTS "{}" {}"#,
        build_qualified_table(schema, table),
        column,
        definition
    )
}

/// 计算 expected 中存在但 actual 中不存在的列名（保持原顺序）。
/// 这是 `verify_table_columns` 核心判定逻辑的纯函数版本。
pub fn detect_missing_columns<'a>(expected: &'a [&'a str], actual: &'a [&'a str]) -> Vec<&'a str> {
    use std::collections::BTreeSet;
    let actual_set: BTreeSet<&str> = actual.iter().copied().collect();
    expected
        .iter()
        .copied()
        .filter(|c| !actual_set.contains(c))
        .collect()
}

/// 汇总 expected 列集合（带可选 id 列）：用于 run_schema_defense 第二阶段
pub fn build_expected_columns<'a>(
    has_id_column: bool,
    table_columns: &'a [(&'a str, &str)],
) -> Vec<&'a str> {
    let mut out: Vec<&'a str> = Vec::new();
    if has_id_column {
        out.push("id");
    }
    out.extend(table_columns.iter().map(|(c, _)| *c));
    out
}

/// information_schema 列一致性自检：
///   expected = ["id"] + TABLE_DEFS 中所有列
///
/// 行为规则（严格 = SCHEMA_DEFENSE_VERIFY_STRICT=true）：
///   宽松：缺列 → tracing::warn!(...)，返回 Ok
///   严格：缺列 → tracing::error!(...) + panic!(...)，返回 Err(Protocol violation)
pub async fn verify_table_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
    expected: &[&str],
    service_tag: &str,
) -> Result<(), sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        "#,
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;

    let actual: Vec<&str> = rows.iter().map(|(c,)| c.as_str()).collect();
    let missing = detect_missing_columns(expected, &actual);

    if missing.is_empty() {
        return Ok(());
    }

    let strict = is_verify_strict();
    if strict {
        tracing::error!(
            "[{} schema 自检 严格模式] {}.{} 仍缺失 {} 列: {:?}",
            service_tag,
            schema,
            table,
            missing.len(),
            missing
        );
        eprintln!(
            "[SCHEMA_DEFENSE_STRICT] {schema}.{table} MISSING {n} COLUMNS: {missing:?}",
            schema = schema,
            table = table,
            n = missing.len(),
            missing = missing
        );
        panic!(
            "[{} schema 自检 严格模式] 列完整性不满足：{}.{} 缺列 {:?}，终止启动",
            service_tag, schema, table, missing
        );
    } else {
        tracing::warn!(
            "[{} schema 自检 宽松模式] {}.{} 仍缺失 {} 列: {:?}",
            service_tag,
            schema,
            table,
            missing.len(),
            missing
        );
    }
    Ok(())
}

/// 两阶段主入口：阶段 1 ensure（增量迁移）+ 阶段 2 verify（一致性自检）
///
/// 参数：
///   service_tag 仅用于日志前缀（例如 "ehs" / "portal" / "finance"）
///
/// 返回：Result<(tables_done, cols_added, verified), sqlx::Error>
///   宽松模式下缺列仍返回 Ok，由日志告警。
pub async fn run_schema_defense(
    pool: &PgPool,
    schema: &str,
    table_defs: &[(&str, &[(&str, &str)])],
    service_tag: &str,
) -> Result<(usize, usize, usize), sqlx::Error> {
    // --------------------------------------------------------------------
    // 阶段 1：增量迁移 —— 逐列 ADD COLUMN IF NOT EXISTS
    // --------------------------------------------------------------------
    let mut tables_done = 0usize;
    let mut cols_added = 0usize;
    for (tbl, cols_arr) in table_defs {
        match ensure_table_columns(pool, Some(schema), tbl, cols_arr).await {
            Ok(n) => {
                tables_done += 1;
                cols_added += n;
            }
            Err(e) => {
                tracing::warn!(
                    "[{} 增量迁移] {}.{} 失败（跳过该表）: {}",
                    service_tag,
                    schema,
                    tbl,
                    e
                );
            }
        }
    }
    tracing::info!(
        "[{} 增量迁移] 完成 {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 检查",
        service_tag,
        tables_done,
        cols_added
    );

    // --------------------------------------------------------------------
    // 阶段 2：schema 一致性自检 —— information_schema 对比 TABLE_DEFS
    // --------------------------------------------------------------------
    let mut verified = 0usize;
    for (tbl, cols_arr) in table_defs {
        let mut expected: Vec<&str> = Vec::new();
        // 仅当表实际存在 id 列时才将其纳入预期（兼容复合 PK 表如 core_user_roles）
        let has_id: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = 'id')",
        )
        .bind(schema)
        .bind(tbl)
        .fetch_one(pool)
        .await
        .unwrap_or(false);
        if has_id {
            expected.push("id");
        }
        expected.extend(build_expected_columns(false, cols_arr));
        verify_table_columns(pool, schema, tbl, &expected, service_tag).await?;
        verified += 1;
    }
    tracing::info!(
        "[{} schema 自检] 完成 {} 张表结构一致性校验（缺失列会单独 WARN / 严格模式直接 panic）",
        service_tag,
        verified
    );

    Ok((tables_done, cols_added, verified))
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

    #[test]
    fn test_all_business_schema_helpers_use_plugin_prefix() {
        // 抽样校验所有 *_table 输出格式，保证前缀拼写统一
        assert_eq!(crm_table("leads"), "plugin_crm.leads");
        assert_eq!(qms_table("inspections"), "plugin_qms.inspections");
        assert_eq!(mes_table("work_orders"), "plugin_mes.work_orders");
        assert_eq!(wms_table("bins"), "plugin_wms.bins");
        assert_eq!(srm_table("suppliers"), "plugin_srm.suppliers");
        assert_eq!(scm_table("inventory"), "plugin_scm.inventory");
        assert_eq!(pdm_table("drawings"), "plugin_pdm.drawings");
        assert_eq!(lims_table("samples"), "plugin_lims.samples");
        assert_eq!(rs_table("requisitions"), "plugin_rs.requisitions");
        assert_eq!(gis_table("geo_zones"), "plugin_gis.geo_zones");
        assert_eq!(ehs_table("incidents"), "plugin_ehs.incidents");
        assert_eq!(bi_table("dashboards"), "plugin_bi.dashboards");
        assert_eq!(ai_table("prompts"), "plugin_ai.prompts");
        assert_eq!(im_table("messages"), "plugin_im.messages");
        assert_eq!(integration_table("syncs"), "plugin_integration.syncs");
        assert_eq!(mail_table("templates"), "plugin_mail.templates");
        assert_eq!(mobile_table("pushes"), "plugin_mobile.pushes");
        assert_eq!(portal_table("notices"), "plugin_portal.notices");
    }

    #[test]
    fn test_unified_and_public_shortcuts() {
        assert_eq!(
            unified_core_table("tenant_configs"),
            "unified_core.tenant_configs"
        );
        assert_eq!(public_table("companies"), "public.companies");
    }

    // ===== is_verify_strict_from =====
    #[test]
    fn test_is_verify_strict_from_truthy_values() {
        for v in ["1", "true", "TRUE", "True", "yes", "YES", "on", "On"] {
            assert!(is_verify_strict_from(v), "expected truthy for env = {}", v);
        }
    }

    #[test]
    fn test_is_verify_strict_from_falsy_values() {
        for v in ["", "0", "false", "no", "off", "foobar", "TRUE!!!"] {
            assert!(!is_verify_strict_from(v), "expected falsy for env = {}", v);
        }
    }

    // ===== build_qualified_table =====
    #[test]
    fn test_build_qualified_table_with_and_without_schema() {
        assert_eq!(
            build_qualified_table(Some("ehs"), "events"),
            r#""ehs"."events""#
        );
        assert_eq!(build_qualified_table(None, "global"), r#""global""#);
    }

    // ===== build_add_column_sql =====
    #[test]
    fn test_build_add_column_sql_schema_and_plain() {
        assert_eq!(
            build_add_column_sql(Some("plugin_hrm"), "employee", "email", "TEXT NOT NULL"),
            r#"ALTER TABLE "plugin_hrm"."employee" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL"#
        );
        assert_eq!(
            build_add_column_sql(None, "t", "c1", "INT DEFAULT 0"),
            r#"ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c1" INT DEFAULT 0"#
        );
    }

    // ===== detect_missing_columns =====
    #[test]
    fn test_detect_missing_columns_none() {
        assert!(detect_missing_columns(
            &["id", "name", "created_at"],
            &["id", "created_at", "name", "extra"]
        )
        .is_empty());
    }

    #[test]
    fn test_detect_missing_columns_preserves_order_and_duplicates_in_expected() {
        let missing = detect_missing_columns(&["a", "b", "c", "d", "b"], &["a", "c", "x"]);
        assert_eq!(missing, vec!["b", "d", "b"]);
    }

    #[test]
    fn test_detect_missing_columns_empty_cases() {
        assert!(detect_missing_columns(&[], &["a", "b"]).is_empty());
        assert_eq!(detect_missing_columns(&["a", "b"], &[]), vec!["a", "b"]);
    }

    // ===== build_expected_columns =====
    #[test]
    fn test_build_expected_columns_with_and_without_id() {
        let cols = [("name", "TEXT"), ("age", "INT")];
        assert_eq!(
            build_expected_columns(true, &cols),
            vec!["id", "name", "age"]
        );
        assert_eq!(build_expected_columns(false, &cols), vec!["name", "age"]);
    }

    #[test]
    fn test_build_expected_columns_empty_table() {
        let cols: [(&str, &str); 0] = [];
        assert_eq!(build_expected_columns(true, &cols), vec!["id"]);
        assert!(build_expected_columns(false, &cols).is_empty());
    }
}
