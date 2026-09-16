# Lighthouse 性能测试指南

## 测试目标

验证新 UI 设计在关键页面的性能和无障碍性表现。

### 目标指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **性能 (Performance)** | ≥ 90 | 首次内容绘制、最大内容绘制、累计布局偏移等 |
| **无障碍 (Accessibility)** | ≥ 95 | ARIA、对比度、键盘导航等 |
| **最佳实践 (Best Practices)** | ≥ 90 | HTTPS、控制台错误、图片优化等 |
| **SEO** | ≥ 95 | meta 标签、结构化数据等 |

---

## 测试前准备

### 1. 确保开发服务器运行

```bash
cd /Users/air/TOPEMS/apps/web
pnpm dev
```

确认服务器在 `http://localhost:3000` 正常运行。

### 2. 确保后端服务运行（可选）

性能测试时，后端服务可以不运行（使用 Mock 数据），但如果要测试真实 API 性能，需要启动后端。

### 3. 清除浏览器缓存

在 Chrome DevTools 中：
1. 打开 DevTools（F12 或 Cmd+Option+I）
2. 右键点击刷新按钮 → 选择 "Empty Cache and Hard Reload"

---

## 手动运行 Lighthouse 步骤

### 步骤 1：打开 Chrome DevTools

1. 在 Chrome 浏览器中打开目标页面
2. 按 `Cmd + Option + I`（Mac）或 `F12`（Windows/Linux）打开 DevTools
3. 点击顶部标签栏的 **Lighthouse** 标签（如果没有，点击 `>>` 查找）

### 步骤 2：配置 Lighthouse

1. **Device（设备）**：选择 **Desktop**（桌面端）
2. **Categories（类别）**：勾选以下选项：
   - ✅ Performance（性能）
   - ✅ Accessibility（无障碍）
   - ✅ Best Practices（最佳实践）
   - ✅ SEO（搜索引擎优化）
3. **Throttling（节流）**：保持默认设置（Simulated throttling）
4. **Clear storage（清除存储）**：勾选此项，确保测试结果不受之前缓存影响

### 步骤 3：运行测试

1. 点击 **Analyze page load** 按钮
2. 等待测试完成（约 30-60 秒）
3. 查看生成的报告

---

## 测试页面清单

### P0 关键页面

#### 1. 工作台首页 `/dashboard`

**测试目的**：验证仪表盘加载性能，这是用户进入系统后的第一个页面。

**操作步骤**：
1. 访问 `http://localhost:3000/dashboard`
2. 等待页面完全加载（所有卡片和图表渲染完成）
3. 运行 Lighthouse 测试

**预期结果**：
- 性能 ≥ 90
- 首次内容绘制 (FCP) < 1.8 秒
- 最大内容绘制 (LCP) < 2.5 秒
- 累计布局偏移 (CLS) < 0.1

---

#### 2. 用户管理列表页 `/iam/user`

**测试目的**：验证数据表格页面的性能，这是最常用的列表页类型。

**操作步骤**：
1. 访问 `http://localhost:3000/iam/user`
2. 等待数据表格加载完成
3. 运行 Lighthouse 测试

**预期结果**：
- 性能 ≥ 85
- 无障碍 ≥ 95
- 表格渲染无明显卡顿

---

#### 3. 系统设置表单页 `/admin/system-settings`

**测试目的**：验证复杂表单页面的性能和无障碍性。

**操作步骤**：
1. 访问 `http://localhost:3000/admin/system-settings`
2. 等待表单完全加载
3. 运行 Lighthouse 测试

**预期结果**：
- 性能 ≥ 85
- 无障碍 ≥ 95
- 所有表单标签正确关联

---

### P1 重要页面

#### 4. 采购订单列表页 `/erp/purchase-order`

**测试目的**：验证 ERP 模块列表页性能。

#### 5. 工作列表页 `/mes/work-orders`

**测试目的**：验证 MES 模块列表页性能。

#### 6. 公告管理页 `/oa/announcements`

**测试目的**：验证 OA 模块页面性能，包含富文本编辑器。

---

## 测试结果记录

### 测试表格

| 页面 | 性能 | 无障碍 | 最佳实践 | SEO | 总体评分 | 备注 |
|------|------|--------|----------|-----|----------|------|
| `/dashboard` | ___ | ___ | ___ | ___ | ___ | |
| `/iam/user` | ___ | ___ | ___ | ___ | ___ | |
| `/admin/system-settings` | ___ | ___ | ___ | ___ | ___ | |
| `/erp/purchase-order` | ___ | ___ | ___ | ___ | ___ | |
| `/mes/work-orders` | ___ | ___ | ___ | ___ | ___ | |
| `/oa/announcements` | ___ | ___ | ___ | ___ | ___ | |

---

## 常见问题与解决方案

### 问题 1：NO_FCP（First Contentful Paint）错误

**原因**：页面需要 JavaScript 执行后才能渲染内容，headless 环境无法正确执行。

**解决方案**：
1. 确保使用图形界面 Chrome 浏览器
2. 先手动访问页面，等待完全加载后再运行 Lighthouse
3. 清除浏览器缓存后重试

### 问题 2：测试结果显示 "Page didn't load"

**原因**：开发服务器未运行或页面加载超时。

**解决方案**：
1. 确认开发服务器正在运行（`pnpm dev`）
2. 手动访问页面，确认能正常加载
3. 增加 Lighthouse 超时时间（在高级设置中）

### 问题 3：性能分数低于 90

**常见原因**：
- JavaScript bundle 过大
- 图片未优化
- 渲染阻塞资源过多
- 不必要的重新渲染

**优化建议**：
1. 检查 bundle 大小（使用 `pnpm build --analyze`）
2. 优化图片（压缩、使用 WebP 格式）
3. 代码分割（路由级懒加载）
4. 减少不必要的 re-render（useMemo/useCallback）

### 问题 4：无障碍分数低于 95

**常见原因**：
- 表单标签未关联
- 图片缺少 alt 属性
- 颜色对比度不足
- 缺少 ARIA 标签

**优化建议**：
1. 运行 `pnpm lint:a11y` 检查代码
2. 确保所有表单控件都有关联的 label
3. 检查颜色对比度（使用 Chrome DevTools 的对比度检查器）
4. 添加适当的 ARIA 角色和属性

---

## 自动化测试（可选）

如果需要自动化 Lighthouse 测试，可以使用以下工具：

### 使用 Lighthouse CI

```bash
# 安装
npm install -g @lhci/cli

# 运行
lhci autorun --collect.url=http://localhost:3000/dashboard
```

### 使用 Chrome DevTools Protocol

```javascript
// 在 Puppeteer 或 Playwright 中集成
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {port: chrome.port, output: 'json', onlyCategories: ['performance', 'accessibility']};
  const runnerResult = await lighthouse(url, options);
  console.log('Performance Score:', runnerResult.lhr.categories.performance.score);
  await chrome.kill();
}
```

---

## 测试完成后

1. **记录结果**：将测试结果填入上面的测试表格
2. **分析问题**：根据 Lighthouse 报告中的建议进行优化
3. **对比基线**：与旧 UI 性能进行对比
4. **更新文档**：将测试结果更新到 TODO.md 中

---

## 参考资源

- [Lighthouse 官方文档](https://developer.chrome.com/docs/lighthouse/)
- [Web Vitals](https://web.dev/vitals/)
- [Core Web Vitals 最佳实践](https://web.dev/vitals/best-practices/)
- [无障碍设计指南](https://www.w3.org/WAI/WCAG21/quickref/)
