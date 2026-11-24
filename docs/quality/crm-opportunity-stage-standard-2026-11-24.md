# CRM 商机阶段词表收口（B266）

日期：2026-11-24
表：`crm.opportunities`
迁移：`database/migrations/20261124233000_crm_opportunity_stage_standard.sql`

## 缺陷

- `crm.opportunities.stage` 无 CHECK，数据库默认值仍是 legacy `prospecting`；
  后端 `OppStage` 已按 `draft/lead/qualified/proposal/negotiation/won/lost/closed` 做流转，
  但 `OppStage::from_str` 只认英文规范值，DB 默认值不在枚举内。
- 漏斗、赢单/输单统计和预测仍按 `closed_won/closed_lost` 查询，规范值是 `won/lost`，
  导致这几项统计恒为 0；预测也没有排除终态 `closed`。
- 前端商机详情页按 `prospecting/closed_won/closed_lost` 匹配标签与颜色，
  API 返回规范值时会退化为原始英文。
- 创建入口硬编码 `"draft"` 字符串，没有复用枚举默认值。

## 落地

- `OppStage` 增加 `DB_VALUES` 八态、`DEFAULT = Draft` 与 `normalize`：
  `prospecting/new→draft`、`closed_won→won`、`closed_lost→lost`，
  trim + lower + 空格/连字符折叠；未知值 fail-closed。`from_str` 复用 `normalize`。
- 创建入口改为绑定 `OppStage::DEFAULT.as_str()`，不再硬编码。
- 漏斗阶段改为规范六态 `lead/qualified/proposal/negotiation/won/lost`。
- 赢单/输单统计改为 `won/lost`；预测排除 `won/lost/closed` 三个终态。
- 前端详情页补齐八态标签与颜色，并保留 legacy 别名映射；
  新增 `crm.opportunityDetail.stage_draft/lead/qualified/negotiation/won/lost/closed` 中英文文案。
- 迁移：legacy 别名归一 → 默认 `'draft'` → `stage NOT NULL` →
  ADD `ck_opportunities_stage_standard` + VALIDATE；归一后仍有八态之外的值则 `RAISE EXCEPTION`。
- 单测覆盖八态 DB 契约、legacy 别名、未知值拒绝。

## 本地应用与验证

- 迁移执行成功：`B266 完成：crm.opportunities.stage 已建立八态约束`。
- `pg_constraint`：`ck_opportunities_stage_standard`，`convalidated=t`。
- 列属性：默认 `'draft'::character varying`，`is_nullable=NO`。
- 本地数据归一后：`stage=draft` 1 行；探针 `UPDATE stage='bogus'` 被 23514 拒绝，事务回滚后仍为 draft。
- `cargo test -p topems-crm --lib`：511 passed；`cargo clippy -p topems-crm --all-targets -- -D warnings` 通过，`cargo fmt` 通过。
- 前端 `pnpm typecheck` 通过；中英文 CRM i18n JSON 校验通过。
- `OppStage` 不匹配 `*Status*` 状态盘点规则，Rust 状态枚举数量保持 318；迁移登记与 mapping 已同步。

## 未纳入本批

`crm.opportunities.status` 已有 `ck_crm_opportunities_status_canonical` 四态约束，
本批只收口阶段 `stage`；商机阶段推进/回退仍走既有 `can_transition` 守卫。

## 回滚

`database/rollback/20261124233000_crm_opportunity_stage_standard.rollback.sql`：
DROP 约束并恢复 legacy 默认 `prospecting`；历史别名归一不可逆。
