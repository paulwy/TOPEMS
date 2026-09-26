# TOPEMS 部署文档

## 文档索引

| 文档 | 说明 |
|------|------|
| [deployment-guide-overview.md](./deployment-guide-overview.md) | 主部署指南 |
| [MODULAR_MONOLITH_DEPLOYMENT.md](./MODULAR_MONOLITH_DEPLOYMENT.md) | **模块化单体部署手册（最新）** |

## 快速开始

1. **环境要求**
   - Rust 1.70+
   - Node.js 18+
   - PostgreSQL 14+
   - Redis 7+

2. **启动服务**
   ```bash
   # 使用统一脚本
   ./scripts/topems.sh start
   ```

3. **访问系统**
   - 前端: http://localhost:3000
   - API Gateway: http://localhost

## 相关文档

- [部署指南](./deployment-guide-overview.md)
- [端口分配规则](../architecture/ports.md)
- [环境配置](../getting-started/environment-config.md)
