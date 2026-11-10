//! 事件链路租户上下文：租户只能来自 `payload.tenant_id`。
//!
//! 设计见 `docs/quality/w7-cross-request-tenant-context-2026-11-10.md`。
//!
//! 规则：
//! - 事件消费者/消息处理器/relay 重放，唯一合法来源是 `payload.tenant_id`；
//! - 缺失、`null`、空串、全 0 UUID、非法值一律**报错丢弃**（经重试上限进 DLQ）；
//! - 禁止从连接 GUC、task-local、全局常量、`event.source`、关联实体二次查询里猜租户。
//!
//! 本模块只负责「取租户 + 定型错误」，不碰数据库；拿到 [`EventTenant`] 后
//! 用 `Db::scope_for_tenant(tenant.get())` 开作用域。

use serde_json::Value;
use topems_shared_core::error::TopemsError;
use uuid::Uuid;

use super::{Event, EventType};

/// 事件链路中唯一合法的租户载体。只能由 [`require_event_tenant`] 构造。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EventTenant(Uuid);

impl EventTenant {
    pub fn get(self) -> Uuid {
        self.0
    }
}

/// 取租户失败的三种稳定错误码。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TenantContextCode {
    /// payload 里没有 `tenant_id` 字段
    Missing,
    /// 有字段但为 `null` / 空串 / 全 0 UUID
    Nil,
    /// 有值但不是合法 UUID
    Malformed,
}

impl TenantContextCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Missing => "missing",
            Self::Nil => "nil",
            Self::Malformed => "malformed",
        }
    }
}

#[derive(Debug, Clone)]
pub struct TenantContextError {
    pub code: TenantContextCode,
    pub event_id: Uuid,
    pub event_type: EventType,
    pub raw: Option<String>,
}

impl TenantContextError {
    /// 载荷是死数据，重试不会自愈。
    pub fn is_permanent(&self) -> bool {
        true
    }

    /// 固定日志/告警标签：`[tenant_ctx:<missing|nil|malformed>]`。
    pub fn log_tag(&self) -> &'static str {
        match self.code {
            TenantContextCode::Missing => "[tenant_ctx:missing]",
            TenantContextCode::Nil => "[tenant_ctx:nil]",
            TenantContextCode::Malformed => "[tenant_ctx:malformed]",
        }
    }
}

impl std::fmt::Display for TenantContextError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "event_id={} event_type={:?} code={}",
            self.event_id,
            self.event_type,
            self.code.as_str()
        )?;
        if let Some(raw) = &self.raw {
            write!(f, " raw={raw}")?;
        }
        Ok(())
    }
}

impl std::error::Error for TenantContextError {}

impl From<TenantContextError> for TopemsError {
    fn from(e: TenantContextError) -> Self {
        // 复用既有变体，避免为租户上下文新增全局错误分支
        TopemsError::ValidationFailed(format!("{} {}", e.log_tag(), e))
    }
}

/// 从事件载荷取租户。
///
/// 只认 JSON 顶层的 `tenant_id`，不做任何隐式转换或兜底。
pub fn require_event_tenant(event: &Event) -> Result<EventTenant, TenantContextError> {
    let fail = |code: TenantContextCode, raw: Option<String>| TenantContextError {
        code,
        event_id: event.event_id,
        event_type: event.event_type.clone(),
        raw,
    };

    match event.payload.get("tenant_id") {
        None => Err(fail(TenantContextCode::Missing, None)),
        Some(Value::Null) => Err(fail(TenantContextCode::Nil, None)),
        Some(Value::String(s)) => {
            if s.is_empty() {
                return Err(fail(TenantContextCode::Nil, Some(s.clone())));
            }
            match Uuid::parse_str(s) {
                Ok(id) if id.is_nil() => Err(fail(TenantContextCode::Nil, Some(s.clone()))),
                Ok(id) => Ok(EventTenant(id)),
                Err(_) => Err(fail(TenantContextCode::Malformed, Some(s.clone()))),
            }
        }
        Some(other) => Err(fail(TenantContextCode::Malformed, Some(other.to_string()))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn ev(payload: Value) -> Event {
        Event::new(EventType::QmsInspectionCompleted, "test", payload)
    }

    const TENANT: &str = "00000000-0000-0000-0000-000000000001";

    #[test]
    fn accepts_valid_uuid() {
        let r = require_event_tenant(&ev(json!({ "tenant_id": TENANT })));
        assert!(r.is_ok());
        assert_eq!(r.map(|t| t.get().to_string()).unwrap_or_default(), TENANT);
    }

    #[test]
    fn rejects_missing() {
        let e = require_event_tenant(&ev(json!({}))).err();
        assert_eq!(e.as_ref().map(|x| x.code), Some(TenantContextCode::Missing));
        assert_eq!(
            e.as_ref().map(TenantContextError::log_tag),
            Some("[tenant_ctx:missing]")
        );
    }

    #[test]
    fn rejects_null_empty_and_nil() {
        for p in [
            json!({ "tenant_id": null }),
            json!({ "tenant_id": "" }),
            json!({ "tenant_id": "00000000-0000-0000-0000-000000000000" }),
        ] {
            assert_eq!(
                require_event_tenant(&ev(p)).err().map(|x| x.code),
                Some(TenantContextCode::Nil)
            );
        }
    }

    #[test]
    fn rejects_malformed() {
        for p in [json!({ "tenant_id": "abc" }), json!({ "tenant_id": 1 })] {
            assert_eq!(
                require_event_tenant(&ev(p)).err().map(|x| x.code),
                Some(TenantContextCode::Malformed)
            );
        }
    }

    /// 钉住 `#[serde(default)]` 的语义：改动前写入流/DLQ 的旧消息没有 `tenant_id`，
    /// 反序列化必须成功且得到 nil，再被 `require_event_tenant` 判为 `Nil` 拒绝。
    /// 不允许出现「解析失败」这种含糊错误，也不允许 nil 被放行。
    #[test]
    fn old_payload_without_tenant_id_defaults_to_nil_and_is_rejected() {
        use crate::event::event_types::{EhsHazardReportedPayload, QmsInspectionCompletedPayload};

        let old_qms = json!({
            "inspection_id": "86e724b0-744f-42b0-80e0-d246bce741de",
            "inspection_no": "INS-900321F3",
            "product_id": null,
            "product_name": "旧消息（改动前）",
            "result": "pass",
            "qualification_rate": 100.0,
            "inspector": "test_admin"
        });
        let old_ehs = json!({
            "hazard_id": "3f1f2b1e-1111-4222-8333-444455556666",
            "hazard_no": "HZ-OLD",
            "title": "旧隐患",
            "category": "设备",
            "level": "medium",
            "location": null,
            "description": null,
            "reported_by": null
        });

        let qms = match serde_json::from_value::<QmsInspectionCompletedPayload>(old_qms) {
            Ok(v) => v,
            Err(e) => panic!("旧 QMS payload 必须可反序列化: {e}"),
        };
        assert!(qms.tenant_id.is_nil());
        let qms_value = serde_json::to_value(&qms).unwrap_or(Value::Null);
        assert_eq!(
            require_event_tenant(&ev(qms_value)).err().map(|x| x.code),
            Some(TenantContextCode::Nil)
        );

        let ehs = match serde_json::from_value::<EhsHazardReportedPayload>(old_ehs) {
            Ok(v) => v,
            Err(e) => panic!("旧 EHS payload 必须可反序列化: {e}"),
        };
        assert!(ehs.tenant_id.is_nil());
        let ehs_value = serde_json::to_value(&ehs).unwrap_or(Value::Null);
        assert_eq!(
            require_event_tenant(&ev(ehs_value)).err().map(|x| x.code),
            Some(TenantContextCode::Nil)
        );
    }
}
