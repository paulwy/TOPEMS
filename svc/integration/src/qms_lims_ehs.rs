use serde_json::Value;
use sqlx::types::Uuid;
use sqlx::PgPool;
use std::time::Duration;
use tracing::{info, warn};

use topems_shared_event::event::{
    EhsAccidentReportedPayload, EhsHazardReportedPayload, EventType,
    LimsInspectionAbnormalDetectedPayload, LimsReagentAlertPayload, LimsRecordCompletedPayload,
    QmsInspectionCompletedPayload, QmsQualityIssueCreatedPayload,
};

/// 服务间内部 API 调用（/api/internal/ 免鉴权端点，仅内网可达）。
/// 承接原跨 schema 直写语义：跨域联动统一走目标服务 HTTP API，为物理库拆分铺路。
async fn call_internal_api(
    base_url: &str,
    path: &str,
    body: &serde_json::Value,
) -> anyhow::Result<()> {
    let client = reqwest::Client::new();
    let url = format!("{}{}", base_url, path);
    let resp = client
        .post(&url)
        .json(body)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("内部 API 请求失败 {}: {}", path, e))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        anyhow::bail!("内部 API {} 返回 {}: {}", path, status, text);
    }
    Ok(())
}

fn lims_url() -> String {
    std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string())
}

fn qms_url() -> String {
    std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string())
}

fn ehs_url() -> String {
    std::env::var("EHS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8052".to_string())
}

pub async fn handle_qms_inspection_completed(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &QmsInspectionCompletedPayload,
) -> anyhow::Result<()> {
    let _ = pool; // 步骤B后直写改 HTTP，保留签名与 process_event 统一调度
    info!(
        "处理QMS检验完成事件 - 同步到LIMS: {}",
        payload.inspection_no
    );

    let sample_no = format!("{}-SMP", payload.inspection_no);

    // 步骤B：跨 schema 直写 → LIMS 集成 API（原 lims.qa_lab_samples 直写）
    call_internal_api(
        &lims_url(),
        "/api/internal/lims/samples/integration",
        &serde_json::json!({
            "tenant_id": tenant_id,
            "sample_no": sample_no,
            "sample_name": payload.product_name.as_deref().unwrap_or("未知产品"),
            "sample_type": "产品检验样品",
            "source": "QMS同步",
            "status": "registered",
        }),
    )
    .await?;

    let task_no = format!("{}-TASK", payload.inspection_no);
    // 步骤B：跨 schema 直写 → LIMS 集成 API（原 lims.qa_lab_tasks 直写）
    call_internal_api(
        &lims_url(),
        "/api/internal/lims/tasks/integration",
        &serde_json::json!({
            "tenant_id": tenant_id,
            "task_no": task_no,
            "sample_no": sample_no,
            "test_items": ["外观检查", "尺寸测量", "性能测试"],
            "status": "pending",
        }),
    )
    .await?;

    info!("QMS检验结果已同步到LIMS样品登记和检验任务");
    Ok(())
}

pub async fn handle_qms_quality_issue_created(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &QmsQualityIssueCreatedPayload,
) -> anyhow::Result<()> {
    let _ = (pool, tenant_id); // 步骤B后全改 HTTP，保留签名
    info!(
        "处理QMS质量问题创建事件 - 触发EHS安全检查: {}",
        payload.issue_no
    );

    let hazard_no = format!(
        "HAZ-QMS-{}",
        uuid::Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(8)
            .collect::<String>()
    );
    let level = match payload.severity.as_deref() {
        Some("critical") | Some("high") => "high",
        Some("medium") => "medium",
        _ => "low",
    };

    // 步骤B：integration→ehs 跨域直写 → EHS 集成 API（原 public.qa_ehs_hazards 僵尸直写，
    // 表实际在 ehs schema 且无 tenant_id/related_inspection_id 列；inspection_id FK→ehs.qa_ehs_inspection_records，
    // 外部 QMS 相关 id 不可靠 → null）
    call_internal_api(
        &ehs_url(),
        "/api/internal/ehs/hazards/integration",
        &serde_json::json!({
            "hazard_no": hazard_no,
            "title": payload.title.clone(),
            "category": "质量相关",
            "level": level,
            "location": "生产现场",
            "description": payload.description.as_deref().unwrap_or(""),
            "status": "pending",
            "reported_by": payload.created_by.as_deref().unwrap_or("system"),
            "inspection_id": null,
            "source": "QMS",
        }),
    )
    .await?;

    info!("QMS质量问题已触发EHS安全隐患检查");
    Ok(())
}

pub async fn handle_ehs_hazard_reported(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &EhsHazardReportedPayload,
) -> anyhow::Result<()> {
    let _ = pool; // 步骤B后直写改 HTTP，保留签名与 process_event 统一调度
    info!(
        "处理EHS隐患上报事件 - 触发QMS纠正措施: {}",
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

    let action_no = format!(
        "CAP-{}-{}",
        payload.hazard_no,
        uuid::Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(4)
            .collect::<String>()
    );
    let priority = if payload.level == "high" || payload.level == "critical" {
        "high"
    } else {
        "medium"
    };

    // 步骤B：跨 schema 直写 → QMS 集成 API（原 qms.qa_corrective_actions 直写，
    // 字段 related_issue_id→issue_id、related_issue_type 并入 description 已在服务端修正）
    call_internal_api(
        &qms_url(),
        "/api/internal/qms/actions/integration",
        &serde_json::json!({
            "tenant_id": tenant_id,
            "action_no": action_no,
            "title": action_title,
            "description": description,
            "status": "pending",
            "priority": priority,
            "created_by": payload.reported_by.as_deref().unwrap_or("system"),
            // issue_id 有 FK → qms.qa_quality_issues(id)；EHS hazard 非质量issue，须为 null
            // （原直写 related_issue_id=hazard_id 会违反 FK，属僵尸字段；hazard 信息已入 description）
            "issue_id": null,
        }),
    )
    .await?;

    info!("EHS隐患已触发QMS纠正措施");
    Ok(())
}

pub async fn handle_ehs_accident_reported(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &EhsAccidentReportedPayload,
) -> anyhow::Result<()> {
    let _ = pool; // 步骤B后直写改 HTTP，保留签名与 process_event 统一调度
    info!(
        "处理EHS事故上报事件 - 触发LIMS检测任务: {}",
        payload.accident_no
    );

    let sample_no = format!(
        "SMP-ACC-{}",
        uuid::Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(8)
            .collect::<String>()
    );
    // 步骤B：跨 schema 直写 → LIMS 集成 API（原 lims.qa_lab_samples 直写）
    call_internal_api(
        &lims_url(),
        "/api/internal/lims/samples/integration",
        &serde_json::json!({
            "tenant_id": tenant_id,
            "sample_no": sample_no,
            "sample_name": format!("事故检测样品: {}", payload.title),
            "sample_type": "事故分析",
            "source": "EHS事故",
            "status": "registered",
        }),
    )
    .await?;

    let task_no = format!(
        "TASK-ACC-{}",
        uuid::Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(8)
            .collect::<String>()
    );
    let test_items = serde_json::json!(["环境检测", "化学品残留", "材料分析", "安全评估"]);
    // 步骤B：跨 schema 直写 → LIMS 集成 API（原 lims.qa_lab_tasks 直写）
    call_internal_api(
        &lims_url(),
        "/api/internal/lims/tasks/integration",
        &serde_json::json!({
            "tenant_id": tenant_id,
            "task_no": task_no,
            "sample_no": sample_no,
            "test_items": test_items,
            "status": "pending",
        }),
    )
    .await?;

    info!("EHS事故已触发LIMS检测任务");
    Ok(())
}

pub async fn handle_lims_inspection_abnormal(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &LimsInspectionAbnormalDetectedPayload,
) -> anyhow::Result<()> {
    let _ = (pool, tenant_id); // 步骤B后全改 HTTP，保留签名
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

    let hazard_no = format!(
        "HAZ-LIMS-{}",
        uuid::Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(8)
            .collect::<String>()
    );
    let level = if payload.conclusion.contains("严重") || payload.conclusion.contains("超标") {
        "high"
    } else {
        "medium"
    };

    // 步骤B：integration→ehs 跨域直写 → EHS 集成 API（原 public.qa_ehs_hazards 僵尸直写修正）
    call_internal_api(
        &ehs_url(),
        "/api/internal/ehs/hazards/integration",
        &serde_json::json!({
            "hazard_no": hazard_no,
            "title": hazard_title,
            "category": "化学品/实验室",
            "level": level,
            "location": "实验室",
            "description": description,
            "status": "pending",
            "reported_by": "LIMS系统",
            "inspection_id": null,
            "source": "LIMS",
        }),
    )
    .await?;

    info!("LIMS检测异常已上报EHS");
    Ok(())
}

pub async fn handle_lims_record_completed(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &LimsRecordCompletedPayload,
) -> anyhow::Result<()> {
    let _ = pool; // 步骤B后直写改 HTTP，保留签名与 process_event 统一调度
    info!(
        "处理LIMS检测完成事件 - 更新QMS质检结果: {}",
        payload.record_no
    );

    // 步骤B：跨 schema 直写 → QMS 集成 API（原 qms.qa_quality_inspections 直写，
    // 引用不存在的 test_result/test_data/conclusion 列 → 服务端已修正为 result/memo）
    let inspection_no = payload.related_inspection_no.as_deref().unwrap_or("");
    call_internal_api(
        &qms_url(),
        &format!("/api/internal/qms/inspections/{}/result", inspection_no),
        &serde_json::json!({
            "tenant_id": tenant_id,
            "inspection_no": inspection_no,
            "result": payload.conclusion,
            // test_data 为 Value → 序列化为 JSON 字符串写入 text 列 memo
            "memo": serde_json::to_string(&payload.test_data).unwrap_or_default(),
        }),
    )
    .await?;

    info!("LIMS检测结果已更新到QMS质检记录");
    Ok(())
}

pub async fn handle_lims_reagent_alert(
    pool: &PgPool,
    tenant_id: Uuid,
    payload: &LimsReagentAlertPayload,
) -> anyhow::Result<()> {
    let _ = (pool, tenant_id); // 步骤B后全改 HTTP，保留签名
    info!("处理LIMS试剂告警事件 - 同步到EHS: {}", payload.reagent_no);

    let alert_no = format!(
        "ALERT-RGT-{}",
        uuid::Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(8)
            .collect::<String>()
    );
    let alert_type = match payload.alert_type.as_deref() {
        Some("expired") => "过期告警",
        Some("low_stock") => "低库存告警",
        _ => "其他告警",
    };

    // 步骤B：integration→ehs 跨域直写 → EHS 集成 API（原 public.qa_ehs_alerts 僵尸直写修正——
    // 表 20260831191100 已建 ehs.qa_ehs_alerts）
    call_internal_api(
        &ehs_url(),
        "/api/internal/ehs/alerts/integration",
        &serde_json::json!({
            "alert_no": alert_no,
            "title": format!("试剂告警: {}", payload.reagent_name),
            "alert_type": alert_type,
            "severity": payload.severity.as_deref().unwrap_or("medium"),
            "description": payload.description.as_deref().unwrap_or(""),
            "status": "active",
            "source_system": "LIMS",
            "source_id": payload.reagent_id,
        }),
    )
    .await?;

    info!("LIMS试剂告警已同步到EHS");
    Ok(())
}

pub async fn process_event(
    pool: &PgPool,
    tenant_id: Uuid,
    event_type: EventType,
    payload: &Value,
) -> anyhow::Result<()> {
    match event_type {
        EventType::QmsInspectionCompleted => {
            let parsed = serde_json::from_value::<QmsInspectionCompletedPayload>(payload.clone())?;
            handle_qms_inspection_completed(pool, tenant_id, &parsed).await?;
        }
        EventType::QmsQualityIssueCreated => {
            let parsed = serde_json::from_value::<QmsQualityIssueCreatedPayload>(payload.clone())?;
            handle_qms_quality_issue_created(pool, tenant_id, &parsed).await?;
        }
        EventType::EhsHazardReported => {
            let parsed = serde_json::from_value::<EhsHazardReportedPayload>(payload.clone())?;
            handle_ehs_hazard_reported(pool, tenant_id, &parsed).await?;
        }
        EventType::EhsAccidentReported => {
            let parsed = serde_json::from_value::<EhsAccidentReportedPayload>(payload.clone())?;
            handle_ehs_accident_reported(pool, tenant_id, &parsed).await?;
        }
        EventType::LimsInspectionAbnormalDetected => {
            let parsed =
                serde_json::from_value::<LimsInspectionAbnormalDetectedPayload>(payload.clone())?;
            handle_lims_inspection_abnormal(pool, tenant_id, &parsed).await?;
        }
        EventType::LimsRecordCompleted => {
            let parsed = serde_json::from_value::<LimsRecordCompletedPayload>(payload.clone())?;
            handle_lims_record_completed(pool, tenant_id, &parsed).await?;
        }
        EventType::LimsReagentAlert => {
            let parsed = serde_json::from_value::<LimsReagentAlertPayload>(payload.clone())?;
            handle_lims_reagent_alert(pool, tenant_id, &parsed).await?;
        }
        _ => warn!("未处理的事件类型: {:?}", event_type),
    }
    Ok(())
}
