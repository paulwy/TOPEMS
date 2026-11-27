//! 报表订阅/调度域「软删可见性 + 写入命中」结构棘轮。
//!
//! 背景：`bi.report_subscriptions` / `bi.report_schedules` 都带 `deleted_at` 软删列
//! （`20260918000022_align_reports_tables.sql:70`、`20261007000009_align_orphan_tables_selfheal3.sql:245`），
//! 但 2026-11-27 之前的读写只按 `id` / `status` 过滤，于是：
//!   - 列表与详情把已删订阅、已删调度照常返回；
//!   - update / delete / toggle 命中不到行也返回 200「成功」；
//!   - 后台调度器继续给已删订阅发信、继续执行已删调度；
//!   - 列表查询的 `.unwrap_or_default()` 把数据库错误变成「成功 + 空列表」。
//!
//! 本棘轮直接读源码断言，防止新代码再退回上述四种形态。

use std::path::PathBuf;

const REPORT_TABLES: [&str; 2] = ["bi.report_subscriptions", "bi.report_schedules"];

fn read_source(file: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("src/modules/report")
        .join(file);
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("读取 {} 失败: {}", path.display(), e))
}

/// 抽出源码里所有 `r#"..."#` 原始字符串（本域 SQL 全走这种字面量）。
fn sql_blocks(source: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cursor = 0usize;
    while let Some(offset) = source[cursor..].find("r#\"") {
        let body_start = cursor + offset + 3;
        let Some(end) = source[body_start..].find("\"#") else {
            break;
        };
        out.push(source[body_start..body_start + end].to_string());
        cursor = body_start + end + 2;
    }
    out
}

#[test]
fn every_select_and_update_on_report_tables_filters_soft_deleted() {
    let mut checked = 0usize;
    for file in ["subscription.rs", "schedule.rs", "scheduler.rs"] {
        for block in sql_blocks(&read_source(file)) {
            let trimmed = block.trim_start();
            if !REPORT_TABLES.iter().any(|t| block.contains(t)) {
                continue;
            }
            if !(trimmed.starts_with("SELECT") || trimmed.starts_with("UPDATE")) {
                continue;
            }
            checked += 1;
            assert!(
                block.contains("deleted_at IS NULL"),
                "{} 中一条 SQL 未过滤软删（已删行仍可见/仍可写）：\n{}",
                file,
                trimmed
            );
        }
    }
    assert!(
        checked >= 15,
        "只扫描到 {} 条报表表 SQL，疑似解析失效",
        checked
    );
}

#[test]
fn query_errors_are_not_swallowed() {
    for file in ["subscription.rs", "schedule.rs", "scheduler.rs"] {
        assert!(
            !read_source(file).contains(".unwrap_or_default()"),
            "{} 仍用 unwrap_or_default() 吞掉数据库错误（失败会变成成功 + 空列表）",
            file
        );
    }
}

#[test]
fn mutation_handlers_guard_zero_rows() {
    // subscription.rs：update / delete 走 execute + rows_affected，toggle 走 fetch_optional 的 Ok(None)
    // schedule.rs：update / delete / execute / toggle 走 execute + rows_affected
    for (file, min_guards) in [("subscription.rs", 2usize), ("schedule.rs", 4usize)] {
        let guards = read_source(file)
            .matches("not found or already deleted")
            .count();
        assert!(
            guards >= min_guards,
            "{} 只有 {} 处「命中 0 行 → 404」守卫，至少应有 {} 处",
            file,
            guards,
            min_guards
        );
    }
}
