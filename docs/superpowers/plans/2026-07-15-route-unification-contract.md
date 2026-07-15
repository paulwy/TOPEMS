# 路由统一与删除不必要 /v1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一 TOPEMS 全栈前后端 + 部署层 + Vite 代理层的 API 路由格式，**删除所有不必要的 `/v1` 路径段**，确保 runtime.ts / vite.config.ts / main.rs / K8s ingress / Nginx 五路 100% 对齐，消除当前混杂的 7 种路由风格导致的 404/401 问题。

**Architecture:** 以 **Kubernetes Ingress 生产部署配置**（[ingress.yaml](file:///Users/air/TOPEMS/k8s/base/ingress.yaml)）作为唯一权威的路由契约：
- **core 虚拟服务**（unified-core 进程承载，共用 8000 端口）：`/api/core/{svc}/{path}`
- **独立进程服务**（各有独立 deployment/port）：`/api/{svc}/{path}`
- **基础设施路径**：`/health`、`/metrics`、`/api`、`/ws/{module}/...`、`/api/plugins/...`
- 完全**不含 `/v1`**；通过"双轨注册（新路径 + 旧路径 alias 指向同一 handler）"平滑迁移

**Tech Stack:** React + Vite 5 + TypeScript 5, Rust Axum 0.8, Kubernetes Nginx Ingress, Docker Nginx, Axios

---

## 0. 背景证据与风险分析

### 0.1 当前混杂的 7 种路由风格（调研于 2026-07-15）

| 编号 | 路由风格示例 | 使用方 | 是否含 /v1 | 是否符合 K8s Ingress |
|------|-------------|-------|-----------|----------------------|
| A | `/api/core/iam/v1/auth/login` | [runtime.ts services.iam](file:///Users/air/TOPEMS/apps/web/src/config/runtime.ts#L51) + 刚修的 [unified-core/main.rs](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs#L312) | 是 ❌ | 路径对但多了 /v1 ❌ |
| B | `/api/pm/projects`（无 /core，无 /v1） | [svc/pm/modules/project.rs](file:///Users/air/TOPEMS/svc/pm/src/modules/project.rs#L80-L91) 业务路由 | 否 ✅ | `/api/pm/...` ✅ 匹配 ingress |
| C | `/api/v1/auth/login` + `/api/v1/health/detailed`（无服务名，无 /core） | [pm/auth.rs](file:///Users/air/TOPEMS/svc/pm/src/modules/auth.rs#L68-L73)，[erp 健康检查](file:///Users/air/TOPEMS/svc/erp/src/main.rs#L144-L146)，[hrm](file:///Users/air/TOPEMS/svc/hrm/src/main.rs#L122)，[mes](file:///Users/air/TOPEMS/svc/mes/src/main.rs#L93) | 是 ❌ | 不匹配（服务名消失）❌ |
| D | `/api/core/hrm/v1/employees`（有 /core，有 /v1） | [hrm/modules/department.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/department.rs#L16-L21)，[hrm 全模块](file:///Users/air/TOPEMS/svc/hrm/src/modules/salary_adjustment.rs) | 是 ❌ | 多 /core + /v1 ❌（ingress 是 `/api/hrm`） |
| E | `/api/core/iam/login`（无 /v1，无版本） | [apps/desktop/src/api/iam.ts](file:///Users/air/TOPEMS/apps/desktop/src/api/iam.ts#L23-L25) | 否 ✅ | `/api/core/iam/...` ✅ 正确（iam 是 core 虚拟服务） |
| F | Vite 代理多层 rewrite：`/iam/api/iam/auth/ → /api/core/iam/auth/` 不带 v1 + `/api/core → 8000` 直通 | [vite.config.ts](file:///Users/air/TOPEMS/apps/web/vite.config.ts#L788-L798) | 混用（有的 rewrite 去 v1 有的不去） | 无规范 |
| G | Nginx topems.conf `/api/v1/auth/`、`/api/v1/users/`（无服务名） | [deploy/nginx/topems.conf](file:///Users/air/TOPEMS/deploy/nginx/topems.conf#L168-L200) | 是 ❌ | 不匹配新方案 |

### 0.2 设计契约：K8s Ingress 权威路由表

参考 [ingress.yaml](file:///Users/air/TOPEMS/k8s/base/ingress.yaml#L20-L196) 的 `path` / `rewrite-target: /$2` 语义，最终路由契约：

#### 🎯 Group 1 — 核心虚拟服务（unified-core:8000 承载，Ingress `/api/core/*` 转发）
- `POST /api/core/iam/auth/login`
- `POST /api/core/iam/auth/register`
- `POST /api/core/iam/auth/logout`
- `POST /api/core/iam/auth/refresh`
- `GET  /api/core/iam/users` `GET/POST/PUT/DELETE /api/core/iam/users/{id}`
- `GET  /api/core/iam/roles` ...
- `/api/core/file/**`（文件上传下载）
- `/api/core/flow/**`（工作流）
- `/api/core/comm/**`（邮件/IM/通知）
- `/api/core/mail/**` `/api/core/im/**` `/api/core/notification/**`
- `/api/core/master/**` `/api/core/migration/**`
- `/api/core/plugins/**`（插件注册/健康）

#### 🎯 Group 2 — 独立进程服务（每个有独立 K8s Service，Ingress `/api/{svc}/*` 转发）
| 服务 | 端口 | 前缀规范 |
|------|------|---------|
| erp | 8010 | `/api/erp/**` |
| finance | 8011 | `/api/finance/**` |
| doc | 8012 | `/api/doc/**` |
| ai | 8013 | `/api/ai/**` |
| hrm | 8020 | `/api/hrm/**` |
| pm | 8023 | `/api/pm/**` |
| crm | 8029 | `/api/crm/**` |
| mes | 8030 | `/api/mes/**` |
| pdm | 8031 | `/api/pdm/**` |
| scm | 8040 | `/api/scm/**` |
| wms | 8041 | `/api/wms/**` |
| srm | 8042 | `/api/srm/**` |
| qms | 8050 | `/api/qms/**` |
| lims | 8051 | `/api/lims/**` |
| ehs | 8052 | `/api/ehs/**` |
| rd / rs | 8053 | `/api/rd/**`（前端 config 当前用 rd 键） |
| bi | 8060 | `/api/bi/**` |
| report | 8061 | `/api/report/**` |
| monitor | 8062 | `/api/monitor/**` |
| portal | 8063 | `/api/portal/**` |
| mobile | 8070 | `/api/mobile/**` |
| gis | 8071 | `/api/gis/**` |
| integration | 8072 | `/api/integration/**` |
| analytics | 8060（与 bi 共端口） | `/api/analytics/**`（前端 services.analytics 键） |

#### 🎯 Group 3 — 基础设施 / 统一约定
- `GET /health`（根健康，每个服务都支持）
- `GET /metrics`（Prometheus 指标）
- `GET /api` + `GET /api/info`（返回本服务的 ApiInfo JSON，参考 [lib/src/api_version.rs](file:///Users/air/TOPEMS/lib/src/api_version.rs#L57-L69)）
- `WS  /ws/core/{feature}` `/ws/mes/{feature}` `/ws/bi/{feature}` `/ws/gis/{feature}`
- `GET /api/plugins/info` `GET /api/plugins/health`（每个服务内的插件自描述）
- 健康检查详细版：`GET /api/{svc}/health/detailed`（**不再放 /api/v1/health/detailed**）

### 0.3 风险评估矩阵

| # | 风险项 | 影响等级 | 概率 | 缓解策略 |
|---|--------|---------|------|---------|
| R1 | 删 /v1 后，仍有浏览器旧缓存 / 老客户端直接请求带 v1 路径 | 🔴 High | 高 | **旧路径 alias 双轨注册**至少保留到 V10（旧路径→同一 handler + 响应 `Deprecation` 头） |
| R2 | runtime.ts 的 34 个 services URL 改了后，前端 1000+ API 调用崩？ | 🔴 High | 中 | API 函数用 `apiClient.{svc}.get('/xxx')` 相对路径模式，**只改 baseURL**；跑全部 `__tests__/*-api.test.ts` |
| R3 | 后端 25 个服务一次改完，漏一个模块路由导致 404 | 🟠 Med | 高 | Phase 3 **双轨**：新/旧路径同时注册到同一 handler；逐个服务 `cargo test` |
| R4 | Vite 代理 rewrite 逻辑与新路径冲突（被重写两次） | 🟠 Med | 中 | 写 **单测** + 手工 curl 验证 10 条代表性路径走通；旧路径 rewrite 为新路径而非丢弃 |
| R5 | deploy/nginx/topems.conf 非 K8s 部署（裸机 Docker）仍用 `/api/v1/auth` | 🟠 Med | 中 | 同步新增 `/api/core/**` + `/api/{svc}/**` location，老 `/api/v1/*` 做 rewrite 转义 |
| R6 | apps/desktop 之前直接写死 `/api/core/iam/login`（E 风格），与新契约一致，但 handler 名变了 | 🟢 Low | 低 | 新路径是 Group 1 标准，无影响，后端会注册；只做回归测试 |

---

## 1. 任务分解（Phase 0 ~ Phase 5）

---

## Phase 0 — 规划文档与基线建立（0.5 人天）

### Task 0.1: 锁定权威契约，生成可执行对照表

**Files:**
- Create: `/Users/air/TOPEMS/docs/superpowers/plans/2026-07-15-route-unification-contract.md`（本文件）
- Modify: `/Users/air/TOPEMS/TODO.md`（V9.0 新增"路由统一专项"章节）
- Verify: `/Users/air/TOPEMS/docs/api/*.md`（已有 API 文档的样例路径若错，标注 TODO）

- [ ] **Step 1: 生成服务分类对照表**（Group 1 / Group 2 / Group 3 完整清单）

表格：37 个 services 键逐项列出 → 现有 runtime.ts 默认值 → K8s ingress 对应 path → 新契约默认值 → 分类（Group1/Group2/基础设施/废弃）

- [ ] **Step 2: 在 TODO.md 加入路由统一专项**

在 [TODO.md](file:///Users/air/TOPEMS/TODO.md) "当前健康状态摘要"之后、V6.0 之前插入：

```markdown
## V9.0 专项：路由统一与删除 /v1（P0，2026-07-15 ~ 07-22）⚡ 架构阻断级

> 完整实施方案：[路由统一与删除 /v1 实施计划](./docs/superpowers/plans/2026-07-15-route-unification-contract.md)

| 优先级 | 任务 | 模块/范围 | 当前进度 | 验收标准 |
|--------|------|----------|---------|---------|
| **P0** | Phase 1: 对齐源头配置（runtime + vite + services.yaml + ingress） | config, deploy | 🔲 进行中 | 4 处文件 /{svc} 前缀与 /v1 全部一致 |
| ... |
```

完整 6 Phase + 21 子任务表格原样抄录。

- [ ] **Step 3: 标注 docs/api 文档中的路径问题**

对以下 25 个 API 文档做 grep：若文档内出现 `/v1` 字样，在文档顶部加一个黄色 banner：
```
> 🚨 路由版本过渡中：本文档描述路径含 /v1 为旧格式，新生产路径为（去掉 /v1）。详见 [路由统一计划](../superpowers/plans/2026-07-15-route-unification-contract.md)
```

目标文件：docs/api/{API_AUTH, API_ERP, API_HRM, API_PM, API_CRM, API_MES, API_PDM, API_SCM, API_WMS, API_SRM, API_QMS, API_LIMS, API_EHS, API_RS, API_BI, API_REPORT, API_MONITOR, API_PORTAL, API_AI, API_MOBILE, API_GIS, API_DOC, API_ANALYTICS, API_WORKFLOW, plugins-api}.md

- [ ] **Step 4: 保存本计划到 docs 目录**（Write 已完成）

- [ ] **Step 5: 提交 Phase 0**

```bash
git add TODO.md docs/superpowers/plans/ docs/api/*.md
git commit -m "docs: add V9.0 route unification plan & deprecation banners"
```

---

## Phase 1 — 源头配置对齐（P0，1 人天）：runtime + vite + services.yaml + ingress/nginx

**目标：4 处 source-of-truth 的路径定义完全一致，且不含 /v1**

### Task 1.1: 重写 runtime.ts 37 个 services 默认值

**Files:**
- Modify: `apps/web/src/config/runtime.ts` services 块
- Modify: `apps/desktop/src/api/*.ts`（已写死的 /api/core/iam/login 已对，但要确认其他 endpoint）

`services` 块的最终值如下（Group1 加 /api/core/，Group2 不加 /core/，均无 /v1）：

```typescript
services: {
  // === Group 1: core 虚拟服务（unified-core 承载，8000 端口） ===
  iam:          getEnv('VITE_IAM_SERVICE_URL',          '/api/core/iam'),
  workflow:     getEnv('VITE_FLOW_SERVICE_URL',         '/api/core/flow'),
  file:         getEnv('VITE_FILE_SERVICE_URL',         '/api/core/file'),
  mail:         getEnv('VITE_MAIL_SERVICE_URL',         '/api/core/mail'),
  im:           getEnv('VITE_IM_SERVICE_URL',           '/api/core/im'),
  notification: getEnv('VITE_NOTIFICATION_SERVICE_URL', '/api/core/notification'),
  master:       getEnv('VITE_MASTER_SERVICE_URL',       '/api/core/master'),
  migration:    getEnv('VITE_MIGRATION_SERVICE_URL',    '/api/core/migration'),
  communication:getEnv('VITE_COMMUNICATION_SERVICE_URL','/api/core/comm'),

  // === Group 2: 独立进程服务（独立 deployment/port，/api/{svc}/ 开头） ===
  erp:          getEnv('VITE_ERP_SERVICE_URL',      '/api/erp'),
  finance:      getEnv('VITE_FINANCE_SERVICE_URL',  '/api/finance'),
  doc:          getEnv('VITE_DOC_SERVICE_URL',      '/api/doc'),
  ai:           getEnv('VITE_AI_SERVICE_URL',       '/api/ai'),
  hrm:          getEnv('VITE_HRM_SERVICE_URL',      '/api/hrm'),
  pm:           getEnv('VITE_PM_SERVICE_URL',       '/api/pm'),
  crm:          getEnv('VITE_CRM_SERVICE_URL',      '/api/crm'),
  mes:          getEnv('VITE_MES_SERVICE_URL',      '/api/mes'),
  manufacturing:getEnv('VITE_MANUFACTURING_SERVICE_URL','/api/mes'),
  pdm:          getEnv('VITE_PDM_SERVICE_URL',      '/api/pdm'),
  scm:          getEnv('VITE_SCM_SERVICE_URL',      '/api/scm'),
  wms:          getEnv('VITE_WMS_SERVICE_URL',      '/api/wms'),
  srm:          getEnv('VITE_SRM_SERVICE_URL',      '/api/srm'),
  qms:          getEnv('VITE_QMS_SERVICE_URL',      '/api/qms'),
  qualityAssurance: getEnv('VITE_QUALITY_ASSURANCE_SERVICE_URL','/api/qms'),
  lims:         getEnv('VITE_LIMS_SERVICE_URL',     '/api/lims'),
  ehs:          getEnv('VITE_EHS_SERVICE_URL',      '/api/ehs'),
  rd:           getEnv('VITE_RD_SERVICE_URL',       '/api/rd'),
  bi:           getEnv('VITE_BI_SERVICE_URL',       '/api/bi'),
  analytics:    getEnv('VITE_ANALYTICS_SERVICE_URL','/api/bi'),
  report:       getEnv('VITE_REPORT_SERVICE_URL',   '/api/report'),
  monitor:      getEnv('VITE_MONITOR_SERVICE_URL',  '/api/monitor'),
  portal:       getEnv('VITE_PORTAL_SERVICE_URL',   '/api/portal'),
  mobile:       getEnv('VITE_MOBILE_SERVICE_URL',   '/api/mobile'),
  gis:          getEnv('VITE_GIS_SERVICE_URL',      '/api/gis'),
  integration:  getEnv('VITE_INTEGRATION_SERVICE_URL','/api/integration'),

  // === 顶层辅助服务 ===
  core:         getEnv('VITE_CORE_SERVICE_URL',     '/api/core'),  // 已正确，不变
  jaeger:       getEnv('VITE_JAEGER_SERVICE_URL',   'http://localhost:14268'), // 不变
}
```

注意 6 个 alias 键（manufacturing、qualityAssurance、analytics + workflow/communication/im 等）保持别名，但默认值统一落到 Group1/Group2 主路径上。

- [ ] **Step 1: 替换 runtime.ts services 块**（精确整块替换）

- [ ] **Step 2: 验证 desktop/app（[apps/desktop/src/api/iam.ts](file:///Users/air/TOPEMS/apps/desktop/src/api/iam.ts#L22-L26)）**
  - 路径已是 Group 1 正确风格 `/api/core/iam/login` ✅ 保持
  - 其他潜在硬编码路径（mobile 等）grep 一遍 `/v1`：

```bash
grep -rn "/v1" apps/desktop/src apps/mobile/src 2>/dev/null
```

- [ ] **Step 3: 跑前端类型检查确认**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -5
```

预期：无由 services 改名引发的报错（services key 没变，只改了默认 value）

- [ ] **Step 4: 提交**
```bash
git add apps/web/src/config/runtime.ts apps/desktop/src/api/iam.ts
git commit -m "refactor(config): align 37 service baseURLs to K8s ingress spec, remove /v1"
```

### Task 1.2: 重构 Vite 代理逻辑，新路径直通，旧路径 rewrite 成新路径

**Files:**
- Modify: `apps/web/vite.config.ts` → `services` 列表、`generateServiceProxies`、手动 proxy 表、`createServiceProxyConfig` 的 rewrite 规则

核心改动原则：
1. **新路径 `/api/core/*`** → 全部走 777~781 行已有的 `/api/core → localhost:8000`（不用改，已经正确）
2. **新路径 `/api/{svc}/*`（独立进程）** → 已有 265~269 行的 `/api/{service}` 段，保持不变
3. **旧路径兼容**：
   - `/api/core/{svc}/v1/*` → rewrite 去掉 `/v1` → `target: localhost:8000`（Group1 旧 → 新）
   - `/api/core/{svc}/*`（Group2 之前误塞到 /core 的） → 对 hrm/erp/pm 等 Group2 服务**不要保留 /core**，全部警告并转发
   - `/iam/api/iam/auth/*`、`/iam/auth/*`、`/notification/v1/*` 老路径 → 保留并加 rewrite 到新路径
   - 保留 `/health`、`/unified-core/health`、`/migration/health` 不动

推荐用一个更简单的循环生成 `/api/core/{svc}/v1/` → `/api/core/{svc}/` 的 rewrite（16 个 Group1 虚拟服务），而不是手写。

- [ ] **Step 1: 在 vite.config.ts server.proxy 表 `/api/core` 之前，插入 Group1 旧→新兼容段**

```typescript
// ===== Group1 旧路径 /api/core/{svc}/v1/* -> /api/core/{svc}/* =====
(['iam','flow','file','mail','im','notification','master','migration','comm'] as const).forEach((svc) => {
  proxyConfig[`/api/core/${svc}/v1`] = {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(`/api/core/${svc}/v1`, `/api/core/${svc}`),
    configure: createProxyLogger(`legacy-${svc}`, 'http://localhost:8000'),
  };
});

// ===== Group2 旧路径 /api/core/{svc}/v1/* -> /api/{svc}/*（修正多 /core + /v1） =====
const group2SvcMap: Record<string, number> = {
  erp: 8010, finance: 8011, doc: 8012, ai: 8013, hrm: 8020, pm: 8023, crm: 8029,
  mes: 8030, pdm: 8031, scm: 8040, wms: 8041, srm: 8042, qms: 8050, lims: 8051,
  ehs: 8052, rd: 8053, bi: 8060, report: 8061, monitor: 8062, portal: 8063,
  mobile: 8070, gis: 8071, integration: 8072
};
Object.entries(group2SvcMap).forEach(([svc, port]) => {
  // 旧风格：/api/core/{svc}/v1 -> 新：/api/{svc}/
  proxyConfig[`/api/core/${svc}/v1`] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(`/api/core/${svc}/v1`, `/api/${svc}`),
    configure: createProxyLogger(`legacy-${svc}`, `http://localhost:${port}`),
  };
  // 次旧风格（已无 v1 但仍多 /core）：/api/core/{svc} -> /api/{svc}
  proxyConfig[`/api/core/${svc}/`] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(`/api/core/${svc}`, `/api/${svc}`),
    configure: createProxyLogger(`core-legacy-${svc}`, `http://localhost:${port}`),
  };
});
```

- [ ] **Step 2: 删除两个过期的 IAM 手动 proxy 段**
  - 删除 `/iam/api/iam/auth/` 段（788~793 行）— 不再需要这种特殊前缀
  - 删除 `/iam/auth/` 段（794~799 行）— 同上
  - 若真有老客户端调用，在 上面 Step 1 兼容表中已经处理 `/api/core/iam/v1/`

- [ ] **Step 3: `npm run dev` 启动（或用 curl 验证）**

```bash
# 验证 3 条典型路径：新旧两种都 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/core/iam/auth/login  # POST 405 Method Not Allowed 也行，说明到 handler 了
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/core/iam/v1/auth/login  # 旧→新 rewrite，应该能 405 或 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/pm/projects  # 新 Group2：200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/core/pm/v1/projects  # 旧 Group2+core+v1 → /api/pm/projects → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/core/hrm/v1/departments # 旧 → /api/hrm/departments
```

- [ ] **Step 4: 提交**

```bash
git add apps/web/vite.config.ts
git commit -m "refactor(vite): add legacy path rewrites, remove duplicate iam proxy"
```

### Task 1.3: 确认 K8s ingress 与 services.yaml 已是目标风格

- [ ] **Step 1: Review ingress.yaml**

Ingress 已是无 v1 风格（`/api/core` 与 `/api/{svc}`），无需修改。逐行检查 20~200 行是否覆盖所有 33 个服务：
- ✅ 有 /api/core → unified-core（8000）
- ✅ 有 /api/erp, /api/hrm, /api/pm, /api/crm, /api/mes, /api/pdm, /api/scm, /api/wms, /api/srm, /api/qms, /api/lims, /api/ehs, /api/rs, /api/bi, /api/report, /api/monitor, /api/portal, /api/ai, /api/mobile, /api/gis, /api/integration

缺失列表（若有）需手动补：
- 缺失：`/api/finance`, `/api/doc` → 补充到 ingress

```yaml
# Finance
- path: /api/finance(/|$)(.*)
  pathType: Prefix
  backend:
    service:
      name: finance-service
      port: { number: 8011 }
# Doc
- path: /api/doc(/|$)(.*)
  pathType: Prefix
  backend:
    service:
      name: doc-service
      port: { number: 8012 }
```

- [ ] **Step 2: Review deploy/nginx/topems.conf**

Nginx 现在写的是 `/api/v1/auth/`、`/api/v1/users/`、`/api/v1/employees/` — 全部过时。整体替换为 **按 service 前缀的 location 块**，并在末尾保留 `/api/v1/*` rewrite 段做兼容：

```nginx
# ========== Group 1: Core 虚拟服务 ==========
location /api/core/ {
    proxy_pass http://iam_service;     # iam 指向 unified-core:8000
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
# ========== Group 2: 独立进程服务 ==========
location /api/erp/       { proxy_pass http://erp_service; ...same_headers... }
location /api/hrm/       { proxy_pass http://hrm_service; ... }
location /api/crm/       { proxy_pass http://crm_service; ... }
location /api/pm/        { proxy_pass http://pm_service;  # 需要新增 upstream pm_service，8023 }
location /api/mes/       { proxy_pass http://mes_service; # 新增 upstream 8030 }
location /api/pdm/       { proxy_pass http://pdm_service; # 新增 upstream 8031 }
location /api/scm/       { proxy_pass http://scm_service; # 新增 upstream 8040 }
location /api/wms/       { proxy_pass http://wms_service; # wms 指向 8041（当前 upstream 端口不对要改） }
location /api/srm/       { proxy_pass http://srm_service; # 新增 upstream 8042 }
location /api/qms/       { proxy_pass http://qms_service; # 新增 upstream 8050 }
location /api/lims/      { proxy_pass http://lims_service; # 新增 upstream 8051 }
location /api/ehs/       { proxy_pass http://ehs_service;  # 新增 upstream 8052 }
location /api/rs/        { proxy_pass http://rs_service;   # 新增 upstream 8053 }
location /api/bi/        { proxy_pass http://bi_service;   # 新增 upstream 8060 }
location /api/doc/       { proxy_pass http://doc_service;  # doc 已在 upstream，但 port 对不上，需要单独 upstream 8012 }
location /api/ai/        { proxy_pass http://ai_service;   # ai 目前 upstream 是 8000，改新建 8013 或 8064 }
location /api/monitor/   { proxy_pass http://monitor_service; # 新增 upstream 8062 }
location /api/portal/    { proxy_pass http://portal_service;  # 新增 upstream 8063 }
location /api/mobile/    { proxy_pass http://mobile_service;  # 新增 upstream 8070 }
location /api/gis/       { proxy_pass http://gis_service;     # 新增 upstream 8071 }
location /api/integration/{ proxy_pass http://integration_service; # 新增 upstream 8072 }
location /api/finance/   { proxy_pass http://finance_service;   # 新增 upstream 8011 }
location /api/report/    { proxy_pass http://bi_service;        # 与 bi 共端口 8060/8061 }

# ========== 旧 /api/v1/ 兼容（过渡至少 1 个大版本） ==========
# 猜测 service 映射（不完全但够用）：
#   /api/v1/auth/         → /api/core/iam/auth/
#   /api/v1/users/        → /api/core/iam/users/
#   /api/v1/roles/        → /api/core/iam/roles/
#   /api/v1/permissions/  → /api/core/iam/permissions/
#   /api/v1/employees/    → /api/hrm/employees/
#   /api/v1/departments/  → /api/hrm/departments/
#   /api/v1/health/       → /health（顶层）
location ~ ^/api/v1/(auth|users|roles|permissions|logout|sessions|security-settings|password-policy|reset-password|forgot-password|set-new-password)/(.*)$ {
    rewrite ^/api/v1/(.*)$ /api/core/iam/$1 last;
}
location ~ ^/api/v1/(employees|departments|contracts|attendance|leave|payroll|performance|recruitment|training|salary-adjustments|setup)/(.*)$ {
    rewrite ^/api/v1/(.*)$ /api/hrm/$1 last;
}
# ... 其他服务若有遗留 /api/v1 调用，按模块追加 rewrite 规则

# 顶部也需要新增对应的 upstream 块
upstream pm_service      { server localhost:8023 max_fails=3; keepalive 64; }
upstream mes_service     { server localhost:8030 max_fails=3; keepalive 64; }
upstream pdm_service     { server localhost:8031 max_fails=3; keepalive 64; }
upstream scm_service     { server localhost:8040 max_fails=3; keepalive 64; }
upstream srm_service     { server localhost:8042 max_fails=3; keepalive 64; }
upstream qms_service     { server localhost:8050 max_fails=3; keepalive 64; }
upstream lims_service    { server localhost:8051 max_fails=3; keepalive 64; }
upstream ehs_service     { server localhost:8052 max_fails=3; keepalive 64; }
upstream monitor_service { server localhost:8062 max_fails=3; keepalive 64; }
upstream portal_service  { server localhost:8063 max_fails=3; keepalive 64; }
upstream mobile_service  { server localhost:8070 max_fails=3; keepalive 64; }
upstream gis_service     { server localhost:8071 max_fails=3; keepalive 64; }
upstream integration_service { server localhost:8072 max_fails=3; keepalive 64; }
upstream finance_service { server localhost:8011 max_fails=3; keepalive 64; }
# 修正 wms upstream（原来 8042 → 改为 8041）
upstream wms_service { ip_hash; server localhost:8041 ...; }
```

- [ ] **Step 3: 提交 config/services.yaml 和 deploy/**

```bash
# services.yaml 无需改动，因为它只管端口分配，路径不直接写死在里面
git add k8s/base/ingress.yaml deploy/nginx/topems.conf
git commit -m "feat(deploy): ingress/nginx routes follow unified K8s-style paths"
```

---

## Phase 2 — 前端调用回归验证（P0，0.5 人天）

### Task 2.1: 跑 API 单元测试确认路径构造正确

- [ ] **Step 1: 逐个执行 API 层测试**

```bash
cd apps/web
npm run test -- --run src/api/iam/__tests__/ src/api/pm/__tests__/ src/api/erp/__tests__/ src/api/hrm/__tests__/ src/api/crm/__tests__/ src/api/mes/__tests__/ src/api/wms/__tests__/ src/api/scm/__tests__/ src/api/qms/__tests__/ src/api/lims/__tests__/ src/api/ehs/__tests__/ src/api/rd/__tests__/ src/api/bi/__tests__/ src/api/pdm/__tests__/ src/api/gis/__tests__/ src/api/monitor/__tests__/ src/api/__tests__/ src/api/search/__tests__/ 2>&1 | tail -30
```

预期：全部 PASS（因为测试使用 mock，不会真正发请求；只验证调用函数能正常构造参数）

- [ ] **Step 2: 构造实际 baseURL 拼接单测**

新建 `apps/web/src/config/__tests__/runtime-routes.test.ts` 做一个**硬断言**：确保每个 service 的默认值不含 `/v1`，并与 K8s 契约一致（避免未来被人改回）：

```typescript
import runtime from '../runtime';
import { describe, it, expect } from 'vitest';

const EXPECTED_GROUP1: Record<string, string> = {
  iam: '/api/core/iam', workflow: '/api/core/flow', file: '/api/core/file',
  mail: '/api/core/mail', im: '/api/core/im', notification: '/api/core/notification',
  master: '/api/core/master', migration: '/api/core/migration', communication: '/api/core/comm',
  core: '/api/core',
};
const EXPECTED_GROUP2: Record<string, string> = {
  erp: '/api/erp', finance: '/api/finance', doc: '/api/doc', ai: '/api/ai',
  hrm: '/api/hrm', pm: '/api/pm', crm: '/api/crm', mes: '/api/mes',
  manufacturing: '/api/mes', pdm: '/api/pdm', scm: '/api/scm', wms: '/api/wms',
  srm: '/api/srm', qms: '/api/qms', qualityAssurance: '/api/qms',
  lims: '/api/lims', ehs: '/api/ehs', rd: '/api/rd', bi: '/api/bi',
  analytics: '/api/bi', report: '/api/report', monitor: '/api/monitor',
  portal: '/api/portal', mobile: '/api/mobile', gis: '/api/gis',
  integration: '/api/integration',
};

describe('runtime.ts services 路由契约', () => {
  it('所有 service 路径均不包含 /v1', () => {
    Object.entries(runtime.services).forEach(([k, v]) => {
      if (k === 'jaeger') return;
      expect([k, v]).toSatisfy(([_, val]: any) => !String(val).includes('/v1'));
    });
  });
  it('Group1 核心虚拟服务前缀正确', () => {
    Object.entries(EXPECTED_GROUP1).forEach(([k, expected]) => {
      expect((runtime.services as any)[k]).toMatch(new RegExp(`(^|,)${expected}(/|$|,)`));
    });
  });
  it('Group2 独立进程服务无 /core 前缀', () => {
    Object.entries(EXPECTED_GROUP2).forEach(([k, expected]) => {
      const val: string = (runtime.services as any)[k] ?? '';
      expect(val.startsWith('/api/core')).toBe(false);
      expect(val).toContain(expected);
    });
  });
});
```

- [ ] **Step 3: 提交 & 跑测试**

```bash
npm run test -- --run src/config/__tests__/runtime-routes.test.ts 2>&1 | tail -15
git add apps/web/src/config/__tests__/runtime-routes.test.ts
git commit -m "test(config): lock runtime services routes against K8s contract"
```

---

## Phase 3 — 后端双轨注册（P0，3 人天）：25 个服务同时支持新路径与旧 alias

### 总体规则（适用于每个后端服务）

1. **新路径**：按 Group1/Group2 注册为**第一路由**（直接 handler）
2. **旧路径 alias**：
   - 用 `axum::routing::MethodRouter` 指向同一个 handler 函数
   - 在响应头上加 `Deprecation: true` + `Warning: 299 - "Use /api/xxx without /v1"`
   - 日志打印 `warn!("DEPRECATED route called: {}", uri);`
3. **/api/v1/health/detailed** 旧 health 路径 → **删除**（该路径无服务名，部署层无法转发）；改为 `GET /api/{svc}/health/detailed`（或 Group1 `/api/core/{svc}/health/detailed`）

### Task 3.1: 增强 lib 层的双轨辅助函数

**Files:**
- Modify: `lib/src/api_version.rs`

新增 2 个 API：

```rust
/// 为 Router 注册 "新路径 + 旧 /v1 别名"，同时给旧路径打 Deprecation 响应头和日志
pub fn register_routes_with_legacy_alias<S, M>(
    router: Router<S>,
    new_prefix: &str,       // e.g. "/api/core/iam"
    legacy_prefixes: &[&str], // e.g. &["/api/core/iam/v1", "/api/v1/iam"]
    inner: Router<S, M>,    // 内部子路由（不带前缀）
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    M: Clone + Send + Sync + 'static,
{
    // 新路径：直接 nest
    let mut r = router.nest(new_prefix, inner.clone());
    // 旧别名：加 "deprecation layer"（middleware）后 nest
    for legacy in legacy_prefixes {
        let deprecated = inner
            .clone()
            .layer(axum::middleware::from_fn(deprecation_middleware));
        r = r.nest(legacy, deprecated);
    }
    r
}

async fn deprecation_middleware<B>(
    req: Request<B>,
    next: Next<B>,
) -> impl IntoResponse {
    let uri = req.uri().clone();
    tracing::warn!(target: "route_legacy", "DEPRECATED route called: {}", uri);
    let mut res = next.run(req).await;
    res.headers_mut().insert("Deprecation", HeaderValue::from_static("true"));
    res.headers_mut().insert(
        "Warning",
        HeaderValue::from_static(r#"299 - "Route with /v1 is deprecated, use path without /v1 per K8s ingress spec""#),
    );
    res
}
```

- [ ] **Step 1: 实装 lib/src/api_version.rs 上述函数 + 单测**
- [ ] **Step 2: lib/tests 里加路由别名测试**
- [ ] **Step 3: 提交**

```bash
cd lib && cargo test 2>&1 | tail -15
cd .. && git add lib/src/api_version.rs lib/tests/
git commit -m "feat(lib): add register_routes_with_legacy_alias helper for v1 removal"
```

### Task 3.2: 统一 25 个服务的路由（逐个批处理）

- [ ] **Batch A (Group 1 — 虚拟服务，全部在 unified-core)**

  改 `svc/unified-core/src/main.rs`，把刚加了 `/v1` 的路由（312~355 行，392+ 行）**用辅助函数改成新/旧双轨**：

  ```rust
  let iam_public_inner = Router::new()
      .route("/auth/login", post(modules::iam::auth::login))
      .route("/auth/register", post(modules::iam::auth::register))
      .route("/auth/refresh", post(modules::iam::auth::refresh))
      .route("/auth/forgot-password", post(modules::iam::auth::forgot_password))
      .route("/auth/reset-password", post(modules::iam::auth::reset_password));

  public_routes = register_routes_with_legacy_alias(
      public_routes,
      "/api/core/iam",
      &["/api/core/iam/v1"],
      iam_public_inner
  );
  ```

  相同模式对 IAM 受保护路由（logout/users/roles/permissions）、flow、file、comm/mail/im/notification/master/migration/plugin 都各包一层。

- [ ] **Batch B (Group 2 — 独立进程：ERP / HRM / PM / MES 等 23 个)**

  对每个服务的 main.rs（和 modules/*.rs）执行：
  1. 收集该服务的所有 `.route(...)` 定义（从 grep 导出）
  2. **剥离 `/api/{svc}/v1/` 或 `/api/core/{svc}/v1/` 前缀**，变成仅 `/entity`
  3. 用 `register_routes_with_legacy_alias` 挂到：
     - 新前缀：`/api/{svc}`
     - 旧前缀：`/api/{svc}/v1` + `/api/core/{svc}/v1` + `/api/core/{svc}`（3 个兼容 alias 按需挑）
  4. 健康检查：原 `/api/v1/health/detailed` 改为 `/api/{svc}/health/detailed`，并加旧 alias

  逐个服务执行并 `cargo check`：

```bash
# 示例：HRM
cd svc/hrm && cargo check 2>&1 | tail -10
# 示例：PM（PM 目前已经是 /api/pm/... 新风格，只需要加 alias）
cd svc/pm && cargo check 2>&1 | tail -10
```

- [ ] **Step 3: 整体编译 + 测试 25 个服务**

```bash
cargo check --workspace 2>&1 | tail -40
cargo test --workspace 2>&1 | tail -40
```

- [ ] **Step 4: 提交后端 25 个服务的改动**（建议 4~5 个 commit，按业务域分）

```bash
# commit 1: unified-core Group1
git add svc/unified-core/src
git commit -m "refactor(unified-core): register Group1 routes with dual legacy aliases"

# commit 2: ERM group（erp/finance/doc/ai + hrm/crm/pm）
git add svc/{erp,finance,doc,ai,hrm,pm,crm}/src
git commit -m "refactor(collab+business): Group2 routes unified, legacy aliases added"

# commit 3: Manufacturing（mes, pdm, scm, wms, srm）
git add svc/{mes,pdm,scm,wms,srm}/src
git commit -m "refactor(supply-chain-mfg): Group2 routes unified + legacy aliases"

# commit 4: Quality / Infra（qms, lims, ehs, rd, bi, report, monitor, portal, mobile, gis, integration, analytics）
git add svc/{qms,lims,ehs,rd,bi,report,monitor,portal,mobile,gis,integration,analytics}/src
git commit -m "refactor(qc+infra): remaining 12 services unified + legacy aliases"
```

---

## Phase 4 — 部署层兼容清理（P1，0.5 人天）

### Task 4.1: Nginx / docker / Vite 再收尾

- [ ] **Step 1: docker/nginx.conf（Docker Compose 本地部署）**
  与 topems.conf 同步更新 Group1/Group2 prefix → upstream 映射 + legacy rewrites
- [ ] **Step 2: docker-compose.yml** 中新增未覆盖的服务端口映射（doc 8012、ai 8013、monitor 8062 等）
- [ ] **Step 3: scripts/dev/start-local.sh** 启动命令的端口核对（与 config/services.yaml 一致）

---

## Phase 5 — 验收与回归（P0，1 人天）

### 验收标准（硬条件，必须全部通过才算任务完成）

#### AC-1: 静态契约验证 ✅
- [ ] `apps/web/src/config/__tests__/runtime-routes.test.ts` 100% 通过
- [ ] `npx tsc --noEmit` 前端无由路由改动引发的新报错
- [ ] `cargo check --workspace` 后端全部编译通过
- [ ] `cargo test --workspace` 后端单测至少不减少通过率

#### AC-2: 手工冒烟 — 登录核心链路
- [ ] 打开 `http://localhost:3000/login`
- [ ] 输入 `admin / admin123`（或环境变量配置的账号）
- [ ] Chrome DevTools Network 中：
  - ✅ `POST /api/core/iam/auth/login` **200**，请求 URL 无 `/v1`
  - ✅ `GET /api/core/iam/users/me` **200**
  - ✅ token 被保存到 localStorage

#### AC-3: 手工冒烟 — 9 条代表路径的新/旧双轨都 200（或 handler 级 4xx 方法错/非 404）
用 curl 列一个矩阵：

| 编号 | 新路径（无 v1）预期 | 旧路径（含 v1 / 多余 /core）预期 |
|------|---------------------|----------------------------------|
| 1 | `POST /api/core/iam/auth/login` → 200/401 | `POST /api/core/iam/v1/auth/login` → 响应有 `Deprecation: true` header + 同 body |
| 2 | `GET /api/pm/projects?page=1` → 200 | `GET /api/pm/v1/projects?page=1` → Deprecation header + 同 body |
| 3 | `GET /api/pm/projects?page=1` → 200 | `GET /api/core/pm/v1/projects?page=1` → Deprecation header + 同 body |
| 4 | `GET /api/hrm/employees` → 200 | `GET /api/hrm/v1/employees` → Deprecation + 同 body |
| 5 | `GET /api/hrm/employees` → 200 | `GET /api/core/hrm/v1/employees` → Deprecation + 同 body |
| 6 | `GET /api/erp/sales-orders` → 200 | `GET /api/core/erp/v1/sales-orders` → Deprecation header |
| 7 | `GET /api/wms/inventory` → 200 | `GET /api/wms/v1/inventory` → Deprecation |
| 8 | `GET /api/core/file/xxx` → 200/404（handler）| `GET /api/core/file/v1/xxx` → Deprecation |
| 9 | `GET /api/ai/*` 任一 → 200/404 | `GET /api/core/ai/v1/*` → Deprecation |

#### AC-4: Vite 代理日志检查
- [ ] 启动 `npm run dev` 后，访问上面新路径，Vite 控制台日志显示对应 target（8000/8023/8010/8020...）正确
- [ ] 访问旧路径，看到 `[Vite Proxy] LEGACY-xxx /old -> /new` 的日志输出或最终 target 正确

#### AC-5: 前端 API 测试全绿
- [ ] 所有 `apps/web/src/api/**/__tests__` 通过（≥ 10 modules 覆盖）

#### AC-6: 文档 & Banner 一致性
- [ ] docs/api/ 中涉及路径的 Markdown，顶部都有过渡 banner 或已全部更新为无 v1 示例

---

## 2. 文件改动汇总清单（预计）

| 类别 | 文件数 | 典型路径 |
|------|--------|---------|
| 计划 & Banner 文档 | 26 | TODO.md、docs/superpowers/plans/*、docs/api/*.md |
| 前端 config | 2 | apps/web/src/config/runtime.ts、apps/web/src/config/__tests__/runtime-routes.test.ts |
| Vite 代理 | 1 | apps/web/vite.config.ts |
| 桌面端 API 路径确认 | 2 | apps/desktop/src/api/*.ts（无改动则 0）|
| K8s + Nginx + docker | 4 | k8s/base/ingress.yaml、deploy/nginx/topems.conf、docker/nginx.conf、docker-compose.yml |
| Rust lib 辅助函数 | 1 | lib/src/api_version.rs |
| 后端 main.rs + modules | 25 | svc/*/src/main.rs、svc/*/src/modules/*.rs |
| 测试脚本 | 3 | apps/web 前端 api tests、cargo tests、shell curl 矩阵 |

**合计：约 64 个文件**

---

## 3. 验收 Checklist（执行人 Copy 下面 checklist 逐项打勾）

```
[ ] Phase 0 计划文档生成 & TODO.md 更新
[ ] Phase 1.1 runtime.ts services 37 值一次性对齐 K8s 契约
[ ] Phase 1.2 vite.config.ts 代理添加 Group1/Group2 旧→新 rewrite
[ ] Phase 1.3 K8s ingress 补 finance/doc；Nginx topems.conf 全量重写 + legacy rewrite
[ ] Phase 2 前端 runtime-routes.test.ts 锁契约 + 所有 api tests PASS
[ ] Phase 3.1 lib/src/api_version.rs 双轨辅助函数 + test
[ ] Phase 3.2.A unified-core Group1 双轨注册
[ ] Phase 3.2.B HRM/ERP/PM/CRM 双轨注册
[ ] Phase 3.2.C MES/PDM/SCM/WMS/SRM 双轨注册
[ ] Phase 3.2.D QMS/LIMS/EHS/R&D/BI/Monitor/Portal/Mobile/GIS/Integration/Doc/AI/Analytics/Finance 双轨注册
[ ] Phase 3 cargo check --workspace + cargo test
[ ] Phase 4 docker-compose + scripts/dev/start-local.sh 对齐
[ ] Phase 5 AC-1 ~ AC-6 全部通过
```

