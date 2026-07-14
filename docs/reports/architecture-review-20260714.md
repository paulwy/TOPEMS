# TOPEMS 架构分析与优化方案 - 2026-07-14

> 版本: V6.0 架构审查 | 分析日期: 2026-07-14
> 基于 V5.14.0 合并后代码库（含路由重构 + 权限增强 + react-query 迁移）
> 健康评分: 84/100（较 V5.4 的 86 分下降 2 分，因合并引入的架构二元性问题）

---

## 总览

| 维度 | 状态 | 评分 |
|------|------|------|
| 1. 兼容系统残留 | ⚠️ 存在多处 | 70 |
| 2. 前后端对齐 | ⚠️ 部分对齐 | 72 |
| 3. Mock 数据 | ✅ 少量受控 | 85 |
| 4. 核心/插件界限 | ❌ 严重模糊 | 55 |
| 5. 模块完整性 | ⚠️ 参差不齐 | 75 |
| 6. 四端完善度 | ⚠️ Web 强其余弱 | 65 |
| 7. 系统管理/字典 | ✅ 基本全面 | 82 |
| 8. 辅助功能 | ✅ 基础齐全 | 78 |
| 9. 目录结构 | ⚠️ 可优化 | 72 |
| 10. 其他 | ⚠️ 多项待补 | 70 |

---

## 1. 兼容系统残留

### 1.1 现状

| 遗留项 | 位置 | 影响 |
|--------|------|------|
| v2 路由目录 | [apps/web/src/routes/v2/](file:///Users/air/TOPEMS/apps/web/src/routes/v2/) | 路由迁移已完成，v2 目录应清理或合并 |
| WebSocket 旧路径 | [unified-core/src/main.rs:330-339](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs#L330-L339) | 注释 "Legacy paths for backward compatibility" |
| 服务路径向后兼容 | [runtime.ts:73-88](file:///Users/air/TOPEMS/apps/web/src/config/runtime.ts#L73-L88) | notification/im/mail→communication、mes/pdm→manufacturing 等兼容映射 |
| Desktop 独立实现 | [apps/desktop/src/App.tsx](file:///Users/air/TOPEMS/apps/desktop/src/App.tsx) | 与 Web 完全割裂的简化实现，属遗留架构 |
| **unified-core 业务模块越界** | [unified-core/src/main.rs:2172-2562](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs#L2172-L2562) | **最严重**：ERP/HRM/CRM/WMS/Finance 在 unified-core 和独立 svc 中双重实现 |

### 1.2 核心问题：架构二元性

unified-core 同时承载了：
- **核心模块**（正确）：iam、flow、file、communication、tenant、billing、plugin、sync、dict、help、migration
- **业务模块**（越界）：erp、hrm、crm、wms、finance — 这些在 [svc/erp](file:///Users/air/TOPEMS/svc/erp/src/main.rs)、[svc/hrm](file:///Users/air/TOPEMS/svc/hrm/src/main.rs) 等独立服务中也有完整实现

前端 [runtime.ts:52-54](file:///Users/air/TOPEMS/apps/web/src/config/runtime.ts#L52-L54) 将 erp/hrm/crm/wms 指向 `/api/core/*/v1`（unified-core），导致独立服务路由（`/erp/*`）无人调用。

### 1.3 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | 消除 unified-core 业务模块越界 | 从 unified-core 移除 erp/hrm/crm/wms/finance 模块，前端改指向独立服务 |
| P1 | 清理 v2 路由目录 | 确认迁移完成后删除 [routes/v2/](file:///Users/air/TOPEMS/apps/web/src/routes/v2/) |
| P1 | 清理 WebSocket 旧路径 | 将 legacy WS 路由迁移到正式 communication 模块 |
| P2 | 清理 runtime.ts 兼容映射 | 移除 notification/im/mail 等向后兼容路径，统一用 communication |

---

## 2. 前后端对齐

### 2.1 服务路径对齐矩阵

| 服务 | 前端路径 | 后端挂载路径 | 后端类型 | 对齐状态 |
|------|---------|-------------|---------|---------|
| iam | `/iam` | unified-core `/api/core/iam` | 核心服务 | ⚠️ 路径差异 |
| flow/workflow | `/api/core/flow/v1` | unified-core | 核心服务 | ✅ 对齐 |
| communication | `/api/core/comm/v1` | unified-core | 核心服务 | ✅ 对齐 |
| **erp** | `/api/core/erp/v1` | unified-core `/api/core/erp/v1` + 独立 `/erp/*` | **双重** | ❌ 冲突 |
| **hrm** | `/api/core/hrm/v1` | unified-core + 独立 | **双重** | ❌ 冲突 |
| **crm** | `/api/core/crm/v1` | unified-core + 独立 | **双重** | ❌ 冲突 |
| **wms** | `/api/core/wms/v1` | unified-core + 独立 | **双重** | ❌ 冲突 |
| **finance** | `/finance` | unified-core + 独立 `/finance` | **双重** | ❌ 冲突 |
| scm | `/api/core/scm/v1` | 独立 `/api/core/scm/v1` | 独立服务 | ✅ 对齐 |
| srm | `/api/core/srm/v1` | 独立 `/api/core/srm/v1` | 独立服务 | ✅ 对齐 |
| pdm | `/api/core/pdm/v1` | 独立 `/api/core/pdm/v1` | 独立服务 | ✅ 对齐 |
| rs | `/rs` | 独立 `/rs` | 独立服务 | ✅ 对齐 |
| doc | `/doc` | 独立 `/doc` | 独立服务 | ✅ 对齐 |
| gis | `/gis` | 独立 `/gis` | 独立服务 | ✅ 对齐 |
| ai | `/ai` | 独立 `/ai` | 独立服务 | ✅ 对齐 |
| mobile | `/mobile` | 独立 `/mobile` | 独立服务 | ✅ 对齐 |
| portal | `/portal` | 独立 `/portal` | 独立服务 | ✅ 对齐 |

### 2.2 路径前缀不统一

存在三种路径前缀模式：
- `/api/core/{service}/v1/*` — unified-core 及部分独立服务（scm/srm/pdm）
- `/{service}/*` — 独立服务（rs/doc/gis/ai/mobile/portal/finance）
- `/api/core/{service}/v1/*` 兼容映射 — mes/pdm/qms/lims/ehs/bi/report

**违反项目硬约束**：*"API paths must be unified with the format `/api/core/{service}/v1/*`"*（[project_memory.md](file:///Users/air/.trae-cn/memory/projects/-Users-air-TOPEMS/project_memory.md)）

### 2.3 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | 统一所有服务路径前缀 | 全部改为 `/api/core/{service}/v1/*`，修改 rs/doc/gis/ai/mobile/portal/finance 的挂载路径 |
| P0 | 消除 erp/hrm/crm/wms/finance 双重实现 | 前端统一指向独立服务，移除 unified-core 中的业务模块 |
| P1 | 统一 iam 路径 | 前端 iam 从 `/iam` 改为 `/api/core/iam/v1` |

---

## 3. Mock 数据

### 3.1 现状

| Mock 文件 | 内容 | 触发条件 | 评估 |
|-----------|------|---------|------|
| [mock/search.ts](file:///Users/air/TOPEMS/apps/web/src/mock/search.ts) | 15 条模拟搜索结果 | `VITE_USE_MOCK=true` 或开发环境无 API | 受控降级 |
| [mock/plugin.ts](file:///Users/air/TOPEMS/apps/mock/plugin.ts) | 模拟插件市场数据 | 同上 | 受控降级 |
| [apps/mobile/src/mock/](file:///Users/air/TOPEMS/apps/mobile/src/mock/) | 移动端 mock（task/approval 等） | 开发环境 | 受控降级 |

`shouldUseMock()` 守卫逻辑合理，生产环境不会触发。

### 3.2 代码中的临时标记

- [pages/pdm/](file:///Users/air/TOPEMS/apps/web/src/pages/pdm/) 多个 TODO（PdmFormulaPage、PdmStepPage）
- [components/ai/](file:///Users/air/TOPEMS/apps/web/src/components/ai/) 部分组件未完成

### 3.3 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P1 | 实现全局搜索后端 | 新增 unified-core 搜索聚合 API，替换 search mock |
| P2 | 清理 PDM 模块 TODO | 完善 PdmFormulaPage/PdmStepPage 实现 |
| P2 | 清理 AI 组件 TODO | 完善 FloatingAIHelper/AIToolsPanel |

---

## 4. 核心模块与插件模块界限

### 4.1 界限严重模糊

**前端** [v2/index.ts:184-216](file:///Users/air/TOPEMS/apps/web/src/routes/v2/index.ts#L184-L216) 的 `coreModuleCodes` 将**全部 31 个模块**都列为核心：

```
iam, admin, workflow, notification, doc, report, monitor, integration, ai,
mobile, hrm, finance, crm, mes, qms, lims, ehs, scm, erp, wms, pm, pdm,
srm, oa, lowcode, rs, asset, plugin, im, bi, gis
```

**后端** 所有 [plugin.yaml](file:///Users/air/TOPEMS/svc/erp/plugin.yaml) 都标记 `plugin_type: "business"`（包括 erp/hrm/crm 等）。

**矛盾**：前端把所有模块当核心（不可卸载），后端全部标为业务（可卸载）。

### 4.2 正确的核心/插件划分

依据项目约束（*"核心模块默认包含不可卸载；ERP/PM 基础功能入核心，高级功能在专业套件"*）：

| 分类 | 模块 | 说明 |
|------|------|------|
| **核心（不可卸载）** | iam, admin, workflow, communication, file, tenant, billing, plugin, sync, dict, help, migration | unified-core 内的非业务模块 |
| **核心轻量版** | erp（基础）, pm（基础）, oa（轻量）, mobile | 基础功能随核心提供 |
| **业务插件** | hrm, crm, wms, mes, qms, lims, ehs, scm, srm, pdm, rs, finance, doc, ai, gis, analytics, monitor, integration | 通过插件市场安装 |

### 4.3 数据互联互通

| 机制 | 实现 | 状态 |
|------|------|------|
| 多租户 tenant_id | [lib/src/tenant.rs](file:///Users/air/TOPEMS/lib/src/tenant.rs) + [unified-core/middleware/tenant_rls.rs](file:///Users/air/TOPEMS/svc/unified-core/src/middleware/tenant_rls.rs) | ✅ 完整 |
| RLS 行级安全 | [lib/src/rls.rs](file:///Users/air/TOPEMS/lib/src/rls.rs) `RlsMiddleware` | ✅ 独立服务已启用（如 [svc/erp/main.rs:444-447](file:///Users/air/TOPEMS/svc/erp/src/main.rs#L444-L447)） |
| 权限校验 | [lib/src/permission.rs](file:///Users/air/TOPEMS/lib/src/permission.rs) `require_permission` | ✅ 完整 |
| 跨模块集成 | [svc/integration/](file:///Users/air/TOPEMS/svc/integration/src/main.rs) mes_erp_sync、mes_qms_integration | ✅ 实际实现 |
| 服务注册 | ERP 服务 [auto_register_to_core](file:///Users/air/TOPEMS/svc/erp/src/main.rs#L473-L476) | ✅ 自动注册 |
| 消息总线 | [lib/src/event/](file:///Users/air/TOPEMS/lib/src/event/) + RabbitMQ | ✅ 基础设施存在 |

**问题**：[database/postgres/init.sql](file:///Users/air/TOPEMS/database/postgres/init.sql) 中的表（production_plans、supply_chain_orders 等）**缺少 tenant_id 字段**，违反硬约束。

### 4.4 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | 修正 coreModuleCodes | 前端只保留真正核心模块，业务模块移入插件列表 |
| P0 | 修正 plugin.yaml 分类 | 核心模块（iam/flow/comm等）的 plugin_type 改为 "system" |
| P0 | init.sql 补 tenant_id | 所有业务表加 tenant_id 字段 |
| P1 | 移除 unified-core 业务越界模块 | erp/hrm/crm/wms/finance 从 unified-core 移除 |

---

## 5. 模块前后端功能完整性

### 5.1 后端服务实现深度

| 服务 | main.rs | 路由数 | 模块化 | 实现深度 |
|------|---------|--------|--------|---------|
| unified-core | 2850 行 | 200+ | ✅ modules/ | 完整（含越界业务模块） |
| ai | 2155 行 | 50+ | ✅ | 完整（QA/文档/向量搜索） |
| analytics | 1093 行 | 30+ | ✅ | 完整（BI/报告/预测） |
| gis | 588 行 | 20+ | ✅ | 完整 |
| erp | 482 行 | 40+ | ✅ modules/ | 完整（生产/销售/物料/财务/凭证/资产/车辆/会议室） |
| scm | ~82 行 | 7 | ✅ mrp | 基础 |
| srm | ~70 行 | 5+ | ✅ | 基础（新合并：bidding/quotation/po） |
| crm/hrm/qms/wms/mes/pdm/pm/lims/ehs | 75-95 行 | 5-8 | ✅ | 基础（每服务仅1-2个子模块） |
| rs/doc/finance/mobile/monitor/portal | 55-70 行 | 4-5 | ✅ | 基础 |

### 5.2 前端模块覆盖

前端声明 31 个模块，但后端缺少对应服务的：
- `oa`（办公自动化）— 无后端服务
- `lowcode`（低代码）— 无后端服务
- `asset`（资产管理）— 在 erp 内，无独立服务
- `bi`/`report` — 后端为 analytics，命名不一致

### 5.3 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | 移除前端无后端的模块配置 | oa/lowcode/asset 若无计划实现则从前端移除 |
| P1 | 统一 bi/report → analytics 命名 | 前端模块名与后端服务名对齐 |
| P1 | 充实基础服务 | crm/hrm/qms 等服务仅 1-2 子模块，需扩展 |
| P2 | 如需 oa/lowcode 则新建后端服务 | 明确产品规划后实施 |

---

## 6. 四端完善度

| 端 | 实现状态 | 路由/页面 | 评估 |
|----|---------|----------|------|
| **Web** | 完善 | 动态路由 + 31 模块 + 插件系统 + Module Federation | 95% |
| **Desktop** | 遗留套壳 | 仅 6 路由（dashboard/hr/crm/erp/reports/settings），独立 store/layout | 30% |
| **Mobile** | 框架完成 | React Native + AppNavigator + PushService | 50% |
| **Docs-center** | 静态站点 | HTML 文档站，与 docs/ 重叠 | 40% |

**Desktop 端问题最严重**：[apps/desktop/src/App.tsx](file:///Users/air/TOPEMS/apps/desktop/src/App.tsx) 是用 Tauri 重写的简化版，与 Web 完全割裂，缺少 IAM/工作流/文件/通知等所有核心功能。

### 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | Desktop 改为 Web 套壳 | 使用 Tauri 加载 Web 端，而非独立实现 |
| P1 | Mobile 补充核心页面 | 补充审批/通知/文档等页面 |
| P2 | docs-center 合并到 docs/ | 统一文档体系，消除重叠 |

---

## 7. 系统管理与字典库

### 7.1 系统管理功能清单

| 功能 | 后端 | 前端 | 状态 |
|------|------|------|------|
| 用户管理 | unified-core/modules/iam/user | [UserManagementPage](file:///Users/air/TOPEMS/apps/web/src/pages/iam/UserManagementPage.tsx) | ✅ |
| 角色管理 | unified-core/modules/iam/role | IAM 模块页 | ✅ |
| 权限管理 | unified-core/modules/iam/permission | IAM 模块页 | ✅ |
| 租户管理 | unified-core/modules/tenant | [TenantManagementPage](file:///Users/air/TOPEMS/apps/web/src/pages/admin/TenantManagementPage.tsx) | ✅ |
| 审计日志 | [lib/src/audit.rs](file:///Users/air/TOPEMS/lib/src/audit.rs) + 中间件 | [AuditLogPage](file:///Users/air/TOPEMS/apps/web/src/pages/admin/AuditLogPage.tsx) | ✅ |
| 系统配置 | flow/settings | [SystemSettingsPage](file:///Users/air/TOPEMS/apps/web/src/pages/admin/SystemSettingsPage.tsx) | ✅ |
| 插件管理 | unified-core/modules/plugin | admin 模块 | ✅ |
| 数据字典 | unified-core/modules/dict | admin 模块 | ✅ |
| **菜单管理** | 未发现 | 未发现 | ❌ 缺失 |
| **登录日志** | 未独立 | 未独立 | ❌ 缺失 |
| **在线用户** | 未发现 | 未发现 | ❌ 缺失 |

### 7.2 字典库充实度

[seed.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/dict/seed.rs) 预置了 **44 种字典类型**，覆盖：

| 类别 | 字典类型 | 数量 |
|------|---------|------|
| 通用 | common_status、boolean、gender、user_type | 4 |
| 审批/优先级 | approval_status、priority | 2 |
| 订单 | purchase_order_status、sales_order_status、order_type | 3 |
| 库存 | inventory_operation_type | 1 |
| CRM | customer_level、opportunity_stage | 2 |
| HRM | employee_status、contract_type | 2 |
| 通知/插件 | notification_type、plugin_status、plugin_type | 3 |
| 权限 | data_permission_level、operation_permission_type | 2 |
| 系统 | log_level、language、timezone、date_format、time_format、number_format | 6 |
| 文件/操作 | file_type、operation_type | 2 |
| 财务 | payment_method、invoice_type、asset_type、cost_type、financial_period、report_type | 6 |
| 项目/任务 | project_status、task_status | 2 |
| 文档 | document_type | 1 |

**评估**：字典库**充实度良好**（85%），但存在以下问题：
1. [svc/erp/src/models/dict.rs](file:///Users/air/TOPEMS/svc/erp/src/models/dict.rs) 中混入了数据库迁移管理结构（DbChange、DbColumnDefinition、AddColumnRequest 等），**职责混乱**
2. 部分业务模块的状态码仍硬编码在代码中，未关联字典
3. [database/postgres/init.sql](file:///Users/air/TOPEMS/database/postgres/init.sql) 中 status 字段使用字符串字面量，未与字典关联

### 7.3 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P1 | 新增菜单管理 | 后端 unified-core 新增 menu 模块，前端新增菜单管理页面 |
| P1 | 新增登录日志 | 审计日志中增加 login 类型分类，或独立登录日志表 |
| P1 | 拆分 erp/dict.rs | 将数据库迁移结构移到 erp/modules/migration/ |
| P2 | 业务状态码关联字典 | 将 init.sql 中硬编码状态值改为引用字典 |

---

## 8. 辅助功能

| 功能 | 后端 | 前端 | 状态 |
|------|------|------|------|
| **帮助中心** | unified-core/modules/help（FAQ + Guide CRUD） | [api/help.ts](file:///Users/air/TOPEMS/apps/web/src/api/help.ts) + help 模块 | ✅ 完整 |
| **全局搜索** | ❌ 无后端聚合 API | [useGlobalSearch.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useGlobalSearch.ts) + mock 降级 | ⚠️ 依赖 mock |
| **AI 辅助** | [svc/ai](file:///Users/air/TOPEMS/svc/ai/src/main.rs)（2155 行，QA/文档/向量搜索） + [lib/src/ai_client/](file:///Users/air/TOPEMS/lib/src/ai_client/) + [ollama_client.rs](file:///Users/air/TOPEMS/lib/src/ollama_client.rs) | [components/ai/](file:///Users/air/TOPEMS/apps/web/src/components/ai/) 多组件 | ✅ 完整 |
| **通知系统** | unified-core/modules/communication（notification + im + mail + ws） | 通信模块 | ✅ 完整 |
| **工作流** | unified-core/modules/flow（15 子模块） | workflow 模块 | ✅ 非常完整 |
| **监控** | [svc/monitor](file:///Users/air/TOPEMS/svc/monitor/src/main.rs)（基础） + [lib/src/monitoring.rs](file:///Users/air/TOPEMS/lib/src/monitoring.rs) + [metrics.rs](file:///Users/air/TOPEMS/lib/src/metrics.rs) | monitor 模块 | ⚠️ 基础 |

### 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P1 | 全局搜索后端 | unified-core 新增 search 聚合 API，跨模块搜索 |
| P2 | 监控服务增强 | svc/monitor 扩展性能分析、告警功能 |
| P2 | AI 组件完善 | 清理 FloatingAIHelper/AIToolsPanel 的 TODO |

---

## 9. 目录结构与命名优化

### 9.1 命名不一致

| 问题 | 现状 | 建议 |
|------|------|------|
| `svc/` vs `services` | 目录名 svc/，配置名 services.yaml/conf | 保持 svc/，配置同步 |
| `rs` 歧义 | rs = 研发管理（R&D），易与 Rust 混淆 | 改为 `rd` 或 `research` |
| `analytics` vs `bi` vs `report` | 后端 analytics，前端 bi/report | 统一为 analytics |
| `portal` vs `admin` | 后端 portal，前端 admin | 明确职责或合并 |

### 9.2 目录职责重叠

| 重叠组 | 问题 | 建议 |
|--------|------|------|
| `docs/` vs `docs-center/` | docs/ 为 Markdown，docs-center/ 为静态 HTML | 合并为 docs/，用工具生成静态站 |
| `deploy/` vs `docker/` vs `k8s/` | 三套部署配置 | deploy/ 留通用脚本，docker/ 和 k8s/ 明确为容器编排 |
| `database/` vs 运行时建表 | init.sql 仅 8 表，实际 schema 运行时创建 | 提取迁移脚本到 database/migrations/ |
| `scripts/` vs `tools/` | 两工具目录 | 合并为 scripts/ |

### 9.3 遗留文件

- [fix_sql_multi.py](file:///Users/air/TOPEMS/fix_sql_multi.py) 和 [fix_sql_multiple.py](file:///Users/air/TOPEMS/fix_sql_multiple.py) — 遗留临时脚本，应删除
- `docs/roadmap.md` 和 `docs/reports/roadmap.md` — 重复

### 9.4 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P1 | 删除遗留临时脚本 | 删除 fix_sql_*.py |
| P1 | 合并 docs/ 和 docs-center/ | 统一文档体系 |
| P2 | 重命名 rs → rd | 消除歧义 |
| P2 | 统一 analytics/bi/report 命名 | 前端模块名对齐后端 |
| P2 | 合并 scripts/ 和 tools/ | 减少目录碎片 |

---

## 10. 其他需补充完善的方面

### 10.1 数据库 Schema 治理

**严重问题**：[database/postgres/init.sql](file:///Users/air/TOPEMS/database/postgres/init.sql) 只有 8 张表且全部**缺少 tenant_id**，实际 schema 由 unified-core 各模块运行时创建。导致：
- 数据库初始化脚本不可信
- 违反"所有业务表必须含 tenant_id 并通过 RLS"的硬约束
- 无法通过 SQL 文件了解完整数据模型

### 10.2 默认管理员密码硬编码

[unified-core/modules/iam/mod.rs:417](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/mod.rs#L417) 硬编码 admin 密码哈希（admin123），且 [mod.rs:390-398](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/mod.rs#L390-L398) admin 角色权限引用了**不存在的权限码**（如 `iam:users_read`，实际权限码是 `iam:read`）。

### 10.3 权限码格式不一致

- unified-core 用两段式：`iam:read`、`erp:write`
- [erp/plugin.yaml](file:///Users/air/TOPEMS/svc/erp/plugin.yaml#L13-L15) 用三段式：`erp:asset:read`
- iam admin 角色用了不存在的：`iam:users_read`

### 10.4 插件代理路径不匹配

[unified-core/main.rs:2663-2752](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs#L2663-L2752) 的 `plugin_proxy` 处理 `/api/plugins/{plugin_code}/*`，但前端调用 `/api/core/{service}/v1/*`，路径不匹配。

### 10.5 API 路由参数格式

[svc/erp/src/main.rs:168](file:///Users/air/TOPEMS/svc/erp/src/main.rs#L168) 使用 `:id` 格式，但项目约束要求 axum v0.8.x 用 `{id}` 格式。unified-core 已用 `{id}`，独立服务需统一。

### 10.6 测试覆盖

- lib/tests/ 仅 6 个测试文件
- unified-core 作为最核心服务，**无独立测试目录**

### 10.7 优化方案

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | init.sql 补 tenant_id | 所有业务表加 tenant_id |
| P0 | 修复权限码不一致 | 统一为两段式 `module:action` |
| P0 | 修复路由参数格式 | 独立服务 `:id` → `{id}` |
| P1 | 提取迁移脚本 | 运行时建表语句提取到 database/migrations/ |
| P1 | 修复 admin 默认密码 | 首次启动强制改密，移除硬编码 |
| P2 | 补充 unified-core 测试 | 新增 svc/unified-core/tests/ |

---

## 优先级总览

### P0 — 架构阻断级（立即处理）

1. 消除 unified-core 业务模块越界（erp/hrm/crm/wms/finance）
2. 修正 coreModuleCodes 核心/插件分类
3. init.sql 补 tenant_id，修复多租户违规
4. 统一权限码格式（两段式）
5. 统一路由参数格式（`{id}`）
6. 统一 API 路径前缀（`/api/core/{service}/v1/*`）

### P1 — 重要改进（近期处理）

7. Desktop 改为 Web 套壳
8. 全局搜索后端实现
9. 新增菜单管理/登录日志
10. 清理 v2 路由目录和兼容映射
11. 删除遗留临时脚本
12. 充实基础服务（crm/hrm/qms 等仅 1-2 子模块）
13. 拆分 erp/dict.rs 职责
14. 修复 admin 默认密码硬编码

### P2 — 持续优化（逐步处理）

15. 合并 docs/ 和 docs-center/
16. 重命名 rs → rd
17. 统一 analytics/bi/report 命名
18. 监控服务增强
19. 补充 unified-core 测试
20. 业务状态码关联字典
21. Mobile 端补充核心页面
