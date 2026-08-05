# 前端覆盖率 Baseline（V65 阶段五）

> 记录于：2026-08-05
> Coverage include：`components + pages + api + hooks + utils + lib + store`

## 全局 Baseline

| Metric | Coverage | CI 门禁（不退化） |
|--------|----------|-------------------|
| Statements | 13.2% | ≥ 13% |
| Branches | 6.1% | ≥ 6% |
| Functions | 6.9% | ≥ 6% |
| Lines | 13.9% | ≥ 13% |

## 各目录 Baseline

| Directory | Files | Statements | Branches | Functions | Lines |
|-----------|-------|------------|----------|-----------|-------|
| components | 322 | 14.5% | 11.7% | 4.5% | 15.0% |
| pages | 694 | 24.0% | 21.5% | 11.7% | 24.9% |
| api | 320 | 15.7% | 55.2% | 7.4% | 16.3% |
| hooks | 95 | 12.4% | 12.5% | 9.4% | 12.6% |
| utils | 62 | 24.7% | 28.1% | 28.0% | 24.7% |
| lib | 25 | 38.8% | 43.5% | 38.1% | 39.4% |
| store | 14 | 19.7% | 35.7% | 8.2% | 28.3% |

## 说明

- **V65 阶段五**将 coverage.include 从 `components + pages` 扩展到 `api + hooks + utils + lib + store`，覆盖率统计反映核心层真实质量。
- 由于新增目录大部分缺少测试覆盖，全局覆盖率从之前的 ~60%（仅 components+pages）降至 ~13%。这是预期行为——新增目录的测试将逐步补充。
- CI 门禁改为**不退化策略**：当前 baseline 设为下限，后续 PR 不得使覆盖率低于 baseline。
- 各目录的覆盖率数据会在 CI 的 GitHub Step Summary 中自动展示，便于追踪变化趋势。
- **vitest.config.ts thresholds**（本地 `test:coverage` 门禁）：statements 10% / branches 5% / functions 5% / lines 10%，略低于 CI baseline 以避免 flaky。

## 提升路线

1. **Tier 1**（P0）：utils + lib → 目标 50%+（已有 24.7% / 38.8%）
2. **Tier 2**（P1）：api + store → 目标 30%+（已有 15.7% / 19.7%）
3. **Tier 3**（P2）：hooks + components → 目标 25%+（已有 12.4% / 14.5%）
4. **Tier 4**（P3）：pages → 目标 30%+（已有 24.0%）
