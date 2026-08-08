//! S1.3: BI 数据集白名单校验 — 纵深防御 SQL 注入的第二层
//!
//! 在 validate_identifier / quote_identifier（第一层：标识符白名单字符校验）之后，
//! 本模块提供第二层：只允许查询在 bi_datasets 元数据表中显式注册的 (table, column)。
//!
//! 三种运行模式（通过 `BI_WHITELIST_ENFORCE` 环境变量控制）：
//! - `off`   — 禁用 whitelist 校验，不做任何查询（纯开发模式）
//! - `warn`  — 查询 whitelist，若列未注册则 `warn!` 日志，但仍允许通过（生产过渡期）
//! - `strict`— 未注册列直接返回 Err（生产强制模式），也是 S1.3 测试的默认模式
//!
//! 默认模式 = `warn`。

use sqlx::PgPool;
use std::env;
use tracing::{error, warn};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnforceMode {
    Off,
    Warn,
    Strict,
}

impl Default for EnforceMode {
    fn default() -> Self {
        EnforceMode::Warn
    }
}

impl EnforceMode {
    /// 从 `BI_WHITELIST_ENFORCE` 环境变量解析。
    pub fn from_env() -> Self {
        match env::var("BI_WHITELIST_ENFORCE")
            .ok()
            .map(|s| s.to_ascii_lowercase())
            .as_deref()
        {
            Some("off") | Some("0") | Some("false") | Some("disable") | Some("disabled") => {
                EnforceMode::Off
            }
            Some("strict") | Some("1") | Some("enforce") | Some("true") | Some("on") => {
                EnforceMode::Strict
            }
            Some("warn") | Some("log") | None => EnforceMode::Warn,
            Some(other) => {
                warn!("BI_WHITELIST_ENFORCE 未知值 '{other}'，回退到默认 warn 模式");
                EnforceMode::Warn
            }
        }
    }
}

/// 校验 `table_name`.`columns` 是否全部在 bi_datasets 白名单中（且 is_active=true）。
///
/// 返回：
/// - `Ok(())` — 全部命中
/// - `Err(message)` — strict 模式下未命中或 DB 查询失败；
///                    warn 模式仅记录日志，返回 Ok(())；
///                    off 模式直接 Ok(())，无 DB 查询。
pub async fn validate_columns(
    pool: &PgPool,
    table_name: &str,
    columns: &[String],
) -> Result<(), String> {
    let mode = EnforceMode::from_env();
    if matches!(mode, EnforceMode::Off) {
        return Ok(());
    }

    if columns.is_empty() {
        return Ok(());
    }

    // 参数化查询：只取出该表下的 active 列名集合
    let result = sqlx::query_scalar::<_, String>(
        r#"SELECT column_name FROM bi_datasets WHERE table_name = $1 AND is_active = TRUE"#,
    )
    .bind(table_name)
    .fetch_all(pool)
    .await;

    let allowed = match result {
        Ok(cols) => cols,
        Err(e) => {
            // bi_datasets 表还未创建（老数据库未跑迁移）或连接问题 — 严格报出
            let msg = format!("BI dataset whitelist 查询失败 (table={table_name}): {e}");
            error!("{msg}");
            return if matches!(mode, EnforceMode::Strict) {
                Err("数据元信息不可用，请稍后重试".to_string())
            } else {
                Ok(())
            };
        }
    };

    // 若白名单为空（bi_datasets 尚未录入）→ warn 或 strict 拦截
    if allowed.is_empty() {
        let msg = format!("BI 数据集白名单为空：table '{table_name}' 未注册任何允许查询的列");
        warn!("{msg}");
        return if matches!(mode, EnforceMode::Strict) {
            Err(format!(
                "Table '{table_name}' is not in the BI dataset whitelist (no columns registered)"
            ))
        } else {
            Ok(())
        };
    }

    let missing: Vec<String> = columns
        .iter()
        .map(|c| c.clone())
        .filter(|c| !allowed.contains(c))
        .collect();

    if missing.is_empty() {
        return Ok(());
    }

    let msg = format!(
        "BI 数据集白名单校验未通过：table '{table_name}' — 未注册列 [{}]（已允许列: [{}]，模式: {:?}）",
        missing.join(", "),
        allowed.join(", "),
        mode
    );
    warn!("{msg}");

    if matches!(mode, EnforceMode::Strict) {
        Err(format!(
            "Column{} '{}' {} not in the BI dataset whitelist for table '{}'",
            if missing.len() == 1 { "" } else { "s" },
            missing.join("', '"),
            if missing.len() == 1 { "is" } else { "are" },
            table_name
        ))
    } else {
        Ok(())
    }
}

/// 服务启动时（BI_WHITELIST_AUTO_REGISTER=true）从 information_schema 同步列信息到 bi_datasets。
///
/// 幂等：若 (table_name, column_name) 已存在则跳过（ON CONFLICT DO NOTHING）。
/// 这是 warn 模式下帮助运维快速填充白名单的便捷入口，strict 模式生产环境建议关闭自动注册。
pub async fn auto_register_from_information_schema(
    pool: &PgPool,
    tables: &[&str],
) -> Result<u64, String> {
    let enabled = env::var("BI_WHITELIST_AUTO_REGISTER")
        .ok()
        .map(|s| s.eq_ignore_ascii_case("true") || s == "1")
        .unwrap_or(false);
    if !enabled {
        return Ok(0);
    }

    let mut inserted: u64 = 0;
    for table in tables {
        let rows = sqlx::query(
            r#"
            INSERT INTO bi_datasets (table_name, column_name, data_type)
            SELECT
                $1::VARCHAR  AS table_name,
                column_name,
                CASE WHEN data_type IN ('int2','int4','int8','float4','float8','numeric')
                     THEN 'number'
                     WHEN data_type IN ('timestamp','timestamptz','date','time','timetz')
                     THEN 'datetime'
                     WHEN data_type IN ('bool','boolean')
                     THEN 'boolean'
                     WHEN data_type IN ('json','jsonb')
                     THEN 'json'
                     ELSE 'string'
                END AS data_type
            FROM information_schema.columns
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              AND table_name = $1
            ON CONFLICT (table_name, column_name) DO NOTHING
            "#,
        )
        .bind(*table)
        .execute(pool)
        .await
        .map_err(|e| format!("auto_register bi_datasets for '{table}' failed: {e}"))?;
        inserted += rows.rows_affected();
    }

    Ok(inserted)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enforce_mode_from_env_variants() {
        // 默认（未设置变量）— 先 save/restore，不污染其他测试
        fn set_env(key: &str, val: Option<&str>) {
            // temp helper — no unsafe env manipulation needed; test runs serially via cargo test default
            unsafe {
                match val {
                    Some(v) => env::set_var(key, v),
                    None => env::remove_var(key),
                }
            }
        }

        unsafe {
            env::remove_var("BI_WHITELIST_ENFORCE");
        }
        assert_eq!(EnforceMode::from_env(), EnforceMode::Warn);

        set_env("BI_WHITELIST_ENFORCE", Some("strict"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Strict);
        set_env("BI_WHITELIST_ENFORCE", Some("1"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Strict);
        set_env("BI_WHITELIST_ENFORCE", Some("on"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Strict);

        set_env("BI_WHITELIST_ENFORCE", Some("warn"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Warn);
        set_env("BI_WHITELIST_ENFORCE", Some("log"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Warn);

        set_env("BI_WHITELIST_ENFORCE", Some("off"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Off);
        set_env("BI_WHITELIST_ENFORCE", Some("false"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Off);

        set_env("BI_WHITELIST_ENFORCE", Some("garbage"));
        assert_eq!(EnforceMode::from_env(), EnforceMode::Warn);

        // clean up
        unsafe { env::remove_var("BI_WHITELIST_ENFORCE") };
    }
}
