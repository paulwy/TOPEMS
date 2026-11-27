# 运维工作区与构建缓存落点约定（2026-11-27）

> 目的：终止「`$HOME` 根目录当临时工作区」的历史做法，把可变状态收敛到三个有归属的目录，
> 并给每类产物定明确的保留期与收尾责任。

## 1. 背景：同一问题已发生两次

| 时间 | 现象 | 释放量 | 原因 |
|---|---|---|---|
| 2026-09-24 | 仓库 `target/` 膨胀至 176.8 GiB，磁盘写满、编译与日志失败 | cargo clean | debug+release 增量缓存长期累积 |
| 2026-11-27 | 系统盘可用仅剩 101 MiB，工具链无法创建临时目录 | 56.5 G | 窗口/夜间构建把 `CARGO_TARGET_DIR` 指到 `$HOME`，产物出仓后目录未回收 |

第一次之后建立了 `scripts/clean_target.sh`，但它只认 `$PWD/target`，覆盖不到 `$HOME` 下的游离 target，
所以第二次照样发生。本约定补的是「落点 + 生命周期」这一层。

## 2. 落点规范（新建任何运维产物前先对照此表）

| 用途 | 规范路径 | 生命周期 | 谁负责收尾 |
|---|---|---|---|
| 仓库日常构建 | `<repo>/target` | 常驻，超 25 G 清增量 | `scripts/clean_target.sh --auto` |
| 夜间全量测试构建 | `~/.cache/topems/nightly-target` | 通过即删；失败保留 ≤ 7 天 | `scripts/dev/run-nightly-gates.sh`（`trap EXIT` + 启动时扫过期） |
| 窗口/演练独立构建 | `~/.cache/topems/target-<窗口ID>` | 产物取出后立即删除，最长 7 天 | 执行 runbook 的人；`clean_target.sh --auto` 兜底扫过期 |
| 并行开发工作树 | `<repo>/.worktrees/<name>` | 用完 `git worktree remove` | 建树的人；`git worktree prune` 兜底 |
| 回滚证据 / 二进制留档 | `<repo>/backups/archive-<YYYY-MM-DD>/` | 见 §4 | 归档人 |
| 本机数据库实例 | `~/topems_pg5433` | 常驻（基础设施） | — |
| 部署脚本副本 | `~/topems-deploy` | 常驻（基础设施） | — |

**禁止**：

- 在 `$HOME` 根新建 `topems-*` 目录或散落文件（dump、log、构建产物一律进规范路径）。
- 把 `CARGO_TARGET_DIR` 指到 `$HOME` 根或 `$HOME/.cache/topems-*`（旧式扁平命名，已废弃）。
- runbook 里写「跑完即删」却没有对应命令：脚本必须 `trap '...' EXIT`，手工 runbook 末尾必须有清理小节。

## 3. 工作树现状与豁免清单

`git worktree list` 只应包含：

| 路径 | 状态 | 处置 |
|---|---|---|
| `~/TOPEMS` | main 工作树 | 保留 |
| `~/TOPEMS-doubao`（`doubao/work`） | **含 2 个未提交改动**（`database/checksums.txt`、`scripts/dev/run-local-gates.sh`） | **豁免保留**，处理完改动后按规范摘除 |
| `~/topems-window` | 干净 detached（a73b6bccb，2026-11-25 生产窗口用） | 2026-11-27 已移除 |
| `/private/tmp/topems-push`、`…/topems-drill-head.*` | 临时/演练用，已无引用 | 2026-11-27 已移除 |

被标记「豁免」的条目必须写在这里；没有登记的工作树一律视为可回收。

## 4. 归档保留期

| 类型 | 保留期 | 依据 |
|---|---|---|
| 旧二进制留档（`topems-server.bak-*`） | 30 天 | 回滚窗口通常 ≤ 7 天，留 4 倍余量 |
| DB 全库 dump / CSV 导出 | 90 天 | 季度审计 |
| 窗口现场日志（`build.log`、`c*.out`） | 30 天 | 排障用 |
| 发布构建日志 | 30 天 | — |

到期由人工或 `scripts/ops/archive-retention.sh`（如后续新增）清理，不自动删。

## 5. 兼容：保留旧路径的软链

`docs/` 下既有 runbook 直接引用了 `~/topems-backups/...`、`~/topems-window-lims-20261111/...`，
归档时在这些旧路径上留指向新位置的符号链接，保证历史 runbook 中的命令仍可执行：

```
~/topems-backups                 -> ~/TOPEMS/backups/archive-2026-11-27/topems-backups
~/topems-window-lims-20261111    -> ~/TOPEMS/backups/archive-2026-11-27/topems-window-lims-20261111
~/topems-window-b4-20261110      -> ~/TOPEMS/backups/archive-2026-11-27/topems-window-b4-20261110
~/topems-prod-backup-20261119    -> ~/TOPEMS/backups/archive-2026-11-27/topems-prod-backup-20261119
```

归档内容、逐项保留期与 sha256 校验清单见 `backups/archive-2026-11-27/README.md` 与 `SHA256SUMS`。

新 runbook 一律写规范路径，不再新增此类软链。

## 6. 校验口径

- `df -h /System/Volumes/Data` 可用空间 ≥ 60 GiB（夜间脚本同阈值）。
- `git worktree list` 只出现 §3 表中的路径。
- `find ~ -maxdepth 1 -name 'topems-*'` 只返回软链与 §3 豁免项。
- `scripts/clean_target.sh --check` 报告 `$HOME` 游离 target 为 0。
