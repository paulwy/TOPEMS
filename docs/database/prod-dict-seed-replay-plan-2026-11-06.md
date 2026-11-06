# prod 字典回灌执行方案（存档，未执行）

- 日期：2026-11-06
- 对象：`topems_prod` 的 `public.core_dict_types` / `public.core_dict_items`
- 状态：**仅方案，本轮未对 prod 执行任何 DML/DDL**
- 关联：[connection-governance.md](connection-governance.md) B.10.12、迁移 `20261107000008_dict_tenant_isolation_strict.sql`
- **可执行窗口清单（以此为准）**：[dict-replay-window-checklist-2026-11-06.md](dict-replay-window-checklist-2026-11-06.md)
- 本地演练：[dict-replay-rehearsal-2026-11-06.md](dict-replay-rehearsal-2026-11-06.md)
- legacy 标注：[dict-legacy-types.md](dict-legacy-types.md)

---

## 1. 现状（本轮 prod 只读核对）

数据来自 `ssh` 上机本地 `psql`，全部为 `SELECT` / `pg_catalog` 查询。

| 项 | 实测 |
| --- | --- |
| `core_dict_types` | 7 行：6 个 `hrm` 业务类 + 1 个测试残留 `zz_b4_probe2`（`category=general`） |
| `core_dict_items` | 24 行 |
| `tenant_id` 分布 | 全部 `00000000-0000-0000-0000-000000000001`；**无 NULL、无全零行** |
| `category='system'` | **0 行**（`seed_dict_data` 的幂等守卫不会误跳过） |
| 现版标准种子 | 73 类 / 379 项 |
| 缺口 | 缺 71 类 / 约 355 项；4 个存量类不在现版种子清单 |
| 存量类与种子重名 | `gender`、`employee_status` 两个 code 在标准种子里也存在，回灌会走 `ON CONFLICT` 合并 |
| 角色 | `topems` = superuser（非 bypassrls）；`topems_app` = 非 superuser/非 bypassrls；运维账号 `xingzhai` = superuser + bypassrls |
| 无 GUC 现状 | 无 `app.tenant_id` / `app.rls_system` 会话设置 |

**存量类逐项**

| code | name | category | items | 与标准种子关系 |
| --- | --- | --- | --- | --- |
| `department_type` | 部门类型 | hrm | 4 | 不在 73 类清单（保留） |
| `education` | 学历 | hrm | 4 | 不在 73 类清单（保留） |
| `employee_status` | 员工状态 | hrm | 4 | 在清单；合并后 6 项（多出 `regular`） |
| `gender` | 性别 | hrm | 3 | 在清单；代码完全一致，仅名称更新 |
| `marital_status` | 婚姻状况 | hrm | 4 | 不在 73 类清单（保留） |
| `position_level` | 岗位职级 | hrm | 5 | 不在 73 类清单（保留） |
| `zz_b4_probe2` | probe | general | 0 | 测试残留，回灌后删除 |

## 2. 收紧策略对 prod 的影响面

新策略（迁移 08）只认：

```sql
app.rls_system = 'on'  OR  tenant_id = current_setting('app.tenant_id', true)::uuid
```

| 调用方 | 旧行为 | 新行为 | 结论 |
| --- | --- | --- | --- |
| 普通租户 HTTP 请求（`tenant_middleware` 注入租户 GUC） | 只看本租户 | 只看本租户 | 无变化 |
| 超管 / service token HTTP 请求 | nil 租户 + 零值豁免 → 全量 | `app.rls_system='on'` → 全量 | 无变化 |
| 无 GUC 的直连池 / 脚本 / 裸 `psql` | NULL/空/0 → 全表 | 0 行（fail-closed） | **行为变化，必须显式设置 GUC** |
| 启动期 `seed_dict_data` | 固定 `…0001` 写入 | 事务内 `app.rls_system='on'` | 已在本轮代码修复 |
| DBA 只读排查 | 直接可见 | 需 `SET app.rls_system='on'`（或 superuser/bypassrls 账号） | 运维口径变更 |

prod 代码搜索结论：读写 `public.core_dict_types/items` 的业务代码只有 `master-data` 的 dict handlers 与
`seed_dict_data`（当前无运行时调用方）；其它服务无直连读取。管理端走 master-data HTTP（超管 token），
已由 middleware 的系统通道保留跨租户读取。

## 3. 备份

回灌前必须留可恢复副本，且由于两张表 `FORCE ROW LEVEL SECURITY`，备份会话必须显式打开系统通道。

推荐（在 prod 主机本地执行，`topems_app` 也可，因 `PGOPTIONS` 会话级生效）：

```bash
export PGHOST=/tmp PGDATABASE=topems_prod
export PGOPTIONS="-c app.rls_system=on"
pg_dump -Fc \
  -t public.core_dict_types -t public.core_dict_items \
  --enable-row-security \
  -f /var/backups/topems/dict_before_replay_$(date +%Y%m%d_%H%M).dump
```

- 必须带 `--enable-row-security`：否则 `pg_dump` 会因 FORCE RLS 直接报
  `query would be affected by row-level security policy`。
- 若使用 `topems`（superuser）或不带行安全的 bypassrls 账号，可省略 `PGOPTIONS`，但仍建议显式设置，
  便于审计。
- 另存一份纯文本清单作为人工核对基线：

```bash
psql -X -A -F'|' -c "SELECT 'type',code,name,category,tenant_id,deleted_at FROM public.core_dict_types
                     UNION ALL
                     SELECT 'item',t.code||'.'||i.code,i.name,'',i.tenant_id,i.deleted_at
                     FROM public.core_dict_items i JOIN public.core_dict_types t ON t.id=i.dict_type_id
                     ORDER BY 1,2" > /var/backups/topems/dict_before_replay_$(date +%Y%m%d_%H%M).txt
```

## 4. 显式租户 GUC 约定

| 场景 | GUC |
| --- | --- |
| `seed_dict_data` 回灌 | `app.rls_system='on'` + `app.tenant_id='00000000-0000-0000-0000-000000000001'`（函数内部已设置，事务级） |
| 回灌后人工核对 | 只读：`SET app.rls_system='on'`；或使用 `xingzhai` 这类 bypassrls 账号 |
| 应用普通请求 | `tenant_middleware` 自动注入，禁止手工设置 |
| 清理残留行 | `SET app.rls_system='on'`（事务内，`DELETE` 受 `USING` 约束） |

注意：`SET`（会话级）只在当前连接有效；脚本应使用单连接会话，或在同一事务内 `set_config(..., true)`。

## 5. 回灌步骤（按 `seed_dict_data`）

前置：本批迁移 `20261107000008` 已随版本发布并应用到 prod；应用已滚动重启（新 middleware/seed 行为生效）。

1. **进入维护窗口**，确认无正在执行的字典写入（应用侧只读，必要时摘掉 master-data 写流量）。
2. **完成第 3 节备份**，记录备份文件名与 SHA256：
   ```bash
   shasum -a 256 /var/backups/topems/dict_before_replay_*.dump
   ```
3. **预演（强烈建议在 staging/恢复库先跑一次）**，核对 73/379 与冲突类合并结果。
4. **执行回灌**：使用与发布版本一致的 `seed_dict_data`（运行期无 HTTP 入口，需一次性受控调用）：
   - 方式 A（推荐）：以同一 commit 构建的一次性 example/运维二进制，`DATABASE_URL` 指向 prod，
     在主机本地执行；函数自带事务并设置系统通道。
   - 方式 B：临时把 `seed_dict_data(&pool)` 接入启动流程，仅本次启动有效，跑完恢复代码并重启。
   - **不要**手写 INSERT 绕过函数，避免与标准种子漂移。
5. **回灌后立即核对**（第 6 节 SQL），确认 system 类 73、总项 379（存量 6 类仍保留，实际总数会略高于 379，
   见下方口径）。
6. **清理 `zz_b4_probe2`**（第 7 节）。
7. **观察**：master-data 字典接口 5xx 比例、慢查询；应用侧抽查字典列表/详情。

> 口径说明：回灌是"合并"而非"重建"。存量 4 个非标准类（`department_type`/`education`/`marital_status`/`position_level`）
> 及其 17 项保留；`employee_status` 多出 `regular` 1 项。因此最终预期为
> **types = 73 + 4（非标准存量）= 77**（删除 `zz_b4_probe2` 后），
> **items = 379 + 17（非标准存量项）+ 1（regular）= 397**。
> 若要严格等于 73/379，需要业务确认是否删除这 4 个存量类，属本方案之外的产品决策。

## 6. 核对 SQL

```sql
-- 6.1 总量与系统类
SET app.rls_system = 'on';
SELECT count(*) FILTER (WHERE category='system') AS system_types,
       count(*) AS all_types
FROM public.core_dict_types WHERE deleted_at IS NULL;

SELECT count(*) AS items
FROM public.core_dict_items WHERE deleted_at IS NULL;

-- 6.2 租户落点（必须全部 …0001，且无 NULL/0）
SELECT tenant_id, count(*) FROM public.core_dict_types GROUP BY 1 ORDER BY 1;
SELECT tenant_id, count(*) FROM public.core_dict_items GROUP BY 1 ORDER BY 1;

-- 6.3 缺类检查（应返回 0 行）
SELECT s.code
FROM (VALUES ('common_status'),('boolean'),('gender'),('user_type'),('approval_status'),('priority'),
             ('currency'),('unit_of_measure'),('purchase_order_status'),('sales_order_status'),
             ('inventory_operation'),('customer_level'),('opportunity_stage'),('employee_status'),
             ('contract_type'),('notification_type'),('plugin_status'),('plugin_type'),('data_scope'),
             ('permission_type'),('log_level'),('language'),('timezone')
     ) s(code)
LEFT JOIN public.core_dict_types t ON t.code = s.code AND t.tenant_id='00000000-0000-0000-0000-000000000001'
WHERE t.code IS NULL;

-- 6.4 空项类检查（标准类不应为 0 项）
SELECT t.code, count(i.id) AS items
FROM public.core_dict_types t
LEFT JOIN public.core_dict_items i ON i.dict_type_id=t.id AND i.deleted_at IS NULL
WHERE t.category='system' AND t.deleted_at IS NULL
GROUP BY t.code HAVING count(i.id)=0;

-- 6.5 隔离回归：普通租户应看到 0 行系统种子（除 …0001 自身）
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
SELECT count(*) FROM public.core_dict_types;   -- 期望 73
SET app.tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT count(*) FROM public.core_dict_types;   -- 期望 0
```

## 7. 残留清理

| 对象 | 处理 | 守卫 |
| --- | --- | --- |
| `zz_b4_probe2`（type，0 项） | `DELETE FROM public.core_dict_types WHERE code='zz_b4_probe2'` | 先断言其 0 项、且 `category='general'`；仅删该 code |
| 其它 `zz_*` / `B4-*` 测试残留 | 先 `SELECT` 列清单，逐条人工确认后再删 | 禁止按前缀批量删 |
| 无引用的空壳 type | 用 6.4 SQL 识别；确认无 items 且非标准类后删除 | 需业务确认 |

清理 SQL（事务内）：

```sql
BEGIN;
SET LOCAL app.rls_system = 'on';
-- 断言
SELECT count(*) FROM public.core_dict_items i
JOIN public.core_dict_types t ON t.id=i.dict_type_id
WHERE t.code='zz_b4_probe2';  -- 必须为 0
DELETE FROM public.core_dict_types WHERE code='zz_b4_probe2' AND category='general';
COMMIT;
```

## 8. 回滚路径

1. **首选**：从第 3 节 `pg_dump -Fc` 备份按表恢复（会覆盖回灌新增行，保留原有 7 类/24 项）：
   ```bash
   export PGOPTIONS="-c app.rls_system=on"
   pg_restore --enable-row-security --clean --if-exists \
     -t public.core_dict_items -t public.core_dict_types \
     -d topems_prod /var/backups/topems/dict_before_replay_*.dump
   ```
2. **次选（增量撤销）**：仅删除本次新增的 system 类与项。由于标准种子都挂在
   `tenant_id=…0001` 且 `category='system'`，可按此精确回滚（不会触碰 4 个非标准类）：
   ```sql
   BEGIN;
   SET LOCAL app.rls_system='on';
   DELETE FROM public.core_dict_items i
   USING public.core_dict_types t
   WHERE i.dict_type_id=t.id AND t.category='system' AND t.tenant_id='00000000-0000-0000-0000-000000000001';
   DELETE FROM public.core_dict_types
   WHERE category='system' AND tenant_id='00000000-0000-0000-0000-000000000001';
   COMMIT;
   ```
   注意：`gender` / `employee_status` 的既有行会被该 DELETE 一并删除（因为 category 被 `ON CONFLICT` 更新为
   `system`），因此**增量撤销不如备份恢复完整**；执行前先确认是否可接受。
3. **策略回滚**：迁移 08 只改策略，可用 `pg_dump` 前记录的原策略重建；不建议回退到 NULL/0 放行，
   否则隔离缺口重现。若必须，显式重建后立即安排修复。

回滚触发条件：接口 5xx 明显上升、字典列表为空、写接口大面积报 RLS 错误、主数据业务阻塞。

## 9. 窗口与时长

| 阶段 | 预估 |
| --- | --- |
| 预检 + 备份 + 校验和 | 5–10 分钟 |
| 回灌（379 项，单事务） | < 2 分钟 |
| 核对 SQL + 残留清理 | 5–10 分钟 |
| 观察与回滚缓冲 | 10 分钟 |
| **建议窗口** | **30 分钟**（含 10 分钟缓冲） |

无长时间锁表：`seed_dict_data` 为行级 INSERT/UPDATE，不重建表；`pg_dump` 为 MVCC 快照，不阻塞读写。

## 10. 执行前检查清单

- [ ] 迁移 `20261107000008` 已应用，prod 账本新增一行
- [ ] 应用已重启，超管字典读取正常（跨租户）
- [ ] 备份 dump + SHA256 已登记
- [ ] staging 预演通过（73/379 口径与冲突类合并结果符合预期）
- [ ] 回滚 SQL/备份恢复步骤已在恢复库演练
- [ ] 业务确认 4 个非标准存量类保留策略
- [ ] 维护窗口与通知已发出
