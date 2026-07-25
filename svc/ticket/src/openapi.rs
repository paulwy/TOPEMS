// Ticket 服务 OpenAPI 文档
//
// 说明：handlers 函数未添加 #[utoipa::path] 注解，此处先注册 components.schemas
// 以支持前端 TypeScript 类型生成（前后端 DTO 同步）。paths 可后续补充注解后启用。
use utoipa::OpenApi;

use crate::models::{
    AddCommentRequest, CreateSlaPolicyRequest, CreateTicketRequest, SlaBreachTrendItem,
    SlaEscalationEvent, SlaSeverityStat, SlaTypeStat, SeverityCount, SourceCount, Ticket,
    TicketActivity, TicketComment, TicketListResponse, TicketQuery, TicketSlaInfo,
    TicketSlaPolicy, TicketSlaStats, TicketStats, TypeCount, UpdateSlaPolicyRequest,
    UpdateTicketRequest,
};

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            Ticket,
            TicketComment,
            TicketActivity,
            TicketSlaPolicy,
            TicketSlaInfo,
            SlaEscalationEvent,
            TicketSlaStats,
            SlaSeverityStat,
            SlaTypeStat,
            SlaBreachTrendItem,
            CreateSlaPolicyRequest,
            UpdateSlaPolicyRequest,
            CreateTicketRequest,
            UpdateTicketRequest,
            TicketQuery,
            TicketListResponse,
            AddCommentRequest,
            TicketStats,
            SeverityCount,
            TypeCount,
            SourceCount,
        ),
    ),
    tags(
        (name = "tickets", description = "工单管理 API"),
        (name = "sla", description = "SLA 策略与统计 API"),
    ),
    info(
        title = "TOPEMS Ticket API",
        version = "1.0.0",
        description = "工单服务 API - 包含工单管理、评论、活动、SLA 策略与统计"
    )
)]
pub struct TicketApiDoc;
