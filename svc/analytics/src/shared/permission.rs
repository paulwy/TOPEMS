// V67.1 P0-9: 删除永远返回 true 的 check_permission stub（潜在安全洞）
// 该文件从未被任何 handler 实际调用，analytics 的权限检查由
// modules::bi::row_level_permission 模块独立实现。
// 如需恢复，应对接 topems_shared::permission::check_module_permission。
