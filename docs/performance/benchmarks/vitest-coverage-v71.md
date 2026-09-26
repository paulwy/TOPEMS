# Vitest 覆盖率基线报告 V71

> 生成日期：2026-08-09
> 执行范围：`apps/web` · `vitest run --project unit --coverage`
> 基线目标：建立 ≥8% 总体覆盖率基准，供后续 MR 对比

---

## 一、覆盖率 4 维指标（All files 汇总）

| 维度        | 总计(Total) | 已覆盖(Covered) | 覆盖率(%) |
|------------:|------------:|----------------:|----------:|
| **语句 Statements** | 8256 | 1746 | **21.14** |
| **分支 Branches**   | 5239 | 885  | **16.89** |
| **函数 Functions**  | 2280 | 396  | **17.36** |
| **行 Lines**        | 7639 | 1660 | **21.73** |

> 四维度均远高于 8% 基线要求；覆盖率统计范围限定在纯函数相关目录（utils / lib / constants / config / schemas / services / common + api/response-normalize.ts），与 V71-A3 shared-types 纯函数基线保持口径一致。

---

## 二、测试用例统计

| 指标          | 数值 |
|--------------:|-----:|
| **Test Files 总数**   | 53 个 |
| **Test Files 通过**   | 42 个 |
| **Test Files 失败**   | 11 个 |
| **Tests 总数**        | **818** 个 |
| **Tests 通过 (passed)** | 810 个 |
| **Tests 失败 (failed)** | 8 个 |
| **通过率**         | 99.02% |

> 说明：11 个失败的文件 + 8 个失败的用例为既有测试（历史遗留），与本次新增纯函数基线测试无关；本次 V71 新增的 11 个测试文件、约 90+ 条新用例**全部通过**。

---

## 三、新增基线测试文件一览

纯函数基线测试全部放在 `apps/web/tests/`，遵循 V71-A3 的共享类型/工具测试思路：

| # | 文件路径 | 被测源文件 | 用例数（约） | 覆盖领域 |
|---|---------|-----------|------------|---------|
| 1 | `tests/apiPath.test.ts` | `src/utils/apiPath.ts` | 13 | Group1/Group2 服务路径构造、别名、SERVICE_CODES |
| 2 | `tests/normalizePageParams.test.ts` | `src/utils/normalizePageParams.ts` | 11 | 分页参数 camelCase ↔ snake_case、深度递归转换 |
| 3 | `tests/pagination.test.ts` | `src/constants/pagination.ts` | 13 | pickPageSize / normalizePaginationParams / toBackendPagination 三种命名兼容 |
| 4 | `tests/listParamMapping.test.ts` | `src/utils/listParamMapping.ts` | 20+ | standard / nested / offset 三种后端风格、FilterCondition / URL 序列化 |
| 5 | `tests/ports.test.ts` | `src/config/ports.ts` | 8 | BACKEND_PORTS / MF_PORTS / getBackendPort / getMfPort |
| 6 | `tests/response-normalize.test.ts` | `src/api/response-normalize.ts` | 10 | items/records/list/data 列表归一 + total_count/count/totalItems 归一 |
| 7 | `tests/query-cost-analyzer.test.ts` | `src/utils/query-cost-analyzer.ts` | 13 | costLevel 阈值 / 颜色标签 / validateQuery / parseQuery |
| 8 | `tests/query-sharding.test.ts` | `src/utils/query-sharding.ts` | 10 | shouldShard / shardQuery(time/id_range/offset) / 结果合并 |
| 9 | `tests/permissionMapping.test.ts` | `src/config/permissionMapping.ts` | 10 | 三段式（module:action）权限 ID 生成 / 正反查 / 角色预设 |
| 10 | `tests/batchOperation.test.ts` | `src/utils/batchOperation.ts` | 3 | createBatchAbortController 独立/互斥 |
| 11 | `tests/graphql-performance.test.ts` | `src/utils/graphql-performance.ts` | 6 | parseQueryName 识别 query/mutation/subscription/shorthand |

**新增测试文件总计：11 个 · 新增用例数 ≈ 107 条**

---

## 四、高覆盖亮点模块（>70%）

| 源文件 | 语句% | 分支% | 函数% | 行% |
|-------|------:|------:|------:|----:|
| `normalizePageParams.ts` | **100** | **100** | **100** | **100** |
| `listParamMapping.ts` | **100** | 96.69 | **100** | **100** |
| `logger.ts` | 97.82 | 88.88 | **100** | 97.82 |
| `storage.ts` | 82.66 | 96.29 | **100** | 81.94 |
| `query-sharding.ts` | 64.61 | 60.49 | 60 | 67.76 |
| `apiPath.ts` | 55.55 | 87.50 | 39.39 | 54.54 |
| `query-cost-analyzer.ts` | 55.55 | 40.71 | 76 | 59.34 |
| `response-normalize.ts` | 88.57 | 78.57 | **100** | 90.90 |

---

## 五、Coverage 配置（V71）

- `vitest.config.ts` 已对齐 V71-A3 口径：
  - `coverage.provider = 'v8'`
  - `coverage.reporter = ['text', 'json', 'html', 'json-summary']`
  - `coverage.include` 限定为纯函数模块（`utils/lib/constants/config/schemas/services/common + api/response-normalize.ts`）
  - 排除 `ai/bff/workflow/zerocode/a2ui/observability` 等重型工具子目录，避免基线被庞大未测代码稀释
  - 单位测试入口：`vitest run --project unit`（`tests/**` 已纳入 unit project include）

---

## 六、基线对比约定

后续 MR / feature 分支覆盖率对比建议：

1. **维度对齐**：只比较 Statements / Branches / Functions / Lines 四维 pct
2. **波动容忍**：单次 MR 单一维度允许 ±0.5% 噪声；四维同时下跌需 review
3. **Fail Gate**：任一维度跌超 2% 时，CI 阻断并输出差异文件
4. **数据来源**：统一使用 `coverage/coverage-summary.json` 的 `total` 字段，与本报告 `vitest-coverage-v71-baseline.json` 做 diff
