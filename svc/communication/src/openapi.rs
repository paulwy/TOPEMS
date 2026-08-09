//! TOPEMS Communication（通知/即时通讯渠道）最小 OpenAPI 文档骨架
//!
//! V71 A1 仅需提取合法的 openapi 3.x JSON，paths/schemas 后续在 V71.5 补充。
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "notification", description = "站内通知消息 API"),
        (name = "email",        description = "邮件发送渠道 API"),
        (name = "sms",          description = "短信发送渠道 API"),
        (name = "wechat",       description = "企业微信/钉钉 IM 渠道 API")
    ),
    info(
        title       = "TOPEMS Communication API",
        version     = "1.0.0",
        description = "通讯渠道网关服务 API - 包含邮件、短信、IM、站内消息等多渠道发送能力"
    )
)]
pub struct CommunicationApiDoc;
