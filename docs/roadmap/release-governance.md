# 版本节奏与发布治理（V530d 草案）

> 状态：草案 · 2026-09-07 · 待用户确认后生效
> 背景：V484 以来高频"每天多版本"推送，单日 commit 峰值 5+；切换到稳定节奏以降低回归面与评审成本。

## 1. 版本节奏

| 项 | 规则 |
|---|---|
| 常规版本 | 每周 **1-2 个稳定版本**（含批量小项收口批次） |
| 里程碑验收 | 每季度 1 次（轨 A/B/C/D 维度汇总 + 端到端回归） |
| 例外 | 安全修复 / 阻断性 bug 可即时发布（hotfix 通道） |

## 2. 提交门禁（常态化）

- pre-commit 15 钩子**全部启用**（含 frontend-lint / typecheck / hardcoded-precise / boundary-gate / sqlx-cache-freshness / cargo-fmt / clippy / test）。
- 批量收口类提交（TODO 标记）允许合并跳过个别耗时钩子（如 cargo-test-workspace），**但 lint/typecheck/boundary 必跑**。

## 3. 提交规范

- 格式：`V{版本号}: {极简中文摘要}`（延续现状）。
- 每批次 commit 须附变更清单（3-6 行 bullet）。
- TODO.md 与版本同批更新（闭环即同步）。

## 4. 发布产物

- 稳定版本节点打 tag：`v{YYYY}.{MM}.{序号}`（如 v2026.09.1）。
- 归档 tar.gz 按 tag 命名入 `releases/archives/`（保留最近 20 个，更早的移冷存储）。

## 5. 待确认项

- [ ] 每周版本日的具体安排（建议周五收口、周一验收）
- [ ] 里程碑验收清单模板（轨维度汇总格式）
