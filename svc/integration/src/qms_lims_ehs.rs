use serde_json::Value;
use sqlx::{PgPool, Row};
use tracing::{info, warn};

use topems_shared::event::{
    EventType, EhsHazardReportedPayload, EhsAccidentReportedPayload,
    LimsInspectionAbnormalDetectedPayload, LimsReagentAlertPayload, LimsRecordCompletedPayload,
    QmsInspectionCompletedPayload, QmsQualityIssueCreatedPayload,
};

pub async fn handle_qms_inspection_completed(
    pool: &PgPool,
    payload: &QmsInspectionCompletedPayload,
) -> anyhow::Result<()> {
    info!("处理QMS检验完成事件 - 同步到LIMS: {}", payload.inspection_no);

    let sample_no = format!("{}-SMP", payload.inspection_no);

    let _ = sqlx::query(
        "INSERT INTO qa_lab_samples (sample_no, sample_name, sample_type, source, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (sample_no) DO UPDATE SET updated_at = NOW()"
    )
    .bind(&sample_no)
    .bind(payload.product_name.as_deref().unwrap_or("未知产品"))
    .bind("产品检验样品")
    .bind("QMS同步")
    .bind("registered")
    .execute(pool)
    .await;

    let task_no = format!("{}-TASK", payload.inspection_no);
    let _ = sqlx::query(
        "INSERT INTO qa_lab_tasks (task_no, sample_no, test_items, status, priority) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (task_no) DO UPDATE SET updated_at = NOW()"
    )
    .bind(task_no)
    .bind(&sample_no)
    .bind(serde_json::json!(["外观检查", "尺寸测量", "性能测试"]))
    .bind("pending")
    .bind("normal")
    .execute(pool)
    .await;

    info!("QMS检验结果已同步到LIMS样品登记和检验任务");
    Ok(())
}

pub async fn handle_qms_quality_issue_created(
    pool: &PgPool,
    payload: &QmsQualityIssueCreatedPayload,
) -> anyhow::Result<()> {
    info!("处理QMS质量问题创建事件 - 触发EHS安全检查: {}", payload.issue_no);

    let hazard_no = format!("HAZ-QMS-{}", uuid::Uuid::new_v4().simple().to_string().chars().take(8).collect::<String>());
    let level = match payload.severity.as_deref() {
        Some("critical") | Some("high") => "high",
        Some("medium") => "medium",
        _ => "low",
    };

    let _ = sqlx::query(
        "INSERT INTO qa_ehs_hazards (hazard_no, title, category, level, location, description, status, reported_by, related_inspection_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(hazard_no)
    .bind(payload.title.clone())
    .bind("质量相关")
    .bind(level)
    .bind("生产现场")
    .bind(payload.description.as_deref().unwrap_or(""))
    .bind("pending")
    .bind(payload.created_by.as_deref().unwrap_or("system"))
    .bind(payload.related_inspection_id)
    .execute(pool)
    .await;

    info!("QMS质量问题已触发EHS安全隐患检查");
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

pub async fn handle_ehs_accident_reported(
    pool: &PgPool,
    payload: &EhsAccidentReportedPayload,
) -> anyhow::Result<()> {
    info!("处理EHS事故上报事件 - 触发LIMS检测任务: {}", payload.accident_no);

    let sample_no = format!("SMP-ACC-{}", uuid::Uuid::new_v4().simple().to_string().chars().take(8).collect::<String>());
    let _ = sqlx::query(
        "INSERT INTO qa_lab_samples (sample_no, sample_name, sample_type, source, status) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(sample_no.clone())
    .bind(format!("事故检测样品: {}", payload.title))
    .bind("事故分析")
    .bind("EHS事故")
    .bind("registered")
    .execute(pool)
    .await;

    let task_no = format!("TASK-ACC-{}", uuid::Uuid::new_v4().simple().to_string().chars().take(8).collect::<String>());
    let test_items = serde_json::json!(["环境检测", "化学品残留", "材料分析", "安全评估"]);
    let _ = sqlx::query(
        "INSERT INTO qa_lab_tasks (task_no, sample_no, test_items, status, priority) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(task_no)
    .bind(sample_no)
    .bind(test_items)
    .bind("pending")
    .bind("high")
    .execute(pool)
    .await;

    info!("EHS事故已触发LIMS检测任务");
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
        "INSERT INTO qa_ehs_hazards (hazard_no, title, category, level, location, description, status, reported_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
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

pub async fn handle_lims_record_completed(
    pool: &PgPool,
    payload: &LimsRecordCompletedPayload,
) -> anyhow::Result<()> {
    info!("处理LIMS检测完成事件 - 更新QMS质检结果: {}", payload.record_no);

    let _ = sqlx::query(
        "UPDATE qa_quality_inspections SET 
            test_result = $1, test_data = $2, conclusion = $3, updated_at = NOW()
         WHERE inspection_no = $4"
    )
    .bind(payload.conclusion.clone())
    .bind(payload.test_data.clone())
    .bind(&payload.conclusion)
    .bind(payload.related_inspection_no.as_deref().unwrap_or(""))
    .execute(pool)
    .await;

    info!("LIMS检测结果已更新到QMS质检记录");
    Ok(())
}

pub async fn handle_lims_reagent_alert(
    pool: &PgPool,
    payload: &LimsReagentAlertPayload,
) -> anyhow::Result<()> {
    info!("处理LIMS试剂告警事件 - 同步到EHS: {}", payload.reagent_no);

    let alert_no = format!("ALERT-RGT-{}", uuid::Uuid::new_v4().simple().to_string().chars().take(8).collect::<String>());
    let alert_type = match payload.alert_type.as_deref() {
        Some("expired") => "过期告警",
        Some("low_stock") => "低库存告警",
        _ => "其他告警",
    };

    let _ = sqlx::query(
        "INSERT INTO qa_ehs_alerts (alert_no, title, alert_type, severity, description, status, source_system, source_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(alert_no)
    .bind(format!("试剂告警: {}", payload.reagent_name))
    .bind(alert_type)
    .bind(payload.severity.as_deref().unwrap_or("medium"))
    .bind(payload.description.as_deref().unwrap_or(""))
    .bind("active")
    .bind("LIMS")
    .bind(payload.reagent_id)
    .execute(pool)
    .await;

    info!("LIMS试剂告警已同步到EHS");
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
        EventType::QmsQualityIssueCreated => {
            let parsed = serde_json::from_value::<QmsQualityIssueCreatedPayload>(payload.clone())?;
            handle_qms_quality_issue_created(pool, &parsed).await?;
        }
        EventType::EhsHazardReported => {
            let parsed = serde_json::from_value::<EhsHazardReportedPayload>(payload.clone())?;
            handle_ehs_hazard_reported(pool, &parsed).await?;
        }
        EventType::EhsAccidentReported => {
            let parsed = serde_json::from_value::<EhsAccidentReportedPayload>(payload.clone())?;
            handle_ehs_accident_reported(pool, &parsed).await?;
        }
        EventType::LimsInspectionAbnormalDetected => {
            let parsed = serde_json::from_value::<LimsInspectionAbnormalDetectedPayload>(payload.clone())?;
            handle_lims_inspection_abnormal(pool, &parsed).await?;
        }
        EventType::LimsRecordCompleted => {
            let parsed = serde_json::from_value::<LimsRecordCompletedPayload>(payload.clone())?;
            handle_lims_record_completed(pool, &parsed).await?;
        }
        EventType::LimsReagentAlert => {
            let parsed = serde_json::from_value::<LimsReagentAlertPayload>(payload.clone())?;
            handle_lims_reagent_alert(pool, &parsed).await?;
        }
        _ => warn!("未处理的事件类型: {:?}", event_type),
    }
    Ok(())
}