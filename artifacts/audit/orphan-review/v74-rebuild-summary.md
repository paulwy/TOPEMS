# to_bind v74 重建池（2026-10-29，当前基线）

> 脚本：`scripts/rebuild-to-bind-pool.py`；数据源：当前 origin/main 后端 utoipa 路由 3260 × 前端 api 调用 2041。
> 口径：后端真实 handler + 前端无 api 调用 → 候选；优先级 P0=写+弱引用 / P1=写+无引用 / P2=读+弱引用 / 下线候选=读+无引用。

**候选总数：1649**（v73 旧池 332 已作废——口径过时）

## 优先级分布
| 优先级 | 数量 | 处置建议 |
|---|---|---|
| P0 | 119 | 写端点+弱引用，绑定收益最高 |
| P1 | 420 | 写端点+无引用，补 CRUD 页 |
| P2 | 202 | 读端点+弱引用，读绑定 |
| 下线候选 | 908 | 读端点+无引用，人工确认删路由 |

## 按服务分布（前 15）
| 服务 | 候选 | P0 | P1 | P2 | 下线 |
|---|---|---|---|---|---|
| portal | 309 | 2 | 4 | 7 | 296 |
| erp | 258 | 15 | 70 | 18 | 155 |
| ehs | 154 | 13 | 53 | 27 | 61 |
| qms | 112 | 16 | 67 | 14 | 15 |
| ai | 91 | 4 | 4 | 28 | 55 |
| master-data | 76 | 20 | 16 | 19 | 21 |
| pdm | 73 | 0 | 45 | 2 | 26 |
| finance | 67 | 0 | 12 | 3 | 52 |
| analytics | 59 | 4 | 25 | 4 | 26 |
| plugin-registry | 44 | 0 | 22 | 1 | 21 |
| communication | 36 | 4 | 8 | 6 | 18 |
| gis | 35 | 6 | 18 | 7 | 4 |
| integration | 33 | 8 | 6 | 0 | 19 |
| rd | 33 | 3 | 6 | 5 | 19 |
| unified-core | 33 | 0 | 6 | 6 | 21 |

## P0 候选清单（119 条，前 25 示例）
| 服务 | 方法 | 路径 | handler | 写库 |
|---|---|---|---|---|
| ai | GET | /api/ai/settings | get_settings | write |
| ai | GET | /api/ai/settings | update_settings | write |
| ai | GET | /api/ai/dsh/agent/execute | execute_agent | write |
| ai | GET | /api/ai/dify/chat | chat | write |
| analytics | GET | /api/bi/datasets | create_dataset | write |
| analytics | GET | /api/bi/report | create_report | write |
| analytics | GET | /subscriptions | create_subscription | write |
| analytics | GET | /reports/from-template | create_report_from_template | write |
| communication | GET | /notification/notifications | delete_all_notifications | write |
| communication | GET | /notification/notifications/archive/config | get_archive_config | write |
| communication | GET | /notification/notifications/archive/config | update_archive_config | write |
| communication | GET | /notification/notifications/archive/run | run_auto_archive | write |
| crm | GET | /api/crm/customers | create_customer | write |
| ehs | GET | /api/ehs/environmental-compliance/regulations | create_regulation | write |
| ehs | GET | /api/ehs/environmental-compliance/evaluations | create_evaluation | write |
| ehs | GET | /api/ehs/environmental-compliance/monitoring | create_monitor_record | write |
| ehs | GET | /api/ehs/environmental-compliance/permits | create_permit | write |
| ehs | GET | /api/ehs/environmental-compliance/incidents | create_incident | write |
| ehs | GET | /api/ehs/training/plans | create_training_plan | write |
| ehs | GET | /api/ehs/training/certificates | create_certificate | write |
| ehs | GET | /api/ehs/drills/plans | create_drill_plan | write |
| ehs | GET | /api/ehs/drills/records | create_drill_record | write |
| ehs | GET | /api/ehs/checks/plans | create_plan_db | write |
| ehs | GET | /api/ehs/checks/records | create_record_db | write |
| ehs | GET | /api/ehs/environment/records | create_record | write |

## 与 v73 差异说明
- **口径过时**：v73（2026-10-12）19 天前端大量补绑，已绑端点未移出；v74 自动移出前端 api 调用已绑项。
- **路径失实修正**：后端无路由的端点（如旧 `/api/bi/analysis`）在 v74 自然消失（实际 `/api/bi/report` 系另列）。
- **已知精度限制（登记改进项）**：① method 提取有缺（部分 POST/PUT 标 GET，人工批核时按 handler 名修正）；② 非 utoipa Router::route 注册未扫（如 file/download，约 2174 处补充注册）；③ 个别前端绑定漏匹配（apps/mobile scan.ts）。