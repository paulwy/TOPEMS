use sqlx::{PgPool, Row};
use tracing::instrument;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[instrument(level = "info", skip(db))]
pub async fn calculate_project_progress(db: &PgPool, project_id: Uuid) -> Result<i32, sqlx::Error> {
    let phase_stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_phases,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_phases,
            COALESCE(SUM(progress), 0) as total_progress,
            SUM(CASE WHEN status = 'completed' THEN weight ELSE 0 END) as completed_weight,
            COALESCE(SUM(weight), 0) as total_weight
        FROM rs.project_phases 
        WHERE project_id = $1
        "#
    )
    .bind(project_id)
    .fetch_one(db)
    .await?;

    let total_phases: i64 = phase_stats.get("total_phases");
    let completed_phases: i64 = phase_stats.get("completed_phases");
    let total_progress: i64 = phase_stats.get("total_progress");
    let completed_weight: i64 = phase_stats.get("completed_weight");
    let total_weight: i64 = phase_stats.get("total_weight");

    let calculated_progress = if total_weight > 0 {
        (completed_weight as f64 / total_weight as f64 * 100.0).round() as i32
    } else if total_phases > 0 {
        let avg_progress = if total_phases > 0 {
            total_progress as f64 / total_phases as f64
        } else {
            0.0
        };
        let completion_ratio = completed_phases as f64 / total_phases as f64;
        ((avg_progress + completion_ratio * 100.0) / 2.0).round() as i32
    } else {
        0
    };

    Ok(calculated_progress.min(100))
}

#[instrument(level = "info", skip(db, project_id))]
pub async fn update_project_progress(db: &PgPool, project_id: Uuid) -> Result<i32, sqlx::Error> {
    let progress = calculate_project_progress(db, project_id).await?;

    sqlx::query(
        r#"
        UPDATE rs.projects 
        SET progress = $1, updated_at = NOW()
        WHERE id = $2
        "#
    )
    .bind(progress)
    .bind(project_id)
    .execute(db)
    .await?;

    tracing::info!(project_id = %project_id, progress = progress, "项目进度已更新");

    Ok(progress)
}

#[instrument(level = "info", skip(db, project_id, milestone_id))]
pub async fn on_milestone_achieved(db: &PgPool, project_id: Uuid, milestone_id: Uuid) -> Result<(), sqlx::Error> {
    let phase_result = sqlx::query(
        r#"
        SELECT phase_id FROM rs.project_milestones WHERE id = $1
        "#
    )
    .bind(milestone_id)
    .fetch_optional(db)
    .await?;

    if let Some(row) = phase_result {
        let phase_id: Option<Uuid> = row.get("phase_id");
        if let Some(pid) = phase_id {
            check_phase_completion(db, project_id, pid).await?;
        }
    }

    Ok(())
}

#[instrument(level = "info", skip(db, project_id, phase_id))]
pub async fn check_phase_completion(db: &PgPool, project_id: Uuid, phase_id: Uuid) -> Result<bool, sqlx::Error> {
    let milestone_stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_milestones,
            SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) as achieved_milestones
        FROM rs.project_milestones 
        WHERE phase_id = $1
        "#
    )
    .bind(phase_id)
    .fetch_one(db)
    .await?;

    let total_milestones: i64 = milestone_stats.get("total_milestones");
    let achieved_milestones: i64 = milestone_stats.get("achieved_milestones");

    if total_milestones > 0 && achieved_milestones == total_milestones {
        sqlx::query(
            r#"
            UPDATE rs.project_phases 
            SET status = 'completed', progress = 100, updated_at = NOW()
            WHERE id = $1
            "#
        )
        .bind(phase_id)
        .execute(db)
        .await?;

        tracing::info!(phase_id = %phase_id, "阶段已自动完成");
        Ok(true)
    } else {
        Ok(false)
    }
}

#[instrument(level = "info", skip(db))]
pub async fn get_project_timeline(db: &PgPool, project_id: Uuid) -> Result<Vec<(DateTime<Utc>, String, String)>, sqlx::Error> {
    let mut timeline: Vec<(DateTime<Utc>, String, String)> = Vec::new();

    let phases = sqlx::query(
        r#"
        SELECT name, start_date, end_date, status 
        FROM rs.project_phases 
        WHERE project_id = $1 
        ORDER BY phase_number
        "#
    )
    .bind(project_id)
    .fetch_all(db)
    .await?;

    for row in phases {
        let name: String = row.get("name");
        let status: String = row.get("status");
        if let Some(start_date) = row.get::<Option<DateTime<Utc>>, _>("start_date") {
            timeline.push((start_date, name.clone(), format!("阶段开始: {}", status)));
        }
        if let Some(end_date) = row.get::<Option<DateTime<Utc>>, _>("end_date") {
            timeline.push((end_date, name, format!("阶段结束: {}", status)));
        }
    }

    let milestones = sqlx::query(
        r#"
        SELECT name, target_date, actual_date, status 
        FROM rs.project_milestones 
        WHERE project_id = $1 
        ORDER BY target_date
        "#
    )
    .bind(project_id)
    .fetch_all(db)
    .await?;

    for row in milestones {
        let name: String = row.get("name");
        let status: String = row.get("status");
        if let Some(target_date) = row.get::<Option<DateTime<Utc>>, _>("target_date") {
            timeline.push((target_date, name.clone(), "里程碑目标日期".to_string()));
        }
        if let Some(actual_date) = row.get::<Option<DateTime<Utc>>, _>("actual_date") {
            timeline.push((actual_date, name, format!("里程碑完成: {}", status)));
        }
    }

    timeline.sort_by_key(|t| t.0);

    Ok(timeline)
}