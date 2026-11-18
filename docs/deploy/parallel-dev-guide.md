# 双工具并行开发约定（Trae + Doubao，2026-11-18）

同一台 Mac mini 上同时用 Trae CN 与 Doubao 工作开发同一个仓库，风险与隔离方案记录如下。

## 1. 现状隔离

| 项 | 主仓（Trae 侧） | 并行侧（Doubao） |
|---|---|---|
| 路径 | `/Users/xingzhai/TOPEMS` | `/Users/xingzhai/TOPEMS-doubao` |
| 类型 | 主工作树 | `git worktree`（共享同一 `.git` 对象库） |
| 分支 | `main` | `doubao/work`（从 `main` HEAD 9846e5031 拉出） |
| 构建目录 | `~/TOPEMS/target` | `~/TOPEMS-doubao-target`（`CARGO_TARGET_DIR`） |
| 端口 | 8000/8099/5432/6379（与生产同段） | +1000 偏移：9000/9099/5434/6380 |
| 环境变量 | 主仓 `config/` | `.env.doubao.local`（`source` 后生效） |

创建命令（已执行）：

```bash
cd ~/TOPEMS
git worktree add ~/TOPEMS-doubao -b doubao/work
```

## 2. 已消除的风险

- **文件互相覆盖**：两个工作树物理分离，各改各的文件，不会再出现“后写的覆盖先写的”
- **Cargo 目录锁争抢**：`CARGO_TARGET_DIR` 分开，两侧可同时编译
- **`git add/checkout/reset` 互相干扰**：索引与 HEAD 按工作树独立（`.git/worktrees/<name>`）
- **端口冲突**：并行侧整体 +1000，起服务不会抢生产端口

## 3. 仍然存在、必须靠纪律约束的风险

1. **同一分支写冲突**：worktree 只是换目录，不换历史。若两侧都改 `main`，合并时冲突照样发生。因此并行侧一律在 `doubao/work` 上提交，通过 PR 回 `main`。
2. **未提交改动不可见**：主仓当前有百余项未提交修改（`git status` 可见），worktree 从 HEAD 检出，**看不到这些改动**。需要共享时必须先 `git stash` 或提交到分支。
3. **生产二进制**：`~/TOPEMS/bin/topems-server` 由 launchd 运行。并行侧**禁止**写入 `bin/`，禁止 `launchctl kickstart`。
4. **数据库**：并行侧的 DDL/DML 只允许打到开发库；`topems_prod` 只读。迁移文件改动必须走评审，不要在主仓直接 `sqlx migrate run`。
5. **凭据**：`.secrets/` 在两侧都存在。不要把 token/密码写进提交、日志、截图。
6. **资源竞争**：全量 `nextest` 编译（14 个 rustc、load 33）会把整机拖慢，此期间不要跑整机备份（见 `macos-production-ops.md` §7.6 实测）。两侧大任务应错峰。

## 3.1 CI 暂停中（2026-11-18 核实，重要）

GitHub Actions **当前不可用**，任何 PR/推送都拿不到绿灯，**不要以 CI 结果作为合并依据**。

事实（`gh` 实测，非推测）：

| 项 | 实测值 |
|---|---|
| 仓库属性 | `paulwy/TOPEMS`，`private: true`，个人账号（非组织） |
| 最近运行 | 最近 **100 次全部 failure，成功 0 次**（最早记录 2026-11-15） |
| 失败形态 | 7 个 workflow 同一次 push 全部 3–13 秒失败；单个 job `steps = []`、`log not found` |
| 判定 | **runner 未启动**（计费/额度层面拒绝），不是代码或 YAML 问题 |
| 计费现状 | 个人账号私有库免费额度约 2000 分钟/月；额度用尽且**未设置消费上限（未缴费）** |

因此：

- 质量门禁改由本地承担，统一入口 `bash scripts/dev/run-local-gates.sh`
- 丢失的能力只有三项：**Linux 环境编译验证**、**Web/E2E 端到端**、**Docker/K8s 构建**；其余静态与增量门禁本地全能跑
- 恢复 CI 需要：给计费账号设消费上限并绑卡（Linux 约 $0.008/分钟），或接入 self-hosted runner（自建 runner 不消耗 GitHub 分钟数，但需要一台 ≥8C/16G/200G 的 Linux 机器）
- 本机云主机（2 vCPU / 3 GB / 9.7 GiB 可用）**不足以**充当 Linux 构建机，勿据此规划

## 3.2 钩子分工：push 只跑静态与增量编译，test 走夜间

2026-11-18 调整（原因见下），三个入口各管一段，避免每次 push 都触发全量编译：

| 入口 | 内容 | 耗时量级 |
|---|---|---|
| `pre-commit` | 约 44 项秒级静态门禁（shellcheck/gitleaks/迁移/契约/前端） | 秒级 |
| `pre-push` | shellcheck 全量、gitleaks 全历史、迁移闸门、`cargo fmt` / `check` / `clippy`（增量） | 分钟级 |
| 夜间 / 手动 | `cargo test --workspace --lib` 全量 | 十几分钟～半小时 |

调整原因（实测，不是估算）：增量 `cargo test` 也要为变更 crate 编译测试依赖（sqlx-postgres、redis、protobuf、prometheus 等）。一次 push 内 `target` 从 76G 涨到 80G、可用空间掉到 12 GiB（94%）仍没编完，钩子的 3600s 超时都碰不到测试执行阶段。push 频率远高于此成本。

用法：

```bash
# 常规 push：不带 test（fmt/check/clippy 仍阻断）
git push

# 需要这次 push 带测试
TOPEMS_PUSH_TEST=1 git push

# 手动跑测试 / 分级门禁
bash scripts/dev/run-local-gates.sh --rust

# 夜间全量（默认 03:10 由 launchd 触发，日志 ~/Library/Logs/topems-nightly-gates.log）
bash scripts/dev/run-nightly-gates.sh
```

`run-nightly-gates.sh` 内置磁盘安全阀：可用空间 < 40 GiB 时只记日志、不启动编译，等 target 体积问题解决后自动恢复执行。

## 4. 收尾与清理

```bash
# 并行侧工作结束后
git -C ~/TOPEMS-doubao status                 # 确认已提交或已 push
git -C ~/TOPEMS worktree remove ~/TOPEMS-doubao   # 移除工作树（保留分支）
git -C ~/TOPEMS branch -d doubao/work         # 合并后可删分支
```

`~/.gitignore` 无需改动：`.env.doubao.local` 位于工作树内，提交前请确认 `git status` 不包含它（当前未被跟踪，勿 `git add -A`）。
