# TOPEMS 合并变更说明 - 2026-07-14

## 📋 合并概要

| 项目 | 内容 |
|------|------|
| 合并日期 | 2026-07-14 |
| 合并提交 | `b5465914` Merge origin/main into main with release/v5.14.0 |
| 涉及提交 | 28 个（27 个功能提交 + 1 个合并提交） |
| 时间跨度 | 2026-07-11 ~ 2026-07-14 |
| 变更规模 | 1705 个文件，+119,706 / -112,991 行 |
| 合并策略 | release/v5.14.0 fast-forward → 再 merge origin/main |

### 合并背景

本地 `main` 分支与 `origin/main` 发生分叉：
- 本地 main 领先 origin/main 15 个提交（路由重构 + 模块迁移 + 权限系统）
- origin/main 有 1 个独立提交 `c84b4730`（SRM 后端 + react-query 迁移 + 临时文件清理）
- release/v5.14.0 包含 main 的全部提交并额外增加 12 个发布修复提交

合并后 main 同时包含 release/v5.14.0 和 origin/main 的全部内容。

---

## 🔄 变更分类

### 一、路由重构与模块迁移（11 个提交）

将分散的路由配置统一迁移到模块化配置体系，分 5 个 Wave 逐步完成：

| Wave | 涉及模块 | 提交 |
|------|----------|------|
| Wave 1 | iam, admin, workflow, notification, doc | `070b8f19`, `537b589c` |
| Wave 2 | hrm, rs, mes | `fc8d2e3d`, `b09089a5` |
| Wave 3 | crm, scm, wms, pm, pdm, srm, rs | `0ff5c787`, `b88acbba` |
| Wave 4 | erp, mes, finance, qms, lims, ehs, gis | `e13cc317`, `a726c14d` |
| Wave 5 | oa, lowcode, asset, bi, im, plugin | `e124633f`, `8e09f08f` |
| 清理 | 删除 compatibility.tsx，完成路径重构 | `c58beefb` |

### 二、权限系统增强（3 个提交）

启用 ModuleGate 双重权限验证机制，覆盖所有业务模块：

- `4c7303ad` feat(auth): 启用 ModuleGate 双重权限验证
- `b225ac72` fix(auth): 补充缺失的模块级权限
- `0f6885ae` fix(auth): 完成所有模块的双重权限验证

### 三、CI/CD 工作流修复（4 个提交）

修复 GitHub Actions 工作流中的语法和配置问题：

- `a8ed1f80` 修复工作流语法错误
- `e55e4121` 移除 Docker Hub 登录步骤
- `e32c9aae` 修复 split-services 工作流语法错误
- `e0040412` 为所有 if 条件包裹模板表达式

### 四、TypeScript 类型错误修复（2 个提交）

- `9f58a83e` 修复 CI/CD 流水线中的类型错误
- `acc2346b` 修复 Stack 组件类型错误

### 五、版本发布 V5.14.0（3 个提交）

- `e383ccb4` 版本号升至 5.14.0
- `3e4b37a7` 更新 pnpm-lock.yaml
- `01ae0589` 更新 TODO 发布状态（标记 TS 错误备注）

### 六、构建与测试（2 个提交）

- `1f7cf320` shared-utils 构建排除测试文件
- `33d6cb0a` 新增 useGlobalSearch 单元测试及 mock 回退

### 七、文档更新（1 个提交）

- `10ae0493` 更新 Wave 3/4/5 状态为已完成

### 八、origin/main 独立提交（1 个提交）

`c84b4730` (20260714-2) - 96 个文件，+4,207 / -48,395 行：

- **SRM 后端新增**：bidding、inquiry、quotation、purchase_order、supplier_portal 模块
- **react-query 迁移**：pdm/qms/wms 页面从 useEffect 迁移到 useQuery 模式
- **临时文件清理**：删除几十个 phase*.sh 迁移脚本、分析报告、备份 SQL、pid 文件

---

## ⚠️ 冲突解决说明

合并产生 28 个冲突文件，统一采用 origin/main 版本解决：

| 类别 | 文件数 | 处理方式 |
|------|--------|----------|
| 前端页面（pdm/qms/wms） | 13 | 采用 react-query 迁移版本 |
| SRM 后端模块 | 2 | 采用 origin/main 实现 |
| 共享组件（DataTable/LazyImage） | 3 | 采用 origin/main 版本 |
| API 文件（tenant） | 1 | 采用 origin/main 版本 |
| 构建产物（dist/index.html） | 1 | 采用 origin/main 版本 |
| TODO.md | 1 | 保留 origin/main 修改版 |
| patches/react-transition-group | 1 | 删除（跟随 origin/main 清理） |
| pnpm-lock.yaml | 1 | 采用 origin/main 版本后重新生成 |

> release/v5.14.0 的 CI/CD 和 TS 修复中不冲突的部分已通过 fast-forward 合并保留。

---

## 🔧 合并后修复

合并完成后额外提交 `a0bf8055` 修复以下问题：

1. **新增 `.yamllint` 配置文件** — 修复 pre-commit yamllint 钩子因缺少配置文件报错
2. **重新生成 `pnpm-lock.yaml`** — 解决 lockfile 与 pnpm 11.8.0 不兼容问题
3. **修复 husky pre-commit 大文件检查** — 排除 pnpm-lock.yaml（与 .pre-commit-config.yaml 保持一致）

---

## 📌 注意事项

- `pnpm-lock.yaml` 已配置为 Git LFS 跟踪（.gitattributes），推送前需执行 `git lfs push --all origin`
- 前端页面采用 react-query 架构，后续开发应遵循 `useQuery` + `useAppStore` 模式
- SRM 后端使用 `topems_shared::response::ApiResponse` 和内联结构体定义，与 release 分支的 `topems_shared::ApiResponse` + 独立 models 模块不同
