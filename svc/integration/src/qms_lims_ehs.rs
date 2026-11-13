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
//! 租户上下文：一律取事件 payload 的 `tenant_id` 原样透传给归属服务；payload 缺失或为
//! nil 时直接返回 `[tenant_ctx:nil]` 错误（进 DLQ），禁止回退请求上下文、全局常量或 nil。

use serde_json::Value;
use sqlx::types::Uuid;
use std::sync::atomic::{AtomicU64, Ordering};
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

/// QMS 质量问题 → EHS 隐患的确定性编号。
///
/// `qa_quality_issues.issue_no` 有全局 UNIQUE 约束，且仅由 QMS 以 `QI-{8hex}` 生成，
/// 因此 `HAZ-QMS-{issue_no}`（当前 19 字符）在同一来源重投时恒等，且远小于
/// `ehs.qa_ehs_hazards.hazard_no` 的 64 字符上限。
fn quality_issue_hazard_no(issue_no: &str) -> String {
    format!("HAZ-QMS-{}", issue_no)
}

/// LIMS 检测异常 → EHS 隐患的确定性编号。
///
/// 该事件 payload 不含 inspection_no；`task_no` 是 varchar(64) 的可变文本，
/// 加前缀后可能超过 `hazard_no` 的 64 字符上限。因此改用有界的 `task_id`
/// （UUID，全局唯一），并用 `test_item` 的短摘要区分同一任务下的多个异常检测项，
/// 避免不同检测项被 `ON CONFLICT` 合并覆盖。整体长度 54 字符。
fn lims_abnormal_hazard_no(task_id: Uuid, test_item: &str) -> String {
    let digest = format!("{:x}", md5::compute(test_item.trim().as_bytes()));
    let short: String = digest.chars().take(8).collect();
    format!("HAZ-LIMS-{task_id}-{short}")
}

/// LIMS 试剂告警 → EHS 告警的确定性编号。
///
/// `alert_type` 只由 LIMS 发布端写入（expired / low_stock），未知值统一归入 `other`：
/// 既避免自由文本进入编号，又让同一试剂的不同告警类型各自收敛成一行。
/// 长度上限 55 字符（`ALR-LIMS-` 9 + UUID 36 + `-` 1 + kind 9），小于
/// `ehs.qa_ehs_alerts.alert_no` 的 64 字符上限。
fn reagent_alert_no(reagent_id: Uuid, alert_type: Option<&str>) -> String {
    let kind = match alert_type.map(str::trim) {
        Some("expired") => "expired",
        Some("low_stock") => "low_stock",
        _ => "other",
    };
    format!("ALR-LIMS-{reagent_id}-{kind}")
}

async fn post_json(url: &str, body: &Value) -> Result<(), TopemsError> {
    let client = topems_shared_core::shared_http_client();
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

/// 事件租户非法（缺失/空串/nil/解析失败）的累计拒绝数。
static EVENT_TENANT_REJECTS: AtomicU64 = AtomicU64::new(0);

fn reject_event_tenant(event: &str, detail: &str) -> TopemsError {
    let total = EVENT_TENANT_REJECTS.fetch_add(1, Ordering::Relaxed) + 1;
    tracing::error!(
        "[tenant_ctx] {event} 事件租户非法（{detail}），拒收；累计拒绝={}",
        total
    );
    TopemsError::ValidationFailed(format!(
        "[tenant_ctx:reject] {event} 事件 payload.tenant_id 非法（{detail}），拒绝下游编排"
    ))
}

/// 原始 payload 层校验：覆盖缺失、空串、nil-uuid、解析失败四种形态。
fn require_raw_payload_tenant(payload: &Value, event: &str) -> Result<Uuid, TopemsError> {
    let raw = payload.get("tenant_id");
    let parsed = raw
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s.trim()).ok());
    match parsed {
        Some(t) if !t.is_nil() => Ok(t),
        Some(_) => Err(reject_event_tenant(event, "nil-uuid")),
        None => Err(reject_event_tenant(
            event,
            match raw {
                None => "缺少 tenant_id",
                Some(v) if v.as_str().map(|s| s.trim().is_empty()).unwrap_or(false) => {
                    "tenant_id 为空串"
                }
                Some(_) => "tenant_id 解析失败",
            },
        )),
    }
}

/// 事件 payload 必须携带非 nil 租户；缺失即拒绝下游编排。
/// 禁止回退请求上下文、全局常量或 nil —— 下游 internal 端点会把该值直接写库。
fn require_event_payload_tenant(tenant_id: Uuid, event: &str) -> Result<Uuid, TopemsError> {
    if tenant_id.is_nil() {
        return Err(reject_event_tenant(event, "nil-uuid"));
    }
    Ok(tenant_id)
}

/// QMS 检验完成 → LIMS 登记样品 + 检验任务（顺序：先样品后任务，任务按 sample_no 关联样品）。
pub async fn handle_qms_inspection_completed(
    payload: &QmsInspectionCompletedPayload,
) -> Result<(), TopemsError> {
    let tenant_id = require_event_payload_tenant(payload.tenant_id, "QmsInspectionCompleted")?;
    info!(
        "处理QMS检验完成事件 - 编排到LIMS样品/任务: {}",
        payload.inspection_no
    );

    let sample_no = format!("{}-SMP", payload.inspection_no);
    post_json(
        &format!("{}/api/internal/lims/samples/integration", lims_base_url()),
        &serde_json::json!({
            "tenant_id": tenant_id,
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
            "tenant_id": tenant_id,
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
    let tenant_id = require_event_payload_tenant(payload.tenant_id, "QmsQualityIssueCreated")?;
    info!(
        "处理QMS质量问题创建事件 - 编排到EHS隐患: {}",
        payload.issue_no
    );

    let hazard_no = quality_issue_hazard_no(&payload.issue_no);
    let level = match payload.severity.as_deref() {
        Some("critical") | Some("high") => "high",
        Some("medium") => "medium",
        _ => "low",
    };

    post_json(
        &format!("{}/api/internal/ehs/hazards/integration", ehs_base_url()),
        &serde_json::json!({
            "tenant_id": tenant_id,
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
    let tenant_id = require_event_payload_tenant(payload.tenant_id, "EhsHazardReported")?;
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
            "tenant_id": tenant_id,
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
    let tenant_id = require_event_payload_tenant(payload.tenant_id, "EhsAccidentReported")?;
    info!(
        "处理EHS事故上报事件 - 编排到LIMS检测任务: {}",
        payload.accident_no
    );

    let sample_no = format!("SMP-ACC-{}", rand_suffix(8));
    post_json(
        &format!("{}/api/internal/lims/samples/integration", lims_base_url()),
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

    let task_no = format!("TASK-ACC-{}", rand_suffix(8));
    // lims.qa_lab_tasks 无 priority 列（internal 端点已裁剪该字段）。
    post_json(
        &format!("{}/api/internal/lims/tasks/integration", lims_base_url()),
        &serde_json::json!({
            "tenant_id": tenant_id,
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
    let tenant_id =
        require_event_payload_tenant(payload.tenant_id, "LimsInspectionAbnormalDetected")?;
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
    let hazard_no = lims_abnormal_hazard_no(payload.task_id, &payload.test_item);
    let level = if payload.conclusion.contains("严重") || payload.conclusion.contains("超标") {
        "high"
    } else {
        "medium"
    };

    post_json(
        &format!("{}/api/internal/ehs/hazards/integration", ehs_base_url()),
        &serde_json::json!({
            "tenant_id": tenant_id,
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
    let tenant_id = require_event_payload_tenant(payload.tenant_id, "LimsRecordCompleted")?;
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
            "tenant_id": tenant_id,
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
    let tenant_id = require_event_payload_tenant(payload.tenant_id, "LimsReagentAlert")?;
    info!(
        "处理LIMS试剂告警事件 - 编排到EHS告警: {}",
        payload.reagent_no
    );

    let alert_no = reagent_alert_no(payload.reagent_id, payload.alert_type.as_deref());
    let alert_type = match payload.alert_type.as_deref() {
        Some("expired") => "过期告警",
        Some("low_stock") => "低库存告警",
        _ => "其他告警",
    };

    post_json(
        &format!("{}/api/internal/ehs/alerts/integration", ehs_base_url()),
        &serde_json::json!({
            "tenant_id": tenant_id,
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
            require_raw_payload_tenant(payload, "QmsInspectionCompleted")?;
            let parsed = serde_json::from_value::<QmsInspectionCompletedPayload>(payload.clone())?;
            handle_qms_inspection_completed(&parsed).await?;
        }
        EventType::QmsQualityIssueCreated => {
            require_raw_payload_tenant(payload, "QmsQualityIssueCreated")?;
            let parsed = serde_json::from_value::<QmsQualityIssueCreatedPayload>(payload.clone())?;
            handle_qms_quality_issue_created(&parsed).await?;
        }
        EventType::EhsHazardReported => {
            require_raw_payload_tenant(payload, "EhsHazardReported")?;
            let parsed = serde_json::from_value::<EhsHazardReportedPayload>(payload.clone())?;
            handle_ehs_hazard_reported(&parsed).await?;
        }
        EventType::EhsAccidentReported => {
            require_raw_payload_tenant(payload, "EhsAccidentReported")?;
            let parsed = serde_json::from_value::<EhsAccidentReportedPayload>(payload.clone())?;
            handle_ehs_accident_reported(&parsed).await?;
        }
        EventType::LimsInspectionAbnormalDetected => {
            require_raw_payload_tenant(payload, "LimsInspectionAbnormalDetected")?;
            let parsed =
                serde_json::from_value::<LimsInspectionAbnormalDetectedPayload>(payload.clone())?;
            handle_lims_inspection_abnormal(&parsed).await?;
        }
        EventType::LimsRecordCompleted => {
            require_raw_payload_tenant(payload, "LimsRecordCompleted")?;
            let parsed = serde_json::from_value::<LimsRecordCompletedPayload>(payload.clone())?;
            handle_lims_record_completed(&parsed).await?;
        }
        EventType::LimsReagentAlert => {
            // payload 已扩展 tenant_id：缺失/空串/nil/解析失败仍拒收并计数，
            // 通过后按事件租户编排到 EHS（绝不落 NULL 业务行）。
            require_raw_payload_tenant(payload, "LimsReagentAlert")?;
            let parsed = serde_json::from_value::<LimsReagentAlertPayload>(payload.clone())?;
            handle_lims_reagent_alert(&parsed).await?;
        }
        _ => warn!("未处理的事件类型: {:?}", event_type),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{extract::State, routing::post, Json, Router};
    use std::sync::{Arc, Mutex};

    #[derive(Clone, Default)]
    struct Captured(Arc<Mutex<Vec<Value>>>);

    async fn capture(
        State(captured): State<Captured>,
        Json(body): Json<Value>,
    ) -> axum::http::StatusCode {
        captured.0.lock().expect("capture lock").push(body);
        axum::http::StatusCode::OK
    }

    /// 本地 mock EHS internal 端点：记录 integration 实际发出的请求体。
    async fn start_mock_ehs() -> (String, Captured) {
        let captured = Captured::default();
        let app = Router::new()
            .route("/api/internal/ehs/alerts/integration", post(capture))
            .with_state(captured.clone());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind mock ehs");
        let addr = listener.local_addr().expect("mock ehs addr");
        tokio::spawn(async move {
            axum::serve(listener, app).await.expect("mock ehs serve");
        });
        (format!("http://{}", addr), captured)
    }

    fn reagent_payload(tenant_id: Uuid) -> LimsReagentAlertPayload {
        LimsReagentAlertPayload {
            tenant_id,
            reagent_id: Uuid::parse_str("0b9d5c1e-6a7f-4c2b-9d3e-2f1a4b5c6d7e")
                .expect("reagent id"),
            reagent_no: "RGT-0001".to_string(),
            reagent_name: "无水乙醇".to_string(),
            alert_type: Some("expired".to_string()),
            severity: Some("high".to_string()),
            description: Some("试剂已过期".to_string()),
            current_stock: Some(2),
            min_stock: None,
            expiry_date: Some("2026-01-01T00:00:00+00:00".to_string()),
        }
    }

    /// 三类事件来源编号：同来源恒等、来源不同则不同、长度不超过目标列 64 字符、ASCII 有界。
    #[test]
    fn event_source_keys_are_deterministic_and_bounded() {
        assert_eq!(
            quality_issue_hazard_no("QI-1234ABCD"),
            "HAZ-QMS-QI-1234ABCD"
        );
        assert_eq!(
            quality_issue_hazard_no("QI-1234ABCD"),
            quality_issue_hazard_no("QI-1234ABCD")
        );

        let task_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").expect("task id");
        let appearance = lims_abnormal_hazard_no(task_id, "外观检查");
        assert_eq!(appearance, lims_abnormal_hazard_no(task_id, "外观检查"));
        assert_ne!(appearance, lims_abnormal_hazard_no(task_id, "尺寸测量"));
        assert!(appearance.is_ascii(), "{appearance}");
        assert!(appearance.len() <= 64, "{appearance}");

        let reagent_id =
            Uuid::parse_str("0b9d5c1e-6a7f-4c2b-9d3e-2f1a4b5c6d7e").expect("reagent id");
        assert_eq!(
            reagent_alert_no(reagent_id, Some("expired")),
            format!("ALR-LIMS-{reagent_id}-expired")
        );
        assert_eq!(
            reagent_alert_no(reagent_id, Some("expired")),
            reagent_alert_no(reagent_id, Some("expired"))
        );
        assert_eq!(
            reagent_alert_no(reagent_id, Some("low_stock")),
            format!("ALR-LIMS-{reagent_id}-low_stock")
        );
        assert_eq!(
            reagent_alert_no(reagent_id, Some("legacy_free_text")),
            format!("ALR-LIMS-{reagent_id}-other")
        );
        assert!(reagent_alert_no(reagent_id, None).len() <= 64);
    }

    /// LIMS 发布 → integration 编排：事件租户透传、编号确定；重投请求体完全一致；
    /// 缺失/非法租户拒收且计数递增。
    #[tokio::test]
    async fn reagent_alert_forwarding_is_tenant_scoped_and_redelivery_stable() {
        let (base_url, captured) = start_mock_ehs().await;
        let prev = std::env::var("EHS_SERVICE_URL").ok();
        std::env::set_var("EHS_SERVICE_URL", &base_url);

        let tenant_id = Uuid::parse_str("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee").expect("tenant");
        let payload = reagent_payload(tenant_id);
        let expected_alert_no = reagent_alert_no(payload.reagent_id, Some("expired"));

        // 首次投递 + 原样重投：必须发出同一 alert_no / 同一租户。
        handle_lims_reagent_alert(&payload)
            .await
            .expect("首次编排应成功");
        handle_lims_reagent_alert(&payload)
            .await
            .expect("重投编排应成功");

        {
            let bodies = captured.0.lock().expect("capture lock");
            assert_eq!(bodies.len(), 2, "两次投递都应发出请求");
            assert_eq!(bodies[0], bodies[1], "重投请求体必须完全一致（幂等键收敛）");
            assert_eq!(bodies[0]["alert_no"], serde_json::json!(expected_alert_no));
            assert_eq!(
                bodies[0]["tenant_id"],
                serde_json::json!(tenant_id.to_string())
            );
            assert_eq!(bodies[0]["source_system"], serde_json::json!("LIMS"));
            assert_eq!(
                bodies[0]["source_id"],
                serde_json::json!(payload.reagent_id.to_string())
            );
        }

        // 经 dispatch 走完整反序列化路径，租户照样透传。
        dispatch(
            EventType::LimsReagentAlert,
            &serde_json::to_value(&payload).expect("serialize payload"),
        )
        .await
        .expect("合法租户经 dispatch 应成功");
        {
            let bodies = captured.0.lock().expect("capture lock");
            assert_eq!(bodies.len(), 3);
            assert_eq!(bodies[2], bodies[0]);
        }

        // 缺失/空串/nil/非法租户：拒收 + 计数递增，且不再发出请求。
        let before = EVENT_TENANT_REJECTS.load(Ordering::Relaxed);
        let mut illegal = serde_json::to_value(&payload).expect("serialize payload");
        for bad in [
            serde_json::Value::Null,
            serde_json::json!(""),
            serde_json::json!(Uuid::nil().to_string()),
            serde_json::json!("not-a-uuid"),
        ] {
            illegal["tenant_id"] = bad.clone();
            let err = dispatch(EventType::LimsReagentAlert, &illegal)
                .await
                .expect_err("非法租户必须拒收");
            assert!(err.to_string().contains("tenant_ctx:reject"), "{err}");
        }
        // 历史事件（旧 payload 不含 tenant_id 字段）同样拒收，不得变成合法。
        let mut legacy = serde_json::to_value(&payload).expect("serialize payload");
        legacy
            .as_object_mut()
            .expect("payload object")
            .remove("tenant_id");
        dispatch(EventType::LimsReagentAlert, &legacy)
            .await
            .expect_err("旧 payload 缺失 tenant_id 必须拒收");

        let after = EVENT_TENANT_REJECTS.load(Ordering::Relaxed);
        assert_eq!(after - before, 5, "5 次非法事件均应计数");
        assert_eq!(
            captured.0.lock().expect("capture lock").len(),
            3,
            "非法租户不得触发下游请求"
        );

        match prev {
            Some(v) => std::env::set_var("EHS_SERVICE_URL", v),
            None => std::env::remove_var("EHS_SERVICE_URL"),
        }
    }
}
