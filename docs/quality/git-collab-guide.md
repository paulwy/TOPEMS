# TOPEMS 多机协作 Git 纪律（2026-10-02）

> 背景：2026-10-02 多机事故——另一台机器基于过时 refs 开发，push 时门禁编译旧
> base 报 190 错，误判「远程 main 已坏」并准备去修不属于自己的错误。本文件确立
> 多机协作硬纪律，杜绝同类问题。

## 防线五层（L1–L5）

| 层 | 防线 | 状态 |
|---|---|---|
| L1 | GitHub 分支保护：main 必须通过 status checks + up-to-date + 禁 bypass | ⚠️ 已创建规则但**不生效**：免费个人账户的私有仓库不强制执行分支保护（GitHub 限制）；升级 Team/Enterprise 组织（需 transfer 仓库）后规则自动启用。**替代硬闸（2026-10-03 实测不可行）：个人私有仓库协作者只能 Write（Read/Triage 仅组织仓库支持，API 422 实锤）——当前实际防线 = L2–L5 + CI 检测 + 快速回滚** |
| L2 | 本地 push 守卫：stale-base 检查 + cargo check 错误归类 | ✅ 已落地（pre-push 第一道，并入 cargo-check 门禁） |
| L3 | 开发起点：`scripts/sync_base.sh`（fetch + rebase --no-fork-point + 编译快验） | ✅ 已落地 |
| L4 | CI 全量验证：Gate L `cargo check --all-targets` + 夜间回归失败自动开 Issue + 环境一致性自检 | ✅ 已落地（2026-10-02） |
| L5 | 环境锁定：rust-toolchain.toml + .cargo/config.toml 相对 target-dir | ✅ 已具备 |

## 新机器 onboarding（一次性的）

```bash
bash scripts/topems.sh doctor    # 检测+安装 lefthook、注册 git 钩子、核对工具链、校验配置
bash scripts/sync_base.sh        # 同步 base + 编译快验（首次必跑）
```

- doctor 把本地门禁钩子注册到 **git 层面**（.git/hooks）——此后该机**任何 `git push` 都触发 pre-push 门禁**，无论是否走 `topems.sh push`。
- 若 doctor 报 lefthook/工具链缺失，按其提示安装后重跑。
- 之后每次开工只需 `bash scripts/sync_base.sh`。

## 推送入口（推荐）

```bash
bash scripts/topems.sh push              # 先自检门禁钩子，再走完整门禁 + 传输
bash scripts/topems.sh push --skip-check # 门禁刚全绿、仅传输失败时跳过自检
```

- 直接 `git push` 也受本地门禁约束（钩子已注册）——`topems.sh push` 只是多了"钩子存在性"前置检查，防止"以为有门禁其实没有"。

**L1 开启步骤（升级组织后按此启用，规则已创建留档）**：GitHub → Settings → Branches → main → Add rule：
- ✅ Require status checks to pass before merging（勾选 Gate L / Gate K / cargo-test / rust-test）
- ✅ Require branches to be up to date before merging
- ❌ 不勾 Allow force pushes / Allow deletions（禁 bypass）
- ⚠️ 免费个人账户私有仓库不强制执行（创建页面顶部有明确警告）——**当前实际防线 = L2–L5 本地机制**

## 核心原则

1. **远端 CI 是 main 健康的唯一权威**——本地编译状态 ≠ main 状态。
2. **开工前必须同步**——stale-base（旧 base）是 push 事故的最大来源。
3. **push 被门禁拦，先判断来源再决定动作**——勿直接修改编译错误。
4. **GitHub 层 L1 当前不生效 → 本地 pre-push 门禁是每台机器 push 的唯一防线**——每台机器必须跑过 `doctor`（钩子注册到 git 层面）；TRAE 两次事故均因无门禁机器直推。

## 开工 / 换机器拉取

```bash
bash scripts/sync_base.sh     # fetch + rebase + 编译快验（全 targets，离线）
```

- 工作区有未提交改动会被脚本拦下（先 `git stash` / commit，同步后再 pop）。
- 工具链由 `rust-toolchain.toml` 锁定 **nightly-2026-07-01**（多机一致，勿手动覆盖）。
- 编译快验默认启用 sccache 包装；**sccache <0.18 配该工具链可能编译失败**——脚本已加自动降级（失败去包装重跑一次）。手动跳过包装：`RUSTC_WRAPPER='' cargo check ...`。

## Push 前（pre-push 门禁 6 项）

| 顺序 | 门禁 | 拦截时怎么处理 |
|---|---|---|
| 1 | **stale-base 检查** | base 落后 → `bash scripts/sync_base.sh` |
| 2 | shellcheck | 脚本改动带告警 → 修脚本 |
| 3 | cargo check（含错误归类） | 见下方「错误来自 base」分支 |
| 4 | cargo fmt --check | `cargo fmt --all` 后重推 |
| 5 | cargo clippy -D correctness | 修 correctness 级问题 |
| 6 | cargo test --lib | 修测试或确认 flake |

> 注：2026-10-02 起 stale-base 检查并入 cargo-check 命令前置（lefthook 2.1.10
> 对独立命令按 pushed files 过滤会 skip，并入后实证必跑）。

### 被 cargo check 拦且提示「错误来自 base」

```
⚠️ [错误归类] 编译错误全部来自 base（非本次改动文件）
```

按序处理：

1. `bash scripts/sync_base.sh`（fetch → rebase --no-fork-point → 编译快验）后重试。
2. `git status` 确认工作区干净——**本地残留的旧文件会混入编译**（事故真凶）。
3. 勿直接修改不属于本次提交的文件——先同步再判断。
4. 若同步最新后仍报错（罕见），以远端 CI 状态为准，发首屏 error 给维护者。

## 夜间回归失败通知（L4）

- 每日 02:00 UTC 全量回归，核心 Rust 门禁（Gate L/K、cargo-test、rust-test、
  mes-online-check）任一失败 → CI 自动开 GitHub Issue（标题含日期 + 失败门禁
  + run 链接 + 复现命令）。
- 仅 schedule 触发通知；手动 / PR / push 失败不通知（避免噪音）。
- 修复后手动关闭对应 Issue。

## 遇到「我这边编译失败」怎么办

```bash
git fetch origin && git reset --hard origin/main   # 丢弃本地残留，强制对齐（会丢未提交改动，先 stash）
cargo check -p <crate> --all-targets                # 复现
```

- 仍失败 → `rustup toolchain list` 确认 nightly-2026-07-01 已装；发首屏 error。
- 不要在 main 上 push 失败后反复重试——先看门禁输出归类。

### 2026-10-02 事故教训：把健康 main 误判成「坏了」

某机在 `reset --hard origin/main` 后编译报 190+13 错，判定「远程退回编译失败状态、
有人覆盖了修复」——**实际远端健康（本机+CI 双实证），错误来自该机本地旧状态**。
诊断纪律：

1. **先验证远端真实状态，别凭本地 refs/印象下结论**：`git ls-remote origin main`
   对比 SHA（本地 `origin/main` 可能是陈旧的）。
2. **确认你在看哪个提交、谁写的**：`git show -s --format='%h %an %s' <sha>`——
   曾发生把他人已推送的修复提交（c7e521384）误认成「事故版本」。
3. **`git reset --hard origin/main` 丢弃的是自己机器的本地未推提交**——这是 onboarding
   的正常动作，不是「外部操作/有人动我代码」；reset 后 `git status --short` 应无输出
   （工作区 = origin/main）。
4. **工作区对齐最新 main 后仍报错 → 先查本机环境**（sccache 包装 `RUSTC_WRAPPER`、
   工具链、脏文件混入），**再怀疑远端**——远端健康以 CI/多机实证为准，不以单机
   本地编译为准。

### 2026-10-02 第二次事故：装了门禁仍推坏（机制失效）

TRAE 机在 doctor 装好本地门禁后，仍基于错误认知推送 8df91e813（把 mes/wms 改回
坏修复模式 + 越权修改共享 `.cargo/config.toml`），声称「四门禁验证通过」——本机
实证 150+11 错。教训：

1. **本地门禁对某些机器不可信**——`--no-verify` 可绕过、环境差异可致「本地验证」
   失真——门禁是纪律层防线，不是硬闸。
2. **「验证通过」必须有交叉证据**——单机自述不采信；以 CI / 第二台机器实证为准
   （本机每次在 push 前跑全量 check + clippy 作为权威验证）。
3. **共享配置不可单机擅改**——`.cargo/config.toml` 是仓库级（影响所有机器）；
   TRAE 机 sccache 0.17 与 rustc 1.95.0 不兼容应改**本机**配置（如
   `~/.cargo/config.toml` 或环境变量），不得改仓库级文件。

**身份隔离已完成（2026-10-02）**：TRAE 机改用独立账号 topmap163 + 独立 SSH key
（`~/.ssh/id_ed25519_topmap163`，认证实测 `Hi topmap163!`），paulwy 侧加为协作者。
但 **2026-10-03 实测：免费个人仓库协作者权限只能 Write**——GitHub 官方文档
（Permission levels for a personal account repository）明确：私有仓库协作者只能授予
write，不存在 read-only；UI 无 Read 选项 + API `PUT .../collaborators/{user}`
`permission=read|triage` 均返回 422 "Cannot assign ... permission of read/triage"。
**结论：权限层硬闸在免费个人仓库物理不可行**——topmap163（TRAE 机作者）与
hbtykj（真实参与者）均只能为 Write；硬闸目标调整为「本地门禁 + CI 红灯（39 jobs，
坏提交几分钟内失败）+ 快速回滚（git revert）+ 推送纪律（push 需明确确认）」。
**彻底硬闸（长期选项）**：升级 GitHub Team（组织）——组织私有仓库支持 Read 角色 +
分支保护规则（main 必须 status checks + 仅维护者可合入）。操作清单见
[trae-identity-isolation.md](trae-identity-isolation.md)。

### 2026-10-02 终局：双锚点漂移（Cargo.lock + .sqlx 缓存从不入库）

**现象**：同一代码（0711496db 的 mes/wms），本机 0 error、TRAE 机 190+13 错，
循环拉锯三天（互相覆盖「修复/恢复」，作者归属反复误判）。

**双根因实证（对照实验裁决）**：
1. **Cargo.lock 从不入库**（`.gitignore` 的 `**/Cargo.lock` 忽略、git 历史无记录）→
   两端各自本地生成 lock → 依赖版本漂移（chrono 等）→ 同一代码编译结果相反。
2. **.sqlx 离线缓存从不入库**（`svc/*/.sqlx/` 忽略）→ 两端列类型映射漂移：
   根 .sqlx（309 个 query，列=非 Option）与代码不匹配；svc/*/.sqlx（412 个，
   列=Option）匹配。
3. **对照实验**：干净 worktree（9ad12435b，仅根 .sqlx）+ 独立 target →
   **190 错（精确复刻 TRAE 机）**；svc 缓存 → **0 error**。权威判定：svc 缓存正确。

**收口（远端 4cc62e4ce，全绿）**：Cargo.lock 入库（7614 行）+ svc/mes/server/wms
.sqlx 入库（412 文件）+ 标准代码（mes=0711496db）。TRAE 机对齐后复测 0 error，
分歧终结。

**教训**：
1. **依赖锚点必须入库**——Rust workspace 的 Cargo.lock 是编译输入，不入库 = 两端依赖漂移。
2. **sqlx 离线缓存必须入库统一**——列类型映射是编译输入的一部分；缓存漂移 = 类型漂移 =
   E0599/E0308。`.sqlx` 体积小（数百 KB），入库代价可忽略。
3. **「同一代码两端编译相反」先查环境输入**（lock / .sqlx 缓存 / 工具链），
   **不要先怀疑代码或对方**——本案例三分之二的分歧时间浪费在互相归因。
4. **author 是提交者的本地 git 配置（身份标识），推送方是 SSH key（谁能推）**——
   两端 config 不同（本机 WangYu / TRAE 机 TRAE）时，author 即推送方标识，
   归属以 author 为准。
5. **裁决两机分歧的权威方法是对照实验**：干净 worktree（精确复刻对方环境）
   + 独立 target（无缓存假象）+ 同一代码——而不是各自声称。
6. 本次与事故一/二不同：不是推坏代码，而是**环境锚点漂移导致误判循环**——
   锚点入库后环境输入一致，分歧空间归零。

### 2026-10-03 实测补录：免费个人仓库无 Read 协作者（平台限制）

**结论**：free 个人账号私有仓库的协作者**只能 Write**——Read/Triage 角色仅组织
（Organization）仓库支持。这解释了此前「网页找不到 Read 选项」的现象，并经 API
实测坐实：

- GitHub Docs（Permission levels for a personal account repository）：
  "In a private repository, repository owners can only grant write access to
  collaborators. Collaborators can't have read-only access to repositories owned
  by a personal account."
- API 实测（2026-10-03，paulwy 侧 PAT）：`PUT /repos/paulwy/TOPEMS/collaborators/
  topmap163` 传 `{"permission":"pull"}` / `{"permission":"triage"}` → 422
  `Cannot assign topmap163 permission of read/triage`；hbtykj 同样被拒。
- 权限实况（API 复查）：topmap163 = write、hbtykj = write（无法降为只读）。

**防线调整**：权限层硬闸在当前账户形态下不可行 → 有效防线 =
① 本地门禁（lefthook 21+5 项，L2/L3）
② CI 39 jobs（坏提交几分钟内红灯，L4）
③ 快速回滚（git revert / reset，本机留证据链）
④ 推送纪律（push 需明确确认，TRAE 机约定 fork+PR 优先）。
**长期彻底方案**：升级 GitHub Team 组织（分支保护 + Read 角色 + main 仅维护者可合入）。

## 其他

- Revert 他人提交前确认影响面与理由（6016a041b 事故：修复被 Revert 引发连锁误解）。
- 推送走完整门禁；`--no-verify` 仅限「门禁刚全绿、仅传输失败」的已知场景（如 SSH 长钩子超时）。

## 2026-10-03 协作基线收口记录

**两端身份归位确认（`git config` 实测）**：

| 机器 | user.name | user.email | 角色 |
|---|---|---|---|
| 本机（xingzhai@Mac-mini） | WangYu | wy_hb@126.com | 作者/所有者（paulwy） |
| TRAE 机（air@MacBook-Air） | topmap163 | topmap@163.com | TRAE 机专用作者身份 |

- 意义：历史「谁推了坏提交」判断混乱的根源（身份颠倒，author 归属失真）已消除——
  author 即提交者本地 git 配置，推送方是 SSH key；两端身份分离后，提交归属可追溯。
- TRAE 机无需再切换身份；后续提交统一以 topmap163 标识。

**本机 push 29 笔收口（cd8ab50c6，门禁全绿）**：
- cast deny 收尾（hrm try_from 化 / mes f64 提变量+allow）、fmt 收尾（master-data 批量 +
  TRAE 机 AI 会话 CRUD 3 文件格式化）、boundary-gate 修复（cjs own-schema 映射补
  master-data + persist.rs/u4 迁移补录——此前未入库的编译依赖）、rebase 并入 TRAE 机
  5 笔（docs/api/finance U5，无冲突）。
- 验证：check 21s / clippy 59s / fmt 6s / test 69s（550 passed）/ shellcheck 7s 全绿。

**8ffbf5280（本机 WangYu 推）**：fix(deps) frontend-lint 崩溃（minimatch@10 →
brace-expansion 锁定 5.0.8 + .git/hooks 残留清理，pre-commit 20/20 全绿验证）。
远端 main 已同步至 8ffbf5280，两端一致、工作区干净。

**剩余待办**：远端 CI（39 jobs）最终全绿确认；CI 红灯即按 L4 快速定位修复。

## 2026-10-03 并行收口记录：f7c3d687d（多会话并行冲突处置）

**背景**：本机同时存在两个 AI 会话并行操作同一仓库（本会话收口 U 系列/docs；另一会话做
workflow 增强 + supply-chain 契约），导致三轮 push 被远端覆盖（`non-fast-forward`），
最终 rebase 收口合并为一条完整历史。

**最终基线 f7c3d687d（门禁全绿）**：
- 另一会话 workflow 增强两批：c97c96128（category 分类管理 + variable 变量管理）、
  124ff2fdd（delegate 审批委托 + rule 条件规则——均真实 DB 实现）
- 本会话 5 笔：docs 补录（协作基线收口）、U12b wms 审计读路径归位、U9 zookeeper/
  eureka/nacos 残留移除、U9 docs、R1 前端回归基线记录
- 验证：check 48s / clippy 317s / fmt 6s / test 130s（550 passed）/ shellcheck 7s 全绿；
  传输因 SSH 长钩子 exit 141，用 `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push
  --no-verify origin main` 仅传输落地（门禁已全绿）。

**并行协调纪律（本次事故六条教训）**：
1. **push 前必须 `git fetch && git status -sb` 确认 behind 0**——behind > 0 时先
   `git rebase origin/main`，禁止直接 push（否则 non-fast-forward）。
2. **push 后必须 `git ls-remote origin main` 核对远端 HEAD == 本地 HEAD**——"门禁绿"
   不等于"已上岸"，传输可能被并行推送覆盖。
3. **管道 exit 陷阱**：`git push | tail` 的 `$?` 是管道最后命令的退出码（掩盖 git push
   真实失败）——正确写法：`git push > /tmp/push.log 2>&1; RC=$?` 或 `${PIPESTATUS[0]}`。
4. **门禁全绿但 SSH 长钩子静默失败（exit 141 SIGPIPE/超时）**：用
   `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push --no-verify origin main` 仅传输。
5. **同一仓库同一时刻只允许一个会话推送**；另一会话 push 前必须先 fetch + rebase
   origin/main 再推；并行大改动（如 workflow/supply-chain）尤其要错开推送窗口。
6. **rebase 被未提交改动阻塞**：`git status` 有 M 时先 `git stash push`（或提交），
   rebase 完成后再 `git stash pop`；`??` 未跟踪文件（子目录 Cargo.lock 等）不阻塞 rebase。

## 2026-11-19 并发提交碰撞登记（同 worktree 共享 index）

与 `357a31de4` 同类的第二次碰撞（该次的详细登记在
[API_IAM_RESOURCE_ACL_READ_DRAFT.md §11.2](../api/API_IAM_RESOURCE_ACL_READ_DRAFT.md)）：
两条会话在同一 worktree 并行，`git add` 到 `git commit` 之间共享 index 被对方抢占。
本文件作为统一登记处，后续同类事件按同一表格格式追加。

### 3ba39dc00

- **事实**：本批 6 个文件在 `git commit` 时被同 worktree 的另一条 session 抢占，被一并
  提交进 `3ba39dc00 feat(backup): 新增恢复演练脚本并完成首次演练`；该 commit 随后被其
  作者重写（先前观测到的 `e411cf25e` 已不在历史中）。
- **影响**：提交信息与实际内容不符；内容本身完整自洽；未 amend、未 force，历史未改写。
- **处置**：保持现状，不改写历史；实际文件归属如下。

| 文件 | 归属 |
|---|---|
| `database/migrations/20261119233000_iam_legacy_permission_convergence.sql`（补 2 组 destructive 标记，SQL 零改动） | 本线（IAM 权限码收敛） |
| `database/checksums.txt`（按新字节重生成该迁移 SHA-256） | 本线 |
| `database/migration-exemptions.json`（新增 `B20261119-iam-perm-destructive-markers`） | 本线 |
| `scripts/ci/check-destructive-sql.mjs`（补标记模板最小示例） | 本线 |
| `docs/database/window-readiness-2026-11-19.md` | 本线 |
| `docs/database/window-preflight-2026-11-19.sql` | 本线 |
| `docs/deploy/macos-production-ops.md` | 另一条线（恢复演练） |
| `scripts/dev/restore-drill.sh` | 另一条线（恢复演练） |

> 回滚文件 `database/rollback/20261119233000_iam_legacy_permission_convergence.rollback.sql`
> 本次未改动，已随 `414155a1c` 入库。

### 防再发

- 同一 worktree 内多线并行时，`git add` 到 `git commit` 的窗口要短：暂存后立即提交，
  中间不穿插编辑与验证。
- 优先用路径限定提交 `git commit <paths>`（自带暂存），绕开共享 index 被另一条线抢占。
- 提交后立刻 `git show --stat HEAD` 核对清单；发现被吞并时按上表登记实际归属，
  不改写历史（不 amend、不 force）。
