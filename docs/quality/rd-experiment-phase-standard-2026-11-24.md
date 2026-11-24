# RD 试验阶段词表收口（B265）

日期：2026-11-24
表：`rs.experiments`
迁移：`database/migrations/20261124230000_rd_experiment_phase_standard.sql`

## 缺陷

- `rs.experiments.phase` 无 CHECK、无默认值且允许 NULL。
- 后端创建直接落 `req.phase`；前端通用表单与专用创建页提交的是展示名/中文
  `Lab Trial / Pilot Run / Scale-up / Production Validation`、`小试 / 中试 / 放大 / 生产验证`。
- 推进接口只硬编码 `lab→pilot→scaleup→production`，其他写入路径可落任意字符串；
  详情与项目页仍按中文标签匹配颜色，英文值会退化成灰色未知 chip。

## 落地

- 新增 `ExperimentPhase` 四态：`lab / pilot / scaleup / production`，与迁移 CHECK 同源。
- `normalize` 先做 trim + lower + 空格/连字符折叠为下划线，再兼容：
  `Lab Trial/Laboratory/小试/实验室→lab`、`Pilot Run/中试→pilot`、
  `Scale-up/放大/扩试→scaleup`、`Production Validation/生产验证/量产/生产→production`；
  未知值 fail-closed。
- 阶段机只允许前进或停留：`lab→pilot→scaleup→production`，`production` 为终态；
  同值幂等，禁止回退。
- 创建入口：空 phase 取默认 `lab`，其余先归一；非法值 400。SQL 绑定改为 `as_db_str()`。
- 推进入口：先归一当前 phase（库内未知 500），再取 `next()`；终态 400，目标阶段不再硬编码字符串。
- 前端通用 schema：phase 选项值改四态英文，默认 `lab`；展示按值映射中文/英文标签与颜色
  `lab=info / pilot=warning / scaleup=error / production=success`。
- 专用创建页：`getPhases()` 改为 `{value,label}`，默认 `lab`；列表/详情/项目详情 chip 统一按值取标签。
- 迁移：旧别名/中文/展示名/空值归一 → 默认 `'lab'` → `phase NOT NULL` → ADD CHECK + VALIDATE。
- fail-closed：归一后仍有四态之外的值则 `RAISE EXCEPTION`。

## 本地应用与验证

- 迁移执行成功：`B265 完成：rs.experiments.phase 已建立四态约束`。
- `pg_constraint`：`ck_experiments_phase_standard`，`convalidated=t`。
- 列属性：默认 `'lab'::text`，`is_nullable=NO`。
- 事务内探针（禁用 FK 检查避免造父行）：插入成功并使用默认 `lab`；更新为 `bogus` 被 23514 拒绝；回滚后表 0 行。
- `cargo test -p topems-rd`：171 passed；`clippy --all-targets -- -D warnings`、`cargo fmt` 通过。
- 前端 `pnpm typecheck` 通过；`RsExperimentListPage` 组件测试 2 passed。
- 状态盘点：`ExperimentPhase` 为阶段域，不计入 `*Status*` 状态台账；状态台账保持
  318 个 Rust 枚举 / 188 队列 / `real_gap 0`，`--check --strict-palette` 与 enum contract 12/12 PASS。
- `docs/database/status-db-check-mappings.json` 已登记 `ExperimentPhase` 与本地 `convalidated` 证据。

## 未纳入本批

创建入口的 `experiment_type` 仍接受前端中文展示名，属于另一个词表（试验类型），本批只收口 `phase`。

## 回滚

`database/rollback/20261124230000_rd_experiment_phase_standard.rollback.sql`：DROP 约束、恢复可空且无默认。历史中文/展示名归一不可逆。
