# to_bind v74 重建池（2026-10-29，当前基线·含 Router::route 补充）

> 脚本：`scripts/rebuild-to-bind-pool.py`；数据源：当前 origin/main 后端路由（utoipa 3260 + Router::route 2332 去重 5592）× 前端 api 调用 2041。
> 口径：后端真实 handler + 前端无 api 调用 → 候选；优先级 P0=写+弱引用 / P1=写+无引用 / P2=读+弱引用 / 下线候选=读+无引用。

**候选总数：2712**（v73 旧池 332 已作废）

## 优先级分布
| 优先级 | 数量 | 处置建议 |
|---|---|---|
| P0 | 120 | 写端点+弱引用，绑定收益最高 |
| P1 | 441 | 写端点+无引用，补 CRUD 页 |
| P2 | 507 | 读端点+弱引用，读绑定 |
| 下线候选 | 1644 | 读端点+无引用，人工确认删路由 |

## 按服务分布（前 15）
| 服务 | 候选 | P0 | P1 | P2 | 下线 |
|---|---|---|---|---|---|
| erp | 510 | 16 | 86 | 58 | 350 |
| portal | 343 | 2 | 4 | 10 | 327 |
| ehs | 261 | 13 | 53 | 77 | 118 |
| master-data | 219 | 20 | 16 | 79 | 104 |
| unified-core | 198 | 0 | 6 | 51 | 141 |
| ai | 152 | 4 | 4 | 53 | 91 |
| qms | 144 | 16 | 69 | 24 | 35 |
| pdm | 104 | 0 | 45 | 18 | 41 |
| analytics | 88 | 4 | 26 | 9 | 49 |
| finance | 79 | 0 | 12 | 5 | 62 |
| mes | 72 | 2 | 12 | 14 | 44 |
| integration | 64 | 8 | 6 | 1 | 49 |
| plugin-registry | 57 | 0 | 22 | 4 | 31 |
| communication | 51 | 4 | 8 | 7 | 32 |
| gis | 41 | 6 | 18 | 10 | 7 |

## P0 候选清单（120 条，前 25 示例）
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

## 与 v73 差异与精度说明
- **Router::route 补充**：非 utoipa 注册（如 unified-core routes/file.rs、模块汇总）已并入，后端路由 3260→5592。
- **口径过时修正**：v73（2026-10-12）19 天前端补绑项自动移出；后端无路由端点（如旧 `/api/bi/analysis`）自然消失。
- **已知精度限制（登记改进项）**：① method 提取有缺（部分 POST/PUT 标 GET，人工批核按 handler 名修正）；② 极少数多行/特殊注册格式（如 finance accounts/code、unified-core /download）可能漏匹配——人工批核时抽查；③ apps/mobile scan.ts 绑定漏匹配。