# TOPEMS 工具目录

这个目录包含了TOPEMS系统的开发工具。

## 目录结构

```
tools/
├── mock_data/              # 模拟数据目录
│   ├── ai_mock_data.json         # AI服务模拟数据
│   └── ehs_mock_data.json        # EHS服务模拟数据
│   ├── flow_mock_data.json       # Flow服务模拟数据
│   ├── im_mock_data.json         # IM服务模拟数据
│   ├── rs_mock_data.json         # RS服务模拟数据
│   ├── srm_mock_data.json        # SRM服务模拟数据
│   └── workflow_mock_data.json   # 工作流模拟数据
└── README.md               # 本文档
```

## 模拟数据说明

### mock_data/

此目录包含各服务的模拟数据，用于开发和测试。

#### workflow_mock_data.json

工作流服务的模拟数据，包含：
- 工作流定义
- 流程实例
- 审批记录

#### ai_mock_data.json

AI服务的模拟数据，包含：
- 数据连接器配置
- 聊天响应示例
- 查询结果示例

## 清理种子数据

如需清理数据库中的种子数据，请执行：

```bash
# 1. 备份数据库
# 2. 执行 clean_all_seed_data.sql 脚本
psql -U your_user -d topems -f clean_all_seed_data.sql
```

## 注意事项

- 模拟数据仅用于开发和测试环境
- 生产环境请使用真实业务数据
- HRM和ERP服务不再自动初始化示例数据
- 所有服务默认使用真实的PostgreSQL数据库
