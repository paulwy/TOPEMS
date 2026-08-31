# 前端测试矩阵 ROI 审视（Frontend Test ROI Review）

> **状态**：审视报告（待实施）· **归档日期**：2026-08-31 · **关联**：`TODO.md` P1-3
> **数据基线**：2026-08-31 代码库快照（apps/web）

## 1. 现状基线

| 层级 | 规模 | 运行方式 | CI 耗时预算 |
|---|---|---|---|
| 单元/纯逻辑测试（unit） | utils/api/lib 等 | vitest `--project unit` | 10 min/job |
| 组件+页面单测（component） | 392 个测试文件，8 路分片 | vitest `--project component --shard=N/8` | 10 min × 8 |
| Playwright UI E2E | 41 个 spec，6 project（chromium/firefox/webkit/mobile-iphone/tablet-ipad/mobile-android） | playwright.config.ts | 未设上限 |
| Playwright API E2E | e2e/api | playwright.config.api.ts | — |
| Playwright 集成 | e2e/integration | playwright.config.integration.ts | — |
| 覆盖率 | 独立 job | vitest coverage | — |
| 设计系统/视觉回归 | component-visual + design-system-visual | 快照 | — |

**单测文件分布**（392 个，按目录）：

| 目录 | 数量 | 层级 | 建议保留级别 |
|---|---|---|---|
| pages | 167 | 页面级 | L3（抽查） |
| api | 73 | 逻辑/契约 | L1（保留） |
| components | 70 | 组件级 | L2（分级） |
| utils | 20 | 纯逻辑 | L1（保留） |
| `__tests__` | 17 | 混合 | L2 |
| hooks | 11 | 逻辑 | L1（保留） |
| lib / config / store / schemas 等 | 34 | 逻辑/基础设施 | L1（保留） |

## 2. ROI 分级与裁剪建议

### L1 高价值（保留）：纯逻辑 + API 契约（~120 文件）
utils/lib/api/hooks 测试成本低、故障定位准、防回归价值高。**全保留，禁止删除**。

### L2 中价值（分级保留）：组件级（~80 文件）
- **保留**：通用/共享组件（`components/common`、`components/templates`、shared-components）测试——影响面大。
- **降级**：单一页面专属、低频更新的业务组件测试——从"每组件必有"改为"关键行为抽测"，可合并到页面抽查。

### L3 低 ROI（抽查策略）：页面级（167 文件）
页面测试依赖大量 mock、随 UI 变更高频维护，单测价值被 E2E 覆盖重叠。
- **建议**：167 个页面单测不逐页全量维护，改为**关键业务页面（登录/工单/订单/报表等高频核心）保留 + 其余降为 smoke（仅渲染不崩溃）**。
- 预计可裁剪 40–50% 页面单测文件，且不降低有效覆盖。

### L4 E2E 矩阵收敛（Playwright）
- **chromium 全量跑**（覆盖 80% 以上回归），**firefox/webkit 降为关键流程冒烟**（登录→核心 CRUD）。
- 移动端 3 个 device profile（iphone/ipad/android）收敛为 **1 个（iphone）+ 1 个 tablet**，或改为仅响应式断言。
- 视觉快照（component-visual/design-system-visual）：只保留设计系统级（共享组件），页面级视觉快照停用（变更噪音大）。

## 3. 时间预算（目标）

CI 前端全链路单次 PR 预算（从当前 ~25–35 min 收敛至 ≤ 20 min）：

| 阶段 | 预算 |
|---|---|
| lint + typecheck + design-system-check + i18n-gate | ≤ 4 min |
| 单测 9 路分片（unit + 8 shard） | 每分片 ≤ 4 min |
| 覆盖率 | ≤ 3 min（随裁剪同步降低门槛，不以 100% 为硬指标） |
| E2E（UI 收敛后 1+1 project + API + 集成） | ≤ 8 min |
| Lighthouse | 按需（非阻塞） |

> 门槛原则：**覆盖率阈值不随裁剪上调**，改为"核心路径 100% + 全量 ≥ 现有值下限"。

## 4. 实施路径（分三批，每批独立可回滚）

1. **批 1（低风险）**：E2E 矩阵收敛（6→2 project）+ 视觉快照只留设计系统级 → 立省 CI 时间。
2. **批 2（中风险）**：页面单测降级为 smoke（保留关键页面）→ 裁剪文件 + 对应 vitest 分片数从 8 降到 4–5。
3. **批 3（持续）**：按"修改频率 × 故障价值"双维建立用例热图，季度复盘一次 ROI。

## 5. 本次待办完成定义（P1-3）

- [x] 用例分级（L1/L2/L3/L4）与裁剪建议
- [x] CI 时间预算（≤ 20 min 目标）
- [x] 分三批实施路径
- [x] 批 1 E2E 矩阵收敛（2026-08-31 落地）：CI 实际使用的 `tests/e2e/playwright.config.ts` 本就为单 chromium project；`apps/web/playwright.config.ts` 6 project（未被 CI 引用）已收敛为 chromium + mobile-iphone，firefox/webkit/tablet/android 注释保留。全项目 0 snapshot 文件，视觉快照项无对象可清理。
- [ ] 待执行：批 2 页面单测降级（需按页面清单逐个确认保留集）
