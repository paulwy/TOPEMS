# RD 配方状态词表收口（B262）

日期：2026-11-24
表：`rs.formulas`
迁移：`database/migrations/20261124170000_rd_formula_status_standard.sql`

## 缺陷

- `rs.formulas.status` 没有 CHECK，默认值是 `'draft'`，但后端创建在缺省时写中文 `'草稿'`。
- 评审通过把业务状态写成 `'released'`，而前端词表是 `draft / testing / approved`。
- 本地 7 行真实数据出现三套写法：`草稿` 4 行、`draft` 2 行、`released` 1 行；同一状态无法按一套词表筛选、着色和流转。
- 创建/更新接受任意字符串，非法值只能靠人工发现，不存在状态机。

## 落地

- 新增 `FormulaStatus`：`draft / testing / approved / archived`，补 `DB_VALUES`、`as_db_str`、`from_db_str`、`normalize`。
- `normalize` 兼容历史写法：`草稿→draft`、`测试中/待测试→testing`、`released/已批准/已发布→approved`、`已归档→archived`；未知值返回 `None`，调用方 fail-closed。
- 创建缺省绑定 `FormulaStatus::DEFAULT.as_db_str()`；显式非法状态 400。
- 更新按当前态校验 `can_transition_to`：草稿可测试/批准/归档，测试中可回草稿或批准/归档，已批准仅可归档，归档终态；非法回退 400，同值幂等。
- 列表状态筛选也走 `normalize`，非法筛选值 400，不再静默返回空列表。
- 评审通过的目标状态由 `released` 改为 `approved`，与前端一致；评审更新加条件：归档不可再评审，`submit/reject` 仅允许草稿/测试中，避免已批准被回退。
- 迁移：历史值归一 → 默认值固定 `'draft'` → `ADD CONSTRAINT ck_formulas_status_standard CHECK (status IN ('draft','testing','approved','archived')) NOT VALID` → `VALIDATE`。
- fail-closed：归一后仍有四态之外的值则 `RAISE EXCEPTION`。

## 本地应用与验证

- 迁移执行成功：`B262 完成：rs.formulas.status 已归一为四态并建立约束`。
- 归一后真实数据：`draft` 6 行、`approved` 1 行，中文与 `released` 清零。
- `pg_constraint`：`ck_formulas_status_standard`，`convalidated=t`。
- 列默认值：`'draft'::text`。
- `cargo check -p topems-rd`、`cargo fmt`、`clippy --all-targets -- -D warnings` 通过。
- `TEST_DATABASE_URL=... cargo test -p topems-rd`：166 passed。

## 回滚

`database/rollback/20261124170000_rd_formula_status_standard.rollback.sql`：DROP 约束、默认值恢复 `'draft'`。历史值的归一不可逆，回滚前需确认业务不再依赖中文/`released` 旧值。
