//! DSH Layer 1 标准化模块
//!
//! K5 精简（2026-10-14）：原 1,084 行统一错误码/响应格式模块（ErrorCategory/ErrorCode/StandardError/StandardResponse/ResponseMeta 等）
//! 经 grep 全仓核验外部消费 = 0，已删除。仅保留 `generate_trace_id()`（被 business_copilot 测试代码调用）。
//! 如需统一错误码体系，建议复用 topems_shared_core::TopemsError（生产已在用），勿在此重建。

/// 生成追踪 ID（被 business_copilot 测试代码消费）
pub fn generate_trace_id() -> String {
    format!("trace_{}", uuid::Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_trace_id() {
        let trace_id = generate_trace_id();
        assert!(trace_id.starts_with("trace_"));
    }
}
