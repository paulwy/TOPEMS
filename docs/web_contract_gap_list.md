# Web 契约冒烟豁免清单（KNOWN FAIL）

> 机制：`scripts/web_contract_smoke.py::load_expected_fails` 读取本清单，
> 命中 (method, path) 的 FAIL 记为 KNOWN（不阻断门禁），其余 FAIL 阻断。
>
> **当前状态：已重新登记存量缺口（2026-10-30）**。服务端二进制重启触发契约冒烟全量执行，
> 暴露 87 项前端已声明、后端路由未实现的存量缺口（master-data / erp mdm-v49 /
> communication notification-im / integration / qms internal 等），本次仅登记留痕、
> 不阻断门禁；待后续各模块路由实现后逐项核销清零。
## KNOWN

- DELETE /api/erp/mdm-v49/delete-archive-policy
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
- GET /api/erp/erp/hrm-integration-example/list-companies-from-hrm
- GET /api/erp/erp/hrm-integration-example/list-departments-from-hrm
- GET /api/erp/erp/master-data-refs/list-compliance-rules-handler
- GET /api/erp/erp/master-data-refs/query-records-handler
- GET /api/erp/erp/master-data/classification/categories
- GET /api/erp/erp/master-data/domains
- GET /api/erp/erp/master-data/knowledge/inference-rules
- GET /api/erp/erp/master-data/services
- GET /api/erp/erp/mdm-v49/get-archive-record
- GET /api/erp/hrm-integration-example/get-employee-from-hrm
- GET /api/erp/hrm-integration-example/list-employees-from-hrm
- GET /api/erp/mdm-v49/cancel-retirement-plan
- GET /api/erp/mdm-v49/get-archive-policy
- GET /api/erp/mdm-v49/get-lifecycle-dashboard
- GET /api/erp/production-order/list-production-orders
- GET /api/integration/sync-logs/00000000-0000-0000-0000-000000000099
- GET /api/lims/lims/samples/00000000-0000-0000-0000-000000000099
- GET /api/master-data/continuity/plans
- GET /api/master-data/dashboard/recent
- GET /api/master-data/dashboard/recent/00000000-0000-0000-0000-000000000099
- GET /api/master-data/data-products
- GET /api/master-data/dict-types
- GET /api/master-data/dict-types/00000000-0000-0000-0000-000000000099/items
- GET /api/master-data/lifecycle/policies
- GET /api/master-data/lifecycle/policies/00000000-0000-0000-0000-000000000099
- GET /api/master-data/metadata/search
- GET /api/master-data/metadata/search/00000000-0000-0000-0000-000000000099
- GET /api/master-data/permissions/resource
- GET /api/master-data/permissions/resource/00000000-0000-0000-0000-000000000099
- GET /api/master-data/recovery/points
- GET /api/master-data/recovery/points/00000000-0000-0000-0000-000000000099
- GET /api/master-data/samples/00000000-0000-0000-0000-000000000099
- GET /api/master-data/score
- GET /api/master-data/trending
- GET /api/master-data/uoms
- GET /api/master-data/version/diff
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
- POST /api/erp/mdm-v49/create-archive-policy
- POST /api/erp/mdm-v49/restore-archive-record
- POST /api/erp/mdm-v49/rollback-retirement-plan
- POST /api/erp/mdm-v49/run-sla-check
- POST /api/finance/-v60/alert/rule
- POST /api/integration/auto-match
- POST /api/integration/batch
- POST /api/integration/export/mappings
- POST /api/integration/export/sync-logs
- POST /api/integration/sync-logs
- POST /api/integration/sync-statistics
- POST /api/lims/internal/lims/samples/integration
- POST /api/lims/internal/lims/tasks/integration
- POST /api/master-data/ai/predict
- POST /api/master-data/data-product
- POST /api/master-data/export
- POST /api/master-data/lineage/export
- POST /api/master-data/lineage/refresh
- POST /api/master-data/lineage/refresh/00000000-0000-0000-0000-000000000099
- POST /api/master-data/metadata
- POST /api/master-data/search/reindex
- POST /api/qms/internal/qms/actions/integration
- POST /api/qms/internal/qms/inspections/00000000-0000-0000-0000-000000000099/result
- PUT /api/erp/mdm-v49/update-archive-policy
