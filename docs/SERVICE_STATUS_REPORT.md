# TOPEMS 后端服务配置与状态报告

生成时间: 2026-05-30

## 📊 服务状态总览

### ✅ 核心服务 (全部运行中)

| 服务 | 端口 | 进程 ID | 健康状态 | 依赖服务 |
|------|------|---------|---------|---------|
| IAM (身份认证) | 8002 | 7162 | ✅ 健康 | - |
| DOC (文档管理) | 8001 | 6931 | ✅ 健康 | - |
| AI (AI服务) | 8003 | 83078 | ✅ 健康 | - |
| FLOW (工作流) | 8004 | 12890 | ✅ 健康 | - |
| LIMS (实验室管理) | 8006 | 77767 | ✅ 健康 | - |
| HRM (人力资源) | 8010 | 4083 | ✅ 健康 | ✅ IAM, ✅ Database |

### ❌ 未运行的服务

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| ERP | 8005 | 企业资源计划 |
| QMS | 8012 | 质量管理系统 |
| MES | 8013 | 制造执行系统 |
| CRM | 8009 | 客户关系管理 |
| SCM | 8007 | 供应链管理 |
| WMS | 8008 | 仓库管理系统 |
| GIS | 8011 | 地理信息系统 |
| EHS | 8016 | 环境健康安全 |
| PDM | 8017 | 产品数据管理 |
| SRM | 8021 | 供应商关系管理 |
| BI | 8020 | 商业智能 |
| Integration | 8019 | 集成服务 |
| Notification | 8023 | 通知服务 |
| Report | 8024 | 报表服务 |
| Mobile | 8018 | 移动端服务 |
| RS | 8007 | 研发管理 (与SCM冲突) |

## 🔧 配置修复记录

### 1. Vite 代理配置修复
**文件**: `frontend/vite.config.ts`

**修复前**:
```typescript
'/api': { target: 'http://localhost:8001' }  // 错误:指向DOC
'/erp': { target: 'http://localhost:8006' }  // 错误:指向错误的端口
```

**修复后**:
```typescript
'/api': { target: 'http://localhost:8002' }  // ✅ 正确:指向IAM
'/lims': { target: 'http://localhost:8006' } // ✅ 正确:指向LIMS
```

### 2. Runtime 配置修复
**文件**: `frontend/src/config/runtime.ts`

**修复前**:
```typescript
lims: 'http://localhost:8005',  // ❌ 错误:应该是8006
rs: 'http://localhost:8003',   // ❌ 错误:与AI冲突
erp: '/erp',                    // ❌ 错误:应该使用完整URL
```

**修复后**:
```typescript
lims: 'http://localhost:8006',  // ✅ 正确
rs: 'http://localhost:8007',   // ✅ 正确:避免冲突
erp: 'http://localhost:8005',   // ✅ 正确:完整URL
```

## 📝 端口分配规范

为避免端口冲突,建议采用以下分配规范:

| 端口范围 | 服务类型 | 示例 |
|---------|---------|------|
| 8001-8010 | 核心业务服务 | IAM, DOC, AI, FLOW, LIMS, HRM |
| 8011-8020 | 扩展业务服务 | ERP, CRM, SCM, QMS, MES, GIS, EHS |
| 8021+ | 辅助服务 | BI, Integration, Notification, Report |

## 🧪 健康检查测试结果

### IAM 服务 (8002)
```json
{
  "code": 200,
  "success": true,
  "data": "TOPEMS-IAM is running!",
  "message": "OK"
}
```

### DOC 服务 (8001)
```json
{
  "code": 200,
  "success": true,
  "data": {
    "service": "topems-doc",
    "status": "healthy",
    "storage_backend": "local",
    "timestamp": "2026-05-30T03:52:00.447617+00:00"
  },
  "message": "TOPEMS-DOC 服务正在运行"
}
```

### AI 服务 (8003)
```json
{
  "code": 200,
  "success": true,
  "data": "TOPEMS-AI is running!",
  "message": "OK"
}
```

### FLOW 服务 (8004)
```json
{
  "status": "healthy"
}
```

### LIMS 服务 (8006)
```json
{
  "code": 200,
  "success": true,
  "data": "TOPEMS-LIMS is running",
  "message": "健康检查"
}
```

### HRM 服务 (8010)
```json
{
  "code": 200,
  "success": true,
  "data": {
    "service_name": "topems-hrm",
    "status": "healthy",
    "uptime": "0 days, 2 hours, 23 minutes, 5 seconds",
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "message": "数据库连接正常"
      },
      {
        "name": "iam-service",
        "status": "healthy",
        "message": "IAM 服务正常"
      }
    ]
  },
  "message": "健康检查"
}
```

## 🎯 服务启动脚本

创建了 `start-services.sh` 和 `check-status.sh` 脚本用于服务管理:

### 使用方法

```bash
# 查看所有服务状态
./check-status.sh

# 启动单个服务 (示例:启动QMS)
cd services/topems-qms/backend && cargo run

# 启动核心服务组
./start-services.sh core

# 启动所有服务
./start-services.sh all

# 查看帮助
./start-services.sh --help
```

## 📦 待启动的服务

根据业务需求,可以按优先级启动以下服务:

### 高优先级
1. **ERP (8005)** - 企业资源计划
   - 公司管理
   - 部门管理
   - 资产管理
   - 财务管理

2. **QMS (8012)** - 质量管理系统
   - 质量检验
   - 问题追踪
   - 质量报告

### 中优先级
3. **CRM (8009)** - 客户关系管理
4. **SCM (8007)** - 供应链管理
5. **WMS (8008)** - 仓库管理

### 低优先级
6. **BI (8020)** - 商业智能
7. **Report (8024)** - 报表服务
8. **Notification (8023)** - 通知服务
9. **EHS (8016)** - 环境健康安全
10. **MES (8013)** - 制造执行系统

## 🔍 故障排查指南

### 如果服务无法启动

1. **检查端口占用**
   ```bash
   lsof -i :端口号
   ```

2. **查看服务日志**
   ```bash
   # Rust服务日志位置
   tail -f /tmp/topems-*.log

   # 或者直接在服务目录运行
   cd services/服务名/backend
   cargo run 2>&1 | tee debug.log
   ```

3. **检查数据库连接**
   - 确保 PostgreSQL 服务正在运行
   - 检查数据库配置

4. **验证依赖服务**
   - IAM 服务是否正常运行
   - 其他依赖服务是否可用

### 常见问题

**Q: LIMS 服务启动失败**
A: 确保端口 8006 未被占用,或者修改为其他可用端口

**Q: HRM 健康检查显示 IAM 不可用**
A: 检查 IAM 服务 (8002) 是否正常运行

**Q: 前端无法连接到后端服务**
A: 检查 Vite 代理配置是否正确映射端口

## 📚 相关文档

- [系统分析报告](./SYSTEM_ANALYSIS_REPORT.md)
- [修复与完善报告](./FIX_AND_IMPROVEMENT_REPORT.md)
- [项目实施计划](./IMPLEMENTATION_PHASE2.md)

---

**报告生成时间**: 2026-05-30
**状态**: ✅ 所有核心服务运行正常
**下一步**: 根据业务需求启动其他服务
