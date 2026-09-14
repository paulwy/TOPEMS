# TOPEMS UI 重设计迁移 - 常见问题解答（FAQ）

> 本文档收集 UI 迁移过程中常见的问题和解决方案。

## 一、启用与配置

### Q1: 如何启用新布局？

**A:** 有两种方式：

**方式 1：使用快速启动脚本（推荐）**
```bash
./scripts/enable-ui-v3.sh
```

**方式 2：手动配置**
```bash
# 在 apps/web/.env.local 中添加
echo "VITE_UI_V3_ENABLED=true" >> apps/web/.env.local

# 重启开发服务器
cd apps/web && pnpm dev
```

### Q2: 如何回退到旧布局？

**A:** 有两种方式：

**方式 1：使用快速启动脚本（推荐）**
```bash
./scripts/enable-ui-v3.sh --disable
```

**方式 2：手动配置**
```bash
# 修改 apps/web/.env.local
VITE_UI_V3_ENABLED=false

# 或者直接删除该行，默认使用旧布局
```

### Q3: 如何查看当前布局状态？

**A:** 使用快速启动脚本：
```bash
./scripts/enable-ui-v3.sh --status
```

### Q4: 启用新布局后需要重启开发服务器吗？

**A:** 是的。环境变量的修改需要重启开发服务器才能生效：
```bash
# 停止当前开发服务器（Ctrl+C）
# 然后重新启动
cd apps/web && pnpm dev
```

### Q5: 新布局和旧布局可以共存吗？

**A:** 可以。通过 `VITE_UI_V3_ENABLED` 开关控制：
- 开关开启：使用新布局（GlobalLayoutV3 / MobileLayoutV3）
- 开关关闭：使用旧布局（SmartLayout / GlobalLayout）

已迁移的页面在两种布局下都能正常显示，未迁移的页面在新布局下会使用旧组件。

---

## 二、布局与导航

### Q6: 新布局的导航项在哪里配置？

**A:** 在 `apps/web/src/layouts/GlobalLayoutV3.tsx` 中：
- `navItems` 数组：主导航项配置
- `pathToNavId` 映射：路径到导航项的映射，用于计算当前激活项

### Q7: 如何添加新的导航项？

**A:** 修改 `GlobalLayoutV3.tsx`：
1. 在 `navItems` 数组中添加新的导航项
2. 在 `pathToNavId` 映射中添加路径到导航项的映射

### Q8: 移动端布局的底部导航在哪里配置？

**A:** 在 `apps/web/src/layouts/MobileLayoutV3.tsx` 中：
- `mobileTabs` 数组：底部 Tab 导航配置

### Q9: 如何强制使用新布局进行测试？

**A:** 在代码中使用 `forceV3` 属性：
```tsx
<AdaptiveLayout forceV3>
  <YourPage />
</AdaptiveLayout>
```

### Q10: 新布局支持哪些屏幕尺寸？

**A:** 新布局支持：
- **桌面端**（≥ 1024px）：GlobalLayoutV3（AppShell + TopBar + SideRail）
- **移动端**（< 1024px）：MobileLayoutV3（底部 5 Tab 导航）
- **平板端**：根据屏幕宽度自动选择

---

## 三、页面迁移

### Q11: 已迁移了哪些页面？

**A:** 已迁移 10 个页面：

| 优先级 | 模块 | 页面 |
|--------|------|------|
| P0 | 首页与全局入口 | DashboardPage / NotificationCenter |
| P1 | 企业平台域 | UserManagementPage / RoleManagementPage / TenantManagementPage / SystemSettingsPage |
| P2 | 协同与流程域 | WorkflowApprovalsPage / AnnouncementPage |
| P3 | 制造与供应链域 | MesWorkOrderPage / PurchaseOrderPage / ScmPurchaseOrderPage |

### Q12: 未迁移的页面在新布局下能正常显示吗？

**A:** 可以。未迁移的页面会继续使用旧组件，在新布局下正常显示。这是渐进式迁移的设计。

### Q13: 如何迁移新的页面？

**A:** 参考已迁移页面的模式：
1. 使用 `ListPageTemplate` / `FormPageTemplate` / `DetailPageTemplate` 页面模板
2. 使用 `components/redesign/` 中的新组件（DataTable / Drawer / Modal / Toast 等）
3. 使用 Industrial OS design tokens（CSS 变量）
4. 参考 `UI_MIGRATION_GUIDE.md` 中的详细说明

### Q14: 迁移页面时需要注意什么？

**A:** 注意事项：
1. **数据接入**：优先使用真实 API，API 不可用时使用 Mock 数据
2. **响应式设计**：确保页面在桌面端和移动端都能正常显示
3. **可访问性**：遵循 WCAG AA 标准，确保键盘可操作、颜色对比度足够
4. **国际化**：避免硬编码中文文本，接入 i18n 系统
5. **性能优化**：避免不必要的重渲染，使用懒加载

### Q15: 页面模板有哪些？如何使用？

**A:** 有 3 个页面模板：
- `ListPageTemplate`：列表页模板（搜索 + 筛选 + 表格 + 分页）
- `FormPageTemplate`：表单页模板（Tab + 表单 + 保存/重置）
- `DetailPageTemplate`：详情页模板（基本信息 + 详情 + 操作）

使用示例：
```tsx
<ListPageTemplate
  title="用户管理"
  description="管理系统用户"
  stats={statsCards}
  filters={filters}
  table={tableProps}
/>
```

---

## 四、组件库

### Q16: 新组件库在哪里？

**A:** 在 `apps/web/src/components/redesign/` 目录下：
- `primitives/`：基础组件（Button / Card / Badge / Tag / Input / Select / Tabs）
- `layout/`：布局组件（AppShell / TopBar / SideRail / PageHeader）
- `data/`：数据组件（StatTile / StatusLight / DataTable / FilterChip / TrendLine）
- `overlay/`：遮罩组件（Modal / Drawer / Tooltip）
- `feedback/`：反馈组件（Alert / EmptyState / ErrorState / Toast / LoadingOverlay）
- `templates/`：页面模板（ListPageTemplate / FormPageTemplate / DetailPageTemplate）

### Q17: 如何使用新组件？

**A:** 导入并使用：
```tsx
import { Button } from '@/components/redesign/primitives/Button';
import { DataTable } from '@/components/redesign/data/DataTable';
import { Drawer } from '@/components/redesign/overlay/Drawer';
import { Toast } from '@/components/redesign/feedback/Toast';
```

### Q18: 新组件和旧组件可以混用吗？

**A:** 可以。在迁移过程中，新组件和旧组件可以混用。但建议在已迁移的页面中全部使用新组件，保持一致性。

### Q19: 如何自定义新组件的样式？

**A:** 有两种方式：
1. **CSS 变量**：修改 `apps/web/src/theme/redesign-tokens.css` 中的 CSS 变量
2. **内联样式/类名**：通过 `style` 属性或 `className` 覆盖样式

### Q20: Toast 如何使用？

**A:** 使用 `useToast` Hook：
```tsx
import { useToast } from '@/components/redesign/feedback/Toast';

const { showToast } = useToast();

// 显示成功提示
showToast('操作成功', 'success');

// 显示错误提示
showToast('操作失败', 'error');
```

---

## 五、主题与样式

### Q21: Industrial OS design tokens 在哪里？

**A:** 在 `apps/web/src/theme/redesign-tokens.css` 中，包含：
- 颜色（color-bg-* / color-text-* / color-border-* / color-accent-*）
- 间距（space-*）
- 圆角（radius-*）
- 阴影（shadow-*）
- 字体（font-family / font-size-* / font-weight-*）

### Q22: 如何使用 design tokens？

**A:** 在 CSS 中使用 CSS 变量：
```css
.my-component {
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

### Q23: cyberpunk 主题会被删除吗？

**A:** 会，但需要谨慎操作。cyberpunk 主题是 MUI 主题系统的一部分（theme/theme.ts / ThemeProvider / useThemeMode），直接删除会导致主题系统崩溃。

建议在新布局完全稳定后：
1. 先从 ThemeProvider 中移除 cyberpunk 模式引用
2. 再删除 cyberpunk 相关组件和样式
3. 最后清理主题系统中的 cyberpunk 配置

### Q24: 如何切换主题（亮色/暗色）？

**A:** 使用 `useThemeMode` Hook：
```tsx
import { useThemeMode } from '@/hooks/useThemeMode';

const { mode, setMode } = useThemeMode();

// 切换到暗色模式
setMode('dark');

// 切换到亮色模式
setMode('light');
```

### Q25: 新布局支持暗色模式吗？

**A:** 支持。新布局使用 CSS 变量，会根据主题模式自动切换颜色。

---

## 六、性能与优化

### Q26: 新布局的性能如何？

**A:** 新布局使用了较多的 CSS 变量和内联样式，建议在上线前进行性能测试和优化。预期 Lighthouse 性能评分 ≥ 90。

### Q27: 如何优化新布局的性能？

**A:** 优化建议：
1. **懒加载**：使用 `React.lazy` 和 `Suspense` 懒加载页面和组件
2. **代码分割**：按路由进行代码分割
3. **图片优化**：使用 WebP 格式，懒加载图片
4. **缓存策略**：合理设置 HTTP 缓存
5. **减少重渲染**：使用 `useMemo` / `useCallback` 优化

### Q28: 如何进行性能测试？

**A:** 使用 Lighthouse：
1. 打开 Chrome DevTools
2. 切换到 Lighthouse 标签
3. 选择 Performance / Accessibility / Best Practices / SEO
4. 点击 Generate report

目标：性能 ≥ 90，可访问性 ≥ 95，最佳实践 ≥ 90，SEO ≥ 90

---

## 七、测试与验证

### Q29: 如何系统地测试新布局？

**A:** 使用 `UI_MIGRATION_TEST_CHECKLIST.md` 测试清单，包含 200+ 检查项：
1. 全局布局验证（桌面端/移动端/自适应切换）
2. 页面功能验证（10 个已迁移页面）
3. 交互体验验证（通用交互/响应式/可访问性）
4. 性能验证（加载性能/Lighthouse 评分）
5. 回退验证（开关回退/渐进式迁移）

### Q30: 如何运行自动化测试？

**A:** 运行以下命令：
```bash
# TypeScript 类型检查
cd apps/web && pnpm typecheck

# ESLint 检查
cd apps/web && pnpm lint

# 可访问性检查
cd apps/web && pnpm lint:a11y

# 单元测试
cd apps/web && pnpm vitest run
```

### Q31: 发现 bug 怎么办？

**A:** 处理流程：
1. 记录 bug（页面/操作步骤/预期结果/实际结果）
2. 评估严重程度（critical/serious/minor）
3. 修复 bug
4. 验证修复
5. 更新测试清单

### Q32: 如何回退到旧布局？

**A:** 快速回退：
```bash
./scripts/enable-ui-v3.sh --disable
```

或者修改环境变量：
```bash
VITE_UI_V3_ENABLED=false
```

回退时间 < 5 分钟。

---

## 八、部署与上线

### Q33: 如何在生产环境部署新布局？

**A:** 参考 `UI_MIGRATION_DEPLOYMENT_GUIDE.md`，采用 4 阶段灰度发布策略：
1. 测试环境验证（1-2 周）
2. 生产小流量灰度（1 周，10% 用户）
3. 生产全量上线（1 周，30% → 50% → 80% → 100%）
4. 稳定运行与清理（2 周后）

### Q34: 灰度发布时如何控制用户比例？

**A:** 有两种方式：
1. **构建时环境变量**：全量开关，所有用户使用相同布局
2. **运行时配置**：按用户/租户控制，需要后端支持

建议使用运行时配置，支持更灵活的灰度策略。

### Q35: 上线后需要监控哪些指标？

**A:** 监控指标：
- **前端监控**：JS 错误率、页面加载时间、API 错误率、白屏率
- **业务监控**：核心业务流程完成率、用户活跃度、用户反馈
- **性能监控**：Lighthouse 评分、页面加载时间

### Q36: 上线后出现重大问题怎么办？

**A:** 立即回退：
```bash
# 全量回退
./scripts/enable-ui-v3.sh --disable

# 或者按用户/租户回退（需后端支持）
```

然后分析问题原因，修复后重新发布。

---

## 九、其他

### Q37: 后续会迁移更多页面吗？

**A:** 会。首批迁移了 10 个页面（P0/P1/P2/P3），后续会逐步迁移更多业务模块页面：
- WMS（仓储物流）
- QMS（质量管理）
- CRM（客户管理）
- HRM（人力资源）
- EHS（环境健康安全）
- BI（数据决策）
- GIS（地理信息）
- DOC（文档协同）

### Q38: 如何参与 UI 迁移？

**A:** 参与方式：
1. 阅读 `UI_MIGRATION_GUIDE.md` 了解迁移规范
2. 参考已迁移页面的代码模式
3. 选择未迁移的页面进行迁移
4. 提交 PR 并进行代码审查

### Q39: 有问题在哪里反馈？

**A:** 反馈渠道：
- 内部沟通群
- Issue 跟踪系统
- 代码审查评论

### Q40: 相关文档有哪些？

**A:** 相关文档：
- `UI_MIGRATION_GUIDE.md` — UI 迁移指南
- `CHANGELOG_UI_MIGRATION.md` — 变更日志
- `UI_MIGRATION_TEST_CHECKLIST.md` — 测试验证清单
- `UI_MIGRATION_DEPLOYMENT_GUIDE.md` — 部署与灰度发布指南
- `TODO.md` — 任务进度看板
- `UI_REDESIGN_v3.md` — UI 重设计评估与迁移策略
- `design-system-spec.md` — 设计系统规范

---

**最后更新**：2026-09-14  
**版本**：v1.0
