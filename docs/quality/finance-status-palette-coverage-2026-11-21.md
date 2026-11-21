# finance 状态色板覆盖收口（W5-B / B17）

- 日期：2026-11-21
- 范围：`apps/web/src/utils/status.ts`、`apps/web/src/utils/__tests__/status.test.ts`
- 结论：B4～B16 收口出的 finance 状态中，19 个此前未在全局 `STATUS_COLOR_MAP` 登记，前端统一落到灰色 `default`；本次全部显式登记，并加守卫单测防止后续回退。

## 1. 缺陷

`getStatusColor` 对未知状态返回 `default`（`apps/web/src/utils/status.ts:155`）。B4～B16 把 DB/Rust 状态集合收口后，新增值未同步到前端色板，导致：

- 应收/应付 `posted`、凭证 `reversed`、对账 `disputed`、明细 `matched/unmatched`、报表 `locked`、收款 `written_off`、结算关联 `linked`、快照 `diff`、v60 `evaluated`、v55 发票 `recognized/verified`、对账 `discrepancy`、v56 表单 `calculated/accepted`、筹划 `proposed/under_review/executed`、v57 `generating`、报销 `reimbursed` 全部显示为灰色。
- 灰色与真正的 `draft/archived` 等中性态同色，业务人员无法区分“状态未知”和“中性态”。

## 2. 改动

| 状态 | 色板 | 语义 |
| --- | --- | --- |
| `posted` | `success` | 已过账（终态） |
| `reversed` | `warning` | 已冲销（需关注） |
| `disputed` / `discrepancy` | `error` | 争议 / 差异 |
| `matched` | `success` | 已匹配 |
| `unmatched` / `diff` | `warning` | 未匹配 / 有差异 |
| `linked` | `info` | 已关联 |
| `locked` | `default` | 已锁定（中性态） |
| `written_off` | `success` | 已核销 |
| `evaluated` / `recognized` / `calculated` / `proposed` | `info` | 已评估 / 已识别 / 已计算 / 已提出 |
| `verified` / `accepted` / `executed` / `reimbursed` | `success` | 已核验 / 已受理 / 已执行 / 已报销 |
| `under_review` | `warning` | 审核中 |
| `generating` | `primary` | 生成中（进行中） |

`diff`、`matched`、`unmatched`、`discrepancy`、`partial` 同时服务对账中心语义，非 finance 专属。

## 3. 验证

- `apps/web/src/utils/__tests__/status.test.ts` 新增 `finance 状态色板` 用例：33 个 finance 状态逐一断言 `STATUS_COLOR_MAP[status]` 存在，任意新增状态漏登记会失败。
- `pnpm --dir apps/web exec vitest run src/utils/__tests__/status.test.ts`：8 passed。
- `pnpm --dir apps/web typecheck`：0 error。
- `pnpm exec eslint apps/web/src/utils/status.ts apps/web/src/utils/__tests__/status.test.ts --quiet`：0 error。

## 4. 盘点刷新

`node scripts/ci/dump-status-code-inventory.mjs` 重新生成 `docs/database/status-code-inventory.json`：

| 指标 | B11 后 | B17 后 |
| --- | --- | --- |
| Rust `*Status` 枚举 | 135 | 136（新增 `DifferenceAdjustmentStatus`） |
| Rust 枚举值 | 146 | 146（新值已与既有覆盖值重合） |
| 值不在 DB CHECK / ENUM | 108 | 108 |
| 前端状态键 | 61 | 61（本批只补色板，不改业务 schema 状态键） |
| 前端键不在 DB CHECK / ENUM | 35 | 35 |

DB 目录 `dump-status-checks.mjs` 无 diff：215 CHECK / 5 ENUM / 507 无约束列。

## 5. 遗留

- 色板只解决“展示有颜色”，不等于“状态值同源”：前端的业务状态联合类型仍分散在各 `schemas/*`。
- `STATUS_COLOR_MAP` 是跨模块共享表，后续其他域新增状态同样需要登记；建议在盘点脚本中增加“Rust 枚举值未登记色板”的检查项（未做）。
- DB CHECK 仍缺（B4～B16 只到代码层），候选 DDL 见各批次证据文档。
