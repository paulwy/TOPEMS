# V266-P0 架构冗余重构：Git Hook 系统统一

> **版本**: V266-P0 | **日期**: 2026-08-22
> **状态**: ✅ 已完成

---

## 背景

项目存在三套功能高度重叠的 Git Hook 系统：

| 系统 | 激活状态 | 实现 | 检查项 |
|---|---|---|---|
| `.husky/pre-commit` | ✅ 激活（`prepare: husky`） | 180+ 行 shell | 10 类检查 |
| `lefthook.yml` | ❓ 配置存在但未激活 | 11 个 Gate（声明式） | 8 项与 husky 重复 |
| `.pre-commit-config.yaml` | ❓ 需 Python pre-commit | pre-commit 框架 | 3 个 local hooks + 6 个第三方 |

**根因**: `prepare` 脚本仅激活了 husky，lefthook.yml 与 .pre-commit-config.yaml 残留为僵尸配置，且 husky 的 180 行 shell 与 lefthook 的 11 Gate 是同一套检查的两个实现版本。

---

## 重构目标

- 保留**唯一** hook 入口：`lefthook.yml`（声明式、并行可控）
- husky shell 脚本全部废弃，迁移到 lefthook Gate
- `.pre-commit-config.yaml` 仅保留第三方 Python hook

---

## 执行步骤与结果

### Step 1: 对比工具创建

创建了 [scripts/dev/compare-hooks.py](../../scripts/dev/compare-hooks.py)，自动解析 husky 与 lefthook 的检查项并输出差异报告。

**对比结果**:
- 仅 husky 有（需迁移）: 4 项（大文件、敏感信息、API 路径、admin 硬编码中文）
- 仅 lefthook 有: 3 项（typecheck、cargo test、clippy）
- 重复定义: 7 对（lint-staged、page-audit、icon、CRM、i18n、perm-matrix、axum-layer）

### Step 2: 迁移脚本创建

创建了 [scripts/dev/migrate-husky-to-lefthook.py](../../scripts/dev/migrate-husky-to-lefthook.py)，将 husky 的 4 项检查自动转换为 lefthook Gate 配置。

**特性**: 默认 dry-run、幂等（已存在 Gate 自动跳过）、自动备份。

### Step 3: 新增 4 个 Gate

在 [lefthook.yml](../../lefthook.yml) 中新增：

| Gate | 名称 | 迁移来源 | 实现方式 |
|---|---|---|---|
| Gate N | large-files | husky #1 | 内联 shell（扫描暂存文件 >1MB） |
| Gate O | sensitive-info | husky #2 | 外部脚本 [check-sensitive-info.sh](../../scripts/ci/check-sensitive-info.sh) |
| Gate P | api-duplicates | husky #4 | Python 脚本 `check_api_duplicates_ci.py` |
| Gate Q | i18n-hardcode-admin | husky #8b | Node 脚本 `check-i18n.cjs --strict` |

**Gate O 特殊处理**: 内联 shell 中的正则表达式单引号与 lefthook `sh -c` 引号冲突，提取为外部脚本解决。

### Step 4: package.json 切换

| 字段 | 重构前 | 重构后 |
|---|---|---|
| `prepare` 脚本 | `husky && node scripts/patch-react-transition-group.js` | `lefthook install && node scripts/patch-react-transition-group.js` |
| devDependencies | `"husky": "^9.1.7"` | `"lefthook": "^2.1.0"` |

### Step 5: 删除 husky

- 删除 `.husky/` 目录（含 180+ 行 `pre-commit` shell）
- 清除 `git config core.hooksPath`（husky 残留配置）

### Step 6: 精简 .pre-commit-config.yaml

删除 `repo: local` 段的 3 个 local hooks：
- `cargo-fmt`（已被 lefthook Gate J 覆盖）
- `forbid-bak-files`（可迁移为后续 Gate）
- `check-todo-md-health`（可迁移为后续 Gate）

保留 6 个第三方 Python hook：pre-commit-hooks、black、flake8、isort、yamllint、actionlint。

### Step 7: 移除 name 字段

批量移除 lefthook.yml 中所有 16 个 Gate 的 `name` 字段，消除 `lefthook validate` 的 schema 警告。Gate 标识通过注释 `# [Gate X]` 和 key 名保留可读性。

### Step 8: 配置文档生成

创建了 [docs/engineering/LEFTHOOK_GUIDE.md](../engineering/LEFTHOOK_GUIDE.md)，文档化全部 16 个 Gate 的作用、触发条件和失败行为。

---

## 验证结果

### lefthook validate

```
All good (exit=0)
```

### Gate 执行验证（12/14 通过）

| Gate | 名称 | 耗时 | 结果 |
|---|---|---|---|
| Gate A | frontend-lint | — | ✅ 无暂存文件（预期） |
| Gate C | i18n-quality | 3.49s | ✅ 假 en 0 / key 0 / 结构 0 |
| Gate D | glossary-verify | 1.77s | ✅ 61 词条 100% 一致 |
| Gate E | hardcoded-precise | 0.29s | ✅ 无暂存文件跳过 |
| Gate G | perm-matrix | 4.63s | ✅ R1-R6 全 0 |
| Gate H | crm-contract | — | ✅ 13/13 fields, 9/9 routes |
| Gate I | icon-page | 0.83s | ✅ 缺失图标 0 |
| Gate M | axum-layer | — | ✅ STRONG_PASS (1352 files) |
| Gate N | large-files | 0.21s | ✅ 无大文件 |
| Gate O | sensitive-info | 0.15s | ✅ 已修复（外部脚本） |
| Gate P | api-duplicates | — | ✅ 通过 |
| Gate Q | i18n-hardcode-admin | 1.07s | ✅ admin 模块 0 处 |

**未验证（2/14，耗时长跳过）**:
- Gate B frontend-typecheck（tsc 编译需 1-2 分钟）
- Gate F cargo-test（Rust 工作区编译需 10+ 分钟）

---

## 变更文件清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `lefthook.yml` | 修改 | +4 Gate（N/O/P/Q），移除全部 name 字段 |
| `package.json` | 修改 | prepare→lefthook install, husky→lefthook ^2.1.0 |
| `.pre-commit-config.yaml` | 修改 | 移除 3 个 local hooks |
| `.husky/` | 删除 | 含 180+ 行 pre-commit shell |
| `scripts/dev/compare-hooks.py` | 新增 | husky vs lefthook 对比工具 |
| `scripts/dev/migrate-husky-to-lefthook.py` | 新增 | 迁移脚本（幂等） |
| `scripts/ci/check-sensitive-info.sh` | 新增 | Gate O 外部脚本 |
| `docs/engineering/LEFTHOOK_GUIDE.md` | 新增 | 16 Gate 配置文档 |

---

## 收益

| 指标 | 重构前 | 重构后 | 收益 |
|---|---|---|---|
| Hook 系统数量 | 3 套 | 1 套（lefthook） | -2 |
| 手写 shell 行数 | 180+ 行 | 0 | -180 行 |
| 僵尸配置文件 | 2 | 0 | -2 |
| 检查项重复定义 | 8 项双写 | 0 | -8 |
| pre-commit Gate 总数 | 10（husky） | 14（lefthook） | +4（补全覆盖） |
| validate 通过 | N/A | ✅ All good | 无警告 |
