# Probe P-07: utoipa schema vs handler 签名一致性探针

> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0

## 摘要统计

| 指标 | 数值 |
|------|------|
| 扫描 .rs 文件数 | 129 |
| utoipa::path 注解总数 | 794 |
| 签名匹配数 | 794 |
| 不匹配总数 | 0 |
| - error 级 | 0 |
| - warn 级 | 0 |
| CI 严重度 | GREEN |

## 1. Error 级不匹配（阻断级）

> 无 error 级发现。

## 2. Warn 级不匹配（告警级）

> 无 warn 级发现。

## 3. 全部注解检查清单

共 794 个 utoipa::path 注解：

| # | 方法 | 路径 | handler | request_body | pathParams | queryParams | 状态 | 文件 | 行号 |
|---|------|------|---------|--------------|------------|-------------|------|------|------|
| 1 | POST | `/api/ai/generate` | generate | AIGenerateRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 17 |
| 2 | POST | `/api/ai/validate` | validate | ValidateRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 98 |
| 3 | POST | `/api/ai/complete` | complete | CompleteRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 265 |
| 4 | POST | `/api/ai/summarize` | summarize | SummarizeRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 397 |
| 5 | GET | `/api/ai/templates` | list_templates | - | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 472 |
| 6 | POST | `/api/ai/chat` | chat | ChatRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 523 |
| 7 | POST | `/search` | ai_search | AiSearchRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 647 |
| 8 | POST | `/api/ai/assistant/report` | report_assistant | ReportAssistantRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 775 |
| 9 | POST | `/api/ai/assistant/flow` | flow_assistant | FlowAssistantRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 830 |
| 10 | POST | `/api/ai/assistant/anomaly/predict` | anomaly_predict | AnomalyPredictRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 894 |
| 11 | POST | `/api/ai/assistant/knowledge/ask` | knowledge_ask | KnowledgeAskRequest | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 943 |
| 12 | GET | `/api/ai/connectors` | list_connectors | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 13 |
| 13 | GET | `/api/ai/connectors/get` | get_connector | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 42 |
| 14 | POST | `/api/ai/connectors/create` | create_connector | CreateConnectorRequest | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 80 |
| 15 | POST | `/api/ai/connectors/update` | update_connector | UpdateConnectorRequest | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 135 |
| 16 | POST | `/api/ai/connectors/delete` | delete_connector | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 196 |
| 17 | GET | `/api/ai/connectors/test` | test_connector | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 232 |
| 18 | POST | `/api/ai/connectors/query` | query_data | DataQueryRequest | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 285 |
| 19 | GET | `/` | home | - | - | - | OK | svc/ai/src/handlers/health.rs | 12 |
| 20 | GET | `/health` | health | - | - | - | OK | svc/ai/src/handlers/health.rs | 24 |
| 21 | GET | `/health/detailed` | health_check_detailed | - | - | - | OK | svc/ai/src/handlers/health.rs | 50 |
| 22 | POST | `/api/ai/agent/run` | agent_run | crate::services::AgentRequest | - | - | OK | svc/ai/src/modules/agent.rs | 14 |
| 23 | GET | `/api/ai/agent/tools` | list_agent_tools | - | - | - | OK | svc/ai/src/modules/agent.rs | 33 |
| 24 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/ai/src/modules/ai_plugin.rs | 41 |
| 25 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/ai/src/modules/ai_plugin.rs | 136 |
| 26 | POST | `/api/ai/analysis/sentiment` | _analysis_sentiment | crate::modules::models::SentimentAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 5 |
| 27 | POST | `/api/ai/analysis/classify` | _analysis_classify | crate::modules::models::ClassifyTextRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 28 |
| 28 | POST | `/api/ai/analysis/entities` | _analysis_entities | crate::modules::models::ExtractEntitiesRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 37 |
| 29 | POST | `/api/ai/analysis/keywords` | _analysis_keywords | crate::modules::models::ExtractKeywordsRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 46 |
| 30 | POST | `/api/ai/analysis/history` | _analysis_history | crate::modules::models::AnalysisHistoryRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 55 |
| 31 | POST | `/api/ai/code/generate` | _code_generate | crate::modules::code_assistant::CodeGenerateRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 65 |
| 32 | POST | `/api/ai/code/explain` | _code_explain | crate::modules::code_assistant::CodeExplainRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 74 |
| 33 | POST | `/api/ai/code/fix` | _code_fix | crate::modules::code_assistant::CodeFixRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 83 |
| 34 | POST | `/api/ai/code/optimize` | _code_optimize | crate::modules::code_assistant::CodeOptimizeRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 92 |
| 35 | POST | `/api/ai/code/review` | _code_review | crate::modules::code_assistant::CodeReviewRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 101 |
| 36 | POST | `/api/ai/documents/upload` | _document_upload | - | - | - | OK | svc/ai/src/modules/openapi.rs | 111 |
| 37 | POST | `/api/ai/documents/{id}/process` | _document_process | crate::modules::models::ProcessDocumentRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 119 |
| 38 | GET | `/api/ai/documents/{id}` | _document_get | - | - | - | OK | svc/ai/src/modules/openapi.rs | 128 |
| 39 | DELETE | `/api/ai/documents/{id}` | _document_delete | - | - | - | OK | svc/ai/src/modules/openapi.rs | 136 |
| 40 | GET | `/api/ai/documents` | _document_list | - | - | - | OK | svc/ai/src/modules/openapi.rs | 144 |
| 41 | POST | `/api/ai/documents` | _document_create | - | - | - | OK | svc/ai/src/modules/openapi.rs | 152 |
| 42 | PUT | `/api/ai/documents/{id}` | _document_update | - | - | - | OK | svc/ai/src/modules/openapi.rs | 160 |
| 43 | POST | `/api/ai/documents/{id}/extract` | _document_extract | crate::modules::models::ExtractDocumentRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 168 |
| 44 | POST | `/api/ai/documents/vectorize-from-file` | _document_vectorize_from_file | crate::modules::models::VectorizeFromFileRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 177 |
| 45 | POST | `/api/ai/documents/{id}/summarize` | _document_summarize | crate::modules::models::SummarizeDocumentRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 186 |
| 46 | POST | `/api/ai/documents/{id}/key-points` | _document_key_points | crate::modules::models::ExtractKeyPointsRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 195 |
| 47 | POST | `/api/ai/documents/qa` | _document_qa | crate::modules::models::DocumentQAQuestionRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 204 |
| 48 | POST | `/api/ai/embedding/generate` | _embedding_generate | crate::modules::embedding::EmbeddingRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 214 |
| 49 | POST | `/api/ai/multimodal/image/analyze` | _multimodal_image_analyze | crate::services::multimodal::ImageAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 224 |
| 50 | POST | `/api/ai/multimodal/image/caption` | _multimodal_image_caption | crate::services::multimodal::ImageAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 233 |
| 51 | POST | `/api/ai/multimodal/image/objects` | _multimodal_image_objects | crate::services::multimodal::ImageAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 242 |
| 52 | POST | `/api/ai/multimodal/image/text` | _multimodal_image_text | crate::services::multimodal::ImageAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 251 |
| 53 | POST | `/api/ai/multimodal/image/describe` | _multimodal_image_describe | crate::services::multimodal::ImageAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 260 |
| 54 | POST | `/api/ai/multimodal/video/analyze` | _multimodal_video_analyze | crate::services::multimodal::VideoAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 269 |
| 55 | POST | `/api/ai/multimodal/video/summary` | _multimodal_video_summary | crate::services::multimodal::VideoAnalysisRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 278 |
| 56 | POST | `/api/ai/qa/ask` | _qa_ask | crate::modules::models::AskRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 288 |
| 57 | POST | `/api/ai/qa/ask-with-context` | _qa_ask_with_context | crate::modules::models::AskWithContextRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 297 |
| 58 | POST | `/api/ai/qa/ask-structured` | _qa_ask_structured | crate::modules::qa::AskStructuredRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 306 |
| 59 | POST | `/api/ai/qa/ask-conversation` | _qa_ask_conversation | crate::modules::qa::AskWithConversationRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 315 |
| 60 | POST | `/api/ai/qa/classify` | _qa_classify | crate::modules::qa::ClassifyRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 324 |
| 61 | GET | `/api/ai/qa/history` | _qa_history | - | - | - | OK | svc/ai/src/modules/openapi.rs | 333 |
| 62 | DELETE | `/api/ai/qa/history/{id}` | _qa_delete_history | - | - | - | OK | svc/ai/src/modules/openapi.rs | 341 |
| 63 | POST | `/api/ai/qa/history/batch-delete` | _qa_batch_delete_history | crate::modules::qa::BatchDeleteRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 349 |
| 64 | POST | `/api/ai/qa/feedback` | _qa_feedback | crate::modules::models::FeedbackRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 358 |
| 65 | POST | `/api/ai/recommend` | _recommend | crate::services::recommendation::RecommendationRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 368 |
| 66 | POST | `/api/ai/profile/get` | _profile_get | serde_json::Value | - | - | OK | svc/ai/src/modules/openapi.rs | 377 |
| 67 | POST | `/api/ai/profile/update` | _profile_update | serde_json::Value | - | - | OK | svc/ai/src/modules/openapi.rs | 386 |
| 68 | POST | `/api/ai/recommend/documents` | _recommend_documents | serde_json::Value | - | - | OK | svc/ai/src/modules/openapi.rs | 395 |
| 69 | POST | `/api/ai/recommend/opportunities` | _recommend_opportunities | serde_json::Value | - | - | OK | svc/ai/src/modules/openapi.rs | 404 |
| 70 | POST | `/api/ai/recommend/knowledge` | _recommend_knowledge | serde_json::Value | - | - | OK | svc/ai/src/modules/openapi.rs | 413 |
| 71 | POST | `/api/ai/vectors/store` | _vector_store | crate::modules::models::StoreVectorRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 423 |
| 72 | POST | `/api/ai/vectors/search` | _vector_search | crate::modules::models::VectorSearchRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 432 |
| 73 | GET | `/api/ai/vectors/{id}` | _vector_get | - | - | - | OK | svc/ai/src/modules/openapi.rs | 441 |
| 74 | DELETE | `/api/ai/vectors/{id}` | _vector_delete | - | - | - | OK | svc/ai/src/modules/openapi.rs | 449 |
| 75 | POST | `/api/ai/vectors/batch-store` | _vector_batch_store | crate::modules::models::BatchStoreVectorsRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 457 |
| 76 | POST | `/api/ai/vectors/hybrid-search` | _vector_hybrid_search | crate::modules::models::HybridSearchRequest | - | - | OK | svc/ai/src/modules/openapi.rs | 466 |
| 77 | GET | `/api/ai/vectors/stats` | _vector_stats | - | - | - | OK | svc/ai/src/modules/openapi.rs | 475 |
| 78 | POST | `/api/ai/vectors/clear` | _vector_clear | - | - | - | OK | svc/ai/src/modules/openapi.rs | 483 |
| 79 | - | `-` | - | - | - | - | OK | svc/ai/src/routes.rs | 25 |
| 80 | GET | `/api/bi/analysis` | list_analyses | - | - | - | OK | svc/analytics/src/modules/bi/analysis.rs | 7 |
| 81 | POST | `/api/bi/analysis` | create_analysis | - | - | - | OK | svc/analytics/src/modules/bi/analysis.rs | 27 |
| 82 | GET | `/api/bi/analysis/{id}` | get_analysis | - | id | - | OK | svc/analytics/src/modules/bi/analysis.rs | 47 |
| 83 | POST | `/api/bi/analysis/{id}/execute` | execute_analysis | - | id | - | OK | svc/analytics/src/modules/bi/analysis.rs | 71 |
| 84 | GET | `/dashboard` | list_dashboards | - | - | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 16 |
| 85 | POST | `/dashboard` | create_dashboard | CreateDashboardRequest | - | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 72 |
| 86 | GET | `/dashboard/{id}` | get_dashboard | - | id | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 130 |
| 87 | PUT | `/dashboard/{id}` | update_dashboard | UpdateDashboardRequest | id | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 190 |
| 88 | DELETE | `/dashboard/{id}` | delete_dashboard | - | id | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 259 |
| 89 | GET | `/report` | list_reports | - | - | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 73 |
| 90 | POST | `/report` | create_report | CreateReportRequest | - | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 132 |
| 91 | GET | `/report/{id}` | get_report | - | id | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 198 |
| 92 | PUT | `/report/{id}` | update_report | UpdateReportRequest | id | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 261 |
| 93 | DELETE | `/report/{id}` | delete_report | - | id | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 339 |
| 94 | GET | `/widget` | list_widgets | - | - | - | OK | svc/analytics/src/modules/bi/widget.rs | 136 |
| 95 | POST | `/widget` | create_widget | CreateWidgetRequest | - | - | OK | svc/analytics/src/modules/bi/widget.rs | 250 |
| 96 | GET | `/widget/{id}` | get_widget | - | id | - | OK | svc/analytics/src/modules/bi/widget.rs | 318 |
| 97 | PUT | `/widget/{id}` | update_widget | UpdateWidgetRequest | id | - | OK | svc/analytics/src/modules/bi/widget.rs | 381 |
| 98 | DELETE | `/widget/{id}` | delete_widget | - | id | - | OK | svc/analytics/src/modules/bi/widget.rs | 463 |
| 99 | GET | `/plans` | list_plans | - | - | - | OK | svc/billing/src/handlers.rs | 142 |
| 100 | GET | `/plans/{id}` | get_plan | - | id | - | OK | svc/billing/src/handlers.rs | 162 |
| 101 | GET | `/subscriptions/{tenant_id}` | get_subscription | - | tenant_id | - | OK | svc/billing/src/handlers.rs | 191 |
| 102 | POST | `/subscriptions` | create_subscription | CreateSubscriptionRequest | - | - | OK | svc/billing/src/handlers.rs | 253 |
| 103 | PUT | `/subscriptions/{tenant_id}` | cancel_subscription | CancelSubscriptionRequest | tenant_id | - | OK | svc/billing/src/handlers.rs | 308 |
| 104 | GET | `/invoices/{tenant_id}` | list_invoices | - | tenant_id | - | OK | svc/billing/src/handlers.rs | 350 |
| 105 | GET | `/usage/{tenant_id}` | get_usage_summary | - | tenant_id | - | OK | svc/billing/src/handlers.rs | 377 |
| 106 | POST | `/usage/{tenant_id}/{metric_type}` | record_usage | i64 | tenant_id, metric_type | - | OK | svc/billing/src/handlers.rs | 487 |
| 107 | GET | `/im/rooms` | list_rooms | - | - | - | OK | svc/communication/src/im.rs | 9 |
| 108 | POST | `/im/rooms` | create_room | serde_json::Value | - | - | OK | svc/communication/src/im.rs | 26 |
| 109 | GET | `/mail/emails` | list_emails | - | - | - | OK | svc/communication/src/mail.rs | 67 |
| 110 | POST | `/mail/emails` | send_email | SendEmailRequest | - | - | OK | svc/communication/src/mail.rs | 145 |
| 111 | POST | `/notify/send` | send_notification | SendNotificationRequest | - | - | OK | svc/communication/src/notification.rs | 17 |
| 112 | POST | `/notification/notifications` | create_notification | serde_json::Value | - | - | OK | svc/communication/src/notification.rs | 173 |
| 113 | GET | `/notify/list` | list_notifications | - | - | page, page_size, unread_only | OK | svc/communication/src/notification.rs | 201 |
| 114 | PUT | `/notification/notifications/{id}` | mark_as_read | - | id | - | OK | svc/communication/src/notification.rs | 324 |
| 115 | GET | `/notification/notifications` | get_notifications | - | - | page, page_size, unread_only | OK | svc/communication/src/notification.rs | 468 |
| 116 | DELETE | `/notification/notifications/{id}` | delete_notification | - | id | - | OK | svc/communication/src/notification.rs | 616 |
| 117 | GET | `/notification/notifications/{id}` | get_notification | - | id | - | OK | svc/communication/src/notification.rs | 746 |
| 118 | GET | `/contacts` | list_contacts | - | - | page, page_size, search, customer_id | OK | svc/crm/src/modules/contact.rs | 44 |
| 119 | POST | `/contacts` | create_contact | CreateContactRequest | - | - | OK | svc/crm/src/modules/contact.rs | 137 |
| 120 | GET | `/customers` | list_customers | - | - | page, page_size, search, status, customer_type, rating, industry | OK | svc/crm/src/modules/customer.rs | 61 |
| 121 | POST | `/customers` | create_customer | CreateCustomerRequest | - | - | OK | svc/crm/src/modules/customer.rs | 165 |
| 122 | GET | `/customers/{id}` | get_customer | - | id | - | OK | svc/crm/src/modules/customer.rs | 323 |
| 123 | PUT | `/customers/{id}` | update_customer | UpdateCustomerRequest | id | - | OK | svc/crm/src/modules/customer.rs | 382 |
| 124 | DELETE | `/customers/{id}` | delete_customer | - | id | - | OK | svc/crm/src/modules/customer.rs | 581 |
| 125 | GET | `/opportunities` | list_opportunities | - | - | page, page_size, search, stage, customer_id | OK | svc/crm/src/modules/opportunity.rs | 99 |
| 126 | POST | `/opportunities` | create_opportunity | CreateOpportunityRequest | - | - | OK | svc/crm/src/modules/opportunity.rs | 193 |
| 127 | GET | `/api/ehs/incidents` | list_accidents | - | - | - | OK | svc/ehs/src/modules/accident.rs | 213 |
| 128 | POST | `/api/ehs/incidents` | report_accident | CreateAccidentRequest | - | - | OK | svc/ehs/src/modules/accident.rs | 232 |
| 129 | GET | `/api/ehs/incidents/{id}` | get_accident | - | id | - | OK | svc/ehs/src/modules/accident.rs | 273 |
| 130 | PUT | `/api/ehs/incidents/{id}` | update_accident | serde_json::Value | id | - | OK | svc/ehs/src/modules/accident.rs | 347 |
| 131 | DELETE | `/api/ehs/incidents/{id}` | delete_accident | - | id | - | OK | svc/ehs/src/modules/accident.rs | 390 |
| 132 | POST | `/api/ehs/incidents/{id}/investigation` | start_investigation | CreateInvestigationRequest | id | - | OK | svc/ehs/src/modules/accident.rs | 411 |
| 133 | PUT | `/api/ehs/incidents/{id}/investigation` | update_investigation | UpdateInvestigationRequest | id | - | OK | svc/ehs/src/modules/accident.rs | 451 |
| 134 | POST | `/api/ehs/incidents/{id}/investigation/complete` | complete_investigation | - | id | - | OK | svc/ehs/src/modules/accident.rs | 498 |
| 135 | POST | `/api/ehs/incidents/{id}/treatment` | create_treatment | CreateTreatmentRequest | id | - | OK | svc/ehs/src/modules/accident.rs | 553 |
| 136 | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | update_treatment_action | UpdateTreatmentActionRequest | id, action_id | - | OK | svc/ehs/src/modules/accident.rs | 607 |
| 137 | POST | `/api/ehs/incidents/{id}/treatment/complete` | complete_treatment | - | id | - | OK | svc/ehs/src/modules/accident.rs | 648 |
| 138 | POST | `/api/ehs/incidents/{id}/review` | create_review | CreateReviewRequest | id | - | OK | svc/ehs/src/modules/accident.rs | 705 |
| 139 | POST | `/api/ehs/incidents/{id}/close` | close_accident | - | id | - | OK | svc/ehs/src/modules/accident.rs | 742 |
| 140 | GET | `/api/ehs/sync-records` | list_sync_records | - | - | - | OK | svc/ehs/src/modules/data_sync.rs | 73 |
| 141 | GET | `/api/ehs/sync-records/{id}` | get_sync_record | - | id | - | OK | svc/ehs/src/modules/data_sync.rs | 146 |
| 142 | POST | `/api/ehs/sync/hazard-to-qms` | sync_hazard_to_qms | SyncHazardToQmsRequest | - | - | OK | svc/ehs/src/modules/data_sync.rs | 197 |
| 143 | POST | `/api/ehs/sync/accident-to-lims` | sync_accident_to_lims | SyncAccidentToLimsRequest | - | - | OK | svc/ehs/src/modules/data_sync.rs | 298 |
| 144 | POST | `/api/ehs/sync-records/{id}/retry` | retry_sync | - | id | - | OK | svc/ehs/src/modules/data_sync.rs | 404 |
| 145 | DELETE | `/api/ehs/sync-records/{id}` | delete_sync_record | - | id | - | OK | svc/ehs/src/modules/data_sync.rs | 455 |
| 146 | GET | `/api/ehs/sync/configs` | list_sync_configs | - | - | - | OK | svc/ehs/src/modules/data_sync.rs | 499 |
| 147 | PUT | `/api/ehs/sync/configs` | update_sync_configs | serde_json::Value | - | - | OK | svc/ehs/src/modules/data_sync.rs | 528 |
| 148 | POST | `/api/ehs/sync/retry` | batch_retry_sync | serde_json::Value | - | - | OK | svc/ehs/src/modules/data_sync.rs | 579 |
| 149 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/ehs/src/modules/ehs_plugin.rs | 42 |
| 150 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/ehs/src/modules/ehs_plugin.rs | 174 |
| 151 | GET | `/api/ehs/drills/plans` | list_drill_plans | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 274 |
| 152 | POST | `/api/ehs/drills/plans` | create_drill_plan | CreateDrillPlanRequest | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 293 |
| 153 | GET | `/api/ehs/drills/plans/{id}` | get_drill_plan | - | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 335 |
| 154 | PUT | `/api/ehs/drills/plans/{id}` | update_drill_plan | UpdateDrillPlanRequest | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 377 |
| 155 | DELETE | `/api/ehs/drills/plans/{id}` | delete_drill_plan | - | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 423 |
| 156 | GET | `/api/ehs/drills/records` | list_drill_records | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 444 |
| 157 | POST | `/api/ehs/drills/records` | create_drill_record | CreateDrillRecordRequest | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 463 |
| 158 | GET | `/api/ehs/drills/records/{id}` | get_drill_record | - | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 509 |
| 159 | PUT | `/api/ehs/drills/records/{id}` | update_drill_record | UpdateDrillRecordRequest | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 592 |
| 160 | DELETE | `/api/ehs/drills/records/{id}` | delete_drill_record | - | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 642 |
| 161 | POST | `/api/ehs/drills/records/{id}/evaluation` | create_drill_evaluation | CreateEvaluationRequest | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 663 |
| 162 | GET | `/api/ehs/drills/records/{id}/problems` | list_drill_problems | - | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 704 |
| 163 | POST | `/api/ehs/drills/records/{id}/problems` | create_drill_problem | CreateDrillProblemRequest | id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 728 |
| 164 | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | update_drill_problem | UpdateDrillProblemRequest | id, problem_id | - | OK | svc/ehs/src/modules/emergency_drill.rs | 771 |
| 165 | GET | `/api/ehs/drills/statistics` | get_drill_statistics | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 832 |
| 166 | GET | `/api/ehs/drills/types` | list_drill_types | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 875 |
| 167 | GET | `/api/ehs/emergency-plans` | list_plans | - | - | - | OK | svc/ehs/src/modules/emergency_plan.rs | 195 |
| 168 | POST | `/api/ehs/emergency-plans` | create_plan | CreatePlanRequest | - | - | OK | svc/ehs/src/modules/emergency_plan.rs | 214 |
| 169 | GET | `/api/ehs/emergency-plans/{id}` | get_plan | - | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 261 |
| 170 | PUT | `/api/ehs/emergency-plans/{id}` | update_plan | UpdatePlanRequest | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 378 |
| 171 | DELETE | `/api/ehs/emergency-plans/{id}` | delete_plan | - | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 427 |
| 172 | GET | `/api/ehs/emergency-plans/{id}/supplies` | list_plan_supplies | - | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 448 |
| 173 | POST | `/api/ehs/emergency-plans/{id}/supplies` | add_plan_supply | CreateSupplyRequest | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 472 |
| 174 | DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | delete_plan_supply | - | id, supply_id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 511 |
| 175 | POST | `/api/ehs/emergency-plans/{id}/submit-approval` | submit_plan_approval | SubmitApprovalRequest | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 533 |
| 176 | POST | `/api/ehs/emergency-plans/{id}/approve` | approve_plan | ApprovalRequest | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 582 |
| 177 | GET | `/api/ehs/emergency-plans/{id}/versions` | list_plan_versions | - | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 619 |
| 178 | POST | `/api/ehs/emergency-plans/{id}/versions` | create_new_version | serde_json::Value | id | - | OK | svc/ehs/src/modules/emergency_plan.rs | 643 |
| 179 | GET | `/api/ehs/emergency-plans/categories` | list_plan_categories | - | - | - | OK | svc/ehs/src/modules/emergency_plan.rs | 682 |
| 180 | GET | `/api/ehs/environment/records` | list_records | - | - | - | OK | svc/ehs/src/modules/environment.rs | 59 |
| 181 | POST | `/api/ehs/environment/records` | create_record | serde_json::Value | - | - | OK | svc/ehs/src/modules/environment.rs | 78 |
| 182 | GET | `/api/ehs/environmental-compliance/regulations` | list_regulations | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 383 |
| 183 | POST | `/api/ehs/environmental-compliance/regulations` | create_regulation | CreateRegulationRequest | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 402 |
| 184 | GET | `/api/ehs/environmental-compliance/regulations/{id}` | get_regulation | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 446 |
| 185 | PUT | `/api/ehs/environmental-compliance/regulations/{id}` | update_regulation | UpdateRegulationRequest | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 492 |
| 186 | DELETE | `/api/ehs/environmental-compliance/regulations/{id}` | delete_regulation | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 540 |
| 187 | GET | `/api/ehs/environmental-compliance/evaluations` | list_evaluations | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 561 |
| 188 | POST | `/api/ehs/environmental-compliance/evaluations` | create_evaluation | CreateEvaluationRequest | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 580 |
| 189 | GET | `/api/ehs/environmental-compliance/evaluations/{id}` | get_evaluation | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 624 |
| 190 | PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | update_evaluation | UpdateEvaluationRequest | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 668 |
| 191 | DELETE | `/api/ehs/environmental-compliance/evaluations/{id}` | delete_evaluation | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 724 |
| 192 | GET | `/api/ehs/environmental-compliance/monitoring` | list_monitor_records | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 745 |
| 193 | POST | `/api/ehs/environmental-compliance/monitoring` | create_monitor_record | CreateMonitorRecordRequest | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 764 |
| 194 | GET | `/api/ehs/environmental-compliance/monitoring/{id}` | get_monitor_record | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 811 |
| 195 | DELETE | `/api/ehs/environmental-compliance/monitoring/{id}` | delete_monitor_record | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 858 |
| 196 | GET | `/api/ehs/environmental-compliance/permits` | list_permits | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 879 |
| 197 | POST | `/api/ehs/environmental-compliance/permits` | create_permit | CreatePermitRequest | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 898 |
| 198 | GET | `/api/ehs/environmental-compliance/permits/{id}` | get_permit | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 943 |
| 199 | PUT | `/api/ehs/environmental-compliance/permits/{id}` | update_permit | UpdatePermitRequest | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 992 |
| 200 | DELETE | `/api/ehs/environmental-compliance/permits/{id}` | delete_permit | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1039 |
| 201 | GET | `/api/ehs/environmental-compliance/incidents` | list_incidents | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1060 |
| 202 | POST | `/api/ehs/environmental-compliance/incidents` | create_incident | CreateIncidentRequest | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1079 |
| 203 | GET | `/api/ehs/environmental-compliance/incidents/{id}` | get_incident | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1128 |
| 204 | PUT | `/api/ehs/environmental-compliance/incidents/{id}` | update_incident | UpdateIncidentRequest | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1177 |
| 205 | DELETE | `/api/ehs/environmental-compliance/incidents/{id}` | delete_incident | - | id | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1238 |
| 206 | GET | `/api/ehs/environmental-compliance/statistics` | get_compliance_statistics | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1259 |
| 207 | GET | `/api/ehs/environmental-compliance/regulations/categories` | list_regulation_categories | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1302 |
| 208 | GET | `/api/ehs/environmental-compliance/monitoring/types` | list_monitor_types | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1326 |
| 209 | GET | `/api/ehs/issues` | list_hazards | - | - | - | OK | svc/ehs/src/modules/hazard.rs | 184 |
| 210 | POST | `/api/ehs/issues` | create_hazard | CreateHazardRequest | - | - | OK | svc/ehs/src/modules/hazard.rs | 226 |
| 211 | GET | `/api/ehs/issues/{id}` | get_hazard | - | id | - | OK | svc/ehs/src/modules/hazard.rs | 336 |
| 212 | PUT | `/api/ehs/issues/{id}` | update_hazard | serde_json::Value | id | - | OK | svc/ehs/src/modules/hazard.rs | 410 |
| 213 | DELETE | `/api/ehs/issues/{id}` | delete_hazard | - | id | - | OK | svc/ehs/src/modules/hazard.rs | 461 |
| 214 | POST | `/api/ehs/issues/{id}/rectification` | start_rectification | CreateRectificationRequest | id | - | OK | svc/ehs/src/modules/hazard.rs | 488 |
| 215 | PUT | `/api/ehs/issues/{id}/rectification` | update_rectification | UpdateRectificationRequest | id | - | OK | svc/ehs/src/modules/hazard.rs | 528 |
| 216 | POST | `/api/ehs/issues/{id}/rectification/submit` | submit_rectification | - | id | - | OK | svc/ehs/src/modules/hazard.rs | 586 |
| 217 | POST | `/api/ehs/issues/{id}/verification` | verify_hazard | CreateVerificationRequest | id | - | OK | svc/ehs/src/modules/hazard.rs | 624 |
| 218 | POST | `/api/ehs/issues/{id}/close` | close_hazard | - | id | - | OK | svc/ehs/src/modules/hazard.rs | 660 |
| 219 | POST | `/api/ehs/issues/{id}/approval/start` | start_hazard_approval | StartApprovalRequest | id | - | OK | svc/ehs/src/modules/hazard.rs | 714 |
| 220 | POST | `/api/ehs/issues/{id}/approval/approve` | approve_hazard | ApprovalActionRequest | id | - | OK | svc/ehs/src/modules/hazard.rs | 783 |
| 221 | POST | `/api/ehs/issues/{id}/approval/reject` | reject_hazard | ApprovalActionRequest | id | - | OK | svc/ehs/src/modules/hazard.rs | 828 |
| 222 | GET | `/api/ehs/hazardous-materials` | list_materials | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 288 |
| 223 | POST | `/api/ehs/hazardous-materials` | create_material | CreateMaterialRequest | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 307 |
| 224 | GET | `/api/ehs/hazardous-materials/{id}` | get_material | - | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 358 |
| 225 | PUT | `/api/ehs/hazardous-materials/{id}` | update_material | UpdateMaterialRequest | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 477 |
| 226 | DELETE | `/api/ehs/hazardous-materials/{id}` | delete_material | - | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 530 |
| 227 | GET | `/api/ehs/hazardous-materials/{id}/stocks` | list_material_stocks | - | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 551 |
| 228 | GET | `/api/ehs/hazardous-materials/stock-records` | list_stock_records | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 575 |
| 229 | POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | create_stock_in | CreateStockRecordRequest | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 594 |
| 230 | POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | create_stock_out | CreateStockRecordRequest | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 637 |
| 231 | GET | `/api/ehs/hazardous-materials/stock-records/{id}` | get_stock_record | - | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 680 |
| 232 | GET | `/api/ehs/hazardous-materials/{id}/msds` | get_material_msds | - | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 723 |
| 233 | PUT | `/api/ehs/hazardous-materials/{id}/msds` | update_material_msds | UpdateMsdsRequest | id | - | OK | svc/ehs/src/modules/hazardous_material.rs | 772 |
| 234 | GET | `/api/ehs/hazardous-materials/statistics` | get_material_statistics | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 821 |
| 235 | GET | `/api/ehs/hazardous-materials/categories` | list_material_categories | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 868 |
| 236 | POST | `/api/ehs/hazardous-materials/categories` | create_material_category | serde_json::Value | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 894 |
| 237 | GET | `/api/ehs/health` | list_records | - | - | - | OK | svc/ehs/src/modules/health.rs | 50 |
| 238 | POST | `/api/ehs/health` | create_record | serde_json::Value | - | - | OK | svc/ehs/src/modules/health.rs | 69 |
| 239 | GET | `/api/ehs/occupational-disease/factors` | list_hazard_factors | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 340 |
| 240 | POST | `/api/ehs/occupational-disease/factors` | create_hazard_factor | CreateHazardFactorRequest | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 359 |
| 241 | GET | `/api/ehs/occupational-disease/factors/{id}` | get_hazard_factor | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 402 |
| 242 | PUT | `/api/ehs/occupational-disease/factors/{id}` | update_hazard_factor | UpdateHazardFactorRequest | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 445 |
| 243 | DELETE | `/api/ehs/occupational-disease/factors/{id}` | delete_hazard_factor | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 490 |
| 244 | GET | `/api/ehs/occupational-disease/detections` | list_detection_records | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 511 |
| 245 | POST | `/api/ehs/occupational-disease/detections` | create_detection_record | CreateDetectionRecordRequest | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 530 |
| 246 | GET | `/api/ehs/occupational-disease/detections/{id}` | get_detection_record | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 576 |
| 247 | DELETE | `/api/ehs/occupational-disease/detections/{id}` | delete_detection_record | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 622 |
| 248 | GET | `/api/ehs/occupational-disease/cases` | list_disease_cases | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 643 |
| 249 | POST | `/api/ehs/occupational-disease/cases` | create_disease_case | CreateDiseaseCaseRequest | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 662 |
| 250 | GET | `/api/ehs/occupational-disease/cases/{id}` | get_disease_case | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 710 |
| 251 | PUT | `/api/ehs/occupational-disease/cases/{id}` | update_disease_case | UpdateDiseaseCaseRequest | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 758 |
| 252 | DELETE | `/api/ehs/occupational-disease/cases/{id}` | delete_disease_case | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 815 |
| 253 | GET | `/api/ehs/occupational-disease/protection-measures` | list_protection_measures | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 836 |
| 254 | POST | `/api/ehs/occupational-disease/protection-measures` | create_protection_measure | CreateProtectionMeasureRequest | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 855 |
| 255 | GET | `/api/ehs/occupational-disease/protection-measures/{id}` | get_protection_measure | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 897 |
| 256 | PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | update_protection_measure | serde_json::Value | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 939 |
| 257 | DELETE | `/api/ehs/occupational-disease/protection-measures/{id}` | delete_protection_measure | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 993 |
| 258 | GET | `/api/ehs/occupational-disease/trainings` | list_health_trainings | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1014 |
| 259 | POST | `/api/ehs/occupational-disease/trainings` | create_health_training | CreateHealthTrainingRequest | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1033 |
| 260 | GET | `/api/ehs/occupational-disease/trainings/{id}` | get_health_training | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1075 |
| 261 | DELETE | `/api/ehs/occupational-disease/trainings/{id}` | delete_health_training | - | id | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1117 |
| 262 | GET | `/api/ehs/occupational-disease/statistics` | get_disease_statistics | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1138 |
| 263 | GET | `/api/ehs/occupational-disease/factor-types` | list_factor_types | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1179 |
| 264 | GET | `/api/ehs/occupational-health/exam-plans` | list_exam_plans | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 338 |
| 265 | POST | `/api/ehs/occupational-health/exam-plans` | create_exam_plan | CreateExamPlanRequest | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 357 |
| 266 | GET | `/api/ehs/occupational-health/exam-plans/{id}` | get_exam_plan | - | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 398 |
| 267 | PUT | `/api/ehs/occupational-health/exam-plans/{id}` | update_exam_plan | UpdateExamPlanRequest | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 439 |
| 268 | DELETE | `/api/ehs/occupational-health/exam-plans/{id}` | delete_exam_plan | - | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 484 |
| 269 | GET | `/api/ehs/occupational-health/exam-records` | list_exam_records | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 505 |
| 270 | POST | `/api/ehs/occupational-health/exam-records` | create_exam_record | CreateExamRecordRequest | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 524 |
| 271 | GET | `/api/ehs/occupational-health/exam-records/{id}` | get_exam_record | - | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 580 |
| 272 | PUT | `/api/ehs/occupational-health/exam-records/{id}` | update_exam_record | UpdateExamRecordRequest | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 636 |
| 273 | DELETE | `/api/ehs/occupational-health/exam-records/{id}` | delete_exam_record | - | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 694 |
| 274 | GET | `/api/ehs/occupational-health/archives/{employee_id}` | get_health_archive | - | employee_id | - | OK | svc/ehs/src/modules/occupational_health.rs | 715 |
| 275 | GET | `/api/ehs/occupational-health/contraindications` | list_contraindications | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 752 |
| 276 | POST | `/api/ehs/occupational-health/contraindications` | create_contraindication | CreateContraindicationRequest | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 771 |
| 277 | GET | `/api/ehs/occupational-health/contraindications/{id}` | get_contraindication | - | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 811 |
| 278 | PUT | `/api/ehs/occupational-health/contraindications/{id}` | update_contraindication | UpdateContraindicationRequest | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 854 |
| 279 | DELETE | `/api/ehs/occupational-health/contraindications/{id}` | delete_contraindication | - | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 901 |
| 280 | GET | `/api/ehs/occupational-health/abnormalities` | list_abnormalities | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 922 |
| 281 | PUT | `/api/ehs/occupational-health/abnormalities/{id}` | update_abnormality | UpdateAbnormalityRequest | id | - | OK | svc/ehs/src/modules/occupational_health.rs | 941 |
| 282 | GET | `/api/ehs/occupational-health/statistics` | get_health_statistics | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 985 |
| 283 | GET | `/api/ehs/occupational-health/exam-types` | list_exam_types | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 1024 |
| 284 | GET | `/` | _home | - | - | - | OK | svc/ehs/src/modules/openapi.rs | 6 |
| 285 | GET | `/health` | _health | - | - | - | OK | svc/ehs/src/modules/openapi.rs | 29 |
| 286 | GET | `/api/health/detailed` | _detailed_health | - | - | - | OK | svc/ehs/src/modules/openapi.rs | 37 |
| 287 | GET | `/api/ehs/hazards` | list_risks | - | - | - | OK | svc/ehs/src/modules/risk.rs | 82 |
| 288 | POST | `/api/ehs/hazards` | create_risk | serde_json::Value | - | - | OK | svc/ehs/src/modules/risk.rs | 98 |
| 289 | GET | `/api/ehs/hazards/{id}` | get_risk | - | id | - | OK | svc/ehs/src/modules/risk.rs | 136 |
| 290 | PUT | `/api/ehs/hazards/{id}` | update_risk | serde_json::Value | id | - | OK | svc/ehs/src/modules/risk.rs | 174 |
| 291 | POST | `/api/ehs/hazards/{id}/assessments` | assess_risk | serde_json::Value | id | - | OK | svc/ehs/src/modules/risk.rs | 214 |
| 292 | DELETE | `/api/ehs/hazards/{id}` | delete_risk | - | id | - | OK | svc/ehs/src/modules/risk.rs | 254 |
| 293 | GET | `/api/ehs/hazards/{id}/controls` | list_control_measures | - | id | - | OK | svc/ehs/src/modules/risk.rs | 275 |
| 294 | POST | `/api/ehs/hazards/{id}/controls` | create_control_measure | serde_json::Value | id | - | OK | svc/ehs/src/modules/risk.rs | 322 |
| 295 | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | update_control_measure | serde_json::Value | id, measure_id | - | OK | svc/ehs/src/modules/risk.rs | 368 |
| 296 | DELETE | `/api/ehs/hazards/{id}/controls/{measure_id}` | delete_control_measure | - | id, measure_id | - | OK | svc/ehs/src/modules/risk.rs | 424 |
| 297 | GET | `/api/ehs/checks/plans` | list_plans | - | - | - | OK | svc/ehs/src/modules/safety.rs | 186 |
| 298 | POST | `/api/ehs/checks/plans` | create_plan | CreateInspectionPlanRequest | - | - | OK | svc/ehs/src/modules/safety.rs | 205 |
| 299 | GET | `/api/ehs/checks/plans/{id}` | get_plan | - | id | - | OK | svc/ehs/src/modules/safety.rs | 243 |
| 300 | PUT | `/api/ehs/checks/plans/{id}` | update_plan | serde_json::Value | id | - | OK | svc/ehs/src/modules/safety.rs | 282 |
| 301 | DELETE | `/api/ehs/checks/plans/{id}` | delete_plan | - | id | - | OK | svc/ehs/src/modules/safety.rs | 323 |
| 302 | GET | `/api/ehs/checks/plans/{plan_id}/items` | list_plan_items | - | plan_id | - | OK | svc/ehs/src/modules/safety.rs | 344 |
| 303 | POST | `/api/ehs/checks/plans/{plan_id}/items` | create_plan_item | CreateInspectionItemRequest | plan_id | - | OK | svc/ehs/src/modules/safety.rs | 405 |
| 304 | DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | delete_plan_item | - | plan_id, item_id | - | OK | svc/ehs/src/modules/safety.rs | 445 |
| 305 | GET | `/api/ehs/checks/records` | list_records | - | - | - | OK | svc/ehs/src/modules/safety.rs | 467 |
| 306 | POST | `/api/ehs/checks/records` | create_record | CreateInspectionRecordRequest | - | - | OK | svc/ehs/src/modules/safety.rs | 486 |
| 307 | GET | `/api/ehs/checks/records/{id}` | get_record | - | id | - | OK | svc/ehs/src/modules/safety.rs | 536 |
| 308 | PUT | `/api/ehs/checks/records/{id}` | update_record | UpdateInspectionRecordRequest | id | - | OK | svc/ehs/src/modules/safety.rs | 604 |
| 309 | DELETE | `/api/ehs/checks/records/{id}` | delete_record | - | id | - | OK | svc/ehs/src/modules/safety.rs | 647 |
| 310 | GET | `/api/ehs/training` | list_trainings | - | - | - | OK | svc/ehs/src/modules/training.rs | 133 |
| 311 | POST | `/api/ehs/training` | create_training | serde_json::Value | - | - | OK | svc/ehs/src/modules/training.rs | 152 |
| 312 | GET | `/api/ehs/training/{id}` | get_training | - | id | - | OK | svc/ehs/src/modules/training.rs | 188 |
| 313 | PUT | `/api/ehs/training/{id}` | update_training | serde_json::Value | id | - | OK | svc/ehs/src/modules/training.rs | 224 |
| 314 | DELETE | `/api/ehs/training/{id}` | delete_training | - | id | - | OK | svc/ehs/src/modules/training.rs | 282 |
| 315 | GET | `/api/ehs/training/plans` | list_training_plans | - | - | - | OK | svc/ehs/src/modules/training.rs | 303 |
| 316 | POST | `/api/ehs/training/plans` | create_training_plan | serde_json::Value | - | - | OK | svc/ehs/src/modules/training.rs | 322 |
| 317 | GET | `/api/ehs/training/plans/{id}` | get_training_plan | - | id | - | OK | svc/ehs/src/modules/training.rs | 371 |
| 318 | PUT | `/api/ehs/training/plans/{id}` | update_training_plan | serde_json::Value | id | - | OK | svc/ehs/src/modules/training.rs | 407 |
| 319 | DELETE | `/api/ehs/training/plans/{id}` | delete_training_plan | - | id | - | OK | svc/ehs/src/modules/training.rs | 462 |
| 320 | GET | `/api/ehs/training/records` | list_training_records | - | - | - | OK | svc/ehs/src/modules/training.rs | 483 |
| 321 | POST | `/api/ehs/training/records` | create_training_record | serde_json::Value | - | - | OK | svc/ehs/src/modules/training.rs | 502 |
| 322 | GET | `/api/ehs/training/records/{id}` | get_training_record | - | id | - | OK | svc/ehs/src/modules/training.rs | 554 |
| 323 | PUT | `/api/ehs/training/records/{id}` | update_training_record | serde_json::Value | id | - | OK | svc/ehs/src/modules/training.rs | 590 |
| 324 | DELETE | `/api/ehs/training/records/{id}` | delete_training_record | - | id | - | OK | svc/ehs/src/modules/training.rs | 648 |
| 325 | GET | `/api/ehs/training/certificates` | list_certificates | - | - | - | OK | svc/ehs/src/modules/training.rs | 669 |
| 326 | POST | `/api/ehs/training/certificates` | create_certificate | serde_json::Value | - | - | OK | svc/ehs/src/modules/training.rs | 688 |
| 327 | GET | `/api/ehs/training/certificates/{id}` | get_certificate | - | id | - | OK | svc/ehs/src/modules/training.rs | 734 |
| 328 | PUT | `/api/ehs/training/certificates/{id}` | update_certificate | serde_json::Value | id | - | OK | svc/ehs/src/modules/training.rs | 769 |
| 329 | DELETE | `/api/ehs/training/certificates/{id}` | delete_certificate | - | id | - | OK | svc/ehs/src/modules/training.rs | 821 |
| 330 | GET | `/assets` | list_assets | - | - | page, page_size, search, status | OK | svc/erp/src/modules/asset.rs | 27 |
| 331 | POST | `/assets` | create_asset | CreateAssetRequest | - | - | OK | svc/erp/src/modules/asset.rs | 104 |
| 332 | GET | `/assets/{id}` | get_asset | - | id | - | OK | svc/erp/src/modules/asset.rs | 212 |
| 333 | PUT | `/assets/{id}` | update_asset | UpdateAssetRequest | id | - | OK | svc/erp/src/modules/asset.rs | 255 |
| 334 | DELETE | `/assets/{id}` | delete_asset | - | id | - | OK | svc/erp/src/modules/asset.rs | 391 |
| 335 | GET | `/erp/customers` | list_customers | - | - | - | OK | svc/erp/src/modules/customer.rs | 37 |
| 336 | GET | `/erp/customers/{id}` | get_customer | - | id | - | OK | svc/erp/src/modules/customer.rs | 125 |
| 337 | POST | `/erp/customers` | create_customer | CreateCustomerRequest | - | - | OK | svc/erp/src/modules/customer.rs | 163 |
| 338 | PUT | `/erp/customers/{id}` | update_customer | UpdateCustomerRequest | id | - | OK | svc/erp/src/modules/customer.rs | 212 |
| 339 | DELETE | `/erp/customers/{id}` | delete_customer | - | id | - | OK | svc/erp/src/modules/customer.rs | 266 |
| 340 | GET | `/erp/inventory` | list_inventory | - | - | - | OK | svc/erp/src/modules/inventory.rs | 28 |
| 341 | GET | `/erp/inventory/{id}` | get_inventory | - | id | - | OK | svc/erp/src/modules/inventory.rs | 108 |
| 342 | POST | `/erp/inventory` | create_inventory | CreateInventoryRequest | - | - | OK | svc/erp/src/modules/inventory.rs | 146 |
| 343 | PUT | `/erp/inventory/{id}` | update_inventory | UpdateInventoryRequest | id | - | OK | svc/erp/src/modules/inventory.rs | 210 |
| 344 | DELETE | `/erp/inventory/{id}` | delete_inventory | - | id | - | OK | svc/erp/src/modules/inventory.rs | 257 |
| 345 | GET | `/materials` | list_materials | - | - | page, pagesize, search, status, category | OK | svc/erp/src/modules/material.rs | 36 |
| 346 | POST | `/materials` | create_material | CreateMaterialRequest | - | - | OK | svc/erp/src/modules/material.rs | 158 |
| 347 | GET | `/erp/meeting-rooms` | list_rooms | - | - | - | OK | svc/erp/src/modules/meeting_room.rs | 45 |
| 348 | POST | `/erp/meeting-rooms` | create_room | CreateMeetingRoomRequest | - | - | OK | svc/erp/src/modules/meeting_room.rs | 109 |
| 349 | GET | `/erp/meeting-rooms/{id}` | get_room | - | id | - | OK | svc/erp/src/modules/meeting_room.rs | 191 |
| 350 | PUT | `/erp/meeting-rooms/{id}` | update_room | UpdateMeetingRoomRequest | id | - | OK | svc/erp/src/modules/meeting_room.rs | 227 |
| 351 | DELETE | `/erp/meeting-rooms/{id}` | delete_room | - | id | - | OK | svc/erp/src/modules/meeting_room.rs | 329 |
| 352 | GET | `/erp/meeting-rooms/bookings` | list_bookings | - | - | - | OK | svc/erp/src/modules/meeting_room.rs | 399 |
| 353 | POST | `/erp/meeting-rooms/bookings` | create_booking | CreateMeetingBookingRequest | - | - | OK | svc/erp/src/modules/meeting_room.rs | 463 |
| 354 | GET | `/erp/purchase-orders` | list_purchase_orders | - | - | - | OK | svc/erp/src/modules/purchase_order.rs | 35 |
| 355 | GET | `/erp/purchase-orders/{id}` | get_purchase_order | - | id | - | OK | svc/erp/src/modules/purchase_order.rs | 115 |
| 356 | POST | `/erp/purchase-orders` | create_purchase_order | CreatePurchaseOrderRequest | - | - | OK | svc/erp/src/modules/purchase_order.rs | 153 |
| 357 | PUT | `/erp/purchase-orders/{id}` | update_purchase_order | UpdatePurchaseOrderRequest | id | - | OK | svc/erp/src/modules/purchase_order.rs | 228 |
| 358 | DELETE | `/erp/purchase-orders/{id}` | delete_purchase_order | - | id | - | OK | svc/erp/src/modules/purchase_order.rs | 279 |
| 359 | PUT | `/erp/purchase-orders/{id}/approve` | approve_purchase_order | - | id | - | OK | svc/erp/src/modules/purchase_order.rs | 314 |
| 360 | GET | `/erp/sales-orders` | list_sales_orders | - | - | - | OK | svc/erp/src/modules/sales_order.rs | 31 |
| 361 | GET | `/erp/sales-orders/{id}` | get_sales_order | - | id | - | OK | svc/erp/src/modules/sales_order.rs | 111 |
| 362 | POST | `/erp/sales-orders` | create_sales_order | CreateSalesOrderRequest | - | - | OK | svc/erp/src/modules/sales_order.rs | 149 |
| 363 | PUT | `/erp/sales-orders/{id}` | update_sales_order | UpdateSalesOrderRequest | id | - | OK | svc/erp/src/modules/sales_order.rs | 213 |
| 364 | DELETE | `/erp/sales-orders/{id}` | delete_sales_order | - | id | - | OK | svc/erp/src/modules/sales_order.rs | 261 |
| 365 | GET | `/erp/suppliers` | list_suppliers | - | - | - | OK | svc/erp/src/modules/supplier.rs | 44 |
| 366 | GET | `/erp/suppliers/{id}` | get_supplier | - | id | - | OK | svc/erp/src/modules/supplier.rs | 132 |
| 367 | POST | `/erp/suppliers` | create_supplier | CreateSupplierRequest | - | - | OK | svc/erp/src/modules/supplier.rs | 170 |
| 368 | PUT | `/erp/suppliers/{id}` | update_supplier | UpdateSupplierRequest | id | - | OK | svc/erp/src/modules/supplier.rs | 218 |
| 369 | DELETE | `/erp/suppliers/{id}` | delete_supplier | - | id | - | OK | svc/erp/src/modules/supplier.rs | 271 |
| 370 | POST | `/api/feedback/feedbacks` | create_feedback | CreateFeedbackRequest | - | - | OK | svc/feedback/src/handlers.rs | 61 |
| 371 | GET | `/api/feedback/feedbacks/{id}` | get_feedback | - | id | - | OK | svc/feedback/src/handlers.rs | 98 |
| 372 | GET | `/api/feedback/feedbacks` | list_feedbacks | - | - | - | OK | svc/feedback/src/handlers.rs | 132 |
| 373 | PUT | `/api/feedback/feedbacks/{id}` | response_feedback | ResponseFeedbackRequest | id | - | OK | svc/feedback/src/handlers.rs | 218 |
| 374 | DELETE | `/api/feedback/feedbacks/{id}` | delete_feedback | - | id | - | OK | svc/feedback/src/handlers.rs | 260 |
| 375 | POST | `/accounts` | create_account | CreateAccountRequest | - | - | OK | svc/finance/src/modules/mod.rs | 149 |
| 376 | GET | `/accounts/{account_id}` | get_account | - | account_id | - | OK | svc/finance/src/modules/mod.rs | 172 |
| 377 | GET | `/accounts` | list_accounts | - | - | - | OK | svc/finance/src/modules/mod.rs | 234 |
| 378 | POST | `/vouchers` | create_voucher | CreateVoucherRequest | - | - | OK | svc/finance/src/modules/mod.rs | 257 |
| 379 | GET | `/vouchers/{voucher_id}` | get_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 281 |
| 380 | GET | `/vouchers` | list_vouchers | - | - | - | OK | svc/finance/src/modules/mod.rs | 307 |
| 381 | POST | `/vouchers/{voucher_id}/submit` | submit_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 343 |
| 382 | POST | `/vouchers/{voucher_id}/approve` | approve_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 368 |
| 383 | POST | `/vouchers/{voucher_id}/post` | post_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 397 |
| 384 | GET | `/ledger` | get_ledger | - | - | - | OK | svc/finance/src/modules/mod.rs | 473 |
| 385 | GET | `/trial-balance/{period}` | get_trial_balance | - | period | - | OK | svc/finance/src/modules/mod.rs | 504 |
| 386 | GET | `/balance-sheet/{period}` | get_balance_sheet | - | period | - | OK | svc/finance/src/modules/mod.rs | 529 |
| 387 | GET | `/income-statement/{period}` | get_income_statement | - | period | - | OK | svc/finance/src/modules/mod.rs | 554 |
| 388 | POST | `/voucher-templates/{template_id}/copy` | copy_template | CopyTemplateRequest | template_id | - | OK | svc/finance/src/modules/voucher_template.rs | 72 |
| 389 | PUT | `/voucher-templates/{template_id}/toggle` | toggle_template | ToggleTemplateRequest | template_id | - | OK | svc/finance/src/modules/voucher_template.rs | 131 |
| 390 | POST | `/voucher-templates/match` | match_template | MatchTemplateRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 182 |
| 391 | GET | `/voucher-templates/{template_id}/usage-stats` | get_usage_stats | - | template_id | - | OK | svc/finance/src/modules/voucher_template.rs | 251 |
| 392 | GET | `/voucher-templates/{template_id}/export` | export_template | - | template_id | - | OK | svc/finance/src/modules/voucher_template.rs | 287 |
| 393 | POST | `/voucher-templates/import` | import_template | - | - | - | OK | svc/finance/src/modules/voucher_template.rs | 324 |
| 394 | PUT | `/voucher-generation-rules/{rule_id}/toggle` | toggle_generate_rule | ToggleRuleRequest | rule_id | - | OK | svc/finance/src/modules/voucher_template.rs | 383 |
| 395 | POST | `/voucher/generate/preview` | preview_generation | PreviewGenerationRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 603 |
| 396 | POST | `/voucher/generate/from-source` | generate_from_source | GenerateFromSourceRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 689 |
| 397 | POST | `/voucher/generate/batch` | batch_generate | BatchGenerateRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 791 |
| 398 | POST | `/voucher/generate/auto` | auto_generate | AutoGenerateRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 846 |
| 399 | POST | `/voucher/generate/regenerate/{original_voucher_id}` | regenerate | - | original_voucher_id | - | OK | svc/finance/src/modules/voucher_template.rs | 922 |
| 400 | GET | `/voucher-templates/{template_id}/entries` | list_entries | - | template_id | - | OK | svc/finance/src/modules/voucher_template_entries.rs | 55 |
| 401 | GET | `/voucher-templates/{template_id}/entries/{entry_id}` | get_entry | - | template_id, entry_id | - | OK | svc/finance/src/modules/voucher_template_entries.rs | 89 |
| 402 | POST | `/voucher-templates/{template_id}/entries` | create_entry | AddTemplateEntryRequest | template_id | - | OK | svc/finance/src/modules/voucher_template_entries.rs | 121 |
| 403 | PUT | `/voucher-templates/{template_id}/entries/{entry_id}` | update_entry | UpdateTemplateEntryRequest | template_id, entry_id | - | OK | svc/finance/src/modules/voucher_template_entries.rs | 188 |
| 404 | DELETE | `/voucher-templates/{template_id}/entries/{entry_id}` | delete_entry | - | template_id, entry_id | - | OK | svc/finance/src/modules/voucher_template_entries.rs | 254 |
| 405 | PUT | `/voucher-templates/{template_id}/entries/reorder` | reorder_entries | ReorderEntriesRequest | template_id | - | OK | svc/finance/src/modules/voucher_template_entries.rs | 293 |
| 406 | GET | `/devices` | list_devices | - | - | - | OK | svc/gis/src/modules/device.rs | 97 |
| 407 | GET | `/devices/{id}` | get_device | - | id | - | OK | svc/gis/src/modules/device.rs | 123 |
| 408 | POST | `/locations/create` | create_location | CreateLocation | - | - | OK | svc/gis/src/modules/location.rs | 60 |
| 409 | GET | `/locations` | list_locations | - | - | - | OK | svc/gis/src/modules/location.rs | 102 |
| 410 | GET | `/locations/{id}` | get_location | - | id | - | OK | svc/gis/src/modules/location.rs | 130 |
| 411 | POST | `/maps/create` | create_map | CreateMap | - | - | OK | svc/gis/src/modules/map.rs | 74 |
| 412 | GET | `/maps` | list_maps | - | - | - | OK | svc/gis/src/modules/map.rs | 118 |
| 413 | GET | `/maps/{id}` | get_map | - | id | - | OK | svc/gis/src/modules/map.rs | 144 |
| 414 | PUT | `/maps/{id}` | update_map | UpdateMap | id | - | OK | svc/gis/src/modules/map.rs | 170 |
| 415 | DELETE | `/maps/{id}` | delete_map | - | id | - | OK | svc/gis/src/modules/map.rs | 222 |
| 416 | GET | `/companies` | list_companies | - | - | page, page_size, search, status | OK | svc/hrm/src/modules/company.rs | 26 |
| 417 | POST | `/companies` | create_company | CreateCompanyRequest | - | - | OK | svc/hrm/src/modules/company.rs | 134 |
| 418 | GET | `/companies/{id}` | get_company | - | id | - | OK | svc/hrm/src/modules/company.rs | 224 |
| 419 | PUT | `/companies/{id}` | update_company | UpdateCompanyRequest | id | - | OK | svc/hrm/src/modules/company.rs | 268 |
| 420 | DELETE | `/companies/{id}` | delete_company | - | id | - | OK | svc/hrm/src/modules/company.rs | 391 |
| 421 | GET | `/departments` | list_departments | - | - | page, page_size, search, status, org_id | OK | svc/hrm/src/modules/department.rs | 40 |
| 422 | POST | `/departments` | create_department | CreateDepartmentRequest | - | - | OK | svc/hrm/src/modules/department.rs | 122 |
| 423 | GET | `/departments/{id}` | get_department | - | id | - | OK | svc/hrm/src/modules/department.rs | 205 |
| 424 | PUT | `/departments/{id}` | update_department | UpdateDepartmentRequest | id | - | OK | svc/hrm/src/modules/department.rs | 242 |
| 425 | DELETE | `/departments/{id}` | delete_department | - | id | - | OK | svc/hrm/src/modules/department.rs | 351 |
| 426 | GET | `/employees` | list_employees | - | - | - | OK | svc/hrm/src/modules/employee.rs | 88 |
| 427 | GET | `/employees/{id}` | get_employee | - | id | - | OK | svc/hrm/src/modules/employee.rs | 127 |
| 428 | GET | `/employees/{id}/details` | get_employee_details | - | id | - | OK | svc/hrm/src/modules/employee.rs | 191 |
| 429 | POST | `/employees` | create_employee | CreateEmployeeRequest | - | - | OK | svc/hrm/src/modules/employee.rs | 270 |
| 430 | PUT | `/employees/{id}` | update_employee | UpdateEmployeeRequest | id | - | OK | svc/hrm/src/modules/employee.rs | 403 |
| 431 | DELETE | `/employees/{id}` | delete_employee | - | id | - | OK | svc/hrm/src/modules/employee.rs | 503 |
| 432 | POST | `/employees/export` | export_employees | ExportRequest | - | - | OK | svc/hrm/src/modules/employee.rs | 582 |
| 433 | GET | `/api/integration/rules` | list_conversion_rules_api | - | - | - | OK | svc/integration/src/handlers/conversion_rules.rs | 16 |
| 434 | GET | `/api/integration/rules/{id}` | get_conversion_rule_api | - | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 42 |
| 435 | POST | `/api/integration/rules` | create_conversion_rule_api | CreateConversionRuleRequest | - | - | OK | svc/integration/src/handlers/conversion_rules.rs | 77 |
| 436 | PUT | `/api/integration/rules/{id}` | update_conversion_rule_api | UpdateConversionRuleRequest | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 133 |
| 437 | DELETE | `/api/integration/rules/{id}` | delete_conversion_rule_api | - | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 211 |
| 438 | GET | `/api/integration/rules/{id}/executions` | get_rule_executions_api | - | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 252 |
| 439 | POST | `/api/integration/rules/{id}/execute` | execute_conversion_rule_api | ExecuteConversionRequest | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 283 |
| 440 | POST | `/api/integration/rules/{id}/enable` | enable_conversion_rule_api | - | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 369 |
| 441 | POST | `/api/integration/rules/{id}/disable` | disable_conversion_rule_api | - | id | - | OK | svc/integration/src/handlers/conversion_rules.rs | 402 |
| 442 | GET | `/api/integration/stats` | get_sync_stats | - | - | - | OK | svc/integration/src/handlers/events.rs | 10 |
| 443 | GET | `/api/integration/events` | list_events | - | - | - | OK | svc/integration/src/handlers/events.rs | 108 |
| 444 | POST | `/api/integration/events` | create_event | CreateIntegrationEventRequest | - | - | OK | svc/integration/src/handlers/events.rs | 141 |
| 445 | GET | `/api/integration/lims-qms` | list_lims_qms_sync | - | - | - | OK | svc/integration/src/handlers/lims_qms.rs | 10 |
| 446 | POST | `/api/integration/lims-qms` | create_lims_qms_sync | CreateLimsQmsSyncRequest | - | - | OK | svc/integration/src/handlers/lims_qms.rs | 44 |
| 447 | GET | `/api/integration/lims-qms/{id}` | get_lims_qms_sync | - | id | - | OK | svc/integration/src/handlers/lims_qms.rs | 105 |
| 448 | POST | `/api/integration/lims-qms/{id}/sync` | sync_lims_qms | - | id | - | OK | svc/integration/src/handlers/lims_qms.rs | 143 |
| 449 | GET | `/api/integration/mes-erp` | list_mes_erp_sync | - | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 23 |
| 450 | POST | `/api/integration/mes-erp` | create_mes_erp_sync | CreateMesErpSyncRequest | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 56 |
| 451 | GET | `/api/integration/mes-erp/{id}` | get_mes_erp_sync | - | id | - | OK | svc/integration/src/handlers/mes_erp.rs | 116 |
| 452 | POST | `/api/integration/mes-erp/{id}/sync` | sync_mes_erp | - | id | - | OK | svc/integration/src/handlers/mes_erp.rs | 153 |
| 453 | POST | `/api/integration/mes-erp/sync/erp-to-mes` | sync_erp_order_to_mes | SyncErpToMesRequest | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 205 |
| 454 | POST | `/api/integration/mes-erp/sync/mes-to-erp` | sync_mes_progress_to_erp | SyncMesToErpRequest | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 243 |
| 455 | POST | `/api/integration/mes-erp/{id}/retry` | retry_mes_erp_sync | - | id | - | OK | svc/integration/src/handlers/mes_erp.rs | 284 |
| 456 | GET | `/api/integration/mes-erp/{id}/logs` | get_mes_erp_sync_logs | - | id | - | OK | svc/integration/src/handlers/mes_erp.rs | 312 |
| 457 | GET | `/api/integration/mes-erp/records` | list_mes_erp_sync_records | - | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 337 |
| 458 | GET | `/api/integration/mes-qms` | list_mes_qms_sync_api | - | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 11 |
| 459 | GET | `/api/integration/mes-qms/{id}` | get_mes_qms_sync_api | - | id | - | OK | svc/integration/src/handlers/mes_qms.rs | 57 |
| 460 | GET | `/api/integration/mes-qms/stats` | get_mes_qms_stats_api | - | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 86 |
| 461 | POST | `/api/integration/mes-qms/trigger-inspection` | trigger_qms_inspection_api | mes_qms_integration::TriggerInspectionRequest | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 112 |
| 462 | POST | `/api/integration/mes-qms/sync-result` | sync_quality_result_api | mes_qms_integration::SyncQualityResultRequest | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 150 |
| 463 | POST | `/api/integration/mes-qms/sync-trace` | sync_trace_chain_api | mes_qms_integration::TraceChainSyncRequest | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 188 |
| 464 | POST | `/api/integration/mes-qms/defect-handling` | defect_handling_api | mes_qms_integration::DefectHandlingRequest | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 226 |
| 465 | POST | `/api/integration/mes-qms/{id}/retry` | retry_mes_qms_sync_api | - | id | - | OK | svc/integration/src/handlers/mes_qms.rs | 264 |
| 466 | POST | `/api/integration/sync/tasks` | create_task | CreateSyncTaskRequest | - | - | OK | svc/integration/src/handlers/sync.rs | 113 |
| 467 | GET | `/api/integration/sync/tasks/{task_id}` | get_task | - | task_id | - | OK | svc/integration/src/handlers/sync.rs | 162 |
| 468 | POST | `/api/integration/sync/tasks/{task_id}/status` | update_status | UpdateStatusRequest | task_id | - | OK | svc/integration/src/handlers/sync.rs | 202 |
| 469 | GET | `/api/integration/sync/pending` | get_pending | - | - | - | OK | svc/integration/src/handlers/sync.rs | 250 |
| 470 | GET | `/api/integration/sync/statistics` | get_statistics | - | - | - | OK | svc/integration/src/handlers/sync.rs | 280 |
| 471 | POST | `/api/integration/sync/retry-failed` | retry_failed | RetryFailedRequest | - | - | OK | svc/integration/src/handlers/sync.rs | 337 |
| 472 | POST | `/api/integration/sync/trigger/scm-to-wms` | trigger_scm_wms | TriggerSyncRequest | - | - | OK | svc/integration/src/handlers/sync.rs | 413 |
| 473 | POST | `/api/integration/sync/trigger/wms-to-crm` | trigger_wms_crm | TriggerSyncRequest | - | - | OK | svc/integration/src/handlers/sync.rs | 458 |
| 474 | POST | `/api/integration/sync/trigger/srm-to-scm` | trigger_srm_scm | TriggerSyncRequest | - | - | OK | svc/integration/src/handlers/sync.rs | 503 |
| 475 | GET | `/api/integration/wms-scm` | list_wms_scm_sync | - | - | - | OK | svc/integration/src/handlers/wms_scm.rs | 10 |
| 476 | POST | `/api/integration/wms-scm` | create_wms_scm_sync | CreateWmsScmSyncRequest | - | - | OK | svc/integration/src/handlers/wms_scm.rs | 43 |
| 477 | GET | `/api/integration/wms-scm/{id}` | get_wms_scm_sync | - | id | - | OK | svc/integration/src/handlers/wms_scm.rs | 103 |
| 478 | POST | `/api/integration/wms-scm/{id}/sync` | sync_wms_scm | - | id | - | OK | svc/integration/src/handlers/wms_scm.rs | 140 |
| 479 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/integration/src/plugin.rs | 36 |
| 480 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/integration/src/plugin.rs | 79 |
| 481 | GET | `/lims/tasks` | list_tasks | - | - | - | OK | svc/lims/src/modules/inspection_task.rs | 69 |
| 482 | POST | `/lims/tasks` | create_task | CreateTaskRequest | - | - | OK | svc/lims/src/modules/inspection_task.rs | 120 |
| 483 | GET | `/lims/tasks/{id}` | get_task | - | id | - | OK | svc/lims/src/modules/inspection_task.rs | 206 |
| 484 | GET | `/lims/instruments` | list_instruments | - | - | page, page_size, status, name | OK | svc/lims/src/modules/instrument.rs | 77 |
| 485 | POST | `/lims/instruments` | create_instrument | CreateInstrumentRequest | - | - | OK | svc/lims/src/modules/instrument.rs | 160 |
| 486 | GET | `/lims/reagents` | list_reagents | - | - | page, page_size, status, name | OK | svc/lims/src/modules/reagent.rs | 67 |
| 487 | POST | `/lims/reagents` | create_reagent | CreateReagentRequest | - | - | OK | svc/lims/src/modules/reagent.rs | 151 |
| 488 | GET | `/lims/samples` | list_samples | - | - | page, page_size, status, sample_no, sample_name | OK | svc/lims/src/modules/sample.rs | 77 |
| 489 | POST | `/lims/samples` | register_sample | CreateSampleRequest | - | - | OK | svc/lims/src/modules/sample.rs | 198 |
| 490 | GET | `/lims/samples/{id}` | get_sample | - | id | - | OK | svc/lims/src/modules/sample.rs | 258 |
| 491 | GET | `/health` | health | - | - | - | OK | svc/lowcode/src/openapi.rs | 26 |
| 492 | GET | `/api/lowcode/apps` | list_apps | - | - | - | OK | svc/lowcode/src/openapi.rs | 35 |
| 493 | POST | `/api/lowcode/apps` | create_app | - | - | - | OK | svc/lowcode/src/openapi.rs | 44 |
| 494 | GET | `/api/lowcode/designer/schema` | get_designer_schema | - | - | - | OK | svc/lowcode/src/openapi.rs | 53 |
| 495 | POST | `/api/master/quality-v51/checks` | run_quality_check | RunQualityCheckRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 594 |
| 496 | GET | `/api/master/quality-v51/checks` | list_quality_checks | - | - | entity_type, entity_id, status, rule_id, page, page_size | OK | svc/master-data/src/modules/quality_v51.rs | 663 |
| 497 | GET | `/api/master/quality-v51/rules` | list_quality_rules | - | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 762 |
| 498 | POST | `/api/master/quality-v51/rules` | create_quality_rule | CreateQualityRuleRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 779 |
| 499 | GET | `/api/master/quality-v51/score` | get_quality_score | - | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 878 |
| 500 | GET | `/api/master/quality-v51/dashboard` | get_quality_dashboard | - | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 941 |
| 501 | POST | `/api/master/quality-v51/auto-fix/run` | apply_auto_fix | AutoFixRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 1002 |
| 502 | POST | `/api/master/quality-v51/ai/suggest` | generate_suggestions | GenerateSuggestionsRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 1206 |
| 503 | - | `-` | extract_openapi_spec | - | - | - | OK | svc/mes/src/modules/openapi.rs | 213 |
| 504 | GET | `/api/mes/orders` | list_production_orders | - | - | page, pagesize, search, status | OK | svc/mes/src/modules/production_order.rs | 198 |
| 505 | POST | `/api/mes/orders` | create_production_order | CreateProductionOrderRequest | - | - | OK | svc/mes/src/modules/production_order.rs | 387 |
| 506 | GET | `/api/mes/orders/{id}` | get_production_order | - | id | - | OK | svc/mes/src/modules/production_order.rs | 618 |
| 507 | GET | `/api/mes/work-orders` | list_work_orders | - | - | page, pagesize, search, status | OK | svc/mes/src/modules/work_order.rs | 158 |
| 508 | GET | `/api/mes/work-orders/{id}` | get_work_order | - | id | - | OK | svc/mes/src/modules/work_order.rs | 355 |
| 509 | POST | `/api/mes/work-orders` | create_work_order | CreateWorkOrderRequest | - | - | OK | svc/mes/src/modules/work_order.rs | 439 |
| 510 | GET | `/api/mes/work-reports` | list_work_reports | - | - | page, pagesize, search, status | OK | svc/mes/src/modules/work_report.rs | 223 |
| 511 | GET | `/api/mes/work-reports/{id}` | get_work_report | - | id | - | OK | svc/mes/src/modules/work_report.rs | 419 |
| 512 | POST | `/api/mes/work-reports` | create_work_report | CreateWorkReportRequest | - | - | OK | svc/mes/src/modules/work_report.rs | 500 |
| 513 | GET | `/patrol-records` | get_all_patrol_records | - | - | - | OK | svc/mobile/src/modules/patrol.rs | 52 |
| 514 | GET | `/patrol-records/{id}` | get_patrol_record | - | id | - | OK | svc/mobile/src/modules/patrol.rs | 100 |
| 515 | POST | `/patrol-records` | create_patrol_record | CreatePatrolRequest | - | - | OK | svc/mobile/src/modules/patrol.rs | 156 |
| 516 | POST | `/scan/barcode` | scan_barcode | BarcodeScanRequest | - | - | OK | svc/mobile/src/modules/scan.rs | 99 |
| 517 | GET | `/stats/dashboard` | get_dashboard_stats | - | - | - | OK | svc/mobile/src/modules/stats.rs | 39 |
| 518 | GET | `/mobile-tasks` | get_all_tasks | - | - | - | OK | svc/mobile/src/modules/task.rs | 68 |
| 519 | GET | `/mobile-tasks/{id}` | get_task | - | id | - | OK | svc/mobile/src/modules/task.rs | 116 |
| 520 | POST | `/mobile-tasks` | create_task | CreateTaskRequest | - | - | OK | svc/mobile/src/modules/task.rs | 172 |
| 521 | PUT | `/mobile-tasks/{id}` | update_task | UpdateTaskRequest | id | - | OK | svc/mobile/src/modules/task.rs | 249 |
| 522 | DELETE | `/mobile-tasks/{id}` | delete_task | - | id | - | OK | svc/mobile/src/modules/task.rs | 421 |
| 523 | GET | `/api/monitor/thresholds` | list_thresholds | - | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 251 |
| 524 | POST | `/api/monitor/thresholds` | create_threshold | ThresholdRequest | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 350 |
| 525 | GET | `/api/monitor/thresholds/{id}` | get_threshold | - | id | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 382 |
| 526 | PUT | `/api/monitor/thresholds/{id}` | update_threshold | ThresholdRequest | id | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 417 |
| 527 | DELETE | `/api/monitor/thresholds/{id}` | delete_threshold | - | id | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 454 |
| 528 | POST | `/api/monitor/thresholds/evaluate` | evaluate_thresholds | - | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 477 |
| 529 | GET | `/api/monitor/metrics/snapshot` | get_metric_snapshot | - | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 511 |
| 530 | GET | `/api/monitor/alerts` | list_alerts | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 332 |
| 531 | GET | `/api/monitor/alerts/{id}` | get_alert | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 453 |
| 532 | POST | `/api/monitor/alerts/{id}` | update_alert | serde_json::Value | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 487 |
| 533 | GET | `/api/monitor/alerts/statistics` | get_alert_statistics | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 537 |
| 534 | POST | `/api/monitor/alerts/acknowledge` | acknowledge_alerts | serde_json::Value | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 585 |
| 535 | POST | `/api/monitor/alerts/resolve` | resolve_alerts | serde_json::Value | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 619 |
| 536 | GET | `/api/monitor/rules` | list_rules | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 653 |
| 537 | POST | `/api/monitor/rules` | create_rule | AlertRuleRequest | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 745 |
| 538 | GET | `/api/monitor/rules/{id}` | get_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 777 |
| 539 | PUT | `/api/monitor/rules/{id}` | update_rule | AlertRuleRequest | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 821 |
| 540 | DELETE | `/api/monitor/rules/{id}` | delete_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 858 |
| 541 | POST | `/api/monitor/rules/{id}/enable` | enable_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 881 |
| 542 | POST | `/api/monitor/rules/{id}/disable` | disable_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 921 |
| 543 | GET | `/api/monitor/alerts/{id}/history` | get_alert_history | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 963 |
| 544 | GET | `/api/monitor/alerts/{id}/timeline` | get_alert_timeline | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1002 |
| 545 | GET | `/api/monitor/rules/{id}/scheduled-trigger` | get_scheduled_trigger | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1046 |
| 546 | PUT | `/api/monitor/rules/{id}/scheduled-trigger` | update_scheduled_trigger | ScheduledTrigger | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1074 |
| 547 | GET | `/api/monitor/rules/{id}/escalation` | get_escalation | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1096 |
| 548 | PUT | `/api/monitor/rules/{id}/escalation` | update_escalation | AlertEscalation | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1158 |
| 549 | GET | `/api/monitor/rules/{id}/routing` | get_routing | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1180 |
| 550 | PUT | `/api/monitor/rules/{id}/routing` | update_routing | AlertRouting | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1229 |
| 551 | GET | `/api/monitor/templates` | list_templates | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1252 |
| 552 | POST | `/api/monitor/templates` | create_template | AlertTemplate | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1286 |
| 553 | GET | `/api/monitor/templates/{id}` | get_template | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1303 |
| 554 | PUT | `/api/monitor/templates/{id}` | update_template | AlertTemplate | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1332 |
| 555 | DELETE | `/api/monitor/templates/{id}` | delete_template | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1354 |
| 556 | GET | `/api/monitor/suppression` | list_suppression_rules | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1378 |
| 557 | POST | `/api/monitor/suppression` | create_suppression_rule | SuppressionRule | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1406 |
| 558 | GET | `/api/monitor/suppression/{id}` | get_suppression_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1423 |
| 559 | PUT | `/api/monitor/suppression/{id}` | update_suppression_rule | SuppressionRule | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1456 |
| 560 | DELETE | `/api/monitor/suppression/{id}` | delete_suppression_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1478 |
| 561 | GET | `/api/monitor/rules/{id}/advanced` | get_advanced_rule | - | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1502 |
| 562 | PUT | `/api/monitor/rules/{id}/advanced` | update_advanced_rule | serde_json::Value | id | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1556 |
| 563 | GET | `/api/monitor/business-metrics` | list_business_metrics | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 625 |
| 564 | GET | `/api/monitor/business-metrics/{id}` | get_business_metric | - | id | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 687 |
| 565 | POST | `/api/monitor/business-metrics` | create_business_metric | BusinessMetricRequest | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 725 |
| 566 | PUT | `/api/monitor/business-metrics/{id}` | update_business_metric | BusinessMetricRequest | id | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 760 |
| 567 | DELETE | `/api/monitor/business-metrics/{id}` | delete_business_metric | - | id | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 800 |
| 568 | GET | `/api/monitor/business-metrics/summary` | get_business_metric_summary | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 823 |
| 569 | GET | `/api/monitor/business-metrics/trend` | get_business_metric_trend | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 896 |
| 570 | GET | `/api/monitor/business-metrics/kpi` | get_kpi_dashboard | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 940 |
| 571 | GET | `/api/monitor/health` | get_service_health | - | - | - | OK | svc/monitor/src/modules/monitor/health_check.rs | 22 |
| 572 | GET | `/api/monitor/metrics/system` | get_system_metrics | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 128 |
| 573 | GET | `/api/monitor/metrics/database` | get_database_metrics | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 161 |
| 574 | GET | `/api/monitor/performance/api` | get_api_performance | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 194 |
| 575 | GET | `/api/monitor/performance/trend` | get_performance_trend | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 258 |
| 576 | GET | `/api/monitor/performance/services` | get_service_performance | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 301 |
| 577 | GET | `/api/monitor/performance/summary` | get_performance_summary | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 387 |
| 578 | GET | `/api/monitor/performance/slow-queries` | get_slow_queries | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 498 |
| 579 | POST | `/api/monitor/performance/export` | export_performance_data | ExportRequest | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 597 |
| 580 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/monitor/src/modules/monitor/monitor_plugin.rs | 36 |
| 581 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/monitor/src/modules/monitor/monitor_plugin.rs | 79 |
| 582 | GET | `/api/monitor/slos` | list_slos | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 330 |
| 583 | GET | `/api/monitor/slos/{id}` | get_slo | - | id | - | OK | svc/monitor/src/modules/monitor/slo.rs | 386 |
| 584 | POST | `/api/monitor/slos` | create_slo | SloRequest | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 432 |
| 585 | PUT | `/api/monitor/slos/{id}` | update_slo | SloRequest | id | - | OK | svc/monitor/src/modules/monitor/slo.rs | 474 |
| 586 | DELETE | `/api/monitor/slos/{id}` | delete_slo | - | id | - | OK | svc/monitor/src/modules/monitor/slo.rs | 519 |
| 587 | GET | `/api/monitor/slos/summary` | get_slo_summary | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 542 |
| 588 | GET | `/api/monitor/slos/budget` | get_slo_budget | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 590 |
| 589 | GET | `/api/monitor/slos/trend` | get_slo_trend | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 643 |
| 590 | GET | `/api/monitor/slos/violations` | list_slo_violations | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 687 |
| 591 | POST | `/api/monitor/slos/violations/{id}/resolve` | resolve_slo_violation | - | id | - | OK | svc/monitor/src/modules/monitor/slo.rs | 735 |
| 592 | GET | `/api/pdm/change-notices` | list_change_notices | - | - | - | OK | svc/pdm/src/modules/change_notice.rs | 104 |
| 593 | POST | `/api/pdm/change-notices` | create_change_notice | CreateChangeNoticeRequest | - | - | OK | svc/pdm/src/modules/change_notice.rs | 186 |
| 594 | GET | `/api/pdm/change-notices/{id}` | get_change_notice | - | id | - | OK | svc/pdm/src/modules/change_notice.rs | 258 |
| 595 | PUT | `/api/pdm/change-notices/{id}` | update_change_notice | UpdateChangeNoticeRequest | id | - | OK | svc/pdm/src/modules/change_notice.rs | 299 |
| 596 | DELETE | `/api/pdm/change-notices/{id}` | delete_change_notice | - | id | - | OK | svc/pdm/src/modules/change_notice.rs | 397 |
| 597 | POST | `/api/pdm/change-notices/{id}/submit` | submit_change_notice | - | id | - | OK | svc/pdm/src/modules/change_notice.rs | 433 |
| 598 | POST | `/api/pdm/change-notices/{id}/approve` | approve_change_notice | serde_json::Value | id | - | OK | svc/pdm/src/modules/change_notice.rs | 478 |
| 599 | POST | `/api/pdm/change-notices/{id}/reject` | reject_change_notice | serde_json::Value | id | - | OK | svc/pdm/src/modules/change_notice.rs | 532 |
| 600 | GET | `/api/pdm/configurations` | list_configurations | - | - | - | OK | svc/pdm/src/modules/configuration.rs | 84 |
| 601 | POST | `/api/pdm/configurations` | create_configuration | CreateConfigurationRequest | - | - | OK | svc/pdm/src/modules/configuration.rs | 161 |
| 602 | GET | `/api/pdm/configurations/{id}` | get_configuration | - | id | - | OK | svc/pdm/src/modules/configuration.rs | 226 |
| 603 | PUT | `/api/pdm/configurations/{id}` | update_configuration | UpdateConfigurationRequest | id | - | OK | svc/pdm/src/modules/configuration.rs | 266 |
| 604 | DELETE | `/api/pdm/configurations/{id}` | delete_configuration | - | id | - | OK | svc/pdm/src/modules/configuration.rs | 329 |
| 605 | GET | `/api/pdm/documents` | list_documents | - | - | - | OK | svc/pdm/src/modules/document.rs | 108 |
| 606 | POST | `/api/pdm/documents` | create_document | CreateDocumentRequest | - | - | OK | svc/pdm/src/modules/document.rs | 181 |
| 607 | GET | `/api/pdm/documents/{id}` | get_document | - | id | - | OK | svc/pdm/src/modules/document.rs | 247 |
| 608 | PUT | `/api/pdm/documents/{id}` | update_document | UpdateDocumentRequest | id | - | OK | svc/pdm/src/modules/document.rs | 287 |
| 609 | DELETE | `/api/pdm/documents/{id}` | delete_document | - | id | - | OK | svc/pdm/src/modules/document.rs | 382 |
| 610 | POST | `/api/pdm/documents/{id}/approve` | start_document_approval | StartDocumentApprovalRequest | id | - | OK | svc/pdm/src/modules/document.rs | 423 |
| 611 | GET | `/api/pdm/documents/{id}/approval-history` | get_document_approval_history | - | id | - | OK | svc/pdm/src/modules/document.rs | 566 |
| 612 | GET | `/api/pdm/documents/pending-approval` | list_pending_documents | - | - | - | OK | svc/pdm/src/modules/document.rs | 634 |
| 613 | GET | `/api/pdm/materials` | list_materials | - | - | - | OK | svc/pdm/src/modules/material.rs | 76 |
| 614 | POST | `/api/pdm/materials` | create_material | CreateMaterialRequest | - | - | OK | svc/pdm/src/modules/material.rs | 148 |
| 615 | GET | `/api/pdm/materials/{id}` | get_material | - | id | - | OK | svc/pdm/src/modules/material.rs | 262 |
| 616 | PUT | `/api/pdm/materials/{id}` | update_material | UpdateMaterialRequest | id | - | OK | svc/pdm/src/modules/material.rs | 301 |
| 617 | DELETE | `/api/pdm/materials/{id}` | delete_material | - | id | - | OK | svc/pdm/src/modules/material.rs | 404 |
| 618 | GET | `/` | _home | - | - | - | OK | svc/pdm/src/modules/openapi.rs | 6 |
| 619 | GET | `/health` | _health | - | - | - | OK | svc/pdm/src/modules/openapi.rs | 29 |
| 620 | GET | `/api/health/detailed` | _detailed_health | - | - | - | OK | svc/pdm/src/modules/openapi.rs | 37 |
| 621 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/pdm/src/modules/pdm_plugin.rs | 31 |
| 622 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/pdm/src/modules/pdm_plugin.rs | 59 |
| 623 | GET | `/api/pdm/products` | list_products | - | - | - | OK | svc/pdm/src/modules/product.rs | 73 |
| 624 | POST | `/api/pdm/products` | create_product | CreateProductRequest | - | - | OK | svc/pdm/src/modules/product.rs | 145 |
| 625 | GET | `/api/pdm/products/{id}` | get_product | - | id | - | OK | svc/pdm/src/modules/product.rs | 194 |
| 626 | PUT | `/api/pdm/products/{id}` | update_product | UpdateProductRequest | id | - | OK | svc/pdm/src/modules/product.rs | 233 |
| 627 | DELETE | `/api/pdm/products/{id}` | delete_product | - | id | - | OK | svc/pdm/src/modules/product.rs | 288 |
| 628 | GET | `/api/pdm/production-batches` | list_batches | - | - | - | OK | svc/pdm/src/modules/production_batch.rs | 87 |
| 629 | POST | `/api/pdm/production-batches` | create_batch | CreateBatchRequest | - | - | OK | svc/pdm/src/modules/production_batch.rs | 164 |
| 630 | GET | `/api/pdm/production-batches/{id}` | get_batch | - | id | - | OK | svc/pdm/src/modules/production_batch.rs | 217 |
| 631 | PUT | `/api/pdm/production-batches/{id}` | update_batch | UpdateBatchRequest | id | - | OK | svc/pdm/src/modules/production_batch.rs | 257 |
| 632 | DELETE | `/api/pdm/production-batches/{id}` | delete_batch | - | id | - | OK | svc/pdm/src/modules/production_batch.rs | 321 |
| 633 | GET | `/api/pdm/production-formulas` | list_formulas | - | - | - | OK | svc/pdm/src/modules/production_formula.rs | 80 |
| 634 | POST | `/api/pdm/production-formulas` | create_formula | CreateFormulaRequest | - | - | OK | svc/pdm/src/modules/production_formula.rs | 157 |
| 635 | GET | `/api/pdm/production-formulas/{id}` | get_formula | - | id | - | OK | svc/pdm/src/modules/production_formula.rs | 210 |
| 636 | PUT | `/api/pdm/production-formulas/{id}` | update_formula | UpdateFormulaRequest | id | - | OK | svc/pdm/src/modules/production_formula.rs | 250 |
| 637 | DELETE | `/api/pdm/production-formulas/{id}` | delete_formula | - | id | - | OK | svc/pdm/src/modules/production_formula.rs | 308 |
| 638 | GET | `/api/pdm/production-processes` | list_processes | - | - | - | OK | svc/pdm/src/modules/production_process.rs | 83 |
| 639 | POST | `/api/pdm/production-processes` | create_process | CreateProcessRequest | - | - | OK | svc/pdm/src/modules/production_process.rs | 155 |
| 640 | GET | `/api/pdm/production-processes/{id}` | get_process | - | id | - | OK | svc/pdm/src/modules/production_process.rs | 206 |
| 641 | PUT | `/api/pdm/production-processes/{id}` | update_process | UpdateProcessRequest | id | - | OK | svc/pdm/src/modules/production_process.rs | 245 |
| 642 | DELETE | `/api/pdm/production-processes/{id}` | delete_process | - | id | - | OK | svc/pdm/src/modules/production_process.rs | 304 |
| 643 | GET | `/api/pdm/production-statistics` | list_statistics | - | - | - | OK | svc/pdm/src/modules/production_statistics.rs | 62 |
| 644 | GET | `/api/pdm/statistics/{id}` | get_statistics | - | id | - | OK | svc/pdm/src/modules/production_statistics.rs | 129 |
| 645 | GET | `/api/pdm/production-steps` | list_steps | - | - | - | OK | svc/pdm/src/modules/production_step.rs | 79 |
| 646 | POST | `/api/pdm/production-steps` | create_step | CreateStepRequest | - | - | OK | svc/pdm/src/modules/production_step.rs | 146 |
| 647 | GET | `/api/pdm/production-steps/{id}` | get_step | - | id | - | OK | svc/pdm/src/modules/production_step.rs | 195 |
| 648 | PUT | `/api/pdm/production-steps/{id}` | update_step | UpdateStepRequest | id | - | OK | svc/pdm/src/modules/production_step.rs | 234 |
| 649 | DELETE | `/api/pdm/production-steps/{id}` | delete_step | - | id | - | OK | svc/pdm/src/modules/production_step.rs | 292 |
| 650 | GET | `/api/pdm/versions` | list_versions | - | - | - | OK | svc/pdm/src/modules/version.rs | 83 |
| 651 | POST | `/api/pdm/versions` | create_version | CreateVersionRequest | - | - | OK | svc/pdm/src/modules/version.rs | 164 |
| 652 | GET | `/api/pdm/versions/{id}` | get_version | - | id | - | OK | svc/pdm/src/modules/version.rs | 217 |
| 653 | PUT | `/api/pdm/versions/{id}` | update_version | UpdateVersionRequest | id | - | OK | svc/pdm/src/modules/version.rs | 257 |
| 654 | DELETE | `/api/pdm/versions/{id}` | delete_version | - | id | - | OK | svc/pdm/src/modules/version.rs | 319 |
| 655 | GET | `/api/pdm/workflows` | list_workflows | - | - | - | OK | svc/pdm/src/modules/workflow.rs | 105 |
| 656 | POST | `/api/pdm/workflows` | create_workflow | CreateWorkflowRequest | - | - | OK | svc/pdm/src/modules/workflow.rs | 146 |
| 657 | GET | `/api/pdm/workflows/{id}` | get_workflow | - | id | - | OK | svc/pdm/src/modules/workflow.rs | 208 |
| 658 | PUT | `/api/pdm/workflows/{id}` | update_workflow | serde_json::Value | id | - | OK | svc/pdm/src/modules/workflow.rs | 248 |
| 659 | DELETE | `/api/pdm/workflows/{id}` | delete_workflow | - | id | - | OK | svc/pdm/src/modules/workflow.rs | 303 |
| 660 | POST | `/api/pdm/workflows/start` | start_workflow | StartWorkflowRequest | - | - | OK | svc/pdm/src/modules/workflow.rs | 338 |
| 661 | GET | `/api/pdm/workflow-instances` | list_workflow_instances | - | - | - | OK | svc/pdm/src/modules/workflow.rs | 426 |
| 662 | GET | `/api/pdm/workflow-instances/{id}` | get_workflow_instance | - | id | - | OK | svc/pdm/src/modules/workflow.rs | 468 |
| 663 | POST | `/api/pdm/workflow-instances/{id}/advance` | advance_workflow | serde_json::Value | id | - | OK | svc/pdm/src/modules/workflow.rs | 509 |
| 664 | GET | `/marketplace/summary` | get_marketplace_summary | - | - | - | OK | svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs | 12 |
| 665 | GET | `/marketplace/categories` | list_categories | - | - | - | OK | svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs | 75 |
| 666 | GET | `/marketplace/plugins` | list_plugins | - | - | page, page_size, category, search, is_free, sort_by | OK | svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs | 100 |
| 667 | GET | `/marketplace/plugins/{code}` | get_plugin | - | code | - | OK | svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs | 191 |
| 668 | GET | `/tenants/{tenant_id}/plugins` | list_tenant_plugins | - | tenant_id | - | OK | svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs | 12 |
| 669 | POST | `/tenants/{tenant_id}/plugins/{plugin_code}` | install_plugin | - | tenant_id, plugin_code | - | OK | svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs | 104 |
| 670 | GET | `/api/pm/projects` | list_projects | - | - | - | OK | svc/pm/src/modules/project.rs | 103 |
| 671 | POST | `/api/pm/projects` | create_project | CreateProjectRequest | - | - | OK | svc/pm/src/modules/project.rs | 162 |
| 672 | GET | `/api/pm/projects/{id}` | get_project | - | id | - | OK | svc/pm/src/modules/project.rs | 260 |
| 673 | PUT | `/api/pm/projects/{id}` | update_project | UpdateProjectRequest | id | - | OK | svc/pm/src/modules/project.rs | 295 |
| 674 | DELETE | `/api/pm/projects/{id}` | delete_project | - | id | - | OK | svc/pm/src/modules/project.rs | 368 |
| 675 | GET | `/api/pm/projects/{id}/dashboard` | get_project_dashboard | - | id | - | OK | svc/pm/src/modules/project.rs | 403 |
| 676 | GET | `/api/pm/projects/{id}/gantt` | get_project_gantt | - | id | - | OK | svc/pm/src/modules/project.rs | 524 |
| 677 | GET | `/projects/{project_id}/approval` | get_approval | - | project_id | - | OK | svc/pm/src/modules/project_approval.rs | 47 |
| 678 | POST | `/projects/{project_id}/approval` | submit_approval | ApprovalRequest | project_id | - | OK | svc/pm/src/modules/project_approval.rs | 82 |
| 679 | POST | `/projects/{project_id}/approval/action` | handle_approval_action | ApprovalRequest | project_id | - | OK | svc/pm/src/modules/project_approval.rs | 188 |
| 680 | GET | `/projects/{project_id}/benefits` | get_benefits | - | project_id | - | OK | svc/pm/src/modules/project_benefit.rs | 26 |
| 681 | GET | `/projects/{project_id}/benefits/analysis` | get_analysis | - | project_id | - | OK | svc/pm/src/modules/project_benefit.rs | 59 |
| 682 | POST | `/projects/{project_id}/benefits` | calculate_benefits | CreateBenefitRequest | project_id | - | OK | svc/pm/src/modules/project_benefit.rs | 161 |
| 683 | GET | `/projects/{project_id}/expenses` | list_expenses | - | project_id | - | OK | svc/pm/src/modules/project_expense.rs | 26 |
| 684 | POST | `/projects/{project_id}/expenses` | add_expense | CreateExpenseRequest | project_id | - | OK | svc/pm/src/modules/project_expense.rs | 59 |
| 685 | GET | `/projects/{project_id}/expenses/{id}` | get_expense | - | project_id, id | - | OK | svc/pm/src/modules/project_expense.rs | 127 |
| 686 | PUT | `/projects/{project_id}/expenses/{id}` | update_expense | UpdateExpenseRequest | project_id, id | - | OK | svc/pm/src/modules/project_expense.rs | 164 |
| 687 | DELETE | `/projects/{project_id}/expenses/{id}` | remove_expense | - | project_id, id | - | OK | svc/pm/src/modules/project_expense.rs | 227 |
| 688 | GET | `/projects/{project_id}/members` | list_members | - | project_id | - | OK | svc/pm/src/modules/project_member.rs | 26 |
| 689 | POST | `/projects/{project_id}/members` | create_member | CreateMemberRequest | project_id | - | OK | svc/pm/src/modules/project_member.rs | 59 |
| 690 | GET | `/projects/{project_id}/members/{id}` | get_member | - | project_id, id | - | OK | svc/pm/src/modules/project_member.rs | 115 |
| 691 | PUT | `/projects/{project_id}/members/{id}` | update_member | UpdateMemberRequest | project_id, id | - | OK | svc/pm/src/modules/project_member.rs | 152 |
| 692 | DELETE | `/projects/{project_id}/members/{id}` | delete_member | - | project_id, id | - | OK | svc/pm/src/modules/project_member.rs | 207 |
| 693 | GET | `/projects/{project_id}/milestones` | list_milestones | - | project_id | - | OK | svc/pm/src/modules/project_milestone.rs | 30 |
| 694 | POST | `/projects/{project_id}/milestones` | create_milestone | CreateMilestoneRequest | project_id | - | OK | svc/pm/src/modules/project_milestone.rs | 63 |
| 695 | GET | `/projects/{project_id}/milestones/{id}` | get_milestone | - | project_id, id | - | OK | svc/pm/src/modules/project_milestone.rs | 117 |
| 696 | PUT | `/projects/{project_id}/milestones/{id}` | update_milestone | UpdateMilestoneRequest | project_id, id | - | OK | svc/pm/src/modules/project_milestone.rs | 154 |
| 697 | DELETE | `/projects/{project_id}/milestones/{id}` | delete_milestone | - | project_id, id | - | OK | svc/pm/src/modules/project_milestone.rs | 213 |
| 698 | GET | `/projects/{project_id}/phases` | list_phases | - | project_id | - | OK | svc/pm/src/modules/project_phase.rs | 26 |
| 699 | POST | `/projects/{project_id}/phases` | create_phase | CreatePhaseRequest | project_id | - | OK | svc/pm/src/modules/project_phase.rs | 59 |
| 700 | GET | `/projects/{project_id}/phases/{id}` | get_phase | - | project_id, id | - | OK | svc/pm/src/modules/project_phase.rs | 128 |
| 701 | PUT | `/projects/{project_id}/phases/{id}` | update_phase | UpdatePhaseRequest | project_id, id | - | OK | svc/pm/src/modules/project_phase.rs | 165 |
| 702 | DELETE | `/projects/{project_id}/phases/{id}` | delete_phase | - | project_id, id | - | OK | svc/pm/src/modules/project_phase.rs | 228 |
| 703 | GET | `/projects/{project_id}/resources` | list_resources | - | project_id | - | OK | svc/pm/src/modules/project_resource.rs | 30 |
| 704 | POST | `/projects/{project_id}/resources` | add_resource | CreateResourceRequest | project_id | - | OK | svc/pm/src/modules/project_resource.rs | 63 |
| 705 | GET | `/projects/{project_id}/resources/{id}` | get_resource | - | project_id, id | - | OK | svc/pm/src/modules/project_resource.rs | 123 |
| 706 | PUT | `/projects/{project_id}/resources/{id}` | update_resource | UpdateResourceRequest | project_id, id | - | OK | svc/pm/src/modules/project_resource.rs | 160 |
| 707 | DELETE | `/projects/{project_id}/resources/{id}` | remove_resource | - | project_id, id | - | OK | svc/pm/src/modules/project_resource.rs | 221 |
| 708 | GET | `/announcements` | get_announcements | - | - | - | OK | svc/portal/src/modules/announcements.rs | 95 |
| 709 | POST | `/announcements` | create_announcement | NewAnnouncement | - | - | OK | svc/portal/src/modules/announcements.rs | 162 |
| 710 | GET | `/dashboard/stats` | get_dashboard_stats | - | - | - | OK | svc/portal/src/modules/dashboard.rs | 45 |
| 711 | GET | `/navigation/menu` | get_navigation_menu | - | - | - | OK | svc/portal/src/modules/navigation.rs | 12 |
| 712 | GET | `/notifications` | get_notifications | - | - | - | OK | svc/portal/src/modules/notifications.rs | 30 |
| 713 | GET | `/search` | global_search | - | - | q | OK | svc/portal/src/modules/search.rs | 83 |
| 714 | GET | `/services` | list_services | - | - | - | OK | svc/portal/src/modules/services.rs | 8 |
| 715 | GET | `/todos` | get_todos | - | - | - | OK | svc/portal/src/modules/todos.rs | 202 |
| 716 | POST | `/todos` | add_todo | NewTodo | - | - | OK | svc/portal/src/modules/todos.rs | 349 |
| 717 | GET | `/user` | get_user_info | - | - | - | OK | svc/portal/src/modules/user.rs | 18 |
| 718 | GET | `/api/qms/checks` | list_inspections | - | - | page, page_size, status, inspection_type, search | OK | svc/qms/src/modules/quality_inspection.rs | 176 |
| 719 | POST | `/api/qms/checks` | create_inspection | CreateInspectionRequest | - | - | OK | svc/qms/src/modules/quality_inspection.rs | 271 |
| 720 | GET | `/api/qms/checks/{id}` | get_inspection | - | id | - | OK | svc/qms/src/modules/quality_inspection.rs | 315 |
| 721 | PUT | `/api/qms/checks/{id}` | update_inspection | UpdateInspectionRequest | id | - | OK | svc/qms/src/modules/quality_inspection.rs | 353 |
| 722 | DELETE | `/api/qms/checks/{id}` | delete_inspection | - | id | - | OK | svc/qms/src/modules/quality_inspection.rs | 402 |
| 723 | GET | `/api/qms/issues` | list_issues | - | - | page, page_size, status, severity | OK | svc/qms/src/modules/quality_issue.rs | 84 |
| 724 | POST | `/api/qms/issues` | create_issue | CreateIssueRequest | - | - | OK | svc/qms/src/modules/quality_issue.rs | 134 |
| 725 | GET | `/api/qms/standards` | list_standards | - | - | page, page_size, category, status, search | OK | svc/qms/src/modules/quality_standard.rs | 100 |
| 726 | POST | `/api/qms/standards` | create_standard | CreateStandardRequest | - | - | OK | svc/qms/src/modules/quality_standard.rs | 177 |
| 727 | GET | `/api/qms/standards/{id}` | get_standard | - | id | - | OK | svc/qms/src/modules/quality_standard.rs | 221 |
| 728 | PUT | `/api/qms/standards/{id}` | update_standard | UpdateStandardRequest | id | - | OK | svc/qms/src/modules/quality_standard.rs | 259 |
| 729 | DELETE | `/api/qms/standards/{id}` | delete_standard | - | id | - | OK | svc/qms/src/modules/quality_standard.rs | 311 |
| 730 | GET | `/audit-logs` | list_audit_logs | - | - | action, entity_type, user_id, status, start_date, end_date, page, page_size | OK | svc/rd/src/modules/audit.rs | 36 |
| 731 | GET | `/audit-logs/{id}` | get_audit_log | - | id | - | OK | svc/rd/src/modules/audit.rs | 131 |
| 732 | GET | `/audit-logs/export` | export_audit_logs | - | - | action, entity_type, user_id, status, start_date, end_date | OK | svc/rd/src/modules/audit.rs | 227 |
| 733 | GET | `/projects` | list_projects | - | - | page, page_size, search, status | OK | svc/rd/src/modules/project.rs | 82 |
| 734 | POST | `/projects` | create_project | CreateProjectRequest | - | - | OK | svc/rd/src/modules/project.rs | 168 |
| 735 | GET | `/projects/{id}` | get_project | - | id | - | OK | svc/rd/src/modules/project.rs | 315 |
| 736 | PUT | `/projects/{id}` | update_project | UpdateProjectRequest | id | - | OK | svc/rd/src/modules/project.rs | 376 |
| 737 | DELETE | `/projects/{id}` | delete_project | - | id | - | OK | svc/rd/src/modules/project.rs | 500 |
| 738 | POST | `/projects/batch` | batch_create_projects | BatchCreateRequest | - | - | OK | svc/rd/src/modules/project.rs | 583 |
| 739 | DELETE | `/projects/batch` | batch_delete_projects | BatchDeleteRequest | - | - | OK | svc/rd/src/modules/project.rs | 724 |
| 740 | GET | `/projects/export` | export_projects | - | - | - | OK | svc/rd/src/modules/project.rs | 824 |
| 741 | POST | `/projects/import` | import_projects | - | - | - | OK | svc/rd/src/modules/project.rs | 1039 |
| 742 | GET | `/projects/{id}/dashboard` | get_project_dashboard | - | id | - | OK | svc/rd/src/modules/project.rs | 1245 |
| 743 | GET | `/projects/{id}/gantt` | get_project_gantt | - | id | - | OK | svc/rd/src/modules/project.rs | 1436 |
| 744 | - | `-` | extract_openapi_spec | - | - | - | OK | svc/scm/src/modules/openapi.rs | 112 |
| 745 | GET | `/scm/purchase-orders` | list_orders | - | - | - | OK | svc/scm/src/modules/purchase_order.rs | 31 |
| 746 | POST | `/scm/purchase-orders` | create_order | CreatePurchaseOrderRequest | - | - | OK | svc/scm/src/modules/purchase_order.rs | 105 |
| 747 | GET | `/scm/purchase-orders/{id}` | get_order | - | id | - | OK | svc/scm/src/modules/purchase_order.rs | 188 |
| 748 | PUT | `/scm/purchase-orders/{id}` | update_order | UpdatePurchaseOrderRequest | id | - | OK | svc/scm/src/modules/purchase_order.rs | 229 |
| 749 | DELETE | `/scm/purchase-orders/{id}` | delete_order | - | id | - | OK | svc/scm/src/modules/purchase_order.rs | 334 |
| 750 | POST | `/scm/purchase-orders/{id}/approve` | approve_order | ApprovalRequest | id | - | OK | svc/scm/src/modules/purchase_order.rs | 414 |
| 751 | POST | `/scm/purchase-orders/{id}/reject` | reject_order | ApprovalRequest | id | - | OK | svc/scm/src/modules/purchase_order.rs | 575 |
| 752 | GET | `/scm/suppliers` | list_suppliers | - | - | - | OK | svc/scm/src/modules/supplier.rs | 68 |
| 753 | POST | `/scm/suppliers` | create_supplier | CreateSupplierRequest | - | - | OK | svc/scm/src/modules/supplier.rs | 170 |
| 754 | GET | `/scm/suppliers/{id}` | get_supplier | - | id | - | OK | svc/scm/src/modules/supplier.rs | 291 |
| 755 | PUT | `/scm/suppliers/{id}` | update_supplier | UpdateSupplierRequest | id | - | OK | svc/scm/src/modules/supplier.rs | 366 |
| 756 | DELETE | `/scm/suppliers/{id}` | delete_supplier | - | id | - | OK | svc/scm/src/modules/supplier.rs | 517 |
| 757 | GET | `/api/search` | search_handler | - | - | keyword, page, page_size, modules | OK | svc/search/src/handlers.rs | 278 |
| 758 | GET | `/health` | health_handler | - | - | - | OK | svc/search/src/handlers.rs | 317 |
| 759 | GET | `/api/srm/suppliers` | list_suppliers | - | - | - | OK | svc/srm/src/modules/supplier.rs | 134 |
| 760 | POST | `/api/srm/suppliers` | create_supplier | CreateSupplierRequest | - | - | OK | svc/srm/src/modules/supplier.rs | 266 |
| 761 | GET | `/api/srm/suppliers/{id}` | get_supplier | - | id | - | OK | svc/srm/src/modules/supplier.rs | 433 |
| 762 | PUT | `/api/srm/suppliers/{id}` | update_supplier | UpdateSupplierRequest | id | - | OK | svc/srm/src/modules/supplier.rs | 492 |
| 763 | DELETE | `/api/srm/suppliers/{id}` | delete_supplier | - | id | - | OK | svc/srm/src/modules/supplier.rs | 653 |
| 764 | POST | `/tickets` | create_ticket_handler | CreateTicketRequest | - | - | OK | svc/ticket/src/handlers.rs | 550 |
| 765 | GET | `/tickets` | list_tickets_handler | - | - | page, page_size, status, severity, ticket_type | OK | svc/ticket/src/handlers.rs | 576 |
| 766 | GET | `/tickets/{id}` | get_ticket_handler | - | id | - | OK | svc/ticket/src/handlers.rs | 607 |
| 767 | PUT | `/tickets/{id}` | update_ticket_handler | UpdateTicketRequest | id | - | OK | svc/ticket/src/handlers.rs | 634 |
| 768 | DELETE | `/tickets/{id}` | delete_ticket_handler | - | id | - | OK | svc/ticket/src/handlers.rs | 664 |
| 769 | POST | `/tickets/{id}/comments` | add_comment_handler | AddCommentRequest | id | - | OK | svc/ticket/src/handlers.rs | 697 |
| 770 | GET | `/tickets/{id}/comments` | list_comments_handler | - | id | - | OK | svc/ticket/src/handlers.rs | 735 |
| 771 | GET | `/tickets/stats` | get_stats_handler | - | - | - | OK | svc/ticket/src/handlers.rs | 777 |
| 772 | POST | `/sla-policies` | create_sla_policy_handler | CreateSlaPolicyRequest | - | - | OK | svc/ticket/src/handlers.rs | 858 |
| 773 | GET | `/sla-policies` | list_sla_policies_handler | - | - | - | OK | svc/ticket/src/handlers.rs | 883 |
| 774 | GET | `/tasks` | list_tasks | - | - | page, page_size, search, status, assignee_id, workflow_id, instance_id | OK | svc/unified-core/src/modules/flow/task.rs | 30 |
| 775 | GET | `/tasks/{id}` | get_task | - | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 147 |
| 776 | POST | `/tasks/{id}/claim` | claim_task | - | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 184 |
| 777 | POST | `/tasks/{id}/approve` | approve_task | TaskActionRequest | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 245 |
| 778 | POST | `/tasks/{id}/reject` | reject_task | TaskActionRequest | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 285 |
| 779 | POST | `/tasks/batch/approve` | batch_approve | TaskBatchRequest | - | - | OK | svc/unified-core/src/modules/flow/task.rs | 377 |
| 780 | GET | `/tasks/my/stats` | get_task_stats | - | - | - | OK | svc/unified-core/src/modules/flow/task.rs | 584 |
| 781 | POST | `/iam/auth/login` | login | serde_json::Value | - | - | OK | svc/unified-core/src/modules/iam/auth.rs | 106 |
| 782 | POST | `/iam/auth/register` | register | serde_json::Value | - | - | OK | svc/unified-core/src/modules/iam/auth.rs | 422 |
| 783 | GET | `/users` | list_users | - | - | page, page_size | OK | svc/unified-core/src/modules/iam/user/crud.rs | 26 |
| 784 | POST | `/users` | create_user | serde_json::Value | - | - | OK | svc/unified-core/src/modules/iam/user/crud.rs | 149 |
| 785 | GET | `/api/wms/inventory` | list_inventory | - | - | - | OK | svc/wms/src/modules/inventory.rs | 96 |
| 786 | POST | `/api/wms/inventory` | create_inventory | CreateInventoryItemRequest | - | - | OK | svc/wms/src/modules/inventory.rs | 178 |
| 787 | GET | `/api/wms/inventory/{id}` | get_inventory | - | id | - | OK | svc/wms/src/modules/inventory.rs | 269 |
| 788 | PUT | `/api/wms/inventory/{id}` | update_inventory | UpdateInventoryItemRequest | id | - | OK | svc/wms/src/modules/inventory.rs | 318 |
| 789 | DELETE | `/api/wms/inventory/{id}` | delete_inventory | - | id | - | OK | svc/wms/src/modules/inventory.rs | 544 |
| 790 | GET | `/api/wms/warehouses` | list_warehouses | - | - | - | OK | svc/wms/src/modules/warehouse.rs | 44 |
| 791 | POST | `/api/wms/warehouses` | create_warehouse | CreateWarehouseRequest | - | - | OK | svc/wms/src/modules/warehouse.rs | 132 |
| 792 | GET | `/api/wms/warehouses/{id}` | get_warehouse | - | id | - | OK | svc/wms/src/modules/warehouse.rs | 217 |
| 793 | PUT | `/api/wms/warehouses/{id}` | update_warehouse | UpdateWarehouseRequest | id | - | OK | svc/wms/src/modules/warehouse.rs | 271 |
| 794 | DELETE | `/api/wms/warehouses/{id}` | delete_warehouse | - | id | - | OK | svc/wms/src/modules/warehouse.rs | 387 |

## 4. 不匹配类型分布

> 无不匹配。

## 5. 方法论

### 数据源
- Rust 源码: `svc/*/src/**/*.rs`

### 解析逻辑
1. 扫描所有 `#[utoipa::path(...)]` 注解，提取 method/path/params/request_body/responses
2. 定位注解后紧跟的 handler 函数签名
3. 从签名中提取 `Path<>`, `Query<>`, `Json<>` 提取器类型
4. 对比 utoipa 声明与 handler 签名：
   - 路径参数：utoipa `params()` 中 `Path` 类型 vs handler `Path<>` 提取器
   - 请求体：utoipa `request_body` vs handler `Json<>` 参数类型
   - 查询参数：utoipa `params()` 中 `Query` 类型 vs handler `Query<>` 提取器
   - 路径模板：`{param}` 占位符与 `params()` 声明一致性

### CI 阻断规则
- `error >= 3` -> RED (阻断 CI)
- `0 < error < 3` -> YELLOW (告警不阻断)
- `error = 0` -> GREEN
