//! QMS↔LIMS↔EHS 业务事件编排（D3 §5.1 选项 A）。
//!
//! 历史问题：本模块原含 9 处 `only_own_schema_query!` 跨 schema 直写
//! （INSERT/UPDATE qms.* 与 ehs.* 表），绕过归属方服务的行级校验与业务规则，
//! 且部分目标表（qms.qa_lab_samples/tasks 等）并非对应业务的实际读写表。
//!
//! 现定位：integration 仅作**编排方**——解析总线业务事件，经 reqwest HTTP
//! 调用归属服务的 `/api/internal/*` 集成端点（qms/ehs/lims 各自暴露），
//! 由归属服务在自有 schema 内完成写入。失败由事件订阅框架按 DLQ 处理。
//!
//! 租户上下文：业务事件 payload 不携带 tenant_id，编排侧统一传 `Uuid::nil()`，
//! 与各服务 internal 集成端点既有契约（ehs 端 Uuid::nil 落库）一致。

use serde_json::Value;
use sqlx::types::Uuid;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{
    EhsAccidentReportedPayload, EhsHazardReportedPayload, EventType,
    LimsInspectionAbnormalDetectedPayload, LimsReagentAlertPayload, LimsRecordCompletedPayload,
    QmsInspectionCompletedPayload, QmsQualityIssueCreatedPayload,
};
use tracing::{info, warn};

fn qms_base_url() -> String {
    std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string())
}

fn ehs_base_url() -> String {
    std::env::var("EHS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8052".to_string())
}

fn lims_base_url() -> String {
    std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string())
}

fn rand_suffix(n: usize) -> String {
    uuid::Uuid::new_v4()
        .simple()
        .to_string()
        .chars()
        .take(n)
        .collect()
}

async fn post_json(url: &str, body: &Value) -> Result<(), TopemsError> {
    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .json(body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(TopemsError::NetworkRequest(format!(
            "调用 {} 返回 {}: {}",
            url, status, text
        )));
    }
    Ok(())
}

/// QMS 检验完成 → LIMS 登记样品 + 检验任务（顺序：先样品后任务，任务按 sample_no 关联样品）。
pub async fn handle_qms_inspection_completed(
    payload: &QmsInspectionCompletedPayload,
) -> Result<(), TopemsError> {
    info!(
        "处理QMS检验完成事件 - 编排到LIMS样品/任务: {}",
        payload.inspection_no
    );

    let sample_no = format!("{}-SMP", payload.inspection_no);
    post_json(
        &format!("{}/api/internal/lims/samples/integration", lims_base_url()),
        &serde_json::json!({
            "tenant_id": Uuid::nil(),
            "sample_no": sample_no,
            "sample_name": payload.product_name.clone().unwrap_or_else(|| "未知产品".to_string()),
            "sample_type": "产品检验样品",
            "source": "QMS同步",
            "status": "registered",
        }),
    )
    .await?;

    let task_no = format!("{}-TASK", payload.inspection_no);
    post_json(
        &format!("{}/api/internal/lims/tasks/integration", lims_base_url()),
        &serde_json::json!({
            "tenant_id": Uuid::nil(),
            "task_no": task_no,
            "sample_no": sample_no,
            "test_items": ["外观检查", "尺寸测量", "性能测试"],
            "status": "pending",
        }),
    )
    .await?;

    info!("QMS检验结果已编排到LIMS样品登记和检验任务");
    Ok(())
}

/// QMS 质量问题创建 → EHS 隐患（隐患表归 ehs schema，原直写 qms.qa_ehs_hazards 为错写表）。
pub async fn handle_qms_quality_issue_created(
    payload: &QmsQualityIssueCreatedPayload,
) -> Result<(), TopemsError> {
    info!(
        "处理QMS质量问题创建事件 - 编排到EHS隐患: {}",
        payload.issue_no
    );

    let hazard_no = format!("HAZ-QMS-{}", rand_suffix(8));
    let level = match payload.severity.as_deref() {
        Some("critical") | Some("high") => "high",
        Some("medium") => "medium",
        _ => "low",
    };

    post_json(
        &format!("{}/api/internal/ehs/hazards/integration", ehs_base_url()),
        &serde_json::json!({
            "hazard_no": hazard_no,
            "title": payload.title,
            "category": "质量相关",
            "level": level,
            "location": "生产现场",
            "description": payload.description,
            "status": "pending",
            "reported_by": payload.created_by,
            "source": "QMS质量问题",
        }),
    )
    .await?;

    info!("QMS质量问题已编排触发EHS安全隐患检查");
    Ok(())
}

/// EHS 隐患上报 → QMS 纠正措施。
pub async fn handle_ehs_hazard_reported(
    payload: &EhsHazardReportedPayload,
) -> Result<(), TopemsError> {
    info!(
        "处理EHS隐患上报事件 - 编排到QMS纠正措施: {}",
        payload.hazard_no
    );

    let action_title = format!("EHS隐患整改: {}", payload.title);
    let description = format!(
        "隐患编号: {}\n类别: {}\n等级: {}\n位置: {}\n描述: {}",
        payload.hazard_no,
        payload.category,
        payload.level,
        payload.location.as_deref().unwrap_or("未知"),
        payload.description.as_deref().unwrap_or("无")
    );
    let action_no = format!("CAP-{}-{}", payload.hazard_no, rand_suffix(4));
    // 原直写把 ehs hazard_id 塞进 qms issue_id（跨 schema FK 不可靠），
    // 按 qms internal 端点契约改传 issue_id=null，隐患编号并入 description。
    let priority = if payload.level == "high" || payload.level == "critical" {
        "high"
    } else {
        "medium"
    };

    post_json(
        &format!("{}/api/internal/qms/actions/integration", qms_base_url()),
        &serde_json::json!({
            "tenant_id": Uuid::nil(),
            "action_no": action_no,
            "title": action_title,
            "description": description,
            "status": "pending",
            "priority": priority,
            "created_by": payload.reported_by,
            "issue_id": serde_json::Value::Null,
        }),
    )
    .await?;

    info!("EHS隐患已编排触发QMS纠正措施");
    Ok(())
}

/// EHS 事故上报 → LIMS 检测样品 + 任务。
pub async fn handle_ehs_accident_reported(
    payload: &EhsAccidentReportedPayload,
) -> Result<(), TopemsError> {
    info!(
        "处理EHS事故上报事件 - 编排到LIMS检测任务: {}",
        payload.accident_no
    );

    let sample_no = format!("SMP-ACC-{}", rand_suffix(8));
    post_json(
        &format!("{}/api/internal/lims/samples/integration", lims_base_url()),
        &serde_json::json!({
            "tenant_id": Uuid::nil(),
            "sample_no": sample_no,
            "sample_name": format!("事故检测样品: {}", payload.title),
            "sample_type": "事故分析",
            "source": "EHS事故",
            "status": "registered",
        }),
    )
    .await?;

    let task_no = format!("TASK-ACC-{}", rand_suffix(8));
    // lims.qa_lab_tasks 无 priority 列（internal 端点已裁剪该字段）。
    post_json(
        &format!("{}/api/internal/lims/tasks/integration", lims_base_url()),
        &serde_json::json!({
            "tenant_id": Uuid::nil(),
            "task_no": task_no,
            "sample_no": sample_no,
            "test_items": ["环境检测", "化学品残留", "材料分析", "安全评估"],
            "status": "pending",
        }),
    )
    .await?;

    info!("EHS事故已编排触发LIMS检测任务");
    Ok(())
}

/// LIMS 检测异常 → EHS 隐患。
pub async fn handle_lims_inspection_abnormal(
    payload: &LimsInspectionAbnormalDetectedPayload,
) -> Result<(), TopemsError> {
    info!("处理LIMS检测异常事件 - 编排到EHS: {}", payload.task_no);

    let hazard_title = format!("LIMS检测异常: {}", payload.test_item);
    let description = format!(
        "任务编号: {}\n样品编号: {}\n检测项目: {}\n异常数据: {}\n结论: {}",
        payload.task_no,
        payload.sample_no,
        payload.test_item,
        payload.abnormal_data,
        payload.conclusion
    );
    let hazard_no = format!("HAZ-LIMS-{}", rand_suffix(8));
    let level = if payload.conclusion.contains("严重") || payload.conclusion.contains("超标") {
        "high"
    } else {
        "medium"
    };

    post_json(
        &format!("{}/api/internal/ehs/hazards/integration", ehs_base_url()),
        &serde_json::json!({
            "hazard_no": hazard_no,
            "title": hazard_title,
            "category": "化学品/实验室",
            "level": level,
            "location": "实验室",
            "description": description,
            "status": "pending",
            "reported_by": "LIMS系统",
            "source": "LIMS检测异常",
        }),
    )
    .await?;

    info!("LIMS检测异常已编排上报EHS");
    Ok(())
}

/// LIMS 检测记录完成 → QMS 质检结果回写（仅当携带 related_inspection_no）。
pub async fn handle_lims_record_completed(
    payload: &LimsRecordCompletedPayload,
) -> Result<(), TopemsError> {
    info!(
        "处理LIMS检测完成事件 - 编排回写QMS质检结果: {}",
        payload.record_no
    );

    let Some(inspection_no) = payload.related_inspection_no.clone() else {
        warn!(
            "LIMS记录 {} 未关联 QMS inspection_no，跳过质检结果回写",
            payload.record_no
        );
        return Ok(());
    };

    // qms internal 端点：result=conclusion，memo 承接 test_data（原直写引用的
    // test_data/conclusion 列名已按 qms 实际列 result/memo 修正）。
    post_json(
        &format!(
            "{}/api/internal/qms/inspections/{}/result",
            qms_base_url(),
            inspection_no
        ),
        &serde_json::json!({
            "tenant_id": Uuid::nil(),
            "inspection_no": inspection_no,
            "result": payload.conclusion,
            "memo": serde_json::to_string(&payload.test_data).unwrap_or_default(),
        }),
    )
    .await?;

    info!("LIMS检测结果已编排回写QMS质检记录");
    Ok(())
}

/// LIMS 试剂告警 → EHS 告警。
pub async fn handle_lims_reagent_alert(
    payload: &LimsReagentAlertPayload,
) -> Result<(), TopemsError> {
    info!(
        "处理LIMS试剂告警事件 - 编排到EHS告警: {}",
        payload.reagent_no
    );

    let alert_no = format!("ALERT-RGT-{}", rand_suffix(8));
    let alert_type = match payload.alert_type.as_deref() {
        Some("expired") => "过期告警",
        Some("low_stock") => "低库存告警",
        _ => "其他告警",
    };

    post_json(
        &format!("{}/api/internal/ehs/alerts/integration", ehs_base_url()),
        &serde_json::json!({
            "alert_no": alert_no,
            "title": format!("试剂告警: {}", payload.reagent_name),
            "alert_type": alert_type,
            "severity": payload.severity.clone().unwrap_or_else(|| "medium".to_string()),
            "description": payload.description,
            "status": "active",
            "source_system": "LIMS",
            "source_id": payload.reagent_id,
        }),
    )
    .await?;

    info!("LIMS试剂告警已编排同步到EHS");
    Ok(())
}

/// 业务事件分发（供 event_handlers 订阅 7 类业务事件后统一调用）。
pub async fn dispatch(event_type: EventType, payload: &Value) -> Result<(), TopemsError> {
    match event_type {
        EventType::QmsInspectionCompleted => {
            let parsed = serde_json::from_value::<QmsInspectionCompletedPayload>(payload.clone())?;
            handle_qms_inspection_completed(&parsed).await?;
        }
        EventType::QmsQualityIssueCreated => {
            let parsed = serde_json::from_value::<QmsQualityIssueCreatedPayload>(payload.clone())?;
            handle_qms_quality_issue_created(&parsed).await?;
        }
        EventType::EhsHazardReported => {
            let parsed = serde_json::from_value::<EhsHazardReportedPayload>(payload.clone())?;
            handle_ehs_hazard_reported(&parsed).await?;
        }
        EventType::EhsAccidentReported => {
            let parsed = serde_json::from_value::<EhsAccidentReportedPayload>(payload.clone())?;
            handle_ehs_accident_reported(&parsed).await?;
        }
        EventType::LimsInspectionAbnormalDetected => {
            let parsed =
                serde_json::from_value::<LimsInspectionAbnormalDetectedPayload>(payload.clone())?;
            handle_lims_inspection_abnormal(&parsed).await?;
        }
        EventType::LimsRecordCompleted => {
            let parsed = serde_json::from_value::<LimsRecordCompletedPayload>(payload.clone())?;
            handle_lims_record_completed(&parsed).await?;
        }
        EventType::LimsReagentAlert => {
            let parsed = serde_json::from_value::<LimsReagentAlertPayload>(payload.clone())?;
            handle_lims_reagent_alert(&parsed).await?;
        }
        _ => warn!("未处理的事件类型: {:?}", event_type),
    }
    Ok(())
}
