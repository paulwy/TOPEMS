# B82 · master-data 自动修复策略严格解析（2026-11-21）

## 现状（改动前）
- `/quality-v51/auto-fix/run` 的 `strategy` 接受任意字符串，未知值经 `action_type_from_str` 静默变成 `normalize` 并落库。
- 前端/批量工作流仍在使用旧策略名：`normalize_text`、`fill_missing_defaults`、`map_to_standard_values`、`remove_duplicates`，如果直接收紧会把旧调用打成 400。
- `AutoFixActionType` 没有唯一值集合，写入字符串靠手写 match。

## 改动
1. `AutoFixActionType` 增加 `ACTION_VALUES`、`from_db_str`、`as_db_str`；`action_type_to_str` 改为委托枚举。
2. `from_db_str` 兼容四个旧别名，统一归一为 normalize/default_value/map_value/remove_duplicate。
3. `/auto-fix/run` 先严格解析 `strategy`：未知值 400，不再静默落成 normalize；缺省仍为 normalize。
4. 批量工作流的旧策略名继续可用，不改变现有前端调用。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单元测试覆盖五个规范值往返、四个旧别名、未知值拒绝。
- 本地 `mdm_auto_fix_actions` 2 行，`action_type` 无集合外值，无需归一。
- 本批不新增状态值，盘点维持 172 枚举 / 166 值 / 色板缺口 0。

## 残留
- 自动修复记录本身仍然只校验 `status` 与 `action_type`，`before_value`/`after_value` 没有必须成对的约束。
- 策略别名只做读取归一，不会把数据库中的旧值回写为标准值。
