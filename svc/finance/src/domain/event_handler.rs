// V45.0 Track A: Finance 事件处理器与事件路由
// =============================================================================
// 事件处理器 trait + 副作用模型 + 路由器 + 4 个具体处理器实现

use async_trait::async_trait;

use super::event_publisher::event_type_name;
use super::events::FinanceDomainEvent;

/// 事件处理器 trait
#[async_trait]
pub trait DomainEventHandler: Send + Sync {
    fn handler_name(&self) -> &str;
    fn handles_event(&self, event_type: &str) -> bool;
    async fn handle(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
    ) -> Result<HandlerResult, String>;
}

/// 处理器执行结果
#[derive(Debug, Clone, Default)]
pub struct HandlerResult {
    pub success: bool,
    pub side_effects: Vec<SideEffect>,
    pub next_events: Vec<FinanceDomainEvent>,
}

impl HandlerResult {
    pub fn success() -> Self {
        Self {
            success: true,
            ..Default::default()
        }
    }

    pub fn failure(message: impl Into<String>) -> Self {
        let _ = message;
        Self {
            success: false,
            ..Default::default()
        }
    }

    pub fn with_effect(mut self, effect: SideEffect) -> Self {
        self.side_effects.push(effect);
        self
    }
}

/// 副作用：处理器可触发的下游动作（仅声明，由管道执行）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "kind")]
pub enum SideEffect {
    SendNotification {
        recipient: String,
        message: String,
    },
    TriggerSync {
        target_service: String,
        entity_type: String,
        entity_id: String,
    },
    UpdateCache {
        cache_key: String,
    },
    InvalidateView {
        view_name: String,
    },
    PublishExternalEvent {
        routing_key: String,
        payload: serde_json::Value,
    },
}

/// 路由单次执行结果
#[derive(Debug, Clone)]
pub struct RouteResult {
    pub handler_name: String,
    pub success: bool,
    pub side_effects: Vec<SideEffect>,
    pub error: Option<String>,
}

/// 事件路由器：注册处理器并将事件分发给匹配的处理器
pub struct EventRouter {
    handlers: Vec<Box<dyn DomainEventHandler>>,
}

impl EventRouter {
    pub fn new() -> Self {
        Self {
            handlers: Vec::new(),
        }
    }

    pub fn register(&mut self, handler: Box<dyn DomainEventHandler>) {
        self.handlers.push(handler);
    }

    pub async fn route(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
    ) -> Vec<RouteResult> {
        let event_type = event_type_name(event);
        let mut results = Vec::new();
        for handler in &self.handlers {
            if !handler.handles_event(event_type) {
                continue;
            }
            match handler.handle(event, aggregate_id).await {
                Ok(result) => {
                    results.push(RouteResult {
                        handler_name: handler.handler_name().to_string(),
                        success: result.success,
                        side_effects: result.side_effects,
                        error: if result.success {
                            None
                        } else {
                            Some("handler reported failure".to_string())
                        },
                    });
                }
                Err(e) => {
                    results.push(RouteResult {
                        handler_name: handler.handler_name().to_string(),
                        success: false,
                        side_effects: Vec::new(),
                        error: Some(e),
                    });
                }
            }
        }
        results
    }

    pub fn handler_count(&self) -> usize {
        self.handlers.len()
    }

    pub fn list_handlers(&self) -> Vec<String> {
        self.handlers.iter().map(|h| h.handler_name().to_string()).collect()
    }
}

impl Default for EventRouter {
    fn default() -> Self {
        Self::new()
    }
}

/// 构造一个配置好默认处理器的路由器
pub fn default_router() -> EventRouter {
    let mut router = EventRouter::new();
    router.register(Box::new(VoucherPostedHandler::new()));
    router.register(Box::new(VoucherReversedHandler::new()));
    router.register(Box::new(ReceivableSettledHandler::new()));
    router.register(Box::new(PayableSettledHandler::new()));
    router
}

// =============================================================================
// 具体处理器实现
// =============================================================================

/// 凭证过账处理器：更新总账 + 通知 + 失效缓存
pub struct VoucherPostedHandler {
    name: String,
}

impl VoucherPostedHandler {
    pub fn new() -> Self {
        Self {
            name: "VoucherPostedHandler".to_string(),
        }
    }
}

impl Default for VoucherPostedHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DomainEventHandler for VoucherPostedHandler {
    fn handler_name(&self) -> &str {
        &self.name
    }

    fn handles_event(&self, event_type: &str) -> bool {
        event_type == "VoucherPosted"
    }

    async fn handle(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
    ) -> Result<HandlerResult, String> {
        let (voucher_id, voucher_no, posted_by) = match event {
            FinanceDomainEvent::VoucherPosted(e) => {
                (e.voucher_id.clone(), e.voucher_no.clone(), e.posted_by.clone())
            }
            _ => return Err("VoucherPostedHandler received non-VoucherPosted event".to_string()),
        };

        let mut result = HandlerResult::success();
        result.side_effects.push(SideEffect::TriggerSync {
            target_service: "ledger".to_string(),
            entity_type: "Voucher".to_string(),
            entity_id: voucher_id.clone(),
        });
        result.side_effects.push(SideEffect::UpdateCache {
            cache_key: format!("voucher:{}:posted", aggregate_id),
        });
        result.side_effects.push(SideEffect::InvalidateView {
            view_name: "voucher_summary".to_string(),
        });
        result.side_effects.push(SideEffect::SendNotification {
            recipient: posted_by.clone(),
            message: format!("凭证 {} 已过账", voucher_no),
        });
        Ok(result)
    }
}

/// 凭证冲销处理器：反向更新 + 通知
pub struct VoucherReversedHandler {
    name: String,
}

impl VoucherReversedHandler {
    pub fn new() -> Self {
        Self {
            name: "VoucherReversedHandler".to_string(),
        }
    }
}

impl Default for VoucherReversedHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DomainEventHandler for VoucherReversedHandler {
    fn handler_name(&self) -> &str {
        &self.name
    }

    fn handles_event(&self, event_type: &str) -> bool {
        event_type == "VoucherReversed"
    }

    async fn handle(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
    ) -> Result<HandlerResult, String> {
        let (voucher_id, voucher_no, reversed_by, reason) = match event {
            FinanceDomainEvent::VoucherReversed(e) => (
                e.voucher_id.clone(),
                e.voucher_no.clone(),
                e.reversed_by.clone(),
                e.reason.clone(),
            ),
            _ => {
                return Err(
                    "VoucherReversedHandler received non-VoucherReversed event".to_string(),
                )
            }
        };

        let mut result = HandlerResult::success();
        result.side_effects.push(SideEffect::TriggerSync {
            target_service: "ledger".to_string(),
            entity_type: "VoucherReversal".to_string(),
            entity_id: voucher_id.clone(),
        });
        result.side_effects.push(SideEffect::UpdateCache {
            cache_key: format!("voucher:{}:reversed", aggregate_id),
        });
        result.side_effects.push(SideEffect::InvalidateView {
            view_name: "voucher_summary".to_string(),
        });
        result.side_effects.push(SideEffect::SendNotification {
            recipient: reversed_by.clone(),
            message: format!("凭证 {} 已冲销，原因：{}", voucher_no, reason),
        });
        Ok(result)
    }
}

/// 应收结算处理器：更新账龄 + 通知客户
pub struct ReceivableSettledHandler {
    name: String,
}

impl ReceivableSettledHandler {
    pub fn new() -> Self {
        Self {
            name: "ReceivableSettledHandler".to_string(),
        }
    }
}

impl Default for ReceivableSettledHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DomainEventHandler for ReceivableSettledHandler {
    fn handler_name(&self) -> &str {
        &self.name
    }

    fn handles_event(&self, event_type: &str) -> bool {
        event_type == "ReceivableSettled"
    }

    async fn handle(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
    ) -> Result<HandlerResult, String> {
        let (receivable_id, settled_amount, remaining_amount) = match event {
            FinanceDomainEvent::ReceivableSettled(e) => (
                e.receivable_id.clone(),
                e.settled_amount,
                e.remaining_amount,
            ),
            _ => {
                return Err(
                    "ReceivableSettledHandler received non-ReceivableSettled event".to_string(),
                )
            }
        };

        let mut result = HandlerResult::success();
        result.side_effects.push(SideEffect::TriggerSync {
            target_service: "aging".to_string(),
            entity_type: "Receivable".to_string(),
            entity_id: receivable_id.clone(),
        });
        result.side_effects.push(SideEffect::UpdateCache {
            cache_key: format!("receivable:{}:aging", aggregate_id),
        });
        result.side_effects.push(SideEffect::InvalidateView {
            view_name: "receivable_aging".to_string(),
        });
        result.side_effects.push(SideEffect::SendNotification {
            recipient: "customer".to_string(),
            message: format!(
                "应收 {} 已结算 {}，剩余 {}",
                receivable_id, settled_amount, remaining_amount
            ),
        });
        Ok(result)
    }
}

/// 应付结算处理器：更新账龄 + 通知供应商
pub struct PayableSettledHandler {
    name: String,
}

impl PayableSettledHandler {
    pub fn new() -> Self {
        Self {
            name: "PayableSettledHandler".to_string(),
        }
    }
}

impl Default for PayableSettledHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DomainEventHandler for PayableSettledHandler {
    fn handler_name(&self) -> &str {
        &self.name
    }

    fn handles_event(&self, event_type: &str) -> bool {
        event_type == "PayableSettled"
    }

    async fn handle(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
    ) -> Result<HandlerResult, String> {
        let (payable_id, settled_amount, remaining_amount) = match event {
            FinanceDomainEvent::PayableSettled(e) => {
                (e.payable_id.clone(), e.settled_amount, e.remaining_amount)
            }
            _ => {
                return Err(
                    "PayableSettledHandler received non-PayableSettled event".to_string(),
                )
            }
        };

        let mut result = HandlerResult::success();
        result.side_effects.push(SideEffect::TriggerSync {
            target_service: "aging".to_string(),
            entity_type: "Payable".to_string(),
            entity_id: payable_id.clone(),
        });
        result.side_effects.push(SideEffect::UpdateCache {
            cache_key: format!("payable:{}:aging", aggregate_id),
        });
        result.side_effects.push(SideEffect::InvalidateView {
            view_name: "payable_aging".to_string(),
        });
        result.side_effects.push(SideEffect::SendNotification {
            recipient: "supplier".to_string(),
            message: format!(
                "应付 {} 已结算 {}，剩余 {}",
                payable_id, settled_amount, remaining_amount
            ),
        });
        Ok(result)
    }
}
