# TOPEMS 后端服务 API 路由端点清单

**总计**: 25 个服务, 1638 个路由路径, 1931 个端点


## ai 服务

- **路由路径数**: 66
- **端点数**: 66
- **扫描文件数**: 26

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:1866 |
| POST | `/api/ai/agent/run` | `agent_run` | api/agent.rs:12 |
| GET | `/api/ai/agent/tools` | `list_agent_tools` | api/agent.rs:13 |
| POST | `/api/ai/analysis/classify` | `AnalysisApi::classify` | main.rs:1940 |
| POST | `/api/ai/analysis/history` | `AnalysisApi::history` | main.rs:1949 |
| POST | `/api/ai/analysis/sentiment` | `AnalysisApi::sentiment` | main.rs:1939 |
| POST | `/api/ai/chat` | `chat` | main.rs:1880 |
| POST | `/api/ai/complete` | `complete` | main.rs:1883 |
| GET | `/api/ai/connectors` | `list_connectors` | main.rs:1924 |
| POST | `/api/ai/connectors/create` | `create_connector` | main.rs:1926 |
| POST | `/api/ai/connectors/delete` | `delete_connector` | main.rs:1928 |
| GET | `/api/ai/connectors/get` | `get_connector` | main.rs:1925 |
| POST | `/api/ai/connectors/query` | `query_data` | main.rs:1930 |
| GET | `/api/ai/connectors/test` | `test_connector` | main.rs:1929 |
| POST | `/api/ai/connectors/update` | `update_connector` | main.rs:1927 |
| GET | `/api/ai/documents` | `DocumentApi::list` | main.rs:1887 |
| POST | `/api/ai/documents/qa` | `DocumentApi::document_qa` | main.rs:1899 |
| POST | `/api/ai/documents/upload` | `DocumentApi::upload` | main.rs:1888 |
| GET | `/api/ai/documents/{id}` | `DocumentApi::get` | main.rs:1893 |
| DELETE | `/api/ai/documents/{id}` | `DocumentApi::delete` | main.rs:1894 |
| POST | `/api/ai/documents/{id}/extract` | `DocumentApi::extract` | main.rs:1896 |
| POST | `/api/ai/documents/{id}/key-points` | `DocumentApi::extract_key_points` | main.rs:1898 |
| POST | `/api/ai/documents/{id}/process` | `DocumentApi::process` | main.rs:1895 |
| POST | `/api/ai/documents/{id}/summarize` | `DocumentApi::summarize` | main.rs:1897 |
| POST | `/api/ai/embedding/generate` | `EmbeddingApi::generate` | main.rs:1907 |
| POST | `/api/ai/generate` | `generate` | main.rs:1881 |
| GET | `/api/ai/health/detailed` | `health_check_detailed` | main.rs:1870 |
| GET | `/api/ai/metrics` | `VectorApi::stats` | main.rs:1871 |
| POST | `/api/ai/multimodal/image/analyze` | `MultimodalApi::analyze_image` | main.rs:1978 |
| POST | `/api/ai/multimodal/image/caption` | `MultimodalApi::generate_caption` | main.rs:1979 |
| POST | `/api/ai/multimodal/image/describe` | `MultimodalApi::describe_image` | main.rs:1982 |
| POST | `/api/ai/multimodal/image/objects` | `MultimodalApi::detect_objects` | main.rs:1980 |
| POST | `/api/ai/multimodal/image/text` | `MultimodalApi::extract_text` | main.rs:1981 |
| POST | `/api/ai/multimodal/video/analyze` | `MultimodalApi::analyze_video` | main.rs:1983 |
| POST | `/api/ai/multimodal/video/summary` | `MultimodalApi::summarize_video` | main.rs:1984 |
| POST | `/api/ai/profile/get` | `RecommendationApi::get_user_profile` | main.rs:1969 |
| POST | `/api/ai/profile/update` | `RecommendationApi::update_user_profile` | main.rs:1970 |
| POST | `/api/ai/qa/ask` | `QaApi::ask` | main.rs:1914 |
| POST | `/api/ai/qa/ask-conversation` | `QaApi::ask_conversation` | main.rs:1917 |
| POST | `/api/ai/qa/ask-structured` | `QaApi::ask_structured` | main.rs:1916 |
| POST | `/api/ai/qa/ask-with-context` | `QaApi::ask_with_context` | main.rs:1915 |
| POST | `/api/ai/qa/classify` | `QaApi::classify` | main.rs:1918 |
| POST | `/api/ai/qa/feedback` | `QaApi::feedback` | main.rs:1922 |
| GET | `/api/ai/qa/history` | `QaApi::history` | main.rs:1919 |
| POST | `/api/ai/qa/history/batch-delete` | `QaApi::batch_delete_history` | main.rs:1921 |
| DELETE | `/api/ai/qa/history/{id}` | `QaApi::delete_history` | main.rs:1920 |
| POST | `/api/ai/recommend` | `RecommendationApi::recommend` | main.rs:1965 |
| POST | `/api/ai/recommend/documents` | `RecommendationApi::recommend_documents` | main.rs:1966 |
| POST | `/api/ai/recommend/knowledge` | `RecommendationApi::recommend_knowledge` | main.rs:1968 |
| POST | `/api/ai/recommend/opportunities` | `RecommendationApi::recommend_opportunities` | main.rs:1967 |
| POST | `/api/ai/search` | `ai_search` | main.rs:1872 |
| POST | `/api/ai/summarize` | `summarize` | main.rs:1884 |
| GET | `/api/ai/templates` | `list_templates` | main.rs:1885 |
| POST | `/api/ai/validate` | `validate` | main.rs:1882 |
| POST | `/api/ai/vectors/batch-store` | `VectorApi::batch_store` | main.rs:1906 |
| POST | `/api/ai/vectors/clear` | `VectorApi::clear_all` | main.rs:1912 |
| POST | `/api/ai/vectors/search` | `VectorApi::search` | main.rs:1902 |
| GET | `/api/ai/vectors/stats` | `VectorApi::stats` | main.rs:1901 |
| POST | `/api/ai/vectors/store` | `VectorApi::store` | main.rs:1903 |
| GET | `/api/ai/vectors/{id}` | `VectorApi::get` | main.rs:1904 |
| DELETE | `/api/ai/vectors/{id}` | `VectorApi::delete` | main.rs:1905 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:1869 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:137 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:1868 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:136 |
| GET | `/health` | `health` | main.rs:1867 |

## analytics 服务

- **路由路径数**: 186
- **端点数**: 186
- **扫描文件数**: 27

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:104 |
| GET | `/` | `home` | main_bi.rs:106 |
| GET | `/` | `home` | main_report.rs:106 |
| GET | `/api/analytics/report` | `modules::report::report::list_reports` | main.rs:256 |
| POST | `/api/analytics/report` | `modules::report::report::create_report` | main.rs:257 |
| GET | `/api/analytics/report` | `modules::report::report::list_reports` | main_report.rs:116 |
| POST | `/api/analytics/report` | `modules::report::report::create_report` | main_report.rs:117 |
| GET | `/api/analytics/report/schedule` | `modules::report::schedule::list_schedules` | main.rs:269 |
| POST | `/api/analytics/report/schedule` | `modules::report::schedule::create_schedule` | main.rs:270 |
| GET | `/api/analytics/report/schedule/{id}` | `modules::report::schedule::get_schedule` | main.rs:271 |
| PUT | `/api/analytics/report/schedule/{id}` | `modules::report::schedule::update_schedule` | main.rs:272 |
| DELETE | `/api/analytics/report/schedule/{id}` | `modules::report::schedule::delete_schedule` | main.rs:273 |
| GET | `/api/analytics/report/template` | `modules::report::template::list_templates` | main.rs:264 |
| POST | `/api/analytics/report/template` | `modules::report::template::create_template` | main.rs:265 |
| GET | `/api/analytics/report/template/{id}` | `modules::report::template::get_template` | main.rs:266 |
| PUT | `/api/analytics/report/template/{id}` | `modules::report::template::update_template` | main.rs:267 |
| GET | `/api/analytics/report/{id}` | `modules::report::report::get_report` | main.rs:258 |
| PUT | `/api/analytics/report/{id}` | `modules::report::report::update_report` | main.rs:259 |
| DELETE | `/api/analytics/report/{id}` | `modules::report::report::delete_report` | main.rs:260 |
| GET | `/api/analytics/report/{id}` | `modules::report::report::get_report` | main_report.rs:118 |
| PUT | `/api/analytics/report/{id}` | `modules::report::report::update_report` | main_report.rs:119 |
| DELETE | `/api/analytics/report/{id}` | `modules::report::report::delete_report` | main_report.rs:120 |
| POST | `/api/analytics/report/{id}/export` | `modules::report::report::export_report` | main.rs:261 |
| POST | `/api/analytics/report/{id}/export` | `modules::report::report::export_report` | main_report.rs:121 |
| POST | `/api/analytics/report/{id}/run` | `modules::report::report::run_report` | main.rs:262 |
| POST | `/api/analytics/report/{id}/run` | `modules::report::report::run_report` | main_report.rs:122 |
| GET | `/api/analytics/schedule` | `modules::report::schedule::list_schedules` | main_report.rs:129 |
| POST | `/api/analytics/schedule` | `modules::report::schedule::create_schedule` | main_report.rs:130 |
| GET | `/api/analytics/schedule/{id}` | `modules::report::schedule::get_schedule` | main_report.rs:131 |
| PUT | `/api/analytics/schedule/{id}` | `modules::report::schedule::update_schedule` | main_report.rs:132 |
| GET | `/api/analytics/template` | `modules::report::template::list_templates` | main_report.rs:124 |
| POST | `/api/analytics/template` | `modules::report::template::create_template` | main_report.rs:125 |
| GET | `/api/analytics/template/{id}` | `modules::report::template::get_template` | main_report.rs:126 |
| PUT | `/api/analytics/template/{id}` | `modules::report::template::update_template` | main_report.rs:127 |
| GET | `/api/bi/analysis` | `modules::bi::analysis::list_analyses` | main.rs:186 |
| POST | `/api/bi/analysis` | `modules::bi::analysis::create_analysis` | main.rs:187 |
| GET | `/api/bi/analysis` | `modules::bi::analysis::list_analyses` | main_bi.rs:138 |
| POST | `/api/bi/analysis` | `modules::bi::analysis::create_analysis` | main_bi.rs:139 |
| GET | `/api/bi/analysis/{id}` | `modules::bi::analysis::get_analysis` | main.rs:188 |
| GET | `/api/bi/analysis/{id}` | `modules::bi::analysis::get_analysis` | main_bi.rs:140 |
| POST | `/api/bi/analysis/{id}/execute` | `modules::bi::analysis::execute_analysis` | main.rs:189 |
| POST | `/api/bi/analysis/{id}/execute` | `modules::bi::analysis::execute_analysis` | main_bi.rs:141 |
| GET | `/api/bi/analytics/development` | `modules::bi::analytics::get_development_analytics` | main.rs:248 |
| GET | `/api/bi/analytics/development` | `modules::bi::analytics::get_development_analytics` | main_bi.rs:144 |
| GET | `/api/bi/analytics/laboratory` | `modules::bi::analytics::get_laboratory_analytics` | main.rs:251 |
| GET | `/api/bi/analytics/laboratory` | `modules::bi::analytics::get_laboratory_analytics` | main_bi.rs:147 |
| GET | `/api/bi/analytics/overview` | `modules::bi::analytics::get_analytics_overview` | main.rs:252 |
| GET | `/api/bi/analytics/overview` | `modules::bi::analytics::get_analytics_overview` | main_bi.rs:148 |
| GET | `/api/bi/analytics/production` | `modules::bi::analytics::get_production_analytics` | main.rs:250 |
| GET | `/api/bi/analytics/production` | `modules::bi::analytics::get_production_analytics` | main_bi.rs:146 |
| GET | `/api/bi/analytics/quality` | `modules::bi::analytics::get_quality_analytics` | main.rs:249 |
| GET | `/api/bi/analytics/quality` | `modules::bi::analytics::get_quality_analytics` | main_bi.rs:145 |
| GET | `/api/bi/analytics/summary` | `modules::bi::analytics::get_summary_analytics` | main.rs:247 |
| GET | `/api/bi/analytics/summary` | `modules::bi::analytics::get_summary_analytics` | main_bi.rs:143 |
| GET | `/api/bi/comparison-analysis` | `modules::bi::comparison_analysis::list_comparisons` | main.rs:192 |
| POST | `/api/bi/comparison-analysis` | `modules::bi::comparison_analysis::create_comparison` | main.rs:193 |
| GET | `/api/bi/comparison-analysis/{id}` | `modules::bi::comparison_analysis::get_comparison` | main.rs:194 |
| PUT | `/api/bi/comparison-analysis/{id}` | `modules::bi::comparison_analysis::update_comparison` | main.rs:195 |
| DELETE | `/api/bi/comparison-analysis/{id}` | `modules::bi::comparison_analysis::delete_comparison` | main.rs:196 |
| GET | `/api/bi/comparison-analysis/{id}/result` | `modules::bi::comparison_analysis::get_comparison_result` | main.rs:198 |
| POST | `/api/bi/comparison-analysis/{id}/run` | `modules::bi::comparison_analysis::run_comparison` | main.rs:197 |
| GET | `/api/bi/dashboard` | `modules::bi::dashboard::list_dashboards` | main.rs:116 |
| POST | `/api/bi/dashboard` | `modules::bi::dashboard::create_dashboard` | main.rs:117 |
| GET | `/api/bi/dashboard` | `modules::bi::dashboard::list_dashboards` | main_bi.rs:116 |
| POST | `/api/bi/dashboard` | `modules::bi::dashboard::create_dashboard` | main_bi.rs:117 |
| POST | `/api/bi/dashboard/import` | `modules::bi::dashboard::import_dashboard` | main.rs:130 |
| GET | `/api/bi/dashboard/public` | `modules::bi::dashboard::get_public_dashboards` | main.rs:121 |
| GET | `/api/bi/dashboard/share/{share_id}` | `modules::bi::dashboard::get_shared_dashboard` | main.rs:126 |
| DELETE | `/api/bi/dashboard/share/{share_id}` | `modules::bi::dashboard::delete_share_link` | main.rs:127 |
| GET | `/api/bi/dashboard/template` | `modules::bi::dashboard::list_dashboard_templates` | main.rs:153 |
| POST | `/api/bi/dashboard/template` | `modules::bi::dashboard::create_dashboard_template` | main.rs:154 |
| GET | `/api/bi/dashboard/template/{id}` | `modules::bi::dashboard::get_dashboard_template` | main.rs:155 |
| PUT | `/api/bi/dashboard/template/{id}` | `modules::bi::dashboard::update_dashboard_template` | main.rs:156 |
| DELETE | `/api/bi/dashboard/template/{id}` | `modules::bi::dashboard::delete_dashboard_template` | main.rs:157 |
| POST | `/api/bi/dashboard/template/{template_id}/create` | `modules::bi::dashboard::create_dashboard_from_template` | main.rs:159 |
| GET | `/api/bi/dashboard/user/{owner_id}` | `modules::bi::dashboard::get_user_dashboards` | main.rs:122 |
| GET | `/api/bi/dashboard/{id}` | `modules::bi::dashboard::get_dashboard` | main.rs:118 |
| PUT | `/api/bi/dashboard/{id}` | `modules::bi::dashboard::update_dashboard` | main.rs:119 |
| DELETE | `/api/bi/dashboard/{id}` | `modules::bi::dashboard::delete_dashboard` | main.rs:120 |
| GET | `/api/bi/dashboard/{id}` | `modules::bi::dashboard::get_dashboard` | main_bi.rs:118 |
| PUT | `/api/bi/dashboard/{id}` | `modules::bi::dashboard::update_dashboard` | main_bi.rs:119 |
| DELETE | `/api/bi/dashboard/{id}` | `modules::bi::dashboard::delete_dashboard` | main_bi.rs:120 |
| POST | `/api/bi/dashboard/{id}/auto-refresh` | `modules::bi::dashboard::set_auto_refresh` | main.rs:135 |
| POST | `/api/bi/dashboard/{id}/clone` | `modules::bi::dashboard::clone_dashboard` | main.rs:158 |
| GET | `/api/bi/dashboard/{id}/export` | `modules::bi::dashboard::export_dashboard` | main.rs:129 |
| GET | `/api/bi/dashboard/{id}/export/excel` | `modules::bi::dashboard::export_dashboard_excel` | main.rs:138 |
| GET | `/api/bi/dashboard/{id}/export/pdf` | `modules::bi::dashboard::export_dashboard_pdf` | main.rs:137 |
| GET | `/api/bi/dashboard/{id}/realtime` | `modules::bi::dashboard::query_dashboard_realtime_data` | main.rs:132 |
| POST | `/api/bi/dashboard/{id}/refresh` | `modules::bi::dashboard::refresh_dashboard_data` | main.rs:134 |
| POST | `/api/bi/dashboard/{id}/share` | `modules::bi::dashboard::create_share_link` | main.rs:124 |
| GET | `/api/bi/dashboard/{id}/shares` | `modules::bi::dashboard::list_share_links` | main.rs:125 |
| GET | `/api/bi/data-sources` | `modules::bi::datasource::list_datasources` | main.rs:161 |
| POST | `/api/bi/data-sources` | `modules::bi::datasource::create_datasource` | main.rs:162 |
| GET | `/api/bi/data-sources/{id}` | `modules::bi::datasource::get_datasource` | main.rs:163 |
| PUT | `/api/bi/data-sources/{id}` | `modules::bi::datasource::update_datasource` | main.rs:164 |
| DELETE | `/api/bi/data-sources/{id}` | `modules::bi::datasource::delete_datasource` | main.rs:165 |
| POST | `/api/bi/data-sources/{id}/refresh` | `modules::bi::datasource::refresh_datasource` | main.rs:167 |
| POST | `/api/bi/data-sources/{id}/test` | `modules::bi::datasource::test_datasource` | main.rs:166 |
| GET | `/api/bi/datasource` | `modules::bi::datasource::list_datasources` | main_bi.rs:129 |
| POST | `/api/bi/datasource` | `modules::bi::datasource::create_datasource` | main_bi.rs:130 |
| GET | `/api/bi/datasource/{id}` | `modules::bi::datasource::get_datasource` | main_bi.rs:131 |
| PUT | `/api/bi/datasource/{id}` | `modules::bi::datasource::update_datasource` | main_bi.rs:132 |
| POST | `/api/bi/drilldown/drill-down` | `modules::bi::data_drilldown::drill_down` | main.rs:215 |
| POST | `/api/bi/drilldown/history` | `modules::bi::data_drilldown::get_drilldown_history` | main.rs:217 |
| GET | `/api/bi/drilldown/path` | `modules::bi::data_drilldown::list_drilldown_paths` | main.rs:210 |
| POST | `/api/bi/drilldown/path` | `modules::bi::data_drilldown::create_drilldown_path` | main.rs:211 |
| GET | `/api/bi/drilldown/path/{id}` | `modules::bi::data_drilldown::get_drilldown_path` | main.rs:212 |
| PUT | `/api/bi/drilldown/path/{id}` | `modules::bi::data_drilldown::update_drilldown_path` | main.rs:213 |
| DELETE | `/api/bi/drilldown/path/{id}` | `modules::bi::data_drilldown::delete_drilldown_path` | main.rs:214 |
| POST | `/api/bi/drilldown/roll-up` | `modules::bi::data_drilldown::roll_up` | main.rs:216 |
| POST | `/api/bi/multidim/cube` | `modules::bi::multidimensional_analysis::query_cube` | main.rs:220 |
| GET | `/api/bi/multidim/datasource/{datasource_id}/dimensions` | `modules::bi::multidimensional_analysis::get_available_dimensions` | main.rs:225 |
| GET | `/api/bi/multidim/datasource/{datasource_id}/measures` | `modules::bi::multidimensional_analysis::get_available_measures` | main.rs:226 |
| POST | `/api/bi/multidim/dice` | `modules::bi::multidimensional_analysis::dice_cube` | main.rs:222 |
| POST | `/api/bi/multidim/pivot` | `modules::bi::multidimensional_analysis::pivot_table` | main.rs:223 |
| POST | `/api/bi/multidim/rank` | `modules::bi::multidimensional_analysis::rank_data` | main.rs:224 |
| POST | `/api/bi/multidim/slice` | `modules::bi::multidimensional_analysis::slice_cube` | main.rs:221 |
| POST | `/api/bi/permission/filter` | `modules::bi::row_level_permission::filter_data` | main.rs:242 |
| GET | `/api/bi/permission/rule` | `modules::bi::row_level_permission::list_permission_rules` | main.rs:236 |
| POST | `/api/bi/permission/rule` | `modules::bi::row_level_permission::create_permission_rule` | main.rs:237 |
| GET | `/api/bi/permission/rule-types` | `modules::bi::row_level_permission::get_permission_rule_types` | main.rs:244 |
| GET | `/api/bi/permission/rule/{id}` | `modules::bi::row_level_permission::get_permission_rule` | main.rs:238 |
| PUT | `/api/bi/permission/rule/{id}` | `modules::bi::row_level_permission::update_permission_rule` | main.rs:239 |
| DELETE | `/api/bi/permission/rule/{id}` | `modules::bi::row_level_permission::delete_permission_rule` | main.rs:240 |
| GET | `/api/bi/permission/user/{user_id}` | `modules::bi::row_level_permission::get_user_permissions` | main.rs:243 |
| POST | `/api/bi/permission/validate` | `modules::bi::row_level_permission::validate_permission` | main.rs:241 |
| POST | `/api/bi/prediction/compare` | `modules::bi::predictive_analysis::prediction_comparison` | main.rs:233 |
| POST | `/api/bi/prediction/exponential-smoothing` | `modules::bi::predictive_analysis::exponential_smoothing_forecast` | main.rs:231 |
| GET | `/api/bi/prediction/methods` | `modules::bi::predictive_analysis::get_prediction_methods` | main.rs:229 |
| POST | `/api/bi/prediction/moving-average` | `modules::bi::predictive_analysis::moving_average_forecast` | main.rs:230 |
| POST | `/api/bi/prediction/trend` | `modules::bi::predictive_analysis::trend_analysis` | main.rs:232 |
| GET | `/api/bi/report` | `modules::bi::self_service_report::list_reports` | main.rs:201 |
| POST | `/api/bi/report` | `modules::bi::self_service_report::create_report` | main.rs:202 |
| GET | `/api/bi/report/{id}` | `modules::bi::self_service_report::get_report` | main.rs:203 |
| PUT | `/api/bi/report/{id}` | `modules::bi::self_service_report::update_report` | main.rs:204 |
| DELETE | `/api/bi/report/{id}` | `modules::bi::self_service_report::delete_report` | main.rs:205 |
| GET | `/api/bi/report/{id}/export` | `modules::bi::self_service_report::export_report` | main.rs:207 |
| POST | `/api/bi/report/{id}/query` | `modules::bi::self_service_report::query_report_data` | main.rs:206 |
| GET | `/api/bi/sync-records` | `modules::bi::sync_records::list_sync_records` | main.rs:170 |
| POST | `/api/bi/sync-records` | `modules::bi::sync_records::create_sync_record` | main.rs:171 |
| GET | `/api/bi/sync-records/{id}` | `modules::bi::sync_records::get_sync_record` | main.rs:172 |
| PUT | `/api/bi/sync-records/{id}` | `modules::bi::sync_records::update_sync_record` | main.rs:173 |
| DELETE | `/api/bi/sync-records/{id}` | `modules::bi::sync_records::delete_sync_record` | main.rs:174 |
| POST | `/api/bi/sync-records/{id}/retry` | `modules::bi::sync_records::retry_sync` | main.rs:175 |
| GET | `/api/bi/visualization` | `modules::bi::visualization::list_visualizations` | main.rs:177 |
| POST | `/api/bi/visualization` | `modules::bi::visualization::create_visualization` | main.rs:178 |
| GET | `/api/bi/visualization` | `modules::bi::visualization::list_visualizations` | main_bi.rs:134 |
| POST | `/api/bi/visualization` | `modules::bi::visualization::create_visualization` | main_bi.rs:135 |
| POST | `/api/bi/visualization/bar` | `modules::bi::visualization::generate_bar_chart` | main.rs:182 |
| GET | `/api/bi/visualization/chart-types` | `modules::bi::visualization::get_chart_types` | main.rs:180 |
| POST | `/api/bi/visualization/gauge` | `modules::bi::visualization::generate_gauge_chart` | main.rs:184 |
| POST | `/api/bi/visualization/line` | `modules::bi::visualization::generate_line_chart` | main.rs:181 |
| POST | `/api/bi/visualization/pie` | `modules::bi::visualization::generate_pie_chart` | main.rs:183 |
| GET | `/api/bi/visualization/{id}` | `modules::bi::visualization::get_visualization` | main.rs:179 |
| GET | `/api/bi/visualization/{id}` | `modules::bi::visualization::get_visualization` | main_bi.rs:136 |
| GET | `/api/bi/widget` | `modules::bi::widget::list_widgets` | main.rs:142 |
| POST | `/api/bi/widget` | `modules::bi::widget::create_widget` | main.rs:143 |
| GET | `/api/bi/widget` | `modules::bi::widget::list_widgets` | main_bi.rs:122 |
| POST | `/api/bi/widget` | `modules::bi::widget::create_widget` | main_bi.rs:123 |
| POST | `/api/bi/widget/cache/invalidate-all` | `modules::bi::widget::invalidate_all_widget_cache` | main.rs:150 |
| GET | `/api/bi/widget/dashboard/{dashboard_id}` | `modules::bi::widget::get_widgets_by_dashboard` | main.rs:151 |
| GET | `/api/bi/widget/{id}` | `modules::bi::widget::get_widget` | main.rs:144 |
| PUT | `/api/bi/widget/{id}` | `modules::bi::widget::update_widget` | main.rs:145 |
| DELETE | `/api/bi/widget/{id}` | `modules::bi::widget::delete_widget` | main.rs:146 |
| GET | `/api/bi/widget/{id}` | `modules::bi::widget::get_widget` | main_bi.rs:124 |
| PUT | `/api/bi/widget/{id}` | `modules::bi::widget::update_widget` | main_bi.rs:125 |
| DELETE | `/api/bi/widget/{id}` | `modules::bi::widget::delete_widget` | main_bi.rs:126 |
| POST | `/api/bi/widget/{id}/cache/invalidate` | `modules::bi::widget::invalidate_widget_cache` | main.rs:149 |
| GET | `/api/bi/widget/{id}/data` | `modules::bi::widget::get_widget_data` | main.rs:147 |
| GET | `/api/bi/widget/{id}/data` | `modules::bi::widget::get_widget_data` | main_bi.rs:127 |
| GET | `/api/bi/widget/{id}/data/realtime` | `modules::bi::widget::get_widget_data_realtime` | main.rs:148 |
| GET | `/api/plugins/health` | `modules::bi::plugin::plugin_health_check` | main.rs:109 |
| GET | `/api/plugins/health` | `modules::bi::plugin::plugin_health_check` | main_bi.rs:110 |
| GET | `/api/plugins/health` | `modules::report::report_plugin::plugin_health_check` | main_report.rs:110 |
| GET | `/api/plugins/health` | `plugin_health_check` | modules/bi/plugin.rs:110 |
| GET | `/api/plugins/health` | `plugin_health_check` | modules/report/report_plugin.rs:63 |
| GET | `/api/plugins/info` | `modules::bi::plugin::get_plugin_info` | main.rs:108 |
| GET | `/api/plugins/info` | `modules::bi::plugin::get_plugin_info` | main_bi.rs:109 |
| GET | `/api/plugins/info` | `modules::report::report_plugin::get_plugin_info` | main_report.rs:109 |
| GET | `/api/plugins/info` | `get_plugin_info` | modules/bi/plugin.rs:109 |
| GET | `/api/plugins/info` | `get_plugin_info` | modules/report/report_plugin.rs:62 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:276 |
| GET | `/health` | `health` | main.rs:105 |
| GET | `/health` | `health` | main_bi.rs:107 |
| GET | `/health` | `health` | main_report.rs:107 |
| GET | `/ws/dashboard/{dashboard_id}` | `modules::bi::websocket::dashboard_websocket` | main.rs:140 |

## config-center 服务

- **路由路径数**: 7
- **端点数**: 7
- **扫描文件数**: 3

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/config/:service` | `list_configs` | api/config.rs:148 |
| GET | `/config/:service/:key` | `get_config` | api/config.rs:145 |
| PUT | `/config/:service/:key` | `set_config` | api/config.rs:146 |
| DELETE | `/config/:service/:key` | `delete_config` | api/config.rs:147 |
| GET | `/config/:service/:key/exists` | `exists_config` | api/config.rs:151 |
| GET | `/config/:service/:key/history` | `get_history` | api/config.rs:149 |
| POST | `/config/:service/:key/rollback` | `rollback_config` | api/config.rs:150 |

## crm 服务

- **路由路径数**: 41
- **端点数**: 48
- **扫描文件数**: 33

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/crm/audit-logs` | `list_audit_logs` | api/audit.rs:19 |
| GET | `/api/crm/audit-logs/{id}` | `get_audit_log` | api/audit.rs:20 |
| POST | `/api/crm/billing/{id}/notify` | `send_billing_notification` | api/billing.rs:30 |
| POST | `/api/crm/billing/{id}/paid` | `mark_billing_paid` | api/billing.rs:29 |
| GET | `/api/crm/contacts` | `list_contacts` | api/contact.rs:34 |
| POST | `/api/crm/contacts` | `create_contact` | |
| POST | `/api/crm/contacts/batch-delete` | `batch_delete_contacts` | api/contact.rs:35 |
| GET | `/api/crm/customer-profiles` | `list_customer_profiles` | api/customer_profile.rs:105 |
| GET | `/api/crm/customers/{id}/details` | `get_customer_details` | api/dashboard.rs:30 |
| GET | `/api/crm/customers/{id}/profile` | `get_customer_profile` | api/customer_profile.rs:102 |
| POST | `/api/crm/customers/{id}/profile/tags` | `add_profile_tags` | api/customer_profile.rs:103 |
| DELETE | `/api/crm/customers/{id}/profile/tags` | `remove_profile_tags` | api/customer_profile.rs:104 |
| GET | `/api/crm/customers/{id}/recommendations` | `get_customer_recommendations` | api/customer_recommendation.rs:57 |
| GET | `/api/crm/customers/{id}/tags` | `get_customer_tags` | api/tag.rs:30 |
| POST | `/api/crm/customers/{id}/tags` | `add_tag_to_customer` | |
| DELETE | `/api/crm/customers/{id}/tags/{tag_id}` | `remove_tag_from_customer` | api/tag.rs:31 |
| GET | `/api/crm/dashboard/forecast` | `get_sales_forecast` | api/dashboard.rs:29 |
| GET | `/api/crm/dashboard/funnel` | `get_sales_funnel` | api/dashboard.rs:28 |
| GET | `/api/crm/dashboard/stats` | `get_dashboard_stats` | api/dashboard.rs:27 |
| GET | `/api/crm/opportunities/forecast` | `get_opportunity_forecast` | api/opportunity.rs:90 |
| GET | `/api/crm/opportunities/funnel` | `get_sales_funnel` | api/opportunity.rs:88 |
| GET | `/api/crm/opportunities/stage-transitions` | `get_stage_transitions` | api/opportunity.rs:91 |
| GET | `/api/crm/opportunities/stats` | `get_opportunity_stats` | api/opportunity.rs:89 |
| GET | `/api/crm/recommendations` | `list_recommendations` | api/customer_recommendation.rs:56 |
| POST | `/api/crm/recommendations` | `create_recommendation` | |
| GET | `/api/crm/recommendations/{id}` | `get_recommendation` | api/customer_recommendation.rs:58 |
| GET | `/api/crm/sales-funnel` | `get_funnel_data` | api/sales_funnel.rs:65 |
| GET | `/api/crm/sales-funnel/conversion` | `get_funnel_conversion` | api/sales_funnel.rs:67 |
| GET | `/api/crm/sales-funnel/metrics` | `get_funnel_metrics` | api/sales_funnel.rs:66 |
| GET | `/api/crm/sales-funnel/stage/{stage}` | `get_stage_opportunities` | api/sales_funnel.rs:69 |
| GET | `/api/crm/sales-funnel/trend` | `get_funnel_trend` | api/sales_funnel.rs:68 |
| GET | `/api/crm/segments` | `list_segments` | api/customer_segmentation.rs:77 |
| POST | `/api/crm/segments` | `create_segment` | |
| GET | `/api/crm/segments/auto` | `auto_segment` | api/customer_segmentation.rs:81 |
| GET | `/api/crm/segments/{id}` | `get_segment` | api/customer_segmentation.rs:78 |
| DELETE | `/api/crm/segments/{id}` | `delete_segment` | api/customer_segmentation.rs:80 |
| GET | `/api/crm/segments/{id}/customers` | `get_segment_customers` | api/customer_segmentation.rs:79 |
| GET | `/api/crm/tags` | `list_tags` | api/tag.rs:27 |
| POST | `/api/crm/tags` | `create_tag` | |
| GET | `/api/crm/tags/{id}` | `get_tag` | api/tag.rs:28 |
| PUT | `/api/crm/tags/{id}` | `update_tag` | |
| DELETE | `/api/crm/tags/{id}` | `delete_tag` | |
| GET | `/api/crm/tags/{id}/customers` | `get_tagged_customers` | api/tag.rs:29 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:115 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:114 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:93 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:94 |
| GET | `/health` | `health_check` | main.rs:92 |

## ehs 服务

- **路由路径数**: 103
- **端点数**: 175
- **扫描文件数**: 20

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:97 |
| GET | `/api/ehs/checks/plans` | `list_plans` | api/safety.rs:11 |
| POST | `/api/ehs/checks/plans` | `create_plan` | |
| GET | `/api/ehs/checks/plans/{id}` | `get_plan` | api/safety.rs:12 |
| PUT | `/api/ehs/checks/plans/{id}` | `update_plan` | |
| DELETE | `/api/ehs/checks/plans/{id}` | `delete_plan` | |
| GET | `/api/ehs/checks/plans/{plan_id}/items` | `list_plan_items` | api/safety.rs:13 |
| POST | `/api/ehs/checks/plans/{plan_id}/items` | `create_plan_item` | |
| DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | `delete_plan_item` | api/safety.rs:14 |
| GET | `/api/ehs/checks/records` | `list_records` | api/safety.rs:15 |
| POST | `/api/ehs/checks/records` | `create_record` | |
| GET | `/api/ehs/checks/records/{id}` | `get_record` | api/safety.rs:16 |
| PUT | `/api/ehs/checks/records/{id}` | `update_record` | |
| DELETE | `/api/ehs/checks/records/{id}` | `delete_record` | |
| GET | `/api/ehs/drills/plans` | `list_drill_plans` | api/emergency_drill.rs:11 |
| POST | `/api/ehs/drills/plans` | `create_drill_plan` | |
| GET | `/api/ehs/drills/plans/{id}` | `get_drill_plan` | api/emergency_drill.rs:12 |
| PUT | `/api/ehs/drills/plans/{id}` | `update_drill_plan` | |
| DELETE | `/api/ehs/drills/plans/{id}` | `delete_drill_plan` | |
| GET | `/api/ehs/drills/records` | `list_drill_records` | api/emergency_drill.rs:13 |
| POST | `/api/ehs/drills/records` | `create_drill_record` | |
| GET | `/api/ehs/drills/records/{id}` | `get_drill_record` | api/emergency_drill.rs:14 |
| PUT | `/api/ehs/drills/records/{id}` | `update_drill_record` | |
| DELETE | `/api/ehs/drills/records/{id}` | `delete_drill_record` | |
| POST | `/api/ehs/drills/records/{id}/evaluation` | `create_drill_evaluation` | api/emergency_drill.rs:15 |
| GET | `/api/ehs/drills/records/{id}/problems` | `list_drill_problems` | api/emergency_drill.rs:16 |
| POST | `/api/ehs/drills/records/{id}/problems` | `create_drill_problem` | |
| PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | `update_drill_problem` | api/emergency_drill.rs:17 |
| GET | `/api/ehs/drills/statistics` | `get_drill_statistics` | api/emergency_drill.rs:19 |
| GET | `/api/ehs/drills/types` | `list_drill_types` | api/emergency_drill.rs:18 |
| GET | `/api/ehs/emergency-plans` | `list_plans` | api/emergency_plan.rs:11 |
| POST | `/api/ehs/emergency-plans` | `create_plan` | |
| GET | `/api/ehs/emergency-plans/categories` | `list_plan_categories` | api/emergency_plan.rs:12 |
| GET | `/api/ehs/emergency-plans/{id}` | `get_plan` | api/emergency_plan.rs:13 |
| PUT | `/api/ehs/emergency-plans/{id}` | `update_plan` | |
| DELETE | `/api/ehs/emergency-plans/{id}` | `delete_plan` | |
| POST | `/api/ehs/emergency-plans/{id}/approve` | `approve_plan` | api/emergency_plan.rs:18 |
| POST | `/api/ehs/emergency-plans/{id}/submit-approval` | `submit_plan_approval` | api/emergency_plan.rs:17 |
| GET | `/api/ehs/emergency-plans/{id}/supplies` | `list_plan_supplies` | api/emergency_plan.rs:14 |
| POST | `/api/ehs/emergency-plans/{id}/supplies` | `add_plan_supply` | |
| DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | `delete_plan_supply` | api/emergency_plan.rs:15 |
| GET | `/api/ehs/emergency-plans/{id}/versions` | `list_plan_versions` | api/emergency_plan.rs:16 |
| POST | `/api/ehs/emergency-plans/{id}/versions` | `create_new_version` | |
| GET | `/api/ehs/environment` | `list_records` | api/environment.rs:11 |
| POST | `/api/ehs/environment` | `create_record` | |
| GET | `/api/ehs/environmental-compliance/evaluations` | `list_evaluations` | api/environmental_compliance.rs:14 |
| POST | `/api/ehs/environmental-compliance/evaluations` | `create_evaluation` | |
| GET | `/api/ehs/environmental-compliance/evaluations/{id}` | `get_evaluation` | api/environmental_compliance.rs:15 |
| PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | `update_evaluation` | |
| DELETE | `/api/ehs/environmental-compliance/evaluations/{id}` | `delete_evaluation` | |
| GET | `/api/ehs/environmental-compliance/incidents` | `list_incidents` | api/environmental_compliance.rs:21 |
| POST | `/api/ehs/environmental-compliance/incidents` | `create_incident` | |
| GET | `/api/ehs/environmental-compliance/incidents/{id}` | `get_incident` | api/environmental_compliance.rs:22 |
| PUT | `/api/ehs/environmental-compliance/incidents/{id}` | `update_incident` | |
| DELETE | `/api/ehs/environmental-compliance/incidents/{id}` | `delete_incident` | |
| GET | `/api/ehs/environmental-compliance/monitoring` | `list_monitor_records` | api/environmental_compliance.rs:16 |
| POST | `/api/ehs/environmental-compliance/monitoring` | `create_monitor_record` | |
| GET | `/api/ehs/environmental-compliance/monitoring/types` | `list_monitor_types` | api/environmental_compliance.rs:17 |
| GET | `/api/ehs/environmental-compliance/monitoring/{id}` | `get_monitor_record` | api/environmental_compliance.rs:18 |
| DELETE | `/api/ehs/environmental-compliance/monitoring/{id}` | `delete_monitor_record` | |
| GET | `/api/ehs/environmental-compliance/permits` | `list_permits` | api/environmental_compliance.rs:19 |
| POST | `/api/ehs/environmental-compliance/permits` | `create_permit` | |
| GET | `/api/ehs/environmental-compliance/permits/{id}` | `get_permit` | api/environmental_compliance.rs:20 |
| PUT | `/api/ehs/environmental-compliance/permits/{id}` | `update_permit` | |
| DELETE | `/api/ehs/environmental-compliance/permits/{id}` | `delete_permit` | |
| GET | `/api/ehs/environmental-compliance/regulations` | `list_regulations` | api/environmental_compliance.rs:11 |
| POST | `/api/ehs/environmental-compliance/regulations` | `create_regulation` | |
| GET | `/api/ehs/environmental-compliance/regulations/categories` | `list_regulation_categories` | api/environmental_compliance.rs:12 |
| GET | `/api/ehs/environmental-compliance/regulations/{id}` | `get_regulation` | api/environmental_compliance.rs:13 |
| PUT | `/api/ehs/environmental-compliance/regulations/{id}` | `update_regulation` | |
| DELETE | `/api/ehs/environmental-compliance/regulations/{id}` | `delete_regulation` | |
| GET | `/api/ehs/environmental-compliance/statistics` | `get_compliance_statistics` | api/environmental_compliance.rs:23 |
| GET | `/api/ehs/hazardous-materials` | `list_materials` | api/hazardous_material.rs:11 |
| POST | `/api/ehs/hazardous-materials` | `create_material` | |
| GET | `/api/ehs/hazardous-materials/categories` | `list_material_categories` | api/hazardous_material.rs:12 |
| GET | `/api/ehs/hazardous-materials/statistics` | `get_material_statistics` | api/hazardous_material.rs:13 |
| GET | `/api/ehs/hazardous-materials/stock-records` | `list_stock_records` | api/hazardous_material.rs:17 |
| POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | `create_stock_in` | api/hazardous_material.rs:18 |
| POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | `create_stock_out` | api/hazardous_material.rs:19 |
| GET | `/api/ehs/hazardous-materials/stock-records/{id}` | `get_stock_record` | api/hazardous_material.rs:20 |
| GET | `/api/ehs/hazardous-materials/{id}` | `get_material` | api/hazardous_material.rs:14 |
| PUT | `/api/ehs/hazardous-materials/{id}` | `update_material` | |
| DELETE | `/api/ehs/hazardous-materials/{id}` | `delete_material` | |
| GET | `/api/ehs/hazardous-materials/{id}/msds` | `get_material_msds` | api/hazardous_material.rs:16 |
| PUT | `/api/ehs/hazardous-materials/{id}/msds` | `update_material_msds` | |
| GET | `/api/ehs/hazardous-materials/{id}/stocks` | `list_material_stocks` | api/hazardous_material.rs:15 |
| GET | `/api/ehs/hazards` | `list_risks` | api/risk.rs:11 |
| POST | `/api/ehs/hazards` | `create_risk` | |
| GET | `/api/ehs/hazards/{id}` | `get_risk` | api/risk.rs:12 |
| PUT | `/api/ehs/hazards/{id}` | `update_risk` | |
| POST | `/api/ehs/hazards/{id}/assessments` | `assess_risk` | api/risk.rs:13 |
| GET | `/api/ehs/health` | `list_records` | api/health.rs:11 |
| POST | `/api/ehs/health` | `create_record` | |
| GET | `/api/ehs/incidents` | `list_accidents` | api/accident.rs:11 |
| POST | `/api/ehs/incidents` | `report_accident` | |
| GET | `/api/ehs/incidents/{id}` | `get_accident` | api/accident.rs:12 |
| PUT | `/api/ehs/incidents/{id}` | `update_accident` | |
| DELETE | `/api/ehs/incidents/{id}` | `delete_accident` | |
| POST | `/api/ehs/incidents/{id}/close` | `close_accident` | api/accident.rs:19 |
| POST | `/api/ehs/incidents/{id}/investigation` | `start_investigation` | api/accident.rs:13 |
| PUT | `/api/ehs/incidents/{id}/investigation` | `update_investigation` | |
| POST | `/api/ehs/incidents/{id}/investigation/complete` | `complete_investigation` | api/accident.rs:14 |
| POST | `/api/ehs/incidents/{id}/review` | `create_review` | api/accident.rs:18 |
| POST | `/api/ehs/incidents/{id}/treatment` | `create_treatment` | api/accident.rs:15 |
| PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | `update_treatment_action` | api/accident.rs:16 |
| POST | `/api/ehs/incidents/{id}/treatment/complete` | `complete_treatment` | api/accident.rs:17 |
| GET | `/api/ehs/issues` | `list_hazards` | api/hazard.rs:11 |
| POST | `/api/ehs/issues` | `create_hazard` | |
| GET | `/api/ehs/issues/{id}` | `get_hazard` | api/hazard.rs:12 |
| PUT | `/api/ehs/issues/{id}` | `update_hazard` | |
| DELETE | `/api/ehs/issues/{id}` | `delete_hazard` | |
| POST | `/api/ehs/issues/{id}/close` | `close_hazard` | api/hazard.rs:16 |
| POST | `/api/ehs/issues/{id}/rectification` | `start_rectification` | api/hazard.rs:13 |
| PUT | `/api/ehs/issues/{id}/rectification` | `update_rectification` | |
| POST | `/api/ehs/issues/{id}/rectification/submit` | `submit_rectification` | api/hazard.rs:14 |
| POST | `/api/ehs/issues/{id}/verification` | `verify_hazard` | api/hazard.rs:15 |
| GET | `/api/ehs/occupational-disease/cases` | `list_disease_cases` | api/occupational_disease.rs:15 |
| POST | `/api/ehs/occupational-disease/cases` | `create_disease_case` | |
| GET | `/api/ehs/occupational-disease/cases/{id}` | `get_disease_case` | api/occupational_disease.rs:16 |
| PUT | `/api/ehs/occupational-disease/cases/{id}` | `update_disease_case` | |
| DELETE | `/api/ehs/occupational-disease/cases/{id}` | `delete_disease_case` | |
| GET | `/api/ehs/occupational-disease/detections` | `list_detection_records` | api/occupational_disease.rs:13 |
| POST | `/api/ehs/occupational-disease/detections` | `create_detection_record` | |
| GET | `/api/ehs/occupational-disease/detections/{id}` | `get_detection_record` | api/occupational_disease.rs:14 |
| DELETE | `/api/ehs/occupational-disease/detections/{id}` | `delete_detection_record` | |
| GET | `/api/ehs/occupational-disease/factor-types` | `list_factor_types` | api/occupational_disease.rs:21 |
| GET | `/api/ehs/occupational-disease/factors` | `list_hazard_factors` | api/occupational_disease.rs:11 |
| POST | `/api/ehs/occupational-disease/factors` | `create_hazard_factor` | |
| GET | `/api/ehs/occupational-disease/factors/{id}` | `get_hazard_factor` | api/occupational_disease.rs:12 |
| PUT | `/api/ehs/occupational-disease/factors/{id}` | `update_hazard_factor` | |
| DELETE | `/api/ehs/occupational-disease/factors/{id}` | `delete_hazard_factor` | |
| GET | `/api/ehs/occupational-disease/protection-measures` | `list_protection_measures` | api/occupational_disease.rs:17 |
| POST | `/api/ehs/occupational-disease/protection-measures` | `create_protection_measure` | |
| GET | `/api/ehs/occupational-disease/protection-measures/{id}` | `get_protection_measure` | api/occupational_disease.rs:18 |
| PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | `update_protection_measure` | |
| DELETE | `/api/ehs/occupational-disease/protection-measures/{id}` | `delete_protection_measure` | |
| GET | `/api/ehs/occupational-disease/statistics` | `get_disease_statistics` | api/occupational_disease.rs:22 |
| GET | `/api/ehs/occupational-disease/trainings` | `list_health_trainings` | api/occupational_disease.rs:19 |
| POST | `/api/ehs/occupational-disease/trainings` | `create_health_training` | |
| GET | `/api/ehs/occupational-disease/trainings/{id}` | `get_health_training` | api/occupational_disease.rs:20 |
| DELETE | `/api/ehs/occupational-disease/trainings/{id}` | `delete_health_training` | |
| GET | `/api/ehs/occupational-health/abnormalities` | `list_abnormalities` | api/occupational_health.rs:18 |
| PUT | `/api/ehs/occupational-health/abnormalities/{id}` | `update_abnormality` | api/occupational_health.rs:19 |
| GET | `/api/ehs/occupational-health/archives/{employee_id}` | `get_health_archive` | api/occupational_health.rs:15 |
| GET | `/api/ehs/occupational-health/contraindications` | `list_contraindications` | api/occupational_health.rs:16 |
| POST | `/api/ehs/occupational-health/contraindications` | `create_contraindication` | |
| PUT | `/api/ehs/occupational-health/contraindications/{id}` | `update_contraindication` | api/occupational_health.rs:17 |
| DELETE | `/api/ehs/occupational-health/contraindications/{id}` | `delete_contraindication` | |
| GET | `/api/ehs/occupational-health/exam-plans` | `list_exam_plans` | api/occupational_health.rs:11 |
| POST | `/api/ehs/occupational-health/exam-plans` | `create_exam_plan` | |
| GET | `/api/ehs/occupational-health/exam-plans/{id}` | `get_exam_plan` | api/occupational_health.rs:12 |
| PUT | `/api/ehs/occupational-health/exam-plans/{id}` | `update_exam_plan` | |
| DELETE | `/api/ehs/occupational-health/exam-plans/{id}` | `delete_exam_plan` | |
| GET | `/api/ehs/occupational-health/exam-records` | `list_exam_records` | api/occupational_health.rs:13 |
| POST | `/api/ehs/occupational-health/exam-records` | `create_exam_record` | |
| GET | `/api/ehs/occupational-health/exam-records/{id}` | `get_exam_record` | api/occupational_health.rs:14 |
| PUT | `/api/ehs/occupational-health/exam-records/{id}` | `update_exam_record` | |
| DELETE | `/api/ehs/occupational-health/exam-records/{id}` | `delete_exam_record` | |
| GET | `/api/ehs/occupational-health/exam-types` | `list_exam_types` | api/occupational_health.rs:20 |
| GET | `/api/ehs/occupational-health/statistics` | `get_health_statistics` | api/occupational_health.rs:21 |
| GET | `/api/ehs/sync-records` | `list_sync_records` | api/data_sync.rs:12 |
| GET | `/api/ehs/sync-records/{id}` | `get_sync_record` | api/data_sync.rs:13 |
| DELETE | `/api/ehs/sync-records/{id}` | `delete_sync_record` | |
| POST | `/api/ehs/sync-records/{id}/retry` | `retry_sync` | api/data_sync.rs:14 |
| POST | `/api/ehs/sync/accident-to-lims` | `sync_accident_to_lims` | api/data_sync.rs:16 |
| POST | `/api/ehs/sync/hazard-to-qms` | `sync_hazard_to_qms` | api/data_sync.rs:15 |
| GET | `/api/ehs/training` | `list_trainings` | api/training.rs:11 |
| POST | `/api/ehs/training` | `create_training` | |
| GET | `/api/ehs/training/{id}` | `get_training` | api/training.rs:12 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:100 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:92 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:99 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:91 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:107 |
| GET | `/health` | `health` | main.rs:98 |

## erp 服务

- **路由路径数**: 51
- **端点数**: 59
- **扫描文件数**: 44

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/erp/addressbook` | `get_contacts` | api/addressbook.rs:483 |
| GET | `/api/erp/addressbook/departments/tree` | `get_department_tree` | api/addressbook.rs:486 |
| GET | `/api/erp/addressbook/export` | `export_contacts` | api/addressbook.rs:487 |
| GET | `/api/erp/addressbook/search` | `search_contacts` | api/addressbook.rs:485 |
| GET | `/api/erp/addressbook/{id}` | `get_contact_detail` | api/addressbook.rs:484 |
| GET | `/api/erp/assets` | `list_assets` | api/asset.rs:28 |
| POST | `/api/erp/assets` | `create_asset` | |
| GET | `/api/erp/audit-logs` | `list_audit_logs` | api/audit.rs:62 |
| GET | `/api/erp/audit-logs/{id}` | `get_audit_log` | api/audit.rs:63 |
| GET | `/api/erp/bank-transactions/{id}` | `get_bank_transaction` | api/bank.rs:145 |
| GET | `/api/erp/budgets` | `list_budgets` | api/finance.rs:56 |
| POST | `/api/erp/budgets` | `create_budget` | |
| GET | `/api/erp/consolidation/company-tree` | `get_company_tree` | api/consolidation.rs:171 |
| GET | `/api/erp/db/changes` | `list_db_changes` | api/db_structure.rs:53 |
| POST | `/api/erp/db/columns` | `execute_add_column` | api/db_structure.rs:48 |
| POST | `/api/erp/db/columns/preview` | `preview_add_column` | api/db_structure.rs:47 |
| GET | `/api/erp/db/tables` | `list_tables` | api/db_structure.rs:45 |
| GET | `/api/erp/db/tables/{name}` | `get_table_detail` | api/db_structure.rs:46 |
| POST | `/api/erp/dict-items` | `create_dict_item` | api/dict.rs:68 |
| POST | `/api/erp/dict-items/batch` | `batch_create_dict_items` | api/dict.rs:69 |
| GET | `/api/erp/dict-types/{id}/items` | `list_dict_items` | api/dict.rs:63 |
| GET | `/api/erp/example/companies` | `list_companies_from_hrm` | api/hrm_integration_example.rs:19 |
| GET | `/api/erp/example/employees` | `list_employees_from_hrm` | api/hrm_integration_example.rs:13 |
| GET | `/api/erp/example/employees/{id}` | `get_employee_from_hrm` | api/hrm_integration_example.rs:14 |
| GET | `/api/erp/expenses` | `list_expenses` | api/finance.rs:51 |
| POST | `/api/erp/expenses` | `create_expense` | |
| POST | `/api/erp/fixed-assets/depreciate` | `depreciate_assets` | api/fixed_asset.rs:92 |
| GET | `/api/erp/meeting-rooms` | `list_rooms` | api/meeting_room.rs:30 |
| POST | `/api/erp/meeting-rooms` | `create_room` | |
| GET | `/api/erp/payables` | `list_payables` | api/finance.rs:71 |
| POST | `/api/erp/payables` | `create_payable` | |
| GET | `/api/erp/production-orders` | `list_production_orders` | api/production_order.rs:28 |
| POST | `/api/erp/production-orders` | `create_production_order` | |
| GET | `/api/erp/reports/balance-sheet` | `balance_sheet` | api/finance_reports.rs:140 |
| GET | `/api/erp/reports/budget-summary` | `budget_summary` | api/finance_reports.rs:147 |
| GET | `/api/erp/reports/cash-flow` | `cash_flow` | api/finance_reports.rs:142 |
| GET | `/api/erp/reports/category-summary` | `category_summary` | api/finance_reports.rs:150 |
| GET | `/api/erp/reports/employee-summary` | `employee_summary` | api/finance_reports.rs:148 |
| GET | `/api/erp/reports/income-statement` | `income_statement` | api/finance_reports.rs:141 |
| GET | `/api/erp/reports/payables` | `payables_report` | api/finance_reports.rs:146 |
| GET | `/api/erp/reports/receivables` | `receivables_report` | api/finance_reports.rs:145 |
| GET | `/api/erp/reports/voucher-details` | `voucher_details` | api/finance_reports.rs:144 |
| GET | `/api/erp/reports/voucher-summary` | `voucher_summary` | api/finance_reports.rs:143 |
| GET | `/api/erp/reports/voucher-trend` | `voucher_trend` | api/finance_reports.rs:149 |
| GET | `/api/erp/vehicles` | `list_vehicles` | api/vehicles.rs:31 |
| POST | `/api/erp/vehicles` | `create_vehicle` | |
| GET | `/api/erp/vehicles/{id}/requests` | `get_vehicle_requests` | api/vehicles.rs:46 |
| GET | `/api/erp/vouchers` | `list_vouchers` | api/voucher.rs:55 |
| POST | `/api/erp/vouchers` | `create_voucher` | |
| POST | `/api/erp/vouchers/import/u8` | `import_u8_vouchers` | api/voucher.rs:64 |
| POST | `/api/erp/vouchers/{id}/approve` | `approve_voucher` | api/voucher.rs:61 |
| GET | `/api/erp/vouchers/{id}/items` | `get_voucher_items` | api/voucher.rs:60 |
| POST | `/api/erp/vouchers/{id}/post` | `post_voucher` | api/voucher.rs:62 |
| POST | `/api/erp/vouchers/{id}/unpost` | `unpost_voucher` | api/voucher.rs:63 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:230 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:229 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:145 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:146 |
| GET | `/health` | `health_check` | api/health.rs:47 |

## gis 服务

- **路由路径数**: 21
- **端点数**: 24
- **扫描文件数**: 23

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:2046 |
| GET | `/api/gis/alerts` | `list_alerts` | api/geofence.rs:313 |
| POST | `/api/gis/alerts/{id}/acknowledge` | `acknowledge_alert` | api/geofence.rs:314 |
| GET | `/api/gis/geofences` | `list_geofences` | api/geofence.rs:311 |
| POST | `/api/gis/geofences` | `create_geofence` | |
| GET | `/api/gis/geofences/{id}` | `get_geofence` | api/geofence.rs:312 |
| PUT | `/api/gis/geofences/{id}` | `update_geofence` | |
| DELETE | `/api/gis/geofences/{id}` | `delete_geofence` | |
| GET | `/api/gis/geojson/export` | `export_geojson` | main.rs:2115 |
| GET | `/api/gis/health/detailed` | `health_check_detailed` | main.rs:2045 |
| POST | `/api/gis/import` | `import_data` | main.rs:2231 |
| GET | `/api/gis/map-markers` | `list_map_markers` | main.rs:2114 |
| GET | `/api/gis/maps` | `api::map::list_maps` | main.rs:2118 |
| GET | `/api/gis/maps/{id}` | `api::map::get_map` | main.rs:2119 |
| GET | `/api/gis/pipelines` | `list_pipelines` | main.rs:2072 |
| POST | `/api/gis/pipelines` | `create_pipeline` | main.rs:2178 |
| GET | `/api/gis/pipelines/{id}` | `get_pipeline` | main.rs:2073 |
| GET | `/api/gis/search` | `search_locations` | main.rs:2116 |
| GET | `/api/gis/statistics` | `get_statistics` | main.rs:2051 |
| GET | `/api/gis/ws` | `websocket_handler` | api/websocket.rs:158 |
| GET | `/api/gis/ws/device/{device_code}` | `websocket_device_handler` | api/websocket.rs:159 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:2044 |
| GET | `/api/plugins/info` | `plugin::get_info` | main.rs:2043 |
| GET | `/health` | `health_check` | main.rs:2042 |

## hrm 服务

- **路由路径数**: 36
- **端点数**: 38
- **扫描文件数**: 37

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:107 |
| GET | `/api/hrm/audit-logs` | `list_audit_logs` | api/audit.rs:16 |
| GET | `/api/hrm/audit-logs/{id}` | `get_audit_log` | api/audit.rs:17 |
| GET | `/api/hrm/contract-renewals` | `list_renewals` | api/contract.rs:33 |
| PUT | `/api/hrm/contract-renewals/{id}/reject` | `reject_renewal` | api/contract.rs:42 |
| GET | `/api/hrm/contracts/expiring` | `list_expiring_contracts` | api/contract.rs:31 |
| POST | `/api/hrm/contracts/{id}/renew` | `create_renewal` | api/contract.rs:32 |
| POST | `/api/hrm/employees/export` | `export_employees` | api/employee.rs:26 |
| GET | `/api/hrm/employees/{id}/details` | `get_employee_details` | api/employee.rs:25 |
| POST | `/api/hrm/hrm/setup/admin` | `setup_admin_user` | api/setup.rs:108 |
| POST | `/api/hrm/hrm/setup/company` | `setup_company_info` | api/setup.rs:105 |
| POST | `/api/hrm/hrm/setup/complete` | `complete_initialization` | api/setup.rs:109 |
| POST | `/api/hrm/hrm/setup/departments` | `setup_departments` | api/setup.rs:106 |
| POST | `/api/hrm/hrm/setup/positions` | `setup_positions` | api/setup.rs:107 |
| GET | `/api/hrm/hrm/setup/progress` | `get_init_progress` | api/setup.rs:104 |
| PUT | `/api/hrm/interviews/{id}/complete` | `complete_interview` | api/recruitment.rs:187 |
| PUT | `/api/hrm/job-openings/{id}/close` | `close_job_opening` | api/recruitment.rs:166 |
| GET | `/api/hrm/leaves` | `list_leaves` | api/leave.rs:73 |
| POST | `/api/hrm/leaves` | `create_leave` | |
| PUT | `/api/hrm/leaves/{id}/approve` | `approve_leave` | api/leave.rs:78 |
| PUT | `/api/hrm/leaves/{id}/reject` | `reject_leave` | api/leave.rs:79 |
| GET | `/api/hrm/payroll-items` | `list_payroll_items` | api/payroll.rs:117 |
| GET | `/api/hrm/payroll-items/{id}` | `get_payroll_item` | api/payroll.rs:118 |
| PUT | `/api/hrm/payroll-runs/{id}/pay` | `pay_payroll_run` | api/payroll.rs:112 |
| GET | `/api/hrm/reports/contract-summary` | `contract_summary` | api/reports.rs:20 |
| GET | `/api/hrm/reports/employee-summary` | `employee_summary` | api/reports.rs:15 |
| GET | `/api/hrm/reports/payroll-summary` | `payroll_summary` | api/reports.rs:26 |
| GET | `/api/hrm/reports/training-summary` | `training_summary` | api/reports.rs:21 |
| POST | `/api/hrm/training-courses/{id}/enroll` | `enroll_course` | api/training.rs:41 |
| GET | `/api/hrm/training-plans` | `list_plans` | api/training.rs:20 |
| POST | `/api/hrm/training-plans` | `create_plan` | |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:147 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:100 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:146 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:99 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:95 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:96 |
| GET | `/health` | `health_check` | api/health.rs:47 |

## integration 服务

- **路由路径数**: 42
- **端点数**: 42
- **扫描文件数**: 10

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:234 |
| GET | `/api/integration/events` | `list_events` | main.rs:242 |
| POST | `/api/integration/events` | `create_event` | main.rs:243 |
| GET | `/api/integration/lims-qms` | `list_lims_qms_sync` | main.rs:244 |
| POST | `/api/integration/lims-qms` | `create_lims_qms_sync` | main.rs:245 |
| GET | `/api/integration/lims-qms/{id}` | `get_lims_qms_sync` | main.rs:246 |
| GET | `/api/integration/mes-erp` | `list_mes_erp_sync` | main.rs:251 |
| POST | `/api/integration/mes-erp` | `create_mes_erp_sync` | main.rs:252 |
| GET | `/api/integration/mes-erp/records` | `list_mes_erp_sync_records` | main.rs:259 |
| POST | `/api/integration/mes-erp/sync/erp-to-mes` | `sync_erp_order_to_mes` | main.rs:255 |
| POST | `/api/integration/mes-erp/sync/mes-to-erp` | `sync_mes_progress_to_erp` | main.rs:256 |
| GET | `/api/integration/mes-erp/{id}` | `get_mes_erp_sync` | main.rs:253 |
| GET | `/api/integration/mes-erp/{id}/logs` | `get_mes_erp_sync_logs` | main.rs:258 |
| POST | `/api/integration/mes-erp/{id}/retry` | `retry_mes_erp_sync` | main.rs:257 |
| POST | `/api/integration/mes-erp/{id}/sync` | `sync_mes_erp` | main.rs:254 |
| GET | `/api/integration/mes-qms` | `list_mes_qms_sync_api` | main.rs:265 |
| POST | `/api/integration/mes-qms/defect-handling` | `defect_handling_api` | main.rs:271 |
| GET | `/api/integration/mes-qms/stats` | `get_mes_qms_stats_api` | main.rs:267 |
| POST | `/api/integration/mes-qms/sync-result` | `sync_quality_result_api` | main.rs:269 |
| POST | `/api/integration/mes-qms/sync-trace` | `sync_trace_chain_api` | main.rs:270 |
| POST | `/api/integration/mes-qms/trigger-inspection` | `trigger_qms_inspection_api` | main.rs:268 |
| GET | `/api/integration/mes-qms/{id}` | `get_mes_qms_sync_api` | main.rs:266 |
| POST | `/api/integration/mes-qms/{id}/retry` | `retry_mes_qms_sync_api` | main.rs:272 |
| GET | `/api/integration/rules` | `list_conversion_rules_api` | main.rs:274 |
| POST | `/api/integration/rules` | `create_conversion_rule_api` | main.rs:275 |
| GET | `/api/integration/rules/{id}` | `get_conversion_rule_api` | main.rs:276 |
| PUT | `/api/integration/rules/{id}` | `update_conversion_rule_api` | main.rs:277 |
| DELETE | `/api/integration/rules/{id}` | `delete_conversion_rule_api` | main.rs:278 |
| POST | `/api/integration/rules/{id}/disable` | `disable_conversion_rule_api` | main.rs:282 |
| POST | `/api/integration/rules/{id}/enable` | `enable_conversion_rule_api` | main.rs:281 |
| POST | `/api/integration/rules/{id}/execute` | `execute_conversion_rule_api` | main.rs:280 |
| GET | `/api/integration/rules/{id}/executions` | `get_rule_executions_api` | main.rs:279 |
| GET | `/api/integration/stats` | `get_sync_stats` | main.rs:241 |
| GET | `/api/integration/wms-scm` | `list_wms_scm_sync` | main.rs:260 |
| POST | `/api/integration/wms-scm` | `create_wms_scm_sync` | main.rs:261 |
| GET | `/api/integration/wms-scm/{id}` | `get_wms_scm_sync` | main.rs:262 |
| POST | `/api/integration/wms-scm/{id}/sync` | `sync_wms_scm` | main.rs:263 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:237 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:55 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:236 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:54 |
| GET | `/health` | `health` | main.rs:235 |

## lims 服务

- **路由路径数**: 81
- **端点数**: 124
- **扫描文件数**: 19

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:108 |
| GET | `/api/lims/barcodes` | `list_barcodes` | api/sample_barcode.rs:10 |
| POST | `/api/lims/barcodes` | `generate_barcode` | |
| POST | `/api/lims/barcodes/scan` | `scan_barcode` | api/sample_barcode.rs:13 |
| GET | `/api/lims/barcodes/trace/{barcode}` | `trace_sample_by_barcode` | api/sample_barcode.rs:15 |
| GET | `/api/lims/barcodes/types` | `get_barcode_types` | api/sample_barcode.rs:14 |
| GET | `/api/lims/barcodes/{id}` | `get_barcode` | api/sample_barcode.rs:11 |
| PUT | `/api/lims/barcodes/{id}` | `update_barcode` | |
| DELETE | `/api/lims/barcodes/{id}` | `delete_barcode` | |
| POST | `/api/lims/barcodes/{id}/print` | `print_barcode` | api/sample_barcode.rs:12 |
| GET | `/api/lims/collection-tasks` | `list_collection_tasks` | api/instrument_data.rs:15 |
| POST | `/api/lims/collection-tasks` | `create_collection_task` | |
| GET | `/api/lims/collection-tasks/{id}` | `get_collection_task` | api/instrument_data.rs:16 |
| PUT | `/api/lims/collection-tasks/{id}` | `update_collection_task` | |
| DELETE | `/api/lims/collection-tasks/{id}` | `delete_collection_task` | |
| POST | `/api/lims/collection-tasks/{id}/trigger` | `trigger_collection` | api/instrument_data.rs:17 |
| GET | `/api/lims/instrument-data` | `list_instrument_data` | api/instrument_data.rs:10 |
| POST | `/api/lims/instrument-data` | `create_instrument_data` | |
| POST | `/api/lims/instrument-data/parse/test` | `test_parse_data` | api/instrument_data.rs:13 |
| GET | `/api/lims/instrument-data/statistics` | `get_instrument_data_statistics` | api/instrument_data.rs:14 |
| GET | `/api/lims/instrument-data/{id}` | `get_instrument_data` | api/instrument_data.rs:11 |
| PUT | `/api/lims/instrument-data/{id}` | `update_instrument_data` | |
| DELETE | `/api/lims/instrument-data/{id}` | `delete_instrument_data` | |
| POST | `/api/lims/instrument-data/{id}/parse` | `parse_instrument_data` | api/instrument_data.rs:12 |
| GET | `/api/lims/instruments` | `list_instruments` | api/instrument.rs:10 |
| POST | `/api/lims/instruments` | `create_instrument` | |
| GET | `/api/lims/instruments/{id}` | `get_instrument` | api/instrument.rs:11 |
| PUT | `/api/lims/instruments/{id}` | `update_instrument` | |
| DELETE | `/api/lims/instruments/{id}` | `delete_instrument` | |
| POST | `/api/lims/instruments/{id}/calibration` | `calibrate` | api/instrument.rs:12 |
| GET | `/api/lims/lifecycle-stages` | `get_lifecycle_stages` | api/sample.rs:16 |
| GET | `/api/lims/method-categories` | `list_categories` | api/test_method.rs:14 |
| POST | `/api/lims/method-categories` | `create_category` | |
| PUT | `/api/lims/method-categories/{id}` | `update_category` | api/test_method.rs:15 |
| DELETE | `/api/lims/method-categories/{id}` | `delete_category` | |
| GET | `/api/lims/method-validations` | `list_validations` | api/test_method.rs:16 |
| POST | `/api/lims/method-validations` | `create_validation` | |
| GET | `/api/lims/parse-rules` | `list_parse_rules` | api/instrument_data.rs:18 |
| POST | `/api/lims/parse-rules` | `create_parse_rule` | |
| GET | `/api/lims/parse-rules/{id}` | `get_parse_rule` | api/instrument_data.rs:19 |
| PUT | `/api/lims/parse-rules/{id}` | `update_parse_rule` | |
| DELETE | `/api/lims/parse-rules/{id}` | `delete_parse_rule` | |
| GET | `/api/lims/print-config` | `get_print_config` | api/sample_barcode.rs:16 |
| PUT | `/api/lims/print-config` | `update_print_config` | |
| POST | `/api/lims/pt-corrective-actions` | `create_corrective_action` | api/proficiency_testing.rs:19 |
| PUT | `/api/lims/pt-corrective-actions/{id}` | `update_corrective_action` | api/proficiency_testing.rs:20 |
| POST | `/api/lims/pt-evaluations` | `evaluate_result` | api/proficiency_testing.rs:18 |
| GET | `/api/lims/pt-plans` | `list_plans` | api/proficiency_testing.rs:10 |
| POST | `/api/lims/pt-plans` | `create_plan` | |
| GET | `/api/lims/pt-plans/{id}` | `get_plan` | api/proficiency_testing.rs:11 |
| PUT | `/api/lims/pt-plans/{id}` | `update_plan` | |
| DELETE | `/api/lims/pt-plans/{id}` | `delete_plan` | |
| GET | `/api/lims/pt-plans/{id}/corrective-actions` | `list_plan_corrective_actions` | api/proficiency_testing.rs:15 |
| GET | `/api/lims/pt-plans/{id}/evaluations` | `list_plan_evaluations` | api/proficiency_testing.rs:14 |
| GET | `/api/lims/pt-plans/{id}/results` | `list_plan_results` | api/proficiency_testing.rs:13 |
| GET | `/api/lims/pt-plans/{id}/samples` | `list_plan_samples` | api/proficiency_testing.rs:12 |
| POST | `/api/lims/pt-results` | `submit_result` | api/proficiency_testing.rs:17 |
| POST | `/api/lims/pt-samples/receive` | `receive_sample` | api/proficiency_testing.rs:16 |
| GET | `/api/lims/reagents` | `list_reagents` | api/reagent.rs:10 |
| POST | `/api/lims/reagents` | `create_reagent` | |
| GET | `/api/lims/reagents/{id}` | `get_reagent` | api/reagent.rs:11 |
| PUT | `/api/lims/reagents/{id}` | `update_reagent` | |
| DELETE | `/api/lims/reagents/{id}` | `delete_reagent` | |
| GET | `/api/lims/records` | `list_records` | api/inspection_record.rs:10 |
| POST | `/api/lims/records` | `create_record` | |
| GET | `/api/lims/records/{id}` | `get_record` | api/inspection_record.rs:11 |
| DELETE | `/api/lims/records/{id}` | `delete_record` | |
| GET | `/api/lims/rfid-tags` | `list_rfid_tags` | api/sample_barcode.rs:17 |
| POST | `/api/lims/rfid-tags` | `create_rfid_tag` | |
| DELETE | `/api/lims/rfid-tags/{id}` | `delete_rfid_tag` | api/sample_barcode.rs:18 |
| POST | `/api/lims/rfid-tags/{tag_id}/assign/{sample_id}` | `assign_rfid_tag` | api/sample_barcode.rs:19 |
| POST | `/api/lims/rfid-tags/{tag_id}/unassign` | `unassign_rfid_tag` | api/sample_barcode.rs:20 |
| GET | `/api/lims/samples` | `list_samples` | api/sample.rs:10 |
| POST | `/api/lims/samples` | `register_sample` | |
| POST | `/api/lims/samples/lifecycle` | `record_lifecycle_event` | api/sample.rs:13 |
| GET | `/api/lims/samples/{id}` | `get_sample` | api/sample.rs:11 |
| PUT | `/api/lims/samples/{id}` | `update_sample` | |
| DELETE | `/api/lims/samples/{id}` | `delete_sample` | |
| GET | `/api/lims/samples/{id}/lifecycle` | `get_sample_lifecycle` | api/sample.rs:12 |
| POST | `/api/lims/samples/{id}/stage/{to_stage}` | `transition_sample_stage` | api/sample.rs:14 |
| GET | `/api/lims/samples/{id}/traceability` | `get_sample_traceability` | api/sample.rs:15 |
| GET | `/api/lims/statistics` | `get_statistics` | api/statistics.rs:10 |
| GET | `/api/lims/sync-records` | `list_sync_records` | api/data_sync.rs:12 |
| GET | `/api/lims/sync-records/{id}` | `get_sync_record` | api/data_sync.rs:13 |
| DELETE | `/api/lims/sync-records/{id}` | `delete_sync_record` | |
| POST | `/api/lims/sync-records/{id}/retry` | `retry_sync` | api/data_sync.rs:14 |
| POST | `/api/lims/sync/reagent-to-ehs` | `sync_reagent_to_ehs` | api/data_sync.rs:16 |
| POST | `/api/lims/sync/record-to-qms` | `sync_record_to_qms` | api/data_sync.rs:15 |
| GET | `/api/lims/tasks` | `list_tasks` | api/inspection_task.rs:10 |
| POST | `/api/lims/tasks` | `create_task` | |
| GET | `/api/lims/tasks/{id}` | `get_task` | api/inspection_task.rs:11 |
| PUT | `/api/lims/tasks/{id}` | `update_task` | |
| DELETE | `/api/lims/tasks/{id}` | `delete_task` | |
| POST | `/api/lims/tasks/{id}/result` | `submit_result` | api/inspection_task.rs:12 |
| GET | `/api/lims/test-methods` | `list_methods` | api/test_method.rs:10 |
| POST | `/api/lims/test-methods` | `create_method` | |
| GET | `/api/lims/test-methods/{id}` | `get_method` | api/test_method.rs:11 |
| PUT | `/api/lims/test-methods/{id}` | `update_method` | |
| DELETE | `/api/lims/test-methods/{id}` | `delete_method` | |
| POST | `/api/lims/test-methods/{id}/new-version` | `create_new_version` | api/test_method.rs:13 |
| GET | `/api/lims/test-methods/{id}/versions` | `list_method_versions` | api/test_method.rs:12 |
| POST | `/api/lims/uncertainty-components` | `create_component` | api/uncertainty.rs:18 |
| PUT | `/api/lims/uncertainty-components/{id}` | `update_component` | api/uncertainty.rs:19 |
| DELETE | `/api/lims/uncertainty-components/{id}` | `delete_component` | |
| GET | `/api/lims/uncertainty-projects` | `list_projects` | api/uncertainty.rs:10 |
| POST | `/api/lims/uncertainty-projects` | `create_project` | |
| GET | `/api/lims/uncertainty-projects/{id}` | `get_project` | api/uncertainty.rs:11 |
| PUT | `/api/lims/uncertainty-projects/{id}` | `update_project` | |
| DELETE | `/api/lims/uncertainty-projects/{id}` | `delete_project` | |
| POST | `/api/lims/uncertainty-projects/{id}/combined` | `calculate_combined` | api/uncertainty.rs:14 |
| GET | `/api/lims/uncertainty-projects/{id}/components` | `list_components` | api/uncertainty.rs:13 |
| GET | `/api/lims/uncertainty-projects/{id}/report` | `generate_report` | api/uncertainty.rs:15 |
| GET | `/api/lims/uncertainty-projects/{id}/sources` | `list_sources` | api/uncertainty.rs:12 |
| POST | `/api/lims/uncertainty-sources` | `create_source` | api/uncertainty.rs:16 |
| PUT | `/api/lims/uncertainty-sources/{id}` | `update_source` | api/uncertainty.rs:17 |
| DELETE | `/api/lims/uncertainty-sources/{id}` | `delete_source` | |
| POST | `/api/lims/uncertainty/type-a` | `calculate_type_a` | api/uncertainty.rs:20 |
| POST | `/api/lims/uncertainty/type-b` | `calculate_type_b` | api/uncertainty.rs:21 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:111 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:92 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:110 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:91 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:119 |
| GET | `/health` | `health` | main.rs:109 |

## manufacturing 服务

- **路由路径数**: 68
- **端点数**: 75
- **扫描文件数**: 20

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:100 |
| GET | `/` | `home` | main_mes.rs:99 |
| GET | `/` | `home` | main_pdm.rs:99 |
| GET | `/api/mfg/equipment` | `list_equipment` | api/mes/equipment.rs:13 |
| POST | `/api/mfg/equipment` | `create_equipment` | |
| GET | `/api/mfg/equipment` | `api::mes::equipment::list_equipment` | main_mes.rs:128 |
| POST | `/api/mfg/equipment` | `api::mes::equipment::create_equipment` | main_mes.rs:129 |
| GET | `/api/mfg/equipment/{id}` | `api::mes::equipment::get_equipment` | main_mes.rs:130 |
| PUT | `/api/mfg/equipment/{id}` | `api::mes::equipment::update_equipment` | main_mes.rs:131 |
| GET | `/api/mfg/pdm/document` | `list_documents` | api/pdm/document.rs:13 |
| POST | `/api/mfg/pdm/document` | `create_document` | |
| GET | `/api/mfg/pdm/material` | `list_materials` | api/pdm/material.rs:13 |
| POST | `/api/mfg/pdm/material` | `create_material` | |
| GET | `/api/mfg/pdm/product` | `list_products` | api/pdm/product.rs:13 |
| POST | `/api/mfg/pdm/product` | `create_product` | |
| GET | `/api/mfg/pdm/version` | `list_versions` | api/pdm/version.rs:13 |
| POST | `/api/mfg/pdm/version` | `create_version` | |
| GET | `/api/mfg/process` | `list_processes` | api/mes/production_process.rs:13 |
| POST | `/api/mfg/process` | `create_process` | |
| GET | `/api/mfg/process` | `api::mes::production_process::list_processes` | main_mes.rs:118 |
| POST | `/api/mfg/process` | `api::mes::production_process::create_process` | main_mes.rs:119 |
| GET | `/api/mfg/process/{id}` | `api::mes::production_process::get_process` | main_mes.rs:120 |
| PUT | `/api/mfg/process/{id}` | `api::mes::production_process::update_process` | main_mes.rs:121 |
| DELETE | `/api/mfg/process/{id}` | `api::mes::production_process::delete_process` | main_mes.rs:122 |
| GET | `/api/mfg/production-order` | `api::mes::production_order::list_production_orders` | main_mes.rs:109 |
| POST | `/api/mfg/production-order` | `api::mes::production_order::create_production_order` | main_mes.rs:110 |
| GET | `/api/mfg/production-order/{id}` | `api::mes::production_order::get_production_order` | main_mes.rs:111 |
| PUT | `/api/mfg/production-order/{id}` | `api::mes::production_order::update_production_order` | main_mes.rs:112 |
| DELETE | `/api/mfg/production-order/{id}` | `api::mes::production_order::delete_production_order` | main_mes.rs:113 |
| POST | `/api/mfg/production-order/{id}/cancel` | `api::mes::production_order::cancel_production_order` | main_mes.rs:116 |
| POST | `/api/mfg/production-order/{id}/complete` | `api::mes::production_order::complete_production_order` | main_mes.rs:115 |
| POST | `/api/mfg/production-order/{id}/start` | `api::mes::production_order::start_production_order` | main_mes.rs:114 |
| GET | `/api/mfg/record` | `list_records` | api/mes/production_record.rs:13 |
| POST | `/api/mfg/record` | `create_record` | |
| GET | `/api/mfg/record` | `api::mes::production_record::list_records` | main_mes.rs:124 |
| POST | `/api/mfg/record` | `api::mes::production_record::create_record` | main_mes.rs:125 |
| GET | `/api/mfg/record/{id}` | `get_record` | api/mes/production_record.rs:14 |
| GET | `/api/mfg/record/{id}` | `api::mes::production_record::get_record` | main_mes.rs:126 |
| GET | `/api/mfg/work-station` | `api::mes::work_station::list_work_stations` | main_mes.rs:133 |
| POST | `/api/mfg/work-station` | `api::mes::work_station::create_work_station` | main_mes.rs:134 |
| GET | `/api/mfg/work-station/{id}` | `api::mes::work_station::get_work_station` | main_mes.rs:135 |
| PUT | `/api/mfg/work-station/{id}` | `api::mes::work_station::update_work_station` | main_mes.rs:136 |
| GET | `/api/pdm/configuration` | `api::pdm::configuration::list_configurations` | main_pdm.rs:120 |
| POST | `/api/pdm/configuration` | `api::pdm::configuration::create_configuration` | main_pdm.rs:121 |
| GET | `/api/pdm/configuration/{id}` | `api::pdm::configuration::get_configuration` | main_pdm.rs:122 |
| PUT | `/api/pdm/configuration/{id}` | `api::pdm::configuration::update_configuration` | main_pdm.rs:123 |
| GET | `/api/pdm/document` | `api::pdm::document::list_documents` | main_pdm.rs:125 |
| POST | `/api/pdm/document` | `api::pdm::document::create_document` | main_pdm.rs:126 |
| GET | `/api/pdm/document/{id}` | `api::pdm::document::get_document` | main_pdm.rs:127 |
| PUT | `/api/pdm/document/{id}` | `api::pdm::document::update_document` | main_pdm.rs:128 |
| GET | `/api/pdm/material` | `api::pdm::material::list_materials` | main_pdm.rs:115 |
| POST | `/api/pdm/material` | `api::pdm::material::create_material` | main_pdm.rs:116 |
| GET | `/api/pdm/material/{id}` | `api::pdm::material::get_material` | main_pdm.rs:117 |
| PUT | `/api/pdm/material/{id}` | `api::pdm::material::update_material` | main_pdm.rs:118 |
| GET | `/api/pdm/product` | `api::pdm::product::list_products` | main_pdm.rs:109 |
| POST | `/api/pdm/product` | `api::pdm::product::create_product` | main_pdm.rs:110 |
| GET | `/api/pdm/product/{id}` | `api::pdm::product::get_product` | main_pdm.rs:111 |
| PUT | `/api/pdm/product/{id}` | `api::pdm::product::update_product` | main_pdm.rs:112 |
| DELETE | `/api/pdm/product/{id}` | `api::pdm::product::delete_product` | main_pdm.rs:113 |
| GET | `/api/pdm/version` | `api::pdm::version::list_versions` | main_pdm.rs:130 |
| POST | `/api/pdm/version` | `api::pdm::version::create_version` | main_pdm.rs:131 |
| GET | `/api/pdm/version/{id}` | `api::pdm::version::get_version` | main_pdm.rs:132 |
| PUT | `/api/pdm/version/{id}` | `api::pdm::version::update_version` | main_pdm.rs:133 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:105 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main_mes.rs:103 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main_pdm.rs:103 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:192 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:104 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main_mes.rs:102 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main_pdm.rs:102 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:191 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:112 |
| GET | `/health` | `health` | main.rs:101 |
| GET | `/health` | `health` | main_mes.rs:100 |
| GET | `/health` | `health` | main_pdm.rs:100 |

## mes 服务

- **路由路径数**: 46
- **端点数**: 75
- **扫描文件数**: 16

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:99 |
| GET | `/api/mes/boms` | `list_material_boms` | api/material_bom.rs:16 |
| POST | `/api/mes/boms` | `create_material_bom` | |
| GET | `/api/mes/boms/{id}` | `get_material_bom` | api/material_bom.rs:17 |
| PUT | `/api/mes/boms/{id}` | `update_material_bom` | |
| DELETE | `/api/mes/boms/{id}` | `delete_material_bom` | |
| GET | `/api/mes/equipment` | `list_equipment` | api/equipment.rs:16 |
| POST | `/api/mes/equipment` | `create_equipment` | |
| GET | `/api/mes/equipment-oee` | `list_oee_records` | api/equipment_oee.rs:16 |
| POST | `/api/mes/equipment-oee` | `create_oee_record` | |
| GET | `/api/mes/equipment-oee/efficiency-analysis` | `get_equipment_efficiency_analysis` | api/equipment_oee.rs:19 |
| POST | `/api/mes/equipment-oee/statistics` | `get_oee_statistics` | api/equipment_oee.rs:18 |
| GET | `/api/mes/equipment-oee/{id}` | `get_oee_record` | api/equipment_oee.rs:17 |
| PUT | `/api/mes/equipment-oee/{id}` | `update_oee_record` | |
| DELETE | `/api/mes/equipment-oee/{id}` | `delete_oee_record` | |
| GET | `/api/mes/equipment/{id}` | `get_equipment` | api/equipment.rs:17 |
| PUT | `/api/mes/equipment/{id}` | `update_equipment` | |
| DELETE | `/api/mes/equipment/{id}` | `delete_equipment` | |
| POST | `/api/mes/equipment/{id}/maintenance` | `maintenance_equipment` | api/equipment.rs:18 |
| GET | `/api/mes/material-issues` | `list_material_issues` | api/material_bom.rs:18 |
| POST | `/api/mes/material-issues` | `create_material_issue` | |
| GET | `/api/mes/material-returns` | `list_material_returns` | api/material_bom.rs:19 |
| POST | `/api/mes/material-returns` | `create_material_return` | |
| GET | `/api/mes/orders` | `list_production_orders` | api/production_order.rs:16 |
| POST | `/api/mes/orders` | `create_production_order` | |
| POST | `/api/mes/orders/from-erp` | `create_from_erp` | api/production_order.rs:17 |
| GET | `/api/mes/orders/{id}` | `get_production_order` | api/production_order.rs:18 |
| PUT | `/api/mes/orders/{id}` | `update_production_order` | |
| DELETE | `/api/mes/orders/{id}` | `delete_production_order` | |
| POST | `/api/mes/orders/{id}/cancel` | `cancel_production_order` | api/production_order.rs:22 |
| POST | `/api/mes/orders/{id}/complete` | `complete_production_order` | api/production_order.rs:21 |
| POST | `/api/mes/orders/{id}/release` | `release_production_order` | api/production_order.rs:19 |
| POST | `/api/mes/orders/{id}/start` | `start_production_order` | api/production_order.rs:20 |
| GET | `/api/mes/processes` | `list_processes` | api/production_process.rs:15 |
| POST | `/api/mes/processes` | `create_process` | |
| GET | `/api/mes/processes/{id}` | `get_process` | api/production_process.rs:16 |
| PUT | `/api/mes/processes/{id}` | `update_process` | |
| DELETE | `/api/mes/processes/{id}` | `delete_process` | |
| POST | `/api/mes/processes/{id}/deactivate` | `deactivate_process` | api/production_process.rs:17 |
| GET | `/api/mes/quality-records` | `list_quality_records` | api/quality_traceability.rs:19 |
| GET | `/api/mes/records` | `list_records` | api/production_record.rs:16 |
| POST | `/api/mes/records` | `create_record` | |
| GET | `/api/mes/records/{id}` | `get_record` | api/production_record.rs:17 |
| PUT | `/api/mes/records/{id}` | `update_record` | |
| DELETE | `/api/mes/records/{id}` | `delete_record` | |
| POST | `/api/mes/records/{id}/complete` | `complete_record` | api/production_record.rs:18 |
| GET | `/api/mes/schedules` | `list_production_schedules` | api/production_scheduling.rs:16 |
| POST | `/api/mes/schedules` | `create_production_schedule` | |
| POST | `/api/mes/schedules/adjust` | `adjust_schedule` | api/production_scheduling.rs:18 |
| GET | `/api/mes/schedules/gantt` | `get_gantt_data` | api/production_scheduling.rs:19 |
| GET | `/api/mes/schedules/{id}` | `get_production_schedule` | api/production_scheduling.rs:17 |
| PUT | `/api/mes/schedules/{id}` | `update_production_schedule` | |
| DELETE | `/api/mes/schedules/{id}` | `delete_production_schedule` | |
| GET | `/api/mes/traceability/backward/{batch_no}` | `backward_traceability` | api/quality_traceability.rs:17 |
| GET | `/api/mes/traceability/chain/{id}` | `get_trace_chain` | api/quality_traceability.rs:18 |
| GET | `/api/mes/traceability/forward/{order_id}` | `forward_traceability` | api/quality_traceability.rs:16 |
| GET | `/api/mes/wips` | `list_wips` | api/wip.rs:16 |
| POST | `/api/mes/wips` | `create_wip` | |
| GET | `/api/mes/wips/statistics` | `get_wip_statistics` | api/wip.rs:20 |
| POST | `/api/mes/wips/transfer` | `transfer_wip` | api/wip.rs:18 |
| GET | `/api/mes/wips/{id}` | `get_wip` | api/wip.rs:17 |
| PUT | `/api/mes/wips/{id}` | `update_wip` | |
| DELETE | `/api/mes/wips/{id}` | `delete_wip` | |
| GET | `/api/mes/wips/{wip_id}/transfers` | `list_wip_transfers` | api/wip.rs:19 |
| GET | `/api/mes/workstations` | `list_work_stations` | api/work_station.rs:15 |
| POST | `/api/mes/workstations` | `create_work_station` | |
| GET | `/api/mes/workstations/{id}` | `get_work_station` | api/work_station.rs:16 |
| PUT | `/api/mes/workstations/{id}` | `update_work_station` | |
| DELETE | `/api/mes/workstations/{id}` | `delete_work_station` | |
| POST | `/api/mes/workstations/{id}/activate` | `activate_work_station` | api/work_station.rs:17 |
| POST | `/api/mes/workstations/{id}/deactivate` | `deactivate_work_station` | api/work_station.rs:18 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:104 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:103 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:111 |
| GET | `/health` | `health` | main.rs:100 |

## mobile 服务

- **路由路径数**: 45
- **端点数**: 50
- **扫描文件数**: 28

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/mobile/approvals/approved` | `get_approved_approvals` | main.rs:424 |
| GET | `/api/mobile/approvals/pending` | `get_pending_approvals` | main.rs:423 |
| GET | `/api/mobile/approvals/rejected` | `get_rejected_approvals` | main.rs:425 |
| GET | `/api/mobile/approvals/stats` | `get_approval_stats` | main.rs:426 |
| GET | `/api/mobile/approvals/{id}` | `get_approval_by_id` | main.rs:427 |
| POST | `/api/mobile/approvals/{id}/approve` | `approve_task` | main.rs:428 |
| POST | `/api/mobile/approvals/{id}/reject` | `reject_task` | main.rs:429 |
| POST | `/api/mobile/approvals/{id}/transfer` | `transfer_task` | main.rs:430 |
| POST | `/api/mobile/auth/login` | `login` | main.rs:277 |
| POST | `/api/mobile/auth/logout` | `logout` | main.rs:290 |
| POST | `/api/mobile/auth/refresh` | `refresh_token` | main.rs:291 |
| POST | `/api/mobile/auth/verify-code` | `verify_code` | main.rs:278 |
| GET | `/api/mobile/barcode/history` | `get_scan_history` | main.rs:413 |
| GET | `/api/mobile/barcode/history/{id}` | `get_scan_by_id` | main.rs:414 |
| DELETE | `/api/mobile/barcode/history/{id}` | `delete_scan_record` | |
| POST | `/api/mobile/barcode/scan` | `scan_barcode` | main.rs:412 |
| GET | `/api/mobile/barcode/types` | `get_supported_barcode_types` | main.rs:415 |
| GET | `/api/mobile/media/audio` | `get_audio` | main.rs:366 |
| GET | `/api/mobile/media/photos` | `get_photos` | main.rs:365 |
| GET | `/api/mobile/media/video` | `get_video` | main.rs:367 |
| POST | `/api/mobile/offline/retry-failed` | `retry_failed_sync` | main.rs:402 |
| POST | `/api/mobile/offline/sync-data` | `sync_data` | main.rs:398 |
| GET | `/api/mobile/offline/sync-history` | `get_sync_history` | main.rs:400 |
| GET | `/api/mobile/offline/sync-policy` | `get_sync_policy` | main.rs:401 |
| PUT | `/api/mobile/offline/sync-policy` | `update_sync_policy` | |
| GET | `/api/mobile/offline/sync-status` | `get_offline_sync_status` | main.rs:399 |
| GET | `/api/mobile/photos` | `get_photo_list` | main.rs:419 |
| POST | `/api/mobile/photos/batch-upload` | `batch_upload_photos` | main.rs:418 |
| POST | `/api/mobile/photos/upload` | `upload_photo` | main.rs:417 |
| GET | `/api/mobile/photos/{id}` | `get_photo_by_id` | main.rs:420 |
| DELETE | `/api/mobile/photos/{id}` | `delete_photo` | |
| GET | `/api/mobile/photos/{id}/progress` | `get_upload_progress` | main.rs:421 |
| GET | `/api/mobile/push/devices` | `get_devices` | main.rs:404 |
| POST | `/api/mobile/push/devices/register` | `register_push_device` | main.rs:405 |
| GET | `/api/mobile/push/notifications` | `get_notification_list` | main.rs:406 |
| POST | `/api/mobile/push/notifications` | `send_notification` | |
| POST | `/api/mobile/push/notifications/broadcast` | `send_broadcast` | main.rs:407 |
| GET | `/api/mobile/push/notifications/stats` | `get_notification_stats` | main.rs:408 |
| GET | `/api/mobile/push/notifications/{id}` | `get_notification_by_id` | main.rs:409 |
| GET | `/api/mobile/push/templates` | `get_templates` | main.rs:410 |
| POST | `/api/mobile/push/templates` | `create_template` | |
| POST | `/api/mobile/scan/barcode` | `scan_barcode` | main.rs:312 |
| POST | `/api/mobile/scan/image-ocr` | `image_ocr` | main.rs:314 |
| POST | `/api/mobile/scan/qrcode` | `scan_qrcode` | main.rs:313 |
| GET | `/api/mobile/stats/patrol` | `get_patrol_stats` | main.rs:287 |
| GET | `/api/mobile/stats/task` | `get_task_stats` | main.rs:288 |
| POST | `/api/mobile/user/avatar` | `upload_avatar` | main.rs:297 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:130 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:129 |
| GET | `/health` | `health_check` | main.rs:276 |

## monitor 服务

- **路由路径数**: 29
- **端点数**: 43
- **扫描文件数**: 7

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:80 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:55 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:54 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:78 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:79 |
| GET | `/api/v1/monitor/alerts` | `list_alerts` | api/alerts.rs:265 |
| POST | `/api/v1/monitor/alerts/acknowledge` | `acknowledge_alerts` | api/alerts.rs:268 |
| POST | `/api/v1/monitor/alerts/resolve` | `resolve_alerts` | api/alerts.rs:269 |
| GET | `/api/v1/monitor/alerts/statistics` | `get_alert_statistics` | api/alerts.rs:267 |
| GET | `/api/v1/monitor/alerts/{id}` | `get_alert` | api/alerts.rs:266 |
| POST | `/api/v1/monitor/alerts/{id}` | `update_alert` | |
| GET | `/api/v1/monitor/alerts/{id}/history` | `get_alert_history` | api/alerts.rs:270 |
| GET | `/api/v1/monitor/alerts/{id}/timeline` | `get_alert_timeline` | api/alerts.rs:271 |
| GET | `/api/v1/monitor/health` | `get_service_health` | api/health_check.rs:21 |
| GET | `/api/v1/monitor/metrics/database` | `get_database_metrics` | api/metrics.rs:58 |
| GET | `/api/v1/monitor/metrics/system` | `get_system_metrics` | api/metrics.rs:57 |
| GET | `/api/v1/monitor/performance/api` | `get_api_performance` | api/metrics.rs:59 |
| GET | `/api/v1/monitor/rules` | `list_rules` | api/alerts.rs:273 |
| POST | `/api/v1/monitor/rules` | `create_rule` | |
| GET | `/api/v1/monitor/rules/{id}` | `get_rule` | api/alerts.rs:274 |
| PUT | `/api/v1/monitor/rules/{id}` | `update_rule` | |
| DELETE | `/api/v1/monitor/rules/{id}` | `delete_rule` | |
| GET | `/api/v1/monitor/rules/{id}/advanced` | `get_advanced_rule` | api/alerts.rs:277 |
| PUT | `/api/v1/monitor/rules/{id}/advanced` | `update_advanced_rule` | |
| POST | `/api/v1/monitor/rules/{id}/disable` | `disable_rule` | api/alerts.rs:276 |
| POST | `/api/v1/monitor/rules/{id}/enable` | `enable_rule` | api/alerts.rs:275 |
| GET | `/api/v1/monitor/rules/{id}/escalation` | `get_escalation` | api/alerts.rs:280 |
| PUT | `/api/v1/monitor/rules/{id}/escalation` | `update_escalation` | |
| GET | `/api/v1/monitor/rules/{id}/routing` | `get_routing` | api/alerts.rs:281 |
| PUT | `/api/v1/monitor/rules/{id}/routing` | `update_routing` | |
| GET | `/api/v1/monitor/rules/{id}/scheduled-trigger` | `get_scheduled_trigger` | api/alerts.rs:279 |
| PUT | `/api/v1/monitor/rules/{id}/scheduled-trigger` | `update_scheduled_trigger` | |
| GET | `/api/v1/monitor/suppression` | `list_suppression_rules` | api/alerts.rs:284 |
| POST | `/api/v1/monitor/suppression` | `create_suppression_rule` | |
| GET | `/api/v1/monitor/suppression/{id}` | `get_suppression_rule` | api/alerts.rs:285 |
| PUT | `/api/v1/monitor/suppression/{id}` | `update_suppression_rule` | |
| DELETE | `/api/v1/monitor/suppression/{id}` | `delete_suppression_rule` | |
| GET | `/api/v1/monitor/templates` | `list_templates` | api/alerts.rs:282 |
| POST | `/api/v1/monitor/templates` | `create_template` | |
| GET | `/api/v1/monitor/templates/{id}` | `get_template` | api/alerts.rs:283 |
| PUT | `/api/v1/monitor/templates/{id}` | `update_template` | |
| DELETE | `/api/v1/monitor/templates/{id}` | `delete_template` | |
| GET | `/health` | `health_check` | main.rs:77 |

## pdm 服务

- **路由路径数**: 39
- **端点数**: 69
- **扫描文件数**: 17

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:99 |
| GET | `/api/pdm/change-notices` | `list_change_notices` | api/change_notice.rs:12 |
| POST | `/api/pdm/change-notices` | `create_change_notice` | |
| GET | `/api/pdm/change-notices/{id}` | `get_change_notice` | api/change_notice.rs:13 |
| PUT | `/api/pdm/change-notices/{id}` | `update_change_notice` | |
| DELETE | `/api/pdm/change-notices/{id}` | `delete_change_notice` | |
| POST | `/api/pdm/change-notices/{id}/approve` | `approve_change_notice` | api/change_notice.rs:15 |
| POST | `/api/pdm/change-notices/{id}/reject` | `reject_change_notice` | api/change_notice.rs:16 |
| POST | `/api/pdm/change-notices/{id}/submit` | `submit_change_notice` | api/change_notice.rs:14 |
| GET | `/api/pdm/configurations` | `list_configurations` | api/configuration.rs:9 |
| POST | `/api/pdm/configurations` | `create_configuration` | |
| GET | `/api/pdm/configurations/{id}` | `get_configuration` | api/configuration.rs:10 |
| PUT | `/api/pdm/configurations/{id}` | `update_configuration` | |
| GET | `/api/pdm/documents` | `list_documents` | api/document.rs:12 |
| POST | `/api/pdm/documents` | `create_document` | |
| GET | `/api/pdm/documents/pending-approval` | `list_pending_documents` | api/document.rs:16 |
| GET | `/api/pdm/documents/{id}` | `get_document` | api/document.rs:13 |
| PUT | `/api/pdm/documents/{id}` | `update_document` | |
| DELETE | `/api/pdm/documents/{id}` | `delete_document` | |
| GET | `/api/pdm/documents/{id}/approval-history` | `get_document_approval_history` | api/document.rs:15 |
| POST | `/api/pdm/documents/{id}/approve` | `start_document_approval` | api/document.rs:14 |
| GET | `/api/pdm/materials` | `list_materials` | api/material.rs:9 |
| POST | `/api/pdm/materials` | `create_material` | |
| GET | `/api/pdm/materials/{id}` | `get_material` | api/material.rs:10 |
| PUT | `/api/pdm/materials/{id}` | `update_material` | |
| GET | `/api/pdm/production-batches` | `list_batches` | api/production_batch.rs:9 |
| POST | `/api/pdm/production-batches` | `create_batch` | |
| GET | `/api/pdm/production-batches/{id}` | `get_batch` | api/production_batch.rs:10 |
| PUT | `/api/pdm/production-batches/{id}` | `update_batch` | |
| DELETE | `/api/pdm/production-batches/{id}` | `delete_batch` | |
| GET | `/api/pdm/production-formulas` | `list_formulas` | api/production_formula.rs:9 |
| POST | `/api/pdm/production-formulas` | `create_formula` | |
| GET | `/api/pdm/production-formulas/{id}` | `get_formula` | api/production_formula.rs:10 |
| PUT | `/api/pdm/production-formulas/{id}` | `update_formula` | |
| DELETE | `/api/pdm/production-formulas/{id}` | `delete_formula` | |
| GET | `/api/pdm/production-processes` | `list_processes` | api/production_process.rs:9 |
| POST | `/api/pdm/production-processes` | `create_process` | |
| GET | `/api/pdm/production-processes/{id}` | `get_process` | api/production_process.rs:10 |
| PUT | `/api/pdm/production-processes/{id}` | `update_process` | |
| DELETE | `/api/pdm/production-processes/{id}` | `delete_process` | |
| GET | `/api/pdm/production-statistics` | `list_statistics` | api/production_statistics.rs:9 |
| GET | `/api/pdm/production-steps` | `list_steps` | api/production_step.rs:9 |
| POST | `/api/pdm/production-steps` | `create_step` | |
| GET | `/api/pdm/production-steps/{id}` | `get_step` | api/production_step.rs:10 |
| PUT | `/api/pdm/production-steps/{id}` | `update_step` | |
| DELETE | `/api/pdm/production-steps/{id}` | `delete_step` | |
| GET | `/api/pdm/products` | `list_products` | api/product.rs:9 |
| POST | `/api/pdm/products` | `create_product` | |
| GET | `/api/pdm/products/{id}` | `get_product` | api/product.rs:10 |
| PUT | `/api/pdm/products/{id}` | `update_product` | |
| DELETE | `/api/pdm/products/{id}` | `delete_product` | |
| GET | `/api/pdm/statistics` | `get_statistics` | api/production_statistics.rs:10 |
| GET | `/api/pdm/versions` | `list_versions` | api/version.rs:9 |
| POST | `/api/pdm/versions` | `create_version` | |
| GET | `/api/pdm/versions/{id}` | `get_version` | api/version.rs:10 |
| PUT | `/api/pdm/versions/{id}` | `update_version` | |
| GET | `/api/pdm/workflow-instances` | `list_workflow_instances` | api/workflow.rs:15 |
| GET | `/api/pdm/workflow-instances/{id}` | `get_workflow_instance` | api/workflow.rs:16 |
| POST | `/api/pdm/workflow-instances/{id}/advance` | `advance_workflow` | api/workflow.rs:17 |
| GET | `/api/pdm/workflows` | `list_workflows` | api/workflow.rs:12 |
| POST | `/api/pdm/workflows` | `create_workflow` | |
| POST | `/api/pdm/workflows/start` | `start_workflow` | api/workflow.rs:14 |
| GET | `/api/pdm/workflows/{id}` | `get_workflow` | api/workflow.rs:13 |
| PUT | `/api/pdm/workflows/{id}` | `update_workflow` | |
| DELETE | `/api/pdm/workflows/{id}` | `delete_workflow` | |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:102 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:101 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:111 |
| GET | `/health` | `health` | main.rs:100 |

## pm 服务

- **路由路径数**: 25
- **端点数**: 29
- **扫描文件数**: 48

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:61 |
| GET | `/api/plugin_pm.budgets/{id}` | `get_budget` | api/budget.rs:23 |
| PUT | `/api/plugin_pm.budgets/{id}` | `update_budget` | |
| POST | `/api/plugin_pm.budgets/{id}/approve` | `approve_budget` | api/budget.rs:25 |
| POST | `/api/plugin_pm.budgets/{id}/submit` | `submit_budget` | api/budget.rs:24 |
| POST | `/api/plugin_pm.notifications/{id}/read` | `mark_as_read` | api/notification.rs:27 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:68 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:67 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:67 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:66 |
| POST | `/api/pm/contracts/{id}/approve` | `approve_contract` | api/contract.rs:31 |
| POST | `/api/pm/contracts/{id}/reject` | `reject_contract` | api/contract.rs:32 |
| POST | `/api/pm/contracts/{id}/submit` | `submit_contract` | api/contract.rs:30 |
| PUT | `/api/pm/notification-settings/{id}` | `update_setting` | api/notification.rs:32 |
| GET | `/api/pm/notification-types` | `list_notification_types` | api/notification.rs:33 |
| GET | `/api/pm/project-types` | `list_types` | api/project_type_config.rs:12 |
| POST | `/api/pm/project-types` | `create_type` | |
| GET | `/api/pm/projects` | `list_projects` | api/project.rs:81 |
| POST | `/api/pm/projects` | `create_project` | |
| GET | `/api/pm/projects/{id}/gantt` | `get_project_gantt` | api/project.rs:90 |
| GET | `/api/pm/reports/{id}` | `get_report` | api/report.rs:22 |
| GET | `/api/pm/risks/{id}` | `get_risk` | api/risk.rs:22 |
| PUT | `/api/pm/risks/{id}` | `update_risk` | |
| POST | `/api/pm/settlements/{id}/approve` | `approve_settlement` | api/settlement.rs:28 |
| GET | `/api/pm/statistics` | `get_statistics` | api/statistics.rs:41 |
| POST | `/api/v1/auth/login` | `login` | api/auth.rs:70 |
| POST | `/api/v1/auth/refresh` | `refresh` | api/auth.rs:72 |
| POST | `/api/v1/auth/register` | `register` | api/auth.rs:71 |
| GET | `/health` | `health_check` | main.rs:60 |

## qms 服务

- **路由路径数**: 133
- **端点数**: 133
- **扫描文件数**: 37

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:104 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:107 |
| GET | `/api/plugins/health` | `plugin_health_check` | modules/qms/qms_plugin.rs:62 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:92 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:106 |
| GET | `/api/plugins/info` | `get_plugin_info` | modules/qms/qms_plugin.rs:61 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:91 |
| GET | `/api/qms/actions` | `corrective_action::list_actions` | api/mod.rs:53 |
| POST | `/api/qms/actions` | `corrective_action::create_action` | api/mod.rs:54 |
| GET | `/api/qms/actions/{id}` | `corrective_action::get_action` | api/mod.rs:55 |
| PUT | `/api/qms/actions/{id}` | `corrective_action::update_action` | api/mod.rs:56 |
| DELETE | `/api/qms/actions/{id}` | `corrective_action::delete_action` | api/mod.rs:57 |
| POST | `/api/qms/actions/{id}/complete` | `corrective_action::complete_action` | api/mod.rs:58 |
| GET | `/api/qms/actions/{id}/items` | `corrective_action::get_action_items` | api/mod.rs:59 |
| GET | `/api/qms/alert-messages` | `quality_dashboard::list_alert_messages` | api/mod.rs:133 |
| POST | `/api/qms/alert-messages` | `quality_dashboard::create_alert_message` | api/mod.rs:134 |
| POST | `/api/qms/alert-messages/{id}/acknowledge` | `quality_dashboard::acknowledge_alert` | api/mod.rs:135 |
| GET | `/api/qms/alert-rules` | `quality_dashboard::list_alert_rules` | api/mod.rs:128 |
| POST | `/api/qms/alert-rules` | `quality_dashboard::create_alert_rule` | api/mod.rs:129 |
| GET | `/api/qms/alert-rules/{id}` | `quality_dashboard::get_alert_rule` | api/mod.rs:130 |
| PUT | `/api/qms/alert-rules/{id}` | `quality_dashboard::update_alert_rule` | api/mod.rs:131 |
| DELETE | `/api/qms/alert-rules/{id}` | `quality_dashboard::delete_alert_rule` | api/mod.rs:132 |
| GET | `/api/qms/apqp/approvals` | `apqp::list_apqp_approvals` | api/mod.rs:159 |
| POST | `/api/qms/apqp/approvals` | `apqp::create_apqp_approval` | api/mod.rs:160 |
| POST | `/api/qms/apqp/approvals/{id}/process` | `apqp::process_apqp_approval` | api/mod.rs:161 |
| GET | `/api/qms/apqp/phases` | `apqp::list_apqp_phases` | api/mod.rs:144 |
| POST | `/api/qms/apqp/phases` | `apqp::create_apqp_phase` | api/mod.rs:145 |
| GET | `/api/qms/apqp/phases/{id}` | `apqp::get_apqp_phase` | api/mod.rs:146 |
| PUT | `/api/qms/apqp/phases/{id}` | `apqp::update_apqp_phase` | api/mod.rs:147 |
| DELETE | `/api/qms/apqp/phases/{id}` | `apqp::delete_apqp_phase` | api/mod.rs:148 |
| GET | `/api/qms/apqp/projects` | `apqp::list_apqp_projects` | api/mod.rs:137 |
| POST | `/api/qms/apqp/projects` | `apqp::create_apqp_project` | api/mod.rs:138 |
| GET | `/api/qms/apqp/projects/{id}` | `apqp::get_apqp_project` | api/mod.rs:139 |
| PUT | `/api/qms/apqp/projects/{id}` | `apqp::update_apqp_project` | api/mod.rs:140 |
| DELETE | `/api/qms/apqp/projects/{id}` | `apqp::delete_apqp_project` | api/mod.rs:141 |
| GET | `/api/qms/apqp/projects/{id}/progress` | `apqp::get_apqp_progress` | api/mod.rs:143 |
| POST | `/api/qms/apqp/projects/{id}/transition` | `apqp::transition_project_status` | api/mod.rs:142 |
| GET | `/api/qms/apqp/risks` | `apqp::list_apqp_risks` | api/mod.rs:154 |
| POST | `/api/qms/apqp/risks` | `apqp::create_apqp_risk` | api/mod.rs:155 |
| GET | `/api/qms/apqp/risks/{id}` | `apqp::get_apqp_risk` | api/mod.rs:156 |
| PUT | `/api/qms/apqp/risks/{id}` | `apqp::update_apqp_risk` | api/mod.rs:157 |
| DELETE | `/api/qms/apqp/risks/{id}` | `apqp::delete_apqp_risk` | api/mod.rs:158 |
| GET | `/api/qms/apqp/tasks` | `apqp::list_apqp_tasks` | api/mod.rs:149 |
| POST | `/api/qms/apqp/tasks` | `apqp::create_apqp_task` | api/mod.rs:150 |
| GET | `/api/qms/apqp/tasks/{id}` | `apqp::get_apqp_task` | api/mod.rs:151 |
| PUT | `/api/qms/apqp/tasks/{id}` | `apqp::update_apqp_task` | api/mod.rs:152 |
| DELETE | `/api/qms/apqp/tasks/{id}` | `apqp::delete_apqp_task` | api/mod.rs:153 |
| GET | `/api/qms/audit-findings` | `audit::list_audit_findings` | api/mod.rs:71 |
| POST | `/api/qms/audit-findings/{id}/verify` | `audit::verify_audit_finding` | api/mod.rs:73 |
| GET | `/api/qms/audit-plans` | `audit::list_audit_plans` | api/mod.rs:61 |
| POST | `/api/qms/audit-plans` | `audit::create_audit_plan` | api/mod.rs:62 |
| GET | `/api/qms/audit-plans/{id}` | `audit::get_audit_plan` | api/mod.rs:63 |
| POST | `/api/qms/audit-plans/{id}/complete` | `audit::complete_audit_plan` | api/mod.rs:65 |
| POST | `/api/qms/audit-plans/{id}/start` | `audit::start_audit_plan` | api/mod.rs:64 |
| POST | `/api/qms/audit-plans/{plan_id}/tasks` | `audit::create_audit_task` | api/mod.rs:68 |
| GET | `/api/qms/audit-tasks` | `audit::list_audit_tasks` | api/mod.rs:67 |
| PUT | `/api/qms/audit-tasks/{id}/complete` | `audit::complete_audit_task` | api/mod.rs:69 |
| POST | `/api/qms/audit-tasks/{task_id}/findings` | `audit::create_audit_finding` | api/mod.rs:72 |
| GET | `/api/qms/checks` | `quality_inspection::list_inspections` | api/mod.rs:32 |
| POST | `/api/qms/checks` | `quality_inspection::create_inspection` | api/mod.rs:33 |
| GET | `/api/qms/checks/{id}` | `quality_inspection::get_inspection` | api/mod.rs:34 |
| PUT | `/api/qms/checks/{id}` | `quality_inspection::update_inspection` | api/mod.rs:35 |
| DELETE | `/api/qms/checks/{id}` | `quality_inspection::delete_inspection` | api/mod.rs:36 |
| POST | `/api/qms/checks/{id}/assign` | `quality_inspection::assign_inspection` | api/mod.rs:37 |
| POST | `/api/qms/checks/{id}/audit` | `quality_inspection::audit_inspection` | api/mod.rs:39 |
| GET | `/api/qms/checks/{id}/audits` | `quality_inspection::get_inspection_audits` | api/mod.rs:42 |
| GET | `/api/qms/checks/{id}/results` | `quality_inspection::get_inspection_results` | api/mod.rs:41 |
| POST | `/api/qms/checks/{id}/rework` | `quality_inspection::rework_inspection` | api/mod.rs:40 |
| POST | `/api/qms/checks/{id}/submit` | `quality_inspection::submit_result` | api/mod.rs:38 |
| GET | `/api/qms/dashboard` | `dashboard::get_dashboard_stats` | api/mod.rs:51 |
| GET | `/api/qms/eightd` | `eight_d::list_eightd_reports` | api/mod.rs:99 |
| POST | `/api/qms/eightd` | `eight_d::create_eightd_report` | api/mod.rs:100 |
| GET | `/api/qms/eightd/{id}` | `eight_d::get_eightd_report` | api/mod.rs:101 |
| PUT | `/api/qms/eightd/{id}` | `eight_d::update_eightd_report` | api/mod.rs:102 |
| DELETE | `/api/qms/eightd/{id}` | `eight_d::delete_eightd_report` | api/mod.rs:103 |
| GET | `/api/qms/eightd/{id}/audit-logs` | `eight_d::get_eightd_audit_logs` | api/mod.rs:111 |
| POST | `/api/qms/eightd/{id}/close` | `eight_d::close_eightd_report` | api/mod.rs:110 |
| POST | `/api/qms/eightd/{id}/d1-team` | `eight_d::update_d1_team` | api/mod.rs:104 |
| POST | `/api/qms/eightd/{id}/d3-containment` | `eight_d::submit_d3_containment` | api/mod.rs:105 |
| POST | `/api/qms/eightd/{id}/d4-root-cause` | `eight_d::submit_d4_root_cause` | api/mod.rs:106 |
| POST | `/api/qms/eightd/{id}/d5-permanent-action` | `eight_d::submit_d5_permanent_action` | api/mod.rs:107 |
| POST | `/api/qms/eightd/{id}/d6-verify` | `eight_d::verify_d6_effectiveness` | api/mod.rs:108 |
| POST | `/api/qms/eightd/{id}/d7-preventive` | `eight_d::submit_d7_preventive` | api/mod.rs:109 |
| GET | `/api/qms/fmea` | `fmea::list_fmea_analyses` | api/mod.rs:113 |
| POST | `/api/qms/fmea` | `fmea::create_fmea_analysis` | api/mod.rs:114 |
| GET | `/api/qms/fmea-items` | `fmea::list_fmea_items` | api/mod.rs:119 |
| POST | `/api/qms/fmea-items` | `fmea::create_fmea_item` | api/mod.rs:120 |
| GET | `/api/qms/fmea-items/{id}` | `fmea::get_fmea_item` | api/mod.rs:121 |
| PUT | `/api/qms/fmea-items/{id}` | `fmea::update_fmea_item` | api/mod.rs:122 |
| DELETE | `/api/qms/fmea-items/{id}` | `fmea::delete_fmea_item` | api/mod.rs:123 |
| GET | `/api/qms/fmea/{id}` | `fmea::get_fmea_analysis` | api/mod.rs:115 |
| PUT | `/api/qms/fmea/{id}` | `fmea::update_fmea_analysis` | api/mod.rs:116 |
| DELETE | `/api/qms/fmea/{id}` | `fmea::delete_fmea_analysis` | api/mod.rs:117 |
| GET | `/api/qms/fmea/{id}/statistics` | `fmea::get_fmea_statistics` | api/mod.rs:118 |
| GET | `/api/qms/issues` | `quality_issue::list_issues` | api/mod.rs:44 |
| POST | `/api/qms/issues` | `quality_issue::create_issue` | api/mod.rs:45 |
| GET | `/api/qms/issues/{id}` | `quality_issue::get_issue` | api/mod.rs:46 |
| PUT | `/api/qms/issues/{id}` | `quality_issue::update_issue` | api/mod.rs:47 |
| DELETE | `/api/qms/issues/{id}` | `quality_issue::delete_issue` | api/mod.rs:48 |
| POST | `/api/qms/issues/{id}/resolve` | `quality_issue::resolve_issue` | api/mod.rs:49 |
| GET | `/api/qms/quality-costs` | `quality_cost::list_quality_costs` | api/mod.rs:91 |
| POST | `/api/qms/quality-costs` | `quality_cost::create_quality_cost` | api/mod.rs:92 |
| GET | `/api/qms/quality-costs/statistics` | `quality_cost::get_cost_statistics` | api/mod.rs:96 |
| GET | `/api/qms/quality-costs/trend` | `quality_cost::get_cost_trend` | api/mod.rs:97 |
| GET | `/api/qms/quality-costs/{id}` | `quality_cost::get_quality_cost` | api/mod.rs:93 |
| PUT | `/api/qms/quality-costs/{id}` | `quality_cost::update_quality_cost` | api/mod.rs:94 |
| DELETE | `/api/qms/quality-costs/{id}` | `quality_cost::delete_quality_cost` | api/mod.rs:95 |
| GET | `/api/qms/quality-dashboard/defect-distribution` | `quality_dashboard::get_defect_distribution` | api/mod.rs:127 |
| GET | `/api/qms/quality-dashboard/overview` | `quality_dashboard::get_quality_overview` | api/mod.rs:125 |
| GET | `/api/qms/quality-dashboard/trend` | `quality_dashboard::get_quality_trend` | api/mod.rs:126 |
| POST | `/api/qms/spc/calculate` | `spc::calculate_control_limits` | api/mod.rs:89 |
| GET | `/api/qms/spc/charts` | `spc::list_spc_charts` | api/mod.rs:82 |
| POST | `/api/qms/spc/charts` | `spc::create_spc_chart` | api/mod.rs:83 |
| GET | `/api/qms/spc/charts/{id}` | `spc::get_spc_chart` | api/mod.rs:84 |
| PUT | `/api/qms/spc/charts/{id}` | `spc::update_spc_chart` | api/mod.rs:85 |
| DELETE | `/api/qms/spc/charts/{id}` | `spc::delete_spc_chart` | api/mod.rs:86 |
| GET | `/api/qms/spc/data-points` | `spc::get_spc_data_points` | api/mod.rs:87 |
| POST | `/api/qms/spc/data-points` | `spc::add_spc_data_point` | api/mod.rs:88 |
| GET | `/api/qms/standards` | `quality_standard::list_standards` | api/mod.rs:24 |
| POST | `/api/qms/standards` | `quality_standard::create_standard` | api/mod.rs:25 |
| GET | `/api/qms/standards/{id}` | `quality_standard::get_standard` | api/mod.rs:26 |
| PUT | `/api/qms/standards/{id}` | `quality_standard::update_standard` | api/mod.rs:27 |
| DELETE | `/api/qms/standards/{id}` | `quality_standard::delete_standard` | api/mod.rs:28 |
| GET | `/api/qms/standards/{id}/revisions` | `quality_standard::list_revisions` | api/mod.rs:29 |
| POST | `/api/qms/standards/{id}/revisions` | `quality_standard::create_revision` | api/mod.rs:30 |
| GET | `/api/qms/sync-records` | `data_sync::list_sync_records` | api/mod.rs:75 |
| GET | `/api/qms/sync-records/{id}` | `data_sync::get_sync_record` | api/mod.rs:76 |
| DELETE | `/api/qms/sync-records/{id}` | `data_sync::delete_sync_record` | api/mod.rs:77 |
| POST | `/api/qms/sync-records/{id}/retry` | `data_sync::retry_sync` | api/mod.rs:78 |
| POST | `/api/qms/sync/inspection-to-lims` | `data_sync::sync_inspection_to_lims` | api/mod.rs:79 |
| POST | `/api/qms/sync/issue-to-ehs` | `data_sync::sync_issue_to_ehs` | api/mod.rs:80 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:116 |
| GET | `/health` | `health` | main.rs:105 |

## quality-assurance 服务

- **路由路径数**: 58
- **端点数**: 78
- **扫描文件数**: 28

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:102 |
| GET | `/` | `home` | main_ehs.rs:106 |
| GET | `/` | `home` | main_lims.rs:106 |
| GET | `/` | `home` | main_qms.rs:106 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:105 |
| GET | `/api/plugins/health` | `services::ehs_plugin::plugin_health_check` | main_ehs.rs:109 |
| GET | `/api/plugins/health` | `services::lims_plugin::plugin_health_check` | main_lims.rs:109 |
| GET | `/api/plugins/health` | `services::qms_plugin::plugin_health_check` | main_qms.rs:109 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:92 |
| GET | `/api/plugins/health` | `plugin_health_check` | services/ehs_plugin.rs:64 |
| GET | `/api/plugins/health` | `plugin_health_check` | services/lims_plugin.rs:63 |
| GET | `/api/plugins/health` | `plugin_health_check` | services/qms_plugin.rs:60 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:104 |
| GET | `/api/plugins/info` | `services::ehs_plugin::get_plugin_info` | main_ehs.rs:108 |
| GET | `/api/plugins/info` | `services::lims_plugin::get_plugin_info` | main_lims.rs:108 |
| GET | `/api/plugins/info` | `services::qms_plugin::get_plugin_info` | main_qms.rs:108 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:91 |
| GET | `/api/plugins/info` | `get_plugin_info` | services/ehs_plugin.rs:63 |
| GET | `/api/plugins/info` | `get_plugin_info` | services/lims_plugin.rs:62 |
| GET | `/api/plugins/info` | `get_plugin_info` | services/qms_plugin.rs:59 |
| GET | `/api/qa/ehs/accident` | `list_accidents` | api/ehs_accident.rs:9 |
| POST | `/api/qa/ehs/accident` | `report_accident` | |
| GET | `/api/qa/ehs/accident/{id}` | `get_accident` | api/ehs_accident.rs:10 |
| PUT | `/api/qa/ehs/accident/{id}` | `update_accident` | |
| GET | `/api/qa/ehs/environment` | `list_records` | api/ehs_environment.rs:9 |
| POST | `/api/qa/ehs/environment` | `create_record` | |
| GET | `/api/qa/ehs/health` | `list_records` | api/ehs_health.rs:9 |
| POST | `/api/qa/ehs/health` | `create_record` | |
| GET | `/api/qa/ehs/risk` | `list_risks` | api/ehs_risk.rs:9 |
| POST | `/api/qa/ehs/risk` | `create_risk` | |
| GET | `/api/qa/ehs/risk/{id}` | `get_risk` | api/ehs_risk.rs:10 |
| PUT | `/api/qa/ehs/risk/{id}` | `update_risk` | |
| POST | `/api/qa/ehs/risk/{id}/assess` | `assess_risk` | api/ehs_risk.rs:11 |
| GET | `/api/qa/ehs/safety` | `list_inspections` | api/ehs_safety.rs:9 |
| POST | `/api/qa/ehs/safety` | `create_inspection` | |
| GET | `/api/qa/ehs/safety/{id}` | `get_inspection` | api/ehs_safety.rs:10 |
| GET | `/api/qa/ehs/training` | `list_trainings` | api/ehs_training.rs:9 |
| POST | `/api/qa/ehs/training` | `create_training` | |
| GET | `/api/qa/ehs/training/{id}` | `get_training` | api/ehs_training.rs:10 |
| GET | `/api/qa/lab/instrument` | `list_instruments` | api/lab_instrument.rs:9 |
| POST | `/api/qa/lab/instrument` | `create_instrument` | |
| GET | `/api/qa/lab/instrument/{id}` | `get_instrument` | api/lab_instrument.rs:10 |
| POST | `/api/qa/lab/instrument/{id}/calibration` | `calibrate` | api/lab_instrument.rs:11 |
| GET | `/api/qa/lab/reagent` | `list_reagents` | api/lab_reagent.rs:9 |
| POST | `/api/qa/lab/reagent` | `create_reagent` | |
| GET | `/api/qa/lab/reagent/{id}` | `get_reagent` | api/lab_reagent.rs:10 |
| GET | `/api/qa/lab/record` | `list_records` | api/lab_record.rs:9 |
| POST | `/api/qa/lab/record` | `create_record` | |
| GET | `/api/qa/lab/record/{id}` | `get_record` | api/lab_record.rs:10 |
| GET | `/api/qa/lab/sample` | `list_samples` | api/lab_sample.rs:9 |
| POST | `/api/qa/lab/sample` | `register_sample` | |
| GET | `/api/qa/lab/sample/{id}` | `get_sample` | api/lab_sample.rs:10 |
| PUT | `/api/qa/lab/sample/{id}` | `update_sample` | |
| GET | `/api/qa/lab/statistics` | `get_statistics` | api/lab_statistics.rs:9 |
| GET | `/api/qa/lab/task` | `list_tasks` | api/lab_task.rs:9 |
| POST | `/api/qa/lab/task` | `create_task` | |
| GET | `/api/qa/lab/task/{id}` | `get_task` | api/lab_task.rs:10 |
| POST | `/api/qa/lab/task/{id}/result` | `submit_result` | api/lab_task.rs:11 |
| GET | `/api/qa/quality/dashboard` | `get_dashboard_stats` | api/qms_dashboard.rs:9 |
| GET | `/api/qa/quality/inspection` | `list_inspections` | api/quality_inspection.rs:9 |
| POST | `/api/qa/quality/inspection` | `create_inspection` | |
| GET | `/api/qa/quality/inspection/{id}` | `get_inspection` | api/quality_inspection.rs:10 |
| PUT | `/api/qa/quality/inspection/{id}` | `update_inspection` | |
| POST | `/api/qa/quality/inspection/{id}/result` | `submit_result` | api/quality_inspection.rs:11 |
| GET | `/api/qa/quality/issue` | `list_issues` | api/quality_issue.rs:9 |
| POST | `/api/qa/quality/issue` | `create_issue` | |
| GET | `/api/qa/quality/issue/{id}` | `get_issue` | api/quality_issue.rs:10 |
| PUT | `/api/qa/quality/issue/{id}` | `update_issue` | |
| POST | `/api/qa/quality/issue/{id}/resolve` | `resolve_issue` | api/quality_issue.rs:11 |
| GET | `/api/qa/quality/standard` | `list_standards` | api/quality_standard.rs:9 |
| POST | `/api/qa/quality/standard` | `create_standard` | |
| GET | `/api/qa/quality/standard/{id}` | `get_standard` | api/quality_standard.rs:10 |
| PUT | `/api/qa/quality/standard/{id}` | `update_standard` | |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:114 |
| GET | `/health` | `health` | main.rs:103 |
| GET | `/health` | `health` | main_ehs.rs:107 |
| GET | `/health` | `health` | main_lims.rs:107 |
| GET | `/health` | `health` | main_qms.rs:107 |

## report 服务

- **路由路径数**: 20
- **端点数**: 32
- **扫描文件数**: 11

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:107 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:110 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:109 |
| GET | `/api/report/reports` | `list_reports` | api/report.rs:11 |
| POST | `/api/report/reports` | `create_report` | |
| POST | `/api/report/reports/from-template` | `create_report_from_template` | api/report.rs:12 |
| GET | `/api/report/reports/{id}` | `get_report` | api/report.rs:13 |
| PUT | `/api/report/reports/{id}` | `update_report` | |
| DELETE | `/api/report/reports/{id}` | `delete_report` | |
| POST | `/api/report/reports/{id}/export` | `export_report` | api/report.rs:14 |
| POST | `/api/report/reports/{id}/run` | `run_report` | api/report.rs:15 |
| GET | `/api/report/schedules` | `list_schedules` | api/schedule.rs:13 |
| POST | `/api/report/schedules` | `create_schedule` | |
| GET | `/api/report/schedules/{id}` | `get_schedule` | api/schedule.rs:14 |
| PUT | `/api/report/schedules/{id}` | `update_schedule` | |
| DELETE | `/api/report/schedules/{id}` | `delete_schedule` | |
| POST | `/api/report/schedules/{id}/execute` | `execute_schedule` | api/schedule.rs:15 |
| GET | `/api/report/schedules/{id}/history` | `get_execution_history` | api/schedule.rs:16 |
| GET | `/api/report/subscriptions` | `list_subscriptions` | api/subscription.rs:12 |
| POST | `/api/report/subscriptions` | `create_subscription` | |
| GET | `/api/report/subscriptions/user/{user_id}` | `get_user_subscriptions` | api/subscription.rs:15 |
| GET | `/api/report/subscriptions/{id}` | `get_subscription` | api/subscription.rs:13 |
| PUT | `/api/report/subscriptions/{id}` | `update_subscription` | |
| DELETE | `/api/report/subscriptions/{id}` | `delete_subscription` | |
| POST | `/api/report/subscriptions/{id}/toggle` | `toggle_subscription` | api/subscription.rs:14 |
| GET | `/api/report/templates` | `list_templates` | api/template.rs:11 |
| POST | `/api/report/templates` | `create_template` | |
| GET | `/api/report/templates/{id}` | `get_template` | api/template.rs:12 |
| PUT | `/api/report/templates/{id}` | `update_template` | |
| DELETE | `/api/report/templates/{id}` | `delete_template` | |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:119 |
| GET | `/health` | `health` | main.rs:108 |

## rs 服务

- **路由路径数**: 44
- **端点数**: 48
- **扫描文件数**: 36

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:112 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:118 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:67 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:117 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:66 |
| GET | `/api/rs/ai/analyses` | `list_analyses` | api/ai_integration.rs:64 |
| POST | `/api/rs/ai/analyses` | `create_analysis` | api/ai_integration.rs:65 |
| GET | `/api/rs/ai/analyses/{id}` | `get_analysis` | api/ai_integration.rs:66 |
| POST | `/api/rs/ai/chat` | `ai_chat` | api/ai_integration.rs:67 |
| GET | `/api/rs/audit-logs` | `list_audit_logs` | api/audit.rs:19 |
| GET | `/api/rs/audit-logs/export` | `export_audit_logs` | api/audit.rs:21 |
| GET | `/api/rs/audit-logs/{id}` | `get_audit_log` | api/audit.rs:20 |
| POST | `/api/rs/auth/login` | `login` | api/auth.rs:48 |
| POST | `/api/rs/auth/logout` | `logout` | api/auth.rs:50 |
| POST | `/api/rs/auth/refresh` | `refresh_token` | api/auth.rs:49 |
| GET | `/api/rs/batch-trace/{batch_number}` | `trace_batch` | api/experiment.rs:54 |
| GET | `/api/rs/documents` | `list_documents` | api/doc_integration.rs:59 |
| GET | `/api/rs/experiments/phase/lab` | `list_lab_experiments` | api/experiment.rs:41 |
| GET | `/api/rs/formulas` | `list_formulas` | api/formula.rs:29 |
| POST | `/api/rs/formulas` | `create_formula` | |
| POST | `/api/rs/formulas/{id}/approve` | `approve_formula` | api/formula.rs:38 |
| GET | `/api/rs/health/detailed` | `health_check_detailed` | main.rs:110 |
| POST | `/api/rs/members` | `create_member` | api/project_member.rs:17 |
| PUT | `/api/rs/members/{id}` | `update_member` | api/project_member.rs:22 |
| DELETE | `/api/rs/members/{id}` | `delete_member` | api/project_member.rs:23 |
| GET | `/api/rs/metrics` | `get_metrics` | main.rs:111 |
| POST | `/api/rs/milestones` | `create_milestone` | api/project_milestone.rs:20 |
| PUT | `/api/rs/milestones/{id}` | `update_milestone` | api/project_milestone.rs:25 |
| DELETE | `/api/rs/milestones/{id}` | `delete_milestone` | api/project_milestone.rs:26 |
| GET | `/api/rs/patents` | `list_patents` | api/patent.rs:82 |
| POST | `/api/rs/patents` | `create_patent` | |
| GET | `/api/rs/patents/project/{project_id}` | `list_patents_by_project` | api/patent.rs:87 |
| POST | `/api/rs/phases` | `create_phase` | api/project_phase.rs:20 |
| PUT | `/api/rs/phases/{id}` | `update_phase` | api/project_phase.rs:25 |
| DELETE | `/api/rs/phases/{id}` | `delete_phase` | api/project_phase.rs:26 |
| GET | `/api/rs/projects` | `list_projects` | api/project.rs:53 |
| POST | `/api/rs/projects` | `create_project` | |
| GET | `/api/rs/projects/export` | `export_projects` | api/project.rs:58 |
| POST | `/api/rs/projects/import` | `import_projects` | api/project.rs:59 |
| GET | `/api/rs/projects/{id}/gantt` | `get_project_gantt` | api/project.rs:68 |
| GET | `/api/rs/reports/projects/summary` | `get_project_summary` | api/project_report.rs:61 |
| GET | `/api/rs/reports/projects/trends` | `get_project_trends` | api/project_report.rs:62 |
| GET | `/api/rs/research-costs` | `list_costs` | api/research_cost.rs:76 |
| POST | `/api/rs/research-costs` | `create_cost` | |
| GET | `/api/rs/research-costs/project/{project_id}` | `list_costs_by_project` | api/research_cost.rs:81 |
| GET | `/api/rs/research-costs/statistics` | `get_cost_statistics` | api/research_cost.rs:82 |
| GET | `/api/rs/statistics` | `get_statistics` | api/statistics.rs:32 |
| GET | `/health` | `health_check` | main.rs:109 |

## scm 服务

- **路由路径数**: 31
- **端点数**: 37
- **扫描文件数**: 26

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:122 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:114 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:121 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:113 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:120 |
| GET | `/api/scm/audit-logs` | `list_audit_logs` | api/audit.rs:29 |
| GET | `/api/scm/comparisons` | `list_comparisons` | api/price_comparison.rs:115 |
| POST | `/api/scm/comparisons` | `create_comparison` | |
| GET | `/api/scm/dashboard/overview` | `overview` | api/supply_chain_dashboard.rs:16 |
| GET | `/api/scm/inquiries` | `list_inquiries` | api/price_comparison.rs:109 |
| POST | `/api/scm/inquiries` | `create_inquiry` | |
| GET | `/api/scm/purchase-items` | `list_items` | api/purchase_item.rs:27 |
| POST | `/api/scm/purchase-items` | `create_item` | |
| POST | `/api/scm/purchase-orders/{id}/approve` | `approve_order` | api/purchase_order.rs:27 |
| POST | `/api/scm/purchase-orders/{id}/reject` | `reject_order` | api/purchase_order.rs:28 |
| GET | `/api/scm/quotes` | `list_quotes` | api/price_comparison.rs:112 |
| POST | `/api/scm/quotes` | `create_quote` | |
| POST | `/api/scm/sync/consistency-check` | `check_consistency` | api/data_sync.rs:78 |
| POST | `/api/scm/sync/purchase-batch` | `batch_sync_purchase_to_wms` | api/data_sync.rs:77 |
| POST | `/api/scm/sync/purchase-order/{id}/to-inbound` | `create_inbound_from_purchase` | api/data_sync.rs:71 |
| POST | `/api/scm/sync/purchase-to-inbound` | `purchase_to_inbound` | api/data_sync.rs:70 |
| POST | `/api/scm/sync/retry-failed` | `retry_failed_syncs` | api/data_sync.rs:74 |
| POST | `/api/scm/sync/statistics` | `get_sync_statistics` | api/data_sync.rs:75 |
| POST | `/api/scm/sync/supplier-from-srm` | `sync_supplier_from_srm` | api/data_sync.rs:72 |
| POST | `/api/scm/sync/suppliers-from-srm` | `sync_all_suppliers_from_srm` | api/data_sync.rs:73 |
| POST | `/api/scm/sync/sync-logs` | `get_sync_logs` | api/data_sync.rs:76 |
| GET | `/api/v1/audit-logs/{id}` | `get_audit_log` | api/audit.rs:30 |
| GET | `/api/v1/comparisons/{id}` | `get_comparison` | api/price_comparison.rs:116 |
| POST | `/api/v1/comparisons/{id}/approve` | `approve_comparison` | api/price_comparison.rs:117 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:125 |
| GET | `/api/v1/inquiries/{id}` | `get_inquiry` | api/price_comparison.rs:110 |
| DELETE | `/api/v1/inquiries/{id}` | `delete_inquiry` | |
| POST | `/api/v1/inquiries/{id}/publish` | `publish_inquiry` | api/price_comparison.rs:111 |
| GET | `/api/v1/quotes/{id}` | `get_quote` | api/price_comparison.rs:113 |
| PUT | `/api/v1/quotes/{id}` | `update_quote` | |
| POST | `/api/v1/quotes/{id}/submit` | `submit_quote` | api/price_comparison.rs:114 |
| GET | `/health` | `health_check` | main.rs:118 |

## shared 服务

- **路由路径数**: 18
- **端点数**: 24
- **扫描文件数**: 19

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/shared/mappings` | `list_mappings` | modules/code_mapping.rs:160 |
| POST | `/api/shared/mappings` | `create_mapping` | modules/code_mapping.rs:161 |
| GET | `/api/shared/sequences` | `list_sequences` | modules/code_sequence.rs:115 |
| POST | `/api/shared/sequences` | `create_sequence` | modules/code_sequence.rs:116 |
| POST | `/api/shared/sequences/{code_type}/next` | `get_next_code` | modules/code_sequence.rs:117 |
| POST | `/api/shared/sync` | `sync_data` | modules/code_mapping.rs:162 |
| GET | `/api/shared/sync/logs` | `list_sync_logs` | modules/sync_log.rs:79 |
| GET | `/companies` | `get_companies` | api/handlers.rs:150 |
| POST | `/companies` | `create_company` | |
| GET | `/companies/{id}` | `get_company` | api/handlers.rs:151 |
| PUT | `/companies/{id}` | `update_company` | |
| DELETE | `/companies/{id}` | `delete_company` | |
| GET | `/departments` | `get_departments` | api/handlers.rs:152 |
| POST | `/departments` | `create_department` | |
| GET | `/departments/{id}` | `get_department` | api/handlers.rs:153 |
| GET | `/employees` | `get_employees` | api/handlers.rs:156 |
| POST | `/employees` | `create_employee` | |
| GET | `/employees/{id}` | `get_employee` | api/handlers.rs:157 |
| POST | `/id/generate` | `generate_id` | api/handlers.rs:158 |
| GET | `/id/{id}` | `get_id_info` | api/handlers.rs:159 |
| GET | `/params/{param_key}` | `get_system_param` | api/handlers.rs:160 |
| PUT | `/params/{param_key}` | `set_system_param` | |
| POST | `/positions` | `create_position` | api/handlers.rs:154 |
| GET | `/positions/{id}` | `get_position` | api/handlers.rs:155 |

## srm 服务

- **路由路径数**: 17
- **端点数**: 17
- **扫描文件数**: 28

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:118 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:124 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:67 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:123 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:66 |
| GET | `/api/srm/evaluations/statistics` | `get_evaluation_statistics` | api/supplier_evaluation.rs:56 |
| GET | `/api/srm/health/detailed` | `health_check_detailed` | main.rs:117 |
| GET | `/api/srm/statistics` | `get_statistics` | api/statistics.rs:21 |
| GET | `/api/srm/statistics/detailed` | `get_detailed_statistics` | api/statistics.rs:22 |
| GET | `/api/srm/suppliers/{id}/performance-summary` | `get_performance_summary` | api/supplier_evaluation.rs:54 |
| GET | `/api/srm/suppliers/{id}/score-trend` | `get_score_trend` | api/supplier_evaluation.rs:55 |
| POST | `/api/srm/sync/supplier-from-scm` | `sync_supplier_from_scm` | api/data_sync.rs:44 |
| POST | `/api/srm/sync/supplier-to-scm` | `sync_supplier_to_scm` | api/data_sync.rs:46 |
| POST | `/api/srm/sync/suppliers-from-scm` | `sync_all_suppliers_from_scm` | api/data_sync.rs:45 |
| POST | `/api/srm/sync/suppliers-to-scm` | `sync_all_suppliers_to_scm` | api/data_sync.rs:47 |
| POST | `/api/srm/sync/sync-logs` | `get_sync_logs` | api/data_sync.rs:48 |
| GET | `/health` | `health_check` | main.rs:116 |

## unified-core 服务

- **路由路径数**: 374
- **端点数**: 374
- **扫描文件数**: 59

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:191 |
| POST | `/accounts` | `create_account` | modules/finance/handlers.rs:567 |
| GET | `/accounts` | `list_accounts` | modules/finance/handlers.rs:568 |
| GET | `/accounts/code/{code}` | `get_account_by_code` | modules/finance/handlers.rs:570 |
| GET | `/accounts/{account_id}` | `get_account` | modules/finance/handlers.rs:569 |
| POST | `/api/core/ai/chat` | `modules::ai::chat` | main.rs:594 |
| POST | `/api/core/ai/chat` | `chat` | modules/ai/handlers.rs:18 |
| POST | `/api/core/ai/generate` | `modules::ai::generate` | main.rs:595 |
| POST | `/api/core/ai/generate` | `generate` | modules/ai/handlers.rs:20 |
| GET | `/api/core/ai/health` | `modules::ai::ai_health` | main.rs:590 |
| GET | `/api/core/ai/health` | `ai_health` | modules/ai/handlers.rs:32 |
| POST | `/api/core/ai/summarize` | `modules::ai::summarize` | main.rs:596 |
| POST | `/api/core/ai/summarize` | `summarize` | modules/ai/handlers.rs:22 |
| GET | `/api/core/ai/templates` | `modules::ai::list_templates` | main.rs:588 |
| GET | `/api/core/ai/templates` | `list_templates` | modules/ai/handlers.rs:24 |
| POST | `/api/core/ai/vectors/clear` | `modules::ai::clear_vectors` | main.rs:598 |
| POST | `/api/core/ai/vectors/clear` | `clear_vectors` | modules/ai/handlers.rs:30 |
| POST | `/api/core/ai/vectors/search` | `modules::ai::vector_search` | main.rs:597 |
| POST | `/api/core/ai/vectors/search` | `vector_search` | modules/ai/handlers.rs:28 |
| GET | `/api/core/ai/vectors/stats` | `modules::ai::vector_stats` | main.rs:589 |
| GET | `/api/core/ai/vectors/stats` | `vector_stats` | modules/ai/handlers.rs:26 |
| GET | `/api/core/billing/invoices/{tenant_id}` | `modules::billing::handlers::list_invoices` | main.rs:515 |
| GET | `/api/core/billing/plans` | `modules::billing::handlers::list_plans` | main.rs:512 |
| GET | `/api/core/billing/plans/{id}` | `modules::billing::handlers::get_plan` | main.rs:513 |
| POST | `/api/core/billing/subscriptions` | `modules::billing::handlers::create_subscription` | main.rs:520 |
| GET | `/api/core/billing/subscriptions/{tenant_id}` | `modules::billing::handlers::get_subscription` | main.rs:514 |
| POST | `/api/core/billing/subscriptions/{tenant_id}/cancel` | `modules::billing::handlers::cancel_subscription` | main.rs:521 |
| GET | `/api/core/billing/usage/{tenant_id}` | `modules::billing::handlers::get_usage_summary` | main.rs:516 |
| POST | `/api/core/billing/usage/{tenant_id}/{metric_type}` | `modules::billing::handlers::record_usage` | main.rs:522 |
| GET | `/api/core/comm/im/contact-groups` | `modules::communication::im::list_contact_groups` | main.rs:439 |
| POST | `/api/core/comm/im/contact-groups` | `modules::communication::im::create_contact_group` | main.rs:480 |
| PUT | `/api/core/comm/im/contact-groups/{id}` | `modules::communication::im::update_contact_group` | main.rs:481 |
| DELETE | `/api/core/comm/im/contact-groups/{id}` | `modules::communication::im::delete_contact_group` | main.rs:482 |
| GET | `/api/core/comm/im/contacts` | `modules::communication::im::list_contacts` | main.rs:437 |
| POST | `/api/core/comm/im/contacts` | `modules::communication::im::add_contact` | main.rs:477 |
| GET | `/api/core/comm/im/contacts/{id}` | `modules::communication::im::get_contact` | main.rs:438 |
| PUT | `/api/core/comm/im/contacts/{id}` | `modules::communication::im::update_contact` | main.rs:478 |
| DELETE | `/api/core/comm/im/contacts/{id}` | `modules::communication::im::remove_contact` | main.rs:479 |
| PUT | `/api/core/comm/im/messages/{id}` | `modules::communication::im::update_message` | main.rs:472 |
| DELETE | `/api/core/comm/im/messages/{id}` | `modules::communication::im::delete_message` | main.rs:473 |
| GET | `/api/core/comm/im/notifications/{user_id}` | `modules::communication::im::list_im_notifications` | main.rs:441 |
| GET | `/api/core/comm/im/online-status/{user_id}` | `modules::communication::im::get_online_status` | main.rs:440 |
| GET | `/api/core/comm/im/project-groups` | `modules::communication::im::list_project_groups` | main.rs:442 |
| POST | `/api/core/comm/im/project-groups` | `modules::communication::im::create_project_group` | main.rs:483 |
| GET | `/api/core/comm/im/rooms` | `modules::communication::im::list_rooms` | main.rs:431 |
| POST | `/api/core/comm/im/rooms` | `modules::communication::im::create_room` | main.rs:466 |
| GET | `/api/core/comm/im/rooms/search` | `modules::communication::im::search_rooms` | main.rs:435 |
| GET | `/api/core/comm/im/rooms/{id}` | `modules::communication::im::get_room` | main.rs:432 |
| PUT | `/api/core/comm/im/rooms/{id}` | `modules::communication::im::update_room` | main.rs:467 |
| DELETE | `/api/core/comm/im/rooms/{id}` | `modules::communication::im::delete_room` | main.rs:468 |
| GET | `/api/core/comm/im/rooms/{id}/members` | `modules::communication::im::list_members` | main.rs:434 |
| POST | `/api/core/comm/im/rooms/{id}/members` | `modules::communication::im::add_member` | main.rs:470 |
| DELETE | `/api/core/comm/im/rooms/{id}/members` | `modules::communication::im::remove_member` | main.rs:471 |
| GET | `/api/core/comm/im/rooms/{id}/messages` | `modules::communication::im::get_messages` | main.rs:433 |
| POST | `/api/core/comm/im/rooms/{id}/messages` | `modules::communication::im::send_message` | main.rs:469 |
| GET | `/api/core/comm/im/rooms/{id}/messages/search` | `modules::communication::im::search_messages` | main.rs:436 |
| POST | `/api/core/comm/im/rooms/{id}/mute` | `modules::communication::im::mute_room` | main.rs:475 |
| POST | `/api/core/comm/im/rooms/{id}/pin` | `modules::communication::im::pin_message` | main.rs:476 |
| POST | `/api/core/comm/im/rooms/{id}/read` | `modules::communication::im::mark_messages_read` | main.rs:474 |
| GET | `/api/core/comm/mail/emails` | `modules::communication::mail::list_emails` | main.rs:443 |
| POST | `/api/core/comm/mail/emails` | `modules::communication::mail::send_email` | main.rs:484 |
| GET | `/api/core/comm/mail/emails/{id}` | `modules::communication::mail::get_email` | main.rs:444 |
| DELETE | `/api/core/comm/mail/emails/{id}` | `modules::communication::mail::delete_email` | main.rs:489 |
| POST | `/api/core/comm/mail/emails/{id}/read` | `modules::communication::mail::mark_as_read` | main.rs:485 |
| GET | `/api/core/comm/mail/templates` | `modules::communication::mail::list_templates` | main.rs:445 |
| POST | `/api/core/comm/mail/templates` | `modules::communication::mail::create_template` | main.rs:486 |
| GET | `/api/core/comm/mail/templates/{id}` | `modules::communication::mail::get_template` | main.rs:446 |
| PUT | `/api/core/comm/mail/templates/{id}` | `modules::communication::mail::update_template` | main.rs:487 |
| POST | `/api/core/comm/mail/templates/{id}/send` | `modules::communication::mail::send_with_template` | main.rs:488 |
| POST | `/api/core/comm/notify/broadcast` | `modules::communication::notification::broadcast_notification` | main.rs:451 |
| GET | `/api/core/comm/notify/list` | `modules::communication::notification::list_notifications` | main.rs:422 |
| POST | `/api/core/comm/notify/read-all` | `modules::communication::notification::mark_all_as_read` | main.rs:453 |
| POST | `/api/core/comm/notify/send` | `modules::communication::notification::send_notification` | main.rs:450 |
| POST | `/api/core/comm/notify/{id}/read` | `modules::communication::notification::mark_as_read` | main.rs:452 |
| GET | `/api/core/comm/ws/connect` | `modules::communication::ws::websocket_handler` | main.rs:211 |
| GET | `/api/core/doc/documents` | `modules::doc::document::list_documents` | main.rs:275 |
| POST | `/api/core/doc/documents` | `modules::doc::document::create_document` | main.rs:285 |
| GET | `/api/core/doc/documents/{id}` | `modules::doc::document::get_document` | main.rs:276 |
| PUT | `/api/core/doc/documents/{id}` | `modules::doc::document::update_document` | main.rs:286 |
| DELETE | `/api/core/doc/documents/{id}` | `modules::doc::document::delete_document` | main.rs:298 |
| POST | `/api/core/doc/documents/{id}/archive` | `modules::doc::document::archive_document` | main.rs:288 |
| POST | `/api/core/doc/documents/{id}/publish` | `modules::doc::document::publish_document` | main.rs:287 |
| GET | `/api/core/doc/folders` | `modules::doc::folder::list_folders` | main.rs:279 |
| POST | `/api/core/doc/folders` | `modules::doc::folder::create_folder` | main.rs:292 |
| GET | `/api/core/doc/folders/{id}` | `modules::doc::folder::get_folder` | main.rs:280 |
| PUT | `/api/core/doc/folders/{id}` | `modules::doc::folder::update_folder` | main.rs:293 |
| DELETE | `/api/core/doc/folders/{id}` | `modules::doc::folder::delete_folder` | main.rs:299 |
| GET | `/api/core/doc/templates` | `modules::doc::template::list_templates` | main.rs:277 |
| POST | `/api/core/doc/templates` | `modules::doc::template::create_template` | main.rs:289 |
| GET | `/api/core/doc/templates/{id}` | `modules::doc::template::get_template` | main.rs:278 |
| PUT | `/api/core/doc/templates/{id}` | `modules::doc::template::update_template` | main.rs:290 |
| POST | `/api/core/doc/templates/{id}/generate` | `modules::doc::template::generate_from_template` | main.rs:291 |
| GET | `/api/core/file/download/{id}` | `modules::file::download::download_file` | main.rs:374 |
| GET | `/api/core/file/files` | `modules::file::manage::list_files` | main.rs:377 |
| POST | `/api/core/file/files/export` | `modules::file::manage::export_files` | main.rs:402 |
| GET | `/api/core/file/files/received` | `modules::file::manage::get_received_files` | main.rs:382 |
| GET | `/api/core/file/files/search` | `modules::file::manage::search_files` | main.rs:384 |
| GET | `/api/core/file/files/shared` | `modules::file::manage::get_shared_files` | main.rs:381 |
| GET | `/api/core/file/files/starred` | `modules::file::manage::list_starred_files` | main.rs:383 |
| GET | `/api/core/file/files/{id}` | `modules::file::manage::get_file` | main.rs:378 |
| PUT | `/api/core/file/files/{id}` | `modules::file::manage::update_file` | main.rs:395 |
| DELETE | `/api/core/file/files/{id}` | `modules::file::manage::delete_file` | main.rs:411 |
| POST | `/api/core/file/files/{id}/copy` | `modules::file::manage::copy_file` | main.rs:397 |
| POST | `/api/core/file/files/{id}/move` | `modules::file::manage::move_file` | main.rs:396 |
| POST | `/api/core/file/files/{id}/permission` | `modules::file::manage::set_file_permission` | main.rs:417 |
| GET | `/api/core/file/files/{id}/permissions` | `modules::file::manage::get_file_permissions` | main.rs:380 |
| POST | `/api/core/file/files/{id}/permissions` | `modules::file::manage::set_file_permissions` | main.rs:401 |
| POST | `/api/core/file/files/{id}/share` | `modules::file::manage::share_file` | main.rs:398 |
| GET | `/api/core/file/files/{id}/shares` | `modules::file::manage::get_file_shares` | main.rs:379 |
| POST | `/api/core/file/files/{id}/star` | `modules::file::manage::star_file` | main.rs:399 |
| POST | `/api/core/file/files/{id}/unstar` | `modules::file::manage::unstar_file` | main.rs:400 |
| GET | `/api/core/file/folders` | `modules::file::folder::list_folders` | main.rs:386 |
| POST | `/api/core/file/folders` | `modules::file::folder::create_folder` | main.rs:404 |
| GET | `/api/core/file/folders/tree` | `modules::file::folder::get_folder_tree` | main.rs:388 |
| GET | `/api/core/file/folders/{id}` | `modules::file::folder::get_folder` | main.rs:387 |
| PUT | `/api/core/file/folders/{id}` | `modules::file::folder::update_folder` | main.rs:405 |
| DELETE | `/api/core/file/folders/{id}` | `modules::file::folder::delete_folder` | main.rs:412 |
| POST | `/api/core/file/folders/{id}/move` | `modules::file::folder::move_folder` | main.rs:406 |
| GET | `/api/core/file/preview/{id}` | `modules::file::download::preview_file` | main.rs:375 |
| DELETE | `/api/core/file/shares/{id}` | `modules::file::manage::delete_share` | main.rs:403 |
| GET | `/api/core/file/stats` | `modules::file::manage::get_file_stats` | main.rs:385 |
| GET | `/api/core/file/thumbnail/{id}` | `modules::file::download::get_thumbnail` | main.rs:376 |
| POST | `/api/core/file/upload` | `modules::file::upload::upload_file` | main.rs:393 |
| POST | `/api/core/file/upload/multiple` | `modules::file::upload::upload_multiple` | main.rs:394 |
| GET | `/api/core/finance/accounts` | `modules::finance::handlers::list_accounts` | main.rs:558 |
| POST | `/api/core/finance/accounts` | `modules::finance::handlers::create_account` | main.rs:575 |
| GET | `/api/core/finance/accounts/{id}` | `modules::finance::handlers::get_account` | main.rs:559 |
| GET | `/api/core/finance/aux-accounts` | `modules::finance::handlers::list_aux_accounts` | main.rs:566 |
| POST | `/api/core/finance/aux-accounts` | `modules::finance::handlers::create_aux_account` | main.rs:580 |
| GET | `/api/core/finance/aux-balance` | `modules::finance::handlers::get_aux_balance` | main.rs:568 |
| GET | `/api/core/finance/aux-ledger` | `modules::finance::handlers::get_aux_ledger` | main.rs:567 |
| GET | `/api/core/finance/balance-sheet/{period}` | `modules::finance::handlers::get_balance_sheet` | main.rs:564 |
| GET | `/api/core/finance/cash-flow/{period}` | `modules::finance::handlers::get_cash_flow` | main.rs:569 |
| GET | `/api/core/finance/income-statement/{period}` | `modules::finance::handlers::get_income_statement` | main.rs:565 |
| GET | `/api/core/finance/ledger` | `modules::finance::handlers::get_ledger` | main.rs:562 |
| GET | `/api/core/finance/periods/{year}/{month}/close` | `modules::finance::handlers::close_period` | main.rs:571 |
| GET | `/api/core/finance/periods/{year}/{month}/open` | `modules::finance::handlers::open_period` | main.rs:570 |
| GET | `/api/core/finance/trial-balance/{period}` | `modules::finance::handlers::get_trial_balance` | main.rs:563 |
| GET | `/api/core/finance/vouchers` | `modules::finance::handlers::list_vouchers` | main.rs:560 |
| POST | `/api/core/finance/vouchers` | `modules::finance::handlers::create_voucher` | main.rs:576 |
| POST | `/api/core/finance/vouchers/batch/approve` | `modules::finance::handlers::batch_approve_vouchers` | main.rs:582 |
| POST | `/api/core/finance/vouchers/batch/post` | `modules::finance::handlers::batch_post_vouchers` | main.rs:583 |
| POST | `/api/core/finance/vouchers/batch/submit` | `modules::finance::handlers::batch_submit_vouchers` | main.rs:581 |
| GET | `/api/core/finance/vouchers/{id}` | `modules::finance::handlers::get_voucher` | main.rs:561 |
| POST | `/api/core/finance/vouchers/{id}/approve` | `modules::finance::handlers::approve_voucher` | main.rs:578 |
| POST | `/api/core/finance/vouchers/{id}/post` | `modules::finance::handlers::post_voucher` | main.rs:579 |
| POST | `/api/core/finance/vouchers/{id}/submit` | `modules::finance::handlers::submit_voucher` | main.rs:577 |
| GET | `/api/core/iam/permissions` | `modules::iam::permission::list_permissions` | main.rs:243 |
| GET | `/api/core/iam/roles` | `modules::iam::role::list_roles` | main.rs:238 |
| POST | `/api/core/iam/roles` | `modules::iam::role::create_role` | main.rs:260 |
| GET | `/api/core/iam/roles/{id}` | `modules::iam::role::get_role` | main.rs:239 |
| PUT | `/api/core/iam/roles/{id}` | `modules::iam::role::update_role` | main.rs:261 |
| DELETE | `/api/core/iam/roles/{id}` | `modules::iam::role::delete_role` | main.rs:268 |
| GET | `/api/core/iam/user-permissions/{user_id}` | `modules::iam::user_permission::get_user_permissions` | main.rs:245 |
| PUT | `/api/core/iam/user-permissions/{user_id}` | `modules::iam::user_permission::update_user_permissions` | main.rs:262 |
| GET | `/api/core/iam/users` | `modules::iam::user::list_users` | main.rs:229 |
| POST | `/api/core/iam/users` | `modules::iam::user::create_user` | main.rs:250 |
| POST | `/api/core/iam/users` | `create_user` | middleware/permission.rs:8 |
| POST | `/api/core/iam/users` | `create_user` | middleware/permission.rs:49 |
| GET | `/api/core/iam/users/me` | `modules::iam::user::get_current_user` | main.rs:231 |
| GET | `/api/core/iam/users/me/preferences` | `modules::iam::user::get_preferences` | main.rs:232 |
| PUT | `/api/core/iam/users/me/preferences` | `modules::iam::user::update_preferences` | main.rs:255 |
| GET | `/api/core/iam/users/{id}` | `modules::iam::user::get_user` | main.rs:230 |
| PUT | `/api/core/iam/users/{id}` | `modules::iam::user::update_user` | main.rs:251 |
| DELETE | `/api/core/iam/users/{id}` | `modules::iam::user::delete_user` | main.rs:267 |
| POST | `/api/core/iam/users/{id}/disable` | `modules::iam::user::disable_user` | main.rs:252 |
| POST | `/api/core/iam/users/{id}/enable` | `modules::iam::user::enable_user` | main.rs:253 |
| PUT | `/api/core/iam/users/{id}/password` | `modules::iam::user::change_password` | main.rs:254 |
| POST | `/api/core/plugin/dev/plugins` | `modules::plugin::handlers::upload_plugin` | main.rs:542 |
| PUT | `/api/core/plugin/dev/plugins/{code}` | `modules::plugin::handlers::update_plugin` | main.rs:543 |
| POST | `/api/core/plugin/dev/plugins/{code}/publish` | `modules::plugin::handlers::publish_plugin` | main.rs:544 |
| POST | `/api/core/plugin/dev/plugins/{code}/register` | `modules::plugin::handlers::register_plugin` | main.rs:547 |
| PUT | `/api/core/plugin/dev/plugins/{code}/status` | `modules::plugin::handlers::update_plugin_status` | main.rs:548 |
| POST | `/api/core/plugin/dev/plugins/{code}/unpublish` | `modules::plugin::handlers::unpublish_plugin` | main.rs:545 |
| POST | `/api/core/plugin/dev/plugins/{code}/unregister` | `modules::plugin::handlers::unregister_plugin` | main.rs:549 |
| POST | `/api/core/plugin/dev/plugins/{plugin_code}/versions` | `modules::plugin::handlers::upload_plugin_version` | main.rs:546 |
| GET | `/api/core/plugin/marketplace` | `modules::plugin::handlers::get_marketplace_summary` | main.rs:527 |
| GET | `/api/core/plugin/marketplace/categories` | `modules::plugin::handlers::list_categories` | main.rs:529 |
| GET | `/api/core/plugin/marketplace/list` | `modules::plugin::handlers::list_plugins` | main.rs:528 |
| GET | `/api/core/plugin/plugins/{code}` | `modules::plugin::handlers::get_plugin` | main.rs:530 |
| GET | `/api/core/plugin/plugins/{code}/status` | `modules::plugin::handlers::get_plugin_status` | main.rs:537 |
| GET | `/api/core/plugin/plugins/{plugin_id}/reviews` | `modules::plugin::handlers::get_plugin_reviews` | main.rs:532 |
| POST | `/api/core/plugin/plugins/{plugin_id}/reviews` | `modules::plugin::handlers::create_review` | main.rs:541 |
| GET | `/api/core/plugin/plugins/{plugin_id}/versions` | `modules::plugin::handlers::get_plugin_versions` | main.rs:531 |
| GET | `/api/core/plugin/runtime/list` | `modules::plugin::handlers::list_plugins_with_status` | main.rs:533 |
| GET | `/api/core/plugin/tenant/{tenant_id}/available` | `modules::plugin::handlers::get_available_plugins` | main.rs:535 |
| GET | `/api/core/plugin/tenant/{tenant_id}/plugins` | `modules::plugin::handlers::list_tenant_plugins` | main.rs:534 |
| POST | `/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/activate` | `modules::plugin::handlers::activate_plugin` | main.rs:552 |
| POST | `/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/deactivate` | `modules::plugin::handlers::deactivate_plugin` | main.rs:553 |
| POST | `/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install` | `modules::plugin::handlers::install_plugin` | main.rs:550 |
| POST | `/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/uninstall` | `modules::plugin::handlers::uninstall_plugin` | main.rs:551 |
| GET | `/api/core/plugins/my` | `modules::plugin::handlers::list_my_plugins` | main.rs:536 |
| GET | `/api/core/sync/pending` | `modules::sync::handlers::get_pending` | main.rs:604 |
| POST | `/api/core/sync/retry-failed` | `modules::sync::handlers::retry_failed` | main.rs:611 |
| GET | `/api/core/sync/statistics` | `modules::sync::handlers::get_statistics` | main.rs:605 |
| POST | `/api/core/sync/task` | `modules::sync::handlers::create_task` | main.rs:609 |
| GET | `/api/core/sync/task/{task_id}` | `modules::sync::handlers::get_task` | main.rs:603 |
| POST | `/api/core/sync/task/{task_id}/status` | `modules::sync::handlers::update_status` | main.rs:610 |
| POST | `/api/core/sync/trigger/scm-to-wms` | `modules::sync::handlers::trigger_scm_wms` | main.rs:612 |
| POST | `/api/core/sync/trigger/srm-to-scm` | `modules::sync::handlers::trigger_srm_scm` | main.rs:614 |
| POST | `/api/core/sync/trigger/wms-to-crm` | `modules::sync::handlers::trigger_wms_crm` | main.rs:613 |
| GET | `/api/core/tenant/by-code/{code}` | `modules::tenant::handlers::get_tenant_by_code` | main.rs:498 |
| GET | `/api/core/tenant/tenants` | `modules::tenant::handlers::list_tenants` | main.rs:494 |
| POST | `/api/core/tenant/tenants` | `modules::tenant::handlers::create_tenant` | main.rs:502 |
| GET | `/api/core/tenant/tenants/{id}` | `modules::tenant::handlers::get_tenant` | main.rs:495 |
| PUT | `/api/core/tenant/tenants/{id}` | `modules::tenant::handlers::update_tenant` | main.rs:503 |
| POST | `/api/core/tenant/tenants/{id}/activate` | `modules::tenant::handlers::activate_tenant` | main.rs:504 |
| GET | `/api/core/tenant/tenants/{id}/modules` | `modules::tenant::handlers::list_tenant_modules` | main.rs:497 |
| GET | `/api/core/tenant/tenants/{id}/quota` | `modules::tenant::handlers::get_tenant_quota` | main.rs:496 |
| POST | `/api/core/tenant/tenants/{id}/suspend` | `modules::tenant::handlers::suspend_tenant` | main.rs:505 |
| POST | `/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/activate` | `modules::tenant::handlers::activate_module` | main.rs:506 |
| POST | `/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/deactivate` | `modules::tenant::handlers::deactivate_module` | main.rs:507 |
| GET | `/api/flow/approval-tasks` | `modules::flow::approval::list_approval_tasks` | main.rs:315 |
| GET | `/api/flow/approval-tasks` | `super::approval::list_approval_tasks` | modules/flow/plugin.rs:94 |
| GET | `/api/flow/approval-tasks/{id}` | `modules::flow::approval::get_approval_task` | main.rs:316 |
| GET | `/api/flow/approval-tasks/{id}` | `super::approval::get_approval_task` | modules/flow/plugin.rs:95 |
| POST | `/api/flow/approval-tasks/{id}/approve` | `modules::flow::approval::approve_task` | main.rs:356 |
| POST | `/api/flow/approval-tasks/{id}/approve` | `super::approval::approve_task` | modules/flow/plugin.rs:96 |
| POST | `/api/flow/approval-tasks/{id}/claim` | `modules::flow::approval::claim_task` | main.rs:358 |
| POST | `/api/flow/approval-tasks/{id}/delegate` | `modules::flow::approval::delegate_task` | main.rs:360 |
| POST | `/api/flow/approval-tasks/{id}/reassign` | `modules::flow::approval::reassign_task` | main.rs:361 |
| POST | `/api/flow/approval-tasks/{id}/reject` | `modules::flow::approval::reject_task` | main.rs:357 |
| POST | `/api/flow/approval-tasks/{id}/reject` | `super::approval::reject_task` | modules/flow/plugin.rs:97 |
| POST | `/api/flow/approval-tasks/{id}/unclaim` | `modules::flow::approval::unclaim_task` | main.rs:359 |
| GET | `/api/flow/approvals` | `modules::flow::approval::list_approvals` | main.rs:313 |
| POST | `/api/flow/approvals` | `modules::flow::approval::create_approval` | main.rs:354 |
| GET | `/api/flow/approvals/pending` | `modules::flow::approval::list_pending_approvals` | main.rs:312 |
| GET | `/api/flow/approvals/pending` | `super::approval::list_pending_approvals` | modules/flow/plugin.rs:93 |
| GET | `/api/flow/approvals/{id}` | `modules::flow::approval::get_approval` | main.rs:314 |
| POST | `/api/flow/approvals/{id}/approve` | `modules::flow::approval::approve_task` | main.rs:352 |
| POST | `/api/flow/approvals/{id}/approve` | `super::approval::approve_task` | modules/flow/plugin.rs:98 |
| POST | `/api/flow/approvals/{id}/process` | `modules::flow::approval::process_approval` | main.rs:355 |
| POST | `/api/flow/approvals/{id}/reject` | `modules::flow::approval::reject_task` | main.rs:353 |
| POST | `/api/flow/approvals/{id}/reject` | `super::approval::reject_task` | modules/flow/plugin.rs:99 |
| GET | `/api/flow/history` | `modules::flow::history::list_history` | main.rs:320 |
| GET | `/api/flow/history/instance/{instance_id}` | `modules::flow::history::get_instance_history` | main.rs:322 |
| GET | `/api/flow/history/workflow/{workflow_id}` | `modules::flow::history::get_workflow_history` | main.rs:323 |
| GET | `/api/flow/history/{id}` | `modules::flow::history::get_history` | main.rs:321 |
| GET | `/api/flow/instances` | `modules::flow::instance::list_instances` | main.rs:309 |
| POST | `/api/flow/instances` | `modules::flow::instance::create_instance` | main.rs:345 |
| GET | `/api/flow/instances` | `super::instance::list_instances` | modules/flow/plugin.rs:86 |
| POST | `/api/flow/instances` | `super::instance::create_instance` | modules/flow/plugin.rs:87 |
| GET | `/api/flow/instances/{id}` | `modules::flow::instance::get_instance` | main.rs:310 |
| GET | `/api/flow/instances/{id}` | `super::instance::get_instance` | modules/flow/plugin.rs:88 |
| POST | `/api/flow/instances/{id}/approve` | `modules::flow::instance::approve_instance` | main.rs:347 |
| POST | `/api/flow/instances/{id}/approve` | `super::instance::approve_instance` | modules/flow/plugin.rs:90 |
| POST | `/api/flow/instances/{id}/cancel` | `modules::flow::instance::cancel_instance` | main.rs:349 |
| POST | `/api/flow/instances/{id}/cancel` | `super::instance::cancel_instance` | modules/flow/plugin.rs:92 |
| GET | `/api/flow/instances/{id}/details` | `modules::flow::instance::get_instance_details` | main.rs:311 |
| POST | `/api/flow/instances/{id}/reject` | `modules::flow::instance::reject_instance` | main.rs:348 |
| POST | `/api/flow/instances/{id}/reject` | `super::instance::reject_instance` | modules/flow/plugin.rs:91 |
| POST | `/api/flow/instances/{id}/resume` | `modules::flow::instance::resume_instance` | main.rs:350 |
| POST | `/api/flow/instances/{id}/start` | `modules::flow::instance::start_instance` | main.rs:346 |
| POST | `/api/flow/instances/{id}/start` | `super::instance::start_instance` | modules/flow/plugin.rs:89 |
| POST | `/api/flow/instances/{id}/suspend` | `modules::flow::instance::suspend_instance` | main.rs:351 |
| GET | `/api/flow/performance` | `modules::flow::performance::get_performance` | main.rs:330 |
| POST | `/api/flow/performance/reset` | `modules::flow::performance::reset_performance` | main.rs:369 |
| GET | `/api/flow/records` | `modules::flow::record::list_records` | main.rs:324 |
| GET | `/api/flow/records/{approval_id}` | `modules::flow::record::get_record` | main.rs:325 |
| GET | `/api/flow/settings` | `modules::flow::setting::list_settings` | main.rs:326 |
| POST | `/api/flow/settings/batch` | `modules::flow::setting::batch_update_settings` | main.rs:368 |
| GET | `/api/flow/settings/key/{key}` | `modules::flow::setting::get_setting_by_key` | main.rs:328 |
| GET | `/api/flow/settings/{id}` | `modules::flow::setting::get_setting` | main.rs:327 |
| PUT | `/api/flow/settings/{id}` | `modules::flow::setting::update_setting` | main.rs:366 |
| POST | `/api/flow/settings/{id}/reset` | `modules::flow::setting::reset_setting` | main.rs:367 |
| GET | `/api/flow/statistics` | `modules::flow::statistics::get_statistics` | main.rs:329 |
| GET | `/api/flow/statistics` | `super::statistics::get_statistics` | modules/flow/plugin.rs:100 |
| GET | `/api/flow/templates` | `modules::flow::template::list_templates` | main.rs:317 |
| POST | `/api/flow/templates` | `modules::flow::template::create_template` | main.rs:362 |
| POST | `/api/flow/templates/import` | `modules::flow::template::import_template` | main.rs:365 |
| GET | `/api/flow/templates/{id}` | `modules::flow::template::get_template` | main.rs:318 |
| PUT | `/api/flow/templates/{id}` | `modules::flow::template::update_template` | main.rs:363 |
| POST | `/api/flow/templates/{id}/copy` | `modules::flow::template::copy_template` | main.rs:364 |
| GET | `/api/flow/templates/{id}/export` | `modules::flow::template::export_template` | main.rs:319 |
| GET | `/api/flow/workflows` | `modules::flow::workflow::list_workflows` | main.rs:304 |
| POST | `/api/flow/workflows` | `modules::flow::workflow::create_workflow` | main.rs:335 |
| GET | `/api/flow/workflows` | `super::workflow::list_workflows` | modules/flow/plugin.rs:79 |
| POST | `/api/flow/workflows` | `super::workflow::create_workflow` | modules/flow/plugin.rs:80 |
| GET | `/api/flow/workflows/{id}` | `modules::flow::workflow::get_workflow` | main.rs:305 |
| PUT | `/api/flow/workflows/{id}` | `modules::flow::workflow::update_workflow` | main.rs:336 |
| GET | `/api/flow/workflows/{id}` | `super::workflow::get_workflow` | modules/flow/plugin.rs:81 |
| PUT | `/api/flow/workflows/{id}` | `super::workflow::update_workflow` | modules/flow/plugin.rs:82 |
| DELETE | `/api/flow/workflows/{id}` | `super::workflow::delete_workflow` | modules/flow/plugin.rs:83 |
| POST | `/api/flow/workflows/{id}/activate` | `modules::flow::workflow::activate_workflow` | main.rs:339 |
| POST | `/api/flow/workflows/{id}/deactivate` | `modules::flow::workflow::deactivate_workflow` | main.rs:340 |
| POST | `/api/flow/workflows/{id}/deploy` | `modules::flow::workflow::deploy_workflow` | main.rs:341 |
| POST | `/api/flow/workflows/{id}/publish` | `modules::flow::workflow::publish_workflow` | main.rs:337 |
| POST | `/api/flow/workflows/{id}/publish` | `super::workflow::publish_workflow` | modules/flow/plugin.rs:84 |
| POST | `/api/flow/workflows/{id}/unpublish` | `modules::flow::workflow::unpublish_workflow` | main.rs:338 |
| POST | `/api/flow/workflows/{id}/unpublish` | `super::workflow::unpublish_workflow` | modules/flow/plugin.rs:85 |
| GET | `/api/flow/workflows/{workflow_id}/compare/{version1}/{version2}` | `modules::flow::version::compare_versions` | main.rs:308 |
| POST | `/api/flow/workflows/{workflow_id}/rollback` | `modules::flow::workflow::rollback_workflow` | main.rs:342 |
| GET | `/api/flow/workflows/{workflow_id}/versions` | `modules::flow::version::list_versions` | main.rs:306 |
| POST | `/api/flow/workflows/{workflow_id}/versions` | `modules::flow::version::create_version` | main.rs:343 |
| GET | `/api/flow/workflows/{workflow_id}/versions/{version_id}` | `modules::flow::version::get_version` | main.rs:307 |
| POST | `/api/flow/workflows/{workflow_id}/versions/{version_id}/activate` | `modules::flow::version::activate_version` | main.rs:344 |
| POST | `/api/iam/auth/forgot-password` | `modules::iam::auth::forgot_password` | main.rs:208 |
| POST | `/api/iam/auth/login` | `modules::iam::auth::login` | main.rs:205 |
| POST | `/api/iam/auth/logout` | `modules::iam::auth::logout` | main.rs:221 |
| POST | `/api/iam/auth/refresh` | `modules::iam::auth::refresh_token` | main.rs:207 |
| POST | `/api/iam/auth/register` | `modules::iam::auth::register` | main.rs:206 |
| POST | `/api/iam/auth/reset-password` | `modules::iam::auth::reset_password` | main.rs:209 |
| GET | `/api/iam/permissions` | `modules::iam::permission::list_permissions` | main.rs:244 |
| GET | `/api/iam/roles` | `modules::iam::role::list_roles` | main.rs:241 |
| GET | `/api/iam/roles/{id}` | `modules::iam::role::get_role` | main.rs:242 |
| GET | `/api/iam/users` | `modules::iam::user::list_users` | main.rs:234 |
| POST | `/api/iam/users` | `modules::iam::user::create_user` | main.rs:257 |
| POST | `/api/iam/users` | `create_user` | middleware/permission.rs:201 |
| GET | `/api/iam/users/me` | `modules::iam::user::get_current_user` | main.rs:236 |
| GET | `/api/iam/users/me/preferences` | `modules::iam::user::get_preferences` | main.rs:237 |
| PUT | `/api/iam/users/me/preferences` | `modules::iam::user::update_preferences` | main.rs:259 |
| GET | `/api/iam/users/{id}` | `modules::iam::user::get_user` | main.rs:235 |
| PUT | `/api/iam/users/{id}` | `modules::iam::user::update_user` | main.rs:258 |
| DELETE | `/api/iam/users/{id}` | `modules::iam::user::delete_user` | main.rs:270 |
| GET | `/api/plugins/health` | `plugin_health_check` | main.rs:196 |
| GET | `/api/plugins/info` | `modules::plugin::handlers::list_plugins_with_status` | main.rs:195 |
| GET | `/api/plugins/{plugin_code}/{*path}` | `plugin_proxy` | main.rs:214 |
| POST | `/api/v1/auth/forgot-password` | `modules::iam::auth::forgot_password` | main.rs:202 |
| POST | `/api/v1/auth/login` | `modules::iam::auth::login` | main.rs:199 |
| POST | `/api/v1/auth/logout` | `modules::iam::auth::logout` | main.rs:220 |
| POST | `/api/v1/auth/refresh` | `modules::iam::auth::refresh_token` | main.rs:201 |
| POST | `/api/v1/auth/register` | `modules::iam::auth::register` | main.rs:200 |
| POST | `/api/v1/auth/reset-password` | `modules::iam::auth::reset_password` | main.rs:203 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:619 |
| GET | `/api/v1/notification-templates` | `modules::communication::notification::list_templates` | main.rs:429 |
| POST | `/api/v1/notification-templates` | `modules::communication::notification::create_template` | main.rs:463 |
| GET | `/api/v1/notification-templates/{id}` | `modules::communication::notification::get_template` | main.rs:430 |
| PUT | `/api/v1/notification-templates/{id}` | `modules::communication::notification::update_template` | main.rs:464 |
| DELETE | `/api/v1/notification-templates/{id}` | `modules::communication::notification::delete_template` | main.rs:465 |
| GET | `/api/v1/notifications` | `modules::communication::notification::get_notifications` | main.rs:423 |
| DELETE | `/api/v1/notifications` | `modules::communication::notification::delete_all_notifications` | main.rs:462 |
| GET | `/api/v1/notifications/archived` | `modules::communication::notification::list_archived_notifications` | main.rs:428 |
| DELETE | `/api/v1/notifications/bulk-delete` | `modules::communication::notification::bulk_delete` | main.rs:458 |
| POST | `/api/v1/notifications/bulk-read` | `modules::communication::notification::bulk_mark_read` | main.rs:457 |
| PUT | `/api/v1/notifications/read-all` | `modules::communication::notification::mark_all_as_read` | main.rs:455 |
| GET | `/api/v1/notifications/stats/me` | `modules::communication::notification::get_notification_stats` | main.rs:427 |
| GET | `/api/v1/notifications/unread` | `modules::communication::notification::get_unread_notifications` | main.rs:425 |
| GET | `/api/v1/notifications/unread-count` | `modules::communication::notification::get_unread_count` | main.rs:424 |
| GET | `/api/v1/notifications/{id}` | `modules::communication::notification::get_notification` | main.rs:426 |
| PUT | `/api/v1/notifications/{id}` | `modules::communication::notification::mark_as_read` | main.rs:454 |
| DELETE | `/api/v1/notifications/{id}` | `modules::communication::notification::delete_notification` | main.rs:461 |
| POST | `/api/v1/notifications/{id}/archive` | `modules::communication::notification::archive_notification` | main.rs:459 |
| POST | `/api/v1/notifications/{id}/unarchive` | `modules::communication::notification::unarchive_notification` | main.rs:460 |
| PUT | `/api/v1/notifications/{id}/unread` | `modules::communication::notification::mark_as_unread` | main.rs:456 |
| POST | `/approvals/approve` | `approve_document` | modules/finance/handlers.rs:600 |
| POST | `/approvals/cancel` | `cancel_approval` | modules/finance/handlers.rs:602 |
| GET | `/approvals/pending` | `list_pending_approvals` | modules/finance/handlers.rs:604 |
| POST | `/approvals/reject` | `reject_document` | modules/finance/handlers.rs:601 |
| GET | `/approvals/status` | `get_approval_status_handler` | modules/finance/handlers.rs:603 |
| POST | `/approvals/submit` | `submit_for_approval` | modules/finance/handlers.rs:599 |
| POST | `/aux-accounts` | `create_aux_account` | modules/finance/handlers.rs:584 |
| GET | `/aux-accounts` | `list_aux_accounts` | modules/finance/handlers.rs:585 |
| GET | `/aux-balance` | `get_aux_balance` | modules/finance/handlers.rs:587 |
| GET | `/aux-ledger` | `get_aux_ledger` | modules/finance/handlers.rs:586 |
| GET | `/balance-sheet/{period}` | `get_balance_sheet` | modules/finance/handlers.rs:579 |
| GET | `/cash-flow/{period}` | `get_cash_flow` | modules/finance/handlers.rs:589 |
| GET | `/health` | `health` | main.rs:192 |
| GET | `/income-statement/{period}` | `get_income_statement` | modules/finance/handlers.rs:580 |
| GET | `/ledger` | `get_ledger` | modules/finance/handlers.rs:577 |
| POST | `/periods/{year}/{month}/close` | `close_period` | modules/finance/handlers.rs:582 |
| POST | `/periods/{year}/{month}/open` | `open_period` | modules/finance/handlers.rs:581 |
| GET | `/trial-balance/{period}` | `get_trial_balance` | modules/finance/handlers.rs:578 |
| POST | `/vouchers` | `create_voucher` | modules/finance/handlers.rs:571 |
| GET | `/vouchers` | `list_vouchers` | modules/finance/handlers.rs:572 |
| POST | `/vouchers/batch/approve` | `batch_approve_vouchers` | modules/finance/handlers.rs:592 |
| POST | `/vouchers/batch/post` | `batch_post_vouchers` | modules/finance/handlers.rs:593 |
| POST | `/vouchers/batch/submit` | `batch_submit_vouchers` | modules/finance/handlers.rs:591 |
| POST | `/vouchers/export` | `export_vouchers` | modules/finance/handlers.rs:595 |
| GET | `/vouchers/{voucher_id}` | `get_voucher` | modules/finance/handlers.rs:573 |
| POST | `/vouchers/{voucher_id}/approve` | `approve_voucher` | modules/finance/handlers.rs:575 |
| POST | `/vouchers/{voucher_id}/post` | `post_voucher` | modules/finance/handlers.rs:576 |
| POST | `/vouchers/{voucher_id}/submit` | `submit_voucher` | modules/finance/handlers.rs:574 |
| GET | `/ws/notifications` | `modules::communication::ws::websocket_handler` | main.rs:212 |
| POST | `/year-end-close` | `year_end_close` | modules/finance/handlers.rs:597 |

## wms 服务

- **路由路径数**: 57
- **端点数**: 78
- **扫描文件数**: 30

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:84 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:155 |
| GET | `/api/plugins/health` | `plugin_health_check` | main.rs:83 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:154 |
| GET | `/api/plugins/info` | `get_plugin_info` | main.rs:82 |
| GET | `/api/v1/alerts/{id}` | `get_alert` | api/inventory_alert.rs:88 |
| POST | `/api/v1/alerts/{id}/acknowledge` | `acknowledge_alert` | api/inventory_alert.rs:89 |
| GET | `/api/v1/audit-logs/{id}` | `get_audit_log` | api/audit.rs:53 |
| GET | `/api/v1/cycle-counts/{id}` | `get_cycle_count_config` | api/cycle_count.rs:35 |
| PUT | `/api/v1/cycle-counts/{id}` | `update_cycle_count_config` | |
| DELETE | `/api/v1/cycle-counts/{id}` | `delete_cycle_count_config` | |
| POST | `/api/v1/cycle-counts/{id}/generate` | `generate_cycle_count` | api/cycle_count.rs:36 |
| GET | `/api/v1/discrepancies/{id}` | `get_discrepancy` | api/discrepancy.rs:35 |
| POST | `/api/v1/discrepancies/{id}/adjust` | `adjust_inventory` | api/discrepancy.rs:37 |
| POST | `/api/v1/discrepancies/{id}/approve` | `approve_discrepancy` | api/discrepancy.rs:36 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:80 |
| POST | `/api/v1/inbound-orders/{id}/complete` | `complete_inbound_order` | api/inbound_order.rs:87 |
| POST | `/api/v1/inbound-orders/{id}/confirm` | `confirm_inbound_order` | api/inbound_order.rs:85 |
| GET | `/api/v1/inbound-orders/{id}/items` | `list_inbound_order_items` | api/inbound_order.rs:83 |
| POST | `/api/v1/inbound-orders/{id}/items` | `create_inbound_order_item` | |
| PUT | `/api/v1/inbound-orders/{id}/items/{item_id}` | `update_inbound_order_item` | api/inbound_order.rs:84 |
| DELETE | `/api/v1/inbound-orders/{id}/items/{item_id}` | `delete_inbound_order_item` | |
| POST | `/api/v1/inbound-orders/{id}/receive` | `receive_inbound_order` | api/inbound_order.rs:86 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:81 |
| POST | `/api/v1/outbound-orders/{id}/complete` | `complete_outbound_order` | api/outbound_order.rs:65 |
| POST | `/api/v1/outbound-orders/{id}/confirm` | `confirm_outbound_order` | api/outbound_order.rs:61 |
| GET | `/api/v1/outbound-orders/{id}/items` | `list_outbound_order_items` | api/outbound_order.rs:59 |
| POST | `/api/v1/outbound-orders/{id}/items` | `create_outbound_order_item` | |
| PUT | `/api/v1/outbound-orders/{id}/items/{item_id}` | `update_outbound_order_item` | api/outbound_order.rs:60 |
| DELETE | `/api/v1/outbound-orders/{id}/items/{item_id}` | `delete_outbound_order_item` | |
| POST | `/api/v1/outbound-orders/{id}/pack` | `pack_outbound_order` | api/outbound_order.rs:63 |
| POST | `/api/v1/outbound-orders/{id}/pick` | `pick_outbound_order` | api/outbound_order.rs:62 |
| POST | `/api/v1/outbound-orders/{id}/ship` | `ship_outbound_order` | api/outbound_order.rs:64 |
| GET | `/api/v1/stock-takes/{id}` | `get_stock_take` | api/stock_take.rs:77 |
| PUT | `/api/v1/stock-takes/{id}` | `update_stock_take` | |
| DELETE | `/api/v1/stock-takes/{id}` | `delete_stock_take` | |
| POST | `/api/v1/stock-takes/{id}/adjust` | `adjust_stock_take` | api/stock_take.rs:83 |
| POST | `/api/v1/stock-takes/{id}/complete` | `complete_stock_take` | api/stock_take.rs:82 |
| POST | `/api/v1/stock-takes/{id}/count` | `count_stock_take` | api/stock_take.rs:81 |
| GET | `/api/v1/stock-takes/{id}/items` | `list_stock_take_items` | api/stock_take.rs:78 |
| POST | `/api/v1/stock-takes/{id}/items` | `create_stock_take_item` | |
| GET | `/api/v1/stock-takes/{id}/items/{item_id}` | `get_stock_take_item` | api/stock_take.rs:79 |
| PUT | `/api/v1/stock-takes/{id}/items/{item_id}` | `update_stock_take_item` | |
| DELETE | `/api/v1/stock-takes/{id}/items/{item_id}` | `delete_stock_take_item` | |
| POST | `/api/v1/stock-takes/{id}/start` | `start_stock_take` | api/stock_take.rs:80 |
| GET | `/api/v1/transfers/{id}` | `get_transfer` | api/transfer.rs:35 |
| PUT | `/api/v1/transfers/{id}` | `update_transfer` | |
| DELETE | `/api/v1/transfers/{id}` | `delete_transfer` | |
| POST | `/api/v1/transfers/{id}/execute` | `execute_transfer` | api/transfer.rs:38 |
| GET | `/api/v1/transfers/{id}/items` | `list_transfer_items` | api/transfer.rs:36 |
| POST | `/api/v1/transfers/{id}/items` | `create_transfer_item` | |
| GET | `/api/v1/transfers/{id}/items/{item_id}` | `get_transfer_item` | api/transfer.rs:37 |
| PUT | `/api/v1/transfers/{id}/items/{item_id}` | `update_transfer_item` | |
| DELETE | `/api/v1/transfers/{id}/items/{item_id}` | `delete_transfer_item` | |
| GET | `/api/wms/alerts` | `list_alerts` | api/inventory_alert.rs:87 |
| GET | `/api/wms/alerts/by-warehouse` | `get_alerts_by_warehouse` | api/inventory_alert.rs:92 |
| GET | `/api/wms/alerts/statistics` | `get_alert_statistics` | api/inventory_alert.rs:90 |
| GET | `/api/wms/alerts/summary` | `get_alert_summary` | api/inventory_alert.rs:91 |
| GET | `/api/wms/audit-logs` | `list_audit_logs` | api/audit.rs:52 |
| GET | `/api/wms/cycle-counts` | `list_cycle_count_configs` | api/cycle_count.rs:34 |
| POST | `/api/wms/cycle-counts` | `create_cycle_count_config` | |
| POST | `/api/wms/cycle-counts/generate-all` | `generate_all_cycle_counts` | api/cycle_count.rs:37 |
| GET | `/api/wms/discrepancies` | `list_discrepancies` | api/discrepancy.rs:34 |
| POST | `/api/wms/discrepancies` | `create_discrepancy` | |
| POST | `/api/wms/discrepancies/process-stock-take/{stock_take_id}` | `process_stock_take_discrepancies` | api/discrepancy.rs:38 |
| GET | `/api/wms/inventory/low-stock` | `list_low_stock_inventory` | api/inventory.rs:74 |
| GET | `/api/wms/inventory/warehouse/{warehouse_id}` | `list_inventory_by_warehouse` | api/inventory.rs:75 |
| GET | `/api/wms/locations` | `list_locations` | api/location.rs:33 |
| POST | `/api/wms/locations` | `create_location` | |
| GET | `/api/wms/stock-takes` | `list_stock_takes` | api/stock_take.rs:76 |
| POST | `/api/wms/stock-takes` | `create_stock_take` | |
| POST | `/api/wms/sync/inbound-from-scm` | `create_inbound_from_scm` | api/data_sync.rs:48 |
| POST | `/api/wms/sync/outbound-order/{id}/to-shipping` | `create_shipping_from_outbound` | api/data_sync.rs:47 |
| POST | `/api/wms/sync/outbound-to-shipping` | `outbound_to_shipping` | api/data_sync.rs:46 |
| POST | `/api/wms/sync/sync-logs` | `get_sync_logs` | api/data_sync.rs:49 |
| GET | `/api/wms/transfers` | `list_transfers` | api/transfer.rs:34 |
| POST | `/api/wms/transfers` | `create_transfer` | |
| GET | `/health` | `health_check` | main.rs:79 |