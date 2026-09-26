# TOPEMS 审计与合规报告 (P36-4)

本目录存放 TOPEMS 平台的审计数据文档、合规报告模板与自动生成的报告。

## 1. 审计数据源 Audit Data Sources

TOPEMS 统一审计层 (`svc/unified-core/src/modules/audit/`) 聚合了 **4 个审计数据源**，
均通过统一 API 路径 `/api/core/iam/v1/audit/*` 暴露：

| 数据源 Source           | 数据库表 Table              | 说明 Description                                            |
| ----------------------- | --------------------------- | ----------------------------------------------------------- |
| `audit_logs`            | `iam.audit_logs`            | HTTP 请求级审计日志（中间件自动记录）                       |
| `permission_audit_logs` | `iam.permission_audit_logs` | 权限/角色变更审计日志                                       |
| `login_logs`            | `core_login_logs`           | 用户登录日志（成功/失败、IP、UA）                           |
| `operation_logs`        | `core_operation_logs`       | 业务写操作审计日志（`operation_audit_middleware` 自动记录） |

> `operation_logs` 为 P36-4 新增接入的源，将 `core_operation_logs` 表纳入统一查询/统计/导出。

## 2. 查询审计日志 Query Logs

统一查询端点（受 `system:audit` 权限保护）：

```
GET /api/core/iam/v1/audit/logs
```

常用查询参数 Query Parameters：

| 参数 Param                | 说明                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `source`                  | 数据源：`audit_logs` / `permission_audit_logs` / `login_logs` / `operation_logs`（默认 `audit_logs`） |
| `user_id`                 | 用户 ID                                                                                               |
| `action`                  | 操作类型（`operation_logs` 映射到 `operation` 列）                                                    |
| `entity_type`             | 实体类型（`operation_logs` 映射到 `resource_type`）                                                   |
| `status`                  | 状态（`operation_logs` 映射到 `response_status::text`）                                               |
| `ip_address`              | IP 地址                                                                                               |
| `start_date` / `end_date` | 时间范围（RFC3339 / `YYYY-MM-DD` / `YYYY-MM-DD HH:MM:SS`）                                            |
| `search`                  | 模糊搜索（用户名 / 操作 / 模块）                                                                      |
| `page` / `pagesize`       | 分页（默认 1 / 20，最大 200）                                                                         |

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
  --output docs/reports/audit/reports/compliance-report-2026-01-31.md
```

参数 Options：

| 参数           | 说明                                                                  |
| -------------- | --------------------------------------------------------------------- |
| `--tenant-id`  | 租户 ID（默认 `$TOPEMS_TENANT_ID` 或 `default`）                      |
| `--start-date` | 报告起始日期（`YYYY-MM-DD`，必填）                                    |
| `--end-date`   | 报告结束日期（`YYYY-MM-DD`，必填）                                    |
| `--format`     | `markdown`（默认）或 `json`                                           |
| `--output`     | 输出路径（默认 `docs/reports/audit/reports/compliance-report-YYYY-MM-DD.md`） |
| `--api-url`    | 审计 API 基址（默认 `$AUDIT_API_URL` 或 `http://localhost:8080`）     |
| `--template`   | 模板文件（默认 `docs/reports/audit/templates/compliance-report.md`）          |
| `--help`       | 帮助                                                                  |

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
    --output docs/reports/audit/reports/audit-report-2026-08.md --format md

# 同时生成报告 + 导出原始日志 CSV
python3 scripts/audit/generate_audit_report.py \
  --start-date 2026-07-01 --end-date 2026-08-01 \
  --output docs/reports/audit/reports/audit-report-2026-08.md \
  --format md --export-logs --export-dir docs/reports/audit/reports/exports/

# 仅导出 CSV（不生成报告）
python3 scripts/audit/generate_audit_report.py \
  --start-date 2026-07-01 --end-date 2026-08-01 --format csv \
  --export-dir docs/reports/audit/reports/exports/

# 降级模式：无 DB 也能跑，生成空报告模板（含 TODO 标记）
python3 scripts/audit/generate_audit_report.py \
  --start-date 2026-07-01 --end-date 2026-08-01 --format md
```

### 参数 Options

| 参数 Param       | 说明                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `--start-date`   | 报告起始日期（`YYYY-MM-DD`，必填）                                       |
| `--end-date`     | 报告结束日期（`YYYY-MM-DD`，必填）                                       |
| `--output`, `-o` | 输出路径（默认 `docs/reports/audit/reports/audit-report-YYYY-MM-DD.{md\|json}`） |
| `--format`, `-f` | `md`（默认）/ `json` / `csv`（csv=仅导出原始日志 CSV）                   |
| `--export-logs`  | 同时导出原始日志 CSV（login/operation/permission）                       |
| `--export-dir`   | CSV 导出目录（默认与 `--output` 同目录的 `exports/`）                    |
| `--export-limit` | 单类 CSV 导出行数上限（默认 100000）                                     |
| `--template`     | 报告模板文件（默认 `scripts/audit/report_template.md`）                  |
| `--tenant-id`    | 租户 ID（默认 env `TOPEMS_TENANT_ID` 或 `default`）                      |
| `--database-url` | PostgreSQL 连接串（默认 env `DATABASE_URL`）                             |

环境变量 Environment：

- `DATABASE_URL`：PostgreSQL 连接串（缺失则降级为空报告）
- `TOPEMS_TENANT_ID`：默认租户 ID

### 报告章节 Report Sections

| 章节 Section | 内容                                                       |
| ------------ | ---------------------------------------------------------- |
| 报告元信息   | 生成时间、时间范围、生成人、数据库实例                     |
| 执行摘要     | 总登录次数、成功率、总操作数、异常事件数                   |
| 登录活动分析 | 按用户 TOP 20、按 IP TOP 20、按时间段分布、失败登录清单    |
| 操作活动分析 | 按模块统计、按操作类型统计、按用户 TOP 20                  |
| 权限变更记录 | 角色分配/撤销统计、变更明细                                |
| 异常事件检测 | 暴力破解（失败登录 > 5 次的 IP）、非工作时间操作、敏感操作 |
| 合规检查清单 | 11 项，对应 P31-1~P31-6 + P32-2 + P32-4 + P35-1/2/3        |
| 建议措施     | 数据驱动的整改建议与跟踪项                                 |

### 优雅降级 Graceful Degradation

当 `DATABASE_URL` 未设置、`psycopg2` 未安装或数据库不可达时，脚本不报错退出，
而是生成一份 **空报告模板**：所有统计为 0，数据驱动章节显示 `(无数据 / no data)`，
关键发现区写入 `⚠️ 数据库不可用` 与 `TODO:` 标记。合规检查清单（代码级控制）仍显示
`PASS`。便于在 CI/定时任务中先行产出骨架，待 DB 可用后补全。

## 5C. CSV 导出格式 (P36-4)

原始日志 CSV 的列结构由 `scripts/audit/csv_export_schema.json` 定义（JSON Schema），
脚本以此为单一信源读取列名生成 CSV 表头，避免列定义漂移。

| 导出 Export          | 物理表 Table                | 列数 Columns | 文件名 Filename          |
| -------------------- | --------------------------- | ------------ | ------------------------ |
| `login_logs`         | `core_login_logs`           | 10           | `login_logs.csv`         |
| `operation_logs`     | `core_operation_logs`       | 15           | `operation_logs.csv`     |
| `permission_changes` | `iam.permission_audit_logs` | 18           | `permission_changes.csv` |

CSV 约定：

- 编码 UTF-8，行尾 `\n`，转义遵循 RFC 4180（含逗号/引号/换行的字段加双引号并转义）。
- 可空字段以空字符串表示（不使用 `NULL` 字面量）。
- `request_data` (JSONB) 序列化为单行紧凑 JSON 后转义。
- 时间字段以 RFC 3339 / ISO 8601 UTC 输出（带 `Z` 后缀）。
- 布尔字段输出 `true` / `false` 小写字面量。
- 单次导出行数上限由 `--export-limit` 控制（默认 100000），超出建议按时间分片。

## 6. 模板结构 Template Structure

模板：`docs/reports/audit/templates/compliance-report.md`

使用 `{{placeholder}}` 语法（纯静态 Markdown，无 Jinja/Handlebars）：

| 章节 Section               | 主要占位符 Placeholders                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| 报告头 Header              | `{{report_title}}` `{{tenant_id}}` `{{start_date}}` `{{end_date}}` `{{generated_at}}`            |
| 执行摘要 Executive Summary | `{{total_events}}` `{{success_total}}` `{{failure_total}}` `{{failure_rate}}` `{{key_findings}}` |
| 统计概览 Statistics        | `{{top_actions_rows}}` `{{top_users_rows}}` `{{daily_trend_rows}}`                               |
| 登录审计 Login Audit       | `{{login_total}}` `{{login_success}}` `{{login_failure}}` `{{login_unique_users}}`               |
| 操作审计 Operation Audit   | `{{operation_total}}` `{{operation_by_module_rows}}` `{{operation_by_action_rows}}`              |
| 权限审计 Permission Audit  | `{{permission_total}}` `{{permission_affected_roles}}`                                           |
| HTTP 请求审计 HTTP Audit   | `{{audit_total}}` `{{audit_by_action_rows}}`                                                     |
| 建议与整改 Recommendations | `{{recommendations}}` `{{remediation_items_rows}}`                                               |
| 附录 Appendix              | `{{export_references}}` `{{generation_command}}` `{{api_url}}`                                   |

## 7. 目录结构 Directory Layout

```
docs/reports/audit/
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
├── csv_export_schema.json          # CSV 导出列结构定义（5C 节，单一信源）
├── detect-ts-unused-exports.cjs    # 未使用 exports 检测器（L1/L2/L3 分级，10 节）
├── l1-conservative-remove-v2.cjs   # L1-SAFE VALUE 批量删除工具（10 节）
├── l2-batch2-scan.py               # L2-CAUTION 严格死链检测器（10 节）
├── type-only-scan.py               # TYPE-only 死链 scanner + 目录分桶（10 节）
├── type-only-remove.py             # TYPE-only 批量删除工具（10 节）
├── ts-unused-exports-report.json   # 最新检测报告（自动生成）
├── type-only-*.json               # TYPE-only 各批次候选 / 结果文件
├── l1-batch*.json                  # L1-SAFE 各批次候选文件
├── l2-batch*.json                  # L2-CAUTION 各批次候选 / 结果文件
└── l2-alive-barrel-usage.json     # VALUE ALIVE 列表（不可删，255 条）
```

## 8. 两套生成器对比 Generator Comparison

| 维度     | bash `generate-report.sh`                                | Python `generate_audit_report.py`                                |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| 数据来源 | HTTP API（`/iam/v1/audit/logs/stats`）                   | PostgreSQL 直连                                                  |
| 依赖     | `curl` / `jq`                                            | Python 3.8+ / `psycopg2`（可选）                                 |
| 服务在线 | 必须在线                                                 | 不需要（离线可跑）                                               |
| 降级行为 | API 不可达 → exit 5                                      | DB 不可达 → 空报告模板（含 TODO）                                |
| 模板     | `docs/reports/audit/templates/compliance-report.md`（`{{var}}`） | `scripts/audit/report_template.md`（`{{var}}` + `{% for/if %}`） |
| 输出     | Markdown / JSON                                          | Markdown / JSON / CSV（含原始日志导出）                          |
| 适用     | 在线巡检、运维 dashboard                                 | 离线归档、外部审计交付、定时任务                                 |

## 9. 架构审计报告索引

本目录还存放了项目各轮架构审计的报告文件，按版本排列：

| 报告                                                                               | 版本基线 | 日期       | 说明                                                                                          |
| ---------------------------------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------- |
| [V67.1-data-layer-audit](./V67.1-data-layer-audit-20260808.md)                     | V67.1    | 2026-08-08 | 数据层深度审计：审计日志覆盖率 25%→100%、ApprovalStatus 枚举统一、EntitySchema maxLength 校验 |
| [V70-fifth-round-audit](./V70-fifth-round-audit-20260808.md)                       | V70      | 2026-08-08 | 第五轮深度架构审计，31 项问题全闭环                                                           |
| [V71-sixth-round-probe-design](./V71-sixth-round-probe-design.md)                  | V71      | 2026-08-09 | 第六轮架构审计探针设计（4 探针方案）                                                          |
| [v73-real-handler-triage](./v73-real-handler-triage.md)                            | V73      | —          | V73 Real Handler Triage 报告                                                                  |
| [v77-architecture-audit-report](./v77-architecture-audit-report.md)                | V77      | —          | V77 架构与质量全面审计                                                                        |
| [v78-architecture-audit-report](./v78-architecture-audit-report.md)                | V78      | —          | V78.0 架构与质量审计                                                                          |
| [v81-phase-1-report](./v81-phase-1-report.md)                                      | V81      | —          | Phase 1：深度治理与规模化拆分                                                                 |
| [v81-phase-2-report](./v81-phase-2-report.md)                                      | V81      | —          | Phase 2：深度拆分与编译错误清零                                                               |
| [v81-phase-3-report](./v81-phase-3-report.md)                                      | V81      | —          | Phase 3：规模化 TSC 清零 + 123 hooks 测试 + 剩余大 Page 拆分                                  |
| [v81-phase-4-report](./v81-phase-4-report.md)                                      | V81      | —          | Phase 4：TSC 零错误达成 + 全量 Page 拆分收官                                                  |
| [V83.1-react-query-standardization](./V83.1-react-query-standardization-report.md) | V83.1    | —          | React Query 标准化审计                                                                        |
| [openapi-coverage-report](./openapi-coverage-report.md)                            | —        | —          | OpenAPI 覆盖率对照报告                                                                        |
| [probe-p04-openapi-contract](./probe-p04-openapi-contract.md)                      | —        | —          | P-04 探针：OpenAPI 前后端契约一致性                                                           |
| [probe-p07-utoipa-schema](./probe-p07-utoipa-schema.md)                            | —        | —          | P-07 探针：utoipa schema vs handler 签名一致性                                                |
| [p04-triage-report](./p04-triage-report.md)                                        | —        | —          | P-04 Triage：未使用后端 API 与未文档化前端 API                                                |
| [nav-architecture-verification](./nav-architecture-verification-2026-08-15.md)     | V71      | 2026-08-15 | 导航架构全量校对：35 模块 config.ts vs navigation-architecture.md，L1/L3 合规率 100%          |

## 10. 未使用 Exports 清理 (V258)

V258 阶段基于 `ts-unused-exports` 报告对 `apps/web/src` 执行了三阶段死链清理，合计 **≈ 2814 条** dead exports 移除，TSC apps/web 每批 0 errors Gate。

### 10.1 检测工具链

| 工具                   | 路径                                          | 说明                                                                               |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| **检测器**             | `scripts/audit/detect-ts-unused-exports.cjs`  | 快速 grep-based 扫描，按 L1-SAFE / L2-CAUTION / L3-HOLD 分级                       |
| **L1 批量删除**        | `scripts/audit/l1-conservative-remove-v2.cjs` | VALUE exports 批量去 `export` keyword + barrel re-export 删除                      |
| **L2 严格死链检测**    | `scripts/audit/l2-batch2-scan.py`             | strip comments/strings + barrel-local usage 过滤，排除 aggregate object 赋值假阳性 |
| **TYPE-only scanner**  | `scripts/audit/type-only-scan.py`             | L1+L2 → 去 VALUE mixed → 严格 barrel filter → 目录分桶                             |
| **TYPE-only 批量删除** | `scripts/audit/type-only-remove.py`           | def 侧 `export type/interface/enum` keyword strip + barrel repair                  |

### 10.2 清理结果

| 阶段     | 策略             | 批次           |                    清理数 | 回滚数 |
| -------- | ---------------- | -------------- | ------------------------: | -----: |
| Phase 1  | L1-SAFE VALUE    | ×16 目录       | 195 (90 def + 105 barrel) |      0 |
| Phase 2  | L2-CAUTION VALUE | ×2 批次        |                       ~23 |      6 |
| Phase 3  | TYPE-only        | ×12 批次       |                      2601 |      6 |
| **合计** |                  | **30 commits** |                **≈ 2814** | **12** |

### 10.3 假阳性模式（回滚策略）

| #   | 模式                            | 示例                                                   | 根因                                                                |
| --- | ------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| 1   | Barrel 内 aggregate object 赋值 | `const unifiedCoreApi = { system: systemApi }`         | scanner 的 `sampleRefs` 扁平化导致 barrel-local usage 被误判为 DEAD |
| 2   | `_mock.ts` 下划线前缀跳过       | `InventoryItemDto` in `api/wms/_mock.ts`               | ts-unused-exports 默认跳过下划线文件                                |
| 3   | 同文件 type+class 命名冲突      | `type RequestPriority` vs `class RequestPriorityQueue` | 去 `export` 触发 TS2300 Duplicate Identifier                        |

### 10.4 剩余 ALIVE（不可删）

- **255 条 VALUE**：barrel 本地 aggregate 构造（如 `const erpApi = { addressbookApi, ... }`）
- **1367 条 TYPE**：barrel 本地 namespace / type alias 构造

### 10.5 审计产物文件

| 文件                            | 说明                                      |
| ------------------------------- | ----------------------------------------- |
| `ts-unused-exports-report.json` | 全量检测报告（2613 文件 / 12614 exports） |
| `type-only-final.json`          | TYPE-only DEAD 最终列表（2607 条）        |
| `type-only-by-dir.json`         | 23 目录桶分组                             |
| `type-only-alive-barrel.json`   | TYPE-only ALIVE（1367 条，不可删）        |
| `l2-alive-barrel-usage.json`    | VALUE ALIVE（255 条，不可删）             |
| `l2-batch2-final.json`          | L2 Batch 2 候选列表                       |
| `l2-batch2-scan.py`             | L2 严格死链检测器源码                     |

### 10.6 后续使用

```bash
# 1. 重跑检测器生成最新报告
node scripts/audit/detect-ts-unused-exports.cjs

# 2. L1 VALUE 清理
node scripts/audit/l1-conservative-remove-v2.cjs --json scripts/audit/l1-batch<N>.json

# 3. L2 VALUE 严格死链重检
python3 scripts/audit/l2-batch2-scan.py

# 4. TYPE-only 清理
python3 scripts/audit/type-only-scan.py          # 生成 type-only-by-dir.json
python3 scripts/audit/type-only-remove.py --dir <dir>  # 按目录桶执行

# 5. TSC Gate（必须 0 errors 才提交）
cd apps/web && pnpm typecheck
```
