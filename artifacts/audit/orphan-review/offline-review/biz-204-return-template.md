# BIZ 204 回填模板（业务侧）

按 svc 分组，逐条填 biz_decision：接入候选 / 内部保留 / 下线。填完回传 csv（保留 path+operation_id 标识）。


## ai (28)
- [ ] `/mcp` | op=`handle_mcp_request` | handler=`handle_mcp_request` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mcp/sse` | op=`handle_mcp_sse` | handler=`handle_mcp_sse` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multimodal/image/analyze` | op=`analyze_image` | handler=`analyze_image` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multimodal/image/objects` | op=`detect_objects` | handler=`detect_objects` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multimodal/image/text` | op=`extract_text` | handler=`extract_text` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multimodal/image/describe` | op=`describe_image` | handler=`describe_image` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multimodal/video/analyze` | op=`analyze_video` | handler=`analyze_video` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/vectors/store` | op=`store` | handler=`store` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/vectors/clear` | op=`clear_all` | handler=`clear_all` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/recommend` | op=`recommend` | handler=`recommend` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/recommend/knowledge` | op=`recommend_knowledge` | handler=`recommend_knowledge` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/models/usage` | op=`get_model_usage` | handler=`get_model_usage` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/ai/dify/parameters` | op=`parameters` | handler=`parameters` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/ai/connectors/get` | op=`get_connector` | handler=`get_connector` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/ai/connectors/query` | op=`query_data` | handler=`query_data` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/models/usage/{tail}` | op=`get_model_usage` | handler=`get_model_usage` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/vectors/stats` | op=`stats` | handler=`stats` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/embedding/generate` | op=`generate` | handler=`generate` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/vectors/hybrid-search` | op=`hybrid_search` | handler=`hybrid_search` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/dify/parameters/{tail}` | op=`parameters` | handler=`parameters` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/assist` | op=`ai_form_assist` | handler=`ai_form_assist` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/suggest` | op=`ai_form_suggest` | handler=`ai_form_suggest` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/enhance` | op=`ai_form_enhance` | handler=`ai_form_enhance` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/validate` | op=`ai_form_validate` | handler=`ai_form_validate` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/api/core/ai-form/translate` | op=`ai_form_translate` | handler=`ai_form_translate` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/forms/{form_type}` | op=`get_form` | handler=`get_form` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/forms/{form_type}/suggest` | op=`suggest_for_form` | handler=`suggest_for_form` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/ai-form/forms/{form_type}/enhance` | op=`enhance_for_form` | handler=`enhance_for_form` | prescan2=`仍待甄别` | biz_decision=____

## analytics (13)
- [ ] `/visualization/chart-types` | op=`get_chart_types` | handler=`get_chart_types` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/bi/qms/issue-distribution` | op=`get_qms_issue_distribution` | handler=`get_qms_issue_distribution` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/bi/ehs/risk-distribution` | op=`get_ehs_risk_distribution` | handler=`get_ehs_risk_distribution` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/widget/{id}/data/realtime` | op=`get_widget_data_realtime` | handler=`get_widget_data_realtime` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/widget/{id}/cache/invalidate` | op=`invalidate_widget_cache` | handler=`invalidate_widget_cache` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/widget/cache/invalidate-all` | op=`invalidate_all_widget_cache` | handler=`invalidate_all_widget_cache` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/drilldown/drill-down` | op=`drill_down` | handler=`drill_down` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multidim/cube` | op=`query_cube` | handler=`query_cube` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multidim/slice` | op=`slice_cube` | handler=`slice_cube` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multidim/dice` | op=`dice_cube` | handler=`dice_cube` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multidim/pivot` | op=`pivot_table` | handler=`pivot_table` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/multidim/rank` | op=`rank_data` | handler=`rank_data` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/prediction/moving-average` | op=`moving_average_forecast` | handler=`moving_average_forecast` | prescan2=`仍待甄别` | biz_decision=____

## communication (1)
- [ ] `/im/rooms/search` | op=`search_rooms` | handler=`search_rooms` | prescan2=`仍待甄别` | biz_decision=____

## crm (2)
- [ ] `/sales-funnel/{tail}` | op=`get_funnel_data` | handler=`get_funnel_data` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/sales-forecast/compare` | op=`compare_sales_forecasts` | handler=`compare_sales_forecasts` | prescan2=`仍待甄别` | biz_decision=____

## ehs (2)
- [ ] `/api/ehs/occupational-disease/factors/{id}` | op=`get_hazard_factor` | handler=`get_hazard_factor` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/ehs/occupational-disease/protection-measures/{id}` | op=`get_protection_measure` | handler=`get_protection_measure` | prescan2=`仍待甄别` | biz_decision=____

## finance (19)
- [ ] `/forecast-v53/cash-flow/predict` | op=`predict_cash_flow_handler` | handler=`predict_cash_flow_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/forecast-v53/cash-flow/accuracy` | op=`get_accuracy_handler` | handler=`get_accuracy_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/finance-v59/stress/compare` | op=`compare_scenarios_handler` | handler=`compare_scenarios_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/finance-v60/alert/{id}/acknowledge` | op=`acknowledge_alert_handler` | handler=`acknowledge_alert_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/bootstrap` | op=`bootstrap_defaults` | handler=`bootstrap_defaults` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/sagas/{saga_id}` | op=`get_saga` | handler=`get_saga` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/pipeline/stats` | op=`pipeline_stats` | handler=`pipeline_stats` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/cqrs/events/{aggregate_id}` | op=`get_events` | handler=`get_events` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/periods/{year}/{month}/open` | op=`open_period` | handler=`open_period` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/aux-ledger` | op=`get_aux_ledger` | handler=`get_aux_ledger` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/receivables/aging` | op=`get_receivable_aging_handler` | handler=`get_receivable_aging_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/payables/aging` | op=`get_payable_aging_handler` | handler=`get_payable_aging_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/collections/write-off` | op=`write_off_collection_handler` | handler=`write_off_collection_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/aging/detail` | op=`get_aging_detail_handler` | handler=`get_aging_detail_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/finance-v58/forecast/compare` | op=`compare_scenarios_handler` | handler=`compare_scenarios_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/events/process` | op=`process_events` | handler=`process_events` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/sagas/stats` | op=`saga_stats` | handler=`saga_stats` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/sagas/{saga_id}/compensate` | op=`compensate_saga` | handler=`compensate_saga` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/core/settlement-center/reconciliations/{id}/approve` | op=`approve_reconciliation` | handler=`approve_reconciliation` | prescan2=`疑似动作/任务端点` | biz_decision=____

## integration (3)
- [ ] `/api/integration/mes-qms/stats` | op=`get_mes_qms_stats_api` | handler=`get_mes_qms_stats_api` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/integration/mes-qms/defect-handling` | op=`defect_handling_api` | handler=`defect_handling_api` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/toggle` | op=`toggle_connection` | handler=`toggle_connection` | prescan2=`仍待甄别` | biz_decision=____

## master-data (34)
- [ ] `/kg-v53/subgraph/{node_id}` | op=`get_subgraph` | handler=`get_subgraph` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/kg-v53/path` | op=`find_path` | handler=`find_path` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/kg-v53/similar/{node_id}` | op=`get_similar` | handler=`get_similar` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/kg-v53/similar-items/{item_id}` | op=`get_similar_items` | handler=`get_similar_items` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mdm-v59/governance/entity/{id}` | op=`get_entity_suggestions` | handler=`get_entity_suggestions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mdm-v57/graph/neighbors/{id}` | op=`get_neighbors` | handler=`get_neighbors` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mdm-v57/entities/tag/{tag}` | op=`get_entities_by_tag` | handler=`get_entities_by_tag` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mdm-v57/tags/suggest` | op=`suggest_tags` | handler=`suggest_tags` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/ai/suggest` | op=`generate_suggestions` | handler=`generate_suggestions` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/ai/suggestions` | op=`get_suggestions` | handler=`get_suggestions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/ai/insights` | op=`get_governance_insights` | handler=`get_governance_insights` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/graph` | op=`get_lineage_graph` | handler=`get_lineage_graph` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/delete` | op=`delete_lineage` | handler=`delete_lineage` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/propagate` | op=`propagate_change` | handler=`propagate_change` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/nodes` | op=`add_kg_node` | handler=`add_kg_node` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/edges` | op=`add_kg_edge` | handler=`add_kg_edge` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/subgraph/{node_id}` | op=`get_subgraph` | handler=`get_subgraph` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/path` | op=`find_path` | handler=`find_path` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/similar/{node_id}` | op=`get_similar` | handler=`get_similar` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/similar-items/{item_id}` | op=`get_similar_items` | handler=`get_similar_items` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/subscribe` | op=`subscribe_tenant` | handler=`subscribe_tenant` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/rate-cards` | op=`create_rate_card` | handler=`create_rate_card` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/graph/neighbors/{id}` | op=`get_neighbors` | handler=`get_neighbors` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/graph/subgraph` | op=`get_subgraph` | handler=`get_subgraph` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/search/semantic` | op=`search_semantic_handler` | handler=`search_semantic_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/search/hybrid` | op=`search_hybrid_handler` | handler=`search_hybrid_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/entities/tag/{tag}` | op=`get_entities_by_tag` | handler=`get_entities_by_tag` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tags/suggest` | op=`suggest_tags` | handler=`suggest_tags` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/governance/entity/{id}` | op=`get_entity_suggestions` | handler=`get_entity_suggestions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/classifier` | op=`create_classifier` | handler=`create_classifier` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/classifiers` | op=`get_classifiers` | handler=`get_classifiers` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/dict-items` | op=`create_dict_item` | handler=`create_dict_item` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/search/suggestions` | op=`array` | handler=`array` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/uoms/{id}` | op=`get_uom` | handler=`get_uom` | prescan2=`仍待甄别` | biz_decision=____

## mes (7)
- [ ] `/aps/schedule/bottleneck-analysis` | op=`get_bottleneck_analysis` | handler=`get_bottleneck_analysis` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/aps/schedule/bottleneck-analysis/{_id}` | op=`get_bottleneck_analysis` | handler=`get_bottleneck_analysis` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/forecasts/{id}/adopt` | op=`redirect_forecasts` | handler=`redirect_forecasts` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/schedules/gantt/{_id}` | op=`get_gantt_data` | handler=`get_gantt_data` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/workshops/{id}` | op=`get_workshop` | handler=`get_workshop` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/shifts/{id}` | op=`get_shift` | handler=`get_shift` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/work-calendars/{id}` | op=`get_work_calendar` | handler=`get_work_calendar` | prescan2=`仍待甄别` | biz_decision=____

## mobile (3)
- [ ] `/stats/patrol` | op=`get_patrol_stats` | handler=`get_patrol_stats` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/scan/barcode` | op=`scan_barcode` | handler=`scan_barcode` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/scan/qrcode` | op=`scan_qrcode` | handler=`scan_qrcode` | prescan2=`仍待甄别` | biz_decision=____

## monitor (1)
- [ ] `/suppression/{id}` | op=`get_suppression_rule` | handler=`get_suppression_rule` | prescan2=`仍待甄别` | biz_decision=____

## pdm (1)
- [ ] `/drawings/{id}` | op=`get_drawing` | handler=`get_drawing` | prescan2=`仍待甄别` | biz_decision=____

## plugin-registry (5)
- [ ] `/api/plugin/plugins/{plugin_code}/upgrade-schedule` | op=`get_upgrade_schedule` | handler=`get_upgrade_schedule` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/api/plugins/{plugin_code}/details` | op=`get_plugin_details` | handler=`get_plugin_details` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/plugin/tenant/{tenant_id}/available` | op=`get_available_plugins` | handler=`get_available_plugins` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/plugin/plugins/{code}` | op=`get_plugin` | handler=`get_plugin` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install` | op=`install_plugin` | handler=`install_plugin` | prescan2=`仍待甄别` | biz_decision=____

## pm (1)
- [ ] `/service-integrations/{id}` | op=`get_integration` | handler=`get_integration` | prescan2=`仍待甄别` | biz_decision=____

## qms (1)
- [ ] `/spc/calculate` | op=`calculate_control_limits` | handler=`calculate_control_limits` | prescan2=`仍待甄别` | biz_decision=____

## rd (4)
- [ ] `/patents/{id}` | op=`get_patent` | handler=`get_patent` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/research-costs/{id}` | op=`get_cost` | handler=`get_cost` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/ai/analyses/{id}` | op=`get_analysis` | handler=`get_analysis` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/entities/{entity_type}/{entity_id}/analyses` | op=`get_entity_analyses` | handler=`get_entity_analyses` | prescan2=`仍待甄别` | biz_decision=____

## search (2)
- [ ] `/suggestions` | op=`suggestions_handler` | handler=`suggestions_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mcp` | op=`handle_mcp` | handler=`handle_mcp` | prescan2=`仍待甄别` | biz_decision=____

## unified-core (23)
- [ ] `/delegates/{id}` | op=`get_delegate` | handler=`get_delegate` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/instances/{id}/approve` | op=`approve_instance` | handler=`approve_instance` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/instances/{id}/reject` | op=`reject_instance` | handler=`reject_instance` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/sse/session/{session_id}` | op=`sse_session_handler` | handler=`sse_session_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/docs` | op=`api_docs` | handler=`api_docs` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/automation/designer/canvas/{rule_id}` | op=`get_designer_canvas` | handler=`get_designer_canvas` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/automation/designer/canvas/{rule_id}/validate` | op=`validate_canvas` | handler=`validate_canvas` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/automation/rules/by-code/{code}` | op=`get_rule_by_code` | handler=`get_rule_by_code` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/automation/variables/{key}` | op=`get_variable` | handler=`get_variable` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/automation/variables/{key}/reveal` | op=`reveal_variable` | handler=`reveal_variable` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/sse/session/{session_id}` | op=`sse_session_handler` | handler=`sse_session_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/iam/auth/verify` | op=`verify_token` | handler=`verify_token` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/tenant/tenants/{id}` | op=`get_tenant` | handler=`get_tenant` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tenant/tenants/{id}/quota` | op=`get_tenant_quota` | handler=`get_tenant_quota` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tenant/by-code/{code}` | op=`get_tenant_by_code` | handler=`get_tenant_by_code` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tenant/tenants/{id}/activate` | op=`activate_tenant` | handler=`activate_tenant` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tenant/tenants/{id}/suspend` | op=`suspend_tenant` | handler=`suspend_tenant` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tenant/tenants/{tenant_id}/modules/{module_code}/activate` | op=`activate_module` | handler=`activate_module` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/tenant/tenants/{tenant_id}/modules/{module_code}/deactivate` | op=`deactivate_module` | handler=`deactivate_module` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/favorites/check` | op=`check_favorite` | handler=`check_favorite` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/mdm/refs/stats` | op=`get_overall_stats_handler` | handler=`get_overall_stats_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/mdm/refs/{master_data_id}` | op=`get_ref_handler` | handler=`get_ref_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/thumbnail/{id}` | op=`get_thumbnail` | handler=`get_thumbnail` | prescan2=`仍待甄别` | biz_decision=____

## portal (8)
- [ ] `/todos` | op=`get_todos` | handler=`get_todos` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/todos/{id}` | op=`complete_todo` | handler=`complete_todo` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/quick-actions/favorites` | op=`get_favorite_actions` | handler=`get_favorite_actions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/quick-actions/{id}/favorite` | op=`toggle_favorite_action` | handler=`toggle_favorite_action` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/search/suggestions` | op=`search_suggestions` | handler=`search_suggestions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/announcements/{id}/pin` | op=`toggle_announcement_pin` | handler=`toggle_announcement_pin` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/announcements/pinned` | op=`get_pinned_announcements` | handler=`get_pinned_announcements` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/navigation/menu` | op=`get_navigation_menu` | handler=`get_navigation_menu` | prescan2=`仍待甄别` | biz_decision=____

## erp (46)
- [ ] `/erp/master-data/domains/{id}` | op=`get_data_domain` | handler=`get_data_domain` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/entities/{entityType}/owner` | op=`get_entity_owner` | handler=`get_entity_owner` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/erp/master-data-refs/{master_data_id}` | op=`get_master_data_ref` | handler=`get_master_data_ref` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/erp/master-data-refs/conflicts/{conflict_id}` | op=`get_conflict` | handler=`get_conflict` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/classification/suggest-tags/{id}` | op=`classification_suggest_tags` | handler=`classification_suggest_tags` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/classification/learn-rule` | op=`classification_learn_rule` | handler=`classification_learn_rule` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/addressbook/fetch-entries-by-type` | op=`fetch_entries_by_type` | handler=`fetch_entries_by_type` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data-refs/get-relations-handler` | op=`get_relations_handler` | handler=`get_relations_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/procurement-e2e/validate` | op=`erp_e2e_validate` | handler=`validate_chain_handler` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/erp/procurement-e2e/validate-multi` | op=`erp_e2e_validate_multi` | handler=`validate_chain_multi_handler` | prescan2=`疑似动作/任务端点` | biz_decision=____
- [ ] `/api/erp/master-data-refs/maturity/assess` | op=`assess_maturity_handler` | handler=`assess_maturity_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/graph/nodes/{nodeId}` | op=`get_graph_node` | handler=`get_graph_node` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/graph/nodes/{nodeId}/neighbors` | op=`get_node_neighbors` | handler=`get_node_neighbors` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/knowledge/concepts/{conceptId}` | op=`get_concept` | handler=`get_concept` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/recommendations/similar` | op=`get_similar_entities` | handler=`get_similar_entities` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/recommendations/completions` | op=`get_completion_suggestions` | handler=`get_completion_suggestions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/erp/master-data-refs/lineage/origin/{id}` | op=`find_data_origin_handler` | handler=`find_data_origin_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/api/erp/master-data-refs/impact/analyze` | op=`analyze_impact_handler` | handler=`analyze_impact_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data-refs/get-lineage-graph-handler` | op=`get_lineage_graph_handler` | handler=`get_lineage_graph_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/hr-proxy/proxy-get-company` | op=`proxy_get_company` | handler=`proxy_get_company` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/hr-proxy/proxy-get-payroll` | op=`proxy_get_payroll` | handler=`proxy_get_payroll` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/matching/find-matches/{id}` | op=`matching_find_matches` | handler=`matching_find_matches` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/matching/duplicate-groups` | op=`matching_get_duplicate_groups` | handler=`matching_get_duplicate_groups` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/matching/suggest-merge` | op=`matching_suggest_merge` | handler=`matching_suggest_merge` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/master-data/services/{serviceId}/heartbeat` | op=`mdm_service_heartbeat` | handler=`mdm_service_heartbeat` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/erp/vehicles/{id}/requests` | op=`get_vehicle_requests` | handler=`get_vehicle_requests` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data-refs/conflicts/{conflict_id}` | op=`get_conflict` | handler=`get_conflict` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/domains` | op=`create_data_domain` | handler=`create_data_domain` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/entities/{entity_type}/owner` | op=`get_entity_owner` | handler=`get_entity_owner` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/graph` | op=`get_master_data_graph` | handler=`get_master_data_graph` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/graph/nodes/{node_id}` | op=`get_graph_node` | handler=`get_graph_node` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/graph/nodes/{node_id}/neighbors` | op=`get_node_neighbors` | handler=`get_node_neighbors` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/knowledge/concepts/{concept_id}` | op=`get_concept` | handler=`get_concept` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/recommendations/similar` | op=`get_similar_entities` | handler=`get_similar_entities` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/recommendations/completions` | op=`get_completion_suggestions` | handler=`get_completion_suggestions` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/services/{service_id}/heartbeat` | op=`mdm_service_heartbeat` | handler=`mdm_service_heartbeat` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/gateway/stats` | op=`mdm_gateway_stats` | handler=`mdm_gateway_stats` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/matching/find-matches/{id}` | op=`matching_find_matches` | handler=`matching_find_matches` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/matching/duplicates` | op=`matching_find_duplicates` | handler=`matching_find_duplicates` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/matching/duplicate-groups` | op=`matching_get_duplicate_groups` | handler=`matching_get_duplicate_groups` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/matching/suggest-merge` | op=`matching_suggest_merge` | handler=`matching_suggest_merge` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/classification/suggest-tags/{id}` | op=`classification_suggest_tags` | handler=`classification_suggest_tags` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data/classification/learn-rule` | op=`classification_learn_rule` | handler=`classification_learn_rule` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/master-data-refs/lineage/origin/{id}` | op=`find_data_origin_handler` | handler=`find_data_origin_handler` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/dictionaries/{id}` | op=`get_dictionary` | handler=`get_dictionary` | prescan2=`仍待甄别` | biz_decision=____
- [ ] `/search/global` | op=`global_search` | handler=`global_search` | prescan2=`仍待甄别` | biz_decision=____