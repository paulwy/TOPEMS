# B83 · master-data 质量检查状态严格解析与读取过滤（2026-11-21）

## 现状（改动前）
- `master_data.mdm_quality_checks` 本地 197 行（passed 181 / warning 15 / failed 1），无 CHECK。
- `QualityStatus` 读侧 `_ => Passed`，集合外值会伪装成通过；质量列表、实体结果、仪表盘、趋势五处 SELECT 均未做状态过滤。
- 质量列表的 `status` 参数原样匹配，未知值返回空而不是报错。

## 改动
1. `QualityStatus` 增加 DB_VALUES、`from_db_str`、`as_db_str`；读侧 helper 与写侧 helper 都委托枚举。
2. 质量列表先严格解析 `status`，未知值 400；列表与 COUNT 都增加 `status IN ('passed','failed','warning')`。
3. 实体检查结果、仪表盘两处全表读取、趋势查询同样增加三值过滤，集合外状态不再进入统计。
4. 候选 CHECK 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 的三值 NOT VALID。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单元测试覆盖三值往返、未知值拒绝、前后空格归一。
- 本地演练（事务内 ROLLBACK）：1 行临时改 bogus 后全表 197 行、过滤后可见 196 行。
- 存量三值均合法，无需归一。

## 残留
- 质量检查没有单独的改状态接口，写入只发生在执行检查时；若后续增加人工复核状态需补迁移规则。
- 生产若有 skipped/ignored 等历史值，施加 CHECK 前需先盘点修订。
