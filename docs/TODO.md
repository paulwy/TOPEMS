# TOPEMS 待办事项

> 最后更新：2026-06-27

## 当前阶段：页面统一布局 (V3.1.0)

---

## 紧急事项 (P0)

### 1. 技术债务清理

| 事项 | 文件数 | 状态 | 说明 |
|------|--------|------|------|
| InputProps 问题修复 | 15 | ⏳ | MUI v6 升级障碍，需迁移到 InputAdornment |
| MobileHeader 缺失 | 3 | ⏳ | SystemManagementPage, DashboardPage, MobileWorkstationPage |
| CustomerFinanceInfo 类型 | 1 | ⏳ | 补全缺失的属性定义 |

### 2. 路由问题

| 事项 | 状态 | 说明 |
|------|------|------|
| QMS `/qms/standards` 路由 | ⏳ | 指向 QmsQualityControlPage（不合格品），应指向质量标准列表 |
| QMS 页面结构 | ⏳ | 需要创建质量标准列表页或正确映射 |

---

## 高优先级 (P1)

### 3. 页面规范统一

| 事项 | 状态 | 说明 |
|------|------|------|
| PageHeader 清理 | ⏳ | 还有4-5个页面使用 PageHeader，需统一用 PageContainer |
| 页面头部样式 | ⏳ | 统一 PageContainer headerProps 配置 |
| 页面内边距 | ⏳ | 统一 padding 设置规范 |

### 4. 导航重整

| 事项 | 状态 | 说明 |
|------|------|------|
| NavigationRegistry 更新 | ⏳ | 同步新增路由和页面 |
| 面包屑路径验证 | ⏳ | 确保与路由层级一致 |
| 权限配置补全 | ⏳ | 所有路由配置 requiredPermissions |

---

## 已完成 ✅

### 页面迁移

- [x] PageContainer 组件开发
- [x] 页面模板组件（15种类型）
- [x] 迁移 254 个页面 (94%)
- [x] 拆分 AdministrationPage 超级页面
- [x] 拆分 QmsQualityControlPage 页面

### 目录整理

- [x] 删除 fixed/ 目录
- [x] 删除 flow/ 目录
- [x] 删除 system/ 目录
- [x] 删除 common/ 目录
- [x] 删除 templates/ 目录
- [x] 删除 forms/ 目录
- [x] 删除 modules/ 目录
- [x] 删除 equipment/ 目录

### 文档

- [x] ui-design-spec.md - UI 设计规范
- [x] page-refactoring-guide.md - 页面重构指南
- [x] page-unification-plan.md - 页面统一方案
- [x] roadmap.md - 项目路线图

---

## 后续版本计划

### V3.2.0 - 导航与路由优化

- [ ] 路由与导航一致性修复
- [ ] 面包屑路径修正
- [ ] 导航层级统一
- [ ] 权限配置补全

### V4.0.0 - MUI 升级与架构优化

- [ ] MUI v6 → v9 升级
- [ ] 组件库统一
- [ ] 主题系统优化
- [ ] 微前端架构完善

---

## 统计

| 指标 | 数值 |
|------|------|
| 总页面数 | 270 |
| 已迁移 | 254 (94%) |
| 待迁移 | 16 (合理跳过) |
| TypeScript 错误 | ~30 |
| 冗余目录 | 0 |

---

## 检查命令

```bash
# 检查 TypeScript 编译
cd apps/web && npx tsc --noEmit

# 检查未使用 PageContainer 的页面
cd apps/web/src/pages && find . -name "*.tsx" -not -path "*/__tests__/*" -exec grep -L "PageContainer" {} \;

# 检查废弃组件引用
grep -r "from '@/components.*PageHeader'" apps/web/src/pages
```
