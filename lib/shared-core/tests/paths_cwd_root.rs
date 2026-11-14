//! CWD 为 `/` 时的可写目录解析（对应 launchd 未设置 `WorkingDirectory` 的生产形态）。
//!
//! 本文件是独立集成测试目标，独占一个测试进程，因此可以安全地修改进程 CWD 与
//! 环境变量，不会与 lib 内的其他用例互相干扰。

use std::path::PathBuf;

use topems_shared_core::paths::resolve_writable_dir;

const ENV_UNSET: &str = "TOPEMS_TEST_PATHS_CWD_UNSET";
const ENV_RELATIVE: &str = "TOPEMS_TEST_PATHS_CWD_RELATIVE";

#[test]
#[allow(clippy::expect_used)]
fn resolves_absolute_paths_while_cwd_is_root() {
    std::env::remove_var(ENV_UNSET);
    std::env::set_var(ENV_RELATIVE, "data/uploads");

    let cwd_before = std::env::current_dir().expect("读取当前工作目录失败");
    std::env::set_current_dir("/").expect("切换 CWD 到 / 失败");

    let unset = resolve_writable_dir(ENV_UNSET, "ai-docs");
    let relative = resolve_writable_dir(ENV_RELATIVE, "uploads");

    std::env::set_current_dir(&cwd_before).expect("恢复 CWD 失败");
    std::env::remove_var(ENV_RELATIVE);

    // CWD=/ 时也必须落成绝对路径，且不能是根目录下的相对拼接结果。
    assert!(unset.is_absolute(), "未配置时必须解析为绝对路径: {unset:?}");
    assert_ne!(unset, PathBuf::from("docs"));
    assert_ne!(unset, PathBuf::from("/docs"));
    assert_ne!(unset, PathBuf::from("/ai-docs"));

    assert!(
        relative.is_absolute(),
        "配置为相对路径时必须锚定可执行文件目录: {relative:?}"
    );
    assert!(
        relative.ends_with("data/uploads"),
        "相对配置应保留子路径: {relative:?}"
    );
    assert_ne!(relative, PathBuf::from("/data/uploads"));
}
