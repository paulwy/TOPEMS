# V14.0 生产就绪与智能增强计划

> 版本: V14.0 规划
> 日期: 2026-07-21
> 基线: V13.1 文档/配置清理完成，综合健康评分 100/100
> 目标: 从「功能完整」升级为「生产可用 + 智能驱动」

---

## 一、现状与问题

V13.1 完成后，TOPEMS 在代码质量、插件化架构、多租户隔离、路由统一等维度已达到较高水平。但根据 [后端API vs 前端功能 对比分析报告](../reports/backend-frontend-gap-analysis.md) 与 [架构分析与优化方案](../reports/architecture-review-20260714.md)，仍存在以下核心缺口：

| 问题域 | 严重模块 | 核心表现 |
|--------|---------|---------|
| 业务闭环缺失 | `manufacturing`、`erp`、`shared` | 前端 API 覆盖率分别仅为 2%、14%、0%，页面有框架但无数据对接 |
| 服务间流程割裂 | MES/ERP/WMS/QMS/LIMS | 生产订单、物料发放、质量拦截等跨服务流程未自动化 |
| API 路径二元性 | rs/doc/gis/ai/mobile/portal/finance | 仍使用 `/{service}` 挂载，与 K8s Ingress 契约不一致 |
| AI 能力孤立 | `svc/ai` | 多为独立工具调用，未嵌入业务场景 |
| 可观测性不足 | monitor/unified-core | 日志、链路、指标未统一，难以满足生产 SLA |
| 工程效率瓶颈 | CI/tests | E2E 缺失、构建时间长、API 契约依赖手工维护 |

---

## 二、总体目标

在 2026-09-30 前完成以下目标：

1. **业务闭环**：关键缺失模块前端 API 覆盖率 ≥80%，MES↔ERP↔WMS↔QMS/LIMS 核心流程自动联动。
2. **API 契约统一**：所有服务路径统一为 `/api/core/{service}/v1/*`，生成统一 OpenAPI 文档。
3. **AI 智能增强**：报表助手、流程助手、异常预警三类智能体上线。
4. **可观测性**：统一日志、链路追踪、指标监控三件套可用。
5. **工程效率**：核心业务流程 E2E 覆盖，CI 构建时间减少 ≥40%。

---

## 三、分阶段实施方案

### Phase 1：业务闭环补齐（P0，07-21 ~ 08-15）

#### 1.1 manufacturing 模块前端 API 补齐

- **范围**: `apps/web/src/api/mfg/`、`apps/web/src/pages/mes/`
- **目标**: 覆盖率从 2% 提升至 ≥80%
- **关键 API**:
  - 生产订单: `listProductionOrders`, `createProductionOrder`, `publishProductionOrder`, `startProductionOrder`, `completeProductionOrder`, `cancelProductionOrder`
  - 工艺流程: `listProcesses`, `createProcess`, `updateProcess`, `getProcessById`
  - 设备管理: `listEquipment`, `createEquipment`, `updateEquipmentStatus`
  - 工位管理: `listWorkStations`, `createWorkStation`
  - 生产记录: `listProductionRecords`, `createProductionRecord`
- **验收**: 生产订单全流程页面可用， manufacturing 模块在 gap 分析报告中变绿

#### 1.2 ERP 核心功能前端实现

- **范围**: `apps/web/src/pages/erp/`、`apps/web/src/api/erp/`
- **目标**: 财务报表、凭证、预算、费用、资产、车辆、公告页面可用
- **关键页面**:
  - 资产负债表 / 利润表 / 现金流量表
  - 凭证录入 / 审核 / 过账
  - 预算编制 / 执行分析
  - 资产台账 / 折旧
  - 车辆调度 / 公告发布
- **验收**: ERP 模块覆盖率从 14% 提升至 ≥80%

#### 1.3 shared/common 服务前端对接

- **范围**: `apps/web/src/api/shared/`、`apps/web/src/pages/shared/`
- **目标**: 消除 16 个页面的 API 调用缺口
- **关键能力**:
  - 通用附件 / 评论 / 收藏
  - 统一通知订阅
  - 全局搜索前端对接
- **验收**: shared 模块覆盖率从 0% 提升至 ≥80%

#### 1.4 跨服务流程自动化

| 流程 | 触发点 | 联动服务 | 实现位置 |
|------|--------|---------|---------|
| MES→ERP 生产订单同步 | MES 生产订单状态变更 | ERP 工单/成本中心 | `svc/integration` + 事件总线 |
| WMS→MES 物料发放 | WMS 出库单确认 | MES 工单领料 | `svc/integration` + 事件总线 |
| MES→WMS 成品入库 | MES 生产完成 | WMS 入库单 | `svc/integration` + 事件总线 |
| QMS/LIMS→MES 质量拦截 | 检验结果不合格 | MES 停产/返工 | `svc/integration` + 事件总线 |

---

### Phase 2：API 契约统一收口（P0，07-21 ~ 08-10）

#### 2.1 服务路径统一

- **目标**: 所有服务挂载路径改为 `/api/core/{service}/v1`
- **待改造服务**:
  - `svc/rs` → `/api/core/rd/v1`
  - `svc/doc` → `/api/core/doc/v1`
  - `svc/gis` → `/api/core/gis/v1`
  - `svc/ai` → `/api/core/ai/v1`
  - `svc/mobile` → `/api/core/mobile/v1`
  - `svc/portal` → `/api/core/portal/v1`
  - `svc/finance` → `/api/core/finance/v1`
- **前端同步**:
  - 更新 `apps/web/src/config/runtime.ts`
  - 删除所有非 `/api/core/{service}/v1` 的兼容映射
  - 更新 Vite 代理配置

#### 2.2 统一 OpenAPI 文档

- **工具**: `utoipa` + `scripts/openapi/generate.sh`
- **目标**: 生成 27 个服务的统一 `openapi.yaml`
- **发布**: 集成到 CI，每次 PR 自动校验文档一致性

#### 2.3 API 契约测试

- **工具**: Pact / 自定义契约测试
- **范围**: `tests/contract/`
- **目标**: 核心链路契约测试 ≥30 条
- **重点链路**:
  - 登录 → 获取菜单 → 访问页面
  - 创建生产订单 → 下发 → 开工 → 完工
  - 采购申请 → 审批 → 下单 → 入库

---

### Phase 3：AI 智能增强（P1，08-01 ~ 08-31）

#### 3.1 AI 报表助手

- **范围**: `apps/web/src/components/ai/AiReportAssistant.tsx`、`svc/ai`
- **能力**:
  - 自然语言输入 → SQL/OLAP 查询生成
  - 自动选择图表类型并渲染
  - 支持保存为自定义报表
- **示例**: "近 30 天 MES 各产线合格率趋势"

#### 3.2 流程审批助手

- **范围**: `svc/flow`、`svc/ai`
- **能力**:
  - 根据流程内容推荐审批人
  - 风险标签自动识别（金额、供应商黑名单、历史逾期）
  - 审批意见生成建议

#### 3.3 生产异常预警

- **范围**: `svc/mes`、`svc/monitor`、`svc/ai`
- **能力**:
  - 设备传感器时序数据异常检测
  - 预测性维护建议
  - 异常自动触发工单和通知

#### 3.4 AI 知识库助手

- **范围**: `apps/web/src/pages/ai/`、`svc/ai`
- **能力**:
  - 基于企业内部文档（帮助中心、操作手册）的问答
  - 代码片段 / 配置模板推荐

---

### Phase 4：可观测性与 SLA（P1，08-10 ~ 09-10）

#### 4.1 统一结构化日志

- **范围**: `lib/src/telemetry.rs`、所有服务
- **要求**:
  - JSON 格式输出
  - 包含 `trace_id`、`request_id`、`tenant_id`、`user_id`
  - 生产环境禁用 debug 日志

#### 4.2 分布式链路追踪

- **工具**: OpenTelemetry + Jaeger/Tempo
- **范围**: 全链路（前端 → API Gateway → 各微服务 → 数据库）
- **部署**: `docker/otel-collector.yml`

#### 4.3 业务指标大盘

- **范围**: `svc/monitor`、`apps/web/src/pages/monitor/`
- **指标**:
  - 核心服务 QPS / P95 延迟 / 错误率
  - 业务指标：订单量、库存周转、质检合格率
  - 资源指标：CPU / 内存 / 数据库连接池

#### 4.4 告警与 SLO

- **范围**: `svc/monitor`、通知中心
- **要求**:
  - P0/P1 指标异常自动通知
  - 定义关键服务 SLO（可用性 ≥99.9%，P95 延迟 <500ms）
  - 前端 SLO/SLA 看板

---

### Phase 5：工程效率与持续交付（P1，08-15 ~ 09-30）

#### 5.1 E2E 测试基座

- **工具**: Playwright
- **范围**: `tests/e2e/`
- **覆盖**:
  - 登录流程
  - 生产订单创建到完工
  - 采购申请到入库
  - 质量检验到不合格处理
  - 报表生成与导出

#### 5.2 API 集成测试补强

- **范围**: `tests/integration/`
- **目标**: 核心 CRUD 流程测试 ≥50 条
- **要求**: 使用真实数据库容器，覆盖多租户场景

#### 5.3 CI 构建缓存

- **工具**: sccache、pnpm store、Docker layer cache
- **目标**: Rust/TS 构建时间减少 ≥40%
- **范围**: `.github/workflows/`

#### 5.4 Bundle 分析与预算

- **范围**: `apps/web/vite.config.ts`
- **要求**:
  - 设置 bundle size 阈值告警
  - 首屏 chunk 大小预算

#### 5.5 数据库迁移自动化校验

- **范围**: `scripts/migration/`
- **要求**:
  - CI 自动检查迁移脚本幂等性
  - 迁移前后 schema diff 校验

---

### Phase 6：安全与合规收尾（P2，09-01 ~ 09-30）

#### 6.1 多租户隔离覆盖率 100%

- **范围**: `database/migrations/`、`svc/unified-core/middleware`
- **目标**: 剩余 2.7% 未覆盖表补全 `tenant_id` + RLS

#### 6.2 敏感数据审计日志

- **范围**: `svc/unified-core/modules/audit/`
- **要求**: 登录、权限变更、敏感操作留痕，支持查询与导出

#### 6.3 API 限流与防重放

- **范围**: `lib/src/middleware/rate_limit.rs`
- **要求**: 核心接口启用限流，关键写操作防重放

#### 6.4 依赖安全扫描

- **工具**: cargo audit、npm audit
- **范围**: CI
- **目标**: 高危漏洞 0

---

## 四、验收硬条件

| AC 编号 | 验证项 | 验证方法 | 责任 |
|--------|-------|---------|------|
| **AC-1** | 业务闭环关键模块覆盖率 ≥80% | 更新 [backend-frontend-gap-analysis.md](../reports/backend-frontend-gap-analysis.md) 后 manufacturing/erp/shared 变绿 | CI + 手工 |
| **AC-2** | 所有服务路径统一为 `/api/core/{service}/v1` | `grep -R "internal_base\|mount" svc/*/src/main.rs` 无 `/api/{service}` 残留 | CI |
| **AC-3** | OpenAPI 统一文档生成成功 | `scripts/openapi/generate.sh` 退出码 0 | CI |
| **AC-4** | 核心链路 E2E 测试通过 | `npx playwright test tests/e2e/critical-path.spec.ts` | CI |
| **AC-5** | 可观测性三件套可用 | Grafana/Tempo/Loki 能查询到端到端 trace 和日志 | 手工 |
| **AC-6** | 编译与类型零错误 | `cargo check --workspace`、`tsc --noEmit` | CI |

---

## 五、风险与应对

| 风险 | 级别 | 应对措施 |
|------|------|---------|
| 业务闭环改造涉及服务多，回归风险高 | 🔴 高 | 每个流程改造先写契约测试，灰度发布 |
| 路径统一影响前端所有 API 调用 | 🔴 高 | 分服务逐步切，保留双轨过渡一周 |
| AI 功能训练数据不足 | 🟡 中 | 先基于规则 + 少量样本，后续迭代模型 |
| 可观测性引入额外性能开销 | 🟡 中 | 采样率配置，生产环境 1% 采样 |
| CI 构建缓存配置复杂 | 🟢 低 | 参考成熟方案，先试点再推广 |

---

## 六、参考文档

- [架构分析与优化方案 2026-07-14](../reports/architecture-review-20260714.md)
- [后端API vs 前端功能 对比分析报告](../reports/backend-frontend-gap-analysis.md)
- [V5.4 架构深化与类型统一实施计划](../reports/v5.4-architecture-deepening-plan.md)
- [V5.5 架构修复计划](../reports/v5.5-architecture-fix-plan.md)
- [V5.6 性能优化计划](../reports/v5.6-performance-optimization-plan.md)
- [路由统一与删除 /v1 实施计划](./2026-07-15-route-unification-contract.md)
