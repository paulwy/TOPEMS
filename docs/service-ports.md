# TOPEMS 服务端口统一配置

## 端口分配表

| 服务名称 | 端口 | API前缀 | 健康检查 | 描述 |
|---------|------|--------|----------|------|
| topems-iam | 8001 | /api/v1 | /health | 身份认证服务 |
| topems-rs | 8002 | /api/v1 | /health | 研发管理系统 |
| topems-lims | 8003 | /api/v1 | /health | 实验室系统 |
| topems-qms | 8004 | /api/v1 | /health | 质量管理系统 |
| topems-mes | 8005 | /api/v1 | /health | 生产执行系统 |
| topems-erp | 8006 | /api/v1 | /health | 企业资源计划 |
| topems-scm | 8007 | /api/v1 | /health | 供应链系统 |
| topems-wms | 8008 | /api/v1 | /health | 仓库管理系统 |
| topems-crm | 8009 | /api/v1 | /health | 客户关系管理 |
| topems-hrm | 8010 | /api/v1 | /health | 人力资源管理 |
| topems-gis | 8011 | /api/v1 | /health | 地理信息系统 |
| topems-bi | 8012 | /api/v1 | /health | 商业智能 |
| topems-ehs | 8013 | /api/v1 | /health | 安全管理系统 |
| topems-pdm | 8014 | /api/v1 | /health | 产品数据管理 |
| topems-srm | 8015 | /api/v1 | /health | 供应商管理 |
| topems-im | 8016 | /api/v1 | /health | 即时通讯 |
| topems-ai | 8017 | /api/v1 | /health | AI知识库 |
| topems-mobile | 8018 | /api/v1 | /health | 移动端服务 |
| topems-integration | 8019 | /api/v1 | /health | 集成服务 |
| topems-portal | 8020 | /api/v1 | /health | 企业门户 |

## 环境变量

在启动服务前，请设置以下环境变量（或创建 `.env` 文件）：

```
# 数据库配置
DATABASE_URL=postgres://postgres:postgres@localhost:5432/topems_dev

# 认证配置
JWT_SECRET=your-secret-key-here

# 端口配置（可选，默认使用上表中的端口）
PORT=8002
```

## 健康检查

所有服务都实现了统一的健康检查端点：

```bash
curl http://localhost:8001/health
```

响应格式：
```json
{
  "code": 200,
  "success": true,
  "data": "Service is running",
  "message": "OK",
  "timestamp": "2024-01-01T00:00:00Z"
}
```
