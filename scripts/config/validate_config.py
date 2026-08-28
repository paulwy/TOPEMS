#!/usr/bin/env python3
"""
TOPEMS 配置文件校验工具

用法：
    python3 validate_config.py [config_file]

功能：
    1. 验证 YAML 配置文件语法
    2. 检查必需配置项
    3. 验证配置值类型和范围
    4. 检查敏感信息是否使用环境变量
    5. 生成配置报告
"""

import sys
import os
from pathlib import Path

try:
    import yaml
except ImportError:
    print("错误：缺少 PyYAML 库，请运行：pip install pyyaml")
    sys.exit(1)


class ConfigValidator:
    """配置文件校验器"""

    def __init__(self, config_path):
        self.config_path = Path(config_path)
        self.config = None
        self.errors = []
        self.warnings = []
        self.info = []

    def load_config(self):
        """加载配置文件"""
        if not self.config_path.exists():
            self.errors.append(f"配置文件不存在：{self.config_path}")
            return False

        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = yaml.safe_load(f)
            self.info.append(f"配置文件加载成功：{self.config_path}")
            return True
        except yaml.YAMLError as e:
            self.errors.append(f"YAML 语法错误：{e}")
            return False
        except Exception as e:
            self.errors.append(f"配置文件读取失败：{e}")
            return False

    def get_nested_value(self, path):
        """获取嵌套配置值"""
        keys = path.split('.')
        value = self.config
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value

    def validate_required_fields(self):
        """校验必需配置项"""
        required_fields = {
            'service': ['name', 'environment', 'host', 'port'],
            'database': ['url', 'min_connections', 'max_connections'],
            'redis': ['url'],
            'auth': ['jwt_secret', 'jwt_expiration'],
        }

        for section, fields in required_fields.items():
            if section not in self.config:
                self.errors.append(f"缺少必需配置段：{section}")
                continue

            for field in fields:
                if field not in self.config[section]:
                    self.errors.append(f"缺少必需配置项：{section}.{field}")
                elif self.config[section][field] is None:
                    self.errors.append(f"配置项值为空：{section}.{field}")

    def validate_value_types(self):
        """校验配置值类型"""
        type_checks = {
            'service.port': (int, '端口号必须是整数'),
            'service.workers': (int, '工作进程数必须是整数'),
            'service.request_timeout': (int, '请求超时必须是整数'),
            'database.min_connections': (int, '最小连接数必须是整数'),
            'database.max_connections': (int, '最大连接数必须是整数'),
            'auth.jwt_expiration': (int, 'JWT 过期时间必须是整数'),
            'auth.max_login_attempts': (int, '最大登录尝试次数必须是整数'),
        }

        for path, (expected_type, error_msg) in type_checks.items():
            value = self.get_nested_value(path)
            if value is not None and not isinstance(value, expected_type):
                self.errors.append(f"{path}：{error_msg}，当前类型：{type(value).__name__}")

    def validate_value_ranges(self):
        """校验配置值范围"""
        range_checks = {
            'service.port': (1, 65535, '端口号必须在 1-65535 之间'),
            'service.workers': (1, 64, '工作进程数必须在 1-64 之间'),
            'service.request_timeout': (1, 300, '请求超时必须在 1-300 秒之间'),
            'database.min_connections': (1, 100, '最小连接数必须在 1-100 之间'),
            'database.max_connections': (1, 1000, '最大连接数必须在 1-1000 之间'),
            'auth.jwt_expiration': (60, 2592000, 'JWT 过期时间必须在 60 秒-30 天之间'),
            'auth.password_hash_cost': (4, 31, '密码哈希成本必须在 4-31 之间'),
            'cache.default_ttl': (0, 86400 * 30, '缓存 TTL 必须在 0-30 天之间'),
        }

        for path, (min_val, max_val, error_msg) in range_checks.items():
            value = self.get_nested_value(path)
            if value is not None and isinstance(value, (int, float)):
                if value < min_val or value > max_val:
                    self.errors.append(f"{path}：{error_msg}，当前值：{value}")

    def validate_security(self):
        """校验安全配置"""
        # 检查 JWT 密钥强度
        jwt_secret = self.get_nested_value('auth.jwt_secret')
        if jwt_secret:
            if jwt_secret.startswith('${') and jwt_secret.endswith('}'):
                self.info.append("JWT 密钥使用环境变量，符合安全最佳实践")
            elif len(jwt_secret) < 32:
                self.warnings.append(f"JWT 密钥长度不足（{len(jwt_secret)} 字符），建议至少 32 字符")
            elif jwt_secret in ['secret', 'changeme', 'password', 'topems_secret']:
                self.errors.append("JWT 密钥使用了弱密码，请立即修改")

        # 检查生产环境配置
        environment = self.get_nested_value('service.environment')
        if environment == 'production':
            # 生产环境应该启用加密
            field_encryption = self.get_nested_value('security.encryption.field_encryption_enabled')
            if field_encryption is False:
                self.warnings.append("生产环境建议启用字段加密")

            # 生产环境日志级别不应为 debug/trace
            log_level = self.get_nested_value('logging.level')
            if log_level in ['debug', 'trace']:
                self.warnings.append(f"生产环境日志级别为 {log_level}，建议设置为 info 或 warn")

            # 生产环境应该启用安全头
            security_headers = self.get_nested_value('security.security_headers.enabled')
            if security_headers is False:
                self.warnings.append("生产环境建议启用安全头")

        # 检查敏感信息是否硬编码
        sensitive_fields = [
            'auth.jwt_secret',
            'ai.api_key',
            'email.smtp.password',
            'security.encryption.encryption_key',
        ]

        for field in sensitive_fields:
            value = self.get_nested_value(field)
            if value and isinstance(value, str):
                if not value.startswith('${'):
                    self.warnings.append(f"{field} 建议使用环境变量引用")

        # 检查数据库和 Redis URL 中的密码
        for field in ['database.url', 'redis.url']:
            value = self.get_nested_value(field)
            if value and isinstance(value, str) and ':' in value and '@' in value:
                self.warnings.append(f"{field} 可能包含硬编码密码，建议使用环境变量")

    def validate_database_config(self):
        """校验数据库配置"""
        db_url = self.get_nested_value('database.url')
        if db_url:
            if not db_url.startswith(('postgres://', 'postgresql://')):
                self.warnings.append("数据库 URL 建议使用 postgres:// 或 postgresql:// 协议")

            min_conn = self.get_nested_value('database.min_connections')
            max_conn = self.get_nested_value('database.max_connections')
            if min_conn and max_conn and min_conn > max_conn:
                self.errors.append("数据库最小连接数不能大于最大连接数")

    def validate_cors_config(self):
        """校验 CORS 配置"""
        cors_enabled = self.get_nested_value('security.cors.enabled')
        if cors_enabled:
            allowed_origins = self.get_nested_value('security.cors.allowed_origins')
            if allowed_origins and '*' in allowed_origins:
                environment = self.get_nested_value('service.environment')
                if environment == 'production':
                    self.warnings.append("生产环境 CORS 不建议使用通配符 *")

    def validate(self):
        """执行完整校验"""
        if not self.load_config():
            return False

        self.validate_required_fields()
        self.validate_value_types()
        self.validate_value_ranges()
        self.validate_security()
        self.validate_database_config()
        self.validate_cors_config()

        return len(self.errors) == 0

    def print_report(self):
        """打印校验报告"""
        print("=" * 60)
        print("  TOPEMS 配置文件校验报告")
        print("=" * 60)
        print(f"配置文件：{self.config_path}")
        print()

        status = "✅ 通过" if len(self.errors) == 0 else "❌ 失败"
        print(f"校验状态：{status}")
        print(f"错误：{len(self.errors)} 个")
        print(f"警告：{len(self.warnings)} 个")
        print(f"信息：{len(self.info)} 条")
        print()

        if self.errors:
            print("-" * 60)
            print("❌ 错误（必须修复）：")
            print("-" * 60)
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
            print()

        if self.warnings:
            print("-" * 60)
            print("⚠️  警告（建议修复）：")
            print("-" * 60)
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
            print()

        if self.info:
            print("-" * 60)
            print("ℹ️  信息：")
            print("-" * 60)
            for i, info in enumerate(self.info, 1):
                print(f"  {i}. {info}")
            print()

        print("=" * 60)
        return len(self.errors) == 0


def main():
    """主函数"""
    if len(sys.argv) < 2:
        config_file = "config/production.yaml"
        if not os.path.exists(config_file):
            config_file = "config/production.yaml.example"
        print(f"未指定配置文件，使用默认：{config_file}")
    else:
        config_file = sys.argv[1]

    validator = ConfigValidator(config_file)
    validator.validate()
    success = validator.print_report()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
