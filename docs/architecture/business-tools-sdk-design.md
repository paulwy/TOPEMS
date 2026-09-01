# TOPEMS 业务工具 SDK 设计草稿（V0.1 Draft）

> 状态：草稿 / 未发布 / 待 V476+ 评估后实施
> 关联功能：权限管理 / 审计日志导出 / 保留策略 / 清理任务 / 导出任务
> 目标语言：TypeScript (Node.js & Browser) · Python 3.10+

---

## 1. 背景与目标

### 1.1 为什么需要 SDK

业务工具 REST API（统一挂载在 `/api/business-tools/` 下）已具备权限管理、审计日志保留、清理、归档、恢复、导出、定时导出等完整能力。但当前使用方式：

1. 需要使用者自行封装 fetch / requests；
2. 流式导出（NDJSON）、gzip 响应解析、分页查询等需要手工处理；
3. 导出任务的启动/停止/配置轮询流程容易出错；
4. 鉴权 Header（Bearer Token）、Base URL 管理、错误映射每次重复写。

SDK 目标：**用 5% 的代码量覆盖 90% 的常见使用场景**，让调用方不需要翻 OpenAPI 文档就能完成日常操作。

### 1.2 不做什么（非目标）

- ❌ 不覆盖 CRM / ERP / MES 等模块的业务 API（那是各模块 SDK 的职责）。
- ❌ 不提供 GUI / CLI / TUI（单独交付）。
- ❌ 不做 SDK 生成器 / OpenAPI Generator（现阶段手写更精确，流式/压缩等特殊响应生成器处理不好）。
- ❌ 不做 React Hooks / Vue Composables 这类框架绑定层（V0.1 先跑通原生 API）。

---

## 2. 统一的端点前缀与鉴权

所有业务工具 SDK 方法都调用以下 base URL 的 REST API：

```
Base URL = <TOPEMS_GATEWAY_URL>/api/business-tools
```

鉴权：`Authorization: Bearer <access_token>`，由 SDK 构造器接收后自动注入所有请求。

---

## 3. 模块切分

SDK 按业务域切分为 5 个子客户端，全部挂在 `TopemsBusinessToolsClient` 下：

```
TopemsBusinessToolsClient
├── permissions          权限管理（CRUD / 批量 / 导出 / 导入 / 健康）
├── auditLogs            审计日志（查询 / 导出 / 流式导出）
├── retention            保留策略（查询 / 更新 / 触发清理 / 统计）
├── retentionTask        清理任务（状态 / 启动 / 停止）
└── exportTask           导出任务（状态 / 启动 / 停止 / 触发 / 配置）
```

**对应后端端点**（已实现）：

| 模块 | 后端路由前缀 |
|------|-------------|
| permissions | `/business-tools/permissions/*` |
| auditLogs | `/business-tools/permissions/audit-logs/*` |
| retention | `/business-tools/permissions/audit-logs/retention/*` |
| retentionTask | `/business-tools/permissions/audit-logs/retention/task/*` |
| exportTask | `/business-tools/permissions/audit-logs/export/task/*` |

---

## 4. TypeScript SDK 详细设计

### 4.1 安装

```bash
npm install @topems/business-tools-sdk
# or
pnpm add @topems/business-tools-sdk
# or
yarn add @topems/business-tools-sdk
```

> 发布位置：初期私有 npm registry，后期评估公开 npm。

### 4.2 初始化

```ts
import { TopemsBusinessToolsClient } from '@topems/business-tools-sdk';

const client = new TopemsBusinessToolsClient({
  baseUrl: 'https://topems.example.com/api/business-tools',
  accessToken: process.env.TOPEMS_ACCESS_TOKEN!,
  // 可选：自定义 fetch 实现（Node 18+ 内置 / 老 Node 用 node-fetch / 浏览器用原生）
  fetchImpl: globalThis.fetch,
  // 可选：默认超时（毫秒）
  timeout: 30_000,
  // 可选：重试策略（幂等 GET / 导出相关允许重试；POST 写入默认关闭）
  retry: { maxAttempts: 3, backoffMs: 500, retryableStatuses: [408, 429, 502, 503, 504] },
});
```

### 4.3 通用错误

SDK 统一把 HTTP 非 2xx/4xx 映射为结构化错误：

```ts
export class TopemsApiError extends Error {
  statusCode: number;
  errorCode?: string;   // 对应后端 ErrorResponse.code
  rawBody: unknown;
  requestId?: string;   // 从响应头 x-request-id 提取
}
```

所有 Promise 在错误时 reject 为 `TopemsApiError`（带完整上下文，便于日志和排错）。

---

### 4.4 permissions 子模块

```ts
const result = await client.permissions.list({
  tenantId: 'tenant-001',          // 可选
  roleCode: 'finance-manager',     // 可选
  resourceCode: 'finance.voucher', // 可选
  action: 'read',                  // 可选
  page: 1,
  pageSize: 50,
});
// -> { items: Permission[], total: number, page: number, pageSize: number }

const one = await client.permissions.get('perm-uuid-xxx');
// -> Permission

const created = await client.permissions.create({
  tenantId: 'tenant-001',
  roleCode: 'finance-manager',
  userIds: ['u-001', 'u-002'],
  resourceCode: 'finance.voucher',
  action: 'write',
  effect: 'allow',
});
// -> Permission[] （userIds 批量创建时返回多条）

const updated = await client.permissions.update('perm-uuid-xxx', { effect: 'deny' });
// -> Permission

await client.permissions.delete('perm-uuid-xxx');
// -> void (204)

// ===== 批量操作 =====
const batchResult = await client.permissions.batchCreate([
  { tenantId: 'tenant-001', roleCode: 'r1', userIds: ['u-1'], resourceCode: 'r', action: 'read', effect: 'allow' },
  { tenantId: 'tenant-001', roleCode: 'r1', userIds: ['u-2'], resourceCode: 'r', action: 'write', effect: 'allow' },
]);
// -> { success: true, created: number, failed: FailedItem[] }

await client.permissions.batchDelete(['perm-1', 'perm-2', 'perm-3']);
// -> { success: true, deleted: number, failed: FailedItem[] }

// ===== 导出 / 导入 =====
await client.permissions.exportToFile({
  format: 'json',          // 'json' | 'csv'
  filePath: './perms.json',
  tenantId: 'tenant-001',
});
// 浏览器版本返回 Blob / ArrayBuffer，不写本地文件

const imported = await client.permissions.importFromFile({
  filePath: './perms.csv', // 或浏览器 new File(...)
  format: 'csv',
  validateOnly: true,      // 仅验证不写入（Dry Run）
});
// -> { validated: number, invalid: InvalidRow[], imported?: number }

// ===== 存储健康 / 指标 =====
const health = await client.permissions.healthCheck();
// -> { status: 'ok' | 'degraded' | 'down', details: {...} }

const metrics = await client.permissions.metrics();
// -> { totalPermissions, lastWriteAt, readQps5m, writeQps5m, dbPoolUsage }
```

### 4.5 auditLogs 子模块（重点：流式 + 压缩导出）

```ts
// 基础查询
const logs = await client.auditLogs.query({
  tenantId: 'tenant-001',
  action: 'permission.create',
  changedBy: 'admin',
  startTime: '2026-08-01T00:00:00+08:00',
  endTime:   '2026-09-01T00:00:00+08:00',
  limit: 100,
});
// -> { entries: AuditLogEntry[], total: number, offset: number, limit: number }

// ===== 导出（小批量）=====
// JSON / CSV / Gzip 三种 format
await client.auditLogs.exportToFile({
  format: 'json',
  filePath: './audit.json',
  tenantId: 'tenant-001',
  limit: 10_000,
});
await client.auditLogs.exportToFile({
  format: 'gzip',             // ← SDK 自动发 Accept，后端返回 .json.gz
  filePath: './audit.json.gz',
  limit: 50_000,
});

// ===== 流式导出（大批量，推荐）=====
// NDJSON 流，SDK 自动按行 yield，适合百万级日志不落盘
const stream = client.auditLogs.exportStream({
  tenantId: 'tenant-001',
  startTime: '2026-01-01T00:00:00Z',
});

// Node 用法：for await 消费，每一行一个对象
let count = 0;
for await (const entry of stream) {
  count++;
  if (entry.action === 'permission.delete') processEntry(entry);
}
console.log(`共处理 ${count} 条`);

// 浏览器用法：直接拿到 ReadableStream<AuditLogEntry> 交给 UI 层
const browserStream: ReadableStream<AuditLogEntry> = stream.asReadableStream();
```

**SDK 内部对 NDJSON 流的处理要点**：
1. 请求头设置 `Accept: application/x-ndjson`；
2. 收到 `Body`（chunked）后用 **文本解码器 + 行分割器** 流式切分；
3. 每行 `JSON.parse()` 为 `AuditLogEntry` 并 `yield`；
4. 行解析失败抛 `TopemsStreamParseError`（含行号和原始行）。

### 4.6 retention 子模块（保留策略）

```ts
const policy = await client.retention.getPolicy();
// -> RetentionPolicy { retentionDays, archiveEnabled, archivePath, batchSize, cleanupIntervalHours }

const updated = await client.retention.updatePolicy({
  retentionDays: 180,
  archiveEnabled: true,
  archivePath: '/var/topems/audit_archives',
});

// 手动触发一次清理
const result = await client.retention.triggerCleanup({
  retentionDays: 120,  // 可选：临时覆盖，仅本次生效
  batchSize: 5000,
});
// -> CleanupResult { success, deletedCount, archivedCount, cutoffTime, error }

const stats = await client.retention.stats();
// -> RetentionStats { totalLogs, olderThanRetentionDays, archiveFiles, archiveSizeBytes }
```

### 4.7 retentionTask 子模块（清理任务控制）

```ts
const status = await client.retentionTask.status();
// -> { running: boolean, lastCleanupAt, lastDeletedCount, intervalHours, controllerReady }

await client.retentionTask.start();
await client.retentionTask.stop();
```

### 4.8 exportTask 子模块（导出任务控制）★ 高频使用

```ts
// 1. 查看配置
const cfg = await client.exportTask.getConfig();
// -> { intervalSecs, batchSize }  默认 86400s / 500

// 2. 调整为每小时导一次
await client.exportTask.updateConfig({ intervalSecs: 3600, batchSize: 250 });

// 3. 立即跑一次（不等下一轮调度）
const run = await client.exportTask.triggerOnce();
// -> ExportRunResult { success, exported, archived, windowStart, error }

// 4. 后台调度控制
await client.exportTask.start();
await client.exportTask.stop();

// 5. 查看运行状态
const st = await client.exportTask.status();
// -> { running, intervalSecs, lastExportCount, lastExportAt, controllerReady }

// ===== 便捷封装：启动 + 等待首次完成 + 停（运维脚本用）=====
const oneShotResult = await client.exportTask.runOnce({
  config: { intervalSecs: 3600, batchSize: 250 },  // 可选
  waitFirstDone: true,       // triggerOnce 前是否等后台任务启动后首次完成
  stopAfterDone: false,      // 完成后是否停掉后台
});
```

---

## 5. Python SDK 详细设计

### 5.1 安装

```bash
pip install topems-business-tools
# private PyPI 或 git+https:
# pip install git+https://github.com/paulwy/TOPEMS.git#subdirectory=sdk/python
```

### 5.2 初始化

```python
from topems_business_tools import TopemsBusinessToolsClient

client = TopemsBusinessToolsClient(
    base_url="https://topems.example.com/api/business-tools",
    access_token=os.environ["TOPEMS_ACCESS_TOKEN"],
    timeout=30.0,
    max_retries=3,
)
```

底层使用 `requests.Session`（同步），并提供 `TopemsBusinessToolsAsyncClient`（`httpx.AsyncClient`，异步）。

### 5.3 与 TS SDK 方法一一对应

方法签名、返回 dataclass 字段全部与 TS 版本对齐，降低跨语言心智负担。

**典型差异点**：
- Python 的流式导出使用 **生成器（generator）**：`for entry in client.audit_logs.export_stream(...):`
- 导出到文件使用 `pathlib.Path` 或字符串路径；
- 批量操作返回 `pydantic.BaseModel`（Python 3.10+ Pydantic v2）。

```python
# 流式导出：百万级日志流式处理，内存占用 < 1MB
count = 0
for entry in client.audit_logs.export_stream(tenant_id="tenant-001"):
    count += 1
    if entry.action == "permission.delete":
        send_to_siem(entry)  # 例如对接 SIEM
print(f"processed {count}")
```

### 5.4 CLI 一层薄封装（可选，V0.2 规划）

```bash
topems-audit export-stream --tenant-id tenant-001 \
  --start-time 2026-01-01 --format ndjson \
  | jq -c 'select(.action == "permission.delete")' \
  > deletes.ndjson

topems-export-task trigger-once --format pretty-json
# {
#   "success": true,
#   "exported": 1024,
#   "archived": 1024,
#   "window_start": "2026-08-31T14:30:00+08:00"
# }
```

---

## 6. 数据流图（典型场景）

### 场景 A：运维每周审计日志归档 + 合规上报

```
┌─────────────────────────────┐
│  CRON（每周末 02:00 UTC+8）  │
└──────────────┬──────────────┘
               ▼
┌───────────────────────────────────────────────────┐
│  python script (或 Node 脚本)                      │
│  client.export_task.trigger_once()                 │
│    └─> POST export/task/trigger → 后端增量导出     │
│  client.audit_logs.exportToFile(format="gzip")    │
│    └─> GET export?format=gzip → audit.json.gz     │
│  scp audit.json.gz compliance-server:/inbox/       │
│  client.export_task.updateConfig(batchSize=1000)   │
└───────────────────────────────────────────────────┘
```

### 场景 B：审计日志接入 SIEM（安全信息与事件管理）

```
      ┌──────────────────────┐
      │   SIEM (Splunk/ELK)  │
      └───────────▲──────────┘
                  │ Logstash input → NDJSON
                  │
┌─────────────────┴─────────────────────┐
│  常驻 Daemon（Python / Node）          │
│  while True:                           │
│    for entry in client.audit_logs.     │
│       export_stream(window=last_5m):   │
│       siem.send(entry)                 │
│    sleep(300)                          │
└────────────────────────────────────────┘
```

---

## 7. 测试策略

### 7.1 单元测试（纯 Mock，无需真实后端）

| 测试点 | 覆盖 |
|--------|------|
| Base URL 拼接 + Header 注入 | 所有方法正确拼接 `permissions/*`、`audit-logs/*` 等路径，Authorization 正确 |
| TopemsApiError 映射 | 400/401/403/404/409/422/500 分别映射为合理 code |
| 超时与重试 | 幂等 GET 重试 3 次；POST 写入默认不重试；可配置 |
| NDJSON 行切分 | 单个 chunk 含多行 / 一行跨多个 chunk / 空行 / 损坏 JSON 行的异常 |
| gzip 解压 | gzip format 响应 SDK 侧自动解压到 JSON 字符串（可选） |

Mock 方式：
- TS：`msw`（Mock Service Worker）或直接传自定义 `fetchImpl`。
- Python：`responses` / `respx`（httpx 版本）。

### 7.2 集成测试（需要真实 unified-core + MockAuditLogStore）

Docker Compose 起 unified-core（用 `MOCK_STORE=true` 启动），SDK 跑完整流程：
1. 创建 100 条权限；
2. 批量删除 30 条 → 查询审计日志；
3. 触发一次导出任务 → triggerOnce 成功；
4. 下载 NDJSON 流 → 行数校验。

---

## 8. 版本与兼容性

- SDK 版本号严格 [SemVer 2.0](https://semver.org/lang/zh-CN/)：
  - `MAJOR`：后端 REST API 不兼容变更（如路径大改、字段改名、返回结构完全变）。
  - `MINOR`：新增方法 / 新增可选参数 / 性能改进（向后兼容）。
  - `PATCH`：bug fix / 文档 / 测试。
- 对后端端点版本兼容：SDK 内置 `minimum_backend_version`，启动时 `GET /health` 验证，版本低于支持范围时警告或报错。

---

## 9. 发布路径（V0.1 → V1.0 路线图）

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| V0.1 Draft（本文档） | 架构设计 + API 草稿 | 本 Markdown |
| V0.2 TS 实现 | permissions + auditLogs（含 NDJSON 流）+ exportTask 4 个子模块骨架 + 单元测试 | `packages/sdk-ts/` 源码 + vitest 覆盖率 ≥ 70% |
| V0.3 Python 实现 | TS V0.2 能力同步到 Python | `sdk/python/` 源码 + pytest 覆盖率 ≥ 70% |
| V0.4 集成测试 | Docker Compose 跑 unified-core mock 端到端 | `sdk/tests/integration/` + CI job |
| V0.5 内部试用 | 在 TOPEMS 运维脚本 / 数据管道中试用 2 周，收集反馈 | 修复 bug + 补缺失便捷方法 |
| V1.0 正式发布 | 文档站（API Reference + 示例 + Best Practices）+ 发布到私有 npm / PyPI | release tag V1.0 + 公告 |

---

## 10. 风险与依赖

| 项 | 说明 | 缓解 |
|----|------|------|
| 后端端点变更 | unified-core 路由改动可能导致 SDK 路径不一致 | SDK 集成测试在 CI 里每次运行 |
| 流式端点 SSE / chunked 行为差异 | 不同反向代理（nginx / envoy）可能缓冲 chunk | 文档中声明「SDK 要求代理允许 Transfer-Encoding: chunked / 响应无缓冲」 |
| 鉴权方式扩展（OAuth2 刷新 Token） | V0.1 只支持静态 Bearer Token | V0.3 增加 `tokenProvider: () => Promise<string>` 钩子，支持自动刷新 |
| 浏览器端 CORS | 直接从前端调用可能被 CORS 拦 | 推荐架构：后端 BFF 层代理 / 或网关配置 `/api/business-tools/*` CORS 白名单 |

---

## 附录 A：最小可用 TS 示例（伪代码，V0.2 落地）

```ts
// 每周审计日志自动导出 + 上传到对象存储
import { TopemsBusinessToolsClient } from '@topems/business-tools-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new TopemsBusinessToolsClient({
  baseUrl: process.env.TOPEMS_BASE_URL!,
  accessToken: process.env.TOPEMS_TOKEN!,
});
const s3 = new S3Client({});

async function weeklyAuditArchive() {
  // 1. 立即导一次
  const run = await client.exportTask.triggerOnce();
  if (!run.success) {
    console.error('导出失败', run.error);
    process.exit(1);
  }

  // 2. 拿 gzip 压缩文件（小批量直接落盘，大批量用流）
  const dateTag = new Date().toISOString().slice(0, 10);
  const localPath = `./audit_${dateTag}.json.gz`;
  await client.auditLogs.exportToFile({
    format: 'gzip',
    filePath: localPath,
    startTime: run.windowStart, // ← 增量窗口，不重复导
  });

  // 3. 上传 S3 合规桶
  const buf = require('fs').readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: 'topems-compliance-audit',
    Key: `weekly/${dateTag}.json.gz`,
    Body: buf,
    ServerSideEncryption: 'AES256',
  }));
  console.log(`✅ 本周审计日志归档完成，导出 ${run.exported} 条`);
}

weeklyAuditArchive();
```

---

> **状态标记**：Draft · 待后续版本评审实现路径与工时估算
