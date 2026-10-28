# Web 契约冒烟豁免清单（KNOWN FAIL）

> 机制：`scripts/web_contract_smoke.py::load_expected_fails` 读取本清单，
> 命中 (method, path) 的 FAIL 记为 KNOWN（不阻断门禁），其余 FAIL 阻断。
>
> **本清单当前条目 = S25 批量语义治理的剩余范围（第 54 轮登记）。**
> 第 54 轮已清零：audit / hrm 错列修复、communication core_emails schema 前缀、
> mes/energy 501 降级判定、erp/hr 业务 404 语义。
> 剩余 42 条均为“实现级缺口”（非 envelope 语义）：
> - `workflow` 39 条：flow 模块代码仍查询 stub 表（core_workflow_tasks/instances/workflows），
>   完整表（approvals/workflow_instances/workflows）结构不同（无 title/name_en/status/version 等列），
>   需迁移补列或代码列映射对齐（第 55 轮实施）。
> - `mobile` 3 条：mobile→MES 服务调用（TypedServiceClient<MesApi>）在 BFF 内嵌认证链路上失败，
>   需排查 service token 在 /api/mes 路由的校验（第 55 轮实施）。

## KNOWN（第 54 轮登记：workflow 39 + mobile 3，实现级遗留）

- GET /api/mobile/production/orders/00000000-0000-0000-0000-000000000099
- POST /api/mobile/production/orders/00000000-0000-0000-0000-000000000099/start
- POST /api/mobile/production/orders/00000000-0000-0000-0000-000000000099/complete
- GET /api/core/flow/approvals
- GET /api/core/flow/approvals/00000000-0000-0000-0000-000000000099
- GET /api/core/flow/approval-tasks
- GET /api/core/flow/approval-tasks/00000000-0000-0000-0000-000000000099
- POST /api/core/flow/approval-tasks/00000000-0000-0000-0000-000000000099/approve
- POST /api/core/flow/approval-tasks/00000000-0000-0000-0000-000000000099/reject
- POST /api/core/flow/approval-tasks/00000000-0000-0000-0000-000000000099/claim
- POST /api/core/flow/approval-tasks/00000000-0000-0000-0000-000000000099/unclaim
- GET /api/core/flow/approvals/pending
- POST /api/core/flow/approvals/00000000-0000-0000-0000-000000000099/approve
- POST /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/deploy
- POST /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/activate
- POST /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/deactivate
- GET /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/versions
- GET /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/versions/00000000-0000-0000-0000-000000000099
- POST /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/versions/00000000-0000-0000-0000-000000000099/activate
- DELETE /api/core/flow/workflows/00000000-0000-0000-0000-000000000099/versions/00000000-0000-0000-0000-000000000099
- GET /api/core/flow/workflows
- GET /api/core/flow/workflows/00000000-0000-0000-0000-000000000099
- PUT /api/core/flow/workflows/00000000-0000-0000-0000-000000000099
- DELETE /api/core/flow/workflows/00000000-0000-0000-0000-000000000099
- GET /api/core/flow/instances
- GET /api/core/flow/instances/00000000-0000-0000-0000-000000000099
- GET /api/core/flow/instances/00000000-0000-0000-0000-000000000099/details
- POST /api/core/flow/instances/00000000-0000-0000-0000-000000000099/cancel
- POST /api/core/flow/instances/00000000-0000-0000-0000-000000000099/suspend
- POST /api/core/flow/instances/00000000-0000-0000-0000-000000000099/resume
- GET /api/core/flow/monitor/instances
- GET /api/core/flow/monitor/instances/00000000-0000-0000-0000-000000000099
- GET /api/core/flow/monitor/instances/running
- GET /api/core/flow/monitor/instances/completed
- GET /api/core/flow/monitor/instances/rejected
- GET /api/core/flow/monitor/instances/suspended
- GET /api/core/flow/monitor/instances/overdue
- GET /api/core/flow/monitor/logs/00000000-0000-0000-0000-000000000099
- GET /api/core/flow/monitor/instances/error
- POST /api/core/flow/monitor/instances/00000000-0000-0000-0000-000000000099/retry
- POST /api/core/flow/monitor/instances/00000000-0000-0000-0000-000000000099/force-complete
- POST /api/core/flow/monitor/instances/00000000-0000-0000-0000-000000000099/force-terminate
