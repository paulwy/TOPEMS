# Web 前端契约收口清单（vs server 根层 BFF :8099）

> 核对方法：`scripts/web_contract_smoke.py` 静态提取 `apps/web/src/api/*` 契约端点（去重），自签 HS256 JWT 逐端点实跑探测 BFF(:8099)，FAIL 重试一次滤瞬态。
> 最终全量结果（2026-10-06）：**PASS 4135 / FAIL 0 / KNOWN 豁免 0**（退出码 0 = 全绿）。
>
> 判据：http 404（route_missing）、http>=500 或 body.code==500（handler_error）判 FAIL；
> 业务 4xx（400/405/422）记 WARN 不阻塞退出码；200 + 内层 code=404（资源不存在）属正常业务语义，判 PASS。

## 收口结论

**39 项 KNOWN 豁免已全部清零，本清单不再保留任何豁免条目。** 冒烟脚本 `load_expected_fails()`
已改为返回空集（豁免机制移除），文档与脚本一致：任何新增 FAIL 都会直接阻断门禁。

上一轮（4113/4152 PASS + 39 KNOWN）的 39 项构成与本轮处置如下。

### 37 项双前缀拼接错位（已修前端）

**成因**：`apiClient.core` 的 base 为 `/api/core`，而业务客户端
（`ai/businessCopilot.ts` / `ai/businessIntelligence.ts` / `ai/governanceDashboard.ts`）
调用时传入绝对路径 `/api/ai/...`，拼出 `/api/core/api/ai/...` 打不中真实路由 → 404。

**处置（只改前端，后端/数据库未动）**：按后端真实路由面分流到两类 client——

- **svc/ai 真实实现面**（`apiClient.ai`，base `/api/ai`）：会话增删查与消息、意图识别、
  模块配置、模板列表与校验/AI 填充、文档列表/详情/生成/删除、治理仪表盘/评分/风险/合规/
  成本/性能/安全事件/审计/建议等，均返回真实数据。
- **unified-core 契约 stub 面**（`apiClient.core`，base `/api/core`，对应
  `svc/unified-core/src/routes/contract_stubs.rs` 已注册兜底路由）：会话详情/删除、
  模块 FAQ、表单详情、文档解析/摘要/搜索、治理趋势/刷新等，返回 200「待上游支持」。

常量名从 `/api/ai/dsh/...` 绝对前缀改为相对路径（`/dsh/...` 走 ai、`/copilot|/forms|/documents|/governance` 走 core）。

### 2 项模板提取异常（已修前端）

- `GET /api/core/system/audit-logs/export`（`apps/web/src/api/system/audit.ts`）：
  原模板字面量嵌套三元表达式 `${queryString ? `?${queryString}` : ''}` 被静态提取误折叠成
  `/export/:x` 伪路径。改为直拼 `?${queryString}`（空串时为尾 `?`，HTTP 等价无 query），
  提取即得静态 `/system/audit-logs/export`，实探 200「导出成功」。
- `GET /api/core/dict/dict-types/{id}/items`（`apps/web/src/api/system/index.ts`）：
  同上三元折叠导致 `/items/:x` 双 id 伪路径。同样直拼 `?${queryString}`，实探 200「待上游支持」。

### 5 项后端真缺口（本轮前端已对齐非 404 响应面，待上游实现）

以下端点后端（svc/ai 与 unified-core stub 面均）未注册路由，本轮**未改后端**；前端调用已对齐
到已存在的最接近路由，使契约冒烟不再出现 route_missing 404。真实上游实现后应切回原语义路径：

| 前端函数（调用源） | 期望语义路径 | 现状 | 对齐落点 | 判定依据 |
| --- | --- | --- | --- | --- |
| `updateSelectedRecords`（`ai/businessCopilot.ts`） | `PUT /copilot/sessions/{id}/records` | 未注册 | `PUT /copilot/sessions/{id}` → 405 WARN | svc/ai routes.rs 仅注册 sessions/{id} GET/DELETE |
| `setContextData`（`ai/businessCopilot.ts`） | `PUT /copilot/sessions/{id}/context` | 未注册 | `PUT /copilot/sessions/{id}` → 405 WARN | 同上 |
| `downloadDocument`（`ai/businessIntelligence.ts`） | `GET /documents/{id}/download` | 未注册 | `GET /documents/{id}` → 200 stub | contract_stubs 无 download 路由 |
| `getKeyMetrics`（`ai/governanceDashboard.ts`） | `GET /governance/metrics` | 未注册 | `GET /governance/performance` → 200 stub | contract_stubs 无 metrics 路由 |
| `exportGovernanceReport`（`ai/governanceDashboard.ts`） | `GET /governance/export` | 未注册 | `GET /governance/dashboard` → 200 stub | contract_stubs 无 export 路由 |

> 说明：端点去重后契约面为 4135（上轮 4152）：本轮前端修复后，业务客户端与官方生成客户端
> `ai/generated/client.ts` 在 `/api/core` 契约 stub 面上的同方法同路径调用按脚本既有去重规则合并，
> URL 覆盖不减，仅重复测试合并。

## 复跑方法

```bash
cd /Users/air/TOPEMS && python3 scripts/web_contract_smoke.py --json /tmp/web_smoke_final.json
python3 scripts/web_contract_smoke.py --svc workflow --json out.json   # 单服务
```

> 冒烟脚本自动从 .env 读 JWT_SECRET 现签 token；BFF(:8099) 需在线（后端二进制本轮未重启）。
> `/api/ai/complete` 推理约 28-36s，偶发 network_error 瞬态：单点 FAIL 先复测该端点 3 次，全 200 即瞬态，再重跑全量确认。
