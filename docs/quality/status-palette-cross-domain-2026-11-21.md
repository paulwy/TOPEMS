# 跨域状态色板补齐与色板门禁（W5-B / B20）

- 日期：2026-11-21
- 范围：`apps/web/src/utils/status.ts`、`scripts/ci/dump-status-code-inventory.mjs`、`lefthook.yml`、`docs/database/status-code-inventory.json`
- 结论：全仓 74 个“Rust 有状态、前端无色板”缺口一次补齐，色板缺口 74→0；盘点新增 `--strict-palette` 强校验并接入 lefthook，未登记色板的新状态会在提交阶段被拦下。

## 1. 缺陷

B18 的 `rust_values_not_in_palette` 是 report-only。缺口仍在时，业务单据会退化为灰色 `default`，与真正的 `draft`/`archived` 无法区分，且没有机制阻止新增状态再次漏登记。

## 2. 补齐清单（74 个值，按域）

| 域 | 补齐值 | 主要色 |
| --- | --- | --- |
| lib/shared-auth | deleted/trial/invited | default/info/info |
| lib/shared-core | blacklisted | error |
| lib/shared-db | restored/pending_review/verifying | success/warning/info |
| lib/shared-event | offline/online/standby/published/received | default/success/info/success/info |
| lib/shared-observability | unknown/breaching/insufficient_data | default/error/default |
| ai | compliant/non_compliant/partially_compliant/under_assessment/assigned/timeout | success/error/warning/info/info/error |
| communication | sending/sent | info/success |
| erp | danger/frozen/not_applicable/false_positive/destroyed/pending_destruction/good/neutral/partially_failed/executing/impact_assessed/rolled_back/stakeholder_notified/blocked/done/in_review/todo/not_started/other | error/error/default/default/default/warning/success/default/warning/primary/info/warning/info/error/success/warning/default/default/default |
| integration | max_retries_exceeded | error |
| master-data | invoiced/investigating/tested/initiated/lagging/retired/applied/passed | success/warning/success/info/warning/default/success/success |
| mes | passed | success |
| plugin-registry | downloaded/downloading/installed/installing/rollback/rolled_back/verifying | success/info/success/info/warning/warning/info |
| pm / rd | pending_approval/achieved/delayed | warning/success/error |
| portal | executing/revoked/deploying/rolling_back/canary/staging/new/conflict/synced/syncing/discovering/planning/validating/sunset/unsupported/preview | primary/error/info/warning/info/info/info/error/success/info/info/info/info/default/error/info |
| unified-core | sunset/trial（与 shared-auth 复用同键） | default/info |

配色原则：终态成功用 `success`，失败/阻断用 `error`，需人工关注或中间异常用 `warning`，进行中/信息态用 `info` 或 `primary`，中性/已下线/不适用用 `default`。同一字符串跨域复用同一颜色（如 `passed`、`sunset`、`trial`）。

## 3. 门禁

- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：盘点与仓库一致且缺口为 0 才通过，缺口非 0 直接 `exit 1` 并打印缺值清单。
- `lefthook.yml` 新增 `status-palette` 钩子，触发文件：`apps/web/src/utils/status.ts`、`docs/database/status-code-inventory.json`。
- 效果：新增 Rust `*Status` 值但没登记色板，提交即失败；改了色板没重生成盘点，同样失败。

## 4. 读数

| 指标 | B18 | B20 |
| --- | --- | --- |
| Rust 枚举 / 值 | 136 / 146 | 136 / 146 |
| 值不在 DB CHECK | 108 | 108 |
| 值不在前端色板 | 74 | 0 |
| 前端色板键 | 91 | 165 |
| 前端键不在 DB CHECK | 57 | 126 |

`前端键不在 DB CHECK` 上升是预期：色板键是展示词汇，跨域复用（如 `passed` 同时服务 mes/master-data/portal），不与 DB 状态列一一对应。

## 5. 验证

- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：PASS，色板缺口 0。
- `pnpm --dir apps/web exec vitest run src/utils/__tests__/status.test.ts`：8 passed（finance 43 值守卫仍通过）。
- 待提交时统一跑 typecheck / eslint。

## 6. 遗留

- 色板齐全 ≠ 状态语义一致：同一 `passed` 在不同域的判定口径仍需各自业务确认。
- `STATUS_COLOR_MAP` 已到 165 键，后续可考虑按域拆分，但当前共享表保证同一状态跨模块颜色一致，暂不拆。
- DB CHECK 缺口（108 值不在 DB CHECK）仍未收敛，属 W5-B 下一阶段。
