# TOPEMS 多机协作 Git 纪律（2026-10-02）

> 背景：2026-10-02 多机事故——另一台机器基于过时 refs 开发，push 时门禁编译旧
> base 报 190 错，误判「远程 main 已坏」并准备去修不属于自己的错误。本文件确立
> 多机协作硬纪律，杜绝同类问题。

## 防线五层（L1–L5）

| 层 | 防线 | 状态 |
|---|---|---|
| L1 | GitHub 分支保护：main 必须通过 status checks + up-to-date + 禁 bypass | ⬜ 待用户在 GitHub Settings 开启（唯一能「永远阻止坏提交进 main」的远端硬闸） |
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

**L1 开启步骤（一次性的）**：GitHub → Settings → Branches → main → Add rule：
- ✅ Require status checks to pass before merging（勾选 Gate L / Gate K / cargo-test / rust-test）
- ✅ Require branches to be up to date before merging
- ❌ 不勾 Allow force pushes / Allow deletions（禁 bypass）

## 核心原则

1. **远端 CI 是 main 健康的唯一权威**——本地编译状态 ≠ main 状态。
2. **开工前必须同步**——stale-base（旧 base）是 push 事故的最大来源。
3. **push 被门禁拦，先判断来源再决定动作**——勿直接修改编译错误。

## 开工 / 换机器拉取

```bash
bash scripts/sync_base.sh     # fetch + rebase + 编译快验（全 targets，离线）
```

- 工作区有未提交改动会被脚本拦下（先 `git stash` / commit，同步后再 pop）。
- 工具链由 `rust-toolchain.toml` 锁定 **nightly-2026-07-01**（多机一致，勿手动覆盖）。

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

## 其他

- Revert 他人提交前确认影响面与理由（6016a041b 事故：修复被 Revert 引发连锁误解）。
- 推送走完整门禁；`--no-verify` 仅限「门禁刚全绿、仅传输失败」的已知场景（如 SSH 长钩子超时）。
