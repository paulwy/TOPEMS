# TOPEMS 测试覆盖率报告

**生成日期**: 2026-09-11
**报告版本**: v1.0

---

## 一、覆盖率总览

### 1.1 前端覆盖率

| 指标 | 覆盖率 | 目标 | 差距 |
|------|--------|------|------|
| 语句覆盖率 | **31.62%** | 70% | -38.38% |
| 分支覆盖率 | **17.25%** | 60% | -42.75% |
| 函数覆盖率 | **23.34%** | 70% | -46.66% |
| 行覆盖率 | **32.35%** | 70% | -37.65% |

### 1.2 后端覆盖率

> **待补充**: 需要安装 `cargo-tarpaulin` 工具后生成后端覆盖率报告。
>
> 安装命令: `cargo install cargo-tarpaulin`
> 运行命令: `cargo tarpaulin --out Html --output-dir coverage/`

### 1.3 测试数量统计

| 类别 | 测试文件数 | 测试用例数 | 通过率 |
|------|-----------|-----------|--------|
| 前端单元测试 | 375 | 5,908 | 100% |
| 后端单元测试 | - | 501+ | 100% |
| **总计** | **375+** | **6,409+** | **100%** |

---

## 二、前端覆盖率详细分析

### 2.1 按目录统计

| 目录 | 语句覆盖率 | 主要问题 |
|------|-----------|----------|
| `src/utils/` | 38.16% | 高级功能模块覆盖率低 |
| `src/services/` | 22.93% | Tauri API、外部适配器覆盖率低 |
| `src/schemas/` | 56.94% | workflow schema 覆盖率中等 |
| `src/lib/` | - | plugin-loader 覆盖率低 |
| `src/config/` | - | 运行时配置覆盖率中等 |
| `src/constants/` | - | 常量定义覆盖率较高 |

### 2.2 覆盖率为 0% 的文件（Top 20）

| 文件 | 语句数 | 说明 |
|------|--------|------|
| `src/utils/queryCostAnalyzer.ts` | 234 | 查询成本分析器 |
| `src/lib/plugin-loader/PluginLoader.tsx` | 209 | 插件加载器 |
| `src/services/ExternalErpAdapters.ts` | 181 | 外部 ERP 适配器 |
| `src/utils/smartPrefetch.ts` | 149 | 智能预取 |
| `src/utils/streamingSsr.ts` | 140 | 流式 SSR |
| `src/utils/edgeCompute.ts` | 132 | 边缘计算 |
| `src/utils/querySharding.ts` | 130 | 查询分片 |
| `src/lib/plugin-loader/MicroFrontendLoader.tsx` | 117 | 微前端加载器 |
| `src/lib/plugin-loader/DynamicRouter.tsx` | 96 | 动态路由 |
| `src/utils/isrManager.ts` | 95 | ISR 管理器 |
| `src/utils/performance.tsx` | 74 | 性能监控 |
| `src/lib/plugin-loader/ModuleLoader.tsx` | 57 | 模块加载器 |
| `src/lib/plugin-loader/ModuleLoadingProgress.tsx` | 40 | 模块加载进度 |
| `src/schemas/finance/dashboardSchema.ts` | 32 | 财务仪表盘 schema |
| `src/schemas/crm/dashboardSchema.ts` | 31 | CRM 仪表盘 schema |
| `src/schemas/ehs/dashboardSchema.ts` | 31 | EHS 仪表盘 schema |
| `src/schemas/hrm/dashboardSchema.ts` | 31 | HRM 仪表盘 schema |
| `src/schemas/lims/dashboardSchema.ts` | 31 | LIMS 仪表盘 schema |
| `src/schemas/pdm/dashboardSchema.ts` | 31 | PDM 仪表盘 schema |
| `src/schemas/wms/dashboardSchema.ts` | 31 | WMS 仪表盘 schema |

**总计**: 76 个文件覆盖率为 0%

### 2.3 高覆盖率文件（100%）

| 文件 | 说明 |
|------|------|
| `src/utils/export.ts` | 导出工具 |
| `src/utils/permissionMapping.ts` | 权限映射 |
| `src/utils/mobileDetector.ts` | 移动端检测 |
| `src/utils/normalizePageParams.ts` | 分页参数规范化 |
| `src/api/wms/serialNumber.ts` | WMS 序列号 API |
| `src/api/wms/supplier.ts` | WMS 供应商 API |
| `src/api/wms/warehouse.ts` | WMS 仓库 API |
| `src/schemas/workflow/definition.ts` | 工作流定义 schema |

---

## 三、后端测试情况

### 3.1 测试通过情况

| 包 | 测试数 | 状态 |
|----|--------|------|
| topems-crm | 501 | ✅ 全部通过 |
| topems-shared-auth | 223 + 3 | ✅ 全部通过 |
| 其他 29 个服务 | - | ✅ 全部通过 |

### 3.2 已修复的测试问题

1. **CRM RLS 隔离测试**（2 个）
   - 问题：超级用户绕过 RLS
   - 修复：使用 `SET LOCAL ROLE rls_test_user` 切换到非超级用户
   - 提交：`17e315b98`

2. **RLS 中间件 E2E 测试**（1 个）
   - 问题：超级用户绕过 RLS
   - 修复：在 handler 中使用 `SET LOCAL ROLE rls_test_user`
   - 提交：`40ef56cb9`

---

## 四、覆盖率提升计划

### 4.1 优先级 1：核心业务模块（1-2 周）

**目标**: 将核心业务模块覆盖率提升到 60%+

| 模块 | 当前覆盖率 | 目标 | 重点测试内容 |
|------|-----------|------|-------------|
| WMS API | 低 | 70% | 出入库、库存、库位管理 |
| CRM API | 中 | 70% | 客户、商机、合同管理 |
| MES API | 低 | 60% | 生产订单、设备、质量 |
| HRM API | 低 | 60% | 员工、考勤、组织 |
| 工具函数 | 38% | 70% | 日期、格式化、权限 |

### 4.2 优先级 2：高级功能模块（2-3 周）

**目标**: 将高级功能模块覆盖率提升到 50%+

| 模块 | 当前覆盖率 | 目标 | 重点测试内容 |
|------|-----------|------|-------------|
| 插件加载器 | 0% | 50% | PluginLoader、MicroFrontendLoader |
| 查询优化 | 0% | 50% | queryCostAnalyzer、querySharding |
| 性能优化 | 0% | 40% | smartPrefetch、streamingSsr、edgeCompute |
| 外部适配器 | 0% | 50% | ExternalErpAdapters、TauriApi |
| Dashboard schema | 0% | 60% | 各模块 dashboardSchema |

### 4.3 优先级 3：边缘功能和集成测试（持续）

**目标**: 建立 E2E 测试和集成测试体系

| 测试类型 | 内容 | 优先级 |
|----------|------|--------|
| E2E 测试 | 关键业务流程（订单、库存、采购） | P0 |
| API 集成测试 | 前后端联调测试 | P1 |
| 数据库事务测试 | 并发、事务隔离 | P1 |
| 性能测试 | API 响应时间、并发 | P2 |
| 安全测试 | 权限越权、SQL 注入 | P2 |

---

## 五、测试最佳实践

### 5.1 单元测试规范

1. **测试命名**: 使用 `should_xxx_when_xxx` 格式
2. **测试隔离**: 每个测试独立，不依赖其他测试
3. **Mock 策略**: 外部依赖（API、数据库）使用 Mock
4. **覆盖率门槛**: 新增代码覆盖率不低于 80%

### 5.2 RLS 测试注意事项

1. **超级用户问题**: PostgreSQL 超级用户默认绕过 RLS
2. **解决方案**: 在测试事务中使用 `SET LOCAL ROLE <non_superuser>`
3. **角色创建**: 使用 `DO $$` 块幂等创建测试角色
4. **权限授予**: 确保测试角色有表的 SELECT/INSERT 权限

### 5.3 测试运行命令

```bash
# 前端测试
cd apps/web
npm run test                    # 全量测试
npm run test -- --coverage      # 带覆盖率
npx vitest run <pattern>        # 运行指定测试

# 后端测试
cargo test --workspace          # 全工作区测试
cargo test -p <package>         # 指定包测试
cargo test <pattern>             # 运行指定测试

# 后端覆盖率（需安装 cargo-tarpaulin）
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage/
```

---

## 六、附录

### 6.1 覆盖率报告位置

- 前端 HTML 报告: `apps/web/coverage/index.html`
- 前端 JSON 报告: `apps/web/coverage/coverage-summary.json`
- 本文档: `docs/assessments/test-coverage-report-2026-09-11.md`

### 6.2 相关文档

- 全量模块完整度重新评估报告: `docs/assessments/module-completeness-reassessment-2026-09-09.html`
- 分析页面 Mock→真实 API 计划: `docs/assessments/analytics-mock-to-real-api-plan-2026-09-11.md`

### 6.3 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-09-11 | v1.0 | 初始版本，前端覆盖率 31.62%，后端测试全部通过 |

---

**报告生成时间**: 2026-09-11
**下次更新计划**: 完成优先级 1 覆盖率提升后更新
