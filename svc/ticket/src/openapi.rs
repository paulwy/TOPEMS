// Ticket 服务 OpenAPI 文档
use utoipa::OpenApi;

use crate::models::{
    AddCommentRequest, AutomationRule, CreateAutomationRuleRequest, CreateKnowledgeArticleRequest,
    CreateSlaPolicyRequest, CreateTicketRequest, KnowledgeArticle, SeverityCount, UpdateAutomationRuleRequest,
    UpdateKnowledgeArticleRequest,
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
        crate::handlers::get_ticket_sla_handler,
        crate::handlers::get_sla_stats_handler,
        crate::handlers::add_comment_handler,
        crate::handlers::list_comments_handler,
        crate::handlers::list_activities_handler,
        crate::handlers::create_sla_policy_handler,
        crate::handlers::list_sla_policies_handler,
        crate::handlers::get_sla_policy_handler,
        crate::handlers::update_sla_policy_handler,
        crate::handlers::delete_sla_policy_handler,
        crate::handlers::create_automation_rule_handler,
        crate::handlers::list_automation_rules_handler,
        crate::handlers::get_automation_rule_handler,
        crate::handlers::update_automation_rule_handler,
        crate::handlers::delete_automation_rule_handler,
        crate::handlers::trigger_sla_escalation_handler,
        crate::handlers::create_knowledge_article_handler,
        crate::handlers::list_knowledge_articles_handler,
        crate::handlers::get_knowledge_article_handler,
        crate::handlers::update_knowledge_article_handler,
        crate::handlers::delete_knowledge_article_handler,
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
            AutomationRule,
            CreateAutomationRuleRequest,
            UpdateAutomationRuleRequest,
            KnowledgeArticle,
            CreateKnowledgeArticleRequest,
            UpdateKnowledgeArticleRequest,
            SeverityCount,
            TypeCount,
            SourceCount,
        ),
    ),
    tags(
        (name = "tickets", description = "工单管理 API"),
        (name = "sla", description = "SLA 管理 API"),
        (name = "sla", description = "SLA 策略与统计 API"),
    ),
    info(
        title = "TOPEMS Ticket API",
        version = "1.0.0",
        description = "工单服务 API - 包含工单管理、评论、活动、SLA 策略与统计"
    )
)]
pub struct TicketApiDoc;
