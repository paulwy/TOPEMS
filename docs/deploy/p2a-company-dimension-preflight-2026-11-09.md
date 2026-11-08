# P2a 公司维度 — 部署前置清单

日期：2026-11-09
范围：`p2a/company-dimension` 两笔迁移已合入 `main` 并推送，**尚未部署**。
涉及提交：`0285666bf`（第一笔·单账簿收敛）、`b1f6283cc`（第二笔·公司维度）、`31f4af811`（crm 编译修复）。
涉及迁移：`20261108135000_p2a_single_ledger_convergence.sql`、`20261108140000_p2a_company_dimension.sql`。

> 结论先行：**新旧版本不能交叉运行**。
> - 新代码写 `company_id`，旧库无该列 → INSERT 失败；
> - 旧代码不写 `company_id`，新库该列 NOT NULL → INSERT 失败。
> 因此必须「停写 → 备份 → 迁移 → 起新版本」，不做滚动灰度。

---

## 1. 备份（迁移前必做）

### 1.1 涉及表清单

迁移会读写的表：

| 表 | 迁移动作 |
|---|---|
| `hrm.companies` | 为无公司租户插入 `code='DEFAULT'` 默认公司 |
| `finance.core_finance_vouchers` | 加 `company_id`、回填、NOT NULL、建新唯一键与复合索引 |
| `finance.core_finance_voucher_lines` | 同上（由 voucher 回填） |
| `finance.core_finance_ledger` | 同上（由 voucher 回填） |
| `finance.core_finance_aux_balances` | 同上 + 删除两个旧唯一键 |
| `erp.opening_balances` | `tenant_id` 回填并 NOT NULL、新唯一键、删旧唯一键 |

元数据：`_sqlx_migrations`、`pg_indexes` / `pg_constraint` 快照。

### 1.2 备份命令

```bash
TS=$(date +%Y%m%d-%H%M%S)
OUT="backup/p2a-$TS"
mkdir -p "$OUT"

# 数据（自定义格式，可 pg_restore 单表恢复）
pg_dump -Fc -f "$OUT/data.dump" "$DATABASE_URL" \
  -t hrm.companies \
  -t finance.core_finance_vouchers \
  -t finance.core_finance_voucher_lines \
  -t finance.core_finance_ledger \
  -t finance.core_finance_aux_balances \
  -t erp.opening_balances

# 结构（含索引/约束原貌，回滚比对用）
pg_dump --schema-only -f "$OUT/schema.sql" "$DATABASE_URL" \
  -t hrm.companies \
  -t finance.core_finance_vouchers \
  -t finance.core_finance_voucher_lines \
  -t finance.core_finance_ledger \
  -t finance.core_finance_aux_balances \
  -t erp.opening_balances

# 迁移状态
psql "$DATABASE_URL" -Atc \
  "SELECT version, description, success, installed_on FROM _sqlx_migrations ORDER BY version" \
  > "$OUT/migrations.txt"
```

### 1.3 金额/行数基线（部署后对账用）

```bash
psql "$DATABASE_URL" -At > "$OUT/baseline.txt" <<'SQL'
SELECT 'vouchers', tenant_id, count(*), coalesce(sum(total_debit),0), coalesce(sum(total_credit),0)
  FROM finance.core_finance_vouchers GROUP BY tenant_id ORDER BY tenant_id;
SELECT 'lines', tenant_id, count(*) FROM finance.core_finance_voucher_lines GROUP BY tenant_id;
SELECT 'ledger', tenant_id, count(*), coalesce(sum(debit),0), coalesce(sum(credit),0)
  FROM finance.core_finance_ledger GROUP BY tenant_id ORDER BY tenant_id;
SELECT 'aux', tenant_id, count(*), coalesce(sum(debit_balance),0), coalesce(sum(credit_balance),0)
  FROM finance.core_finance_aux_balances GROUP BY tenant_id ORDER BY tenant_id;
SELECT 'opening', count(*) FROM erp.opening_balances;
SELECT 'companies', tenant_id, count(*) FROM hrm.companies WHERE deleted_at IS NULL GROUP BY tenant_id;
SQL
```

同时留存将被删除索引的原始定义：

```sql
SELECT indexname, indexdef FROM pg_indexes
 WHERE indexname IN ('uq_aux_balance','unique_aux_balance','idx_opening_balances_unique');
```

---

## 2. 迁移前只读预检（任何一项非空即先人工处理）

```sql
-- ① 新唯一键重复：vouchers
SELECT tenant_id, period, voucher_no, count(*), array_agg(id)
  FROM finance.core_finance_vouchers WHERE deleted_at IS NULL
 GROUP BY tenant_id, period, voucher_no HAVING count(*) > 1;

-- ② 新唯一键重复：aux（当前口径，迁移后会再加 company_id 维度，只会更宽松）
SELECT tenant_id, account_id, aux_type, aux_id, period, count(*)
  FROM finance.core_finance_aux_balances
 GROUP BY 1,2,3,4,5 HAVING count(*) > 1;

-- ③ 新唯一键重复：期初
SELECT tenant_id, company_id, subject_code, period, count(*)
  FROM erp.opening_balances GROUP BY 1,2,3,4 HAVING count(*) > 1;

-- ④ 有财务数据但 0 公司的租户（迁移会建 DEFAULT 公司，需确认业务可接受）
SELECT DISTINCT v.tenant_id
  FROM finance.core_finance_vouchers v
 WHERE v.tenant_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM hrm.companies c
                    WHERE c.tenant_id = v.tenant_id AND c.deleted_at IS NULL);

-- ⑤ 有财务数据且有多个公司的租户（迁移会直接失败，必须人工先指定归属）
SELECT v.tenant_id, count(DISTINCT c.id) AS companies
  FROM finance.core_finance_vouchers v
  JOIN hrm.companies c ON c.tenant_id = v.tenant_id AND c.deleted_at IS NULL
 GROUP BY v.tenant_id HAVING count(DISTINCT c.id) > 1;

-- ⑥ 期初余额 tenant_id 为空且公司查不到
SELECT o.id FROM erp.opening_balances o
  LEFT JOIN hrm.companies c ON c.id = o.company_id
 WHERE o.tenant_id IS NULL AND c.id IS NULL;
```

注意：预检 ⑤ 命中时迁移会 `RAISE EXCEPTION` 整体回滚 —— 这是预期行为，不要绕过，先补公司归属或确认单主体。

---

## 3. 部署执行顺序

1. **停写**：停掉 finance、erp 的 HTTP 写入入口与事件消费（含 CRM `ReturnCompleted` 到 finance 的订阅链），确认无在途事务。
2. **备份**：执行第 1 节全部命令。
3. **预检**：执行第 2 节，结果留档。
4. **迁移**：以单事务执行两个迁移文件（执行器需保证 `--single-transaction`）：

   ```bash
   psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 \
     -f database/migrations/20261108135000_p2a_single_ledger_convergence.sql
   psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 \
     -f database/migrations/20261108140000_p2a_company_dimension.sql
   ```

   第二笔必须等第一笔提交后再执行；两者各自独立可回退。
5. **起新版本**：启动包含 `company_id` 写入逻辑的新二进制（旧二进制不得再读该库写凭证）。
6. **冒烟与核对**：执行第 6 节。

---

## 4. 被删旧唯一键的回退重建 SQL

第二笔迁移第 7 步删除：

- `finance.core_finance_aux_balances.uq_aux_balance`（约束）
- `finance.core_finance_aux_balances.unique_aux_balance`（约束）
- `erp.opening_balances.idx_opening_balances_unique`（索引）

重建前**必须先查重**（新口径允许同租户同科目跨公司并存，直接重建会失败）：

```sql
SELECT tenant_id, account_id, aux_type, aux_id, period, count(*)
  FROM finance.core_finance_aux_balances
 GROUP BY 1,2,3,4,5 HAVING count(*) > 1;

SELECT company_id, subject_code, period, count(*)
  FROM erp.opening_balances
 GROUP BY 1,2,3 HAVING count(*) > 1;
```

确认无重复后重建：

```sql
CREATE UNIQUE INDEX uq_aux_balance
    ON finance.core_finance_aux_balances (tenant_id, account_id, aux_type, aux_id, period);
CREATE UNIQUE INDEX unique_aux_balance
    ON finance.core_finance_aux_balances (tenant_id, account_id, aux_type, aux_id, period);
CREATE UNIQUE INDEX idx_opening_balances_unique
    ON erp.opening_balances (company_id, subject_code, period);
```

> 旧键是约束（constraint），重建为唯一索引在唯一性语义上等价；若需要 `ON CONFLICT ON CONSTRAINT` 语法，改用：
> `ALTER TABLE finance.core_finance_aux_balances ADD CONSTRAINT uq_aux_balance UNIQUE (tenant_id, account_id, aux_type, aux_id, period);`

---

## 5. 迁移的完整回滚脚本（仅在止损点之前使用）

顺序与正向相反：

```sql
-- 1) 先恢复旧唯一键（见第 4 节查重）
-- 2) 删新索引与复合索引
DROP INDEX IF EXISTS finance.uq_voucher_company_period_no;
DROP INDEX IF EXISTS finance.uq_aux_balance_company;
DROP INDEX IF EXISTS erp.uq_opening_balance_company_period_subject;
DROP INDEX IF EXISTS finance.idx_voucher_tenant_company;
DROP INDEX IF EXISTS finance.idx_voucher_line_tenant_company;
DROP INDEX IF EXISTS finance.idx_ledger_tenant_company;
DROP INDEX IF EXISTS finance.idx_aux_balance_tenant_company;
DROP INDEX IF EXISTS erp.idx_opening_balances_tenant_company;
-- 3) 放开 NOT NULL
ALTER TABLE finance.core_finance_vouchers      ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE finance.core_finance_voucher_lines ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE finance.core_finance_ledger        ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE finance.core_finance_aux_balances  ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE erp.opening_balances               ALTER COLUMN tenant_id DROP NOT NULL;
-- 4) 删列（数据不可恢复，依赖备份）
ALTER TABLE finance.core_finance_vouchers      DROP COLUMN IF EXISTS company_id;
ALTER TABLE finance.core_finance_voucher_lines DROP COLUMN IF EXISTS company_id;
ALTER TABLE finance.core_finance_ledger        DROP COLUMN IF EXISTS company_id;
ALTER TABLE finance.core_finance_aux_balances  DROP COLUMN IF EXISTS company_id;
-- 5) 默认公司可保留（无害、幂等）；如需清理，仅删本次新建且无引用的 DEFAULT 公司
```

---

## 6. 止损点（哪一步之后只能前滚）

| 阶段 | 状态 | 可否回滚 |
|---|---|---|
| 迁移执行中任一步失败 | 单事务整体回滚，库与迁移前完全一致 | 可直接修复重跑 |
| 迁移 COMMIT 成功，新版本**尚未接流量** | 结构已变、无新数据 | 可回滚（第 5 节） |
| 迁移 COMMIT 成功 + 新版本**已写入任何 company 级凭证** | 出现跨公司同 `(tenant, account, aux)` 数据 | **只能前滚**：旧唯一键无法重建，回滚需先人工合并/删除数据 |
| 旧唯一键已删除（第 7 步，事务最后一步）且应用已写入 | 旧口径唯一性不再受保护 | **只能前滚** |

判据：只要旧键删除已提交，且此后写入过至少一条与既有行「同租户同科目同辅助」但不同公司的记录，即越过止损点。

默认公司插入是**增量且幂等**的（`ON CONFLICT (tenant_id, lower(code)) WHERE deleted_at IS NULL DO NOTHING`），不构成回滚障碍。

---

## 7. 部署后核对检查项

### 7.1 结构

```sql
-- 迁移记录
SELECT version, success FROM _sqlx_migrations
 WHERE version IN ('20261108135000','20261108140000');

-- 零遗漏
SELECT
 (SELECT count(*) FROM finance.core_finance_vouchers      WHERE company_id IS NULL) AS v_null,
 (SELECT count(*) FROM finance.core_finance_voucher_lines WHERE company_id IS NULL) AS l_null,
 (SELECT count(*) FROM finance.core_finance_ledger        WHERE company_id IS NULL) AS g_null,
 (SELECT count(*) FROM finance.core_finance_aux_balances  WHERE company_id IS NULL) AS a_null,
 (SELECT count(*) FROM erp.opening_balances WHERE company_id IS NULL OR tenant_id IS NULL) AS o_null;
-- 期望全 0

-- 新键存在
SELECT indexname FROM pg_indexes WHERE indexname IN (
 'uq_voucher_company_period_no','uq_aux_balance_company',
 'uq_opening_balance_company_period_subject',
 'idx_voucher_tenant_company','idx_voucher_line_tenant_company',
 'idx_ledger_tenant_company','idx_aux_balance_tenant_company',
 'idx_opening_balances_tenant_company');
-- 期望 8 行

-- 旧键已删
SELECT indexname FROM pg_indexes WHERE indexname IN
 ('uq_aux_balance','unique_aux_balance','idx_opening_balances_unique');
-- 期望 0 行

-- NOT NULL
SELECT conrelid::regclass, conname FROM pg_constraint
 WHERE conname LIKE '%company_id_not_null'
    OR conname = 'opening_balances_tenant_id_not_null';
```

### 7.2 数据一致性（对比备份基线）

- 各表行数与借贷合计（`total_debit/total_credit`、ledger `debit/credit`、aux 借贷余额）与 `baseline.txt` 完全一致；
- 只在 `hrm.companies` 新增了 `code='DEFAULT'` 行，且每个此前 0 公司的租户恰好 1 行；
- 不出现任何租户凭空多出第二家公司。

### 7.3 功能冒烟（生产只读环境用测试租户）

1. 发一条销售订单审批事件 → 生成凭证：
   - `company_id` 非空，且等于该租户唯一公司；
   - 分录 2 行（1122 借 / 6001 贷），借贷相等。
2. 重放同一事件 → 凭证数仍为 1（`ON CONFLICT` 命中，无重复）。
3. 凭证提交 → 审核 → 过账：
   - `finance.core_finance_ledger` 出现 2 行且带同一 `company_id`；
   - `finance.core_finance_aux_balances` 出现行，冲突键含 `company_id`。
4. 反过账 → aux 余额按公司隔离回滚，不误减其他公司。
5. 缺科目租户发事件 → 明确报「缺少会计科目」，且 0 张半截凭证。
6. 给测试租户建第二家公司后再发事件 → 报「存在多个公司主体，凭证缺少公司归属，拒绝生成」，不得静默归属。

### 7.4 日志与告警

部署后 30 分钟内检索，以下关键字应为 **0**：

- `无公司主体，无法生成凭证`
- `存在多个公司主体`
- `凭证缺少公司归属`
- `null value in column "company_id"`
- `duplicate key value violates unique constraint "uq_aux_balance"` / `unique_aux_balance`

若出现 `无公司主体`：说明该租户未被默认公司覆盖（通常是迁移后新建租户），需补建默认公司或走开户流程。

### 7.5 双账簿确认

- `erp.financial_vouchers` / `erp.voucher_items` / `erp.vouchers` 在停写后计数不再增长；
- 全仓已无其他服务直写 `finance.core_finance_*`（仅 finance 服务内部写）；
- CRM 退款、ERP 销售/采购等 7 处写点均已收敛到 finance 事件链。

---

## 8. 本次本地验证记录（供比对，不代表生产）

- 本地 `topems` 已按单事务应用两笔迁移；`company_id` 空值 0（vouchers 11、lines 20、ledger 4、aux 2）；
- 8 个新索引、5 个 NOT NULL 约束存在，3 个旧键已删除；
- 3 个有数据租户均归集到默认公司（原 1 家有 `COMP-000000000000`，另 2 家新建 `DEFAULT`）；
- P2a e2e 测试通过：事件 → 平衡分录 → 过账 → ledger/aux 有行；重放不重复；缺科目 fail-closed；
- 全量 pre-commit 门禁与 pre-push（fmt/check/clippy）通过。

> 本地为通过新唯一键，曾软删测试租户的 3 条重复草稿凭证；生产若有同类重复，按第 2 节预检命中后先清洗再迁移。
