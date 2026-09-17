# 同名多 schema 表收敛评估报告（2026-09-17）

> 扫描：`pg_class` 同名 relname 分组（relkind='r'，排除 information_schema/pg_catalog），共 **30+ 组**。

## 分类

### A. 设计内独立（各业务 schema 各自持有，非影子，不收敛）
| 表 | 副本数 | 说明 |
|---|---|---|
| audit_logs | 17 | 各业务 schema 独立审计表（bi/crm/ehs/erp/flow/... + public） |
| module_settings | 6 | hrm/mes/pdm/rs/scm 各自配置 |
| documents | 4 | ai/doc/erp/pm 各自文档表 |
| contracts | 3 | crm/hrm/pm 各自合同表 |
| purchase_orders | 3 | erp/scm/srm 各自采购订单（独立业务） |
| suppliers | 3 | erp/scm/srm 各自供应商表 |
| report_templates / templates | 3 | bi/pm/report / doc/doc_service/mail 各自 |
| budgets / inspection_records / ai_analyses | 2 | finance/pm / lims/scm / lims/rs 各自 |

### B. public 影子候选（core_* 平台共享层设计——public 权威，业务 schema 副本冗余）
| 表 | 业务副本 schema | 行数（业务/public） | 处置 |
|---|---|---|---|
| core_faqs | portal | 12/12 | **已清**：search_path public 优先 + 副本 DROP（迁移 000006） |
| core_guides | portal | 12/12 | 已清（同上） |
| core_guide_lessons / core_guide_progress | portal | 0/0 | 已清（同上） |
| core_doc_documents/folders/templates | doc_service | 0/0 | **已清**（空表，迁移 000006） |
| core_emails / core_notification_templates / core_notifications | communication | 0/0 | 已清 + search_path 统一 public 优先 |
| core_master_data_*（6 表） | master_data | 0/0 | 已清（空表，迁移 000006） |
| core_ticket_*（5 表） | ticket | 0/0 | 已清（public 影子，ticket 全显式前缀） |
| announcements / capacities / contacts | erp/mes/crm | 0/3、0/0、0/6 | public 权威（代码无前缀写入） |

### C. 业务 schema 权威（public 影子缺列，已治标）
| 表 | 权威 schema | 处理 |
|---|---|---|
| approvals / approval_records / core_workflow_tasks | flow | 迁移 20260917000005 补齐 public 副本缺列（防无前缀命中报错）；core_workflow_instances 同组 |
| core_workflow_instances / core_workflow_versions | flow | search_path 已含 flow（embedded + run_monolith） |

## 结论与建议

1. **B 类（已完成）**：core_* 统一 **public 平台层**——portal/communication search_path 改 public 优先；
   16 张冗余副本 DROP（迁移 20260917000006_duplicate_schema_cleanup.sql）；冒烟验证 portal/flow/erp/communication 全 200。
2. **C 类**：flow 组权威为 flow schema（列全），public 副本已补列治标；DROP public 副本的前提
   是 search_path 全局含 flow（本轮 embedded/run_monolith 已满足），可作为后续清理项。
3. **DROP 前置**：逐表 grep 显式 `schema.table` 引用；无引用 + search_path 覆盖权威 schema 后执行。
