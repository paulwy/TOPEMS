# Web 契约冒烟豁免清单（KNOWN FAIL）

> 机制：`scripts/web_contract_smoke.py::load_expected_fails` 读取本清单，
> 命中 (method, path) 的 FAIL 记为 KNOWN（不阻断门禁），其余 FAIL 阻断。
>
> **当前状态：P0-A/P0-B 已核销 46 项（2026-10-30）**。
> - 已核销：P0-A 前端契约路径修复 10 项（erp/erp 嵌套前缀 ×9、finance -v60 ×1，前端指向
>   后端实测路由）；P0-B 后端补路由 36 项（master-data 27、erp mdm-v49 9）。均经
>   web_contract_smoke.py 实测非路由缺失（401/200/业务 404 均视为存在）。
> - 剩余 41 项：P1 集成链路 20（communication notification-im 13、integration 7）、
>   P2 模块子集 13（core/ehs/lims/qms/erp-production-order）、P3 待决策 8
>   （erp db-structure 4 仅出决策建议不实现、erp-plugin 2、hrm-integration-example 2）。
> 待后续各模块路由实现后逐项核销清零。
## KNOWN

- GET /api/communication/notification/im/contact-groups
- GET /api/communication/notification/im/contacts
- GET /api/communication/notification/im/project-groups
- GET /api/communication/notification/im/rooms
- GET /api/communication/notification/locations/geofences
- GET /api/communication/notification/mail/emails
- GET /api/communication/notification/mail/templates
- GET /api/communication/notification/notification/notification-templates
- GET /api/core/ai-form/forms
- GET /api/core/sse/connect
- GET /api/core/ws/core/notifications
- GET /api/ehs/hazardous-materials/stock-records/00000000-0000-0000-0000-000000000099
- GET /api/erp/hrm-integration-example/get-employee-from-hrm
- GET /api/erp/hrm-integration-example/list-employees-from-hrm
- GET /api/erp/production-order/list-production-orders
- GET /api/integration/sync-logs/00000000-0000-0000-0000-000000000099
- GET /api/lims/lims/samples/00000000-0000-0000-0000-000000000099
- POST /api/communication/notification/im/contacts
- POST /api/communication/notification/im/rooms
- POST /api/communication/notification/im/rooms/00000000-0000-0000-0000-000000000099/read
- POST /api/communication/notification/locations/message
- POST /api/communication/notification/pois/search
- POST /api/core/instances/00000000-0000-0000-0000-000000000099/start
- POST /api/ehs/occupational-health/exam-plans
- POST /api/ehs/occupational-health/exam-records
- POST /api/erp/db-structure/execute-add-column
- POST /api/erp/db-structure/execute-drop-column
- POST /api/erp/db-structure/execute-modify-column
- POST /api/erp/db-structure/preview-add-column
- POST /api/erp/erp-plugin/auto-register-to-core
- POST /api/erp/erp-plugin/register-to-core
- POST /api/integration/auto-match
- POST /api/integration/batch
- POST /api/integration/export/mappings
- POST /api/integration/export/sync-logs
- POST /api/integration/sync-logs
- POST /api/integration/sync-statistics
- POST /api/lims/internal/lims/samples/integration
- POST /api/lims/internal/lims/tasks/integration
- POST /api/qms/internal/qms/actions/integration
- POST /api/qms/internal/qms/inspections/00000000-0000-0000-0000-000000000099/result
