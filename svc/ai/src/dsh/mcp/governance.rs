//! 外部 MCP 工具治理层（Phase 2）——DSH 消费外部 MCP 的消毒与审计。
//!
//! Phase 1（POC）对外部工具输出默认透传，仅依赖 server 响应层（`server.rs`）
//! 的全局脱敏——但该脱敏只覆盖「DSH 作为 MCP server 响应 AI IDE」这一条路径，
//! orchestrator 直调 ToolRegistry 的内部推理路径不经 server 层。本模块在
//! 外部工具注册闭包内**就地**治理，双入口（orchestrator / server）均生效：
//!
//! 1. **source=external 标记**：注册描述前缀 `[external-mcp]`（server/tool 命名空间
//!    可回溯），审计事件统一携带 `source = "external"`。
//! 2. **结果消毒**：
//!    - 大小上限：文本超 `max_output_bytes`（默认 64 KiB）截断并追加 `[truncated]`，
//!      防不可信外部 server 无限输出。
//!    - 敏感字段脱敏：复用 [`super::security::SENSITIVE_FIELDS`] 清单（单一事实来源），
//!      递归掩码命中 key 的值为 `***REDACTED***`。
//!    - JSON 深度限制：超过 `max_json_depth`（默认 8）的嵌套以
//!      `***depth-limited***` 替换，防深层嵌套消耗。
//! 3. **审计与可观测指标**：每次调用 `tracing::info!`/`warn!` 结构化事件
//!   （event=`mcp.external.tool_call`，含 server/tool/status/duration_ms/output_bytes/
//!   redacted_fields/truncated），模块级原子计数器（calls_total/calls_failed/
//!   redacted_fields_total/truncated_total）供测试断言与将来 metrics 导出。

use std::sync::atomic::{AtomicU64, Ordering};

use serde_json::{json, Value};
use topems_shared_mcp::protocol::{McpContent, McpToolResult};

use super::security::SENSITIVE_FIELDS;

/// 外部工具文本输出默认大小上限（字节）
pub const DEFAULT_MAX_OUTPUT_BYTES: usize = 64 * 1024;
/// 外部工具 JSON 输出默认最大嵌套深度
pub const DEFAULT_MAX_JSON_DEPTH: usize = 8;

/// 消毒参数限制
#[derive(Debug, Clone, Copy)]
pub struct SanitizeLimits {
    /// 单个文本内容最大字节数（UTF-8 安全截断，按 char 边界）
    pub max_output_bytes: usize,
    /// JSON 最大嵌套深度
    pub max_json_depth: usize,
}

impl Default for SanitizeLimits {
    fn default() -> Self {
        Self {
            max_output_bytes: DEFAULT_MAX_OUTPUT_BYTES,
            max_json_depth: DEFAULT_MAX_JSON_DEPTH,
        }
    }
}

/// 消毒报告（审计事件与指标更新使用）
#[derive(Debug, Clone, Copy, Default)]
pub struct SanitizeReport {
    /// 被脱敏的敏感字段数
    pub redacted_fields: u64,
    /// 是否发生大小截断
    pub truncated: bool,
    /// 处理前字节数（本模块截断后回读长度，含标记）
    pub input_bytes: usize,
    /// 处理后字节数
    pub output_bytes: usize,
}

/// 外部工具调用审计事件（结构化日志字段）
#[derive(Debug)]
pub struct AuditEvent<'a> {
    pub server: &'a str,
    pub tool: &'a str,
    pub status: &'a str,
    pub duration_ms: u64,
    pub report: SanitizeReport,
}

/// 外部工具可观测指标快照
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct ExternalToolMetricsSnapshot {
    /// 累计调用次数（成功+失败）
    pub calls_total: u64,
    /// 累计失败次数
    pub calls_failed: u64,
    /// 累计脱敏字段数（返回路径）
    pub redacted_fields_total: u64,
    /// 累计截断次数
    pub truncated_total: u64,
    /// 累计出站调用携带的参数字段总数（脱敏前，含嵌套）
    pub outbound_args_total: u64,
    /// 累计出站剥离的敏感字段数（Phase 4 输入面脱敏）
    pub outbound_redacted_total: u64,
}

/// 模块级原子计数器（外部工具调用面）
static METRICS: ExternalToolMetrics = ExternalToolMetrics::new();

struct ExternalToolMetrics {
    calls_total: AtomicU64,
    calls_failed: AtomicU64,
    redacted_fields_total: AtomicU64,
    truncated_total: AtomicU64,
    outbound_args_total: AtomicU64,
    outbound_redacted_total: AtomicU64,
}

impl ExternalToolMetrics {
    const fn new() -> Self {
        Self {
            calls_total: AtomicU64::new(0),
            calls_failed: AtomicU64::new(0),
            redacted_fields_total: AtomicU64::new(0),
            truncated_total: AtomicU64::new(0),
            outbound_args_total: AtomicU64::new(0),
            outbound_redacted_total: AtomicU64::new(0),
        }
    }

    fn record_call(&self, ok: bool, redacted: u64, truncated: bool) {
        self.calls_total.fetch_add(1, Ordering::Relaxed);
        if !ok {
            self.calls_failed.fetch_add(1, Ordering::Relaxed);
        }
        if redacted > 0 {
            self.redacted_fields_total
                .fetch_add(redacted, Ordering::Relaxed);
        }
        if truncated {
            self.truncated_total.fetch_add(1, Ordering::Relaxed);
        }
    }

    fn record_outbound(&self, args_total: u64, redacted: u64) {
        self.outbound_args_total
            .fetch_add(args_total, Ordering::Relaxed);
        self.outbound_redacted_total
            .fetch_add(redacted, Ordering::Relaxed);
    }
}

/// 返回当前外部工具调用指标快照（测试断言 / 将来 metrics 导出）
pub fn metrics_snapshot() -> ExternalToolMetricsSnapshot {
    ExternalToolMetricsSnapshot {
        calls_total: METRICS.calls_total.load(Ordering::Relaxed),
        calls_failed: METRICS.calls_failed.load(Ordering::Relaxed),
        redacted_fields_total: METRICS.redacted_fields_total.load(Ordering::Relaxed),
        truncated_total: METRICS.truncated_total.load(Ordering::Relaxed),
        outbound_args_total: METRICS.outbound_args_total.load(Ordering::Relaxed),
        outbound_redacted_total: METRICS.outbound_redacted_total.load(Ordering::Relaxed),
    }
}

/// 出站输入消毒报告（Phase 4）
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct OutboundRedactReport {
    /// 脱敏前参数字段总数（含嵌套对象键）
    pub keys_total: u64,
    /// 被剥离的敏感字段数（整个键移除，不出网）
    pub redacted: u64,
}

/// 出站输入消毒：递归**剥离**命中 [`super::security::SENSITIVE_FIELDS`] 的键（整个键
/// 移除，绝不发送到外部 server），同时统计脱敏前字段总数供审计指标。
///
/// 与返回路径 [`sanitize_external_output`] 的占位脱敏不同：输入参数出网=业务数据外发
/// 第三方，敏感字段必须整体删除而非替换占位（占位仍向外部泄露字段存在性/形状）。
///
/// 返回（消毒后参数，报告）。
pub fn sanitize_external_input(value: &Value, max_depth: usize) -> (Value, OutboundRedactReport) {
    let (clean, redacted) = strip_sensitive(value, max_depth, 0);
    (
        clean,
        OutboundRedactReport {
            keys_total: count_keys(value, max_depth, 0),
            redacted,
        },
    )
}

/// 递归剥离敏感键（命中 → 不插入输出），返回（值，剥离计数）
fn strip_sensitive(value: &Value, max_depth: usize, depth: usize) -> (Value, u64) {
    if depth > max_depth {
        return (Value::String("***depth-limited***".to_string()), 0);
    }
    match value {
        Value::Object(map) => {
            let mut out = serde_json::Map::with_capacity(map.len());
            let mut redacted = 0u64;
            for (k, v) in map {
                if SENSITIVE_FIELDS.contains(&k.as_str()) {
                    redacted += 1;
                    continue; // 整个键移除，不出网
                }
                let (sv, sr) = strip_sensitive(v, max_depth, depth + 1);
                redacted += sr;
                out.insert(k.clone(), sv);
            }
            (Value::Object(out), redacted)
        }
        Value::Array(arr) => {
            let mut out = Vec::with_capacity(arr.len());
            let mut redacted = 0u64;
            for v in arr {
                let (sv, sr) = strip_sensitive(v, max_depth, depth + 1);
                redacted += sr;
                out.push(sv);
            }
            (Value::Array(out), redacted)
        }
        other => (other.clone(), 0),
    }
}

/// 递归统计 JSON 对象键总数（脱敏前，含嵌套；数组不计键）
fn count_keys(value: &Value, max_depth: usize, depth: usize) -> u64 {
    if depth > max_depth {
        return 0;
    }
    match value {
        Value::Object(map) => {
            let mut n = 0u64;
            for v in map.values() {
                n += count_keys(v, max_depth, depth + 1);
            }
            n + u64::try_from(map.len()).unwrap_or(u64::MAX)
        }
        Value::Array(arr) => arr
            .iter()
            .map(|v| count_keys(v, max_depth, depth + 1))
            .sum(),
        _ => 0,
    }
}

/// 记录一次出站调用（输入面脱敏后调用）的审计指标。
///
/// 语义：`args_total` 为脱敏前参数字段总数，`redacted` 为被剥离的敏感字段数，
/// 恒有 `redacted ≤ args_total`，可审计剥离比例。
pub fn record_outbound_call(args_total: u64, redacted: u64) {
    METRICS.record_outbound(args_total, redacted);
}

/// 对外部工具结果就地消毒（大小上限 + 敏感字段脱敏 + JSON 深度限制）。
///
/// 返回（消毒后结果，报告）。不改变 `is_error` 语义；仅处理文本内容。
pub fn sanitize_external_output(
    result: McpToolResult,
    limits: &SanitizeLimits,
) -> (McpToolResult, SanitizeReport) {
    let mut report = SanitizeReport::default();
    let mut sanitized_content = Vec::with_capacity(result.content.len());

    for content in result.content {
        match content {
            McpContent::Text { text } => {
                let (out_text, redacted, truncated) = sanitize_text(&text, limits);
                report.redacted_fields += redacted;
                report.truncated = report.truncated || truncated;
                report.input_bytes += out_text.len();
                sanitized_content.push(McpContent::Text { text: out_text });
            }
            other => sanitized_content.push(other),
        }
    }

    report.output_bytes = sanitized_content
        .iter()
        .map(|c| match c {
            McpContent::Text { text } => text.len(),
            other => format!("{other:?}").len(),
        })
        .sum();

    (
        McpToolResult {
            content: sanitized_content,
            is_error: result.is_error,
        },
        report,
    )
}

/// 单条文本：JSON 脱敏/深度限制 + 大小截断。
///
/// 路径选择：
/// 1. 原始文本为合法 JSON → 解析 → 递归脱敏 → 若序列化超限，
///    做**结构截断**（超长字符串值收缩 + 顶层 `__truncated: true` 标记），
///    结果保持合法 JSON；
/// 2. 非 JSON 文本 → UTF-8 安全截断（按 char 边界）+ 尾部 `[truncated]` 标记。
fn sanitize_text(text: &str, limits: &SanitizeLimits) -> (String, u64, bool) {
    // JSON 优先路径（先解析再治理，避免截断破坏结构）
    if let Ok(value) = serde_json::from_str::<Value>(text) {
        let (sanitized, redacted) = sanitize_value(&value, limits.max_json_depth, 0);
        let serialized = sanitized.to_string();
        if serialized.len() > limits.max_output_bytes {
            let (out, _) = structural_truncate(&sanitized);
            return (out, redacted, true);
        }
        return (serialized, redacted, false);
    }

    // 非 JSON 路径：纯截断 + 标记
    if text.len() > limits.max_output_bytes {
        let bounded = truncate_chars(text, limits.max_output_bytes);
        return (format!("{bounded}[truncated]"), 0, true);
    }
    (text.to_string(), 0, false)
}

/// 结构截断：超长字符串值收缩为占位，顶层注入 `__truncated: true`，
/// 结果保持合法 JSON（object 注入字段；array/其他包装为 `{"__truncated":true,"data":..}`）。
fn structural_truncate(value: &Value) -> (String, bool) {
    let trimmed = shrink_long_strings(value);
    let out = match trimmed {
        Value::Object(mut map) => {
            map.insert(
                "__truncated".to_string(),
                Value::String("***truncated***".to_string()),
            );
            serde_json::Value::Object(map).to_string()
        }
        other => serde_json::json!({
            "__truncated": true,
            "data": other,
        })
        .to_string(),
    };
    (out, true)
}

/// 递归把超长字符串值（> budget 的 1/4）收缩为占位，控制最终体积
fn shrink_long_strings(value: &Value) -> Value {
    const BUDGET: usize = 16 * 1024;
    match value {
        Value::String(s) if s.len() > BUDGET / 4 => Value::String("***truncated***".to_string()),
        Value::Object(map) => {
            let mut out = serde_json::Map::with_capacity(map.len());
            for (k, v) in map {
                out.insert(k.clone(), shrink_long_strings(v));
            }
            Value::Object(out)
        }
        Value::Array(arr) => Value::Array(arr.iter().map(shrink_long_strings).collect()),
        other => other.clone(),
    }
}

/// 递归脱敏 JSON 值（命中 SENSITIVE_FIELDS → `***REDACTED***`），返回（值，脱敏计数）
fn sanitize_value(value: &Value, max_depth: usize, depth: usize) -> (Value, u64) {
    if depth > max_depth {
        return (Value::String("***depth-limited***".to_string()), 0);
    }
    match value {
        Value::Object(map) => {
            let mut out = serde_json::Map::with_capacity(map.len());
            let mut redacted = 0u64;
            for (k, v) in map {
                if SENSITIVE_FIELDS.contains(&k.as_str()) {
                    out.insert(k.clone(), Value::String("***REDACTED***".to_string()));
                    redacted += 1;
                } else {
                    let (sv, sr) = sanitize_value(v, max_depth, depth + 1);
                    redacted += sr;
                    out.insert(k.clone(), sv);
                }
            }
            (Value::Object(out), redacted)
        }
        Value::Array(arr) => {
            let mut out = Vec::with_capacity(arr.len());
            let mut redacted = 0u64;
            for v in arr {
                let (sv, sr) = sanitize_value(v, max_depth, depth + 1);
                redacted += sr;
                out.push(sv);
            }
            (Value::Array(out), redacted)
        }
        other => (other.clone(), 0),
    }
}

/// 按 char 边界截断到最多 max_bytes（结果长度可能略超上限一个多字节字符，
/// 但保证不切断多字节序列）。
fn truncate_chars(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut out = String::new();
    let mut budget = max_bytes;
    for c in s.chars() {
        let len = c.len_utf8();
        if budget < len {
            break;
        }
        out.push(c);
        budget -= len;
    }
    out
}

/// 记录一次外部工具调用审计事件并更新指标。
///
/// 结构化日志字段（不含参数原文，参数可能含敏感信息）：
/// `event=mcp.external.tool_call source=external server=.. tool=.. status=ok|error
///  duration_ms=.. output_bytes=.. redacted_fields=.. truncated=..`
pub fn audit_external_call(event: &AuditEvent<'_>) {
    let ok = event.status == "ok";
    METRICS.record_call(ok, event.report.redacted_fields, event.report.truncated);
    if ok {
        tracing::info!(
            event = "mcp.external.tool_call",
            source = "external",
            server = event.server,
            tool = event.tool,
            status = event.status,
            duration_ms = event.duration_ms,
            output_bytes = event.report.output_bytes,
            redacted_fields = event.report.redacted_fields,
            truncated = event.report.truncated,
            "外部 MCP 工具调用完成"
        );
    } else {
        tracing::warn!(
            event = "mcp.external.tool_call",
            source = "external",
            server = event.server,
            tool = event.tool,
            status = event.status,
            duration_ms = event.duration_ms,
            output_bytes = event.report.output_bytes,
            redacted_fields = event.report.redacted_fields,
            truncated = event.report.truncated,
            "外部 MCP 工具调用失败"
        );
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn text_result(s: &str) -> McpToolResult {
        McpToolResult {
            content: vec![McpContent::Text {
                text: s.to_string(),
            }],
            is_error: None,
        }
    }

    #[test]
    fn redacts_nested_sensitive_fields() {
        let raw = r#"{"ok":true,"data":{"user":"u1","token":"sk-test-abc","nested":{"password":"p1","safe":"v"}}}"#;
        let (out, report) = sanitize_external_output(text_result(raw), &SanitizeLimits::default());
        let text = match &out.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => panic!("应为文本"),
        };
        assert!(text.contains("***REDACTED***"));
        assert!(!text.contains("sk-test-abc"));
        assert!(!text.contains("p1"));
        assert!(text.contains("\"user\":\"u1\""));
        assert!(text.contains("\"safe\":\"v\""));
        assert_eq!(report.redacted_fields, 2);
    }

    #[test]
    fn truncates_oversized_text() {
        let big = "x".repeat(70 * 1024);
        let limits = SanitizeLimits {
            max_output_bytes: 1024,
            ..SanitizeLimits::default()
        };
        let (out, report) = sanitize_external_output(text_result(&big), &limits);
        let text = match &out.content[0] {
            McpContent::Text { text } => text,
            _ => panic!("应为文本"),
        };
        assert!(report.truncated);
        assert!(text.len() <= 1024 + 16);
        assert!(text.ends_with("[truncated]"));
    }

    #[test]
    fn json_truncation_keeps_valid_json() {
        let big = format!(r#"{{"ok":true,"data":"{}"}}"#, "y".repeat(2048));
        let limits = SanitizeLimits {
            max_output_bytes: 128,
            ..SanitizeLimits::default()
        };
        let (out, report) = sanitize_external_output(text_result(&big), &limits);
        let text = match &out.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => panic!("应为文本"),
        };
        assert!(report.truncated);
        // 顶层注入 __truncated 标记，且保持合法 JSON
        assert!(text.contains("__truncated"));
        assert!(serde_json::from_str::<Value>(&text).is_ok());
    }

    #[test]
    fn limits_deep_nesting() {
        let deep = format!(
            r#"{{"a":{}}}"#,
            format_args!("{}{}{}", "{\"b\":".repeat(32), "1", "}".repeat(32))
        );
        let limits = SanitizeLimits {
            max_json_depth: 4,
            ..SanitizeLimits::default()
        };
        let (out, report) = sanitize_external_output(text_result(&deep), &limits);
        let text = match &out.content[0] {
            McpContent::Text { text } => text,
            _ => panic!("应为文本"),
        };
        assert_eq!(report.redacted_fields, 0);
        assert!(text.contains("***depth-limited***"));
        assert!(serde_json::from_str::<Value>(text).is_ok());
    }

    #[test]
    fn non_json_text_passes_with_truncation_only() {
        let plain = "plain text no json";
        let (out, report) =
            sanitize_external_output(text_result(plain), &SanitizeLimits::default());
        let text = match &out.content[0] {
            McpContent::Text { text } => text,
            _ => panic!("应为文本"),
        };
        assert_eq!(text, plain);
        assert_eq!(report.redacted_fields, 0);
        assert!(!report.truncated);
    }

    #[test]
    fn metrics_accumulate_across_calls() {
        // 单测试内顺序执行（模块级 static 计数器，并行测试会互相污染）
        let before = metrics_snapshot();
        let raw = r#"{"token":"sk-x"}"#;
        let (out, report) = sanitize_external_output(text_result(raw), &SanitizeLimits::default());
        audit_external_call(&AuditEvent {
            server: "toy",
            tool: "echo_secret",
            status: "ok",
            duration_ms: 3,
            report,
        });
        audit_external_call(&AuditEvent {
            server: "toy",
            tool: "boom",
            status: "error",
            duration_ms: 5,
            report: SanitizeReport::default(),
        });
        let after = metrics_snapshot();
        assert_eq!(after.calls_total, before.calls_total + 2);
        assert_eq!(after.calls_failed, before.calls_failed + 1);
        assert_eq!(
            after.redacted_fields_total,
            before.redacted_fields_total + 1
        );
        let _ = out;
    }

    #[test]
    fn input_sanitize_strips_sensitive_keys_entirely() {
        // 顶层 + 嵌套 + 数组内敏感键整体剥离；非敏感键保留
        let raw = json!({
            "query": "订单",
            "limit": 5,
            "token": "sk-top-level",
            "filter": {
                "status": "open",
                "password": "p@ss",
                "nested": { "api_key": "k", "keep": "v" }
            },
            "tags": [ { "name": "a", "secret": "s" }, "plain" ]
        });
        let (clean, report) = sanitize_external_input(&raw, DEFAULT_MAX_JSON_DEPTH);
        assert_eq!(
            report.redacted, 4,
            "token/password/api_key/secret 共 4 个敏感键剥离"
        );
        assert_eq!(report.keys_total, 12, "脱敏前对象键总数（5+3+2+2，含嵌套）");
        let obj = clean.as_object().expect("应为对象");
        assert!(!obj.contains_key("token"), "顶层 token 应移除");
        assert!(obj.contains_key("query"));
        let filter = obj["filter"].as_object().expect("filter 应为对象");
        assert!(!filter.contains_key("password"), "嵌套 password 应移除");
        assert!(filter.contains_key("status"));
        assert!(filter["nested"]
            .as_object()
            .expect("nested")
            .contains_key("keep"));
        assert!(!filter["nested"]
            .as_object()
            .expect("nested")
            .contains_key("api_key"));
        let tags = obj["tags"].as_array().expect("tags 应为数组");
        assert!(
            !tags[0].as_object().expect("tag").contains_key("secret"),
            "数组内 secret 应移除"
        );
        assert_eq!(tags[1], Value::String("plain".to_string()));
    }

    #[test]
    fn input_sanitize_no_sensitive_fields_unchanged() {
        let raw = json!({ "query": "x", "limit": 3 });
        let (clean, report) = sanitize_external_input(&raw, DEFAULT_MAX_JSON_DEPTH);
        assert_eq!(report.redacted, 0);
        assert_eq!(report.keys_total, 2);
        assert_eq!(clean, raw);
    }

    #[test]
    fn input_sanitize_empty_and_scalars() {
        let (c1, r1) = sanitize_external_input(&Value::Null, DEFAULT_MAX_JSON_DEPTH);
        assert_eq!(r1.keys_total, 0);
        assert_eq!(c1, Value::Null);
        let (_, r2) = sanitize_external_input(&json!([]), DEFAULT_MAX_JSON_DEPTH);
        assert_eq!(r2.keys_total, 0);
    }

    #[test]
    fn outbound_metrics_record_args_and_redacted() {
        let before = metrics_snapshot();
        record_outbound_call(12, 4);
        let after = metrics_snapshot();
        assert_eq!(after.outbound_args_total, before.outbound_args_total + 12);
        assert_eq!(
            after.outbound_redacted_total,
            before.outbound_redacted_total + 4
        );
    }
}
