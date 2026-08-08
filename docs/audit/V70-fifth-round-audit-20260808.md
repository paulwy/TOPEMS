# TOPEMS V70 第五轮深度审计报告

> **审计日期**: 2026-08-08  
> **审计方法**: 静态代码分析 + 编译验证 + 模式匹配扫描  
> **审计范围**: 后端 28 服务 · 前端 427 页 · 核心库 · 数据库层  
> **综合健康分**: **72/100**（V67.1: 62 → V68.0: 100 → V68.1~V69.1: 100 → **V70: 72**）

---

## 📊 审计总览

| 探针维度 | 得分 | 关键发现 |
|---------|------|---------|
| 编译通过性 | 95/100 | QMS 服务导入路径错误（已修复），Portal 有 dead_code 警告 |
| 错误处理 | 45/100 | 673 处 `unwrap()` 跨 20 文件，graphql_schema.rs 有 411 处 |
| SQL 注入防护 | 55/100 | 17 处 `format!` 拼接 SQL，主要在 QMS/ERP/SCM/Analytics |
| 查询效率 | 40/100 | GIS 服务 194 处 `SELECT *` 跨 50 文件 |
| 前端类型安全 | 85/100 | 20 处 `@ts-ignore`，TypeScript 编译通过 |
| 前端代码规范 | 75/100 | 46 处 `console.log` 残留，主要在微前端沙箱模块 |
| 架构一致性 | 70/100 | A4 去门面化迁移尚未完成（V70-1/V70-2） |
| 安全合规 | 90/100 | 审计日志覆盖率 100%，RLS 策略完善 |

---

## 🔴 P0 — 必须立即修复（3 项）

### P0-1 QMS 服务编译失败（已修复 ✅）
- **严重度**: 🔴 P0（阻塞构建）
- **证据**: `cargo check --workspace` 报错：`unresolved import topems_shared::EventPublisher`
- **原因**: A4 去门面化后，`EventPublisher` 从根级 re-export 移至 `event` 子模块，QMS 的 `main.rs` 未更新导入路径
- **修复**: `use topems_shared::{..., event::EventPublisher, ...}` ✅

### P0-2 SQL 注入风险 — `format!` 拼接 SQL（17 处）
- **严重度**: 🔴 P0（安全漏洞）
- **关键位置**:

| 文件 | 行号 | 代码模式 |
|-----|-----|---------|
| [quality_cost.rs](file:///Users/xingzhai/TOPEMS/svc/qms/src/modules/quality_cost.rs#L160) | 160 | `format!("SELECT COUNT(*) FROM qa_quality_costs{}", where_clause)` |
| [quality_standard.rs](file:///Users/xingzhai/TOPEMS/svc/qms/src/modules/quality_standard.rs#L129) | 129 | `format!("SELECT COUNT(*) as total FROM qa_standards{}", where_clause)` |
| [dashboard.rs](file:///Users/xingzhai/TOPEMS/svc/erp/src/modules/dashboard.rs#L36) | 36, 58 | `format!("SELECT COUNT(*) FROM {}", table)` — table 可能来自用户输入 |
| [multidimensional_analysis.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/multidimensional_analysis.rs#L504) | 504 | `format!("SELECT {} FROM analytics_data LIMIT 100", select_clause)` |
| [supplier_delivery_appointment.rs](file:///Users/xingzhai/TOPEMS/svc/scm/src/modules/supplier_delivery_appointment.rs#L283) | 283, 319, 529, 638, 750, 858, 963 | 7 处使用 `format!` 拼接 SELECT 语句 |
| [manage.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/file/manage.rs#L386) | 386 | `format!("UPDATE core_files SET {} WHERE id = $1", updates.join(", "))` |
| [wip.rs](file:///Users/xingzhai/TOPEMS/svc/mes/src/modules/wip.rs#L209) | 209 | `format!("SELECT COUNT(*) as total FROM wips w{}", where_clause)` |
| [equipment.rs](file:///Users/xingzhai/TOPEMS/svc/mes/src/modules/equipment.rs#L227) | 227 | `format!("SELECT COUNT(*) as total FROM equipment{}", where_clause)` |
| [team.rs](file:///Users/xingzhai/TOPEMS/svc/mes/src/modules/team.rs#L161) | 161 | `format!("SELECT COUNT(*) as total FROM teams t{}", where_clause)` |
| [mod.rs](file:///Users/xingzhai/TOPEMS/svc/finance/src/modules/mod.rs#L139) | 139 | `format!("SELECT COALESCE(SUM(amount), 0) FROM {} WHERE ...", table)` |

- **风险**: 如果 `table`、`select_clause`、`updates` 等变量来自用户输入或外部 API，可能导致 SQL 注入
- **修复建议**:
  1. 对动态表名使用白名单验证
  2. 使用参数化查询绑定值
  3. 对列名使用 `quote_identifier` 函数
  4. 审计日志追加：记录动态 SQL 的执行

### P0-3 Portal GraphQL 模块 `unwrap()` 泛滥（411 处）
- **严重度**: 🔴 P0（运行时 panic 风险）
- **证据**: [graphql_schema.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/graphql_schema.rs) 单文件 411 处 `unwrap()`
- **高风险位置**:

| 行号 | 代码 | 风险 |
|-----|-----|-----|
| 461, 467, 472 | `self.cache.lock().unwrap()` | 死锁时 panic |
| 557, 564 | `query_plan_cache().lock().unwrap()` | 全局锁竞争时 panic |
| 637, 642, 647, 652, 658 | `federation_stats_internal().lock().unwrap()` | 统计锁竞争时 panic |

- **修复建议**:
  1. 使用 `lock().unwrap_or_else(|e| e.into_inner())` 替代直接 `unwrap()`
  2. 添加超时机制避免长期阻塞
  3. 对短生命周期锁使用 `try_lock()` 返回 `Option`

---

## 🟠 P1 — 重要问题（5 项）

### P1-1 全局 `unwrap()` 使用统计
- **严重度**: 🟠 P1（代码可维护性）
- **统计**: 20 个文件共 673 处 `unwrap()`

| 文件 | unwrap() 数量 | 严重程度 |
|-----|--------------|---------|
| [graphql_schema.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/graphql_schema.rs) | 411 | 🔴 严重 |
| [rate_limiting.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/rate_limiting.rs) | 62 | 🟠 高 |
| [query_governance.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/query_governance.rs) | 31 | 🟠 高 |
| [smart_gateway.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/smart_gateway.rs) | 26 | 🟡 中 |
| [version_logic.rs](file:///Users/xingzhai/TOPEMS/svc/pdm/src/modules/version_logic.rs) | 28 | 🟡 中 |
| [adaptive_execution.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/adaptive_execution.rs) | 19 | 🟡 中 |

- **修复建议**: 分批治理，P0 级（graphql_schema.rs）优先，其余纳入技术债

### P1-2 GIS 服务 `SELECT *` 滥用（194 处）
- **严重度**: 🟠 P1（性能 + 安全）
- **统计**: 50 个文件共 194 处 `SELECT *` 或 `select *`
- **代表位置**:

| 文件 | 行号 | 代码 |
|-----|-----|-----|
| [device.rs](file:///Users/xingzhai/TOPEMS/svc/gis/src/modules/device.rs) | 10 | 多处 `SELECT * FROM ...` |
| [tenant_service.rs](file:///Users/xingzhai/TOPEMS/svc/gis/src/services/tenant_service.rs) | 7 | 多次查询未指定列 |
| [sync.rs](file:///Users/xingzhai/TOPEMS/svc/gis/src/modules/sync.rs) | 4 | 同步接口全量查询 |

- **风险**: 
  1. 选择不需要的列浪费内存和带宽
  2. 表结构变更时容易破坏 API 契约
  3. 可能泄露敏感字段（如 password_hash、deleted_at）
- **修复建议**: 逐个重构为明确列选择

### P1-3 前端 `@ts-ignore`/`@ts-expect-error` 使用
- **严重度**: 🟠 P1（类型安全降级）
- **统计**: 20 个文件共 20 处

| 文件 | 数量 | 用途 |
|-----|-----|-----|
| [design-system/components/index.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/design-system/components/index.tsx) | 1 | 组件类型断言 |
| [useRouteDataLoader.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/bff/useRouteDataLoader.ts) | 1 | BFF 数据加载 |
| 18 个测试文件 | 18 | 测试 mock 类型 |

- **建议**: 优先处理非测试代码中的 `@ts-ignore`，测试代码可接受

### P1-4 前端 `console.log` 残留
- **严重度**: 🟠 P1（生产环境日志污染）
- **统计**: 20 个文件共 46 处

| 类别 | 数量 | 说明 |
|-----|-----|-----|
| 微前端沙箱模块 | 19 | 沙箱隔离/加载日志 |
| AI 模块 | 5 | 代码审查/增强日志 |
| BFF hooks | 4 | 错误处理/订阅日志 |
| 其他业务代码 | 18 | 零散日志 |

- **建议**: 
  1. 微前端基础设施日志可保留（开发调试需要）
  2. AI 模块日志建议使用结构化日志框架
  3. 业务代码中的 `console.log` 应替换为应用级日志

### P1-5 Mobile 服务硬编码回退 URL
- **严重度**: 🟠 P1（配置灵活性）
- **证据**: [mobile/src/main.rs](file:///Users/xingzhai/TOPEMS/svc/mobile/src/main.rs#L140) 多处 `expect("hardcoded fallback URL is valid")`
- **问题**: 硬编码了其他服务的回退 URL，环境迁移时需要改代码
- **修复建议**: 改为环境变量配置

---

## 🟡 P2 — 一般问题（4 项）

### P2-1 Portal 死代码警告
- **严重度**: 🟡 P2（代码整洁）
- **证据**: `warning: struct CompleteLessonRequest is never constructed`
- **位置**: [guide.rs:90](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/help/guide.rs#L90)
- **建议**: 删除未使用的结构体或补充对应实现

### P2-2 ERP Prometheus 指标重复注册风险
- **严重度**: 🟡 P2（运行时稳定性）
- **证据**: [erp/src/main.rs](file:///Users/xingzhai/TOPEMS/svc/erp/src/main.rs#L28) 5 个指标注册使用 `expect()`
- **风险**: 如果服务重启时指标已注册，将导致 panic
- **修复建议**: 改为 `try_register()` 并处理重复注册

### P2-3 审计日志 SQL 使用 `SELECT *`
- **严重度**: 🟡 P2（审计完整性）
- **证据**: [audit.rs](file:///Users/xingzhai/TOPEMS/svc/pm/src/services/audit.rs#L4) 4 处审计查询使用 `SELECT *`
- **风险**: 审计查询应确保获取所有必要字段以支持合规审计
- **建议**: 明确列出审计所需字段

### P2-4 SQL 动态更新语句
- **严重度**: 🟡 P2（SQL 最佳实践）
- **证据**: [manage.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/file/manage.rs#L386) `format!("UPDATE core_files SET {} WHERE id = $1", updates.join(", "))`
- **问题**: 如果 `updates` 来自用户输入，存在 SQL 注入风险
- **修复建议**: 对可更新字段使用白名单验证

---

## 🟢 P3 — 优化建议（3 项）

### P3-1 A4 去门面化迁移进度
- **当前状态**: V70-1（V70-2）未执行
- **影响**: 所有服务仍可使用 `topems_shared::*`，导致子 crate 依赖不明确
- **建议**: 按计划分 4 批次迁移，每批独立验证

### P3-2 测试覆盖率提升
- **现状**: 398 后端 lib 测试 + 268 集成测试 + 626 前端单元测试 + 2307 组件测试
- **建议**: 
  1. 为 `graphql_schema.rs` 补充单元测试
  2. 为 SQL 查询添加集成测试
  3. 提高错误路径覆盖率

### P3-3 性能优化
- **方向**: 
  1. GIS 服务添加字段选择白名单
  2. SCM 多次查询考虑批量处理
  3. Analytics BI 查询缓存优化

---

## 📈 修复优先级排序

| 优先级 | 问题 ID | 问题 | 预计工作量 |
|-------|---------|-----|-----------|
| 🔴 P0 | P0-1 | QMS 导入路径修复 | ✅ 已完成 |
| 🔴 P0 | P0-2 | SQL 注入防护（17 处） | 8h |
| 🔴 P0 | P0-3 | graphql_schema.rs unwrap 治理 | 16h |
| 🟠 P1 | P1-1 | 全局 unwrap 治理 | 24h |
| 🟠 P1 | P1-2 | GIS SELECT * 优化 | 12h |
| 🟠 P1 | P1-3 | @ts-ignore 清理 | 4h |
| 🟠 P1 | P1-4 | console.log 清理 | 8h |
| 🟠 P1 | P1-5 | Mobile 硬编码 URL | 2h |
| 🟡 P2 | P2-1 ~ P2-4 | 一般问题修复 | 8h |
| 🟢 P3 | P3-1 ~ P3-3 | 优化建议落地 | 40h+ |

---

## 🔍 与前几轮审计对比

| 审计轮次 | 问题总数 | P0 | P1 | P2 | P3 | 健康分 |
|---------|---------|-----|-----|-----|-----|--------|
| V66.7（第三轮） | 31 | 6 | 10 | 9 | 3 | - |
| V67.1（第四轮） | 67 | 10 | 25 | 20 | 12 | 100 |
| V67.2（数据层） | 18 | 5 | 6 | 4 | 3 | 62 |
| **V70（第五轮）** | **15** | **3** | **5** | **4** | **3** | **72** |

**关键变化**:
1. ✅ 审计日志覆盖率从 25% → 100%（V67.2 P0-1 修复）
2. ✅ ApprovalStatus 枚举统一（V67.2 P0-2 修复）
3. ✅ 软删除模式统一（V68.1-3 修复）
4. ✅ 迁移命名规范落地（V68.1-1 修复）
5. ⚠️ **新发现**: graphql_schema.rs unwrap 泛滥（411 处）
6. ⚠️ **新发现**: format! SQL 拼接风险（17 处）
7. ⚠️ **新发现**: GIS SELECT * 滥用（194 处）

---

## 🎯 下一步行动

### 立即行动（本周）
1. **P0-2**: 修复 17 处 SQL 注入风险
2. **P0-3**: graphql_schema.rs unwrap 治理（先处理锁相关的高风险位置）

### 短期行动（2 周内）
3. **P1-1**: 分批治理 portal 模块 unwrap
4. **P1-2**: GIS 服务字段选择优化
5. **P1-5**: Mobile 硬编码 URL 配置化

### 中期行动（V70 版本）
6. **P3-1**: A4 去门面化迁移完成
7. **测试覆盖率**: 补充错误路径测试

---

## 📊 审计方法说明

本次审计采用以下方法：
1. **编译验证**: `cargo check --workspace` + `tsc --noEmit`
2. **模式匹配**: 正则扫描 `unwrap()`、`format! SQL`、`SELECT *`、`@ts-ignore`、`console.log`
3. **文件聚类**: 识别热点文件和热点模块
4. **风险评估**: 基于影响范围和发生概率评估优先级

**审计局限**:
- 未进行动态运行时测试
- 未检查实际性能指标
- 未审计第三方依赖安全漏洞
- 未覆盖所有集成场景