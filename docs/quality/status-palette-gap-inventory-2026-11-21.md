# 状态盘点增加色板缺口指标 + finance 色板闭环（W5-B / B18）

- 日期：2026-11-21
- 范围：`scripts/ci/dump-status-code-inventory.mjs`、`apps/web/src/utils/status.ts`、`apps/web/src/utils/__tests__/status.test.ts`、`docs/database/status-code-inventory.json`
- 结论：盘点脚本新增“Rust 枚举值 vs 前端色板”缺口指标，把“后端有状态、前端灰块”从人工发现变成可复现读数；finance 侧剩余 10 个缺口补齐，finance 域色板缺口清零。

## 1. 缺陷

- 原盘点只回答“Rust 值是否在 DB CHECK”，不回答“前端是否有色板”。B17 修了 19 个键，但同类缺口只能靠人工扫，无法防回归。
- B17 提交时 `status-code-inventory.json` 未随色板同步刷新（记为 61 键，实际代码 81 键），`--check` 在 B17 提交点会失败。B18 修正该漂移。

## 2. 改动

- `dump-status-code-inventory.mjs`
  - 新增 `rust_values_not_in_palette` 统计（`enumValues` 去掉 `STATUS_COLOR_MAP` 键后的差集）。
  - 输出 `not_in_palette.rust_values` 清单，便于按域排期。
  - 仍为 report-only：缺口不阻断，只作为队列。
  - 生成顺序修正为“先改色板再生成”，`--check` 通过。
- `status.ts` 新增 10 个 finance 键：`aborted/error`、`compensated/warning`、`compensating/warning`、`skipped/default`、`partially_settled/warning`、`settled/success`、`unsettled/warning`、`closing/warning`、`ignored/default`、`suppressed/default`。
  - 其中 `closing` 原本就在 `public.period_status` ENUM 内，前端却无对应色板，属实际展示缺陷。
- 单测 `FINANCE_STATUSES` 扩到 43 个值，逐一断言色板键存在。

## 3. 读数

| 指标 | B17 | B18 |
| --- | --- | --- |
| Rust 枚举 | 136 | 136 |
| Rust 枚举值 | 146 | 146 |
| 不在 DB CHECK | 108 | 108 |
| 不在前端色板 | 84 | 74 |
| 前端色板键 | 81（提交物误记 61） | 91 |
| 前端键不在 DB CHECK | 48（提交物误记 35） | 57 |

finance 域色板缺口：10 → 0（`saga` 3+2、结算 `partially_settled/settled/unsettled` 3、期间 `closing` 1、审计 `ignored` 1、预测 `suppressed` 1）。

剩余缺口按域排序（report-only 队列）：

| 域 | 缺口值 | 枚举数 |
| --- | --- | --- |
| erp | 24 | 10 |
| portal | 21 | 17 |
| master-data | 13 | 11 |
| plugin-registry | 7 | 1 |
| ai | 6 | 3 |
| lib/shared-event | 5 | 4 |
| rd | 4 | 3 |
| lib/shared-auth / db / observability | 各 3 | 各 2–3 |
| communication / unified-core / lib/shared-core / integration / mes / pm | 各 1–2 | 各 1–3 |

## 4. 验证

- `node scripts/ci/dump-status-code-inventory.mjs --check`：PASS（136 枚举 / 91 前端键）。
- `pnpm --dir apps/web exec vitest run src/utils/__tests__/status.test.ts`：8 passed。
- `pnpm --dir apps/web typecheck`：0 error。
- `pnpm exec eslint apps/web/src/utils/status.ts apps/web/src/utils/__tests__/status.test.ts --quiet`：0 error。

## 5. 遗留

- 74 个跨域缺口未补，其中 erp/portal 合计 45 个，是下一阶段主要工作量；补齐需按各域状态语义定色，不能一律套默认色。
- 前端色板键多于 Rust 值（91 vs 146 覆盖不完整）属正常：前者是展示映射，后者是状态定义，不要求双向相等。
- 盘点只比对字符串归一值（snake_case），不做语义等价判断（如 `paid` 与 `completed` 是否同义）。
