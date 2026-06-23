# TOPEMS Plugin 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Plugin

Plugin（插件系统）是 TOPEMS 的可扩展性核心，支持：

- 插件市场浏览与搜索
- 插件安装与卸载
- 插件版本管理
- 插件升级与回滚
- 插件评价与统计

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| 插件 | 可独立部署的功能模块 |
| 插件市场 | 插件的在线商店 |
| 插件版本 | 插件的版本号管理 |
| 租户插件 | 租户已安装的插件 |

### 1.3 插件架构

```
┌─────────────────────────────────────────────────┐
│                   TOPEMS Core                    │
├─────────────────────────────────────────────────┤
│  Plugin SDK  │  Migration SDK  │  API Gateway   │
├─────────────────────────────────────────────────┤
│              Plugin A  │  Plugin B  │  ...      │
└─────────────────────────────────────────────────┘
```

---

## 2. 插件市场 API

### 2.1 获取市场概览

```bash
curl http://localhost:8000/api/core/plugin/marketplace \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.2 浏览插件列表

```bash
curl "http://localhost:8000/api/core/plugin/marketplace/list?category=finance&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.3 浏览分类

```bash
curl http://localhost:8000/api/core/plugin/marketplace/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.4 获取插件详情

```bash
curl http://localhost:8000/api/core/plugin/plugins/finance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.5 获取插件版本列表

```bash
curl http://localhost:8000/api/core/plugin/plugins/PLUGIN_ID/versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.6 获取插件评价

```bash
curl http://localhost:8000/api/core/plugin/plugins/PLUGIN_ID/reviews \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 租户插件管理 API

### 3.1 查询租户已安装插件

```bash
curl http://localhost:8000/api/core/plugin/tenant/TENANT_ID/plugins \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.2 查询可用插件

```bash
curl http://localhost:8000/api/core/plugin/tenant/TENANT_ID/available \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 安装插件

```bash
curl -X POST http://localhost:8000/api/core/plugin/tenant/TENANT_ID/plugins/finance/install \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4 卸载插件

```bash
curl -X POST http://localhost:8000/api/core/plugin/tenant/TENANT_ID/plugins/finance/uninstall \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.5 激活插件

```bash
curl -X POST http://localhost:8000/api/core/plugin/tenant/TENANT_ID/plugins/finance/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.6 停用插件

```bash
curl -X POST http://localhost:8000/api/core/plugin/tenant/TENANT_ID/plugins/finance/deactivate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. 简化插件管理 API

### 4.1 列出已安装插件

```bash
curl http://localhost:8000/api/core/plugins \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.2 获取插件详情

```bash
curl http://localhost:8000/api/core/plugins/finance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 安装插件（简化）

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/install \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4 卸载插件（简化）

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/uninstall \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.5 启用插件（简化）

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.6 禁用插件（简化）

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/disable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. 插件版本管理 API

### 5.1 检查插件更新

```bash
curl http://localhost:8000/api/core/plugins/finance/versions/updates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 对比版本差异

```bash
curl http://localhost:8000/api/core/plugins/finance/versions/compare/1.0.0/1.1.0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.3 回滚插件版本

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/versions/rollback/1.0.0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.4 升级插件

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/upgrade \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.5 验证插件版本

```bash
curl http://localhost:8000/api/core/plugins/finance/versions/1.1.0/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.6 检查所有插件更新

```bash
curl http://localhost:8000/api/core/plugins/versions/check-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. 升级任务管理 API

### 6.1 列出升级任务

```bash
curl http://localhost:8000/api/core/plugins/upgrade/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.2 查询任务状态

```bash
curl http://localhost:8000/api/core/plugins/upgrade/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.3 获取升级历史

```bash
curl http://localhost:8000/api/core/plugins/finance/upgrade/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.4 批量升级

```bash
curl -X POST http://localhost:8000/api/core/plugins/upgrade/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "plugins": ["finance", "hrm", "crm"]
  }'
```

---

## 7. 升级计划 API

### 7.1 获取升级计划

```bash
curl http://localhost:8000/api/core/plugins/finance/upgrade/schedule \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7.2 配置升级计划

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/upgrade/schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "scheduled_at": "2026-07-01T02:00:00Z",
    "auto_upgrade": false
  }'
```

### 7.3 获取升级队列

```bash
curl http://localhost:8000/api/core/plugins/upgrade/queue \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7.4 添加到升级队列

```bash
curl -X POST http://localhost:8000/api/core/plugins/upgrade/queue/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "plugin_code": "finance",
    "target_version": "1.2.0"
  }'
```

### 7.5 取消升级队列项

```bash
curl -X DELETE http://localhost:8000/api/core/plugins/upgrade/queue/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. 评价与统计 API

### 8.1 获取插件评价

```bash
curl http://localhost:8000/api/core/plugins/finance/reviews \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.2 创建评价

```bash
curl -X POST http://localhost:8000/api/core/plugins/finance/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rating": 5,
    "comment": "很好用的财务模块！"
  }'
```

### 8.3 获取插件统计

```bash
curl http://localhost:8000/api/core/plugins/finance/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.4 获取评价统计

```bash
curl http://localhost:8000/api/core/plugins/finance/reviews/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.5 获取下载历史

```bash
curl http://localhost:8000/api/core/plugins/finance/downloads/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 9. 插件分类

| 分类代码 | 说明 |
|----------|------|
| `finance` | 财务会计 |
| `hrm` | 人力资源 |
| `crm` | 客户关系 |
| `pm` | 项目管理 |
| `scm` | 供应链 |
| `ai` | 人工智能 |
| `workflow` | 工作流 |
| `doc` | 文档管理 |
| `file` | 文件存储 |
| `communication` | 通讯协作 |

---

## 10. API 参考

### 10.1 市场 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/plugin/marketplace` | 市场概览 |
| GET | `/api/core/plugin/marketplace/list` | 插件列表 |
| GET | `/api/core/plugin/marketplace/categories` | 分类列表 |

### 10.2 租户插件 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/plugin/tenant/{id}/plugins` | 已安装插件 |
| GET | `/api/core/plugin/tenant/{id}/available` | 可用插件 |
| POST | `/api/core/plugin/tenant/{id}/plugins/{code}/install` | 安装 |
| POST | `/api/core/plugin/tenant/{id}/plugins/{code}/uninstall` | 卸载 |
| POST | `/api/core/plugin/tenant/{id}/plugins/{code}/activate` | 激活 |
| POST | `/api/core/plugin/tenant/{id}/plugins/{code}/deactivate` | 停用 |

### 10.3 简化 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/plugins` | 已安装列表 |
| GET | `/api/core/plugins/{code}` | 插件详情 |
| POST | `/api/core/plugins/{code}/install` | 安装 |
| POST | `/api/core/plugins/{code}/uninstall` | 卸载 |
| POST | `/api/core/plugins/{code}/enable` | 启用 |
| POST | `/api/core/plugins/{code}/disable` | 禁用 |

### 10.4 版本管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/plugins/{code}/versions/updates` | 检查更新 |
| GET | `/api/core/plugins/{code}/versions/compare/{from}/{to}` | 版本对比 |
| POST | `/api/core/plugins/{code}/versions/rollback/{version}` | 回滚 |
| POST | `/api/core/plugins/{code}/upgrade` | 升级 |
| GET | `/api/core/plugins/{code}/versions/{version}/verify` | 版本验证 |
| GET | `/api/core/plugins/versions/check-all` | 检查所有更新 |

### 10.5 升级任务 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/plugins/upgrade/tasks` | 升级任务列表 |
| GET | `/api/core/plugins/upgrade/tasks/{id}` | 任务状态 |
| POST | `/api/core/plugins/upgrade/batch` | 批量升级 |
| GET | `/api/core/plugins/{code}/upgrade/history` | 升级历史 |

### 10.6 评价统计 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/plugins/{code}/reviews` | 评价列表 |
| POST | `/api/core/plugins/{code}/reviews` | 创建评价 |
| GET | `/api/core/plugins/{code}/statistics` | 插件统计 |
| GET | `/api/core/plugins/{code}/reviews/statistics` | 评价统计 |
| GET | `/api/core/plugins/{code}/downloads/history` | 下载历史 |

---

## 11. 常见问题

### 11.1 插件安装失败

**可能原因：**
- 插件版本与系统版本不兼容
- 租户配额已满
- 网络连接问题

**解决方案：** 检查错误信息，联系管理员。

### 11.2 插件升级失败

**可能原因：**
- 升级过程中断
- 新版本有兼容性问题

**解决方案：** 可使用回滚功能恢复到之前版本。

### 11.3 无法卸载核心插件

**说明：** 系统核心插件（如 finance、hrm）可能不允许卸载。

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
