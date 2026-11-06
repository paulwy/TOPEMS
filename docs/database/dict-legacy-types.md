# 字典历史存量类（legacy）标注

- 日期：2026-11-06
- 对象：`public.core_dict_types` / `public.core_dict_items`
- 代码单一真源：[svc/master-data/src/modules/dict/legacy.rs](../../svc/master-data/src/modules/dict/legacy.rs) 的 `LEGACY_DICT_TYPES`

## 1. 清单

| code | 名称 | prod 项数 | 来源 / 引用 | 处置 |
| --- | --- | --- | --- | --- |
| `department_type` | 部门类型 | 4 | 早期 HRM 种子；组织架构引用 | 保留，标 legacy |
| `education` | 学历 | 4 | 早期 HRM 种子；员工档案引用 | 保留，标 legacy |
| `marital_status` | 婚姻状况 | 4 | 早期 HRM 种子；员工档案引用 | 保留，标 legacy |
| `position_level` | 岗位职级 | 5 | 早期 HRM 种子；岗位/职级引用 | 保留，标 legacy |

合计 **4 类 / 17 项**。它们不在现行标准种子 `get_system_dict_definitions()` 的 73 类中。

## 2. 标注机制（代码 + 测试 + 文档）

| 层 | 机制 | 作用 |
| --- | --- | --- |
| 代码常量 | `legacy.rs::LEGACY_DICT_TYPES` | 唯一清单；`is_legacy_dict_type()` 供后续按需判断 |
| 单元测试 | `legacy_types_are_not_in_standard_seed` | 若有人把这 4 类塞进标准种子，测试失败，强制先决策 |
| 单元测试 | `seed_has_no_destructive_dict_sql` | 静态断言 `seed.rs` 不出现 `DELETE FROM public.core_dict*` / `TRUNCATE`，防止 seed 迭代误删 |
| 单元测试 | `legacy_codes_are_unique_and_expected` | 清单变更必须显式同步（含文档与回灌核对 SQL） |
| 文档 | 本文 + 回灌清单 + 迁移方案 | 业务与运维可见 |
| 回灌核对 | `scripts/db/sql/dict_replay_verify.sql` G2 | 每次回灌后断言 4 类存在、分项 4/4/4/5 |

## 3. 回灌语义（合并，不清表）

`seed_dict_data` 的事务内行为：

1. `types`：`INSERT ... ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`；
2. `items`：`INSERT ... ON CONFLICT (dict_type_id, code) DO UPDATE SET name/value/sort_order`；
3. 无 `DELETE`、无 `TRUNCATE`、无“先清空再灌”。

因此回灌后：

- 标准 73 类全部存在（`gender` / `employee_status` 与存量按 code 合并，保留原租户与分类）；
- legacy 4 类及其 17 项原样保留；
- 清理 `zz_b4_probe2` 后总数 `77 类 / 397 项`。

## 4. 变更流程

新增/下线 legacy 类时：

1. 修改 `LEGACY_DICT_TYPES`（code、名称、项数、原因）；
2. 跑 `cargo test -p topems-master-data legacy`；
3. 同步本文与 `scripts/db/sql/dict_replay_verify.sql` 的 legacy 清单/期望值；
4. 若涉及 prod 存量，先在只读环境核对行数与引用方，再排窗口（不直接改 prod）。

## 5. 禁止事项

- 禁止在 seed 或任何启动期逻辑中对字典表执行 `DELETE` / `TRUNCATE` / `DROP`；
- 禁止把“标准种子 73 类”当作全量清单做清表覆盖；
- 禁止为了凑 77 类而从 `LEGACY_DICT_TYPES` 中移除业务仍在使用的类。
