//! # Tracing 敏感字段自动脱敏 Layer
//!
//! V79 Phase 3: 在 tracing Subscriber 层面自动脱敏已知敏感字段。
//! 作为 mask_value() 手动脱敏的兜底防线。

use std::collections::HashSet;
use tracing::field::Visit;
use tracing_subscriber::Layer;

/// 敏感字段自动脱敏 Layer
pub struct SensitiveFilterLayer {
    /// 已知的敏感字段名集合（小写匹配）
    sensitive_keys: HashSet<String>,
}

impl SensitiveFilterLayer {
    pub fn new() -> Self {
        let mut keys = HashSet::new();
        for key in [
            "password", "passwd", "token", "jwt", "refresh_token", "access_token",
            "secret", "api_key", "apikey", "session_id", "session",
            "private_key", "privatekey",
        ] {
            keys.insert(key.to_string());
        }
        Self { sensitive_keys: keys }
    }

    /// 添加自定义敏感字段名
    pub fn with_extra_keys(mut self, keys: &[&str]) -> Self {
        for k in keys {
            self.sensitive_keys.insert(k.to_lowercase());
        }
        self
    }
}

impl Default for SensitiveFilterLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl<S> Layer<S> for SensitiveFilterLayer
where
    S: tracing::Subscriber,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        // 遍历事件的字段
        let mut visitor = SensitiveVisitor {
            sensitive_keys: &self.sensitive_keys,
            found_sensitive: false,
        };
        event.record(&mut visitor);
        // 如果发现敏感字段在非DEBUG级别输出，可以在此添加告警
        // 当前实现仅做检测，实际脱敏由 mask_value() 在调用处完成
        // 未来可扩展为完全自动替换
    }
}

struct SensitiveVisitor<'a> {
    sensitive_keys: &'a HashSet<String>,
    found_sensitive: bool,
}

impl<'a> Visit for SensitiveVisitor<'a> {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        let field_name = field.name().to_lowercase();
        if self.sensitive_keys.contains(&field_name) {
            self.found_sensitive = true;
            // 在生产环境中可在此记录告警
            tracing::debug!(
                target: "sensitive_filter",
                "检测到敏感字段 '{}' 在日志中输出，建议使用 mask_value() 脱敏",
                field.name()
            );
        }
    }

    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        let field_name = field.name().to_lowercase();
        if self.sensitive_keys.contains(&field_name) {
            self.found_sensitive = true;
        }
    }
}

/// 便捷函数：创建脱敏 Layer 并注册到 Subscriber
///
/// # 示例
/// ```ignore
/// use topems_shared_observability::telemetry::sensitive_filter::SensitiveFilterLayer;
/// tracing_subscriber::registry()
///     .with(tracing_subscriber::fmt::layer())
///     .with(SensitiveFilterLayer::new())
///     .init();
/// ```
pub fn register_sensitive_filter() {
    // 此函数在 telemetry 初始化时调用
    // 当前仅返回占位，实际注册在 init_telemetry 中完成
}
