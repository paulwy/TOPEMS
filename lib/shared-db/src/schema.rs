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

use std::collections::BTreeSet;

use sqlx::PgPool;

/// 单列原子加列：ALTER TABLE <schema>.<table> ADD COLUMN IF NOT EXISTS <col> <def>
pub async fn add_column_if_missing(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let qualified = match schema {
        Some(s) => format!(r#""{}"."{}""#, s, table),
        None => format!(r#""{}""#, table),
    };
    let ddl = format!(
        r#"ALTER TABLE {} ADD COLUMN IF NOT EXISTS "{}" {}"#,
        qualified, column, definition
    );
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
    matches!(
        std::env::var("SCHEMA_DEFENSE_VERIFY_STRICT")
            .unwrap_or_default()
            .to_ascii_lowercase()
            .as_str(),
        "1" | "true" | "yes" | "on"
    )
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

    let actual: BTreeSet<&str> = rows.iter().map(|(c,)| c.as_str()).collect();
    let mut missing = Vec::new();
    for col in expected {
        if !actual.contains(col) {
            missing.push(*col);
        }
    }

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
        expected.extend(cols_arr.iter().map(|(c, _)| *c));
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
}
