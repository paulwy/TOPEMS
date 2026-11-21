# B76 · EHS 隐患关闭与验收写入口加固（2026-11-21）

## 现状（改动前）
- 关闭接口对 `ehs.qa_ehs_hazards.status` 无任何起始态谓词：已 closed 可重复关闭，resolved 也可以直接改写。
- 启动审批 UPDATE 状态不符时返回 404，把“状态不对”误报成“不存在”。
- 验收接口先插 `qa_ehs_hazard_verifications` 再更新状态，状态不是 pending_verification 时才 409，依赖事务回滚兜底。
- 本地 117 行：reported 78 / resolved 39。

## 改动
1. `HazardStatus::close_from`：除 closed 外全部状态，历史 resolved 可借关闭动作归一到 closed。
2. 关闭 UPDATE 增加起始态谓词；0 行显式回滚并返回 409“状态不允许关闭或不存在”。
3. 启动审批 0 行同样改为显式回滚 + 409。
4. 验收前先查当前状态：非 pending_verification 直接 409，不插入验收记录；不存在返回 404，状态非法返回 409。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings` 干净。
- 本地演练（事务内 ROLLBACK）：resolved→closed 1 行；对已 closed 再关闭 0 行。
- 39 行 resolved 未改库，仍可按关闭路由逐条归一或在窗口内批量 UPDATE。

## 残留
- `verified` / `rejected` 仍是前端保留态，后端不写入；审批驳回没有落库路径。
- 39 行 resolved 是否批量回填 closed 需产品确认。
