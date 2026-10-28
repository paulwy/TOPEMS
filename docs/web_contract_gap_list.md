# Web 契约冒烟豁免清单（KNOWN FAIL）

> 机制：`scripts/web_contract_smoke.py::load_expected_fails` 读取本清单，
> 命中 (method, path) 的 FAIL 记为 KNOWN（不阻断门禁），其余 FAIL 阻断。
>
> **本清单当前条目 = S25 批量语义治理的剩余范围（第 53 轮登记，待第 54 轮
> unified-core 等模块 envelope→HTTP 对齐后清零删除）。**
> 条目为“后端语义债务”（http=200 body=500 / 404 错位），非前端缺口。

## KNOWN（S25 续项：第 53 轮登记，下轮治理后清零）

- GET /api/core/audit/permission-changes/00000000-0000-0000-0000-000000000099
- GET /api/erp/hr/departments/00000000-0000-0000-0000-000000000099
- GET /api/erp/hr/positions/00000000-0000-0000-0000-000000000099
- GET /api/hrm/attendance/00000000-0000-0000-0000-000000000099
- PUT /api/hrm/attendance/00000000-0000-0000-0000-000000000099
- GET /api/hrm/departments/00000000-0000-0000-0000-000000000099
- PUT /api/hrm/departments/00000000-0000-0000-0000-000000000099
- GET /api/hrm/positions
- GET /api/hrm/positions/00000000-0000-0000-0000-000000000099
- PUT /api/hrm/positions/00000000-0000-0000-0000-000000000099
- GET /api/hrm/setup/progress
- GET /api/communication/mail/emails/00000000-0000-0000-0000-000000000099
- GET /api/mes/energy/realtime
- GET /api/mes/energy/history
- GET /api/mes/energy/report
- GET /api/mes/energy/forecast
- GET /api/mes/energy/alerts
- GET /api/mes/energy/equipment/00000000-0000-0000-0000-000000000099
- GET /api/mes/energy/export
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
