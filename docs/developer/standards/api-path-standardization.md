# TOPEMS API 路径规范与渐进式统一方案（P32-5）

> 生效版本：V65.0+ · 单一信源：`config/services.yaml` + `config/ports.env`
> 负责人：架构组 · 上线前合规模板：`docs/admin/README.md §5 合规表 #7`

---

## 一、现状快照（2026-08-01 · 快照）

当前前后端契约中存在 **3 类前缀并存**：

| 前缀模式 | 服务/来源 | 示例路径 | 占比 | 状态 |
|---------|----------|---------|------|------|
| **A. `/api/core/{svc}/v1/...`** | unified-core 虚拟服务（IAM/Doc/Flow/File/Monitor） | `/api/core/iam/v1/users` | 6 虚拟服务 | ✅ 推荐 · 目标形态 |
| **B. `/api/{svc}/v1/...`** | 20 个独立业务服务（ERP/Finance/MES/…） | `/api/finance/v1/payables` | 20 服务 | ⚠️ 过渡 · 需兼容层 |
| **C. 老扁平 `/api/v1/...`** | 部分 HRM / Report 遗留实现（硬编码路径未升级） | `/api/v1/employees` | ~7 模块 | ❌ 已过时 · 本方案替换 |

**矛盾点**：README 文档描述的推荐形式（A）与当前最多的服务数量形式（B）不一致，Nginx 匹配 2 条正则支持 A + B，但前端调用偶尔出现 404 循环重定向。

---

## 二、最终目标形态（V68.0 收敛）

**所有 27 服务统一使用 A 模式**：`/api/core/{service_code}/v1/{resource}`

```
/api/core/iam/v1/users                    ← unified-core IAM 虚拟
/api/core/finance/v1/payables?page=1      ← 独立 svc/finance 服务
/api/core/ai/v1/qa/predict                ← 独立 svc/ai 服务
/api/core/mes/v1/work-orders/123/start    ← 独立 svc/mes 服务
```

### 2.1 路由映射规则

| service_code | 进程实际监听 | Nginx 路由（内部） | 备注 |
|-------------|-------------|-------------------|------|
| iam / doc / flow / file / monitor / comm | `localhost:8000` | `/api/core/{code}/v1/*` → `http://unified-core:8000/api/core/{code}/v1/$1` | 虚拟共享，无需独立进程 |
| finance / erp / mes / wms / srm / hrm / pm / crm / scm / pdm / qms / lims / ehs / rd / bi / ai / mobile / gis / integration / portal / search / communication / billing / ticket / feedback / master-data （共 26）| `localhost:80XX` | `/api/core/{code}/v1/*` → `http://localhost:80XX/api/{code}/v1/$1` | Nginx rewrite 剥外层 `/api/core`，进程内部保留 B 形态，**业务代码零改动** |

### 2.2 路径组成部分（强制规则）

```
/api/core/{service_code}/v{n}/{resource}[/{id}][/{action}]
        ^^^^^^^^^^^^^^     ^^^  ^^^^^^^^^  ^^^^  ^^^^^^^
        |                  |    |          |     └─ 动作动词（start/cancel/approve…；避免 HTTP tunnel 语义）
        |                  |    |          └──── 可选主键 UUID / 业务编码
        |                  |    └────────────── 资源名词复数（employees、payables、work_orders）
        |                  └─────────────────── 主版本号，只升不回退
        └────────────────────────────────────── 服务唯一标识（= SERVICE_PORTS key）
```

校验清单（PR Gate）：
- [ ] `{service_code}` 必须命中 `SERVICE_PORTS` key（见 `apps/web/src/config/service-ports.ts`）
- [ ] `{resource}` 使用 **kebab-case 复数** 或 **snake_case 复数** 二选一（不可混用同一服务内）
- [ ] 禁止 `/v1/getUsersByRole` 类 RPC 写法；动作放在末尾 `.../roles/{id}/users`
- [ ] 列表分页：query 参数 `page` + `pagesize`（= P1/T1 约定统一）

### 2.3 老扁平 C 模式退役表

| 遗留路径 | 目标路径（统一后） | 兼容层持续至 | 替换里程碑 |
|---------|-------------------|-------------|-----------|
| `/api/v1/employees?page=1` | `/api/core/hrm/v1/employees?page=1` | V69.0 EOL | 本方案发布后 2 个迭代内完成 |
| `/api/v1/departments/...` | `/api/core/hrm/v1/departments/...` | 同上 | HRM V1 重构 |
| `/api/v1/reports/export` | `/api/core/bi/v1/reports/export` | V68.0 | P30 文档已标记 report → BI |
| `/api/v1/{dict,configs,settings}` | `/api/core/iam/v1/dicts/...` | V68.0 | 统一归属于 IAM 主数据 |

---

## 三、渐进式统一路线图（零停机）

### 阶段 1：兼容层开启（V65.0 · 本次 PR 即开）

1. Nginx 增加新 rewrite（**保留旧 A+B 两条**）：
   ```nginx
   location ~ ^/api/core/([a-z0-9-]+)/v1/(.*)$ {
       set $svc $1; set $tail $2;
       # 先命中虚拟服务 → 8000；再命中具体独立服务端口（map 表）
       if ($svc ~ "^(iam|doc|flow|file|monitor|comm)$") {
           proxy_pass http://unified-core:8000/api/core/$svc/v1/$tail;
           break;
       }
       proxy_pass http://svc_$svc/api/$svc/v1/$tail;  # 进程内部剥 /api/core
   }
   ```
2. 前端 `resolveServiceUrl()` 新增 `enable_core_prefix=true` 标志（默认 false，不影响现状）。
3. 单元测试保证双前缀 200 OK（契约测试）。

### 阶段 2：双写切换（V66.0）

1. 前端 axios client + 2 个 plugin axios（即 P31-5 已加固 registry + marketplace）全部默认启用 `enable_core_prefix=true`
2. 后端所有独立服务 `axum` 同时挂载两条路由：
   ```rust
   Router::new()
       .merge(v1_routes())                    // B 形态 /api/{svc}/v1/* （保留 2 迭代）
       .nest("/api/core/:svc/v1", v1_routes())// A 形态 /api/core/{svc}/v1/*
   ```
3. `sync-ports.sh --check` 增加端口 + 前缀同步。

### 阶段 3：旧路径退役（V68.0）

1. 移除 `/api/{svc}/v1` 旧 B 形态挂载
2. Nginx 保留 301 重定向 6 个月，日志统计命中 → 0 后彻底移除
3. C 扁平模式完全移除（5xx 直接回显"路径已升级，请联系管理员"）

---

## 四、前后端契约测试（P33-3 对接入口）

```typescript
// apps/web/__tests__/api-path-contract.test.ts
describe('P32-5 API 路径规范', () => {
  const SERVICES = ['iam','finance','mes','ai','hrm','wms','srm','qms','lims','rd','bi','portal'];
  const REWRITES: Record<string, string> = {
    // A 形态 → 期望 Status 200/401（未登录）
    '/api/core/iam/v1/users?page=1&pagesize=10': 'iam-core',
    '/api/core/finance/v1/payables':            'finance-core',
    // C 遗留 → 期望 301（兼容期）/ 410（退役后）
    '/api/v1/employees': 'hrm-legacy',
  };
});
```

---

## 五、服务端口 × API 前缀 映射（快照）

完整 list 请查 `apps/web/src/config/service-ports.ts` `SERVICE_PORTS` 键值表（本文件不重复，避免两处漂移）。

**更新策略**：新服务注册必须提交 PR 同时修改：
1. `config/ports.env`（新增行 `X_PORT=80YY`）
2. `apps/web/src/config/service-ports.ts`（保持类型安全）
3. `deploy/nginx/topems.conf`（新 `/api/core/<x>/v1/` 条目）
→ `scripts/sync-ports.sh --check` CI 全量校验。
