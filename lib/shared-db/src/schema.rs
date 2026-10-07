//! TOPEMS 系统的 Schema 定义
//! 为了确保数据库架构隔离，每个服务都应该只访问自己对应的 Schema

pub const PUBLIC_SCHEMA: &str = "public";
pub const UNIFIED_CORE_SCHEMA: &str = "unified_core";

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
use sha2::{Digest, Sha256};

// ============================================================================
// AR-03: Schema 防御 DDL 版本门控（Phase 1）
//
// 在现有两阶段（ensure + verify）之前加一道「规范化 hash 门控」：
//   - 每个服务的 TABLE_DEFS 规范化后算 SHA-256 hex，记入运行时自建台账表
//     `schema_defense_ledger`（不在 sqlx 迁移链内，CREATE IF NOT EXISTS 自建）。
//   - ledger 无记录 / hash 不匹配 → 全量 ensure 重放 + verify + upsert；
//   - hash 匹配 → 跳过 ensure，仅做轻量 verify + upsert；
//   - 开关：SCHEMA_DEFENSE_GATE_ENABLED（默认 true；false/0/off/no 时行为与
//     门控上线前完全一致，不建/不查/不写台账）；SCHEMA_DEFENSE_FORCE_REAPPLY
//     （默认 false；true 时忽略 ledger 全量重放）。优先级：GATE_ENABLED=false
//     时 FORCE_REAPPLY 无效。
//   - 台账任何失败（建表/查询/upsert）仅 warn，退化为全量重放，不阻塞启动。
// 详见 artifacts/tier2-fixes/ar03-version-gate-design.md。
// ============================================================================

/// AR-03：读取 SCHEMA_DEFENSE_GATE_ENABLED。默认 true；`0/false/no/off`（大小写不敏感）→ false。
pub fn schema_defense_gate_enabled() -> bool {
    schema_defense_gate_enabled_from(
        std::env::var("SCHEMA_DEFENSE_GATE_ENABLED").unwrap_or_default().as_str(),
    )
}

/// 门控开关解析的纯函数版本（便于单测，不读 env）
pub fn schema_defense_gate_enabled_from(env_value: &str) -> bool {
    !matches!(
        env_value.trim().to_ascii_lowercase().as_str(),
        "0" | "false" | "no" | "off"
    )
}

/// AR-03：读取 SCHEMA_DEFENSE_FORCE_REAPPLY。默认 false；`1/true/yes/on` → true。
pub fn schema_defense_force_reapply() -> bool {
    is_verify_strict_from( // 与严格开关同语义的真值解析
        std::env::var("SCHEMA_DEFENSE_FORCE_REAPPLY").unwrap_or_default().as_str(),
    )
}

/// AR-03：运行时自建台账表（与 ensure_master_data_refs_table 同通道：裸 sqlx::query）。
/// 失败由调用方 warn 处理。
pub async fn ensure_ledger_table(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS schema_defense_ledger (
            service_schema      TEXT PRIMARY KEY,
            schema_hash         TEXT NOT NULL,
            tables_count        INTEGER NOT NULL DEFAULT 0,
            cols_count          INTEGER NOT NULL DEFAULT 0,
            applied_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_skipped_ensure BOOLEAN NOT NULL DEFAULT false
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// AR-03：DDL 片段规范化（纯函数）——
///   1) 去除 `--` 行注释（到行尾）；
///   2) 连续空白压缩为单空格、去首尾空白；
///   3) 单引号字符串字面量之外的字母序列统一大写（NOT NULL / DEFAULT / VARCHAR…
///      写法大小写抖动不触发漂移；字符串字面量内容保持原样）。
pub fn normalize_ddl_fragment(ddl: &str) -> String {
    // Step 1: 去行注释
    let mut stripped = String::with_capacity(ddl.len());
    for line in ddl.lines() {
        match line.find("--") {
            Some(pos) => stripped.push_str(&line[..pos]),
            None => stripped.push_str(line),
        }
        stripped.push(' ');
    }

    // Step 2: 压缩空白 + 引号外字母大写
    let mut out = String::with_capacity(stripped.len());
    let mut in_quotes = false;
    let mut prev_ws = true; // 吃掉前导空白
    let mut chars = stripped.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '\'' => {
                in_quotes = !in_quotes;
                out.push(c);
                prev_ws = false;
            }
            _ if c.is_whitespace() => {
                if !prev_ws {
                    out.push(' ');
                }
                prev_ws = true;
            }
            _ if !in_quotes && c.is_ascii_alphabetic() => {
                let mut run = String::from(c);
                while let Some(nc) = chars.peek() {
                    if nc.is_ascii_alphabetic() {
                        run.push(chars.next().expect("just peeked"));
                    } else {
                        break;
                    }
                }
                out.push_str(&run.to_ascii_uppercase());
                prev_ws = false;
            }
            _ => {
                out.push(c);
                prev_ws = false;
            }
        }
    }
    out.trim_end().to_string()
}

/// AR-03：规范化 schema hash（纯函数，无 DB）。
///
/// 规则（与设计 §4.3 一致）：
///   - 表按表名排序、表内列按列名排序 → 书写顺序不影响 hash；
///   - 列 DDL 片段走 [`normalize_ddl_fragment`] → 空白/注释/大小写抖动不影响；
///   - `id` 列不参与（由 skeleton CREATE TABLE 统一管理，与 verify 阶段 id 自动拼接逻辑一致）；
///   - canonical 串 → SHA-256 → hex。
pub fn compute_schema_hash(schema: &str, table_defs: &[(&str, &[(&str, &str)])]) -> String {
    let mut entries: Vec<(String, Vec<(String, String)>)> = table_defs
        .iter()
        .map(|(tbl, cols)| {
            let mut cols_norm: Vec<(String, String)> = cols
                .iter()
                .filter(|(col, _)| *col != "id") // id 不参与 hash
                .map(|(col, ddl)| (col.to_string(), normalize_ddl_fragment(ddl)))
                .collect();
            cols_norm.sort_by(|a, b| a.0.cmp(&b.0));
            ((*tbl).to_string(), cols_norm)
        })
        .collect();
    entries.sort_by(|a, b| a.0.cmp(&b.0));

    let mut canon = String::new();
    canon.push_str(schema);
    canon.push('{');
    for (tbl, cols) in &entries {
        canon.push_str(tbl);
        canon.push('[');
        for (col, ddl) in cols {
            canon.push_str(col);
            canon.push(':');
            canon.push_str(ddl);
            canon.push(',');
        }
        canon.push_str("],");
    }
    canon.push('}');

    let mut hasher = Sha256::new();
    hasher.update(canon.as_bytes());
    hex::encode(hasher.finalize())
}

/// AR-03：upsert 台账（INSERT ... ON CONFLICT DO UPDATE）。失败仅 warn，不阻塞启动。
pub async fn upsert_ledger(
    pool: &PgPool,
    schema: &str,
    schema_hash: &str,
    tables_count: usize,
    cols_count: usize,
    last_skipped_ensure: bool,
) {
    let result = sqlx::query(
        r#"
        INSERT INTO schema_defense_ledger
            (service_schema, schema_hash, tables_count, cols_count, last_skipped_ensure, applied_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (service_schema) DO UPDATE SET
            schema_hash         = EXCLUDED.schema_hash,
            tables_count        = EXCLUDED.tables_count,
            cols_count          = EXCLUDED.cols_count,
            last_skipped_ensure  = EXCLUDED.last_skipped_ensure,
            applied_at          = NOW()
        "#,
    )
    .bind(schema)
    .bind(schema_hash)
    .bind(tables_count as i32)
    .bind(cols_count as i32)
    .bind(last_skipped_ensure)
    .execute(pool)
    .await;
    if let Err(e) = result {
        tracing::warn!(
            "[{} schema 门控] ledger upsert 失败（不阻塞，下次启动自动补）: {}",
            schema,
            e
        );
    }
}

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
    let total_tables = table_defs.len();
    let total_cols: usize = table_defs.iter().map(|(_, c)| c.len()).sum();

    // --------------------------------------------------------------------
    // AR-03 版本门控：在 ensure 之前判断是否可以跳过重放
    //   - GATE_ENABLED=false → 完全退化为旧行为（不建/查/写台账）
    //   - 否则按 ledger 里的规范化 hash 决定 skip_ensure
    // --------------------------------------------------------------------
    let gate_on = schema_defense_gate_enabled();
    let force_reapply = schema_defense_force_reapply();
    let mut skip_ensure = false;
    let current_hash = compute_schema_hash(schema, table_defs);

    if gate_on {
        if let Err(e) = ensure_ledger_table(pool).await {
            tracing::warn!(
                "[{} schema 门控] ledger 表创建失败（退化为全量重放）: {}",
                service_tag,
                e
            );
        }

        let stored: Option<String> = if force_reapply {
            // FORCE_REAPPLY：忽略 ledger，等价于无记录
            None
        } else {
            sqlx::query_scalar(
                "SELECT schema_hash FROM schema_defense_ledger WHERE service_schema = $1",
            )
            .bind(schema)
            .fetch_optional(pool)
            .await
            .unwrap_or_else(|e| {
                tracing::warn!(
                    "[{} schema 门控] ledger 查询失败（退化为全量重放）: {}",
                    service_tag,
                    e
                );
                None
            })
        };

        skip_ensure = stored.as_deref() == Some(current_hash.as_str());

        let hash_prefix: &str = current_hash.get(..12).unwrap_or(&current_hash);
        if force_reapply {
            tracing::info!(
                "[{} schema 门控] SCHEMA_DEFENSE_FORCE_REAPPLY=1，忽略 ledger，全量重放（{} 表 / {} 列，hash={}）",
                service_tag, total_tables, total_cols, hash_prefix
            );
        } else if skip_ensure {
            tracing::info!(
                "[{} schema 门控] hash 匹配 ({})，跳过 ensure 阶段（{} 表 / {} 列），仅做 verify 自检",
                service_tag, hash_prefix, total_tables, total_cols
            );
        } else {
            tracing::info!(
                "[{} schema 门控] ledger 无记录或 hash 不匹配，执行 ensure 全量重放（{} 表 / {} 列，hash={}）",
                service_tag, total_tables, total_cols, hash_prefix
            );
        }
    }

    // --------------------------------------------------------------------
    // 阶段 1：增量迁移 —— 逐列 ADD COLUMN IF NOT EXISTS（可被门控跳过）
    // --------------------------------------------------------------------
    let mut tables_done = 0usize;
    let mut cols_added = 0usize;
    if !skip_ensure {
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
    }

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

    // --------------------------------------------------------------------
    // AR-03：upsert 台账（GATE_ENABLED=false 时完全不碰台账）
    // --------------------------------------------------------------------
    if gate_on {
        upsert_ledger(pool, schema, &current_hash, total_tables, total_cols, skip_ensure).await;
    }

    Ok((tables_done, cols_added, verified))
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
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
        assert_eq!(hrm_table("payroll_runs"), "hrm.payroll_runs");
        assert_eq!(hrm_table("attendance_records"), "hrm.attendance_records");
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

    #[test]
    fn test_all_business_schema_helpers_use_real_schema() {
        // 抽样校验所有 *_table 输出格式，保证 schema 前缀统一（真实 schema，非 plugin_ 前缀）
        assert_eq!(crm_table("leads"), "crm.leads");
        assert_eq!(qms_table("inspections"), "qms.inspections");
        assert_eq!(mes_table("work_orders"), "mes.work_orders");
        assert_eq!(wms_table("bins"), "wms.bins");
        assert_eq!(srm_table("suppliers"), "srm.suppliers");
        assert_eq!(scm_table("inventory"), "scm.inventory");
        assert_eq!(pdm_table("drawings"), "pdm.drawings");
        assert_eq!(lims_table("samples"), "lims.samples");
        assert_eq!(rs_table("requisitions"), "rs.requisitions");
        assert_eq!(gis_table("geo_zones"), "gis.geo_zones");
        assert_eq!(ehs_table("incidents"), "ehs.incidents");
        assert_eq!(bi_table("dashboards"), "bi.dashboards");
        assert_eq!(ai_table("prompts"), "ai.prompts");
        assert_eq!(im_table("messages"), "im.messages");
        assert_eq!(integration_table("syncs"), "integration.syncs");
        assert_eq!(mail_table("templates"), "mail.templates");
        assert_eq!(mobile_table("pushes"), "mobile.pushes");
        assert_eq!(portal_table("notices"), "portal.notices");
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
            build_add_column_sql(Some("hrm"), "employee", "email", "TEXT NOT NULL"),
            r#"ALTER TABLE "hrm"."employee" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL"#
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

    // ===== AR-03: schema_defense_gate_enabled_from =====
    #[test]
    fn test_gate_enabled_default_true_and_falsy_values() {
        // 默认（未设置/空）→ true
        assert!(schema_defense_gate_enabled_from(""));
        // 真值写法 → true
        for v in ["1", "true", "TRUE", "on", "yes", "anything", " false "] {
            let expected = !matches!(v.trim().to_ascii_lowercase().as_str(), "0" | "false" | "no" | "off");
            assert_eq!(schema_defense_gate_enabled_from(v), expected, "gate env = {:?}", v);
        }
        // 假值写法 → false
        for v in ["0", "false", "False", "NO", "off", " off "] {
            assert!(!schema_defense_gate_enabled_from(v), "gate env = {:?}", v);
        }
    }

    // ===== AR-03: normalize_ddl_fragment =====
    #[test]
    fn test_normalize_ddl_collapses_whitespace() {
        assert_eq!(
            normalize_ddl_fragment("VARCHAR(255)   NOT NULL"),
            "VARCHAR(255) NOT NULL"
        );
        assert_eq!(
            normalize_ddl_fragment("  text \n \t DEFAULT  'x'  "),
            "TEXT DEFAULT 'x'"
        );
    }

    #[test]
    fn test_normalize_ddl_strips_line_comments() {
        assert_eq!(
            normalize_ddl_fragment("INT NOT NULL -- 主键关联字段"),
            "INT NOT NULL"
        );
        assert_eq!(
            normalize_ddl_fragment("TIMESTAMPTZ DEFAULT NOW() -- 创建时间\n"),
            "TIMESTAMPTZ DEFAULT NOW()"
        );
        // 行内注释与后续片段
        assert_eq!(
            normalize_ddl_fragment("VARCHAR(32) -- remark\nNOT NULL"),
            "VARCHAR(32) NOT NULL"
        );
    }

    #[test]
    fn test_normalize_ddl_uppercases_keywords_but_not_string_literals() {
        assert_eq!(
            normalize_ddl_fragment("varchar(255) not null default 'active'"),
            "VARCHAR(255) NOT NULL DEFAULT 'active'"
        );
        assert_eq!(
            normalize_ddl_fragment("integer references org(id) on delete cascade"),
            "INTEGER REFERENCES ORG(ID) ON DELETE CASCADE"
        );
        // 字符串字面量内的字母保持原样（不参与大小写归一）
        assert_eq!(
            normalize_ddl_fragment("text default 'abcDef'"),
            "TEXT DEFAULT 'abcDef'"
        );
    }

    // ===== AR-03: compute_schema_hash 规范化不变量 =====
    const DEMO_DEFS: &[(&str, &[(&str, &str)])] = &[(
        "orders",
        &[
            ("status", "VARCHAR(32) NOT NULL"),
            ("total", "NUMERIC(12,2) DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ"),
        ],
    )];

    #[test]
    fn test_hash_ignores_column_order() {
        let a = compute_schema_hash(
            "wms",
            &[("orders", &[("status", "VARCHAR(32) NOT NULL"), ("total", "NUMERIC(12,2)")])],
        );
        let b = compute_schema_hash(
            "wms",
            &[("orders", &[("total", "NUMERIC(12,2)"), ("status", "VARCHAR(32) NOT NULL")])],
        );
        assert_eq!(a, b);
    }

    #[test]
    fn test_hash_ignores_table_order() {
        let defs1: &[(&str, &[(&str, &str)])] = &[
            ("orders", &[("status", "VARCHAR(32) NOT NULL")]),
            ("lines", &[("qty", "INT")]),
        ];
        let defs2: &[(&str, &[(&str, &str)])] = &[
            ("lines", &[("qty", "INT")]),
            ("orders", &[("status", "VARCHAR(32) NOT NULL")]),
        ];
        assert_eq!(compute_schema_hash("wms", defs1), compute_schema_hash("wms", defs2));
    }

    #[test]
    fn test_hash_ignores_whitespace_comment_and_case() {
        let base = compute_schema_hash("wms", DEMO_DEFS);
        let varied: &[(&str, &[(&str, &str)])] = &[(
            "orders",
            &[
                ("status", "varchar(32)   not null -- 状态"),
                ("total", "numeric(12,2) default 0"),
                ("created_at", "  timestamptz \n"),
            ],
        )];
        assert_eq!(base, compute_schema_hash("wms", varied));
    }

    #[test]
    fn test_hash_changes_on_column_add_remove_or_type() {
        let base = compute_schema_hash("wms", DEMO_DEFS);

        // 加列
        let added: &[(&str, &[(&str, &str)])] = &[(
            "orders",
            &[
                ("status", "VARCHAR(32) NOT NULL"),
                ("total", "NUMERIC(12,2) DEFAULT 0"),
                ("created_at", "TIMESTAMPTZ"),
                ("note", "TEXT"),
            ],
        )];
        assert_ne!(base, compute_schema_hash("wms", added));

        // 减列
        let removed: &[(&str, &[(&str, &str)])] = &[(
            "orders",
            &[
                ("status", "VARCHAR(32) NOT NULL"),
                ("total", "NUMERIC(12,2) DEFAULT 0"),
            ],
        )];
        assert_ne!(base, compute_schema_hash("wms", removed));

        // 类型变
        let typed: &[(&str, &[(&str, &str)])] = &[(
            "orders",
            &[
                ("status", "VARCHAR(64) NOT NULL"),
                ("total", "NUMERIC(12,2) DEFAULT 0"),
                ("created_at", "TIMESTAMPTZ"),
            ],
        )];
        assert_ne!(base, compute_schema_hash("wms", typed));
    }

    #[test]
    fn test_hash_excludes_id_column() {
        let without_id = compute_schema_hash(
            "wms",
            &[("orders", &[("status", "VARCHAR(32) NOT NULL")])],
        );
        let with_id = compute_schema_hash(
            "wms",
            &[("orders", &[("id", "UUID PRIMARY KEY"), ("status", "VARCHAR(32) NOT NULL")])],
        );
        assert_eq!(without_id, with_id);
    }

    #[test]
    fn test_hash_differs_across_services() {
        assert_ne!(
            compute_schema_hash("wms", DEMO_DEFS),
            compute_schema_hash("gis", DEMO_DEFS)
        );
    }

    #[test]
    fn test_hash_is_sha256_hex_64chars() {
        let h = compute_schema_hash("wms", DEMO_DEFS);
        assert_eq!(h.len(), 64);
        assert!(h.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
