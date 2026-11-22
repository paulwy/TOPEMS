# WMS 批次主状态/质量状态收口（B115）

- 日期：2026-11-22
- 范围：`wms.batches.status`、`wms.batches.quality_status`
- 结论：主状态统一为前端既有的五值，质量状态统一为四值；默认由 `active` 改为 `in_stock`，质量默认保持 `pending`；所有读写入口加严格解析、集合过滤与状态迁移守卫，修复“创建即 active、与前端/FSM 不一致”的断链。

## 状态集合

主状态：

```
in_stock → reserved | out_stock | frozen | scrapped
reserved → in_stock | out_stock | frozen | scrapped
out_stock → in_stock | scrapped
frozen → in_stock | scrapped
scrapped 终态
```

默认 `in_stock`。历史 `active` 只读投影为 `in_stock`，更新时若未显式传状态则顺带归一。

质量状态：

```
pending → inspecting → qualified | unqualified
qualified | unqualified → inspecting（复检）
```

默认 `pending`。旧前端默认 `qualified` 改为 `pending`，新批次不再绕过检验。

## 本批发现并修掉的问题

1. **创建写死 `status='active'`，前端、FSM 与用户认知都是 `in_stock` 起步**：新批次一创建就落在前端没有的状态上，列表虽然能显示但筛选、色板、后续流转全部对不上。现在创建与 DB 候选默认统一为 `in_stock`，历史 `active` 仅兼容读取。
2. **质量状态从请求任意透传，无枚举、无默认**：请求可写任意字符串，缺省时依赖 DB 默认 `pending`，与前端默认 `qualified` 冲突。现在创建缺省 `pending`，显式值必须命中四值，否则 400。
3. **更新两个状态列任意透传，可绕过迁移矩阵**：通用 PUT 可把 `scrapped` 改回 `in_stock`、把 `qualified` 随意改 `pending`。现在更新校验值域，并在 UPDATE 内用 `CASE` 谓词约束质量迁移与主状态迁移；未传状态时把旧 `active` 归一 `in_stock`。
4. **更新与删除没有 `deleted_at IS NULL`**：软删批次仍可被 PUT 修改、被再次删除。现在两处都补上软删过滤。
5. **调整数量、转移库位不限制当前状态**：已冻结、已出库、已报废批次仍可改数量、挪库位，直接破坏库存与账面一致性。现在只允许 `in_stock / reserved`，0 行返回 409。
6. **列表/详情/统计/到期查询透传自由文本**：状态与质量参数不做校验，未知值静默返回空集；历史 `active` 行在 JSON 中原样漏出。现在参数非法 400，列表 SELECT/COUNT、详情、统计、即将过期、已过期全部加规范集合过滤，`active` 投影为 `in_stock`。
7. **统计、到期提醒把已报废/已出库批次也算进去**：`quality_pending_count` 与临期/过期统计混入了非在库批次。现在统计加入规范状态/质量集合，临期与过期只统计 `in_stock / reserved / frozen`。
8. **统计 SQL 无软删过滤，聚合可包含已删批次**：现在补 `deleted_at IS NULL`；同时把编译期 `query!` 改为运行时 `query`，避免离线查询缓存因 SQL 变更失效，也避免聚合列类型推断依赖缓存。

## 代码

- 新增 `svc/wms/src/modules/batch_status.rs`：
  - `BatchStatus` 五值 + `DB_VALUES / DEFAULT(InStock) / from_db_str / from_read_str(active)=InStock / as_db_str / can_transition_to`。
  - `BatchQualityStatus` 四值 + `DB_VALUES / DEFAULT(Pending) / from_db_str / as_db_str / can_transition_to`。
  - 三个单测：主状态往返与 `active` 读别名、主状态迁移矩阵、质量状态往返与复检矩阵。
- `svc/wms/src/modules/mod.rs`：注册 `pub mod batch_status;`。
- `svc/wms/src/modules/batch.rs`：
  - 列表 `status / quality_status` 参数严格解析；列表 SELECT/COUNT 用 `CASE WHEN status='active' THEN 'in_stock' ELSE status END` 投影，并只放行五值 + 旧 `active` 与四值质量。
  - 创建质量缺省 `pending`、严格解析；主状态绑 `BatchStatus::DEFAULT`。
  - 详情加规范集合过滤与 `active` 投影。
  - 更新校验两列、补软删过滤、当前值集合、质量迁移矩阵、主状态迁移矩阵；未传状态时归一旧 `active`；0 行 409。
  - 删除补软删过滤。
  - 统计、即将过期、已过期加入规范集合；临期/过期仅统计 `in_stock / reserved / frozen`；统计聚合改运行时查询并补软删过滤。
  - 调整数量、转移库位只允许 `in_stock / reserved`，0 行 409。
- 前端 `apps/web/src/schemas/wms/batch.ts`：质量默认 `qualified` → `pending`。
- 前端 `apps/web/src/utils/status.ts`：补 `out_stock: default`、`reserved: warning`、`inspecting: info`。

## 本地事务演练

本地 `wms.batches` 0 行，生产快照同为 0 行，无存量迁移成本。DDL 与探针全部在事务内执行，最后回滚。

1. 先 `DROP CONSTRAINT IF EXISTS ck_batches_status_standard`，再以同名重建五值 `NOT VALID`，另建 `ck_batches_quality_status_standard` 四值 `NOT VALID`，`status` 默认改为 `in_stock`。
2. 插入探针不传两列状态：得 `status='in_stock'`、`quality_status='pending'`。
3. 合法更新为 `reserved / inspecting`：`UPDATE 1`。
4. 改 `status='active'`、`quality_status='rejected'`：分别触发 `ERROR 23514`，被两条 CHECK 拦下，行仍是 `reserved / inspecting`。
5. 回滚后复查：旧 `ck_batches_status_standard`（active/inactive/archived）恢复，质量约束计数 0，`wms.batches` 仍 0 行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：576 passed（B114 为 573，新增 3 个）

## 后续

- 候选 DDL 未进 `database/migrations/`，生产执行需窗口；窗口内先跑 SQL 文件头部预检，且必须先替换旧约束，否则 `in_stock` 会被旧 CHECK 拒绝。
- 批次主状态/质量状态目前只通过通用 PUT 修改，没有独立的质检、冻结、报废动作端点；本批靠 PUT 内的迁移矩阵守卫，后续可拆成显式动作。
- `Batch.QueryParams` 仍有 `expiry_warning`、`expired` 两个字段但列表 handler 未使用，属于既有闲置参数，不影响本批值域。
