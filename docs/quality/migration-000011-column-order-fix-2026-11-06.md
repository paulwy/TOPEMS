# 000011 列序修复与 INSERT 形态门禁（2026-11-06）

## 1. 结论

1. `20261107000011_resource_crud_codes_batch24.sql` 的 `VALUES` 每行实际顺序为
   `(code, resource, action, name, level)`，派生表别名却声明为
   `(code, name, resource, action, level)`，写入后 `name/resource/action` 三列整体错位
   （如 `name='aps:material_plan'`、`resource='create'`、`action='material_plancreate'`）。
2. **该迁移在 local / test / prod 的 `_sqlx_migrations` 中均无任何记录（更无 `success=t`）**，
   按用户约定走「未应用迁移」例外：直接修正迁移文件字节并同步该行 checksum，不新增前向迁移，
   这不是改写已执行的历史。
3. 现场发现本地 `topems` 已存在 21 条**账本外**写入的脏行（`created_at` 同一时刻、内容正是错位版本），
   已按「删 21 权限 + 50 授权 → 重放修正迁移」修复；test 快照库/其它本地库无脏行。
4. 新增静态检查器 `scripts/migration/check-insert-column-shape.mjs` 并接入 pre-push
   （`scripts/ci/check-migration-insert-shape.sh` + `lefthook.yml`）。全仓 613 个迁移 /
   230 条 INSERT 中，修复前**仅 `000011` 命中**，其余迁移无确定性问题。

## 2. 判定依据（三环境账本）

| 环境 / 库 | `_sqlx_migrations` 行数 | max(version) | 20261107000011 |
|---|---:|---|---|
| local `topems` | 554 | 20261107000018 | **无记录** |
| local `topems_prepare`（test 快照） | 0 | — | **无记录** |
| local `topems_sqlx_scratch` | 60 | 20260831190800 | **无记录** |
| local `topems_dict_rehearsal` | 552 | 20261107000009 | **无记录** |
| local `topems_prod_verify_20261106` | 0 | — | **无记录** |
| prod `topems_prod` | 581 | 20261107000018 | **无记录** |

本地账本在 `20261107` 段实际记录的是
`000003/000004/000005/000006/000008/000017/000018`；`000011` 因列序缺陷被甄别为「修复前不得应用」
（见 [prod 剩余迁移分类甄别](prod-pending-migration-triage-2026-11-06.md)）而跳过，并非执行失败。

### 选路理由

- 若任一环境已记账 `success=t`：账本 checksum 与文件字节绑定，改字节会造成「历史被改写」，
  必须新增前向修正迁移，并在新迁移里修正已写入的错位行。
- 本次三环境均为 0 条记录：文件尚未成为任何环境的执行输入，修正输入本身是正确做法；
  `database/checksums.txt` 只是文件字节的 SHA-256 清单，重算该行即可。
- **本地脏数据的来源与修法**：`topems` 的 21 条行台账本无记录，`created_at` 均为
  `2026-11-06 15:01:03`（同一批），内容与错位版本完全一致 → 属于账本外手工执行旧文件的结果。
  修复顺序：删除 21 条码的 50 行角色授权 → 删除 21 条权限行 → 重新执行修正后的迁移 →
  再次执行 0 变更。其它本地库 21 条计数为 0（或无该表），无需处理。

## 3. 修法（最小字节改动）

只改派生表别名，使其与实际 `VALUES` 顺序一致；`SELECT v.code, v.name, v.resource, v.action, v.level`
与 `INSERT` 列清单保持 1:1，可读性不受影响：

```diff
-) AS v(code, name, resource, action, level)
+) AS v(code, resource, action, name, level)
```

修改后 21 行落位为：`name='material_plancreate'`、`resource='aps:material_plan'`、`action='create'`。
checksum 由 `f62e8b59…` 更新为 `a8ddfc1b…`（`validate.sh` 重写，仅此一行变化）。

## 4. 静态检查器

`scripts/migration/check-insert-column-shape.mjs`（Node，纯静态，不连库）：

1. **确定性结构层**：
   - `INSERT INTO t (cols) VALUES (row), (row)…`：列清单列数 vs 每条元组顶层值个数；
   - 派生表 `FROM (VALUES …) AS v(a,b,c)`：别名列数 vs 每条元组值个数；
   - `INSERT INTO t (cols) SELECT …`：列清单列数 vs SELECT 顶层表达式个数（`SELECT *` 跳过）。
2. **已知语义层（`core_permissions`）**：按「INSERT 列清单 ← SELECT 列表 ← 别名位置 ← VALUES 值」
   组合出列→值映射后断言 `action` 等于 `code` 最后一个 `:` 段、`resource` 是 `code` 的前缀
   （允许 `:`/`_` 两种模块写法，也允许 `bi`/`mes`/`wms` 这类模块级 resource）。
   这一条直接覆盖 000011 的错位形态。

**全仓扫描结果（修复前）**：`613` 个迁移文件 / `230` 条 INSERT，命中 2 条，均来自 `000011`
（`action`、`resource` 各一条）；修复后 0 条。`20261107000001` 的 `bi:data_source:write` /
`resource='bi'` 属既有模块级写法，规则已显式放行，不是缺陷。

**无法静态判定的部分**：列名与值语义错位（除 `core_permissions` 等有明确派生规则的表）无法通用判定，
需要在 scratch 库应用后按主键断言产出内容。本次采用的做法（可复用）：

```sql
WITH expected(code, name, resource, action, level) AS (VALUES (…21 行期望值…)),
actual AS (SELECT code, name, resource, action, level FROM public.core_permissions
           WHERE code IN (SELECT code FROM expected))
SELECT e.code, e.name AS exp_name, a.name AS act_name, …
FROM expected e LEFT JOIN actual a USING (code);
```

输出逐行 `ok=t/f`，汇总 `expected_rows` vs `fully_matching_rows`。

## 5. 门禁接入（pre-push）

`lefthook.yml` 新增 `migration-insert-shape`，调用
`bash scripts/ci/check-migration-insert-shape.sh`；触发路径：

```
database/(migrations|baseline)/ | svc/*/migrations/ | migrations/ |
scripts/migration/check-insert-column-shape* | scripts/ci/check-migration-insert-shape*
```

| 场景 | 实测 |
|---|---|
| 无关改动（当前 HEAD 无迁移变更） | `SKIP`，**0.034s** |
| 触发（`MIGRATION_INSERT_SHAPE_FORCE=1`） | `PASS 613 文件 / 230 INSERT`，**0.223s** |
| 失败（临时还原错位别名） | exit 1，输出 `[Gate INSERT] FAILED` + `path:line` 两条 |

无 `node` 时 fail-closed（`[Gate INSERT] FAILED` + 安装指引），不允许静默跳过。
`MIGRATION_INSERT_SHAPE_FORCE=1` 仅供本地手动验证。

## 6. 验证

### 6.1 scratch 库（克隆 `topems`，账本确认无 000011）

- 修复脏行后重放：`INSERT 0 21` / 授权 `INSERT 0 42` + `INSERT 0 8`；
  逐行核对 **21 / 21 完全一致**（`exp_*` 与 `act_*` 逐列相等，`ok=t`）。
- 幂等复跑：三条语句均 `INSERT 0 0`，行数不变。
- 授权：`admin 21` / `superadmin 21` / `srm_manager 8`（共 50 行），修复前后一致。
- 既有权限数据指纹（排除本次 21 条码）：`de74d5e72eef36deced764e01801c0d9`，修复前后一致。

### 6.2 本地 `topems`

同一修复流程执行后：`INSERT 0 21` / 复跑 `INSERT 0 0`，逐行 **21/21 一致**；
账本仍无 `000011`（按缺陷甄别有意跳过，未伪造账本行）。

### 6.3 prod（只读）

- 批 25 的 92 条码中 prod 实存 89 条，指纹
  `f2480fef7be65ea8ca5d88e87c919568`（`level` 有 742 行为 NULL，指纹用 `coalesce(level::text,'')`）；
  本轮未对 prod 执行任何 DDL/DML，复查指纹不变；`core_permissions` 总数 `986` 不变。
- **prod 未应用 000011**；以后授权窗口应直接应用修正后的文件。

### 6.4 静态门禁与 checksums

- `validate.sh`：`Checksum errors: 0` / `Errors: 0`（613 文件；首次因 checksum 旧值退出 1 属预期，
  第二次 0 错误）。
- `checksums.txt`：仅 `20261107000011` 一行由 `f62e8b59…` 变为 `a8ddfc1b…`。
- 门禁失败演示：临时还原错位别名 → exit 1 并打印 `…:32` 两条；恢复后 PASS。

## 7. 遗留 / 后续

1. prod 的 `000011` 仍为 pending，后续授权窗口应用修正后的文件即可，无需前向修正迁移。
2. 本地 `topems` 账本不含 `000011`（历史甄别跳过）；数据已与修正文件对齐，不伪造账本行。
3. 新增迁移中如出现其它表「列名与值语义错位」，用第 4 节的 scratch 主键断言方法核对。
