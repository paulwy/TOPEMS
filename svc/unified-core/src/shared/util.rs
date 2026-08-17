//! Unified-Core 共享纯工具函数（无 DB/async 依赖）
//!
//! 覆盖：健康检查聚合、分页构建、RBAC 位打包、令牌桶限流、
//! 幂等键哈希、时间戳对齐、过滤表达式解析、DTO 字段规整、
//! 基础 DTO Roundtrip。

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// 1. 健康检查聚合
// ============================================================================

/// 子系统健康状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// 单组件健康报告
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComponentHealth {
    pub name: String,
    pub status: HealthStatus,
    pub latency_ms: Option<u64>,
    pub message: Option<String>,
}

/// 把多个组件健康聚合成总体状态：只要有 Unhealthy → 总体 Unhealthy；
/// 否则只要有 Degraded → Degraded；全部 Healthy 才是 Healthy。
pub fn aggregate_health(components: &[ComponentHealth]) -> HealthStatus {
    let mut worst = HealthStatus::Healthy;
    for c in components {
        match c.status {
            HealthStatus::Unhealthy => return HealthStatus::Unhealthy,
            HealthStatus::Degraded => worst = HealthStatus::Degraded,
            HealthStatus::Healthy => {}
        }
    }
    worst
}

// ============================================================================
// 2. 分页构建器：page(1-based)/page_size → offset/count，带上下限
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pagination {
    pub page: i64,
    pub page_size: i64,
    pub offset: i64,
}

pub fn build_pagination(
    page: Option<i64>,
    page_size: Option<i64>,
    max_page_size: i64,
) -> Pagination {
    let page = page.unwrap_or(1).max(1);
    let mut size = page_size.unwrap_or(20).max(1);
    if max_page_size >= 1 && size > max_page_size {
        size = max_page_size;
    }
    let offset = (page - 1) * size;
    Pagination {
        page,
        page_size: size,
        offset,
    }
}

pub fn total_pages(total: i64, page_size: i64) -> i64 {
    if total <= 0 {
        return 0;
    }
    let s = page_size.max(1);
    (total + s - 1) / s
}

// ============================================================================
// 3. RBAC 位打包 / 解包
// ============================================================================

/// 单个权限位（0..=63，u64）。
pub type PermissionBit = u8;

/// 把若干权限位打包成一个 u64 位掩码；位号超出范围（≥64）会被丢弃。
pub fn pack_permissions(bits: &[PermissionBit]) -> u64 {
    let mut mask = 0u64;
    for &b in bits {
        if b < 64 {
            mask |= 1u64 << b;
        }
    }
    mask
}

/// 检查 `mask` 是否包含给定的权限位（bit<64 时未设置则 false；bit≥64 则 false）。
pub fn has_permission(mask: u64, bit: PermissionBit) -> bool {
    if bit >= 64 {
        return false;
    }
    (mask & (1u64 << bit)) != 0
}

/// mask_all：确保 `mask` 中所有要求的位都被设置
pub fn has_all_permissions(mask: u64, required: &[PermissionBit]) -> bool {
    required.iter().all(|&b| has_permission(mask, b))
}

/// mask_any：至少有一位命中
pub fn has_any_permission(mask: u64, required: &[PermissionBit]) -> bool {
    required.iter().any(|&b| has_permission(mask, b))
}

// ============================================================================
// 4. 令牌桶限流（纯函数：基于 refilled tokens 计算下一状态）
// ============================================================================

/// 令牌桶状态
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TokenBucket {
    pub tokens: f64,
    pub capacity: f64,
    pub refill_per_sec: f64,
    pub last_update_secs: f64,
}

impl TokenBucket {
    pub fn new(capacity: f64, refill_per_sec: f64, now_secs: f64) -> Self {
        Self {
            tokens: capacity,
            capacity,
            refill_per_sec,
            last_update_secs: now_secs,
        }
    }

    /// 经过 `now_secs` 时间后，计算新的 tokens 数量（无副作用）。
    pub fn refilled_at(&self, now_secs: f64) -> f64 {
        let dt = (now_secs - self.last_update_secs).max(0.0);
        (self.tokens + dt * self.refill_per_sec).min(self.capacity)
    }

    /// 尝试消耗 `cost` 个令牌；成功返回 `Some(new_state)`，不足返回 `None`。
    pub fn try_consume(&self, now_secs: f64, cost: f64) -> Option<Self> {
        if cost <= 0.0 {
            return Some(Self {
                last_update_secs: now_secs,
                ..*self
            });
        }
        let t = self.refilled_at(now_secs);
        if t >= cost {
            Some(Self {
                tokens: t - cost,
                capacity: self.capacity,
                refill_per_sec: self.refill_per_sec,
                last_update_secs: now_secs,
            })
        } else {
            None
        }
    }
}

// ============================================================================
// 5. 幂等键哈希（FNV-1a 64-bit + salt → hex）
// ============================================================================

pub fn idempotency_key_hash(tenant_id: &str, endpoint: &str, client_key: &str) -> String {
    const FNV_OFFSET: u64 = 14_695_981_039_346_656_037;
    const FNV_PRIME: u64 = 1_099_511_628_211;
    let mut h = FNV_OFFSET;
    let mix = |mut h: u64, s: &str| -> u64 {
        h ^= 0xff;
        h = h.wrapping_mul(FNV_PRIME);
        for b in s.as_bytes() {
            h ^= *b as u64;
            h = h.wrapping_mul(FNV_PRIME);
        }
        h
    };
    h = mix(h, tenant_id);
    h = mix(h, endpoint);
    h = mix(h, client_key);
    format!("idem:{:016x}", h)
}

// ============================================================================
// 6. 时间戳按粒度对齐（down to minute/hour/day buckets）
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimeBucket {
    Minute,
    Hour,
    Day,
}

/// 把毫秒时间戳向下取整到给定 bucket 的毫秒边界。
pub fn truncate_timestamp_ms(ts_ms: i64, bucket: TimeBucket) -> i64 {
    let sec = bucket_seconds(bucket);
    let ts_sec = ts_ms.div_euclid(1000);
    let aligned = ts_sec - ts_sec.rem_euclid(sec as i64);
    aligned * 1000
}

fn bucket_seconds(b: TimeBucket) -> u32 {
    use TimeBucket::*;
    match b {
        Minute => 60,
        Hour => 3600,
        Day => 86_400,
    }
}

// ============================================================================
// 7. 简单过滤表达式解析（field:op:value → 结构）
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FilterOp {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    Contains,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FilterClause {
    pub field: String,
    pub op: FilterOp,
    pub value: String,
}

/// 接受 `"name:eq:alice,age:gte:18"` 风格的过滤字符串 → Vec<FilterClause>。
/// 不支持逗号在 value 中出现的转义；非法片段会被忽略。
pub fn parse_filter_query(raw: &str) -> Vec<FilterClause> {
    let mut out = Vec::new();
    for seg in raw.split(',') {
        let seg = seg.trim();
        if seg.is_empty() {
            continue;
        }
        let mut parts = seg.splitn(3, ':');
        let field = match parts.next() {
            Some(p) if !p.is_empty() => p.to_string(),
            _ => continue,
        };
        let op_str = match parts.next() {
            Some(p) => p,
            None => continue,
        };
        let value = parts.next().unwrap_or("").to_string();
        let op = match op_str {
            "eq" => FilterOp::Eq,
            "ne" => FilterOp::Ne,
            "gt" => FilterOp::Gt,
            "gte" => FilterOp::Gte,
            "lt" => FilterOp::Lt,
            "lte" => FilterOp::Lte,
            "contains" => FilterOp::Contains,
            _ => continue,
        };
        out.push(FilterClause { field, op, value });
    }
    out
}

// ============================================================================
// 8. DTO 字段规整：去除字符串字段的前后空白，将列表去空串
// ============================================================================

/// 规整字符串：全角空格/制表符/换行都被 trim 掉，None 保留 None。
pub fn normalize_optional_text(s: Option<String>) -> Option<String> {
    s.and_then(|t| {
        let trimmed: String = t.trim().chars().filter(|c| !c.is_control()).collect();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

/// 规整字符串列表：对每个元素 trim，并移除空字符串。
pub fn normalize_tag_list(tags: Vec<String>) -> Vec<String> {
    let mut out = Vec::with_capacity(tags.len());
    for t in tags {
        let trimmed = t.trim().to_string();
        if !trimmed.is_empty() && !out.contains(&trimmed) {
            out.push(trimmed);
        }
    }
    out
}

// ============================================================================
// 9. 附加：API 标准响应 DTO（纯 serde 版）
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApiListResp<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TenantScope {
    pub tenant_id: String,
    pub user_id: String,
    pub roles: Vec<String>,
}

/// 将 SystemTime 转为毫秒 UNIX 时间戳（纯函数，无 panics）。
pub fn system_time_to_ms(st: SystemTime) -> i64 {
    match st.duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_millis() as i64,
        Err(e) => {
            let neg = e.duration().as_millis() as i64;
            -neg
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- aggregate_health ----------

    #[test]
    fn health_all_healthy() {
        let cs = &[
            ComponentHealth {
                name: "db".into(),
                status: HealthStatus::Healthy,
                latency_ms: Some(2),
                message: None,
            },
            ComponentHealth {
                name: "redis".into(),
                status: HealthStatus::Healthy,
                latency_ms: Some(1),
                message: None,
            },
        ];
        assert_eq!(aggregate_health(cs), HealthStatus::Healthy);
    }

    #[test]
    fn health_one_unhealthy_wins() {
        let cs = &[
            ComponentHealth {
                name: "db".into(),
                status: HealthStatus::Healthy,
                latency_ms: None,
                message: None,
            },
            ComponentHealth {
                name: "mq".into(),
                status: HealthStatus::Unhealthy,
                latency_ms: None,
                message: Some("conn refused".into()),
            },
            ComponentHealth {
                name: "redis".into(),
                status: HealthStatus::Degraded,
                latency_ms: None,
                message: None,
            },
        ];
        assert_eq!(aggregate_health(cs), HealthStatus::Unhealthy);
    }

    #[test]
    fn health_degraded_only() {
        let cs = &[
            ComponentHealth {
                name: "redis".into(),
                status: HealthStatus::Degraded,
                latency_ms: Some(300),
                message: None,
            },
            ComponentHealth {
                name: "db".into(),
                status: HealthStatus::Healthy,
                latency_ms: None,
                message: None,
            },
        ];
        assert_eq!(aggregate_health(cs), HealthStatus::Degraded);
    }

    #[test]
    fn health_empty_components_is_healthy() {
        assert_eq!(aggregate_health(&[]), HealthStatus::Healthy);
    }

    #[test]
    fn health_status_roundtrip() {
        for s in [
            HealthStatus::Healthy,
            HealthStatus::Degraded,
            HealthStatus::Unhealthy,
        ] {
            let j = serde_json::to_string(&s).unwrap();
            let d: HealthStatus = serde_json::from_str(&j).unwrap();
            assert_eq!(d, s);
        }
    }

    #[test]
    fn component_health_roundtrip() {
        let c = ComponentHealth {
            name: "db".into(),
            status: HealthStatus::Degraded,
            latency_ms: Some(250),
            message: Some("slow".into()),
        };
        let j = serde_json::to_string(&c).unwrap();
        let d: ComponentHealth = serde_json::from_str(&j).unwrap();
        assert_eq!(d, c);
    }

    // ---------- pagination ----------

    #[test]
    fn pagination_default_values() {
        let p = build_pagination(None, None, 100);
        assert_eq!(p.page, 1);
        assert_eq!(p.page_size, 20);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn pagination_page_clamped_to_one() {
        let p = build_pagination(Some(-3), None, 100);
        assert_eq!(p.page, 1);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn pagination_size_capped_by_max() {
        let p = build_pagination(Some(1), Some(500), 100);
        assert_eq!(p.page_size, 100);
    }

    #[test]
    fn pagination_offset_calculation() {
        let p = build_pagination(Some(3), Some(10), 100);
        assert_eq!(p.offset, 20);
    }

    #[test]
    fn pagination_roundtrip() {
        let p = build_pagination(Some(5), Some(25), 100);
        let j = serde_json::to_string(&p).unwrap();
        let d: Pagination = serde_json::from_str(&j).unwrap();
        assert_eq!(d, p);
    }

    #[test]
    fn total_pages_zero_or_negative_total() {
        assert_eq!(total_pages(0, 20), 0);
        assert_eq!(total_pages(-10, 20), 0);
    }

    #[test]
    fn total_pages_rounds_up() {
        assert_eq!(total_pages(1, 10), 1);
        assert_eq!(total_pages(10, 10), 1);
        assert_eq!(total_pages(11, 10), 2);
    }

    // ---------- rbac bits ----------

    #[test]
    fn pack_and_has() {
        let mask = pack_permissions(&[0, 2, 7, 63]);
        assert!(has_permission(mask, 0));
        assert!(has_permission(mask, 2));
        assert!(has_permission(mask, 7));
        assert!(has_permission(mask, 63));
        assert!(!has_permission(mask, 1));
        assert!(!has_permission(mask, 30));
    }

    #[test]
    fn pack_ignores_out_of_range() {
        let mask = pack_permissions(&[100, 200, 64]);
        assert_eq!(mask, 0);
    }

    #[test]
    fn pack_empty_is_zero() {
        assert_eq!(pack_permissions(&[]), 0);
    }

    #[test]
    fn has_all_and_any() {
        let mask = pack_permissions(&[1, 2, 3]);
        assert!(has_all_permissions(mask, &[1, 2]));
        assert!(!has_all_permissions(mask, &[1, 2, 4]));
        assert!(has_any_permission(mask, &[9, 2, 99]));
        assert!(!has_any_permission(mask, &[10, 11]));
    }

    #[test]
    fn has_permission_over_63_always_false() {
        let mask = u64::MAX;
        assert!(!has_permission(mask, 64));
    }

    // ---------- token bucket ----------

    #[test]
    fn bucket_starts_full() {
        let now = 10.0f64;
        let b = TokenBucket::new(10.0, 1.0, now);
        assert!((b.tokens - 10.0).abs() < 1e-9);
    }

    #[test]
    fn bucket_consume_ok() {
        let b = TokenBucket::new(10.0, 1.0, 0.0);
        let next = b.try_consume(0.0, 3.0).unwrap();
        assert!((next.tokens - 7.0).abs() < 1e-9);
        assert_eq!(next.last_update_secs, 0.0);
    }

    #[test]
    fn bucket_consume_not_enough_tokens() {
        let b = TokenBucket::new(3.0, 0.0, 0.0); // 不补充
        assert!(b.try_consume(0.0, 5.0).is_none());
    }

    #[test]
    fn bucket_refills_over_time() {
        let b = TokenBucket::new(10.0, 2.0, 0.0);
        let b = b.try_consume(0.0, 10.0).unwrap(); // tokens = 0
        assert!((b.tokens - 0.0).abs() < 1e-9);
        let t = b.refilled_at(3.0); // 3s * 2/s = 6
        assert!((t - 6.0).abs() < 1e-9);
    }

    #[test]
    fn bucket_refill_does_not_exceed_capacity() {
        let b = TokenBucket::new(5.0, 10.0, 0.0);
        let t = b.refilled_at(1000.0);
        assert!((t - 5.0).abs() < 1e-9);
    }

    // ---------- idempotency key ----------

    #[test]
    fn idem_key_deterministic() {
        let a = idempotency_key_hash("t1", "/users", "abc");
        let b = idempotency_key_hash("t1", "/users", "abc");
        assert_eq!(a, b);
    }

    #[test]
    fn idem_key_different_tenants_diff() {
        let a = idempotency_key_hash("t1", "/x", "k");
        let b = idempotency_key_hash("t2", "/x", "k");
        assert_ne!(a, b);
    }

    #[test]
    fn idem_key_prefix() {
        assert!(idempotency_key_hash("", "", "").starts_with("idem:"));
    }

    // ---------- time buckets ----------

    #[test]
    fn bucket_minute_truncate() {
        // 2024-01-01 00:01:30.500 ms
        let ts_ms = 1_704_067_290_500i64;
        let r = truncate_timestamp_ms(ts_ms, TimeBucket::Minute);
        assert_eq!(r % 60_000, 0);
        // 应该小于等于原值
        assert!(r <= ts_ms);
    }

    #[test]
    fn bucket_hour_and_day_multiple_of_unit() {
        let ts_ms = 1_704_067_290_500i64;
        let h = truncate_timestamp_ms(ts_ms, TimeBucket::Hour);
        assert_eq!(h % 3_600_000, 0);
        let d = truncate_timestamp_ms(ts_ms, TimeBucket::Day);
        assert_eq!(d % 86_400_000, 0);
    }

    #[test]
    fn bucket_already_aligned_unchanged() {
        let ts = 1_704_067_200_000i64; // on the minute/hour/day(?) check day anyway
        let m = truncate_timestamp_ms(ts, TimeBucket::Minute);
        let h = truncate_timestamp_ms(ts, TimeBucket::Hour);
        assert_eq!(m, ts);
        assert_eq!(h, ts);
    }

    #[test]
    fn bucket_negative_epoch_handled() {
        // 不会 panics，且能被秒对齐
        let r = truncate_timestamp_ms(-5000, TimeBucket::Minute);
        assert_eq!(r % 60_000, 0);
    }

    // ---------- parse_filter_query ----------

    #[test]
    fn filter_parse_basic() {
        let r = parse_filter_query("name:eq:alice,age:gte:18");
        assert_eq!(r.len(), 2);
        assert_eq!(r[0].field, "name");
        assert_eq!(r[0].op, FilterOp::Eq);
        assert_eq!(r[0].value, "alice");
        assert_eq!(r[1].field, "age");
        assert_eq!(r[1].op, FilterOp::Gte);
        assert_eq!(r[1].value, "18");
    }

    #[test]
    fn filter_parse_contains() {
        let r = parse_filter_query("bio:contains:engineer");
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].op, FilterOp::Contains);
    }

    #[test]
    fn filter_parse_skips_invalid_and_empty() {
        let r = parse_filter_query(",,,bad,no-colons,a:eq:x,unknownop:1:2");
        // a:eq:x → ok；其余跳过
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].field, "a");
    }

    #[test]
    fn filter_clause_and_op_roundtrip() {
        let fc = FilterClause {
            field: "age".into(),
            op: FilterOp::Lt,
            value: "30".into(),
        };
        let j = serde_json::to_string(&fc).unwrap();
        let d: FilterClause = serde_json::from_str(&j).unwrap();
        assert_eq!(d, fc);

        for op in [
            FilterOp::Eq,
            FilterOp::Ne,
            FilterOp::Gt,
            FilterOp::Gte,
            FilterOp::Lt,
            FilterOp::Lte,
            FilterOp::Contains,
        ] {
            let j = serde_json::to_string(&op).unwrap();
            let d: FilterOp = serde_json::from_str(&j).unwrap();
            assert_eq!(d, op);
        }
    }

    // ---------- normalize text / tag list ----------

    #[test]
    fn norm_text_none_stays_none() {
        assert_eq!(normalize_optional_text(None), None);
    }

    #[test]
    fn norm_text_trims_and_drops_control() {
        let s = Some("  alice\n\tbob  ".to_string());
        let r = normalize_optional_text(s);
        assert_eq!(r.as_deref(), Some("alicebob"));
    }

    #[test]
    fn norm_text_empty_trim_becomes_none() {
        assert_eq!(normalize_optional_text(Some("   ".into())), None);
    }

    #[test]
    fn norm_tags_dedup_and_trim_drop_empty() {
        let tags = vec![
            "  a  ".into(),
            "b".into(),
            "a".into(),
            "".into(),
            "  ".into(),
            "c".into(),
        ];
        let r = normalize_tag_list(tags);
        assert_eq!(r, vec!["a".to_string(), "b".to_string(), "c".to_string()]);
    }

    #[test]
    fn norm_tags_empty() {
        assert!(normalize_tag_list(vec![]).is_empty());
    }

    // ---------- ApiListResp + TenantScope roundtrip ----------

    #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
    struct Item {
        id: i32,
    }

    #[test]
    fn api_list_resp_roundtrip() {
        let resp = ApiListResp {
            items: vec![Item { id: 1 }, Item { id: 2 }],
            total: 42,
            page: 2,
            page_size: 20,
            total_pages: 3,
        };
        let j = serde_json::to_string(&resp).unwrap();
        let d: ApiListResp<Item> = serde_json::from_str(&j).unwrap();
        assert_eq!(d, resp);
    }

    #[test]
    fn tenant_scope_roundtrip_and_eq() {
        let t = TenantScope {
            tenant_id: "tenant-001".to_string(),
            user_id: "u-007".to_string(),
            roles: vec!["admin".into(), "user".into()],
        };
        let j = serde_json::to_string(&t).unwrap();
        let d: TenantScope = serde_json::from_str(&j).unwrap();
        assert_eq!(d, t);
    }

    // ---------- system_time_to_ms ----------

    #[test]
    fn system_time_ms_is_sorted() {
        let a = SystemTime::now();
        let b = a + Duration::from_secs(10);
        let ma = system_time_to_ms(a);
        let mb = system_time_to_ms(b);
        assert!(mb > ma);
        assert!(mb - ma >= 9_500);
    }

    #[test]
    fn system_time_ms_before_epoch_negative() {
        let st = UNIX_EPOCH - Duration::from_millis(500);
        let ms = system_time_to_ms(st);
        assert!(ms < 0);
    }

    // ---------- basic ordering sanity ----------

    #[test]
    fn filter_parse_order_preserved() {
        // 作为稳定查询条件的一部分，字段出现顺序应该被保留
        let q = "a:eq:1,b:eq:2,c:eq:3";
        let clauses = parse_filter_query(q);
        let keys: Vec<String> = clauses.iter().map(|c| c.field.clone()).collect();
        assert_eq!(keys, vec!["a", "b", "c"]);
    }
}
