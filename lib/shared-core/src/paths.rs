//! 运行期可写目录解析。
//!
//! 生产进程由 launchd 拉起且 plist 未设置 `WorkingDirectory` 时，进程 CWD 是 `/`，
//! 任何 `./xxx` 相对路径都会落到根目录；macOS 根卷只读，于是目录创建/写文件直接
//! 返回 `Read-only file system (os error 30)`，且调用方普遍把该错误静默吞掉。
//!
//! 这里把所有可写目录统一解析为**绝对路径**：
//!
//! - 未配置：锚定可执行文件所在目录 + 默认子目录；
//! - 配置为相对路径：同样锚定可执行文件所在目录（**不**参照 CWD）；
//! - 配置为绝对路径：原样返回。
//!
//! 因此无论进程 CWD 是 `/` 还是仓库根，解析结果都一致。

use std::path::{Path, PathBuf};

/// 解析可写目录时使用的锚点：可执行文件所在目录。
///
/// `current_exe()` 返回绝对路径，取其父目录后与 CWD 无关；极端情况下取不到
/// （例如路径不可读）时退回系统临时目录，保证返回值始终是绝对路径。
pub fn exe_anchor_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(Path::to_path_buf))
        .filter(|dir| dir.is_absolute())
        .unwrap_or_else(std::env::temp_dir)
}

/// 按环境变量解析可写目录，环境变量为空或未配置时使用 `default_subdir`。
///
/// 见模块文档：返回值恒为绝对路径，且不依赖进程 CWD。
pub fn resolve_writable_dir(env_key: &str, default_subdir: &str) -> PathBuf {
    let configured = std::env::var(env_key).ok();
    resolve_writable_dir_with_anchor(&exe_anchor_dir(), configured.as_deref(), default_subdir)
}

/// 解析规则的纯函数实现（锚点显式传入，便于在测试中覆盖各种 CWD 与配置组合）。
pub fn resolve_writable_dir_with_anchor(
    anchor: &Path,
    configured: Option<&str>,
    default_subdir: &str,
) -> PathBuf {
    match configured.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => {
            let path = Path::new(value);
            if path.is_absolute() {
                path.to_path_buf()
            } else {
                anchor.join(path)
            }
        }
        None => anchor.join(default_subdir),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn anchor() -> &'static Path {
        Path::new("/opt/topems/bin")
    }

    #[test]
    fn unset_falls_back_to_anchor_and_default_subdir() {
        assert_eq!(
            resolve_writable_dir_with_anchor(anchor(), None, "uploads"),
            PathBuf::from("/opt/topems/bin/uploads")
        );
    }

    #[test]
    fn blank_value_is_treated_as_unset() {
        assert_eq!(
            resolve_writable_dir_with_anchor(anchor(), Some(""), "ai-docs"),
            PathBuf::from("/opt/topems/bin/ai-docs")
        );
        assert_eq!(
            resolve_writable_dir_with_anchor(anchor(), Some("   "), "ai-docs"),
            PathBuf::from("/opt/topems/bin/ai-docs")
        );
    }

    #[test]
    fn relative_value_is_anchored_at_exe_dir_not_cwd() {
        assert_eq!(
            resolve_writable_dir_with_anchor(anchor(), Some("data/uploads"), "uploads"),
            PathBuf::from("/opt/topems/bin/data/uploads")
        );
        assert_eq!(
            resolve_writable_dir_with_anchor(anchor(), Some("./uploads"), "uploads"),
            PathBuf::from("/opt/topems/bin/./uploads")
        );
    }

    #[test]
    fn absolute_value_is_kept_as_is() {
        assert_eq!(
            resolve_writable_dir_with_anchor(anchor(), Some("/var/lib/topems/uploads"), "uploads"),
            PathBuf::from("/var/lib/topems/uploads")
        );
    }

    #[test]
    fn resolved_default_is_always_absolute_and_never_plain_docs() {
        let resolved = resolve_writable_dir("TOPEMS_TEST_PATHS_UNSET_KEY", "ai-docs");
        assert!(resolved.is_absolute(), "必须解析为绝对路径: {resolved:?}");
        assert_ne!(resolved, PathBuf::from("docs"));
        assert!(!resolved.starts_with("docs"));
    }

    #[test]
    fn exe_anchor_is_absolute() {
        assert!(exe_anchor_dir().is_absolute());
    }
}
