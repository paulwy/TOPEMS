// Ticket 服务 OpenAPI 文档
use utoipa::OpenApi;

use crate::models::{
    AddCommentRequest, CreateSlaPolicyRequest, CreateTicketRequest, SeverityCount,
    SlaBreachTrendItem, SlaEscalationEvent, SlaSeverityStat, SlaTypeStat, SourceCount, Ticket,
    TicketActivity, TicketComment, TicketListResponse, TicketQuery, TicketSlaInfo, TicketSlaPolicy,
    TicketSlaStats, TicketStats, TypeCount, UpdateSlaPolicyRequest, UpdateTicketRequest,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::create_ticket_handler,
        crate::handlers::list_tickets_handler,
        crate::handlers::get_ticket_handler,
        crate::handlers::update_ticket_handler,
        crate::handlers::delete_ticket_handler,
        crate::handlers::get_stats_handler,
        crate::handlers::add_comment_handler,
        crate::handlers::list_comments_handler,
        crate::handlers::create_sla_policy_handler,
        crate::handlers::list_sla_policies_handler,
    ),
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
