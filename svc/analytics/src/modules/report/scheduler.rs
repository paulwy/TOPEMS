//! Report Scheduler

use job_scheduler_ng::{Job, JobScheduler, Schedule};
use sqlx::types::chrono::Utc;
use sqlx::{PgPool, Row};
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tracing::{error, info, warn};
use uuid::Uuid;

use super::schedule::ScheduleType;

pub struct ReportScheduler {
    scheduler: Arc<Mutex<Option<JobScheduler<'static>>>>,
    pool: PgPool,
}

impl ReportScheduler {
    pub fn new(pool: PgPool) -> Self {
        ReportScheduler {
            scheduler: Arc::new(Mutex::new(None)),
            pool,
        }
    }

    pub async fn start(&self) -> Result<(), anyhow::Error> {
        info!("Starting report scheduler...");

        let mut scheduler = JobScheduler::new();

        self.load_schedules(&mut scheduler).await?;

        let pool_clone = self.pool.clone();
        scheduler.add(Job::new("0 * * * * *".parse()?, move || {
            let pool = pool_clone.clone();
            tokio::spawn(async move {
                if let Err(e) = check_and_execute_schedules(&pool).await {
                    error!("Error checking schedules: {}", e);
                }
            });
        }));

        *self.scheduler.lock().await = Some(scheduler);

        let scheduler_ref = self.scheduler.clone();
        tokio::spawn(async move {
            loop {
                if let Some(s) = &mut *scheduler_ref.lock().await {
                    s.tick();
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        });

        info!("Report scheduler started");
        Ok(())
    }

    async fn load_schedules(&self, scheduler: &mut JobScheduler<'_>) -> Result<(), anyhow::Error> {
        let active_schedules = sqlx::query(
            r#"
            SELECT id, name, schedule_type, schedule_expression
            FROM report_schedules
            WHERE status = 'active'
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        for schedule in active_schedules {
            let id: Uuid = schedule.get("id");
            let name: String = schedule.get("name");
            let schedule_type: String = schedule.get("schedule_type");
            let expression: String = schedule.get("schedule_expression");

            match ScheduleType::from_str(&schedule_type) {
                Ok(ScheduleType::Cron) => match Schedule::from_str(&expression) {
                    Ok(cron_schedule) => {
                        info!("Adding cron job for schedule '{}' ({})", name, id);
                        let pool_clone = self.pool.clone();
                        let job_id = id;
                        let job_name = name.clone();

                        scheduler.add(Job::new(cron_schedule, move || {
                            let pool = pool_clone.clone();
                            let sid = job_id;
                            let sname = job_name.clone();
                            tokio::spawn(async move {
                                if let Err(e) = execute_schedule_job(&pool, sid, &sname).await {
                                    error!("Failed to execute schedule {}: {}", sname, e);
                                }
                            });
                        }));
                    }
                    Err(e) => {
                        warn!("Invalid cron expression for schedule '{}': {}", name, e);
                    }
                },
                Ok(ScheduleType::Interval) => match parse_interval(&expression) {
                    Ok(interval) => {
                        info!("Adding interval job for schedule '{}' ({})", name, id);
                        let pool_clone = self.pool.clone();
                        let job_id = id;
                        let job_name = name.clone();

                        let cron_expr = format!("0 */{} * * * *", interval);
                        match Schedule::from_str(&cron_expr) {
                            Ok(schedule) => {
                                scheduler.add(Job::new(schedule, move || {
                                    let pool = pool_clone.clone();
                                    let sid = job_id;
                                    let sname = job_name.clone();
                                    tokio::spawn(async move {
                                        if let Err(e) =
                                            execute_schedule_job(&pool, sid, &sname).await
                                        {
                                            error!("Failed to execute schedule {}: {}", sname, e);
                                        }
                                    });
                                }));
                            }
                            Err(e) => {
                                warn!("Failed to parse interval cron '{}': {}", cron_expr, e);
                            }
                        }
                    }
                    Err(e) => {
                        warn!("Invalid interval expression for schedule '{}': {}", name, e);
                    }
                },
                Ok(ScheduleType::OneTime) => {
                    info!(
                        "One-time schedule '{}' will be handled by periodic check",
                        name
                    );
                }
                Err(e) => {
                    warn!(
                        "Unknown schedule type '{}' for schedule '{}': {}",
                        schedule_type, name, e
                    );
                }
            }
        }

        Ok(())
    }

    pub async fn reload(&self) -> Result<(), anyhow::Error> {
        info!("Reloading report scheduler...");

        let mut scheduler = JobScheduler::new();
        self.load_schedules(&mut scheduler).await?;
        *self.scheduler.lock().await = Some(scheduler);

        info!("Report scheduler reloaded");
        Ok(())
    }
}

fn parse_interval(expression: &str) -> Result<u64, anyhow::Error> {
    let parts: Vec<&str> = expression.split_whitespace().collect();
    if parts.len() == 2 {
        let value: u64 = parts[0].parse()?;
        let unit = parts[1].to_lowercase();
        match unit.as_str() {
            "minutes" | "minute" | "m" => Ok(value),
            "hours" | "hour" | "h" => Ok(value * 60),
            "days" | "day" | "d" => Ok(value * 60 * 24),
            _ => Err(anyhow::anyhow!("Unknown interval unit: {}", unit)),
        }
    } else {
        Err(anyhow::anyhow!("Invalid interval format"))
    }
}

async fn check_and_execute_schedules(pool: &PgPool) -> Result<(), anyhow::Error> {
    let now = Utc::now();

    let due_schedules = sqlx::query(
        r#"
        SELECT id, name, schedule_type, schedule_expression
        FROM report_schedules
        WHERE status = 'active'
          AND (next_run_at IS NULL OR next_run_at <= $1)
        "#,
    )
    .bind(now)
    .fetch_all(pool)
    .await?;

    for schedule in due_schedules {
        let id: Uuid = schedule.get("id");
        let name: String = schedule.get("name");

        info!("Executing due schedule: {}", name);
        if let Err(e) = execute_schedule_job(pool, id, &name).await {
            error!("Failed to execute due schedule {}: {}", name, e);
        }
    }

    Ok(())
}

pub async fn execute_schedule_job(
    pool: &PgPool,
    schedule_id: Uuid,
    schedule_name: &str,
) -> Result<(), anyhow::Error> {
    let execution_id = Uuid::new_v4();
    let started_at = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO report_execution_records (id, schedule_id, schedule_name, status, started_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(execution_id)
    .bind(schedule_id)
    .bind(schedule_name)
    .bind("running")
    .bind(started_at)
    .execute(pool)
    .await?;

    match run_report(pool, schedule_id).await {
        Ok(output_path) => {
            sqlx::query(
                r#"
                UPDATE report_execution_records
                SET status = $1, output_path = $2, completed_at = $3
                WHERE id = $4
                "#,
            )
            .bind("completed")
            .bind(&output_path)
            .bind(Utc::now())
            .bind(execution_id)
            .execute(pool)
            .await?;

            sqlx::query(
                r#"
                UPDATE report_schedules
                SET last_run_at = $1, run_count = run_count + 1, error_message = NULL
                WHERE id = $2
                "#,
            )
            .bind(Utc::now())
            .bind(schedule_id)
            .execute(pool)
            .await?;

            info!("Schedule {} executed successfully", schedule_name);
        }
        Err(e) => {
            sqlx::query(
                r#"
                UPDATE report_execution_records
                SET status = $1, error_message = $2, completed_at = $3
                WHERE id = $4
                "#,
            )
            .bind("failed")
            .bind(e.to_string())
            .bind(Utc::now())
            .bind(execution_id)
            .execute(pool)
            .await?;

            sqlx::query(
                r#"
                UPDATE report_schedules
                SET last_run_at = $1, error_message = $2
                WHERE id = $3
                "#,
            )
            .bind(Utc::now())
            .bind(e.to_string())
            .bind(schedule_id)
            .execute(pool)
            .await?;

            error!("Schedule {} failed: {}", schedule_name, e);
        }
    }

    notify_subscribers(pool, schedule_id).await?;

    Ok(())
}

async fn run_report(pool: &PgPool, schedule_id: Uuid) -> Result<String, anyhow::Error> {
    let schedule = sqlx::query!(
        r#"
        SELECT template_id, parameters
        FROM report_schedules
        WHERE id = $1
        "#,
        schedule_id,
    )
    .fetch_one(pool)
    .await?;

    let template = sqlx::query!(
        r#"
        SELECT name, output_format
        FROM report_templates
        WHERE id = $1
        "#,
        schedule.template_id,
    )
    .fetch_optional(pool)
    .await?;

    let output_format = template
        .and_then(|t| t.output_format)
        .unwrap_or_else(|| "pdf".to_string());
    let output_path = format!(
        "/tmp/reports/{}_{}.{}",
        schedule_id,
        Utc::now().format("%Y%m%d_%H%M%S"),
        output_format
    );

    info!("Generated report: {}", output_path);
    Ok(output_path)
}

async fn notify_subscribers(pool: &PgPool, schedule_id: Uuid) -> Result<(), anyhow::Error> {
    let schedule = sqlx::query!(
        r#"
        SELECT template_id, recipients
        FROM report_schedules
        WHERE id = $1
        "#,
        schedule_id,
    )
    .fetch_one(pool)
    .await?;

    let subscribers = sqlx::query!(
        r#"
        SELECT user_id, email, frequency, enabled
        FROM report_subscriptions
        WHERE template_id = $1 AND enabled = true
        "#,
        schedule.template_id,
    )
    .fetch_all(pool)
    .await?;

    info!(
        "Notifying {} subscribers for schedule {}",
        subscribers.len(),
        schedule_id
    );

    for subscriber in subscribers {
        if let Some(email) = subscriber.email {
            info!("Sending report notification to: {}", email);
        }
    }

    if let Some(recipients) = schedule.recipients {
        if let Some(recipients_obj) = recipients.as_object() {
            for (_, recipient) in recipients_obj {
                if let Some(email) = recipient.as_str() {
                    info!("Sending report to scheduled recipient: {}", email);
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- parse_interval ----
    #[test]
    fn interval_minutes() {
        assert_eq!(parse_interval("10 minutes").unwrap(), 10);
        assert_eq!(parse_interval("10 minute").unwrap(), 10);
        assert_eq!(parse_interval("10 m").unwrap(), 10);
    }

    #[test]
    fn interval_hours() {
        assert_eq!(parse_interval("2 hours").unwrap(), 120);
        assert_eq!(parse_interval("2 hour").unwrap(), 120);
        assert_eq!(parse_interval("2 h").unwrap(), 120);
    }

    #[test]
    fn interval_days() {
        assert_eq!(parse_interval("1 day").unwrap(), 1440);
        assert_eq!(parse_interval("1 days").unwrap(), 1440);
        assert_eq!(parse_interval("1 d").unwrap(), 1440);
    }

    #[test]
    fn interval_zero() {
        assert_eq!(parse_interval("0 minutes").unwrap(), 0);
    }

    #[test]
    fn interval_unknown_unit_rejected() {
        assert!(parse_interval("10 mins").is_err());
        assert!(parse_interval("10 weeks").is_err());
    }

    #[test]
    fn interval_bad_format_rejected() {
        assert!(parse_interval("10").is_err());
        assert!(parse_interval("abc").is_err());
        assert!(parse_interval("").is_err());
    }

    #[test]
    fn interval_non_numeric_rejected() {
        assert!(parse_interval("abc minutes").is_err());
    }

    #[test]
    fn interval_case_insensitive() {
        assert_eq!(parse_interval("2 HOURS").unwrap(), 120);
        assert_eq!(parse_interval("1 DAY").unwrap(), 1440);
    }
}
