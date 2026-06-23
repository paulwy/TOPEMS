use serde_json::Value;
use sqlx::{PgPool, Row};
use tracing::{info, warn};

use topems_shared::event::{EventType, EhsHazardReportedPayload, LimsInspectionAbnormalDetectedPayload, QmsInspectionCompletedPayload};

pub async fn handle_qms_inspection_completed(
    pool: &PgPool,
    payload: &QmsInspectionCompletedPayload,
) -> anyhow::Result<()> {
    info!("处理QMS检验完成事件 - 同步到LIMS: {}", payload.inspection_no);

    let sample_no = format!("{}-SMP", payload.inspection_no);
    
    let _ = sqlx::query(
        "INSERT INTO qa_lab_samples (sample_no, sample_name, sample_type, source, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (sample_no) DO UPDATE SET updated_at = NOW()"
    )
    .bind(sample_no)
    .bind(payload.product_name.as_deref().unwrap_or("未知产品"))
    .bind("产品检验样品")
    .bind("QMS同步")
    .bind("registered")
    .execute(pool)
    .await;

    info!("QMS检验结果已同步到LIMS样品登记");
    Ok(())
}

pub async fn handle_ehs_hazard_reported(
    pool: &PgPool,
    payload: &EhsHazardReportedPayload,
) -> anyhow::Result<()> {
    info!("处理EHS隐患上报事件 - 触发QMS纠正措施: {}", payload.hazard_no);

    let action_title = format!("EHS隐患整改: {}", payload.title);
    let description = format!(
        "隐患编号: {}\n类别: {}\n等级: {}\n位置: {}\n描述: {}",
        payload.hazard_no,
        payload.category,
        payload.level,
        payload.location.as_deref().unwrap_or("未知"),
        payload.description.as_deref().unwrap_or("无")
    );

    let action_no = format!("CAP-{}-{}", payload.hazard_no, uuid::Uuid::new_v4().simple().to_string().chars().take(4).collect::<String>());
    let priority = if payload.level == "high" || payload.level == "critical" { "high" } else { "medium" };

    let _ = sqlx::query(
        "INSERT INTO qa_corrective_actions (action_no, title, description, status, priority, created_by, related_issue_id, related_issue_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(action_no)
    .bind(action_title)
    .bind(description)
    .bind("pending")
    .bind(priority)
    .bind(payload.reported_by.as_deref().unwrap_or("system"))
    .bind(payload.hazard_id)
    .bind("EHS_HAZARD")
    .execute(pool)
    .await;

    info!("EHS隐患已触发QMS纠正措施");
    Ok(())
}

pub async fn handle_lims_inspection_abnormal(
    pool: &PgPool,
    payload: &LimsInspectionAbnormalDetectedPayload,
) -> anyhow::Result<()> {
    info!("处理LIMS检测异常事件 - 上报EHS: {}", payload.task_no);

    let hazard_title = format!("LIMS检测异常: {}", payload.test_item);
    let description = format!(
        "任务编号: {}\n样品编号: {}\n检测项目: {}\n异常数据: {}\n结论: {}",
        payload.task_no,
        payload.sample_no,
        payload.test_item,
        payload.abnormal_data,
        payload.conclusion
    );

    let hazard_no = format!("HAZ-LIMS-{}", uuid::Uuid::new_v4().simple().to_string().chars().take(8).collect::<String>());
    let level = if payload.conclusion.contains("严重") || payload.conclusion.contains("超标") { "high" } else { "medium" };

    let _ = sqlx::query(
        "INSERT INTO ehs_hazards (hazard_no, title, category, level, location, description, status, reported_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(hazard_no)
    .bind(hazard_title)
    .bind("化学品/实验室")
    .bind(level)
    .bind("实验室")
    .bind(description)
    .bind("pending")
    .bind("LIMS系统")
    .execute(pool)
    .await;

    info!("LIMS检测异常已上报EHS");
    Ok(())
}

pub async fn process_event(
    pool: &PgPool,
    event_type: EventType,
    payload: &Value,
) -> anyhow::Result<()> {
    match event_type {
        EventType::QmsInspectionCompleted => {
            let parsed = serde_json::from_value::<QmsInspectionCompletedPayload>(payload.clone())?;
            handle_qms_inspection_completed(pool, &parsed).await?;
        }
        EventType::EhsHazardReported => {
            let parsed = serde_json::from_value::<EhsHazardReportedPayload>(payload.clone())?;
            handle_ehs_hazard_reported(pool, &parsed).await?;
        }
        EventType::LimsInspectionAbnormalDetected => {
            let parsed = serde_json::from_value::<LimsInspectionAbnormalDetectedPayload>(payload.clone())?;
            handle_lims_inspection_abnormal(pool, &parsed).await?;
        }
        _ => warn!("未处理的事件类型: {:?}", event_type),
    }
    Ok(())
}