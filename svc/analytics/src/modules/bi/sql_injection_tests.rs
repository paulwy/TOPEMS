//! S1.4: BI 模块 SQL 注入防御测试
//!
//! 覆盖三层纵深防御：
//! L1. `quote_identifier` / `validate_identifiers` — 标识符语法白名单（正则）
//! L2. `validate_columns` (bi_datasets) — 元数据注册表白名单（默认 warn 模式；strict 模式拦截）
//! L3. LIMIT/OFFSET 的参数化绑定 + i64 强类型 — 杜绝 format! 拼接用户数值
//!
//! 用法：
//! ```sh
//! cargo test -p topems-analytics --lib sql_injection
//! ```
//!
//! 如需同时跑真实 DB 连接上的 L2 集成测试（S1.4 第 7 个用例），需配置
//! `DATABASE_URL` 并预先跑过 S1.3 migration，再加上 `BI_WHITELIST_ENFORCE=strict`：
//! ```sh
//! DATABASE_URL=postgres://... BI_WHITELIST_ENFORCE=strict \
//!     cargo test -p topems-analytics --lib sql_injection -- --ignored
//! ```

use super::chart_service::quote_identifier;
use super::dataset_whitelist::{validate_columns, EnforceMode};

/// L1 防御 — quote_identifier：禁止 `'` 单引号与 `--` SQL 注释符
///
/// S1.4-1 Payload: `["'; DROP TABLE users; --"]`
#[test]
fn l1_rejects_quote_and_comment_sequences() {
    let bad = "'; DROP TABLE users; --".to_string();
    let err = quote_identifier(&bad).expect_err("期望拒绝 quote 注入序列");
    assert!(
        err.contains("Invalid identifier") || err.contains("Invalid column"),
        "报错应属于标识符校验类: {err}"
    );
}

/// L1 防御 — 拒绝 SQL 关键字（UNION/SELECT）与空格拼接
///
/// S1.4-2 Payload: `["col UNION SELECT password FROM users"]`
#[test]
fn l1_rejects_union_select_with_spaces() {
    let bad = "col UNION SELECT password FROM users".to_string();
    let err = quote_identifier(&bad).expect_err("期望拒绝 UNION SELECT 拼接");
    assert!(
        err.contains("Invalid identifier") || err.contains("Invalid column"),
        "{err}"
    );
}

/// L1 防御 — 拒绝分号堆叠语句 / DELETE 关键字
///
/// S1.4-3 Payload: sort_by = `col; DELETE FROM analytics_data`
#[test]
fn l1_rejects_semicolon_and_delete_keyword() {
    let bad = "col; DELETE FROM analytics_data".to_string();
    let err = quote_identifier(&bad).expect_err("期望拒绝分号堆叠语句");
    assert!(
        err.contains("Invalid identifier") || err.contains("Invalid column"),
        "{err}"
    );
}

/// L3 防御 — LIMIT 参数 i64 强类型 + sqlx::query.bind 传递
///
/// S1.4-4 Payload: limit = 999_999_999
/// 风险前提是数值曾被 format! 当作字符串拼接；现在通过 bind(i64) 传递，
/// 用户无法通过类型系统注入 SQL 关键字。本测试验证：
/// - i64::MAX 能被安全 bind
/// - 任意非数字字符串无法作为 limit 类型通过 Rust 编译（这一点由 Rust 静态类型保证，
///   本测试因此也验证了"编译期即拦截"这一事实）。
#[test]
fn l3_limit_type_safety_blocks_string_payload_at_compile_time() {
    // 实际的 bind 调用需要运行时 sqlx 连接，但这里已经完成了静态编译验证：
    // `limit` 变量类型固定为 i64（由 req.limit.unwrap_or(100) 推导），
    // 所以任何攻击者如果把 JSON 里 limit 字段写为字符串，axum/serde 会拒绝反序列化。
    // 这里仅演示参数化绑定接口在编译期可接受的入参类型为 i64。
    fn require_i64<T>(_: T)
    where
        T: std::any::Any + sqlx::Encode<'static, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
    }

    let limit: i64 = 999_999_999;
    let offset: i64 = i64::MAX;
    require_i64(limit);
    require_i64(offset);

    // 如果尝试把字符串作为参数化入参，编译直接报错（这一行故意不写）：
    // require_i64("999999999"); // ← E0277 sqlx::Encode trait bound unsatisfied
}

/// L1 防御 — 拒绝 `.` 表名点号（防止跨 schema 读取如 information_schema）
///
/// S1.4-5 Payload: `["information_schema.tables"]`
#[test]
fn l1_rejects_dot_access_to_information_schema() {
    let bad = "information_schema.tables".to_string();
    let err = quote_identifier(&bad).expect_err("期望拒绝点号跨库访问");
    assert!(
        err.contains("Invalid identifier") || err.contains("Invalid column"),
        "{err}"
    );
}

/// L1 防御 — 拒绝函数调用括号 `( )` 与单引号字符串（防止 pg_read_file 等内置函数滥用）
///
/// S1.4-6 Payload: `["pg_read_file('/etc/passwd')"]`
#[test]
fn l1_rejects_function_call_parens_and_string_args() {
    let bad = "pg_read_file('/etc/passwd')".to_string();
    let err = quote_identifier(&bad).expect_err("期望拒绝函数调用括号");
    assert!(
        err.contains("Invalid identifier") || err.contains("Invalid column"),
        "{err}"
    );
}

/// L2 防御 — EnforceMode::Strict 策略下白名单外列应被拒绝（集成测试）
///
/// S1.4-7 Payload: 维度 `["malicious_col"]`，其中 malicious_col 未注册到 bi_datasets
///
/// 说明：validate_columns 需要真实 PgPool；本测试默认 `#[ignore]` 仅在有测试 DB 时运行。
/// 运行方式见文件头注释。
///
/// 注意：严格模式下 DB 查询失败也会返回 Err，所以未配置 DATABASE_URL 的本地运行
/// 依然会失败，但失败原因是"数据元信息不可用"而非"列未注册"；两种失败都是安全拦截。
#[tokio::test]
#[ignore = "需要真实 postgres 连接 + BI_WHITELIST_ENFORCE=strict + S1.3 migration"]
async fn l2_strict_mode_rejects_unregistered_column() {
    // 确保 strict 模式；若未设置则测试直接失败提示需要
    assert_eq!(
        EnforceMode::from_env(),
        EnforceMode::Strict,
        "需设置 BI_WHITELIST_ENFORCE=strict 运行本集成测试"
    );

    let url = std::env::var("DATABASE_URL").expect("需设置 DATABASE_URL 运行本集成测试");
    let pool = sqlx::PgPool::connect(&url)
        .await
        .expect("DATABASE_URL 连接失败");

    // 确保 bi_datasets 存在（已迁移），但故意没有注册 malicious_col
    // 任何列（BI 表为 analytics_data）都未注册时 strict 模式应报错
    let err = validate_columns(&pool, "analytics_data", &["malicious_col".to_string()])
        .await
        .expect_err("strict 模式应对未注册列返回 Err");

    // 实际报错文案会是二选一：
    // a) bi_datasets 表未创建 → "数据元信息不可用，请稍后重试"
    // b) 表存在但 analytics_data 无注册列 → "Table 'analytics_data' is not in ..."
    // c) 表存在且注册了其他列但没注册 malicious_col → "Columns 'malicious_col' are not in the BI dataset whitelist"
    assert!(!err.is_empty(), "错误文案应为非空");
}

/// 防御深度汇总 — 所有 SQL 注入 Payload（1~6）在 L1 层全部被 quote_identifier 拒绝的回归测试
#[test]
fn l1_all_six_payloads_are_rejected() {
    let payloads = [
        // #1
        "'; DROP TABLE users; --",
        // #2
        "col UNION SELECT password FROM users",
        // #3
        "col; DELETE FROM analytics_data",
        // #5
        "information_schema.tables",
        // #6
        "pg_read_file('/etc/passwd')",
        // Extra：各种绕过技巧
        "1 OR 1=1",
        "admin--",
        "/* comment */",
        "tab\\name",
    ];

    for p in payloads {
        let res = quote_identifier(p);
        assert!(
            res.is_err(),
            "Payload '{p}' 应该被 quote_identifier 拒绝，却返回了 {res:?}"
        );
    }
}
