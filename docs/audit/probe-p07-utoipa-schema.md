# Probe P-07: utoipa schema vs handler 签名一致性探针

> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0

## 摘要统计

| 指标 | 数值 |
|------|------|
| 扫描 .rs 文件数 | 109 |
| utoipa::path 注解总数 | 715 |
| 签名匹配数 | 301 |
| 不匹配总数 | 818 |
| - error 级 | 14 |
| - warn 级 | 804 |
| CI 严重度 | RED (error >= 3) |

## 1. Error 级不匹配（阻断级）

共 14 个：

| # | 类型 | 方法 | 路径 | handler | 文件 | 行号 | 详情 |
|---|------|------|------|---------|------|------|------|
| 1 | REQUEST_BODY_MISSING | POST | `/api/bi/analysis` | create_analysis | svc/analytics/src/modules/bi/analysis.rs | 27 | utoipa declares request_body = serde_json but handler has no Json<> parameter |
| 2 | PATH_PARAM_MISSING | GET | `/api/bi/analysis/{id}` | get_analysis | svc/analytics/src/modules/bi/analysis.rs | 48 | utoipa declares 1 path param(s) [id] but handler has no Path<> extractor |
| 3 | PATH_PARAM_MISSING | POST | `/api/bi/analysis/{id}/execute` | execute_analysis | svc/analytics/src/modules/bi/analysis.rs | 69 | utoipa declares 1 path param(s) [id] but handler has no Path<> extractor |
| 4 | REQUEST_BODY_MISSING | POST | `/api/bi/analysis/{id}/execute` | execute_analysis | svc/analytics/src/modules/bi/analysis.rs | 69 | utoipa declares request_body = serde_json but handler has no Json<> parameter |
| 5 | REQUEST_BODY_TYPE_MISMATCH | POST | `/report` | create_report | svc/analytics/src/modules/bi/self_service_report.rs | 131 | utoipa request_body = serde_json but handler accepts Json<CreateReportRequest> |
| 6 | REQUEST_BODY_TYPE_MISMATCH | PUT | `/report/{id}` | update_report | svc/analytics/src/modules/bi/self_service_report.rs | 260 | utoipa request_body = serde_json but handler accepts Json<UpdateReportRequest> |
| 7 | REQUEST_BODY_TYPE_MISMATCH | POST | `/widget` | create_widget | svc/analytics/src/modules/bi/widget.rs | 249 | utoipa request_body = serde_json but handler accepts Json<CreateWidgetRequest> |
| 8 | REQUEST_BODY_TYPE_MISMATCH | PUT | `/widget/{id}` | update_widget | svc/analytics/src/modules/bi/widget.rs | 380 | utoipa request_body = serde_json but handler accepts Json<UpdateWidgetRequest> |
| 9 | REQUEST_BODY_TYPE_MISMATCH | POST | `/locations/create` | create_location | svc/gis/src/modules/location.rs | 59 | utoipa request_body = serde_json but handler accepts Json<CreateLocation> |
| 10 | REQUEST_BODY_TYPE_MISMATCH | POST | `/maps/create` | create_map | svc/gis/src/modules/map.rs | 73 | utoipa request_body = serde_json but handler accepts Json<CreateMap> |
| 11 | REQUEST_BODY_TYPE_MISMATCH | PUT | `/maps/{id}` | update_map | svc/gis/src/modules/map.rs | 169 | utoipa request_body = serde_json but handler accepts Json<UpdateMap> |
| 12 | REQUEST_BODY_TYPE_MISMATCH | POST | `/iam/auth/login` | login | svc/unified-core/src/modules/iam/auth.rs | 106 | utoipa request_body = LoginRequest but handler accepts Json<serde_json::Value> |
| 13 | REQUEST_BODY_TYPE_MISMATCH | POST | `/iam/auth/register` | register | svc/unified-core/src/modules/iam/auth.rs | 422 | utoipa request_body = RegisterRequest but handler accepts Json<serde_json::Value> |
| 14 | REQUEST_BODY_TYPE_MISMATCH | POST | `/users` | create_user | svc/unified-core/src/modules/iam/user/crud.rs | 149 | utoipa request_body = CreateUserRequest but handler accepts Json<serde_json::Value> |

## 2. Warn 级不匹配（告警级）

共 804 个：

| # | 类型 | 方法 | 路径 | handler | 文件 | 行号 | 详情 |
|---|------|------|------|---------|------|------|------|
| 1 | REQUEST_BODY_EXTRA | POST | `/api/ai/generate` | generate | svc/ai/src/handlers/ai_handlers.rs | 17 | handler has Json<AIGenerateRequest> parameter but utoipa declares no request_body |
| 2 | REQUEST_BODY_EXTRA | POST | `/api/ai/validate` | validate | svc/ai/src/handlers/ai_handlers.rs | 97 | handler has Json<ValidateRequest> parameter but utoipa declares no request_body |
| 3 | REQUEST_BODY_EXTRA | POST | `/api/ai/complete` | complete | svc/ai/src/handlers/ai_handlers.rs | 263 | handler has Json<CompleteRequest> parameter but utoipa declares no request_body |
| 4 | REQUEST_BODY_EXTRA | POST | `/api/ai/summarize` | summarize | svc/ai/src/handlers/ai_handlers.rs | 394 | handler has Json<SummarizeRequest> parameter but utoipa declares no request_body |
| 5 | REQUEST_BODY_EXTRA | POST | `/api/ai/chat` | chat | svc/ai/src/handlers/ai_handlers.rs | 519 | handler has Json<ChatRequest> parameter but utoipa declares no request_body |
| 6 | REQUEST_BODY_EXTRA | POST | `/search` | ai_search | svc/ai/src/handlers/ai_handlers.rs | 642 | handler has Json<AiSearchRequest> parameter but utoipa declares no request_body |
| 7 | REQUEST_BODY_EXTRA | POST | `/api/ai/assistant/report` | report_assistant | svc/ai/src/handlers/ai_handlers.rs | 769 | handler has Json<ReportAssistantRequest> parameter but utoipa declares no request_body |
| 8 | REQUEST_BODY_EXTRA | POST | `/api/ai/assistant/flow` | flow_assistant | svc/ai/src/handlers/ai_handlers.rs | 823 | handler has Json<FlowAssistantRequest> parameter but utoipa declares no request_body |
| 9 | REQUEST_BODY_EXTRA | POST | `/api/ai/assistant/anomaly/predict` | anomaly_predict | svc/ai/src/handlers/ai_handlers.rs | 886 | handler has Json<AnomalyPredictRequest> parameter but utoipa declares no request_body |
| 10 | REQUEST_BODY_EXTRA | POST | `/api/ai/assistant/knowledge/ask` | knowledge_ask | svc/ai/src/handlers/ai_handlers.rs | 934 | handler has Json<KnowledgeAskRequest> parameter but utoipa declares no request_body |
| 11 | REQUEST_BODY_EXTRA | POST | `/api/ai/connectors/create` | create_connector | svc/ai/src/handlers/connector_handlers.rs | 80 | handler has Json<CreateConnectorRequest> parameter but utoipa declares no request_body |
| 12 | REQUEST_BODY_EXTRA | POST | `/api/ai/connectors/update` | update_connector | svc/ai/src/handlers/connector_handlers.rs | 134 | handler has Json<UpdateConnectorRequest> parameter but utoipa declares no request_body |
| 13 | REQUEST_BODY_EXTRA | POST | `/api/ai/connectors/query` | query_data | svc/ai/src/handlers/connector_handlers.rs | 283 | handler has Json<DataQueryRequest> parameter but utoipa declares no request_body |
| 14 | REQUEST_BODY_EXTRA | POST | `/api/ai/agent/run` | agent_run | svc/ai/src/modules/agent.rs | 14 | handler has Json<crate::services::AgentRequest> parameter but utoipa declares no request_body |
| 15 | PATH_PARAM_UNDECLARED | POST | `/api/ai/documents/{id}/process` | _document_process | svc/ai/src/modules/openapi.rs | 109 | path template has "{id}" but utoipa params() does not declare it |
| 16 | PATH_PARAM_UNDECLARED | GET | `/api/ai/documents/{id}` | _document_get | svc/ai/src/modules/openapi.rs | 117 | path template has "{id}" but utoipa params() does not declare it |
| 17 | PATH_PARAM_UNDECLARED | DELETE | `/api/ai/documents/{id}` | _document_delete | svc/ai/src/modules/openapi.rs | 125 | path template has "{id}" but utoipa params() does not declare it |
| 18 | PATH_PARAM_UNDECLARED | POST | `/api/ai/documents/{id}/extract` | _document_extract | svc/ai/src/modules/openapi.rs | 141 | path template has "{id}" but utoipa params() does not declare it |
| 19 | PATH_PARAM_UNDECLARED | POST | `/api/ai/documents/{id}/summarize` | _document_summarize | svc/ai/src/modules/openapi.rs | 157 | path template has "{id}" but utoipa params() does not declare it |
| 20 | PATH_PARAM_UNDECLARED | POST | `/api/ai/documents/{id}/key-points` | _document_key_points | svc/ai/src/modules/openapi.rs | 165 | path template has "{id}" but utoipa params() does not declare it |
| 21 | PATH_PARAM_UNDECLARED | DELETE | `/api/ai/qa/history/{id}` | _qa_delete_history | svc/ai/src/modules/openapi.rs | 296 | path template has "{id}" but utoipa params() does not declare it |
| 22 | PATH_PARAM_UNDECLARED | GET | `/api/ai/vectors/{id}` | _vector_get | svc/ai/src/modules/openapi.rs | 386 | path template has "{id}" but utoipa params() does not declare it |
| 23 | PATH_PARAM_UNDECLARED | DELETE | `/api/ai/vectors/{id}` | _vector_delete | svc/ai/src/modules/openapi.rs | 394 | path template has "{id}" but utoipa params() does not declare it |
| 24 | REQUEST_BODY_EXTRA | POST | `/api/ehs/incidents` | report_accident | svc/ehs/src/modules/accident.rs | 232 | handler has Json<CreateAccidentRequest> parameter but utoipa declares no request_body |
| 25 | PATH_PARAM_EXTRA | GET | `/api/ehs/incidents/{id}` | get_accident | svc/ehs/src/modules/accident.rs | 272 | handler has Path<> extractor but utoipa declares no path params |
| 26 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/incidents/{id}` | get_accident | svc/ehs/src/modules/accident.rs | 272 | path template has "{id}" but utoipa params() does not declare it |
| 27 | PATH_PARAM_EXTRA | PUT | `/api/ehs/incidents/{id}` | update_accident | svc/ehs/src/modules/accident.rs | 342 | handler has Path<> extractor but utoipa declares no path params |
| 28 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/incidents/{id}` | update_accident | svc/ehs/src/modules/accident.rs | 342 | path template has "{id}" but utoipa params() does not declare it |
| 29 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/incidents/{id}` | update_accident | svc/ehs/src/modules/accident.rs | 342 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 30 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/incidents/{id}` | delete_accident | svc/ehs/src/modules/accident.rs | 380 | handler has Path<> extractor but utoipa declares no path params |
| 31 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/incidents/{id}` | delete_accident | svc/ehs/src/modules/accident.rs | 380 | path template has "{id}" but utoipa params() does not declare it |
| 32 | PATH_PARAM_EXTRA | POST | `/api/ehs/incidents/{id}/investigation` | start_investigation | svc/ehs/src/modules/accident.rs | 397 | handler has Path<> extractor but utoipa declares no path params |
| 33 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/incidents/{id}/investigation` | start_investigation | svc/ehs/src/modules/accident.rs | 397 | path template has "{id}" but utoipa params() does not declare it |
| 34 | REQUEST_BODY_EXTRA | POST | `/api/ehs/incidents/{id}/investigation` | start_investigation | svc/ehs/src/modules/accident.rs | 397 | handler has Json<CreateInvestigationRequest> parameter but utoipa declares no request_body |
| 35 | PATH_PARAM_EXTRA | PUT | `/api/ehs/incidents/{id}/investigation` | update_investigation | svc/ehs/src/modules/accident.rs | 432 | handler has Path<> extractor but utoipa declares no path params |
| 36 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/incidents/{id}/investigation` | update_investigation | svc/ehs/src/modules/accident.rs | 432 | path template has "{id}" but utoipa params() does not declare it |
| 37 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/incidents/{id}/investigation` | update_investigation | svc/ehs/src/modules/accident.rs | 432 | handler has Json<UpdateInvestigationRequest> parameter but utoipa declares no request_body |
| 38 | PATH_PARAM_EXTRA | POST | `/api/ehs/incidents/{id}/investigation/complete` | complete_investigation | svc/ehs/src/modules/accident.rs | 474 | handler has Path<> extractor but utoipa declares no path params |
| 39 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/incidents/{id}/investigation/complete` | complete_investigation | svc/ehs/src/modules/accident.rs | 474 | path template has "{id}" but utoipa params() does not declare it |
| 40 | PATH_PARAM_EXTRA | POST | `/api/ehs/incidents/{id}/treatment` | create_treatment | svc/ehs/src/modules/accident.rs | 525 | handler has Path<> extractor but utoipa declares no path params |
| 41 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/incidents/{id}/treatment` | create_treatment | svc/ehs/src/modules/accident.rs | 525 | path template has "{id}" but utoipa params() does not declare it |
| 42 | REQUEST_BODY_EXTRA | POST | `/api/ehs/incidents/{id}/treatment` | create_treatment | svc/ehs/src/modules/accident.rs | 525 | handler has Json<CreateTreatmentRequest> parameter but utoipa declares no request_body |
| 43 | PATH_PARAM_EXTRA | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | update_treatment_action | svc/ehs/src/modules/accident.rs | 574 | handler has Path<> extractor but utoipa declares no path params |
| 44 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | update_treatment_action | svc/ehs/src/modules/accident.rs | 574 | path template has "{id}" but utoipa params() does not declare it |
| 45 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | update_treatment_action | svc/ehs/src/modules/accident.rs | 574 | path template has "{action_id}" but utoipa params() does not declare it |
| 46 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | update_treatment_action | svc/ehs/src/modules/accident.rs | 574 | handler has Json<UpdateTreatmentActionRequest> parameter but utoipa declares no request_body |
| 47 | PATH_PARAM_EXTRA | POST | `/api/ehs/incidents/{id}/treatment/complete` | complete_treatment | svc/ehs/src/modules/accident.rs | 609 | handler has Path<> extractor but utoipa declares no path params |
| 48 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/incidents/{id}/treatment/complete` | complete_treatment | svc/ehs/src/modules/accident.rs | 609 | path template has "{id}" but utoipa params() does not declare it |
| 49 | PATH_PARAM_EXTRA | POST | `/api/ehs/incidents/{id}/review` | create_review | svc/ehs/src/modules/accident.rs | 662 | handler has Path<> extractor but utoipa declares no path params |
| 50 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/incidents/{id}/review` | create_review | svc/ehs/src/modules/accident.rs | 662 | path template has "{id}" but utoipa params() does not declare it |
| 51 | REQUEST_BODY_EXTRA | POST | `/api/ehs/incidents/{id}/review` | create_review | svc/ehs/src/modules/accident.rs | 662 | handler has Json<CreateReviewRequest> parameter but utoipa declares no request_body |
| 52 | PATH_PARAM_EXTRA | POST | `/api/ehs/incidents/{id}/close` | close_accident | svc/ehs/src/modules/accident.rs | 694 | handler has Path<> extractor but utoipa declares no path params |
| 53 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/incidents/{id}/close` | close_accident | svc/ehs/src/modules/accident.rs | 694 | path template has "{id}" but utoipa params() does not declare it |
| 54 | PATH_PARAM_EXTRA | GET | `/api/ehs/sync-records/{id}` | get_sync_record | svc/ehs/src/modules/data_sync.rs | 146 | handler has Path<> extractor but utoipa declares no path params |
| 55 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/sync-records/{id}` | get_sync_record | svc/ehs/src/modules/data_sync.rs | 146 | path template has "{id}" but utoipa params() does not declare it |
| 56 | REQUEST_BODY_EXTRA | POST | `/api/ehs/sync/hazard-to-qms` | sync_hazard_to_qms | svc/ehs/src/modules/data_sync.rs | 193 | handler has Json<SyncHazardToQmsRequest> parameter but utoipa declares no request_body |
| 57 | REQUEST_BODY_EXTRA | POST | `/api/ehs/sync/accident-to-lims` | sync_accident_to_lims | svc/ehs/src/modules/data_sync.rs | 293 | handler has Json<SyncAccidentToLimsRequest> parameter but utoipa declares no request_body |
| 58 | PATH_PARAM_EXTRA | POST | `/api/ehs/sync-records/{id}/retry` | retry_sync | svc/ehs/src/modules/data_sync.rs | 398 | handler has Path<> extractor but utoipa declares no path params |
| 59 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/sync-records/{id}/retry` | retry_sync | svc/ehs/src/modules/data_sync.rs | 398 | path template has "{id}" but utoipa params() does not declare it |
| 60 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/sync-records/{id}` | delete_sync_record | svc/ehs/src/modules/data_sync.rs | 445 | handler has Path<> extractor but utoipa declares no path params |
| 61 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/sync-records/{id}` | delete_sync_record | svc/ehs/src/modules/data_sync.rs | 445 | path template has "{id}" but utoipa params() does not declare it |
| 62 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/sync/configs` | update_sync_configs | svc/ehs/src/modules/data_sync.rs | 514 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 63 | REQUEST_BODY_EXTRA | POST | `/api/ehs/sync/retry` | batch_retry_sync | svc/ehs/src/modules/data_sync.rs | 564 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 64 | REQUEST_BODY_EXTRA | POST | `/api/ehs/drills/plans` | create_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 293 | handler has Json<CreateDrillPlanRequest> parameter but utoipa declares no request_body |
| 65 | PATH_PARAM_EXTRA | GET | `/api/ehs/drills/plans/{id}` | get_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 334 | handler has Path<> extractor but utoipa declares no path params |
| 66 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/drills/plans/{id}` | get_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 334 | path template has "{id}" but utoipa params() does not declare it |
| 67 | PATH_PARAM_EXTRA | PUT | `/api/ehs/drills/plans/{id}` | update_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 372 | handler has Path<> extractor but utoipa declares no path params |
| 68 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/drills/plans/{id}` | update_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 372 | path template has "{id}" but utoipa params() does not declare it |
| 69 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/drills/plans/{id}` | update_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 372 | handler has Json<UpdateDrillPlanRequest> parameter but utoipa declares no request_body |
| 70 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/drills/plans/{id}` | delete_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 413 | handler has Path<> extractor but utoipa declares no path params |
| 71 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/drills/plans/{id}` | delete_drill_plan | svc/ehs/src/modules/emergency_drill.rs | 413 | path template has "{id}" but utoipa params() does not declare it |
| 72 | REQUEST_BODY_EXTRA | POST | `/api/ehs/drills/records` | create_drill_record | svc/ehs/src/modules/emergency_drill.rs | 449 | handler has Json<CreateDrillRecordRequest> parameter but utoipa declares no request_body |
| 73 | PATH_PARAM_EXTRA | GET | `/api/ehs/drills/records/{id}` | get_drill_record | svc/ehs/src/modules/emergency_drill.rs | 494 | handler has Path<> extractor but utoipa declares no path params |
| 74 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/drills/records/{id}` | get_drill_record | svc/ehs/src/modules/emergency_drill.rs | 494 | path template has "{id}" but utoipa params() does not declare it |
| 75 | PATH_PARAM_EXTRA | PUT | `/api/ehs/drills/records/{id}` | update_drill_record | svc/ehs/src/modules/emergency_drill.rs | 573 | handler has Path<> extractor but utoipa declares no path params |
| 76 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/drills/records/{id}` | update_drill_record | svc/ehs/src/modules/emergency_drill.rs | 573 | path template has "{id}" but utoipa params() does not declare it |
| 77 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/drills/records/{id}` | update_drill_record | svc/ehs/src/modules/emergency_drill.rs | 573 | handler has Json<UpdateDrillRecordRequest> parameter but utoipa declares no request_body |
| 78 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/drills/records/{id}` | delete_drill_record | svc/ehs/src/modules/emergency_drill.rs | 618 | handler has Path<> extractor but utoipa declares no path params |
| 79 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/drills/records/{id}` | delete_drill_record | svc/ehs/src/modules/emergency_drill.rs | 618 | path template has "{id}" but utoipa params() does not declare it |
| 80 | PATH_PARAM_EXTRA | POST | `/api/ehs/drills/records/{id}/evaluation` | create_drill_evaluation | svc/ehs/src/modules/emergency_drill.rs | 635 | handler has Path<> extractor but utoipa declares no path params |
| 81 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/drills/records/{id}/evaluation` | create_drill_evaluation | svc/ehs/src/modules/emergency_drill.rs | 635 | path template has "{id}" but utoipa params() does not declare it |
| 82 | REQUEST_BODY_EXTRA | POST | `/api/ehs/drills/records/{id}/evaluation` | create_drill_evaluation | svc/ehs/src/modules/emergency_drill.rs | 635 | handler has Json<CreateEvaluationRequest> parameter but utoipa declares no request_body |
| 83 | PATH_PARAM_EXTRA | GET | `/api/ehs/drills/records/{id}/problems` | list_drill_problems | svc/ehs/src/modules/emergency_drill.rs | 671 | handler has Path<> extractor but utoipa declares no path params |
| 84 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/drills/records/{id}/problems` | list_drill_problems | svc/ehs/src/modules/emergency_drill.rs | 671 | path template has "{id}" but utoipa params() does not declare it |
| 85 | PATH_PARAM_EXTRA | POST | `/api/ehs/drills/records/{id}/problems` | create_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 691 | handler has Path<> extractor but utoipa declares no path params |
| 86 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/drills/records/{id}/problems` | create_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 691 | path template has "{id}" but utoipa params() does not declare it |
| 87 | REQUEST_BODY_EXTRA | POST | `/api/ehs/drills/records/{id}/problems` | create_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 691 | handler has Json<CreateDrillProblemRequest> parameter but utoipa declares no request_body |
| 88 | PATH_PARAM_EXTRA | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | update_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 729 | handler has Path<> extractor but utoipa declares no path params |
| 89 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | update_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 729 | path template has "{id}" but utoipa params() does not declare it |
| 90 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | update_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 729 | path template has "{problem_id}" but utoipa params() does not declare it |
| 91 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | update_drill_problem | svc/ehs/src/modules/emergency_drill.rs | 729 | handler has Json<UpdateDrillProblemRequest> parameter but utoipa declares no request_body |
| 92 | REQUEST_BODY_EXTRA | POST | `/api/ehs/emergency-plans` | create_plan | svc/ehs/src/modules/emergency_plan.rs | 214 | handler has Json<CreatePlanRequest> parameter but utoipa declares no request_body |
| 93 | PATH_PARAM_EXTRA | GET | `/api/ehs/emergency-plans/{id}` | get_plan | svc/ehs/src/modules/emergency_plan.rs | 260 | handler has Path<> extractor but utoipa declares no path params |
| 94 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/emergency-plans/{id}` | get_plan | svc/ehs/src/modules/emergency_plan.rs | 260 | path template has "{id}" but utoipa params() does not declare it |
| 95 | PATH_PARAM_EXTRA | PUT | `/api/ehs/emergency-plans/{id}` | update_plan | svc/ehs/src/modules/emergency_plan.rs | 373 | handler has Path<> extractor but utoipa declares no path params |
| 96 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/emergency-plans/{id}` | update_plan | svc/ehs/src/modules/emergency_plan.rs | 373 | path template has "{id}" but utoipa params() does not declare it |
| 97 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/emergency-plans/{id}` | update_plan | svc/ehs/src/modules/emergency_plan.rs | 373 | handler has Json<UpdatePlanRequest> parameter but utoipa declares no request_body |
| 98 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/emergency-plans/{id}` | delete_plan | svc/ehs/src/modules/emergency_plan.rs | 417 | handler has Path<> extractor but utoipa declares no path params |
| 99 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/emergency-plans/{id}` | delete_plan | svc/ehs/src/modules/emergency_plan.rs | 417 | path template has "{id}" but utoipa params() does not declare it |
| 100 | PATH_PARAM_EXTRA | GET | `/api/ehs/emergency-plans/{id}/supplies` | list_plan_supplies | svc/ehs/src/modules/emergency_plan.rs | 434 | handler has Path<> extractor but utoipa declares no path params |
| 101 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/emergency-plans/{id}/supplies` | list_plan_supplies | svc/ehs/src/modules/emergency_plan.rs | 434 | path template has "{id}" but utoipa params() does not declare it |
| 102 | PATH_PARAM_EXTRA | POST | `/api/ehs/emergency-plans/{id}/supplies` | add_plan_supply | svc/ehs/src/modules/emergency_plan.rs | 454 | handler has Path<> extractor but utoipa declares no path params |
| 103 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/emergency-plans/{id}/supplies` | add_plan_supply | svc/ehs/src/modules/emergency_plan.rs | 454 | path template has "{id}" but utoipa params() does not declare it |
| 104 | REQUEST_BODY_EXTRA | POST | `/api/ehs/emergency-plans/{id}/supplies` | add_plan_supply | svc/ehs/src/modules/emergency_plan.rs | 454 | handler has Json<CreateSupplyRequest> parameter but utoipa declares no request_body |
| 105 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | delete_plan_supply | svc/ehs/src/modules/emergency_plan.rs | 488 | handler has Path<> extractor but utoipa declares no path params |
| 106 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | delete_plan_supply | svc/ehs/src/modules/emergency_plan.rs | 488 | path template has "{id}" but utoipa params() does not declare it |
| 107 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | delete_plan_supply | svc/ehs/src/modules/emergency_plan.rs | 488 | path template has "{supply_id}" but utoipa params() does not declare it |
| 108 | PATH_PARAM_EXTRA | POST | `/api/ehs/emergency-plans/{id}/submit-approval` | submit_plan_approval | svc/ehs/src/modules/emergency_plan.rs | 505 | handler has Path<> extractor but utoipa declares no path params |
| 109 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/emergency-plans/{id}/submit-approval` | submit_plan_approval | svc/ehs/src/modules/emergency_plan.rs | 505 | path template has "{id}" but utoipa params() does not declare it |
| 110 | REQUEST_BODY_EXTRA | POST | `/api/ehs/emergency-plans/{id}/submit-approval` | submit_plan_approval | svc/ehs/src/modules/emergency_plan.rs | 505 | handler has Json<SubmitApprovalRequest> parameter but utoipa declares no request_body |
| 111 | PATH_PARAM_EXTRA | POST | `/api/ehs/emergency-plans/{id}/approve` | approve_plan | svc/ehs/src/modules/emergency_plan.rs | 549 | handler has Path<> extractor but utoipa declares no path params |
| 112 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/emergency-plans/{id}/approve` | approve_plan | svc/ehs/src/modules/emergency_plan.rs | 549 | path template has "{id}" but utoipa params() does not declare it |
| 113 | REQUEST_BODY_EXTRA | POST | `/api/ehs/emergency-plans/{id}/approve` | approve_plan | svc/ehs/src/modules/emergency_plan.rs | 549 | handler has Json<ApprovalRequest> parameter but utoipa declares no request_body |
| 114 | PATH_PARAM_EXTRA | GET | `/api/ehs/emergency-plans/{id}/versions` | list_plan_versions | svc/ehs/src/modules/emergency_plan.rs | 581 | handler has Path<> extractor but utoipa declares no path params |
| 115 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/emergency-plans/{id}/versions` | list_plan_versions | svc/ehs/src/modules/emergency_plan.rs | 581 | path template has "{id}" but utoipa params() does not declare it |
| 116 | PATH_PARAM_EXTRA | POST | `/api/ehs/emergency-plans/{id}/versions` | create_new_version | svc/ehs/src/modules/emergency_plan.rs | 601 | handler has Path<> extractor but utoipa declares no path params |
| 117 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/emergency-plans/{id}/versions` | create_new_version | svc/ehs/src/modules/emergency_plan.rs | 601 | path template has "{id}" but utoipa params() does not declare it |
| 118 | REQUEST_BODY_EXTRA | POST | `/api/ehs/emergency-plans/{id}/versions` | create_new_version | svc/ehs/src/modules/emergency_plan.rs | 601 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 119 | REQUEST_BODY_EXTRA | POST | `/api/ehs/environment/records` | create_record | svc/ehs/src/modules/environment.rs | 78 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 120 | REQUEST_BODY_EXTRA | POST | `/api/ehs/environmental-compliance/regulations` | create_regulation | svc/ehs/src/modules/environmental_compliance.rs | 402 | handler has Json<CreateRegulationRequest> parameter but utoipa declares no request_body |
| 121 | PATH_PARAM_EXTRA | GET | `/api/ehs/environmental-compliance/regulations/{id}` | get_regulation | svc/ehs/src/modules/environmental_compliance.rs | 445 | handler has Path<> extractor but utoipa declares no path params |
| 122 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/environmental-compliance/regulations/{id}` | get_regulation | svc/ehs/src/modules/environmental_compliance.rs | 445 | path template has "{id}" but utoipa params() does not declare it |
| 123 | PATH_PARAM_EXTRA | PUT | `/api/ehs/environmental-compliance/regulations/{id}` | update_regulation | svc/ehs/src/modules/environmental_compliance.rs | 487 | handler has Path<> extractor but utoipa declares no path params |
| 124 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/environmental-compliance/regulations/{id}` | update_regulation | svc/ehs/src/modules/environmental_compliance.rs | 487 | path template has "{id}" but utoipa params() does not declare it |
| 125 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/environmental-compliance/regulations/{id}` | update_regulation | svc/ehs/src/modules/environmental_compliance.rs | 487 | handler has Json<UpdateRegulationRequest> parameter but utoipa declares no request_body |
| 126 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/environmental-compliance/regulations/{id}` | delete_regulation | svc/ehs/src/modules/environmental_compliance.rs | 530 | handler has Path<> extractor but utoipa declares no path params |
| 127 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/environmental-compliance/regulations/{id}` | delete_regulation | svc/ehs/src/modules/environmental_compliance.rs | 530 | path template has "{id}" but utoipa params() does not declare it |
| 128 | REQUEST_BODY_EXTRA | POST | `/api/ehs/environmental-compliance/evaluations` | create_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 566 | handler has Json<CreateEvaluationRequest> parameter but utoipa declares no request_body |
| 129 | PATH_PARAM_EXTRA | GET | `/api/ehs/environmental-compliance/evaluations/{id}` | get_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 609 | handler has Path<> extractor but utoipa declares no path params |
| 130 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/environmental-compliance/evaluations/{id}` | get_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 609 | path template has "{id}" but utoipa params() does not declare it |
| 131 | PATH_PARAM_EXTRA | PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | update_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 649 | handler has Path<> extractor but utoipa declares no path params |
| 132 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | update_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 649 | path template has "{id}" but utoipa params() does not declare it |
| 133 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | update_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 649 | handler has Json<UpdateEvaluationRequest> parameter but utoipa declares no request_body |
| 134 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/environmental-compliance/evaluations/{id}` | delete_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 700 | handler has Path<> extractor but utoipa declares no path params |
| 135 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/environmental-compliance/evaluations/{id}` | delete_evaluation | svc/ehs/src/modules/environmental_compliance.rs | 700 | path template has "{id}" but utoipa params() does not declare it |
| 136 | REQUEST_BODY_EXTRA | POST | `/api/ehs/environmental-compliance/monitoring` | create_monitor_record | svc/ehs/src/modules/environmental_compliance.rs | 736 | handler has Json<CreateMonitorRecordRequest> parameter but utoipa declares no request_body |
| 137 | PATH_PARAM_EXTRA | GET | `/api/ehs/environmental-compliance/monitoring/{id}` | get_monitor_record | svc/ehs/src/modules/environmental_compliance.rs | 782 | handler has Path<> extractor but utoipa declares no path params |
| 138 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/environmental-compliance/monitoring/{id}` | get_monitor_record | svc/ehs/src/modules/environmental_compliance.rs | 782 | path template has "{id}" but utoipa params() does not declare it |
| 139 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/environmental-compliance/monitoring/{id}` | delete_monitor_record | svc/ehs/src/modules/environmental_compliance.rs | 825 | handler has Path<> extractor but utoipa declares no path params |
| 140 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/environmental-compliance/monitoring/{id}` | delete_monitor_record | svc/ehs/src/modules/environmental_compliance.rs | 825 | path template has "{id}" but utoipa params() does not declare it |
| 141 | REQUEST_BODY_EXTRA | POST | `/api/ehs/environmental-compliance/permits` | create_permit | svc/ehs/src/modules/environmental_compliance.rs | 861 | handler has Json<CreatePermitRequest> parameter but utoipa declares no request_body |
| 142 | PATH_PARAM_EXTRA | GET | `/api/ehs/environmental-compliance/permits/{id}` | get_permit | svc/ehs/src/modules/environmental_compliance.rs | 905 | handler has Path<> extractor but utoipa declares no path params |
| 143 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/environmental-compliance/permits/{id}` | get_permit | svc/ehs/src/modules/environmental_compliance.rs | 905 | path template has "{id}" but utoipa params() does not declare it |
| 144 | PATH_PARAM_EXTRA | PUT | `/api/ehs/environmental-compliance/permits/{id}` | update_permit | svc/ehs/src/modules/environmental_compliance.rs | 950 | handler has Path<> extractor but utoipa declares no path params |
| 145 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/environmental-compliance/permits/{id}` | update_permit | svc/ehs/src/modules/environmental_compliance.rs | 950 | path template has "{id}" but utoipa params() does not declare it |
| 146 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/environmental-compliance/permits/{id}` | update_permit | svc/ehs/src/modules/environmental_compliance.rs | 950 | handler has Json<UpdatePermitRequest> parameter but utoipa declares no request_body |
| 147 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/environmental-compliance/permits/{id}` | delete_permit | svc/ehs/src/modules/environmental_compliance.rs | 992 | handler has Path<> extractor but utoipa declares no path params |
| 148 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/environmental-compliance/permits/{id}` | delete_permit | svc/ehs/src/modules/environmental_compliance.rs | 992 | path template has "{id}" but utoipa params() does not declare it |
| 149 | REQUEST_BODY_EXTRA | POST | `/api/ehs/environmental-compliance/incidents` | create_incident | svc/ehs/src/modules/environmental_compliance.rs | 1028 | handler has Json<CreateIncidentRequest> parameter but utoipa declares no request_body |
| 150 | PATH_PARAM_EXTRA | GET | `/api/ehs/environmental-compliance/incidents/{id}` | get_incident | svc/ehs/src/modules/environmental_compliance.rs | 1076 | handler has Path<> extractor but utoipa declares no path params |
| 151 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/environmental-compliance/incidents/{id}` | get_incident | svc/ehs/src/modules/environmental_compliance.rs | 1076 | path template has "{id}" but utoipa params() does not declare it |
| 152 | PATH_PARAM_EXTRA | PUT | `/api/ehs/environmental-compliance/incidents/{id}` | update_incident | svc/ehs/src/modules/environmental_compliance.rs | 1121 | handler has Path<> extractor but utoipa declares no path params |
| 153 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/environmental-compliance/incidents/{id}` | update_incident | svc/ehs/src/modules/environmental_compliance.rs | 1121 | path template has "{id}" but utoipa params() does not declare it |
| 154 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/environmental-compliance/incidents/{id}` | update_incident | svc/ehs/src/modules/environmental_compliance.rs | 1121 | handler has Json<UpdateIncidentRequest> parameter but utoipa declares no request_body |
| 155 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/environmental-compliance/incidents/{id}` | delete_incident | svc/ehs/src/modules/environmental_compliance.rs | 1177 | handler has Path<> extractor but utoipa declares no path params |
| 156 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/environmental-compliance/incidents/{id}` | delete_incident | svc/ehs/src/modules/environmental_compliance.rs | 1177 | path template has "{id}" but utoipa params() does not declare it |
| 157 | REQUEST_BODY_EXTRA | POST | `/api/ehs/issues` | create_hazard | svc/ehs/src/modules/hazard.rs | 226 | handler has Json<CreateHazardRequest> parameter but utoipa declares no request_body |
| 158 | PATH_PARAM_EXTRA | GET | `/api/ehs/issues/{id}` | get_hazard | svc/ehs/src/modules/hazard.rs | 335 | handler has Path<> extractor but utoipa declares no path params |
| 159 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/issues/{id}` | get_hazard | svc/ehs/src/modules/hazard.rs | 335 | path template has "{id}" but utoipa params() does not declare it |
| 160 | PATH_PARAM_EXTRA | PUT | `/api/ehs/issues/{id}` | update_hazard | svc/ehs/src/modules/hazard.rs | 405 | handler has Path<> extractor but utoipa declares no path params |
| 161 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/issues/{id}` | update_hazard | svc/ehs/src/modules/hazard.rs | 405 | path template has "{id}" but utoipa params() does not declare it |
| 162 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/issues/{id}` | update_hazard | svc/ehs/src/modules/hazard.rs | 405 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 163 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/issues/{id}` | delete_hazard | svc/ehs/src/modules/hazard.rs | 451 | handler has Path<> extractor but utoipa declares no path params |
| 164 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/issues/{id}` | delete_hazard | svc/ehs/src/modules/hazard.rs | 451 | path template has "{id}" but utoipa params() does not declare it |
| 165 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/rectification` | start_rectification | svc/ehs/src/modules/hazard.rs | 474 | handler has Path<> extractor but utoipa declares no path params |
| 166 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/rectification` | start_rectification | svc/ehs/src/modules/hazard.rs | 474 | path template has "{id}" but utoipa params() does not declare it |
| 167 | REQUEST_BODY_EXTRA | POST | `/api/ehs/issues/{id}/rectification` | start_rectification | svc/ehs/src/modules/hazard.rs | 474 | handler has Json<CreateRectificationRequest> parameter but utoipa declares no request_body |
| 168 | PATH_PARAM_EXTRA | PUT | `/api/ehs/issues/{id}/rectification` | update_rectification | svc/ehs/src/modules/hazard.rs | 509 | handler has Path<> extractor but utoipa declares no path params |
| 169 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/issues/{id}/rectification` | update_rectification | svc/ehs/src/modules/hazard.rs | 509 | path template has "{id}" but utoipa params() does not declare it |
| 170 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/issues/{id}/rectification` | update_rectification | svc/ehs/src/modules/hazard.rs | 509 | handler has Json<UpdateRectificationRequest> parameter but utoipa declares no request_body |
| 171 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/rectification/submit` | submit_rectification | svc/ehs/src/modules/hazard.rs | 562 | handler has Path<> extractor but utoipa declares no path params |
| 172 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/rectification/submit` | submit_rectification | svc/ehs/src/modules/hazard.rs | 562 | path template has "{id}" but utoipa params() does not declare it |
| 173 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/verification` | verify_hazard | svc/ehs/src/modules/hazard.rs | 596 | handler has Path<> extractor but utoipa declares no path params |
| 174 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/verification` | verify_hazard | svc/ehs/src/modules/hazard.rs | 596 | path template has "{id}" but utoipa params() does not declare it |
| 175 | REQUEST_BODY_EXTRA | POST | `/api/ehs/issues/{id}/verification` | verify_hazard | svc/ehs/src/modules/hazard.rs | 596 | handler has Json<CreateVerificationRequest> parameter but utoipa declares no request_body |
| 176 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/close` | close_hazard | svc/ehs/src/modules/hazard.rs | 627 | handler has Path<> extractor but utoipa declares no path params |
| 177 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/close` | close_hazard | svc/ehs/src/modules/hazard.rs | 627 | path template has "{id}" but utoipa params() does not declare it |
| 178 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/approval/start` | start_hazard_approval | svc/ehs/src/modules/hazard.rs | 677 | handler has Path<> extractor but utoipa declares no path params |
| 179 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/approval/start` | start_hazard_approval | svc/ehs/src/modules/hazard.rs | 677 | path template has "{id}" but utoipa params() does not declare it |
| 180 | REQUEST_BODY_EXTRA | POST | `/api/ehs/issues/{id}/approval/start` | start_hazard_approval | svc/ehs/src/modules/hazard.rs | 677 | handler has Json<StartApprovalRequest> parameter but utoipa declares no request_body |
| 181 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/approval/approve` | approve_hazard | svc/ehs/src/modules/hazard.rs | 741 | handler has Path<> extractor but utoipa declares no path params |
| 182 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/approval/approve` | approve_hazard | svc/ehs/src/modules/hazard.rs | 741 | path template has "{id}" but utoipa params() does not declare it |
| 183 | REQUEST_BODY_EXTRA | POST | `/api/ehs/issues/{id}/approval/approve` | approve_hazard | svc/ehs/src/modules/hazard.rs | 741 | handler has Json<ApprovalActionRequest> parameter but utoipa declares no request_body |
| 184 | PATH_PARAM_EXTRA | POST | `/api/ehs/issues/{id}/approval/reject` | reject_hazard | svc/ehs/src/modules/hazard.rs | 781 | handler has Path<> extractor but utoipa declares no path params |
| 185 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/issues/{id}/approval/reject` | reject_hazard | svc/ehs/src/modules/hazard.rs | 781 | path template has "{id}" but utoipa params() does not declare it |
| 186 | REQUEST_BODY_EXTRA | POST | `/api/ehs/issues/{id}/approval/reject` | reject_hazard | svc/ehs/src/modules/hazard.rs | 781 | handler has Json<ApprovalActionRequest> parameter but utoipa declares no request_body |
| 187 | REQUEST_BODY_EXTRA | POST | `/api/ehs/hazardous-materials` | create_material | svc/ehs/src/modules/hazardous_material.rs | 307 | handler has Json<CreateMaterialRequest> parameter but utoipa declares no request_body |
| 188 | PATH_PARAM_EXTRA | GET | `/api/ehs/hazardous-materials/{id}` | get_material | svc/ehs/src/modules/hazardous_material.rs | 357 | handler has Path<> extractor but utoipa declares no path params |
| 189 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/hazardous-materials/{id}` | get_material | svc/ehs/src/modules/hazardous_material.rs | 357 | path template has "{id}" but utoipa params() does not declare it |
| 190 | PATH_PARAM_EXTRA | PUT | `/api/ehs/hazardous-materials/{id}` | update_material | svc/ehs/src/modules/hazardous_material.rs | 472 | handler has Path<> extractor but utoipa declares no path params |
| 191 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/hazardous-materials/{id}` | update_material | svc/ehs/src/modules/hazardous_material.rs | 472 | path template has "{id}" but utoipa params() does not declare it |
| 192 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/hazardous-materials/{id}` | update_material | svc/ehs/src/modules/hazardous_material.rs | 472 | handler has Json<UpdateMaterialRequest> parameter but utoipa declares no request_body |
| 193 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/hazardous-materials/{id}` | delete_material | svc/ehs/src/modules/hazardous_material.rs | 520 | handler has Path<> extractor but utoipa declares no path params |
| 194 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/hazardous-materials/{id}` | delete_material | svc/ehs/src/modules/hazardous_material.rs | 520 | path template has "{id}" but utoipa params() does not declare it |
| 195 | PATH_PARAM_EXTRA | GET | `/api/ehs/hazardous-materials/{id}/stocks` | list_material_stocks | svc/ehs/src/modules/hazardous_material.rs | 537 | handler has Path<> extractor but utoipa declares no path params |
| 196 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/hazardous-materials/{id}/stocks` | list_material_stocks | svc/ehs/src/modules/hazardous_material.rs | 537 | path template has "{id}" but utoipa params() does not declare it |
| 197 | REQUEST_BODY_EXTRA | POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | create_stock_in | svc/ehs/src/modules/hazardous_material.rs | 576 | handler has Json<CreateStockRecordRequest> parameter but utoipa declares no request_body |
| 198 | REQUEST_BODY_EXTRA | POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | create_stock_out | svc/ehs/src/modules/hazardous_material.rs | 618 | handler has Json<CreateStockRecordRequest> parameter but utoipa declares no request_body |
| 199 | PATH_PARAM_EXTRA | GET | `/api/ehs/hazardous-materials/stock-records/{id}` | get_stock_record | svc/ehs/src/modules/hazardous_material.rs | 660 | handler has Path<> extractor but utoipa declares no path params |
| 200 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/hazardous-materials/stock-records/{id}` | get_stock_record | svc/ehs/src/modules/hazardous_material.rs | 660 | path template has "{id}" but utoipa params() does not declare it |
| 201 | PATH_PARAM_EXTRA | GET | `/api/ehs/hazardous-materials/{id}/msds` | get_material_msds | svc/ehs/src/modules/hazardous_material.rs | 699 | handler has Path<> extractor but utoipa declares no path params |
| 202 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/hazardous-materials/{id}/msds` | get_material_msds | svc/ehs/src/modules/hazardous_material.rs | 699 | path template has "{id}" but utoipa params() does not declare it |
| 203 | PATH_PARAM_EXTRA | PUT | `/api/ehs/hazardous-materials/{id}/msds` | update_material_msds | svc/ehs/src/modules/hazardous_material.rs | 744 | handler has Path<> extractor but utoipa declares no path params |
| 204 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/hazardous-materials/{id}/msds` | update_material_msds | svc/ehs/src/modules/hazardous_material.rs | 744 | path template has "{id}" but utoipa params() does not declare it |
| 205 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/hazardous-materials/{id}/msds` | update_material_msds | svc/ehs/src/modules/hazardous_material.rs | 744 | handler has Json<UpdateMsdsRequest> parameter but utoipa declares no request_body |
| 206 | REQUEST_BODY_EXTRA | POST | `/api/ehs/health` | create_record | svc/ehs/src/modules/health.rs | 69 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 207 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-disease/factors` | create_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 359 | handler has Json<CreateHazardFactorRequest> parameter but utoipa declares no request_body |
| 208 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-disease/factors/{id}` | get_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 401 | handler has Path<> extractor but utoipa declares no path params |
| 209 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-disease/factors/{id}` | get_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 401 | path template has "{id}" but utoipa params() does not declare it |
| 210 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-disease/factors/{id}` | update_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 440 | handler has Path<> extractor but utoipa declares no path params |
| 211 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-disease/factors/{id}` | update_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 440 | path template has "{id}" but utoipa params() does not declare it |
| 212 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-disease/factors/{id}` | update_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 440 | handler has Json<UpdateHazardFactorRequest> parameter but utoipa declares no request_body |
| 213 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-disease/factors/{id}` | delete_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 480 | handler has Path<> extractor but utoipa declares no path params |
| 214 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-disease/factors/{id}` | delete_hazard_factor | svc/ehs/src/modules/occupational_disease.rs | 480 | path template has "{id}" but utoipa params() does not declare it |
| 215 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-disease/detections` | create_detection_record | svc/ehs/src/modules/occupational_disease.rs | 516 | handler has Json<CreateDetectionRecordRequest> parameter but utoipa declares no request_body |
| 216 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-disease/detections/{id}` | get_detection_record | svc/ehs/src/modules/occupational_disease.rs | 561 | handler has Path<> extractor but utoipa declares no path params |
| 217 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-disease/detections/{id}` | get_detection_record | svc/ehs/src/modules/occupational_disease.rs | 561 | path template has "{id}" but utoipa params() does not declare it |
| 218 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-disease/detections/{id}` | delete_detection_record | svc/ehs/src/modules/occupational_disease.rs | 603 | handler has Path<> extractor but utoipa declares no path params |
| 219 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-disease/detections/{id}` | delete_detection_record | svc/ehs/src/modules/occupational_disease.rs | 603 | path template has "{id}" but utoipa params() does not declare it |
| 220 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-disease/cases` | create_disease_case | svc/ehs/src/modules/occupational_disease.rs | 639 | handler has Json<CreateDiseaseCaseRequest> parameter but utoipa declares no request_body |
| 221 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-disease/cases/{id}` | get_disease_case | svc/ehs/src/modules/occupational_disease.rs | 686 | handler has Path<> extractor but utoipa declares no path params |
| 222 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-disease/cases/{id}` | get_disease_case | svc/ehs/src/modules/occupational_disease.rs | 686 | path template has "{id}" but utoipa params() does not declare it |
| 223 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-disease/cases/{id}` | update_disease_case | svc/ehs/src/modules/occupational_disease.rs | 730 | handler has Path<> extractor but utoipa declares no path params |
| 224 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-disease/cases/{id}` | update_disease_case | svc/ehs/src/modules/occupational_disease.rs | 730 | path template has "{id}" but utoipa params() does not declare it |
| 225 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-disease/cases/{id}` | update_disease_case | svc/ehs/src/modules/occupational_disease.rs | 730 | handler has Json<UpdateDiseaseCaseRequest> parameter but utoipa declares no request_body |
| 226 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-disease/cases/{id}` | delete_disease_case | svc/ehs/src/modules/occupational_disease.rs | 782 | handler has Path<> extractor but utoipa declares no path params |
| 227 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-disease/cases/{id}` | delete_disease_case | svc/ehs/src/modules/occupational_disease.rs | 782 | path template has "{id}" but utoipa params() does not declare it |
| 228 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-disease/protection-measures` | create_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 818 | handler has Json<CreateProtectionMeasureRequest> parameter but utoipa declares no request_body |
| 229 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-disease/protection-measures/{id}` | get_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 859 | handler has Path<> extractor but utoipa declares no path params |
| 230 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-disease/protection-measures/{id}` | get_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 859 | path template has "{id}" but utoipa params() does not declare it |
| 231 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | update_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 897 | handler has Path<> extractor but utoipa declares no path params |
| 232 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | update_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 897 | path template has "{id}" but utoipa params() does not declare it |
| 233 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | update_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 897 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 234 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-disease/protection-measures/{id}` | delete_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 946 | handler has Path<> extractor but utoipa declares no path params |
| 235 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-disease/protection-measures/{id}` | delete_protection_measure | svc/ehs/src/modules/occupational_disease.rs | 946 | path template has "{id}" but utoipa params() does not declare it |
| 236 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-disease/trainings` | create_health_training | svc/ehs/src/modules/occupational_disease.rs | 982 | handler has Json<CreateHealthTrainingRequest> parameter but utoipa declares no request_body |
| 237 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-disease/trainings/{id}` | get_health_training | svc/ehs/src/modules/occupational_disease.rs | 1023 | handler has Path<> extractor but utoipa declares no path params |
| 238 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-disease/trainings/{id}` | get_health_training | svc/ehs/src/modules/occupational_disease.rs | 1023 | path template has "{id}" but utoipa params() does not declare it |
| 239 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-disease/trainings/{id}` | delete_health_training | svc/ehs/src/modules/occupational_disease.rs | 1061 | handler has Path<> extractor but utoipa declares no path params |
| 240 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-disease/trainings/{id}` | delete_health_training | svc/ehs/src/modules/occupational_disease.rs | 1061 | path template has "{id}" but utoipa params() does not declare it |
| 241 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-health/exam-plans` | create_exam_plan | svc/ehs/src/modules/occupational_health.rs | 355 | handler has Json<CreateExamPlanRequest> parameter but utoipa declares no request_body |
| 242 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-health/exam-plans/{id}` | get_exam_plan | svc/ehs/src/modules/occupational_health.rs | 395 | handler has Path<> extractor but utoipa declares no path params |
| 243 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-health/exam-plans/{id}` | get_exam_plan | svc/ehs/src/modules/occupational_health.rs | 395 | path template has "{id}" but utoipa params() does not declare it |
| 244 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-health/exam-plans/{id}` | update_exam_plan | svc/ehs/src/modules/occupational_health.rs | 432 | handler has Path<> extractor but utoipa declares no path params |
| 245 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-health/exam-plans/{id}` | update_exam_plan | svc/ehs/src/modules/occupational_health.rs | 432 | path template has "{id}" but utoipa params() does not declare it |
| 246 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-health/exam-plans/{id}` | update_exam_plan | svc/ehs/src/modules/occupational_health.rs | 432 | handler has Json<UpdateExamPlanRequest> parameter but utoipa declares no request_body |
| 247 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-health/exam-plans/{id}` | delete_exam_plan | svc/ehs/src/modules/occupational_health.rs | 472 | handler has Path<> extractor but utoipa declares no path params |
| 248 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-health/exam-plans/{id}` | delete_exam_plan | svc/ehs/src/modules/occupational_health.rs | 472 | path template has "{id}" but utoipa params() does not declare it |
| 249 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-health/exam-records` | create_exam_record | svc/ehs/src/modules/occupational_health.rs | 508 | handler has Json<CreateExamRecordRequest> parameter but utoipa declares no request_body |
| 250 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-health/exam-records/{id}` | get_exam_record | svc/ehs/src/modules/occupational_health.rs | 563 | handler has Path<> extractor but utoipa declares no path params |
| 251 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-health/exam-records/{id}` | get_exam_record | svc/ehs/src/modules/occupational_health.rs | 563 | path template has "{id}" but utoipa params() does not declare it |
| 252 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-health/exam-records/{id}` | update_exam_record | svc/ehs/src/modules/occupational_health.rs | 615 | handler has Path<> extractor but utoipa declares no path params |
| 253 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-health/exam-records/{id}` | update_exam_record | svc/ehs/src/modules/occupational_health.rs | 615 | path template has "{id}" but utoipa params() does not declare it |
| 254 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-health/exam-records/{id}` | update_exam_record | svc/ehs/src/modules/occupational_health.rs | 615 | handler has Json<UpdateExamRecordRequest> parameter but utoipa declares no request_body |
| 255 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-health/exam-records/{id}` | delete_exam_record | svc/ehs/src/modules/occupational_health.rs | 668 | handler has Path<> extractor but utoipa declares no path params |
| 256 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-health/exam-records/{id}` | delete_exam_record | svc/ehs/src/modules/occupational_health.rs | 668 | path template has "{id}" but utoipa params() does not declare it |
| 257 | PATH_PARAM_EXTRA | GET | `/api/ehs/occupational-health/archives/{employee_id}` | get_health_archive | svc/ehs/src/modules/occupational_health.rs | 685 | handler has Path<> extractor but utoipa declares no path params |
| 258 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/occupational-health/archives/{employee_id}` | get_health_archive | svc/ehs/src/modules/occupational_health.rs | 685 | path template has "{employee_id}" but utoipa params() does not declare it |
| 259 | REQUEST_BODY_EXTRA | POST | `/api/ehs/occupational-health/contraindications` | create_contraindication | svc/ehs/src/modules/occupational_health.rs | 737 | handler has Json<CreateContraindicationRequest> parameter but utoipa declares no request_body |
| 260 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-health/contraindications/{id}` | update_contraindication | svc/ehs/src/modules/occupational_health.rs | 776 | handler has Path<> extractor but utoipa declares no path params |
| 261 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-health/contraindications/{id}` | update_contraindication | svc/ehs/src/modules/occupational_health.rs | 776 | path template has "{id}" but utoipa params() does not declare it |
| 262 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-health/contraindications/{id}` | update_contraindication | svc/ehs/src/modules/occupational_health.rs | 776 | handler has Json<UpdateContraindicationRequest> parameter but utoipa declares no request_body |
| 263 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/occupational-health/contraindications/{id}` | delete_contraindication | svc/ehs/src/modules/occupational_health.rs | 818 | handler has Path<> extractor but utoipa declares no path params |
| 264 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/occupational-health/contraindications/{id}` | delete_contraindication | svc/ehs/src/modules/occupational_health.rs | 818 | path template has "{id}" but utoipa params() does not declare it |
| 265 | PATH_PARAM_EXTRA | PUT | `/api/ehs/occupational-health/abnormalities/{id}` | update_abnormality | svc/ehs/src/modules/occupational_health.rs | 854 | handler has Path<> extractor but utoipa declares no path params |
| 266 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/occupational-health/abnormalities/{id}` | update_abnormality | svc/ehs/src/modules/occupational_health.rs | 854 | path template has "{id}" but utoipa params() does not declare it |
| 267 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/occupational-health/abnormalities/{id}` | update_abnormality | svc/ehs/src/modules/occupational_health.rs | 854 | handler has Json<UpdateAbnormalityRequest> parameter but utoipa declares no request_body |
| 268 | REQUEST_BODY_EXTRA | POST | `/api/ehs/hazards` | create_risk | svc/ehs/src/modules/risk.rs | 98 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 269 | PATH_PARAM_EXTRA | GET | `/api/ehs/hazards/{id}` | get_risk | svc/ehs/src/modules/risk.rs | 135 | handler has Path<> extractor but utoipa declares no path params |
| 270 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/hazards/{id}` | get_risk | svc/ehs/src/modules/risk.rs | 135 | path template has "{id}" but utoipa params() does not declare it |
| 271 | PATH_PARAM_EXTRA | PUT | `/api/ehs/hazards/{id}` | update_risk | svc/ehs/src/modules/risk.rs | 169 | handler has Path<> extractor but utoipa declares no path params |
| 272 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/hazards/{id}` | update_risk | svc/ehs/src/modules/risk.rs | 169 | path template has "{id}" but utoipa params() does not declare it |
| 273 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/hazards/{id}` | update_risk | svc/ehs/src/modules/risk.rs | 169 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 274 | PATH_PARAM_EXTRA | POST | `/api/ehs/hazards/{id}/assessments` | assess_risk | svc/ehs/src/modules/risk.rs | 204 | handler has Path<> extractor but utoipa declares no path params |
| 275 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/hazards/{id}/assessments` | assess_risk | svc/ehs/src/modules/risk.rs | 204 | path template has "{id}" but utoipa params() does not declare it |
| 276 | REQUEST_BODY_EXTRA | POST | `/api/ehs/hazards/{id}/assessments` | assess_risk | svc/ehs/src/modules/risk.rs | 204 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 277 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/hazards/{id}` | delete_risk | svc/ehs/src/modules/risk.rs | 239 | handler has Path<> extractor but utoipa declares no path params |
| 278 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/hazards/{id}` | delete_risk | svc/ehs/src/modules/risk.rs | 239 | path template has "{id}" but utoipa params() does not declare it |
| 279 | PATH_PARAM_EXTRA | GET | `/api/ehs/hazards/{id}/controls` | list_control_measures | svc/ehs/src/modules/risk.rs | 256 | handler has Path<> extractor but utoipa declares no path params |
| 280 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/hazards/{id}/controls` | list_control_measures | svc/ehs/src/modules/risk.rs | 256 | path template has "{id}" but utoipa params() does not declare it |
| 281 | PATH_PARAM_EXTRA | POST | `/api/ehs/hazards/{id}/controls` | create_control_measure | svc/ehs/src/modules/risk.rs | 299 | handler has Path<> extractor but utoipa declares no path params |
| 282 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/hazards/{id}/controls` | create_control_measure | svc/ehs/src/modules/risk.rs | 299 | path template has "{id}" but utoipa params() does not declare it |
| 283 | REQUEST_BODY_EXTRA | POST | `/api/ehs/hazards/{id}/controls` | create_control_measure | svc/ehs/src/modules/risk.rs | 299 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 284 | PATH_PARAM_EXTRA | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | update_control_measure | svc/ehs/src/modules/risk.rs | 340 | handler has Path<> extractor but utoipa declares no path params |
| 285 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | update_control_measure | svc/ehs/src/modules/risk.rs | 340 | path template has "{id}" but utoipa params() does not declare it |
| 286 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | update_control_measure | svc/ehs/src/modules/risk.rs | 340 | path template has "{measure_id}" but utoipa params() does not declare it |
| 287 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | update_control_measure | svc/ehs/src/modules/risk.rs | 340 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 288 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/hazards/{id}/controls/{measure_id}` | delete_control_measure | svc/ehs/src/modules/risk.rs | 390 | handler has Path<> extractor but utoipa declares no path params |
| 289 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/hazards/{id}/controls/{measure_id}` | delete_control_measure | svc/ehs/src/modules/risk.rs | 390 | path template has "{id}" but utoipa params() does not declare it |
| 290 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/hazards/{id}/controls/{measure_id}` | delete_control_measure | svc/ehs/src/modules/risk.rs | 390 | path template has "{measure_id}" but utoipa params() does not declare it |
| 291 | REQUEST_BODY_EXTRA | POST | `/api/ehs/checks/plans` | create_plan | svc/ehs/src/modules/safety.rs | 205 | handler has Json<CreateInspectionPlanRequest> parameter but utoipa declares no request_body |
| 292 | PATH_PARAM_EXTRA | GET | `/api/ehs/checks/plans/{id}` | get_plan | svc/ehs/src/modules/safety.rs | 242 | handler has Path<> extractor but utoipa declares no path params |
| 293 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/checks/plans/{id}` | get_plan | svc/ehs/src/modules/safety.rs | 242 | path template has "{id}" but utoipa params() does not declare it |
| 294 | PATH_PARAM_EXTRA | PUT | `/api/ehs/checks/plans/{id}` | update_plan | svc/ehs/src/modules/safety.rs | 277 | handler has Path<> extractor but utoipa declares no path params |
| 295 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/checks/plans/{id}` | update_plan | svc/ehs/src/modules/safety.rs | 277 | path template has "{id}" but utoipa params() does not declare it |
| 296 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/checks/plans/{id}` | update_plan | svc/ehs/src/modules/safety.rs | 277 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 297 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/checks/plans/{id}` | delete_plan | svc/ehs/src/modules/safety.rs | 313 | handler has Path<> extractor but utoipa declares no path params |
| 298 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/checks/plans/{id}` | delete_plan | svc/ehs/src/modules/safety.rs | 313 | path template has "{id}" but utoipa params() does not declare it |
| 299 | PATH_PARAM_EXTRA | GET | `/api/ehs/checks/plans/{plan_id}/items` | list_plan_items | svc/ehs/src/modules/safety.rs | 330 | handler has Path<> extractor but utoipa declares no path params |
| 300 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/checks/plans/{plan_id}/items` | list_plan_items | svc/ehs/src/modules/safety.rs | 330 | path template has "{plan_id}" but utoipa params() does not declare it |
| 301 | PATH_PARAM_EXTRA | POST | `/api/ehs/checks/plans/{plan_id}/items` | create_plan_item | svc/ehs/src/modules/safety.rs | 387 | handler has Path<> extractor but utoipa declares no path params |
| 302 | PATH_PARAM_UNDECLARED | POST | `/api/ehs/checks/plans/{plan_id}/items` | create_plan_item | svc/ehs/src/modules/safety.rs | 387 | path template has "{plan_id}" but utoipa params() does not declare it |
| 303 | REQUEST_BODY_EXTRA | POST | `/api/ehs/checks/plans/{plan_id}/items` | create_plan_item | svc/ehs/src/modules/safety.rs | 387 | handler has Json<CreateInspectionItemRequest> parameter but utoipa declares no request_body |
| 304 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | delete_plan_item | svc/ehs/src/modules/safety.rs | 422 | handler has Path<> extractor but utoipa declares no path params |
| 305 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | delete_plan_item | svc/ehs/src/modules/safety.rs | 422 | path template has "{plan_id}" but utoipa params() does not declare it |
| 306 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | delete_plan_item | svc/ehs/src/modules/safety.rs | 422 | path template has "{item_id}" but utoipa params() does not declare it |
| 307 | REQUEST_BODY_EXTRA | POST | `/api/ehs/checks/records` | create_record | svc/ehs/src/modules/safety.rs | 458 | handler has Json<CreateInspectionRecordRequest> parameter but utoipa declares no request_body |
| 308 | PATH_PARAM_EXTRA | GET | `/api/ehs/checks/records/{id}` | get_record | svc/ehs/src/modules/safety.rs | 507 | handler has Path<> extractor but utoipa declares no path params |
| 309 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/checks/records/{id}` | get_record | svc/ehs/src/modules/safety.rs | 507 | path template has "{id}" but utoipa params() does not declare it |
| 310 | PATH_PARAM_EXTRA | PUT | `/api/ehs/checks/records/{id}` | update_record | svc/ehs/src/modules/safety.rs | 571 | handler has Path<> extractor but utoipa declares no path params |
| 311 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/checks/records/{id}` | update_record | svc/ehs/src/modules/safety.rs | 571 | path template has "{id}" but utoipa params() does not declare it |
| 312 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/checks/records/{id}` | update_record | svc/ehs/src/modules/safety.rs | 571 | handler has Json<UpdateInspectionRecordRequest> parameter but utoipa declares no request_body |
| 313 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/checks/records/{id}` | delete_record | svc/ehs/src/modules/safety.rs | 609 | handler has Path<> extractor but utoipa declares no path params |
| 314 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/checks/records/{id}` | delete_record | svc/ehs/src/modules/safety.rs | 609 | path template has "{id}" but utoipa params() does not declare it |
| 315 | REQUEST_BODY_EXTRA | POST | `/api/ehs/training` | create_training | svc/ehs/src/modules/training.rs | 152 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 316 | PATH_PARAM_EXTRA | GET | `/api/ehs/training/{id}` | get_training | svc/ehs/src/modules/training.rs | 187 | handler has Path<> extractor but utoipa declares no path params |
| 317 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/training/{id}` | get_training | svc/ehs/src/modules/training.rs | 187 | path template has "{id}" but utoipa params() does not declare it |
| 318 | PATH_PARAM_EXTRA | PUT | `/api/ehs/training/{id}` | update_training | svc/ehs/src/modules/training.rs | 219 | handler has Path<> extractor but utoipa declares no path params |
| 319 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/training/{id}` | update_training | svc/ehs/src/modules/training.rs | 219 | path template has "{id}" but utoipa params() does not declare it |
| 320 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/training/{id}` | update_training | svc/ehs/src/modules/training.rs | 219 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 321 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/training/{id}` | delete_training | svc/ehs/src/modules/training.rs | 272 | handler has Path<> extractor but utoipa declares no path params |
| 322 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/training/{id}` | delete_training | svc/ehs/src/modules/training.rs | 272 | path template has "{id}" but utoipa params() does not declare it |
| 323 | REQUEST_BODY_EXTRA | POST | `/api/ehs/training/plans` | create_training_plan | svc/ehs/src/modules/training.rs | 308 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 324 | PATH_PARAM_EXTRA | GET | `/api/ehs/training/plans/{id}` | get_training_plan | svc/ehs/src/modules/training.rs | 356 | handler has Path<> extractor but utoipa declares no path params |
| 325 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/training/plans/{id}` | get_training_plan | svc/ehs/src/modules/training.rs | 356 | path template has "{id}" but utoipa params() does not declare it |
| 326 | PATH_PARAM_EXTRA | PUT | `/api/ehs/training/plans/{id}` | update_training_plan | svc/ehs/src/modules/training.rs | 388 | handler has Path<> extractor but utoipa declares no path params |
| 327 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/training/plans/{id}` | update_training_plan | svc/ehs/src/modules/training.rs | 388 | path template has "{id}" but utoipa params() does not declare it |
| 328 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/training/plans/{id}` | update_training_plan | svc/ehs/src/modules/training.rs | 388 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 329 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/training/plans/{id}` | delete_training_plan | svc/ehs/src/modules/training.rs | 438 | handler has Path<> extractor but utoipa declares no path params |
| 330 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/training/plans/{id}` | delete_training_plan | svc/ehs/src/modules/training.rs | 438 | path template has "{id}" but utoipa params() does not declare it |
| 331 | REQUEST_BODY_EXTRA | POST | `/api/ehs/training/records` | create_training_record | svc/ehs/src/modules/training.rs | 474 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 332 | PATH_PARAM_EXTRA | GET | `/api/ehs/training/records/{id}` | get_training_record | svc/ehs/src/modules/training.rs | 525 | handler has Path<> extractor but utoipa declares no path params |
| 333 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/training/records/{id}` | get_training_record | svc/ehs/src/modules/training.rs | 525 | path template has "{id}" but utoipa params() does not declare it |
| 334 | PATH_PARAM_EXTRA | PUT | `/api/ehs/training/records/{id}` | update_training_record | svc/ehs/src/modules/training.rs | 557 | handler has Path<> extractor but utoipa declares no path params |
| 335 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/training/records/{id}` | update_training_record | svc/ehs/src/modules/training.rs | 557 | path template has "{id}" but utoipa params() does not declare it |
| 336 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/training/records/{id}` | update_training_record | svc/ehs/src/modules/training.rs | 557 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 337 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/training/records/{id}` | delete_training_record | svc/ehs/src/modules/training.rs | 610 | handler has Path<> extractor but utoipa declares no path params |
| 338 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/training/records/{id}` | delete_training_record | svc/ehs/src/modules/training.rs | 610 | path template has "{id}" but utoipa params() does not declare it |
| 339 | REQUEST_BODY_EXTRA | POST | `/api/ehs/training/certificates` | create_certificate | svc/ehs/src/modules/training.rs | 646 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 340 | PATH_PARAM_EXTRA | GET | `/api/ehs/training/certificates/{id}` | get_certificate | svc/ehs/src/modules/training.rs | 691 | handler has Path<> extractor but utoipa declares no path params |
| 341 | PATH_PARAM_UNDECLARED | GET | `/api/ehs/training/certificates/{id}` | get_certificate | svc/ehs/src/modules/training.rs | 691 | path template has "{id}" but utoipa params() does not declare it |
| 342 | PATH_PARAM_EXTRA | PUT | `/api/ehs/training/certificates/{id}` | update_certificate | svc/ehs/src/modules/training.rs | 722 | handler has Path<> extractor but utoipa declares no path params |
| 343 | PATH_PARAM_UNDECLARED | PUT | `/api/ehs/training/certificates/{id}` | update_certificate | svc/ehs/src/modules/training.rs | 722 | path template has "{id}" but utoipa params() does not declare it |
| 344 | REQUEST_BODY_EXTRA | PUT | `/api/ehs/training/certificates/{id}` | update_certificate | svc/ehs/src/modules/training.rs | 722 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 345 | PATH_PARAM_EXTRA | DELETE | `/api/ehs/training/certificates/{id}` | delete_certificate | svc/ehs/src/modules/training.rs | 769 | handler has Path<> extractor but utoipa declares no path params |
| 346 | PATH_PARAM_UNDECLARED | DELETE | `/api/ehs/training/certificates/{id}` | delete_certificate | svc/ehs/src/modules/training.rs | 769 | path template has "{id}" but utoipa params() does not declare it |
| 347 | PATH_PARAM_EXTRA | GET | `/erp/customers/{id}` | get_customer | svc/erp/src/modules/customer.rs | 125 | handler has Path<> extractor but utoipa declares no path params |
| 348 | PATH_PARAM_UNDECLARED | GET | `/erp/customers/{id}` | get_customer | svc/erp/src/modules/customer.rs | 125 | path template has "{id}" but utoipa params() does not declare it |
| 349 | REQUEST_BODY_EXTRA | POST | `/erp/customers` | create_customer | svc/erp/src/modules/customer.rs | 159 | handler has Json<CreateCustomerRequest> parameter but utoipa declares no request_body |
| 350 | PATH_PARAM_EXTRA | PUT | `/erp/customers/{id}` | update_customer | svc/erp/src/modules/customer.rs | 207 | handler has Path<> extractor but utoipa declares no path params |
| 351 | PATH_PARAM_UNDECLARED | PUT | `/erp/customers/{id}` | update_customer | svc/erp/src/modules/customer.rs | 207 | path template has "{id}" but utoipa params() does not declare it |
| 352 | REQUEST_BODY_EXTRA | PUT | `/erp/customers/{id}` | update_customer | svc/erp/src/modules/customer.rs | 207 | handler has Json<UpdateCustomerRequest> parameter but utoipa declares no request_body |
| 353 | PATH_PARAM_EXTRA | DELETE | `/erp/customers/{id}` | delete_customer | svc/erp/src/modules/customer.rs | 256 | handler has Path<> extractor but utoipa declares no path params |
| 354 | PATH_PARAM_UNDECLARED | DELETE | `/erp/customers/{id}` | delete_customer | svc/erp/src/modules/customer.rs | 256 | path template has "{id}" but utoipa params() does not declare it |
| 355 | PATH_PARAM_EXTRA | GET | `/erp/inventory/{id}` | get_inventory | svc/erp/src/modules/inventory.rs | 108 | handler has Path<> extractor but utoipa declares no path params |
| 356 | PATH_PARAM_UNDECLARED | GET | `/erp/inventory/{id}` | get_inventory | svc/erp/src/modules/inventory.rs | 108 | path template has "{id}" but utoipa params() does not declare it |
| 357 | REQUEST_BODY_EXTRA | POST | `/erp/inventory` | create_inventory | svc/erp/src/modules/inventory.rs | 142 | handler has Json<CreateInventoryRequest> parameter but utoipa declares no request_body |
| 358 | REQUEST_BODY_EXTRA | POST | `/erp/meeting-rooms` | create_room | svc/erp/src/modules/meeting_room.rs | 109 | handler has Json<CreateMeetingRoomRequest> parameter but utoipa declares no request_body |
| 359 | PATH_PARAM_EXTRA | GET | `/erp/meeting-rooms/{id}` | get_room | svc/erp/src/modules/meeting_room.rs | 190 | handler has Path<> extractor but utoipa declares no path params |
| 360 | PATH_PARAM_UNDECLARED | GET | `/erp/meeting-rooms/{id}` | get_room | svc/erp/src/modules/meeting_room.rs | 190 | path template has "{id}" but utoipa params() does not declare it |
| 361 | REQUEST_BODY_EXTRA | POST | `/erp/meeting-rooms/bookings` | create_booking | svc/erp/src/modules/meeting_room.rs | 433 | handler has Json<CreateMeetingBookingRequest> parameter but utoipa declares no request_body |
| 362 | PATH_PARAM_EXTRA | GET | `/erp/purchase-orders/{id}` | get_purchase_order | svc/erp/src/modules/purchase_order.rs | 115 | handler has Path<> extractor but utoipa declares no path params |
| 363 | PATH_PARAM_UNDECLARED | GET | `/erp/purchase-orders/{id}` | get_purchase_order | svc/erp/src/modules/purchase_order.rs | 115 | path template has "{id}" but utoipa params() does not declare it |
| 364 | REQUEST_BODY_EXTRA | POST | `/erp/purchase-orders` | create_purchase_order | svc/erp/src/modules/purchase_order.rs | 149 | handler has Json<CreatePurchaseOrderRequest> parameter but utoipa declares no request_body |
| 365 | PATH_PARAM_EXTRA | POST | `/erp/purchase-orders/{id}/approve` | approve_purchase_order | svc/erp/src/modules/purchase_order.rs | 284 | handler has Path<> extractor but utoipa declares no path params |
| 366 | PATH_PARAM_UNDECLARED | POST | `/erp/purchase-orders/{id}/approve` | approve_purchase_order | svc/erp/src/modules/purchase_order.rs | 284 | path template has "{id}" but utoipa params() does not declare it |
| 367 | PATH_PARAM_EXTRA | GET | `/erp/sales-orders/{id}` | get_sales_order | svc/erp/src/modules/sales_order.rs | 111 | handler has Path<> extractor but utoipa declares no path params |
| 368 | PATH_PARAM_UNDECLARED | GET | `/erp/sales-orders/{id}` | get_sales_order | svc/erp/src/modules/sales_order.rs | 111 | path template has "{id}" but utoipa params() does not declare it |
| 369 | REQUEST_BODY_EXTRA | POST | `/erp/sales-orders` | create_sales_order | svc/erp/src/modules/sales_order.rs | 145 | handler has Json<CreateSalesOrderRequest> parameter but utoipa declares no request_body |
| 370 | PATH_PARAM_EXTRA | GET | `/erp/suppliers/{id}` | get_supplier | svc/erp/src/modules/supplier.rs | 132 | handler has Path<> extractor but utoipa declares no path params |
| 371 | PATH_PARAM_UNDECLARED | GET | `/erp/suppliers/{id}` | get_supplier | svc/erp/src/modules/supplier.rs | 132 | path template has "{id}" but utoipa params() does not declare it |
| 372 | REQUEST_BODY_EXTRA | POST | `/erp/suppliers` | create_supplier | svc/erp/src/modules/supplier.rs | 166 | handler has Json<CreateSupplierRequest> parameter but utoipa declares no request_body |
| 373 | PATH_PARAM_EXTRA | PUT | `/erp/suppliers/{id}` | update_supplier | svc/erp/src/modules/supplier.rs | 213 | handler has Path<> extractor but utoipa declares no path params |
| 374 | PATH_PARAM_UNDECLARED | PUT | `/erp/suppliers/{id}` | update_supplier | svc/erp/src/modules/supplier.rs | 213 | path template has "{id}" but utoipa params() does not declare it |
| 375 | REQUEST_BODY_EXTRA | PUT | `/erp/suppliers/{id}` | update_supplier | svc/erp/src/modules/supplier.rs | 213 | handler has Json<UpdateSupplierRequest> parameter but utoipa declares no request_body |
| 376 | PATH_PARAM_EXTRA | DELETE | `/erp/suppliers/{id}` | delete_supplier | svc/erp/src/modules/supplier.rs | 261 | handler has Path<> extractor but utoipa declares no path params |
| 377 | PATH_PARAM_UNDECLARED | DELETE | `/erp/suppliers/{id}` | delete_supplier | svc/erp/src/modules/supplier.rs | 261 | path template has "{id}" but utoipa params() does not declare it |
| 378 | REQUEST_BODY_EXTRA | POST | `/api/feedback/feedbacks` | create_feedback | svc/feedback/src/handlers.rs | 61 | handler has Json<CreateFeedbackRequest> parameter but utoipa declares no request_body |
| 379 | PATH_PARAM_EXTRA | GET | `/api/feedback/feedbacks/{id}` | get_feedback | svc/feedback/src/handlers.rs | 97 | handler has Path<> extractor but utoipa declares no path params |
| 380 | PATH_PARAM_UNDECLARED | GET | `/api/feedback/feedbacks/{id}` | get_feedback | svc/feedback/src/handlers.rs | 97 | path template has "{id}" but utoipa params() does not declare it |
| 381 | PATH_PARAM_EXTRA | PUT | `/api/feedback/feedbacks/{id}` | response_feedback | svc/feedback/src/handlers.rs | 213 | handler has Path<> extractor but utoipa declares no path params |
| 382 | PATH_PARAM_UNDECLARED | PUT | `/api/feedback/feedbacks/{id}` | response_feedback | svc/feedback/src/handlers.rs | 213 | path template has "{id}" but utoipa params() does not declare it |
| 383 | REQUEST_BODY_EXTRA | PUT | `/api/feedback/feedbacks/{id}` | response_feedback | svc/feedback/src/handlers.rs | 213 | handler has Json<ResponseFeedbackRequest> parameter but utoipa declares no request_body |
| 384 | PATH_PARAM_EXTRA | DELETE | `/api/feedback/feedbacks/{id}` | delete_feedback | svc/feedback/src/handlers.rs | 250 | handler has Path<> extractor but utoipa declares no path params |
| 385 | PATH_PARAM_UNDECLARED | DELETE | `/api/feedback/feedbacks/{id}` | delete_feedback | svc/feedback/src/handlers.rs | 250 | path template has "{id}" but utoipa params() does not declare it |
| 386 | PATH_PARAM_EXTRA | POST | `/voucher-templates/{template_id}/copy` | copy_template | svc/finance/src/modules/voucher_template.rs | 72 | handler has Path<> extractor but utoipa declares no path params |
| 387 | PATH_PARAM_UNDECLARED | POST | `/voucher-templates/{template_id}/copy` | copy_template | svc/finance/src/modules/voucher_template.rs | 72 | path template has "{template_id}" but utoipa params() does not declare it |
| 388 | PATH_PARAM_EXTRA | PUT | `/voucher-templates/{template_id}/toggle` | toggle_template | svc/finance/src/modules/voucher_template.rs | 131 | handler has Path<> extractor but utoipa declares no path params |
| 389 | PATH_PARAM_UNDECLARED | PUT | `/voucher-templates/{template_id}/toggle` | toggle_template | svc/finance/src/modules/voucher_template.rs | 131 | path template has "{template_id}" but utoipa params() does not declare it |
| 390 | PATH_PARAM_EXTRA | GET | `/voucher-templates/{template_id}/usage-stats` | get_usage_stats | svc/finance/src/modules/voucher_template.rs | 251 | handler has Path<> extractor but utoipa declares no path params |
| 391 | PATH_PARAM_UNDECLARED | GET | `/voucher-templates/{template_id}/usage-stats` | get_usage_stats | svc/finance/src/modules/voucher_template.rs | 251 | path template has "{template_id}" but utoipa params() does not declare it |
| 392 | PATH_PARAM_EXTRA | GET | `/voucher-templates/{template_id}/export` | export_template | svc/finance/src/modules/voucher_template.rs | 287 | handler has Path<> extractor but utoipa declares no path params |
| 393 | PATH_PARAM_UNDECLARED | GET | `/voucher-templates/{template_id}/export` | export_template | svc/finance/src/modules/voucher_template.rs | 287 | path template has "{template_id}" but utoipa params() does not declare it |
| 394 | PATH_PARAM_EXTRA | GET | `/voucher-templates/{template_id}/entries` | list_entries | svc/finance/src/modules/voucher_template_entries.rs | 55 | handler has Path<> extractor but utoipa declares no path params |
| 395 | PATH_PARAM_UNDECLARED | GET | `/voucher-templates/{template_id}/entries` | list_entries | svc/finance/src/modules/voucher_template_entries.rs | 55 | path template has "{template_id}" but utoipa params() does not declare it |
| 396 | PATH_PARAM_EXTRA | GET | `/voucher-templates/{template_id}/entries/{entry_id}` | get_entry | svc/finance/src/modules/voucher_template_entries.rs | 89 | handler has Path<> extractor but utoipa declares no path params |
| 397 | PATH_PARAM_UNDECLARED | GET | `/voucher-templates/{template_id}/entries/{entry_id}` | get_entry | svc/finance/src/modules/voucher_template_entries.rs | 89 | path template has "{template_id}" but utoipa params() does not declare it |
| 398 | PATH_PARAM_UNDECLARED | GET | `/voucher-templates/{template_id}/entries/{entry_id}` | get_entry | svc/finance/src/modules/voucher_template_entries.rs | 89 | path template has "{entry_id}" but utoipa params() does not declare it |
| 399 | PATH_PARAM_EXTRA | POST | `/voucher-templates/{template_id}/entries` | create_entry | svc/finance/src/modules/voucher_template_entries.rs | 121 | handler has Path<> extractor but utoipa declares no path params |
| 400 | PATH_PARAM_UNDECLARED | POST | `/voucher-templates/{template_id}/entries` | create_entry | svc/finance/src/modules/voucher_template_entries.rs | 121 | path template has "{template_id}" but utoipa params() does not declare it |
| 401 | PATH_PARAM_EXTRA | PUT | `/voucher-templates/{template_id}/entries/{entry_id}` | update_entry | svc/finance/src/modules/voucher_template_entries.rs | 188 | handler has Path<> extractor but utoipa declares no path params |
| 402 | PATH_PARAM_UNDECLARED | PUT | `/voucher-templates/{template_id}/entries/{entry_id}` | update_entry | svc/finance/src/modules/voucher_template_entries.rs | 188 | path template has "{template_id}" but utoipa params() does not declare it |
| 403 | PATH_PARAM_UNDECLARED | PUT | `/voucher-templates/{template_id}/entries/{entry_id}` | update_entry | svc/finance/src/modules/voucher_template_entries.rs | 188 | path template has "{entry_id}" but utoipa params() does not declare it |
| 404 | PATH_PARAM_EXTRA | DELETE | `/voucher-templates/{template_id}/entries/{entry_id}` | delete_entry | svc/finance/src/modules/voucher_template_entries.rs | 254 | handler has Path<> extractor but utoipa declares no path params |
| 405 | PATH_PARAM_UNDECLARED | DELETE | `/voucher-templates/{template_id}/entries/{entry_id}` | delete_entry | svc/finance/src/modules/voucher_template_entries.rs | 254 | path template has "{template_id}" but utoipa params() does not declare it |
| 406 | PATH_PARAM_UNDECLARED | DELETE | `/voucher-templates/{template_id}/entries/{entry_id}` | delete_entry | svc/finance/src/modules/voucher_template_entries.rs | 254 | path template has "{entry_id}" but utoipa params() does not declare it |
| 407 | PATH_PARAM_EXTRA | PUT | `/voucher-templates/{template_id}/entries/reorder` | reorder_entries | svc/finance/src/modules/voucher_template_entries.rs | 293 | handler has Path<> extractor but utoipa declares no path params |
| 408 | PATH_PARAM_UNDECLARED | PUT | `/voucher-templates/{template_id}/entries/reorder` | reorder_entries | svc/finance/src/modules/voucher_template_entries.rs | 293 | path template has "{template_id}" but utoipa params() does not declare it |
| 409 | PATH_PARAM_EXTRA | GET | `/employees/{id}` | get_employee | svc/hrm/src/modules/employee.rs | 127 | handler has Path<> extractor but utoipa declares no path params |
| 410 | PATH_PARAM_UNDECLARED | GET | `/employees/{id}` | get_employee | svc/hrm/src/modules/employee.rs | 127 | path template has "{id}" but utoipa params() does not declare it |
| 411 | PATH_PARAM_EXTRA | GET | `/employees/{id}/details` | get_employee_details | svc/hrm/src/modules/employee.rs | 187 | handler has Path<> extractor but utoipa declares no path params |
| 412 | PATH_PARAM_UNDECLARED | GET | `/employees/{id}/details` | get_employee_details | svc/hrm/src/modules/employee.rs | 187 | path template has "{id}" but utoipa params() does not declare it |
| 413 | REQUEST_BODY_EXTRA | POST | `/employees` | create_employee | svc/hrm/src/modules/employee.rs | 262 | handler has Json<CreateEmployeeRequest> parameter but utoipa declares no request_body |
| 414 | PATH_PARAM_EXTRA | PUT | `/employees/{id}` | update_employee | svc/hrm/src/modules/employee.rs | 394 | handler has Path<> extractor but utoipa declares no path params |
| 415 | PATH_PARAM_UNDECLARED | PUT | `/employees/{id}` | update_employee | svc/hrm/src/modules/employee.rs | 394 | path template has "{id}" but utoipa params() does not declare it |
| 416 | REQUEST_BODY_EXTRA | PUT | `/employees/{id}` | update_employee | svc/hrm/src/modules/employee.rs | 394 | handler has Json<UpdateEmployeeRequest> parameter but utoipa declares no request_body |
| 417 | PATH_PARAM_EXTRA | DELETE | `/employees/{id}` | delete_employee | svc/hrm/src/modules/employee.rs | 489 | handler has Path<> extractor but utoipa declares no path params |
| 418 | PATH_PARAM_UNDECLARED | DELETE | `/employees/{id}` | delete_employee | svc/hrm/src/modules/employee.rs | 489 | path template has "{id}" but utoipa params() does not declare it |
| 419 | REQUEST_BODY_EXTRA | POST | `/employees/export` | export_employees | svc/hrm/src/modules/employee.rs | 564 | handler has Json<ExportRequest> parameter but utoipa declares no request_body |
| 420 | PATH_PARAM_EXTRA | GET | `/api/integration/rules/{id}` | get_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 42 | handler has Path<> extractor but utoipa declares no path params |
| 421 | PATH_PARAM_UNDECLARED | GET | `/api/integration/rules/{id}` | get_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 42 | path template has "{id}" but utoipa params() does not declare it |
| 422 | REQUEST_BODY_EXTRA | POST | `/api/integration/rules` | create_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 73 | handler has Json<CreateConversionRuleRequest> parameter but utoipa declares no request_body |
| 423 | PATH_PARAM_EXTRA | PUT | `/api/integration/rules/{id}` | update_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 128 | handler has Path<> extractor but utoipa declares no path params |
| 424 | PATH_PARAM_UNDECLARED | PUT | `/api/integration/rules/{id}` | update_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 128 | path template has "{id}" but utoipa params() does not declare it |
| 425 | REQUEST_BODY_EXTRA | PUT | `/api/integration/rules/{id}` | update_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 128 | handler has Json<UpdateConversionRuleRequest> parameter but utoipa declares no request_body |
| 426 | PATH_PARAM_EXTRA | DELETE | `/api/integration/rules/{id}` | delete_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 201 | handler has Path<> extractor but utoipa declares no path params |
| 427 | PATH_PARAM_UNDECLARED | DELETE | `/api/integration/rules/{id}` | delete_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 201 | path template has "{id}" but utoipa params() does not declare it |
| 428 | PATH_PARAM_EXTRA | GET | `/api/integration/rules/{id}/executions` | get_rule_executions_api | svc/integration/src/handlers/conversion_rules.rs | 238 | handler has Path<> extractor but utoipa declares no path params |
| 429 | PATH_PARAM_UNDECLARED | GET | `/api/integration/rules/{id}/executions` | get_rule_executions_api | svc/integration/src/handlers/conversion_rules.rs | 238 | path template has "{id}" but utoipa params() does not declare it |
| 430 | PATH_PARAM_EXTRA | POST | `/api/integration/rules/{id}/execute` | execute_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 265 | handler has Path<> extractor but utoipa declares no path params |
| 431 | PATH_PARAM_UNDECLARED | POST | `/api/integration/rules/{id}/execute` | execute_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 265 | path template has "{id}" but utoipa params() does not declare it |
| 432 | REQUEST_BODY_EXTRA | POST | `/api/integration/rules/{id}/execute` | execute_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 265 | handler has Json<ExecuteConversionRequest> parameter but utoipa declares no request_body |
| 433 | PATH_PARAM_EXTRA | POST | `/api/integration/rules/{id}/enable` | enable_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 346 | handler has Path<> extractor but utoipa declares no path params |
| 434 | PATH_PARAM_UNDECLARED | POST | `/api/integration/rules/{id}/enable` | enable_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 346 | path template has "{id}" but utoipa params() does not declare it |
| 435 | PATH_PARAM_EXTRA | POST | `/api/integration/rules/{id}/disable` | disable_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 375 | handler has Path<> extractor but utoipa declares no path params |
| 436 | PATH_PARAM_UNDECLARED | POST | `/api/integration/rules/{id}/disable` | disable_conversion_rule_api | svc/integration/src/handlers/conversion_rules.rs | 375 | path template has "{id}" but utoipa params() does not declare it |
| 437 | REQUEST_BODY_EXTRA | POST | `/api/integration/events` | create_event | svc/integration/src/handlers/events.rs | 141 | handler has Json<CreateIntegrationEventRequest> parameter but utoipa declares no request_body |
| 438 | REQUEST_BODY_EXTRA | POST | `/api/integration/lims-qms` | create_lims_qms_sync | svc/integration/src/handlers/lims_qms.rs | 44 | handler has Json<CreateLimsQmsSyncRequest> parameter but utoipa declares no request_body |
| 439 | PATH_PARAM_EXTRA | GET | `/api/integration/lims-qms/{id}` | get_lims_qms_sync | svc/integration/src/handlers/lims_qms.rs | 104 | handler has Path<> extractor but utoipa declares no path params |
| 440 | PATH_PARAM_UNDECLARED | GET | `/api/integration/lims-qms/{id}` | get_lims_qms_sync | svc/integration/src/handlers/lims_qms.rs | 104 | path template has "{id}" but utoipa params() does not declare it |
| 441 | PATH_PARAM_EXTRA | POST | `/api/integration/lims-qms/{id}/sync` | sync_lims_qms | svc/integration/src/handlers/lims_qms.rs | 138 | handler has Path<> extractor but utoipa declares no path params |
| 442 | PATH_PARAM_UNDECLARED | POST | `/api/integration/lims-qms/{id}/sync` | sync_lims_qms | svc/integration/src/handlers/lims_qms.rs | 138 | path template has "{id}" but utoipa params() does not declare it |
| 443 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-erp` | create_mes_erp_sync | svc/integration/src/handlers/mes_erp.rs | 56 | handler has Json<CreateMesErpSyncRequest> parameter but utoipa declares no request_body |
| 444 | PATH_PARAM_EXTRA | GET | `/api/integration/mes-erp/{id}` | get_mes_erp_sync | svc/integration/src/handlers/mes_erp.rs | 115 | handler has Path<> extractor but utoipa declares no path params |
| 445 | PATH_PARAM_UNDECLARED | GET | `/api/integration/mes-erp/{id}` | get_mes_erp_sync | svc/integration/src/handlers/mes_erp.rs | 115 | path template has "{id}" but utoipa params() does not declare it |
| 446 | PATH_PARAM_EXTRA | POST | `/api/integration/mes-erp/{id}/sync` | sync_mes_erp | svc/integration/src/handlers/mes_erp.rs | 148 | handler has Path<> extractor but utoipa declares no path params |
| 447 | PATH_PARAM_UNDECLARED | POST | `/api/integration/mes-erp/{id}/sync` | sync_mes_erp | svc/integration/src/handlers/mes_erp.rs | 148 | path template has "{id}" but utoipa params() does not declare it |
| 448 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-erp/sync/erp-to-mes` | sync_erp_order_to_mes | svc/integration/src/handlers/mes_erp.rs | 196 | handler has Json<SyncErpToMesRequest> parameter but utoipa declares no request_body |
| 449 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-erp/sync/mes-to-erp` | sync_mes_progress_to_erp | svc/integration/src/handlers/mes_erp.rs | 233 | handler has Json<SyncMesToErpRequest> parameter but utoipa declares no request_body |
| 450 | PATH_PARAM_EXTRA | POST | `/api/integration/mes-erp/{id}/retry` | retry_mes_erp_sync | svc/integration/src/handlers/mes_erp.rs | 273 | handler has Path<> extractor but utoipa declares no path params |
| 451 | PATH_PARAM_UNDECLARED | POST | `/api/integration/mes-erp/{id}/retry` | retry_mes_erp_sync | svc/integration/src/handlers/mes_erp.rs | 273 | path template has "{id}" but utoipa params() does not declare it |
| 452 | PATH_PARAM_EXTRA | GET | `/api/integration/mes-erp/{id}/logs` | get_mes_erp_sync_logs | svc/integration/src/handlers/mes_erp.rs | 297 | handler has Path<> extractor but utoipa declares no path params |
| 453 | PATH_PARAM_UNDECLARED | GET | `/api/integration/mes-erp/{id}/logs` | get_mes_erp_sync_logs | svc/integration/src/handlers/mes_erp.rs | 297 | path template has "{id}" but utoipa params() does not declare it |
| 454 | PATH_PARAM_EXTRA | GET | `/api/integration/mes-qms/{id}` | get_mes_qms_sync_api | svc/integration/src/handlers/mes_qms.rs | 57 | handler has Path<> extractor but utoipa declares no path params |
| 455 | PATH_PARAM_UNDECLARED | GET | `/api/integration/mes-qms/{id}` | get_mes_qms_sync_api | svc/integration/src/handlers/mes_qms.rs | 57 | path template has "{id}" but utoipa params() does not declare it |
| 456 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-qms/trigger-inspection` | trigger_qms_inspection_api | svc/integration/src/handlers/mes_qms.rs | 108 | handler has Json<mes_qms_integration::TriggerInspectionRequest> parameter but utoipa declares no request_body |
| 457 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-qms/sync-result` | sync_quality_result_api | svc/integration/src/handlers/mes_qms.rs | 145 | handler has Json<mes_qms_integration::SyncQualityResultRequest> parameter but utoipa declares no request_body |
| 458 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-qms/sync-trace` | sync_trace_chain_api | svc/integration/src/handlers/mes_qms.rs | 182 | handler has Json<mes_qms_integration::TraceChainSyncRequest> parameter but utoipa declares no request_body |
| 459 | REQUEST_BODY_EXTRA | POST | `/api/integration/mes-qms/defect-handling` | defect_handling_api | svc/integration/src/handlers/mes_qms.rs | 219 | handler has Json<mes_qms_integration::DefectHandlingRequest> parameter but utoipa declares no request_body |
| 460 | PATH_PARAM_EXTRA | POST | `/api/integration/mes-qms/{id}/retry` | retry_mes_qms_sync_api | svc/integration/src/handlers/mes_qms.rs | 256 | handler has Path<> extractor but utoipa declares no path params |
| 461 | PATH_PARAM_UNDECLARED | POST | `/api/integration/mes-qms/{id}/retry` | retry_mes_qms_sync_api | svc/integration/src/handlers/mes_qms.rs | 256 | path template has "{id}" but utoipa params() does not declare it |
| 462 | REQUEST_BODY_EXTRA | POST | `/api/integration/sync/tasks` | create_task | svc/integration/src/handlers/sync.rs | 113 | handler has Json<CreateSyncTaskRequest> parameter but utoipa declares no request_body |
| 463 | PATH_PARAM_EXTRA | GET | `/api/integration/sync/tasks/{task_id}` | get_task | svc/integration/src/handlers/sync.rs | 161 | handler has Path<> extractor but utoipa declares no path params |
| 464 | PATH_PARAM_UNDECLARED | GET | `/api/integration/sync/tasks/{task_id}` | get_task | svc/integration/src/handlers/sync.rs | 161 | path template has "{task_id}" but utoipa params() does not declare it |
| 465 | PATH_PARAM_EXTRA | POST | `/api/integration/sync/tasks/{task_id}/status` | update_status | svc/integration/src/handlers/sync.rs | 197 | handler has Path<> extractor but utoipa declares no path params |
| 466 | PATH_PARAM_UNDECLARED | POST | `/api/integration/sync/tasks/{task_id}/status` | update_status | svc/integration/src/handlers/sync.rs | 197 | path template has "{task_id}" but utoipa params() does not declare it |
| 467 | REQUEST_BODY_EXTRA | POST | `/api/integration/sync/tasks/{task_id}/status` | update_status | svc/integration/src/handlers/sync.rs | 197 | handler has Json<UpdateStatusRequest> parameter but utoipa declares no request_body |
| 468 | REQUEST_BODY_EXTRA | POST | `/api/integration/sync/retry-failed` | retry_failed | svc/integration/src/handlers/sync.rs | 327 | handler has Json<RetryFailedRequest> parameter but utoipa declares no request_body |
| 469 | REQUEST_BODY_EXTRA | POST | `/api/integration/sync/trigger/scm-to-wms` | trigger_scm_wms | svc/integration/src/handlers/sync.rs | 402 | handler has Json<TriggerSyncRequest> parameter but utoipa declares no request_body |
| 470 | REQUEST_BODY_EXTRA | POST | `/api/integration/sync/trigger/wms-to-crm` | trigger_wms_crm | svc/integration/src/handlers/sync.rs | 446 | handler has Json<TriggerSyncRequest> parameter but utoipa declares no request_body |
| 471 | REQUEST_BODY_EXTRA | POST | `/api/integration/sync/trigger/srm-to-scm` | trigger_srm_scm | svc/integration/src/handlers/sync.rs | 490 | handler has Json<TriggerSyncRequest> parameter but utoipa declares no request_body |
| 472 | REQUEST_BODY_EXTRA | POST | `/api/integration/wms-scm` | create_wms_scm_sync | svc/integration/src/handlers/wms_scm.rs | 43 | handler has Json<CreateWmsScmSyncRequest> parameter but utoipa declares no request_body |
| 473 | PATH_PARAM_EXTRA | GET | `/api/integration/wms-scm/{id}` | get_wms_scm_sync | svc/integration/src/handlers/wms_scm.rs | 102 | handler has Path<> extractor but utoipa declares no path params |
| 474 | PATH_PARAM_UNDECLARED | GET | `/api/integration/wms-scm/{id}` | get_wms_scm_sync | svc/integration/src/handlers/wms_scm.rs | 102 | path template has "{id}" but utoipa params() does not declare it |
| 475 | PATH_PARAM_EXTRA | POST | `/api/integration/wms-scm/{id}/sync` | sync_wms_scm | svc/integration/src/handlers/wms_scm.rs | 135 | handler has Path<> extractor but utoipa declares no path params |
| 476 | PATH_PARAM_UNDECLARED | POST | `/api/integration/wms-scm/{id}/sync` | sync_wms_scm | svc/integration/src/handlers/wms_scm.rs | 135 | path template has "{id}" but utoipa params() does not declare it |
| 477 | REQUEST_BODY_EXTRA | POST | `/api/monitor/thresholds` | create_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 350 | handler has Json<ThresholdRequest> parameter but utoipa declares no request_body |
| 478 | PATH_PARAM_EXTRA | GET | `/api/monitor/thresholds/{id}` | get_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 381 | handler has Path<> extractor but utoipa declares no path params |
| 479 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/thresholds/{id}` | get_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 381 | path template has "{id}" but utoipa params() does not declare it |
| 480 | PATH_PARAM_EXTRA | PUT | `/api/monitor/thresholds/{id}` | update_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 412 | handler has Path<> extractor but utoipa declares no path params |
| 481 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/thresholds/{id}` | update_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 412 | path template has "{id}" but utoipa params() does not declare it |
| 482 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/thresholds/{id}` | update_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 412 | handler has Json<ThresholdRequest> parameter but utoipa declares no request_body |
| 483 | PATH_PARAM_EXTRA | DELETE | `/api/monitor/thresholds/{id}` | delete_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 444 | handler has Path<> extractor but utoipa declares no path params |
| 484 | PATH_PARAM_UNDECLARED | DELETE | `/api/monitor/thresholds/{id}` | delete_threshold | svc/monitor/src/modules/monitor/alert_evaluator.rs | 444 | path template has "{id}" but utoipa params() does not declare it |
| 485 | PATH_PARAM_EXTRA | GET | `/api/monitor/alerts/{id}` | get_alert | svc/monitor/src/modules/monitor/alerts.rs | 453 | handler has Path<> extractor but utoipa declares no path params |
| 486 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/alerts/{id}` | get_alert | svc/monitor/src/modules/monitor/alerts.rs | 453 | path template has "{id}" but utoipa params() does not declare it |
| 487 | PATH_PARAM_EXTRA | POST | `/api/monitor/alerts/{id}` | update_alert | svc/monitor/src/modules/monitor/alerts.rs | 483 | handler has Path<> extractor but utoipa declares no path params |
| 488 | PATH_PARAM_UNDECLARED | POST | `/api/monitor/alerts/{id}` | update_alert | svc/monitor/src/modules/monitor/alerts.rs | 483 | path template has "{id}" but utoipa params() does not declare it |
| 489 | REQUEST_BODY_EXTRA | POST | `/api/monitor/alerts/{id}` | update_alert | svc/monitor/src/modules/monitor/alerts.rs | 483 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 490 | REQUEST_BODY_EXTRA | POST | `/api/monitor/alerts/acknowledge` | acknowledge_alerts | svc/monitor/src/modules/monitor/alerts.rs | 576 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 491 | REQUEST_BODY_EXTRA | POST | `/api/monitor/alerts/resolve` | resolve_alerts | svc/monitor/src/modules/monitor/alerts.rs | 609 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 492 | REQUEST_BODY_EXTRA | POST | `/api/monitor/rules` | create_rule | svc/monitor/src/modules/monitor/alerts.rs | 734 | handler has Json<AlertRuleRequest> parameter but utoipa declares no request_body |
| 493 | PATH_PARAM_EXTRA | GET | `/api/monitor/rules/{id}` | get_rule | svc/monitor/src/modules/monitor/alerts.rs | 765 | handler has Path<> extractor but utoipa declares no path params |
| 494 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/rules/{id}` | get_rule | svc/monitor/src/modules/monitor/alerts.rs | 765 | path template has "{id}" but utoipa params() does not declare it |
| 495 | PATH_PARAM_EXTRA | PUT | `/api/monitor/rules/{id}` | update_rule | svc/monitor/src/modules/monitor/alerts.rs | 805 | handler has Path<> extractor but utoipa declares no path params |
| 496 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/rules/{id}` | update_rule | svc/monitor/src/modules/monitor/alerts.rs | 805 | path template has "{id}" but utoipa params() does not declare it |
| 497 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/rules/{id}` | update_rule | svc/monitor/src/modules/monitor/alerts.rs | 805 | handler has Json<AlertRuleRequest> parameter but utoipa declares no request_body |
| 498 | PATH_PARAM_EXTRA | DELETE | `/api/monitor/rules/{id}` | delete_rule | svc/monitor/src/modules/monitor/alerts.rs | 837 | handler has Path<> extractor but utoipa declares no path params |
| 499 | PATH_PARAM_UNDECLARED | DELETE | `/api/monitor/rules/{id}` | delete_rule | svc/monitor/src/modules/monitor/alerts.rs | 837 | path template has "{id}" but utoipa params() does not declare it |
| 500 | PATH_PARAM_EXTRA | POST | `/api/monitor/rules/{id}/enable` | enable_rule | svc/monitor/src/modules/monitor/alerts.rs | 856 | handler has Path<> extractor but utoipa declares no path params |
| 501 | PATH_PARAM_UNDECLARED | POST | `/api/monitor/rules/{id}/enable` | enable_rule | svc/monitor/src/modules/monitor/alerts.rs | 856 | path template has "{id}" but utoipa params() does not declare it |
| 502 | PATH_PARAM_EXTRA | POST | `/api/monitor/rules/{id}/disable` | disable_rule | svc/monitor/src/modules/monitor/alerts.rs | 892 | handler has Path<> extractor but utoipa declares no path params |
| 503 | PATH_PARAM_UNDECLARED | POST | `/api/monitor/rules/{id}/disable` | disable_rule | svc/monitor/src/modules/monitor/alerts.rs | 892 | path template has "{id}" but utoipa params() does not declare it |
| 504 | PATH_PARAM_EXTRA | GET | `/api/monitor/alerts/{id}/history` | get_alert_history | svc/monitor/src/modules/monitor/alerts.rs | 930 | handler has Path<> extractor but utoipa declares no path params |
| 505 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/alerts/{id}/history` | get_alert_history | svc/monitor/src/modules/monitor/alerts.rs | 930 | path template has "{id}" but utoipa params() does not declare it |
| 506 | PATH_PARAM_EXTRA | GET | `/api/monitor/alerts/{id}/timeline` | get_alert_timeline | svc/monitor/src/modules/monitor/alerts.rs | 965 | handler has Path<> extractor but utoipa declares no path params |
| 507 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/alerts/{id}/timeline` | get_alert_timeline | svc/monitor/src/modules/monitor/alerts.rs | 965 | path template has "{id}" but utoipa params() does not declare it |
| 508 | PATH_PARAM_EXTRA | GET | `/api/monitor/rules/{id}/scheduled-trigger` | get_scheduled_trigger | svc/monitor/src/modules/monitor/alerts.rs | 1005 | handler has Path<> extractor but utoipa declares no path params |
| 509 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/rules/{id}/scheduled-trigger` | get_scheduled_trigger | svc/monitor/src/modules/monitor/alerts.rs | 1005 | path template has "{id}" but utoipa params() does not declare it |
| 510 | PATH_PARAM_EXTRA | PUT | `/api/monitor/rules/{id}/scheduled-trigger` | update_scheduled_trigger | svc/monitor/src/modules/monitor/alerts.rs | 1029 | handler has Path<> extractor but utoipa declares no path params |
| 511 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/rules/{id}/scheduled-trigger` | update_scheduled_trigger | svc/monitor/src/modules/monitor/alerts.rs | 1029 | path template has "{id}" but utoipa params() does not declare it |
| 512 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/rules/{id}/scheduled-trigger` | update_scheduled_trigger | svc/monitor/src/modules/monitor/alerts.rs | 1029 | handler has Json<ScheduledTrigger> parameter but utoipa declares no request_body |
| 513 | PATH_PARAM_EXTRA | GET | `/api/monitor/rules/{id}/escalation` | get_escalation | svc/monitor/src/modules/monitor/alerts.rs | 1046 | handler has Path<> extractor but utoipa declares no path params |
| 514 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/rules/{id}/escalation` | get_escalation | svc/monitor/src/modules/monitor/alerts.rs | 1046 | path template has "{id}" but utoipa params() does not declare it |
| 515 | PATH_PARAM_EXTRA | PUT | `/api/monitor/rules/{id}/escalation` | update_escalation | svc/monitor/src/modules/monitor/alerts.rs | 1104 | handler has Path<> extractor but utoipa declares no path params |
| 516 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/rules/{id}/escalation` | update_escalation | svc/monitor/src/modules/monitor/alerts.rs | 1104 | path template has "{id}" but utoipa params() does not declare it |
| 517 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/rules/{id}/escalation` | update_escalation | svc/monitor/src/modules/monitor/alerts.rs | 1104 | handler has Json<AlertEscalation> parameter but utoipa declares no request_body |
| 518 | PATH_PARAM_EXTRA | GET | `/api/monitor/rules/{id}/routing` | get_routing | svc/monitor/src/modules/monitor/alerts.rs | 1121 | handler has Path<> extractor but utoipa declares no path params |
| 519 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/rules/{id}/routing` | get_routing | svc/monitor/src/modules/monitor/alerts.rs | 1121 | path template has "{id}" but utoipa params() does not declare it |
| 520 | PATH_PARAM_EXTRA | PUT | `/api/monitor/rules/{id}/routing` | update_routing | svc/monitor/src/modules/monitor/alerts.rs | 1166 | handler has Path<> extractor but utoipa declares no path params |
| 521 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/rules/{id}/routing` | update_routing | svc/monitor/src/modules/monitor/alerts.rs | 1166 | path template has "{id}" but utoipa params() does not declare it |
| 522 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/rules/{id}/routing` | update_routing | svc/monitor/src/modules/monitor/alerts.rs | 1166 | handler has Json<AlertRouting> parameter but utoipa declares no request_body |
| 523 | REQUEST_BODY_EXTRA | POST | `/api/monitor/templates` | create_template | svc/monitor/src/modules/monitor/alerts.rs | 1218 | handler has Json<AlertTemplate> parameter but utoipa declares no request_body |
| 524 | PATH_PARAM_EXTRA | GET | `/api/monitor/templates/{id}` | get_template | svc/monitor/src/modules/monitor/alerts.rs | 1234 | handler has Path<> extractor but utoipa declares no path params |
| 525 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/templates/{id}` | get_template | svc/monitor/src/modules/monitor/alerts.rs | 1234 | path template has "{id}" but utoipa params() does not declare it |
| 526 | PATH_PARAM_EXTRA | PUT | `/api/monitor/templates/{id}` | update_template | svc/monitor/src/modules/monitor/alerts.rs | 1259 | handler has Path<> extractor but utoipa declares no path params |
| 527 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/templates/{id}` | update_template | svc/monitor/src/modules/monitor/alerts.rs | 1259 | path template has "{id}" but utoipa params() does not declare it |
| 528 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/templates/{id}` | update_template | svc/monitor/src/modules/monitor/alerts.rs | 1259 | handler has Json<AlertTemplate> parameter but utoipa declares no request_body |
| 529 | PATH_PARAM_EXTRA | DELETE | `/api/monitor/templates/{id}` | delete_template | svc/monitor/src/modules/monitor/alerts.rs | 1276 | handler has Path<> extractor but utoipa declares no path params |
| 530 | PATH_PARAM_UNDECLARED | DELETE | `/api/monitor/templates/{id}` | delete_template | svc/monitor/src/modules/monitor/alerts.rs | 1276 | path template has "{id}" but utoipa params() does not declare it |
| 531 | REQUEST_BODY_EXTRA | POST | `/api/monitor/suppression` | create_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1324 | handler has Json<SuppressionRule> parameter but utoipa declares no request_body |
| 532 | PATH_PARAM_EXTRA | GET | `/api/monitor/suppression/{id}` | get_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1340 | handler has Path<> extractor but utoipa declares no path params |
| 533 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/suppression/{id}` | get_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1340 | path template has "{id}" but utoipa params() does not declare it |
| 534 | PATH_PARAM_EXTRA | PUT | `/api/monitor/suppression/{id}` | update_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1369 | handler has Path<> extractor but utoipa declares no path params |
| 535 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/suppression/{id}` | update_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1369 | path template has "{id}" but utoipa params() does not declare it |
| 536 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/suppression/{id}` | update_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1369 | handler has Json<SuppressionRule> parameter but utoipa declares no request_body |
| 537 | PATH_PARAM_EXTRA | DELETE | `/api/monitor/suppression/{id}` | delete_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1386 | handler has Path<> extractor but utoipa declares no path params |
| 538 | PATH_PARAM_UNDECLARED | DELETE | `/api/monitor/suppression/{id}` | delete_suppression_rule | svc/monitor/src/modules/monitor/alerts.rs | 1386 | path template has "{id}" but utoipa params() does not declare it |
| 539 | PATH_PARAM_EXTRA | GET | `/api/monitor/rules/{id}/advanced` | get_advanced_rule | svc/monitor/src/modules/monitor/alerts.rs | 1406 | handler has Path<> extractor but utoipa declares no path params |
| 540 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/rules/{id}/advanced` | get_advanced_rule | svc/monitor/src/modules/monitor/alerts.rs | 1406 | path template has "{id}" but utoipa params() does not declare it |
| 541 | PATH_PARAM_EXTRA | PUT | `/api/monitor/rules/{id}/advanced` | update_advanced_rule | svc/monitor/src/modules/monitor/alerts.rs | 1456 | handler has Path<> extractor but utoipa declares no path params |
| 542 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/rules/{id}/advanced` | update_advanced_rule | svc/monitor/src/modules/monitor/alerts.rs | 1456 | path template has "{id}" but utoipa params() does not declare it |
| 543 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/rules/{id}/advanced` | update_advanced_rule | svc/monitor/src/modules/monitor/alerts.rs | 1456 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 544 | PATH_PARAM_EXTRA | GET | `/api/monitor/business-metrics/{id}` | get_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 687 | handler has Path<> extractor but utoipa declares no path params |
| 545 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/business-metrics/{id}` | get_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 687 | path template has "{id}" but utoipa params() does not declare it |
| 546 | REQUEST_BODY_EXTRA | POST | `/api/monitor/business-metrics` | create_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 721 | handler has Json<BusinessMetricRequest> parameter but utoipa declares no request_body |
| 547 | PATH_PARAM_EXTRA | PUT | `/api/monitor/business-metrics/{id}` | update_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 755 | handler has Path<> extractor but utoipa declares no path params |
| 548 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/business-metrics/{id}` | update_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 755 | path template has "{id}" but utoipa params() does not declare it |
| 549 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/business-metrics/{id}` | update_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 755 | handler has Json<BusinessMetricRequest> parameter but utoipa declares no request_body |
| 550 | PATH_PARAM_EXTRA | DELETE | `/api/monitor/business-metrics/{id}` | delete_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 790 | handler has Path<> extractor but utoipa declares no path params |
| 551 | PATH_PARAM_UNDECLARED | DELETE | `/api/monitor/business-metrics/{id}` | delete_business_metric | svc/monitor/src/modules/monitor/business_metrics.rs | 790 | path template has "{id}" but utoipa params() does not declare it |
| 552 | REQUEST_BODY_EXTRA | POST | `/api/monitor/performance/export` | export_performance_data | svc/monitor/src/modules/monitor/metrics.rs | 597 | handler has Json<ExportRequest> parameter but utoipa declares no request_body |
| 553 | PATH_PARAM_EXTRA | GET | `/api/monitor/slos/{id}` | get_slo | svc/monitor/src/modules/monitor/slo.rs | 386 | handler has Path<> extractor but utoipa declares no path params |
| 554 | PATH_PARAM_UNDECLARED | GET | `/api/monitor/slos/{id}` | get_slo | svc/monitor/src/modules/monitor/slo.rs | 386 | path template has "{id}" but utoipa params() does not declare it |
| 555 | REQUEST_BODY_EXTRA | POST | `/api/monitor/slos` | create_slo | svc/monitor/src/modules/monitor/slo.rs | 428 | handler has Json<SloRequest> parameter but utoipa declares no request_body |
| 556 | PATH_PARAM_EXTRA | PUT | `/api/monitor/slos/{id}` | update_slo | svc/monitor/src/modules/monitor/slo.rs | 469 | handler has Path<> extractor but utoipa declares no path params |
| 557 | PATH_PARAM_UNDECLARED | PUT | `/api/monitor/slos/{id}` | update_slo | svc/monitor/src/modules/monitor/slo.rs | 469 | path template has "{id}" but utoipa params() does not declare it |
| 558 | REQUEST_BODY_EXTRA | PUT | `/api/monitor/slos/{id}` | update_slo | svc/monitor/src/modules/monitor/slo.rs | 469 | handler has Json<SloRequest> parameter but utoipa declares no request_body |
| 559 | PATH_PARAM_EXTRA | DELETE | `/api/monitor/slos/{id}` | delete_slo | svc/monitor/src/modules/monitor/slo.rs | 509 | handler has Path<> extractor but utoipa declares no path params |
| 560 | PATH_PARAM_UNDECLARED | DELETE | `/api/monitor/slos/{id}` | delete_slo | svc/monitor/src/modules/monitor/slo.rs | 509 | path template has "{id}" but utoipa params() does not declare it |
| 561 | PATH_PARAM_EXTRA | POST | `/api/monitor/slos/violations/{id}/resolve` | resolve_slo_violation | svc/monitor/src/modules/monitor/slo.rs | 721 | handler has Path<> extractor but utoipa declares no path params |
| 562 | PATH_PARAM_UNDECLARED | POST | `/api/monitor/slos/violations/{id}/resolve` | resolve_slo_violation | svc/monitor/src/modules/monitor/slo.rs | 721 | path template has "{id}" but utoipa params() does not declare it |
| 563 | REQUEST_BODY_EXTRA | POST | `/api/pdm/change-notices` | create_change_notice | svc/pdm/src/modules/change_notice.rs | 186 | handler has Json<CreateChangeNoticeRequest> parameter but utoipa declares no request_body |
| 564 | PATH_PARAM_EXTRA | GET | `/api/pdm/change-notices/{id}` | get_change_notice | svc/pdm/src/modules/change_notice.rs | 257 | handler has Path<> extractor but utoipa declares no path params |
| 565 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/change-notices/{id}` | get_change_notice | svc/pdm/src/modules/change_notice.rs | 257 | path template has "{id}" but utoipa params() does not declare it |
| 566 | PATH_PARAM_EXTRA | PUT | `/api/pdm/change-notices/{id}` | update_change_notice | svc/pdm/src/modules/change_notice.rs | 294 | handler has Path<> extractor but utoipa declares no path params |
| 567 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/change-notices/{id}` | update_change_notice | svc/pdm/src/modules/change_notice.rs | 294 | path template has "{id}" but utoipa params() does not declare it |
| 568 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/change-notices/{id}` | update_change_notice | svc/pdm/src/modules/change_notice.rs | 294 | handler has Json<UpdateChangeNoticeRequest> parameter but utoipa declares no request_body |
| 569 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/change-notices/{id}` | delete_change_notice | svc/pdm/src/modules/change_notice.rs | 387 | handler has Path<> extractor but utoipa declares no path params |
| 570 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/change-notices/{id}` | delete_change_notice | svc/pdm/src/modules/change_notice.rs | 387 | path template has "{id}" but utoipa params() does not declare it |
| 571 | PATH_PARAM_EXTRA | POST | `/api/pdm/change-notices/{id}/submit` | submit_change_notice | svc/pdm/src/modules/change_notice.rs | 419 | handler has Path<> extractor but utoipa declares no path params |
| 572 | PATH_PARAM_UNDECLARED | POST | `/api/pdm/change-notices/{id}/submit` | submit_change_notice | svc/pdm/src/modules/change_notice.rs | 419 | path template has "{id}" but utoipa params() does not declare it |
| 573 | PATH_PARAM_EXTRA | POST | `/api/pdm/change-notices/{id}/approve` | approve_change_notice | svc/pdm/src/modules/change_notice.rs | 460 | handler has Path<> extractor but utoipa declares no path params |
| 574 | PATH_PARAM_UNDECLARED | POST | `/api/pdm/change-notices/{id}/approve` | approve_change_notice | svc/pdm/src/modules/change_notice.rs | 460 | path template has "{id}" but utoipa params() does not declare it |
| 575 | REQUEST_BODY_EXTRA | POST | `/api/pdm/change-notices/{id}/approve` | approve_change_notice | svc/pdm/src/modules/change_notice.rs | 460 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 576 | PATH_PARAM_EXTRA | POST | `/api/pdm/change-notices/{id}/reject` | reject_change_notice | svc/pdm/src/modules/change_notice.rs | 509 | handler has Path<> extractor but utoipa declares no path params |
| 577 | PATH_PARAM_UNDECLARED | POST | `/api/pdm/change-notices/{id}/reject` | reject_change_notice | svc/pdm/src/modules/change_notice.rs | 509 | path template has "{id}" but utoipa params() does not declare it |
| 578 | REQUEST_BODY_EXTRA | POST | `/api/pdm/change-notices/{id}/reject` | reject_change_notice | svc/pdm/src/modules/change_notice.rs | 509 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 579 | REQUEST_BODY_EXTRA | POST | `/api/pdm/configurations` | create_configuration | svc/pdm/src/modules/configuration.rs | 161 | handler has Json<CreateConfigurationRequest> parameter but utoipa declares no request_body |
| 580 | PATH_PARAM_EXTRA | GET | `/api/pdm/configurations/{id}` | get_configuration | svc/pdm/src/modules/configuration.rs | 225 | handler has Path<> extractor but utoipa declares no path params |
| 581 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/configurations/{id}` | get_configuration | svc/pdm/src/modules/configuration.rs | 225 | path template has "{id}" but utoipa params() does not declare it |
| 582 | PATH_PARAM_EXTRA | PUT | `/api/pdm/configurations/{id}` | update_configuration | svc/pdm/src/modules/configuration.rs | 261 | handler has Path<> extractor but utoipa declares no path params |
| 583 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/configurations/{id}` | update_configuration | svc/pdm/src/modules/configuration.rs | 261 | path template has "{id}" but utoipa params() does not declare it |
| 584 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/configurations/{id}` | update_configuration | svc/pdm/src/modules/configuration.rs | 261 | handler has Json<UpdateConfigurationRequest> parameter but utoipa declares no request_body |
| 585 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/configurations/{id}` | delete_configuration | svc/pdm/src/modules/configuration.rs | 319 | handler has Path<> extractor but utoipa declares no path params |
| 586 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/configurations/{id}` | delete_configuration | svc/pdm/src/modules/configuration.rs | 319 | path template has "{id}" but utoipa params() does not declare it |
| 587 | REQUEST_BODY_EXTRA | POST | `/api/pdm/documents` | create_document | svc/pdm/src/modules/document.rs | 181 | handler has Json<CreateDocumentRequest> parameter but utoipa declares no request_body |
| 588 | PATH_PARAM_EXTRA | GET | `/api/pdm/documents/{id}` | get_document | svc/pdm/src/modules/document.rs | 246 | handler has Path<> extractor but utoipa declares no path params |
| 589 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/documents/{id}` | get_document | svc/pdm/src/modules/document.rs | 246 | path template has "{id}" but utoipa params() does not declare it |
| 590 | PATH_PARAM_EXTRA | PUT | `/api/pdm/documents/{id}` | update_document | svc/pdm/src/modules/document.rs | 282 | handler has Path<> extractor but utoipa declares no path params |
| 591 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/documents/{id}` | update_document | svc/pdm/src/modules/document.rs | 282 | path template has "{id}" but utoipa params() does not declare it |
| 592 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/documents/{id}` | update_document | svc/pdm/src/modules/document.rs | 282 | handler has Json<UpdateDocumentRequest> parameter but utoipa declares no request_body |
| 593 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/documents/{id}` | delete_document | svc/pdm/src/modules/document.rs | 372 | handler has Path<> extractor but utoipa declares no path params |
| 594 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/documents/{id}` | delete_document | svc/pdm/src/modules/document.rs | 372 | path template has "{id}" but utoipa params() does not declare it |
| 595 | PATH_PARAM_EXTRA | POST | `/api/pdm/documents/{id}/approve` | start_document_approval | svc/pdm/src/modules/document.rs | 409 | handler has Path<> extractor but utoipa declares no path params |
| 596 | PATH_PARAM_UNDECLARED | POST | `/api/pdm/documents/{id}/approve` | start_document_approval | svc/pdm/src/modules/document.rs | 409 | path template has "{id}" but utoipa params() does not declare it |
| 597 | REQUEST_BODY_EXTRA | POST | `/api/pdm/documents/{id}/approve` | start_document_approval | svc/pdm/src/modules/document.rs | 409 | handler has Json<StartDocumentApprovalRequest> parameter but utoipa declares no request_body |
| 598 | PATH_PARAM_EXTRA | GET | `/api/pdm/documents/{id}/approval-history` | get_document_approval_history | svc/pdm/src/modules/document.rs | 547 | handler has Path<> extractor but utoipa declares no path params |
| 599 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/documents/{id}/approval-history` | get_document_approval_history | svc/pdm/src/modules/document.rs | 547 | path template has "{id}" but utoipa params() does not declare it |
| 600 | REQUEST_BODY_EXTRA | POST | `/api/pdm/materials` | create_material | svc/pdm/src/modules/material.rs | 148 | handler has Json<CreateMaterialRequest> parameter but utoipa declares no request_body |
| 601 | PATH_PARAM_EXTRA | GET | `/api/pdm/materials/{id}` | get_material | svc/pdm/src/modules/material.rs | 261 | handler has Path<> extractor but utoipa declares no path params |
| 602 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/materials/{id}` | get_material | svc/pdm/src/modules/material.rs | 261 | path template has "{id}" but utoipa params() does not declare it |
| 603 | PATH_PARAM_EXTRA | PUT | `/api/pdm/materials/{id}` | update_material | svc/pdm/src/modules/material.rs | 296 | handler has Path<> extractor but utoipa declares no path params |
| 604 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/materials/{id}` | update_material | svc/pdm/src/modules/material.rs | 296 | path template has "{id}" but utoipa params() does not declare it |
| 605 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/materials/{id}` | update_material | svc/pdm/src/modules/material.rs | 296 | handler has Json<UpdateMaterialRequest> parameter but utoipa declares no request_body |
| 606 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/materials/{id}` | delete_material | svc/pdm/src/modules/material.rs | 394 | handler has Path<> extractor but utoipa declares no path params |
| 607 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/materials/{id}` | delete_material | svc/pdm/src/modules/material.rs | 394 | path template has "{id}" but utoipa params() does not declare it |
| 608 | REQUEST_BODY_EXTRA | POST | `/api/pdm/products` | create_product | svc/pdm/src/modules/product.rs | 145 | handler has Json<CreateProductRequest> parameter but utoipa declares no request_body |
| 609 | PATH_PARAM_EXTRA | GET | `/api/pdm/products/{id}` | get_product | svc/pdm/src/modules/product.rs | 193 | handler has Path<> extractor but utoipa declares no path params |
| 610 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/products/{id}` | get_product | svc/pdm/src/modules/product.rs | 193 | path template has "{id}" but utoipa params() does not declare it |
| 611 | PATH_PARAM_EXTRA | PUT | `/api/pdm/products/{id}` | update_product | svc/pdm/src/modules/product.rs | 228 | handler has Path<> extractor but utoipa declares no path params |
| 612 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/products/{id}` | update_product | svc/pdm/src/modules/product.rs | 228 | path template has "{id}" but utoipa params() does not declare it |
| 613 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/products/{id}` | update_product | svc/pdm/src/modules/product.rs | 228 | handler has Json<UpdateProductRequest> parameter but utoipa declares no request_body |
| 614 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/products/{id}` | delete_product | svc/pdm/src/modules/product.rs | 278 | handler has Path<> extractor but utoipa declares no path params |
| 615 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/products/{id}` | delete_product | svc/pdm/src/modules/product.rs | 278 | path template has "{id}" but utoipa params() does not declare it |
| 616 | REQUEST_BODY_EXTRA | POST | `/api/pdm/production-batches` | create_batch | svc/pdm/src/modules/production_batch.rs | 164 | handler has Json<CreateBatchRequest> parameter but utoipa declares no request_body |
| 617 | PATH_PARAM_EXTRA | GET | `/api/pdm/production-batches/{id}` | get_batch | svc/pdm/src/modules/production_batch.rs | 216 | handler has Path<> extractor but utoipa declares no path params |
| 618 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/production-batches/{id}` | get_batch | svc/pdm/src/modules/production_batch.rs | 216 | path template has "{id}" but utoipa params() does not declare it |
| 619 | PATH_PARAM_EXTRA | PUT | `/api/pdm/production-batches/{id}` | update_batch | svc/pdm/src/modules/production_batch.rs | 252 | handler has Path<> extractor but utoipa declares no path params |
| 620 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/production-batches/{id}` | update_batch | svc/pdm/src/modules/production_batch.rs | 252 | path template has "{id}" but utoipa params() does not declare it |
| 621 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/production-batches/{id}` | update_batch | svc/pdm/src/modules/production_batch.rs | 252 | handler has Json<UpdateBatchRequest> parameter but utoipa declares no request_body |
| 622 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/production-batches/{id}` | delete_batch | svc/pdm/src/modules/production_batch.rs | 311 | handler has Path<> extractor but utoipa declares no path params |
| 623 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/production-batches/{id}` | delete_batch | svc/pdm/src/modules/production_batch.rs | 311 | path template has "{id}" but utoipa params() does not declare it |
| 624 | REQUEST_BODY_EXTRA | POST | `/api/pdm/production-formulas` | create_formula | svc/pdm/src/modules/production_formula.rs | 157 | handler has Json<CreateFormulaRequest> parameter but utoipa declares no request_body |
| 625 | PATH_PARAM_EXTRA | GET | `/api/pdm/production-formulas/{id}` | get_formula | svc/pdm/src/modules/production_formula.rs | 209 | handler has Path<> extractor but utoipa declares no path params |
| 626 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/production-formulas/{id}` | get_formula | svc/pdm/src/modules/production_formula.rs | 209 | path template has "{id}" but utoipa params() does not declare it |
| 627 | PATH_PARAM_EXTRA | PUT | `/api/pdm/production-formulas/{id}` | update_formula | svc/pdm/src/modules/production_formula.rs | 245 | handler has Path<> extractor but utoipa declares no path params |
| 628 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/production-formulas/{id}` | update_formula | svc/pdm/src/modules/production_formula.rs | 245 | path template has "{id}" but utoipa params() does not declare it |
| 629 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/production-formulas/{id}` | update_formula | svc/pdm/src/modules/production_formula.rs | 245 | handler has Json<UpdateFormulaRequest> parameter but utoipa declares no request_body |
| 630 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/production-formulas/{id}` | delete_formula | svc/pdm/src/modules/production_formula.rs | 298 | handler has Path<> extractor but utoipa declares no path params |
| 631 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/production-formulas/{id}` | delete_formula | svc/pdm/src/modules/production_formula.rs | 298 | path template has "{id}" but utoipa params() does not declare it |
| 632 | REQUEST_BODY_EXTRA | POST | `/api/pdm/production-processes` | create_process | svc/pdm/src/modules/production_process.rs | 155 | handler has Json<CreateProcessRequest> parameter but utoipa declares no request_body |
| 633 | PATH_PARAM_EXTRA | GET | `/api/pdm/production-processes/{id}` | get_process | svc/pdm/src/modules/production_process.rs | 205 | handler has Path<> extractor but utoipa declares no path params |
| 634 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/production-processes/{id}` | get_process | svc/pdm/src/modules/production_process.rs | 205 | path template has "{id}" but utoipa params() does not declare it |
| 635 | PATH_PARAM_EXTRA | PUT | `/api/pdm/production-processes/{id}` | update_process | svc/pdm/src/modules/production_process.rs | 240 | handler has Path<> extractor but utoipa declares no path params |
| 636 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/production-processes/{id}` | update_process | svc/pdm/src/modules/production_process.rs | 240 | path template has "{id}" but utoipa params() does not declare it |
| 637 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/production-processes/{id}` | update_process | svc/pdm/src/modules/production_process.rs | 240 | handler has Json<UpdateProcessRequest> parameter but utoipa declares no request_body |
| 638 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/production-processes/{id}` | delete_process | svc/pdm/src/modules/production_process.rs | 294 | handler has Path<> extractor but utoipa declares no path params |
| 639 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/production-processes/{id}` | delete_process | svc/pdm/src/modules/production_process.rs | 294 | path template has "{id}" but utoipa params() does not declare it |
| 640 | PATH_PARAM_EXTRA | GET | `/api/pdm/statistics/{id}` | get_statistics | svc/pdm/src/modules/production_statistics.rs | 129 | handler has Path<> extractor but utoipa declares no path params |
| 641 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/statistics/{id}` | get_statistics | svc/pdm/src/modules/production_statistics.rs | 129 | path template has "{id}" but utoipa params() does not declare it |
| 642 | REQUEST_BODY_EXTRA | POST | `/api/pdm/production-steps` | create_step | svc/pdm/src/modules/production_step.rs | 146 | handler has Json<CreateStepRequest> parameter but utoipa declares no request_body |
| 643 | PATH_PARAM_EXTRA | GET | `/api/pdm/production-steps/{id}` | get_step | svc/pdm/src/modules/production_step.rs | 194 | handler has Path<> extractor but utoipa declares no path params |
| 644 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/production-steps/{id}` | get_step | svc/pdm/src/modules/production_step.rs | 194 | path template has "{id}" but utoipa params() does not declare it |
| 645 | PATH_PARAM_EXTRA | PUT | `/api/pdm/production-steps/{id}` | update_step | svc/pdm/src/modules/production_step.rs | 229 | handler has Path<> extractor but utoipa declares no path params |
| 646 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/production-steps/{id}` | update_step | svc/pdm/src/modules/production_step.rs | 229 | path template has "{id}" but utoipa params() does not declare it |
| 647 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/production-steps/{id}` | update_step | svc/pdm/src/modules/production_step.rs | 229 | handler has Json<UpdateStepRequest> parameter but utoipa declares no request_body |
| 648 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/production-steps/{id}` | delete_step | svc/pdm/src/modules/production_step.rs | 282 | handler has Path<> extractor but utoipa declares no path params |
| 649 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/production-steps/{id}` | delete_step | svc/pdm/src/modules/production_step.rs | 282 | path template has "{id}" but utoipa params() does not declare it |
| 650 | REQUEST_BODY_EXTRA | POST | `/api/pdm/versions` | create_version | svc/pdm/src/modules/version.rs | 164 | handler has Json<CreateVersionRequest> parameter but utoipa declares no request_body |
| 651 | PATH_PARAM_EXTRA | GET | `/api/pdm/versions/{id}` | get_version | svc/pdm/src/modules/version.rs | 216 | handler has Path<> extractor but utoipa declares no path params |
| 652 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/versions/{id}` | get_version | svc/pdm/src/modules/version.rs | 216 | path template has "{id}" but utoipa params() does not declare it |
| 653 | PATH_PARAM_EXTRA | PUT | `/api/pdm/versions/{id}` | update_version | svc/pdm/src/modules/version.rs | 252 | handler has Path<> extractor but utoipa declares no path params |
| 654 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/versions/{id}` | update_version | svc/pdm/src/modules/version.rs | 252 | path template has "{id}" but utoipa params() does not declare it |
| 655 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/versions/{id}` | update_version | svc/pdm/src/modules/version.rs | 252 | handler has Json<UpdateVersionRequest> parameter but utoipa declares no request_body |
| 656 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/versions/{id}` | delete_version | svc/pdm/src/modules/version.rs | 309 | handler has Path<> extractor but utoipa declares no path params |
| 657 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/versions/{id}` | delete_version | svc/pdm/src/modules/version.rs | 309 | path template has "{id}" but utoipa params() does not declare it |
| 658 | REQUEST_BODY_EXTRA | POST | `/api/pdm/workflows` | create_workflow | svc/pdm/src/modules/workflow.rs | 146 | handler has Json<CreateWorkflowRequest> parameter but utoipa declares no request_body |
| 659 | PATH_PARAM_EXTRA | GET | `/api/pdm/workflows/{id}` | get_workflow | svc/pdm/src/modules/workflow.rs | 207 | handler has Path<> extractor but utoipa declares no path params |
| 660 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/workflows/{id}` | get_workflow | svc/pdm/src/modules/workflow.rs | 207 | path template has "{id}" but utoipa params() does not declare it |
| 661 | PATH_PARAM_EXTRA | PUT | `/api/pdm/workflows/{id}` | update_workflow | svc/pdm/src/modules/workflow.rs | 243 | handler has Path<> extractor but utoipa declares no path params |
| 662 | PATH_PARAM_UNDECLARED | PUT | `/api/pdm/workflows/{id}` | update_workflow | svc/pdm/src/modules/workflow.rs | 243 | path template has "{id}" but utoipa params() does not declare it |
| 663 | REQUEST_BODY_EXTRA | PUT | `/api/pdm/workflows/{id}` | update_workflow | svc/pdm/src/modules/workflow.rs | 243 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 664 | PATH_PARAM_EXTRA | DELETE | `/api/pdm/workflows/{id}` | delete_workflow | svc/pdm/src/modules/workflow.rs | 293 | handler has Path<> extractor but utoipa declares no path params |
| 665 | PATH_PARAM_UNDECLARED | DELETE | `/api/pdm/workflows/{id}` | delete_workflow | svc/pdm/src/modules/workflow.rs | 293 | path template has "{id}" but utoipa params() does not declare it |
| 666 | REQUEST_BODY_EXTRA | POST | `/api/pdm/workflows/start` | start_workflow | svc/pdm/src/modules/workflow.rs | 324 | handler has Json<StartWorkflowRequest> parameter but utoipa declares no request_body |
| 667 | PATH_PARAM_EXTRA | GET | `/api/pdm/workflow-instances/{id}` | get_workflow_instance | svc/pdm/src/modules/workflow.rs | 453 | handler has Path<> extractor but utoipa declares no path params |
| 668 | PATH_PARAM_UNDECLARED | GET | `/api/pdm/workflow-instances/{id}` | get_workflow_instance | svc/pdm/src/modules/workflow.rs | 453 | path template has "{id}" but utoipa params() does not declare it |
| 669 | PATH_PARAM_EXTRA | POST | `/api/pdm/workflow-instances/{id}/advance` | advance_workflow | svc/pdm/src/modules/workflow.rs | 490 | handler has Path<> extractor but utoipa declares no path params |
| 670 | PATH_PARAM_UNDECLARED | POST | `/api/pdm/workflow-instances/{id}/advance` | advance_workflow | svc/pdm/src/modules/workflow.rs | 490 | path template has "{id}" but utoipa params() does not declare it |
| 671 | REQUEST_BODY_EXTRA | POST | `/api/pdm/workflow-instances/{id}/advance` | advance_workflow | svc/pdm/src/modules/workflow.rs | 490 | handler has Json<serde_json::Value> parameter but utoipa declares no request_body |
| 672 | PATH_PARAM_EXTRA | GET | `/api/pm/projects/{id}` | get_project | svc/pm/src/modules/project.rs | 260 | handler has Path<> extractor but utoipa declares no path params |
| 673 | PATH_PARAM_UNDECLARED | GET | `/api/pm/projects/{id}` | get_project | svc/pm/src/modules/project.rs | 260 | path template has "{id}" but utoipa params() does not declare it |
| 674 | PATH_PARAM_EXTRA | PUT | `/api/pm/projects/{id}` | update_project | svc/pm/src/modules/project.rs | 291 | handler has Path<> extractor but utoipa declares no path params |
| 675 | PATH_PARAM_UNDECLARED | PUT | `/api/pm/projects/{id}` | update_project | svc/pm/src/modules/project.rs | 291 | path template has "{id}" but utoipa params() does not declare it |
| 676 | PATH_PARAM_EXTRA | DELETE | `/api/pm/projects/{id}` | delete_project | svc/pm/src/modules/project.rs | 360 | handler has Path<> extractor but utoipa declares no path params |
| 677 | PATH_PARAM_UNDECLARED | DELETE | `/api/pm/projects/{id}` | delete_project | svc/pm/src/modules/project.rs | 360 | path template has "{id}" but utoipa params() does not declare it |
| 678 | PATH_PARAM_EXTRA | GET | `/api/pm/projects/{id}/dashboard` | get_project_dashboard | svc/pm/src/modules/project.rs | 391 | handler has Path<> extractor but utoipa declares no path params |
| 679 | PATH_PARAM_UNDECLARED | GET | `/api/pm/projects/{id}/dashboard` | get_project_dashboard | svc/pm/src/modules/project.rs | 391 | path template has "{id}" but utoipa params() does not declare it |
| 680 | PATH_PARAM_EXTRA | GET | `/api/pm/projects/{id}/gantt` | get_project_gantt | svc/pm/src/modules/project.rs | 508 | handler has Path<> extractor but utoipa declares no path params |
| 681 | PATH_PARAM_UNDECLARED | GET | `/api/pm/projects/{id}/gantt` | get_project_gantt | svc/pm/src/modules/project.rs | 508 | path template has "{id}" but utoipa params() does not declare it |
| 682 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/approval` | get_approval | svc/pm/src/modules/project_approval.rs | 47 | handler has Path<> extractor but utoipa declares no path params |
| 683 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/approval` | get_approval | svc/pm/src/modules/project_approval.rs | 47 | path template has "{project_id}" but utoipa params() does not declare it |
| 684 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/approval` | submit_approval | svc/pm/src/modules/project_approval.rs | 78 | handler has Path<> extractor but utoipa declares no path params |
| 685 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/approval` | submit_approval | svc/pm/src/modules/project_approval.rs | 78 | path template has "{project_id}" but utoipa params() does not declare it |
| 686 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/approval/action` | handle_approval_action | svc/pm/src/modules/project_approval.rs | 180 | handler has Path<> extractor but utoipa declares no path params |
| 687 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/approval/action` | handle_approval_action | svc/pm/src/modules/project_approval.rs | 180 | path template has "{project_id}" but utoipa params() does not declare it |
| 688 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/benefits` | get_benefits | svc/pm/src/modules/project_benefit.rs | 26 | handler has Path<> extractor but utoipa declares no path params |
| 689 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/benefits` | get_benefits | svc/pm/src/modules/project_benefit.rs | 26 | path template has "{project_id}" but utoipa params() does not declare it |
| 690 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/benefits/analysis` | get_analysis | svc/pm/src/modules/project_benefit.rs | 55 | handler has Path<> extractor but utoipa declares no path params |
| 691 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/benefits/analysis` | get_analysis | svc/pm/src/modules/project_benefit.rs | 55 | path template has "{project_id}" but utoipa params() does not declare it |
| 692 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/benefits` | calculate_benefits | svc/pm/src/modules/project_benefit.rs | 153 | handler has Path<> extractor but utoipa declares no path params |
| 693 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/benefits` | calculate_benefits | svc/pm/src/modules/project_benefit.rs | 153 | path template has "{project_id}" but utoipa params() does not declare it |
| 694 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/expenses` | list_expenses | svc/pm/src/modules/project_expense.rs | 26 | handler has Path<> extractor but utoipa declares no path params |
| 695 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/expenses` | list_expenses | svc/pm/src/modules/project_expense.rs | 26 | path template has "{project_id}" but utoipa params() does not declare it |
| 696 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/expenses` | add_expense | svc/pm/src/modules/project_expense.rs | 55 | handler has Path<> extractor but utoipa declares no path params |
| 697 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/expenses` | add_expense | svc/pm/src/modules/project_expense.rs | 55 | path template has "{project_id}" but utoipa params() does not declare it |
| 698 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/expenses/{id}` | get_expense | svc/pm/src/modules/project_expense.rs | 119 | handler has Path<> extractor but utoipa declares no path params |
| 699 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/expenses/{id}` | get_expense | svc/pm/src/modules/project_expense.rs | 119 | path template has "{project_id}" but utoipa params() does not declare it |
| 700 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/expenses/{id}` | get_expense | svc/pm/src/modules/project_expense.rs | 119 | path template has "{id}" but utoipa params() does not declare it |
| 701 | PATH_PARAM_EXTRA | PUT | `/projects/{project_id}/expenses/{id}` | update_expense | svc/pm/src/modules/project_expense.rs | 151 | handler has Path<> extractor but utoipa declares no path params |
| 702 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/expenses/{id}` | update_expense | svc/pm/src/modules/project_expense.rs | 151 | path template has "{project_id}" but utoipa params() does not declare it |
| 703 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/expenses/{id}` | update_expense | svc/pm/src/modules/project_expense.rs | 151 | path template has "{id}" but utoipa params() does not declare it |
| 704 | PATH_PARAM_EXTRA | DELETE | `/projects/{project_id}/expenses/{id}` | remove_expense | svc/pm/src/modules/project_expense.rs | 209 | handler has Path<> extractor but utoipa declares no path params |
| 705 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/expenses/{id}` | remove_expense | svc/pm/src/modules/project_expense.rs | 209 | path template has "{project_id}" but utoipa params() does not declare it |
| 706 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/expenses/{id}` | remove_expense | svc/pm/src/modules/project_expense.rs | 209 | path template has "{id}" but utoipa params() does not declare it |
| 707 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/members` | list_members | svc/pm/src/modules/project_member.rs | 26 | handler has Path<> extractor but utoipa declares no path params |
| 708 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/members` | list_members | svc/pm/src/modules/project_member.rs | 26 | path template has "{project_id}" but utoipa params() does not declare it |
| 709 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/members` | create_member | svc/pm/src/modules/project_member.rs | 55 | handler has Path<> extractor but utoipa declares no path params |
| 710 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/members` | create_member | svc/pm/src/modules/project_member.rs | 55 | path template has "{project_id}" but utoipa params() does not declare it |
| 711 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/members/{id}` | get_member | svc/pm/src/modules/project_member.rs | 107 | handler has Path<> extractor but utoipa declares no path params |
| 712 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/members/{id}` | get_member | svc/pm/src/modules/project_member.rs | 107 | path template has "{project_id}" but utoipa params() does not declare it |
| 713 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/members/{id}` | get_member | svc/pm/src/modules/project_member.rs | 107 | path template has "{id}" but utoipa params() does not declare it |
| 714 | PATH_PARAM_EXTRA | PUT | `/projects/{project_id}/members/{id}` | update_member | svc/pm/src/modules/project_member.rs | 139 | handler has Path<> extractor but utoipa declares no path params |
| 715 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/members/{id}` | update_member | svc/pm/src/modules/project_member.rs | 139 | path template has "{project_id}" but utoipa params() does not declare it |
| 716 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/members/{id}` | update_member | svc/pm/src/modules/project_member.rs | 139 | path template has "{id}" but utoipa params() does not declare it |
| 717 | PATH_PARAM_EXTRA | DELETE | `/projects/{project_id}/members/{id}` | delete_member | svc/pm/src/modules/project_member.rs | 189 | handler has Path<> extractor but utoipa declares no path params |
| 718 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/members/{id}` | delete_member | svc/pm/src/modules/project_member.rs | 189 | path template has "{project_id}" but utoipa params() does not declare it |
| 719 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/members/{id}` | delete_member | svc/pm/src/modules/project_member.rs | 189 | path template has "{id}" but utoipa params() does not declare it |
| 720 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/milestones` | list_milestones | svc/pm/src/modules/project_milestone.rs | 30 | handler has Path<> extractor but utoipa declares no path params |
| 721 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/milestones` | list_milestones | svc/pm/src/modules/project_milestone.rs | 30 | path template has "{project_id}" but utoipa params() does not declare it |
| 722 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/milestones` | create_milestone | svc/pm/src/modules/project_milestone.rs | 59 | handler has Path<> extractor but utoipa declares no path params |
| 723 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/milestones` | create_milestone | svc/pm/src/modules/project_milestone.rs | 59 | path template has "{project_id}" but utoipa params() does not declare it |
| 724 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/milestones/{id}` | get_milestone | svc/pm/src/modules/project_milestone.rs | 109 | handler has Path<> extractor but utoipa declares no path params |
| 725 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/milestones/{id}` | get_milestone | svc/pm/src/modules/project_milestone.rs | 109 | path template has "{project_id}" but utoipa params() does not declare it |
| 726 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/milestones/{id}` | get_milestone | svc/pm/src/modules/project_milestone.rs | 109 | path template has "{id}" but utoipa params() does not declare it |
| 727 | PATH_PARAM_EXTRA | PUT | `/projects/{project_id}/milestones/{id}` | update_milestone | svc/pm/src/modules/project_milestone.rs | 141 | handler has Path<> extractor but utoipa declares no path params |
| 728 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/milestones/{id}` | update_milestone | svc/pm/src/modules/project_milestone.rs | 141 | path template has "{project_id}" but utoipa params() does not declare it |
| 729 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/milestones/{id}` | update_milestone | svc/pm/src/modules/project_milestone.rs | 141 | path template has "{id}" but utoipa params() does not declare it |
| 730 | PATH_PARAM_EXTRA | DELETE | `/projects/{project_id}/milestones/{id}` | delete_milestone | svc/pm/src/modules/project_milestone.rs | 195 | handler has Path<> extractor but utoipa declares no path params |
| 731 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/milestones/{id}` | delete_milestone | svc/pm/src/modules/project_milestone.rs | 195 | path template has "{project_id}" but utoipa params() does not declare it |
| 732 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/milestones/{id}` | delete_milestone | svc/pm/src/modules/project_milestone.rs | 195 | path template has "{id}" but utoipa params() does not declare it |
| 733 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/phases` | list_phases | svc/pm/src/modules/project_phase.rs | 26 | handler has Path<> extractor but utoipa declares no path params |
| 734 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/phases` | list_phases | svc/pm/src/modules/project_phase.rs | 26 | path template has "{project_id}" but utoipa params() does not declare it |
| 735 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/phases` | create_phase | svc/pm/src/modules/project_phase.rs | 55 | handler has Path<> extractor but utoipa declares no path params |
| 736 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/phases` | create_phase | svc/pm/src/modules/project_phase.rs | 55 | path template has "{project_id}" but utoipa params() does not declare it |
| 737 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/phases/{id}` | get_phase | svc/pm/src/modules/project_phase.rs | 120 | handler has Path<> extractor but utoipa declares no path params |
| 738 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/phases/{id}` | get_phase | svc/pm/src/modules/project_phase.rs | 120 | path template has "{project_id}" but utoipa params() does not declare it |
| 739 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/phases/{id}` | get_phase | svc/pm/src/modules/project_phase.rs | 120 | path template has "{id}" but utoipa params() does not declare it |
| 740 | PATH_PARAM_EXTRA | PUT | `/projects/{project_id}/phases/{id}` | update_phase | svc/pm/src/modules/project_phase.rs | 152 | handler has Path<> extractor but utoipa declares no path params |
| 741 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/phases/{id}` | update_phase | svc/pm/src/modules/project_phase.rs | 152 | path template has "{project_id}" but utoipa params() does not declare it |
| 742 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/phases/{id}` | update_phase | svc/pm/src/modules/project_phase.rs | 152 | path template has "{id}" but utoipa params() does not declare it |
| 743 | PATH_PARAM_EXTRA | DELETE | `/projects/{project_id}/phases/{id}` | delete_phase | svc/pm/src/modules/project_phase.rs | 210 | handler has Path<> extractor but utoipa declares no path params |
| 744 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/phases/{id}` | delete_phase | svc/pm/src/modules/project_phase.rs | 210 | path template has "{project_id}" but utoipa params() does not declare it |
| 745 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/phases/{id}` | delete_phase | svc/pm/src/modules/project_phase.rs | 210 | path template has "{id}" but utoipa params() does not declare it |
| 746 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/resources` | list_resources | svc/pm/src/modules/project_resource.rs | 30 | handler has Path<> extractor but utoipa declares no path params |
| 747 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/resources` | list_resources | svc/pm/src/modules/project_resource.rs | 30 | path template has "{project_id}" but utoipa params() does not declare it |
| 748 | PATH_PARAM_EXTRA | POST | `/projects/{project_id}/resources` | add_resource | svc/pm/src/modules/project_resource.rs | 59 | handler has Path<> extractor but utoipa declares no path params |
| 749 | PATH_PARAM_UNDECLARED | POST | `/projects/{project_id}/resources` | add_resource | svc/pm/src/modules/project_resource.rs | 59 | path template has "{project_id}" but utoipa params() does not declare it |
| 750 | PATH_PARAM_EXTRA | GET | `/projects/{project_id}/resources/{id}` | get_resource | svc/pm/src/modules/project_resource.rs | 115 | handler has Path<> extractor but utoipa declares no path params |
| 751 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/resources/{id}` | get_resource | svc/pm/src/modules/project_resource.rs | 115 | path template has "{project_id}" but utoipa params() does not declare it |
| 752 | PATH_PARAM_UNDECLARED | GET | `/projects/{project_id}/resources/{id}` | get_resource | svc/pm/src/modules/project_resource.rs | 115 | path template has "{id}" but utoipa params() does not declare it |
| 753 | PATH_PARAM_EXTRA | PUT | `/projects/{project_id}/resources/{id}` | update_resource | svc/pm/src/modules/project_resource.rs | 147 | handler has Path<> extractor but utoipa declares no path params |
| 754 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/resources/{id}` | update_resource | svc/pm/src/modules/project_resource.rs | 147 | path template has "{project_id}" but utoipa params() does not declare it |
| 755 | PATH_PARAM_UNDECLARED | PUT | `/projects/{project_id}/resources/{id}` | update_resource | svc/pm/src/modules/project_resource.rs | 147 | path template has "{id}" but utoipa params() does not declare it |
| 756 | PATH_PARAM_EXTRA | DELETE | `/projects/{project_id}/resources/{id}` | remove_resource | svc/pm/src/modules/project_resource.rs | 203 | handler has Path<> extractor but utoipa declares no path params |
| 757 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/resources/{id}` | remove_resource | svc/pm/src/modules/project_resource.rs | 203 | path template has "{project_id}" but utoipa params() does not declare it |
| 758 | PATH_PARAM_UNDECLARED | DELETE | `/projects/{project_id}/resources/{id}` | remove_resource | svc/pm/src/modules/project_resource.rs | 203 | path template has "{id}" but utoipa params() does not declare it |
| 759 | REQUEST_BODY_EXTRA | POST | `/scm/purchase-orders` | create_order | svc/scm/src/modules/purchase_order.rs | 105 | handler has Json<CreatePurchaseOrderRequest> parameter but utoipa declares no request_body |
| 760 | PATH_PARAM_EXTRA | GET | `/scm/purchase-orders/{id}` | get_order | svc/scm/src/modules/purchase_order.rs | 187 | handler has Path<> extractor but utoipa declares no path params |
| 761 | PATH_PARAM_UNDECLARED | GET | `/scm/purchase-orders/{id}` | get_order | svc/scm/src/modules/purchase_order.rs | 187 | path template has "{id}" but utoipa params() does not declare it |
| 762 | PATH_PARAM_EXTRA | PUT | `/scm/purchase-orders/{id}` | update_order | svc/scm/src/modules/purchase_order.rs | 224 | handler has Path<> extractor but utoipa declares no path params |
| 763 | PATH_PARAM_UNDECLARED | PUT | `/scm/purchase-orders/{id}` | update_order | svc/scm/src/modules/purchase_order.rs | 224 | path template has "{id}" but utoipa params() does not declare it |
| 764 | REQUEST_BODY_EXTRA | PUT | `/scm/purchase-orders/{id}` | update_order | svc/scm/src/modules/purchase_order.rs | 224 | handler has Json<UpdatePurchaseOrderRequest> parameter but utoipa declares no request_body |
| 765 | PATH_PARAM_EXTRA | DELETE | `/scm/purchase-orders/{id}` | delete_order | svc/scm/src/modules/purchase_order.rs | 324 | handler has Path<> extractor but utoipa declares no path params |
| 766 | PATH_PARAM_UNDECLARED | DELETE | `/scm/purchase-orders/{id}` | delete_order | svc/scm/src/modules/purchase_order.rs | 324 | path template has "{id}" but utoipa params() does not declare it |
| 767 | PATH_PARAM_EXTRA | POST | `/scm/purchase-orders/{id}/approve` | approve_order | svc/scm/src/modules/purchase_order.rs | 400 | handler has Path<> extractor but utoipa declares no path params |
| 768 | PATH_PARAM_UNDECLARED | POST | `/scm/purchase-orders/{id}/approve` | approve_order | svc/scm/src/modules/purchase_order.rs | 400 | path template has "{id}" but utoipa params() does not declare it |
| 769 | REQUEST_BODY_EXTRA | POST | `/scm/purchase-orders/{id}/approve` | approve_order | svc/scm/src/modules/purchase_order.rs | 400 | handler has Json<ApprovalRequest> parameter but utoipa declares no request_body |
| 770 | PATH_PARAM_EXTRA | POST | `/scm/purchase-orders/{id}/reject` | reject_order | svc/scm/src/modules/purchase_order.rs | 556 | handler has Path<> extractor but utoipa declares no path params |
| 771 | PATH_PARAM_UNDECLARED | POST | `/scm/purchase-orders/{id}/reject` | reject_order | svc/scm/src/modules/purchase_order.rs | 556 | path template has "{id}" but utoipa params() does not declare it |
| 772 | REQUEST_BODY_EXTRA | POST | `/scm/purchase-orders/{id}/reject` | reject_order | svc/scm/src/modules/purchase_order.rs | 556 | handler has Json<ApprovalRequest> parameter but utoipa declares no request_body |
| 773 | REQUEST_BODY_EXTRA | POST | `/scm/suppliers` | create_supplier | svc/scm/src/modules/supplier.rs | 170 | handler has Json<CreateSupplierRequest> parameter but utoipa declares no request_body |
| 774 | PATH_PARAM_EXTRA | GET | `/scm/suppliers/{id}` | get_supplier | svc/scm/src/modules/supplier.rs | 290 | handler has Path<> extractor but utoipa declares no path params |
| 775 | PATH_PARAM_UNDECLARED | GET | `/scm/suppliers/{id}` | get_supplier | svc/scm/src/modules/supplier.rs | 290 | path template has "{id}" but utoipa params() does not declare it |
| 776 | PATH_PARAM_EXTRA | PUT | `/scm/suppliers/{id}` | update_supplier | svc/scm/src/modules/supplier.rs | 361 | handler has Path<> extractor but utoipa declares no path params |
| 777 | PATH_PARAM_UNDECLARED | PUT | `/scm/suppliers/{id}` | update_supplier | svc/scm/src/modules/supplier.rs | 361 | path template has "{id}" but utoipa params() does not declare it |
| 778 | REQUEST_BODY_EXTRA | PUT | `/scm/suppliers/{id}` | update_supplier | svc/scm/src/modules/supplier.rs | 361 | handler has Json<UpdateSupplierRequest> parameter but utoipa declares no request_body |
| 779 | PATH_PARAM_EXTRA | DELETE | `/scm/suppliers/{id}` | delete_supplier | svc/scm/src/modules/supplier.rs | 507 | handler has Path<> extractor but utoipa declares no path params |
| 780 | PATH_PARAM_UNDECLARED | DELETE | `/scm/suppliers/{id}` | delete_supplier | svc/scm/src/modules/supplier.rs | 507 | path template has "{id}" but utoipa params() does not declare it |
| 781 | REQUEST_BODY_EXTRA | POST | `/api/srm/suppliers` | create_supplier | svc/srm/src/modules/supplier.rs | 266 | handler has Json<CreateSupplierRequest> parameter but utoipa declares no request_body |
| 782 | PATH_PARAM_EXTRA | GET | `/api/srm/suppliers/{id}` | get_supplier | svc/srm/src/modules/supplier.rs | 432 | handler has Path<> extractor but utoipa declares no path params |
| 783 | PATH_PARAM_UNDECLARED | GET | `/api/srm/suppliers/{id}` | get_supplier | svc/srm/src/modules/supplier.rs | 432 | path template has "{id}" but utoipa params() does not declare it |
| 784 | PATH_PARAM_EXTRA | PUT | `/api/srm/suppliers/{id}` | update_supplier | svc/srm/src/modules/supplier.rs | 487 | handler has Path<> extractor but utoipa declares no path params |
| 785 | PATH_PARAM_UNDECLARED | PUT | `/api/srm/suppliers/{id}` | update_supplier | svc/srm/src/modules/supplier.rs | 487 | path template has "{id}" but utoipa params() does not declare it |
| 786 | REQUEST_BODY_EXTRA | PUT | `/api/srm/suppliers/{id}` | update_supplier | svc/srm/src/modules/supplier.rs | 487 | handler has Json<UpdateSupplierRequest> parameter but utoipa declares no request_body |
| 787 | PATH_PARAM_EXTRA | DELETE | `/api/srm/suppliers/{id}` | delete_supplier | svc/srm/src/modules/supplier.rs | 643 | handler has Path<> extractor but utoipa declares no path params |
| 788 | PATH_PARAM_UNDECLARED | DELETE | `/api/srm/suppliers/{id}` | delete_supplier | svc/srm/src/modules/supplier.rs | 643 | path template has "{id}" but utoipa params() does not declare it |
| 789 | REQUEST_BODY_EXTRA | POST | `/api/wms/inventory` | create_inventory | svc/wms/src/modules/inventory.rs | 178 | handler has Json<CreateInventoryItemRequest> parameter but utoipa declares no request_body |
| 790 | PATH_PARAM_EXTRA | GET | `/api/wms/inventory/{id}` | get_inventory | svc/wms/src/modules/inventory.rs | 268 | handler has Path<> extractor but utoipa declares no path params |
| 791 | PATH_PARAM_UNDECLARED | GET | `/api/wms/inventory/{id}` | get_inventory | svc/wms/src/modules/inventory.rs | 268 | path template has "{id}" but utoipa params() does not declare it |
| 792 | PATH_PARAM_EXTRA | PUT | `/api/wms/inventory/{id}` | update_inventory | svc/wms/src/modules/inventory.rs | 313 | handler has Path<> extractor but utoipa declares no path params |
| 793 | PATH_PARAM_UNDECLARED | PUT | `/api/wms/inventory/{id}` | update_inventory | svc/wms/src/modules/inventory.rs | 313 | path template has "{id}" but utoipa params() does not declare it |
| 794 | REQUEST_BODY_EXTRA | PUT | `/api/wms/inventory/{id}` | update_inventory | svc/wms/src/modules/inventory.rs | 313 | handler has Json<UpdateInventoryItemRequest> parameter but utoipa declares no request_body |
| 795 | PATH_PARAM_EXTRA | DELETE | `/api/wms/inventory/{id}` | delete_inventory | svc/wms/src/modules/inventory.rs | 534 | handler has Path<> extractor but utoipa declares no path params |
| 796 | PATH_PARAM_UNDECLARED | DELETE | `/api/wms/inventory/{id}` | delete_inventory | svc/wms/src/modules/inventory.rs | 534 | path template has "{id}" but utoipa params() does not declare it |
| 797 | REQUEST_BODY_EXTRA | POST | `/api/wms/warehouses` | create_warehouse | svc/wms/src/modules/warehouse.rs | 132 | handler has Json<CreateWarehouseRequest> parameter but utoipa declares no request_body |
| 798 | PATH_PARAM_EXTRA | GET | `/api/wms/warehouses/{id}` | get_warehouse | svc/wms/src/modules/warehouse.rs | 216 | handler has Path<> extractor but utoipa declares no path params |
| 799 | PATH_PARAM_UNDECLARED | GET | `/api/wms/warehouses/{id}` | get_warehouse | svc/wms/src/modules/warehouse.rs | 216 | path template has "{id}" but utoipa params() does not declare it |
| 800 | PATH_PARAM_EXTRA | PUT | `/api/wms/warehouses/{id}` | update_warehouse | svc/wms/src/modules/warehouse.rs | 266 | handler has Path<> extractor but utoipa declares no path params |
| 801 | PATH_PARAM_UNDECLARED | PUT | `/api/wms/warehouses/{id}` | update_warehouse | svc/wms/src/modules/warehouse.rs | 266 | path template has "{id}" but utoipa params() does not declare it |
| 802 | REQUEST_BODY_EXTRA | PUT | `/api/wms/warehouses/{id}` | update_warehouse | svc/wms/src/modules/warehouse.rs | 266 | handler has Json<UpdateWarehouseRequest> parameter but utoipa declares no request_body |
| 803 | PATH_PARAM_EXTRA | DELETE | `/api/wms/warehouses/{id}` | delete_warehouse | svc/wms/src/modules/warehouse.rs | 377 | handler has Path<> extractor but utoipa declares no path params |
| 804 | PATH_PARAM_UNDECLARED | DELETE | `/api/wms/warehouses/{id}` | delete_warehouse | svc/wms/src/modules/warehouse.rs | 377 | path template has "{id}" but utoipa params() does not declare it |

## 3. 全部注解检查清单

共 715 个 utoipa::path 注解：

| # | 方法 | 路径 | handler | request_body | pathParams | queryParams | 状态 | 文件 | 行号 |
|---|------|------|---------|--------------|------------|-------------|------|------|------|
| 1 | POST | `/api/ai/generate` | generate | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 17 |
| 2 | POST | `/api/ai/validate` | validate | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 97 |
| 3 | POST | `/api/ai/complete` | complete | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 263 |
| 4 | POST | `/api/ai/summarize` | summarize | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 394 |
| 5 | GET | `/api/ai/templates` | list_templates | - | - | - | OK | svc/ai/src/handlers/ai_handlers.rs | 468 |
| 6 | POST | `/api/ai/chat` | chat | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 519 |
| 7 | POST | `/search` | ai_search | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 642 |
| 8 | POST | `/api/ai/assistant/report` | report_assistant | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 769 |
| 9 | POST | `/api/ai/assistant/flow` | flow_assistant | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 823 |
| 10 | POST | `/api/ai/assistant/anomaly/predict` | anomaly_predict | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 886 |
| 11 | POST | `/api/ai/assistant/knowledge/ask` | knowledge_ask | - | - | - | WARN | svc/ai/src/handlers/ai_handlers.rs | 934 |
| 12 | GET | `/api/ai/connectors` | list_connectors | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 13 |
| 13 | GET | `/api/ai/connectors/get` | get_connector | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 42 |
| 14 | POST | `/api/ai/connectors/create` | create_connector | - | - | - | WARN | svc/ai/src/handlers/connector_handlers.rs | 80 |
| 15 | POST | `/api/ai/connectors/update` | update_connector | - | - | - | WARN | svc/ai/src/handlers/connector_handlers.rs | 134 |
| 16 | POST | `/api/ai/connectors/delete` | delete_connector | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 194 |
| 17 | GET | `/api/ai/connectors/test` | test_connector | - | - | - | OK | svc/ai/src/handlers/connector_handlers.rs | 230 |
| 18 | POST | `/api/ai/connectors/query` | query_data | - | - | - | WARN | svc/ai/src/handlers/connector_handlers.rs | 283 |
| 19 | GET | `/` | home | - | - | - | OK | svc/ai/src/handlers/health.rs | 12 |
| 20 | GET | `/health` | health | - | - | - | OK | svc/ai/src/handlers/health.rs | 24 |
| 21 | GET | `/health/detailed` | health_check_detailed | - | - | - | OK | svc/ai/src/handlers/health.rs | 50 |
| 22 | POST | `/api/ai/agent/run` | agent_run | - | - | - | WARN | svc/ai/src/modules/agent.rs | 14 |
| 23 | GET | `/api/ai/agent/tools` | list_agent_tools | - | - | - | OK | svc/ai/src/modules/agent.rs | 32 |
| 24 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/ai/src/modules/ai_plugin.rs | 41 |
| 25 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/ai/src/modules/ai_plugin.rs | 136 |
| 26 | POST | `/api/ai/analysis/sentiment` | _analysis_sentiment | - | - | - | OK | svc/ai/src/modules/openapi.rs | 5 |
| 27 | POST | `/api/ai/analysis/classify` | _analysis_classify | - | - | - | OK | svc/ai/src/modules/openapi.rs | 27 |
| 28 | POST | `/api/ai/analysis/entities` | _analysis_entities | - | - | - | OK | svc/ai/src/modules/openapi.rs | 35 |
| 29 | POST | `/api/ai/analysis/keywords` | _analysis_keywords | - | - | - | OK | svc/ai/src/modules/openapi.rs | 43 |
| 30 | POST | `/api/ai/analysis/history` | _analysis_history | - | - | - | OK | svc/ai/src/modules/openapi.rs | 51 |
| 31 | POST | `/api/ai/code/generate` | _code_generate | - | - | - | OK | svc/ai/src/modules/openapi.rs | 60 |
| 32 | POST | `/api/ai/code/explain` | _code_explain | - | - | - | OK | svc/ai/src/modules/openapi.rs | 68 |
| 33 | POST | `/api/ai/code/fix` | _code_fix | - | - | - | OK | svc/ai/src/modules/openapi.rs | 76 |
| 34 | POST | `/api/ai/code/optimize` | _code_optimize | - | - | - | OK | svc/ai/src/modules/openapi.rs | 84 |
| 35 | POST | `/api/ai/code/review` | _code_review | - | - | - | OK | svc/ai/src/modules/openapi.rs | 92 |
| 36 | POST | `/api/ai/documents/upload` | _document_upload | - | - | - | OK | svc/ai/src/modules/openapi.rs | 101 |
| 37 | POST | `/api/ai/documents/{id}/process` | _document_process | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 109 |
| 38 | GET | `/api/ai/documents/{id}` | _document_get | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 117 |
| 39 | DELETE | `/api/ai/documents/{id}` | _document_delete | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 125 |
| 40 | GET | `/api/ai/documents` | _document_list | - | - | - | OK | svc/ai/src/modules/openapi.rs | 133 |
| 41 | POST | `/api/ai/documents/{id}/extract` | _document_extract | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 141 |
| 42 | POST | `/api/ai/documents/vectorize-from-file` | _document_vectorize_from_file | - | - | - | OK | svc/ai/src/modules/openapi.rs | 149 |
| 43 | POST | `/api/ai/documents/{id}/summarize` | _document_summarize | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 157 |
| 44 | POST | `/api/ai/documents/{id}/key-points` | _document_key_points | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 165 |
| 45 | POST | `/api/ai/documents/qa` | _document_qa | - | - | - | OK | svc/ai/src/modules/openapi.rs | 173 |
| 46 | POST | `/api/ai/embedding/generate` | _embedding_generate | - | - | - | OK | svc/ai/src/modules/openapi.rs | 182 |
| 47 | POST | `/api/ai/multimodal/image/analyze` | _multimodal_image_analyze | - | - | - | OK | svc/ai/src/modules/openapi.rs | 191 |
| 48 | POST | `/api/ai/multimodal/image/caption` | _multimodal_image_caption | - | - | - | OK | svc/ai/src/modules/openapi.rs | 199 |
| 49 | POST | `/api/ai/multimodal/image/objects` | _multimodal_image_objects | - | - | - | OK | svc/ai/src/modules/openapi.rs | 207 |
| 50 | POST | `/api/ai/multimodal/image/text` | _multimodal_image_text | - | - | - | OK | svc/ai/src/modules/openapi.rs | 215 |
| 51 | POST | `/api/ai/multimodal/image/describe` | _multimodal_image_describe | - | - | - | OK | svc/ai/src/modules/openapi.rs | 223 |
| 52 | POST | `/api/ai/multimodal/video/analyze` | _multimodal_video_analyze | - | - | - | OK | svc/ai/src/modules/openapi.rs | 231 |
| 53 | POST | `/api/ai/multimodal/video/summary` | _multimodal_video_summary | - | - | - | OK | svc/ai/src/modules/openapi.rs | 239 |
| 54 | POST | `/api/ai/qa/ask` | _qa_ask | - | - | - | OK | svc/ai/src/modules/openapi.rs | 248 |
| 55 | POST | `/api/ai/qa/ask-with-context` | _qa_ask_with_context | - | - | - | OK | svc/ai/src/modules/openapi.rs | 256 |
| 56 | POST | `/api/ai/qa/ask-structured` | _qa_ask_structured | - | - | - | OK | svc/ai/src/modules/openapi.rs | 264 |
| 57 | POST | `/api/ai/qa/ask-conversation` | _qa_ask_conversation | - | - | - | OK | svc/ai/src/modules/openapi.rs | 272 |
| 58 | POST | `/api/ai/qa/classify` | _qa_classify | - | - | - | OK | svc/ai/src/modules/openapi.rs | 280 |
| 59 | GET | `/api/ai/qa/history` | _qa_history | - | - | - | OK | svc/ai/src/modules/openapi.rs | 288 |
| 60 | DELETE | `/api/ai/qa/history/{id}` | _qa_delete_history | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 296 |
| 61 | POST | `/api/ai/qa/history/batch-delete` | _qa_batch_delete_history | - | - | - | OK | svc/ai/src/modules/openapi.rs | 304 |
| 62 | POST | `/api/ai/qa/feedback` | _qa_feedback | - | - | - | OK | svc/ai/src/modules/openapi.rs | 312 |
| 63 | POST | `/api/ai/recommend` | _recommend | - | - | - | OK | svc/ai/src/modules/openapi.rs | 321 |
| 64 | POST | `/api/ai/profile/get` | _profile_get | - | - | - | OK | svc/ai/src/modules/openapi.rs | 329 |
| 65 | POST | `/api/ai/profile/update` | _profile_update | - | - | - | OK | svc/ai/src/modules/openapi.rs | 337 |
| 66 | POST | `/api/ai/recommend/documents` | _recommend_documents | - | - | - | OK | svc/ai/src/modules/openapi.rs | 345 |
| 67 | POST | `/api/ai/recommend/opportunities` | _recommend_opportunities | - | - | - | OK | svc/ai/src/modules/openapi.rs | 353 |
| 68 | POST | `/api/ai/recommend/knowledge` | _recommend_knowledge | - | - | - | OK | svc/ai/src/modules/openapi.rs | 361 |
| 69 | POST | `/api/ai/vectors/store` | _vector_store | - | - | - | OK | svc/ai/src/modules/openapi.rs | 370 |
| 70 | POST | `/api/ai/vectors/search` | _vector_search | - | - | - | OK | svc/ai/src/modules/openapi.rs | 378 |
| 71 | GET | `/api/ai/vectors/{id}` | _vector_get | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 386 |
| 72 | DELETE | `/api/ai/vectors/{id}` | _vector_delete | - | - | - | WARN | svc/ai/src/modules/openapi.rs | 394 |
| 73 | POST | `/api/ai/vectors/batch-store` | _vector_batch_store | - | - | - | OK | svc/ai/src/modules/openapi.rs | 402 |
| 74 | POST | `/api/ai/vectors/hybrid-search` | _vector_hybrid_search | - | - | - | OK | svc/ai/src/modules/openapi.rs | 410 |
| 75 | GET | `/api/ai/vectors/stats` | _vector_stats | - | - | - | OK | svc/ai/src/modules/openapi.rs | 418 |
| 76 | POST | `/api/ai/vectors/clear` | _vector_clear | - | - | - | OK | svc/ai/src/modules/openapi.rs | 426 |
| 77 | - | `-` | - | - | - | - | OK | svc/ai/src/routes.rs | 25 |
| 78 | GET | `/api/bi/analysis` | list_analyses | - | - | - | OK | svc/analytics/src/modules/bi/analysis.rs | 7 |
| 79 | POST | `/api/bi/analysis` | create_analysis | serde_json | - | - | ERROR | svc/analytics/src/modules/bi/analysis.rs | 27 |
| 80 | GET | `/api/bi/analysis/{id}` | get_analysis | - | id | - | ERROR | svc/analytics/src/modules/bi/analysis.rs | 48 |
| 81 | POST | `/api/bi/analysis/{id}/execute` | execute_analysis | serde_json | id | - | ERROR | svc/analytics/src/modules/bi/analysis.rs | 69 |
| 82 | GET | `/dashboard` | list_dashboards | - | - | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 16 |
| 83 | POST | `/dashboard` | create_dashboard | CreateDashboardRequest | - | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 72 |
| 84 | GET | `/dashboard/{id}` | get_dashboard | - | id | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 130 |
| 85 | PUT | `/dashboard/{id}` | update_dashboard | UpdateDashboardRequest | id | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 190 |
| 86 | DELETE | `/dashboard/{id}` | delete_dashboard | - | id | - | OK | svc/analytics/src/modules/bi/dashboard/crud.rs | 259 |
| 87 | GET | `/report` | list_reports | - | - | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 72 |
| 88 | POST | `/report` | create_report | serde_json | - | - | ERROR | svc/analytics/src/modules/bi/self_service_report.rs | 131 |
| 89 | GET | `/report/{id}` | get_report | - | id | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 197 |
| 90 | PUT | `/report/{id}` | update_report | serde_json | id | - | ERROR | svc/analytics/src/modules/bi/self_service_report.rs | 260 |
| 91 | DELETE | `/report/{id}` | delete_report | - | id | - | OK | svc/analytics/src/modules/bi/self_service_report.rs | 338 |
| 92 | GET | `/widget` | list_widgets | - | - | - | OK | svc/analytics/src/modules/bi/widget.rs | 135 |
| 93 | POST | `/widget` | create_widget | serde_json | - | - | ERROR | svc/analytics/src/modules/bi/widget.rs | 249 |
| 94 | GET | `/widget/{id}` | get_widget | - | id | - | OK | svc/analytics/src/modules/bi/widget.rs | 317 |
| 95 | PUT | `/widget/{id}` | update_widget | serde_json | id | - | ERROR | svc/analytics/src/modules/bi/widget.rs | 380 |
| 96 | DELETE | `/widget/{id}` | delete_widget | - | id | - | OK | svc/analytics/src/modules/bi/widget.rs | 462 |
| 97 | - | `-` | - | - | - | - | OK | svc/billing/src/openapi.rs | 3 |
| 98 | GET | `/contacts` | list_contacts | - | - | page, page_size, search, customer_id | OK | svc/crm/src/modules/contact.rs | 44 |
| 99 | POST | `/contacts` | create_contact | CreateContactRequest | - | - | OK | svc/crm/src/modules/contact.rs | 137 |
| 100 | GET | `/customers` | list_customers | - | - | page, page_size, search, status, customer_type, rating, industry | OK | svc/crm/src/modules/customer.rs | 61 |
| 101 | POST | `/customers` | create_customer | CreateCustomerRequest | - | - | OK | svc/crm/src/modules/customer.rs | 165 |
| 102 | GET | `/customers/{id}` | get_customer | - | id | - | OK | svc/crm/src/modules/customer.rs | 323 |
| 103 | GET | `/opportunities` | list_opportunities | - | - | page, page_size, search, stage, customer_id | OK | svc/crm/src/modules/opportunity.rs | 99 |
| 104 | GET | `/api/ehs/incidents` | list_accidents | - | - | - | OK | svc/ehs/src/modules/accident.rs | 213 |
| 105 | POST | `/api/ehs/incidents` | report_accident | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 232 |
| 106 | GET | `/api/ehs/incidents/{id}` | get_accident | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 272 |
| 107 | PUT | `/api/ehs/incidents/{id}` | update_accident | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 342 |
| 108 | DELETE | `/api/ehs/incidents/{id}` | delete_accident | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 380 |
| 109 | POST | `/api/ehs/incidents/{id}/investigation` | start_investigation | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 397 |
| 110 | PUT | `/api/ehs/incidents/{id}/investigation` | update_investigation | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 432 |
| 111 | POST | `/api/ehs/incidents/{id}/investigation/complete` | complete_investigation | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 474 |
| 112 | POST | `/api/ehs/incidents/{id}/treatment` | create_treatment | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 525 |
| 113 | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | update_treatment_action | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 574 |
| 114 | POST | `/api/ehs/incidents/{id}/treatment/complete` | complete_treatment | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 609 |
| 115 | POST | `/api/ehs/incidents/{id}/review` | create_review | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 662 |
| 116 | POST | `/api/ehs/incidents/{id}/close` | close_accident | - | - | - | WARN | svc/ehs/src/modules/accident.rs | 694 |
| 117 | GET | `/api/ehs/sync-records` | list_sync_records | - | - | - | OK | svc/ehs/src/modules/data_sync.rs | 73 |
| 118 | GET | `/api/ehs/sync-records/{id}` | get_sync_record | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 146 |
| 119 | POST | `/api/ehs/sync/hazard-to-qms` | sync_hazard_to_qms | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 193 |
| 120 | POST | `/api/ehs/sync/accident-to-lims` | sync_accident_to_lims | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 293 |
| 121 | POST | `/api/ehs/sync-records/{id}/retry` | retry_sync | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 398 |
| 122 | DELETE | `/api/ehs/sync-records/{id}` | delete_sync_record | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 445 |
| 123 | GET | `/api/ehs/sync/configs` | list_sync_configs | - | - | - | OK | svc/ehs/src/modules/data_sync.rs | 485 |
| 124 | PUT | `/api/ehs/sync/configs` | update_sync_configs | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 514 |
| 125 | POST | `/api/ehs/sync/retry` | batch_retry_sync | - | - | - | WARN | svc/ehs/src/modules/data_sync.rs | 564 |
| 126 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/ehs/src/modules/ehs_plugin.rs | 42 |
| 127 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/ehs/src/modules/ehs_plugin.rs | 174 |
| 128 | GET | `/api/ehs/drills/plans` | list_drill_plans | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 274 |
| 129 | POST | `/api/ehs/drills/plans` | create_drill_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 293 |
| 130 | GET | `/api/ehs/drills/plans/{id}` | get_drill_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 334 |
| 131 | PUT | `/api/ehs/drills/plans/{id}` | update_drill_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 372 |
| 132 | DELETE | `/api/ehs/drills/plans/{id}` | delete_drill_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 413 |
| 133 | GET | `/api/ehs/drills/records` | list_drill_records | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 430 |
| 134 | POST | `/api/ehs/drills/records` | create_drill_record | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 449 |
| 135 | GET | `/api/ehs/drills/records/{id}` | get_drill_record | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 494 |
| 136 | PUT | `/api/ehs/drills/records/{id}` | update_drill_record | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 573 |
| 137 | DELETE | `/api/ehs/drills/records/{id}` | delete_drill_record | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 618 |
| 138 | POST | `/api/ehs/drills/records/{id}/evaluation` | create_drill_evaluation | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 635 |
| 139 | GET | `/api/ehs/drills/records/{id}/problems` | list_drill_problems | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 671 |
| 140 | POST | `/api/ehs/drills/records/{id}/problems` | create_drill_problem | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 691 |
| 141 | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | update_drill_problem | - | - | - | WARN | svc/ehs/src/modules/emergency_drill.rs | 729 |
| 142 | GET | `/api/ehs/drills/statistics` | get_drill_statistics | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 784 |
| 143 | GET | `/api/ehs/drills/types` | list_drill_types | - | - | - | OK | svc/ehs/src/modules/emergency_drill.rs | 827 |
| 144 | GET | `/api/ehs/emergency-plans` | list_plans | - | - | - | OK | svc/ehs/src/modules/emergency_plan.rs | 195 |
| 145 | POST | `/api/ehs/emergency-plans` | create_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 214 |
| 146 | GET | `/api/ehs/emergency-plans/{id}` | get_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 260 |
| 147 | PUT | `/api/ehs/emergency-plans/{id}` | update_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 373 |
| 148 | DELETE | `/api/ehs/emergency-plans/{id}` | delete_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 417 |
| 149 | GET | `/api/ehs/emergency-plans/{id}/supplies` | list_plan_supplies | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 434 |
| 150 | POST | `/api/ehs/emergency-plans/{id}/supplies` | add_plan_supply | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 454 |
| 151 | DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | delete_plan_supply | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 488 |
| 152 | POST | `/api/ehs/emergency-plans/{id}/submit-approval` | submit_plan_approval | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 505 |
| 153 | POST | `/api/ehs/emergency-plans/{id}/approve` | approve_plan | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 549 |
| 154 | GET | `/api/ehs/emergency-plans/{id}/versions` | list_plan_versions | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 581 |
| 155 | POST | `/api/ehs/emergency-plans/{id}/versions` | create_new_version | - | - | - | WARN | svc/ehs/src/modules/emergency_plan.rs | 601 |
| 156 | GET | `/api/ehs/emergency-plans/categories` | list_plan_categories | - | - | - | OK | svc/ehs/src/modules/emergency_plan.rs | 635 |
| 157 | GET | `/api/ehs/environment/records` | list_records | - | - | - | OK | svc/ehs/src/modules/environment.rs | 59 |
| 158 | POST | `/api/ehs/environment/records` | create_record | - | - | - | WARN | svc/ehs/src/modules/environment.rs | 78 |
| 159 | GET | `/api/ehs/environmental-compliance/regulations` | list_regulations | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 383 |
| 160 | POST | `/api/ehs/environmental-compliance/regulations` | create_regulation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 402 |
| 161 | GET | `/api/ehs/environmental-compliance/regulations/{id}` | get_regulation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 445 |
| 162 | PUT | `/api/ehs/environmental-compliance/regulations/{id}` | update_regulation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 487 |
| 163 | DELETE | `/api/ehs/environmental-compliance/regulations/{id}` | delete_regulation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 530 |
| 164 | GET | `/api/ehs/environmental-compliance/evaluations` | list_evaluations | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 547 |
| 165 | POST | `/api/ehs/environmental-compliance/evaluations` | create_evaluation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 566 |
| 166 | GET | `/api/ehs/environmental-compliance/evaluations/{id}` | get_evaluation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 609 |
| 167 | PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | update_evaluation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 649 |
| 168 | DELETE | `/api/ehs/environmental-compliance/evaluations/{id}` | delete_evaluation | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 700 |
| 169 | GET | `/api/ehs/environmental-compliance/monitoring` | list_monitor_records | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 717 |
| 170 | POST | `/api/ehs/environmental-compliance/monitoring` | create_monitor_record | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 736 |
| 171 | GET | `/api/ehs/environmental-compliance/monitoring/{id}` | get_monitor_record | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 782 |
| 172 | DELETE | `/api/ehs/environmental-compliance/monitoring/{id}` | delete_monitor_record | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 825 |
| 173 | GET | `/api/ehs/environmental-compliance/permits` | list_permits | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 842 |
| 174 | POST | `/api/ehs/environmental-compliance/permits` | create_permit | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 861 |
| 175 | GET | `/api/ehs/environmental-compliance/permits/{id}` | get_permit | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 905 |
| 176 | PUT | `/api/ehs/environmental-compliance/permits/{id}` | update_permit | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 950 |
| 177 | DELETE | `/api/ehs/environmental-compliance/permits/{id}` | delete_permit | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 992 |
| 178 | GET | `/api/ehs/environmental-compliance/incidents` | list_incidents | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1009 |
| 179 | POST | `/api/ehs/environmental-compliance/incidents` | create_incident | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 1028 |
| 180 | GET | `/api/ehs/environmental-compliance/incidents/{id}` | get_incident | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 1076 |
| 181 | PUT | `/api/ehs/environmental-compliance/incidents/{id}` | update_incident | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 1121 |
| 182 | DELETE | `/api/ehs/environmental-compliance/incidents/{id}` | delete_incident | - | - | - | WARN | svc/ehs/src/modules/environmental_compliance.rs | 1177 |
| 183 | GET | `/api/ehs/environmental-compliance/statistics` | get_compliance_statistics | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1194 |
| 184 | GET | `/api/ehs/environmental-compliance/regulations/categories` | list_regulation_categories | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1237 |
| 185 | GET | `/api/ehs/environmental-compliance/monitoring/types` | list_monitor_types | - | - | - | OK | svc/ehs/src/modules/environmental_compliance.rs | 1261 |
| 186 | GET | `/api/ehs/issues` | list_hazards | - | - | - | OK | svc/ehs/src/modules/hazard.rs | 184 |
| 187 | POST | `/api/ehs/issues` | create_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 226 |
| 188 | GET | `/api/ehs/issues/{id}` | get_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 335 |
| 189 | PUT | `/api/ehs/issues/{id}` | update_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 405 |
| 190 | DELETE | `/api/ehs/issues/{id}` | delete_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 451 |
| 191 | POST | `/api/ehs/issues/{id}/rectification` | start_rectification | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 474 |
| 192 | PUT | `/api/ehs/issues/{id}/rectification` | update_rectification | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 509 |
| 193 | POST | `/api/ehs/issues/{id}/rectification/submit` | submit_rectification | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 562 |
| 194 | POST | `/api/ehs/issues/{id}/verification` | verify_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 596 |
| 195 | POST | `/api/ehs/issues/{id}/close` | close_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 627 |
| 196 | POST | `/api/ehs/issues/{id}/approval/start` | start_hazard_approval | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 677 |
| 197 | POST | `/api/ehs/issues/{id}/approval/approve` | approve_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 741 |
| 198 | POST | `/api/ehs/issues/{id}/approval/reject` | reject_hazard | - | - | - | WARN | svc/ehs/src/modules/hazard.rs | 781 |
| 199 | GET | `/api/ehs/hazardous-materials` | list_materials | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 288 |
| 200 | POST | `/api/ehs/hazardous-materials` | create_material | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 307 |
| 201 | GET | `/api/ehs/hazardous-materials/{id}` | get_material | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 357 |
| 202 | PUT | `/api/ehs/hazardous-materials/{id}` | update_material | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 472 |
| 203 | DELETE | `/api/ehs/hazardous-materials/{id}` | delete_material | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 520 |
| 204 | GET | `/api/ehs/hazardous-materials/{id}/stocks` | list_material_stocks | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 537 |
| 205 | GET | `/api/ehs/hazardous-materials/stock-records` | list_stock_records | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 557 |
| 206 | POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | create_stock_in | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 576 |
| 207 | POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | create_stock_out | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 618 |
| 208 | GET | `/api/ehs/hazardous-materials/stock-records/{id}` | get_stock_record | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 660 |
| 209 | GET | `/api/ehs/hazardous-materials/{id}/msds` | get_material_msds | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 699 |
| 210 | PUT | `/api/ehs/hazardous-materials/{id}/msds` | update_material_msds | - | - | - | WARN | svc/ehs/src/modules/hazardous_material.rs | 744 |
| 211 | GET | `/api/ehs/hazardous-materials/statistics` | get_material_statistics | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 788 |
| 212 | GET | `/api/ehs/hazardous-materials/categories` | list_material_categories | - | - | - | OK | svc/ehs/src/modules/hazardous_material.rs | 835 |
| 213 | GET | `/api/ehs/health` | list_records | - | - | - | OK | svc/ehs/src/modules/health.rs | 50 |
| 214 | POST | `/api/ehs/health` | create_record | - | - | - | WARN | svc/ehs/src/modules/health.rs | 69 |
| 215 | GET | `/api/ehs/occupational-disease/factors` | list_hazard_factors | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 340 |
| 216 | POST | `/api/ehs/occupational-disease/factors` | create_hazard_factor | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 359 |
| 217 | GET | `/api/ehs/occupational-disease/factors/{id}` | get_hazard_factor | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 401 |
| 218 | PUT | `/api/ehs/occupational-disease/factors/{id}` | update_hazard_factor | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 440 |
| 219 | DELETE | `/api/ehs/occupational-disease/factors/{id}` | delete_hazard_factor | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 480 |
| 220 | GET | `/api/ehs/occupational-disease/detections` | list_detection_records | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 497 |
| 221 | POST | `/api/ehs/occupational-disease/detections` | create_detection_record | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 516 |
| 222 | GET | `/api/ehs/occupational-disease/detections/{id}` | get_detection_record | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 561 |
| 223 | DELETE | `/api/ehs/occupational-disease/detections/{id}` | delete_detection_record | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 603 |
| 224 | GET | `/api/ehs/occupational-disease/cases` | list_disease_cases | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 620 |
| 225 | POST | `/api/ehs/occupational-disease/cases` | create_disease_case | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 639 |
| 226 | GET | `/api/ehs/occupational-disease/cases/{id}` | get_disease_case | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 686 |
| 227 | PUT | `/api/ehs/occupational-disease/cases/{id}` | update_disease_case | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 730 |
| 228 | DELETE | `/api/ehs/occupational-disease/cases/{id}` | delete_disease_case | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 782 |
| 229 | GET | `/api/ehs/occupational-disease/protection-measures` | list_protection_measures | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 799 |
| 230 | POST | `/api/ehs/occupational-disease/protection-measures` | create_protection_measure | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 818 |
| 231 | GET | `/api/ehs/occupational-disease/protection-measures/{id}` | get_protection_measure | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 859 |
| 232 | PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | update_protection_measure | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 897 |
| 233 | DELETE | `/api/ehs/occupational-disease/protection-measures/{id}` | delete_protection_measure | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 946 |
| 234 | GET | `/api/ehs/occupational-disease/trainings` | list_health_trainings | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 963 |
| 235 | POST | `/api/ehs/occupational-disease/trainings` | create_health_training | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 982 |
| 236 | GET | `/api/ehs/occupational-disease/trainings/{id}` | get_health_training | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 1023 |
| 237 | DELETE | `/api/ehs/occupational-disease/trainings/{id}` | delete_health_training | - | - | - | WARN | svc/ehs/src/modules/occupational_disease.rs | 1061 |
| 238 | GET | `/api/ehs/occupational-disease/statistics` | get_disease_statistics | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1078 |
| 239 | GET | `/api/ehs/occupational-disease/factor-types` | list_factor_types | - | - | - | OK | svc/ehs/src/modules/occupational_disease.rs | 1119 |
| 240 | GET | `/api/ehs/occupational-health/exam-plans` | list_exam_plans | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 336 |
| 241 | POST | `/api/ehs/occupational-health/exam-plans` | create_exam_plan | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 355 |
| 242 | GET | `/api/ehs/occupational-health/exam-plans/{id}` | get_exam_plan | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 395 |
| 243 | PUT | `/api/ehs/occupational-health/exam-plans/{id}` | update_exam_plan | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 432 |
| 244 | DELETE | `/api/ehs/occupational-health/exam-plans/{id}` | delete_exam_plan | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 472 |
| 245 | GET | `/api/ehs/occupational-health/exam-records` | list_exam_records | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 489 |
| 246 | POST | `/api/ehs/occupational-health/exam-records` | create_exam_record | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 508 |
| 247 | GET | `/api/ehs/occupational-health/exam-records/{id}` | get_exam_record | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 563 |
| 248 | PUT | `/api/ehs/occupational-health/exam-records/{id}` | update_exam_record | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 615 |
| 249 | DELETE | `/api/ehs/occupational-health/exam-records/{id}` | delete_exam_record | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 668 |
| 250 | GET | `/api/ehs/occupational-health/archives/{employee_id}` | get_health_archive | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 685 |
| 251 | GET | `/api/ehs/occupational-health/contraindications` | list_contraindications | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 718 |
| 252 | POST | `/api/ehs/occupational-health/contraindications` | create_contraindication | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 737 |
| 253 | PUT | `/api/ehs/occupational-health/contraindications/{id}` | update_contraindication | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 776 |
| 254 | DELETE | `/api/ehs/occupational-health/contraindications/{id}` | delete_contraindication | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 818 |
| 255 | GET | `/api/ehs/occupational-health/abnormalities` | list_abnormalities | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 835 |
| 256 | PUT | `/api/ehs/occupational-health/abnormalities/{id}` | update_abnormality | - | - | - | WARN | svc/ehs/src/modules/occupational_health.rs | 854 |
| 257 | GET | `/api/ehs/occupational-health/statistics` | get_health_statistics | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 893 |
| 258 | GET | `/api/ehs/occupational-health/exam-types` | list_exam_types | - | - | - | OK | svc/ehs/src/modules/occupational_health.rs | 932 |
| 259 | GET | `/` | _home | - | - | - | OK | svc/ehs/src/modules/openapi.rs | 6 |
| 260 | GET | `/health` | _health | - | - | - | OK | svc/ehs/src/modules/openapi.rs | 29 |
| 261 | GET | `/api/health/detailed` | _detailed_health | - | - | - | OK | svc/ehs/src/modules/openapi.rs | 37 |
| 262 | GET | `/api/ehs/hazards` | list_risks | - | - | - | OK | svc/ehs/src/modules/risk.rs | 82 |
| 263 | POST | `/api/ehs/hazards` | create_risk | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 98 |
| 264 | GET | `/api/ehs/hazards/{id}` | get_risk | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 135 |
| 265 | PUT | `/api/ehs/hazards/{id}` | update_risk | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 169 |
| 266 | POST | `/api/ehs/hazards/{id}/assessments` | assess_risk | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 204 |
| 267 | DELETE | `/api/ehs/hazards/{id}` | delete_risk | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 239 |
| 268 | GET | `/api/ehs/hazards/{id}/controls` | list_control_measures | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 256 |
| 269 | POST | `/api/ehs/hazards/{id}/controls` | create_control_measure | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 299 |
| 270 | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | update_control_measure | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 340 |
| 271 | DELETE | `/api/ehs/hazards/{id}/controls/{measure_id}` | delete_control_measure | - | - | - | WARN | svc/ehs/src/modules/risk.rs | 390 |
| 272 | GET | `/api/ehs/checks/plans` | list_plans | - | - | - | OK | svc/ehs/src/modules/safety.rs | 186 |
| 273 | POST | `/api/ehs/checks/plans` | create_plan | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 205 |
| 274 | GET | `/api/ehs/checks/plans/{id}` | get_plan | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 242 |
| 275 | PUT | `/api/ehs/checks/plans/{id}` | update_plan | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 277 |
| 276 | DELETE | `/api/ehs/checks/plans/{id}` | delete_plan | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 313 |
| 277 | GET | `/api/ehs/checks/plans/{plan_id}/items` | list_plan_items | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 330 |
| 278 | POST | `/api/ehs/checks/plans/{plan_id}/items` | create_plan_item | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 387 |
| 279 | DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | delete_plan_item | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 422 |
| 280 | GET | `/api/ehs/checks/records` | list_records | - | - | - | OK | svc/ehs/src/modules/safety.rs | 439 |
| 281 | POST | `/api/ehs/checks/records` | create_record | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 458 |
| 282 | GET | `/api/ehs/checks/records/{id}` | get_record | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 507 |
| 283 | PUT | `/api/ehs/checks/records/{id}` | update_record | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 571 |
| 284 | DELETE | `/api/ehs/checks/records/{id}` | delete_record | - | - | - | WARN | svc/ehs/src/modules/safety.rs | 609 |
| 285 | GET | `/api/ehs/training` | list_trainings | - | - | - | OK | svc/ehs/src/modules/training.rs | 133 |
| 286 | POST | `/api/ehs/training` | create_training | - | - | - | WARN | svc/ehs/src/modules/training.rs | 152 |
| 287 | GET | `/api/ehs/training/{id}` | get_training | - | - | - | WARN | svc/ehs/src/modules/training.rs | 187 |
| 288 | PUT | `/api/ehs/training/{id}` | update_training | - | - | - | WARN | svc/ehs/src/modules/training.rs | 219 |
| 289 | DELETE | `/api/ehs/training/{id}` | delete_training | - | - | - | WARN | svc/ehs/src/modules/training.rs | 272 |
| 290 | GET | `/api/ehs/training/plans` | list_training_plans | - | - | - | OK | svc/ehs/src/modules/training.rs | 289 |
| 291 | POST | `/api/ehs/training/plans` | create_training_plan | - | - | - | WARN | svc/ehs/src/modules/training.rs | 308 |
| 292 | GET | `/api/ehs/training/plans/{id}` | get_training_plan | - | - | - | WARN | svc/ehs/src/modules/training.rs | 356 |
| 293 | PUT | `/api/ehs/training/plans/{id}` | update_training_plan | - | - | - | WARN | svc/ehs/src/modules/training.rs | 388 |
| 294 | DELETE | `/api/ehs/training/plans/{id}` | delete_training_plan | - | - | - | WARN | svc/ehs/src/modules/training.rs | 438 |
| 295 | GET | `/api/ehs/training/records` | list_training_records | - | - | - | OK | svc/ehs/src/modules/training.rs | 455 |
| 296 | POST | `/api/ehs/training/records` | create_training_record | - | - | - | WARN | svc/ehs/src/modules/training.rs | 474 |
| 297 | GET | `/api/ehs/training/records/{id}` | get_training_record | - | - | - | WARN | svc/ehs/src/modules/training.rs | 525 |
| 298 | PUT | `/api/ehs/training/records/{id}` | update_training_record | - | - | - | WARN | svc/ehs/src/modules/training.rs | 557 |
| 299 | DELETE | `/api/ehs/training/records/{id}` | delete_training_record | - | - | - | WARN | svc/ehs/src/modules/training.rs | 610 |
| 300 | GET | `/api/ehs/training/certificates` | list_certificates | - | - | - | OK | svc/ehs/src/modules/training.rs | 627 |
| 301 | POST | `/api/ehs/training/certificates` | create_certificate | - | - | - | WARN | svc/ehs/src/modules/training.rs | 646 |
| 302 | GET | `/api/ehs/training/certificates/{id}` | get_certificate | - | - | - | WARN | svc/ehs/src/modules/training.rs | 691 |
| 303 | PUT | `/api/ehs/training/certificates/{id}` | update_certificate | - | - | - | WARN | svc/ehs/src/modules/training.rs | 722 |
| 304 | DELETE | `/api/ehs/training/certificates/{id}` | delete_certificate | - | - | - | WARN | svc/ehs/src/modules/training.rs | 769 |
| 305 | GET | `/assets` | list_assets | - | - | page, page_size, search, status | OK | svc/erp/src/modules/asset.rs | 27 |
| 306 | POST | `/assets` | create_asset | CreateAssetRequest | - | - | OK | svc/erp/src/modules/asset.rs | 104 |
| 307 | GET | `/assets/{id}` | get_asset | - | id | - | OK | svc/erp/src/modules/asset.rs | 212 |
| 308 | GET | `/erp/customers` | list_customers | - | - | - | OK | svc/erp/src/modules/customer.rs | 37 |
| 309 | GET | `/erp/customers/{id}` | get_customer | - | - | - | WARN | svc/erp/src/modules/customer.rs | 125 |
| 310 | POST | `/erp/customers` | create_customer | - | - | - | WARN | svc/erp/src/modules/customer.rs | 159 |
| 311 | PUT | `/erp/customers/{id}` | update_customer | - | - | - | WARN | svc/erp/src/modules/customer.rs | 207 |
| 312 | DELETE | `/erp/customers/{id}` | delete_customer | - | - | - | WARN | svc/erp/src/modules/customer.rs | 256 |
| 313 | GET | `/erp/inventory` | list_inventory | - | - | - | OK | svc/erp/src/modules/inventory.rs | 28 |
| 314 | GET | `/erp/inventory/{id}` | get_inventory | - | - | - | WARN | svc/erp/src/modules/inventory.rs | 108 |
| 315 | POST | `/erp/inventory` | create_inventory | - | - | - | WARN | svc/erp/src/modules/inventory.rs | 142 |
| 316 | GET | `/materials` | list_materials | - | - | page, pagesize, search, status, category | OK | svc/erp/src/modules/material.rs | 36 |
| 317 | POST | `/materials` | create_material | CreateMaterialRequest | - | - | OK | svc/erp/src/modules/material.rs | 158 |
| 318 | GET | `/erp/meeting-rooms` | list_rooms | - | - | - | OK | svc/erp/src/modules/meeting_room.rs | 45 |
| 319 | POST | `/erp/meeting-rooms` | create_room | - | - | - | WARN | svc/erp/src/modules/meeting_room.rs | 109 |
| 320 | GET | `/erp/meeting-rooms/{id}` | get_room | - | - | - | WARN | svc/erp/src/modules/meeting_room.rs | 190 |
| 321 | GET | `/erp/meeting-rooms/bookings` | list_bookings | - | - | - | OK | svc/erp/src/modules/meeting_room.rs | 369 |
| 322 | POST | `/erp/meeting-rooms/bookings` | create_booking | - | - | - | WARN | svc/erp/src/modules/meeting_room.rs | 433 |
| 323 | - | `-` | extract_openapi_spec | - | - | - | OK | svc/erp/src/modules/openapi.rs | 245 |
| 324 | GET | `/erp/purchase-orders` | list_purchase_orders | - | - | - | OK | svc/erp/src/modules/purchase_order.rs | 35 |
| 325 | GET | `/erp/purchase-orders/{id}` | get_purchase_order | - | - | - | WARN | svc/erp/src/modules/purchase_order.rs | 115 |
| 326 | POST | `/erp/purchase-orders` | create_purchase_order | - | - | - | WARN | svc/erp/src/modules/purchase_order.rs | 149 |
| 327 | POST | `/erp/purchase-orders/{id}/approve` | approve_purchase_order | - | - | - | WARN | svc/erp/src/modules/purchase_order.rs | 284 |
| 328 | GET | `/erp/sales-orders` | list_sales_orders | - | - | - | OK | svc/erp/src/modules/sales_order.rs | 31 |
| 329 | GET | `/erp/sales-orders/{id}` | get_sales_order | - | - | - | WARN | svc/erp/src/modules/sales_order.rs | 111 |
| 330 | POST | `/erp/sales-orders` | create_sales_order | - | - | - | WARN | svc/erp/src/modules/sales_order.rs | 145 |
| 331 | GET | `/erp/suppliers` | list_suppliers | - | - | - | OK | svc/erp/src/modules/supplier.rs | 44 |
| 332 | GET | `/erp/suppliers/{id}` | get_supplier | - | - | - | WARN | svc/erp/src/modules/supplier.rs | 132 |
| 333 | POST | `/erp/suppliers` | create_supplier | - | - | - | WARN | svc/erp/src/modules/supplier.rs | 166 |
| 334 | PUT | `/erp/suppliers/{id}` | update_supplier | - | - | - | WARN | svc/erp/src/modules/supplier.rs | 213 |
| 335 | DELETE | `/erp/suppliers/{id}` | delete_supplier | - | - | - | WARN | svc/erp/src/modules/supplier.rs | 261 |
| 336 | POST | `/api/feedback/feedbacks` | create_feedback | - | - | - | WARN | svc/feedback/src/handlers.rs | 61 |
| 337 | GET | `/api/feedback/feedbacks/{id}` | get_feedback | - | - | - | WARN | svc/feedback/src/handlers.rs | 97 |
| 338 | GET | `/api/feedback/feedbacks` | list_feedbacks | - | - | - | OK | svc/feedback/src/handlers.rs | 127 |
| 339 | PUT | `/api/feedback/feedbacks/{id}` | response_feedback | - | - | - | WARN | svc/feedback/src/handlers.rs | 213 |
| 340 | DELETE | `/api/feedback/feedbacks/{id}` | delete_feedback | - | - | - | WARN | svc/feedback/src/handlers.rs | 250 |
| 341 | POST | `/accounts` | create_account | CreateAccountRequest | - | - | OK | svc/finance/src/modules/mod.rs | 149 |
| 342 | GET | `/accounts/{account_id}` | get_account | - | account_id | - | OK | svc/finance/src/modules/mod.rs | 172 |
| 343 | GET | `/accounts` | list_accounts | - | - | - | OK | svc/finance/src/modules/mod.rs | 234 |
| 344 | POST | `/vouchers` | create_voucher | CreateVoucherRequest | - | - | OK | svc/finance/src/modules/mod.rs | 257 |
| 345 | GET | `/vouchers/{voucher_id}` | get_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 281 |
| 346 | GET | `/vouchers` | list_vouchers | - | - | - | OK | svc/finance/src/modules/mod.rs | 307 |
| 347 | POST | `/vouchers/{voucher_id}/submit` | submit_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 343 |
| 348 | POST | `/vouchers/{voucher_id}/approve` | approve_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 368 |
| 349 | POST | `/vouchers/{voucher_id}/post` | post_voucher | - | voucher_id | - | OK | svc/finance/src/modules/mod.rs | 397 |
| 350 | GET | `/ledger` | get_ledger | - | - | - | OK | svc/finance/src/modules/mod.rs | 473 |
| 351 | GET | `/trial-balance/{period}` | get_trial_balance | - | period | - | OK | svc/finance/src/modules/mod.rs | 504 |
| 352 | GET | `/balance-sheet/{period}` | get_balance_sheet | - | period | - | OK | svc/finance/src/modules/mod.rs | 529 |
| 353 | GET | `/income-statement/{period}` | get_income_statement | - | period | - | OK | svc/finance/src/modules/mod.rs | 554 |
| 354 | POST | `/voucher-templates/{template_id}/copy` | copy_template | CopyTemplateRequest | - | - | WARN | svc/finance/src/modules/voucher_template.rs | 72 |
| 355 | PUT | `/voucher-templates/{template_id}/toggle` | toggle_template | ToggleTemplateRequest | - | - | WARN | svc/finance/src/modules/voucher_template.rs | 131 |
| 356 | POST | `/voucher-templates/match` | match_template | MatchTemplateRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 182 |
| 357 | GET | `/voucher-templates/{template_id}/usage-stats` | get_usage_stats | - | - | - | WARN | svc/finance/src/modules/voucher_template.rs | 251 |
| 358 | GET | `/voucher-templates/{template_id}/export` | export_template | - | - | - | WARN | svc/finance/src/modules/voucher_template.rs | 287 |
| 359 | POST | `/voucher-templates/import` | import_template | - | - | - | OK | svc/finance/src/modules/voucher_template.rs | 324 |
| 360 | PUT | `/voucher-generation-rules/{rule_id}/toggle` | toggle_generate_rule | ToggleRuleRequest | rule_id | - | OK | svc/finance/src/modules/voucher_template.rs | 383 |
| 361 | POST | `/voucher/generate/preview` | preview_generation | PreviewGenerationRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 603 |
| 362 | POST | `/voucher/generate/from-source` | generate_from_source | GenerateFromSourceRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 689 |
| 363 | POST | `/voucher/generate/batch` | batch_generate | BatchGenerateRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 791 |
| 364 | POST | `/voucher/generate/auto` | auto_generate | AutoGenerateRequest | - | - | OK | svc/finance/src/modules/voucher_template.rs | 846 |
| 365 | POST | `/voucher/generate/regenerate/{original_voucher_id}` | regenerate | - | original_voucher_id | - | OK | svc/finance/src/modules/voucher_template.rs | 922 |
| 366 | GET | `/voucher-templates/{template_id}/entries` | list_entries | - | - | - | WARN | svc/finance/src/modules/voucher_template_entries.rs | 55 |
| 367 | GET | `/voucher-templates/{template_id}/entries/{entry_id}` | get_entry | - | - | - | WARN | svc/finance/src/modules/voucher_template_entries.rs | 89 |
| 368 | POST | `/voucher-templates/{template_id}/entries` | create_entry | AddTemplateEntryRequest | - | - | WARN | svc/finance/src/modules/voucher_template_entries.rs | 121 |
| 369 | PUT | `/voucher-templates/{template_id}/entries/{entry_id}` | update_entry | UpdateTemplateEntryRequest | - | - | WARN | svc/finance/src/modules/voucher_template_entries.rs | 188 |
| 370 | DELETE | `/voucher-templates/{template_id}/entries/{entry_id}` | delete_entry | - | - | - | WARN | svc/finance/src/modules/voucher_template_entries.rs | 254 |
| 371 | PUT | `/voucher-templates/{template_id}/entries/reorder` | reorder_entries | ReorderEntriesRequest | - | - | WARN | svc/finance/src/modules/voucher_template_entries.rs | 293 |
| 372 | GET | `/devices` | list_devices | - | - | - | OK | svc/gis/src/modules/device.rs | 97 |
| 373 | GET | `/devices/{id}` | get_device | - | id | - | OK | svc/gis/src/modules/device.rs | 123 |
| 374 | POST | `/locations/create` | create_location | serde_json | - | - | ERROR | svc/gis/src/modules/location.rs | 59 |
| 375 | GET | `/locations` | list_locations | - | - | - | OK | svc/gis/src/modules/location.rs | 101 |
| 376 | GET | `/locations/{id}` | get_location | - | id | - | OK | svc/gis/src/modules/location.rs | 129 |
| 377 | POST | `/maps/create` | create_map | serde_json | - | - | ERROR | svc/gis/src/modules/map.rs | 73 |
| 378 | GET | `/maps` | list_maps | - | - | - | OK | svc/gis/src/modules/map.rs | 117 |
| 379 | GET | `/maps/{id}` | get_map | - | id | - | OK | svc/gis/src/modules/map.rs | 143 |
| 380 | PUT | `/maps/{id}` | update_map | serde_json | id | - | ERROR | svc/gis/src/modules/map.rs | 169 |
| 381 | DELETE | `/maps/{id}` | delete_map | - | id | - | OK | svc/gis/src/modules/map.rs | 221 |
| 382 | GET | `/companies` | list_companies | - | - | page, page_size, search, status | OK | svc/hrm/src/modules/company.rs | 26 |
| 383 | POST | `/companies` | create_company | CreateCompanyRequest | - | - | OK | svc/hrm/src/modules/company.rs | 134 |
| 384 | GET | `/companies/{id}` | get_company | - | id | - | OK | svc/hrm/src/modules/company.rs | 224 |
| 385 | GET | `/departments` | list_departments | - | - | page, page_size, search, status, org_id | OK | svc/hrm/src/modules/department.rs | 40 |
| 386 | POST | `/departments` | create_department | CreateDepartmentRequest | - | - | OK | svc/hrm/src/modules/department.rs | 122 |
| 387 | GET | `/departments/{id}` | get_department | - | id | - | OK | svc/hrm/src/modules/department.rs | 205 |
| 388 | GET | `/employees` | list_employees | - | - | - | OK | svc/hrm/src/modules/employee.rs | 88 |
| 389 | GET | `/employees/{id}` | get_employee | - | - | - | WARN | svc/hrm/src/modules/employee.rs | 127 |
| 390 | GET | `/employees/{id}/details` | get_employee_details | - | - | - | WARN | svc/hrm/src/modules/employee.rs | 187 |
| 391 | POST | `/employees` | create_employee | - | - | - | WARN | svc/hrm/src/modules/employee.rs | 262 |
| 392 | PUT | `/employees/{id}` | update_employee | - | - | - | WARN | svc/hrm/src/modules/employee.rs | 394 |
| 393 | DELETE | `/employees/{id}` | delete_employee | - | - | - | WARN | svc/hrm/src/modules/employee.rs | 489 |
| 394 | POST | `/employees/export` | export_employees | - | - | - | WARN | svc/hrm/src/modules/employee.rs | 564 |
| 395 | GET | `/api/integration/rules` | list_conversion_rules_api | - | - | - | OK | svc/integration/src/handlers/conversion_rules.rs | 16 |
| 396 | GET | `/api/integration/rules/{id}` | get_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 42 |
| 397 | POST | `/api/integration/rules` | create_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 73 |
| 398 | PUT | `/api/integration/rules/{id}` | update_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 128 |
| 399 | DELETE | `/api/integration/rules/{id}` | delete_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 201 |
| 400 | GET | `/api/integration/rules/{id}/executions` | get_rule_executions_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 238 |
| 401 | POST | `/api/integration/rules/{id}/execute` | execute_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 265 |
| 402 | POST | `/api/integration/rules/{id}/enable` | enable_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 346 |
| 403 | POST | `/api/integration/rules/{id}/disable` | disable_conversion_rule_api | - | - | - | WARN | svc/integration/src/handlers/conversion_rules.rs | 375 |
| 404 | GET | `/api/integration/stats` | get_sync_stats | - | - | - | OK | svc/integration/src/handlers/events.rs | 10 |
| 405 | GET | `/api/integration/events` | list_events | - | - | - | OK | svc/integration/src/handlers/events.rs | 108 |
| 406 | POST | `/api/integration/events` | create_event | - | - | - | WARN | svc/integration/src/handlers/events.rs | 141 |
| 407 | GET | `/api/integration/lims-qms` | list_lims_qms_sync | - | - | - | OK | svc/integration/src/handlers/lims_qms.rs | 10 |
| 408 | POST | `/api/integration/lims-qms` | create_lims_qms_sync | - | - | - | WARN | svc/integration/src/handlers/lims_qms.rs | 44 |
| 409 | GET | `/api/integration/lims-qms/{id}` | get_lims_qms_sync | - | - | - | WARN | svc/integration/src/handlers/lims_qms.rs | 104 |
| 410 | POST | `/api/integration/lims-qms/{id}/sync` | sync_lims_qms | - | - | - | WARN | svc/integration/src/handlers/lims_qms.rs | 138 |
| 411 | GET | `/api/integration/mes-erp` | list_mes_erp_sync | - | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 23 |
| 412 | POST | `/api/integration/mes-erp` | create_mes_erp_sync | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 56 |
| 413 | GET | `/api/integration/mes-erp/{id}` | get_mes_erp_sync | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 115 |
| 414 | POST | `/api/integration/mes-erp/{id}/sync` | sync_mes_erp | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 148 |
| 415 | POST | `/api/integration/mes-erp/sync/erp-to-mes` | sync_erp_order_to_mes | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 196 |
| 416 | POST | `/api/integration/mes-erp/sync/mes-to-erp` | sync_mes_progress_to_erp | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 233 |
| 417 | POST | `/api/integration/mes-erp/{id}/retry` | retry_mes_erp_sync | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 273 |
| 418 | GET | `/api/integration/mes-erp/{id}/logs` | get_mes_erp_sync_logs | - | - | - | WARN | svc/integration/src/handlers/mes_erp.rs | 297 |
| 419 | GET | `/api/integration/mes-erp/records` | list_mes_erp_sync_records | - | - | - | OK | svc/integration/src/handlers/mes_erp.rs | 318 |
| 420 | GET | `/api/integration/mes-qms` | list_mes_qms_sync_api | - | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 11 |
| 421 | GET | `/api/integration/mes-qms/{id}` | get_mes_qms_sync_api | - | - | - | WARN | svc/integration/src/handlers/mes_qms.rs | 57 |
| 422 | GET | `/api/integration/mes-qms/stats` | get_mes_qms_stats_api | - | - | - | OK | svc/integration/src/handlers/mes_qms.rs | 82 |
| 423 | POST | `/api/integration/mes-qms/trigger-inspection` | trigger_qms_inspection_api | - | - | - | WARN | svc/integration/src/handlers/mes_qms.rs | 108 |
| 424 | POST | `/api/integration/mes-qms/sync-result` | sync_quality_result_api | - | - | - | WARN | svc/integration/src/handlers/mes_qms.rs | 145 |
| 425 | POST | `/api/integration/mes-qms/sync-trace` | sync_trace_chain_api | - | - | - | WARN | svc/integration/src/handlers/mes_qms.rs | 182 |
| 426 | POST | `/api/integration/mes-qms/defect-handling` | defect_handling_api | - | - | - | WARN | svc/integration/src/handlers/mes_qms.rs | 219 |
| 427 | POST | `/api/integration/mes-qms/{id}/retry` | retry_mes_qms_sync_api | - | - | - | WARN | svc/integration/src/handlers/mes_qms.rs | 256 |
| 428 | POST | `/api/integration/sync/tasks` | create_task | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 113 |
| 429 | GET | `/api/integration/sync/tasks/{task_id}` | get_task | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 161 |
| 430 | POST | `/api/integration/sync/tasks/{task_id}/status` | update_status | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 197 |
| 431 | GET | `/api/integration/sync/pending` | get_pending | - | - | - | OK | svc/integration/src/handlers/sync.rs | 240 |
| 432 | GET | `/api/integration/sync/statistics` | get_statistics | - | - | - | OK | svc/integration/src/handlers/sync.rs | 270 |
| 433 | POST | `/api/integration/sync/retry-failed` | retry_failed | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 327 |
| 434 | POST | `/api/integration/sync/trigger/scm-to-wms` | trigger_scm_wms | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 402 |
| 435 | POST | `/api/integration/sync/trigger/wms-to-crm` | trigger_wms_crm | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 446 |
| 436 | POST | `/api/integration/sync/trigger/srm-to-scm` | trigger_srm_scm | - | - | - | WARN | svc/integration/src/handlers/sync.rs | 490 |
| 437 | GET | `/api/integration/wms-scm` | list_wms_scm_sync | - | - | - | OK | svc/integration/src/handlers/wms_scm.rs | 10 |
| 438 | POST | `/api/integration/wms-scm` | create_wms_scm_sync | - | - | - | WARN | svc/integration/src/handlers/wms_scm.rs | 43 |
| 439 | GET | `/api/integration/wms-scm/{id}` | get_wms_scm_sync | - | - | - | WARN | svc/integration/src/handlers/wms_scm.rs | 102 |
| 440 | POST | `/api/integration/wms-scm/{id}/sync` | sync_wms_scm | - | - | - | WARN | svc/integration/src/handlers/wms_scm.rs | 135 |
| 441 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/integration/src/plugin.rs | 36 |
| 442 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/integration/src/plugin.rs | 79 |
| 443 | GET | `/health` | health | - | - | - | OK | svc/lowcode/src/openapi.rs | 26 |
| 444 | GET | `/api/lowcode/apps` | list_apps | - | - | - | OK | svc/lowcode/src/openapi.rs | 35 |
| 445 | GET | `/api/lowcode/designer/schema` | get_designer_schema | - | - | - | OK | svc/lowcode/src/openapi.rs | 44 |
| 446 | POST | `/api/master/quality-v51/checks` | run_quality_check | RunQualityCheckRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 594 |
| 447 | GET | `/api/master/quality-v51/checks` | list_quality_checks | - | - | entity_type, entity_id, status, rule_id, page, page_size | OK | svc/master-data/src/modules/quality_v51.rs | 663 |
| 448 | GET | `/api/master/quality-v51/rules` | list_quality_rules | - | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 762 |
| 449 | POST | `/api/master/quality-v51/rules` | create_quality_rule | CreateQualityRuleRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 779 |
| 450 | GET | `/api/master/quality-v51/score` | get_quality_score | - | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 878 |
| 451 | GET | `/api/master/quality-v51/dashboard` | get_quality_dashboard | - | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 941 |
| 452 | POST | `/api/master/quality-v51/auto-fix/run` | apply_auto_fix | AutoFixRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 1002 |
| 453 | POST | `/api/master/quality-v51/ai/suggest` | generate_suggestions | GenerateSuggestionsRequest | - | - | OK | svc/master-data/src/modules/quality_v51.rs | 1206 |
| 454 | - | `-` | extract_openapi_spec | - | - | - | OK | svc/mes/src/modules/openapi.rs | 213 |
| 455 | GET | `/api/mes/orders` | list_production_orders | - | - | page, pagesize, search, status | OK | svc/mes/src/modules/production_order.rs | 198 |
| 456 | POST | `/api/mes/orders` | create_production_order | CreateProductionOrderRequest | - | - | OK | svc/mes/src/modules/production_order.rs | 387 |
| 457 | GET | `/api/mes/orders/{id}` | get_production_order | - | id | - | OK | svc/mes/src/modules/production_order.rs | 618 |
| 458 | GET | `/api/mes/work-orders` | list_work_orders | - | - | page, pagesize, search, status | OK | svc/mes/src/modules/work_order.rs | 158 |
| 459 | GET | `/api/mes/work-orders/{id}` | get_work_order | - | id | - | OK | svc/mes/src/modules/work_order.rs | 355 |
| 460 | POST | `/api/mes/work-orders` | create_work_order | CreateWorkOrderRequest | - | - | OK | svc/mes/src/modules/work_order.rs | 439 |
| 461 | GET | `/api/mes/work-reports` | list_work_reports | - | - | page, pagesize, search, status | OK | svc/mes/src/modules/work_report.rs | 223 |
| 462 | GET | `/api/mes/work-reports/{id}` | get_work_report | - | id | - | OK | svc/mes/src/modules/work_report.rs | 419 |
| 463 | POST | `/api/mes/work-reports` | create_work_report | CreateWorkReportRequest | - | - | OK | svc/mes/src/modules/work_report.rs | 500 |
| 464 | GET | `/api/monitor/thresholds` | list_thresholds | - | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 251 |
| 465 | POST | `/api/monitor/thresholds` | create_threshold | - | - | - | WARN | svc/monitor/src/modules/monitor/alert_evaluator.rs | 350 |
| 466 | GET | `/api/monitor/thresholds/{id}` | get_threshold | - | - | - | WARN | svc/monitor/src/modules/monitor/alert_evaluator.rs | 381 |
| 467 | PUT | `/api/monitor/thresholds/{id}` | update_threshold | - | - | - | WARN | svc/monitor/src/modules/monitor/alert_evaluator.rs | 412 |
| 468 | DELETE | `/api/monitor/thresholds/{id}` | delete_threshold | - | - | - | WARN | svc/monitor/src/modules/monitor/alert_evaluator.rs | 444 |
| 469 | POST | `/api/monitor/thresholds/evaluate` | evaluate_thresholds | - | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 463 |
| 470 | GET | `/api/monitor/metrics/snapshot` | get_metric_snapshot | - | - | - | OK | svc/monitor/src/modules/monitor/alert_evaluator.rs | 497 |
| 471 | GET | `/api/monitor/alerts` | list_alerts | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 332 |
| 472 | GET | `/api/monitor/alerts/{id}` | get_alert | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 453 |
| 473 | POST | `/api/monitor/alerts/{id}` | update_alert | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 483 |
| 474 | GET | `/api/monitor/alerts/statistics` | get_alert_statistics | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 528 |
| 475 | POST | `/api/monitor/alerts/acknowledge` | acknowledge_alerts | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 576 |
| 476 | POST | `/api/monitor/alerts/resolve` | resolve_alerts | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 609 |
| 477 | GET | `/api/monitor/rules` | list_rules | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 642 |
| 478 | POST | `/api/monitor/rules` | create_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 734 |
| 479 | GET | `/api/monitor/rules/{id}` | get_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 765 |
| 480 | PUT | `/api/monitor/rules/{id}` | update_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 805 |
| 481 | DELETE | `/api/monitor/rules/{id}` | delete_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 837 |
| 482 | POST | `/api/monitor/rules/{id}/enable` | enable_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 856 |
| 483 | POST | `/api/monitor/rules/{id}/disable` | disable_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 892 |
| 484 | GET | `/api/monitor/alerts/{id}/history` | get_alert_history | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 930 |
| 485 | GET | `/api/monitor/alerts/{id}/timeline` | get_alert_timeline | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 965 |
| 486 | GET | `/api/monitor/rules/{id}/scheduled-trigger` | get_scheduled_trigger | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1005 |
| 487 | PUT | `/api/monitor/rules/{id}/scheduled-trigger` | update_scheduled_trigger | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1029 |
| 488 | GET | `/api/monitor/rules/{id}/escalation` | get_escalation | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1046 |
| 489 | PUT | `/api/monitor/rules/{id}/escalation` | update_escalation | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1104 |
| 490 | GET | `/api/monitor/rules/{id}/routing` | get_routing | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1121 |
| 491 | PUT | `/api/monitor/rules/{id}/routing` | update_routing | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1166 |
| 492 | GET | `/api/monitor/templates` | list_templates | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1184 |
| 493 | POST | `/api/monitor/templates` | create_template | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1218 |
| 494 | GET | `/api/monitor/templates/{id}` | get_template | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1234 |
| 495 | PUT | `/api/monitor/templates/{id}` | update_template | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1259 |
| 496 | DELETE | `/api/monitor/templates/{id}` | delete_template | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1276 |
| 497 | GET | `/api/monitor/suppression` | list_suppression_rules | - | - | - | OK | svc/monitor/src/modules/monitor/alerts.rs | 1296 |
| 498 | POST | `/api/monitor/suppression` | create_suppression_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1324 |
| 499 | GET | `/api/monitor/suppression/{id}` | get_suppression_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1340 |
| 500 | PUT | `/api/monitor/suppression/{id}` | update_suppression_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1369 |
| 501 | DELETE | `/api/monitor/suppression/{id}` | delete_suppression_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1386 |
| 502 | GET | `/api/monitor/rules/{id}/advanced` | get_advanced_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1406 |
| 503 | PUT | `/api/monitor/rules/{id}/advanced` | update_advanced_rule | - | - | - | WARN | svc/monitor/src/modules/monitor/alerts.rs | 1456 |
| 504 | GET | `/api/monitor/business-metrics` | list_business_metrics | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 625 |
| 505 | GET | `/api/monitor/business-metrics/{id}` | get_business_metric | - | - | - | WARN | svc/monitor/src/modules/monitor/business_metrics.rs | 687 |
| 506 | POST | `/api/monitor/business-metrics` | create_business_metric | - | - | - | WARN | svc/monitor/src/modules/monitor/business_metrics.rs | 721 |
| 507 | PUT | `/api/monitor/business-metrics/{id}` | update_business_metric | - | - | - | WARN | svc/monitor/src/modules/monitor/business_metrics.rs | 755 |
| 508 | DELETE | `/api/monitor/business-metrics/{id}` | delete_business_metric | - | - | - | WARN | svc/monitor/src/modules/monitor/business_metrics.rs | 790 |
| 509 | GET | `/api/monitor/business-metrics/summary` | get_business_metric_summary | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 809 |
| 510 | GET | `/api/monitor/business-metrics/trend` | get_business_metric_trend | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 882 |
| 511 | GET | `/api/monitor/business-metrics/kpi` | get_kpi_dashboard | - | - | - | OK | svc/monitor/src/modules/monitor/business_metrics.rs | 926 |
| 512 | GET | `/api/monitor/health` | get_service_health | - | - | - | OK | svc/monitor/src/modules/monitor/health_check.rs | 22 |
| 513 | GET | `/api/monitor/metrics/system` | get_system_metrics | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 128 |
| 514 | GET | `/api/monitor/metrics/database` | get_database_metrics | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 161 |
| 515 | GET | `/api/monitor/performance/api` | get_api_performance | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 194 |
| 516 | GET | `/api/monitor/performance/trend` | get_performance_trend | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 258 |
| 517 | GET | `/api/monitor/performance/services` | get_service_performance | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 301 |
| 518 | GET | `/api/monitor/performance/summary` | get_performance_summary | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 387 |
| 519 | GET | `/api/monitor/performance/slow-queries` | get_slow_queries | - | - | - | OK | svc/monitor/src/modules/monitor/metrics.rs | 498 |
| 520 | POST | `/api/monitor/performance/export` | export_performance_data | - | - | - | WARN | svc/monitor/src/modules/monitor/metrics.rs | 597 |
| 521 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/monitor/src/modules/monitor/monitor_plugin.rs | 36 |
| 522 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/monitor/src/modules/monitor/monitor_plugin.rs | 79 |
| 523 | GET | `/api/monitor/slos` | list_slos | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 330 |
| 524 | GET | `/api/monitor/slos/{id}` | get_slo | - | - | - | WARN | svc/monitor/src/modules/monitor/slo.rs | 386 |
| 525 | POST | `/api/monitor/slos` | create_slo | - | - | - | WARN | svc/monitor/src/modules/monitor/slo.rs | 428 |
| 526 | PUT | `/api/monitor/slos/{id}` | update_slo | - | - | - | WARN | svc/monitor/src/modules/monitor/slo.rs | 469 |
| 527 | DELETE | `/api/monitor/slos/{id}` | delete_slo | - | - | - | WARN | svc/monitor/src/modules/monitor/slo.rs | 509 |
| 528 | GET | `/api/monitor/slos/summary` | get_slo_summary | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 528 |
| 529 | GET | `/api/monitor/slos/budget` | get_slo_budget | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 576 |
| 530 | GET | `/api/monitor/slos/trend` | get_slo_trend | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 629 |
| 531 | GET | `/api/monitor/slos/violations` | list_slo_violations | - | - | - | OK | svc/monitor/src/modules/monitor/slo.rs | 673 |
| 532 | POST | `/api/monitor/slos/violations/{id}/resolve` | resolve_slo_violation | - | - | - | WARN | svc/monitor/src/modules/monitor/slo.rs | 721 |
| 533 | GET | `/api/pdm/change-notices` | list_change_notices | - | - | - | OK | svc/pdm/src/modules/change_notice.rs | 104 |
| 534 | POST | `/api/pdm/change-notices` | create_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 186 |
| 535 | GET | `/api/pdm/change-notices/{id}` | get_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 257 |
| 536 | PUT | `/api/pdm/change-notices/{id}` | update_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 294 |
| 537 | DELETE | `/api/pdm/change-notices/{id}` | delete_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 387 |
| 538 | POST | `/api/pdm/change-notices/{id}/submit` | submit_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 419 |
| 539 | POST | `/api/pdm/change-notices/{id}/approve` | approve_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 460 |
| 540 | POST | `/api/pdm/change-notices/{id}/reject` | reject_change_notice | - | - | - | WARN | svc/pdm/src/modules/change_notice.rs | 509 |
| 541 | GET | `/api/pdm/configurations` | list_configurations | - | - | - | OK | svc/pdm/src/modules/configuration.rs | 84 |
| 542 | POST | `/api/pdm/configurations` | create_configuration | - | - | - | WARN | svc/pdm/src/modules/configuration.rs | 161 |
| 543 | GET | `/api/pdm/configurations/{id}` | get_configuration | - | - | - | WARN | svc/pdm/src/modules/configuration.rs | 225 |
| 544 | PUT | `/api/pdm/configurations/{id}` | update_configuration | - | - | - | WARN | svc/pdm/src/modules/configuration.rs | 261 |
| 545 | DELETE | `/api/pdm/configurations/{id}` | delete_configuration | - | - | - | WARN | svc/pdm/src/modules/configuration.rs | 319 |
| 546 | GET | `/api/pdm/documents` | list_documents | - | - | - | OK | svc/pdm/src/modules/document.rs | 108 |
| 547 | POST | `/api/pdm/documents` | create_document | - | - | - | WARN | svc/pdm/src/modules/document.rs | 181 |
| 548 | GET | `/api/pdm/documents/{id}` | get_document | - | - | - | WARN | svc/pdm/src/modules/document.rs | 246 |
| 549 | PUT | `/api/pdm/documents/{id}` | update_document | - | - | - | WARN | svc/pdm/src/modules/document.rs | 282 |
| 550 | DELETE | `/api/pdm/documents/{id}` | delete_document | - | - | - | WARN | svc/pdm/src/modules/document.rs | 372 |
| 551 | POST | `/api/pdm/documents/{id}/approve` | start_document_approval | - | - | - | WARN | svc/pdm/src/modules/document.rs | 409 |
| 552 | GET | `/api/pdm/documents/{id}/approval-history` | get_document_approval_history | - | - | - | WARN | svc/pdm/src/modules/document.rs | 547 |
| 553 | GET | `/api/pdm/documents/pending-approval` | list_pending_documents | - | - | - | OK | svc/pdm/src/modules/document.rs | 611 |
| 554 | GET | `/api/pdm/materials` | list_materials | - | - | - | OK | svc/pdm/src/modules/material.rs | 76 |
| 555 | POST | `/api/pdm/materials` | create_material | - | - | - | WARN | svc/pdm/src/modules/material.rs | 148 |
| 556 | GET | `/api/pdm/materials/{id}` | get_material | - | - | - | WARN | svc/pdm/src/modules/material.rs | 261 |
| 557 | PUT | `/api/pdm/materials/{id}` | update_material | - | - | - | WARN | svc/pdm/src/modules/material.rs | 296 |
| 558 | DELETE | `/api/pdm/materials/{id}` | delete_material | - | - | - | WARN | svc/pdm/src/modules/material.rs | 394 |
| 559 | GET | `/` | _home | - | - | - | OK | svc/pdm/src/modules/openapi.rs | 6 |
| 560 | GET | `/health` | _health | - | - | - | OK | svc/pdm/src/modules/openapi.rs | 29 |
| 561 | GET | `/api/health/detailed` | _detailed_health | - | - | - | OK | svc/pdm/src/modules/openapi.rs | 37 |
| 562 | GET | `/api/plugins/info` | get_plugin_info | - | - | - | OK | svc/pdm/src/modules/pdm_plugin.rs | 31 |
| 563 | GET | `/api/plugins/health` | plugin_health_check | - | - | - | OK | svc/pdm/src/modules/pdm_plugin.rs | 59 |
| 564 | GET | `/api/pdm/products` | list_products | - | - | - | OK | svc/pdm/src/modules/product.rs | 73 |
| 565 | POST | `/api/pdm/products` | create_product | - | - | - | WARN | svc/pdm/src/modules/product.rs | 145 |
| 566 | GET | `/api/pdm/products/{id}` | get_product | - | - | - | WARN | svc/pdm/src/modules/product.rs | 193 |
| 567 | PUT | `/api/pdm/products/{id}` | update_product | - | - | - | WARN | svc/pdm/src/modules/product.rs | 228 |
| 568 | DELETE | `/api/pdm/products/{id}` | delete_product | - | - | - | WARN | svc/pdm/src/modules/product.rs | 278 |
| 569 | GET | `/api/pdm/production-batches` | list_batches | - | - | - | OK | svc/pdm/src/modules/production_batch.rs | 87 |
| 570 | POST | `/api/pdm/production-batches` | create_batch | - | - | - | WARN | svc/pdm/src/modules/production_batch.rs | 164 |
| 571 | GET | `/api/pdm/production-batches/{id}` | get_batch | - | - | - | WARN | svc/pdm/src/modules/production_batch.rs | 216 |
| 572 | PUT | `/api/pdm/production-batches/{id}` | update_batch | - | - | - | WARN | svc/pdm/src/modules/production_batch.rs | 252 |
| 573 | DELETE | `/api/pdm/production-batches/{id}` | delete_batch | - | - | - | WARN | svc/pdm/src/modules/production_batch.rs | 311 |
| 574 | GET | `/api/pdm/production-formulas` | list_formulas | - | - | - | OK | svc/pdm/src/modules/production_formula.rs | 80 |
| 575 | POST | `/api/pdm/production-formulas` | create_formula | - | - | - | WARN | svc/pdm/src/modules/production_formula.rs | 157 |
| 576 | GET | `/api/pdm/production-formulas/{id}` | get_formula | - | - | - | WARN | svc/pdm/src/modules/production_formula.rs | 209 |
| 577 | PUT | `/api/pdm/production-formulas/{id}` | update_formula | - | - | - | WARN | svc/pdm/src/modules/production_formula.rs | 245 |
| 578 | DELETE | `/api/pdm/production-formulas/{id}` | delete_formula | - | - | - | WARN | svc/pdm/src/modules/production_formula.rs | 298 |
| 579 | GET | `/api/pdm/production-processes` | list_processes | - | - | - | OK | svc/pdm/src/modules/production_process.rs | 83 |
| 580 | POST | `/api/pdm/production-processes` | create_process | - | - | - | WARN | svc/pdm/src/modules/production_process.rs | 155 |
| 581 | GET | `/api/pdm/production-processes/{id}` | get_process | - | - | - | WARN | svc/pdm/src/modules/production_process.rs | 205 |
| 582 | PUT | `/api/pdm/production-processes/{id}` | update_process | - | - | - | WARN | svc/pdm/src/modules/production_process.rs | 240 |
| 583 | DELETE | `/api/pdm/production-processes/{id}` | delete_process | - | - | - | WARN | svc/pdm/src/modules/production_process.rs | 294 |
| 584 | GET | `/api/pdm/production-statistics` | list_statistics | - | - | - | OK | svc/pdm/src/modules/production_statistics.rs | 62 |
| 585 | GET | `/api/pdm/statistics/{id}` | get_statistics | - | - | - | WARN | svc/pdm/src/modules/production_statistics.rs | 129 |
| 586 | GET | `/api/pdm/production-steps` | list_steps | - | - | - | OK | svc/pdm/src/modules/production_step.rs | 79 |
| 587 | POST | `/api/pdm/production-steps` | create_step | - | - | - | WARN | svc/pdm/src/modules/production_step.rs | 146 |
| 588 | GET | `/api/pdm/production-steps/{id}` | get_step | - | - | - | WARN | svc/pdm/src/modules/production_step.rs | 194 |
| 589 | PUT | `/api/pdm/production-steps/{id}` | update_step | - | - | - | WARN | svc/pdm/src/modules/production_step.rs | 229 |
| 590 | DELETE | `/api/pdm/production-steps/{id}` | delete_step | - | - | - | WARN | svc/pdm/src/modules/production_step.rs | 282 |
| 591 | GET | `/api/pdm/versions` | list_versions | - | - | - | OK | svc/pdm/src/modules/version.rs | 83 |
| 592 | POST | `/api/pdm/versions` | create_version | - | - | - | WARN | svc/pdm/src/modules/version.rs | 164 |
| 593 | GET | `/api/pdm/versions/{id}` | get_version | - | - | - | WARN | svc/pdm/src/modules/version.rs | 216 |
| 594 | PUT | `/api/pdm/versions/{id}` | update_version | - | - | - | WARN | svc/pdm/src/modules/version.rs | 252 |
| 595 | DELETE | `/api/pdm/versions/{id}` | delete_version | - | - | - | WARN | svc/pdm/src/modules/version.rs | 309 |
| 596 | GET | `/api/pdm/workflows` | list_workflows | - | - | - | OK | svc/pdm/src/modules/workflow.rs | 105 |
| 597 | POST | `/api/pdm/workflows` | create_workflow | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 146 |
| 598 | GET | `/api/pdm/workflows/{id}` | get_workflow | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 207 |
| 599 | PUT | `/api/pdm/workflows/{id}` | update_workflow | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 243 |
| 600 | DELETE | `/api/pdm/workflows/{id}` | delete_workflow | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 293 |
| 601 | POST | `/api/pdm/workflows/start` | start_workflow | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 324 |
| 602 | GET | `/api/pdm/workflow-instances` | list_workflow_instances | - | - | - | OK | svc/pdm/src/modules/workflow.rs | 411 |
| 603 | GET | `/api/pdm/workflow-instances/{id}` | get_workflow_instance | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 453 |
| 604 | POST | `/api/pdm/workflow-instances/{id}/advance` | advance_workflow | - | - | - | WARN | svc/pdm/src/modules/workflow.rs | 490 |
| 605 | GET | `/api/pm/projects` | list_projects | - | - | - | OK | svc/pm/src/modules/project.rs | 103 |
| 606 | POST | `/api/pm/projects` | create_project | CreateProjectRequest | - | - | OK | svc/pm/src/modules/project.rs | 162 |
| 607 | GET | `/api/pm/projects/{id}` | get_project | - | - | - | WARN | svc/pm/src/modules/project.rs | 260 |
| 608 | PUT | `/api/pm/projects/{id}` | update_project | UpdateProjectRequest | - | - | WARN | svc/pm/src/modules/project.rs | 291 |
| 609 | DELETE | `/api/pm/projects/{id}` | delete_project | - | - | - | WARN | svc/pm/src/modules/project.rs | 360 |
| 610 | GET | `/api/pm/projects/{id}/dashboard` | get_project_dashboard | - | - | - | WARN | svc/pm/src/modules/project.rs | 391 |
| 611 | GET | `/api/pm/projects/{id}/gantt` | get_project_gantt | - | - | - | WARN | svc/pm/src/modules/project.rs | 508 |
| 612 | GET | `/projects/{project_id}/approval` | get_approval | - | - | - | WARN | svc/pm/src/modules/project_approval.rs | 47 |
| 613 | POST | `/projects/{project_id}/approval` | submit_approval | ApprovalRequest | - | - | WARN | svc/pm/src/modules/project_approval.rs | 78 |
| 614 | POST | `/projects/{project_id}/approval/action` | handle_approval_action | ApprovalRequest | - | - | WARN | svc/pm/src/modules/project_approval.rs | 180 |
| 615 | GET | `/projects/{project_id}/benefits` | get_benefits | - | - | - | WARN | svc/pm/src/modules/project_benefit.rs | 26 |
| 616 | GET | `/projects/{project_id}/benefits/analysis` | get_analysis | - | - | - | WARN | svc/pm/src/modules/project_benefit.rs | 55 |
| 617 | POST | `/projects/{project_id}/benefits` | calculate_benefits | CreateBenefitRequest | - | - | WARN | svc/pm/src/modules/project_benefit.rs | 153 |
| 618 | GET | `/projects/{project_id}/expenses` | list_expenses | - | - | - | WARN | svc/pm/src/modules/project_expense.rs | 26 |
| 619 | POST | `/projects/{project_id}/expenses` | add_expense | CreateExpenseRequest | - | - | WARN | svc/pm/src/modules/project_expense.rs | 55 |
| 620 | GET | `/projects/{project_id}/expenses/{id}` | get_expense | - | - | - | WARN | svc/pm/src/modules/project_expense.rs | 119 |
| 621 | PUT | `/projects/{project_id}/expenses/{id}` | update_expense | UpdateExpenseRequest | - | - | WARN | svc/pm/src/modules/project_expense.rs | 151 |
| 622 | DELETE | `/projects/{project_id}/expenses/{id}` | remove_expense | - | - | - | WARN | svc/pm/src/modules/project_expense.rs | 209 |
| 623 | GET | `/projects/{project_id}/members` | list_members | - | - | - | WARN | svc/pm/src/modules/project_member.rs | 26 |
| 624 | POST | `/projects/{project_id}/members` | create_member | CreateMemberRequest | - | - | WARN | svc/pm/src/modules/project_member.rs | 55 |
| 625 | GET | `/projects/{project_id}/members/{id}` | get_member | - | - | - | WARN | svc/pm/src/modules/project_member.rs | 107 |
| 626 | PUT | `/projects/{project_id}/members/{id}` | update_member | UpdateMemberRequest | - | - | WARN | svc/pm/src/modules/project_member.rs | 139 |
| 627 | DELETE | `/projects/{project_id}/members/{id}` | delete_member | - | - | - | WARN | svc/pm/src/modules/project_member.rs | 189 |
| 628 | GET | `/projects/{project_id}/milestones` | list_milestones | - | - | - | WARN | svc/pm/src/modules/project_milestone.rs | 30 |
| 629 | POST | `/projects/{project_id}/milestones` | create_milestone | CreateMilestoneRequest | - | - | WARN | svc/pm/src/modules/project_milestone.rs | 59 |
| 630 | GET | `/projects/{project_id}/milestones/{id}` | get_milestone | - | - | - | WARN | svc/pm/src/modules/project_milestone.rs | 109 |
| 631 | PUT | `/projects/{project_id}/milestones/{id}` | update_milestone | UpdateMilestoneRequest | - | - | WARN | svc/pm/src/modules/project_milestone.rs | 141 |
| 632 | DELETE | `/projects/{project_id}/milestones/{id}` | delete_milestone | - | - | - | WARN | svc/pm/src/modules/project_milestone.rs | 195 |
| 633 | GET | `/projects/{project_id}/phases` | list_phases | - | - | - | WARN | svc/pm/src/modules/project_phase.rs | 26 |
| 634 | POST | `/projects/{project_id}/phases` | create_phase | CreatePhaseRequest | - | - | WARN | svc/pm/src/modules/project_phase.rs | 55 |
| 635 | GET | `/projects/{project_id}/phases/{id}` | get_phase | - | - | - | WARN | svc/pm/src/modules/project_phase.rs | 120 |
| 636 | PUT | `/projects/{project_id}/phases/{id}` | update_phase | UpdatePhaseRequest | - | - | WARN | svc/pm/src/modules/project_phase.rs | 152 |
| 637 | DELETE | `/projects/{project_id}/phases/{id}` | delete_phase | - | - | - | WARN | svc/pm/src/modules/project_phase.rs | 210 |
| 638 | GET | `/projects/{project_id}/resources` | list_resources | - | - | - | WARN | svc/pm/src/modules/project_resource.rs | 30 |
| 639 | POST | `/projects/{project_id}/resources` | add_resource | CreateResourceRequest | - | - | WARN | svc/pm/src/modules/project_resource.rs | 59 |
| 640 | GET | `/projects/{project_id}/resources/{id}` | get_resource | - | - | - | WARN | svc/pm/src/modules/project_resource.rs | 115 |
| 641 | PUT | `/projects/{project_id}/resources/{id}` | update_resource | UpdateResourceRequest | - | - | WARN | svc/pm/src/modules/project_resource.rs | 147 |
| 642 | DELETE | `/projects/{project_id}/resources/{id}` | remove_resource | - | - | - | WARN | svc/pm/src/modules/project_resource.rs | 203 |
| 643 | GET | `/api/qms/checks` | list_inspections | - | - | page, page_size, status, inspection_type, search | OK | svc/qms/src/modules/quality_inspection.rs | 176 |
| 644 | POST | `/api/qms/checks` | create_inspection | CreateInspectionRequest | - | - | OK | svc/qms/src/modules/quality_inspection.rs | 271 |
| 645 | GET | `/api/qms/checks/{id}` | get_inspection | - | id | - | OK | svc/qms/src/modules/quality_inspection.rs | 315 |
| 646 | GET | `/api/qms/issues` | list_issues | - | - | page, page_size, status, severity | OK | svc/qms/src/modules/quality_issue.rs | 84 |
| 647 | POST | `/api/qms/issues` | create_issue | CreateIssueRequest | - | - | OK | svc/qms/src/modules/quality_issue.rs | 134 |
| 648 | GET | `/api/qms/standards` | list_standards | - | - | page, page_size, category, status, search | OK | svc/qms/src/modules/quality_standard.rs | 100 |
| 649 | POST | `/api/qms/standards` | create_standard | CreateStandardRequest | - | - | OK | svc/qms/src/modules/quality_standard.rs | 177 |
| 650 | GET | `/api/qms/standards/{id}` | get_standard | - | id | - | OK | svc/qms/src/modules/quality_standard.rs | 221 |
| 651 | GET | `/audit-logs` | list_audit_logs | - | - | action, entity_type, user_id, status, start_date, end_date, page, page_size | OK | svc/rd/src/modules/audit.rs | 36 |
| 652 | GET | `/audit-logs/{id}` | get_audit_log | - | id | - | OK | svc/rd/src/modules/audit.rs | 131 |
| 653 | GET | `/audit-logs/export` | export_audit_logs | - | - | action, entity_type, user_id, status, start_date, end_date | OK | svc/rd/src/modules/audit.rs | 227 |
| 654 | GET | `/projects` | list_projects | - | - | page, page_size, search, status | OK | svc/rd/src/modules/project.rs | 82 |
| 655 | POST | `/projects` | create_project | CreateProjectRequest | - | - | OK | svc/rd/src/modules/project.rs | 168 |
| 656 | GET | `/projects/{id}` | get_project | - | id | - | OK | svc/rd/src/modules/project.rs | 315 |
| 657 | PUT | `/projects/{id}` | update_project | UpdateProjectRequest | id | - | OK | svc/rd/src/modules/project.rs | 376 |
| 658 | DELETE | `/projects/{id}` | delete_project | - | id | - | OK | svc/rd/src/modules/project.rs | 500 |
| 659 | POST | `/projects/batch` | batch_create_projects | BatchCreateRequest | - | - | OK | svc/rd/src/modules/project.rs | 583 |
| 660 | DELETE | `/projects/batch` | batch_delete_projects | BatchDeleteRequest | - | - | OK | svc/rd/src/modules/project.rs | 724 |
| 661 | GET | `/projects/export` | export_projects | - | - | - | OK | svc/rd/src/modules/project.rs | 824 |
| 662 | POST | `/projects/import` | import_projects | - | - | - | OK | svc/rd/src/modules/project.rs | 1039 |
| 663 | GET | `/projects/{id}/dashboard` | get_project_dashboard | - | id | - | OK | svc/rd/src/modules/project.rs | 1245 |
| 664 | GET | `/projects/{id}/gantt` | get_project_gantt | - | id | - | OK | svc/rd/src/modules/project.rs | 1436 |
| 665 | - | `-` | extract_openapi_spec | - | - | - | OK | svc/scm/src/modules/openapi.rs | 112 |
| 666 | GET | `/scm/purchase-orders` | list_orders | - | - | - | OK | svc/scm/src/modules/purchase_order.rs | 31 |
| 667 | POST | `/scm/purchase-orders` | create_order | - | - | - | WARN | svc/scm/src/modules/purchase_order.rs | 105 |
| 668 | GET | `/scm/purchase-orders/{id}` | get_order | - | - | - | WARN | svc/scm/src/modules/purchase_order.rs | 187 |
| 669 | PUT | `/scm/purchase-orders/{id}` | update_order | - | - | - | WARN | svc/scm/src/modules/purchase_order.rs | 224 |
| 670 | DELETE | `/scm/purchase-orders/{id}` | delete_order | - | - | - | WARN | svc/scm/src/modules/purchase_order.rs | 324 |
| 671 | POST | `/scm/purchase-orders/{id}/approve` | approve_order | - | - | - | WARN | svc/scm/src/modules/purchase_order.rs | 400 |
| 672 | POST | `/scm/purchase-orders/{id}/reject` | reject_order | - | - | - | WARN | svc/scm/src/modules/purchase_order.rs | 556 |
| 673 | GET | `/scm/suppliers` | list_suppliers | - | - | - | OK | svc/scm/src/modules/supplier.rs | 68 |
| 674 | POST | `/scm/suppliers` | create_supplier | - | - | - | WARN | svc/scm/src/modules/supplier.rs | 170 |
| 675 | GET | `/scm/suppliers/{id}` | get_supplier | - | - | - | WARN | svc/scm/src/modules/supplier.rs | 290 |
| 676 | PUT | `/scm/suppliers/{id}` | update_supplier | - | - | - | WARN | svc/scm/src/modules/supplier.rs | 361 |
| 677 | DELETE | `/scm/suppliers/{id}` | delete_supplier | - | - | - | WARN | svc/scm/src/modules/supplier.rs | 507 |
| 678 | GET | `/api/search` | search_handler | - | - | keyword, page, page_size, modules | OK | svc/search/src/handlers.rs | 278 |
| 679 | GET | `/health` | health_handler | - | - | - | OK | svc/search/src/handlers.rs | 317 |
| 680 | GET | `/api/srm/suppliers` | list_suppliers | - | - | - | OK | svc/srm/src/modules/supplier.rs | 134 |
| 681 | POST | `/api/srm/suppliers` | create_supplier | - | - | - | WARN | svc/srm/src/modules/supplier.rs | 266 |
| 682 | GET | `/api/srm/suppliers/{id}` | get_supplier | - | - | - | WARN | svc/srm/src/modules/supplier.rs | 432 |
| 683 | PUT | `/api/srm/suppliers/{id}` | update_supplier | - | - | - | WARN | svc/srm/src/modules/supplier.rs | 487 |
| 684 | DELETE | `/api/srm/suppliers/{id}` | delete_supplier | - | - | - | WARN | svc/srm/src/modules/supplier.rs | 643 |
| 685 | POST | `/tickets` | create_ticket_handler | CreateTicketRequest | - | - | OK | svc/ticket/src/handlers.rs | 550 |
| 686 | GET | `/tickets` | list_tickets_handler | - | - | page, page_size, status, severity, ticket_type | OK | svc/ticket/src/handlers.rs | 576 |
| 687 | GET | `/tickets/{id}` | get_ticket_handler | - | id | - | OK | svc/ticket/src/handlers.rs | 607 |
| 688 | PUT | `/tickets/{id}` | update_ticket_handler | UpdateTicketRequest | id | - | OK | svc/ticket/src/handlers.rs | 634 |
| 689 | DELETE | `/tickets/{id}` | delete_ticket_handler | - | id | - | OK | svc/ticket/src/handlers.rs | 664 |
| 690 | POST | `/tickets/{id}/comments` | add_comment_handler | AddCommentRequest | id | - | OK | svc/ticket/src/handlers.rs | 697 |
| 691 | GET | `/tickets/{id}/comments` | list_comments_handler | - | id | - | OK | svc/ticket/src/handlers.rs | 735 |
| 692 | GET | `/tickets/stats` | get_stats_handler | - | - | - | OK | svc/ticket/src/handlers.rs | 777 |
| 693 | POST | `/sla-policies` | create_sla_policy_handler | CreateSlaPolicyRequest | - | - | OK | svc/ticket/src/handlers.rs | 858 |
| 694 | GET | `/sla-policies` | list_sla_policies_handler | - | - | - | OK | svc/ticket/src/handlers.rs | 883 |
| 695 | GET | `/tasks` | list_tasks | - | - | page, page_size, search, status, assignee_id, workflow_id, instance_id | OK | svc/unified-core/src/modules/flow/task.rs | 30 |
| 696 | GET | `/tasks/{id}` | get_task | - | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 147 |
| 697 | POST | `/tasks/{id}/claim` | claim_task | - | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 184 |
| 698 | POST | `/tasks/{id}/approve` | approve_task | TaskActionRequest | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 245 |
| 699 | POST | `/tasks/{id}/reject` | reject_task | TaskActionRequest | id | - | OK | svc/unified-core/src/modules/flow/task.rs | 285 |
| 700 | POST | `/tasks/batch/approve` | batch_approve | TaskBatchRequest | - | - | OK | svc/unified-core/src/modules/flow/task.rs | 377 |
| 701 | GET | `/tasks/my/stats` | get_task_stats | - | - | - | OK | svc/unified-core/src/modules/flow/task.rs | 584 |
| 702 | POST | `/iam/auth/login` | login | LoginRequest | - | - | ERROR | svc/unified-core/src/modules/iam/auth.rs | 106 |
| 703 | POST | `/iam/auth/register` | register | RegisterRequest | - | - | ERROR | svc/unified-core/src/modules/iam/auth.rs | 422 |
| 704 | GET | `/users` | list_users | - | - | page, page_size | OK | svc/unified-core/src/modules/iam/user/crud.rs | 26 |
| 705 | POST | `/users` | create_user | CreateUserRequest | - | - | ERROR | svc/unified-core/src/modules/iam/user/crud.rs | 149 |
| 706 | GET | `/api/wms/inventory` | list_inventory | - | - | - | OK | svc/wms/src/modules/inventory.rs | 96 |
| 707 | POST | `/api/wms/inventory` | create_inventory | - | - | - | WARN | svc/wms/src/modules/inventory.rs | 178 |
| 708 | GET | `/api/wms/inventory/{id}` | get_inventory | - | - | - | WARN | svc/wms/src/modules/inventory.rs | 268 |
| 709 | PUT | `/api/wms/inventory/{id}` | update_inventory | - | - | - | WARN | svc/wms/src/modules/inventory.rs | 313 |
| 710 | DELETE | `/api/wms/inventory/{id}` | delete_inventory | - | - | - | WARN | svc/wms/src/modules/inventory.rs | 534 |
| 711 | GET | `/api/wms/warehouses` | list_warehouses | - | - | - | OK | svc/wms/src/modules/warehouse.rs | 44 |
| 712 | POST | `/api/wms/warehouses` | create_warehouse | - | - | - | WARN | svc/wms/src/modules/warehouse.rs | 132 |
| 713 | GET | `/api/wms/warehouses/{id}` | get_warehouse | - | - | - | WARN | svc/wms/src/modules/warehouse.rs | 216 |
| 714 | PUT | `/api/wms/warehouses/{id}` | update_warehouse | - | - | - | WARN | svc/wms/src/modules/warehouse.rs | 266 |
| 715 | DELETE | `/api/wms/warehouses/{id}` | delete_warehouse | - | - | - | WARN | svc/wms/src/modules/warehouse.rs | 377 |

## 4. 不匹配类型分布

| 类型 | 数量 | 严重度 | 说明 |
|------|------|--------|------|
| REQUEST_BODY_EXTRA | 187 | warn | handler 有 Json<> 参数但 utoipa 未声明 request_body |
| PATH_PARAM_UNDECLARED | 325 | warn | 路径模板有参数但 utoipa params() 未声明 |
| REQUEST_BODY_MISSING | 2 | error | utoipa 声明了 request_body 但 handler 无 Json<> 参数 |
| PATH_PARAM_MISSING | 2 | error | utoipa 声明了路径参数但 handler 无 Path<> 提取器 |
| REQUEST_BODY_TYPE_MISMATCH | 10 | error | request_body 类型与 handler Json<> 参数类型不匹配 |
| PATH_PARAM_EXTRA | 292 | warn | handler 有 Path<> 提取器但 utoipa 未声明路径参数 |

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
