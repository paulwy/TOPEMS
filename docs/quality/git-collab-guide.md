# TOPEMS 多机协作 Git 纪律（2026-10-02）

> 背景：2026-10-02 多机事故——另一台机器基于过时 refs 开发，push 时门禁编译旧
> base 报 190 错，误判「远程 main 已坏」并准备去修不属于自己的错误。本文件确立
> 多机协作硬纪律，杜绝同类问题。

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
| 1 | **stale-base 检查** | base 落后 → `bash scripts/sync_base.sh` 或 `git pull --rebase origin main` |
| 2 | shellcheck | 脚本改动带告警 → 修脚本 |
| 3 | cargo check（含错误归类） | 见下方「错误来自 base」分支 |
| 4 | cargo fmt --check | `cargo fmt --all` 后重推 |
| 5 | cargo clippy -D correctness | 修 correctness 级问题 |
| 6 | cargo test --lib | 修测试或确认 flake |

### 被 cargo check 拦且提示「错误来自 base」

```
⚠️ [错误归类] 编译错误全部来自 base（非本次改动文件）
```

按序处理：

1. `git pull --rebase origin main`（或 `bash scripts/sync_base.sh`）后重试。
2. `git status` 确认工作区干净——**本地残留的旧文件会混入编译**（事故真凶）。
3. 勿直接修改不属于本次提交的文件——先同步再判断。
4. 若同步最新后仍报错（罕见），以远端 CI 状态为准，发首屏 error 给维护者。

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
