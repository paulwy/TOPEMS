use chrono::Datelike;
use chrono::Timelike;
use chrono::{DateTime, Duration, Utc, Weekday};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::models::{
    CreateSlaPolicyRequest, SlaBreachTrendItem, SlaEscalationEvent, SlaSeverityStat, SlaTypeStat,
    Ticket, TicketSlaInfo, TicketSlaPolicy, TicketSlaStats, UpdateSlaPolicyRequest,
};

// ==================== Pure Functions ====================

/// 判断 SLA 是否已违约：now 超过 created_at + sla_hours*3600 即违约
pub fn is_sla_breached(created_at: i64, sla_hours: i64, now: i64) -> bool {
    if sla_hours <= 0 {
        return false;
    }
    let sla_seconds = sla_hours.saturating_mul(3600);
    now > created_at.saturating_add(sla_seconds)
}

/// 计算 SLA 剩余秒数；正值表示未到期，负值表示已超时
pub fn sla_remaining_seconds(created_at: i64, sla_seconds: i64, now: i64) -> i64 {
    created_at.saturating_add(sla_seconds) - now
}

/// 计算 SLA 合规率 (0.0 ~ 1.0)
pub fn sla_compliance_rate(total_tickets: usize, breached: usize) -> f64 {
    if total_tickets == 0 {
        return 0.0;
    }
    let breached = breached.min(total_tickets);
    (total_tickets - breached) as f64 / total_tickets as f64
}

/// 计算响应时间统计 (min, avg, max)
pub fn response_time_stats(times: &[f64]) -> (f64, f64, f64) {
    if times.is_empty() {
        return (0.0, 0.0, 0.0);
    }
    let mut min = f64::MAX;
    let mut max = f64::MIN;
    let mut sum = 0.0;
    for &t in times {
        if t < min {
            min = t;
        }
        if t > max {
            max = t;
        }
        sum += t;
    }
    let avg = sum / times.len() as f64;
    (min, avg, max)
}

/// 计算工单年龄（天数）
pub fn ticket_age_days(created_at: i64, now: i64) -> i64 {
    if now < created_at {
        return 0;
    }
    (now - created_at) / 86400
}

#[derive(Clone)]
pub struct TicketSlaService {
    pool: PgPool,
}

impl TicketSlaService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    fn default_sla_hours(severity: &str) -> (f64, f64) {
        match severity {
            "critical" => (1.0, 4.0),
            "high" => (2.0, 24.0),
            "medium" => (8.0, 72.0),
            "low" => (24.0, 168.0),
            _ => (8.0, 72.0),
        }
    }

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
                current += Duration::days(1);
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

                // 调整到上班整点后必须重新取当前时间，否则下方仍用上班前的陈旧小时数
                // 计算当日剩余工时（会把 9:00 之前的非工作时间算成可用工时，高估最多 1 小时）
                let naive = current.naive_utc();
                let current_hour = naive.hour() as i32;

                if current_hour >= end_hour {
                    current += Duration::days(1);
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
                    current += Duration::seconds((remaining_hours * 3600.0) as i64);
                    remaining_hours = 0.0;
                } else {
                    remaining_hours -= hours_left_today;
                    current += Duration::days(1);
                    current = current
                        .date_naive()
                        .and_hms_opt(start_hour as u32, 0, 0)
                        .unwrap_or(current.naive_local())
                        .and_utc();
                }
            } else {
                current += Duration::seconds((remaining_hours * 3600.0) as i64);
                remaining_hours = 0.0;
            }
        }

        current
    }

    pub async fn calculate_sla(&self, ticket: &Ticket) -> Result<TicketSlaInfo, sqlx::Error> {
        let policy = self.match_policy(ticket).await?;

        let (response_hours, resolution_hours) = match &policy {
            Some(p) => (p.response_hours, p.resolution_hours),
            None => Self::default_sla_hours(&ticket.severity),
        };

        let working_hours_only = policy
            .as_ref()
            .map(|p| p.working_hours_only)
            .unwrap_or(false);
        let weekend_excluded = policy.as_ref().map(|p| p.weekend_excluded).unwrap_or(false);
        let business_start = policy.as_ref().and_then(|p| p.business_hours_start.clone());
        let business_end = policy.as_ref().and_then(|p| p.business_hours_end.clone());

        let response_due_at = Self::calculate_due_time(
            ticket.created_at,
            response_hours,
            working_hours_only,
            business_start.as_deref(),
            business_end.as_deref(),
            weekend_excluded,
        );

        let resolution_due_at = match ticket.sla_due_at {
            Some(due) => due,
            None => Self::calculate_due_time(
                ticket.created_at,
                resolution_hours,
                working_hours_only,
                business_start.as_deref(),
                business_end.as_deref(),
                weekend_excluded,
            ),
        };

        let now = Utc::now();
        let is_resolved = ticket.status == "resolved"
            || ticket.status == "closed"
            || ticket.status == "cancelled";

        let is_breached = !is_resolved && now > resolution_due_at;
        let response_breached = !is_resolved && now > response_due_at;

        let time_remaining = if is_resolved {
            None
        } else {
            Some((resolution_due_at - now).num_minutes())
        };

        let response_time_remaining = if is_resolved {
            None
        } else {
            Some((response_due_at - now).num_minutes())
        };

        let escalation_history = self
            .get_escalation_history(ticket.tenant_id, ticket.id)
            .await
            .unwrap_or_default();

        let current_escalation_level = escalation_history
            .iter()
            .map(|e| e.level)
            .max()
            .unwrap_or(0);

        Ok(TicketSlaInfo {
            sla_due_at: Some(resolution_due_at),
            response_due_at: Some(response_due_at),
            is_breached,
            response_breached,
            time_remaining_minutes: time_remaining,
            response_time_remaining_minutes: response_time_remaining,
            current_escalation_level,
            escalation_history,
            policy_name: policy.as_ref().map(|p| p.name.clone()),
            resolution_hours: Some(resolution_hours),
            response_hours: Some(response_hours),
        })
    }

    async fn match_policy(&self, ticket: &Ticket) -> Result<Option<TicketSlaPolicy>, sqlx::Error> {
        let policy = sqlx::query_as::<_, TicketSlaPolicy>(
            r#"
            SELECT id, tenant_id, ticket_type, priority, response_time_min, resolution_time_min, is_active, created_at, updated_at FROM ticket.core_ticket_sla_policies
            WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
              AND is_active = true
              AND (ticket_type IS NULL OR ticket_type = $2)
              AND (severity IS NULL OR severity = $3)
            ORDER BY
              CASE WHEN ticket_type IS NOT NULL THEN 0 ELSE 1 END,
              CASE WHEN severity IS NOT NULL THEN 0 ELSE 1 END,
              is_default DESC,
              created_at ASC
            LIMIT 1
            "#,
        )
        .bind(ticket.tenant_id)
        .bind(&ticket.ticket_type)
        .bind(&ticket.severity)
        .fetch_optional(&self.pool)
        .await?;

        Ok(policy)
    }

    async fn get_escalation_history(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<SlaEscalationEvent>, sqlx::Error> {
        let events = sqlx::query_as::<_, SlaEscalationEvent>(
            r#"
            SELECT id, tenant_id, policy_id, level, role, notify_method, delay_min, created_at, updated_at FROM ticket.core_ticket_sla_escalations
            WHERE ticket_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
            ORDER BY level ASC, created_at ASC
            "#,
        )
        .bind(ticket_id)
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(events)
    }

    pub async fn check_and_escalate(
        &self,
        ticket: &Ticket,
    ) -> Result<Vec<SlaEscalationEvent>, sqlx::Error> {
        let sla_info = self.calculate_sla(ticket).await?;
        let policy = self.match_policy(ticket).await?;

        if policy.is_none() {
            return Ok(vec![]);
        }

        let policy = policy.unwrap();
        let mut new_escalations = Vec::new();
        let now = Utc::now();

        if ticket.status == "resolved" || ticket.status == "closed" || ticket.status == "cancelled"
        {
            return Ok(vec![]);
        }

        let escalation_hours = [
            policy.escalation_hours_1,
            policy.escalation_hours_2,
            policy.escalation_hours_3,
        ];

        for (i, hours) in escalation_hours.iter().enumerate() {
            let level = (i + 1) as i32;
            if level > policy.escalation_levels {
                break;
            }

            if let Some(hours) = hours {
                let escalation_due = Self::calculate_due_time(
                    ticket.created_at,
                    *hours,
                    policy.working_hours_only,
                    policy.business_hours_start.as_deref(),
                    policy.business_hours_end.as_deref(),
                    policy.weekend_excluded,
                );

                let already_escalated =
                    sla_info.escalation_history.iter().any(|e| e.level == level);

                if now >= escalation_due && !already_escalated {
                    let event = self
                        .record_escalation(
                            ticket.tenant_id,
                            ticket.id,
                            level,
                            Some(format!("SLA 第{}级升级：超过 {} 小时未解决", level, hours)),
                        )
                        .await?;
                    new_escalations.push(event);
                }
            }
        }

        Ok(new_escalations)
    }

    async fn record_escalation(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        level: i32,
        reason: Option<String>,
    ) -> Result<SlaEscalationEvent, sqlx::Error> {
        let event_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO ticket.core_ticket_sla_escalations
              (id, ticket_id, tenant_id, level, escalation_time, reason, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(event_id)
        .bind(ticket_id)
        .bind(tenant_id)
        .bind(level)
        .bind(now)
        .bind(&reason)
        .bind(now)
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ticket.core_ticket_activities
              (id, ticket_id, tenant_id, action, to_value, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(ticket_id)
        .bind(tenant_id)
        .bind("sla_escalated")
        .bind(level.to_string())
        .bind(now)
        .execute(&self.pool)
        .await?;

        let event = sqlx::query_as::<_, SlaEscalationEvent>(
            r#"
            SELECT id, tenant_id, policy_id, level, role, notify_method, delay_min, created_at, updated_at FROM ticket.core_ticket_sla_escalations WHERE id = $1
            "#,
        )
        .bind(event_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(event)
    }

    pub async fn create_policy(
        &self,
        tenant_id: Uuid,
        req: CreateSlaPolicyRequest,
    ) -> Result<TicketSlaPolicy, sqlx::Error> {
        let policy_id = Uuid::new_v4();
        let now = Utc::now();

        if req.is_default.unwrap_or(false) {
            sqlx::query(
                r#"
                UPDATE ticket.core_ticket_sla_policies
                SET is_default = false, updated_at = $1
                WHERE tenant_id = $2 AND is_default = true
                "#,
            )
            .bind(now)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;
        }

        sqlx::query(
            r#"
            INSERT INTO ticket.core_ticket_sla_policies
              (id, tenant_id, name, description, ticket_type, severity,
               response_hours, resolution_hours, escalation_levels,
               escalation_hours_1, escalation_hours_2, escalation_hours_3,
               working_hours_only, business_hours_start, business_hours_end,
               weekend_excluded, is_default, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            "#,
        )
        .bind(policy_id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.ticket_type)
        .bind(&req.severity)
        .bind(req.response_hours)
        .bind(req.resolution_hours)
        .bind(req.escalation_levels)
        .bind(req.escalation_hours_1)
        .bind(req.escalation_hours_2)
        .bind(req.escalation_hours_3)
        .bind(req.working_hours_only.unwrap_or(false))
        .bind(&req.business_hours_start)
        .bind(&req.business_hours_end)
        .bind(req.weekend_excluded.unwrap_or(false))
        .bind(req.is_default.unwrap_or(false))
        .bind(true)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_policy(Some(tenant_id), policy_id).await
    }

    pub async fn get_policy(
        &self,
        tenant_id: Option<Uuid>,
        policy_id: Uuid,
    ) -> Result<TicketSlaPolicy, sqlx::Error> {
        let policy = sqlx::query_as::<_, TicketSlaPolicy>(
            r#"
            SELECT id, tenant_id, ticket_type, priority, response_time_min, resolution_time_min, is_active, created_at, updated_at FROM ticket.core_ticket_sla_policies
            WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
            "#,
        )
        .bind(policy_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(policy)
    }

    pub async fn list_policies(
        &self,
        tenant_id: Option<Uuid>,
    ) -> Result<Vec<TicketSlaPolicy>, sqlx::Error> {
        let policies = sqlx::query_as::<_, TicketSlaPolicy>(
            r#"
            SELECT id, tenant_id, ticket_type, priority, response_time_min, resolution_time_min, is_active, created_at, updated_at FROM ticket.core_ticket_sla_policies
            WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
            ORDER BY is_default DESC, created_at DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(policies)
    }

    pub async fn update_policy(
        &self,
        tenant_id: Uuid,
        policy_id: Uuid,
        req: UpdateSlaPolicyRequest,
    ) -> Result<TicketSlaPolicy, sqlx::Error> {
        let now = Utc::now();

        if req.is_default.unwrap_or(false) {
            sqlx::query(
                r#"
                UPDATE ticket.core_ticket_sla_policies
                SET is_default = false, updated_at = $1
                WHERE tenant_id = $2 AND is_default = true AND id != $3
                "#,
            )
            .bind(now)
            .bind(tenant_id)
            .bind(policy_id)
            .execute(&self.pool)
            .await?;
        }

        sqlx::query(
            r#"
            UPDATE ticket.core_ticket_sla_policies SET
              name = COALESCE($1, name),
              description = COALESCE($2, description),
              response_hours = COALESCE($3, response_hours),
              resolution_hours = COALESCE($4, resolution_hours),
              escalation_levels = COALESCE($5, escalation_levels),
              escalation_hours_1 = COALESCE($6, escalation_hours_1),
              escalation_hours_2 = COALESCE($7, escalation_hours_2),
              escalation_hours_3 = COALESCE($8, escalation_hours_3),
              working_hours_only = COALESCE($9, working_hours_only),
              weekend_excluded = COALESCE($10, weekend_excluded),
              is_default = COALESCE($11, is_default),
              is_active = COALESCE($12, is_active),
              updated_at = $13
            WHERE id = $14 AND tenant_id = $15
            "#,
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(req.response_hours)
        .bind(req.resolution_hours)
        .bind(req.escalation_levels)
        .bind(req.escalation_hours_1)
        .bind(req.escalation_hours_2)
        .bind(req.escalation_hours_3)
        .bind(req.working_hours_only)
        .bind(req.weekend_excluded)
        .bind(req.is_default)
        .bind(req.is_active)
        .bind(now)
        .bind(policy_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await?;

        self.get_policy(Some(tenant_id), policy_id).await
    }

    pub async fn delete_policy(
        &self,
        tenant_id: Uuid,
        policy_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE ticket.core_ticket_sla_policies SET deleted_at = NOW()
            WHERE id = $1 AND tenant_id = $2 AND is_default = false
            "#,
        )
        .bind(policy_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_sla_stats(&self, tenant_id: Option<Uuid>) -> Result<TicketSlaStats, sqlx::Error> {
        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM ticket.core_tickets
            WHERE ($1::uuid IS NULL OR tenant_id = $1) AND sla_due_at IS NOT NULL
              AND status IN ('resolved', 'closed')
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let breached: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM ticket.core_tickets
            WHERE ($1::uuid IS NULL OR tenant_id = $1) AND sla_due_at IS NOT NULL
              AND status IN ('resolved', 'closed')
              AND resolved_at > sla_due_at
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let on_time = total - breached;
        let breach_rate = if total > 0 {
            breached as f64 / total as f64
        } else {
            0.0
        };

        let avg_resolution: Option<f64> = sqlx::query_scalar(
            r#"
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
            FROM ticket.core_tickets
            WHERE ($1::uuid IS NULL OR tenant_id = $1) AND resolved_at IS NOT NULL
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let avg_response: Option<f64> = sqlx::query_scalar(
            r#"
            SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)
            FROM (
              SELECT t.created_at, MIN(c.created_at) as first_response_at
              FROM ticket.core_tickets t
              JOIN ticket.core_ticket_comments c ON t.id = c.ticket_id
              WHERE ($1::uuid IS NULL OR t.tenant_id = $1) AND c.user_id != t.reporter_id
              GROUP BY t.id, t.created_at
            ) sub
            "#,
        )
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?
        .flatten();

        let severity_rows = sqlx::query(
            r#"
            SELECT
              t.severity,
              COUNT(*) as total,
              SUM(CASE WHEN t.resolved_at > t.sla_due_at THEN 1 ELSE 0 END) as breached
            FROM ticket.core_tickets t
            WHERE ($1::uuid IS NULL OR t.tenant_id = $1) AND t.sla_due_at IS NOT NULL
              AND t.status IN ('resolved', 'closed')
            GROUP BY t.severity
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        let by_severity: Vec<SlaSeverityStat> = severity_rows
            .into_iter()
            .map(|r| {
                let total: i64 = r.get("total");
                let breached: i64 = r.get("breached");
                SlaSeverityStat {
                    severity: r.get("severity"),
                    total,
                    breached,
                    breach_rate: if total > 0 {
                        breached as f64 / total as f64
                    } else {
                        0.0
                    },
                }
            })
            .collect();

        let type_rows = sqlx::query(
            r#"
            SELECT
              t.ticket_type,
              COUNT(*) as total,
              SUM(CASE WHEN t.resolved_at > t.sla_due_at THEN 1 ELSE 0 END) as breached
            FROM ticket.core_tickets t
            WHERE ($1::uuid IS NULL OR t.tenant_id = $1) AND t.sla_due_at IS NOT NULL
              AND t.status IN ('resolved', 'closed')
            GROUP BY t.ticket_type
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        let by_type: Vec<SlaTypeStat> = type_rows
            .into_iter()
            .map(|r| {
                let total: i64 = r.get("total");
                let breached: i64 = r.get("breached");
                SlaTypeStat {
                    ticket_type: r.get("ticket_type"),
                    total,
                    breached,
                    breach_rate: if total > 0 {
                        breached as f64 / total as f64
                    } else {
                        0.0
                    },
                }
            })
            .collect();

        let trend_rows = sqlx::query(
            r#"
            SELECT
              DATE(created_at) as date,
              COUNT(*) as total,
              SUM(CASE WHEN sla_due_at IS NOT NULL AND resolved_at > sla_due_at THEN 1 ELSE 0 END) as breached
            FROM ticket.core_tickets
            WHERE ($1::uuid IS NULL OR tenant_id = $1)
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        let breach_trend: Vec<SlaBreachTrendItem> = trend_rows
            .into_iter()
            .map(|r| SlaBreachTrendItem {
                date: r.get::<chrono::NaiveDate, _>("date").to_string(),
                total: r.get("total"),
                breached: r.get("breached"),
            })
            .collect();

        Ok(TicketSlaStats {
            total,
            on_time,
            breached,
            breach_rate,
            avg_resolution_minutes: avg_resolution,
            avg_response_minutes: avg_response,
            by_severity,
            by_type,
            breach_trend,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== is_sla_breached ==========

    #[test]
    fn test_is_sla_breached_not_breached() {
        // created at 0, sla 1 hour, now 1800s (30 min) -> not breached
        assert!(!is_sla_breached(0, 1, 1800));
    }

    #[test]
    fn test_is_sla_breached_at_deadline() {
        // created at 0, sla 1 hour (3600s), now exactly 3600 -> not breached (equal)
        assert!(!is_sla_breached(0, 1, 3600));
    }

    #[test]
    fn test_is_sla_breached_over_deadline() {
        // created at 0, sla 1 hour, now 3601s -> breached
        assert!(is_sla_breached(0, 1, 3601));
    }

    #[test]
    fn test_is_sla_breached_zero_sla() {
        assert!(!is_sla_breached(0, 0, 999999));
    }

    #[test]
    fn test_is_sla_breached_negative_sla() {
        assert!(!is_sla_breached(0, -5, 100));
    }

    #[test]
    fn test_is_sla_breached_large_values() {
        let created = 1_700_000_000;
        let sla_hours = 24;
        assert!(!is_sla_breached(created, sla_hours, created + 86399));
        assert!(is_sla_breached(created, sla_hours, created + 86401));
    }

    #[test]
    fn test_is_sla_breached_with_offset() {
        // created at 1000, sla 2 hours (7200s), now 8199 -> not breached
        assert!(!is_sla_breached(1000, 2, 8199));
        // now 8201 -> breached
        assert!(is_sla_breached(1000, 2, 8201));
    }

    // ========== sla_remaining_seconds ==========

    #[test]
    fn test_sla_remaining_positive() {
        // 3600 - 1800 = 1800 remaining
        assert_eq!(sla_remaining_seconds(0, 3600, 1800), 1800);
    }

    #[test]
    fn test_sla_remaining_zero() {
        assert_eq!(sla_remaining_seconds(0, 3600, 3600), 0);
    }

    #[test]
    fn test_sla_remaining_negative() {
        assert_eq!(sla_remaining_seconds(0, 3600, 7200), -3600);
    }

    #[test]
    fn test_sla_remaining_with_offset() {
        assert_eq!(sla_remaining_seconds(1000, 500, 1300), 200);
    }

    #[test]
    fn test_sla_remaining_zero_sla() {
        assert_eq!(sla_remaining_seconds(100, 0, 200), -100);
    }

    #[test]
    fn test_sla_remaining_large_values() {
        let created = 1_700_000_000;
        assert_eq!(sla_remaining_seconds(created, 86400, created), 86400);
        assert_eq!(sla_remaining_seconds(created, 86400, created + 86400), 0);
        assert_eq!(
            sla_remaining_seconds(created, 86400, created + 172800),
            -86400
        );
    }

    // ========== sla_compliance_rate ==========

    #[test]
    fn test_compliance_rate_all_compliant() {
        assert_eq!(sla_compliance_rate(10, 0), 1.0);
    }

    #[test]
    fn test_compliance_rate_all_breached() {
        assert_eq!(sla_compliance_rate(10, 10), 0.0);
    }

    #[test]
    fn test_compliance_rate_half() {
        assert_eq!(sla_compliance_rate(10, 5), 0.5);
    }

    #[test]
    fn test_compliance_rate_zero_total() {
        assert_eq!(sla_compliance_rate(0, 0), 0.0);
    }

    #[test]
    fn test_compliance_rate_breached_exceeds_total() {
        // breached > total should be clamped
        assert_eq!(sla_compliance_rate(5, 10), 0.0);
    }

    #[test]
    fn test_compliance_rate_one_third() {
        let rate = sla_compliance_rate(9, 3);
        assert!((rate - (6.0 / 9.0)).abs() < 1e-9);
    }

    // ========== response_time_stats ==========

    #[test]
    fn test_response_stats_empty() {
        assert_eq!(response_time_stats(&[]), (0.0, 0.0, 0.0));
    }

    #[test]
    fn test_response_stats_single() {
        assert_eq!(response_time_stats(&[5.0]), (5.0, 5.0, 5.0));
    }

    #[test]
    fn test_response_stats_multiple() {
        let (min, avg, max) = response_time_stats(&[1.0, 2.0, 3.0, 4.0, 5.0]);
        assert_eq!(min, 1.0);
        assert_eq!(max, 5.0);
        assert!((avg - 3.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_stats_with_negatives() {
        let (min, avg, max) = response_time_stats(&[-1.0, 0.0, 1.0]);
        assert_eq!(min, -1.0);
        assert_eq!(max, 1.0);
        assert!((avg - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_stats_duplicates() {
        let (min, avg, max) = response_time_stats(&[7.0, 7.0, 7.0]);
        assert_eq!(min, 7.0);
        assert_eq!(max, 7.0);
        assert!((avg - 7.0).abs() < 1e-9);
    }

    #[test]
    fn test_response_stats_two_elements() {
        let (min, avg, max) = response_time_stats(&[3.0, 9.0]);
        assert_eq!(min, 3.0);
        assert_eq!(max, 9.0);
        assert!((avg - 6.0).abs() < 1e-9);
    }

    // ========== ticket_age_days ==========

    #[test]
    fn test_ticket_age_zero() {
        assert_eq!(ticket_age_days(100, 100), 0);
    }

    #[test]
    fn test_ticket_age_one_day() {
        assert_eq!(ticket_age_days(0, 86400), 1);
    }

    #[test]
    fn test_ticket_age_partial_day() {
        assert_eq!(ticket_age_days(0, 86399), 0);
    }

    #[test]
    fn test_ticket_age_future() {
        // now before created -> 0
        assert_eq!(ticket_age_days(1000, 500), 0);
    }

    #[test]
    fn test_ticket_age_multiple_days() {
        assert_eq!(ticket_age_days(0, 86400 * 7), 7);
    }

    #[test]
    fn test_ticket_age_with_offset() {
        assert_eq!(ticket_age_days(86400, 86400 * 4), 3);
    }

    // ========== calculate_due_time（工作时间模式） ==========

    use chrono::TimeZone;

    #[test]
    fn test_due_time_before_business_hours() {
        // 周一 2024-01-01 08:30（上班时间 9:00 之前）创建，SLA 2 个工作小时
        // 时钟应从 9:00 起算，到期时间 = 11:00（修复前错误地从 8:30 起算得到 10:30）
        let start = Utc.with_ymd_and_hms(2024, 1, 1, 8, 30, 0).unwrap();
        let due = TicketSlaService::calculate_due_time(
            start,
            2.0,
            true,
            Some("09:00"),
            Some("18:00"),
            false,
        );
        assert_eq!(due, Utc.with_ymd_and_hms(2024, 1, 1, 11, 0, 0).unwrap());
    }

    #[test]
    fn test_due_time_before_business_hours_crosses_day() {
        // 周一 2024-01-01 08:30 创建，SLA 9.5 个工作小时：
        // 当日 9:00-18:00 共 9 小时，余 0.5 小时顺延至次日 9:00 起算 -> 2024-01-02 09:30
        let start = Utc.with_ymd_and_hms(2024, 1, 1, 8, 30, 0).unwrap();
        let due = TicketSlaService::calculate_due_time(
            start,
            9.5,
            true,
            Some("09:00"),
            Some("18:00"),
            false,
        );
        assert_eq!(due, Utc.with_ymd_and_hms(2024, 1, 2, 9, 30, 0).unwrap());
    }

    #[test]
    fn test_due_time_weekend_skipped() {
        // 周六 2024-01-06 10:00 创建，SLA 2 个工作小时且排除周末
        // 跳过周六、周日，周一 2024-01-08 09:00 起算 -> 11:00
        let start = Utc.with_ymd_and_hms(2024, 1, 6, 10, 0, 0).unwrap();
        assert_eq!(start.naive_utc().weekday(), Weekday::Sat);
        let due = TicketSlaService::calculate_due_time(
            start,
            2.0,
            true,
            Some("09:00"),
            Some("18:00"),
            true,
        );
        assert_eq!(due, Utc.with_ymd_and_hms(2024, 1, 8, 11, 0, 0).unwrap());
    }
}
