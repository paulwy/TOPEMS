//! SLA 升级机制集成测试
//!
//! 测试 SLA（服务等级协议）的关键业务路径：
//! - SLA 策略计算逻辑（default_sla_hours / calculate_due_time）
//! - 升级级别计算（check_and_escalate 中的升级点迭代）
//! - check_and_escalate 正确计算升级时机的各种场景
//!
//! 说明：
//!   SLA 服务实现位于 unified-core（TicketSlaService），其核心函数
//!   default_sla_hours / calculate_due_time / check_and_escalate 均为私有。
//!   Portal crate 不依赖 unified-core，因此无法直接调用这些函数。
//!   本测试通过复现 sla_service.rs 中的算法逻辑，作为"特性化测试"
//!   （characterization tests）来验证算法正确性，并固化预期行为。
//!   当算法发生变化时，这些测试需要同步更新，从而提供变更检测能力。
//!
//!   注意：V60 精简后，Portal BFF 的 tickets/SLA 纯代理路由已移除，
//!   前端直连 unified-core。本测试文件仅保留 SLA 算法逻辑的特性化测试。

use chrono::{DateTime, Datelike, Duration, Timelike, Utc, Weekday};

// ====================================================================
//  复现 sla_service.rs 中的核心算法（私有函数的等价实现）
//  与 svc/unified-core/src/modules/ticket/sla_service.rs 保持一致
// ====================================================================

/// 复现 TicketSlaService::default_sla_hours
/// 返回 (response_hours, resolution_hours)
fn default_sla_hours(severity: &str) -> (f64, f64) {
    match severity {
        "critical" => (1.0, 4.0),   // 1小时响应，4小时解决
        "high" => (2.0, 24.0),      // 2小时响应，24小时解决
        "medium" => (8.0, 72.0),    // 8小时响应，72小时解决
        "low" => (24.0, 168.0),     // 24小时响应，7天解决
        _ => (8.0, 72.0),           // 未知严重级别使用 medium 默认值
    }
}

/// 复现 TicketSlaService::calculate_due_time
/// 计算工作时间内的截止时间
fn calculate_due_time(
    start_time: DateTime<Utc>,
    hours: f64,
    working_hours_only: bool,
    business_start: Option<&str>,
    business_end: Option<&str>,
    weekend_excluded: bool,
) -> DateTime<Utc> {
    if !working_hours_only && !weekend_excluded {
        return start_time + Duration::seconds((hours * 3600.0) as i64);
    }

    let mut remaining_hours = hours;
    let mut current = start_time;

    while remaining_hours > 0.0 {
        let naive = current.naive_utc();
        let weekday = naive.weekday();

        if weekend_excluded && (weekday == Weekday::Sat || weekday == Weekday::Sun) {
            current = current + Duration::days(1);
            current = current
                .date_naive()
                .and_hms_opt(9, 0, 0)
                .unwrap_or(current.naive_local())
                .and_utc();
            continue;
        }

        if working_hours_only {
            let start_hour = business_start
                .and_then(|s| s.split(':').next()?.parse().ok())
                .unwrap_or(9);
            let end_hour = business_end
                .and_then(|s| s.split(':').next()?.parse().ok())
                .unwrap_or(18);

            let current_hour = naive.hour() as i32;

            if current_hour < start_hour {
                current = current
                    .date_naive()
                    .and_hms_opt(start_hour as u32, 0, 0)
                    .unwrap_or(current.naive_local())
                    .and_utc();
            }

            if current_hour >= end_hour {
                current = current + Duration::days(1);
                current = current
                    .date_naive()
                    .and_hms_opt(start_hour as u32, 0, 0)
                    .unwrap_or(current.naive_local())
                    .and_utc();
                continue;
            }

            let hours_left_today =
                end_hour as f64 - current_hour as f64 - (naive.minute() as f64 / 60.0);

            if remaining_hours <= hours_left_today {
                current = current + Duration::seconds((remaining_hours * 3600.0) as i64);
                remaining_hours = 0.0;
            } else {
                remaining_hours -= hours_left_today;
                current = current + Duration::days(1);
                current = current
                    .date_naive()
                    .and_hms_opt(start_hour as u32, 0, 0)
                    .unwrap_or(current.naive_local())
                    .and_utc();
            }
        } else {
            current = current + Duration::seconds((remaining_hours * 3600.0) as i64);
            remaining_hours = 0.0;
        }
    }

    current
}

/// 测试用 SLA 策略
#[allow(dead_code)]
struct TestSlaPolicy {
    response_hours: f64,
    resolution_hours: f64,
    escalation_levels: i32,
    escalation_hours_1: Option<f64>,
    escalation_hours_2: Option<f64>,
    escalation_hours_3: Option<f64>,
    working_hours_only: bool,
    business_hours_start: Option<String>,
    business_hours_end: Option<String>,
    weekend_excluded: bool,
}

impl TestSlaPolicy {
    fn standard() -> Self {
        Self {
            response_hours: 2.0,
            resolution_hours: 24.0,
            escalation_levels: 3,
            escalation_hours_1: Some(4.0),
            escalation_hours_2: Some(12.0),
            escalation_hours_3: Some(20.0),
            working_hours_only: false,
            business_hours_start: None,
            business_hours_end: None,
            weekend_excluded: false,
        }
    }
}

/// 测试用工单
#[allow(dead_code)]
struct TestTicket {
    severity: String,
    status: String,
    created_at: DateTime<Utc>,
}

/// 复现 check_and_escalate 中的升级级别计算逻辑
/// 返回应触发的升级级别列表
fn compute_escalation_levels(
    ticket: &TestTicket,
    policy: &TestSlaPolicy,
    now: DateTime<Utc>,
    existing_escalation_levels: &[i32],
) -> Vec<i32> {
    // 已解决/关闭/取消的工单不升级
    if ticket.status == "resolved" || ticket.status == "closed" || ticket.status == "cancelled" {
        return vec![];
    }

    let escalation_hours = [
        policy.escalation_hours_1,
        policy.escalation_hours_2,
        policy.escalation_hours_3,
    ];

    let mut triggered = Vec::new();

    for (i, hours_opt) in escalation_hours.iter().enumerate() {
        let level = (i + 1) as i32;
        if level > policy.escalation_levels {
            break;
        }

        if let Some(hours) = hours_opt {
            let escalation_due = calculate_due_time(
                ticket.created_at,
                *hours,
                policy.working_hours_only,
                policy.business_hours_start.as_deref(),
                policy.business_hours_end.as_deref(),
                policy.weekend_excluded,
            );

            let already_escalated = existing_escalation_levels.contains(&level);

            if now >= escalation_due && !already_escalated {
                triggered.push(level);
            }
        }
    }

    triggered
}

// ====================================================================
//  ============ 第一部分：SLA 策略计算逻辑测试 ============
//  对应 default_sla_hours 函数
// ====================================================================

#[test]
fn test_default_sla_hours_critical() {
    let (resp, resolution) = default_sla_hours("critical");
    assert_eq!(resp, 1.0, "critical 工单响应时限应为 1 小时");
    assert_eq!(resolution, 4.0, "critical 工单解决时限应为 4 小时");
}

#[test]
fn test_default_sla_hours_high() {
    let (resp, resolution) = default_sla_hours("high");
    assert_eq!(resp, 2.0, "high 工单响应时限应为 2 小时");
    assert_eq!(resolution, 24.0, "high 工单解决时限应为 24 小时");
}

#[test]
fn test_default_sla_hours_medium() {
    let (resp, resolution) = default_sla_hours("medium");
    assert_eq!(resp, 8.0, "medium 工单响应时限应为 8 小时");
    assert_eq!(resolution, 72.0, "medium 工单解决时限应为 72 小时");
}

#[test]
fn test_default_sla_hours_low() {
    let (resp, resolution) = default_sla_hours("low");
    assert_eq!(resp, 24.0, "low 工单响应时限应为 24 小时");
    assert_eq!(resolution, 168.0, "low 工单解决时限应为 168 小时（7天）");
}

#[test]
fn test_default_sla_hours_unknown_severity_falls_back_to_medium() {
    let (resp, resolution) = default_sla_hours("unknown");
    assert_eq!(resp, 8.0, "未知严重级别应回退到 medium 的响应时限");
    assert_eq!(resolution, 72.0, "未知严重级别应回退到 medium 的解决时限");
}

#[test]
fn test_default_sla_hours_empty_severity_falls_back() {
    let (resp, resolution) = default_sla_hours("");
    assert_eq!(resp, 8.0);
    assert_eq!(resolution, 72.0);
}

#[test]
fn test_default_sla_hours_severity_ordering() {
    // 验证严重级别越高，时限越短
    let critical = default_sla_hours("critical");
    let high = default_sla_hours("high");
    let medium = default_sla_hours("medium");
    let low = default_sla_hours("low");

    assert!(critical.0 < high.0, "critical 响应时限应短于 high");
    assert!(high.0 < medium.0, "high 响应时限应短于 medium");
    assert!(medium.0 < low.0, "medium 响应时限应短于 low");

    assert!(critical.1 < high.1, "critical 解决时限应短于 high");
    assert!(high.1 < medium.1, "high 解决时限应短于 medium");
    assert!(medium.1 < low.1, "medium 解决时限应短于 low");
}

// ====================================================================
//  ============ 第二部分：calculate_due_time 计算测试 ============
//  对应 calculate_due_time 函数
// ====================================================================

#[test]
fn test_calculate_due_time_simple_addition() {
    // 非工作时间模式：直接加上小时数
    let start = Utc::now();
    let due = calculate_due_time(start, 2.0, false, None, None, false);

    let expected = start + Duration::seconds(2 * 3600);
    assert_eq!(due, expected, "非工作时间模式应直接加上小时数");
}

#[test]
fn test_calculate_due_time_zero_hours() {
    let start = Utc::now();
    let due = calculate_due_time(start, 0.0, false, None, None, false);
    assert_eq!(due, start, "0 小时应返回开始时间");
}

#[test]
fn test_calculate_due_time_fractional_hours() {
    let start = Utc::now();
    let due = calculate_due_time(start, 1.5, false, None, None, false);

    let expected = start + Duration::seconds((1.5 * 3600.0) as i64);
    assert_eq!(due, expected, "1.5 小时应正确计算（含小数）");
}

#[test]
fn test_calculate_due_time_large_hours() {
    let start = Utc::now();
    let due = calculate_due_time(start, 168.0, false, None, None, false);

    let expected = start + Duration::seconds(168 * 3600);
    assert_eq!(due, expected, "168 小时（7天）应正确计算");
}

#[test]
fn test_calculate_due_time_weekend_excluded_skips_weekend() {
    // 构造一个周六的时间点
    // 2024-01-06 是周六
    let saturday = DateTime::parse_from_rfc3339("2024-01-06T10:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    // 排除周末，但不限制工作时间，2 小时应跳到周一
    let due = calculate_due_time(saturday, 2.0, false, None, None, true);

    // 2024-01-08 是周一，09:00 开始
    let expected_monday = DateTime::parse_from_rfc3339("2024-01-08T09:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    // 加上 2 小时
    let expected = expected_monday + Duration::seconds(2 * 3600);

    assert_eq!(
        due, expected,
        "周末排除模式下，周六的 2 小时应跳到周一 09:00 + 2小时"
    );
}

#[test]
fn test_calculate_due_time_working_hours_only() {
    // 构造一个工作日下午 17:00（接近下班）
    // 2024-01-04 是周四
    let thursday_afternoon = DateTime::parse_from_rfc3339("2024-01-04T17:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    // 工作时间 09-18，需要 3 小时
    // 17:00 到 18:00 只有 1 小时，剩下 2 小时要到第二天 09:00 开始
    let due = calculate_due_time(
        thursday_afternoon,
        3.0,
        true,
        Some("09:00"),
        Some("18:00"),
        false,
    );

    // 第二天（周五）09:00 + 2 小时 = 11:00
    let expected_friday = DateTime::parse_from_rfc3339("2024-01-05T11:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    assert_eq!(
        due, expected_friday,
        "工作时间模式下，17:00 的 3 小时应跨天到周五 11:00"
    );
}

#[test]
fn test_calculate_due_time_working_hours_within_same_day() {
    // 工作日上午 10:00，需要 2 小时，应在同一天完成
    // 2024-01-04 是周四
    let thursday_morning = DateTime::parse_from_rfc3339("2024-01-04T10:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    let due = calculate_due_time(
        thursday_morning,
        2.0,
        true,
        Some("09:00"),
        Some("18:00"),
        false,
    );

    let expected = thursday_morning + Duration::seconds(2 * 3600);
    assert_eq!(due, expected, "工作时间内应直接加小时数");
}

#[test]
fn test_calculate_due_time_working_hours_plus_weekend() {
    // 周五下午 16:00，需要 4 小时（工作时间 09-18，排除周末）
    // 2024-01-05 是周五
    let friday_afternoon = DateTime::parse_from_rfc3339("2024-01-05T16:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    let due = calculate_due_time(
        friday_afternoon,
        4.0,
        true,
        Some("09:00"),
        Some("18:00"),
        true,
    );

    // 周五 16:00-18:00 = 2 小时，剩 2 小时
    // 跳到周一 09:00 + 2 小时 = 11:00
    // 2024-01-08 是周一
    let expected_monday = DateTime::parse_from_rfc3339("2024-01-08T11:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    assert_eq!(
        due, expected_monday,
        "工作时间+周末排除：周五 16:00 的 4 小时应到周一 11:00"
    );
}

#[test]
fn test_calculate_due_time_before_business_hours() {
    // 凌晨 05:00，工作时间 09-18
    // 2024-01-04 是周四
    let early_morning = DateTime::parse_from_rfc3339("2024-01-04T05:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    let due = calculate_due_time(
        early_morning,
        2.0,
        true,
        Some("09:00"),
        Some("18:00"),
        false,
    );

    // 应从 09:00 开始 + 2 小时 = 11:00
    let expected = DateTime::parse_from_rfc3339("2024-01-04T11:00:00Z")
        .unwrap()
        .with_timezone(&Utc);

    assert_eq!(due, expected, "工作时间前应跳到 09:00 开始计算");
}

// ====================================================================
//  ============ 第三部分：check_and_escalate 升级时机计算测试 ============
//  对应 check_and_escalate 函数的核心逻辑
// ====================================================================

#[test]
fn test_escalation_no_escalation_within_sla() {
    // 工单创建于 1 小时前，第一级升级在 4 小时
    let created_at = Utc::now() - Duration::hours(1);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert!(
        triggered.is_empty(),
        "工单创建 1 小时后（第一级升级在 4 小时）不应触发任何升级"
    );
}

#[test]
fn test_escalation_triggers_level_1_after_first_threshold() {
    // 工单创建于 5 小时前，第一级升级在 4 小时
    let created_at = Utc::now() - Duration::hours(5);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert_eq!(
        triggered,
        vec![1],
        "工单创建 5 小时后应触发第一级升级（4 小时阈值）"
    );
}

#[test]
fn test_escalation_triggers_levels_1_and_2() {
    // 工单创建于 13 小时前，第一级在 4 小时，第二级在 12 小时
    let created_at = Utc::now() - Duration::hours(13);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert_eq!(
        triggered,
        vec![1, 2],
        "工单创建 13 小时后应触发第一级（4h）和第二级（12h）升级"
    );
}

#[test]
fn test_escalation_triggers_all_levels() {
    // 工单创建于 21 小时前，三级升级阈值分别为 4/12/20 小时
    let created_at = Utc::now() - Duration::hours(21);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert_eq!(
        triggered,
        vec![1, 2, 3],
        "工单创建 21 小时后应触发所有三级升级（4h/12h/20h）"
    );
}

#[test]
fn test_escalation_skips_already_escalated_levels() {
    // 工单创建于 13 小时前，但第一级已升级
    let created_at = Utc::now() - Duration::hours(13);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[1]);

    assert_eq!(
        triggered,
        vec![2],
        "第一级已升级时，13 小时后只应触发第二级升级"
    );
}

#[test]
fn test_escalation_resolved_ticket_no_escalation() {
    // 已解决的工单不应触发升级
    let created_at = Utc::now() - Duration::hours(48);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "resolved".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert!(
        triggered.is_empty(),
        "已解决的工单不应触发任何升级，即使已超过所有升级阈值"
    );
}

#[test]
fn test_escalation_closed_ticket_no_escalation() {
    let created_at = Utc::now() - Duration::hours(48);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "closed".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert!(triggered.is_empty(), "已关闭的工单不应触发任何升级");
}

#[test]
fn test_escalation_cancelled_ticket_no_escalation() {
    let created_at = Utc::now() - Duration::hours(48);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "cancelled".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert!(triggered.is_empty(), "已取消的工单不应触发任何升级");
}

#[test]
fn test_escalation_respects_escalation_levels_limit() {
    // policy.escalation_levels = 1，即使时间超过第二、三级阈值也只触发第一级
    let created_at = Utc::now() - Duration::hours(30);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let mut policy = TestSlaPolicy::standard();
    policy.escalation_levels = 1;

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert_eq!(
        triggered,
        vec![1],
        "escalation_levels=1 时，即使超过所有阈值也只触发第一级"
    );
}

#[test]
fn test_escalation_skips_none_escalation_hours() {
    // escalation_hours_2 为 None，应跳过第二级
    let created_at = Utc::now() - Duration::hours(25);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let mut policy = TestSlaPolicy::standard();
    policy.escalation_hours_2 = None;

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert_eq!(
        triggered,
        vec![1, 3],
        "escalation_hours_2=None 时应跳过第二级，触发第一级和第三级"
    );
}

#[test]
fn test_escalation_exact_threshold_boundary() {
    // 恰好在升级阈值上（now >= escalation_due），应触发升级
    let created_at = Utc::now() - Duration::seconds(4 * 3600 + 1); // 4小时+1秒
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert_eq!(
        triggered,
        vec![1],
        "恰好超过 4 小时阈值（4小时+1秒）应触发第一级升级"
    );
}

#[test]
fn test_escalation_just_before_threshold_no_escalation() {
    // 刚好不到升级阈值（4小时-1秒），不应触发
    let created_at = Utc::now() - Duration::seconds(4 * 3600 - 1); // 4小时-1秒
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);

    assert!(
        triggered.is_empty(),
        "未到 4 小时阈值（4小时-1秒）不应触发升级"
    );
}

#[test]
fn test_escalation_with_working_hours_only_policy() {
    // 工作时间模式下的升级计算
    // 创建于昨天 16:00，需要 4 小时触发第一级
    // 工作时间 09-18，16:00 到 18:00 = 2 小时，剩 2 小时到今天 09:00 + 2h = 11:00
    let now = Utc::now();
    let created_at = now - Duration::days(1);

    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };

    let mut policy = TestSlaPolicy::standard();
    policy.working_hours_only = true;
    policy.business_hours_start = Some("09:00".to_string());
    policy.business_hours_end = Some("18:00".to_string());

    // 一天后必然超过 4 工作小时，应触发第一级
    let triggered = compute_escalation_levels(&ticket, &policy, now, &[]);

    assert!(
        triggered.contains(&1),
        "工作时间模式下，1天后应至少触发第一级升级"
    );
}

#[test]
fn test_escalation_all_levels_already_escalated() {
    // 所有级别都已升级，不应再触发
    let created_at = Utc::now() - Duration::hours(48);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[1, 2, 3]);

    assert!(
        triggered.is_empty(),
        "所有级别都已升级时，不应再触发任何升级"
    );
}

#[test]
fn test_escalation_partial_already_escalated() {
    // 第一、三级已升级，只有第二级未升级但时间已过
    let created_at = Utc::now() - Duration::hours(15);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[1, 3]);

    assert_eq!(
        triggered,
        vec![2],
        "第一、三级已升级时，15小时后只应触发第二级升级"
    );
}

// ====================================================================
//  ============ 第四部分：SLA 升级时序一致性测试 ============
//  验证 check_and_escalate 复用 calculate_due_time 的一致性
//  （对应 V51.0 修复：升级点与 SLA 截止时间计算一致）
// ====================================================================

#[test]
fn test_escalation_uses_calculate_due_time_for_consistency() {
    // 验证升级点的计算与 SLA 截止时间使用相同的 calculate_due_time
    let created_at = Utc::now() - Duration::hours(5);
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let policy = TestSlaPolicy::standard();

    // 手动计算第一级升级点
    let escalation_1_due = calculate_due_time(
        created_at,
        policy.escalation_hours_1.unwrap(),
        policy.working_hours_only,
        policy.business_hours_start.as_deref(),
        policy.business_hours_end.as_deref(),
        policy.weekend_excluded,
    );

    // 5小时后应超过 4 小时的第一级升级点
    assert!(
        Utc::now() >= escalation_1_due,
        "5小时后应超过第一级升级点（4小时）"
    );

    // compute_escalation_levels 应触发第一级
    let triggered = compute_escalation_levels(&ticket, &policy, Utc::now(), &[]);
    assert!(triggered.contains(&1), "应触发第一级升级");
}

#[test]
fn test_escalation_and_resolution_due_time_use_same_algorithm() {
    // 验证升级点和解决截止时间使用相同的计算算法
    let created_at = Utc::now();
    let policy = TestSlaPolicy::standard();

    let resolution_due = calculate_due_time(
        created_at,
        policy.resolution_hours,
        policy.working_hours_only,
        policy.business_hours_start.as_deref(),
        policy.business_hours_end.as_deref(),
        policy.weekend_excluded,
    );

    let escalation_3_due = calculate_due_time(
        created_at,
        policy.escalation_hours_3.unwrap(),
        policy.working_hours_only,
        policy.business_hours_start.as_deref(),
        policy.business_hours_end.as_deref(),
        policy.weekend_excluded,
    );

    // 第三级升级（20小时）应在解决截止时间（24小时）之前
    assert!(
        escalation_3_due < resolution_due,
        "第三级升级点（20h）应在解决截止时间（24h）之前"
    );
}

#[test]
fn test_escalation_levels_are_chronologically_ordered() {
    let created_at = Utc::now();
    let policy = TestSlaPolicy::standard();

    let due_1 = calculate_due_time(
        created_at,
        policy.escalation_hours_1.unwrap(),
        policy.working_hours_only,
        policy.business_hours_start.as_deref(),
        policy.business_hours_end.as_deref(),
        policy.weekend_excluded,
    );
    let due_2 = calculate_due_time(
        created_at,
        policy.escalation_hours_2.unwrap(),
        policy.working_hours_only,
        policy.business_hours_start.as_deref(),
        policy.business_hours_end.as_deref(),
        policy.weekend_excluded,
    );
    let due_3 = calculate_due_time(
        created_at,
        policy.escalation_hours_3.unwrap(),
        policy.working_hours_only,
        policy.business_hours_start.as_deref(),
        policy.business_hours_end.as_deref(),
        policy.weekend_excluded,
    );

    assert!(due_1 < due_2, "第一级升级应早于第二级");
    assert!(due_2 < due_3, "第二级升级应早于第三级");
}

// ====================================================================
//  ============ 第六部分：SLA 升级场景综合测试 ============
//  模拟完整的 SLA 升级生命周期
// ====================================================================

#[test]
fn test_sla_escalation_full_lifecycle() {
    let policy = TestSlaPolicy::standard();
    let created_at = Utc::now();

    // 阶段 1: 刚创建，无升级
    let ticket = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let now = created_at + Duration::seconds(3600); // 1小时后
    let triggered = compute_escalation_levels(&ticket, &policy, now, &[]);
    assert!(triggered.is_empty(), "1小时后不应有升级");

    // 阶段 2: 4小时后，触发第一级
    let now = created_at + Duration::seconds(5 * 3600); // 5小时后
    let triggered = compute_escalation_levels(&ticket, &policy, now, &[]);
    assert_eq!(triggered, vec![1], "5小时后应触发第一级");
    let mut escalated_levels = triggered;

    // 阶段 3: 13小时后，触发第二级（第一级已记录）
    let now = created_at + Duration::seconds(13 * 3600);
    let triggered = compute_escalation_levels(&ticket, &policy, now, &escalated_levels);
    assert_eq!(triggered, vec![2], "13小时后应触发第二级");
    escalated_levels.extend(triggered);

    // 阶段 4: 21小时后，触发第三级
    let now = created_at + Duration::seconds(21 * 3600);
    let triggered = compute_escalation_levels(&ticket, &policy, now, &escalated_levels);
    assert_eq!(triggered, vec![3], "21小时后应触发第三级");
    escalated_levels.extend(triggered);

    // 阶段 5: 30小时后，所有级别已升级，不再触发
    let now = created_at + Duration::seconds(30 * 3600);
    let triggered = compute_escalation_levels(&ticket, &policy, now, &escalated_levels);
    assert!(triggered.is_empty(), "30小时后所有级别已升级，不应再触发");
}

#[test]
fn test_sla_escalation_stops_when_ticket_resolved() {
    let policy = TestSlaPolicy::standard();
    let created_at = Utc::now();

    // 工单创建 10 小时后仍未解决，应已触发第一级
    let ticket_open = TestTicket {
        severity: "high".to_string(),
        status: "open".to_string(),
        created_at,
    };
    let now = created_at + Duration::seconds(10 * 3600);
    let triggered = compute_escalation_levels(&ticket_open, &policy, now, &[]);
    assert!(triggered.contains(&1), "10小时后应已触发第一级");

    // 工单解决后，即使时间更长也不应触发新升级
    let ticket_resolved = TestTicket {
        severity: "high".to_string(),
        status: "resolved".to_string(),
        created_at,
    };
    let now = created_at + Duration::seconds(48 * 3600);
    let triggered = compute_escalation_levels(&ticket_resolved, &policy, now, &[]);
    assert!(triggered.is_empty(), "工单解决后不应触发任何升级");
}

#[test]
fn test_sla_escalation_with_critical_severity_default_policy() {
    // 使用 default_sla_hours 作为策略参数，验证 critical 工单的升级
    let (response_hours, resolution_hours) = default_sla_hours("critical");

    // critical: 1小时响应，4小时解决
    assert_eq!(response_hours, 1.0);
    assert_eq!(resolution_hours, 4.0);

    // 创建一个 critical 工单
    let created_at = Utc::now();
    let ticket = TestTicket {
        severity: "critical".to_string(),
        status: "open".to_string(),
        created_at,
    };

    // 使用默认策略（无自定义策略时）
    let policy = TestSlaPolicy {
        response_hours,
        resolution_hours,
        escalation_levels: 3,
        escalation_hours_1: Some(0.5), // 30分钟第一级升级
        escalation_hours_2: Some(1.0), // 1小时第二级
        escalation_hours_3: Some(2.0), // 2小时第三级
        working_hours_only: false,
        business_hours_start: None,
        business_hours_end: None,
        weekend_excluded: false,
    };

    // 45分钟后，应触发第一级（30分钟）
    let now = created_at + Duration::seconds(45 * 60);
    let triggered = compute_escalation_levels(&ticket, &policy, now, &[]);
    assert_eq!(triggered, vec![1], "45分钟应触发 critical 第一级升级");

    // 1.5小时后，应触发第一级和第二级
    let now = created_at + Duration::seconds(90 * 60);
    let triggered = compute_escalation_levels(&ticket, &policy, now, &[]);
    assert_eq!(triggered, vec![1, 2], "1.5小时应触发 critical 第一、二级升级");
}
