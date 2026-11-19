//! 测试期 DSN 安全守卫。
//!
//! 目的：`#[sqlx::test]` 会在测试体执行前读取进程环境变量 `DATABASE_URL`，
//! 并在其上创建/删除临时数据库。本仓库 `.env` 的 `DATABASE_URL` 指向
//! `topems_prod`，若直接跑测试会打到生产库。因此在测试二进制启动时（早于
//! sqlx 读取 DSN）执行本守卫：
//!
//! 1. 只接受进程环境变量 `TEST_DATABASE_URL`，**绝不**回退到 `DATABASE_URL`；
//! 2. 缺失/为空 → 直接 panic，明确失败；
//! 3. 解析后若命中生产库名/生产角色/生产主机 → 直接 panic，并打印解析值与来源；
//! 4. 校验通过后把 `DATABASE_URL` 覆盖为同一 DSN，保证 sqlx 只连测试库。
//!
//! 用法：在包含 `#[sqlx::test]` 的测试文件模块级调用一次
//! `topems_test_support::sqlx_dsn_guard!();`。

use std::sync::Once;

const ENV_KEY: &str = "TEST_DATABASE_URL";
const SOURCE: &str = "进程环境变量 TEST_DATABASE_URL";

static INIT: Once = Once::new();

/// 解析后的测试 DSN 关键字段。
#[derive(Debug, Clone)]
pub struct TestDsn {
    pub raw: String,
    pub user: String,
    pub host: String,
    pub port: String,
    pub database: String,
}

/// 供测试文件直接复用：返回已校验的 `TEST_DATABASE_URL` 原始值。
pub fn test_database_url() -> String {
    ensure_test_dsn();
    std::env::var(ENV_KEY)
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| panic_missing())
}

/// 供「有测试库则跑、无则跳过」的测试使用：未设置 `TEST_DATABASE_URL` 时返回 `None`；
/// 设置时与 [`ensure_test_dsn`] 同样校验生产特征并覆盖 `DATABASE_URL`。
///
/// 与 [`test_database_url`] 的区别只在于缺失时跳过而非 panic，**不会**回退到 `DATABASE_URL`。
pub fn try_test_database_url() -> Option<String> {
    let raw = std::env::var(ENV_KEY)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())?;
    validate_and_apply(&raw);
    Some(raw)
}

/// 幂等地执行一次 DSN 校验，并强制覆盖 `DATABASE_URL`。
pub fn ensure_test_dsn() {
    INIT.call_once(|| {
        let raw = std::env::var(ENV_KEY)
            .ok()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| panic_missing());

        validate_and_apply(&raw);
    });
}

fn validate_and_apply(raw: &str) {
    let dsn = parse_dsn(raw).unwrap_or_else(|reason| {
        panic!(
            "[test-dsn] 拒绝启动：无法解析 {SOURCE}（{reason}）。\n  实际值：{}\n  期望形如：postgres://topems_test_runner@localhost:5432/topems_test_runner",
            mask_dsn(raw)
        )
    });

    if let Some(hit) = production_hit(&dsn) {
        panic!(
            "[test-dsn] 拒绝连接生产环境：{SOURCE} 命中生产特征（{hit}）。\n  \
             来源：{SOURCE}\n  实际值：{}\n  解析结果：user={} host={} port={} database={}\n  \
             请把 TEST_DATABASE_URL 指向专用测试库（例如 topems_test_runner），测试不会回退到 DATABASE_URL。",
            mask_dsn(raw),
            dsn.user,
            dsn.host,
            dsn.port,
            dsn.database
        );
    }

    if dsn.database.eq_ignore_ascii_case("topems") {
        eprintln!(
            "[test-dsn] 警告：{SOURCE} 指向开发库 `{}`，建议改用专用测试库（如 topems_test_runner）。",
            dsn.database
        );
    }

    std::env::set_var("DATABASE_URL", raw);
    eprintln!(
        "[test-dsn] DATABASE_URL ← {SOURCE}（user={} host={} port={} database={}）",
        dsn.user, dsn.host, dsn.port, dsn.database
    );
}

fn panic_missing() -> ! {
    panic!(
        "[test-dsn] 拒绝启动：{SOURCE} 未设置或为空。\n  \
         #[sqlx::test] 只允许使用 TEST_DATABASE_URL，不会回退到 DATABASE_URL（后者可能指向生产库）。\n  \
         示例：export TEST_DATABASE_URL=postgres://topems_test_runner@localhost:5432/topems_test_runner"
    )
}

fn parse_dsn(raw: &str) -> Result<TestDsn, String> {
    let rest = raw
        .strip_prefix("postgres://")
        .or_else(|| raw.strip_prefix("postgresql://"))
        .ok_or_else(|| "scheme 不是 postgres:// 或 postgresql://".to_string())?;

    let (authority, path) = rest
        .split_once('/')
        .ok_or_else(|| "缺少 /database".to_string())?;
    let (userinfo, hostport) = authority.rsplit_once('@').unwrap_or(("", authority));
    let user = userinfo.split(':').next().unwrap_or("").to_string();
    let (host, port) = hostport.rsplit_once(':').unwrap_or((hostport, "5432"));
    let database = path.split('?').next().unwrap_or("");

    if database.is_empty() {
        return Err("database 名为空".to_string());
    }
    if host.is_empty() {
        return Err("host 为空".to_string());
    }

    Ok(TestDsn {
        raw: raw.to_string(),
        user,
        host: host.to_string(),
        port: port.to_string(),
        database: database.to_string(),
    })
}

fn production_hit(dsn: &TestDsn) -> Option<String> {
    let db = dsn.database.to_ascii_lowercase();
    if db == "topems_prod"
        || db.starts_with("topems_prod_")
        || db.ends_with("_prod")
        || db == "prod"
        || db == "production"
    {
        return Some(format!("database={}", dsn.database));
    }

    let user = dsn.user.to_ascii_lowercase();
    if user == "topems_prod" || user == "prod" {
        return Some(format!("user={}", dsn.user));
    }

    let host = dsn.host.to_ascii_lowercase();
    if host == "192.168.110.115" || host.contains("prod") {
        return Some(format!("host={}", dsn.host));
    }

    None
}

/// 隐藏 DSN 中的密码，避免 panic 信息泄露凭据。
fn mask_dsn(raw: &str) -> String {
    let Some(scheme_end) = raw.find("://") else {
        return "<无法解析>".to_string();
    };
    let head = &raw[..scheme_end + 3];
    let rest = &raw[scheme_end + 3..];
    let Some((authority, tail)) = rest.split_once('/') else {
        return raw.to_string();
    };
    let masked = match authority.rsplit_once('@') {
        Some((userinfo, hostport)) => match userinfo.split_once(':') {
            Some((user, _)) => format!("{user}:***@{hostport}"),
            None => authority.to_string(),
        },
        None => authority.to_string(),
    };
    format!("{head}{masked}/{tail}")
}

/// 测试二进制启动期入口（由 `sqlx_dsn_guard!()` 放入 init_array）。
#[doc(hidden)]
pub extern "C" fn __sqlx_dsn_guard_entry() {
    ensure_test_dsn();
}

/// 在测试文件模块级调用，确保本二进制启动时先执行 DSN 守卫。
///
/// 必须放在包含 `#[sqlx::test]` 的同一个测试目标（integration test 文件）里，
/// 且要在任何测试执行前完成链接。
#[macro_export]
macro_rules! sqlx_dsn_guard {
    () => {
        #[cfg(any(target_os = "linux", target_os = "android"))]
        #[link_section = ".init_array"]
        #[used]
        static TOPEMS_SQLX_DSN_GUARD: extern "C" fn() = $crate::__sqlx_dsn_guard_entry;

        #[cfg(any(target_os = "macos", target_os = "ios"))]
        #[link_section = "__DATA,__mod_init_func"]
        #[used]
        static TOPEMS_SQLX_DSN_GUARD: extern "C" fn() = $crate::__sqlx_dsn_guard_entry;

        #[cfg(windows)]
        #[link_section = ".CRT$XCU"]
        #[used]
        static TOPEMS_SQLX_DSN_GUARD: extern "C" fn() = $crate::__sqlx_dsn_guard_entry;
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_standard_dsn() {
        let d = parse_dsn(
            "postgres://topems_test_runner@localhost:5433/topems_test_runner?sslmode=disable",
        )
        .expect("should parse");
        assert_eq!(d.user, "topems_test_runner");
        assert_eq!(d.host, "localhost");
        assert_eq!(d.port, "5433");
        assert_eq!(d.database, "topems_test_runner");
    }

    #[test]
    fn rejects_production_database() {
        let d =
            parse_dsn("postgres://topems_test_runner@localhost:5432/topems_prod").expect("parse");
        assert!(production_hit(&d).is_some());
    }

    #[test]
    fn accepts_runner_database() {
        let d = parse_dsn("postgres://topems_test_runner@localhost:5432/topems_test_runner")
            .expect("parse");
        assert!(production_hit(&d).is_none());
    }

    #[test]
    fn masks_password() {
        let out = mask_dsn("postgres://topems:topems_secret@localhost:5432/topems");
        assert!(!out.contains("topems_secret"));
        assert!(out.contains("topems:***@localhost:5432/topems"));
    }
}
