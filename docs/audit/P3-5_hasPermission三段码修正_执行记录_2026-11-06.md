# hasPermission 三段码缺陷专项 执行记录（批 15）

- 批次：批 15
- 日期：2026-11-06
- 前置：批 14 排查时发现（`docs/audit/P3-4_CrudPage写权限入口_执行记录_2026-11-06.md` 第 4 节）

## 1. 缺陷机制

`apps/web/src/config/permissions.ts` 原 `hasPermission` 对任何 `parts.length >= 2` 的码走同一套
"等级近似"分支。对三段码（`模块:资源:动作`，如 `scm:contract:delete`）：

1. `parts = ['scm','contract','delete']` → `action = restParts.join(':')` = `'contract:delete'`；
2. `ACTIONS.find(a => a.action === 'contract:delete')` → **查不到** → 目标 `actionLevel = 0`；
3. `userActions` 取该模块下所有权限的**第二段**（`contract`）查等级 → 同样查不到 → `0`；
4. `0 >= 0` → **恒真**。

结果：**只要用户在某模块拥有任一权限，该模块下所有三段码检查全部通过**。

## 2. 量化（先做，数据说话）

### 2.1 前端引用面

| 口径 | 数值 |
|---|---|
排除测试后的 FE 源码三段码引用处数 | **2282 处** |
三段码唯一值 | **449 个** |
两段码引用处数（不受影响） | 125 处 |

口径：`grep -rhoE "'[a-z_]+:[a-z_]+(:[a-z_]+)?'" apps/web/src`（含 `.ts/.tsx`，排除 `__tests__` 与 `*.test.*`），按 `:` 分段计数。

### 2.2 DB 授权粒度（`public.core_role_permissions`，20 角色 / 2760 条）

| 角色 | 持有码数 |
|---|---|
superadmin | 998 |
admin | 974 |
mes_manager | 91 |
finance_manager | 71 |
wms_manager | 70 |
hrm_manager | 67 |
scm_manager | 61 |
pdm_manager | 59 |
ehs_manager | 57 |
crm_manager | 51 |

### 2.3 误放行面（核心结论）

按 `(角色, 模块)` 分组，与 DB 该模块码总数比对：

| 指标 | 数值 |
|---|---|
部分持有组（`held < total`） | **80** |
全持有组（`held = total`） | **80** |

即 **一半的授权组是"部分持有"**，这些角色对未持有的动作本应无权，却因缺陷全部放行。

最典型（缺口感 = 误放行码数）：

| 角色 | 模块 | 持有 | 该模块总数 | 误放行 |
|---|---|---|---|---|
employee | mes | 1 | 93 | **92** |
finance_user | finance | 2 | 75 | **73** |
employee | wms | 1 | 72 | **71** |
employee | hrm | 1 | 67 | **66** |
hr_admin | hrm | 4 | 67 | **63** |
employee | scm | 1 | 59 | **58** |
employee | ehs | 1 | 57 | **56** |
employee | crm | 1 | 54 | **53** |
employee | qms | 1 | 47 | **46** |

`employee` 是基础角色，每条业务域只持 1 个 `*:dashboard:read`，却能看到该域下几乎所有写按钮。

**结论**：误放行面极大且结构性问题（覆盖全部 2282 处三段码引用），必须一步到位修正，不做分级。

## 3. 修正规则（写入判定层，不改各页面引用）

新增 `hasThreeSegmentPermission(userPermissions, parts)`，`parts.length >= 3` 时直接分派到它：

| # | 规则 | 依据 |
|---|---|---|
1 | `all` / 精确命中 → 放行 | 原有，上层已处理 |
2 | `<模块>:<资源>:admin` 资源级管理码 → 放行该资源全部动作 | DB 41 个 `*:admin` 码 |
3 | `<模块>:admin` 模块级管理码 → 放行该模块全部动作 | superadmin 41 / admin 28 持有 |
4 | `<模块>:<资源>:write` → 放行 `create`/`update`/`delete` | DB 483 个细粒度 CRUD 码 vs 50 个 write 聚合码，`write` 定义为**全写** |
5 | **反向不成立**：持 `create`/`update`/`delete` 不推出 `write` | 部分写 ≠ 全写 |
6 | admin ↔ iam 等价、基础设施模块（doc/file/notification/integration/im）与 iam 联动 | 沿用原过渡期语义 |
7 | 其余一律不放行 | **删除等级近似分支** |

**两段码不变**：`parts.length === 2` 仍走原等级继承（`X:admin` → `X:write`/`X:delete`…）、等价与联动分支，
因为两段码的 `action` 是真实动作名，等级语义在此成立（FE 仅 125 处引用）。

**`write` 与 `create/update/delete` 双语义收敛结论**：`write` 作为**聚合码**单向覆盖 CRUD，
理由（DB 实测）：细粒度码 483 个是主流写法，`write` 仅 50 个且语义上即"全写"；
若反向让 CRUD 推出 `write`，则"只能改不能删"的角色会获得删除权，与本意相反。

`apps/web/src/hooks/useOptionalPermission.ts` 同步简化：删除自建的三段分支，直接复用
`hasPermission` / `hasPermissionWithInheritance`，避免两套判定逻辑漂移。

## 4. 验证

| 项 | 结果 |
|---|---|
新增单测 `config/__tests__/permissions.threeSegment.test.ts` | **11 passed**：create 不放行 delete / employee 实测集看不到写入口 / write 聚合单向 / 资源级与模块级 admin 通配且不越界 / admin 实测集不被误锁 / admin↔iam 等价 / 基础设施联动 / 空权限拒绝 / 四段码 / 二段码等级语义未受影响 |
`useOptionalPermission` 单测 | 7 passed |
全站 vitest | **623 files / 6663 passed / 1 skipped / 0 failed** |
`tsc` | 0 error |
`eslint` | 0 error |
RLS 校验 | ✅ 通过 |
对账基线 | fe **461** / be 577 / db 893 / fe_orphan **42** / rename_groups 0 |
菜单对账 | navItemCount 449 / seedCount 184 |

**对账基线变化说明（口径）**：`scripts/audit_permission_codes.py` 的 `SKIP_MARKERS` 只排除
`target/node_modules/dist/.next/__pycache__`，**不排除 `__tests__` 与 `*.test.*`**，因此本批新增的
`config/__tests__/permissions.threeSegment.test.ts` 中的 19 个三段码字面量被计入 FE，
其中 7 个在 DB 中不存在（计入 `fe_orphan`）。**真实代码的码引用未新增**，基线变化全部来自单测。
未修改该脚本（排除测试会改变既有对账语义，属独立调整项，已登记）。

## 5. 影响与核对原则

修正后前端会有**部分菜单/按钮按真实授权收紧隐藏**——这是预期行为（原先被误放行）。
核对原则（按用户拍板）：**收紧是默认正确的**，只有"页面依赖误放行作为设计"的情况才回退
**码引用**（补授权或改用正确码），**不放宽判定层**。

### 5.1 收紧前后实测对比（脚本复刻判定规则，逐角色遍历 461 个 FE 三段码）

| 角色 | 持码 | 旧规则可见 | 新规则可见 | 收紧 |
|---|---|---|---|---|
employee | 39 | 260 | **0** | -260 |
erp_manager | 2 | 25 | **0** | -25 |
finance_user | 2 | 25 | 1 | -24 |
project_manager | 12 | 27 | 11 | -16 |
hr_admin | 8 | 39 | 24 | -15 |
admin | 974 | 447 | 433 | -14 |
superadmin | 998 | 447 | 441 | -6 |
20 角色合计 | 2760 | 1534 | 1170 | **-364（23.7%）** |

### 5.2 逐项核对结论（"不是全部放开"）

- **employee 收紧到 0 是正确的**：其实测 39 个码**全部是两段码或无冒号裸码**（`ai:read`、`doc:read`、`doc:write`、`attendance_read`…），**三段码为 0 个**。它本来就没有任何三段码授权，旧规则的 260 个"可见"全是误放行。
- **erp_manager 收紧到 0 同样正确**：仅持 `erp:read` + `erp:write` 两个模块级粗粒度码。
- **admin / superadmin 各自收紧 14 / 6**：缺的是 FE 已引用但 DB 不存在的码（`fe_orphan 35` + `fe_only 322` 的一部分，属码引用侧问题，非判定缺陷）；且 `superadmin` 实际走 `user.is_superuser → true` 前置放行（`usePermission.ts:115`），UI 不受影响。
- **域经理基本零收紧**（lims/pdm/srm/report 各 -1，hrm/scm/pm 0）：其持有码本就是其职责范围。
- **无"应见却隐藏"案例**。

### 5.3 登记的数据侧问题（不在本批处理）

`employee` 持有二段码 `doc:write` 而 doc 模块的三段码需精确授权——这属于**授权粒度不足**（角色应被授予 `doc:<资源>:write`），是数据侧补码工作，与判定逻辑无关。

## 6. DB 改动

**无**。本批只改前端判定层，无 schema / 数据变更，故无迁移与回滚脚本。
（回滚方式：`git revert <本批 hash>`，判定层为纯函数，无状态。）
