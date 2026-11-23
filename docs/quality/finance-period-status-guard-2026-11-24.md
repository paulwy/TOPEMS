# B252：财务期间状态收敛与真实期间列表

日期：2026-11-24

## 结论

`finance.core_finance_periods.status` 已统一到 `PeriodStatus` 三态 `open / closing / closed`，
并修复三处真实缺陷：期间列表伪造状态、开启接口无条件重开已关闭期间、关闭接口不校验来源态。

## 治理前事实

- 表列已是 PostgreSQL 原生枚举 `period_status`，只允许 `open / closing / closed`，本地 1489 行全部为 `open`。
- 代码侧已有 `svc/finance/src/models/mod.rs::PeriodStatus`，但三个期间接口没有接入枚举：
  - `list_periods` 完全不查库，按“当前月份”推导状态：过去月份一律 `closed`、当月 `open`、未来月份 `locked`。`locked` 不在 `PeriodStatus`，且未开账的历史期间被伪造成已关闭。
  - `open_period_v2` 用 `INSERT ... ON CONFLICT DO UPDATE SET status = 'open'`，会把 `closed` 或 `closing` 期间静默改回 `open`。
  - `close_period_v2` 用无条件 `UPDATE ... SET status = 'closed'`，不区分当前是 `open`、`closing` 还是已关闭。
  - `open_period_v2` 新建期间时 `end_date` 固定写 `YYYY-MM-28`，2 月以外月份期间结束日错误。

## 改动

1. `PeriodStatus` 增加 `as_db_str` 与 `from_db_str`，严格拒绝 `locked`、`bogus` 等未知值；查询参数 `status` 非法直接 400。
2. `list_periods` 改为按 `tenant_id + year` 查询真实 `finance.core_finance_periods`，返回库内 `status / start_date / end_date / closed_at`，不再合成 12 条假记录，也不再返回 `locked`。
3. `open_period_v2` 先读当前状态：
   - 无记录：新建 `open`；
   - 已 `open`：幂等成功，不重复写；
   - 已 `closed`：允许重开，同时清空 `closed_at / closed_by`；
   - `closing`：409，拒绝在结账过程中直接重开。
4. `close_period_v2` 先读当前状态：
   - 无记录：404；
   - 已 `closed`：幂等成功；
   - `open / closing`：关闭并写入 `closed_at`、`closed_by`。
5. 新建期间的 `end_date` 改为当月最后一天，不再固定 28 日。历史行未回填，保持原值。
6. 前端 `apps/web/src/api/finance/period.ts` 契约由 `open | closed | locked` 改为 `open | closing | closed`，并补 `closed_at`。

## 数据库约束

列本身是原生枚举，数据库已拒绝枚举外值；本批另加显式 CHECK 锁定枚举扩展：

`CHECK (status::text = ANY (ARRAY['open','closing','closed'])) NOT VALID`

候选 SQL：`docs/database/finance-period-status-check-candidates-2026-11-24.sql`。本地已应用，约束未验证（1489 行全部合法）。

## 验证

- `cargo check -p topems-finance` PASS；新增单测覆盖 `as_db_str` 与 `from_db_str` 对 `locked / bogus / 空串` 的拒绝。
- 本地探针：`UPDATE ... SET status = 'bogus'` 被原生枚举拒绝（`invalid input value for enum period_status`）。
- 本地约束：`ck_core_finance_periods_status_standard` 存在，`convalidated = false`，定义与候选 SQL 一致。
- 真实数据：2026 年 10、11 月各租户均为 `open`，例如租户 `73b7a3ac-5d6b-4eb8-b0cf-9d6461163715` 返回 2 条真实期间；旧实现会对同一租户伪造 12 条并把 1–9 月标成 `closed`。
- 前端 `period.ts` 类型与后端返回一致，`FinancePeriodPage` 已能渲染 `open / closing / closed`。

## 计数

- status-code inventory：314 枚举 / 242 值 / 195 不在 DB CHECK / 251 前端键 / 色板缺口 0（`PeriodStatus` 已由原生枚举覆盖，计数不变）。
- status-db-check queue：187 枚举 / 195 值（不变）。
- mappings：300 条（不变；原生枚举已覆盖，无需新增映射）。
- prod-only：417 → **418**（`finance` 41 → 42，B252 = 1）。
