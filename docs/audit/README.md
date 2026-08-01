# TOPEMS 审计与合规报告 (P36-4)

本目录存放 TOPEMS 平台的审计数据文档、合规报告模板与自动生成的报告。

## 1. 审计数据源 Audit Data Sources

TOPEMS 统一审计层 (`svc/unified-core/src/modules/audit/`) 聚合了 **4 个审计数据源**，
均通过统一 API 路径 `/api/core/iam/v1/audit/*` 暴露：

| 数据源 Source | 数据库表 Table | 说明 Description |
| --- | --- | --- |
| `audit_logs` | `iam.audit_logs` | HTTP 请求级审计日志（中间件自动记录） |
| `permission_audit_logs` | `iam.permission_audit_logs` | 权限/角色变更审计日志 |
| `login_logs` | `core_login_logs` | 用户登录日志（成功/失败、IP、UA） |
| `operation_logs` | `core_operation_logs` | 业务写操作审计日志（`operation_audit_middleware` 自动记录） |

> `operation_logs` 为 P36-4 新增接入的源，将 `core_operation_logs` 表纳入统一查询/统计/导出。

## 2. 查询审计日志 Query Logs

统一查询端点（受 `system:audit` 权限保护）：

```
GET /api/core/iam/v1/audit/logs
```

常用查询参数 Query Parameters：

| 参数 Param | 说明 |
| --- | --- |
| `source` | 数据源：`audit_logs` / `permission_audit_logs` / `login_logs` / `operation_logs`（默认 `audit_logs`） |
| `user_id` | 用户 ID |
| `action` | 操作类型（`operation_logs` 映射到 `operation` 列） |
| `entity_type` | 实体类型（`operation_logs` 映射到 `resource_type`） |
| `status` | 状态（`operation_logs` 映射到 `response_status::text`） |
| `ip_address` | IP 地址 |
| `start_date` / `end_date` | 时间范围（RFC3339 / `YYYY-MM-DD` / `YYYY-MM-DD HH:MM:SS`） |
| `search` | 模糊搜索（用户名 / 操作 / 模块） |
| `page` / `pagesize` | 分页（默认 1 / 20，最大 200） |

列出可用数据源：

```
GET /api/core/iam/v1/audit/sources
```

前端 API 封装见 `apps/web/src/api/admin/operationAudit.ts` 与 `auditLog.ts`。

## 3. 审计统计 Audit Stats

```
GET /api/core/iam/v1/audit/logs/stats?source=<source>&start_date=...&end_date=...
```

返回 `total` / `today_total` / `success_total` / `failure_total` / `by_action` /
`by_source` / `by_user` / `trend`（按天聚合）。

## 4. 导出审计日志 Export Logs

支持 **CSV** 与 **JSON** 两种格式：

```
GET /api/core/iam/v1/audit/logs/export?source=operation_logs&format=csv&start_date=...&end_date=...
```

- `format`：`csv`（默认）或 `json`
- 响应带 `Content-Disposition: attachment; filename="audit_logs_<source>.csv"`
- 响应头 `x-audit-source` / `x-audit-row-count` 标识来源与行数
- 单次导出上限 10,000 行

前端导出（操作日志）：

```ts
import { operationAuditApi } from '@/api/admin/operationAudit';

const blob: Blob = await operationAuditApi.exportOperationLogs({
  format: 'csv',
  start_date: '2026-01-01',
  end_date: '2026-01-31',
});
```

## 5. 生成合规报告 Generate Compliance Reports

报告生成器脚本：`scripts/audit/generate-report.sh`

### 依赖 Dependencies

- `curl`、`jq`（必选）
- `chmod +x scripts/audit/generate-report.sh`

### 用法 Usage

```bash
./scripts/audit/generate-report.sh \
  --tenant-id <uuid> \
  --start-date 2026-01-01 \
  --end-date 2026-01-31 \
  --format markdown \
  --output docs/audit/reports/compliance-report-2026-01-31.md
```

参数 Options：

| 参数 | 说明 |
| --- | --- |
| `--tenant-id` | 租户 ID（默认 `$TOPEMS_TENANT_ID` 或 `default`） |
| `--start-date` | 报告起始日期（`YYYY-MM-DD`，必填） |
| `--end-date` | 报告结束日期（`YYYY-MM-DD`，必填） |
| `--format` | `markdown`（默认）或 `json` |
| `--output` | 输出路径（默认 `docs/audit/reports/compliance-report-YYYY-MM-DD.md`） |
| `--api-url` | 审计 API 基址（默认 `$AUDIT_API_URL` 或 `http://localhost:8080`） |
| `--template` | 模板文件（默认 `docs/audit/templates/compliance-report.md`） |
| `--help` | 帮助 |

环境变量 Environment：

- `AUDIT_API_URL`：审计 API 基址（默认 `http://localhost:8080`）
- `AUDIT_API_TOKEN`：可选的 Bearer Token（用于鉴权访问 stats 端点）
- `TOPEMS_TENANT_ID`：默认租户 ID

### 工作原理 Workflow

1. 探测 `GET /api/core/iam/v1/audit/logs/stats` 可达性；不可达则报错退出。
2. 对 4 个数据源分别调用 stats 端点，收集统计 JSON。
3. 使用 `jq` 提取数值与表格行。
4. 使用 bash 参数扩展将 `{{placeholder}}` 填入模板。
5. 输出渲染后的 Markdown（或聚合 JSON）到 `--output`。

> 若 API 未运行，脚本会以错误信息退出（exit 5），不会崩溃。
> 单个数据源请求失败时，脚本以 `(无数据)` 占位并继续生成报告。

## 5B. Python 直连报告生成器 (P36-4)

`scripts/audit/generate_audit_report.py` 是 **直连 PostgreSQL** 的审计报告生成器，
不依赖服务在线：直接查询 `core_login_logs` / `core_operation_logs` /
`iam.permission_audit_logs` 三张审计日志表，按时间范围聚合后通过 Jinja2 风格模板渲染
Markdown / JSON 报告，并支持原始日志 CSV 导出。与上节 bash 脚本（走 HTTP API）互补，
适用于离线分析、定期归档与外部审计交付场景。

### 依赖 Dependencies

- Python 3.8+ 标准库
- `psycopg2`（**可选**；缺失或 `DATABASE_URL` 不可达时优雅降级为空报告模板，不 panic）

### 用法 Usage

```bash
# 直连 DB 生成 Markdown 报告
DATABASE_URL=postgresql://user:pass@host:5432/topems \
  python3 scripts/audit/generate_audit_report.py \
    --start-date 2026-07-01 --end-date 2026-08-01 \
    --output docs/audit/reports/audit-report-2026-08.md --format md

# 同时生成报告 + 导出原始日志 CSV
python3 scripts/audit/generate_audit_report.py \
  --start-date 2026-07-01 --end-date 2026-08-01 \
  --output docs/audit/reports/audit-report-2026-08.md \
  --format md --export-logs --export-dir docs/audit/reports/exports/

# 仅导出 CSV（不生成报告）
python3 scripts/audit/generate_audit_report.py \
  --start-date 2026-07-01 --end-date 2026-08-01 --format csv \
  --export-dir docs/audit/reports/exports/

# 降级模式：无 DB 也能跑，生成空报告模板（含 TODO 标记）
python3 scripts/audit/generate_audit_report.py \
  --start-date 2026-07-01 --end-date 2026-08-01 --format md
```

### 参数 Options

| 参数 Param | 说明 |
| --- | --- |
| `--start-date` | 报告起始日期（`YYYY-MM-DD`，必填） |
| `--end-date` | 报告结束日期（`YYYY-MM-DD`，必填） |
| `--output`, `-o` | 输出路径（默认 `docs/audit/reports/audit-report-YYYY-MM-DD.{md\|json}`） |
| `--format`, `-f` | `md`（默认）/ `json` / `csv`（csv=仅导出原始日志 CSV） |
| `--export-logs` | 同时导出原始日志 CSV（login/operation/permission） |
| `--export-dir` | CSV 导出目录（默认与 `--output` 同目录的 `exports/`） |
| `--export-limit` | 单类 CSV 导出行数上限（默认 100000） |
| `--template` | 报告模板文件（默认 `scripts/audit/report_template.md`） |
| `--tenant-id` | 租户 ID（默认 env `TOPEMS_TENANT_ID` 或 `default`） |
| `--database-url` | PostgreSQL 连接串（默认 env `DATABASE_URL`） |

环境变量 Environment：

- `DATABASE_URL`：PostgreSQL 连接串（缺失则降级为空报告）
- `TOPEMS_TENANT_ID`：默认租户 ID

### 报告章节 Report Sections

| 章节 Section | 内容 |
| --- | --- |
| 报告元信息 | 生成时间、时间范围、生成人、数据库实例 |
| 执行摘要 | 总登录次数、成功率、总操作数、异常事件数 |
| 登录活动分析 | 按用户 TOP 20、按 IP TOP 20、按时间段分布、失败登录清单 |
| 操作活动分析 | 按模块统计、按操作类型统计、按用户 TOP 20 |
| 权限变更记录 | 角色分配/撤销统计、变更明细 |
| 异常事件检测 | 暴力破解（失败登录 > 5 次的 IP）、非工作时间操作、敏感操作 |
| 合规检查清单 | 11 项，对应 P31-1~P31-6 + P32-2 + P32-4 + P35-1/2/3 |
| 建议措施 | 数据驱动的整改建议与跟踪项 |

### 优雅降级 Graceful Degradation

当 `DATABASE_URL` 未设置、`psycopg2` 未安装或数据库不可达时，脚本不报错退出，
而是生成一份 **空报告模板**：所有统计为 0，数据驱动章节显示 `(无数据 / no data)`，
关键发现区写入 `⚠️ 数据库不可用` 与 `TODO:` 标记。合规检查清单（代码级控制）仍显示
`PASS`。便于在 CI/定时任务中先行产出骨架，待 DB 可用后补全。

## 5C. CSV 导出格式 (P36-4)

原始日志 CSV 的列结构由 `scripts/audit/csv_export_schema.json` 定义（JSON Schema），
脚本以此为单一信源读取列名生成 CSV 表头，避免列定义漂移。

| 导出 Export | 物理表 Table | 列数 Columns | 文件名 Filename |
| --- | --- | --- | --- |
| `login_logs` | `core_login_logs` | 10 | `login_logs.csv` |
| `operation_logs` | `core_operation_logs` | 15 | `operation_logs.csv` |
| `permission_changes` | `iam.permission_audit_logs` | 18 | `permission_changes.csv` |

CSV 约定：

- 编码 UTF-8，行尾 `\n`，转义遵循 RFC 4180（含逗号/引号/换行的字段加双引号并转义）。
- 可空字段以空字符串表示（不使用 `NULL` 字面量）。
- `request_data` (JSONB) 序列化为单行紧凑 JSON 后转义。
- 时间字段以 RFC 3339 / ISO 8601 UTC 输出（带 `Z` 后缀）。
- 布尔字段输出 `true` / `false` 小写字面量。
- 单次导出行数上限由 `--export-limit` 控制（默认 100000），超出建议按时间分片。

## 6. 模板结构 Template Structure

模板：`docs/audit/templates/compliance-report.md`

使用 `{{placeholder}}` 语法（纯静态 Markdown，无 Jinja/Handlebars）：

| 章节 Section | 主要占位符 Placeholders |
| --- | --- |
| 报告头 Header | `{{report_title}}` `{{tenant_id}}` `{{start_date}}` `{{end_date}}` `{{generated_at}}` |
| 执行摘要 Executive Summary | `{{total_events}}` `{{success_total}}` `{{failure_total}}` `{{failure_rate}}` `{{key_findings}}` |
| 统计概览 Statistics | `{{top_actions_rows}}` `{{top_users_rows}}` `{{daily_trend_rows}}` |
| 登录审计 Login Audit | `{{login_total}}` `{{login_success}}` `{{login_failure}}` `{{login_unique_users}}` |
| 操作审计 Operation Audit | `{{operation_total}}` `{{operation_by_module_rows}}` `{{operation_by_action_rows}}` |
| 权限审计 Permission Audit | `{{permission_total}}` `{{permission_affected_roles}}` |
| HTTP 请求审计 HTTP Audit | `{{audit_total}}` `{{audit_by_action_rows}}` |
| 建议与整改 Recommendations | `{{recommendations}}` `{{remediation_items_rows}}` |
| 附录 Appendix | `{{export_references}}` `{{generation_command}}` `{{api_url}}` |

## 7. 目录结构 Directory Layout

```
docs/audit/
├── README.md                       # 本文档
├── templates/
│   └── compliance-report.md        # 合规报告模板（bash 脚本用，{{placeholder}} 静态替换）
├── reports/                        # 生成的报告（自动创建）
│   ├── audit-report-YYYY-MM-DD.md  # Python 生成器输出（直连 DB）
│   ├── audit-report-YYYY-MM-DD.json
│   └── exports/                    # --export-logs CSV 输出
│       ├── login_logs.csv
│       ├── operation_logs.csv
│       └── permission_changes.csv
└── v8x-*.md                        # 历史架构审计报告

scripts/audit/
├── generate-report.sh              # bash 报告生成器（走 HTTP API，5 节）
├── generate_audit_report.py        # Python 报告生成器（直连 DB，5B 节）
├── report_template.md              # Python 生成器模板（Jinja2 风格 {{ var }} / {% for %}）
└── csv_export_schema.json          # CSV 导出列结构定义（5C 节，单一信源）
```

## 8. 两套生成器对比 Generator Comparison

| 维度 | bash `generate-report.sh` | Python `generate_audit_report.py` |
| --- | --- | --- |
| 数据来源 | HTTP API（`/iam/v1/audit/logs/stats`） | PostgreSQL 直连 |
| 依赖 | `curl` / `jq` | Python 3.8+ / `psycopg2`（可选） |
| 服务在线 | 必须在线 | 不需要（离线可跑） |
| 降级行为 | API 不可达 → exit 5 | DB 不可达 → 空报告模板（含 TODO） |
| 模板 | `docs/audit/templates/compliance-report.md`（`{{var}}`） | `scripts/audit/report_template.md`（`{{var}}` + `{% for/if %}`） |
| 输出 | Markdown / JSON | Markdown / JSON / CSV（含原始日志导出） |
| 适用 | 在线巡检、运维 dashboard | 离线归档、外部审计交付、定时任务 |
