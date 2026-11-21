# B85 · 数据契约发布并发窗口收口（2026-11-21）

## 现状（改动前）
- `update_contract` 在管理器内先无条件 `UPDATE` 产品并置 published，再写契约；handler 的“先查状态再写”只降低概率，无法阻止并发把 draft/published 改成 deprecated/retired。
- 旧顺序还是“先插入契约、后更新产品”，一旦产品状态在窗口内变化，契约表会留下孤立行。
- 请求里的 `security_level` 未知值时静默回退 internal。

## 改动
1. `UpdateContractOutcome` 明确三种结果：Updated / NotFound / StatusConflict。
2. 管理器改为先带 `status IN ('draft','published')` 谓词更新产品，0 行时再查存在性：不存在 404，存在即 409，不再插入契约。
3. 只有产品更新成功（1 行）才插入契约；同请求事务内插入失败会整体回滚，不留下半写状态。
4. `security_level` 非法值 400，不再静默 internal。

## 验证
- `cargo fmt --all`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 本地演练（事务内 ROLLBACK）：把 1 行产品改为 deprecated 后执行带谓词更新，`UPDATE 0`，契约表计数不变（2 行存量）。
- `status IN (...)` 同时封住“deprecated/retired 通过重写契约复活”的路径。

## 残留
- 契约版本仍固定 `1.0.0`，无递增/历史版本；不在本批范围。
- 生产若已有 deprecated/retired 产品带契约，属于历史数据，不会被本批改写。
