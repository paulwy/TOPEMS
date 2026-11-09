# 迁移锚点与 `--defer` 机制治理设计

| 项 | 内容 |
|---|---|
| 文档日期 | 2026-11-09 |
| 状态 | 设计稿（未实施） |
| 范围 | 只读调研 + 设计文档；不改代码、不改迁移、不写生产库、不提交 |
| 主要输入 | `docs/quality/prod-schema-drift-2026-11-09.md`、`docs/quality/prod-window-execution-master-2026-11-06.md`、`docs/quality/prod-pending-migration-triage-2026-11-06.md` |
| 目标 | 从机制上修掉「锚点前移后，被 defer 的版本永久不可应用」这一系统性缺陷 |

## 0. 结论速览

1. 根因不是那 43 个文件，而是**筛选模型**：`apply-forward.sh` 把「待应用集合」定义为 `version > anchor` 的区间，而不是「仓库版本集合 − 账本成功集合」的差集。`anchor` 是单调前移的水位线，`--defer` 是只存在于单次命令的一次性参数，两者组合必然产生死信。
2. 43 个孤儿不是一次操作造成的，而是**多次上移/下移锚点之间缝隙的累积**：每次窗口为了跳过某些版本而下移锚点，扫到一批、defer 一批；下次窗口再用账本 max 作锚点，之前 defer 且低于新 max 的版本就永久消失。
3. 推荐方案是**方案 C：全量差集 + 处置台账（manifest）**，先用方案 A 的观测型门禁过渡。核心不变量是：

   `Repo14 = Applied ⊎ ToApply ⊎ Hold ⊎ Excluded ⊎ Superseded ⊎ Obsolete ⊎ Forwarded`

   其中 `⊎` 表示互斥并集，`Applied = Ledger14 ∩ Repo14`；`Forwarded` 表示旧文件永不应用、效果由某个新版本承接。账本不必为零差异，但**任何差异都必须有且只有一条带证据的处置记录**。
4. 存量 43 个孤儿**绝不允许重跑原文件**，只能走三条安全通道：声明排除、声明被取代/已过时、用新版本前向补丁。仍在缺失的功能缺口（MDM、rd、权限码等）已经或应当由 `20261109xxxxxx` 批次的新版本承接。
5. **最大的落地风险是顺序**：如果先切换「全量差集」算法、后登记处置，切换当天会把 27 个高于基线锚点的历史功能性迁移（28 个功能孤儿减去 `20261105145000`，后者低于基线锚点）一次性推入生产，其中包含 `20261105235800`、`20261107000028`、`20261107000032` 等禁止/数据敏感项。必须「先登记、后切换、先 dry-run、再窗口」。

---

## 1. 现状说清

### 1.1 参与组件

| 组件 | 位置 | 作用 | 关键行为 |
|---|---|---|---|
| 前向执行器 | `scripts/migration/apply-forward.sh` | prod/test 迁移唯一执行入口；按 `version > anchor` 扫描；单文件事务写账本 | 默认 anchor = 账本 `max(success)`；`--only` / `--defer` 为当次参数；`--prod` 做定向命名与高危语句双重校验 |
| 账本 | `_sqlx_migrations` | 已应用版本记录 | `version bigint PK`、`description text`、`installed_on timestamptz`、`success boolean`、`checksum bytea`、`execution_time bigint`；apply-forward 每次插入 `success=true`、`checksum=SHA-384(文件字节)`、`execution_time=0` |
| 仓库校验和 | `database/checksums.txt` | 仓库内文件完整性基线 | SHA-256；由 `validate.sh` 每次运行重写；只覆盖仓库，不连账本 |
| 静态校验 | `scripts/migration/validate.sh` | 文件名、顺序、幂等、down、单职责、checksums、可选账本差集 | 账本差集仅在设置 `DATABASE_URL` 时执行，且只是 **WARN** |
| 迁移静态门 | `scripts/check-migrations.mjs`、`scripts/check-migration-names.mjs` | 重复版本、命名、历史文件不可改（带豁免登记） | 不接触账本 |
| 账本-结构漂移门 | `scripts/ci/check-ledger-ddl-drift.sh` → `scripts/migration/check-ledger-ddl-drift.mjs` | 用 12 条断言（9 个源版本）检查「账本 success=t 但结构没到位」 | 只检查 `success=true` 的版本；**未入账版本显式 NOTE 跳过** |
| 基线完整性门 | `scripts/ci/check-baseline-integrity.mjs` | 基线资产 sha256、锚点单调、新增迁移 > 基线锚点、清单豁免 | 清单 `database/baseline/migrations_at_anchor.json` 固定了 592 个文件；最新基线锚点仍是 `20261105235700` |
| 基线生成 | `scripts/migration/gen-baseline.sh` | 从库导出 schema、账本、元数据；锚点对齐校验 | 有「≤ 锚点但不在账本/白名单」的硬检查，但只在**生成基线时**执行，且白名单是静态 16 条 |
| 生产部署 A | `scripts/deploy-prod.sh` | 实际使用的部署脚本 | 不执行迁移；只比较本地文件数与账本条数，**只提示不阻断** |
| 生产部署 B | `scripts/deploy/production-deploy.sh` | 旧的一键部署脚本 | 以**基线锚点**（`20261105235700`）调用 apply-forward，且未传 `--only` |
| 只读核对工具 | `scripts/db/verify_prod_ledger.sh` | 人工核对仓库 vs 账本差集 | 只读、不生成 INSERT；明确不建议手工补账本 |
| 准入/危险语句门 | `check-directed-migrations.mjs`、`check-destructive-sql.mjs`、`check-prod-migration-entry.mjs` | 定向命名、无守卫高危语句、prod 误跑 `sqlx migrate run` | 管「能不能执行这一条」，不管「有没有漏版本」 |
| 隔离目录 | `database/migrations-wip/`（6 个）、`database/migrations_deferred/`（3 个）、根目录 `migrations_deferred/`（3 个） | 人工隔离区 | 均不在活动链；只有 `database/migrations_deferred` 被 RLS 形状检查扫到，根目录那份没有任何门禁覆盖 |

### 1.2 待应用集合如何计算

`apply-forward.sh` 的实际算法（`scripts/migration/apply-forward.sh:162-201`）：

```text
for f in sorted(database/migrations/*.sql):
    v = version(f)
    if v <= anchor:                 # L166
        continue                    # 静默跳过，不打印、不告警
    if v in ledger(success=true):   # L169
        continue
    if --only 非空:                 # L173-179
        if v in --only:  pending
        elif v in --defer: deferred（保持 pending，但不阻断）
        else: 清单外 → exit 1
    else:
        pending
```

随后：

- `--prod` 对 pending 做定向命名与高危语句校验（`L181-199`）；`--allow-pending` 可绕过这两道校验。
- 每个文件在**单文件事务**内执行 SQL 并插入账本（`L269`、`L282`）；任一失败立即 `exit 1`，后续文件不再执行（`L262-265` 的事故复盘注释）。
- 结束时 anchor 实际上变成「本次最后应用的版本」；`--defer` 列表**不落盘、不校验、不传递**。

由此产生三个直接后果：

1. **锚点以下的未入账版本不可见**：`<= anchor` 一律 `continue`，连一行日志都没有。
2. **`--defer` 单独使用无效**：L173 的外层条件是 `#ONLY > 0`，没有 `--only` 时 `--defer` 根本不会被读取。
3. **要应用一个锚点以下的孤儿，唯一办法是把锚点下移**。下移会把整个区间重新变成 pending，逼着操作者每次重新写一份 `--defer`；这正是「靠人工记忆维护死信」的来源。

### 1.3 锚点实际上有三种定义

| 定义 | 取值来源 | 使用场景 | 后果 |
|---|---|---|---|
| 账本水位锚点 | `SELECT max(version) FROM _sqlx_migrations WHERE success`（`apply-forward.sh:114`） | 窗口默认 | 单调前移，跨过谁谁就永久不可见 |
| 基线锚点 | `database/baseline/anchors.json` 最新条目 = `20261105235700` | `scripts/deploy/production-deploy.sh:131` | 落后于生产账本（`20261105235700` vs `20261108141500`）；会把两者之间的历史 defer 重新当成 pending |
| 人工下移锚点 | 操作者显式 `--anchor`，例如窗口 15.0 用 `20261107000002` | 为了重新扫到锚点以下的 4 条 | 每次下移都要重列 defer；下移区间之外仍然不可见 |

窗口文档已经记录过这个冲突（`docs/quality/prod-window-execution-master-2026-11-06.md:818-829`）：用 max 锚点时，`--only` 里的 `000004` 被「未扫描到」拒绝；改用 `000002` 后才扫到 `000003–000018`。这说明锚点承担了两种互相冲突的职责：**防回放的下界**和**发现待办的扫描范围**。

### 1.4 现有校验各自做什么、漏什么

| 检查 | 校验什么 | 漏掉什么 |
|---|---|---|
| `checksums.txt` / `validate.sh` checksum 段 | 仓库文件与 `checksums.txt` 的 SHA-256 是否一致；文件是否被删除 | 与账本完全不比对；账本 checksum 是 SHA-384；`checksums.txt` 每次运行被重写，只有被 git diff 看见时才有审计意义 |
| `validate.sh` 账本段 | 设置 `DATABASE_URL` 时列出「仓库有、账本无」的文件 | 仅 WARN；CI 指向的是临时空库/测试库，不是生产；不区分定向/被取代/待决策；不按锚点过滤，输出是噪声 |
| `check-migrations.mjs` | 重复版本、命名、已提交文件内容不可改（豁免需登记） | 不接触账本；无法判断一条历史文件是否被生产应用过 |
| `check-ledger-ddl-drift.mjs` | 12 条精选断言：账本说已执行，则结构必须到位 | 只覆盖 9 个源版本；对「未入账」只打印 NOTE 后跳过；无法发现「仓库有、账本没有」，因为它把未入账当作正常场景 |
| `check-baseline-integrity.mjs` | 基线资产完整性；新增迁移必须 > **基线锚点**；清单内文件豁免 | 最新基线锚点 `20261105235700` 落后生产 `20261108141500`。清单内的 16 个（15 定向 + `20261105145000`）永久豁免；晚于基线创建的 27 个因版本 > 基线锚点被当作「合法新增」。两类都不与生产账本比对，43 个孤儿因此全部不可见；也无法发现新文件被放进 `20261105235701`–`20261108141500` 的空洞区 |
| `gen-baseline.sh` 锚点对齐 | `<= 锚点` 且不在账本/白名单 → **exit 1**（`gen-baseline.sh:84-99`） | 只在生成基线时运行；白名单静态 16 条，实际孤儿 43；没有理由、owner、期限，最省事的做法就是「把新孤儿加进白名单」，把漂移合法化 |
| `deploy-prod.sh` 账本预检 | 本地文件数与生产账本行数的差值，提示「多为定向迁移」 | 只比数量，不比版本集合；提示后继续部署，长期把 43 个缺口正常化（`scripts/deploy-prod.sh:210-218`） |
| `production-deploy.sh` | 以基线锚点跑 apply-forward | 会把 `20261105235701` 以上的历史 defer 重新纳入 pending；其中包含禁止应用的 `20261105235800` 与数据敏感的 `20261107000028/000032`。高危语句门只覆盖 DDL（`ALTER TYPE`、`DROP ... CASCADE` 等），**不覆盖 `DELETE`/`UPDATE` DML**，因此这两条数据迁移不会被拦下 |
| `verify_prod_ledger.sh` | 人工只读差集，给出定向判定建议 | 未接入 CI/部署；不能作为准入；其结论「不要手工 INSERT 账本」与「需要对账」之间没有落地通道 |
| `check-prod-migration-entry.mjs` | 禁止 prod 路径直接 `sqlx migrate run` | 只管入口，不管版本缺口 |

### 1.5 现状量化快照（2026-11-09，工作区口径）

| 项 | 值 | 来源/说明 |
|---|---|---|
| 仓库 14 位迁移 | 647 | 盘点时 636 + 本日新增 11 条 |
| 仓库全部迁移文件 | 661 | 647 + 14 个 3 位历史文件；`checksums.txt` 661 行 |
| 生产账本成功记录 | 607 | 593 个 14 位 + 14 个 3 位 |
| 生产锚点 | `20261108141500` | 盘点时账本 max |
| 文件有、账本无且 `<= 锚点` | **43** | 15 个定向 + 28 个功能性 |
| 文件有、账本无且 `> 锚点` | 11 | 本日新增，尚未窗口应用 |
| 当前仓库−账本总差 | 54 | 43 + 11；按未部署口径 |
| 最新基线锚点 | `20261105235700` | `database/baseline/anchors.json` |
| 基线迁移清单 | 592 个文件 | `migrations_at_anchor.json` |
| 基线静态白名单 | 16 条 | `gen-baseline.sh:52-69` |
| 漂移断言 | 12 条 / 9 个源版本 | `database/migration_drift_assertions.json` |

---

## 2. 失败模式归类

### 2.1 机制级失败模式

| 编号 | 失败模式 | 触发条件 | 后果 | 现有防线为何失效 |
|---|---|---|---|---|
| F1 | 锚点前移吞掉 defer | 某版本被 `--defer` 后，本次又应用了更高版本 | 该版本永久低于新 anchor，后续默认扫描不再看它 | 没有持久化 defer；没有「跳过即登记」约束 |
| F2 | 锚点下移只能救一个区间 | 为了应用旧孤儿显式 `--anchor` 到下移点 | 区间内所有版本重新变成 pending，必须重新列一份完整 defer；下一次窗口又可能漏 | defer 是命令参数，不是状态；没有清单 |
| F3 | 双锚点语义冲突 | 走 `production-deploy.sh`，用基线锚点 | 把基线之后、生产已跨过的历史 defer 重新当 pending，可能自动执行禁止/数据敏感迁移（`000028/000032` 是 DML，高危语句门看不到） | 两个入口没有统一语义；`--prod` 只做单条准入，不做集合对账 |
| F4 | CI 锚点落后生产 | 新增迁移版本落在 `20261105235701`–`20261108141500` | CI 认为「> 基线锚点」合法，生产却永远不应用，瞬间产生新孤儿（27 个晚于基线创建的功能孤儿就是这样产生的） | `check-baseline-integrity` 只比基线锚点；生产账本不参与 CI |
| F5 | 白名单无理由无期限 | 生成新基线时对齐失败 | 最省事路径是把新孤儿加入 `known_not_applied_versions`，漂移被合法化 | 白名单是裸版本数组，没有 reason/owner/expiry/证据 |
| F6 | 三套哈希互不校验 | 文件内容变更、手工补账本、基线恢复 | `checksums.txt`（SHA-256）、账本（SHA-384）、基线元数据各自成立但彼此不一致 | 没有跨层比对；`verify_prod_ledger.sh` 只读且不接入 |
| F7 | 静默不可见 | 任何 `<= anchor` 未入账 | 执行器零输出；只有 `gen-baseline` 或人工工具能看见 | `continue` 无日志；`validate.sh` 的差集是 WARN 且不指向生产 |
| F8 | 半应用中间态（相关） | 多文件依次执行时某条失败 | 账本半更新、结构中间态（2026-11-09 曾发生 `20261108135000` 失败后继续 `20261108140000`） | 已改为 fail-fast；但「账本=执行日志」的语义仍需与「效果账本」区分 |

### 2.2 43 个孤儿的业务归因

> 逐条核实见 `docs/quality/prod-schema-drift-2026-11-09.md` 附录 A 与 §4.3/§4.4；本表按「为什么会被 defer」归并，计数为 28 个功能性迁移（15 个定向迁移单列）。

| 类 | 计数 | 版本 | 为什么被 defer | 再次发生的条件 | 正确处置 |
|---|---|---|---|---|---|
| A. 策略性排除（定向迁移） | 15 | `20261103210000`、`20261103220000`、`20261103230000`、`20261104000000`–`20261104070000`、`20261105110000`、`20261105120000`、`20261105150000`、`20261105180000` | `dbNN_test` / `dbNN_5433` / `test_*` / `5433_*`，prod 本来就不允许应用 | 新定向迁移被放到 `> anchor` 且窗口没给 `--only`；或 `--allow-pending` 绕过高危校验 | `excluded` 永久登记，永不应用；文件可留在原处，但 manifest 必须覆盖；后续卫生批次可迁到统一隔离目录 |
| B. 已满足 / 被取代 / 部分满足 | 8 | `20261105145000`、`20261105235800`、`20261106000001`、`20261107000001`、`20261107000002`、`20261107000020`、`20261107000024`、`20261107000025` | 生产已存在等价结构；或后来被 `20261107000014/000016/20261108141500` 取代；或只有部分残余（3 个 write 码、菜单完整性） | 若试图「重跑对齐」，会重复 DDL/DML；若直接略过，残余缺口永远不被补 | 声明 `superseded` / `obsolete`（附证据与 `superseded_by`）；残余缺口用**新版本**前向补丁，不重跑原文件 |
| C. 依赖未就绪（链式阻塞） | 10 | `20261107000022`、`000023`、`000029`–`000031`、`000033`–`000036`、`000042` | MDM 表/列不存在、域管理员角色不存在、rd 列缺失；执行会报错或 `INSERT ... SELECT` 命中 0 行静默空转 | 批次边界处链条被切断；依赖项在下一窗口仍未就绪；锚点继续前移 | 用新版本前向补丁承接（本日 `9100100`–`9100400`、`9100600`–`9101200` 已承接 MDM/rd/RBAC 大部分；角色与种子仍待补） |
| D. 数据 / 产品口径待决 | 7 | `20261107000021`、`000026`、`000028`、`000032`、`000040`、`000041`、`000043` | 权限码需产品确认角色矩阵；ERP 客户清理、SCM 供应商软删、资产分类种子需业务拍板 | 决策迟迟不落；窗口为了赶发布把它 defer 后忘记 | `hold` 登记（owner + 期限 + 关联议题）；决策后一律新版本前向 DML，不重放旧文件 |
| E. 安全 / 合规暂缓 | 1（另 1 条与 B 重叠） | `20261107000015`；`20261105235800` 同时属于 B/E | RLS 系统上下文分支需安全评审；refresh token 特权函数已被回退 | 任何「全量重放」或基线锚点路径都会重新捡起它们 | `excluded` / `superseded`，永不自动应用；安全决策单独留档 |
| F. 结构清理（非功能必须） | 2 | `20261107000019`、`000027` | 0 行死表，代码已无引用；删不删不影响功能 | 清理批次被无限期推后；锚点跳过 | `obsolete` 或新版本清理；优先级低，但必须有明确状态 |

计数校验：A 15 + B 8 + C 10 + D 7 + E 1 + F 2 = 43；其中 `20261105235800` 同时具备 B/E 属性，按主类 B 计一次。

### 2.3 归因结论

1. 43 个孤儿中，**只有约 10 个是真正的「生产缺功能」**（C 类为主），其余是「不该应用」「已满足」「等决策」。因此把 43 个当作一个整体去「补跑」是错误的。
2. 每一次窗口的 `--defer` 都是**正确的局部决策**，错误在于没有一个跨窗口的状态来记住它们。
3. 现有门禁不是没有检查，而是**检查的锚点错了**：它们比的是「仓库 vs 基线锚点」或「账本 vs 精选断言」，不是「仓库 vs 生产账本全集」。
4. `anchor` 必须从「过滤器」降级为「防回放水位线」；待应用集合必须从「区间谓词」改成「集合差集」。

---

## 3. 备选方案

### 方案 A：只加门禁，不改流程（轻量）

- 新增一个只读对账门禁：`Repo14 − Ledger14`，其中生产账本以「提交在仓库的生产账本快照」形式提供；凡 `<= 快照 max` 且不在账本的文件，必须有 manifest 处置记录，否则 CI 阻断。
- 保留 `version > anchor` 的执行逻辑；额外加一条守卫：**本次要应用的版本 v，若存在 `< v` 且未分类的版本，拒绝执行**。
- 代价：1 个校验脚本 + 1 份快照 + manifest；不改账本；执行器只加一条前置守卫，主流程不变。
- 风险：存量 43 仍然不能被执行器安全吸收（只能靠人工另开窗口/下移锚点）；快照会过期；容易退化成「白名单门禁」；双锚点问题仍在。
- 侵入程度：低。适合作为第一批「观测模式」，不适合作为终态。

### 方案 B：锚点 + 持久化死信登记（中量）

- 把 `--defer` 从命令参数改为 `database/migration-holds.json`：每条 hold 必须带 reason、owner、expiry、关联议题；执行器在应用更高版本前读取它。
- 锚点仍作扫描下界，但增加「死信债」报表；每次窗口结束打印 `holds` 清单。
- 代价：执行器 + CI + 新数据文件；窗口流程增加「先写 hold 再应用」。
- 风险：`<= anchor` 的历史孤儿仍然扫不到，存量 43 需要一次性人工对账；hold 文件可能变成新的橡皮图章；没有解决「仓库 vs 生产账本」的 CI 可见性。
- 侵入程度：中。

### 方案 C：全量差集 + 处置台账（重量，推荐）

- 待应用集合改为 `Repo14 − Ledger14 − 非适用处置`（集合差集），锚点只做防回放水位线与基线用途。
- 每个仓库版本在 manifest 中有且只有一条处置：`applied`（账本已记录）/ `to_apply` / `hold` / `excluded` / `superseded` / `obsolete` / `forwarded`。
- CI 用「生产账本快照 + manifest」做三方对账；部署前用「实时账本 + manifest」做权威对账。
- 存量孤儿按 A/B/C/D/E/F 分类路由：排除、声明被取代、声明过时、挂起、或新版本前向补丁。
- 代价：执行器、CI、窗口 runbook、发布流程都要改；新增快照刷新职责。
- 风险：manifest 腐化、快照过期、账本语义被误改、切换顺序错误导致批量重放。
- 侵入程度：高，但能同时解决「发现、吸收、防复发」三件事。

### 方案 D：物理隔离活动链（可选，重量）

- 把 15 个定向迁移与明确被取代的文件移出 `database/migrations/`，活动目录只保留「本应可应用」的文件；差集自然收敛。
- 代价：历史链被物理拆分；checksums、基线清单、`sqlx` 兼容路径、CI 扫描范围全要改。
- 风险：移动一个其实仍需要的文件会造成永久缺链；对 `sqlx migrate run` 的语义影响最大；审计追溯变差。
- 侵入程度：高且不可逆感强。不建议作为主方案。

### 方案对比

| 维度 | A 只加门禁 | B 持久化 hold | C 全量差集 + 台账 | D 物理隔离 |
|---|---|---|---|---|
| 吸收存量 43 | 差（仍需人工另开窗口） | 中 | 好（分类路由） | 中（靠搬文件） |
| CI 提前发现 | 好（依赖快照） | 中 | 好（依赖快照 + 新文件版本校验） | 好（活动链天然收敛） |
| 防未来复发 | 中（只挡新增） | 中 | 好（不变量 + hold 期限 + 新文件规则） | 中（靠目录纪律） |
| 部署流程侵入 | 低 | 中 | 高 | 高 |
| 账本语义风险 | 无 | 低 | 中（必须坚持不手工补账本） | 高 |
| 实施成本 | 低 | 中 | 高 | 中高 |

---

## 4. 推荐方案：C（先用 A 过渡）

### 4.0 选型理由

- **只有 C 把「待办」从区间谓词改成集合运算**。只要还用 `version > anchor` 扫描，无论加多少门禁，都无法消除「锚点缝隙」；C 从根上让 `Repo − Ledger` 成为待办全集。
- **C 能安全吸收存量 43**：不是重跑，而是把每条差异路由到「排除 / 被取代 / 过时 / 前向承接 / 挂起」之一，并强制证据与 owner；A 和 B 都做不到这一点。
- **C 的代价集中在工程侧**：manifest、快照、CI、runbook 都是仓库内资产，不引入新的生产 DDL，也不改变账本表结构；相比 D 的物理搬文件，C 可回退、可审计。
- **A 作为过渡是必要的**：先用只读对账把 43+11 的差异「看见」，再切换执行器，避免一次性重放。

### 4.1 设计原则

1. **账本是「效果账本」，不是「执行日志」**：基线恢复一直是只恢复账本行、不重放 SQL，说明项目事实上已经采用效果语义。因此允许「生产效果已存在但未记账」，但**不允许**为了让差集归零而手工 INSERT 账本（延续 `verify_prod_ledger.sh` 的结论）。差异由 manifest 处置吸收，账本保持诚实。
2. **唯一水位线**：锚点只允许等于 `max(success)`；prod 禁止使用基线锚点作为扫描下界；禁止手工下移锚点。凡是「需要应用锚点以下的版本」的场景，一律改为新版本前向补丁。
3. **显式优于隐式**：所有差异必须被 manifest 命名；执行器对任何未分类版本 fail-closed。
4. **前向优于重放**：生产缺效果时发新版本（> max），不重跑历史文件。历史文件可能已修正过（`20261107000011/000025`）、可能含破坏性 DML（`000028/000032`）、可能是定向迁移。
5. **状态可过期**：`hold` 必须有 owner 与 expiry；过期即 CI/部署阻断，强制在下一个窗口解决。

### 4.2 核心不变量

设：

- `Repo14`：仓库 `database/migrations/*.sql` 中的 14 位版本集合。
- `Ledger14`：生产 `_sqlx_migrations` 中 `success=true` 的 14 位版本集合。
- `Applied = Ledger14 ∩ Repo14`；其余为 manifest 中的互斥处置集合：`ToApply / Hold / Excluded / Superseded / Obsolete / Forwarded`。

则不变量为：

```text
Repo14 = Applied ⊎ ToApply ⊎ Hold ⊎ Excluded ⊎ Superseded ⊎ Obsolete ⊎ Forwarded
Applied ∩ (ToApply ∪ Hold ∪ Excluded ∪ Superseded ∪ Obsolete ∪ Forwarded) = ∅
每个 ToApply 的版本 > 生产账本 max
每个 Hold 有 owner、reason、expiry（未过期）
每个 Superseded 有 superseded_by，且该版本在 Ledger14（已应用）
每个 Forwarded 有 forward_patch，且该版本 > 生产账本 max 并在 Repo14
每个 Excluded 有 reason 与证据类型
```

发布前额外要求：

```text
ExpiredHold = 0
未分类版本 = 0
ToApply 已按升序应用完毕（或显式 --dry-run）
FailedLedgerRows = 0
```

`success=false` 的账本行视为紧急状态：必须重试成功或从窗口备份恢复，不允许忽略，也不计入 `Applied`。

说明：这里的「强一致」指**差异全部被权威登记**，不是「差异必须为零」。这比强行让 `Repo14 = Ledger14` 更诚实，也避免了手工补账本带来的语义污染。

### 4.3 孤儿如何被安全纳入

四条路由，禁止第五条「直接重跑」：

| 路由 | 适用 | 动作 | 账本是否写入 | 证据要求 |
|---|---|---|---|---|
| R1 排除 | 15 个定向迁移；`20261107000015`（安全暂缓） | manifest 记 `excluded`；执行器即使被显式点名也拒绝 | 否 | 文件名规则 + 评审记录（安全类附决策文档） |
| R2 被取代 | `20261105235800`（被 `20261107000016` 回退）、`20261107000002`（被 `000014` 取代）、`20261107000024`（由 `20261108141500` 补齐）、`20261106000001`/`000001` 的 canonical 部分 | manifest 记 `superseded` + `superseded_by`；不应用 | 否（默认） | `superseded_by` 版本必须在账本；附结构/数据断言或漂移文档章节 |
| R3 已过时（效果已在） | `20261105145000`、`000020`、`000025`、`000019`/`000027` 的清理目标 | manifest 记 `obsolete`；不应用；必要时发新版本做清理 | 否（默认） | 结构/数据只读断言 + 结果快照 |
| R4 前向承接 | C 类依赖缺口、D 类决策后的 DML、B 类部分残余 | 旧文件记 `forwarded` + `forward_patch`；**旧文件永不应用**；效果由新版本 `> 生产 max` 承接，带存在性守卫与幂等 | 旧文件否；新版本是 | 新版本文件 + 验收 SQL；`forward_patch` 必须在 Repo14 且 > max |

**不写账本的理由**：手工写入的 `checksum` 无法与「真实执行」绑定（`verify_prod_ledger.sh` 已明确这一点）；而 manifest 已经提供了可审计的「为什么不入账」。只有在基线恢复场景（从生产账本导出 SQL）才写入账本行，那是真实记录的搬运，不是手工编造。

对必须「让账本归零」的组织诉求，可选一个**受控对账**模式：在单事务内执行「证据断言 + 插入账本行 + 写 `_migration_reconciliation`」，要求双人复核、记录证据 SQL 与结果。但推荐默认关闭，不作为主路径。

### 4.4 在 CI / 部署前如何发现

发现点分四层，越靠前成本越低：

| 层 | 触发 | 数据源 | 检查 | 阻断 |
|---|---|---|---|---|
| L1 开发者本地 | pre-commit / 手动 | 仓库 + manifest + 快照 | manifest schema；新增文件版本必须 > 快照 max；hold 字段完整 | 是（pre-commit） |
| L2 PR/CI | push / PR | 同上 | `Repo14` 全覆盖；`<= 快照 max` 的未入账版本必须是非 `to_apply` 处置；`> 快照 max` 的必须是 `to_apply` 或 `hold`；快照新鲜度；checksum 一致 | 是 |
| L3 部署前 | apply-forward 连接库后 | 实时账本 + manifest | 全量差集；未分类 = 0；排除项被显式点名则拒绝；hold 过期则拒绝；按版本升序应用 | 是（fail-closed） |
| L4 窗口后 | 窗口验收 | 实时账本 + manifest | 对账报告：`Repo = Applied ⊎ 非适用`；`ToApply=0`；差异清单与 manifest 完全一致；结构断言 | 是（窗口验收） |

生产账本快照（只读导出，不含业务数据）：

- 路径：`database/ledger/prod_ledger_snapshot.json`
- 字段：`generated_at`、`source`、`max_version`、`row_count`、`versions[]`（version 字符串、success、checksum、installed_on）、`sha256`
- 刷新时机：每个生产迁移窗口结束后、在同一个 PR 中刷新；任何新增迁移的 PR 必须基于最新快照
- 新鲜度规则：`generated_at` 超过 14 天，或落后于 `anchors.json` 最新 `generated_at`，CI 阻断并要求刷新

为什么不用 CI 直连生产：生产只读访问依赖 SSH 主机路径，CI 不应持有该凭据；快照是成本最低且可审计的替代。L3 的实时检查才是权威。

### 4.5 如何防止未来再出现不可应用版本

| 规则 | 内容 | 拦截点 |
|---|---|---|
| R-1 只增不减 | 新增迁移版本必须 `> 生产账本快照 max`；**新增文件落在快照 max 以下直接失败**，不设白名单例外 | pre-commit + CI |
| R-2 不得跳过未分类 | 应用版本 v 前，所有 `< v` 的版本必须已应用，或状态为非 `to_apply` 的已分类项；否则拒绝 | apply-forward |
| R-3 hold 有期限 | hold 必须 owner + reason + expiry + 关联议题；过期后 CI 与部署都阻断 | pre-commit + CI + deploy |
| R-4 唯一锚点 | prod 只允许 anchor = `max(success)`；删除/禁用「下移锚点」路径；基线锚点只用于建库，不用于部署扫描 | apply-forward + 部署脚本 |
| R-5 单一入口 | 移除 `production-deploy.sh` 的迁移能力，或强制其使用实时 max + 全量差集；保留 `deploy-prod.sh` 的只读预检并升级为阻断 | 部署脚本 |
| R-6 基线读 manifest | `gen-baseline.sh` 的锚点对齐改为读取 manifest 处置，删除静态 `KNOWN_NOT_APPLIED` | 基线生成 |
| R-7 哈希统一 | manifest 存 SHA-384（与账本一致）；CI 校验 repo 文件、manifest、账本快照三方一致 | CI |
| R-8 负例测试 | CI 固定夹具：新增一个 ≤ 快照 max 的文件、缺 manifest、hold 过期、显式传 excluded，必须分别失败 | CI |
| R-9 旁路收窄 | prod 的 `--allow-pending` 只允许绕过「清单缺失」，不得绕过 DDL 高危校验；该用法必须记录 reason 与操作人 | apply-forward |

### 4.6 为什么不是其他做法

- **不是简单重跑**：28 个功能迁移里，`000028/000032` 是数据清理/软删，`000022/000023` 依赖角色，`000036` 当年就有类型不匹配；重跑会报错、空转或改生产数据。
- **不是手工补账本**：会破坏「账本=真实执行/真实效果」的可信度，且 checksum 无法与执行绑定。
- **不是只改白名单**：把 43 条加进 `known_not_applied_versions` 能让 `gen-baseline` 通过，但只是把漂移写进另一个文件。
- **不是把文件搬走**：物理隔离会破坏历史链的可追溯性，且无法解决「生产缺效果」的 C/D 类。

---

## 5. 落地步骤与回退

### 5.0 排序原则（不可颠倒）

1. **先只读盘点与登记**（B0）：43 个全部有处置，11 个新版本标 `to_apply`。
2. **先观测门禁**（B1）：只报警、不阻断，验证数据源与快照可用。
3. **再改执行器**（B2）：在 scratch 克隆库上做正负例；prod 先 dry-run。
4. **再转阻断**（B3）。
5. **最后退役旧机制**（B4/B5）。

> 如果 B2 先于 B0，切换「全量差集」的当天，执行器会把 27 个 `> 基线锚点` 的历史**功能性**迁移一次性纳入 pending（28 个功能孤儿减去低于基线锚点的 `20261105145000`），其中包含禁止项与数据敏感项。这是本设计的第一号风险。

### 5.1 分批实施

#### B0 只读盘点与 manifest 草案

- 内容：已建立 `database/migration_manifest.yaml`（B0 登记产物，工作区未提交）。43 个逐条定状态：`excluded` 16 / `hold` 8 / `forwarded` 11 / `obsolete` 5 / `superseded` 3 / `applied` 0 / `to_apply` 0；另列 `pending_forward_patches` 11 条为 `to_apply`。每条含 `why_deferred`、`declared_objects`、`prod_presence`、`basis`、`evidence`（ledger/catalog/data/code/doc）、`precondition`。
- 验证：`LegacyOrphans = 43`；`NewPending = 11`；每条 `superseded` 的 `superseded_by` 在 `Ledger14`；每条 `hold` 有 owner/expiry/precondition；每条结论至少一条可核验证据；不得出现「按文件名猜」的条目。
- 失败中止：出现无法归类的版本，停下来问业务，不自行猜。
- 回退：manifest 只在工作区/分支，删除即可；不触碰生产。

#### B1 观测型门禁 + 账本快照

- 内容：新增只读快照导出与对账检查；接入 pre-commit/CI 但设为 **WARN**；输出四类计数（ledger / to_apply / hold / 非适用）。
- 验证：对当前工作区应报 54 个差（43+11），且 43 全部命中 manifest；对干净历史 commit 不误报；快照 sha256 可复算。
- 失败中止：任何一条「差集里出现 manifest 未覆盖版本」都视为登记遗漏，先补登记。
- 回退：移除检查或切回 WARN；快照文件可删除；不影响执行器与生产。

#### B2 执行器改造（全量差集 + manifest + hold）

- 内容：
  - 待应用集合 = `Repo14 − Ledger14`，再按 manifest 只保留 `to_apply`，按版本升序；
  - 读 manifest：`to_apply` 才进入队列；`excluded/superseded/obsolete/forwarded` 即使被 `--only` 点名也拒绝；`hold` 跳过但打印；
  - `--defer` 退役，替换为 manifest 的 `hold`；
  - `--anchor` 在 prod 仅允许等于实时 `max(success)`；
  - 应用 v 前检查所有 `< v` 未分类版本（R-2）；
  - 每个文件仍单事务、fail-fast；
  - 结束后打印对账摘要。
- 验证（必须在 scratch/克隆库 + stub，不动主开发库）：
  1. 正常场景：只应用 `to_apply`，账本行数与新增数一致；
  2. 负例 1：人为在 manifest 外放一个 `< 目标版本` 的文件 → 拒绝，零 DDL；
  3. 负例 2：显式 `--only` 一个 `excluded` → 拒绝；
  4. 负例 3：hold 过期 → 拒绝；
  5. 负例 4：`--anchor` 低于 max → prod 拒绝；
  6. 负例 5：文件 sha384 与 manifest 不一致 → 拒绝；
  7. 行为等价：账本已存在的版本仍然跳过；同一文件重复运行 0 次执行。
- 失败中止：任一负例未按预期失败，说明 fail-closed 未生效，停止，不上生产。
- 回退：`git revert` 执行器提交；保留旧脚本副本用于窗口；账本不因脚本回退而改变；若窗口内已发生错误应用，按既有窗口备份恢复（不删除账本行掩盖）。

#### B3 CI/部署阻断转正

- 内容：L1–L4 全部改为阻断；快照纳入仓库；新增迁移的 PR 必须刷新快照；`deploy-prod.sh` 预检从「数量提示」改为「版本集合 + manifest」阻断；`production-deploy.sh` 标记弃用。
- 验证：用固定夹具跑 4 个负例（R-1/R-2/R-3/R-8）；在真实 PR 上验证合法新迁移可通过；在部署 dry-run 上验证 `to_apply=0` 放行、`to_apply>0` 阻断。
- 失败中止：若快照刷新流程导致普通业务 PR 无法合并，暂停阻断、回到 WARN，先修流程。
- 回退：CI 策略回退；删除新增快照；`deploy-prod.sh` 预检回退为提示。生产不受影响。

#### B4 存量 43 收敛（按路由分批）

- 内容顺序：
  1. 先落 15 个 `excluded` 与 B/E 类 `superseded/obsolete`（纯文档/数据，不动库）；
  2. 再落 D 类 `hold`（owner + 期限）；
  3. 再落 C 类前向补丁（本日 `20261109100100`–`9100400`、`9100600`–`9101200` 已在工作区；角色/种子另批）；
  4. 最后处理 F 类清理（可选）。
- 验证：43 条全部有状态；`Repo14 − Ledger14` 与 manifest 的非 `applied` 集合逐项一致；C 类补丁在 scratch 上通过；`gen-baseline` 能在无静态白名单的情况下通过。
- 失败中止：若某条实际缺效果但尚无前向补丁，标 `hold` 并停下等决策（旧版本 ≤ max，不能标 `to_apply`），不强行标 `obsolete`。
- 回退：manifest 回退到上一版；前向补丁按标准窗口回退（补偿迁移/备份）；已执行的 DML 不做反向删除，按窗口备份恢复。

#### B5 退役旧机制与卫生收尾

- 内容：删除 `gen-baseline.sh` 的 `KNOWN_NOT_APPLIED`；移除 `--defer` 文档与用法；统一三个隔离目录（`migrations-wip`、`database/migrations_deferred`、根 `migrations_deferred`）为一个 `database/migrations_quarantine/` 并写 README + manifest；移除 `production-deploy.sh` 迁移路径。
- 验证：全仓 grep 无旧参数/旧白名单引用；CI 全绿；连续两个窗口对账为 0 未分类；`/health`、`/ready` 正常。
- 失败中止：任一旧脚本仍被引用，停止删除。
- 回退：保留旧脚本一个版本周期；目录移动用 `git mv` 可回退。

### 5.2 验收指标

| 指标 | 通过标准 |
|---|---|
| manifest 覆盖率 | 100% 的 14 位仓库版本有且只有一条处置 |
| 未分类差异 | 0 |
| 过期 hold | 0 |
| 新增文件落在快照 max 以下 | 0（由 R-1 拦截） |
| `gen-baseline` | 删除静态白名单后仍通过 |
| 负例门禁 | 新增低版本、未分类、过期 hold、显式排除项、非法锚点、checksum 不一致，全部按预期失败且零 DDL |
| 生产对账 | `Repo14 = Applied ⊎ 非适用`，差异清单与 manifest 逐行一致 |
| 部署预检 | `to_apply=0` 时放行；否则阻断并给出应用命令 |
| 审计 | 每个 hold/excluded/superseded 有 owner、日期、证据位置 |

### 5.3 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 切换顺序错误 | 一次性重放 27 个历史功能性迁移，含破坏性 DML | B0/B1 先行；B2 只在 manifest 100% 覆盖后启用；prod 先 dry-run；执行器对未分类 fail-closed |
| manifest 橡皮图章 | 批量把孤儿标 `excluded/obsolete`，漂移合法化 | 每条必须证据；`superseded` 需 `superseded_by` 在账本；双人复核；hold 有期限；定期抽样审计 |
| 快照过期 | CI 误绿，生产实际已跨过某版本 | 14 天/窗口刷新 SLA；L3 实时对账为权威；部署前必须用实时账本 |
| 双入口 | 旧部署脚本用基线锚点重新捡起禁止项 | B3 先改旧入口；B5 移除；期间在 `production-deploy.sh` 加硬阻断 |
| 账本被手工污染 | 后续无法信任 checksum/效果 | 默认禁止手工 INSERT；只允许基线导入；如需对账走受控模式 + 审计表 |
| 开发体验变差 | 新迁移被 R-1 频繁阻断 | 提供 manifest 生成器/模板；错误信息给出「请使用 > 快照 max 的版本」 |
| 隔离目录混乱 | 误以为 `migrations_deferred` 会被应用 | B5 统一目录 + README；CI 只认活动链 + manifest |
| 历史文件被修改 | 账本 checksum 与文件不一致 | R-7 三方哈希；沿用 `check-migrations` 的历史不可改门禁 |

### 5.4 边界（本设计不做）

- 不生成任何迁移文件、不改任何 SQL 字节、不写生产库、不重启服务。
- 不处理 owner/ACL 偏差、不处理运行期 DDL 影子表问题（另见对应文档）。
- 不决定 `000015`、`000028`、`000032`、`000026` 的业务口径；只把它们标为 hold 并留 owner。
- 不把 43 个孤儿一次性「清零」；清零是 B4 的持续收敛目标，不是切换前提。

---

## 6. 示意片段（仅说明结构，不作为实现）

### 6.1 manifest 结构示意

```json
{
  "schema_version": 1,
  "updated_at": "2026-11-09",
  "entries": [
    {
      "version": "20261107000028",
      "file": "20261107000028_cleanup_erp_customers_batch32.sql",
      "sha384": "<64 hex>",
      "status": "hold",
      "reason": "ERP 客户清理范围需业务确认",
      "owner": "erp-owner",
      "expiry": "2026-12-09",
      "evidence": { "type": "data_rows", "sql": "SELECT count(*) ...", "expected": 0 },
      "superseded_by": null,
      "forward_patch": null
    }
  ]
}
```

状态枚举：`applied`、`to_apply`、`hold`、`excluded`、`superseded`、`obsolete`、`forwarded`。`applied` 由账本/快照校验，不允许人工改；`forwarded` 必须带 `forward_patch`。

注意：`version` 在 JSON 中必须用**字符串**。14 位版本号超过 JS `Number.MAX_SAFE_INTEGER`，用数值会在解析时丢精度，导致对账误判。

### 6.2 待应用集合示意

```text
ledger = SELECT version FROM _sqlx_migrations WHERE success
repo   = 14-digit filenames
pending = repo - ledger - excluded - superseded - obsolete - hold - forwarded
require: every version in pending has status = to_apply
apply in ascending order
before applying v: all versions < v are in ledger or have a non-to_apply status
```

### 6.3 对账 SQL 示意（只读）

```sql
-- 生产侧：返回供快照使用的最小字段集
SELECT version, success, encode(checksum, 'hex') AS checksum, installed_on
FROM _sqlx_migrations
WHERE success
ORDER BY version;

-- 窗口后：账本中不应出现被排除版本的记录
SELECT version
FROM _sqlx_migrations
WHERE success
  AND version IN (<excluded_versions>);
-- 期望 0 行
```

### 6.4 证据断言示意

```sql
-- superseded/obsolete 的结构证据
SELECT to_regclass('finance.core_finance_accounts') IS NOT NULL;  -- 期望 t
-- 数据证据
SELECT count(*) FROM finance.core_finance_currencies;             -- 期望 16
-- 反向证据：禁止项的最终态
SELECT count(*) FROM pg_proc WHERE proname = '<privileged_function_name>'; -- 期望 0
```

---

## 7. 待决策项

| # | 决策 | 建议 | 影响 |
|---|---|---|---|
| 1 | 是否允许受控「对账写账本」 | 默认不允许；仅基线导入允许 | 决定账本语义与审计方式 |
| 2 | hold 的最长期限 | 30 天或「下一个变更窗口」，以先到者为准 | 决定 CI 阻断强度 |
| 3 | 快照刷新责任人 | 窗口执行人，窗口结束后同 PR 刷新 | 决定 CI 是否能发现漂移 |
| 4 | `production-deploy.sh` | 标记弃用并移除迁移能力 | 消除双锚点路径 |
| 5 | 隔离目录 | B5 统一为一个 quarantine 目录 | 仓库卫生 |
| 6 | `000015` 安全决策 owner | 安全/架构负责人 | 决定 excluded 还是后续补丁 |
| 7 | `000028/000032/000026` 数据口径 owner | ERP/SCM/资产域负责人 | 决定 hold → forward patch |

---

## 附录 A：43 个孤儿处置建议（28 个功能性逐条 + 15 个定向归组）

### A.1 定向迁移（15 条，统一 `excluded`，永不应用）

`20261103210000`、`20261103220000`、`20261103230000`、`20261104000000`、`20261104010000`、`20261104020000`、`20261104030000`、`20261104040000`、`20261104050000`、`20261104060000`、`20261104070000`、`20261105110000`、`20261105120000`、`20261105150000`、`20261105180000`。

### A.2 功能性迁移（28 条）

| 版本 | 文件 | 归因 | 建议状态 | 依据 / 前向目标 |
|---|---|---|---|---|
| 20261105145000 | finance_currency_master_fix | B 已满足 | obsolete | 表存在（16 行）；附只读计数 |
| 20261105235800 | iam_refresh_token_privileged_lookup | B/E 被取代 | superseded | 被 `20261107000016` 回退删除；`superseded_by=20261107000016` |
| 20261106000001 | permission_code_unify_bi_mes_wms | B 部分满足 | forwarded（→ 20261109100700） | canonical 码已存在；3 个 write 码由新版本承接 |
| 20261107000001 | iam_core_public_authority_sync | B 部分满足 | forwarded（→ 20261109100700） | 同上；残余码由新版本/RBAC 批次承接 |
| 20261107000002 | tenant_modules_tier_column | B 被取代 | superseded | 被 `20261107000014` 取代；`iam` 影子列不需要 |
| 20261107000015 | auth_rls_system_context_branch | E 安全暂缓 | excluded | 需安全评审；当前 owner 绕过 RLS 生效；留决策文档 |
| 20261107000019 | drop_communication_email_templates | F 清理 | obsolete | 表 0 行、代码无引用；可选新版本清理 |
| 20261107000020 | align_finance_payments_created_by_and_pm_tags | B 已满足 | obsolete | 列类型与声明链一致（diff 为空） |
| 20261107000021 | route_permission_gaps_batch27 | D 权限矩阵 | forwarded（→ 20261109100700） | `finance:account:read` 缺失；由新版本补码承接 |
| 20261107000022 | domain_manager_roles_batch28 | C 依赖缺口 | hold（待新版本） | 10 个域管理员角色缺失；需新版本创建角色 |
| 20261107000023 | domain_admin_code_grants_batch28 | C 依赖缺口 | hold（待新版本） | 依赖 `000022`；角色到位后新版本授权 |
| 20261107000024 | finance_admin_seed | B 已满足 | superseded（`20261108141500`） | `finance:admin` 已由锚点版本补齐并入账 |
| 20261107000025 | seed_menus_batch29 | B 部分满足 | hold（待完整性核对） | 抽查 4 个菜单组存在；与清单逐项比对后再定 forward/obsolete |
| 20261107000026 | seed_asset_categories_batch31 | D 种子内容 | hold（待新版本 seed） | `erp.asset_categories` 0 行；确定清单后新版本 seed |
| 20261107000027 | drop_dead_tables_batch31 | F 清理（部分执行） | obsolete | 备份表已不在基线；`erp.core_erp_suppliers`/`crm.core_crm_customers` 仍 0 行；可选新版本清理 |
| 20261107000028 | cleanup_erp_customers_batch32 | D 数据口径 | hold | 本地批 32 已 DELETE 5，但生产行数未确认；见漂移文档 §9 |
| 20261107000029 | create_mdm_supplier_master_batch32 | C 结构缺口 | forwarded（→ 20261109100100） | 新版本承接建表 |
| 20261107000030 | seed_mdm_supplier_master_batch32 | C/D 种子 | hold（待新版本 seed） | 依赖 `000029`；种子内容需确认；尚无对应 `9100500` |
| 20261107000031 | supplier_category_dict_and_backfill | C 结构缺口 | forwarded（→ 20261109100200） | 新版本承接字典与回填 |
| 20261107000032 | scm_supplier_null_no_soft_delete | D 数据口径 | hold | 纯 DML，软删口径需确认 |
| 20261107000033 | mdm_sync_dead_letter | C 结构缺口 | forwarded（→ 20261109100300） | 新版本承接死信表 |
| 20261107000034 | mdm_rename_asset_categories_to_data_asset_categories | C 结构缺口 | forwarded（→ 20261109100400） | 新版本承接改名（新旧双存在/双缺失守卫） |
| 20261107000035 | mark_mdm_suppliers_category_deprecated | C 注释依赖 | obsolete | 仅 COMMENT；非功能，可选并入后续补丁 |
| 20261107000036 | rd_deploy_formula_link_batch38 | C 结构/类型缺口 | forwarded（→ 20261109100600） | 新版本承接（含 `rs.formulas` 类型对齐） |
| 20261107000040 | finance_budget_perm_batch40 | D 权限矩阵 | forwarded（→ 20261109100700） | `finance:budget:write` 由新版本补码 |
| 20261107000041 | finance_submodule_perms_batch40 | D 权限矩阵 | forwarded（→ 20261109100700） | 7 个细码由新版本补码 |
| 20261107000042 | ai_comm_perm_grants_batch40 | C 角色依赖 | hold（待新版本） | 码存在但角色缺失；依赖 `000022` 角色批次 |
| 20261107000043 | finance_smallfiles_perms_batch41 | D 权限矩阵 | forwarded（→ 20261109100700） | 6 个小文件码由新版本补码 |

> 说明：本日新增的 11 条（`20261109100100`–`9100400`、`9100600`–`9101200`，其中 `9100500` 尚未创建）属于 `to_apply`，尚未窗口应用；它们承接了 C/D 类的大部分缺口，但不改变旧文件「不入账」的事实。旧文件仍需 manifest 处置，不能因为有了新补丁就当作已解决。

---

## 附录 B：关键证据索引

| 主题 | 位置 |
|---|---|
| 只扫 `> anchor` | `scripts/migration/apply-forward.sh:166` |
| 默认锚点 = 账本 max | `scripts/migration/apply-forward.sh:113-116` |
| `--defer` 仅在 `--only` 下生效 | `scripts/migration/apply-forward.sh:173-179` |
| `--only` 未扫描到即失败 | `scripts/migration/apply-forward.sh:203-214` |
| prod 双防线与 `--allow-pending` 旁路 | `scripts/migration/apply-forward.sh:181-199` |
| 单文件事务 + fail-fast | `scripts/migration/apply-forward.sh:262-291` |
| 账本插入与 SHA-384 | `scripts/migration/apply-forward.sh:253`、`:269`、`:282` |
| 账本差集仅 WARN | `scripts/migration/validate.sh:371-407` |
| checksums 自重写 | `scripts/migration/validate.sh:354-360` |
| 12 条断言 / 9 个源版本 | `database/migration_drift_assertions.json` |
| 未入账即 NOTE 跳过 | `scripts/migration/check-ledger-ddl-drift.mjs:11-15` |
| 新增文件 > 基线锚点 | `scripts/ci/check-baseline-integrity.mjs:13`、`:247-254` |
| 基线清单 592 文件 | `database/baseline/migrations_at_anchor.json` |
| 静态白名单 16 条 | `scripts/migration/gen-baseline.sh:52-69`；`database/baseline/baseline_20261105235700.json:13` |
| 锚点对齐硬检查 | `scripts/migration/gen-baseline.sh:84-99` |
| 部署只比数量并放行 | `scripts/deploy-prod.sh:210-218` |
| 旧部署用基线锚点 | `scripts/deploy/production-deploy.sh:131` |
| 基线锚点与清单 | `database/baseline/anchors.json:3-19` |
| 窗口下移锚点的教训 | `docs/quality/prod-window-execution-master-2026-11-06.md:808-829` |
| 43 个孤儿逐条核实 | `docs/quality/prod-schema-drift-2026-11-09.md:293-341` |
| 机制缺陷三条 | `docs/quality/prod-schema-drift-2026-11-09.md:79-83` |
| 手工补账本不可行 | `scripts/db/verify_prod_ledger.sh:12-20` |
| 隔离目录现状 | `database/migrations-wip/README.md`、`database/migrations_deferred/`、根 `migrations_deferred/` |

---

## 附录 C：高危语句门设计（DELETE / UPDATE / TRUNCATE / DROP COLUMN / DROP TABLE）

> 本附录只给设计、规则和**建议 diff 文本**。按用户要求，**未修改** `lefthook.yml`、`scripts/ci/check-destructive-sql.mjs`、`scripts/migration/apply-forward.sh`；另一个会话正在同一工作区提交/部署，避免索引冲突。落地时由单独窗口逐文件评审后再改。

### C.0 为什么现有门禁不够

现有 `scripts/ci/check-destructive-sql.mjs` 已覆盖：

- `ALTER TABLE ... ALTER COLUMN ... TYPE`
- `DROP TABLE ... CASCADE` / `DROP TABLE`
- `ALTER TABLE ... DROP COLUMN` / `DROP CONSTRAINT`

但它**不识别 DML 和 TRUNCATE**，且现有「守卫」口径是「语句前 60 行出现 `IF EXISTS`/`to_regclass`/`information_schema` 即放行」。这对 DDL 足够，对 DML 不够：

| 语句 | 现有门禁 | 真实风险 | 本附录新增规则 |
|---|---|---|---|
| `DELETE FROM erp.customers WHERE ...` | 不识别 | 固定 id 写错/漏写 `deleted_at` 条件 → 误删活跃行 | 必须 `WHERE` + 豁免标记 + `max-rows` + 备份 |
| `UPDATE scm.suppliers SET deleted_at=now() ...` | 不识别 | 软删范围写错 → 批量误软删 | 必须 `WHERE` + 豁免标记 + `max-rows` |
| `TRUNCATE table` | 不识别 | 全表清空、不可回滚感知 | **一律阻断**，无迁移内豁免 |
| `DROP COLUMN` | 识别，但 `IF EXISTS` 即放行 | 列数据永久丢失；`IF EXISTS` 只防报错不防丢数据 | 增加「0 行/已备份」标记 |
| `DROP TABLE` | 识别，但 `IF EXISTS` 即放行 | 整表数据永久丢失 | 增加显式 schema + `rows-at-review=0` + 备份标记；禁止 `CASCADE` |

关键点：`--allow-pending` 当前能绕过 prod 双防线（`apply-forward.sh:181-199`），这对 DDL 已是隐患，对 DML 更危险。**新规则下 `--allow-pending` 不再能绕过破坏性门禁**，必须使用独立的、按版本白名单的 `--allow-destructive`，并绑定变更单号。

### C.1 拦截范围（哪些文件）

| 层 | 触发 | 扫描范围 | 阻断方式 |
|---|---|---|---|
| L1 本地 pre-commit | `lefthook.yml` 的 `migration-prod-guard`（已存在，`:253-263`） | `git diff --cached --diff-filter=ACM` 命中的 `database/migrations/*.sql`，以及 `database/migrations-wip/**`、`migrations_deferred/**`（新增纳入） | 任一违规 → hook 失败，提交被拒 |
| L2 CI | `.github/workflows/ci.yml:1931`（已调用脚本，无需新增 job） | `database/migrations/*.sql` 全量；第二阶段扩到 `svc/*/migrations/*.sql` | 新增/修改文件违规 → job 失败；历史文件仅报告 |
| L3 生产运行时 | `scripts/migration/apply-forward.sh:190` | **本次即将执行的每一个文件**（不区分版本高低；锚点被下移时同样生效） | `--strict` 下任一违规 → `exit 1`，该文件不进入事务 |

补充规则：

1. **运行时不得使用 CI 的「历史基线放行」**。历史文件在 CI 里可以只报告，但只要它进入 `pending`（例如有人再次下移锚点），L3 必须按新文件标准重新判定。这是本设计与现有门禁最重要的区别。
2. `database/migrations-wip/`、`database/migrations_deferred/`、根 `migrations_deferred/` 也应扫描：它们是「暂存区」，最容易在未来被复制回活动链。
3. `svc/*/migrations/` 的服务内迁移当前不在本脚本范围；第二阶段用重复 `--dir` 纳入，避免只守 `database/migrations` 一个入口。

### C.2 规则矩阵

| 编号 | 语句 | 静态判定 | 必须满足（全部） | 默认结论 |
|---|---|---|---|---|
| D1 | `DELETE FROM` | 语句以 `DELETE FROM` 开头（避免把 FK 的 `ON DELETE` 误判） | ① 有 `WHERE`；② 无 `WHERE TRUE` / `1=1` / `OR TRUE`；③ 语句前 12 行内有完整豁免标记；④ `max-rows` 为正整数（允许 0）；⑤ `backup` 非空 | 缺任一 → 阻断 |
| D2 | `UPDATE ... SET` | 语句以 `UPDATE <table> SET` 开头 | 同 D1；另加：`SET` 中若出现 `deleted_at`/`is_deleted`/`status`，`max-rows` 必须显式 ≤ 预期行数 | 缺任一 → 阻断 |
| D3 | `TRUNCATE` | `TRUNCATE [TABLE]` | 无迁移内豁免；不允许标记 | **一律阻断** |
| D4 | `DROP COLUMN` | `ALTER TABLE ... DROP [COLUMN]` | ① `IF EXISTS`；② 无 `CASCADE`；③ 标记含 `rows-at-review=0` 或 `backup`；④ 显式 schema.table | 缺任一 → 阻断 |
| D5 | `DROP TABLE` | `DROP TABLE` | ① `IF EXISTS`；② 无 `CASCADE`；③ 显式 `schema.table`；④ 标记含 `rows-at-review=0` 且 `backup` 非空 | 缺任一 → 阻断 |
| D6 | `ALTER COLUMN TYPE` / `DROP CONSTRAINT` | 沿用现有检测 | 沿用现有 60 行守卫窗口 | 保持现状 |

**为什么 D1/D2 需要标记而不是「有 WHERE 就放行」**：生产事故里最常见的不是「没有 WHERE」，而是「WHERE 条件写错但仍能匹配多行」。标记强制作者写清楚：删/改多少行、依据是什么、谁批准、什么时候失效、备份在哪。静态门禁无法证明 SQL 语义正确，但能强制这些信息进入评审视野。

**D3 为什么绝对阻断**：`TRUNCATE` 不写 WAL 行级日志、不能带 `WHERE`、会重置 identity，且容易在长事务里造成锁等待。迁移里需要「清空」时应改为：

1. 新表 + 双写 + 切读 + 0 行核对 + `DROP TABLE IF EXISTS`；或
2. `DELETE FROM ... WHERE <固定条件>` + 标记 + `max-rows`。

两条都比 `TRUNCATE` 可审计、可回退。

### C.3 豁免标记（唯一合法形式）

标记必须是**紧邻语句之前、连续 8 行、无空行**的注释块；一个标记只授权**紧随其后的第一条语句**。解析器只认下列字段名，字段顺序固定（便于 review 和正则解析）。

```sql
-- destructive-gate: allow
-- destructive-kind: DELETE
-- destructive-reason: 清理批 32 已软删的 5 行 B1 验收客户（固定 id 白名单）
-- destructive-owner: erp-data-owner
-- destructive-ticket: TOPEMS-DRIFT-2026-11-09
-- destructive-expires: 2026-12-31
-- destructive-max-rows: 5
-- destructive-backup: docs/audit/batch31_erp_customers_20261107_063242.csv
DELETE FROM erp.customers
WHERE id IN ('b6a1bb76-...', '8d173214-...', ...)
  AND deleted_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM erp.sales_orders so WHERE so.customer_id = erp.customers.id);
```

字段规则：

| 字段 | 必填 | 规则 |
|---|---|---|
| `destructive-gate` | 是 | 固定值 `allow`，否则视为无标记 |
| `destructive-kind` | 是 | `DELETE` / `UPDATE` / `DROP COLUMN` / `DROP TABLE`；`TRUNCATE` 不接受 |
| `destructive-reason` | 是 | ≥10 个字符，必须说明「删/改哪些行、为什么」 |
| `destructive-owner` | 是 | 数据/域 owner 的稳定标识（不用个人姓名） |
| `destructive-ticket` | 是 | 变更单/事故单号；运行时必须与 `PROD_CHANGE_TICKET` 完全一致 |
| `destructive-expires` | 是 | ISO 日期；不得早于当天，且不得超过提交日 + 180 天 |
| `destructive-max-rows` | DELETE/UPDATE 必填 | 非负整数；运行时执行后核对 `GET DIAGNOSTICS` 受影响行数，超过即回滚 |
| `destructive-rows-at-review` | DROP TABLE/COLUMN 必填 | 必须为 `0`（评审时实测 0 行） |
| `destructive-backup` | DELETE/UPDATE/DROP 必填 | 备份文件路径或备份表名；必须存在于仓库/基线记录中 |

运行时额外要求：

- `apply-forward.sh --allow-destructive=<version>` 才允许执行带标记的 DML；未传该参数时，即使标记完整也拒绝。
- 该参数只对 `<version>` 精确生效，不支持逗号列表/通配。
- `PROD_CHANGE_TICKET` 必须与标记的 `destructive-ticket` 一致；不一致 → 拒绝。
- `TRUNCATE` 无任何运行时开关。
- 执行后比对实际行数与 `max-rows`；超限 → 同一事务内 `ROLLBACK`（`apply-forward` 已是单文件事务，抛错即可）。

### C.4 历史基线（grandfather）准入

`destructive-sql-baseline.json` 仍然是「历史文件仅报告」的载体，但生成时必须过两道闸：

1. 文件版本必须满足下列之一：
   - 已在生产账本 `success=true`（历史已执行，重放风险由锚点机制隔离）；或
   - 在 `database/migration_manifest.yaml` 的 `entries` 中，且 `disposition ∈ {excluded, superseded, obsolete, forwarded, hold}`。
2. 文件**不得**是 manifest 的 `to_apply`，也不得是 `pending_forward_patches` 中的版本。

这样即使有人执行 `--write-baseline`，也无法把「将来要应用的危险文件」洗成「历史只报告」。`TRUNCATE` 额外收紧：只有已在账本中 `success=true` 的文件可进入基线；任何未入账文件出现 `TRUNCATE` 都不得写入基线。

由于 Node 侧没有 YAML 依赖，建议用**受控正则**读取 manifest（只读 `entries:` 段，不解析 `pending_forward_patches`），而不是引入新依赖：

```js
// 只读取 entries 段的 version + disposition；文件结构由 CI 自身保证
function readManifestDispositions(manifestPath) {
  const text = readFileSync(manifestPath, 'utf-8').split('\npending_forward_patches:')[0];
  const out = new Map();
  const re = /- version:\s*"(\d{14})"[\s\S]*?disposition:\s*(\w+)/g;
  for (const m of text.matchAll(re)) out.set(m[1], m[2]);
  return out;
}
```

### C.5 失败提示（逐字建议）

本地/CI：

```text
❌ 迁移破坏性语句门禁未通过（DESTRUCTIVE_SQL_GATE）
文件：database/migrations/20261109101300_xxx.sql:42
类型：DELETE（D1）
拒绝码：DESTRUCTIVE_DELETE_NO_WHERE

语句：DELETE FROM erp.customers WHERE deleted_at IS NOT NULL;

为什么被拦：
  DELETE 命中 erp.customers（活跃表），但没有可审计的固定行条件；
  现有 WHERE 可能匹配多行，且没有豁免标记/行数上限/备份。

怎么修（二选一）：
  1) 改成固定主键白名单 + 业务条件：
       WHERE id IN (...) AND deleted_at IS NOT NULL AND NOT EXISTS (...)
  2) 若确实需要清理，在语句前紧邻 8 行加豁免标记（见下），并同时提供备份。

豁免标记模板：
  -- destructive-gate: allow
  -- destructive-kind: DELETE
  -- destructive-reason: <≥10 字，说明删哪些行、为什么>
  -- destructive-owner: <域 owner>
  -- destructive-ticket: <变更单号>
  -- destructive-expires: <YYYY-MM-DD，≤180 天>
  -- destructive-max-rows: <预期行数>
  -- destructive-backup: <备份路径或备份表>

禁止项：TRUNCATE 不接受任何迁移内豁免；请改用 DELETE+WHERE 或新表切换。
```

生产运行时：

```text
DENY(prod-strict): destructive SQL not approved
  version : 20261109101300
  file    : database/migrations/20261109101300_xxx.sql:42
  kind    : DELETE
  ticket  : <标记 ticket> / 环境 PROD_CHANGE_TICKET=<空或不一致>

本次不会执行该文件，也不会写入账本。
如确需执行：
  1) 变更单号已审批；
  2) 设置 PROD_CHANGE_TICKET=<同一单号>；
  3) 显式传 --allow-destructive=20261109101300；
  4) 标记中的 max-rows 必须是本次预期行数。
TRUNCATE 不提供开关。
```

### C.6 建议 diff（仅文本，不落盘）

#### C.6.1 `scripts/ci/check-destructive-sql.mjs`

```diff
@@
-const GUARD_WINDOW_LINES = 60; // 守卫回看行距阈值（同文件内）
+const GUARD_WINDOW_LINES = 60; // 守卫回看行距阈值（同文件内）
+const MARKER_WINDOW_LINES = 12; // 豁免标记必须紧邻语句之前
@@
 const checkFileIdx = args.indexOf('--check-file');
 const CHECK_FILE = checkFileIdx >= 0 ? args[checkFileIdx + 1] : null;
+const STRICT_MODE = args.includes('--strict');
+const DIRS = args.reduce((acc, a, i) => (a === '--dir' ? acc.concat(args[i + 1]) : acc), []);
@@
 const DETECTORS = [
+  {
+    kind: 'delete_from',
+    re: /^\s*DELETE\s+FROM\b/i,
+    hint: 'DELETE 必须有固定行条件 WHERE，并在语句前 12 行内提供完整豁免标记',
+  },
+  {
+    kind: 'update_set',
+    re: /^\s*UPDATE\s+[\w".]+\s+SET\b/i,
+    hint: 'UPDATE 必须有固定行条件 WHERE，并在语句前 12 行内提供完整豁免标记',
+  },
+  {
+    kind: 'truncate',
+    re: /^\s*TRUNCATE\s+(?:TABLE\s+)?/i,
+    hint: 'TRUNCATE 一律阻断：改用 DELETE+WHERE 或新表切换',
+  },
@@
   {
     kind: 'drop_table',
     re: /\bDROP\s+TABLE\b/i,
-    hint: '加 IF EXISTS（DROP TABLE IF EXISTS）并显式声明目标 schema',
+    hint: '加 IF EXISTS + 显式 schema + rows-at-review=0 + backup 标记；禁止 CASCADE',
   },
 ];
+
+const MARKER_START = '-- destructive-gate: allow';
+const REQUIRED_MARKER_FIELDS = [
+  'destructive-kind', 'destructive-reason', 'destructive-owner',
+  'destructive-ticket', 'destructive-expires',
+];
+
+function parseMarker(lines) {
+  const block = lines.join('\n');
+  if (!block.includes(MARKER_START)) return null;
+  const marker = { 'destructive-gate': 'allow' };
+  for (const line of lines) {
+    const m = line.match(/^--\s*(destructive-[a-z-]+):\s*(.+)$/);
+    if (m) marker[m[1]] = m[2].trim();
+  }
+  for (const f of REQUIRED_MARKER_FIELDS) if (!marker[f]) return { invalid: `缺少 ${f}` };
+  if (marker['destructive-gate'] !== 'allow') return { invalid: 'destructive-gate 必须为 allow' };
+  if (!/^\d{4}-\d{2}-\d{2}$/.test(marker['destructive-expires'])) {
+    return { invalid: 'destructive-expires 必须是 YYYY-MM-DD' };
+  }
+  const today = new Date().toISOString().slice(0, 10);
+  if (marker['destructive-expires'] < today) return { invalid: '豁免标记已过期' };
+  const kind = marker['destructive-kind'];
+  if (kind === 'TRUNCATE') return { invalid: 'TRUNCATE 不接受豁免标记' };
+  if (kind === 'DELETE' || kind === 'UPDATE') {
+    const n = Number(marker['destructive-max-rows']);
+    if (!Number.isInteger(n) || n < 0) return { invalid: '缺少或非法 destructive-max-rows' };
+    if (!marker['destructive-backup']) return { invalid: '缺少 destructive-backup' };
+  }
+  if (kind === 'DROP TABLE' || kind === 'DROP COLUMN') {
+    if (marker['destructive-rows-at-review'] !== '0') return { invalid: 'destructive-rows-at-review 必须为 0' };
+    if (!marker['destructive-backup']) return { invalid: '缺少 destructive-backup' };
+  }
+  return marker;
+}
+
+function hasDangerousWhere(code) {
+  if (!/\bWHERE\b/i.test(code)) return false;
+  return /\bWHERE\s+(?:TRUE|1\s*=\s*1)\b|\bOR\s+(?:TRUE|1\s*=\s*1)\b/i.test(code);
+}
+
+function isGrandfathorable(relPath, manifest) {
+  const version = basename(relPath).split('_')[0];
+  const status = manifest.get(version);
+  if (!status) return false;
+  return ['excluded', 'superseded', 'obsolete', 'forwarded', 'hold'].includes(status);
+}
@@
-function scanFile(path, relPath) {
+function scanFile(path, relPath, opts = {}) {
   const raw = readFileSync(path, 'utf-8');
   const stmts = splitStatements(raw);
   const codeLines = stmts.length === 0 ? [] : buildCodeLines(raw);
+  const rawLines = raw.split('\n');
   const hits = [];
   for (const st of stmts) {
@@
-    for (const d of DETECTORS) {
+    const leadLines = rawLines.slice(Math.max(0, lineNo - 1 - MARKER_WINDOW_LINES), lineNo - 1);
+    const marker = parseMarker(leadLines);
+    for (const d of DETECTORS) {
       if (!d.re.test(stmtCode)) continue;
+      if (d.kind === 'delete_from' || d.kind === 'update_set') {
+        if (!/\bWHERE\b/i.test(stmtCode) || hasDangerousWhere(stmtCode)) {
+          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_missing_where`, hint: d.hint, snippet: st.text.slice(0, 160) });
+          break;
+        }
+        if (!marker || marker.invalid) {
+          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_no_marker`, hint: d.hint, snippet: st.text.slice(0, 160) });
+          break;
+        }
+        continue;
+      }
+      if (d.kind === 'truncate') {
+        hits.push({ file: relPath, line: lineNo, kind: d.kind, hint: d.hint, snippet: st.text.slice(0, 160) });
+        break;
+      }
       const from = Math.max(0, lineNo - GUARD_WINDOW_LINES - 1);
       const windowCode = codeLines.slice(from, st.endLine).join('\n') + '\n' + stmtCode;
       const guard = guardInfo(windowCode);
       if (guard) continue;
+      if ((d.kind === 'drop_table' || d.kind === 'drop_column') && (!marker || marker.invalid)) {
+        hits.push({ file: relPath, line: lineNo, kind: d.kind, hint: d.hint, snippet: ... });
+        break;
+      }
@@
 if (CHECK_FILE) {
@@
-  const { hits } = scanFile(abs, CHECK_FILE);
+  const { hits } = scanFile(abs, CHECK_FILE, { strict: STRICT_MODE });
@@
-const entries = readdirSync(MIG_DIR, { withFileTypes: true })
-  .filter((e) => e.isFile() && e.name.endsWith('.sql'))
-  .map((e) => e.name)
-  .sort();
+const scanDirs = DIRS.length > 0 ? DIRS : [MIG_DIR];
+const entries = scanDirs.flatMap((dir) =>
+  readdirSync(dir, { withFileTypes: true })
+    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
+    .map((e) => join(dir, e.name))
+).sort();
@@
-  const base = baselineFiles[relPath];
-  const same = base && base.sha256 === digest;
+  const base = baselineFiles[relPath];
+  const same = base && base.sha256 === digest && isGrandfathorable(relPath, manifest);
```

说明：上面为设计级 diff，省略了 `snippet` 拼装和 `manifest` 变量初始化（应在全量扫描前读取 `database/migration_manifest.yaml`）。落地时以一个完整的 PR 实现，不拆成半截代码。

#### C.6.2 `scripts/ci/destructive-sql-baseline.json`

```text
不手工编辑。
1) 先按 C.6.1 完成脚本；
2) node scripts/ci/check-destructive-sql.mjs --report > /tmp/destructive-before.txt
   人工确认新增命中集中在历史文件、且没有 pending_forward_patches；
3) node scripts/ci/check-destructive-sql.mjs --write-baseline
4) git diff scripts/ci/destructive-sql-baseline.json
   基线文件数会从 25 增至约 130-150（DML/DROP 检测新增），属预期；
   若出现 20261109* 文件，立即停止并修脚本/标记，不得提交。
```

#### C.6.3 `scripts/migration/apply-forward.sh`

```diff
@@ L181-199（现状：--only / --allow-pending 会整体跳过 prod 双防线）
-  if [[ $PROD -eq 1 ]] && { [[ ${#ONLY[@]} -gt 0 ]] || ! is_allowed_pending "$v"; }; then
-    # 防线 1：定向迁移命名（prod 不允许）
-    if [[ "$b" =~ $DENY_RE ]]; then
+  if [[ $PROD -eq 1 ]]; then
+    # 防线 1：定向迁移命名；--only 或 --allow-pending 只豁免这一层
+    if [[ "$b" =~ $DENY_RE ]] && ! { [[ ${#ONLY[@]} -gt 0 ]] || is_allowed_pending "$v"; }; then
       DENIED+=("$b [定向迁移命名]")
       continue
     fi
-    # 防线 2：无守卫高危语句（与 CI 检查同口径）
+    # 防线 2：破坏性语句（始终执行；--only/--allow-pending 不得绕过）
     if command -v node >/dev/null 2>&1; then
       guard_log="/tmp/topems_guard_${v}.log"
-      if ! node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" >"$guard_log" 2>&1; then
+      if ! node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" --strict >"$guard_log" 2>&1; then
         cnt="$(grep -c '^  L[0-9]' "$guard_log" 2>/dev/null || true)"
         DENIED+=("$b [破坏性语句 ${cnt:-0} 条]")
         continue
       fi
     else
       DENIED+=("$b [无法校验：node 缺失，拒绝在 prod 应用]")
       continue
     fi
   fi
```

注意：只把 `--check-file` 加 `--strict` 是不够的——`L181` 的短路条件会让 `--allow-pending` 版本根本进不到这段代码。上面的 diff 把「命名豁免」和「破坏性门禁」拆成两层，才是真正堵住旁路。

另外新增参数（伪代码）：

```text
--allow-destructive=<version>
  仅对该 version 生效；要求：
    - 文件带完整豁免标记
    - PROD_CHANGE_TICKET 与标记 destructive-ticket 一致
    - TRUNCATE 一律拒绝
  执行后核对受影响行数 ≤ destructive-max-rows，超限回滚
```

#### C.6.4 `lefthook.yml`

现有 `migration-prod-guard` 已调用脚本（`:253-263`），**不需要新增命令**；只需把 manifest 纳入触发路径，保证 manifest 状态变化时门禁重跑：

```diff
@@
-        STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E "^database/migrations/.*\.sql$|^scripts/ci/check-(directed|destructive)-sql\.mjs$|^scripts/ci/destructive-sql-baseline\.json$" || true)
+        STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E "^database/migrations/.*\.sql$|^database/migration_manifest\.yaml$|^scripts/ci/check-(directed|destructive)-sql\.mjs$|^scripts/ci/destructive-sql-baseline\.json$" || true)
```

#### C.6.5 `.github/workflows/ci.yml`

`migration-test` 已在 `:1931` 调用 `node scripts/ci/check-destructive-sql.mjs`，**不需要新增 job**。可选增强：

```diff
@@
-        run: node scripts/ci/check-destructive-sql.mjs
+        run: node scripts/ci/check-destructive-sql.mjs --report
@@
+      - name: Destructive SQL gate (blocking)
+        run: node scripts/ci/check-destructive-sql.mjs
```

即先出一份全量报告便于排障，再跑阻断档；是否拆成两步取决于 CI 日志可读性。当前一步跑法已可阻断，**不是必须改动**。

### C.7 落地顺序（建议单独窗口执行）

1. 先加检测器和标记解析（不启用 `--strict`），跑 `--report`，人工核对新增命中清单。
2. 用 `--write-baseline` 固化历史文件；核对基线里没有 `20261109*`、没有 manifest `to_apply`。
3. 在 `apply-forward.sh` 切 `--strict`，先在 test/5433 库跑 3 个用例：无 WHERE 的 DELETE、带完整标记的 DELETE、TRUNCATE。
4. 再改 `lefthook.yml` 触发路径；CI 保持现有 job，先观察一次全绿。
5. 最后才允许生产窗口使用 `--allow-destructive`（逐版本、带变更单）。

### C.8 回退

| 故障 | 回退动作 |
|---|---|
| 误拦历史文件 | 从基线恢复对应 `sha256` 条目；或临时 `--report` 模式观察，不提交 |
| 误放新文件 | 删除该文件在基线中的条目；以 `--strict --check-file` 复验 |
| 运行时 `--strict` 过严阻断正常窗口 | 仅对具体版本加完整标记；不得关闭 `--strict`，不得用 `--allow-pending` 绕过 |
| `TRUNCATE` 确需执行 | 不在迁移里做；由 DBA 在维护窗口手工执行并记录变更单，迁移侧改写为 DELETE/新表切换 |

**边界**：本设计不改变 `apply-forward.sh` 的锚点/差集逻辑（那是方案 C 的 B1-B3），只补「即将执行的 SQL 是否危险」这一层；也不替代 DBA 的备份与变更审批。
