//! Integration shared utilities
//!
//! Pure synchronous helper functions for the integration domain:
//! event idempotency, retry backoff, field mapping validation,
//! currency precision, dead-letter queue judgement, etc.

use std::collections::HashSet;

/// Integration-domain error variants.
///
/// Designed as a small, focused enum that captures cross-cutting
/// failure modes shared by the conversion rules engine, sync retry
/// layer, and event bus helpers. All variants are cheap to construct
/// and surface human-readable context via [`std::error::Error`].
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum IntegrationError {
    #[error("Invalid event id: {0}")]
    InvalidEventId(String),

    #[error("Duplicate event key: {key}")]
    DuplicateEventKey { key: String },

    #[error("Rule not found: {0}")]
    RuleNotFound(String),

    #[error("Sync conflict: {0}")]
    SyncConflict(String),

    #[error("Invalid mapping: {0}")]
    InvalidMapping(String),

    #[error("Retry exhausted: {attempts} attempts")]
    RetryExhausted { attempts: u32 },

    #[error("Circuit breaker open")]
    CircuitBreakerOpen,

    #[error("Conversion failed: {0}")]
    ConversionFailed(String),
}

/// Compute an idempotency key for an integration event.
///
/// The key is the stable concatenation of `source`, `entity` and
/// `record_id` joined by `":"`. Callers can use it to deduplicate
/// events that originate from the same source record.
pub fn compute_event_idempotency_key(source: &str, entity: &str, record_id: &str) -> String {
    format!("{source}:{entity}:{record_id}")
}

/// Detect whether `current_ts` falls inside a duplicate window.
///
/// `timestamps` is the list of previously observed timestamps (in
/// milliseconds since the Unix epoch). The function returns `true`
/// when at least one previous timestamp is within `[current_ts -
/// window_ms, current_ts]`. An empty slice or zero `window_ms` is
/// never considered a duplicate.
pub fn is_duplicate_event(timestamps: &[u64], window_ms: u64, current_ts: u64) -> bool {
    if window_ms == 0 {
        return false;
    }
    let lower = current_ts.saturating_sub(window_ms);
    timestamps
        .iter()
        .any(|ts| *ts >= lower && *ts <= current_ts)
}

/// Compute exponential backoff delay.
///
/// `delay_ms = base_ms * exponential_base^(attempt - 1)`, capped by
/// `max_ms`. `attempt` is 1-indexed (the first retry is attempt `1`),
/// and `attempt == 0` is treated as attempt `1` to avoid `pow(0, -1)`.
pub fn compute_retry_backoff(
    attempt: u32,
    base_ms: u64,
    max_ms: u64,
    exponential_base: u32,
) -> u64 {
    let n = if attempt == 0 { 1 } else { attempt };
    let exp = (n - 1) as u32;
    let factor = exponential_base.saturating_pow(exp);
    let delay = base_ms.saturating_mul(factor as u64);
    delay.min(max_ms)
}

/// Add symmetric random-like jitter to a delay value.
///
/// `jitter_pct` is a fraction in `[0.0, 1.0]` (values outside the
/// range are clamped). The returned value is `delay_ms + delay_ms *
/// jitter_pct`, rounded down, never exceeding `u64::MAX`. The
/// function is deterministic: the same inputs always produce the
/// same output, which keeps the unit tests stable.
pub fn add_jitter(delay_ms: u64, jitter_pct: f64) -> u64 {
    let pct = jitter_pct.clamp(0.0, 1.0);
    let extra = (delay_ms as f64 * pct) as u64;
    delay_ms.saturating_add(extra)
}

/// Validate a single source->target field mapping.
///
/// Returns `Ok(())` when both names are non-empty, start with an
/// ASCII letter or underscore, and only contain ASCII letters,
/// digits, underscores or dots. Otherwise returns an
/// [`IntegrationError::InvalidMapping`] describing the failure.
pub fn validate_field_mapping(
    source_field: &str,
    target_field: &str,
) -> Result<(), IntegrationError> {
    fn check(name: &str, label: &str) -> Result<(), IntegrationError> {
        if name.is_empty() {
            return Err(IntegrationError::InvalidMapping(format!(
                "{label} field is empty"
            )));
        }
        let first = name.chars().next().unwrap();
        if !(first.is_ascii_alphabetic() || first == '_') {
            return Err(IntegrationError::InvalidMapping(format!(
                "{label} field '{name}' must start with a letter or underscore"
            )));
        }
        if !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.')
        {
            return Err(IntegrationError::InvalidMapping(format!(
                "{label} field '{name}' contains invalid characters"
            )));
        }
        Ok(())
    }
    check(source_field, "source")?;
    check(target_field, "target")?;
    Ok(())
}

/// Convert an amount between currency precision scales.
///
/// `from_precision` is the number of decimals the amount is currently
/// expressed in; `to_precision` is the desired number of decimals.
/// The conversion factor is `10^(to - from)`. Positive differences
/// scale the amount up, negative differences scale it down. The
/// result is rounded to the nearest representable value.
pub fn convert_currency_precision(amount: f64, from_precision: u8, to_precision: u8) -> f64 {
    let diff = to_precision as i32 - from_precision as i32;
    if diff == 0 {
        return amount;
    }
    let factor = 10f64.powi(diff);
    amount * factor
}

/// Report which entries of `required` are missing from `provided`.
///
/// Returns the list of required field names (preserving the order of
/// `required`) that do not appear in `provided`. Comparison is
/// case-sensitive and trims nothing.
pub fn check_mapping_completeness(required: &[&str], provided: &[&str]) -> Vec<String> {
    let set: HashSet<&str> = provided.iter().copied().collect();
    required
        .iter()
        .filter(|r| !set.contains(*r))
        .map(|s| s.to_string())
        .collect()
}

/// Sort events by their timestamp in ascending order.
///
/// Each event is a `(id, timestamp)` tuple where `timestamp` is in
/// milliseconds since the Unix epoch. Sorting is stable and uses
/// `timestamp` as the only sort key.
pub fn sort_events_by_timestamp(events: &mut [(&str, u64)]) {
    events.sort_by_key(|(_, ts)| *ts);
}

/// Determine whether a record should be routed to the dead-letter queue.
///
/// Returns `true` when `attempts >= max_retries`. `max_retries == 0`
/// is treated as "no retries allowed", so any attempt count greater
/// than zero triggers the dead-letter path.
pub fn is_dead_letter(attempts: u32, max_retries: u32) -> bool {
    attempts >= max_retries
}

/// Merge two conflicting sync payloads according to a strategy.
///
/// - `"local_wins"`  -> returns `local`
/// - `"remote_wins"` -> returns `remote`
/// - `"merge"`       -> returns `local|remote`
/// - any other value -> returns `local|remote` and falls back to merge
pub fn merge_sync_conflicts(local: &str, remote: &str, strategy: &str) -> String {
    match strategy {
        "local_wins" => local.to_string(),
        "remote_wins" => remote.to_string(),
        _ => format!("{local}|{remote}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- compute_event_idempotency_key (5 tests) ----

    #[test]
    fn test_idempotency_key_basic_concat() {
        let key = compute_event_idempotency_key("erp", "sales_order", "rec-001");
        assert_eq!(key, "erp:sales_order:rec-001");
    }

    #[test]
    fn test_idempotency_key_empty_segments() {
        let key = compute_event_idempotency_key("", "", "");
        assert_eq!(key, "::");
    }

    #[test]
    fn test_idempotency_key_order_sensitive() {
        let a = compute_event_idempotency_key("erp", "sales", "1");
        let b = compute_event_idempotency_key("sales", "erp", "1");
        assert_ne!(a, b);
    }

    #[test]
    fn test_idempotency_key_deterministic() {
        let k1 = compute_event_idempotency_key("mes", "wo", "abc");
        let k2 = compute_event_idempotency_key("mes", "wo", "abc");
        assert_eq!(k1, k2);
    }

    #[test]
    fn test_idempotency_key_with_uuid_like_record() {
        let key = compute_event_idempotency_key(
            "wms",
            "inventory",
            "550e8400-e29b-41d4-a716-446655440000",
        );
        assert_eq!(key, "wms:inventory:550e8400-e29b-41d4-a716-446655440000");
    }

    // ---- is_duplicate_event (5 tests) ----

    #[test]
    fn test_is_duplicate_empty_history() {
        assert!(!is_duplicate_event(&[], 1_000, 10_000));
    }

    #[test]
    fn test_is_duplicate_within_window() {
        assert!(is_duplicate_event(&[9_500], 1_000, 10_000));
    }

    #[test]
    fn test_is_duplicate_outside_window() {
        assert!(!is_duplicate_event(&[8_000], 1_000, 10_000));
    }

    #[test]
    fn test_is_duplicate_zero_window_never_dup() {
        assert!(!is_duplicate_event(&[10_000], 0, 10_000));
    }

    #[test]
    fn test_is_duplicate_multiple_timestamps() {
        let prev = vec![8_000, 9_500, 11_500];
        assert!(is_duplicate_event(&prev, 1_000, 10_000));
        assert!(!is_duplicate_event(&prev, 100, 9_001));
    }

    // ---- compute_retry_backoff (5 tests) ----

    #[test]
    fn test_backoff_first_attempt() {
        assert_eq!(compute_retry_backoff(1, 100, 10_000, 2), 100);
    }

    #[test]
    fn test_backoff_growth() {
        assert_eq!(compute_retry_backoff(2, 100, 10_000, 2), 200);
        assert_eq!(compute_retry_backoff(3, 100, 10_000, 2), 400);
    }

    #[test]
    fn test_backoff_capped_by_max() {
        assert_eq!(compute_retry_backoff(20, 100, 500, 2), 500);
    }

    #[test]
    fn test_backoff_zero_attempt_treated_as_one() {
        assert_eq!(compute_retry_backoff(0, 100, 10_000, 2), 100);
    }

    #[test]
    fn test_backoff_base_three() {
        assert_eq!(compute_retry_backoff(3, 1, 1_000, 3), 9);
    }

    // ---- add_jitter (4 tests) ----

    #[test]
    fn test_jitter_zero_pct() {
        assert_eq!(add_jitter(100, 0.0), 100);
    }

    #[test]
    fn test_jitter_full_pct() {
        assert_eq!(add_jitter(100, 1.0), 200);
    }

    #[test]
    fn test_jitter_half_pct() {
        assert_eq!(add_jitter(200, 0.5), 300);
    }

    #[test]
    fn test_jitter_clamps_above_one() {
        assert_eq!(add_jitter(100, 5.0), 200);
    }

    // ---- validate_field_mapping (5 tests) ----

    #[test]
    fn test_validate_mapping_ok() {
        assert!(validate_field_mapping("order_number", "target_order").is_ok());
    }

    #[test]
    fn test_validate_mapping_underscore_and_dot_ok() {
        assert!(validate_field_mapping("_order.id", "target.id").is_ok());
    }

    #[test]
    fn test_validate_mapping_empty_source_rejected() {
        let err = validate_field_mapping("", "target").unwrap_err();
        assert!(matches!(err, IntegrationError::InvalidMapping(_)));
    }

    #[test]
    fn test_validate_mapping_digit_start_rejected() {
        let err = validate_field_mapping("1field", "target").unwrap_err();
        assert!(matches!(err, IntegrationError::InvalidMapping(_)));
    }

    #[test]
    fn test_validate_mapping_invalid_char_rejected() {
        let err = validate_field_mapping("order name", "target").unwrap_err();
        assert!(matches!(err, IntegrationError::InvalidMapping(_)));
    }

    // ---- convert_currency_precision (5 tests) ----

    #[test]
    fn test_currency_same_precision_noop() {
        let v = convert_currency_precision(123.45, 2, 2);
        assert!((v - 123.45).abs() < f64::EPSILON);
    }

    #[test]
    fn test_currency_scale_up() {
        // 2 -> 4 means multiply by 100
        let v = convert_currency_precision(1.23, 2, 4);
        assert!((v - 123.0).abs() < 1e-9);
    }

    #[test]
    fn test_currency_scale_down() {
        // 4 -> 2 means divide by 100
        let v = convert_currency_precision(12345.0, 4, 2);
        assert!((v - 123.45).abs() < 1e-9);
    }

    #[test]
    fn test_currency_zero_amount() {
        let v = convert_currency_precision(0.0, 2, 8);
        assert_eq!(v, 0.0);
    }

    #[test]
    fn test_currency_negative_amount() {
        let v = convert_currency_precision(-1.5, 2, 3);
        assert!((v - (-15.0)).abs() < 1e-9);
    }

    // ---- check_mapping_completeness (4 tests) ----

    #[test]
    fn test_completeness_all_present() {
        let missing = check_mapping_completeness(&["a", "b"], &["a", "b"]);
        assert!(missing.is_empty());
    }

    #[test]
    fn test_completeness_one_missing() {
        let missing = check_mapping_completeness(&["a", "b", "c"], &["a", "c"]);
        assert_eq!(missing, vec!["b".to_string()]);
    }

    #[test]
    fn test_completeness_all_missing() {
        let missing = check_mapping_completeness(&["a", "b"], &[]);
        assert_eq!(missing.len(), 2);
    }

    #[test]
    fn test_completeness_preserves_order() {
        let missing = check_mapping_completeness(&["z", "y", "x"], &["y"]);
        assert_eq!(missing, vec!["z".to_string(), "x".to_string()]);
    }

    // ---- sort_events_by_timestamp (4 tests) ----

    #[test]
    fn test_sort_empty() {
        let mut events: [(&str, u64); 0] = [];
        sort_events_by_timestamp(&mut events);
        assert!(events.is_empty());
    }

    #[test]
    fn test_sort_already_sorted() {
        let mut events = [("a", 1), ("b", 2), ("c", 3)];
        sort_events_by_timestamp(&mut events);
        assert_eq!(events[0].0, "a");
        assert_eq!(events[2].0, "c");
    }

    #[test]
    fn test_sort_reverse_order() {
        let mut events = [("c", 3), ("a", 1), ("b", 2)];
        sort_events_by_timestamp(&mut events);
        assert_eq!(events[0].0, "a");
        assert_eq!(events[1].0, "b");
        assert_eq!(events[2].0, "c");
    }

    #[test]
    fn test_sort_dedup_not_required() {
        // duplicates keep their relative order via stable sort
        let mut events = [("a", 5), ("b", 5), ("c", 5)];
        sort_events_by_timestamp(&mut events);
        assert_eq!(events[0].0, "a");
        assert_eq!(events[1].0, "b");
    }

    // ---- is_dead_letter (4 tests) ----

    #[test]
    fn test_dead_letter_below_max() {
        assert!(!is_dead_letter(2, 5));
    }

    #[test]
    fn test_dead_letter_at_max() {
        assert!(is_dead_letter(5, 5));
    }

    #[test]
    fn test_dead_letter_above_max() {
        assert!(is_dead_letter(6, 5));
    }

    #[test]
    fn test_dead_letter_zero_max_zero_attempts() {
        // 0 >= 0 is true -> treat as dead letter immediately
        assert!(is_dead_letter(0, 0));
    }

    // ---- merge_sync_conflicts (4 tests) ----

    #[test]
    fn test_merge_local_wins() {
        assert_eq!(
            merge_sync_conflicts("local", "remote", "local_wins"),
            "local"
        );
    }

    #[test]
    fn test_merge_remote_wins() {
        assert_eq!(
            merge_sync_conflicts("local", "remote", "remote_wins"),
            "remote"
        );
    }

    #[test]
    fn test_merge_strategy_merge() {
        assert_eq!(
            merge_sync_conflicts("local", "remote", "merge"),
            "local|remote"
        );
    }

    #[test]
    fn test_merge_unknown_strategy_falls_back_to_merge() {
        assert_eq!(merge_sync_conflicts("L", "R", "unknown_strategy"), "L|R");
    }

    // ---- IntegrationError display (2 tests) ----

    #[test]
    fn test_integration_error_display_invalid_event_id() {
        let err = IntegrationError::InvalidEventId("abc".to_string());
        assert_eq!(err.to_string(), "Invalid event id: abc");
    }

    #[test]
    fn test_integration_error_display_circuit_breaker_open() {
        let err = IntegrationError::CircuitBreakerOpen;
        assert_eq!(err.to_string(), "Circuit breaker open");
    }

    #[test]
    fn test_integration_error_display_duplicate_event_key() {
        let err = IntegrationError::DuplicateEventKey {
            key: "k1".to_string(),
        };
        assert_eq!(err.to_string(), "Duplicate event key: k1");
    }

    #[test]
    fn test_integration_error_display_retry_exhausted() {
        let err = IntegrationError::RetryExhausted { attempts: 7 };
        assert_eq!(err.to_string(), "Retry exhausted: 7 attempts");
    }
}

// ============================================================================
// Integration 扩展纯函数：规则引擎优先级 / 事件时间窗 / FSM / 币种等
// ============================================================================

/// 规则优先级比较：返回 Ordering::Less 表示 `a` 优先级高于 `b`（越小越先执行）。
///
/// 支持 1..=u16::MAX，0 视为非法优先级（返回 Err）。
pub fn compare_rule_priority(a: u16, b: u16) -> Result<std::cmp::Ordering, IntegrationError> {
    if a == 0 {
        return Err(IntegrationError::RuleNotFound(format!(
            "priority a must be >= 1, got 0"
        )));
    }
    if b == 0 {
        return Err(IntegrationError::RuleNotFound(format!(
            "priority b must be >= 1, got 0"
        )));
    }
    Ok(a.cmp(&b))
}

/// 判断当前时间是否落在事件处理时间窗内（按小时段，如 9-17 表示白天窗口）。
///
/// `hour_of_day` ∈ [0, 24)，`start_hour..end_hour` 为半开区间，若 start == end
/// 视为全天开放；若 start > end 则表示跨午夜窗口（如 22..6 表示 22:00~06:00）。
pub fn is_within_time_window(
    hour_of_day: u8,
    start_hour: u8,
    end_hour: u8,
) -> Result<bool, IntegrationError> {
    if hour_of_day >= 24 {
        return Err(IntegrationError::InvalidMapping(format!(
            "hour_of_day must be < 24, got {hour_of_day}"
        )));
    }
    if start_hour >= 24 || end_hour >= 24 {
        return Err(IntegrationError::InvalidMapping(format!(
            "window hours must be < 24, got start={start_hour} end={end_hour}"
        )));
    }
    if start_hour == end_hour {
        return Ok(true);
    }
    Ok(if start_hour < end_hour {
        hour_of_day >= start_hour && hour_of_day < end_hour
    } else {
        // 跨午夜：[start, 24) ∪ [0, end)
        hour_of_day >= start_hour || hour_of_day < end_hour
    })
}

/// 字段类型转换：将字符串值按目标类型标识转换，结果以 JSON 值形式返回。
///
/// 支持的 `target_type`：`"string"` / `"int"` / `"float"` / `"bool"` / `"datetime_iso"`。
pub fn coerce_field_type(
    value: &str,
    target_type: &str,
) -> Result<serde_json::Value, IntegrationError> {
    use serde_json::{json, Value};
    match target_type {
        "string" => Ok(Value::String(value.to_string())),
        "int" => {
            let n: i64 = value
                .parse()
                .map_err(|e| IntegrationError::ConversionFailed(format!("int parse: {e}")))?;
            Ok(json!(n))
        }
        "float" => {
            let n: f64 = value
                .parse()
                .map_err(|e| IntegrationError::ConversionFailed(format!("float parse: {e}")))?;
            Ok(json!(n))
        }
        "bool" => match value.to_ascii_lowercase().as_str() {
            "true" | "1" | "yes" | "y" | "on" => Ok(Value::Bool(true)),
            "false" | "0" | "no" | "n" | "off" => Ok(Value::Bool(false)),
            other => Err(IntegrationError::ConversionFailed(format!(
                "bool parse: unknown value '{other}'"
            ))),
        },
        "datetime_iso" => {
            if chrono::DateTime::parse_from_rfc3339(value).is_ok() {
                Ok(Value::String(value.to_string()))
            } else {
                Err(IntegrationError::ConversionFailed(format!(
                    "datetime_iso parse: '{value}'"
                )))
            }
        }
        other => Err(IntegrationError::InvalidMapping(format!(
            "unknown target_type: {other}"
        ))),
    }
}

/// 计算事件的「顺序」版本号：如果 `new_version` 严格大于等于当前返回
/// `Ok(new_version)`，否则返回 [`IntegrationError::SyncConflict`] 描述冲突。
pub fn resolve_event_version(
    current_version: u64,
    new_version: u64,
) -> Result<u64, IntegrationError> {
    if new_version < current_version {
        return Err(IntegrationError::SyncConflict(format!(
            "stale event version: new={new_version} < current={current_version}"
        )));
    }
    Ok(new_version)
}

/// 估算死信队列需要多少存储空间（每条消息占用的记录条数）。
///
/// 简化模型：`total_events × failed_ratio × max_retries + dead_letter_buffer`。
/// 输入任何非有限数或负数都会返回 [`IntegrationError::OutOfRange`]（通过 InvalidMapping 模拟）。
pub fn estimate_dead_letter_storage(
    total_events: u64,
    failed_ratio: f64,
    max_retries: u32,
    buffer: u64,
) -> Result<u64, IntegrationError> {
    if !(0.0..=1.0).contains(&failed_ratio) {
        return Err(IntegrationError::InvalidMapping(format!(
            "failed_ratio must be in [0.0, 1.0], got {failed_ratio}"
        )));
    }
    let failed = (total_events as f64 * failed_ratio) as u64;
    let retried = failed.saturating_mul(max_retries as u64);
    Ok(retried.saturating_add(buffer))
}

/// 验证插件事件来源白名单：`source` 必须出现在 `allowed_sources` 列表中。
pub fn validate_event_source(
    source: &str,
    allowed_sources: &[&str],
) -> Result<(), IntegrationError> {
    if allowed_sources.is_empty() {
        return Err(IntegrationError::InvalidMapping(
            "allowed_sources cannot be empty".to_string(),
        ));
    }
    if source.is_empty() {
        return Err(IntegrationError::InvalidEventId(source.to_string()));
    }
    if !allowed_sources.iter().any(|s| *s == source) {
        return Err(IntegrationError::InvalidEventId(format!(
            "source '{source}' not in allowlist"
        )));
    }
    Ok(())
}

/// 将同步任务的进度百分比做「边界归一化」，保证 [0, 100] 整数。
pub fn normalize_progress(pct: f64) -> u8 {
    if pct < 0.0 {
        return 0;
    }
    if pct > 100.0 {
        return 100;
    }
    pct.round() as u8
}

/// 将「跨主体」的币种数量做「四舍五入到分」的规范化：
/// `amount * 100，四舍五入，再 / 100`；保留两位小数。
///
/// 例如 `123.456 -> 123.46`。
pub fn normalize_currency_cents(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

// ============================================================================
// Integration FSM：事件同步状态机
// ============================================================================

/// 跨主体同步事件生命周期状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SyncEventState {
    /// 刚接收，尚未入校验队列
    Received,
    /// 校验通过，等待执行
    Queued,
    /// 执行中
    Processing,
    /// 执行成功
    Succeeded,
    /// 执行失败（可重试）
    FailedRetryable,
    /// 已死信，放弃重试
    DeadLettered,
    /// 业务方取消
    Cancelled,
}

/// 驱动 SyncEventState 的事件。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncEventEvent {
    ValidatePassed,
    Enqueue,
    StartProcessing,
    Succeed,
    FailRetryable,
    FailFinal,
    Retry,
    Cancel,
    RouteToDeadLetter,
}

impl SyncEventState {
    pub fn transition(self, ev: SyncEventEvent) -> Option<Self> {
        use SyncEventEvent::*;
        use SyncEventState::*;
        match (self, ev) {
            (Received, ValidatePassed) => Some(Queued),
            (Received, Enqueue) => Some(Queued),
            (Queued, StartProcessing) => Some(Processing),
            (Processing, Succeed) => Some(Succeeded),
            (Processing, FailRetryable) => Some(FailedRetryable),
            (Processing, FailFinal) => Some(DeadLettered),
            (FailedRetryable, Retry) => Some(Processing),
            (FailedRetryable, RouteToDeadLetter) => Some(DeadLettered),
            (Queued, Cancel) | (Processing, Cancel) | (Received, Cancel) => Some(Cancelled),
            _ => None,
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            SyncEventState::Succeeded | SyncEventState::DeadLettered | SyncEventState::Cancelled
        )
    }
}

// ============================================================================
// 扩展测试模块
// ============================================================================

#[cfg(test)]
mod tests_ext {
    use super::*;

    // ---------- compare_rule_priority ----------

    #[test]
    fn test_rule_priority_less_than() {
        assert_eq!(
            compare_rule_priority(1, 10).unwrap(),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn test_rule_priority_equal() {
        assert_eq!(
            compare_rule_priority(5, 5).unwrap(),
            std::cmp::Ordering::Equal
        );
    }

    #[test]
    fn test_rule_priority_greater() {
        assert_eq!(
            compare_rule_priority(20, 2).unwrap(),
            std::cmp::Ordering::Greater
        );
    }

    #[test]
    fn test_rule_priority_zero_invalid() {
        assert!(compare_rule_priority(0, 1).is_err());
        assert!(compare_rule_priority(1, 0).is_err());
    }

    // ---------- is_within_time_window ----------

    #[test]
    fn test_time_window_normal_hours() {
        // 9-17 点，10 点在窗口内，20 点不在
        assert!(is_within_time_window(10, 9, 17).unwrap());
        assert!(!is_within_time_window(20, 9, 17).unwrap());
    }

    #[test]
    fn test_time_window_over_midnight() {
        // 22-06 跨午夜
        assert!(is_within_time_window(23, 22, 6).unwrap());
        assert!(is_within_time_window(2, 22, 6).unwrap());
        assert!(!is_within_time_window(12, 22, 6).unwrap());
    }

    #[test]
    fn test_time_window_open_all_day() {
        assert!(is_within_time_window(3, 0, 0).unwrap());
        assert!(is_within_time_window(23, 8, 8).unwrap());
    }

    #[test]
    fn test_time_window_invalid_hour() {
        assert!(is_within_time_window(24, 0, 8).is_err());
        assert!(is_within_time_window(5, 25, 8).is_err());
    }

    // ---------- coerce_field_type ----------

    #[test]
    fn test_coerce_string() {
        let v = coerce_field_type("hello", "string").unwrap();
        assert_eq!(v, serde_json::Value::String("hello".to_string()));
    }

    #[test]
    fn test_coerce_int() {
        let v = coerce_field_type("-123", "int").unwrap();
        assert_eq!(v, serde_json::json!(-123));
    }

    #[test]
    fn test_coerce_float() {
        let v = coerce_field_type("3.5", "float").unwrap();
        assert_eq!(v, serde_json::json!(3.5));
    }

    #[test]
    fn test_coerce_bool_variants() {
        use serde_json::Value::Bool;
        assert_eq!(coerce_field_type("true", "bool").unwrap(), Bool(true));
        assert_eq!(coerce_field_type("YES", "bool").unwrap(), Bool(true));
        assert_eq!(coerce_field_type("1", "bool").unwrap(), Bool(true));
        assert_eq!(coerce_field_type("false", "bool").unwrap(), Bool(false));
        assert_eq!(coerce_field_type("0", "bool").unwrap(), Bool(false));
    }

    #[test]
    fn test_coerce_bool_invalid() {
        assert!(coerce_field_type("maybe", "bool").is_err());
    }

    #[test]
    fn test_coerce_unknown_type() {
        assert!(coerce_field_type("x", "money").is_err());
    }

    #[test]
    fn test_coerce_int_invalid() {
        assert!(coerce_field_type("not-a-number", "int").is_err());
    }

    // ---------- resolve_event_version ----------

    #[test]
    fn test_resolve_version_higher_ok() {
        assert_eq!(resolve_event_version(5, 6).unwrap(), 6);
    }

    #[test]
    fn test_resolve_version_equal_ok() {
        assert_eq!(resolve_event_version(3, 3).unwrap(), 3);
    }

    #[test]
    fn test_resolve_version_stale_conflict() {
        let err = resolve_event_version(10, 5).unwrap_err();
        assert!(matches!(err, IntegrationError::SyncConflict(_)));
    }

    // ---------- estimate_dead_letter_storage ----------

    #[test]
    fn test_dl_storage_zero_failures() {
        assert_eq!(estimate_dead_letter_storage(1000, 0.0, 3, 0).unwrap(), 0);
    }

    #[test]
    fn test_dl_storage_hundred_percent() {
        // 100 × 1.0 × 5 retries + 10 buffer = 510
        assert_eq!(estimate_dead_letter_storage(100, 1.0, 5, 10).unwrap(), 510);
    }

    #[test]
    fn test_dl_storage_invalid_ratio() {
        assert!(estimate_dead_letter_storage(100, 1.5, 3, 0).is_err());
    }

    // ---------- validate_event_source ----------

    #[test]
    fn test_validate_source_allowed() {
        assert!(validate_event_source("erp", &["erp", "wms", "crm"]).is_ok());
    }

    #[test]
    fn test_validate_source_rejected() {
        let err = validate_event_source("unknown", &["erp", "wms"]).unwrap_err();
        assert!(matches!(err, IntegrationError::InvalidEventId(_)));
    }

    #[test]
    fn test_validate_source_empty_allowlist() {
        assert!(validate_event_source("erp", &[]).is_err());
    }

    #[test]
    fn test_validate_source_empty_source() {
        assert!(validate_event_source("", &["erp"]).is_err());
    }

    // ---------- normalize_progress ----------

    #[test]
    fn test_progress_within_range() {
        assert_eq!(normalize_progress(42.6), 43);
    }

    #[test]
    fn test_progress_clamped_edges() {
        assert_eq!(normalize_progress(-5.0), 0);
        assert_eq!(normalize_progress(200.0), 100);
    }

    // ---------- normalize_currency_cents ----------

    #[test]
    fn test_currency_rounds_up() {
        assert!((normalize_currency_cents(123.456) - 123.46).abs() < 1e-9);
    }

    #[test]
    fn test_currency_rounds_down() {
        assert!((normalize_currency_cents(7.124) - 7.12).abs() < 1e-9);
    }

    #[test]
    fn test_currency_negative() {
        assert!((normalize_currency_cents(-9.8765) - (-9.88)).abs() < 1e-9);
    }

    // ---------- SyncEventState FSM ----------

    use SyncEventEvent::*;
    use SyncEventState::*;

    #[test]
    fn test_sync_event_happy_path() {
        assert_eq!(Received.transition(ValidatePassed), Some(Queued));
        assert_eq!(Queued.transition(StartProcessing), Some(Processing));
        assert_eq!(Processing.transition(Succeed), Some(Succeeded));
    }

    #[test]
    fn test_sync_event_retry_flow() {
        assert_eq!(Processing.transition(FailRetryable), Some(FailedRetryable));
        assert_eq!(FailedRetryable.transition(Retry), Some(Processing));
    }

    #[test]
    fn test_sync_event_to_dead_letter() {
        assert_eq!(
            FailedRetryable.transition(RouteToDeadLetter),
            Some(DeadLettered)
        );
        assert_eq!(Processing.transition(FailFinal), Some(DeadLettered));
    }

    #[test]
    fn test_sync_event_cancel_from_multiple() {
        assert_eq!(Received.transition(Cancel), Some(Cancelled));
        assert_eq!(Queued.transition(Cancel), Some(Cancelled));
        assert_eq!(Processing.transition(Cancel), Some(Cancelled));
    }

    #[test]
    fn test_sync_event_invalid_transitions() {
        // Succeeded 后不再接受任何事件
        assert_eq!(Succeeded.transition(Succeed), None);
        // DeadLettered → Retry 非法
        assert_eq!(DeadLettered.transition(Retry), None);
    }

    #[test]
    fn test_sync_event_terminal_set() {
        assert!(Succeeded.is_terminal());
        assert!(DeadLettered.is_terminal());
        assert!(Cancelled.is_terminal());
        assert!(!Processing.is_terminal());
        assert!(!FailedRetryable.is_terminal());
    }
}
