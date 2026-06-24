# TOPEMS 用户指南

TOPEMS 企业管理系统的用户手册，按功能模块组织，便于按需查阅。

---

## 文档结构

```
user-guide/
├── README.md           # 本文件，文档索引
├── quick-start.md       # 快速入门指南
├── admin-guide.md       # 系统管理手册
├── faq.md               # 常见问题解答
└── modules/             # 模块使用手册
    ├── hrm.md           # 人力资源管理
    ├── erp.md           # 企业资源计划
    ├── crm.md           # 客户关系管理
    ├── rs.md            # 研发管理
    ├── qms.md           # 质量管理
    ├── srm.md           # 供应商管理
    ├── wms.md           # 仓库管理
    ├── mes.md           # 制造执行
    ├── pdm.md           # 产品数据管理
    └── ehs.md           # 环境健康安全
```

---

## 阅读指南

### 新用户

1. 从 [快速入门指南](./quick-start.md) 开始
2. 了解界面布局和基本操作
3. 尝试完成一个简单任务

### 系统管理员

1. 阅读 [系统管理手册](./admin-guide.md)
2. 了解用户、角色、权限配置
3. 掌握系统设置和数据管理

### 业务用户

根据您使用的模块，查阅对应的模块手册：

| 模块 | 手册 | 主要功能 |
|------|------|----------|
| 人力资源 | [hrm.md](./modules/hrm.md) | 公司架构、员工管理 |
| 企业资源 | [erp.md](./modules/erp.md) | 资产管理、财务、凭证 |
| 客户管理 | [crm.md](./modules/crm.md) | 客户、商机 |
| 研发管理 | [rs.md](./modules/rs.md) | 项目、实验 |
| 质量管理 | [qms.md](./modules/qms.md) | 质量标准、检验 |
| 供应商管理 | [srm.md](./modules/srm.md) | 供应商、采购 |
| 仓库管理 | [wms.md](./modules/wms.md) | 仓库、库存 |
| 制造执行 | [mes.md](./modules/mes.md) | 生产计划、工艺 |
| 产品数据 | [pdm.md](./modules/pdm.md) | 产品、BOM |
| 环境健康 | [ehs.md](./modules/ehs.md) | 安全检查、事故 |

### 遇到问题

1. 先查看 [常见问题解答](./faq.md)
2. 或联系系统管理员

---

## 相关文档

- [API 文档](../api/README.md) - 开发者接口文档
- [部署指南](../deployment/README.md) - 系统部署说明
- [架构设计](../architecture/overview.md) - 技术架构说明

---

**文档版本**: v1.0  
**最后更新**: 2026-06-24
