# 版本节奏与发布治理（V530d）

> 状态：已生效 · 2026-09-07 用户确认
> 背景：V484 以来高频"每天多版本"推送，单日 commit 峰值 5+；切换到稳定节奏以降低回归面与评审成本。

## 1. 版本节奏

| 项 | 规则 |
|---|---|
| 常规版本 | 每周 **1-2 个稳定版本**（含批量小项收口批次） |
| 周节奏 | **周五收口**（本周变更合并 + 批量收口提交 + 打 tag），**周一验收**（周末回归结果 + 遗留项 triage） |
| 里程碑验收 | 每季度 1 次（轨 A/B/C/D 维度汇总 + 端到端回归，模板见 §5） |
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

## 5. 里程碑验收清单模板

每季度末按轨汇总，模板如下（复制后填数）：

```markdown
# Q{季度} 里程碑验收 · {YYYY-MM-DD}

## 维度汇总
| 轨 | 范围 | 本季交付 | 关键指标 | 状态 |
|---|---|---|---|---|
| A 核心业务 | {模块列表} | {PR/功能数} | {指标名: 值} | ✅/⚠️/⛔ |
| B 平台能力 | {模块列表} | {PR/功能数} | {指标名: 值} | ✅/⚠️/⛔ |
| C 工程质量 | {模块列表} | {PR/功能数} | {指标名: 值} | ✅/⚠️/⛔ |
| D 运维治理 | {模块列表} | {PR/功能数} | {指标名: 值} | ✅/⚠️/⛔ |

## 端到端回归清单
- [ ] 全 workspace 测试（web unit/component + desktop + mobile + hooks + types + Rust）
- [ ] 全量 tsc / eslint / i18n / hardcoded 门禁
- [ ] 依赖审计（check-dependency-audit，critical 级）
- [ ] 构建链路（web + 库包 dist + docker 镜像）
- [ ] E2E 冒烟（关键链路 ≥3 条）
- [ ] 性能抽查（首屏 / 接口 P95）
- [ ] TODO.md 闭环核对（本季条目状态）
- [ ] releases 归档核对（tag 命名 + 保留数）

## 遗留与下季计划
- {遗留项 + 归属轨}
```

## 6. 生效与修订

- 本治理自 2026-09-07 生效；修订需在 commit 信息标注 `V530d` 变更并说明理由。
