# Protocol Buffers 定义

此目录包含 TOPEMS 平台所有服务间通信的 Protocol Buffers 定义。

## 服务列表

- 用户服务 (user.proto)
- 文件服务 (file.proto)
- 认证服务 (auth.proto)
- 通知服务 (notification.proto)

## 使用方法

```bash
# 安装 protoc
brew install protobuf

# 编译所有 proto 文件
protoc --proto_path=. --include_imports --descriptor_set_out=api.pb *.proto
```

## 版本管理

所有 proto 文件版本必须向后兼容，禁止破坏性变更。
